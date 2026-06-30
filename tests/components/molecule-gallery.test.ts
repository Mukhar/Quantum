/**
 * MoleculeGallery structural + data-flow smoke test.
 *
 * The `.astro` shell is theme glue + a static fan-out over
 * `MOLECULES`; we can't render it in vitest, so we (a) grep the raw
 * source for the locked structural anchors required by Plan 06-04,
 * and (b) re-execute the pure logic the frontmatter relies on
 * (`validateCircuit` + `toQiskit`) directly against
 * `src/data/molecules` so we prove the data flows end-to-end to the
 * Qiskit string the gallery hands to `CircuitView` per card.
 *
 * Six assertions (mirrors Plan 06-04 §Tests):
 *   1. `data-widget="molecule-gallery"` + one `data-molecule-id=`
 *      reference per molecule (h2, lih, hehplus).
 *   2. Source imports `MOLECULES` from `../data/molecules`.
 *   3. Source embeds `<CircuitView` with `showRemixLink={false}`
 *      (asserts the remix link is intentionally suppressed — the
 *      chemistry CTA is "run on real Qiskit", not "edit in sandbox").
 *   4. Source contains no `Math.random` and no other non-deterministic
 *      construct — every visible number is pre-baked (D-25).
 *   5. (Logic-only) `validateCircuit({qubits, steps: ansatz_ops})`
 *      round-trips per molecule without throwing — re-asserted here
 *      so the gallery's build cannot regress past 06-02.
 *   6. (Logic-only) For each molecule, every `rot` op's converged
 *      `theta` appears in the `toQiskit(circuit)` output to ≥ 4
 *      significant figures — proves the data flows from JSON →
 *      validated `Circuit` → Qiskit snippet that the rendered
 *      `CircuitView` bakes into its `data-qiskit` Copy button.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { MOLECULE_IDS, MOLECULES } from "../../src/data/molecules";
import {
  toQiskit,
  validateCircuit,
  type Circuit,
  type Op,
} from "../../src/lib/quantum";

const SRC = readFileSync(
  resolve(__dirname, "../../src/components/MoleculeGallery.astro"),
  "utf8",
);

describe("MoleculeGallery.astro structural contract", () => {
  it("declares the canonical widget mount selector and one card per molecule id", () => {
    expect(SRC).toContain('data-widget="molecule-gallery"');
    // Card fan-out: each molecule id reachable via `data-molecule-id={m.id}`.
    expect(SRC).toContain("data-molecule-id={m.id}");
    // Sanity: the three locked ids are exactly the set MoleculeGallery iterates.
    expect([...MOLECULE_IDS].sort()).toEqual(["h2", "hehplus", "lih"].sort());
  });

  it("imports MOLECULES (and the canonical id list) from the typed data shim", () => {
    // The component must consume the validated shim, not re-import the
    // raw JSON, so it inherits the schema + type guarantees.
    expect(SRC).toMatch(
      /import\s*\{[^}]*MOLECULES[^}]*\}\s*from\s*"\.\.\/data\/molecules"/,
    );
    expect(SRC).toMatch(
      /import\s*\{[^}]*MOLECULE_IDS[^}]*\}\s*from\s*"\.\.\/data\/molecules"/,
    );
  });

  it("embeds <CircuitView showRemixLink={false}> per card (no remix-in-sandbox CTA)", () => {
    expect(SRC).toContain("<CircuitView");
    expect(SRC).toContain("showRemixLink={false}");
    // Defence-in-depth: the gallery must never accidentally pass
    // `showRemixLink={true}` (or no prop, which defaults to `true`).
    expect(SRC).not.toContain("showRemixLink={true}");
  });

  it("contains no Math.random or other non-deterministic construct — data is pre-baked", () => {
    expect(SRC).not.toContain("Math.random");
    // crypto.getRandomValues / Date.now / performance.now are all
    // sources of non-determinism that would silently violate D-25.
    expect(SRC).not.toMatch(/crypto\.getRandomValues/);
    expect(SRC).not.toMatch(/Date\.now\(\)/);
    expect(SRC).not.toMatch(/performance\.now\(\)/);
  });

  it("calls validateCircuit at frontmatter time (build-time safety net per D-21)", () => {
    // The component must call validateCircuit on each molecule's ansatz
    // so a bad data edit fails the build instead of shipping a broken
    // Copy-as-Qiskit button.
    expect(SRC).toContain("validateCircuit(circuit)");
    expect(SRC).toMatch(
      /import\s*\{[^}]*validateCircuit[^}]*\}\s*from\s*"\.\.\/lib\/quantum"/,
    );
  });
});

// ─────────────────────────────────────────────────────────────────────
// Logic-only mirrors of the frontmatter. These re-execute the pure
// pipeline the gallery relies on so the build can't ship a Circuit
// that fails validation or a Qiskit snippet missing the converged
// theta values.
describe("MoleculeGallery data pipeline — validateCircuit + toQiskit per molecule", () => {
  it.each(MOLECULE_IDS.map((id) => [id, MOLECULES[id]] as const))(
    "%s: validateCircuit round-trips on { qubits, steps: ansatz_ops }",
    (_id, m) => {
      const circuit: Circuit = {
        qubits: m.qubits,
        steps: m.ansatz_ops as Op[][],
      };
      expect(() => validateCircuit(circuit)).not.toThrow();
    },
  );

  it.each(MOLECULE_IDS.map((id) => [id, MOLECULES[id]] as const))(
    "%s: toQiskit(circuit) contains every converged theta to ≥ 4 sig figs",
    (_id, m) => {
      const circuit: Circuit = {
        qubits: m.qubits,
        steps: m.ansatz_ops as Op[][],
      };
      const snippet = toQiskit(circuit, {
        headerComment: `Ansatz for ${m.formula} at equilibrium`,
      });

      // Header sanity — confirms the headerComment path the gallery uses.
      expect(snippet).toContain(`# Ansatz for ${m.formula} at equilibrium`);

      // For every rot op in the ansatz, look for the matching
      // `qc.ry(<theta>, <qubit>)` (or rx/rz) line and assert the
      // emitted theta is within 1e-4 of the source — well inside
      // "4 significant figures" for these |θ| < 1 values, and robust
      // against IEEE-754 representation of decimal JSON literals
      // (e.g. -0.142 → -0.14199999999999999 via toPrecision(17)).
      const rotOps = m.ansatz_ops.flat().filter(
        (op): op is Extract<Op, { kind: "rot" }> => op.kind === "rot",
      );
      expect(rotOps.length).toBeGreaterThan(0);

      for (const op of rotOps) {
        const method = `r${op.axis.toLowerCase()}`; // ry / rx / rz
        const pattern = new RegExp(
          `qc\\.${method}\\(([-+\\d.eE]+),\\s*${op.qubit}\\)`,
          "g",
        );
        const matches = [...snippet.matchAll(pattern)];
        expect(
          matches.length,
          `expected at least one qc.${method}(*, ${op.qubit}) line for molecule ${m.id}`,
        ).toBeGreaterThan(0);

        const found = matches.some(
          (mt) => Math.abs(parseFloat(mt[1]) - op.theta) < 1e-4,
        );
        expect(
          found,
          `qc.${method}(*, ${op.qubit}) in ${m.id} should carry θ ≈ ${op.theta} (got ${matches
            .map((mt) => mt[1])
            .join(", ")})`,
        ).toBe(true);
      }
    },
  );
});
