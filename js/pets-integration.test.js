// js/pets-integration.test.js
// Comprehensive End-to-End Integration Suite: Companion & Pet Familiars Subsystem.
// Verifies live engine boot, content invariants, wild creature taming interaction,
// feast bonding & loyalty progression, passive aura stat boosts in recompute(p),
// auto-loot dash & bond perks on monster kill, strict ZERO screen shake,
// save/resume persistence, and World Chronicle Companions tab renderer.

import assert from 'node:assert/strict';
import { installBrowserEnv, DEFAULT_ELEMENT_IDS } from './test-support/browser-env.js';

let vnow = 1000;

installBrowserEnv({
  now: () => vnow,
  innerWidth: 1440,
  innerHeight: 900,
  elementIds: [...DEFAULT_ELEMENT_IDS, 'msg-log'],
  nullSelectors: [],
  strictIds: false,
});

await import('./game.js');
const { CONTENT } = await import('./content.js');
const {
  PET_CATALOG,
  BAIT_TO_PET_MAP,
  FEAST_VALUES,
  BOND_EXP_THRESHOLDS,
  createPetsSystem,
} = await import('./systems/pets.js');
const {
  createPetsRenderer,
  createFollowerEntity,
  updateFollower,
  triggerAutoLoot,
  triggerEmote,
  drawFollower,
  PET_ARCHETYPE_COLORS,
} = await import('./render/pets-fx.js');
const {
  createPetsUIRenderer,
  PET_DETAILS,
  FEAST_DETAILS,
} = await import('./render/pets-ui.js');

const A = globalThis.__AWO;
assert.ok(A, 'game debug API loaded');

// 1. Initial engine, player & map boot
const p = A.makePlayer('codeweaver', 'PetMaster');
A.G.player = p;
p.godMode = true;
p.zeny = 10000;
A.G.running = true;
A.setCtx(document.getElementById('game-canvas'));
A.buildHud();
A.loadMap('town_awakening', 5, 5);
A.updateHud();

console.log('Testing a) Content Invariants...');
// ============================================================================
// a) Content Invariants
// ============================================================================

// 1. All 5 taming baits exist in CONTENT.items with type 'taming_bait'
const expectedBaits = [
  { id: 'bait_sweet_gelatin', targetPet: 'pet_slime', targetMonster: 'slime' },
  { id: 'bait_tender_jerky', targetPet: 'pet_wolf', targetMonster: 'wolf' },
  { id: 'bait_luminous_nectar', targetPet: 'pet_sprite', targetMonster: 'blight_sprite' },
  { id: 'bait_glacial_salmon', targetPet: 'pet_bear', targetMonster: 'tundra_lurker' },
  { id: 'bait_magma_fruit', targetPet: 'pet_dragon', targetMonster: 'ember_imp' },
];

for (const baitDef of expectedBaits) {
  const item = CONTENT.items.find(it => it.id === baitDef.id);
  assert.ok(item, `Bait item ${baitDef.id} exists in CONTENT.items`);
  assert.equal(item.type, 'taming_bait', `${baitDef.id} has type 'taming_bait'`);
  assert.equal(item.targetPet, baitDef.targetPet, `${baitDef.id} targets ${baitDef.targetPet}`);
  assert.equal(item.targetMonster, baitDef.targetMonster, `${baitDef.id} targets monster ${baitDef.targetMonster}`);
  assert.ok(typeof item.name === 'string' && item.name.length > 0, `${baitDef.id} has non-empty name`);
  assert.ok(typeof item.desc === 'string' && item.desc.length > 0, `${baitDef.id} has non-empty description`);
  assert.ok(item.price > 0, `${baitDef.id} has price > 0`);
  assert.ok(item.value > 0, `${baitDef.id} has value > 0`);
}

// 2. All 5 bait crafting recipes exist in CONTENT.recipes
for (const baitDef of expectedBaits) {
  const recipe = CONTENT.recipes.find(r => r.out === baitDef.id);
  assert.ok(recipe, `Crafting recipe for ${baitDef.id} exists in CONTENT.recipes`);
  assert.ok(recipe.cost > 0, `Recipe for ${baitDef.id} has positive cost`);
  assert.ok(Array.isArray(recipe.mats) && recipe.mats.length > 0, `Recipe for ${baitDef.id} has ingredients`);
  for (const mat of recipe.mats) {
    const matItem = CONTENT.items.find(it => it.id === mat.itemId);
    assert.ok(matItem, `Recipe ingredient ${mat.itemId} exists in CONTENT.items`);
    assert.ok(mat.qty > 0, `Ingredient quantity for ${mat.itemId} is > 0`);
  }
}

// 3. PET_CATALOG contains 5 companion archetypes
const companionIds = ['pet_slime', 'pet_wolf', 'pet_sprite', 'pet_bear', 'pet_dragon'];
assert.equal(Object.keys(PET_CATALOG).length, 5, 'PET_CATALOG contains exactly 5 companion archetypes');

for (const petId of companionIds) {
  const pet = PET_CATALOG[petId];
  assert.ok(pet, `PET_CATALOG contains archetype ${petId}`);
  assert.equal(pet.id, petId, `Archetype id matches ${petId}`);
  assert.ok(typeof pet.name === 'string' && pet.name.length > 0, `${petId} has name`);
  assert.ok(pet.targetMonster, `${petId} specifies targetMonster`);
  assert.ok(pet.requiredBait, `${petId} specifies requiredBait`);
  assert.ok(pet.baseLootRadius > 0, `${petId} has positive baseLootRadius`);
  assert.ok(pet.maxLootRadius >= pet.baseLootRadius, `${petId} maxLootRadius >= baseLootRadius`);
  assert.ok(pet.auras && pet.auras.base && pet.auras.max, `${petId} has aura base and max tiers`);
  assert.ok(typeof pet.desc === 'string' && pet.desc.length > 0, `${petId} has description`);
  assert.equal(BAIT_TO_PET_MAP[pet.requiredBait], petId, `${pet.requiredBait} maps to ${petId}`);
}

console.log('Testing b) Wild creature taming interaction...');
// ============================================================================
// b) Wild creature taming interaction
// ============================================================================

const slimeDef = CONTENT.monsters.find(m => m.id === 'slime');
const wolfDef = CONTENT.monsters.find(m => m.id === 'wolf');
assert.ok(slimeDef, 'slimeDef exists in CONTENT.monsters');
assert.ok(wolfDef, 'wolfDef exists in CONTENT.monsters');

// 1. Target missing -> fails gracefully
A.G.target = null;
A.addItem('bait_sweet_gelatin', 5);
const qtyBeforeMissing = A.itemQty('bait_sweet_gelatin');
const usedMissing = A.useItem('bait_sweet_gelatin');
assert.equal(usedMissing, false, 'useItem fails when target is missing');
assert.equal(A.itemQty('bait_sweet_gelatin'), qtyBeforeMissing, 'Bait not consumed when target missing');

// 2. Target dead -> fails gracefully
const deadMon = A.makeMonster(slimeDef, p.x + 10, p.y + 10, 1);
deadMon.id = 'slime';
deadMon.alive = false;
A.G.target = deadMon;
const usedDead = A.useItem('bait_sweet_gelatin');
assert.equal(usedDead, false, 'useItem fails when target is dead');
assert.equal(A.itemQty('bait_sweet_gelatin'), qtyBeforeMissing, 'Bait not consumed when target dead');

// 3. Target too far -> fails gracefully
const farMon = A.makeMonster(slimeDef, p.x + 500, p.y + 500, 1);
farMon.id = 'slime';
farMon.alive = true;
A.G.target = farMon;
const usedFar = A.useItem('bait_sweet_gelatin');
assert.equal(usedFar, false, 'useItem fails when target is too far away');
assert.equal(A.itemQty('bait_sweet_gelatin'), qtyBeforeMissing, 'Bait not consumed when target too far');

// 4. Target HP > 30% -> fails with "Creature must be weakened below 30% HP!"
const healthyMon = A.makeMonster(slimeDef, p.x + 8, p.y + 8, 1);
healthyMon.id = 'slime';
healthyMon.alive = true;
healthyMon.maxHp = 100;
healthyMon.hp = 80; // 80% > 30%
A.G.target = healthyMon;

const tameResHealthy = A.G.petsSystem.attemptTame(p, healthyMon, 'bait_sweet_gelatin');
assert.equal(tameResHealthy.success, false, 'attemptTame fails on creature with >30% HP');
assert.equal(tameResHealthy.reason, 'Creature must be weakened below 30% HP!', 'Gives exact required failure message');

const qtyBeforeHealthy = A.itemQty('bait_sweet_gelatin');
const usedHealthy = A.useItem('bait_sweet_gelatin');
assert.equal(usedHealthy, false, 'useItem returns false for >30% HP creature');
assert.equal(A.itemQty('bait_sweet_gelatin'), qtyBeforeHealthy - 1, 'Bait consumed on failed attempt');
assert.ok(
  document.getElementById('msg-log')?.children.some(c => c.textContent.includes('Creature must be weakened below 30% HP!')),
  'Log message contains "Creature must be weakened below 30% HP!"'
);

// 5. Mismatched bait -> fails with "This creature rejects this bait!"
const weakWolf = A.makeMonster(wolfDef, p.x + 8, p.y + 8, 1);
weakWolf.id = 'wolf';
weakWolf.alive = true;
weakWolf.maxHp = 100;
weakWolf.hp = 20; // 20% < 30%
A.G.target = weakWolf;

const tameResMismatch = A.G.petsSystem.attemptTame(p, weakWolf, 'bait_sweet_gelatin');
assert.equal(tameResMismatch.success, false, 'attemptTame fails on mismatched creature bait');
assert.equal(tameResMismatch.reason, 'This creature rejects this bait!', 'Gives exact mismatched bait rejection reason');

const qtyBeforeMismatch = A.itemQty('bait_sweet_gelatin');
const usedMismatch = A.useItem('bait_sweet_gelatin');
assert.equal(usedMismatch, false, 'useItem returns false on mismatched bait');
assert.equal(A.itemQty('bait_sweet_gelatin'), qtyBeforeMismatch - 1, 'Bait consumed on mismatched attempt');
assert.ok(
  document.getElementById('msg-log')?.children.some(c => c.textContent.includes('This creature rejects this bait!')),
  'Log message contains "This creature rejects this bait!"'
);

// 6. Valid target weakened to <30% HP with matching bait:
// - Consumes bait from bag
// - Tames creature into G.pets.owned
// - Automatically sets G.pets.activePetId and spawns G.petFollower
// - Target is pacified
A.G.pets = { activePetId: null, owned: {} };
A.G.petFollower = null;

const weakSlime = A.makeMonster(slimeDef, p.x + 8, p.y + 8, 1);
weakSlime.id = 'slime';
weakSlime.alive = true;
weakSlime.maxHp = 100;
weakSlime.hp = 20; // 20% < 30%
A.G.target = weakSlime;

// Deterministic RNG hook for successful taming
const origMathRandom = Math.random;
Math.random = () => 0.01;

const qtyBeforeSuccess = A.itemQty('bait_sweet_gelatin');
const usedSuccess = A.useItem('bait_sweet_gelatin');
Math.random = origMathRandom;

assert.equal(usedSuccess, true, 'useItem succeeds with matching bait on weakened creature');
assert.equal(A.itemQty('bait_sweet_gelatin'), qtyBeforeSuccess - 1, 'Consumes bait from bag');
assert.ok(A.G.pets.owned.pet_slime, 'Tames creature into G.pets.owned');
assert.equal(A.G.pets.owned.pet_slime.id, 'pet_slime');
assert.equal(A.G.pets.owned.pet_slime.name, 'Gel Slime');
assert.equal(A.G.pets.owned.pet_slime.bondLevel, 1);
assert.equal(A.G.pets.owned.pet_slime.loyalty, 20);
assert.equal(A.G.pets.owned.pet_slime.exp, 0);

assert.equal(A.G.pets.activePetId, 'pet_slime', 'Automatically sets G.pets.activePetId');
assert.ok(A.G.petFollower, 'Automatically spawns G.petFollower');
assert.equal(A.G.petFollower.id, 'pet_slime', 'Follower entity has pet_slime ID');

assert.equal(weakSlime.alive, false, 'Target creature is pacified / marked dead');
assert.equal(A.G.target, null, 'G.target is cleared after taming');

console.log('Testing c) Feast bonding & loyalty progression...');
// ============================================================================
// c) Feast bonding & loyalty progression
// ============================================================================

const activePet = A.G.pets.owned.pet_slime;
assert.equal(activePet.bondLevel, 1);
assert.equal(activePet.loyalty, 20);
assert.equal(activePet.exp, 0);

// Feed 1: grilled_trout (+15 loyalty, +50 EXP)
const feed1 = A.G.petsSystem.feedPet(activePet, 'grilled_trout');
assert.equal(feed1.success, true);
assert.equal(activePet.loyalty, 35, 'Loyalty increased by 15 to 35');
assert.equal(activePet.exp, 50, 'EXP increased by 50');
assert.equal(activePet.bondLevel, 1, 'Bond level remains 1 (<100 threshold)');

// Feed 2: smoked_salmon (+25 loyalty, +120 EXP)
const feed2 = A.G.petsSystem.feedPet(activePet, 'smoked_salmon');
assert.equal(feed2.success, true);
assert.equal(activePet.loyalty, 60, 'Loyalty increased by 25 to 60');
assert.equal(activePet.exp, 170, 'EXP increased by 120 to 170');
assert.equal(activePet.bondLevel, 2, 'Bond level advances across Lv 2 threshold (100)');

assert.equal(A.G.petFollower.devoted, false, 'Follower is not devoted before reaching 80 loyalty');

// Feed 3: golden_carp_sashimi (+50 loyalty, +300 EXP) via World Chronicle companions panel
A.addItem('golden_carp_sashimi', 1);
A.G._chronicleTab = 'companions';

let wiredFeedBtn = null;
const origCreateElement = document.createElement;
document.createElement = function(tag) {
  const el = origCreateElement.call(this, tag);
  const origQuerySelectorAll = el.querySelectorAll;
  el.querySelectorAll = function(sel) {
    if (sel === '[data-feed-pet-id]') {
      wiredFeedBtn = origCreateElement('button');
      wiredFeedBtn.dataset = { feedPetId: 'pet_slime', feastId: 'golden_carp_sashimi' };
      return [wiredFeedBtn];
    }
    return origQuerySelectorAll.call(this, sel);
  };
  return el;
};

A.togglePanel('pets');
document.createElement = origCreateElement;

assert.ok(wiredFeedBtn, 'Feed button for golden_carp_sashimi wired in the Companions window');
wiredFeedBtn.click();
A.togglePanel('pets');

assert.equal(activePet.loyalty, 100, 'Loyalty clamped at 100');
assert.equal(activePet.exp, 470, 'EXP increased by 300 to 470');
assert.ok(activePet.bondLevel >= 3, 'Bond level advances across Lv 3 threshold (250)');

// Loyalty >= 80 unlocks Devoted status
assert.ok(activePet.loyalty >= 80, 'Loyalty is >= 80');

// Verify Devoted aura multiplier (1.10x) in computeAuraStats
const devotedAura = A.G.petsSystem.computeAuraStats(activePet);
// At bond Lv 3, t = (3 - 1)/4 = 0.5.
// pet_slime base hpRegen: 5, max: 25 -> 5 + 20 * 0.5 = 15.
// With Devoted 1.10x: 15 * 1.10 = 16.5.
assert.equal(devotedAura.hpRegen, 16.5, 'Devoted 1.10x multiplier applied to computed aura stats');

// Verify Devoted status on follower entity is automatically true without any manual override
assert.equal(A.G.petFollower.devoted, true, 'G.petFollower.devoted is automatically true when loyalty >= 80');

// Verify defensive guard on [data-summon-pet]: clicking summon on an unowned companion is safely ignored
let wiredSummonBtn = null;
const origCreateElementSummon = document.createElement;
document.createElement = function(tag) {
  const el = origCreateElementSummon.call(this, tag);
  const origQuerySelectorAll = el.querySelectorAll;
  el.querySelectorAll = function(sel) {
    if (sel === '[data-summon-pet]') {
      wiredSummonBtn = origCreateElementSummon('button');
      wiredSummonBtn.dataset = { summonPet: 'pet_dragon' }; // unowned!
      return [wiredSummonBtn];
    }
    return origQuerySelectorAll.call(this, sel);
  };
  return el;
};

A.togglePanel('world');
document.createElement = origCreateElementSummon;

assert.ok(wiredSummonBtn, 'Summon button wired');
assert.equal(Boolean(A.G.pets.owned.pet_dragon), false, 'pet_dragon is unowned');
A.G.pets.activePetId = 'pet_slime';
wiredSummonBtn.click();
assert.equal(A.G.pets.activePetId, 'pet_slime', 'activePetId unchanged when attempting to summon unowned pet');
A.togglePanel('world');

console.log('Testing d) Passive aura stat boosts in recompute(p)...');
// ============================================================================
// d) Passive aura stat boosts in recompute(p)
// ============================================================================

// 1. With pet_slime active: HP regen and Move Speed
A.recompute(p);
assert.ok(p.petAura, 'p.petAura populated on player');
assert.equal(p.petAura.hpRegen, 16.5, 'p.petAura has 16.5 HP regen');
assert.ok(p.petAura.moveMult > 0, 'p.petAura has positive moveMult');
assert.ok(p.hpRegen >= 16.5, 'Player hpRegen receives pet aura buff');

// 2. With pet_wolf active: ATK% and Crit%
A.G.pets.owned.pet_wolf = {
  id: 'pet_wolf',
  name: 'Timber Wolf Pup',
  bondLevel: 3,
  loyalty: 85,
  exp: 300,
};
A.G.pets.activePetId = 'pet_wolf';
A.recompute(p);
assert.ok(p.petAura.physAtkPct > 0, 'Wolf active: aura provides physAtkPct');
assert.ok(p.petAura.critChance > 0, 'Wolf active: aura provides critChance');
assert.ok(p.physAtk > 0, 'Player physAtk boosted by wolf aura');

// 3. With pet_bear active: DEF% and Max HP
A.G.pets.owned.pet_bear = {
  id: 'pet_bear',
  name: 'Glacial Bear Cub',
  bondLevel: 3,
  loyalty: 85,
  exp: 300,
};
A.G.pets.activePetId = 'pet_bear';
A.recompute(p);
assert.ok(p.petAura.physDefPct > 0, 'Bear active: aura provides physDefPct');
assert.ok(p.petAura.maxHp > 0, 'Bear active: aura provides maxHp');
assert.ok(p.physDef > 0, 'Player physDef boosted by bear aura');

// 4. Dismiss companion: stats revert cleanly
A.G.pets.activePetId = null;
A.recompute(p);
assert.deepEqual(p.petAura, {}, 'Dismissed pet clears petAura');

console.log('Testing e) Auto-Loot Dash & Bond Perks on monster kill...');
// ============================================================================
// e) Auto-Loot Dash & Bond Perks on monster kill
// ============================================================================

// Restore active pet to pet_slime with bond Lv 3
A.G.pets.activePetId = 'pet_slime';
A.G.pets.owned.pet_slime.bondLevel = 3;
A.G.pets.owned.pet_slime.loyalty = 85;
if (!A.G.petFollower) {
  A.G.petFollower = A.G.petsFx.createFollowerEntity('pet_slime', p.x, p.y);
}
A.G.petFollower.dashTarget = null;
A.G.petFollower.motes = [];

// Slay monster within auto-loot radius
const nearMon = A.makeMonster(slimeDef, p.x + 12, p.y + 12, 1);
nearMon.id = 'slime';
nearMon.alive = true;
const zenyBeforeKill = p.zeny;

A.killMonster(nearMon);

// Verify triggerAutoLoot triggered on follower
assert.ok(A.G.petFollower.dashTarget, 'petFollower assigned dashTarget near monster position');
assert.equal(A.G.petFollower.dashTarget.x, nearMon.x);
assert.equal(A.G.petFollower.dashTarget.y, nearMon.y);
assert.ok(A.G.petFollower.motes.length > 0, 'Auto-loot suction motes spawned');

// Verify Bond Lv 3+ bonus zeny
const zenyGained = p.zeny - zenyBeforeKill;
assert.ok(zenyGained > 0, 'Zeny was gained from monster kill');
const bondPerk = A.G.petsSystem.getBondLootBonus(A.G.pets.owned.pet_slime);
assert.equal(bondPerk.zenyBonusPct, 0.10, 'Bond Lv 3 awards 10% bonus zeny');

// Slay monster OUTSIDE auto-loot radius
A.G.petFollower.dashTarget = null;
A.G.petFollower.motes = [];
const farMonKill = A.makeMonster(slimeDef, p.x + 400, p.y + 400, 1);
farMonKill.id = 'slime';
farMonKill.alive = true;

A.killMonster(farMonKill);
assert.equal(A.G.petFollower.dashTarget, null, 'Auto-loot dash not triggered for monster outside radius');

console.log('Testing f) Strict ZERO Screen Shake...');
// ============================================================================
// f) Strict ZERO Screen Shake
// ============================================================================

// Stabilize camera frame at current player position
A.render();
const camBefore = { x: A.G.cam.x, y: A.G.cam.y };

// 1. Taming test creature
const shakeMon = A.makeMonster(slimeDef, p.x + 8, p.y + 8, 1);
shakeMon.id = 'slime';
shakeMon.alive = true;
shakeMon.maxHp = 100;
shakeMon.hp = 10;
A.G.target = shakeMon;
A.addItem('bait_sweet_gelatin', 1);
A.G.pets.activePetId = null;

Math.random = () => 0.01;
A.useItem('bait_sweet_gelatin');
Math.random = origMathRandom;

assert.equal(A.G.cam.x, camBefore.x, 'Camera X unchanged after taming interaction');
assert.equal(A.G.cam.y, camBefore.y, 'Camera Y unchanged after taming interaction');

// 2. Feeding interaction
A.G.petsSystem.feedPet(A.G.pets.owned.pet_slime, 'golden_carp_sashimi');
assert.equal(A.G.cam.x, camBefore.x, 'Camera X unchanged after feeding interaction');
assert.equal(A.G.cam.y, camBefore.y, 'Camera Y unchanged after feeding interaction');

// 3. Auto-looting trigger
A.G.petsFx.triggerAutoLoot(A.G.petFollower, { x: p.x + 16, y: p.y + 16 });
assert.equal(A.G.cam.x, camBefore.x, 'Camera X unchanged after triggerAutoLoot');
assert.equal(A.G.cam.y, camBefore.y, 'Camera Y unchanged after triggerAutoLoot');

// 4. Follower kinematics update
A.G.petsFx.updateFollower(A.G.petFollower, p, 0.016);
assert.equal(A.G.cam.x, camBefore.x, 'Camera X unchanged after updateFollower');
assert.equal(A.G.cam.y, camBefore.y, 'Camera Y unchanged after updateFollower');

// 5. Follower rendering
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
A.G.petsFx.drawFollower(ctx, A.G.petFollower, A.G.cam, 1000, 832, 576);
assert.equal(A.G.cam.x, camBefore.x, 'Camera X unchanged after drawFollower');
assert.equal(A.G.cam.y, camBefore.y, 'Camera Y unchanged after drawFollower');

// 6. Full render loop
A.render();
assert.equal(A.G.cam.x, camBefore.x, 'Camera X strictly unchanged after full render frame');
assert.equal(A.G.cam.y, camBefore.y, 'Camera Y strictly unchanged after full render frame');

console.log('Testing g) Save & Resume persistence...');
// ============================================================================
// g) Save & Resume persistence
// ============================================================================

// Configure known pet state
A.G.pets = {
  activePetId: 'pet_slime',
  owned: {
    pet_slime: {
      id: 'pet_slime',
      name: 'Gel Slime',
      bondLevel: 4,
      loyalty: 95,
      exp: 650,
      unlockedAt: 1234567,
    },
    pet_wolf: {
      id: 'pet_wolf',
      name: 'Timber Wolf Pup',
      bondLevel: 2,
      loyalty: 45,
      exp: 150,
      unlockedAt: 1234568,
    },
  },
};
A.recompute(p);
A.saveGame();

// Verify localStorage serialization
const rawSave = localStorage.getItem('awo_save_v1');
assert.ok(rawSave, 'awo_save_v1 key exists in localStorage');
const savedData = JSON.parse(rawSave);
assert.ok(savedData.world?.pets, 'Saved payload includes world.pets field');
assert.equal(savedData.world.pets.activePetId, 'pet_slime');
assert.equal(savedData.world.pets.owned.pet_slime.bondLevel, 4);
assert.equal(savedData.world.pets.owned.pet_slime.loyalty, 95);
assert.equal(savedData.world.pets.owned.pet_wolf.bondLevel, 2);

// Wipe in-memory pets state
A.G.pets = { activePetId: null, owned: {} };
A.G.petFollower = null;
A.recompute(p);
assert.equal(p.petAura.hpRegen, undefined, 'Auras cleared when memory wiped');

// Resume game and verify restoration
const resumeSuccess = A.resumeGame();
assert.equal(resumeSuccess, true, 'resumeGame() succeeds');
assert.equal(A.G.pets.activePetId, 'pet_slime', 'activePetId restored');
assert.equal(A.G.pets.owned.pet_slime.bondLevel, 4, 'bondLevel restored');
assert.equal(A.G.pets.owned.pet_slime.loyalty, 95, 'loyalty restored');
assert.equal(A.G.pets.owned.pet_wolf.bondLevel, 2, 'secondary pet restored');

assert.ok(A.G.petFollower, 'G.petFollower re-spawned on resume');
assert.equal(A.G.petFollower.id, 'pet_slime', 'Follower id restored');
assert.equal(A.G.petFollower.devoted, true, 'Follower devoted flag restored (loyalty 95 >= 80)');
assert.ok(A.G.player.petAura.hpRegen > 0, 'Recomputed aura restored after resume');

console.log('Testing h) World Chronicle Companions tab...');
// ============================================================================
// h) World Chronicle Companions tab
// ============================================================================

// Populate feast meals into bag for tray rendering
A.addItem('grilled_trout', 2);
A.addItem('smoked_salmon', 1);

// Test via World Chronicle HTML generator
const petsWindowHtml = A.panelBody('pets');
assert.ok(petsWindowHtml.includes('active-pet-card'), 'Companions window renders the roster');
assert.ok(!A.worldChronicleHtml().includes('data-chronicle-tab="companions"'), 'Chronicle no longer hosts companions');

// Test direct component tab render
const tabHtml = A.G.petsUI.renderCompanionsTab(A.G.pets, A.G.player.inventory);

// 1. Active companion showcase
assert.ok(tabHtml.includes('active-pet-card'), 'Renders active companion showcase card');
assert.ok(tabHtml.includes('Gel Slime'), 'Shows active companion name Gel Slime');
assert.ok(tabHtml.includes('★ Devoted'), 'Shows Devoted badge');
assert.ok(tabHtml.includes('Bond Lv.'), 'Shows Bond Lv. label');
assert.ok(tabHtml.includes('4</b>'), 'Shows Bond Lv. 4');
assert.ok(tabHtml.includes('95/100'), 'Shows loyalty 95/100');
assert.ok(tabHtml.includes('data-dismiss-pet="1"'), 'Shows dismiss button');
assert.ok(tabHtml.includes('aura-pill'), 'Shows aura pills');
assert.ok(tabHtml.includes('HP regen'), 'Shows HP regen pill');
assert.ok(tabHtml.includes('Auto-Loot radius'), 'Shows Auto-Loot radius pill');

// 2. Feast quick-feed tray
assert.ok(tabHtml.includes('feast-tray'), 'Renders feast quick-feed tray');
assert.ok(tabHtml.includes('Feast Quick-Feed Tray'), 'Shows tray title');
assert.ok(tabHtml.includes('data-feed-pet-id="pet_slime"'), 'Shows feed action button for active pet');
assert.ok(tabHtml.includes('grilled_trout'), 'Displays available grilled_trout');
assert.ok(tabHtml.includes('smoked_salmon'), 'Displays available smoked_salmon');

// 3. 5 roster cards (owned & untamed)
assert.ok(tabHtml.includes('companion-roster-card'), 'Renders companion roster cards');
for (const name of ['Gel Slime', 'Timber Wolf Pup', 'Blight Sprite', 'Glacial Bear Cub', 'Magma Hatchling']) {
  assert.ok(tabHtml.includes(name), `Roster displays archetype ${name}`);
}
assert.ok(tabHtml.includes('companion-roster-card owned'), 'Contains owned roster cards');
assert.ok(tabHtml.includes('companion-roster-card untamed'), 'Contains untamed roster cards');
assert.ok(tabHtml.includes('[Untamed]'), 'Displays [Untamed] badge for wild archetypes');

console.log('✓ All pets end-to-end integration assertions passed successfully!');
