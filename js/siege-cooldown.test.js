// Crystal Siege cooldown: after a siege ends (win or lose) Cedric waits TUNING.siegeCooldownMs; the timer survives save/load.
import assert from 'node:assert/strict';
import { createRuntime } from './test-support/runtime.js';

const { A, advance } = await createRuntime({ mapId: 'guild_stronghold', nullSelectors: [], strictIds: false, now: 1000 });
const S = A.G.strongholdSystem, CD = A.DESIGN.tuning.siegeCooldownMs;
assert.equal(S.siegeCooldownLeft(CD), 0, 'a fresh hero can start a siege');

S.startSiege(); S.resolveSiegeVictory();
assert.equal(S.siegeCooldownLeft(CD), CD, 'a win starts the cooldown');
advance(CD / 2);
assert.equal(S.siegeCooldownLeft(CD), CD / 2, 'it counts down');

const saved = JSON.parse(JSON.stringify(S.serialize()));
S.deserialize({ lastSiegeEndAt: 0 }); S.deserialize(saved);
assert.ok(S.siegeCooldownLeft(CD) > 0, 'cooldown survives save/load');
S.deserialize({ lastSiegeEndAt: 'x' });
assert.ok(S.siegeCooldownLeft(CD) > 0, 'a corrupt value is ignored, not trusted');

advance(CD);
assert.equal(S.siegeCooldownLeft(CD), 0, 'ready again after the wait');
S.startSiege(); S.failSiege();
assert.equal(S.siegeCooldownLeft(CD), CD, 'a loss starts it too');
console.log('Siege cooldown passed.');
