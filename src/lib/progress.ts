/**
 * Quantum — visited-essay progress runtime (PROG-01).
 *
 * Local-only personalization: when the reader scrolls past
 * `VISITED_THRESHOLD` of any essay, the route gets recorded under
 * `localStorage["quantum/visited"]` and the concept map highlights
 * that node brighter on the next render.
 *
 * Locked decisions:
 *   - D-31: Threshold is exactly 0.5 (50% of scrollable depth).
 *   - D-32: Key is exactly "quantum/visited", value is a JSON array
 *           of route paths (NOT timestamp-keyed objects).
 *   - D-33: No analytics, no beacon, no server, no BroadcastChannel.
 *   - D-34: Visual is brightness, not checkmark; pair with aria-label.
 *   - D-35: Storage failures are swallowed silently — feature degrades,
 *           the page still renders.
 *   - D-36: Instrumentation lives in EssayLayout so every essay route
 *           is covered without per-page edits.
 *
 * Storage style mirrors `src/lib/theme.ts` — every `localStorage`
 * access is wrapped in try/catch so private-mode browsers and
 * disabled-storage sandboxes don't break the page.
 */

/** localStorage key locked by D-32. */
export const VISITED_KEY = "quantum/visited";

/** Scroll-depth threshold locked by D-31. */
export const VISITED_THRESHOLD = 0.5;

/**
 * In-memory dedupe so re-calling `instrumentScrollDepth(samePath)`
 * during the same page session is a no-op. Cleared by `clearVisited`
 * for test isolation.
 */
const triggered = new Set<string>();

/**
 * Active scroll-depth listeners so `clearVisited` (test-only) can
 * detach orphan handlers between test cases — otherwise a listener
 * registered in one test fires on `scroll` dispatched by the next.
 */
const activeListeners: Array<{ path: string; handler: EventListener }> = [];

function safeRead(): string | null {
  try {
    return window.localStorage.getItem(VISITED_KEY);
  } catch {
    return null;
  }
}

function safeWrite(value: string): void {
  try {
    window.localStorage.setItem(VISITED_KEY, value);
  } catch {
    /* swallow — storage disabled / quota full */
  }
}

function safeRemove(): void {
  try {
    window.localStorage.removeItem(VISITED_KEY);
  } catch {
    /* swallow */
  }
}

/**
 * Read the visited list. Returns `[]` when:
 *   - `localStorage` is unavailable (SSR, private mode);
 *   - the stored value is missing or not valid JSON;
 *   - the parsed value is not an array of strings.
 *
 * Deduplicated on read so callers can rely on uniqueness.
 */
export function getVisited(): string[] {
  if (typeof window === "undefined") return [];
  const raw = safeRead();
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of parsed) {
    if (typeof item !== "string") return [];
    if (seen.has(item)) continue;
    seen.add(item);
    out.push(item);
  }
  return out;
}

/**
 * Add `path` to the visited list. No-ops on storage failure or when
 * `path` is already present. Writes the JSON-encoded deduped array
 * under `VISITED_KEY`.
 */
export function markVisited(path: string): void {
  if (typeof window === "undefined") return;
  const list = getVisited();
  if (list.includes(path)) return;
  list.push(path);
  try {
    safeWrite(JSON.stringify(list));
  } catch {
    /* JSON.stringify on a plain string array shouldn't throw, but
       belt-and-suspenders: keep the page rendering. */
  }
}

/**
 * Clear the visited list, the in-memory dedupe set, and any active
 * scroll-depth listeners. Test-only — NOT surfaced in any UI control
 * (D-33 / OUT-OF-SCOPE in PLAN 06-06).
 */
export function clearVisited(): void {
  triggered.clear();
  if (typeof window !== "undefined") {
    for (const { handler } of activeListeners) {
      window.removeEventListener("scroll", handler);
    }
  }
  activeListeners.length = 0;
  if (typeof window === "undefined") return;
  safeRemove();
}

/**
 * Wire a one-shot scroll-depth observer on `window`. Calls
 * `markVisited(currentPath)` the first time
 * `scrollY / (scrollHeight - innerHeight) >= VISITED_THRESHOLD`,
 * then removes its own listener.
 *
 * Short-page behaviour: when `scrollHeight - innerHeight <= 0` (the
 * essay fits entirely in the viewport), the ratio is treated as `1` —
 * any scroll event on a short essay counts as fully read. This keeps
 * mobile / zoomed-in viewports from being permanently un-visitable.
 *
 * Idempotent per path: if `instrumentScrollDepth(samePath)` is called
 * a second time during the same page session, the second call is a
 * no-op. (Clearing the in-memory flag requires `clearVisited`.)
 *
 * Returns an unsubscribe fn that removes the listener if the
 * threshold has not yet been crossed.
 */
export function instrumentScrollDepth(currentPath: string): () => void {
  if (typeof window === "undefined") return () => {};
  if (triggered.has(currentPath)) return () => {};

  let active = true;
  const handler: EventListener = () => {
    if (!active) return;
    const scrollHeight = document.documentElement.scrollHeight ?? 0;
    const innerHeight = window.innerHeight ?? 0;
    const denom = scrollHeight - innerHeight;
    // Short pages: any scroll event counts as fully read.
    const ratio = denom > 0 ? window.scrollY / denom : 1;
    if (ratio >= VISITED_THRESHOLD) {
      markVisited(currentPath);
      triggered.add(currentPath);
      active = false;
      window.removeEventListener("scroll", handler);
      const idx = activeListeners.findIndex((l) => l.handler === handler);
      if (idx >= 0) activeListeners.splice(idx, 1);
    }
  };
  window.addEventListener("scroll", handler, { passive: true });
  activeListeners.push({ path: currentPath, handler });
  return () => {
    if (!active) return;
    active = false;
    window.removeEventListener("scroll", handler);
    const idx = activeListeners.findIndex((l) => l.handler === handler);
    if (idx >= 0) activeListeners.splice(idx, 1);
  };
}
