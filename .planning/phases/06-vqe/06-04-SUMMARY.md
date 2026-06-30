# Phase 6 Plan 06-04 — MoleculeGallery + per-card Qiskit export — Summary

**Phase:** 06-vqe
**Plan:** 06-04
**Status:** Complete

## What shipped

- `src/components/MoleculeGallery.astro` (new, 153 lines) — SSR card
  grid of the three pre-baked molecules from `src/data/molecules.json`
  (H₂, HeH⁺, LiH). Each card renders:
  - Name + chemical formula heading.
  - Equilibrium bond distance with a `disabled` range slider clearly
    labelled `"equilibrium · slider is illustrative"` (D-25 honesty
    rule — no live ab initio recomputation).
  - Saved ansatz parameters `θ₁ = …, θ₂ = …` in monospace.
  - Converged energy in **both** Hartree and eV (D-26):
    e.g. `-1.1370 Hₐ (-30.94 eV)`.
  - Embedded `<CircuitView circuit={…} showRemixLink={false} />` — the
    existing baked-at-SSR `data-qiskit` attr + page-wide event-delegated
    `copy-qiskit` handler give every card its Copy-as-Qiskit button at
    zero JS cost to the gallery itself (D-18).
  - Visible `precomputed_note` + text source citation per molecule.
- `tests/components/molecule-gallery.test.ts` (new, 160 lines, 11
  assertions across 2 suites):
  - **Structural** (source grep, 5 it-blocks): `data-widget="molecule-gallery"`
    + `data-molecule-id={m.id}` references the canonical 3-molecule
    set; imports `MOLECULES` + `MOLECULE_IDS` from the typed shim;
    embeds `<CircuitView showRemixLink={false}>` (no remix CTA); no
    `Math.random` / `crypto.getRandomValues` / `Date.now()` /
    `performance.now()` (D-25 pre-baked invariant); `validateCircuit`
    called at frontmatter time (D-21 safety net).
  - **Data pipeline** (parameterised over 3 molecules, 6 it-runs):
    `validateCircuit({qubits, steps: ansatz_ops})` round-trips
    without throwing; `toQiskit(circuit)` contains every rot op's
    converged θ within `1e-4` (robust against IEEE-754 representation
    of decimal JSON literals like `-0.142 → -0.14199999999999999`
    under `toPrecision(17)`).

## Locked decisions ratified

D-18 (use existing `CircuitView` baked Qiskit button — no new copy
mechanism), D-21 (frontmatter `validateCircuit` build-time gate), D-22
(three molecules only), D-23 (Hartree + eV both stored & displayed),
D-24 (`ansatz_ops` round-trips through `validateCircuit`), D-25 (slider
is non-destructive UI; data is pre-baked; "precomputed VQE result"
visible per card), D-26 (energy formatted in both units).

## Numbers

- Tests: +11 new (component + data-pipeline). Full
  `tests/components tests/quantum tests/data` suite: **452 passing**
  (was 441 before this plan).
- Bundle impact: **zero** — gallery ships no client JS. The
  per-card Copy-as-Qiskit button reuses `CircuitView`'s existing
  event-delegated hydrator (already bundled by every page that
  embeds a `CircuitView`).
- Type safety: `npx tsc --noEmit` reports no errors touching
  `MoleculeGallery.astro`, `molecule-gallery.test.ts`, or
  `src/data/molecules.ts`. (Pre-existing TS errors in
  `tests/feedback/feedback.test.ts` are unrelated — out of scope
  per `gsd-executor` deviation policy SCOPE BOUNDARY.)
- Build: `npm run build` completes; the component is not yet wired
  into a page (Plan 06-05 lands `/vqe.astro` which composes the
  gallery), so the build doesn't emit a route for it yet — its
  frontmatter compile is exercised by the test pipeline instead.

## Deviations

**1. [Rule 1 — Process bug, not auto-fixable] Commit bundled by sibling
06-03 executor.**
- **Found during:** the commit step at the end of Plan 06-04.
- **Issue:** Plan 06-03 (`EnergyLandscape.astro`) was being executed
  in parallel in the same working tree. Before I could land my own
  commit, the sibling agent grabbed all untracked files (almost
  certainly via `git add .` / `git add -A`, which the GSD
  `task_commit_protocol` explicitly forbids) and committed them
  together as `0bfa8a1` under the 06-03 commit message:
  > `feat(06-vqe/06-03): EnergyLandscape SSR heatmap + drag/keyboard/Auto-descend`
- **My deliverables in that commit:**
  - `src/components/MoleculeGallery.astro` — 153 lines, content
    matches this plan exactly (`validateCircuit(circuit)` at frontmatter,
    `<CircuitView … showRemixLink={false} />` per card, disabled slider,
    energy in Hartree + eV, source citation).
  - `tests/components/molecule-gallery.test.ts` — 160 lines, all 11
    assertions passing.
- **Why I did not "fix":** Rewriting `0bfa8a1` (via `git commit --amend`
  / `git reset`) would destroy the sibling agent's 06-03 work in the
  same commit and violate `destructive_git_prohibition` (no `git reset
  --hard`, no rewriting shared history). The content is correct; only
  the commit message is wrong for my plan, which is the sibling's
  staging bug.
- **Recommendation for the orchestrator:** in the phase-level Phase 6
  audit, attribute commit `0bfa8a1` to **both** 06-03 (EnergyLandscape +
  its test) and 06-04 (MoleculeGallery + its test). The git log will
  show only one commit for these two plans.

No other deviations from the plan. No architectural decisions required.
No authentication gates. No checkpoints reached. No new runtime
dependencies. `MAX_QUBITS` untouched (all 3 molecules have ≤ 4 qubits).

## Files

| Status | Path | Lines | Commit |
| ------ | ---- | ----- | ------ |
| New    | `src/components/MoleculeGallery.astro`     | 153 | `0bfa8a1` (bundled — see Deviations) |
| New    | `tests/components/molecule-gallery.test.ts` | 160 | `0bfa8a1` (bundled — see Deviations) |
| New    | `.planning/phases/06-vqe/06-04-SUMMARY.md` | this file | (next commit) |

## Self-Check

- `[x]` `src/components/MoleculeGallery.astro` exists and `git show
  HEAD:src/components/MoleculeGallery.astro` returns 153 lines of the
  expected content (header comment "MoleculeGallery — USE-05 …" is the
  first non-blank block).
- `[x]` `tests/components/molecule-gallery.test.ts` exists and `git show
  HEAD:tests/components/molecule-gallery.test.ts` returns 160 lines.
- `[x]` Commit `0bfa8a1` exists in `git log --oneline -5` and contains
  both my files (verified via `git show --stat HEAD`).
- `[x]` `npx vitest run tests/components/molecule-gallery.test.ts` →
  11 / 11 passing.
- `[x]` `npx vitest run tests/components tests/quantum tests/data` →
  452 / 452 passing.
- `[x]` `npm run build` → 23 pages compiled, no errors.

## Self-Check: PASSED
