# State

*Last updated: 2026-06-25 after pivoting to a creativity-first roadmap.*

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-06-25)

- **Core value:** Earn dev trust with real, inspectable math — then
  unlock creativity by letting readers actually play.
- **Current focus:** Phase 2 — Flagship **interactive** qubit essay
  (now includes parameterized rotation gates, draggable Bloch sphere,
  and pinned annotations — laying the rails for the Phase 3 sandbox).

## Where we are

- [done] Phase 1 (Foundation) — committed in `8148713`. Astro shell,
  simulator with X/Y/Z/H/S/T/CNOT + measurement, 24 vitest assertions.
- [active] Phase 2 expanded from 5 to 6 plans to add param rotations
  (Rx/Ry/Rz), draggable Bloch arrow, and the annotations system.
- [planned] Phase 3 (Quantum Sandbox + Creative Outputs) — 7 plans
  detailed in `.planning/phases/03-sandbox/PLAN.md`.

## Next action

Open `.planning/phases/02-qubit-essay/PLAN.md` and start **Plan 02-01:
Astro page shell + KaTeX + scrolly helper + per-essay layout**. This is
the unblocker — every subsequent plan depends on the page scaffolding
and shared simulator binding.

## Active decisions to revisit during Phase 2

1. **Framework for islands** — vanilla TS vs. Preact. Now leaning
   Preact since the Phase 3 sandbox will almost certainly need it for
   complex drag-drop + undo state. Lock the call at the end of 02-03
   based on real widget plumbing pain.
2. **Voice & tone** — formal-but-friendly (Distill) vs. playful (3B1B).
   Set inside the qubit essay; reuse from Phase 4 onward.
3. **URL codec format** — design at the start of Phase 3 (03-01).
   Likely base64url of a packed binary or compact JSON. Versioned
   prefix so future schema changes don't break old links.

## Open risks (carried + updated)

- **Pedagogy quality is the bottleneck for Phase 2**, but the sandbox
  shifts the bottleneck for the rest of the project to *interaction
  design quality*. Budget time in Phase 3 for real play-testing.
- **Simulator bugs would destroy trust.** Param rotations (Rx/Ry/Rz)
  added in 02-02 must come with thorough textbook tests — these are
  the basis of all sandbox creativity.
- **Mobile complexity for drag interactions** — sandbox drag-drop on
  touch is genuinely hard. Plan for tap-to-place fallback in Phase 3.
- **URL fragment bloat** — pathological circuits could push fragments
  over chat-tool URL limits. Codec needs to be measured + capped early.
