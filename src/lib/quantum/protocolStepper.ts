/**
 * `ProtocolStepper` replay helper.
 *
 * The pure-logic core of `src/components/ProtocolStepper.astro`: given a
 * `Store`, an array of `ProtocolStep`s, and a target index, reset the
 * store and re-apply every step's ops in order up to and including the
 * target. Always replays from step 0 (no incremental undo state) — at
 * 4 qubits the reset+replay is sub-millisecond, and the simple model
 * makes "jumping to step N" identical to "advancing one step at a time"
 * (the visual ALG-02 promise: stepping back snaps every Bloch arrow
 * back to where it was, no drift).
 *
 * Lives here (not inline in the .astro) so vitest can exercise it
 * without an Astro runtime, and so Phase 3's superdense stepper
 * consumer reuses the same code verbatim.
 */

import type { Store } from "./store";
import type { ProtocolStep } from "./teleportation";
import type { RotationAxis } from "./gates";

/**
 * Reset `store` and apply every op in `steps[0..upTo]` (inclusive).
 *
 * - `measure` ops are skipped — `ProtocolStepper` is for unitary
 *   protocols only; teleportation uses deferred measurement, so the
 *   stepper never collapses state. A measure op slipping in is a
 *   safety no-op rather than an error.
 * - `gate "I"` is also skipped (matches `runCircuit`'s convention).
 * - `upTo` is clamped to `[0, steps.length - 1]`. An empty `steps`
 *   array is a no-op (just resets).
 */
export const replayProtocol = (
  store: Store,
  steps: ProtocolStep[],
  upTo: number,
): void => {
  store.reset();
  if (steps.length === 0) return;
  const end = Math.max(0, Math.min(upTo, steps.length - 1));
  for (let i = 0; i <= end; i++) {
    for (const op of steps[i].apply) {
      switch (op.kind) {
        case "gate":
          if (op.gate !== "I") store.apply(op.gate, op.qubit);
          break;
        case "cnot":
          store.applyCNOT(op.control, op.target);
          break;
        case "rot":
          store.applyRotation(
            ("R" + op.axis.toLowerCase()) as RotationAxis,
            op.qubit,
            op.theta,
          );
          break;
        case "measure":
          // Deferred-measurement protocols never collapse mid-circuit.
          break;
      }
    }
  }
};
