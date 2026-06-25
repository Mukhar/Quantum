/**
 * Complex number primitives.
 *
 * Kept tiny and dependency-free. We use plain {re, im} objects rather than
 * a class so the simulator state vector is trivially serializable / inspectable
 * from DevTools — credibility win.
 */

export interface Complex {
  re: number;
  im: number;
}

export const c = (re: number, im = 0): Complex => ({ re, im });

export const ZERO: Complex = { re: 0, im: 0 };
export const ONE: Complex = { re: 1, im: 0 };

export const add = (a: Complex, b: Complex): Complex => ({
  re: a.re + b.re,
  im: a.im + b.im,
});

export const sub = (a: Complex, b: Complex): Complex => ({
  re: a.re - b.re,
  im: a.im - b.im,
});

export const mul = (a: Complex, b: Complex): Complex => ({
  re: a.re * b.re - a.im * b.im,
  im: a.re * b.im + a.im * b.re,
});

export const scale = (a: Complex, k: number): Complex => ({
  re: a.re * k,
  im: a.im * k,
});

/** |a|^2 — the probability weight of an amplitude. */
export const normSquared = (a: Complex): number => a.re * a.re + a.im * a.im;

/** Approximate equality, useful for tests. */
export const approxEqual = (a: Complex, b: Complex, eps = 1e-9): boolean =>
  Math.abs(a.re - b.re) < eps && Math.abs(a.im - b.im) < eps;
