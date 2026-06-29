# Phase 4 — v2.0 Launch Polish — SUMMARY

*Completed: 2026-06-28 — autonomous mode.*

## Goal
Audit + announcement. Close out v2.0 — no new user-facing features.

## What shipped

| Artifact | Purpose |
|---|---|
| `PLAN.md` | This phase's plan, 6 sub-plans |
| `BUNDLE-AUDIT.md` | OPS-01 input — per-page JS payload + isolation check |
| `VISUAL-QA.md` | OPS-02 — 35/35 widget × theme scorecard, all PASS |
| `LIGHTHOUSE-PLAN.md` | OPS-01 — run recipe + per-route target scores |
| `VISUAL-REGRESSION-DEFERRED.md` | Plan 01-05 carryover decision — defer to v2.1 |
| `LAUNCH-ANNOUNCEMENT.md` | OPS-03 — v2 announcement draft + smoke-test checklist |
| `.planning/MILESTONES.md` | v2.0 milestone entry appended |
| `.planning/STATE.md` | Updated to milestone-complete state |

## Requirements closed

- **OPS-01** — Lighthouse a11y/perf plan documented with v1 baseline, per-route targets, manual run recipe.
- **OPS-02** — Dark-mode visual QA scorecard authored. 35/35 widgets PASS, 1 FLAG (intentional categorical encoding), 0 FAILs.
- **OPS-03** — v2 launch announcement drafted with three-section lead (theme / gallery / feedback), variant blurbs (HN / tweet / r/QC / r/learnprogramming), and 11-step smoke test checklist.
- **Plan 01-05 carryover** — Playwright visual regression deferred to v2.1 with explicit rationale and revisit triggers.
- **Plan 01-06 carryover** — KaTeX self-host left in backlog (Best Practices score impact is 1-2 points, not a launch blocker).

## Numbers

- **Tests:** 247/247 passing (no change — this phase is documentation only).
- **Build:** 19 pages building clean.
- **Bundle:** +44 KB site-wide vs v1.0 (+6.9%), all in new-route chunks. Essay routes unchanged at 4 KB initial JS.
- **Documents written:** 6 new docs in `04-launch-polish/`, 2 docs updated (`MILESTONES.md`, `STATE.md`).

## What remains outside this phase

These are post-launch operational tasks, not future v2 phases:

1. Provision the Apps Script web app endpoint, set `PUBLIC_FEEDBACK_URL`.
2. Run Lighthouse manually per `LIGHTHOUSE-PLAN.md`, paste results.
3. Run smoke test per `LAUNCH-ANNOUNCEMENT.md` step 1-11.
4. Push, deploy, announce.
5. After post-launch stable, run `/gsd-complete-milestone v2.0`.
   This moves `01-theme` through `04-launch-polish` into `_archive-v2/` and bumps to v3.0 scoping.

## Threat model recap (whole v2.0)

| Surface | Threat | Mitigation |
|---|---|---|
| Theme persistence | XSS via localStorage tampering | Stored value is one of "light"/"dark"/"system" only; bootstrap reads via try/catch and defaults to "system" on any failure |
| FOUC | Wrong-theme flash | Inline bootstrap script runs before stylesheet links |
| Feedback form | Form spam | Honeypot field + Apps Script 5/min hashed-IP rate limit |
| Feedback form | XSS on thanks page | Static page, no form-data echo |
| Feedback transport | CORS preflight rejection | `mode: "no-cors"`, opaque response treated as success |
| Gallery storage | Quota exhaustion | Banner at ≥100 entries; in-mem fallback if write throws |
| Gallery storage | Private browsing | Detected on first IDB error → fallback + banner |
| Gallery schema drift | Future format breakage | `schemaVersion` discriminator + `migrate()` dispatch returns null on unknown version |
| Gallery import | Malicious JSON injection | `isValidEntry` runtime guard + skipped entries reported via `ImportResult.errors` |
| Bundle isolation | Essay routes pulling gallery/feedback code | Verified via `grep -l "gallery\|feedback" dist/<essay>/index.html` → no matches |

## Final state

```
v2.0 status: code-complete
Tests: 247/247
Pages: 19 building clean
Bundle: +44 KB site-wide, essay routes unchanged
Docs: complete (PLAN, SUMMARY, BUNDLE, VISUAL, LIGHTHOUSE, REGRESSION, ANNOUNCE)
Pending: Apps Script provisioning + manual Lighthouse run + smoke test + ship
```
