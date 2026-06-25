# Project: Quantum

*Last updated: 2026-06-25 after pivoting toward a creativity-first, playground-led product.*

## What This Is

A static, browser-only website that teaches quantum computing to working
software developers through **two interlocking experiences**:

1. **Scrollytelling essays** that build intuition step by step, each
   essay embedding interactive widgets driven by a real state-vector
   simulator (vanilla TypeScript, ≤ 4 qubits in v1).
2. **A Quantum Sandbox** — an open-ended, URL-shareable playground
   where readers drag gates, drag the Bloch-sphere state vector,
   sweep continuous rotation angles, tackle challenge puzzles, and
   turn measurement outcomes into generative art and audio.

Reading is the on-ramp. Making is the point.

## Core Value

**Earn dev trust with real, inspectable math — then unlock creativity by
letting readers actually play.** Every widget reflects actual quantum
state (DevTools-verifiable). Every widget is also a toy: the user can
change the initial state, sweep gate parameters, save a circuit to a
URL, remix it, or pipe its outcome into a creative output channel.
Pedagogy without play is a textbook; play without rigor is a toy.
We insist on both.

## Requirements

### Validated (shipped & proven)

- [done] REQ-11 — Simulator passes textbook unit tests (H|0⟩, Bell state,
  Hadamard-is-its-own-inverse, etc.) — Phase 1
- [done] REQ-13 — Hard 4-qubit cap enforced via constructor guard — Phase 1

### Active (current scope)

**Foundation reqs (carried from v1 design)**
- REQ-01 — Static, browser-only site (no server, no DB, no fetch)
- REQ-02 — Real in-browser state-vector simulator, vanilla TS, ≤ 4 qubits
- REQ-03 — Seven concept essays: qubit, superposition, measurement, gates,
  entanglement, CNOT+Bell, Deutsch's algorithm
- REQ-04 — Homepage with visual concept map (nodes = essays + sandbox + challenges)
- REQ-05 — Scrollytelling layout: hook → intuition → widget → math → check → next
- REQ-06 — Interactive widgets: BlochSphere (3D), ProbabilityBars,
  StateVector readout, CircuitBuilder
- REQ-07 — Math rendered with KaTeX, gated behind "for the math nerds"
  collapsibles
- REQ-08 — Mobile fallbacks for heavy 3D widgets (2D polar or static image)
- REQ-09 — Performance: LCP < 2s on 4G, mid-range phone
- REQ-10 — Accessibility: WCAG 2.2 AA; respect `prefers-reduced-motion`
- REQ-12 — Each essay ends with a 1–2 question self-test prompt
- REQ-14 — Pedagogy validated: a working dev who never studied quantum
  can read the qubit essay and explain superposition + measurement back

**Interactivity & creativity reqs (new — the playground pillar)**
- REQ-15 — **Direct manipulation everywhere.** Every widget in every
  essay supports user-driven exploration: drag, slider, alternate
  initial states. Pure-observation widgets are not acceptable.
- REQ-16 — **Parameterized rotation gates** Rx(θ), Ry(θ), Rz(θ) in the
  simulator, with textbook unit tests. Without continuous θ, there is
  no creative design space.
- REQ-17 — **Quantum Sandbox** at `/sandbox` — open-ended circuit
  composer with live state visualization, independent of any essay.
- REQ-18 — **URL-shareable circuits.** Sandbox state encodes into the URL
  fragment (no backend); pasting a URL restores the exact circuit. Every
  essay widget has a "remix this in the sandbox" link.
- REQ-19 — **Drag the Bloch sphere.** Users can drag the state-vector
  arrow to set the initial state; gate clicks then act on that state.
- REQ-20 — **Challenge mode.** At least 5 starter puzzles of the form
  "reach this target state from |0…⟩", with progressive hints and
  state-similarity success detection.
- REQ-21 — **Creative output widgets.** Measurement outcomes drive at
  least one generative art widget (Quantum Canvas) and one audio widget
  (Quantum Tones). Both exportable (PNG / WAV) and shareable by URL.
- REQ-22 — **Annotations / pins.** Readers can leave freeform notes
  pinned to specific widgets, persisted in `localStorage`.
- REQ-23 — **Undo/redo + keyboard shortcuts** in the sandbox composer
  (creative tools without undo aren't creative tools).

### Out of Scope (v1)

- [no] User accounts / login — still a v2 problem; URL-fragment
  sharing replaces "save my work" for v1
- [no] Server-side circuit gallery / collaborative editing — v2; URL
  sharing is enough to seed a community
- [no] Quizzes with scoring / badges / gamification — challenge mode
  is creative play, not a points system
- [no] Comments / forum — moderation cost dwarfs v1 reader base
- [no] Embedded Qiskit/Cirq code editor — pushes scope into IDE territory;
  sandbox "export to Qiskit text" is a v2 stretch
- [no] Algorithms beyond Deutsch (Grover, Shor, QFT, VQE) — v2 track
- [no] Real quantum hardware integration (IBM Q) — adds auth + cost + flakiness
- [no] i18n — single-language v1
- [no] Dark/light mode toggle — pick one good theme first
- [no] Backend of any kind

## Context

- Existing landscape: IBM/Qiskit (too math-heavy), pop-sci (too shallow),
  3Blue1Brown (beautiful but passive), Distill.pub (great format but no
  quantum content). The site aims for the love-child of 3B1B + Distill,
  scoped to quantum, aimed at devs.
- Milestone 0 (foundation) shipped: Astro + Tailwind + TS scaffolding,
  simulator with X/Y/Z/H/S/T/CNOT + measurement + 24 vitest assertions.
- All source under `src/lib/quantum/` — simulator is 130 LOC, gates 35 LOC,
  complex helpers ~50 LOC. Stays auditable.

## Constraints

- **Tech stack** — Astro + Tailwind + Vitest. The sandbox composer is
  complex enough that we expect to bring in Preact (3 KB) at Phase 3;
  the call is locked at the end of Phase 2 once widget plumbing pain
  is real.
- **Performance** — LCP budget 2s on 4G for every essay; sandbox is
  allowed 3s LCP given heavier JS, but interactive-to-input < 100ms.
  Three.js + sandbox bundle lazy-loaded; essays only pay for the
  widgets they actually embed.
- **Simulator boundary** — 4-qubit hard cap, vanilla TS, zero deps.
  Param rotations (Rx/Ry/Rz) extend the gate set in Phase 2; no general
  matrix-exponentiation needed.
- **URL encoding** — Circuits encode into a compact base64url fragment
  (target: <= 2 KB per fragment for the worst 4×n_steps circuit). No
  server, no shortlink service.
- **Accessibility** — WCAG 2.2 AA across both essays and sandbox.
  `prefers-reduced-motion` disables scroll-tied + Bloch-arrow animation.
  Sandbox is keyboard-operable end-to-end.
- **Hosting** — Static host (GitHub Pages / Netlify / Vercel). No runtime.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Custom vanilla-TS simulator over Qiskit/Quirk embed | Inspectability = credibility for dev audience; ~200 LOC is cheap | [good] M0 simulator is 130 LOC, all tests pass |
| Astro over Next.js | Content-heavy site with islands of interactivity is Astro's sweet spot; ship less JS | [pending] validation in M1 |
| Qubit-0 is LSB (Qiskit convention) | Mental-model transfer to real Qiskit later | [good] encoded in simulator + tests |
| KaTeX over MathJax | Build-time render, smaller payload | [pending] added in M1 |
| Ship qubit essay end-to-end first; sandbox second; remaining essays third | Pedagogy validation first, then sandbox unlocks "remix" CTAs across the rest of the site | [pending] proven across Phases 2+3 |
| Pivot to creativity-first product (sandbox + creative outputs are core, not v2) | User direction: a reading-only quantum site leaves no room for exploration; creativity = retention | [pending] validated when sandbox ships |
| URL-fragment circuit sharing instead of server-backed gallery | Keeps the site static + zero-ops; fragments are unlimited, free, and shareable in any chat tool | [pending] proven in Phase 3 |
| Param rotations Rx/Ry/Rz added to simulator in Phase 2 (early) | Continuous θ is what makes Bloch dragging, sliders, and creative sweeps possible — not optional | [pending] |

---

## Evolution

After each phase: invalidated reqs → Out of Scope; shipped reqs → Validated
(with phase ref); new reqs → Active; log decisions to the table above.
