# Phase 2 — Teleportation + Quantum Networks — Context

**Gathered:** 2026-06-29
**Status:** Ready for execution
**Source:** `docs/plans/2026-06-29-v3-design.md` §3.3 + §3.3a + ROADMAP.md

## Phase Boundary

This is the v3 **flagship** essay. Its job is to prove the v3 format
end-to-end — "algorithm half + use-case half, both widget-driven" —
before Phases 3-6 scale it across four more essays. Specifically it
ships:

1. **`/teleportation`** — a single new essay page that walks the
   reader through the 3-qubit quantum teleportation circuit (Bell
   pair → Bell measurement → classical bits → conditional X/Z →
   state arrives on Bob) with a `ProtocolStepper` widget driving a
   `MultiBlochPanel` (ALG-01).
2. **Mixed-state-honest Bloch rendering** (ALG-02) — the panel uses
   `reducedDensity.ts` so mid-teleportation entangled qubits render
   as **shrunken arrows inside the sphere**, not as lies on the
   surface.
3. **`QuantumNetwork`** (USE-01) — second-half interactive: a 3-node
   diagram (Alice / Repeater / Bob) where clicking each link swaps
   entanglement along it; a live "shared Bell pair Alice ↔ Bob"
   indicator flips on when end-to-end entanglement exists.
4. **All site-wide mirrors updated in the same commit as the essay
   frontmatter:** `ConceptMap.astro`, `nav-graph.test.ts`,
   `sandbox-links.test.ts`, `concept-map.test.ts`,
   `bundle-budget.json`, the homepage entry.
5. **Reuses Phase 1 deliverables on day 1:** the essay's
   `CircuitView` ships the "Copy as Qiskit" button by inheritance
   (the button is baked into `CircuitView.astro`); the
   `/teleportation` route has an explicit ceiling in
   `bundle-budget.json` so OPS-04 protects it from the first commit.

`ProtocolStepper` is built as a **shared component** in this phase —
Phase 3 (Superdense) reuses it without modification per ROADMAP.
Same applies to `MultiBlochPanel`'s composition pattern.

## Implementation Decisions

### Teleportation simulation strategy (LOCKED — answer to design-doc open-q on mid-circuit measure + conditional gates)

**Use deferred measurement.** The simulator's `Op` IR
(`gate / cnot / rot / measure`) is **not extended** with a conditional
op. Instead, the standard textbook identity is applied:

```
classical-conditioned X^a Z^b on q2, where (a,b) are the Bell-measurement bits of (q1, q0)
                                  ≡
                CNOT(q1 → q2) ; CZ(q0 → q2)         (deferred-measurement principle)
```

Both forms produce **the same final state on Bob's qubit** (q2) for
any pre-Bell state. The simulator runs the deferred form throughout
the protocol; the `ProtocolStepper` exposes the textbook step
*labels* (entangle Bell pair → Bell measure → classical-bit channel
→ correct on Bob), and `MultiBlochPanel` renders the reduced-density
state after each step.

Why this is the right call:
- One source of truth (the simulator). No new `{kind:"ifc",...}` op,
  no Qiskit `.c_if()` emitter, no Phase-1 drift-coverage update,
  no codec change. Phase 1's QSK-03 stays green untouched.
- `CZ` is implementable from existing gates: `CZ = H_target · CNOT ·
  H_target`. No new gate primitive needed. We add a small helper
  `cz(control, target): Op[]` returning the three-op decomposition;
  it lives in `src/lib/quantum/teleportation.ts`.
- The "Bell measurement" step in the stepper is **rendered as a
  visualization** (probability bars over the 4 Bell-basis outcomes,
  computed from the post-`CNOT+H` state) without actually collapsing
  state. That keeps the rest of the protocol coherent and the
  pedagogy honest — the reader sees that "the classical bits would
  be a/b in this run" without losing the rest of the state vector.
- `CircuitView` and the Qiskit export show the **same deferred form**
  that the simulator runs. The body text explicitly names the
  deferred-measurement principle as the trick that lets us draw a
  unitary-only circuit and get the same answer. This is honest, and
  better pedagogy than two divergent circuits.

### `ProtocolStepper` — shared component from day 1

- **File:** `src/components/ProtocolStepper.astro` + a tiny inline
  `<script>` hydrator inside the same file (no separate `.client.ts`
  unless Phase 3 demands shared logic).
- **API (TypeScript prop shape):**
  ```ts
  interface Step {
    /** Short label shown in the stepper UI ("Entangle Bell pair"). */
    label: string;
    /** Optional long description shown when this step is active. */
    description?: string;
    /**
     * Ops appended to the live store on entering this step. Run in
     * order. Empty arrays are allowed (e.g. the "Bell measurement"
     * step in teleportation has no unitary, just a readout change).
     */
    apply: Op[];
  }
  interface Props {
    storeKey: string;     // shared store key, matches sibling widgets
    qubits: number;
    steps: Step[];
    /** Optional starting step (0-indexed). Default 0. */
    initialStep?: number;
    /** Optional caption above the stepper. */
    caption?: string;
  }
  ```
- **Behavior:** stepper exposes Prev / Next buttons + a step indicator
  (`Step 2 / 5: Bell measurement`). Advancing replays from step 0 to
  the new index by `store.reset()` then re-applying all step `apply`
  arrays in order. Reset is cheap (4 qubits = 16 amplitudes); we don't
  need step-level undo state. Going backward replays the same way.
- **Store integration:** uses `ensureStore(storeKey, { qubits })` just
  like every other widget on a page. The store is shared with
  `MultiBlochPanel` and any sibling `ProbabilityBars` — they reflect
  the post-step state automatically.
- **Keyboard a11y:** arrow keys ←/→ advance/retreat when stepper has
  focus. `aria-live="polite"` announces the step label.
- **Mobile:** stacks vertically, full-width Prev/Next buttons.

### `MultiBlochPanel` — compose 3 × existing `MiniBloch`

- **File:** `src/components/MultiBlochPanel.astro` (single file, no
  client module needed — `MiniBloch`'s own hydrator already subscribes
  to the shared store).
- **Implementation:** the component just renders 3 `<MiniBloch>`
  children side-by-side (desktop) / stacked (mobile, default) with a
  consistent caption per qubit ("q0 — Alice's message", "q1 — Alice's
  half of Bell", "q2 — Bob"). `MiniBloch` already:
    - subscribes to the store via `data-store-key` + `data-qubit`,
    - computes the reduced-density matrix via
      `reducedDensityMatrix(state, q, n)`,
    - scales arrow length by `r = √(x²+y²+z²)`, so mixed states with
      `r < 1` render **inside** the sphere automatically (ALG-02
      core requirement),
    - shows the "Entangled" badge when `r < 0.98`.
- **No `MultiBlochPanel/Panel.client.ts`** despite design-doc naming;
  reusing `MiniBloch` shrinks the diff and keeps the math in one
  place. The design doc is a sketch — this is the implementation
  refinement.
- **Caption per qubit** is a `captions?: string[]` prop on the panel;
  defaults to `["q0", "q1", "q2"]`.

### `QuantumNetwork` widget (USE-01) — generic graph

- **File:** `src/components/QuantumNetwork.astro` + inline `<script>`
  hydrator (no `.client.ts` — single-essay use, < 1 KB JS budget).
- **Props (generic, not hardcoded to 3-node):**
  ```ts
  interface NetworkNode { id: string; label: string; cx: number; cy: number; }
  interface NetworkEdge { from: string; to: string; }
  interface Props {
    nodes: NetworkNode[];
    edges: NetworkEdge[];
    /** Pair of node IDs to expose as the "shared Bell pair" indicator. */
    endpoints: [string, string];
    /** Caption above the diagram. */
    caption?: string;
  }
  ```
- **Behavior:** every `edge` renders as a clickable line; clicking
  toggles a `data-entangled="true|false"` attribute on the edge.
  The component computes the **transitive entanglement closure**
  over the entangled edges: if `endpoints[0]` and `endpoints[1]` are
  in the same component of the entangled-edge subgraph, the
  "shared Bell pair" indicator flips on.
- **The teleportation essay's instance is exactly:**
  ```astro
  <QuantumNetwork
    nodes={[
      { id: "alice", label: "Alice", cx:  60, cy: 100 },
      { id: "repeater", label: "Repeater", cx: 200, cy: 100 },
      { id: "bob", label: "Bob", cx: 340, cy: 100 },
    ]}
    edges={[
      { from: "alice", to: "repeater" },
      { from: "repeater", to: "bob" },
    ]}
    endpoints={["alice", "bob"]}
    caption="Click each link to entangle it. The end-to-end indicator
             lights up when Alice and Bob share a Bell pair through
             the repeater."
  />
  ```
- **Why generic now:** the 4 lines of extra prop-handling cost is
  trivial; Phase 6's concept-map progress work and a possible v4
  3rd-party network essay are both downstream consumers that
  shouldn't have to refactor.
- **Visual contract:** hand-rolled SVG (same posture as `ConceptMap`);
  semantic CSS vars for theme-reactivity; entangled edges turn green
  (`var(--color-positive)`), idle edges stay slate.
- **No graph layout library** — caller supplies `cx/cy`. For 3 nodes
  this is fine; for the v4 extension it's still fine for ≤ 10 nodes.

### Sandbox-link starter (LOCKED — answer to design-doc open-q #2)

**Yes — `/teleportation` ships a `SandboxLink` starter** at the bottom
of the algorithm-half section. The starter is the **deferred-
measurement circuit**, exactly what the sandbox can run today
without any new ops:

```
qubits = 3
steps  = [
  [gateOp("H", 1)],                              // entangle the Bell pair (q1, q2)
  [cnotOp(1, 2)],
  [gateOp("X", 0)],                              // (optional) prepare Bob's input on q0 — start with |1⟩
  [cnotOp(0, 1)],                                // Alice's Bell measurement, half 1
  [gateOp("H", 0)],                              //   …half 2
  [cnotOp(1, 2)],                                // deferred correction: CNOT(q1→q2)
  [gateOp("H", 2), cnotOp(0, 2), gateOp("H", 2)],// deferred correction: CZ(q0→q2) via H·CNOT·H
]
```

This circuit fits the 4-qubit sandbox cap (uses 3). The starter also
exercises Phase 1's "Copy as Qiskit" button on a non-trivial circuit
straight off the press.

### Bundle ceiling for `/teleportation` (LOCKED)

- **Plan-time placeholder:** add `"teleportation": 12288` to
  `bundle-budget.json` at the start of the phase so the CI gate is
  active from the first commit (12288 bytes ≈ 12 KB, leaving room
  for `MultiBlochPanel`'s 3 × MiniBloch hydrators + `ProtocolStepper`
  + `QuantumNetwork`).
- **End-of-phase recompute:** in the same commit that closes the
  phase (after the essay text, `MultiBlochPanel`, `ProtocolStepper`,
  `QuantumNetwork`, mirrors are all in), run a clean `npm run build`,
  read the actual gzipped JS size for `/teleportation/index.html`,
  set the ceiling to `round_up(actual × 1.2, 1024)`, commit that
  number. Same protocol Phase 1 used.
- **If the placeholder is breached during the phase:** that's a
  signal to inline-hydrate or trim, not to raise the ceiling. The
  raise is end-of-phase only.

### Mirrors (LOCKED — same-commit-as-essay rule)

A single PR / commit lands the essay frontmatter AND every mirror
listed below. CI fails otherwise (every mirror has a test).

1. `src/components/ConceptMap.astro` — add a new `primary` node
   `{ href: "/teleportation", label: "Teleportation", cx: ?, cy: ? }`
   (placement: row 3 alongside `cnot-bell`, `deutsch`; group label
   "Algorithms" optional now, mandatory in Phase 6's layout refactor).
   Add reading-path edge `deutsch → teleportation`.
2. `tests/essays/concept-map.test.ts` — append the new node to
   `expected[]` and bump the `expectedEssays` list. v3 nodes promoted
   to `tier: "primary"`.
3. `tests/essays/nav-graph.test.ts` — extend `CHAIN[]`:
   - Change `deutsch.next` from `/sandbox` → `/teleportation`.
   - Add `{ slug: "teleportation", prev: "/deutsch", next: "/sandbox" }`.
4. `tests/essays/sandbox-links.test.ts` — add the deferred-measurement
   teleportation starter (the literal `Circuit` from the section
   above) to `STARTERS[]`.
5. `src/pages/index.astro` and `src/components/ConceptMap.astro`'s
   homepage hero text (if it enumerates essays) — add Teleportation.
6. `bundle-budget.json` — add `"teleportation": 12288` (and recompute
   per the recompute rule above).
7. `astro.config.mjs` — only if a new route requires explicit config
   (it does not — Astro picks up `src/pages/teleportation.astro`
   automatically).

### Algorithm correctness tests (LOCKED — non-negotiable bar)

`tests/quantum/teleportation.test.ts` ships with three correctness
suites (matching v3 design §7):

1. **Deferred-measurement identity.** For three input states on q0
   (`|0⟩`, `|1⟩`, `|+⟩`, `(|0⟩ + i|1⟩)/√2`), build the full
   protocol circuit and assert the reduced density matrix on q2
   matches the input state's density matrix to within `1e-9`.
2. **Bell-basis measurement readout.** After `H_q1 ; CNOT(q1,q2)`
   (Bell pair) and `CNOT(q0,q1) ; H(q0)` (Alice's BSM), assert the
   joint probability of each of the four basis outcomes `00, 01, 10, 11`
   on `(q0, q1)` equals `0.25` for an input `|+⟩` on q0.
3. **`MultiBlochPanel` mixed-state arrow length.** For an entangled
   2-qubit Bell pair, assert `blochVectorFromRho(reducedDensityMatrix(
   state, 0, 2)).r === 0` (well, ≤ 1e-9). Already covered for the
   reduced-density math itself in `tests/quantum/reducedDensity.test.ts`
   — this is the *widget*-level assertion that `MultiBlochPanel`
   correctly forwards the math.

### Discretion (executor decides during plan execution)

- Exact SVG layout of `QuantumNetwork` edges (straight vs curved),
  hover state styling — pick whatever matches `ConceptMap.astro`'s
  existing slate-on-elevated look.
- Whether the `ProtocolStepper` step-indicator pill is "Step 2 / 5"
  vs "2 of 5" (cosmetic).
- Whether `MultiBlochPanel` captions render above each `MiniBloch`
  (default — uses MiniBloch's existing `caption` prop) or below.
- Whether the essay's `CircuitView` shows the *full* deferred-
  measurement circuit or splits it into two diagrams (Bell-prep half
  + correction half) — author judgment, pedagogy-driven.
- The exact text framing the "deferred measurement principle"
  paragraph — must be honest about why we draw it this way; phrasing
  is the essay-author's call.

## Canonical References

**Downstream agents MUST read these before implementing.**

### Quantum / simulator math
- `src/lib/quantum/simulator.ts` — `Simulator`, `apply()`, `applyCNOT()`,
  `applyRotation()`, `probabilities()`, qubit-0-is-LSB convention.
- `src/lib/quantum/circuit.ts` — `Op` shape, `Circuit`, `runCircuit`,
  `MAX_QUBITS = 4`, `validateCircuit`.
- `src/lib/quantum/reducedDensity.ts` — `reducedDensityMatrix`,
  `blochVectorFromRho`, `marginalProbabilities` (the math driving
  ALG-02).
- `src/lib/quantum/bloch.ts` — `blochToState`, `stateToBloch`,
  `blochToCartesian` (pure-state Bloch; mixed states use the
  reduced-density path instead).
- `src/lib/quantum/store.ts` — `ensureStore`, `createStore`,
  `Snapshot`, subscribe pattern every widget plugs into.

### Existing widgets to mirror
- `src/components/MiniBloch.astro` — the 2D-SVG reduced-density Bloch
  card `MultiBlochPanel` composes 3 of. Same `data-store-key` +
  `data-qubit` contract.
- `src/components/ProbabilityBars.astro` — same store-subscription
  pattern (`data-widget`, `data-store-key`, inline hydrator); copy
  the structure for `ProtocolStepper` and `QuantumNetwork`.
- `src/components/CircuitView.astro` — server-only SVG renderer; the
  Phase 1 "Copy as Qiskit" button is already inside it; just embed
  `<CircuitView circuit={teleportationCircuit} />` in the essay.
- `src/components/SandboxLink.astro` — `Props.circuit: Circuit`;
  encodes at build time via `encodeCircuit`; used as-is for the
  teleportation starter.
- `src/components/GateButtons.astro` — store-subscription pattern
  for a stepper-adjacent control surface; structural reference for
  `ProtocolStepper.astro`.

### Existing essays for prose/structure mirror
- `src/pages/entanglement.astro` — closest analog: introduces Bell
  pair + uses `MiniBloch` + has SandboxLink starter + mirrors
  test/nav/concept-map. The teleportation essay's frontmatter +
  EssayLayout usage mirrors this file step-for-step.
- `src/pages/cnot-bell.astro` and `src/pages/deutsch.astro` —
  `CircuitView` consumers, useful for the embed pattern.

### Layout + theme
- `src/layouts/EssayLayout.astro` — wraps every essay; sets up
  `prose-essay`, theme attrs, footer-nav slot.
- `src/styles/theme.css` — semantic CSS vars consumed by `MiniBloch`
  and the network diagram (`--color-positive`, `--color-line`, etc.).

### Mirrors / tests
- `src/components/ConceptMap.astro` — node placement reference.
- `tests/essays/concept-map.test.ts` — `expected[]` array to append to.
- `tests/essays/nav-graph.test.ts` — `CHAIN[]` to extend.
- `tests/essays/sandbox-links.test.ts` — `STARTERS[]` to extend; uses
  `gateOp`, `cnotOp`, `measureOp` helpers from `src/lib/quantum`.

### Phase 1 outputs that Phase 2 depends on
- `src/lib/quantum/qiskit.ts` — `toQiskit(circuit, opts?)`; the
  teleportation `CircuitView` button inherits this for free.
- `bundle-budget.json` — Phase 2 adds `"teleportation"` entry.
- `scripts/check-bundle-budget.mjs` — runs in `npm test`; the new
  ceiling is asserted automatically.

No external API specs. Teleportation is a textbook circuit
(Nielsen & Chuang §1.3.7); the protocol shape is universal.

## Specific Ideas

- The `MultiBlochPanel` arrow shrinking from full-length (start, q2
  in `|0⟩`) → origin (mid-protocol, q2 entangled with the Bell pair
  via the deferred CNOT) → full-length again (after the deferred CZ,
  q2 is back to a pure state matching q0's input) is the **single
  most pedagogically valuable animation** in v3. It is the entire
  visual payoff for ALG-02. Optimize for it.
- The `QuantumNetwork` "entanglement-swap" interaction is the
  user's **first taste** that entanglement is *transitive in a
  specific protocol-mediated way*, not magically end-to-end. The
  body text explicitly closes this loop: "the indicator only lights
  up when *both* links are entangled — that's why repeaters need
  matching protocols, not just matching hardware."
- The "Copy as Qiskit" button on this essay's `CircuitView`, by
  shipping the deferred-measurement form, is **runnable Qiskit** —
  the reader can paste into a notebook and get the same Bob-state
  on real hardware. That's the v3 promise made concrete on the
  flagship essay.

## Deferred Ideas

- **Mid-circuit measurement + `c_if` in the simulator IR** — possible
  in v4 if Phase 4 (Grover) or Phase 5 (Shor) reveals an essay where
  the deferred-measurement trick is awkward. Not blocking v3.
- **`QuantumNetwork` with > 3 nodes or weighted edges (e.g. fidelity
  loss per swap)** — v4. Today's component takes the props shape so
  the extension is a prop-array change, not a refactor.
- **3D Bloch in `MultiBlochPanel`** — using `BlochSphere/Sphere3D`
  for 3 spheres at once is interesting but visually noisier and
  bundle-expensive. The 2D `MiniBloch` is doing its job; revisit at
  v3 retro.
- **Animation of the protocol-stepper transition (smooth tweens
  between step states)** — `MiniBloch`'s arrow already animates per
  snapshot; whether we want stepper-level cross-fade is a v3.1
  polish question if user testing reveals abrupt transitions.
- **Showing the "classical bits" channel as an explicit on-page UI
  element** — could be a 2-bit binary readout between the two Bloch
  triplets ("Alice → Bob: 01"). Tempting but the deferred form makes
  it ambiguous (no measurement actually happens). If we add it, it's
  a narrative diagram, not a live readout. Decide during execution;
  if it ships, label it explicitly as illustrative.

## Scope Fence

In scope for Phase 2:
- `src/pages/teleportation.astro` (new)
- `src/components/ProtocolStepper.astro` (new)
- `src/components/MultiBlochPanel.astro` (new)
- `src/components/QuantumNetwork.astro` (new)
- `src/lib/quantum/teleportation.ts` (new — protocol circuit builder
  + `cz()` helper)
- `tests/quantum/teleportation.test.ts` (new — 3 correctness suites)
- `tests/components/protocol-stepper.test.ts` (new — stepper-store
  integration smoke)
- `tests/components/quantum-network.test.ts` (new — connected-component
  + endpoint-indicator logic)
- `tests/components/multi-bloch.test.ts` (new — arrow-length forwarding;
  optional if `mini-bloch` + `reducedDensity` coverage is deemed
  sufficient — executor decides)
- Mirror updates: `src/components/ConceptMap.astro`,
  `tests/essays/concept-map.test.ts`, `tests/essays/nav-graph.test.ts`,
  `tests/essays/sandbox-links.test.ts`, `bundle-budget.json`,
  `src/pages/index.astro` (if hero enumerates essays).

Out of scope for Phase 2:
- Any other v3 essay route (`/superdense-coding`, `/grover`, `/shor`,
  `/vqe`) — those are Phases 3-6.
- Mid-circuit measurement / conditional-gate IR extension (deferred-
  measurement makes it unnecessary; see decision above).
- Concept-map "track grouping" / progress indicators (PROG-01, OPS-03
  → Phase 6).
- Lighthouse audit script (Phase 6; ad-hoc audit during Phase 2 is
  the author's call, not a deliverable).
- `MultiBlochPanel` 3D variant.
- `QuantumNetwork` extensions (>3 nodes, edge weights, animation).
- Any change to `Simulator`, `Circuit`, `codec`, or `qiskit.ts` —
  the deferred-measurement decision means Phase 2 consumes Phase 1's
  surface area unchanged.

---

*Phase: 02-teleportation*
*Context gathered: 2026-06-29 — derived from `docs/plans/2026-06-29-v3-design.md` §3.3 + locked decisions on conditional gates, ProtocolStepper reuse, MultiBlochPanel composition, QuantumNetwork generality, sandbox starter, and bundle ceiling.*
