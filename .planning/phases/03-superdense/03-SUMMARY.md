# Phase 3 — Superdense Coding + Holevo Bound — SUMMARY

*Completed: 2026-06-30 — implementation + close-out artifacts written during autonomous-run continuation.*

## Goal

Ship `/superdense-coding`, the second v3 communication essay. The
algorithm half teaches superdense coding as the mirror image of
teleportation: Alice and Bob pre-share a Bell pair, Alice encodes two
classical bits with `I / X / Z / XZ` on her qubit, Bob decodes with the
Bell-basis inverse and recovers the message. The use-case half grounds
the promise with a `HolevoBound` widget that shows the hard `2x`
ceiling — superdense is not "free bandwidth forever."

## What shipped

| Plan | Commit | Artifact |
|------|--------|----------|
| 03-01 | `071fea0` | `src/lib/quantum/superdense.ts` (266 LOC) — canonical 2-qubit superdense circuit, `00/01/10/11 → I/X/Z/XZ` encoding map, `superdenseCircuit`, `superdenseSteps`, deterministic decode helpers + barrel re-export in `src/lib/quantum/index.ts` |
| 03-01 | `071fea0` | `tests/quantum/superdense.test.ts` (201 LOC, 25 tests) — encoding mapping, circuit validity, ProtocolStep shape, Bell-basis decode correctness for all 4 message bits, Qiskit export compatibility |
| 03-02 | `2dc9083` | `src/components/EncodingTable.astro` (213 LOC) — 2×2 message-bit selector (`00/01/10/11`), highlights the matching Alice operation, surfaces Bob's decoded readout, `aria-live` summary, keyboard-navigable + `tests/components/encoding-table.test.ts` (6 tests) |
| 03-03 | `5c01bc7` | `src/components/HolevoBound.astro` (306 LOC) — single discrete slider over `n_qubits = 1..4`, two `aria-live` readouts (`n` classical bits without entanglement, `at most 2n` with superdense), inline SVG line chart with active markers, caption explicitly closes the "2× ceiling, full stop" misconception + `tests/components/holevo-bound.test.ts` (7 tests) |
| 03-04 | `8c088fb` | `src/pages/superdense-coding.astro` (387 LOC) — full essay following the teleportation.astro template; algorithm half uses `MultiBlochPanel` (Alice/Bob qubits) + `ProtocolStepper` + `CircuitView`, driven by `superdenseCircuit("11")` and `superdenseSteps("11")`; use-case half uses `EncodingTable` + `HolevoBound`; `MathNerds` appendix with Bell-basis algebra + Holevo inequality; nav-graph + concept-map + sandbox-links + sitemap + bundle-budget mirrors all updated in same commit |
| 03-05 | *(coincident with 03-04)* | Bundle ceiling close-out — initial `/superdense-coding` = 2048 B; clean-build measurement = 1.2 KB gzipped; recompute `round_up(1.2 × 1.2, 1024) = 2048` matches the initial guess exactly, so no separate ceiling-recompute commit was needed |

## Requirements closed

- **ALG-03** — Superdense coding protocol implemented as a deterministic
  Bell-basis encode/decode pair:
  - Selecting `00 / 01 / 10 / 11` in `EncodingTable` updates the
    protocol to the corresponding `I / X / Z / XZ` operation on Alice's
    qubit;
  - Bob's decoded Bell-basis measurement recovers the original two
    classical bits;
  - All four message bits verified correct end-to-end in 25 quantum
    tests at `1e-12` tolerance.
- **USE-02** — `HolevoBound` widget honestly bounds the advantage:
  - Slider over `n = 1..4`;
  - Two readouts: `n` bits without entanglement; `at most 2n` bits
    with pre-shared entanglement + superdense coding;
  - Visual + copy explicitly state the ceiling is `2×`, full stop;
  - Y-axis capped at 8 (the max for `n = 4`).

## Numbers

- **Tests:** 414/414 passing (+38 from Phase 2 baseline of 376: 25
  superdense quantum + 6 encoding-table + 7 holevo-bound)
- **Pages:** 22 building clean (added `/superdense-coding` here, plus
  `/grover` from Phase 4)
- **Bundle:** `/superdense-coding` 1.2 KB / 2.0 KB ceiling —
  comfortable headroom; site-wide budget table all green
- **Hard cap respected:** simulator stays at 4 qubits (superdense uses 2)
- **Footer-nav chain (final):** `teleportation → superdense-coding → grover → sandbox`

## Decisions ratified (from PHASE-CONTEXT.md)

1. **Route slug is `/superdense-coding`** (not `/superdense`) — locked
   for SEO and roadmap consistency.
2. **Reuse Phase-2 shared widgets** — `ProtocolStepper` for the
   narrative walkthrough, `MultiBlochPanel` for 2-qubit reduced Bloch
   views. No new parallel abstractions invented.
3. **`EncodingTable` owns message-bit selection.** Selection updates
   stepper state for the route-level widgets; the standalone `EncodingTable`
   surfaces its own decoded readout for the static page-level view.
4. **`HolevoBound` is a single-slider formula widget.** Discrete `n = 1..4`
   matches the simulator cap; no continuous interpolation, no implication
   of larger-`n` simulation.
5. **`HolevoBound` Y-axis capped at 8.** That is the `2 × 4` ceiling for
   the locked slider range; visual chart never extends past it.
6. **Symmetric template with teleportation.astro.** Algorithm-half on
   top, use-case-half on bottom, `MathNerds` appendix at the end —
   identical pedagogical shape so readers experience the communication
   arc as a coherent pair.
7. **MathNerds appendix covers Bell-basis algebra + Holevo inequality.**
   The math closes the loop: Alice's two-bit unitary maps to one of the
   four orthogonal Bell states, and Holevo's inequality is the
   information-theoretic reason `2n` is the hard ceiling.

## Physics correctness verified end-to-end

For all 4 message bits at canonical 2-qubit superdense:

```
00 → I on Alice  → Bob measures |Φ⁺⟩ → decodes 00 ✓
01 → X on Alice  → Bob measures |Ψ⁺⟩ → decodes 01 ✓
10 → Z on Alice  → Bob measures |Φ⁻⟩ → decodes 10 ✓
11 → XZ on Alice → Bob measures |Ψ⁻⟩ → decodes 11 ✓
```

Test assertion `tests/quantum/superdense.test.ts > decode` locks every
message bit to its correct Bell-state measurement at `1e-12` numerical
tolerance, and asserts the `ProtocolStep[]` sequence is
deterministically derived from the encoding (no drift on replay).

## What this phase unlocks

- **Communication arc complete.** With teleportation (Phase 2) +
  superdense (Phase 3), v3 now has the full classical↔quantum
  communication story: teleport sends a qubit using two classical bits
  + entanglement; superdense sends two classical bits using one qubit
  + entanglement. The Holevo bound caps both.
- **Template hardened.** The teleportation.astro shape now has a
  second proof point. Phase 4 (Grover) and Phase 5 (Shor) inherit the
  same structure without reinventing the page layout.
- **Bell-basis as a primitive.** `superdense.ts` exposes Bell-basis
  encode/decode that future essays (e.g. Phase 5 QFT post-processing)
  can compose without re-deriving the matrix algebra.

## Out-of-scope items (re-confirmed not done)

- No simulator cap bump (REQ-13 hard-locked at 4 qubits).
- No analytics / remote telemetry.
- No clickable Bell-basis projector picker (stretch; the `00/01/10/11`
  table is the locked interaction).

## Bookkeeping note

Commit `5c01bc7` (titled `feat(03-superdense/03-03)`) also contains
plan 04-01's `grover.ts` module + tests by accident — see Phase 4
SUMMARY for the parallel note. Both deliverables are clean in the
working tree; only the commit attribution is interleaved.

## Deferred to milestone summary

- Formal Lighthouse mobile a11y ≥ 95 pass per OPS-01 — structural a11y
  (aria-live readouts on both `EncodingTable` and `HolevoBound`,
  keyboard navigation on the message-bit table and slider, focus rings,
  no horizontal traps on mobile) is in place; formal device-emulated
  run rolls up with the rest of v3 at Phase 6 launch.
