# Quantum v3.0 — Launch Announcement Draft

**Status:** Draft. Tone matches v1 + v2. Replace `<URL>`, `<REPO>` placeholders.

**Posting note:** If v1 and/or v2 deploys are still pending when v3 ships,
fold the carry-over deploys into one combined launch (lead with v3, append
"and v1 + v2 are now live too"). If both prior versions are already
deployed, post v3 as a focused milestone update.

---

## Quantum v3: algorithms × use cases — where it actually bites reality

Two milestones ago I shipped [Quantum] — seven interactive essays
that teach quantum computing to working developers with real math
running in the browser, no coin-spinning, no animations standing
in for amplitudes. v2 added dark mode, a local "my circuits" gallery,
and a feedback form. Today I'm shipping **v3.0**, the milestone that
finally answers the *"so what?"* question — for every canonical
quantum algorithm, here's the practical use case it unlocks, and
here's the honest reality check on what it actually does for you.

**<URL>**

### 1. Five new algorithm × use-case essays

v3 ships five new interactive essays. Each one is the same two-half
shape: the algorithm in the top half (interactive widgets, the actual
math), the real-world use case in the bottom half (a widget that
makes the bound concrete), and an honest caveat at the end. The
reading path now runs *qubit → superposition → measurement → gates →
entanglement → cnot-bell → deutsch → teleportation → superdense-coding
→ grover → shor → vqe*, twelve essays total, all in one scroll-chain.

- **`/teleportation` + Quantum networks.** Walk a 3-qubit
  teleportation protocol with a stepper, watch a `MultiBlochPanel`
  honestly render mixed states (arrow inside the sphere when ρ is
  mixed, not outside it), then play with a 3-node `QuantumNetwork`
  widget where clicking links swaps entanglement along a repeater
  path and a live indicator flips when Alice ↔ Bob share a Bell pair.
- **`/superdense-coding` + Holevo bandwidth bound.** Send 2 classical
  bits with 1 qubit. The `EncodingTable` widget animates `I / X / Z /
  XZ` on Alice's qubit and the Bell-basis decoding on Bob's. The
  `HolevoBound` widget then makes the catch concrete: a single qubit
  carries at most 2 classical bits even with shared entanglement;
  superdense ≠ free bandwidth.
- **`/grover` + Search reality.** Implement oracle + diffusion against
  the simulator, step through iterations, and watch the `AmplitudeBars`
  concentrate amplitude on the marked state at the optimal
  `⌊(π/4)·√N⌋` step. The use-case half is the "honest disappointment":
  a side-by-side animated comparison of classical linear scan vs.
  Grover's `√N` as `N` slides from 16 to 1024. The essay explicitly
  closes the "does this break RSA?" loop with a clean *no — that's
  Shor, see the next essay*.
- **`/shor` + RSA / PQC migration.** The densest essay in v3, in two
  layers. First the engine: a 4-qubit QFT visualizer + a period-finding
  widget that runs in-browser for `a^x mod N` with `N ≤ 15`. Then the
  full canonical N=15 Shor circuit, rendered statically with a
  prominent **Copy Shor N=15 Qiskit ↗** button (Qiskit handles the
  >4-qubit simulation — see #2 below). The use-case half is the
  `RSACountdown` widget: pick a key size, slide logical qubits, watch
  three sourced markers (today / vendor roadmap / break threshold)
  light up — and read the explicit "this widget shows pressure, not
  a date." Closes with NIST PQC cards (ML-KEM, ML-DSA, FN-DSA,
  SLH-DSA) linking the official FIPS standards.
- **`/vqe` + Quantum chemistry / materials.** The variational story:
  a vanilla-TypeScript gradient-descent-with-momentum optimizer
  (~150 LOC, deterministic, unit-tested to converge within `1e-3`
  Hartree of the H₂ ground state from six different starts) drives
  an interactive `EnergyLandscape` heatmap of the 2-parameter H₂
  energy surface. Drag the marker, watch the energy update; click
  **Auto-descend**, watch the optimizer trajectory play. The use-case
  half is a `MoleculeGallery` of three pre-baked benchmarks (H₂, LiH,
  HeH⁺) with saved ansatz parameters and converged energy in both
  Hartree and eV — and an explicit *"this is the credible near-term
  industrial direction; VQE is not drug discovery solved."*

Every one of those essays caveats itself honestly. Grover is √N, not
magic. Superdense doesn't 10× your bandwidth. RSA isn't broken on a
calendar date. VQE is a credible NISQ-era research direction, not a
shipped pharmacology product. The point is to make the reader *trust*
the site enough to read the next essay.

### 2. The Qiskit bridge ships everywhere

v3's foundation phase landed a `toQiskit()` codec that turns any
in-browser circuit into runnable Python. The **Copy as Qiskit** button
is now in every place a circuit appears:

- The sandbox toolbar (turn your hand-built circuit into Qiskit).
- Every essay's `CircuitView` (turn the teaching diagram into Qiskit).
- Every `MoleculeGallery` card on `/vqe` (turn the converged ansatz
  into Qiskit).
- The static N=15 Shor circuit on `/shor` (turn the canonical Shor
  factoring demo into Qiskit, complete with `QFT(4, do_swaps=True).inverse()`
  and continued-fractions post-processing).

Every export is generated server-side at build time and baked into
the page HTML, so the button costs zero client JS per page. A
gate-coverage golden test asserts each simulator-supported gate maps
to syntactically-correct Qiskit; the build fails on any new gate
without a mapping.

This is the answer to "the in-browser simulator caps at 4 qubits —
what about the real algorithms?" The browser teaches the intuition;
Qiskit runs the thing on real hardware. The bridge is one click.

### 3. Local-only progress indicator

The concept map on the homepage now shows you what you've read.
Scroll past 50% of any essay, and that route is recorded — locally,
under `localStorage["quantum/visited"]`. Visited nodes on the concept
map render brighter, with a `(visited)` label appended to their
`aria-label` so screen readers announce visited state too. That's it.
There is:

- **No analytics.** No page-view counter, no privacy-preserving
  beacon, no Plausible, no GA, no Cloudflare-side aggregate. Nothing.
- **No server.** Visited state is stored in your browser, on your
  device, and never transmitted anywhere.
- **No accounts.** No login, no sync, no "open on another device."
  If you want to clear it, clear your site data.

The whole thing is a single helper (`src/lib/progress.ts`, ~80 LOC),
a one-line `<script>` in `EssayLayout`, and a tiny `<script>`
hydrator in `ConceptMap` that adds `data-visited="true"` to matching
links in both the desktop SVG and the mobile list fallback. CSS does
the rest with semantic accent tokens that work in both themes.

### What v3 deliberately is NOT

The v1 + v2 "no" lists still hold, and v3 adds a few more:

- **Still no accounts. Still no login. Still no analytics.** The
  PROG-01 visited indicator is local-only personalization, on-device,
  same-origin, never transmitted.
- **No hosted backend.** The whole site is still static HTML + JS +
  one tiny Apps Script endpoint for v2's feedback form. v3 added zero
  new runtime dependencies, zero new services, zero new endpoints.
- **No live ab initio chemistry.** The `MoleculeGallery` on `/vqe`
  shows pre-baked VQE results for H₂, LiH, and HeH⁺. The equilibrium
  bond-distance slider on each card is labelled
  *"equilibrium · slider is illustrative"* and is disabled — the cards
  do not pretend to recompute Hartree-Fock integrals on slider drag.
- **No live N=15 factoring in-browser.** Shor at N=15 needs 8 qubits;
  the sandbox caps at 4. The full N=15 circuit on `/shor` is rendered
  statically with a prominent Qiskit-export button so readers can run
  it on real hardware. The 4-qubit cap is now defensible by example —
  the essay explicitly walks through why the sandbox cannot run this
  and points you at Qiskit.
- **No 8+-qubit simulator.** `MAX_QUBITS = 4` is hard-locked. Across
  six v3 phases of algorithm work — teleportation, superdense, Grover,
  Shor (5a + 5b), VQE — the constant in `src/lib/quantum/simulator.ts`
  did not move. The only algorithm whose canonical form exceeds 4
  qubits is Shor at N=15, and Qiskit handles that one.
- **No "best PQC algorithm" recommendation.** The PQC cards on
  `/shor` present the four NIST-standardized algorithms (ML-KEM,
  ML-DSA, FN-DSA, SLH-DSA) with their official FIPS publications.
  A test asserts the visible markup contains no "best / recommend /
  always use" prose. The site is a teaching surface, not a
  procurement recommendation.
- **No specific calendar date for RSA "breaks."** The `RSACountdown`
  widget says *pressure, not a date.* A test scans the source for
  future-year patterns (after stripping RSA key sizes, FIPS numbers,
  arXiv IDs, and citation years) and fails on any accidental "by
  2030"-style prose.
- **Still no Playwright visual regression harness.** Carried from v2
  as a nice-to-have; v3 ships without it.

### Try it now

If you've never read the site, start at the top:

- **Homepage** — concept map of every essay: <URL>
- **Foundations** — `/qubit`, `/superposition`, `/measurement`,
  `/gates`, `/entanglement` (v1).
- **First protocols** — `/cnot-bell`, `/deutsch` (v1).
- **v3 essays** — `/teleportation`, `/superdense-coding`, `/grover`,
  `/shor`, `/vqe`.
- **Sandbox** — build your own circuits, copy them as Qiskit, save
  them to your local gallery: `/sandbox`.
- **Sandbox challenges** — five starter puzzles: `/sandbox/challenges`.
- **Gallery + feedback** — `/gallery`, `/feedback`.

### Under the hood

Same tech as v1 + v2:

- **Astro 4** static site, 24 pages.
- **Vanilla TypeScript** for every widget — VQE optimizer, Grover
  iterator, RSA countdown, energy landscape interpolation, progress
  observer. No new runtime dependencies in v3.
- **Three.js** for the original `BlochSphere` only, lazy-loaded on
  intersection. Unchanged role since v1.
- **KaTeX** for math.
- **`idb-keyval`** for the v2 sandbox gallery (still 600 bytes).
- **One Apps Script endpoint** for v2 feedback. Nothing new on the
  server side in v3.

v3 added **+10 KB gzipped of eager JS site-wide** across five new
essays — distributed across one hoist per page, no essay above 3.2 KB
of eager JS. The bulk of `/vqe`'s payload is in SSR HTML (the 50×50
energy-landscape heatmap is rendered as 2500 SVG `<rect>` elements
that gzip ~7.4× because the markup is highly repetitive), not in
client JS. Detailed line-items live in `.planning/phases/06-vqe/BUNDLE-AUDIT.md`
in the repo.

### Tests

658 unit + integration tests now, up from 247 in v2 and 146 in v1.
Coverage:

- All v1 simulator / canvas / circuit / fidelity / rotation tests.
- All v2 theme / feedback / gallery / store / schema tests.
- v3 additions: Qiskit gate-coverage golden, per-essay structural
  tests (`tests/essays/*`), nav-graph + concept-map + sandbox-links
  mirrors, every v3 widget (`AmplitudeBars`, `SearchComparison`,
  `EncodingTable`, `HolevoBound`, `ProtocolStepper`, `QuantumNetwork`,
  `LargeCircuitView`, `RSACountdown`, `PQCCards`, `QFTVisualizer`,
  `PeriodFinding`, `EnergyLandscape`, `MoleculeGallery`,
  `ConceptMap` progress hydrator), the VQE optimizer math + H₂ surface
  + sampler, the molecule schema + Qiskit-export round-trip, the
  PROG-01 progress helper + scroll-depth observer, and the Shor N=15
  static-model isolation tests (proving the >4-qubit model never
  touches `MAX_QUBITS` or the sandbox `Op` union).

### Source + roadmap

**<REPO>** — MIT, issues + PRs welcome.

Every v3 phase plan, decision, and SUMMARY lives under
`.planning/phases/` in the repo — you can read exactly how each
algorithm × use-case essay got designed, what got deferred and why,
and what's queued past v3.

### One ask, same as v1 + v2

If you read something and it clicked, or — more usefully — *didn't*
click, tell me. v2's `/feedback` form is still the place to drop a
note. The whole point of an interactive essay is that it should be
answering your "but wait" questions within the essay itself; if it's
not, I want to know where.

— mukhar

[Quantum]: <URL>

---

## Variant blurbs

### Hacker News title (≤ 80 chars)

> Quantum v3: algorithm × use-case essays for Teleport, Superdense,
> Grover, Shor, VQE

### Tweet / Bluesky-length (≤ 280 chars)

> Shipped Quantum v3: five new algorithm × use-case essays
> (Teleportation, Superdense, Grover, Shor + RSA/PQC, VQE +
> chemistry), Qiskit-export on every circuit, local-only progress
> indicator. Still no analytics. Still no backend. 658 tests now.
> <URL>

### r/QuantumComputing post

Lead with the algorithm × use-case framing and the Qiskit bridge.
"If you've been reading Quantum for the in-browser essays, v3 just
shipped — Teleportation, Superdense, Grover, Shor at N=15 with full
Qiskit export, and VQE with a draggable energy landscape and three
benchmark molecules. Honest caveats on every essay; no hype."

### r/programming post

Lead with the bundle audit and the "no new runtime deps across an
entire milestone" line. Bury the chemistry / cryptography motivation
below the fold.

---

## Launch-day checklist

Run through these in order before pushing the announcement:

1. **Deploy.**
   - v1+v2 deploys may still be carrying over (see `.planning/STATE.md`
     parallel ops tasks). If so, fold them into the same push.
   - For Cloudflare Pages: `SITE_URL=<URL> npx astro build &&
     npx wrangler pages deploy ./dist --project-name quantum`.
   - For other hosts: any static-file deploy works; v3 has no
     server-side requirements.
2. **Smoke-test every v3 essay route.** Visit each of the five new
   essays in order and confirm the widgets hydrate without console
   errors:
   - `/teleportation` — protocol stepper advances; `MultiBlochPanel`
     mixed-state arrow lengths look right; `QuantumNetwork` indicator
     flips when end-to-end entanglement exists.
   - `/superdense-coding` — `EncodingTable` clicks animate `I/X/Z/XZ`
     on Alice's qubit; `HolevoBound` slider mapping is correct.
   - `/grover` — `AmplitudeBars` concentrates amplitude on the marked
     state at the optimal iteration; `SearchComparison` animates as
     `N` slides from 16 → 1024.
   - `/shor` — QFT visualizer + period-finding widget work; the
     **Copy Shor N=15 Qiskit ↗** button copies the full Python program;
     `RSACountdown` markers update on slider drag; PQC card links
     resolve to `csrc.nist.gov/pubs/fips/{203,204,205}/final`.
   - `/vqe` — drag the marker on `EnergyLandscape`, click
     **Auto-descend** and watch the trajectory play, click **Reseed**
     and watch the marker cycle through `RESEED_SEEDS`; each
     `MoleculeGallery` card's Copy-as-Qiskit button copies a valid
     `QuantumCircuit(…)` snippet.
3. **Smoke-test the Qiskit bridge.** On any essay, click any
   **Copy as Qiskit** button, paste into a local Python file or
   IBM Quantum's runtime, and confirm it executes without syntax
   errors. (The gate-coverage golden test guarantees mappings are
   syntactically valid; the smoke test catches deploy-time URL
   issues.)
4. **Smoke-test the progress indicator.** Visit `/qubit`, scroll
   past 50%, return to homepage, and confirm the `qubit` node on the
   concept map renders brighter (and the mobile list-fallback row
   too).
5. **Clear `localStorage["quantum/visited"]`** between test runs so
   you can re-verify on a clean slate.
6. **Run formal Lighthouse** per
   `.planning/phases/06-vqe/LIGHTHOUSE-PLAN.md` — every v3 route in
   both `prefers-color-scheme: light` and `prefers-color-scheme: dark`.
   Hard target: mobile accessibility ≥ 95 in both themes. Perf / best
   practices / SEO carry the v1 + v2 bar (≥ 90 / ≥ 95 / ≥ 95).
   Capture the verdict in `LIGHTHOUSE-PLAN.md`'s blank scorecard.
7. **Confirm `bundle-budget.json` ceilings are the post-recompute
   values.** Run `npm run check:bundle` against the deployed `dist/`
   and confirm all 24 routes within budget.
8. **Spot-check the dark theme** on every new widget — `EnergyLandscape`
   heatmap contrast, `MoleculeGallery` cards, `LargeCircuitView`
   block bands, `RSACountdown` markers, `AmplitudeBars`. The dark
   palette was contrast-tuned in v2 but v3's new widgets need
   explicit re-confirmation.
9. **Announce.** Post the HN title + tweet variants. Cross-post to
   `r/QuantumComputing` and `r/programming`. Update the `<URL>` /
   `<REPO>` placeholders before posting.

If steps 1–9 pass, ship.

## What if something fails

Hotfix branch named `v3.0.x` for any launch-day regression. Each v3
phase's `*-SUMMARY.md` and `*-VERIFICATION.md` (under
`.planning/phases/{02..06}*/`) is the rollback / triage baseline —
every commit can be cherry-picked or reverted individually because
each plan landed as an atomic commit.

The 12-essay reading path (`qubit → … → vqe`) is mirrored in
`tests/essays/nav-graph.test.ts`. The concept-map nodes are mirrored
in `tests/essays/concept-map.test.ts`. The sandbox starters are
mirrored in `tests/essays/sandbox-links.test.ts`. The per-route
bundle ceilings are mirrored in `bundle-budget.json`. Any drift
between source and mirror fails `npm test`, so any hotfix that
forgets to update a mirror is caught at CI.
