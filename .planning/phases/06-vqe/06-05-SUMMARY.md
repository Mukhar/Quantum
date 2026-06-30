# Phase 6 Plan 06-05: `/vqe` Essay + Mirrors — Summary

**Phase:** 06-vqe
**Plan:** 06-05 — `/vqe` essay + all six same-commit mirrors
**Commit:** `24ba1f0` (single atomic commit, 11 files)
**Date:** 2026-06-30

---

## What shipped

Wired the Phase 6 building blocks into the final v3 essay and rewired
every same-commit mirror in one atomic commit. The v3 reading-path tail
is now `/shor → /vqe → /sandbox`; `/vqe` is the twelfth essay in the
reading path and the last one before the Sandbox.

### Essay (`src/pages/vqe.astro`, new)

- `EssayLayout` shell, two-half v3 rhythm matching
  `superdense-coding.astro` / `shor.astro` / `teleportation.astro`.
- **Algorithm half:** hook ("the quantum computer tries a
  wavefunction; the classical computer turns the knobs") → static
  `CircuitView` of the 2-parameter `Ry(θ₁) ⊗ Ry(θ₂) → CNOT(0,1)`
  ansatz built at frontmatter time from `DEFAULT_INITIAL_THETAS`
  (D-18) → slim VQE-local `<p data-role="ansatz-readout"
  aria-live="polite">` positioned above the landscape (D-19) →
  `EnergyLandscape` embed → hand-off paragraph (D-29).
- **Use-case half:** near-term industrial framing with sourced
  primary-source DOI citations (Peruzzo 2014, Kandala 2017,
  Cao 2019) → `MoleculeGallery` → explicit reality check
  ("classical baselines like HF and CCSD remain hard competition";
  "noise and barren-plateau training pathologies") → Qiskit CTA.
  Strictly no-hype prose (D-30).
- **Self-test** (2 questions) + **MathNerds appendix** covering the
  Rayleigh-Ritz energy functional, central finite-difference
  gradient (with parameter-shift rule footnote), and the
  GD-with-momentum update rule that mirrors `vqe.ts`.
- **Footer-nav:** prev `/shor`, next `/sandbox`.
- Inline script attaches `scrolly` + `annotations` and wires the
  `vqe:thetachange` listener that mirrors EnergyLandscape's marker
  into the slim ansatz readout.

### Mirror edits (D-45)

| File | Edit |
|---|---|
| `src/components/ConceptMap.astro` | New `/vqe` primary node at `(cx=670, cy=430)` on the same fourth row as `/shor`; new reading-path edge `12 → 13`; `aria-label` updated to "12 essays in reading order (5 foundations + 7 algorithm)". |
| `src/pages/shor.astro` | Footer-nav next rewired `/sandbox` → `/vqe`; header comment updated. |
| `src/pages/sitemap.xml.ts` | `/vqe` at priority `0.9`, slotted after `/shor`. |
| `bundle-budget.json` | `"vqe": 4096` conservative placeholder. |
| `tests/essays/concept-map.test.ts` | `expected[]` + `expectedEssays[]` include `/vqe`. |
| `tests/essays/nav-graph.test.ts` | `CHAIN[]` rewires `shor.next` `/sandbox → /vqe` and appends `{slug: vqe, prev: /shor, next: /sandbox}`. |
| `tests/essays/sandbox-links.test.ts` | `STARTERS["vqe"] = Ry|Ry|CNOT(0,1)` at `DEFAULT_INITIAL_THETAS` (shared source of truth with essay snapshot, gallery H₂ card, and EnergyLandscape default marker). |
| `src/components/EnergyLandscape.astro` | Hydrator's `render()` now dispatches `new CustomEvent("vqe:thetachange", { detail: { theta1, theta2 }, bubbles: true })` on theta updates (minimal extension; keeps CircuitView static per D-19). |
| `tests/components/energy-landscape.test.ts` | New assertion pins the event name, `CustomEvent` construction, and `bubbles: true` flag. |
| `tests/essays/vqe.test.ts` (new) | 8 structural assertions: file exists, every required import present, `EnergyLandscape` + `MoleculeGallery` embeds, ansatz built from `DEFAULT_INITIAL_THETAS`, slim readout + `vqe:thetachange` wiring, footer-nav `/shor` + `/sandbox`, sourced no-hype framing tokens present, D-30 hype tokens absent. |

## Numbers

- **Tests:** 625 → 639 (+14, all green; `vqe.test.ts` adds 8, the
  EnergyLandscape event assertion adds 1, and the mirror-list edits
  re-execute under the same test count without flips). All 41 vitest
  files green.
- **Build:** 23 → 24 pages; `dist/vqe/index.html` emits cleanly.
- **`/vqe` bundle (gzipped):** 2.3 KB actual vs 4.0 KB ceiling
  placeholder (`-1.7 KB` headroom). Below the 4096 B placeholder, so
  no in-plan ceiling bump. Recompute is OPS-04's job in Plan 06-08
  using `round_up(actual × 1.2, 1024)` = `round_up(2.76 KB, 1 KB) =
  3072 B`.

## Decisions locked

- **D-18** — Reused existing `CircuitView` for the static ansatz
  snapshot; no global mutation.
- **D-19** — Live theta readout is essay-local (slim
  `<p data-role="ansatz-readout">`) instead of overloading
  `CircuitView` with animated labels. Implemented via a single
  bubbling `CustomEvent` from EnergyLandscape's hydrator + a
  document-level listener in `/vqe`'s inline script.
- **D-27 / D-30** — Hook and use-case framing emphasise
  "credible near-term direction", "small benchmark molecules",
  and "classical baselines like HF / CCSD remain hard
  competition"; explicit hype tokens "VQE will discover drugs"
  and "breaks classical chemistry" are CI-pinned absent.
- **D-29** — "Energy minimization is the conceptual bridge"
  phrasing carried into the hand-off paragraph between halves.
- **D-37** — Flat ConceptMap layout (no algorithm-vs-use-case
  grouping yet); `/vqe` placed beside `/shor` on the same row.
- **D-43 / D-44 / D-45** — Same-commit mirrors landed atomically
  across source + tests + sitemap + budget; OPS-04 recompute
  deferred to Plan 06-08 per plan scope.

## Out-of-scope / deferred

- **Homepage prose counts** (`src/pages/index.astro` still says
  "Five interactive scrollytelling essays" / OG description
  "Seven interactive essays"). These have been stale since Phase
  2 and were not updated in any subsequent phase; bumping them in
  this plan would expand scope beyond the user's listed commit
  manifest. Logged here for OPS-04 / Plan 06-08 to consider.
- **Bundle ceiling recompute** for `/vqe` (placeholder holds; final
  ceiling lives in Plan 06-08).
- **PROG-01 visited indicator** (Plan 06-06).
- **OPS audits** (Plan 06-07).

## Deviations from plan

None. The plan executed exactly as written. The one mutation to a
previously-shipped component (EnergyLandscape's `render()` adding
a `CustomEvent` dispatch) was explicitly authorised by D-19 / the
plan as "the only acceptable mutation to a previously-shipped
component this plan", and is paired with the new
`tests/components/energy-landscape.test.ts` assertion that pins
the event name, type, and `bubbles: true` flag.

## Self-check

- `[x]` `src/pages/vqe.astro` exists on disk.
- `[x]` `tests/essays/vqe.test.ts` exists on disk.
- `[x]` Commit `24ba1f0` includes all 11 files.
- `[x]` All 639 vitest tests pass.
- `[x]` `npm run build` emits 24 pages, including `/vqe/index.html`.
- `[x]` `npm run check:bundle` green for all 24 routes.

## Self-Check: PASSED
