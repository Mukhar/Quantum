/**
 * Schema tests — locks the v1 GalleryEntry shape + ULID generator +
 * runtime validation + migration dispatch.
 */
import { describe, it, expect } from "vitest";
import {
  CURRENT_SCHEMA_VERSION,
  ID_PATTERN,
  isValidEntry,
  makeEntry,
  migrate,
  newId,
  type GalleryEntry,
} from "../../src/lib/gallery/schema";
import { emptyCircuit } from "../../src/lib/quantum/circuit";

describe("newId", () => {
  it("returns a 26-char base36 string", () => {
    const id = newId();
    expect(id).toMatch(ID_PATTERN);
    expect(id).toHaveLength(26);
  });

  it("is monotonically sortable by timestamp prefix", () => {
    const a = newId(1_700_000_000_000);
    const b = newId(1_700_000_001_000);
    expect(a < b).toBe(true);
  });

  it("two ids at the same instant are still distinct (random suffix)", () => {
    const t = Date.now();
    const ids = new Set(Array.from({ length: 50 }, () => newId(t)));
    expect(ids.size).toBe(50);
  });
});

describe("isValidEntry", () => {
  const good: GalleryEntry = {
    id: "0".repeat(26),
    schemaVersion: CURRENT_SCHEMA_VERSION,
    name: "Bell state",
    createdAt: 1,
    updatedAt: 2,
    qubits: 2,
    steps: 1,
    circuit: emptyCircuit(2),
  };

  it("accepts a fully-valid entry", () => {
    expect(isValidEntry(good)).toBe(true);
  });

  it("rejects wrong schemaVersion", () => {
    expect(isValidEntry({ ...good, schemaVersion: 99 })).toBe(false);
  });

  it("rejects malformed id", () => {
    expect(isValidEntry({ ...good, id: "too-short" })).toBe(false);
    expect(isValidEntry({ ...good, id: "X".repeat(26) })).toBe(false); // uppercase
  });

  it("rejects empty name", () => {
    expect(isValidEntry({ ...good, name: "" })).toBe(false);
  });

  it("rejects out-of-range qubits", () => {
    expect(isValidEntry({ ...good, qubits: 0 })).toBe(false);
    expect(isValidEntry({ ...good, qubits: 5 })).toBe(false);
  });

  it("rejects missing circuit", () => {
    const { circuit: _omit, ...withoutCircuit } = good;
    expect(isValidEntry(withoutCircuit)).toBe(false);
  });

  it("rejects non-object input", () => {
    expect(isValidEntry(null)).toBe(false);
    expect(isValidEntry(undefined)).toBe(false);
    expect(isValidEntry("string")).toBe(false);
    expect(isValidEntry(42)).toBe(false);
  });
});

describe("migrate", () => {
  it("passes through current-version entries unchanged", () => {
    const entry = makeEntry({ circuit: emptyCircuit(2), name: "x" });
    expect(migrate(entry)).toEqual(entry);
  });

  it("returns null for unknown schemaVersion", () => {
    const entry = makeEntry({ circuit: emptyCircuit(2), name: "x" });
    expect(migrate({ ...entry, schemaVersion: 99 })).toBe(null);
  });

  it("returns null for non-object input", () => {
    expect(migrate(null)).toBe(null);
    expect(migrate("garbage")).toBe(null);
  });
});

describe("makeEntry", () => {
  it("captures circuit qubits/steps in display fields", () => {
    const c = { qubits: 3, steps: [[], [], []] };
    const entry = makeEntry({ circuit: c, name: "test" });
    expect(entry.qubits).toBe(3);
    expect(entry.steps).toBe(3);
    expect(entry.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(entry.createdAt).toBe(entry.updatedAt);
    expect(entry.id).toMatch(ID_PATTERN);
  });
});
