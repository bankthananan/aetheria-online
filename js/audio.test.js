import assert from 'node:assert/strict';
import { MAPS } from './maps.js';

globalThis.window = { AudioContext: class {} };
const { MUSIC_THEMES, SFX, AUDIO } = await import('./audio.js');

const mapIds = Object.keys(MAPS);
assert.deepEqual(Object.keys(MUSIC_THEMES).sort(), mapIds.sort(), 'every map must own exactly one regional music theme');

const NOTE = /^(?:R|[A-G](?:#|b)?\d)$/;
const WAVES = new Set(['sine', 'square', 'sawtooth', 'triangle']);
const fingerprints = new Set();

for (const mapId of mapIds) {
  const theme = MUSIC_THEMES[mapId];
  assert.ok(theme.bpm >= 70 && theme.bpm <= 170, `${mapId} music tempo is out of range`);
  assert.equal(theme.lead.length, 16, `${mapId} needs a complete 16-step lead phrase`);
  assert.equal(theme.bass.length, 8, `${mapId} needs an 8-step bass phrase`);
  assert.ok(theme.pad?.length, `${mapId} needs an ambient pad identity`);
  for (const wave of [theme.leadWave, theme.bassWave, theme.padWave])
    assert.ok(WAVES.has(wave), `${mapId} uses unsupported oscillator ${wave}`);
  for (const note of [...theme.lead, ...theme.bass, ...theme.pad])
    assert.match(note, NOTE, `${mapId} has invalid note token ${note}`);
  const fingerprint = JSON.stringify({
    bpm: theme.bpm, leadWave: theme.leadWave, bassWave: theme.bassWave,
    lead: theme.lead, bass: theme.bass, pad: theme.pad, swing: theme.swing || 0,
  });
  assert.ok(!fingerprints.has(fingerprint), `${mapId} reuses another map's score`);
  fingerprints.add(fingerprint);
}

// Tier IV Hybrid Ultimate SFX verification
const expectedHybridSfx = [
  'eclipse_strike',
  'apocalypse_harvest',
  'orbital_strike_beacon',
  'orbital_strike',
  'colossal_onslaught',
  'elemental_strike',
  'arcane_arrow_barrage',
  'phalanx',
  'cyclone_lotus_kick',
  'tempest_sanctuary',
];

for (const sfxId of expectedHybridSfx) {
  assert.equal(typeof SFX[sfxId], 'function', `SFX.${sfxId} must be a synthesis function`);
  assert.ok(AUDIO.hasSfx(sfxId), `AUDIO.hasSfx(${sfxId}) must return true`);
  // Must execute safely with fallback in headless test environment
  AUDIO.playSfx(sfxId, 'skill');
}

console.log('Audio audit passed: all maps and Tier IV hybrid ultimates have valid, distinct synthesized scores and SFX.');
