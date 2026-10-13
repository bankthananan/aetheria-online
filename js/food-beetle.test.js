import assert from 'node:assert/strict';
import { installBrowserEnv } from './test-support/browser-env.js';

let vnow = 100000;

installBrowserEnv({
  now: () => vnow,
  innerWidth: 1440,
  innerHeight: 900,
  nullSelectors: [],
  strictIds: false,
});

const { CONTENT } = await import('./content.js');
const { MAPS } = await import('./maps.js');
const { WHISPERING_WOODS_SIDE_QUESTS } = await import('./zones/whispering-woods/quests.js');
await import('./game.js');
const A = globalThis.__AWO;
assert.ok(A, 'game debug API loaded');

// 1. Verify Mossback Beetle Spawns in Whispering Woods
const ww = MAPS.whispering_woods;
assert.ok(ww, 'whispering_woods map must exist');
const beetleSpawn = ww.spawns.find(s => s.monsterId === 'mossback_beetle');
assert.ok(beetleSpawn, 'mossback_beetle spawn must exist in whispering_woods');
assert.equal(beetleSpawn.count, 6, 'mossback_beetle count should be 6 for healthy birth rate');
assert.deepEqual(beetleSpawn.depth, [0.35, 0.68], 'mossback_beetle depth should cover mid-woods progression');
assert.deepEqual(beetleSpawn.levelRange, [5, 8], 'mossback_beetle level range should be 5-8');

// Verify quest sq_ww_beetle_carapace requirement matches spawn capacity
const beetleQuest = WHISPERING_WOODS_SIDE_QUESTS.sq_ww_beetle_carapace;
assert.ok(beetleQuest, 'sq_ww_beetle_carapace quest must exist');
assert.equal(beetleQuest.count, 6, 'quest requires 6 beetles');
assert.ok(beetleSpawn.count >= beetleQuest.count, 'spawn count must satisfy quest requirement');

// 2. Verify 5 Regional Culinary Dishes & Recipes
const dishes = [
  { id: 'spiced_steppe_pike', fish: 'mirage_pike', herb: 'sunroot_thistle', cost: 90, stat: 'atk', flat: 15 },
  { id: 'mire_spore_stew', fish: 'bog_gar', herb: 'ghost_spore_shroom', cost: 130, stat: 'def', flat: 25 },
  { id: 'tempest_eel_skewer', fish: 'thunder_eel', herb: 'storm_petal', cost: 220, stat: 'atk', mult: 1.12 },
  { id: 'abyssal_cavefish_broth', fish: 'blind_cavefish', herb: 'void_polyp', cost: 300, stat: 'def', mult: 1.15 },
  { id: 'quantum_glitch_fillet', fish: 'quantum_glitchfish', herb: 'binary_fungus', cost: 450, stat: 'all', mult: 1.15 },
];

for (const d of dishes) {
  const item = CONTENT.items.find(i => i.id === d.id);
  assert.ok(item, `Dish item ${d.id} must exist in CONTENT.items`);
  assert.equal(item.type, 'consumable', `${d.id} must have type consumable`);
  assert.ok(item.hpRestore > 0, `${d.id} must restore HP`);
  assert.equal(item.buff.stat, d.stat, `${d.id} buff stat must be ${d.stat}`);
  if (d.flat) assert.equal(item.buff.flat, d.flat, `${d.id} buff flat must match`);
  if (d.mult) assert.equal(item.buff.mult, d.mult, `${d.id} buff mult must match`);

  const recipe = CONTENT.recipes.find(r => r.out === d.id);
  assert.ok(recipe, `Recipe for ${d.id} must exist in CONTENT.recipes`);
  assert.equal(recipe.cost, d.cost, `Recipe cost for ${d.id} must match`);
  assert.ok(recipe.mats.some(m => m.itemId === d.fish), `Recipe for ${d.id} must require ${d.fish}`);
  assert.ok(recipe.mats.some(m => m.itemId === d.herb), `Recipe for ${d.id} must require ${d.herb}`);
}

// 3. Test Food & Potion Mechanics in Game Runtime
const p = A.makePlayer('reborn_blade', 'FoodTester');
A.G.player = p;
A.buildHud();
A.recompute(p, true);
A.loadMap('town_awakening');

p.hp = 10;
p.maxHp = 500;
p.potionCdUntil = 0;

// Add food and consume
A.addItem('spiced_steppe_pike', 2);
const foodConsumed = A.useItem('spiced_steppe_pike');
assert.ok(foodConsumed, 'using food must succeed');
assert.ok(p.hp > 10, 'food must restore HP');
assert.equal(p.potionCdUntil || 0, 0, 'food must NOT trigger potion cooldown');

// Verify food buff applied
const activeBuff = p.buffs.find(b => b.name === 'Spiced Steppe Pike');
assert.ok(activeBuff, 'food buff must be added to player');
assert.equal(activeBuff.stat, 'atk');
assert.equal(activeBuff.flat, 15);
const initialUntil = activeBuff.until;

// Consume second dish of same type -> refresh duration, don't stack flat ATK
vnow += 5000;
A.useItem('spiced_steppe_pike');
const buffsMatching = p.buffs.filter(b => b.name === 'Spiced Steppe Pike');
assert.equal(buffsMatching.length, 1, 'consuming same food must not duplicate buff entry');
assert.ok(buffsMatching[0].until > initialUntil, 'consuming same food must refresh buff expiration');

// Test Potion triggers potionCdUntil
p.hp = 10;
A.addItem('mid_potion', 2);
const potionConsumed = A.useItem('mid_potion');
assert.ok(potionConsumed, 'using potion must succeed');
assert.ok(p.potionCdUntil > vnow, 'potion must trigger potionCdUntil');

// While potion on cooldown: potion blocked, food allowed
const potionBlocked = A.useItem('mid_potion');
assert.equal(potionBlocked, false, 'potion must be blocked while potionCdUntil is active');

A.addItem('grilled_trout', 1);
const foodAllowedDuringPotionCd = A.useItem('grilled_trout');
assert.ok(foodAllowedDuringPotionCd, 'food must NOT be blocked by potionCdUntil');

console.log('Food system and Mossback Beetle verification passed cleanly.');
