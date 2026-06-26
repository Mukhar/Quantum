# Phase 4 Plan — Foundations Essay Track

**Phase goal:** Ship the 4 remaining foundational essays (superposition,
measurement, gates, entanglement), tie them and Phase 2's qubit essay
together with a visual concept-map homepage, and add cross-essay
prev/next nav. Every essay deep-links into the Phase 3 sandbox via a
pre-loaded starter circuit — the payoff for shipping the sandbox
second.

**Depends on:** Phase 2 (essay layout + widget kit), Phase 3 (circuit
codec + sandbox).

## Definition of Done (phase-level)

1. Five essays total live on the site: `/qubit` (unchanged),
   `/superposition`, `/measurement`, `/gates`, `/entanglement`.
2. Every Phase-4 essay carries at least one **"Open in sandbox →"**
   CTA pointing at a static, build-time-encoded URL fragment that
   round-trips through `decodeCircuit` back to the starter circuit.
3. Homepage replaces the placeholder shell with `<ConceptMap />`: a
   hand-rolled SVG nav with nodes for all 5 essays + sandbox +
   challenges + dimmed v2 placeholders. Mobile falls back to a
   stacked list. WCAG 2.2 AA contrast + focus rings on every node.
4. Cross-essay nav (prev/next slugs in EssayLayout footer) follows
   the reading order: qubit → superposition → measurement → gates →
   entanglement → /sandbox. `/qubit`'s footer-nav placeholder
   ("Next: Superposition (Phase 4)") gets replaced with a real link.
5. The entanglement essay uses a 2-qubit Bloch + reduced-density
   visualization (re-using `ResultsPanel` or its extracted renderer).
6. Phase 2 + Phase 3 routes still build, still pass all tests, still
   respect `prefers-reduced-motion`. No bundle-size regression > 5%
   on any pre-existing route.
7. Test count grows by at least 8 (one round-trip assertion per
   essay's starter circuit + a concept-map link audit + a
   prev/next-graph integrity test).

## Plans

> Execute in order. Plans 04-02 / 04-03 / 04-04 / 04-05 share zero
> code and may be dispatched in parallel sub-agent contexts. 04-01
> must land first (every essay imports `SandboxLink`); 04-06 last.

### 04-01 — `SandboxLink.astro` + `ConceptMap.astro` + homepage rewire

**Why:** Both are infrastructure every subsequent plan reuses.
SandboxLink is the deep-link primitive each essay imports.
ConceptMap is the homepage rewrite. Ship them together — the homepage
needs the map and the essays need the link.

**Deliverables:**
- `src/components/SandboxLink.astro` — receives a `Circuit`, runs
  `encodeCircuit` in frontmatter, emits a static `<a class="…"
  href="/sandbox#…">` with a slot for the label. Default styling is
  an inline emerald button consistent with the sandbox toolbar.
- `src/components/ConceptMap.astro` — hand-rolled SVG (desktop +
  tablet) + stacked `<ol>` fallback under 640 px. Nodes:
  - 5 live essays (qubit, superposition, measurement, gates,
    entanglement), each a `<a>` with focus ring
  - 2 utility nodes (sandbox, challenges)
  - 2 dimmed v2 placeholders (CNOT+Bell, Deutsch) — `<div>` not `<a>`,
    `aria-disabled="true"`
  - Edges show the recommended path; sandbox + challenges are
    connected to qubit (entry) and entanglement (exit).
- `src/pages/index.astro` — replace the placeholder shell with
  `<ConceptMap />` + a one-paragraph site mission blurb above it.
- `tests/essays/concept-map.test.ts` — parse the rendered SVG,
  assert every essay slug appears exactly once as a live link and
  every v2 placeholder appears exactly once as a non-link.

**Acceptance:**
- `/` renders the map; clicking any live node lands on the right page.
- Build still green, no warnings.
- AA contrast verified on node text against the dark background.

---

### 04-02 — Superposition essay (`/superposition`)

**Why:** The natural sequel to `/qubit`. Lifts "press H and the bars
split" from a magic trick into the linear-combination story:
amplitudes can be negative (interference preview), magnitudes ≠
probabilities, and superposition is what makes everything else work.

**Deliverables:**
- `src/pages/superposition.astro` — full essay following the
  qubit-essay template (hook → intuition → widget → math → check →
  next).
- Widgets: `GateButtons` (H, Z), `ProbabilityBars`, `StateVector`,
  one `RotationSlider` for Rx — same store key throughout
  (`"superposition-essay"`).
- One `<SandboxLink>` with the starter circuit `1 qubit, [H]` so the
  reader can build on the canonical superposition state.
- `MathNerds` collapsible covering the `α|0⟩ + β|1⟩` notation, the
  inner product, and a one-paragraph aside on amplitudes vs.
  probabilities.
- 1–2 question self-test (REQ-12) at the end.
- Footer nav: prev = `/qubit`, next = `/measurement`.

**Acceptance:**
- Page renders, all widgets respond to input, sandbox link's URL
  decodes back to `[H on q0]`.
- Essay copy: 750–1,400 words, voice matches `/qubit`.

---

### 04-03 — Measurement essay (`/measurement`)

**Why:** "It collapses" is the standard hand-wave; this essay teaches
the rule (Born + projection) using the widget kit, and shows
basis-dependence by letting the reader insert an H *before* the
measurement and watch the same circuit produce different
distributions.

**Deliverables:**
- `src/pages/measurement.astro` — same template.
- Widgets: `GateButtons`, `ProbabilityBars` (the histogram is the
  story), `StateVector`. Demonstrate repeated-measure intuition by
  letting the reader press a "Run 100" button (small new helper that
  re-runs `runCircuit` 100× with `Math.random` and tallies — keep it
  to ~40 LOC inline in the page).
- One `<SandboxLink>` with starter circuit `1 qubit, [H, measure on
  q0]` — invites the reader to swap the H for an X or remove it and
  see the histogram flatten / spike.
- `MathNerds` collapsible: Born rule, projectors, post-measurement
  state.
- Self-test.
- Footer nav: prev = `/superposition`, next = `/gates`.

**Acceptance:**
- "Run 100" returns sensible distributions (visibly close to 50/50
  for `[H, measure]`, 100/0 for `[measure]`).
- Sandbox link decodes back to the documented starter circuit.

---

### 04-04 — Gates essay (`/gates`)

**Why:** The "what IS a gate" essay. Reframes gates as unitaries =
rotations, distinguishes discrete (X, Y, Z, H, S, T) from continuous
(Rx, Ry, Rz), and uses the Bloch sphere as the geometric anchor.
Direct payoff for the reader: every gate they've already seen in
`/qubit` and `/superposition` now has a single mental model.

**Deliverables:**
- `src/pages/gates.astro` — same template.
- Widgets: `BlochSphere` (lazy 3D + 2D fallback already in place),
  all three `RotationSlider`s, `GateButtons` for the discrete gates.
- A "decompose this discrete gate" interactive paragraph showing
  how `X ≈ Ry(π)` up to global phase, using the existing
  RotationSlider state-snapshot semantics.
- One `<SandboxLink>` with starter circuit `1 qubit, [Rx(π/3),
  Ry(π/4)]` — the reader can keep stacking rotations and see how
  arbitrary single-qubit unitaries are built.
- `MathNerds` collapsible: `U(2)` vs. `SU(2)`, why θ/2 shows up,
  Euler-angle decomposition.
- Self-test.
- Footer nav: prev = `/measurement`, next = `/entanglement`.

**Acceptance:**
- Sweeping any slider visibly moves the Bloch arrow.
- Sandbox link decodes back to the documented two-rotation circuit.

---

### 04-05 — Entanglement essay (`/entanglement`)

**Why:** The marquee concept. The first essay where 1 qubit is no
longer enough. Teaches the Bell state, what "no separate state for
q0" means visually (Bloch arrow shrinks to the origin), and primes
the reader for the CNOT+Bell essay coming in Phase 5.

**Deliverables:**
- `src/pages/entanglement.astro` — same template, but 2-qubit.
- 2-qubit Bloch visualization: **first preference** — reuse
  `src/components/sandbox/ResultsPanel.astro` directly (it already
  knows how to render per-qubit reduced-density Bloch arrows + the
  "entangled" badge); if that import drags in too much sandbox
  chrome, extract the per-qubit inline-SVG renderer into a new
  shared `src/components/MiniBloch.astro` and use that.
- `ProbabilityBars` over 4 basis states (the widget already handles
  arbitrary qubit count via `storeKey + qubits` props).
- An interactive build-the-Bell-pair section: button to "Apply H"
  then "Apply CNOT(0,1)" then "Reset", with live updates everywhere.
  Reuse Phase 2's `GateButtons` if it can accept a CNOT; otherwise
  add a tiny inline `<button>` that calls into the store.
- One `<SandboxLink>` with starter circuit `2 qubits, [H on q0,
  CNOT(0,1)]` — the canonical Bell pair.
- `MathNerds` collapsible: tensor product, partial trace,
  Schmidt decomposition one-liner.
- Self-test.
- Footer nav: prev = `/gates`, next = `/sandbox`.

**Acceptance:**
- After H+CNOT, the two Bloch arrows shrink to the origin and the
  "entangled" badge appears.
- Sandbox link decodes back to the Bell-pair circuit.

---

### 04-06 — Cross-essay nav wiring, regression pass, Phase-4 SUMMARY

**Why:** The integration plan. Confirms nothing regressed, ties up
the prev/next graph end-to-end, and writes the closeout doc.

**Deliverables:**
- `/qubit` footer: replace placeholder with `<a href="/superposition">
  Next: Superposition →</a>`.
- `tests/essays/sandbox-links.test.ts` — round-trip every starter
  circuit declared across Phase 4 essays (asserts encoding +
  decoding produces the documented op list).
- `tests/essays/nav-graph.test.ts` — walk all five essays' frontmatter
  prev/next declarations, assert the chain is consistent (qubit's
  `next` matches superposition's slug, etc.).
- Run `npx vitest run`, `npx astro build`, `npx tsc --noEmit`. All
  green. Capture before/after gzipped bundle sizes for `/qubit`,
  `/superposition`, `/measurement`, `/gates`, `/entanglement`,
  `/sandbox`, `/`. Document in SUMMARY.
- `.planning/phases/04-foundations/04-SUMMARY.md` shaped like
  `02-SUMMARY` and `03-SUMMARY`: plan table, numbers, locked
  decisions, deferred items, Phase 5 entry checklist.
- Tick Phase 4 [x] in ROADMAP.md and rewrite STATE.md to point at
  Phase 5.

**Acceptance:**
- All tests green, all builds green.
- Manual smoke check: walk qubit → superposition → measurement →
  gates → entanglement → sandbox using only footer-nav links.
- No console errors / warnings on any essay page.

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Essay prose drifts in voice across sub-agents | Each sub-agent gets `/qubit` and `02-SUMMARY` as references; pedagogy review at 04-06 |
| Entanglement essay's 2-qubit Bloch path drags sandbox chrome into the essay bundle | First try direct import; if bundle balloons > 30 KB, extract `MiniBloch.astro` to a shared component |
| Concept map renders awful on small screens | Mobile breakpoint at 640 px stacks to `<ol>`; tested manually before 04-06 closes |
| Three.js loaded on multiple essay pages = bundle confusion | Same chunk, cached on first essay; no fix needed but document in SUMMARY |
| Sandbox link gets too long for chat tools | All starter circuits are tiny (≤ 2 ops); base64url fragments stay under 50 chars — well below the 2 KB cap |
| Run-100 button in measurement essay confuses reader | Tooltip + comment in code; visualization shows the convergence rather than a single roll |

## Out of Scope (this phase)

- CNOT+Bell essay (Phase 5)
- Deutsch's algorithm essay (Phase 5)
- Embedding the sandbox composer inside an essay (Phase 5)
- Multi-language i18n (out of v1)
- Concept-map progress tracking via localStorage (Phase 5 launch polish)
- Pick-a-path alternate reading orders (v2)
