# State

*Last updated: 2026-06-25 after Phase 2 code-complete.*

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-06-25)

- **Core value:** Earn dev trust with real, inspectable math — then
  unlock creativity by letting readers actually play.
- **Current focus:** Phase 2 code is shipped. Two human-only sub-tasks
  remain (deploy + dev-friend feedback round). Phase 3 (Quantum
  Sandbox) is unblocked once Phase 2 is fully signed off.

## Where we are

- [done] Phase 1 (Foundation) — committed in `8148713`. Astro shell,
  simulator with X/Y/Z/H/S/T/CNOT + measurement, 21 vitest assertions.
- [code-complete] Phase 2 (Flagship qubit essay) — all 6 plans landed:
  - 02-02 (Rx/Ry/Rz + 11 tests) shipped (`8793525`)
  - 02-01 (EssayLayout + KaTeX + scrolly + /qubit stub)
  - 02-03 (per-page sim store + ProbabilityBars + StateVector + GateButtons)
  - 02-04 (BlochSphere — Three.js 3D + SVG 2D fallback, draggable)
  - 02-05 (RotationSlider + annotations layer)
  - 02-06 (final essay copy + a11y/perf polish + homepage update)
  - Remaining (human-only): deploy to a static host, run a feedback
    round with >= 3 dev friends, log iterations. Tracked in
    `.planning/phases/02-qubit-essay/REMAINING.md`.
- [next] Phase 3 (Quantum Sandbox + Creative Outputs) — 7 plans
  detailed in `.planning/phases/03-sandbox/PLAN.md`.

## Next action

1. Deploy `./dist` to a static host (commands in REMAINING.md). Log
   the host choice + URL in `PROJECT.md`.
2. Send the URL to >= 3 dev friends; capture notes in
   `docs/feedback/m1-round1.md`; do at least one iteration pass.
3. Run Lighthouse against the deployed `/qubit` and commit the
   report to `docs/perf/m1-lighthouse.html`.
4. Mark Phase 2 fully done in ROADMAP.md; start Phase 3 with
   Plan 03-01 (Circuit data model + URL-fragment codec).

## Active decisions logged during Phase 2

1. **Framework for islands** — Decided **vanilla TS** for Phase 2.
   Bundles stay tiny (4.78 KB main gzipped), DOM stays inspectable
   in DevTools (credibility win). Revisit at the start of Phase 3 —
   Plan 03-02 will pressure-test whether sandbox drag-drop + undo
   wants a real reactive runtime.
2. **Voice & tone** — Settled on **formal-but-friendly with a dry
   edge**. Copy reads like a working dev wrote it for working devs.
   Re-use for Phase 4 essays.
3. **URL codec format** — Still open. Design at the start of Phase 3
   (Plan 03-01). Likely base64url of a packed binary or compact JSON
   with a versioned prefix.

## Open risks (carried + updated)

- **Pedagogy quality** — code is done; the real test is the feedback
  round. Budget time for iteration before Phase 3 starts.
- **Simulator credibility** — Param rotations (Rx/Ry/Rz) now have 11
  textbook-grounded tests on top of Phase 1's 21. 32 assertions total.
- **Mobile drag interactions** — Polar2D fallback covers `< 640px`
  and no-WebGL; Sphere3D uses `touch-action: none` on the canvas to
  prevent scroll-hijack. To verify on real devices during the
  feedback round.
- **Three.js bundle weight** — 130 KB gzipped is acceptable for one
  widget. Phase 3 should be careful about pulling Three into the
  sandbox if a lighter renderer would do.
- **URL fragment bloat** — still open for Phase 3.
