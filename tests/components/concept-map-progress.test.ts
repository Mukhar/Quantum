/**
 * ConceptMap visited-state hydrator — structural contract (PROG-01).
 *
 * We don't render the Astro component in vitest; instead we grep the
 * source for the structural anchors the planner pinned in
 * `.planning/phases/06-vqe/PLAN.md` § 06-06:
 *
 *   1. References the progress helper (import or markup hook).
 *   2. Marks visited nodes with `data-visited` AND imports `getVisited`.
 *   3. Updates `aria-label` for visited state announcement (D-34 —
 *      brightness alone is not accessible).
 *   4. The mobile <ol> fallback gets the same treatment via a single
 *      `a[href]` query that catches both surfaces, OR explicit
 *      `svg a` + `ol a` queries.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const SRC = readFileSync(
  resolve(__dirname, "../../src/components/ConceptMap.astro"),
  "utf8",
);

describe("ConceptMap.astro — visited-state hydrator structural contract", () => {
  it("references the progress runtime (import path or marker)", () => {
    expect(SRC).toMatch(/from\s+["']\.\.\/lib\/progress["']/);
    expect(SRC).toContain("progress");
  });

  it("imports getVisited AND emits data-visited markup", () => {
    expect(SRC).toMatch(/import\s*\{[^}]*getVisited[^}]*\}\s*from/);
    expect(SRC).toContain("data-visited");
  });

  it("updates aria-label so screen readers announce visited state (D-34)", () => {
    expect(SRC).toContain("aria-label");
    // The hydrator must touch the aria-label of visited nodes, not
    // just set data-visited (brightness alone is not accessible).
    // Accepts either a JSX-attribute literal (aria-label="… visited")
    // or a setAttribute("aria-label", `… (visited)`) call shape.
    expect(SRC).toMatch(
      /aria-label[\s\S]{0,120}?["'`][^"'`]*\(visited\)/i,
    );
  });

  it("hydrator catches BOTH the SVG anchors AND the mobile <ol> fallback", () => {
    // Either a single querySelectorAll('a[href]') inside the nav
    // (which naturally captures both surfaces), or two explicit
    // queries (svg a + ol a) — both are acceptable per the plan.
    const singleQuery = /querySelectorAll\([^)]*a\[href\][^)]*\)/.test(SRC);
    const explicitSvgQuery =
      /querySelectorAll\([^)]*svg\s+a[^)]*\)/.test(SRC) &&
      /querySelectorAll\([^)]*ol\s+a[^)]*\)/.test(SRC);
    expect(singleQuery || explicitSvgQuery).toBe(true);
  });

  it("uses brightness via semantic accent tokens, not a checkmark badge (D-34)", () => {
    // CSS must lean on existing accent vars and avoid a "✓" / "check" badge.
    expect(SRC).toMatch(/data-visited[^{]*\{[\s\S]*--color-accent/);
    expect(SRC).not.toMatch(/✓|✔|checkmark/i);
  });
});
