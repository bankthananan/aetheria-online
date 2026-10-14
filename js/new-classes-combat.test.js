import test from 'node:test';
import assert from 'node:assert/strict';
import { installBrowserEnv } from './test-support/browser-env.js';

let vnow = 1000;
installBrowserEnv({ now: () => vnow, innerWidth: 1440, innerHeight: 900, nullSelectors: [], strictIds: false });
await import('./game.js');
const { COMBAT } = await import('./combat.js');
const A = globalThis.__AWO;

test('All 24 new class skills are registered in COMBAT.skills with valid properties', () => {
  const expectedSkills = [
    'shadow_strike', 'smoke_screen', 'poison_coat', 'assassinate', 'mirage_flurry', 'death_mark', 'dance_of_shadows', 'eclipse_strike',
    'soul_rend', 'bone_armor', 'corpse_explosion', 'raise_skeletal_vanguard', 'plague_curse', 'death_nova', 'grim_harvest', 'apocalypse_harvest',
    'wrench_strike', 'acid_flask', 'deploy_sentry', 'tesla_coil', 'pyro_bomb', 'siege_cannon', 'philosopher_infusion', 'orbital_strike_beacon'
  ];
  for (const id of expectedSkills) {
    const byKey = COMBAT.skills[id];
    const byArray = COMBAT.skills.find(s => s.id === id);
    assert.ok(byKey, `Skill ${id} exists as keyed property in COMBAT.skills`);
    assert.ok(byArray, `Skill ${id} exists in COMBAT.skills array`);
    assert.equal(byKey, byArray, `Skill ${id} key matches array item`);

    assert.ok(byKey.name, `Skill ${id} has a name`);
    assert.ok(typeof byKey.flavor === 'string' && byKey.flavor.length > 0, `Skill ${id} has flavor`);
    assert.ok(Number.isFinite(byKey.power) && byKey.power > 0, `Skill ${id} has positive power`);
    assert.ok(Number.isFinite(byKey.cooldownMs) && byKey.cooldownMs > 0, `Skill ${id} has positive cooldownMs`);
    assert.ok(Number.isFinite(byKey.mpCost) && byKey.mpCost > 0, `Skill ${id} has positive mpCost`);
    assert.ok(['melee', 'ranged', 'aoe', 'buff', 'heal'].includes(byKey.type), `Skill ${id} has valid type`);
  }
});

test('Combat class mapping resolves correctly for new classes', () => {
  const p1 = A.makePlayer('shadow_blade', 'Ninja');
  assert.equal(p1.combatClass, 'assassin');

  const p2 = A.makePlayer('soul_binder', 'Necro');
  assert.equal(p2.combatClass, 'necromancer');

  const p3 = A.makePlayer('artificer', 'Tinkerer');
  assert.equal(p3.combatClass, 'artificer');
});

test('CLASS_GEAR_PRIORITIES has entries for assassin, necromancer, and artificer', async () => {
  const { CLASS_GEAR_PRIORITIES } = await import('./game.js');
  const priorities = CLASS_GEAR_PRIORITIES || A.CLASS_GEAR_PRIORITIES;
  assert.ok(priorities, 'CLASS_GEAR_PRIORITIES is exposed');
  assert.deepEqual(priorities.assassin, ['atkPct', 'critPct', 'fleeFlat', 'hpFlat']);
  assert.deepEqual(priorities.necromancer, ['atkPct', 'mpFlat', 'hpFlat', 'defPct']);
  assert.deepEqual(priorities.artificer, ['atkPct', 'hitFlat', 'mpFlat', 'critPct']);
});

test('Skill execution and damage dealing with castSkillById for base starter skills', () => {
  const realRandom = Math.random;
  Math.random = () => 0;

  try {
    // shadow_strike
    {
      const p = A.makePlayer('shadow_blade', 'Tester');
      A.G.player = p;
      A.G.monsters = [];
      p.skillLevels.shadow_strike = 1;
      const dummy = A.makeMonster(A.CONTENT.monsters[0], p.x + 16, p.y, 1);
      dummy.maxHp = 99999; dummy.hp = 99999;
      A.G.monsters.push(dummy);
      A.G.target = dummy;
      const hpBefore = dummy.hp;
      A.castSkillById('shadow_strike');
      assert.ok(dummy.hp < hpBefore, 'shadow_strike damages target');
      assert.ok(p.skillCd.shadow_strike > vnow, 'shadow_strike triggers cooldown');
    }

    // soul_rend
    {
      const p = A.makePlayer('soul_binder', 'Tester');
      A.G.player = p;
      A.G.monsters = [];
      p.skillLevels.soul_rend = 1;
      const dummy = A.makeMonster(A.CONTENT.monsters[0], p.x + 32, p.y, 1);
      dummy.maxHp = 99999; dummy.hp = 99999;
      A.G.monsters.push(dummy);
      A.G.target = dummy;
      const hpBefore = dummy.hp;
      A.castSkillById('soul_rend');
      assert.ok(dummy.hp < hpBefore, 'soul_rend damages target');
      assert.ok(p.skillCd.soul_rend > vnow, 'soul_rend triggers cooldown');
    }

    // wrench_strike
    {
      const p = A.makePlayer('artificer', 'Tester');
      A.G.player = p;
      A.G.monsters = [];
      p.skillLevels.wrench_strike = 1;
      const dummy = A.makeMonster(A.CONTENT.monsters[0], p.x + 16, p.y, 1);
      dummy.maxHp = 99999; dummy.hp = 99999;
      A.G.monsters.push(dummy);
      A.G.target = dummy;
      const hpBefore = dummy.hp;
      A.castSkillById('wrench_strike');
      assert.ok(dummy.hp < hpBefore, 'wrench_strike damages target');
      assert.ok(p.skillCd.wrench_strike > vnow, 'wrench_strike triggers cooldown');
    }
  } finally {
    Math.random = realRandom;
  }
});

test('Branch mechanic: nightstalker (venom_amplification) detonateAmp on assassinate', () => {
  const p = A.makePlayer('shadow_blade', 'Nightstalker');
  A.G.player = p;
  p.tierIndex = 1; p.jobBranchId = 'nightstalker'; p.level = 20; p.jobLevel = 20;
  A.recompute(p, true);
  p.skillLevels.assassinate = 1;

  const realRandom = Math.random;
  Math.random = () => 0.5;

  const dummy1 = A.makeMonster(A.CONTENT.monsters[0], p.x + 16, p.y, 1);
  dummy1.maxHp = 99999; dummy1.hp = 99999;
  A.G.monsters = [dummy1];
  A.G.target = dummy1;
  A.castSkillById('assassinate');
  const dmgNormal = 99999 - dummy1.hp;

  p.skillCd.assassinate = 0;
  const dummy2 = A.makeMonster(A.CONTENT.monsters[0], p.x + 16, p.y, 1);
  dummy2.maxHp = 99999; dummy2.hp = 99999;
  dummy2.statuses.poison = { until: vnow + 5000, nextTick: vnow + 1000 };
  A.G.monsters = [dummy2];
  A.G.target = dummy2;
  A.castSkillById('assassinate');
  const dmgAmp = 99999 - dummy2.hp;

  Math.random = realRandom;

  assert.equal(dummy2.statuses.poison, undefined, 'poison consumed by venom_amplification');
  assert.equal(dmgAmp, Math.round(dmgNormal * 1.15), 'venom_amplification deals +15% damage to poisoned target');
});

test('Branch mechanic: phantom_blade (phantom_step) procCdr on mirage_flurry', () => {
  const p = A.makePlayer('shadow_blade', 'Phantom');
  A.G.player = p;
  p.tierIndex = 1; p.jobBranchId = 'phantom_blade'; p.level = 20; p.jobLevel = 20;
  A.recompute(p, true);
  p.skillLevels.mirage_flurry = 1;
  p.skillLevels.smoke_screen = 1;

  const dummy = A.makeMonster(A.CONTENT.monsters[0], p.x + 16, p.y, 1);
  dummy.maxHp = 99999; dummy.hp = 99999;
  A.G.monsters = [dummy];
  A.G.target = dummy;

  p.skillCd.smoke_screen = vnow + 12000;
  const realRandom = Math.random;
  Math.random = () => 0;
  try {
    A.castSkillById('mirage_flurry');
    const expectedCd = vnow + 12000 - A.DESIGN.jobBranchBalance.mechanic.procCdr.ms;
    assert.equal(p.skillCd.smoke_screen, expectedCd, 'phantom_step reduces smoke_screen cooldown by procCdr ms');
  } finally {
    Math.random = realRandom;
  }
});

test('Branch mechanic: dread_summoner (legion_empowerment) bonusBuff on raise_skeletal_vanguard', () => {
  const p = A.makePlayer('soul_binder', 'Summoner');
  A.G.player = p;
  p.tierIndex = 1; p.jobBranchId = 'dread_summoner'; p.level = 20; p.jobLevel = 20;
  A.recompute(p, true);
  p.skillLevels.raise_skeletal_vanguard = 1;

  A.castSkillById('raise_skeletal_vanguard');
  const branchBuff = p.buffs.find(b => b.sourceSkillId === 'branch:dread_summoner');
  assert.ok(branchBuff, 'dread_summoner legion_empowerment grants branch buff');
  assert.equal(branchBuff.stat, 'def');
  assert.equal(branchBuff.mult, 1 + A.DESIGN.jobBranchBalance.mechanic.bonusBuff.mult);
});

test('Branch mechanic: plague_harbinger (soul_siphon) procHeal on plague_curse', () => {
  const p = A.makePlayer('soul_binder', 'Plague');
  A.G.player = p;
  p.tierIndex = 1; p.jobBranchId = 'plague_harbinger'; p.level = 20; p.jobLevel = 20;
  A.recompute(p, true);
  p.skillLevels.plague_curse = 1;

  const dummy = A.makeMonster(A.CONTENT.monsters[0], p.x + 32, p.y, 1);
  dummy.maxHp = 99999; dummy.hp = 99999;
  A.G.monsters = [dummy];
  A.G.target = dummy;

  p.hp = Math.floor(p.maxHp * 0.5);
  const hpBefore = p.hp;
  const realRandom = Math.random;
  Math.random = () => 0;
  try {
    A.castSkillById('plague_curse');
    assert.ok(p.hp > hpBefore, 'soul_siphon heals player on hit');
  } finally {
    Math.random = realRandom;
  }
});

test('Branch mechanic: clockwork_engineer (overclock_grid) bonusBuff on tesla_coil', () => {
  const p = A.makePlayer('artificer', 'Engineer');
  A.G.player = p;
  p.tierIndex = 1; p.jobBranchId = 'clockwork_engineer'; p.level = 20; p.jobLevel = 20;
  A.recompute(p, true);
  p.skillLevels.tesla_coil = 1;

  const dummy = A.makeMonster(A.CONTENT.monsters[0], p.x + 16, p.y, 1);
  dummy.maxHp = 99999; dummy.hp = 99999;
  A.G.monsters = [dummy];
  A.G.target = dummy;

  A.castSkillById('tesla_coil');
  const branchBuff = p.buffs.find(b => b.sourceSkillId === 'branch:clockwork_engineer');
  assert.ok(branchBuff, 'clockwork_engineer overclock_grid grants branch buff');
  assert.equal(branchBuff.stat, 'atk');
  assert.equal(branchBuff.mult, 1 + A.DESIGN.jobBranchBalance.mechanic.bonusBuff.mult);
});

test('Branch mechanic: mad_alchemist (alchemical_catalyst) detonateAmp on pyro_bomb', () => {
  const p = A.makePlayer('artificer', 'Alchemist');
  A.G.player = p;
  p.tierIndex = 1; p.jobBranchId = 'mad_alchemist'; p.level = 20; p.jobLevel = 20;
  A.recompute(p, true);
  p.skillLevels.pyro_bomb = 1;

  const realRandom = Math.random;
  Math.random = () => 0.5;

  const dummy1 = A.makeMonster(A.CONTENT.monsters[0], p.x + 16, p.y, 1);
  dummy1.maxHp = 99999; dummy1.hp = 99999;
  A.G.monsters = [dummy1];
  A.G.target = dummy1;
  A.castSkillById('pyro_bomb');
  const dmgNormal = 99999 - dummy1.hp;

  p.skillCd.pyro_bomb = 0;
  const dummy2 = A.makeMonster(A.CONTENT.monsters[0], p.x + 16, p.y, 1);
  dummy2.maxHp = 99999; dummy2.hp = 99999;
  dummy2.statuses.burn = { until: vnow + 5000, nextTick: vnow + 1000 };
  A.G.monsters = [dummy2];
  A.G.target = dummy2;
  A.castSkillById('pyro_bomb');
  const dmgAmp = 99999 - dummy2.hp;

  Math.random = realRandom;

  assert.ok(dummy2.statuses.burn, 'fresh burn status applied after detonating');
  assert.equal(dummy2.statuses.burn.until, vnow + COMBAT.statusEffects.burn.durationMs, 'fresh burn duration applied');
  assert.equal(dmgAmp, Math.round(dmgNormal * 1.15), 'alchemical_catalyst deals +15% damage to burning target');
});
