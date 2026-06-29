/**
 * Gallery thumbnail — render a `Circuit` to a tiny SVG string.
 *
 * Pure string concat — no DOM, no canvas, runs in node. The output
 * is intended to be inlined (200×80) inside gallery cards and is
 * small enough that 100 entries × ~3 KB ≈ 300 KB total payload.
 *
 * Colour palette tracks the same gate-family encoding as
 * `CircuitView.astro`. Strokes use semantic CSS vars so the
 * thumbnail re-paints on theme toggle (the SVG is inlined into the
 * page DOM, so CSS cascade applies).
 */
import type { Circuit, Op } from "../quantum/circuit";

const W = 200;
const H = 80;
const PAD_X = 8;
const PAD_Y = 12;

interface CellStyle {
  fill: string;
  label: string;
}

function styleForOp(op: Op): CellStyle {
  switch (op.kind) {
    case "gate":
      if (op.gate === "H") return { fill: "rgb(99 102 241)", label: "H" };       // indigo-500
      if (op.gate === "X" || op.gate === "Y" || op.gate === "Z")
        return { fill: "rgb(71 85 105)", label: op.gate };                       // slate-600
      if (op.gate === "I") return { fill: "rgb(100 116 139)", label: "I" };     // slate-500
      return { fill: "rgb(139 92 246)", label: op.gate };                        // violet-500 (S/T)
    case "rot":     return { fill: "rgb(20 184 166)", label: `R${op.axis.toLowerCase()}` };  // teal-500
    case "measure": return { fill: "rgb(217 119 6)", label: "M" };               // amber-600
    case "cnot":    return { fill: "rgb(244 114 182)", label: "•" };             // pink-400
  }
}

/**
 * Render `circuit` to an inline SVG string sized 200×80. Empty
 * circuits return a placeholder grid.
 */
export function circuitToThumbnailSvg(circuit: Circuit): string {
  const qubits = Math.max(1, Math.min(4, circuit.qubits));
  const stepCount = Math.max(1, circuit.steps.length);

  const usableW = W - PAD_X * 2;
  const usableH = H - PAD_Y * 2;
  const rowH = usableH / qubits;
  const colW = usableW / stepCount;
  const cellSize = Math.min(rowH, colW) * 0.7;
  // Cap cell size so dense circuits don't overflow
  const sz = Math.max(4, Math.min(16, cellSize));

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Circuit thumbnail">`,
  );

  // Background panel
  parts.push(
    `<rect x="0" y="0" width="${W}" height="${H}" rx="6" style="fill: rgb(var(--color-surface-sunken))" />`,
  );

  // Horizontal qubit lines
  for (let q = 0; q < qubits; q++) {
    const y = PAD_Y + rowH * (q + 0.5);
    parts.push(
      `<line x1="${PAD_X}" y1="${y.toFixed(2)}" x2="${W - PAD_X}" y2="${y.toFixed(2)}" style="stroke: rgb(var(--color-line))" stroke-width="1" />`,
    );
  }

  // Op cells
  for (let t = 0; t < circuit.steps.length; t++) {
    const xCenter = PAD_X + colW * (t + 0.5);
    const ops = circuit.steps[t];
    for (const op of ops) {
      if (op.kind === "cnot") {
        const yC = PAD_Y + rowH * (op.control + 0.5);
        const yT = PAD_Y + rowH * (op.target + 0.5);
        // connector
        parts.push(
          `<line x1="${xCenter.toFixed(2)}" y1="${yC.toFixed(2)}" x2="${xCenter.toFixed(2)}" y2="${yT.toFixed(2)}" stroke="rgb(244 114 182)" stroke-width="1.5" />`,
        );
        // control dot
        parts.push(
          `<circle cx="${xCenter.toFixed(2)}" cy="${yC.toFixed(2)}" r="2.5" fill="rgb(244 114 182)" />`,
        );
        // target ring
        parts.push(
          `<circle cx="${xCenter.toFixed(2)}" cy="${yT.toFixed(2)}" r="4" fill="none" stroke="rgb(244 114 182)" stroke-width="1.5" />`,
        );
        continue;
      }
      const qubitIdx = op.kind === "gate" || op.kind === "rot" || op.kind === "measure" ? op.qubit : 0;
      const y = PAD_Y + rowH * (qubitIdx + 0.5);
      const { fill, label } = styleForOp(op);
      parts.push(
        `<rect x="${(xCenter - sz / 2).toFixed(2)}" y="${(y - sz / 2).toFixed(2)}" width="${sz.toFixed(2)}" height="${sz.toFixed(2)}" rx="2" fill="${fill}" />`,
      );
      if (sz >= 10) {
        parts.push(
          `<text x="${xCenter.toFixed(2)}" y="${(y + sz / 4).toFixed(2)}" font-size="${(sz * 0.6).toFixed(2)}" font-family="ui-monospace, monospace" text-anchor="middle" fill="white">${label}</text>`,
        );
      }
    }
  }

  parts.push("</svg>");
  return parts.join("");
}

/** Approx byte size for sanity checking. */
export function thumbnailByteSize(svg: string): number {
  // Each char ≈ 1 byte in ASCII subset we emit
  return svg.length;
}
