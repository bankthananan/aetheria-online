// Rebirth (NG+): only at the level cap; resets level/job/skills/stat points while
// keeping gear, zeny, guild rank, and world state; grants permanent stacking
// stat and HP/MP bonuses that survive save/load.
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

await import('./game.js');
const A = globalThis.__AWO;
assert.ok(A, 'game debug API loaded');
const T = A.DESIGN.tuning;

const p = A.makePlayer('reborn_blade', 'PhoenixTester');
A.G.player = p;
A.buildHud();
A.recompute(p, true);
A.loadMap('town_awakening');
A.G.running = true;

// baseline: a fresh Lv1 hero of this class (for bonus comparisons)
const freshStr = p.stats.str, freshMaxHp = p.maxHp;

// 1) Below the cap, rebirth refuses.
p.level = 79;
assert.equal(A.doRebirth(), false, 'rebirth must refuse below the level cap');
assert.equal(p.rebirths, 0, 'refused rebirth must not count');

// 2) At the cap: stage a developed character, then rebirth.
p.level = A.DESIGN.levelCap; p.jobLevel = 50; p.tierIndex = 2; p.jobBranchId = 'rift_knight';
p.alloc.str = 40; p.statPoints = 7; p.skillPoints = 3;
p.skillLevels.rift_slash = 5;
p.zeny = 12345;
const sword = A.rollItem('iron_sword', 0, 'common');
p.inventory.push(sword);
A.equip(sword.uid);
A.G.guildRankIdx = 6; A.G.guardiansSlain.add('elderwood_treant');
A.recompute(p, true);

assert.equal(A.doRebirth(p.classId), true, 'rebirth must fire at the level cap');
assert.equal(p.rebirths, 1);
assert.equal(p.level, 1, 'level resets');
assert.equal(p.jobLevel, 1, 'job level resets');
assert.equal(p.tierIndex, 0, 'class tier resets');
assert.equal(p.jobBranchId, null, 'second-job branch resets so the next life can choose again');
assert.equal(p.alloc.str, 0, 'stat allocation resets');
assert.ok(!p.skillLevels.rift_slash || p.skillLevels.rift_slash === 1, 'learned skill ranks reset to a fresh kit');
assert.equal(p.zeny, 12345, 'zeny survives rebirth');
assert.equal(p.equip.weapon?.uid, sword.uid, 'equipped gear survives rebirth');
assert.equal(A.G.guildRankIdx, 6, 'guild rank survives rebirth');
assert.ok(A.G.guardiansSlain.has('elderwood_treant'), 'world conquest survives rebirth');

// 3) Permanent bonuses: +stat and +HP/MP vs an unreborn Lv1.
assert.equal(p.stats.str, freshStr + T.rebirthStatBonus, 'rebirth grants the permanent all-stat bonus');
const expectedHp = Math.round((freshMaxHp) * 1);   // fresh baseline had no bonus
assert.ok(p.maxHp > expectedHp, 'rebirth grants permanent max HP');
assert.ok(A.G.achievements.has('ach_reborn'), 'rebirth unlocks the Twice-Born achievement');

// 4) Bonuses persist through save/load.
A.saveGame();
A.G.player = null;
assert.ok(A.resumeGame(), 'save must load back');
const p2 = A.G.player;
assert.equal(p2.rebirths, 1, 'rebirth count survives save/load');
assert.equal(p2.stats.str, freshStr + T.rebirthStatBonus, 'stat bonus survives save/load');

// 5) Second rebirth stacks.
p2.level = A.DESIGN.levelCap;
assert.equal(A.doRebirth(p2.classId), true);
assert.equal(p2.rebirths, 2);
assert.equal(p2.stats.str, freshStr + 2 * T.rebirthStatBonus, 'bonuses stack per rebirth');

// 6) NG+ hardcore: HP/DEF/ATK scale independently. Retained usable weapon
// ATK adds early-run HP pressure that fades as monster level approaches 80.
const slimeDef = A.CONTENT.monsters.find(m => m.id === 'slime');
const ng2 = A.monsterStatsFor(slimeDef, slimeDef.level);
p2.rebirths = 0;
const ng0 = A.monsterStatsFor(slimeDef, slimeDef.level);
p2.rebirths = 2;
const near = (a, b) => Math.abs(a - b) <= 1;   // engine rounds once; recomputing here rounds twice
const retainedAtk = A.effAtk(p2.equip.weapon) + A.effAtk(p2.equip.accessory);
const levelProgress = (slimeDef.level - 1) / (A.DESIGN.levelCap - 1);
const retainedGearHp = Math.min(T.rebirthGearHpCap, retainedAtk * T.rebirthGearHpPerAtk) * (1 - levelProgress);
assert.ok(near(ng2.hp, ng0.hp * (1 + 2 * T.rebirthMonsterHpMult + retainedGearHp)), 'monster HP scales with rebirths and retained attack gear');
assert.ok(near(ng2.dv, ng0.dv * (1 + 2 * T.rebirthMonsterDefMult)), 'monster DEF scales per rebirth');
assert.ok(near(ng2.atk, ng0.atk * (1 + 2 * T.rebirthMonsterAtkMult)), 'monster ATK scales per rebirth');
assert.ok(ng2.exp > ng0.exp, 'harder monsters pay more EXP');

console.log('Rebirth audit passed: cap gate, clean reset, kept wealth/world, stacking permanent bonuses, persistence.');
