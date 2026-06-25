# Phase 2 Plan — Flagship "What is a Qubit?" Essay

**Phase goal:** Ship one complete, polished concept essay end-to-end —
the qubit essay — proving the format works pedagogically and technically,
and getting at least 3 working devs to read it and give feedback before
we scale out to more essays.

**Maps to:** Milestone 1 in `docs/plans/2026-06-24-quantum-learning-site-design.md`.

**Depends on:** Phase 1 (simulator + Astro scaffold).

## Definition of Done (phase-level)

A reader visits `/qubit` and:

1. Lands on a hook paragraph that reframes the question without metaphors.
2. Scrolls through prose interleaved with three interactive widgets:
   Bloch sphere, ProbabilityBars, StateVector. All three share a single
   `Simulator` instance — flipping a gate updates all three.
3. Sees real math (KaTeX) inside a collapsed "for the math nerds" block.
4. Ends with a 1–2 question self-test and a link to the next essay.
5. Works on mobile (2D polar fallback for the Bloch sphere; widgets
   remain readable; reduced-motion respected).
6. Loads with LCP < 2s on a simulated 4G mid-range phone.
7. Is deployed to a public static URL.
8. Has been read by ≥ 3 dev friends; ≥ 1 iteration pass made on feedback.

## Plans

> Execute in order. Each plan ends in a commit. Tests + lint must be
> green before moving on.

### 02-01 — Astro page shell + KaTeX + scrolly helper + per-essay layout

**Why:** Every later plan needs the essay scaffolding to exist. Builds
the reusable `<EssayLayout>` component, KaTeX integration, scrolly
helper module, and the `/qubit` route stub.

**Deliverables:**
- `src/layouts/EssayLayout.astro` — header, prose container, footer,
  prev/next nav slot, "math nerds" collapsible slot.
- `src/components/MathBlock.astro` — KaTeX-rendered math wrapper.
  Build-time render; falls back to `<code>` on render failure.
- `src/components/MathNerds.astro` — `<details>` collapsible with the
  "For the math nerds" header.
- `src/lib/scrolly.ts` — IntersectionObserver-based scroll-tied
  animation helper. Respects `prefers-reduced-motion` (no-op when set).
- `src/pages/qubit.astro` — stub page using `EssayLayout`, lorem prose,
  placeholder widget slots.
- Add KaTeX dep (`katex`), wire CSS in `src/styles/global.css`.
- Vitest test for `scrolly.ts` reduced-motion branch (jsdom).

**Acceptance:**
- `npm run dev` shows `/qubit` rendering the stub with KaTeX math.
- `npm test` still green; new scrolly test passes.
- LCP measurement script (lightweight) records baseline for later
  comparison.

**File budget:** ≤ 6 new files, all ≤ 200 lines.

---

### 02-02 — ProbabilityBars + StateVector widgets

**Why:** These are the cheap, high-value visualizations. They establish
the shared-simulator pattern that the Bloch sphere will plug into.

**Deliverables:**
- `src/lib/quantum/store.ts` — a tiny pub-sub wrapper around a
  `Simulator` instance. `subscribe(cb)`, `apply(...)`, `reset()`.
  Vanilla TS, no framework. (Decision point: if subscription wiring
  starts feeling painful, switch to Preact signals here — but YAGNI
  until proven.)
- `src/components/ProbabilityBars.astro` (+ `.client.ts` island) — SVG
  bar chart of `sim.probabilities()`. Animates on update.
- `src/components/StateVector.astro` (+ `.client.ts` island) — numeric
  readout of amplitudes, formatted as `a|0⟩ + b|1⟩` (or `|00⟩ + ...`
  for multi-qubit).
- Gate-toggle buttons (X, H, Z) in the qubit essay page that drive the
  store.
- Vitest tests for `store.ts` (subscribe/notify/unsubscribe) and for
  the `formatAmplitudes` helper.

**Acceptance:**
- Clicking H on the qubit page updates ProbabilityBars to [0.5, 0.5]
  and StateVector to `(1/√2)|0⟩ + (1/√2)|1⟩` instantly.
- Re-clicking H returns to `|0⟩`.
- Both widgets re-render only on store updates (no global polling).

**Decision to record after this plan:** vanilla TS vs. Preact for
widget islands. Write the answer + rationale into `PROJECT.md`'s
Key Decisions table.

---

### 02-03 — BlochSphere widget (Three.js) + 2D polar fallback

**Why:** This is the marquee widget of the qubit essay. Most pedagogical
risk and most technical risk in one component.

**Deliverables:**
- `src/components/BlochSphere/index.astro` — Astro entrypoint, decides
  3D vs. 2D fallback at mount via WebGL feature detect + viewport-width
  check (treat width < 640 as fallback territory).
- `src/components/BlochSphere/Sphere3D.client.ts` — Three.js scene:
  unit sphere, axes labelled |0⟩/|1⟩/|+⟩/|-⟩/|+i⟩/|-i⟩, state-vector
  arrow that animates between gate applications. Lazy-loads Three.js
  via dynamic import so non-Bloch pages don't pay the cost.
- `src/components/BlochSphere/Polar2D.client.ts` — SVG polar projection
  fallback. Shows the same state-vector tip.
- `src/lib/quantum/bloch.ts` — pure helper: `stateToBlochAngles(state):
  {theta, phi}`. Tested.
- Subscribe both Sphere3D and Polar2D to the per-essay store from 02-02.
- Vitest tests for `bloch.ts` against textbook values:
  - `|0⟩` → θ=0
  - `|1⟩` → θ=π
  - `H|0⟩ = |+⟩` → θ=π/2, φ=0
  - `S H |0⟩ = |+i⟩` → θ=π/2, φ=π/2

**Acceptance:**
- Desktop with WebGL: 3D sphere with arrow that animates on gate clicks.
- WebGL disabled (manually) or mobile width: 2D polar plot, same arrow tip.
- Three.js bundle does NOT load on the homepage (Lighthouse bundle check).
- `bloch.ts` tests all green.

**File budget:** ≤ 5 new files. Sphere3D may push 250 lines; split if
it crosses 300.

---

### 02-04 — Write the "What is a Qubit?" essay copy + wire widgets in

**Why:** Without good prose, the rest is a tech demo. This is where
pedagogy lives or dies.

**Deliverables:**
- Final essay copy in `src/pages/qubit.astro` following the design-doc
  skeleton (hook → intuition → widget → deeper → widget → math nerds →
  self-test → next).
- Embedded widgets from 02-02 and 02-03 wired to a per-page store.
- "For the math nerds" collapsible with the 1-qubit state vector,
  Bloch coordinates, and the Hadamard matrix.
- 1–2 self-test prompts at the end (plain prose, no scoring system).
- Footer link: "Next: Superposition" (page may 404 until M2 — wire
  with a `coming-soon` flag).

**Acceptance:**
- Read the essay top-to-bottom on desktop and mobile — flows without
  jargon collisions or widget glitches.
- All math renders.
- Self-edit pass: every paragraph either teaches a new idea or sets up
  the next widget. No filler.

**Time bias:** spend the most time here. Pedagogy is the bottleneck.

---

### 02-05 — Mobile fallbacks, a11y polish, perf budget, deploy & feedback round

**Why:** The polish that makes the difference between "interesting demo"
and "trustworthy resource."

**Deliverables:**
- A11y audit pass on `/qubit`:
  - Keyboard nav through all gate buttons.
  - Visible focus rings (Tailwind `focus-visible:` utilities).
  - Color contrast ≥ WCAG 2.2 AA on text + chart elements.
  - `aria-live="polite"` on StateVector so screen readers get updates.
  - `prefers-reduced-motion` respected end-to-end (verify Sphere3D
    rotation animation also short-circuits, not just scrolly).
- Lighthouse run via `npx lighthouse` against `npm run build && preview`:
  - LCP < 2s on Slow 4G profile
  - Accessibility score ≥ 95
  - JS payload for `/qubit` documented; flag anything > 200KB gzipped.
- Choose static host (GitHub Pages vs. Netlify vs. Vercel — decision
  recorded in `PROJECT.md` Key Decisions). Deploy.
- Send the URL to ≥ 3 working dev friends with a focused ask: "Read
  this, then explain superposition + measurement to me in your words."
- Capture feedback in `docs/feedback/m1-round1.md`. Make ≥ 1 substantive
  iteration before declaring Phase 2 done.

**Acceptance:**
- Public URL works.
- Lighthouse PDF/HTML report committed under `docs/perf/m1-lighthouse.html`.
- Feedback file exists with at least 3 readers' notes + an "edits made"
  section.

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Three.js blows the perf budget | Lazy-load via dynamic import; mount only when in viewport; measure in 02-05 and trim if needed |
| Bloch sphere math wrong → false intuition | Pure `bloch.ts` helper with textbook unit tests in 02-03 |
| Essay is technically perfect but pedagogically dull | 02-04 prioritized for time; 02-05 mandates reader feedback before Phase 2 closes |
| Vanilla TS island state plumbing turns into a tangled mess | Decision gate at end of 02-02: switch to Preact if subscribe wiring exceeds ~80 LOC across the two widgets |
| Mobile 3D performance is bad | 2D polar fallback is *the* mobile experience — don't even attempt 3D below 640px width |

## Out of Scope (this phase)

- Concept map on homepage — Phase 3
- CircuitBuilder widget — Phase 4
- localStorage persistence — defer; reset-on-refresh is fine for v1
- Analytics — defer to pre-launch (end of Phase 4)
- Multi-qubit widgets — Phase 3 (entanglement essay needs them)
