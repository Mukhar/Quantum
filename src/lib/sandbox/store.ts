/**
 * Sandbox-wide reactive state.
 *
 * Uses the tiny in-repo `signal<T>` primitive (see ./signal.ts and
 * CONTEXT 03 §Reactivity). Mutations flow through `commit()` so that
 * Plan 03-03's history/URL-hydration layer has exactly one chokepoint
 * to wrap.
 */
import { signal, compute, type Signal } from "./signal";
import {
  emptyCircuit,
  validateCircuit,
  type Circuit,
  type Op,
} from "../quantum/circuit";

export const DEFAULT_QUBITS = 2;
export const DEFAULT_STEPS = 8;

export interface SelectedCell {
  qubit: number;
  step: number;
}

export interface DraggingGate {
  kind: "X" | "Y" | "Z" | "H" | "S" | "T" | "I" | "CNOT" | "Rx" | "Ry" | "Rz" | "measure";
  /** Optional θ pre-fill for rot drags (defaults to π/2). */
  theta?: number;
}

export interface ToastMsg {
  id: number;
  message: string;
  kind: "info" | "error";
}

/* -------------------------------------------------------------------------- */
/* Signals -------------------------------------------------------------------- */

export const circuit: Signal<Circuit> = signal(
  padToVisibleSteps(emptyCircuit(DEFAULT_QUBITS), DEFAULT_STEPS),
);

export const selectedCell: Signal<SelectedCell> = signal({ qubit: 0, step: 0 });
export const draggingGate: Signal<DraggingGate | null> = signal<DraggingGate | null>(null);
export const toast: Signal<ToastMsg | null> = signal<ToastMsg | null>(null);

let toastSeq = 0;
export function showToast(message: string, kind: "info" | "error" = "info") {
  toastSeq += 1;
  toast.set({ id: toastSeq, message, kind });
}

/* -------------------------------------------------------------------------- */
/* Derived ------------------------------------------------------------------- */

export const visibleSteps: Signal<number> = compute(
  [circuit as Signal<unknown>],
  () => Math.max(DEFAULT_STEPS, circuit.value.steps.length),
);

/* -------------------------------------------------------------------------- */
/* Pure helpers (no side effects, no signal writes) ------------------------- */

export function padToVisibleSteps(c: Circuit, nSteps: number): Circuit {
  if (c.steps.length >= nSteps) return c;
  const filler: Op[][] = [];
  for (let i = c.steps.length; i < nSteps; i++) filler.push([]);
  return { qubits: c.qubits, steps: [...c.steps, ...filler] };
}

export function removeOpAt(c: Circuit, qubit: number, step: number): Circuit {
  if (step < 0 || step >= c.steps.length) return c;
  const next = c.steps[step].filter((op) => !opQubitsLocal(op).includes(qubit));
  if (next.length === c.steps[step].length) return c;
  const steps = c.steps.slice();
  steps[step] = next;
  return { qubits: c.qubits, steps };
}

export function placeOp(c: Circuit, op: Op, step: number): Circuit {
  const qs = opQubitsLocal(op);
  let working = c;
  if (step >= working.steps.length) working = padToVisibleSteps(working, step + 1);
  for (const q of qs) working = removeOpAt(working, q, step);
  const stepOps = working.steps[step].slice();
  stepOps.push(op);
  const steps = working.steps.slice();
  steps[step] = stepOps;
  const next: Circuit = { qubits: working.qubits, steps };
  validateCircuit(next);
  return next;
}

export function setQubits(c: Circuit, qubits: number): Circuit {
  const steps = c.steps.map((step) =>
    step.filter((op) => opQubitsLocal(op).every((q) => q < qubits)),
  );
  return { qubits, steps };
}

function opQubitsLocal(op: Op): number[] {
  switch (op.kind) {
    case "gate":
    case "rot":
    case "measure":
      return [op.qubit];
    case "cnot":
      return [op.control, op.target];
  }
}

/* -------------------------------------------------------------------------- */
/* Commit funnel — single mutation chokepoint ------------------------------- */

let commitListeners: Array<(prev: Circuit, next: Circuit) => void> = [];

export function onCommit(cb: (prev: Circuit, next: Circuit) => void): () => void {
  commitListeners.push(cb);
  return () => {
    commitListeners = commitListeners.filter((l) => l !== cb);
  };
}

export function commit(mutator: (c: Circuit) => Circuit) {
  const prev = circuit.value;
  let next: Circuit;
  try {
    next = mutator(prev);
  } catch (err) {
    showToast(`Bad edit: ${(err as Error).message}`, "error");
    return;
  }
  if (next === prev) return;
  circuit.set(next);
  for (const cb of commitListeners) cb(prev, next);
}

/* -------------------------------------------------------------------------- */
/* Lookups ------------------------------------------------------------------- */

export function opAt(c: Circuit, qubit: number, step: number): Op | null {
  if (step < 0 || step >= c.steps.length) return null;
  for (const op of c.steps[step]) {
    if (op.kind === "cnot") {
      if (op.control === qubit || op.target === qubit) return op;
    } else if (op.qubit === qubit) {
      return op;
    }
  }
  return null;
}
