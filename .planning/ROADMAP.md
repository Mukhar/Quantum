# Roadmap: Quantum

## Overview

Ship a v1 quantum-computing learning site for working devs in three
incremental milestones after the foundation. The risk-killer is shipping
ONE essay end-to-end (Phase 2) and validating pedagogy with real readers
before scaling to the full seven-essay set.

## Phases

- [x] **Phase 1: Foundation** — Astro/Tailwind shell + simulator skeleton + tests
- [ ] **Phase 2: Flagship "What is a Qubit?" essay** — End-to-end M1: widgets, essay, mobile fallbacks, ship & gather feedback
- [ ] **Phase 3: Foundations track** — Essays for superposition, measurement, gates, entanglement; concept map; multi-qubit widgets
- [ ] **Phase 4: Algorithm track** — CNOT+Bell essay, Deutsch's algorithm, drag-drop circuit builder; v1 launch

## Phase Details

### Phase 1: Foundation 

**Goal**: Astro + Tailwind scaffolding and an inspectable, tested simulator.
**Depends on**: Nothing
**Requirements**: REQ-02, REQ-11, REQ-13
**Success Criteria**:
  1. `npm test` passes with simulator covering X/Y/Z/H/S/T/CNOT + measurement
  2. `npm run dev` serves the homepage shell
  3. Simulator enforces 4-qubit hard cap

**Plans** (already shipped, retroactively listed):
- [x] 01-01: Astro/Tailwind scaffold + status homepage
- [x] 01-02: Complex/Gate/Simulator modules under `src/lib/quantum/`
- [x] 01-03: Vitest suite with textbook tests + guard tests

### Phase 2: Flagship "What is a Qubit?" essay

**Goal**: One complete, polished essay end-to-end — proving the format
works pedagogically *and* technically — and shipped to a static host
for real-reader feedback before scaling out.
**Depends on**: Phase 1
**Requirements**: REQ-01, REQ-05, REQ-06 (Bloch + ProbabilityBars + StateVector),
  REQ-07, REQ-08, REQ-09, REQ-10, REQ-12, REQ-14
**Success Criteria**:
  1. `/qubit` route renders the full essay with scrollytelling layout
  2. Bloch sphere widget rotates in 3D on desktop; falls back to 2D polar
     plot when WebGL is unavailable or on small screens
  3. ProbabilityBars + StateVector widgets share state with the Bloch
     sphere via a per-page Simulator instance — clicking a gate updates
     all three widgets in lockstep
  4. KaTeX renders inline math in the "for the math nerds" collapsible
  5. Site is deployed to a static host with a public URL
  6. `prefers-reduced-motion` disables scroll-tied animation
  7. Page weighs in under the 2s-LCP-on-4G budget (measured)
  8. At least 3 working devs have read the essay and given feedback;
     at least one iteration pass made on their feedback

**Plans**: 5 plans
- [ ] 02-01: Astro page shell + KaTeX + scrolly helper + per-essay layout
- [ ] 02-02: ProbabilityBars + StateVector widgets (the easy 2D pair)
- [ ] 02-03: BlochSphere widget (Three.js, lazy-loaded) + 2D polar fallback
- [ ] 02-04: Write the "What is a Qubit?" essay copy + wire up widgets
- [ ] 02-05: Mobile fallbacks, a11y polish, perf budget verification, deploy & feedback round

### Phase 3: Foundations track

**Goal**: Round out the conceptual foundations (superposition, measurement,
gates, entanglement) and add the visual concept map on the homepage.
**Depends on**: Phase 2
**Requirements**: REQ-03 (4 of 7 essays), REQ-04
**Success Criteria**:
  1. Four new essays live: `/superposition`, `/measurement`, `/gates`,
     `/entanglement` — each following the qubit-essay template
  2. Homepage replaces the "coming soon" shell with the concept-map nav
  3. Multi-qubit widget variants work in the entanglement essay
  4. Cross-essay nav (prev/next based on prereq graph) works

**Plans**: TBD (planned at phase entry)
- [ ] 03-01: Concept map component for homepage
- [ ] 03-02: Superposition essay
- [ ] 03-03: Measurement essay
- [ ] 03-04: Gates essay
- [ ] 03-05: Entanglement essay (+ multi-qubit Bloch/probability variants)

### Phase 4: Algorithm track

**Goal**: Final two essays (CNOT+Bell, Deutsch's algorithm) plus the
drag-drop circuit builder widget. v1 ships at the end of this phase.
**Depends on**: Phase 3
**Requirements**: REQ-03 (final 2 of 7 essays), REQ-06 (CircuitBuilder)
**Success Criteria**:
  1. CNOT + Bell-state essay live with two-qubit widgets
  2. Deutsch's-algorithm essay live with circuit-builder widget
  3. Circuit builder supports drag-drop on desktop; read-only stepped
     view on touch
  4. All seven essays cross-linked through the concept map
  5. v1 launch announcement post drafted

**Plans**: TBD
- [ ] 04-01: CircuitBuilder widget (desktop drag-drop)
- [ ] 04-02: CNOT + Bell-state essay
- [ ] 04-03: Deutsch's algorithm essay
- [ ] 04-04: v1 launch polish + announcement

## Progress

**Execution Order:** Phases run in numeric order: 1 → 2 → 3 → 4.

| Phase | Plans Complete | Status      | Completed  |
|-------|----------------|-------------|------------|
| 1. Foundation              | 3/3 | Done        | 2026-06-24 |
| 2. Flagship qubit essay    | 0/5 | Active      | —          |
| 3. Foundations track       | 0/5 | Not started | —          |
| 4. Algorithm track         | 0/4 | Not started | —          |
