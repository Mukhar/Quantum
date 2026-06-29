# Phase 2 Plan — Teleportation + Quantum Networks (FLAGSHIP)

**Phase goal:** Ship `/teleportation`, the v3 flagship essay. Validate
the "algorithm half + use-case half, both widget-driven" v3 format
end-to-end. Algorithm half: `ProtocolStepper` walks the reader
through the deferred-measurement teleportation circuit, driving a
`MultiBlochPanel` that honestly renders mixed states (ALG-01, ALG-02).
Use-case half: `QuantumNetwork` lets the reader entangle-swap across
a 3-node Alice/Repeater/Bob diagram with a live "shared Bell pair
Alice ↔ Bob" indicator (USE-01). All site-wide mirrors update in the
same commit.

**Depends on:** Phase 1 (`src/lib/quantum/qiskit.ts`,
`bundle-budget.json`, `scripts/check-bundle-budget.mjs`, the
`CircuitView` "Copy as Qiskit" button); v1 (`MiniBloch`,
`reducedDensity`, `store`, `simulator`, `circuit`, `SandboxLink`,
`EssayLayout`, `ConceptMap`, essay mirror tests).

**Source of truth:** `docs/plans/2026-06-29-v3-design.md` §3.3 + §3.3a
+ `.planning/phases/02-teleportation/PHASE-CONTEXT.md`.

## Definition of Done (phase-level)

1. `src/pages/teleportation.astro` exists, renders end-to-end (algo
   half + use-case half + footer-nav).
2. `src/lib/quantum/teleportation.ts` exists and exports:
   - `teleportationCircuit(opts?): Circuit` — the canonical deferred-
     measurement circuit used by the essay, the stepper, the
     `CircuitView`, and the sandbox-link starter.
   - `cz(control: number, target: number): Op[]` — three-op
     `[H, CNOT, H]` decomposition; used by both `teleportationCircuit`
     and any future essay that wants CZ.
   - `teleportationSteps(opts?): Step[]` — the labeled `Step[]` array
     consumed by `ProtocolStepper` on this essay.
3. **ALG-01** — `ProtocolStepper.astro` component renders Prev/Next
   controls + step indicator. Advancing replays from step 0,
   re-applying every step's `apply: Op[]` to the shared store. On
   the teleportation essay it walks 5 steps: entangle Bell pair →
   prepare input on q0 → Alice's BSM → deferred CNOT correction →
   deferred CZ correction → done.
4. **ALG-02** — `MultiBlochPanel.astro` renders 3 `<MiniBloch>`
   children bound to a shared `storeKey`; mid-protocol the entangled
   qubits' arrows visibly shrink (length = `|r|` from
   `reducedDensityMatrix` + `blochVectorFromRho`), and the
   "Entangled" badge appears on those qubits when `r < 0.98`. After
   the deferred CZ correction, q2's arrow returns to full length
   matching the input state on q0.
5. **USE-01** — `QuantumNetwork.astro` component renders a hand-rolled
   SVG diagram with clickable edges. Generic `nodes`/`edges` props;
   on the teleportation essay it's instantiated with 3 nodes
   (Alice/Repeater/Bob) and 2 edges. A connected-component pass over
   the entangled-edges subgraph sets a live "Alice ↔ Bob entangled"
   indicator.
6. The essay's `CircuitView` embed shows the full deferred-measurement
   circuit (or a clean split into Bell-prep + correction halves —
   author's call). The Phase 1 "Copy as Qiskit" button appears
   below it for free.
7. The essay ships a `SandboxLink` starter with the deferred-
   measurement teleportation circuit.
8. **All mirrors updated in the same commit as the essay file:**
   - `src/components/ConceptMap.astro` — new `primary` Teleportation
     node + reading-path edge `deutsch → teleportation`.
   - `tests/essays/concept-map.test.ts` — `expected[]` updated.
   - `tests/essays/nav-graph.test.ts` — `CHAIN[]` updated:
     `deutsch.next = "/teleportation"`, new
     `{ slug: "teleportation", prev: "/deutsch", next: "/sandbox" }`.
   - `tests/essays/sandbox-links.test.ts` — `STARTERS[]` adds
     `teleportation: …`.
   - `bundle-budget.json` — `"teleportation": 12288` added.
9. `tests/quantum/teleportation.test.ts` ships with three correctness
   suites (deferred-measurement identity for ≥ 3 input states,
   Bell-basis readout, MultiBlochPanel reduced-density forwarding —
   see PHASE-CONTEXT.md "Algorithm correctness tests").
10. `npm test` is green — including the existing v1 + v2 + Phase 1
    suites, the new Phase 2 suites, and the per-route bundle gate
    (`/teleportation` within its ceiling).
11. `npm run build` is green; 16 → 17 routes.
12. Final `bundle-budget.json` `"teleportation"` ceiling is set to
    `round_up(actual_gzip_bytes × 1.2, 1024)` from a clean build,
    committed alongside the closing essay-frontmatter commit.
13. Footer-nav of `/deutsch` updated: `next` was `/sandbox`, becomes
    `/teleportation`. (`/teleportation` then links onward to
    `/sandbox`, holding the v3 tail until Phase 3.)
14. No new runtime dependencies. No change to `Simulator`, `Circuit`,
    `codec.ts`, `qiskit.ts`, or `bundle-budget.json`'s ceiling
    *protocol* (only the `"teleportation"` entry is added).
15. Lighthouse mobile a11y ≥ 95 in both themes on `/teleportation`
    (manual audit — recorded in the phase-closing commit body; the
    formal OPS-01 dashboard is Phase 6's deliverable).

## Plans

> **Wave 1 (foundation, run first):** `02-01` (quantum/teleportation
> module + correctness tests) — every later plan imports
> `teleportationCircuit`, `teleportationSteps`, and `cz`.
>
> **Wave 2 (shared widgets, run in parallel):** `02-02`
> (`ProtocolStepper`), `02-03` (`MultiBlochPanel`), `02-04`
> (`QuantumNetwork`). Different files, disjoint surfaces — safe to
> parallelize across sub-agent contexts.
>
> **Wave 3 (compose):** `02-05` (`teleportation.astro` essay + all
> mirrors + bundle-budget entry). Requires Wave 1 + Wave 2 to be
> green; this is the integration plan.
>
> **Wave 4 (close):** `02-06` (clean-build bundle measurement +
> ceiling recompute commit). Trivial but separate so its commit is
> a clean baseline future phases can diff against.

---

### 02-01 — `quantum/teleportation` module + correctness tests

**Why:** Single canonical home for the teleportation circuit, the
labeled `Step[]` array, and the `cz` decomposition. Every later plan
in this phase (`ProtocolStepper` consumer, essay `CircuitView`, essay
sandbox starter, the algorithm-correctness tests) imports from here.
Locks the deferred-measurement decision (PHASE-CONTEXT.md) into one
place so future essays inherit the convention.

**Deliverables:**

- `src/lib/quantum/teleportation.ts` (new) — exports:
  - ```ts
    export interface TeleportationOpts {
      /** Optional preparation ops on q0 (the "message" qubit). Default: X(0) so the message is |1⟩. */
      prepare?: Op[];
    }
    export function cz(control: number, target: number): Op[];
    export function teleportationCircuit(opts?: TeleportationOpts): Circuit;
    export function teleportationSteps(opts?: TeleportationOpts): Step[];
    ```
    where `Step` is re-exported from `ProtocolStepper`'s prop module
    (see 02-02; for now define the shape inline and have 02-02 import
    from here, or vice versa — executor decides).
  - `teleportationCircuit` returns the 3-qubit, 7-step circuit
    documented in PHASE-CONTEXT.md "Sandbox-link starter" (Bell prep
    on q1/q2 → optional prepare on q0 → BSM on q0/q1 → deferred
    CNOT(q1→q2) → deferred CZ(q0→q2) via H·CNOT·H).
  - `teleportationSteps` returns a 5-step labeled array:
    1. `"Entangle Bell pair (q1, q2)"` — `apply: [gateOp("H",1), cnotOp(1,2)]`
    2. `"Prepare message on q0"` — `apply: opts.prepare ?? [gateOp("X",0)]`
    3. `"Alice's Bell-basis measurement (q0, q1)"` — `apply: [cnotOp(0,1), gateOp("H",0)]`
    4. `"Correct on Bob: deferred CNOT(q1 → q2)"` — `apply: [cnotOp(1,2)]`
    5. `"Correct on Bob: deferred CZ(q0 → q2)"` — `apply: cz(0, 2)`
  - `cz(control, target)` returns
    `[gateOp("H", target), cnotOp(control, target), gateOp("H", target)]`.
    Throws if `control === target`.
- `src/lib/quantum/index.ts` — re-export `teleportationCircuit`,
  `teleportationSteps`, `cz`, and `TeleportationOpts`.
- `tests/quantum/teleportation.test.ts` (new) — three suites:
  1. **Deferred-measurement identity.** For inputs `[]` (identity →
     |0⟩), `[gateOp("X",0)]` (|1⟩), `[gateOp("H",0)]` (|+⟩),
     `[gateOp("H",0), gateOp("S",0)]` (`(|0⟩ + i|1⟩)/√2`):
     - Build the protocol circuit, run with `runCircuit`, compute the
       reduced density matrix on q2 with
       `reducedDensityMatrix(state, 2, 3)`.
     - Assert `blochVectorFromRho(rho_q2)` equals the input state's
       Bloch vector (independently computed by running the prepare
       ops on a 1-qubit simulator) to within `1e-9`.
     - Also assert `rho_q2`'s purity `Tr(ρ²) ≈ 1` to `1e-9` (q2 is a
       pure state at protocol end).
  2. **Bell-basis readout.** Build a circuit through *just* steps 1-3
     (Bell prep + prepare `|+⟩` on q0 + BSM). Compute the joint
     marginal over `(q0, q1)` by summing `|ψ|²` over the `q2` bit.
     Assert each of the four `(q0, q1)` outcomes has probability
     `0.25 ± 1e-9`.
  3. **Reduced-density forwarding (widget-level math).** For the
     mid-protocol state right after step 3 (BSM done, correction not
     yet applied), assert
     `blochVectorFromRho(reducedDensityMatrix(state, 2, 3)).r ≤ 1e-9`
     for input `|+⟩` on q0 — i.e. q2 is **maximally mixed** because
     it's still entangled with the (now-`|+⟩`-prepared) q0/q1 system
     pre-correction. (This is the visual ALG-02 promise.)
  - Add a fourth tiny suite asserting `cz(0, 1)` produces the
    expected 3-op array and throws on `cz(0, 0)`.

**read_first:**
- `src/lib/quantum/circuit.ts` — `Op`, `Circuit`, `runCircuit`,
  `gateOp/cnotOp/measureOp/rotOp` helpers.
- `src/lib/quantum/simulator.ts` — `apply`, `applyCNOT`, qubit-LSB
  convention.
- `src/lib/quantum/reducedDensity.ts` — `reducedDensityMatrix`,
  `blochVectorFromRho`, `marginalProbabilities` (use for the Bell-
  basis joint readout in test suite 2).
- `src/lib/quantum/bloch.ts` — `stateToBloch` (use to build the
  expected single-qubit Bloch vectors in suite 1).
- `tests/quantum/reducedDensity.test.ts` — table-driven style; mirror
  it.
- `.planning/phases/02-teleportation/PHASE-CONTEXT.md` — read the
  "Teleportation simulation strategy" section in full.

**Acceptance:**
- `npm test -- teleportation` runs the new suite green.
- `npm test` passes everything (no regressions to Phase 1 / v1 / v2).
- `npm run build` clean (`teleportation.ts` is a new lib file, not a
  new route — no bundle delta yet).
- Manually verifying `cz(0, 2)` decomposition: applying
  `H_q2 ; CNOT(q0, q2) ; H_q2` to `|00⟩ + |11⟩` (Bell pair on q0/q2)
  yields the same state as applying a literal `CZ` gate (sanity
  check; not a separate test — verify by hand once in the executor's
  commit message).

---

### 02-02 — `ProtocolStepper.astro` component (shared)

**Why:** This is the algorithm-walking widget on the teleportation
essay (and the Superdense essay in Phase 3). Single shared
implementation up front avoids a Phase-3 refactor and locks the
contract while we have one concrete consumer to validate against.

**Deliverables:**

- `src/components/ProtocolStepper.astro` (new) — server-rendered shell
  + inline `<script>` hydrator inside the same file. Props shape:
  ```ts
  interface Step {
    label: string;
    description?: string;
    apply: Op[];
  }
  interface Props {
    storeKey: string;
    qubits: number;
    steps: Step[];
    initialStep?: number;
    caption?: string;
  }
  ```
  If 02-01 has already exported `Step` from
  `src/lib/quantum/teleportation.ts`, import from there;
  otherwise define here and have 02-01 import from this component.
  **Convention: define `Step` in `src/lib/quantum/teleportation.ts`
  and re-export via `src/lib/quantum/index.ts` as
  `ProtocolStep`** (more accurate name, since the stepper is generic
  but the type lives in the quantum-protocol layer). Executor
  resolves any naming conflict via that single name.
- Markup contract (mirror `ProbabilityBars.astro`'s data-attr +
  inline-script structure):
  ```astro
  <figure
    class="my-6 rounded-lg border border-line bg-surface-elevated/40 p-5 space-y-3"
    data-widget="protocol-stepper"
    data-widget-id={`protocol-stepper:${storeKey}`}
    data-store-key={storeKey}
    data-qubits={qubits}
  >
    {caption && <figcaption class="text-sm text-ink-subtle">{caption}</figcaption>}
    <div class="flex items-center justify-between">
      <button type="button" data-action="prev" class="…">← Prev</button>
      <p data-role="indicator" aria-live="polite" class="font-mono text-xs">Step 1 / {steps.length}</p>
      <button type="button" data-action="next" class="…">Next →</button>
    </div>
    <div data-role="step-body" class="text-sm">
      <strong data-role="label">{steps[initialStep ?? 0].label}</strong>
      <p data-role="description" class="text-ink-subtle mt-1">{steps[initialStep ?? 0].description ?? ""}</p>
    </div>
    <script type="application/json" data-role="steps">
      {JSON.stringify(steps)}
    </script>
  </figure>
  ```
- Hydrator behavior (inline `<script>` block):
  - On mount: read `data-store-key`, `data-qubits`, JSON-parse the
    `<script type="application/json">` payload (steps).
  - `ensureStore(storeKey, { qubits })`.
  - Maintain a local `current` index. Prev/Next buttons clamp at
    `[0, steps.length - 1]`. Disabled state when clamped.
  - On every change: `store.reset()`, then for each step `i ≤ current`,
    iterate `steps[i].apply` and dispatch each op via the existing
    store methods (`apply` for `kind: "gate"`, `applyCNOT` for
    `kind: "cnot"`, `applyRotation` for `kind: "rot"`; skip
    `kind: "measure"` — protocol-stepper teleportation steps never
    contain measure ops, so this is a no-op safety branch).
  - Update `data-role="label"`, `data-role="description"`, and
    `data-role="indicator"` text to match `current`.
  - Keyboard: when any button inside the figure has focus, ←/→
    advance/retreat; bind on the figure with event delegation.
- A11y: `aria-live="polite"` on the indicator; buttons get
  `aria-disabled="true"` at the clamps; figure has an `aria-label`
  derived from the optional `caption` or "Protocol stepper".
- Theme: every visible surface uses semantic CSS vars
  (`border-line`, `bg-surface-elevated/40`, `text-ink-subtle`) —
  re-paint on theme toggle is automatic.

**read_first:**
- `src/components/ProbabilityBars.astro` — closest analog widget
  (figure shell + `data-widget` + `data-store-key` + inline
  `<script>` hydrator). Mirror the import + mount pattern verbatim.
- `src/components/GateButtons.astro` — for the button styling +
  event-delegation pattern.
- `src/lib/quantum/store.ts` — `ensureStore`, `Snapshot`, `Listener`,
  the `apply / applyCNOT / applyRotation / reset` surface.
- `src/lib/quantum/circuit.ts` — `Op` shape.
- `.planning/phases/02-teleportation/PHASE-CONTEXT.md` —
  "`ProtocolStepper` — shared component from day 1" section.

**Acceptance:**
- `npm run build` clean (a new `.astro` component without a consumer
  still type-checks and emits no extra bundle until the essay imports
  it — checked again in 02-05).
- `npm test` green.
- `tests/components/protocol-stepper.test.ts` (new, ≥ 1 suite):
  - Render the component into a happy-dom container with a 2-step
    fixture (e.g. `[{label:"a", apply:[gateOp("H",0)]}, {label:"b",
    apply:[gateOp("X",0)]}]`), kick the hydrator, simulate "Next"
    click, read the store snapshot, assert `probabilities[0] = 0`,
    `probabilities[1] = 1` (H then X applied; H takes |0⟩ to |+⟩,
    then X maps |+⟩ → |+⟩ — actually a more useful assertion is
    after step 1 alone, probabilities are `[0.5, 0.5]`). Pick the
    fixture that proves the replay-from-step-0 semantics.
- Manual sanity (recorded in commit body): mount the component in a
  scratch `.astro` page or sandbox-test page, click through; visual
  step indicator updates; ←/→ keys work.

---

### 02-03 — `MultiBlochPanel.astro` component

**Why:** Algorithm-half visualization for ALG-02. Composing existing
`MiniBloch` instances reuses the tested reduced-density math + theme
contract, costs ~30 LOC, and ships with no new client module.

**Deliverables:**

- `src/components/MultiBlochPanel.astro` (new) — pure server-rendered.
  Props:
  ```ts
  interface Props {
    storeKey: string;
    qubits: number;
    /** Per-qubit captions; defaults to ["q0", "q1", "q2", …]. */
    captions?: string[];
    /** Optional figure-level caption shown above the row. */
    caption?: string;
  }
  ```
- Markup: a single `<figure>` wrapper + a responsive flex/grid row of
  `<MiniBloch storeKey={storeKey} qubits={qubits} qubit={i} caption={captions?.[i] ?? `q${i}`} />`
  for `i in 0..qubits-1`. Default layout: `grid-cols-1 sm:grid-cols-3`
  with `gap-4`. Tap-to-focus on mobile is implicit (each MiniBloch
  card is independently scrollable / readable; no new interaction
  required for v3).
- Caption uses semantic CSS vars; matches `ProbabilityBars` figure
  shell aesthetic.
- No new client JS. Every `MiniBloch` already subscribes to the
  shared store via its own data attrs.

**read_first:**
- `src/components/MiniBloch.astro` — full read; understand the
  `data-store-key` + `data-qubit` contract and the existing arrow-
  length + entangled-badge behavior.
- `src/pages/entanglement.astro` — sees how `MiniBloch` is consumed
  in an essay today; the new panel slots in identically.
- `.planning/phases/02-teleportation/PHASE-CONTEXT.md` —
  "`MultiBlochPanel` — compose 3 × existing `MiniBloch`" section.

**Acceptance:**
- `npm run build` clean.
- `npm test` green.
- Optional `tests/components/multi-bloch.test.ts` (executor decides):
  if it ships, render the panel with a 3-qubit fixture; assert the
  output HTML contains three `<figure data-widget="mini-bloch">`
  elements with `data-qubit="0/1/2"`. The arrow-length math itself
  is already tested in `tests/quantum/reducedDensity.test.ts` and
  `tests/components/miniBloch.test.ts`; this widget is just a
  composition shell.
- Manual sanity: drop the panel into a scratch page with a Bell-pair
  starter circuit run on the store; verify q0 and q1 arrows visibly
  shrink + the "Entangled" badge appears.

---

### 02-04 — `QuantumNetwork.astro` component (USE-01)

**Why:** Use-case-half widget. Generic-graph props from day 1 so the
Phase-2 instance (Alice/Repeater/Bob) and any v4 multi-hop network
essay share one implementation.

**Deliverables:**

- `src/components/QuantumNetwork.astro` (new) — server-rendered SVG
  + inline `<script>` hydrator inside the same file. Props:
  ```ts
  interface NetworkNode { id: string; label: string; cx: number; cy: number; }
  interface NetworkEdge { from: string; to: string; }
  interface Props {
    nodes: NetworkNode[];
    edges: NetworkEdge[];
    endpoints: [string, string];
    caption?: string;
  }
  ```
- Render contract:
  - Single `<figure>` shell with `data-widget="quantum-network"`,
    `data-endpoints={JSON.stringify(endpoints)}`.
  - Inside, a `<svg viewBox="0 0 400 200">` (or sized to fit the
    largest `cx/cy`; clamp via a computed viewBox).
  - Each edge: `<line data-role="edge" data-from={e.from} data-to={e.to}
    data-entangled="false" x1=… y1=… x2=… y2=… class="cursor-pointer">`.
  - Each node: a rounded `<rect>` + `<text>` label, same posture as
    `ConceptMap.astro`'s nodes.
  - Below the SVG: a small `<p data-role="indicator" aria-live="polite">`
    that reads e.g. "Alice ↔ Bob: not yet entangled" / "Alice ↔ Bob:
    shared Bell pair".
- Hydrator behavior:
  - On mount: parse `data-endpoints`. Build an adjacency map from
    the `data-role="edge"` elements.
  - Attach a `click` listener to every edge: toggle the edge's
    `data-entangled` attribute, swap the edge's stroke between
    `var(--color-line-strong)` and `var(--color-positive)`.
  - On every toggle: run a BFS/DFS over the **entangled-only**
    subgraph from `endpoints[0]`; check whether `endpoints[1]` is
    reachable. Update the indicator text + an `aria-pressed`-style
    boolean attr on the figure.
  - No state outside the DOM — the entangled status lives entirely
    on `data-entangled` attributes; refresh is the source of truth.
- Theme: edges/nodes/text all use semantic CSS vars; entangled-edge
  color is `var(--color-positive)`.
- A11y: edges are `<line>` with `role="button"`, `tabindex="0"`,
  `aria-label="Entanglement link from Alice to Repeater (idle)"` /
  `(entangled)` that updates on toggle; Space/Enter fires the same
  toggle as click.

**read_first:**
- `src/components/ConceptMap.astro` — node/edge SVG idiom + theme
  vars + responsive `<svg>` posture. The QuantumNetwork is a
  smaller, interactive cousin.
- `src/components/ProbabilityBars.astro` — inline-`<script>` hydrator
  pattern.
- `tests/essays/concept-map.test.ts` — structural test pattern for
  graph data.
- `.planning/phases/02-teleportation/PHASE-CONTEXT.md` —
  "`QuantumNetwork` widget" section, including the literal essay
  invocation.

**Acceptance:**
- `npm run build` clean.
- `npm test` green.
- `tests/components/quantum-network.test.ts` (new): unit-test the
  connected-component logic as a pure function. Extract the
  reachability helper into a tiny exported function (either inline
  in the component's `<script>` or in a sibling
  `src/lib/quantum/network.ts` — executor decides; if extracted,
  the test imports it directly). Cases:
  - 3 nodes, 0 entangled edges → not connected.
  - 3 nodes, edge A↔R entangled only → A↔B not connected.
  - 3 nodes, both edges entangled → A↔B connected.
  - 5 nodes line graph, all entangled → endpoints at extremes connected.
  - Self-loops / duplicate edges don't crash.
- Manual sanity: mount the component with the literal 3-node
  invocation from PHASE-CONTEXT.md; click both edges; verify the
  indicator text flips on; theme toggle re-paints colors.

---

### 02-05 — `/teleportation` essay + mirrors + bundle-budget entry

**Why:** The integration plan. Consumes 02-01..02-04 to ship the
actual essay route. Updates every mirror (nav graph, concept map,
sandbox-links, bundle budget) in the **same commit** as the essay
frontmatter, so the existing CI guards (`concept-map.test.ts`,
`nav-graph.test.ts`, `sandbox-links.test.ts`, the per-route bundle
gate) protect the change from day 1.

**Deliverables:**

- `src/pages/teleportation.astro` (new) — uses `EssayLayout`. Outline:
  - **Algorithm half:**
    - Prose intro framing teleportation as "moving the *state*, not
      the *substrate*" — explicit handoff from the entanglement essay.
    - `<MultiBlochPanel storeKey="teleportation-essay" qubits={3}
      captions={["q0 — message", "q1 — Alice's Bell half",
      "q2 — Bob"]} />`
    - `<ProtocolStepper storeKey="teleportation-essay" qubits={3}
      steps={teleportationSteps()} caption="Step through the protocol
      and watch each qubit's Bloch arrow respond." />`
    - Body text walking each step; explicit "deferred measurement"
      paragraph that names the trick and explains why CNOT+CZ replaces
      mid-circuit measure + classical-conditioned X/Z.
    - `<CircuitView circuit={teleportationCircuit()} caption="Deferred-measurement teleportation circuit (3 qubits)." />`
      The Phase-1 "Copy as Qiskit" button is inherited; no extra
      wiring.
    - `<SandboxLink circuit={teleportationCircuit()} label="Remix in sandbox →" />`
  - **Use-case half:**
    - Prose intro framing quantum networks / quantum repeaters as
      the real-world payoff.
    - `<QuantumNetwork
        nodes={[
          { id: "alice", label: "Alice", cx:  60, cy: 100 },
          { id: "repeater", label: "Repeater", cx: 200, cy: 100 },
          { id: "bob", label: "Bob", cx: 340, cy: 100 },
        ]}
        edges={[
          { from: "alice", to: "repeater" },
          { from: "repeater", to: "bob" },
        ]}
        endpoints={["alice", "bob"]}
        caption="Click each link to entangle it. Alice and Bob share a
                 Bell pair only when *both* links are entangled."
      />`
    - Body text closing the loop: transitive entanglement, why
      repeaters matter, brief honest mention of fidelity loss
      (cited / linked, not visualized — fidelity-aware repeaters
      are v4).
  - **Footer-nav slot:** `<a href="/deutsch">← Deutsch</a> | <a href="/sandbox">Sandbox →</a>`
    (next will become `/superdense-coding` in Phase 3; for now it
    holds at the v3 tail position).
- `src/components/ConceptMap.astro` — add the Teleportation node
  (`tier: "primary"`) at a sensible position on the third row
  (placement: alongside `cnot-bell` and `deutsch`; suggested
  `cx: 100, cy: 310`, push existing nodes right if needed). Add a
  reading-path edge from the deutsch node index to the new
  teleportation node index. Verify the SVG viewBox still fits
  (1100 × 360); if not, expand height first.
- `tests/essays/concept-map.test.ts` — append
  `{ href: "/teleportation", label: "Teleportation", tier: "primary" }`
  to `expected[]`; add `"/teleportation"` to `expectedEssays`.
- `tests/essays/nav-graph.test.ts` — in `CHAIN[]`:
  - Change `{ slug: "deutsch", prev: "/cnot-bell", next: "/sandbox" }`
    → `next: "/teleportation"`.
  - Append `{ slug: "teleportation", prev: "/deutsch", next: "/sandbox" }`.
- `src/pages/deutsch.astro` — update its footer-nav `next` link from
  `/sandbox` to `/teleportation` to match `CHAIN`. (CI catches the
  mismatch otherwise.)
- `tests/essays/sandbox-links.test.ts` — append:
  ```ts
  teleportation: teleportationCircuit(),
  ```
  imported from `src/lib/quantum`. (If the test prefers literal
  shapes, inline the same circuit — but importing is cleaner and
  drift-proof.)
- `bundle-budget.json` — add `"teleportation": 12288` to `routes`.
  This is the plan-time placeholder; 02-06 recomputes the real value.
- `src/pages/index.astro` — only if the homepage hero / list
  enumerates essays explicitly; add Teleportation there. Otherwise
  the ConceptMap update is the homepage's only required edit.

**read_first:**
- `src/pages/entanglement.astro` — full read; mirror its prose +
  starter + frontmatter shape. This is the closest essay analog.
- `src/pages/cnot-bell.astro` — `CircuitView` consumer pattern.
- `src/components/CircuitView.astro` — confirm the Phase-1 "Copy as
  Qiskit" button is automatic; no extra prop required.
- `src/layouts/EssayLayout.astro` — slot names + footer-nav slot
  shape.
- `src/components/ConceptMap.astro` — node placement; check the
  viewBox height (currently 360; if the new node needs y > 360 the
  viewBox must grow first).
- `tests/essays/{concept-map,nav-graph,sandbox-links}.test.ts` —
  mirror-update targets.
- `src/lib/quantum/index.ts` — confirm `teleportationCircuit`,
  `teleportationSteps`, `ProtocolStep` are re-exported per 02-01.
- `bundle-budget.json` — current shape (Phase 1 wrote it).
- `.planning/phases/02-teleportation/PHASE-CONTEXT.md` —
  "Mirrors (LOCKED — same-commit-as-essay rule)" section.

**Acceptance:**
- `npm test` green — including the three mirror tests now asserting
  the new Teleportation entries.
- `npm run build` green; build output includes
  `dist/teleportation/index.html`. Total route count goes 16 → 17.
- `npm run check:bundle` green (with the placeholder ceiling; if it
  fails, that means the placeholder was too low — bump within the
  same commit but flag for 02-06 attention).
- Manual smoke: `npm run preview`, browse `/teleportation`:
  - Stepper advances; MultiBlochPanel arrows visibly shrink mid-
    protocol and recover at the end on q2.
  - "Copy as Qiskit" button on the `CircuitView` copies a runnable
    Qiskit snippet of the deferred-measurement circuit.
  - "Remix in sandbox →" deep-links into `/sandbox` with the right
    circuit loaded.
  - QuantumNetwork: clicking both edges flips the indicator on;
    clicking one edge off flips it back. Theme toggle re-paints
    the entangled-edge color correctly.
- Lighthouse mobile a11y ≥ 95 in both themes (manual; record in
  commit body).

---

### 02-06 — Bundle-ceiling recompute (close-out)

**Why:** Phase-1 protocol says the per-route ceiling should be
`round_up(actual_gzip_bytes × 1.2, 1024)` from a clean build. The
plan-time placeholder in 02-05 is a guardrail, not the real number.
A separate close-out commit gives Phase 3 a clean baseline diff and
records the actual measured Phase 2 bundle.

**Deliverables:**

- After 02-05 is merged: run `npm run build`. Read the size of
  `dist/teleportation/index.html`'s referenced
  `dist/_astro/*.js` files; compute the gzipped sum exactly as
  `scripts/check-bundle-budget.mjs` does (the script's own
  table-printing path is the easiest cross-check).
- Update `bundle-budget.json` `"teleportation"` to
  `round_up(actual × 1.2, 1024)`.
- Commit body records: actual gzipped bytes, headroom %, the three
  largest contributing scripts (for future regression debugging).
  Same format Phase 1 used.

**read_first:**
- `scripts/check-bundle-budget.mjs` — the canonical measurement path.
- `bundle-budget.json` — current state.

**Acceptance:**
- `npm test` green (the gate now asserts the real ceiling).
- `npm run build && npm run check:bundle` green.
- Diff is a single-line change to `bundle-budget.json` + a commit
  message documenting the measurement.

---

## Risks & Mitigations (phase-level)

| Risk | Severity | Mitigation |
|------|----------|------------|
| Deferred-measurement framing reads as "we cheaped out on real measurement" | Medium | Body text explicitly names the deferred-measurement principle as a textbook identity, not an approximation. Cite Nielsen & Chuang §4.4. |
| `ProtocolStepper` API is wrong for Phase 3 Superdense's needs | Medium | Build it concrete-first against teleportation; Phase 3 plan-phase audits the API before adopting — small refactor is acceptable. The shape (`Step[]` of label + ops) is generic enough that Superdense's "click 2-bit input → Pauli on Alice" maps cleanly. |
| `MultiBlochPanel` arrow animations between steps look jarring (sudden snap on reset+replay) | Low | `MiniBloch`'s own arrow already eases on each snapshot; the visible cascade is fast on 4 qubits (~5 ms replay). If user testing reveals it, add a 150 ms `requestAnimationFrame` chain in 02-02. v3.1-acceptable polish. |
| `QuantumNetwork` SVG layout looks cramped on narrow mobile | Low | Caller (essay) supplies `cx/cy`; the essay uses 3 nodes spaced at 60/200/340 across a 400-wide viewBox that scales to container. Stack vertically below ~480 px via CSS (`max-width: 100%` + a media-query SVG aspect tweak) if it looks cramped after Lighthouse. |
| Bundle ceiling placeholder (12288) is too tight and 02-05 trips its own CI gate | Low | Pre-emptively check after 02-02..02-04 land (a rough one-shot `npm run build && npm run check:bundle`); if breached, raise the placeholder in 02-05 then settle the real number in 02-06. |
| Mirror tests assume a strict-list shape that breaks when we add the new node mid-array | Low | All three mirror tests use `.find(...)` / `.filter(...)` / `expectedEssays` array existence checks, not index-based assertions — verified during read_first in 02-05. |
| `deutsch.astro` footer-nav update is forgotten | Low | `nav-graph.test.ts`'s contiguity test fails loudly if `deutsch.next` and the new entry's `prev` don't line up — same commit must touch both. |

## Out of Scope (re-stated for executor)

- Any other v3 essay route. (Phases 3-6.)
- `Simulator` / `Circuit` / `codec.ts` / `qiskit.ts` changes — Phase
  1's surface is consumed unchanged.
- Concept-map "track grouping" — Phase 6's OPS-03.
- The cross-essay progress indicator — Phase 6's PROG-01.
- A formal Lighthouse audit script — Phase 6's OPS-01. Manual audit
  recorded in commit body is enough here.
- 3D Bloch in `MultiBlochPanel`, multi-hop network with > 3 nodes
  or weighted edges — all v4.

## Artifacts this phase produces

```
src/lib/quantum/teleportation.ts                            (new)
src/lib/quantum/index.ts                                    (re-exports)
src/components/ProtocolStepper.astro                        (new)
src/components/MultiBlochPanel.astro                        (new)
src/components/QuantumNetwork.astro                         (new)
src/pages/teleportation.astro                               (new)
tests/quantum/teleportation.test.ts                         (new)
tests/components/protocol-stepper.test.ts                   (new)
tests/components/quantum-network.test.ts                    (new)
tests/components/multi-bloch.test.ts                        (new, optional)
src/components/ConceptMap.astro                             (modified)
tests/essays/concept-map.test.ts                            (modified)
tests/essays/nav-graph.test.ts                              (modified)
tests/essays/sandbox-links.test.ts                          (modified)
src/pages/deutsch.astro                                     (modified — footer-nav next)
src/pages/index.astro                                       (modified, only if hero enumerates)
bundle-budget.json                                          (modified — teleportation entry)
```

Phase 3 expectations on these artifacts:
- `ProtocolStepper` API is **frozen**; Superdense uses it as-is.
- `MultiBlochPanel` is **reusable**; Superdense gets a 2-qubit
  instance for free.
- `QuantumNetwork` is **reusable for v4 essays**; not needed in Phase 3
  itself.
- `teleportation.ts` is essay-specific and **not consumed elsewhere**;
  it's the canonical example of the protocol-circuit-builder pattern
  Phase 3 mirrors with `superdense.ts`.
