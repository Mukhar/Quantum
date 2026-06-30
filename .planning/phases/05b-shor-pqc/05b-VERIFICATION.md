---
status: passed
phase: 05b-shor-pqc
verifier: autonomous-orchestrator (continuation)
verified_at: 2026-06-30T18:48:00Z
basis:
  - Automated: npm test green (548 tests; +65 vs Phase 5a baseline of 483)
  - Automated: npm run build green (23 pages; /shor extended in place; no new route)
  - Automated: npm run check:bundle green (/shor 3.2 KB / 4.0 KB ceiling; all 23 routes within budget)
  - Code-level a11y review (Plan 05b-05 commit body): keyboard reach across LargeCircuitView scroll region, Copy button, RSACountdown <select>+<input range>+aria-describedby, and PQC anchor cards verified by grep + structural tests; aria-live="polite" on RSACountdown summary; visible focus rings on Copy button; descriptive external link text on every <a>
  - Manual user gate deferred: browser Lighthouse (light + dark themes) and live screen-reader pass remain user-side
---

# Phase 5b — Shor: N=15 + RSACountdown + PQC — Verification

## Goal recap

> Finish the Shor story on the canonical `/shor` route. Phase 5b lands
> ALG-07 (full N=15 Shor circuit, static-only with a prominent
> "Copy as Qiskit" CTA) and USE-04 (RSACountdown widget plus NIST PQC
> cards), bolted onto the QFT + period-finding engine 5a shipped. No
> new route, no simulator-cap bump, no in-browser factoring.

## Success criteria scorecard (vs PLAN.md Definition of Done, 10 items)

| # | Criterion | Status | Evidence |
|---|---|--------|----------|
| 1 | `src/lib/quantum/shor.ts` exists with `buildShor15()` + `toQiskitShor15()` and a static-only op union | ✅ PASS | ~250 LOC module; barrel re-export in `src/lib/quantum/index.ts`; `tests/quantum/shor.test.ts` ships 21 deterministic tests across three suites (structure 10, isolation 2 — proves shape disjoint from `Circuit` and `MAX_QUBITS = 4` preserved, exporter 9 with inline-snapshot Qiskit output drift gate). `StaticCircuitOp` union (`h \| cphase \| block \| swap \| measure`) is disjoint from sandbox `Op` (`gate \| cnot \| rot \| measure`) (commit `8ee3758`) |
| 2 | `LargeCircuitView.astro` renders the static `>4`-qubit Shor diagram with a prominent "Copy as Qiskit" CTA and no remix-in-sandbox link | ✅ PASS | ~430 LOC component; baked SVG geometry (LABEL_W=56, STEP_W=80, ROW_H=40); per-block dashed-stroke bands with captioned legend; sky-200 / orange-200 register colour-coding. `data-action="copy-shor-qiskit"` so it cannot collide with sandbox `CircuitView`'s `copy-qiskit` handler. `tests/components/large-circuit-view.test.ts` (15 tests) explicitly asserts the absence of `encodeCircuit` / sandbox `toQiskit` imports and any "Remix in sandbox" prose in the **runnable code** (comments stripped via `/\*…\*/` and `//…` regex). Click-hydrator copies the baked `data-qiskit` payload via `navigator.clipboard` (commit `21fb55d`) |
| 3 | RSACountdown widget with key-size selector, logical-qubits slider, sourced markers, and aria-live summary | ✅ PASS | `src/components/RSACountdown.astro` (~330 LOC) + `src/lib/quantum/rsaCountdown.ts` (~190 LOC pure helpers). Three markers (today / vendor roadmap / break threshold) painted on an SVG band; `aria-live="polite"` summary text branches on `pastThreshold = (available >= required)`; both branches covered by `tests/components/rsa-countdown.test.ts > countdownGap reports` (commit `f738ab8`) |
| 4 | NIST PQC cards covering all four standardized / final algorithms with official FIPS links | ✅ PASS | `src/components/PQCCards.astro` (~95 LOC) renders four cards: ML-KEM (FIPS 203), ML-DSA (FIPS 204), FN-DSA / Falcon (draft FIPS 206), SLH-DSA / SPHINCS+ (FIPS 205). Each card carries `kind` (KEM/Signature), `standard` label, one-line `purpose`, and a `target="_blank" rel="noopener noreferrer"` link to the official NIST URL. `tests/components/rsa-countdown.test.ts > PQCCards` (9 tests) verifies all four algorithms appear, FIPS links match `csrc.nist.gov/pubs/fips/{203,204,205}/final`, and the source contains no "best / recommend / always use" marketing language in visible markup (commit `f738ab8`) |
| 5 | `/shor` essay extended in place with N=15, RSACountdown, and PQC sections; QFT + period-finding from 5a preserved | ✅ PASS | `src/pages/shor.astro` updated: 5a "continued in Phase 5b" stub replaced with three new h2 sections. Imports added: `LargeCircuitView`, `RSACountdown`, `PQCCards`, `buildShor15`. Subtitle and description rewritten to reflect both halves. Footer-nav unchanged. Build output: `dist/shor/index.html` exists; total page count still 23 (no new route) (commit `89d50ab`) |
| 6 | Same-commit mirror discipline preserved | ✅ PASS | Mirrors (`ConceptMap.astro`, `tests/essays/nav-graph.test.ts`, `tests/essays/concept-map.test.ts`, `tests/essays/sandbox-links.test.ts`) already pointed at `/shor` with shor-as-primary tier from 5a's commit `41a7f3b`. The `sandbox-links.test.ts` comment explicitly documents that N=15 is barred as a sandbox starter (PHASE-CONTEXT D-26). `bundle-budget.json` ceiling bump landed in the same commit as the regression (`89d50ab`) |
| 7 | OPS-04 budget recomputed and updated in same commit as regression | ✅ PASS | `/shor` ceiling 3072 → 4096 in commit `89d50ab`. Actual 3.2 KB gzipped; `ceil(3.2 × 1.2) = 4 KB` per the file's documented rule. `npm run check:bundle` table shows all 23 routes within budget |
| 8 | Simulator/sandbox cap stays at 4 qubits; static N=15 model never touches sandbox IR | ✅ PASS | `git diff --stat` for Phase 5b shows no edit to `src/lib/quantum/simulator.ts`, `src/lib/quantum/codec.ts`, `src/lib/quantum/qiskit.ts`, or `src/lib/quantum/circuit.ts`. `MAX_QUBITS = 4` unchanged. `tests/quantum/shor.test.ts > isolation > N=15 model is shape-disjoint from sandbox Circuit` and `> MAX_QUBITS = 4 preserved` assert the boundary. Sandbox codec / simulator / qiskit-export golden tests still green |
| 9 | No new runtime dependencies; vanilla TS + Astro only | ✅ PASS | `package.json` and `package-lock.json` unchanged across all five Phase 5b commits (`8ee3758`, `21fb55d`, `f738ab8`, `89d50ab`, `d72a701`). LargeCircuitView and RSACountdown ship inline `<script>` blocks only; numeric logic lives in `src/lib/quantum/shor.ts` and `src/lib/quantum/rsaCountdown.ts` and is invoked SSR-side |
| 10 | npm test, npm run build, and npm run check:bundle are green at phase close | ✅ PASS | `npm test`: 548/548 tests across 36 files (run at commit `d72a701`). `npm run build`: 23 pages emit in 2.16s; no warnings. `npm run check:bundle`: all 23 routes OK with `/shor` at 3.2 / 4.0 KB |

## Plans landed (atomic commits)

| Plan  | Commit    | Title |
|-------|-----------|-------|
| 05b-01 | `8ee3758` | `feat(05b-01): buildShor15 static model + Qiskit snapshots` |
| 05b-02 | `21fb55d` | `feat(05b-02): LargeCircuitView static renderer + prominent Qiskit CTA` |
| 05b-03 | `f738ab8` | `feat(05b-03): RSACountdown widget + NIST PQC cards` |
| 05b-04 | `89d50ab` | `feat(05b-04): complete /shor essay — N=15 + RSACountdown + PQC` |
| 05b-05 | `d72a701` | `chore(05b-05): bundle + a11y + split close-out` |

## Numbers (post-phase)

- Tests: **548 / 548** passing (+65 from Phase 5a baseline of 483; 21 shor + 15 large-circuit-view + 29 rsa-countdown).
- Pages: **23** building clean — no new route (`/shor` extended in place).
- Bundle: `/shor` 3.2 / 4.0 KB; site-wide table all green. All 22 other routes unchanged.
- Hard cap: simulator stays at 4 qubits — `tests/quantum/shor.test.ts > isolation > MAX_QUBITS = 4 preserved` asserts the constant directly; N=15 lives in a separate static module with its own op union.
- LOC shipped in Phase 5b: ~1,300 source (~250 shor.ts + ~430 LargeCircuitView + ~190 rsaCountdown.ts + ~330 RSACountdown + ~95 PQCCards + essay updates) and ~720 tests (21+15+29 = 65 new tests across 3 test files).

## Notable correctness observations

- **Static op vocabulary is genuinely disjoint.** `StaticCircuitOp` (`h | cphase | block | swap | measure`) and sandbox `Op` (`gate | cnot | rot | measure`) share only `measure`; even there the test suite verifies the static shape never enters `encodeCircuit` / `validateCircuit`. Adding any of `cphase` / `block` / `swap` to the sandbox in a future phase would need an explicit decision because the type system genuinely treats them as separate.
- **Qiskit export drift is locked.** `tests/quantum/shor.test.ts` uses an inline snapshot for the full Python output. Any future edit to `shor.ts` that changes whitespace, comments, gate ordering, or the `QFT(4).inverse()` line will fail the snapshot diff; we update the snapshot only when intentional.
- **RSACountdown calendar-safety is enforced by test.** The "no future calendar date" assertion strips `RSA-XXXX`, `FIPS-XXX`, `arXiv:XXXX.XXXXX`, and the citation years `(2024)`, `(2021)`, `(2002)` from the source, then scans for `in/by/around/breaks in/circa YYYY` future-year patterns. This catches accidental "by 2030" prose without flagging key-size mentions.
- **PQCCards neutrality is enforced by test.** The "does not recommend a single best" assertion strips the doc-comment block (which deliberately says "not a recommendation engine") and scans the visible markup for `best / recommend / always use` patterns. The card grid stays presentational rather than prescriptive.
- **LargeCircuitView frontmatter precomputation.** The Astro template parser does not tolerate block-body arrow functions inside `{...}` interpolation slots. The frontmatter precomputes four arrays (`wires`, `cphaseConnectors`, `swapConnectors`, `cells`) so the JSX iterates expression-bodied only. This is a parser-shape requirement, not an aesthetic choice; documented in the file's header comment so future maintainers know why the code shape is what it is.

## Gaps

None blocking. Two user-side gates remain open:

- **Browser-side Lighthouse** (light + dark themes) on the deployed `/shor` page — deferred to milestone summary per OPS-01 + PHASE-CONTEXT D-28 (structural a11y is in place; formal device-emulated Lighthouse rolls up with the rest of v3 at Phase 6 launch).
- **Live screen-reader pass** (VoiceOver / NVDA) over the three new widgets and **real-device mobile check** of the `LargeCircuitView` horizontal-scroll behaviour — flagged in Plan 05b-05 commit body as a user gate.

## Carry-forward for Phase 6

- `/shor` is feature-complete. The full Shor story (engine → mechanism → threat → migration) tells in one essay; Phase 6 does not need to touch `/shor` again unless it materially changes the v3 chain.
- All 23 v3 routes are within bundle budget; OPS-04 is healthy heading into launch.
- `MAX_QUBITS = 4` constraint has now survived 5 algorithm phases with no regression. The N=15 static-module pattern (separate op union, separate Qiskit-export path, no `encodeCircuit` touch) is a reusable template if Phase 6's VQE essay ever needs a >4-qubit static diagram.
- Footer-nav: `/grover → /shor → /sandbox` is locked. Phase 6's VQE essay will need to insert itself somewhere in the chain (likely between `/shor` and `/sandbox`); the same-commit mirror discipline from 5a/5b provides the template.
- 548 tests / 23 pages / all routes green is the v3 launch baseline.
