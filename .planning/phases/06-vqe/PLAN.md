# Phase 6 Plan — VQE + Chemistry + v3 launch

**Phase goal:** Ship the final v3 phase. Land `/vqe` (variational/hybrid
algorithm essay: vanilla-TS optimizer + `EnergyLandscape` + `MoleculeGallery`),
the local-only PROG-01 concept-map visited indicator across all 10 v3 reading-path
essays, and the v3 launch close-out (LIGHTHOUSE-PLAN, BUNDLE-AUDIT including
the concept-map layout audit, V3-LAUNCH-ANNOUNCEMENT). After this phase,
v3.0 — Algorithms × Use Cases is feature-complete.

**Depends on:**

- Phase 5b (`/shor` essay complete; current chain tail is `/shor → /sandbox`).
- Phase 1 (`src/lib/quantum/qiskit.ts` `toQiskit()` contract, `bundle-budget.json`
  CI gate, `scripts/check-bundle-budget.mjs`, `CircuitView.astro` `Copy as Qiskit`
  bake-at-SSR pattern).
- All prior v3 phases (Phase 2 through Phase 5b) for the PROG-01 instrumentation
  surface — visited indicator instruments **every** essay in the v3 reading
  path (12 essays total: `/qubit, /superposition, /measurement, /gates,
  /entanglement, /cnot-bell, /deutsch, /teleportation, /superdense-coding,
  /grover, /shor, /vqe` — reconcile against the live
  `tests/essays/nav-graph.test.ts` CHAIN at 06-06 execution time).
- v1 patterns: `EssayLayout.astro`, `MathBlock.astro`, `MathNerds.astro`,
  `ProbabilityBars.astro` SSR-figure shell, in-repo `src/lib/sandbox/signal.ts`,
  `localStorage` patterns from `src/lib/theme.ts` and `src/lib/annotations.ts`.

**Source of truth:** `.planning/phases/06-vqe/PHASE-CONTEXT.md`
(45 locked decisions D-01..D-45). Do not re-decide; do not re-ask.

---

## Definition of Done (phase-level)

1. **VQE optimizer module exists.** `src/lib/quantum/vqe.ts` exports a pure
   finite-difference gradient-descent-with-momentum optimizer (`gradientDescent`),
   the deterministic 2-parameter H₂ surface (`h2Energy`), a surface-sampling
   helper (`sampleSurface` / `interpolateSurface`), and a fixed-seed reseed
   provider for the "Reseed" control (D-01..D-07). Tests cover convergence
   on a 1D parabola and on `h2Energy` to within `1e-3` of the documented true
   minimum (ALG-08). Helpers are re-exported via `src/lib/quantum/index.ts`.
2. **Molecule data exists.** `src/data/molecules.json` ships H₂, LiH, and HeH⁺
   (D-22..D-26). Each molecule carries: display name, equilibrium bond distance
   (Å), saved/converged ansatz parameters, energy in Hartree **and** eV (with
   the units consistent under the documented `27.211386245988 eV/Hₐ` conversion),
   ansatz operations as a JSON-serialisable `Op[][]` shape that round-trips
   through `validateCircuit()`, qubit count (`≤ MAX_QUBITS = 4`), and a
   `precomputed_note` field that flags the data as pedagogical/pre-baked.
   Schema/data tests assert all of the above plus Qiskit-export validity.
3. **EnergyLandscape widget exists.** `src/components/EnergyLandscape.astro`
   renders a SSR 50×50 heatmap of `h2Energy(θ₁, θ₂)` plus contour bands using
   a brand-aligned two-colour gradient (semantic CSS vars only — no new
   runtime dep). A colocated `<script>` (or `.client.ts` module) handles a
   draggable marker (pointer + keyboard nudge), bilinear interpolation between
   samples, an "Auto-descend" button that animates marker position along the
   optimizer trajectory from `vqe.ts`, and a "Reseed" control that cycles the
   deterministic seed set (D-10..D-17). `prefers-reduced-motion` collapses
   the animation to a final-state snap (D-16). Accessible text readouts
   (`θ₁`, `θ₂`, energy, distance-from-minimum) sit beside the visual.
4. **MoleculeGallery widget exists.** `src/components/MoleculeGallery.astro`
   consumes `src/data/molecules.json` at SSR and emits one card per molecule
   with: name + formula, equilibrium distance slider (frozen at equilibrium
   by default; non-destructive — labelled as "precomputed VQE result"),
   converged ansatz parameter readout, energy in both Hartree and eV, and
   a "Copy as Qiskit" button driven by `toQiskit()` over the data-derived
   `Circuit` (D-18..D-26). No live ab initio recomputation; honest copy.
5. **`/vqe` essay exists.** `src/pages/vqe.astro` is a complete two-half essay
   using `EssayLayout`. Algorithm half: hook → parameterised ansatz (static
   `CircuitView` for snapshot + Qiskit export, slim VQE-local readout for
   live theta during Auto-descend per D-18/D-19) → `EnergyLandscape` →
   hand-off. Use-case half: chemistry/materials/drug-discovery framing
   (sourced/caveated per D-27..D-30) → `MoleculeGallery` → reality check →
   Qiskit CTA → self-test → footer-nav (`prev /shor`, `next /sandbox`).
   `MathNerds` appendix covers the loss-surface gradient definition and
   the optimizer update rule.
6. **All same-commit mirrors updated.** With the `/vqe` route landing in
   Plan 06-05: `src/components/ConceptMap.astro` adds a `/vqe` primary node
   and a `shor → vqe` reading-path edge (flat layout per D-37); 
   `tests/essays/concept-map.test.ts` mirrors the node in `expected[]` and
   `expectedEssays[]`; `tests/essays/nav-graph.test.ts` `CHAIN[]` inserts
   `{slug:"vqe", prev:"/shor", next:"/sandbox"}` and rewires `shor.next`
   from `/sandbox` to `/vqe`; `tests/essays/sandbox-links.test.ts` `STARTERS`
   adds a ≤4-qubit VQE ansatz starter; `bundle-budget.json` adds a
   conservative initial `/vqe` ceiling; `src/pages/sitemap.xml.ts` ROUTES
   adds `/vqe` at priority `0.9`; `src/pages/shor.astro` footer-nav rewires
   from `/sandbox` to `/vqe`.
7. **PROG-01 visited indicator works.** `src/lib/progress.ts` reads/writes
   `localStorage["quantum/visited"]` as a JSON-encoded array of route paths,
   dedupes, and tolerates storage failures (D-31..D-35, ALG-09 / PROG-01).
   A scroll-depth observer in `src/layouts/EssayLayout.astro` flips the flag
   for the current path when `scrollY / (scrollHeight − innerHeight) ≥ 0.5`
   (one-shot per page). A small hydrator (`src/components/ConceptMapProgress.client.ts`
   or inline in `ConceptMap.astro`) brightens visited nodes in both the
   desktop SVG and the mobile list fallback using existing semantic tokens.
   Pair brightness with `aria-label` / visually-hidden text so the visited
   state is announced (D-34). No analytics, no beacon, no server (D-33).
8. **OPS audits authored.** Plan 06-07 produces
   `.planning/phases/06-vqe/LIGHTHOUSE-PLAN.md` (manual-run recipe matching
   v2's `_archive-v2/04-launch-polish/LIGHTHOUSE-PLAN.md` structure but
   covering **every v3 route** — both `/qubit..` foundations and v3
   algorithm essays — in both themes; route count derived at execution
   time from the final post-`/vqe` build, D-42, D-44),
   `.planning/phases/06-vqe/BUNDLE-AUDIT.md` (final bundle delta vs the v2
   baseline + per-route deltas/ceilings, plus the concept-map layout audit
   subsection per D-43, OPS-04), and either a referenced sibling artefact
   or an embedded subsection capturing the **concept-map layout audit**
   verdict (flat-vs-grouped decision per D-37..D-39, OPS-03).
9. **V3 launch announcement drafted.** Plan 06-08 produces
   `.planning/phases/06-vqe/V3-LAUNCH-ANNOUNCEMENT.md` matching the tone /
   structure of `.planning/phases/_archive-v2/04-launch-polish/LAUNCH-ANNOUNCEMENT.md`
   but scoped to the v3 narrative: 5 algorithm × use-case essays + Qiskit
   bridge + local-only progress indicator + the no-analytics / no-backend
   re-ratification (D-30, D-33, D-40, OPS-02).
10. **Bundle ceilings recomputed.** After all code lands, Plan 06-08 runs
    a clean build and recomputes every changed route's ceiling using the
    project convention `round_up(actual_gzip_bytes × 1.2, 1024)` (OPS-04,
    D-43). `bundle-budget.json` is updated in the same commit as the
    recompute.
11. **No new runtime dependencies.** `package.json` and `package-lock.json`
    remain untouched across all eight plans. No charting library, no graph
    library, no 3D library, no analytics SDK, no backend. Vanilla TS +
    Astro + existing `signal<T>` only.
12. **Build, tests, and bundle gate all green.** At phase close: `npm test`
    passes (548 baseline + new VQE/molecule/landscape/gallery/progress
    suites); `npm run build` emits the new `/vqe` page cleanly
    (23 → 24 routes); `npm run check:bundle` passes for every route
    including `/vqe`.

---

## Pre-flight findings

These are concrete codebase facts the planner verified by spot-reading the
files referenced in `<canonical_refs>` / `<code_context>`. Tasks below
reference them directly.

- **`MAX_QUBITS = 4` is hard-locked in two places** —
  `src/lib/quantum/circuit.ts` and `src/lib/quantum/simulator.ts`. Both
  Phase 4 (Grover) and Phase 5b (N=15 Shor) ship tests asserting the
  constant is unchanged. VQE plans MUST NOT touch either constant.
  The 2-parameter ansatz used in the essay fits trivially under the cap
  (2 qubits, 3 ops: `Ry(θ₁) ⊗ Ry(θ₂) → CNOT(0,1)`).
- **`Simulator.applyRotation(axis, qubit, theta)`** (in `simulator.ts`)
  already supports `Rx | Ry | Rz` per `gates.ts:ROTATIONS`. Sandbox
  `Op` `{kind:"rot", axis:"X"|"Y"|"Z", qubit, theta}` round-trips through
  `runCircuit`. The VQE ansatz is constructible from existing `rotOp(...)`
  + `cnotOp(...)` — no new simulator gate, no codec extension, no Qiskit
  export extension.
- **`toQiskit(circuit)`** (in `src/lib/quantum/qiskit.ts`) emits
  `qc.ry(<theta>, <qubit>)` and `qc.rz(<theta>, <qubit>)` with full f64
  precision via `theta.toPrecision(17)`. Each `MoleculeGallery` card's
  "Copy as Qiskit" can use the existing exporter unchanged by handing it
  a small `Circuit` built from the molecule's saved ansatz ops + converged
  θ values. No `toQiskitVQE()` parallel exporter required.
- **`CircuitView.astro` is SSR-static.** It calls `encodeCircuit(circuit)`
  and `toQiskit(circuit)` at build time and bakes them into `data-*`
  attributes — there is no hook to update theta after render. Per D-19:
  use `CircuitView` for the static export snapshot at the top of the
  ansatz section, and ship a **VQE-specific live readout** (small inline
  SVG / text block colocated with `EnergyLandscape`) for the animated
  Auto-descend theta display. Do NOT modify `CircuitView` globally.
- **`src/lib/sandbox/signal.ts`** is the 40-LOC reactive primitive
  (`signal<T>` + `compute(deps, fn)`) reused by every sandbox/widget that
  needs cross-script reactivity. `EnergyLandscape` and the visited-indicator
  hydrator should use it instead of inventing a new pattern.
- **`localStorage` is well-trodden** — `src/lib/theme.ts`,
  `src/lib/themeBootstrap.ts`, `src/lib/annotations.ts`,
  `src/lib/feedback.ts`, and `src/lib/sandbox/persistence.ts` all wrap
  reads/writes in try/catch and degrade gracefully when storage is
  unavailable (Safari private browsing). `src/lib/progress.ts` follows
  the same pattern; never throws.
- **`prefers-reduced-motion` is well-trodden too** —
  `window.matchMedia("(prefers-reduced-motion: reduce)").matches` is the
  established check (used by `AmplitudeBars`, `MiniBloch`, `ProbabilityBars`,
  `QFTVisualizer`, `SearchComparison`, `Sphere3D`, `scrolly.ts`). The
  Auto-descend animation MUST use this pattern.
- **`bundle-budget.json` currently has 23 route entries** (see file). Adding
  `/vqe` lifts the count to 24. The same-commit mirror rule means the
  `bundle-budget.json` `/vqe` entry, `sitemap.xml.ts` `/vqe` ROUTE entry,
  `tests/essays/nav-graph.test.ts` `CHAIN[]` insertion, and
  `tests/essays/concept-map.test.ts` `expected[]` / `expectedEssays[]`
  insertion all land together (Plan 06-05). Mirror discipline is a
  hard-fail at CI.
- **`tests/essays/nav-graph.test.ts` `CHAIN[]` tail is currently**
  `{slug:"shor", prev:"/grover", next:"/sandbox"}`. Plan 06-05 rewires
  `shor.next` → `/vqe` and appends `{slug:"vqe", prev:"/shor", next:"/sandbox"}`.
  `tests/essays/concept-map.test.ts` `expected[]` and `expectedEssays[]`
  similarly append `/vqe`.
- **`src/pages/shor.astro` footer-nav currently points to `/sandbox`** (per
  its own header comment "Footer-nav unchanged: prev /grover, next /sandbox").
  Plan 06-05 updates it to `/vqe` in the same commit `/vqe` lands —
  otherwise `tests/essays/nav-graph.test.ts` fails on `shor.next`.
- **`src/pages/index.astro`** imports `ConceptMap` but does NOT carry a
  separate route list — the homepage status section is a hand-edited prose
  block. No homepage-route-list mirror to update.
- **`src/pages/sitemap.xml.ts`** has a `ROUTES: SitemapEntry[]` literal
  that IS a source-of-truth mirror; `/vqe` MUST be appended at priority
  `0.9` alongside the other essay routes in the same commit.
- **`src/data/` does not yet exist.** Plan 06-02 creates the directory
  and adds `molecules.json` as its first inhabitant. JSON imports work
  natively in Astro/Vite via `import molecules from "../data/molecules.json"`.
- **The flat concept-map decision (D-37) is contingent.** The
  layout-audit happens **after** all 10 essay nodes are visible in
  Plan 06-07. If the audit decides grouping is warranted (D-39),
  Plan 06-07 records the decision and Plan 06-08 picks up the regrouping
  as part of the final commit; the planner does NOT pre-emptively group.

---

## Plans

> **Wave 1 (pure-TS foundations, run in parallel):** `06-01`
> (`vqe.ts` optimizer + H₂ surface + tests) and `06-02`
> (`molecules.json` schema + 3 molecules + tests). Different files,
> disjoint surfaces — safe to parallelise across sub-agent contexts.
>
> **Wave 2 (UI primitives, run in parallel after Wave 1):** `06-03`
> (`EnergyLandscape.astro`, depends on `06-01`) and `06-04`
> (`MoleculeGallery.astro`, depends on `06-02`). Both produce new
> components in their own files; no cross-file conflict.
>
> **Wave 3 (essay integration):** `06-05` (`/vqe` essay + all six
> mirrors + initial bundle entry). Single integration plan; depends
> on `06-03` + `06-04`. Same-commit mirror discipline is enforced
> by CI here.
>
> **Wave 4 (PROG-01 progress indicator):** `06-06` (`src/lib/progress.ts`
> + `EssayLayout` scroll-depth observer + ConceptMap visited hydrator +
> tests). Depends on `06-05` because the v3 reading path must be
> finalised before scroll instrumentation can reference the canonical
> 12-essay set.
>
> **Wave 5 (OPS audits):** `06-07` (`LIGHTHOUSE-PLAN.md` + `BUNDLE-AUDIT.md`
> + concept-map layout audit). Depends on `06-06` because the final
> bundle ceilings must reflect the progress-indicator JS delta and the
> layout audit must view the post-progress concept map.
>
> **Wave 6 (launch + close-out):** `06-08` (`V3-LAUNCH-ANNOUNCEMENT.md` +
> final verification pass + final `round_up(actual × 1.2, 1024)` ceiling
> recompute). Depends on `06-07`; cites its numbers.
>
> Six waves rather than four. Honest dependency-graph reflects the
> "ship → audit → recompute → announce" close-out chain the user locked
> in PHASE-CONTEXT.md `<specifics>` ("OPS docs are deliverables, not
> optional notes"). Compressing this into fewer waves buries OPS work
> the user explicitly warned against burying.

---

### 06-01 — VQE optimizer + H₂ surface + tests

**Why:** Every later VQE plan (EnergyLandscape, MoleculeGallery, the
essay's Auto-descend animation) consumes optimizer snapshots and the
documented H₂ energy surface. Locking the math + tests first means the
UI plans never have to re-derive convergence behaviour. Satisfies the
math half of ALG-08 (vanilla-TS optimizer + 1D parabola + H₂ surface
within `1e-3`) and locks D-01..D-07.

**Deliverables:**

- `src/lib/quantum/vqe.ts` (new), pure TypeScript, ~50–120 LOC. Exports:
  ```ts
  export interface OptimizerStep {
    iteration: number;
    params: readonly number[];   // current θ vector
    energy: number;              // f(params)
    gradient: readonly number[]; // finite-difference estimate at this step
    stepSize: number;            // effective step taken into this iteration
    converged: boolean;
  }
  export interface GradientDescentOpts {
    f: (params: readonly number[]) => number;
    initial: readonly number[];
    learningRate?: number;       // fixed default; D-02
    momentum?: number;           // default ~0.85; D-03
    maxSteps?: number;           // default e.g. 200
    tolerance?: number;          // default 1e-4 on energy delta
    epsilon?: number;            // finite-difference step (default e.g. 1e-4)
    adaptiveGuardFactor?: number;// D-02 small adaptive guard, e.g. 0.5
  }
  export function gradientDescent(opts: GradientDescentOpts): OptimizerStep[];
  export function h2Energy(theta1: number, theta2: number): number;
  export const H2_TRUE_MINIMUM: { theta1: number; theta2: number; energy: number };
  export function sampleSurface(
    f: (t1: number, t2: number) => number,
    grid: number,         // 50 per D-13
    range?: [number, number], // default [0, 2π]
  ): { values: Float64Array; grid: number; range: [number, number]; min: number; max: number };
  export function interpolateSurface(
    sampled: ReturnType<typeof sampleSurface>,
    theta1: number,
    theta2: number,
  ): number;
  export const RESEED_SEEDS: ReadonlyArray<readonly [number, number]>; // D-04, D-05
  export const DEFAULT_INITIAL_THETAS: readonly [number, number]; // = RESEED_SEEDS[0]
  ```
- Optimizer behaviour (D-01..D-06):
  - Central finite-difference gradient: `(f(θ + ε e_i) − f(θ − ε e_i)) / (2ε)`.
  - Velocity update: `v_{k+1} = momentum · v_k − learningRate · ∇f(θ_k)`.
  - Adaptive guard: if `f(θ_{k+1}) > f(θ_k)`, halve the effective step
    (or scale velocity by `adaptiveGuardFactor`) and retry once — not
    full Armijo backtracking (D-02 explicit).
  - Convergence: stop early when `|f(θ_{k+1}) − f(θ_k)| < tolerance` for
    two consecutive steps OR when `iteration === maxSteps`. `converged`
    flag on the final step records which path triggered.
  - `RESEED_SEEDS` is a deterministic short list (e.g. 4–6 fixed
    `[θ₁, θ₂]` pairs) cycled by `EnergyLandscape`'s Reseed button.
    `DEFAULT_INITIAL_THETAS = RESEED_SEEDS[0]` is the canonical
    fixed-seed start (D-04).
- `h2Energy` is the documented analytic/toy-but-honest 2-parameter H₂
  surface (D-07, ALG-08). Pick a published minimal-basis VQE H₂
  reference or a simple analytic surface
  (e.g. `E(θ₁, θ₂) = c0 + c1·cos(θ₁) + c2·cos(θ₂) + c3·sin(θ₁)·sin(θ₂)`
  with coefficients chosen so the documented `H2_TRUE_MINIMUM.energy ≈
  −1.137 Hartree` matches the H₂ MoleculeGallery row at equilibrium).
  Whatever formula ships MUST come with a top-of-file source/citation
  comment naming the reference (D-07).
- Re-export every public name through `src/lib/quantum/index.ts` so the
  barrel stays canonical.
- `tests/quantum/vqe.test.ts` (new) — at minimum these suites:
  1. **`gradientDescent` on a 1D parabola.** `f(x) = (x − 3)² + 1`
     converges to `x ≈ 3, f ≈ 1` from initial `x = 0` within
     `1e-4` energy tolerance and ≤ 100 iterations. Asserts the final
     `OptimizerStep` is monotonically non-increasing in energy after
     the adaptive-guard retries are applied.
  2. **`gradientDescent` on `h2Energy` from each `RESEED_SEEDS`
     start.** Final energy is within `1e-3` of
     `H2_TRUE_MINIMUM.energy` for every seed (ALG-08 hard requirement).
  3. **Determinism.** Two `gradientDescent` runs with identical opts
     produce byte-identical `OptimizerStep[]` arrays (no `Math.random`,
     no `Date.now()`).
  4. **Adaptive guard fires.** A constructed surface where the first
     full-rate step overshoots produces an `OptimizerStep` whose
     `stepSize` is half the requested `learningRate`.
  5. **`sampleSurface(h2Energy, 50, [0, 2*Math.PI])`.** Resulting grid
     has 2500 finite numbers; `min ≤ H2_TRUE_MINIMUM.energy + 1e-3`;
     `max > min`; `Math.abs(min − H2_TRUE_MINIMUM.energy) < tolerance
     of the discretisation step` (documented).
  6. **`interpolateSurface` bilinear correctness.** At sample corners,
     returns the exact sampled value (within `1e-12`); at the midpoint
     of a cell, returns the mean of the four corners.
  7. **`RESEED_SEEDS` discipline.** Length ≥ 4, every entry is two
     finite numbers, no two entries are exactly equal, none equals
     `DEFAULT_INITIAL_THETAS` except the first.

**Mirrors / files modified:**
- `src/lib/quantum/vqe.ts` (new)
- `src/lib/quantum/index.ts` (barrel re-export of every public name above)
- `tests/quantum/vqe.test.ts` (new)

**Out of scope:**
- SPSA, Nelder-Mead, full Armijo backtracking (deferred per PHASE-CONTEXT
  `<deferred>`).
- Any Astro component or DOM code — this is a pure-TS plan.
- Any change to `simulator.ts`, `circuit.ts`, `qiskit.ts`, or
  `codec.ts`. `MAX_QUBITS` is untouched.
- A "Reseed" UI control — only the `RESEED_SEEDS` data lives here;
  UI lives in `06-03`.

**Commit hint:** `feat(06-vqe/06-01): vqe.ts optimizer + h2Energy + tests`

---

### 06-02 — `src/data/molecules.json` + schema/data tests

**Why:** MoleculeGallery (06-04) needs a deterministic, testable, JSON
data file. Splitting data from view means schema invariants and Qiskit
export validity can be locked in pure tests before any Astro component
exists. Locks D-22..D-26 (3 molecules, Hartree + eV both stored, ansatz
ops as serialisable data, pre-baked labelling).

**Deliverables:**

- `src/data/molecules.json` (new) — root object with three keys:
  `h2`, `lih`, `hehplus`. Per-molecule schema:
  ```json
  {
    "id": "h2",
    "name": "H₂",
    "formula": "H₂",
    "description": "dihydrogen — the canonical VQE benchmark.",
    "equilibrium_distance_angstrom": 0.74,
    "qubits": 2,
    "ansatz_params": { "theta1": 1.234, "theta2": 0.567 },
    "ansatz_ops": [
      [{ "kind": "rot", "axis": "Y", "qubit": 0, "theta": 1.234 }],
      [{ "kind": "rot", "axis": "Y", "qubit": 1, "theta": 0.567 }],
      [{ "kind": "cnot", "control": 0, "target": 1 }]
    ],
    "energy_hartree": -1.137,
    "energy_ev": -30.9398,
    "precomputed_note": "Precomputed VQE result at equilibrium bond distance. The distance slider is illustrative — energies are not re-computed live.",
    "source": "<reference / textbook citation>"
  }
  ```
  - `ansatz_ops` is JSON-typed but its shape matches the `Op[][]` union
    from `src/lib/quantum/circuit.ts` exactly — `validateCircuit({qubits, steps})`
    accepts it without coercion.
  - Each molecule's `qubits` is ≤ `MAX_QUBITS = 4` (D-21).
  - All numeric fields are finite, non-NaN.
  - `energy_ev ≈ energy_hartree × 27.211386245988` to ≤ `1e-3 eV`
    absolute tolerance.
  - `ansatz_params.theta1/theta2` match the `θ` values inside
    `ansatz_ops` (single source of truth via test).
  - `source` is a non-empty string (text-only citation, not a link).
- A tiny TypeScript shim, `src/data/molecules.ts` (new), that
  `import`s the JSON and re-exports a typed view:
  ```ts
  import data from "./molecules.json";
  export interface Molecule { /* mirrors schema above */ }
  export const MOLECULES: Record<"h2" | "lih" | "hehplus", Molecule>;
  export const MOLECULE_IDS: ReadonlyArray<keyof typeof MOLECULES>;
  export const HARTREE_TO_EV: 27.211386245988;
  ```
  Keeps the gallery component import surface clean and gives tests a
  typed handle.
- `tests/data/molecules.test.ts` (new) — assertions:
  1. **All three molecules present.** `MOLECULE_IDS.length === 3` and
     contains `h2`, `lih`, `hehplus`.
  2. **Schema completeness.** For each molecule, every required field
     exists, all numeric fields are `Number.isFinite`, `qubits ≤ 4`,
     `equilibrium_distance_angstrom > 0`.
  3. **Unit consistency.** For each molecule:
     `Math.abs(m.energy_ev − m.energy_hartree × HARTREE_TO_EV) < 1e-3`.
  4. **Ansatz round-trips through `validateCircuit`.** For each molecule,
     `validateCircuit({qubits: m.qubits, steps: m.ansatz_ops as Op[][]})`
     does not throw.
  5. **Qiskit export is non-empty and contains the expected method calls.**
     For each molecule, `toQiskit({qubits: m.qubits, steps: m.ansatz_ops})`
     returns a string containing `QuantumCircuit(${m.qubits}` and at
     least one `qc.ry(` call.
  6. **`ansatz_params` matches `ansatz_ops`.** The first `theta` value
     for qubit 0's `rot` op equals `m.ansatz_params.theta1`; same for
     qubit 1's first `rot` op and `theta2`.
  7. **H₂ minimum sanity vs `vqe.ts`.** `MOLECULES.h2.energy_hartree`
     is within `5e-2` Hartree of `H2_TRUE_MINIMUM.energy` (loose tolerance
     because the molecule row may use a slightly different reference
     than the surface formula — flagged explicitly in the test message).

**Mirrors / files modified:**
- `src/data/molecules.json` (new — first inhabitant of `src/data/`)
- `src/data/molecules.ts` (new, tiny typed re-export shim)
- `tests/data/molecules.test.ts` (new)

**Out of scope:**
- The `MoleculeGallery.astro` component (06-04).
- Recomputing ansatz parameters from `gradientDescent` — these are
  pre-baked teaching values (D-25). Any future "compute live" capability
  is explicitly deferred.
- Adding a fourth molecule to simplify scope (D-22 locks all three).

**Commit hint:** `feat(06-vqe/06-02): molecules.json (H2, LiH, HeH+) + schema tests`

---

### 06-03 — `EnergyLandscape.astro` SSR heatmap + drag/keyboard/Auto-descend

**Why:** ALG-09 use-case-half widget for the algorithm half of the
essay: a 2D heatmap of `h2Energy(θ₁, θ₂)` the reader drags around to
find the basin, with an Auto-descend button that animates the same
optimizer trajectory `tests/quantum/vqe.test.ts` validates. Locks
D-10..D-17.

**Deliverables:**

- `src/components/EnergyLandscape.astro` (new). SSR frontmatter:
  - Imports `h2Energy`, `sampleSurface`, `RESEED_SEEDS`,
    `DEFAULT_INITIAL_THETAS`, `H2_TRUE_MINIMUM`, and the
    `OptimizerStep` type from `src/lib/quantum`.
  - Calls `sampleSurface(h2Energy, 50, [0, 2*Math.PI])` at build time
    (D-13). Inlines the resulting `Float64Array` as a `<script
    type="application/json" data-role="surface">` blob alongside
    derived `min`, `max`, and the contour levels (`e.g. 8 evenly
    spaced bands between min and max`).
  - Inlines `RESEED_SEEDS`, `DEFAULT_INITIAL_THETAS`,
    `H2_TRUE_MINIMUM` via `data-*` attributes / a second JSON blob.
- Render contract — single `<figure data-widget="energy-landscape">`:
  - Inline SVG (`viewBox="0 0 500 500"` or similar). Heatmap = 50×50
    `<rect>` cells with `style="fill: rgb(...)"` interpolated through a
    brand-aligned two-colour gradient (D-14: low → `--color-accent`,
    high → `--color-warning` or `--color-ink-subtle` — verify a11y
    contrast in both themes as part of the component's manual-sanity
    note). Avoid relying on hue alone — pair the visual with the
    text readouts below (D-15).
  - SVG `<path>` overlay drawing the contour bands using
    marching-squares (or simpler: per-cell threshold lines). Lines use
    a semantic colour token (e.g. `--color-line-strong`) so they read
    in both themes.
  - Draggable marker rendered as `<circle data-role="marker">` whose
    centre is bound to the current `(θ₁, θ₂)` via the hydrator. Marker
    has visible focus ring (`focus-visible:outline outline-2
    outline-offset-2 outline-accent`) and `role="slider"` with
    `aria-orientation="other"`, `aria-valuemin`/`aria-valuemax` on the
    canonical `[0, 2π]` range.
  - Toolbar row beneath the SVG: `<button data-action="auto-descend">
    Auto-descend</button>`, `<button data-action="reseed">Reseed</button>`,
    and a `aria-live="polite"` readout `<p data-role="readout">θ₁ = …,
    θ₂ = …, energy = … Hₐ, Δmin = …</p>`.
- Hydrator behaviour (inline `<script>` block, ~80–120 LOC; may
  optionally use `signal<T>` from `src/lib/sandbox/signal.ts` for
  marker/energy reactivity):
  - On mount, parse the surface blob, the seed list, and the true
    minimum; initialise `(θ₁, θ₂) = DEFAULT_INITIAL_THETAS`.
  - **Pointer drag:** pointerdown on the marker (or anywhere in the
    SVG plot region) captures pointer events; pointermove updates
    `(θ₁, θ₂)` from the pointer position; `interpolateSurface` (or an
    inline equivalent) computes the energy at the dragged point;
    readout updates.
  - **Keyboard nudge (D-16):** when the marker has focus, ArrowLeft /
    ArrowRight / ArrowUp / ArrowDown nudge `θ₁` / `θ₂` by a small
    documented step (e.g. `2π/100`); Home jumps to the documented
    minimum.
  - **Auto-descend (D-11):** click triggers an inline `gradientDescent`
    over `h2Energy` from the current `(θ₁, θ₂)` (or re-imports the
    helper via a tiny client-side helper module if bundle budget
    allows — executor's call). The button is `aria-busy="true"` during
    animation. Marker steps along the trajectory at a documented
    frame rate (e.g. 60 ms per step). When `prefers-reduced-motion`
    matches, the marker snaps directly to the final
    `OptimizerStep.params` and the readout shows the converged state
    without intermediate frames.
  - **Reseed (D-05):** click cycles `RESEED_SEEDS` (modulo length),
    snaps marker + readout.
  - Readout text uses Unicode `θ₁ θ₂ Δ` and Hartree units; updates on
    every change via `aria-live="polite"`.
- A11y guarantees: visible focus ring on marker and both buttons;
  every interactive control reachable via keyboard; reduced-motion
  honoured; readout announces the state in plain English including
  "distance from minimum" so the visual is not the only signal (D-15).
- No new runtime dependency. The hydrator is plain TS.

**Tests:** `tests/components/energy-landscape.test.ts` (new) — structural
text-based component test (matching the existing `tests/components/*.test.ts`
pattern: read the source file, assert on its shape):
1. Source contains `data-widget="energy-landscape"` and
   `data-role="marker"`.
2. Source imports `h2Energy`, `sampleSurface`, `RESEED_SEEDS`,
   `DEFAULT_INITIAL_THETAS` from `../lib/quantum` (or the barrel).
3. Source references `prefers-reduced-motion` (via
   `window.matchMedia(...)`) — proves D-16 is wired.
4. Source contains both `data-action="auto-descend"` and
   `data-action="reseed"` buttons.
5. Source contains `aria-live="polite"` on the readout.
6. Source references the `interpolateSurface` helper OR an inline
   bilinear interpolation comment — proves drag updates energy.
7. Source does NOT import `MAX_QUBITS` or any sandbox `codec` /
   `qiskit` module — landscape is data-only, not circuit-shaped.

**Mirrors / files modified:**
- `src/components/EnergyLandscape.astro` (new)
- `tests/components/energy-landscape.test.ts` (new)

**Out of scope:**
- 3D mesh rendering (deferred per PHASE-CONTEXT `<deferred>` + D-12).
- A "settings panel" exposing the optimizer's `learningRate`/`momentum`
  — D-03 explicitly bars an optimizer-settings UI in v3.
- Anything molecule-specific (Goes in `06-04`).
- Mutating `CircuitView` to animate theta (D-19; the live theta readout
  beside the ansatz `CircuitView` is implemented in `06-05`'s essay
  page, NOT here).

**Commit hint:** `feat(06-vqe/06-03): EnergyLandscape SSR heatmap + drag/keyboard/Auto-descend`

---

### 06-04 — `MoleculeGallery.astro` + per-card Qiskit export

**Why:** USE-05 use-case-half widget. Pre-baked molecule cards give
the reader "recipe-card" intuition (H₂, LiH, HeH⁺) without implying
live ab initio chemistry. Each card's Qiskit export uses the existing
`toQiskit()` exporter unchanged because every molecule's ansatz fits
under `MAX_QUBITS = 4`. Locks D-18..D-26.

**Deliverables:**

- `src/components/MoleculeGallery.astro` (new). SSR frontmatter:
  - Imports `MOLECULES`, `MOLECULE_IDS`, `HARTREE_TO_EV` from
    `../data/molecules`.
  - Imports `toQiskit`, `validateCircuit`, and the `Circuit` / `Op` types
    from `../lib/quantum`.
  - For each molecule id in `MOLECULE_IDS`, builds a
    `Circuit = { qubits: m.qubits, steps: m.ansatz_ops as Op[][] }`,
    calls `validateCircuit(circuit)` (throws on data-validation
    failure → build fails loudly), and stores the resulting
    `qiskitText = toQiskit(circuit, { headerComment: \`Ansatz for \${m.formula} at equilibrium\` })`
    as a `data-qiskit` attribute on the per-card Copy button.
- Render contract — single `<figure data-widget="molecule-gallery">`
  containing a `<ul role="list" class="grid grid-cols-1 sm:grid-cols-3 gap-4">`
  with one `<li data-role="card" data-molecule-id={m.id}>` per molecule.
  Each card contains:
  - `<h3>` with molecule name + formula.
  - Distance row: `<label>Bond distance</label><input type="range" disabled
    value={m.equilibrium_distance_angstrom} min={…} max={…} step="0.01" />`
    + visible numeric readout `<span>{m.equilibrium_distance_angstrom} Å
    (equilibrium)</span>`. **The slider is `disabled` (or non-destructive
    label like "precomputed equilibrium")** so we don't imply live
    recomputation (D-25). Executor may choose `disabled` vs. a small
    on-input toast — both are acceptable as long as the data does
    not change.
  - Ansatz parameter readout: `θ₁ = {…}, θ₂ = {…}` in monospace.
  - Energy readout: `<dl><dt>Energy</dt><dd>{m.energy_hartree.toFixed(4)} Hₐ ({m.energy_ev.toFixed(2)} eV)</dd></dl>`.
  - Static `<CircuitView circuit={circuit} caption={…} showRemixLink={false} />`
    embed — gives the reader the ansatz diagram + the standard
    "Copy as Qiskit" button via `CircuitView`'s existing baked
    `data-qiskit`. `showRemixLink={false}` because remix-in-sandbox
    is not the right CTA for the chemistry use-case (the reader runs
    the snippet on real Qiskit, not in the in-browser sandbox).
  - Precomputed-note: `<p class="text-xs text-ink-subtle">{m.precomputed_note}</p>`
    + source citation in smaller text.
- No molecule-specific hydrator. `CircuitView`'s existing `copy-qiskit`
  event delegation handles the Copy button click.
- Semantic theme classes throughout; cards inherit the same
  `border-line bg-surface-elevated/40` aesthetic as other v3 widgets.

**Tests:** `tests/components/molecule-gallery.test.ts` (new):
1. Source contains `data-widget="molecule-gallery"` and three
   `data-molecule-id="h2"` / `"lih"` / `"hehplus"` references.
2. Source imports `MOLECULES` from `../data/molecules`.
3. Source uses `<CircuitView` with `showRemixLink={false}`
   (asserts the remix link is intentionally suppressed for
   chemistry cards).
4. Source does NOT contain `Math.random` or any non-deterministic
   construct — data is pre-baked.
5. (Logic-only) `validateCircuit({qubits: m.qubits, steps: m.ansatz_ops})`
   does not throw for any molecule (already covered in 06-02, but
   re-asserted here to lock that the gallery's build will not fail).
6. (Logic-only) For each molecule, `toQiskit(circuit)` contains the
   exact converged `θ` numeric values to at least 4 significant digits
   — proves data flows end-to-end.

**Mirrors / files modified:**
- `src/components/MoleculeGallery.astro` (new)
- `tests/components/molecule-gallery.test.ts` (new)

**Out of scope:**
- The bond-distance slider re-running an energy estimate (D-25 — no
  live ab initio). Slider is non-destructive UI only.
- 4th molecule, custom-molecule entry form, or anything that grows
  the data set (D-22 locks all three; future molecules are v4+).
- Per-card "Run on real hardware" deep-linking — the Qiskit CTA is
  the only bridge.

**Commit hint:** `feat(06-vqe/06-04): MoleculeGallery (H2, LiH, HeH+) + Qiskit export`

---

### 06-05 — `/vqe` essay + all six same-commit mirrors

**Why:** This is the integration plan. It composes the algorithm half
(parameterised ansatz `CircuitView` + slim live-theta readout +
`EnergyLandscape`) and use-case half (`MoleculeGallery` + framing
prose) into the final essay, and lands every same-commit mirror in
one commit. Locks D-18, D-19, D-27..D-30, D-43, D-44, D-45 and the
ALG-08/ALG-09/USE-05 essay surfaces.

**Deliverables:**

- `src/pages/vqe.astro` (new), using `EssayLayout` and matching the
  v3 two-half essay rhythm established by `/teleportation`,
  `/superdense-coding`, `/grover`, `/shor`:
  - **Header copy** — title "VQE — the variational hybrid loop", subtitle
    framing variational/hybrid as "the credible near-term direction"
    (D-27, D-30 — no "VQE will discover drugs now"-style claims).
  - **Algorithm half:**
    1. Hook — "the quantum computer tries a wavefunction; the classical
       computer turns the knobs" (PHASE-CONTEXT `<specifics>`).
    2. Static ansatz `CircuitView` of the 2-parameter
       `Ry(θ₁) ⊗ Ry(θ₂) → CNOT` circuit, with the existing baked
       "Copy as Qiskit" button (D-18; no `CircuitView` mutation).
       Build the `Circuit` literal at frontmatter time using
       `rotOp("Y", 0, theta1Seed) … cnotOp(0,1)`. Use the same
       `DEFAULT_INITIAL_THETAS` from `06-01` so the static snapshot
       matches the landscape's default marker.
    3. **Slim VQE live-theta readout** — inline `<p>` /
       `<table data-role="ansatz-readout">` colocated with
       `EnergyLandscape` that mirrors the current `(θ₁, θ₂)` as the
       reader drags / Auto-descends (D-19). This is the
       "VQE-specific readout, not a global `CircuitView` change". It
       reads from the same surface/marker state machine the landscape
       owns (executor may either share via `signal` or via a
       `CustomEvent` dispatched by `EnergyLandscape` — either is
       acceptable as long as no global mutation of `CircuitView`
       is introduced).
    4. `<EnergyLandscape />` embed with caption.
    5. Hand-off paragraph: "energy minimization is the conceptual
       bridge" (D-29).
  - **Use-case half:**
    1. Near-term industrial framing prose (D-27, D-30): chemistry /
       materials / drug-discovery context with explicit reality
       check — "small benchmark molecules", "active research",
       "classical baselines like HF / CCSD remain hard competition".
       Every quantitative or roadmap claim links to a source
       (textbook citation, vendor roadmap, or arXiv paper).
    2. `<MoleculeGallery />` embed.
    3. Reality check / "what this is NOT" paragraph that names
       what VQE on near-term hardware can and cannot do today.
    4. Qiskit CTA paragraph: "you've built the loop in the
       browser; the gallery's Copy buttons let you go run a real
       ansatz in Qiskit."
  - **Self-test** (one or two short questions matching v1 essay
    convention) + **`MathNerds` appendix** covering: definition of the
    expectation-value energy functional `E(θ) = ⟨ψ(θ)|H|ψ(θ)⟩`,
    central finite-difference gradient formula, and the GD-with-momentum
    update rule. Use `<MathBlock tex="…" />`.
  - **Footer-nav:** `prev /shor`, `next /sandbox`.
- **Same-commit mirrors** (D-45 — every line below ships in the
  same commit as `src/pages/vqe.astro`):
  - `src/components/ConceptMap.astro`:
    - Add `{ href: "/vqe", label: "VQE", cx: …, cy: …, tier: "primary" }`
      to `nodes[]` (executor picks placement on a new row beneath
      `/shor` or beside it — flat layout, D-37).
    - Add a reading-path edge from the `/shor` node index to the new
      `/vqe` node index in `edges[]`.
    - Update the SVG `aria-label` to "12 essays" (or whatever the
      live count becomes after `/vqe` lands) and the homepage prose
      counts accordingly.
  - `tests/essays/concept-map.test.ts`:
    - Append `{ href: "/vqe", label: "VQE", tier: "primary" }` to
      `expected[]`.
    - Append `"/vqe"` to `expectedEssays[]`.
  - `tests/essays/nav-graph.test.ts`:
    - In `CHAIN[]`, rewrite the `shor` row's `next` from `/sandbox`
      to `/vqe` AND append
      `{ slug: "vqe", prev: "/shor", next: "/sandbox" }`.
  - `tests/essays/sandbox-links.test.ts`:
    - Append to `STARTERS`: a tiny ≤4-qubit VQE-ansatz starter
      keyed `"vqe"`. Recommended starter:
      ```ts
      vqe: {
        qubits: 2,
        steps: [
          [rotOp("Y", 0, DEFAULT_INITIAL_THETAS[0])],
          [rotOp("Y", 1, DEFAULT_INITIAL_THETAS[1])],
          [cnotOp(0, 1)],
        ],
      },
      ```
      Imports `DEFAULT_INITIAL_THETAS` from `src/lib/quantum` so the
      starter shares the seed with the essay and the landscape.
  - `bundle-budget.json`:
    - Add `"vqe": 4096` (conservative placeholder; final recompute
      in `06-08`). Document the placeholder rationale in the commit
      body.
  - `src/pages/sitemap.xml.ts`:
    - Add `{ path: "/vqe", priority: 0.9 }` to `ROUTES`, slotted
      after `/shor`.
  - `src/pages/shor.astro`:
    - Rewire the footer-nav `next` link from `href="/sandbox"` to
      `href="/vqe"` and update the visible label text accordingly.
    - Update the file's header comment block where it says
      "Footer-nav unchanged: prev /grover, next /sandbox" to match.
- The essay does NOT add a 4th OPS document (`OPS-04`'s `/vqe`
  ceiling recompute lives in `06-08`, not here).

**Tests:** All existing mirror tests must remain green after the
edits above; the essay file is exercised end-to-end by
`tests/essays/nav-graph.test.ts` (`/vqe` must exist),
`tests/essays/concept-map.test.ts` (presence of `/vqe` node), and
`tests/essays/sandbox-links.test.ts` (starter round-trips through
codec). Additionally:

- `tests/essays/vqe.test.ts` (new, optional structural check matching
  the lightweight `tests/essays/*.test.ts` pattern). At least:
  1. `src/pages/vqe.astro` exists.
  2. Source imports `EnergyLandscape`, `MoleculeGallery`,
     `CircuitView`, `MathNerds`, `MathBlock`, and `EssayLayout`.
  3. Source contains `<EnergyLandscape` and `<MoleculeGallery`
     embeds.
  4. Source contains both `href="/shor"` (prev) and `href="/sandbox"`
     (next) in the footer-nav.
  5. Source references the Reality-check / sourced framing — assert
     a substring matching e.g. "near-term" or "active research" or
     "HF" or "CCSD" so the no-hype framing is locked.
  6. Source does NOT contain the deferred prose tokens
     `VQE will discover drugs` / `breaks classical chemistry` (D-30
     hype guard).

**Mirrors / files modified:**
- `src/pages/vqe.astro` (new)
- `src/components/ConceptMap.astro` (modified — node + edge + label)
- `tests/essays/concept-map.test.ts` (modified — expected[] + expectedEssays[])
- `tests/essays/nav-graph.test.ts` (modified — CHAIN[] rewire + append)
- `tests/essays/sandbox-links.test.ts` (modified — STARTERS["vqe"])
- `bundle-budget.json` (modified — `/vqe` ceiling, placeholder)
- `src/pages/sitemap.xml.ts` (modified — ROUTES append)
- `src/pages/shor.astro` (modified — footer-nav rewire + comment update)
- `tests/essays/vqe.test.ts` (new, optional structural)

**Out of scope:**
- PROG-01 visited indicator (Plan 06-06).
- Any OPS audit doc (Plan 06-07).
- Bundle ceiling recompute (Plan 06-08).
- Concept-map grouping into algorithm/use-case tracks (D-37, D-38 —
  flat ships first; audit is in 06-07).
- Adding a 4th essay or restructuring earlier essays.

**Commit hint:** `feat(06-vqe/06-05): /vqe essay + mirrors (concept-map, nav, sandbox-links, budget, sitemap, shor footer)`

---

### 06-06 — PROG-01 visited indicator (helper + scroll-depth observer + concept-map hydrator)

**Why:** Closes PROG-01 / ALG-09. Local-only personalization: scroll
past 50% of any essay, the route gets recorded under
`localStorage["quantum/visited"]`; the concept map highlights visited
nodes brighter on next render. No analytics, no beacon, no server
(D-31..D-36).

**Deliverables:**

- `src/lib/progress.ts` (new), small and tested:
  ```ts
  /** localStorage key locked by D-32. */
  export const VISITED_KEY = "quantum/visited";
  /** Scroll-depth threshold locked by D-31. */
  export const VISITED_THRESHOLD = 0.5;

  /** Read the visited list. Returns `[]` when storage is unavailable. */
  export function getVisited(): string[];

  /** Add `path` to the visited list (deduped). No-ops on storage failure. */
  export function markVisited(path: string): void;

  /** Clear the visited list (used by tests; not surfaced in UI). */
  export function clearVisited(): void;

  /**
   * Wire a one-shot scroll-depth observer on `window`. Calls
   * `markVisited(currentPath)` the first time
   * `scrollY / (scrollHeight - innerHeight) >= VISITED_THRESHOLD`.
   * Returns an unsubscribe fn. Safe to call multiple times — internally
   * idempotent per path.
   */
  export function instrumentScrollDepth(currentPath: string): () => void;
  ```
  - All `localStorage` access wrapped in `try { … } catch { … }` —
    matches `src/lib/theme.ts` / `src/lib/annotations.ts` patterns.
  - `markVisited` JSON-encodes the deduped array under `VISITED_KEY`.
  - `getVisited` JSON-parses; returns `[]` on any parse / type failure.
  - `instrumentScrollDepth` uses a passive `scroll` listener and a
    one-shot flag so it self-removes after the first trigger per
    page visit.
- `src/layouts/EssayLayout.astro` (modified): add an inline `<script>`
  near the bottom of `<body>` (or in the EssayLayout's existing
  `<head>` script slot) that:
  1. Imports `instrumentScrollDepth` from `../lib/progress`.
  2. Calls `instrumentScrollDepth(window.location.pathname)` on
     `DOMContentLoaded`.
  3. Honors `prefers-reduced-motion` only in the sense that the
     observer itself does not animate — it just reads scroll
     position (no animation needed, but document it).
  - This single edit instruments **every essay** that uses
    `EssayLayout` (which is all v3 reading-path essays). No per-essay
    changes required.
- `src/components/ConceptMap.astro` (modified): add a small
  `<script>` hydrator (inline or via a new
  `src/components/ConceptMapProgress.client.ts`) that:
  1. Imports `getVisited` from `../lib/progress`.
  2. On `DOMContentLoaded`, reads the visited set, then iterates the
     SVG node `<a>` elements + mobile-list `<li>` elements, adding
     `data-visited="true"` (or a `visited` CSS class) to nodes whose
     `href` matches a visited path.
  3. Uses CSS in `src/styles/theme.css` or a colocated inline
     `<style>` block to flip a visited-state via existing semantic
     tokens — e.g. visited primary node uses
     `--color-accent-emphasis` instead of `--color-accent` for the
     stroke, or doubles the fill opacity. Pair the visual with
     `aria-label="Read: VQE (visited)"` / visually-hidden text so
     screen readers announce visited state (D-34).
- Mobile concept-map fallback (`sm:hidden` `<ol>` already inside
  `ConceptMap.astro`) gets the same visited treatment via the same
  hydrator.

**Tests:** `tests/progress/progress.test.ts` (new) — pure helper
unit tests:
1. **`getVisited` returns `[]` when storage is empty.**
2. **`markVisited("/qubit")` then `getVisited()` returns `["/qubit"]`.**
3. **Dedupe.** `markVisited("/qubit")` twice + `markVisited("/gates")`
   produces `["/qubit", "/gates"]`.
4. **`clearVisited()` resets to `[]`.**
5. **Storage-failure tolerance.** Stub `window.localStorage.getItem`
   to throw; assert `getVisited()` returns `[]` and no exception
   surfaces. Same for `setItem`.
6. **Corrupt JSON tolerance.** Stash a non-JSON string under
   `VISITED_KEY`; assert `getVisited()` returns `[]`.
7. **Type tolerance.** Stash `JSON.stringify({foo: 1})` under
   `VISITED_KEY`; assert `getVisited()` returns `[]` (defensive — only
   arrays of strings are honoured).
8. **`VISITED_THRESHOLD` is exactly `0.5`** (locks D-31; this is a
   single-line test that re-asserts the constant).

`tests/progress/instrument-scroll.test.ts` (new) — DOM/jsdom
integration:
1. Mount a tall fake DOM (`document.body.style.height = "2000px"`,
   etc.); set `window.scrollY` so `scrollY/(scrollHeight - innerHeight) >= 0.5`;
   dispatch a `scroll` event; assert `getVisited()` includes the
   passed `currentPath`.
2. Below-threshold scroll does NOT mark visited.
3. Second call to `instrumentScrollDepth(samePath)` is idempotent —
   only one entry in the visited list.

`tests/components/concept-map-progress.test.ts` (new) — structural
check of the hydrator:
1. `src/components/ConceptMap.astro` source contains a reference to
   `progress` (either inline import or `data-visited` markup).
2. Source contains `data-visited` OR `class="visited"` selector hook.
3. Source contains `aria-label` for visited state (D-34 — text
   announcement, not colour only).

**Mirrors / files modified:**
- `src/lib/progress.ts` (new)
- `src/layouts/EssayLayout.astro` (modified — scroll-depth observer
  inline script)
- `src/components/ConceptMap.astro` (modified — visited-state hydrator
  + aria-label upgrade)
- Optional: `src/components/ConceptMapProgress.client.ts` (new) if
  the hydrator graduates from inline to a colocated client module —
  executor decides based on bundle delta.
- Optional: `src/styles/theme.css` (modified — `[data-visited="true"]`
  selector / `.visited` style hook if not handled inline).
- `tests/progress/progress.test.ts` (new)
- `tests/progress/instrument-scroll.test.ts` (new)
- `tests/components/concept-map-progress.test.ts` (new)

**Out of scope:**
- A "Reset visited" UI control. The user did not ask for one and
  no requirement covers it; `clearVisited()` is exported for tests
  only.
- Any analytics, beacon, or server transmission (D-33 — hard-locked).
- A timestamp / "last visited" log (D-32 explicitly chose array of
  paths, supersedes the design-doc §4.4 sketch).
- Checkmark badges (D-34 — brightness only; checkmark style is barred).
- Cross-tab BroadcastChannel sync — single-tab is sufficient for v3.

**Commit hint:** `feat(06-vqe/06-06): PROG-01 visited indicator (progress.ts + scroll observer + concept-map hydrator)`

---

### 06-07 — OPS audits: `LIGHTHOUSE-PLAN.md`, `BUNDLE-AUDIT.md`, concept-map layout audit

**Why:** OPS-01, OPS-03, OPS-04. The user explicitly warned against
burying OPS close-out under a sweep plan (PHASE-CONTEXT `<specifics>`
final bullet). This plan produces the three OPS artefacts at the
user-locked paths and runs the bundle/concept-map audits that inform
the next-wave launch.

**Deliverables:**

- `.planning/phases/06-vqe/LIGHTHOUSE-PLAN.md` (new). Structure
  mirrors `.planning/phases/_archive-v2/04-launch-polish/LIGHTHOUSE-PLAN.md`:
  - "Why this is a plan, not a report" section explaining the
    Lighthouse-in-CI-needs-Chrome constraint (same wording as v2).
  - **v3.0 targets** — `≥ 95 mobile a11y` in BOTH themes (D-42, OPS-01),
    perf / best-practices / SEO carry the v1 + v2 bar.
  - **Manual run recipe** — `npm run build` + `npx http-server dist -p
    8080 --silent &` + `for route in …; do lighthouse … done` loop.
    Route list MUST be derived at execution time from the final post-`/vqe`
    `bundle-budget.json` `routes` keys (D-44 — count depends on the
    final v3 shape including the 5a/5b split). At minimum: `/`,
    every v1 essay, every v3 essay (`/teleportation`,
    `/superdense-coding`, `/grover`, `/shor`, `/vqe`), `/sandbox`,
    `/sandbox/challenges`, every challenge, `/gallery`, `/feedback`,
    `/feedback/thanks`. Each route is audited in both `prefers-color-scheme`
    light and dark.
  - **Per-route expected-score table** — copy from `_archive-v2`
    pattern, then add a new "v3 essay routes (new)" subsection for the
    five v3 algorithm × use-case essays.
  - **Pre-known a11y concerns to verify on the day** — explicitly
    name: EnergyLandscape's marker drag (focus ring + arrow-key
    nudge + `role="slider"`), MoleculeGallery card focus order,
    PROG-01 visited-state announcement, LargeCircuitView horizontal
    scroll region (re-asserted from 05b's deferral).
  - **Pre-known perf concerns** — KaTeX still CDN-loaded (carry from
    v2); BlochSphere 3D lazy chunk; EnergyLandscape inline surface
    data (50×50 floats = ~10 KB inline JSON — verify it does not
    blow the `/vqe` ceiling).
  - **Verdict** — left intentionally blank pending the manual run
    on launch day.
- `.planning/phases/06-vqe/BUNDLE-AUDIT.md` (new). Structure mirrors
  `.planning/phases/_archive-v2/04-launch-polish/BUNDLE-AUDIT.md`:
  - **Method** — `npm run build` + `du -k dist/_astro/*.js` + per-route
    `grep` of `<script src="/_astro/*">`.
  - **Top-line numbers table** — v2.0 baseline vs v3.0 final, with
    page count, JS chunk count, total gzipped JS site-wide, total
    CSS, heaviest single chunk.
  - **Per-page initial JS payload table** — every v3 route with
    its gzipped initial JS and ceiling, lifted directly from
    `npm run check:bundle` output and from `bundle-budget.json`.
  - **v3.0 additions, line-item** — what each Phase-2..Phase-6 plan
    added.
  - **Bundle isolation** — re-verify essay routes don't pull
    `/vqe`-specific chunks they shouldn't (EnergyLandscape's surface
    JSON is `/vqe`-only).
  - **Concept-map layout audit subsection** (D-43 — embedded here to
    satisfy "concept-map layout audit note … inside one of the above
    or as a clearly referenced close-out artifact"; OPS-03):
    - Visual review of `/` in both themes on desktop + mobile after
      the final 12-essay node set lands.
    - Decision: **flat layout ships** (D-37 default) **OR** track
      grouping ("Foundations" / "Communication" / "Search" /
      "Cryptography" / "Variational") if the live render is genuinely
      cluttered (D-38, D-39). The audit MUST record the verdict
      explicitly, with screenshots (or screenshot-take instructions)
      and the rationale.
    - If grouping wins: the regrouping work is queued for Plan 06-08;
      this plan records the spec.
  - Final per-route ceilings table (post-recompute by 06-08 placeholder
    — 06-07 captures the *pre-recompute* snapshot; 06-08 updates with
    the final ceilings and commits).
- The plan runs `npm run build` and `npm run check:bundle --report`
  (the existing `--report` mode prints suggested ceilings) to gather
  the numbers cited in `BUNDLE-AUDIT.md`. No code changes; OPS docs
  only.

**Tests:** None — OPS docs are markdown artefacts. The next plan
(`06-08`) re-runs the verification commands as part of its final
green-build acceptance.

**Mirrors / files modified:**
- `.planning/phases/06-vqe/LIGHTHOUSE-PLAN.md` (new)
- `.planning/phases/06-vqe/BUNDLE-AUDIT.md` (new)
- No source / test changes. (If the concept-map layout audit
  decides on grouping, the spec lives here; the implementation is
  Plan 06-08's responsibility.)

**Out of scope:**
- Running Lighthouse itself in CI (deferred to v3.1+ as in the v2 plan).
- Implementing concept-map track grouping (D-39 contingent; if needed
  it lands in 06-08, not here — keeping this plan as a pure
  audit/documentation step).
- Recomputing `bundle-budget.json` ceilings (Plan 06-08).
- Drafting the launch announcement (Plan 06-08).

**Commit hint:** `docs(06-vqe/06-07): LIGHTHOUSE-PLAN.md + BUNDLE-AUDIT.md + concept-map layout audit`

---

### 06-08 — `V3-LAUNCH-ANNOUNCEMENT.md` + final verification + bundle recompute

**Why:** Closes OPS-02 and the v3 milestone. The launch announcement
celebrates the algorithm × use-case story + the Qiskit bridge; the
final verification pass re-runs `npm test`, `npm run build`, and
`npm run check:bundle` to confirm v3.0 ships green; the ceiling
recompute updates `bundle-budget.json` with the final
`round_up(actual × 1.2, 1024)` values for every route touched in
Phase 6 (`/vqe`, and any other route that drifted via PROG-01's
tiny progress hydrator addition to `EssayLayout`).

**Deliverables:**

- `.planning/phases/06-vqe/V3-LAUNCH-ANNOUNCEMENT.md` (new). Tone
  and structure mirror
  `.planning/phases/_archive-v2/04-launch-polish/LAUNCH-ANNOUNCEMENT.md`:
  - Lede paragraph framing v3 as "where it actually bites reality"
    (D-27 — the v3 narrative answer to v1+v2 readers' "so what?").
  - Numbered sections (mirroring v2's "1. Dark mode … 2. Gallery …
    3. Feedback" cadence):
    1. **Algorithm × use case essays** — Teleportation +
       Quantum Networks, Superdense + Holevo bandwidth bound,
       Grover + √N reality check, Shor + RSA / PQC migration,
       VQE + chemistry/materials/drug-discovery framing. Honest
       caveats on each — Grover is √N not magic, VQE is
       near-term-credible not drug-discovery-solved (D-30).
    2. **Qiskit bridge ships everywhere** — sandbox toolbar,
       every essay's `CircuitView`, every molecule card, the
       static N=15 Shor circuit. "Now go run this for real."
    3. **Local-only progress indicator (PROG-01)** — visited
       state via `localStorage["quantum/visited"]`; brightness
       on the concept map; no analytics, no beacon, no server.
       Re-ratifies the no-tracking promise.
  - **What v3 deliberately is NOT** — re-asserts no analytics, no
    backend, no live ab initio chemistry, no live N=15 factoring,
    no 8+-qubit simulator, no accounts, no comments (D-33, project
    Out-of-Scope list).
  - Replace `<URL>`, `<REPO>` placeholders matching v1/v2 convention.
- **Final verification pass:**
  1. `npm test` — assert green; record the final test count
     (548 baseline + new VQE/molecule/landscape/gallery/progress
     suites).
  2. `npm run build` — assert clean; record page count (23 → 24).
  3. `npm run check:bundle` — assert green; record per-route
     gzipped sizes.
  4. Recompute every changed route's ceiling as
     `Math.ceil((actual_gzip_bytes * 1.2) / 1024) * 1024` and
     update `bundle-budget.json` in the same commit (OPS-04 same-
     commit rule, D-43).
- **Optional concept-map regrouping** — if Plan 06-07's layout
  audit decided grouping wins, implement the regrouping here
  (modify `ConceptMap.astro` `nodes[]` placements + `edges[]`
  + `tests/essays/concept-map.test.ts` `expected[]` if labels
  change). Otherwise no-op.
- **Commit body** records:
  - Final `/vqe` gzip + ceiling and any other routes that drifted.
  - Confirmation `MAX_QUBITS = 4` is unchanged (`git diff --stat`
    on `src/lib/quantum/simulator.ts` + `src/lib/quantum/circuit.ts`
    is empty across the entire phase).
  - Confirmation no new runtime dependencies
    (`git diff package.json package-lock.json` is empty).
  - Final 12-essay reading path confirmation.

**Tests:** No new tests. The verification pass re-runs the full
`npm test` suite; if any test from any prior plan regresses, this
plan fails its acceptance and the commit is held until the
regression is fixed (executor's responsibility).

**Mirrors / files modified:**
- `.planning/phases/06-vqe/V3-LAUNCH-ANNOUNCEMENT.md` (new)
- `bundle-budget.json` (modified — final ceiling recompute)
- Optional: `src/components/ConceptMap.astro` + matching
  `tests/essays/concept-map.test.ts` edits IF Plan 06-07's audit
  decided grouping wins. Otherwise unchanged.

**Out of scope:**
- Actually running Lighthouse on launch day (deferred to a manual
  ops gate; the recipe lives in `LIGHTHOUSE-PLAN.md` for the user).
- Pushing / deploying. Phase 6 ships the code-complete v3.0 build;
  deployment is a separate parallel ops task (matching v1 + v2's
  carry-over deploy pattern documented in `.planning/STATE.md`).
- Recording the live screen-reader pass on `/vqe` widgets (carried
  from 5b's deferred list — same user-gate handling).

**Commit hint:** `docs(06-vqe/06-08): V3-LAUNCH-ANNOUNCEMENT.md + final verification + ceiling recompute`

---

## Cross-plan verification

- After 06-01: `npm test -- vqe` — convergence on 1D parabola + H₂
  surface within `1e-3`; sampleSurface/interpolateSurface correctness.
- After 06-02: `npm test -- molecules` — schema, unit consistency,
  Qiskit export validity for all three molecules.
- After 06-03: `npm test -- energy-landscape` + `npm run build` (proves
  the SSR 50×50 grid renders cleanly with no template-parser issues).
- After 06-04: `npm test -- molecule-gallery` + `npm run build`.
- After 06-05: full `npm test` (mirror tests: nav-graph CHAIN[],
  concept-map expected[], sandbox-links STARTERS["vqe"], plus the
  optional `tests/essays/vqe.test.ts`) + `npm run build` (new route
  emits cleanly: 23 → 24) + `npm run check:bundle` (placeholder `/vqe`
  ceiling holds).
- After 06-06: full `npm test` (progress unit + integration +
  concept-map-progress structural) + `npm run build` (PROG-01 inline
  script does not bloat any route above its ceiling).
- After 06-07: no command changes — OPS docs only. Manual review
  that both files exist at user-locked paths.
- After 06-08: clean `npm test` + `npm run build` + `npm run check:bundle`
  AND final `bundle-budget.json` recompute. The phase is closed when
  all three commands are green on a clean tree.

Same-commit mirror discipline (D-45) is enforced by `npm test` —
nav-graph / concept-map / sandbox-links / bundle-budget all drift
from source if any mirror is forgotten.

---

## Artifacts this phase produces

- `src/lib/quantum/vqe.ts`
- `src/lib/quantum/index.ts` (re-export delta)
- `tests/quantum/vqe.test.ts`
- `src/data/molecules.json`
- `src/data/molecules.ts`
- `tests/data/molecules.test.ts`
- `src/components/EnergyLandscape.astro`
- `tests/components/energy-landscape.test.ts`
- `src/components/MoleculeGallery.astro`
- `tests/components/molecule-gallery.test.ts`
- `src/pages/vqe.astro`
- `src/components/ConceptMap.astro` (modified)
- `src/pages/shor.astro` (modified — footer-nav rewire)
- `src/pages/sitemap.xml.ts` (modified — ROUTES append)
- `bundle-budget.json` (modified — `/vqe` ceiling, placeholder
  then final)
- `tests/essays/nav-graph.test.ts` (modified)
- `tests/essays/concept-map.test.ts` (modified)
- `tests/essays/sandbox-links.test.ts` (modified)
- `tests/essays/vqe.test.ts` (optional structural)
- `src/lib/progress.ts`
- `src/layouts/EssayLayout.astro` (modified — scroll observer)
- Optional: `src/components/ConceptMapProgress.client.ts`
- Optional: `src/styles/theme.css` (modified — visited-state hook)
- `tests/progress/progress.test.ts`
- `tests/progress/instrument-scroll.test.ts`
- `tests/components/concept-map-progress.test.ts`
- `.planning/phases/06-vqe/LIGHTHOUSE-PLAN.md`
- `.planning/phases/06-vqe/BUNDLE-AUDIT.md` (includes concept-map
  layout audit subsection)
- `.planning/phases/06-vqe/V3-LAUNCH-ANNOUNCEMENT.md`

---

## Frontmatter

```yaml
phase: 6
phase_slug: 06-vqe
phase_title: "VQE + Chemistry + v3 launch"
requirements: [ALG-08, ALG-09, USE-05, PROG-01, OPS-01, OPS-02, OPS-03, OPS-04]
plans:
  - id: 06-01
    title: "vqe.ts optimizer + h2Energy + tests"
    wave: 1
    depends_on: []
    autonomous: true
    requirements: [ALG-08]
    files_modified:
      - src/lib/quantum/vqe.ts
      - src/lib/quantum/index.ts
      - tests/quantum/vqe.test.ts
  - id: 06-02
    title: "molecules.json (H2, LiH, HeH+) + schema tests"
    wave: 1
    depends_on: []
    autonomous: true
    requirements: [USE-05]
    files_modified:
      - src/data/molecules.json
      - src/data/molecules.ts
      - tests/data/molecules.test.ts
  - id: 06-03
    title: "EnergyLandscape SSR heatmap + drag/keyboard/Auto-descend"
    wave: 2
    depends_on: [06-01]
    autonomous: true
    requirements: [ALG-09]
    files_modified:
      - src/components/EnergyLandscape.astro
      - tests/components/energy-landscape.test.ts
  - id: 06-04
    title: "MoleculeGallery + per-card Qiskit export"
    wave: 2
    depends_on: [06-02]
    autonomous: true
    requirements: [USE-05]
    files_modified:
      - src/components/MoleculeGallery.astro
      - tests/components/molecule-gallery.test.ts
  - id: 06-05
    title: "/vqe essay + same-commit mirrors"
    wave: 3
    depends_on: [06-03, 06-04]
    autonomous: true
    requirements: [ALG-08, ALG-09, USE-05, OPS-04]
    files_modified:
      - src/pages/vqe.astro
      - src/components/ConceptMap.astro
      - src/pages/shor.astro
      - src/pages/sitemap.xml.ts
      - bundle-budget.json
      - tests/essays/nav-graph.test.ts
      - tests/essays/concept-map.test.ts
      - tests/essays/sandbox-links.test.ts
      - tests/essays/vqe.test.ts
  - id: 06-06
    title: "PROG-01 visited indicator + scroll observer + concept-map hydrator"
    wave: 4
    depends_on: [06-05]
    autonomous: true
    requirements: [PROG-01]
    files_modified:
      - src/lib/progress.ts
      - src/layouts/EssayLayout.astro
      - src/components/ConceptMap.astro
      - src/styles/theme.css
      - tests/progress/progress.test.ts
      - tests/progress/instrument-scroll.test.ts
      - tests/components/concept-map-progress.test.ts
  - id: 06-07
    title: "OPS audits: LIGHTHOUSE-PLAN + BUNDLE-AUDIT + concept-map layout audit"
    wave: 5
    depends_on: [06-06]
    autonomous: false
    requirements: [OPS-01, OPS-03, OPS-04]
    files_modified:
      - .planning/phases/06-vqe/LIGHTHOUSE-PLAN.md
      - .planning/phases/06-vqe/BUNDLE-AUDIT.md
  - id: 06-08
    title: "V3-LAUNCH-ANNOUNCEMENT + final verification + bundle ceiling recompute"
    wave: 6
    depends_on: [06-07]
    autonomous: false
    requirements: [OPS-02, OPS-04]
    files_modified:
      - .planning/phases/06-vqe/V3-LAUNCH-ANNOUNCEMENT.md
      - bundle-budget.json
      - src/components/ConceptMap.astro
      - tests/essays/concept-map.test.ts
```
