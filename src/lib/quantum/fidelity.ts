/**
 * State-fidelity helpers — the "did the user solve the puzzle?" math.
 *
 * For two pure states |a⟩, |b⟩, fidelity is `|⟨a|b⟩|²` ∈ [0, 1]:
 *   1 ⇔ identical up to a global phase (which is unobservable),
 *   0 ⇔ orthogonal.
 *
 * Why this and not the more common ‖a − b‖? Because amplitude
 * differences punish global phase — a state that *is* the target
 * but with an extra e^{iπ} on every coefficient would look "far"
 * by L2 distance but is physically the same state. Fidelity is the
 * honest measure for "you reached the right quantum state."
 *
 * Pure functions, no IO, easy to unit-test, safe to import from a
 * Web Worker if Phase 3 grows one for the canvas widget.
 */

import { type Complex, normSquared } from "./complex";

/** Anything ≥ this is considered "solved" in challenge mode. */
export const SUCCESS_FIDELITY = 0.99;

/**
 * `|⟨a|b⟩|²` for two state vectors of equal length.
 *
 * Throws on length mismatch — silently truncating would hide bugs
 * where a 1-qubit circuit is being compared to a 2-qubit target.
 */
export const fidelity = (a: Complex[], b: Complex[]): number => {
  if (a.length !== b.length) {
    throw new Error(
      `fidelity: length mismatch (a=${a.length}, b=${b.length})`,
    );
  }
  // Inner product ⟨a|b⟩ = Σ conj(a_i) * b_i.
  let re = 0;
  let im = 0;
  for (let i = 0; i < a.length; i++) {
    const ai = a[i];
    const bi = b[i];
    // conj(a) * b = (a.re - i a.im)(b.re + i b.im)
    re += ai.re * bi.re + ai.im * bi.im;
    im += ai.re * bi.im - ai.im * bi.re;
  }
  // |·|² of the inner product.
  return normSquared({ re, im });
};

/**
 * `1 - fidelity(a, b)` — convenience for "how far off." Bounded in
 * [0, 1] for normalized states. Useful when the UI wants a smaller
 * number to mean "better" (e.g. a progress bar).
 */
export const stateDistance = (a: Complex[], b: Complex[]): number =>
  1 - fidelity(a, b);
