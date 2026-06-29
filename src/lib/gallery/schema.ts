/**
 * Gallery schema — locked v1.
 *
 * This is the contract every saved circuit conforms to. The shape is
 * deliberately compatible with a future `POST /circuits` API: when
 * v3 sync lands, the same JSON travels over the wire with zero
 * massaging.
 *
 * Migration philosophy: every entry carries a `schemaVersion`. When
 * we change the shape (rare), bump the constant and add a branch in
 * `migrate()`. Old entries get upgraded on read, never on write.
 */
import type { Circuit } from "../quantum/circuit";

export const CURRENT_SCHEMA_VERSION = 1 as const;
export type SchemaVersion = typeof CURRENT_SCHEMA_VERSION;

export interface GalleryEntry {
  /** ULID-lite: 26 base36 chars, lexicographically sortable by timestamp. */
  id: string;
  /** Locked shape version. Bump only via a `migrate()` branch. */
  schemaVersion: SchemaVersion;
  /** User-chosen display name. */
  name: string;
  /** Unix ms. */
  createdAt: number;
  /** Unix ms — bumps on rename, duplicate, or future-circuit-edit-in-place. */
  updatedAt: number;
  /** Cached for display (avoids walking `circuit.steps` on every render). */
  qubits: number;
  /** Cached for display. */
  steps: number;
  /** Source of truth — same shape as the URL-fragment codec consumes. */
  circuit: Circuit;
  /** Inline SVG string (~ 1–4 KB). Optional — gallery falls back to a placeholder. */
  thumbnailSvg?: string;
  /** Free-form labels. Currently unused in UI but present for future filtering. */
  tags?: string[];
}

/* -------------------------------------------------------------------------- */
/* ULID-lite — 26 base36 chars, time-sortable                                 */
/* -------------------------------------------------------------------------- */

const BASE36 = "0123456789abcdefghijklmnopqrstuvwxyz";

/** Cheap ULID-shaped id without the extra dep. Time prefix sorts. */
export function newId(now: number = Date.now()): string {
  let timePart = "";
  let n = now;
  // 10 base36 chars of timestamp ≈ 36^10 = ~3.6e15 ms ≈ 115,000 years
  for (let i = 0; i < 10; i++) {
    timePart = BASE36[n % 36] + timePart;
    n = Math.floor(n / 36);
  }
  let rand = "";
  for (let i = 0; i < 16; i++) {
    rand += BASE36[Math.floor(Math.random() * 36)];
  }
  return timePart + rand;
}

/** 26-char base36 — `/^[0-9a-z]{26}$/`. */
export const ID_PATTERN = /^[0-9a-z]{26}$/;

/* -------------------------------------------------------------------------- */
/* Runtime validation guards                                                  */
/* -------------------------------------------------------------------------- */

/** Defensive check: is this thing a `GalleryEntry`? Used on import. */
export function isValidEntry(x: unknown): x is GalleryEntry {
  if (!x || typeof x !== "object") return false;
  const e = x as Record<string, unknown>;
  if (typeof e.id !== "string" || !ID_PATTERN.test(e.id)) return false;
  if (e.schemaVersion !== CURRENT_SCHEMA_VERSION) return false;
  if (typeof e.name !== "string" || e.name.length === 0) return false;
  if (typeof e.createdAt !== "number" || !Number.isFinite(e.createdAt)) return false;
  if (typeof e.updatedAt !== "number" || !Number.isFinite(e.updatedAt)) return false;
  if (typeof e.qubits !== "number" || e.qubits < 1 || e.qubits > 4) return false;
  if (typeof e.steps !== "number" || e.steps < 0) return false;
  if (!e.circuit || typeof e.circuit !== "object") return false;
  const c = e.circuit as Record<string, unknown>;
  if (typeof c.qubits !== "number" || !Array.isArray(c.steps)) return false;
  if (e.thumbnailSvg !== undefined && typeof e.thumbnailSvg !== "string") return false;
  if (e.tags !== undefined && !Array.isArray(e.tags)) return false;
  return true;
}

/**
 * Upgrade a raw, possibly-old entry to the current schema. Returns
 * `null` if the entry is unrecognisable or migration unsupported.
 *
 * Today this is identity (we're on v1). When v2 ships, add a branch
 * for `schemaVersion === 1` that maps to the new shape.
 */
export function migrate(raw: unknown): GalleryEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const v = (raw as { schemaVersion?: number }).schemaVersion;
  if (v === CURRENT_SCHEMA_VERSION) {
    return isValidEntry(raw) ? raw : null;
  }
  // Unknown future / unknown past — refuse rather than silently drop data.
  return null;
}

/**
 * Build an entry from a circuit + name. Caller can override createdAt
 * (useful for tests and for duplicate-with-preserve-date).
 */
export function makeEntry(args: {
  circuit: Circuit;
  name: string;
  thumbnailSvg?: string;
  tags?: string[];
  now?: number;
}): GalleryEntry {
  const now = args.now ?? Date.now();
  return {
    id: newId(now),
    schemaVersion: CURRENT_SCHEMA_VERSION,
    name: args.name,
    createdAt: now,
    updatedAt: now,
    qubits: args.circuit.qubits,
    steps: args.circuit.steps.length,
    circuit: args.circuit,
    thumbnailSvg: args.thumbnailSvg,
    tags: args.tags,
  };
}
