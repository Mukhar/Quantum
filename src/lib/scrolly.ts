/**
 * Scrollytelling helper.
 *
 * Wires an `IntersectionObserver` so a callback fires when each "step"
 * scrolls into the central reading band. Used by essays to swap widget
 * state as the reader progresses.
 *
 * Honors `prefers-reduced-motion`: when set, observation is a no-op —
 * we just invoke the callback once for every step on registration so
 * the page still shows all states sequentially without scroll-tied
 * transitions.
 *
 * Kept dependency-free. The whole point of the site is "small enough
 * to read in DevTools."
 */

export interface ScrollyOptions {
  /** CSS selector for step elements within the container. */
  stepSelector: string;
  /** Fires when a step enters the active band. */
  onStep: (index: number, el: Element) => void;
  /** Vertical position of the "active band" as a 0..1 fraction. Default 0.5. */
  triggerPoint?: number;
}

export interface ScrollyHandle {
  /** Detach all observers. Idempotent. */
  destroy: () => void;
}

/** True when the user prefers reduced motion. SSR-safe (returns false). */
export const prefersReducedMotion = (): boolean => {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

/**
 * Attach a scrolly observer. Returns a `destroy()` cleanup function.
 *
 * Behavior:
 * - Normal mode: each step fires `onStep` once when it crosses the
 *   trigger band (top->down or bottom->up).
 * - Reduced-motion mode: no observers; fires `onStep` for every step
 *   synchronously so the consumer can render a "final" state.
 */
export const attachScrolly = (
  container: ParentNode,
  { stepSelector, onStep, triggerPoint = 0.5 }: ScrollyOptions,
): ScrollyHandle => {
  const steps = Array.from(container.querySelectorAll(stepSelector));
  if (steps.length === 0) return { destroy: () => {} };

  if (prefersReducedMotion() || typeof IntersectionObserver === "undefined") {
    steps.forEach((el, i) => onStep(i, el));
    return { destroy: () => {} };
  }

  // A 1px-tall observation band sitting at `triggerPoint` of the viewport.
  const topMargin = Math.round(triggerPoint * 100);
  const bottomMargin = 100 - topMargin - 0.01; // never negative
  const rootMargin = `-${topMargin}% 0px -${bottomMargin}% 0px`;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const index = steps.indexOf(entry.target);
        if (index >= 0) onStep(index, entry.target);
      }
    },
    { rootMargin, threshold: 0 },
  );

  steps.forEach((el) => observer.observe(el));

  return {
    destroy: () => observer.disconnect(),
  };
};
