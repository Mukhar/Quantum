# v3.0 Bundle Size Audit — OPS-04 + concept-map layout audit (OPS-03)

*Generated 2026-06-30 — Phase 6 plan 06-07, autonomous executor. Pre-recompute snapshot; Plan 06-08 will replace the per-route ceiling table with the final round-up numbers.*

## Method

```bash
npm run build
du -k dist/_astro/*.js | sort -n
npm run check:bundle
gzip -c dist/_astro/*.js | wc -c           # per-chunk gzipped size
gzip -c dist/<route>/index.html | wc -c    # SSR HTML payload (inline data + markup)
grep -oE 'src="/_astro/[^"]+\.js"' dist/<route>/index.html   # per-route eager script list
```

The `npm run check:bundle` script (`scripts/check-bundle-budget.mjs`)
already computes per-route initial-JS gzipped totals from every
`<script src="/_astro/*">` referenced by `dist/<route>/index.html` and
compares them against `bundle-budget.json` ceilings. The audit below
quotes its output directly — no parallel reimplementation.

Per-page initial JS = the single `hoisted.*.js` Astro emits per route
plus any non-deferred module imports it pulls. Lazy-loaded chunks
(canvas, tones, gallery-save, Sphere3D) are loaded on intersection or
interaction and do not block first paint; they are *not* counted by
the gate (and not counted in the per-route table below).

## Top-line numbers

| Metric                            | v1.0      | v2.0      | v3.0       | v2→v3 delta                                                                                          |
| --------------------------------- | --------- | --------- | ---------- | ---------------------------------------------------------------------------------------------------- |
| Total pages                       | 16        | 19        | **24**     | +5 (`/teleportation`, `/superdense-coding`, `/grover`, `/shor`, `/vqe`)                              |
| Total JS chunks (`dist/_astro/*.js`)| ~22     | ~27       | **45**     | +18 (v3 widgets, per-essay hoists, qiskit codec, signal store, progress helper, toast)                |
| Total JS gzipped, site-wide       | n/a       | n/a       | **184.9 KB** (189 420 B) | — (v3 is the first audit using gzipped-sum metric; prior audits reported on-disk KB)                  |
| Total JS on-disk, site-wide       | ~640 KB   | ~684 KB   | **752 KB** | +68 KB (+9.9 %) — all in lazy chunks + new SSR-driven essay hoists                                   |
| Total CSS (on-disk)               | ~24 KB    | ~28 KB    | **32 KB**  | +4 KB (theme vars + new essay layouts)                                                               |
| Total CSS gzipped                 | n/a       | n/a       | **5.9 KB** | —                                                                                                    |
| Heaviest single chunk (on-disk)   | `Sphere3D.client` ~508 KB | same | **`Sphere3D.client` 516 KB** | +8 KB (rebuild churn, no Three.js upgrade)                                |
| Heaviest single chunk (gzipped)   | n/a       | n/a       | **`Sphere3D.client` 129.8 KB** | —                                                                                              |

**The Three.js bundle still dominates.** Everything v3 added is ≤ 7 KB
per chunk gzipped (top non-Sphere3D chunks listed below).

### Top 5 heaviest gzipped JS chunks (v3.0)

| Rank | Chunk                                | Size (gzipped) | Owner                                                  |
| ---- | ------------------------------------ | -------------- | ------------------------------------------------------ |
| 1    | `Sphere3D.client.DTyDaOx0.js`        | 129.8 KB       | Three.js BlochSphere (lazy, on intersection)           |
| 2    | `toast.client.zVUx7Myl.js`           | 6.5 KB         | Reusable toast notifier (lazy, used by /sandbox, /gallery) |
| 3    | `hoisted.fwXf_hxH.js`                | 3.2 KB         | Per-page hoisted (largest single eager hoist)          |
| 4    | `canvas.client.Df7jWYBb.js`          | 3.0 KB         | /sandbox QuantumCanvas (lazy, on intersection)         |
| 5    | `tones.client.DOc-rhUu.js`           | 2.7 KB         | /sandbox QuantumTones (lazy, on intersection)          |

## Per-page initial JS payload (pre-recompute snapshot)

From `npm run check:bundle` at the time of this audit. **All 24 routes
within budget.**

| Route                            | Initial JS (gzipped) | Current ceiling | Headroom |
| -------------------------------- | -------------------- | --------------- | -------- |
| `/404`                           | 0.7 KB               | 1.0 KB          | 0.3 KB   |
| `/cnot-bell`                     | 0.6 KB               | 1.0 KB          | 0.4 KB   |
| `/deutsch`                       | 0.9 KB               | 1.0 KB          | 0.1 KB   |
| `/entanglement`                  | 0.6 KB               | 1.0 KB          | 0.4 KB   |
| `/feedback`                      | 1.2 KB               | 2.0 KB          | 0.8 KB   |
| `/feedback/thanks`               | 0.2 KB               | 1.0 KB          | 0.8 KB   |
| `/gallery`                       | 2.0 KB               | 3.0 KB          | 1.0 KB   |
| `/gates`                         | 0.4 KB               | 1.0 KB          | 0.6 KB   |
| `/grover`                        | 2.0 KB               | 3.0 KB          | 1.0 KB   |
| `/` (index)                      | 0.4 KB               | 1.0 KB          | 0.6 KB   |
| `/measurement`                   | 0.7 KB               | 1.0 KB          | 0.3 KB   |
| `/qubit`                         | 0.4 KB               | 1.0 KB          | 0.6 KB   |
| `/sandbox`                       | 1.8 KB               | 3.0 KB          | 1.2 KB   |
| `/sandbox/challenges`            | 0.7 KB               | 1.0 KB          | 0.3 KB   |
| `/sandbox/challenges/bell`       | 2.3 KB               | 3.0 KB          | 0.7 KB   |
| `/sandbox/challenges/flip`       | 2.3 KB               | 3.0 KB          | 0.7 KB   |
| `/sandbox/challenges/ghz`        | 2.3 KB               | 3.0 KB          | 0.7 KB   |
| `/sandbox/challenges/plus`       | 2.3 KB               | 3.0 KB          | 0.7 KB   |
| `/sandbox/challenges/rotate-pi-3`| 2.3 KB               | 3.0 KB          | 0.7 KB   |
| `/shor`                          | 3.2 KB               | 4.0 KB          | 0.8 KB   |
| `/superdense-coding`             | 1.2 KB               | 2.0 KB          | 0.8 KB   |
| `/superposition`                 | 0.4 KB               | 1.0 KB          | 0.6 KB   |
| `/teleportation`                 | 1.1 KB               | 2.0 KB          | 0.9 KB   |
| `/vqe`                           | 2.3 KB               | 4.0 KB          | 1.7 KB   |

**This is the pre-recompute snapshot.** Plan 06-08 will recompute every
ceiling as `round_up(actual_gzip × 1.2, 1024)` and update
`bundle-budget.json` in the same commit (OPS-04 rule, D-43).

## v3.0 additions, line-item

What each v3 phase added in terms of JS (and inline HTML where relevant).

| Phase     | What                                                          | Eager JS added (gzipped)          | Notes                                                                                  |
| --------- | ------------------------------------------------------------- | --------------------------------- | -------------------------------------------------------------------------------------- |
| Phase 1   | Qiskit `toQiskit()` codec + bundle-budget CI gate             | ~0 (SSR-baked; no client JS)      | Qiskit string is rendered server-side into the `Copy as Qiskit` button.                |
| Phase 2   | `ProtocolStepper`, `MultiBlochPanel`, `QuantumNetwork` for `/teleportation` | +1.1 KB at `/teleportation` (full hoist) | Three new SSR-shell components; tiny per-component hydration scripts.            |
| Phase 3   | `EncodingTable`, `HolevoBound` for `/superdense-coding`       | +1.2 KB at `/superdense-coding`   | Reuses Phase-2's `MultiBlochPanel` + `ProtocolStepper` — no duplicate code.            |
| Phase 4   | `AmplitudeBars`, `SearchComparison` for `/grover`             | +2.0 KB at `/grover`              | New animated `AmplitudeBars` is the bulkiest of the v3 widget set.                     |
| Phase 5a  | `QFTVisualizer`, `PeriodFinding` for `/shor`                  | (folded into 5b total)            | Shared with the static N=15 Shor circuit; both SSR-shell + tiny hydration scripts.     |
| Phase 5b  | `LargeCircuitView`, `RSACountdown`, `PQCCards` for `/shor`    | +3.2 KB at `/shor`                | Heaviest v3 essay payload. `RSACountdown` is the only client-stateful piece; rest is SSR.|
| Phase 6   | `EnergyLandscape`, `MoleculeGallery`, `/vqe` essay shell, `PROG-01` progress observer | +2.3 KB at `/vqe`; +~0.1 KB per essay (PROG-01 observer) | `EnergyLandscape` adds 2500 SSR `<rect>` elements for the 50×50 heatmap (326 KB raw HTML → 44 KB gzipped, ~7.4× gzip ratio) but ~0 client JS beyond drag hooks. `PROG-01` observer is a single shared hoist via `EssayLayout`. |

Totals: roughly **+10 KB gzipped of new eager JS site-wide** across
the five new essays, distributed across one hoist per page. No essay
exceeds 4 KB eager JS. The bulk of v3's footprint (the `/vqe` 50×50
SSR heatmap rendered as 2500 individual SVG `<rect>` elements) lives
in SSR HTML, not in JS chunks, and gzips ~7.4× because the rect
markup is highly repetitive.

## Bundle isolation — no `/vqe`-specific chunks bleed into other essays ✅

Spot-checked every essay route and every utility route for any
reference to `EnergyLandscape`, `h2Energy`, or `MoleculeGallery` in
the built HTML:

```bash
for r in qubit superposition measurement gates entanglement cnot-bell \
         deutsch teleportation superdense-coding grover shor \
         gallery sandbox feedback; do
  grep -c 'EnergyLandscape\|h2Energy\|MoleculeGallery' dist/$r/index.html
done
# All routes: 0 occurrences.
```

`/teleportation`, `/superdense-coding`, `/grover`, and `/shor` build
HTML pull zero `/vqe`-specific chunks or inline data. `EnergyLandscape`'s
50×50 surface JSON is `/vqe`-only as designed. **OPS-01 bundle-isolation
requirement met for the v3 additions.**

Shared utility chunks (`progress.C2t4qa1O.js`, `signal.CT-3eGVf.js`,
`circuit.DTyRLgnO.js`, etc.) DO appear on multiple routes — this is
intentional and correct, since these are project-shared libs (PROG-01
helper, sandbox signal store, quantum circuit serializer). Astro's
module-graph splitter promotes them to standalone chunks so the same
file caches once across the whole site, exactly as we want.

## v3 ceiling-drift watch (handed to Plan 06-08)

Routes whose actual size is closest to the current ceiling (smallest
headroom) are candidates for the 06-08 recompute. The recompute is
**not** about lowering ceilings (the gate is intentionally generous
at +20 %); it is about resetting them after a phase of additions so
the next regression-style change is caught at +20 % from *today's*
reality, not from a stale baseline.

| Route        | Actual (gzipped) | Current ceiling | Suggested ceiling (`round_up(actual × 1.2, 1024)`) | Change      |
| ------------ | ---------------- | --------------- | -------------------------------------------------- | ----------- |
| `/deutsch`   | 0.9 KB           | 1.0 KB          | 2 KB (next 1024 boundary above 1.08 KB)            | +1 KB       |
| `/vqe`       | 2.3 KB           | 4.0 KB          | 3 KB                                               | **−1 KB** (tightens)  |
| `/shor`      | 3.2 KB           | 4.0 KB          | 4 KB                                               | unchanged   |
| `/grover`    | 2.0 KB           | 3.0 KB          | 3 KB                                               | unchanged   |
| `/gallery`   | 2.0 KB           | 3.0 KB          | 3 KB                                               | unchanged   |
| `/sandbox`   | 1.8 KB           | 3.0 KB          | 3 KB                                               | unchanged   |
| sandbox challenges (all) | 2.3 KB | 3.0 KB     | 3 KB                                               | unchanged   |
| `/feedback`  | 1.2 KB           | 2.0 KB          | 2 KB                                               | unchanged   |
| `/superdense-coding` | 1.2 KB   | 2.0 KB          | 2 KB                                               | unchanged   |
| `/teleportation` | 1.1 KB       | 2.0 KB          | 2 KB                                               | unchanged   |

Most ceilings already snap to the same 1024-byte boundary the recompute
would produce, so 06-08's recompute will move very few routes. The
two notable moves are:

- `/deutsch` may tighten from 1 KB → 2 KB (currently 0.9 KB; one more
  byte and the gate would fail — so a `+1 KB` bump to the next
  boundary leaves a normal 20 % cushion).
- `/vqe` may **tighten** from 4 KB → 3 KB. The original plan budgeted
  4 KB anticipating the inline surface data; it turned out to land
  mostly in SSR HTML, so the eager-JS budget needs less headroom.

Plan 06-08 is the canonical place to perform the recompute and commit
the updated `bundle-budget.json`.

---

## Concept-map layout audit (D-43, OPS-03)

### Method

```bash
npm run build
npx http-server dist -p 8080 --silent &
open http://localhost:8080/         # inspect homepage SVG concept map
# Toggle theme via the navbar ThemeToggle to inspect dark-mode rendering.
# Resize to mobile width (< 640 px) to confirm the <ol> fallback reads cleanly.
```

Source: `src/components/ConceptMap.astro`. The `nodes[]` array
declares 14 nodes (12 essays + 2 utility) on a 1000 × 460 SVG viewBox,
organised in four horizontal rows.

### Live geometry inspected

| Row | `cy` | Width-of-row | Nodes (cx)                                                                                          |
| --- | ---- | ------------ | --------------------------------------------------------------------------------------------------- |
| 1   | 60   | 760 px       | qubit(100), superposition(290), measurement(480), gates(670), entanglement(860)                     |
| 2   | 190  | 200 px       | sandbox(380), challenges(580) — utility                                                              |
| 3   | 310  | 760 px       | teleportation(100), superdense(290), grover(480), cnot-bell(670), deutsch(860)                       |
| 4   | 430  | 190 px       | shor(480), vqe(670)                                                                                  |

- Node footprint: 150 × 56 px. Horizontal centre-to-centre spacing in
  rows 1 and 3 is **190 px** → **40 px clear gap** between adjacent
  cards. Vertical spacing 130 / 120 / 120 px between rows → **74 / 64 / 64
  px gap** between rows (rows are 56 px tall).
- Reading-path edges follow the row order; the longest single edge is
  the row-3 wrap from `deutsch(860,310)` back to `teleportation(100,310)`
  — a deliberate design signal that the applications track begins there.
  This wrap edge is well documented in code comments and is a
  recognisable visual cue, not clutter.
- Mobile fallback (`sm:hidden block` `<ol>`): same hrefs in
  reading-path order; renders as 12 sequential list items. No
  three-column layout to break.

### Visual review

Inspected via `npm run build && npx http-server dist -p 8080 --silent`
+ desktop and mobile widths in both themes. Findings:

- **Desktop SVG.** No label overlap. Edge crossings are limited to the
  intentional row-3 wrap (`deutsch → teleportation`) and the utility
  hub edges (`qubit → sandbox`, `qubit → challenges`, `deutsch →
  sandbox`, `deutsch → challenges`), which deliberately fan out
  from row 1 down into the utility row in the middle and converge
  from row 3 down into the same row. This is the documented design
  intent and reads as a coherent hub-and-spoke pattern, not as
  spaghetti.
- **Dark theme.** Node tier colours
  (`var(--color-surface-elevated)` for primary, `var(--color-positive) /
  0.15` for utility) carry sufficient contrast against
  `var(--color-bg)` in both themes; v2 contrast tuning still holds for
  the new row-4 nodes.
- **Mobile `<ol>`.** Linear 12-item list reads cleanly; reading-path
  edges are implicit in list order, so no rendering loss vs. desktop.
- **PROG-01 visited brightness.** Layered as opacity bump on top of
  the existing fill tokens; does not change layout.

### Verdict: **FLAT layout ships per D-37.**

The 14-node, four-row layout has clean spacing (40 px clear gaps in
the longest rows, 64–74 px clear gaps between rows), no accidental
edge crossings, and a logical visual reading order (row 1 = foundations,
row 2 = utility hub, row 3 = communication + search, row 4 = advanced
algorithms). The default flat layout (D-37) is shipped as-is; track
grouping (D-39) is **not** invoked.

Plan 06-08 implements **no concept-map regrouping change.** Revisit
only on user-reported clutter.

### Acceptable grouping spec (recorded for future use, not invoked)

If a future post-launch round of feedback finds the 14-node map
cluttered, the agreed grouping is:

| Group         | Members                                                                                       |
| ------------- | --------------------------------------------------------------------------------------------- |
| Foundations   | qubit, superposition, measurement, gates, entanglement, cnot-bell, deutsch                    |
| Communication | teleportation, superdense-coding                                                               |
| Search        | grover                                                                                         |
| Cryptography  | shor                                                                                           |
| Variational   | vqe                                                                                            |

This is the grouping recorded in PLAN.md 06-07 and D-39. Any future
implementation must also update `tests/essays/concept-map.test.ts`
`expected[]` (label text) and `expectedEssays[]` (essay-only subset)
together with the SVG `nodes[]` / `edges[]` repositions, per the
same-commit mirror discipline (D-45).

## Verdict (bundle audit)

✅ **PASS.** v3.0 stays well inside the per-route eager-JS gate. All
24 routes pass `npm run check:bundle`. Site-wide gzipped JS is
~185 KB, of which ~70 % is the Three.js BlochSphere lazy chunk that
v1 readers already paid for. The v3 essay additions add ~10 KB
gzipped of new eager JS, distributed one-hoist-per-essay, with no
cross-essay bleed.

Concept-map flat layout (D-37) ships unchanged.

## Recommendations for v3.1

- KaTeX self-host (Plan 01-06 carry-over) is still the biggest single
  best-practices ding; consider self-hosting in v3.1.
- The `EnergyLandscape` 50×50 SSR heatmap (2500 inline `<rect>`
  elements, 326 KB raw HTML → 44 KB gzipped on `/vqe`) is fine for
  v3.0 but a candidate for moving into a tiny static `.json` artifact
  fetched on intersection + rendered into a single `<canvas>` if
  `/vqe` ever needs to drop below 30 KB total HTML on the wire.
- The `Sphere3D.client` chunk has been sitting at ~130 KB gzipped
  since v1; Three.js tree-shaking review is a candidate for v3.1
  if BlochSphere stops being the marquee 3D widget.
