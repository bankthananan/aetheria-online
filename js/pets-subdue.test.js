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
const p = A.makePlayer('reborn_blade', 'TameSubdueTester');
A.G.player = p;
A.loadMap('whispering_woods');

const slimeDef = A.CONTENT.monsters.find(m => m.id === 'slime');
const slime = A.makeMonster(slimeDef, p.x + 32, p.y, 1);
slime.hp = slime.maxHp = 60;
slime.alive = true;
A.G.monsters = [slime];

// Case 1: Player has NO bait in inventory. An overwhelming attack kills the slime normally.
p.inventory = [];
A.damageMonster(slime, 200, false, false);
assert.equal(slime.alive, false, 'Overwhelming attack kills slime when player has no taming bait');

// Case 2: Player has taming bait (Sweet Gelatin). Overwhelming attack subdues slime to 20% HP instead of killing it.
const freshSlime = A.makeMonster(slimeDef, p.x + 32, p.y, 1);
freshSlime.hp = freshSlime.maxHp = 60;
freshSlime.alive = true;
A.G.monsters = [freshSlime];
A.addItem('bait_sweet_gelatin', 2);

A.damageMonster(freshSlime, 200, false, false);
assert.equal(freshSlime.alive, true, 'Slime must survive when player has matching taming bait');
assert.ok(freshSlime.hp <= 18 && freshSlime.hp > 0, `Slime HP should be subdued below 30% HP (got ${freshSlime.hp}/${freshSlime.maxHp})`);
assert.equal(freshSlime.hp / freshSlime.maxHp <= 0.30, true, 'Slime HP ratio is <= 0.30');

// Case 3: playerBasicAttack holds fire on subdued tameable creature
A.G.target = freshSlime;
A.G.targetSource = 'manual';
p.attackCdUntil = 0;
const hpBefore = freshSlime.hp;
A.playerBasicAttack();
assert.equal(freshSlime.hp, hpBefore, 'playerBasicAttack must hold fire and not kill a creature ready to be tamed');

// Case 4: Now using bait succeeds in taming
Math.random = () => 0.1;
const tameSuccess = A.useItem('bait_sweet_gelatin');
assert.equal(tameSuccess, true, 'useItem succeeds in taming the subdued creature');
assert.ok(A.G.pets.owned.pet_slime, 'Gel Slime is now owned in G.pets.owned');

console.log('Taming subdue and hold fire audit passed!');
