/**
 * QuantumNetwork reachability tests.
 *
 * The .astro shell is DOM + theme glue. The interesting bit is the
 * connected-component check that drives the "shared Bell pair"
 * indicator: given a list of entangled-or-not edges, is the target
 * reachable from the source via entangled-only edges (treated as
 * undirected)?
 *
 * Vitest runs in node — no DOM — so we exercise `endpointsEntangled`
 * directly. The DOM glue is verified at essay-acceptance time
 * (plan 02-05 manual smoke).
 */

import { describe, expect, it } from "vitest";
import {
  endpointsEntangled,
  type NetworkEdgeState,
} from "../../src/lib/quantum/network";

describe("endpointsEntangled — the teleportation 3-node case", () => {
  const teleNetwork = (
    aliceRepeater: boolean,
    repeaterBob: boolean,
  ): NetworkEdgeState[] => [
    { from: "alice", to: "repeater", entangled: aliceRepeater },
    { from: "repeater", to: "bob", entangled: repeaterBob },
  ];

  it("3 nodes, 0 entangled edges → A and B not connected", () => {
    expect(endpointsEntangled(teleNetwork(false, false), "alice", "bob")).toBe(false);
  });

  it("3 nodes, only A↔R entangled → A and B not connected", () => {
    expect(endpointsEntangled(teleNetwork(true, false), "alice", "bob")).toBe(false);
  });

  it("3 nodes, only R↔B entangled → A and B not connected", () => {
    expect(endpointsEntangled(teleNetwork(false, true), "alice", "bob")).toBe(false);
  });

  it("3 nodes, both edges entangled → A and B connected (through R)", () => {
    expect(endpointsEntangled(teleNetwork(true, true), "alice", "bob")).toBe(true);
  });
});

describe("endpointsEntangled — multi-hop (v4 preview)", () => {
  it("5 nodes in a line, all edges entangled → extremes connected", () => {
    const line: NetworkEdgeState[] = [
      { from: "n0", to: "n1", entangled: true },
      { from: "n1", to: "n2", entangled: true },
      { from: "n2", to: "n3", entangled: true },
      { from: "n3", to: "n4", entangled: true },
    ];
    expect(endpointsEntangled(line, "n0", "n4")).toBe(true);
  });

  it("5 nodes in a line, middle edge idle → chain breaks", () => {
    const line: NetworkEdgeState[] = [
      { from: "n0", to: "n1", entangled: true },
      { from: "n1", to: "n2", entangled: true },
      { from: "n2", to: "n3", entangled: false },
      { from: "n3", to: "n4", entangled: true },
    ];
    expect(endpointsEntangled(line, "n0", "n4")).toBe(false);
  });
});

describe("endpointsEntangled — edge cases", () => {
  it("self-loops do not crash and do not contribute connectivity", () => {
    const edges: NetworkEdgeState[] = [
      { from: "alice", to: "alice", entangled: true },
      { from: "alice", to: "bob", entangled: false },
    ];
    expect(endpointsEntangled(edges, "alice", "bob")).toBe(false);
  });

  it("duplicate edges do not crash and behave like a single edge", () => {
    const edges: NetworkEdgeState[] = [
      { from: "alice", to: "bob", entangled: true },
      { from: "alice", to: "bob", entangled: true },
      { from: "bob", to: "alice", entangled: true }, // reverse direction
    ];
    expect(endpointsEntangled(edges, "alice", "bob")).toBe(true);
  });

  it("source === target is trivially true (a node always reaches itself)", () => {
    expect(endpointsEntangled([], "alice", "alice")).toBe(true);
  });

  it("empty edge list → not connected when source ≠ target", () => {
    expect(endpointsEntangled([], "alice", "bob")).toBe(false);
  });

  it("treats edges as undirected — entangled('bob' → 'alice') connects ('alice' → 'bob')", () => {
    const edges: NetworkEdgeState[] = [
      { from: "bob", to: "alice", entangled: true },
    ];
    expect(endpointsEntangled(edges, "alice", "bob")).toBe(true);
  });

  it("does not return false-positive across an idle bridge", () => {
    // alice — (idle) — repeater — (entangled) — bob
    const edges: NetworkEdgeState[] = [
      { from: "alice", to: "repeater", entangled: false },
      { from: "repeater", to: "bob", entangled: true },
    ];
    expect(endpointsEntangled(edges, "alice", "bob")).toBe(false);
  });
});
