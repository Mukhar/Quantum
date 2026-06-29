/**
 * Gallery page integration tests — assert the page exists, the save
 * drawer markup is wired into /sandbox, and the gallery nav link is
 * present.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "../..");

describe("Phase 3 — gallery page + sandbox save drawer", () => {
  it("/gallery.astro exists", () => {
    expect(existsSync(resolve(ROOT, "src/pages/gallery.astro"))).toBe(true);
  });

  it("/gallery uses EssayLayout for theme inheritance", () => {
    const src = readFileSync(resolve(ROOT, "src/pages/gallery.astro"), "utf8");
    expect(src).toMatch(/import\s+EssayLayout\s+from/);
  });

  it("/gallery wires loadAll + exportAll + importMany + clear", () => {
    const src = readFileSync(resolve(ROOT, "src/pages/gallery.astro"), "utf8");
    expect(src).toContain("loadAll");
    expect(src).toContain("exportAll");
    expect(src).toContain("importMany");
    expect(src).toContain("clear");
  });

  it("/gallery shows the private-browsing fallback banner", () => {
    const src = readFileSync(resolve(ROOT, "src/pages/gallery.astro"), "utf8");
    expect(src).toContain('data-role="fallback-banner"');
    expect(src).toContain("usingFallback");
  });

  it("/gallery shows a quota warning at 100+ entries", () => {
    const src = readFileSync(resolve(ROOT, "src/pages/gallery.astro"), "utf8");
    expect(src).toContain('data-role="quota-banner"');
    expect(src).toMatch(/100/);
  });

  it("/sandbox has a Save button and a save dialog", () => {
    const src = readFileSync(resolve(ROOT, "src/pages/sandbox/index.astro"), "utf8");
    expect(src).toContain('data-action="save-gallery"');
    expect(src).toContain('data-role="save-dialog"');
  });

  it("/sandbox lazy-loads gallery-save.client (off the critical path)", () => {
    const src = readFileSync(resolve(ROOT, "src/pages/sandbox/index.astro"), "utf8");
    expect(src).toContain("gallery-save.client");
    expect(src).toContain("pointerenter");
  });

  it("/sandbox links to /gallery", () => {
    const src = readFileSync(resolve(ROOT, "src/pages/sandbox/index.astro"), "utf8");
    expect(src).toContain('href="/gallery"');
  });

  it("gallery store file exists", () => {
    expect(existsSync(resolve(ROOT, "src/lib/gallery/store.ts"))).toBe(true);
    expect(existsSync(resolve(ROOT, "src/lib/gallery/schema.ts"))).toBe(true);
    expect(existsSync(resolve(ROOT, "src/lib/gallery/thumbnail.ts"))).toBe(true);
  });

  it("gallery card click opens /sandbox via URL-fragment codec (no parallel path)", () => {
    const src = readFileSync(resolve(ROOT, "src/pages/gallery.astro"), "utf8");
    expect(src).toContain("encodeCircuit");
    expect(src).toContain("/sandbox#");
  });
});
