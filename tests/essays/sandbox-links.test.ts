/**
 * Round-trip every Phase-4 essay's "Open in sandbox →" starter circuit.
 *
 * Why mirror the starters here instead of importing them from the
 * `.astro` pages? Astro components aren't directly importable into
 * vitest without a full Astro environment. The starters live in essay
 * frontmatter; copying them here is the same trade-off we made in
 * `concept-map.test.ts`: a tiny duplication in exchange for a strict
 * structural assertion that fails loudly in CI if anything drifts.
 *
 * Each starter is asserted against three invariants:
 *   1. `encodeCircuit` succeeds (no validation throw).
 *   2. `decodeCircuit` round-trips back to a structurally identical
 *      circuit (qubits + op-by-op equality; θ values come back
 *      quantized to 10 bits, so we compare with a tolerance).
 *   3. The encoded fragment fits comfortably in a URL — well below
 *      the documented 2 KB cap.
 *
 * If a sub-agent's essay changes its starter circuit, the test
 * here MUST be updated to match. That's a feature: CI flags the
 * mismatch and we re-confirm intent.
 */
import { describe, expect, it } from "vitest";
import {
  encodeCircuit,
  decodeCircuit,
  gateOp,
  cnotOp,
  rotOp,
  measureOp,
  teleportationCircuit,
  buildGroverCircuit,
  type Circuit,
  type Op,
} from "../../src/lib/quantum";

// Mirrors of every essay's `STARTER` (or `bellStarter`/`DEUTSCH_F2_CIRCUIT`)
// constant. Keep in sync with src/pages/{superposition,measurement,gates,
// entanglement,cnot-bell,deutsch,teleportation,grover}.astro
const STARTERS: Record<string, Circuit> = {
  superposition: {
    qubits: 1,
    steps: [[gateOp("H", 0)]],
  },
  measurement: {
    qubits: 1,
    steps: [[gateOp("H", 0)], [measureOp(0)]],
  },
  gates: {
    qubits: 1,
    steps: [
      [rotOp("X", 0, Math.PI / 3)],
      [rotOp("Y", 0, Math.PI / 4)],
    ],
  },
  entanglement: {
    qubits: 2,
    steps: [[gateOp("H", 0)], [cnotOp(0, 1)]],
  },
  "cnot-bell": {
    qubits: 2,
    steps: [[gateOp("H", 0)], [cnotOp(0, 1)]],
  },
  deutsch: {
    qubits: 2,
    steps: [
      [gateOp("X", 1)],
      [gateOp("H", 0), gateOp("H", 1)],
      [cnotOp(0, 1)],
      [gateOp("H", 0)],
      [measureOp(0)],
    ],
  },
  // Imported from src/lib/quantum so any future change to the canonical
  // deferred-measurement circuit propagates here automatically — the
  // essay and this mirror share one source of truth.
  teleportation: teleportationCircuit(),
  // Plan 04 Grover starter: 2-qubit, marked |11⟩, one iteration.
  // Same `buildGroverCircuit(4, 3, 1)` constant used by /grover.astro's
  // demoCircuit so they share a single source of truth.
  grover: buildGroverCircuit(4, 3, 1),
};

const THETA_QUANTUM = (Math.PI * 2) / 1024; // 10-bit codec resolution

function opsApproxEqual(a: Op, b: Op): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "gate" && b.kind === "gate") {
    return a.gate === b.gate && a.qubit === b.qubit;
  }
  if (a.kind === "cnot" && b.kind === "cnot") {
    return a.control === b.control && a.target === b.target;
  }
  if (a.kind === "measure" && b.kind === "measure") {
    return a.qubit === b.qubit;
  }
  if (a.kind === "rot" && b.kind === "rot") {
    return (
      a.axis === b.axis &&
      a.qubit === b.qubit &&
      Math.abs(a.theta - b.theta) <= THETA_QUANTUM
    );
  }
  return false;
}

describe("Phase-4 essay sandbox-link starter circuits", () => {
  for (const [slug, circuit] of Object.entries(STARTERS)) {
    describe(`/${slug}`, () => {
      it("encodes without throwing", () => {
        expect(() => encodeCircuit(circuit)).not.toThrow();
      });

      it("round-trips through encode → decode with matching ops", () => {
        const fragment = encodeCircuit(circuit);
        const restored = decodeCircuit(fragment);
        expect(restored.qubits).toBe(circuit.qubits);
        expect(restored.steps.length).toBe(circuit.steps.length);
        for (let t = 0; t < circuit.steps.length; t++) {
          const before = circuit.steps[t];
          const after = restored.steps[t];
          expect(after.length, `step ${t} op count`).toBe(before.length);
          for (let i = 0; i < before.length; i++) {
            expect(
              opsApproxEqual(before[i], after[i]),
              `step ${t} op ${i}: ${JSON.stringify(before[i])} ≠ ${JSON.stringify(after[i])}`,
            ).toBe(true);
          }
        }
      });

      it("produces a URL fragment shorter than 100 chars (well below 2 KB cap)", () => {
        const fragment = encodeCircuit(circuit);
        expect(fragment.length).toBeLessThan(100);
      });
    });
  }
});
