/**
 * State-vector quantum simulator.
 *
 * Tiny, dependency-free, and *real*. For n qubits we store 2^n complex
 * amplitudes. v1 caps n at 4 — that's 16 amplitudes, trivial to compute
 * but enough to teach every concept we care about.
 *
 * Layout: amplitude index `i` corresponds to the basis state whose binary
 * representation is `i`. Qubit 0 is the LEAST significant bit. So for 2
 * qubits:
 *
 *   index 0 → |00⟩   (q1=0, q0=0)
 *   index 1 → |01⟩   (q1=0, q0=1)
 *   index 2 → |10⟩   (q1=1, q0=0)
 *   index 3 → |11⟩   (q1=1, q0=1)
 *
 * This matches the convention used by Qiskit, which keeps mental-model
 * transfer easy for devs who eventually try the real thing.
 */

import {
  type Complex,
  ZERO,
  ONE,
  add,
  mul,
  normSquared,
} from "./complex";
import { type Gate2x2, type GateName, GATES, ROTATIONS, type RotationAxis } from "./gates";

const MAX_QUBITS = 4;

export interface SimulatorOptions {
  qubits: number;
}

export class Simulator {
  readonly qubits: number;
  /** Length 2^qubits. Mutated in place by gate applications. */
  state: Complex[];

  constructor({ qubits }: SimulatorOptions) {
    if (qubits < 1 || qubits > MAX_QUBITS) {
      throw new Error(`qubits must be between 1 and ${MAX_QUBITS}, got ${qubits}`);
    }
    this.qubits = qubits;
    this.state = new Array(1 << qubits).fill(null).map(() => ({ ...ZERO }));
    this.state[0] = { ...ONE }; // start in |0...0⟩
  }

  /** Apply a single-qubit gate, or CNOT(control, target). */
  apply(name: GateName, qubit: number): this;
  apply(name: "CNOT", control: number, target: number): this;
  apply(name: GateName | "CNOT", a: number, b?: number): this {
    if (name === "CNOT") {
      if (b === undefined) throw new Error("CNOT requires a target qubit");
      return this.applyCNOT(a, b);
    }
    return this.applySingle(GATES[name], a);
  }

  /**
   * Apply an arbitrary 2x2 gate to one qubit. We iterate pairs of indices
   * that differ only in `qubit`'s bit, then multiply each pair by the gate.
   */
  applySingle(gate: Gate2x2, qubit: number): this {
    this.assertQubit(qubit);
    const bit = 1 << qubit;
    const [g00, g01, g10, g11] = gate;

    for (let i = 0; i < this.state.length; i++) {
      if ((i & bit) !== 0) continue;
      const i0 = i;
      const i1 = i | bit;
      const a0 = this.state[i0];
      const a1 = this.state[i1];

      this.state[i0] = add(mul(g00, a0), mul(g01, a1));
      this.state[i1] = add(mul(g10, a0), mul(g11, a1));
    }
    return this;
  }

  /**
   * CNOT: flip `target` iff `control` is 1. Implemented as a swap of
   * amplitude pairs where control=1.
   */
  applyCNOT(control: number, target: number): this {
    this.assertQubit(control);
    this.assertQubit(target);
    if (control === target) throw new Error("CNOT control and target must differ");

    const cb = 1 << control;
    const tb = 1 << target;

    for (let i = 0; i < this.state.length; i++) {
      const controlOn = (i & cb) !== 0;
      const targetOn = (i & tb) !== 0;
      if (controlOn && !targetOn) {
        const j = i | tb;
        const tmp = this.state[i];
        this.state[i] = this.state[j];
        this.state[j] = tmp;
      }
    }
    return this;
  }

  /**
   * Apply a parameterized rotation gate (Rx/Ry/Rz) to a single qubit.
   * Kept separate from `apply()` so the discrete-gate API stays string-only
   * and the rotation API forces θ to be explicit.
   */
  applyRotation(axis: RotationAxis, qubit: number, theta: number): this {
    return this.applySingle(ROTATIONS[axis](theta), qubit);
  }

  /** P(outcome) for every basis state. Sums to 1 (up to floating error). */
  probabilities(): number[] {
    return this.state.map(normSquared);
  }

  /**
   * Sample a measurement outcome (collapses nothing — pure read).
   * Returns the basis-state index. Use {@link basisLabel} for a "|01⟩" string.
   */
  measure(rng: () => number = Math.random): number {
    const probs = this.probabilities();
    const roll = rng();
    let cumulative = 0;
    for (let i = 0; i < probs.length; i++) {
      cumulative += probs[i];
      if (roll < cumulative) return i;
    }
    return probs.length - 1; // floating-error safety net
  }

  /** "|01⟩" style label for a basis-state index. */
  basisLabel(index: number): string {
    return `|${index.toString(2).padStart(this.qubits, "0")}⟩`;
  }

  private assertQubit(q: number) {
    if (q < 0 || q >= this.qubits) {
      throw new Error(`qubit ${q} out of range [0, ${this.qubits})`);
    }
  }
}
