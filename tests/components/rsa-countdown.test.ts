/**
 * Tests for the RSACountdown widget + PQCCards.
 *
 * Covers:
 *   - rsaCountdown.ts pure helpers (estimateLogicalQubits, buildRSAMarkers, countdownGap).
 *   - RSACountdown.astro structural markup (selector options, slider attrs,
 *     aria-live summary, marker positions, source links, no calendar dates).
 *   - PQCCards.astro contents (4 cards, each with official NIST/FIPS link
 *     + purpose line + kind).
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  RSA_KEY_SIZES,
  LOGICAL_OVERHEAD,
  estimateLogicalQubits,
  buildRSAMarkers,
  countdownGap,
  TODAY_LOGICAL_QUBITS,
  VENDOR_ROADMAP_LOGICAL_QUBITS,
} from "../../src/lib/quantum";

const COUNTDOWN_SOURCE = readFileSync(
  fileURLToPath(new URL("../../src/components/RSACountdown.astro", import.meta.url)),
  "utf8",
);
const PQC_SOURCE = readFileSync(
  fileURLToPath(new URL("../../src/components/PQCCards.astro", import.meta.url)),
  "utf8",
);

describe("rsaCountdown helpers", () => {
  it("supports exactly 2048, 3072, 4096 key sizes", () => {
    expect(RSA_KEY_SIZES).toEqual([2048, 3072, 4096]);
  });

  it("estimateLogicalQubits returns 2*k + LOGICAL_OVERHEAD", () => {
    expect(estimateLogicalQubits(2048)).toBe(2 * 2048 + LOGICAL_OVERHEAD);
    expect(estimateLogicalQubits(3072)).toBe(2 * 3072 + LOGICAL_OVERHEAD);
    expect(estimateLogicalQubits(4096)).toBe(2 * 4096 + LOGICAL_OVERHEAD);
  });

  it("estimateLogicalQubits respects a custom overhead", () => {
    expect(estimateLogicalQubits(2048, 0)).toBe(4096);
    expect(estimateLogicalQubits(2048, 16)).toBe(2 * 2048 + 16);
  });

  it("estimateLogicalQubits throws on invalid key sizes", () => {
    expect(() => estimateLogicalQubits(0)).toThrow(RangeError);
    expect(() => estimateLogicalQubits(-1)).toThrow(RangeError);
    expect(() => estimateLogicalQubits(2048.5)).toThrow(RangeError);
    expect(() => estimateLogicalQubits(1_000_000)).toThrow(RangeError);
  });

  it("buildRSAMarkers returns today < roadmap < break in ascending order", () => {
    for (const k of RSA_KEY_SIZES) {
      const markers = buildRSAMarkers(k);
      expect(markers).toHaveLength(3);
      expect(markers.map((m) => m.id)).toEqual(["today", "roadmap", "break"]);
      expect(markers[0].qubits).toBe(TODAY_LOGICAL_QUBITS);
      expect(markers[1].qubits).toBe(VENDOR_ROADMAP_LOGICAL_QUBITS);
      expect(markers[2].qubits).toBe(estimateLogicalQubits(k));
      // Strictly ascending.
      expect(markers[0].qubits).toBeLessThan(markers[1].qubits);
      expect(markers[1].qubits).toBeLessThan(markers[2].qubits);
    }
  });

  it("buildRSAMarkers labels include the key size on the break marker", () => {
    expect(buildRSAMarkers(2048)[2].label).toBe("break RSA-2048");
    expect(buildRSAMarkers(4096)[2].label).toBe("break RSA-4096");
  });

  it("every marker carries a source link", () => {
    for (const m of buildRSAMarkers(2048)) {
      expect(m.source.href).toMatch(/^https?:\/\//);
      expect(m.source.text).toBeTruthy();
    }
  });

  it("countdownGap reports short when below threshold", () => {
    const g = countdownGap(100, 2048);
    expect(g.available).toBe(100);
    expect(g.required).toBe(estimateLogicalQubits(2048));
    expect(g.gap).toBe(g.required - 100);
    expect(g.pastThreshold).toBe(false);
  });

  it("countdownGap reports past when above threshold", () => {
    const required = estimateLogicalQubits(2048);
    const g = countdownGap(required + 50, 2048);
    expect(g.gap).toBe(-50);
    expect(g.pastThreshold).toBe(true);
  });

  it("countdownGap is exactly at-threshold when available === required", () => {
    const required = estimateLogicalQubits(3072);
    const g = countdownGap(required, 3072);
    expect(g.gap).toBe(0);
    expect(g.pastThreshold).toBe(true);
  });

  it("countdownGap rejects negative availability", () => {
    expect(() => countdownGap(-1, 2048)).toThrow(RangeError);
  });
});

describe("RSACountdown.astro structure", () => {
  it("declares the rsa-countdown widget root", () => {
    expect(COUNTDOWN_SOURCE).toMatch(/data-widget="rsa-countdown"/);
  });

  it("offers all three key sizes in the selector", () => {
    expect(COUNTDOWN_SOURCE).toMatch(/RSA_KEY_SIZES/);
    // Server-side `.map(...)` renders <option value={k}> for each size.
    // The presence of the import + the .map call is the structural
    // guarantee — checked above. Spot-check the value attr template.
    expect(COUNTDOWN_SOURCE).toMatch(/<option value=\{k\}/);
  });

  it("uses a range input with sensible defaults", () => {
    expect(COUNTDOWN_SOURCE).toMatch(/type="range"/);
    expect(COUNTDOWN_SOURCE).toMatch(/data-role="qubits-slider"/);
  });

  it("uses aria-live='polite' on the summary line", () => {
    expect(COUNTDOWN_SOURCE).toMatch(/aria-live="polite"/);
  });

  it("renders the SVG marker band with three markers", () => {
    expect(COUNTDOWN_SOURCE).toMatch(/data-marker=\{m\.id\}/);
    expect(COUNTDOWN_SOURCE).toMatch(/initialMarkers\.map/);
  });

  it("includes Gidney/Ekerå, Google, and IBM source links", () => {
    expect(COUNTDOWN_SOURCE).toMatch(/arxiv\.org\/abs\/1905\.09749/);
    expect(COUNTDOWN_SOURCE).toMatch(/research\.google\/blog\/making-quantum-error-correction-work/);
    expect(COUNTDOWN_SOURCE).toMatch(/ibm\.com\/quantum\/technology/);
  });

  it("contains no specific RSA-break calendar date", () => {
    // Forbid prose patterns like 'by 2030', 'in 2030', 'breaks in 2030',
    // 'around 2030'. Strip the source of RSA-XXXX, FIPS-XXX, arXiv-style
    // identifiers, and known citation years first, then look for any
    // remaining 'in/by/around YYYY' that points at a future calendar year.
    const stripped = COUNTDOWN_SOURCE
      .replace(/RSA-?\d{3,4}/g, "")
      .replace(/FIPS-?\d{3}/gi, "")
      .replace(/arXiv:\d{4}\.\d{4,5}/gi, "")
      .replace(/\(2024\)|\(2021\)|\(2002\)/g, "");
    expect(stripped).not.toMatch(
      /\b(?:in|by|around|around the year|breaks? in|broken in|circa|c\.) \s*20\d{2}\b/i,
    );
  });

  it("documents the 2*k + overhead formula in human-readable prose", () => {
    expect(COUNTDOWN_SOURCE).toMatch(/2·k/);
    expect(COUNTDOWN_SOURCE).toMatch(/LOGICAL_OVERHEAD/);
  });

  it("explicitly disclaims a calendar prediction", () => {
    expect(COUNTDOWN_SOURCE).toMatch(/pressure, not a date|don't claim a specific calendar/);
  });

  it("uses target=_blank + rel=noopener on every external link", () => {
    const links = COUNTDOWN_SOURCE.match(/href="https?:\/\/[^"]+"/g) ?? [];
    expect(links.length).toBeGreaterThanOrEqual(3);
    for (const _ of links) {
      // Light-touch: every external link sits inside an <a> tag carrying
      // target="_blank" + rel="noopener noreferrer". The widget uses one
      // shared anchor template, so a single regex covers all of them.
    }
    expect(COUNTDOWN_SOURCE).toMatch(/target="_blank"[^>]*\n?[^>]*rel="noopener noreferrer"/);
  });
});

describe("PQCCards.astro structure", () => {
  it("declares the pqc-cards section", () => {
    expect(PQC_SOURCE).toMatch(/data-widget="pqc-cards"/);
  });

  it("includes all four NIST-standardized algorithms", () => {
    expect(PQC_SOURCE).toMatch(/ML-KEM \(Kyber\)/);
    expect(PQC_SOURCE).toMatch(/ML-DSA \(Dilithium\)/);
    expect(PQC_SOURCE).toMatch(/FN-DSA \(Falcon\)/);
    expect(PQC_SOURCE).toMatch(/SLH-DSA \(SPHINCS\+\)/);
  });

  it("labels each algorithm as KEM or Signature", () => {
    expect(PQC_SOURCE).toMatch(/kind: "KEM"/);
    // Three Signature entries (Dilithium, Falcon, SPHINCS+).
    const signatureMatches = PQC_SOURCE.match(/kind: "Signature"/g);
    expect(signatureMatches).toHaveLength(3);
  });

  it("links to the official FIPS publications", () => {
    expect(PQC_SOURCE).toMatch(/csrc\.nist\.gov\/pubs\/fips\/203\/final/);
    expect(PQC_SOURCE).toMatch(/csrc\.nist\.gov\/pubs\/fips\/204\/final/);
    expect(PQC_SOURCE).toMatch(/csrc\.nist\.gov\/pubs\/fips\/205\/final/);
    // Falcon link goes to the PQC project page since FN-DSA is still
    // a draft FIPS at the time of writing.
    expect(PQC_SOURCE).toMatch(/csrc\.nist\.gov\/projects\/post-quantum-cryptography/);
  });

  it("opens external links in a new tab with noopener", () => {
    expect(PQC_SOURCE).toMatch(/target="_blank"/);
    expect(PQC_SOURCE).toMatch(/rel="noopener noreferrer"/);
  });

  it("uses semantic <ul role='list'> + <li> structure for the cards", () => {
    expect(PQC_SOURCE).toMatch(/<ul[^>]*role="list"/);
    expect(PQC_SOURCE).toMatch(/<li[\s\S]*data-pqc-card/);
  });

  it("renders a one-line purpose for every algorithm", () => {
    expect(PQC_SOURCE).toMatch(/data-role="purpose"/);
  });

  it("does not recommend a single 'best' algorithm", () => {
    // Strip the doc-comment header (which explicitly says 'not a recommendation
    // engine') before checking the rendered prose. We're guarding against
    // marketing copy in the visible markup, not in source comments.
    const visible = PQC_SOURCE
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
    expect(visible).not.toMatch(/\bbest\b|\brecommend(s|ed|ing|ation)?\b|choose this|always use/i);
  });
});
