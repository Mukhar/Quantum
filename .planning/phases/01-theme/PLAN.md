# Phase 1 Plan — Theme system

**Phase goal:** Class-based dark mode with `localStorage`-persisted user
override, FOUC-free first paint, and AA contrast across every existing
widget on both themes.

**Depends on:** v1.0 (every existing page/component).

**Source of truth:** `docs/plans/2026-06-26-v2-design.md` §3.2.

## Definition of Done (phase-level)

1. `tailwind.config.mjs` uses `darkMode: 'class'`.
2. `localStorage["quantum/theme"]` stores one of `"light" | "dark" | "system"`.
3. Inline blocking `<head>` script (≤ 30 lines, no imports) reads storage +
   `prefers-color-scheme` and sets `<html class="dark">` before any CSS paints.
   Lives in every page-owning shell: `EssayLayout`, `SandboxLayout`,
   `src/pages/index.astro`, `src/pages/404.astro`.
4. 3-state header toggle (Light → Dark → System → Light) appears on every
   page; persists across navigation and reloads; no FOUC when toggling.
5. Every widget in the audit list (PHASE-CONTEXT.md) renders AA-contrast
   on both themes — verified by Playwright screenshot diff.
6. Three.js Bloch sphere re-reads scene + arrow + axis colors from CSS
   custom properties on `themechange` event; no scene rebuild required.
7. Playwright visual-regression harness runs `npm run test:visual` and
   captures both themes for every route. Baselines committed.
8. Bundle delta: shared theme code ≤ 1 KB gzipped vs main; per-page ≈ 0.
9. No new runtime framework dependencies (Tailwind + ~20-line inline script
   + Playwright as devDep only).
10. Header changes update `tests/essays/nav-graph.test.ts` in the same
    commit (carry the v1 nav-mirror discipline).

## Plans

> Execute in order. 01-01 (foundation) must land first — every other plan
> depends on Tailwind `darkMode: 'class'` being live and CSS vars existing.
> 01-02, 01-03, 01-04 can be dispatched in parallel sub-agent contexts
> (touch disjoint files). 01-05 is closeout — needs everything else green.
> 01-06 is an optional side-quest (KaTeX self-host) — fold in if cheap,
> defer otherwise.

### 01-01 — Theme foundation (Tailwind + storage + FOUC killer + CSS vars)

**Why:** Every other plan reads from this. Without `darkMode: 'class'` and
CSS variables, widget audits can't ship dark variants; without the FOUC
killer, theme toggling looks broken on first paint.

**Deliverables:**

- `tailwind.config.mjs` — set `darkMode: 'class'`. Add a `theme.extend.colors`
  block exposing semantic tokens (`surface`, `surface-elevated`, `ink`,
  `ink-muted`, `accent`, `accent-emphasis`, `axis-x`, `axis-y`, `axis-z`,
  `bloch-arrow`, `canvas-bg`). Map each to a CSS custom property
  (e.g. `surface: 'rgb(var(--color-surface) / <alpha-value>)'`).
- `src/styles/theme.css` (new) — define light defaults under `:root`
  and dark overrides under `.dark`. RGB triplets so Tailwind can apply
  `/ <alpha-value>`. Import from `tailwind.config.mjs` global CSS chain
  (likely already loaded via the layouts; add an `@import` if not).
- `src/lib/theme.ts` (new) — three exports:
  - `type Theme = "light" | "dark" | "system"`
  - `getStoredTheme(): Theme` (defaults to `"system"`)
  - `applyTheme(theme: Theme): void` — writes storage, computes effective
    light/dark from `prefers-color-scheme` if `"system"`, toggles
    `<html class="dark">`, dispatches `window.dispatchEvent(new Event("themechange"))`.
  - `subscribeToSystemTheme(cb: () => void): () => void` — wraps a
    `matchMedia("(prefers-color-scheme: dark)")` listener so widgets can
    re-render when the OS theme flips while the user is on `"system"`.
- `src/lib/themeBootstrap.ts` (new) — exports a single string constant
  `BOOTSTRAP_SCRIPT` containing the ~20-line synchronous code that:
  1. Reads `localStorage["quantum/theme"]`.
  2. Falls back to `matchMedia` if `"system"` or missing.
  3. Sets `document.documentElement.classList.add("dark")` if effective dark.
  4. Wraps everything in a `try {} catch {}` so storage-disabled browsers
     still render (default = light).
- Modify all four page shells to inline the bootstrap script as the very
  first `<head>` child (before any `<link rel="stylesheet">`):
  - `src/layouts/EssayLayout.astro`
  - `src/layouts/SandboxLayout.astro`
  - `src/pages/index.astro`
  - `src/pages/404.astro`
  Pattern: `<script is:inline set:html={BOOTSTRAP_SCRIPT}></script>`.
- `tests/theme/themeBootstrap.test.ts` (new) — unit-test the bootstrap
  string against a happy-DOM environment: stored "light" → no class;
  stored "dark" → class added; stored "system" + matchMedia dark → class
  added; missing storage → matchMedia consulted; storage throws → no
  crash, no class.

**Acceptance:**

- `npm run build` is clean, types clean, no new console warnings.
- Manually setting `localStorage["quantum/theme"] = "dark"` and reloading
  any page renders dark on first paint (no flash of light).
- All four layouts contain the inline script as their first `<head>` child.
- Bundle delta ≤ 1 KB gzipped on the shared chunk (check with
  `npm run build && du -sk dist/_astro/*.css` before/after).

---

### 01-02 — Header theme toggle (3-state)

**Why:** The toggle is the *only* visible affordance of the theme system.
Independent from 01-01 once `applyTheme()` exists.

**Deliverables:**

- `src/components/ThemeToggle.astro` (new) — `<button>` rendering one of
  three icons (sun / moon / monitor) based on current state. Inline SVG
  (no icon library). Aria-label updates per state ("Switch to dark
  theme", etc.). Tooltip via `title=`.
- Client script bundled with the component (`<script>` block inside the
  Astro component): reads stored theme on mount, sets initial icon,
  attaches click handler that cycles Light → Dark → System → Light and
  calls `applyTheme()` from 01-01.
- Embed `<ThemeToggle />` in the shared header. The header lives inside
  each layout — find where each layout renders its top nav and insert
  the toggle in the top-right corner (after the nav links). Both
  `EssayLayout` and `SandboxLayout`; the homepage and 404 also need a
  toggle (place it in a `position: absolute; top-4 right-4` floating
  wrapper since they don't have a header).
- `tests/components/themeToggle.test.ts` (new) — render the component,
  simulate clicks, assert the cycle: initial state mirrors storage,
  click 1 → next state, click 4 → back to start. Storage written each
  click. `themechange` event fired each click.
- `tests/essays/nav-graph.test.ts` — extend to assert the toggle node
  is present on every essay layout test fixture (carry the nav-mirror
  discipline from v1).

**Acceptance:**

- Toggle visible top-right on every route.
- Clicking cycles through 3 states; icon + aria-label updates each click.
- Reload preserves selection.
- No FOUC when toggling (CSS transitions OK; layout shift = 0).
- nav-graph test passes with the toggle assertion.

---

### 01-03 — Widget palette audit + dark variants

**Why:** A toggle is worthless if half the widgets stay light-themed.
Touches many files but each is small + isolated. Use the audit
checklist from PHASE-CONTEXT.md as the work-driving list.

**Deliverables:**

For each widget below: add `dark:` variants using the semantic tokens
from 01-01. Where the widget hardcodes a color in inline `<style>` or
JS, refactor to read from a CSS var or Tailwind token first.

- **`src/components/MathBlock.astro`** — KaTeX math wrapper. KaTeX ships
  with white-background assumptions; override its `.katex` rule
  (probably in `src/styles/global.css` or wherever KaTeX CSS is loaded)
  to inherit color from parent (`.katex { color: inherit; }`). No KaTeX
  background overrides; the surface beneath handles it.
- **`src/components/BlochSphere/Sphere3D.client.ts`** — `scene.background`
  reads from `getComputedStyle(document.documentElement).getPropertyValue('--color-canvas-bg')`
  on init; same lookup on `themechange` event. (Detailed Bloch reactivity
  belongs to 01-04 — this plan just adds the dark-aware default colors
  to the semantic tokens in 01-01.)
- **`src/components/BlochSphere/Polar2D.client.ts`** — canvas 2D fallback;
  replace hard-coded `"#ffffff"` / `"#000000"` with CSS var reads.
- **`src/components/ProbabilityBars.astro`** — bar fills via `bg-accent`
  / `dark:bg-accent` (already semantic via 01-01). Labels: `text-ink`
  with `dark:` variants.
- **`src/components/StateVector.astro`** — code-font readout: switch from
  `text-slate-700` to `text-ink` semantic token.
- **`src/components/sandbox/QuantumCanvas.astro`** — palette must produce
  visible colors on either background. Two options: (a) paint own
  background via `bg-canvas-bg`, or (b) add dark-variant fills to each
  drawn shape. Prefer (a) — single token, no per-shape work.
- **`src/components/sandbox/QuantumTones.astro`** — keyboard visualization:
  black/white keys via semantic tokens (`bg-surface` / `bg-ink`).
- **`src/components/GateButtons.astro`** — button bg + hover; `bg-surface-elevated dark:bg-surface-elevated`.
- **`src/components/sandbox/ResultsPanel.astro`** — table / bar text.
- **`src/lib/annotations.ts`** — if it injects DOM with inline styles,
  switch to class-based + semantic tokens.
- **`src/components/ConceptMap.astro`** — node fills, edge strokes, dim
  vs primary tier; ensure tier colors are CSS-var-driven so dark-mode
  primary is still saturated.
- **`src/components/MiniBloch.astro`** — passes through to BlochSphere
  but may have its own border/background.
- **`src/components/CircuitView.astro`** — slot SVG/grid: gate cell
  borders, wires, gate fills.
- **`src/components/MathNerds.astro`** — collapsible appendix bg.
- **`src/components/SandboxLink.astro`** — CTA pill bg + text.
- **`src/components/RotationSlider.astro`** — slider track / thumb.
- Shiki code blocks (if used in essays) — Shiki has its own light/dark
  theme registration; switch to the `css-variables` or dual-theme
  approach. Likely in `astro.config.mjs` Shiki config.
- KaTeX font color (covered above) — verify on `/qubit` essay first
  since it's the math-heaviest.

**Acceptance:**

- Every widget visually identifiable on both themes (manual smoke).
- No hardcoded `#hex` color in any widget source file (grep:
  `rg '#[0-9a-fA-F]{6}' src/components src/lib` should be empty or
  documented exceptions only).
- 01-05 visual regression will assert this objectively.

---

### 01-04 — Three.js Bloch sphere theme reactivity

**Why:** Three.js doesn't watch CSS; we must wire it explicitly. The
Bloch sphere is the visual centerpiece of the site; if it stays
white-on-dark it ruins the theme.

**Deliverables:**

- `src/components/BlochSphere/Sphere3D.client.ts` — extract a
  `readThemeColors()` helper that reads CSS custom properties via
  `getComputedStyle(document.documentElement).getPropertyValue(...)`
  and returns `{ bg, arrow, axisX, axisY, axisZ, label }` as Three
  `Color` instances.
- On mount: call `readThemeColors()` and apply to `scene.background`,
  arrow material, axis line materials, label text materials.
- On `themechange` event: re-call `readThemeColors()`, re-apply to
  existing materials in place (no scene rebuild — just material color
  updates). Trigger one render pass.
- On `prefers-color-scheme` system change (when user is on `"system"`):
  same handler (the bootstrap from 01-01 dispatches `themechange` in
  both user-toggle and system-flip paths).
- `tests/components/blochSphere.theme.test.ts` (new) — mock Three.js
  in happy-DOM; dispatch `themechange` event; assert material `.color`
  setters were called with the dark palette values.
- `src/components/BlochSphere/index.astro` — ensure the script tag that
  loads `Sphere3D.client.ts` runs *after* the bootstrap from 01-01 has
  already set the theme class (no race).

**Acceptance:**

- Toggle theme on a page with `<BlochSphere />` (e.g. `/qubit`); the
  3D scene background, arrows, and axes update in-place without
  full re-init.
- No visible flicker on toggle.
- Polar2D fallback (no WebGL) also updates — already covered in 01-03.

---

### 01-05 — Playwright visual regression harness

**Why:** "AA contrast across every existing widget on both themes" is
not human-auditable at scale. Pin it with screenshots.

**Deliverables:**

- `npm install -D @playwright/test` — devDep only, no runtime impact.
- `playwright.config.ts` (new at repo root) — single project: chromium,
  viewport 1280×800, base URL `http://localhost:4321`. Workers = 1 to
  avoid output races. Snapshot dir `tests/visual/__screenshots__/`.
- `tests/visual/themes.spec.ts` (new) — one `test.describe` per route
  in the canonical list (essays + sandbox + gallery placeholder +
  index + 404). Per route: load page, take screenshot in light mode,
  toggle theme, wait for `themechange` to settle, take dark screenshot.
- `tests/visual/__screenshots__/` (new dir, gitignore exception) —
  committed baseline images.
- `package.json` scripts:
  - `"test:visual": "playwright test"`
  - `"test:visual:update": "playwright test --update-snapshots"`
- README section (under "Development"): one-paragraph note on running
  visual tests and how to update baselines after intentional UI change.

**Acceptance:**

- `npm run build && npm run preview &` then `npm run test:visual`
  passes locally on a clean clone.
- Intentionally changing one widget color and re-running shows a
  visual diff failure with screenshot artifact.
- CI doesn't run visual tests yet (out of scope — note in SUMMARY).

---

### 01-06 (optional side-quest) — Self-host KaTeX CSS

**Why:** Retires the v1 open risk in `_archive-v1/05-algorithms/LAUNCH-ANNOUNCEMENT.md`
("KaTeX is loaded via cdn.jsdelivr.net"). Cheap to do during theme
work since we're already touching KaTeX rendering.

**Deliverables:**

- `npm install katex` (or copy the CSS file directly from the package
  if we want zero deps). Pin version.
- Replace the CDN `<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@..."/>`
  in `EssayLayout.astro` (and anywhere else) with a local import:
  `import 'katex/dist/katex.min.css';` at the top of the layout.
- Move font files if needed (KaTeX bundles them; usually handled by
  bundler asset copying).
- Delete the v1 risk note from `STATE.md` accumulated context.

**Acceptance:**

- No `cdn.jsdelivr.net` references in shipped HTML.
- Math still renders on every essay (smoke test `/qubit`).
- Build still passes; bundle delta ≤ +50 KB (KaTeX CSS is small).

Defer if the import path fights with the Astro/Tailwind chain — note
in SUMMARY and keep the v1 risk.

## Threat model (PLAN section)

- **FOUC on first paint (UX regression).** Mitigation: 01-01 inline
  bootstrap script runs *before* any stylesheet `<link>`, sets class
  synchronously, no IIFE wrapping that could be deferred. Verified
  manually + by 01-05 visual baseline.
- **`localStorage` disabled.** Bootstrap wraps in `try/catch`,
  defaults to system. No crash. Covered by 01-01 test.
- **Race between Three.js init and theme class application.** 01-04
  ensures Sphere3D reads CSS vars *after* DOM is ready and class is
  set; the bootstrap runs synchronously in `<head>` so this is safe
  by construction.
- **Visual regression baselines diverge across machines.** Pin
  viewport, single worker, disable subpixel font smoothing
  differences via Playwright's `animations: 'disabled'` + a small
  CSS reset in the snapshot helper.
- **Bundle bloat from per-component dark variants.** Tailwind's
  JIT only emits used classes; `dark:` variants don't add to
  un-toggled pages. Net delta verified ≤ 1 KB.

## Open questions resolved by this plan

- **Scroll-tied animation theme-awareness** (from PHASE-CONTEXT.md):
  Plan 01-03 inspects `src/lib/scrolly.ts` and `src/lib/annotations.ts`
  during the widget audit. If they hardcode colors, they get refactored
  to CSS vars in the same plan. No separate decision needed.

## Carryover into Phase 2/3/4

- All new pages (`/feedback` Phase 2, `/gallery` Phase 3) inherit
  theme-aware semantic tokens automatically.
- The `ThemeToggle` component is reused as-is in all new pages.
- The Playwright harness in 01-05 is extended in Phase 4 launch polish
  to cover the new routes.
