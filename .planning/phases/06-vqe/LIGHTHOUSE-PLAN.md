# v3.0 Lighthouse Plan — OPS-01

*Generated 2026-06-30 — Phase 6 plan 06-07, autonomous executor.*

## Why this is a plan, not a report

Lighthouse needs Chrome + a live HTTP server. The v3 close-out
cannot run it in CI (no headless Chrome in the agent environment).
The v3 build is static (`astro build` → `dist/`) and easy to serve
locally, so this doc fully specifies the manual recipe — copy-paste
the commands, run them, fill in the verdict on launch day.

## v1.0 → v2.0 baselines

From `.planning/phases/_archive-v1/05-algorithms/LIGHTHOUSE.md` and
`.planning/phases/_archive-v2/04-launch-polish/LIGHTHOUSE-PLAN.md`.

| Metric                | v1 target | v1 actual                       | v2 target  | v2 verdict        |
| --------------------- | --------- | ------------------------------- | ---------- | ----------------- |
| Performance (mobile)  | ≥ 90      | 95–100 across all routes        | same bar   | achievable        |
| Accessibility         | ≥ 95      | 100 across all routes           | ≥ 95       | achievable        |
| Best Practices        | ≥ 95      | 100                             | ≥ 95       | achievable        |
| SEO                   | ≥ 95      | 100                             | ≥ 95       | achievable        |

## v3.0 targets (D-42, OPS-01)

**Hard target — mobile accessibility ≥ 95 in BOTH themes** across every
v3 route. Both `prefers-color-scheme: light` and `prefers-color-scheme:
dark` must clear the bar; the dark palette in `src/styles/theme.css` was
contrast-tuned by Phase 4 of v2, but v3 adds new widgets (`EnergyLandscape`
heatmap, `MoleculeGallery` cards, `PROG-01` visited indicator) whose dark
rendering needs explicit re-confirmation on launch day.

Perf / best-practices / SEO carry the v1 + v2 bar (≥ 90 perf mobile,
≥ 95 best-practices, ≥ 95 SEO). No regression on any v1 or v2 route.

## Route matrix (24 routes, derived from `bundle-budget.json`)

The route list below is derived from the live `bundle-budget.json`
`routes` keys at the time of writing (24 entries). Each route is
audited in both themes.

```
404
cnot-bell
deutsch
entanglement
feedback
feedback/thanks
gallery
gates
grover
index            (homepage /)
measurement
qubit
sandbox
sandbox/challenges
sandbox/challenges/bell
sandbox/challenges/flip
sandbox/challenges/ghz
sandbox/challenges/plus
sandbox/challenges/rotate-pi-3
shor
superdense-coding
superposition
teleportation
vqe
```

## Manual run recipe

```bash
# 1. Build & serve
npm run build
npx http-server dist -p 8080 --silent &
SERVER_PID=$!

# 2. Install lighthouse if not present
# npm i -g lighthouse

# 3. Run on every v3 route (light theme) and capture HTML reports
mkdir -p .planning/phases/06-vqe/lighthouse-runs

ROUTES=(
  /
  /qubit
  /superposition
  /measurement
  /gates
  /entanglement
  /cnot-bell
  /deutsch
  /teleportation
  /superdense-coding
  /grover
  /shor
  /vqe
  /sandbox
  /sandbox/challenges
  /sandbox/challenges/bell
  /sandbox/challenges/flip
  /sandbox/challenges/ghz
  /sandbox/challenges/plus
  /sandbox/challenges/rotate-pi-3
  /gallery
  /feedback
  /feedback/thanks
  /404
)

# Light theme — mobile preset (default)
for route in "${ROUTES[@]}"; do
  slug=$(echo "$route" | tr '/' '_' | sed 's/^_//' | sed 's/_$//')
  : "${slug:=home}"
  lighthouse "http://localhost:8080$route" \
    --output=html \
    --output-path=".planning/phases/06-vqe/lighthouse-runs/${slug}.light.html" \
    --chrome-flags="--headless"
done

# Dark theme — mobile preset, forced via emulated prefers-color-scheme
for route in "${ROUTES[@]}"; do
  slug=$(echo "$route" | tr '/' '_' | sed 's/^_//' | sed 's/_$//')
  : "${slug:=home}"
  lighthouse "http://localhost:8080$route" \
    --output=html \
    --output-path=".planning/phases/06-vqe/lighthouse-runs/${slug}.dark.html" \
    --chrome-flags="--headless --force-prefers-color-scheme=dark"
done

# 4. Tear down
kill $SERVER_PID
```

The two-pass loop (light then dark) totals 48 audits. On a 2024 MacBook
each Lighthouse run takes ~10 s; full sweep ≈ 8 min.

## Per-route expected-score table

### v1 carryover (must not regress vs v1 actuals)

| Route                | Perf (light/dark) | A11y (light/dark) | Best Prac | SEO  |
| -------------------- | ----------------- | ----------------- | --------- | ---- |
| `/` (homepage)       | 100 / 100         | 100 / ≥ 95        | 100       | 100  |
| `/qubit`             | 95+ / 95+         | 100 / ≥ 95        | 100       | 100  |
| `/superposition`     | 95+ / 95+         | 100 / ≥ 95        | 100       | 100  |
| `/measurement`       | 95+ / 95+         | 100 / ≥ 95        | 100       | 100  |
| `/gates`             | 95+ / 95+         | 100 / ≥ 95        | 100       | 100  |
| `/entanglement`      | 95+ / 95+         | 100 / ≥ 95        | 100       | 100  |
| `/cnot-bell`         | 95+ / 95+         | 100 / ≥ 95        | 100       | 100  |
| `/deutsch`           | 95+ / 95+         | 100 / ≥ 95        | 100       | 100  |

The 5-point performance band reflects the BlochSphere 3D lazy chunk —
if it intersects during audit, TBT can dip a few points. Not a v1
regression.

### v2 carryover (must not regress vs v2 actuals)

| Route                | Perf (light/dark) | A11y (light/dark) | Best Prac | SEO  |
| -------------------- | ----------------- | ----------------- | --------- | ---- |
| `/feedback`          | ≥ 95 / ≥ 95       | ≥ 95 / ≥ 95       | 100       | 100  |
| `/feedback/thanks`   | ≥ 95 / ≥ 95       | ≥ 95 / ≥ 95       | 100       | 100  |
| `/gallery`           | ≥ 95 / ≥ 95       | ≥ 95 / ≥ 95       | 100       | 100  |

### Sandbox (v1 carryover)

| Route                            | Perf (light/dark) | A11y (light/dark) | Best Prac | SEO  |
| -------------------------------- | ----------------- | ----------------- | --------- | ---- |
| `/sandbox`                       | 90+ / 90+         | 100 / ≥ 95        | 100       | 100  |
| `/sandbox/challenges`            | 95+ / 95+         | 100 / ≥ 95        | 100       | 100  |
| `/sandbox/challenges/bell`       | 95+ / 95+         | 100 / ≥ 95        | 100       | 100  |
| `/sandbox/challenges/flip`       | 95+ / 95+         | 100 / ≥ 95        | 100       | 100  |
| `/sandbox/challenges/ghz`        | 95+ / 95+         | 100 / ≥ 95        | 100       | 100  |
| `/sandbox/challenges/plus`       | 95+ / 95+         | 100 / ≥ 95        | 100       | 100  |
| `/sandbox/challenges/rotate-pi-3`| 95+ / 95+         | 100 / ≥ 95        | 100       | 100  |

### v3 essay routes (new)

These five routes are net-new in v3 (Phase 2–6) and introduce new
widget surfaces that the audit must validate:

| Route                  | Perf (light/dark) | A11y (light/dark) | Best Prac | SEO  | New widgets exercised                                                       |
| ---------------------- | ----------------- | ----------------- | --------- | ---- | --------------------------------------------------------------------------- |
| `/teleportation`       | **≥ 95 / ≥ 95**   | **≥ 95 / ≥ 95**   | 100       | 100  | `ProtocolStepper`, `MultiBlochPanel`, `QuantumNetwork`                       |
| `/superdense-coding`   | **≥ 95 / ≥ 95**   | **≥ 95 / ≥ 95**   | 100       | 100  | `EncodingTable`, `HolevoBound`, reused `MultiBlochPanel`                    |
| `/grover`              | **≥ 95 / ≥ 95**   | **≥ 95 / ≥ 95**   | 100       | 100  | `AmplitudeBars`, `SearchComparison`                                          |
| `/shor`                | **≥ 95 / ≥ 95**   | **≥ 95 / ≥ 95**   | 100       | 100  | `QFTVisualizer`, `PeriodFinding`, `LargeCircuitView`, `RSACountdown`, `PQCCards` |
| `/vqe`                 | **≥ 90 / ≥ 90**   | **≥ 95 / ≥ 95**   | 100       | 100  | `EnergyLandscape` (50×50 inline heatmap + draggable marker), `MoleculeGallery` |

`/vqe` carries a slightly lower performance band because the
`EnergyLandscape` SSR surface renders the 50×50 heatmap as ~2500
individual SVG `<rect>` elements baked into the HTML body. Raw
`dist/vqe/index.html` weighs 326 KB; gzip compresses the repetitive
rect markup ~7.4× down to 44 KB on the wire. Eager JS is still
2.3 KB gzipped (well under the 4 KB ceiling), but Time-to-Interactive
on mobile may register a small dip versus the leaner essays because
the browser parses 2500 SVG nodes during initial layout.

## Pre-known a11y concerns to verify on the day

- **`EnergyLandscape` marker drag** — pointer-driven SVG marker on
  `/vqe` exposing the optimizer step. On the day, verify:
  - Focus ring visible in both themes when marker receives keyboard focus.
  - Arrow-key nudge (`ArrowUp/Down/Left/Right`) moves the marker in
    fixed increments and updates `aria-valuenow` on the hosting
    `role="slider"` group.
  - `aria-valuemin` / `aria-valuemax` / `aria-valuetext` correctly
    describe the θ₁/θ₂ parameter range.
  - Touch tap-target hit area ≥ 24×24 px (WCAG 2.5.8 minimum).
- **`MoleculeGallery` card focus order** — three pre-baked molecule
  cards on `/vqe`. Verify natural tab order (H₂ → LiH → HeH⁺) and that
  the Qiskit-export affordance per card is reachable via keyboard
  with no focus traps.
- **`PROG-01` visited-state announcement** — concept-map nodes on
  `/` switch brightness when their essay is marked visited in
  `localStorage["quantum/visited"]`. Verify the visited state is
  reflected in `aria-label` (e.g. `"Qubit (visited)"`) so screen
  readers convey progress, not just the visual brightness change.
- **`LargeCircuitView` horizontal scroll region** — re-asserted from
  Plan 05b's deferral. The scrollable container on `/shor` must have
  `role="region"`, `aria-label`, `tabindex="0"`, and keyboard scroll
  (Arrow / PageUp / PageDown / Home / End).
- **Reduced motion** — `prefers-reduced-motion: reduce` must:
  - Disable the `EnergyLandscape` Auto-descend animation; it should
    snap directly to the final converged state and announce the
    final energy via an `aria-live="polite"` region.
  - Disable any concept-map hover transitions.
  - Leave drag-driven marker motion (which is user-controlled, not
    autonomous) intact.

## Pre-known perf concerns

- **KaTeX still CDN-loaded.** Plan 01-06 (self-host KaTeX) was deferred
  to the v2.1 backlog and remains deferred for v3.0. Lighthouse may
  knock 1–2 points off Best Practices for "no third-party blocking
  resources." Not a launch blocker — explicit defer noted in
  ROADMAP backlog.
- **`Sphere3D.client` chunk (~516 KB on disk, ~130 KB gzipped).**
  Lazy-loaded via `IntersectionObserver` and only fired on essays
  that mount `<BlochSphere mode="3d">`. Not in first-paint critical
  path. Verify the audit does not start the intersection observer
  during paint-stable measurement.
- **`EnergyLandscape` inline 50×50 SSR heatmap on `/vqe`.** The
  surface is rendered as 2500 individual SVG `<rect>` elements at
  build time. Raw `dist/vqe/index.html` = 326 KB uncompressed, 44 KB
  gzipped — gzip compresses the repetitive rect markup ~7.4×. The
  eager JS chunk is 2.3 KB gzipped (well within the 4 KB `/vqe`
  ceiling), so this is a paint / layout cost, not a script-cost
  concern. Verify it does not push `/vqe` mobile Perf below the
  ≥ 90 floor.

## CI integration recipe (post-launch, v3.1+)

For v3.1, wire Lighthouse into the GitHub Actions deploy workflow:

```yaml
# .github/workflows/lighthouse.yml (sketch — for v3.1+)
- uses: treosh/lighthouse-ci-action@v11
  with:
    urls: |
      https://quantum.example.com/
      https://quantum.example.com/qubit
      ...
      https://quantum.example.com/vqe
    budgetPath: .planning/lighthouse-budget.json
    uploadArtifacts: true
```

Per-route budget JSON to be drafted when wiring CI. Both themes
require a separate audit pass, as in the manual recipe above.

## Verdict

*Intentionally blank — pending the manual launch-day run.*

Fill in after the 48-audit sweep completes. Record per-route pass/fail
in a table mirroring the expected-score grid above; flag any route
that misses the ≥ 95 mobile a11y bar in either theme as a v3.0
launch blocker.
