# Phase 4: Foundations Essay Track - Context

**Gathered:** 2026-06-26 (project owner authorized "implement next phase")
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 4 backfills the conceptual essays that round out the v1 reading
arc and replaces the placeholder homepage with the visual concept map
that ties everything together.

**In scope:**
1. Four new essays following the Phase 2 template:
   `/superposition`, `/measurement`, `/gates`, `/entanglement`.
2. Every essay carries at least one **"Open in sandbox →"** CTA that
   deep-links into a pre-loaded circuit via `encodeCircuit()`.
3. A homepage concept-map nav that includes all 5 essays (qubit +
   the new 4), the sandbox, and the challenges hub.
4. Cross-essay prev/next nav driven by the prereq graph.
5. Reuse of Phase 3's multi-qubit results panel (or its underlying
   `reducedDensity` helpers) inside the entanglement essay.
6. A regression pass: Phase 2 & 3 routes still build green and pass
   `prefers-reduced-motion` + AA contrast.

**Out of scope (carried to Phase 5):** CNOT+Bell essay, Deutsch's
algorithm essay, in-essay circuit-builder embed. Out of scope (carried
to v2 or never): server-side gallery, accounts, additional algorithms.

</domain>

<decisions>
## Implementation Decisions

### Essay structure & widget reuse
- Every Phase 4 essay reuses the **Phase 2 EssayLayout + widget kit
  unchanged** — no new framework, no new layout shells. The widgets
  shipped in Phase 2 (`GateButtons`, `ProbabilityBars`, `StateVector`,
  `BlochSphere`, `RotationSlider`, `MathBlock`, `MathNerds`) are
  multi-qubit-capable already and re-keyed per essay via the existing
  `storeKey` registry.
- **No new widget primitives** unless an essay genuinely cannot be
  taught with the existing kit. The entanglement essay is the most
  likely candidate; if it needs a 2-qubit Bloch pair, we either reuse
  `ResultsPanel.astro` from `src/components/sandbox/` or pull its
  inline-SVG renderer into a shared `components/` location.
- Essay copy targets **750–1,400 words** each (same scale as `/qubit`).
- Every essay ends with a 1–2 question self-test (REQ-12) and a
  `MathNerds` collapsible (REQ-07).

### Sandbox deep-link mechanism
- Build a reusable **`SandboxLink.astro`** component in
  `src/components/`. Props:
  - `circuit: Circuit` (required — a real Phase 3 `Circuit` value)
  - `label?: string` (default "Open in sandbox →")
  - `qubits?: number` (default inferred from `circuit.qubits`)
- The component runs **at build time** (Astro frontmatter): imports
  `encodeCircuit` from `@/lib/quantum`, computes the fragment once,
  emits a static `<a href="/sandbox#…">`. Zero runtime cost; works
  with view-source.
- The destination is always `/sandbox` (never `/sandbox/challenges`).
  The challenges hub is its own CTA target if an essay wants it
  separately.
- All essays should sanity-check their starter circuits round-trip
  successfully — vitest test under `tests/essays/sandbox-links.test.ts`.

### Concept map
- The map is **hand-rolled SVG inside an Astro component** at
  `src/components/ConceptMap.astro`. No D3, no library. We have at
  most ~10 nodes total in v1 (5 essays + sandbox + challenges + 2 v2
  placeholders for CNOT+Deutsch); a layout this small is cheaper to
  position by hand than to lay out programmatically.
- Nodes are **clickable links** with visible focus rings (AA). Edges
  are SVG paths showing the recommended reading order (qubit →
  superposition → measurement → gates → entanglement → CNOT+Bell →
  Deutsch). The sandbox + challenges sit off to the side as "you can
  jump in any time" nodes connected to qubit and entanglement.
- Mobile fallback: stack nodes vertically as a styled `<ol>` if the
  viewport is under 640 px. Same hrefs, no map drawing.
- v2 placeholders (CNOT+Bell, Deutsch) render as **disabled / "Coming
  in v2"** styled nodes with no href.

### Cross-essay nav
- Each essay declares its `prev` and `next` slugs in its frontmatter.
  Footer nav (already a `<Fragment slot="footer-nav">` in
  `EssayLayout`) renders them.
- The prereq graph for v1:
  - `qubit` → `superposition`
  - `superposition` → `measurement`
  - `measurement` → `gates`
  - `gates` → `entanglement`
  - `entanglement` → `/sandbox` (terminal in v1; CNOT+Deutsch arrive
    in Phase 5)

### Claude's discretion
- Exact prose of every essay (target: same voice as `/qubit` —
  formal-but-friendly, opinionated, "every claim has a try-this").
- Which starter circuit each essay's `SandboxLink` carries (must be
  pedagogically tied to the essay's headline insight).
- The visual styling of the concept map (must stay on the existing
  dark Tailwind palette + meet AA contrast).
- File-internal helper names, test naming, error message phrasing.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Phase 2 widgets (use as-is)
- `src/components/{ProbabilityBars,StateVector,GateButtons,
  MathBlock,MathNerds,RotationSlider}.astro` — multi-qubit ready;
  re-key with the essay's slug.
- `src/components/BlochSphere/index.astro` — already lazy-loads
  Three.js (130 KB gzipped chunk is cached after the first essay
  that loads it; entanglement essay reusing Bloch costs ~0 marginal
  bytes for returning readers).
- `src/layouts/EssayLayout.astro` — full essay chrome including
  `prose` constraints, scrollytelling support, math-nerds slot,
  footer-nav slot.

### Reusable Phase 3 plumbing (use carefully)
- `src/lib/quantum/index.ts` exports `encodeCircuit`, `decodeCircuit`,
  `Circuit`, `gateOp`, `cnotOp`, `rotOp`, `measureOp`. These are the
  *only* sandbox imports any essay should need.
- `src/components/sandbox/ResultsPanel.astro` + its hydrator
  `src/lib/sandbox/results.client.ts` know how to render multi-qubit
  reduced-density Bloch projections. If the entanglement essay wants
  them, we can either import them as-is or extract the SVG renderer
  to a shared component (call later in 04-05).
- `src/lib/quantum/reducedDensity.ts` — pure math, safe to call from
  any essay's hydrator.

### Established patterns to follow
- Astro page in `src/pages/{slug}.astro` with frontmatter imports;
  `<script>` block at bottom mounts scrolly + annotations.
- Per-essay storeKey is the slug (`"superposition-essay"` etc.).
- KaTeX only inside `MathBlock` / `MathNerds`; never on homepage.
- All client hydration mounts on `DOMContentLoaded`; widgets that
  pay a 3D cost are lazy.

### Integration points
- `src/pages/index.astro` — replace the "coming soon" shell with
  `<ConceptMap />`.
- `src/pages/qubit.astro` — bump footer-nav's "Next: Superposition
  (Phase 4)" placeholder to a real link to `/superposition`.
- ROADMAP, STATE, PROJECT — tick Phase 4 items as plans land.
- Tests: `tests/essays/sandbox-links.test.ts` (new) verifying every
  starter circuit round-trips.

</code_context>

<specifics>
## Specific Ideas (per essay)

- **Superposition** — starts from the observation in `/qubit` that
  "H takes |0⟩ to a 50/50 split" and unpacks WHY: linear combination
  of basis states, sign matters (interference preview), amplitude is
  not probability. Widget: H + Rx slider + ProbabilityBars + StateVector.
  Sandbox starter: 1 qubit, [H] applied — reader can extend with phase
  gates.
- **Measurement** — the collapse rule, basis dependence, why
  "measurement in the Z basis" vs "measurement in the X basis" are
  different questions. Widget: GateButtons (H, Z), repeated-measure
  simulation showing histograms. Sandbox starter: 1 qubit, [H, measure]
  — reader can swap measurement order.
- **Gates** — discrete vs continuous, unitaries as rotations, the
  Rx/Ry/Rz one-parameter families. Widget: all three RotationSliders +
  Bloch. Sandbox starter: 1 qubit, [Rx(π/3), Ry(π/4)] — reader can
  sweep and explore Euler-angle composition.
- **Entanglement** — Bell state from H+CNOT, reduced-density matrix,
  what "no individual state for q0" means visually. Widget: 2-qubit
  Bloch pair via the Phase 3 `ResultsPanel` (or its renderer extracted),
  + ProbabilityBars over 4 basis states. Sandbox starter: 2 qubits,
  [H on q0, CNOT(0,1)] — the Bell pair, ready to remix.

## Concept-map placement (v1)

```
   ┌────────┐     ┌──────────────┐     ┌────────────┐     ┌───────┐     ┌──────────────┐
   │ qubit  │ ──> │ superposition│ ──> │measurement │ ──> │ gates │ ──> │entanglement  │
   └────────┘     └──────────────┘     └────────────┘     └───────┘     └──────────────┘
        │                                                                       │
        └─────────────────────► ┌────────┐  ┌────────────┐ <─────────────────────┘
                                │sandbox │  │ challenges │
                                └────────┘  └────────────┘

         (v2, dimmed) ┌──────────┐  ┌──────────────┐
                      │ CNOT+Bell│  │ Deutsch's    │
                      └──────────┘  └──────────────┘
```

</specifics>

<deferred>
## Deferred Ideas

- "Pick a path" alternate reading order (e.g., math-first track) —
  v2 once we know what real readers do.
- An in-essay quiz/answer checker beyond the Phase 2 self-test
  format — v2, needs an answer-input UX.
- Adaptive hints in essays based on which widgets the reader engaged
  with — needs analytics, deferred indefinitely (no tracking in v1).
- Concept-map progress indicator ("you've read 3/5 essays") — needs
  localStorage hook, defer to Phase 5 launch polish.
- Animated concept-map edges — premature; ship the static map first.

</deferred>
