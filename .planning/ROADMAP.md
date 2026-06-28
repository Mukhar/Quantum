# Roadmap: Quantum v2.0 — Return, Comfort, Voice

## Overview

v2.0 closes the three obvious gaps that will be visible the moment v1
hits readers — no way to save circuits, no theme choice, no in-site
feedback channel — without breaking the static-site, no-backend posture
that defines the project.

Phase order is deliberate, smallest-blast-radius first → biggest:

1. **Theme system first.** Touches every page, so subsequent phases
   are theme-aware from birth and we avoid auditing widgets twice.
2. **Feedback form second.** Tiny and self-contained, plus it gives
   us a feedback channel *during* the rest of v2 dev.
3. **Circuit gallery third.** The meatiest feature; depends on the
   existing sandbox circuit codec from v1 Phase 3.
4. **Launch polish fourth.** Closing-the-loop: a11y/Lighthouse audit,
   dark-mode visual QA pass, v2 announcement.

Phase numbering is **reset** for v2 — v1's phases 1–5 are archived
under `.planning/phases/_archive-v1/`. v1 historical context lives in
`.planning/MILESTONES.md`.

## Phases

- [ ] **Phase 1: Theme system** — Tailwind class-based dark mode, persisted user override, FOUC-killer, full widget audit, Playwright visual regression
- [ ] **Phase 2: Feedback form** — `/feedback` page + Apps Script + private Google Sheet + honeypot + mailto fallback
- [ ] **Phase 3: Circuit gallery** — IndexedDB-backed save/load shelf, `/gallery` page, sandbox save drawer, export/import, schema migrations
- [ ] **Phase 4: v2 launch polish** — Lighthouse + a11y audit, dark-mode visual QA, v2 announcement draft

## Phase Details

### Phase 1: Theme system

**Goal:** Class-based dark mode with `localStorage`-persisted user
override, FOUC-free first paint, and AA contrast across every existing
widget on both themes.
**Depends on:** v1.0 (every existing page).
**Requirements:** THEME-01, THEME-02, THEME-03, THEME-04, THEME-05
**Success Criteria:**
  1. Header has a 3-state toggle (Light / Dark / System); choice
     persists across reloads in `localStorage["quantum/theme"]`
  2. First paint is FOUC-free in both themes (inline `<head>` script
     runs before CSS applies)
  3. KaTeX, Three.js Bloch, ProbabilityBars, StateVector, sandbox
     grid + palette, Quantum Canvas, Quantum Tones, annotations,
     ConceptMap, and Shiki code blocks all hit WCAG 2.2 AA contrast
     in both themes
  4. Three.js Bloch scene re-reads background/axis colors from CSS
     vars on toggle — no reload required
  5. Playwright snapshots every route in both themes and fails CI on
     contrast/layout regression

**Plans:** TBD (created by `/gsd-plan-phase 1`)

### Phase 2: Feedback form

**Goal:** A single `/feedback` page POSTs to a Google Apps Script Web
App that appends rows to a private Google Sheet you own. Mailto
fallback on failure; honeypot for spam.
**Depends on:** Phase 1 (theme system) — form should ship theme-aware.
**Requirements:** FB-01, FB-02, FB-03, FB-04, FB-05
**Success Criteria:**
  1. `/feedback` renders the form with Type / Subject / Message /
     optional Email fields and submits to the Apps Script URL
  2. Submission appends a row with `(timestamp, type, subject, message,
     email, page_referrer)` to the configured Sheet
  3. `/feedback/thanks` confirms success; a "send another" link returns
     to the form
  4. Honeypot drops bot submissions silently
  5. Apps Script failure or network error surfaces a `mailto:` fallback
     link with prefilled subject/body
  6. `docs/apps-script.md` documents the one-time Apps Script setup

**Plans:** TBD (created by `/gsd-plan-phase 2`)

### Phase 3: Circuit gallery

**Goal:** Local "my saved circuits" shelf at `/gallery` plus a save
drawer in `/sandbox`. IndexedDB-backed, schema-versioned, exportable.
Loading a gallery entry reuses the existing URL-fragment codec — no
new hydration path.
**Depends on:** Phase 1 (theme), Phase 2 (feedback channel handy for
beta-testers reporting gallery issues), plus the v1 URL-fragment codec.
**Requirements:** GAL-01, GAL-02, GAL-03, GAL-04, GAL-05, GAL-06,
  GAL-07, GAL-08, GAL-09
**Success Criteria:**
  1. User can save the current sandbox circuit with a name + optional
     tags; save renders an ≤ 8 KB PNG thumbnail
  2. `/gallery` grid shows all saved circuits (thumbnail, name,
     `qubits·steps`, relative updated-at) with a clear empty state
  3. Clicking a gallery card opens it in `/sandbox` via the existing
     URL-fragment codec (no separate "load circuit" code path)
  4. Rename / duplicate / delete actions work and persist to IndexedDB
  5. Export entire gallery (or a single entry) to JSON; re-import
     validates schema and never overwrites existing entries
  6. Schema is versioned with migration tests (fake-indexeddb)
  7. Private-browsing fallback: banner + in-memory list for the session
  8. Gallery bundle lazy-loaded; essay bundles unchanged
  9. Soft warning at 100 entries; storage-quota error surfaces a toast

**Plans:** TBD (created by `/gsd-plan-phase 3`)

### Phase 4: v2 launch polish

**Goal:** Final audit + announcement.
**Depends on:** Phase 3
**Requirements:** OPS-01, OPS-02, OPS-03
**Success Criteria:**
  1. Lighthouse mobile a11y ≥ 95 on `/gallery` and `/feedback` in both
     themes
  2. Dark-mode visual QA walkthrough recorded against the §3.2 widget
     checklist in `docs/plans/2026-06-26-v2-design.md`
  3. v2 announcement draft committed (mirrors v1's `LAUNCH-ANNOUNCEMENT.md`
     structure)
  4. Bundle size delta vs v1 captured; no essay bundle regresses

**Plans:** TBD (created by `/gsd-plan-phase 4`)

## Progress

**Execution Order:** Phases run in numeric order: 1 → 2 → 3 → 4.

| Phase | Plans Complete | Status      | Completed  |
|-------|----------------|-------------|------------|
| 1. Theme system        | 0/TBD | Not started | — |
| 2. Feedback form       | 0/TBD | Not started | — |
| 3. Circuit gallery     | 0/TBD | Not started | — |
| 4. v2 launch polish    | 0/TBD | Not started | — |

**Parallel ops task (not a phase):** v1 deploy + post-launch feedback
round. Tracked in
`.planning/phases/_archive-v1/05-algorithms/LAUNCH-ANNOUNCEMENT.md`.
Runs whenever ready; does not block v2 phase work.
