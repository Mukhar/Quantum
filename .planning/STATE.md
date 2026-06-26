# State

*Last updated: 2026-06-26 — Phase 4 complete. Ready to start Phase 5
(final phase before v1 launch).*

## Project Reference

See: `.planning/PROJECT.md` and `.planning/ROADMAP.md`.

- **Core value:** Earn dev trust with real, inspectable math — then
  unlock creativity by letting readers actually play.
- **Current focus:** Phase 5 (Algorithm track + v1 launch) has not
  started. Phase 4 is **done**; summary at
  `.planning/phases/04-foundations/04-SUMMARY.md`.

## Where we are

- [done] **Phase 1 (Foundation)** — `8148713`. 21-test simulator.
- [code-complete] **Phase 2 (Flagship qubit essay)** — all 6 plans
  landed. Deploy + dev-friend feedback + Lighthouse still pending,
  tracked in `.planning/phases/02-qubit-essay/REMAINING.md`.
- [done] **Phase 3 (Quantum Sandbox + Creative Outputs)** — all 7
  plans landed. Summary at
  `.planning/phases/03-sandbox/03-SUMMARY.md`.
- [done] **Phase 4 (Foundations essay track)** — all 6 plans landed.
  Four new essays + concept-map homepage + cross-essay nav + Bell-pair
  visualization. Highlights:
  - 130 tests passing (was 97 at start of phase).
  - 13 pages build clean.
  - Every essay carries a build-time-encoded "Open in sandbox →" CTA
    that round-trips through `decodeCircuit` (asserted in CI).
  - `ConceptMap.astro` homepage with all 5 live essays + sandbox +
    challenges + 2 dimmed v2 placeholders; mobile falls back to a
    stacked `<ol>`.
  - `MiniBloch.astro` extracted for the entanglement essay; reuses
    `reducedDensityMatrix` + `blochVectorFromRho` math from Phase 3.
- [not started] **Phase 5 (Algorithm track + v1 launch)** — zero
  files on disk. Plans per ROADMAP: CircuitBuilder embed mode,
  CNOT+Bell essay, Deutsch's algorithm essay, launch polish, launch
  announcement.

## Next action (resume here)

1. **(Optional) Close Phase 2 leftovers** — deploy to a static host,
   run a real-device Lighthouse pass, collect dev-friend feedback,
   delete `phases/02-qubit-essay/REMAINING.md`. Doesn't block Phase 5
   development, but does block the v1 launch announcement at the end
   of plan 05-05.
2. **Start Phase 5** via `smart_discuss`:
   - No `05-CONTEXT.md` exists yet. Discuss should lock:
     - Whether `CircuitBuilder` essay-embed mode (plan 05-01) reuses
       `composer.client.ts` as-is in a "read-mode" prop, or whether
       it gets a slimmer renderer that doesn't drag in undo/persist.
     - Whether to bring in Playwright (or any E2E harness) before
       shipping CNOT+Bell and Deutsch (both are interaction-heavy
       and would benefit from a smoke test).
     - Analytics opt-in story for launch (probably "no" — we've
       avoided it through Phase 4).
     - Final-Lighthouse acceptance criteria (LCP, a11y score, JS
       payload per route).
3. **Plan-phase per essay/feature** — probably 5 plans matching
   ROADMAP. CircuitBuilder embed mode is the only one that touches
   shared infra; the two essays can fan out in parallel like Phase 4
   did.
4. **Phase 5 DoD checkpoint** — all 7 essays cross-linked through
   the concept map; v1 launch announcement post drafted; Lighthouse
   passes across the board.

## Active architectural decisions carrying into Phase 5

1. **Reactivity = vanilla TS + in-repo `signal<T>`** — proven across
   sandbox (Phase 3) and essay-store widgets (Phase 2 + 4). Stay
   with it unless a Phase 5 widget genuinely demands more.
2. **`SandboxLink.astro` pattern** for any new essay that wants a
   deep-link CTA. Build-time encoding, static href, zero runtime
   cost. Round-trips asserted in `tests/essays/sandbox-links.test.ts`.
3. **`MiniBloch.astro` extraction pattern** for reusing sandbox
   visualization code outside the sandbox. Pull out the pure math +
   inline SVG; don't import hydrators coupled to sandbox singletons.
4. **Cross-essay nav lives in essay frontmatter**, not a centralized
   JSON. Chain integrity is asserted by
   `tests/essays/nav-graph.test.ts`.
5. **`ConceptMap.astro` is the canonical site nav**. Phase 5 must
   un-dim the v2 placeholders (CNOT+Bell, Deutsch) when those
   essays land — see plan-04-01-mirrored node list at the top of
   the file.

## Open risks (carried into Phase 5)

- **No E2E test harness yet.** 130 tests are all unit. CNOT+Bell and
  Deutsch will push the interaction surface up another notch;
  surface the Playwright question in `smart_discuss` for Phase 5
  entry.
- **Phase 2 `REMAINING.md` (deploy + Lighthouse + feedback)** still
  open. Phase 5 plan 05-05 ("final Lighthouse + retro") will need
  these resolved or it stalls.
- **Three.js chunk** is still 130.86 KB gzipped on every Bloch-using
  essay. Plans 05-02 (CNOT+Bell) and 05-03 (Deutsch) will both touch
  multi-qubit Bloch; verify they reuse the cached chunk and don't
  inadvertently split it.
- **Concept-map v2 placeholders are wired but dimmed.** When Phase 5
  essays land, update `ConceptMap.astro` AND `concept-map.test.ts`
  in lockstep — the test mirror catches drift.
