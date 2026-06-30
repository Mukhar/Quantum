/**
 * Quantum Fourier Transform + classical period-finding helpers.
 *
 * Phase 5a (`/shor`) needs three things the shipped IR cannot express
 * without surgery:
 *
 *   1. A QFT/inverse-QFT pair over 1–4 qubit state vectors.
 *   2. A "periodic structure becomes spikes" demo for the visualizer.
 *   3. A classical multiplicative-period helper that knows about the
 *      Shor preconditions (coprime, register window).
 *
 * Why this module, and not a new `Op` kind in `circuit.ts`:
 *
 * The current sandbox IR only knows `gate`, `cnot`, `rot`, `measure`.
 * QFT decomposes into Hadamards plus *controlled* phase rotations, and
 * controlled-phase is not in the supported set. Adding it would ripple
 * through `simulator.ts`, `codec.ts`, `qiskit.ts`, and `CircuitView`
 * during a phase whose stated job is to *preserve* the 4-qubit cap
 * (REQ-13) and the existing Qiskit export contract. So the QFT lives
 * here as pure state-vector math, with a *local* controlled-phase
 * helper that never escapes this module.
 *
 * Numerical strategy: direct DFT, O(N²). At N=16 (the simulator cap)
 * this is 256 complex multiplies — cheaper than the JS overhead of
 * any cleverer scheme, and it gives us one obvious test fixture
 * (the textbook DFT matrix) instead of two.
 *
 * Qubit / index convention: amplitude index `i` corresponds to the
 * basis state whose binary representation is `i`, with qubit 0 the
 * LEAST significant bit. This matches `Simulator`, `grover.ts`, and
 * Qiskit. The textbook QFT then reads
 *
 *   QFT |x⟩ = (1/√N) Σ_k exp(2πi · x · k / N) |k⟩
 *
 * directly on the integer index — no extra bit-reversal swap.
 */

import { type Complex, ZERO, add, mul, scale } from "./complex";

const MIN_QUBITS = 1;
const MAX_QUBITS = 4;
const MAX_N_FOR_PERIOD = 15;
/**
 * Default search window for `findMultiplicativePeriod`. Comfortably
 * larger than φ(15)=8 so every `N ≤ 15` case is found, and far below
 * the point where the helper would feel slow in the widget's debounce.
 */
const DEFAULT_PERIOD_WINDOW = 256;

/**
 * Apply the textbook QFT to a 1–4 qubit state vector and return a new
 * state vector. The input is not mutated. Length mismatch or
 * out-of-range qubit count throws a readable `RangeError`.
 */
export const qftState = (state: Complex[], qubits: number): Complex[] => {
  return dftStep(state, qubits, +1);
};

/**
 * Apply the inverse QFT. `inverseQftState(qftState(s)) ≈ s` to
 * floating tolerance for every 1–4 qubit normalized fixture in the
 * test suite.
 */
export const inverseQftState = (state: Complex[], qubits: number): Complex[] => {
  return dftStep(state, qubits, -1);
};

/**
 * Renormalize so Σ |aᵢ|² = 1. If the input is zero or
 * non-finite-norm, returns a uniform real state — never NaN/Infinity.
 * Used by the visualizer's "Custom" preset where the reader can type
 * any 16 weights, plus by tests that compare against an expected
 * uniform distribution.
 */
export const normalizeState = (input: Complex[]): Complex[] => {
  let sumSq = 0;
  for (const a of input) sumSq += a.re * a.re + a.im * a.im;
  if (!Number.isFinite(sumSq) || sumSq <= 0) {
    const uniform = 1 / Math.sqrt(input.length);
    return input.map(() => ({ re: uniform, im: 0 }));
  }
  const k = 1 / Math.sqrt(sumSq);
  return input.map((a) => ({ re: a.re * k, im: a.im * k }));
};

/**
 * `|aᵢ|²` for each amplitude. Sums to 1 ± floating error on a
 * normalized state. Convenience wrapper so widgets can stay
 * Complex-blind.
 */
export const probabilitiesFromState = (state: Complex[]): number[] =>
  state.map((a) => a.re * a.re + a.im * a.im);

/**
 * `[|0…0⟩, |0…1⟩, …, |1…1⟩]` for a `qubits`-wide register. Padded so
 * widget chart labels line up byte-for-byte with `Simulator#basisLabel`
 * and `grover#basisLabels`.
 */
export const basisLabels = (qubits: number): string[] => {
  assertQubits(qubits);
  const N = 1 << qubits;
  const out: string[] = new Array(N);
  for (let i = 0; i < N; i++) out[i] = `|${i.toString(2).padStart(qubits, "0")}⟩`;
  return out;
};

/**
 * Build a real-amplitude state vector from a list of basis indices,
 * uniformly distributed over them. Convenience helper for the
 * visualizer presets (`|0011⟩`, `|0101⟩`, …) and for the period-finding
 * demo's "what does the QFT of a periodic delta-comb look like" panel.
 */
export const stateFromBasisIndices = (
  indices: readonly number[],
  qubits: number,
): Complex[] => {
  assertQubits(qubits);
  const N = 1 << qubits;
  const state: Complex[] = new Array(N).fill(null).map(() => ({ ...ZERO }));
  const uniq = new Set<number>();
  for (const idx of indices) {
    if (!Number.isInteger(idx) || idx < 0 || idx >= N) {
      throw new RangeError(`basis index must be integer in [0, ${N}), got ${idx}`);
    }
    uniq.add(idx);
  }
  if (uniq.size === 0) {
    state[0] = { re: 1, im: 0 };
    return state;
  }
  const amp = 1 / Math.sqrt(uniq.size);
  for (const idx of uniq) state[idx] = { re: amp, im: 0 };
  return state;
};

// ---------------------------------------------------------------------------
// Modular arithmetic + classical multiplicative period
// ---------------------------------------------------------------------------

/**
 * `(base^exp) mod m` for non-negative integers, computed with
 * repeated squaring so the intermediate product never overflows
 * `Number.MAX_SAFE_INTEGER` for any `m ≤ 15` we hand it. Throws on
 * non-positive `m` or non-integer/negative inputs — the period
 * helper relies on that to surface invalid widget input early.
 */
export const modPow = (base: number, exp: number, m: number): number => {
  if (!Number.isInteger(base) || !Number.isInteger(exp) || !Number.isInteger(m)) {
    throw new RangeError(`modPow expects integers, got base=${base} exp=${exp} m=${m}`);
  }
  if (m <= 0) throw new RangeError(`modPow modulus must be positive, got ${m}`);
  if (exp < 0) throw new RangeError(`modPow exponent must be non-negative, got ${exp}`);
  if (m === 1) return 0;
  let result = 1;
  let b = ((base % m) + m) % m;
  let e = exp;
  while (e > 0) {
    if (e & 1) result = (result * b) % m;
    e = Math.floor(e / 2);
    b = (b * b) % m;
  }
  return result;
};

/** Greatest common divisor via the classical Euclidean algorithm. */
export const gcd = (a: number, b: number): number => {
  if (!Number.isInteger(a) || !Number.isInteger(b)) {
    throw new RangeError(`gcd expects integers, got a=${a} b=${b}`);
  }
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x;
};

export type PeriodResult =
  | {
      kind: "period";
      /** Smallest r > 0 with a^r ≡ 1 (mod N). */
      period: number;
      /** [1, a mod N, a² mod N, …, a^r mod N] — last entry closes the cycle at 1. */
      sequence: number[];
    }
  | {
      kind: "invalid";
      /** Human-readable reason the widget can render directly. */
      reason: string;
      /** Empty for invalid inputs — preserves the discriminated-union shape. */
      sequence: number[];
    }
  | {
      kind: "not-found";
      /** Sequence covering the full search window (no closing entry). */
      sequence: number[];
    };

/**
 * Find the smallest `r > 0` with `a^r ≡ 1 (mod N)`. Returns one of
 * three shapes so the widget can render every case without throwing:
 *
 *   - `kind: "period"` — found `r` within the window. `sequence` ends
 *     with the closing `1`, so its length is `r + 1`.
 *   - `kind: "invalid"` — `N`, `a`, or window violates a Shor
 *     precondition. Includes a copy-ready `reason`.
 *   - `kind: "not-found"` — window exhausted without hitting 1.
 *     `sequence` is the full surveyed window so the UI can still
 *     show the structure.
 *
 * Constraints (matches the locked phase scope `N ≤ 15`):
 *   - `N` integer, `2 ≤ N ≤ 15`.
 *   - `a` integer, `1 < a < N`.
 *   - `gcd(a, N) = 1`.
 *   - `maxX` integer, `1 ≤ maxX ≤ 4096`.
 *
 * Examples: `N=15, a=2 → 4`, `N=15, a=4 → 2`, `N=15, a=7 → 4`,
 * `N=15, a=11 → 2`.
 */
export const findMultiplicativePeriod = (
  a: number,
  N: number,
  maxX: number = DEFAULT_PERIOD_WINDOW,
): PeriodResult => {
  if (!Number.isInteger(N) || N < 2 || N > MAX_N_FOR_PERIOD) {
    return invalid(`N must be an integer in [2, ${MAX_N_FOR_PERIOD}], got ${N}`);
  }
  if (!Number.isInteger(a) || a <= 1 || a >= N) {
    return invalid(`a must be an integer in (1, N), got a=${a} for N=${N}`);
  }
  if (!Number.isInteger(maxX) || maxX < 1 || maxX > 4096) {
    return invalid(`maxX must be an integer in [1, 4096], got ${maxX}`);
  }
  const g = gcd(a, N);
  if (g !== 1) {
    return invalid(`gcd(a, N) = ${g} ≠ 1 — pick an a coprime to N=${N}`);
  }

  const sequence: number[] = [1];
  let current = 1;
  for (let x = 1; x <= maxX; x++) {
    current = (current * a) % N;
    sequence.push(current);
    if (current === 1) {
      return { kind: "period", period: x, sequence };
    }
  }
  return { kind: "not-found", sequence };
};

/**
 * For a register of size `Q = 2^qubits` and a known period `r`, return
 * the basis indices the QFT of a period-`r` delta comb would peak on.
 * Used by the PeriodFinding widget to draw the "you would measure
 * roughly one of these" annotation.
 *
 *   - If `r` evenly divides `Q`: peaks at `j · Q/r` for `j = 0..r-1`.
 *   - Otherwise: the textbook QFT peaks live near non-integer multiples;
 *     we round to the nearest integer and dedupe so the widget shows
 *     the closest measurable bins.
 *
 * Throws if `qubits` is out of range or `r ≤ 0`.
 */
export const periodPeakHints = (period: number, qubits: number): number[] => {
  assertQubits(qubits);
  if (!Number.isInteger(period) || period <= 0) {
    throw new RangeError(`period must be a positive integer, got ${period}`);
  }
  const Q = 1 << qubits;
  if (period > Q) return [0];
  const out = new Set<number>();
  for (let j = 0; j < period; j++) {
    const k = Math.round((j * Q) / period) % Q;
    out.add(k);
  }
  return Array.from(out).sort((x, y) => x - y);
};

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

/**
 * Apply a forward (`+1`) or inverse (`-1`) DFT over a `2^qubits`-long
 * state vector. The 1/√N normalization is applied once at the end so
 * both directions share one code path and round-tripping is exact (up
 * to floating error).
 */
const dftStep = (state: Complex[], qubits: number, sign: 1 | -1): Complex[] => {
  assertQubits(qubits);
  const N = 1 << qubits;
  if (state.length !== N) {
    throw new RangeError(
      `state length ${state.length} does not match 2^qubits = ${N}`,
    );
  }
  const out: Complex[] = new Array(N).fill(null).map(() => ({ ...ZERO }));
  const twoPiOverN = (2 * Math.PI) / N;
  for (let k = 0; k < N; k++) {
    let acc: Complex = { ...ZERO };
    for (let j = 0; j < N; j++) {
      const angle = sign * twoPiOverN * j * k;
      const w: Complex = { re: Math.cos(angle), im: Math.sin(angle) };
      acc = add(acc, mul(state[j], w));
    }
    out[k] = scale(acc, 1 / Math.sqrt(N));
  }
  return out;
};

const assertQubits = (qubits: number): void => {
  if (
    !Number.isInteger(qubits) ||
    qubits < MIN_QUBITS ||
    qubits > MAX_QUBITS
  ) {
    throw new RangeError(
      `qubits must be an integer in [${MIN_QUBITS}, ${MAX_QUBITS}], got ${qubits}`,
    );
  }
};

const invalid = (reason: string): PeriodResult => ({
  kind: "invalid",
  reason,
  sequence: [],
});
