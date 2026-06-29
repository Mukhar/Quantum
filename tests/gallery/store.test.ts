/**
 * Storage tests — drive the full CRUD surface against the in-memory
 * fallback (we force it on so the tests don't depend on
 * fake-indexeddb wiring quirks). The fallback path is the same code
 * path as Safari private browsing, so coverage here also covers GAL-07.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  loadAll,
  getOne,
  saveOne,
  deleteOne,
  renameOne,
  duplicate,
  clear,
  exportAll,
  importMany,
  saveCircuit,
  usingFallback,
  __resetForTests,
  __forceFallbackForTests,
} from "../../src/lib/gallery/store";
import { makeEntry, CURRENT_SCHEMA_VERSION } from "../../src/lib/gallery/schema";
import { emptyCircuit } from "../../src/lib/quantum/circuit";

beforeEach(() => {
  __resetForTests();
  __forceFallbackForTests();
});

describe("CRUD", () => {
  it("saveOne inserts then loadAll returns it", async () => {
    const e = makeEntry({ circuit: emptyCircuit(2), name: "Bell" });
    await saveOne(e);
    const all = await loadAll();
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe("Bell");
  });

  it("getOne returns by id", async () => {
    const e = makeEntry({ circuit: emptyCircuit(2), name: "x" });
    await saveOne(e);
    expect((await getOne(e.id))?.name).toBe("x");
    expect(await getOne("nonexistent")).toBe(null);
  });

  it("saveOne replaces in place when id exists", async () => {
    const e = makeEntry({ circuit: emptyCircuit(2), name: "v1" });
    await saveOne(e);
    await saveOne({ ...e, name: "v2" });
    const all = await loadAll();
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe("v2");
  });

  it("deleteOne removes; returns false when missing", async () => {
    const e = makeEntry({ circuit: emptyCircuit(2), name: "x" });
    await saveOne(e);
    expect(await deleteOne(e.id)).toBe(true);
    expect(await loadAll()).toHaveLength(0);
    expect(await deleteOne(e.id)).toBe(false);
  });

  it("renameOne updates name + bumps updatedAt", async () => {
    const e = makeEntry({ circuit: emptyCircuit(2), name: "old" });
    await saveOne(e);
    const orig = await getOne(e.id);
    await new Promise((r) => setTimeout(r, 25));
    const renamed = await renameOne(e.id, "new");
    expect(renamed?.name).toBe("new");
    expect(renamed!.updatedAt).toBeGreaterThanOrEqual(orig!.updatedAt);
  });

  it("renameOne returns null for missing id", async () => {
    expect(await renameOne("nope", "x")).toBe(null);
  });

  it("duplicate creates a new entry with fresh id + (copy) suffix", async () => {
    const e = makeEntry({ circuit: emptyCircuit(2), name: "orig" });
    await saveOne(e);
    const copy = await duplicate(e.id);
    expect(copy?.name).toBe("orig (copy)");
    expect(copy?.id).not.toBe(e.id);
    const all = await loadAll();
    expect(all).toHaveLength(2);
  });

  it("duplicate accepts an explicit new name", async () => {
    const e = makeEntry({ circuit: emptyCircuit(2), name: "orig" });
    await saveOne(e);
    const copy = await duplicate(e.id, "renamed copy");
    expect(copy?.name).toBe("renamed copy");
  });

  it("clear removes everything", async () => {
    await saveOne(makeEntry({ circuit: emptyCircuit(2), name: "a" }));
    await saveOne(makeEntry({ circuit: emptyCircuit(2), name: "b" }));
    await clear();
    expect(await loadAll()).toHaveLength(0);
  });
});

describe("loadAll ordering", () => {
  it("returns entries newest updatedAt first", async () => {
    const a = makeEntry({ circuit: emptyCircuit(1), name: "a" });
    a.updatedAt = 100;
    const b = makeEntry({ circuit: emptyCircuit(1), name: "b" });
    b.updatedAt = 200;
    const c = makeEntry({ circuit: emptyCircuit(1), name: "c" });
    c.updatedAt = 150;
    // Manually push to fallback in arbitrary order
    await saveOne(a);
    await saveOne(b);
    await saveOne(c);
    const all = await loadAll();
    // saveOne bumps updatedAt to now, so the saved order is the
    // freshness order: a, b, c. loadAll returns newest first → c, b, a.
    expect(all.map((e) => e.name)).toEqual(["c", "b", "a"]);
  });
});

describe("saveCircuit convenience", () => {
  it("builds + persists in one call", async () => {
    const e = await saveCircuit(emptyCircuit(3), "my circuit", "<svg/>");
    expect(e.name).toBe("my circuit");
    expect(e.thumbnailSvg).toBe("<svg/>");
    expect(e.qubits).toBe(3);
    expect((await loadAll())).toHaveLength(1);
  });
});

describe("exportAll / importMany", () => {
  it("export round-trip: importMany(exportAll(), merge) is idempotent", async () => {
    await saveOne(makeEntry({ circuit: emptyCircuit(2), name: "a" }));
    await saveOne(makeEntry({ circuit: emptyCircuit(2), name: "b" }));
    const bundle = await exportAll();
    expect(bundle.format).toBe("quantum-gallery");
    expect(bundle.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(bundle.entries).toHaveLength(2);

    await clear();
    const result = await importMany(bundle, "merge");
    expect(result.added).toBe(2);
    expect(result.errors).toEqual([]);
    expect(await loadAll()).toHaveLength(2);
  });

  it("import accepts a bare array (legacy / minimal payload)", async () => {
    const e = makeEntry({ circuit: emptyCircuit(2), name: "a" });
    const result = await importMany([e]);
    expect(result.added).toBe(1);
    expect(await loadAll()).toHaveLength(1);
  });

  it("import skips invalid entries with errors but keeps valid ones", async () => {
    const good = makeEntry({ circuit: emptyCircuit(2), name: "ok" });
    const bad = { id: "bad", schemaVersion: 99 }; // wrong shape
    const result = await importMany([good, bad]);
    expect(result.added).toBe(1);
    expect(result.errors).toHaveLength(1);
  });

  it("import in replace mode wipes existing entries first", async () => {
    await saveOne(makeEntry({ circuit: emptyCircuit(2), name: "existing" }));
    const fresh = makeEntry({ circuit: emptyCircuit(2), name: "fresh" });
    await importMany([fresh], "replace");
    const all = await loadAll();
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe("fresh");
  });

  it("import in merge mode preserves existing entries", async () => {
    const existing = makeEntry({ circuit: emptyCircuit(2), name: "existing" });
    await saveOne(existing);
    const fresh = makeEntry({ circuit: emptyCircuit(2), name: "fresh" });
    await importMany([fresh], "merge");
    const all = await loadAll();
    expect(all).toHaveLength(2);
  });

  it("import incoming entry with same id overwrites (de-dupe)", async () => {
    const e = makeEntry({ circuit: emptyCircuit(2), name: "v1" });
    await saveOne(e);
    const updated = { ...e, name: "v2" };
    const result = await importMany([updated], "merge");
    expect(result.added).toBe(0);
    expect(result.skipped).toBe(1);
    const all = await loadAll();
    expect(all[0].name).toBe("v2");
  });

  it("import rejects non-object, non-array bundles", async () => {
    const result = await importMany("garbage");
    expect(result.added).toBe(0);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe("usingFallback", () => {
  it("reports true after __forceFallbackForTests", () => {
    expect(usingFallback()).toBe(true);
  });
});
