/**
 * Tests for src/lib/feedback.ts — pure helpers + submitFeedback path
 * matrix. We don't render the form here (Astro components are tested
 * via build verification + the e2e snapshot story in Phase 4).
 */
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  buildMailto,
  getOrCreateSid,
  isHoneypotTriggered,
  submitFeedback,
  clampPayload,
  type FeedbackPayload,
} from "../../src/lib/feedback";

function makePayload(overrides: Partial<FeedbackPayload> = {}): FeedbackPayload {
  return {
    type: "general",
    subject: "Hello",
    message: "World",
    email: "",
    page: "/qubit",
    sid: "abc-123",
    _hp: "",
    ...overrides,
  };
}

describe("buildMailto", () => {
  it("encodes type + subject into the mailto subject", () => {
    const url = buildMailto(makePayload({ type: "bug", subject: "X & Y" }), "to@example.com");
    expect(url).toMatch(/^mailto:to@example\.com\?subject=/);
    expect(url).toContain(encodeURIComponent("[Quantum] bug: X & Y"));
  });

  it("includes page + email + message in the body", () => {
    const url = buildMailto(
      makePayload({ message: "found a typo", email: "me@x.com", page: "/gates" }),
      "to@example.com",
    );
    expect(url).toContain(encodeURIComponent("found a typo"));
    expect(url).toContain(encodeURIComponent("Page: /gates"));
    expect(url).toContain(encodeURIComponent("From: me@x.com"));
  });

  it("substitutes (direct) when page is empty", () => {
    const url = buildMailto(makePayload({ page: "" }), "to@example.com");
    expect(url).toContain(encodeURIComponent("Page: (direct)"));
  });

  it("substitutes anonymous when email is empty", () => {
    const url = buildMailto(makePayload({ email: "" }), "to@example.com");
    expect(url).toContain(encodeURIComponent("From: anonymous"));
  });
});

describe("isHoneypotTriggered", () => {
  it("false when honeypot is empty", () => {
    expect(isHoneypotTriggered(makePayload({ _hp: "" }))).toBe(false);
  });

  it("false when honeypot is whitespace only", () => {
    expect(isHoneypotTriggered(makePayload({ _hp: "   \n\t  " }))).toBe(false);
  });

  it("true when honeypot has any content", () => {
    expect(isHoneypotTriggered(makePayload({ _hp: "x" }))).toBe(true);
  });
});

describe("clampPayload", () => {
  it("trims subject to 100 chars", () => {
    const long = "a".repeat(200);
    expect(clampPayload(makePayload({ subject: long })).subject).toHaveLength(100);
  });

  it("trims message to 2000 chars", () => {
    const long = "b".repeat(3000);
    expect(clampPayload(makePayload({ message: long })).message).toHaveLength(2000);
  });

  it("trims email to 200 chars", () => {
    const long = "c".repeat(500);
    expect(clampPayload(makePayload({ email: long })).email).toHaveLength(200);
  });

  it("leaves short values untouched", () => {
    const p = makePayload();
    const out = clampPayload(p);
    expect(out.subject).toBe(p.subject);
    expect(out.message).toBe(p.message);
    expect(out.email).toBe(p.email);
  });
});

describe("getOrCreateSid", () => {
  let store: Record<string, string>;
  let originalCryptoDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    store = {};
    (globalThis as Record<string, unknown>).localStorage = {
      getItem: (k: string) => (k in store ? store[k] : null),
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
      clear: () => { store = {}; },
    };
    // crypto is a read-only getter on globalThis in modern Node — swap
    // it via defineProperty so each test can install its own stub.
    originalCryptoDescriptor = Object.getOwnPropertyDescriptor(globalThis, "crypto");
    Object.defineProperty(globalThis, "crypto", {
      value: { randomUUID: () => "11111111-2222-3333-4444-555555555555" },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    delete (globalThis as Record<string, unknown>).localStorage;
    if (originalCryptoDescriptor) {
      Object.defineProperty(globalThis, "crypto", originalCryptoDescriptor);
    } else {
      delete (globalThis as Record<string, unknown>).crypto;
    }
  });

  it("generates a new UUID and persists it on first call", () => {
    const v = getOrCreateSid();
    expect(v).toBe("11111111-2222-3333-4444-555555555555");
    expect(store["quantum/feedback-sid"]).toBe(v);
  });

  it("returns the same UUID on subsequent calls", () => {
    const first = getOrCreateSid();
    const second = getOrCreateSid();
    expect(second).toBe(first);
  });

  it("returns empty string when storage throws", () => {
    (globalThis as Record<string, unknown>).localStorage = {
      getItem: () => { throw new Error("disabled"); },
      setItem: () => { throw new Error("disabled"); },
    };
    expect(getOrCreateSid()).toBe("");
  });

  it("falls back to non-crypto UUID when crypto.randomUUID is missing", () => {
    Object.defineProperty(globalThis, "crypto", {
      value: {},
      configurable: true,
      writable: true,
    });
    const v = getOrCreateSid();
    expect(v).toMatch(/^sid-\d+-[a-z0-9]+$/);
  });
});

describe("submitFeedback", () => {
  const realFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it("returns 'spam' when honeypot is triggered (no fetch)", async () => {
    const spy = vi.fn();
    globalThis.fetch = spy as unknown as typeof fetch;
    const result = await submitFeedback(makePayload({ _hp: "bot" }), "https://x/");
    expect(result).toBe("spam");
    expect(spy).not.toHaveBeenCalled();
  });

  it("returns 'noop' when endpoint is empty (no fetch)", async () => {
    const spy = vi.fn();
    globalThis.fetch = spy as unknown as typeof fetch;
    const result = await submitFeedback(makePayload(), "");
    expect(result).toBe("noop");
    expect(spy).not.toHaveBeenCalled();
  });

  it("returns 'ok' on opaque success (no-cors)", async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: false,
      type: "opaque",
    } as unknown as Response)) as typeof fetch;
    const result = await submitFeedback(makePayload(), "https://x/");
    expect(result).toBe("ok");
  });

  it("returns 'ok' on standard 2xx response", async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      type: "basic",
    } as unknown as Response)) as typeof fetch;
    const result = await submitFeedback(makePayload(), "https://x/");
    expect(result).toBe("ok");
  });

  it("returns 'fail' on network error", async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error("network down");
    }) as typeof fetch;
    const result = await submitFeedback(makePayload(), "https://x/");
    expect(result).toBe("fail");
  });

  it("posts JSON with correct headers + body", async () => {
    const spy = vi.fn(async () => ({ ok: true, type: "basic" } as unknown as Response));
    globalThis.fetch = spy as unknown as typeof fetch;
    const payload = makePayload({ subject: "test" });
    await submitFeedback(payload, "https://example/exec");
    expect(spy).toHaveBeenCalledOnce();
    const [url, init] = spy.mock.calls[0];
    expect(url).toBe("https://example/exec");
    expect(init?.method).toBe("POST");
    expect((init?.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
    expect(JSON.parse(init?.body as string)).toEqual(payload);
  });
});
