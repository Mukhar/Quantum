# Apps Script setup for the Quantum feedback form

*One-time, ~10 minutes. Done once per deployment. Free forever, no
submission cap, sheet data stays private to you.*

This is the **server side** for `src/pages/feedback/index.astro`.
The form POSTs JSON to a Google Apps Script Web App URL, which
appends a row to a private Google Sheet you own.

---

## 1 · Create the Sheet

1. Go to [sheets.new](https://sheets.new) (creates a blank Sheet).
2. Rename it **`Quantum Feedback`** so it's easy to find later.
3. Add a header row in row 1 (optional but recommended):

   | A | B | C | D | E | F | G |
   |---|---|---|---|---|---|---|
   | Timestamp | Type | Subject | Message | Email | Page | Session ID |

---

## 2 · Open Apps Script

In the Sheet: **Extensions → Apps Script**. A new tab opens with
`Code.gs` containing a stub `myFunction()`. **Delete everything**
and paste the script below.

```js
/**
 * Quantum feedback endpoint.
 * Appends one row per submission to the active Sheet.
 * - Drops bot submissions silently (honeypot)
 * - Soft rate limit: 5 submissions per minute per hashed IP
 * - Returns plain "ok" / "rate-limited" text (the form runs in
 *   no-cors mode and treats opaque success as ok)
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    // Honeypot — non-empty _hp means bot. Pretend success.
    if (data._hp && String(data._hp).trim().length > 0) {
      return ContentService.createTextOutput("ok");
    }

    // Soft per-IP rate limit (5 submissions / minute)
    const ip = e.parameter._ip || (e.headers && e.headers["X-Forwarded-For"]) || "unknown";
    const cache = CacheService.getScriptCache();
    const digest = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      String(ip),
    );
    const key = "rl_" + digest
      .map(function (b) { return (b < 0 ? b + 256 : b).toString(16).padStart(2, "0"); })
      .join("")
      .slice(0, 16);
    const count = parseInt(cache.get(key) || "0", 10);
    if (count >= 5) {
      return ContentService.createTextOutput("rate-limited");
    }
    cache.put(key, String(count + 1), 60); // 60-second TTL

    // Clamp lengths defensively even though the form already does
    const subject = String(data.subject || "").slice(0, 100);
    const message = String(data.message || "").slice(0, 2000);
    const email   = String(data.email || "").slice(0, 200);

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    sheet.appendRow([
      new Date(),
      String(data.type || "general"),
      subject,
      message,
      email,
      String(data.page || ""),
      String(data.sid || ""),
    ]);

    return ContentService.createTextOutput("ok");
  } catch (err) {
    console.error(err);
    return ContentService.createTextOutput("error");
  }
}
```

Save the project (⌘S / Ctrl+S). Give it a sensible name like
**`Quantum Feedback Endpoint`** when prompted.

---

## 3 · Deploy as a Web App

1. Click **Deploy → New deployment** (top right).
2. Type: **Web app** (click the gear icon if you don't see it).
3. Description: `v1`
4. **Execute as:** *Me (your-email@gmail.com)*
5. **Who has access:** *Anyone* — required so the form can POST without auth.
6. Click **Deploy**.
7. Authorize when prompted. (You'll see a "Google hasn't verified
   this app" screen — click **Advanced → Go to … (unsafe)**. This
   is normal for personal scripts.)
8. **Copy the Web app URL.** It looks like:
   ```
   https://script.google.com/macros/s/AKfycb…/exec
   ```

---

## 4 · Wire the URL into the site

Set the URL as an env var at build time. For local dev, create
`.env.local`:

```bash
PUBLIC_FEEDBACK_URL=https://script.google.com/macros/s/AKfycb…/exec
PUBLIC_FEEDBACK_EMAIL=you@example.com
```

For production deploy (Netlify, Vercel, Cloudflare Pages, etc.),
add the same two variables in the dashboard's env-var section.

The `PUBLIC_` prefix is **required** — Astro only exposes env vars
that start with `PUBLIC_` to the client bundle. (See
[Astro env docs](https://docs.astro.build/en/guides/environment-variables/).)

`PUBLIC_FEEDBACK_EMAIL` is the address used by the mailto-fallback
when the Apps Script POST fails (network down, script removed, etc.).

If neither var is set, the form still renders — it shows a
"preview build, feedback delivery not configured" banner and goes
straight to mailto on submit.

---

## 5 · Rotate / redeploy

To update the script (bug fix, new behaviour, etc.):

1. Make changes in Apps Script.
2. **Deploy → Manage deployments → ✏️ edit your active deployment**.
3. Bump the **Version** dropdown to "New version".
4. Click **Deploy** — *the URL stays the same.*

To rotate the URL (e.g. after suspected abuse):

1. **Deploy → Manage deployments → Archive** the old one.
2. **Deploy → New deployment** — get a fresh URL.
3. Update `PUBLIC_FEEDBACK_URL` in your env and redeploy the site.

---

## 6 · Verify end-to-end

After deploying both sides:

1. Visit `/feedback` on the live site.
2. Fill the form, submit.
3. Browser should redirect to `/feedback/thanks`.
4. Open your Sheet — a new row should appear within seconds.

If nothing lands in the Sheet, check:

- The Apps Script editor's **Executions** tab (bottom left) for errors.
- That **Who has access** = **Anyone** (not "Anyone with Google account").
- That you authorized the script (re-run step 3 if needed).
- That `PUBLIC_FEEDBACK_URL` is set in your production build env.

---

## Data hygiene

- The Sheet stays **private to you** — only the script URL is public.
- The script never logs message contents (only errors).
- Cache entries (rate-limit counters) auto-expire after 60s.
- To purge old feedback, just delete rows from the Sheet — no
  cascading state to clean up.
- No PII is collected by the form itself; users only volunteer
  email if they want a reply.

---

## Threat model recap

| Risk | Mitigation |
|---|---|
| Bot spam | Honeypot `_hp` field; silent drop |
| Submission flood | Per-IP rate limit, 5/min, 60s window |
| Script URL leak | URL alone gives no write access to Sheet — only POSTs through `doPost` |
| Long-message DOS | Defensive `slice(0, N)` on subject/message/email server-side |
| Sheet exfiltration | Sheet is private; no `doGet` handler, so URL-only callers can't read |
| Stale deployments | Archive + new-deploy rotation, ~30s to switch |
