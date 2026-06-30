# Roadmap

The current ROADMAP is empty — v3.0 just shipped and the next
milestone hasn't been started yet. Run `/gsd-new-milestone` to
scope v3.1 / v4.0 (requirements → research → roadmap).

## Shipped milestones

- ✅ **v1.0 — Initial public release** (2026-06-26) —
  7 essays + sandbox + canvas + tones + challenges + concept-map +
  SEO. 146 tests / 16 pages. See
  [`.planning/MILESTONES.md`](MILESTONES.md#v10--initial-public-release-shipped-2026-06-26)
  + archive under `.planning/phases/_archive-v1/`.
- ✅ **v2.0 — Return, Comfort, Voice** (code-complete 2026-06-28) —
  Three-state theme toggle, `/feedback` (Apps Script), IndexedDB
  circuit gallery. 247 tests / 19 pages / +44 KB site bundle. See
  [`.planning/MILESTONES.md`](MILESTONES.md#v20--return-comfort-voice-code-complete-2026-06-28)
  + archive under `.planning/phases/_archive-v2/`.
- ✅ **v3.0 — Algorithms × Use Cases** (feature-complete 2026-06-30) —
  5 algorithm essays (Teleportation / Superdense / Grover / Shor /
  VQE) interleaved with the use case each unlocks; Qiskit export
  ships everywhere; localStorage-only progress indicator on the
  concept map. 658 tests / 24 pages / 7 phases / 38 plans / 65
  commits. See [`milestones/v3.0-ROADMAP.md`](milestones/v3.0-ROADMAP.md),
  [`milestones/v3.0-REQUIREMENTS.md`](milestones/v3.0-REQUIREMENTS.md),
  and [`MILESTONES.md`](MILESTONES.md#v30--algorithms--use-cases-feature-complete-2026-06-30).
  Per-phase artifacts still live under `.planning/phases/0X-*` —
  will move to `_archive-v3/` at next milestone start.

## Parallel ops tasks (carry-over, not phase work)

These run whenever ready; none block the next milestone.

### v1 deploy

- Pick deploy host (Cloudflare Pages recommended:
  `npx wrangler pages deploy ./dist --project-name quantum`)
- `SITE_URL=https://your-url npx astro build`
- Generate PNG og-image from `public/og/quantum.svg`
- Replace `<URL>` / `<REPO>` placeholders in v1 launch announcement
- Formal Lighthouse pass against every route

Tracked under
`.planning/phases/_archive-v1/05-algorithms/LAUNCH-ANNOUNCEMENT.md`.

### v2 deploy

- Provision Apps Script per `docs/apps-script.md`
- Set `PUBLIC_FEEDBACK_URL`
- Lighthouse run
- Launch announcement

Tracked under `.planning/phases/_archive-v2/04-launch-polish/`.

### v3 deploy

- Replace `<URL>` / `<REPO>` placeholders in
  [`.planning/phases/06-vqe/V3-LAUNCH-ANNOUNCEMENT.md`](phases/06-vqe/V3-LAUNCH-ANNOUNCEMENT.md)
- Deploy build (same Cloudflare Pages flow)
- Formal Lighthouse mobile a11y ≥ 95 across all 24 routes in both
  themes per
  [`.planning/phases/06-vqe/LIGHTHOUSE-PLAN.md`](phases/06-vqe/LIGHTHOUSE-PLAN.md)
- Live screen-reader pass (VoiceOver / NVDA) on `EnergyLandscape`,
  `MoleculeGallery`, `LargeCircuitView`, `RSACountdown`, PROG-01
  announcements
- Real-device mobile check of `LargeCircuitView` horizontal-scroll
- Launch-day 9-step smoke test per V3-LAUNCH-ANNOUNCEMENT.md
- Announce (HN / tweet / r/QuantumComputing / r/programming
  variants ready in V3-LAUNCH-ANNOUNCEMENT.md)
