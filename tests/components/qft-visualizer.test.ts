/**
 * QFTVisualizer structural smoke test.
 *
 * The widget is a frontmatter-precomputed bar-chart shell — no
 * simulator coupling at runtime. We can't render the .astro shell in
 * vitest, so we grep the file for the structural anchors that the
 * /shor essay depends on:
 *
 *   1. `data-widget="qft-visualizer"` mount selector exists.
 *   2. Required presets are listed (|0000⟩, |0001⟩, |0011⟩, |0101⟩,
 *      plus the period-4 comb preset locked in PLAN.md D-07).
 *   3. A "Custom" mode reveals a 16-amplitude editor.
 *   4. Both chart panels (input + output) are present with stable
 *      data-role attributes.
 *   5. The aria-live readout exists for screen-reader updates.
 *   6. The 16-bin Custom editor is rendered at SSR.
 *   7. No simulator import in the client `<script>` — only the
 *      module's frontmatter is allowed to import qft.ts.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const SRC = readFileSync(
  resolve(__dirname, "../../src/components/QFTVisualizer.astro"),
  "utf8",
);

describe("QFTVisualizer.astro structural contract", () => {
  it("declares the canonical widget mount selector", () => {
    expect(SRC).toContain('data-widget="qft-visualizer"');
  });

  it("ships the 4-qubit cap on the figure shell", () => {
    expect(SRC).toMatch(/const QUBITS = 4;/);
    expect(SRC).toMatch(/data-qubits=\{QUBITS\}/);
  });

  it("exposes the locked preset list (|0000⟩, |0001⟩, |0011⟩, |0101⟩, period-4 comb)", () => {
    expect(SRC).toContain('id: "ket-0000"');
    expect(SRC).toContain('id: "ket-0001"');
    expect(SRC).toContain('id: "ket-0011"');
    expect(SRC).toContain('id: "ket-0101"');
    expect(SRC).toContain('id: "period-4"');
  });

  it("includes a Custom option and a 16-amplitude editor scaffold", () => {
    expect(SRC).toContain('value="custom"');
    expect(SRC).toContain('data-role="custom-editor"');
    expect(SRC).toContain('data-action="custom-amp"');
    // 16 inputs are rendered via LABELS.map — assert the map exists.
    expect(SRC).toMatch(/LABELS\.map/);
  });

  it("renders input + output probability bar panels with stable data-roles", () => {
    expect(SRC).toContain('data-role="chart-input"');
    expect(SRC).toContain('data-role="chart-output"');
    expect(SRC).toContain("Input probabilities");
    expect(SRC).toContain("After QFT");
  });

  it("exposes an aria-live readout for screen-reader updates", () => {
    expect(SRC).toContain('aria-live="polite"');
    expect(SRC).toContain('data-role="readout"');
  });

  it("computes preset snapshots at frontmatter time (not in the client)", () => {
    // Frontmatter must import the qft helpers; the inline <script> must
    // not pull in the simulator/qft module.
    expect(SRC).toContain("../lib/quantum/qft");
    // Inline client script section: the substring after `<script>` should
    // not re-import the qft module under any path.
    const scriptStart = SRC.indexOf("<script>");
    expect(scriptStart).toBeGreaterThan(-1);
    const clientScript = SRC.slice(scriptStart);
    expect(clientScript).not.toMatch(/from\s+["'][^"']*qft["']/);
    expect(clientScript).not.toMatch(/from\s+["'][^"']*simulator["']/);
  });

  it("uses the existing probability-bars visual language (no new chart primitive)", () => {
    // Mirrors the surface posture of ProbabilityBars / AmplitudeBars:
    // border-line + bg-surface-elevated/40 + p-5.
    expect(SRC).toContain("border-line");
    expect(SRC).toContain("bg-surface-elevated");
    expect(SRC).toContain("rounded-lg");
  });

  it("normalizes Custom amplitudes before the DFT (no NaN bars)", () => {
    expect(SRC).toContain("customDFT");
    // The Custom path must guard against zero / non-finite norm by
    // falling back to a uniform real state instead of dividing by zero.
    expect(SRC).toMatch(/sumSq\s*<=\s*0/);
    expect(SRC).toMatch(/uniform/i);
  });
});
