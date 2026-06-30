# Plan 06-07 Summary — OPS audits

**Phase:** 6 (VQE + Chemistry + v3 launch)  
**Plan:** 06-07 — OPS audits  
**Completed:** 2026-06-30  
**Commits:** `93c4640` (audits)

## What shipped

Two markdown artefacts under `.planning/phases/06-vqe/`, capturing the
state of v3.0 *before* the final ceiling recompute (Plan 06-08).

- **`LIGHTHOUSE-PLAN.md`** (OPS-01, D-42). Manual-run recipe targeting
  all 24 v3 routes in both `prefers-color-scheme` light and dark.
  Mobile a11y ≥ 95 hard target. Per-route expected-score table with
  separate "v3 essay routes (new)" subsection. Pre-known a11y concerns
  catalogued: `EnergyLandscape` marker drag, `MoleculeGallery` focus
  order, PROG-01 visited announcement, `LargeCircuitView` scroll
  region (carry from 5b), reduced-motion verification. Pre-known
  perf concerns: KaTeX CDN, Sphere3D 130 KB gzipped lazy chunk,
  `EnergyLandscape` 2500-rect SSR heatmap. Verdict intentionally blank
  pending manual launch-day run.

- **`BUNDLE-AUDIT.md`** (OPS-04, D-43). Method, top-line v1→v2→v3
  numbers, top-5 heaviest gzipped chunks, per-page initial JS payload
  pre-recompute snapshot, v3 line-item additions per phase, bundle
  isolation spot-checks. Embedded concept-map layout audit subsection
  (D-37..D-39, OPS-03) with full geometry inspection and verdict.

## Concept-map layout verdict: **FLAT**

14-node, four-row layout on a 1000 × 460 SVG viewBox reads cleanly:
40 px clear gaps in the longest rows, 64–74 px clear gaps between
rows, no accidental edge crossings, logical visual reading order.
Flat layout (D-37 default) ships unchanged. Track grouping (D-39
contingency) **not invoked.** Acceptable grouping spec recorded for
future use but Plan 06-08 implements no concept-map change.

## Top-line bundle numbers (v3.0 pre-recompute)

- 24 pages, 45 JS chunks, **184.9 KB total gzipped JS site-wide**,
  32 KB CSS on-disk (5.9 KB gzipped).
- Heaviest chunk: `Sphere3D.client.DTyDaOx0.js` — 129.8 KB gzipped
  (Three.js, lazy on intersection); unchanged role since v1.
- Top 5 heaviest routes (gzipped eager JS):
  - `/shor` — 3.2 KB / 4 KB ceiling
  - `/vqe` — 2.3 KB / 4 KB ceiling
  - `/sandbox/challenges/{bell,flip,ghz,plus,rotate-pi-3}` — 2.3 KB / 3 KB ceiling each
  - `/gallery`, `/grover` — 2.0 KB / 3 KB ceiling each
- All 24 routes within budget (`npm run check:bundle` → ✓).

## Drift candidates for Plan 06-08

- `/deutsch` 1.0 KB → 2.0 KB (actual 0.9 KB is one byte from the gate).
- `/vqe` 4.0 KB → 3.0 KB (tightens — eager JS landed lighter than
  budgeted; the bulk of `/vqe` is SSR HTML, not JS).
- Most other routes already snap to the same 1024-byte boundary the
  recompute would produce; ceiling drift is minimal.

## Deviations from plan

None. Audits captured the pre-recompute state exactly as scoped.
Plan 06-08 owns the recompute, the optional regrouping (no-op for
FLAT), the V3 launch announcement, and the final green-build pass.

## Verification

- `npm run build` → 24 page(s) built clean.
- `npm run check:bundle` → all 24 routes within budget.
- `du -k dist/_astro/*.js | sort -n` → 45 chunks, Sphere3D dominates.
- Sum-of-gzipped JS verified across all chunks: 189 420 B = 184.9 KB.
- Bundle isolation spot-check (`/teleportation`, `/superdense-coding`,
  `/grover`, `/shor` HTML grep'd for EnergyLandscape / h2Energy /
  MoleculeGallery) → 0 occurrences on each, confirming `/vqe`-specific
  data does not leak.
