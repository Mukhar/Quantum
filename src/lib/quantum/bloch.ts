/**
 * Bloch-sphere coordinate conversions.
 *
 * For a single qubit |ψ⟩ = α|0⟩ + β|1⟩ (modulo global phase), the
 * Bloch coordinates (θ, φ) are:
 *
 *   |ψ⟩ = cos(θ/2)|0⟩ + e^{iφ} sin(θ/2)|1⟩
 *
 *   θ ∈ [0, π]    polar angle from +Z (= |0⟩)
 *   φ ∈ [0, 2π)   azimuth around Z, measured from +X (= |+⟩)
 *
 * Drag interactions go state → Cartesian → drop on sphere surface →
 * (θ, φ) → new state. So both directions matter.
 */

import type { Complex } from "./complex";

export interface BlochAngles {
  /** Polar angle from +Z, in [0, π]. */
  theta: number;
  /** Azimuthal angle, in [0, 2π). */
  phi: number;
}

export interface BlochCartesian {
  x: number;
  y: number;
  z: number;
}

const TAU = 2 * Math.PI;
const EPS = 1e-9;

/** Bring an angle into [0, 2π). */
const wrap = (a: number): number => ((a % TAU) + TAU) % TAU;

/**
 * State → (θ, φ).
 *
 * We use α to remove the global phase (rotate so α is real and ≥ 0),
 * then read φ off of β.
 */
export const stateToBloch = (state: Complex[]): BlochAngles => {
  if (state.length !== 2) {
    throw new Error(`stateToBloch: expected 1-qubit state (length 2), got ${state.length}`);
  }
  const [a, b] = state;

  // Global-phase removal: multiply by e^{-i·arg(α)}.
  const argA = Math.atan2(a.im, a.re);
  const cos = Math.cos(-argA);
  const sin = Math.sin(-argA);
  const a2 = { re: a.re * cos - a.im * sin, im: a.re * sin + a.im * cos };
  const b2 = { re: b.re * cos - b.im * sin, im: b.re * sin + b.im * cos };

  // Now α is (a2.re, ~0). θ/2 = atan2(|β|, α).
  const absB = Math.hypot(b2.re, b2.im);
  const halfTheta = Math.atan2(absB, a2.re);
  const theta = 2 * halfTheta;

  // φ is the argument of β (only meaningful if |β| > 0).
  const phi = absB < EPS ? 0 : wrap(Math.atan2(b2.im, b2.re));

  return { theta, phi };
};

/**
 * (θ, φ) → state. Returns a unit-norm 2-amplitude vector.
 *
 * Clamps θ defensively to [0, π] so jittery drag inputs never produce
 * non-physical states.
 */
export const blochToState = (theta: number, phi: number): Complex[] => {
  const clamped = Math.min(Math.PI, Math.max(0, theta));
  const c = Math.cos(clamped / 2);
  const s = Math.sin(clamped / 2);
  return [
    { re: c, im: 0 },
    { re: s * Math.cos(phi), im: s * Math.sin(phi) },
  ];
};

/** (θ, φ) → Cartesian unit-sphere coordinates. Uses physics convention. */
export const blochToCartesian = ({ theta, phi }: BlochAngles): BlochCartesian => ({
  x: Math.sin(theta) * Math.cos(phi),
  y: Math.sin(theta) * Math.sin(phi),
  z: Math.cos(theta),
});

/** Cartesian on the unit sphere → (θ, φ). */
export const cartesianToBloch = ({ x, y, z }: BlochCartesian): BlochAngles => {
  // Clamp z because acos blows up just outside [-1, 1].
  const cz = Math.min(1, Math.max(-1, z));
  const theta = Math.acos(cz);
  const phi = (Math.abs(x) < EPS && Math.abs(y) < EPS) ? 0 : wrap(Math.atan2(y, x));
  return { theta, phi };
};
