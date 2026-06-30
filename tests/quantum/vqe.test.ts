/**
 * VQE optimizer + H₂ surface correctness tests.
 *
 * Locks the math half of ALG-08 (PHASE-CONTEXT D-01..D-07):
 *   1. `gradientDescent` converges on a 1D parabola from x = 0 with the
 *      default options, within `1e-4` energy tolerance and ≤ 100
 *      iterations, and the recorded energy sequence is monotonically
 *      non-increasing across guard retries.
 *   2. `gradientDescent` converges on `h2Energy` to within `1e-3` of
 *      `H2_TRUE_MINIMUM.energy` from every `RESEED_SEEDS` start.
 *   3. Determinism — two runs with identical opts are byte-identical.
 *   4. Adaptive guard fires on a constructed overshoot and the recorded
 *      `stepSize` is `learningRate * adaptiveGuardFactor`.
 *   5. `sampleSurface(h2Energy, 50, [0, 2π])` produces 2500 finite
 *      samples with `min ≤ H2_TRUE_MINIMUM.energy + 1e-3` and
 *      `max > min`; the on-grid minimum is the true minimum to
 *      floating tolerance because (π, π) lands exactly on a sample.
 *   6. `interpolateSurface` bilinear: exact at sample corners, mean of
 *      four corners at cell midpoint.
 *   7. `RESEED_SEEDS` discipline — ≥ 4 entries, all distinct, all
 *      finite-pair, none equals `H2_TRUE_MINIMUM`, only the first
 *      equals `DEFAULT_INITIAL_THETAS`.
 */

import { describe, expect, it } from "vitest";

import {
  DEFAULT_INITIAL_THETAS,
  gradientDescent,
  H2_TRUE_MINIMUM,
  h2Energy,
  interpolateSurface,
  RESEED_SEEDS,
  sampleSurface,
} from "../../src/lib/quantum/vqe";

const PI = Math.PI;

describe("gradientDescent on a 1D parabola", () => {
  const f = (p: readonly number[]) => (p[0] - 3) ** 2 + 1;

  const steps = gradientDescent({ f, initial: [0] });
  const final = steps[steps.length - 1];

  it("converges to (x ≈ 3, f ≈ 1) within 1e-4 tolerance and ≤ 100 iterations", () => {
    expect(final.iteration).toBeLessThanOrEqual(100);
    expect(final.converged).toBe(true);
    expect(Math.abs(final.energy - 1)).toBeLessThan(1e-4);
    expect(Math.abs(final.params[0] - 3)).toBeLessThan(1e-2);
  });

  it("records a monotonically non-increasing energy sequence (incl. guard retries)", () => {
    for (let i = 1; i < steps.length; i++) {
      // Allow floating slop of 1e-12 (cosmetic; the algorithm never
      // accepts an uphill step in practice).
      expect(steps[i].energy).toBeLessThanOrEqual(steps[i - 1].energy + 1e-12);
    }
  });
});

describe("gradientDescent on h2Energy from each RESEED_SEEDS start", () => {
  const f = (p: readonly number[]) => h2Energy(p[0], p[1]);

  for (const [theta1, theta2] of RESEED_SEEDS) {
    it(`converges to within 1e-3 Hₐ of H2_TRUE_MINIMUM.energy from [${theta1.toFixed(3)}, ${theta2.toFixed(3)}]`, () => {
      const steps = gradientDescent({ f, initial: [theta1, theta2] });
      const final = steps[steps.length - 1];
      expect(Math.abs(final.energy - H2_TRUE_MINIMUM.energy)).toBeLessThan(1e-3);
    });
  }
});

describe("gradientDescent determinism", () => {
  it("produces byte-identical OptimizerStep[] arrays across two runs with identical opts", () => {
    const f = (p: readonly number[]) => h2Energy(p[0], p[1]);
    const opts = { f, initial: [PI / 4, PI / 4] };
    const r1 = gradientDescent(opts);
    const r2 = gradientDescent(opts);
    expect(r1).toEqual(r2);
  });

  it("produces byte-identical runs on the parabola too", () => {
    const f = (p: readonly number[]) => (p[0] - 3) ** 2 + 1;
    const r1 = gradientDescent({ f, initial: [0] });
    const r2 = gradientDescent({ f, initial: [0] });
    expect(r1).toEqual(r2);
  });
});

describe("adaptive guard", () => {
  it("halves the effective step when a full-rate step overshoots", () => {
    // Parabola from x = 0 with LR = 1.5, no momentum:
    //   full step: v = -1.5·(-6) = 9  → p = 9  → f = 37 > 10. Overshoot.
    //   retry:     v = -0.75·(-6) = 4.5 → p = 4.5 → f = 3.25 < 10. Accept.
    // Recorded stepSize must be 0.5 · 1.5 = 0.75.
    const f = (p: readonly number[]) => (p[0] - 3) ** 2 + 1;
    const steps = gradientDescent({
      f,
      initial: [0],
      learningRate: 1.5,
      momentum: 0,
      maxSteps: 5,
    });
    expect(steps[1].stepSize).toBeCloseTo(0.75, 10);
    // Sanity: the guard's retry was accepted (energy dropped).
    expect(steps[1].energy).toBeLessThan(steps[0].energy);
  });

  it("respects a custom adaptiveGuardFactor", () => {
    const f = (p: readonly number[]) => (p[0] - 3) ** 2 + 1;
    const steps = gradientDescent({
      f,
      initial: [0],
      learningRate: 1.5,
      momentum: 0,
      maxSteps: 5,
      adaptiveGuardFactor: 0.25,
    });
    // Same overshoot scenario; retry now uses LR · 0.25 = 0.375.
    expect(steps[1].stepSize).toBeCloseTo(0.375, 10);
  });
});

describe("sampleSurface(h2Energy, 50, [0, 2π])", () => {
  const sampled = sampleSurface(h2Energy, 50, [0, 2 * PI]);

  it("produces a 50×50 grid of 2500 finite samples", () => {
    expect(sampled.grid).toBe(50);
    expect(sampled.values.length).toBe(2500);
    for (const v of sampled.values) expect(Number.isFinite(v)).toBe(true);
  });

  it("brackets the H₂ minimum and has max > min", () => {
    expect(sampled.min).toBeLessThanOrEqual(H2_TRUE_MINIMUM.energy + 1e-3);
    expect(sampled.max).toBeGreaterThan(sampled.min);
  });

  it("hits the true minimum exactly because (π, π) lands on grid index (25, 25)", () => {
    // Discretisation step is 2π/50 ≈ 0.126; sample i=25 → θ = π exactly.
    // So the on-grid minimum equals the true minimum to floating tolerance.
    expect(Math.abs(sampled.min - H2_TRUE_MINIMUM.energy)).toBeLessThan(1e-12);
    const piIndex = sampled.values[25 * 50 + 25];
    expect(Math.abs(piIndex - H2_TRUE_MINIMUM.energy)).toBeLessThan(1e-12);
  });

  it("rejects out-of-range grid arguments", () => {
    expect(() => sampleSurface(h2Energy, 1)).toThrow(/integer/);
    expect(() => sampleSurface(h2Energy, 2.5)).toThrow(/integer/);
  });
});

describe("interpolateSurface bilinear correctness", () => {
  const sampled = sampleSurface(h2Energy, 50, [0, 2 * PI]);
  const step = (2 * PI) / 50;

  it("returns the exact sampled value at every grid corner (within 1e-12)", () => {
    for (let j = 0; j < 50; j++) {
      for (let i = 0; i < 50; i++) {
        const theta1 = i * step;
        const theta2 = j * step;
        const got = interpolateSurface(sampled, theta1, theta2);
        const want = sampled.values[j * 50 + i];
        expect(Math.abs(got - want)).toBeLessThan(1e-12);
      }
    }
  });

  it("returns the mean of the four enclosing samples at a cell midpoint", () => {
    const i = 10;
    const j = 20;
    const theta1 = (i + 0.5) * step;
    const theta2 = (j + 0.5) * step;
    const v00 = sampled.values[j * 50 + i];
    const v10 = sampled.values[j * 50 + (i + 1)];
    const v01 = sampled.values[(j + 1) * 50 + i];
    const v11 = sampled.values[(j + 1) * 50 + (i + 1)];
    const want = (v00 + v10 + v01 + v11) / 4;
    const got = interpolateSurface(sampled, theta1, theta2);
    expect(Math.abs(got - want)).toBeLessThan(1e-12);
  });
});

describe("RESEED_SEEDS discipline", () => {
  it("has at least 4 entries and DEFAULT_INITIAL_THETAS = RESEED_SEEDS[0]", () => {
    expect(RESEED_SEEDS.length).toBeGreaterThanOrEqual(4);
    expect(DEFAULT_INITIAL_THETAS[0]).toBe(RESEED_SEEDS[0][0]);
    expect(DEFAULT_INITIAL_THETAS[1]).toBe(RESEED_SEEDS[0][1]);
  });

  it("every entry is a 2-tuple of finite numbers", () => {
    for (const seed of RESEED_SEEDS) {
      expect(seed.length).toBe(2);
      expect(Number.isFinite(seed[0])).toBe(true);
      expect(Number.isFinite(seed[1])).toBe(true);
    }
  });

  it("no two entries are exactly equal", () => {
    for (let i = 0; i < RESEED_SEEDS.length; i++) {
      for (let j = i + 1; j < RESEED_SEEDS.length; j++) {
        const sameTheta1 = RESEED_SEEDS[i][0] === RESEED_SEEDS[j][0];
        const sameTheta2 = RESEED_SEEDS[i][1] === RESEED_SEEDS[j][1];
        expect(sameTheta1 && sameTheta2).toBe(false);
      }
    }
  });

  it("no entry equals H2_TRUE_MINIMUM", () => {
    for (const seed of RESEED_SEEDS) {
      const isMinimum =
        seed[0] === H2_TRUE_MINIMUM.theta1 &&
        seed[1] === H2_TRUE_MINIMUM.theta2;
      expect(isMinimum).toBe(false);
    }
  });

  it("only the first entry equals DEFAULT_INITIAL_THETAS", () => {
    for (let i = 1; i < RESEED_SEEDS.length; i++) {
      const matchesDefault =
        RESEED_SEEDS[i][0] === DEFAULT_INITIAL_THETAS[0] &&
        RESEED_SEEDS[i][1] === DEFAULT_INITIAL_THETAS[1];
      expect(matchesDefault).toBe(false);
    }
  });
});
