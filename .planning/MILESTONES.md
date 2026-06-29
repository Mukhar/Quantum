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

---

## v2.0 — Return, Comfort, Voice (code-complete 2026-06-28)

**Goal:** Close three v1 gaps — no save, no theme choice, no in-site
feedback — without breaking the static-site, no-backend posture.

**Phases (all done):**

| Phase | Name | Plans | Completed |
|-------|------|-------|-----------|
| 1 | Theme system                       | 4/4 | 2026-06-28 |
| 2 | Feedback form (Apps Script)        | 5/5 | 2026-06-28 |
| 3 | Circuit gallery (IndexedDB)        | 9/9 | 2026-06-28 |
| 4 | Launch polish (audit + announce)   | 6/6 | 2026-06-28 |

**Shipped:**

- Three-state theme toggle (light / dark / system), 17-token semantic
  palette, FOUC-free inline bootstrap, themechange CustomEvent picked
  up by Three.js + inline SVG widgets
- `/feedback` + `/feedback/thanks` — Apps Script POST with honeypot,
  server-side rate limit, mailto fallback, no XSS surface
- `/gallery` + `/sandbox` Save dialog — IndexedDB via `idb-keyval`,
  schema v1, JSON export/import, in-memory fallback for Safari Private
  Browsing, click-card-to-reopen via existing URL-fragment codec
- 247 vitest tests (+101 over v1), 19 pages building clean
- v2 launch announcement, bundle audit, visual QA scorecard, Lighthouse
  plan, Plan 01-05 visual-regression deferred decision

**Requirements validated:** THEME-01..04, FB-01..05, GAL-01..09,
OPS-01..03 (all 22 v2 requirements).

**Deferred to v2.1 / backlog:**
- Playwright visual regression harness (see
  `.planning/phases/04-launch-polish/VISUAL-REGRESSION-DEFERRED.md`)
- KaTeX self-host (Plan 01-06 from v1 carryover)

**Bundle delta:** +44 KB site-wide (+6.9%), all in new-route chunks.
Essay routes unchanged at 4 KB initial JS. See
`.planning/phases/04-launch-polish/BUNDLE-AUDIT.md`.

**Carryover (post-milestone tasks, not phases):**
- Manual Lighthouse run per `04-launch-polish/LIGHTHOUSE-PLAN.md`
- Apps Script endpoint provisioning + `PUBLIC_FEEDBACK_URL` set
- Launch-day smoke test per `04-launch-polish/LAUNCH-ANNOUNCEMENT.md`
- v1 deploy carryover (still open from v1.0 if not yet shipped)

**Archived under:** `.planning/phases/_archive-v2/` (moved post code-complete).

