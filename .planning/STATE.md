# State

*Last updated: 2026-06-30 — v3.0 milestone shipped and archived.
No active milestone; ready for `/gsd-new-milestone` to scope the
next cycle.*

## Project Reference

See: `.planning/PROJECT.md`, `.planning/MILESTONES.md`,
`.planning/ROADMAP.md` (currently empty post-v3).
Milestone archives: `.planning/milestones/v3.0-ROADMAP.md`,
`.planning/milestones/v3.0-REQUIREMENTS.md`.

- **Core value:** Earn dev trust with real, inspectable math — then
  unlock creativity by letting readers actually play.
- **Last shipped milestone:** **v3.0 — Algorithms × Use Cases**
  (feature-complete 2026-06-30). 5 algorithm essays interleaved
  with the use case each unlocks; Qiskit export ships everywhere;
  localStorage-only progress indicator. 658 tests, 24 pages.
- **v1.0 status:** Code-complete, deploy pending. 146 tests, 16
  pages. Carry-over operational task.
- **v2.0 status:** Code-complete, deploy pending. 247 tests, 19
  pages. Carry-over operational task.
- **v3.0 status:** Feature-complete, deploy pending. 658 tests, 24
  pages. Carry-over operational task — shares same Cloudflare
  Pages flow as v1/v2.

## Current Position

| | |
|---|---|
| Active milestone | — (none) |
| Active phase    | — (none) |
| Last activity   | 2026-06-30 — v3.0 milestone archived (`.planning/milestones/v3.0-*.md`, ROADMAP collapsed, PROJECT.md evolved, REQUIREMENTS.md archived, MILESTONES.md updated, git tag `v3.0`) |
| Next action     | `/gsd-new-milestone` to scope next cycle, OR run the v1/v2/v3 deploy carry-over checklist below |

## Where we are

### v3.0 — shipped (archived 2026-06-30)

All 7 phases done; 658 tests / 24 pages / zero new runtime deps.
Full per-phase breakdown lives in
[`.planning/milestones/v3.0-ROADMAP.md`](milestones/v3.0-ROADMAP.md).

### v2.0 — code-complete (archived)

All 4 phases done. Artifacts under `.planning/phases/_archive-v2/`.

### v1.0 — shipped (archived)

All 5 phases done. Artifacts under `.planning/phases/_archive-v1/`.

## Parallel ops tasks (carry-over, not phase work)

All three deploys (v1, v2, v3) share the same Cloudflare Pages
recommended flow:

```bash
SITE_URL=https://your-url npx astro build
npx wrangler pages deploy ./dist --project-name quantum
```

### v1 deploy

1. Pick a deploy host (Cloudflare Pages recommended).
2. Build + deploy.
3. Generate a PNG og-image from `public/og/quantum.svg`.
4. Replace `<URL>` and `<REPO>` placeholders in the v1 launch
   announcement: `.planning/phases/_archive-v1/05-algorithms/LAUNCH-ANNOUNCEMENT.md`.
5. Formal Lighthouse pass against every route.

### v2 deploy

1. Provision Apps Script per `docs/apps-script.md`.
2. Set `PUBLIC_FEEDBACK_URL`.
3. Lighthouse run.
4. Launch announcement per
   `.planning/phases/_archive-v2/04-launch-polish/LAUNCH-ANNOUNCEMENT.md`.

### v3 deploy

1. Replace `<URL>` and `<REPO>` placeholders in
   `.planning/phases/06-vqe/V3-LAUNCH-ANNOUNCEMENT.md`.
2. Deploy build.
3. Formal Lighthouse mobile a11y ≥ 95 across all 24 routes in
   both `prefers-color-scheme: light` and dark per
   `.planning/phases/06-vqe/LIGHTHOUSE-PLAN.md`.
4. Run launch-day 9-step smoke test per V3-LAUNCH-ANNOUNCEMENT.md.
5. Live screen-reader pass (VoiceOver / NVDA) on `EnergyLandscape`,
   `MoleculeGallery`, `LargeCircuitView`, `RSACountdown`, PROG-01
   announcements.
6. Real-device mobile check of `LargeCircuitView`
   horizontal-scroll behaviour.
7. Announce (HN / tweet / r/QuantumComputing / r/programming
   variants ready in V3-LAUNCH-ANNOUNCEMENT.md).

## Active architectural decisions carried from v1 → v2 → v3

The decisions below survived v1, v2, and v3 and are locked into
the PROJECT.md key-decisions table. No re-litigation when scoping
the next milestone:

1. **Reactivity = vanilla TS + in-repo `signal<T>`** (no React /
   Preact runtime cost).
2. **Sandbox visualization re-use pattern:** when an essay needs
   sandbox-renderer math, extract a slim component (`MiniBloch`,
   `CircuitView`, `MultiBlochPanel`); do NOT import sandbox
   hydrators coupled to the singleton sandbox store.
3. **Build-time circuit encoding for deep links:** `SandboxLink`
   and `CircuitView` encode `Circuit` literals at Astro frontmatter
   time. Qiskit-export reuses this codec.
4. **Cross-essay nav in essay frontmatter,** asserted by
   `tests/essays/nav-graph.test.ts`. Any new essay must touch the
   test mirror in the same commit.
5. **Test mirrors of source canonical lists** (concept-map nodes,
   nav chain, sandbox-link starters, bundle-budget, sitemap). Touch
   mirrors in the same commit when routes change.
6. **No analytics. Ever.** Re-ratified at v2 and v3 entry.
7. **Simulator stays at 4 qubits.** Hard cap (REQ-13) survived all
   three milestones.
8. **Qiskit export is the bridge** for circuits that exceed 4
   qubits (Shor on N=15) or that readers want to run on real
   hardware.

## Accumulated context (carries across milestones)

- Archive layouts: `.planning/phases/_archive-v1/{02,03,04,05}-*`,
  `.planning/phases/_archive-v2/{01,02,03,04}-*`. v3 per-phase
  artifacts still under `.planning/phases/0X-*` (will move to
  `_archive-v3/` at next milestone start).
- v1+v2+v3 SUMMARY files are the best reference for "how a phase
  looked when it shipped" — same template applies.
- KaTeX still loaded via `cdn.jsdelivr.net` (deferred from v2 and
  v3). Track as a nice-to-have if it shows up in OPS-04 bundle
  audit.
- Playwright visual regression (THEME-05) still deferred from v2;
  not blocking.
- Bundle ceiling convention: `Math.ceil((actual_gzip * 1.2) /
  1024) * 1024`. Recompute every phase that touches a route.

## Deferred Items

Items acknowledged and deferred at v3.0 milestone close on
2026-06-30:

| Category | Item | Status |
|----------|------|--------|
| ops      | Formal Lighthouse mobile a11y ≥ 95 audit on all 24 v3 routes in both themes | DEFERRED to launch-day per `.planning/phases/06-vqe/LIGHTHOUSE-PLAN.md` |
| ops      | Live VoiceOver/NVDA pass on EnergyLandscape, MoleculeGallery, LargeCircuitView, RSACountdown, PROG-01 announcements | DEFERRED to launch-day |
| ops      | Real-device mobile check of LargeCircuitView horizontal-scroll | DEFERRED to launch-day |
| ops      | v1 deploy + post-launch feedback round | OPEN — carry-over from v1.0 |
| ops      | v2 deploy (Apps Script + Lighthouse + announcement) | OPEN — carry-over from v2.0 |
| ops      | v3 deploy (Cloudflare Pages + Lighthouse + smoke test + announce) | OPEN — newly carried from v3.0 |
| feature  | KaTeX self-host | DEFERRED to v4 |
| feature  | Playwright visual-regression harness (THEME-05) | DEFERRED from v2 |
| feature  | Sandbox import of Qiskit text (reverse direction) | DEFERRED to v4+ |
| feature  | 8-qubit simulator extension | DEFERRED — Qiskit export covers the only algorithm needing it |
| feature  | Cross-device gallery sync (sync layer) | DEFERRED to v4 |
| feature  | HHL / QPCA / QAOA / error-correction essays | DEFERRED to v4+ |
| feature  | Quantum-sensing / metrology essays | DEFERRED to v4+ |
| feature  | Pick-a-path reading order, in-essay quizzes | DEFERRED to v4+ |
