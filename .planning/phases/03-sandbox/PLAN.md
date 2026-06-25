# Phase 3 Plan — Quantum Sandbox + Creative Outputs

**Phase goal:** Ship `/sandbox` — the open-ended playground that turns the
site from "tutorial" into "creative space." Drag gates onto a circuit
grid, sweep rotation parameters, tackle challenge puzzles, save and
share any circuit via URL fragment (no backend), and pipe measurement
outcomes into two creative output widgets: Quantum Canvas (generative
art) and Quantum Tones (Web Audio).

This phase exists because the v1 product is now **half essays, half
playground**, and the playground is the differentiator.

**Depends on:** Phase 2 (param gates Rx/Ry/Rz, shared simulator store,
ProbabilityBars + StateVector + BlochSphere widget primitives,
likely-Preact decision locked in).

## Definition of Done (phase-level)

A user visits `/sandbox` and:

1. Sees a clean composer: a qubit×timestep grid (1–4 qubits, up to ~20
   steps), a gate palette (X, Y, Z, H, S, T, CNOT, Rx, Ry, Rz, Measure),
   and a live results panel (multi-qubit Bloch + ProbabilityBars +
   StateVector).
2. Drags gates from the palette onto cells; param gates open a θ slider.
3. Sees every panel update live as they edit. Editing feels instant
   (input → visible change ≤ 100 ms).
4. Has undo/redo (≥ 20 deep) and keyboard shortcuts (z, ⇧z, del, ←/→,
   1–9 to insert palette gates).
5. Shares the circuit via a copy-link button — the URL fragment
   encodes the full circuit; pasting it into another tab reconstructs
   exactly what they had.
6. Can open `/sandbox/challenges` and work through ≥ 5 puzzles like
   "reach |+⟩", "build a Bell pair", "produce equal superposition over
   4 basis states." Success is detected by state-fidelity ≥ 0.999.
   Each puzzle offers ≥ 2 progressive hints.
7. Can switch into **Quantum Canvas mode** — pick two parameters
   (e.g., θ on Ry(q0), θ on Rz(q1)), sweep them across a 2D grid,
   measure each cell, and watch a colored image emerge. Export as PNG.
8. Can switch into **Quantum Tones mode** — run a parameter sweep,
   map each measurement outcome to a pitch + duration, and play it
   as a Web Audio sequence. Export as WAV (≤ 4s).
9. Bundle size: sandbox + creative outputs ≤ 250 KB gzipped, lazy-loaded
   (homepage and essays pay 0 bytes for it).
10. Full keyboard operability; WCAG 2.2 AA pass.

## Plans

> Execute in order. Each plan ends in a commit. Tests + lint must be
> green before moving on.

### 03-01 — Circuit data model + URL-fragment codec + round-trip tests

**Why:** The model + URL codec are the foundation everything else builds
on. Get it right here and the rest of the phase is plumbing.

**Deliverables:**
- `src/lib/quantum/circuit.ts` — the circuit data model.
  ```ts
  type Op =
    | { kind: 'gate'; gate: 'X'|'Y'|'Z'|'H'|'S'|'T'; qubit: number }
    | { kind: 'cnot'; control: number; target: number }
    | { kind: 'rot'; axis: 'X'|'Y'|'Z'; qubit: number; theta: number }
    | { kind: 'measure'; qubit: number };
  interface Circuit { qubits: number; steps: Op[][] }   // steps[t] runs in parallel
  ```
- `runCircuit(circuit) → Simulator` — pure executor returning the
  final state. Already-tested simulator primitives do the work.
- `src/lib/quantum/codec.ts` — versioned URL-fragment codec:
  - Encode: pack circuit into a compact binary buffer → base64url.
    Prefix with a version byte (`v1`) so future changes don't break links.
  - Decode: parse fragment → circuit. Throw a typed error on bad input.
  - θ values quantized to 10-bit precision (step ≈ 2π/1024 ≈ 0.006 rad)
    to keep fragments small without visible loss.
- Vitest:
  - Round-trip: encode→decode equals original on 50 randomized circuits.
  - Worst case: 4 qubits × 20 steps full of Rx → fragment ≤ 2 KB.
  - Malformed-input decode throws (not panics).
  - Version mismatch decode throws a typed `UnsupportedVersionError`.

**Acceptance:**
- Tests green.
- `circuit.ts` and `codec.ts` each ≤ 250 lines.

---

### 03-02 — Sandbox shell page + drag-drop gate palette (qubit×step grid)

**Why:** The composer UI. This plan is the visible thing users will play with.

**Deliverables:**
- `src/pages/sandbox/index.astro` — page shell with `EssayLayout`'s
  cousin `SandboxLayout` (full-width, no prose constraints).
- `src/components/sandbox/GatePalette.tsx` (Preact) — gate buttons,
  draggable; click also inserts at the current cursor cell.
- `src/components/sandbox/CircuitGrid.tsx` (Preact) — the qubit×step
  grid. Drop a gate onto a cell to place it; right-click / long-press
  to delete; click a param gate to open its θ slider.
- `src/components/sandbox/ParamSlider.tsx` — popover slider for Rx/Ry/Rz θ.
- Pointer-event-based DnD (works for mouse + touch + pen). For touch:
  long-press 250 ms to pick up a gate.
- All edits mutate a sandbox-level `circuit` signal; `runCircuit` runs
  on a tiny debounce (16 ms) and pushes the resulting `Simulator`
  state to the results panel (built in 03-04).
- Initial circuit empty; URL fragment hydration happens in 03-03 (we
  stub it here behind a feature flag for now).

**Acceptance:**
- Drag H from palette to (qubit 0, step 0); the grid shows it.
- Delete with right-click or Backspace.
- No visible jank under continuous gate dragging.

---

### 03-03 — Sandbox state store + undo/redo + keyboard shortcuts + URL hydration

**Why:** Creative tools without undo aren't creative tools. URL
hydration is what makes circuits actually shareable.

**Deliverables:**
- `src/lib/sandbox/store.ts` — Preact signals-based store:
  `circuit`, `selectedCell`, `history` (≥ 20 deep), `future`,
  `commit(mutator)`, `undo()`, `redo()`.
- Keyboard shortcuts via a single page-level listener:
  - `Cmd/Ctrl+Z` undo, `Shift+Cmd/Ctrl+Z` redo
  - `Backspace`/`Delete` removes the op under the cursor
  - `←/→/↑/↓` moves the cursor
  - `1`–`9` inserts the palette gate at index n
- URL fragment hydration on mount:
  - On load: read `location.hash`, attempt decode, populate store.
  - On every committed change: `replaceState` with the new encoded fragment.
  - Debounce URL writes to 250 ms.
- "Copy share link" button in the sandbox header.
- Vitest: store undo/redo invariants; URL hydration end-to-end with
  a fake `location` shim.

**Acceptance:**
- Build a Bell circuit, copy the link, paste into a fresh tab — same circuit.
- Undo / redo across 20 edits is stable.
- Keyboard-only build of a 4-gate circuit works.

---

### 03-04 — Live multi-qubit Bloch + ProbabilityBars panel for sandbox

**Why:** The results panel is what makes the playground a playground.
Re-uses Phase 2 widgets but extends them to multi-qubit.

**Deliverables:**
- `src/components/sandbox/ResultsPanel.tsx` — wraps:
  - One BlochSphere per qubit (reduced-density-matrix projection of
    that qubit's state; pure for product states, faded/transparent
    for entangled qubits with a "this qubit is entangled" hint).
  - ProbabilityBars over all 2^n basis states.
  - StateVector readout (collapsed by default for n ≥ 3).
- `src/lib/quantum/reducedDensity.ts` — pure helper:
  `singleQubitReducedDensity(state, qubit) → 2×2 complex matrix`,
  then `densityToBloch(rho) → {r, theta, phi}` where r ∈ [0, 1].
  r < 1 ⇒ mixed/entangled; render the arrow shorter and faded.
- Vitest:
  - Bell state: r = 0 for both qubits (maximally mixed reduced state).
  - Product state |0⟩ ⊗ |+⟩: r = 1 on both qubits.
  - `densityToBloch` round-trip on 50 random pure states.

**Acceptance:**
- Drop H on q0, CNOT(0,1); both Bloch arrows shrink to the origin
  and a small "entangled" badge appears.
- Drop H on q0 only; q0 arrow points to |+⟩ (equator, φ=0), q1 stays at |0⟩.

---

### 03-05 — Challenge mode + 5 starter puzzles + fidelity success detector

**Why:** Open sandboxes can paralyze. Challenges give first-time
visitors a guided on-ramp.

**Deliverables:**
- `src/pages/sandbox/challenges/index.astro` — list page.
- `src/pages/sandbox/challenges/[slug].astro` — puzzle page; uses the
  sandbox composer in "challenge mode" (same UI + a target panel + hints).
- `src/content/challenges/*.json` — declarative puzzles. Shape:
  ```json
  {
    "slug": "make-plus",
    "title": "Reach |+⟩",
    "description": "Starting from |0⟩, produce the equal superposition state.",
    "qubits": 1,
    "targetState": [{"re": 0.7071, "im": 0}, {"re": 0.7071, "im": 0}],
    "hints": [
      "There's a single gate that does it.",
      "It rhymes with 'card.'",
      "Try H on qubit 0."
    ],
    "starter": null
  }
  ```
- `src/lib/quantum/fidelity.ts` — `fidelity(stateA, stateB) → number ∈ [0,1]`
  using `|<a|b>|^2`. Tested.
- Success detector: when current circuit's final state hits fidelity
  ≥ 0.999 against target, fire a confetti-free toast and unlock the
  next puzzle.
- Hint reveal: click "I need a hint" to progressively reveal each one.
- 5 starter puzzles authored:
  1. **make-plus** — reach `|+⟩`
  2. **make-minus** — reach `|−⟩`
  3. **bell-state** — build `(|00⟩ + |11⟩)/√2`
  4. **anti-bell** — build `(|01⟩ + |10⟩)/√2`
  5. **uniform-superposition** — 2 qubits, equal amplitude over all 4 basis states

**Acceptance:**
- All 5 puzzles solvable; success toast fires.
- Fidelity helper passes textbook tests (identical pure states → 1;
  orthogonal → 0; equal superposition vs |0⟩ → 0.5).

---

### 03-06 — Quantum Canvas widget (parameter-sweep art + PNG export)

**Why:** The first creative output. Turns quantum behavior into something
visual the user *makes* and can share with non-technical friends.

**Deliverables:**
- `src/components/sandbox/QuantumCanvas.tsx` — UI to:
  - Pick two parameters from the current circuit (must include at
    least 2 Rx/Ry/Rz gates) — e.g., `step 0 Rx q0 θ` and `step 2 Ry q1 θ`.
  - Choose grid resolution (32×32, 64×64, 128×128).
  - Choose color mapping: probability of `|0...0⟩` → hue; or a custom
    measurement outcome → palette index.
  - "Render" button: sweep params, run circuit per cell, measure,
    color the pixel. Progress bar; cancellable.
- Render runs in a Web Worker (`src/lib/sandbox/canvasWorker.ts`)
  to keep UI responsive. The simulator is tiny; we ship the executor
  to the worker, not just data.
- PNG export via canvas.toBlob.
- "Share canvas" button: encodes the canvas-specific params (which
  two gate params, resolution, palette) into the URL fragment alongside
  the circuit.

**Acceptance:**
- A 64×64 render of a 2-param circuit completes in ≤ 1.5s on a 2019 laptop.
- PNG download works.
- Cancelling mid-render stops within 100 ms.

---

### 03-07 — Quantum Tones widget (Web Audio + WAV export) + sandbox a11y/perf pass

**Why:** Second creative output + the polish gate that closes the phase.

**Deliverables:**

**Quantum Tones:**
- `src/components/sandbox/QuantumTones.tsx` — UI to:
  - Pick one parameter to sweep (or "repeat-measure 16 times").
  - Map measurement outcomes to a scale (chromatic / major / pentatonic).
  - "Play" button: schedules an `OscillatorNode` sequence (≤ 4s total).
  - "Export WAV": render via `OfflineAudioContext`, encode 16-bit PCM
    WAV blob, download.
- All Web Audio inside an Audio API gesture-gated init (no autoplay).

**A11y pass on sandbox:**
- Tab order: palette → grid → results → canvas → tones.
- All grid cells reachable via arrow keys.
- Sliders have visible value + `aria-valuetext`.
- Results panel updates announced via `aria-live="polite"`.
- Color choices verified with axe (contrast).
- `prefers-reduced-motion` disables Bloch animation in results panel.

**Perf pass:**
- Lighthouse on `/sandbox`:
  - LCP ≤ 3s on Slow 4G (sandbox is allowed more than essays).
  - Time-to-interactive ≤ 4s.
  - JS payload documented; flag > 250 KB gzipped.
- Verify essay pages still pay 0 sandbox bytes (network panel diff).
- Lighthouse report committed under `docs/perf/m2-sandbox-lighthouse.html`.

**Acceptance:**
- Play a 2s tone sequence from a sweep; download the WAV; it plays
  in QuickTime / VLC.
- Lighthouse reports pass the budgets above.
- Sandbox is fully usable with only the keyboard.

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Drag-drop on touch is awkward | Long-press to pick up + tap-cell to place fallback; tested in 03-02 on a real phone |
| URL fragment exceeds chat-tool limits | Quantize θ to 10 bits; cap fragment ≤ 2 KB; show warning if user manages to overflow |
| Bundle size blows the budget | All sandbox modules behind dynamic imports off `/sandbox`; bundle-analyzer pass in 03-07 |
| Quantum Canvas renders block the main thread | Web Worker for execution (03-06) |
| Reduced-density matrix math wrong → broken intuition | `densityToBloch` round-trip tests (03-04); spot-check Bell + product states |
| Challenges feel arbitrary | Each puzzle has a one-sentence motivation tying it to a real concept; iterate based on Phase 2 feedback signal |
| Web Audio init blocked by browser autoplay policy | All audio start gated behind explicit "Play" button; tested |

## Out of Scope (this phase)

- Server-backed gallery / sharing list — v2
- Export to Qiskit / Cirq text — v2 stretch
- Custom user-authored challenges — v2 (we ship 5; community can fork)
- Algorithm-specific essays (Deutsch, Bell) — Phase 5
- Concept map on homepage — Phase 4
- Multi-language i18n — out of scope for v1
