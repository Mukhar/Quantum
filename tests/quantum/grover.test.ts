/**
 * Grover correctness tests.
 *
 * The essay's value proposition is *real* math — these tests are
 * non-negotiable. We pin:
 *   - the textbook optimal iteration formula `⌊(π/4)·√N⌋`,
 *   - uniform superposition equals `1/N` per basis state,
 *   - phase oracle flips exactly the marked amplitude,
 *   - diffusion equals `2·mean - aᵢ` to floating tolerance,
 *   - amplitude amplification concentrates probability on the marked
 *     state after `k_opt` iterations for `N = 4, 8, 16`,
 *   - `buildGroverCircuit` round-trips through `validateCircuit`,
 *     `encodeCircuit`, and `toQiskit`.
 */

import { describe, expect, it } from "vitest";

import {
  applyDiffusion,
  applyPhaseOracle,
  basisLabels,
  buildGroverCircuit,
  optimalGroverIterations,
  prepareUniform,
  runGrover,
} from "../../src/lib/quantum/grover";
import { Simulator } from "../../src/lib/quantum/simulator";
import { encodeCircuit, decodeCircuit, validateCircuit } from "../../src/lib/quantum";
import { toQiskit } from "../../src/lib/quantum/qiskit";

const approx = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) < eps;

describe("optimalGroverIterations", () => {
  it("matches the textbook formula for N = 4, 8, 16", () => {
    expect(optimalGroverIterations(4)).toBe(1);
    expect(optimalGroverIterations(8)).toBe(2);
    expect(optimalGroverIterations(16)).toBe(3);
  });

  it("rejects non-powers of two", () => {
    expect(() => optimalGroverIterations(6)).toThrow(/power of two/);
    expect(() => optimalGroverIterations(10)).toThrow(/power of two/);
  });

  it("rejects out-of-range N", () => {
    expect(() => optimalGroverIterations(1)).toThrow(/integer in/);
    expect(() => optimalGroverIterations(32)).toThrow(/integer in/);
    expect(() => optimalGroverIterations(0)).toThrow(/integer in/);
    expect(() => optimalGroverIterations(2.5)).toThrow(/integer in/);
  });
});

describe("basisLabels", () => {
  it("pads to the qubit width", () => {
    expect(basisLabels(1)).toEqual(["|0⟩", "|1⟩"]);
    expect(basisLabels(2)).toEqual(["|00⟩", "|01⟩", "|10⟩", "|11⟩"]);
    expect(basisLabels(3)).toHaveLength(8);
    expect(basisLabels(3)[5]).toBe("|101⟩");
    expect(basisLabels(4)).toHaveLength(16);
    expect(basisLabels(4)[11]).toBe("|1011⟩");
  });

  it("rejects out-of-range qubit counts", () => {
    expect(() => basisLabels(0)).toThrow(/integer in/);
    expect(() => basisLabels(5)).toThrow(/integer in/);
  });
});

describe("prepareUniform", () => {
  for (const q of [1, 2, 3, 4] as const) {
    it(`gives uniform 1/N probability for ${q} qubit(s)`, () => {
      const sim = new Simulator({ qubits: q });
      prepareUniform(sim);
      const probs = sim.probabilities();
      const want = 1 / probs.length;
      for (const p of probs) expect(approx(p, want, 1e-12)).toBe(true);
    });
  }
});

describe("applyPhaseOracle", () => {
  it("flips only the marked amplitude on a 4-qubit uniform state", () => {
    for (const marked of [0, 5, 11]) {
      const sim = new Simulator({ qubits: 4 });
      prepareUniform(sim);
      const before = sim.state.map((a) => ({ ...a }));
      applyPhaseOracle(sim, marked);
      for (let i = 0; i < sim.state.length; i++) {
        if (i === marked) {
          expect(approx(sim.state[i].re, -before[i].re, 1e-12)).toBe(true);
          expect(approx(sim.state[i].im, -before[i].im, 1e-12)).toBe(true);
        } else {
          expect(approx(sim.state[i].re, before[i].re, 1e-12)).toBe(true);
          expect(approx(sim.state[i].im, before[i].im, 1e-12)).toBe(true);
        }
      }
    }
  });

  it("rejects out-of-range markedIndex", () => {
    const sim = new Simulator({ qubits: 2 });
    expect(() => applyPhaseOracle(sim, -1)).toThrow(/integer in/);
    expect(() => applyPhaseOracle(sim, 4)).toThrow(/integer in/);
    expect(() => applyPhaseOracle(sim, 1.5)).toThrow(/integer in/);
  });
});

describe("applyDiffusion", () => {
  it("implements aᵢ ↦ 2·mean − aᵢ for a 2-qubit seeded state", () => {
    const sim = new Simulator({ qubits: 2 });
    // Seed a known real-amplitude state. (Not normalized — diffusion is
    // linear, so the formula check is independent of normalization.)
    sim.state = [
      { re: 0.5, im: 0 },
      { re: 0.5, im: 0 },
      { re: 0.5, im: 0 },
      { re: -0.5, im: 0 },
    ];
    const mean = (0.5 + 0.5 + 0.5 - 0.5) / 4; // 0.25
    applyDiffusion(sim);
    const want = [
      2 * mean - 0.5,
      2 * mean - 0.5,
      2 * mean - 0.5,
      2 * mean - -0.5,
    ];
    for (let i = 0; i < 4; i++) {
      expect(approx(sim.state[i].re, want[i], 1e-12)).toBe(true);
      expect(approx(sim.state[i].im, 0, 1e-12)).toBe(true);
    }
  });

  it("preserves normalization on the Grover ½(|00⟩+|01⟩+|10⟩−|11⟩) state", () => {
    // The oracle output for uniform 2-qubit input with marked = |11⟩.
    const sim = new Simulator({ qubits: 2 });
    sim.state = [
      { re: 0.5, im: 0 },
      { re: 0.5, im: 0 },
      { re: 0.5, im: 0 },
      { re: -0.5, im: 0 },
    ];
    applyDiffusion(sim);
    const total = sim.probabilities().reduce((s, p) => s + p, 0);
    expect(approx(total, 1, 1e-10)).toBe(true);
  });
});

describe("runGrover — amplitude concentration", () => {
  for (const qubits of [2, 3, 4] as const) {
    it(`drives a non-zero marked state to the dominant bucket for ${qubits} qubit(s)`, () => {
      const N = 1 << qubits;
      // Pick a non-zero marked index that exercises bit patterns.
      const marked = qubits === 2 ? 3 : qubits === 3 ? 5 : 11;
      const snaps = runGrover({ qubits, markedIndex: marked });

      // First snapshot is the uniform superposition.
      expect(snaps[0].iteration).toBe(0);
      expect(approx(snaps[0].markedProbability, 1 / N, 1e-12)).toBe(true);

      // Last snapshot's marked probability is the maximum across all bases.
      const last = snaps[snaps.length - 1];
      const maxProb = Math.max(...last.probabilities);
      expect(approx(last.markedProbability, maxProb, 1e-12)).toBe(true);

      // Every snapshot stays normalized.
      for (const snap of snaps) {
        const total = snap.probabilities.reduce((s, p) => s + p, 0);
        expect(approx(total, 1, 1e-10)).toBe(true);
      }
    });
  }

  it("reaches a comfortably high marked probability for N = 16", () => {
    const snaps = runGrover({ qubits: 4, markedIndex: 11 });
    const last = snaps[snaps.length - 1];
    expect(last.markedProbability).toBeGreaterThan(0.9);
  });

  it("starts at P = 1/16 for the 4-qubit uniform superposition", () => {
    const snaps = runGrover({ qubits: 4, markedIndex: 11 });
    expect(approx(snaps[0].markedProbability, 1 / 16, 1e-12)).toBe(true);
  });

  it("honors a custom iteration override and caps to a sane maximum", () => {
    const snaps = runGrover({ qubits: 4, markedIndex: 11, iterations: 0 });
    expect(snaps).toHaveLength(1);
    expect(snaps[0].iteration).toBe(0);

    // Overshoot beyond the cap collapses to a finite snapshot count.
    const huge = runGrover({ qubits: 4, markedIndex: 11, iterations: 10000 });
    expect(huge.length).toBeLessThanOrEqual(64);
    expect(huge.length).toBeGreaterThan(optimalGroverIterations(16));
  });

  it("rejects bogus options", () => {
    expect(() => runGrover({ qubits: 5, markedIndex: 0 })).toThrow();
    expect(() => runGrover({ qubits: 4, markedIndex: -1 })).toThrow();
    expect(() => runGrover({ qubits: 4, markedIndex: 16 })).toThrow();
    expect(() => runGrover({ qubits: 4, markedIndex: 0, iterations: -1 })).toThrow();
  });

  it("includes correct basisLabels in each snapshot", () => {
    const snaps = runGrover({ qubits: 4, markedIndex: 11 });
    expect(snaps[0].basisLabels).toEqual(basisLabels(4));
  });
});

describe("buildGroverCircuit", () => {
  it("returns a circuit that validates, encodes, and exports to Qiskit", () => {
    const circuit = buildGroverCircuit(4, 3, 1);
    expect(() => validateCircuit(circuit)).not.toThrow();
    const encoded = encodeCircuit(circuit);
    expect(typeof encoded).toBe("string");
    const decoded = decodeCircuit(encoded);
    expect(decoded.qubits).toBe(2);
    const qiskit = toQiskit(circuit);
    expect(qiskit).toContain("from qiskit import QuantumCircuit");
    expect(qiskit).toContain("qc = QuantumCircuit(2, 2)");
    expect(qiskit).toContain("qc.cx(0, 1)");
    expect(qiskit).toContain("qc.h(");
  });

  it("rejects unsupported variants with explicit messages", () => {
    expect(() => buildGroverCircuit(8, 3, 1)).toThrow(/N === 4/);
    expect(() => buildGroverCircuit(4, 2, 1)).toThrow(/marked === 3/);
    expect(() => buildGroverCircuit(4, 3, 2)).toThrow(/iterations === 1/);
    expect(() => buildGroverCircuit(4, -1, 1)).toThrow(/integer in/);
  });
});
