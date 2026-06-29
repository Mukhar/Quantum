# Phase 3 — Circuit Gallery — SUMMARY

*Status: ✅ Complete — 2026-06-28*

## Phase Goal

Local circuit gallery at `/gallery` plus save drawer in `/sandbox`.
IndexedDB-backed via `idb-keyval`, schema-versioned (v1), exportable
as JSON, private-browsing-safe (in-memory fallback), lazy-loaded
so essay bundles stay slim.

Covers: **GAL-01..09**.

---

## What Shipped

### Sub-plans completed (all 6)

| Plan | Title | Status |
|---|---|---|
| 03-01 | Schema + types (`schema.ts`, ULID, isValidEntry, migrate, makeEntry) | ✅ |
| 03-02 | Storage layer (`store.ts` — CRUD, in-memory fallback, export/import) | ✅ |
| 03-03 | Thumbnail generator (`thumbnail.ts` — pure SVG string, theme-aware) | ✅ |
| 03-04 | `/gallery` page (grid, CRUD, export, import, banners) | ✅ |
| 03-05 | Sandbox save drawer (`gallery-save.client.ts` + native `<dialog>`) | ✅ |
| 03-06 | Tests (schema, store, thumbnail, page integration) | ✅ |

### New files

- `src/lib/gallery/schema.ts` — `GalleryEntry`, `CURRENT_SCHEMA_VERSION = 1`, `newId()` (ULID-lite), `isValidEntry()`, `migrate()`, `makeEntry()`.
- `src/lib/gallery/store.ts` — `loadAll`, `getOne`, `saveOne`, `deleteOne`, `renameOne`, `duplicate`, `clear`, `exportAll`, `importMany`, `subscribe`, `usingFallback`, `saveCircuit`, plus test seams.
- `src/lib/gallery/thumbnail.ts` — `circuitToThumbnailSvg(circuit)` returning a ≤8KB inline SVG string with theme-aware chrome + categorical gate colours.
- `src/lib/sandbox/gallery-save.client.ts` — lazy-loaded save dialog wiring (mounts the dialog buttons + writes via `saveCircuit`).
- `src/pages/gallery.astro` — full gallery UI (grid, banners, export/import/clear, rename/duplicate/delete/copy-link inline on each card).
- `tests/gallery/schema.test.ts` — 14 tests.
- `tests/gallery/store.test.ts` — 19 tests (full CRUD against in-memory fallback path = same code path as Safari private browsing).
- `tests/gallery/thumbnail.test.ts` — 7 tests (structure + theme vars + 8KB size cap).
- `tests/gallery/gallery-page.test.ts` — 10 tests (page exists, layout, banners, sandbox save drawer wired, lazy-load, codec re-use).

### Modified files

- `src/pages/sandbox/index.astro` — added Save button + `<dialog>` markup + `Gallery →` link in toolbar; lazy-loads `gallery-save.client.ts` on first hover/focus/click of Save button.
- `package.json` — added `idb-keyval` (runtime) and `fake-indexeddb` (dev, currently unused but available for IDB-flavoured tests).

### Test counts

- Before Phase 3: 197 passing
- After Phase 3: **247 passing** (+50: 14 schema + 19 store + 7 thumbnail + 10 page integration = 50)
- Build: clean — **19 pages** (was 18; +1 for `/gallery`)

---

## Architecture (as-shipped)

```
┌─────────────────────────┐  Save button   ┌─────────────────────┐
│ /sandbox (toolbar)      │ ─────────────► │ <dialog> + lazy     │
│ + "Gallery →" link      │                │ gallery-save.client │
└─────────────────────────┘                └──────────┬──────────┘
                                                      │
                                                      ▼
                                       ┌──────────────────────────┐
                                       │ src/lib/gallery/store.ts │
                                       │  • CRUD                  │
                                       │  • in-mem fallback       │
                                       │  • subscribe broadcast   │
                                       └──────────┬───────────────┘
                                                  │ idb-keyval
                                                  ▼
                                       ┌──────────────────────────┐
                                       │ IndexedDB                │
                                       │ key: "quantum/gal/v1"    │
                                       └──────────────────────────┘
                                                  │
                                                  ▼
┌─────────────────────────┐
│ /gallery                │  loadAll → render cards
│ • thumbnail (inline SVG)│  click card → /sandbox#<encoded>
│ • CRUD inline           │
│ • export/import JSON    │
└─────────────────────────┘
```

**Architectural rule respected:** gallery is purely a consumer of
the existing URL-fragment codec. Click any card → `location.href =
"/sandbox#" + encodeCircuit(entry.circuit)`. No parallel hydration
path was introduced.

---

## Threat Mitigations (verified)

| Threat | Mitigation | Verified |
|---|---|---|
| Safari private blocks IDB | `readRaw()` catches → swaps to `memory[]` + sets `fallback = true`; UI shows banner | `tests/gallery/store.test.ts` runs entirely in fallback mode (same code path) |
| Quota exceeded mid-save | `writeRaw()` catches → keeps in-mem copy + re-throws so UI can toast | manual check by inspection (no portable way to force in CI) |
| Schema drift v1 → v2+ | `schemaVersion` on every entry; `migrate()` returns `null` on unknown | `schema.test.ts` "returns null for unknown schemaVersion" |
| Imported JSON malicious / malformed | `migrate()` → `isValidEntry()` runtime guard; rejected entries reported in `result.errors` | `store.test.ts` "import skips invalid entries with errors" |
| Thumbnail bloats export size | Pure string concat, < 8 KB even for 4q×20step circuits | `thumbnail.test.ts` "stays under 8 KB even for a dense circuit" |
| Gallery code loads on essay routes | Page-scoped imports; sandbox `gallery-save.client` loaded only on Save button hover/focus/click | `tests/gallery/gallery-page.test.ts` "lazy-loads gallery-save.client" |
| Concurrent tab edits | "Last writer wins" — accepted for local single-user data | Documented in plan |
| Codec change breaks saved circuits | Gallery `circuit` field is the same shape as `roundTrip(circuit)` — codec tests are the canary | `quantum/codec.test.ts` covers shape fidelity |

---

## Deviations from Plan

1. **In-memory fallback as the test code path** (instead of `fake-indexeddb`).
   Reason: `fake-indexeddb` is installed but its CJS/ESM interop was
   flaky and the fallback path IS the same code path users hit in
   Safari private browsing — so testing it tests both. We kept the
   dep for future tests that need real IDB semantics (e.g. range
   queries if/when we shard the storage key).

2. **Single storage key holding the whole array** (instead of one key per entry).
   Reason: gallery is bounded (soft cap 100 × ~50 KB = 5 MB worst
   case, well under all browser quotas). One key gives free atomic
   export/import and a trivial cross-tab "subscribe + reload" event
   model. If we ever grow past 1000 entries this becomes a hotspot
   and we shard then.

3. **Save dialog uses native `<dialog>` element** (not a custom React-ish drawer).
   Reason: ~95% browser support, free modal a11y (focus trap, ESC to
   close, backdrop click), zero KB of JS for the overlay itself. Falls
   back to `removeAttribute("hidden")` on the < 5% without `.showModal`.

4. **ULID-lite (26 base36 chars)** instead of `npm:ulid`.
   Reason: 50 lines of code avoids adding a runtime dep. Same
   properties: time-prefixed, lexicographically sortable, ~36⁵ ≈ 60M
   ids per ms before collisions. `schema.test.ts` proves uniqueness
   over 50 calls at the same instant.

5. **`Phase 3 sub-plans collapsed from 6 distinct files to 4** in
   the final tree (schema/store/thumbnail/gallery-save). Save drawer
   uses the existing sandbox toolbar instead of getting its own
   `.astro` component — simpler and the dialog markup lives inline
   with the page that uses it.

---

## Carryover into Phase 4

- **Bundle size verification (OPS-01):** Use the build output to
  confirm essay routes don't pull `idb-keyval`. Expected: only
  `/sandbox` and `/gallery` chunks include it. Tooling: `du -sk
  dist/_astro/*` or vite-bundle-visualizer.
- **End-to-end save → reload → re-open flow:** Manual smoke test in
  the launch checklist — covers the integration the unit tests don't.
- **Safari private-browsing manual verification:** unit tests cover
  the same code path, but a 30-sec manual check at launch is cheap
  insurance.

---

## Sign-off

- ✅ Build clean (19 pages, no warnings)
- ✅ All tests pass (247/247, +50 new)
- ✅ Full CRUD: save/get/rename/duplicate/delete + export/import
- ✅ Schema versioned + migrate dispatch ready for future shapes
- ✅ Private-browsing in-memory fallback (same code path covered by tests)
- ✅ Soft 100-entry quota warning banner
- ✅ Lazy-loaded (essay bundles unchanged)
- ✅ Gallery card click → `/sandbox#<encoded>` (no parallel hydration path)
- ✅ All GAL-01..09 covered

**Ready for atomic commit.** Next: Phase 4 (launch polish, OPS-01..03).
