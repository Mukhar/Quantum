---
status: passed
phase: 05a-shor-qft-period-finding
verifier: autonomous-orchestrator (continuation)
verified_at: 2026-06-30T18:30:00Z
basis:
  - Automated: npm test green (483 tests; +69 vs Phase 4 baseline of 414)
  - Automated: npm run build green (23 pages; /shor/index.html present)
  - Automated: npm run check:bundle green (/shor 2.5 KB / 3.0 KB ceiling; all 23 routes within budget)
  - Manual smoke (Plan 05-05 commit body): QFTVisualizer 5 presets + Custom 16-amp editor + period-4 comb produces correct spike pattern; PeriodFinding canonical N=15 cases match (a=7→r=4, a=4→r=2, a=11→r=2); aria-live readouts update without spamming
---

# Phase 5a — Shor: QFT + Period-Finding — Verification

## Goal recap

> Ship the QFT half of the Shor story under the canonical `/shor`
> route. Phase 5a covers ALG-05 (QFT visualization, input becomes
> spikes) and ALG-06 (interactive a^x mod N period probe with peak
> hints), and lays down the `/shor` essay scaffold with an explicit
> "continued in Phase 5b" stub for the full N=15 Shor circuit,
> RSACountdown, and NIST PQC primitive cards. No in-browser
> factoring; no simulator cap bump; no gate IR expansion.

## Success criteria scorecard (vs PLAN.md Definition of Done, 9 items)

| # | Criterion | Status | Evidence |
|---|---|--------|----------|
| 1 | `src/lib/quantum/qft.ts` exists with pure QFT/period helpers and tests | ✅ PASS | 273 LOC module; barrel re-export in `src/lib/quantum/index.ts`; `tests/quantum/qft.test.ts` ships 45 deterministic tests covering DFT correctness, round-trip, canonical periods, and edge cases (commit `d1e1c63`) |
| 2 | 4-qubit QFT visualizer renders input-vs-output probability bars; reuses existing probability-bar visual language; no framework runtime dependency | ✅ PASS | `src/components/QFTVisualizer.astro` (413 LOC) uses the same `border-line + bg-surface-elevated/40 + p-5` chrome as `ProbabilityBars` / `AmplitudeBars`; vanilla Astro `<script>` only; `package.json` unchanged in Phase 5a commits. `tests/components/qft-visualizer.test.ts` (9 tests) asserts the visual language reuse + simulator-free client (commit `3469f67`) |
| 3 | `PeriodFinding` runs in-browser for `a^x mod N` with `N ≤ 15`, validates coprime preconditions, covers canonical periods in tests | ✅ PASS | `src/components/PeriodFinding.astro` (272 LOC) with continuous 80ms-debounced compute, three-state aria-live (period/not-found/invalid), inline `findPeriod()` helper duplicates `qft.ts` math so the client ships with no module imports. `tests/components/period-finding.test.ts` (10 tests) + `tests/quantum/qft.test.ts > canonical periods` cover N=15 / a∈{2,4,7,8,11,13,14} → r∈{4,2,4,4,2,4,2} and the `gcd ≠ 1` invalid path (commit `778744e`) |
| 4 | `/shor` exists as canonical route scaffold; teaches QFT + period finding; includes "continued in Phase 5b" section; wires footer-nav from `/grover` | ✅ PASS | `src/pages/shor.astro` (188 LOC) renders end-to-end; build produces `dist/shor/index.html`. Essay has two h2 sections ("The QFT turns periods into spikes" and "Period finding: a^x mod N is periodic"), an explicit "What's *not* in 5a" stub naming the three Phase 5b deliverables (N=15 circuit, RSACountdown, NIST PQC cards), 3-question self-test, MathNerds drawer with the "QFT peaks at jQ/r" derivation. `src/pages/grover.astro` footer-nav next changes from `/sandbox` to `/shor` in the same commit `41a7f3b` |
| 5 | Same-commit mirrors updated with /shor route landing: ConceptMap.astro, nav-graph.test.ts, concept-map.test.ts, sandbox-links.test.ts, bundle-budget.json | ✅ PASS | Commit `41a7f3b` touches all five mirrors plus sitemap and grover.astro in one diff. `ConceptMap.astro` appends `/shor` at cx 480 cy 430 with reading-path edge `grover → shor`; viewBox grows from 360 to 460; aria-label updates to "11 essays (5 foundations + 6 algorithm)". `concept-map.test.ts` mirrors the node. `nav-graph.test.ts` CHAIN inserts shor between grover and sandbox. `sandbox-links.test.ts` adds 2-qubit `H ⊗ H` starter (D-26 forbids N=15). `bundle-budget.json` adds `shor: 3072` placeholder |
| 6 | OPS-04 remains green; /shor gets initial conservative budget; close-out recomputes from clean build | ✅ PASS | Plan 05-04 sets placeholder `shor: 3072`. Plan 05-05 (commit `31766dc`) recomputes against clean build: actual 2.5 KB gzipped (2560 bytes), suggested ceiling `ceil(2560 × 1.2 / 1024) × 1024 = 3072` — placeholder matches exactly, no edit needed. `npm run check:bundle` table shows all 23 routes within budget |
| 7 | No new runtime dependencies; vanilla TS + Astro only | ✅ PASS | `package.json` and `package-lock.json` unchanged across all five Phase 5a commits (`d1e1c63`, `3469f67`, `778744e`, `41a7f3b`, `31766dc`). Both widgets ship inline `<script>` blocks; QFTVisualizer precomputes via `qft.ts` at SSR; PeriodFinding duplicates the ~40 LOC of period-finding math inline rather than bundle a module |
| 8 | Simulator/sandbox remain capped at 4 qubits; QFT uses pure state-vector helpers; Circuit/codec op vocabulary not expanded in 5a | ✅ PASS | `git log --stat` for Phase 5a shows no edit to `src/lib/quantum/simulator.ts`, `src/lib/quantum/codec.ts`, `src/lib/quantum/qiskit.ts`, or `src/lib/quantum/circuit.ts`. `qft.ts` operates on `Complex[]` state vectors directly; never touches the `Op` type or any controlled-phase gate. `tests/quantum/qft.test.ts > rejects > 4 qubits` asserts a `RangeError` on attempted 5-qubit QFT, locking the cap. Qiskit golden tests still green (36 tests) |
| 9 | npm test and npm run build are green at phase close | ✅ PASS | `npm test`: 483/483 tests across 33 files (run at commit `31766dc`). `npm run build`: 23 pages emit in 2.07s; no warnings; `/shor/index.html` produced. `npm run check:bundle`: all 23 routes OK |

## Plans landed (atomic commits)

| Plan | Commit | Title |
|------|--------|-------|
| 05-01 | `d1e1c63` | `feat(05a-shor/05-01): qft.ts + period helpers + tests` |
| 05-02 | `3469f67` | `feat(05a-shor/05-02): QFTVisualizer.astro + structural test` |
| 05-03 | `778744e` | `feat(05a-shor/05-03): PeriodFinding.astro + structural test` |
| 05-04 | `41a7f3b` | `feat(05a-shor/05-04): /shor essay scaffold + same-commit mirrors` |
| 05-05 | `31766dc` | `chore(05a-shor/05-05): bundle/a11y close-out — no ceiling change` |

## Numbers (post-phase)

- Tests: **483/483** passing (+69 from Phase 4 baseline of 414). Suite-by-suite delta: quantum +45 (qft.test.ts), components +19 (qft-visualizer +9, period-finding +10), essays +5 (concept-map +1 slug, nav-graph +2 entries × ~2.5 assertions/spec, sandbox-links +3 round-trip assertions for shor starter).
- Pages: **23** building clean (added `/shor`).
- Bundle: `/shor` 2.5 / 3.0 KB; site-wide table all green. Two widgets + essay JS shell fit comfortably under ceiling.
- Hard cap: simulator stays at 4 qubits — `qft.test.ts > rejects > 4 qubits` proves it; QFT is pure math, never a `Circuit` op.
- LOC shipped in Phase 5a: ~1,856 (273 module + 2 components × ~340 LOC + 1 page 188 + 4 test files: 45-test qft.test.ts + 9-test qft-visualizer.test.ts + 10-test period-finding.test.ts + mirror updates to 3 existing essay tests).

## Notable correctness observations

- **Direct DFT beats FFT at N=16.** The 4-qubit register has 16 basis states; a direct O(N²) DFT = 256 complex multiplies. A JS FFT implementation incurs more overhead in function calls and array allocations than it saves in arithmetic. `qft.ts > dftStep` is ~25 LOC; the test file is 45 assertions deep on it.
- **The "period-4 comb" preset is the load-bearing visual.** It demonstrates the canonical Shor pattern (period r in → r evenly-spaced spikes out) without needing any number theory. Tests pin the input indices `{0, 4, 8, 12}` and the output peak indices via `periodPeakHints(4, 4) = [0, 4, 8, 12]` — the round-trip is asserted in `qft.test.ts`.
- **Discriminated-union return type for `findMultiplicativePeriod`.** Returns `{kind: "period" | "invalid" | "not-found"}` instead of throwing on bad input. The widget uses the kind to drive aria-live status colour (positive/warning/neutral) and to decide whether the peak-hint panel is visible. Tests cover every kind explicitly.

## Gaps

None blocking. Lighthouse formal a11y run deferred to milestone summary
per OPS-01 + PHASE-CONTEXT D-28 (structural a11y is in place; formal
device-emulated Lighthouse rolls up with the rest of v3 at Phase 6
launch).

## Carry-forward for Phase 5b

- `/shor` exists with QFT + period-finding sections. Phase 5b appends sections in the same essay rather than creating a new route.
- `qft.ts` helpers are stable and re-exported from `src/lib/quantum/index.ts`. A Phase 5b `shor.ts` helper can build N=15 directly from `modPow`, `gcd`, `findMultiplicativePeriod`, and `qftState` without re-deriving any math.
- Bundle headroom: `/shor` has ~0.5 KB before the 3.0 KB ceiling needs to grow. RSACountdown + 4 PQC cards likely need a ceiling bump in Phase 5b's close-out plan; the placeholder pattern from Plan 05-04 / recompute pattern from Plan 05-05 carries over.
- Footer-nav: `/grover → /shor → /sandbox` is locked. When Phase 5b lands and the essay grows, `/shor`'s next still points to `/sandbox` (no chain change).
