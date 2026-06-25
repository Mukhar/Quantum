/**
 * Parameterized rotation gates — textbook correctness.
 *
 * Every "play with a slider" widget in the site routes through these.
 * If any of these tests goes red, the whole interactive premise dies.
 *
 * We check probabilities (not raw amplitudes) wherever a global phase
 * makes amplitude comparison brittle. Where amplitudes are real and
 * unambiguous (e.g. Ry on the computational basis), we check those too.
 */

import { describe, expect, it } from "vitest";
import { Simulator } from "../../src/lib/quantum/simulator";

const approx = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) < eps;

const expectProbs = (got: number[], want: number[], eps = 1e-9) => {
  expect(got.length).toBe(want.length);
  for (let i = 0; i < got.length; i++) {
    expect(approx(got[i], want[i], eps), `index ${i}: got ${got[i]}, want ${want[i]}`).toBe(true);
  }
};

const PI = Math.PI;

describe("Rotation gates — Rx", () => {
  it("Rx(π) ≈ X (up to global phase) on |0⟩ → probabilities [0, 1]", () => {
    const sim = new Simulator({ qubits: 1 });
    sim.applyRotation("Rx", 0, PI);
    expectProbs(sim.probabilities(), [0, 1]);
  });

  it("Rx(2π) returns to original probabilities", () => {
    const sim = new Simulator({ qubits: 1 });
    sim.applyRotation("Rx", 0, 2 * PI);
    expectProbs(sim.probabilities(), [1, 0]);
  });

  it("Rx(π/2) on |0⟩ → equal probabilities", () => {
    const sim = new Simulator({ qubits: 1 });
    sim.applyRotation("Rx", 0, PI / 2);
    expectProbs(sim.probabilities(), [0.5, 0.5]);
  });
});

describe("Rotation gates — Ry", () => {
  it("Ry(π) on |0⟩ → |1⟩ (probabilities [0, 1])", () => {
    const sim = new Simulator({ qubits: 1 });
    sim.applyRotation("Ry", 0, PI);
    expectProbs(sim.probabilities(), [0, 1]);
  });

  it("Ry(π/2) on |0⟩ → |+⟩ with real amplitudes [1/√2, 1/√2]", () => {
    const sim = new Simulator({ qubits: 1 });
    sim.applyRotation("Ry", 0, PI / 2);
    expectProbs(sim.probabilities(), [0.5, 0.5]);
    // Ry is real-valued, so amplitudes should be too.
    expect(approx(sim.state[0].im, 0)).toBe(true);
    expect(approx(sim.state[1].im, 0)).toBe(true);
    expect(approx(sim.state[0].re, Math.SQRT1_2)).toBe(true);
    expect(approx(sim.state[1].re, Math.SQRT1_2)).toBe(true);
  });

  it("Ry composes additively: Ry(π/3) Ry(π/3) Ry(π/3) ≈ Ry(π)", () => {
    const a = new Simulator({ qubits: 1 });
    a.applyRotation("Ry", 0, PI / 3);
    a.applyRotation("Ry", 0, PI / 3);
    a.applyRotation("Ry", 0, PI / 3);
    expectProbs(a.probabilities(), [0, 1], 1e-9);
  });
});

describe("Rotation gates — Rz", () => {
  it("Rz(π) on |0⟩ leaves probabilities unchanged (phase only)", () => {
    const sim = new Simulator({ qubits: 1 });
    sim.applyRotation("Rz", 0, PI);
    expectProbs(sim.probabilities(), [1, 0]);
  });

  it("Rz(π) on |+⟩ → |−⟩ (probabilities still [0.5, 0.5] but phase flipped)", () => {
    const sim = new Simulator({ qubits: 1 });
    sim.apply("H", 0); // |+⟩
    sim.applyRotation("Rz", 0, PI);
    expectProbs(sim.probabilities(), [0.5, 0.5]);
    // H then Rz(π) then H should give |1⟩ (HZH = X)
    sim.apply("H", 0);
    expectProbs(sim.probabilities(), [0, 1]);
  });
});

describe("Rotation gates — composition identities", () => {
  it("Ry(π/2) Rz(π) Ry(-π/2) acts like X on |0⟩ (Bloch-sphere identity: rotating Z around Y by 90°)", () => {
    const sim = new Simulator({ qubits: 1 });
    sim.applyRotation("Ry", 0, -PI / 2);
    sim.applyRotation("Rz", 0, PI);
    sim.applyRotation("Ry", 0, PI / 2);
    expectProbs(sim.probabilities(), [0, 1]);
  });

  it("Rx(θ) Rx(-θ) is the identity (no drift)", () => {
    const sim = new Simulator({ qubits: 1 });
    const theta = 1.2345;
    sim.applyRotation("Rx", 0, theta);
    sim.applyRotation("Rx", 0, -theta);
    expectProbs(sim.probabilities(), [1, 0]);
  });

  it("probabilities sum to 1 after arbitrary rotation chain", () => {
    const sim = new Simulator({ qubits: 2 });
    sim.applyRotation("Rx", 0, 0.7);
    sim.applyRotation("Ry", 1, 1.3);
    sim.applyRotation("Rz", 0, -0.4);
    const total = sim.probabilities().reduce((a, b) => a + b, 0);
    expect(approx(total, 1)).toBe(true);
  });
});
