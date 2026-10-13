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

// Setup test world
const p = A.makePlayer('reborn_blade', 'TourTester');
A.G.player = p;
A.loadMap('whispering_woods');

// 1. Auto-Hunt level cap (+5 gap)
p.level = 5;
const lowMob = { alive: true, lvl: 10 };
const highMob = { alive: true, lvl: 11 };
assert.equal(A.autoHuntEligible(lowMob, p), true, 'Lv 10 monster is eligible for Lv 5 player (within +5 gap)');
assert.equal(A.autoHuntEligible(highMob, p), false, 'Lv 11 monster is ineligible for Lv 5 player (exceeds +5 gap)');

// 2. Over-level touring peace (player level >= monster.lvl + 10)
// Wolf is Lv 8, aggressive
const wolfDef = A.CONTENT.monsters.find(m => m.id === 'wolf');
assert.equal(wolfDef.behavior, 'aggressive', 'wolf must be aggressive by default');

const wolf = A.makeMonster(wolfDef, 100, 100, 8);
wolf.provoked = false;
A.G.monsters = [wolf];

// Place player 3 tiles away on dirt floor '.'
p.x = 100 + 3 * TS;
p.y = 100;
// Verify player is on non-road tile (e.g. '.')
const pr = Math.floor(p.y / TS), pc = Math.floor(p.x / TS);
A.G.tiles[pr] = A.G.tiles[pr].substring(0, pc) + '.' + A.G.tiles[pr].substring(pc + 1);

// Test 2a: At Lv 15 (gap = 7 < 10), wolf aggroes and routes toward player
p.level = 15;
wolf.path = null;
vnow += 100;
A.updateMonsters(0.1);
assert.ok(wolf.path !== null || Math.hypot(wolf.x - p.x, wolf.y - p.y) < 3 * TS, 'Lv 15 player is within threat level — wolf must aggro');

// Test 2b: At Lv 20 (gap = 12 >= 10), wolf enters peaceful touring state and ignores player
p.level = 20;
wolf.path = null;
wolf.provoked = false;
vnow += 100;
A.updateMonsters(0.1);
assert.equal(wolf.path, null, 'Lv 20 player has over-level peace — wolf must ignore');

// 3. Road safety protection
// Reset player level to 8 (at-level, gap = 0), but place player on road 'R'
p.level = 8;
A.G.tiles[pr] = A.G.tiles[pr].substring(0, pc) + 'R' + A.G.tiles[pr].substring(pc + 1);
wolf.path = null;
wolf.provoked = false;
vnow += 100;
A.updateMonsters(0.1);
assert.equal(wolf.path, null, 'Player standing on road "R" must be safe from wolf aggro');

// 4. Provocation override (player attacks wolf while on road)
A.damageMonster(wolf, 10, false, false);
assert.equal(wolf.provoked, true, 'Damaging wolf must set provoked = true');
vnow += 100;
A.updateMonsters(0.1);
assert.ok(wolf.path !== null, 'Provoked wolf must attack player even if player is on road');

// 5. Boss / Guardian immunity to peace
const bossDef = A.CONTENT.monsters.find(m => m.id === 'elderwood_treant');
assert.ok(bossDef.sizeTiles >= 2 || bossDef.boss, 'treant is a guardian/boss');
const treant = A.makeMonster(bossDef, 100, 100, 10);
treant.provoked = false;
A.G.monsters = [treant];

// Player is Lv 50 and on road 'R'
p.level = 50;
A.updateMonsters(0.1);
// Boss mechanics handle boss combat directly and boss does not yield to road/overlevel peace
assert.ok(treant.lastCombatAt || treant.phase !== undefined, 'boss does not grant touring peace');

console.log('Touring aggro, road safety, and auto-hunt level cap audit passed!');
