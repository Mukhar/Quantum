/**
 * URL fragment + localStorage persistence for the sandbox circuit.
 *
 * Source of truth ordering:
 *   1. `location.hash` (a shared link wins — readers expect the link
 *      they clicked to load that circuit, not their own draft).
 *   2. `localStorage["sandbox.lastCircuit"]` (crash recovery — empty
 *      hash means continue where you left off).
 *   3. Default empty circuit.
 *
 * Writes:
 *   - Hash: replaced (not pushed) on every commit. We rate-limit to
 *     once per animation frame so dragging the slider doesn't pollute
 *     browser history or spam `history.replaceState`.
 *   - localStorage: same coalesced cadence.
 */
import { circuit, onCommit, showToast, padToVisibleSteps, DEFAULT_STEPS } from "./store";
import { encodeCircuit, decodeCircuit, CodecError } from "../quantum/codec";
import type { Circuit } from "../quantum/circuit";

const LS_KEY = "sandbox.lastCircuit";
const SHARE_QUERY = "share";

let pendingFlush: number | null = null;
let suppressFlushOnce = false;

/**
 * Read URL fragment / localStorage and replace the current circuit if
 * either yields one. Idempotent — call once at hydration.
 */
export function hydrateFromUrlOrStorage(): "url" | "storage" | "default" {
  const hash = stripHash(location.hash);
  if (hash) {
    try {
      const c = decodeCircuit(hash);
      replaceCircuitWithoutFlush(padToVisibleSteps(c, DEFAULT_STEPS));
      return "url";
    } catch (err) {
      const why = err instanceof CodecError ? err.message : (err as Error).message;
      showToast(`Couldn't load circuit from URL: ${why}`, "error");
      // fall through to storage / default
    }
  }
  try {
    const stored = localStorage.getItem(LS_KEY);
    if (stored) {
      const c = decodeCircuit(stored);
      replaceCircuitWithoutFlush(padToVisibleSteps(c, DEFAULT_STEPS));
      return "storage";
    }
  } catch (_err) {
    // localStorage might be unavailable (private mode, quota); silent.
  }
  return "default";
}

/**
 * Wire up auto-flush. After this, every committed mutation eventually
 * lands in both the URL hash and localStorage.
 */
export function startAutoPersist() {
  onCommit(() => scheduleFlush());
  // Cross-tab: if another tab shared a new circuit via the same key,
  // pick it up (best-effort).
  window.addEventListener("storage", (ev) => {
    if (ev.key !== LS_KEY || !ev.newValue) return;
    try {
      const c = decodeCircuit(ev.newValue);
      replaceCircuitWithoutFlush(padToVisibleSteps(c, DEFAULT_STEPS));
    } catch (_err) {
      // Ignore garbage from other origins / older versions.
    }
  });
  // Hashchange from user editing the URL directly or browser back/forward.
  window.addEventListener("hashchange", () => {
    const hash = stripHash(location.hash);
    if (!hash) return;
    try {
      const c = decodeCircuit(hash);
      replaceCircuitWithoutFlush(padToVisibleSteps(c, DEFAULT_STEPS));
    } catch (err) {
      showToast(`Bad shared circuit: ${(err as Error).message}`, "error");
    }
  });
}

/**
 * Copy the encoded fragment to clipboard. Returns true on success.
 * Caller is responsible for the toast/confirmation UI.
 */
export async function copyShareUrl(): Promise<boolean> {
  let fragment: string;
  try {
    fragment = encodeCircuit(circuit.value);
  } catch (err) {
    showToast(`Can't share: ${(err as Error).message}`, "error");
    return false;
  }
  const url = `${location.origin}${location.pathname}?${SHARE_QUERY}=1#${fragment}`;
  try {
    await navigator.clipboard.writeText(url);
    showToast("Share link copied to clipboard");
    return true;
  } catch (_err) {
    showToast("Couldn't copy — your browser blocked clipboard access", "error");
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/* Internals */

function scheduleFlush() {
  if (pendingFlush !== null) return;
  pendingFlush = requestAnimationFrame(() => {
    pendingFlush = null;
    if (suppressFlushOnce) {
      suppressFlushOnce = false;
      return;
    }
    flushNow();
  });
}

function flushNow() {
  let fragment: string;
  try {
    fragment = encodeCircuit(circuit.value);
  } catch (_err) {
    // Don't crash on overflow — `copyShareUrl` is where the user finds out.
    return;
  }
  // history.replaceState avoids polluting back-stack on every keystroke.
  history.replaceState(history.state, "", `#${fragment}`);
  try {
    localStorage.setItem(LS_KEY, fragment);
  } catch (_err) {
    // Quota / private mode — silent.
  }
}

function replaceCircuitWithoutFlush(c: Circuit) {
  suppressFlushOnce = true;
  circuit.set(c);
}

function stripHash(s: string): string {
  return s.startsWith("#") ? s.slice(1) : s;
}
