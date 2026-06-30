# Phase 3 Research - Superdense + Holevo bound

## Scope locks

- **Roadmap is the source of truth.** Phase 3 is:
  - title: **Superdense + Holevo bound**
  - route: **`/superdense-coding`**
  - requirements: **`ALG-03`**, **`USE-02`**
- The design doc still says `superdense.astro` / `/superdense`; do **not**
  follow that older name. Use the roadmap slug:
  **`src/pages/superdense-coding.astro`**.
- This phase depends on Phase 2 patterns being reusable:
  **`ProtocolStepper`**, **`MultiBlochPanel`**, `CircuitView` Qiskit export,
  mirror-update discipline, and per-route bundle budgets.
- Keep the simulator cap at **4 qubits**. Phase 3 needs only **2 qubits**.

## Existing code and patterns to reuse

### Shared essay / widget infrastructure

- `src/pages/teleportation.astro`
  - best live reference for the v3 essay shape:
    opener -> algorithm widget(s) -> circuit/Qiskit/sandbox bridge ->
    use-case widget -> self-test / math appendix / footer-nav.
  - already composes `MultiBlochPanel`, `ProtocolStepper`, `CircuitView`,
    and `SandboxLink` around one shared store key.
- `src/components/ProtocolStepper.astro`
  - already generic, store-driven, and explicitly documented as reusable
    for Phase 3.
  - expects `ProtocolStep[]` with `{ label, description?, apply: Op[] }`.
  - replays from step 0 on every transition, so phase-state drift is not
    a risk.
- `src/components/MultiBlochPanel.astro`
  - already generic for `qubits={2}`.
  - no new client code needed if the superdense page uses a 2-qubit store.
- `src/components/CircuitView.astro`
  - Phase 1 already added "Copy as Qiskit".
  - best fit for showing the canonical 2-qubit superdense circuit.
- `src/components/SandboxLink.astro`
  - use a <= 4-qubit canonical starter circuit, same as other essays.

### Quantum / protocol helpers

- `src/lib/quantum/teleportation.ts`
  - strong precedent for centralizing:
    - canonical circuit builder
    - canonical `ProtocolStep[]`
    - protocol-specific comments and qubit-role conventions
  - also exports the `ProtocolStep` type consumed by `ProtocolStepper`.
- `src/lib/quantum/protocolStepper.ts`
  - shared replay helper for store-backed protocol widgets.
- `src/pages/cnot-bell.astro`
  - existing Bell-basis teaching reference in prose.
- `src/pages/entanglement.astro`
  - good prose references for the communication-arc handoff.

### Mirror / route integration files

- `src/components/ConceptMap.astro`
  - current tail is `/teleportation`.
  - Phase 3 should insert `/superdense-coding` after `/teleportation`.
- `tests/essays/nav-graph.test.ts`
  - current chain ends `... /deutsch -> /teleportation -> /sandbox`.
  - Phase 3 should update to
    `... /deutsch -> /teleportation -> /superdense-coding -> /sandbox`.
- `tests/essays/sandbox-links.test.ts`
  - mirrors each essay's starter circuit; must be updated in the same
    commit as the essay route.
- `bundle-budget.json`
  - `/teleportation` currently has a 2048-byte ceiling.
  - `/superdense-coding` should get an initial conservative placeholder,
    then a clean-build recompute close-out plan.

## Recommended implementation shape

### 1. Add a dedicated `superdense` quantum module

Recommended file: `src/lib/quantum/superdense.ts`

It should mirror the teleportation module pattern and become the canonical
home for:

- qubit-role convention:
  - `q0` = Alice's qubit (encoded and then sent)
  - `q1` = Bob's Bell-pair half
- bit-to-gate mapping:
  - `00 -> I`
  - `01 -> X`
  - `10 -> Z`
  - `11 -> XZ`
- a canonical circuit builder for the full protocol:
  - Bell-pair prep
  - Alice encoding gate(s)
  - Bob decode block (`CNOT(q0 -> q1)`, `H(q0)`)
  - optional measurement ops for `CircuitView` / sandbox starter
- a canonical `ProtocolStep[]` builder for the algorithm widget
- helpers that expose the decoded classical outcome deterministically for
  tests and the UI

Why a module is needed even though this is only 2 qubits:

- the essay, `ProtocolStepper`, tests, `CircuitView`, and sandbox starter
  all need one source of truth;
- it prevents route/widget drift like "essay says XZ but starter uses ZX";
- it keeps Bell-basis decode math out of the page component.

### 2. Reuse `ProtocolStepper` and `MultiBlochPanel` directly

No Phase 3-specific protocol-stepper component appears necessary.

Likely page composition:

- `MultiBlochPanel` with `qubits={2}`
- `ProtocolStepper` bound to the same store key
- new `EncodingTable` control for choosing `00/01/10/11`

The simplest robust UX is:

- `EncodingTable` owns the selected 2-bit message and its decode readout
- `ProtocolStepper` remains a separate narrative scaffold for the protocol
- `MultiBlochPanel` can be shared with the stepper's store directly
- if row-linked stepper state adds too much JS, keep the stepper on the
  locked pedagogical default of `11`

This keeps the algorithm half aligned with the teleportation interaction
model instead of inventing a second bespoke protocol player.

### 3. Add a lightweight `HolevoBound` widget

Recommended file: `src/components/HolevoBound.astro`

This looks mostly formula-driven, not simulator-driven.

Recommended behavior:

- a single slider for `n_qubits`
- display:
  - plain channel ceiling: `n` classical bits
  - superdense ceiling with pre-shared entanglement: `2n` classical bits
- shape: hand-written inline SVG line chart with both `n` and `2n` lines
  plus a selected-marker highlight
- visually emphasize:
  - the gain is **2x**, not unbounded
  - entanglement is a precondition, not free bandwidth
- locked range: `1..4`
- keep the y-axis/readout capped at `8` bits
- include examples like:
  - `1 qubit -> at most 2 classical bits`
  - `4 qubits -> at most 8 classical bits`

This should remain self-contained and cheap in bundle cost.

## Likely files to touch

Core new files:

- `src/lib/quantum/superdense.ts`
- `tests/quantum/superdense.test.ts`
- `src/components/EncodingTable.astro`
- `src/components/HolevoBound.astro`
- `src/pages/superdense-coding.astro`

Likely existing files to update:

- `src/lib/quantum/index.ts`
- `src/components/ConceptMap.astro`
- `src/pages/sitemap.xml.ts`
- `tests/essays/nav-graph.test.ts`
- `tests/essays/concept-map.test.ts`
- `tests/essays/sandbox-links.test.ts`
- `bundle-budget.json`
- previous tail essay footer-nav (`src/pages/teleportation.astro`)

Possible small helper/test files if the repo pattern supports them:

- `tests/components/encoding-table.test.ts`
- `tests/components/holevo-bound.test.ts`

## Constraints and risks

### Locked constraints

- no new runtime dependencies
- keep Astro + vanilla TS patterns
- keep simulator / circuit / codec conventions intact unless absolutely
  necessary
- keep same-commit mirror discipline
- maintain Qiskit-export bridge via `CircuitView`

### Main risks

1. **Route-name drift**
   - Risk: using `/superdense` because the design doc says so.
   - Resolution: use `/superdense-coding` everywhere new.

2. **Bit/gate ambiguity for `11`**
   - `XZ` and `ZX` differ by global phase only.
   - Roadmap explicitly says `I/X/Z/XZ`, so the implementation and prose
     should use **`XZ`** literally for consistency.

3. **Measurement / decode presentation**
   - The roadmap wants Bob's Bell-basis measurement shown.
   - Best fit is to keep the live protocol unitary through decode, then
     render the deterministic decoded bit pair from the final basis state /
     probabilities instead of introducing mid-widget collapse logic.

4. **Widget coordination complexity**
   - If `EncodingTable` and `ProtocolStepper` each try to own protocol
     state separately, they can drift.
   - Recommended resolution: `superdense.ts` is the only source of truth;
     page-level active bits choose which canonical steps/circuit to hand
     down.

5. **Bundle creep**
   - Phase 3 adds a second interactive essay route plus two widgets.
   - Mitigation: keep `HolevoBound` formula-only and keep `EncodingTable`
     hydration minimal.

## Recommended plan decomposition

Candidate work items:

1. **`quantum/superdense` module + correctness tests**
   - mapping `00/01/10/11` to `I/X/Z/XZ`
   - canonical circuit + canonical steps
   - decode / measurement outcome helpers

2. **`EncodingTable` widget**
   - 2-bit selector
   - row selection replays the selected protocol into the shared quantum
     store used by `MultiBlochPanel`
   - decode result on Bob's side
   - optional light coordination with the page-level stepper, but not a hard
     dependency

3. **`HolevoBound` widget**
   - qubits-sent slider
   - `n` vs `2n` ceiling visualization / copy

4. **`/superdense-coding` essay + mirrors + initial budget**
   - route, concept map, nav graph, sitemap, sandbox-links, bundle budget
   - footer-nav update from `/teleportation`

5. **Bundle / a11y close-out**
   - clean build
   - route budget recompute
   - manual accessibility check in both themes

## Ambiguities and recommended resolutions

- **Should the route be `/superdense` or `/superdense-coding`?**
  - Resolution: `/superdense-coding` (roadmap wins).

- **Should the algorithm half use a dedicated custom player or reuse
  `ProtocolStepper`?**
  - Resolution: reuse `ProtocolStepper`; it was clearly built for this.

- **Should the final decode include explicit `measure` ops in the canonical
  circuit?**
  - Resolution: yes for the route-level `CircuitView` / sandbox starter,
    because "shows the Bell-basis measurement on Bob's side" is clearer if
    the displayed circuit closes with measurement. Keep helpers flexible so
    tests can inspect the pre-measurement state too.

- **Should `HolevoBound` simulate anything quantum?**
  - Resolution: no. Keep it explanatory and formula-driven to minimize
    code and bundle cost.

- **Should the protocol default be fixed or driven by the selected row?**
  - Resolution: default to `11` everywhere. If row-linked stepper state stays
    tiny and robust, wire it in during route composition; otherwise keep the
    stepper as a fixed `11` walkthrough and let `EncodingTable` own the
    message-selection interaction.
