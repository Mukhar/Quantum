# Quantum v1 — Launch Announcement Draft

**Status:** Draft. Tone: same as the essays — opinionated, dev-trust,
no hype. Edit before posting; replace `<URL>` and `<REPO>` placeholders.

**Target venues:** Hacker News, r/QuantumComputing, r/learnprogramming,
maybe a thread on programming-related Mastodon / Bluesky. Cross-post
with light variation.

---

## Quantum, taught like you're a working developer

I built a site for working developers who keep meaning to learn how
quantum computing actually works, but bounce off every introduction
that opens with "imagine a coin spinning in the air." Coins don't
spin in the air. Qubits aren't coins. The analogy doesn't predict
gates, doesn't predict measurement, and falls apart the moment you
hit two qubits. We can do better.

**<URL>**

The site has two halves:

### Seven interactive essays

Each one runs a real quantum simulator in your browser — no
hand-waving, no animations standing in for math. You press a Hadamard
button and the probability bars *actually* recompute from the state
vector. Drag the Bloch sphere arrow and the state is the position of
the arrow. Sweep a rotation slider and you can watch the amplitudes
smoothly interpolate.

The reading arc:

1. **Qubit** — the unit vector, not the coin
2. **Superposition** — amplitudes can be negative; that's the whole
   point
3. **Measurement** — collapse, basis dependence, the Born rule
4. **Gates** — every discrete gate is a rotation; here's its
   continuous cousin
5. **Entanglement** — the first time one qubit isn't enough
6. **CNOT + Bell** — the resource everything else is built on
7. **Deutsch** — the first algorithmic case where quantum strictly
   beats classical

Every essay has at least one "Try this:" prompt that asks you to do
something specific with the on-page widgets, then notice a result.
Math lives in collapsible "for the math nerds" sections at the end
— it's there if you want it, out of the way if you don't.

### A Quantum Sandbox

Drop gates onto a circuit grid, sweep rotation angles, share what you
build via a URL. Up to 4 qubits, every gate the simulator supports,
free-form composition. Bonus toys: a 2D parameter-sweep canvas
(sweep two angles, watch probability heatmaps fall out) and a "play
your circuit as music" sequencer that maps measurement outcomes to
notes.

Every essay has an "Open in sandbox →" button that drops you into
the sandbox with the essay's canonical circuit pre-loaded. Read
about Bell pairs, then click one button and start remixing.

### What's NOT in v1

- **No accounts.** No login, no sign-up, no progress tracking.
  Your annotations live in your own browser's local storage.
- **No analytics.** Not even privacy-preserving page-view counters.
  Anonymous, untracked, no cookies.
- **No backend.** Everything runs client-side. View-source the
  pages and you can read every line of every widget.
- **No hosted gallery.** Sharing a circuit means sharing its URL.

### What's coming in v2

Teleportation, superdense coding, Grover's search, the Quantum
Fourier Transform, Shor's algorithm. Roughly in that pedagogical
order. No timeline; I'll ship when I'm convinced each one earns
its keep against the "could this just be a coin analogy?" test.

### The tech, briefly

- **Astro** static site generator
- **Vanilla TypeScript** for the simulator (it's small — a 4-qubit
  state vector is 16 complex amplitudes, all the math fits in one
  file)
- **Three.js** for the 3D Bloch sphere (lazy-loaded, with a 2D SVG
  fallback when JS is disabled or `prefers-reduced-motion` is set)
- **KaTeX** for the inline math
- No React, no Vue, no Preact, no signals library — a tiny in-repo
  `signal<T>` primitive handles all the reactivity any widget needs

Source: **<REPO>**. MIT licensed. Issues + PRs welcome. The roadmap,
phase plans, and design decisions are all in `.planning/` so you can
read how it got built, not just what it does.

### One ask

If you read an essay and a moment clicked — or, more usefully, a
moment *didn't* click — tell me. The fastest way: open an issue on
the repo and quote the paragraph. The whole point of an interactive
essay is that it should be answering your "but wait" questions
within the essay itself; if it's not doing that, I want to know
where.

— mukhar

---

## Variant blurbs (for places with a tighter word limit)

### Hacker News title (≤ 80 chars)

> Quantum, taught like you're a working developer: 7 essays, a real
> in-browser sim

### Tweet / Bluesky-length (≤ 280 chars)

> Quantum computing, taught like you're a working developer:
> 7 interactive essays + an open-ended sandbox, all backed by a real
> in-browser simulator. No PhD. No coin-spinning analogies. No
> tracking. <URL>

### One-liner pull-quote

> "Forget the magical coin. A qubit is a unit vector in a
> two-dimensional complex space — and on this page, you can poke it."

---

## Pre-launch checklist (run when you have a deploy URL)

- [ ] Replace `<URL>` and `<REPO>` placeholders
- [ ] Run the formal Lighthouse pass; if any route lands more than
      5 points below the prediction table in `LIGHTHOUSE.md`,
      investigate first
- [ ] Send the URL to 3+ working-dev friends; ask the
      "one thing clicked / one thing didn't" question; iterate at
      least once before posting publicly
- [ ] Generate a 1200×630 PNG og-image (current asset is SVG; a few
      legacy scrapers still want PNG)
- [ ] Skim view-source on every essay to confirm og + twitter
      tags resolved cleanly
- [ ] Confirm `/sitemap.xml` returns valid XML with the deployed
      hostname (set `SITE_URL` env var at build time)
- [ ] Post the announcement; don't refresh karma counts obsessively
