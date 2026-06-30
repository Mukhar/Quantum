# Phase 5a Plan — Shor: QFT + Period-Finding

**Phase goal:** Ship the first split slice of the original Phase 5:
QFT math, a 4-qubit QFT probability-bars visualizer, a toy
period-finding demo, and the initial `/shor` essay scaffold that teaches
QFT/period finding while explicitly handing off Shor N=15 + PQC to Phase
5b.

**Depends on:** Phase 1 (`toQiskit`, `CircuitView`, `bundle-budget.json`),
Phase 4 (`/grover` handoff and `AmplitudeBars` pattern if present; if
not, reuse `ProbabilityBars.astro`), v1/v2 essay + mirror discipline.

**Source of truth:** `.planning/phases/05-shor/PHASE-CONTEXT.md`
`[5a-candidate]` sections; locked AFK decisions in
`~/.copilot/session-state/bc64e80e-b224-4be7-8a25-f50b54e81279/files/autonomous-decisions.md`.

**Split decision:** SPLIT. The discuss context estimates 8 distinct work
items if kept as one phase; user lock says split when plan count exceeds
6. This PLAN contains only 5a work. Phase 5b lives in
`.planning/phases/05b-shor-pqc/`.

## Definition of Done (phase-level)

1. `src/lib/quantum/qft.ts` exists with pure QFT/period helpers and tests.
2. The 4-qubit QFT visualizer renders input-vs-output probability bars,
   reusing the existing probability-bar visual language and no framework
   runtime dependency.
3. `PeriodFinding` runs in-browser for `a^x mod N` with `N ≤ 15`, validates
   coprime preconditions, and covers canonical periods in tests.
4. `/shor` exists as the canonical route scaffold. It teaches QFT and
   period finding, includes a clear “continued in Phase 5b” section for
   full Shor N=15 + RSA/PQC, and wires footer-nav from `/grover` toward
   the current tail.
5. Same-commit mirrors are updated with the first `/shor` route landing:
   `ConceptMap.astro`, `nav-graph.test.ts`, `concept-map.test.ts`,
   `sandbox-links.test.ts`, and `bundle-budget.json`.
6. OPS-04 remains green; `/shor` gets an initial conservative route budget
   and a close-out plan recomputes from a clean build.
7. No new runtime dependencies; vanilla TS + Astro only.
8. Simulator/sandbox remain capped at 4 qubits. QFT uses pure state-vector
   helpers; global `Circuit`/codec op vocabulary is not expanded in 5a.
9. `npm test` and `npm run build` are green at phase close.

## Pre-flight findings

- `src/lib/quantum/circuit.ts` supports only `gate`, `cnot`, `rot`, and
  `measure`. It has no controlled-phase / controlled-Rz op.
- `src/lib/quantum/simulator.ts` supports single-qubit gates/rotations and
  CNOT only; constructor enforces 1–4 qubits.
- `src/lib/quantum/qiskit.ts` validates through `validateCircuit()` and
  `encodeCircuit()`, so it cannot export >4-qubit or non-IR controlled
  phase operations today.
- `src/components/CircuitView.astro` derives geometry from `circuit.qubits`
  but also calls `encodeCircuit()` and `toQiskit()` at SSR, so it is usable
  only for ≤4-qubit validated `Circuit` values today. The >4-qubit N=15
  path is deferred to Phase 5b.

## Plans

> **Wave 1:** `05-01` alone. QFT math and the local controlled-phase
> state-vector primitive must exist before any UI can consume it.
>
> **Wave 2:** `05-02` and `05-03` in parallel. The QFT visualizer and
> PeriodFinding widget both consume `qft.ts` but touch mostly disjoint
> component files.
>
> **Wave 3:** `05-04`. Compose `/shor` scaffold and update mirrors,
> sandbox starter, and initial bundle budget in the same commit.
>
> **Wave 4:** `05-05`. Clean-build bundle/a11y close-out and route budget
> recompute.

---

### 05-01 — `[5a-candidate]` QFT module + controlled-phase math + tests

**Why:** QFT normally decomposes into Hadamards plus controlled phase
rotations, but the shipped `Circuit` IR has no controlled-phase op and the
4-qubit sandbox cap must not be weakened. This plan keeps controlled-phase
support local to pure math helpers in `qft.ts`, satisfying ALG-05/ALG-06
without rippling through simulator, codec, Qiskit export, or CircuitView.

**Deliverables:**

- `src/lib/quantum/qft.ts` (new) exporting pure helpers:
  - `qftState(state: Complex[], qubits: number): Complex[]`
  - `inverseQftState(state: Complex[], qubits: number): Complex[]`
  - `normalizeState(input: Complex[]): Complex[]`
  - `probabilitiesFromState(state: Complex[]): number[]`
  - `basisLabels(qubits: number): string[]` or reuse existing label
    formatting consistently with `Simulator.basisLabel()`.
  - Local implementation helper equivalent to controlled phase over a
    state vector, e.g. `applyControlledPhaseToState(state, qubits,
    control, target, theta)`, kept internal unless tests need an export.
- The helper must accept 1–4 qubits only; throw a readable `RangeError` for
  invalid qubit counts or state length mismatch.
- Qubit ordering follows the existing convention: qubit 0 is the least
  significant bit, matching `Simulator` and Qiskit mental model.
- Implement QFT with mathematically direct DFT or with a local gate-level
  simulation. If using DFT, add comments/tests that lock the bit-ordering;
  if using gate-level simulation, keep controlled phase local to `qft.ts`.
- Add period helpers needed by 05-03:
  - `modPow(base: number, exp: number, mod: number): number`
  - `gcd(a: number, b: number): number`
  - `findMultiplicativePeriod(a: number, N: number, maxX?: number):
     { kind: "period"; period: number; sequence: number[] } |
     { kind: "invalid"; reason: string; sequence: number[] } |
     { kind: "not-found"; sequence: number[] }`
  - Optional `periodPeakHints(period, registerSize)` returning basis index
    hints for the widget; deterministic and unit-tested.
- `src/lib/quantum/index.ts` re-exports the public QFT/period helpers.
- `tests/quantum/qft.test.ts` (new) covers:
  - QFT preserves normalization for canonical basis states.
  - QFT followed by inverse QFT returns the original state to `1e-9` for
    several 1–4 qubit fixtures.
  - `|0000⟩`, `|0001⟩`, `|0011⟩`, `|0101⟩` produce deterministic,
    normalized 16-bin output distributions.
  - Canonical periods: `N=15,a=2→4`, `N=15,a=4→2`, `N=15,a=7→4`,
    `N=15,a=11→2`.
  - Invalid inputs (`gcd(a,N) !== 1`, `N > 15`, non-integers) return an
    invalid result rather than throwing from UI paths.
  - “No period found in window” behavior returns `not-found` and includes
    enough sequence data for the UI message.

**read_first:**

- `src/lib/quantum/circuit.ts` — confirms no global controlled-phase op.
- `src/lib/quantum/simulator.ts` — state layout and qubit-0 LSB convention.
- `src/lib/quantum/complex.ts` — reuse `Complex`, `add`, `mul`, `scale`,
  `normSquared` instead of introducing math dependencies.
- `src/lib/quantum/qiskit.ts` — understand why this plan avoids global IR
  mutation.
- `tests/quantum/simulator.test.ts`, `tests/quantum/teleportation.test.ts`
  — table-driven numerical tolerance style.

**Acceptance:**

- `npm test -- qft` passes.
- `npm test -- quantum` passes existing quantum suites plus QFT.
- Adding a fake 5-qubit input to `qftState` throws a readable RangeError,
  proving the 4-qubit cap is preserved.
- No files in codec, simulator, qiskit exporter, or CircuitView need to
  change for this plan except `src/lib/quantum/index.ts` re-exports.
- Manual sanity in commit body: QFT→inverse QFT on a random-ish normalized
  4-qubit fixture returns max amplitude error `< 1e-9`.

---

### 05-02 — `[5a-candidate]` QFT visualizer using probability bars

**Why:** ALG-05 asks for a 4-qubit QFT visualizer, and the user locked the
visual style: input vs output probability bars, reusing the existing
AmplitudeBars/ProbabilityBars pattern and adding no new visualization
primitive.

**Deliverables:**

- `src/components/QFTVisualizer.astro` (new) with:
  - Server-rendered figure shell matching `ProbabilityBars.astro` visual
    posture: bordered surface, compact caption, semantic theme classes.
  - Two side-by-side SVG/bar panels: “Input probabilities” and “After
    QFT”. On narrow screens, stack vertically.
  - 16 bins for 4 qubits by default; labels use basis-ket notation.
  - Preset selector with at least `|0000⟩`, `|0001⟩`, `|0011⟩`, `|0101⟩`,
    plus one periodic/superposition preset if useful.
  - “Custom” mode reveals a compact 16-amplitude editor. Keep it simple:
    real-valued weights are acceptable for v3 if normalized before QFT;
    avoid a complex-number UI unless it stays small.
  - `aria-live="polite"` summary of the strongest output peak(s).
- Client logic is vanilla TS/inline script or a tiny `.client.ts` module;
  it imports/embeds only the pure helper logic needed at runtime. No
  framework imports and no new dependency.
- If Phase 4 has landed `AmplitudeBars`, mirror that component’s class and
  data contract. If it has not, adapt the existing `ProbabilityBars.astro`
  SVG/readout style directly.
- `tests/components/qft-visualizer.test.ts` (new) if the repo has a
  component text-test pattern available:
  - Asserts component includes `data-widget="qft-visualizer"`.
  - Asserts preset labels exist.
  - Asserts there are two probability-bar regions/input-output labels.
- Keep a tiny public pure function if needed (e.g. `strongestPeaks`) under
  `src/lib/quantum/qft.ts`; test it in `qft.test.ts` rather than testing
  DOM animation internals.

**read_first:**

- `src/components/ProbabilityBars.astro` — bar chart shell, live text,
  theme, and data-attr conventions.
- Phase 4 `AmplitudeBars` component if present; otherwise do not invent a
  substitute primitive beyond this QFT-specific wrapper.
- `src/components/StateVector.astro` — basis/amplitude readout style.
- `src/lib/quantum/store.ts` — decide whether the widget needs a store or
  should remain self-contained; prefer self-contained for bundle size.
- `.planning/phases/05-shor/PHASE-CONTEXT.md` D-05..D-09.

**Acceptance:**

- `/shor` can render `<QFTVisualizer />` without client errors.
- Changing presets updates both input and output bars immediately.
- Custom amplitudes normalize safely and cannot produce NaN/Infinity bars.
- The widget remains 4-qubit; no UI exposes more than 16 bins.
- `npm run build` and `npm test -- qft` pass.
- Bundle delta is reviewed before 05-05; no new route exceeds OPS-04.

---

### 05-03 — `[5a-candidate]` PeriodFinding helper/widget + canonical tests

**Why:** ALG-06 needs a live toy period-finding demo for `a^x mod N` with
`N ≤ 15`. This widget is the bridge between abstract QFT spikes and the
later Shor factoring story.

**Deliverables:**

- `src/components/PeriodFinding.astro` (new) with:
  - Controls for `N` and `a`, constrained to small integer values with
    `N ≤ 15`.
  - Continuous recompute on change with a short debounce.
  - Clear invalid-state copy for non-coprime pairs and malformed values.
  - A sequence strip/table showing `x` and `a^x mod N` for the explored
    window.
  - A prominent period result (`r = ...`) when found.
  - A QFT peak explanation panel that uses `periodPeakHints()` or similar
    deterministic helper output from `qft.ts`.
  - Edge message: “no period found in this window — try a smaller `a`”
    for `not-found` results.
- Component should be self-contained and vanilla; no global store required.
- `tests/quantum/qft.test.ts` owns helper correctness; add
  `tests/components/period-finding.test.ts` only for structural component
  assertions if the existing suite supports Astro text checks.
- Examples surfaced in the UI include at least:
  - `N=15, a=2 → r=4`
  - `N=15, a=4 → r=2`
  - `N=15, a=7 → r=4`
  - `N=15, a=11 → r=2`

**read_first:**

- `src/components/ProtocolStepper.astro` — data JSON payload and hydrator
  pattern.
- `src/components/ProbabilityBars.astro` — compact figure/readout styling.
- `src/lib/quantum/qft.ts` from 05-01.
- `.planning/phases/05-shor/PHASE-CONTEXT.md` D-10..D-13.
- `tests/quantum/qft.test.ts` from 05-01.

**Acceptance:**

- Selecting canonical examples yields the expected period in the UI and in
  tests.
- Invalid pairs never throw; they render an explanatory message and disable
  misleading period output.
- The sequence table and QFT peak hint update together after debounce.
- `npm test -- qft` and any new period component tests pass.
- `npm run build` passes.

---

### 05-04 — `[5a-candidate]` `/shor` essay scaffold + mirrors + initial budget

**Why:** This is the integration slice for 5a. It establishes `/shor` as
the canonical route, lands ALG-05/ALG-06 in an essay context, and preserves
same-commit mirror discipline. Full N=15 Shor and RSA/PQC remain explicit
Phase 5b continuation, not hidden scope creep.

**Deliverables:**

- `src/pages/shor.astro` (new) using `EssayLayout`.
- Essay outline:
  - Intro from `/grover`: Grover helps search; Shor threatens factoring
    because period finding is different.
  - QFT section with `<QFTVisualizer />` and prose explaining periodic
    structure turning into spikes.
  - Period-finding section with `<PeriodFinding />` and canonical `N=15`
    examples.
  - Stub/continuation section: “Next in this essay: full N=15 Shor and
    post-quantum crypto.” Link/copy should clearly say Phase 5b extends
    the same `/shor` route; do not create `/qft`.
  - Footer-nav: previous `/grover` if Phase 4 has landed; otherwise use
    the current tail pattern and note executor must rebase if Phase 4
    commits concurrently.
- Mirrors updated in the same commit:
  - `src/components/ConceptMap.astro` adds `/shor` as a primary node.
  - `tests/essays/concept-map.test.ts` mirrors the node.
  - `tests/essays/nav-graph.test.ts` inserts `/shor` after `/grover` if
    Phase 4 exists, or after current v3 tail during autonomous sequencing.
  - `tests/essays/sandbox-links.test.ts` adds a ≤4-qubit QFT/period starter
    or explicitly omits with a test comment if no meaningful ≤4-qubit
    starter is available. Do not include N=15 Shor.
  - `bundle-budget.json` adds an initial `/shor` ceiling (conservative
    placeholder; recomputed in 05-05).
- Update previous essay footer-nav in the same source commit so the chain
  remains contiguous.

**read_first:**

- `src/pages/teleportation.astro` — current v3 essay structure.
- Latest `/grover` page and Phase 4 plan/results if present.
- `src/components/ConceptMap.astro` — canonical node and edge arrays.
- `tests/essays/nav-graph.test.ts`, `concept-map.test.ts`,
  `sandbox-links.test.ts` — mirrors to update together.
- `bundle-budget.json` and `scripts/check-bundle-budget.mjs`.

**Acceptance:**

- `/shor` builds and renders QFT + PeriodFinding sections.
- `/shor` body makes the split explicit and does not claim full Shor/PQC is
  complete in 5a.
- Mirror tests pass with the same commit that adds the route.
- `npm run build`, `npm run check:bundle`, and `npm test` pass.
- No N=15 circuit appears in sandbox starters.

---

### 05-05 — `[5a-candidate]` Bundle/a11y close-out and route budget recompute

**Why:** 5a adds the first Shor route and two interactive widgets. OPS-04
requires the bundle ceiling to reflect real clean-build output rather than
an optimistic placeholder.

**Deliverables:**

- Run a clean build and bundle check:
  - `npm run build`
  - `npm run check:bundle`
- Recompute `/shor` ceiling as `ceil(actual_gzip_bytes × 1.2 / 1024) *
  1024` and update only the `/shor` entry in `bundle-budget.json`.
- Run `npm test` after recompute.
- Manual accessibility checklist for `/shor` in both themes:
  - Keyboard reaches QFT preset/custom controls and period controls.
  - Focus rings visible.
  - `aria-live` summaries do not spam on every debounce tick.
  - Mobile layout stacks bars without horizontal traps.
- Commit body records actual gzipped size, final ceiling, and manual a11y
  notes.

**read_first:**

- `bundle-budget.json` — current ceiling style.
- `scripts/check-bundle-budget.mjs` — output table and route naming.
- `.planning/phases/01-foundation/PLAN.md` Plan 01-04 — budget protocol.
- `.planning/phases/02-teleportation/PLAN.md` Plan 02-06 — close-out
  precedent.

**Acceptance:**

- `npm run build` passes.
- `npm run check:bundle` passes with `/shor` below its ceiling.
- `npm test` passes.
- Manual a11y checklist recorded in commit body.
- No unrelated route ceilings change unless the executor documents a real
  build-system reason.

---

## Cross-plan verification

- `npm test -- qft` after 05-01 and again after 05-03.
- `npm run build` after every component/route plan.
- `npm test` and `npm run check:bundle` after 05-04 and 05-05.
- Same-commit mirror discipline: any source route/nav/concept-map/sandbox
  starter change must land with its corresponding test mirror.
- Preserve the split boundary: no `buildShor15()`, no RSACountdown, no NIST
  PQC cards, and no >4-qubit circuit rendering in 5a.

## Artifacts this phase produces

- `src/lib/quantum/qft.ts`
- `tests/quantum/qft.test.ts`
- `src/components/QFTVisualizer.astro`
- `src/components/PeriodFinding.astro`
- Optional component structural tests for QFT/PeriodFinding
- `src/pages/shor.astro` scaffold
- Mirror updates for `/shor`
- Initial and recomputed `/shor` bundle budget entry

## Frontmatter

```yaml
phase: 5a
phase_slug: 05-shor
phase_title: "Shor — QFT + period-finding"
split_from: "Phase 5: Shor + QFT + PQC threat"
requirements: [ALG-05, ALG-06, OPS-04]
plans:
  - id: 05-01
    title: "QFT module + controlled-phase math + tests"
    wave: 1
    depends_on: []
    autonomous: true
    requirements: [ALG-05, ALG-06]
    files_modified:
      - src/lib/quantum/qft.ts
      - src/lib/quantum/index.ts
      - tests/quantum/qft.test.ts
  - id: 05-02
    title: "QFT visualizer using probability bars"
    wave: 2
    depends_on: [05-01]
    autonomous: true
    requirements: [ALG-05]
    files_modified:
      - src/components/QFTVisualizer.astro
      - tests/components/qft-visualizer.test.ts
  - id: 05-03
    title: "PeriodFinding helper/widget + canonical tests"
    wave: 2
    depends_on: [05-01]
    autonomous: true
    requirements: [ALG-06]
    files_modified:
      - src/components/PeriodFinding.astro
      - tests/quantum/qft.test.ts
      - tests/components/period-finding.test.ts
  - id: 05-04
    title: "/shor essay scaffold + mirrors + initial budget"
    wave: 3
    depends_on: [05-02, 05-03]
    autonomous: true
    requirements: [ALG-05, ALG-06, OPS-04]
    files_modified:
      - src/pages/shor.astro
      - src/components/ConceptMap.astro
      - tests/essays/nav-graph.test.ts
      - tests/essays/concept-map.test.ts
      - tests/essays/sandbox-links.test.ts
      - bundle-budget.json
  - id: 05-05
    title: "Bundle/a11y close-out and route budget recompute"
    wave: 4
    depends_on: [05-04]
    autonomous: false
    requirements: [OPS-04]
    files_modified:
      - bundle-budget.json
```
