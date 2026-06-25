/**
 * Challenge puzzle definitions.
 *
 * Five puzzles in pedagogical order — `flip` and `plus` introduce
 * single-qubit gates, `rotate-pi-3` introduces the continuous knob
 * (and the idea that probabilities can be tuned, not just 50/50 or
 * 100/0), then `bell` and `ghz` jump into entanglement at 2q and 3q.
 *
 * Target states are returned by a function (not stored as plain
 * arrays) so we always build them from the same `Complex` primitive
 * the simulator emits — no risk of `{re, im}` shape drift between
 * literal puzzle data and runtime state vectors.
 *
 * Hints are progressive: revealed one at a time so a stuck reader
 * gets a nudge before a spoiler.
 *
 * `starter` (optional) is a base64url-encoded circuit fragment in
 * the format produced by `quantum/codec.ts`. Empty for v1; we may
 * wire it up to "Try this hint as a starting point" buttons later.
 */

import { c, type Complex } from "../../quantum/complex";

export interface Puzzle {
  slug: string;
  title: string;
  /** One-sentence "your goal" text. Formal but friendly. */
  brief: string;
  qubits: number;
  /** Build the target state vector from primitives (length = 2^qubits). */
  target: () => Complex[];
  /** Progressive hints — `hints[0]` shown first, `hints[1]` second. */
  hints: string[];
  /** Optional starter circuit (encoded URL fragment). */
  starter?: string;
}

const SQRT1_2 = 1 / Math.sqrt(2);

export const PUZZLES: readonly Puzzle[] = [
  {
    slug: "flip",
    title: "Flip |0⟩ → |1⟩",
    brief:
      "The simplest non-trivial move: turn a qubit in |0⟩ into a qubit in |1⟩.",
    qubits: 1,
    target: () => [c(0), c(1)],
    hints: [
      "One gate gets you all the way. Think Pauli.",
      "It's the quantum NOT — drop X on qubit 0, step 0.",
    ],
  },
  {
    slug: "plus",
    title: "Reach |+⟩",
    brief:
      "Put a qubit into an equal superposition: 50% chance of measuring 0, 50% chance of measuring 1.",
    qubits: 1,
    target: () => [c(SQRT1_2), c(SQRT1_2)],
    hints: [
      "There is one gate that makes superposition out of thin air.",
      "Hadamard on qubit 0. H is the equator-maker.",
    ],
  },
  {
    slug: "rotate-pi-3",
    title: "Tilt to P(|0⟩) ≈ 0.75",
    brief:
      "Rotate a qubit so a measurement returns 0 about three-quarters of the time.",
    qubits: 1,
    // Ry(π/3) |0⟩  =  cos(π/6) |0⟩ + sin(π/6) |1⟩  =  (√3/2)|0⟩ + (1/2)|1⟩
    target: () => [c(Math.cos(Math.PI / 6)), c(Math.sin(Math.PI / 6))],
    hints: [
      "Discrete gates only give you a fixed set of angles. You'll want a continuous knob.",
      "Drop Ry on qubit 0 and slide θ toward π/3 (~1.047 rad). The Bloch arrow tilts off the north pole.",
    ],
  },
  {
    slug: "bell",
    title: "Build a Bell pair",
    brief:
      "Entangle two qubits into (|00⟩ + |11⟩)/√2 — measure one, the other follows.",
    qubits: 2,
    target: () => [c(SQRT1_2), c(0), c(0), c(SQRT1_2)],
    hints: [
      "Two moves, in order. The first lifts q0 off the pole; the second wires q1 to it.",
      "H on q0 at step 0, then CNOT(control=q0, target=q1) at step 1.",
    ],
  },
  {
    slug: "ghz",
    title: "Stretch to a GHZ trio",
    brief:
      "Extend the Bell idea to three qubits: (|000⟩ + |111⟩)/√2.",
    qubits: 3,
    target: () => [
      c(SQRT1_2), c(0), c(0), c(0),
      c(0), c(0), c(0), c(SQRT1_2),
    ],
    hints: [
      "Same recipe as Bell — superpose one qubit, then propagate the correlation outward.",
      "H on q0 (step 0), CNOT(q0→q1) (step 1), CNOT(q0→q2) (step 2). Both CNOTs share q0 as control.",
    ],
  },
];

/** Lookup by slug — returns `undefined` if the slug is unknown. */
export const puzzleBySlug = (slug: string): Puzzle | undefined =>
  PUZZLES.find((p) => p.slug === slug);

/** Slugs in display order — used by the static-paths generator. */
export const PUZZLE_SLUGS: readonly string[] = PUZZLES.map((p) => p.slug);
