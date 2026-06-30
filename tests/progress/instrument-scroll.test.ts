/**
 * jsdom integration tests for `instrumentScrollDepth` (PROG-01).
 *
 * Sets up a tall fake document (scrollHeight > innerHeight), mutates
 * `window.scrollY` directly, dispatches a `scroll` event, and asserts
 * the visited list is updated when (and only when) the threshold is
 * crossed.
 */
// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from "vitest";
import {
  getVisited,
  clearVisited,
  instrumentScrollDepth,
  VISITED_THRESHOLD,
} from "../../src/lib/progress";

function setScrollGeometry(
  scrollHeight: number,
  innerHeight: number,
  scrollY: number,
): void {
  Object.defineProperty(document.documentElement, "scrollHeight", {
    value: scrollHeight,
    configurable: true,
  });
  Object.defineProperty(window, "innerHeight", {
    value: innerHeight,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(window, "scrollY", {
    value: scrollY,
    configurable: true,
    writable: true,
  });
}

describe("instrumentScrollDepth — DOM integration", () => {
  beforeEach(() => {
    window.localStorage.clear();
    clearVisited();
  });

  it("marks visited once scrollY/(scrollHeight - innerHeight) crosses 0.5", () => {
    // scrollHeight 2000, innerHeight 500 → max scroll = 1500.
    // scrollY 800 → ratio 800/1500 ≈ 0.533 (above threshold).
    setScrollGeometry(2000, 500, 800);
    instrumentScrollDepth("/qubit");
    window.dispatchEvent(new Event("scroll"));
    expect(getVisited()).toContain("/qubit");
    // Sanity: threshold actually exceeded.
    expect(800 / 1500).toBeGreaterThanOrEqual(VISITED_THRESHOLD);
  });

  it("does NOT mark visited when scroll is below threshold", () => {
    // scrollY 300 → ratio 300/1500 = 0.2 (below 0.5).
    setScrollGeometry(2000, 500, 300);
    instrumentScrollDepth("/gates");
    window.dispatchEvent(new Event("scroll"));
    expect(getVisited()).not.toContain("/gates");
    expect(getVisited()).toEqual([]);
  });

  it("re-calling instrumentScrollDepth on the same path is idempotent", () => {
    setScrollGeometry(2000, 500, 1200);
    instrumentScrollDepth("/vqe");
    window.dispatchEvent(new Event("scroll"));
    // Second call after the first one already triggered — no-op.
    instrumentScrollDepth("/vqe");
    window.dispatchEvent(new Event("scroll"));
    window.dispatchEvent(new Event("scroll"));
    expect(getVisited()).toEqual(["/vqe"]);
  });
});
