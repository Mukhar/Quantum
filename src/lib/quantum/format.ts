/**
 * Amplitude formatting helpers used by StateVector.
 *
 * Kept separate from the widget itself so they're testable and so the
 * sandbox can re-use them in Phase 3.
 */

import type { Complex } from "./complex";

const EPS = 1e-6;

const fmt = (x: number): string => {
  if (Math.abs(x) < EPS) return "0";
  // Recognize common roots of unity to keep the readout legible.
  const sqrt12 = 1 / Math.sqrt(2);
  if (Math.abs(Math.abs(x) - sqrt12) < 1e-4) return x > 0 ? "1/√2" : "-1/√2";
  if (Math.abs(Math.abs(x) - 0.5) < 1e-4) return x > 0 ? "1/2" : "-1/2";
  if (Math.abs(Math.abs(x) - 1) < 1e-4) return x > 0 ? "1" : "-1";
  return x.toFixed(3);
};

/** Render a single complex amplitude as a short readable string. */
export const formatAmplitude = (a: Complex): string => {
  const reZero = Math.abs(a.re) < EPS;
  const imZero = Math.abs(a.im) < EPS;
  if (reZero && imZero) return "0";
  if (imZero) return fmt(a.re);
  if (reZero) return `${fmt(a.im)}i`;
  const sign = a.im < 0 ? "−" : "+";
  return `${fmt(a.re)} ${sign} ${fmt(Math.abs(a.im))}i`;
};

/** "|0⟩" style ket label for basis-state index of an n-qubit system. */
export const basisKet = (index: number, qubits: number): string =>
  `|${index.toString(2).padStart(qubits, "0")}⟩`;

/**
 * Format the full state as `(a)|0⟩ + (b)|1⟩ + …`, dropping zero
 * amplitudes for readability. If every amplitude is zero (impossible
 * in practice but cheap to guard), returns "0".
 */
export const formatState = (state: Complex[], qubits: number): string => {
  const parts: string[] = [];
  for (let i = 0; i < state.length; i++) {
    const a = state[i];
    if (Math.abs(a.re) < EPS && Math.abs(a.im) < EPS) continue;
    parts.push(`(${formatAmplitude(a)})${basisKet(i, qubits)}`);
  }
  return parts.length === 0 ? "0" : parts.join(" + ");
};
