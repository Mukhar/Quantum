/**
 * LargeCircuitView — static renderer for the N=15 Shor diagram.
 *
 * Vitest can't render Astro, so the wiring tests read the .astro
 * source and assert presence/absence of key markup. Behavioural
 * correctness of `toQiskitShor15` is owned by tests/quantum/shor.test.ts.
 *
 * Three suites:
 *   1. Isolation — proves the large path does NOT touch the sandbox
 *      codec or sandbox-link affordances (plan-05b-02 acceptance).
 *   2. Qiskit CTA — proves the data-action button + data-qiskit
 *      attribute + click hydrator are present and prominent.
 *   3. Block structure — proves the renderer maps the four logical
 *      Shor blocks (init / modexp / iqft / measure) to the diagram.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { buildShor15, toQiskitShor15 } from "../../src/lib/quantum";

const RAW_SOURCE = readFileSync(
  fileURLToPath(new URL("../../src/components/LargeCircuitView.astro", import.meta.url)),
  "utf8",
);
/**
 * Strip `/* ... *​/` block comments and `// ...` line comments so isolation
 * assertions look at runnable code, not explanatory prose that mentions
 * the very things we're forbidding (encodeCircuit, toQiskit, sandbox link).
 */
const SOURCE = RAW_SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

describe("LargeCircuitView — isolation from sandbox IR", () => {
  it("does NOT import encodeCircuit (sandbox URL codec)", () => {
    expect(SOURCE).not.toMatch(/\bencodeCircuit\b/);
  });

  it("does NOT import or call toQiskit (sandbox ≤4-qubit exporter)", () => {
    // It must use toQiskitShor15 instead.
    expect(SOURCE).toMatch(/\btoQiskitShor15\b/);
    // The bare `toQiskit(` token must not appear — only `toQiskitShor15(`.
    const stripped = SOURCE.replace(/toQiskitShor15/g, "");
    expect(stripped).not.toMatch(/\btoQiskit\s*\(/);
  });

  it("does NOT render a 'Remix in sandbox' link for Shor N=15 (D-15)", () => {
    expect(SOURCE).not.toMatch(/Remix in sandbox/i);
    expect(SOURCE).not.toMatch(/\/sandbox#\$\{/);
  });

  it("imports ShorStaticCircuit + StaticCircuitOp types from the quantum barrel", () => {
    expect(SOURCE).toMatch(
      /import\s*\{[^}]*toQiskitShor15[^}]*\}\s*from\s*["']\.\.\/lib\/quantum["']/,
    );
    expect(SOURCE).toMatch(/type\s+ShorStaticCircuit/);
    expect(SOURCE).toMatch(/type\s+StaticCircuitOp/);
  });
});

describe("LargeCircuitView — prominent Qiskit CTA", () => {
  it("ships a button with data-action='copy-shor-qiskit' (distinct from CircuitView)", () => {
    expect(SOURCE).toContain('data-action="copy-shor-qiskit"');
  });

  it("bakes the Qiskit snippet at SSR via data-qiskit={qiskitText}", () => {
    expect(SOURCE).toContain("data-qiskit={qiskitText}");
    expect(SOURCE).toMatch(/const\s+qiskitText\s*=\s*toQiskitShor15\(circuit\)/);
  });

  it("button label mentions Shor N=15 prominently", () => {
    expect(SOURCE).toMatch(/Copy Shor N=15 Qiskit/);
  });

  it("ships a click hydrator that writes data-qiskit to clipboard", () => {
    expect(SOURCE).toMatch(/navigator\.clipboard\.writeText/);
    expect(SOURCE).toMatch(/dataset\.action\s*!==\s*["']copy-shor-qiskit["']/);
  });

  it("ships the locked framing line 'build the engine here; now run the real thing'", () => {
    expect(SOURCE).toMatch(/built the engine here.*run the real thing/i);
  });
});

describe("LargeCircuitView — block & accessibility structure", () => {
  it("maps each Shor block to a <rect> band with stroke-dasharray", () => {
    // The renderer outlines block bands behind the cells.
    expect(SOURCE).toMatch(/blockBands\.map/);
    expect(SOURCE).toMatch(/stroke-dasharray="3 3"/);
  });

  it("renders a per-block legend below the diagram", () => {
    expect(SOURCE).toMatch(/circuit\.blocks\.map/);
    expect(SOURCE).toMatch(/b\.caption/);
  });

  it("wraps the SVG in an overflow-x-auto region with an aria-label affordance", () => {
    expect(SOURCE).toMatch(/overflow-x-auto/);
    expect(SOURCE).toMatch(/role="region"/);
    expect(SOURCE).toMatch(/aria-label="Scrollable circuit diagram/);
    expect(SOURCE).toMatch(/tabindex="0"/);
  });

  it("labels the SVG with a screen-reader-friendly aria-label", () => {
    expect(SOURCE).toMatch(/Static Shor circuit diagram/);
  });

  it("highlights counting vs work registers with distinct colors", () => {
    expect(SOURCE).toMatch(/countingQubits/);
    // sky-200 for counting, orange-200 for work register
    expect(SOURCE).toMatch(/rgb\(186 230 253\)/);
    expect(SOURCE).toMatch(/rgb\(254 215 170\)/);
  });
});

describe("LargeCircuitView — Qiskit snippet consumed at SSR matches the helper", () => {
  it("toQiskitShor15(buildShor15()) is what the component bakes", () => {
    // This is just a cross-check that the helper the component imports
    // is the same function exercised by tests/quantum/shor.test.ts.
    const out = toQiskitShor15(buildShor15());
    expect(out).toMatch(/from qiskit\.circuit\.library import QFT/);
    expect(out).toMatch(/QFT\(4, do_swaps=True\)\.inverse\(\)/);
    expect(out).toMatch(/a=7/);
    expect(out).toMatch(/N=15/);
  });
});
