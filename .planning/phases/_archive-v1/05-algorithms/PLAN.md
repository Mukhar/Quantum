# Phase 5 Plan — Algorithm Track + v1 Launch Prep

**Phase goal:** Round the essay arc out to 7 essays by adding the two
algorithmic ones (CNOT+Bell, Deutsch), build the slim `CircuitView`
embed primitive they need, and prepare every launch artifact short of
an actual deployment.

**Depends on:** Phase 4 (concept map, SandboxLink, MiniBloch,
cross-essay nav pattern), Phase 3 (sandbox + codec), Phase 2 (essay
widget kit).

## Definition of Done (phase-level)

1. Seven essays live on the site: `/qubit`, `/superposition`,
   `/measurement`, `/gates`, `/entanglement`, `/cnot-bell`, `/deutsch`.
2. `src/components/CircuitView.astro` exists — read-only inline
   circuit diagram, zero hydration cost, with an optional baked-in
   `SandboxLink` corner CTA.
3. Both algorithm essays open with a 2-3 paragraph "why should I care"
   classical pain-point section before any quantum content.
4. ConceptMap nodes "CNOT + Bell" and "Deutsch" un-dimmed and live
   (no more v2 tier); concept-map test mirror updated; reading-path
   edges re-flowed to include them.
5. Full cross-essay nav chain works end-to-end: qubit → superposition
   → measurement → gates → entanglement → cnot-bell → deutsch →
   /sandbox. nav-graph test extended.
6. SEO + presentation infra in place: `robots.txt`, `sitemap.xml`,
   `404.astro`, OG / Twitter Card meta tags on every essay, one
   site-wide og-image, canonical link tags everywhere.
7. `LIGHTHOUSE.md` captured for all 9+ routes. Accessibility ≥ 95
   everywhere. Performance ≥ 90 on non-3D routes, ≥ 70 with Three.js.
8. `LAUNCH-ANNOUNCEMENT.md` Markdown draft committed.
9. Phase 2 `REMAINING.md` resolved (either ticked or documented as
   carry-over with reasoning).
10. Test count grows by at least 8 (2 new essay starter-circuit
    round-trips + 2 new nav-chain assertions + concept-map mirror
    updates + 4xx page test).

## Plans

> Execute in order. Plans 05-02 / 05-03 share zero code and may be
> dispatched in parallel sub-agent contexts (same pattern as Phase 4).
> 05-01 must land first (both essays import `CircuitView`); 05-04 and
> 05-05 are sequential closeout work.

### 05-01 — `CircuitView.astro` (read-only circuit embed)

**Why:** Both algorithm essays need to show a circuit diagram inline.
Reusing the sandbox composer is overkill — it's tightly coupled to
its singleton store, persistence, undo/redo. A pure renderer is what
we actually need. Decision documented in 05-CONTEXT.md.

**Deliverables:**
- `src/components/CircuitView.astro`
  - Props: `circuit: Circuit` (required), `caption?: string`,
    `class?: string`, `showRemixLink?: boolean` (default `true`).
  - Renders a CSS-grid or inline-SVG diagram of the gates on the
    qubit-by-step grid. Same gate-icon vocabulary as the sandbox
    composer (read the composer's renderer to mirror the visual).
  - Zero hydration cost — no client JS.
  - When `showRemixLink` is true, renders a small `<SandboxLink>`
    in the bottom-right corner labeled "Remix in sandbox →".
  - Color palette: matches `prose-essay` (slate background, indigo
    accents, AA contrast).
- `tests/components/circuit-view.test.ts` — render-shape assertions
  via parsing the emitted HTML / SVG (or, simpler, by checking the
  component's props validation). Cover: empty circuit renders as a
  placeholder; 1-qubit `[H]` circuit shows one labeled cell; 2-qubit
  CNOT renders the connector line; `showRemixLink={false}` omits
  the link.

**Acceptance:**
- Build clean, types clean.
- Adding `<CircuitView circuit={someBell} />` to a scratch page
  produces a visually recognizable circuit diagram.
- No new JS chunks shipped (component is build-time only).

---

### 05-02 — `/cnot-bell` essay (CNOT + Bell states)

**Why:** The natural sequel to `/entanglement`. Promotes entanglement
from "look, the Bloch arrows shrink" to a usable resource: CNOT is the
canonical 2-qubit entangler, the four Bell states form a basis, and
EPR + teleportation + superdense coding all live downstream.

**Deliverables:**
- `src/pages/cnot-bell.astro` — algorithm-essay template (foundations
  voice + "why should I care" opener), 1,000–1,500 words.
- "Why should I care" opener (2-3 paragraphs): classical 2-bit logic
  can compute any boolean function; output is always a deterministic
  function of inputs; no local-hidden-variable model can reproduce
  the CHSH-violating correlations entanglement allows. Set up CNOT
  as the gate that makes those correlations.
- Body sections with `data-step` scrolly annotations:
  - CNOT as a controlled flip; truth table; matrix
  - Building the four Bell states via Hadamard + CNOT permutations
  - Live widgets: `ProbabilityBars` (4 outcomes), two `MiniBloch`
    instances (one per qubit), inline H/X/CNOT buttons (mirror the
    `/entanglement` pattern), `storeKey="cnot-bell-essay"`
  - **One `<CircuitView>`** showing the canonical Bell-Φ⁺ preparation
    `[H q0; CNOT(0,1)]`
- One `<SandboxLink>` with starter `qubits: 2, steps: [[gateOp("H",
  0)], [cnotOp(0, 1)]]` (same as the entanglement essay; the link
  is reinforcement, not redundancy — different pedagogical entry
  point).
- `MathNerds`: full Bell basis (Φ±, Ψ±), CNOT matrix, CHSH bound
  one-liner.
- 1-2 question self-test grounded in the on-page widgets.
- Footer nav: `← Entanglement` / `Next: Deutsch →`.
- Bottom `<script>`: `attachScrolly` + `mountAnnotations` + the
  inline H/X/CNOT button wiring.

**Acceptance:**
- Page renders, all four Bell states can be built via the widgets.
- Sandbox link decodes back to the Bell-Φ⁺ preparation.
- Word count in range.

---

### 05-03 — `/deutsch` essay (Deutsch's algorithm)

**Why:** The "this is the first time quantum strictly beats classical"
moment. Even though the speedup is 2→1 (trivial in absolute terms),
it's the pedagogical anchor for everything that comes after (Shor,
Grover): quantum interference, not parallelism, is the actual
resource.

**Deliverables:**
- `src/pages/deutsch.astro` — algorithm-essay template, 1,000–1,500
  words.
- "Why should I care" opener: oracle problem, 4 possible one-bit
  functions, classical needs 2 queries, quantum needs 1.
- Body sections with `data-step` annotations:
  - The 4 oracles (constant-0, constant-1, identity, NOT) and the
    constant-vs-balanced classification
  - Phase kickback intuition (ancilla in |−⟩)
  - The full Deutsch circuit: H on data, H on ancilla (after X), apply
    the oracle, H on data, measure data. If data measures 0 → constant.
    If 1 → balanced.
  - Live widgets: per-essay store, 2 qubits. Four buttons "Run with
    oracle f₀/f₁/f₂/f₃" — each builds the appropriate circuit, runs
    `runCircuit`, displays the measured data qubit + a "constant" /
    "balanced" verdict label. `storeKey="deutsch-essay"`.
  - **One `<CircuitView>`** showing the canonical Deutsch circuit
    (specialized to one chosen oracle, probably `f₂(x) = x` — most
    pedagogically satisfying).
- One `<SandboxLink>` with the Deutsch circuit for the balanced
  oracle `f₂(x) = x`. Steps: H on q0, X on q1, H on q1, CNOT(0,1),
  H on q0, measure q0. (Verify the exact step ordering matches what
  the in-essay button builds.)
- `MathNerds`: phase kickback derivation, Deutsch-Jozsa
  generalization one-liner.
- 1-2 self-test questions.
- Footer nav: `← CNOT + Bell` / `Next: open the Sandbox →`.
- Bottom `<script>`: `attachScrolly` + `mountAnnotations` + the
  four oracle-button wiring.

**Acceptance:**
- Each of the 4 oracle buttons gives the correct verdict
  (f₀, f₁ → "constant"; f₂, f₃ → "balanced") via on-page widgets.
- Sandbox link decodes back to the documented Deutsch circuit.
- Word count in range.

---

### 05-04 — Launch polish (SEO + meta + 404 + concept map un-dim)

**Why:** Pre-launch presentation infrastructure. None of it is
runtime-heavy, all of it is necessary the moment someone visits.

**Deliverables:**
- `public/robots.txt` — allow all, sitemap pointer.
- `src/pages/sitemap.xml.ts` (Astro endpoint) listing every route.
  Prefer endpoint over static so it can't drift from `src/pages/`.
- `src/pages/404.astro` — friendly "page not found" with dark-palette
  styling and a link back to the homepage.
- Extend `EssayLayout.astro` to accept `ogImage` / `ogType` /
  `canonicalUrl` props; emit `<meta property="og:…">`,
  `<meta name="twitter:card">`, and `<link rel="canonical">` in
  `<head>`. Defaults: site-wide og-image, `og:type="article"` for
  essays, `og:type="website"` for homepage.
- `public/og/quantum.png` — one site-wide 1200×630 og-image
  (hand-built or rendered from a SVG source). Dark slate background,
  indigo "Quantum" wordmark, tagline below. AA contrast.
- `src/pages/index.astro` — extend `<head>` with the same OG +
  canonical meta (not via EssayLayout since the homepage doesn't
  use it; copy the relevant `<meta>` lines).
- `src/components/ConceptMap.astro`: change "CNOT + Bell" and
  "Deutsch" nodes from `tier: "v2", href: null` to `tier: "primary",
  href: "/cnot-bell" | "/deutsch"`. Add no new v2 placeholders
  (post-Phase-5 the map shows no dimmed nodes). Re-flow edges:
  `entanglement → cnot-bell → deutsch`; sandbox + challenges nodes
  connect to deutsch (exit) and qubit (entry) as before.
- `tests/essays/concept-map.test.ts` — update the `expected` array
  in lockstep with the ConceptMap change.

**Acceptance:**
- `/non-existent` renders the 404 page.
- `/sitemap.xml` returns a valid XML listing all routes.
- View-source on every essay shows og:image, og:title,
  twitter:card, canonical link.
- Concept map has zero dimmed nodes; tests still pass.
- Build clean.

---

### 05-05 — Cross-essay nav extension + Lighthouse + launch
announcement + Phase-5 SUMMARY + Phase-2 leftover resolution

**Why:** The full closeout. Wires the two new essays into the prev/next
chain, runs the final performance/accessibility pass, drafts the
launch artifact the user will eventually publish, resolves the Phase
2 RememberMe list one way or another, and writes Phase 5's epitaph.

**Deliverables:**
- Cross-essay nav extension:
  - `src/pages/entanglement.astro` footer-nav: change `Next: open
    the Sandbox →` to `Next: CNOT + Bell →`.
  - `tests/essays/nav-graph.test.ts` — extend `CHAIN` to include
    cnot-bell and deutsch; update entanglement's `next` from
    `/sandbox` to `/cnot-bell`.
  - `tests/essays/sandbox-links.test.ts` — extend `STARTERS` with
    `cnotBell` and `deutsch` starter circuits.
- Lighthouse pass:
  - `npx astro build && npx astro preview` (in background) — run
    lighthouse against every essay + homepage + sandbox + challenges
    pages.
  - Capture scores in `.planning/phases/05-algorithms/LIGHTHOUSE.md`.
    Format: one table per route, P/A/BP/SEO scores.
  - Document any miss against the targets (Acc ≥ 95, Perf ≥ 90/70).
- `.planning/phases/05-algorithms/LAUNCH-ANNOUNCEMENT.md`:
  - ~600-word Markdown draft. Honest pitch, what's in v1, what's
    not, link to the (future) live URL placeholder + GitHub repo
    placeholder. Voice: same as the essays — opinionated,
    dev-trust, no hype.
- Phase 2 `REMAINING.md` resolution:
  - Read `.planning/phases/02-qubit-essay/REMAINING.md`. For each
    open item, decide: (a) close it now in Phase 5 if doable
    locally (e.g., Lighthouse — that's covered above), or
    (b) document explicitly in 05-SUMMARY why it's carried to
    post-launch (e.g., dev-friend feedback can't happen without a
    URL). Delete REMAINING.md if all items resolved.
- `.planning/phases/05-algorithms/05-SUMMARY.md` — full Phase 5
  recap (plan table, numbers, locked decisions, deferred items, +
  Phase 5 retro section with what worked / what changed / what's
  next post-v1).
- `.planning/ROADMAP.md` — tick Phase 5 `[x]`.
- `.planning/STATE.md` — rewrite to reflect "v1 launch-ready,
  awaiting deployment decision".

**Acceptance:**
- `npx vitest run` green, ≥ 138 tests (was 130 + at least 8 new).
- `npx tsc --noEmit -p tsconfig.json` clean.
- `npx astro build` clean, 15+ pages.
- Manual smoke: walk the full chain qubit → … → deutsch → sandbox
  via footer-nav links only.
- All ROADMAP Phase 5 checklist items ticked or explicitly deferred
  in 05-SUMMARY.

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| `CircuitView` visual drifts from sandbox composer's gate vocab | Read the composer's renderer before writing CircuitView; reuse the same gate-icon SVG strings if practical |
| Deutsch essay's 4 oracle buttons get the circuit wrong (math error) | Plan 05-03's acceptance criterion explicitly requires f₀/f₁ → constant and f₂/f₃ → balanced verdicts; the sub-agent must run all four and verify |
| Lighthouse on Three.js essays misses the perf target | Mitigation already in place (lazy load, 2D fallback). If still missed, document the miss + LCP source in LIGHTHOUSE.md rather than spinning to chase it |
| Astro/JSX `{` gotcha bites algorithm-essay sub-agents | Both 05-02 + 05-03 briefings call it out explicitly with examples (HTML entity escape or `MathBlock` wrap) |
| Sandbox composer ends up needing edits to extract gate-icon vocab | Extract is non-invasive (read-only access). If composer needs refactoring, defer to v2 and use a tiny inline icon vocab in CircuitView instead |
| Concept map + test mirror drift in Plan 05-04 | Single atomic commit covering both files; nav-graph + concept-map tests catch the rest |
| Launch announcement reads like marketing copy | Pin the foundations voice. Have the sub-agent (or me, if I write it) match the kennel-saved sample from /qubit's intro paragraphs |

## Out of Scope (this phase)

- Actual deployment to a live URL (post-Phase-5 task)
- Analytics or any telemetry (ratified: never in v1)
- Playwright / E2E (v2)
- Grover / Shor / teleportation / superdense coding essays (v2)
- Editable in-essay circuit embed (YAGNI per 05-01 decision)
- Concept-map progress tracker (v2 launch polish)
- Newsletter / email capture (off-mission)
