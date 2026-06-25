# State

*Last updated: 2026-06-25 mid-Phase-3 checkpoint (4/7 plans landed in autonomous run).*

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-06-25)

- **Core value:** Earn dev trust with real, inspectable math — then
  unlock creativity by letting readers actually play.
- **Current focus:** Phase 3 (Quantum Sandbox + Creative Outputs) is
  in active execution. 4 of 7 plans shipped, 1 plan still owed
  (03-07 Quantum Tones), 1 plan needs verification (03-06 wired into
  the sandbox page — Agent C committed but ResultsPanel coexistence
  needs a smoke check). Phase 4 has not started.

## Where we are

- [done] Phase 1 (Foundation) — `8148713`. 21-test simulator.
- [code-complete] Phase 2 (Flagship qubit essay) — all 6 plans landed.
  Deploy + dev-friend feedback still human-only, tracked in
  `.planning/phases/02-qubit-essay/REMAINING.md`.
- [in-flight] **Phase 3 (Quantum Sandbox + Creative Outputs)** —
  details in `.planning/phases/03-sandbox/PLAN.md` and decisions
  locked in `03-CONTEXT.md`.

### Phase 3 plan-by-plan status

| Plan  | What                                                           | Status | Commit |
|-------|----------------------------------------------------------------|--------|--------|
| 03-01 | Circuit model + URL codec + round-trip tests                   | [done] | `0a7a980` |
| 03-02 | Sandbox shell + drag-drop palette + circuit grid + θ popover   | [done] | `d85db32` |
| 03-03 | Undo/redo + URL hash + localStorage + share button             | [done] | `a1e4d20` |
| 03-04 | Multi-qubit results panel + reduced-density math               | [done] | (post-Agent-A wiring commit on 2026-06-25) |
| 03-05 | Challenge mode + 5 puzzles + fidelity success                  | [done] | `e3e1047` |
| 03-06 | Quantum Canvas (Web Worker sweeps + PNG export)                | [done] | `602e4f5` |
| 03-07 | Quantum Tones (Web Audio + WAV + a11y/perf pass)               | [todo] | — |

**Test count:** 92 passing (was 32 at end of Phase 2).
**Build:** 9 pages, clean, no warnings beyond Three.js chunk-size.

## Next action (resume here)

1. **Re-dispatch Plan 03-07 (Quantum Tones)** — the sub-agent timed
   out before starting. Files it should own (none of which exist on
   disk yet):
   - `src/lib/sandbox/wav.ts` (pure 16-bit PCM mono WAV encoder)
   - `src/lib/sandbox/tones.client.ts` (Web Audio sequencer)
   - `src/components/sandbox/QuantumTones.astro`
   - `tests/quantum/wav.test.ts` (≥ 4 tests)
   - Plus the page wiring in `src/pages/sandbox/index.astro`
     (creative-outputs section now hosts `<QuantumCanvas />` —
     mirror that pattern with `<QuantumTones />` next to it, lazy
     hydrate via IntersectionObserver).
   - Full prompt template is preserved in the autonomous-run
     conversation history — same recipe as plan 03-06.
2. **Smoke-check the integrated sandbox** — run `npm run dev`, open
   `/sandbox`, drag a few gates, hit Run Sweep on Canvas, verify the
   ResultsPanel updates as the circuit changes. (Phase 3 ui-review
   moment.)
3. **Write `03-SUMMARY.md`** at `.planning/phases/03-sandbox/` once
   plan 03-07 lands — same shape as `02-SUMMARY.md`. Update
   ROADMAP.md to mark Phase 3 done.
4. **Phase 4 entry** — Run `smart_discuss` for Phase 4
   (foundations essay track: 4–6 essays + homepage concept map per
   ROADMAP). No CONTEXT.md exists yet. After CONTEXT, generate plans
   per-essay (probably 4–6 sub-plans), then either grind sequentially
   or dispatch parallel sub-agents (one per essay).

## Active decisions locked in Phase 3

1. **Reactivity = vanilla TS with in-repo `signal<T>`** (40-line
   primitive in `src/lib/sandbox/signal.ts`). Originally chose Preact
   signals during smart_discuss but Preact wasn't actually present
   on disk and npm registry was unreachable through the sandbox
   network. CONTEXT.md updated to reflect the override; the API
   shape is intentionally close to `@preact/signals` so a future
   migration would be near-mechanical.
2. **URL codec format** — Packed binary, version byte `0x01` leading,
   10-bit θ quantization, base64url. Worst-case 4q×20s fits in
   ~1.3 KB (cap was 2 KB). Typed `CodecError` /
   `UnsupportedVersionError`. Validated by 16 codec tests.
3. **Persistence order** — `location.hash` (shared link wins) →
   `localStorage["sandbox.lastCircuit"]` (crash recovery) → default
   empty. Auto-flush rate-limited via rAF.
4. **Composer UX** — 250 ms touch long-press to pick up, then tap a
   cell; click-to-arm on mouse; palette shortcuts `1`–`9`,`0`,`m`
   insert at the currently-selected cell; arrow keys move selection;
   ⌘Z / ⌘⇧Z (and ⌘Y) bound for undo / redo.
5. **CNOT placement** — 2-tap dance: first tap = control, then any
   other cell in the same column = target. Visualised by an amber
   ring + "•?" placeholder.
6. **Results panel rendering** — Lightweight inline SVG Bloch
   projection per qubit (NOT Three.js — up to 4 spheres on screen
   means budget pressure). "Entangled" badge when `r < 0.98`.
7. **Canvas creative widget** — Module Web Worker, transferable
   `Float32Array` per row, palettes (viridis/magma/monochrome +
   custom 2-color), 128×128 max sweeps, PNG download includes
   source-URL slug in filename (real PNG `tEXt` chunks would need
   ~100 lines and a CRC32; deferred).
8. **Challenge mode** — All 5 puzzles open from the start (no
   gating). Three-tier fidelity badge (green ≥ 0.99 / amber ≥ 0.90 /
   slate else). "Open in sandbox" link forwards the current fragment
   to `/sandbox#…` and lets `hydrateFromUrlOrStorage` pick it up.

## Open risks (carried + updated)

- **Plan 03-07 still owed.** Sandbox feels incomplete without the
  audio output — pair it with Canvas as "creative outputs" tabs.
- **No E2E test harness yet.** All 92 tests are unit tests via
  vitest. Phase 3 finally has enough interaction surface to justify
  Playwright (or similar) — defer the decision to Phase 4 entry.
- **Bundle weight unknown when all 4 creative widgets are on one
  page.** Canvas chunk is 5.6 KB worker + 2.88 KB main gzipped;
  Tones is TBD. Check after 03-07 lands.
- **`prefers-reduced-motion` audited only in the new code paths.**
  Verify it still works in the older essay path too.
- **localStorage cross-tab via `storage` event** — works in modern
  browsers, but graceful when not available (no toast spam).
