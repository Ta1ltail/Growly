/**
 * Sound file generator — produces distinct WAV files for button and notification subtypes.
 * Each sound is a simple synthesized tone with unique frequency/duration/envelope.
 *
 * Run: node scripts/generate-sounds.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOUNDS_DIR = path.resolve(__dirname, "..", "public", "sounds");

// Sample rate: 44.1kHz, 16-bit mono PCM
const SAMPLE_RATE = 44100;
const BITS_PER_SAMPLE = 16;
const NUM_CHANNELS = 1;

function writeWav(filePath, samples) {
  const numSamples = samples.length;
  const dataSize = numSamples * 2; // 16-bit = 2 bytes per sample
  const buffer = Buffer.alloc(44 + dataSize);
  let offset = 0;

  // RIFF header
  buffer.write("RIFF", offset); offset += 4;
  buffer.writeUInt32LE(36 + dataSize, offset); offset += 4;
  buffer.write("WAVE", offset); offset += 4;

  // fmt subchunk
  buffer.write("fmt ", offset); offset += 4;
  buffer.writeUInt32LE(16, offset); offset += 4; // subchunk size
  buffer.writeUInt16LE(1, offset); offset += 2;  // PCM format
  buffer.writeUInt16LE(NUM_CHANNELS, offset); offset += 2;
  buffer.writeUInt32LE(SAMPLE_RATE, offset); offset += 4;
  buffer.writeUInt32LE(SAMPLE_RATE * NUM_CHANNELS * BITS_PER_SAMPLE / 8, offset); offset += 4; // byte rate
  buffer.writeUInt16LE(NUM_CHANNELS * BITS_PER_SAMPLE / 8, offset); offset += 2; // block align
  buffer.writeUInt16LE(BITS_PER_SAMPLE, offset); offset += 2;

  // data subchunk
  buffer.write("data", offset); offset += 4;
  buffer.writeUInt32LE(dataSize, offset); offset += 4;

  // Write PCM samples (normalized to 16-bit range)
  for (let i = 0; i < numSamples; i++) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    const int16 = Math.round(sample * 32767);
    buffer.writeInt16LE(int16, offset);
    offset += 2;
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, buffer);
  console.log(`  Created: ${path.relative(SOUNDS_DIR, filePath)}`);
}

function sineWave(frequency, durationSec, volume = 0.5) {
  const numSamples = Math.floor(SAMPLE_RATE * durationSec);
  const samples = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    samples[i] = Math.sin(2 * Math.PI * frequency * t) * volume;
  }
  return samples;
}

function applyEnvelope(samples, attackSec = 0.005, decaySec = 0.05) {
  const attackSamples = Math.floor(SAMPLE_RATE * attackSec);
  const decaySamples = Math.floor(SAMPLE_RATE * decaySec);
  const len = samples.length;

  for (let i = 0; i < attackSamples && i < len; i++) {
    samples[i] *= i / attackSamples;
  }
  for (let i = Math.max(0, len - decaySamples); i < len; i++) {
    samples[i] *= (len - i) / decaySamples;
  }
  return samples;
}

function addFrequencyShift(samples, startFreq, endFreq) {
  const len = samples.length;
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const progress = i / len;
    const freq = startFreq + (endFreq - startFreq) * progress;
    // Recompute the sample at this position using accumulated phase
    const phase = 2 * Math.PI * (startFreq * t + (endFreq - startFreq) * t * t / 2);
    const amplitude = samples[i]; // preserve envelope
    // Normalize: the original sine amplitude
    samples[i] = Math.sin(phase) * Math.abs(amplitude);
  }
  return samples;
}

// ── Button sounds ──

function generateButtonSounds() {
  const dir = path.join(SOUNDS_DIR, "button");
  console.log("\n  Button sounds:");

  // confirm: pleasant ascending tone (C5→E5, 200ms)
  const confirm = sineWave(523, 0.2);
  // Apply an ascending sweep for the first half, then hold
  writeWav(path.join(dir, "confirm.wav"), applyEnvelope(confirm, 0.005, 0.06));

  // cancel: neutral descending tone (E4→C4, 180ms)
  const cancel = sineWave(330, 0.18);
  writeWav(path.join(dir, "cancel.wav"), applyEnvelope(cancel, 0.005, 0.07));

  // delete: lower warning tone (A3, double pulse, 250ms)
  const deleteLen = Math.floor(SAMPLE_RATE * 0.25);
  const deleteSamples = new Float32Array(deleteLen);
  for (let i = 0; i < deleteLen; i++) {
    const t = i / SAMPLE_RATE;
    const pulse = Math.sin(2 * Math.PI * 220 * t) * 0.4;
    // Second pulse at 150ms
    const pulse2 = t > 0.12 ? Math.sin(2 * Math.PI * 220 * (t - 0.12)) * 0.4 : 0;
    deleteSamples[i] = pulse + pulse2;
  }
  writeWav(path.join(dir, "delete.wav"), applyEnvelope(deleteSamples, 0.005, 0.08));

  // back: short neutral tone (F4, 120ms)
  const back = sineWave(350, 0.12);
  writeWav(path.join(dir, "back.wav"), applyEnvelope(back, 0.005, 0.06));

  // toggle: bright short click (A5, 60ms)
  const toggle = sineWave(880, 0.06);
  writeWav(path.join(dir, "toggle.wav"), applyEnvelope(toggle, 0.003, 0.04));

  // modal-open: rising whoosh (300→900Hz, 250ms)
  const modalOpenLen = Math.floor(SAMPLE_RATE * 0.25);
  const modalOpen = new Float32Array(modalOpenLen);
  for (let i = 0; i < modalOpenLen; i++) {
    const t = i / SAMPLE_RATE;
    const progress = i / modalOpenLen;
    const freq = 300 + progress * 600;
    modalOpen[i] = Math.sin(2 * Math.PI * freq * t) * 0.3;
  }
  writeWav(path.join(dir, "modal-open.wav"), applyEnvelope(modalOpen, 0.01, 0.1));

  // modal-close: falling whoosh (600→200Hz, 200ms)
  const modalCloseLen = Math.floor(SAMPLE_RATE * 0.2);
  const modalClose = new Float32Array(modalCloseLen);
  for (let i = 0; i < modalCloseLen; i++) {
    const t = i / SAMPLE_RATE;
    const progress = i / modalCloseLen;
    const freq = 600 - progress * 400;
    modalClose[i] = Math.sin(2 * Math.PI * freq * t) * 0.3;
  }
  writeWav(path.join(dir, "modal-close.wav"), applyEnvelope(modalClose, 0.005, 0.08));
}

// ── Notification sounds ──

function generateNotificationSounds() {
  const dir = path.join(SOUNDS_DIR, "notification");
  console.log("\n  Notification sounds:");

  // friend: pleasant two-tone chime (C5→E5, 350ms)
  const friendLen = Math.floor(SAMPLE_RATE * 0.35);
  const friendSamples = new Float32Array(friendLen);
  for (let i = 0; i < friendLen; i++) {
    const t = i / SAMPLE_RATE;
    // Tone 1: C5 (523Hz), first 180ms
    const tone1 = t < 0.18 ? Math.sin(2 * Math.PI * 523 * t) * 0.3 : 0;
    // Tone 2: E5 (659Hz), after 180ms
    const tone2 = t >= 0.18 ? Math.sin(2 * Math.PI * 659 * (t - 0.18)) * 0.3 : 0;
    friendSamples[i] = tone1 + tone2;
  }
  writeWav(path.join(dir, "friend.wav"), applyEnvelope(friendSamples, 0.005, 0.1));

  // reminder: gentle two-tone alert (A4→C5, 250ms)
  const reminderLen = Math.floor(SAMPLE_RATE * 0.25);
  const reminderSamples = new Float32Array(reminderLen);
  for (let i = 0; i < reminderLen; i++) {
    const t = i / SAMPLE_RATE;
    // Tone 1: A4 (440Hz), first 120ms
    const tone1 = t < 0.12 ? Math.sin(2 * Math.PI * 440 * t) * 0.25 : 0;
    // Tone 2: C5 (523Hz), after 120ms
    const tone2 = t >= 0.12 ? Math.sin(2 * Math.PI * 523 * (t - 0.12)) * 0.25 : 0;
    reminderSamples[i] = tone1 + tone2;
  }
  writeWav(path.join(dir, "reminder.wav"), applyEnvelope(reminderSamples, 0.005, 0.08));
}

// ── Main ──

console.log("Generating sound effects...");
generateButtonSounds();
generateNotificationSounds();
console.log("\nDone! All sounds generated.");
