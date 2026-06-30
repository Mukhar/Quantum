# Requirements — Quantum v3.0

*Milestone:* **v3.0 — Algorithms × Use Cases**
*Last updated:* 2026-06-29
*Source:* `docs/plans/2026-06-29-v3-design.md`

v1 + v2 requirements are validated and recorded under
`.planning/PROJECT.md` → Requirements → Validated. This file scopes
**only** the new v3 requirements. Each requirement is user-centric,
testable, and mapped to exactly one phase in `.planning/ROADMAP.md`.

REQ-IDs use category prefixes — `QSK-*`, `ALG-*`, `USE-*`, `PROG-*`,
`OPS-*` — so v3 IDs never collide with v1's `REQ-*` numbering or with
v2's `THEME-*` / `FB-*` / `GAL-*` IDs. Note: `OPS-*` is reused as a
category prefix; v3's `OPS-01..04` are distinct from v2's shipped
`OPS-01..03` (which now live under the Validated section of PROJECT.md).

---

## v3 Requirements

### Qiskit-text export (Foundation)

- [ ] **QSK-01** — User can click a "Copy as Qiskit" button on the
  sandbox toolbar to copy a runnable Qiskit Python snippet of the
  current circuit to the clipboard. Snippet uses
  `QuantumCircuit(n_qubits, n_qubits)`, applies each gate in `Step`
  order, includes measurement, and is verbatim-runnable in a Qiskit
  notebook.
- [ ] **QSK-02** — Every essay-embedded `CircuitView` exposes the same
  "Copy as Qiskit" affordance for its statically-encoded circuit. No
  essay's `CircuitView` is read-only.
- [ ] **QSK-03** — Drift-proof gate coverage: a golden unit test
  asserts every gate the simulator supports (`H`, `X`, `Y`, `Z`, `S`,
  `T`, `Rx`, `Ry`, `Rz`, `CNOT`, controlled rotations, `SWAP`, `M`)
  renders to a syntactically-correct Qiskit instruction. Test fails on
  any new simulator gate that lacks a Qiskit mapping.

### Algorithm essays

- [ ] **ALG-01** — `/teleportation` essay walks the reader through the
  3-qubit teleportation circuit with an interactive `ProtocolStepper`
  widget. Reader can advance step by step (entangle pair → Bell
  measure → classical bits → conditional X/Z → state arrives) and the
  embedded `MultiBlochPanel` visualizes each step.
- [ ] **ALG-02** — `MultiBlochPanel` honestly renders mixed states:
  when a qubit's reduced density matrix has `|r| < 1`, the Bloch
  arrow renders **inside** the sphere (length = `|r|`). Implementation
  reuses `src/lib/quantum/reducedDensity.ts`; unit tests assert the
  arrow length matches the Bloch vector norm for canonical mixed
  states (`I/2`, `(I + 0.5 Z)/2`, …).
- [ ] **ALG-03** — `/superdense-coding` essay shows the protocol with
  an `EncodingTable` widget: clicking a 2-bit input (`00`, `01`, `10`,
  `11`) animates the corresponding `I/X/Z/XZ` gate on Alice's qubit
  and shows the Bell-basis measurement outcome on Bob's side.
- [ ] **ALG-04** — `/grover` essay implements oracle + diffusion
  operators in the simulator. An `AmplitudeBars` widget shows
  per-basis-state amplitudes after each iteration; reader can step
  through iterations and see amplitude concentrate on the marked
  state.
- [ ] **ALG-05** — `/shor` essay (or `/qft`, see §3.5) ships a `QFT`
  visualizer: a 4-qubit `QFT` rendered as before/after probability
  bars over the computational basis, with reader-adjustable input
  state.
- [ ] **ALG-06** — A `PeriodFinding` live demo runs in-browser for
  small modular-exponentiation periods (`a^x mod N` with `N ≤ 15`),
  showing the QFT peak that pins the period.
- [ ] **ALG-07** — `/shor` essay ships a full N=15 Shor circuit
  rendered statically via `CircuitView` (no in-browser execution
  needed) with the Qiskit-export button so the reader can actually
  run it on real Qiskit. Body text explicitly frames Qiskit as "now
  go run this for real".
- [ ] **ALG-08** — `/vqe` essay ships a vanilla-TypeScript classical
  optimizer (~50-100 LOC gradient descent or Nelder-Mead). Unit
  tests assert convergence on a 1D parabola and on the 2-parameter
  H2 ground-state energy surface to within 1e-3 of the true minimum.
- [ ] **ALG-09** — An `EnergyLandscape` widget renders the variational
  energy surface for a 2-parameter ansatz; reader can drag a marker
  (or click "auto-descend") to watch the optimizer find the minimum.

### Use-case essays (one widget per half — no prose-only sections)

- [ ] **USE-01** — `/teleportation` essay's second half ships a
  `QuantumNetwork` interactive: 3-node diagram (Alice / Repeater /
  Bob) where the reader clicks each link to swap entanglement along
  it; updates a live "shared Bell pair between Alice ↔ Bob" indicator.
- [ ] **USE-02** — `/superdense-coding` essay's second half ships a
  `HolevoBound` widget that maps `n` qubits ↔ classical bits
  conveyable, surfacing the 2× advantage ceiling visually so the
  reader sees superdense isn't "free bandwidth."
- [ ] **USE-03** — `/grover` essay's second half ships a
  `SearchComparison` widget that side-by-side animates classical
  linear scan vs. Grover's `√N` iterations as `N` slides from 16 to
  1024; reader watches the gap open and close on toy problem sizes.
- [ ] **USE-04** — `/shor` essay's second half ships an `RSACountdown`
  widget that takes RSA key size (2048 / 3072 / 4096) and a logical-
  qubit estimate slider, projecting the qubits-needed-to-break number
  and linking out to the 4 NIST PQC primitives (Kyber, Dilithium,
  Falcon, SPHINCS+).
- [ ] **USE-05** — `/vqe` essay's second half ships a `MoleculeGallery`
  with 2-3 pre-baked molecules (`H2`, `LiH`, `HeH+`) — each shows the
  reader-saved ansatz parameters, the converged energy, and the
  Qiskit-export button so they can rerun on real Qiskit.

### Progress

- [ ] **PROG-01** — Concept-map homepage shows a per-essay "visited"
  flag for each of the 10 essays (5 v1+v2 + 5 v3). State stored under
  `localStorage["quantum/visited"]` only — no server, no analytics.
  Honors "no analytics. ever." promise; flag flips on essay-page
  scroll past 50%.

### Launch ops

- [ ] **OPS-01** — Lighthouse mobile a11y ≥ 95 on each of the 5 new
  essay routes in **both** themes; recorded in v3 launch artifact.
- [ ] **OPS-02** — v3 announcement draft committed before the v3
  retro, re-using the v1/v2 launch-announcement template.
- [ ] **OPS-03** — Concept-map layout audit: if 10 essays clutter the
  current layout, group into tracks ("Foundations" / "Communication"
  / "Search" / "Cryptography" / "Variational"). Visual QA recorded.
- [ ] **OPS-04** — CI gate: per-route JS budget asserts `/index`,
  `/sandbox`, `/gallery`, `/qubit`, `/measurement`, `/teleportation`,
  `/superdense-coding`, `/grover`, `/shor`, `/vqe` each stay within
  their declared bundle ceiling. Fails the build on regression.
  Sandbox bundle excluded from essay-route ceilings.

---

## Future Requirements (deferred to v4+)

Captured here so they're not re-discovered:

- Cross-device gallery sync (schema is sync-ready since v2; sync layer
  itself is v4)
- Sandbox **import** of Qiskit text (reverse-direction transpile)
- Public / community gallery feed with upvotes
- HHL / QPCA / quantum ML / QAOA / error-correction essays
- Quantum-sensing / metrology essays
- E2E (Playwright) sandbox-flow harness
- Pedagogy experiments — pick-a-path reading order, in-essay quiz
- 8-qubit simulator extension (Qiskit export handles the only v3
  algorithm that exceeds 4: Shor on N=15)

## Out of Scope (v3)

- User accounts / login
- Comment threads (replaced by feedback form)
- Real quantum hardware integration (`Qiskit` SDK, IBM Q auth)
- Embedded Qiskit/Cirq editor (export-only, one-way)
- i18n
- Opt-in interaction analytics (the "no tracking" promise stays locked)
- Per-essay reader quizzes / completion certificates

---

## Traceability

| REQ-ID  | Phase                                    | Plan(s) | Validated by |
|---------|------------------------------------------|---------|--------------|
| QSK-01  | 1 — Foundation: Qiskit export + CI gate  | TBD     | TBD |
| QSK-02  | 1 — Foundation: Qiskit export + CI gate  | TBD     | TBD |
| QSK-03  | 1 — Foundation: Qiskit export + CI gate  | TBD     | TBD |
| OPS-04  | 1 — Foundation: Qiskit export + CI gate  | TBD     | TBD |
| ALG-01  | 2 — Teleportation + Quantum networks     | 02-01, 02-02, 02-05 | TBD |
| ALG-02  | 2 — Teleportation + Quantum networks     | 02-01, 02-03, 02-05 | TBD |
| USE-01  | 2 — Teleportation + Quantum networks     | 02-04, 02-05        | TBD |
| ALG-03  | 3 — Superdense + Holevo                  | 03-01, 03-02, 03-04 | TBD |
| USE-02  | 3 — Superdense + Holevo                  | 03-03, 03-04        | TBD |
| ALG-04  | 4 — Grover + Search reality              | TBD     | TBD |
| USE-03  | 4 — Grover + Search reality              | TBD     | TBD |
| ALG-05  | 5 — Shor + QFT + PQC                     | TBD     | TBD |
| ALG-06  | 5 — Shor + QFT + PQC                     | TBD     | TBD |
| ALG-07  | 5 — Shor + QFT + PQC                     | TBD     | TBD |
| USE-04  | 5 — Shor + QFT + PQC                     | TBD     | TBD |
| ALG-08  | 6 — VQE + Chemistry + launch             | TBD     | TBD |
| ALG-09  | 6 — VQE + Chemistry + launch             | TBD     | TBD |
| USE-05  | 6 — VQE + Chemistry + launch             | TBD     | TBD |
| PROG-01 | 6 — VQE + Chemistry + launch             | TBD     | TBD |
| OPS-01  | 6 — VQE + Chemistry + launch             | TBD     | TBD |
| OPS-02  | 6 — VQE + Chemistry + launch             | TBD     | TBD |
| OPS-03  | 6 — VQE + Chemistry + launch             | TBD     | TBD |
