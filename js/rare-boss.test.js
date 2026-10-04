// Roaming rare boss: announced on a world timer, prowls one field map until
// slain, never respawns in place, and never triggers guardian-conquest unlocks.
import assert from 'node:assert/strict';

import { installBrowserEnv } from './test-support/browser-env.js';

let vnow = 0;

installBrowserEnv({
  now: () => vnow,
  innerWidth: 1440,
  innerHeight: 900,
  nullSelectors: [],
  strictIds: false,
});

const { MAPS } = await import('./maps.js');
const { CONTENT } = await import('./content.js');
await import('./game.js');
const A = globalThis.__AWO;
assert.ok(A, 'game debug API loaded');

const rareDef = CONTENT.monsters.find(m => m.rare);
assert.ok(rareDef, 'a rare roaming boss must be defined in content');
assert.ok(rareDef.sizeTiles >= 2, 'the rare roamer must use boss mechanics (slam/enrage/jackpot)');

const p = A.makePlayer('reborn_blade', 'RareHunter');
p.level = 80;
A.G.player = p;
A.buildHud();
A.recompute(p, true);
A.loadMap('whispering_woods');
A.G.monsters.forEach(m => { m.x = m.y = m.homeX = m.homeY = 2000; });   // park spawns (flake guard)

// 1) The world timer arms lazily, then fires an announcement once the window passes.
A.step(0.05);
assert.ok(A.G.nextRareBossAt > 0, 'first step must arm the rare-boss window');
assert.equal(A.G.rareBossMapId, null, 'no rare boss before the window elapses');
vnow += A.DESIGN.tuning.rareBossEveryMs + 1000;
A.step(0.05);
assert.ok(A.G.rareBossMapId, 'window elapsed — a prowl map must be chosen');
assert.ok(MAPS[A.G.rareBossMapId].band, 'the rare boss only prowls field maps');

// 2) Deterministic placement: force it onto the current map, exactly one instance.
A.spawnRareBoss('whispering_woods');
A.placeRareBoss();   // second call must not duplicate it
const bosses = A.G.monsters.filter(m => m.def.rare && m.alive);
assert.equal(bosses.length, 1, 'exactly one rare boss instance on its map');
const boss = bosses[0];
assert.equal(boss.lvl, rareDef.level, 'rare boss level is fixed like other bosses');

// 3) Killing it clears the prowl, reschedules the timer, and never respawns in place.
const zenyBefore = p.zeny;
A.killMonster(boss);
assert.equal(A.G.rareBossMapId, null, 'kill must clear the prowl map');
assert.ok(A.G.nextRareBossAt > vnow, 'kill must schedule the next announcement');
assert.equal(boss.deadUntil, Infinity, 'a slain rare must never respawn in place');
assert.ok(!A.G.guardiansSlain.has(rareDef.id), 'rare kills must not count as zone-guardian conquest');
assert.ok(p.zeny > zenyBefore, 'rare kill pays the boss zeny jackpot');

// 4) Re-entering the map after the kill must not resurrect it.
A.loadMap('whispering_woods');
assert.equal(A.G.monsters.filter(m => m.def.rare && m.alive).length, 0, 'no rare boss after its defeat');

console.log('Rare boss audit passed: timer, announcement, single placement, clean despawn, no conquest side-effects.');
