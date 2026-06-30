---
status: passed
phase: 03-superdense
verifier: autonomous-orchestrator (continuation)
verified_at: 2026-06-30T17:35:00Z
basis:
  - Automated: npm test green (414 tests, including 25 superdense quantum + 6 encoding-table + 7 holevo-bound + all essay mirror tests)
  - Automated: npm run build green (22 pages, /superdense-coding/index.html present)
  - Automated: npm run check:bundle green (/superdense-coding 1.2 KB / 2.0 KB ceiling; all 22 routes within budget)
  - Plan 03-05 bundle recompute: actual 1.2 KB × 1.2 = 1.44 KB → round_up to 2048 B → matches initial ceiling exactly, no recompute commit needed
---

# Phase 3 — Superdense Coding + Holevo Bound — Verification

## Goal recap

> Ship `/superdense-coding`, the second v3 communication essay.
> Algorithm half teaches superdense as the mirror of teleportation
> (Alice encodes 2 classical bits with `I/X/Z/XZ`, Bob decodes via
> Bell-basis measurement). Use-case half uses `HolevoBound` to show
> the hard `2×` ceiling. Completes the communication arc.

## Success criteria scorecard (vs PLAN.md Definition of Done)

| # | Criterion | Status | Evidence |
|---|---|--------|----------|
| 1 | `src/pages/superdense-coding.astro` renders end-to-end (opener → algorithm → bridge → use-case → self-test → math → footer-nav) | ✅ PASS | 387-LOC page builds; `dist/superdense-coding/index.html` present |
| 2 | `src/lib/quantum/superdense.ts` is the single source of truth (canonical circuit, encoding map, ProtocolStep, decode helpers) | ✅ PASS | 266-LOC module; barrel re-export in `src/lib/quantum/index.ts`; used by both the page and 25 tests |
| 3 | ALG-03 — `EncodingTable` widget: selecting `00/01/10/11` updates protocol, highlights operation on Alice, surfaces Bob's decoded readout | ✅ PASS | `src/components/EncodingTable.astro` 213 LOC; 6 tests in `tests/components/encoding-table.test.ts` cover the 4-message selector, decoded readout content, and `aria-live` wiring |
| 4 | Algorithm half reuses Phase-2 widgets (`ProtocolStepper`, `MultiBlochPanel`); no new parallel abstractions | ✅ PASS | Page frontmatter imports `MultiBlochPanel`, `ProtocolStepper`, `CircuitView`; no new stepper or panel components introduced |
| 5 | Canonical route circuit is in `CircuitView` and inherits Phase-1 "Copy as Qiskit" | ✅ PASS | `<CircuitView circuit={superdenseCircuit("11")} ... />`; Qiskit export inherited; `tests/quantum/qiskit.test.ts` (36 tests) still green |
| 6 | Essay includes a `SandboxLink` starter for the superdense circuit; mirror in `tests/essays/sandbox-links.test.ts` lands same commit | ✅ PASS | Commit `8c088fb` updates `tests/essays/sandbox-links.test.ts` with `superdense → superdenseCircuit("11")`; 27 sandbox-link tests green |
| 7 | USE-02 — `HolevoBound` widget with single slider over `n_qubits = 1..4`, y-cap 8, copy closes the "2× ceiling, full stop" misconception | ✅ PASS | `src/components/HolevoBound.astro` 306 LOC; 7 tests assert slider range 1..4, both readouts, two polylines, active markers, and "no >2× gain" copy discipline |
| 8 | All site-wide mirrors updated in the same commit as the route (ConceptMap, concept-map test, nav-graph test, sandbox-links test, bundle-budget) | ✅ PASS | Commit `8c088fb`: `src/components/ConceptMap.astro`, `tests/essays/concept-map.test.ts`, `tests/essays/nav-graph.test.ts`, `tests/essays/sandbox-links.test.ts`, `bundle-budget.json`, `src/pages/sitemap.xml.ts` all touched together |
| 9 | Footer-nav becomes `… → /teleportation → /superdense-coding → /sandbox` (or `… → /superdense-coding → /grover → /sandbox` once Phase 4 lands) | ✅ PASS | After Phase 4 close-out, live chain is `teleportation → superdense-coding → grover → sandbox`; commit `8c088fb` rewires `teleportation.astro` next to `/superdense-coding` and `grover.astro` prev to `/superdense-coding`; `tests/essays/nav-graph.test.ts` 24 tests green |
| 10 | `bundle-budget.json` includes `/superdense-coding` initial ceiling, then close-out recompute | ✅ PASS | Initial = 2048 B (commit `8c088fb`); recompute formula `round_up(1.2 KB × 1.2, 1024)` = 2048 → matches initial; no separate recompute commit required |
| 11 | `npm test` green (all suites) | ✅ PASS | 414/414 tests pass — including all Phase 3 quantum + component + essay mirror tests |
| 12 | `npm run build` green; outputs `dist/superdense-coding/index.html` | ✅ PASS | Build emits 22 pages in 1.78s; route present |
| 13 | Lighthouse mobile a11y ≥ 95 in both themes (manual audit recorded in close-out commit) | ⚠ DEFERRED | Structural a11y in place (`aria-live` on both widgets, keyboard nav on table + slider, focus rings, sign-not-by-color in `HolevoBound`); formal Lighthouse rolled up to milestone-summary OPS-01 per autonomous-decisions Q1 |
| 14 | No runtime dependencies added | ✅ PASS | `package.json` unchanged in Phase 3 commits; widgets are vanilla Astro + inline `<script>` |

## Plans landed (atomic commits)

| Plan | Commit | Title |
|------|--------|-------|
| 03-01 | `071fea0` | `quantum/superdense` module + correctness tests |
| 03-02 | `2dc9083` | `EncodingTable` widget + decode readout |
| 03-03 | `5c01bc7` | `HolevoBound` widget *(also contains Plan 04-01 grover module — see Phase 4 SUMMARY)* |
| 03-04 | `8c088fb` | `/superdense-coding` essay + every site-wide mirror |
| 03-05 | *(no commit needed)* | Bundle recompute coincides with initial ceiling — `round_up(1.2 KB × 1.2, 1024) = 2.0 KB` exactly matches the 2048 B initial set in `8c088fb` |

## Numbers (post-phase)

- Tests: **414/414** passing (+38 from Phase 2 baseline: 25 superdense + 6 encoding-table + 7 holevo-bound)
- Pages: **22** building clean
- Bundle: `/superdense-coding` 1.2 / 2.0 KB; site-wide budget table all green
- Hard cap: simulator stays at 4 qubits (superdense uses 2)
- LOC shipped in Phase 3: ~1,287 (module + 2 components + 1 page + 3 test files)

## Notable correctness observation

All 4 message bits round-trip correctly through encode → Bell-basis
measurement → decode at `1e-12` numerical tolerance:

```
"00" → I  → |Φ⁺⟩ → "00"
"01" → X  → |Ψ⁺⟩ → "01"
"10" → Z  → |Φ⁻⟩ → "10"
"11" → XZ → |Ψ⁻⟩ → "11"
```

The mapping is unambiguous because the four Bell states form an
orthonormal basis — superdense exploits this 2-bit information capacity
of an entangled qubit pair, capped by Holevo's inequality at exactly `2n`.

## Gaps

None blocking. Lighthouse formal a11y run deferred to milestone summary
per autonomous-decisions Q1.
