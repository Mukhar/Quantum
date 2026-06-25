# Project: Quantum

*Last updated: 2026-06-25 after bootstrapping `.planning/` from the design doc.*

## What This Is

A static, browser-only website that teaches quantum computing to working
software developers through scrollytelling essays embedding interactive
widgets backed by a **real**, tested, in-browser state-vector simulator
(vanilla TypeScript, ≤ 4 qubits in v1).

## Core Value

**Build genuine intuition in working devs without hand-wavy metaphors —
and earn permanent trust by showing real math in DevTools.** Every widget
reflects actual quantum state. If a curious dev opens DevTools and catches
us faking, the whole project loses credibility.

## Requirements

### Validated (shipped & proven)

- [done] REQ-11 — Simulator passes textbook unit tests (H|0⟩, Bell state,
  Hadamard-is-its-own-inverse, etc.) — Phase 1
- [done] REQ-13 — Hard 4-qubit cap enforced via constructor guard — Phase 1

### Active (current scope)

- REQ-01 — Static, browser-only site (no server, no DB, no fetch)
- REQ-02 — Real in-browser state-vector simulator, vanilla TS, ≤ 4 qubits
- REQ-03 — Seven concept essays: qubit, superposition, measurement, gates,
  entanglement, CNOT+Bell, Deutsch's algorithm
- REQ-04 — Homepage with visual concept map (nodes = essays, edges = prereqs)
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

### Out of Scope (v1)

- [no] User accounts / login — pure read site; auth is a v2 problem
- [no] Progress persistence beyond trivial `localStorage` — adds state we
  don't yet need
- [no] Quizzes with scoring / badges / gamification — pedagogy first, not points
- [no] Comments / forum — moderation cost dwarfs v1 reader base
- [no] Embedded Qiskit/Cirq code editor — pushes scope into IDE territory
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

- **Tech stack** — Astro + Tailwind + Vitest. No React/Vue framework
  added until a widget proves it needs one. Math via KaTeX (build-time).
  3D via Three.js (lazy-loaded per page).
- **Performance** — LCP budget 2s on 4G; widget JS islanded per page;
  Three.js loads only on pages that embed a Bloch sphere.
- **Simulator boundary** — 4-qubit hard cap, vanilla TS, zero deps. If
  v2 needs more qubits we revisit; we don't pre-build for it.
- **Accessibility** — WCAG 2.2 AA. `prefers-reduced-motion` disables all
  scroll-tied animation.
- **Hosting** — Static host (GitHub Pages / Netlify / Vercel). No runtime.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Custom vanilla-TS simulator over Qiskit/Quirk embed | Inspectability = credibility for dev audience; ~200 LOC is cheap | [good] M0 simulator is 130 LOC, all tests pass |
| Astro over Next.js | Content-heavy site with islands of interactivity is Astro's sweet spot; ship less JS | [pending] validation in M1 |
| Qubit-0 is LSB (Qiskit convention) | Mental-model transfer to real Qiskit later | [good] encoded in simulator + tests |
| KaTeX over MathJax | Build-time render, smaller payload | [pending] added in M1 |
| Ship one essay end-to-end before scaling out | De-risk pedagogy first — that's the real bottleneck | [pending] M1 is the test |
| No React/Vue/Preact added until widget proves it needs one | YAGNI; Astro islands can be vanilla TS if simple enough | [pending] revisit during M1 widget build |

---

## Evolution

After each phase: invalidated reqs → Out of Scope; shipped reqs → Validated
(with phase ref); new reqs → Active; log decisions to the table above.
