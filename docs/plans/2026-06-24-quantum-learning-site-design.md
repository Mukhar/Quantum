# Quantum Learning Site — Design Document

**Date:** 2026-06-24
**Status:** Approved design, ready to implement
**Audience for this doc:** developers building or contributing to the site

---

## 1. Problem Statement

Quantum computing is one of the most-hyped, most-misunderstood topics in tech. Working developers — people who can ship a REST API in their sleep — often bounce off quantum the moment they hit bra-ket notation, complex Hilbert spaces, or yet another vague "it's like a coin spinning in the air" analogy.

The materials that exist today fall into two unhelpful camps:

- **Too shallow** — pop-science articles that leave devs with metaphors but no mental model they can actually use.
- **Too deep, too fast** — academic textbooks and Qiskit docs that assume linear algebra fluency and quantum-mechanics priors most working devs don't have.

There is a gap in the middle: a resource that respects developers' intelligence, ditches the hand-wavy metaphors, but builds genuine intuition before piling on math. That gap is what this site fills.

### Who is affected

- **Primary audience:** Working software developers / engineers who are quantum-curious but bounce off existing resources.
- **Secondary audience:** CS students looking for intuition to complement formal coursework.

### What exists today and why it falls short

| Resource | Strength | Weakness |
|---|---|---|
| IBM Quantum / Qiskit textbook | Authoritative, hands-on | Math-heavy, slow ramp |
| Pop-science articles (Wired, Quanta) | Approachable | No real model after reading |
| 3Blue1Brown-style YouTube | Beautiful intuition | Passive, can't tinker |
| Distill.pub | Format we love | No quantum-specific content |

We want the love-child of 3Blue1Brown's visuals and Distill.pub's interactivity, scoped specifically to quantum and aimed at devs.

---

## 2. Solution Overview

A **static, browser-only website** that teaches quantum computing through **scrollytelling essays**, each embedding **interactive widgets** powered by a real (tested) **in-browser quantum simulator** written in vanilla JS.

```
┌─────────────────────────────────────────────────────────────┐
│                       Homepage                              │
│              ┌──────────────────────────┐                   │
│              │  Visual Concept Map      │                   │
│              │  (nodes = essays,        │                   │
│              │   edges = prereqs)       │                   │
│              └────────────┬─────────────┘                   │
│                           │ click a node                    │
└───────────────────────────┼─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│           Concept Essay (one per concept)                   │
│                                                             │
│   prose ──▶ inline widget ──▶ prose ──▶ inline widget ──▶  │
│                  │                              │            │
│                  ▼                              ▼            │
│         ┌────────────────┐           ┌─────────────────┐    │
│         │ Quantum Sim    │◀──────────│  Widget calls   │    │
│         │ (vanilla JS,   │   inputs  │  sim.apply(     │    │
│         │  state vector) │──────────▶│   "H", q=0)     │    │
│         └────────────────┘   results │                 │    │
│                                       └─────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

The reader scrolls top to bottom through an essay. Animations and widgets reveal themselves at the right scroll positions. Every widget's output reflects **real state-vector math** — devs can open DevTools and verify.

---

## 3. Architecture & Components

### 3.1 High-level component map

```
quantum-site/
├── src/
│   ├── pages/                  ← Astro pages, one per essay
│   │   ├── index.astro         ← Homepage + concept map
│   │   ├── qubit.astro
│   │   ├── superposition.astro
│   │   ├── measurement.astro
│   │   ├── gates.astro
│   │   ├── entanglement.astro
│   │   ├── cnot-bell.astro
│   │   └── algorithm.astro     ← Deutsch's algorithm
│   ├── components/             ← Reusable UI / widgets
│   │   ├── BlochSphere.tsx     ← Three.js 3D Bloch sphere
│   │   ├── CircuitBuilder.tsx  ← Drag-and-drop gate circuit
│   │   ├── ProbabilityBars.tsx ← Measurement outcome viz
│   │   ├── StateVector.tsx     ← Live state vector readout
│   │   ├── MathBlock.astro     ← KaTeX-rendered math
│   │   └── ConceptMap.tsx      ← Homepage graph nav
│   ├── lib/
│   │   ├── quantum/
│   │   │   ├── complex.ts      ← Complex number ops
│   │   │   ├── matrix.ts       ← Matrix multiplication
│   │   │   ├── simulator.ts    ← State-vector simulator
│   │   │   ├── gates.ts        ← Gate matrix definitions
│   │   │   └── circuit.ts      ← Circuit builder API
│   │   └── scrolly.ts          ← Scroll-tied animation helper
│   └── styles/
│       └── global.css          ← Tailwind entrypoint
├── tests/
│   └── quantum/                ← Vitest tests for simulator
└── public/                     ← Static assets, fallback images
```

### 3.2 Tech stack (locked in)

| Layer | Choice | Why |
|---|---|---|
| Site framework | **Astro** | Best-in-class static site gen for content-heavy sites with islands of interactivity. |
| Styling | **Tailwind CSS** | Fast iteration on design without leaving the markup. |
| Math rendering | **KaTeX** | Faster than MathJax; renders at build time. |
| 3D widgets | **Three.js** | Standard for browser 3D; great for Bloch sphere. |
| Quantum sim | **Custom vanilla TS** | ~200 LOC. Auditable, testable, zero deps, real math. |
| Tests | **Vitest** | First-class Astro/Vite integration. |
| Hosting | **Cloudflare Pages** | Free tier, global CDN edge network, zero-config Astro support, automatic HTTPS. |

### 3.3 The quantum simulator (the heart of the site)

The simulator is the credibility cornerstone. It must be **real, correct, and inspectable**.

**Scope:** state-vector simulation for up to 4 qubits. (16 complex amplitudes — trivial to compute, more than enough for v1.)

**Public API sketch:**

```ts
const sim = new Simulator({ qubits: 2 });
sim.apply("H", 0);              // Hadamard on qubit 0
sim.apply("CNOT", 0, 1);        // CNOT, control=0, target=1
sim.state;                       // → Complex[] of length 4
sim.probabilities();             // → number[] of length 4
sim.measure();                   // → "00" | "01" | "10" | "11"
```

Internally: a flat `Complex[]` of length `2^n`. Each gate becomes a sparse update over that array. We don't need general matrix-on-state multiplication for single-qubit gates — direct index manipulation is faster and clearer.

---

## 4. Data Flow

There is no server, no database, no fetch. Everything flows in-browser.

```
User interaction (click gate, drag qubit)
        │
        ▼
React/Astro island component
        │  calls
        ▼
lib/quantum/simulator.ts
        │  mutates
        ▼
Internal state vector (Complex[])
        │  emits change event
        ▼
All subscribed widgets re-render
  ├─ BlochSphere updates rotation
  ├─ ProbabilityBars updates heights
  └─ StateVector updates numeric readout
```

The simulator is a single source of truth per essay. Widgets are *views* of that state. Mutating one widget updates all sibling widgets — this is the "aha" moment we want: change a gate, watch every visualization react in lockstep.

---

## 5. User Experience

### 5.1 Homepage

- Hero: one-liner ("Quantum computing, taught like you're a working developer.") + a "Start with: What is a Qubit?" CTA.
- Below the fold: **visual concept map** — concepts as nodes, prerequisites as arrows. Click any node → opens that essay. Doubles as a sense of "I'm 3 of 7 concepts in."
- Footer: about, repo link, "send feedback."

### 5.2 Concept essay layout

Every essay follows the same skeleton (consistency = trust):

1. **Hook** — one paragraph that reframes the question. ("You already know bits. A qubit isn't 'both 0 and 1.' Here's what it actually is.")
2. **Intuition first** — visuals + analogy, NO math yet.
3. **First widget** — small, focused. Reader pokes it, sees the concept come alive.
4. **The slightly deeper version** — now we introduce a sliver of formal notation, tied tightly to the widget.
5. **Bigger widget** — combines everything so far.
6. **"For the math nerds" collapsible** — bra-ket notation, the actual matrix, the proof.
7. **"You now understand X" check** — 1-2 questions or a self-test prompt.
8. **What's next** — link to the next essay in the prereq graph.

### 5.3 Mobile experience

Mobile-first for prose. Heavy 3D widgets (Bloch sphere) degrade to:
- A pre-rendered static image showing the equivalent state, with a "tap to open on desktop" note, OR
- A simplified 2D version (e.g., a flat polar plot instead of 3D sphere).

We will NOT try to make drag-and-drop circuit builders work on touch in v1. Show a read-only circuit with tap-to-step-through instead.

---

## 6. Error Handling & Edge Cases

| Scenario | Behavior |
|---|---|
| User puts too many gates on a circuit (>20) | Soft warning, keep working. We can handle thousands; the warning is for UX clarity. |
| User adds a 5th qubit | Hard limit. Disable add button at 4 qubits with tooltip explaining the v1 limit. |
| Widget JS fails to load (slow network, blocked) | Static fallback image shown via `<noscript>` and JS error boundary. Essay prose still readable. |
| Browser doesn't support WebGL | Bloch sphere falls back to 2D polar projection. Detected at component mount. |
| User refreshes mid-circuit | No persistence in v1. Circuit resets. (Future: localStorage.) |
| KaTeX math fails to render | Original LaTeX source shown in a `<code>` block — ugly but correct. |
| Reduced-motion preference set | All scroll-tied animations replaced with static keyframes. Widgets still interactive but don't animate on scroll. |

---

## 7. Testing Strategy

### 7.1 Simulator correctness (non-negotiable)

The simulator MUST be tested against known-good textbook outputs. Examples:

```ts
test("H on |0⟩ gives equal superposition", () => {
  const sim = new Simulator({ qubits: 1 });
  sim.apply("H", 0);
  expect(sim.probabilities()).toEqual([0.5, 0.5]);
});

test("Bell state from H + CNOT", () => {
  const sim = new Simulator({ qubits: 2 });
  sim.apply("H", 0);
  sim.apply("CNOT", 0, 1);
  expect(sim.probabilities()).toEqual([0.5, 0, 0, 0.5]);
});

test("Deutsch's algorithm identifies balanced oracle", () => {
  // ...known input → known output
});
```

Run on every commit via Cloudflare Pages CI (builds triggered on push to the connected GitHub repo).

### 7.2 Widget integration

Vitest + happy-dom for component-level tests. Verify that clicking a gate in `CircuitBuilder` updates `ProbabilityBars` to the expected values.

### 7.3 Visual / no-regression

Manual for v1. (Playwright visual snapshots are a v2 nice-to-have.)

### 7.4 Pedagogical "does it work" testing

The truest test is: hand the site to a working dev who doesn't know quantum, ask them to read the qubit essay, then ask them to explain superposition back. If they can — it works. If they can't — the essay needs another revision pass. This is the ONLY metric that ultimately matters.

---

## 8. Build & Ship Plan

The risk-killer here is shipping ONE essay end-to-end before scaling out.

### Milestone 0 — Foundation (1-2 days)
- Astro + Tailwind project scaffolding
- Empty homepage shell
- Simulator skeleton with Hadamard + measurement + tests

### Milestone 1 — Flagship essay: "What is a Qubit?" (3-5 days)
- Full essay copy
- Bloch sphere widget (Three.js)
- Probability bars widget
- State vector readout widget
- Mobile fallbacks
- Ship to Cloudflare Pages, share with 3-5 dev friends, iterate on feedback

### Milestone 2 — Foundations track (1-2 weeks)
- Superposition, Measurement, Gates, Entanglement essays
- Multi-qubit support in simulator
- Concept map on homepage

### Milestone 3 — Algorithm track (1 week)
- CNOT + Bell states essay
- Deutsch's algorithm essay
- Circuit builder widget

After M3 = v1 ships.

---

## 9. YAGNI — Explicitly NOT in v1

These came up in brainstorming and were deliberately deferred:

-  User accounts / login
-  Progress persistence (localStorage may sneak in if trivial)
-  Quizzes with scoring, badges, gamification
-  Comments / forum / community features
-  Code editor for Qiskit/Cirq
-  Algorithms beyond Deutsch (Grover, Shor, QFT, VQE, etc.)
-  Real quantum hardware integration (IBM Q, etc.)
-  Multi-language i18n
-  Dark mode (yes really — pick one good theme first)
-  Backend for anything

Each of these can be a delightful v2+ addition once v1 has earned the right to exist.

---

## 10. Open Questions & Risks

### Open questions
1. **Voice and tone** — formal-but-friendly (Distill.pub) or playful (3Blue1Brown)? Needs an editorial pass on essay 1 to set the standard.
2. **Concept map layout** — force-directed (cool but messy) or hand-curated (boring but clear)? Build both, A/B in our heads, pick.
3. **Analytics?** — Plausible / Fathom for privacy-respecting analytics, or none at all in v1? Decision deferrable until pre-launch.
4. **Domain name** — TBD.

### Known risks
1. **Pedagogy quality is the bottleneck, not the tech.** A perfect simulator with bad explanations = useless site. Budget more time for writing/iterating essay 1 than for code.
2. **Simulator bugs would destroy trust.** Tests are not optional. Code review the simulator against a textbook.
3. **Scope creep.** Resist adding more concepts to v1 once M1 ships well. Two great essays > seven mediocre ones.
4. **Mobile complexity.** 3D widgets on touch screens are genuinely hard. Falling back gracefully is the right call, but it means mobile users get a lesser experience.

---

## 11. Success Criteria

We will know v1 worked if:

1.  A working dev who has never studied quantum can read the qubit essay and accurately explain superposition + measurement to another dev afterward.
2.  The simulator passes 100% of known-textbook unit tests.
3.  The site loads (LCP) under 2s on 4G on a mid-range phone.
4.  At least one essay has been refined based on real reader feedback before launch.
5.  All seven essays from the v1 scope are live and cross-linked.

---

## Appendix A — Why "real simulator in the browser" was the right call

The single biggest design decision was: faked animations vs. real math.

Faked would have been easier. But the audience is *working developers*. They will open DevTools. They will inspect. If they catch us faking, the entire site loses credibility — not just the widget, the whole project. By writing a real (and small!) simulator, we earn permanent trust. And the simulator is, honestly, only ~200 lines of code. The risk/reward math is not close.
