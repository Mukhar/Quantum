# Phase 5 — Manual Performance Review

**Date:** 2026-06-26
**Tooling:** Bundle inspection from `npx astro build`. No live URL,
no formal Lighthouse run — see "Why no real Lighthouse" below.

## Why no real Lighthouse

Phase 5 explicitly does NOT deploy to a live URL (user decision,
kennel drawer #61). Lighthouse needs a real URL or a local
`astro preview` server; the latter is fine but gives misleading
performance numbers (no real network, no real CDN, dev-machine CPU).

The deferred path:
1. After deployment (post-Phase-5 task), run `npx lighthouse
   {URL}/{route} --output html --output-path docs/perf/v1-{route}.html
   --preset=mobile` against every route.
2. Replace this document with the formal report.

## What we CAN measure here

Static analysis of the build artifacts. The HTML weight + JS chunk
sizes are the dominant LCP / TTFB / TBT contributors for a static
site without third-party scripts, so this gives a high-fidelity proxy.

### Page weights (full HTML, server-rendered)

| Route             | Raw HTML | Gzipped | JS budget concern? |
|-------------------|---------:|--------:|--------------------|
| `/`               |  13.9 KB |  2.5 KB | no (zero JS deps) |
| `/qubit`          |  34.9 KB |  7.2 KB | shares Three.js + KaTeX chunks |
| `/superposition`  |  31.4 KB |  6.4 KB | no 3D — light |
| `/measurement`    |  33.6 KB |  7.5 KB | no 3D — light, +~30 LOC run-100 inline |
| `/gates`          |  55.2 KB |  8.4 KB | shares Three.js + KaTeX chunks |
| `/entanglement`   |  47.3 KB |  8.8 KB | MiniBloch + 4-outcome ProbBars |
| `/cnot-bell`      |  49.2 KB | 10.0 KB | two MiniBlochs + CircuitView SVG |
| `/deutsch`        |  58.7 KB |  9.5 KB | CircuitView SVG + 4 oracle widgets |
| `/sandbox`        |  20.3 KB |  3.8 KB | composer + canvas + tones lazy-loaded |
| `/sandbox/challenges` | (see build output) | | |
| `/404`            | tiny     |  ~1 KB  | no |

All routes ship comfortably under any reasonable per-page budget.
The heaviest gzipped HTML is `/cnot-bell` at 10 KB — well below the
~50 KB rule-of-thumb for fast LCP on mobile 3G.

### Shared JS chunks (cached after first essay load)

These are loaded once per browser session and reused across every
essay / route that needs them:

| Chunk                | Approx. gzipped | Where used |
|----------------------|-----------------|------------|
| Three.js (Bloch 3D)  | ~131 KB         | `/qubit`, `/gates` |
| KaTeX (math render)  | ~30 KB CSS only | every essay (via CDN) |
| Sandbox composer     | ~9 KB           | `/sandbox` only |
| Sandbox canvas       | ~5 KB           | `/sandbox` only (lazy via IO) |
| Sandbox tones        | ~3 KB           | `/sandbox` only (lazy via IO) |

The Three.js dependency is the only meaningful weight, and it's
lazy-loaded on first interaction with a `BlochSphere`. Readers who
stay on `/superposition`, `/measurement`, or the algorithm essays
never pay it. The two essays that use 3D Bloch (`/qubit`, `/gates`)
share the same cached chunk.

KaTeX is loaded via CDN with integrity hashes (no JS, CSS only) —
the SSR HTML pre-renders the math, KaTeX CSS is for the visual polish.

## Soft accessibility audit

Phase-by-phase, we've maintained the WCAG 2.2 AA contrast rule via
the slate-950/indigo/emerald palette. Spot-checks:
- All essay body text: `text-slate-200` on `bg-slate-950` ≈ 13:1
  contrast (AAA).
- Indigo links (`text-indigo-300` on slate-950) ≈ 8:1 (AAA for body).
- Emerald CTA buttons (`text-white` on `bg-emerald-600`) ≈ 4.6:1
  (AA for large text, AA for normal-size buttons).
- `ConceptMap` SVG: primary nodes ≈ 12:1, utility ≈ 8:1, focus-ring
  ≈ 5.5:1 (AA).
- KaTeX-rendered math inherits `text-slate-200` — same AAA.

No `aria-hidden` traps, every interactive element is keyboard-focusable
(buttons, links, range inputs, summary disclosures). 404 page sets
`<meta name="robots" content="noindex">`.

Risks for the formal Lighthouse run:
- LCP on `/qubit` and `/gates` will be driven by Three.js download
  on cold cache. If the deploy CDN is slow, we may miss the < 2s
  mobile target. Mitigation if needed: pre-load hint on the essay
  pages OR drop the 3D Bloch from `/gates` and re-use the 2D SVG.
- The KaTeX CDN is third-party. If `cdn.jsdelivr.net` is slow from
  the target audience's region, render-blocking risk. Mitigation:
  self-host KaTeX CSS at deploy time (trivial — one `cp` from
  node_modules + a path swap).

## Phase 5 inferred Lighthouse targets

Based on the bundle analysis, these are the scores we expect when
the formal run happens. If reality drifts more than 5 points below
any of these, investigate before launch:

| Route             | Perf | A11y | BestP | SEO |
|-------------------|-----:|-----:|------:|----:|
| `/`               |  95+ |   95 |   100 | 100 |
| `/qubit`          |  85+ |   95 |   100 | 100 |
| `/superposition`  |  95+ |   95 |   100 | 100 |
| `/measurement`    |  95+ |   95 |   100 | 100 |
| `/gates`          |  85+ |   95 |   100 | 100 |
| `/entanglement`   |  90+ |   95 |   100 | 100 |
| `/cnot-bell`      |  90+ |   95 |   100 | 100 |
| `/deutsch`        |  90+ |   95 |   100 | 100 |
| `/sandbox`        |  90+ |   95 |   100 | 100 |

A11y target ≥ 95 is the contractual phase-DoD bar. Performance
targets are predictions, not contracts.
