# Roadmap: Quantum

## Overview

Ship a v1 quantum-computing learning **and playground** site for working
devs across five phases. After foundation, we ship the flagship qubit
essay (proving the pedagogy works), then we ship the Quantum Sandbox
(unlocking the creativity pillar), then we backfill the remaining essays
(each one linking out to sandbox remixes), then we cap it with the
algorithm track and launch.

The sandbox lands **second** on purpose: every essay we write afterward
can include "remix this in the sandbox" CTAs, deep-linking readers
straight into a pre-loaded creative space.

## Phases

- [x] **Phase 1: Foundation** — Astro/Tailwind shell + simulator skeleton + tests
- [x] **Phase 2: Flagship interactive qubit essay** — End-to-end M1 with direct-manipulation widgets, parameterized rotations, draggable Bloch sphere, annotations (code-complete; deploy + feedback round still pending — see `phases/02-qubit-essay/REMAINING.md`)
- [x] **Phase 3: Quantum Sandbox + Creative Outputs** — `/sandbox` circuit composer with URL sharing, challenge mode, Quantum Canvas (art), Quantum Tones (audio)
- [x] **Phase 4: Foundations essay track** — Superposition, measurement, gates, entanglement essays + homepage concept map; each essay deep-links to sandbox remixes
- [ ] **Phase 5: Algorithm track + v1 launch** — CNOT+Bell essay, Deutsch's algorithm essay, in-essay drag-drop circuits, launch polish

## Phase Details

### Phase 1: Foundation [done]

**Goal**: Astro + Tailwind scaffolding and an inspectable, tested simulator.
**Depends on**: Nothing
**Requirements**: REQ-02, REQ-11, REQ-13
**Success Criteria**:
  1. `npm test` passes with simulator covering X/Y/Z/H/S/T/CNOT + measurement
  2. `npm run dev` serves the homepage shell
  3. Simulator enforces 4-qubit hard cap

**Plans** (shipped, retroactively listed):
- [x] 01-01: Astro/Tailwind scaffold + status homepage
- [x] 01-02: Complex/Gate/Simulator modules under `src/lib/quantum/`
- [x] 01-03: Vitest suite with textbook tests + guard tests

### Phase 2: Flagship interactive qubit essay

**Goal**: Ship one polished essay end-to-end, validating *both* pedagogy
and the interactivity-first widget pattern. Every widget on the page is
directly manipulable (drag, slider, alternate initial state). Adds the
parameterized rotation gates the rest of the site will depend on.
**Depends on**: Phase 1
**Requirements**: REQ-01, REQ-05, REQ-06 (Bloch + ProbabilityBars + StateVector),
  REQ-07, REQ-08, REQ-09, REQ-10, REQ-12, REQ-14, REQ-15, REQ-16, REQ-19, REQ-22
**Success Criteria**:
  1. `/qubit` route renders the full essay with scrollytelling layout
  2. Bloch sphere widget rotates in 3D on desktop; falls back to 2D
     polar on small screens / no-WebGL
  3. **Users can drag the Bloch state-vector arrow** to set the
     initial state; gate applications act on whatever they dragged to
  4. **Rx(θ), Ry(θ), Rz(θ) sliders** sweep continuously and update
     all widgets in real time (<= 16 ms per frame)
  5. ProbabilityBars + StateVector widgets share state via a per-page
     simulator store and re-render on every state change
  6. **Annotations**: users can pin a sticky note to any widget,
     persisted to `localStorage`
  7. KaTeX renders inline math in the "for the math nerds" collapsible
  8. Site is deployed to a static host with a public URL
  9. `prefers-reduced-motion` disables scroll-tied + Bloch animation
  10. Page weighs in under the 2s-LCP-on-4G budget (measured)
  11. ≥ 3 working devs have read the essay + actually played with the
      widgets; ≥ 1 iteration pass made on their feedback

**Plans**: 6 plans
- [x] 02-01: Astro page shell + KaTeX + scrolly helper + per-essay layout
- [x] 02-02: **Param rotation gates Rx/Ry/Rz in the simulator** + tests
- [x] 02-03: ProbabilityBars + StateVector widgets + per-page sim store
- [x] 02-04: BlochSphere widget (Three.js, draggable arrow) + 2D polar fallback
- [x] 02-05: Param-gate sliders + annotations system (pin notes to widgets)
- [~] 02-06: Essay copy + a11y/perf shipped; deploy + dev-friend feedback round remain (see `phases/02-qubit-essay/REMAINING.md`)

### Phase 3: Quantum Sandbox + Creative Outputs

**Goal**: The marquee creativity feature. A dedicated `/sandbox` route
with an open-ended circuit composer, full URL-fragment shareability,
a challenge-puzzle mode, and two creative output channels (Quantum
Canvas = generative art, Quantum Tones = audio). This is the pillar
that turns the site from "tutorial" into "playground."
**Depends on**: Phase 2 (param gates, sim store, widget primitives)
**Requirements**: REQ-17, REQ-18, REQ-19, REQ-20, REQ-21, REQ-23,
  and re-uses REQ-06 + REQ-15 + REQ-16
**Success Criteria**:
  1. `/sandbox` lets a user drag gates onto a qubit×timestep grid
     (1–4 qubits, up to ~20 timesteps), with X/Y/Z/H/S/T/CNOT/Rx/Ry/Rz
  2. Live Bloch sphere(s) + ProbabilityBars update on every edit
  3. **URL fragment encodes the full circuit**; pasting the URL into
     a new tab reconstructs it exactly. Round-trip test in CI.
  4. Undo/redo (≥ 20 deep) + keyboard shortcuts (z, ⇧z, del, ←/→)
  5. **Challenge mode** at `/sandbox/challenges` with ≥ 5 starter
     puzzles ("reach |+⟩", "build a Bell pair", "produce equal
     superposition over all 4 basis states", etc.) with hint
     progression and state-similarity success detection (fidelity > 0.999)
  6. **Quantum Canvas** widget: maps repeated measurements over a
     parameter sweep to a 2D color grid; exportable as PNG
  7. **Quantum Tones** widget: maps measurement outcomes to a short
     Web Audio sequence; exportable as WAV (≤ 4s)
  8. Sandbox bundle stays under 250 KB gzipped; lazy-loaded
  9. Sandbox is fully keyboard-operable (a11y AA)

**Plans**: 7 plans
- [ ] 03-01: Circuit data model + URL-fragment codec + round-trip tests
- [ ] 03-02: Sandbox shell page + drag-drop gate palette (qubit×step grid)
- [ ] 03-03: Sandbox state store + undo/redo + keyboard shortcuts
- [ ] 03-04: Live multi-qubit Bloch + ProbabilityBars panel for sandbox
- [ ] 03-05: Challenge mode + 5 starter puzzles + fidelity success detector
- [ ] 03-06: Quantum Canvas widget (parameter-sweep art + PNG export)
- [ ] 03-07: Quantum Tones widget (Web Audio + WAV export) + sandbox a11y/perf pass

### Phase 4: Foundations essay track

**Goal**: Round out the conceptual foundations (superposition, measurement,
gates, entanglement) and replace the homepage shell with the visual
concept map. Each essay includes one or more **"remix this in the
sandbox"** CTAs that deep-link to pre-loaded circuits.
**Depends on**: Phase 3 (sandbox + URL codec)
**Requirements**: REQ-03 (4 of 7 essays), REQ-04
**Success Criteria**:
  1. Four new essays live: `/superposition`, `/measurement`, `/gates`,
     `/entanglement` — each following the qubit-essay template
  2. Each essay has at least one widget with a "Open in sandbox →"
     button that deep-links to a pre-loaded circuit
  3. Homepage replaces the "coming soon" shell with the concept-map nav,
     including a node for the sandbox and a node for the challenges
  4. Multi-qubit Bloch + probability panels (built in Phase 3) reused
     in the entanglement essay
  5. Cross-essay nav (prev/next based on prereq graph) works

**Plans**: 6 plans
- [ ] 04-01: Concept map component for homepage (essays + sandbox + challenges)
- [ ] 04-02: Superposition essay (+ sandbox remix CTA)
- [ ] 04-03: Measurement essay (+ sandbox remix CTA)
- [ ] 04-04: Gates essay (+ sandbox remix CTA — sweep slider for arbitrary rotations)
- [ ] 04-05: Entanglement essay (+ multi-qubit widgets + sandbox remix CTA)
- [ ] 04-06: Cross-essay nav, concept-map polish, regression pass on Phase 2+3

### Phase 5: Algorithm track + v1 launch

**Goal**: Final two essays (CNOT+Bell, Deutsch's algorithm) plus drag-drop
circuit embedding directly inside essays (re-using the sandbox composer).
v1 launches at the end of this phase.
**Depends on**: Phase 4
**Requirements**: REQ-03 (final 2 of 7 essays), REQ-06 (CircuitBuilder)
**Success Criteria**:
  1. CNOT + Bell-state essay live with two-qubit interactive widgets
     and a "remix this Bell pair" CTA
  2. Deutsch's algorithm essay live with an embedded circuit-builder
     widget (re-using the sandbox composer in read+edit mode)
  3. All seven essays cross-linked through the concept map
  4. v1 launch announcement post drafted; analytics opt-in decision made
  5. End-to-end Lighthouse pass: all essays meet the 2s-LCP budget,
     sandbox meets its 3s-LCP budget, a11y ≥ 95 everywhere

**Plans**: 5 plans
- [ ] 05-01: CircuitBuilder essay-embed mode (re-uses sandbox composer, read-only by default)
- [ ] 05-02: CNOT + Bell-state essay
- [ ] 05-03: Deutsch's algorithm essay
- [ ] 05-04: v1 launch polish — analytics decision, og-images, robots/sitemap
- [ ] 05-05: Launch announcement draft + final Lighthouse + retro

## Progress

**Execution Order:** Phases run in numeric order: 1 → 2 → 3 → 4 → 5.

| Phase | Plans Complete | Status      | Completed  |
|-------|----------------|-------------|------------|
| 1. Foundation                         | 3/3 | Done           | 2026-06-24 |
| 2. Flagship interactive qubit essay   | 5/6 + partial | Code-complete  | 2026-06-25 (deploy + feedback pending) |
| 3. Quantum Sandbox + Creative Outputs | 0/7 | Not started    | —          |
| 4. Foundations essay track            | 0/6 | Not started    | —          |
| 5. Algorithm track + v1 launch        | 0/5 | Not started    | —          |
