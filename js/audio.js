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

// Themes: 8th-note grids. lead = melody, bass = one note per beat pair.
const THEMES = {
  town: { // calm, hopeful arrival
    bpm: 108, wave: 'triangle',
    lead: ['C5','E5','G5','E5','A4','C5','E5','C5','F4','A4','C5','A4','G4','B4','D5','G4'],
    bass: ['C3','C3','A2','A2','F2','F2','G2','G2'],
  },
  field: { // adventurous
    bpm: 132, wave: 'square',
    lead: ['E5','G5','A5','G5','E5','D5','E5','G5','C5','E5','G5','E5','D5','B4','D5','B4'],
    bass: ['A2','A2','E2','E2','F2','F2','G2','G2'],
  },
  battle: { // tense boss
    bpm: 152, wave: 'square',
    lead: ['A4','A4','C5','A4','E5','A4','C5','E5','F4','F4','A4','F4','G4','B4','D5','B4'],
    bass: ['A2','A2','A2','A2','F2','F2','G2','G2'],
  },
};
THEMES.boss = THEMES.battle;

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
  const theme = THEMES[themeId];
  if (!theme) return;
  if (loop && loop.theme === themeId) return;

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
  const cur = { theme: themeId, gain: bus, step: 0, retired: false };
  loop = cur;

  // schedule one 8th-note step, then chain the next slightly ahead of time.
  function tick() {
    if (cur.retired) return;
    const i = cur.step % theme.lead.length;
    const t = ctx.currentTime + 0.02;
    tone(bus, freq(theme.lead[i]), t, spb * 0.9, theme.wave, 0.18);
    if (i % 2 === 0) { // bass on downbeats
      const b = theme.bass[(i / 2) % theme.bass.length];
      tone(bus, freq(b), t, spb * 1.8, 'triangle', 0.22);
    }
    cur.step++;
    cur.timer = setTimeout(tick, spb * 1000);
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

export const AUDIO = { init, playMusic, stopMusic, playSfx, setMuted };
