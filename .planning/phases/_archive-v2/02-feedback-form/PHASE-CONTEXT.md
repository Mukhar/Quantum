# Phase 2 Context: Feedback form

*Created: 2026-06-28 as part of v2.0 milestone bump.*
*Status: Awaiting `/gsd-discuss-phase 2` then `/gsd-plan-phase 2`.*

## Goal

A single `/feedback` page POSTs to a Google Apps Script Web App that
appends rows to a private Google Sheet you own. Mailto fallback on
failure; honeypot for spam.

## Requirements covered

- **FB-01** — `/feedback` form with Type / Subject / Message / optional Email
- **FB-02** — Submission appends a row to a private Google Sheet
- **FB-03** — Hidden honeypot drops bot submissions
- **FB-04** — Network/Apps-Script failure falls back to `mailto:`
- **FB-05** — `docs/apps-script.md` documents one-time Apps Script setup

## Source design

Source of truth: `docs/plans/2026-06-26-v2-design.md` §3.3.

Key choices already locked there:
- **Apps Script + private Sheet** over Formspree — free forever, no
  submission cap, data ownership. ~10 min one-time setup.
- Form fields:
  | Field | Type | Notes |
  |---|---|---|
  | Type | `<select>` | "General" / "Topic suggestion" / "Feature request" / "Bug report" |
  | Subject | text | required, max 100 chars |
  | Message | textarea | required, max 2000 chars |
  | Email | email | optional ("if you want a reply") |
  | Page context | hidden | auto-filled with `document.referrer` |
  | `_hp` honeypot | hidden | `tabindex=-1`, `aria-hidden`, dropped if non-empty |
- Apps Script returns a 302 redirect to `/feedback/thanks`.
- Apps Script throttles by hashed IP — soft cap 5/min.

## Files added (per design doc)

```
src/pages/feedback/
  index.astro      ← the form
  thanks.astro     ← post-submit confirmation
docs/
  apps-script.md   ← copy-paste setup guide
```

## Open question to resolve in plan-phase

Anonymous session-ID UUID in `localStorage` so repeat feedback from the
same user is linkable in the Sheet (no PII)? Design doc leans yes.

## Constraints

- No JS framework — vanilla HTML form, native validation.
- Theme-aware from birth (depends on Phase 1).
- Header nav must add a `feedback` link → update
  `tests/essays/nav-graph.test.ts` mirror in same commit.
- A11y: form labeled, error states announced, focus order sane,
  fully keyboard-operable. Lighthouse a11y ≥ 95 (OPS-01).
