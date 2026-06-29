/**
 * Toast hydrator. Subscribes to `toast` signal and renders a single
 * fixed-position dismiss-after-3.5s element.
 */
import { toast } from "./store";

const DISMISS_MS = 3500;
let host: HTMLDivElement | null = null;
let dismissTimer: number | null = null;

export function mountToast() {
  toast.subscribe((msg) => {
    if (!msg) {
      hide();
      return;
    }
    show(msg.message, msg.kind);
  });
}

function show(message: string, kind: "info" | "error") {
  hide();
  host = document.createElement("div");
  host.setAttribute("role", "status");
  host.setAttribute("aria-live", "polite");
  host.className =
    `fixed bottom-6 left-1/2 -translate-x-1/2 z-40 rounded-md px-4 py-2 text-sm shadow-lg border ` +
    (kind === "error"
      ? "bg-rose-900/90 border-rose-700 text-rose-100"
      : "bg-surface-sunken/95 border-line-strong text-ink");
  host.textContent = message;
  document.body.appendChild(host);
  dismissTimer = window.setTimeout(() => {
    toast.set(null);
  }, DISMISS_MS);
}

function hide() {
  if (host) {
    host.remove();
    host = null;
  }
  if (dismissTimer) {
    window.clearTimeout(dismissTimer);
    dismissTimer = null;
  }
}
