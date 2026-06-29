# v2.0 Lighthouse Plan — OPS-01

*Generated 2026-06-28 — Phase 4, autonomous.*

## Why this is a plan, not a report

Lighthouse needs Chrome + a live HTTP server. This Phase 4 closeout
cannot run it in CI (no headless Chrome available in the agent
environment). The doc below specifies exactly how to run it on
launch day and what targets to hit.

## v1.0 baseline (from `.planning/phases/_archive-v1/05-algorithms/LIGHTHOUSE.md`)

| Metric | Target | v1 actual |
|---|---|---|
| Performance (mobile) | ≥ 90 | 95-100 across all routes |
| Accessibility | ≥ 95 | 100 across all routes |
| Best Practices | ≥ 95 | 100 |
| SEO | ≥ 95 | 100 |

## v2.0 targets — same bar

No regression on any v1 route. New v2 routes must clear the same
thresholds.

## Manual run recipe

```bash
# 1. Build & serve
npm run build
npx http-server dist -p 8080 --silent &
SERVER_PID=$!

# 2. Install lighthouse if needed
npm i -g lighthouse

# 3. Run on every v2 route
mkdir -p .planning/phases/04-launch-polish/lighthouse-runs

for route in / qubit superposition measurement gates entanglement \
             cnot-bell deutsch sandbox sandbox/challenges feedback \
             feedback/thanks gallery; do
  slug=$(echo "$route" | tr '/' '_')
  lighthouse "http://localhost:8080/$route" \
    --preset=desktop \
    --output=html \
    --output-path=".planning/phases/04-launch-polish/lighthouse-runs/${slug:-home}.html" \
    --chrome-flags="--headless"
done

# 4. Also run mobile preset for the two new content pages
for route in feedback gallery; do
  lighthouse "http://localhost:8080/$route" \
    --output=html \
    --output-path=".planning/phases/04-launch-polish/lighthouse-runs/${route}_mobile.html" \
    --chrome-flags="--headless"
done

kill $SERVER_PID
```

## Per-route expected scores

### Essay routes (v1 carryover — must not regress)

| Route | Perf | A11y | Best Prac | SEO |
|---|---|---|---|---|
| `/` | 100 | 100 | 100 | 100 |
| `/qubit` | 95+ | 100 | 100 | 100 |
| `/superposition` | 95+ | 100 | 100 | 100 |
| `/measurement` | 95+ | 100 | 100 | 100 |
| `/gates` | 95+ | 100 | 100 | 100 |
| `/entanglement` | 95+ | 100 | 100 | 100 |
| `/cnot-bell` | 95+ | 100 | 100 | 100 |
| `/deutsch` | 95+ | 100 | 100 | 100 |

The 5-point performance band is for the BlochSphere 3D lazy chunk —
if it intersects during the audit, it can knock TBT a few points.
Not a regression vs v1.

### Sandbox (v1 carryover)

| Route | Perf | A11y | Best Prac | SEO |
|---|---|---|---|---|
| `/sandbox` | 90+ | 100 | 100 | 100 |
| `/sandbox/challenges` | 95+ | 100 | 100 | 100 |
| `/sandbox/challenges/[slug]` | 95+ | 100 | 100 | 100 |

### New v2 routes

| Route | Perf | A11y | Best Prac | SEO |
|---|---|---|---|---|
| `/feedback` | **≥ 95** | **≥ 95** | **100** | **100** |
| `/feedback/thanks` | **≥ 95** | **≥ 95** | **100** | **100** |
| `/gallery` | **≥ 95** | **≥ 95** | **100** | **100** |

## Pre-known a11y concerns to verify on the day

- **`/feedback`** — radio group `Feedback type` needs label-for / aria-labelledby pairing. Audited in code: ✅ each radio has wrapping `<label>` + visible text. Lighthouse should pass.
- **`/gallery`** — card action buttons rely on text labels (Open / Rename / Duplicate / Delete). Audited: ✅ icon-less, text-only buttons. Lighthouse should pass.
- **`/sandbox`** Save button — `<button data-action="save-gallery">`. Audited: ✅ visible label "Save". Lighthouse should pass.
- **Native `<dialog>`** — Modern Chromium supports a11y mapping out of the box; verify focus trap engages when opened via `showModal()`.

## Pre-known performance concerns

- **`/gallery`** thumbnails — each SVG is ≤ 8 KB. 50 cards = 400 KB inline SVG, parsed once. Should still pass on mobile.
- **`/sandbox`** lazy chunks — canvas + tones + gallery-save all gated on interaction; do not affect TBT for first-paint audit.
- **KaTeX CDN** — still loaded via CDN link tags. Plan 01-06 (KaTeX self-host) deferred to v2.1 backlog. May knock 1-2 points off Best Practices for "no third-party blocking resources." Not a launch blocker.

## CI integration recipe (post-launch automation)

For v3.0, wire Lighthouse into the GitHub Actions deploy workflow:

```yaml
# .github/workflows/lighthouse.yml (sketch — for v2.1+)
- uses: treosh/lighthouse-ci-action@v11
  with:
    urls: |
      https://quantum.example.com/
      https://quantum.example.com/qubit
      ...
    budgetPath: .planning/lighthouse-budget.json
    uploadArtifacts: true
```

Per-route budget JSON to be drafted when wiring CI.

## Verdict

✅ **All targets are achievable.** New v2 routes are static HTML
+ tiny JS, with theme/feedback/gallery code well-isolated. Manual
run on launch day will confirm. v1 baselines documented for
diff comparison.
