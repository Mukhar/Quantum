# Phase 5: Shor + QFT + PQC Threat - Context

**Gathered:** 2026-06-30T00:31:16+05:30  
**Status:** Ready for planning  
**Mode:** Autonomous smart-discuss run spawned by `/gsd-autonomous`; user AFK. All grey areas below are locked from `autonomous-decisions.md` plus explicit phase instructions; do not re-ask.

<domain>
## Phase Boundary

Ship `/shor`, the densest v3 essay: teach QFT inline as Shor's engine, let readers interact with 4-qubit QFT and toy period finding in-browser, render a full N=15 Shor circuit statically with a prominent "Copy as Qiskit" bridge, and close the use-case arc with a grounded RSA/PQC threat widget.

The phase is intentionally split-aware. If plan count exceeds 6, split execution into:

- **5a candidate — QFT + period finding:** `[5a-candidate]` QFT visualizer, `[5a-candidate]` PeriodFinding, canonical-period tests, any shared QFT/period helpers, and route/mirror scaffolding only as needed.
- **5b candidate — Shor N=15 + RSA/PQC:** `[5b-candidate]` static full N=15 circuit, `[5b-candidate]` prominent Qiskit export framing, `[5b-candidate]` RSACountdown + NIST PQC cards, essay closure, mirrors/bundle/a11y close-out.

Hard boundary: the simulator and sandbox remain capped at **4 qubits**. N=15 Shor is not executed in-browser; Qiskit export is the honest bridge to real execution.

</domain>

<decisions>
## Implementation Decisions

### Split-aware scope and sequencing

- **D-01 `[5a-candidate]`: QFT and period finding are the natural first slice.** They satisfy ALG-05/ALG-06 and create the pedagogical engine the essay later uses to explain Shor. Rationale: keeps the math-heavy interactive work independent from RSA/PQC copy and full-circuit rendering.
- **D-02 `[5b-candidate]`: Full Shor N=15 + RSACountdown is the natural second slice.** It satisfies ALG-07/USE-04 and can consume helpers or route scaffolding from 5a. Rationale: it is mostly static-rendering/content/use-case work, with different risks from the 4-qubit interactive QFT work.
- **D-03 `[5a-candidate]` + `[5b-candidate]`: If kept single-phase, preserve this order anyway:** QFT helper → QFT visualizer → period finding → Shor-15 circuit helper/static render → RSACountdown/PQC → essay/mirrors/bundle/a11y. Rationale: each later section narratively depends on the earlier one.
- **D-04 `[5a-candidate]` + `[5b-candidate]`: Major work items must remain tagged in PLAN.md.** If re-sliced, orchestrator can move every `[5a-candidate]` plan into 5a and every `[5b-candidate]` plan into 5b without rediscovery.

### QFT visualizer

- **D-05 `[5a-candidate]`: Render QFT as probability bars input vs output.** Reuse the Phase-4 `AmplitudeBars` pattern when present; in the current codebase the closest landed analog is `ProbabilityBars.astro`, whose store-bound SVG bar/readout pattern should be reused/adapted. Do **not** invent a new visualization primitive. Rationale: the user locked this; it also controls bundle growth and keeps visual language consistent.
- **D-06 `[5a-candidate]`: QFT widget supports 4 qubits by default.** It should show all 16 computational-basis probabilities before and after QFT. Rationale: meets ALG-05 while respecting the `MAX_QUBITS = 4` guard.
- **D-07 `[5a-candidate]`: Input state UX = 4-5 presets plus Custom.** Presets include at least `|0000⟩`, `|0001⟩`, `|0011⟩`, `|0101⟩`; add one high-signal periodic/superposition preset if useful. A “Custom” mode reveals a 16-amplitude editor. Rationale: simple defaults for the essay flow; advanced readers can dig in without making the first screen intimidating. Target delta is small (~50 LOC) and does not justify a separate editor framework.
- **D-08 `[5a-candidate]`: QFT math belongs in `src/lib/quantum/qft.ts`.** It should expose pure helpers for QFT/inverse QFT over state vectors/probability arrays rather than forcing a new circuit op. Rationale: current `Circuit` IR has `gate`, `cnot`, `rot`, `measure` only; no controlled-phase/controlled-rotation op exists, and adding one would ripple through simulator, codec, Qiskit drift tests, and CircuitView.
- **D-09 `[5a-candidate]`: Do not expand gate vocabulary just for QFT unless planning proves it is unavoidable.** Existing rotations are single-qubit only and CNOT is the only controlled op. Controlled phase can be represented mathematically inside `qft.ts` for the visualizer/period-finding helper. Rationale: avoids destabilizing Phase 1 Qiskit exporter and URL codec.

### PeriodFinding widget

- **D-10 `[5a-candidate]`: Interaction model = continuous compute on change with debounce.** Reader adjusts `N` (constrained to `N ≤ 15`) and `a`; the widget recomputes after a short debounce, displays the period prominently, and shows a classical reference period for comparison. Rationale: less ceremony than a Run button, keeps the widget exploratory, and lets canonical examples be tested deterministically.
- **D-11 `[5a-candidate]`: Validate modular arithmetic constraints in the UI and helper.** Disable or annotate invalid `a,N` pairs (e.g. not coprime) rather than crashing. Rationale: Shor’s period-finding preconditions are part of the lesson.
- **D-12 `[5a-candidate]`: Period-finding tests must cover canonical periods.** Include small deterministic cases such as `N=15, a=2 → r=4`, `N=15, a=4 → r=2`, `N=15, a=7 → r=4`, `N=15, a=11 → r=2`, plus at least one “no valid period in window” behavior. Rationale: ALG-06 explicitly requires canonical-period coverage.
- **D-13 `[5a-candidate]`: Edge case from design doc is locked.** If the function period exceeds the register/window, show “no period found in this window — try a smaller `a`”; do not crash.

### Full N=15 Shor circuit and Qiskit bridge

- **D-14 `[5b-candidate]`: Build the N=15 circuit via helper, not essay frontmatter literals.** Add `src/lib/quantum/shor.ts` with `buildShor15()` (and any static display/export helpers planning requires). The essay imports/builds at SSR time. Rationale: testable construction, less fragile `.astro` frontmatter, and clearer documentation of why each block exists.
- **D-15 `[5b-candidate]`: N=15 Shor is rendered statically and framed as “now go run this for real.”** It must not execute in-browser and must make the “Copy as Qiskit” button prominent. Rationale: user locked this and design risk says “no in-browser factoring” must read as intentional, not a cop-out.
- **D-16 `[5b-candidate]`: Current `CircuitView`/`toQiskit` cannot directly accept a >4-qubit `Circuit`.** `Circuit.validateCircuit()` enforces `MAX_QUBITS = 4`, and `CircuitView.astro` calls both `encodeCircuit()` and `toQiskit()` at SSR. Planning must explicitly choose a safe large-static path: e.g. a `StaticCircuitView`/`LargeCircuitView` display model plus `toQiskitLarge()` for Shor-15, or an `allowLargeStatic` path that bypasses sandbox URL encoding while preserving simulator limits. Rationale: this is the highest integration risk; do not silently weaken `MAX_QUBITS` for the simulator or sandbox.
- **D-17 `[5b-candidate]`: QFT controlled-phase requirements should not mutate the global sandbox IR just to draw Shor-15.** If full Shor display needs controlled rotations/phase gates, prefer a Shor-specific static display/export representation or decompositions in `shor.ts`. Rationale: the current supported Qiskit map covers X/Y/Z/H/S/T/I, CNOT, Rx/Ry/Rz, measure; adding new ops requires coordinated simulator/codec/export/test work and may be too broad for this phase.
- **D-18 `[5b-candidate]`: The Qiskit snippet for Shor-15 is allowed to be richer than sandbox-export snippets if isolated.** It may emit Qiskit-native controlled phase/modular-exponentiation subroutines if the helper owns that export path and tests snapshot it. Rationale: N=15 is specifically a “go run in Qiskit” artifact, not a sandbox-remix artifact.

### RSACountdown + PQC

- **D-19 `[5b-candidate]`: RSACountdown primary control = logical-qubits slider.** The widget takes RSA key size (2048/3072/4096) and a “logical qubits available” slider. It computes a clear qubits-to-break estimate using `2 * key_size + overhead` (planner may refine overhead constant but must document it). Rationale: direct manipulation makes the threat model tangible; matches USE-04.
- **D-20 `[5b-candidate]`: Show three milestone markers on the slider.** Mark “today”, “IBM 2030 roadmap” (or equivalent current roadmap phrasing), and “break RSA-2048”. Rationale: user locked this; markers provide context without asserting dates.
- **D-21 `[5b-candidate]`: Do not assert specific break dates.** Follow design-doc edge behavior: render estimates with “as of NIST 2024 estimates” / equivalent current-source language and never claim exact timelines. Rationale: hype-prone content is a known v3 risk.
- **D-22 `[5b-candidate]`: NIST PQC primitive links render as four inline cards.** Cards: Kyber (KEM), Dilithium (signature), Falcon (signature), SPHINCS+ (signature), each with a FIPS/NIST spec link and one-line purpose. Rationale: user locked inline cards over link-only footnotes; makes “what should devs do?” visible.
- **D-23 `[5b-candidate]`: Every PQC/RSA claim needs a source link.** Use NIST/FIPS pages and avoid marketing-deck statements. Rationale: design-doc risk explicitly calls out RSACountdown hype.

### Essay, mirrors, tests, bundle, accessibility

- **D-24 `[5b-candidate]`: `/shor` is the canonical essay route even if planning splits execution.** A split may let 5a build helpers/widgets first, but the final user-facing route is `/shor`; do not create a separate `/qft` route unless the orchestrator explicitly changes ROADMAP/REQUIREMENTS. Rationale: ROADMAP Phase 5 and USE-04 are anchored on `/shor`.
- **D-25 `[5a-candidate]` + `[5b-candidate]`: Mirrors update in the same commit as source canonical lists.** Touch `ConceptMap.astro`, `nav-graph.test.ts`, `concept-map.test.ts`, `sandbox-links.test.ts`, homepage references, and `bundle-budget.json` when `/shor` lands. Rationale: STATE and prior contexts lock same-commit mirrors; tests enforce the canonical list.
- **D-26 `[5a-candidate]`: Sandbox-link starter should use a ≤4-qubit QFT/period-finding circuit or be omitted with rationale.** The N=15 Shor circuit cannot be a sandbox starter under REQ-13. Rationale: `sandbox-links.test.ts` round-trips starters through the 4-qubit codec.
- **D-27 `[5b-candidate]`: Add `/shor` route budget before/with essay landing, then recompute at close-out.** Use Phase 1/2 pattern: placeholder ceiling first, actual gzipped size ×1.2 rounded up at phase close. Rationale: OPS-04 protects bundle bloat.
- **D-28 `[5b-candidate]`: Lighthouse mobile accessibility ≥95 in both themes is a phase close-out gate.** Plan should include an explicit audit/checklist even if automated Lighthouse is not already scripted. Rationale: ROADMAP success criterion.

### Agent discretion

- Exact visual copy for preset names, marker labels, and explanatory prose is planner/executor discretion as long as the decisions above remain intact.
- Exact file naming for a large static circuit renderer is planner discretion (`StaticCircuitView`, `LargeCircuitView`, or prop-based extension), but it must not weaken simulator/sandbox 4-qubit limits.
- Exact RSACountdown overhead constant is planner discretion only if cited and documented in widget copy/tests.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Planning / locked decisions
- `.planning/STATE.md` — v3 status, active architectural decisions, 4-qubit cap, Qiskit bridge, Phase 5 density risk.
- `.planning/ROADMAP.md` — Phase 5 goal, dependencies, ALG-05/06/07 + USE-04 success criteria.
- `.planning/REQUIREMENTS.md` — ALG-05 QFT, ALG-06 PeriodFinding, ALG-07 Shor N=15 via CircuitView/Qiskit, USE-04 RSACountdown/PQC, OPS-04 bundle gate.
- `docs/plans/2026-06-29-v3-design.md` §3.6, §4.1-4.3, §6 edge cases, §7/risks — dense Phase 5 design, Qiskit bridge framing, RSACountdown risk language.
- `/Users/m0j0f4p/.copilot/session-state/bc64e80e-b224-4be7-8a25-f50b54e81279/files/autonomous-decisions.md` — locked AFK decisions; do not ask user to re-confirm.
- `.planning/phases/01-foundation/PHASE-CONTEXT.md` — Qiskit export contract, `CircuitView` button, bundle-budget protocol.
- `.planning/phases/02-teleportation/PHASE-CONTEXT.md` — shared-widget, mirror, and bundle patterns; no simulator IR creep unless necessary.

### Quantum core / export constraints
- `src/lib/quantum/circuit.ts` — `Op` union, `Circuit`, `MAX_QUBITS = 4`, validation, helpers.
- `src/lib/quantum/simulator.ts` — state-vector simulator, qubit-0 LSB convention, 4-qubit constructor guard, probability API.
- `src/lib/quantum/qiskit.ts` — current Qiskit exporter and supported gate map; currently validates 1-4 qubit `Circuit` values.
- `src/lib/quantum/index.ts` — public quantum barrel; new `qft.ts`/`shor.ts` helpers should export here if consumed by pages/tests.
- `src/lib/quantum/teleportation.ts` — model for testable algorithm helper + circuit builder + narrative step exports.

### Components / route integration
- `src/components/ProbabilityBars.astro` — landed bar-chart/store-subscription pattern; closest current analog if Phase-4 `AmplitudeBars` is absent at planning time.
- `src/components/CircuitView.astro` — current static SVG circuit renderer + baked Qiskit button; integration risk for >4-qubit Shor.
- `src/components/ConceptMap.astro` — canonical node/edge list and mobile fallback; `/shor` mirror target.
- `src/pages/teleportation.astro` — current v3 essay structure and footer-nav mirror pattern.
- `bundle-budget.json` — per-route budget manifest; `/shor` must be added.

### Tests / mirrors
- `tests/essays/nav-graph.test.ts` — reading chain mirror; `/shor` must be inserted in the chain when the essay lands.
- `tests/essays/concept-map.test.ts` — concept-map node mirror; `/shor` expected node must be added.
- `tests/essays/sandbox-links.test.ts` — sandbox starter mirror; only include a ≤4-qubit starter, not N=15 Shor.
- Existing quantum tests under `tests/quantum/` — model for deterministic helper tests and Qiskit snapshots.

### External sources for 5b
- NIST FIPS / PQC pages for ML-KEM/Kyber, ML-DSA/Dilithium, Falcon, and SPHINCS+ — required source links for RSACountdown cards.
- Current IBM or comparable public quantum roadmap source — only for a labeled milestone marker; do not turn it into a date prediction.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `[5a-candidate]` `ProbabilityBars.astro`: store-bound SVG probability bar chart; reuse visual/data-update structure for QFT input/output bars if Phase-4 `AmplitudeBars` is not present.
- `[5a-candidate]` `Simulator.probabilities()` and `basisLabel()`/`basisKet()` formatting: already provide basis-state probabilities and labels for 16 bars.
- `[5a-candidate]` `teleportation.ts` helper pattern: shows how to centralize an algorithm’s circuits/steps and tests outside the essay.
- `[5b-candidate]` `CircuitView.astro`: already renders static circuits and provides a baked `Copy as Qiskit` button for ≤4-qubit `Circuit` values.
- `[5b-candidate]` `bundle-budget.json` + Phase 1/2 contexts: route budget protocol is established.

### Established Patterns
- `[5a-candidate]` Vanilla TS + in-repo `signal<T>` only; no frontend framework imports.
- `[5a-candidate]` Algorithm helpers should be pure/testable under `src/lib/quantum/` and exported from `src/lib/quantum/index.ts` when used by pages/tests.
- `[5b-candidate]` Use-case widgets are self-contained and consume static data/local controls; they do not subscribe to quantum-state stores.
- `[5b-candidate]` Essay pages update source + mirrors + tests in the same commit.
- `[5a-candidate]` + `[5b-candidate]` Qubit convention: qubit 0 is LSB, matching Qiskit mental model.

### Integration Points
- `[5a-candidate]` New `src/lib/quantum/qft.ts` for QFT/inverse and period-analysis helpers.
- `[5a-candidate]` New QFT/PeriodFinding components under `src/components/` or `src/components/QFTVisualizer/` depending on planner bundle choice.
- `[5b-candidate]` New `src/lib/quantum/shor.ts` with `buildShor15()` or large-static Qiskit/display helpers.
- `[5b-candidate]` New `RSACountdown.astro` with inline PQC cards and external source links.
- `[5b-candidate]` `src/pages/shor.astro` final route with footer-nav, concept-map, sandbox starter, budget, and a11y close-out.

### Integration Risks
- `[5b-candidate]` `CircuitView` and `toQiskit` currently encode/validate via 4-qubit `Circuit`; N=15 needs a deliberate large-static path.
- `[5a-candidate]` QFT circuit decomposition normally wants controlled phase rotations; the current IR does not represent them.
- `[5b-candidate]` Full Shor diagrams can become visually huge on mobile; renderer must preserve accessibility and avoid horizontal traps.
- `[5b-candidate]` RSACountdown claims can become hype. Source every number and use caveated language.

</code_context>

<specifics>
## Specific Ideas

- `[5a-candidate]` QFT visualizer should feel like “same bars, new lens”: input distribution left, QFT output right, a short caption explaining that periodic structure turns into spikes.
- `[5a-candidate]` PeriodFinding should show both the modular sequence (`a^x mod N`) and the inferred period, then visually connect the period to QFT peak positions.
- `[5b-candidate]` The Shor-15 section should not apologize for being static; use the locked line: “You’ll build the engine here; now run the real thing in Qiskit.”
- `[5b-candidate]` RSACountdown should end with action-oriented PQC cards: KEM vs signatures, where each primitive fits, and official specs.

## Preliminary Plan Count Estimate

Likely **7-8 plans** if kept as one phase:

1. `[5a-candidate]` QFT math/helper tests (`qft.ts`).
2. `[5a-candidate]` QFT visualizer UI + preset/custom input.
3. `[5a-candidate]` PeriodFinding helper/widget + canonical tests.
4. `[5b-candidate]` Large static Shor-15 representation/export path (`shor.ts`, renderer/Qiskit snapshots).
5. `[5b-candidate]` `/shor` essay body + static circuit/Qiskit CTA.
6. `[5b-candidate]` RSACountdown + PQC cards + sourced copy/tests.
7. `[5b-candidate]` Mirrors, sandbox starter, bundle budget, homepage/nav/concept-map tests.
8. `[5b-candidate]` Accessibility/Lighthouse/bundle close-out and route budget recompute.

Because this exceeds the user’s 6-plan split trigger, the orchestrator should expect to split unless planner can safely merge close-out/mirrors with route work without losing verification quality.

</specifics>

<deferred>
## Deferred Ideas

- Separate `/qft` route — out of scope unless orchestrator rewrites ROADMAP/REQUIREMENTS; `/shor` remains canonical.
- General controlled-phase / controlled-rotation simulator IR — defer unless planning proves it is strictly necessary. Prefer `qft.ts` math and Shor-specific static/export paths.
- Running N=15 Shor in-browser — explicitly out of scope and conflicts with the 4-qubit simulator cap.
- Date-specific “RSA will break by year X” claims — out of scope and too hype-prone; use sourced estimates/markers only.

</deferred>

---

*Phase: 05-shor*  
*Context gathered: 2026-06-30 — autonomous discuss-phase, split-aware for 5a/5b.*
