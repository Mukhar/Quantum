/**
 * Superdense coding — the canonical 2-qubit circuit, the explicit
 * `00 / 01 / 10 / 11 → I / X / Z / XZ` encoding map, the labeled
 * protocol steps for the essay's `ProtocolStepper`, and a
 * deterministic decode helper.
 *
 * Single source of truth for Phase 3: the `/superdense-coding` essay
 * body, the `EncodingTable` widget, the `CircuitView` embed, the
 * sandbox-link starter, and the algorithm-correctness tests all
 * import from here. Inherits the protocol-circuit-builder pattern
 * from `teleportation.ts` so nothing drifts between widgets.
 *
 * Index convention (matches the rest of the codebase, Qiskit-compatible):
 *   q0 = Alice's qubit (LSB of the state-vector index) — the one she
 *        encodes and "sends" to Bob.
 *   q1 = Bob's half of the pre-shared Bell pair.
 *
 * Bell-pair prep:    H(q0) ; CNOT(q0 → q1)
 * Alice encoding:    I / X / Z / XZ on q0 only (per locked map)
 * Bob's decode:      CNOT(q0 → q1) ; H(q0)         — Bell-basis → computational
 *
 * The classical bits read off (q0, q1) after the decode block (LSB =
 * q0) are exactly the bits Alice chose. Verified end-to-end in
 * `tests/quantum/superdense.test.ts`.
 */

import {
  cnotOp,
  gateOp,
  runCircuit,
  type Circuit,
  type Op,
} from "./circuit";
import type { ProtocolStep } from "./teleportation";

/**
 * The four classical messages Alice can encode into one qubit when
 * she shares a Bell pair with Bob. Strings rather than numbers so
 * call-sites read naturally (`"11"` instead of `3`) and the literal
 * matches the visual encoding-table.
 */
export type SuperdenseBits = "00" | "01" | "10" | "11";

export const SUPERDENSE_MESSAGES: readonly SuperdenseBits[] = [
  "00",
  "01",
  "10",
  "11",
] as const;

export interface SuperdenseDecodeResult {
  /** The two classical bits Bob reads out, formatted "Alice's bit
   *  then Bob's bit" — i.e. `${q0}${q1}` — so the input string
   *  round-trips identically. */
  bits: SuperdenseBits;
  /** Human label of the Bell state Alice's encoding produced
   *  (`|Φ+⟩`, `|Ψ+⟩`, `|Φ-⟩`, `|Ψ-⟩` for `00 / 01 / 10 / 11`). */
  label: string;
  /** Computational-basis probabilities after the decode block.
   *  Indexed `|q1 q0⟩` LSB-first like the simulator state vector. */
  probabilities: number[];
}

/**
 * Alice's encoding ops on q0, per the locked v3 mapping:
 *   00 → [I]      → |Φ+⟩  (Bell pair untouched)
 *   01 → [X]      → |Ψ+⟩  (bit-flip)
 *   10 → [Z]      → |Φ-⟩  (phase-flip)
 *   11 → [X, Z]   → |Ψ-⟩  (bit + phase; we use XZ, not ZX,
 *                          everywhere — they differ only by global
 *                          phase but XZ matches the table copy.)
 *
 * Returned as an `Op[]` (length 0..2). Used both inside
 * `superdenseCircuit` (each op gets its own step column to satisfy
 * `validateCircuit`'s disjoint-qubit rule) and dispatched
 * sequentially through the protocol stepper.
 */
export const encodingOps = (bits: SuperdenseBits): Op[] => {
  switch (bits) {
    case "00":
      // Identity — no gate. `gateOp("I", 0)` would be skipped by both
      // the simulator and the stepper, so we just return an empty
      // sequence and document the "do nothing" branch loudly.
      return [];
    case "01":
      return [gateOp("X", 0)];
    case "10":
      return [gateOp("Z", 0)];
    case "11":
      return [gateOp("X", 0), gateOp("Z", 0)];
  }
};

/** Pretty Bell-state label per encoding, matched to the locked
 *  `00 → |Φ+⟩, 01 → |Ψ+⟩, 10 → |Φ-⟩, 11 → |Ψ-⟩` table. */
export const BELL_STATE_LABEL: Record<SuperdenseBits, string> = {
  "00": "|Φ+⟩",
  "01": "|Ψ+⟩",
  "10": "|Φ-⟩",
  "11": "|Ψ-⟩",
};

/** Short gate-name caption per encoding for the table UI. */
export const ENCODING_GATE_LABEL: Record<SuperdenseBits, string> = {
  "00": "I",
  "01": "X",
  "10": "Z",
  "11": "XZ",
};

export interface SuperdenseCircuitOpts {
  /**
   * Append `measure(q0); measure(q1)` after the decode block. Default
   * `true` — the canonical essay circuit is the one Bob actually reads
   * out. Tests that want to inspect the pre-measurement state vector
   * pass `false`.
   */
  measure?: boolean;
}

/**
 * The canonical 2-qubit superdense-coding circuit.
 *
 * Step columns (each is a single op so the disjoint-qubit rule is
 * trivially satisfied even when the encoding spans two gates):
 *
 *   1. H(q0)                       ┐ pre-shared Bell pair (q0, q1)
 *   2. CNOT(q0 → q1)               ┘ in |Φ+⟩
 *   3..k. …encoding ops on q0…     Alice encodes the chosen bits
 *   k+1. CNOT(q0 → q1)             ┐ Bob's Bell-basis decode
 *   k+2. H(q0)                     ┘  (inverse of the Bell prep)
 *   k+3. measure(q0)               ┐ optional readout
 *   k+4. measure(q1)               ┘
 *
 * Defaults to `bits = "11"` for the locked pedagogical demo (the
 * route's CircuitView and SandboxLink both inherit this default, per
 * PHASE-CONTEXT.md "Default route + sandbox starter").
 */
export const superdenseCircuit = (
  bits: SuperdenseBits = "11",
  opts: SuperdenseCircuitOpts = {},
): Circuit => {
  const measure = opts.measure ?? true;
  const encoding = encodingOps(bits);
  const steps: Op[][] = [
    [gateOp("H", 0)],
    [cnotOp(0, 1)],
    ...encoding.map((op) => [op]),
    [cnotOp(0, 1)],
    [gateOp("H", 0)],
  ];
  if (measure) {
    steps.push([{ kind: "measure", qubit: 0 }]);
    steps.push([{ kind: "measure", qubit: 1 }]);
  }
  return { qubits: 2, steps };
};

/**
 * The five labeled protocol steps consumed by `ProtocolStepper` on
 * the `/superdense-coding` essay.
 *
 * Each step's `apply` array is dispatched sequentially to the shared
 * store via `apply` / `applyCNOT`, mirroring the textbook narrative
 * even when the underlying circuit needs more columns to satisfy
 * `validateCircuit`'s disjoint-qubit rule. Measurements are
 * intentionally NOT in the step list — the locked v3 stepper stays
 * unitary so MultiBlochPanel can show the reduced state cleanly. Bob
 * "reads the result" as the final narrative step; the encoded bits
 * have already become the computational-basis amplitudes.
 */
export const superdenseSteps = (
  bits: SuperdenseBits = "11",
): ProtocolStep[] => {
  const encoding = encodingOps(bits);
  const gateLabel = ENCODING_GATE_LABEL[bits];
  const bellLabel = BELL_STATE_LABEL[bits];
  return [
    {
      label: "Prepare shared Bell pair (q0, q1)",
      description:
        "H on q0 then CNOT(q0 → q1) builds |Φ+⟩, the pre-shared Bell pair Alice and Bob set up ahead of time. Each reduced Bloch arrow shrinks to the origin and the 'Entangled' badge lights up.",
      apply: [gateOp("H", 0), cnotOp(0, 1)],
    },
    {
      label: `Alice encodes ${bits} with ${gateLabel}`,
      description:
        bits === "00"
          ? "Encoding 00 is the identity: Alice does nothing. The Bell pair is still |Φ+⟩."
          : `Alice applies ${gateLabel} on her qubit only. This rotates the joint state into the ${bellLabel} Bell state — without touching Bob's qubit at all.`,
      apply: encoding,
    },
    {
      label: "Alice sends q0 to Bob",
      description:
        "Physically one qubit travels. Bob now holds both halves of the (now non-|Φ+⟩) Bell pair, ready to Bell-decode.",
      // No ops — the channel transit is narrative-only; the qubit
      // register doesn't change. Keep `apply` empty so replay stays
      // a strict subset of the gate sequence.
      apply: [],
    },
    {
      label: "Bob decodes with CNOT(q0 → q1)",
      description:
        "First half of the Bell-basis inverse. Bob's CNOT untangles the bit-flip half of Alice's encoding.",
      apply: [cnotOp(0, 1)],
    },
    {
      label: "Bob decodes with H(q0) and reads the result",
      description: `Hadamard on q0 finishes the Bell-basis inverse. The two classical bits Bob measures (q1 q0) are exactly the bits Alice chose — here, ${bits}.`,
      apply: [gateOp("H", 0)],
    },
  ];
};

/**
 * Deterministically compute the bits Bob reads out for a given
 * Alice encoding. Implementation runs the unitary half of the
 * canonical circuit (`measure: false`) on the existing simulator
 * and reports the computational-basis probability distribution —
 * which is one-hot (within float tolerance) on the expected
 * `|q1 q0⟩ = bits` outcome.
 *
 * Used by both the route-level decoded-result panel and the
 * encoding-table widget's aria-live readout.
 */
export const decodeSuperdense = (
  bits: SuperdenseBits = "11",
): SuperdenseDecodeResult => {
  const circuit = superdenseCircuit(bits, { measure: false });
  const { sim } = runCircuit(circuit);
  const probabilities = sim.probabilities();
  return {
    bits,
    label: BELL_STATE_LABEL[bits],
    probabilities,
  };
};

/**
 * Run the full superdense protocol on every input and return a
 * tabular summary. Convenience helper for tests and any UI that
 * wants to render all four rows side-by-side without re-running
 * the simulator inline.
 */
export const allSuperdenseCases = (): Array<{
  bits: SuperdenseBits;
  ops: Op[];
  decoded: SuperdenseBits;
}> => {
  return SUPERDENSE_MESSAGES.map((bits) => {
    const result = decodeSuperdense(bits);
    // The "decoded" bits are the index of the unique high-probability
    // outcome in the LSB-first computational basis, padded to 2 bits.
    let bestIdx = 0;
    let bestP = -Infinity;
    for (let i = 0; i < result.probabilities.length; i++) {
      if (result.probabilities[i] > bestP) {
        bestP = result.probabilities[i];
        bestIdx = i;
      }
    }
    const decoded = `${bestIdx & 1}${(bestIdx >> 1) & 1}` as SuperdenseBits;
    return { bits, ops: encodingOps(bits), decoded };
  });
};
