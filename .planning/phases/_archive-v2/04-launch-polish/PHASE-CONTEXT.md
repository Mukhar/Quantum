# Phase 4 Context: v2 launch polish

*Created: 2026-06-28 as part of v2.0 milestone bump.*
*Status: Awaiting `/gsd-discuss-phase 4` then `/gsd-plan-phase 4`.*

## Goal

Audit + announcement. Close out v2: Lighthouse on new routes, dark-mode
visual QA pass, bundle-size delta check, v2 announcement draft.

## Requirements covered

- **OPS-01** — Lighthouse mobile a11y ≥ 95 on `/gallery` and `/feedback` in both themes
- **OPS-02** — Dark-mode visual QA against the §3.2 widget checklist
- **OPS-03** — v2 announcement draft (mirrors v1's `LAUNCH-ANNOUNCEMENT.md`)

## Inputs

- Phase 1 widget audit checklist (from `01-theme/PHASE-CONTEXT.md`)
  acts as the QA scorecard for OPS-02.
- v1 `LAUNCH-ANNOUNCEMENT.md` (under `.planning/phases/_archive-v1/05-algorithms/`)
  is the template for OPS-03.
- v1 `LIGHTHOUSE.md` (under `.planning/phases/_archive-v1/05-algorithms/`)
  is the baseline — v2 must not regress any essay route.

## Constraints

- This phase ships ZERO new user-facing features. It is pure audit +
  documentation.
- Re-ratify "no analytics. ever." in the v2 announcement.
- Bundle delta target: total site gzipped JS for essay routes
  unchanged vs v1.0; sandbox + gallery routes may grow by the gallery
  bundle but not by more than the design-doc-implied envelope
  (idb-keyval ~600 B + gallery store ~3 KB + drawer UI).

## Side-quest

If v1 deploy is still pending when v2 reaches this phase, fold the v1
deploy checklist into the v2 announcement (single launch event covering
both). Otherwise keep v2 as an incremental update to a live site.

## Close-out

After this phase:
1. Update `.planning/MILESTONES.md` with v2.0 entry.
2. Archive `.planning/phases/{01..04}-*` under `_archive-v2/`.
3. `/gsd-complete-milestone v2.0` to bump to v3.0 scoping (algorithm
   track 2, sync layer, etc. — see PROJECT.md "Future Requirements").
