/**
 * Circuit data model — the sandbox's authoritative state shape.
 *
 * A circuit is a fixed-width register of `qubits` lines (1–4) and a
 * variable-length sequence of `steps`. Every op inside a single step
 * runs "in parallel" (conceptually one timeslice on the hardware);
 * within a step, ops on disjoint qubit sets compose to the same final
 * state regardless of insertion order, so the editor can drop them
 * into any cell of a column without ambiguity.
 *
 * Why this shape:
 *  - Matches the visual grid (rows = qubits, columns = steps) 1:1,
 *    so the UI in 03-02 maps onto it with zero translation logic.
 *  - Keeps the URL codec (03-01b) tiny: each op is a tagged enum, a
 *    qubit index (2 bits), and at most 2 bytes of payload.
 *  - Pure data, no methods. `runCircuit` is a free function so we can
 *    move execution into a Web Worker (Quantum Canvas, Plan 03-06).
 */
import { Simulator } from "./simulator";
import type { GateName, RotationAxis } from "./gates";

/**
 * Canonical runtime enumerations. Types below are *derived* from these
 * arrays so adding a new discrete gate, rotation axis, or op kind in
 * one place propagates through every TypeScript narrow + the Qiskit
 * exporter's drift-coverage test (QSK-03).
 *
 * Order matters: the URL codec uses `DISCRETE_GATES.indexOf(...)` and
 * `ROT_AXES.indexOf(...)` as wire-format sub-codes. Reordering these
 * arrays breaks every shared sandbox URL ever minted. Append-only.
 */
export const DISCRETE_GATES = ["X", "Y", "Z", "H", "S", "T", "I"] as const;
export const ROT_AXES = ["X", "Y", "Z"] as const;
export const OP_KINDS = ["gate", "cnot", "rot", "measure"] as const;

export type DiscreteGate = (typeof DISCRETE_GATES)[number];
export type RotAxis = (typeof ROT_AXES)[number];

export type Op =
  | { kind: "gate"; gate: DiscreteGate; qubit: number }
  | { kind: "cnot"; control: number; target: number }
  | { kind: "rot"; axis: RotAxis; qubit: number; theta: number }
  | { kind: "measure"; qubit: number };

export interface Circuit {
  qubits: number;
  /** `steps[t]` runs in parallel. Empty steps (`[]`) are legal — they
   *  let the user reserve a column without dropping anything in yet. */
  steps: Op[][];
}

export const MAX_QUBITS = 4;
export const MAX_STEPS = 64;

/** Build an empty `qubits`-wide circuit with zero steps. */
export const emptyCircuit = (qubits: number): Circuit => {
  assertQubitCount(qubits);
  return { qubits, steps: [] };
};

/**
 * Validate structural invariants. Throws on first violation — callers
 * decide whether to surface the error (codec.decode does; the editor
 * lets the user mutate freely and only validates before sharing).
 */
export const validateCircuit = (c: Circuit): void => {
  assertQubitCount(c.qubits);
  if (c.steps.length > MAX_STEPS) {
    throw new RangeError(`steps > ${MAX_STEPS}: got ${c.steps.length}`);
  }
  for (let t = 0; t < c.steps.length; t++) {
    const step = c.steps[t];
    const seen = new Set<number>();
    for (const op of step) {
      for (const q of opQubits(op)) {
        if (q < 0 || q >= c.qubits) {
          throw new RangeError(`step ${t}: qubit ${q} out of range`);
        }
        if (seen.has(q)) {
          throw new Error(`step ${t}: qubit ${q} touched by two ops in the same step`);
        }
        seen.add(q);
      }
      if (op.kind === "cnot" && op.control === op.target) {
        throw new Error(`step ${t}: CNOT control === target`);
      }
      if (op.kind === "rot" && !Number.isFinite(op.theta)) {
        throw new Error(`step ${t}: rot θ is not finite`);
      }
    }
  }
};

/** All qubits an op acts on (1 or 2). */
export const opQubits = (op: Op): number[] => {
  switch (op.kind) {
    case "gate":
    case "rot":
    case "measure":
      return [op.qubit];
    case "cnot":
      return [op.control, op.target];
  }
};

/**
 * Run the circuit on a fresh `|0…0⟩` simulator and return it. Pure —
 * the input circuit is not mutated; the returned simulator owns its
 * state vector. Measurements are *recorded* in the returned array but
 * also collapse the state (using the supplied RNG, default Math.random).
 */
export interface RunResult {
  sim: Simulator;
  measurements: Array<{ step: number; qubit: number; outcome: 0 | 1 }>;
}

export const runCircuit = (
  c: Circuit,
  rng: () => number = Math.random,
): RunResult => {
  validateCircuit(c);
  const sim = new Simulator({ qubits: c.qubits });
  const measurements: RunResult["measurements"] = [];

  for (let t = 0; t < c.steps.length; t++) {
    for (const op of c.steps[t]) {
      switch (op.kind) {
        case "gate":
          if (op.gate !== "I") sim.apply(op.gate as GateName, op.qubit);
          break;
        case "cnot":
          sim.apply("CNOT", op.control, op.target);
          break;
        case "rot":
          sim.applyRotation(("R" + op.axis.toLowerCase()) as RotationAxis, op.qubit, op.theta);
          break;
        case "measure": {
          // Collapse on the single qubit. We project onto the measured
          // outcome's subspace and renormalize. Done in-place.
          const outcome = projectQubit(sim, op.qubit, rng);
          measurements.push({ step: t, qubit: op.qubit, outcome });
          break;
        }
      }
    }
  }

  return { sim, measurements };
};

function projectQubit(sim: Simulator, qubit: number, rng: () => number): 0 | 1 {
  const bit = 1 << qubit;
  let p1 = 0;
  for (let i = 0; i < sim.state.length; i++) {
    if ((i & bit) !== 0) {
      const a = sim.state[i];
      p1 += a.re * a.re + a.im * a.im;
    }
  }
  const p0 = 1 - p1;
  // Small rng → first outcome (0). Matches the visual intuition of
  // "left side of the distribution = first bucket" used elsewhere.
  const outcome: 0 | 1 = rng() < p0 ? 0 : 1;
  const targetMask = outcome === 1 ? bit : 0;
  const keepNormSq = outcome === 1 ? p1 : p0;
  // Floating safety: if the measured branch has effectively zero amp,
  // fall back to the other outcome rather than dividing by zero.
  if (keepNormSq < 1e-12) {
    return projectQubit(sim, qubit, () => (outcome === 1 ? 0 : 1));
  }
  const k = 1 / Math.sqrt(keepNormSq);
  for (let i = 0; i < sim.state.length; i++) {
    if ((i & bit) === targetMask) {
      sim.state[i] = { re: sim.state[i].re * k, im: sim.state[i].im * k };
    } else {
      sim.state[i] = { re: 0, im: 0 };
    }
  }
  return outcome;
}

function assertQubitCount(qubits: number) {
  if (!Number.isInteger(qubits) || qubits < 1 || qubits > MAX_QUBITS) {
    throw new RangeError(`qubits must be integer in [1, ${MAX_QUBITS}], got ${qubits}`);
  }
}

/* -------------------------------------------------------------------------- */
/* Convenience constructors — used by tests and the composer ----------------- */

export const gateOp = (gate: DiscreteGate, qubit: number): Op => ({ kind: "gate", gate, qubit });
export const cnotOp = (control: number, target: number): Op => ({ kind: "cnot", control, target });
export const rotOp = (axis: RotAxis, qubit: number, theta: number): Op =>
  ({ kind: "rot", axis, qubit, theta });
export const measureOp = (qubit: number): Op => ({ kind: "measure", qubit });
