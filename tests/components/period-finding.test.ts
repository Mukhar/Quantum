/**
 * PeriodFinding structural smoke test.
 *
 * Like QFTVisualizer, we can't render Astro components inside vitest,
 * so we grep the source for the structural anchors the /shor essay
 * depends on:
 *
 *   1. `data-widget="period-finding"` mount selector.
 *   2. N and a inputs with correct bounds (N ≤ 15, a > 1, a < N).
 *   3. Period readout + status surface with aria-live.
 *   4. Sequence table with stable data-role hooks.
 *   5. QFT peak hint surface that toggles off for invalid / not-found.
 *   6. Invalid + not-found copy paths.
 *   7. Frontmatter imports qft.ts helpers; client script does not
 *      re-import them (math is duplicated inline so the widget ships
 *      with no client-side module imports).
 *   8. Canonical N = 15 examples are listed in-essay copy.
 *   9. 80 ms debounce on input.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const SRC = readFileSync(
  resolve(__dirname, "../../src/components/PeriodFinding.astro"),
  "utf8",
);

describe("PeriodFinding.astro structural contract", () => {
  it("declares the canonical widget mount selector", () => {
    expect(SRC).toContain('data-widget="period-finding"');
  });

  it("pins the 4-qubit QFT register width (Q = 16)", () => {
    expect(SRC).toMatch(/REGISTER_QUBITS\s*=\s*4/);
    expect(SRC).toMatch(/REGISTER_SIZE\s*=\s*1\s*<<\s*REGISTER_QUBITS/);
  });

  it("renders N and a controls with the locked bounds", () => {
    expect(SRC).toContain('data-action="set-n"');
    expect(SRC).toContain('data-action="set-a"');
    expect(SRC).toMatch(/N_MIN\s*=\s*2/);
    expect(SRC).toMatch(/N_MAX\s*=\s*15/);
    expect(SRC).toMatch(/A_MIN\s*=\s*2/);
  });

  it("renders an aria-live status surface with a readout slot", () => {
    expect(SRC).toContain('aria-live="polite"');
    expect(SRC).toContain('data-role="period-status"');
    expect(SRC).toContain('data-role="period-readout"');
  });

  it("renders the modular-arithmetic sequence table", () => {
    expect(SRC).toContain('data-role="sequence-table"');
    expect(SRC).toContain('data-role="sequence-rows"');
    // The header explains what the sequence is.
    expect(SRC).toMatch(/a<sup>x<\/sup>\s*mod\s*N/);
  });

  it("exposes a QFT peak hint surface that hides when no period is found", () => {
    expect(SRC).toContain('data-role="peak-wrap"');
    expect(SRC).toContain('data-role="peak-bins"');
    // The wrapper must gain `hidden` when result.kind !== "period".
    expect(SRC).toMatch(/peakWrap\.classList\.(add|remove)\(["']hidden["']\)/);
  });

  it("renders both invalid and not-found copy paths", () => {
    expect(SRC).toMatch(/No period found in this window/);
    // The frontmatter summarize() must handle the invalid kind explicitly.
    expect(SRC).toMatch(/r\.kind === "invalid"|kind === "invalid"|r\.reason/);
  });

  it("imports qft helpers at frontmatter only; client script duplicates the math", () => {
    expect(SRC).toContain("../lib/quantum/qft");
    const scriptStart = SRC.indexOf("<script>");
    expect(scriptStart).toBeGreaterThan(-1);
    const clientScript = SRC.slice(scriptStart);
    expect(clientScript).not.toMatch(/from\s+["'][^"']*qft["']/);
    expect(clientScript).not.toMatch(/from\s+["'][^"']*simulator["']/);
    // But the client must still have a period-finder function.
    expect(clientScript).toMatch(/function\s+findPeriod\s*\(/);
    expect(clientScript).toMatch(/function\s+peakHints\s*\(/);
  });

  it("lists the canonical N = 15 examples in-essay", () => {
    expect(SRC).toMatch(/a\s*=\s*2/);
    expect(SRC).toMatch(/a\s*=\s*7/);
    expect(SRC).toMatch(/a\s*=\s*11/);
    expect(SRC).toContain("Canonical N = 15 examples");
  });

  it("debounces input recompute (PLAN.md D-10)", () => {
    expect(SRC).toMatch(/setTimeout\(update,\s*80\)/);
  });
});
