# Plan 01-05 (Playwright visual regression) — DEFERRED to v2.1

*Decision recorded: 2026-06-28 — Phase 4, autonomous.*

## What was deferred

Phase 1 SUMMARY proposed installing `@playwright/test`, snapshotting
every route in both themes (light, dark), and gating on visual diffs
in CI. The harness would emit ~38 baseline images (19 routes × 2
themes) and add a CI step.

## Why defer

| Criterion | Status |
|---|---|
| Risk surface covered by other tests? | **Yes** — 21 theme unit tests cover bootstrap, runtime apply, persistence, system listener, cycle, FOUC paths. Visual QA scorecard (VISUAL-QA.md) covers per-widget rendering. |
| Risk surface NOT covered? | Pixel-perfect regressions if a CSS var is accidentally mutated. Low probability — all colour use goes through the 17-token semantic palette and any leak is caught at code review. |
| ROI on a 19-page personal site? | **Low.** Each baseline = 100-300 KB PNG × 38 = ~5-10 MB in the repo. CI Chromium install adds ~150 MB cold cache. |
| Maintenance cost? | High — every intentional copy edit or layout tweak invalidates baselines, forcing `--update-snapshots` re-runs. |
| Launch-blocking? | **No.** v1.0 shipped without it. v2.0 ships with stronger semantic-token guarantees than v1. |

## When to revisit

Trigger re-evaluation when **any one** of the following becomes true:

1. **A regression slips through visual QA at launch.** The exact
   regression becomes the first visual test. (Reactive, not preventative.)
2. **v3.0 algorithm essay batch lands.** When the page count crosses
   ~25 routes, the manual scorecard cost exceeds the CI cost.
3. **A third-party design system is adopted.** Tokens churn = need
   regression bed.
4. **Sponsor or contributor takes ownership of the visual harness.**

## What replaces it for v2.0

- 21 theme unit tests (themeBootstrap.test.ts + theme.test.ts)
- VISUAL-QA.md scorecard (35/35 PASS attested)
- Launch-day manual smoke (documented in LAUNCH-ANNOUNCEMENT.md)
- LIGHTHOUSE-PLAN.md sets a11y/perf thresholds with run recipe

## Backlog entry

Add to `.planning/BACKLOG.md` (or equivalent) for v2.1+:

> **Playwright visual regression harness** — install `@playwright/test`,
> add `playwright.config.ts` with desktop + mobile viewports, write
> `tests/visual/themes.spec.ts` snapshotting all routes in both
> themes, npm scripts `test:visual` and `test:visual:update`,
> generate baselines on a stable build, wire into CI. Estimated cost:
> 4-6 hrs initial, ~15 min per intentional UI change going forward.
