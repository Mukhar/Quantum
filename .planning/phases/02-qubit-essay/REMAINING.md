# Phase 2 — Remaining Work

These two sub-tasks from Plan 02-06 require human action and cannot be
done by an autonomous agent. Everything else in Phase 2 is shipped.

## 1. Deploy to a public static host

The site builds cleanly to `./dist` via `npm run build` (2 routes, ~137
KB gzipped on `/qubit`, 4.78 KB main bundle).

Pick one of:

- **Cloudflare Pages** (recommended — free, fast, edge-cached, no
  account juggling): `npx wrangler pages deploy ./dist --project-name
  quantum`
- **Netlify**: `npx netlify deploy --dir=dist --prod` (after `netlify
  init`).
- **GitHub Pages**: enable Pages on the repo, then commit `./dist` to
  a `gh-pages` branch via `gh-pages` package or a GitHub Action.

Pick the host, deploy, and log the URL + decision rationale to
`.planning/PROJECT.md` (Key Decisions section).

## 2. Run the feedback round

Send the deployed URL to >= 3 working dev friends with the explicit ask:

> 1. Read the essay.
> 2. Play with the widgets for 5 minutes.
> 3. Tell me one thing that clicked and one thing that didn't.

Capture responses in `docs/feedback/m1-round1.md` with this template:

```markdown
# M1 Feedback Round 1

## Reader A — <name/initials>, <role>
- Clicked: ...
- Didn't: ...
- Notable quote: ...

## Reader B
...

## Reader C
...

## Edits made
- <change>: <which reader prompted it>
- ...
```

After at least one substantive iteration on the feedback, mark Phase 2
fully complete in `.planning/ROADMAP.md` and bump `STATE.md`.

## Optional: Lighthouse pass

The plan also asked for a Lighthouse report committed to
`docs/perf/m1-lighthouse.html`. We've measured bundle weight (under
budget); the formal LCP / a11y run against a deployed URL is the next
step. After deploy:

```bash
npx lighthouse <DEPLOYED_URL>/qubit \
  --output html --output-path docs/perf/m1-lighthouse.html \
  --throttling.cpuSlowdownMultiplier=4 \
  --preset=mobile
```

Target thresholds (from the plan):
- LCP < 2s on simulated 4G mid-range phone
- Accessibility >= 95
- JS payload documented (currently ~137 KB gzipped on /qubit)
