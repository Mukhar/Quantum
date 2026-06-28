# Phase 2 Plan — Flagship Interactive "What is a Qubit?" Essay

**Phase goal:** Ship one complete, polished, **interactive-first** concept
essay end-to-end — the qubit essay — proving that the format works
pedagogically and that direct-manipulation widgets feel right. Lay the
technical foundations (param rotation gates, draggable Bloch arrow, a
per-essay simulator store, annotations) that the Phase 3 sandbox will
depend on.

**Maps to:** Milestone 1 in `docs/plans/2026-06-24-quantum-learning-site-design.md`,
expanded with the interactivity/creativity pillar.

**Depends on:** Phase 1 (simulator + Astro scaffold).

## Definition of Done (phase-level)

A reader visits `/qubit` and:

1. Lands on a hook paragraph that reframes the question without metaphors.
2. Scrolls through prose interleaved with **three directly-manipulable
   widgets**: Bloch sphere (draggable arrow), ProbabilityBars, StateVector.
   All three share a single `Simulator` instance.
3. Encounters **continuous rotation sliders** (Rx, Ry, Rz with θ ∈ [0, 2π])
   that sweep the state in real time. Every visualization tracks at
   16 ms per frame on a mid-range laptop.
4. Can **drag the Bloch state-vector arrow** to set the qubit's initial
   state, then apply gates from there. Drag uses pointer events (works
   for mouse + touch + pen).
5. Can **pin a sticky note** anywhere on any widget; notes persist
   to `localStorage` and re-render on revisit.
6. Sees real math (KaTeX) inside a "for the math nerds" collapsible.
7. Ends with a 1–2 question self-test and a "Next: Superposition" link
   (Phase 4 will fill the destination; for now it stubs out).
8. Works on mobile (2D polar fallback for the Bloch sphere; sliders are
   thumb-friendly; reduced-motion respected).
9. Loads with LCP < 2s on a simulated 4G mid-range phone.
10. Is deployed to a public static URL.
11. Has been read AND played-with by ≥ 3 dev friends; ≥ 1 iteration
    pass made on their feedback.

## Plans

> Execute in order. Each plan ends in a commit. Tests + lint must be
> green before moving on.

### 02-01 — Astro page shell + KaTeX + scrolly helper + per-essay layout

**Why:** Every later plan needs the essay scaffolding to exist. Builds
the reusable layout, KaTeX integration, scrolly helper, and the
`/qubit` route stub.

**Deliverables:**
- `src/layouts/EssayLayout.astro` — header, prose container, footer,
  prev/next nav slot, "math nerds" collapsible slot, annotations
  outlet (real impl lands in 02-05).
- `src/components/MathBlock.astro` + `MathNerds.astro` — KaTeX wrapper
  + `<details>` collapsible. KaTeX failure falls back to `<code>`.
- `src/lib/scrolly.ts` — IntersectionObserver helper. Respects
  `prefers-reduced-motion` (no-op when set).
- `src/pages/qubit.astro` — stub with `EssayLayout`, lorem prose,
  placeholder widget slots.
- Add `katex` dep, wire CSS in `src/styles/global.css`.
- Vitest: `scrolly.ts` reduced-motion branch (jsdom).

**Acceptance:**
- `npm run dev` shows `/qubit` rendering the stub with KaTeX math.
- `npm test` green; new scrolly test passes.

**File budget:** ≤ 6 new files, all ≤ 200 lines.

---

### 02-02 — Param rotation gates Rx/Ry/Rz in the simulator + tests

**Why:** Continuous-θ rotation gates are the technical key that
unlocks all of the interactivity-first design. Without them, sliders
have nothing to sweep. They're also the basis of the Bloch-drag
implementation (drag → derive Ry/Rz angles → apply).

**Deliverables:**
- Extend `src/lib/quantum/gates.ts` with **factory functions**:
  - `Rx(theta: number): Gate2x2`
  - `Ry(theta: number): Gate2x2`
  - `Rz(theta: number): Gate2x2`
  Each returns a `Gate2x2` matrix — implemented from the textbook
  forms (`cos(θ/2) I − i sin(θ/2) σ`).
- Extend `Simulator.apply` to accept a parameterized gate variant:
  `sim.applyRotation("Rx", qubit, theta)` (keeps the discrete
  `apply("H", q)` API untouched).
- New tests in `tests/quantum/rotations.test.ts`:
  - `Rx(π) ≈ −i X` (up to global phase — verify probabilities)
  - `Ry(π) ≈ −i Y` (probabilities)
  - `Rz(π) ≈ −i Z` (probabilities)
  - `Ry(π/2) |0⟩` lands in `|+⟩` (probabilities [0.5, 0.5], real-valued amps)
  - `Rx(2π)` returns to original probabilities (up to global phase)
  - Composability: `Ry(π/2) Rx(π) Ry(-π/2)` ≡ X (probabilities)
- Update `src/lib/quantum/index.ts` (or add one) re-exporting the new
  factories.

**Acceptance:**
- `npm test` green with ≥ 6 new rotation assertions.
- The simulator's public API stays backwards-compatible with Phase 1
  callers (no breaking changes to existing tests).

**File budget:** edits to 2 files + 1 new test file (~150 lines).

---

### 02-03 — ProbabilityBars + StateVector widgets + per-page simulator store

**Why:** Two cheap, high-value visualizations. Also establishes the
shared-store pattern every other widget plugs into.

**Deliverables:**
- `src/lib/quantum/store.ts` — pub-sub wrapper around a `Simulator`.
  API: `createStore({qubits}) → { subscribe, apply, applyRotation,
  reset, snapshot }`. Vanilla TS. No framework yet.
- `src/components/ProbabilityBars.astro` (+ `.client.ts`) — SVG bar
  chart of `sim.probabilities()`. Animates on update unless reduced-motion.
- `src/components/StateVector.astro` (+ `.client.ts`) — numeric readout
  of amplitudes, formatted as `(a)|0⟩ + (b)|1⟩` for n=1; truncates
  near-zero amplitudes for readability.
- Discrete-gate buttons (X, H, Z) on the qubit page that drive the store.
- Vitest tests: `store.ts` (subscribe/notify/unsubscribe/snapshot
  immutability) and the `formatAmplitude` helper.

**Acceptance:**
- Clicking H updates both widgets to [0.5, 0.5] and `(1/√2)|0⟩ +
  (1/√2)|1⟩` instantly. Reclick returns to `|0⟩`.
- Both widgets re-render only on store updates.

**Decision gate after this plan:** vanilla TS vs. Preact. Likely tip
toward Preact at this point given Phase 3 needs. Record the decision
+ rationale in `PROJECT.md` Key Decisions.

---

### 02-04 — BlochSphere widget (Three.js, **draggable arrow**) + 2D polar fallback

**Why:** The marquee widget. Direct manipulation here is what makes
the page feel like a toy, not a slide deck.

**Deliverables:**
- `src/components/BlochSphere/index.astro` — entrypoint; picks 3D or
  2D fallback at mount via WebGL detect + viewport-width (< 640 → 2D).
- `src/components/BlochSphere/Sphere3D.client.ts` — Three.js scene:
  unit sphere, labelled axes, state-vector arrow.
  - **Drag interaction:** pointer-down on the arrow tip → on pointer-move,
    project pointer onto the sphere surface, convert to (θ, φ),
    update the store with `setStateFromBloch(theta, phi)`.
  - Animates between gate-driven changes (≤ 200 ms ease-out); animation
    short-circuited when `prefers-reduced-motion` is set.
  - Lazy-loads Three.js via dynamic import.
- `src/components/BlochSphere/Polar2D.client.ts` — SVG fallback with
  drag support too (drag the tip around a 2D unit circle).
- `src/lib/quantum/bloch.ts` — pure helpers:
  - `stateToBloch(state) → {theta, phi}`
  - `blochToState(theta, phi) → Complex[]` (the inverse — drives the drag)
- New `store.setStateFromBloch(theta, phi)` method backed by
  `blochToState` then push to subscribers.
- Vitest: `bloch.ts` round-trips (`blochToState ∘ stateToBloch ≈ id`)
  and textbook angles (`|0⟩`, `|1⟩`, `|+⟩`, `|+i⟩`).

**Acceptance:**
- Desktop with WebGL: 3D sphere; dragging the arrow updates
  ProbabilityBars + StateVector live.
- WebGL disabled or mobile width: 2D polar plot with the same
  drag-to-set behavior.
- Three.js bundle does NOT load on the homepage (verified via
  bundle-analyzer or Lighthouse network panel).
- All `bloch.ts` tests green.

**File budget:** ≤ 5 new files. Sphere3D may push 250 lines; split
into `scene.ts` + `dragController.ts` if it crosses 300.

---

### 02-05 — Param-gate sliders + annotations system

**Why:** Sliders convert the param gates from 02-02 into the
"sweep and watch" creative interaction. Annotations let readers
externalize their own discoveries — turning the page into something
they own.

**Deliverables:**
- `src/components/RotationSlider.astro` (+ `.client.ts`) — labelled
  range input (Rx/Ry/Rz × selectable qubit), θ ∈ [0, 2π], step π/64.
  On `input` event, calls `store.applyRotation(...)`. **Holds an
  internal "base state" snapshot** so sweeping the slider is
  idempotent (rather than compounding rotations) — design note: each
  slider owns a snapshot taken when the user first grabs it.
- `src/components/AnnotationLayer.astro` (+ `.client.ts`) — wraps any
  widget; click-to-pin a `<textarea>` at a relative coordinate.
  Notes serialized as `{widgetId, x%, y%, text}` in `localStorage`
  under a per-page key.
- `src/components/AnnotationPin.astro` — the visible pin/note
  component, draggable to reposition, dismissable.
- Add a "Reset annotations" button to `EssayLayout`'s footer.
- Vitest: annotation serialization round-trip; slider snapshot
  semantics (sweeping back to θ=0 returns to base state).

**Acceptance:**
- Dragging the Rx slider continuously updates all three widgets
  smoothly (no jank on a 2019 laptop).
- Setting slider back to 0 returns to the pre-grab state.
- Pinning a note, refreshing the page, note reappears at the same spot.
- A11y: sliders are keyboard-operable (arrows ± 1 step, PgUp/Dn ± 16);
  annotations are reachable via Tab.

---

### 02-06 — Write the essay copy + a11y/perf pass + deploy + feedback round

**Why:** Without good prose, the rest is a tech demo. Without a perf
+ a11y pass, the experience is brittle. Without real-reader feedback,
we're guessing about pedagogy.

**Deliverables:**

**Essay copy (priority 1):**
- Final "What is a Qubit?" essay in `src/pages/qubit.astro` following
  the design-doc skeleton: hook → intuition → first widget
  (ProbabilityBars + StateVector) → deeper notion (the Bloch
  sphere) → BlochSphere widget with explicit "try dragging me"
  callout → param-rotation interlude with sliders → math-nerds
  collapsible → self-test → next link.
- "Try this:" prompts placed inline (≥ 3 per essay): explicit
  invitations to play (e.g., "Drag the arrow to the equator, then
  apply Z. What changes? Why?").

**A11y pass:**
- Keyboard nav through every interactive control on the page.
- Focus rings (Tailwind `focus-visible:`).
- `aria-live="polite"` on StateVector + ProbabilityBars text so SR
  users hear updates.
- All color/contrast ≥ WCAG 2.2 AA (verify with axe).
- `prefers-reduced-motion` verified end-to-end (no Bloch arrow
  animation, no scroll-tied transitions).

**Perf pass:**
- `npm run build && npx lighthouse` against `npm run preview`:
  - LCP < 2s on Slow 4G profile
  - Accessibility ≥ 95
  - JS payload for `/qubit` documented; flag > 200 KB gzipped.
- Commit the Lighthouse report under `docs/perf/m1-lighthouse.html`.

**Deploy + feedback:**
- Pick static host (decision logged to `PROJECT.md`). Deploy.
- Send URL to ≥ 3 working dev friends with the explicit ask:
  "(1) Read it. (2) Play with the widgets for 5 minutes. (3) Tell me
  one thing that clicked and one thing that didn't."
- Capture in `docs/feedback/m1-round1.md`. Make ≥ 1 substantive
  iteration before declaring Phase 2 done.

**Acceptance:**
- Public URL works.
- Lighthouse report committed.
- Feedback file exists with ≥ 3 readers' notes + an "edits made"
  section.

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Three.js + drag interactions push the page over the perf budget | Lazy import; suspend animation when `document.hidden`; profile in 02-06 |
| Rotation-slider compounding feels confusing ("why isn't it idempotent?") | Slider owns a base-state snapshot taken on grab; tested in 02-05 |
| `setStateFromBloch` produces non-unit-norm states due to drag jitter | Renormalize defensively inside `blochToState`; assert in `bloch.ts` tests |
| Annotations balloon `localStorage` over time | Cap at 25 notes per page; soft-evict oldest |
| Essay is technically perfect but pedagogically dull | 02-06 prioritizes copy + reader feedback; "Try this:" prompts force play |
| Mobile drag interactions hijack scroll | Use `touch-action: none` only on the Bloch arrow hit-target, not the page |

## Out of Scope (this phase)

- The full Quantum Sandbox composer — Phase 3
- URL-fragment circuit sharing — Phase 3 (annotations are localStorage, not URL)
- Quantum Canvas / Quantum Tones creative outputs — Phase 3
- Concept map on homepage — Phase 4
- Other essays (superposition, etc.) — Phase 4
- localStorage progress persistence beyond annotations — defer
