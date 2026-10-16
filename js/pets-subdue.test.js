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
const A = globalThis.__AWO;
assert.ok(A, 'game debug API loaded');

const TS = 32;

// Setup player & map
const p = A.makePlayer('reborn_blade', 'TameChanceTester');
A.G.player = p;
A.loadMap('whispering_woods');

const slimeDef = A.CONTENT.monsters.find(m => m.id === 'slime');
const slime = A.makeMonster(slimeDef, p.x + 32, p.y, 1);
slime.hp = slime.maxHp = 60;
slime.alive = true;
A.G.monsters = [slime];

// Case 1: Normal combat is unhindered - attacks defeat monsters cleanly even when player carries bait
A.addItem('bait_sweet_gelatin', 5);
assert.equal(A.itemQty('bait_sweet_gelatin'), 5, 'Player has taming bait in inventory');

A.damageMonster(slime, 200, false, false);
assert.equal(slime.alive, false, 'Attacks defeat monsters normally without artificial subdue/immortal HP clamps');

// Case 2: Pokémon-style catch chance at full HP (bait can be thrown at ANY HP)
const fullHpSlime = A.makeMonster(slimeDef, p.x + 32, p.y, 1);
fullHpSlime.hp = fullHpSlime.maxHp = 100;
fullHpSlime.alive = true;
A.G.monsters = [fullHpSlime];
A.G.target = fullHpSlime;

// At 100% HP, player LUK 10, catch rate is:
// base 0.25 + (1 - 1.0) * 0.55 + 10 * 0.005 = 0.30
// When roll is high (0.95), creature breaks free
const origMathRandom = Math.random;
Math.random = () => 0.95;

const qtyBeforeThrow = A.itemQty('bait_sweet_gelatin');
const failedThrow = A.useItem('bait_sweet_gelatin');
Math.random = origMathRandom;

assert.equal(failedThrow, false, 'Capture fails on high roll (creature breaks free)');
assert.equal(fullHpSlime.alive, true, 'Monster remains alive after breaking free');
assert.equal(A.itemQty('bait_sweet_gelatin'), qtyBeforeThrow - 1, 'Bait is consumed like throwing a Pokéball');
assert.ok(
  document.getElementById('msg-log')?.children.some(c => c.textContent.includes('The creature broke free from the bait!')),
  'Log message contains "The creature broke free from the bait!"'
);

// Case 3: Weakening monster increases catch rate significantly (Pokémon-style)
const weakenedSlime = A.makeMonster(slimeDef, p.x + 32, p.y, 1);
weakenedSlime.hp = 15; // 15% HP
weakenedSlime.maxHp = 100;
weakenedSlime.alive = true;
A.G.monsters = [weakenedSlime];
A.G.target = weakenedSlime;

// With roll of 0.20 (below the ~76% catch chance at 15% HP), taming succeeds
Math.random = () => 0.20;
const qtyBeforeSuccess = A.itemQty('bait_sweet_gelatin');
const tameSuccess = A.useItem('bait_sweet_gelatin');
Math.random = origMathRandom;

assert.equal(tameSuccess, true, 'useItem succeeds with matching bait on weakened creature');
assert.equal(A.itemQty('bait_sweet_gelatin'), qtyBeforeSuccess - 1, 'Bait consumed on successful capture');
assert.ok(A.G.pets.owned.pet_slime, 'Gel Slime is now owned in G.pets.owned');
assert.equal(weakenedSlime.alive, false, 'Captured creature is pacified / marked inactive');
assert.ok(
  document.getElementById('msg-log')?.children.some(c => c.textContent.includes('Gotcha! Successfully tamed Gel Slime!')),
  'Log message contains "Gotcha! Successfully tamed Gel Slime!"'
);

// Case 4: Once companion is owned, combat remains fluid and attacks defeat monsters normally
const anotherSlime = A.makeMonster(slimeDef, p.x + 32, p.y, 1);
anotherSlime.hp = 15;
anotherSlime.maxHp = 100;
anotherSlime.alive = true;
A.G.monsters = [anotherSlime];
A.G.target = anotherSlime;
A.G.targetSource = 'manual';
p.attackCdUntil = 0;

const hpBeforeAttack = anotherSlime.hp;
A.playerBasicAttack();
assert.ok(anotherSlime.hp < hpBeforeAttack, 'playerBasicAttack strikes monsters normally');

A.damageMonster(anotherSlime, 200, false, false);
assert.equal(anotherSlime.alive, false, 'Monster defeated cleanly by damage');

console.log('Pokémon-style taming chance and combat flow audit passed!');
