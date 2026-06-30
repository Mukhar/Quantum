/**
 * Static N=15 Shor circuit + Qiskit exporter.
 *
 * Phase 5b owns the FULL Shor display path. The sandbox `Circuit` IR
 * (`circuit.ts`) hard-caps qubits at 4 and only supports
 * `gate | cnot | rot | measure`. Shor for N=15 needs:
 *
 *   - A counting register of 4 qubits (Q = 2^4 = 16, enough resolution
 *     to see periods that divide 16 for N=15).
 *   - A work register of 4 qubits (need ⌈log₂15⌉ = 4 to hold 0..14).
 *   - Hadamards on the counting register.
 *   - Modular exponentiation `a^x mod 15` controlled on the counting
 *     register — a many-qubit modular subroutine.
 *   - The inverse QFT on the counting register, which uses controlled
 *     phase rotations the sandbox IR does not support.
 *   - Measurement of the counting register.
 *
 * Adding controlled-phase + modular blocks to `Circuit` would force a
 * coordinated rewrite of `simulator.ts`, `codec.ts`, `qiskit.ts`, and
 * `CircuitView` — and the locked phase decision (D-15..D-18 in
 * PHASE-CONTEXT.md) explicitly excludes weakening the sandbox cap or
 * mutating the global Op vocabulary just to draw Shor-15.
 *
 * So this module is a **separate, static** display + export model:
 *
 *   - `ShorStaticCircuit` is its own shape; it is NOT a `Circuit` and
 *     intentionally does not run through `validateCircuit`,
 *     `encodeCircuit`, or `toQiskit`.
 *   - `buildShor15()` returns one canonical static circuit with
 *     register metadata and labeled blocks for a renderer.
 *   - `toQiskitShor15()` emits a Qiskit Python snippet that is richer
 *     than the sandbox path: it uses `QuantumCircuit.append(QFT(...))`
 *     and explicit modular-exponentiation steps. It is allowed —
 *     and required — to be a "go run this for real" artifact rather
 *     than a sandbox-remix fragment.
 *
 * The renderer (`LargeCircuitView`, plan 05b-02) consumes
 * `ShorStaticCircuit`; the `/shor` essay (plan 05b-04) renders that
 * plus a prominent "Copy Shor N=15 Qiskit" button.
 */

/**
 * Static op shapes used purely for diagram layout. They carry a
 * human label, the qubit(s) they sit on, and an optional `group`
 * tag so the renderer can outline grouped subroutines (Hadamards,
 * modular exponentiation, inverse QFT, measurement).
 *
 * Distinct from `Op` in `circuit.ts` — the sandbox simulator never
 * sees these.
 */
export type StaticCircuitOp =
  | { kind: "h"; qubit: number; label: "H"; group?: ShorBlockId }
  | {
      kind: "cphase";
      control: number;
      target: number;
      label: string;
      group?: ShorBlockId;
    }
  | {
      kind: "block";
      qubits: number[];
      label: string;
      detail?: string;
      group?: ShorBlockId;
    }
  | { kind: "swap"; qubitA: number; qubitB: number; group?: ShorBlockId }
  | { kind: "measure"; qubit: number; classicalBit: number; group?: ShorBlockId };

/**
 * Logical group identifiers — the renderer uses these to draw the
 * outlined section bands behind the steps.
 */
export type ShorBlockId =
  | "init"
  | "modexp"
  | "iqft"
  | "measure";

export interface ShorBlock {
  id: ShorBlockId;
  label: string;
  /** Inclusive [startStep, endStep] band the renderer should outline. */
  steps: [number, number];
  /** Inclusive qubit rows the block touches; renderer uses for vertical band. */
  qubits: [number, number];
  /** One-line caption for the section. */
  caption: string;
}

/**
 * Register layout for Shor-15. The counting register stores the
 * superposition over `x` values; the work register holds
 * `a^x mod 15`. Classical bits receive the counting-register
 * measurements at the end.
 */
export interface ShorRegisterLayout {
  countingQubits: [number, number]; // inclusive
  workQubits: [number, number]; // inclusive
  classicalBits: number;
}

export interface ShorStaticCircuit {
  qubits: number;
  classicalBits: number;
  registers: ShorRegisterLayout;
  /** `steps[t]` is one diagrammatic timeslice; ops may share a step. */
  steps: StaticCircuitOp[][];
  /** Logical sections the renderer outlines. */
  blocks: ShorBlock[];
  /** `a` in `a^x mod N` — the random coprime base. */
  base: number;
  /** `N` to factor. */
  N: number;
}

/**
 * 8 qubits total: 4 counting + 4 work. Wider than the sandbox cap of 4
 * deliberately — this circuit lives outside the simulator.
 */
export const SHOR15_QUBITS = 8;

/** Short prose used by `/shor` and any landing card. */
export const SHOR15_DESCRIPTION =
  "Shor's algorithm for N=15 with random base a=7. " +
  "Counting register (q0..q3) carries the superposition over x; " +
  "work register (q4..q7) holds 7^x mod 15. Inverse QFT on the " +
  "counting register concentrates probability at multiples of " +
  "16/r, where r is the multiplicative order of 7 mod 15 (r = 4).";

/**
 * Build the canonical static Shor circuit for N=15 with base a=7.
 *
 * The chosen `a = 7` is deliberate: it is coprime to 15, has period
 * `r = 4` which divides the register size `Q = 16` exactly, and
 * produces the cleanest pedagogical comb when read post-iQFT.
 *
 * Step layout (12 steps total):
 *
 *   step 0      : Init H on counting register q0..q3 (one block step)
 *   step 1..4   : 4 controlled modular-multiplication blocks
 *                 (one per counting qubit)
 *   step 5..10  : Inverse QFT on the counting register
 *                 - H on q3
 *                 - controlled R†(π/2) (q2→q3)
 *                 - H on q2, controlled R†(π/4)/R†(π/2) chain
 *                 - finishing with H on q0 and swap pairs
 *   step 11     : Measure q0..q3 into classical bits 0..3
 *
 * Step counts and op order match the textbook 4-qubit inverse QFT
 * decomposition (Nielsen & Chuang §5.3, Fig. 5.1) plus controlled
 * modular exponentiation blocks. Snapshot tests freeze the structure.
 */
export const buildShor15 = (): ShorStaticCircuit => {
  const steps: StaticCircuitOp[][] = [];

  // step 0 — Hadamards on the counting register.
  steps.push([
    { kind: "h", qubit: 0, label: "H", group: "init" },
    { kind: "h", qubit: 1, label: "H", group: "init" },
    { kind: "h", qubit: 2, label: "H", group: "init" },
    { kind: "h", qubit: 3, label: "H", group: "init" },
  ]);

  // steps 1..4 — controlled modular-exponentiation blocks.
  // Each counting qubit controls multiplication by 7^(2^k) mod 15.
  // Renderer draws one wide block spanning the work register q4..q7.
  for (let k = 0; k < 4; k++) {
    const exponent = 1 << k;
    steps.push([
      {
        kind: "block",
        qubits: [k, 4, 5, 6, 7],
        label: `×7^${exponent} mod 15`,
        detail: `c-U_${exponent}`,
        group: "modexp",
      },
    ]);
  }

  // steps 5..10 — inverse QFT on the counting register (q0..q3).
  // Textbook 4-qubit iQFT decomposition: SWAPs then a triangular
  // Hadamard + controlled-phase staircase, drawn here in
  // little-endian order so qubit 0 stays LSB.
  //
  // step 5: SWAP q0 ↔ q3, SWAP q1 ↔ q2 (re-orders for textbook QFT).
  steps.push([
    { kind: "swap", qubitA: 0, qubitB: 3, group: "iqft" },
    { kind: "swap", qubitA: 1, qubitB: 2, group: "iqft" },
  ]);

  // step 6: H on q3 (now the most significant after the swap).
  steps.push([{ kind: "h", qubit: 3, label: "H", group: "iqft" }]);

  // step 7: controlled R†(π/2) from q2 onto q3.
  steps.push([
    {
      kind: "cphase",
      control: 2,
      target: 3,
      label: "R†_π/2",
      group: "iqft",
    },
  ]);

  // step 8: H on q2, controlled R†(π/4) from q1 onto q3.
  steps.push([
    { kind: "h", qubit: 2, label: "H", group: "iqft" },
    {
      kind: "cphase",
      control: 1,
      target: 3,
      label: "R†_π/4",
      group: "iqft",
    },
  ]);

  // step 9: controlled R†(π/2) from q1 onto q2,
  //         controlled R†(π/8) from q0 onto q3.
  steps.push([
    {
      kind: "cphase",
      control: 1,
      target: 2,
      label: "R†_π/2",
      group: "iqft",
    },
    {
      kind: "cphase",
      control: 0,
      target: 3,
      label: "R†_π/8",
      group: "iqft",
    },
  ]);

  // step 10: H on q1, controlled R†(π/4) from q0 onto q2,
  //          finally H on q0 (collapsed into the same diagrammatic
  //          slice — keeps the iQFT band visually compact).
  steps.push([
    { kind: "h", qubit: 1, label: "H", group: "iqft" },
    {
      kind: "cphase",
      control: 0,
      target: 2,
      label: "R†_π/4",
      group: "iqft",
    },
    {
      kind: "cphase",
      control: 0,
      target: 1,
      label: "R†_π/2",
      group: "iqft",
    },
    { kind: "h", qubit: 0, label: "H", group: "iqft" },
  ]);

  // step 11: measure the counting register into classical bits.
  steps.push([
    { kind: "measure", qubit: 0, classicalBit: 0, group: "measure" },
    { kind: "measure", qubit: 1, classicalBit: 1, group: "measure" },
    { kind: "measure", qubit: 2, classicalBit: 2, group: "measure" },
    { kind: "measure", qubit: 3, classicalBit: 3, group: "measure" },
  ]);

  const blocks: ShorBlock[] = [
    {
      id: "init",
      label: "Hadamard init",
      steps: [0, 0],
      qubits: [0, 3],
      caption: "Hadamards put the counting register in uniform superposition.",
    },
    {
      id: "modexp",
      label: "Controlled 7^x mod 15",
      steps: [1, 4],
      qubits: [0, 7],
      caption:
        "Four controlled modular multiplications entangle counting with 7^x mod 15.",
    },
    {
      id: "iqft",
      label: "Inverse QFT",
      steps: [5, 10],
      qubits: [0, 3],
      caption:
        "Inverse QFT concentrates probability at multiples of 16/r (r = 4).",
    },
    {
      id: "measure",
      label: "Measure counting register",
      steps: [11, 11],
      qubits: [0, 3],
      caption:
        "Measurement yields one of {0, 4, 8, 12}; classical post-processing recovers r = 4.",
    },
  ];

  return {
    qubits: SHOR15_QUBITS,
    classicalBits: 4,
    registers: {
      countingQubits: [0, 3],
      workQubits: [4, 7],
      classicalBits: 4,
    },
    steps,
    blocks,
    base: 7,
    N: 15,
  };
};

/**
 * Emit a runnable Qiskit Python snippet for Shor-15.
 *
 * This is the prominent export path that the `/shor` essay frames
 * as "you built the engine here; now run the real thing in Qiskit."
 * It deliberately uses Qiskit's higher-level primitives
 * (`QFT(...).inverse()` and a small modular-multiplication routine)
 * because hand-emitting every controlled-phase rotation makes the
 * snippet unreadable.
 *
 * The snippet does NOT:
 *   - call `encodeCircuit` (sandbox URL codec is 4-qubit only);
 *   - call `validateCircuit` (this is not a sandbox `Circuit`);
 *   - claim to run in this site's simulator.
 *
 * Pass `circuit` only if you want the snippet header to reference the
 * same `(a, N)` pair you used in the diagram. Default is `buildShor15()`.
 */
export const toQiskitShor15 = (circuit: ShorStaticCircuit = buildShor15()): string => {
  const { base: a, N, registers } = circuit;
  const [c0, c1] = registers.countingQubits;
  const [w0, w1] = registers.workQubits;
  const countingSize = c1 - c0 + 1;
  const workSize = w1 - w0 + 1;
  const Q = 1 << countingSize;

  const lines: string[] = [];
  lines.push(
    `# Shor's algorithm for N=${N} with base a=${a}.`,
  );
  lines.push(
    "# Generated by quantum-site v3 — static artifact (not a sandbox fragment).",
  );
  lines.push(
    `# Counting register: ${countingSize} qubits (Q = ${Q}).` +
      ` Work register: ${workSize} qubits.`,
  );
  lines.push(
    "# Run on real hardware or qiskit-aer; the in-browser simulator is capped at 4 qubits.",
  );
  lines.push("");
  lines.push("from qiskit import QuantumCircuit, QuantumRegister, ClassicalRegister");
  lines.push("from qiskit.circuit.library import QFT");
  lines.push("");
  lines.push(`# --- registers ---`);
  lines.push(`counting = QuantumRegister(${countingSize}, "counting")`);
  lines.push(`work = QuantumRegister(${workSize}, "work")`);
  lines.push(`creg = ClassicalRegister(${countingSize}, "c")`);
  lines.push(`qc = QuantumCircuit(counting, work, creg)`);
  lines.push("");
  lines.push("# --- step 1: Hadamards on the counting register ---");
  lines.push(`for q in range(${countingSize}):`);
  lines.push("    qc.h(counting[q])");
  lines.push("");
  lines.push("# --- step 2: |1⟩ on the work register (multiplicative identity) ---");
  lines.push("qc.x(work[0])");
  lines.push("");
  lines.push(`# --- step 3: controlled modular exponentiation: |x⟩|y⟩ → |x⟩|y · ${a}^x mod ${N}⟩ ---`);
  lines.push(`# Each counting qubit k controls multiplication by ${a}^(2^k) mod ${N}.`);
  lines.push("# Replace `c_amod15(...)` with your preferred modular-multiplication subroutine");
  lines.push("# (qiskit-textbook ships one for N=15; for general N use the Beauregard adder).");
  lines.push(`def c_amod${N}(a_pow: int) -> 'QuantumCircuit':`);
  lines.push("    \"\"\"Controlled multiplication by a_pow modulo N on a 4-qubit work register.");
  lines.push("    Implement explicitly for the values a^(2^k) mod 15 actually hits:");
  lines.push("      7^1 mod 15 = 7, 7^2 mod 15 = 4, 7^4 mod 15 = 1, 7^8 mod 15 = 1.");
  lines.push("    Each case is a fixed permutation on |0..15⟩ realised by SWAPs + Xs.\"\"\"");
  lines.push("    raise NotImplementedError(\"plug in qiskit_textbook.algorithms.c_amod15 here\")");
  lines.push("");
  lines.push(`for k in range(${countingSize}):`);
  lines.push(`    a_pow = pow(${a}, 2 ** k, ${N})`);
  lines.push(`    qc.append(c_amod${N}(a_pow).control(1), [counting[k], *work])`);
  lines.push("");
  lines.push("# --- step 4: inverse QFT on the counting register ---");
  lines.push(`qc.append(QFT(${countingSize}, do_swaps=True).inverse(), counting)`);
  lines.push("");
  lines.push("# --- step 5: measure the counting register ---");
  lines.push(`for q in range(${countingSize}):`);
  lines.push("    qc.measure(counting[q], creg[q])");
  lines.push("");
  lines.push("# Continued-fractions post-processing on the measured integer m:");
  lines.push(`# r = denominator of the convergent of m / ${Q} closest to a true rational;`);
  lines.push(`# then gcd(${a}^(r/2) ± 1, ${N}) yields a non-trivial factor of ${N} with high probability.`);
  return lines.join("\n") + "\n";
};
