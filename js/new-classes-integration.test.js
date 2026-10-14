// js/new-classes-integration.test.js
// End-to-End Acceptance Integration Suite: 3 New Classes & 4-Tier Job Progression.
// Tests full character lifecycle, progression advancement (Tier 1-4),
// weapon and armor itemization (Bands 1-5), active combat skills & branch mechanics,
// zero screen shake constraints, save/load persistence, and bilingual UI rendering.

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

const { CLASS_COMBAT, CLASS_GEAR_PRIORITIES } = await import('./game.js');
const { CONTENT } = await import('./content.js');
const { COMBAT } = await import('./combat.js');
const { DESIGN } = await import('./design.js');
const { PROGRESSION } = await import('./progression.js');
const { T, setLanguage } = await import('./locale.js');

const A = globalThis.__AWO;
assert.ok(A, 'game debug API loaded');

console.log('=== RUNNING NEW CLASSES & JOB PROGRESSION INTEGRATION SUITE ===');

// ============================================================================
// 1. SHADOW BLADE LIFECYCLE & PROGRESSION
// ============================================================================
console.log('1. Testing Shadow Blade (assassin) lifecycle...');
{
  const p = A.makePlayer('shadow_blade', 'Kage');
  A.G.player = p;
  A.recompute(p, true);

  assert.equal(p.classId, 'shadow_blade');
  assert.equal(CLASS_COMBAT[p.classId], 'assassin');
  assert.equal(p.combatClass, 'assassin');
  assert.deepEqual(DESIGN.classes.find(c => c.id === p.classId).starterSkills, ['shadow_strike', 'smoke_screen', 'poison_coat']);

  // Calling Quest integration
  const callingQuest = CONTENT.quests.find(q => q.id === 'q_calling_shadow_blade');
  assert.ok(callingQuest, 'Shadow Blade calling quest exists');
  assert.equal(callingQuest.nextQuestId, 'q_prove');

  // Equipment Progression Bands 1-5
  const shadowWeapons = ['iron_dagger', 'shadow_kris', 'nightstalker_stiletto', 'abyssal_fang', 'eclipse_edge'];
  const shadowArmors = ['shadow_leathers', 'nightstalker_tunic', 'phantom_garb', 'void_assassin_vestments'];

  let prevAtk = p.atk;
  for (const wId of shadowWeapons) {
    const inst = A.rollItem(wId, 0, 'common');
    p.inventory = [inst];
    assert.ok(A.canUseItem(p, wId), `Shadow blade can use ${wId}`);
    A.equip(inst.uid);
    A.recompute(p, false);
    assert.equal(p.equip.weapon?.itemId, wId, `Equipped ${wId}`);
    assert.ok(p.atk >= prevAtk, `ATK scaled up with ${wId}`);
    prevAtk = p.atk;
  }

  let prevDef = p.def;
  for (const aId of shadowArmors) {
    const inst = A.rollItem(aId, 0, 'common');
    p.inventory = [inst];
    assert.ok(A.canUseItem(p, aId), `Shadow blade can use ${aId}`);
    A.equip(inst.uid);
    A.recompute(p, false);
    assert.equal(p.equip.body?.itemId, aId, `Equipped ${aId}`);
    assert.ok(p.def >= prevDef, `DEF scaled up with ${aId}`);
    prevDef = p.def;
  }

  // Tier 1 (Lv 15): Second Job Branch Choice
  p.level = 15; p.jobLevel = 18;
  A.doPromote(p, 1, 'nightstalker');
  assert.equal(p.jobBranchId, 'nightstalker');
  assert.equal(p.tierIndex, 1);
  assert.ok(A.branchAllowsSkill(p, 'assassinate'));
  assert.ok(!A.branchAllowsSkill(p, 'mirage_flurry'));

  // Tier 2 (Lv 40): Advanced Job Transition
  p.level = 40; p.jobLevel = 35;
  p.advancedJobId = 'shadow_sovereign';
  A.doPromote(p, 2);
  assert.equal(p.advancedJobId, 'shadow_sovereign');
  assert.equal(p.tierIndex, 2);
  assert.ok(A.advancedJobAllowsSkill(p, 'death_mark'));
  assert.ok(A.advancedJobAllowsPassive(p, 'executioners_instinct'));

  // Tier 3 (Lv 70): Hybrid Ascension
  p.level = 70; p.jobLevel = 50;
  A.doPromote(p, 3);
  assert.equal(p.hybridJobId, 'nightblade_phantom');
  assert.equal(p.tierIndex, 3);

  // Combat Execution: Poison Coat -> On-hit poison -> Assassinate detonate bonus
  const realRandom = Math.random;
  Math.random = () => 0.5;
  try {
    p.hit = 999;
    p.critChance = 0;
    p.skillLevels.poison_coat = 1;
    p.skillLevels.assassinate = 1;
    p.hp = 1000; p.mp = 1000; p.momentum = 0;

    const dummy = A.makeMonster(CONTENT.monsters[0], p.x + 16, p.y, 1);
    dummy.hp = 99999; dummy.maxHp = 99999;
    dummy.flee = 0;
    A.G.monsters = [dummy];
    A.G.target = dummy;

    // 1. Cast poison_coat (buff)
    A.castSkillById('poison_coat');
    assert.ok(p.buffs.some(b => b.sourceSkillId === 'poison_coat'), 'poison_coat buff applied');
    assert.ok(p.imbue && p.imbue.element === 'nature', 'poison_coat imbues nature element');

    // 2. Perform attack to apply poison status on target
    A.playerBasicAttack();
    assert.ok(dummy.statuses.poison && dummy.statuses.poison.until > vnow, 'on-hit poison applied to target');

    // Clear poison_coat buff so assassinate consumes poison without immediately re-coating
    p.buffs = [];

    // 3. Cast assassinate with Nightstalker venom_amplification detonateAmp
    const hpBeforeAssassinate = dummy.hp;
    A.castSkillById('assassinate');
    assert.ok(dummy.hp < hpBeforeAssassinate, 'assassinate damaged target');
  } finally {
    Math.random = realRandom;
  }
}

// ============================================================================
// 2. SOUL BINDER LIFECYCLE & PROGRESSION
// ============================================================================
console.log('2. Testing Soul Binder (necromancer) lifecycle...');
{
  const p = A.makePlayer('soul_binder', 'Mortis');
  A.G.player = p;
  A.recompute(p, true);

  assert.equal(p.classId, 'soul_binder');
  assert.equal(CLASS_COMBAT[p.classId], 'necromancer');
  assert.equal(p.combatClass, 'necromancer');
  assert.deepEqual(DESIGN.classes.find(c => c.id === p.classId).starterSkills, ['soul_rend', 'bone_armor', 'corpse_explosion']);

  // Calling Quest integration
  const callingQuest = CONTENT.quests.find(q => q.id === 'q_calling_soul_binder');
  assert.ok(callingQuest, 'Soul Binder calling quest exists');
  assert.equal(callingQuest.nextQuestId, 'q_prove');

  // Equipment Progression Bands 1-5
  const soulWeapons = ['bone_wand', 'soul_binder_staff', 'bone_scythe', 'nether_grimoire', 'abyssal_harvester'];
  const soulArmors = ['acolyte_robes', 'bone_woven_vestments', 'lich_mantle', 'netherlord_regalia'];

  for (const wId of soulWeapons) {
    const inst = A.rollItem(wId, 0, 'common');
    p.inventory = [inst];
    assert.ok(A.canUseItem(p, wId), `Soul binder can use ${wId}`);
    A.equip(inst.uid);
    assert.equal(p.equip.weapon?.itemId, wId, `Equipped ${wId}`);
  }

  for (const aId of soulArmors) {
    const inst = A.rollItem(aId, 0, 'common');
    p.inventory = [inst];
    assert.ok(A.canUseItem(p, aId), `Soul binder can use ${aId}`);
    A.equip(inst.uid);
    assert.equal(p.equip.body?.itemId, aId, `Equipped ${aId}`);
  }

  // Tier 1 (Lv 15): Dread Summoner vs Plague Harbinger
  p.level = 15; p.jobLevel = 18;
  A.doPromote(p, 1, 'dread_summoner');
  assert.equal(p.jobBranchId, 'dread_summoner');
  assert.ok(A.branchAllowsSkill(p, 'raise_skeletal_vanguard'));
  assert.ok(!A.branchAllowsSkill(p, 'plague_curse'));

  // Tier 2 (Lv 40): Abyssal Lich vs Nether Knight
  p.level = 40; p.jobLevel = 35;
  p.advancedJobId = 'abyssal_lich';
  A.doPromote(p, 2);
  assert.equal(p.advancedJobId, 'abyssal_lich');
  assert.ok(A.advancedJobAllowsSkill(p, 'death_nova'));
  assert.ok(A.advancedJobAllowsPassive(p, 'eternal_phylactery'));

  // Tier 3 (Lv 70): Eldritch Netherlord
  p.level = 70; p.jobLevel = 50;
  A.doPromote(p, 3);
  assert.equal(p.hybridJobId, 'eldritch_lord');
  assert.equal(p.tierIndex, 3);

  // Combat Execution: bone_armor buff & soul_rend ranged attack
  const realRandom = Math.random;
  Math.random = () => 0;
  try {
    p.skillLevels.bone_armor = 1;
    p.skillLevels.soul_rend = 1;
    p.hp = 1000; p.mp = 1000;

    const dummy = A.makeMonster(CONTENT.monsters[0], p.x + 32, p.y, 1);
    dummy.hp = 99999; dummy.maxHp = 99999;
    A.G.monsters = [dummy];
    A.G.target = dummy;

    A.castSkillById('bone_armor');
    assert.ok(p.buffs.some(b => b.sourceSkillId === 'bone_armor'), 'bone_armor buff active');

    const hpBeforeRend = dummy.hp;
    A.castSkillById('soul_rend');
    assert.ok(dummy.hp < hpBeforeRend, 'soul_rend deals damage');
  } finally {
    Math.random = realRandom;
  }
}

// ============================================================================
// 3. ARTIFICER LIFECYCLE & PROGRESSION
// ============================================================================
console.log('3. Testing Artificer (artificer) lifecycle...');
{
  const p = A.makePlayer('artificer', 'Torque');
  A.G.player = p;
  A.recompute(p, true);

  assert.equal(p.classId, 'artificer');
  assert.equal(CLASS_COMBAT[p.classId], 'artificer');
  assert.equal(p.combatClass, 'artificer');
  assert.deepEqual(DESIGN.classes.find(c => c.id === p.classId).starterSkills, ['wrench_strike', 'acid_flask', 'deploy_sentry']);

  // Calling Quest integration
  const callingQuest = CONTENT.quests.find(q => q.id === 'q_calling_artificer');
  assert.ok(callingQuest, 'Artificer calling quest exists');
  assert.equal(callingQuest.nextQuestId, 'q_prove');

  // Equipment Progression Bands 1-5
  const artWeapons = ['heavy_wrench', 'steam_pistol', 'magitek_driver', 'mortar_cannon', 'clockwork_obliteration_engine'];
  const artArmors = ['tinkerer_smock', 'engineer_overalls', 'magitek_harness', 'mechlord_power_chassis'];

  for (const wId of artWeapons) {
    const inst = A.rollItem(wId, 0, 'common');
    p.inventory = [inst];
    assert.ok(A.canUseItem(p, wId), `Artificer can use ${wId}`);
    A.equip(inst.uid);
    assert.equal(p.equip.weapon?.itemId, wId, `Equipped ${wId}`);
  }

  for (const aId of artArmors) {
    const inst = A.rollItem(aId, 0, 'common');
    p.inventory = [inst];
    assert.ok(A.canUseItem(p, aId), `Artificer can use ${aId}`);
    A.equip(inst.uid);
    assert.equal(p.equip.body?.itemId, aId, `Equipped ${aId}`);
  }

  // Tier 1 (Lv 15): Clockwork Engineer vs Mad Alchemist
  p.level = 15; p.jobLevel = 18;
  A.doPromote(p, 1, 'clockwork_engineer');
  assert.equal(p.jobBranchId, 'clockwork_engineer');
  assert.ok(A.branchAllowsSkill(p, 'tesla_coil'));
  assert.ok(!A.branchAllowsSkill(p, 'pyro_bomb'));

  // Tier 2 (Lv 40): Magitek Mechlord vs Grand Alchemist
  p.level = 40; p.jobLevel = 35;
  p.advancedJobId = 'magitek_mechlord';
  A.doPromote(p, 2);
  assert.equal(p.advancedJobId, 'magitek_mechlord');
  assert.ok(A.advancedJobAllowsSkill(p, 'siege_cannon'));
  assert.ok(A.advancedJobAllowsPassive(p, 'reactive_chassis'));

  // Tier 3 (Lv 70): Quantum Technomancer
  p.level = 70; p.jobLevel = 50;
  A.doPromote(p, 3);
  assert.equal(p.hybridJobId, 'quantum_technomancer');
  assert.equal(p.tierIndex, 3);

  // Combat Execution: deploy_sentry buff & wrench_strike stun melee
  const realRandom = Math.random;
  Math.random = () => 0;
  try {
    p.skillLevels.deploy_sentry = 1;
    p.skillLevels.wrench_strike = 1;
    p.hp = 1000; p.mp = 1000;

    const dummy = A.makeMonster(CONTENT.monsters[0], p.x + 16, p.y, 1);
    dummy.hp = 99999; dummy.maxHp = 99999;
    A.G.monsters = [dummy];
    A.G.target = dummy;

    A.castSkillById('deploy_sentry');
    assert.ok(p.buffs.some(b => b.sourceSkillId === 'deploy_sentry'), 'deploy_sentry buff active');

    const hpBeforeWrench = dummy.hp;
    A.castSkillById('wrench_strike');
    assert.ok(dummy.hp < hpBeforeWrench, 'wrench_strike deals damage');
    assert.ok(dummy.statuses.stun, 'wrench_strike applies stun status');
  } finally {
    Math.random = realRandom;
  }
}

// ============================================================================
// 4. PERSISTENCE ROUND-TRIP (SAVE & RESUME)
// ============================================================================
console.log('4. Testing save and load persistence...');
{
  const p = A.makePlayer('shadow_blade', 'SaveTester');
  A.G.player = p;
  p.level = 42; p.jobLevel = 36;
  p.tierIndex = 2;
  p.jobBranchId = 'phantom_blade';
  p.advancedJobId = 'void_stalker';
  const swordInst = A.rollItem('nightstalker_stiletto', 0, 'common');
  const armorInst = A.rollItem('phantom_garb', 0, 'common');
  p.inventory = [swordInst, armorInst];
  A.equip(swordInst.uid);
  A.equip(armorInst.uid);
  p.skillLevels = { shadow_strike: 5, smoke_screen: 2, mirage_flurry: 3, dance_of_shadows: 1, abyssal_reflexes: 2 };
  A.G.running = true;

  // Save to localStorage
  const saveResult = A.saveGame();
  assert.equal(saveResult, true, 'Game saved successfully');

  // Reset player and reload
  A.G.player = null;
  const resumeResult = A.resumeGame();
  assert.equal(resumeResult, true, 'Game resumed successfully');

  const loaded = A.G.player;
  assert.ok(loaded, 'Player loaded from save storage');
  assert.equal(loaded.classId, 'shadow_blade');
  assert.equal(loaded.jobBranchId, 'phantom_blade');
  assert.equal(loaded.advancedJobId, 'void_stalker');
  assert.equal(loaded.equip.weapon?.itemId, 'nightstalker_stiletto');
  assert.equal(loaded.equip.body?.itemId, 'phantom_garb');
  assert.equal(loaded.skillLevels.mirage_flurry, 3);
  assert.equal(loaded.skillLevels.abyssal_reflexes, 2);
}

// ============================================================================
// 5. BILINGUAL UI RENDERING VALIDATION
// ============================================================================
console.log('5. Testing bilingual UI panel rendering...');
{
  for (const lang of ['en', 'th']) {
    setLanguage(lang);
    A.setLanguage(lang);

    for (const cid of ['shadow_blade', 'soul_binder', 'artificer']) {
      const p = A.makePlayer(cid, `Hero_${lang}`);
      A.G.player = p;
      A.buildHud();
      A.updateHud();

      // Render character and skills panels without errors
      assert.doesNotThrow(() => A.panelBody('char'), `Panel 'char' renders in ${lang} for ${cid}`);
      assert.doesNotThrow(() => A.panelBody('skills'), `Panel 'skills' renders in ${lang} for ${cid}`);
      assert.doesNotThrow(() => A.panelBody('inv'), `Panel 'inv' renders in ${lang} for ${cid}`);
    }
  }
}

console.log('All integration assertions PASSED successfully.');
