// js/homestead-integration.test.js
// Comprehensive End-to-End Integration Suite for Adventurer's Homestead & Botanical Sanctum.
// Covers:
//  a) Content Invariants (seeds, produce, feast, seed extraction recipes, map, definitions)
//  b) Town Gate & Level 15 Access Gate Invariant (Hearth portal Lv15 check, entry & exit)
//  c) Botanical Sanctum & Crop Plots Lifecycle (planting, watering hydration 2x boost, stages, harvest & crafting)
//  d) Companion Pasture & Daily Petting / Forage Gifts (daily pet +5 loyalty, cooldown, loyalty >= 40 gifts)
//  e) Armory Mannequins (A & B) 1-Click Equipment Swap (atomic gear swap, retrieve)
//  f) Cozy Hearth Fireplace & "Well Rested" Buff (100% HP/MP restore, +10% EXP for 30m, expiration)
//  g) STRICT ZERO SCREEN SHAKE (Frozen camera object invariance throughout farming, petting, resting, FX, step)
//  h) Save/Resume Persistence (world.homestead persistence, state restoration)
//  i) UX/UI Boxing Containment (box-sizing: border-box, min-width: 0, overflow-x: hidden)

import assert from 'node:assert/strict';
import { installBrowserEnv, DEFAULT_ELEMENT_IDS } from './test-support/browser-env.js';

let vnow = 1000;
installBrowserEnv({
  now: () => vnow,
  innerWidth: 1440,
  innerHeight: 900,
  elementIds: [...DEFAULT_ELEMENT_IDS, 'msg-log', 'homestead-modal-container'],
  nullSelectors: [],
  strictIds: false,
});

const { CONTENT } = await import('./content.js');
await import('./game.js');
const {
  CROP_DEFINITIONS,
  MANNEQUIN_SLOTS,
  PASTURE_FORAGE_TABLE,
  HEARTH_BUFF_DURATION_MS,
  STAGE_EMPTY,
  STAGE_SEEDLING,
  STAGE_VEGETATIVE,
  STAGE_MATURE,
  createHomesteadSystem,
} = await import('./systems/homestead.js');
const { createHomesteadRenderer } = await import('./render/homestead-fx.js');
const { createHomesteadUIRenderer } = await import('./render/homestead-ui.js');
const { MAPS } = await import('./maps.js');

const A = globalThis.__AWO;
assert.ok(A, 'game debug API loaded');

// Set up test player
const p = A.makePlayer('reborn_blade', 'HomesteadPioneer');
A.G.player = p;
p.godMode = true;
A.G.running = true;
A.setCtx(document.getElementById('game-canvas'));
A.buildHud();
A.loadMap('town_awakening', 10, 10);
A.updateHud();

console.log('--- a) Content Invariants ---');
// 1. Seeds exist in CONTENT.items
const expectedSeeds = [
  'seed_silverleaf',
  'seed_golden_wheat',
  'seed_moonflower',
  'seed_ember_blossom',
];
for (const seedId of expectedSeeds) {
  const itemDef = CONTENT.items.find(i => i.id === seedId);
  assert.ok(itemDef, `Seed item '${seedId}' exists in CONTENT.items`);
  assert.equal(itemDef.type, 'material');
  assert.ok(itemDef.name, `Seed '${seedId}' has a name`);
}

// 2. Produce & feast items exist in CONTENT.items
const expectedProduce = ['golden_grain', 'artisan_bread'];
for (const pId of expectedProduce) {
  const itemDef = CONTENT.items.find(i => i.id === pId);
  assert.ok(itemDef, `Produce item '${pId}' exists in CONTENT.items`);
  assert.ok(itemDef.name, `Produce '${pId}' has a name`);
}

// 3. Seed extraction & cooking recipes in CONTENT.recipes
const expectedRecipes = [
  'r_seed_silverleaf',
  'r_seed_moonflower',
  'r_seed_ember_blossom',
  'r_artisan_bread',
];
for (const rId of expectedRecipes) {
  const recipe = CONTENT.recipes.find(r => r.id === rId);
  assert.ok(recipe, `Crafting recipe '${rId}' exists in CONTENT.recipes`);
  assert.ok(Array.isArray(recipe.mats) && recipe.mats.length > 0, `Recipe '${rId}' has mats`);
}

// 4. Map 'player_homestead' exists in MAPS
assert.ok(MAPS.player_homestead, "Map 'player_homestead' exists in MAPS");
assert.equal(MAPS.player_homestead.width, 28, 'Map width is 28');
assert.equal(MAPS.player_homestead.height, 20, 'Map height is 20');

// Exit portal to town_awakening exists
const exitPortal = MAPS.player_homestead.portals.find(pt => pt.toMap === 'town_awakening');
assert.ok(exitPortal, 'Exit portal to town_awakening exists in player_homestead');
assert.equal(exitPortal.x, 14);
assert.equal(exitPortal.y, 18);

// Town portal to player_homestead exists in town_awakening
const townPortal = MAPS.town_awakening.portals.find(pt => pt.toMap === 'player_homestead');
assert.ok(townPortal, 'Hearth portal to player_homestead exists in town_awakening');
assert.equal(townPortal.x, 14);
assert.equal(townPortal.y, 8);

// 5. CROP_DEFINITIONS has all 4 crops
assert.equal(Object.keys(CROP_DEFINITIONS).length, 4, 'CROP_DEFINITIONS has 4 entries');
for (const sId of expectedSeeds) {
  const cDef = CROP_DEFINITIONS[sId];
  assert.ok(cDef, `CROP_DEFINITIONS has ${sId}`);
  assert.ok(cDef.baseDurationMs > 0, `${sId} baseDurationMs > 0`);
  assert.ok(cDef.minYield > 0, `${sId} minYield > 0`);
  assert.ok(cDef.maxYield >= cDef.minYield, `${sId} maxYield >= minYield`);
  assert.ok(cDef.seedReturnChance > 0, `${sId} seedReturnChance > 0`);
}

// 6. MANNEQUIN_SLOTS has 7 slots
assert.equal(MANNEQUIN_SLOTS.length, 7, 'MANNEQUIN_SLOTS has 7 equipment slots');

console.log('--- b) Town Gate & Level 15 Access Gate Invariant ---');
const TS = 32;
// Ensure in town_awakening
A.loadMap('town_awakening', 10, 10);
assert.equal(A.G.mapId, 'town_awakening');

// Player below level 15 (Level 10) cannot enter player_homestead
A.G.player.level = 10;
A.G.player.x = 14 * TS;
A.G.player.y = 8 * TS;
A.G.lastPortalAt = 0;
vnow += 1000;
A.step(0.016);
assert.equal(A.G.mapId, 'town_awakening', 'Player at Level 10 cannot enter player_homestead');

// Advance player to Level 15 -> Entry succeeds
A.G.player.level = 15;
A.G.lastPortalAt = 0;
vnow += 1000;
A.step(0.016);
assert.equal(A.G.mapId, 'player_homestead', 'Player at Level 15 successfully enters player_homestead');

// Exit back to town_awakening
A.G.player.x = 14 * TS;
A.G.player.y = 18 * TS;
A.G.lastPortalAt = 0;
vnow += 1000;
A.step(0.016);
assert.equal(A.G.mapId, 'town_awakening', 'Exited back to town_awakening');

console.log('--- c) Botanical Sanctum & Crop Plots Lifecycle ---');
// Warp back to player_homestead
A.loadMap('player_homestead', 14, 17);
assert.equal(A.G.mapId, 'player_homestead');

// Reset homestead plots
A.G.homesteadSystem.deserialize({ plots: [] });
const initialPlots = A.G.homesteadSystem.getPlots();
assert.equal(initialPlots.length, 6, 'Homestead has 6 crop plots');
assert.equal(initialPlots[0].stage, STAGE_EMPTY, 'Plot 0 starts EMPTY');

// Give player seeds
A.G.player.inventory.push(
  { itemId: 'seed_silverleaf', qty: 5 },
  { itemId: 'seed_golden_wheat', qty: 5 }
);

// Plant seed_silverleaf in plot 0
const plantRes = A.G.homesteadSystem.plantSeed(0, 'seed_silverleaf', A.G.player);
assert.equal(plantRes.success, true, 'Planting seed_silverleaf succeeded');
assert.equal(A.G.homesteadSystem.getPlot(0).stage, STAGE_SEEDLING, 'Plot stage is SEEDLING');
assert.equal(A.G.homesteadSystem.getPlot(0).watered, false, 'Plot starts unwatered');

// Water plot 0 -> Hydrated acceleration
const waterRes = A.G.homesteadSystem.waterPlot(0);
assert.equal(waterRes.success, true, 'Watering plot succeeded');
assert.equal(A.G.homesteadSystem.getPlot(0).watered, true, 'Plot is now watered');

// Double watering fails
const reWater = A.G.homesteadSystem.waterPlot(0);
assert.equal(reWater.success, false, 'Double watering rejected');

// Advance time by half base duration (150,000ms out of 300,000ms base)
// Since hydrated, speed is 2x: 150,000ms * 2 = 300,000ms progress -> reaches MATURE!
A.G.homesteadSystem.tickCrops(150000);
assert.equal(A.G.homesteadSystem.getPlot(0).stage, STAGE_MATURE, 'Hydrated plot matured in half the time');

// Harvest plot 0
const silverleafBefore = A.G.player.inventory.find(i => i.itemId === 'silverleaf')?.qty || 0;
const harvestRes = A.G.homesteadSystem.harvestPlot(0, A.G.player);
assert.equal(harvestRes.success, true, 'Harvesting plot succeeded');
assert.equal(harvestRes.yieldItem, 'silverleaf', 'Harvest yielded silverleaf');
assert.ok(harvestRes.yieldQty >= 2, 'Harvest gave at least 2 produce');
const silverleafAfter = A.G.player.inventory.find(i => i.itemId === 'silverleaf')?.qty || 0;
assert.equal(silverleafAfter, silverleafBefore + harvestRes.yieldQty, 'Produce added to inventory');
assert.equal(A.G.homesteadSystem.getPlot(0).stage, STAGE_EMPTY, 'Plot reset to EMPTY after harvest');

// Test seed extraction craft recipe
A.G.player.zeny = (A.G.player.zeny || 0) + 1000;
const seedsBeforeCraft = A.G.player.inventory.find(i => i.itemId === 'seed_silverleaf')?.qty || 0;
A.craftItem('r_seed_silverleaf');
const seedsAfterCraft = A.G.player.inventory.find(i => i.itemId === 'seed_silverleaf')?.qty || 0;
assert.equal(seedsAfterCraft, seedsBeforeCraft + 1, 'Crafted 1 seed_silverleaf from produce');

// Test background crop growth outside homestead
A.G.homesteadSystem.plantSeed(1, 'seed_golden_wheat', A.G.player);
A.loadMap('town_awakening', 10, 10);
assert.equal(A.G.mapId, 'town_awakening');
const p1Before = A.G.homesteadSystem.getPlot(1).progressMs;
A.step(1.0); // 1 second dt in town
assert.ok(A.G.homesteadSystem.getPlot(1).progressMs > p1Before, 'Crops grow continuously worldwide while adventuring');
A.loadMap('player_homestead', 14, 17);

console.log('--- d) Companion Pasture & Daily Petting / Forage Gifts ---');
// Setup owned pet
A.G.pets = {
  owned: {
    fenrir_wolf: { id: 'fenrir_wolf', name: 'Fenrir', loyalty: 35 },
  },
};
A.loadMap('player_homestead', 14, 17);
assert.ok(A.G.homesteadPets.length >= 1, 'Homestead pets synchronized');
assert.equal(A.G.homesteadPets[0].id, 'fenrir_wolf', 'Fenrir is in pasture');

// Pet companion -> +5 loyalty
const petRes = A.G.homesteadSystem.petCompanion('fenrir_wolf', A.G.pets.owned);
assert.equal(petRes.success, true, 'Petting companion succeeded');
assert.equal(petRes.loyalty, 40, 'Fenrir loyalty increased to 40');
assert.equal(A.G.pets.owned.fenrir_wolf.loyalty, 40, 'Loyalty updated on pet object');

// Same day petting cooldown
const petCooldownRes = A.G.homesteadSystem.petCompanion('fenrir_wolf', A.G.pets.owned);
assert.equal(petCooldownRes.success, false, 'Petting on cooldown rejected');
assert.equal(petCooldownRes.reason, 'cooldown', 'Cooldown reason reported');

// Forage gift generation (loyalty is 40 >= 40)
const gifts = A.G.homesteadSystem.generatePastureGifts(A.G.pets.owned);
assert.ok(gifts.length > 0, 'Forage gifts generated for loyal companion');

// Collect forage gifts
const collectRes = A.G.homesteadSystem.collectPastureGifts(A.G.player);
assert.equal(collectRes.success, true, 'Collected pasture gifts');
assert.ok(collectRes.gifts.length > 0, 'Gifts collected into inventory');
assert.equal(A.G.homesteadSystem.getPendingPastureGifts().length, 0, 'Pending gifts cleared');

console.log('--- e) Armory Mannequins (A & B) 1-Click Equipment Swap ---');
// Setup player with known gear
const blade = A.rollItem('spire_blade', 0, 'epic');
const guardianPlate = A.rollItem('guardian_plate', 0, 'common');
const ironHelm = A.rollItem('iron_helm', 0, 'common');
A.G.player.equip = {
  weapon: blade,
  body: guardianPlate,
  head: ironHelm,
  shield: null,
  accessory: null,
  accessory1: null,
  accessory2: null,
  relic: null,
  hands: null,
  cloak: null,
  feet: null,
};

// Store equipment onto Mannequin A
const storeRes = A.G.homesteadSystem.storeLoadout('mannequin_a', A.G.player);
assert.equal(storeRes.success, true, 'Stored loadout on Mannequin A');
assert.equal(A.G.homesteadSystem.getMannequin('mannequin_a').loadout.weapon.itemId, 'spire_blade');
assert.equal(A.G.player.equip.weapon, null, 'Gear unequipped from player to prevent duplication exploit');
assert.equal(A.G.player.equip.body, null, 'Gear unequipped from player to prevent duplication exploit');
assert.equal(A.G.player.equip.head, null, 'Gear unequipped from player to prevent duplication exploit');

// Change player equipment to alternative gear
const scythe = A.rollItem('spire_scythe', 0, 'epic');
const leatherVest = A.rollItem('leather_vest', 0, 'common');
A.G.player.equip.weapon = scythe;
A.G.player.equip.body = leatherVest;
A.G.player.equip.head = null;

// 1-Click Atomic Equipment Swap on Mannequin A
const swapRes = A.G.homesteadSystem.swapLoadout('mannequin_a', A.G.player);
assert.equal(swapRes.success, true, '1-Click swap succeeded');

// Player should now wear original gear (Spire Blade, Guardian Plate, Iron Helm)
assert.equal(A.G.player.equip.weapon.itemId, 'spire_blade', 'Player now equipped with Spire Blade');
assert.equal(A.G.player.equip.body.itemId, 'guardian_plate', 'Player now equipped with Guardian Plate');
assert.equal(A.G.player.equip.head.itemId, 'iron_helm', 'Player now equipped with Iron Helm');

// Mannequin A should now hold alternative gear (Spire Scythe, Leather Vest)
assert.equal(A.G.homesteadSystem.getMannequin('mannequin_a').loadout.weapon.itemId, 'spire_scythe');
assert.equal(A.G.homesteadSystem.getMannequin('mannequin_a').loadout.body.itemId, 'leather_vest');
assert.equal(A.G.homesteadSystem.getMannequin('mannequin_a').loadout.head, null);

// Retrieve loadout from Mannequin A
const invCountBeforeRetrieve = A.G.player.inventory.length;
const retrieveRes = A.G.homesteadSystem.retrieveLoadout('mannequin_a', A.G.player);
assert.equal(retrieveRes.success, true, 'Retrieved loadout from Mannequin A');
assert.equal(A.G.homesteadSystem.getMannequin('mannequin_a').loadout.weapon, null, 'Mannequin slot emptied');
assert.ok(A.G.player.inventory.length > invCountBeforeRetrieve, 'Items retrieved into inventory');

console.log('--- f) Cozy Hearth Fireplace & "Well Rested" Buff ---');
// Damage player HP and MP
A.G.player.hp = 50;
A.G.player.mp = 10;
assert.ok(A.G.player.hp < A.G.player.maxHp);
assert.ok(A.G.player.mp < A.G.player.maxMp);

// Baseline expMult before buff
A.recompute(A.G.player);
const baselineExpMult = A.G.player.expMult || 1.0;

// Rest at Hearth
const hearthRes = A.G.homesteadSystem.restAtHearth(A.G.player);
assert.equal(hearthRes.success, true, 'Hearth rest succeeded');
assert.equal(A.G.player.hp, A.G.player.maxHp, 'Player HP fully restored');
assert.equal(A.G.player.mp, A.G.player.maxMp, 'Player MP fully restored');
assert.equal(A.G.homesteadSystem.isHearthBuffActive(), true, 'Well Rested buff active');

// Verify Well Rested grants +10% EXP in recompute(p)
A.recompute(A.G.player);
assert.equal(
  Math.round(A.G.player.expMult * 100) / 100,
  Math.round(baselineExpMult * 1.10 * 100) / 100,
  'Well Rested buff grants +10% EXP in recompute'
);

// Advance time past 30 minutes (31 minutes)
vnow += (31 * 60 * 1000);
assert.equal(A.G.homesteadSystem.isHearthBuffActive(), false, 'Well Rested buff expired after 30m');
A.recompute(A.G.player);
assert.equal(
  Math.round(A.G.player.expMult * 100) / 100,
  Math.round(baselineExpMult * 100) / 100,
  'expMult cleanly returned to baseline after buff expiry'
);

console.log('--- g) STRICT ZERO SCREEN SHAKE ---');
const fixedCamX = A.G.cam.x;
const fixedCamY = A.G.cam.y;

// Freeze camera
Object.freeze(A.G.cam);
assert.ok(Object.isFrozen(A.G.cam), 'A.G.cam is strictly frozen');

// Farming actions with frozen camera
A.G.homesteadSystem.plantSeed(1, 'seed_golden_wheat', A.G.player);
A.G.homesteadSystem.waterPlot(1);
A.G.homesteadSystem.tickCrops(480000);
A.G.homesteadSystem.harvestPlot(1, A.G.player);

// Pasture petting and gifts with frozen camera
A.G.homesteadSystem.petCompanion('fenrir_wolf', A.G.pets.owned);
A.G.homesteadSystem.generatePastureGifts(A.G.pets.owned);
A.G.homesteadSystem.collectPastureGifts(A.G.player);

// Mannequin swap with frozen camera
A.G.homesteadSystem.swapLoadout('mannequin_b', A.G.player);

// Hearth rest with frozen camera
A.G.homesteadSystem.restAtHearth(A.G.player);

// Canvas FX rendering with frozen camera
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const plotsToDraw = A.G.homesteadSystem.getPlots().map((p, idx) => ({
  ...p,
  x: (5 + (idx % 3) * 2) * TS,
  y: (13 + Math.floor(idx / 3) * 2) * TS,
}));
A.G.homesteadFx.drawCropPlots(ctx, plotsToDraw, A.G.cam, vnow, 1440, 900);
A.G.homesteadFx.drawPasturePets(ctx, A.G.homesteadPets || [], A.G.cam, vnow, 1440, 900);
A.G.homesteadFx.drawHearthFire(ctx, { x: 6 * TS, y: 4 * TS }, A.G.cam, vnow, 1440, 900);
A.G.homesteadFx.drawMannequins(ctx, [
  { id: 'mannequin_a', x: 8 * TS, y: 4 * TS, loadout: {} },
  { id: 'mannequin_b', x: 10 * TS, y: 4 * TS, loadout: {} },
], A.G.cam, vnow, 1440, 900);
A.G.homesteadFx.triggerPetHearts(200, 200);
A.G.homesteadFx.updateFx(0.016);

// Step game ticks with frozen camera
A.step(0.016);

// Assert camera coordinates remained strictly immutable
assert.equal(A.G.cam.x, fixedCamX, 'A.G.cam.x remained completely unaltered (Strict Zero Screen Shake)');
assert.equal(A.G.cam.y, fixedCamY, 'A.G.cam.y remained completely unaltered (Strict Zero Screen Shake)');

// Unfreeze camera for subsequent tests
A.G.cam = { x: fixedCamX, y: fixedCamY };

console.log('--- h) Save/Resume Persistence ---');
// Prepare known state
A.G.homesteadSystem.plantSeed(2, 'seed_golden_wheat', A.G.player);
A.G.homesteadSystem.waterPlot(2);
A.G.homesteadSystem.storeLoadout('mannequin_a', A.G.player);
A.G.homesteadSystem.restAtHearth(A.G.player);
A.G.homestead = A.G.homesteadSystem.serialize();

// Save game
const saved = A.saveGame();
assert.equal(saved, true, 'A.saveGame() succeeded');

const rawSave = A.readSave();
assert.ok(rawSave?.world?.homestead, 'world.homestead serialized in save file');
assert.equal(rawSave.world.homestead.plots[2].cropId, 'seed_golden_wheat');
assert.equal(rawSave.world.homestead.plots[2].watered, true);
assert.ok(rawSave.world.homestead.hearthBuffExpiresAt > 0);

// Resume game
const resumed = A.resumeGame();
assert.equal(resumed, true, 'A.resumeGame() succeeded');

// Verify deserialization
const resumedPlots = A.G.homesteadSystem.getPlots();
assert.equal(resumedPlots[2].cropId, 'seed_golden_wheat');
assert.equal(resumedPlots[2].watered, true);
assert.equal(A.G.homesteadSystem.isHearthBuffActive(), true);

console.log('--- i) UX/UI Boxing Containment ---');
const plotModalHtml = A.G.homesteadUI.renderPlotModalHtml(resumedPlots[2], A.G.player.inventory);
assert.ok(plotModalHtml.includes('box-sizing: border-box'), 'Plot modal contains box-sizing: border-box');
assert.ok(plotModalHtml.includes('min-width: 0'), 'Plot modal contains min-width: 0');
assert.ok(plotModalHtml.includes('overflow-x: hidden'), 'Plot modal contains overflow-x: hidden');

const pastureModalHtml = A.G.homesteadUI.renderPastureModalHtml(A.G.pets.owned, A.G.homesteadSystem.serialize(), A.G.player.inventory);
assert.ok(pastureModalHtml.includes('box-sizing: border-box'), 'Pasture modal contains box-sizing: border-box');
assert.ok(pastureModalHtml.includes('min-width: 0'), 'Pasture modal contains min-width: 0');
assert.ok(pastureModalHtml.includes('overflow-x: hidden'), 'Pasture modal contains overflow-x: hidden');

const mannequinModalHtml = A.G.homesteadUI.renderMannequinModalHtml('mannequin_a', A.G.homesteadSystem.getMannequin('mannequin_a'), A.G.player);
assert.ok(mannequinModalHtml.includes('box-sizing: border-box'), 'Mannequin modal contains box-sizing: border-box');
assert.ok(mannequinModalHtml.includes('min-width: 0'), 'Mannequin modal contains min-width: 0');
assert.ok(mannequinModalHtml.includes('overflow-x: hidden'), 'Mannequin modal contains overflow-x: hidden');

const hearthModalHtml = A.G.homesteadUI.renderHearthModalHtml(A.G.homesteadSystem.serialize(), A.G.player);
assert.ok(hearthModalHtml.includes('box-sizing: border-box'), 'Hearth modal contains box-sizing: border-box');
assert.ok(hearthModalHtml.includes('min-width: 0'), 'Hearth modal contains min-width: 0');
assert.ok(hearthModalHtml.includes('overflow-x: hidden'), 'Hearth modal contains overflow-x: hidden');

const chronicleTabHtml = A.G.homesteadUI.renderHomesteadChronicleTabHtml(A.G.homesteadSystem.serialize(), A.G.pets.owned);
assert.ok(chronicleTabHtml.includes('box-sizing: border-box'), 'Chronicle tab contains box-sizing: border-box');
assert.ok(chronicleTabHtml.includes('min-width: 0'), 'Chronicle tab contains min-width: 0');
assert.ok(chronicleTabHtml.includes('overflow-x: hidden'), 'Chronicle tab contains overflow-x: hidden');

console.log('All Adventurer Homestead Integration Tests Passed Successfully!');
