/**
 * HolevoBound structural smoke test.
 *
 * Pure formula widget — no simulator coupling. We can't render the
 * .astro shell in vitest, so we grep the file for the required
 * structural anchors and the locked copy invariants:
 *
 *   1. `data-widget="holevo-bound"` mount selector exists.
 *   2. The slider has min=1, max=4, step=1 (locked v3 range).
 *   3. Both readouts ("Without pre-shared entanglement: n" and
 *      "with superdense coding: at most 2n") are present.
 *   4. The visible copy never claims a gain larger than 2x.
 *   5. The SVG polylines for the n and 2n series are both emitted.
 *
 * Interactive behavior (slider input updates marker positions and
 * readouts) is exercised by the manual a11y close-out in 03-05.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const SRC = readFileSync(
  resolve(__dirname, "../../src/components/HolevoBound.astro"),
  "utf8",
);

describe("HolevoBound.astro structural contract", () => {
  it("declares the canonical widget mount selector", () => {
    expect(SRC).toContain('data-widget="holevo-bound"');
  });

  it("emits a single discrete slider over n=1..4 (locked v3 range)", () => {
    expect(SRC).toContain('data-role="n-slider"');
    expect(SRC).toContain('type="range"');
    expect(SRC).toContain("{N_MIN}");
    expect(SRC).toContain("{N_MAX}");
    // Locked constants present in frontmatter.
    expect(SRC).toMatch(/const N_MIN = 1;/);
    expect(SRC).toMatch(/const N_MAX = 4;/);
    expect(SRC).toMatch(/const Y_MAX = 8;/);
  });

  it("renders both readouts: no-entanglement (n) and superdense (2n)", () => {
    expect(SRC).toContain('data-role="holevo-bits"');
    expect(SRC).toContain('data-role="superdense-bits"');
    expect(SRC).toContain("Without pre-shared entanglement");
    expect(SRC).toContain("With superdense coding");
    expect(SRC).toMatch(/at most\s+<span data-role="superdense-bits">/);
  });

  it("copy never promises a gain larger than 2x", () => {
    // The widget must not suggest 3x, 4x, ..., or "unlimited" gains.
    // Locked acceptance from PLAN.md: "The widget never suggests a
    // gain larger than 2x."
    expect(SRC).not.toMatch(/\b3x\b/i);
    expect(SRC).not.toMatch(/\b4x\b/i);
    expect(SRC).not.toMatch(/unlimited bandwidth/i);
    expect(SRC).not.toMatch(/free capacity/i);
    // And it must explicitly mention the 2x / 2n ceiling.
    expect(SRC).toMatch(/2n/);
  });

  it("draws both the n (Holevo) and 2n (superdense) polylines", () => {
    expect(SRC).toContain("holevoLine");
    expect(SRC).toContain("superdenseLine");
    // Two <polyline> elements, one per series.
    const polylineMatches = SRC.match(/<polyline/g) ?? [];
    expect(polylineMatches.length).toBeGreaterThanOrEqual(2);
  });

  it("exposes active markers per series for slider-driven highlight", () => {
    expect(SRC).toContain('data-role="marker-holevo"');
    expect(SRC).toContain('data-role="marker-superdense"');
  });

  it("formula is the locked 2 * n (no fitted curve, no separate parameter)", () => {
    // The widget's classical-bits readout for superdense MUST be the
    // bare formula `2 * n` — anything else would silently drift the
    // pedagogy. Smoke check the readout binding.
    expect(SRC).toContain("String(2 * n)");
  });
});
