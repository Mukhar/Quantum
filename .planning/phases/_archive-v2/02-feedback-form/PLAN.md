# Phase 2 — Feedback Form — PLAN

*Created: 2026-06-28 — autonomous mode, post Phase 1 commit.*
*Covers: FB-01, FB-02, FB-03, FB-04, FB-05.*

## Phase Goal

Ship a `/feedback` page that POSTs to a Google Apps Script Web App
which appends rows to a private Google Sheet. Bot-resistant
(honeypot), fail-safe (mailto fallback), theme-aware (Phase 1
foundation), keyboard-operable (Lighthouse a11y ≥95).

**Critical insight:** the Apps Script setup is documentation only
(`docs/apps-script.md`). The site itself is fully testable without
the script existing — we test that the form *posts* the right
payload to *some* URL, configured at build time via env var.

---

## Architecture

```
┌──────────────────┐
│ /feedback        │  vanilla HTML form, native validation
│ (Astro page)     │  POST → import.meta.env.PUBLIC_FEEDBACK_URL
└────────┬─────────┘
         │
         │ JSON payload {type, subject, message, email, page, sid, _hp}
         ▼
┌──────────────────┐
│ Apps Script      │  appendRow → private Sheet
│ Web App URL      │  302 → /feedback/thanks
└──────────────────┘
         │
   network/script
   failure path
         │
         ▼
┌──────────────────┐
│ mailto: fallback │  pre-populated Subject + Body, user's mail client
└──────────────────┘
```

**Config**: `PUBLIC_FEEDBACK_URL` env var (defaults to empty string
in dev → form goes straight to mailto). When unset, page renders a
banner: "Feedback delivery not configured for this preview."

---

## Threat Model

| Threat | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Bot spam fills sheet | High | Med | Honeypot field `_hp` (hidden + `tabindex=-1` + `aria-hidden`); Apps Script drops if non-empty |
| Apps Script URL leak / abuse | Med | Low | Sheet is private to owner; rate-limit hashed IP server-side (5/min, soft cap) |
| Network failure loses message | Med | High | mailto: fallback with pre-populated subject+body; toast tells user "click to send via email instead" |
| Massive payload DOS | Low | Med | Native `maxlength` on textarea (2000) + subject (100); JS clamp before submit |
| XSS via reflected message | Low | Med | Form values never re-rendered on `/thanks`; thanks page is static |
| User submits PII unintentionally | Med | Med | Email field labeled "optional — only if you want a reply"; no other PII captured |
| CSRF | Low | Low | Apps Script is `doPost` only — not authenticated, so no session to forge; receives anonymous POSTs by design |
| Theme breakage on `/feedback` | Med | Low | Use `EssayLayout` to inherit Phase 1 wiring; verify in test |
| Nav-graph drift | High | Low | Update `tests/essays/nav-graph.test.ts` to include `/feedback` in same commit |

---

## Sub-plans

### Plan 02-01 — Form page + theme-aware shell

**Files:**
- `src/pages/feedback/index.astro` (NEW)
- `src/pages/feedback/thanks.astro` (NEW)

**Implementation:**
1. Use `EssayLayout` so theme + ThemeToggle inherit.
2. Fields per design doc:
   - `<select name="type">` — General, Topic suggestion, Feature request, Bug report
   - `<input name="subject" type="text" required maxlength="100">`
   - `<textarea name="message" required maxlength="2000" rows="6">`
   - `<input name="email" type="email">` (optional)
   - `<input name="page" type="hidden">` — set on mount from `document.referrer`
   - `<input name="sid" type="hidden">` — anon UUID from `localStorage["quantum/feedback-sid"]`, generated lazily, never sent if not yet set (just empty)
   - `<input name="_hp" type="text" tabindex="-1" aria-hidden="true" class="sr-only-honeypot">`
3. Use semantic tokens for all styling: `bg-surface-elevated`, `border-line`, `text-ink`, `focus-visible:outline-accent`.
4. Submit button → `bg-accent text-surface hover:bg-accent-emphasis`.
5. Inline `<style>` rule for `.sr-only-honeypot { position:absolute; left:-9999px; }` (screen-reader only).
6. Thanks page: simple "Thanks — your feedback is in our queue." + `<a href="/">Back home</a>` and `<a href="/feedback">Send another</a>`.

**Verify:** `npm run build` — both pages render; navigate to `/feedback` in dev.

---

### Plan 02-02 — Submit handler + honeypot + mailto fallback

**Files:**
- `src/lib/feedback.ts` (NEW) — submit logic + validation + UUID helper
- `src/components/FeedbackForm.client.ts` (NEW) — client-only script that wires the form
- Updates `src/pages/feedback/index.astro` to mount client script

**Implementation:**

`src/lib/feedback.ts`:
```ts
export interface FeedbackPayload {
  type: string;
  subject: string;
  message: string;
  email: string;
  page: string;
  sid: string;
  _hp: string;
}

export function buildMailto(p: FeedbackPayload, to: string): string {
  const subject = encodeURIComponent(`[Quantum] ${p.type}: ${p.subject}`);
  const body = encodeURIComponent(
    `${p.message}\n\n---\nPage: ${p.page}\nFrom: ${p.email || "anonymous"}\n`,
  );
  return `mailto:${to}?subject=${subject}&body=${body}`;
}

export function getOrCreateSid(): string {
  try {
    const KEY = "quantum/feedback-sid";
    let v = localStorage.getItem(KEY);
    if (!v) {
      v = crypto.randomUUID();
      localStorage.setItem(KEY, v);
    }
    return v;
  } catch { return ""; }
}

export function isHoneypotTriggered(p: FeedbackPayload): boolean {
  return p._hp.trim().length > 0;
}

export async function submitFeedback(p: FeedbackPayload, endpoint: string): Promise<"ok" | "fail" | "spam" | "noop"> {
  if (isHoneypotTriggered(p)) return "spam";  // silently drop
  if (!endpoint) return "noop";                 // not configured
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(p),
      redirect: "follow",
    });
    return res.ok ? "ok" : "fail";
  } catch { return "fail"; }
}
```

`FeedbackForm.client.ts`: on form submit, prevent default, build payload, call `submitFeedback`:
- `ok` → `location.href = "/feedback/thanks"`
- `spam` → silently `location.href = "/feedback/thanks"` (don't tip off the bot)
- `fail` or `noop` → show inline error banner with "Send via email instead →" button that triggers `location.href = buildMailto(p, MAILTO_TO)`
- Disable submit button + show spinner while in-flight

**Constants** at top of script:
- `ENDPOINT = import.meta.env.PUBLIC_FEEDBACK_URL ?? ""`
- `MAILTO_TO = "feedback@example.com"` — TODO: read from `PUBLIC_FEEDBACK_EMAIL` env

**Verify:** unit tests for `buildMailto`, `getOrCreateSid`, `isHoneypotTriggered`, `submitFeedback` (mocked fetch).

---

### Plan 02-03 — Nav link + nav-graph test update

**Files:**
- `src/layouts/EssayLayout.astro` — add `/feedback` to header nav
- `src/layouts/SandboxLayout.astro` — same
- `tests/essays/nav-graph.test.ts` — extend to assert `/feedback` link presence

**Implementation:**
- Header nav: small text link "Feedback" next to ThemeToggle.
- Nav-graph test: add `/feedback` to the expected route set, assert the link exists on every essay page.

**Verify:** `npm test` — nav-graph still passes after update.

---

### Plan 02-04 — Apps Script setup doc

**File:**
- `docs/apps-script.md` (NEW)

**Content:**
- One-time 10-min setup walkthrough:
  1. Create new Sheet → name it "Quantum Feedback"
  2. Extensions → Apps Script
  3. Paste `doPost` script (provided verbatim in doc):
     ```js
     function doPost(e) {
       const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
       const data = JSON.parse(e.postData.contents);
       if (data._hp) return ContentService.createTextOutput("ok"); // silent drop
       // soft rate limit by hashed IP
       const ip = e.parameter._ip || "unknown";
       const cache = CacheService.getScriptCache();
       const key = "rl_" + Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, ip).map(b => (b<0?b+256:b).toString(16).padStart(2,"0")).join("");
       const count = parseInt(cache.get(key) || "0", 10);
       if (count >= 5) return ContentService.createTextOutput("rate-limited");
       cache.put(key, String(count + 1), 60);
       sheet.appendRow([new Date(), data.type, data.subject, data.message, data.email, data.page, data.sid]);
       return ContentService.createTextOutput("ok");
     }
     ```
  4. Deploy → Web app → Execute as: Me → Who has access: Anyone
  5. Copy the Web App URL
  6. Set `PUBLIC_FEEDBACK_URL` in deployment env (or `.env.production`)
- Mention: sheet stays private to owner; only the script URL is public.
- Mention: to rotate, redeploy as new version and update env var.

---

### Plan 02-05 — Tests

**Files:**
- `tests/feedback/feedback.test.ts` (NEW)

**Coverage:**
- `buildMailto` — encodes subject + body correctly, handles missing email
- `getOrCreateSid` — generates UUID on first call, returns same UUID on subsequent calls, returns empty when storage throws
- `isHoneypotTriggered` — true when `_hp` non-empty, false when empty/whitespace
- `submitFeedback` — mocked fetch:
  - returns `"ok"` on 200
  - returns `"fail"` on 500
  - returns `"fail"` on network throw
  - returns `"spam"` when honeypot triggered (no fetch call)
  - returns `"noop"` when endpoint is empty (no fetch call)

Plus extend `nav-graph.test.ts` to assert `/feedback` is reachable from every essay.

---

## Implementation Order

1. **Plan 02-04** (docs) first — pure documentation, no risk.
2. **Plan 02-01** (form pages) — visible immediately.
3. **Plan 02-02** (submit handler) — requires 02-01 to wire.
4. **Plan 02-03** (nav) — requires 02-01 to link to.
5. **Plan 02-05** (tests) — locks the behaviour.

Each plan = one atomic commit (or grouped if logically coherent).

---

## Acceptance Criteria

- [ ] `/feedback` page builds and renders with theme-aware styling
- [ ] `/feedback/thanks` page builds and renders
- [ ] Form submits to `PUBLIC_FEEDBACK_URL` via fetch with correct JSON payload
- [ ] Honeypot field present, hidden from sighted users, drops bot submissions
- [ ] mailto fallback opens with pre-populated subject + body on submit failure
- [ ] `docs/apps-script.md` complete with copy-paste-ready script
- [ ] Header link "Feedback" added to nav, theme-aware
- [ ] `nav-graph.test.ts` updated to cover new route
- [ ] `feedback.test.ts` covers buildMailto, getOrCreateSid, isHoneypotTriggered, submitFeedback (all paths)
- [ ] All existing 167 tests still pass
- [ ] Build clean (16+1+1 = 18 pages)

## Carryover

- Phase 3: gallery save dialog will reuse `bg-surface-elevated` + `border-line` patterns established here.
- Phase 4: Lighthouse a11y ≥ 95 check (OPS-01) will exercise `/feedback`.
