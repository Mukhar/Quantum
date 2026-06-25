/**
 * Fidelity tests — the success detector under challenge mode lives or
 * dies by these. If any regress, every puzzle silently breaks.
 *
 * Coverage:
 *  - Identity cases (|0⟩ vs |0⟩, Bell vs Bell).
 *  - Orthogonal case (|0⟩ vs |1⟩).
 *  - H|0⟩ = |+⟩.
 *  - Global-phase invariance (the whole reason we use fidelity not L2).
 *  - Hermitian symmetry F(a,b) = F(b,a) — sanity check that conj is
 *    on the right operand.
 *  - Length mismatch surfaces as a thrown error, not a silent NaN.
 */

import { describe, expect, it } from "vitest";
import { c, type Complex } from "../../src/lib/quantum/complex";
import {
  fidelity,
  stateDistance,
  SUCCESS_FIDELITY,
} from "../../src/lib/quantum/fidelity";

const SQRT1_2 = 1 / Math.sqrt(2);

const ket0: Complex[] = [c(1), c(0)];
const ket1: Complex[] = [c(0), c(1)];
const ketPlus: Complex[] = [c(SQRT1_2), c(SQRT1_2)];
const ketMinus: Complex[] = [c(SQRT1_2), c(-SQRT1_2)];
// H|0⟩ computed by hand from the gate matrix.
const HKet0: Complex[] = [c(SQRT1_2), c(SQRT1_2)];
const bell: Complex[] = [c(SQRT1_2), c(0), c(0), c(SQRT1_2)];

const scaleState = (s: Complex[], phi: number): Complex[] => {
  const cr = Math.cos(phi);
  const ci = Math.sin(phi);
  return s.map((a) => ({
    re: a.re * cr - a.im * ci,
    im: a.re * ci + a.im * cr,
  }));
};

describe("fidelity — identity & orthogonal", () => {
  it("F(|0⟩, |0⟩) = 1", () => {
    expect(fidelity(ket0, ket0)).toBeCloseTo(1, 12);
  });

  it("F(|0⟩, |1⟩) = 0", () => {
    expect(fidelity(ket0, ket1)).toBeCloseTo(0, 12);
  });

  it("F(H|0⟩, |+⟩) = 1", () => {
    expect(fidelity(HKet0, ketPlus)).toBeCloseTo(1, 12);
  });

  it("F(|+⟩, |−⟩) = 0 (the two equator antipodes are orthogonal)", () => {
    expect(fidelity(ketPlus, ketMinus)).toBeCloseTo(0, 12);
  });
});

describe("fidelity — Bell state", () => {
  it("F(Bell, Bell) = 1", () => {
    expect(fidelity(bell, bell)).toBeCloseTo(1, 12);
  });
});

describe("fidelity — invariances", () => {
  it("global phase invariance: F(ψ, e^{iφ}ψ) = 1 for several φ", () => {
    for (const phi of [0.1, 0.5, 1.0, Math.PI / 3, Math.PI, 2 * Math.PI - 0.01]) {
      expect(fidelity(ketPlus, scaleState(ketPlus, phi))).toBeCloseTo(1, 10);
    }
  });

  it("hermitian symmetry: F(a, b) = F(b, a)", () => {
    // Pick a non-trivial mixed-phase pair so we'd actually notice asymmetry.
    const a: Complex[] = [c(0.6, 0.2), c(-0.3, 0.7)];
    // Re-normalize a so it's a valid state.
    const na = Math.sqrt(a.reduce((s, x) => s + x.re * x.re + x.im * x.im, 0));
    const aN = a.map((x) => ({ re: x.re / na, im: x.im / na }));
    const b: Complex[] = [c(0.5, -0.5), c(0.5, 0.5)];
    const nb = Math.sqrt(b.reduce((s, x) => s + x.re * x.re + x.im * x.im, 0));
    const bN = b.map((x) => ({ re: x.re / nb, im: x.im / nb }));
    expect(fidelity(aN, bN)).toBeCloseTo(fidelity(bN, aN), 12);
  });

  it("equal-superposition vs |0⟩ gives F = 0.5 (the textbook half-overlap)", () => {
    expect(fidelity(ketPlus, ket0)).toBeCloseTo(0.5, 12);
  });
});

describe("fidelity — distance + constants", () => {
  it("stateDistance = 1 - fidelity", () => {
    expect(stateDistance(ket0, ket1)).toBeCloseTo(1, 12);
    expect(stateDistance(ket0, ket0)).toBeCloseTo(0, 12);
    expect(stateDistance(ketPlus, ket0)).toBeCloseTo(0.5, 12);
  });

  it("SUCCESS_FIDELITY is a sensible threshold in [0.9, 1)", () => {
    expect(SUCCESS_FIDELITY).toBeGreaterThanOrEqual(0.9);
    expect(SUCCESS_FIDELITY).toBeLessThan(1);
  });
});

describe("fidelity — guards", () => {
  it("throws when lengths differ", () => {
    expect(() => fidelity(ket0, bell)).toThrow(/length mismatch/);
  });
});
