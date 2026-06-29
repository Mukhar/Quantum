# State

*Last updated: 2026-06-29 — v3.0 milestone started. v2.0 code-complete
with operational launch tasks carrying over. v3 design ratified;
roadmap & requirements being defined.*

## Project Reference

See: `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`,
`.planning/ROADMAP.md`, `.planning/MILESTONES.md`.

- **Core value:** Earn dev trust with real, inspectable math — then
  unlock creativity by letting readers actually play.
- **Current milestone:** **v3.0 — Algorithms × Use Cases.** Pair the
  canonical quantum algorithm canon with the practical use case each
  one unlocks. Five interleaved essays + Qiskit-export bridge to real
  hardware.
- **v1.0 status:** **Code-complete, deploy pending.** All 5 v1 phases
  shipped (146 tests, 16 pages). Deploy is a parallel ops task.
- **v2.0 status:** **Code-complete, deploy pending.** All 4 v2 phases
  shipped (247 tests, 19 pages, +44 KB site bundle). Pending: Apps
  Script provisioning, Lighthouse run, launch smoke test, ship.
- **v3.0 status:** **Design ratified.** Source of truth:
  `docs/plans/2026-06-29-v3-design.md`. Requirements & roadmap in
  progress (`/gsd-new-milestone v3.0` in flight).

## Current Position

| | |
|---|---|
| Phase | — (v3.0 milestone setup in progress) |
| Plan | — |
| Status | Milestone scoping — REQUIREMENTS.md + ROADMAP.md being written |
| Last activity | 2026-06-29 — v3 design committed (`docs/plans/2026-06-29-v3-design.md`) |

## Where we are

### v3.0 — current (in progress)

Phase numbering reset to 1 for v3 (matching v2's pattern).

- [ ] **Phase 1** — Foundation: Qiskit text export (sandbox + every
  essay `CircuitView`) + bundle-size CI gate.
- [ ] **Phase 2** — Teleportation + Quantum Networks (FLAGSHIP).
- [ ] **Phase 3** — Superdense coding + Bandwidth / Holevo bound.
- [ ] **Phase 4** — Grover + Search reality check.
- [ ] **Phase 5** — Shor + QFT + Post-quantum crypto threat.
- [ ] **Phase 6** — VQE + Quantum chemistry + progress indicator + v3 launch.

### v2.0 — code-complete (operational launch tasks carrying over)

1. Provision Apps Script web app + set `PUBLIC_FEEDBACK_URL` env.
2. Run manual Lighthouse audit per `_archive-v2/04-launch-polish/LIGHTHOUSE-PLAN.md`.
3. Run launch-day smoke test per `_archive-v2/04-launch-polish/LAUNCH-ANNOUNCEMENT.md` steps 1-11.
4. Push, deploy, announce.
5. v1 deploy carryover (if not yet shipped).

These operational tasks do NOT block v3 phase work.

### v1.0 — archived

All 5 phases done. Artifacts under `.planning/phases/_archive-v1/`.

### v2.0 — archived

All 4 phases done. Artifacts under `.planning/phases/_archive-v2/`.

## Parallel ops tasks (not phase work)

### v1 deploy

When ready (does not block v3):

1. **Pick a deploy host.** Cloudflare Pages recommended (free, global
   edge, zero config for static Astro output):
   ```bash
   npx wrangler pages deploy ./dist --project-name quantum
   ```
2. **Build + deploy:** `SITE_URL=https://your-url npx astro build`.
3. **Generate a PNG og-image** from `public/og/quantum.svg`.
4. **Replace `<URL>` and `<REPO>` placeholders** in the v1 launch
   announcement template.
5. **Formal Lighthouse pass** against every route.

### v2 deploy

1. Provision Apps Script (see `docs/apps-script.md`).
2. Set `PUBLIC_FEEDBACK_URL`.
3. Lighthouse run; launch announcement.

## Active architectural decisions carrying into v3

The decisions below survived v1 + v2 and are locked into the PROJECT.md
key-decisions table. No re-litigation needed at planning time:

1. **Reactivity = vanilla TS + in-repo `signal<T>`.**
2. **Sandbox visualization re-use pattern:** when an essay needs
   sandbox-renderer math, extract a slim component (`MiniBloch`,
   `CircuitView`); do NOT import sandbox hydrators coupled to the
   singleton sandbox store. v3 essay widgets follow this rule.
3. **Build-time circuit encoding for deep links:** `SandboxLink` and
   `CircuitView` encode `Circuit` literals at Astro frontmatter time.
   All v3 essays + the Qiskit-export feature reuse this codec.
4. **Cross-essay nav in essay frontmatter,** asserted by
   `tests/essays/nav-graph.test.ts`. v3 essays extending the nav chain
   must touch the test mirror in the same commit.
5. **Test mirrors of source canonical lists** (concept-map nodes, nav
   chain, sandbox-link starters). v3 adds 5 new essays + new sandbox
   starters; touch mirrors in the same commit.
6. **No analytics. Ever.** Re-ratified at v3 entry. v3 progress
   indicator uses `localStorage` visited flags only.
7. **Simulator stays at 4 qubits.** Hard cap (REQ-13) carries.
8. **Qiskit export is the bridge** for circuits that exceed 4 qubits
   (Shor on N=15) or that readers want to run on real hardware.

## v3 open questions (resolve during plan-phase)

From `docs/plans/2026-06-29-v3-design.md` §8:

1. **Teleportation visual** — Bloch swap animation polish (Phase 2).
2. **Concept-map redesign** — track grouping if 10 essays clutters
   the current layout (Phase 6 audit).
3. **Holevo widget design** — slider mapping (`n_bits` vs `n_qubits`)
   to be finalized in Phase 3.
4. **QFT visualization** — frequency-domain rendering style; settle
   in Phase 5.
5. **Energy landscape interactive** — auto-descend vs. drag-the-ball
   UX; decide in Phase 6 plan.

## Open risks for v3

- **Phase 5 (Shor + QFT + PQC) density** — biggest risk; may need to
  split or extend. Plan-phase should explicitly budget against this.
- **Qiskit export drift** — golden tests per gate (QSK-03) are the
  mitigation; gate set evolves over the milestone.
- **Bundle bloat from 5 new essays + widgets** — bundle CI gate
  (OPS-04) is the mitigation; per-route budget enforced.
- **MultiBlochPanel mixed-state rendering** — sphere only honestly
  represents pure states; design doc §3.3 mandates the panel show
  vectors inside the sphere when ρ is mixed. Easy to get wrong.
- **VQE optimizer correctness in vanilla TS** — gradient descent on a
  toy energy surface; must be ~50-100 LOC and unit-tested.

## Accumulated context (carries across phases)

- v1 archive layout: `.planning/phases/_archive-v1/{02,03,04,05}-*`.
- v2 archive layout: `.planning/phases/_archive-v2/{01,02,03,04}-*`.
- v1+v2 SUMMARY files are the best reference for "how a phase looked
  when it shipped" — same template applies to v3 SUMMARY files.
- KaTeX still loaded via `cdn.jsdelivr.net`; not retired in v2. Track
  as a v3 nice-to-have if it shows up in OPS-04 bundle audit.
- v2 deferred Playwright visual regression (THEME-05); same deferral
  applies to v3 unless explicitly re-scoped.
