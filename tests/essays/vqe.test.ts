/**
 * /vqe structural source assertions — Phase 6 Plan 06-05.
 *
 * We can't render Astro in vitest, so we grep the essay source for
 * the structural anchors the plan's `<tests>` section calls out.
 * Mirrors the existing `tests/essays/*.test.ts` pattern.
 *
 * Pinned by PLAN.md `### 06-05`:
 *   1. `src/pages/vqe.astro` exists.
 *   2. Frontmatter imports of EssayLayout + EnergyLandscape +
 *      MoleculeGallery + CircuitView + MathBlock + MathNerds.
 *   3. EnergyLandscape and MoleculeGallery embeds.
 *   4. Footer-nav prev `/shor` and next `/sandbox`.
 *   5. No-hype reality-check framing — at least one of the
 *      sourced phrases ("near-term", "active research", "HF",
 *      "CCSD").
 *   6. No D-30 hype tokens
 *      ("VQE will discover drugs" / "breaks classical chemistry").
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SOURCE_URL = new URL("../../src/pages/vqe.astro", import.meta.url);
const SOURCE_PATH = fileURLToPath(SOURCE_URL);

describe("/vqe essay — structural contract (Plan 06-05)", () => {
  it("src/pages/vqe.astro exists on disk", () => {
    expect(existsSync(SOURCE_PATH), `expected ${SOURCE_PATH} to exist`).toBe(
      true,
    );
  });

  const SOURCE = readFileSync(SOURCE_PATH, "utf8");

  it("imports the EssayLayout shell and every Phase-6 widget the plan locks", () => {
    expect(SOURCE).toMatch(/from\s+["']\.\.\/layouts\/EssayLayout\.astro["']/);
    expect(SOURCE).toMatch(
      /from\s+["']\.\.\/components\/EnergyLandscape\.astro["']/,
    );
    expect(SOURCE).toMatch(
      /from\s+["']\.\.\/components\/MoleculeGallery\.astro["']/,
    );
    expect(SOURCE).toMatch(/from\s+["']\.\.\/components\/CircuitView\.astro["']/);
    expect(SOURCE).toMatch(/from\s+["']\.\.\/components\/MathNerds\.astro["']/);
    expect(SOURCE).toMatch(/from\s+["']\.\.\/components\/MathBlock\.astro["']/);
  });

  it("embeds both the EnergyLandscape and MoleculeGallery widgets in the body", () => {
    expect(SOURCE).toMatch(/<EnergyLandscape\b/);
    expect(SOURCE).toMatch(/<MoleculeGallery\b/);
  });

  it("builds the ansatz Circuit from DEFAULT_INITIAL_THETAS so the static snapshot matches the landscape default (D-18)", () => {
    expect(SOURCE).toMatch(/\bDEFAULT_INITIAL_THETAS\b/);
    expect(SOURCE).toMatch(/\brotOp\b/);
    expect(SOURCE).toMatch(/\bcnotOp\b/);
  });

  it("carries the slim VQE-local theta readout (D-19) bound to the EnergyLandscape event", () => {
    expect(SOURCE).toContain('data-role="ansatz-readout"');
    expect(SOURCE).toContain('aria-live="polite"');
    expect(SOURCE).toMatch(/vqe:thetachange/);
  });

  it("footer-nav points prev /shor and next /sandbox", () => {
    expect(SOURCE).toContain('href="/shor"');
    expect(SOURCE).toContain('href="/sandbox"');
  });

  it("frames VQE without hype — sourced reality-check vocabulary present (D-27, D-30)", () => {
    // At least one of the no-hype anchor phrases the plan pins.
    expect(SOURCE).toMatch(/near-term|active research|\bHF\b|CCSD/);
  });

  it("does NOT carry the D-30 forbidden hype tokens", () => {
    expect(SOURCE).not.toContain("VQE will discover drugs");
    expect(SOURCE).not.toContain("breaks classical chemistry");
  });
});
