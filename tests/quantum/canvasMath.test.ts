/**
 * Quantum Canvas math — palettes + metric helpers.
 *
 * We test the pieces that don't need a worker or DOM: the palette
 * lookups, hex parsing, custom gradient endpoints, and the metric
 * helpers (which both the worker and any future render-elsewhere
 * consumer rely on).
 */
import { describe, expect, it } from "vitest";
import {
  viridis,
  magma,
  monochrome,
  customGradient,
  hexToRgb,
  luminance,
  paletteByName,
  computeMetric,
  probabilityZero,
  reducedEntropy,
} from "../../src/lib/sandbox/canvasMath";
import { c, type Complex } from "../../src/lib/quantum/complex";

const inByte = (n: number) => n >= 0 && n <= 255 && Number.isInteger(n);
const isRGB = (rgb: readonly [number, number, number]) =>
  rgb.length === 3 && rgb.every(inByte);

describe("Quantum Canvas — palettes", () => {
  it("viridis returns valid bytes across the [0, 1] range", () => {
    for (let t = 0; t <= 1; t += 0.1) {
      expect(isRGB(viridis(t))).toBe(true);
    }
  });

  it("viridis(0) is darker than viridis(1)", () => {
    expect(luminance(viridis(0))).toBeLessThan(luminance(viridis(1)));
  });

  it("magma returns valid bytes across the [0, 1] range", () => {
    for (let t = 0; t <= 1; t += 0.1) {
      expect(isRGB(magma(t))).toBe(true);
    }
  });

  it("magma(0) is darker than magma(1)", () => {
    expect(luminance(magma(0))).toBeLessThan(luminance(magma(1)));
  });

  it("monochrome is a pure grayscale ramp", () => {
    expect(monochrome(0)).toEqual([0, 0, 0]);
    expect(monochrome(1)).toEqual([255, 255, 255]);
    const mid = monochrome(0.5);
    expect(mid[0]).toBe(mid[1]);
    expect(mid[1]).toBe(mid[2]);
  });

  it("palettes clamp out-of-range t", () => {
    expect(monochrome(-1)).toEqual([0, 0, 0]);
    expect(monochrome(2)).toEqual([255, 255, 255]);
    expect(isRGB(viridis(-0.5))).toBe(true);
    expect(isRGB(magma(1.5))).toBe(true);
  });
});

describe("Quantum Canvas — customGradient", () => {
  it("endpoints exactly match the input hex colors", () => {
    const g = customGradient("#000000", "#ffffff");
    expect(g(0)).toEqual([0, 0, 0]);
    expect(g(1)).toEqual([255, 255, 255]);
  });

  it("lerps the midpoint between two colors", () => {
    const g = customGradient("#000000", "#ffffff");
    expect(g(0.5)).toEqual([128, 128, 128]);
  });

  it("accepts short-form #rgb hex", () => {
    const g = customGradient("#f00", "#0f0");
    expect(g(0)).toEqual([255, 0, 0]);
    expect(g(1)).toEqual([0, 255, 0]);
  });

  it("throws on garbage hex input", () => {
    expect(() => hexToRgb("not-a-color")).toThrow(/Bad hex/);
    expect(() => hexToRgb("#12345")).toThrow(/Bad hex/);
  });
});

describe("Quantum Canvas — paletteByName", () => {
  it("dispatches to viridis", () => {
    expect(paletteByName("viridis")(0)).toEqual(viridis(0));
  });
  it("dispatches to magma", () => {
    expect(paletteByName("magma")(0)).toEqual(magma(0));
  });
  it("dispatches to monochrome", () => {
    expect(paletteByName("monochrome")(0.5)).toEqual([128, 128, 128]);
  });
  it("dispatches to custom with provided endpoints", () => {
    expect(
      paletteByName("custom", { c0: "#000000", c1: "#ffffff" })(1),
    ).toEqual([255, 255, 255]);
  });
});

/* -------------------------------------------------------------------------- */
/* Metric helpers ------------------------------------------------------------ */

const ket = (re: number, im = 0): Complex => c(re, im);

describe("Quantum Canvas — metrics", () => {
  it("probabilityZero of |0⟩ = 1", () => {
    const state = [ket(1), ket(0)];
    expect(probabilityZero(state, 0)).toBeCloseTo(1, 12);
  });

  it("probabilityZero of |1⟩ = 0", () => {
    const state = [ket(0), ket(1)];
    expect(probabilityZero(state, 0)).toBeCloseTo(0, 12);
  });

  it("probabilityZero of |+⟩ = 0.5", () => {
    const r = 1 / Math.sqrt(2);
    const state = [ket(r), ket(r)];
    expect(probabilityZero(state, 0)).toBeCloseTo(0.5, 12);
  });

  it("computeMetric p0 matches probabilityZero", () => {
    const r = 1 / Math.sqrt(2);
    const state = [ket(r), ket(r)];
    expect(computeMetric(state, "p0")).toBeCloseTo(0.5, 12);
  });

  it("computeMetric expectationZ_q0 stays in [0, 1]", () => {
    const r = 1 / Math.sqrt(2);
    const states = [
      [ket(1), ket(0)],         // |0⟩
      [ket(0), ket(1)],         // |1⟩
      [ket(r), ket(r)],         // |+⟩
    ];
    for (const s of states) {
      const v = computeMetric(s, "expectationZ_q0");
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it("entanglement S(q0) of a product state is 0", () => {
    // |00⟩ — fully separable
    const state = [ket(1), ket(0), ket(0), ket(0)];
    expect(reducedEntropy(state, 0)).toBeCloseTo(0, 8);
  });

  it("entanglement S(q0) of a Bell state is ln(2)", () => {
    // (|00⟩ + |11⟩) / √2
    const r = 1 / Math.sqrt(2);
    const state = [ket(r), ket(0), ket(0), ket(r)];
    expect(reducedEntropy(state, 0)).toBeCloseTo(Math.LN2, 8);
  });

  it("computeMetric entropy is normalized to [0, 1]", () => {
    const r = 1 / Math.sqrt(2);
    const bell = [ket(r), ket(0), ket(0), ket(r)];
    expect(computeMetric(bell, "entanglementEntropy_q0")).toBeCloseTo(1, 8);
    const product = [ket(1), ket(0), ket(0), ket(0)];
    expect(computeMetric(product, "entanglementEntropy_q0")).toBeCloseTo(0, 8);
  });
});
