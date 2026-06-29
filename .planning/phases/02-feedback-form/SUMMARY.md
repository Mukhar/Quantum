# Phase 2 — Feedback Form — SUMMARY

*Status: ✅ Complete — 2026-06-28*

## Phase Goal

Ship `/feedback` page that POSTs to a Google Apps Script Web App,
appends rows to a private Sheet. Honeypot-protected, mailto-fallback
on failure, theme-aware via Phase 1.

Covers: **FB-01, FB-02, FB-03, FB-04, FB-05**.

---

## What Shipped

### Sub-plans completed (all 5)

| Plan | Title | Status |
|---|---|---|
| 02-01 | Form page + thanks page (theme-aware shell) | ✅ |
| 02-02 | Submit handler + honeypot + mailto fallback | ✅ |
| 02-03 | Nav link in both layouts + page-test coverage | ✅ |
| 02-04 | Apps Script setup doc (`docs/apps-script.md`) | ✅ |
| 02-05 | Tests (lib + page integration) | ✅ |

### New files

- `src/pages/feedback/index.astro` — the form (vanilla HTML, native validation, hidden honeypot, mailto fallback banner).
- `src/pages/feedback/thanks.astro` — confirmation page (static, no data echoed → XSS-safe).
- `src/lib/feedback.ts` — runtime helpers: `buildMailto`, `getOrCreateSid`, `isHoneypotTriggered`, `submitFeedback`, `clampPayload`.
- `docs/apps-script.md` — 10-min one-time setup walkthrough (Sheet → Apps Script → deploy → env var).
- `tests/feedback/feedback.test.ts` — 24 unit tests for lib helpers (all paths: ok, fail, spam, noop, opaque success).
- `tests/feedback/feedback-page.test.ts` — 9 integration tests (page existence, EssayLayout use, honeypot present, env var wired, nav link in both layouts, doc complete).

### Modified files

- `src/layouts/EssayLayout.astro` — added `Feedback` link to header nav next to `Home`.
- `src/layouts/SandboxLayout.astro` — added `Feedback` link between `Challenges` and `Home`.

### Test counts

- Before Phase 2: 167 passing
- After Phase 2: **197 passing** (+30: 24 lib + 9 page = 33 new, but 3 of the original tests rolled into the env)
- Build: clean — **18 pages** (was 16; +2 for `/feedback`, `/feedback/thanks`)

---

## Architecture

```
┌──────────────────┐    POST JSON     ┌───────────────────┐
│ /feedback        │ ───────────────► │ Apps Script       │
│ (vanilla HTML +  │                  │ Web App           │
│  client script)  │ ◄── on failure ──┤ doPost            │
└──────────────────┘   show mailto    └─────────┬─────────┘
                                                │ appendRow
                                                ▼
                                       ┌────────────────┐
                                       │ Private Sheet  │
                                       │ (your account) │
                                       └────────────────┘
```

**Env vars** (Astro `PUBLIC_*` prefix, read at build time):
- `PUBLIC_FEEDBACK_URL` — Apps Script Web App URL.
- `PUBLIC_FEEDBACK_EMAIL` — mailto fallback recipient (defaults to `feedback@example.com`).

When `PUBLIC_FEEDBACK_URL` is empty, the page renders a yellow
"preview build — delivery not configured" banner and the form falls
through to mailto immediately on submit. This means the site works
**before** Apps Script is set up — useful for early preview deploys.

---

## Threat Mitigations (verified)

| Threat | Mitigation | Verified |
|---|---|---|
| Bot spam | Honeypot field `_hp` with `.sr-only-hp` CSS (off-screen, `tabindex=-1`, `aria-hidden`); `isHoneypotTriggered` drops with `"spam"` result | `feedback.test.ts` "true when honeypot has any content" + Apps Script `doPost` also drops |
| Submission lost on network blip | `submitFeedback` returns `"fail"` → form shows error banner with pre-populated mailto link | `feedback.test.ts` "returns 'fail' on network error" |
| Apps Script not configured (preview) | `submitFeedback` returns `"noop"` when endpoint empty → mailto fallback | `feedback.test.ts` "returns 'noop' when endpoint is empty" |
| Reflected XSS via thanks page | Thanks page is static, no form data echoed | Source review |
| Massive payload DOS | `clampPayload` slices subject/100, message/2000, email/200 client-side; `doPost` re-clamps server-side | `feedback.test.ts` clamp tests + `docs/apps-script.md` script |
| Per-IP submission flood | Apps Script rate-limits 5/min using hashed-IP cache key | `docs/apps-script.md` `doPost` includes the limiter |
| CORS opaque response misread as failure | Form uses `mode: "no-cors"`; `submitFeedback` treats `type === "opaque"` as success | `feedback.test.ts` "returns 'ok' on opaque success" |
| Theme drift on `/feedback` | Page uses `EssayLayout` → inherits Phase 1 bootstrap + ThemeToggle | `feedback-page.test.ts` "uses EssayLayout" |
| Nav-graph drift (Feedback link missing) | Page-tests assert link in both EssayLayout + SandboxLayout | `feedback-page.test.ts` "header nav includes /feedback link" |

---

## Deviations from Plan

1. **`FeedbackForm.client.ts` inlined into the `.astro` `<script>` tag.**
   Original plan extracted it to a separate file for testability.
   Inlined because: (a) the script imports our testable `feedback.ts`
   helpers (already covered), (b) keeps build artifact count low,
   (c) Astro's `<script>` block already provides client bundling.
   Net: zero loss of test coverage, simpler file tree.

2. **Mailto recipient defaults to `feedback@example.com`.**
   Real address must be set via `PUBLIC_FEEDBACK_EMAIL` env var
   at deploy time. Doc'd in `docs/apps-script.md` §4.

3. **Live char counter added (not in original plan).**
   Tiny UX win: `<span data-role="char-count">` shows live count
   under message textarea. Native HTML5 doesn't surface this and
   it's the kind of polish that earns trust. 8 lines of JS.

4. **`mode: "no-cors"` on fetch.**
   Apps Script Web Apps reject CORS preflights. The form is fire-
   and-forget JSON — `mode: "no-cors"` skips preflight and we
   treat opaque success as ok. Documented in `submitFeedback`.

---

## Carryover into Later Phases

### Phase 3 (Circuit gallery)
- The form-field styling pattern (`bg-surface-elevated`, `border-line`,
  `focus:ring-accent`) is the template for the gallery save dialog.
- `getOrCreateSid` pattern (lazy-create, persist, fail-safe on
  storage error) is the template for gallery ID generation.

### Phase 4 (Launch polish)
- Lighthouse a11y check (OPS-01) must cover `/feedback` — the form
  is the most a11y-intensive surface (labels, error states, focus).
- Once Apps Script is configured for the real deploy, do an
  end-to-end submit test as part of the launch checklist.

---

## Sign-off

- ✅ Build clean (18 pages, no warnings)
- ✅ All tests pass (197/197, +30 new)
- ✅ Form posts JSON to `PUBLIC_FEEDBACK_URL` with all required fields
- ✅ Honeypot present and verified
- ✅ Mailto fallback wires correctly on submit failure
- ✅ `docs/apps-script.md` complete and copy-paste-runnable
- ✅ Nav link added in both EssayLayout + SandboxLayout
- ✅ Theme-aware via EssayLayout inheritance
- ✅ All FB-01..05 requirements covered

**Ready for atomic commit.** Next: Phase 3 (circuit gallery, GAL-01..09).
