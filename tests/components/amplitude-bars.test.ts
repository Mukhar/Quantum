/**
 * AmplitudeBars — structural source assertions (we can't render Astro
 * in vitest, but we can pin the contract the page + spec depend on).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SOURCE = readFileSync(
  fileURLToPath(new URL("../../src/components/AmplitudeBars.astro", import.meta.url)),
  "utf8",
);

describe("AmplitudeBars — widget contract", () => {
  it("declares the widget selector and Grover data attributes", () => {
    expect(SOURCE).toContain('data-widget="amplitude-bars"');
    expect(SOURCE).toContain("data-qubits={qubits}");
    expect(SOURCE).toContain("data-marked-index={markedIndex}");
    expect(SOURCE).toContain("data-snapshots-by-marked={JSON.stringify(snapshotsByMarked)}");
  });

  it("exposes a marked-state <select> populated from basis labels", () => {
    expect(SOURCE).toMatch(/<select[^>]*data-action="marked"/);
    expect(SOURCE).toContain("basisOptions.map");
  });

  it("exposes a numeric iteration override input clamped to a cap", () => {
  expect(SOURCE).toMatch(/<input[\s\S]*?type="number"[\s\S]*?data-action="override"/);
    expect(SOURCE).toContain('max={cap}');
  });

  it("renders Prev / Next / Reset buttons", () => {
    expect(SOURCE).toMatch(/data-action="prev"/);
    expect(SOURCE).toMatch(/data-action="next"/);
    expect(SOURCE).toMatch(/data-action="reset"/);
  });

  it("includes a k / k_opt indicator", () => {
    expect(SOURCE).toContain('data-role="k-current"');
    expect(SOURCE).toContain('data-role="k-opt"');
    expect(SOURCE).toMatch(/k_opt/);
  });

  it("provides an aria-live readout for accessibility", () => {
    expect(SOURCE).toContain('aria-live="polite"');
  });

  it("honors prefers-reduced-motion before attaching CSS transitions", () => {
    expect(SOURCE).toMatch(/prefers-reduced-motion/);
    expect(SOURCE).toMatch(/reduceMotion/);
  });

  it("draws a zero axis line so negative bars hang below it", () => {
    expect(SOURCE).toMatch(/Zero axis/);
    // The negative branch sets y to ZERO_Y (below the axis line).
    expect(SOURCE).toMatch(/isNegative\s*\?\s*ZERO_Y/);
  });

  it("does not reuse ProtocolStepper or import the simulator client-side", () => {
    expect(SOURCE).not.toMatch(/ProtocolStepper/);
    expect(SOURCE).not.toMatch(/import\s+\{[^}]*Simulator[^}]*\}\s*from/);
    expect(SOURCE).not.toMatch(/import\s+\{[^}]*runGrover[^}]*\}\s*from/);
  });

  it("highlights the marked state with a non-color-only cue (stroke + weight)", () => {
    expect(SOURCE).toMatch(/setAttribute\("stroke"/);
    expect(SOURCE).toMatch(/font-weight/);
  });
});
