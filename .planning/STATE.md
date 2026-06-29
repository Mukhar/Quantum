# State

*Last updated: 2026-06-28 — Phase 1 (theme system) complete.
Entering Phase 2 (feedback form).*

## Project Reference

See: `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`,
`.planning/ROADMAP.md`, `.planning/MILESTONES.md`.

- **Core value:** Earn dev trust with real, inspectable math — then
  unlock creativity by letting readers actually play.
- **Current milestone:** **v2.0 — Return, Comfort, Voice.** Closes
  three v1 gaps (no save, no theme choice, no in-site feedback)
  without breaking the static-site, no-backend posture.
- **v1.0 status:** **Code-complete, deploy pending.** All 5 v1
  phases shipped (146 tests, 16 pages). Deploy is a parallel ops
  task — runs whenever ready, does NOT block v2 phase work.

## Current Position

| | |
|---|---|
| Phase | Phase 2 — Feedback form (next to plan) |
| Plan | — |
| Status | Phase 1 committed; entering Phase 2 |
| Last activity | 2026-06-28 — Phase 1 theme system complete (+21 tests) |

## Where we are

### v2.0 — current

- [x] **Phase 1** — Theme system (Tailwind class-based dark mode +
  FOUC-killer + widget audit). Requirements: THEME-01..04.
  THEME-05 (Playwright visual regression) deferred to Phase 4.
- [ ] **Phase 2** — Feedback form (`/feedback` + Apps Script + Sheet).
  Requirements: FB-01..05.
- [ ] **Phase 3** — Circuit gallery (IndexedDB, `/gallery`, sandbox
  drawer, export/import). Requirements: GAL-01..09.
- [ ] **Phase 4** — v2 launch polish. Requirements: OPS-01..03.

### v1.0 — archived

All 5 phases done. Artifacts archived under
`.planning/phases/_archive-v1/`. v1 history captured in
`.planning/MILESTONES.md`.

## Parallel ops task (not a phase): v1 deploy

When ready (does not block v2):

1. **Pick a deploy host.** Cloudflare Pages recommended (free,
   global edge, zero config for static Astro output):
   ```bash
   npx wrangler pages deploy ./dist --project-name quantum
   ```
   Netlify / Vercel / GitHub Pages also work. Set the `SITE_URL`
   env var to the deployed origin so `sitemap.xml` emits absolute URLs.
2. **Build + deploy:**
   ```bash
   SITE_URL=https://your-url npx astro build
   ```
3. **Generate a PNG og-image** from `public/og/quantum.svg`.
4. **Replace `<URL>` and `<REPO>` placeholders** in
   `.planning/phases/_archive-v1/05-algorithms/LAUNCH-ANNOUNCEMENT.md`.
5. **Formal Lighthouse pass:** `npx lighthouse {URL}/{route}
   --output html --preset=mobile` against every route.
6. **Feedback round:** 3+ dev friends, "one thing clicked / one
   didn't", capture in `docs/feedback/v1-round1.md`.
7. **Post the announcement.**

## Active architectural decisions carrying into v2

The decisions below survived all of v1 and are locked into the v2
PROJECT.md key-decisions table. No re-litigation needed at planning time:

1. **Reactivity = vanilla TS + in-repo `signal<T>`** — survived
   every v1 phase. Stay with it.
2. **Sandbox visualization re-use pattern:** when an essay needs
   sandbox-renderer math, extract a slim component (`MiniBloch`,
   `CircuitView`); do NOT import sandbox hydrators coupled to the
   singleton sandbox store. The gallery in Phase 3 must follow the
   same rule.
3. **Build-time circuit encoding for deep links:** `SandboxLink` and
   `CircuitView` both encode `Circuit` literals at Astro frontmatter
   time. Gallery export/import in Phase 3 should reuse this codec.
4. **Cross-essay nav in essay frontmatter,** asserted by
   `tests/essays/nav-graph.test.ts`. Header nav additions for
   `/gallery` and `/feedback` in v2 must touch the matching test
   mirror.
5. **Test mirrors of source canonical lists** (concept-map nodes,
   nav chain, sandbox-link starters). Whenever a v2 plan touches any
   of these, touch the mirror in the same commit.
6. **No analytics. Ever.** Re-ratified at v2 entry. The "no
   tracking" line is a core promise of the launch announcement.

## v2 open questions (resolve during plan-phase)

From `docs/plans/2026-06-26-v2-design.md` §8:

1. **Gallery sharing UX** — should each gallery entry expose a "copy
   shareable URL" button? Design doc leans yes (trivial via existing
   codec). Decide in Phase 3 planning.
2. **Anonymous session-ID in feedback form** — random UUID in
   `localStorage` so repeat feedback from the same person links in
   the Sheet? Lightweight, no PII. Decide in Phase 2 planning.
3. **Theme toggle behavior with scroll-tied animations** — Phase 2
   v1 essays use scroll-driven transforms. Verify they don't depend
   on a fixed-theme assumption during Phase 1 widget audit.
4. **Cloud sync trigger** — explicitly deferred from v2. Schema is
   sync-ready. Revisit at v2 retro.

## Open risks for v2

- **Three.js dark-mode** — scene background + axis/arrow colors
  currently hardcoded. Mitigation in Phase 1: drive via CSS variables.
- **Apps Script latency / outages** — feedback form must always offer
  a `mailto:` fallback. Tracked as FB-04.
- **IndexedDB hostile in Safari private browsing** — must show banner
  and fall back to in-memory list. Tracked as GAL-07.
- **Gallery thumbnails ballooning storage** — soft warning at 100
  entries. Tracked as GAL-09.
- **Scope creep into community / sync features** — locked at v3 in
  PROJECT.md "Out of Scope" section.

## Accumulated context (carries across phases)

- v1 archive layout: `.planning/phases/_archive-v1/{02,03,04,05}-*`.
- v1 SUMMARY files are the best reference for "how a phase looked
  when it shipped" — same template applies to v2 SUMMARY files.
- KaTeX is still loaded via cdn.jsdelivr.net (v1 risk that carried
  over). If Phase 1 already self-hosts the stylesheet as part of the
  theme work, retire this risk from the v1 launch checklist too.
