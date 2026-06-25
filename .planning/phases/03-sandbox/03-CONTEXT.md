# Phase 3: Quantum Sandbox + Creative Outputs - Context

**Gathered:** 2026-06-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver `/sandbox` — the open-ended quantum playground that turns the
site from "tutorial" into "creative space." Concretely, this phase
ships:

1. A circuit data model + versioned URL-fragment codec
2. A drag-drop composer UI (1–4 qubits × ~20 timesteps, full gate set
   including Rx/Ry/Rz)
3. An undo/redo state store with keyboard shortcuts
4. A live multi-qubit results panel (Bloch + ProbabilityBars +
   StateVector with reduced-density-matrix math)
5. A challenge mode with ≥ 5 starter puzzles and fidelity-based
   success detection
6. Two creative output widgets: Quantum Canvas (parameter-sweep art,
   PNG export) and Quantum Tones (Web Audio sequences, WAV export)
7. A sandbox-only a11y + perf polish pass

Out of scope: any new essay content (Phase 4), the homepage concept
map (Phase 4), CNOT/Bell + Deutsch's algorithm essays (Phase 5),
server-backed gallery, custom user-authored challenges, multi-language
i18n, accounts.

</domain>

<decisions>
## Implementation Decisions

### Reactivity Framework
- **Vanilla TS with a 40-line in-repo `signal<T>` primitive** (see
  `src/lib/sandbox/signal.ts`). Originally defaulted to Preact signals
  during smart discuss, but no Preact packages were actually present
  on disk and the npm registry was unreachable through the sandbox
  network during Phase 3 execution (proxy timeouts). The reactive
  needs (subscribe, computed reads, fine-grained per-cell renders)
  are small enough that a hand-rolled primitive ships them without
  any new runtime dependency.
- Phase 2's per-page registry pattern is **extended**, not replaced.
  Sandbox components are `.astro` shells with companion `.client.ts`
  modules that hydrate from `[data-sandbox-*]` attributes, exactly
  like Phase 2's BlochSphere split.
- Composer components hydrate on `DOMContentLoaded`. Creative widgets
  (Canvas, Tones) defer their hydration with an IntersectionObserver.
- Each `/sandbox*` page owns **one** circuit signal; creative widgets
  re-derive measurements from that same circuit.
- URL fragment is canonical state; `localStorage` mirrors the
  last-edited circuit ("crash recovery" — restore on next load if URL
  is empty).

### URL Codec
- **Packed binary → base64url** with a leading version byte (`0x01`).
- θ values quantized to **10 bits** (~0.006 rad — invisibly lossy).
- Worst-case 4 qubits × 20 steps full of param gates must encode to
  ≤ 2 KB fragment.
- On overflow: throw a typed error, show a toast, and offer download
  as `.qcirc` JSON (out-of-band sharing).

### Composer UX
- **Pointer-event** drag-drop (mouse / touch / pen). Touch uses
  **250 ms long-press** to pick up a gate; tap-to-cell as fallback.
- Delete via right-click, `Backspace`/`Delete`, or long-press context.
- θ editing happens in a **popover slider** anchored to the cell —
  keeps the grid uncluttered.
- Grid renders **visible cell outlines** (faint dotted) so drop
  targets are obvious without hover.

### Creative Outputs
- Quantum Canvas runs sweeps in a **Web Worker** (`canvasWorker.ts`)
  — keeps the main thread fluid even at 128×128.
- **3 built-in palettes** at launch (viridis, magma, monochrome) plus
  a "custom 2-color" picker. No HSL knobs in v1.
- Quantum Tones default to **4 s max** duration; chromatic / major /
  pentatonic mappings.
- Challenge mode opens **all 5 puzzles** from the start (browsing
  > forced linearity for a creative-first site).

### Claude's Discretion
- File layout under `src/components/sandbox/` and `src/lib/sandbox/`.
- Tailwind utility patterns mirror Phase 2's `EssayLayout` choices.
- Internal helper names, test naming, error message phrasing.
- Bundle-splitting strategy beyond the broad "creative widgets are
  `client:visible`" rule.
- Specific accent palette for the sandbox chrome — must stay AA
  contrast against the existing dark theme.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/quantum/simulator.ts` — single-qubit + CNOT + measurement;
  4-qubit cap enforced.
- `src/lib/quantum/gates.ts` — discrete gates + Rx/Ry/Rz factories +
  `applyRotation`.
- `src/lib/quantum/store.ts` — vanilla reactive store (Phase 2). Pattern
  worth studying but **not** reused directly — sandbox uses signals.
- `src/lib/quantum/bloch.ts` — Bloch math (state↔angles, global-phase
  removal). Multi-qubit reduced-density math is **new** in Plan 03-04.
- `src/components/BlochSphere/*` — Three.js 3D + SVG 2D switch. Can be
  re-mounted per qubit; consider a lighter renderer if 4 spheres ×
  Three.js gets heavy.
- `src/components/ProbabilityBars.astro`, `StateVector.astro` — render
  via DOM queries + snapshot subscribers. Need a Preact-friendly
  re-export for sandbox use.
- `src/layouts/EssayLayout.astro` — the prose-constrained layout.
  Sandbox needs a wider `SandboxLayout.astro` sibling.

### Established Patterns
- Astro pages + vanilla TS hydration scripts (Phase 1–2).
- Per-page singleton store keyed by string in a `REGISTRY`. Sandbox
  replaces this with a Preact signal exported from `lib/sandbox/store.ts`.
- Lazy Three.js import to keep homepage bundle clean (`/qubit` adds
  130 KB only when Bloch mounts).
- KaTeX only on essay pages — sandbox shouldn't import it.
- Vitest for pure logic; no E2E framework yet (sandbox composer
  warrants one — defer decision until 03-02).

### Integration Points
- New routes: `src/pages/sandbox/index.astro`,
  `src/pages/sandbox/challenges/index.astro`,
  `src/pages/sandbox/challenges/[slug].astro`.
- Header nav on `src/pages/index.astro` and `src/pages/qubit.astro`
  needs a "Sandbox" link added in 03-02.
- `src/lib/quantum/` extends with `circuit.ts`, `codec.ts`,
  `reducedDensity.ts`, `fidelity.ts` (all pure, all unit-tested).
- New `src/lib/sandbox/` directory for store + worker + sandbox-only
  helpers, kept out of essay bundles.

</code_context>

<specifics>
## Specific Ideas

- Sandbox URL share button copies link + flashes a toast. No popover.
- Bell state success in challenge mode triggers a small toast — no
  confetti (matches the formal-but-friendly Phase 2 voice).
- "Entangled" badge on Bloch spheres when the reduced-density r < 0.98
  (small fudge factor for float noise).
- Quantum Canvas exports include a watermark line in the PNG metadata
  with the source URL so shared images can be traced back to a circuit.
- WAV export tagged 16-bit PCM mono 44.1 kHz — broadest player support.

</specifics>

<deferred>
## Deferred Ideas

- Export to Qiskit / Cirq text (v2 stretch — track as "circuit
  serialization formats" for later).
- HSL-parameterizable Quantum Canvas palette (v2 — needs a real
  picker UI).
- User-authored challenges with a built-in editor (v2).
- A server-backed circuit gallery / leaderboard (explicitly out per
  PROJECT.md).
- "Sandbox tutorial" overlay for first-time visitors (consider for
  Phase 4 alongside the homepage concept map).

</deferred>
