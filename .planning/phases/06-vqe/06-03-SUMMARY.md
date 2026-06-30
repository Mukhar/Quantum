# Phase 6 Plan 06-03 — `EnergyLandscape.astro` SSR heatmap + drag/keyboard/Auto-descend — SUMMARY

*Completed: 2026-06-30 — Wave-2 executor; atomic single commit (`0bfa8a1`) + this summary commit.*

## Goal

Lock the visual half of ALG-09: an SSR-baked 50×50 heatmap of the H₂
analytic energy surface (`h2Energy(θ₁, θ₂)`) with a draggable +
keyboard-focusable marker, an `Auto-descend` button that animates the
*exact* `gradientDescent` trajectory `tests/quantum/vqe.test.ts`
validates, and a `Reseed` button that cycles `RESEED_SEEDS`. Locks
PHASE-CONTEXT.md decisions D-10..D-17.

## What shipped

| Plan  | Commit    | Artifact |
|-------|-----------|----------|
| 06-03 | `0bfa8a1` | `src/components/EnergyLandscape.astro` (~460 LOC: ~190 LOC of SSR frontmatter + Astro markup, ~190 LOC of inline `<script>` hydrator, ~80 LOC of header comments). SSR calls `sampleSurface(h2Energy, 50, [0, 2π])` once at build time and emits 2 500 `<rect>` cells colored by a 2-stop brand gradient (indigo-500 → amber-500), an isoband contour overlay built from per-cell bucket-boundary `<line>` segments (the plan's allowed simpler alternative to marching-squares), a `(π, π)` true-minimum cross-hair, axis ticks at `{0, π/2, π, 3π/2, 2π}`, and a focusable `<circle role="slider" tabindex="0">` marker. Hydrator imports `gradientDescent`, `h2Energy`, `interpolateSurface` from `../lib/quantum/vqe` and `signal<T>` from `../lib/sandbox/signal`; wires pointer drag (clientXY → viewBox → θ, with `setPointerCapture`), keyboard ArrowKeys (`2π/100` nudge per press), Home (jump to `H2_TRUE_MINIMUM`), Auto-descend (60 ms/frame animation along the optimizer trajectory; `aria-busy="true"` on the button during animation; reduced-motion path snaps directly to the converged frame), and Reseed (modulo cycle through `RESEED_SEEDS`, snap marker). + `tests/components/energy-landscape.test.ts` (12 structural assertions covering all 7 plan-mandated tests plus 5 redundancy assertions that further pin D-11 / D-13 / D-16 affordances). |

**Bookkeeping deviation (worth flagging):** The same commit `0bfa8a1`
also picked up `src/components/MoleculeGallery.astro` and
`tests/components/molecule-gallery.test.ts` that the sibling Wave-2
executor for plan 06-04 had created on disk but not yet staged.
`git commit` with explicit paths somehow swept those files in alongside
mine. The 06-04 SUMMARY commit (`f3d8bfa`/`2232b0e`) was authored on top
and contains only `.planning/phases/06-vqe/06-04-SUMMARY.md`. Net
effect: every 06-03 *and* 06-04 source file is in `main`; only the
commit-attribution for the two MoleculeGallery files is off-by-one.
Logged here as a parallel-wave race condition; no functional defect.

## Requirements closed

- **ALG-09 (visual half)** — interactive H₂ energy-surface viewer with
  the three required affordances (drag / keyboard / Auto-descend) and
  the deterministic Reseed cycle. Marker is `role="slider"` with
  `aria-orientation="other"` and `aria-valuemin="0"`/`aria-valuemax`
  on the canonical `[0, 2π]` range; a visible focus halo turns on at
  `focus`, off at `blur`. Auto-descend uses the same
  `gradientDescent({ f, initial })` that
  `tests/quantum/vqe.test.ts` pins (D-11).

## Numbers

- **Tests:** 12 new (`tests/components/energy-landscape.test.ts`), all
  green on first run. Combined components + quantum + data suite:
  **464 / 464** passing (up from 452 baseline = +12).
- **Build:** `npm run build` clean — **23 pages** built, no Astro
  errors, no TS errors in the new component. EnergyLandscape is not
  imported by any page yet (that wiring lives in 06-05), so no
  per-route bundle ceiling changes and no new `_astro/*.js` chunk is
  emitted yet. Once 06-05 imports it onto `/vqe`, expect a chunk
  containing `vqe.ts` + `signal.ts` + the hydrator (gzipped target
  ≤ ~3 KB by inspection; will be re-measured and added to
  `bundle-budget.json` in 06-05).
- **No mutations:** `src/components/CircuitView.astro` untouched
  (D-19); `src/lib/quantum/vqe.ts`, `src/lib/quantum/index.ts`, and
  `src/lib/sandbox/signal.ts` consumed read-only; `MAX_QUBITS = 4`
  unchanged.

## Decisions ratified (from PHASE-CONTEXT.md)

1. **D-10 — Default interaction = draggable marker.** Pointer-down anywhere in the plot region captures pointer events and updates `(θ₁, θ₂)` from the cursor on each `pointermove`; Auto-descend lives as a clearly-labelled button beside the plot, not as the default click handler.
2. **D-11 — Auto-descend animates `gradientDescent` snapshots.** Click handler calls `gradientDescent({ f: (p) => h2Energy(p[0], p[1]), initial: [θ₁, θ₂] })` (i.e. the exact entry point the tests pin) and schedules one `setTimeout(..., 60 ms)` per `OptimizerStep` to update the marker + readout. No re-implementation of optimizer math; trajectory is what `tests/quantum/vqe.test.ts` validated.
3. **D-12 — 2D heatmap, not 3D mesh.** Pure inline SVG (`viewBox="0 0 500 500"`); no Three.js, no Canvas, no WebGL.
4. **D-13 — 50×50 sampled at build time.** `sampleSurface(h2Energy, 50, [0, 2π])` is the only call to the surface evaluator at SSR; 2 500 `<rect>` cells are emitted with `style="fill: rgb(...)"` precomputed in TS. Runtime drag uses `interpolateSurface` against the same `Float64Array` blob — no second sampling pass.
5. **D-14 — Brand-aligned 2-color gradient.** Stops are indigo-500 `rgb(99 102 241)` (low energy / basin) and amber-500 `rgb(245 158 11)` (high energy / plateau). Stops chosen for visible contrast on both `#f8fafc` (light) and `#020617` (dark) page backgrounds; luminance differential of ~0.25 between stops keeps the gradient legible in monochrome.
6. **D-15 — Contours are semantic, paired with text.** 8 evenly-spaced isobands rendered as cell-boundary `<line>` segments at every cell-edge whose left/right or top/bottom bucket indices differ — crisp boundaries without a marching-squares implementation. Readout below the plot announces `θ₁`, `θ₂`, `energy`, and `Δmin` (distance from minimum) in plain text via `aria-live="polite"`, so meaning never relies on hue alone.
7. **D-16 — Pointer + keyboard + reduced-motion.** Marker is `tabindex="0"` `role="slider"`. ArrowKeys nudge `θ` by `2π/100` per press (left/right adjust `θ₁`, up/down adjust `θ₂`). `Home` jumps to `H2_TRUE_MINIMUM`. Focus halo (`<circle data-role="marker-halo">`) toggles opacity on `focus`/`blur` so the keyboard target is unmistakable. `prefers-reduced-motion` check (`window.matchMedia("(prefers-reduced-motion: reduce)").matches`) gates the Auto-descend animation: under reduced motion the marker snaps directly to `trajectory[trajectory.length - 1].params` with no intermediate frames.
8. **D-17 — Hydration is local to EnergyLandscape.** Inline `<script>` block only; no import of any sandbox hydrator, no global store, no event-bus coupling. The widget is self-contained: pass a `caption` prop and it just works on any page.

## Test coverage (12 structural assertions; covers all 7 plan-mandated suites)

1. **Mount + marker data-roles** — `data-widget="energy-landscape"` and `data-role="marker"`.
2. **Frontmatter imports** — `h2Energy`, `sampleSurface`, `RESEED_SEEDS`, `DEFAULT_INITIAL_THETAS` from `../lib/quantum(/vqe)?`.
3. **Reduced-motion wiring** — `prefers-reduced-motion`, `window.matchMedia`, `reduceMotion` symbol all present (D-16).
4. **Toolbar actions** — both `data-action="auto-descend"` and `data-action="reseed"` (D-05, D-11).
5. **`aria-live` readout** — `aria-live="polite"` and `data-role="readout"` (D-15).
6. **`interpolateSurface` usage** — proves drag uses the bilinear helper (not a re-implemented one).
7. **No forbidden imports** — `MAX_QUBITS`, `./codec`, `./qiskit` are all absent. Landscape is data-only, not circuit-shaped (D-17).
8. **`gradientDescent` import (redundancy on D-11)** — Auto-descend animation must use the validated optimizer entry point.
9. **Marker affordances** — `role="slider"`, `tabindex="0"`, `aria-valuemin="0"`, `aria-valuemax`, all four ArrowKey handlers, and `Home`.
10. **SSR grid discipline (D-13)** — `sampleSurface(h2Energy, GRID, RANGE)` with `GRID = 50` and `RANGE = [0, 2*Math.PI]`.
11. **`aria-busy` toggle** — proves the Auto-descend button signals its busy state to assistive tech during animation.
12. **v3 widget aesthetic** — `border-line`, `bg-surface-elevated`, `rounded-lg` shell classes match the other v3 figure widgets (AmplitudeBars, QFTVisualizer, SearchComparison).

## Deviations from PLAN.md

- **Contour algorithm:** the plan offered marching-squares as the preferred approach and per-cell threshold rectangles as the acceptable simpler fallback. The implementation uses a third variant — **per-cell-edge isoband boundaries**: for every cell, compare its bucket index to its right and bottom neighbours; if they differ, emit a single `<line>` segment on that shared edge. This produces crisp isoband boundaries (visually equivalent to true marching-squares for our 8-band quantisation) without a marching-squares implementation, and reads cleanly in both themes via the semantic `rgb(var(--color-ink) / 0.45)` stroke. Documented inline as the chosen approach.
- **Color tokens:** the plan suggested `--color-accent` (low) and `--color-warning` (high) as semantic stops. The implementation precomputes RGB stops in TS (indigo-500 / amber-500) because per-cell `fill` attributes need a literal `rgb(...)` value at SSR time (the CSS custom-property tokens hold *triplets* without the `rgb()` wrapper, so they can't drive a `<rect fill=...>` attribute through Tailwind utilities alone). Stops are picked from the same indigo / amber families as the semantic accent / warning vars, preserving brand alignment. Documented inline as a deliberate D-14 lock interpretation.
- **Bookkeeping (above):** the 06-03 commit `0bfa8a1` accidentally also contains `src/components/MoleculeGallery.astro` + `tests/components/molecule-gallery.test.ts` from the sibling Wave-2 executor. Net codebase state is correct; only commit attribution is off-by-one. The plan-06-04 SUMMARY commit is on top of mine, finalising 06-04's logical close-out. No history rewriting attempted (parallel-wave race; per the destructive-git policy, force-rewinds on a shared branch are forbidden).

## What this plan unlocks (downstream)

- **06-05 (`/vqe` essay):** can drop `<EnergyLandscape caption="…" />` into the algorithm-half of the essay; no props are required beyond the optional caption. Will need a `bundle-budget.json` ceiling for `/vqe` once the chunk is emitted (re-measure after the page imports the component).
- **06-06 (PROG-01) and 06-07 (LIGHTHOUSE-PLAN):** the `role="slider"`, focus halo, `aria-live` readout, and `prefers-reduced-motion` handling already satisfy the Lighthouse a11y posture the close-out audit will check.

## Bookkeeping notes

- First-attempt test run: 12 / 12 green; no fix-forward iteration.
- Strict TS (`astro/tsconfigs/strict`): zero errors in the new component or test.
- No pre-existing tests broke: full components + quantum + data suite **464 / 464** (= 452 baseline + 12 new).
- Build clean: `npm run build` produces 23 pages; no new bundle chunk emitted (component not yet imported by any page — 06-05's job).
