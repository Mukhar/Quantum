# Phase 6 — VQE + Chemistry + v3 launch — PHASE SUMMARY

*Completed: 2026-06-30 — autonomous-run execution across 8 plans (06-01..06-08); all atomic commits + SUMMARY commits + this phase-level summary commit. Plan 06-08 closes the v3.0 milestone.*

## Goal

Ship the final v3 phase. Land `/vqe` (variational/hybrid algorithm essay:
vanilla-TS optimizer + `EnergyLandscape` + `MoleculeGallery`), the
local-only PROG-01 concept-map visited indicator across all v3 essays,
and the v3 launch close-out (LIGHTHOUSE-PLAN, BUNDLE-AUDIT including
the concept-map layout audit, V3-LAUNCH-ANNOUNCEMENT). After this phase,
v3.0 — Algorithms × Use Cases is feature-complete.

## What shipped (per plan)

| Plan  | Commits   | Artifact |
|-------|-----------|----------|
| 06-01 | `4848dfb`, `7a252c1` | `src/lib/quantum/vqe.ts` (~330 LOC incl. ~60 LOC citation header + JSDoc) — `gradientDescent({f, initial, learningRate?, momentum?, maxSteps?, tolerance?, epsilon?, adaptiveGuardFactor?}): OptimizerStep[]`; `h2Energy(theta1, theta2): number` analytic 2-param H₂ surface; `H2_TRUE_MINIMUM = {theta1: π, theta2: π, energy: −1.137}`; `sampleSurface` / `interpolateSurface` (bilinear); `RESEED_SEEDS` (6 deterministic `[θ₁, θ₂]` pairs); `DEFAULT_INITIAL_THETAS`. Finite-difference central gradient + Polyak momentum + one-shot adaptive guard (D-02). Top-of-file Peruzzo et al. *Nature Comms* 5, 4213 (2014) citation for the −1.137 Hₐ FCI baseline (D-07). + `src/lib/quantum/index.ts` re-exports. + `tests/quantum/vqe.test.ts` (23 tests; 1D parabola convergence in 13 iter; H₂ surface convergence within `1e-3` from every one of 6 `RESEED_SEEDS` starts; determinism gate). |
| 06-02 | `3a507df`, `b64ff27` | `src/data/molecules.json` (new — first inhabitant of `src/data/`) — three molecules (`h2`, `hehplus`, `lih`), each with id / name / formula / `equilibrium_distance_angstrom` / qubits / `ansatz_params {θ₁, θ₂}` / `ansatz_ops` (`Op[][]` shape, valid under `validateCircuit`) / `energy_hartree` / `energy_ev` / `precomputed_note` / `source`. + `src/data/molecules.ts` typed shim exporting `MOLECULES`, `MOLECULE_IDS`, `HARTREE_TO_EV = 27.211386245988`, `Molecule` interface. + `tests/data/molecules.test.ts` (30+ tests across 7 suites: schema, unit consistency, ansatz round-trip through `validateCircuit`, Qiskit export validity for all three). |
| 06-03 | `0bfa8a1`, `cc112d4` | `src/components/EnergyLandscape.astro` (~460 LOC). SSR-baked 50×50 heatmap of `h2Energy` (2 500 `<rect>` cells), 2-stop brand gradient (indigo-500 → amber-500), isoband contour overlay, `(π, π)` true-minimum cross-hair, axis ticks at `{0, π/2, π, 3π/2, 2π}`. Hydrator: pointer drag with `setPointerCapture`, keyboard ArrowKeys (`2π/100` nudge), Home (jump to minimum), Auto-descend (60 ms/frame along the optimizer trajectory; `aria-busy="true"` during animation; reduced-motion snaps to converged frame), Reseed (modulo cycle through `RESEED_SEEDS`). Marker is `role="slider"` with focusable halo. + `tests/components/energy-landscape.test.ts` (12 structural assertions). |
| 06-04 | `0bfa8a1` (source), `2232b0e` (summary) | `src/components/MoleculeGallery.astro` (~153 LOC). SSR card grid of the three molecules. Each card: name + formula heading, disabled equilibrium-bond-distance slider labelled "equilibrium · slider is illustrative" (D-25), monospace `θ₁`/`θ₂` readout, converged energy in both Hartree and eV (D-26), embedded `<CircuitView circuit={…} showRemixLink={false}>` (per-card Copy-as-Qiskit via baked `data-qiskit` attr + page-wide event delegation — zero JS cost), visible `precomputed_note` + source citation. + `tests/components/molecule-gallery.test.ts` (11 assertions across 2 suites: structural source-grep + per-molecule `validateCircuit` round-trip + `toQiskit` numeric round-trip within `1e-4`). |
| 06-05 | `24ba1f0`, `c17b052` | `src/pages/vqe.astro` (new essay, full two-half rhythm) — algorithm half: hook + static `CircuitView` of `Ry(θ₁) ⊗ Ry(θ₂) → CNOT(0,1)` ansatz at `DEFAULT_INITIAL_THETAS` (D-18) + slim VQE-local `<p aria-live="polite">` readout positioned above the landscape (D-19) + `EnergyLandscape` embed + hand-off paragraph (D-29). Use-case half: near-term industrial framing with sourced primary-source DOI citations (Peruzzo 2014, Kandala 2017, Cao 2019) + `MoleculeGallery` + explicit reality check ("classical baselines like HF and CCSD remain hard competition"; noise + barren-plateau) + Qiskit CTA. Self-test (2 questions) + MathNerds appendix (Rayleigh-Ritz, central FD gradient, GD-with-momentum). Footer-nav `← /shor`, `/sandbox →`. Inline `<script>` wires the `vqe:thetachange` listener that mirrors EnergyLandscape's marker into the slim readout. + 7 same-commit mirror edits: ConceptMap node + edge + label, shor.astro footer rewire, sitemap, bundle-budget placeholder, concept-map test mirror, nav-graph CHAIN mirror, sandbox-links STARTERS mirror, EnergyLandscape `vqe:thetachange` event dispatch + assertion. + `tests/essays/vqe.test.ts` (8 structural). 23 → 24 pages; 625 → 639 tests. |
| 06-06 | `63c771c`, `5e32d0d` | PROG-01 visited indicator. `src/lib/progress.ts` (new): `VISITED_KEY = "quantum/visited"` (D-32), `VISITED_THRESHOLD = 0.5` (D-31), `getVisited()` / `markVisited(path)` / `clearVisited()` / `instrumentScrollDepth(currentPath)`. Every `localStorage` access wrapped in `try/catch` matching `theme.ts` + `annotations.ts`. `getVisited` returns `[]` on missing key / throwing `getItem` / non-JSON / wrong-shape / non-string-items / dedupes on read; `markVisited` dedupes on write and is silent on storage failure; `instrumentScrollDepth` uses passive `scroll` listener, self-removes on first trigger per path, idempotent per-page-session via module-level `triggered` set, treats short pages as fully-read on first scroll. + `src/layouts/EssayLayout.astro`: single inline `<script>` import + call instruments every essay (D-36). + `src/components/ConceptMap.astro`: hydrator imports `getVisited`, marks `data-visited="true"` on matching `<a>` in BOTH desktop SVG and mobile `<ol>` fallback via one `querySelectorAll('a[href]')`, updates `aria-label` to `"Read: <Label> (visited)"` (D-34). + style block: visited brightness lift via `--color-accent-muted` (fill) + `--color-accent-emphasis` (stroke + text); both themes; no tick badge / icon (D-34). + 19 new tests (`progress.test.ts` 11 + `instrument-scroll.test.ts` 3 + `concept-map-progress.test.ts` 5). |
| 06-07 | `93c4640`, `09ba2af` | OPS audits. `.planning/phases/06-vqe/LIGHTHOUSE-PLAN.md` (OPS-01, D-42): manual-run recipe targeting all 24 v3 routes in both `prefers-color-scheme: light` and dark; mobile a11y ≥ 95 hard target; pre-known a11y concerns catalogued (`EnergyLandscape` drag, `MoleculeGallery` focus order, PROG-01 visited announcement, `LargeCircuitView` scroll region, reduced-motion); pre-known perf concerns (KaTeX CDN, Sphere3D 130 KB gzipped lazy chunk, EnergyLandscape 2500-rect SSR); verdict intentionally blank pending launch-day run. + `.planning/phases/06-vqe/BUNDLE-AUDIT.md` (OPS-04, D-43): method, top-line v1→v2→v3 numbers, top-5 heaviest gzipped chunks, per-page initial JS payload pre-recompute snapshot, v3 line-item additions per phase, bundle isolation spot-checks. Embedded concept-map layout audit subsection (D-37..D-39, OPS-03) with full geometry inspection and **FLAT verdict** — 14-node, four-row layout reads cleanly; 40 px clear gaps in longest rows, 64–74 px between rows; track grouping (D-39 contingency) not invoked. |
| 06-08 | `a9dc659` | `.planning/phases/06-vqe/V3-LAUNCH-ANNOUNCEMENT.md` (new, ~360 lines) — v3 narrative + algorithm × use-case essays + Qiskit bridge everywhere + local-only PROG-01 + no-analytics / no-backend re-ratification + launch-day checklist (D-30, D-33, D-40, OPS-02). + `bundle-budget.json` final ceiling recompute: `/vqe` 4096 → 3072 B (tightens; eager JS landed at 2.3 KB with 1.7 KB headroom > 1 KB threshold); `/deutsch` 1024 → 2048 B (PROG-01 observer pushed actual to 0.9 KB, one byte from gate; restored 20 % cushion); all 22 other routes already at recompute boundary, no diff. Final verification pass: 658 tests, 24 pages, all bundles green. |

## Requirements closed

- **ALG-08** — Vanilla-TS classical optimizer with documented convergence guarantees:
  - `gradientDescent` converges on a 1D parabola within `1e-4` in 13 iterations (default opts).
  - `gradientDescent` converges on `h2Energy` within `1e-3` Hₐ from every one of 6 `RESEED_SEEDS` starts (default opts).
  - Determinism gate: two runs with identical opts produce `toEqual`-identical step arrays; no `Math.random`, no `Date.now()`.
- **ALG-09** — `EnergyLandscape` interactive H₂ energy-surface viewer with the three required affordances (drag / keyboard / Auto-descend) plus the Reseed cycle. Marker is `role="slider"` with `aria-orientation="other"` and `aria-valuemin/max` on `[0, 2π]`; visible focus halo; reduced-motion path snaps to converged frame. Auto-descend uses the same `gradientDescent` that `vqe.test.ts` pins (D-11).
- **USE-05** — Chemistry molecule gallery shipping 3 pre-baked molecules (H₂, LiH, HeH⁺) with saved ansatz parameters, converged energy in both Hartree and eV, and per-card Qiskit export. Equilibrium-distance slider disabled and labelled honestly (D-25). Pre-baked nature called out in every card's `precomputed_note` (D-25).
- **PROG-01** — Local-only progress indicator: visited state under `localStorage["quantum/visited"]` (D-32), 50% scroll threshold (D-31), no analytics / beacon / server (D-33), dim → bright concept-map indicator with `aria-label` announcement in both desktop SVG and mobile list fallback (D-34), single shared `EssayLayout` instrumentation for all 12 essays in the reading path (D-36).
- **OPS-01** — Lighthouse plan ratified with per-route expected-score table targeting mobile a11y ≥ 95 in both themes across all 24 v3 routes; pre-known concerns catalogued; verdict deferred to launch-day manual run.
- **OPS-02** — V3 launch announcement committed at the user-locked path with v2-equivalent tone, structure, variant blurbs, and 9-step launch-day checklist; `<URL>` / `<REPO>` placeholders flagged for ops-time substitution.
- **OPS-03** — Concept-map layout audit recorded in `BUNDLE-AUDIT.md`; FLAT verdict (D-37 default) honoured; track-grouping spec (D-39 contingency) recorded for future use but not invoked.
- **OPS-04** — Final ceiling recompute under `round_up(actual_gzip × 1.2, 1024)` landed in same commit as the regression-check pass; all 24 routes within new budget. `/vqe` 2.3 / 3.0 KB; `/deutsch` 0.9 / 2.0 KB; all 22 other routes unchanged.

## Numbers (post-phase)

- **Tests:** **658 / 658** passing across 44 vitest files (+110 from Phase 5b baseline of 548: 23 vqe + 30 molecules + 12 energy-landscape + 11 molecule-gallery + 8 vqe-essay + 11 progress unit + 3 progress integration + 5 concept-map-progress + 7 redistribution across mirror edits).
- **Pages:** **24** building clean in 2.17s (+1 from Phase 5b: `/vqe`).
- **Bundle (post-recompute):**
  - `/vqe`: 2.3 / 3.0 KB (final v3 essay; tightened from 4 KB placeholder).
  - `/deutsch`: 0.9 / 2.0 KB (bumped one boundary after PROG-01 observer added ~0.2 KB).
  - All other routes unchanged.
  - **Site-wide:** ~184.9 KB total gzipped JS across 45 chunks; `Sphere3D.client` (Three.js, lazy) still dominates at 129.8 KB gzipped; v3's new eager JS adds ~10 KB site-wide distributed across one hoist per page.
- **Footer-nav chain (final):** `qubit → superposition → measurement → gates → entanglement → cnot-bell → deutsch → teleportation → superdense-coding → grover → shor → vqe → sandbox` (12 essays + sandbox tail).

## Decisions ratified (D-01 .. D-45)

All 45 PHASE-CONTEXT decisions ratified across the 8 plans. Highlights:

- **D-01..D-09 (VQE optimizer + math, 06-01):** finite-difference GD + momentum + one-shot adaptive guard; fixed-seed defaults + Reseed exploration; pure UI-agnostic helpers; H₂ analytic surface with cited −1.137 Hₐ minimum; barrel re-export.
- **D-10..D-17 (EnergyLandscape, 06-03):** draggable marker as default interaction; Auto-descend uses optimizer snapshots; 2D heatmap + contours not 3D; 50×50 SSR sampled grid; brand-aligned 2-stop gradient; semantic contours + accessible text readouts; pointer/touch/keyboard/reduced-motion; local hydration only.
- **D-18..D-21 (ansatz + CircuitView + Qiskit bridge, 06-05/06-04):** static `CircuitView` reused for ansatz snapshot; live theta readout is essay-local (slim `<p>`); molecule cards use static converged parameters; `MAX_QUBITS = 4` unchanged.
- **D-22..D-26 (MoleculeGallery data + UX, 06-02/06-04):** all 3 molecules shipped; locked card layout; pre-baked converged parameters in `src/data/molecules.json`; honest labelling; Hartree as primary unit + eV as secondary.
- **D-27..D-30 (`/vqe` essay narrative, 06-05/06-08):** near-term industrial credibility framing; two-half essay skeleton; energy-minimization as the conceptual bridge; explicit no-hype prose (production drug discovery not solved).
- **D-31..D-36 (PROG-01, 06-06):** 50% scroll threshold; `localStorage["quantum/visited"]` array shape; no analytics; dim→bright concept-map indicator (no checkmark); reusable progress helper + small hydrators; instrumented for all 12 essays in reading path via single EssayLayout edit.
- **D-37..D-39 (concept-map layout, 06-07):** flat layout shipped first; audit at Phase-6 close-out with all nodes in place; track grouping not invoked.
- **D-40..D-45 (OPS close-out, 06-07/06-08):** user-locked artifact paths honoured (`V3-LAUNCH-ANNOUNCEMENT.md`, `BUNDLE-AUDIT.md`, `LIGHTHOUSE-PLAN.md`); Lighthouse-route count reconciled against live `bundle-budget.json` (24 routes after 5a/5b split); OPS-04 same-commit budget discipline preserved; same-commit mirror discipline preserved across every route-affecting plan.

## Close-out invariants (verified)

Diffs computed from Phase 6 start commit `4dafc34` (Phase 5b close-out) to `HEAD` after 06-08 commit:

| File | Phase-6 diff | Significance |
|---|---|---|
| `src/lib/quantum/simulator.ts` | 0 lines | `MAX_QUBITS = 4` hard cap survived Phase 6 — now ratified by 6 v3 algorithm phases (teleport, superdense, Grover, Shor 5a, Shor 5b, VQE). |
| `src/lib/quantum/circuit.ts` | 0 lines | Sandbox `Op` union unchanged; no new gate kinds added; circuit IR stable. |
| `package.json` | 0 lines | No new runtime deps in Phase 6 (and the Phase 6 PHASE-CONTEXT's "no charting libraries, no graph libraries, no analytics SDKs, no backend services" lock held). |
| `package-lock.json` | 0 lines | Lockfile stable; build determinism preserved. |
| `tests/essays/nav-graph.test.ts CHAIN[]` | 12 essays | qubit → superposition → measurement → gates → entanglement → cnot-bell → deutsch → teleportation → superdense-coding → grover → shor → vqe. |
| `tests/essays/concept-map.test.ts expectedEssays[]` | 12 essays | Same chain; mirror discipline preserved (D-45). |

## What this phase unlocks

- **v3.0 — Algorithms × Use Cases — is feature-complete.** Every canonical quantum algorithm taught in v3 is paired with the practical use case it unlocks: teleportation × quantum networks, superdense × Holevo bandwidth bound, Grover × √N reality check, Shor × RSA/PQC migration, VQE × chemistry/materials. The full 12-essay reading path is wired with same-commit mirror discipline, Qiskit-export bridge on every circuit, and a local-only PROG-01 visited indicator that re-ratifies the no-tracking promise.
- **The 4-qubit cap is now defensible across the entire algorithm canon.** Six v3 phases of algorithm work, zero `MAX_QUBITS` change. The only algorithm whose canonical form exceeds 4 qubits (Shor N=15) is handled by Qiskit export via the v3 foundation bridge.
- **The Qiskit bridge is the answer to "what about real hardware?"** Every essay's `CircuitView`, every molecule card, the static N=15 Shor circuit, and the sandbox toolbar all expose **Copy as Qiskit**. Build-time SSR keeps the per-page JS cost at zero.
- **Bundle discipline held.** v3 added +10 KB gzipped of eager JS site-wide across five new essays. No essay route exceeds 3.2 KB of eager JS post-recompute. OPS-04 CI gate is green; ceiling drift is minimal.
- **Test coverage scaled with surface area.** 146 → 247 → 658 tests across v1 → v2 → v3 (4.5× v1, 2.7× v2). Mirror discipline (concept-map, nav-graph, sandbox-links, bundle-budget) is enforced by failing tests on drift.

## Out-of-scope items (re-confirmed not done)

- No simulator cap bump (REQ-13 hard-locked at 4 qubits).
- No 3D energy landscape rendering (2D heatmap + contours per D-12).
- No live ab initio chemistry computation (molecules are pre-baked per D-25).
- No charting library, graph library, analytics SDK, backend service, real-hardware integration, API call, authentication, or telemetry.
- No new runtime dependency added in Phase 6 (and zero across all of v3 except v2's `idb-keyval`, which was already shipped).
- No "best PQC algorithm" recommendation (cards present standards neutrally — verified by 5b test).
- No specific RSA "break" calendar date (verified by 5b test).
- No `cphase` / `block` / `swap` op kinds added to the sandbox `Op` union (Shor N=15 lives in its own static module per 5b).
- No analytics or remote telemetry. Re-ratified in V3-LAUNCH-ANNOUNCEMENT.
- No 8+-qubit simulator (re-ratified in V3-LAUNCH-ANNOUNCEMENT).
- No accounts, no login, no comments, no sync (re-ratified).

## Bookkeeping notes

- Plan 06-03's commit `0bfa8a1` swept in the two `MoleculeGallery` files (06-04's source) because the parallel Wave-2 sibling executor had created them on disk but not yet staged when 06-03 ran `git commit` with explicit paths. Net effect: every 06-03 *and* 06-04 source file is in `main`; only the commit-attribution for the two MoleculeGallery files is off-by-one. Logged at the time as a parallel-wave race condition; no functional defect. The 06-04 SUMMARY commit (`2232b0e`) contains only `.planning/phases/06-vqe/06-04-SUMMARY.md`.
- Plan 06-06 landed 19 new tests vs the plan's "8 unit + 3 integration + 3 structural" sketch. The natural describe-block expansion (e.g. splitting `getVisited` storage-failure tolerance into its own `it()`) made the suite easier to read; semantics are identical to the plan brief.
- Plan 06-08's bundle-budget recompute is intentionally a small diff (2 lines) because every other route already snaps to the same 1024-byte boundary the recompute would produce. This is the expected steady state for the round-up convention.

## Deferred to milestone summary

- **Formal Lighthouse mobile a11y ≥ 95 pass** per OPS-01 + LIGHTHOUSE-PLAN.md — structural a11y (aria-live politeness, keyboard reach across every control, focus-visible outlines, descriptive external link text, mobile horizontal-scroll affordances, marker drag with keyboard equivalent, reduced-motion handling) is in place across every v3 widget; formal device-emulated Lighthouse rolls up at launch day per the recipe in `LIGHTHOUSE-PLAN.md`.
- **Live screen-reader pass** (VoiceOver / NVDA) over `EnergyLandscape`, `MoleculeGallery`, `LargeCircuitView`, `RSACountdown`, and the PROG-01 visited-state announcement — flagged as user gates in 5b and again here.
- **Real-device mobile check** of `LargeCircuitView` horizontal-scroll behaviour (carried from 5b).
- **v1, v2, v3 deploys** — all three deploys are parallel ops tasks tracked under `.planning/STATE.md` "Parallel ops tasks". Phase 6 ships code-complete v3.0; deploy is independent of phase work.
