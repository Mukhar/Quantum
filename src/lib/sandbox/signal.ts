/**
 * A *tiny* reactive primitive. Read `.value` to get, set `.value` to
 * notify, `subscribe(cb)` to listen.
 *
 * Why not import a real signals lib? Two reasons:
 *  1. The sandbox network couldn't reach npm during Phase 3 execution
 *     and we don't want a dep we can't install on the next dev's box.
 *  2. The whole sandbox uses ~5 signals; a 40-line primitive is honest.
 *
 * What this is NOT: there's no auto-tracking / dependency graph. If
 * you need a "computed" value, derive it inside a `subscribe` callback
 * or call `compute(deps, fn)` which sets up explicit dependencies.
 */

export interface Signal<T> {
  readonly value: T;
  /** Triggers all listeners; identity comparison only — pass a fresh object. */
  set: (next: T) => void;
  /** Sugar for `set(updater(value))`. */
  update: (updater: (prev: T) => T) => void;
  /** Listen for changes. Returns an unsubscribe fn. */
  subscribe: (listener: (value: T) => void) => () => void;
}

export const signal = <T>(initial: T): Signal<T> => {
  let current = initial;
  const listeners = new Set<(value: T) => void>();
  const sig: Signal<T> = {
    get value() {
      return current;
    },
    set(next) {
      if (Object.is(next, current)) return;
      current = next;
      for (const l of listeners) l(current);
    },
    update(updater) {
      sig.set(updater(current));
    },
    subscribe(listener) {
      listeners.add(listener);
      listener(current);
      return () => listeners.delete(listener);
    },
  };
  return sig;
};

/**
 * Explicit computed value — re-evaluated whenever any dep notifies.
 * The returned signal is read-only (calling `set` on it throws).
 */
export const compute = <T>(deps: Array<Signal<unknown>>, fn: () => T): Signal<T> => {
  const out = signal(fn());
  for (const d of deps) d.subscribe(() => out.set(fn()));
  // Wrap to forbid external writes.
  return {
    get value() { return out.value; },
    set: () => { throw new Error("computed signals are read-only"); },
    update: () => { throw new Error("computed signals are read-only"); },
    subscribe: out.subscribe,
  };
};
