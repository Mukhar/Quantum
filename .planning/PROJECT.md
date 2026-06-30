# Project: Quantum

*Last updated: 2026-06-30 after v3.0 milestone — v3.0 feature-complete (deploy carry-over pending alongside v1 + v2 deploy queue). Next milestone TBD.*

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

## Current State

**v3.0 — Algorithms × Use Cases — shipped feature-complete
2026-06-30.** 5 algorithm essays (Teleportation, Superdense,
Grover, Shor, VQE) interleaved with the practical use case each
unlocks; Qiskit text export ships on every `CircuitView` and on the
sandbox toolbar; localStorage-only progress indicator on the concept
map. 658 tests across 44 vitest files, 24 pages building cleanly,
all routes within `bundle-budget.json` ceilings.

v3.0 closes the v1+v2 reader's last open question: *"Where does
this actually bite reality?"* Every essay teaches the algorithm AND
the use case in the same scroll, with widgets driving both halves.

**Operational carry-over (parallel ops tasks, not phase work):**

- v1 deploy + post-launch feedback round
- v2 deploy (Apps Script provisioning, Lighthouse, smoke test)
- v3 deploy (Cloudflare Pages, formal Lighthouse audit per
  `.planning/phases/06-vqe/LIGHTHOUSE-PLAN.md`, launch-day 9-step
  smoke test, announce per `V3-LAUNCH-ANNOUNCEMENT.md`)
- Live VoiceOver/NVDA pass on v3 widgets
- Real-device mobile check of `LargeCircuitView` horizontal-scroll

## Next Milestone Goals

Not yet scoped. Run `/gsd-new-milestone` to start the next cycle
(requirements → research → roadmap). Candidate themes captured in
`.planning/milestones/v3.0-REQUIREMENTS.md` → "Future Requirements":
Qiskit reverse-import, cross-device gallery sync, HHL / QAOA /
error-correction essays, quantum-sensing essays, pick-a-path
reading order, KaTeX self-host, 8-qubit simulator extension.

**Source of truth for v3 design:** `docs/plans/2026-06-29-v3-design.md`
(brainstormed and ratified 2026-06-29).

**Per-phase artifacts:** `.planning/phases/0X-*` (will move to
`.planning/phases/_archive-v3/` at next milestone start).
**Archived milestone roadmap + requirements:**
`.planning/milestones/v3.0-ROADMAP.md`,
`.planning/milestones/v3.0-REQUIREMENTS.md`.
**Project history:** `.planning/MILESTONES.md`.

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

### Validated (shipped & proven in v2.0)

- [done] THEME-01..04 — Class-based dark mode, FOUC-free, user override, AA contrast in both themes — v2 Phase 1
- [done] FB-01..05 — `/feedback` + Apps Script + honeypot + mailto fallback + setup doc — v2 Phase 2
- [done] GAL-01..09 — IndexedDB-backed circuit gallery, schema v1, export/import, in-memory fallback — v2 Phase 3
- [done] v2 OPS-01..03 — v2 Lighthouse audit plan, dark-mode visual QA, v2 announcement draft — v2 Phase 4
- [deferred] THEME-05 — Playwright visual regression deferred to v2.1 (see `_archive-v2/04-launch-polish/VISUAL-REGRESSION-DEFERRED.md`)

### Validated (shipped & proven in v3.0)

- [done] QSK-01..03 — Qiskit text export from sandbox toolbar + every essay `CircuitView`; drift-proof golden gate-coverage test — v3 Phase 1
- [done] v3 OPS-04 — Per-route bundle-size CI gate (`scripts/check-bundle-budget.mjs` + `bundle-budget.json`) — v3 Phase 1
- [done] ALG-01..02, USE-01 — `/teleportation` essay with `ProtocolStepper`, mixed-state `MultiBlochPanel`, 3-node `QuantumNetwork` — v3 Phase 2
- [done] ALG-03, USE-02 — `/superdense-coding` essay with `EncodingTable` and `HolevoBound` — v3 Phase 3
- [done] ALG-04, USE-03 — `/grover` essay with oracle + diffusion simulator path, `AmplitudeBars` iterator, `SearchComparison` — v3 Phase 4
- [done] ALG-05..06 — `/shor` QFT half: 4-qubit `QFTVisualizer` + `PeriodFinding` for `N ≤ 15` — v3 Phase 5a
- [done] ALG-07, USE-04 — `/shor` extended with static N=15 `LargeCircuitView` + prominent Qiskit CTA, `RSACountdown`, NIST `PQCCards` — v3 Phase 5b
- [done] ALG-08..09, USE-05 — `/vqe` with vanilla-TS `gradientDescent` optimizer, `EnergyLandscape` SSR heatmap (drag + auto-descend), `MoleculeGallery` (H₂/LiH/HeH⁺) — v3 Phase 6
- [done] PROG-01 — Concept-map per-essay visited flag via `localStorage["quantum/visited"]`; scroll-past-50% threshold; **no analytics** — v3 Phase 6 (count adjusted from 10 → 12 essays; route-keyed so contract preserved)
- [done] v3 OPS-02 — `V3-LAUNCH-ANNOUNCEMENT.md` draft committed — v3 Phase 6
- [done] v3 OPS-03 — Concept-map layout audit: **FLAT** layout ships (14 nodes in four rows; track-grouping not needed) — v3 Phase 6
- [deferred] v3 OPS-01 — Formal Lighthouse mobile a11y ≥ 95 audit on all 24 routes in both themes is a launch-day manual gate per `.planning/phases/06-vqe/LIGHTHOUSE-PLAN.md`; structural a11y shipped on every route — v3 Phase 6

Full v3 requirement archive (with traceability table and notes on
changed requirements) lives in
`.planning/milestones/v3.0-REQUIREMENTS.md`.

### Active

No active milestone. Run `/gsd-new-milestone` to scope the next
cycle (requirements → research → roadmap).

### Out of Scope (v3 — still v4+ territory)

- [no] User accounts / login — sync stays client-only
- [no] Public / community gallery feed — moderation cost
- [no] Comment threads — replaced by the feedback form
- [no] Upvoting / Canny-style public roadmap
- [no] Cross-device gallery sync — schema is sync-ready; sync layer = v4
- [no] Real quantum hardware integration (IBM Q) — adds auth + cost + flakiness
- [no] Embedded Qiskit/Cirq editor — IDE territory; v3 export is one-way only
- [no] Sandbox import of Qiskit text (reverse direction) — v4 stretch at earliest
- [no] 8-qubit simulator extension — Qiskit export handles Shor's overflow
- [no] Full Shor-on-N=15 in-browser — same; Qiskit bridge owns it
- [no] Playwright E2E sandbox-flow harness — deferred again from v2; not blocking v3
- [no] Pedagogy experiments (pick-a-path routing) — deferred from v2
- [no] HHL / QPCA / quantum ML / QAOA / error-correction essays — v4 candidates
- [no] Quantum sensing / metrology essays — not algorithm-class; v4 standalone if ever
- [no] i18n — single-language

## Context

- v1.0 shipped 2026-06-26: 7 essays, sandbox, canvas, tones,
  challenges, concept-map homepage, SEO infra. 146 vitest tests,
  16 pages. See `.planning/MILESTONES.md` for the full v1 record.
- v2.0 code-complete 2026-06-28: three-state theme toggle,
  `/feedback` (Apps Script), IndexedDB circuit gallery. 247 tests,
  19 pages, +44 KB site bundle.
- v3.0 feature-complete 2026-06-30: 5 algorithm essays
  (Teleportation, Superdense, Grover, Shor, VQE) + Qiskit export
  everywhere + localStorage-only progress indicator. 658 tests, 24
  pages, 7 phases, 38 plans, 65 commits over 2 days.
- All three milestones share a deploy carry-over queue. v1 + v2 + v3
  deploys all run on the same Cloudflare-Pages-recommended track and
  are tracked under their respective archive folders.
- v2 brainstorm: `docs/plans/2026-06-26-v2-design.md`.
  v3 brainstorm: `docs/plans/2026-06-29-v3-design.md`.
- Existing landscape unchanged: IBM/Qiskit (too math-heavy), pop-sci
  (too shallow), 3B1B (beautiful but passive), Distill.pub (great
  format but no quantum content). Site sits at the 3B1B × Distill
  intersection, scoped to quantum, aimed at devs.

## Constraints

- **Tech stack** — Astro + Tailwind + Vitest. v2 added `idb-keyval`
  (~600 B gzipped) and Playwright (devDep only). **v3 added zero
  new runtime dependencies** — VQE optimizer, Qiskit exporter,
  PROG-01 storage, and every widget are all vanilla TypeScript.
  Theme system remains pure Tailwind + a ~20-line inline `<head>`
  script.
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
| **v2: IndexedDB via `idb-keyval` over localStorage** | 5MB cap too tight; async; future-friendly to sync layer | [good] shipped v2 Phase 3 |
| **v2: Tailwind `darkMode: 'class'` over `'media'`** | Allows user override of OS preference; 3-state toggle | [good] shipped v2 Phase 1 |
| **v2: Google Apps Script + Sheet over Formspree** | Free forever, no submission cap, data ownership | [good] shipped v2 Phase 2 |
| **v2: Gallery reuses URL-fragment codec for hydration** | DRY — one circuit-loading code path | [good] shipped v2 Phase 3 |
| **v2: Theme stored in `localStorage` (not cookie)** | Static site, no server reads it; survives offline | [good] shipped v2 Phase 1 |
| **v2: Honeypot for spam (not reCAPTCHA)** | Zero JS deps, accessible, sufficient for low-volume site | [good] shipped v2 Phase 2 |
| **v2: Defer cloud sync to v3** | Honors no-backend v2 constraint; schema is sync-ready when we want it | [done] re-deferred to v4 at v3 entry |
| **v3: Interleaved essays (algorithm + use case)** | Deepens v1's "why should I care" opener into real content; one essay = one complete payoff | [good] proven across v3 phases 2-6 |
| **v3: Keep simulator at 4 qubits** | Qiskit export handles the only algorithm that exceeds it (Shor); every other v3 essay fits | [good] proven in v3 Phase 5b — simulator.ts/circuit.ts unchanged across the full milestone |
| **v3: Qiskit export as Shor's pedagogical bridge** | Stronger framing than watered-down in-browser Shor: "you've learned the parts; now run the real thing" | [good] proven in v3 Phase 5b with `LargeCircuitView` + Shor-specific CTA |
| **v3: One essay per phase, foundation-first** | v1 lesson: ship one essay end-to-end first. v3 essays are denser than v1's, so one-per-phase rhythm fits | [good] proven across v3 (with Phase 5 split into 5a + 5b for reviewable plans) |
| **v3: Flagship = Teleportation (Phase 2)** | Extends v1's entanglement story most directly → lowest pedagogical risk for format validation | [good] proven in v3 Phase 2; format scaled cleanly to phases 3-6 |
| **v3: `MultiBlochPanel` renders mixed states inside the sphere** | Truthful visualization; sphere only honestly shows pure single-qubit states | [good] proven in v3 Phase 2 |
| **v3: VQE classical optimizer in vanilla TS** | Same inspectability bar as the simulator; ~50-100 LOC | [good] proven in v3 Phase 6 — `gradientDescent` + `h2Energy` converge to within 1e-3 of true minimum |
| **v3: Qiskit export ships everywhere, not just on Shor** | Strengthens "now go do this for real" theme across all essays; sibling to v1's "remix in sandbox" CTA | [good] proven in v3 Phase 1 — drift-proof QSK-03 golden test guards every gate |
| **v3: Progress indicator is localStorage-only (not tracking)** | Honors "no analytics. ever." with a one-line PROJECT clarification | [good] proven in v3 Phase 6 — PROG-01 storage failure-tolerant, zero network beacons |
| **v3: Same-commit mirror discipline (D-45)** | Routes + nav-graph + concept-map + sandbox-links + bundle-budget + sitemap all update together | [good] held across all 7 v3 phases; mirror tests catch drift cheaply |
| **v3: Concept-map FLAT layout ships** | OPS-03 layout audit verdict: 14 nodes in four rows reads cleanly — track-grouping not needed | [good] re-evaluate only on user-reported clutter |

---

## Evolution

After each phase: invalidated reqs → Out of Scope; shipped reqs → Validated
(with phase ref); new reqs → Active; log decisions to the table above.

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state
