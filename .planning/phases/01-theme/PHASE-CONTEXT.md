# Phase 1 Context: Theme system

*Created: 2026-06-28 as part of v2.0 milestone bump.*
*Status: Awaiting `/gsd-discuss-phase 1` then `/gsd-plan-phase 1`.*

## Goal

Class-based dark mode with `localStorage`-persisted user override,
FOUC-free first paint, and AA contrast across every existing widget on
both themes.

## Requirements covered

- **THEME-01** — 3-state header toggle (Light / Dark / System), persisted
- **THEME-02** — FOUC-free first paint via inline `<head>` script
- **THEME-03** — AA contrast on every existing widget in both themes
- **THEME-04** — Three.js Bloch re-reads CSS-var colors on toggle
- **THEME-05** — Playwright visual-regression on every route in both themes

## Source design

Source of truth: `docs/plans/2026-06-26-v2-design.md` §3.2.

Key choices already locked there:
- Tailwind `darkMode: 'class'` (not `'media'`-only)
- `localStorage["quantum/theme"]` — `"light" | "dark" | "system"`
- Inline blocking script in `<head>` of `BaseLayout.astro` reads
  storage + `prefers-color-scheme` and sets `<html class="dark">`
  before any CSS applies
- 3-state toggle: Light → Dark → System → Light

## Widget audit checklist (from design doc §3.2)

Every existing widget must be touched:

- [ ] KaTeX math blocks — `dark:text-slate-100`; override KaTeX's
      white-background assumptions
- [ ] Three.js Bloch sphere — scene `background` from CSS var; arrow
      + axis colors need dark variants
- [ ] ProbabilityBars — bar colors hold contrast on both themes
- [ ] StateVector readout — code-font color
- [ ] Sandbox grid + gate palette
- [ ] Quantum Canvas — palette must produce visible colors on either
      background (or paint its own background)
- [ ] Quantum Tones — keyboard visualization
- [ ] Annotations / pinned notes
- [ ] Concept-map homepage
- [ ] Code blocks (Shiki or similar)

## Open question to resolve in plan-phase

Scroll-tied animations in v1 essays (Phase 2 work in `src/lib/scrolly.ts`)
use scroll-driven transforms — verify they don't depend on a fixed-theme
assumption. If they do, drive scroll-tied colors from CSS vars too.

## Constraints

- No new runtime framework dependencies. Pure Tailwind + ~20-line
  inline script.
- Bundle delta: theme code must add ≤ 1 KB gzipped to the shared
  baseline; per-page deltas should be near-zero.
- Carry the v1 architectural decision: header changes update the
  test mirror in `tests/essays/nav-graph.test.ts` in the same commit.

## Side-quest opportunity

The v1 launch checklist has "KaTeX is loaded via cdn.jsdelivr.net" as
an open risk. If Phase 1 self-hosts the KaTeX stylesheet as part of the
theming work (one CSS file, trivial path swap), retire that v1 risk
too — note in the phase SUMMARY.
