# Phase 4 Plan — Grover + Search reality

**Phase goal:** Ship `/grover`, the v3 search essay. The algorithm half
implements real simulator-backed Grover amplitude amplification for the
site's hard 4-qubit cap: uniform superposition, oracle phase flip,
diffusion as inversion about the mean, and an `AmplitudeBars` iterator
that shows signed amplitudes concentrating on the marked state. The
use-case half grounds the promise with `SearchComparison`: Grover gives a
quadratic `√N` speedup for unstructured search, not magic database search
and not RSA-breaking. The essay closes by handing cryptography to Phase 5
(Shor/QFT/PQC).

**Depends on:** Phase 1 (`CircuitView` Qiskit export,
`bundle-budget.json`, `scripts/check-bundle-budget.mjs`); v1/v2 essay
infrastructure (`EssayLayout`, `MathBlock`, `MathNerds`, `SandboxLink`,
`ConceptMap`, mirror tests); existing quantum primitives
(`Simulator`, `Circuit`, `qiskit.ts`). Phase 4 is independent of Phase 2
and Phase 3 implementation, except that the final nav-chain position must
respect Phase 3 if `/superdense-coding` already exists when 04-04 runs.

**Source of truth:** `.planning/phases/04-grover/PHASE-CONTEXT.md` +
`.planning/ROADMAP.md` Phase 4 + `.planning/REQUIREMENTS.md` `ALG-04`,
`USE-03`, `OPS-04` + locked AFK decisions in
`$HOME/.copilot/session-state/bc64e80e-b224-4be7-8a25-f50b54e81279/files/autonomous-decisions.md`.

## Definition of Done (phase-level)

1. `src/lib/quantum/grover.ts` exists and exports the canonical Grover
   helper surface for 1-4 qubits:
   - `optimalGroverIterations(N: number): number`
   - `basisLabels(qubits: number): string[]` or equivalent label helper
     if the existing `basisKet` helper is not enough.
   - `prepareUniform(sim: Simulator): Simulator`
   - `applyPhaseOracle(sim: Simulator, markedIndex: number): Simulator`
   - `applyDiffusion(sim: Simulator): Simulator`
   - `runGrover(opts): GroverSnapshot[]`
   - `buildGroverCircuit(N, marked, iterations): Circuit`
2. **ALG-04:** oracle and diffusion are real state-vector operations,
   not visual fakes. Tests prove:
   - oracle flips the marked amplitude's sign and leaves others alone;
   - diffusion implements `aᵢ ↦ 2·mean(a) - aᵢ` over amplitudes;
   - normalization stays ≈ 1 after every operation;
   - after `⌊(π/4)·√N⌋` iterations, marked-state probability is the
     dominant probability for `N = 4, 8, 16` and high for `N = 16`.
3. The simulator cap stays unchanged: `MAX_QUBITS = 4`. No new `Op` kind
   is added unless the executor proves the existing gate vocabulary
   cannot satisfy `CircuitView` / `SandboxLink`; the planned route is
   state-vector helpers plus a small supported-gate example circuit.
4. `src/components/AmplitudeBars.astro` exists and renders signed
   vertical amplitude bars for up to 16 basis states. Negative bars are
   visually distinct below a zero axis; the marked basis state is
   highlighted; `aria-live` summarizes current iteration and marked
   probability; motion honors `prefers-reduced-motion`.
5. `AmplitudeBars` owns or coordinates the Grover-specific iterator
   controls (do **not** reuse `ProtocolStepper`): marked-state dropdown,
   Prev iteration, Next iteration, Reset, `k / k_opt` indicator, and a
   secondary numeric iteration-count override.
6. `src/components/SearchComparison.astro` exists and renders the
   formula-driven use-case widget. Slider stops are exactly
   `16, 32, 64, 128, 256, 512, 1024`; classical average probes display
   as `N/2`; Grover iterations display as `⌊(π/4)·√N⌋`; `N > 16` is
   explicitly described as animation/formula-only, not simulated.
7. `src/pages/grover.astro` exists and uses the established essay shape:
   pain-point opener, algorithm half, circuit/Qiskit/sandbox bridge,
   use-case reality-check half, self-test, math appendix, footer-nav.
8. The essay includes at least one `CircuitView` with Phase-1 "Copy as
   Qiskit" available by inheritance. Prefer a compact 2-qubit Grover
   example circuit that uses supported ops; the 4-qubit widget supplies
   the richer simulator-backed amplitude story.
9. The essay includes a `SandboxLink` starter for the Grover circuit and
   the mirror in `tests/essays/sandbox-links.test.ts` is updated in the
   same commit.
10. The RSA misconception is closed explicitly in prose:
    **"No — Grover does not break RSA. That is Shor; see the next
    essay."** Avoid hype language like "search is solved".
11. All mirrors update in the same commit as the route:
    - `src/components/ConceptMap.astro`
    - `tests/essays/concept-map.test.ts`
    - `tests/essays/nav-graph.test.ts`
    - `tests/essays/sandbox-links.test.ts`
    - `bundle-budget.json`
    - `src/pages/sitemap.xml.ts` and/or `src/pages/index.astro` only if
      they enumerate route lists explicitly.
12. Footer-nav ordering respects the live tree at execution time:
    - If Phase 3 has **not** landed, update
      `teleportation → grover → sandbox`.
    - If Phase 3 has landed, update
      `teleportation → superdense-coding → grover → sandbox`.
13. `bundle-budget.json` initially includes `/grover` with a conservative
    ceiling no higher than the current `/teleportation` ceiling unless a
    clean build proves a slightly higher placeholder is necessary. The
    close-out plan recomputes the final ceiling as
    `round_up(actual_gzip_bytes × 1.2, 1024)`.
14. `npm test` is green, including quantum tests, component/widget tests,
    mirror tests, and the bundle gate.
15. `npm run build` is green; build output includes
    `dist/grover/index.html`.
16. Lighthouse mobile accessibility target for `/grover` is ≥ 95 in both
    light and dark themes. Manual audit result is recorded in the
    essay/mirror commit body or the close-out commit body.
17. No runtime dependencies are added. All interactivity is vanilla
    TypeScript / Astro script + in-repo helpers; no React/Preact/framework
    imports.

## Plans

> **Wave 1 (parallel-safe foundations):** `04-01`, `04-02`, and `04-03`
> can run in parallel. `04-01` owns quantum math and tests.
> `04-02` owns the signed amplitude widget shell/hydrator and can define
> its own JSON contract while waiting for the module. `04-03` owns the
> independent formula-only comparison widget.
>
> **Wave 2 (compose):** `04-04` integrates the route, imports the module
> and widgets, updates mirrors, adds the placeholder budget entry, and
> fixes footer-nav according to the live Phase 3 state.
>
> **Wave 3 (close):** `04-05` performs the clean-build bundle measurement
> and tightens `/grover` to measured + 20% headroom.

---

### 04-01 — `quantum/grover` module + correctness tests

**Why:** This is the trust anchor for the essay. Grover is easy to fake
as moving bars, but v3's value proposition is inspectable math. The
module gives the widget a single source of truth for every amplitude
snapshot, keeps the simulator cap explicit, and avoids polluting
`Circuit`, `codec`, and `qiskit` with an arbitrary oracle gate that the
rest of the app does not need.

**Deliverables:**

- `src/lib/quantum/grover.ts` (new) — exports:
  ```ts
  import { Simulator } from "./simulator";
  import type { Circuit } from "./circuit";

  export interface GroverRunOptions {
    qubits: number;
    markedIndex: number;
    iterations?: number;
  }

  export interface GroverSnapshot {
    iteration: number;          // 0 = uniform superposition
    amplitudes: number[];       // signed real amplitudes, length N
    probabilities: number[];    // |amplitude|², length N
    markedIndex: number;
    markedProbability: number;
    basisLabels: string[];
  }

  export function optimalGroverIterations(N: number): number;
  export function prepareUniform(sim: Simulator): Simulator;
  export function applyPhaseOracle(sim: Simulator, markedIndex: number): Simulator;
  export function applyDiffusion(sim: Simulator): Simulator;
  export function runGrover(opts: GroverRunOptions): GroverSnapshot[];
  export function buildGroverCircuit(N: number, marked: number, iterations: number): Circuit;
  ```
- Validation rules:
  - `qubits` must be integer in `[1, 4]`.
  - `N` must be a power of two in `[2, 16]` for simulator-backed runs.
  - `markedIndex` must be integer in `[0, N)`.
  - `iterations` defaults to `optimalGroverIterations(1 << qubits)`.
  - `iterations` may be `0` and should allow overshoot for the widget;
    cap at a small, explicit maximum such as `Math.max(8, 2 * kOpt + 2)`
    for `N ≤ 16`.
- `optimalGroverIterations(N)` returns `Math.floor((Math.PI / 4) * Math.sqrt(N))`
  after validating that `N` is a power of two and at least 2. Do not
  silently accept `N = 1024` in `runGrover`; `SearchComparison` handles
  formula-only larger sizes.
- `prepareUniform(sim)` applies `H` to every qubit:
  ```ts
  for (let q = 0; q < sim.qubits; q++) sim.apply("H", q);
  return sim;
  ```
- `applyPhaseOracle(sim, markedIndex)` multiplies exactly
  `sim.state[markedIndex]` by `-1`. The marked index follows the
  simulator/Qiskit LSB convention: index `11` in 4 qubits is `|1011⟩`
  because labels are binary padded to `qubits`.
- `applyDiffusion(sim)` implements inversion about the mean over complex
  amplitudes:
  ```ts
  const mean = sim.state.reduce((acc, a) => ({ re: acc.re + a.re, im: acc.im + a.im }), { re: 0, im: 0 });
  mean.re /= sim.state.length;
  mean.im /= sim.state.length;
  sim.state = sim.state.map((a) => ({ re: 2 * mean.re - a.re, im: 2 * mean.im - a.im }));
  return sim;
  ```
  Keep the complex form even though Grover starts with real amplitudes;
  this prevents future rotations from corrupting the helper.
- `runGrover(opts)` returns snapshots at iteration `0` (uniform
  superposition) and after each oracle+diffusion loop. Snapshot
  amplitudes should be `state.map((a) => a.re)` only after asserting the
  imaginary components are negligible for this construction; if any
  `|im| > 1e-10`, include the real part but keep tests honest.
- `buildGroverCircuit(N, marked, iterations)` returns a small
  Qiskit/sandbox-friendly `Circuit` using the supported vocabulary. The
  recommended implementation is a 2-qubit pedagogical circuit for
  `N = 4` only, with `H` preparation and an oracle/diffusion
  decomposition for one default marked state if concise. If arbitrary
  marked decomposition becomes noisy, keep validation strict:
  `N === 4`, `marked` in `[0, 3]`, and document in the function comment
  that full 4-qubit Grover is represented by `runGrover`, not by a new
  circuit op.
- `src/lib/quantum/index.ts` — re-export the functions and
  `GroverRunOptions` / `GroverSnapshot` types.
- `tests/quantum/grover.test.ts` (new) — suites:
  1. **Optimal iteration math.** Assert exact values for
     `N = 4, 8, 16` and throw cases for non-powers / out-of-range.
  2. **Uniform preparation.** For 1-4 qubits, every probability is
     `1 / N ± 1e-12` after `prepareUniform`.
  3. **Oracle sign flip.** For a 4-qubit uniform state and marked
     `0`, `5`, `11`, only that amplitude's real sign flips.
  4. **Diffusion formula.** Seed a 2-qubit simulator state manually
     with known real amplitudes; assert every output equals
     `2·mean - aᵢ` to `1e-12` and total probability remains 1 for the
     normalized case.
  5. **Amplitude concentration.** For `qubits = 2, 3, 4`, run the
     default iterations for a non-zero marked state. Assert:
     - final marked probability is the maximum probability;
     - for `N = 16`, final marked probability is comfortably high
       (use a robust threshold such as `> 0.90` rather than brittle
       exact equality);
     - every snapshot's probabilities sum to `1 ± 1e-10`.
  6. **Circuit builder.** `buildGroverCircuit(4, marked, 1)` returns a
     `Circuit` that `validateCircuit`, `encodeCircuit`, and `toQiskit`
     accept. If the function intentionally supports only a default
     marked state, test the throw message for unsupported variants.

**read_first:**
- `src/lib/quantum/simulator.ts` — state layout, `MAX_QUBITS = 4`,
  direct state mutation norms, `basisLabel`.
- `src/lib/quantum/circuit.ts` — `Circuit`, `Op`, constructors,
  `validateCircuit`, `MAX_STEPS`.
- `src/lib/quantum/qiskit.ts` — supported export vocabulary; avoid new
  ops unless absolutely necessary.
- `src/lib/quantum/index.ts` — public barrel pattern.
- `tests/quantum/simulator.test.ts` — numeric tolerance style.
- `tests/quantum/qiskit.test.ts` — Qiskit/codec assertion style for
  circuits consumed by `CircuitView`.
- `.planning/phases/04-grover/PHASE-CONTEXT.md` — D-06 and D-07 in full.

**Acceptance:**
- `npm test -- grover` runs the new quantum suite green.
- `npm test -- qiskit` still passes; no Qiskit drift introduced.
- `npm run build` clean.
- Manual sanity in commit body: for `qubits=4`, `markedIndex=11`,
  `runGrover` starts at `P(|1011⟩)=0.0625` and reaches the dominant
  bucket after `optimalGroverIterations(16) = 3` iterations.
- No changes to `Simulator.MAX_QUBITS`, `Circuit.OP_KINDS`, codec wire
  format, or Qiskit mapping tables unless explicitly justified in the
  commit body.

---

### 04-02 — `AmplitudeBars.astro` signed Grover iterator

**Why:** The visual lesson in ALG-04 is not probability alone; it is the
sign flip followed by inversion about the mean. Existing
`ProbabilityBars` hides sign, so Phase 4 needs a small signed-amplitude
variant with Grover-specific controls. This plan is intentionally
component-local so it can run in parallel with the quantum module; the
essay integration in 04-04 wires it to `runGrover` snapshots.

**Deliverables:**

- `src/components/AmplitudeBars.astro` (new) — server-rendered shell +
  inline script. Proposed prop contract (import `GroverSnapshot` from
  04-01 if available; otherwise use this structural type):
  ```ts
  interface Props {
    snapshots: Array<{ iteration: number; amplitudes: number[]; probabilities: number[]; markedIndex: number; markedProbability: number; basisLabels: string[] }>;
    markedIndex: number;
    qubits: number;
    caption?: string;
    maxIterations?: number;
  }
  ```
- Figure contract: `<figure data-widget="amplitude-bars" data-qubits={qubits}
  data-marked-index={markedIndex} data-snapshots={JSON.stringify(snapshots)}>`
  containing a marked-state `<select>`, numeric iteration override,
  `<svg data-role="chart">`, `aria-live` readout, and Prev/Next/Reset
  buttons. Mirror `ProtocolStepper` / `ProbabilityBars` styling.
- Chart behavior:
  - One vertical bar per basis state (max 16).
  - Zero axis across the middle of the SVG.
  - Positive amplitudes extend upward; negative amplitudes extend
    downward. Do not encode sign by color alone.
  - Marked state has a stroke/ring and a label annotation.
  - Labels use existing basis convention (`|0000⟩`, etc.) and remain
    legible at 16 bars; rotate or use smaller monospace labels if
    needed.
  - Bar transitions animate `height`/`y` for normal users and are
    disabled when `prefers-reduced-motion: reduce` is true.
- Control behavior:
  - Initial snapshot is iteration `0` (uniform superposition).
  - Prev/Next clamps at `[0, snapshots.length - 1]`.
  - Reset returns to iteration `0`.
  - Marked-state dropdown lists all basis labels. If 04-02 runs before
    04-01, the component can dispatch a custom event or just update the
    selected value; 04-04 may choose to re-render server-provided
    snapshots per marked state via multiple precomputed sequences.
    Preferred final integration: `grover.astro` passes precomputed
    sequences for every marked state in a JSON payload, and the widget
    swaps sequences client-side without importing simulator code.
  - Numeric override controls how many snapshots are exposed. It should
    default to the optimal count's sequence length and allow overshoot
    up to the provided `maxIterations`.
- Accessibility:
  - `aria-live="polite"` readout includes: marked basis label, current
    iteration, `k_opt`, and marked probability.
  - Buttons have `disabled` and `aria-disabled` at clamps.
  - Dropdown and number input have visible labels.
  - SVG has a descriptive `aria-label`; the textual readout carries the
    important numeric state so the chart is not the only source of truth.
- `tests/components/amplitude-bars.test.ts` (new, if component tests are
  already practical in this repo) or text-structure tests following
  existing component test patterns. Minimum assertions:
  - file contains `data-widget="amplitude-bars"`;
  - file contains a marked-state `<select>` contract;
  - file contains `aria-live="polite"`;
  - file handles `prefers-reduced-motion`;
  - negative amplitudes are rendered below a zero axis (assert helper
    function if extracted, otherwise raw source substrings are
    acceptable like other Astro tests).

**read_first:**
- `src/components/ProbabilityBars.astro` — bar geometry, basis labels,
  reduced-motion pattern.
- `src/components/ProtocolStepper.astro` — Prev/Next clamp controls,
  `aria-live`, keyboard/focus posture.
- `src/lib/quantum/format.ts` — `basisKet` helper if present.
- `src/lib/quantum/store.ts` — only for style; do **not** bind this
  widget to the global simulator store unless it is clearly smaller than
  static snapshot JSON.
- `.planning/phases/04-grover/PHASE-CONTEXT.md` — D-01, D-02, D-03,
  D-05.

**Acceptance:**
- `npm run build` clean with the new component present.
- `npm test -- amplitude-bars` green if a component test is added;
  otherwise `npm test` green with no component-regression failures.
- Manual smoke after 04-04 integration: `/grover` shows 16 signed bars,
  the marked bar goes negative after oracle/diffusion iteration 1, and
  the readout reports increasing marked probability through the optimal
  iteration.
- Keyboard-only user can change marked state and move Prev/Next/Reset
  without pointer input.
- No `ProtocolStepper` import and no new framework dependency.

---

### 04-03 — `SearchComparison.astro` formula widget

**Why:** USE-03 is the honest-disappointment half of the essay. The
reader needs to feel the gap between linear scan and `√N`, while also
seeing that the gap is modest on toy sizes and not a general database or
RSA breaker. This widget is formula-driven and independent of the
simulator, so it can land in parallel with the quantum math.

**Deliverables:**

- `src/components/SearchComparison.astro` (new) — server-rendered shell
  + inline script. Proposed props:
  ```ts
  interface Props {
    stops?: number[]; // default [16, 32, 64, 128, 256, 512, 1024]
    initialN?: number; // default 16
    caption?: string;
  }
  ```
- Locked stops:
  ```ts
  const STOPS = [16, 32, 64, 128, 256, 512, 1024] as const;
  const groverIterations = (N: number) => Math.floor((Math.PI / 4) * Math.sqrt(N));
  const classicalAverage = (N: number) => N / 2;
  ```
  If logic is extracted for tests, put it in
  `src/lib/searchComparison.ts` or `src/lib/quantum/searchComparison.ts`
  only if there is an existing convention. Keep it tiny.
- Markup / hydrator contract: `<figure data-widget="search-comparison">`
  with an indexed slider (`min="0" max="6" step="1"`), visible `N` and
  `log₂N`, two responsive lanes ("Classical linear scan" average `N/2`
  + worst-case note, "Grover" `⌊(π/4)·√N⌋`), deterministic lane/counter
  animation, `aria-live` readout, reduced-motion guard, and an explicit
  callout: `N > 16 is formula-only here; the in-browser simulator stays
  capped at 4 qubits.`
- `tests/components/search-comparison.test.ts` or
  `tests/quantum/search-comparison.test.ts` (new if helper extracted):
  - stops equal `[16, 32, 64, 128, 256, 512, 1024]`;
  - `groverIterations(16) === 3` and `groverIterations(1024) === 25`;
  - `classicalAverage(1024) === 512`;
  - component source contains the formula-only cap note and
    `aria-live="polite"`.

**read_first:**
- `src/components/ProbabilityBars.astro` — widget shell and motion guard.
- `src/components/QuantumNetwork.astro` if present — compact inline SVG /
  interactive figure a11y style.
- `src/pages/teleportation.astro` — use-case-half prose/widget rhythm.
- `.planning/phases/04-grover/PHASE-CONTEXT.md` — D-04 and D-08.

**Acceptance:**
- `npm run build` clean.
- `npm test -- search-comparison` green if helper/test added;
  otherwise `npm test` green.
- Manual smoke after 04-04 integration: slider visits exactly seven
  stops; at `N = 1024`, readout shows classical average `512` and Grover
  `25`; page clearly says this is formula-only beyond `N = 16`.
- No simulator import and no client-side heavy dependency. The component
  should remain well under `/teleportation`'s current eager JS budget.

---

### 04-04 — `/grover` essay + mirrors + placeholder budget

**Why:** This is the integration plan. It composes the math and widgets
into the actual route, updates every canonical mirror in the same commit,
and makes `/grover` visible in the reading path. This plan is where the
phase promise becomes user-facing: real amplitudes first, sober search
reality second, clean Shor handoff last.

**Deliverables:**

- `src/pages/grover.astro` (new) — uses `EssayLayout`. Frontmatter
  should import:
  ```ts
  import EssayLayout from "../layouts/EssayLayout.astro";
  import MathBlock from "../components/MathBlock.astro";
  import MathNerds from "../components/MathNerds.astro";
  import CircuitView from "../components/CircuitView.astro";
  import SandboxLink from "../components/SandboxLink.astro";
  import AmplitudeBars from "../components/AmplitudeBars.astro";
  import SearchComparison from "../components/SearchComparison.astro";
  import { buildGroverCircuit, runGrover, optimalGroverIterations } from "../lib/quantum";
  ```
- Suggested frontmatter constants:
  ```ts
  const QUBITS = 4;
  const DEFAULT_MARKED = 0b1011;
  const K_OPT = optimalGroverIterations(1 << QUBITS);
  const snapshotsByMarked = Object.fromEntries(
    Array.from({ length: 1 << QUBITS }, (_, markedIndex) => [
      markedIndex,
      runGrover({ qubits: QUBITS, markedIndex, iterations: K_OPT + 3 }),
    ]),
  );
  const demoCircuit = buildGroverCircuit(4, 3, 1);
  ```
  Executor may adjust if `AmplitudeBars` takes a flatter prop shape;
  keep default marked state readable/non-zero (e.g. `|1011⟩`).
- Essay outline:
  1. **Pain-point opener:** unstructured search means "the only test is
     try an item and ask the oracle whether it is the answer." Use
     password/hash or log-search intuition without implying a real
     database can be queried in superposition for free.
  2. **Algorithm half:**
     - Introduce uniform superposition over 16 candidates.
     - Define the oracle as a phase flip on the marked state.
     - Define diffusion as inversion about the mean.
     - Mount `<AmplitudeBars ... />` with default `N = 16`, marked
       dropdown, optimal iteration default, numeric override.
     - Include a short "watch the sign" instruction: iteration 0 uniform,
       oracle flips the marked amplitude negative, diffusion raises it.
  3. **Circuit/Qiskit bridge:**
     - Mount `<CircuitView circuit={demoCircuit} caption="A compact
       Grover circuit fragment you can copy as Qiskit." />`.
     - Mount `<SandboxLink circuit={demoCircuit} label="Remix this
       Grover starter in the sandbox →" />`.
     - Prose: the bars use direct state-vector oracle/diffusion for
       4-qubit clarity; Qiskit export is the path for running and
       decomposing larger circuits.
  4. **Use-case reality half:**
     - Mount `<SearchComparison />`.
     - Explain classical average `N/2`, Grover `⌊π/4√N⌋`, and why a
       quadratic speedup is powerful but not infinite.
     - Include a compact "changes / does not change" table:
       Grover helps brute-force key search quadratically; it does not
       sort a database, remove data-loading costs, or factor RSA.
  5. **RSA handoff:** explicit locked sentence:
     `No — Grover does not break RSA. That is Shor; see the next essay.`
     Link to `/shor` only if the route exists; otherwise phrase as
     "the next essay" without a dead link.
  6. **Self-test:** ask the reader to overshoot optimal iterations and
     observe the marked probability fall; ask why doubling symmetric key
     length offsets a square-root speedup.
  7. **Math appendix:** `MathNerds` section with:
     - oracle matrix idea `O_f |x⟩ = (-1)^{f(x)} |x⟩`;
     - diffusion `D = 2|s⟩⟨s| - I`;
     - iteration estimate `k ≈ π/4√N`;
     - simulator cap note (16 amplitudes max in browser).
- Footer-nav slot:
  - If no `src/pages/superdense-coding.astro` exists when executing,
    update existing tail to `teleportation → grover → sandbox`:
    - `src/pages/teleportation.astro` next link becomes `/grover`.
    - `/grover` prev is `/teleportation`, next is `/sandbox`.
  - If Phase 3 exists, update to
    `teleportation → superdense-coding → grover → sandbox`:
    - `src/pages/superdense-coding.astro` next link becomes `/grover`.
    - `/grover` prev is `/superdense-coding`, next is `/sandbox`.
    - Leave `teleportation` pointing to `/superdense-coding`.
  - Mirror `tests/essays/nav-graph.test.ts` in the same commit.
- `src/components/ConceptMap.astro` — add a primary Grover node. Place it
  after the current v3 communication nodes. Do not implement Phase-6
  track grouping; just preserve the flat layout and expand viewBox height
  if necessary.
- `tests/essays/concept-map.test.ts` — add
  `{ href: "/grover", label: "Grover", tier: "primary" }` and include
  `/grover` in expected live essays.
- `tests/essays/nav-graph.test.ts` — update `CHAIN[]` per footer-nav
  decision above.
- `tests/essays/sandbox-links.test.ts` — add `grover: buildGroverCircuit(4, 3, 1)`
  or a literal matching the page's `demoCircuit`. Prefer importing from
  `src/lib/quantum` if that keeps page and test in one source of truth.
- `bundle-budget.json` — add `"grover": 2048` as the plan-time
  placeholder if `/teleportation` is 2048 at execution time; otherwise
  use the current `/teleportation` ceiling as the upper bound. If the
  placeholder fails `npm run check:bundle`, bump just enough to pass and
  flag 04-05 to recompute from actual.
- `src/pages/sitemap.xml.ts` — add `/grover` if the sitemap maintains an
  explicit route list.
- `src/pages/index.astro` — add Grover only if homepage enumerates essays.

**read_first:**
- `src/pages/teleportation.astro` — frontmatter, widgets, footer-nav.
- `src/layouts/EssayLayout.astro` — slot names and SEO props.
- `src/components/CircuitView.astro` and `src/components/SandboxLink.astro`.
- `src/components/ConceptMap.astro` and all three essay mirror tests.
- `bundle-budget.json`, `src/pages/sitemap.xml.ts`, `src/pages/index.astro`.
- Wave-1 outputs: `grover.ts`, `AmplitudeBars.astro`, `SearchComparison.astro`.
- `.planning/phases/04-grover/PHASE-CONTEXT.md` — D-08 and D-09.

**Acceptance:**
- `npm test` green, including Grover quantum tests and all essay mirrors.
- `npm run build` green; `dist/grover/index.html` exists.
- `npm run check:bundle` green with the placeholder `/grover` ceiling.
- Manual smoke on `/grover`: AmplitudeBars shows 16 signed bars, dropdown
  resets/recomputes, Prev/Next/Reset work, override can overshoot,
  CircuitView copies Qiskit, SandboxLink opens the starter, SearchComparison
  reaches all seven stops, and footer-nav matches the mirror.
- Manual Lighthouse mobile a11y ≥ 95 in both themes, or explicitly record
  deferral to Phase 6 OPS-01 if the environment cannot run Lighthouse.

---

### 04-05 — Bundle-ceiling recompute (close-out)

**Why:** The 04-04 budget entry is a guardrail. Phase 1's OPS-04 protocol
requires every route ceiling to be based on a clean build's measured
actual eager JS plus 20% headroom, rounded to the nearest KB. Keeping this
as a separate commit makes future bundle regressions easy to diff.

**Deliverables:**

- Run a clean build and the bundle gate:
  ```bash
  npm run build
  npm run check:bundle
  ```
- Read the `/grover` actual gzipped eager JS from the bundle gate output.
  Use `scripts/check-bundle-budget.mjs` as the canonical measurement path;
  do not invent a separate metric.
- Update only `bundle-budget.json` route `"grover"` to
  `Math.ceil(actual * 1.2 / 1024) * 1024`.
- Commit body records actual gzipped bytes, final ceiling, headroom %, and
  largest eager script(s) if identifiable from `dist/grover/index.html`.

**read_first:**
- `scripts/check-bundle-budget.mjs` — canonical measurement code.
- `bundle-budget.json` — route manifest.
- `package.json` — verify `npm test` still runs the bundle gate.

**Acceptance:**
- `npm run build && npm run check:bundle` green.
- `npm test` green with the final `/grover` ceiling.
- Diff is limited to `bundle-budget.json` unless a same-phase bundle bug
  must be fixed before close-out.
- Final ceiling is `≤` the current `/teleportation` ceiling where
  possible. If higher, commit body explains the cause and mitigation.

---

## Risks & Mitigations (phase-level)

| Risk | Severity | Mitigation |
|------|----------|------------|
| Full oracle circuit decomposition balloons scope | Medium | Direct state-vector helpers for the real demo; compact supported-gate `CircuitView` starter only. |
| Signed amplitudes confuse readers | Medium | Zero axis, below-axis negatives, marked highlighting, and live probability readout. |
| SearchComparison implies hidden 1024-state simulation | High | Widget/prose state `N > 16` is formula-only; simulator cap remains 4 qubits. |
| RSA handoff under-explained | Medium | Locked sentence plus changes/does-not-change table. |
| Bundle exceeds `/teleportation` | Medium | Static snapshot JSON, formula-only comparison, no framework, measure/trim before raising ceiling. |
| Phase 3 lands before Phase 4 | Low | 04-04 branches on live `/superdense-coding` route and updates nav/mirrors accordingly. |

## Out of Scope (re-stated for executor)

- Raising simulator above 4 qubits or changing `REQ-13`.
- New arbitrary oracle/multi-controlled `Op` kinds unless proven necessary.
- Reusing `ProtocolStepper`, clickable bars as required picker, or
  analytics/telemetry.
- Full Shor/QFT/PQC content, concept-map track grouping, progress
  indicator, or new runtime dependencies.

## Cross-plan verification

- After Wave 1: `npm test -- grover`, widget tests, and `npm run build`.
- After 04-04: full `npm test`, `npm run build`, and `npm run check:bundle`.
- After 04-05: `npm test` again so the final measured ceiling is enforced.
- Manual route smoke covers both widgets, Qiskit copy, sandbox link,
  footer-nav, keyboard controls, reduced motion, and theme contrast.

## Artifacts this phase produces

```text
src/lib/quantum/grover.ts                              (new)
src/lib/quantum/index.ts                               (modified — Grover exports)
src/components/AmplitudeBars.astro                     (new)
src/components/SearchComparison.astro                  (new)
src/pages/grover.astro                                 (new)
tests/quantum/grover.test.ts                           (new)
tests/components/amplitude-bars.test.ts                (new, if practical)
tests/components/search-comparison.test.ts             (new, if practical)
src/components/ConceptMap.astro                        (modified)
tests/essays/concept-map.test.ts                       (modified)
tests/essays/nav-graph.test.ts                         (modified)
tests/essays/sandbox-links.test.ts                     (modified)
src/pages/teleportation.astro                          (modified if Phase 3 not landed)
src/pages/superdense-coding.astro                      (modified if Phase 3 landed)
src/pages/sitemap.xml.ts                               (modified if route list explicit)
src/pages/index.astro                                  (modified only if explicit list)
bundle-budget.json                                     (modified twice)
```

## Frontmatter

```yaml
phase: 4
phase_slug: 04-grover
title: Grover + Search reality
autonomous: true
requirements: [ALG-04, USE-03, OPS-04]
plans:
  - id: 04-01
    title: quantum/grover module + correctness tests
    wave: 1
    depends_on: []
    files_modified:
      - src/lib/quantum/grover.ts
      - src/lib/quantum/index.ts
      - tests/quantum/grover.test.ts
    autonomous: true
    requirements: [ALG-04]
  - id: 04-02
    title: AmplitudeBars signed Grover iterator
    wave: 1
    depends_on: []
    files_modified:
      - src/components/AmplitudeBars.astro
      - tests/components/amplitude-bars.test.ts
    autonomous: true
    requirements: [ALG-04]
  - id: 04-03
    title: SearchComparison formula widget
    wave: 1
    depends_on: []
    files_modified:
      - src/components/SearchComparison.astro
      - tests/components/search-comparison.test.ts
    autonomous: true
    requirements: [USE-03]
  - id: 04-04
    title: /grover essay + mirrors + placeholder budget
    wave: 2
    depends_on: [04-01, 04-02, 04-03]
    files_modified:
      - src/pages/grover.astro
      - src/components/ConceptMap.astro
      - tests/essays/concept-map.test.ts
      - tests/essays/nav-graph.test.ts
      - tests/essays/sandbox-links.test.ts
      - src/pages/teleportation.astro
      - src/pages/superdense-coding.astro
      - src/pages/sitemap.xml.ts
      - src/pages/index.astro
      - bundle-budget.json
    autonomous: true
    requirements: [ALG-04, USE-03, OPS-04]
  - id: 04-05
    title: Bundle-ceiling recompute close-out
    wave: 3
    depends_on: [04-04]
    files_modified:
      - bundle-budget.json
    autonomous: true
    requirements: [OPS-04]
```

> Wave 1: `04-01`, `04-02`, and `04-03` in parallel. Wave 2: `04-04`
> after all Wave-1 outputs exist. Wave 3: `04-05` last, after a clean
> build of the integrated route supplies actual bundle bytes.
