/**
 * Teleportation correctness tests.
 *
 * Four suites:
 *  1. Deferred-measurement identity — for each of 4 input states on q0,
 *     run the full protocol circuit and assert q2's reduced state
 *     matches the input. The whole point of the algorithm.
 *  2. Bell-basis readout — through just the Bell prep + prepare(|+⟩) +
 *     BSM unitaries, assert each of the 4 (q0, q1) computational
 *     outcomes is equiprobable (0.25). Confirms the BSM circuit is
 *     wired correctly.
 *  3. Reduced-density forwarding — mid-protocol, after the BSM but
 *     before the corrections, q2 must be maximally mixed (r = 0). This
 *     is the visual ALG-02 promise: MultiBlochPanel arrows shrink to
 *     the centre and snap back to full length only after step 5.
 *  4. `cz` decomposition — shape + control-target invariant.
 *
 * Conventions: q0 = LSB of the state-vector index, matching `Simulator`.
 */

import { describe, expect, it, test } from "vitest";
import {
  cnotOp,
  gateOp,
  runCircuit,
  type Circuit,
  type Op,
} from "../../src/lib/quantum/circuit";
import {
  blochToCartesian,
  stateToBloch,
  type BlochCartesian,
} from "../../src/lib/quantum/bloch";
import {
  blochVectorFromRho,
  reducedDensityMatrix,
} from "../../src/lib/quantum/reducedDensity";
import {
  cz,
  teleportationCircuit,
} from "../../src/lib/quantum/teleportation";

const EPS = 1e-9;
const approx = (a: number, b: number, eps = EPS) => Math.abs(a - b) < eps;

/** Run `prepare` on a fresh 1-qubit simulator and return q0's Bloch (x,y,z). */
const expectedBlochFromPrepare = (prepare: Op[]): BlochCartesian => {
  const c: Circuit = { qubits: 1, steps: prepare.map((op) => [op]) };
  const { sim } = runCircuit(c);
  return blochToCartesian(stateToBloch(sim.state));
};

/* -------------------------------------------------------------------------- */
/* Suite 1 — deferred-measurement identity ----------------------------------- */

describe("teleportationCircuit — deferred-measurement identity", () => {
  test.each<[string, Op[]]>([
    ["|0⟩ (identity prep)", []],
    ["|1⟩ (X)", [gateOp("X", 0)]],
    ["|+⟩ (H)", [gateOp("H", 0)]],
    ["(|0⟩ + i|1⟩)/√2 (H · S)", [gateOp("H", 0), gateOp("S", 0)]],
  ])("teleports %s onto q2", (_label, prepare) => {
    const expected = expectedBlochFromPrepare(prepare);

    const { sim } = runCircuit(teleportationCircuit({ prepare }));
    const rhoQ2 = reducedDensityMatrix(sim.state, 2, 3);
    const got = blochVectorFromRho(rhoQ2);

    expect(approx(got.x, expected.x)).toBe(true);
    expect(approx(got.y, expected.y)).toBe(true);
    expect(approx(got.z, expected.z)).toBe(true);

    // q2 is a pure state at protocol end ⇒ Tr(ρ²) = 1.
    const purity =
      rhoQ2[0][0].re * rhoQ2[0][0].re +
      rhoQ2[1][1].re * rhoQ2[1][1].re +
      2 * (rhoQ2[0][1].re * rhoQ2[0][1].re + rhoQ2[0][1].im * rhoQ2[0][1].im);
    expect(approx(purity, 1)).toBe(true);
  });
});

/* -------------------------------------------------------------------------- */
/* Suite 2 — Bell-basis readout (BSM only) ----------------------------------- */

describe("teleportationCircuit — Bell-basis readout", () => {
  it("Bell-prep + H(0) + BSM yields uniform (q0, q1) marginal", () => {
    // Only the unitary front half of the protocol: Bell prep, prepare |+⟩
    // on q0, then the BSM CNOT+H. No corrections yet.
    const partial: Circuit = {
      qubits: 3,
      steps: [
        [gateOp("H", 1)],
        [cnotOp(1, 2)],
        [gateOp("H", 0)],
        [cnotOp(0, 1)],
        [gateOp("H", 0)],
      ],
    };
    const { sim } = runCircuit(partial);

    // Sum |ψ|² over q2's bit to get the joint marginal over (q0, q1).
    const marginal = [0, 0, 0, 0]; // index = 2*q1 + q0
    for (let i = 0; i < sim.state.length; i++) {
      const a = sim.state[i];
      const p = a.re * a.re + a.im * a.im;
      const q0 = i & 1;
      const q1 = (i >> 1) & 1;
      marginal[2 * q1 + q0] += p;
    }

    for (const p of marginal) {
      expect(approx(p, 0.25)).toBe(true);
    }
  });
});

/* -------------------------------------------------------------------------- */
/* Suite 3 — reduced-density forwarding (mid-protocol entanglement) ---------- */

describe("teleportationCircuit — mid-protocol q2 is maximally mixed", () => {
  it("after BSM (pre-correction), q2's Bloch radius is 0 for |+⟩ input", () => {
    const partial: Circuit = {
      qubits: 3,
      steps: [
        [gateOp("H", 1)],
        [cnotOp(1, 2)],
        [gateOp("H", 0)], // prepare |+⟩ on q0
        [cnotOp(0, 1)],
        [gateOp("H", 0)],
      ],
    };
    const { sim } = runCircuit(partial);
    const rhoQ2 = reducedDensityMatrix(sim.state, 2, 3);
    const v = blochVectorFromRho(rhoQ2);
    expect(v.r).toBeLessThan(EPS);
  });
});

/* -------------------------------------------------------------------------- */
/* Suite 4 — cz decomposition ------------------------------------------------ */

describe("cz", () => {
  it("returns [H(target), CNOT(control, target), H(target)]", () => {
    expect(cz(0, 2)).toEqual([
      gateOp("H", 2),
      cnotOp(0, 2),
      gateOp("H", 2),
    ]);
  });

  it("throws when control === target", () => {
    expect(() => cz(0, 0)).toThrow();
  });
});
