/**
 * Codec + circuit round-trip tests. The codec is what makes circuits
 * URL-shareable; if any of these regress, share links silently corrupt.
 *
 * Coverage:
 *  - Round-trip: 50 randomized circuits encode→decode equal to input.
 *  - Worst case: 4q × 20s of Rx fits inside the 2 KB cap advertised
 *    in the PLAN.
 *  - Malformed inputs throw `CodecError` (not panics, not undefined).
 *  - Version mismatch throws `UnsupportedVersionError`.
 *  - `runCircuit` reproduces textbook results for the Bell state,
 *    matching what the bare Simulator already passes.
 */

import { describe, expect, it } from "vitest";
import {
  emptyCircuit,
  gateOp,
  cnotOp,
  rotOp,
  measureOp,
  runCircuit,
  type Circuit,
  type Op,
  type DiscreteGate,
  type RotAxis,
} from "../../src/lib/quantum/circuit";
import {
  encodeCircuit,
  decodeCircuit,
  CodecError,
  UnsupportedVersionError,
  CODEC_VERSION,
  roundTrip,
} from "../../src/lib/quantum/codec";

/* -------------------------------------------------------------------------- */
/* Random circuit generator (seeded — reproducible) */

const mulberry32 = (seed: number) => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const DISCRETE: DiscreteGate[] = ["X", "Y", "Z", "H", "S", "T", "I"];
const AXIS: RotAxis[] = ["X", "Y", "Z"];

function randomCircuit(seed: number): Circuit {
  const rng = mulberry32(seed);
  const qubits = 1 + Math.floor(rng() * 4); // 1..4
  const nSteps = Math.floor(rng() * 8) + 1; // 1..8
  const steps: Op[][] = [];
  for (let t = 0; t < nSteps; t++) {
    const free = new Set<number>();
    for (let q = 0; q < qubits; q++) free.add(q);
    const step: Op[] = [];
    while (free.size > 0 && rng() < 0.85) {
      const free_arr = [...free];
      const q = free_arr[Math.floor(rng() * free_arr.length)];
      const r = rng();
      let op: Op;
      if (qubits >= 2 && r < 0.2 && free.size >= 2) {
        // CNOT
        free.delete(q);
        const others = [...free];
        const target = others[Math.floor(rng() * others.length)];
        free.delete(target);
        op = cnotOp(q, target);
      } else if (r < 0.6) {
        op = gateOp(DISCRETE[Math.floor(rng() * DISCRETE.length)], q);
        free.delete(q);
      } else if (r < 0.9) {
        // rot — quantize input so the round-trip is exact
        const theta = (Math.floor(rng() * 1024) / 1024) * (Math.PI * 2);
        op = rotOp(AXIS[Math.floor(rng() * AXIS.length)], q, theta);
        free.delete(q);
      } else {
        op = measureOp(q);
        free.delete(q);
      }
      step.push(op);
    }
    steps.push(step);
  }
  return { qubits, steps };
}

/* -------------------------------------------------------------------------- */

describe("codec — round-trip", () => {
  it("empty circuit (1 qubit, 0 steps) round-trips", () => {
    const c = emptyCircuit(1);
    expect(roundTrip(c)).toEqual(c);
  });

  it("empty circuit (4 qubits) round-trips", () => {
    const c = emptyCircuit(4);
    expect(roundTrip(c)).toEqual(c);
  });

  it("Bell-state circuit round-trips", () => {
    const c: Circuit = {
      qubits: 2,
      steps: [[gateOp("H", 0)], [cnotOp(0, 1)]],
    };
    expect(roundTrip(c)).toEqual(c);
  });

  it("rot ops round-trip exactly when θ is on the 10-bit grid", () => {
    const theta = (123 / 1024) * Math.PI * 2;
    const c: Circuit = {
      qubits: 1,
      steps: [[rotOp("Y", 0, theta)]],
    };
    expect(roundTrip(c)).toEqual(c);
  });

  it("rot ops quantize off-grid θ to within 0.007 rad", () => {
    const theta = 1.2345;
    const c: Circuit = { qubits: 1, steps: [[rotOp("X", 0, theta)]] };
    const back = roundTrip(c);
    const got = (back.steps[0][0] as { theta: number }).theta;
    expect(Math.abs(got - theta)).toBeLessThan(2 * Math.PI / 1024 + 1e-9);
  });

  it("50 randomized circuits round-trip without drift", () => {
    for (let seed = 1; seed <= 50; seed++) {
      const c = randomCircuit(seed);
      const back = roundTrip(c);
      expect(back, `seed ${seed}`).toEqual(c);
    }
  });
});

describe("codec — worst case fits 2 KB", () => {
  it("4 qubits × 20 steps × 4 rots/step fragment ≤ 2 KB base64url", () => {
    const steps: Op[][] = [];
    for (let t = 0; t < 20; t++) {
      steps.push([
        rotOp("X", 0, Math.PI / 3),
        rotOp("Y", 1, Math.PI / 5),
        rotOp("Z", 2, Math.PI / 7),
        rotOp("X", 3, Math.PI / 11),
      ]);
    }
    const fragment = encodeCircuit({ qubits: 4, steps });
    expect(fragment.length).toBeLessThanOrEqual(2048);
  });
});

describe("codec — errors", () => {
  it("throws CodecError on garbage base64url", () => {
    expect(() => decodeCircuit("!!! not base64 !!!")).toThrow(CodecError);
  });

  it("throws CodecError on empty fragment", () => {
    expect(() => decodeCircuit("")).toThrow(CodecError);
  });

  it("throws UnsupportedVersionError on future version byte", () => {
    // Build a fragment whose first byte is the next version.
    const future = new Uint8Array([CODEC_VERSION + 1, 0, 0, 0]);
    const b64 =
      typeof Buffer !== "undefined"
        ? Buffer.from(future).toString("base64url")
        : btoa(String.fromCharCode(...future))
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/g, "");
    expect(() => decodeCircuit(b64)).toThrow(UnsupportedVersionError);
  });

  it("throws CodecError on truncated payload", () => {
    // Build a header that promises 1 step / 1 op but provides no op bytes.
    const truncated = new Uint8Array([CODEC_VERSION, 0, 0, 1, 1]);
    const b64 =
      typeof Buffer !== "undefined"
        ? Buffer.from(truncated).toString("base64url")
        : btoa(String.fromCharCode(...truncated))
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/g, "");
    expect(() => decodeCircuit(b64)).toThrow(CodecError);
  });

  it("strips a leading '#' before decoding", () => {
    const c: Circuit = { qubits: 1, steps: [[gateOp("H", 0)]] };
    const fragment = "#" + encodeCircuit(c);
    expect(decodeCircuit(fragment)).toEqual(c);
  });
});

describe("circuit runner", () => {
  it("Bell circuit produces (|00⟩ + |11⟩)/√2 probabilities", () => {
    const c: Circuit = {
      qubits: 2,
      steps: [[gateOp("H", 0)], [cnotOp(0, 1)]],
    };
    const { sim } = runCircuit(c);
    const probs = sim.probabilities();
    expect(probs[0]).toBeCloseTo(0.5, 9);
    expect(probs[3]).toBeCloseTo(0.5, 9);
    expect(probs[1]).toBeCloseTo(0, 9);
    expect(probs[2]).toBeCloseTo(0, 9);
  });

  it("Rx(π) on |0⟩ flips to |1⟩ (up to a global phase)", () => {
    const c: Circuit = { qubits: 1, steps: [[rotOp("X", 0, Math.PI)]] };
    const { sim } = runCircuit(c);
    expect(sim.probabilities()[1]).toBeCloseTo(1, 9);
  });

  it("measure after H collapses to a definite outcome (and probs match)", () => {
    const c: Circuit = {
      qubits: 1,
      steps: [[gateOp("H", 0)], [measureOp(0)]],
    };
    // Deterministic RNG: roll = 0.1 (< 0.5) → outcome 0
    const { sim, measurements } = runCircuit(c, () => 0.1);
    expect(measurements).toHaveLength(1);
    expect(measurements[0].outcome).toBe(0);
    const probs = sim.probabilities();
    expect(probs[0]).toBeCloseTo(1, 9);
    expect(probs[1]).toBeCloseTo(0, 9);
  });

  it("rejects circuits with two ops touching the same qubit in one step", () => {
    const c: Circuit = {
      qubits: 1,
      steps: [[gateOp("H", 0), gateOp("X", 0)]],
    };
    expect(() => runCircuit(c)).toThrow();
  });
});
