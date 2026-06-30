/**
 * QFT + period-finding correctness tests.
 *
 * Phase 5a (`/shor`) leans on `src/lib/quantum/qft.ts` for every
 * interactive QFT spike, the visualizer's input/output panels, and
 * the canonical periods we promise to deliver in `PeriodFinding`.
 * If any of these slip, the essay's "real math, not animation" claim
 * collapses, so the test pins every contract referenced in
 * `.planning/phases/05a-shor-qft-period-finding/PLAN.md` Plan 05-01.
 *
 * Numerical strategy: tight tolerances on QFT/inverse round-trips and
 * normalization; exact integer equality on the period helper. The DFT
 * implementation is O(N²) at N≤16, so floating error per amplitude is
 * well under 1e-12 in practice.
 */

import { describe, expect, it } from "vitest";

import {
  qftState,
  inverseQftState,
  normalizeState,
  probabilitiesFromState,
  stateFromBasisIndices,
  modPow,
  gcd,
  findMultiplicativePeriod,
  periodPeakHints,
} from "../../src/lib/quantum/qft";
import { type Complex } from "../../src/lib/quantum/complex";

const approx = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) < eps;
const probsSumToOne = (probs: number[], eps = 1e-12) =>
  approx(
    probs.reduce((acc, p) => acc + p, 0),
    1,
    eps,
  );

describe("stateFromBasisIndices", () => {
  it("places a single amplitude on |0000⟩ when given [0]", () => {
    const s = stateFromBasisIndices([0], 4);
    expect(s.length).toBe(16);
    expect(s[0].re).toBeCloseTo(1, 12);
    expect(s[0].im).toBeCloseTo(0, 12);
    for (let i = 1; i < s.length; i++) {
      expect(s[i].re).toBeCloseTo(0, 12);
      expect(s[i].im).toBeCloseTo(0, 12);
    }
  });

  it("spreads amplitude uniformly over multiple basis indices", () => {
    const s = stateFromBasisIndices([0, 4, 8, 12], 4);
    const expected = 1 / Math.sqrt(4);
    for (const idx of [0, 4, 8, 12]) {
      expect(s[idx].re).toBeCloseTo(expected, 12);
    }
    expect(probsSumToOne(probabilitiesFromState(s))).toBe(true);
  });

  it("rejects out-of-range qubit counts", () => {
    expect(() => stateFromBasisIndices([0], 0)).toThrow(/integer in/);
    expect(() => stateFromBasisIndices([0], 5)).toThrow(/integer in/);
  });

  it("rejects out-of-range basis indices", () => {
    expect(() => stateFromBasisIndices([16], 4)).toThrow(/basis index/);
    expect(() => stateFromBasisIndices([-1], 4)).toThrow(/basis index/);
  });
});

describe("qftState", () => {
  it("preserves normalization for canonical 4-qubit basis states", () => {
    for (const idx of [0, 1, 3, 5, 8, 15]) {
      const input = stateFromBasisIndices([idx], 4);
      const out = qftState(input, 4);
      expect(probsSumToOne(probabilitiesFromState(out))).toBe(true);
    }
  });

  it("QFT of |0000⟩ is the uniform real superposition (1/4 across all 16 bins)", () => {
    const input = stateFromBasisIndices([0], 4);
    const out = qftState(input, 4);
    const want = 1 / Math.sqrt(16);
    for (let i = 0; i < 16; i++) {
      expect(out[i].re).toBeCloseTo(want, 9);
      expect(out[i].im).toBeCloseTo(0, 9);
    }
  });

  it("produces deterministic 16-bin output distributions for |0000⟩, |0001⟩, |0011⟩, |0101⟩", () => {
    const fixtures: Record<number, number> = {
      0: 1 / 16,
      1: 1 / 16,
      3: 1 / 16,
      5: 1 / 16,
    };
    for (const [idx, expectedPerBin] of Object.entries(fixtures)) {
      const input = stateFromBasisIndices([Number(idx)], 4);
      const probs = probabilitiesFromState(qftState(input, 4));
      expect(probs.length).toBe(16);
      for (const p of probs) {
        expect(p).toBeCloseTo(expectedPerBin, 9);
      }
      expect(probsSumToOne(probs)).toBe(true);
    }
  });

  it("rejects state-length mismatch", () => {
    const wrongLength: Complex[] = new Array(8).fill(null).map(() => ({ re: 0, im: 0 }));
    expect(() => qftState(wrongLength, 4)).toThrow(/state length/);
  });

  it("rejects out-of-range qubit counts (preserves the 4-qubit cap)", () => {
    // Build a length-32 vector so the length check passes — proves the
    // qubit-cap guard is what trips, not the length guard.
    const fiveQubitState: Complex[] = new Array(32)
      .fill(null)
      .map(() => ({ re: 0, im: 0 }));
    fiveQubitState[0] = { re: 1, im: 0 };
    expect(() => qftState(fiveQubitState, 5)).toThrow(/integer in/);
    expect(() => qftState([{ re: 1, im: 0 }], 0)).toThrow(/integer in/);
  });

  it("does not mutate the input vector", () => {
    const input = stateFromBasisIndices([3], 4);
    const snapshot = input.map((a) => ({ ...a }));
    qftState(input, 4);
    for (let i = 0; i < input.length; i++) {
      expect(input[i].re).toBe(snapshot[i].re);
      expect(input[i].im).toBe(snapshot[i].im);
    }
  });
});

describe("QFT followed by inverse QFT", () => {
  const tolerance = 1e-9;

  const seeds: Array<{ qubits: number; indices: number[] }> = [
    { qubits: 1, indices: [0] },
    { qubits: 1, indices: [1] },
    { qubits: 2, indices: [0, 3] },
    { qubits: 3, indices: [1, 4, 7] },
    { qubits: 4, indices: [0] },
    { qubits: 4, indices: [3] },
    { qubits: 4, indices: [0, 4, 8, 12] },
    { qubits: 4, indices: [1, 7, 11, 15] },
  ];

  for (const { qubits, indices } of seeds) {
    it(`returns the original state for ${qubits}-qubit fixture with indices [${indices.join(",")}]`, () => {
      const original = stateFromBasisIndices(indices, qubits);
      const back = inverseQftState(qftState(original, qubits), qubits);
      for (let i = 0; i < original.length; i++) {
        expect(approx(back[i].re, original[i].re, tolerance)).toBe(true);
        expect(approx(back[i].im, original[i].im, tolerance)).toBe(true);
      }
    });
  }

  it("round-trips a custom non-uniform real state to floating tolerance", () => {
    const raw: Complex[] = [
      { re: 0.3, im: 0 },
      { re: -0.7, im: 0 },
      { re: 0.5, im: 0 },
      { re: 0.2, im: 0 },
      { re: 0, im: 0 },
      { re: 0.1, im: 0 },
      { re: -0.4, im: 0 },
      { re: 0.6, im: 0 },
      { re: 0, im: 0 },
      { re: 0, im: 0 },
      { re: 0, im: 0 },
      { re: 0, im: 0 },
      { re: 0, im: 0 },
      { re: 0, im: 0 },
      { re: 0, im: 0 },
      { re: 0, im: 0 },
    ];
    const normalized = normalizeState(raw);
    const back = inverseQftState(qftState(normalized, 4), 4);
    let maxErr = 0;
    for (let i = 0; i < normalized.length; i++) {
      maxErr = Math.max(
        maxErr,
        Math.abs(back[i].re - normalized[i].re),
        Math.abs(back[i].im - normalized[i].im),
      );
    }
    expect(maxErr).toBeLessThan(1e-9);
  });
});

describe("normalizeState", () => {
  it("scales a real positive vector to unit norm", () => {
    const out = normalizeState([
      { re: 1, im: 0 },
      { re: 1, im: 0 },
      { re: 1, im: 0 },
      { re: 1, im: 0 },
    ]);
    expect(probsSumToOne(probabilitiesFromState(out))).toBe(true);
    for (const a of out) expect(a.re).toBeCloseTo(0.5, 12);
  });

  it("returns a safe uniform state instead of NaN/Infinity for all-zero input", () => {
    const out = normalizeState(new Array(16).fill(null).map(() => ({ re: 0, im: 0 })));
    for (const a of out) {
      expect(Number.isFinite(a.re)).toBe(true);
      expect(Number.isFinite(a.im)).toBe(true);
    }
    expect(probsSumToOne(probabilitiesFromState(out))).toBe(true);
  });

  it("returns a safe uniform state for non-finite-norm input", () => {
    const out = normalizeState([
      { re: Number.POSITIVE_INFINITY, im: 0 },
      { re: 1, im: 0 },
    ]);
    for (const a of out) {
      expect(Number.isFinite(a.re)).toBe(true);
      expect(Number.isFinite(a.im)).toBe(true);
    }
  });
});

describe("modPow", () => {
  it("matches small reference cases", () => {
    expect(modPow(2, 0, 15)).toBe(1);
    expect(modPow(2, 1, 15)).toBe(2);
    expect(modPow(2, 4, 15)).toBe(1);
    expect(modPow(7, 4, 15)).toBe(1);
    expect(modPow(11, 2, 15)).toBe(1);
    expect(modPow(13, 4, 15)).toBe(1);
  });

  it("handles modulus 1 (everything ≡ 0)", () => {
    expect(modPow(99, 99, 1)).toBe(0);
  });

  it("rejects non-integers, negative exponents, and non-positive moduli", () => {
    expect(() => modPow(2.5, 4, 15)).toThrow(/integers/);
    expect(() => modPow(2, -1, 15)).toThrow(/non-negative/);
    expect(() => modPow(2, 4, 0)).toThrow(/positive/);
    expect(() => modPow(2, 4, -5)).toThrow(/positive/);
  });
});

describe("gcd", () => {
  it("matches textbook cases", () => {
    expect(gcd(2, 15)).toBe(1);
    expect(gcd(6, 15)).toBe(3);
    expect(gcd(15, 15)).toBe(15);
    expect(gcd(0, 7)).toBe(7);
  });

  it("rejects non-integers", () => {
    expect(() => gcd(2.5, 15)).toThrow(/integers/);
  });
});

describe("findMultiplicativePeriod canonical N=15 cases", () => {
  const cases: Array<{ a: number; r: number }> = [
    { a: 2, r: 4 },
    { a: 4, r: 2 },
    { a: 7, r: 4 },
    { a: 8, r: 4 },
    { a: 11, r: 2 },
    { a: 13, r: 4 },
    { a: 14, r: 2 },
  ];

  for (const { a, r } of cases) {
    it(`N=15, a=${a} → r=${r}`, () => {
      const result = findMultiplicativePeriod(a, 15);
      expect(result.kind).toBe("period");
      if (result.kind !== "period") return;
      expect(result.period).toBe(r);
      // sequence starts with a^0 = 1 and ends with a^r = 1
      expect(result.sequence[0]).toBe(1);
      expect(result.sequence[result.sequence.length - 1]).toBe(1);
      expect(result.sequence.length).toBe(r + 1);
    });
  }
});

describe("findMultiplicativePeriod invalid inputs (UI safety)", () => {
  it("rejects N > 15", () => {
    const result = findMultiplicativePeriod(2, 21);
    expect(result.kind).toBe("invalid");
    if (result.kind !== "invalid") return;
    expect(result.reason).toMatch(/N must be/);
  });

  it("rejects N < 2", () => {
    expect(findMultiplicativePeriod(0, 1).kind).toBe("invalid");
    expect(findMultiplicativePeriod(0, 0).kind).toBe("invalid");
  });

  it("rejects non-coprime (a, N)", () => {
    const result = findMultiplicativePeriod(6, 15);
    expect(result.kind).toBe("invalid");
    if (result.kind !== "invalid") return;
    expect(result.reason).toMatch(/coprime/);
  });

  it("rejects a outside (1, N)", () => {
    expect(findMultiplicativePeriod(1, 15).kind).toBe("invalid");
    expect(findMultiplicativePeriod(15, 15).kind).toBe("invalid");
    expect(findMultiplicativePeriod(-2, 15).kind).toBe("invalid");
  });

  it("rejects non-integer a or N", () => {
    expect(findMultiplicativePeriod(2.5, 15).kind).toBe("invalid");
    expect(findMultiplicativePeriod(2, 15.5).kind).toBe("invalid");
  });

  it("rejects bad maxX", () => {
    expect(findMultiplicativePeriod(2, 15, 0).kind).toBe("invalid");
    expect(findMultiplicativePeriod(2, 15, 99999).kind).toBe("invalid");
  });
});

describe("findMultiplicativePeriod 'no period in this window'", () => {
  it("returns kind='not-found' when maxX is too small to reach the period", () => {
    // a=7, N=15 has period 4 — capping at maxX=2 forces a not-found.
    const result = findMultiplicativePeriod(7, 15, 2);
    expect(result.kind).toBe("not-found");
    if (result.kind !== "not-found") return;
    expect(result.sequence.length).toBe(3); // 1, 7, 4 (a^0..a^2)
    expect(result.sequence[0]).toBe(1);
  });
});

describe("periodPeakHints", () => {
  it("returns evenly spaced peaks when r divides Q", () => {
    expect(periodPeakHints(4, 4)).toEqual([0, 4, 8, 12]); // Q=16, r=4
    expect(periodPeakHints(2, 4)).toEqual([0, 8]); // Q=16, r=2
    expect(periodPeakHints(8, 4)).toEqual([0, 2, 4, 6, 8, 10, 12, 14]);
  });

  it("rounds and dedupes peaks when r does not divide Q", () => {
    // Q=16, r=3 → Q/r ≈ 5.333; nearest integer multiples = 0, 5, 11
    const hints = periodPeakHints(3, 4);
    expect(hints).toEqual([0, 5, 11]);
  });

  it("clamps to [0] when r exceeds the register size", () => {
    expect(periodPeakHints(100, 4)).toEqual([0]);
  });

  it("rejects bad input", () => {
    expect(() => periodPeakHints(0, 4)).toThrow(/positive integer/);
    expect(() => periodPeakHints(-1, 4)).toThrow(/positive integer/);
    expect(() => periodPeakHints(1.5, 4)).toThrow(/positive integer/);
    expect(() => periodPeakHints(2, 0)).toThrow(/integer in/);
    expect(() => periodPeakHints(2, 5)).toThrow(/integer in/);
  });
});
