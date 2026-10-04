// Fighting-up must stay earned: the level-gap knobs hold their tuned values and
// burn DOTs obey the same gap penalty as direct hits (they used to bypass it,
// letting a Lv16 melt Lv22-25 monsters — see gapsim findings, 2026-07).
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

const { COMBAT } = await import('./combat.js');
const { CONTENT } = await import('./content.js');
await import('./game.js');
const A = globalThis.__AWO;
assert.ok(A, 'game debug API loaded');

// 1) The tuned wall values must not silently drift soft again.
const t = A.DESIGN.tuning;
assert.equal(t.combatGapFalloff, 0.15, 'combatGapFalloff drifted');
assert.equal(t.combatGapFloor, 0.12, 'combatGapFloor drifted');
assert.equal(t.combatGapHitPerLvl, 6, 'combatGapHitPerLvl drifted');
assert.equal(A.combatGapFactor(16, 20), 1 - 4 * 0.15, '+4 damage factor');
assert.equal(A.combatGapFactor(16, 22), 0.12, '+6 must hit the floor (wall)');
assert.equal(A.combatGapFactor(16, 25), 0.12, '+9 must hit the floor (wall)');
assert.equal(A.combatGapFactor(25, 16), 1, 'fighting down is never damage-penalized');

// 2) Burn DOT ticks must be gap-scaled like every other player damage source.
const p = A.makePlayer('codeweaver', 'GapTester');
p.level = 16; p.jobLevel = 16; p.skillPoints = 5;
p.alloc.int = 60;   // high ATK so a scaled and an unscaled burn tick genuinely differ
A.G.player = p;
A.buildHud();
A.recompute(p, true);
A.learnSkill('arcane_bolt');           // prerequisite chain for flame_burst
A.learnSkill('flame_burst');
assert.ok(p.skillLevels.flame_burst, 'test setup: flame_burst learnable at Lv16');
A.loadMap('whispering_woods');
A.G.monsters.forEach(m => { m.alive = false; m.deadUntil = vnow + 9e9; m.x = m.y = 20000; });
p.hp = p.maxHp; p.mp = p.maxMp;
const acolyte = CONTENT.monsters.find(m => m.id === 'drowned_acolyte');
const m = A.makeMonster(acolyte, p.x + 32, p.y, 25);   // +9 above the player
A.G.monsters.push(m);
A.G.target = m;
A.castSkillById('flame_burst');
const burn = m.statuses.burn;
assert.ok(burn, 'flame_burst must apply burn');
const burnDef = COMBAT.statusEffects.burn;
const expected = Math.max(burnDef.tickDamage,
  Math.round(p.atkStat * burnDef.powerRatio * A.combatGapFactor(p.level, m.lvl)));
assert.equal(burn.tickDamage, expected, 'burn tick must include the level-gap factor');
const unscaled = Math.round(p.atkStat * burnDef.powerRatio);
assert.ok(burn.tickDamage < unscaled || unscaled <= burnDef.tickDamage,
  'burn tick must not use unscaled player ATK vs a far-higher monster');

console.log('Combat gap audit passed: wall knobs intact, burn DOT obeys the level-gap penalty.');
