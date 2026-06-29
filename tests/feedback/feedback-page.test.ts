/**
 * Phase 2 — every essay/sandbox layout exposes a Feedback link in its
 * header nav, so users on any page can submit feedback in one click.
 *
 * We grep the layout source files instead of rendering — the link is
 * static markup and substring checks are sufficient.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "../..");

describe("Phase 2 — feedback nav link", () => {
  it("/feedback/index.astro exists", () => {
    expect(existsSync(resolve(ROOT, "src/pages/feedback/index.astro"))).toBe(true);
  });

  it("/feedback/thanks.astro exists", () => {
    expect(existsSync(resolve(ROOT, "src/pages/feedback/thanks.astro"))).toBe(true);
  });

  it("EssayLayout header nav includes /feedback link", () => {
    const src = readFileSync(resolve(ROOT, "src/layouts/EssayLayout.astro"), "utf8");
    expect(src).toContain('href="/feedback"');
  });

  it("SandboxLayout header nav includes /feedback link", () => {
    const src = readFileSync(resolve(ROOT, "src/layouts/SandboxLayout.astro"), "utf8");
    expect(src).toContain('href="/feedback"');
  });

  it("feedback form uses EssayLayout (theme-aware via Phase 1)", () => {
    const src = readFileSync(resolve(ROOT, "src/pages/feedback/index.astro"), "utf8");
    expect(src).toMatch(/import\s+EssayLayout\s+from/);
  });

  it("feedback form includes a honeypot field named _hp", () => {
    const src = readFileSync(resolve(ROOT, "src/pages/feedback/index.astro"), "utf8");
    expect(src).toContain('name="_hp"');
  });

  it("feedback form references PUBLIC_FEEDBACK_URL env var", () => {
    const src = readFileSync(resolve(ROOT, "src/pages/feedback/index.astro"), "utf8");
    expect(src).toContain("PUBLIC_FEEDBACK_URL");
  });

  it("feedback form has all required fields: type, subject, message, email", () => {
    const src = readFileSync(resolve(ROOT, "src/pages/feedback/index.astro"), "utf8");
    expect(src).toContain('name="type"');
    expect(src).toContain('name="subject"');
    expect(src).toContain('name="message"');
    expect(src).toContain('name="email"');
  });

  it("docs/apps-script.md exists with Web App setup instructions", () => {
    const path = resolve(ROOT, "docs/apps-script.md");
    expect(existsSync(path)).toBe(true);
    const src = readFileSync(path, "utf8");
    expect(src).toMatch(/Apps Script/i);
    expect(src).toMatch(/doPost/);
    expect(src).toContain("PUBLIC_FEEDBACK_URL");
  });
});
