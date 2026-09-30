// Audio: synthesized sound effects (no files needed) plus Kiki's voice / question read-aloud.
// Voice: if config.audio.voiceFiles is true, plays assets/audio/voice/en/<key>.mp3 first and falls back to the
// browser's speech synthesis. Nothing plays until the player's first tap (browser autoplay rules).
import { getSetting } from './storage.js';

let ctx = null;
let unlocked = false;
let cfg = { voiceFiles: false, voicePath: 'assets/audio/voice/en/' };
const missing = new Set();
let currentVoice = null;

export function initAudio(config) { cfg = { ...cfg, ...(config?.audio || {}) }; }

export function unlockAudio() {
  if (unlocked) return;
  unlocked = true;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
  } catch { ctx = null; }
}

function tone(freq, start, dur, type = 'sine', gain = 0.16) {
  if (!ctx) return;
  const t0 = ctx.currentTime + start;
  const osc = ctx.createOscillator(); const g = ctx.createGain();
  osc.type = type; osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g); g.connect(ctx.destination);
  osc.start(t0); osc.stop(t0 + dur + 0.05);
}

const NOTES = [261.6, 329.6, 392.0, 440.0, 523.3, 587.3];
const SFX = {
  tap: () => tone(520, 0, 0.08, 'triangle'),
  correct: () => { tone(523, 0, 0.14); tone(659, 0.12, 0.14); tone(784, 0.24, 0.24); },
  wrong: () => { tone(220, 0, 0.18, 'sawtooth', 0.08); tone(196, 0.16, 0.22, 'sawtooth', 0.08); },
  star: () => { tone(784, 0, 0.16); tone(988, 0.14, 0.24); },
  win: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.13, 0.28)); },
  coin: () => { tone(988, 0, 0.08, 'square', 0.07); tone(1319, 0.08, 0.2, 'square', 0.07); },
  bump: () => tone(140, 0, 0.1, 'triangle', 0.12),
  found: () => { tone(660, 0, 0.1); tone(880, 0.09, 0.16); },
};
export function sfx(name) {
  if (!unlocked || !getSetting('audio')) return;
  try { SFX[name]?.(); } catch { /* ignore */ }
}
export function pad(i) {
  if (!unlocked || !getSetting('audio')) return;
  tone(NOTES[i % NOTES.length], 0, 0.3, 'sine', 0.2);
}

export function stopVoice() {
  try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
  if (currentVoice) { try { currentVoice.pause(); } catch { /* ignore */ } currentVoice = null; }
}

function speakTTS(text) {
  try {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-GB'; u.rate = 0.9; u.pitch = 1.15;
    window.speechSynthesis.speak(u);
  } catch { /* ignore */ }
}

// key: stable id used for the recorded file name; text: fallback for speech synthesis.
export function speak(key, text, { force = false } = {}) {
  if (!unlocked || !text) return;
  if (!force && (!getSetting('audio') || !getSetting('voice'))) return;
  stopVoice();
  if (cfg.voiceFiles && key && !missing.has(key)) {
    const a = new Audio(cfg.voicePath + key + '.mp3');
    currentVoice = a;
    a.addEventListener('error', () => { missing.add(key); speakTTS(text); }, { once: true });
    a.play().catch(() => { missing.add(key); speakTTS(text); });
    return;
  }
  speakTTS(text);
}
