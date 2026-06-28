# Phase 2 Summary — Flagship Interactive "What is a Qubit?" Essay

**Status:** Code-complete. Deploy + dev-friend feedback round remain
(see `REMAINING.md`).

**Shipped:** 2026-06-25

## What we built

A complete, polished, interactive-first concept essay at `/qubit`.
The reader lands on a hook, scrolls through prose interleaved with
three directly-manipulable widgets (Bloch sphere, ProbabilityBars,
StateVector — all sharing one simulator), continuous rotation sliders
(Rx/Ry/Rz), and an annotation system that pins sticky notes to any
widget and persists them in `localStorage`. KaTeX math renders in a
collapsible "math nerds" appendix. A two-question self-test closes
the essay.

## Plans landed

| Plan  | What                                                           | Commit |
|-------|----------------------------------------------------------------|--------|
| 02-02 | Rx/Ry/Rz factories + simulator `applyRotation` + 11 tests      | `8793525` |
| 02-01 | EssayLayout + KaTeX MathBlock/MathNerds + scrolly + page stub  | follow-on |
| 02-03 | Per-page sim store + ProbabilityBars + StateVector + GateButtons | follow-on |
| 02-04 | BlochSphere widget (Three.js 3D + SVG 2D fallback, draggable)  | follow-on |
| 02-05 | RotationSlider (base-state snapshot semantics) + annotations  | follow-on |
| 02-06 | Final essay copy + a11y/perf pass + homepage update           | latest |

## Numbers

- **Tests:** 32 passing (21 simulator + 11 rotation correctness assertions).
- **Bundle weight on `/qubit`:** ~137 KB gzipped total (4.78 KB main
  bundle + 130.86 KB lazy-loaded Three.js chunk). Budget was 200 KB.
- **Homepage:** Three-free; loads only the main bundle.
- **New routes:** 1 (`/qubit`).
- **New widgets:** 6 (ProbabilityBars, StateVector, GateButtons,
  BlochSphere {3D, 2D}, RotationSlider, AnnotationLayer).
- **New lib modules:** `lib/quantum/{bloch, format, store, index}.ts`,
  `lib/{scrolly, annotations}.ts`.

## Architectural decisions made

1. **Vanilla TS, no Preact.** Each Astro component owns a small
   `<script>` that hydrates DOM by querying `[data-widget=…]` and
   calling into shared TS helpers. We considered Preact for state
   binding but stayed vanilla because (a) bundles stay tiny, (b) the
   DOM stays inspectable in DevTools (a credibility win for the
   "real and tested" pitch), and (c) the Phase 3 sandbox can pivot
   to Preact for drag+undo state without disturbing Phase 2 widgets.
   *Re-visit at the start of Phase 3 — Plan 03-02 will pressure-test
   whether drag-drop + undo wants a real reactive runtime.*

2. **One per-page reactive store, registered by string key.** Widgets
   call `ensureStore(key, {qubits})` independently — first widget to
   mount creates the simulator, others reuse it. No bootstrap script
   needed; no script-order coupling.

3. **Rotation sliders own a "base state" snapshot.** Grabbing the
   slider snapshots the store; every input restores that snapshot
   then applies the rotation. This makes the slider idempotent
   (sweeping back to 0 returns to pre-grab) rather than cumulative.

4. **Bloch sphere is a backend-switch.** `BlochSphere/index.astro`
   picks 3D (Three.js) or 2D (SVG) on mount based on WebGL
   availability + viewport width. Three.js is dynamically imported,
   keeping it out of the homepage bundle. Drag works in both backends.

5. **Annotations pin to widget elements, not the document.** Layout
   shifts (responsive collapse, KaTeX render delay) don't move pins
   because positions are `%` inside the widget's box.

## What's deferred

- **Deploy** to a public static host — needs the user's account.
- **Feedback round** — needs human readers.
- **Lighthouse report** — runs against the deployed URL; we've
  measured bundle weight only.

Both deploy and feedback are tracked in `REMAINING.md` with copy-paste
commands and a feedback-doc template.

## What we learned for Phase 3

- Three.js mounts cleanly with on-demand rendering (`raf`-once per
  state change) and dispose-on-unmount. The sandbox's multi-qubit
  composer can reuse this pattern.
- The "subscribe + render snapshot" pattern scales fine for the
  modest widget counts on a single essay. The sandbox may want
  selector-based subscriptions to avoid re-rendering every cell on
  every gate change.
- Drag math on the Bloch sphere needs the global-phase removal
  trick (`stateToBloch` rotates alpha to be real) so external state
  changes (from gates) yield stable (theta, phi) for the arrow's
  orientation.
- Local-storage-backed UI state is cheap and worth it — annotations
  are immediately satisfying. Phase 3 should consider similar
  treatment for sandbox progress.

## Open risks carried into Phase 3

- **Three.js bundle weight** — 130 KB gzipped is fine for one widget,
  but if the sandbox needs multiple Bloch spheres + the composer,
  consider lighter alternatives (raw WebGL, or a tiny canvas-only
  Bloch renderer) before adding more Three-backed widgets.
- **localStorage growth** — annotations are capped at 25 per page,
  but the sandbox's circuit-history may want a different cap policy
  (probably "last N URLs visited" rather than per-page).
