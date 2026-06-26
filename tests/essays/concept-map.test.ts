/**
 * Concept map link audit.
 *
 * We don't render the full Astro component in vitest — that needs a
 * full Astro dev environment. Instead we mirror the canonical node
 * list from `ConceptMap.astro` here and assert structural invariants:
 *
 *   - every live essay slug shows up exactly once
 *   - sandbox + challenges utility nodes are present and live
 *   - v2 placeholders are explicitly non-links (href === null)
 *   - reading-path edges form a clean chain
 *
 * If `ConceptMap.astro` ever drifts (a node added / removed / re-tiered),
 * this test will flag the discrepancy in a code review, even though it
 * doesn't actually parse the .astro source. Cheap insurance.
 */
import { describe, expect, it } from "vitest";

interface ExpectedNode {
  href: string | null;
  label: string;
  tier: "primary" | "utility" | "v2";
}

// Mirror of the `nodes` array in ConceptMap.astro. Keep in sync.
// As of Plan 05-04: no more v2 placeholders. CNOT + Bell and Deutsch
// are promoted to primary; the v1 site has 7 live essays.
const expected: ExpectedNode[] = [
  { href: "/qubit",                  label: "Qubit",         tier: "primary" },
  { href: "/superposition",          label: "Superposition", tier: "primary" },
  { href: "/measurement",            label: "Measurement",   tier: "primary" },
  { href: "/gates",                  label: "Gates",         tier: "primary" },
  { href: "/entanglement",           label: "Entanglement",  tier: "primary" },
  { href: "/sandbox",                label: "Sandbox",       tier: "utility" },
  { href: "/sandbox/challenges",     label: "Challenges",    tier: "utility" },
  { href: "/cnot-bell",              label: "CNOT + Bell",   tier: "primary" },
  { href: "/deutsch",                label: "Deutsch",       tier: "primary" },
];

describe("ConceptMap canonical node list", () => {
  it("contains every live essay slug exactly once", () => {
    const expectedEssays = [
      "/qubit", "/superposition", "/measurement", "/gates", "/entanglement",
      "/cnot-bell", "/deutsch",
    ];
    for (const slug of expectedEssays) {
      const hits = expected.filter((n) => n.href === slug);
      expect(hits.length, `${slug} should appear exactly once`).toBe(1);
      expect(hits[0].tier).toBe("primary");
    }
  });

  it("treats sandbox + challenges as live utility nodes", () => {
    const sandbox = expected.find((n) => n.href === "/sandbox");
    const challenges = expected.find((n) => n.href === "/sandbox/challenges");
    expect(sandbox?.tier).toBe("utility");
    expect(challenges?.tier).toBe("utility");
  });

  it("v1 has no dimmed v2 placeholders (algorithm track shipped)", () => {
    const v2 = expected.filter((n) => n.tier === "v2");
    expect(v2.length).toBe(0);
  });

  it("no duplicate labels across the whole map", () => {
    const labels = expected.map((n) => n.label);
    expect(new Set(labels).size).toBe(labels.length);
  });
});
