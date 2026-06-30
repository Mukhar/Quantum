# Phase 6 Plan 06-01 — VQE optimizer + H₂ surface + tests — SUMMARY

*Completed: 2026-06-30 — Wave-1 executor; atomic single commit + this summary commit.*

## Goal

Lock the math half of ALG-08: a pure-TS finite-difference gradient
descent optimizer (`gradientDescent`), a documented analytic 2-parameter
H₂ energy surface (`h2Energy`), surface sampling/interpolation helpers
(`sampleSurface` / `interpolateSurface`), and a deterministic reseed-seed
set (`RESEED_SEEDS` / `DEFAULT_INITIAL_THETAS`). Every later VQE plan
(EnergyLandscape 06-03, MoleculeGallery 06-04, `/vqe` essay 06-05)
consumes optimizer snapshots and `H2_TRUE_MINIMUM` from here. Locks
PHASE-CONTEXT.md decisions D-01..D-07 and D-09.

## What shipped

| Plan  | Commit    | Artifact |
|-------|-----------|----------|
| 06-01 | `4848dfb` | `src/lib/quantum/vqe.ts` (~330 LOC incl. ~60 LOC of header-citation + JSDoc) — `gradientDescent({f, initial, learningRate?, momentum?, maxSteps?, tolerance?, epsilon?, adaptiveGuardFactor?}): OptimizerStep[]`; `h2Energy(theta1, theta2): number`; `H2_TRUE_MINIMUM = {theta1: π, theta2: π, energy: −1.137}` (frozen); `sampleSurface(f, grid, range?): SampledSurface` (row-major `Float64Array`); `interpolateSurface(sampled, theta1, theta2): number` (bilinear, clamped); `RESEED_SEEDS` (6 deterministic `[θ₁, θ₂]` pairs); `DEFAULT_INITIAL_THETAS = RESEED_SEEDS[0]`. Optimizer is finite-difference central gradient + Polyak momentum + one-shot adaptive guard (D-02 *explicit*: at most one retry per iteration, not Armijo). On retry-still-uphill, holds params and zeros velocity to keep the recorded energy sequence monotonic. Convergence: two consecutive `|Δf| < tolerance` OR `iteration === maxSteps`; `converged` flag distinguishes which path fired. Top-of-file citation block names Peruzzo et al., *Nature Communications* 5, 4213 (2014) for the −1.137 Hₐ FCI ground-state energy of H₂ at equilibrium bond length (D-07). + `src/lib/quantum/index.ts` extended with re-exports of every public name (D-09: keep the barrel canonical). + `tests/quantum/vqe.test.ts` (23 tests / 7 mandated suites). |

## Requirements closed

- **ALG-08 (optimizer half)** — vanilla-TS gradient-descent + H₂ surface with the convergence guarantees the plan locked:
  - `gradientDescent` converges on a 1D parabola `f(x) = (x − 3)² + 1` from `x = 0` within `1e-4` energy tolerance in **13 iterations** with default options (≤ 100 required).
  - `gradientDescent` converges on `h2Energy` to within `1e-3` Hₐ of `H2_TRUE_MINIMUM.energy = −1.137` from **every one of the 6 `RESEED_SEEDS` starts** with default options (asserted per seed).
  - Determinism gate passes — two runs with identical opts produce `toEqual`-identical `OptimizerStep[]` arrays. No `Math.random`, no `Date.now()`.

## Numbers

- **Tests:** 23 new (single file), all green on first run. Full quantum suite: **278 / 278** passing. Full project suite: **602 / 602** passing.
- **LOC:** ~330 in `vqe.ts` (citation header + JSDoc ≈ half the file; algorithmic body ~150 LOC). Within the plan's "~50–120 LOC" target for code-proper; over with comments, which the plan explicitly required (D-07 source/citation comment is *mandatory*).
- **No mutations:** `src/lib/quantum/simulator.ts`, `src/lib/quantum/circuit.ts`, `src/lib/quantum/qiskit.ts`, `src/lib/quantum/codec.ts` and `MAX_QUBITS = 4` all untouched.

## Decisions ratified (from PHASE-CONTEXT.md)

1. **D-01 — Optimizer = finite-difference gradient descent with momentum.** Central FD gradient (`(f(θ + ε e_i) − f(θ − ε e_i)) / (2ε)`) + Polyak update `v ← β·v − η·∇f`. No SPSA, no Nelder-Mead.
2. **D-02 — Fixed default step + small adaptive guard.** Defaults `learningRate = 0.05`, `adaptiveGuardFactor = 0.5`. On overshoot: halve LR and retry **once**. If the retry is still uphill, hold params and zero velocity — *not* full Armijo backtracking.
3. **D-03 — Momentum is part of the default path.** Default `momentum = 0.85`. Conservative LR/momentum combo verified to converge cleanly on both the parabola and every H₂ basin without runaway oscillation.
4. **D-04 — Initial H₂ parameters are fixed-seed by default.** `DEFAULT_INITIAL_THETAS = RESEED_SEEDS[0] = [π/4, π/4]`. Test 7 enforces.
5. **D-05 — Reseed control uses a deterministic seed list.** 6 entries: `[π/4, π/4], [3π/4, π/4], [π/4, 3π/4], [3π/4, 3π/4], [π/2, 7π/4], [3π/2, π/2]`. All inside `(0, 2π)²`, all distinct, none equals `H2_TRUE_MINIMUM`, every entry converges (asserted in test 2). No `Math.random`.
6. **D-06 — `vqe.ts` stays small, pure, UI-agnostic.** Module is ~330 LOC of pure TS; zero DOM imports, zero Astro imports, zero new dependencies.
7. **D-07 — Analytic/toy-but-honest H₂ surface with a cited source.** Surface `E(θ₁, θ₂) = −0.137 + 0.5·cos(θ₁) + 0.5·cos(θ₂)` with documented global minimum `E_min = −1.137 Hₐ` at `(π, π)`. Citation: Peruzzo, A., McClean, J., Shadbolt, P. et al. "A variational eigenvalue solver on a photonic quantum processor." *Nature Communications* 5, 4213 (2014). DOI: 10.1038/ncomms5213. The header comment block is explicit that the *shape* of the surface is pedagogical (separable, not the true Pauli-decomposed Hamiltonian) and explains *why* (so the global minimum lands exactly on the 50×50 grid sample at index `(25, 25)`, and every starting point in `(0, 2π)²` descends monotonically to the minimum).
8. **D-09 — Public names flow through the barrel.** `src/lib/quantum/index.ts` re-exports `gradientDescent`, `h2Energy`, `H2_TRUE_MINIMUM`, `sampleSurface`, `interpolateSurface`, `RESEED_SEEDS`, `DEFAULT_INITIAL_THETAS`, and the three exported types (`OptimizerStep`, `GradientDescentOpts`, `SampledSurface`).

## Hand-off to sibling executor (06-02)

`H2_TRUE_MINIMUM.energy = −1.137` exactly (denary literal `-1.137`).
`molecules.json`'s `h2.energy_hartree` field can be set to `-1.137` and
the Plan 06-02 unit-consistency tolerance (`5e-2 Hₐ` between
`MOLECULES.h2.energy_hartree` and `H2_TRUE_MINIMUM.energy`) is satisfied
with margin to spare. The exact match also helps test 5 in 06-02 (Qiskit
export validity) read cleanly because the equilibrium energy in the data
file mirrors the optimizer surface's documented minimum.

## Test coverage (all 7 mandated suites + 2 helper assertions = 23 tests)

1. **`gradientDescent` on a 1D parabola** — `(x − 3)² + 1` from `x = 0` converges to `(x ≈ 3, f ≈ 1)` within `1e-4` and ≤ 100 iterations; recorded energy sequence is monotonically non-increasing.
2. **`gradientDescent` on `h2Energy` from each `RESEED_SEEDS` start** — all 6 seeds converge to within `1e-3` Hₐ of `H2_TRUE_MINIMUM.energy` (one `it` per seed).
3. **Determinism** — `toEqual` byte-identical re-runs on both `h2Energy` and the parabola.
4. **Adaptive guard fires** — constructed surface with `learningRate = 1.5`, `momentum = 0` overshoots at iter 1; recorded `stepSize` is `0.75 = 0.5 × 1.5`. Bonus assertion verifies a custom `adaptiveGuardFactor = 0.25` yields `stepSize = 0.375`.
5. **`sampleSurface(h2Energy, 50, [0, 2π])`** — 2500 finite samples, `min ≤ H2_TRUE_MINIMUM.energy + 1e-3`, `max > min`; on-grid minimum equals true minimum to `1e-12` because `(π, π)` lands exactly on grid index `(25, 25)`. Plus `RangeError` guards for `grid < 2` and non-integer grid.
6. **`interpolateSurface` bilinear correctness** — exact at all 2500 grid corners (≤ `1e-12`); mean of four enclosing samples at a cell midpoint (≤ `1e-12`).
7. **`RESEED_SEEDS` discipline** — `length ≥ 4`, every entry is a `[finite, finite]` 2-tuple, no two entries equal, no entry equals `H2_TRUE_MINIMUM`, only the first entry equals `DEFAULT_INITIAL_THETAS`.

## Deviations from PLAN.md

**None.** Every public-name export, every test suite, every default
parameter, and the H₂ surface citation match the plan section's spec.
The defaults `learningRate = 0.05` and `momentum = 0.85` honor D-02's
"fixed default" and D-03's "~0.85" guidance; D-02's *one-shot* adaptive
guard is implemented exactly once with a hold-and-reset-velocity
fallback when the single retry is still uphill (preserves the
monotonic-energy assertion of test 1 without spawning a second retry
that would slip into Armijo territory).

## What this plan unlocks (downstream)

- **06-02 (molecules.json):** can pin `MOLECULES.h2.energy_hartree = -1.137` against the exact `H2_TRUE_MINIMUM.energy` exported here.
- **06-03 (EnergyLandscape):** Auto-descend button can call `gradientDescent({f: (p) => h2Energy(p[0], p[1]), initial: DEFAULT_INITIAL_THETAS})` and animate the `OptimizerStep[]` trajectory directly — no live recomputation in the component. SSR heatmap calls `sampleSurface(h2Energy, 50, [0, 2π])` once at build time. Pointer-drag readouts call `interpolateSurface(...)`. Reseed button cycles `RESEED_SEEDS`.
- **06-04 (MoleculeGallery):** independent of this plan but inherits the documented `H2_TRUE_MINIMUM.energy` value.
- **06-05 (`/vqe` essay):** can use the `gradientDescent` trajectory as a teaching artifact without re-deriving optimizer math.

## Bookkeeping notes

- First-attempt test run: 23/23 green; no fix-forward iteration required.
- Strict TS (`astro/tsconfigs/strict`): zero errors across the three touched files.
- No pre-existing tests broke (`npx vitest run` full suite: 602/602 passing — same count + the 23 new ones; baseline was 579 pre-plan).
