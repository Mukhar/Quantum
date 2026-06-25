/**
 * Quantum Canvas Web Worker.
 *
 * Owns the parameter-sweep loop. Given a circuit and two rot-op slot
 * references, it runs `resolution × resolution` simulations, posting
 * one row's worth of metric values back per message so the main thread
 * can paint progressively.
 *
 * Why a worker: a 128×128 sweep is 16,384 simulator runs. On a 2 qubit
 * circuit that's <50 ms total but at 4 qubits with a deep circuit it
 * grows into "noticeable jank" territory. A worker keeps the composer
 * snappy under any load.
 *
 * Why we ship the simulator (not just data) here: the executor is ~5
 * KB after bundling and the alternative — serializing 16k state
 * vectors back to the main thread — is strictly worse.
 */
/// <reference lib="webworker" />

import { runCircuit, type Circuit, type Op } from "../quantum/circuit";
import { computeMetric, type Metric } from "./canvasMath";

export interface SweepParam {
  /** Index into circuit.steps. */
  stepIndex: number;
  /** Index into circuit.steps[stepIndex] — the op slot to overwrite. */
  opIndex: number;
}

export interface SweepRequest {
  type: "sweep";
  /** Monotonic id so the main thread can ignore stale messages. */
  jobId: number;
  circuit: Circuit;
  xParam: SweepParam;
  yParam: SweepParam;
  /** Pixels per side. 128 × 128 = 16,384 sims; keep ≤ 128 to stay snappy. */
  resolution: number;
  metric: Metric;
}

export type CancelRequest = { type: "cancel"; jobId: number };
export type CanvasInbound = SweepRequest | CancelRequest;

export type CanvasOutbound =
  | { type: "row"; jobId: number; row: number; data: Float32Array }
  | { type: "done"; jobId: number; durationMs: number }
  | { type: "error"; jobId: number; message: string };

/* -------------------------------------------------------------------------- */

const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope;

let cancelledJob = -1;

ctx.addEventListener("message", (ev: MessageEvent<CanvasInbound>) => {
  const msg = ev.data;
  if (!msg || typeof msg !== "object") return;
  if (msg.type === "cancel") {
    cancelledJob = msg.jobId;
    return;
  }
  if (msg.type === "sweep") {
    try {
      runSweep(msg);
    } catch (err) {
      const post: CanvasOutbound = {
        type: "error",
        jobId: msg.jobId,
        message: (err as Error).message ?? String(err),
      };
      ctx.postMessage(post);
    }
  }
});

function runSweep(req: SweepRequest): void {
  const { jobId, circuit, xParam, yParam, resolution, metric } = req;
  const n = Math.max(2, Math.min(256, Math.floor(resolution)));
  const started = Date.now();

  // Sanity: both slot refs must point at rot ops in the supplied circuit.
  assertRotSlot(circuit, xParam, "xParam");
  assertRotSlot(circuit, yParam, "yParam");

  // Stripping measure ops upfront keeps results deterministic and saves
  // the cost of a (collapsing) RNG path inside the inner loop.
  const base = stripMeasures(circuit);

  const TAU = Math.PI * 2;
  for (let yi = 0; yi < n; yi++) {
    if (cancelledJob === jobId) return;
    const yT = (yi / (n - 1)) * TAU;
    const rowBuf = new Float32Array(n);
    for (let xi = 0; xi < n; xi++) {
      const xT = (xi / (n - 1)) * TAU;
      const probe = setTheta(setTheta(base, xParam, xT), yParam, yT);
      const { sim } = runCircuit(probe);
      rowBuf[xi] = computeMetric(sim.state, metric);
    }
    const out: CanvasOutbound = { type: "row", jobId, row: yi, data: rowBuf };
    // Transfer the buffer to avoid a memcpy per row.
    ctx.postMessage(out, [rowBuf.buffer]);
  }
  const done: CanvasOutbound = {
    type: "done",
    jobId,
    durationMs: Date.now() - started,
  };
  ctx.postMessage(done);
}

/* -------------------------------------------------------------------------- */
/* Circuit-mutation helpers (local to keep worker self-contained) ----------- */

function setTheta(c: Circuit, slot: SweepParam, theta: number): Circuit {
  const steps = c.steps.slice();
  const step = steps[slot.stepIndex].slice();
  const op = step[slot.opIndex];
  if (!op || op.kind !== "rot") {
    throw new Error(
      `slot (step=${slot.stepIndex}, op=${slot.opIndex}) is not a rot op`,
    );
  }
  step[slot.opIndex] = { ...op, theta };
  steps[slot.stepIndex] = step;
  return { qubits: c.qubits, steps };
}

function stripMeasures(c: Circuit): Circuit {
  const steps = c.steps.map((s) => s.filter((o: Op) => o.kind !== "measure"));
  return { qubits: c.qubits, steps };
}

function assertRotSlot(c: Circuit, slot: SweepParam, label: string): void {
  const step = c.steps[slot.stepIndex];
  if (!step) throw new Error(`${label}: step ${slot.stepIndex} out of range`);
  const op = step[slot.opIndex];
  if (!op) throw new Error(`${label}: op ${slot.opIndex} not in step`);
  if (op.kind !== "rot") {
    throw new Error(`${label}: targeted op is ${op.kind}, expected rot`);
  }
}

// Astro/Vite needs this file to be a module worker, and tsc demands an
// export to treat it as one when isolated-modules is on.
export {};
