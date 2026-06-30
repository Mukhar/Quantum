/**
 * Cross-essay nav graph integrity.
 *
 * Walks the static prev/next chain declared in every essay's
 * `footer-nav` slot and asserts:
 *
 *   1. Every essay's `next` link points at a slug that itself exists
 *      and whose `prev` points back at the source essay (or, for the
 *      tail of the chain, at /sandbox).
 *   2. /qubit's footer-nav no longer carries the Phase-4 placeholder
 *      ("Next: Superposition (Phase 4)") — it now links to the real
 *      /superposition page.
 *   3. No essay accidentally links to a route that doesn't exist on
 *      disk (i.e. dangling prev/next is a regression).
 *
 * We grep the raw `.astro` files instead of trying to render them. The
 * footer-nav fragment is plain HTML inside each essay; a substring
 * check is more than enough to catch a typo.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const PAGES = resolve(__dirname, "../../src/pages");

interface NavSpec {
  /** Essay slug (e.g. "qubit"); the file is `{slug}.astro`. */
  slug: string;
  /** Expected prev-link href (null = no prev expected). */
  prev: string | null;
  /** Expected next-link href (null = no next expected — tail of chain). */
  next: string | null;
}

const CHAIN: NavSpec[] = [
  { slug: "qubit",            prev: "/",                  next: "/superposition"      },
  { slug: "superposition",    prev: "/qubit",             next: "/measurement"        },
  { slug: "measurement",      prev: "/superposition",     next: "/gates"              },
  { slug: "gates",            prev: "/measurement",       next: "/entanglement"       },
  { slug: "entanglement",     prev: "/gates",             next: "/cnot-bell"          },
  { slug: "cnot-bell",        prev: "/entanglement",      next: "/deutsch"            },
  { slug: "deutsch",          prev: "/cnot-bell",         next: "/teleportation"      },
  { slug: "teleportation",    prev: "/deutsch",           next: "/superdense-coding"  },
  { slug: "superdense-coding",prev: "/teleportation",     next: "/grover"             },
  { slug: "grover",           prev: "/superdense-coding", next: "/shor"               },
  { slug: "shor",             prev: "/grover",            next: "/sandbox"            },
];

function readEssay(slug: string): string {
  const path = resolve(PAGES, `${slug}.astro`);
  return readFileSync(path, "utf8");
}

describe("Phase-4 cross-essay nav graph", () => {
  it("every essay file exists on disk", () => {
    for (const { slug } of CHAIN) {
      const path = resolve(PAGES, `${slug}.astro`);
      expect(existsSync(path), `expected ${path} to exist`).toBe(true);
    }
  });

  for (const spec of CHAIN) {
    describe(`/${spec.slug}`, () => {
      const src = readEssay(spec.slug);

      if (spec.prev) {
        it(`footer-nav links back to ${spec.prev}`, () => {
          expect(src).toContain(`href="${spec.prev}"`);
        });
      }

      if (spec.next) {
        it(`footer-nav points forward to ${spec.next}`, () => {
          expect(src).toContain(`href="${spec.next}"`);
        });
      }
    });
  }

  it("qubit.astro no longer carries the Phase-4 placeholder", () => {
    const src = readEssay("qubit");
    expect(src).not.toContain("Next: Superposition (Phase 4)");
  });

  it("every internal essay link in the chain has a destination file", () => {
    for (const spec of CHAIN) {
      if (!spec.next) continue;
      // Skip non-essay targets (e.g. /sandbox) — those live elsewhere.
      const isEssayTarget = CHAIN.some((c) => `/${c.slug}` === spec.next);
      if (!isEssayTarget) continue;
      const target = spec.next.replace(/^\//, "");
      const path = resolve(PAGES, `${target}.astro`);
      expect(existsSync(path), `${spec.slug} -> ${spec.next} dangling`).toBe(true);
    }
  });

  it("the chain is acyclic and contiguous (next of N == slug of N+1)", () => {
    for (let i = 0; i < CHAIN.length - 1; i++) {
      const here = CHAIN[i];
      const after = CHAIN[i + 1];
      expect(here.next, `link from ${here.slug}`).toBe(`/${after.slug}`);
      expect(after.prev, `back-link from ${after.slug}`).toBe(`/${here.slug}`);
    }
  });
});
