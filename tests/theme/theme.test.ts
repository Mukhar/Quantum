/**
 * Unit tests for the theme runtime (src/lib/theme.ts).
 *
 * Mocks window.localStorage, window.matchMedia, and uses happy-dom
 * (configured in vitest.config.ts) for document.documentElement +
 * CustomEvent. We assert: persistence, .dark class toggling, the
 * themechange event payload, and cycle ordering.
 */
// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  applyTheme,
  getStoredTheme,
  getEffectiveTheme,
  THEME_CYCLE,
  nextInCycle,
} from "../../src/lib/theme";

const STORAGE_KEY = "quantum/theme";

function mockMatchMedia(prefersDark: boolean): void {
  (window as unknown as { matchMedia: typeof window.matchMedia }).matchMedia = vi.fn(
    (query: string) =>
      ({
        matches: query.includes("dark") ? prefersDark : false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }) as unknown as MediaQueryList,
  );
}

describe("theme runtime", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove("dark");
    mockMatchMedia(false);
  });

  describe("getStoredTheme", () => {
    it("returns 'system' when nothing is stored", () => {
      expect(getStoredTheme()).toBe("system");
    });

    it("returns the stored value when valid", () => {
      window.localStorage.setItem(STORAGE_KEY, "dark");
      expect(getStoredTheme()).toBe("dark");
    });

    it("falls back to 'system' for invalid values", () => {
      window.localStorage.setItem(STORAGE_KEY, "purple");
      expect(getStoredTheme()).toBe("system");
    });
  });

  describe("getEffectiveTheme", () => {
    it("'system' + OS dark → 'dark'", () => {
      mockMatchMedia(true);
      window.localStorage.setItem(STORAGE_KEY, "system");
      expect(getEffectiveTheme()).toBe("dark");
    });

    it("'system' + OS light → 'light'", () => {
      mockMatchMedia(false);
      window.localStorage.setItem(STORAGE_KEY, "system");
      expect(getEffectiveTheme()).toBe("light");
    });

    it("explicit 'light' overrides OS dark", () => {
      mockMatchMedia(true);
      window.localStorage.setItem(STORAGE_KEY, "light");
      expect(getEffectiveTheme()).toBe("light");
    });
  });

  describe("applyTheme", () => {
    it("persists the chosen value", () => {
      applyTheme("dark");
      expect(window.localStorage.getItem(STORAGE_KEY)).toBe("dark");
    });

    it("adds .dark class when effective is dark", () => {
      applyTheme("dark");
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    it("removes .dark class when effective is light", () => {
      document.documentElement.classList.add("dark");
      applyTheme("light");
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });

    it("dispatches a themechange event with {theme, effective}", () => {
      const handler = vi.fn();
      window.addEventListener("themechange", handler as EventListener);
      applyTheme("dark");
      expect(handler).toHaveBeenCalledTimes(1);
      const evt = handler.mock.calls[0][0] as CustomEvent<{
        theme: string;
        effective: string;
      }>;
      expect(evt.detail).toEqual({ theme: "dark", effective: "dark" });
      window.removeEventListener("themechange", handler as EventListener);
    });

    it("'system' resolves to OS dark in the event payload", () => {
      mockMatchMedia(true);
      const handler = vi.fn();
      window.addEventListener("themechange", handler as EventListener);
      applyTheme("system");
      const evt = handler.mock.calls[0][0] as CustomEvent<{
        theme: string;
        effective: string;
      }>;
      expect(evt.detail).toEqual({ theme: "system", effective: "dark" });
      window.removeEventListener("themechange", handler as EventListener);
    });
  });

  describe("THEME_CYCLE / nextInCycle", () => {
    it("cycles light → dark → system → light", () => {
      expect(nextInCycle("light")).toBe("dark");
      expect(nextInCycle("dark")).toBe("system");
      expect(nextInCycle("system")).toBe("light");
    });

    it("THEME_CYCLE contains exactly the three valid states", () => {
      expect([...THEME_CYCLE].sort()).toEqual(["dark", "light", "system"]);
    });
  });
});
