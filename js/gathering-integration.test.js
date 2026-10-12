// js/gathering-integration.test.js
// End-to-End Integration Suite: Open-World Resource Gathering, 1-Tap Fishing & Alchemy.
// Tests live engine boot, content invariants, herb/ore harvesting, nocturnal lotus filtering,
// fishing timing bar & stormfin weather synergy, alchemy crafting & feast consumption,
// strict ZERO screen shake, and save/resume state persistence.

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
const {
  NODE_TYPES,
  HERB_CATALOG,
  ORE_CATALOG,
  FISH_CATALOG,
  MAP_RESOURCE_NODES,
  STORM_WEATHER_IDS,
  createGatheringSystem,
} = await import('./systems/gathering.js');

const A = globalThis.__AWO;
assert.ok(A, 'game debug API loaded');

// 1. Initial player & map boot
const p = A.makePlayer('codeweaver', 'GatherMaster');
A.G.player = p;
p.godMode = true;
p.zeny = 5000;
A.G.running = true;
A.setCtx(document.getElementById('game-canvas'));
A.buildHud();
A.loadMap('whispering_woods', 14, 12);
A.updateHud();

// ============================================================================
// a) Content Invariants
// ============================================================================
const expectedMaterialsAndConsumables = [
  // Herbs (5)
  'silverleaf',
  'frost_lily',
  'ember_blossom',
  'sunken_kelp',
  'moonlight_lotus',
  // Ores (3)
  'copper_ore',
  'iron_vein',
  'caldera_crystal',
  // Fish (6)
  'glowing_trout',
  'abyssal_bass',
  'glacial_salmon',
  'magma_koi',
  'stormfin',
  'golden_carp',
  // Elixirs & Feasts (8)
  'draught_vitality',
  'tonic_swiftness',
  'brew_berserker',
  'elixir_ironbark',
  'essence_night',
  'grilled_trout',
  'smoked_salmon',
  'golden_carp_sashimi',
];
assert.equal(expectedMaterialsAndConsumables.length, 22, 'Exactly 22 new items expected');
for (const itemId of expectedMaterialsAndConsumables) {
  assert.ok(
    CONTENT.items.some(it => it.id === itemId),
    `Item ${itemId} exists in CONTENT.items`
  );
}

const expectedRecipes = [
  'r_vitality',
  'r_swiftness',
  'r_berserker',
  'r_ironbark',
  'r_essence_night',
  'r_grilled_trout',
  'r_smoked_salmon',
  'r_golden_carp_sashimi',
];
assert.equal(expectedRecipes.length, 8, 'Exactly 8 new alchemy/feast recipes expected');
for (const rId of expectedRecipes) {
  assert.ok(
    CONTENT.recipes.some(r => r.id === rId),
    `Recipe ${rId} exists in CONTENT.recipes`
  );
}

// ============================================================================
// b) Herb & Ore harvesting in whispering_woods
// ============================================================================
// Reset gathering nodes to initial state
A.adminAction('resetgather');

// Silverleaf herb at (14, 12)
p.x = 14;
p.y = 12;
const initialSilverleaf = A.itemQty('silverleaf');
A.onCanvasClick(14, 12);

assert.equal(
  A.itemQty('silverleaf'),
  initialSilverleaf + 1,
  'Harvesting silverleaf near node grants 1 silverleaf to inventory'
);

// Depleted click: clicking depleted silverleaf node does not grant additional items
A.onCanvasClick(14, 12);
assert.equal(
  A.itemQty('silverleaf'),
  initialSilverleaf + 1,
  'Depleted silverleaf node does not award items on repeat click'
);

// Verify node entered cooldown in save state
A.saveGame();
let saveGather = A.readSave()?.world?.gathering;
assert.ok(saveGather?.nodes?.node_ww_silverleaf_1?.harvested, 'Silverleaf node marked harvested');
assert.ok(saveGather?.nodes?.node_ww_silverleaf_1?.cooldownRemainingMs > 0, 'Silverleaf node has cooldown remaining');

// Copper Ore at (30, 18)
p.x = 30;
p.y = 18;
const initialCopper = A.itemQty('copper_ore');
A.onCanvasClick(30, 18);

assert.ok(
  A.itemQty('copper_ore') >= initialCopper + 1,
  'Harvesting copper ore near node grants copper_ore to inventory'
);

// Depleted click on copper node
const copperAfterHarvest = A.itemQty('copper_ore');
A.onCanvasClick(30, 18);
assert.equal(
  A.itemQty('copper_ore'),
  copperAfterHarvest,
  'Depleted copper node does not award items on repeat click'
);

A.saveGame();
saveGather = A.readSave()?.world?.gathering;
assert.ok(saveGather?.nodes?.node_ww_copper_1?.harvested, 'Copper node marked harvested');
assert.ok(saveGather?.nodes?.node_ww_copper_1?.cooldownRemainingMs > 0, 'Copper node has cooldown remaining');

// ============================================================================
// c) Night-only nocturnal filtering: moonlight_lotus
// ============================================================================
// Moonlight lotus node is at (18, 24) in whispering_woods
p.x = 18;
p.y = 24;
const initialLotus = A.itemQty('moonlight_lotus');

// 1. Daytime: dayPhase = 0.2 (lotus should be hidden and cannot be harvested)
A.G.dayPhaseOverride = 0.2;
A.onCanvasClick(18, 24);
assert.equal(
  A.itemQty('moonlight_lotus'),
  initialLotus,
  'Moonlight lotus cannot be harvested at daytime (dayPhase = 0.2)'
);

// 2. Nighttime: dayPhase = 0.6 (lotus is active and ready to harvest)
A.G.dayPhaseOverride = 0.6;
A.onCanvasClick(18, 24);
assert.equal(
  A.itemQty('moonlight_lotus'),
  initialLotus + 1,
  'Moonlight lotus harvested successfully at nighttime (dayPhase = 0.6)'
);

// Repeat click while on cooldown
A.onCanvasClick(18, 24);
assert.equal(
  A.itemQty('moonlight_lotus'),
  initialLotus + 1,
  'Moonlight lotus node enters cooldown after being harvested'
);

// ============================================================================
// d) Fishing 1-tap timing bar & weather synergy
// ============================================================================
// Subsystem weather probability test: stormfin rolls in verdant_rain
const rainGatherSys = createGatheringSystem({ rnd: () => 0.25 });
const stormfinEncounter = rainGatherSys.startFishing('node_ww_ripple_1', {
  mapId: 'whispering_woods',
  weatherId: 'verdant_rain',
});
assert.equal(
  stormfinEncounter.targetFish,
  'stormfin',
  'Fishing rolls stormfin during verdant_rain weather'
);

// Clear weather should NOT roll stormfin under the same 0.25 roll
const clearGatherSys = createGatheringSystem({ rnd: () => 0.25 });
const troutEncounter = clearGatherSys.startFishing('node_ww_ripple_1', {
  mapId: 'whispering_woods',
  weatherId: 'clear',
});
assert.equal(
  troutEncounter.targetFish,
  'glowing_trout',
  'Fishing rolls base map fish glowing_trout during clear weather'
);

// Live Engine Fishing Tests
A.adminAction('resetgather');
A.adminAction('setweather:verdant_rain');
assert.equal(A.G.weather.id, 'verdant_rain', 'Admin set weather to verdant_rain');

// Water ripple node in whispering_woods is at (22, 8)
p.x = 22;
p.y = 8;

// --- Test 1: Miss reel-in (needle placed outside sweet spot) ---
const fishCountBefore =
  A.itemQty('glowing_trout') +
  A.itemQty('stormfin') +
  A.itemQty('golden_carp');

// Start fishing by clicking ripple
A.onCanvasClick(22, 8);
A.saveGame();
assert.ok(
  A.readSave()?.world?.gathering?.fishing?.active,
  'Fishing mini-game successfully started at water ripple'
);

// Advance time so the oscillating needle swings to the far edge (needle = 0.5 + 0.48 * sin(t * 3) ~ 0.98)
// t * 3 = PI/2 => t ~ 0.5236
A.step(0.5236);

// Reel in (any canvas click while fishing resolves the cast)
A.onCanvasClick(0, 0);

const fishCountAfterMiss =
  A.itemQty('glowing_trout') +
  A.itemQty('stormfin') +
  A.itemQty('golden_carp');
assert.equal(fishCountAfterMiss, fishCountBefore, 'Miss reel-in did not award any fish');

// Ripple remains unharvested after a miss
A.saveGame();
const missSave = A.readSave()?.world?.gathering;
assert.equal(
  missSave?.nodes?.node_ww_ripple_1?.harvested || false,
  false,
  'Ripple node remains unharvested after missed reel-in'
);

// --- Test 2: Perfect reel-in (needle within sweet spot) ---
// Re-cast line at the ripple
A.onCanvasClick(22, 8);
A.saveGame();
assert.ok(
  A.readSave()?.world?.gathering?.fishing?.active,
  'Fishing cast line started again at unharvested ripple'
);

// At t=0, needle = 0.50, which is centered in [sweetMin, sweetMax]
// Reel in immediately
A.onCanvasClick(0, 0);

const fishCountAfterHit =
  A.itemQty('glowing_trout') +
  A.itemQty('stormfin') +
  A.itemQty('golden_carp');
assert.ok(fishCountAfterHit > fishCountBefore, 'Perfect reel-in awarded fish to inventory');

// Ripple is now harvested and on cooldown
A.saveGame();
const hitSave = A.readSave()?.world?.gathering;
assert.equal(
  hitSave?.nodes?.node_ww_ripple_1?.harvested,
  true,
  'Ripple node marked harvested after successful catch'
);
assert.ok(
  hitSave?.nodes?.node_ww_ripple_1?.cooldownRemainingMs > 0,
  'Ripple node enters cooldown after successful catch'
);

// Subsystem verification of sweet spot hit/miss resolution
const directSys = createGatheringSystem();
const hitSession = directSys.startFishing('node_ww_ripple_1', { targetFish: 'glowing_trout' });
hitSession.needle = 0.50; // Inside sweet spot [0.35, 0.65]
const hitOutcome = directSys.resolveFishingCast();
assert.equal(hitOutcome.success, true, 'Needle in sweet spot returns success: true');
assert.equal(hitOutcome.fishId, 'glowing_trout', 'Returns target fish id');

const directSysMiss = createGatheringSystem();
const missSession = directSysMiss.startFishing('node_ww_ripple_1', { targetFish: 'glowing_trout' });
missSession.needle = 0.15; // Outside sweet spot [0.35, 0.65]
const missOutcome = directSysMiss.resolveFishingCast();
assert.equal(missOutcome.success, false, 'Needle outside sweet spot returns success: false');
assert.equal(missOutcome.fishId, null, 'Returns null fishId on miss');

// ============================================================================
// e) Alchemy crafting & feast consumption
// ============================================================================
// Craft 'draught_vitality' via recipe 'r_vitality' (costs 100 zeny, 2 silverleaf, 1 frost_lily)
A.addItem('silverleaf', 2);
A.addItem('frost_lily', 1);
const vitalityBefore = A.itemQty('draught_vitality');
A.craftItem('r_vitality');
assert.equal(
  A.itemQty('draught_vitality'),
  vitalityBefore + 1,
  'Successfully crafted draught_vitality via recipe r_vitality'
);

// Craft 'grilled_trout' via recipe 'r_grilled_trout' (costs 50 zeny, 1 glowing_trout, 1 silverleaf)
A.addItem('glowing_trout', 1);
A.addItem('silverleaf', 1);
const grilledTroutBefore = A.itemQty('grilled_trout');
A.craftItem('r_grilled_trout');
assert.equal(
  A.itemQty('grilled_trout'),
  grilledTroutBefore + 1,
  'Successfully crafted grilled_trout via recipe r_grilled_trout'
);

// Consume 'draught_vitality': verify player maxHp increases by 200 and buff is active in p.buffs
const baseMaxHp = p.maxHp;
const useVitalityOk = A.useItem('draught_vitality');
assert.equal(useVitalityOk, true, 'useItem(draught_vitality) succeeded');
assert.equal(
  p.maxHp,
  baseMaxHp + 200,
  'Consuming draught_vitality increased player maxHp by 200'
);
assert.ok(
  p.buffs.some(b => b.stat === 'hp' && b.flat === 200),
  'hp buff is present in p.buffs'
);

// Consume 'grilled_trout': verify atk increases by flat 10 and buff is active in p.buffs
const baseAtk = p.physAtk;
const useGrilledTroutOk = A.useItem('grilled_trout');
assert.equal(useGrilledTroutOk, true, 'useItem(grilled_trout) succeeded');
assert.equal(
  p.physAtk,
  baseAtk + 10,
  'Consuming grilled_trout increased player physAtk by 10'
);
assert.ok(
  p.buffs.some(b => b.stat === 'atk' && b.flat === 10),
  'atk buff is present in p.buffs'
);

// ============================================================================
// f) Strict ZERO screen shake
// ============================================================================
A.render();
const initialCamX = A.G.cam.x;
const initialCamY = A.G.cam.y;
assert.equal(typeof initialCamX, 'number', 'Camera X is a valid number');
assert.equal(typeof initialCamY, 'number', 'Camera Y is a valid number');

// Advance frames and test all gathering/fishing operations: camera must remain 100% stable
A.adminAction('resetgather');
p.x = 14;
p.y = 12;
A.onCanvasClick(14, 12); // Harvest herb
A.step(0.016);
A.render();
assert.equal(A.G.cam.x, initialCamX, 'cam.x experienced 0 shake from herb harvest');
assert.equal(A.G.cam.y, initialCamY, 'cam.y experienced 0 shake from herb harvest');

p.x = 22;
p.y = 8;
A.onCanvasClick(22, 8); // Cast fishing line
A.step(0.016);
A.render();
assert.equal(A.G.cam.x, initialCamX, 'cam.x experienced 0 shake from fishing cast');
assert.equal(A.G.cam.y, initialCamY, 'cam.y experienced 0 shake from fishing cast');

A.onCanvasClick(0, 0); // Reel in fish
A.step(0.016);
A.render();
assert.equal(A.G.cam.x, initialCamX, 'cam.x experienced 0 shake from fishing reel-in');
assert.equal(A.G.cam.y, initialCamY, 'cam.y experienced 0 shake from fishing reel-in');

// ============================================================================
// g) Save & Resume persistence
// ============================================================================
// Verify player has active buffs and gathering nodes are tracked
assert.ok(p.buffs.length >= 2, 'Player has active buffs before save');
const saveOk = A.saveGame();
assert.equal(saveOk, true, 'Game saved successfully');

const savedSave = A.readSave();
assert.ok(savedSave, 'readSave returns valid save object');
assert.ok(savedSave.player?.buffs?.length >= 2, 'Save data contains active player buffs');
assert.ok(
  savedSave.player.buffs.some(b => b.stat === 'hp' && b.flat === 200),
  'Saved buffs include draught_vitality maxHp buff'
);
assert.ok(
  savedSave.player.buffs.some(b => b.stat === 'atk' && b.flat === 10),
  'Saved buffs include grilled_trout atk buff'
);
assert.ok(savedSave.world?.gathering, 'Save data contains gathering state');
assert.ok(
  savedSave.world.gathering.nodes?.node_ww_silverleaf_1?.harvested,
  'Saved gathering state retains silverleaf harvest cooldown'
);

// Clear active buffs and reset gathering in memory to test resumeGame restoration
A.G.player.buffs = [];
A.recompute(A.G.player);
assert.equal(A.G.player.buffs.length, 0, 'In-memory buffs cleared before resume');
A.adminAction('resetgather');

const resumeOk = A.resumeGame();
assert.equal(resumeOk, true, 'resumeGame succeeded');

// Verify restored state
assert.ok(A.G.player.buffs.length >= 2, 'Player buffs cleanly restored after resumeGame');
assert.ok(
  A.G.player.buffs.some(b => b.stat === 'hp' && b.flat === 200),
  'Draught of vitality buff active after resume'
);
assert.ok(
  A.G.player.buffs.some(b => b.stat === 'atk' && b.flat === 10),
  'Grilled trout buff active after resume'
);

// Verify node cooldown persistence across resume
A.saveGame();
const resumedSave = A.readSave();
assert.ok(
  resumedSave?.world?.gathering?.nodes?.node_ww_silverleaf_1?.harvested,
  'Gathering node cooldown state preserved after resume'
);

console.log('✔ [PASSED] Gathering Integration: All 7 suites (Content, Harvesting, Nocturnal, Fishing, Alchemy, 0-Shake, Save/Resume) passed cleanly.');
