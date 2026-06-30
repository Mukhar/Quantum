# Phase 6: VQE + Chemistry + v3 launch - Context

**Gathered:** 2026-06-30T06:47:31+05:30  
**Status:** Ready for planning  
**Mode:** Autonomous smart-discuss run spawned by `/gsd-autonomous`; user Mukhar is AFK. Do not re-ask any grey-area decisions below.  
**Source:** Locked user decisions in `/Users/m0j0f4p/.copilot/session-state/bc64e80e-b224-4be7-8a25-f50b54e81279/files/autonomous-decisions.md` plus the Phase-6 AFK instruction block.

<domain>
## Phase Boundary

Phase 6 is the final v3.0 phase. It ships `/vqe`, the variational / hybrid algorithm essay, and then closes the milestone with the local-only progress indicator, v3 operational audits, and launch artifacts.

The user-facing story is:

1. **Algorithm half:** VQE as a hybrid loop — choose ansatz parameters, run a small circuit, estimate energy, let a classical optimizer descend.
2. **Interactive center:** `EnergyLandscape` shows a 2-parameter H2-like energy surface; reader drags the marker by default or clicks **Auto-descend** to animate optimizer steps.
3. **Use-case half:** chemistry / materials / drug-discovery framing via `MoleculeGallery` with pre-baked H2, LiH, and HeH+ results.
4. **Milestone tail:** concept-map visited state for all essays, launch a11y/bundle audits, concept-map layout audit, and v3 announcement draft.

In scope:

1. `src/lib/quantum/vqe.ts` — vanilla TypeScript optimizer, roughly 50-100 LOC, finite-difference gradient descent with momentum and a small adaptive guard. Tests must assert convergence on:
   - a 1D parabola; and
   - the 2-parameter H2 energy surface within `1e-3` of the true minimum.
2. `src/components/EnergyLandscape.astro` — SSR 50×50 2D heatmap + contour lines; hydrated marker drag and Auto-descend animation only where needed.
3. `src/components/MoleculeGallery.astro` — 3 pre-baked molecules: H2, LiH, HeH+; each card shows equilibrium/bond distance UI, saved ansatz parameters, converged energy in Hartree and eV, and a Qiskit-export affordance.
4. Static molecule data in `src/data/molecules.json` — separate from the view, deterministic, and testable.
5. `src/pages/vqe.astro` — essay page with VQE story, parameterized circuit render, EnergyLandscape, MoleculeGallery, chemistry near-term industrial framing, citations, self-test, and footer-nav.
6. `PROG-01` local visited indicator — `localStorage["quantum/visited"]` array of route paths, flipped when an essay scrolls past 50%, read by the concept map to render visited nodes brighter. **No analytics.**
7. Same-commit mirrors for route/list changes: concept-map mirror, nav graph, sandbox starter mirror, bundle-budget route entry, sitemap/homepage route lists if present.
8. OPS close-out artifacts under `.planning/phases/06-vqe/`:
   - `V3-LAUNCH-ANNOUNCEMENT.md`
   - `BUNDLE-AUDIT.md`
   - `LIGHTHOUSE-PLAN.md`
   - concept-map layout audit note/result, either inside one of the above or as a clearly referenced close-out artifact.
9. Final verification: Lighthouse mobile accessibility target ≥ 95 across all v3 routes in both themes; bundle ceilings re-verified; v3 announcement committed.

Out of scope:

- Raising the simulator or sandbox above the 4-qubit cap. VQE demo circuits must fit; larger chemistry examples are pre-baked and exported to Qiskit, not simulated live in browser.
- New runtime dependencies, charting libraries, graph libraries, analytics SDKs, or backend services.
- Real quantum-hardware integration, API calls, authentication, or telemetry.
- 3D energy landscape rendering for v3. Use 2D heatmap + contours now; 3D mesh is deferred.
- A full chemistry package, Hamiltonian builder, or live molecular integral computation. Molecules are static teaching data.
- Concept-map track grouping as a default. Ship flat first; group only if the Phase-6 close-out audit says 10 nodes look cluttered.
- Reworking prior v3 essay content beyond route/nav/progress instrumentation required for `PROG-01` and OPS audits.

</domain>

<decisions>
## Implementation Decisions

### VQE optimizer and energy model

- **D-01: Optimizer = finite-difference gradient descent with momentum.**  
  Rationale: It is the most pedagogical choice for a 2-parameter surface. Readers can understand “sample nearby points, estimate slope, step downhill,” and the Auto-descend animation can display exactly those steps. SPSA is closer to noisy-hardware practice, but its stochastic perturbations make the demo harder to teach and test. Nelder-Mead avoids gradients but makes each simplex move less intuitive for the essay.

- **D-02: Step size = fixed default with a small adaptive guard.**  
  Rationale: A stable fixed learning rate creates predictable animation pacing and deterministic tests. Add a simple guard such as “if proposed energy increases, reduce step size / retry” rather than full Armijo backtracking. Armijo is a good stretch goal but too much optimizer machinery for the target 50-100 LOC.

- **D-03: Momentum is part of the default optimizer path, not an optional advanced mode.**  
  Rationale: Momentum makes descent smoother on the shallow parts of the H2 surface and gives the animation a satisfying trajectory. Keep parameters conservative and testable; do not expose a full optimizer-settings panel unless the planner proves it is needed.

- **D-04: Initial H2 parameters are fixed-seed by default.**  
  Rationale: The first read-through must be reproducible for screenshots, tests, prose, and launch QA. Random initial parameters would make the default narrative and visual path drift.

- **D-05: Provide a “Reseed” control for exploration.**  
  Rationale: The user explicitly wants readers to explore other basins without sacrificing deterministic defaults. Use an in-component deterministic PRNG/seed index or precomputed starts; do not call network services and do not make test assertions depend on `Math.random()`.

- **D-06: `src/lib/quantum/vqe.ts` should stay small, pure, and UI-agnostic.**  
  Candidate API surface:
  - `gradientDescent({ f, initial, learningRate, momentum, maxSteps, tolerance }): OptimizerStep[]`
  - `h2Energy(theta1, theta2): number`
  - `findMinimum(surface, initial): OptimizerStep[]` if useful
  - `interpolateSurface(samples, theta1, theta2): number` if the widget needs shared interpolation logic
  
  Rationale: Tests can cover optimizer math without Astro/hydration. Widgets consume step snapshots instead of duplicating optimizer state.

- **D-07: H2 energy surface can be an analytic/toy-but-honest surface, not a full ab initio calculation.**  
  Rationale: Requirements demand convergence on a 2-parameter H2 energy surface within `1e-3`, not live Hartree-Fock/chemistry integrals. Use a documented, deterministic pedagogical surface with known minimum and chemistry-framed units. If using pre-baked coefficients from a known minimal-basis H2 VQE example, cite the source in prose/data comments and tests.

- **D-08: Parameterized circuit rendering must use existing `rot` ops (`Ry`, `Rz`) and update theta per optimizer step.**  
  Rationale: `src/lib/quantum/circuit.ts` already supports `{ kind: "rot"; axis: "Y" | "Z"; theta }`, `runCircuit()` applies rotations through `Simulator.applyRotation()`, and `toQiskit()` emits `qc.ry(...)` / `qc.rz(...)`. Do not add new parameterized gate kinds unless absolutely necessary.

- **D-09: Export `vqe.ts` helpers through `src/lib/quantum/index.ts` if pages/tests import from the quantum barrel.**  
  Rationale: Existing code comments say importers should reach for the barrel. Follow the project’s established surface-area pattern.

### EnergyLandscape UX and rendering

- **D-10: Default interaction = draggable marker.**  
  Rationale: User lock. The page should invite direct manipulation first; Auto-descend is a button for seeing the optimizer loop after the reader has oriented themselves.

- **D-11: Include an “Auto-descend” button that animates optimizer steps.**  
  Rationale: User lock and `ALG-09`. The animation must use the same optimizer snapshots that tests validate, not a hand-authored path. The marker should move along the computed trajectory and update energy/parameter readouts.

- **D-12: Render as a 2D heatmap with contour lines, not a 3D mesh.**  
  Rationale: 2D works on mobile, is accessible to keyboard/touch users, needs no 3D library, and makes a draggable cursor trivial. 3D would be visually impressive but expensive, harder to label, and out of sync with the “no new runtime deps” guard.

- **D-13: Surface resolution = 50×50 sampled at build time.**  
  Rationale: Pure SSR keeps initial JS small and aligns with OPS-04. A 50×50 grid is enough for smooth interpolation and contour bands while remaining tiny as inline data. Runtime drag should interpolate between samples; it should not recompute a dense surface on every pointer move.

- **D-14: Color scale = custom two-color brand-aligned gradient, verified in both themes.**  
  Rationale: The user selected brand alignment over viridis. The planner/executor must still check contrast and make low/high meanings clear without relying only on hue. Low energy should be visibly distinct in dark and light themes.

- **D-15: Contours should be semantic, not decorative.**  
  Rationale: Contours help readers see basins and downhill direction. Include accessible text summaries such as current `θ₁`, `θ₂`, energy, and “distance from minimum” so the information is not only color/line based.

- **D-16: Pointer/touch drag, keyboard nudging, and reduced-motion behavior are required.**  
  Rationale: OPS-01 Lighthouse a11y and mobile targets apply. Marker drag must have a keyboard equivalent (e.g. arrow keys adjust parameters), visible focus, labels, and animation disabled or shortened under `prefers-reduced-motion`.

- **D-17: Hydration should be local to EnergyLandscape.**  
  Rationale: Use a small inline/client script or component client module only for marker interaction and animation. Avoid global store coupling; do not import sandbox hydrators.

### Parameterized ansatz and CircuitView / Qiskit bridge

- **D-18: Use existing `CircuitView.astro` for ≤4-qubit VQE ansatz circuits when possible.**  
  Rationale: `CircuitView` already renders static SVG circuits and bakes a “Copy as Qiskit” button. It supports rotation labels and Qiskit export via `rotOp("Y"/"Z", ..., theta)`.

- **D-19: If theta must update live during optimizer animation, planner may add a slim VQE-specific circuit readout rather than overloading `CircuitView`.**  
  Rationale: Current `CircuitView` computes Qiskit text at SSR and is static. EnergyLandscape’s animated theta readout may need either rerendered labels in the landscape widget or a dedicated `AnsatzCircuit.astro` / client readout. Keep `CircuitView` for static export snapshots; do not force global changes into it for a single animated display.

- **D-20: Qiskit export for molecule cards uses static converged parameters.**  
  Rationale: `MoleculeGallery` cards are pre-baked. Their Qiskit snippets should be deterministic and copyable, using the same exporter or a small helper wrapping `Circuit` values with converged `Ry/Rz` angles.

- **D-21: Do not weaken `MAX_QUBITS = 4` to make chemistry examples look bigger.**  
  Rationale: STATE, PROJECT, and previous phase contexts hard-lock this. Larger molecules are represented by pre-baked data and Qiskit export, not in-browser simulation.

### MoleculeGallery data and UX

- **D-22: Ship all 3 molecules: H2, LiH, and HeH+.**  
  Rationale: The user selected all 3. Together they fan out the chemistry story: H2 as the minimal VQE intuition, LiH as a common toy chemistry benchmark, and HeH+ as a tiny charged molecule that broadens the examples.

- **D-23: Card layout is confirmed.**  
  Each card shows:
  - molecule name;
  - atomic distance slider, frozen at equilibrium by default;
  - saved/converged ansatz parameters;
  - converged energy in Hartree and eV;
  - Qiskit-export button.
  
  Rationale: This exact layout was provided as a lock. The slider may be non-destructive/exploratory if only equilibrium data is available; avoid implying live ab initio recomputation if data is static.

- **D-24: Pre-baked converged parameters live in `src/data/molecules.json`.**  
  Rationale: Static JSON is testable, easy to extend, and keeps view code clean. Tests can validate schema, required molecules, finite numeric parameters, energy units, and Qiskit export inputs without parsing Astro.

- **D-25: Molecule data must be honest about what is pre-baked.**  
  Rationale: v1’s trust promise depends on not overstating. Use labels like “precomputed VQE result” and “equilibrium distance” where appropriate. If bond slider changes are illustrative rather than recomputed, say so.

- **D-26: Use Hartree as the primary scientific unit and eV as the developer-friendly secondary unit.**  
  Rationale: Hartree is standard for quantum chemistry; eV helps readers map magnitude. Store both if known, or store Hartree and compute eV with a named constant in tests/helpers.

### `/vqe` essay narrative

- **D-27: Essay hook = near-term industrial credibility, not quantum hype.**  
  Rationale: VQE is the v3 close because variational/hybrid methods are the credible NISQ-era story. The prose must emphasize chemistry/materials promise while stating the reality check: small molecules, noisy devices, and classical baselines like HF/CCSD remain hard competition.

- **D-28: Follow the v3 two-half essay skeleton.**  
  Rationale: Design doc §5.2 locks the rhythm: algorithm half, hand-off paragraph, use-case hook, use-case widget, reality check, Qiskit CTA, self-test, what’s next.

- **D-29: “Energy minimization” is the conceptual bridge.**  
  Rationale: Readers should leave with the loop in their head: parameters → quantum circuit → energy estimate → classical optimizer → lower energy. EnergyLandscape and MoleculeGallery should both reinforce that one loop.

- **D-30: VQE should not imply production drug discovery is solved.**  
  Rationale: Use careful language: “credible near-term direction,” “active research,” “small benchmark molecules,” “materials/drug discovery motivation,” not “VQE will discover drugs now.” Source or caveat any industry claims.

### PROG-01 visited indicator

- **D-31: Scroll threshold = 50% page depth.**  
  Rationale: ROADMAP success criterion and user lock. This supersedes the older design-doc §4.4 sketch that mentioned 90%.

- **D-32: Persistence key = `localStorage["quantum/visited"]`, value = array of route paths.**  
  Rationale: User re-asserted this exact key and array shape. This supersedes the older design-doc §4.4 sketch using `quantum/progress/<slug>` timestamp keys.

- **D-33: No analytics, no server, no beacon, no aggregate count.**  
  Rationale: Cross-cutting guardrail. This feature is local-only personalization. It must not emit network requests or encode visited state into URLs.

- **D-34: Concept-map indicator = dim → bright color change, not checkmark badge.**  
  Rationale: User selected visual continuity with the existing concept map. Checkmarks are too utilitarian for the brand. Brightness must still be accessible; pair with `aria-label` or visually hidden text so visited state is announced.

- **D-35: Implement visited tracking as a small reusable progress helper plus one tiny page/ConceptMap hydrator.**  
  Rationale: Design doc suggested `src/lib/progress.ts` and `ConceptMapProgress.client.ts`; adapt names as needed, but keep logic local, tested, and dependency-free. Do not make every essay carry bespoke localStorage code.

- **D-36: Instrument all essays in the reading path, not only `/vqe`.**  
  Rationale: `PROG-01` requires per-essay flags for the full 10-essay set after v3. If Phase 5 split produced 5a/5b route count changes, planner must reconcile the exact route list before tests.

### Concept-map layout audit

- **D-37: Ship flat layout first.**  
  Rationale: User lock. Do not preemptively group into algorithm/use-case columns or tracks.

- **D-38: Audit at Phase-6 close-out after all nodes exist.**  
  Rationale: The only honest way to decide clutter is to view the actual 10-node map in both desktop SVG and mobile fallback after all v3 routes have landed.

- **D-39: Add track grouping only if the flat map looks cluttered with 10 nodes.**  
  Rationale: The design doc suggests grouping as a contingency. If needed, acceptable grouping can use algorithm column vs use-case/application column or named tracks, but it must be treated as visual refactor plus mirror updates, not as a new product capability.

### OPS launch artifacts and close-out

- **D-40: v3 announcement artifact path = `.planning/phases/06-vqe/V3-LAUNCH-ANNOUNCEMENT.md`.**  
  Rationale: User selected a separate file matching v2’s launch-polish pattern. Reuse the tone and checklist style from `.planning/phases/_archive-v2/04-launch-polish/LAUNCH-ANNOUNCEMENT.md`.

- **D-41: Bundle audit artifact path = `.planning/phases/06-vqe/BUNDLE-AUDIT.md`.**  
  Rationale: User selected this path. It must capture final bundle delta vs v2 baseline and per-route deltas/ceilings after all v3 routes are present.

- **D-42: Lighthouse artifact path = `.planning/phases/06-vqe/LIGHTHOUSE-PLAN.md`.**  
  Rationale: User selected this path. Match the v2 Lighthouse plan structure, but target all v3 routes and both themes for mobile a11y ≥ 95.

- **D-43: Preserve OPS-04 route-budget discipline.**  
  Rationale: Existing `bundle-budget.json` is the CI gate. Add `/vqe` and any missing v3 routes in the same commits as routes land, then recompute ceilings at close-out with the established `round_up(actual × 1.2, 1024)` convention.

- **D-44: Lighthouse route count depends on Phase 5 final shape.**  
  Rationale: ROADMAP says 5 new routes, but user notes “or 6 if 5a/5b split.” Planner must inspect Phase 5 outcome before writing the final route matrix.

- **D-45: Same-commit mirror discipline remains mandatory.**  
  Rationale: Tests intentionally mirror canonical lists. Touch source and test mirrors together for concept-map nodes, nav chain, sandbox starters, route budgets, and any sitemap/homepage route lists.

### Agent discretion

- Exact TypeScript function names and component split are planner/executor discretion if the locked behavior above remains intact.
- Exact H2 surface formula / coefficients are planner discretion, but tests must know the true minimum and pass the `1e-3` convergence criterion.
- Exact seed value(s), learning rate, momentum coefficient, retry/guard constants, max iterations, and animation duration are planner discretion if deterministic and documented in code/tests.
- Exact contour levels and color stops are planner discretion if accessible in both themes and aligned with existing tokens.
- Exact molecule numbers are planner discretion only if sourced or clearly marked as pre-baked pedagogical examples.
- Exact wording of v3 announcement is writer discretion; preserve the no-hype/no-analytics/no-backend tone.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Locked planning / user decisions

- `/Users/m0j0f4p/.copilot/session-state/bc64e80e-b224-4be7-8a25-f50b54e81279/files/autonomous-decisions.md` — authoritative AFK decisions: EnergyLandscape draggable + Auto-descend, flat concept map first, no analytics, vanilla TS + `signal<T>`, same-commit mirrors, bundle guardrails.
- `.planning/STATE.md` — v3 status, active guardrails, simulator cap, Qiskit bridge, OPS-04 bundle risk, VQE optimizer risk.
- `.planning/ROADMAP.md` § “Phase 6: VQE + Chemistry + v3 launch” — authoritative Phase-6 goal and success criteria.
- `.planning/REQUIREMENTS.md` — `ALG-08`, `ALG-09`, `USE-05`, `PROG-01`, `OPS-01`, `OPS-02`, `OPS-03`, `OPS-04`.
- `docs/plans/2026-06-29-v3-design.md` §3.7, §4.1-4.4, §5.1-5.2 — VQE file sketch, algorithm/use-case flow, concept-map progress sketch. Note: Phase-6 user locks supersede §4.4 on 90% threshold / timestamp key.

### Prior phase context / patterns

- `.planning/phases/01-foundation/PHASE-CONTEXT.md` — Qiskit export contract and bundle-budget protocol.
- `.planning/phases/02-teleportation/PHASE-CONTEXT.md` — shared widget/store discipline, no analytics, no simulator cap creep.
- `.planning/phases/04-grover/PHASE-CONTEXT.md` — recent smart-discuss shape, route/mirror/bundle close-out pattern.
- `.planning/phases/05-shor/PHASE-CONTEXT.md` — split-aware planning pattern, large-circuit/Qiskit bridge risk handling, source-every-hype-prone-claim discipline.

### Quantum core and parameterized circuits

- `src/lib/quantum/simulator.ts` — `MAX_QUBITS = 4`, state-vector layout, Qiskit bit convention, `applyRotation(axis, qubit, theta)`, `probabilities()`.
- `src/lib/quantum/circuit.ts` — `Circuit`, `Op`, `rotOp`, `runCircuit`, validation rules, `MAX_STEPS`, append-only op vocabulary.
- `src/lib/quantum/gates.ts` — `Ry`/`Rz` rotation matrices and rotation-axis definitions.
- `src/lib/quantum/qiskit.ts` — `toQiskit()` maps `rot` ops to `qc.ry` / `qc.rz`; validates circuits and embeds codec fragment.
- `src/lib/quantum/index.ts` — public quantum barrel; new VQE helpers should be exported here when consumed by tests/pages.
- `tests/quantum/simulator.test.ts`, `tests/quantum/rotations.test.ts`, `tests/quantum/qiskit.test.ts` — existing quantum correctness/export testing patterns.

### Components and page integration

- `src/components/CircuitView.astro` — static read-only SVG circuit renderer with baked Qiskit button; supports rotation labels but not live theta mutation.
- `src/components/ConceptMap.astro` — canonical concept-map nodes/edges and mobile fallback; progress styling and flat-layout audit target.
- `src/pages/index.astro` — homepage imports `ConceptMap`; likely integration point for visited-state hydrator.
- `src/lib/sandbox/signal.ts` — in-repo `signal<T>` primitive for small reactive widgets; preferred over any new dependency.
- `src/components/ProbabilityBars.astro` and any Phase-4 `AmplitudeBars.astro` if landed by planning time — closest patterns for small SVG + hydrated readout widgets.
- `src/layouts/EssayLayout.astro` and current v3 essay pages (`teleportation.astro`, plus `/superdense-coding`, `/grover`, `/shor` if landed) — essay shell, footer-nav, and self-test patterns.

### Mirrors, budgets, and OPS artifacts

- `tests/essays/nav-graph.test.ts` — mirrored reading-path chain; `/vqe` must be inserted at the correct tail position when route lands.
- `tests/essays/concept-map.test.ts` — mirrored concept-map nodes; update with all v3 nodes and visited-state expectations as needed.
- `tests/essays/sandbox-links.test.ts` — mirrored starter circuits; add a ≤4-qubit VQE ansatz starter if `/vqe` exposes sandbox remix.
- `bundle-budget.json` — per-route JS ceiling; add `/vqe` and close-out ceilings.
- `.planning/phases/_archive-v2/04-launch-polish/LAUNCH-ANNOUNCEMENT.md` — launch announcement tone, structure, and launch-day checklist pattern.
- `.planning/phases/_archive-v2/04-launch-polish/LIGHTHOUSE-PLAN.md` — Lighthouse plan structure and manual-run recipe pattern.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `Simulator.applyRotation()` already supports parameterized single-qubit gates; no simulator extension is needed for a 2-parameter Ry/Rz ansatz.
- `rotOp("Y" | "Z", qubit, theta)` plus `toQiskit()` already emits valid Qiskit rotation calls, making VQE circuit export mostly a data/construction problem.
- `CircuitView.astro` gives static ansatz diagrams and “Copy as Qiskit” for free when parameters are fixed at SSR time.
- `src/lib/sandbox/signal.ts` is a 40-line reactive primitive suitable for EnergyLandscape state if explicit subscriptions are useful.
- `ConceptMap.astro` is hand-placed SVG with a mobile list fallback; visited state must support both surfaces.
- `bundle-budget.json` already centralizes OPS-04 route ceilings and documents the `actual × 1.2` rounding convention.

### Established Patterns

- Vanilla TypeScript first; no new runtime dependencies for widgets, optimizers, progress state, charts, or concept-map layout.
- Pure/testable algorithm helpers live under `src/lib/quantum/` and are covered by Vitest before page integration.
- Essay widgets use small, scoped hydration. Do not import sandbox composer/hydrators into essay pages.
- Source-of-truth arrays in Astro files are mirrored by tests because Astro components are not imported into Vitest.
- Qubit 0 is least-significant bit, matching Qiskit. Preserve this in ansatz circuits and any labels.
- Route additions touch nav, concept-map, sandbox starter tests, budgets, and sitemap/homepage lists in the same commit.
- No analytics. Browser-local storage is acceptable only when it remains same-device, same-origin, and never transmitted.

### Integration Points

- Add `src/lib/quantum/vqe.ts` and tests under `tests/quantum/vqe.test.ts` or equivalent.
- Add `src/data/molecules.json` plus schema/data tests; import from `MoleculeGallery.astro` at build time.
- Add `src/components/EnergyLandscape.astro` and, if useful, a colocated client module for drag/animation.
- Add `src/components/MoleculeGallery.astro`; consider a tiny helper for molecule-to-circuit/Qiskit snippets if `CircuitView` is not a direct fit inside cards.
- Add `src/pages/vqe.astro`; insert it after `/shor` and before `/sandbox` in the reading chain unless Phase 5 split changed the final route list.
- Add `src/lib/progress.ts` or equivalent, plus a page-level scroll-depth hydrator and ConceptMap visited-state hydrator.
- Add Phase-6 OPS docs at the exact user-selected paths in `.planning/phases/06-vqe/`.

### Integration Risks

- `CircuitView.astro` is SSR/static. Live theta animation cannot simply “update CircuitView” unless a new client-side readout is added.
- Design doc §4.4 conflicts with current user locks for progress threshold/key/indicator. Use the user locks in this file.
- `EnergyLandscape` can easily become the largest new JS chunk if implemented as a canvas/charting mini-app. Keep grid SSR and JS minimal.
- Molecule chemistry claims can become hype. Use conservative language and source/caveat benchmark numbers.
- Concept-map flat layout may be visually cramped after all v3 nodes land. Audit before grouping; do not group preemptively.
- Phase 5 may have split into 5a/5b. Planner must inspect actual routes before final Lighthouse/nav/progress matrices.

</code_context>

<specifics>
## Specific Ideas

- First-screen VQE mental model: “The quantum computer tries a wavefunction; the classical computer turns the knobs.” EnergyLandscape should make “turns the knobs” literal.
- EnergyLandscape default marker starts at a fixed seed point away from the minimum; Auto-descend traces a smooth path into the basin while parameter/energy readouts tick.
- Use labels like `θ₁` and `θ₂` in the UI, but always pair them with plain-language captions: “rotation on qubit 0,” “phase rotation,” or similar.
- The H2 panel should explicitly state the true/minimum reference used for the `1e-3` test so planner/executor do not hide correctness in visual approximations.
- MoleculeGallery should feel like “recipe cards” for real experiments: molecule, geometry, ansatz parameters, final energy, copy to Qiskit.
- HeH+ inclusion is intentional even if simple copy says “charged molecule”; do not drop it to simplify unless the user later changes scope.
- The progress indicator should feel native to the existing map: unvisited nodes remain current/dim style; visited nodes brighten via existing accent/positive tokens and include accessible text.
- OPS docs are deliverables, not optional notes. Plan Phase 6 so implementation work ends with enough time for bundle/Lighthouse/layout/announcement close-out.

## Preliminary Plan Count Estimate

Likely **7-9 plans** if planned with clean verification boundaries:

1. VQE optimizer math + H2 surface + tests (`vqe.ts`).
2. VQE ansatz circuit helpers / static export examples using Ry/Rz.
3. `EnergyLandscape` SSR grid + drag/keyboard interaction.
4. Auto-descend animation wired to optimizer snapshots and reduced-motion behavior.
5. `molecules.json` data + `MoleculeGallery` + Qiskit export card tests.
6. `/vqe` essay integration, narrative, footer-nav, sandbox starter.
7. `PROG-01` progress helper + essay scroll instrumentation + ConceptMap visited rendering + tests.
8. Mirrors, route budget, sitemap/homepage, build/test close-out.
9. OPS docs: Lighthouse plan, bundle audit, layout audit, v3 announcement draft.

The planner may merge adjacent UI/integration work if tests remain atomic, but should not bury OPS close-out under a broad “polish” task.

</specifics>

<deferred>
## Deferred Ideas

- 3D energy landscape mesh — deferred; 2D heatmap + contours is locked for v3.
- SPSA/noisy-hardware optimizer mode — document as industry-standard context in prose, but do not implement unless future phase asks for hardware-noise demos.
- Full Armijo backtracking optimizer — stretch/future; fixed step with small adaptive guard is locked.
- Live ab initio molecule computation or chemistry package integration — out of scope; static JSON/pre-baked examples only.
- Account-based, synced, or analytics-backed progress — permanently out of scope under the no-analytics promise.
- Preemptive track-grouped concept map — deferred until close-out audit proves flat layout is cluttered.
- General large-circuit simulator or sandbox >4 qubits — out of scope; Qiskit export remains the bridge.

</deferred>

---

*Phase: 06-vqe*  
*Context gathered: 2026-06-30 — autonomous smart-discuss for final v3 phase.*
