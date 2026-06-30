# Roadmap: Quantum v3.0 — Algorithms × Use Cases

## Overview

v3.0 pairs the canonical quantum algorithm canon with the practical
use case each algorithm unlocks. Every v3 essay teaches the algorithm
AND the use case in the same scroll, with widgets driving both halves.

Phase order is deliberate, foundation-first then ascending difficulty:

1. **Foundation infra first.** Qiskit text export + bundle-size CI
   gate. Every subsequent phase reuses both, so it has to land first.
2. **Teleportation second (FLAGSHIP).** Extends v1's entanglement
   story most directly → lowest pedagogical risk for proving the
   "algorithm + use case in one scroll" format end-to-end.
3. **Superdense third.** Same protocol shape as Teleportation;
   completes the communication arc.
4. **Grover fourth.** Self-contained; first essay where the use case
   is "honest disappointment" (no, it doesn't break RSA).
5. **Shor + QFT fifth.** Densest essay in v3; QFT taught inline as
   Shor's engine; Qiskit export bridges to real hardware for N=15.
6. **VQE + launch sixth.** Variational/hybrid — the near-term
   industrial story — plus concept-map progress indicator and v3
   launch artifacts.

Phase numbering is **reset** for v3 — v1's phases 1–5 are archived
under `.planning/phases/_archive-v1/`, v2's 1–4 under `_archive-v2/`.
v1+v2 historical context lives in `.planning/MILESTONES.md`.

## Phases

- [x] **Phase 1: Foundation — Qiskit export + bundle CI** — Sandbox toolbar export, per-essay `CircuitView` export, gate-coverage golden tests, per-route bundle-size CI gate ✅
- [x] **Phase 2: Teleportation + Quantum networks (FLAGSHIP)** — `/teleportation` essay with `ProtocolStepper`, mixed-state `MultiBlochPanel`, and `QuantumNetwork` interactive ✅
- [x] **Phase 3: Superdense + Holevo bound** — `/superdense-coding` essay with `EncodingTable` and `HolevoBound` widgets ✅
- [x] **Phase 4: Grover + Search reality** — `/grover` essay with oracle/diffusion, `AmplitudeBars` iterator, and `SearchComparison` widget ✅
- [x] **Phase 5a: Shor — QFT + period-finding** — `/shor` essay scaffold with `QFTVisualizer` and `PeriodFinding` widgets ✅
- [x] **Phase 5b: Shor — N=15 circuit + RSACountdown + PQC** — extend `/shor` with static full-N=15 Shor circuit, prominent Qiskit export, and RSA/PQC threat section (depends_on = 5a)
- [ ] **Phase 6: VQE + Chemistry + v3 launch** — `/vqe` essay with vanilla-TS optimizer + `EnergyLandscape` + `MoleculeGallery`, concept-map progress indicator, OPS audit, v3 announcement

## Phase Details

### Phase 1: Foundation — Qiskit export + bundle CI

**Goal:** Land the two cross-cutting infrastructure pieces every later
phase depends on: a Qiskit-text export usable from both the sandbox
toolbar and every essay's `CircuitView`, and a per-route bundle-size
CI gate that prevents v3 essays from bloating the site.
**Depends on:** v1.0 codec (`src/lib/quantum/codec.ts`), v1.0
`CircuitView` component, v2.0 sandbox toolbar.
**Requirements:** QSK-01, QSK-02, QSK-03, OPS-04
**Success Criteria:**
  1. "Copy as Qiskit" button on sandbox toolbar copies a runnable
     Qiskit snippet (`QuantumCircuit(n,n)` + gates in `Step` order +
     measurement) to the clipboard
  2. Every existing essay `CircuitView` exposes the same affordance
     for its statically-encoded circuit
  3. Golden test asserts each simulator-supported gate (`H`, `X`, `Y`,
     `Z`, `S`, `T`, `Rx`, `Ry`, `Rz`, `CNOT`, controlled rotations,
     `SWAP`, `M`) maps to syntactically-correct Qiskit; test fails on
     any new simulator gate without a Qiskit mapping
  4. CI runs `astro build` and asserts each tracked route's JS bundle
     stays under its declared ceiling; build fails on overrun
  5. Existing tests (v1 + v2) all still pass; no Lighthouse regressions

**Plans:**
  - `01-01` — Qiskit exporter module + drift-proof tests (`src/lib/quantum/qiskit.ts`)
  - `01-02` — Sandbox toolbar "Copy as Qiskit" button
  - `01-03` — `CircuitView` "Copy as Qiskit" button
  - `01-04` — Per-route bundle-size CI gate (`scripts/check-bundle-budget.mjs`)

### Phase 2: Teleportation + Quantum networks (FLAGSHIP)

**Goal:** Ship `/teleportation`, the flagship v3 essay, proving the
"algorithm half + use-case half, both widget-driven" format
end-to-end. Algorithm half walks the reader through the 3-qubit
teleportation circuit; use-case half lets them swap entanglement
across a 3-node network.
**Depends on:** Phase 1 (Qiskit export is on this essay's
`CircuitView` from day 1), v1 `MiniBloch` pattern,
`src/lib/quantum/reducedDensity.ts`.
**Requirements:** ALG-01, ALG-02, USE-01
**Success Criteria:**
  1. `/teleportation` essay renders end-to-end with an embedded
     `ProtocolStepper` that advances through entangle-pair → Bell
     measure → classical bits → conditional X/Z → state arrives
  2. `MultiBlochPanel` honestly renders mixed states: Bloch arrow
     length = `|r|` (vector norm of reduced density); for canonical
     mixed states (`I/2`, `(I + 0.5·Z)/2`) the arrow lives **inside**
     the sphere with the right magnitude
  3. `QuantumNetwork` 3-node widget (Alice / Repeater / Bob): clicking
     each link swaps entanglement along it; live "shared Bell pair
     Alice ↔ Bob" indicator flips when end-to-end entanglement exists
  4. Essay frontmatter wires into `tests/essays/nav-graph.test.ts`
     mirror; concept-map node added with same-commit mirror update
  5. Lighthouse mobile a11y ≥ 95 in both themes

**Plans:**
  - `02-01` — `quantum/teleportation` module + correctness tests (`src/lib/quantum/teleportation.ts`)
  - `02-02` — Shared `ProtocolStepper.astro` component
  - `02-03` — `MultiBlochPanel.astro` (composes 3 × `MiniBloch`)
  - `02-04` — Generic `QuantumNetwork.astro` widget (USE-01)
  - `02-05` — `/teleportation` essay + all mirrors + bundle-budget entry
  - `02-06` — Bundle-ceiling recompute close-out

### Phase 3: Superdense + Holevo bound

**Goal:** Ship `/superdense-coding`. Algorithm half shows
encoding/decoding; use-case half visualizes the Holevo bound so the
reader understands superdense ≠ free bandwidth.
**Depends on:** Phase 2 (pattern reuse: `ProtocolStepper`,
`MultiBlochPanel`), Phase 1 (Qiskit export).
**Requirements:** ALG-03, USE-02
**Success Criteria:**
  1. `/superdense-coding` essay renders with `EncodingTable` widget:
     clicking a 2-bit input animates the corresponding `I/X/Z/XZ`
     gate on Alice's qubit and shows the Bell-basis measurement on
     Bob's
  2. `HolevoBound` widget maps `n` qubits ↔ classical bits, surfacing
     the 2× ceiling so the reader sees why superdense doesn't scale
     to "10× bandwidth via 10 qubits"
  3. Concept-map + nav-graph + sandbox-links mirrors updated in the
     same commit as essay frontmatter changes
  4. Lighthouse mobile a11y ≥ 95 in both themes

**Plans:** `.planning/phases/03-superdense/PLAN.md`

### Phase 4: Grover + Search reality

**Goal:** Ship `/grover`. Algorithm half implements oracle + diffusion
in the simulator and lets the reader step through iterations; use-case
half is the "honest disappointment" — quantum search is `√N`, not
magic.
**Depends on:** Phase 1 (Qiskit export); independent of Phases 2-3.
**Requirements:** ALG-04, USE-03
**Success Criteria:**
  1. Oracle + diffusion operators implemented against the existing
     simulator; unit tests assert amplitude concentration on the
     marked state after the optimal `⌊(π/4)·√N⌋` iterations
  2. `AmplitudeBars` widget shows per-basis-state amplitudes after
     each iteration; reader steps through; bars animate
  3. `SearchComparison` widget side-by-side animates classical linear
     scan vs. Grover's `√N` as `N` slides from 16 → 1024
  4. Body text explicitly closes the "does this break RSA?" loop with
     a clean "no — that's Shor, see next essay" handoff
  5. Concept-map + nav-graph + sandbox-links mirrors updated; Lighthouse
     mobile a11y ≥ 95 in both themes

**Plans:** TBD (created by `/gsd-plan-phase 4`)

### Phase 5a: Shor — QFT + period-finding

**Goal:** Ship the first split slice of `/shor`: teach QFT inline as
Shor's engine, render the locked 4-qubit QFT probability-bars visualizer,
and let readers run toy period finding in-browser for small `N`.
**Depends on:** Phase 1 (Qiskit/export + bundle gate), Phase 4 (Grover
handoff).
**Requirements:** ALG-05, ALG-06, OPS-04
**Success Criteria:**
  1. `QFT` visualizer renders 4-qubit QFT input vs. output as
     probability bars; reader can adjust input state
  2. `PeriodFinding` widget runs in-browser for `a^x mod N` with
     `N ≤ 15`; QFT peak pins the period; tests cover canonical periods
  3. `/shor` route scaffold exists and explicitly defers full Shor N=15
     + RSA/PQC closure to Phase 5b on the same URL
  4. Concept-map + nav-graph + sandbox-links mirrors updated in the
     same commit as `/shor`; bundle stays under per-route ceiling
     (OPS-04)

**Plans:** `.planning/phases/05-shor/PLAN.md`

### Phase 5b: Shor — N=15 circuit + RSACountdown + PQC

**Goal:** Complete `/shor` by adding the static full N=15 Shor circuit,
a prominent Qiskit export path, and the grounded RSA/PQC threat section.
This extends the 5a route; it does not add a new URL.
**Depends on:** Phase 5a.
**Requirements:** ALG-07, USE-04, OPS-04
**Success Criteria:**
  1. Full N=15 Shor circuit rendered statically (not executed
     in-browser) with a prominent Shor-specific Qiskit copy/export CTA
  2. Large-static circuit path preserves simulator/sandbox `MAX_QUBITS = 4`
     and does not route N=15 through sandbox codec validation
  3. `RSACountdown` widget takes RSA key size (2048 / 3072 / 4096) and
     a logical-qubit slider; projects qubits-to-break with sourced,
     caveated language and milestone markers
  4. Inline NIST PQC cards link Kyber/ML-KEM, Dilithium/ML-DSA, Falcon,
     and SPHINCS+/SLH-DSA to official sources
  5. `/shor` reads as a complete essay; mirrors and bundle budget remain
     green; Lighthouse/mobile a11y target ≥ 95 in both themes

**Plans:** `.planning/phases/05b-shor-pqc/PLAN.md`

### Phase 6: VQE + Chemistry + v3 launch

**Goal:** Ship `/vqe` (the near-term industrial story — variational
hybrid algorithms) plus the concept-map progress indicator and all
v3-launch operational items.
**Depends on:** Phase 5; touches concept-map (PROG-01) which depends
on all 5 essays existing.
**Requirements:** ALG-08, ALG-09, USE-05, PROG-01, OPS-01, OPS-02,
  OPS-03
**Success Criteria:**
  1. Vanilla-TypeScript classical optimizer (~50-100 LOC) lives in
     `src/lib/quantum/`; unit tests assert convergence on a 1D
     parabola and on the 2-parameter H2 energy surface to within
     1e-3 of the true minimum
  2. `EnergyLandscape` widget renders the 2-parameter variational
     surface; reader can drag a marker or click "auto-descend" to
     watch the optimizer converge
  3. `MoleculeGallery` ships 2-3 pre-baked molecules (`H2`, `LiH`,
     `HeH+`); each shows saved ansatz parameters, converged energy,
     and the Qiskit-export button
  4. Concept-map shows a "visited" flag per essay (10 essays total
     after v3); state stored under `localStorage["quantum/visited"]`;
     flag flips on essay-page scroll past 50%; **no analytics**
  5. Lighthouse mobile a11y ≥ 95 across all 5 new routes in both
     themes; concept-map layout audit recorded (track-grouped if
     needed); v3 announcement draft committed
  6. Final bundle delta vs. v2 captured; no essay route exceeds its
     per-route ceiling (OPS-04 stays green)

**Plans:** TBD (created by `/gsd-plan-phase 6`)

## Progress

**Execution Order:** Phases run in numeric order: 1 → 2 → 3 → 4 → 5a → 5b → 6.

| Phase | Plans Complete | Status      | Completed  |
|-------|----------------|-------------|------------|
| 1. Foundation — Qiskit export + bundle CI     | 4/4   | ✅ Complete | 2026-06-29 |
| 2. Teleportation + Quantum networks (FLAGSHIP)| 6/6   | ✅ Complete | 2026-06-29 |
| 3. Superdense + Holevo bound                  | 0/5   | Planned     | — |
| 4. Grover + Search reality                    | 0/TBD | Discuss     | — |
| 5a. Shor — QFT + period-finding              | 0/5   | Planned     | — |
| 5b. Shor — N=15 + RSACountdown + PQC          | 5/5   | ✅ Complete | 2026-06-30 |
| 6. VQE + Chemistry + v3 launch                | 0/TBD | Not started | — |

**Parallel ops tasks (not phase work):**
- v1 deploy + post-launch feedback round (tracked under
  `.planning/phases/_archive-v1/05-algorithms/LAUNCH-ANNOUNCEMENT.md`).
- v2 deploy: Apps Script provisioning, Lighthouse audit, launch smoke
  test (tracked under `.planning/phases/_archive-v2/04-launch-polish/`).

Both ops tracks run whenever ready; neither blocks v3 phase work.
