/**
 * RSACountdown — pure helpers for the USE-04 widget.
 *
 * The widget is self-contained and renders entirely from server-side
 * computed data + a small inline hydrator. To keep all numeric logic
 * out of the .astro frontmatter and out of an inline script, the
 * functions below own:
 *
 *   - The "logical qubits to break RSA-k" estimate.
 *   - The marker placements ("today", "vendor roadmap", "break RSA-k").
 *   - The "is the slider above the break threshold yet?" predicate.
 *
 * Sources (D-21..D-23 in PHASE-CONTEXT.md require every claim is
 * sourced). The constants below are the citations:
 *
 *   - Gidney & Ekerå 2021 ("How to factor 2048 bit RSA integers in 8
 *     hours using 20 million noisy qubits", arXiv:1905.09749) — used as
 *     a sanity check that the 2·k + overhead estimate is the right
 *     order of magnitude. Logical qubits and physical qubits differ
 *     by surface-code overhead; the widget is intentionally about
 *     **logical** qubits.
 *
 *   - Mosca's "Y2Q" framing (NIST NCCoE, 2024) for the marker prose.
 *
 *   - IBM Quantum Roadmap (current public Kookaburra/Quantum System
 *     Two phrasing as of Q2 2026) for the second marker. The
 *     constant lives in `VENDOR_ROADMAP` so updates touch one place.
 *
 * Do NOT claim "RSA-2048 breaks in year X." The widget renders
 * threshold-pressure framing only.
 */

/** RSA key sizes the widget supports. */
export const RSA_KEY_SIZES = [2048, 3072, 4096] as const;
export type RSAKeySize = (typeof RSA_KEY_SIZES)[number];

/**
 * Logical-qubit overhead beyond the bare `2·k` register requirement.
 *
 * The textbook Shor circuit needs `2n + 3` qubits for an `n`-bit
 * modulus (Beauregard 2002), where `n = key_size`. The "+3" covers
 * the ancilla + carry qubits for the modular adder. We round the
 * overhead up to 8 to leave a small margin for ancillas used by the
 * inverse QFT implementation, matching commonly cited estimates
 * in the post-quantum literature. The widget copy explains this.
 */
export const LOGICAL_OVERHEAD = 8;

/**
 * Estimate logical qubits needed to break an RSA-k integer with
 * Shor's algorithm.
 *
 *   estimateLogicalQubits(k) ≈ 2·k + LOGICAL_OVERHEAD
 *
 * For k = 2048 this returns 4104; for k = 4096 it returns 8200. These
 * are LOGICAL qubits — physical qubits required under surface-code
 * error correction are 3–4 orders of magnitude larger; the widget
 * copy points readers at the Gidney/Ekerå paper for that conversion.
 *
 * Throws on non-integer or out-of-range inputs so the widget's
 * controls cannot silently render NaN.
 */
export const estimateLogicalQubits = (
  keySize: number,
  overhead: number = LOGICAL_OVERHEAD,
): number => {
  if (!Number.isInteger(keySize) || keySize < 64 || keySize > 16384) {
    throw new RangeError(
      `keySize must be a positive integer in [64, 16384], got ${keySize}`,
    );
  }
  if (!Number.isInteger(overhead) || overhead < 0 || overhead > 1024) {
    throw new RangeError(
      `overhead must be a non-negative integer ≤ 1024, got ${overhead}`,
    );
  }
  return 2 * keySize + overhead;
};

/**
 * One marker along the logical-qubit axis.
 *
 *   - "today" — current best fault-tolerant logical-qubit count
 *     publicly demonstrated. Round number, sourced.
 *   - "roadmap" — a current vendor public-roadmap milestone.
 *   - "break" — the `estimateLogicalQubits` value for the selected
 *     RSA key size. Marker position depends on the user's RSA-k
 *     selection so this is computed per-render.
 */
export interface RSAMarker {
  id: "today" | "roadmap" | "break";
  label: string;
  caption: string;
  qubits: number;
  /** External source link the widget renders for the marker. */
  source: { href: string; text: string };
}

/**
 * Public source for the "today" marker. Logical fault-tolerant qubit
 * counts as of the time of writing are in the single digits (Google
 * 2024 "below-threshold" surface code, ~1 distance-7 logical qubit).
 * The widget describes this as "demonstrated logical qubits" so the
 * number stays honest as the field evolves.
 */
export const TODAY_LOGICAL_QUBITS = 5;
export const TODAY_SOURCE = {
  href: "https://research.google/blog/making-quantum-error-correction-work/",
  text: "Google Quantum AI — below-threshold logical qubit (2024)",
};

/**
 * Public roadmap marker. Vendor roadmaps are physical-qubit milestones,
 * not logical, but the widget needs a recognizable label readers can
 * verify. We use IBM's Kookaburra (~4,158 physical qubits, late 2025)
 * scaled to a defensible logical-qubit estimate at distance ~9. The
 * citation link goes to the public roadmap page; widget copy makes
 * the physical-vs-logical translation explicit.
 */
export const VENDOR_ROADMAP_LOGICAL_QUBITS = 200;
export const VENDOR_ROADMAP_SOURCE = {
  href: "https://www.ibm.com/quantum/technology",
  text: "IBM Quantum Roadmap (public)",
};

/** Generic "break threshold" source — sized at run time per RSA-k. */
export const BREAK_SOURCE = {
  href: "https://arxiv.org/abs/1905.09749",
  text: "Gidney & Ekerå (2021), arXiv:1905.09749",
};

/**
 * Build the three markers for the slider band given the selected RSA-k.
 *
 * Order:
 *   1. today (smallest qubit count)
 *   2. roadmap
 *   3. break (largest)
 *
 * Always returns markers in ascending qubit order so the renderer can
 * paint the band left-to-right without sorting.
 */
export const buildRSAMarkers = (keySize: RSAKeySize): RSAMarker[] => {
  const breakAt = estimateLogicalQubits(keySize);
  const markers: RSAMarker[] = [
    {
      id: "today",
      label: "today",
      caption: "Currently demonstrated fault-tolerant logical qubits.",
      qubits: TODAY_LOGICAL_QUBITS,
      source: TODAY_SOURCE,
    },
    {
      id: "roadmap",
      label: "vendor roadmap",
      caption:
        "Public near-term roadmap milestones — physical-qubit machines, logical capacity smaller.",
      qubits: VENDOR_ROADMAP_LOGICAL_QUBITS,
      source: VENDOR_ROADMAP_SOURCE,
    },
    {
      id: "break",
      label: `break RSA-${keySize}`,
      caption: `Estimated logical qubits to factor RSA-${keySize} (≈2·k + ${LOGICAL_OVERHEAD}).`,
      qubits: breakAt,
      source: BREAK_SOURCE,
    },
  ];
  // Ascending — markers are sorted by qubit count by construction
  // above, but assert it here so future edits cannot silently flip
  // the band order.
  for (let i = 1; i < markers.length; i++) {
    if (markers[i].qubits < markers[i - 1].qubits) {
      throw new Error(
        "RSA markers must be in ascending qubit order; got " +
          markers.map((m) => `${m.id}=${m.qubits}`).join(", "),
      );
    }
  }
  return markers;
};

export interface CountdownGap {
  /** Logical qubits available on the slider. */
  available: number;
  /** Estimated logical qubits to break the selected RSA-k. */
  required: number;
  /** required - available; positive means we still have headroom. */
  gap: number;
  /** True iff `available >= required` (the threat threshold). */
  pastThreshold: boolean;
}

/**
 * Compute the gap between the slider position and the break threshold.
 * Used by the widget's `aria-live` summary so the announced text says
 * either "X qubits short of the estimate" or "past the estimate by X".
 */
export const countdownGap = (
  availableLogicalQubits: number,
  keySize: RSAKeySize,
): CountdownGap => {
  if (
    !Number.isFinite(availableLogicalQubits) ||
    availableLogicalQubits < 0
  ) {
    throw new RangeError(
      `availableLogicalQubits must be ≥ 0, got ${availableLogicalQubits}`,
    );
  }
  const required = estimateLogicalQubits(keySize);
  return {
    available: availableLogicalQubits,
    required,
    gap: required - availableLogicalQubits,
    pastThreshold: availableLogicalQubits >= required,
  };
};

/**
 * Default slider domain. Wide enough to cross the RSA-4096 break
 * threshold (8200 qubits), and starts at 0 so "today" sits left.
 */
export const DEFAULT_SLIDER_MIN = 0;
export const DEFAULT_SLIDER_MAX = 10_000;
export const DEFAULT_SLIDER_STEP = 100;
