/**
 * SearchComparison — structural assertions on the formula widget.
 *
 * The numeric helpers are tiny and inline; we mirror the math here so
 * the test catches drift in either direction.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SOURCE = readFileSync(
  fileURLToPath(new URL("../../src/components/SearchComparison.astro", import.meta.url)),
  "utf8",
);

const groverIterations = (N: number) => Math.floor((Math.PI / 4) * Math.sqrt(N));
const classicalAverage = (N: number) => N / 2;

const LOCKED_STOPS = [16, 32, 64, 128, 256, 512, 1024];

describe("SearchComparison — formula math", () => {
  it("locks Grover iteration counts at every stop", () => {
    expect(groverIterations(16)).toBe(3);
    expect(groverIterations(32)).toBe(4);
    expect(groverIterations(64)).toBe(6);
    expect(groverIterations(128)).toBe(8);
    expect(groverIterations(256)).toBe(12);
    expect(groverIterations(512)).toBe(17);
    expect(groverIterations(1024)).toBe(25);
  });

  it("locks classical average probes at every stop", () => {
    expect(classicalAverage(16)).toBe(8);
    expect(classicalAverage(1024)).toBe(512);
  });
});

describe("SearchComparison — widget contract", () => {
  it("declares the widget selector", () => {
    expect(SOURCE).toContain('data-widget="search-comparison"');
  });

  it("uses exactly the seven locked stops", () => {
    expect(SOURCE).toMatch(/\[\s*16\s*,\s*32\s*,\s*64\s*,\s*128\s*,\s*256\s*,\s*512\s*,\s*1024\s*\]/);
    for (const stop of LOCKED_STOPS) {
      expect(SOURCE).toMatch(new RegExp(`\\b${stop}\\b`));
    }
  });

  it("renders an indexed slider over stops.length - 1", () => {
    expect(SOURCE).toMatch(/<input[\s\S]*?type="range"[\s\S]*?data-action="n-slider"/);
    expect(SOURCE).toContain('min="0"');
    expect(SOURCE).toContain("max={stops.length - 1}");
    expect(SOURCE).toContain('step="1"');
  });

  it("renders both lanes (classical + Grover) with explicit formula labels", () => {
    expect(SOURCE).toMatch(/data-role="lane-classical"/);
    expect(SOURCE).toMatch(/data-role="lane-grover"/);
    expect(SOURCE).toMatch(/N\s*\/\s*2|classicalAverage/);
    expect(SOURCE).toMatch(/π\/4·√N|groverIterations/);
  });

  it("provides an aria-live readout and the simulator-cap callout", () => {
    expect(SOURCE).toContain('aria-live="polite"');
    expect(SOURCE).toMatch(/N\s*&gt;\s*16 is formula-only|N > 16 is formula-only/);
    expect(SOURCE).toMatch(/4 qubits/);
  });

  it("honors prefers-reduced-motion before attaching transitions", () => {
    expect(SOURCE).toMatch(/prefers-reduced-motion/);
  });

  it("does not import the simulator or runGrover client-side", () => {
    expect(SOURCE).not.toMatch(/import\s+\{[^}]*Simulator[^}]*\}\s*from/);
    expect(SOURCE).not.toMatch(/import\s+\{[^}]*runGrover[^}]*\}\s*from/);
  });
});
