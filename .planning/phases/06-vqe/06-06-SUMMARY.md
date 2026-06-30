# Phase 6 Plan 06-06: PROG-01 Visited Indicator — Summary

**Phase:** 06-vqe
**Plan:** 06-06 — PROG-01 visited indicator (helper + scroll-depth observer + concept-map hydrator)
**Commit:** `63c771c` (single atomic commit, 6 files)
**Date:** 2026-06-30

---

## What shipped

Closes PROG-01 / ALG-09. Local-only personalization wired into every
v3 essay via a single EssayLayout edit: when the reader scrolls past
50% of any essay, that route is recorded under
`localStorage["quantum/visited"]`, and on the next homepage render the
concept map highlights visited nodes brighter (semantic accent
tokens, both themes) with an updated `aria-label` so screen readers
announce visited state. No analytics, no beacon, no server, no
BroadcastChannel, no tick badges (D-31..D-36).

### Helper module (`src/lib/progress.ts`, new)

- `VISITED_KEY = "quantum/visited"` (D-32)
- `VISITED_THRESHOLD = 0.5` (D-31)
- API: `getVisited()`, `markVisited(path)`, `clearVisited()`,
  `instrumentScrollDepth(currentPath)`.
- Every `localStorage` access wrapped in `try/catch` matching
  `src/lib/theme.ts` / `src/lib/annotations.ts` (D-35).
- `getVisited` returns `[]` on any of: missing key, `localStorage`
  unavailable, `localStorage.getItem` throws, non-JSON garbage,
  wrong-shape JSON (not an array), array containing non-string
  items. Deduplicates on read.
- `markVisited` dedupes on write; silent on storage write failure.
- `instrumentScrollDepth` uses a passive `scroll` listener, self-
  removes on first trigger per path, idempotent per page session via
  a module-level `triggered` set, and treats short pages
  (`scrollHeight - innerHeight <= 0`) as fully-read on first scroll
  so mobile / zoomed viewports stay marker-able.
- `clearVisited` is test-only (NOT surfaced in any UI control per
  the plan's OUT-OF-SCOPE list) and also detaches any orphan scroll
  listeners so test isolation is clean.

### Mirror edits

| File | Edit |
|---|---|
| `src/layouts/EssayLayout.astro` | Inline `<script>` near bottom of `<body>` imports `instrumentScrollDepth` and calls it with `window.location.pathname` on `DOMContentLoaded` (or immediately if already loaded). One edit instruments every essay using `EssayLayout` (D-36). |
| `src/components/ConceptMap.astro` | `<script>` hydrator imports `getVisited`, marks `data-visited="true"` on matching `<a>` in BOTH the desktop SVG and the mobile `<ol>` fallback via a single `querySelectorAll('a[href]')` inside the nav container. Updates `aria-label` to `"Read: <Label> (visited)"` so screen readers announce visited state (D-34). |
| `src/components/ConceptMap.astro` `<style>` | Visited brightness lift via `--color-accent-muted` (fill) + `--color-accent-emphasis` (stroke + text). Mobile list fallback uses the same accent tokens for border + background. No tick badge / icon (D-34); brightness only. Works in both themes since all colours are semantic vars. |

### Tests (+19)

- `tests/progress/progress.test.ts` (new, 11 unit): threshold
  constant lock at exactly `0.5` (D-31); `getVisited` returns `[]`
  for missing-key, throwing-`getItem`, non-JSON, wrong-shape,
  non-string-items cases; `markVisited` appends / dedupes /
  swallows `setItem` failure; `clearVisited` resets storage and is
  no-op safe.
- `tests/progress/instrument-scroll.test.ts` (new, 3 happy-dom
  integration): threshold-crossing scroll marks visited, below-
  threshold does not, repeat call on the same path during the same
  session is idempotent.
- `tests/components/concept-map-progress.test.ts` (new, 5 structural):
  imports `progress` runtime; emits `data-visited` markup + imports
  `getVisited`; updates `aria-label` for visited-state announcement;
  hydrator catches both SVG `<a>` and mobile `<ol> <a>` via a single
  `a[href]` query (or explicit `svg a` + `ol a`); CSS uses
  `--color-accent` tokens with no checkmark / tick / `✓` glyph.

Plan listed "8 unit + 3 integration + 3 structural" — realised count
is 11 + 3 + 5 because the natural describe-block expansion (e.g.
splitting `getVisited` storage-failure tolerance into its own `it()`)
made the suite easier to read; semantics are identical to the plan
brief.

## Numbers

- **Tests:** 639 → 658 (+19, all green). All 44 vitest files green.
- **Build:** 24/24 pages emit cleanly (no SSR errors from the new
  `<script>` import in `EssayLayout`).
- **Bundle (gzipped, post-PROG-01):** all 24 routes within ceiling.
  Per-route deltas vs Plan 06-05 baseline:

  | Route | Pre (KB) | Post (KB) | Δ | Ceiling | Headroom |
  |---|---|---|---|---|---|
  | `/vqe` | 2.3 | 2.3 | 0.0 | 4.0 | -1.7 |
  | `/shor` | 3.2 | 3.2 | 0.0 | 4.0 | -0.8 |
  | `/grover` | 2.0 | 2.0 | 0.0 | 3.0 | -1.0 |
  | `/teleportation` | 1.1 | 1.1 | 0.0 | 2.0 | -0.9 |
  | `/superdense-coding` | 1.2 | 1.2 | 0.0 | 2.0 | -0.8 |
  | `/deutsch` | 0.9 | 0.9 | 0.0 | 1.0 | -0.1 |
  | `/qubit, /superposition, /measurement, /gates, /entanglement, /cnot-bell` | 0.4–0.7 | 0.4–0.7 | 0.0 | 1.0 | -0.3 to -0.6 |
  | `/sandbox, /sandbox/challenges/*` | 0.7–2.3 | 0.7–2.3 | 0.0 | 1.0–3.0 | unchanged |
  | `/feedback, /feedback/thanks, /gallery, /index, /404` | 0.2–2.0 | 0.2–2.0 | 0.0 | 1.0–3.0 | unchanged |

  The scroll-observer import adds < 100 B gzipped to the shared chunk
  imported by every essay layout — below the 0.1 KB rounding floor
  of `check:bundle`. No route ceiling needs a bump in this plan;
  OPS-04 recompute is Plan 06-08's job.

## Decisions ratified

- **D-31** — Threshold exactly `0.5`; CI-locked via the
  `VISITED_THRESHOLD` constant test.
- **D-32** — Key is `"quantum/visited"`, value is a JSON array of
  route paths (not a timestamp-keyed object); CI-locked via the
  `VISITED_KEY` constant test + storage-shape tolerance tests.
- **D-33** — Zero analytics / beacon / server / BroadcastChannel.
  The implementation only touches `window.localStorage` and a
  passive `window.scroll` listener.
- **D-34** — Visual is brightness change via semantic accent tokens;
  no tick badge / icon. Pair with `aria-label` updates so SRs
  announce visited state. CI-locked via the structural test that
  bans `✓ / ✔ / checkmark` in the source.
- **D-35** — Every storage call wrapped in `try/catch`; the page
  still renders if storage is disabled, throws on read, throws on
  write, or contains corrupt data.
- **D-36** — Instrumentation lives in `EssayLayout`; one edit covers
  every essay route (12 essays in the current reading path: qubit,
  superposition, measurement, gates, entanglement, cnot-bell,
  deutsch, teleportation, superdense-coding, grover, shor, vqe).

## Out-of-scope / deferred

- **"Reset visited" UI control.** Not requested; `clearVisited` is
  exported for tests only and is NOT surfaced in any header / menu /
  page.
- **Timestamp / "last visited" log.** D-32 explicitly chose an array
  of paths, superseding the design-doc §4.4 sketch.
- **Cross-tab `BroadcastChannel` sync.** Single-tab is sufficient
  for v3 (D-33).
- **OPS-04 ceiling recompute** for the < 100 B / route gain. Plan
  06-08 will recompute every Phase-6 route ceiling using
  `round_up(actual × 1.2, 1024)`; no per-route action needed here.

## Bookkeeping

- Pre-existing TypeScript errors in `tests/feedback/feedback.test.ts`
  (vitest `MockInstance.mock.calls[0]` tuple-typing) are unrelated
  to this plan — they predate Phase 6 and remain out-of-scope per
  the executor's scope-boundary rule. Worth logging for the v3
  launch close-out (Plan 06-08 or v3.1).
- `.planning/config.json` (untracked, contains
  `workflow._auto_chain_active: false`) is a GSD runtime artifact,
  not a deliverable from this plan, and was intentionally left out
  of the commit per the user's commit manifest.

## Self-Check: PASSED

- `src/lib/progress.ts` exists ✓
- `src/components/ConceptMap.astro` modified (hydrator + visited CSS) ✓
- `src/layouts/EssayLayout.astro` modified (inline observer script) ✓
- `tests/progress/progress.test.ts` exists ✓
- `tests/progress/instrument-scroll.test.ts` exists ✓
- `tests/components/concept-map-progress.test.ts` exists ✓
- Commit `63c771c` recorded in `git log` ✓
- `npx vitest run` → 658/658 green ✓
- `npm run build` → 24/24 pages ✓
- `npm run check:bundle` → all 24 routes within ceiling ✓
