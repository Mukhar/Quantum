# Phase 2 — Teleportation + Quantum Networks (FLAGSHIP) — SUMMARY

*Completed: 2026-06-29 — content + UAT • verified retroactively 2026-06-30 during autonomous run.*

## Goal

Ship `/teleportation`, the flagship v3 essay, proving the "algorithm
half + use-case half, both widget-driven" format end-to-end.

- **Algorithm half:** walk the reader through the 3-qubit teleportation circuit (entangle → Bell measure → classical bits → conditional X/Z → state arrives), with a `ProtocolStepper` + `MultiBlochPanel` honestly rendering mixed reduced states.
- **Use-case half:** let the reader swap entanglement across a 3-node `QuantumNetwork` (Alice / Repeater / Bob), with a live "shared Bell pair Alice↔Bob" indicator.

## What shipped

| Plan | Commit | Artifact |
|------|--------|----------|
| 02-01 | `6b04229` | `src/lib/quantum/teleportation.ts` (protocol module) + 8 correctness tests |
| 02-02 | `74047f9` | `src/components/ProtocolStepper.astro` (shared widget) + 11 tests + replay helper |
| 02-03 | `c27e6f1` | `src/components/MultiBlochPanel.astro` (N × MiniBloch with honest mixed-state arrows) |
| 02-04 | `38c722d` | `src/components/QuantumNetwork.astro` (USE-01) + reachability helper + 12 tests |
| 02-05 | `80971e2` | `/teleportation` essay + nav-graph + concept-map + sandbox-links mirrors + bundle-budget entry |
| 02-06 | `b5db12a` | Bundle-budget close-out — /teleportation ceiling settled |
| follow-up | `3fbd3d1` | UAT recorded — 13/14 pass, 1 cosmetic |
| follow-up | `47b30a7` | MathBlock display-mode `overflow-x-auto` wrapper (closes the 1 cosmetic gap) |

## Requirements closed

- **ALG-01** — Teleportation protocol implemented as a deterministic deferred-measurement circuit; correctness tests assert end-to-end fidelity.
- **ALG-02** — Mixed reduced-state honesty: `MultiBlochPanel` arrow length = `|r|`; canonical mixed states (`I/2`, `(I+0.5·Z)/2`) live inside the sphere with the right magnitude.
- **USE-01** — `QuantumNetwork` 3-node widget with entanglement swap on link-click; "shared Bell pair Alice↔Bob" indicator flips when end-to-end entanglement exists.

## Numbers

- **Tests:** 324/324 passing (+31 vs Phase 1: 8 teleportation + 11 protocol-stepper + 12 quantum-network)
- **Pages:** 20 building clean (+1 → `/teleportation`)
- **Bundle:** `/teleportation` 1.6 KB / 2.0 KB ceiling — comfortable headroom
- **Hard cap respected:** simulator stays at 4 qubits (teleportation uses 3)

## Decisions ratified

1. **`ProtocolStepper` replays the circuit from scratch each step** — no drift on repeated forward/back cycles. Sub-step state derived purely from the canonical `steps[]` array.
2. **`MultiBlochPanel` composes `MiniBloch`** — no new viz primitive; honest mixed-state rendering inherited from v1 sphere code.
3. **`QuantumNetwork` is generic** (not teleportation-specific) — Phase 6 can reuse for VQE chemistry molecule topologies if needed.
4. **MathBlock display-mode equations** wrap in `overflow-x-auto` container — wide KaTeX no longer overflows narrow viewports. (Cosmetic gap from 02-UAT closed in the same milestone.)

## Physics correctness verified end-to-end

Per-step `|r|` measurements from 02-UAT test 4 independently confirm the
deferred-measurement protocol:

```
Step 1: q0=1.000 (|1⟩), q1=0.000, q2=0.000  [Bell pair → mixed]
Step 2: q0=1.000 (|1⟩), q1=0.000, q2=0.000  [X(0)]
Step 3: q0=1.000 (|-⟩), q1=0.000, q2=0.000  [Bell-basis: q0 → |-⟩]
Step 4: q0=1.000, q1=1.000, q2=1.000        [factorizes: |-⟩|+⟩|1⟩]
Step 5: q0=1.000, q1=1.000, q2=1.000        [final: |+⟩|+⟩|1⟩]
```

Final state on q2 matches the original message on q0 — teleportation
correctness end-to-end. No FTL signaling (Step 4-5 require the classical
bits from Step 3).

## What this phase unlocks

- **Pattern reuse for Phase 3** (Superdense): `ProtocolStepper` for the encoding/decoding walkthrough, `MultiBlochPanel` for Bell-basis measurement visualization.
- **Use-case widget template** for every subsequent essay: small, focused, interactive, paired with the algorithm half.
- **Bundle baseline:** every v3 essay can be checked against `/teleportation`'s 1.6 KB as the "what a flagship essay costs" benchmark.

## Deferred to milestone summary

- Formal Lighthouse mobile a11y pass per OPS-01 (UAT verifier=agent Playwright walkthrough already validates a11y wiring — aria-live, keyboard focus, theme parity).
