# Quantum v2.0 — Launch Announcement Draft

**Status:** Draft. Tone matches v1. Replace `<URL>`, `<REPO>` placeholders.

**Posting note:** If v1 deploy is still pending when v2 ships, fold
both into one launch (use the v1 announcement as the lead and append
v2 as "and here's what already changed"). If v1 is already live,
post this as a focused update.

---

## Quantum v2: come back, make it yours, talk back

A few months ago I shipped [Quantum] — seven interactive essays
that teach quantum computing to working developers with real math
running in the browser, no coin-spinning, no animations standing
in for amplitudes. Today I'm shipping **v2.0**, which closes the
three things I most wished v1 had.

**<URL>**

### 1. Dark mode (and a real one)

The whole site now follows your OS theme by default and gives you a
three-state toggle (light / dark / system) in the top-right corner.
Every widget — Bloch spheres, gate buttons, probability bars, the
2D parameter-sweep canvas, the play-your-circuit-as-music sequencer
— re-paints on toggle without a page reload. The Three.js scenes
re-read the live theme tokens and the inline SVG widgets are wired
to CSS variables so the chrome updates instantly.

The bootstrap script runs **before** the stylesheet links, so there
is zero FOUC: the page paints in your chosen theme on the very first
frame, even on slow networks.

What the theme system did NOT touch: categorical encodings stay
categorical. Each gate family on the circuit grid keeps its colour
(Hadamard indigo, Paulis slate, S/T violet, rotations teal, measure
amber) because that's *information*, not aesthetic. Same reason a
periodic table doesn't change the colour of carbon when you flip
to night mode.

### 2. A "my circuits" gallery

The sandbox now has a Save button. Press it, name your circuit,
and it lands at `/gallery` — a local, browser-only, no-account
list of every circuit you've built. Click any card to reopen it
in the sandbox.

Implementation matters here because the v1 promise was "no
backend, no accounts, no tracking" and I wasn't going to break
that for this:

- **Storage is IndexedDB** via [`idb-keyval`], same-origin,
  same-device. Nothing leaves your browser.
- **Schema is versioned.** v1 entries are tagged so future
  migrations are mechanical, not a data-loss event.
- **Export and import are JSON.** Move your gallery across browsers
  or devices with a file. No sync server, no account, no DRM.
- **Safari Private Browsing degrades gracefully.** When IndexedDB
  isn't available, the site falls back to in-memory storage with
  a banner that tells you exactly what's happening. Save still
  works; it just doesn't survive a tab close.
- **Click a card → it loads via URL fragment**, same codec the
  Share button has always used. The gallery is a consumer of the
  existing share format — there is no parallel hydration path,
  which means your saved circuits will keep loading correctly
  for as long as the share URL format does.

### 3. A feedback form (without a backend)

The "tell me what didn't click" ask from v1 used to send people to
GitHub issues, which works for the developer-audience portion of
my readers but loses everyone else. v2 has a `/feedback` page with
a form: pick a feedback type, tell me what you think, optionally
leave an email. It posts to a Google Apps Script endpoint that
appends the message to a spreadsheet I look at every week.

The form has the boring safety bits done right:
- **Honeypot** field invisible to humans, opaque to bots.
- **Per-IP rate limit** server-side (5/min, hashed IPs, no PII).
- **Mailto fallback** if the script is down — your message is
  pre-filled into a `mailto:` link so you don't lose what you typed.
- **No XSS surface on the thanks page** — it's a static page with
  no form data echoed back.

The whole back-end is one Apps Script function (`doPost`) and a
spreadsheet. The setup doc is at `docs/apps-script.md` in the
repo for anyone who wants to do the same thing on their own site.

### What v2 deliberately is NOT

The v1 "no" list still holds:

- **Still no accounts.** Still no login. Still no progress tracking.
- **Still no analytics.** Not even privacy-preserving page-view
  counters. Anonymous, untracked, no cookies.
- **Still no hosted backend** beyond a single Apps Script endpoint
  for feedback messages. The simulator, the gallery, the theme —
  all client-side.
- **Still no algorithm essays past Deutsch.** Teleportation,
  superdense coding, Grover, QFT, Shor — they're coming, but in
  v3 when they earn their keep, not v2.

### Under the hood

Same tech as v1:

- **Astro 4** static site
- **Vanilla TypeScript** for everything
- **Three.js** for 3D, lazy-loaded as before
- **KaTeX** for math
- **`idb-keyval`** added in v2 for the gallery — 600 bytes
- **One Apps Script endpoint** for feedback — no Node, no Docker,
  no managed service

v2 added ~25 KB total across the whole site, distributed across
6 chunks, none of which load on essay routes. Essay readers see the
exact same initial payload as v1: one 4 KB hoisted script per page.
Bundle audit lives at `.planning/phases/04-launch-polish/BUNDLE-AUDIT.md`
in the repo if you want the line-items.

### Tests

247 unit tests now, up from 146 in v1. Coverage:
- Theme runtime + bootstrap
- Feedback form + payload clamping
- Gallery store + schema + migrations + private-browsing fallback
- All v1 simulator / canvas / circuit / fidelity / rotation tests

### Source + roadmap

**<REPO>** — MIT, issues + PRs welcome.

Roadmap and phase plans are all in `.planning/` — you can read
exactly how v2 got designed (`.planning/phases/01-theme` through
`.planning/phases/04-launch-polish`), what got deferred and why
(visual regression harness → v2.1, KaTeX self-host → backlog),
and what's queued for v3 (the actual algorithm essays).

### One ask, same as v1

If you read something and it clicked, or — more usefully — *didn't*
click, tell me. v2 now has a form for it. The whole point of an
interactive essay is that it should be answering your "but wait"
questions within the essay itself; if it's not, I want to know where.

— mukhar

[Quantum]: <URL>
[`idb-keyval`]: https://www.npmjs.com/package/idb-keyval

---

## Variant blurbs

### Hacker News title (≤ 80 chars)

> Quantum v2: dark mode, a local circuit gallery, and a feedback form
> — no backend

### Tweet / Bluesky-length (≤ 280 chars)

> Shipped Quantum v2: a three-state theme toggle, a local-only
> "my circuits" gallery (IndexedDB, no accounts), and a feedback
> form. Still no analytics, still no backend. 247 tests now.
> Read how it works: <URL>

### r/QuantumComputing post

Same body as above, drop the developer-focus framing and lead with
"if you've been using Quantum for the in-browser essays, v2 just
shipped: dark mode and a save-your-circuits gallery."

### r/learnprogramming post

Lead with the dark mode + saving as the QoL story. Bury the
implementation details below the fold.

---

## Launch-day smoke test checklist

Run through these in order before pushing the announcement:

1. Visit `/` in light theme → toggle to dark → reload → confirm
   dark persists with zero flash.
2. Set OS to dark → reload `/` with stored="system" → confirm
   monitor icon shows and dark is applied.
3. Open `/sandbox` → build a 3-gate circuit → click Save → name it →
   confirm dialog closes.
4. Navigate to `/gallery` → confirm card appears with thumbnail.
5. Click the card → confirm `/sandbox` opens with the saved circuit.
6. Rename → duplicate → delete from gallery — confirm UI updates live.
7. Export → import into a fresh browser → confirm round-trip works.
8. Open `/gallery` in Safari Private window → confirm fallback banner
   shows.
9. Open `/feedback` → submit a test message → confirm `/feedback/thanks`
   loads.
10. Check the Apps Script sheet → confirm the test message landed.
11. View source on every new v2 route → confirm no `gallery-*.js`
    or `feedback-*.js` pulled into essay route HTML.

If steps 1-11 pass, ship.

## What if something fails

Hotfix branch named `v2.0.x` for any launch-day regression. Visual
QA scorecard at `.planning/phases/04-launch-polish/VISUAL-QA.md`
is the baseline.
