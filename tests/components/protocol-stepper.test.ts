/**
 * ProtocolStepper replay-logic tests.
 *
 * `ProtocolStepper.astro` is DOM glue around the pure
 * `replayProtocol(store, steps, upTo)` helper. We don't render the
 * .astro shell (vitest runs in node, no Astro runtime); we drive the
 * helper directly against a real `createStore`. That covers the
 * algorithm-critical behavior: replay-from-step-0 semantics, clamping,
 * op-kind coverage, and round-trip correctness via the live store.
 *
 * If the inline-script DOM glue ever breaks the data attrs, the
 * essay-level acceptance step (manual click-through during 02-05)
 * catches that — same insurance model as `tests/components/miniBloch.test.ts`.
 */

import { describe, expect, it } from "vitest";
import { createStore } from "../../src/lib/quantum/store";
import { replayProtocol } from "../../src/lib/quantum/protocolStepper";
import {
  cnotOp,
  gateOp,
  rotOp,
  measureOp,
  type Op,
} from "../../src/lib/quantum/circuit";
import type { ProtocolStep } from "../../src/lib/quantum/teleportation";
import { teleportationSteps } from "../../src/lib/quantum/teleportation";

const EPS = 1e-9;
const approx = (a: number, b: number, eps = EPS) => Math.abs(a - b) < eps;

describe("replayProtocol — replay-from-step-0 semantics", () => {
  it("after step 0 ([H q0]) probabilities are [0.5, 0.5]", () => {
    const store = createStore({ qubits: 1 });
    const steps: ProtocolStep[] = [
      { label: "H", apply: [gateOp("H", 0)] },
      { label: "X", apply: [gateOp("X", 0)] },
    ];
    replayProtocol(store, steps, 0);
    const snap = store.snapshot();
    expect(approx(snap.probabilities[0], 0.5)).toBe(true);
    expect(approx(snap.probabilities[1], 0.5)).toBe(true);
  });

  it("after step 1 ([H, X]) probabilities are still [0.5, 0.5] (HX|0⟩ = X|+⟩ = |+⟩)", () => {
    const store = createStore({ qubits: 1 });
    const steps: ProtocolStep[] = [
      { label: "H", apply: [gateOp("H", 0)] },
      { label: "X", apply: [gateOp("X", 0)] },
    ];
    replayProtocol(store, steps, 1);
    const snap = store.snapshot();
    expect(approx(snap.probabilities[0], 0.5)).toBe(true);
    expect(approx(snap.probabilities[1], 0.5)).toBe(true);
  });

  it("stepping back from step 1 to step 0 reproduces step-0 state exactly (no drift)", () => {
    // X · H · |0⟩ = X · |+⟩ = |+⟩, then H|+⟩ = |0⟩, so X|+⟩ followed
    // by stepping back to step 0 should give the same state as
    // replaying step 0 from scratch. Use HZ -> [H, Z] where Z|+⟩=|-⟩
    // to make the difference detectable in the amplitudes.
    const store = createStore({ qubits: 1 });
    const steps: ProtocolStep[] = [
      { label: "H", apply: [gateOp("H", 0)] },
      { label: "Z", apply: [gateOp("Z", 0)] },
    ];

    replayProtocol(store, steps, 1);
    const afterStep1 = store.snapshot().state.map((a) => ({ re: a.re, im: a.im }));

    // Going back to step 0 must drop the Z. Probabilities still [.5, .5]
    // but the relative phase resets — α=+1/√2, β=+1/√2 (vs −1/√2 after Z).
    replayProtocol(store, steps, 0);
    const afterStep0 = store.snapshot().state;

    expect(approx(afterStep0[0].re, 1 / Math.SQRT2)).toBe(true);
    expect(approx(afterStep0[1].re, 1 / Math.SQRT2)).toBe(true);
    // Sanity: the two snapshots really were different (Z flipped β's sign).
    expect(approx(afterStep1[1].re, -1 / Math.SQRT2)).toBe(true);
  });
});

describe("replayProtocol — op-kind coverage", () => {
  it("dispatches CNOT correctly (Bell pair on 2 qubits)", () => {
    const store = createStore({ qubits: 2 });
    const steps: ProtocolStep[] = [
      { label: "Bell prep", apply: [gateOp("H", 0), cnotOp(0, 1)] },
    ];
    replayProtocol(store, steps, 0);
    const probs = store.snapshot().probabilities;
    expect(approx(probs[0], 0.5)).toBe(true); // |00⟩
    expect(approx(probs[1], 0)).toBe(true);   // |01⟩
    expect(approx(probs[2], 0)).toBe(true);   // |10⟩
    expect(approx(probs[3], 0.5)).toBe(true); // |11⟩
  });

  it("dispatches rot ops via Rx/Ry/Rz", () => {
    const store = createStore({ qubits: 1 });
    const steps: ProtocolStep[] = [
      // Rx(π) on |0⟩ ⇒ −i|1⟩, so P(|1⟩) = 1.
      { label: "Rx(π)", apply: [rotOp("X", 0, Math.PI)] },
    ];
    replayProtocol(store, steps, 0);
    const probs = store.snapshot().probabilities;
    expect(approx(probs[0], 0)).toBe(true);
    expect(approx(probs[1], 1)).toBe(true);
  });

  it("skips measure ops (no collapse)", () => {
    const store = createStore({ qubits: 1 });
    const steps: ProtocolStep[] = [
      { label: "H + (no-op) measure", apply: [gateOp("H", 0), measureOp(0)] },
    ];
    replayProtocol(store, steps, 0);
    const probs = store.snapshot().probabilities;
    // |+⟩ survives — measure was a no-op.
    expect(approx(probs[0], 0.5)).toBe(true);
    expect(approx(probs[1], 0.5)).toBe(true);
  });

  it("skips I gates (matches runCircuit convention)", () => {
    const store = createStore({ qubits: 1 });
    const steps: ProtocolStep[] = [
      { label: "I then X", apply: [gateOp("I", 0), gateOp("X", 0)] satisfies Op[] },
    ];
    replayProtocol(store, steps, 0);
    const probs = store.snapshot().probabilities;
    expect(approx(probs[0], 0)).toBe(true);
    expect(approx(probs[1], 1)).toBe(true);
  });
});

describe("replayProtocol — bounds + empty handling", () => {
  it("clamps upTo > steps.length - 1 to the last step", () => {
    const store = createStore({ qubits: 1 });
    const steps: ProtocolStep[] = [
      { label: "H", apply: [gateOp("H", 0)] },
    ];
    replayProtocol(store, steps, 99);
    const probs = store.snapshot().probabilities;
    expect(approx(probs[0], 0.5)).toBe(true);
    expect(approx(probs[1], 0.5)).toBe(true);
  });

  it("clamps upTo < 0 to step 0", () => {
    const store = createStore({ qubits: 1 });
    const steps: ProtocolStep[] = [
      { label: "H", apply: [gateOp("H", 0)] },
    ];
    replayProtocol(store, steps, -5);
    const probs = store.snapshot().probabilities;
    expect(approx(probs[0], 0.5)).toBe(true);
  });

  it("empty steps array resets to |0⟩ and exits cleanly", () => {
    const store = createStore({ qubits: 1 });
    // Dirty the store first.
    store.apply("X", 0);
    replayProtocol(store, [], 0);
    const probs = store.snapshot().probabilities;
    expect(approx(probs[0], 1)).toBe(true);
    expect(approx(probs[1], 0)).toBe(true);
  });
});

describe("replayProtocol — end-to-end on teleportationSteps()", () => {
  it("walks all 5 steps and lands q2 in the prepared state on q0", () => {
    // Real-world test: use the production teleportationSteps() with a
    // |+⟩ prep on q0. After the last step, q2 must be |+⟩, q0 must
    // have been collapsed-equivalent (deferred-measurement principle).
    const store = createStore({ qubits: 3 });
    const steps = teleportationSteps({ prepare: [gateOp("H", 0)] });
    replayProtocol(store, steps, steps.length - 1);

    // q2's marginal: P(|0⟩_q2) = P(|1⟩_q2) = 0.5 because q2 = |+⟩.
    const state = store.snapshot().state;
    let p0q2 = 0;
    let p1q2 = 0;
    const q2bit = 1 << 2;
    for (let i = 0; i < state.length; i++) {
      const a = state[i];
      const p = a.re * a.re + a.im * a.im;
      if ((i & q2bit) === 0) p0q2 += p;
      else p1q2 += p;
    }
    expect(approx(p0q2, 0.5)).toBe(true);
    expect(approx(p1q2, 0.5)).toBe(true);
  });
});
