/**
 * Superdense-coding correctness tests.
 *
 * Five suites:
 *  1. Encoding-map correctness — every `bits → ops` is exactly the
 *     locked v3 mapping (I / X / Z / XZ).
 *  2. Protocol round-trip — for each of "00", "01", "10", "11", run
 *     the full unitary protocol and assert the decoded outcome
 *     matches the input bits.
 *  3. Bell-basis decode certainty — the post-decode probability
 *     distribution is one-hot on the expected outcome (within
 *     float tolerance).
 *  4. Circuit validity — `validateCircuit`, `encodeCircuit`,
 *     `decodeCircuit`, and `toQiskit` all accept the canonical
 *     measured circuit.
 *  5. Step integrity — `superdenseSteps(bits)` returns a stable
 *     5-step sequence using only supported `Op` kinds, and replaying
 *     all steps through a real `Store` lands on the expected
 *     computational-basis state.
 *
 * Conventions:
 *   - q0 = Alice's qubit (LSB of the state-vector index).
 *   - q1 = Bob's qubit.
 *   - Bit strings are "Alice's bit then Bob's bit" (= q0 then q1)
 *     so the input "01" round-trips to the output "01".
 */

import { describe, expect, it, test } from "vitest";
import {
  encodeCircuit,
  decodeCircuit,
} from "../../src/lib/quantum/codec";
import { toQiskit } from "../../src/lib/quantum/qiskit";
import {
  validateCircuit,
  runCircuit,
  type Op,
} from "../../src/lib/quantum/circuit";
import {
  encodingOps,
  superdenseCircuit,
  superdenseSteps,
  decodeSuperdense,
  allSuperdenseCases,
  SUPERDENSE_MESSAGES,
  ENCODING_GATE_LABEL,
  type SuperdenseBits,
} from "../../src/lib/quantum/superdense";
import { createStore } from "../../src/lib/quantum/store";
import { replayProtocol } from "../../src/lib/quantum/protocolStepper";

const EPS = 1e-9;
const approx = (a: number, b: number, eps = EPS) => Math.abs(a - b) < eps;

/* -------------------------------------------------------------------------- */
/* Suite 1 — encoding-map correctness ---------------------------------------- */

describe("encodingOps — locked v3 mapping", () => {
  it("00 → [] (identity, no ops)", () => {
    expect(encodingOps("00")).toEqual([]);
  });
  it("01 → [X on q0]", () => {
    expect(encodingOps("01")).toEqual([{ kind: "gate", gate: "X", qubit: 0 }]);
  });
  it("10 → [Z on q0]", () => {
    expect(encodingOps("10")).toEqual([{ kind: "gate", gate: "Z", qubit: 0 }]);
  });
  it("11 → [X, Z on q0] (XZ, not ZX — locked)", () => {
    expect(encodingOps("11")).toEqual([
      { kind: "gate", gate: "X", qubit: 0 },
      { kind: "gate", gate: "Z", qubit: 0 },
    ]);
  });
  it("every encoding acts only on q0", () => {
    for (const bits of SUPERDENSE_MESSAGES) {
      for (const op of encodingOps(bits)) {
        if (op.kind === "gate") expect(op.qubit).toBe(0);
        else throw new Error(`unexpected op kind in encoding ${bits}`);
      }
    }
  });
});

/* -------------------------------------------------------------------------- */
/* Suite 2 — protocol round-trip --------------------------------------------- */

describe("superdense protocol — input bits round-trip to output bits", () => {
  test.each<SuperdenseBits>(["00", "01", "10", "11"])(
    "encoding %s decodes back to %s",
    (bits) => {
      const result = decodeSuperdense(bits);
      expect(result.bits).toBe(bits);
    },
  );

  it("allSuperdenseCases reports decoded === input for every case", () => {
    for (const row of allSuperdenseCases()) {
      expect(row.decoded).toBe(row.bits);
    }
  });
});

/* -------------------------------------------------------------------------- */
/* Suite 3 — Bell-basis decode certainty ------------------------------------- */

describe("superdense decode — post-decode probabilities are one-hot", () => {
  test.each<SuperdenseBits>(["00", "01", "10", "11"])(
    "%s → probability 1 on the expected basis state",
    (bits) => {
      const { probabilities } = decodeSuperdense(bits);
      // Expected index: |q1 q0⟩ LSB-first, where (q0, q1) = (Alice's
      // bit, Bob's bit) = (bits[0], bits[1]) by our locked convention.
      const q0 = Number(bits[0]);
      const q1 = Number(bits[1]);
      const expectedIdx = (q1 << 1) | q0;
      for (let i = 0; i < probabilities.length; i++) {
        if (i === expectedIdx) {
          expect(approx(probabilities[i], 1)).toBe(true);
        } else {
          expect(approx(probabilities[i], 0)).toBe(true);
        }
      }
    },
  );
});

/* -------------------------------------------------------------------------- */
/* Suite 4 — circuit validity (codec + Qiskit) ------------------------------- */

describe("superdenseCircuit — exporter / codec compatibility", () => {
  test.each<SuperdenseBits>(["00", "01", "10", "11"])(
    "validates, encodes, decodes, and Qiskit-exports for %s",
    (bits) => {
      const c = superdenseCircuit(bits);
      expect(() => validateCircuit(c)).not.toThrow();
      const fragment = encodeCircuit(c);
      const restored = decodeCircuit(fragment);
      expect(restored.qubits).toBe(c.qubits);
      expect(restored.steps.length).toBe(c.steps.length);
      const qiskit = toQiskit(c);
      expect(qiskit).toContain("QuantumCircuit");
      // Locked: every encoding ends with two measurements (q0, q1).
      expect(qiskit).toContain("measure");
    },
  );

  it("measure: false omits the trailing measure ops", () => {
    const c = superdenseCircuit("11", { measure: false });
    for (const step of c.steps) {
      for (const op of step) {
        expect(op.kind).not.toBe("measure");
      }
    }
  });

  it("default route circuit is the locked '11' (XZ) demo", () => {
    const def = superdenseCircuit();
    const eleven = superdenseCircuit("11");
    expect(def).toEqual(eleven);
  });
});

/* -------------------------------------------------------------------------- */
/* Suite 5 — step integrity -------------------------------------------------- */

describe("superdenseSteps — labels, shape, and replay correctness", () => {
  test.each<SuperdenseBits>(["00", "01", "10", "11"])(
    "%s returns 5 narrative steps and uses only supported op kinds",
    (bits) => {
      const steps = superdenseSteps(bits);
      expect(steps.length).toBe(5);
      const gateLabel = ENCODING_GATE_LABEL[bits];
      expect(steps[1].label).toContain(bits);
      expect(steps[1].label).toContain(gateLabel);
      for (const step of steps) {
        for (const op of step.apply) {
          expect(["gate", "cnot", "rot"]).toContain(op.kind);
        }
      }
    },
  );

  it("replaying all steps lands on the expected one-hot basis state", () => {
    for (const bits of SUPERDENSE_MESSAGES) {
      const store = createStore({ qubits: 2 });
      const steps = superdenseSteps(bits);
      replayProtocol(store, steps, steps.length - 1);
      const snap = store.snapshot();
      const q0 = Number(bits[0]);
      const q1 = Number(bits[1]);
      const expectedIdx = (q1 << 1) | q0;
      for (let i = 0; i < snap.probabilities.length; i++) {
        const expected = i === expectedIdx ? 1 : 0;
        expect(
          approx(snap.probabilities[i], expected),
          `bits=${bits} idx=${i} got=${snap.probabilities[i]}`,
        ).toBe(true);
      }
    }
  });
});
