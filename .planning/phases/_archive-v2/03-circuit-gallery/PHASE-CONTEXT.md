# Phase 3 Context: Circuit gallery

*Created: 2026-06-28 as part of v2.0 milestone bump.*
*Status: Awaiting `/gsd-discuss-phase 3` then `/gsd-plan-phase 3`.*

## Goal

Local "my saved circuits" shelf at `/gallery` plus a save drawer in
`/sandbox`. IndexedDB-backed, schema-versioned, exportable. Loading a
gallery entry reuses the existing URL-fragment codec from v1 Phase 3
— no new hydration path.

## Requirements covered

- **GAL-01** — Save current sandbox circuit with name + tags + thumbnail
- **GAL-02** — `/gallery` grid with thumbnail / name / `qubits·steps` / updated-at
- **GAL-03** — Click card → opens in `/sandbox` via URL-fragment codec
- **GAL-04** — Rename / duplicate / delete persist to IndexedDB
- **GAL-05** — Export / import full gallery or single entry as JSON
- **GAL-06** — `schemaVersion` + migrations, future-API-compatible shape
- **GAL-07** — Private-browsing banner + in-memory fallback
- **GAL-08** — Lazy-loaded; essay bundles unchanged
- **GAL-09** — Soft warning at 100 entries; storage-quota toast

## Source design

Source of truth: `docs/plans/2026-06-26-v2-design.md` §3.1.

Key choices already locked there:
- **IndexedDB via `idb-keyval`** (~600 B gzipped) over `localStorage`
  (5 MB cap, sync-only).
- Entry shape (locked v1 of gallery schema):
  ```ts
  interface GalleryEntry {
    id: string;              // ULID
    schemaVersion: 1;
    name: string;
    createdAt: number;
    updatedAt: number;
    qubits: number;          // 1..4
    steps: number;           // 1..~20
    circuit: CircuitData;    // same shape as sandbox URL-fragment codec
    thumbnailDataUrl?: string;
    tags?: string[];
  }
  ```
- This shape maps verbatim to a future `POST /circuits` API → v3 sync
  needs no migration.
- Load path: gallery card → `/sandbox#<urlEncodedCircuit>` — no second
  hydration code path.

## Files added (per design doc)

```
src/lib/gallery/
  store.ts          ← idb-keyval wrapper, CRUD
  thumbnail.ts      ← circuit → 200×80 PNG dataURL (≤ 8 KB)
  schema.ts         ← types + migrations
  store.test.ts     ← vitest with fake-indexeddb
src/components/sandbox/
  GalleryDrawer.tsx ← slide-out panel from /sandbox (save UI)
src/pages/
  gallery.astro     ← dedicated /gallery browse page
```

## Open question to resolve in plan-phase

Should each gallery entry expose a "copy shareable URL" button (trivial
via existing codec)? Design doc leans yes.

## Constraints

- **Architectural rule (locked, from v1 STATE.md):** the gallery is a
  consumer of the existing URL-fragment codec. It does NOT introduce a
  parallel "load circuit into sandbox" code path. Extract a slim
  component (the `SandboxLink` / `CircuitView` pattern) rather than
  importing sandbox hydrators coupled to the singleton store.
- Sandbox grid + gate palette must stay theme-aware (Phase 1 must
  land first).
- Tests in `tests/sandbox/` and `tests/essays/sandbox-links.test.ts`
  serve as canonical mirrors — touch them in the same commit if you
  change the codec.
- Bundle: gallery code must NOT load on essay routes. Lazy-load from
  `/sandbox` and `/gallery` only. Track delta in Phase 4 (OPS-01).
- Schema migration tests run against `fake-indexeddb` in Vitest.

## Risk

- Safari private browsing blocks IndexedDB. GAL-07 must show a banner
  and fall back to an in-memory list for the session — verified manually
  in Safari before close-out.
