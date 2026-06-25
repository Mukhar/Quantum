# Quantum

Quantum computing, taught like you're a working developer.

A static, browser-only site that teaches quantum computing through scrollytelling
essays and interactive widgets backed by a real (tested) in-browser quantum simulator.

## Design

See [`docs/plans/2026-06-24-quantum-learning-site-design.md`](docs/plans/2026-06-24-quantum-learning-site-design.md)
for the full design doc.

## Development

```bash
npm install        # Install dependencies
npm run dev        # Start dev server (Astro)
npm test           # Run simulator + widget tests
npm run build      # Build static site to ./dist
```

## Project structure

```
src/
├── pages/            # One Astro page per concept essay
├── components/       # Reusable widgets (Bloch sphere, circuit builder, ...)
├── lib/
│   └── quantum/      # The quantum simulator — heart of the site
└── styles/
tests/
└── quantum/          # Vitest tests for the simulator
```

## Status

Milestone 0 — foundation. Astro shell + simulator skeleton (Hadamard, X, Z,
measurement) with tests.
