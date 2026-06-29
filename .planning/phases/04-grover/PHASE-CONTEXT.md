# Phase 4: Grover + Search reality - Context

**Gathered:** 2026-06-30
**Status:** Ready for planning
**Source:** `/gsd-autonomous` AFK smart-discuss run; locked decisions from `$HOME/.copilot/session-state/bc64e80e-b224-4be7-8a25-f50b54e81279/files/autonomous-decisions.md` plus Phase-4 AFK prompt choices.

<domain>
## Phase Boundary

Phase 4 ships `/grover`, the v3 search essay. Its job is to teach amplitude amplification with real simulator-backed math, then immediately ground the result in the honest use case: Grover gives a quadratic `√N` speedup, not magic database search and not RSA-breaking.

In scope:

1. **`/grover` essay** using the established algorithm-essay skeleton: pain-point opener, interactive algorithm half, use-case reality-check half, math appendix, self-test, footer-nav.
2. **Oracle + diffusion helpers** against the existing state-vector simulator (`≤ 4` qubits, Qiskit bit-order convention). Unit tests must assert amplitude concentration on the marked basis state after `⌊(π/4)·√N⌋` Grover iterations.
3. **`AmplitudeBars` widget** showing signed per-basis-state amplitudes after each Grover step so the oracle phase flip and diffusion amplification are visible.
4. **`SearchComparison` widget** side-by-side animating classical linear scan vs Grover `√N` as `N` moves from `16` to `1024`.
5. **Qiskit export / sandbox bridge** for essay circuits via `CircuitView` and `SandboxLink`; larger-N demonstrations are conceptual/exported, not simulated in-browser.
6. **Mirrors and gates updated with the route:** concept map, nav graph, sandbox-link starter mirror, bundle budget, sitemap/homepage if route lists are canonical there, and Lighthouse mobile a11y ≥ 95 in both themes.

Out of scope:

- Raising the simulator beyond 4 qubits. REQ-13 is hard-locked; use Qiskit export for larger demonstrations.
- Breaking RSA / factoring content beyond a clean handoff: “No — that is Shor, see next essay.” Shor/QFT/PQC are Phase 5.
- Clickable bar-to-mark interaction as a required feature; dropdown marking is locked for Phase 4, clickable bars are stretch only.
- Reusing `ProtocolStepper` for Grover loops. Grover needs an iteration-specific abstraction, not a protocol replay component.
- Analytics or remote telemetry. No analytics ever; any progress state remains local-only.

</domain>

<decisions>
## Implementation Decisions

### D-01 — AmplitudeBars layout and semantics

**Decision:** Use **vertical bars** for `AmplitudeBars`.

**Rationale:** Vertical histograms match the intuition readers already have from `ProbabilityBars` and textbook state-vector diagrams. The design doc explicitly calls for a signed-amplitude variant of `ProbabilityBars` so the oracle flip is visible; vertical bars can extend above/below a zero axis to show sign without inventing a new visualization language. This should remain a small Astro component with a tiny inline hydrator, closer to `ProbabilityBars.astro` than to a new charting subsystem.

**Locked behavior:**

- Render one bar per basis state, labels via the existing basis-label convention (`|0000⟩`, etc.).
- Show **signed real amplitudes**, not probabilities, for the algorithm-half widget. Negative amplitudes must be visually distinct (below zero axis and/or contrasting color) so the oracle phase flip is legible.
- Animate bar height/position on step changes, but honor `prefers-reduced-motion` like `ProbabilityBars`.
- Include an accessible text readout (`aria-live="polite"`) summarizing marked state, current iteration, and marked-state probability.
- Keep the simulator-backed demo at 4 qubits max (16 bars). Do not attempt 1024 bars in this component.

### D-02 — Grover iteration controls

**Decision:** Auto-set the default iteration count to the optimal `⌊(π/4)·√N⌋`, with a **numeric override input** for showing suboptimal / overshot runs.

**Rationale:** The optimal iteration count is the concept the essay is teaching; defaulting to it keeps the first experience crisp. A separate always-primary slider would make readers tune an implementation detail before understanding the story. A numeric override gives advanced readers a way to see “amplitudes climb then collapse” without cluttering the main path.

**Locked behavior:**

- Default demo problem size should fit the simulator cap: `n = 4` qubits (`N = 16`) unless the planner finds a clearer 2- or 3-qubit intro for the first panel.
- Marked state defaults to a readable non-zero value (e.g. `|1011⟩`) so the selected state is visually distinguishable from `|0000⟩`.
- Primary controls: marked-state dropdown, “Prev iteration”, “Next iteration”, “Reset”, and current iteration indicator (`k / k_opt`).
- Numeric override is secondary/advanced: min `0`, max enough to show overshoot for `N ≤ 16` (planner chooses exact cap), defaults to `k_opt`.
- The widget should show initial uniform superposition (`H` on all qubits) as iteration `0`, then each oracle+diffusion loop as one iteration.

### D-03 — Oracle UI

**Decision:** Use a **dropdown** to choose the marked basis state.

**Rationale:** A dropdown is explicit, accessible, keyboard-friendly, and cheap. Click-to-mark bars would be delightful but creates hit-target, focus, and “bar is data vs bar is control” ambiguity. It also adds scope to `AmplitudeBars` that is not required for ALG-04.

**Locked behavior:**

- Dropdown options list all basis states for the current simulator-backed `N` (`|0000⟩`…`|1111⟩` for 4 qubits).
- Changing the marked state resets/recomputes the iteration sequence and updates the highlighted bar.
- Bars may visually highlight the marked state, but clicking a bar to change the oracle is a stretch idea, not required.

### D-04 — SearchComparison N controls

**Decision:** Use **discrete log2 stops** for `N`: `16, 32, 64, 128, 256, 512, 1024`.

**Rationale:** The roadmap says “slides from 16 → 1024,” but continuous values create meaningless interpolation and label churn because Grover’s advantage is easiest to understand on powers of two. Discrete stops keep the UX clean, keep animation states deterministic, and align with the qubit-count mental model (`N = 2^n`) without implying the browser simulator is executing 1024 states.

**Locked behavior:**

- Slider has 7 positions mapped to the powers of two above.
- Display classical expected probes as approximately `N/2` for average-case unsorted search, with optional `N` worst-case note in prose/tooltips.
- Display Grover iterations as `⌊(π/4)·√N⌋`.
- The comparison widget is **formula-driven**, not simulator-driven, for `N > 16`.
- Animation should be side-by-side and comprehensible on mobile; if horizontal space is tight, stack the two lanes while preserving the same labels.

### D-05 — Do not reuse ProtocolStepper

**Decision:** **Do not reuse `ProtocolStepper`** for Grover.

**Rationale:** Phase 2’s `ProtocolStepper` replays a finite named protocol from step 0 to step `k`. Grover is a loop with repeated oracle+diffusion iterations, a marked-state parameter, and an optimal/suboptimal iteration concept. Reusing `ProtocolStepper` would force loop semantics into a protocol abstraction and likely obscure the teaching point.

**Locked behavior:**

- Build a Grover-specific iterator/control surface (`AmplitudeBars` may own the controls, or a small `GroverIterator` wrapper may coordinate them; planner decides).
- Reuse the **style and a11y posture** of `ProtocolStepper` (Prev/Next buttons, `aria-live`, keyboard-friendly controls), not its protocol data model.
- If a shared helper is useful, keep it low-level (e.g. `groverIterations({ qubits, marked, count })`) rather than adapting `ProtocolStep`.

### D-06 — Simulator and circuit representation

**Decision:** Implement oracle + diffusion in `src/lib/quantum/grover.ts` as simulator/state-vector helpers first; expose a small circuit builder only for Qiskit/sandbox-friendly example circuits.

**Rationale:** The existing `Circuit` vocabulary has no arbitrary multi-controlled phase oracle or all-state diffusion gate. For `N ≤ 16`, directly applying the mathematical operations to `Simulator.state` is smaller, clearer, and exactly what ALG-04 asks for. Qiskit export still matters, but it should use the existing supported gate vocabulary for illustrative circuits rather than forcing new simulator gates through `circuit.ts`, `codec.ts`, and `qiskit.ts` unless planner proves that is necessary.

**Locked behavior:**

- Do **not** add a new `Op` kind just for Grover unless research/planning proves all existing options fail.
- Preserve qubit-0-is-LSB / Qiskit convention from `Simulator` and `Circuit`.
- Candidate helper surface:
  - `uniformSuperposition(qubits): Simulator` or `prepareUniform(sim): Simulator`
  - `applyPhaseOracle(sim, markedIndex): Simulator`
  - `applyDiffusion(sim): Simulator`
  - `runGrover({ qubits, markedIndex, iterations }): GroverSnapshot[]`
  - `optimalGroverIterations(N): number`
- `GroverSnapshot` should include iteration number, amplitudes, probabilities, marked probability, and basis labels so widgets do not duplicate math.
- Diffusion should implement inversion-about-the-mean over amplitudes; tests should verify normalization stays ~1.

### D-07 — Qiskit / Sandbox bridge

**Decision:** Grover circuits must still round-trip through the existing Phase-1 Qiskit export hook where they use supported `Circuit` ops, but larger-N Grover demonstrations are exported/formula explained rather than run in-browser.

**Rationale:** Phase 1 locked `CircuitView` as the per-essay Qiskit affordance. The simulator cap remains 4 qubits, and the existing Qiskit exporter only emits supported gates (`H`, Pauli/phase gates, rotations, CNOT, measure). Phase 4 should not balloon into a general multi-controlled-gate exporter unless strictly required.

**Locked behavior:**

- Include at least one `CircuitView` in `/grover` with “Copy as Qiskit” available by inheritance.
- Prefer a small pedagogical circuit/starter that uses current gate vocabulary and fits the codec; if a full oracle decomposition for arbitrary marked states is too noisy, keep the `CircuitView` to the 2-qubit/4-state case and let the widget show the 4-qubit state-vector math.
- Add the Grover starter to `tests/essays/sandbox-links.test.ts` in the same commit as the essay.
- Any new gate vocabulary must update `DISCRETE_GATES`, `OP_KINDS`/types if needed, codec, Qiskit map, and QSK-03 drift tests. This is a risk, not the preferred path.

### D-08 — Essay narrative / RSA handoff

**Decision:** The essay must explicitly close the RSA misconception loop: **“No — Grover does not break RSA. That is Shor; see the next essay.”**

**Rationale:** The roadmap defines Phase 4’s use-case half as “honest disappointment.” Readers need to leave with the correct threat model: Grover affects brute-force search quadratically, while Shor attacks factoring/discrete log structurally. This also sets up Phase 5 cleanly.

**Locked behavior:**

- First half: amplitude amplification, oracle phase flip, diffusion as inversion-about-the-mean, optimal iteration count.
- Second half: unsorted search reality, password/hash key-size intuition, `SearchComparison`, and the RSA handoff.
- Avoid hype phrasing like “search is solved” or “databases are broken.”
- Include a concise “what Grover changes / what it does not change” summary table or callout if it helps the prose.

### D-09 — Mirrors, budgets, and accessibility

**Decision:** Treat mirrors and route budget as same-commit deliverables, following Phase 1/2 patterns.

**Rationale:** Existing tests intentionally mirror canonical source lists because Astro frontmatter and component arrays are not imported directly in Vitest. CI should fail loudly if `/grover` lands without nav/concept/sandbox updates.

**Locked behavior:**

- Extend nav chain from `teleportation → sandbox` to `teleportation → grover → sandbox` unless Phase 3 has inserted `/superdense-coding` first by the time this phase executes. If Phase 3 exists, Grover should follow `/superdense-coding`.
- Add `/grover` to `ConceptMap.astro`, `tests/essays/concept-map.test.ts`, `tests/essays/nav-graph.test.ts`, `tests/essays/sandbox-links.test.ts`, `bundle-budget.json`, and route lists such as sitemap/homepage if present.
- Set an initial `/grover` bundle ceiling conservatively, then recompute after build using the existing `round_up(actual × 1.2, 1024)` norm.
- Lighthouse mobile accessibility target: ≥ 95 in light and dark themes. Widgets need labels, keyboard operability, visible focus, and reduced-motion behavior.

### D-10 — the agent's Discretion

The planner/executor may decide:

- Exact component split: single `AmplitudeBars.astro` owning controls vs `GroverIterator.astro` wrapper + dumb bars.
- Exact color palette for positive/negative signed amplitudes, as long as contrast passes in both themes and sign is clear without relying only on hue.
- Whether the first interactive demo starts at 3 qubits for readability before offering a 4-qubit mode; final simulator-backed coverage must include 4 qubits for the roadmap success criterion.
- Exact copy and diagrams for the “password hashes absorb Grover by doubling security bits” explanation.
- Whether to include a small 2-qubit Grover `CircuitView` decomposition or a 4-qubit conceptual circuit, provided Qiskit export remains valid.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Planning / requirements

- `.planning/STATE.md` — v3 state, hard guardrails, active architectural decisions, open v3 risks.
- `.planning/ROADMAP.md` § “Phase 4: Grover + Search reality” — authoritative goal, dependencies, success criteria.
- `.planning/REQUIREMENTS.md` — `ALG-04` (Grover oracle/diffusion + AmplitudeBars), `USE-03` (SearchComparison), plus `OPS-04` route-budget implications and carried `REQ-13` simulator cap from `PROJECT.md`.
- `docs/plans/2026-06-29-v3-design.md` §3.5 — intended file sketch (`grover.ts`, `AmplitudeBars`, `GroverIterator`, `SearchComparison`) and pedagogical arc.
- `$HOME/.copilot/session-state/bc64e80e-b224-4be7-8a25-f50b54e81279/files/autonomous-decisions.md` — locked AFK decisions: no analytics, simulator cap, Qiskit export bridge, same-commit mirrors, no user re-ask.

### Quantum model / export

- `src/lib/quantum/simulator.ts` — state-vector representation, qubit-0-is-LSB convention, `MAX_QUBITS = 4`, `state`, `probabilities()`.
- `src/lib/quantum/circuit.ts` — `Circuit`, `Op`, gate vocabulary, `MAX_QUBITS`, `runCircuit`, validation constraints.
- `src/lib/quantum/qiskit.ts` — `toQiskit(circuit, opts?)`, supported op mappings, Qiskit round-trip expectations.
- `src/lib/quantum/index.ts` — public exports; new Grover helpers should be exported here if used by pages/tests.
- `tests/quantum/simulator.test.ts` and `tests/quantum/qiskit.test.ts` — patterns for quantum correctness and exporter drift tests.

### Existing widgets / page patterns

- `src/components/ProbabilityBars.astro` — closest implementation analog for animated basis-state bars and store subscription.
- `src/components/CircuitView.astro` — essay circuit embed with build-time Qiskit text and sandbox remix link.
- `src/components/SandboxLink.astro` — build-time deep-link pattern for starter circuits.
- `src/components/ProtocolStepper.astro` — style/a11y reference only; do not reuse data model for Grover loops.
- `src/layouts/EssayLayout.astro` — essay page shell, footer-nav slot, math appendix, SEO/canonical props.
- `src/pages/deutsch.astro`, `src/pages/cnot-bell.astro`, `src/pages/teleportation.astro` — closest algorithm-essay voice and embed patterns.

### Mirrors / route integration

- `src/components/ConceptMap.astro` — canonical concept-map node/edge source.
- `tests/essays/nav-graph.test.ts` — mirrored reading-path chain; must add `/grover` in same commit as footer-nav changes.
- `tests/essays/concept-map.test.ts` — mirrored concept-map nodes.
- `tests/essays/sandbox-links.test.ts` — mirrored starter circuits for essay sandbox links.
- `bundle-budget.json` — per-route JS ceiling; add `/grover` and recompute after build.
- `src/pages/sitemap.xml.ts` — route list if `/grover` needs inclusion.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `Simulator` in `src/lib/quantum/simulator.ts`: direct state mutation is acceptable inside quantum helpers; Grover oracle/diffusion can operate over `sim.state` with no new runtime dependency.
- `ProbabilityBars.astro`: reuse chart dimensions, basis labels, reduced-motion guard, and `aria-live` pattern; adapt from probabilities to signed amplitudes.
- `CircuitView.astro`: any Grover example circuit gets “Copy as Qiskit” for free; avoid duplicating export UI.
- `SandboxLink.astro`: build-time starter link for `/grover`; mirror in sandbox-link tests.
- `EssayLayout.astro`: established essay scaffold with math appendix and footer-nav.
- `ConceptMap.astro`: hand-placed SVG + mobile list; add Grover without adding graph libraries.

### Established Patterns

- Vanilla Astro + tiny inline scripts; no React/Preact/framework imports.
- One essay route per file in `src/pages/{slug}.astro`.
- Widgets keep client JS minimal and local; formula-only widgets do not need the simulator store if a small self-contained script is cheaper.
- Build-time circuit encoding for essay CTAs; test mirrors intentionally duplicate source constants.
- Same-commit mirror updates are mandatory for nav, concept map, and sandbox starter drift.
- Route bundle ceilings are explicit and enforced; use measured 20% headroom after build.
- Accessibility is designed into widgets: semantic controls, focus-visible styles, `aria-live`, no motion-only meaning, reduced-motion support.

### Integration Points

- New code likely lands in `src/lib/quantum/grover.ts`, `src/components/AmplitudeBars.astro`, `src/components/SearchComparison.astro`, optionally `src/components/GroverIterator.astro`, and `src/pages/grover.astro`.
- Export new helpers through `src/lib/quantum/index.ts` if page/tests import from the public barrel.
- Add tests under `tests/quantum/grover.test.ts` for oracle/diffusion/optimal iteration behavior and possibly `tests/components/search-comparison.test.ts` for formula mapping if logic is extracted.
- Update `tests/essays/*` mirrors and `bundle-budget.json` with the route.

</code_context>

<specifics>
## Specific Ideas

- The most important visual beat: iteration `0` shows uniform amplitudes, oracle flips the marked amplitude negative, diffusion reflects around the mean, and repeated loops concentrate probability on the marked state.
- `SearchComparison` should make the speedup feel real but modest: `N = 1024` should look meaningfully better than classical average scan, while still obviously not “instant.”
- The essay should use Grover as the anti-hype bridge between Deutsch/Teleportation style “quantum is weird and useful” and Shor’s “yes, this one is the crypto earthquake.”
- For larger-N examples, prefer text/formula/Qiskit-export framing over hidden simulator tricks. The site’s trust comes from not pretending to simulate what it does not simulate.

</specifics>

<deferred>
## Deferred Ideas

- **Clickable bars to choose the marked state** — nice direct manipulation, but dropdown is locked for Phase 4 to keep a11y/scope clean. Revisit as polish if the core phase lands early.
- **New arbitrary multi-controlled gate or oracle `Op` in `Circuit`** — defer unless planning proves Qiskit/sandbox correctness requires it. Current preference is state-vector helpers plus small supported example circuits.
- **Full Shor/RSA/PQC treatment** — Phase 5. Phase 4 only hands off.
- **Track-grouped concept map** — Phase 6 audit per locked autonomous decisions; Phase 4 just adds the node cleanly.
- **Simulator >4 qubits** — explicitly out of scope; Qiskit export is the bridge.

</deferred>

---

*Phase: 04-grover*
*Context gathered: 2026-06-30 — autonomous smart-discuss run with AFK grey-area decisions locked and documented.*
