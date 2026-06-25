/**
 * Quantum simulator correctness tests.
 *
 * These are NON-NEGOTIABLE. The simulator's credibility — and therefore
 * the whole site's credibility — rests on these passing. Each test
 * encodes a known textbook result.
 */

import { describe, expect, it } from "vitest";
import { Simulator } from "../../src/lib/quantum/simulator";

const approx = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) < eps;

const expectProbs = (got: number[], want: number[]) => {
  expect(got.length).toBe(want.length);
  for (let i = 0; i < got.length; i++) {
    expect(approx(got[i], want[i]), `index ${i}: got ${got[i]}, want ${want[i]}`).toBe(true);
  }
};

describe("Simulator — single qubit", () => {
  it("starts in |0⟩", () => {
    const sim = new Simulator({ qubits: 1 });
    expectProbs(sim.probabilities(), [1, 0]);
  });

  it("X|0⟩ = |1⟩", () => {
    const sim = new Simulator({ qubits: 1 });
    sim.apply("X", 0);
    expectProbs(sim.probabilities(), [0, 1]);
  });

  it("H|0⟩ = equal superposition", () => {
    const sim = new Simulator({ qubits: 1 });
    sim.apply("H", 0);
    expectProbs(sim.probabilities(), [0.5, 0.5]);
  });

  it("H H |0⟩ = |0⟩ (Hadamard is its own inverse)", () => {
    const sim = new Simulator({ qubits: 1 });
    sim.apply("H", 0).apply("H", 0);
    expectProbs(sim.probabilities(), [1, 0]);
  });

  it("Z|0⟩ leaves |0⟩ unchanged", () => {
    const sim = new Simulator({ qubits: 1 });
    sim.apply("Z", 0);
    expectProbs(sim.probabilities(), [1, 0]);
  });

  it("HZH = X (operationally — probabilities match)", () => {
    const sim = new Simulator({ qubits: 1 });
    sim.apply("H", 0).apply("Z", 0).apply("H", 0);
    expectProbs(sim.probabilities(), [0, 1]);
  });
});

describe("Simulator — two qubits", () => {
  it("starts in |00⟩", () => {
    const sim = new Simulator({ qubits: 2 });
    expectProbs(sim.probabilities(), [1, 0, 0, 0]);
  });

  it("X on qubit 0 → |01⟩ (qubit 0 is LSB)", () => {
    const sim = new Simulator({ qubits: 2 });
    sim.apply("X", 0);
    expectProbs(sim.probabilities(), [0, 1, 0, 0]);
  });

  it("X on qubit 1 → |10⟩", () => {
    const sim = new Simulator({ qubits: 2 });
    sim.apply("X", 1);
    expectProbs(sim.probabilities(), [0, 0, 1, 0]);
  });

  it("Bell state: H(0) then CNOT(0,1) → (|00⟩ + |11⟩)/√2", () => {
    const sim = new Simulator({ qubits: 2 });
    sim.apply("H", 0);
    sim.apply("CNOT", 0, 1);
    expectProbs(sim.probabilities(), [0.5, 0, 0, 0.5]);
  });

  it("CNOT with control=0 leaves target alone", () => {
    const sim = new Simulator({ qubits: 2 });
    // Start in |00⟩, control bit is 0 — CNOT should be a no-op.
    sim.apply("CNOT", 0, 1);
    expectProbs(sim.probabilities(), [1, 0, 0, 0]);
  });

  it("CNOT with control=1 flips target: |01⟩ → |11⟩", () => {
    const sim = new Simulator({ qubits: 2 });
    sim.apply("X", 0); // → |01⟩
    sim.apply("CNOT", 0, 1); // q0=1, so flip q1 → |11⟩
    expectProbs(sim.probabilities(), [0, 0, 0, 1]);
  });
});

describe("Simulator — measurement", () => {
  it("measuring |0⟩ always returns 0", () => {
    const sim = new Simulator({ qubits: 1 });
    for (let i = 0; i < 100; i++) {
      expect(sim.measure()).toBe(0);
    }
  });

  it("measuring |1⟩ always returns 1", () => {
    const sim = new Simulator({ qubits: 1 });
    sim.apply("X", 0);
    for (let i = 0; i < 100; i++) {
      expect(sim.measure()).toBe(1);
    }
  });

  it("measure() with seeded RNG samples per probability distribution", () => {
    // Equal superposition: probabilities [0.5, 0.5]
    const sim = new Simulator({ qubits: 1 });
    sim.apply("H", 0);
    expect(sim.measure(() => 0.0)).toBe(0);
    expect(sim.measure(() => 0.49)).toBe(0);
    expect(sim.measure(() => 0.5)).toBe(1);
    expect(sim.measure(() => 0.99)).toBe(1);
  });

  it("basisLabel formats correctly", () => {
    const sim = new Simulator({ qubits: 2 });
    expect(sim.basisLabel(0)).toBe("|00⟩");
    expect(sim.basisLabel(1)).toBe("|01⟩");
    expect(sim.basisLabel(2)).toBe("|10⟩");
    expect(sim.basisLabel(3)).toBe("|11⟩");
  });
});

describe("Simulator — guards", () => {
  it("rejects qubits < 1", () => {
    expect(() => new Simulator({ qubits: 0 })).toThrow();
  });

  it("rejects qubits > 4 (v1 hard limit)", () => {
    expect(() => new Simulator({ qubits: 5 })).toThrow();
  });

  it("rejects out-of-range qubit indices", () => {
    const sim = new Simulator({ qubits: 2 });
    expect(() => sim.apply("X", 2)).toThrow();
    expect(() => sim.apply("X", -1)).toThrow();
  });

  it("rejects CNOT with same control and target", () => {
    const sim = new Simulator({ qubits: 2 });
    expect(() => sim.apply("CNOT", 0, 0)).toThrow();
  });
});

describe("Simulator — probability invariants", () => {
  it("probabilities always sum to 1", () => {
    const sim = new Simulator({ qubits: 3 });
    sim.apply("H", 0).apply("H", 1).apply("CNOT", 0, 2).apply("Z", 1);
    const total = sim.probabilities().reduce((a, b) => a + b, 0);
    expect(approx(total, 1, 1e-9)).toBe(true);
  });
});
