# Phase 4 — v2.0 Launch Polish — PLAN

*Created: 2026-06-28 — autonomous mode, post Phase 3 commit.*
*Covers: OPS-01, OPS-02, OPS-03 + Plan 01-05 carryover.*

## Phase Goal

Audit + announcement. No new user-facing features. Close out v2.0
with a bundle-size delta check, a dark-mode visual QA scorecard, a
Lighthouse plan, and a v2 launch announcement.

## Sub-plans

### Plan 04-01 — Bundle size delta audit (OPS-01 input)
- Run `npm run build` clean and inspect `dist/_astro/*.js`.
- Confirm essay routes do NOT pull `idb-keyval` (gallery code).
- Compute total essay JS gzip and compare against the v1 baseline
  recorded in `.planning/phases/_archive-v1/05-algorithms/LIGHTHOUSE.md`.
- Output: `BUNDLE-AUDIT.md` with per-route JS payload and
  classification (pass / regress / new-route).

### Plan 04-02 — Dark-mode visual QA scorecard (OPS-02)
- Walk every route × every theme.
- Score each widget against the 6-item checklist from `01-theme/PHASE-CONTEXT.md`.
- Output: `VISUAL-QA.md` with per-route table marking PASS / FLAG / FAIL
  + remediation notes.

### Plan 04-03 — Lighthouse plan (OPS-01)
- We cannot run Lighthouse in CI here (needs Chrome + a live server).
- Output: `LIGHTHOUSE-PLAN.md` documenting:
  - the manual run checklist (commands + expected scores per route),
  - the v1 baselines to compare against,
  - a CI integration recipe for the launch day.

### Plan 04-04 — Plan 01-05 carryover decision (visual regression)
- Per Phase 1 SUMMARY: Playwright visual regression deferred here.
- Decision (documented in `VISUAL-REGRESSION-DEFERRED.md`):
  defer to v2.1 unless launch surfaces a regression. Rationale:
  21 theme unit tests + manual QA scorecard cover the same risk
  surface for v2.0 launch; the Playwright harness adds CI minutes
  + 100 MB image bytes for marginal ROI on a 19-page personal site.
  Revisit at v3.0 when the algorithm essay batch grows the surface.

### Plan 04-05 — v2 launch announcement (OPS-03)
- Mirror v1's `LAUNCH-ANNOUNCEMENT.md` structure.
- Lead with what changed, what didn't, and the "no analytics" promise.
- Output: `LAUNCH-ANNOUNCEMENT.md`.

### Plan 04-06 — Milestone close-out notes
- Update `.planning/MILESTONES.md` with v2.0 entry.
- Update `STATE.md` to reflect milestone-complete.
- Defer actual `_archive-v2/` move + `/gsd-complete-milestone v2.0`
  to the post-launch operations cycle (user-triggered).

## Acceptance

- [ ] `BUNDLE-AUDIT.md` written with concrete file sizes
- [ ] `VISUAL-QA.md` written with route × widget scorecard
- [ ] `LIGHTHOUSE-PLAN.md` written with manual run recipe
- [ ] `VISUAL-REGRESSION-DEFERRED.md` written with decision rationale
- [ ] `LAUNCH-ANNOUNCEMENT.md` written
- [ ] `MILESTONES.md` updated with v2.0 entry
- [ ] All 247 tests still pass
- [ ] Build clean
