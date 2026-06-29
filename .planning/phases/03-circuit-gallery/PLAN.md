# Phase 3 — Circuit Gallery — PLAN

*Created: 2026-06-28 — autonomous mode, post Phase 2 commit.*
*Covers: GAL-01..09.*

## Phase Goal

Local "my saved circuits" gallery at `/gallery` plus a save drawer in
`/sandbox`. IndexedDB-backed via `idb-keyval`, schema-versioned (v1
locked, future-API-compatible), exportable/importable as JSON,
private-browsing-safe (in-memory fallback), lazy-loaded so essays stay slim.

## Architecture (locked)

```
┌─────────────────────────────┐
│ /sandbox (Save drawer btn)  │ ──► saveCircuit()
└─────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────┐    ┌───────────────────────┐
│ src/lib/gallery/store.ts    │ ◄─►│ idb-keyval (IndexedDB)│
│  CRUD + in-mem fallback     │    │ key: "quantum/gal/v1" │
└─────────────────────────────┘    └───────────────────────┘
        │
        ▼
┌─────────────────────────────┐
│ /gallery (browse grid)      │  click card → location.href = `/sandbox#${encoded}`
└─────────────────────────────┘
```

**Architectural rule:** gallery is a consumer of the existing
URL-fragment codec (`src/lib/quantum/codec.ts`). It does NOT
introduce a parallel hydration path. Load = navigate to
`/sandbox#<encoded>`.

## Threat Model

| Threat | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Safari private browsing blocks IndexedDB | Med | High | `isPersistent()` check; in-memory `Map` fallback; banner on `/gallery` |
| Quota exceeded (browser limit, ~50 MB common) | Low | Med | Soft 100-entry warning; toast on `QuotaExceededError` |
| Schema drift between v1 → v2 | Med | High | `schemaVersion: 1` on every entry; `migrate(entry)` dispatch keyed on version |
| Imported JSON malicious / malformed | Low | Med | `isValidEntry()` runtime guard; rejected entries surfaced individually |
| Thumbnail bloats payload | Med | Med | SVG-string thumbnail (not PNG dataURL) — small enough that JSON export ≤ 50KB for typical gallery |
| Gallery loads on essay routes (bundle bloat) | High | Med | Page-scoped imports; gallery code only loaded by `/gallery` and `/sandbox` |
| Concurrent edits from two tabs | Low | Low | Each save writes the full entry list; last-writer-wins acceptable for local data |
| Codec change breaks saved entries | Low | High | `circuit` field is the same shape as `roundTrip(circuit)` — codec tests are the canary |

## Sub-plans

### Plan 03-01 — Schema + types (`src/lib/gallery/schema.ts`)
- `GalleryEntry` interface (id, schemaVersion, name, createdAt, updatedAt, qubits, steps, circuit, thumbnailSvg?, tags?)
- `CURRENT_SCHEMA_VERSION = 1`
- `isValidEntry(x: unknown): x is GalleryEntry` runtime guard
- `migrate(raw: unknown): GalleryEntry | null` — v1 → identity; future v2+ stubs noted
- ULID-lite generator (timestamp + 10 random chars) to avoid an extra dep

### Plan 03-02 — Storage layer (`src/lib/gallery/store.ts`)
- Wrap `idb-keyval` (`get`/`set`/`del` against one key holding the array)
- Key constant: `"quantum/gal/v1"`
- API: `loadAll`, `getOne(id)`, `saveOne(entry)`, `deleteOne(id)`, `duplicate(id, newName)`, `renameOne(id, name)`, `clear()`, `exportAll()`, `importMany(entries, mode)`
- Detect IDB availability lazily; on failure, swap to in-memory `Map` and set `using_fallback = true`
- All async, returns plain Promises

### Plan 03-03 — Thumbnail (`src/lib/gallery/thumbnail.ts`)
- `circuitToThumbnailSvg(c: Circuit): string` — returns inline SVG markup string (~ 1–4 KB)
- Renders: thin horizontal lines for each qubit, colour-coded squares for each op, fits 200×80
- No DOM — pure string concat (testable in node)

### Plan 03-04 — `/gallery` page (`src/pages/gallery.astro`)
- Grid of cards (responsive)
- Each card: thumbnail (rendered inline from `thumbnailSvg`), name, `qubits·steps`, "Updated 3h ago"
- Card actions: Open (→ /sandbox#…), Rename, Duplicate, Delete, Copy link
- Header actions: Export all, Import, Clear all
- Private-browsing banner if `using_fallback`
- Soft warning at ≥100 entries
- Uses `EssayLayout` for theme inheritance

### Plan 03-05 — Sandbox save drawer (`src/components/sandbox/GalleryDrawer.astro`)
- "Save circuit" button in sandbox toolbar
- Drawer with name input + Save / Cancel buttons
- On save: read current circuit from `composer.client.ts` store, build entry, `saveOne()`, toast success
- Drawer uses theme tokens consistent with rest of sandbox

### Plan 03-06 — Tests
- `tests/gallery/schema.test.ts` — `isValidEntry`, `migrate`, ULID format
- `tests/gallery/store.test.ts` — full CRUD against `fake-indexeddb`, in-memory fallback
- `tests/gallery/thumbnail.test.ts` — SVG output structure, size bounds
- `tests/gallery/gallery-page.test.ts` — page existence + drawer wired

## Implementation Order

1. Schema (03-01) — foundation, no deps
2. Storage (03-02) — depends on schema
3. Thumbnail (03-03) — depends on Circuit
4. Tests (03-06) — locks behaviour before UI
5. Gallery page (03-04) — depends on lib
6. Save drawer (03-05) — depends on lib + sandbox composer

## Acceptance

- [ ] `/gallery` page builds, theme-aware
- [ ] Save drawer in `/sandbox` wires to storage
- [ ] CRUD: save/get/rename/duplicate/delete persist across reload
- [ ] Export/import full gallery as JSON
- [ ] Private-browsing detection + in-memory fallback verified
- [ ] Schema version captured + migrate stub callable
- [ ] All existing 197 tests still pass
- [ ] Build clean (≥ 19 pages: was 18, +1 for `/gallery`)
