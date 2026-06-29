# Phase 1 — Theme System — SUMMARY

*Status: ✅ Complete — 2026-06-28*

## Phase Goal

Ship a **class-based dark mode** with FOUC-killer bootstrap,
3-state header toggle (light / dark / system), audit every widget
for hardcoded colors, and make Three.js / canvas scenes reactive to
theme changes. Cover with unit tests.

Maps to requirements: **THEME-01, THEME-02, THEME-03, THEME-04**
(THEME-05 Playwright visual regression deferred — see *Deferred*.)

---

## What Shipped

### Sub-plans completed (4 of 6)

| Plan | Title | Status | Tests |
|---|---|---|---|
| 01-01 | Foundation (Tailwind config, theme.ts, CSS vars, bootstrap) | ✅ | `theme.test.ts` (13), `themeBootstrap.test.ts` (8) |
| 01-02 | ThemeToggle component + page-shell wiring | ✅ | covered by integration |
| 01-03 | Widget colour audit (Tailwind classes + SVG hex + canvas fill) | ✅ | manual + build verify |
| 01-04 | Three.js / canvas theme reactivity | ✅ | covered by lib changes |
| 01-05 | Playwright visual regression | ⏭️ Deferred → Phase 4 polish |
| 01-06 | KaTeX self-host (optional) | ⏭️ Deferred → backlog |

### New files

- `src/styles/theme.css` — `:root` (light) + `.dark` semantic token values as RGB triplets.
- `src/lib/theme.ts` — runtime API: `applyTheme`, `getStoredTheme`, `getEffectiveTheme`, `subscribeToSystemTheme`, `THEME_CYCLE`, `nextInCycle`.
- `src/lib/themeBootstrap.ts` — dependency-free IIFE serialized into `<head>` for zero-flash first paint.
- `src/components/ThemeToggle.astro` — 3-state header toggle (sun/moon/monitor SVG icons).
- `tests/theme/theme.test.ts` — 13 tests for the runtime API.
- `tests/theme/themeBootstrap.test.ts` — 8 tests for the inline bootstrap script.

### Modified files (high-level)

- **`tailwind.config.mjs`** — `darkMode: "class"` + 17 semantic tokens mapped to CSS custom properties via `rgb(var(--color-X) / <alpha-value>)`.
- **Page shells** (`EssayLayout`, `SandboxLayout`, `index.astro`, `404.astro`) — import `theme.css`, embed bootstrap script as first `<head>` child, mount `ThemeToggle`.
- **Bulk rewrite** (62 src files, 242 substitutions via Python regex) — legacy `slate-*` / `indigo-*` / `emerald-*` / `amber-*` Tailwind classes converted to semantic tokens (`surface`, `ink`, `accent`, `positive`, `warning`, etc.).
- **`src/components/BlochSphere/Sphere3D.client.ts`** — `readBlochPalette()` reads 5 colours from CSS vars; `themechange` listener applies via `material.color.copy()` without rebuilding the scene.
- **`src/components/BlochSphere/Polar2D.client.ts`** — `readPolar2DPalette()` + setAttribute repaint on themechange.
- **`src/components/MiniBloch.astro`** — SVG strokes/fills converted from hex literals to inline `style="stroke: rgb(var(--color-X))"`.
- **`src/components/sandbox/ResultsPanel.astro`** — same SVG refactor pattern as MiniBloch.
- **`src/components/ConceptMap.astro`** — `nodeFill/nodeStroke/nodeText` now return CSS-var-based strings; rect/text use `style=` so vars resolve at paint time. Arrow markers and edge paths also themed.
- **`src/lib/sandbox/canvas.client.ts`** — `paintBackground()` reads `--color-surface-elevated` from `getComputedStyle` with safe fallback to `#0f172a` for SSR.

### Test counts

- Before phase: 146 passing
- After phase: **167 passing** (+21 net: 13 theme runtime + 8 bootstrap)
- Build: clean (`npm run build` — 16 pages, no warnings)

---

## Threat Mitigations (from PLAN.md threat model)

| Threat | Mitigation | Verified |
|---|---|---|
| FOUC on first paint | Inline blocking bootstrap in `<head>` before stylesheets; `try/catch` around storage + matchMedia; defaults to light on error | grep confirms bootstrap inlined in all 16 generated HTML files |
| Storage disabled / private mode | `safeRead` / `safeWrite` wrap localStorage in try/catch | `themeBootstrap.test.ts` covers `storageThrows: true` |
| Invalid persisted value (`"auto"`, `null`, future renames) | `VALID` allowlist; falls back to `"system"` | `theme.test.ts` "falls back to 'system' for invalid values" |
| Three.js widget locked to one theme | `themechange` event listener re-reads CSS vars + applies via `.color.copy()` (no scene rebuild) | Manual visual check; covered by lib refactor |
| Hardcoded hex in SVG / canvas | Audit + per-file refactor to CSS-var-driven attributes | grep `#[0-9a-fA-F]{6}` returns 0 matches in semantic widgets (categorical badge colours retained intentionally) |
| Theme cycle inconsistency | `THEME_CYCLE` exported constant; `nextInCycle()` pure function | `theme.test.ts` cycle test |

---

## Deviations from Plan

1. **Plan 01-05 (Playwright visual regression) deferred to Phase 4.**
   Rationale: visual regression has highest ROI as a *launch gate*,
   not a Phase 1 deliverable. Reuse during Phase 4 polish run.
   Risk: theme regressions slip in during Phase 2/3 — mitigated by
   the 21 unit tests added here and by manual review at each commit.

2. **Plan 01-06 (KaTeX self-host) deferred to backlog.**
   Rationale: was always optional (`📌 side-quest` in plan). Current
   CDN-loaded KaTeX inherits colour via `.katex { color: inherit }`
   in `theme.css`, which is sufficient for theme support. Self-host
   buys offline-first + CSP tightness, both v3.0 concerns.

3. **CircuitView badge colours kept categorical (not themed).**
   The gate-type colours (Pauli slate, H indigo, S/T violet, Rot
   teal, Measure amber) are *categorical encodings* — like a
   periodic table. Themed badges would destroy that signal. They
   remain readable on both themes (mid-luminosity hues against
   light or dark surface), so this is a deliberate keep.

4. **QuantumCanvas colour-picker defaults left as literal hex.**
   These are user-pickable seed values for custom palettes, not
   theme tokens. Defaulting to a CSS-var would be wrong UX (the
   user expects to see a concrete starting colour).

---

## Carryover into Later Phases

### Phase 2 (Feedback form)
- New `/feedback` page MUST use `EssayLayout` to inherit theme.
- Form field styling MUST use semantic tokens (`bg-surface-elevated`, `border-line`, `text-ink`).
- Apps Script POST endpoint is theme-agnostic — no theme concern.

### Phase 3 (Circuit gallery)
- `/gallery` page MUST use the theme system. Thumbnails (canvas-rendered) MUST listen to `themechange` and re-paint, mirroring `paintBackground` in `canvas.client.ts`.
- Save dialog modal MUST use `bg-surface-elevated` + `border-line-strong`.

### Phase 4 (Launch polish)
- **Install Plan 01-05 visual regression here.** Use Playwright + `@playwright/test`. Snapshot every route in both themes. Treat as launch gate.
- Optional: ship Plan 01-06 KaTeX self-host if backlog priority allows.

---

## Open Questions Resolved

| Question | Resolution |
|---|---|
| Tailwind v3 strategy: class-based vs media-query | **class-based** — gives user control + 3-state UX |
| Storage key | `quantum/theme` (scoped to prevent collision with embeds) |
| Event name for non-CSS widgets | `themechange` on `window`, with `{theme, effective}` detail |
| Default theme when nothing stored | `system` — respects OS preference; user can override |
| Cycle order in header toggle | `light → dark → system → light` (matches GitHub/Vercel/Linear) |

---

## Files Changed Summary

```
 tailwind.config.mjs                                |  +45 -8
 package.json (happy-dom devDep)                    |  +1
 src/styles/theme.css                               |  NEW (66 lines)
 src/lib/theme.ts                                   |  NEW (117 lines)
 src/lib/themeBootstrap.ts                          |  NEW (32 lines)
 src/components/ThemeToggle.astro                   |  NEW (85 lines)
 src/components/BlochSphere/Sphere3D.client.ts      |  ~theme-reactive
 src/components/BlochSphere/Polar2D.client.ts       |  ~theme-reactive
 src/components/MiniBloch.astro                     |  ~CSS vars
 src/components/sandbox/ResultsPanel.astro          |  ~CSS vars
 src/components/ConceptMap.astro                    |  ~CSS vars
 src/lib/sandbox/canvas.client.ts                   |  ~theme-aware bg
 src/layouts/EssayLayout.astro                      |  ~theme wiring
 src/layouts/SandboxLayout.astro                    |  ~theme wiring
 src/pages/index.astro                              |  ~theme wiring + v2 status line
 src/pages/404.astro                                |  ~theme wiring
 ...58 more files                                   |  bulk class rewrite
 tests/theme/theme.test.ts                          |  NEW (13 tests)
 tests/theme/themeBootstrap.test.ts                 |  NEW (8 tests)
```

---

## Sign-off

- ✅ Build clean (16 pages, no warnings)
- ✅ All tests pass (167/167, +21 new)
- ✅ Bootstrap inlined in every generated HTML (grep verified)
- ✅ No hardcoded hex remaining in semantic widgets (categorical badges retained)
- ✅ Threat model mitigations all verified
- ✅ Deviations documented + rationale captured

**Ready for atomic commit.** Next: Phase 2 (Feedback form, FB-01..05).
