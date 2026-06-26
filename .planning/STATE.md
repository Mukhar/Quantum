# State

*Last updated: 2026-06-26 — Phase 5 complete. **v1 launch-ready
modulo deployment.** No further phase work; only a deploy + post-launch
feedback round remains before v1 is publicly live.*

## Project Reference

See: `.planning/PROJECT.md` and `.planning/ROADMAP.md`.

- **Core value:** Earn dev trust with real, inspectable math — then
  unlock creativity by letting readers actually play.
- **Current status:** v1 milestone is **code-complete**. All 5
  roadmap phases are done. The only remaining work before v1 ships
  is a deployment + the feedback round documented in
  `.planning/phases/05-algorithms/LAUNCH-ANNOUNCEMENT.md`.

## Where we are

- [done] **Phase 1** — Foundation simulator (`8148713`).
- [done] **Phase 2** — Flagship qubit essay. (Phase 2 `REMAINING.md`
  folded into Phase 5's launch-prep artifacts; the deploy + feedback
  + Lighthouse items live in the launch announcement pre-launch
  checklist.)
- [done] **Phase 3** — Quantum Sandbox + creative outputs.
  See `.planning/phases/03-sandbox/03-SUMMARY.md`.
- [done] **Phase 4** — Foundations essay track (4 new essays +
  concept-map homepage).
  See `.planning/phases/04-foundations/04-SUMMARY.md`.
- [done] **Phase 5** — Algorithm track + v1 launch prep.
  See `.planning/phases/05-algorithms/05-SUMMARY.md`. Highlights:
  - 146 tests passing.
  - 16 pages build clean.
  - 7 essays live: qubit → superposition → measurement → gates →
    entanglement → cnot-bell → deutsch. ConceptMap has zero dimmed
    nodes.
  - `CircuitView.astro` slim read-only embed primitive shipped
    (same extraction pattern as MiniBloch in Phase 4).
  - SEO + presentation infra in place: robots.txt, sitemap.xml
    endpoint, og + twitter card meta on every essay + homepage,
    site-wide SVG og-image, friendly 404, canonical link tags
    available via EssayLayout props.
  - `LIGHTHOUSE.md` captured as a manual bundle-size + a11y audit
    with predicted scores; formal run replaces it post-deploy.
  - `LAUNCH-ANNOUNCEMENT.md` Markdown draft committed with
    pre-launch checklist.

## Next action (v1 launch — not a phase, just a task)

**The user explicitly chose NO deployment in Phase 5.** v1 launch
itself is a future task, not the next phase. When ready:

1. **Pick a deploy host.** Cloudflare Pages recommended (free,
   global edge, zero config for static Astro output):
   ```bash
   npx wrangler pages deploy ./dist --project-name quantum
   ```
   Netlify / Vercel / GitHub Pages also work. Whatever host gets
   picked, set the `SITE_URL` env var to the deployed origin so
   `sitemap.xml` emits absolute URLs.
2. **Build + deploy:**
   ```bash
   SITE_URL=https://your-url npx astro build
   {deploy command}
   ```
3. **Generate a PNG og-image** from `public/og/quantum.svg`
   (modern scrapers handle SVG, legacy ones don't). One-shot
   ImageMagick / sharp call.
4. **Replace `<URL>` and `<REPO>` placeholders** in
   `.planning/phases/05-algorithms/LAUNCH-ANNOUNCEMENT.md`.
5. **Formal Lighthouse pass:** `npx lighthouse {URL}/{route}
   --output html --preset=mobile` against every route. If any
   score lands more than 5 points below the predicted table in
   `LIGHTHOUSE.md`, investigate before posting. Replace
   `LIGHTHOUSE.md` with the formal report.
6. **Feedback round:** send to 3+ working-dev friends. Ask "one
   thing that clicked, one thing that didn't." Iterate at least
   once. Capture in `docs/feedback/v1-round1.md`.
7. **Post the announcement** (HN, r/QuantumComputing, social).

## Active architectural decisions carrying into v2

The decisions below survived Phase 5 and should carry into any v2
work without re-litigation:

1. **Reactivity = vanilla TS + in-repo `signal<T>`** — survived
   every phase. Stay with it.
2. **Sandbox visualization re-use pattern:** when an essay needs
   sandbox-renderer math, **extract a slim component** (`MiniBloch`,
   `CircuitView`) that reuses pure pieces; do NOT import sandbox
   hydrators coupled to the singleton sandbox store.
3. **Build-time circuit encoding for deep links:** `SandboxLink`
   and `CircuitView` both encode `Circuit` literals at Astro
   frontmatter time. Static href, zero runtime cost, CI catches
   broken codec changes.
4. **Cross-essay nav in essay frontmatter**, asserted by
   `tests/essays/nav-graph.test.ts`. Centralized JSON would be
   worse; the test mirror catches drift cheaply.
5. **Test mirrors of source canonical lists** (concept-map nodes,
   nav chain, sandbox-link starters). Whenever a v2 plan touches
   any of these, touch the mirror in the same commit.
6. **Algorithm essays use the "why should I care" opener.** Carry
   this convention into any v2 algorithm essay (teleportation,
   Grover, QFT, Shor).
7. **No analytics. Ever.** Ratified at Phase 5 entry; the
   "no tracking" line is a core promise of the launch announcement.

## Open risks for the v1 launch

- **No formal Lighthouse run yet.** Predictions in `LIGHTHOUSE.md`
  are confident but unverified. Mobile LCP on `/qubit` and `/gates`
  (the two Three.js essays) is the most likely target to miss; if it
  does, the mitigation is to drop 3D from `/gates` and reuse the 2D
  SVG fallback.
- **KaTeX is loaded via cdn.jsdelivr.net.** If the launch
  audience's region has bad jsdelivr latency, math-render time
  becomes a perf risk. Mitigation: self-host the CSS at deploy time
  (trivial path swap, KaTeX CSS is a single file).
- **OG image is SVG, not PNG.** Modern scrapers handle it; legacy
  Facebook + some link-preview tools might fall back to the
  metadata title only. PNG-generation step is in the
  `LAUNCH-ANNOUNCEMENT.md` pre-launch checklist.
- **No E2E coverage.** 146 unit tests. The post-launch feedback
  round IS the smoke test. If readers report broken interactions,
  that's the v2 trigger for Playwright (deferred from Phase 5).

## What's after launch

**v2 milestone scoping** — a fresh PROJECT.md milestone bump.
Probable contents based on what Phase 5 deferred:
- Algorithm track 2: teleportation, superdense coding
- Algorithm track 3 (reader-driven): Grover, QFT, Shor
- Quality-of-life: bundle-size regression budget, E2E harness,
  concept-map progress indicator, opt-in interaction analytics if
  user changes mind on the "no tracking" rule
- Pedagogy experiments: pick-a-path reading order, in-essay quiz
  format

v2 should NOT be bolted onto v1's `.planning/`. Bump the milestone,
write a new ROADMAP, and let v2 start clean.
