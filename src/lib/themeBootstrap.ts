/**
 * Quantum — first-paint theme bootstrap.
 *
 * This script runs synchronously in <head> before any stylesheet is
 * applied. It reads the persisted preference and adds `class="dark"`
 * to <html> if appropriate, so the first paint matches the chosen
 * theme with zero flash.
 *
 * Must remain dependency-free (no imports — it's serialized into a
 * <script is:inline set:html={…}> tag) and resilient to every browser
 * weirdness: storage disabled, matchMedia missing, exceptions inside
 * either. On any failure: default to light, never throw.
 *
 * Public-facing key: `localStorage["quantum/theme"]`. Keep in lockstep
 * with the same constant in `src/lib/theme.ts`.
 */
export const BOOTSTRAP_SCRIPT = `(function(){
  try {
    var k = "quantum/theme";
    var v = null;
    try { v = window.localStorage.getItem(k); } catch (e) {}
    if (v !== "light" && v !== "dark" && v !== "system") v = "system";
    var dark = false;
    if (v === "dark") dark = true;
    else if (v === "system") {
      try {
        dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      } catch (e) {}
    }
    if (dark) document.documentElement.classList.add("dark");
  } catch (e) { /* swallow — default to light */ }
})();`;
