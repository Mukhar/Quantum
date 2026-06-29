/**
 * Quantum-network reachability — the pure-logic core behind
 * `src/components/QuantumNetwork.astro`'s "shared Bell pair" indicator.
 *
 * Given a set of edges (each tagged as entangled or not), check whether
 * two endpoint nodes are in the same connected component of the
 * **entangled-only** subgraph. Edges are undirected (entanglement is
 * symmetric — a Bell pair belongs to both ends equally).
 *
 * Pure data; no DOM. Lives here so vitest can exercise the algorithm
 * without an Astro runtime, and so a future v4 multi-hop network essay
 * can reuse the same connectivity primitive.
 */

export interface NetworkEdgeState {
  from: string;
  to: string;
  entangled: boolean;
}

/**
 * `true` iff `target` is reachable from `source` traversing only edges
 * with `entangled === true`. Treats the graph as undirected.
 *
 * Robust to:
 * - Self-loops (`from === to`) — skipped, never contribute connectivity.
 * - Duplicate edges — adjacency uses Sets, dedups automatically.
 * - Disconnected `source` (no entangled edges from it) — returns false.
 * - `source === target` — trivially true (a node always reaches itself).
 */
export const endpointsEntangled = (
  edges: readonly NetworkEdgeState[],
  source: string,
  target: string,
): boolean => {
  if (source === target) return true;

  // Build the adjacency map of the entangled-only subgraph.
  const adj = new Map<string, Set<string>>();
  const link = (a: string, b: string) => {
    let set = adj.get(a);
    if (!set) {
      set = new Set();
      adj.set(a, set);
    }
    set.add(b);
  };
  for (const e of edges) {
    if (!e.entangled) continue;
    if (e.from === e.to) continue;
    link(e.from, e.to);
    link(e.to, e.from);
  }

  // BFS from source.
  const visited = new Set<string>([source]);
  const queue: string[] = [source];
  while (queue.length > 0) {
    const node = queue.shift()!;
    const nbrs = adj.get(node);
    if (!nbrs) continue;
    for (const n of nbrs) {
      if (n === target) return true;
      if (!visited.has(n)) {
        visited.add(n);
        queue.push(n);
      }
    }
  }
  return false;
};
