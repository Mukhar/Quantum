/**
 * Typed re-export shim for `src/data/molecules.json`.
 *
 * Why a shim? `molecules.json` is the source of truth — committed to git,
 * validated by `tests/data/molecules.test.ts`, and consumed at SSR time by
 * `MoleculeGallery.astro` (Plan 06-04). The JSON file's inferred TS type
 * (from `resolveJsonModule`) is a structural mess of literals; this shim
 * narrows it to the canonical `Molecule` shape so consumers get a clean
 * import surface and editors get useful autocomplete.
 *
 * Locks D-22..D-26: three molecules, energy stored in both Hartree and eV,
 * `ansatz_ops` round-trips through `validateCircuit`, pre-baked label, all
 * `qubits` ≤ `MAX_QUBITS = 4`.
 */

import data from "./molecules.json";
import type { Op } from "../lib/quantum/circuit";

/** Hartree → eV conversion factor used across the VQE essay and tests. */
export const HARTREE_TO_EV = 27.211386245988 as const;

/** Per-molecule schema. Mirrors `molecules.json` exactly. */
export interface Molecule {
  id: "h2" | "lih" | "hehplus";
  name: string;
  formula: string;
  description: string;
  equilibrium_distance_angstrom: number;
  qubits: number;
  ansatz_params: { theta1: number; theta2: number };
  /** Same shape as `Circuit.steps`. Round-trips through `validateCircuit`. */
  ansatz_ops: Op[][];
  energy_hartree: number;
  energy_ev: number;
  precomputed_note: string;
  source: string;
}

/**
 * Stable canonical ordering for UI surfaces. Tests assert this list is
 * exactly the keys of `MOLECULES` so adding a new molecule (or removing
 * one) without updating both fails CI.
 */
export const MOLECULE_IDS = ["h2", "hehplus", "lih"] as const;

/** All molecules keyed by canonical id. */
export const MOLECULES: Record<(typeof MOLECULE_IDS)[number], Molecule> =
  data as Record<(typeof MOLECULE_IDS)[number], Molecule>;
