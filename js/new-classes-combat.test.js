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
  p.skillLevels.poison_coat = 1;
  const dummy2 = A.makeMonster(A.CONTENT.monsters[0], p.x + 16, p.y, 1);
  dummy2.maxHp = 99999; dummy2.hp = 99999;
  A.G.monsters = [dummy2];
  A.G.target = dummy2;

  // Cast poison_coat and hit dummy2 to naturally apply poison
  A.castSkillById('poison_coat');
  assert.ok(p.buffs.some(b => b.sourceSkillId === 'poison_coat'), 'poison_coat buff active');
  assert.equal(p.imbue?.element, 'nature', 'poison_coat imbues nature element');
  A.playerBasicAttack();
  assert.ok(dummy2.statuses.poison && dummy2.statuses.poison.until > vnow, 'poison applied naturally on hit via poison_coat');

  // Clear poison_coat buff so assassinate consumes poison without immediately re-coating
  p.buffs = [];
  const hpBeforeAssassinate = dummy2.hp;
  A.castSkillById('assassinate');
  const dmgAmp = hpBeforeAssassinate - dummy2.hp;

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

test('Tier-2 and Tier-3 skills cast and function correctly without screen shake or momentum loss on buffs', () => {
  const p = A.makePlayer('artificer', 'MasterArtisan');
  A.G.player = p;
  p.tierIndex = 2; p.advancedJobId = 'grand_alchemist'; p.level = 45; p.jobLevel = 30;
  A.recompute(p, true);
  p.skillLevels.philosopher_infusion = 1;
  p.skillLevels.siege_cannon = 1;
  p.momentum = 50;

  const dummy = A.makeMonster(A.CONTENT.monsters[0], p.x + 16, p.y, 1);
  dummy.maxHp = 99999; dummy.hp = 99999;
  A.G.monsters = [dummy];
  A.G.target = dummy;

  // Cast philosopher_infusion (buff): should NOT consume momentum
  A.castSkillById('philosopher_infusion');
  assert.equal(p.momentum, 50, 'philosopher_infusion does not wipe momentum');
  assert.ok(p.buffs.some(b => b.sourceSkillId === 'philosopher_infusion'), 'philosopher_infusion buff active');

  // Cast siege_cannon (offensive Tier 2): damages target and applies sunder
  A.castSkillById('siege_cannon');
  assert.ok(dummy.hp < 99999, 'siege_cannon damages target');
  assert.ok(dummy.statuses.sunder, 'siege_cannon applies sunder status');

  // Test Necromancer Tier 2 death_nova
  const pNec = A.makePlayer('soul_binder', 'Lich');
  A.G.player = pNec;
  pNec.tierIndex = 2; pNec.advancedJobId = 'abyssal_lich'; pNec.level = 45; pNec.jobLevel = 30;
  A.recompute(pNec, true);
  pNec.hp = 1000; pNec.mp = 1000; pNec.momentum = 50;
  pNec.skillLevels.death_nova = 1;
  const dummyNec = A.makeMonster(A.CONTENT.monsters[0], pNec.x + 16, pNec.y, 1);
  dummyNec.maxHp = 99999; dummyNec.hp = 99999;
  A.G.monsters = [dummyNec];
  A.G.target = dummyNec;
  A.castSkillById('death_nova');
  assert.ok(dummyNec.hp < 99999, 'death_nova damages target');
  assert.ok(dummyNec.statuses.poison, 'death_nova applies poison status');

  // Test Hybrid Tier 3 orbital_strike_beacon
  const pHybrid = A.makePlayer('artificer', 'Technomancer');
  A.G.player = pHybrid;
  pHybrid.tierIndex = 3; pHybrid.hybridJobId = 'quantum_technomancer'; pHybrid.level = 75; pHybrid.jobLevel = 50;
  A.recompute(pHybrid, true);
  pHybrid.hp = 1000; pHybrid.mp = 1000; pHybrid.momentum = 50;
  pHybrid.skillLevels.orbital_strike_beacon = 1;
  const dummyHybrid = A.makeMonster(A.CONTENT.monsters[0], pHybrid.x + 16, pHybrid.y, 1);
  dummyHybrid.maxHp = 99999; dummyHybrid.hp = 99999;
  A.G.monsters = [dummyHybrid];
  A.G.target = dummyHybrid;
  A.castSkillById('orbital_strike_beacon');
  assert.ok(dummyHybrid.hp < 99999, 'orbital_strike_beacon damages target');
  assert.ok(dummyHybrid.statuses.burn, 'orbital_strike_beacon applies burn status');
});

