/**
 * Quantum Tones client — Web Audio sequencer + offline WAV renderer.
 *
 * Mirrors the lifecycle of `canvas.client.ts`:
 *   1. Lazy mount via the page-level IntersectionObserver (zero cost
 *      until the section scrolls into view).
 *   2. AudioContext is *never* constructed at mount time — only on the
 *      first user gesture that asks for sound (Play). This keeps us
 *      well clear of every browser autoplay heuristic.
 *   3. Sequencing uses a single OscillatorNode per note with a short
 *      AR envelope on a GainNode. Cheap, deterministic, sounds fine
 *      for the "measure 16 times and pluck a pitch" use case.
 *   4. "Download WAV" re-renders the *same* sequence offline as a sum
 *      of sines into a Float32Array, then hands it to `wav.ts` and
 *      ships the blob as a download. We deliberately don't reuse the
 *      AudioContext — OfflineAudioContext support is inconsistent in
 *      headless test environments and the math is 20 lines.
 *
 * Total playback is capped at 4 s by design (toast + truncate). Long
 * enough to hear a pattern, short enough nobody synthesizes a drone
 * by accident.
 */
import { circuit, showToast } from "./store";
import { runCircuit, type Circuit, type Op } from "../quantum/circuit";

const MAX_DURATION_S = 4;
const SAMPLE_RATE = 44100;
const ATTACK_S = 0.005;
const RELEASE_S = 0.04;
/** Fraction of a beat the note actually sounds for (rest = silence). */
const NOTE_DUTY = 0.85;
const MASTER_GAIN = 0.18;

type Scale = "chromatic" | "major" | "pentatonic";
type BaseNote = "C3" | "C4" | "A4";

const SCALE_DEGREES: Record<Scale, number[]> = {
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  major: [0, 2, 4, 5, 7, 9, 11],
  pentatonic: [0, 3, 5, 7, 10],
};

const BASE_MIDI: Record<BaseNote, number> = {
  C3: 48,
  C4: 60,
  A4: 69,
};

interface TonesRefs {
  root: HTMLElement;
  mappingSel: HTMLSelectElement;
  baseSel: HTMLSelectElement;
  stepsInput: HTMLInputElement;
  tempoInput: HTMLInputElement;
  tempoLabel: HTMLElement;
  playBtn: HTMLButtonElement;
  stopBtn: HTMLButtonElement;
  downloadBtn: HTMLButtonElement;
  stepBadge: HTMLElement;
  status: HTMLElement;
}

interface TonesState {
  ctx: AudioContext | null;
  /** Nodes scheduled for the current play session, in case Stop hits. */
  scheduled: Array<{ osc: OscillatorNode; gain: GainNode; stopAt: number }>;
  rafId: number | null;
  /** Number of rot/measure slots in the latest circuit, for Play gating. */
  hasContent: boolean;
}

let mounted = false;

export function mountTones(root: HTMLElement): void {
  if (mounted) return;
  const refs = collectRefs(root);
  if (!refs) return;
  mounted = true;

  const state: TonesState = {
    ctx: null,
    scheduled: [],
    rafId: null,
    hasContent: false,
  };

  refs.tempoInput.addEventListener("input", () => {
    refs.tempoLabel.textContent = String(refs.tempoInput.valueAsNumber || 120);
  });

  refs.playBtn.addEventListener("click", () => {
    play(refs, state).catch((err) => {
      refs.status.textContent = `Playback failed: ${(err as Error).message}`;
      resetButtons(refs);
    });
  });
  refs.stopBtn.addEventListener("click", () => stop(refs, state));
  refs.downloadBtn.addEventListener("click", () => {
    try {
      download(refs);
    } catch (err) {
      refs.status.textContent = `Render failed: ${(err as Error).message}`;
    }
  });

  // Keep the Play button accurate as the user edits the circuit. The
  // sequencer needs *something* to measure — an empty circuit just
  // collapses to |0…0⟩ every time and would emit one note on a loop.
  const refresh = () => {
    state.hasContent = hasMeaningfulOps(circuit.value);
    refs.playBtn.disabled = !state.hasContent;
    if (!state.hasContent) {
      refs.status.textContent =
        "Drop at least one gate so there's something to measure.";
    } else if (refs.status.textContent?.startsWith("Drop") ?? false) {
      refs.status.textContent = "Idle";
    }
  };
  refresh();
  circuit.subscribe(refresh);
}

/* -------------------------------------------------------------------------- */
/* Playback ------------------------------------------------------------------ */

async function play(refs: TonesRefs, state: TonesState): Promise<void> {
  if (!state.hasContent) return;

  // Cancel any in-flight session first — clicking Play twice should
  // restart cleanly, not layer two streams on top of each other.
  stop(refs, state);

  const plan = planSequence(refs);
  if (!plan) return;

  const ctx = ensureContext(state);
  // Browsers occasionally pause the context (tab switch); resume is
  // safe to call even when the context is already "running".
  if (ctx.state === "suspended") {
    await ctx.resume();
  }

  const master = ctx.createGain();
  master.gain.value = MASTER_GAIN;
  master.connect(ctx.destination);

  const start = ctx.currentTime + 0.05; // tiny pre-roll for clean attack
  const beatDur = 60 / plan.bpm;
  const noteDur = beatDur * NOTE_DUTY;

  for (let i = 0; i < plan.freqs.length; i++) {
    const at = start + i * beatDur;
    const stopAt = at + noteDur + RELEASE_S;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = plan.freqs[i];

    const env = ctx.createGain();
    env.gain.setValueAtTime(0, at);
    env.gain.linearRampToValueAtTime(1, at + ATTACK_S);
    env.gain.setValueAtTime(1, at + noteDur);
    env.gain.linearRampToValueAtTime(0, at + noteDur + RELEASE_S);

    osc.connect(env).connect(master);
    osc.start(at);
    osc.stop(stopAt);

    state.scheduled.push({ osc, gain: env, stopAt });
  }

  refs.playBtn.disabled = true;
  refs.stopBtn.disabled = false;
  refs.status.textContent =
    `Playing · ${plan.freqs.length} notes @ ${plan.bpm} bpm` +
    (plan.truncated ? " (truncated to fit 4 s cap)" : "");

  if (plan.truncated) {
    showToast("Sequence truncated to 4 s. Try fewer steps or a faster tempo.", "info");
  }

  // Visual step indicator — driven off `currentTime`, not setInterval,
  // so it stays in sync with the audio even if the tab throttles rAF.
  tickStepBadge(ctx, refs, state, start, beatDur, plan.freqs.length);
}

function tickStepBadge(
  ctx: AudioContext,
  refs: TonesRefs,
  state: TonesState,
  start: number,
  beatDur: number,
  count: number,
): void {
  refs.stepBadge.setAttribute("aria-hidden", "false");
  const loop = () => {
    const now = ctx.currentTime;
    const i = Math.floor((now - start) / beatDur);
    if (i < 0) {
      refs.stepBadge.textContent = "0";
    } else if (i >= count) {
      refs.stepBadge.textContent = String(count);
      refs.stepBadge.setAttribute("aria-hidden", "true");
      refs.status.textContent = "Done";
      resetButtons(refs);
      state.rafId = null;
      return;
    } else {
      refs.stepBadge.textContent = String(i + 1);
    }
    state.rafId = requestAnimationFrame(loop);
  };
  state.rafId = requestAnimationFrame(loop);
}

function stop(refs: TonesRefs, state: TonesState): void {
  if (state.rafId !== null) {
    cancelAnimationFrame(state.rafId);
    state.rafId = null;
  }
  if (state.scheduled.length === 0) {
    resetButtons(refs);
    return;
  }
  const ctx = state.ctx;
  const now = ctx ? ctx.currentTime : 0;
  for (const { osc, gain, stopAt } of state.scheduled) {
    if (stopAt > now) {
      try {
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.02);
        osc.stop(now + 0.03);
      } catch {
        // Already stopped or never started — ignore.
      }
    }
  }
  state.scheduled = [];
  refs.stepBadge.textContent = "—";
  refs.stepBadge.setAttribute("aria-hidden", "true");
  refs.status.textContent = "Stopped";
  resetButtons(refs);
}

function resetButtons(refs: TonesRefs): void {
  refs.playBtn.disabled = false;
  refs.stopBtn.disabled = true;
}

function ensureContext(state: TonesState): AudioContext {
  if (state.ctx) return state.ctx;
  const Ctor: typeof AudioContext | undefined =
    (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) {
    throw new Error("Web Audio not supported in this browser.");
  }
  state.ctx = new Ctor({ sampleRate: SAMPLE_RATE });
  return state.ctx;
}

/* -------------------------------------------------------------------------- */
/* Offline render → WAV ------------------------------------------------------ */

async function download(refs: TonesRefs): Promise<void> {
  const plan = planSequence(refs);
  if (!plan) return;

  refs.status.textContent = "Rendering WAV…";
  // Yield once so the status repaint actually lands before the render
  // blocks the main thread — for a 4 s mono buffer that's ~700 ms of
  // float math in the worst case, plenty of time to feel laggy.
  await new Promise((r) => setTimeout(r, 0));

  const { encodeWav } = await import("./wav");
  const samples = renderOffline(plan);
  const wav = encodeWav(samples, SAMPLE_RATE);
  // Cast the underlying buffer slice into a fresh ArrayBuffer view —
  // TS 5.7 narrowed `Uint8Array<ArrayBufferLike>` to disallow direct
  // BlobPart use because it could hide a SharedArrayBuffer. Slicing
  // guarantees an honest ArrayBuffer and only costs one extra alloc.
  const wavBuf = wav.buffer.slice(wav.byteOffset, wav.byteOffset + wav.byteLength) as ArrayBuffer;
  const blob = new Blob([wavBuf], { type: "audio/wav" });

  const ts = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", "_")
    .slice(0, 19);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `quantum-tones-${ts}.wav`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);

  refs.status.textContent =
    `WAV ready · ${plan.freqs.length} notes · ${(samples.length / SAMPLE_RATE).toFixed(2)} s.`;
  showToast("Tones saved.", "info");
}

function renderOffline(plan: SequencePlan): Float32Array {
  const beatDur = 60 / plan.bpm;
  const noteDur = beatDur * NOTE_DUTY;
  const totalS = plan.freqs.length * beatDur;
  const totalSamples = Math.ceil(totalS * SAMPLE_RATE);
  const out = new Float32Array(totalSamples);

  const noteSamples = Math.floor(noteDur * SAMPLE_RATE);
  const attack = Math.max(1, Math.floor(ATTACK_S * SAMPLE_RATE));
  const release = Math.max(1, Math.floor(RELEASE_S * SAMPLE_RATE));

  for (let i = 0; i < plan.freqs.length; i++) {
    const startSample = Math.floor(i * beatDur * SAMPLE_RATE);
    const freq = plan.freqs[i];
    const twoPiF = 2 * Math.PI * freq;
    const totalNote = noteSamples + release;
    for (let n = 0; n < totalNote; n++) {
      const idx = startSample + n;
      if (idx >= out.length) break;
      const t = n / SAMPLE_RATE;
      // AR envelope: linear up over `attack`, hold, linear down over `release`.
      let env: number;
      if (n < attack) {
        env = n / attack;
      } else if (n < noteSamples) {
        env = 1;
      } else {
        env = 1 - (n - noteSamples) / release;
      }
      out[idx] += MASTER_GAIN * env * Math.sin(twoPiF * t);
    }
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/* Planning ------------------------------------------------------------------ */

interface SequencePlan {
  freqs: number[];
  bpm: number;
  truncated: boolean;
}

function planSequence(refs: TonesRefs): SequencePlan | null {
  const scale = (refs.mappingSel.value as Scale) || "major";
  const base = (refs.baseSel.value as BaseNote) || "C4";
  const requestedSteps = clamp(refs.stepsInput.valueAsNumber || 16, 4, 32);
  const bpm = clamp(refs.tempoInput.valueAsNumber || 120, 60, 180);

  const beatDur = 60 / bpm;
  const maxSteps = Math.max(1, Math.floor(MAX_DURATION_S / beatDur));
  const steps = Math.min(requestedSteps, maxSteps);
  const truncated = steps < requestedSteps;

  const degrees = SCALE_DEGREES[scale];
  const baseMidi = BASE_MIDI[base];

  // Each measurement gets a fresh circuit run with a different RNG seed.
  // The circuit is captured by value at planning time so a mid-render
  // edit doesn't muddy the sequence.
  const snap = snapshot(circuit.value);
  const rng = mulberry32(0xc0ffee ^ requestedSteps ^ bpm);
  const freqs: number[] = [];
  for (let i = 0; i < steps; i++) {
    const { sim } = runCircuit(snap, rng);
    const outcome = sim.measure(rng);
    freqs.push(outcomeToFreq(outcome, degrees, baseMidi));
  }
  return { freqs, bpm, truncated };
}

function outcomeToFreq(outcome: number, degrees: number[], baseMidi: number): number {
  // Wrap large basis indices across octaves so 4-qubit measurements
  // (0–15) stretch beyond the scale instead of saturating at the top.
  const octave = Math.floor(outcome / degrees.length);
  const degree = degrees[outcome % degrees.length];
  const midi = baseMidi + degree + octave * 12;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function hasMeaningfulOps(c: Circuit): boolean {
  for (const step of c.steps) {
    for (const op of step) {
      if (op.kind !== "measure") return true;
    }
  }
  return false;
}

function snapshot(c: Circuit): Circuit {
  return {
    qubits: c.qubits,
    steps: c.steps.map((s) => s.map((op) => ({ ...op } as Op))),
  };
}

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}

/**
 * Deterministic PRNG so a Play→Download pair sound the same on the
 * same controls. (Math.random would make every render unique, which
 * is fun but confusing.)
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* -------------------------------------------------------------------------- */
/* DOM glue ------------------------------------------------------------------ */

function collectRefs(root: HTMLElement): TonesRefs | null {
  const mappingSel = root.querySelector<HTMLSelectElement>("[data-tones-mapping]");
  const baseSel = root.querySelector<HTMLSelectElement>("[data-tones-base]");
  const stepsInput = root.querySelector<HTMLInputElement>("[data-tones-steps]");
  const tempoInput = root.querySelector<HTMLInputElement>("[data-tones-tempo]");
  const tempoLabel = root.querySelector<HTMLElement>("[data-tones-tempo-label]");
  const playBtn = root.querySelector<HTMLButtonElement>('[data-action="play"]');
  const stopBtn = root.querySelector<HTMLButtonElement>('[data-action="stop"]');
  const downloadBtn = root.querySelector<HTMLButtonElement>('[data-action="download"]');
  const stepBadge = root.querySelector<HTMLElement>("[data-tones-step]");
  const status = root.querySelector<HTMLElement>("[data-tones-status]");

  if (
    !mappingSel || !baseSel || !stepsInput || !tempoInput || !tempoLabel ||
    !playBtn || !stopBtn || !downloadBtn || !stepBadge || !status
  ) {
    console.warn("[QuantumTones] missing DOM nodes; skipping mount");
    return null;
  }
  return {
    root, mappingSel, baseSel, stepsInput, tempoInput, tempoLabel,
    playBtn, stopBtn, downloadBtn, stepBadge, status,
  };
}
