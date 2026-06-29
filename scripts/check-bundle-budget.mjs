#!/usr/bin/env node
// Per-route bundle-size CI gate (OPS-04).
//
// Reads `bundle-budget.json` from the repo root, walks `dist/**/*.html`
// from the most recent `astro build`, sums gzipped bytes of every
// `<script src="/_astro/...">` referenced per route, and fails (exit 1)
// when any tracked route exceeds its ceiling. Un-budgeted routes
// produce a warning but do not fail the build — they get a ceiling
// assigned on the next commit.
//
// Modes:
//   node scripts/check-bundle-budget.mjs            → enforce ceilings
//   node scripts/check-bundle-budget.mjs --report   → print actuals only,
//                                                     no comparison,
//                                                     suggest ceilings
//                                                     (actual * 1.2,
//                                                     rounded up to KB)
//
// Wired into `npm run check:bundle` and `npm test` (via `pretest`).
// Run after `npm run build`; the script does NOT trigger the build
// itself so the same script works in CI where build + check are
// separate stages.

import { readFile, readdir, stat } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, resolve, sep } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const DIST_DIR = join(REPO_ROOT, "dist");
const BUDGET_PATH = join(REPO_ROOT, "bundle-budget.json");

const REPORT_MODE = process.argv.includes("--report");
const SCRIPT_SRC_RE = /<script[^>]+src="([^"]+)"/g;

const KB = 1024;
const HEADROOM = 1.2;

const fmtKB = (bytes) => (bytes / KB).toFixed(1);

async function ensureDistExists() {
  try {
    const s = await stat(DIST_DIR);
    if (!s.isDirectory()) throw new Error("dist is not a directory");
  } catch (err) {
    console.error(
      `\u2717 dist/ not found. Run \`npm run build\` before \`npm run check:bundle\`.\n  (${err.message})`,
    );
    process.exit(1);
  }
}

async function readBudget() {
  if (REPORT_MODE) return { routes: {} };
  try {
    const raw = await readFile(BUDGET_PATH, "utf8");
    const parsed = JSON.parse(raw);
    if (parsed.version !== 1 || typeof parsed.routes !== "object") {
      throw new Error("bundle-budget.json: bad shape (expected version 1 + routes object)");
    }
    return parsed;
  } catch (err) {
    console.error(`\u2717 Couldn't read bundle-budget.json: ${err.message}`);
    process.exit(1);
  }
}

async function walkHtml(dir) {
  const out = [];
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!entry.name.endsWith(".html")) continue;
    // Node 22's recursive readdir gives `parentPath` (Node 22.4+) or
    // `path` (older 22.x). Tolerate both.
    const parent = entry.parentPath ?? entry.path ?? dir;
    out.push(join(parent, entry.name));
  }
  return out;
}

/**
 * Map dist/foo/bar/index.html → "foo/bar"
 *     dist/index.html         → "index"
 *     dist/sitemap.xml        → null  (not an HTML route)
 */
function routeKey(htmlPath) {
  const rel = relative(DIST_DIR, htmlPath).split(sep).join("/");
  if (rel === "index.html") return "index";
  if (rel.endsWith("/index.html")) return rel.slice(0, -"/index.html".length);
  if (rel.endsWith(".html")) return rel.slice(0, -".html".length);
  return null;
}

async function gzippedSize(jsPath) {
  const buf = await readFile(jsPath);
  return gzipSync(buf).length;
}

async function measureRoute(htmlPath, cache) {
  const html = await readFile(htmlPath, "utf8");
  let total = 0;
  for (const match of html.matchAll(SCRIPT_SRC_RE)) {
    const src = match[1];
    if (!src.startsWith("/_astro/")) continue; // skip external / inline
    const jsPath = join(DIST_DIR, src.slice(1)); // strip leading "/"
    if (!cache.has(jsPath)) {
      try {
        cache.set(jsPath, await gzippedSize(jsPath));
      } catch (err) {
        console.warn(`  ! couldn't read ${src}: ${err.message}`);
        cache.set(jsPath, 0);
      }
    }
    total += cache.get(jsPath);
  }
  return total;
}

function suggestCeiling(actual) {
  return Math.max(KB, Math.ceil((actual * HEADROOM) / KB) * KB);
}

async function main() {
  await ensureDistExists();
  const budget = await readBudget();
  const htmlFiles = await walkHtml(DIST_DIR);
  if (htmlFiles.length === 0) {
    console.error("\u2717 No HTML files under dist/. Did the build succeed?");
    process.exit(1);
  }

  const gzipCache = new Map();
  const routes = new Map(); // route -> actual bytes
  for (const html of htmlFiles) {
    const key = routeKey(html);
    if (!key) continue;
    const bytes = await measureRoute(html, gzipCache);
    // If two HTML files map to the same key (shouldn't happen with
    // Astro's output mode), prefer the largest.
    routes.set(key, Math.max(routes.get(key) ?? 0, bytes));
  }

  const rows = [];
  const overages = [];
  const unbudgeted = [];

  for (const [route, actual] of [...routes].sort(([a], [b]) => a.localeCompare(b))) {
    const ceiling = budget.routes?.[route];
    if (REPORT_MODE) {
      rows.push({
        route,
        actual_kb: fmtKB(actual),
        suggested_ceiling_kb: fmtKB(suggestCeiling(actual)),
        suggested_ceiling_bytes: suggestCeiling(actual),
      });
      continue;
    }
    if (ceiling === undefined) {
      unbudgeted.push({ route, actual_kb: fmtKB(actual), suggested_ceiling_kb: fmtKB(suggestCeiling(actual)) });
      continue;
    }
    const delta = actual - ceiling;
    const status = delta <= 0 ? "OK" : "OVER";
    rows.push({
      route,
      actual_kb: fmtKB(actual),
      ceiling_kb: fmtKB(ceiling),
      delta_kb: (delta >= 0 ? "+" : "") + fmtKB(delta),
      status,
    });
    if (delta > 0) overages.push({ route, actual, ceiling, delta });
  }

  // For unfamiliar routes in the manifest that the build didn't emit,
  // warn so stale entries get cleaned up.
  const stale = [];
  if (!REPORT_MODE) {
    for (const route of Object.keys(budget.routes ?? {})) {
      if (!routes.has(route)) stale.push(route);
    }
  }

  console.log(REPORT_MODE ? "Bundle sizes (report mode):" : "Bundle budget check:");
  console.table(rows);

  if (unbudgeted.length > 0) {
    console.warn(
      `\n! ${unbudgeted.length} route(s) have no entry in bundle-budget.json — add ceilings before the next CI run:`,
    );
    console.table(unbudgeted);
  }
  if (stale.length > 0) {
    console.warn(
      `\n! ${stale.length} route(s) in bundle-budget.json are no longer in dist/: ${stale.join(", ")}`,
    );
  }

  if (overages.length > 0) {
    console.error(`\n\u2717 Bundle budget exceeded by ${overages.length} route(s):`);
    for (const o of overages) {
      console.error(
        `    /${o.route.padEnd(30)} ${fmtKB(o.actual).padStart(7)} KB  >  ceiling ${fmtKB(o.ceiling).padStart(7)} KB  (+${fmtKB(o.delta)} KB)`,
      );
    }
    console.error(
      "\n  Either:\n    - Trim the diff that introduced the regression, OR\n    - Update bundle-budget.json ceilings explicitly in the same commit.",
    );
    process.exit(1);
  }

  console.log(
    REPORT_MODE
      ? `\nReport-only run; no comparison performed. Suggested ceilings = ceil(actual × ${HEADROOM} / KB) * KB.`
      : `\n\u2713 All ${rows.length} tracked route(s) within budget.`,
  );
}

main().catch((err) => {
  console.error("\u2717 check-bundle-budget crashed:", err);
  process.exit(1);
});
