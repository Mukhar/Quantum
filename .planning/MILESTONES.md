# Milestones

Project-level history of shipped milestones. Each entry is a short
summary; full per-phase artifacts live under
`.planning/phases/_archive-<milestone>/`.

---

## v1.0 — Initial public release (shipped 2026-06-26)

**Goal:** Ship a quantum-computing learning + playground site for
working devs: rigorous interactive essays + a creativity-first sandbox.

**Phases (all done):**

| Phase | Name | Plans | Completed |
|-------|------|-------|-----------|
| 1 | Foundation                         | 3/3 | 2026-06-24 |
| 2 | Flagship interactive qubit essay   | 6/6 | 2026-06-25 |
| 3 | Quantum Sandbox + Creative Outputs | 7/7 | 2026-06-26 |
| 4 | Foundations essay track            | 6/6 | 2026-06-26 |
| 5 | Algorithm track + v1 launch        | 5/5 | 2026-06-26 |

**Shipped:**

- 7 essays: `/qubit`, `/superposition`, `/measurement`, `/gates`,
  `/entanglement`, `/cnot-bell`, `/deutsch`
- `/sandbox` circuit composer with URL-fragment sharing, undo/redo,
  challenge mode (5 starter puzzles), Quantum Canvas (PNG export),
  Quantum Tones (WAV export)
- Concept-map homepage with cross-essay nav
- SEO infra: `robots.txt`, `sitemap.xml` endpoint, og/twitter meta,
  site-wide SVG og-image, canonical link tags, friendly 404
- 146 vitest tests passing, 16 pages building clean
- `LIGHTHOUSE.md` manual audit + `LAUNCH-ANNOUNCEMENT.md` draft

**Requirements validated:** REQ-01 → REQ-23 (all 23 v1 requirements).
See PROJECT.md "Validated" section for the per-requirement ledger.

**Carryover (post-milestone task, not a phase):**
- v1 deploy + post-launch feedback round. Tracked in
  `.planning/phases/_archive-v1/05-algorithms/LAUNCH-ANNOUNCEMENT.md`
  pre-launch checklist. Runs whenever ready; does not block v2 work.

**Archived under:** `.planning/phases/_archive-v1/`

---

## v2.0 — Return, Comfort, Voice (code-complete 2026-06-28)

**Goal:** Close three v1 gaps — no save, no theme choice, no in-site
feedback — without breaking the static-site, no-backend posture.

**Phases (all done):**

| Phase | Name | Plans | Completed |
|-------|------|-------|-----------|
| 1 | Theme system                       | 4/4 | 2026-06-28 |
| 2 | Feedback form (Apps Script)        | 5/5 | 2026-06-28 |
| 3 | Circuit gallery (IndexedDB)        | 9/9 | 2026-06-28 |
| 4 | Launch polish (audit + announce)   | 6/6 | 2026-06-28 |

**Shipped:**

- Three-state theme toggle (light / dark / system), 17-token semantic
  palette, FOUC-free inline bootstrap, themechange CustomEvent picked
  up by Three.js + inline SVG widgets
- `/feedback` + `/feedback/thanks` — Apps Script POST with honeypot,
  server-side rate limit, mailto fallback, no XSS surface
- `/gallery` + `/sandbox` Save dialog — IndexedDB via `idb-keyval`,
  schema v1, JSON export/import, in-memory fallback for Safari Private
  Browsing, click-card-to-reopen via existing URL-fragment codec
- 247 vitest tests (+101 over v1), 19 pages building clean
- v2 launch announcement, bundle audit, visual QA scorecard, Lighthouse
  plan, Plan 01-05 visual-regression deferred decision

**Requirements validated:** THEME-01..04, FB-01..05, GAL-01..09,
OPS-01..03 (all 22 v2 requirements).

**Deferred to v2.1 / backlog:**
- Playwright visual regression harness (see
  `.planning/phases/04-launch-polish/VISUAL-REGRESSION-DEFERRED.md`)
- KaTeX self-host (Plan 01-06 from v1 carryover)

**Bundle delta:** +44 KB site-wide (+6.9%), all in new-route chunks.
Essay routes unchanged at 4 KB initial JS. See
`.planning/phases/04-launch-polish/BUNDLE-AUDIT.md`.

**Carryover (post-milestone tasks, not phases):**
- Manual Lighthouse run per `04-launch-polish/LIGHTHOUSE-PLAN.md`
- Apps Script endpoint provisioning + `PUBLIC_FEEDBACK_URL` set
- Launch-day smoke test per `04-launch-polish/LAUNCH-ANNOUNCEMENT.md`
- v1 deploy carryover (still open from v1.0 if not yet shipped)

**Archived under:** `.planning/phases/_archive-v2/` (moved post code-complete).

---

## v3.0 — Algorithms × Use Cases (feature-complete 2026-06-30)

**Goal:** Pair the canonical quantum-algorithm canon with the
practical use case each algorithm unlocks. Every v3 essay teaches
the algorithm AND the use case in the same scroll, with widgets
driving both halves. Close the v1+v2 reader's open question:
*"Where does this actually bite reality?"*

**Phases (all done):**

| Phase | Name | Plans | Completed |
|-------|------|-------|-----------|
| 1   | Foundation — Qiskit export + bundle CI       | 4/4 | 2026-06-29 |
| 2   | Teleportation + Quantum networks (FLAGSHIP)  | 6/6 | 2026-06-29 |
| 3   | Superdense + Holevo bound                    | 4/4 | 2026-06-30 |
| 4   | Grover + Search reality                      | 6/6 | 2026-06-30 |
| 5a  | Shor — QFT + period-finding                  | 5/5 | 2026-06-30 |
| 5b  | Shor — N=15 + RSACountdown + PQC             | 5/5 | 2026-06-30 |
| 6   | VQE + Chemistry + v3 launch                  | 8/8 | 2026-06-30 |

**Shipped:**

- 5 new essays: `/teleportation`, `/superdense-coding`, `/grover`,
  `/shor`, `/vqe` (each interleaves algorithm half + use-case half;
  Shor 5a/5b share the same `/shor` URL)
- Qiskit text export on every essay `CircuitView` + sandbox toolbar
  with drift-proof golden gate-coverage test
- Per-route bundle-size CI gate (`bundle-budget.json` +
  `scripts/check-bundle-budget.mjs`); recomputed every phase
- `MultiBlochPanel` honest mixed-state rendering (Bloch arrow
  length = `|r|` for reduced density matrices)
- `QuantumNetwork` 3-node entanglement-swap widget,
  `EncodingTable` + `HolevoBound`, `AmplitudeBars` + `SearchComparison`,
  `QFTVisualizer` + `PeriodFinding`, `LargeCircuitView` (static N=15)
  + `RSACountdown` + NIST `PQCCards`, `EnergyLandscape` (drag +
  auto-descend) + `MoleculeGallery` (H₂/LiH/HeH⁺)
- VQE vanilla-TS optimizer (`gradientDescent` + `h2Energy`) — zero
  new runtime dependencies
- Concept-map per-essay visited indicator
  (`localStorage["quantum/visited"]`, scroll-past-50% threshold,
  no analytics, route-keyed)
- `V3-LAUNCH-ANNOUNCEMENT.md`, `LIGHTHOUSE-PLAN.md`, `BUNDLE-AUDIT.md`
  (with concept-map layout audit subsection — verdict: **FLAT** ships)
- 658 vitest tests (+411 over v2), 24 pages building clean,
  all routes within bundle ceilings

**Requirements validated:** QSK-01..03, ALG-01..09, USE-01..05,
PROG-01, OPS-01..04 (all 22 v3 requirements). PROG-01 essay count
adjusted from 10 → 12 (route-keyed; cosmetic). OPS-01 formal
Lighthouse audit deferred to launch-day per OPS-01's "recorded in
v3 launch artifact" clause.

**Close-out invariants (verified `git diff 7ab3fa4..668be9b`):**
- `src/lib/quantum/simulator.ts`: 0 lines changed (MAX_QUBITS = 4
  survived 6 v3 algorithm phases)
- `src/lib/quantum/circuit.ts`: 0 lines changed (same)
- `package.json` + `package-lock.json`: 0 lines changed (no new
  runtime deps across the entire milestone)
- 12-essay reading chain: `qubit → superposition → measurement →
  gates → entanglement → cnot-bell → deutsch → teleportation →
  superdense-coding → grover → shor → vqe`

**Bundle delta:** /vqe at 2.3 KB gzip / 3.0 KB ceiling; /deutsch
bumped 1024 → 2048 B for PROG-01 scroll observer; all 22 other
routes unchanged. Total site bundle within budget.

**Deferred to v4+:**
- Sandbox **import** of Qiskit text (reverse-direction transpile)
- 8-qubit simulator extension
- Cross-device gallery sync (sync layer)
- HHL / QPCA / quantum ML / QAOA / error-correction essays
- Quantum-sensing / metrology essays
- KaTeX self-host
- Pedagogy experiments (pick-a-path reading order)
- Playwright visual-regression harness (still deferred from v2)

**Carryover (post-milestone tasks, not phases):**
- v3 deploy: Cloudflare Pages flow + Lighthouse formal audit per
  `.planning/phases/06-vqe/LIGHTHOUSE-PLAN.md` + launch-day 9-step
  smoke test per `06-vqe/V3-LAUNCH-ANNOUNCEMENT.md` + announce
- Live VoiceOver/NVDA pass on `EnergyLandscape`, `MoleculeGallery`,
  `LargeCircuitView`, `RSACountdown`, PROG-01 announcements
- Real-device mobile check of `LargeCircuitView` horizontal-scroll
- v1 + v2 deploy carryovers still open (all three deploys share the
  same Cloudflare Pages flow)

**Archived under:** `.planning/phases/0X-*` (will move to
`.planning/phases/_archive-v3/` at next milestone start).
**Milestone archive (this entry expanded):**
`.planning/milestones/v3.0-ROADMAP.md`,
`.planning/milestones/v3.0-REQUIREMENTS.md`.

