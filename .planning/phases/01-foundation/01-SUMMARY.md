# Phase 1 — Foundation (Qiskit export + bundle CI) — SUMMARY

*Completed: 2026-06-29 — content commits • verified retroactively 2026-06-30 during autonomous run.*

## Goal

Land the two cross-cutting v3 infrastructure pieces every later phase
depends on: a Qiskit text exporter usable from both the sandbox toolbar
AND every essay's `CircuitView`, plus a per-route bundle-size CI gate
that fails the build on bundle regressions.

## What shipped

| Plan | Commit | Artifact |
|------|--------|----------|
| 01-01 | `bad34af` | `src/lib/quantum/qiskit.ts` (`toQiskit`, `QiskitExportError`) + `tests/quantum/qiskit.test.ts` (36 tests, drift-proof) |
| 01-02 | `66f5631` | Sandbox "Copy as Qiskit" toolbar button (`src/pages/sandbox/index.astro`, `src/lib/sandbox/persistence.ts::copyQiskitSnippet`, `composer.client.ts` wiring) |
| 01-03 | `6f18278` | `CircuitView.astro` Copy-as-Qiskit button (SSR-time `data-qiskit` attr + inline click handler) + tests/components/circuit-view.test.ts assertions |
| 01-04 | `98be3cd` | `scripts/check-bundle-budget.mjs` + `bundle-budget.json` + `package.json` pretest hook |

## Requirements closed

- **QSK-01** — Sandbox toolbar Copy-as-Qiskit button (manual UAT test 1 PASS; clipboard verified with Bell pair).
- **QSK-02** — `CircuitView` Copy-as-Qiskit button on every essay-embedded circuit (wired into `/cnot-bell`, `/deutsch`; `tests/components/circuit-view.test.ts` 11 tests pass).
- **QSK-03** — Drift gate covering `DiscreteGate ∪ RotAxis ∪ Op.kind` — test fails if any new simulator gate lands without a Qiskit mapping. 36/36 tests pass.
- **OPS-04** — Per-route bundle ceiling gate. 20/20 routes within budget on baseline; failure mode prints per-route over/under table and exits 1.

## Numbers

- **Tests:** 324/324 passing (+47 from v2 baseline: 36 qiskit + 11 circuit-view)
- **Pages:** 20 building clean
- **Bundle:** All 20 routes within ceilings; biggest headroom routes flagged for tightening in Phase 6 audit
- **New dependencies:** 0 runtime / 0 devtime (uses Node built-in `zlib`)

## Decisions ratified

1. **Qiskit angles use `toPrecision(17)`** — never collapse to `numpy.pi/…` aliases (preserves exact round-trip; PHASE-CONTEXT.md decision).
2. **Drift gate is the only correctness contract** — adding a simulator gate without a Qiskit mapping makes CI fail. No silent export drift possible.
3. **Inline `<script is:inline>` for the CircuitView button** — avoids a hydrated framework dependency; total client cost < 1 KB gzipped, asserted by 01-04's gate.
4. **`pretest` hook wires `build → check:bundle → vitest`** — `npm test` and CI now run the bundle gate every run.

## Deferred to milestone summary (per autonomous-decisions Q1)

- Manual UAT tests 2–5 (browser clipboard paste on `/cnot-bell`, `/deutsch`; fail-mode ergonomics; Qiskit Python shell round-trip). Drift gate provides correctness coverage; these are convenience checks.
- Formal Lighthouse pass (no functional change vs v2 baseline).

## What this phase unlocks

- Phase 2 essay `CircuitView` ships with Qiskit export from day 1 (no extra plan needed).
- Phases 3-6 essays get Qiskit export for free on every embedded circuit.
- Phase 5 N=15 Shor circuit can ship as a static `CircuitView` with the Copy-as-Qiskit button being the only path to actually run it (real hardware bridge).
- Every phase from here on is bundle-gated — regressions caught at CI time.
