# Phase 3 Summary — Quantum Sandbox + Creative Outputs

**Status:** Code-complete. All 7 plans landed.

**Shipped:** 2026-06-26

## What we built

A full open-ended quantum playground at `/sandbox`. Users drag gates
from a palette onto a qubit × timestep grid (1–4 qubits, up to 64
steps), tweak θ on rotation gates via a popover slider, and watch a
multi-qubit results panel update live as they edit. Every edit goes
through one `commit()` chokepoint that powers undo/redo (20-deep
history), URL-fragment persistence (`#…` is the source of truth, with
`localStorage` as crash recovery), and a copy-share button that
emits a self-contained, backendless link.

Above the composer sits a 5-puzzle challenge mode (`/sandbox/challenges`)
that scores attempts with quantum-state fidelity and shows a
three-tier badge (≥ 0.99 / ≥ 0.90 / else). Below it, two creative
output widgets turn the circuit into something a non-coder can play
with: **Quantum Canvas** (Web Worker parameter sweeps painted to a
canvas with viridis/magma/monochrome/custom palettes, PNG export) and
**Quantum Tones** (Web Audio sequencer that measures the circuit N
times, maps outcomes to chromatic/major/pentatonic pitches, plays the
result, and exports a 16-bit PCM mono WAV).

Both creative widgets lazy-mount via a shared `IntersectionObserver`
helper, so the composer up top stays the fast critical path and
essay pages pay zero bytes for sandbox JS.

## Plans landed

| Plan  | What                                                           | Commit |
|-------|----------------------------------------------------------------|--------|
| 03-01 | Circuit data model + URL-fragment codec + 16 round-trip tests  | `0a7a980` |
| 03-02 | Sandbox shell + gate palette + circuit grid + θ popover        | `d85db32` |
| 03-03 | Undo/redo + URL hash + localStorage + share button             | `a1e4d20` |
| 03-04 | Multi-qubit results panel + reduced-density math (11 tests)    | `0b20664` |
| 03-05 | Challenge mode + 5 puzzles + fidelity success (11 tests)       | `e3e1047` |
| 03-06 | Quantum Canvas (Web Worker sweeps + PNG export, 22 tests)      | `602e4f5` |
| 03-07 | Quantum Tones (Web Audio + WAV export, 16 wav tests) + wiring  | `070aaed` (hydrator + wiring) + earlier scaffold |

## Numbers

- **Tests:** 97 passing (was 32 at end of Phase 2). +65 tests across
  codec / reducedDensity / fidelity / challenges / canvas math / WAV.
- **Build:** 9 pages, clean (only the pre-existing Three.js chunk-size
  warning carries over from Phase 2).
- **New routes:** 3 (`/sandbox`, `/sandbox/challenges`, `/sandbox/challenges/[slug]`).
- **Bundle weights on `/sandbox`** (gzipped):
  - Composer + results + toast + sim (always-on): ~22 KB
  - Quantum Canvas lazy chunk: 2.88 KB main + 5.6 KB worker
  - Quantum Tones lazy chunk: 2.65 KB main + 0.38 KB wav encoder
  - **Total when both creative widgets are scrolled into view: ~34 KB.**
    Budget was 250 KB. Massively under.
- **Homepage + essay routes:** still pay 0 sandbox bytes (verified by
  the chunk graph: sandbox modules live behind dynamic imports).
- **New lib modules:** `lib/quantum/{circuit, codec, fidelity, reducedDensity}.ts`,
  `lib/sandbox/{signal, store, history, persistence, composer.client,
  paramSlider.client, results.client, canvas.client, canvasMath,
  canvasWorker, tones.client, wav, toast.client, challenges/*}`.

## Architectural decisions made (locked in CONTEXT 03)

1. **Vanilla TS + 40-line in-repo `signal<T>` primitive.** Originally
   chose Preact during smart_discuss, but Preact wasn't on disk and the
   npm registry was unreachable from the sandbox. The signal API is
   intentionally shaped like `@preact/signals` so a later migration is
   near-mechanical. Trade-off: no built-in batching beyond rAF
   coalescing in each hydrator — fine at the scale of 4 qubits × 64
   steps but worth revisiting if Phase 4/5 widgets get heavier.

2. **URL codec: packed binary, version-byte prefix, base64url.** 10-bit
   θ quantization (step ≈ 2π/1024 ≈ 0.006 rad — well below visual
   discrimination). Worst case 4q × 20s of Rx packs to ~1.3 KB (cap
   was 2 KB). `CodecError` and `UnsupportedVersionError` are typed
   exports so callers can branch.

3. **Persistence precedence:** `location.hash` (shared-link wins) →
   `localStorage["sandbox.lastCircuit"]` (crash recovery) → empty
   default. `history.replaceState` debounced to 250 ms; localStorage
   writes coalesced via rAF.

4. **Composer UX:** click-to-arm + click-cell-to-drop on mouse;
   250 ms long-press + tap on touch; palette shortcuts `1`–`9`, `0`,
   `m`; arrow keys move selection; ⌘Z / ⌘⇧Z / ⌘Y for undo / redo.
   CNOT is a 2-tap dance (control → target, amber pending ring).

5. **Results panel uses inline SVG Bloch projections per qubit**, not
   Three.js. Up to 4 spheres on screen — Three.js per-qubit was a
   non-starter on a budget. "Entangled" badge when `r < 0.98` (the
   reduced single-qubit density is non-pure).

6. **Challenge mode opens all 5 puzzles upfront (no gating).** Each
   has a fidelity-based three-tier badge (green ≥ 0.99 / amber ≥ 0.90
   / slate else) and an "Open in sandbox" link that forwards the
   current URL fragment so users can keep tweaking.

7. **Quantum Canvas runs in a module Web Worker** with transferable
   `Float32Array` rows; reduced-motion users get a buffer-then-paint
   path. PNG download smuggles a slugified source URL into the
   filename (real PNG `tEXt` chunks would need ~100 lines + CRC32 and
   were deferred).

8. **Quantum Tones uses a single OscillatorNode + GainNode per note**
   with a short AR envelope. AudioContext is created on the first user
   gesture (no autoplay heuristic risk). A seeded `mulberry32` PRNG
   makes Play and Download produce the *same* sequence on the same
   controls — repeatability over randomness for a tool you'd share. WAV
   export re-renders offline as a sine sum into a Float32Array (we
   deliberately do *not* reuse `OfflineAudioContext` — its support is
   inconsistent in headless environments and the math is 20 lines).
   Total playback is hard-capped at 4 s (truncate + toast).

9. **Both creative widgets share one `lazyMount()` helper** in the page
   script. IntersectionObserver with `rootMargin: 200px`; falls back to
   immediate hydration when IO isn't available. DRY pays off the moment
   you mount a second lazy widget.

## What's intentionally deferred to v2 or later phases

- **Server-backed gallery / sharing list** — out of scope (no backend).
- **PNG `tEXt` chunks with the source URL** — slugified filename does
  the job today; promote later if users actually want round-tripping.
- **E2E test harness.** All 97 tests are vitest unit tests. Phase 3
  finally has enough interaction surface to justify Playwright; the
  decision is queued for Phase 4 entry.
- **Bundle-analyzer report committed under `docs/perf/`.** Numbers are
  measured in this summary but the HTML report isn't in the tree yet.
- **Lighthouse report committed under `docs/perf/m2-sandbox-lighthouse.html`.**
  Same situation. Both are doc artifacts, not feature work — punt to
  the Phase 2 `REMAINING.md` companion pass.
- **`prefers-reduced-motion` audit on the *older* essay path.** Phase 3
  paths honor it; haven't re-verified `/qubit`. Add to the same companion
  pass.

## How to resume after this phase

Phase 3 closes the creativity-pillar gap that made the v1 a "half-built
playground." Phase 4 (Foundations essay track — superposition,
measurement, gates, entanglement essays + homepage concept map) has
**zero** files yet; perfect for a `smart_discuss` round followed by a
parallel sub-agent fan-out (one agent per essay).

Before Phase 4 starts, two pre-flight items worth a glance:
- The Phase 2 `REMAINING.md` (deploy + dev-friend feedback + Lighthouse)
  is still open. Phase 3 doesn't depend on it, but the v1 launch will.
- The "Preact vs vanilla signals" decision was deferred at Phase 3 entry
  and ratified by execution. Phase 4 should re-confirm now that we have
  actual evidence the in-repo signal works at this scale.
