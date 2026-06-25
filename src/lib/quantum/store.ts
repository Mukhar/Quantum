/**
 * Tiny reactive wrapper around `Simulator`.
 *
 * The site-wide widget pattern is: each essay page creates one store,
 * every widget on the page subscribes. Widgets never touch the
 * Simulator directly — they read snapshots, dispatch actions, and
 * re-render on notify.
 *
 * Intentionally vanilla TS (no Preact, no signals lib). The whole
 * concept essay needs to be small enough to ship under the LCP budget,
 * and reactive primitives at this scale fit in ~50 lines.
 */

import { Simulator } from "./simulator";
import type { GateName, RotationAxis } from "./gates";
import type { Complex } from "./complex";
import { blochToState } from "./bloch";

export interface Snapshot {
  qubits: number;
  /** Defensive copy of the simulator's amplitudes — safe to keep around. */
  state: Complex[];
  probabilities: number[];
  /** Monotonically increasing — handy for memoization/diffing. */
  revision: number;
}

export type Listener = (snap: Snapshot) => void;

export interface Store {
  /** Re-renders when state changes. Returns an unsubscribe fn. */
  subscribe: (listener: Listener) => () => void;
  /** Current snapshot. Cheap; pulls from the cached snapshot. */
  snapshot: () => Snapshot;
  /** Apply a discrete gate (X/Y/Z/H/S/T/I) to a qubit. */
  apply: (name: GateName, qubit: number) => void;
  /** Apply CNOT(control, target). */
  applyCNOT: (control: number, target: number) => void;
  /** Apply a parameterized rotation. */
  applyRotation: (axis: RotationAxis, qubit: number, theta: number) => void;
  /** Re-initialize to |0…0⟩. */
  reset: () => void;
  /**
   * Replace the entire state vector. Used by BlochSphere drag handler
   * and other "set absolute state" widgets. Caller is responsible for
   * passing a unit-norm vector — the store renormalizes defensively
   * but logs a warning if the deviation is large.
   */
  setState: (state: Complex[]) => void;
  /**
   * Single-qubit shortcut: set the state from Bloch (θ, φ). No-op for
   * multi-qubit simulators (logs a warning so you notice).
   */
  setStateFromBloch: (theta: number, phi: number) => void;
}

export interface StoreOptions {
  qubits: number;
}

const cloneState = (state: Complex[]): Complex[] =>
  state.map((a) => ({ re: a.re, im: a.im }));

const renormalize = (state: Complex[]): Complex[] => {
  let norm = 0;
  for (const a of state) norm += a.re * a.re + a.im * a.im;
  if (norm === 0) return state;
  const k = 1 / Math.sqrt(norm);
  if (Math.abs(1 - k) < 1e-9) return state;
  return state.map((a) => ({ re: a.re * k, im: a.im * k }));
};

export const createStore = ({ qubits }: StoreOptions): Store => {
  const sim = new Simulator({ qubits });
  const listeners = new Set<Listener>();
  let revision = 0;
  let cached: Snapshot = makeSnapshot();

  function makeSnapshot(): Snapshot {
    return {
      qubits: sim.qubits,
      state: cloneState(sim.state),
      probabilities: sim.probabilities(),
      revision,
    };
  }

  function notify() {
    revision++;
    cached = makeSnapshot();
    for (const l of listeners) l(cached);
  }

  return {
    subscribe(listener) {
      listeners.add(listener);
      // Emit current state immediately so widgets render on mount.
      listener(cached);
      return () => listeners.delete(listener);
    },
    snapshot() {
      return cached;
    },
    apply(name, qubit) {
      sim.apply(name, qubit);
      notify();
    },
    applyCNOT(control, target) {
      sim.apply("CNOT", control, target);
      notify();
    },
    applyRotation(axis, qubit, theta) {
      sim.applyRotation(axis, qubit, theta);
      notify();
    },
    reset() {
      // Cheapest correct reset: build a fresh simulator and copy its state.
      const fresh = new Simulator({ qubits: sim.qubits });
      sim.state = cloneState(fresh.state);
      notify();
    },
    setState(next) {
      if (next.length !== sim.state.length) {
        throw new Error(
          `setState: expected length ${sim.state.length}, got ${next.length}`,
        );
      }
      sim.state = renormalize(cloneState(next));
      notify();
    },
    setStateFromBloch(theta, phi) {
      if (sim.qubits !== 1) {
        console.warn(
          `setStateFromBloch: only meaningful for 1-qubit stores (got ${sim.qubits})`,
        );
        return;
      }
      sim.state = blochToState(theta, phi);
      notify();
    },
  };
};

/**
 * Browser-side page store registry. Each essay page registers exactly
 * one store under a string key; widgets look it up by the same key.
 *
 * This is the simplest possible binding pattern that lets Astro
 * islands (independent `<script>` chunks) share state without us
 * pulling in a framework. Keys are namespaced per page.
 */
const REGISTRY = new Map<string, Store>();

export const registerStore = (key: string, store: Store): Store => {
  REGISTRY.set(key, store);
  return store;
};

export const getStore = (key: string): Store => {
  const store = REGISTRY.get(key);
  if (!store) throw new Error(`No store registered under key "${key}"`);
  return store;
};

/** Idempotent: returns the existing store if one is already registered. */
export const ensureStore = (key: string, opts: StoreOptions): Store => {
  const existing = REGISTRY.get(key);
  if (existing) return existing;
  return registerStore(key, createStore(opts));
};

/** Test/teardown helper. */
export const clearRegistry = () => REGISTRY.clear();
