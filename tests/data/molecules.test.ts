/**
 * Schema + data tests for `src/data/molecules.json` (via the typed shim
 * `src/data/molecules.ts`).
 *
 * Seven suites lock D-22..D-26:
 *   1. All three molecules present (`h2`, `lih`, `hehplus`).
 *   2. Schema completeness — every required field, finite numerics,
 *      `qubits ≤ MAX_QUBITS = 4`, positive equilibrium distance,
 *      non-empty text citation.
 *   3. Unit consistency — `energy_ev ≈ energy_hartree × HARTREE_TO_EV`
 *      to ≤ 1e-3 eV absolute (D-23).
 *   4. Ansatz round-trips through `validateCircuit` (D-24).
 *   5. `toQiskit(ansatz_ops)` emits a non-empty snippet with the
 *      expected `QuantumCircuit(n` header and at least one `qc.ry(`.
 *   6. `ansatz_params.theta1/theta2` ↔ first `rot` op on q0/q1 (D-6).
 *   7. `MOLECULES.h2.energy_hartree` is within `5e-2 Hₐ` of
 *      `H2_TRUE_MINIMUM.energy` from `src/lib/quantum/vqe.ts`. Loose
 *      tolerance because the molecule row may carry a slightly
 *      different reference than the analytic surface. Self-skips if
 *      `vqe.ts` does not yet exist (sibling Plan 06-01 lands it).
 */

import { describe, expect, it } from "vitest";
import {
  HARTREE_TO_EV,
  MOLECULE_IDS,
  MOLECULES,
  type Molecule,
} from "../../src/data/molecules";
import { MAX_QUBITS, validateCircuit } from "../../src/lib/quantum/circuit";
import type { Op } from "../../src/lib/quantum/circuit";
import { toQiskit } from "../../src/lib/quantum/qiskit";

// --- Suite 7 setup: optional dependency on sibling Plan 06-01 ---
// `vqe.ts` may not exist yet when this file is first run. Probe with a
// dynamic import; if it resolves, run Suite 7; otherwise `describe.skipIf`
// skips it so the rest of the file still passes.
//
// The `@ts-ignore` is intentional and bidirectional: TS rejects the path
// when `vqe.ts` is missing (pre-06-01), and we need the file to typecheck
// in BOTH states (missing and present). Once 06-01 lands, the comment
// becomes a no-op rather than an `@ts-expect-error` failure.
let H2_TRUE_MINIMUM: { energy: number } | null = null;
try {
  // @ts-ignore — module may not exist yet (sibling Plan 06-01 lands it)
  const mod = (await import("../../src/lib/quantum/vqe")) as {
    H2_TRUE_MINIMUM?: { energy: number };
  };
  H2_TRUE_MINIMUM = mod.H2_TRUE_MINIMUM ?? null;
} catch {
  H2_TRUE_MINIMUM = null;
}

const ALL_MOLECULES: ReadonlyArray<[string, Molecule]> = MOLECULE_IDS.map(
  (id) => [id, MOLECULES[id]],
);

// ─────────────────────────────────────────────────────────────────────
describe("1. molecule registry — all three present", () => {
  it("MOLECULE_IDS has exactly 3 entries (h2, hehplus, lih)", () => {
    expect(MOLECULE_IDS.length).toBe(3);
    expect(new Set(MOLECULE_IDS)).toEqual(new Set(["h2", "hehplus", "lih"]));
  });

  it("MOLECULES has a Molecule for every id, and no extras", () => {
    expect(Object.keys(MOLECULES).sort()).toEqual(
      [...MOLECULE_IDS].sort(),
    );
    for (const id of MOLECULE_IDS) {
      expect(MOLECULES[id]).toBeDefined();
      expect(MOLECULES[id].id).toBe(id);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────
describe("2. schema completeness — required fields, finite numerics, bounds", () => {
  it.each(ALL_MOLECULES)("%s has every required field with the right type", (_id, m) => {
    expect(typeof m.id).toBe("string");
    expect(m.id.length).toBeGreaterThan(0);
    expect(typeof m.name).toBe("string");
    expect(m.name.length).toBeGreaterThan(0);
    expect(typeof m.formula).toBe("string");
    expect(m.formula.length).toBeGreaterThan(0);
    expect(typeof m.description).toBe("string");
    expect(m.description.length).toBeGreaterThan(0);
    expect(typeof m.equilibrium_distance_angstrom).toBe("number");
    expect(typeof m.qubits).toBe("number");
    expect(typeof m.ansatz_params).toBe("object");
    expect(typeof m.ansatz_params.theta1).toBe("number");
    expect(typeof m.ansatz_params.theta2).toBe("number");
    expect(Array.isArray(m.ansatz_ops)).toBe(true);
    expect(typeof m.energy_hartree).toBe("number");
    expect(typeof m.energy_ev).toBe("number");
    expect(typeof m.precomputed_note).toBe("string");
    expect(m.precomputed_note.length).toBeGreaterThan(0);
    expect(typeof m.source).toBe("string");
    expect(m.source.length).toBeGreaterThan(0);
  });

  it.each(ALL_MOLECULES)("%s has finite, non-NaN numeric fields", (_id, m) => {
    expect(Number.isFinite(m.equilibrium_distance_angstrom)).toBe(true);
    expect(Number.isFinite(m.qubits)).toBe(true);
    expect(Number.isFinite(m.ansatz_params.theta1)).toBe(true);
    expect(Number.isFinite(m.ansatz_params.theta2)).toBe(true);
    expect(Number.isFinite(m.energy_hartree)).toBe(true);
    expect(Number.isFinite(m.energy_ev)).toBe(true);
    for (const step of m.ansatz_ops) {
      for (const op of step) {
        if (op.kind === "rot") {
          expect(Number.isFinite(op.theta)).toBe(true);
        }
      }
    }
  });

  it.each(ALL_MOLECULES)("%s respects qubit bounds (1 ≤ qubits ≤ MAX_QUBITS)", (_id, m) => {
    expect(Number.isInteger(m.qubits)).toBe(true);
    expect(m.qubits).toBeGreaterThanOrEqual(1);
    expect(m.qubits).toBeLessThanOrEqual(MAX_QUBITS);
  });

  it.each(ALL_MOLECULES)("%s has positive equilibrium bond distance", (_id, m) => {
    expect(m.equilibrium_distance_angstrom).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────
describe("3. unit consistency — energy_ev ≈ energy_hartree × HARTREE_TO_EV", () => {
  it("HARTREE_TO_EV is the documented CODATA-2018-aligned constant", () => {
    expect(HARTREE_TO_EV).toBe(27.211386245988);
  });

  it.each(ALL_MOLECULES)(
    "%s: |energy_ev − energy_hartree × HARTREE_TO_EV| < 1e-3 eV",
    (_id, m) => {
      const expected = m.energy_hartree * HARTREE_TO_EV;
      const drift = Math.abs(m.energy_ev - expected);
      expect(drift).toBeLessThan(1e-3);
    },
  );
});

// ─────────────────────────────────────────────────────────────────────
describe("4. ansatz round-trips through validateCircuit", () => {
  it.each(ALL_MOLECULES)("%s ansatz passes validateCircuit", (_id, m) => {
    expect(() =>
      validateCircuit({ qubits: m.qubits, steps: m.ansatz_ops as Op[][] }),
    ).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────
describe("5. Qiskit export is non-empty and includes expected method calls", () => {
  it.each(ALL_MOLECULES)("%s toQiskit() emits QuantumCircuit(n …) and a qc.ry( call", (_id, m) => {
    const snippet = toQiskit({
      qubits: m.qubits,
      steps: m.ansatz_ops as Op[][],
    });
    expect(snippet.length).toBeGreaterThan(0);
    expect(snippet).toContain(`QuantumCircuit(${m.qubits}`);
    expect(snippet).toContain("qc.ry(");
  });
});

// ─────────────────────────────────────────────────────────────────────
describe("6. ansatz_params matches the first rot op on q0/q1", () => {
  const firstRotTheta = (m: Molecule, qubit: number): number | undefined => {
    for (const step of m.ansatz_ops) {
      for (const op of step) {
        if (op.kind === "rot" && op.qubit === qubit) return op.theta;
      }
    }
    return undefined;
  };

  it.each(ALL_MOLECULES)("%s: ansatz_params.theta1 === first rot op on q0", (_id, m) => {
    const theta = firstRotTheta(m, 0);
    expect(theta).toBeDefined();
    expect(theta).toBe(m.ansatz_params.theta1);
  });

  it.each(ALL_MOLECULES)("%s: ansatz_params.theta2 === first rot op on q1", (_id, m) => {
    const theta = firstRotTheta(m, 1);
    expect(theta).toBeDefined();
    expect(theta).toBe(m.ansatz_params.theta2);
  });
});

// ─────────────────────────────────────────────────────────────────────
describe.skipIf(!H2_TRUE_MINIMUM)(
  "7. H₂ row sanity vs vqe.ts H2_TRUE_MINIMUM (loose 5e-2 Hₐ)",
  () => {
    it("MOLECULES.h2.energy_hartree is within 5e-2 Hₐ of H2_TRUE_MINIMUM.energy", () => {
      // H2_TRUE_MINIMUM is provably non-null inside this branch — skipIf gated it.
      const ref = H2_TRUE_MINIMUM!.energy;
      const drift = Math.abs(MOLECULES.h2.energy_hartree - ref);
      expect(
        drift,
        `MOLECULES.h2.energy_hartree=${MOLECULES.h2.energy_hartree} drifted ${drift} Hₐ from vqe.ts H2_TRUE_MINIMUM.energy=${ref} (tolerance 5e-2 because the molecule row may use a slightly different reference than the analytic surface)`,
      ).toBeLessThan(5e-2);
    });
  },
);
