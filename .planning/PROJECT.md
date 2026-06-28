# Project: Quantum

*Last updated: 2026-06-28 — v1.0 shipped (code-complete; deploy is a parallel ops task). v2.0 milestone started.*

## What This Is

A static, browser-only website that teaches quantum computing to working
software developers through **two interlocking experiences**:

1. **Scrollytelling essays** that build intuition step by step, each
   essay embedding interactive widgets driven by a real state-vector
   simulator (vanilla TypeScript, ≤ 4 qubits).
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

---

## Current Milestone: v2.0 — Return, Comfort, Voice

**Goal:** Close the three obvious gaps that will be visible the moment
v1 hits readers — no way to save circuits, no theme choice, no in-site
feedback channel — without breaking the static-site, no-backend posture
that defines the project.

**Target features:**

1. **Circuit Gallery** — local "my saved circuits" shelf backed by
   IndexedDB. Save / name / load / delete / duplicate / export / import.
   Schema designed to sync to a remote API later with zero migration.
2. **Dark + Light Mode** — Tailwind `darkMode: 'class'`, `localStorage`-
   backed user override, FOUC-killer inline `<head>` script, full
   widget audit across KaTeX / Three.js / Canvas / Tones / annotations.
3. **Unified Feedback Form** — single `/feedback` page POSTing to a
   Google Apps Script Web App that appends rows to a private Google
   Sheet you own. Honeypot for spam; mailto fallback on failure.

**Source of truth for design:** `docs/plans/2026-06-26-v2-design.md`
(brainstormed 2026-06-26, ratified 2026-06-28).

**Phases:** see `.planning/ROADMAP.md`. v1 history lives in
`.planning/MILESTONES.md`; archived v1 phase artifacts under
`.planning/phases/_archive-v1/`.

---

## Requirements

### Validated (shipped & proven in v1.0)

- [done] REQ-01 — Static, browser-only site (no server, DB, fetch) — Phases 1–5
- [done] REQ-02 — Real in-browser state-vector simulator, vanilla TS,
  ≤ 4 qubits — Phase 1
- [done] REQ-03 — Seven concept essays: qubit, superposition, measurement,
  gates, entanglement, CNOT+Bell, Deutsch — Phases 2, 4, 5
- [done] REQ-04 — Homepage with visual concept map (essays + sandbox
  + challenges) — Phase 4
- [done] REQ-05 — Scrollytelling layout: hook → intuition → widget →
  math → check → next — Phase 2
- [done] REQ-06 — Interactive widgets: BlochSphere (3D), ProbabilityBars,
  StateVector readout, CircuitBuilder — Phases 2, 3, 5
- [done] REQ-07 — KaTeX math behind "for the math nerds" collapsibles — Phase 2
- [done] REQ-08 — 2D polar fallback for Bloch on small screens / no-WebGL — Phase 2
- [done] REQ-09 — Perf budget: predicted ≤ 2s LCP on 4G; formal Lighthouse
  pending deploy — Phase 5 (manual audit in `LIGHTHOUSE.md`)
- [done] REQ-10 — Accessibility: WCAG 2.2 AA; `prefers-reduced-motion`
  honored — Phases 2–5
- [done] REQ-11 — Simulator passes textbook unit tests — Phase 1
- [done] REQ-12 — Each essay ends with a 1–2 question self-test — Phases 2, 4, 5
- [done] REQ-13 — Hard 4-qubit cap enforced via constructor guard — Phase 1
- [done] REQ-14 — Pedagogy validated for v1 reader; full validation
  carries over to v1 deploy + feedback round
- [done] REQ-15 — Direct manipulation everywhere — Phases 2, 3, 4, 5
- [done] REQ-16 — Parameterized rotation gates Rx/Ry/Rz — Phase 2
- [done] REQ-17 — Quantum Sandbox at `/sandbox` — Phase 3
- [done] REQ-18 — URL-shareable circuits + "remix in sandbox" CTAs — Phases 3, 4, 5
- [done] REQ-19 — Drag the Bloch sphere — Phase 2
- [done] REQ-20 — Challenge mode + 5 starter puzzles — Phase 3
- [done] REQ-21 — Quantum Canvas (PNG export) + Quantum Tones (WAV
  export) — Phase 3
- [done] REQ-22 — Annotations / pins persisted in `localStorage` — Phase 2
- [done] REQ-23 — Undo/redo + keyboard shortcuts in sandbox — Phase 3

### Active (v2.0 scope)

See `.planning/REQUIREMENTS.md` for the full v2 requirement list with
REQ-IDs `GAL-*`, `THEME-*`, `FB-*`, `OPS-*`. Summary by category:

- **Theme system** (`THEME-01..05`) — class-based dark mode, persisted
  user override, FOUC-killer script, full widget audit (KaTeX, Three.js,
  Canvas, Tones, annotations, ConceptMap, Shiki), Playwright visual
  regression.
- **Feedback form** (`FB-01..05`) — `/feedback` page, Apps Script +
  Google Sheet transport, honeypot, optional email, mailto fallback.
- **Circuit Gallery** (`GAL-01..09`) — IndexedDB store via `idb-keyval`,
  schema v1 with migrations, thumbnail generator, `/gallery` page,
  sandbox save drawer, export / import / duplicate / rename / delete,
  hydrates via the existing URL-fragment codec.
- **Launch ops** (`OPS-01..03`) — v2 a11y + Lighthouse audit, dark-mode
  visual QA pass, v2 announcement draft.

### Out of Scope (v2 — still v3+ territory)

- [no] User accounts / login — sync stays client-only
- [no] Public / community gallery feed — moderation cost
- [no] Comment threads — replaced by the feedback form
- [no] Upvoting / Canny-style public roadmap
- [no] Cross-device gallery sync — schema is sync-ready; the sync layer
  itself is v3
- [no] Real quantum hardware integration (IBM Q) — adds auth + cost + flakiness
- [no] Embedded Qiskit/Cirq editor — IDE territory; sandbox "export to
  Qiskit text" remains a v3 stretch
- [no] Algorithms beyond Deutsch (Grover, Shor, QFT, VQE) — v3 algorithm
  track 2/3 (teleportation, superdense coding, Grover, QFT, Shor)
- [no] i18n — single-language

## Context

- v1.0 shipped 2026-06-26: 7 essays, sandbox, canvas, tones, challenges,
  concept-map homepage, SEO infra, 146 vitest tests passing, 16 pages
  building clean. See `.planning/MILESTONES.md` for the full v1 record.
- v1 deploy is a parallel ops task (Cloudflare Pages recommended);
  checklist lives in
  `.planning/phases/_archive-v1/05-algorithms/LAUNCH-ANNOUNCEMENT.md`.
- v2 brainstorm captured in `docs/plans/2026-06-26-v2-design.md`.
- Existing landscape unchanged: IBM/Qiskit (too math-heavy), pop-sci
  (too shallow), 3B1B (beautiful but passive), Distill.pub (great
  format but no quantum content). Site sits at the 3B1B × Distill
  intersection, scoped to quantum, aimed at devs.

## Constraints

- **Tech stack** — Astro + Tailwind + Vitest. v2 adds `idb-keyval`
  (~600 B gzipped) and Playwright (devDep only, for visual regression).
  No new runtime framework deps; theme system is pure Tailwind + a
  ~20-line inline `<head>` script.
- **Performance** — LCP budget unchanged: 2s on 4G for essays, 3s for
  sandbox. Gallery code lazy-loaded from `/sandbox` and `/gallery`
  only — must not bloat essay bundles.
- **Storage** — IndexedDB primary, with try/catch + in-memory fallback
  for private-browsing mode. Soft warning at 100 saved circuits.
- **Accessibility** — WCAG 2.2 AA carries; new requirement is **AA
  contrast in *both* themes**. Keyboard operability on `/gallery` and
  `/feedback`.
- **No backend (still).** Third-party HTTP endpoints (Google Apps
  Script) are acceptable because they cost nothing, require no ops,
  and can be replaced with a real API later without breaking the
  client contract. No servers *we* run.
- **Theme strategy locked** — Tailwind `darkMode: 'class'` over
  `'media'`-only so users can override OS preference.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Custom vanilla-TS simulator over Qiskit/Quirk embed | Inspectability = credibility for dev audience; ~200 LOC is cheap | [good] simulator 130 LOC; 146 tests pass at v1 |
| Astro over Next.js | Content-heavy site with islands of interactivity is Astro's sweet spot; ship less JS | [good] 16 pages, perf budget met at v1 |
| Qubit-0 is LSB (Qiskit convention) | Mental-model transfer to real Qiskit later | [good] encoded in simulator + tests |
| KaTeX over MathJax | Build-time render, smaller payload | [good] shipped in Phase 2 |
| Ship qubit essay end-to-end first; sandbox second; remaining essays third | Pedagogy validation first, then sandbox unlocks "remix" CTAs across the rest of the site | [good] validated across v1 |
| Pivot to creativity-first product (sandbox + creative outputs are core, not v2) | A reading-only quantum site leaves no room for exploration; creativity = retention | [good] sandbox + canvas + tones shipped Phase 3 |
| URL-fragment circuit sharing instead of server-backed gallery | Keeps the site static + zero-ops; fragments are unlimited, free, and shareable in any chat tool | [good] codec round-trip tests pass; nav graph + sandbox-links mirror tests in CI |
| Param rotations Rx/Ry/Rz added to simulator in Phase 2 (early) | Continuous θ is what makes Bloch dragging, sliders, and creative sweeps possible | [good] enabled v2 sandbox sliders + Phase 4 gate sweeps |
| Reactivity = vanilla TS + in-repo `signal<T>` | Survived every v1 phase; no React/Preact runtime cost | [good] carry into v2 |
| Sandbox visualization re-use pattern: extract slim components (`MiniBloch`, `CircuitView`); never import sandbox hydrators coupled to the singleton store | Keeps essays decoupled from sandbox internals | [good] proven across Phases 4+5 |
| Build-time circuit encoding for deep links (`SandboxLink`, `CircuitView`) | Static href, zero runtime cost, CI catches broken codec | [good] shipped Phase 4 |
| Cross-essay nav in essay frontmatter, asserted by `tests/essays/nav-graph.test.ts` | Centralized JSON would be worse; test mirror catches drift cheaply | [good] proven in Phase 4 |
| Test mirrors of source canonical lists (concept-map nodes, nav chain, sandbox-link starters) | Whenever v2 touches any of these, touch the mirror in the same commit | [good] working norm |
| Algorithm essays use the "why should I care" opener | Carries into v3 algorithm track | [good] used in `/cnot-bell`, `/deutsch` |
| **No analytics. Ever.** | Privacy promise; core launch announcement line | [locked] re-ratified at v2 entry |
| **v2: IndexedDB via `idb-keyval` over localStorage** | 5MB cap too tight; async; future-friendly to sync layer | [pending] proven in v2 Phase 3 |
| **v2: Tailwind `darkMode: 'class'` over `'media'`** | Allows user override of OS preference; 3-state toggle | [pending] proven in v2 Phase 1 |
| **v2: Google Apps Script + Sheet over Formspree** | Free forever, no submission cap, data ownership | [pending] proven in v2 Phase 2 |
| **v2: Gallery reuses URL-fragment codec for hydration** | DRY — one circuit-loading code path | [pending] proven in v2 Phase 3 |
| **v2: Theme stored in `localStorage` (not cookie)** | Static site, no server reads it; survives offline | [pending] proven in v2 Phase 1 |
| **v2: Honeypot for spam (not reCAPTCHA)** | Zero JS deps, accessible, sufficient for low-volume site | [pending] proven in v2 Phase 2 |
| **v2: Defer cloud sync to v3** | Honors no-backend v2 constraint; schema is sync-ready when we want it | [pending] revisit at v2 retro |

---

## Evolution

After each phase: invalidated reqs → Out of Scope; shipped reqs → Validated
(with phase ref); new reqs → Active; log decisions to the table above.

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state
