// js/incursions-integration.test.js
// Integration test: World Event Rifts, Dimensional Incursions & Rift Portals.
// Verifies live engine boot, tear spawning via adminAction, incursion activation,
// 3-wave progression (wisps -> stalker champion -> void herald), sealing reward cache,
// cache item consumption granting Zeny/shards/runes/materials, mutator mechanics,
// strict ZERO screen shake, and save/resume persistence.

import assert from 'node:assert/strict';
import { installBrowserEnv } from './test-support/browser-env.js';

let vnow = 1000;

installBrowserEnv({
  now: () => vnow,
  innerWidth: 1440,
  innerHeight: 900,
  nullSelectors: [],
  strictIds: false,
});

await import('./game.js');
const { CONTENT } = await import('./content.js');
const { INCURSION_STATES, MUTATORS } = await import('./systems/incursions.js');
const A = globalThis.__AWO;
assert.ok(A, 'game debug API loaded');

// 1. Initial player & map boot
const p = A.makePlayer('codeweaver', 'RiftBreaker');
A.G.player = p;
p.godMode = true;
A.G.running = true;
A.setCtx(document.getElementById('game-canvas'));
A.buildHud();
A.loadMap('whispering_woods', 10, 10);
A.updateHud();

// 2. Content Invariants: monsters & items
assert.ok(CONTENT.monsters.find(m => m.id === 'void_stalker'), 'void_stalker registered in monsters');
assert.ok(CONTENT.monsters.find(m => m.id === 'void_herald'), 'void_herald registered in monsters');
assert.ok(CONTENT.items.find(it => it.id === 'dimensional_shard'), 'dimensional_shard registered in items');
assert.ok(CONTENT.items.find(it => it.id === 'rift_cache'), 'rift_cache registered in items');

// 3. Spawning Dimensional Tear via adminAction
A.adminAction('spawnrift');
assert.ok(p.x > 0 && p.y > 0, 'player has coordinates');

// Click on the tear near player to trigger incursion
A.onCanvasClick(p.x + 48, p.y);

// Verify incursion mobs spawned
let incMobs = A.G.monsters.filter(m => m._incursionMob && m.alive);
assert.ok(incMobs.length > 0, `Wave 1 spawned incursion monsters: found ${incMobs.length}`);
assert.equal(incMobs[0]._incursionMob, true, 'Mob has _incursionMob flag');

// 4. Wave 1 -> Wave 2 Progression
// Kill all wave 1 monsters
for (const m of incMobs) {
  A.killMonster(m);
}

// Wave 2 mobs should now be spawned
let wave2Mobs = A.G.monsters.filter(m => m._incursionMob && m.alive);
assert.ok(wave2Mobs.length > 0, `Wave 2 spawned monsters: found ${wave2Mobs.length}`);
// One of them should be void_stalker with champion affixes
const stalker = wave2Mobs.find(m => m.def?.id === 'void_stalker');
assert.ok(stalker, 'Wave 2 contains void_stalker');
assert.ok(stalker.eliteAffixes && stalker.eliteAffixes.length > 0, 'void_stalker received champion affixes');
assert.equal(stalker.eliteTier, 'champion', 'void_stalker is champion tier');

// 5. Wave 2 -> Wave 3 Progression
for (const m of wave2Mobs) {
  A.killMonster(m);
}

let wave3Mobs = A.G.monsters.filter(m => m._incursionMob && m.alive);
assert.ok(wave3Mobs.length > 0, `Wave 3 spawned monsters: found ${wave3Mobs.length}`);
const herald = wave3Mobs.find(m => m.def?.id === 'void_herald');
assert.ok(herald, 'Wave 3 contains void_herald boss');

// 6. Wave 3 Clear & Sealing Incursion
const initialCacheQty = A.itemQty('rift_cache');
for (const m of wave3Mobs) {
  A.killMonster(m);
}

// Step once to settle state
A.step(0.1);
assert.ok(A.itemQty('rift_cache') >= initialCacheQty + 1, 'Player received Dimensional Cache upon sealing');

// 7. Consuming Dimensional Cache
const initialZeny = p.zeny || 0;
const initialShards = A.itemQty('dimensional_shard');
const primalRuneIds = ['rune_ember', 'rune_glacial', 'rune_storm', 'rune_verdant', 'rune_luminous', 'rune_umbral'];
const runesCountBefore = primalRuneIds.reduce((sum, rid) => sum + A.itemQty(rid), 0);
const cachesBefore = A.itemQty('rift_cache');

const useSuccess = A.useItem('rift_cache');
assert.equal(useSuccess, true, 'rift_cache was successfully used');
assert.equal(A.itemQty('rift_cache'), cachesBefore - 1, 'rift_cache consumed from bag');
assert.ok((p.zeny || 0) >= initialZeny + 2500, `Zeny increased by at least 2500 (now: ${p.zeny})`);
assert.ok(A.itemQty('dimensional_shard') >= initialShards + 3, 'Gained at least 3 dimensional shards');
const runesCountAfter = primalRuneIds.reduce((sum, rid) => sum + A.itemQty(rid), 0);
assert.ok(runesCountAfter >= runesCountBefore + 1, 'Gained at least 1 primal rune');

// 8. Strict ZERO Camera Shake Invariant
A.render();
const initialCamX = A.G.cam.x;
const initialCamY = A.G.cam.y;
for (let frame = 0; frame < 5; frame++) {
  A.step(0.016);
  A.render();
  assert.equal(A.G.cam.x, initialCamX, 'cam.x experienced 0% shake');
  assert.equal(A.G.cam.y, initialCamY, 'cam.y experienced 0% shake');
}

// 9. Save & Resume Incursion Persistence
const saveOk = A.saveGame();
assert.equal(saveOk, true, 'Game saved successfully');
const savedData = A.readSave();
assert.ok(savedData?.world?.incursion, 'Save data contains incursion state');

const resumeOk = A.resumeGame();
assert.equal(resumeOk, true, 'Game resumed successfully');

// 10. Mutators Catalog & Admin Seal Action
const expectedMutators = ['void_decay', 'graviton_well', 'primal_instability', 'phase_shift'];
for (const mId of expectedMutators) {
  assert.ok(MUTATORS[mId], `Mutator ${mId} exists in MUTATORS`);
}

// Test admin seal action
A.adminAction('spawnrift');
A.onCanvasClick(p.x + 48, p.y);
const sealCacheBefore = A.itemQty('rift_cache');
A.adminAction('sealrift');
assert.equal(A.itemQty('rift_cache'), sealCacheBefore + 1, 'adminAction sealrift sealed incursion and granted Dimensional Cache');

console.log('Incursions integration test passed cleanly with zero screen shake.');
