/**
 * Tiny pure WAV encoder — 16-bit PCM mono.
 *
 * The format is older than this codebase by a decade and has exactly
 * one shape that every consumer in the wild agrees on: a 44-byte
 * canonical RIFF/WAVE header followed by little-endian signed int16
 * samples. We emit precisely that — no extension chunks, no fact
 * chunk, no LIST/INFO metadata. QuickTime and VLC don't care; we
 * shouldn't either.
 *
 * Out-of-range float samples are clamped to [-1, 1] *before* scaling
 * so a runaway oscillator at gain 1.5 produces a hard ceiling rather
 * than a wrapped buzz.
 */

const HEADER_BYTES = 44;
const CHANNELS = 1;
const BITS_PER_SAMPLE = 16;
const BYTES_PER_SAMPLE = BITS_PER_SAMPLE / 8;
const INT16_MAX = 32767;
const INT16_MIN = -32768;

const writeAscii = (view: DataView, offset: number, str: string): void => {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
};

export function encodeWav(samples: Float32Array, sampleRate: number): Uint8Array {
  const dataLen = samples.length * BYTES_PER_SAMPLE;
  const buf = new ArrayBuffer(HEADER_BYTES + dataLen);
  const view = new DataView(buf);

  // -- RIFF chunk descriptor ------------------------------------------------
  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + dataLen, true);   // chunk size = total - 8
  writeAscii(view, 8, "WAVE");

  // -- fmt subchunk ---------------------------------------------------------
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);            // subchunk1 size for PCM
  view.setUint16(20, 1, true);             // audioFormat = 1 (PCM)
  view.setUint16(22, CHANNELS, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * CHANNELS * BYTES_PER_SAMPLE, true); // byte rate
  view.setUint16(32, CHANNELS * BYTES_PER_SAMPLE, true);              // block align
  view.setUint16(34, BITS_PER_SAMPLE, true);

  // -- data subchunk --------------------------------------------------------
  writeAscii(view, 36, "data");
  view.setUint32(40, dataLen, true);

  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    // Clamp first, then scale. Positive ceiling is 32767, negative is
    // 32768 — int16 is asymmetric, but mapping 1.0 to 32767 keeps the
    // common case (sines that just touch 1.0) from saturating.
    const clamped = s < -1 ? -1 : s > 1 ? 1 : s;
    const intSample = clamped < 0
      ? Math.max(INT16_MIN, Math.round(clamped * 32768))
      : Math.min(INT16_MAX, Math.round(clamped * 32767));
    view.setInt16(HEADER_BYTES + i * BYTES_PER_SAMPLE, intSample, true);
  }

  return new Uint8Array(buf);
}
