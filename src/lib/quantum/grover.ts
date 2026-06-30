/**
 * Grover's algorithm — real, simulator-backed amplitude amplification.
 *
 * This module is the trust anchor for the `/grover` essay. The widget
 * needs a single source of truth for every amplitude snapshot, and the
 * site's value proposition is *real* math — no fake bars moving on a
 * curve. We therefore implement oracle and diffusion as honest
 * state-vector mutations on the existing `Simulator`, keep the simulator
 * cap at 4 qubits (REQ-13), and avoid bolting an arbitrary multi-control
 * "oracle" gate onto `Circuit`/`Qiskit`. A small pedagogical
 * `buildGroverCircuit` covers the 2-qubit `CircuitView` story; the
 * 4-qubit amplitude story is told by `runGrover`.
 *
 * Index convention: amplitude index `i` is basis state `i` with qubit 0
 * the LEAST significant bit — same as `Simulator` and Qiskit. So the
 * marked-state dropdown values `0..N-1` map directly to `|i⟩`, with
 * `basisLabels(qubits)[i]` giving the displayed ket.
 */

import { type Circuit, cnotOp, gateOp, validateCircuit } from "./circuit";
import { Simulator } from "./simulator";

export interface GroverRunOptions {
  qubits: number;
  markedIndex: number;
  /**
   * Optional override. When omitted, runGrover uses
   * `optimalGroverIterations(1 << qubits)`. May exceed the optimum so
   * the widget can demonstrate overshoot, but is capped to a small
   * explicit maximum to keep snapshots cheap to serialize.
   */
  iterations?: number;
}

export interface GroverSnapshot {
  /** 0 = uniform superposition; k = state after k oracle+diffusion rounds. */
  iteration: number;
  /** Signed real parts of the amplitudes, length N. */
  amplitudes: number[];
  /** |amplitude|², length N. Sums to 1 ± floating error. */
  probabilities: number[];
  markedIndex: number;
  markedProbability: number;
  basisLabels: string[];
}

const MIN_QUBITS = 1;
const MAX_QUBITS_SUPPORTED = 4;
const MAX_N = 1 << MAX_QUBITS_SUPPORTED; // 16
const MIN_N = 2;

/**
 * `⌊(π/4)·√N⌋` — the textbook optimal number of Grover iterations for an
 * unstructured search over `N` items with a single marked state. Throws
 * if `N` is not a power of two in `[2, 16]`; `SearchComparison` is the
 * intended caller for larger formula-only sizes.
 */
export const optimalGroverIterations = (N: number): number => {
  assertPowerOfTwoInRange(N, MIN_N, MAX_N);
  return Math.floor((Math.PI / 4) * Math.sqrt(N));
};

/**
 * Build the `[|0⟩, |1⟩, …, |N-1⟩]` basis-label list a widget can drop
 * straight into a dropdown or chart axis. Uses simulator-style padding
 * so labels line up byte-for-byte with `Simulator#basisLabel`.
 */
export const basisLabels = (qubits: number): string[] => {
  assertQubits(qubits);
  const N = 1 << qubits;
  const out: string[] = new Array(N);
  for (let i = 0; i < N; i++) out[i] = `|${i.toString(2).padStart(qubits, "0")}⟩`;
  return out;
};

/**
 * Apply `H` to every qubit — the uniform superposition `|s⟩` that
 * Grover's amplitude amplification starts from. Returns the simulator
 * for chaining.
 */
export const prepareUniform = (sim: Simulator): Simulator => {
  for (let q = 0; q < sim.qubits; q++) sim.apply("H", q);
  return sim;
};

/**
 * Phase oracle `O_f`: flip the sign of the marked amplitude and leave
 * every other amplitude untouched. The real Grover oracle is a unitary
 * `|x⟩ ↦ (-1)^{f(x)} |x⟩`; for a single marked state that reduces to
 * the negation we apply here. The simulator-level shortcut avoids
 * fabricating a multi-controlled `Op` kind just for the widget.
 */
export const applyPhaseOracle = (sim: Simulator, markedIndex: number): Simulator => {
  const N = sim.state.length;
  if (!Number.isInteger(markedIndex) || markedIndex < 0 || markedIndex >= N) {
    throw new RangeError(
      `markedIndex must be integer in [0, ${N}), got ${markedIndex}`,
    );
  }
  const a = sim.state[markedIndex];
  sim.state[markedIndex] = { re: -a.re, im: -a.im };
  return sim;
};

/**
 * Diffusion operator (inversion about the mean): `aᵢ ↦ 2·mean(a) - aᵢ`.
 * Kept in the complex form even though Grover starts with real
 * amplitudes — that way the helper survives a future caller that
 * threads rotations between oracle and diffusion without quietly
 * dropping the imaginary part.
 */
export const applyDiffusion = (sim: Simulator): Simulator => {
  const N = sim.state.length;
  let sumRe = 0;
  let sumIm = 0;
  for (let i = 0; i < N; i++) {
    sumRe += sim.state[i].re;
    sumIm += sim.state[i].im;
  }
  const meanRe = sumRe / N;
  const meanIm = sumIm / N;
  for (let i = 0; i < N; i++) {
    const a = sim.state[i];
    sim.state[i] = { re: 2 * meanRe - a.re, im: 2 * meanIm - a.im };
  }
  return sim;
};

/**
 * Drive Grover end-to-end and return a snapshot per iteration so the
 * widget can scrub through the amplification. Snapshot `0` is the
 * uniform superposition; snapshot `k` is the state after `k`
 * oracle+diffusion rounds.
 */
export const runGrover = (opts: GroverRunOptions): GroverSnapshot[] => {
  assertQubits(opts.qubits);
  const N = 1 << opts.qubits;
  assertPowerOfTwoInRange(N, MIN_N, MAX_N);
  if (
    !Number.isInteger(opts.markedIndex) ||
    opts.markedIndex < 0 ||
    opts.markedIndex >= N
  ) {
    throw new RangeError(
      `markedIndex must be integer in [0, ${N}), got ${opts.markedIndex}`,
    );
  }

  const kOpt = optimalGroverIterations(N);
  const cap = Math.max(8, 2 * kOpt + 2);
  let iterations = opts.iterations ?? kOpt;
  if (!Number.isInteger(iterations) || iterations < 0) {
    throw new RangeError(`iterations must be a non-negative integer, got ${iterations}`);
  }
  if (iterations > cap) iterations = cap;

  const sim = new Simulator({ qubits: opts.qubits });
  prepareUniform(sim);

  const labels = basisLabels(opts.qubits);
  const snapshots: GroverSnapshot[] = [];
  snapshots.push(snapshot(sim, opts.markedIndex, 0, labels));

  for (let k = 1; k <= iterations; k++) {
    applyPhaseOracle(sim, opts.markedIndex);
    applyDiffusion(sim);
    snapshots.push(snapshot(sim, opts.markedIndex, k, labels));
  }
  return snapshots;
};

const snapshot = (
  sim: Simulator,
  markedIndex: number,
  iteration: number,
  labels: string[],
): GroverSnapshot => {
  const amplitudes: number[] = new Array(sim.state.length);
  const probabilities: number[] = new Array(sim.state.length);
  for (let i = 0; i < sim.state.length; i++) {
    const a = sim.state[i];
    amplitudes[i] = a.re;
    probabilities[i] = a.re * a.re + a.im * a.im;
  }
  return {
    iteration,
    amplitudes,
    probabilities,
    markedIndex,
    markedProbability: probabilities[markedIndex],
    basisLabels: labels,
  };
};

/**
 * Compact pedagogical Grover circuit for `N = 4` (2 qubits) using only
 * the existing supported-gate vocabulary. This is a *real* 1-iteration
 * 2-qubit Grover search for `marked = |11⟩`: after one round the marked
 * state has probability 1 (up to global phase), so the reader sees the
 * algorithm work in a single column.
 *
 * Decomposition:
 *   CZ(0,1) = H(1) · CNOT(0→1) · H(1)
 *   Oracle for |11⟩     = CZ(0,1)
 *   Diffusion (N=4, s=|++⟩) = H⊗H · X⊗X · CZ · X⊗X · H⊗H
 *
 * Each `CZ` expansion adds three columns because the disjoint-qubit
 * rule forbids H and CNOT on the same qubit in one step. We deliberately
 * keep the columns one-op-wide where required so `validateCircuit`,
 * `encodeCircuit`, and `toQiskit` accept the result verbatim — no new
 * `Op` kind, no new gate, no codec drift.
 *
 * Non-default arguments throw: arbitrary marked decomposition adds
 * controlled-X/Z chains that we'd rather not bolt into the simulator
 * vocabulary just for the demo. The full 4-qubit amplitude story stays
 * in `runGrover`.
 */
export const buildGroverCircuit = (
  N: number,
  marked: number,
  iterations: number,
): Circuit => {
  if (N !== 4) {
    throw new RangeError(
      `buildGroverCircuit currently supports N === 4 only; got N=${N}. The full 4-qubit demo uses runGrover() with state-vector oracle/diffusion.`,
    );
  }
  if (!Number.isInteger(marked) || marked < 0 || marked > 3) {
    throw new RangeError(`marked must be integer in [0, 4), got ${marked}`);
  }
  if (marked !== 3) {
    throw new RangeError(
      `buildGroverCircuit currently supports marked === 3 (|11⟩) only; got marked=${marked}.`,
    );
  }
  if (iterations !== 1) {
    throw new RangeError(
      `buildGroverCircuit currently supports iterations === 1 only; got iterations=${iterations}.`,
    );
  }

  const circuit: Circuit = {
    qubits: 2,
    steps: [
      // Uniform superposition.
      [gateOp("H", 0), gateOp("H", 1)],
      // Oracle: CZ(0,1) = H(1) · CNOT(0→1) · H(1)
      [gateOp("H", 1)],
      [cnotOp(0, 1)],
      [gateOp("H", 1)],
      // Diffusion: H⊗H · X⊗X · CZ · X⊗X · H⊗H
      [gateOp("H", 0), gateOp("H", 1)],
      [gateOp("X", 0), gateOp("X", 1)],
      [gateOp("H", 1)],
      [cnotOp(0, 1)],
      [gateOp("H", 1)],
      [gateOp("X", 0), gateOp("X", 1)],
      [gateOp("H", 0), gateOp("H", 1)],
    ],
  };
  validateCircuit(circuit);
  return circuit;
};

/* -------------------------------------------------------------------------- */
/* Internal validators ------------------------------------------------------- */

function assertQubits(qubits: number) {
  if (!Number.isInteger(qubits) || qubits < MIN_QUBITS || qubits > MAX_QUBITS_SUPPORTED) {
    throw new RangeError(
      `qubits must be integer in [${MIN_QUBITS}, ${MAX_QUBITS_SUPPORTED}], got ${qubits}`,
    );
  }
}

function assertPowerOfTwoInRange(N: number, min: number, max: number) {
  if (!Number.isInteger(N) || N < min || N > max) {
    throw new RangeError(`N must be integer in [${min}, ${max}], got ${N}`);
  }
  if ((N & (N - 1)) !== 0) {
    throw new RangeError(`N must be a power of two, got ${N}`);
  }
}
