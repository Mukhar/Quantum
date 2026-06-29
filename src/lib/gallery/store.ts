/**
 * Gallery storage layer.
 *
 * Wraps `idb-keyval` with a single key (`quantum/gal/v1`) that holds
 * the entire entry array. We chose "one key, whole array" over
 * "one key per entry" for simpler atomic exports and because gallery
 * sizes are bounded (soft cap 100 entries, each ≤ ~50 KB → ≤ 5 MB).
 *
 * Safari private browsing blocks IndexedDB outright. We detect that
 * on first access and silently swap to an in-memory `Map`. The
 * `usingFallback()` getter lets the UI surface a banner.
 *
 * Public API: `loadAll`, `getOne`, `saveOne`, `deleteOne`, `renameOne`,
 * `duplicate`, `clear`, `exportAll`, `importMany`, `usingFallback`,
 * `subscribe` (for cross-tab/local change broadcast).
 */
import { get as idbGet, set as idbSet, del as idbDel } from "idb-keyval";
import { CURRENT_SCHEMA_VERSION, isValidEntry, migrate, newId, type GalleryEntry } from "./schema";
import type { Circuit } from "../quantum/circuit";

const STORAGE_KEY = "quantum/gal/v1";

/* -------------------------------------------------------------------------- */
/* Fallback (in-memory) backend                                               */
/* -------------------------------------------------------------------------- */

let fallback = false;
const memory: GalleryEntry[] = [];

/** True iff the runtime swapped to the in-memory fallback (e.g. Safari private). */
export function usingFallback(): boolean {
  return fallback;
}

async function readRaw(): Promise<GalleryEntry[]> {
  if (fallback) return [...memory];
  try {
    const raw = (await idbGet(STORAGE_KEY)) as unknown;
    if (!Array.isArray(raw)) return [];
    const out: GalleryEntry[] = [];
    for (const item of raw) {
      const migrated = migrate(item);
      if (migrated) out.push(migrated);
    }
    return out;
  } catch (err) {
    // IDB unavailable (Safari private, disabled storage). Swap to memory.
    fallback = true;
    return [...memory];
  }
}

async function writeRaw(entries: GalleryEntry[]): Promise<void> {
  if (fallback) {
    memory.splice(0, memory.length, ...entries);
    notify();
    return;
  }
  try {
    await idbSet(STORAGE_KEY, entries);
    notify();
  } catch (err) {
    // QuotaExceededError or transient IDB failure — surface to caller
    // but keep an in-memory copy so the session doesn't lose data.
    fallback = true;
    memory.splice(0, memory.length, ...entries);
    notify();
    throw err;
  }
}

/* -------------------------------------------------------------------------- */
/* Change notification (in-page subscribers)                                  */
/* -------------------------------------------------------------------------- */

type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribe(cb: Listener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function notify(): void {
  for (const cb of listeners) {
    try { cb(); } catch { /* swallow */ }
  }
}

/* -------------------------------------------------------------------------- */
/* CRUD                                                                       */
/* -------------------------------------------------------------------------- */

/** Returns entries sorted by `updatedAt` desc (newest first). */
export async function loadAll(): Promise<GalleryEntry[]> {
  const all = await readRaw();
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getOne(id: string): Promise<GalleryEntry | null> {
  const all = await readRaw();
  return all.find((e) => e.id === id) ?? null;
}

/** Insert if `id` is new, replace in place if existing. Bumps `updatedAt`. */
export async function saveOne(entry: GalleryEntry): Promise<GalleryEntry> {
  const now = Date.now();
  const all = await readRaw();
  const idx = all.findIndex((e) => e.id === entry.id);
  const next: GalleryEntry = {
    ...entry,
    updatedAt: now,
    qubits: entry.circuit.qubits,
    steps: entry.circuit.steps.length,
  };
  if (idx >= 0) all[idx] = next;
  else all.unshift(next);
  await writeRaw(all);
  return next;
}

export async function deleteOne(id: string): Promise<boolean> {
  const all = await readRaw();
  const next = all.filter((e) => e.id !== id);
  if (next.length === all.length) return false;
  await writeRaw(next);
  return true;
}

export async function renameOne(id: string, name: string): Promise<GalleryEntry | null> {
  const all = await readRaw();
  const e = all.find((x) => x.id === id);
  if (!e) return null;
  e.name = name;
  e.updatedAt = Date.now();
  await writeRaw(all);
  return e;
}

/** Returns the new entry (with fresh id + name). */
export async function duplicate(id: string, newName?: string): Promise<GalleryEntry | null> {
  const src = await getOne(id);
  if (!src) return null;
  const now = Date.now();
  const copy: GalleryEntry = {
    ...src,
    id: newId(now),
    name: newName ?? `${src.name} (copy)`,
    createdAt: now,
    updatedAt: now,
  };
  return await saveOne(copy);
}

export async function clear(): Promise<void> {
  if (fallback) {
    memory.length = 0;
    notify();
    return;
  }
  try {
    await idbDel(STORAGE_KEY);
    notify();
  } catch {
    fallback = true;
    memory.length = 0;
    notify();
  }
}

/* -------------------------------------------------------------------------- */
/* Export / Import                                                            */
/* -------------------------------------------------------------------------- */

export interface ExportBundle {
  format: "quantum-gallery";
  schemaVersion: typeof CURRENT_SCHEMA_VERSION;
  exportedAt: number;
  entries: GalleryEntry[];
}

export async function exportAll(): Promise<ExportBundle> {
  const entries = await loadAll();
  return {
    format: "quantum-gallery",
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: Date.now(),
    entries,
  };
}

export type ImportMode = "merge" | "replace";

export interface ImportResult {
  added: number;
  skipped: number;
  total: number;
  errors: string[];
}

export async function importMany(bundle: unknown, mode: ImportMode = "merge"): Promise<ImportResult> {
  const errors: string[] = [];
  let entries: unknown[] = [];

  if (Array.isArray(bundle)) {
    entries = bundle;
  } else if (bundle && typeof bundle === "object") {
    const b = bundle as { entries?: unknown };
    if (Array.isArray(b.entries)) entries = b.entries;
    else { errors.push("Missing `entries` array"); return { added: 0, skipped: 0, total: 0, errors }; }
  } else {
    errors.push("Bundle must be an array or { entries: [...] }");
    return { added: 0, skipped: 0, total: 0, errors };
  }

  const incoming: GalleryEntry[] = [];
  for (const raw of entries) {
    const m = migrate(raw);
    if (m && isValidEntry(m)) incoming.push(m);
    else errors.push(`Skipped invalid entry: ${(raw as { id?: string })?.id ?? "(no id)"}`);
  }

  let existing: GalleryEntry[] = [];
  if (mode === "merge") existing = await readRaw();

  // de-dupe by id (incoming wins)
  const byId = new Map<string, GalleryEntry>();
  for (const e of existing) byId.set(e.id, e);
  let added = 0;
  let skipped = 0;
  for (const e of incoming) {
    const was = byId.has(e.id);
    byId.set(e.id, e);
    if (was) skipped++; else added++;
  }

  await writeRaw([...byId.values()]);
  return { added, skipped, total: incoming.length, errors };
}

/* -------------------------------------------------------------------------- */
/* Test seam                                                                   */
/* -------------------------------------------------------------------------- */

/** Reset module state — TESTS ONLY. */
export function __resetForTests(): void {
  fallback = false;
  memory.length = 0;
  listeners.clear();
}

/** Force-enable in-memory fallback — TESTS ONLY. */
export function __forceFallbackForTests(): void {
  fallback = true;
}

/** Convenience: build & save in one call. */
export async function saveCircuit(
  circuit: Circuit,
  name: string,
  thumbnailSvg?: string,
): Promise<GalleryEntry> {
  const now = Date.now();
  return await saveOne({
    id: newId(now),
    schemaVersion: CURRENT_SCHEMA_VERSION,
    name,
    createdAt: now,
    updatedAt: now,
    qubits: circuit.qubits,
    steps: circuit.steps.length,
    circuit,
    thumbnailSvg,
  });
}
