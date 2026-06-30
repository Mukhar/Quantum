---
status: passed
phase: 04-grover
verifier: autonomous-orchestrator (continuation)
verified_at: 2026-06-30T17:35:00Z
basis:
  - Automated: npm test green (414 tests, including 23 grover quantum + 10 amplitude-bars + 9 search-comparison + all essay mirror tests)
  - Automated: npm run build green (22 pages, /grover/index.html present)
  - Automated: npm run check:bundle green (/grover 1.9 KB / 3.0 KB ceiling; all 22 routes within budget)
  - Manual smoke (commit 9df0217 body): AmplitudeBars 16 signed bars + dropdown + Prev/Next/Reset + override; SearchComparison 7 stops with correct N/2 and ⌊π/4·√N⌋; CircuitView Qiskit copy via Phase 1 inheritance; SandboxLink starter wired
---

# Phase 4 — Grover + Search Reality — Verification

## Goal recap

> Ship `/grover`, the v3 search essay. Algorithm half: simulator-backed
> Grover amplitude amplification at the 4-qubit cap with signed
> `AmplitudeBars` showing oracle phase flip + diffusion amplification.
> Use-case half: `SearchComparison` grounds the `√N` speedup with an
> honest comparison to classical linear scan, with explicit "no, this
> does not break RSA — that is Shor" handoff to Phase 5.

## Success criteria scorecard (vs PLAN.md Definition of Done)

| # | Criterion | Status | Evidence |
|---|---|--------|----------|
| 1 | `src/lib/quantum/grover.ts` exports full Grover helper surface (`optimalGroverIterations`, `prepareUniform`, `applyPhaseOracle`, `applyDiffusion`, `runGrover`, `buildGroverCircuit`) | ✅ PASS | Module 283 LOC; barrel re-export in `src/lib/quantum/index.ts`; all symbols used by `grover.astro` frontmatter |
| 2 | ALG-04 — oracle + diffusion are real state-vector operations (sign flip, mean inversion, normalization, `k_opt` concentration) | ✅ PASS | `tests/quantum/grover.test.ts` — 23 tests cover optimal-`k` math, uniform prep (`1/N ± 1e-12`), oracle sign flip (markedIndex ∈ {0,5,11}), diffusion formula (`2·mean − aᵢ` at `1e-12`), and dominant-probability at `k_opt` for `N=4,8,16` (`> 0.9` for `N=16`) |
| 3 | Simulator cap unchanged (`MAX_QUBITS = 4`); no new `Op` kind | ✅ PASS | `git log` shows no edit to `src/lib/quantum/simulator.ts` or `circuit.ts` op vocabulary in Phase 4 commits; Qiskit golden tests still green (36 tests) |
| 4 | `AmplitudeBars.astro` renders signed bars for up to 16 basis states, negative below zero axis, marked highlighted, `aria-live` summary, motion guarded | ✅ PASS | Component 361 LOC; `tests/components/amplitude-bars.test.ts` (10 tests) asserts `data-widget="amplitude-bars"`, signed amplitudes, zero axis, marked highlight, `aria-live="polite"`, `prefers-reduced-motion` |
| 5 | AmplitudeBars owns Grover iterator controls (dropdown, Prev/Next/Reset, `k/k_opt`, numeric override) — no `ProtocolStepper` reuse | ✅ PASS | Component source contains `<select>` for marked state, Prev/Next/Reset buttons, numeric override input, `k/k_opt` indicator; no `ProtocolStepper` import |
| 6 | `SearchComparison.astro` uses exact stops `[16, 32, 64, 128, 256, 512, 1024]`; classical `N/2`, Grover `⌊π/4·√N⌋`; `N > 16` flagged formula-only | ✅ PASS | `tests/components/search-comparison.test.ts` asserts stops array equals locked sequence, `groverIterations(16)=3` and `groverIterations(1024)=25`, `classicalAverage(1024)=512`, and source contains the formula-only cap note |
| 7 | `src/pages/grover.astro` uses established essay shape (opener → algorithm → bridge → use-case → self-test → math → footer-nav) | ✅ PASS | 366-LOC page renders end-to-end; build produces `dist/grover/index.html` |
| 8 | Essay includes at least one `CircuitView` with Phase-1 "Copy as Qiskit" affordance | ✅ PASS | `<CircuitView circuit={demoCircuit} ... />` mount; Qiskit-copy inherited from Phase 1's `CircuitView` |
| 9 | `SandboxLink` starter for Grover circuit + mirror in `tests/essays/sandbox-links.test.ts` | ✅ PASS | `tests/essays/sandbox-links.test.ts` (27 tests) green with `grover` entry; route + mirror in same commit `9df0217` |
| 10 | RSA misconception closed explicitly in prose | ✅ PASS | Page contains the locked sentence: *"No — Grover does not break RSA. That is Shor; see the next essay."* + changes/does-not-change table |
| 11 | All site-wide mirrors updated in same commit (ConceptMap, concept-map test, nav-graph test, sandbox-links test, bundle-budget, sitemap, homepage) | ✅ PASS | Commit `9df0217` body lists every mirror; `tests/essays/concept-map.test.ts`, `tests/essays/nav-graph.test.ts`, `tests/essays/sandbox-links.test.ts` all green |
| 12 | Footer-nav ordering respects live Phase 3 state | ✅ PASS | Phase 3 (`/superdense-coding`) landed before final close-out; chain is `teleportation → superdense-coding → grover → sandbox` (latest update in commit `8c088fb` for Phase 3 close-out; `/grover` prev=`/superdense-coding`, next=`/sandbox`) |
| 13 | `bundle-budget.json` includes `/grover` with conservative ceiling | ✅ PASS | Final ceiling `3.0 KB` (actual `1.9 KB` × 1.2 headroom rounded up to nearest KB) — settled in commit `253bf37` |
| 14 | `npm test` green (all suites) | ✅ PASS | 414/414 tests pass — quantum (167), components (79), essays (55), gallery (50), feedback (30), theme (21), misc (12) |
| 15 | `npm run build` green (`dist/grover/index.html` present) | ✅ PASS | Build emits 22 pages in 1.78s; `/grover/index.html` produced |
| 16 | Lighthouse mobile a11y ≥ 95 in both themes | ⚠ DEFERRED | Structural a11y (`aria-live`, keyboard focus on dropdown + buttons, reduced-motion guard, sign-not-by-color-alone) is in place; formal Lighthouse run rolled up to milestone-summary OPS-01 per autonomous-decisions Q1 |
| 17 | No runtime dependencies added (no React/Preact/framework) | ✅ PASS | `package.json` unchanged in Phase 4 commits; widgets are vanilla Astro + inline `<script>` |

## Plans landed (atomic commits)

| Plan | Commit | Title | Notes |
|------|--------|-------|-------|
| 04-01 | `5c01bc7` | grover module + correctness tests | Bundled with `03-superdense/03-03` commit during autonomous run; deliverable content matches plan 04-01 exactly (283 LOC module + 229 LOC test file + barrel export) |
| 04-02 | `247c530` | `AmplitudeBars` signed Grover iterator widget | — |
| 04-03 | `96cd464` | `SearchComparison` formula widget | — |
| 04-04 | `9df0217` | `/grover` essay + every site-wide mirror | Footer-nav for Phase-3-landed chain applied later when `/superdense-coding` shipped |
| 04-05 | `253bf37` | Bundle-ceiling close-out | `/grover` final ceiling 3.0 KB based on 1.9 KB measured |

## Numbers (post-phase)

- Tests: **414/414** passing (+42 from Phase 3 baseline: 23 grover + 10 amplitude-bars + 9 search-comparison)
- Pages: **22** building clean (added `/grover` + `/superdense-coding` since Phase 2)
- Bundle: `/grover` 1.9 / 3.0 KB; site-wide budget table all green
- Hard cap: simulator stays at 4 qubits — formula-only beyond `N = 16` clearly labeled in `SearchComparison`
- LOC shipped in Phase 4: ~1,572 (module + 3 components + 1 page + 3 test files)

## Notable correctness observation

The amplitude concentration test asserts a robust `> 0.9` lower bound at
`k_opt` rather than an exact value. This is intentional — the optimal
`k_opt = ⌊(π/4)·√N⌋` is a floor approximation of the continuous
rotation angle, so the marked probability at integer `k_opt` is not
exactly 1.0 even for ideal Grover; for `N = 16`, `k_opt = 3` gives
`P(marked) ≈ 0.9613`. The widget's numeric override exposes overshoot
behavior (`k = 4` reduces the marked probability), which is the
pedagogical payoff of D-02.

## Gaps

None blocking. Lighthouse formal a11y run deferred to milestone summary
per autonomous-decisions Q1 (UAT structural a11y is in place; formal
device-emulated Lighthouse rolls up with the rest of v3 at Phase 6
launch).
