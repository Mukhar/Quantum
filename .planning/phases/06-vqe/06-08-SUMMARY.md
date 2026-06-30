# Phase 6 Plan 06-08 — V3 Launch Announcement + Final Verification + Ceiling Recompute — SUMMARY

*Completed: 2026-06-30 — single atomic commit + this summary commit. Plan 06-08 is the v3.0 close-out plan.*

## Goal

Close OPS-02 and the v3 milestone. Three deliverables: the v3 launch
announcement (algorithm × use-case narrative + the no-analytics /
no-backend re-ratification), the final green-build verification pass,
and the post-Phase-6 ceiling recompute in `bundle-budget.json` using
the established `round_up(actual_gzip × 1.2, 1024)` convention.

## What shipped

| Plan  | Commit    | Artifact |
|-------|-----------|----------|
| 06-08 | `a9dc659` | `.planning/phases/06-vqe/V3-LAUNCH-ANNOUNCEMENT.md` (new, ~360 lines). Mirrors `_archive-v2/04-launch-polish/LAUNCH-ANNOUNCEMENT.md` tone and structure. Sections: lede framing v3 as "where it actually bites reality" (D-27); three numbered v3 highlights (5 algorithm × use-case essays / Qiskit bridge everywhere / local-only PROG-01 indicator); "What v3 deliberately is NOT" (re-asserts no analytics + no backend + no live ab initio chemistry + no live N=15 factoring + no 8+-qubit simulator + no best-PQC recommendation + no RSA calendar date); Try-it-now route bullet list; Under-the-hood final stats (24 pages, +10 KB gzipped eager JS site-wide, no new runtime deps); 658 test count; HN title + tweet + r/QuantumComputing + r/programming variant blurbs; 9-step launch-day checklist (deploy → smoke-test routes → smoke-test Qiskit bridge → smoke-test progress indicator → clear visited storage → formal Lighthouse → confirm budget → spot-check dark theme → announce); hotfix protocol (v3.0.x branch + atomic-commit revert path + mirror-discipline CI gate). `<URL>` and `<REPO>` placeholders match v1/v2 convention. + `bundle-budget.json` recomputed under `round_up(actual_gzip × 1.2, 1024)`: `/vqe` 4096 → 3072 B (eager JS landed at 2.3 KB with 1.7 KB headroom > 1 KB threshold, so the ceiling drops to the next 1024 boundary); `/deutsch` 1024 → 2048 B (PROG-01 scroll observer pushed actual from 0.7 KB → 0.9 KB, one byte from the gate; next 1024 boundary restores the normal 20 % cushion). All 22 other routes already snap to the same 1024 boundary the recompute would produce; no diff. |

## Requirements closed

- **OPS-02** — V3 launch announcement committed at the user-locked path with v2-equivalent tone, structure, variant blurbs, and launch-day checklist; placeholders flagged for ops-time substitution.
- **OPS-04** (post-Phase-6 close-out) — Ceiling recompute landed in the same commit as the verification pass; `npm run check:bundle` green against the new ceilings on a clean tree.

## Numbers

- **Tests:** **658 / 658** passing across 44 vitest files (no change vs 06-07; this plan is OPS docs + budget edit only, no new tests).
- **Pages:** **24** building clean in 2.17s (no route added or removed in this plan).
- **Bundle (post-recompute):**
  - `/vqe`: 2.3 KB / 3.0 KB ceiling (was 4.0 KB; tightened by 1 KB).
  - `/deutsch`: 0.9 KB / 2.0 KB ceiling (was 1.0 KB; bumped by 1 KB).
  - All 22 other routes unchanged.
- **Files touched:** 2 (`V3-LAUNCH-ANNOUNCEMENT.md` new, `bundle-budget.json` edited). Zero source-code changes.

## Decisions ratified (from PHASE-CONTEXT.md)

1. **D-27 — V3 lede frames "where it actually bites reality."** Algorithm × use-case essays + caveated per-essay reality checks (Grover is √N not magic; superdense ≠ free bandwidth; RSA isn't broken on a calendar date; VQE is credible near-term research, not drug-discovery-solved).
2. **D-30 — No quantum hype.** Every essay caveat is explicit in the announcement; the `MoleculeGallery` framing on `/vqe` is labelled as pre-baked pedagogical data with a disabled slider; PQC cards are non-prescriptive.
3. **D-33 — No analytics / no server / no beacon.** PROG-01 section explicitly re-ratifies the on-device, same-origin, never-transmitted promise. The "What v3 deliberately is NOT" list calls out no GA, no Plausible, no Cloudflare aggregate.
4. **D-40 — Launch artifact path** = `.planning/phases/06-vqe/V3-LAUNCH-ANNOUNCEMENT.md` per user lock; matches v2's launch-polish pattern.
5. **D-43 — OPS-04 same-commit rule.** Ceiling recompute landed in the same commit as the regression-check pass.
6. **D-37 — Flat concept map ships.** 06-07's audit verdict honoured; no `ConceptMap.astro` change this plan (the optional regrouping section in PLAN.md is a no-op for FLAT, as designed).

## Close-out invariants (verified)

Diffs computed from Phase 6 start commit `4dafc34` (Phase 5b close-out) to `HEAD` after 06-08 commit:

| File | Phase-6 diff | Significance |
|---|---|---|
| `src/lib/quantum/simulator.ts` | 0 lines changed | `MAX_QUBITS = 4` hard cap survived Phase 6 (matches every prior algorithm phase). |
| `src/lib/quantum/circuit.ts` | 0 lines changed | Sandbox `Op` union unchanged; no new gate kinds; circuit IR stable. |
| `package.json` | 0 lines changed | No new runtime deps across Phase 6 (vanilla TS held). |
| `package-lock.json` | 0 lines changed | Lockfile stable; build determinism preserved. |
| `tests/essays/nav-graph.test.ts CHAIN[]` | 12 essays | Full reading path: qubit → superposition → measurement → gates → entanglement → cnot-bell → deutsch → teleportation → superdense-coding → grover → shor → vqe. |
| `tests/essays/concept-map.test.ts expectedEssays[]` | 12 essays | Same chain; mirror discipline preserved (D-45). |

## Deviations from plan

None. Optional concept-map regrouping was scoped as no-op per 06-07's FLAT verdict; not invoked.

## Out-of-scope items (re-confirmed not done)

- **Lighthouse formal run** — deferred to a manual ops gate per `LIGHTHOUSE-PLAN.md`; structural a11y is in place across every v3 widget (verified by structural tests and component review at each phase close-out). Launch-day operator runs Lighthouse against the deployed `dist/` per the recipe in `LIGHTHOUSE-PLAN.md`.
- **Pushing / deploying** — Phase 6 ships code-complete v3.0; deploy is a separate parallel ops task carrying over from v1 + v2 (see `.planning/STATE.md` "Parallel ops tasks").
- **Live screen-reader pass** on `/vqe` widgets — carries from 5b's deferred list; same user-gate handling.

## Verification

- `npm test` → 658 / 658 passing in 5.27s.
- `npm run build` → 24 page(s) built in 2.17s; no warnings.
- `npm run check:bundle` (post-recompute) → all 24 routes within budget; `/vqe` 2.3 / 3.0 KB, `/deutsch` 0.9 / 2.0 KB.
- `git diff 4dafc34..HEAD -- src/lib/quantum/simulator.ts src/lib/quantum/circuit.ts package.json package-lock.json` → empty diff (4 files × 0 lines).
