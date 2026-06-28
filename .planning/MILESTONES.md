# Milestones

Project-level history of shipped milestones. Each entry is a short
summary; full per-phase artifacts live under
`.planning/phases/_archive-<milestone>/`.

---

## v1.0 — Initial public release (shipped 2026-06-26)

**Goal:** Ship a quantum-computing learning + playground site for
working devs: rigorous interactive essays + a creativity-first sandbox.

**Phases (all done):**

| Phase | Name | Plans | Completed |
|-------|------|-------|-----------|
| 1 | Foundation                         | 3/3 | 2026-06-24 |
| 2 | Flagship interactive qubit essay   | 6/6 | 2026-06-25 |
| 3 | Quantum Sandbox + Creative Outputs | 7/7 | 2026-06-26 |
| 4 | Foundations essay track            | 6/6 | 2026-06-26 |
| 5 | Algorithm track + v1 launch        | 5/5 | 2026-06-26 |

**Shipped:**

- 7 essays: `/qubit`, `/superposition`, `/measurement`, `/gates`,
  `/entanglement`, `/cnot-bell`, `/deutsch`
- `/sandbox` circuit composer with URL-fragment sharing, undo/redo,
  challenge mode (5 starter puzzles), Quantum Canvas (PNG export),
  Quantum Tones (WAV export)
- Concept-map homepage with cross-essay nav
- SEO infra: `robots.txt`, `sitemap.xml` endpoint, og/twitter meta,
  site-wide SVG og-image, canonical link tags, friendly 404
- 146 vitest tests passing, 16 pages building clean
- `LIGHTHOUSE.md` manual audit + `LAUNCH-ANNOUNCEMENT.md` draft

**Requirements validated:** REQ-01 → REQ-23 (all 23 v1 requirements).
See PROJECT.md "Validated" section for the per-requirement ledger.

**Carryover (post-milestone task, not a phase):**
- v1 deploy + post-launch feedback round. Tracked in
  `.planning/phases/_archive-v1/05-algorithms/LAUNCH-ANNOUNCEMENT.md`
  pre-launch checklist. Runs whenever ready; does not block v2 work.

**Archived under:** `.planning/phases/_archive-v1/`
