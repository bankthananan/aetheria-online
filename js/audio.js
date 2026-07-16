// js/audio.js — runtime-synthesized music + SFX for a 2D isekai RPG.
// No audio assets: everything is Web Audio oscillators + envelopes.

// note-name -> frequency (equal temperament, A4 = 440). "R" = rest.
function freq(note) {
  if (!note || note === 'R') return 0;
  const m = /^([A-G])(#|b)?(\d)$/.exec(note);
  if (!m) return 0;
  const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]];
  const acc = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  const semis = base + acc + (Number(m[3]) - 4) * 12 - 9; // relative to A4
  return 440 * Math.pow(2, semis / 12);
}

// Every region has its own synthesized score. The same tiny sequencer supports
// distinct tempo, scale, timbre, note density, bass motion, swing, and pad layer.
export const MUSIC_THEMES = Object.freeze({
  town_awakening: { // hopeful bells around the Moonwell
    bpm: 104, leadWave: 'triangle', bassWave: 'sine', padWave: 'sine',
    leadPeak: 0.16, bassPeak: 0.20, padPeak: 0.055, leadGate: 0.82, padEvery: 4,
    lead: ['C5','E5','G5','E5','A4','C5','E5','R','F4','A4','C5','A4','G4','B4','D5','R'],
    bass: ['C3','C3','A2','A2','F2','F2','G2','G2'], pad: ['C4','A3','F3','G3'],
  },
  whispering_woods: { // brisk D-Dorian footsteps beneath the leaves
    bpm: 126, leadWave: 'square', bassWave: 'triangle', padWave: 'sine',
    leadPeak: 0.13, bassPeak: 0.19, padPeak: 0.035, leadGate: 0.58, padEvery: 8, swing: 0.08,
    lead: ['D5','F5','A5','R','G5','E5','D5','A4','C5','D5','F5','E5','D5','C5','A4','R'],
    bass: ['D3','D3','C3','C3','G2','G2','A2','A2'], pad: ['D4','G3'],
  },
  sunken_ruins: { // slow drowned-chapel descent in D minor
    bpm: 82, leadWave: 'sine', bassWave: 'triangle', padWave: 'sine',
    leadPeak: 0.12, bassPeak: 0.18, padPeak: 0.075, leadGate: 0.74, padEvery: 4,
    lead: ['D5','R','C5','A4','R','F4','E4','R','A4','R','G4','E4','D4','R','C#4','R'],
    bass: ['D2','D2','Bb2','Bb2','G2','G2','A2','A2'], pad: ['D3','Bb2','G2','A2'],
  },
  frostpeak_tundra: { // glassy open fifths carried by the gale
    bpm: 96, leadWave: 'triangle', bassWave: 'sine', padWave: 'triangle',
    leadPeak: 0.14, bassPeak: 0.17, padPeak: 0.045, leadGate: 0.68, padEvery: 8,
    lead: ['E5','B5','R','G5','D5','R','B4','E5','F#5','B5','R','A5','E5','D5','B4','R'],
    bass: ['E2','E2','C3','C3','G2','G2','D3','D3'], pad: ['E3','B2'],
  },
  dragon_caldera: { // fast E-Phrygian forge pulse
    bpm: 148, leadWave: 'sawtooth', bassWave: 'square', padWave: 'triangle',
    leadPeak: 0.12, bassPeak: 0.18, padPeak: 0.035, leadGate: 0.48, padEvery: 8,
    lead: ['E4','F4','E4','G4','E4','F4','B4','R','E4','F4','A4','G4','F4','E4','D4','R'],
    bass: ['E2','E2','F2','E2','C3','Bb2','F2','E2'], pad: ['E3','F3'],
  },
  astral_rift: { // unstable whole-tone orbit with asymmetric rests
    bpm: 118, leadWave: 'sine', bassWave: 'triangle', padWave: 'sine',
    leadPeak: 0.15, bassPeak: 0.16, padPeak: 0.065, leadGate: 0.88, padEvery: 4, swing: -0.06,
    lead: ['C5','D5','E5','R','F#5','A#5','G#5','R','D5','F#5','G#5','E5','R','A#4','C5','R'],
    bass: ['C3','E3','F#2','A#2','D3','G#2','E3','C3'], pad: ['C4','F#3','D4','G#3'],
  },
});

// Compatibility for console callers and older tests; maps use the regional IDs.
const THEME_ALIASES = { town: 'town_awakening', field: 'whispering_woods', battle: 'dragon_caldera', boss: 'dragon_caldera' };

const AC = window.AudioContext || window.webkitAudioContext;

let ctx = null;
let master = null;      // master gain (mute lives here)
let musicGain = null;   // music bus, used for crossfade
let muted = false;
let loop = null;        // { theme, step, timer, gain, stop() }

function init() {
  if (ctx || !AC) return ctx;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 0.9;
  master.connect(ctx.destination);
  musicGain = ctx.createGain();
  musicGain.gain.value = 0.5;
  musicGain.connect(master);
  return ctx;
}

function resume() {
  // must be called from a user gesture at least once
  if (ctx && ctx.state === 'suspended') ctx.resume();
}

// one enveloped oscillator note
function tone(dest, f, t, dur, wave, peak) {
  if (!f) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = wave;
  o.frequency.value = f;
  const a = 0.008, r = Math.min(0.12, dur * 0.6);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + a);
  g.gain.linearRampToValueAtTime(peak * 0.7, t + Math.max(a, dur - r));
  g.gain.linearRampToValueAtTime(0, t + dur);
  o.connect(g).connect(dest);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function stopMusic() {
  if (!loop) return;
  clearTimeout(loop.timer);
  try { loop.gain.disconnect(); } catch (e) {}
  loop = null;
}

function playMusic(themeId) {
  init();
  if (!ctx) return;
  resume();
  const resolvedId = MUSIC_THEMES[themeId] ? themeId : THEME_ALIASES[themeId];
  const theme = MUSIC_THEMES[resolvedId];
  if (!theme) return;
  if (loop && loop.theme === resolvedId) return;

  // crossfade: fade out & retire the old loop, fade in a fresh bus.
  const old = loop;
  if (old) {
    old.retired = true;
    clearTimeout(old.timer);
    old.gain.gain.cancelScheduledValues(ctx.currentTime);
    old.gain.gain.setValueAtTime(old.gain.gain.value, ctx.currentTime);
    old.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
    setTimeout(() => { try { old.gain.disconnect(); } catch (e) {} }, 500);
  }

  const bus = ctx.createGain();
  bus.gain.value = old ? 0 : 1;
  if (old) bus.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.4);
  bus.connect(musicGain);

  const spb = 60 / theme.bpm;      // seconds per beat (8th note)
  const cur = { theme: resolvedId, gain: bus, step: 0, retired: false };
  loop = cur;

  // schedule one 8th-note step, then chain the next slightly ahead of time.
  function tick() {
    if (cur.retired) return;
    const i = cur.step % theme.lead.length;
    const t = ctx.currentTime + 0.02;
    tone(bus, freq(theme.lead[i]), t, spb * (theme.leadGate || 0.9), theme.leadWave, theme.leadPeak);
    if (i % 2 === 0) { // bass on downbeats
      const b = theme.bass[(i / 2) % theme.bass.length];
      tone(bus, freq(b), t, spb * 1.8, theme.bassWave, theme.bassPeak);
    }
    if (theme.pad?.length && i % theme.padEvery === 0) {
      const pad = theme.pad[(i / theme.padEvery) % theme.pad.length];
      tone(bus, freq(pad), t, spb * theme.padEvery * 0.92, theme.padWave, theme.padPeak);
    }
    cur.step++;
    const swing = theme.swing || 0;
    const stepMs = spb * (1 + (cur.step % 2 ? swing : -swing)) * 1000;
    cur.timer = setTimeout(tick, stepMs);
  }
  tick();
}

// --- SFX: short synthesized envelopes -------------------------------------

function noiseBuffer(dur) {
  const n = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

function noise(t, dur, peak, hz) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(dur);
  const g = ctx.createGain();
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = hz || 1200;
  g.gain.setValueAtTime(peak, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(bp).connect(g).connect(master);
  src.start(t);
  src.stop(t + dur);
}

// pitch sweep beep
function beep(t, f0, f1, dur, wave, peak) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = wave || 'square';
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  g.gain.setValueAtTime(peak, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

const SFX = {
  attack:     (t) => beep(t, 320, 120, 0.12, 'square', 0.3),
  hit:        (t) => { beep(t, 180, 60, 0.1, 'sawtooth', 0.3); noise(t, 0.08, 0.25, 900); },
  skill:      (t) => { beep(t, 400, 1100, 0.22, 'triangle', 0.25); beep(t + 0.05, 600, 1400, 0.2, 'square', 0.15); },
  levelup:    (t) => [523, 659, 784, 1047].forEach((f, i) => beep(t + i * 0.11, f, f, 0.16, 'square', 0.25)),
  pickup:     (t) => { beep(t, 784, 784, 0.07, 'square', 0.22); beep(t + 0.07, 1175, 1175, 0.1, 'square', 0.22); },
  menu:       (t) => beep(t, 660, 660, 0.05, 'square', 0.18),
  playerHurt: (t) => { beep(t, 300, 90, 0.28, 'sawtooth', 0.3); noise(t, 0.18, 0.2, 500); },
  monsterDie: (t) => { beep(t, 500, 40, 0.35, 'square', 0.28); noise(t, 0.3, 0.25, 700); },
};

function playSfx(sfxId) {
  init();
  if (!ctx) return;
  resume();
  const fn = SFX[sfxId];
  if (fn) fn(ctx.currentTime + 0.01);
}

function setMuted(bool) {
  muted = !!bool;
  if (master) master.gain.setTargetAtTime(muted ? 0 : 0.9, ctx.currentTime, 0.02);
}

export const AUDIO = { init, playMusic, stopMusic, playSfx, setMuted, currentMusicTheme: () => loop?.theme || null };
