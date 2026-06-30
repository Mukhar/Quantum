# Phase 3: Superdense + Holevo Bound - Context

**Gathered:** 2026-06-30T06:47:31+05:30  
**Status:** Ready for planning  
**Mode:** Autonomous smart-discuss run spawned by `/gsd-autonomous`; user AFK. Earlier attempt failed silently, so this file was written from scratch. All grey areas below are locked from the AFK decisions file plus explicit Phase-3 instructions; do not re-ask.

<domain>
## Phase Boundary

Phase 3 ships `/superdense-coding`, completing v3's communication arc after Teleportation. The essay should make the mirror-image relationship obvious: teleportation sends one unknown quantum state using two classical bits plus shared entanglement; superdense coding sends two classical bits using one transmitted qubit plus shared entanglement.

The phase has two halves, both widget-driven:

1. **Algorithm half (`ALG-03`)** — an `EncodingTable` widget lets the reader click one of four 2-bit messages (`00`, `01`, `10`, `11`). The selected row applies Alice's corresponding Pauli encoding (`I`, `X`, `Z`, `XZ`) to her half of an existing Bell pair, then shows Bob's Bell-basis measurement outcome.
2. **Use-case half (`USE-02`)** — a `HolevoBound` widget visualizes why this is a 2× communication advantage, not unlimited bandwidth. The locked interaction is one slider over `n_qubits` from `1` to `4`; readout shows superdense max classical bits `= 2n` with the Holevo bound line annotated.
3. **Shared protocol walkthrough** — reuse `ProtocolStepper` from Phase 2 for a small “Alice prepares → encodes → sends → Bob Bell-measures” walkthrough. This is separate from `EncodingTable`; the table is the lookup/interaction surface, the stepper is the narrative scaffold.
4. **Bloch-state visualization** — reuse `MultiBlochPanel` from Phase 2 with `qubits={2}`. It should show Alice's and Bob's halves of the Bell pair and animate/post-measurement states clearly enough that readers see the protocol is reversible up to the Bell-basis readout.
5. **Qiskit / sandbox bridge** — include a `CircuitView` for the superdense encoding path with the Phase-1 “Copy as Qiskit” button inherited for free. Add a sandbox starter “Build a Bell pair + encode 11” and mirror it in `tests/essays/sandbox-links.test.ts`.
6. **Route integration** — update concept map, nav graph, sandbox-link mirror, route bundle budget, and any homepage/sitemap canonical list in the same commit as the essay frontmatter.
7. **Close-out gates** — keep `/superdense-coding` under the OPS-04 route bundle ceiling and verify Lighthouse mobile a11y ≥ 95 in both themes.

Out of scope:

- No new simulator qubit limit. The 4-qubit cap remains hard-locked; this essay only needs 2 qubits.
- No analytics, no remote telemetry, no progress tracking changes. Phase 6 owns progress indicators.
- No new runtime dependencies, charting libraries, or frontend framework imports.
- No side-by-side Holevo widget or second slider. The user explicitly locked a single `n_qubits` slider.
- No new `Op` kinds for Bell measurement or controlled Pauli encoding unless planning proves all existing gate vocabulary fails. Existing `I/X/Z/H/CNOT/M` gates are enough.
- No full quantum-network treatment; Phase 2 already owns networks. Phase 3 references entanglement as a resource and moves on.

</domain>

<decisions>
## Implementation Decisions

### D-01 — HolevoBound interaction is a single `n_qubits` slider

**Decision:** Implement `HolevoBound` with one slider over discrete `n_qubits = 1..4`. The primary readout is `max classical bits with superdense coding = 2n`.

**Rationale:** This is locked in `autonomous-decisions.md`. It prevents the widget from becoming a two-variable comparison tool and keeps the use-case half focused: superdense coding doubles capacity when entanglement is pre-shared; it does not create arbitrary bandwidth.

**Locked behavior:**

- Slider labels: `1`, `2`, `3`, `4` qubits.
- Readout examples: `1 qubit sent → up to 2 classical bits`, `4 qubits sent → up to 8 classical bits`.
- Use semantic labels and `aria-live="polite"` for readout changes.
- No analytics or persistence; local component state only.

### D-02 — HolevoBound chart shows two lines: `2n` and `n`

**Decision:** Render a simple inline SVG line chart with x = `n_qubits` (`1..4`) and y = classical bits. Show an annotated superdense line `2n` and an annotated Holevo/no-entanglement line `n`.

**Rationale:** The user's lock says “output shows max classical bits = 2n with the Holevo bound line annotated.” The extra reference line makes the idea precise: without pre-shared entanglement, Holevo says `n` qubits carry at most `n` accessible classical bits; superdense consumes prior entanglement to double the one-qubit transmission payoff once. This is the clearest way to teach “2× ceiling, not exponential bandwidth.”

**Locked behavior:**

- Use hand-written SVG; no chart library.
- Show the selected `n` with a highlighted vertical marker/dot on both lines.
- Include a short caption explaining that the entanglement resource is spent/pre-shared; the sent qubits alone are not carrying unlimited information.
- Keep y-axis max at `8` for `n=4`; no extrapolated drama beyond the simulator/site cap.
- Honor reduced motion; the selected marker can snap or lightly transition but must not rely on animation for meaning.

### D-03 — EncodingTable is a static four-row table with selected-row interaction

**Decision:** `EncodingTable` renders the four canonical rows up front:

| Bits | Alice gate | Bob's Bell outcome |
|---|---|---|
| `00` | `I` | `|Φ+⟩` |
| `01` | `X` | `|Ψ+⟩` |
| `10` | `Z` | `|Φ−⟩` |
| `11` | `XZ` | `|Ψ−⟩` |

Clicking a row makes it active, replays the corresponding encoding circuit in the shared store, and updates the Bell-measurement readout.

**Rationale:** Explicit table layout is clearer than a stepper for message selection. It teaches the lookup table in one glance while still giving the reader an interaction to prove the mapping.

**Locked behavior:**

- The table must remain visible; do not hide non-selected rows behind tabs.
- Each row is keyboard-selectable (`button` inside row or row with button semantics), focus-visible, and uses `aria-pressed`/`aria-selected` consistently.
- The active row drives the circuit/store state; it should also update a textual readout such as `Bob reads 11 from |Ψ−⟩`.
- Use `I` as an explicit no-op gate for `00` in the display and circuit builder, since `DISCRETE_GATES` already includes `I` and Qiskit maps it to `id`.

### D-04 — Keep EncodingTable and ProtocolStepper separate

**Decision:** Reuse `ProtocolStepper` for a dedicated four-step walkthrough: “Share Bell pair → Alice encodes → Alice sends one qubit → Bob Bell-measures.” Do not fold those steps into `EncodingTable`.

**Rationale:** `ProtocolStepper` is the Phase-2 pattern ROADMAP explicitly says Phase 3 should reuse. But the table and the stepper answer different questions: the table maps messages to gates/outcomes, while the stepper narrates the communication protocol. Keeping them separate avoids one bloated widget.

**Locked behavior:**

- `ProtocolStepper` instance uses `qubits={2}` and a stable `storeKey` shared with `MultiBlochPanel`.
- Steps are small and finite; no loop/iteration semantics.
- The stepper can default to the selected message from `EncodingTable`, or use a fixed pedagogical default (`11`) if cross-widget selection wiring would add too much JS. Planning should prefer shared state only if it remains small and robust.
- Step descriptions explicitly name which qubit travels: Alice sends her half of the entangled pair after encoding; Bob already holds the other half.

### D-05 — Bell-basis measurement visualization animates to basis states post-measurement

**Decision:** Show Bob's Bell-basis measurement as a visible basis rotation (`CNOT` + `H`) followed by classical two-bit outcome. Animate/post the two qubits to computational-basis states after measurement/readout, reusing `MultiBlochPanel` to show the individual reduced states.

**Rationale:** The prompt locks this choice. It proves reversibility: Bob can turn the four Bell states back into four computational-basis outcomes. It also ties the moment back to Phase 2's mixed-state-honest Bloch panel instead of treating measurement as a magic label.

**Locked behavior:**

- Bell decoding circuit: after Alice's encoding, Bob applies `CNOT(q0 → q1)` and `H(q0)` (with the chosen qubit convention documented in code/tests), then measures/readouts the computational basis.
- The UI may display the Bell label before decode and the two-bit readout after decode.
- If actual `measureOp` collapse would introduce non-determinism in the widget, prefer deterministic unitary decode plus textual readout/probability assertion. Tests can cover the exact deterministic basis outcome.
- Keep copy honest: the table names Bell-basis outcomes; the circuit shows the basis rotation that lets Bob read them.

### D-06 — Superdense circuit helper lives in `src/lib/quantum/superdense.ts`

**Decision:** Add a testable quantum helper module rather than embedding circuit literals in the essay. Candidate exports:

```ts
export type SuperdenseBits = "00" | "01" | "10" | "11";
export interface SuperdenseEncoding {
  bits: SuperdenseBits;
  label: string;
  gates: Op[];
  bell: "Φ+" | "Ψ+" | "Φ−" | "Ψ−";
}
export const SUPERDENSE_ENCODINGS: readonly SuperdenseEncoding[];
export function superdenseCircuit(bits?: SuperdenseBits): Circuit;
export function superdenseSteps(bits?: SuperdenseBits): ProtocolStep[];
export function bellDecodeOps(): Op[];
```

**Rationale:** Phase 2's `teleportation.ts` established the right pattern: centralize algorithm circuits/steps in `src/lib/quantum/`, export through the barrel, and let pages/tests/components import the same source of truth.

**Locked behavior:**

- Default bits should be `"11"`, matching the sandbox starter and giving the visually richest row (`X` + `Z`, `|Ψ−⟩`).
- The helper must document qubit roles and ordering. Recommended convention: `q0 = Alice/sent qubit`, `q1 = Bob's retained qubit`, Bell pair prepared by `H(q0); CNOT(q0, q1)`.
- Circuit steps must satisfy `validateCircuit`'s disjoint-qubit-per-step rule. Sequential `X` then `Z` for `XZ` must be separate columns.
- Export helpers through `src/lib/quantum/index.ts` if consumed by pages/tests.

### D-07 — Gate mapping for superdense messages follows the prompt's canonical order

**Decision:** Use the explicit mapping from the prompt: `00 → I → |Φ+⟩`, `01 → X → |Ψ+⟩`, `10 → Z → |Φ−⟩`, `11 → XZ → |Ψ−⟩`.

**Rationale:** Different textbooks sometimes swap bit labels depending on whether they describe `Z^a X^b` or `X^b Z^a`. The prompt is authoritative for this phase. Matching it avoids a surprise in the user-facing `EncodingTable` and tests.

**Locked behavior:**

- Apply `XZ` as `X` then `Z` in code unless tests/documentation intentionally choose the equivalent global-phase order. Since `ZX = -XZ`, either is physically equivalent, but the label must remain `XZ` as requested.
- Tests should compare probabilities/readout, not raw state-vector global phase.
- Essay copy should say global phase does not affect Bob's decoded bits if the sign appears in math notes.

### D-08 — Sandbox starter is “Build a Bell pair + encode 11”

**Decision:** Add a starter circuit for `/superdense-coding` that prepares a Bell pair and encodes `11` using `X` then `Z` on Alice's qubit.

**Rationale:** This was explicitly selected in the prompt and aligns with v3's sandbox-link discipline. It gives readers a remixable minimal circuit while keeping inside the 2-qubit/4-qubit cap.

**Locked behavior:**

- Starter should be sourced from `superdenseCircuit("11")` if that helper includes Bell prep, encoding, and optionally Bob decode. If the essay needs a shorter “encode only” starter, tests and copy must name the difference clearly.
- Mirror the starter in `tests/essays/sandbox-links.test.ts` in the same commit as the essay.
- Ensure `encodeCircuit` fragment length remains comfortably below the documented 2 KB cap.

### D-09 — CircuitView ships with Qiskit export by inheritance

**Decision:** Use existing `CircuitView.astro` for the superdense encoding/decode circuit; do not build a special export button.

**Rationale:** Phase 1 made `CircuitView` the per-essay Qiskit bridge. For a 2-qubit circuit using only `I/X/Z/H/CNOT/M`, the current codec and `toQiskit` path are sufficient.

**Locked behavior:**

- If `CircuitView` includes measurement steps, `toQiskit` maps them to `qc.measure(q, q)` correctly.
- The essay should label the diagram as a superdense encode/decode circuit and mention the Qiskit button as the “run/remix for real” bridge only briefly; Shor is the phase where Qiskit becomes the main story.
- No changes to `qiskit.ts`, `codec.ts`, `Circuit`, or supported gate vocabulary should be needed.

### D-10 — Mirrors, nav chain, and route budget update with the essay

**Decision:** Treat mirrors and OPS-04 as same-commit deliverables, following Phase 2.

**Rationale:** `STATE.md` and the AFK decision file lock same-commit mirror discipline. The tests intentionally duplicate canonical lists so CI catches drift.

**Locked behavior:**

- Insert `/superdense-coding` into the reading chain after `/teleportation` and before `/sandbox` at Phase 3 landing time.
- Update `src/components/ConceptMap.astro` and `tests/essays/concept-map.test.ts` with a `Superdense` or `Superdense Coding` primary node.
- Update `tests/essays/nav-graph.test.ts`: `teleportation.next = "/superdense-coding"`; add `{ slug: "superdense-coding", prev: "/teleportation", next: "/sandbox" }` until Phase 4 inserts `/grover` after it.
- Update `tests/essays/sandbox-links.test.ts` with the superdense starter.
- Add `/superdense-coding` to `bundle-budget.json` with a conservative placeholder, then recompute close-out as `round_up(actual × 1.2, 1024)`.
- Update homepage/sitemap route lists if they are canonical in the current codebase.

### D-11 — Component split stays small and dependency-free

**Decision:** Expected new components are `EncodingTable.astro` and `HolevoBound.astro` (or `HolevoBoundViz.astro` if planner prefers the design-doc name). Keep each as server-rendered shell plus a tiny inline script if needed.

**Rationale:** The phase should be one of the tightest v3 phases. Phase 2 already shipped the shared heavy-lifting components; Phase 3 should mostly compose them.

**Locked behavior:**

- No charting library for Holevo; no component framework.
- Use in-repo `signal<T>` / existing store only when widgets need to coordinate quantum state. Pure chart controls can use DOM-local state.
- Use semantic theme classes/CSS vars already present in widgets (`border-line`, `bg-surface-elevated/40`, `text-ink-subtle`, `text-accent-emphasis`, etc.).
- Prefer extracting pure mapping/format helpers if component tests need direct imports; otherwise keep scripts inline to minimize files.

### D-12 — Tests must prove the protocol mapping, not just render widgets

**Decision:** Add quantum correctness tests for `superdense.ts` plus component/formula tests where cheap.

**Rationale:** v1/v2/v3 trust comes from inspectable math. `ALG-03` is simple enough that exact known-output tests should be mandatory.

**Locked behavior:**

- `tests/quantum/superdense.test.ts` should assert all four bit strings decode to the expected computational-basis outcome after Bell decode.
- Assert the Bell label mapping from `SUPERDENSE_ENCODINGS` exactly matches the prompt table.
- Assert `superdenseCircuit("11")` validates and round-trips through `encodeCircuit`/`decodeCircuit` if used as starter.
- Optional but recommended: test `HolevoBound` formula helper for `n=1..4` (`holevo=n`, `superdense=2n`) if the logic is extracted.
- Existing mirror tests must pass after updates.

### D-13 — Accessibility and mobile are phase requirements, not polish

**Decision:** Design `EncodingTable`, `ProtocolStepper` placement, `MultiBlochPanel`, and `HolevoBound` with mobile a11y ≥ 95 from the start.

**Rationale:** ROADMAP requires Lighthouse mobile a11y ≥ 95 in both themes. The widgets are mostly form controls/table/SVG, so failures are avoidable if labels/focus/contrast are planned up front.

**Locked behavior:**

- `EncodingTable`: semantic table or list with real buttons; no click-only rows.
- `HolevoBound`: associated `<label>` for the slider, value readout with `aria-live`, SVG with `role="img"` and a concise `aria-label`/description.
- `ProtocolStepper`: inherited keyboard and `aria-live` behavior from Phase 2; verify works with 2-qubit steps.
- `MultiBlochPanel`: captions for both qubits (`q0 — Alice sends`, `q1 — Bob keeps`) so mobile stacked layout remains understandable.
- Respect `prefers-reduced-motion`; transitions must not be the only way state changes are communicated.

### D-14 — Agent discretion

The planner/executor may decide:

- Exact component name: `HolevoBound.astro` vs `HolevoBoundViz.astro`, as long as the essay/imports/tests use one consistently.
- Whether `EncodingTable` directly mutates the shared quantum store or delegates to a small helper imported from `superdense.ts` / `protocolStepper.ts`.
- Whether the ProtocolStepper uses the currently selected table row or a fixed `11` default. Prefer row-linked state if the implementation remains tiny; otherwise keep it fixed and explain the selected row in the table.
- Exact concept-map coordinates and label text, provided the map stays legible and the mirror test matches.
- Exact placeholder bundle ceiling. Use Phase 2's 12 KB as a reference ceiling; this phase should likely fit at or below it because it reuses shared components and adds only small inline scripts.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Planning / locked decisions

- `.planning/STATE.md` — current v3 status, Phase 3 in progress, hard guardrails: vanilla TS, no analytics, 4-qubit cap, same-commit mirrors, OPS-04 route budgets, mixed-state honesty.
- `.planning/ROADMAP.md` § “Phase 3: Superdense + Holevo bound” — authoritative goal, dependencies, success criteria, Phase 2 reuse requirement.
- `.planning/REQUIREMENTS.md` — `ALG-03` (`EncodingTable` click 2-bit input → gate → Bell-basis outcome), `USE-02` (`HolevoBound` maps qubits to classical bits / 2× ceiling), `OPS-04` route budget.
- `docs/plans/2026-06-29-v3-design.md` §3.4 — file sketch and pedagogical arc: mirror of teleportation; one transmitted qubit + shared entanglement; Holevo bound reality check.
- `/Users/m0j0f4p/.copilot/session-state/bc64e80e-b224-4be7-8a25-f50b54e81279/files/autonomous-decisions.md` — locked AFK decisions; especially the single `n_qubits` Holevo slider and cross-cutting guardrails.
- `.planning/phases/02-teleportation/PHASE-CONTEXT.md` and `PLAN.md` — shared-widget, mirror, bundle, and helper-module patterns; `ProtocolStepper` and `MultiBlochPanel` were built for Phase 3 reuse.
- `.planning/phases/04-grover/PHASE-CONTEXT.md` and `.planning/phases/05-shor/PHASE-CONTEXT.md` — current smart-discuss shape/depth exemplars for autonomous AFK decisions and code-context specificity.

### Quantum core / export constraints

- `src/lib/quantum/circuit.ts` — `Circuit`, `Op`, `MAX_QUBITS = 4`, `validateCircuit`, `gateOp`, `cnotOp`, `measureOp`; existing gate vocabulary is enough for superdense.
- `src/lib/quantum/teleportation.ts` — model for an algorithm helper exporting protocol steps and canonical circuits; also exports `ProtocolStep` used by `ProtocolStepper`.
- `src/lib/quantum/protocolStepper.ts` — replay helper used by `ProtocolStepper` to reset/apply steps through the store.
- `src/lib/quantum/codec.ts` — starter circuits must encode/decode through the URL fragment codec; qubits are capped to 4 and steps to 64.
- `src/lib/quantum/qiskit.ts` — current Qiskit mappings include `I`, `X`, `Z`, `H`, `CNOT`, `measure`; superdense should not require exporter changes.
- `src/lib/quantum/index.ts` — public barrel; export `superdense` helpers here if pages/tests import through the canonical API.

### Components / route integration

- `src/components/ProtocolStepper.astro` — reuse directly for “share → encode → send → measure”; existing API is `storeKey`, `qubits`, `steps`, `initialStep`, `caption`.
- `src/components/MultiBlochPanel.astro` — reuse directly with `qubits={2}`; generic from Phase 2 and already composes `MiniBloch` correctly.
- `src/components/CircuitView.astro` — static SVG circuit diagram + baked Qiskit text; use for the superdense circuit.
- `src/components/SandboxLink.astro` — build-time deep link for starter circuit; use for “Build a Bell pair + encode 11”.
- `src/components/ProbabilityBars.astro` — useful pattern for tiny inline SVG chart updates and `aria-live`; Holevo can mirror the no-library style.
- `src/layouts/EssayLayout.astro` and `src/pages/teleportation.astro` — current v3 essay shell and footer-nav style.
- `src/components/ConceptMap.astro` — canonical concept-map nodes/edges; add Superdense node and edge.
- `bundle-budget.json` and `scripts/check-bundle-budget.mjs` — route budget entry and recompute protocol.

### Tests / mirrors

- `tests/essays/nav-graph.test.ts` — reading chain mirror; insert `/superdense-coding` after `/teleportation`.
- `tests/essays/concept-map.test.ts` — concept-map node mirror; append Superdense node.
- `tests/essays/sandbox-links.test.ts` — starter circuit mirror; add superdense starter and keep round-trip assertions green.
- `tests/quantum/teleportation.test.ts` — model for deterministic protocol correctness tests.
- `tests/quantum/qiskit.test.ts` — confirms exporter drift coverage; should remain untouched unless a new gate is added, which is not expected.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `ProtocolStepper.astro` already mounts every `[data-widget="protocol-stepper"]`, parses serialized `ProtocolStep[]`, calls `ensureStore(storeKey, { qubits })`, and replays steps by resetting then applying ops through `replayProtocol`. Phase 3 can feed it `superdenseSteps("11")` or a selected-message variant without modifying the component.
- `MultiBlochPanel.astro` is intentionally generic: `qubits` controls the number of `MiniBloch` children and switches to two columns for `qubits === 2`. This matches superdense exactly.
- `CircuitView.astro` encodes the circuit for remix links and calls `toQiskit` at build time. Broken starter/export circuits fail the build early, which is desired.
- `codec.ts` and `qiskit.ts` both support all operations needed by the canonical superdense circuit. Avoiding new ops preserves QSK-03 and OPS-04 stability.
- `teleportation.ts` demonstrates the preferred helper style: typed options, canonical circuit function, protocol steps, validation of qubit roles, and extensive comments for downstream readers.
- `sandbox-links.test.ts` currently imports `teleportationCircuit()` from the public barrel rather than duplicating the literal. Superdense should do the same if `superdenseCircuit("11")` is the starter source.

### Established Patterns

- Vanilla Astro components with tiny inline scripts; no framework hydration islands.
- Quantum widgets coordinate through `ensureStore` and `ProtocolStep` when they represent simulator state; use-case widgets are self-contained local controls.
- Essay pages use `EssayLayout`, embed `CircuitView`, and include footer-nav links directly in markup. Nav tests grep raw `.astro` files, so exact `href` strings matter.
- Mirror tests intentionally duplicate canonical source arrays because importing `.astro` files into Vitest is not worth the complexity.
- Route bundle ceilings are explicit and enforced by tests/build; add placeholder early and recompute after clean build.
- Qubit 0 is LSB throughout the simulator and Qiskit export. Superdense copy/tests must not silently switch conventions.

### Integration Points

- New `src/lib/quantum/superdense.ts` for mappings, circuit builder, Bell decode ops, and protocol steps.
- New `tests/quantum/superdense.test.ts` for mapping/circuit correctness.
- New `src/components/EncodingTable.astro` with selected-row interaction and shared-store update.
- New `src/components/HolevoBound.astro` (or `HolevoBoundViz.astro`) with slider + SVG chart.
- New `src/pages/superdense-coding.astro` using `MultiBlochPanel`, `ProtocolStepper`, `EncodingTable`, `HolevoBound`, `CircuitView`, and `SandboxLink`.
- Updates to `src/lib/quantum/index.ts`, `src/components/ConceptMap.astro`, `tests/essays/*`, `bundle-budget.json`, and route lists.

### Integration Risks

- **Bit-order ambiguity:** `00/01/10/11` labels can drift from simulator basis indexes if qubit roles are not documented. Tests must assert final decoded bit string against the prompt table.
- **Bell-state sign/global phase:** `XZ` vs `ZX` differs by global phase. Tests should compare decoded probabilities/readout, not raw amplitudes without phase normalization.
- **Cross-widget state coupling:** Linking `EncodingTable` selection to `ProtocolStepper` could add brittle DOM coordination. Planner should keep coupling minimal and prefer pure helpers.
- **Holevo wording:** “2n bits” can be misread as violating Holevo. Copy must state the pre-shared entanglement resource and the `n` line clearly.
- **Bundle creep from duplicated scripts:** Reusing Phase 2 components is desired, but avoid copying large store/hydrator logic into `EncodingTable` if `replayProtocol` can be reused.

</code_context>

<specifics>
## Specific Ideas

- Open the essay by explicitly calling superdense coding “teleportation's mirror image.” Teleportation: one qubit state moved with two classical bits. Superdense: two classical bits moved with one qubit, because the entangled pair was already shared.
- Use `11` as the default active row. It exercises both Pauli gates and lands on `|Ψ−⟩`, giving the richest visual/mathematical example.
- The table should include a small “what Alice does” column and a “what Bob sees” column; the active row can show a compact animated gate chip (`X`, then `Z`) over Alice's qubit.
- The `MultiBlochPanel` captions should be concrete: `q0 — Alice sends` and `q1 — Bob keeps`. The reader should never wonder which physical qubit crosses the channel.
- In the Bell decode section, show the circuit equation in prose: Bell-state analyzer = `CNOT(q0 → q1)` then `H(q0)` then read `q0q1`.
- The `HolevoBound` chart should include a callout: “The extra bit came from the shared Bell pair, not from squeezing infinite data into one qubit.”
- The sandbox starter CTA can read: “Open the `11` encoding in the sandbox →” and should sit near the algorithm-half circuit, not buried after the Holevo section.
- The use-case reality check should be short and grounded: superdense is a bandwidth primitive in a world where entanglement distribution is already solved; distributing and preserving entanglement is the hard part.
- Footer nav when Phase 3 lands: previous `/teleportation`, next `/sandbox` until Phase 4 inserts `/grover`.
- Bundle expectation: this should be lighter than Teleportation because `ProtocolStepper` and `MultiBlochPanel` are reused; the new JS is table selection + slider chart only.

</specifics>

<deferred>
## Deferred Ideas

- **Two-slider Holevo explorer (`n_qubits` vs pre-shared Bell pairs)** — explicitly deferred. The user locked one slider; a resource-accounting simulator would distract from the core 2× ceiling.
- **Side-by-side “without entanglement / with entanglement” interactive circuits** — deferred. The chart's `n` vs `2n` lines provide the comparison with less UI weight.
- **Full density-matrix Bell-state visualizer** — not needed. `MultiBlochPanel` plus Bell-label/readout is sufficient for Phase 3; richer entanglement-state visualization can be v4.
- **Noisy channel / entanglement distribution cost model** — out of scope. Mention qualitatively only; Phase 2 covered networks and Phase 6 owns launch/polish.
- **General Bell-basis measurement component** — build only if it naturally falls out of `EncodingTable`; otherwise keep Bell decode logic in `superdense.ts`. A generalized component can wait for a future essay.
- **Simulator IR support for Bell measurement as a first-class op** — defer. Existing `CNOT + H + measure` is clearer and compatible with Qiskit/codec today.
- **Track-grouped concept map** — Phase 6 audit per locked decisions. Phase 3 only adds its node cleanly.
- **Playwright visual regression for the new widgets** — still deferred unless the repo already has such a harness; unit/mirror/build/Lighthouse are the phase gates.

</deferred>

---

*Phase: 03-superdense*  
*Context gathered: 2026-06-30 — autonomous smart-discuss run with AFK grey-area decisions locked and documented from scratch.*
