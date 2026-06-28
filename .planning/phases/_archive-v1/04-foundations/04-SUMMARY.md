# Phase 4 Summary — Foundations Essay Track

**Status:** Code-complete. All 6 plans landed.

**Shipped:** 2026-06-26 (one autonomous-mode session, parallel sub-agent
fan-out for plans 04-02 through 04-05).

## What we built

The Phase 4 arc rounds the v1 reading experience out from one essay
(`/qubit`) to **five** essays that flow as a single linear path —
superposition → measurement → gates → entanglement — and ties them
together with a hand-rolled concept-map homepage that doubles as the
visual nav. Every Phase-4 essay carries a build-time-encoded "Open in
sandbox →" deep link to a pedagogically meaningful starter circuit,
delivering on the Phase 3 promise that the sandbox would unlock
"remix this" CTAs across the rest of the site.

The entanglement essay is the first place 1 qubit stops being
enough. It introduces a tiny reusable `MiniBloch.astro` component
that renders per-qubit reduced-density Bloch projections as inline
SVG — extracted (rather than reused from the sandbox `ResultsPanel`)
because the sandbox renderer is tightly coupled to its singleton
`circuit` signal and would have dragged in the full sandbox
composer chunk for an essay that just needs to draw two arrows.

## Plans landed

| Plan  | What                                                          | Commit    |
|-------|---------------------------------------------------------------|-----------|
| 04-01 | `SandboxLink` + `ConceptMap` + homepage rewire + 4 tests      | `1c4b80c` |
| 04-02 | `/superposition` essay (parallel sub-agent)                   | `7512c92` |
| 04-03 | `/measurement` essay + 100×-run histogram (parallel sub-agent)| `2f8c0af` |
| 04-04 | `/gates` essay + `X ≈ Ry(π)` walkthrough (parallel sub-agent) | `a45bc7d` |
| 04-05 | `/entanglement` essay + `MiniBloch` extraction (parallel)     | `29350aa` |
| 04-06 | Nav wiring + 26 new tests + SUMMARY + ROADMAP/STATE           | this commit |

## Numbers

- **Tests:** 130 passing (was 101 at end of Plan 04-01, 97 at start of phase).
  - +4 (`concept-map.test.ts`, Plan 04-01)
  - +3 (`miniBloch.test.ts`, Plan 04-05)
  - +12 (`sandbox-links.test.ts`, Plan 04-06)
  - +14 (`nav-graph.test.ts`, Plan 04-06) — every essay's prev/next
    contract is asserted in CI.
- **Build:** 13 pages built clean (was 9 at end of Phase 3). Only the
  pre-existing Three.js chunk-size warning carries over.
- **New routes:** 4 (`/superposition`, `/measurement`, `/gates`,
  `/entanglement`).
- **New shared components:** 3 (`SandboxLink.astro`, `ConceptMap.astro`,
  `MiniBloch.astro`).
- **Page weights** (gzipped, full HTML — JS chunks are shared via the
  module graph and not double-counted):

  | Route            |  raw   |  gzip  | Notes |
  |------------------|-------:|-------:|-------|
  | `/`              | 13.0 KB | 2.5 KB | new ConceptMap, no JS deps |
  | `/qubit`         | 35.0 KB | 7.3 KB | unchanged from Phase 2 |
  | `/superposition` | 31.3 KB | 6.5 KB | reuses Phase-2 widget kit |
  | `/measurement`   | 33.5 KB | 7.6 KB | +~30 LOC run-100 inline JS |
  | `/gates`         | 55.8 KB | 8.5 KB | three RotationSliders + Bloch |
  | `/entanglement`  | 47.6 KB | 8.9 KB | MiniBloch + ProbabilityBars (4 outcomes) |
  | `/sandbox`       | 20.7 KB | 3.9 KB | unchanged; sandbox chunks lazy |

  Every essay stays well under any reasonable per-page budget. Three.js
  remains lazy-loaded and cached after first visit to any Bloch-rendering
  essay (`/qubit`, `/gates`).

## Architectural decisions made

1. **`SandboxLink.astro` encodes at build time.** A real `Circuit`
   literal in essay frontmatter is fed through `encodeCircuit` during
   the Astro build, producing a static `<a href="/sandbox#…">`. Three
   wins: zero runtime cost, works with view-source / RSS readers, and
   any future codec change fails the build instead of breaking a
   user-click. The same `encodeCircuit` runs on the receiving end in
   the sandbox.

2. **`ConceptMap.astro` is hand-rolled SVG, no D3.** ~10 nodes in v1
   makes any programmatic layout more expensive than hand-placement.
   Live nodes are `<a>` with focus-visible rings (WCAG 2.2 AA); v2
   placeholders (CNOT+Bell, Deutsch) render as `<g aria-disabled>`,
   dimmed slate, no hover state. Mobile under 640 px swaps the SVG
   for a stacked `<ol>` with the same hrefs.

3. **`MiniBloch.astro` was extracted (Path B in PLAN 04-05).** The
   entanglement essay tried Path A first — reusing
   `src/components/sandbox/ResultsPanel.astro` — but its hydrator
   (`results.client.ts`) imports the sandbox-singleton `circuit`
   signal at module top, which would have meant either editing that
   hydrator (off-limits per the plan guardrails) or instantiating a
   parallel sandbox store on the essay page (drags in composer +
   persistence + history). Extracting a 146-line component that
   reuses the pure-math helpers (`reducedDensityMatrix`,
   `blochVectorFromRho`) instead was the cheaper, more cohesive call.

4. **Every essay's starter circuit was chosen to be pedagogically
   sticky and trivially shareable.** The longest fragment in the
   chain is `/gates`'s two-rotation starter at ~30 base64url chars
   (under 0.03 KB — the 2 KB cap has 65× headroom). Round-trip
   verified in CI.

5. **Cross-essay nav lives in static frontmatter, not a JSON
   index.** Each essay's `<Fragment slot="footer-nav">` declares its
   own prev/next. The chain integrity is asserted by
   `tests/essays/nav-graph.test.ts`, which greps the `.astro` files
   for the expected `href=` substrings. Cheaper than parsing Astro,
   strong enough to catch any typo, and keeps essay authorship
   self-contained.

6. **Sub-agent fan-out for plans 04-02 through 04-05 worked
   cleanly.** Four parallel `code-puppy` sub-agents each got a
   single-file deliverable, a hard guardrail against touching
   shared infra, and a self-running gauntlet (`vitest` + `tsc` +
   `astro build`) before commit. The only mid-flight finding from
   the parallel pass: Astro/JSX evaluates `{…}` inside prose as an
   expression, so any literal `{` in math notation has to be escaped
   (HTML entity) or wrapped in `MathBlock`. Worth documenting for
   Phase 5 essays.

## What's intentionally deferred

- **CNOT+Bell essay** (Phase 5, plan 05-02) — entanglement essay
  previews the Bell state but the deeper algorithmic intuition
  (two-qubit gate set, no-cloning, teleportation primer) lives in
  Phase 5.
- **Deutsch's algorithm essay** (Phase 5, plan 05-03).
- **In-essay circuit-builder embed** (Phase 5, plan 05-01) —
  re-uses the sandbox composer in read-mode-by-default to let
  algorithm essays show a working circuit inline.
- **Concept-map progress indicator** (Phase 5 launch polish) — would
  need a localStorage hook to mark essays as read.
- **E2E test harness (Playwright)** — Phase 4 didn't add any. With
  five essays, a sandbox, and a challenges hub, the case for a
  smoke-level browser-driven E2E is now strong; Phase 5 entry
  should ratify the decision.
- **Deploy + Lighthouse run + dev-friend feedback** — still
  inherited from `phases/02-qubit-essay/REMAINING.md`. Doesn't
  block Phase 5 development; does block v1 launch.

## How to resume

Phase 5 (Algorithm track + v1 launch) is the last phase before
launch. Plans per ROADMAP:

- **05-01** CircuitBuilder essay-embed mode (sandbox composer in
  read-only-by-default mode)
- **05-02** CNOT + Bell-state essay
- **05-03** Deutsch's algorithm essay
- **05-04** v1 launch polish (analytics decision, og-images,
  robots/sitemap)
- **05-05** Launch announcement draft + final Lighthouse + retro

Phase 5 starts with a fresh `smart_discuss` (no `05-CONTEXT.md`
exists yet). Before discussing, ratify:
- The `MiniBloch` extraction pattern from 04-05 as the way essays
  reuse sandbox renderer code (extract pure pieces, don't import
  sandbox-store-coupled hydrators).
- Whether to take the E2E-harness plunge before shipping CNOT+Bell
  and Deutsch (both are interaction-heavy).
- Whether to drain the Phase 2 `REMAINING.md` (deploy + Lighthouse
  + feedback) before plan-phase, or interleave it with 05-01.
