/**
 * Sitemap endpoint.
 *
 * Astro server-rendered endpoint that emits the v1 sitemap. We do this
 * dynamically (rather than checking in a static sitemap.xml) so the
 * route list can't drift from `src/pages/` without us noticing — the
 * route table here is the single source of truth.
 *
 * Note on absolute URLs: we don't have a live URL yet (no deployment
 * in Phase 5). Sitemap entries use site-relative paths; once a deploy
 * URL exists, set the `SITE_URL` env var (or hardcode the canonical
 * origin here) and re-emit.
 */

import type { APIRoute } from "astro";

const SITE_URL = import.meta.env.SITE_URL ?? "";

interface SitemapEntry {
  path: string;
  /** ISO 8601 date string for <lastmod>. */
  lastmod?: string;
  /** 0.0–1.0, relative priority. Defaults vary by tier. */
  priority?: number;
}

// Single source of truth for the v1 route list. Mirrors src/pages/.
// When new routes land, add them here AND to ConceptMap.astro.
const ROUTES: SitemapEntry[] = [
  { path: "/",                            priority: 1.0  },
  { path: "/qubit",                       priority: 0.95 },
  { path: "/superposition",               priority: 0.9  },
  { path: "/measurement",                 priority: 0.9  },
  { path: "/gates",                       priority: 0.9  },
  { path: "/entanglement",                priority: 0.9  },
  { path: "/cnot-bell",                   priority: 0.9  },
  { path: "/deutsch",                     priority: 0.9  },
  { path: "/sandbox",                     priority: 0.85 },
  { path: "/sandbox/challenges",          priority: 0.8  },
  { path: "/sandbox/challenges/flip",     priority: 0.6  },
  { path: "/sandbox/challenges/plus",     priority: 0.6  },
  { path: "/sandbox/challenges/rotate-pi-3", priority: 0.6 },
  { path: "/sandbox/challenges/bell",     priority: 0.6  },
  { path: "/sandbox/challenges/ghz",      priority: 0.6  },
];

export const GET: APIRoute = () => {
  const today = new Date().toISOString().slice(0, 10);

  const urls = ROUTES.map((r) => {
    const loc = `${SITE_URL}${r.path}`;
    const priority = r.priority ?? 0.5;
    return [
      "  <url>",
      `    <loc>${loc}</loc>`,
      `    <lastmod>${r.lastmod ?? today}</lastmod>`,
      `    <priority>${priority.toFixed(2)}</priority>`,
      "  </url>",
    ].join("\n");
  }).join("\n");

  const body = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    urls,
    `</urlset>`,
    ``,
  ].join("\n");

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
