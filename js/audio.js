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
  celestial_rift: { // crystalline arena chimes driven by an insistent pulse
    bpm: 132, leadWave: 'square', bassWave: 'sine', padWave: 'triangle',
    leadPeak: 0.14, bassPeak: 0.17, padPeak: 0.05, leadGate: 0.62, padEvery: 4, swing: 0.05,
    lead: ['G5','B5','D6','R','A5','C6','E6','R','F#5','A5','C6','B5','R','D5','G5','R'],
    bass: ['G2','G2','D3','D3','A2','A2','E3','E3'], pad: ['G4','D4','A3'],
  },
  ww_goblin_cave: { // frantic staccato scraper rhythm in the warrens
    bpm: 140, leadWave: 'sawtooth', bassWave: 'triangle', padWave: 'square',
    leadPeak: 0.12, bassPeak: 0.18, padPeak: 0.03, leadGate: 0.45, padEvery: 8, swing: 0.10,
    lead: ['A4','C5','A4','E5','D5','C5','A4','R','F4','A4','D5','C5','B4','A4','G4','R'],
    bass: ['A2','A2','F2','F2','D2','D2','E2','E2'], pad: ['A3','E3'],
  },
  ww_elder_hollow: { // ethereal corrupted hollow echoes in A-minor
    bpm: 88, leadWave: 'sine', bassWave: 'sine', padWave: 'triangle',
    leadPeak: 0.14, bassPeak: 0.18, padPeak: 0.06, leadGate: 0.80, padEvery: 4, swing: -0.04,
    lead: ['E5','A5','B5','C6','B5','A5','G5','R','F5','A5','D6','C6','B5','A5','E5','R'],
    bass: ['A2','A2','F2','F2','D2','D2','E2','E2'], pad: ['A3','C4','D4','E4'],
  },
  abyssal_spire: { // dark ascendance ascension theme in D minor
    bpm: 132, leadWave: 'sawtooth', bassWave: 'triangle', padWave: 'sawtooth',
    leadPeak: 0.15, bassPeak: 0.20, padPeak: 0.05, leadGate: 0.60, padEvery: 4, swing: 0.04,
    lead: ['D4','F4','A4','D5','C5','A4','F4','R','G4','B4','D5','G5','F5','D5','B4','R'],
    bass: ['D2','D2','B2','B2','G2','G2','A2','A2'], pad: ['D3','F3','A3','C4'],
  },
  guild_stronghold: { // sanctuary of the sovereign vanguard: noble crystal resonance
    bpm: 112, leadWave: 'triangle', bassWave: 'sine', padWave: 'triangle',
    leadPeak: 0.15, bassPeak: 0.18, padPeak: 0.05, leadGate: 0.76, padEvery: 4, swing: 0.03,
    lead: ['G4','C5','E5','G5','A5','G5','E5','R','F5','E5','D5','C5','D5','F5','E5','R'],
    bass: ['C3','G2','A2','E2','F2','C3','F2','G2'], pad: ['C4','G3','A3','F3'],
  },
  player_homestead: { // cozy pastoral warmth by the garden hearth
    bpm: 108, leadWave: 'triangle', bassWave: 'sine', padWave: 'sine',
    leadPeak: 0.14, bassPeak: 0.18, padPeak: 0.05, leadGate: 0.72, padEvery: 4, swing: 0.04,
    lead: ['G4','B4','D5','G5','E5','D5','B4','R','C5','E5','G5','E5','D5','C5','A4','R'],
    bass: ['G2','G2','E2','E2','C2','C2','D2','D2'], pad: ['G3','B3','C4','D4'],
  },
  sr_drowned_catacombs: { // sunken crypt echoes in C minor
    bpm: 110, leadWave: 'sine', bassWave: 'triangle', padWave: 'sine',
    leadPeak: 0.12, bassPeak: 0.16, padPeak: 0.04, leadGate: 0.65, padEvery: 4, swing: 0.02,
    lead: ['C4','Eb4','F4','G4','F4','Eb4','C4','R','Eb4','G4','Bb4','G4','F4','Eb4','D4','R'],
    bass: ['C2','C2','Ab2','Ab2','Bb2','Bb2','G2','G2'], pad: ['C3','Eb3','G3'],
  },
  ft_glacial_chasm: { // crisp crystal chasm in D minor
    bpm: 124, leadWave: 'triangle', bassWave: 'sine', padWave: 'triangle',
    leadPeak: 0.14, bassPeak: 0.17, padPeak: 0.05, leadGate: 0.60, padEvery: 4, swing: -0.02,
    lead: ['D4','F4','A4','D5','C5','A4','F4','R','Bb4','D5','F5','D5','C5','Bb4','A4','R'],
    bass: ['D2','D2','Bb2','Bb2','C3','C3','A2','A2'], pad: ['D3','F3','A3'],
  },
  dc_obsidian_foundry: { // intense pulsing forge in E minor
    bpm: 144, leadWave: 'sawtooth', bassWave: 'square', padWave: 'triangle',
    leadPeak: 0.12, bassPeak: 0.18, padPeak: 0.04, leadGate: 0.50, padEvery: 8, swing: 0.04,
    lead: ['E4','G4','B4','E5','D5','B4','G4','R','A4','C5','E5','C5','B4','A4','G4','R'],
    bass: ['E2','E2','C3','C3','A2','A2','B2','B2'], pad: ['E3','B3'],
  },
  ar_singularity_vault: { // cosmic gravitational pulse in A minor
    bpm: 120, leadWave: 'sine', bassWave: 'triangle', padWave: 'sine',
    leadPeak: 0.15, bassPeak: 0.16, padPeak: 0.06, leadGate: 0.85, padEvery: 4, swing: -0.05,
    lead: ['A4','C5','E5','G#5','E5','C5','A4','R','F5','A5','C6','A5','G#5','F5','E5','R'],
    bass: ['A2','A2','F2','F2','D2','D2','E2','E2'], pad: ['A3','E4','G#4'],
  },
  glitched_monolith: { // synthesized digital decay, whole-tone / hexatonic arpeggios
    bpm: 128, leadWave: 'sawtooth', bassWave: 'square', padWave: 'sine',
    leadPeak: 0.13, bassPeak: 0.17, padPeak: 0.05, leadGate: 0.55, padEvery: 4, swing: 0.06,
    lead: ['C5','D#5','F#5','A5','G#5','E5','C5','R','D5','F5','G#5','B5','A#5','F#5','D5','R'],
    bass: ['C2','F#2','D2','G#2','C2','A#2','D2','B2'], pad: ['C4','F#3','D4','G#3'],
  },
  source_core_subdungeon: { // rapid clockwork overdrive at the computational core
    bpm: 146, leadWave: 'square', bassWave: 'sawtooth', padWave: 'triangle',
    leadPeak: 0.14, bassPeak: 0.18, padPeak: 0.045, leadGate: 0.50, padEvery: 8, swing: 0.02,
    lead: ['E5','G#5','B5','E6','D#6','B5','G#5','R','F#5','A#5','C#6','F#6','E6','C#6','A#5','R'],
    bass: ['E2','E2','G#2','G#2','F#2','F#2','B2','B2'], pad: ['E3','B3','G#3'],
  },
  ashen_steppes: { // arid steppe winds and nomadic horns in D minor
    bpm: 116, leadWave: 'triangle', bassWave: 'sine', padWave: 'sine',
    leadPeak: 0.14, bassPeak: 0.18, padPeak: 0.05, leadGate: 0.65, padEvery: 4, swing: 0.04,
    lead: ['D4','F4','G4','A4','C5','A4','G4','R','D4','F4','A4','G4','F4','D4','C4','R'],
    bass: ['D2','D2','G2','G2','Bb2','Bb2','A2','A2'], pad: ['D3','F3','A3','C4'],
  },
  as_sandstone_necropolis: { // ancient subterranean tomb echo in F# minor
    bpm: 105, leadWave: 'sine', bassWave: 'triangle', padWave: 'sine',
    leadPeak: 0.13, bassPeak: 0.17, padPeak: 0.05, leadGate: 0.70, padEvery: 4, swing: 0.02,
    lead: ['F#4','G4','A#4','B4','C#5','B4','A#4','R','G4','F#4','E4','F#4','G4','E4','F#4','R'],
    bass: ['F#2','F#2','G2','G2','D2','D2','C#2','C#2'], pad: ['F#3','A#3','C#4'],
  },
  twilight_mire: { // murky swamp mists and bioluminescent resonance in Eb minor
    bpm: 88, leadWave: 'sine', bassWave: 'triangle', padWave: 'triangle',
    leadPeak: 0.12, bassPeak: 0.18, padPeak: 0.06, leadGate: 0.75, padEvery: 4, swing: -0.04,
    lead: ['Eb4','Gb4','Bb4','Db5','C5','Ab4','Gb4','R','F4','Ab4','C5','Bb4','Ab4','Gb4','F4','R'],
    bass: ['Eb2','Eb2','Ab2','Ab2','B2','B2','Bb2','Bb2'], pad: ['Eb3','Gb3','Bb3','Db4'],
  },
  tm_sporeheart_hollow: { // pulsing fungal spores and subterranean decay in G minor
    bpm: 122, leadWave: 'sawtooth', bassWave: 'sine', padWave: 'triangle',
    leadPeak: 0.13, bassPeak: 0.17, padPeak: 0.04, leadGate: 0.58, padEvery: 8, swing: 0.06,
    lead: ['G4','Bb4','Db5','D5','F5','D5','Db5','R','Bb4','G4','F4','G4','Bb4','C5','Db5','R'],
    bass: ['G2','G2','Db2','Db2','C2','C2','D2','D2'], pad: ['G3','Bb3','Db4'],
  },
  tempest_spires: { // electrified storm gales and crackling lightning in B minor
    bpm: 142, leadWave: 'sawtooth', bassWave: 'square', padWave: 'triangle',
    leadPeak: 0.14, bassPeak: 0.19, padPeak: 0.04, leadGate: 0.52, padEvery: 8, swing: 0.03,
    lead: ['B4','D5','F#5','B5','A5','F#5','D5','R','G5','B5','D6','B5','A5','G5','F#5','R'],
    bass: ['B2','B2','G2','G2','E2','E2','F#2','F#2'], pad: ['B3','D4','F#4','A4'],
  },
  ts_thunderforge_peak: { // high voltage titan foundry pulse in E minor
    bpm: 150, leadWave: 'square', bassWave: 'sawtooth', padWave: 'square',
    leadPeak: 0.13, bassPeak: 0.18, padPeak: 0.04, leadGate: 0.46, padEvery: 8, swing: 0.05,
    lead: ['E4','G4','B4','E5','D#5','B4','G4','R','F#4','A4','C5','F#5','E5','C5','B4','R'],
    bass: ['E2','E2','B2','B2','C3','C3','B2','B2'], pad: ['E3','G3','B3'],
  },
  sunless_chasm: { // deep subterranean resonant crystals in C# minor
    bpm: 84, leadWave: 'triangle', bassWave: 'sine', padWave: 'sine',
    leadPeak: 0.13, bassPeak: 0.19, padPeak: 0.07, leadGate: 0.80, padEvery: 4, swing: -0.03,
    lead: ['C#4','E4','G#4','B4','A4','F#4','E4','R','D#4','F#4','A4','G#4','F#4','E4','D#4','R'],
    bass: ['C#2','C#2','A2','A2','F#2','F#2','G#2','G#2'], pad: ['C#3','E3','G#3','B3'],
  },
  sc_abyssal_crypts: { // cold umbral shadows and ancient quietude in Bb minor
    bpm: 98, leadWave: 'sine', bassWave: 'triangle', padWave: 'sawtooth',
    leadPeak: 0.14, bassPeak: 0.18, padPeak: 0.05, leadGate: 0.68, padEvery: 4, swing: 0.01,
    lead: ['Bb4','Db5','F5','Bb5','Ab5','F5','Db5','R','Gb4','Bb4','Db5','Gb5','F5','Db5','C5','R'],
    bass: ['Bb2','Bb2','Gb2','Gb2','E2','E2','F2','F2'], pad: ['Bb3','Db4','F4'],
  },
});

// Compatibility for console callers and older tests; maps use the regional IDs.
const THEME_ALIASES = { town: 'town_awakening', field: 'whispering_woods', battle: 'dragon_caldera', boss: 'dragon_caldera', sanctuary: 'guild_stronghold', stronghold: 'guild_stronghold', homestead: 'player_homestead' };

const AC = window.AudioContext || window.webkitAudioContext;

let ctx = null;
let masterGain = null;   // master gain (mute lives here)
let musicGain = null;    // music gain bus
let sfxGain = null;      // sfx gain bus
let muted = false;
let volumes = { master: 1.0, music: 0.8, sfx: 1.0 };
let loop = null;        // { theme, step, timer, gain, stop() }
let playbackPaused=false;

function init() {
  if (ctx || !AC) return ctx;
  ctx = new AC();
  masterGain = ctx.createGain();
  masterGain.gain.value = muted ? 0 : volumes.master;
  masterGain.connect(ctx.destination);

  musicGain = ctx.createGain();
  musicGain.gain.value = volumes.music;
  musicGain.connect(masterGain);

  sfxGain = ctx.createGain();
  sfxGain.gain.value = volumes.sfx;
  sfxGain.connect(masterGain);

  return ctx;
}

function resume() {
  // must be called from a user gesture at least once
  if (!playbackPaused && ctx && ctx.state === 'suspended') Promise.resolve(ctx.resume()).catch(()=>{});
}

function pausePlayback() {
  playbackPaused=true;
  if(ctx?.suspend)Promise.resolve(ctx.suspend()).catch(()=>{});
}
function resumePlayback() {playbackPaused=false;resume();}

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
  bus.connect(musicGain || masterGain);

  const spb = 60 / theme.bpm;      // seconds per beat (8th note)
  const cur = { theme: resolvedId, gain: bus, step: 0, retired: false };
  loop = cur;

  // schedule one 8th-note step, then chain the next slightly ahead of time.
  function tick() {
    if (cur.retired) return;
    if(playbackPaused){cur.timer=setTimeout(tick,100);return;}
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
  src.connect(bp).connect(g).connect(sfxGain || masterGain);
  src.start(t);
  src.stop(t + dur);
}

// dual-operator FM voice: modulator osc → modGain → carrier.frequency,
// carrier → amp gain (exponential decay like beep()) → sfxGain.
function fmTone(carrierFreq, modRatio, modIndex, t, dur, peak) {
  if (!ctx) return;
  const carrier = ctx.createOscillator();
  const mod = ctx.createOscillator();
  const modGain = ctx.createGain();
  const amp = ctx.createGain();
  carrier.type = 'sine';
  carrier.frequency.value = carrierFreq;
  mod.type = 'sine';
  mod.frequency.value = carrierFreq * modRatio;
  modGain.gain.value = carrierFreq * modIndex;
  mod.connect(modGain).connect(carrier.frequency);
  amp.gain.setValueAtTime(peak, t);
  amp.gain.exponentialRampToValueAtTime(0.001, t + dur);
  carrier.connect(amp).connect(sfxGain || masterGain);
  mod.start(t); carrier.start(t);
  mod.stop(t + dur + 0.02); carrier.stop(t + dur + 0.02);
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
  o.connect(g).connect(sfxGain || masterGain);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export const SFX = {
  attack:     (t) => beep(t, 320, 120, 0.12, 'square', 0.3),
  hit:        (t) => { fmTone(180, 3.5, 6, t, 0.09, 0.32); noise(t, 0.08, 0.25, 900); },
  skill:      (t) => { beep(t, 400, 1100, 0.22, 'triangle', 0.25); beep(t + 0.05, 600, 1400, 0.2, 'square', 0.15); },
  levelup:    (t) => [523, 659, 784, 1047].forEach((f, i) => fmTone(f, 1, 3, t + i * 0.11, 0.18, 0.28)),
  parry:      (t) => fmTone(880, 2, 8, t, 0.4, 0.3),
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
  if (masterGain && ctx) {
    const t = ctx.currentTime || 0;
    const val = muted ? 0 : volumes.master;
    if (masterGain.gain.setTargetAtTime) masterGain.gain.setTargetAtTime(val, t, 0.02);
    else masterGain.gain.value = val;
  }
}

function setVolumes(v = {}) {
  if (v.master !== undefined) volumes.master = v.master;
  if (v.music !== undefined) volumes.music = v.music;
  if (v.sfx !== undefined) volumes.sfx = v.sfx;

  if (!ctx) return;
  const t = ctx.currentTime || 0;
  if (v.master !== undefined && masterGain?.gain) {
    const val = muted ? 0 : volumes.master;
    if (masterGain.gain.setTargetAtTime) masterGain.gain.setTargetAtTime(val, t, 0.02);
    else masterGain.gain.value = val;
  }
  if (v.music !== undefined && musicGain?.gain) {
    if (musicGain.gain.setTargetAtTime) musicGain.gain.setTargetAtTime(volumes.music, t, 0.02);
    else musicGain.gain.value = volumes.music;
  }
  if (v.sfx !== undefined && sfxGain?.gain) {
    if (sfxGain.gain.setTargetAtTime) sfxGain.gain.setTargetAtTime(volumes.sfx, t, 0.02);
    else sfxGain.gain.value = volumes.sfx;
  }
}

export const AUDIO = { init, playMusic, stopMusic, playSfx, setMuted, setVolumes, pausePlayback, resumePlayback, currentMusicTheme: () => loop?.theme || null };
