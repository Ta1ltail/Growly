/**
 * Sound file generator — produces distinct WAV files for all UI sound effects.
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

// ── Button sounds ──

function generateButtonSounds() {
  const dir = path.join(SOUNDS_DIR, "button");
  console.log("\n  Button sounds:");

  // click: quick neutral tap (A4, 50ms) — for generic button clicks
  const click = sineWave(440, 0.05, 0.35);
  writeWav(path.join(dir, "click.wav"), applyEnvelope(click, 0.002, 0.03));

  // confirm: pleasant ascending tone (C5→E5, 200ms)
  const confirm = sineWave(523, 0.2);
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
    const pulse2 = t > 0.12 ? Math.sin(2 * Math.PI * 220 * (t - 0.12)) * 0.4 : 0;
    deleteSamples[i] = pulse + pulse2;
  }
  writeWav(path.join(dir, "delete.wav"), applyEnvelope(deleteSamples, 0.005, 0.08));

  // back: short neutral tone (F4, 120ms)
  const back = sineWave(350, 0.12);
  writeWav(path.join(dir, "back.wav"), applyEnvelope(back, 0.005, 0.06));
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
    const tone1 = t < 0.18 ? Math.sin(2 * Math.PI * 523 * t) * 0.3 : 0;
    const tone2 = t >= 0.18 ? Math.sin(2 * Math.PI * 659 * (t - 0.18)) * 0.3 : 0;
    friendSamples[i] = tone1 + tone2;
  }
  writeWav(path.join(dir, "friend.wav"), applyEnvelope(friendSamples, 0.005, 0.1));

  // reminder: gentle two-tone alert (A4→C5, 250ms)
  const reminderLen = Math.floor(SAMPLE_RATE * 0.25);
  const reminderSamples = new Float32Array(reminderLen);
  for (let i = 0; i < reminderLen; i++) {
    const t = i / SAMPLE_RATE;
    const tone1 = t < 0.12 ? Math.sin(2 * Math.PI * 440 * t) * 0.25 : 0;
    const tone2 = t >= 0.12 ? Math.sin(2 * Math.PI * 523 * (t - 0.12)) * 0.25 : 0;
    reminderSamples[i] = tone1 + tone2;
  }
  writeWav(path.join(dir, "generic.wav"), applyEnvelope(reminderSamples, 0.005, 0.08));
}

// ── UI / Feedback sounds ──

function generateFeedbackSounds() {
  const dir = path.join(SOUNDS_DIR, "ui");
  console.log("\n  UI / Feedback sounds:");

  // toggle-on: bright rising click (C6→E6, 80ms)
  const toggleOnLen = Math.floor(SAMPLE_RATE * 0.08);
  const toggleOn = new Float32Array(toggleOnLen);
  for (let i = 0; i < toggleOnLen; i++) {
    const t = i / SAMPLE_RATE;
    const progress = i / toggleOnLen;
    const freq = 1047 + progress * 330; // C6 → E6
    toggleOn[i] = Math.sin(2 * Math.PI * freq * t) * 0.25;
  }
  writeWav(path.join(dir, "toggle-on.wav"), applyEnvelope(toggleOn, 0.003, 0.04));

  // toggle-off: soft falling click (E6→C6, 70ms)
  const toggleOffLen = Math.floor(SAMPLE_RATE * 0.07);
  const toggleOff = new Float32Array(toggleOffLen);
  for (let i = 0; i < toggleOffLen; i++) {
    const t = i / SAMPLE_RATE;
    const progress = i / toggleOffLen;
    const freq = 1319 - progress * 330; // E6 → C6
    toggleOff[i] = Math.sin(2 * Math.PI * freq * t) * 0.2;
  }
  writeWav(path.join(dir, "toggle-off.wav"), applyEnvelope(toggleOff, 0.003, 0.04));

  // maximize: spacious rising whoosh (200→500Hz with harmonics, 300ms)
  const maximizeLen = Math.floor(SAMPLE_RATE * 0.3);
  const maximize = new Float32Array(maximizeLen);
  for (let i = 0; i < maximizeLen; i++) {
    const t = i / SAMPLE_RATE;
    const progress = i / maximizeLen;
    const freq = 200 + progress * 300;
    const fund = Math.sin(2 * Math.PI * freq * t) * 0.2;
    const harm2 = Math.sin(2 * Math.PI * freq * 2 * t) * 0.08;
    const harm3 = Math.sin(2 * Math.PI * freq * 3 * t) * 0.03;
    maximize[i] = fund + harm2 + harm3;
  }
  writeWav(path.join(dir, "maximize.wav"), applyEnvelope(maximize, 0.015, 0.1));

  // minimize: soft falling whoosh (400→150Hz, 250ms)
  const minimizeLen = Math.floor(SAMPLE_RATE * 0.25);
  const minimize = new Float32Array(minimizeLen);
  for (let i = 0; i < minimizeLen; i++) {
    const t = i / SAMPLE_RATE;
    const progress = i / minimizeLen;
    const freq = 400 - progress * 250;
    const fund = Math.sin(2 * Math.PI * freq * t) * 0.18;
    const harm2 = Math.sin(2 * Math.PI * freq * 2 * t) * 0.06;
    minimize[i] = fund + harm2;
  }
  writeWav(path.join(dir, "minimize.wav"), applyEnvelope(minimize, 0.01, 0.08));

  // drop: short satisfying thud (A2→D3, 150ms) — for habit complete, success feedback
  const dropLen = Math.floor(SAMPLE_RATE * 0.15);
  const dropSamples = new Float32Array(dropLen);
  for (let i = 0; i < dropLen; i++) {
    const t = i / SAMPLE_RATE;
    const progress = i / dropLen;
    const freq = 110 + progress * 50; // A2 → D3
    // Fundamental + rich harmonics for a warm thud
    const fund = Math.sin(2 * Math.PI * freq * t) * 0.35;
    const harm2 = Math.sin(2 * Math.PI * freq * 2 * t) * 0.12;
    const harm3 = Math.sin(2 * Math.PI * freq * 3 * t) * 0.06;
    dropSamples[i] = fund + harm2 + harm3;
  }
  writeWav(path.join(dir, "drop.wav"), applyEnvelope(dropSamples, 0.003, 0.05));

  // error: short descending buzz (C5→G4, 250ms) with slight dissonance
  const errorLen = Math.floor(SAMPLE_RATE * 0.25);
  const errorSamples = new Float32Array(errorLen);
  for (let i = 0; i < errorLen; i++) {
    const t = i / SAMPLE_RATE;
    const progress = i / errorLen;
    const freq = 523 - progress * 130; // C5 → G4
    const overtone = Math.sin(2 * Math.PI * (freq * 1.06) * t) * 0.12;
    errorSamples[i] = (Math.sin(2 * Math.PI * freq * t) * 0.3) + overtone;
  }
  writeWav(path.join(dir, "error.wav"), applyEnvelope(errorSamples, 0.005, 0.1));
}

// ── Achievement / Progression sounds ──

function generateAchievementSounds() {
  const dir = path.join(SOUNDS_DIR, "achievement");
  console.log("\n  Achievement sounds:");

  // sound_achievements: bright triumphant fanfare (C5→E5→G5→C6, 600ms)
  const achLen = Math.floor(SAMPLE_RATE * 0.6);
  const achSamples = new Float32Array(achLen);
  for (let i = 0; i < achLen; i++) {
    const t = i / SAMPLE_RATE;
    // Staggered chord: C5 at 0ms, E5 at 100ms, G5 at 200ms, C6 at 350ms
    const tone1 = t < 0.1 ? Math.sin(2 * Math.PI * 523 * t) * 0.2 : 0;
    const tone2 = t >= 0.1 && t < 0.2 ? Math.sin(2 * Math.PI * 659 * (t - 0.1)) * 0.2 : 0;
    const tone3 = t >= 0.2 && t < 0.35 ? Math.sin(2 * Math.PI * 784 * (t - 0.2)) * 0.2 : 0;
    const tone4 = t >= 0.35 ? Math.sin(2 * Math.PI * 1047 * (t - 0.35)) * 0.2 : 0;
    // Overlapping sustain for richness
    const sustain = t >= 0.1 && t < 0.2
      ? Math.sin(2 * Math.PI * 523 * t) * 0.08
      : t >= 0.2 && t < 0.35
        ? (Math.sin(2 * Math.PI * 523 * t) + Math.sin(2 * Math.PI * 659 * (t - 0.1))) * 0.06
        : t >= 0.35
          ? (Math.sin(2 * Math.PI * 523 * t) + Math.sin(2 * Math.PI * 659 * (t - 0.1)) + Math.sin(2 * Math.PI * 784 * (t - 0.2))) * 0.04
          : 0;
    achSamples[i] = tone1 + tone2 + tone3 + tone4 + sustain;
  }
  writeWav(path.join(dir, "sound_achievements.wav"), applyEnvelope(achSamples, 0.008, 0.15));

  // sound_levelup: bright ascending arpeggio (C4→E4→G4→C5, 500ms)
  const lvlLen = Math.floor(SAMPLE_RATE * 0.5);
  const lvlSamples = new Float32Array(lvlLen);
  for (let i = 0; i < lvlLen; i++) {
    const t = i / SAMPLE_RATE;
    // Quick arpeggio: C4 at 0ms, E4 at 80ms, G4 at 160ms, C5 at 280ms
    const tone1 = t < 0.08 ? Math.sin(2 * Math.PI * 262 * t) * 0.22 : 0;
    const tone2 = t >= 0.08 && t < 0.16 ? Math.sin(2 * Math.PI * 330 * (t - 0.08)) * 0.22 : 0;
    const tone3 = t >= 0.16 && t < 0.28 ? Math.sin(2 * Math.PI * 392 * (t - 0.16)) * 0.22 : 0;
    const tone4 = t >= 0.28 ? Math.sin(2 * Math.PI * 523 * (t - 0.28)) * 0.22 : 0;
    lvlSamples[i] = tone1 + tone2 + tone3 + tone4;
  }
  writeWav(path.join(dir, "sound_levelup.wav"), applyEnvelope(lvlSamples, 0.005, 0.12));
}

// ── Reward sounds ──

function generateRewardSounds() {
  const dir = path.join(SOUNDS_DIR, "reward");
  console.log("\n  Reward sounds:");

  // sound_coin: bright coin-ding (E5→G5, 200ms) — for coin rewards, daily quest, spin
  const coinLen = Math.floor(SAMPLE_RATE * 0.2);
  const coinSamples = new Float32Array(coinLen);
  for (let i = 0; i < coinLen; i++) {
    const t = i / SAMPLE_RATE;
    // Quick two-tone: E5 at 0ms, G5 at 80ms
    const tone1 = t < 0.08 ? Math.sin(2 * Math.PI * 659 * t) * 0.25 : 0;
    const tone2 = t >= 0.08 ? Math.sin(2 * Math.PI * 784 * (t - 0.08)) * 0.25 : 0;
    coinSamples[i] = tone1 + tone2;
  }
  writeWav(path.join(dir, "sound_coin.wav"), applyEnvelope(coinSamples, 0.003, 0.06));
}

// ── Main ──

console.log("Generating sound effects...");
generateButtonSounds();
generateNotificationSounds();
generateFeedbackSounds();
generateAchievementSounds();
generateRewardSounds();
console.log("\nDone! All sounds generated.");
