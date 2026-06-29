/**
 * Thumbnail tests — assert SVG structure and size bounds. Pure
 * string output, runs in node, no DOM.
 */
import { describe, it, expect } from "vitest";
import { circuitToThumbnailSvg, thumbnailByteSize } from "../../src/lib/gallery/thumbnail";
import { emptyCircuit } from "../../src/lib/quantum/circuit";
import type { Circuit } from "../../src/lib/quantum/circuit";

describe("circuitToThumbnailSvg", () => {
  it("returns well-formed SVG markup", () => {
    const svg = circuitToThumbnailSvg(emptyCircuit(2));
    expect(svg).toMatch(/^<svg /);
    expect(svg).toMatch(/<\/svg>$/);
    expect(svg).toContain('viewBox="0 0 200 80"');
  });

  it("draws one horizontal line per qubit", () => {
    const svg1 = circuitToThumbnailSvg(emptyCircuit(1));
    const svg4 = circuitToThumbnailSvg(emptyCircuit(4));
    const count = (s: string) => (s.match(/<line /g) ?? []).length;
    expect(count(svg1)).toBe(1);
    expect(count(svg4)).toBe(4);
  });

  it("uses theme-aware CSS vars for chrome strokes", () => {
    const svg = circuitToThumbnailSvg(emptyCircuit(2));
    expect(svg).toContain("rgb(var(--color-line))");
    expect(svg).toContain("rgb(var(--color-surface-sunken))");
  });

  it("renders gate cells with categorical fills", () => {
    const c: Circuit = {
      qubits: 2,
      steps: [
        [{ kind: "gate", gate: "H", qubit: 0 }],
        [{ kind: "cnot", control: 0, target: 1 }],
        [{ kind: "measure", qubit: 0 }, { kind: "measure", qubit: 1 }],
      ],
    };
    const svg = circuitToThumbnailSvg(c);
    expect(svg).toContain("rgb(99 102 241)");  // H = indigo-500
    expect(svg).toContain("rgb(244 114 182)"); // cnot = pink-400
    expect(svg).toContain("rgb(217 119 6)");   // measure = amber-600
  });

  it("renders cnot as connector + control dot + target ring", () => {
    const c: Circuit = {
      qubits: 2,
      steps: [[{ kind: "cnot", control: 0, target: 1 }]],
    };
    const svg = circuitToThumbnailSvg(c);
    expect(svg).toContain("<circle"); // dot + ring
  });

  it("stays under 8 KB even for a dense circuit", () => {
    const c: Circuit = {
      qubits: 4,
      steps: Array.from({ length: 20 }, () => [
        { kind: "gate" as const, gate: "H" as const, qubit: 0 },
        { kind: "gate" as const, gate: "X" as const, qubit: 1 },
        { kind: "gate" as const, gate: "Y" as const, qubit: 2 },
        { kind: "gate" as const, gate: "Z" as const, qubit: 3 },
      ]),
    };
    const svg = circuitToThumbnailSvg(c);
    expect(thumbnailByteSize(svg)).toBeLessThan(8 * 1024);
  });

  it("handles empty steps array without throwing", () => {
    const c: Circuit = { qubits: 2, steps: [] };
    expect(() => circuitToThumbnailSvg(c)).not.toThrow();
  });
});
