# Phase 5b: Shor N=15 + RSACountdown + PQC - Context

**Gathered:** 2026-06-30T00:31:16+05:30  
**Extracted:** 2026-06-30 during `/gsd-autonomous` split planning  
**Status:** Ready for planning  
**Mode:** Extracted from `.planning/phases/05-shor/PHASE-CONTEXT.md` after the user-locked split trigger fired. Original discuss attribution is preserved: autonomous discuss-phase agent for Phase 5, user Mukhar AFK, decisions locked by `autonomous-decisions.md`.

<domain>
## Phase Boundary

This is the second slice of the original Phase 5. Phase 5a owns QFT helpers,
the QFT visualizer, PeriodFinding, and the initial `/shor` scaffold. Phase
5b extends the **same `/shor` route** to finish the Shor/RSA/PQC story:

- `[5b-candidate]` static full N=15 Shor circuit.
- `[5b-candidate]` prominent Qiskit export framing.
- `[5b-candidate]` RSACountdown + NIST PQC cards.
- `[5b-candidate]` essay closure, mirrors/bundle/a11y close-out.

Hard boundary: the simulator and sandbox remain capped at **4 qubits**. N=15
Shor is not executed in-browser; Qiskit export is the honest bridge to real
execution.
</domain>

<decisions>
## Extracted Implementation Decisions

### Split-aware scope and sequencing

- **D-02 `[5b-candidate]`: Full Shor N=15 + RSACountdown is the natural second slice.** It satisfies ALG-07/USE-04 and can consume helpers or route scaffolding from 5a. Rationale: it is mostly static-rendering/content/use-case work, with different risks from the 4-qubit interactive QFT work.
- **D-03 `[5b-candidate]`: Preserve this order:** Shor-15 circuit helper/static render → RSACountdown/PQC → essay/mirrors/bundle/a11y. Rationale: each later section narratively depends on the earlier one.
- **D-04 `[5b-candidate]`: Major work items remain tagged in PLAN.md.**

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

- **D-24 `[5b-candidate]`: `/shor` is the canonical essay route even if planning splits execution.** Phase 5b extends the route created in 5a; do not create a separate `/qft` route.
- **D-25 `[5b-candidate]`: Mirrors update in the same commit as source canonical lists.** Touch `ConceptMap.astro`, `nav-graph.test.ts`, `concept-map.test.ts`, `sandbox-links.test.ts`, homepage references, and `bundle-budget.json` when `/shor` changes source canonical lists.
- **D-27 `[5b-candidate]`: Add/update `/shor` route budget before/with essay landing, then recompute at close-out.** Use Phase 1/2 pattern: placeholder ceiling first, actual gzipped size ×1.2 rounded up at phase close.
- **D-28 `[5b-candidate]`: Lighthouse mobile accessibility ≥95 in both themes is a phase close-out gate.** Plan should include an explicit audit/checklist even if automated Lighthouse is not already scripted.

### Agent discretion

- Exact visual copy for marker labels and explanatory prose is planner/executor discretion as long as the decisions above remain intact.
- Exact file naming for a large static circuit renderer is planner discretion (`StaticCircuitView`, `LargeCircuitView`, or prop-based extension), but it must not weaken simulator/sandbox 4-qubit limits.
- Exact RSACountdown overhead constant is planner discretion only if cited and documented in widget copy/tests.
</decisions>

<canonical_refs>
## Canonical References

- `.planning/STATE.md` — v3 status, active decisions, 4-qubit cap, Qiskit bridge, Phase 5 density risk.
- `.planning/ROADMAP.md` — split Phase 5a/5b goal and dependencies after planning update.
- `.planning/REQUIREMENTS.md` — ALG-07 Shor N=15 via CircuitView/Qiskit, USE-04 RSACountdown/PQC, OPS-04 bundle gate.
- `.planning/phases/05-shor/PHASE-CONTEXT.md` — original full Phase 5 discuss artifact and attribution.
- `.planning/phases/05-shor/PLAN.md` — Phase 5a plan; this phase extends its `/shor` scaffold.
- `/Users/m0j0f4p/.copilot/session-state/bc64e80e-b224-4be7-8a25-f50b54e81279/files/autonomous-decisions.md` — locked AFK decisions; do not ask user to re-confirm.
- `src/lib/quantum/circuit.ts` — `Op` union, `Circuit`, `MAX_QUBITS = 4`, validation, helpers.
- `src/lib/quantum/qiskit.ts` — current ≤4-qubit exporter; do not weaken it for Shor N=15.
- `src/components/CircuitView.astro` — current static renderer + Qiskit button; integration risk for >4 qubits.
- `tests/essays/nav-graph.test.ts`, `concept-map.test.ts`, `sandbox-links.test.ts` — mirrors.
- NIST FIPS / PQC pages for ML-KEM/Kyber, ML-DSA/Dilithium, Falcon, and SPHINCS+.
- Current IBM or comparable public quantum roadmap source for a labeled milestone marker only; do not make date predictions.
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `[5b-candidate]` `CircuitView.astro`: already renders static circuits and provides a baked `Copy as Qiskit` button for ≤4-qubit `Circuit` values.
- `[5b-candidate]` `bundle-budget.json` + Phase 1/2 contexts: route budget protocol is established.

### Established Patterns

- `[5b-candidate]` Use-case widgets are self-contained and consume static data/local controls; they do not subscribe to quantum-state stores.
- `[5b-candidate]` Essay pages update source + mirrors + tests in the same commit.
- `[5b-candidate]` Qubit convention: qubit 0 is LSB, matching Qiskit mental model.

### Integration Points

- `[5b-candidate]` New `src/lib/quantum/shor.ts` with `buildShor15()` or large-static Qiskit/display helpers.
- `[5b-candidate]` New `RSACountdown.astro` with inline PQC cards and external source links.
- `[5b-candidate]` `src/pages/shor.astro` final route with footer-nav, concept-map, sandbox starter, budget, and a11y close-out.

### Integration Risks

- `[5b-candidate]` `CircuitView` and `toQiskit` currently encode/validate via 4-qubit `Circuit`; N=15 needs a deliberate large-static path.
- `[5b-candidate]` Full Shor diagrams can become visually huge on mobile; renderer must preserve accessibility and avoid horizontal traps.
- `[5b-candidate]` RSACountdown claims can become hype. Source every number and use caveated language.
</code_context>

<specifics>
## Specific Ideas

- `[5b-candidate]` The Shor-15 section should not apologize for being static; use the locked line: “You’ll build the engine here; now run the real thing in Qiskit.”
- `[5b-candidate]` RSACountdown should end with action-oriented PQC cards: KEM vs signatures, where each primitive fits, and official specs.

## Extracted Work Items

1. `[5b-candidate]` Large static Shor-15 representation/export path (`shor.ts`, renderer/Qiskit snapshots).
2. `[5b-candidate]` `/shor` essay body + static circuit/Qiskit CTA.
3. `[5b-candidate]` RSACountdown + PQC cards + sourced copy/tests.
4. `[5b-candidate]` Mirrors, sandbox starter discipline, bundle budget, homepage/nav/concept-map tests.
5. `[5b-candidate]` Accessibility/Lighthouse/bundle close-out and route budget recompute.
</specifics>

<deferred>
## Deferred Ideas

- Separate `/qft` route — out of scope; `/shor` remains canonical.
- General controlled-phase / controlled-rotation simulator IR — defer unless strictly necessary. Prefer Shor-specific static/export paths.
- Running N=15 Shor in-browser — explicitly out of scope and conflicts with the 4-qubit simulator cap.
- Date-specific “RSA will break by year X” claims — out of scope and too hype-prone; use sourced estimates/markers only.
</deferred>

---

*Phase: 05b-shor-pqc*  
*Context extracted from original Phase 05-shor discuss artifact; original gathered timestamp 2026-06-30.*
