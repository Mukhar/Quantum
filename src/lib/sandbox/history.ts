/**
 * Undo/redo history for the sandbox circuit.
 *
 * Strategy: snapshot the prev circuit on every `commit()` (we already
 * funnel all mutations through `commit`, so this is one subscription).
 * Bounded to 100 entries — plenty for a creative session, predictable
 * for `localStorage` size.
 *
 * Public API is intentionally tiny — `undo()`, `redo()`, `canUndo`,
 * `canRedo` signals so the UI can dim/disable buttons reactively.
 */
import { signal, type Signal } from "./signal";
import { circuit, onCommit } from "./store";
import type { Circuit } from "../quantum/circuit";

const MAX_HISTORY = 100;

const undoStack: Circuit[] = [];
const redoStack: Circuit[] = [];

export const canUndo: Signal<boolean> = signal(false);
export const canRedo: Signal<boolean> = signal(false);

let suppressNext = false;

function refreshFlags() {
  canUndo.set(undoStack.length > 0);
  canRedo.set(redoStack.length > 0);
}

export function initHistory() {
  onCommit((prev, _next) => {
    if (suppressNext) {
      suppressNext = false;
      return;
    }
    undoStack.push(prev);
    if (undoStack.length > MAX_HISTORY) undoStack.shift();
    // Any new edit invalidates the redo stack.
    redoStack.length = 0;
    refreshFlags();
  });
}

export function undo(): boolean {
  const prev = undoStack.pop();
  if (!prev) return false;
  redoStack.push(circuit.value);
  suppressNext = true;
  circuit.set(prev);
  refreshFlags();
  return true;
}

export function redo(): boolean {
  const next = redoStack.pop();
  if (!next) return false;
  undoStack.push(circuit.value);
  suppressNext = true;
  circuit.set(next);
  refreshFlags();
  return true;
}

/** Test helper. */
export function _resetHistory() {
  undoStack.length = 0;
  redoStack.length = 0;
  suppressNext = false;
  refreshFlags();
}
