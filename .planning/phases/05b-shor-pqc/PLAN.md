# Phase 5b Plan — Shor: N=15 Circuit + RSACountdown + PQC

**Phase goal:** Extend the `/shor` route created in Phase 5a to finish the
original Phase 5 promise: a static full N=15 Shor circuit with a prominent
Qiskit bridge, a grounded RSACountdown widget, inline NIST PQC cards, and
bundle/a11y close-out.

**Depends on:** Phase 5a (`/shor` scaffold, QFT/PeriodFinding sections),
Phase 1 (`toQiskit` contract and bundle gate), Phase 4 (`/grover` handoff),
and the v3 4-qubit simulator cap.

**Source of truth:** `.planning/phases/05b-shor-pqc/PHASE-CONTEXT.md` plus
`.planning/phases/05-shor/PHASE-CONTEXT.md` `[5b-candidate]` decisions.

## Definition of Done (phase-level)

1. `src/lib/quantum/shor.ts` exists with a testable `buildShor15()` helper
   or equivalent static display/export model for N=15.
2. N=15 Shor is rendered statically in `/shor` without executing in the
   browser and without weakening `MAX_QUBITS = 4` for simulator/sandbox.
3. The Qiskit export for Shor N=15 is prominent and snapshot-tested; it may
   use an isolated large-circuit exporter rather than the ≤4-qubit
   `toQiskit()` path.
4. `RSACountdown` ships with RSA key-size controls, a logical-qubits slider,
   milestone markers, caveated estimates, and source links.
5. Four NIST PQC cards (Kyber/ML-KEM, Dilithium/ML-DSA, Falcon, SPHINCS+)
   render inline with purpose + official links.
6. `/shor` essay is complete: QFT/PeriodFinding from 5a, static Shor N=15,
   Qiskit CTA, RSACountdown, PQC action section, and footer-nav all connect.
7. Mirrors remain in sync. No new route is introduced; all changes extend
   `/shor`.
8. OPS-04 remains green and `/shor` budget is recomputed after clean build.
9. Lighthouse/manual mobile a11y checklist for `/shor` passes in both themes.
10. `npm run build`, `npm run check:bundle`, and `npm test` pass.

## Pre-flight findings

- `CircuitView.astro` currently calculates geometry for arbitrary `N`, but
  also calls `encodeCircuit(circuit)` and `toQiskit(circuit)`. Both paths
  validate `Circuit` against `MAX_QUBITS = 4`, so current CircuitView cannot
  natively render/export a >4-qubit N=15 Shor `Circuit`.
- `qiskit.ts` emits only the simulator IR (`gate`, `cnot`, `rot`,
  `measure`). N=15 Shor needs a separate static/export model or a carefully
  isolated extension that does not affect sandbox URLs.
- `circuit.ts` has no controlled-phase / controlled-Rz op. Phase 5b should
  not add it globally unless implementation proves all codec/simulator/export
  consequences are worth the scope. Prefer Shor-specific static ops.

## Plans

> **Wave 1:** `05b-01` alone. Establish the large static circuit/export
> model and prove it with snapshots before touching the essay.
>
> **Wave 2:** `05b-02` and `05b-03` in parallel. Static circuit renderer
> integration and RSACountdown/PQC are different surfaces.
>
> **Wave 3:** `05b-04`. Extend `/shor`, wire mirrors/source copy, and keep
> same-route discipline.
>
> **Wave 4:** `05b-05`. Bundle/a11y close-out and final verification.

---

### 05b-01 — `[5b-candidate]` `buildShor15()` static model + Qiskit snapshots

**Why:** The full N=15 Shor artifact must be testable and maintainable, not
an essay-frontmatter blob. Because current `Circuit`/`toQiskit` cannot safely
represent >4-qubit controlled-phase/modular exponentiation, this plan owns an
isolated large-static representation and exporter.

**Deliverables:**

- `src/lib/quantum/shor.ts` (new) exporting:
  - `buildShor15(): ShorStaticCircuit` or equivalent.
  - `toQiskitShor15(circuit?: ShorStaticCircuit): string`.
  - `SHOR15_QUBITS`, `SHOR15_DESCRIPTION`, and small metadata consumed by
    the essay/renderer.
  - Types for static display ops, e.g. `StaticCircuitOp` with labels for
    H, controlled phase, modular multiply blocks, inverse QFT, measure.
- Representation rules:
  - It is **not** assignable to `Circuit`; it bypasses sandbox codec and
    simulator validation by design.
  - It includes enough structure for a static SVG/table renderer to draw
    wires, blocks, controls, targets, and grouped subroutines.
  - It includes copy that identifies register roles (counting register,
    work register, classical bits) so the diagram is pedagogical rather
    than an unreadable gate dump.
- Qiskit exporter rules:
  - Emit a runnable Python snippet or a clearly runnable skeleton with
    named subroutine placeholders implemented inline for N=15.
  - Prefer Qiskit-native methods for controlled phase / modular operations
    if readable.
  - Header says it is generated for the static Shor N=15 artifact and is
    not a sandbox circuit fragment.
  - Do not call `encodeCircuit()` or `validateCircuit()`.
- `src/lib/quantum/index.ts` re-exports the Shor public helpers/types.
- `tests/quantum/shor.test.ts` (new):
  - Asserts `buildShor15()` has >4 qubits and known register metadata.
  - Asserts static op count/group labels are stable enough for rendering.
  - Snapshot-tests `toQiskitShor15()` and verifies it contains expected
    Qiskit constructs (`QuantumCircuit`, QFT/inverse QFT section,
    modular exponentiation/factoring comments, measurements).
  - Asserts the helper does not return a `Circuit` and does not touch
    sandbox `MAX_QUBITS` validation.

**read_first:**

- `src/lib/quantum/circuit.ts` — understand what not to reuse for >4 qubits.
- `src/lib/quantum/qiskit.ts` — style and header precedent, but not a direct
  dependency for large export.
- Phase 5a `src/lib/quantum/qft.ts` if landed — reuse labels/concepts only;
  do not couple N=15 static export to 4-qubit runtime helpers.
- `tests/quantum/qiskit.test.ts` — snapshot style.
- `.planning/phases/05b-shor-pqc/PHASE-CONTEXT.md` D-14..D-18.

**Acceptance:**

- `npm test -- shor` passes.
- Snapshot diff for the Qiskit snippet is readable and includes the full
  educational structure.
- `MAX_QUBITS` remains 4 and no existing codec/qiskit tests are loosened.
- `npm test -- qiskit` still passes unchanged.

---

### 05b-02 — `[5b-candidate]` Large static circuit renderer + `/shor` Qiskit CTA

**Why:** ALG-07 requires a full N=15 Shor circuit rendered statically with a
Qiskit-export button. Current `CircuitView` is not safe for >4 qubits, so we
need an isolated static renderer or a prop-based extension that bypasses
sandbox encoding while preserving the 4-qubit cap.

**Deliverables:**

- Add one of the following, with executor choosing the smallest safe path:
  - `src/components/LargeCircuitView.astro` for `ShorStaticCircuit`, or
  - `src/components/StaticCircuitView.astro`, or
  - a tightly scoped `CircuitView` extension that accepts a distinct static
    model and never passes it to `encodeCircuit()`/`toQiskit()`.
- Renderer behavior:
  - Draws >4 wires and grouped blocks responsively.
  - Provides a prominent `Copy Shor N=15 Qiskit` button using
    `toQiskitShor15()` from 05b-01.
  - Does **not** show “Remix in sandbox” for N=15.
  - Uses semantic theme classes and maintains keyboard/focus affordances.
  - Handles mobile by grouping/collapsing sections or horizontal scrolling
    with visible affordance; avoid accidental viewport traps.
- Tests:
  - `tests/components/large-circuit-view.test.ts` or equivalent text-based
    component test asserts no `encodeCircuit(` call is present in the large
    static path.
  - Asserts the copy button data/action and Qiskit payload/source hook exist.
  - Asserts “Remix in sandbox” is absent for Shor N=15.
- If executor extends `CircuitView.astro`, also update existing
  `tests/components/circuit-view.test.ts` to prove normal ≤4-qubit behavior
  remains unchanged.

**read_first:**

- `src/components/CircuitView.astro` — current geometry and copy hydrator.
- `src/components/SandboxLink.astro` — understand why N=15 must not use it.
- `src/lib/quantum/shor.ts` from 05b-01.
- Existing component tests under `tests/components/`.
- `.planning/phases/05b-shor-pqc/PHASE-CONTEXT.md` D-15..D-18.

**Acceptance:**

- `/shor` can embed the static N=15 renderer without SSR validation errors.
- Copy button copies Shor-specific Qiskit text; it is visually more prominent
  than the normal small CircuitView link.
- No N=15 remix/sandbox link appears.
- Existing `CircuitView` consumers (`/cnot-bell`, `/deutsch`,
  `/teleportation`, 5a `/shor` if any) still build and test.
- `npm run build` and component tests pass.

---

### 05b-03 — `[5b-candidate]` RSACountdown widget + sourced NIST PQC cards

**Why:** USE-04 is the use-case half of the Shor essay. The widget must make
RSA risk tangible without hype and give developers concrete PQC primitives
to recognize.

**Deliverables:**

- `src/components/RSACountdown.astro` (new) with:
  - RSA key-size selector: 2048 / 3072 / 4096.
  - Logical-qubits slider with visible numeric value.
  - Formula copy: `estimated logical qubits ≈ 2 × key_size + overhead`, or
    a refined cited formula. If overhead constant changes, document source
    and rationale in component copy/tests.
  - Milestone markers: “today”, “IBM 2030 roadmap” (or equivalent current
    public roadmap phrasing), and “break RSA-2048”. Avoid exact break dates.
  - Output area explaining gap between selected logical-qubit capacity and
    the estimate.
  - `aria-live="polite"` summary and keyboard-friendly controls.
- Inline NIST PQC cards in the component or a sibling
  `src/components/PQCCards.astro`:
  - Kyber / ML-KEM — KEM.
  - Dilithium / ML-DSA — signature.
  - Falcon — signature.
  - SPHINCS+ / SLH-DSA — hash-based signature.
  - Each card links to official NIST/FIPS pages and has one-line purpose.
- Source discipline:
  - Every estimate/caveat has a nearby link or footnote.
  - Copy avoids “RSA breaks in year X”.
  - Phrase as “threat planning” and “migration pressure,” not guaranteed
    timelines.
- Tests:
  - Pure helper under `src/lib/quantum/rsaCountdown.ts` or local exported
    helper if needed: `estimateLogicalQubits(keySize, overhead)` and marker
    placement functions.
  - `tests/quantum/rsaCountdown.test.ts` or `tests/components/rsa-countdown.test.ts`
    covers 2048/3072/4096 calculations and marker ordering.
  - Component text test asserts all four PQC labels and official links are
    present.

**read_first:**

- `src/components/QuantumNetwork.astro` — self-contained use-case widget
  with DOM-local state.
- `src/components/ProbabilityBars.astro` — figure/caption style.
- NIST/FIPS pages for ML-KEM, ML-DSA, Falcon, SPHINCS+/SLH-DSA.
- Current IBM or comparable public roadmap source for marker label.
- `.planning/phases/05b-shor-pqc/PHASE-CONTEXT.md` D-19..D-23.

**Acceptance:**

- Widget updates estimate when key size or logical-qubits slider changes.
- Milestone markers render and do not imply exact break dates.
- All four PQC cards render inline with official links.
- Helper/component tests pass.
- Manual copy review: no unsupported timeline claims.
- `npm run build` passes.

---

### 05b-04 — `[5b-candidate]` Complete `/shor` essay + mirrors on same route

**Why:** This is the integration plan for ALG-07 + USE-04. It extends the
5a `/shor` scaffold rather than duplicating the route, connects QFT/period
finding to full Shor N=15, then closes with RSA/PQC action.

**Deliverables:**

- Update `src/pages/shor.astro`:
  - Preserve 5a QFT and PeriodFinding sections.
  - Replace the 5a continuation stub with full Shor N=15 explanation.
  - Embed the large static Shor circuit renderer from 05b-02.
  - Use locked framing: “You’ll build the engine here; now run the real
    thing in Qiskit.”
  - Embed `<RSACountdown />` and PQC cards.
  - Close with practical migration framing: inventory RSA usage, prefer
    NIST-standardized KEM/signature primitives, watch hybrid rollouts.
  - Footer-nav points back to `/grover` and forward to `/vqe` once Phase 6
    exists; until then follow current tail convention without breaking tests.
- Mirrors and source canonical lists:
  - If `/shor` node already landed in 5a, update only labels/descriptions if
    source canonical copy changed; mirror test changes in same commit.
  - `tests/essays/nav-graph.test.ts` remains contiguous.
  - `tests/essays/concept-map.test.ts` mirrors any concept-map copy/tier
    changes.
  - `tests/essays/sandbox-links.test.ts` still uses only a ≤4-qubit starter
    from 5a; add a comment that N=15 is intentionally excluded.
  - `bundle-budget.json` may get a placeholder bump for added widgets before
    05b-05 recompute.
- Do not add a new route (`/qft`, `/shor-pqc`, etc.).
- Do not alter the 4-qubit sandbox cap.

**read_first:**

- `src/pages/shor.astro` from 5a.
- `src/pages/grover.astro` if Phase 4 exists; otherwise latest nav-chain
  test state.
- `src/components/ConceptMap.astro` and all three essay mirror tests.
- `bundle-budget.json`.
- `src/lib/quantum/shor.ts`, large renderer, and `RSACountdown.astro` from
  previous plans.

**Acceptance:**

- `/shor` reads as a complete essay, not a scaffold.
- Shor N=15 is static and honest; no in-browser execution claim.
- Qiskit CTA is prominent and copies tested Shor text.
- RSACountdown/PQC section is sourced and hype-controlled.
- Mirror tests pass.
- `npm run build`, `npm run check:bundle`, and `npm test` pass.

---

### 05b-05 — `[5b-candidate]` Bundle, Lighthouse/a11y, and split close-out

**Why:** Phase 5b adds the densest static diagram and the RSA/PQC widget.
The final plan makes OPS-04 and accessibility explicit before Phase 6
builds on the completed `/shor` route.

**Deliverables:**

- Clean build and budget:
  - `npm run build`
  - `npm run check:bundle`
  - Recompute `/shor` ceiling as `ceil(actual_gzip_bytes × 1.2 / 1024) *
    1024` and update `bundle-budget.json`.
- Run `npm test` after budget recompute.
- Manual a11y/Lighthouse checklist for `/shor` in light and dark themes:
  - Keyboard reaches large-circuit copy button, RSACountdown controls, PQC
    links, and footer nav.
  - Focus visible on all controls.
  - Large circuit remains readable on mobile; any horizontal scroll region
    has a label/cue.
  - `aria-live` output is polite and not noisy.
  - External PQC links have discernible text.
- Record final split close-out notes in commit body:
  - Actual `/shor` gzipped JS size and ceiling.
  - Confirmation that simulator/sandbox cap remains 4 qubits.
  - Confirmation no new route was added.

**read_first:**

- `scripts/check-bundle-budget.mjs`.
- `bundle-budget.json`.
- `.planning/phases/05-shor/PLAN.md` 05-05 close-out precedent.
- Phase 1/2 close-out commit notes if available.

**Acceptance:**

- `npm run build` passes.
- `npm run check:bundle` passes with final `/shor` ceiling.
- `npm test` passes.
- Manual a11y notes recorded.
- `git diff` for close-out touches only expected budget/docs/source notes.

---

## Cross-plan verification

- After 05b-01: `npm test -- shor` and `npm test -- qiskit`.
- After 05b-02: component tests + `npm run build`.
- After 05b-03: RSA/PQC helper tests + `npm run build`.
- After 05b-04: mirror tests, `npm run check:bundle`, full `npm test`.
- After 05b-05: final `npm run build`, `npm run check:bundle`, `npm test`.
- Verify no code path raises `MAX_QUBITS` above 4 or lets N=15 into
  `encodeCircuit()`/sandbox starters.

## Artifacts this phase produces

- `src/lib/quantum/shor.ts`
- `tests/quantum/shor.test.ts`
- `src/components/LargeCircuitView.astro` or equivalent static renderer
- Static renderer component tests
- `src/components/RSACountdown.astro`
- Optional `src/components/PQCCards.astro`
- Optional `src/lib/quantum/rsaCountdown.ts`
- RSA/PQC helper/component tests
- Updated `src/pages/shor.astro`
- Mirror updates only as needed for the same `/shor` route
- Final `/shor` bundle budget recompute

## Frontmatter

```yaml
phase: 5b
phase_slug: 05b-shor-pqc
phase_title: "Shor — N=15 circuit + RSACountdown + PQC"
split_from: "Phase 5: Shor + QFT + PQC threat"
requirements: [ALG-07, USE-04, OPS-04]
plans:
  - id: 05b-01
    title: "buildShor15 static model + Qiskit snapshots"
    wave: 1
    depends_on: []
    autonomous: true
    requirements: [ALG-07]
    files_modified:
      - src/lib/quantum/shor.ts
      - src/lib/quantum/index.ts
      - tests/quantum/shor.test.ts
  - id: 05b-02
    title: "Large static circuit renderer + /shor Qiskit CTA"
    wave: 2
    depends_on: [05b-01]
    autonomous: true
    requirements: [ALG-07]
    files_modified:
      - src/components/LargeCircuitView.astro
      - tests/components/large-circuit-view.test.ts
      - tests/components/circuit-view.test.ts
  - id: 05b-03
    title: "RSACountdown widget + sourced NIST PQC cards"
    wave: 2
    depends_on: []
    autonomous: true
    requirements: [USE-04]
    files_modified:
      - src/components/RSACountdown.astro
      - src/components/PQCCards.astro
      - src/lib/quantum/rsaCountdown.ts
      - tests/components/rsa-countdown.test.ts
  - id: 05b-04
    title: "Complete /shor essay + mirrors on same route"
    wave: 3
    depends_on: [05b-02, 05b-03]
    autonomous: true
    requirements: [ALG-07, USE-04, OPS-04]
    files_modified:
      - src/pages/shor.astro
      - src/components/ConceptMap.astro
      - tests/essays/nav-graph.test.ts
      - tests/essays/concept-map.test.ts
      - tests/essays/sandbox-links.test.ts
      - bundle-budget.json
  - id: 05b-05
    title: "Bundle, Lighthouse/a11y, and split close-out"
    wave: 4
    depends_on: [05b-04]
    autonomous: false
    requirements: [OPS-04]
    files_modified:
      - bundle-budget.json
```
