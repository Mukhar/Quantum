# Requirements — Quantum v2.0

*Milestone:* **v2.0 — Return, Comfort, Voice**
*Last updated:* 2026-06-28
*Source:* `docs/plans/2026-06-26-v2-design.md`

v1 requirements (REQ-01..23) are validated and listed under
`.planning/PROJECT.md` → Requirements → Validated. This file scopes
**only** the new v2 requirements. Each requirement is user-centric,
testable, and mapped to exactly one phase in `.planning/ROADMAP.md`.

REQ-IDs use category prefixes — `THEME-*`, `FB-*`, `GAL-*`, `OPS-*` —
so v2 IDs never collide with v1's `REQ-*` numbering.

---

## v2 Requirements

### Theme system

- [ ] **THEME-01** — User can toggle between Light, Dark, and System
  themes via a 3-state button in the site header; choice persists
  across page loads in `localStorage["quantum/theme"]`.
- [ ] **THEME-02** — On first paint, the page renders in the correct
  theme with no flash of unstyled content (FOUC). Inline `<head>`
  script reads `localStorage` and `prefers-color-scheme` before any
  CSS applies.
- [ ] **THEME-03** — Every existing widget (KaTeX math blocks,
  Three.js Bloch sphere, ProbabilityBars, StateVector readout,
  sandbox grid + palette, Quantum Canvas, Quantum Tones, annotations,
  ConceptMap homepage, Shiki code blocks) renders with WCAG 2.2 AA
  contrast in **both** themes.
- [ ] **THEME-04** — Live-rendered scenes (Three.js Bloch) re-read
  their background/axis colors from CSS variables when the user
  toggles themes; no page reload required.
- [ ] **THEME-05** — Playwright visual-regression snapshots for every
  route in both themes; CI fails on contrast or layout regression.

### Feedback form

- [ ] **FB-01** — User can submit feedback from `/feedback` with a
  Type dropdown (general / topic suggestion / feature request / bug),
  Subject, Message, and optional Email.
- [ ] **FB-02** — Submitted feedback appends a row to a private Google
  Sheet via a Google Apps Script Web App; user is redirected to
  `/feedback/thanks` on success.
- [ ] **FB-03** — A hidden honeypot field (`_hp`, `tabindex=-1`,
  `aria-hidden`) drops bot submissions silently server-side.
- [ ] **FB-04** — Network failure or Apps Script outage falls back to a
  `mailto:` link with prefilled subject/body so the user is never
  blocked from sending feedback.
- [ ] **FB-05** — `docs/apps-script.md` documents the one-time
  copy-paste setup for the Apps Script Web App and Sheet.

### Circuit Gallery

- [ ] **GAL-01** — User can save the current sandbox circuit to a local
  gallery with a name and optional tags. Save renders a ≤ 8 KB PNG
  thumbnail for the gallery card.
- [ ] **GAL-02** — `/gallery` page lists all saved circuits as a grid
  of cards showing thumbnail, name, `qubits·steps`, and relative
  updated-at. Empty state explains how to save the first circuit.
- [ ] **GAL-03** — Clicking a gallery card opens it in `/sandbox` via
  the existing URL-fragment codec — no separate "load circuit" code
  path.
- [ ] **GAL-04** — User can rename, duplicate, and delete entries from
  the gallery; updates persist to IndexedDB.
- [ ] **GAL-05** — User can export the full gallery (or individual
  entries) as a downloadable JSON file, and re-import it on the same
  or another device. Malformed imports are rejected with inline
  validation errors and never overwrite existing entries.
- [ ] **GAL-06** — Schema is versioned (`schemaVersion`); v0→v1 (and
  future) migrations run on read. Unknown versions are quarantined,
  not deleted. Schema shape matches what a future REST
  `POST /circuits` would accept verbatim.
- [ ] **GAL-07** — When IndexedDB is unavailable (private browsing,
  blocked), the page shows a banner: "Your browser is blocking local
  storage; circuits won't persist." and falls back to an in-memory
  list for the session.
- [ ] **GAL-08** — Gallery code is lazy-loaded — only `/sandbox` and
  `/gallery` pay its bundle cost; essay bundles are unchanged.
- [ ] **GAL-09** — User receives a soft warning at 100 saved entries
  with a "manage storage" link; storage-quota errors on save surface a
  clear toast and do not corrupt existing entries.

### Launch ops

- [ ] **OPS-01** — Lighthouse mobile a11y ≥ 95 on `/gallery` and
  `/feedback` in both themes.
- [ ] **OPS-02** — Dark-mode visual QA pass against the §3.2 widget
  checklist in `docs/plans/2026-06-26-v2-design.md` is recorded in the
  v2 launch artifact.
- [ ] **OPS-03** — v2 announcement draft committed before the v2 retro,
  re-using the v1 launch-announcement template pattern.

---

## Future Requirements (deferred to v3+)

Captured here so they're not re-discovered:

- Cross-device gallery sync (schema is ready; sync layer is v3)
- Public / community gallery feed with upvotes
- Algorithm essays — teleportation, superdense coding, Grover, QFT, Shor
- Pedagogy experiments — pick-a-path reading order, in-essay quiz
- Bundle-size regression budget in CI
- E2E (Playwright) harness for sandbox flows (v2 ships only the
  visual-regression scope under THEME-05; flow E2E is v3)
- Concept-map progress indicator
- Qiskit text export from the sandbox

## Out of Scope (v2)

- User accounts / login
- Comment threads (replaced by feedback form)
- Real quantum hardware integration
- Embedded Qiskit/Cirq editor
- i18n
- Opt-in interaction analytics (the "no tracking" promise stays locked)

---

## Traceability

Filled in once the roadmapper maps requirements to phases.

| REQ-ID | Phase | Plan(s) | Validated by |
|--------|-------|---------|--------------|
| THEME-01 | 1 — Theme system | TBD | TBD |
| THEME-02 | 1 — Theme system | TBD | TBD |
| THEME-03 | 1 — Theme system | TBD | TBD |
| THEME-04 | 1 — Theme system | TBD | TBD |
| THEME-05 | 1 — Theme system | TBD | TBD |
| FB-01    | 2 — Feedback form | TBD | TBD |
| FB-02    | 2 — Feedback form | TBD | TBD |
| FB-03    | 2 — Feedback form | TBD | TBD |
| FB-04    | 2 — Feedback form | TBD | TBD |
| FB-05    | 2 — Feedback form | TBD | TBD |
| GAL-01   | 3 — Circuit gallery | TBD | TBD |
| GAL-02   | 3 — Circuit gallery | TBD | TBD |
| GAL-03   | 3 — Circuit gallery | TBD | TBD |
| GAL-04   | 3 — Circuit gallery | TBD | TBD |
| GAL-05   | 3 — Circuit gallery | TBD | TBD |
| GAL-06   | 3 — Circuit gallery | TBD | TBD |
| GAL-07   | 3 — Circuit gallery | TBD | TBD |
| GAL-08   | 3 — Circuit gallery | TBD | TBD |
| GAL-09   | 3 — Circuit gallery | TBD | TBD |
| OPS-01   | 4 — v2 launch polish | TBD | TBD |
| OPS-02   | 4 — v2 launch polish | TBD | TBD |
| OPS-03   | 4 — v2 launch polish | TBD | TBD |
