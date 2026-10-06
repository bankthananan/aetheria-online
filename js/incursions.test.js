// js/incursions.test.js
// Unit tests for the World Event Rifts & Dimensional Incursions Subsystem.

import assert from 'node:assert/strict';
import {
  createIncursionSystem,
  INCURSION_STATES,
  MUTATORS,
  WAVE_TEMPLATES,
} from './systems/incursions.js';

let vnow = 1000;
const incursionSystem = createIncursionSystem({
  now: () => vnow,
  rnd: () => 0.5,
});

// 1. Initial State
assert.equal(incursionSystem.getState(), INCURSION_STATES.IDLE, 'Initial state is IDLE');
assert.ok(incursionSystem.getCooldownRemaining() > 0, 'Initial cooldown is set');

// 2. Triggering a Tear
const tear = incursionSystem.triggerTear({ mapId: 'whispering_woods', x: 200, y: 300 });
assert.equal(incursionSystem.getState(), INCURSION_STATES.TEAR_OPEN, 'State transitions to TEAR_OPEN');
assert.equal(tear.mapId, 'whispering_woods', 'Tear map matches');
assert.equal(tear.x, 200, 'Tear X matches');
assert.equal(tear.y, 300, 'Tear Y matches');
assert.ok(tear.expiresAt > vnow, 'Tear expiration timer is set');
assert.ok(tear.mutator, 'Tear has an assigned mutator');
assert.ok(MUTATORS[tear.mutator.id], 'Mutator is from MUTATORS catalog');

// 3. Tear Expiration (Timeout before interaction)
vnow = tear.expiresAt + 10;
incursionSystem.tick(1.0, { activeMapId: 'whispering_woods', isIntenseWeather: false });
assert.equal(incursionSystem.getState(), INCURSION_STATES.IDLE, 'Tear dissolves into IDLE on timeout');

// 4. Starting an Incursion
vnow = 10000;
incursionSystem.triggerTear({ mapId: 'whispering_woods', x: 250, y: 350 });
const inc = incursionSystem.startIncursion();
assert.equal(incursionSystem.getState(), INCURSION_STATES.INCURSION_ACTIVE, 'State transitions to INCURSION_ACTIVE');
assert.equal(inc.currentWave, 1, 'Incursion starts at Wave 1');
assert.ok(inc.waveMonsterIds.length > 0, 'Wave 1 has monster IDs');
assert.equal(inc.waveMonsterIds[0], 'void_wisp', 'Wave 1 contains void_wisp');
assert.ok(inc.timeRemainingMs > 0, 'Incursion has a countdown timer');

// 5. Wave Progression
// Simulate killing all monsters of Wave 1
const wave1Cleared = incursionSystem.checkWaveClear([]);
assert.equal(wave1Cleared, true, 'Wave 1 is marked as cleared');
const incWave2 = incursionSystem.advanceWave();
assert.equal(incWave2.currentWave, 2, 'Advances to Wave 2');
assert.ok(incWave2.waveMonsterIds.includes('void_stalker'), 'Wave 2 contains void_stalker');

// Advance through Wave 2 to Wave 3
incursionSystem.checkWaveClear([]);
const incWave3 = incursionSystem.advanceWave();
assert.equal(incWave3.currentWave, 3, 'Advances to Wave 3 (Boss Wave)');
assert.ok(incWave3.waveMonsterIds.includes('void_herald'), 'Wave 3 contains void_herald');

// 6. Sealing the Incursion & Cache Loot Generation
const sealed = incursionSystem.sealIncursion();
assert.equal(incursionSystem.getState(), INCURSION_STATES.SEALED, 'Defeating Herald transitions state to SEALED');
assert.ok(sealed.cache, 'Generates a Dimensional Cache reward object');
assert.ok(sealed.cache.zeny >= 2500, 'Cache contains Zeny');
assert.ok(sealed.cache.materials.some(m => m.id === 'dimensional_shard'), 'Cache contains dimensional shards');
assert.ok(sealed.cache.runes.length >= 1, 'Cache contains at least 1 Primal Rune');

// 7. Event Timeout Failure
vnow = 20000;
incursionSystem.triggerTear({ mapId: 'whispering_woods', x: 100, y: 100 });
incursionSystem.startIncursion();
vnow += 100000; // Exceed 90-second event timer
incursionSystem.tick(1.0, { activeMapId: 'whispering_woods', isIntenseWeather: false });
assert.equal(incursionSystem.getState(), INCURSION_STATES.COLLAPSED, 'State transitions to COLLAPSED on incursion timeout');

// 8. Weather Surge Spawn Acceleration
incursionSystem.resetToIdle();
const normalRemaining = incursionSystem.getCooldownRemaining();
incursionSystem.tick(10.0, { activeMapId: 'whispering_woods', isIntenseWeather: false });
const normalDelta = normalRemaining - incursionSystem.getCooldownRemaining();

incursionSystem.resetToIdle();
const weatherRemaining = incursionSystem.getCooldownRemaining();
incursionSystem.tick(10.0, { activeMapId: 'whispering_woods', isIntenseWeather: true });
const weatherDelta = weatherRemaining - incursionSystem.getCooldownRemaining();

assert.ok(weatherDelta > normalDelta, 'Intense weather accelerates rift cooldown faster than normal weather');

console.log('✔ All incursion core unit tests passed.');
