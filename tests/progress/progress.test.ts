/**
 * Unit tests for src/lib/progress.ts (PROG-01).
 *
 * Mirrors the patterns in tests/theme/theme.test.ts (happy-dom for
 * window.localStorage) and tests/feedback/feedback.test.ts
 * (storage-failure stubs).
 */
// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  VISITED_KEY,
  VISITED_THRESHOLD,
  getVisited,
  markVisited,
  clearVisited,
} from "../../src/lib/progress";

describe("progress runtime — pure helpers", () => {
  beforeEach(() => {
    window.localStorage.clear();
    clearVisited();
  });

  describe("VISITED_THRESHOLD constant lock (D-31)", () => {
    it("is exactly 0.5 — 50% scroll depth", () => {
      expect(VISITED_THRESHOLD).toBe(0.5);
    });
  });

  describe("getVisited", () => {
    it("returns [] when storage is empty", () => {
      expect(getVisited()).toEqual([]);
    });

    it("returns [] when storage throws on read", () => {
      const spy = vi
        .spyOn(window.localStorage.__proto__, "getItem")
        .mockImplementation(() => {
          throw new Error("storage disabled");
        });
      expect(getVisited()).toEqual([]);
      spy.mockRestore();
    });

    it("returns [] when stored value is non-JSON garbage (corrupt)", () => {
      window.localStorage.setItem(VISITED_KEY, "not-json{{{");
      expect(getVisited()).toEqual([]);
    });

    it("returns [] when stored value is the wrong shape (object, not array)", () => {
      window.localStorage.setItem(VISITED_KEY, JSON.stringify({ foo: 1 }));
      expect(getVisited()).toEqual([]);
    });

    it("returns [] when array contains non-string items", () => {
      window.localStorage.setItem(
        VISITED_KEY,
        JSON.stringify(["/qubit", 42, "/gates"]),
      );
      expect(getVisited()).toEqual([]);
    });
  });

  describe("markVisited", () => {
    it("appends to an empty list", () => {
      markVisited("/qubit");
      expect(getVisited()).toEqual(["/qubit"]);
    });

    it("dedupes repeated paths and preserves insertion order", () => {
      markVisited("/qubit");
      markVisited("/qubit");
      markVisited("/gates");
      expect(getVisited()).toEqual(["/qubit", "/gates"]);
    });

    it("does not throw when storage.setItem fails", () => {
      const spy = vi
        .spyOn(window.localStorage.__proto__, "setItem")
        .mockImplementation(() => {
          throw new Error("quota exceeded");
        });
      expect(() => markVisited("/qubit")).not.toThrow();
      spy.mockRestore();
    });
  });

  describe("clearVisited", () => {
    it("resets the stored list to []", () => {
      markVisited("/qubit");
      markVisited("/gates");
      clearVisited();
      expect(getVisited()).toEqual([]);
    });

    it("is safe to call when storage is empty (no-op)", () => {
      expect(() => clearVisited()).not.toThrow();
      expect(getVisited()).toEqual([]);
    });
  });
});
