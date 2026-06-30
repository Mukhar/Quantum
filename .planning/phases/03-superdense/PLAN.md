# Phase 3 Plan - Superdense + Holevo bound

**Phase goal:** Ship `/superdense-coding`, the second v3 communication
essay. The algorithm half teaches superdense coding as the mirror image of
teleportation: Alice and Bob pre-share a Bell pair, Alice encodes two
classical bits with `I / X / Z / XZ` on her qubit, Bob decodes with the
Bell-basis inverse and recovers the message. The use-case half grounds the
promise with a `HolevoBound` widget that shows the hard `2x` ceiling so the
reader understands superdense is not "free bandwidth forever."

**Depends on:** Phase 2 (`ProtocolStepper`, `MultiBlochPanel`,
`teleportation.ts` as the protocol-module pattern, `/teleportation` as the
essay-composition template), Phase 1 (`CircuitView` Qiskit export,
`bundle-budget.json`, `scripts/check-bundle-budget.mjs`), plus v1/v2 essay
infrastructure (`EssayLayout`, `ConceptMap`, mirror tests, `SandboxLink`).

**Source of truth:** `.planning/ROADMAP.md` Phase 3 +
`.planning/REQUIREMENTS.md` (`ALG-03`, `USE-02`) +
`.planning/phases/03-superdense/PHASE-CONTEXT.md` locked decisions +
`docs/plans/2026-06-29-v3-design.md` section 3.4, with the roadmap winning
any naming conflict. That means the route is **`/superdense-coding`**, not
`/superdense`. The bundle gate remains an inherited cross-cutting close-out
check from Phase 1 rather than a Phase-3 requirement ID.

## Definition of Done (phase-level)

1. `src/pages/superdense-coding.astro` exists and renders end-to-end with
   the established v3 essay shape: opener, algorithm half, circuit/Qiskit
   bridge, use-case half, self-test, math appendix, footer-nav.
2. `src/lib/quantum/superdense.ts` exists and is the single source of truth
   for:
   - the canonical 2-qubit superdense circuit;
   - the explicit `00 / 01 / 10 / 11 -> I / X / Z / XZ` mapping;
   - canonical `ProtocolStep[]` for the shared stepper;
   - deterministic decode helpers used by tests and the UI.
3. **ALG-03:** the algorithm half ships an `EncodingTable` widget where
   selecting `00`, `01`, `10`, or `11` updates the protocol to the
   corresponding encoding, animates the matching operation on Alice's
   qubit, and surfaces Bob's decoded Bell-basis measurement result.
4. The algorithm half reuses Phase 2's shared widgets instead of inventing
   new parallel abstractions:
   - `ProtocolStepper` remains the narrative walkthrough.
   - `MultiBlochPanel` renders the 2-qubit reduced Bloch views.
   - If table-linked stepper state stays tiny, wire it during route
     composition; otherwise keep the stepper on the locked pedagogical
     default `11` path.
5. The canonical route-level circuit is shown in `CircuitView`, inherits
   Phase 1's "Copy as Qiskit" button, and remains valid under the existing
   circuit/codec/Qiskit exporter vocabulary.
6. The essay includes a `SandboxLink` starter for a canonical <= 4-qubit
   superdense circuit; the mirrored starter test lands in the same commit.
7. **USE-02:** a `HolevoBound` widget maps `n` transmitted qubits to the
   classical-bit ceiling:
   - no entanglement: `n` bits;
   - with pre-shared entanglement and superdense coding: at most `2n` bits.
   The locked interaction is a **single slider** over `n_qubits = 1..4`,
   with the visual/readout capped at `8` bits. The copy explicitly closes
   the misconception that the advantage scales beyond `2x`.
8. All route mirrors update in the same commit as the essay:
   - `src/components/ConceptMap.astro`
   - `tests/essays/concept-map.test.ts`
   - `tests/essays/nav-graph.test.ts`
   - `tests/essays/sandbox-links.test.ts`
   - `bundle-budget.json`
9. Footer-nav becomes:
   - `/deutsch -> /teleportation -> /superdense-coding -> /sandbox`
10. `bundle-budget.json` gets an initial `/superdense-coding` ceiling, then
    a close-out recompute using clean-build gzipped bytes plus 20%
    headroom.
11. `npm test` is green, including the new Phase 3 tests, mirror tests, and
    bundle gate.
12. `npm run build` is green and outputs `dist/superdense-coding/index.html`.
13. Lighthouse mobile accessibility target for `/superdense-coding` is >= 95
    in both themes (manual audit recorded in the close-out commit body).
14. No new runtime dependencies are added. All interactivity remains Astro +
    vanilla TS.

## Plans

> **Wave 1 (foundation):** `03-01` first. The canonical protocol module and
> tests must exist before any widget or route can safely compose them.
>
> **Wave 2 (parallel-safe widgets):** `03-02` and `03-03` can run in
> parallel once `03-01` exists. `EncodingTable` owns message-selection and
> decode readout. `HolevoBound` is independent and formula-driven.
>
> **Wave 3 (compose):** `03-04` integrates the route, shared widgets,
> mirrors, nav updates, and the initial budget entry.
>
> **Wave 4 (close):** `03-05` performs clean-build bundle measurement and
> manual accessibility close-out.

---

### 03-01 - `quantum/superdense` module + correctness tests

**Why:** Phase 3 needs one canonical description of the protocol that the
essay, `ProtocolStepper`, `CircuitView`, sandbox starter, and tests can all
share. This mirrors the successful `teleportation.ts` pattern and prevents
bit/gate drift.

**Deliverables:**

- `src/lib/quantum/superdense.ts` (new) exporting a focused public API,
  e.g.:
  ```ts
  import type { Circuit, Op } from "./circuit";
  import type { ProtocolStep } from "./teleportation";

  export type SuperdenseBits = "00" | "01" | "10" | "11";

  export interface SuperdenseDecodeResult {
    bits: SuperdenseBits;
    label: string;
    probabilities: number[];
  }

  export function encodingOps(bits: SuperdenseBits): Op[];
  export function superdenseCircuit(bits?: SuperdenseBits, opts?: { measure?: boolean }): Circuit;
  export function superdenseSteps(bits?: SuperdenseBits): ProtocolStep[];
  export function decodeSuperdense(bits?: SuperdenseBits): SuperdenseDecodeResult;
  export function allSuperdenseCases(): Array<{
    bits: SuperdenseBits;
    ops: Op[];
    decoded: SuperdenseBits;
  }>;
  ```
- Conventions:
  - `q0` = Alice's qubit (the one she encodes and sends).
  - `q1` = Bob's Bell-pair half.
  - Bell-pair prep is `H(q0)` then `CNOT(q0 -> q1)`.
  - Bob's decode block is `CNOT(q0 -> q1)` then `H(q0)`.
  - Mapping is literal roadmap order:
    - `00 -> [I(q0)]`
    - `01 -> [X(q0)]`
    - `10 -> [Z(q0)]`
    - `11 -> [X(q0), Z(q0)]`
    Use `XZ` in prose/tests/UI even though `ZX` differs only by global
    phase.
- `superdenseCircuit(bits, { measure })` should:
  - default `bits = "11"` for the locked route demo and sandbox starter;
  - build the 2-qubit protocol as Bell prep -> encoding -> decode;
  - append measurement ops only when `measure !== false`, so tests can also
    inspect the final pre-measurement state cleanly.
- `superdenseSteps(bits)` should return a short shared-stepper sequence:
  1. `Prepare shared Bell pair`
  2. `Alice encodes ${bits} with ...`
  3. `Bob decodes with CNOT`
  4. `Bob decodes with H`
  5. `Read the Bell-basis result`
  Keep descriptions explicit about what each step means physically.
- `decodeSuperdense(bits)` should deterministically expose the decoded basis
  result after the full protocol. The implementation can use the existing
  simulator helpers and basis probabilities rather than inventing new
  measurement machinery.
- `src/lib/quantum/index.ts` re-exports the public superdense helpers and
  types.
- `tests/quantum/superdense.test.ts` (new) covers:
  1. **Encoding map correctness.** Assert the returned op sequence for each
     bit pair matches `I / X / Z / XZ`.
  2. **Protocol round-trip.** For each of `00`, `01`, `10`, `11`, run the
     full protocol and assert the decoded outcome matches the input bits.
  3. **Bell-basis decode certainty.** Final basis probabilities after the
     decode block are one-hot (within tolerance) on the expected outcome.
  4. **Circuit validity.** `validateCircuit`, `encodeCircuit`, and
     `toQiskit` all accept the canonical measured circuit.
  5. **Step integrity.** `superdenseSteps(bits)` returns stable step labels
     and only uses supported `Op` kinds.

**read_first:**

- `src/lib/quantum/teleportation.ts`
- `src/lib/quantum/circuit.ts`
- `src/lib/quantum/simulator.ts`
- `src/lib/quantum/index.ts`
- `tests/quantum/teleportation.test.ts`
- `src/pages/cnot-bell.astro`

**Acceptance:**

- `npm test -- superdense` passes.
- `npm test -- qiskit` still passes; no exporter drift introduced.
- `npm run build` is clean.
- No changes are required to simulator qubit limits, codec wire format, or
  Qiskit mapping tables.

---

### 03-02 - `EncodingTable` widget + decode readout

**Why:** This is the algorithm-half payoff. The reader must be able to click
`00`, `01`, `10`, or `11`, see the corresponding Alice-side operation, and
watch Bob's decode outcome resolve from the same canonical protocol.

**Deliverables:**

- `src/components/EncodingTable.astro` (new) with:
  - a 2x2 bit-selector UI for `00`, `01`, `10`, `11`;
  - a visible gate mapping column (`I`, `X`, `Z`, `XZ`);
  - a decoded-result panel on Bob's side;
  - semantic table-like labeling even if the mobile layout stacks.
- Component contract should be intentionally small and route-friendly, e.g.:
  ```ts
  interface Props {
    storeKey: string;
    initialBits?: SuperdenseBits;
    caption?: string;
  }
  ```
- Interaction model:
  - selecting a row updates the active bit pair;
  - selecting a row replays the selected superdense protocol into the shared
    quantum store that drives the essay's `MultiBlochPanel`, so the reader
    sees Alice-side state change instead of only a text readout;
  - the currently selected row is visibly highlighted and keyboard
    reachable;
  - `aria-live="polite"` announces the chosen encoding and decoded result.
- The widget and the narrative stepper are intentionally separate. The route
  integration decision belongs to `03-04`:
  - preferred: row selection can lightly drive the page-level walkthrough if
    that wiring stays tiny and robust;
  - accepted fallback from the locked context: keep the stepper on the
    pedagogical default `11` path while `EncodingTable` owns message
    selection and decode readout.
- Do not promise cross-widget sync in this plan slice unless the route plan
  explicitly names the integration surface.
- If structural widget tests are already idiomatic in the repo, add
  `tests/components/encoding-table.test.ts` to assert:
  - `data-widget="encoding-table"` exists;
  - the four bit labels exist;
  - the visible mapping text includes `I`, `X`, `Z`, `XZ`.

**read_first:**

- `src/components/ProtocolStepper.astro`
- `src/components/MultiBlochPanel.astro`
- `src/lib/quantum/protocolStepper.ts`
- `src/lib/quantum/store.ts`
- `src/pages/teleportation.astro`

**Acceptance:**

- Selecting each bit pair updates the visible mapping and decoded result.
- No duplicate source of truth for the protocol emerges outside
  `superdense.ts`.
- `npm run build` passes.

---

### 03-03 - `HolevoBound` widget

**Why:** The second half of the essay must close the bandwidth misconception
interactively, not with prose alone. This widget should be explanatory,
cheap, and explicit about the `2x` ceiling.

**Deliverables:**

- `src/components/HolevoBound.astro` (new) with:
  - a **single slider** for the number of transmitted qubits;
  - two clearly labeled outputs:
    - `Without pre-shared entanglement: n classical bits`
    - `With superdense coding: at most 2n classical bits`
  - a hand-written inline SVG line chart with:
    - x-axis = `n_qubits` from `1..4`
    - y-axis capped at `8`
    - both `n` and `2n` lines
    - a selected-marker highlight for the active slider value
  - a short caption explaining that the extra capacity depends on pre-shared
    entanglement rather than unlimited information in the transmitted qubits;
  - short inline copy explaining that entanglement is a prerequisite, not a
    source of unlimited free capacity.
- Keep the widget formula-driven and self-contained. Do **not** route it
  through the simulator.
- Locked range: `1..4` qubits.
- Keep the y-axis / visual maximum at `8` bits.
- Optional examples are welcome if they stay cheap:
  - `1 qubit -> 2 bits`
  - `4 qubits -> 8 bits`
- If structural component tests are already supported, add
  `tests/components/holevo-bound.test.ts` to assert:
  - `data-widget="holevo-bound"` exists;
  - the copy includes both `n` and `2n` ceilings;
  - control labels are present.

**read_first:**

- `src/components/ProbabilityBars.astro`
- `src/components/ProtocolStepper.astro`
- `src/pages/teleportation.astro`
- `.planning/REQUIREMENTS.md` `USE-02`

**Acceptance:**

- The widget never suggests a gain larger than `2x`.
- The UI remains understandable on mobile and keyboard reachable.
- `npm run build` passes.

---

### 03-04 - `/superdense-coding` essay + mirrors + initial budget

**Why:** This is the integration slice that lands the route, composes the
algorithm and use-case halves, and keeps every canonical mirror in sync in
the same commit.

**Deliverables:**

- `src/pages/superdense-coding.astro` (new) using `EssayLayout`.
- Essay outline:
  - opener that explicitly frames superdense as teleportation's mirror:
    teleportation sends one qubit with two classical bits; superdense sends
    two classical bits by transmitting one qubit, but only because the Bell
    pair was prepared ahead of time.
  - algorithm half:
    - `MultiBlochPanel` with `qubits={2}` and the same `storeKey` used by
      `EncodingTable` for Alice-side protocol replay
    - `EncodingTable`
    - `ProtocolStepper`
    - `CircuitView` for the canonical circuit
    - `SandboxLink` for the canonical starter
  - use-case half:
    - `HolevoBound`
    - prose that closes the "so why not 10x bandwidth?" misconception
  - self-test and math appendix
  - footer-nav wired between `/teleportation` and `/sandbox`
- Mirrors updated in the same commit:
  - `src/components/ConceptMap.astro` adds `/superdense-coding` as the new
    tail node after `/teleportation`
  - `tests/essays/concept-map.test.ts` mirrors the node list
  - `tests/essays/nav-graph.test.ts` updates the chain to
    `/teleportation -> /superdense-coding -> /sandbox`
  - `src/pages/sitemap.xml.ts` adds `/superdense-coding` to the canonical
    route list if it is explicitly enumerated there
  - `tests/essays/sandbox-links.test.ts` adds the canonical superdense
    starter
  - `bundle-budget.json` adds an initial `/superdense-coding` entry
- Update `src/pages/teleportation.astro` footer-nav so its `next` link now
  targets `/superdense-coding`.
- Route-composition ownership of widget coordination:
  - if row-linked table/stepper state stays tiny, implement it here;
  - otherwise keep the stepper fixed to the default `11` walkthrough and
    avoid unnecessary cross-widget JS.

**read_first:**

- `src/pages/teleportation.astro`
- `src/components/ConceptMap.astro`
- `src/pages/sitemap.xml.ts`
- `tests/essays/nav-graph.test.ts`
- `tests/essays/concept-map.test.ts`
- `tests/essays/sandbox-links.test.ts`
- `bundle-budget.json`

**Acceptance:**

- `/superdense-coding` builds and renders all Phase 3 sections.
- The route uses the roadmap slug everywhere; no `/superdense` drift.
- Canonical route lists, including `sitemap.xml.ts` when enumerated, are
  updated in the same commit.
- Mirror tests pass in the same commit that adds the route.
- `npm run build`, `npm run check:bundle`, and `npm test` pass.

---

### 03-05 - Bundle / a11y close-out and route budget recompute

**Why:** Phase 3 adds a full new essay route and two interactive widgets.
OPS-04 requires a measured route ceiling, not a guess.

**Deliverables:**

- Run a clean build and route-budget check:
  - `npm run build`
  - `npm run check:bundle`
- Recompute the `/superdense-coding` ceiling as:
  - `round_up(actual_gzip_bytes * 1.2, 1024)`
  - update only the `/superdense-coding` entry unless another route changed
    for a documented reason.
- Run `npm test` after the recompute.
- Manual accessibility pass for `/superdense-coding` in both themes:
  - keyboard reaches the encoding selector, stepper buttons, and Holevo
    controls;
  - focus rings are visible;
  - `aria-live` copy is informative but not noisy;
  - mobile layout stacks without horizontal traps.

**read_first:**

- `bundle-budget.json`
- `scripts/check-bundle-budget.mjs`
- `.planning/phases/01-foundation/PLAN.md`
- `.planning/phases/02-teleportation/PLAN.md`

**Acceptance:**

- `npm run build` passes.
- `npm run check:bundle` passes with `/superdense-coding` below ceiling.
- `npm test` passes.
- Manual a11y notes are recorded in the close-out commit body.

---

## Cross-plan verification

- `npm test -- superdense` after `03-01`.
- `npm run build` after each widget/route plan.
- `npm test` and `npm run check:bundle` after `03-04` and `03-05`.
- Same-commit mirror discipline for route/nav/concept-map/sandbox-link
  changes.
- Preserve the route slug lock: use `/superdense-coding`, not `/superdense`.
- Preserve the simulator cap and existing exporter vocabulary.

## Artifacts this phase produces

- `src/lib/quantum/superdense.ts`
- `tests/quantum/superdense.test.ts`
- `src/components/EncodingTable.astro`
- `src/components/HolevoBound.astro`
- optional component structural tests for the two widgets
- `src/pages/superdense-coding.astro`
- mirror updates for the route
- initial and recomputed `/superdense-coding` bundle budget entry

## Frontmatter

```yaml
phase: 3
phase_slug: 03-superdense
phase_title: "Superdense + Holevo bound"
requirements: [ALG-03, USE-02]
plans:
  - id: 03-01
    title: "quantum/superdense module + correctness tests"
    wave: 1
    depends_on: []
    autonomous: true
    requirements: [ALG-03]
    files_modified:
      - src/lib/quantum/superdense.ts
      - src/lib/quantum/index.ts
      - tests/quantum/superdense.test.ts
  - id: 03-02
    title: "EncodingTable widget + decode readout"
    wave: 2
    depends_on: [03-01]
    autonomous: true
    requirements: [ALG-03]
    files_modified:
      - src/components/EncodingTable.astro
      - tests/components/encoding-table.test.ts
  - id: 03-03
    title: "HolevoBound widget"
    wave: 2
    depends_on: [03-01]
    autonomous: true
    requirements: [USE-02]
    files_modified:
      - src/components/HolevoBound.astro
      - tests/components/holevo-bound.test.ts
  - id: 03-04
    title: "/superdense-coding essay + mirrors + initial budget"
    wave: 3
    depends_on: [03-02, 03-03]
    autonomous: true
    requirements: [ALG-03, USE-02]
    files_modified:
      - src/pages/superdense-coding.astro
      - src/pages/teleportation.astro
      - src/pages/sitemap.xml.ts
      - src/components/ConceptMap.astro
      - tests/essays/nav-graph.test.ts
      - tests/essays/concept-map.test.ts
      - tests/essays/sandbox-links.test.ts
      - bundle-budget.json
  - id: 03-05
    title: "Bundle / a11y close-out and route budget recompute"
    wave: 4
    depends_on: [03-04]
    autonomous: false
    requirements: []
    files_modified:
      - bundle-budget.json
```
