/**
 * Quantum Canvas client — DOM hydrator + worker driver.
 *
 * Responsibilities:
 *   1. Discover rot-op slots in the current circuit and populate the
 *      X-axis / Y-axis pickers.
 *   2. On "Run sweep", spawn (or reuse) the worker, ship the circuit
 *      + slot refs, and paint the worker's row messages into the
 *      <canvas>.
 *   3. Honor `prefers-reduced-motion`: buffer all rows then paint once.
 *   4. "Download PNG" via canvas.toBlob.
 *   5. Stay subscribed to the sandbox circuit signal so the pickers
 *      reflect the latest gate slots (but NEVER auto-run a sweep —
 *      the user controls when to spend 16k simulations).
 */
import { circuit, showToast } from "./store";
import type { Circuit, Op } from "../quantum/circuit";
import {
  paletteByName,
  type PaletteName,
  type Metric,
} from "./canvasMath";
import type {
  CanvasInbound,
  CanvasOutbound,
  SweepParam,
} from "./canvasWorker";

const TAU = Math.PI * 2;

interface RotSlot {
  stepIndex: number;
  opIndex: number;
  axis: "X" | "Y" | "Z";
  qubit: number;
  theta: number;
}

interface CanvasRefs {
  root: HTMLElement;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  paletteSel: HTMLSelectElement;
  customWrap: HTMLElement;
  color0: HTMLInputElement;
  color1: HTMLInputElement;
  xSel: HTMLSelectElement;
  ySel: HTMLSelectElement;
  metricSel: HTMLSelectElement;
  resolutionSel: HTMLSelectElement;
  runBtn: HTMLButtonElement;
  cancelBtn: HTMLButtonElement;
  pngBtn: HTMLButtonElement;
  status: HTMLElement;
}

interface CanvasState {
  worker: Worker | null;
  jobId: number;
  pending: number; // rows still expected for the current job
  reducedMotion: boolean;
  bufferedRows: Array<{ row: number; data: Float32Array }> | null;
  resolution: number;
  lastSlots: RotSlot[];
}

let mounted = false;

export function mountCanvas(root: HTMLElement): void {
  if (mounted) return; // worker spawn is expensive; one canvas per page
  const refs = collectRefs(root);
  if (!refs) return;
  mounted = true;

  const state: CanvasState = {
    worker: null,
    jobId: 0,
    pending: 0,
    reducedMotion: prefersReducedMotion(),
    bufferedRows: null,
    resolution: parseInt(refs.resolutionSel.value, 10) || 64,
    lastSlots: [],
  };

  // Initial cosmetics — solid background so an empty canvas isn't a white slab.
  paintBackground(refs);

  // Wire up palette picker visibility toggle.
  refs.paletteSel.addEventListener("change", () => {
    refs.customWrap.hidden = refs.paletteSel.value !== "custom";
  });

  refs.runBtn.addEventListener("click", () => startSweep(refs, state));
  refs.cancelBtn.addEventListener("click", () => cancelSweep(refs, state));
  refs.pngBtn.addEventListener("click", () => downloadPng(refs));

  // Keep the axis selectors in sync with the live circuit. Cheap — a
  // 4×64 circuit has at most 256 ops to scan and we only re-run on
  // commit-driven changes.
  const refreshPickers = () => {
    const slots = enumerateRotSlots(circuit.value);
    state.lastSlots = slots;
    populateAxisPicker(refs.xSel, slots, 0);
    populateAxisPicker(refs.ySel, slots, Math.min(1, slots.length - 1));
    refs.status.textContent = slots.length < 2
      ? "Add at least two Rx/Ry/Rz gates to the circuit to enable a sweep."
      : "Ready. Pick two axes and run the sweep.";
    refs.runBtn.disabled = slots.length < 2;
  };

  circuit.subscribe(refreshPickers);

  // Reduced-motion preference can change mid-session (system settings).
  if (typeof window.matchMedia === "function") {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => {
      state.reducedMotion = mq.matches;
    };
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", onChange);
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Sweep lifecycle ----------------------------------------------------------- */

function startSweep(refs: CanvasRefs, state: CanvasState): void {
  const slots = state.lastSlots;
  const xIdx = parseInt(refs.xSel.value, 10);
  const yIdx = parseInt(refs.ySel.value, 10);
  if (!Number.isFinite(xIdx) || !Number.isFinite(yIdx)) {
    showToast("Pick a slot for both axes first.", "error");
    return;
  }
  if (xIdx === yIdx) {
    showToast("Pick two different rot slots for X and Y.", "error");
    return;
  }
  const xSlot = slots[xIdx];
  const ySlot = slots[yIdx];
  if (!xSlot || !ySlot) {
    showToast("Selected slot no longer exists. Re-pick.", "error");
    return;
  }

  state.resolution = parseInt(refs.resolutionSel.value, 10) || 64;
  state.jobId += 1;
  state.pending = state.resolution;
  state.bufferedRows = state.reducedMotion ? [] : null;

  // Resize the backing buffer to the chosen resolution (the CSS width
  // is fixed; we just scale pixels-per-cell to fit).
  refs.canvas.width = state.resolution;
  refs.canvas.height = state.resolution;
  // Smoothing off so individual cells are crisp when scaled up.
  refs.ctx.imageSmoothingEnabled = false;
  paintBackground(refs);

  refs.runBtn.disabled = true;
  refs.cancelBtn.disabled = false;
  refs.status.textContent = `Sweeping ${state.resolution}×${state.resolution}…`;

  const worker = ensureWorker(refs, state);

  const req: CanvasInbound = {
    type: "sweep",
    jobId: state.jobId,
    circuit: snapshot(circuit.value),
    xParam: toParam(xSlot),
    yParam: toParam(ySlot),
    resolution: state.resolution,
    metric: refs.metricSel.value as Metric,
  };
  worker.postMessage(req);
}

function cancelSweep(refs: CanvasRefs, state: CanvasState): void {
  if (!state.worker || state.pending === 0) return;
  const msg: CanvasInbound = { type: "cancel", jobId: state.jobId };
  state.worker.postMessage(msg);
  state.pending = 0;
  state.bufferedRows = null;
  refs.runBtn.disabled = false;
  refs.cancelBtn.disabled = true;
  refs.status.textContent = "Sweep cancelled.";
}

function ensureWorker(refs: CanvasRefs, state: CanvasState): Worker {
  if (state.worker) return state.worker;
  // Vite's URL-based worker spawn → emits a separately-bundled chunk.
  const worker = new Worker(
    new URL("./canvasWorker.ts", import.meta.url),
    { type: "module" },
  );
  worker.addEventListener("message", (ev: MessageEvent<CanvasOutbound>) =>
    onWorkerMessage(refs, state, ev.data),
  );
  worker.addEventListener("error", (err) => {
    refs.status.textContent = `Worker error: ${err.message}`;
    refs.runBtn.disabled = false;
    refs.cancelBtn.disabled = true;
  });
  state.worker = worker;
  return worker;
}

function onWorkerMessage(
  refs: CanvasRefs,
  state: CanvasState,
  msg: CanvasOutbound,
): void {
  if (msg.jobId !== state.jobId) return; // stale message, ignore
  if (msg.type === "error") {
    refs.status.textContent = `Sweep failed: ${msg.message}`;
    refs.runBtn.disabled = false;
    refs.cancelBtn.disabled = true;
    return;
  }
  if (msg.type === "row") {
    if (state.bufferedRows) {
      state.bufferedRows.push({ row: msg.row, data: msg.data });
    } else {
      paintRow(refs, msg.row, msg.data);
    }
    state.pending -= 1;
    return;
  }
  // done
  if (state.bufferedRows) {
    for (const { row, data } of state.bufferedRows) paintRow(refs, row, data);
    state.bufferedRows = null;
  }
  refs.runBtn.disabled = false;
  refs.cancelBtn.disabled = true;
  refs.status.textContent =
    `Sweep complete · ${state.resolution}×${state.resolution} ` +
    `in ${msg.durationMs} ms.`;
}

/* -------------------------------------------------------------------------- */
/* Painting ------------------------------------------------------------------ */

function paintRow(refs: CanvasRefs, row: number, data: Float32Array): void {
  const palette = paletteByName(
    refs.paletteSel.value as PaletteName,
    { c0: refs.color0.value, c1: refs.color1.value },
  );
  const img = refs.ctx.createImageData(data.length, 1);
  const buf = img.data;
  for (let x = 0; x < data.length; x++) {
    const [r, g, b] = palette(data[x]);
    const o = x * 4;
    buf[o] = r;
    buf[o + 1] = g;
    buf[o + 2] = b;
    buf[o + 3] = 255;
  }
  refs.ctx.putImageData(img, 0, row);
}

function paintBackground(refs: CanvasRefs): void {
  // Read --color-surface-elevated so the canvas blends with the
  // surrounding page chrome on both light and dark themes. Falls back
  // to slate-900 if document is unavailable (SSR / tests).
  let fill = "#0f172a";
  if (typeof document !== "undefined") {
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue("--color-surface-elevated")
      .trim();
    if (raw) {
      const parts = raw.split(/\s+/);
      if (parts.length >= 3) fill = `rgb(${parts[0]}, ${parts[1]}, ${parts[2]})`;
    }
  }
  refs.ctx.fillStyle = fill;
  refs.ctx.fillRect(0, 0, refs.canvas.width, refs.canvas.height);
}

/* -------------------------------------------------------------------------- */
/* PNG download -------------------------------------------------------------- */

function downloadPng(refs: CanvasRefs): void {
  refs.canvas.toBlob((blob) => {
    if (!blob) {
      showToast("Couldn't encode PNG — your browser said no.", "error");
      return;
    }
    const ts = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .replace("T", "_")
      .slice(0, 19);
    // The closest thing to PNG tEXt metadata we can ship dep-free is
    // smuggling the source circuit URL into the filename itself. Most
    // file systems are fine with `=` and `_`; some choke on `?` or `&`,
    // so we slugify aggressively. Real tEXt chunk writing needs ~100
    // lines of CRC32 — out of scope for this plan.
    const srcSlug = location.href
      .replace(/^https?:\/\//, "")
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(0, 60);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `quantum-canvas-${ts}__from_${srcSlug}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Revoke after a tick — Safari occasionally chokes on immediate revoke.
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    showToast("Canvas saved.", "info");
  }, "image/png");
}

/* -------------------------------------------------------------------------- */
/* Helpers ------------------------------------------------------------------- */

function collectRefs(root: HTMLElement): CanvasRefs | null {
  const canvas = root.querySelector<HTMLCanvasElement>("[data-quantum-canvas]");
  const ctx = canvas?.getContext("2d", { willReadFrequently: false }) ?? null;
  const paletteSel = root.querySelector<HTMLSelectElement>("[data-canvas-palette]");
  const customWrap = root.querySelector<HTMLElement>("[data-canvas-custom-wrap]");
  const color0 = root.querySelector<HTMLInputElement>("[data-canvas-color0]");
  const color1 = root.querySelector<HTMLInputElement>("[data-canvas-color1]");
  const xSel = root.querySelector<HTMLSelectElement>("[data-canvas-x]");
  const ySel = root.querySelector<HTMLSelectElement>("[data-canvas-y]");
  const metricSel = root.querySelector<HTMLSelectElement>("[data-canvas-metric]");
  const resolutionSel = root.querySelector<HTMLSelectElement>("[data-canvas-resolution]");
  const runBtn = root.querySelector<HTMLButtonElement>("[data-canvas-run]");
  const cancelBtn = root.querySelector<HTMLButtonElement>("[data-canvas-cancel]");
  const pngBtn = root.querySelector<HTMLButtonElement>("[data-canvas-png]");
  const status = root.querySelector<HTMLElement>("[data-canvas-status]");

  if (
    !canvas || !ctx || !paletteSel || !customWrap || !color0 || !color1 ||
    !xSel || !ySel || !metricSel || !resolutionSel ||
    !runBtn || !cancelBtn || !pngBtn || !status
  ) {
    console.warn("[QuantumCanvas] missing DOM nodes; skipping mount");
    return null;
  }
  return {
    root, canvas, ctx, paletteSel, customWrap, color0, color1,
    xSel, ySel, metricSel, resolutionSel, runBtn, cancelBtn, pngBtn, status,
  };
}

function enumerateRotSlots(c: Circuit): RotSlot[] {
  const out: RotSlot[] = [];
  for (let s = 0; s < c.steps.length; s++) {
    const step = c.steps[s];
    for (let o = 0; o < step.length; o++) {
      const op = step[o];
      if (op.kind === "rot") {
        out.push({
          stepIndex: s,
          opIndex: o,
          axis: op.axis,
          qubit: op.qubit,
          theta: op.theta,
        });
      }
    }
  }
  return out;
}

function populateAxisPicker(
  sel: HTMLSelectElement,
  slots: RotSlot[],
  defaultIndex: number,
): void {
  const prev = sel.value;
  sel.innerHTML = "";
  if (slots.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "no rot gates";
    sel.appendChild(opt);
    sel.disabled = true;
    return;
  }
  sel.disabled = false;
  slots.forEach((slot, i) => {
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = `R${slot.axis.toLowerCase()} · q${slot.qubit} · step ${slot.stepIndex}`;
    sel.appendChild(opt);
  });
  // Try to preserve selection across edits; fall back to the default.
  if (prev && Number(prev) < slots.length) {
    sel.value = prev;
  } else {
    sel.value = String(Math.min(defaultIndex, slots.length - 1));
  }
}

function toParam(slot: RotSlot): SweepParam {
  return { stepIndex: slot.stepIndex, opIndex: slot.opIndex };
}

/** Structured-clone-safe deep copy of a circuit. */
function snapshot(c: Circuit): Circuit {
  return {
    qubits: c.qubits,
    steps: c.steps.map((s) => s.map((op) => ({ ...op } as Op))),
  };
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
