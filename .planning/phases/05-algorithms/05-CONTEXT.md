# Phase 5: Algorithm Track + v1 Launch Prep - Context

**Gathered:** 2026-06-26 (Phase 4 just closed; mukhar ratified 7 entry decisions)
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 5 is the **last phase before v1 launch**. It rounds the essay
arc out from 5 foundations essays to 7 (adding CNOT+Bell and
Deutsch — the first two true *algorithmic* essays), gives those
algorithm essays the embed primitive they need to show a circuit
diagram inline, and prepares (but does not execute) the launch.

**In scope:**
1. An in-essay embed primitive for displaying a `Circuit` inline
   (the exact shape — read-only view vs slim editor — is a planning
   decision, see Decisions below).
2. **CNOT + Bell-state essay** (`/cnot-bell`) — the algorithmic
   leap from single-qubit unitaries to genuine 2-qubit operations,
   with the Bell pair as the canonical demonstration.
3. **Deutsch's algorithm essay** (`/deutsch`) — the first textbook
   case where quantum strictly beats classical (1 oracle query vs 2),
   even if the speedup is tiny.
4. **Launch polish** — og-images, robots.txt, sitemap.xml, 404 page,
   meta tags, ConceptMap v2-placeholders un-dimmed (the two new
   essays land in the live tier).
5. **Launch prep artifacts** — local Lighthouse pass + report,
   launch announcement draft (Markdown post), Phase 5 retro,
   resolve Phase 2's REMAINING.md leftovers (or document why
   they're carried to post-launch).

**Out of scope:**
- Actual deployment to a live URL. The user explicitly chose "no
  deployment as of now" — Phase 5 ships launch-ready artifacts
  only. A future post-Phase-5 task will pick a host and deploy.
- Any analytics or tracking. Zero. Stay pure.
- Playwright / E2E harness. Deferred to v2.
- Grover, Shor, QFT, teleportation essays — v2.

</domain>

<decisions>
## Implementation Decisions

### Embed primitive (Plan 05-01) — DECIDED HERE, not deferred

The user ratified "let Claude decide during smart_discuss". Decision:

**Build a slim read-only `CircuitView.astro`** — *not* an embedded
composer. Reasoning:

- The two algorithm essays don't need readers to *build* a circuit
  inside the essay; they need to **show** a known circuit (e.g.,
  the Bell-pair preparation: `H q0; CNOT(0,1)`) alongside live
  widgets that drive a per-essay store. The reader edits via the
  widgets (or, for full editing, the "Open in sandbox →" CTA we
  already ship from every essay).
- The sandbox composer is fundamentally store-coupled (singleton
  `circuit` signal, persistence, undo/redo, share button, history
  view). Bolting on a `mode="embedded"` prop would mean wiring
  every one of those features to a "disabled" branch — pure dead
  weight on the essay bundle, with bug surface to match.
- A pure renderer of "given a `Circuit`, draw the grid" is ~150
  lines, has zero hydration cost, and is what we needed anyway.
  Same shape as `MiniBloch` extraction in Phase 4.
- YAGNI: if a Phase 5 essay turns out to genuinely need an
  editable embed, we add it then. The two we're planning don't.

`CircuitView.astro` props:
- `circuit: Circuit` (required)
- `caption?: string`
- `class?: string`
- Renders inline SVG (or CSS-grid HTML — pick whichever stays
  smaller). No client JS. Same gate-icon vocabulary as the sandbox
  composer so readers recognize the symbols.
- Optional: a tiny `<SandboxLink circuit={circuit}>` baked into the
  bottom-right corner so every embedded diagram is also a remix-it
  affordance.

### Algorithm essay voice

The user ratified the "why should I care" opener pattern. Each
algorithm essay opens with a 2-3 paragraph **classical pain point**
section *before* any quantum content — pose the classical problem,
state the classical lower bound, then promise the quantum
demonstration that beats it. Everything after that opener keeps the
foundations-essay voice unchanged (opinionated, "Try this:" rhythm,
math at the end).

### CNOT + Bell essay scope

- Pain point opener: classical 2-bit logic can compute any boolean
  function via AND/OR/NOT, but the output is always a deterministic
  function of inputs — no shared-randomness shortcut, no
  no-cloning, no correlations that can't be reproduced by local
  hidden variables. Entanglement is the new resource.
- Body: CNOT as the canonical 2-qubit entangler; building the four
  Bell states; partial-trace intuition recap (refer back to
  `/entanglement`); EPR/teleportation as the headline applications
  (one paragraph each, no deep dive).
- Widgets: per-essay store, 2 qubits, `ProbabilityBars` (4 outcomes),
  `MiniBloch` for each qubit (reused from Phase 4), inline H/X/CNOT
  buttons (same pattern as `/entanglement`'s Build-the-Bell-pair).
  Plus a `CircuitView` showing the 4 Bell-state preparation circuits.
- Sandbox link: 2 qubits, the Bell-Φ⁺ recipe `[H on q0; CNOT(0,1)]`.
- Math nerds: full Bell basis, CHSH bound one-liner (no proof).

### Deutsch's algorithm essay scope

- Pain point opener: oracle problem statement, 4 possible
  one-bit-input/one-bit-output functions (00, 01, 10, 11), two
  classes (constant vs balanced). Classical: must query 2 times to
  decide. Quantum (Deutsch): one query suffices.
- Body: phase kickback intuition; the full 1-qubit-data + 1-qubit-
  ancilla circuit; running it against all 4 oracles and reading the
  data qubit; the trick is *interference*, not parallelism.
- Widgets: per-essay store, 2 qubits. `CircuitView` showing the full
  Deutsch circuit. Buttons for "Run with oracle f₀..f₃" (each is a
  preset circuit; clicking the button runs it and shows the
  measurement). `ProbabilityBars` for the data qubit (after partial
  trace if needed).
- Sandbox link: 2 qubits, the Deutsch circuit specialized to one
  oracle (probably the balanced `f₂(x) = x` — most pedagogically
  satisfying — so the reader sees the data qubit collapse to |1⟩).
- Math nerds: phase kickback derivation, Deutsch-Jozsa generalization
  one-liner.

### Concept map update

- `ConceptMap.astro` and `tests/essays/concept-map.test.ts` need
  matched edits: un-dim the "CNOT + Bell" and "Deutsch" nodes (move
  them from `tier: "v2"` with `href: null` to `tier: "primary"` with
  real hrefs). Re-flow edges: `entanglement → cnot-bell → deutsch`
  becomes the new tail of the reading path. Sandbox + Challenges
  utility nodes connect to both new essays. No new v2 placeholders.
- This is a single coordinated edit in Plan 05-04 (launch polish).

### Cross-essay nav extension

- `/entanglement` footer-nav today: `← Gates / Next: open the
  Sandbox →`. Update to `← Gates / Next: CNOT + Bell →`.
- `/cnot-bell` footer-nav: `← Entanglement / Next: Deutsch →`.
- `/deutsch` footer-nav: `← CNOT + Bell / Next: open the Sandbox →`.
- `tests/essays/nav-graph.test.ts` CHAIN array must be extended in
  lockstep with the new essays.

### Launch polish (Plan 05-04)

Static SEO + presentation infra, no runtime cost:
- `public/robots.txt` — `User-agent: * / Allow: / / Sitemap: …`.
- `src/pages/sitemap.xml.ts` (Astro endpoint) or pre-built
  `public/sitemap.xml` listing all 13 → 15 routes.
- `src/pages/404.astro` — friendly "page not found" using the
  established slate/indigo palette + a link back to the ConceptMap.
- Open Graph + Twitter Card meta tags on every essay (extend
  `EssayLayout` to accept `ogImage` prop; default to a generic
  site card).
- One static og-image: SVG-source that we render to a 1200×630 PNG
  via a tiny build script (or use a hand-drawn PNG checked into
  `public/og/quantum.png` — whichever ships faster).
- Concept map v2-placeholder un-dim + nav-graph test extension
  (see above).
- All Phase 4 + 5 essays declare `<link rel="canonical">` to the
  same-origin URL they live at.

### Launch prep artifacts (Plan 05-05)

- `npx lighthouse --view` (or equivalent) against `npx astro
  preview` for all 7 essays + homepage + sandbox. Capture Performance
  / Accessibility / Best Practices / SEO scores in
  `.planning/phases/05-algorithms/LIGHTHOUSE.md`. Hard target:
  Accessibility ≥ 95 on every route. Soft target: Performance ≥ 90
  on essays without Three.js, ≥ 70 with.
- `.planning/phases/05-algorithms/LAUNCH-ANNOUNCEMENT.md` —
  Markdown draft of a launch post (hacker-news / r/quantum-style),
  ~600 words. Honest pitch, link to the live URL (placeholder),
  thank-yous, link to the GitHub repo.
- Resolve `phases/02-qubit-essay/REMAINING.md` — either tick the
  three items if completed here, or document explicitly in the
  Phase 5 SUMMARY why they remain open (e.g., "deferred until
  post-launch when we have a real URL to feedback against").
- Phase 5 retro section in `05-SUMMARY.md` — what worked, what we
  learned, what should change for v2.

### Claude's discretion

- Exact prose of CNOT+Bell and Deutsch essays (voice: foundations
  + "why should I care" opener, 1,000–1,500 words each).
- `CircuitView` rendering implementation (SVG vs CSS grid).
- Whether sitemap is a static file or an Astro endpoint.
- Exact og-image art (so long as it matches the dark slate/indigo
  palette and meets AA contrast for any text).
- Launch announcement tone (within "honest, dev-trust, no hype").

</decisions>

<code_context>
## Existing Code Insights

### Reusable from Phase 2 (essay scaffolding)
- `EssayLayout.astro` — slots for default / math-nerds / footer-nav.
  **Plan 05-04 extends** this to accept an optional `ogImage` prop
  and emit og:image meta tags (default to a site-wide card).
- All Phase 2 widgets — `GateButtons`, `ProbabilityBars`,
  `StateVector`, `BlochSphere`, `RotationSlider`, `MathBlock`,
  `MathNerds`. Multi-qubit-ready, re-key with the essay slug.

### Reusable from Phase 3 (sandbox plumbing)
- `src/lib/quantum/index.ts` — `gateOp`, `cnotOp`, `rotOp`,
  `measureOp`, `Circuit`, `encodeCircuit`, `runCircuit`.
- `src/lib/quantum/reducedDensity.ts` — pure math (needed by
  `MiniBloch` and the Deutsch essay's data-qubit reduced state).

### Reusable from Phase 4
- `SandboxLink.astro` — build-time-encoded CTA. Use one per
  algorithm essay. **Bake one into `CircuitView`** for the
  "every diagram is also a remix link" affordance.
- `MiniBloch.astro` — per-qubit reduced-density Bloch arrow.
  Both algorithm essays need this for the 2-qubit visualization.
- `ConceptMap.astro` — un-dim the two v2 nodes when 05-02 + 05-03
  land. Update `tests/essays/concept-map.test.ts` mirror in lockstep.

### Established patterns to keep
- Single per-page essay store (`storeKey = "{slug}-essay"`).
- Astro page in `src/pages/{slug}.astro`, bottom `<script>` mounts
  `attachScrolly` + `mountAnnotations`.
- KaTeX only inside `MathBlock` / `MathNerds`.
- Build-time encoding of starter circuits via `SandboxLink`.
- Cross-essay nav lives in essay frontmatter, asserted via
  `tests/essays/nav-graph.test.ts`.
- Astro/JSX gotcha — **literal `{` in prose is a JSX expression**.
  Math notation goes inside `MathBlock` or uses HTML entities
  (`&#123;` / `&#125;`). Both Phase-4 algorithm-adjacent essays
  hit this; the Phase 5 sub-agent briefings will call it out
  explicitly.

### Integration points
- `src/components/ConceptMap.astro` + `tests/essays/concept-map.test.ts`
  — atomic coordinated edit in Plan 05-04.
- `tests/essays/sandbox-links.test.ts` — extend `STARTERS` with
  the two new algorithm-essay starter circuits in Plan 05-05.
- `tests/essays/nav-graph.test.ts` — extend `CHAIN` array with
  cnot-bell + deutsch + updated entanglement→cnot-bell link, in
  Plan 05-05.
- `src/pages/entanglement.astro` — footer-nav `next` updates from
  `/sandbox` to `/cnot-bell` in Plan 05-05.

</code_context>

<deferred>
## Deferred Ideas

- **Live deployment.** No URL yet. v1-launch-proper happens after
  Phase 5 closes; the user will pick a host then.
- **Analytics / telemetry.** Ratified: never in v1.
- **Playwright / E2E harness.** v2.
- **Grover, Shor, teleportation, superdense coding essays.** v2.
- **In-essay editable circuit embed** (vs the read-only `CircuitView`
  we're building). If user feedback after v1 launch shows readers
  want to edit a circuit *in the essay flow* rather than jumping to
  the sandbox, revisit. YAGNI for now.
- **Concept-map progress indicator** ("you've read 4/7"). Phase 5
  could add it but the user didn't prioritize; defer.
- **Newsletter / email capture on the homepage.** Off-mission for a
  zero-tracking site.

</deferred>
