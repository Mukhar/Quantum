/**
 * Reduced-density-matrix tests — the math behind the per-qubit Bloch
 * spheres in the sandbox results panel.
 *
 * Coverage (each `it()` independently green-or-red, no shared mutation):
 *  - Single-qubit states pass through unchanged (ρ = |ψ⟩⟨ψ|, r = 1).
 *  - ρ is Hermitian and trace-1 for product and entangled inputs.
 *  - The Bloch vector derived from ρ matches `stateToBloch` /
 *    `blochToCartesian` for product states.
 *  - Bell state: r = 0 for both qubits (maximally mixed reduced state).
 *  - Off-diagonals vanish when the chosen qubit is in a computational
 *    eigenstate (|0⟩ or |1⟩) regardless of what the other qubit is doing.
 *  - Marginal probabilities equal the diagonal of ρ and sum to 1.
 *  - Index ordering matches `Simulator` (qubit 0 = LSB).
 *  - Shape validation rejects bad inputs.
 */

import { describe, expect, it } from "vitest";
import { Simulator } from "../../src/lib/quantum/simulator";
import { stateToBloch, blochToCartesian } from "../../src/lib/quantum/bloch";
import {
  reducedDensityMatrix,
  blochVectorFromRho,
  marginalProbabilities,
} from "../../src/lib/quantum/reducedDensity";
import type { Complex } from "../../src/lib/quantum/complex";

const EPS = 1e-9;
const approx = (a: number, b: number, eps = EPS) => Math.abs(a - b) < eps;

const assertHermitian = (rho: Complex[][]) => {
  expect(approx(rho[0][0].im, 0)).toBe(true);
  expect(approx(rho[1][1].im, 0)).toBe(true);
  expect(approx(rho[0][1].re, rho[1][0].re)).toBe(true);
  expect(approx(rho[0][1].im, -rho[1][0].im)).toBe(true);
};

const assertTraceOne = (rho: Complex[][]) => {
  expect(approx(rho[0][0].re + rho[1][1].re, 1)).toBe(true);
};

/* -------------------------------------------------------------------------- */
/* Single-qubit pass-through ------------------------------------------------- */

describe("reducedDensityMatrix — single qubit pass-through", () => {
  it("|0⟩ on 1 qubit ⇒ ρ = diag(1, 0), r = 1", () => {
    const sim = new Simulator({ qubits: 1 });
    const rho = reducedDensityMatrix(sim.state, 0, 1);
    assertHermitian(rho);
    assertTraceOne(rho);
    expect(approx(rho[0][0].re, 1)).toBe(true);
    expect(approx(rho[1][1].re, 0)).toBe(true);
    const v = blochVectorFromRho(rho);
    expect(approx(v.r, 1)).toBe(true);
    expect(approx(v.z, 1)).toBe(true);
  });

  it("H|0⟩ ⇒ Bloch r = 1 on the +x axis", () => {
    const sim = new Simulator({ qubits: 1 });
    sim.apply("H", 0);
    const v = blochVectorFromRho(reducedDensityMatrix(sim.state, 0, 1));
    expect(approx(v.r, 1, 1e-12)).toBe(true);
    expect(approx(v.x, 1, 1e-12)).toBe(true);
    expect(approx(v.y, 0, 1e-12)).toBe(true);
    expect(approx(v.z, 0, 1e-12)).toBe(true);
  });
});

/* -------------------------------------------------------------------------- */
/* Product state matches stateToBloch --------------------------------------- */

describe("blochVectorFromRho matches stateToBloch on product states", () => {
  it("|0⟩ ⊗ H|0⟩ — q0 at |+⟩, q1 at |0⟩", () => {
    const sim = new Simulator({ qubits: 2 });
    sim.apply("H", 0); // q0 → |+⟩
    // q1 untouched → |0⟩

    const v0 = blochVectorFromRho(reducedDensityMatrix(sim.state, 0, 2));
    const v1 = blochVectorFromRho(reducedDensityMatrix(sim.state, 1, 2));

    // q0 → +x
    expect(approx(v0.r, 1, 1e-12)).toBe(true);
    expect(approx(v0.x, 1, 1e-12)).toBe(true);
    expect(approx(v0.z, 0, 1e-12)).toBe(true);

    // q1 → +z
    expect(approx(v1.r, 1, 1e-12)).toBe(true);
    expect(approx(v1.z, 1, 1e-12)).toBe(true);
    expect(approx(v1.x, 0, 1e-12)).toBe(true);
  });

  it("Ry(π/3) on q0 (1 qubit) — Bloch matches blochToCartesian∘stateToBloch", () => {
    const sim = new Simulator({ qubits: 1 });
    sim.applyRotation("Ry", 0, Math.PI / 3);
    const fromRho = blochVectorFromRho(reducedDensityMatrix(sim.state, 0, 1));
    const fromState = blochToCartesian(stateToBloch(sim.state));
    expect(approx(fromRho.x, fromState.x, 1e-12)).toBe(true);
    expect(approx(fromRho.y, fromState.y, 1e-12)).toBe(true);
    expect(approx(fromRho.z, fromState.z, 1e-12)).toBe(true);
    expect(approx(fromRho.r, 1, 1e-12)).toBe(true);
  });
});

/* -------------------------------------------------------------------------- */
/* Bell state ---------------------------------------------------------------- */

describe("Bell state — entanglement ⇒ r = 0 on both qubits", () => {
  it("(|00⟩ + |11⟩)/√2 ⇒ ρ_0 = ρ_1 = I/2", () => {
    const sim = new Simulator({ qubits: 2 });
    sim.apply("H", 0);
    sim.apply("CNOT", 0, 1);

    for (const q of [0, 1]) {
      const rho = reducedDensityMatrix(sim.state, q, 2);
      assertHermitian(rho);
      assertTraceOne(rho);
      // Maximally mixed: diag(½, ½), off-diagonals zero.
      expect(approx(rho[0][0].re, 0.5, 1e-12)).toBe(true);
      expect(approx(rho[1][1].re, 0.5, 1e-12)).toBe(true);
      expect(approx(rho[0][1].re, 0, 1e-12)).toBe(true);
      expect(approx(rho[0][1].im, 0, 1e-12)).toBe(true);

      const v = blochVectorFromRho(rho);
      expect(approx(v.r, 0, 1e-12)).toBe(true);
    }
  });

  it("(|01⟩ + |10⟩)/√2 (anti-Bell) ⇒ both reduced states maximally mixed", () => {
    const sim = new Simulator({ qubits: 2 });
    sim.apply("X", 1);    // |10⟩
    sim.apply("H", 0);    // (|10⟩ + |11⟩)/√2
    sim.apply("CNOT", 0, 1); // (|10⟩ + |01⟩)/√2

    for (const q of [0, 1]) {
      const v = blochVectorFromRho(reducedDensityMatrix(sim.state, q, 2));
      expect(approx(v.r, 0, 1e-12)).toBe(true);
    }
  });
});

/* -------------------------------------------------------------------------- */
/* Off-diagonals vanish on eigenstates -------------------------------------- */

describe("Off-diagonals vanish for measurement-eigenstate qubits", () => {
  it("q1 in |0⟩, q0 arbitrary ⇒ ρ_1 off-diagonals = 0", () => {
    const sim = new Simulator({ qubits: 2 });
    sim.applyRotation("Ry", 0, 0.9);
    sim.applyRotation("Rz", 0, 0.3);
    // q1 untouched.

    const rho1 = reducedDensityMatrix(sim.state, 1, 2);
    expect(approx(rho1[0][1].re, 0, 1e-12)).toBe(true);
    expect(approx(rho1[0][1].im, 0, 1e-12)).toBe(true);
    expect(approx(rho1[1][0].re, 0, 1e-12)).toBe(true);
    expect(approx(rho1[1][0].im, 0, 1e-12)).toBe(true);
    expect(approx(rho1[0][0].re, 1, 1e-12)).toBe(true);
  });

  it("q0 in |1⟩, q1 arbitrary ⇒ ρ_0 = diag(0, 1)", () => {
    const sim = new Simulator({ qubits: 2 });
    sim.apply("X", 0);
    sim.apply("H", 1);
    sim.applyRotation("Rz", 1, 0.7);

    const rho0 = reducedDensityMatrix(sim.state, 0, 2);
    expect(approx(rho0[0][0].re, 0, 1e-12)).toBe(true);
    expect(approx(rho0[1][1].re, 1, 1e-12)).toBe(true);
    expect(approx(rho0[0][1].re, 0, 1e-12)).toBe(true);
    expect(approx(rho0[0][1].im, 0, 1e-12)).toBe(true);
  });
});

/* -------------------------------------------------------------------------- */
/* Marginal probabilities --------------------------------------------------- */

describe("marginalProbabilities", () => {
  it("matches the diagonal of ρ and sums to 1", () => {
    const sim = new Simulator({ qubits: 3 });
    sim.apply("H", 0);
    sim.apply("CNOT", 0, 1);
    sim.applyRotation("Ry", 2, 1.1);

    for (let q = 0; q < 3; q++) {
      const [p0, p1] = marginalProbabilities(sim.state, q, 3);
      const rho = reducedDensityMatrix(sim.state, q, 3);
      expect(approx(p0 + p1, 1, 1e-12)).toBe(true);
      expect(approx(p0, rho[0][0].re, 1e-12)).toBe(true);
      expect(approx(p1, rho[1][1].re, 1e-12)).toBe(true);
    }
  });
});

/* -------------------------------------------------------------------------- */
/* Qubit indexing (LSB) ----------------------------------------------------- */

describe("Qubit indexing matches Simulator (qubit 0 = LSB)", () => {
  it("3-qubit X on q2 only flips the high bit ⇒ q2 reads |1⟩, q0/q1 read |0⟩", () => {
    const sim = new Simulator({ qubits: 3 });
    sim.apply("X", 2);

    const [p0q0] = marginalProbabilities(sim.state, 0, 3);
    const [p0q1] = marginalProbabilities(sim.state, 1, 3);
    const [p0q2, p1q2] = marginalProbabilities(sim.state, 2, 3);

    expect(approx(p0q0, 1, 1e-12)).toBe(true);
    expect(approx(p0q1, 1, 1e-12)).toBe(true);
    expect(approx(p0q2, 0, 1e-12)).toBe(true);
    expect(approx(p1q2, 1, 1e-12)).toBe(true);
  });
});

/* -------------------------------------------------------------------------- */
/* Input validation --------------------------------------------------------- */

describe("Input validation", () => {
  it("throws on length / qubit mismatch", () => {
    const fakeState: Complex[] = [{ re: 1, im: 0 }, { re: 0, im: 0 }];
    expect(() => reducedDensityMatrix(fakeState, 0, 2)).toThrow(RangeError);
    expect(() => reducedDensityMatrix(fakeState, 5, 1)).toThrow(RangeError);
    expect(() => marginalProbabilities(fakeState, -1, 1)).toThrow(RangeError);
  });
});
