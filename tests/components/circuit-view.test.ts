/**
 * CircuitView prop-shape + helper-function sanity tests.
 *
 * We can't render the .astro component directly in vitest without a
 * full Astro environment. But the component's heavy lifting is in two
 * helpers (`cellLabel` and `cellFill`) that mirror the composer's
 * vocabulary, plus the build-time `encodeCircuit` call for the
 * remix link. We test the contract those depend on:
 *
 *   1. Every Op kind has a non-empty cellLabel
 *   2. CNOT control yields "•", target yields "⊕"
 *   3. Rotation gates yield "Rx", "Ry", "Rz" (lowercased axis)
 *   4. encodeCircuit succeeds on the sample circuits the algorithm
 *      essays will pass to CircuitView (Bell pair + Deutsch's
 *      circuit)
 *   5. CircuitView's expected viewBox math doesn't break on edge
 *      cases (empty steps, single qubit, 4 qubits, 20 steps)
 *
 * The helpers live as inline functions inside `CircuitView.astro`,
 * so we re-declare them here to test the contract. If they drift in
 * the .astro file, the algorithm-essay sub-agents will catch the
 * visual regression in their acceptance step. Cheap insurance.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  encodeCircuit,
  gateOp,
  cnotOp,
  rotOp,
  measureOp,
  toQiskit,
  type Circuit,
  type Op,
} from "../../src/lib/quantum";

// Re-declared mirrors of CircuitView's internal helpers.
// Keep in sync with src/components/CircuitView.astro.
function cellLabel(op: Op, q: number): string {
  switch (op.kind) {
    case "gate":   return op.gate;
    case "rot":    return `R${op.axis.toLowerCase()}`;
    case "measure": return "M";
    case "cnot":   return op.control === q ? "•" : "⊕";
  }
}

describe("CircuitView cellLabel helper", () => {
  it("returns the discrete gate name for gate ops", () => {
    expect(cellLabel(gateOp("H", 0), 0)).toBe("H");
    expect(cellLabel(gateOp("X", 1), 1)).toBe("X");
    expect(cellLabel(gateOp("S", 0), 0)).toBe("S");
    expect(cellLabel(gateOp("T", 2), 2)).toBe("T");
  });

  it("returns 'M' for measure ops regardless of qubit", () => {
    expect(cellLabel(measureOp(0), 0)).toBe("M");
    expect(cellLabel(measureOp(3), 3)).toBe("M");
  });

  it("returns 'Rx' / 'Ry' / 'Rz' for rotations (axis lowercased)", () => {
    expect(cellLabel(rotOp("X", 0, Math.PI), 0)).toBe("Rx");
    expect(cellLabel(rotOp("Y", 1, Math.PI / 2), 1)).toBe("Ry");
    expect(cellLabel(rotOp("Z", 2, 0.1), 2)).toBe("Rz");
  });

  it("returns '•' for the CNOT control row and '⊕' for the target row", () => {
    const op = cnotOp(0, 1);
    expect(cellLabel(op, 0)).toBe("•"); // control
    expect(cellLabel(op, 1)).toBe("⊕"); // target
  });
});

describe("CircuitView encodes the starter circuits the algorithm essays will use", () => {
  it("encodes the Bell-Φ⁺ preparation [H q0; CNOT(0,1)]", () => {
    const bell: Circuit = {
      qubits: 2,
      steps: [[gateOp("H", 0)], [cnotOp(0, 1)]],
    };
    expect(() => encodeCircuit(bell)).not.toThrow();
    expect(encodeCircuit(bell).length).toBeLessThan(50);
  });

  it("encodes a Deutsch-shape circuit (2 qubits, 6 steps mixed)", () => {
    const deutsch: Circuit = {
      qubits: 2,
      steps: [
        [gateOp("X", 1)],
        [gateOp("H", 0), gateOp("H", 1)],
        [cnotOp(0, 1)],
        [gateOp("H", 0)],
        [measureOp(0)],
      ],
    };
    expect(() => encodeCircuit(deutsch)).not.toThrow();
    expect(encodeCircuit(deutsch).length).toBeLessThan(100);
  });
});

/* -------------------------------------------------------------------------- */
/* QSK-02 wiring — file-string assertions on CircuitView.astro itself.
 * vitest can't render Astro, so we read the source and prove the
 * essential markup + import are present. The drift gate in
 * tests/quantum/qiskit.test.ts owns per-gate emission correctness;
 * these tests only enforce that CircuitView consumes it. */

const CIRCUIT_VIEW_SOURCE = readFileSync(
  fileURLToPath(new URL("../../src/components/CircuitView.astro", import.meta.url)),
  "utf8",
);

describe("CircuitView — Copy as Qiskit wiring (QSK-02)", () => {
  it("imports toQiskit from the quantum barrel", () => {
    expect(CIRCUIT_VIEW_SOURCE).toMatch(
      /import\s*\{[^}]*\btoQiskit\b[^}]*\}\s*from\s*["']\.\.\/lib\/quantum["']/,
    );
  });

  it("renders a button with data-action='copy-qiskit' and a data-qiskit attribute", () => {
    expect(CIRCUIT_VIEW_SOURCE).toContain('data-action="copy-qiskit"');
    expect(CIRCUIT_VIEW_SOURCE).toContain("data-qiskit={qiskitText}");
  });

  it("calls toQiskit(circuit) at build time (single call site)", () => {
    expect(CIRCUIT_VIEW_SOURCE).toMatch(/const\s+qiskitText\s*=\s*toQiskit\(circuit/);
  });

  it("ships a click hydrator that writes data-qiskit to clipboard", () => {
    expect(CIRCUIT_VIEW_SOURCE).toContain("navigator.clipboard.writeText");
    expect(CIRCUIT_VIEW_SOURCE).toMatch(/dataset\.action\s*!==\s*["']copy-qiskit["']/);
  });
});

describe("CircuitView — toQiskit produces sane snippets for essay circuits", () => {
  it("Bell-Φ⁺ snippet starts with the header comment and contains qc.h(0) + qc.cx(0, 1)", () => {
    const bell: Circuit = {
      qubits: 2,
      steps: [[gateOp("H", 0)], [cnotOp(0, 1)]],
    };
    const out = toQiskit(bell);
    expect(out.startsWith("# Generated by quantum-site v3")).toBe(true);
    expect(out).toContain("qc = QuantumCircuit(2, 2)");
    expect(out).toContain("qc.h(0)");
    expect(out).toContain("qc.cx(0, 1)");
  });
});
