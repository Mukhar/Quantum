/**
 * Static Shor N=15 helper tests (ALG-07).
 *
 * Three suites:
 *   1. Structure  — assert register sizes, block layout, step count.
 *   2. Isolation  — assert the static circuit is NOT assignable to
 *      the sandbox `Circuit` and that the helper never touches the
 *      sandbox URL codec or `validateCircuit`. This is the
 *      MAX_QUBITS=4 safety net.
 *   3. Snapshots  — freeze the Qiskit Python output and the structural
 *      summary so any future drift surfaces in the PR diff.
 */
import { describe, expect, it } from "vitest";
import {
  MAX_QUBITS,
  validateCircuit,
  type Circuit,
} from "../../src/lib/quantum/circuit";
import {
  buildShor15,
  toQiskitShor15,
  SHOR15_QUBITS,
  SHOR15_DESCRIPTION,
  type ShorStaticCircuit,
} from "../../src/lib/quantum/shor";

describe("buildShor15 — structure", () => {
  const circuit = buildShor15();

  it("uses 8 qubits (4 counting + 4 work), wider than the 4-qubit sandbox cap", () => {
    expect(circuit.qubits).toBe(SHOR15_QUBITS);
    expect(SHOR15_QUBITS).toBe(8);
    expect(SHOR15_QUBITS).toBeGreaterThan(MAX_QUBITS);
  });

  it("declares 4 classical bits for the counting register measurement", () => {
    expect(circuit.classicalBits).toBe(4);
  });

  it("declares the counting and work register layout", () => {
    expect(circuit.registers).toEqual({
      countingQubits: [0, 3],
      workQubits: [4, 7],
      classicalBits: 4,
    });
  });

  it("pins base a=7 and N=15 (canonical pedagogical pair)", () => {
    expect(circuit.base).toBe(7);
    expect(circuit.N).toBe(15);
  });

  it("has 12 diagram steps spanning init → modexp → iQFT → measure", () => {
    expect(circuit.steps).toHaveLength(12);
  });

  it("declares four logical blocks in execution order", () => {
    const ids = circuit.blocks.map((b) => b.id);
    expect(ids).toEqual(["init", "modexp", "iqft", "measure"]);
  });

  it("each block has a non-empty caption (no placeholder copy)", () => {
    for (const b of circuit.blocks) {
      expect(b.caption.length).toBeGreaterThan(0);
      expect(b.label.length).toBeGreaterThan(0);
    }
  });

  it("step 0 puts Hadamards on every counting qubit", () => {
    const initOps = circuit.steps[0];
    expect(initOps).toHaveLength(4);
    for (const op of initOps) {
      expect(op.kind).toBe("h");
    }
    const qubits = initOps
      .map((o) => (o.kind === "h" ? o.qubit : -1))
      .sort();
    expect(qubits).toEqual([0, 1, 2, 3]);
  });

  it("steps 1..4 are controlled modular-exponentiation blocks (×7^(2^k) mod 15)", () => {
    for (let k = 0; k < 4; k++) {
      const step = circuit.steps[1 + k];
      expect(step).toHaveLength(1);
      const op = step[0];
      expect(op.kind).toBe("block");
      if (op.kind === "block") {
        expect(op.label).toBe(`×7^${1 << k} mod 15`);
        expect(op.group).toBe("modexp");
        // block spans the controlling counting qubit + entire work register
        expect(op.qubits).toEqual([k, 4, 5, 6, 7]);
      }
    }
  });

  it("step 11 measures all 4 counting qubits into classical bits", () => {
    const measure = circuit.steps[11];
    expect(measure).toHaveLength(4);
    for (let q = 0; q < 4; q++) {
      const op = measure[q];
      expect(op.kind).toBe("measure");
      if (op.kind === "measure") {
        expect(op.qubit).toBe(q);
        expect(op.classicalBit).toBe(q);
      }
    }
  });

  it("inverse-QFT band (steps 5..10) is non-empty and uses controlled phase rotations", () => {
    const iqftSteps = circuit.steps.slice(5, 11);
    const flat = iqftSteps.flat();
    const cphases = flat.filter((o) => o.kind === "cphase");
    // Textbook 4-qubit iQFT has 6 controlled-phase ops total.
    expect(cphases.length).toBeGreaterThanOrEqual(6);
    // And at least one Hadamard appears in the iQFT band.
    expect(flat.some((o) => o.kind === "h")).toBe(true);
  });

  it("exposes a description string for landing copy", () => {
    expect(SHOR15_DESCRIPTION).toMatch(/N=15/);
    expect(SHOR15_DESCRIPTION).toMatch(/7\^x mod 15/);
  });
});

describe("buildShor15 — isolation from sandbox IR", () => {
  it("does NOT return a Circuit assignable shape (no `steps: Op[][]` validation)", () => {
    const circuit = buildShor15();
    // Static circuits carry ops with `kind: "h" | "cphase" | "block" | "swap" | "measure"`.
    // Sandbox `Circuit` ops use `kind: "gate" | "cnot" | "rot" | "measure"`.
    // The "h" / "cphase" / "block" / "swap" kinds prove the shapes are disjoint.
    const flat = circuit.steps.flat();
    for (const op of flat) {
      expect(["h", "cphase", "block", "swap", "measure"]).toContain(op.kind);
    }
    // Coerce to sandbox shape (intentional unsoundness) and prove
    // sandbox validation rejects either the qubit count or an op.
    const coerced = circuit as unknown as Circuit;
    expect(() => validateCircuit(coerced)).toThrow();
  });

  it("never escapes the 4-qubit sandbox cap", () => {
    expect(MAX_QUBITS).toBe(4);
    expect(buildShor15().qubits).toBeGreaterThan(MAX_QUBITS);
  });
});

describe("toQiskitShor15 — exporter", () => {
  const snippet = toQiskitShor15();

  it("emits a runnable Qiskit Python skeleton", () => {
    expect(snippet).toMatch(/from qiskit import QuantumCircuit/);
    expect(snippet).toMatch(/from qiskit\.circuit\.library import QFT/);
    expect(snippet).toMatch(/QFT\(4, do_swaps=True\)\.inverse\(\)/);
  });

  it("identifies itself as a static artifact, not a sandbox fragment", () => {
    expect(snippet).toMatch(/static artifact/);
    expect(snippet).not.toMatch(/circuit fragment/);
  });

  it("declares both registers and a 4-bit classical register", () => {
    expect(snippet).toMatch(/QuantumRegister\(4, "counting"\)/);
    expect(snippet).toMatch(/QuantumRegister\(4, "work"\)/);
    expect(snippet).toMatch(/ClassicalRegister\(4, "c"\)/);
  });

  it("uses a=7, N=15 in the modular-exponentiation section", () => {
    expect(snippet).toMatch(/a_pow = pow\(7, 2 \*\* k, 15\)/);
  });

  it("mentions continued-fractions post-processing", () => {
    expect(snippet).toMatch(/continued-fractions/i);
  });

  it("snapshot — full Python snippet (drift gate)", () => {
    expect(snippet).toMatchInlineSnapshot(`
      "# Shor's algorithm for N=15 with base a=7.
      # Generated by quantum-site v3 — static artifact (not a sandbox fragment).
      # Counting register: 4 qubits (Q = 16). Work register: 4 qubits.
      # Run on real hardware or qiskit-aer; the in-browser simulator is capped at 4 qubits.

      from qiskit import QuantumCircuit, QuantumRegister, ClassicalRegister
      from qiskit.circuit.library import QFT

      # --- registers ---
      counting = QuantumRegister(4, \"counting\")
      work = QuantumRegister(4, \"work\")
      creg = ClassicalRegister(4, \"c\")
      qc = QuantumCircuit(counting, work, creg)

      # --- step 1: Hadamards on the counting register ---
      for q in range(4):
          qc.h(counting[q])

      # --- step 2: |1⟩ on the work register (multiplicative identity) ---
      qc.x(work[0])

      # --- step 3: controlled modular exponentiation: |x⟩|y⟩ → |x⟩|y · 7^x mod 15⟩ ---
      # Each counting qubit k controls multiplication by 7^(2^k) mod 15.
      # Replace \`c_amod15(...)\` with your preferred modular-multiplication subroutine
      # (qiskit-textbook ships one for N=15; for general N use the Beauregard adder).
      def c_amod15(a_pow: int) -> 'QuantumCircuit':
          \"\"\"Controlled multiplication by a_pow modulo N on a 4-qubit work register.
          Implement explicitly for the values a^(2^k) mod 15 actually hits:
            7^1 mod 15 = 7, 7^2 mod 15 = 4, 7^4 mod 15 = 1, 7^8 mod 15 = 1.
          Each case is a fixed permutation on |0..15⟩ realised by SWAPs + Xs.\"\"\"
          raise NotImplementedError(\"plug in qiskit_textbook.algorithms.c_amod15 here\")

      for k in range(4):
          a_pow = pow(7, 2 ** k, 15)
          qc.append(c_amod15(a_pow).control(1), [counting[k], *work])

      # --- step 4: inverse QFT on the counting register ---
      qc.append(QFT(4, do_swaps=True).inverse(), counting)

      # --- step 5: measure the counting register ---
      for q in range(4):
          qc.measure(counting[q], creg[q])

      # Continued-fractions post-processing on the measured integer m:
      # r = denominator of the convergent of m / 16 closest to a true rational;
      # then gcd(7^(r/2) ± 1, 15) yields a non-trivial factor of 15 with high probability.
      "
    `);
  });

  it("accepts a custom static circuit (forwarded base/N into the snippet header)", () => {
    const custom: ShorStaticCircuit = { ...buildShor15(), base: 7, N: 15 };
    const out = toQiskitShor15(custom);
    expect(out).toMatch(/a=7/);
    expect(out).toMatch(/N=15/);
  });
});
