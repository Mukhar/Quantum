# Phase 1 Plan — Foundation (Qiskit export + bundle CI)

**Phase goal:** Ship the two cross-cutting v3 infrastructure pieces
every later phase depends on: a Qiskit text exporter usable from both
the sandbox toolbar AND every essay's `CircuitView`, plus a per-route
bundle-size CI gate that fails the build on bundle regressions.

**Depends on:** v1.0 (`src/lib/quantum/circuit.ts`, `codec.ts`,
`CircuitView.astro`), v2.0 sandbox toolbar (`composer.client.ts`,
`persistence.ts`).

**Source of truth:** `docs/plans/2026-06-29-v3-design.md` §3.2 +
`.planning/phases/01-foundation/PHASE-CONTEXT.md`.

## Definition of Done (phase-level)

1. `src/lib/quantum/qiskit.ts` exists, exports `toQiskit(circuit, opts?)`
   returning a runnable Qiskit Python snippet (header comment +
   `QuantumCircuit(n,n)` + per-step gate emissions + measurements).
2. **QSK-01:** Sandbox toolbar has a "Copy as Qiskit" button
   (`data-action="qiskit"`) between "Copy share URL" and "Save"; click
   copies a Qiskit snippet of the current sandbox circuit to clipboard
   and surfaces a toast.
3. **QSK-02:** Every essay-embedded `CircuitView` ships a "Copy as
   Qiskit" button (built into `CircuitView.astro`); click copies that
   essay's circuit as Qiskit text. Zero new hydrated framework code —
   one tiny vanilla `addEventListener` is the entire client cost.
4. **QSK-03:** `tests/quantum/qiskit.test.ts` covers:
   - Per-gate substring assertion for every entry in the
     PHASE-CONTEXT.md gate table (test.each).
   - **Drift gate:** a coverage test that reads the union of
     `DiscreteGate` ∪ `RotAxis` ∪ `Op.kind` values from `circuit.ts`
     and asserts every one of them appears in the Qiskit emitter.
     Adding a new simulator gate without a Qiskit mapping makes this
     test fail.
   - Snapshot tests for 3 canonical circuits (Bell, 3-qubit GHZ,
     `Rx(π)` Deutsch oracle).
5. **OPS-04:** `scripts/check-bundle-budget.mjs` exists, runs after
   `astro build`, asserts each tracked route's gzipped JS bundle
   stays under the ceiling in `bundle-budget.json`. Wired into
   `package.json` as `npm run check:bundle` AND `pretest`. Failing
   the budget exits 1 with a per-route over/under table.
6. `bundle-budget.json` exists at the repo root with ceilings for
   every shipped route (computed from actual sizes + 20% headroom).
7. No new runtime dependencies. Devtime: only `zlib` (Node built-in).
8. All existing tests (v1 + v2 + new v3 Phase 1) pass.
9. `npm run build` is clean. `npm test` is clean (which now implies
   `npm run check:bundle` is green).
10. No essay route exceeds its declared ceiling. The first run of the
    new gate is a baseline — if any route is already over budget,
    raise the ceiling explicitly in the same commit and document why.

## Plans

> Execute in order. 01-01 (Qiskit module) must land first — both
> button plans depend on `toQiskit`. 01-02 and 01-03 can be dispatched
> in parallel sub-agent contexts (touch disjoint files: sandbox
> composer vs. CircuitView). 01-04 (bundle CI gate) is independent
> and can run in parallel with all three, but its baseline numbers
> need a clean build, so finish it last.

### 01-01 — Qiskit exporter module + drift-proof tests

**Why:** Single canonical module so the sandbox toolbar (01-02) and
every `CircuitView` (01-03) emit identical Qiskit text. The drift
test (QSK-03) is the *only* mechanism preventing a future simulator
gate addition from silently breaking exports — it must land with the
module so adding a gate without a mapping never compiles past CI.

**Deliverables:**

- `src/lib/quantum/qiskit.ts` (new) — exports:
  - `toQiskit(circuit: Circuit, opts?: { headerComment?: string }): string`
  - `QiskitExportError extends CodecError` (reuse codec error
    hierarchy for caller `catch` ergonomics)
  - Internal gate-mapping table keyed by `Op.kind` and gate name.
- Output exactly the shape from PHASE-CONTEXT.md "Output shape":
  - Header comment with project name + optional `headerComment` arg
    appended.
  - `from qiskit import QuantumCircuit` import line.
  - Blank line then `qc = QuantumCircuit(<n>, <n>)`.
  - Per-step emission in `circuit.steps` order; within a step, emit
    ops in array order (no Qiskit barrier insertion).
  - `qc.measure(q, q)` for every `{kind: "measure"}` op.
- Use `theta.toPrecision(17)` for rotation angles. Never collapse to
  `numpy.pi/...` aliases (PHASE-CONTEXT.md decision).
- Call `validateCircuit(circuit)` first; wrap thrown `Error`s in
  `QiskitExportError` for consistent caller `catch`.
- `src/lib/quantum/index.ts` — re-export `toQiskit` and
  `QiskitExportError` alongside existing `encodeCircuit` etc.
- `tests/quantum/qiskit.test.ts` (new) — three suites:
  1. **Mapping table** — `test.each` over the PHASE-CONTEXT.md gate
     table asserts emission. Example:
     ```ts
     test.each([
       [gateOp("H", 0),            "qc.h(0)"],
       [gateOp("X", 1),            "qc.x(1)"],
       [cnotOp(0, 1),              "qc.cx(0, 1)"],
       [rotOp("X", 2, Math.PI / 4),"qc.rx("], // theta substring varies
       [measureOp(3),              "qc.measure(3, 3)"],
       ...
     ])(...)
     ```
  2. **Drift coverage** — programmatically enumerate every value of
     `DiscreteGate`, `RotAxis`, and `Op.kind` and assert each maps
     to a non-empty Qiskit substring. Failing test message must name
     the unmapped value (e.g. `'gate "U3" has no Qiskit mapping'`).
     This is the gate keeping QSK-03 honest.
  3. **Snapshot** — three canonical circuits: Bell, 3-qubit GHZ,
     Deutsch oracle (`Rx(π)`). Use `expect(...).toMatchInlineSnapshot()`
     so future changes show up as PR diff.
- All existing codec tests must still pass.

**read_first:**
- `src/lib/quantum/circuit.ts` (op shape, validation, MAX_QUBITS)
- `src/lib/quantum/codec.ts` (analog — same module shape & error class)
- `src/lib/quantum/gates.ts` (gate name vocabulary)
- `tests/quantum/codec.test.ts` (table-driven test pattern + helpers like `gateOp`, `cnotOp`, `rotOp`, `measureOp`)

**Acceptance:**
- `npm test -- qiskit` runs the new suite green.
- `npm test` passes everything (no regressions).
- `npm run build` clean.
- Manually pasting a snapshot output into a Python shell with
  `pip install qiskit` runs without `SyntaxError`. (Manual; record
  the canonical Bell paste in the commit body.)
- The drift coverage test passes today AND fails if you add a new
  fake gate name to `DiscreteGate` without updating the mapping
  table (one-line manual probe in the executor's commit notes).

---

### 01-02 — Sandbox toolbar "Copy as Qiskit" button (QSK-01)

**Why:** Closes the sandbox half of "one circuit, two surfaces" — a
reader who built a circuit in `/sandbox` can take it straight into
real Qiskit. Sibling to the existing "Copy share URL" button;
implementation mirrors `copyShareUrl` step for step.

**Deliverables:**

- `src/pages/sandbox/index.astro` — insert a new button into the
  existing `[data-sandbox-toolbar]` element between
  `data-action="share"` (Copy share URL) and `data-action="save"`
  (Save). Markup:
  ```astro
  <button
    type="button"
    data-action="qiskit"
    class="<same classes as the share button>"
    title="Copy a runnable Qiskit Python snippet to clipboard"
  >Copy as Qiskit</button>
  ```
- `src/lib/sandbox/persistence.ts` — add:
  ```ts
  export async function copyQiskitSnippet(): Promise<boolean> {
    let text: string;
    try {
      text = toQiskit(circuit.value);
    } catch (err) {
      showToast(`Can't export: ${(err as Error).message}`, "error");
      return false;
    }
    try {
      await navigator.clipboard.writeText(text);
      showToast("Qiskit snippet copied to clipboard");
      return true;
    } catch {
      showToast("Couldn't copy — your browser blocked clipboard access", "error");
      return false;
    }
  }
  ```
  Imports: `toQiskit` from `../quantum/qiskit` (re-exported via
  `../quantum`).
- `src/lib/sandbox/composer.client.ts` — at the same place where
  `shareBtn` is wired:
  ```ts
  const qiskitBtn = toolbar.querySelector<HTMLButtonElement>("[data-action='qiskit']");
  qiskitBtn?.addEventListener("click", () => { void copyQiskitSnippet(); });
  ```
  Import added: `copyQiskitSnippet` from `./persistence`.

**read_first:**
- `src/pages/sandbox/index.astro` (toolbar markup, exact class soup
  for visual consistency)
- `src/lib/sandbox/composer.client.ts` (wiring pattern — find the
  `shareBtn` block and mirror)
- `src/lib/sandbox/persistence.ts` (`copyShareUrl` — copy structure
  exactly; same toast IDs, same error class)
- `src/lib/sandbox/toast.client.ts` (`showToast` signature)

**Acceptance:**
- New "Copy as Qiskit" button appears in the sandbox toolbar between
  Share and Save; matches the styling of its siblings.
- Click on an empty sandbox copies nothing useful but doesn't crash;
  a toast surfaces ("Can't export: …" if validateCircuit complains
  on an empty `Circuit`, OR success with a minimal `QuantumCircuit(1,1)`).
- Click on a built circuit (e.g. Bell pair from the starter button)
  copies a Qiskit string that, when pasted into a Python shell with
  Qiskit installed, parses and runs. (Manual; recorded in commit body.)
- `npm test` clean. `npm run build` clean.

---

### 01-03 — `CircuitView` "Copy as Qiskit" button (QSK-02)

**Why:** Closes the essay half. Every essay that already shows a
`CircuitView` (today: `/cnot-bell`, `/deutsch`) gets an export button
"for free" — and every v3 essay built on top of `CircuitView` ships
the export from day 1. Keeps the "remix in sandbox" and "run for
real in Qiskit" CTAs symmetric on every essay.

**Deliverables:**

- `src/components/CircuitView.astro` — import `toQiskit`, compute
  `const qiskitText = toQiskit(circuit);` in the frontmatter, render
  a button below the SVG (next to or alongside the existing
  "Remix in sandbox →" link):
  ```astro
  <button
    type="button"
    data-action="copy-qiskit"
    data-qiskit={qiskitText}
    class="<inline tw class soup matching the remix link>"
    aria-live="polite"
    aria-label="Copy this circuit as Qiskit Python"
  >Copy as Qiskit</button>
  ```
- Inline `<script is:inline>` at the end of the component (one per
  page is fine — Astro deduplicates identical inline scripts; if
  it doesn't, switch to a single `<script>` import of
  `src/lib/circuitview/qiskitCopy.client.ts`):
  ```html
  <script is:inline>
    document.addEventListener("click", async (ev) => {
      const t = ev.target;
      if (!(t instanceof HTMLElement) || t.dataset.action !== "copy-qiskit") return;
      try {
        await navigator.clipboard.writeText(t.dataset.qiskit ?? "");
        const prev = t.textContent;
        t.textContent = "Copied!";
        setTimeout(() => { t.textContent = prev; }, 1500);
      } catch {
        const prev = t.textContent;
        t.textContent = "Copy failed";
        setTimeout(() => { t.textContent = prev; }, 1500);
      }
    }, { once: false });
  </script>
  ```
  Decide during implementation whether to factor to a dedicated
  `.client.ts` for bundle-size reasons; either way the total client
  cost must be < 1 KB gzipped (asserted by 01-04's budget gate).
- Update `tests/components/circuit-view.test.ts` (existing) — vitest
  cannot render `.astro`, so follow the existing file's "re-declare
  helpers / read .astro as text" pattern. Add a test that:
  1. Reads `src/components/CircuitView.astro` as a file string.
  2. Asserts the string contains the import of `toQiskit` (so the
     component is hooked up at build time).
  3. Asserts the string contains both `data-action="copy-qiskit"`
     and `data-qiskit=` substrings (proves the button + attr exist).
  4. Independently calls `toQiskit(bellCircuit)` and asserts the
     return value is a non-empty string starting with `# Generated`
     and containing `qc.h(0)` (proves the function the button calls
     produces sane Qiskit). The drift gate (01-01's coverage test)
     is what enforces correctness for every gate; this test only
     proves the *wiring* is in place.

**read_first:**
- `src/components/CircuitView.astro` (full file — entire component
  changes shape; need to know the existing `remixHref` block and
  the `caption` / a11y wiring)
- `src/pages/cnot-bell.astro` + `src/pages/deutsch.astro` (current
  consumers — verify the new button doesn't visually break their
  layout; both essays must still pass their existing tests)
- `tests/components/circuit-view.test.ts` (existing assertions —
  extend, don't rewrite)
- `src/lib/quantum/qiskit.ts` (the function this button calls at
  build time)

**Acceptance:**
- `/cnot-bell` and `/deutsch` both render the new "Copy as Qiskit"
  button below their `CircuitView`s; layout unchanged otherwise.
- Clicking the button copies the corresponding Qiskit snippet to
  clipboard; the button flashes "Copied!" for 1.5s.
- View-source on `/cnot-bell` includes the full Qiskit snippet in
  the button's `data-qiskit` attribute (expected — same as the
  encoded circuit fragment is already visible in `href`).
- `tests/components/circuit-view.test.ts` passes with the new
  assertion. All other essay tests pass.
- `npm run build` clean. The added inline script adds < 1 KB to
  any essay route's gzipped JS budget (validated by 01-04's gate).

---

### 01-04 — Per-route bundle-size CI gate (OPS-04)

**Why:** Five new v3 essays + per-essay widgets land starting in
Phase 2. Without an enforced ceiling, JS regressions creep in
silently. The gate must exist BEFORE Phase 2 ships a single line of
essay code — otherwise the baseline drifts unnoticed.

**Deliverables:**

- `scripts/check-bundle-budget.mjs` (new) — single ES-module Node
  script:
  - Reads `bundle-budget.json` from repo root.
  - Walks `dist/**/*.html` (use `node:fs/promises.readdir` with
    `{ recursive: true }` — available in Node 22, already in `@types/node`).
  - For each HTML, extracts `<script src="/_astro/...">` URLs via a
    single regex (`/<script[^>]+src="([^"]+)"/g`). Skip non-`_astro`
    URLs (external CDN).
  - For each unique `_astro/*.js` path, gzipped size = byte length of
    `zlib.gzipSync(fs.readFileSync(absolutePath))`.
  - Sum per-HTML; map HTML path → route key by stripping `dist/` and
    trailing `/index.html` / `.html` (e.g. `dist/sandbox/index.html`
    → `sandbox`; `dist/index.html` → `index`).
  - Compare each route to the ceiling in the manifest.
  - Print a clean per-route table (use console.table) with columns
    `route, actual_kb, ceiling_kb, delta_kb, status`.
  - Exit 0 if all routes ≤ their ceiling. Exit 1 with the table to
    stderr otherwise.
  - List un-budgeted routes at the bottom as a warning (exit 0 still).
- `bundle-budget.json` (new, repo root):
  ```json
  {
    "version": 1,
    "comment": "Gzipped JS bytes shipped per route (script tags in dist/<route>/index.html). Update with explicit reason in the commit body.",
    "routes": {
      "<route>": <bytes>
    }
  }
  ```
  Populate ceilings by:
  1. `rm -rf dist && npm run build`.
  2. Run the script in "report-only" mode (you can add a `--report`
     flag that prints actuals without comparing) to print actuals.
  3. For each route, ceiling = `Math.ceil(actual * 1.2 / 1024) * 1024`
     (20% headroom, rounded up to the nearest KB).
  4. Commit `bundle-budget.json` with the populated ceilings.
- `package.json` — add scripts:
  ```json
  "check:bundle": "node scripts/check-bundle-budget.mjs",
  "pretest": "npm run build && npm run check:bundle"
  ```
  (If `pretest` already exists, append rather than overwrite.)
- The pretest hook means `npm test` now does
  `astro build → check:bundle → vitest run`. CI does the same with
  no extra config.

**read_first:**
- `package.json` (existing scripts, devDeps — confirm Node 22 types
  give us `readdir({recursive:true})`)
- `astro.config.mjs` (confirm static output target so `dist/` is the
  ground truth)
- `.gitignore` (confirm `dist/` is ignored — it is; the manifest is
  versioned, the build output isn't)
- `tests/components/circuit-view.test.ts` (sanity — make sure adding
  a pretest hook doesn't break vitest's pickup of test files)

**Acceptance:**
- `npm run build && npm run check:bundle` runs to exit 0 on a clean
  tree; prints a per-route table.
- Artificially inflating `bundle-budget.json` for one route by -1 KB
  (so the actual exceeds the ceiling) makes `npm run check:bundle`
  exit 1 with the offending route called out by name. (Manual; revert
  before commit.)
- `npm test` runs build → check:bundle → vitest in that order;
  failure of any step short-circuits the rest.
- `bundle-budget.json` ceilings reflect *actual* sizes from a clean
  build plus 20% headroom. Commit body lists each ceiling and its
  underlying actual.
- No essay route's actual exceeds its ceiling on this commit.

---

## Cross-plan verification

- After all four plans land: `npm test` should produce a green
  vitest run AND a green bundle check.
- Manual: open `/sandbox`, build a Bell pair via the starter button,
  click "Copy as Qiskit" → paste into a Python shell with Qiskit
  installed → verify it runs `qc.draw()` cleanly.
- Manual: open `/cnot-bell`, click the `CircuitView`'s new button →
  paste → verify the snippet matches the diagram step-by-step.
- Test-mirror discipline: this phase adds zero new essay routes, so
  no `tests/essays/nav-graph.test.ts` or concept-map mirror needs
  touching. Validate this by running both files' tests and
  confirming they're unchanged from main.

## Artifacts this phase produces

New symbols / files this phase creates (so plan-review-convergence
doesn't flag them as drift):

- `src/lib/quantum/qiskit.ts` — module
- `toQiskit(circuit, opts?)` — function
- `QiskitExportError` — class (extends `CodecError`)
- `src/lib/quantum/index.ts` — adds `toQiskit`, `QiskitExportError`
  to public exports
- `tests/quantum/qiskit.test.ts` — test file
- `scripts/check-bundle-budget.mjs` — script
- `bundle-budget.json` — config (repo root)
- `package.json` scripts: `check:bundle`, `pretest`
- `CircuitView.astro` — new `data-action="copy-qiskit"` button +
  optional inline hydrator
- New `data-action="qiskit"` button in `src/pages/sandbox/index.astro`
- `copyQiskitSnippet()` exported from `src/lib/sandbox/persistence.ts`

## Frontmatter

```yaml
phase: 1
phase_slug: 01-foundation
requirements: [QSK-01, QSK-02, QSK-03, OPS-04]
plans:
  - id: 01-01
    title: Qiskit exporter module + drift-proof tests
    wave: 1
    depends_on: []
    files_modified:
      - src/lib/quantum/qiskit.ts
      - src/lib/quantum/index.ts
      - tests/quantum/qiskit.test.ts
    autonomous: true
    requirements: [QSK-03]
  - id: 01-02
    title: Sandbox toolbar "Copy as Qiskit" button
    wave: 2
    depends_on: [01-01]
    files_modified:
      - src/pages/sandbox/index.astro
      - src/lib/sandbox/composer.client.ts
      - src/lib/sandbox/persistence.ts
    autonomous: true
    requirements: [QSK-01]
  - id: 01-03
    title: CircuitView "Copy as Qiskit" button
    wave: 2
    depends_on: [01-01]
    files_modified:
      - src/components/CircuitView.astro
      - tests/components/circuit-view.test.ts
    autonomous: true
    requirements: [QSK-02]
  - id: 01-04
    title: Per-route bundle-size CI gate
    wave: 3
    depends_on: [01-01, 01-02, 01-03]
    files_modified:
      - scripts/check-bundle-budget.mjs
      - bundle-budget.json
      - package.json
    autonomous: false  # ceilings must be populated by hand from a clean build
    requirements: [OPS-04]
```

> Wave 1: 01-01 alone. Wave 2: 01-02 + 01-03 in parallel.
> Wave 3: 01-04 last (needs clean build of wave 1+2 output for
> baseline ceilings).
