# State

*Last updated: 2026-06-25 after bootstrapping `.planning/`.*

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-06-25)

- **Core value:** Earn dev trust by teaching quantum with real, inspectable math — no hand-wavy metaphors.
- **Current focus:** Phase 2 — Flagship "What is a Qubit?" essay (Milestone 1 in the design doc).

## Where we are

- [done] Phase 1 (Foundation) — committed in `8148713`. Astro shell,
  simulator with X/Y/Z/H/S/T/CNOT + measurement, 24 vitest assertions.
- [active] Phase 2 plan written at `.planning/phases/02-qubit-essay/PLAN.md`.
  5 plans listed; none started.

## Next action

Open `.planning/phases/02-qubit-essay/PLAN.md` and start **Plan 02-01:
Astro page shell + KaTeX + scrolly helper + per-essay layout**. This is
the unblocker — every subsequent plan depends on the page scaffolding
and shared simulator binding.

## Active decisions to revisit during Phase 2

1. **Framework for islands** — vanilla TS vs. Preact vs. React. Decide
   at the start of 02-02 once the first widget's complexity is real.
   Bias: Preact for the 3KB payload if vanilla starts feeling crufty.
2. **Voice & tone** — formal-but-friendly (Distill) vs. playful (3B1B).
   Set the standard inside the qubit essay; reuse for M2.
3. **Concept-map layout** — defer until Phase 3, but jot ideas as they
   come up during essay writing.

## Open risks (carried from design doc §10)

- Pedagogy quality is the bottleneck, not the tech. Budget at least
  half of Phase 2 time on essay copy + reader feedback iteration.
- Simulator bugs would destroy trust. Any new gate/widget interaction
  added in Phase 2 must come with vitest coverage.
- Mobile complexity for 3D widgets — fall back gracefully (2D polar).
