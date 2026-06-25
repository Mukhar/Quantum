/**
 * Single-qubit gate matrices.
 *
 * Each gate is a 2x2 complex matrix laid out as [a00, a01, a10, a11].
 * Multi-qubit gates (CNOT, etc.) are handled directly in the simulator
 * via index manipulation — no need to build 2^n matrices.
 */

import { type Complex, c } from "./complex";

export type Gate2x2 = readonly [Complex, Complex, Complex, Complex];

const SQRT1_2 = 1 / Math.sqrt(2);

/** Pauli-X — quantum NOT. Flips |0⟩ ↔ |1⟩. */
export const X: Gate2x2 = [c(0), c(1), c(1), c(0)];

/** Pauli-Y. */
export const Y: Gate2x2 = [c(0), c(0, -1), c(0, 1), c(0)];

/** Pauli-Z — phase flip on |1⟩. */
export const Z: Gate2x2 = [c(1), c(0), c(0), c(-1)];

/** Identity — useful for tests and "do nothing" steps. */
export const I: Gate2x2 = [c(1), c(0), c(0), c(1)];

/** Hadamard — creates equal superposition from a basis state. */
export const H: Gate2x2 = [
  c(SQRT1_2),
  c(SQRT1_2),
  c(SQRT1_2),
  c(-SQRT1_2),
];

/** Phase gate (π/2). */
export const S: Gate2x2 = [c(1), c(0), c(0), c(0, 1)];

/** T gate (π/4). */
export const T: Gate2x2 = [c(1), c(0), c(0), c(Math.SQRT1_2, Math.SQRT1_2)];

export const GATES = { X, Y, Z, I, H, S, T } as const;
export type GateName = keyof typeof GATES;

/**
 * Parameterized rotation gates — the engine of every interactive
 * sweep on the site. Derived from the textbook form:
 *
 *   R_n(θ) = cos(θ/2) I − i sin(θ/2) σ_n
 *
 * where σ_n is the corresponding Pauli. We expose them as *factories*
 * (callable per angle) rather than precomputed matrices because every
 * slider tick produces a new θ.
 *
 * All three return a `Gate2x2` you can hand to `Simulator.applySingle`.
 */

export type RotationAxis = "Rx" | "Ry" | "Rz";

const rot = (axis: RotationAxis, theta: number): Gate2x2 => {
  const co = Math.cos(theta / 2);
  const si = Math.sin(theta / 2);
  switch (axis) {
    case "Rx":
      // [[cos, -i sin], [-i sin, cos]]
      return [c(co), c(0, -si), c(0, -si), c(co)];
    case "Ry":
      // [[cos, -sin], [sin, cos]] — entirely real
      return [c(co), c(-si), c(si), c(co)];
    case "Rz":
      // [[e^{-iθ/2}, 0], [0, e^{iθ/2}]]
      return [c(co, -si), c(0), c(0), c(co, si)];
  }
};

export const Rx = (theta: number): Gate2x2 => rot("Rx", theta);
export const Ry = (theta: number): Gate2x2 => rot("Ry", theta);
export const Rz = (theta: number): Gate2x2 => rot("Rz", theta);

export const ROTATIONS = { Rx, Ry, Rz } as const;
