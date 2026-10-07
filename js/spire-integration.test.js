// js/spire-integration.test.js
// Comprehensive End-to-End Integration Suite for Abyssal Spire Challenge Tower.
// Covers:
//  a) Content & Catalog Invariants (10 milestone bosses, 12 items, 5 biomes, 8 affixes, 10 checkpoints, map)
//  b) Spire Run Initialization & Checkpoint Selection (Floor 1 start, depths mob pool, 1 affix)
//  c) Affix Scaling & Dynamic Mechanics (Floor 1-40 -> 1 affix, 41+ -> 2 affixes, graviton_well pull, magma_surge damage)
//  d) Wave Clear, Milestone Bosses & Elevator Checkpoints (Floor 1 clear, F10 boss + CP11, F50 title, F100 sovereign)
//  e) Economy & Reliquary Purchases (spendEmblems deduction, item addition, insufficient funds validation)
//  f) STRICT ZERO SCREEN SHAKE (Frozen camera object invariance throughout combat, ticks, clear, portal, rendering)
//  g) Save/Resume Persistence & Clean Session Disconnect (world.spire persistence, idle reset on reload)
//  h) UX/UI Boxing Containment (box-sizing: border-box, min-width: 0, overflow-x: hidden)

import assert from 'node:assert/strict';
import { installBrowserEnv, DEFAULT_ELEMENT_IDS } from './test-support/browser-env.js';

let vnow = 1000;
installBrowserEnv({
  now: () => vnow,
  innerWidth: 1440,
  innerHeight: 900,
  elementIds: [...DEFAULT_ELEMENT_IDS, 'msg-log', 'spire-hud-slot'],
  nullSelectors: [],
  strictIds: false,
});

await import('./game.js');
const { CONTENT } = await import('./content.js');
const {
  SPIRE_BIOMES,
  SPIRE_AFFIXES,
  CHECKPOINT_FLOORS,
  MILESTONE_BOSS_FLOORS,
  createSpireSystem,
} = await import('./systems/spire.js');
const { createSpireRenderer } = await import('./render/spire-fx.js');
const { createSpireUIRenderer, SPIRE_RELIQUARY_CATALOG } = await import('./render/spire-ui.js');
const { MAPS } = await import('./maps.js');

const A = globalThis.__AWO;
assert.ok(A, 'game debug API loaded');

// Set up test player
const p = A.makePlayer('codeweaver', 'SpireChampion');
A.G.player = p;
p.godMode = true;
A.G.running = true;
A.setCtx(document.getElementById('game-canvas'));
A.buildHud();
A.loadMap('town_awakening', 10, 10);
A.updateHud();

console.log('--- a) Content & Catalog Invariants ---');
// 1. All 10 milestone bosses exist in CONTENT.monsters and MILESTONE_BOSS_FLOORS
const expectedMilestoneBosses = {
  10: 'corrupted_treant_boss',
  20: 'abyssal_siren_golem_boss',
  30: 'frost_alpha_boss',
  40: 'glacial_dragon_boss',
  50: 'caldera_avatar_boss',
  60: 'magma_lord_boss',
  70: 'tempest_warden_boss',
  80: 'twin_elementals_boss',
  90: 'herald_sovereign_boss',
  100: 'nullking_spire_boss',
};

for (const [floorStr, bossId] of Object.entries(expectedMilestoneBosses)) {
  const floor = Number(floorStr);
  assert.equal(MILESTONE_BOSS_FLOORS[floor], bossId, `MILESTONE_BOSS_FLOORS[${floor}] matches ${bossId}`);
  const bossMon = CONTENT.monsters.find(m => m.id === bossId);
  assert.ok(bossMon, `Boss '${bossId}' exists in CONTENT.monsters`);
}

// 2. All 12 items exist in CONTENT.items
const expectedItems = [
  'spire_emblem',
  'crown_of_the_ascendant',
  'abyssal_compass',
  'spire_sigil',
  'spire_blade',
  'spire_scythe',
  'spire_greatsword',
  'spire_staff',
  'spire_bow',
  'spire_knuckles',
  'title_spire_challenger',
  'title_abyssal_sovereign',
];

for (const itId of expectedItems) {
  const it = CONTENT.items.find(item => item.id === itId);
  assert.ok(it, `Item '${itId}' exists in CONTENT.items`);
}

// 3. SPIRE_BIOMES contains 5 biomes (depths, glacial, caldera, storm, void)
const expectedBiomes = ['depths', 'glacial', 'caldera', 'storm', 'void'];
assert.equal(Object.keys(SPIRE_BIOMES).length, 5, 'SPIRE_BIOMES contains exactly 5 biomes');
for (const bKey of expectedBiomes) {
  assert.ok(SPIRE_BIOMES[bKey], `Biome '${bKey}' exists in SPIRE_BIOMES`);
  assert.equal(SPIRE_BIOMES[bKey].id, bKey, `Biome id matches '${bKey}'`);
}

// 4. SPIRE_AFFIXES contains 8 affixes
const expectedAffixes = [
  'magma_surge',
  'glacial_chill',
  'mana_drain',
  'sunder_mist',
  'berserk_foes',
  'kinetic_reflect',
  'graviton_well',
  'chrono_haste',
];
assert.equal(Object.keys(SPIRE_AFFIXES).length, 8, 'SPIRE_AFFIXES contains exactly 8 affixes');
for (const afKey of expectedAffixes) {
  assert.ok(SPIRE_AFFIXES[afKey], `Affix '${afKey}' exists in SPIRE_AFFIXES`);
  assert.equal(SPIRE_AFFIXES[afKey].id, afKey, `Affix id matches '${afKey}'`);
}

// 5. CHECKPOINT_FLOORS contains [1, 11, 21, 31, 41, 51, 61, 71, 81, 91]
assert.deepEqual(
  CHECKPOINT_FLOORS,
  [1, 11, 21, 31, 41, 51, 61, 71, 81, 91],
  'CHECKPOINT_FLOORS contains [1, 11, 21, 31, 41, 51, 61, 71, 81, 91]'
);

// 6. abyssal_spire map exists in MAPS
assert.ok(MAPS.abyssal_spire, 'abyssal_spire map exists in MAPS');
assert.equal(MAPS.abyssal_spire.id, 'abyssal_spire', 'MAPS.abyssal_spire id matches');

console.log('--- b) Spire Run Initialization & Checkpoint Selection ---');
A.adminAction('spirefloor', 1);

assert.equal(A.G.mapId, 'abyssal_spire', 'Player transitioned to abyssal_spire map');
assert.ok(A.G.spireState, 'spireState is initialized');
assert.equal(A.G.spireState.active, true, 'spireState.active is true');
assert.equal(A.G.spireState.currentFloor, 1, 'spireState.currentFloor is 1');
assert.ok(A.G.monsters.length > 0, 'Wave mobs spawned on Floor 1');

for (const m of A.G.monsters) {
  assert.equal(m._spireMob, true, 'Spawned mob has _spireMob === true');
  assert.ok(
    SPIRE_BIOMES.depths.pool.includes(m.def.id),
    `Spawned mob ${m.def.id} belongs to Depths pool`
  );
}

assert.equal(A.G.spireState.activeAffixes.length, 1, 'Floor 1 rolls exactly 1 affix');

console.log('--- c) Affix Scaling & Dynamic Mechanics ---');
// 1. Affix count scaling: Floor 1-40 rolls 1 affix; Floor 41+ rolls 2 affixes
assert.equal(A.G.spireSystem.rollFloorAffixes(1).length, 1, 'Floor 1 rolls 1 affix');
assert.equal(A.G.spireSystem.rollFloorAffixes(10).length, 1, 'Floor 10 rolls 1 affix');
assert.equal(A.G.spireSystem.rollFloorAffixes(40).length, 1, 'Floor 40 rolls 1 affix');
assert.equal(A.G.spireSystem.rollFloorAffixes(41).length, 2, 'Floor 41 rolls 2 affixes');
assert.equal(A.G.spireSystem.rollFloorAffixes(60).length, 2, 'Floor 60 rolls 2 affixes');
assert.equal(A.G.spireSystem.rollFloorAffixes(100).length, 2, 'Floor 100 rolls 2 affixes');

// 2. Graviton well pull in step(dt): combatants pulled toward arena center
// Center is (12 * TS, 9 * TS) = (384, 288)
const TS = 32;
const arenaCenterX = 12 * TS;
const arenaCenterY = 9 * TS;

// Position player and monster away from center
p.x = 3 * TS;
p.y = 3 * TS;
assert.ok(A.G.monsters.length > 0, 'Monsters available for graviton test');
const mob = A.G.monsters[0];
mob.x = 4 * TS;
mob.y = 4 * TS;

A.G.spireState.activeAffixes = [{ id: 'graviton_well', name: 'Graviton Well' }];
A.G.spireState._nextGravitonAt = vnow;

const pDistBefore = Math.hypot(arenaCenterX - p.x, arenaCenterY - p.y);
const mobDistBefore = Math.hypot(arenaCenterX - mob.x, arenaCenterY - mob.y);

A.step(0.016);

const pDistAfter = Math.hypot(arenaCenterX - p.x, arenaCenterY - p.y);
const mobDistAfter = Math.hypot(arenaCenterX - mob.x, arenaCenterY - mob.y);

assert.ok(pDistAfter < pDistBefore, 'Player was pulled toward arena center by graviton_well');
assert.ok(mobDistAfter < mobDistBefore, 'Monster was pulled toward arena center by graviton_well');

// 3. Magma surge eruption damage in step(dt)
p.godMode = false;
p.invulnUntil = 0;
p.hp = 100;
p.maxHp = 100;
A.G.spireState.activeAffixes = [{ id: 'magma_surge', name: 'Magma Surge' }];
A.G.spireState._nextMagmaAt = vnow;

A.step(0.016);

assert.equal(Math.round(p.hp), 90, 'Magma surge eruption dealt 10 damage to player');
p.godMode = true; // Restore god mode for safety

console.log('--- d) Wave Clear, Milestone Bosses & Elevator Checkpoints ---');
// 1. Clear Floor 1 via A.adminAction('spireclear')
A.adminAction('spirefloor', 1);
const emblemsBeforeClearF1 = A.G.spireSystem.getEmblems();
A.adminAction('spireclear');

assert.equal(A.G.spireState.cleared, true, 'Floor 1 marked as cleared');
assert.ok(
  A.G.spireSystem.getEmblems() > emblemsBeforeClearF1,
  'Emblems awarded to spireSystem on Floor 1 clear'
);
assert.equal(
  A.G.monsters.filter(m => m.alive).length,
  0,
  'Slaying monsters cleared Floor 1'
);

// Advancing floor resets player coordinates to (2*TS, 2*TS), away from portal and boss spawn center
p.x = 12 * TS;
p.y = 9 * TS;
A.onCanvasClick(12 * TS, 9 * TS);
assert.equal(A.G.spireState.currentFloor, 2, 'Spire advanced to Floor 2');
assert.equal(p.x, 2 * TS, 'Player X reset to 2 * TS on floor advance');
assert.equal(p.y, 2 * TS, 'Player Y reset to 2 * TS on floor advance');
assert.ok(
  Math.hypot(p.x - 12 * TS, p.y - 9 * TS) > 5 * TS,
  'Player repositioned safely away from portal & boss spawn center'
);

// 2. Milestone boss encounter on Floor 10
A.adminAction('spirefloor', 10);
assert.ok(A.G.spireBossMob, 'A.G.spireBossMob exists on Floor 10');
assert.equal(A.G.spireBossMob._spireBoss, true, 'Boss has _spireBoss === true');
assert.equal(
  A.G.spireBossMob.def.id,
  MILESTONE_BOSS_FLOORS[10],
  'Boss id matches corrupted_treant_boss on Floor 10'
);
assert.equal(
  A.G.spireSystem.isCheckpointUnlocked(11),
  false,
  'Checkpoint 11 locked before clearing Floor 10'
);

// Slay boss via spireclear
A.adminAction('spireclear');
assert.equal(A.G.spireState.cleared, true, 'Floor 10 cleared');
assert.equal(
  A.G.spireSystem.isCheckpointUnlocked(11),
  true,
  'Clearing Floor 10 unlocks Checkpoint 11'
);

// 3. Milestone Floor 50 clear unlocks title_spire_challenger
A.adminAction('spirefloor', 50);
assert.ok(A.G.spireBossMob, 'A.G.spireBossMob exists on Floor 50');
assert.equal(
  A.G.spireBossMob.def.id,
  MILESTONE_BOSS_FLOORS[50],
  'Boss id matches caldera_avatar_boss on Floor 50'
);
A.adminAction('spireclear');
assert.ok(
  A.G.spireSystem.getUnlockedTitles().includes('title_spire_challenger'),
  'Floor 50 clear unlocks title_spire_challenger'
);

// 4. Milestone Floor 100 clear unlocks title_abyssal_sovereign
A.adminAction('spirefloor', 100);
assert.ok(A.G.spireBossMob, 'A.G.spireBossMob exists on Floor 100');
assert.equal(
  A.G.spireBossMob.def.id,
  MILESTONE_BOSS_FLOORS[100],
  'Boss id matches nullking_spire_boss on Floor 100'
);
A.adminAction('spireclear');
assert.ok(
  A.G.spireSystem.getUnlockedTitles().includes('title_abyssal_sovereign'),
  'Floor 100 clear unlocks title_abyssal_sovereign'
);

console.log('--- e) Economy & Reliquary Purchases ---');
// Insufficient funds test
const currentEmblems = A.G.spireSystem.getEmblems();
const failBuy = A.G.spireSystem.spendEmblems(currentEmblems + 5000);
assert.equal(failBuy, false, 'Buying without enough emblems fails cleanly');

// Sufficient funds purchase test
const reliquaryItem = SPIRE_RELIQUARY_CATALOG.find(item => item.id === 'spire_sigil') || {
  id: 'spire_sigil',
  cost: 800,
};
const itemCost = reliquaryItem.cost;
if (A.G.spireSystem.getEmblems() < itemCost) {
  // Give enough emblems for verification
  const curSerialized = A.G.spireSystem.serialize();
  curSerialized.emblems = itemCost + 500;
  A.G.spireSystem.deserialize(curSerialized);
}

const emblemsBeforePurchase = A.G.spireSystem.getEmblems();
const itemQtyBefore = p.inventory.filter(it => it.itemId === reliquaryItem.id).length;

const spendSuccess = A.G.spireSystem.spendEmblems(itemCost);
assert.equal(spendSuccess, true, 'spendEmblems succeeded with sufficient balance');
A.addItem(reliquaryItem.id, 1);

assert.equal(
  A.G.spireSystem.getEmblems(),
  emblemsBeforePurchase - itemCost,
  'Emblems deducted correctly'
);
assert.equal(
  p.inventory.filter(it => it.itemId === reliquaryItem.id).length,
  itemQtyBefore + 1,
  'Item added to inventory upon purchase'
);

// Relic Perks Verification: Crown of the Ascendant & Abyssal Compass
A.adminAction('spirefloor', 1);
assert.equal(A.G.mapId, 'abyssal_spire', 'Active in Abyssal Spire');

// Equipping crown_of_the_ascendant applies +10 all elemental resistances and +15% damage bonus in Abyssal Spire
A.unequip('relic');
A.recompute(p);
const elements = ['fire', 'water', 'nature', 'light', 'void', 'ice', 'lightning'];
const baseRes = {};
for (const elem of elements) {
  baseRes[elem] = p['res_' + elem] || 0;
}

const crown = A.addItem('crown_of_the_ascendant', 1);
crown.affixes = [];
A.equip(crown.uid);
A.recompute(p);

for (const elem of elements) {
  assert.equal(
    p['res_' + elem],
    baseRes[elem] + 10,
    `Crown of the Ascendant applies +10 ${elem} resistance`
  );
}

const dummyMonster = A.makeMonster(CONTENT.monsters[0], 200, 200, 10);
dummyMonster.dv = 0;
dummyMonster.statuses = {};
dummyMonster.hp = 1000;
dummyMonster.maxHp = 1000;
A.G.monsters.push(dummyMonster);

const hpBeforeHit = dummyMonster.hp;
A.damageMonster(dummyMonster, 100, false);
const damageDealtInSpire = hpBeforeHit - dummyMonster.hp;
assert.equal(
  damageDealtInSpire,
  115,
  'Crown of the Ascendant applies +15% damage bonus in Abyssal Spire'
);

A.unequip('relic');
A.recompute(p);
for (const elem of elements) {
  assert.equal(
    p['res_' + elem],
    baseRes[elem],
    `Resistances reset after unequipping Crown for ${elem}`
  );
}

// Equipping abyssal_compass applies +15 flee and +10% moveMult
const fleeBefore = p.flee;
const moveMultBefore = p.moveMult;

const compass = A.addItem('abyssal_compass', 1);
compass.affixes = [];
A.equip(compass.uid);
A.recompute(p);

assert.equal(p.flee, fleeBefore + 15, 'Abyssal Compass applies +15 flee');
assert.ok(
  Math.abs(p.moveMult - moveMultBefore * 1.10) < 0.001,
  'Abyssal Compass applies +10% moveMult'
);

A.unequip('relic');
A.recompute(p);
assert.equal(p.flee, fleeBefore, 'Flee resets after unequipping Abyssal Compass');
assert.ok(
  Math.abs(p.moveMult - moveMultBefore) < 0.001,
  'moveMult resets after unequipping Abyssal Compass'
);

console.log('--- f) STRICT ZERO SCREEN SHAKE ---');
A.adminAction('spirefloor', 1);
const initialCamX = A.G.cam.x;
const initialCamY = A.G.cam.y;

// Freeze camera
Object.freeze(A.G.cam);
assert.ok(Object.isFrozen(A.G.cam), 'Camera is strictly frozen');

// Combat attacks with frozen camera
if (A.G.monsters.length > 0) {
  const targetMob = A.G.monsters[0];
  A.damageMonster(targetMob, 10);
}

// Affix ticks with frozen camera
A.G.spireFx.updateFx(0.016);

// Wave clear with frozen camera
A.adminAction('spireclear');

// Portal interaction with frozen camera
A.G.spireFx.triggerClearPortal(arenaCenterX, arenaCenterY);
A.G.spireFx.updateFx(0.016);

// Rendering with frozen camera
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
A.G.spireFx.drawSpireAffixFx(ctx, [{ id: 'magma_surge' }, { id: 'graviton_well' }], A.G.cam, vnow);
A.G.spireFx.drawAscendancePortal(ctx, { x: arenaCenterX, y: arenaCenterY }, A.G.cam, vnow);
A.G.spireFx.drawMilestoneBossFanfare(ctx, { x: arenaCenterX, y: arenaCenterY }, A.G.cam, vnow);
A.G.spireFx.drawGravitonVortex(ctx, arenaCenterX, arenaCenterY, A.G.cam, vnow);

// Verify camera coordinates never changed
assert.equal(A.G.cam.x, initialCamX, 'A.G.cam.x was never modified (Strict Zero Screen Shake)');
assert.equal(A.G.cam.y, initialCamY, 'A.G.cam.y was never modified (Strict Zero Screen Shake)');

// Unfreeze camera for subsequent tests
A.G.cam = { x: initialCamX, y: initialCamY };

console.log('--- g) Save/Resume Persistence & Clean Session Disconnect ---');
// Prepare known spire system state
A.G.spireSystem.deserialize({
  highestFloor: 55,
  unlockedCheckpoints: [1, 11, 21, 31, 41, 51],
  emblems: 1450,
  unlockedTitles: ['title_spire_challenger'],
});
A.G.spire = A.G.spireSystem.serialize();

// Start a run so active run is non-null
A.adminAction('spirefloor', 51);
assert.ok(A.G.spireState?.active, 'Active spire run before save');

// Save game
const saved = A.saveGame();
assert.equal(saved, true, 'Game saved successfully');

const savePayload = A.readSave();
assert.ok(savePayload?.world?.spire, 'world.spire serialized in save data');
assert.equal(savePayload.world.spire.highestFloor, 55, 'Serialized highestFloor matches');
assert.deepEqual(
  savePayload.world.spire.unlockedCheckpoints,
  [1, 11, 21, 31, 41, 51],
  'Serialized unlockedCheckpoints match'
);
assert.equal(savePayload.world.spire.emblems, 1450, 'Serialized emblems match');
assert.deepEqual(
  savePayload.world.spire.unlockedTitles,
  ['title_spire_challenger'],
  'Serialized unlockedTitles match'
);

// Resume game (simulates clean session disconnect)
const resumed = A.resumeGame();
assert.equal(resumed, true, 'Game resumed successfully');

assert.equal(A.G.spireSystem.getHighestFloor(), 55, 'Highest floor deserialized correctly');
assert.deepEqual(
  A.G.spireSystem.getUnlockedCheckpoints(),
  [1, 11, 21, 31, 41, 51],
  'Unlocked checkpoints deserialized correctly'
);
assert.equal(A.G.spireSystem.getEmblems(), 1450, 'Emblems deserialized correctly');
assert.deepEqual(
  A.G.spireSystem.getUnlockedTitles(),
  ['title_spire_challenger'],
  'Unlocked titles deserialized correctly'
);

// Clean session disconnect: active run resets to idle (null)
assert.equal(A.G.spireState, null, 'Active run reset to null on reload');
assert.equal(A.G.spireBossMob, null, 'Spire boss mob reset to null on reload');
assert.equal(A.G.spireSystem.getActiveRun(), null, 'Spire system active run is null on reload');

console.log('--- h) UX/UI Boxing Containment ---');
const sampleSpireState = {
  active: true,
  currentFloor: 10,
  emblemsEarned: 15,
  activeAffixes: [
    { id: 'magma_surge', name: 'Magma Surge', desc: 'Fissures erupt' },
    { id: 'graviton_well', name: 'Graviton Well', desc: 'Pulls inward' },
  ],
};

const sampleSpireProgress = {
  highestFloor: 50,
  emblems: 800,
  unlockedCheckpoints: [1, 11, 21, 31, 41, 51],
  unlockedTitles: ['title_spire_challenger'],
};

// 1. Spire HUD HTML containment
const hudHtml = A.G.spireUI.renderSpireHudHtml(sampleSpireState);
assert.ok(hudHtml.includes('box-sizing: border-box'), 'HUD HTML contains box-sizing: border-box');
assert.ok(hudHtml.includes('min-width: 0'), 'HUD HTML contains min-width: 0');
assert.ok(hudHtml.includes('overflow-x: hidden'), 'HUD HTML contains overflow-x: hidden');

// 2. Elevator Modal HTML containment
const elevatorHtml = A.G.spireUI.renderElevatorModalHtml(sampleSpireProgress);
assert.ok(elevatorHtml.includes('box-sizing: border-box'), 'Elevator HTML contains box-sizing: border-box');
assert.ok(elevatorHtml.includes('min-width: 0'), 'Elevator HTML contains min-width: 0');
assert.ok(elevatorHtml.includes('overflow-x: hidden'), 'Elevator HTML contains overflow-x: hidden');

// 3. Reliquary Tab HTML containment
const reliquaryHtml = A.G.spireUI.renderSpireReliquaryTabHtml(sampleSpireProgress, p.inventory);
assert.ok(reliquaryHtml.includes('box-sizing: border-box'), 'Reliquary HTML contains box-sizing: border-box');
assert.ok(reliquaryHtml.includes('min-width: 0'), 'Reliquary HTML contains min-width: 0');
assert.ok(reliquaryHtml.includes('overflow-x: hidden'), 'Reliquary HTML contains overflow-x: hidden');

console.log('✔ All Abyssal Spire integration assertions passed 100%!');
