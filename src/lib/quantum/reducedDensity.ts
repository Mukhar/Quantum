/**
 * Reduced-density-matrix math for the sandbox results panel.
 *
 * The single-qubit Bloch picture in `bloch.ts` assumes a pure
 * one-qubit state vector. The sandbox can mount up to four qubits at
 * once, and most circuits worth playing with leave the global state
 * entangled — so a per-qubit Bloch arrow only makes sense once we've
 * traced out the others.
 *
 * Tracing produces a 2×2 density matrix ρ ∈ ℂ²ˣ² for the chosen
 * qubit. From ρ we extract a Bloch vector (x, y, z) with radius
 * r = √(x²+y²+z²) ≤ 1. r = 1 ⇒ that qubit is in a pure state (the
 * arrow has full length); r < 1 ⇒ entangled or mixed (the arrow
 * shrinks toward the origin, signalling that no single-qubit picture
 * tells the whole story).
 *
 * Conventions match the rest of the codebase:
 *  - qubit 0 is the LEAST significant bit of the state-vector index
 *    (Qiskit-compatible — see `simulator.ts`).
 *  - The Bloch axes mirror `bloch.ts`: +z = |0⟩, +x = |+⟩.
 *
 * Pure, no DOM, no side effects. The hydrator in
 * `lib/sandbox/results.client.ts` calls these per render.
 */

import type { Complex } from "./complex";

export interface BlochVector {
  x: number;
  y: number;
  z: number;
  /** √(x²+y²+z²). 1 for pure states; < 1 ⇒ mixed (entangled). */
  r: number;
}

/**
 * Reduced density matrix ρ for `qubit` (0-indexed, LSB) of an
 * `nQubits`-qubit pure state `state` (length 2^nQubits).
 *
 * Formula:  ρ[a][b] = Σ_e  ψ[idx(a, e)] · conj(ψ[idx(b, e)])
 * where `e` ranges over the 2^(n−1) basis states of the OTHER qubits
 * and `idx(bit, e)` splices `bit` into bit-position `qubit` of `e`.
 *
 * Always Hermitian and trace-1 (within float noise) — see the tests.
 */
export const reducedDensityMatrix = (
  state: Complex[],
  qubit: number,
  nQubits: number,
): Complex[][] => {
  assertShape(state, qubit, nQubits);

  const bit = 1 << qubit;
  const lowMask = bit - 1; // bits below `qubit`

  // Accumulate ρ[a][b] = Σ ψ[i_a] · conj(ψ[i_b]).
  const rho: Complex[][] = [
    [{ re: 0, im: 0 }, { re: 0, im: 0 }],
    [{ re: 0, im: 0 }, { re: 0, im: 0 }],
  ];

  const otherCount = 1 << (nQubits - 1);
  for (let e = 0; e < otherCount; e++) {
    // Splice `e` back around `qubit`: keep the bits of `e` below the
    // splice point and shift the bits at-or-above up by one, leaving
    // bit-position `qubit` itself free for the `a`/`b` index.
    const base = (e & lowMask) | ((e & ~lowMask) << 1);
    const i0 = base;          // a = 0
    const i1 = base | bit;    // a = 1
    const psi0 = state[i0];
    const psi1 = state[i1];

    // ρ[0][0] += ψ_0 · conj(ψ_0) = |ψ_0|²
    rho[0][0].re += psi0.re * psi0.re + psi0.im * psi0.im;

    // ρ[1][1] += |ψ_1|²
    rho[1][1].re += psi1.re * psi1.re + psi1.im * psi1.im;

    // ρ[0][1] += ψ_0 · conj(ψ_1)
    rho[0][1].re += psi0.re * psi1.re + psi0.im * psi1.im;
    rho[0][1].im += psi0.im * psi1.re - psi0.re * psi1.im;

    // ρ[1][0] += ψ_1 · conj(ψ_0)
    rho[1][0].re += psi1.re * psi0.re + psi1.im * psi0.im;
    rho[1][0].im += psi1.im * psi0.re - psi1.re * psi0.im;
  }

  return rho;
};

/**
 * Extract the Bloch vector from a 2×2 density matrix.
 *
 * ρ = ½ (I + r·σ) with σ = (σ_x, σ_y, σ_z), so
 *     x =  2·Re(ρ[0][1])
 *     y = −2·Im(ρ[0][1])
 *     z =     ρ[0][0] − ρ[1][1]
 *
 * For a pure state this matches `blochToCartesian(stateToBloch(ψ))`
 * exactly — verified in the tests.
 */
export const blochVectorFromRho = (rho: Complex[][]): BlochVector => {
  const x = 2 * rho[0][1].re;
  const y = -2 * rho[0][1].im;
  const z = rho[0][0].re - rho[1][1].re;
  const r = Math.sqrt(x * x + y * y + z * z);
  return { x, y, z, r };
};

/**
 * P(|0⟩), P(|1⟩) for a single qubit — the marginal distribution after
 * tracing out the others. Equal to the diagonal of ρ; we compute it
 * directly to keep the per-qubit ProbabilityBars cheap (one pass over
 * the state vector, no 2×2 allocation).
 */
export const marginalProbabilities = (
  state: Complex[],
  qubit: number,
  nQubits: number,
): [number, number] => {
  assertShape(state, qubit, nQubits);

  const bit = 1 << qubit;
  let p1 = 0;
  for (let i = 0; i < state.length; i++) {
    if ((i & bit) === 0) continue;
    const a = state[i];
    p1 += a.re * a.re + a.im * a.im;
  }
  // Clamp the leftover to fight float drift. P(|0⟩) should never be
  // negative, but rounding occasionally pushes it to −1e-17.
  const p0 = Math.max(0, 1 - p1);
  return [p0, Math.min(1, p1)];
};

/* -------------------------------------------------------------------------- */

function assertShape(state: Complex[], qubit: number, nQubits: number): void {
  if (!Number.isInteger(nQubits) || nQubits < 1) {
    throw new RangeError(`nQubits must be a positive integer, got ${nQubits}`);
  }
  if (state.length !== 1 << nQubits) {
    throw new RangeError(
      `state length ${state.length} does not match nQubits=${nQubits} (expected ${1 << nQubits})`,
    );
  }
  if (!Number.isInteger(qubit) || qubit < 0 || qubit >= nQubits) {
    throw new RangeError(`qubit ${qubit} out of range [0, ${nQubits})`);
  }
}
