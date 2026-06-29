/**
 * Unit tests for the inline theme bootstrap script.
 *
 * The script is serialized as a string and executed in <head>. We
 * Function-eval it here so the runtime exercises exactly the same code
 * that ships, then assert it does the right thing under each storage +
 * matchMedia combination.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { BOOTSTRAP_SCRIPT } from "../../src/lib/themeBootstrap";

interface MockEnv {
  storedValue: string | null;
  storageThrows: boolean;
  prefersDark: boolean;
  matchMediaThrows: boolean;
}

/** Run BOOTSTRAP_SCRIPT against a mocked window + document. Returns
 *  whether <html class="dark"> ended up applied. */
function runBootstrap(env: MockEnv): boolean {
  const classes = new Set<string>();
  const fakeWindow: Record<string, unknown> = {
    localStorage: {
      getItem: vi.fn((key: string) => {
        if (env.storageThrows) throw new Error("storage disabled");
        return key === "quantum/theme" ? env.storedValue : null;
      }),
    },
    matchMedia: vi.fn((query: string) => {
      if (env.matchMediaThrows) throw new Error("matchMedia missing");
      return {
        matches: query.includes("dark") ? env.prefersDark : false,
      };
    }),
  };
  const fakeDocument = {
    documentElement: {
      classList: {
        add: (cls: string) => classes.add(cls),
      },
    },
  };

  // The IIFE references `window` and `document` as free variables.
  // Stash globals, swap in our fakes, run, then restore.
  const g = globalThis as Record<string, unknown>;
  const prevWindow = g.window;
  const prevDocument = g.document;
  g.window = fakeWindow;
  g.document = fakeDocument;
  try {
    // eslint-disable-next-line no-new-func
    new Function(BOOTSTRAP_SCRIPT)();
  } finally {
    g.window = prevWindow;
    g.document = prevDocument;
  }
  return classes.has("dark");
}

describe("theme bootstrap script", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("stored 'dark' → adds .dark class", () => {
    const isDark = runBootstrap({
      storedValue: "dark",
      storageThrows: false,
      prefersDark: false,
      matchMediaThrows: false,
    });
    expect(isDark).toBe(true);
  });

  it("stored 'light' → does NOT add .dark class", () => {
    const isDark = runBootstrap({
      storedValue: "light",
      storageThrows: false,
      prefersDark: true, // OS prefers dark, but explicit light wins
      matchMediaThrows: false,
    });
    expect(isDark).toBe(false);
  });

  it("stored 'system' + OS dark → adds .dark class", () => {
    const isDark = runBootstrap({
      storedValue: "system",
      storageThrows: false,
      prefersDark: true,
      matchMediaThrows: false,
    });
    expect(isDark).toBe(true);
  });

  it("stored 'system' + OS light → does NOT add .dark class", () => {
    const isDark = runBootstrap({
      storedValue: "system",
      storageThrows: false,
      prefersDark: false,
      matchMediaThrows: false,
    });
    expect(isDark).toBe(false);
  });

  it("no stored value → defaults to system → reads matchMedia", () => {
    const isDark = runBootstrap({
      storedValue: null,
      storageThrows: false,
      prefersDark: true,
      matchMediaThrows: false,
    });
    expect(isDark).toBe(true);
  });

  it("storage throws → defaults to system → reads matchMedia", () => {
    const isDark = runBootstrap({
      storedValue: null,
      storageThrows: true,
      prefersDark: true,
      matchMediaThrows: false,
    });
    expect(isDark).toBe(true);
  });

  it("storage and matchMedia both throw → defaults to light, never throws", () => {
    expect(() =>
      runBootstrap({
        storedValue: null,
        storageThrows: true,
        prefersDark: false,
        matchMediaThrows: true,
      }),
    ).not.toThrow();

    const isDark = runBootstrap({
      storedValue: null,
      storageThrows: true,
      prefersDark: false,
      matchMediaThrows: true,
    });
    expect(isDark).toBe(false);
  });

  it("invalid stored value (e.g. 'auto') falls back to system", () => {
    const isDark = runBootstrap({
      storedValue: "auto",
      storageThrows: false,
      prefersDark: true,
      matchMediaThrows: false,
    });
    expect(isDark).toBe(true);
  });
});
