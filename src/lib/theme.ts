/**
 * Quantum — theme runtime.
 *
 * Three states: "light" | "dark" | "system". Persisted in
 * `localStorage["quantum/theme"]`. Storage failures (private mode,
 * disabled storage) are swallowed — the page still renders, defaults
 * to system.
 *
 * Widgets that paint outside CSS (Three.js, canvas) listen for the
 * `themechange` event dispatched on `window` to re-read CSS vars.
 *
 * Wiring is by `src/lib/themeBootstrap.ts` (inline blocking <head>
 * script) for first-paint; this module is for runtime toggling.
 */

export type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "quantum/theme";
const VALID: ReadonlyArray<Theme> = ["light", "dark", "system"];

function safeRead(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function safeWrite(value: Theme): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* swallow — storage disabled */
  }
}

function prefersDark(): boolean {
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    return false;
  }
}

export function getStoredTheme(): Theme {
  const raw = safeRead();
  return (VALID as ReadonlyArray<string>).includes(raw ?? "")
    ? (raw as Theme)
    : "system";
}

/** Compute the effective light/dark state for the current stored preference. */
export function getEffectiveTheme(): "light" | "dark" {
  const stored = getStoredTheme();
  if (stored === "system") return prefersDark() ? "dark" : "light";
  return stored;
}

/**
 * Apply a theme: persist, toggle <html.dark>, and notify subscribers.
 * Safe to call from any script — no-op if document is unavailable.
 */
export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  safeWrite(theme);
  const effective = theme === "system"
    ? (prefersDark() ? "dark" : "light")
    : theme;
  const root = document.documentElement;
  if (effective === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
  try {
    window.dispatchEvent(new CustomEvent("themechange", { detail: { theme, effective } }));
  } catch {
    /* CustomEvent unavailable (very old browser) — ignore */
  }
}

/**
 * Re-apply the stored preference. Use after the bootstrap has already
 * painted but a listener (e.g. system theme change) needs to recompute.
 */
export function reapplyStoredTheme(): void {
  applyTheme(getStoredTheme());
}

/**
 * Subscribe to OS-level color-scheme changes. The callback fires only
 * when the user's stored preference is "system" — otherwise the user
 * has made an explicit choice and OS shifts should not move the page.
 *
 * Returns an unsubscribe function.
 */
export function subscribeToSystemTheme(cb: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = () => {
    if (getStoredTheme() === "system") {
      reapplyStoredTheme();
      cb();
    }
  };
  mq.addEventListener("change", handler);
  return () => mq.removeEventListener("change", handler);
}

/** Cycle order used by the header toggle. */
export const THEME_CYCLE: ReadonlyArray<Theme> = ["light", "dark", "system"];

export function nextInCycle(current: Theme): Theme {
  const idx = THEME_CYCLE.indexOf(current);
  return THEME_CYCLE[(idx + 1) % THEME_CYCLE.length];
}
