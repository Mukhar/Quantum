/**
 * Pure math for the Quantum Canvas widget — palettes + metric helpers.
 *
 * Lives in its own module so vitest can import it without dragging in
 * Web Worker / DOM globals. The worker (`canvasWorker.ts`) re-uses
 * `computeMetric`; the client (`canvas.client.ts`) re-uses the palettes.
 *
 * Palette philosophy: no dependency on d3-scale-chromatic or chroma.js
 * — we'd love to but the sandbox network can't reach npm during this
 * phase. Five-stop linear interpolation in sRGB is good enough for a
 * generative-art toy. If you squint, viridis and magma look correct.
 */
import type { Complex } from "../quantum/complex";

export type RGB = readonly [number, number, number];
export type PaletteFn = (t: number) => RGB;

/* -------------------------------------------------------------------------- */
/* Palettes ------------------------------------------------------------------ */

/** 5-stop sRGB samples ripped from matplotlib's viridis (rounded to ints). */
const VIRIDIS_STOPS: ReadonlyArray<RGB> = [
  [68, 1, 84],
  [59, 82, 139],
  [33, 145, 140],
  [94, 201, 98],
  [253, 231, 37],
];

/** 5-stop sRGB samples from matplotlib's magma. */
const MAGMA_STOPS: ReadonlyArray<RGB> = [
  [0, 0, 4],
  [80, 18, 123],
  [182, 54, 121],
  [251, 136, 97],
  [252, 253, 191],
];

export const viridis: PaletteFn = (t) => sampleStops(VIRIDIS_STOPS, t);
export const magma: PaletteFn = (t) => sampleStops(MAGMA_STOPS, t);

export const monochrome: PaletteFn = (t) => {
  const v = Math.round(clamp01(t) * 255);
  return [v, v, v];
};

/**
 * Build a 2-color gradient palette. Inputs are hex strings (`#rrggbb` or
 * `#rgb`). Endpoints are exact; everything in between is straight sRGB lerp.
 */
export const customGradient = (c0: string, c1: string): PaletteFn => {
  const a = hexToRgb(c0);
  const b = hexToRgb(c1);
  return (t) => {
    const tt = clamp01(t);
    return [
      Math.round(a[0] + (b[0] - a[0]) * tt),
      Math.round(a[1] + (b[1] - a[1]) * tt),
      Math.round(a[2] + (b[2] - a[2]) * tt),
    ];
  };
};

export type PaletteName = "viridis" | "magma" | "monochrome" | "custom";

export const paletteByName = (
  name: PaletteName,
  custom?: { c0: string; c1: string },
): PaletteFn => {
  switch (name) {
    case "viridis":
      return viridis;
    case "magma":
      return magma;
    case "monochrome":
      return monochrome;
    case "custom":
      return customGradient(custom?.c0 ?? "#0f172a", custom?.c1 ?? "#34d399");
  }
};

/* -------------------------------------------------------------------------- */
/* Hex helpers --------------------------------------------------------------- */

/** Parse `#rgb` / `#rrggbb` → [r,g,b]. Throws on garbage so the UI surfaces it. */
export function hexToRgb(hex: string): RGB {
  const h = hex.trim().replace(/^#/, "");
  const long =
    h.length === 3
      ? h.split("").map((ch) => ch + ch).join("")
      : h;
  if (long.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(long)) {
    throw new Error(`Bad hex color: "${hex}"`);
  }
  return [
    parseInt(long.slice(0, 2), 16),
    parseInt(long.slice(2, 4), 16),
    parseInt(long.slice(4, 6), 16),
  ];
}

/** Approximate sRGB luminance (Rec. 709). Handy in tests; not gamma-correct. */
export const luminance = (rgb: RGB): number =>
  0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];

/* -------------------------------------------------------------------------- */
/* Metric helpers ------------------------------------------------------------ */

export type Metric = "p0" | "expectationZ_q0" | "entanglementEntropy_q0";

/**
 * Compute a [0, 1] scalar from a final state vector.
 *
 * - `p0`: P(qubit 0 measures 0).
 * - `expectationZ_q0`: ⟨Z⟩ on q0 rescaled from [-1, 1] → [0, 1].
 *   (Numerically equal to p0; kept distinct so future metrics can swap in.)
 * - `entanglementEntropy_q0`: von-Neumann entropy of q0's reduced density
 *   matrix, normalized by ln(2) so a maximally-mixed qubit reads 1.0.
 */
export function computeMetric(state: Complex[], metric: Metric): number {
  switch (metric) {
    case "p0":
      return probabilityZero(state, 0);
    case "expectationZ_q0": {
      const p0 = probabilityZero(state, 0);
      return p0; // (1 + (p0 - p1)) / 2 = p0; same number, different story
    }
    case "entanglementEntropy_q0":
      return reducedEntropy(state, 0) / Math.LN2;
  }
}

/** Σ |amp[i]|² over indices where bit `qubit` is 0. */
export function probabilityZero(state: Complex[], qubit: number): number {
  const bit = 1 << qubit;
  let p = 0;
  for (let i = 0; i < state.length; i++) {
    if ((i & bit) === 0) {
      const a = state[i];
      p += a.re * a.re + a.im * a.im;
    }
  }
  return p;
}

/**
 * Von-Neumann entropy of qubit `q`'s reduced density matrix.
 *
 * For a single qubit subsystem, ρ is 2×2 hermitian with tr=1, so its two
 * eigenvalues are (1 ± √(1 - 4·det ρ)) / 2. S = −Σ λᵢ ln λᵢ.
 * Returns 0 (pure) up to ln(2) (maximally mixed).
 */
export function reducedEntropy(state: Complex[], qubit: number): number {
  const bit = 1 << qubit;
  // ρ[a][b] = Σ_rest conj(ψ_{rest, a}) · ψ_{rest, b}
  // For our needs we only need ρ[0][0], ρ[1][1], ρ[0][1] (ρ[1][0] is conj).
  let r00 = 0;
  let r11 = 0;
  let r01re = 0;
  let r01im = 0;
  // Walk pairs differing only in `bit`.
  for (let i = 0; i < state.length; i++) {
    if ((i & bit) !== 0) continue;
    const a0 = state[i]; // qubit = 0
    const a1 = state[i | bit]; // qubit = 1
    r00 += a0.re * a0.re + a0.im * a0.im;
    r11 += a1.re * a1.re + a1.im * a1.im;
    // ρ[0][1] = Σ conj(a0) * a1
    r01re += a0.re * a1.re + a0.im * a1.im;
    r01im += a0.re * a1.im - a0.im * a1.re;
  }
  // det ρ = ρ00·ρ11 − |ρ01|²
  const det = r00 * r11 - (r01re * r01re + r01im * r01im);
  const disc = Math.max(0, 1 - 4 * det); // clamp float noise
  const root = Math.sqrt(disc);
  const lambdaA = (1 + root) / 2;
  const lambdaB = (1 - root) / 2;
  return -plogp(lambdaA) - plogp(lambdaB);
}

const plogp = (p: number): number => (p <= 1e-12 ? 0 : p * Math.log(p));

/* -------------------------------------------------------------------------- */
/* Misc ---------------------------------------------------------------------- */

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

function sampleStops(stops: ReadonlyArray<RGB>, t: number): RGB {
  const tt = clamp01(t);
  const last = stops.length - 1;
  const scaled = tt * last;
  const i = Math.min(Math.floor(scaled), last - 1);
  const f = scaled - i;
  const a = stops[i];
  const b = stops[i + 1];
  return [
    Math.round(a[0] + (b[0] - a[0]) * f),
    Math.round(a[1] + (b[1] - a[1]) * f),
    Math.round(a[2] + (b[2] - a[2]) * f),
  ];
}
