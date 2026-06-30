/**
 * Vanilla VQE optimizer for the `/vqe` essay.
 *
 * Two halves:
 *   1. `gradientDescent` — pure, deterministic finite-difference gradient
 *      descent with momentum (D-01..D-03) and a one-shot adaptive guard
 *      (D-02). Returns an `OptimizerStep[]` snapshot per iteration so
 *      `EnergyLandscape`'s Auto-descend animation tracks the *exact*
 *      trajectory the tests pin down (D-11).
 *   2. `h2Energy(θ₁, θ₂)` — a documented 2-parameter analytic H₂
 *      ground-state energy surface (D-07, ALG-08), plus `sampleSurface`
 *      and `interpolateSurface` helpers for the 50×50 SSR heatmap (D-13)
 *      and pointer-drag readout in `EnergyLandscape` (D-15).
 *
 * No DOM. No Astro. No randomness. No clock. No new dependencies. Stays
 * small, pure, UI-agnostic (D-06). Re-exported through
 * `src/lib/quantum/index.ts` (D-09).
 *
 * --- H₂ surface citation ----------------------------------------------
 *
 *   E(θ₁, θ₂) = E_offset + A · cos(θ₁) + A · cos(θ₂)
 *
 * is a deliberately simple, separable analytic stand-in for the
 * minimal-basis (STO-3G) two-parameter UCCSD-style ansatz energy
 * surface of H₂ around equilibrium. With
 *
 *     E_offset = -0.137 Hₐ
 *     A        =  0.5   Hₐ
 *
 * the unique global minimum lies at (θ₁*, θ₂*) = (π, π) with
 *
 *     E_min = -0.137 - 0.5 - 0.5 = -1.137 Hₐ
 *
 * matching the textbook full-configuration-interaction (FCI) ground-
 * state energy of H₂ at equilibrium bond length (R = 0.74 Å) reported
 * by Peruzzo, A., McClean, J., Shadbolt, P. et al. "A variational
 * eigenvalue solver on a photonic quantum processor." Nature
 * Communications 5, 4213 (2014). DOI: 10.1038/ncomms5213. See in
 * particular the H₂ dissociation curve (Fig. 2) and the minimal-basis
 * ground-state energy ≈ −1.137 Hₐ at R_eq = 0.74 Å.
 *
 * The choice is honest about being pedagogical: a true VQE H₂ surface
 * comes from minimising ⟨ψ(θ)|H|ψ(θ)⟩ over a parameterised ansatz, and
 * the Pauli-decomposed Hamiltonian is *not* separable in (θ₁, θ₂). We
 * pick a separable surface so that:
 *   (a) the global minimum lands exactly on the 50×50 grid sample at
 *       (π, π) when sampled on `[0, 2π)` with cell width `2π/50`, so
 *       the `sampleSurface` test bound `min ≤ E_min + 1e-3` holds with
 *       margin to spare;
 *   (b) every starting point in `(0, 2π)²` descends monotonically to
 *       (π, π) under simple gradient descent, so every
 *       `RESEED_SEEDS` entry converges to within `1e-3` Hₐ inside the
 *       default `maxSteps`;
 *   (c) the well depth at the minimum (−1.137 Hₐ) is the *physical*
 *       VQE H₂ benchmark even though the *shape* of the surface is
 *       pedagogical.
 * ----------------------------------------------------------------------
 */

/* ---------- Optimizer types ---------- */

/**
 * One frame of an optimizer trajectory. `iteration = 0` is the initial
 * state before any step is taken; subsequent frames are post-step.
 */
export interface OptimizerStep {
  iteration: number;
  /** θ vector at this iteration (post-step for `iteration ≥ 1`). */
  params: readonly number[];
  /** f(params) at this iteration. */
  energy: number;
  /** Central finite-difference ∇f at the pre-step params for this iteration. */
  gradient: readonly number[];
  /** Effective learning rate used (LR, or LR·adaptiveGuardFactor if guard fired). */
  stepSize: number;
  /** True iff the tolerance criterion fired on this iteration (final step). */
  converged: boolean;
}

export interface GradientDescentOpts {
  /** Objective. Pure; no side effects. */
  f: (params: readonly number[]) => number;
  /** Initial θ vector. Length determines optimizer dimensionality. */
  initial: readonly number[];
  /** Fixed default step size; D-02 (conservative, deterministic). */
  learningRate?: number;
  /** Polyak momentum coefficient β; D-03. */
  momentum?: number;
  /** Hard cap on iterations. */
  maxSteps?: number;
  /** Convergence threshold on consecutive energy deltas. */
  tolerance?: number;
  /** Finite-difference step ε for ∇f. */
  epsilon?: number;
  /** Multiplier applied to learningRate on overshoot retry; D-02. */
  adaptiveGuardFactor?: number;
}

const DEFAULT_LR = 0.05;
const DEFAULT_MOMENTUM = 0.85;
const DEFAULT_MAX_STEPS = 200;
const DEFAULT_TOLERANCE = 1e-4;
const DEFAULT_EPSILON = 1e-4;
const DEFAULT_GUARD = 0.5;

const centralGradient = (
  f: (p: readonly number[]) => number,
  params: readonly number[],
  eps: number,
): number[] => {
  const dim = params.length;
  const grad = new Array<number>(dim);
  const plus = params.slice();
  const minus = params.slice();
  for (let i = 0; i < dim; i++) {
    const p = params[i];
    plus[i] = p + eps;
    minus[i] = p - eps;
    grad[i] = (f(plus) - f(minus)) / (2 * eps);
    plus[i] = p;
    minus[i] = p;
  }
  return grad;
};

/**
 * Finite-difference gradient descent with momentum + small one-shot
 * adaptive guard. Deterministic; no `Math.random`, no `Date.now()`.
 *
 * Per iteration k (D-01..D-03):
 *   1. ∇f(θ_k) by central finite differences (step ε = `epsilon`).
 *   2. v_{k+1} = β·v_k − η·∇f(θ_k);  θ_{k+1} = θ_k + v_{k+1}   (full step)
 *   3. If `f(θ_{k+1}) > f(θ_k)`: halve η (multiply by `adaptiveGuardFactor`)
 *      and retry **once**. If the retry is still uphill, hold params
 *      and zero the velocity — the recorded `stepSize` still reflects
 *      the halved η. This is *not* full Armijo backtracking: at most
 *      one retry per iteration (D-02 explicit, plan §06-01).
 *
 * Convergence: `|f(θ_{k+1}) − f(θ_k)| < tolerance` for two iterations
 * in a row OR `iteration === maxSteps`. The final step's `converged`
 * flag is `true` iff the tolerance criterion fired.
 */
export const gradientDescent = (opts: GradientDescentOpts): OptimizerStep[] => {
  const { f, initial } = opts;
  const lr = opts.learningRate ?? DEFAULT_LR;
  const momentum = opts.momentum ?? DEFAULT_MOMENTUM;
  const maxSteps = opts.maxSteps ?? DEFAULT_MAX_STEPS;
  const tolerance = opts.tolerance ?? DEFAULT_TOLERANCE;
  const eps = opts.epsilon ?? DEFAULT_EPSILON;
  const guard = opts.adaptiveGuardFactor ?? DEFAULT_GUARD;

  const dim = initial.length;
  let params = initial.slice();
  let velocity = new Array<number>(dim).fill(0);
  let energy = f(params);
  let grad = centralGradient(f, params, eps);

  const steps: OptimizerStep[] = [
    {
      iteration: 0,
      params: params.slice(),
      energy,
      gradient: grad.slice(),
      stepSize: 0,
      converged: false,
    },
  ];

  let consecutiveBelowTol = 0;

  for (let k = 1; k <= maxSteps; k++) {
    // Full-rate momentum step
    let effectiveLR = lr;
    let trialVel = velocity.map((v, i) => momentum * v - effectiveLR * grad[i]);
    let trialParams = params.map((p, i) => p + trialVel[i]);
    let trialEnergy = f(trialParams);

    // One-shot adaptive guard (D-02)
    if (trialEnergy > energy) {
      effectiveLR = lr * guard;
      trialVel = velocity.map((v, i) => momentum * v - effectiveLR * grad[i]);
      trialParams = params.map((p, i) => p + trialVel[i]);
      trialEnergy = f(trialParams);

      if (trialEnergy > energy) {
        // Retry still uphill — keep params, drop momentum. Preserves
        // monotonic energy without spawning a second retry.
        trialVel = new Array<number>(dim).fill(0);
        trialParams = params.slice();
        trialEnergy = energy;
      }
    }

    const prevEnergy = energy;
    params = trialParams;
    velocity = trialVel;
    energy = trialEnergy;

    if (Math.abs(energy - prevEnergy) < tolerance) consecutiveBelowTol += 1;
    else consecutiveBelowTol = 0;

    const converged = consecutiveBelowTol >= 2;

    steps.push({
      iteration: k,
      params: params.slice(),
      energy,
      gradient: grad.slice(),
      stepSize: effectiveLR,
      converged,
    });

    if (converged) break;
    // Recompute gradient at the post-step params for the next iteration
    grad = centralGradient(f, params, eps);
  }

  return steps;
};

/* ---------- H₂ analytic surface ---------- */

const E_OFFSET = -0.137;
const A = 0.5;
const H2_MIN_ENERGY = -1.137;

/**
 * Pedagogical analytic H₂ ground-state energy surface as a function of
 * the two ansatz angles θ₁, θ₂. Periodic in 2π in both arguments. See
 * the top-of-file citation block for the reference and the rationale
 * for the separable form.
 */
export const h2Energy = (theta1: number, theta2: number): number =>
  E_OFFSET + A * Math.cos(theta1) + A * Math.cos(theta2);

/**
 * Documented global minimum of `h2Energy`. Frozen so callers can rely
 * on the values not mutating across the page lifecycle.
 */
export const H2_TRUE_MINIMUM: {
  readonly theta1: number;
  readonly theta2: number;
  readonly energy: number;
} = Object.freeze({
  theta1: Math.PI,
  theta2: Math.PI,
  energy: H2_MIN_ENERGY,
});

/* ---------- Surface sampling + interpolation (for EnergyLandscape) ---------- */

export interface SampledSurface {
  /** Row-major grid×grid samples; index = j·grid + i. */
  values: Float64Array;
  /** Edge length of the sample grid (50 per D-13). */
  grid: number;
  /** `[θ_min, θ_max]` applied to both dimensions. */
  range: [number, number];
  /** Smallest sampled value. */
  min: number;
  /** Largest sampled value. */
  max: number;
}

/**
 * Sample `f(t1, t2)` on a `grid × grid` uniform mesh covering `range²`.
 * Cell width = `(range[1] − range[0]) / grid`; sample positions are
 * `range[0] + i · cellWidth` for `i ∈ [0, grid)`. With `grid = 50` and
 * `range = [0, 2π]` (the defaults), index `i = 25` lands exactly at π,
 * so the H₂ minimum is sampled with no discretisation error.
 */
export const sampleSurface = (
  f: (t1: number, t2: number) => number,
  grid: number,
  range: [number, number] = [0, 2 * Math.PI],
): SampledSurface => {
  if (!Number.isInteger(grid) || grid < 2) {
    throw new RangeError(
      `sampleSurface: grid must be integer ≥ 2, got ${grid}`,
    );
  }
  const step = (range[1] - range[0]) / grid;
  const values = new Float64Array(grid * grid);
  let min = Infinity;
  let max = -Infinity;
  for (let j = 0; j < grid; j++) {
    const t2 = range[0] + j * step;
    for (let i = 0; i < grid; i++) {
      const t1 = range[0] + i * step;
      const v = f(t1, t2);
      values[j * grid + i] = v;
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  return { values, grid, range, min, max };
};

/**
 * Bilinear interpolation of a `SampledSurface` at arbitrary (θ₁, θ₂).
 * Clamps to grid bounds. At exact sample positions returns the sample
 * value (to floating tolerance); at the midpoint of a cell returns the
 * mean of the four enclosing samples.
 */
export const interpolateSurface = (
  sampled: SampledSurface,
  theta1: number,
  theta2: number,
): number => {
  const { values, grid, range } = sampled;
  const step = (range[1] - range[0]) / grid;
  const x = (theta1 - range[0]) / step;
  const y = (theta2 - range[0]) / step;
  const xc = Math.max(0, Math.min(x, grid - 1));
  const yc = Math.max(0, Math.min(y, grid - 1));
  const i0 = Math.floor(xc);
  const j0 = Math.floor(yc);
  const i1 = Math.min(i0 + 1, grid - 1);
  const j1 = Math.min(j0 + 1, grid - 1);
  const fx = xc - i0;
  const fy = yc - j0;
  const v00 = values[j0 * grid + i0];
  const v10 = values[j0 * grid + i1];
  const v01 = values[j1 * grid + i0];
  const v11 = values[j1 * grid + i1];
  return (
    v00 * (1 - fx) * (1 - fy) +
    v10 * fx * (1 - fy) +
    v01 * (1 - fx) * fy +
    v11 * fx * fy
  );
};

/* ---------- Reseed seeds (D-04, D-05) ---------- */

const PI = Math.PI;

/**
 * Six deterministic `[θ₁, θ₂]` starts cycled by the `EnergyLandscape`
 * Reseed button (D-05). All entries are inside `(0, 2π)²`, all are
 * distinct, none equals `H2_TRUE_MINIMUM`, and every entry converges
 * to the minimum under `gradientDescent` with default options
 * (asserted in `tests/quantum/vqe.test.ts`).
 *
 * `DEFAULT_INITIAL_THETAS` is `RESEED_SEEDS[0]` — the canonical
 * fixed-seed start used on first page load (D-04).
 */
export const RESEED_SEEDS: ReadonlyArray<readonly [number, number]> = [
  [PI / 4, PI / 4],
  [(3 * PI) / 4, PI / 4],
  [PI / 4, (3 * PI) / 4],
  [(3 * PI) / 4, (3 * PI) / 4],
  [PI / 2, (7 * PI) / 4],
  [(3 * PI) / 2, PI / 2],
];

export const DEFAULT_INITIAL_THETAS: readonly [number, number] = RESEED_SEEDS[0];
