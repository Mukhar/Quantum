/**
 * MiniBloch — math the component depends on.
 *
 * The .astro itself is mostly DOM plumbing; the pedagogically load-
 * bearing claim is that for the Bell state `(|00⟩ + |11⟩)/√2`, each
 * qubit's reduced Bloch radius `r` falls below the 0.98 threshold the
 * component uses to flip on the "entangled" badge. If that ever stops
 * being true (regression in `reducedDensityMatrix`, threshold drift,
 * etc.) the visualization silently lies — so we pin the contract here.
 *
 * We deliberately don't render the .astro component: vitest doesn't
 * carry the Astro runtime, and the .astro file is a thin DOM wrapper
 * around the same two pure functions tested below.
 */

import { describe, expect, it } from "vitest";
import { Simulator } from "../../src/lib/quantum/simulator";
import {
  reducedDensityMatrix,
  blochVectorFromRho,
} from "../../src/lib/quantum/reducedDensity";

/** Mirror of the constant inlined into MiniBloch.astro's hydrator. */
const ENTANGLED_THRESHOLD = 0.98;

describe("MiniBloch math contract", () => {
  it("Bell state ⇒ r → 0 on both qubits ⇒ badge fires", () => {
    const sim = new Simulator({ qubits: 2 });
    sim.apply("H", 0);
    sim.apply("CNOT", 0, 1);

    for (const q of [0, 1]) {
      const v = blochVectorFromRho(reducedDensityMatrix(sim.state, q, 2));
      // Maximally mixed reduced state ⇒ Bloch vector at the origin.
      expect(v.r).toBeLessThan(1e-12);
      // …which is well below the badge threshold.
      expect(v.r).toBeLessThan(ENTANGLED_THRESHOLD);
    }
  });

  it("product state (H on q0, q1 untouched) ⇒ r = 1 ⇒ badge stays off", () => {
    const sim = new Simulator({ qubits: 2 });
    sim.apply("H", 0);

    for (const q of [0, 1]) {
      const v = blochVectorFromRho(reducedDensityMatrix(sim.state, q, 2));
      expect(v.r).toBeGreaterThan(1 - 1e-12);
      expect(v.r).toBeGreaterThan(ENTANGLED_THRESHOLD);
    }
  });

  it("ground state |00⟩ ⇒ both arrows point at |0⟩ (z = +1)", () => {
    const sim = new Simulator({ qubits: 2 });
    for (const q of [0, 1]) {
      const v = blochVectorFromRho(reducedDensityMatrix(sim.state, q, 2));
      expect(v.z).toBeGreaterThan(1 - 1e-12);
      expect(v.r).toBeGreaterThan(ENTANGLED_THRESHOLD);
    }
  });
});
