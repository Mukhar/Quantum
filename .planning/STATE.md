# State

*Last updated: 2026-06-26 — Phase 3 complete. Ready to start Phase 4.*

## Project Reference

See: `.planning/PROJECT.md` and `.planning/ROADMAP.md`.

- **Core value:** Earn dev trust with real, inspectable math — then
  unlock creativity by letting readers actually play.
- **Current focus:** Phase 4 (Foundations essay track) has not started.
  Phase 3 is **done** as of commit `070aaed` (Quantum Tones hydrator
  + page wiring); summary at `.planning/phases/03-sandbox/03-SUMMARY.md`.

## Where we are

- [done] **Phase 1 (Foundation)** — `8148713`. 21-test simulator.
- [code-complete] **Phase 2 (Flagship qubit essay)** — all 6 plans
  landed. Deploy + dev-friend feedback + Lighthouse still pending,
  tracked in `.planning/phases/02-qubit-essay/REMAINING.md`.
- [done] **Phase 3 (Quantum Sandbox + Creative Outputs)** — all 7
  plans landed. See `.planning/phases/03-sandbox/03-SUMMARY.md` for
  the full recap. Highlights:
  - 97 tests passing (was 32 at end of Phase 2).
  - 9 pages build clean.
  - Composer + results + canvas + tones all hydrate lazily and
    play nicely with the same `commit()` / `circuit` signal.
  - Bundle on `/sandbox` with both creative widgets in view: ~34 KB
    gzipped (budget was 250 KB).
- [not started] **Phase 4 (Foundations essay track)** — zero files
  on disk. Plans for 4–6 essays + a homepage concept map per ROADMAP.

## Next action (resume here)

1. **(Optional) Close Phase 2 leftovers** — deploy to a static host,
   run a real-device Lighthouse pass, collect dev-friend feedback,
   delete `phases/02-qubit-essay/REMAINING.md` when done. Doesn't
   block Phase 4 work, but does block v1 launch.
2. **Start Phase 4** via `smart_discuss`:
   - No `04-CONTEXT.md` exists yet. Discuss should lock at minimum:
     - Which 4–6 foundations essays make the cut (superposition,
       measurement, gates, entanglement are the obvious four;
       phase / interference is a strong fifth).
     - Homepage concept-map shape (SVG? D3? hand-rolled? clickable
       node graph linking to essays?).
     - Whether each essay re-uses the Phase 2 widget kit as-is or
       gets a new minimal widget per concept.
     - Re-ratify "vanilla TS signals" given we now have evidence it
       works at sandbox scale.
3. **Plan-phase per essay** — probably 4–6 plans, each shaped like
   `02-XX` (essay copy + 1–2 widgets + page wiring).
4. **Execute** — sequentially or via a parallel sub-agent fan-out
   (one agent per essay). Phase 3 proved the parallel pattern works.
5. **Phase 4 DoD checkpoint** — every essay deep-links into
   `/sandbox#…` with a pre-loaded remix. (This is the payoff for
   shipping the sandbox second.)

## Active architectural decisions carrying into Phase 4

1. **Reactivity = vanilla TS + in-repo `signal<T>`** (`src/lib/sandbox/signal.ts`).
   Phase 3 proved this scales to 4 qubits × 64 steps with no jank.
   Continue using it unless Phase 4 hits a real wall.
2. **URL fragments are the source of truth for sharable state**, with
   `localStorage` as crash recovery. Same pattern works for "share an
   essay with a custom widget config" if Phase 4 wants it.
3. **Creative outputs lazy-mount via the shared `lazyMount()` helper**
   in `src/pages/sandbox/index.astro`. If a Phase 4 essay wants its
   own heavyweight widget, copy this pattern.
4. **Single `commit()` chokepoint per surface** so undo/persistence/URL
   can be wired in one place. Use the same shape for any new editor-y
   widget in Phase 4.

## Open risks (carried into Phase 4)

- **No E2E test harness yet.** All 97 tests are unit. Phase 3
  finally has enough interaction surface to justify Playwright; the
  decision is now genuinely overdue. Bring it up in `smart_discuss`.
- **Three.js chunk still 130.86 KB gzipped** on `/qubit`. Phase 4 essays
  that use Bloch should re-use the same chunk (it caches), but a
  homepage concept map should *not* pull it in.
- **Bundle-analyzer + Lighthouse reports** not yet committed under
  `docs/perf/`. Doc artifact, not feature work — bundle into the same
  Phase 2 leftovers pass.
- **localStorage cross-tab via `storage` event** — works in modern
  browsers; quietly no-ops elsewhere. Same caveat applies to anything
  Phase 4 builds that wants the same multi-tab nicety.
