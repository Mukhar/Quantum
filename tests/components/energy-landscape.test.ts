/**
 * EnergyLandscape — structural source assertions.
 *
 * We can't render Astro in vitest, so we grep the source for the
 * structural anchors the /vqe essay + PHASE-CONTEXT D-10..D-17 depend
 * on. Mirrors the existing components/*.test.ts pattern.
 *
 * Pinned by PLAN.md `### 06-03`:
 *   1. Mount + marker data-roles.
 *   2. Frontmatter imports of the vqe surface helpers + seeds + truth.
 *   3. `prefers-reduced-motion` check (D-16).
 *   4. Auto-descend + Reseed buttons (D-11, D-05).
 *   5. aria-live readout (D-15).
 *   6. interpolateSurface used for drag energy readouts.
 *   7. NO MAX_QUBITS / codec / qiskit imports (landscape is data-only).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SOURCE = readFileSync(
  fileURLToPath(
    new URL("../../src/components/EnergyLandscape.astro", import.meta.url),
  ),
  "utf8",
);

describe("EnergyLandscape — widget contract", () => {
  it("declares the canonical widget selector and marker data-role", () => {
    expect(SOURCE).toContain('data-widget="energy-landscape"');
    expect(SOURCE).toContain('data-role="marker"');
  });

  it("imports h2Energy / sampleSurface / RESEED_SEEDS / DEFAULT_INITIAL_THETAS from the quantum barrel (or vqe submodule)", () => {
    expect(SOURCE).toMatch(/from\s+["']\.\.\/lib\/quantum(?:\/vqe)?["']/);
    expect(SOURCE).toMatch(/\bh2Energy\b/);
    expect(SOURCE).toMatch(/\bsampleSurface\b/);
    expect(SOURCE).toMatch(/\bRESEED_SEEDS\b/);
    expect(SOURCE).toMatch(/\bDEFAULT_INITIAL_THETAS\b/);
  });

  it("honors prefers-reduced-motion via window.matchMedia (D-16)", () => {
    expect(SOURCE).toMatch(/prefers-reduced-motion/);
    expect(SOURCE).toMatch(/window\.matchMedia/);
    expect(SOURCE).toMatch(/reduceMotion/);
  });

  it("exposes both Auto-descend and Reseed actions (D-05, D-11)", () => {
    expect(SOURCE).toMatch(/data-action="auto-descend"/);
    expect(SOURCE).toMatch(/data-action="reseed"/);
  });

  it("renders an aria-live readout for screen-reader updates", () => {
    expect(SOURCE).toContain('aria-live="polite"');
    expect(SOURCE).toContain('data-role="readout"');
  });

  it("uses interpolateSurface for smooth drag energy readouts", () => {
    expect(SOURCE).toMatch(/\binterpolateSurface\b/);
  });

  it("does NOT import MAX_QUBITS or any sandbox codec / qiskit module", () => {
    expect(SOURCE).not.toMatch(/\bMAX_QUBITS\b/);
    expect(SOURCE).not.toMatch(/from\s+["'][^"']*\/codec["']/);
    expect(SOURCE).not.toMatch(/from\s+["'][^"']*\/qiskit["']/);
  });

  it("imports gradientDescent so Auto-descend animates the validated trajectory (D-11)", () => {
    // Auto-descend MUST animate the optimizer snapshots tests pin,
    // not a hand-rolled descent. Asserts the import path explicitly.
    expect(SOURCE).toMatch(/\bgradientDescent\b/);
  });

  it("renders the marker as a focusable role=slider with arrow-key/Home affordance (D-16)", () => {
    expect(SOURCE).toMatch(/role="slider"/);
    expect(SOURCE).toMatch(/tabindex="0"/);
    expect(SOURCE).toMatch(/aria-valuemin="0"/);
    expect(SOURCE).toMatch(/aria-valuemax=/);
    // Keyboard handling exists for both axes + Home.
    expect(SOURCE).toMatch(/ArrowLeft/);
    expect(SOURCE).toMatch(/ArrowRight/);
    expect(SOURCE).toMatch(/ArrowUp/);
    expect(SOURCE).toMatch(/ArrowDown/);
    expect(SOURCE).toMatch(/"Home"/);
  });

  it("bakes the surface at SSR (50×50 grid over [0, 2π]) — D-13", () => {
    expect(SOURCE).toMatch(/sampleSurface\s*\(\s*h2Energy\s*,\s*GRID\s*,\s*RANGE\s*\)/);
    expect(SOURCE).toMatch(/const\s+GRID\s*=\s*50/);
    expect(SOURCE).toMatch(/\[\s*0\s*,\s*2\s*\*\s*Math\.PI\s*\]/);
  });

  it("toggles aria-busy on Auto-descend during animation", () => {
    expect(SOURCE).toMatch(/aria-busy/);
  });

  it("uses the existing v3 widget aesthetic (border-line + bg-surface-elevated + rounded-lg)", () => {
    expect(SOURCE).toContain("border-line");
    expect(SOURCE).toContain("bg-surface-elevated");
    expect(SOURCE).toContain("rounded-lg");
  });

  it("dispatches a `vqe:thetachange` CustomEvent on theta updates so essay-local readouts can mirror state (D-19, Plan 06-05)", () => {
    // Pinned by Plan 06-05: the /vqe essay's slim ansatz-readout
    // listens for this event at `document` so EnergyLandscape stays
    // self-contained and CircuitView is never overloaded.
    expect(SOURCE).toMatch(/vqe:thetachange/);
    expect(SOURCE).toMatch(/new\s+CustomEvent/);
    expect(SOURCE).toMatch(/bubbles:\s*true/);
  });
});
