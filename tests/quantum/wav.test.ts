/**
 * Tests for the pure WAV encoder.
 *
 * We're certifying the canonical 44-byte RIFF/PCM mono header that
 * QuickTime, VLC, Audacity, and ffmpeg all happily ingest. The fewer
 * surprises in this file, the fewer support tickets from people whose
 * downloads "won't play."
 */
import { describe, expect, it } from "vitest";
import { encodeWav } from "../../src/lib/sandbox/wav";

const HEADER_BYTES = 44;
const ASCII = (s: string) => Array.from(s, (ch) => ch.charCodeAt(0));

describe("encodeWav — byte layout", () => {
  it("total length is 44 + 2 * samples.length", () => {
    const samples = new Float32Array([0, 0.1, -0.1, 0.5, -0.5]);
    const out = encodeWav(samples, 44100);
    expect(out.length).toBe(HEADER_BYTES + 2 * samples.length);
  });

  it("emits the canonical RIFF / WAVE / fmt / data magic strings", () => {
    const out = encodeWav(new Float32Array([0]), 44100);
    expect(Array.from(out.slice(0, 4))).toEqual(ASCII("RIFF"));
    expect(Array.from(out.slice(8, 12))).toEqual(ASCII("WAVE"));
    expect(Array.from(out.slice(12, 16))).toEqual(ASCII("fmt "));
    expect(Array.from(out.slice(36, 40))).toEqual(ASCII("data"));
  });

  it("round-trips sampleRate / channels / bitsPerSample via DataView", () => {
    const out = encodeWav(new Float32Array(4), 48000);
    const view = new DataView(out.buffer, out.byteOffset, out.byteLength);
    // PCM audio format = 1
    expect(view.getUint16(20, true)).toBe(1);
    // Mono
    expect(view.getUint16(22, true)).toBe(1);
    // Sample rate
    expect(view.getUint32(24, true)).toBe(48000);
    // Byte rate = sampleRate * channels * bitsPerSample / 8
    expect(view.getUint32(28, true)).toBe(48000 * 2);
    // Block align = channels * bitsPerSample / 8
    expect(view.getUint16(32, true)).toBe(2);
    // Bits per sample
    expect(view.getUint16(34, true)).toBe(16);
    // RIFF chunk size = 36 + dataLen
    expect(view.getUint32(4, true)).toBe(36 + 2 * 4);
    // Data subchunk size = 2 * samples.length
    expect(view.getUint32(40, true)).toBe(2 * 4);
  });

  it("clips out-of-range samples and writes signed int16 LE", () => {
    const out = encodeWav(new Float32Array([2.0, -2.0, 0.5]), 44100);
    const view = new DataView(out.buffer, out.byteOffset, out.byteLength);
    // Positive overshoot → max signed int16
    expect(view.getInt16(44, true)).toBe(32767);
    // Negative overshoot → min signed int16
    expect(view.getInt16(46, true)).toBe(-32768);
    // 0.5 → 16384 (0.5 * 32767 rounded). We accept either ±1 to cover
    // common rovs-truncate implementations.
    const mid = view.getInt16(48, true);
    expect(Math.abs(mid - 16384)).toBeLessThanOrEqual(1);
  });

  it("encodes an empty sample buffer to exactly the 44-byte header", () => {
    const out = encodeWav(new Float32Array(0), 44100);
    expect(out.length).toBe(HEADER_BYTES);
    const view = new DataView(out.buffer, out.byteOffset, out.byteLength);
    expect(view.getUint32(40, true)).toBe(0);
    expect(view.getUint32(4, true)).toBe(36);
  });
});
