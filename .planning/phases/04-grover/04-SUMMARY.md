# Phase 4 — Grover + Search Reality — SUMMARY

*Completed: 2026-06-30 — implementation + close-out artifacts written during autonomous-run continuation.*

## Goal

Ship `/grover`, the v3 search essay. The algorithm half implements real
simulator-backed Grover amplitude amplification at the 4-qubit cap;
`AmplitudeBars` shows signed amplitudes concentrating on the marked
state through oracle phase flip + diffusion. The use-case half grounds
the promise with `SearchComparison`: Grover is a quadratic `√N` speedup
for unstructured search — not magic database search, not RSA-breaking.
The essay closes by handing cryptography to Phase 5 (Shor/QFT/PQC).

## What shipped

| Plan | Commit | Artifact |
|------|--------|----------|
| 04-01 | `5c01bc7` *(bundled with 03-03)* | `src/lib/quantum/grover.ts` (283 LOC) — `optimalGroverIterations`, `prepareUniform`, `applyPhaseOracle`, `applyDiffusion`, `runGrover`, `buildGroverCircuit` + barrel re-export in `src/lib/quantum/index.ts` |
| 04-01 | `5c01bc7` *(bundled with 03-03)* | `tests/quantum/grover.test.ts` (229 LOC, 23 tests) — optimal-`k` math, uniform prep, oracle sign flip, diffusion formula, amplitude concentration for `N=4,8,16`, Qiskit-friendly circuit builder |
| 04-02 | `247c530` | `src/components/AmplitudeBars.astro` (361 LOC) — signed-amplitude vertical bars, zero axis, marked-state dropdown, Prev/Next/Reset, numeric iteration override, `k/k_opt` indicator, `aria-live` readout, `prefers-reduced-motion` honored + `tests/components/amplitude-bars.test.ts` (10 tests) |
| 04-03 | `96cd464` | `src/components/SearchComparison.astro` (186 LOC) — discrete log₂ slider over `[16, 32, 64, 128, 256, 512, 1024]`, classical avg `N/2` lane vs Grover `⌊π/4·√N⌋` lane, formula-only-beyond-`N=16` callout + `tests/components/search-comparison.test.ts` (9 tests) |
| 04-04 | `9df0217` | `src/pages/grover.astro` (366 LOC) — full essay with `EssayLayout`, pain-point opener, algorithm half (`AmplitudeBars` + `CircuitView` + `SandboxLink`), use-case half (`SearchComparison`), RSA handoff sentence, self-test, `MathNerds` appendix; nav-graph + concept-map + sandbox-links + sitemap mirrors updated in same commit; `bundle-budget.json` placeholder added |
| 04-05 | `253bf37` | `bundle-budget.json` `/grover` ceiling recomputed from clean build → 3.0 KB (actual 1.9 KB gzipped × 1.2 headroom, rounded up to nearest KB) |

## Requirements closed

- **ALG-04** — Grover oracle + diffusion are real state-vector operations, not visual fakes:
  - Oracle flips the marked amplitude's sign and leaves others alone (test suite asserts this for `markedIndex ∈ {0, 5, 11}` at 4 qubits).
  - Diffusion implements `aᵢ ↦ 2·mean(a) − aᵢ` over amplitudes (formula assertion at `1e-12` tolerance).
  - Normalization stays `1 ± 1e-10` after every step.
  - After `⌊(π/4)·√N⌋` iterations, marked-state probability is dominant for `N = 4, 8, 16` and `> 0.9` for `N = 16`.
- **USE-03** — `SearchComparison` widget honestly contrasts classical linear scan (`N/2` avg probes) with Grover (`⌊π/4·√N⌋` iterations) across the 7 locked stops. Widget + prose explicitly tag `N > 16` as formula-only, simulator-cap-respecting.
- **OPS-04** — `/grover` route is in `bundle-budget.json` with a measured ceiling (1.9 KB actual / 3.0 KB ceiling). All 22 tracked routes within budget.

## Numbers

- **Tests:** 414/414 passing (+42 from Phase 3 baseline of 372: 23 grover + 10 amplitude-bars + 9 search-comparison)
- **Pages:** 22 building clean (added `/grover` in this phase; `/superdense-coding` added in Phase 3)
- **Bundle:** `/grover` 1.9 KB / 3.0 KB ceiling — comfortable headroom; site-wide table all green
- **Hard cap respected:** `Simulator.MAX_QUBITS = 4` untouched; no new `Op` kind added; arbitrary larger-`N` demonstrations remain formula-only
- **Footer-nav chain (final, after Phase 3 landed):** `teleportation → superdense-coding → grover → sandbox`

## Decisions ratified (from PHASE-CONTEXT.md)

1. **D-01 — AmplitudeBars is vertical, signed.** Bars extend above/below a zero axis so the oracle phase flip is visually unmistakable. Sign is not encoded by color alone (a11y).
2. **D-02 — Default iteration count = optimal `⌊(π/4)·√N⌋`.** Numeric override is secondary, exposes overshoot ("amplitudes climb then collapse") without cluttering the first experience.
3. **D-03 — Marked-state picker is a dropdown.** Click-to-mark bars stayed in stretch scope; dropdown is keyboard-friendly, accessible, and unambiguous (bar = data, not control).
4. **D-04 — `SearchComparison` uses discrete log₂ stops.** `[16, 32, 64, 128, 256, 512, 1024]` — keeps animation deterministic, aligns with `N = 2ⁿ` mental model, avoids implying 1024-state simulation.
5. **D-05 — No `ProtocolStepper` reuse.** Grover needs iteration semantics (`k / k_opt`, overshoot, reset to uniform), not protocol replay.
6. **D-06 — Direct state-vector helpers, no new oracle `Op`.** Keeps `Circuit`, `codec`, and `qiskit` clean; the Qiskit-export `CircuitView` shows a pedagogical compact circuit, while the simulator-backed widget uses the helpers.
7. **D-07 — Marked-index convention is simulator/Qiskit LSB.** `markedIndex = 11` at 4 qubits is `|1011⟩`.
8. **D-08 — RSA handoff is one locked sentence.** `No — Grover does not break RSA. That is Shor; see the next essay.` Plus a compact "changes / does-not-change" table.
9. **D-09 — Footer-nav adapts to live Phase 3 state.** Phase 3 landed before Phase 4 close-out, so chain is `teleportation → superdense-coding → grover → sandbox` (mirror updates landed atomically with the relevant route commits).

## Physics correctness verified end-to-end

For `qubits = 4`, `markedIndex = 11` (i.e. `|1011⟩`), `k_opt = ⌊(π/4)·√16⌋ = 3`:

```
Iter 0 (uniform):     P(|1011⟩) = 0.0625
Iter 1 (oracle+diff): a(|1011⟩) negative → diffusion lifts it
Iter 2:               marked-state probability climbing
Iter 3 (k_opt):       marked-state probability dominant (> 0.9)
```

Test assertion `tests/quantum/grover.test.ts > amplitude concentration`
locks the `> 0.9` lower bound at iteration `k_opt` for `N = 16` and
asserts `argmax(probabilities) === markedIndex` for `N ∈ {4, 8, 16}`.

## What this phase unlocks

- **Pattern for "honest-disappointment" essays.** Grover's
  use-case half sets the template for Phase 5b's RSA/PQC threat
  section — quadratic speedup framed cleanly so Shor's exponential
  speedup lands with the right weight.
- **`AmplitudeBars` is a reusable signed-amplitude primitive.** Future
  essays that want to show negative amplitudes (QFT phase, VQE
  ansatz parameter sweeps) can compose it with precomputed snapshot
  JSON.
- **Bundle baseline holds.** `/grover` at 1.9 KB sits between
  `/superdense-coding` (1.2 KB) and `/sandbox/challenges/*` (2.3 KB);
  v3 essays continue to fit under 3 KB even with two interactive
  widgets and a `CircuitView`.

## Out-of-scope items (re-confirmed not done)

- No simulator cap bump (REQ-13 hard-locked at 4 qubits).
- No new arbitrary oracle / multi-controlled `Op` kind in the gate vocabulary.
- No clickable-bar-to-mark interaction (stretch; dropdown shipped).
- No analytics / remote telemetry.

## Bookkeeping note

Plan 04-01's grover module + tests landed inside commit `5c01bc7`
(titled `feat(03-superdense/03-03)`) instead of its own `04-grover/04-01`
commit. The autonomous run interleaved Phase 3 and Phase 4 work; the
deliverables are present in the working tree exactly as planned. The
04-VERIFICATION.md acknowledges this commit-bundling and records the
authoritative SHA for traceability.

## Deferred to milestone summary

- Formal Lighthouse mobile a11y ≥ 95 pass per OPS-01 — structural a11y
  (aria-live, keyboard focus, reduced-motion guard, label-not-color
  for sign) is in place; formal run rolls up with the rest of v3 at
  Phase 6 launch.
