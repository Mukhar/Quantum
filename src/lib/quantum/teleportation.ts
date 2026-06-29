/**
 * Teleportation protocol — the canonical circuit, the labeled protocol
 * steps for the essay's `ProtocolStepper`, and the `CZ = H·CNOT·H`
 * decomposition helper.
 *
 * Single source of truth for Phase 2: the essay body, the `CircuitView`
 * embed, the sandbox-link starter, the `ProtocolStepper` consumer, and
 * the algorithm-correctness tests all import from here. Locks the
 * deferred-measurement convention (PHASE-CONTEXT.md §"Teleportation
 * simulation strategy") into one place so Phase 3's superdense module
 * inherits the protocol-circuit-builder pattern.
 *
 * Why deferred measurement: the simulator's `Op` IR has no conditional
 * branch, and we don't want to grow one for v3. The textbook identity
 *
 *     classical-conditioned X^a Z^b on q2 (from BSM bits a, b)
 *                            ≡
 *     CNOT(q1 → q2) ; CZ(q0 → q2)         (deferred-measurement)
 *
 * runs *unitary-only* on the existing simulator and produces the same
 * final state on Bob's qubit. Phase 1's Qiskit exporter then emits the
 * same circuit the reader sees in the essay — no two-circuit drift.
 *
 * Index convention (matches the rest of the codebase, Qiskit-compatible):
 *   q0 = Alice's message qubit         (LSB of the state-vector index)
 *   q1 = Alice's half of the Bell pair
 *   q2 = Bob's half of the Bell pair   (the teleportation target)
 */

import {
  cnotOp,
  gateOp,
  opQubits,
  type Circuit,
  type Op,
} from "./circuit";

/**
 * One labeled step of a quantum protocol. The `apply` array is dispatched
 * to the live `store` sequentially (not as a single circuit column), so
 * ops here may freely touch the same qubit one after another — unlike
 * `Circuit` steps, which require disjoint qubits per column.
 *
 * Re-exported from `src/lib/quantum/index.ts` as `ProtocolStep`.
 */
export interface ProtocolStep {
  /** Short label shown in the stepper UI ("Entangle Bell pair"). */
  label: string;
  /** Optional long description shown when this step is active. */
  description?: string;
  /** Ops to dispatch to the shared store on entering this step. */
  apply: Op[];
}

export interface TeleportationOpts {
  /**
   * Optional preparation ops on q0 (the "message" qubit). Default:
   * `[X(0)]` so the message is |1⟩ — a non-trivial input that visibly
   * teleports across both halves of the protocol.
   *
   * All ops in `prepare` MUST act only on qubit 0; teleportation
   * pre-conditions the Bell pair separately and any cross-talk would
   * break the protocol identity.
   */
  prepare?: Op[];
}

/**
 * `CZ(control, target)` as three primitive ops: `H_target · CNOT · H_target`.
 *
 * Returned as an `Op[]` rather than a single new op kind because the
 * simulator/codec/Qiskit exporter (Phase 1) all consume the existing IR
 * unchanged — no schema bump, no QSK-03 drift-coverage update. Callers
 * that want to put `CZ` into a `Circuit` must place each op in its own
 * step column (CZ touches `target` three times, so a single column
 * would violate `validateCircuit`'s disjoint-qubit rule).
 *
 * Throws if `control === target` — `CZ` on a single qubit is not a
 * thing, and the simulator's CNOT would reject it too.
 */
export const cz = (control: number, target: number): Op[] => {
  if (control === target) {
    throw new Error(`cz: control and target must differ, got ${control}`);
  }
  return [gateOp("H", target), cnotOp(control, target), gateOp("H", target)];
};

/**
 * The canonical deferred-measurement teleportation circuit on 3 qubits.
 *
 * Step columns (each is a single op, so disjoint-qubit validation is
 * trivially satisfied even when `prepare` contains multiple ops):
 *
 *   1. H(q1)                            ┐ entangle Bell pair on (q1, q2)
 *   2. CNOT(q1 → q2)                    ┘
 *   3. …prepare ops on q0…              prepare the "message" on q0
 *   4. CNOT(q0 → q1)                    ┐ Alice's Bell-basis measurement
 *   5. H(q0)                            ┘ (unitary half — no collapse)
 *   6. CNOT(q1 → q2)                    ┐ deferred correction on Bob:
 *   7. H(q2)                            │   CNOT(q1→q2) ; CZ(q0→q2)
 *   8. CNOT(q0 → q2)                    │   where CZ = H · CNOT · H
 *   9. H(q2)                            ┘
 *
 * For *any* single-qubit `prepare` ops on q0, tracing out (q0, q1) at
 * the end leaves q2 in the pure state those `prepare` ops would have
 * produced on a 1-qubit simulator. Verified in
 * `tests/quantum/teleportation.test.ts`.
 */
export const teleportationCircuit = (opts: TeleportationOpts = {}): Circuit => {
  const prepare = opts.prepare ?? [gateOp("X", 0)];
  for (const op of prepare) {
    for (const q of opQubits(op)) {
      if (q !== 0) {
        throw new Error(
          `teleportationCircuit: prepare ops must act only on q0, got qubit ${q}`,
        );
      }
    }
  }
  return {
    qubits: 3,
    steps: [
      [gateOp("H", 1)],
      [cnotOp(1, 2)],
      ...prepare.map((op) => [op]),
      [cnotOp(0, 1)],
      [gateOp("H", 0)],
      [cnotOp(1, 2)],
      ...cz(0, 2).map((op) => [op]),
    ],
  };
};

/**
 * The five labeled protocol steps consumed by `ProtocolStepper` on the
 * `/teleportation` essay.
 *
 * Each step's `apply` array is dispatched to the live store sequentially
 * via `apply` / `applyCNOT`, so the steps mirror the textbook narrative
 * even when the underlying circuit needs more columns to satisfy the
 * disjoint-qubit rule (most visibly: the final CZ correction is one
 * narrative step but three op dispatches).
 */
export const teleportationSteps = (opts: TeleportationOpts = {}): ProtocolStep[] => {
  const prepare = opts.prepare ?? [gateOp("X", 0)];
  for (const op of prepare) {
    for (const q of opQubits(op)) {
      if (q !== 0) {
        throw new Error(
          `teleportationSteps: prepare ops must act only on q0, got qubit ${q}`,
        );
      }
    }
  }
  return [
    {
      label: "Entangle Bell pair (q1, q2)",
      description:
        "Hadamard on q1, then CNOT(q1 → q2) creates the shared Bell pair Alice and Bob will use as the channel.",
      apply: [gateOp("H", 1), cnotOp(1, 2)],
    },
    {
      label: "Prepare message on q0",
      description:
        "Whatever state lives on q0 here is the state that will teleport onto q2.",
      apply: prepare,
    },
    {
      label: "Alice's Bell-basis measurement (q0, q1)",
      description:
        "CNOT(q0 → q1) followed by H(q0) rotates the Bell basis into the computational basis. Reading q0 and q1 here would yield Alice's two classical bits — but we defer the measurement and keep the state coherent.",
      apply: [cnotOp(0, 1), gateOp("H", 0)],
    },
    {
      label: "Correct on Bob: deferred CNOT(q1 → q2)",
      description:
        "First half of the deferred-measurement correction. Equivalent to applying X on q2 conditioned on the q1 measurement bit.",
      apply: [cnotOp(1, 2)],
    },
    {
      label: "Correct on Bob: deferred CZ(q0 → q2)",
      description:
        "Second half of the correction, decomposed as H · CNOT · H. Equivalent to applying Z on q2 conditioned on the q0 measurement bit. q2 now holds the state originally prepared on q0.",
      apply: cz(0, 2),
    },
  ];
};
