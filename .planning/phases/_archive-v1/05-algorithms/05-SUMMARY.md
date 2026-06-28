# Phase 5 Summary — Algorithm Track + v1 Launch Prep

**Status:** Code-complete. All 5 plans landed. v1 launch-ready
modulo deployment.

**Shipped:** 2026-06-26 (same session as Phase 4 — three phases in
one autonomous day).

## What we built

Phase 5 is the **last phase before v1 launch**. It rounds the essay
arc out to its v1 shape (7 essays total: 5 foundations + 2 algorithms),
delivers the slim `CircuitView` embed primitive both algorithm essays
needed to show their circuits inline, and prepares every launch
artifact short of an actual deployment.

The algorithm essays both adopt the user-ratified **"why should I
care" opener pattern**: 2-3 paragraphs of classical pain-point before
any quantum content. CNOT+Bell opens with "no classical 2-bit logic
reaches the CHSH bound." Deutsch opens with "classical needs 2 oracle
queries; we'll do it in 1." Both keep the foundations voice
unchanged after the opener.

The concept-map homepage transitions from showing two dimmed v2
placeholders to a fully populated 7-node primary-tier reading path —
**v1 has zero "coming soon" UX**. Sandbox + Challenges remain as
utility entry/exit nodes connected to both qubit (entry) and deutsch
(exit).

SEO infrastructure (robots.txt, sitemap.xml endpoint, og-image, og
+ twitter card meta on every essay + homepage, friendly 404)
landed without touching the runtime cost of any page.

## Plans landed

| Plan  | What                                                          | Commit    |
|-------|---------------------------------------------------------------|-----------|
| 05-01 | `CircuitView.astro` (read-only embed) + 6 tests              | `cf534cf` |
| 05-02 | `/cnot-bell` essay (parallel sub-agent)                       | `2485adc` |
| 05-03 | `/deutsch` essay (parallel sub-agent)                         | `18a7e8e` |
| 05-04 | Launch polish: robots/sitemap/404/og/canonical + concept-map un-dim | (commit hash this commit-1) |
| 05-05 | Nav extension + LIGHTHOUSE + LAUNCH-ANNOUNCEMENT + SUMMARY    | (this commit) |

## Numbers

- **Tests:** 146 passing (was 130 at end of Phase 4, +16).
  - +6 (`circuit-view.test.ts`, Plan 05-01) — cellLabel mirror + circuit encoding sanity
  - +10 (extended `sandbox-links.test.ts` + `nav-graph.test.ts` in Plan 05-05)
- **Build:** 16 pages built clean (was 13 at end of Phase 4):
  - 5 foundations essays + 2 algorithm essays = 7 essays
  - Sandbox + challenges hub + 5 individual challenges
  - Homepage + 404 + sitemap.xml endpoint
- **Routes added:** 2 essays (`/cnot-bell`, `/deutsch`) + 404 +
  sitemap.
- **New shared components:** 1 (`CircuitView.astro`).
- **Page weights** (gzipped, full HTML):

  | Route             | gzip | Notes |
  |-------------------|-----:|-------|
  | `/`               | 2.5 KB | zero JS deps |
  | `/qubit`          | 7.2 KB | 3D Bloch lazy |
  | `/superposition`  | 6.4 KB | |
  | `/measurement`    | 7.5 KB | +~30 LOC run-100 |
  | `/gates`          | 8.4 KB | 3D Bloch (cached) |
  | `/entanglement`   | 8.8 KB | MiniBloch + 4-bar |
  | `/cnot-bell`      |10.0 KB | 2× MiniBloch + CircuitView |
  | `/deutsch`        | 9.5 KB | CircuitView + 4 oracle btns |
  | `/sandbox`        | 3.8 KB | composer + canvas + tones lazy |
  | `/404`            | ~1 KB | |

  All routes comfortably under any reasonable budget. The Three.js
  chunk is the only large dependency, lazy-loaded on first Bloch
  interaction and shared across `/qubit` + `/gates`.

## Architectural decisions made

1. **`CircuitView.astro` is READ-ONLY**, not an embedded composer
   (Plan 05-01). The sandbox composer is too tightly coupled to its
   singleton store / persistence / undo to retrofit with a sensible
   `embedded` prop. Same pattern as `MiniBloch` extraction in Phase
   4: pull out a slim renderer that reuses pure pieces, leave the
   hydrator alone. ~210 lines, zero JS cost.

2. **Algorithm essays open with a "why should I care" pitch.** Both
   `/cnot-bell` and `/deutsch` lead with 2-3 paragraphs of classical
   pain-point before any quantum math. Anchors the reader's sense
   of WHY this matters before HOW it works. Worth carrying into any
   future algorithm essays.

3. **Concept map v2 placeholders are gone in v1.** When `/cnot-bell`
   and `/deutsch` shipped, we promoted both nodes to primary tier
   in `ConceptMap.astro` (and updated `concept-map.test.ts` in the
   same commit). v1 has zero dimmed nodes. v2 essays will re-introduce
   placeholders when their plan phase opens.

4. **Sitemap is an Astro server endpoint, not a static file.** The
   `ROUTES` table inside `src/pages/sitemap.xml.ts` is the single
   source of truth — if a new page lands without being added there,
   it won't appear in the sitemap, which is exactly the failure
   mode you want at PR-review time.

5. **OG image is SVG, not PNG.** The toolchain doesn't have ImageMagick
   / rsvg-convert handy, and modern OG scrapers (Twitter/X, Slack,
   Discord, Mastodon, Bluesky) handle SVG fine. Legacy scrapers that
   want PNG can be served by a PNG generated at deploy time (call
   out in `LAUNCH-ANNOUNCEMENT.md` pre-launch checklist).

6. **EssayLayout's new meta props default to the site-wide og-image
   + `article` type.** This means every existing Phase-2 / Phase-4
   essay picked up og + twitter card meta tags with **zero per-essay
   edits**. The cost of the new feature was paid in one file.

7. **Lighthouse run is deferred to post-deployment.** No live URL =
   no useful Lighthouse run. We have a manual bundle-size + a11y
   audit in `LIGHTHOUSE.md` with predicted scores; the formal run
   replaces it after deploy.

## Phase 5 retro

### What worked

- **Three phases in one autonomous day.** Phase 3 (Sandbox), Phase
  4 (foundations essays), and Phase 5 (algorithms + launch prep)
  all closed in one session. The parallel sub-agent fan-out pattern
  established in Phase 4 (single-file deliverable, hard guardrails,
  self-running gauntlet, single commit per agent) held up cleanly
  in Phase 5 for both algorithm essays.
- **Per-plan acceptance criteria with explicit verification.** Plan
  05-03 (Deutsch) explicitly required the sub-agent to verify all
  four oracle buttons gave the correct verdict before committing.
  The sub-agent did the actual `runCircuit` calls and reported the
  table in the commit report. This kind of "show your work"
  acceptance gate is the right shape for any plan where math
  correctness matters.
- **Plan-level guardrails kept sub-agents in their lane.** Both
  algorithm essays touched exactly one file each. Phase 4's
  Astro/JSX `{` gotcha got flagged in the briefing and neither
  sub-agent hit it (Plan 05-02's report explicitly notes "no JSX-`{`
  accidents").
- **The `MiniBloch` / `CircuitView` extraction pattern is the right
  shape.** Both components are slim renderers that reuse pure math
  from the sandbox lib without dragging in any sandbox singletons.
  This is now the canonical way to compose sandbox visualization
  inside essays.

### What we learned

- **The "why should I care" opener is worth the extra 2-3 paragraphs.**
  Both algorithm essays open with a concrete classical pain-point,
  then promise the quantum result. The framing makes the rest of the
  essay self-motivating — readers don't have to ask "why does this
  matter?" because they were just told.
- **Test mirrors of source-file canonical lists (concept-map node
  list, nav-graph CHAIN, sandbox-links STARTERS) catch drift cheaply.**
  Every Phase-5 source change that touched a canonical list also
  touched its test mirror — and the tests caught two would-be
  drift bugs during the closeout.
- **YAGNI on the in-essay editable circuit embed paid off.** The two
  algorithm essays only needed to SHOW circuits, not let readers
  edit them. The slim read-only `CircuitView` was the right shape;
  we never needed the editable embed we considered.

### What should change for v2

- **The parallel sub-agent fan-out wants a thin orchestrator skill.**
  Phase 4 + Phase 5 each ran the same shape: dispatch N sub-agents
  with N nearly-identical briefings (single-file deliverable +
  guardrails + gauntlet + commit format). A skill that takes the
  plan + the per-agent variances + the briefing template would
  remove ~80% of the boilerplate. Defer until a third phase wants
  the same shape.
- **The Astro/JSX `{` gotcha needs to live in the EssayLayout
  comment block.** Every essay author hits it eventually. A
  one-liner in EssayLayout pointing to "wrap math in MathBlock or
  use HTML entities" would save the next author the build error.
- **Bundle-size budget per route should be codified.** We've stayed
  under budget by intuition. A `tests/perf/bundle-size.test.ts`
  that asserts per-route gzipped HTML stays under a documented
  threshold would catch a regression at PR time. Defer to v2 launch
  polish or first v2 essay.

## Deferred / open items

- **Live deployment.** v1 launch happens after Phase 5 closes; user
  will pick a host then. Recommended path per launch-announcement
  checklist: Cloudflare Pages (free, edge-cached, no account juggling)
  via `npx wrangler pages deploy ./dist --project-name quantum`.
- **Formal Lighthouse run.** Replaces `LIGHTHOUSE.md` post-deploy.
- **PNG fallback for og-image.** Generate at deploy time from
  `public/og/quantum.svg` (one-shot ImageMagick or sharp call).
- **3+ dev-friend feedback round.** Inherited from Phase 2's
  REMAINING.md (now deleted; tracked in `LAUNCH-ANNOUNCEMENT.md`
  pre-launch checklist).
- **Phase 2 REMAINING.md** — deleted. Its contents (deploy, deploy,
  feedback, Lighthouse) are tracked in the launch announcement
  pre-launch checklist.
- **E2E test harness (Playwright).** Deferred to v2 (user decision).
- **Bundle-size regression budget.** Deferred to v2 (Phase 5 retro
  item).
- **Concept-map progress indicator.** Deferred to v2.
- **v2 essays:** teleportation, superdense coding, Grover, QFT,
  Shor. Roughly in that order. No timeline.

## How to resume / what's next

**v1 launch (not a phase, just a task):**

1. Pick a deploy host (Cloudflare Pages recommended).
2. Set `SITE_URL` env var to the deployed origin.
3. `npx astro build && {deploy command}`.
4. Replace `<URL>` and `<REPO>` placeholders in
   `LAUNCH-ANNOUNCEMENT.md`.
5. Generate a PNG fallback for `public/og/quantum.svg` (modern
   scrapers handle SVG, legacy ones don't).
6. Run `npx lighthouse {URL}/{route}` against every route; replace
   `LIGHTHOUSE.md` with the formal report. If any score is more
   than 5 points below the predicted table, investigate.
7. Send to 3+ working-dev friends; do the "one thing clicked / one
   thing didn't" round; iterate at least once.
8. Post the announcement. Don't refresh karma counts obsessively.

**v2 planning (a future milestone, not the next phase):**

The user gets to decide the v2 milestone shape. Probable contents
based on what's deferred:
- Algorithm track 2: teleportation, superdense coding
- Algorithm track 3: Grover, QFT, Shor (depends on reader feedback)
- Quality-of-life: bundle-size budgets, E2E harness, concept-map
  progress, optional analytics if user changes mind
- Voice / pedagogy: pick-a-path alternate reading order, in-essay
  quiz format

v2 should start with a fresh PROJECT.md milestone bump + new
ROADMAP — not phases bolted onto v1.
