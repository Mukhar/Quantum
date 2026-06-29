/**
 * Quantum — feedback runtime helpers.
 *
 * Pure, no DOM dependencies (except where explicitly noted). Designed
 * to be unit-testable by mocking `globalThis.fetch`, `localStorage`,
 * and `crypto.randomUUID`.
 *
 * Wire from `FeedbackForm.client.ts` only.
 */

export interface FeedbackPayload {
  /** Type from <select>: "general" | "topic" | "feature" | "bug" */
  type: string;
  /** Subject line, ≤100 chars */
  subject: string;
  /** Main message body, ≤2000 chars */
  message: string;
  /** Optional reply-to email */
  email: string;
  /** Page the user came from (document.referrer at form mount) */
  page: string;
  /** Anonymous session UUID — stays in localStorage, never reset by us */
  sid: string;
  /** Honeypot field — non-empty value means bot; silently dropped */
  _hp: string;
}

export type SubmitResult = "ok" | "fail" | "spam" | "noop";

const SID_KEY = "quantum/feedback-sid";

/**
 * Build a mailto: URL with a pre-populated subject + body. Used as
 * the fallback path when the Apps Script POST fails — gives the user
 * a one-click "send via email instead" option that doesn't lose
 * their message.
 */
export function buildMailto(p: FeedbackPayload, to: string): string {
  const subject = encodeURIComponent(`[Quantum] ${p.type}: ${p.subject}`);
  const body = encodeURIComponent(
    `${p.message}\n\n---\nPage: ${p.page || "(direct)"}\nFrom: ${p.email || "anonymous"}\n`,
  );
  return `mailto:${to}?subject=${subject}&body=${body}`;
}

/**
 * Read (or lazily create) an anonymous session ID. Lets us group
 * repeat feedback from the same user in the Sheet without collecting
 * any PII. Returns empty string if storage is disabled.
 */
export function getOrCreateSid(): string {
  try {
    if (typeof localStorage === "undefined") return "";
    let v = localStorage.getItem(SID_KEY);
    if (!v) {
      v = typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `sid-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(SID_KEY, v);
    }
    return v;
  } catch {
    return "";
  }
}

/** True iff the honeypot field has any non-whitespace content. */
export function isHoneypotTriggered(p: FeedbackPayload): boolean {
  return p._hp.trim().length > 0;
}

/**
 * Submit the payload to the configured Apps Script endpoint. Returns
 * a discriminated result so the caller can pick the right UX path.
 *
 * - "ok"    → server accepted (2xx)
 * - "fail"  → network error or 4xx/5xx → show mailto fallback
 * - "spam"  → honeypot triggered → silently navigate to /thanks
 *             (don't tip off the bot)
 * - "noop"  → endpoint URL is empty (preview build, dev) → show
 *             mailto fallback with a "delivery not configured" hint
 */
export async function submitFeedback(
  p: FeedbackPayload,
  endpoint: string,
): Promise<SubmitResult> {
  if (isHoneypotTriggered(p)) return "spam";
  if (!endpoint) return "noop";
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(p),
      redirect: "follow",
      // Apps Script Web Apps need no-cors mode if we're cross-origin.
      // We accept opaque responses as success since the script can't
      // surface errors through CORS anyway.
      mode: "no-cors",
    });
    // With mode:"no-cors" res.ok is always false and status is 0.
    // Treat the absence of a thrown error as success.
    return res.type === "opaque" || res.ok ? "ok" : "fail";
  } catch {
    return "fail";
  }
}

/** Clamp string lengths defensively client-side (HTML maxlength is the primary guard). */
export function clampPayload(p: FeedbackPayload): FeedbackPayload {
  return {
    ...p,
    subject: p.subject.slice(0, 100),
    message: p.message.slice(0, 2000),
    email: p.email.slice(0, 200),
  };
}
