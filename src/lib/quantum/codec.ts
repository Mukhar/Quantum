/**
 * URL-fragment codec for `Circuit`.
 *
 * Format (v1, little-byte-counting-shop):
 *
 *   byte 0       : version (currently 0x01)
 *   byte 1       : high nibble = qubits-1 (0..3); low nibble reserved=0
 *   bytes 2..3   : nSteps as uint16 BE
 *   then for each step:
 *     byte       : nOps in this step (0..4 in practice)
 *     for each op:
 *       byte tag : bits 7-5 kind (0 gate, 1 cnot, 2 rot, 3 measure)
 *                  bits 4-2 sub  (gate index, axis, or 0)
 *                  bits 1-0 q    (primary qubit 0..3)
 *       payload  : per-kind extra bytes (see below)
 *
 * Per-kind payload:
 *   gate   : 0 bytes — everything fits in the tag byte
 *            sub maps 0..6 → ['X','Y','Z','H','S','T','I']
 *   cnot   : 1 byte = (control<<4) | target. tag.sub = 0, tag.q ignored.
 *   rot    : 2 bytes θ as uint16 BE. Stored as quantize10(θ).
 *            sub maps 0..2 → ['X','Y','Z'] axis.
 *   measure: 0 bytes — qubit is in tag.q. sub = 0.
 *
 * θ quantization:
 *   q = round(((theta mod 2π) + 2π) mod 2π / (2π / 1024))
 *   That gives a 10-bit value 0..1023. We pad to 16 bits in the wire
 *   format so the codec stays byte-aligned (cheaper to (de)serialize
 *   than a real bit stream); upper 6 bits MUST be zero.
 *
 * Worst case (4 qubits × 20 steps × 4 rots/step) ≈ 980 bytes raw →
 * ~1316 base64url chars, well under the 2 KB advertised cap.
 *
 * The wire payload then goes through base64url (no padding) and lives
 * in `location.hash`. Anything malformed throws a typed error so the
 * caller can show a friendly toast instead of crashing the page.
 */

import type { Circuit, DiscreteGate, Op, RotAxis } from "./circuit";
import { MAX_QUBITS, MAX_STEPS, validateCircuit } from "./circuit";

export const CODEC_VERSION = 0x01 as const;
const GATE_NAMES: readonly DiscreteGate[] = ["X", "Y", "Z", "H", "S", "T", "I"];
const AXIS_NAMES: readonly RotAxis[] = ["X", "Y", "Z"];
const TWO_PI = Math.PI * 2;
const THETA_STEPS = 1024;

export class CodecError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CodecError";
  }
}

export class UnsupportedVersionError extends CodecError {
  constructor(public readonly seen: number) {
    super(`Unsupported codec version: 0x${seen.toString(16).padStart(2, "0")}`);
    this.name = "UnsupportedVersionError";
  }
}

/* -------------------------------------------------------------------------- */
/* Encode --------------------------------------------------------------------- */

export const encodeCircuit = (c: Circuit): string => {
  validateCircuit(c);
  if (c.steps.length > 0xffff) {
    throw new CodecError(`steps overflow uint16: ${c.steps.length}`);
  }

  const out: number[] = [];
  out.push(CODEC_VERSION);
  out.push(((c.qubits - 1) & 0x03) << 4);
  out.push((c.steps.length >> 8) & 0xff);
  out.push(c.steps.length & 0xff);

  for (const step of c.steps) {
    if (step.length > 0xff) {
      throw new CodecError(`step too dense (>255 ops)`);
    }
    out.push(step.length);
    for (const op of step) encodeOp(op, out);
  }

  return bytesToBase64Url(Uint8Array.from(out));
};

function encodeOp(op: Op, out: number[]) {
  switch (op.kind) {
    case "gate": {
      const sub = GATE_NAMES.indexOf(op.gate);
      if (sub < 0) throw new CodecError(`unknown gate: ${op.gate}`);
      out.push(tag(0, sub, op.qubit));
      return;
    }
    case "cnot":
      out.push(tag(1, 0, 0));
      out.push(((op.control & 0x0f) << 4) | (op.target & 0x0f));
      return;
    case "rot": {
      const sub = AXIS_NAMES.indexOf(op.axis);
      if (sub < 0) throw new CodecError(`unknown rot axis: ${op.axis}`);
      const q = quantizeTheta(op.theta);
      out.push(tag(2, sub, op.qubit));
      out.push((q >> 8) & 0xff);
      out.push(q & 0xff);
      return;
    }
    case "measure":
      out.push(tag(3, 0, op.qubit));
      return;
  }
}

const tag = (kind: number, sub: number, qubit: number): number =>
  ((kind & 0x07) << 5) | ((sub & 0x07) << 2) | (qubit & 0x03);

const quantizeTheta = (theta: number): number => {
  if (!Number.isFinite(theta)) throw new CodecError("θ must be finite");
  // Wrap into [0, 2π) — symmetric for all three rotation axes.
  const wrapped = ((theta % TWO_PI) + TWO_PI) % TWO_PI;
  return Math.round((wrapped / TWO_PI) * THETA_STEPS) % THETA_STEPS;
};

const dequantizeTheta = (q: number): number => (q / THETA_STEPS) * TWO_PI;

/* -------------------------------------------------------------------------- */
/* Decode --------------------------------------------------------------------- */

export const decodeCircuit = (fragment: string): Circuit => {
  let bytes: Uint8Array;
  try {
    bytes = base64UrlToBytes(stripHash(fragment));
  } catch (err) {
    throw new CodecError(`fragment is not valid base64url: ${(err as Error).message}`);
  }

  if (bytes.length < 4) throw new CodecError(`fragment too short (${bytes.length} bytes)`);
  const version = bytes[0];
  if (version !== CODEC_VERSION) throw new UnsupportedVersionError(version);

  const qubits = ((bytes[1] >> 4) & 0x03) + 1;
  if (qubits < 1 || qubits > MAX_QUBITS) {
    throw new CodecError(`decoded qubits out of range: ${qubits}`);
  }
  const nSteps = (bytes[2] << 8) | bytes[3];
  if (nSteps > MAX_STEPS) throw new CodecError(`decoded steps > ${MAX_STEPS}: ${nSteps}`);

  let cursor = 4;
  const steps: Op[][] = [];
  for (let t = 0; t < nSteps; t++) {
    if (cursor >= bytes.length) throw new CodecError(`truncated at step ${t} header`);
    const nOps = bytes[cursor++];
    const step: Op[] = [];
    for (let i = 0; i < nOps; i++) {
      if (cursor >= bytes.length) throw new CodecError(`truncated at step ${t} op ${i}`);
      const tagByte = bytes[cursor++];
      const kind = (tagByte >> 5) & 0x07;
      const sub = (tagByte >> 2) & 0x07;
      const q = tagByte & 0x03;
      switch (kind) {
        case 0: {
          if (sub >= GATE_NAMES.length) throw new CodecError(`bad gate sub: ${sub}`);
          step.push({ kind: "gate", gate: GATE_NAMES[sub], qubit: q });
          break;
        }
        case 1: {
          if (cursor >= bytes.length) throw new CodecError(`truncated cnot payload`);
          const byte = bytes[cursor++];
          step.push({ kind: "cnot", control: (byte >> 4) & 0x0f, target: byte & 0x0f });
          break;
        }
        case 2: {
          if (cursor + 1 >= bytes.length) throw new CodecError(`truncated rot payload`);
          if (sub >= AXIS_NAMES.length) throw new CodecError(`bad rot axis: ${sub}`);
          const qhigh = bytes[cursor++];
          const qlow = bytes[cursor++];
          const qv = (qhigh << 8) | qlow;
          if (qv >= THETA_STEPS) throw new CodecError(`rot θ overflow: ${qv}`);
          step.push({ kind: "rot", axis: AXIS_NAMES[sub], qubit: q, theta: dequantizeTheta(qv) });
          break;
        }
        case 3:
          step.push({ kind: "measure", qubit: q });
          break;
        default:
          throw new CodecError(`unknown op kind: ${kind}`);
      }
    }
    steps.push(step);
  }

  const circuit: Circuit = { qubits, steps };
  validateCircuit(circuit); // last line of defence — semantic validity
  return circuit;
};

const stripHash = (s: string): string => (s.startsWith("#") ? s.slice(1) : s);

/* -------------------------------------------------------------------------- */
/* base64url ----------------------------------------------------------------- */
/* Works in both Node (Buffer) and browsers (atob/btoa). Kept self-contained
 * so the codec is import-safe from a Web Worker too. */

const bytesToBase64Url = (bytes: Uint8Array): string => {
  // Prefer Buffer when available (faster, no string-iteration cost).
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64url");
  }
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const base64UrlToBytes = (s: string): Uint8Array => {
  if (typeof Buffer !== "undefined") {
    return Uint8Array.from(Buffer.from(s, "base64url"));
  }
  const padded = s.replace(/-/g, "+").replace(/_/g, "/") +
    "==".slice(0, (4 - (s.length % 4)) % 4);
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

/* -------------------------------------------------------------------------- */
/* Round-trip helper — useful in tests and the share button ----------------- */

export const roundTrip = (c: Circuit): Circuit => decodeCircuit(encodeCircuit(c));
