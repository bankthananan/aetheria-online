import test from 'node:test';
import assert from 'node:assert/strict';
import { DESIGN } from './design.js';
import { PROGRESSION } from './progression.js';

test('New classes are registered in DESIGN.classes with valid stat growths and starter skills', () => {
  const ids = DESIGN.classes.map(c => c.id);
  assert.ok(ids.includes('shadow_blade'), 'shadow_blade registered');
  assert.ok(ids.includes('soul_binder'), 'soul_binder registered');
  assert.ok(ids.includes('artificer'), 'artificer registered');

  const sb = DESIGN.classes.find(c => c.id === 'shadow_blade');
  assert.equal(sb.combatClass, 'assassin');
  assert.ok(sb.growth.agi > 1.0 && sb.growth.luk >= 1.0);
  assert.deepEqual(sb.starterSkills, ['shadow_strike', 'smoke_screen', 'poison_coat']);

  const nec = DESIGN.classes.find(c => c.id === 'soul_binder');
  assert.equal(nec.combatClass, 'necromancer');
  assert.ok(nec.growth.int > 1.2 && nec.growth.vit > 1.0);
  assert.deepEqual(nec.starterSkills, ['soul_rend', 'bone_armor', 'corpse_explosion']);

  const art = DESIGN.classes.find(c => c.id === 'artificer');
  assert.equal(art.combatClass, 'artificer');
  assert.ok(art.growth.dex >= 1.1 && art.growth.int >= 1.0);
  assert.deepEqual(art.starterSkills, ['wrench_strike', 'acid_flask', 'deploy_sentry']);
});

test('Progression tiers and skillBooks are populated for all 3 classes', () => {
  for (const cid of ['shadow_blade', 'soul_binder', 'artificer']) {
    const tiers = PROGRESSION.tiers[cid];
    assert.ok(Array.isArray(tiers) && tiers.length === 4, `${cid} has 4 progression tiers`);
    assert.equal(tiers[0].reqLevel, 1);
    assert.equal(tiers[1].reqLevel, 15);
    assert.equal(tiers[2].reqLevel, 40);
    assert.equal(tiers[3].reqLevel, 70);

    assert.ok(tiers[1].advance && tiers[1].advance.objective, `${cid} tier 1 has advance objective`);
    assert.ok(tiers[2].advance && tiers[2].advance.objective, `${cid} tier 2 has advance objective`);
    assert.ok(tiers[3].advance && tiers[3].advance.objective, `${cid} tier 3 has advance objective`);
    assert.equal(tiers[3].isHybrid, true, `${cid} tier 3 is hybrid`);

    const branches = PROGRESSION.jobBranches[cid];
    assert.ok(branches && branches.choices.length === 2, `${cid} has 2 job branches`);
    assert.ok(branches.choices.some(b => b.id === branches.defaultId), `${cid} default branch exists`);
    for (const b of branches.choices) {
      assert.ok(b.signatureSkillId, `Branch ${b.id} has signatureSkillId`);
      assert.ok(b.mechanic && b.mechanic.kind, `Branch ${b.id} has mechanic.kind`);
    }

    const adv = PROGRESSION.advancedJobs[cid];
    assert.ok(adv && adv.choices.length === 2, `${cid} has 2 advanced job choices`);
    assert.ok(adv.choices.some(j => j.id === adv.defaultId), `${cid} default advanced job exists`);
  }

  // Verify branch choice identities
  assert.deepEqual(
    PROGRESSION.jobBranches.shadow_blade.choices.map(c => c.id),
    ['nightstalker', 'phantom_blade']
  );
  assert.deepEqual(
    PROGRESSION.jobBranches.soul_binder.choices.map(c => c.id),
    ['dread_summoner', 'plague_harbinger']
  );
  assert.deepEqual(
    PROGRESSION.jobBranches.artificer.choices.map(c => c.id),
    ['clockwork_engineer', 'mad_alchemist']
  );

  // Verify advanced job identities
  assert.deepEqual(
    PROGRESSION.advancedJobs.shadow_blade.choices.map(c => c.id),
    ['shadow_sovereign', 'void_stalker']
  );
  assert.deepEqual(
    PROGRESSION.advancedJobs.soul_binder.choices.map(c => c.id),
    ['abyssal_lich', 'nether_knight']
  );
  assert.deepEqual(
    PROGRESSION.advancedJobs.artificer.choices.map(c => c.id),
    ['magitek_mechlord', 'grand_alchemist']
  );

  // Skill books
  assert.ok(PROGRESSION.skillBooks.assassin, 'assassin skill book exists');
  assert.equal(PROGRESSION.skillBooks.assassin.title, 'Manual of the Silent Umbra');
  assert.equal(PROGRESSION.skillBooks.assassin.crest, '🗡');
  assert.equal(PROGRESSION.skillBooks.assassin.color, '#8e44ad');

  assert.ok(PROGRESSION.skillBooks.necromancer, 'necromancer skill book exists');
  assert.equal(PROGRESSION.skillBooks.necromancer.title, 'Necrotic Grimoire');
  assert.equal(PROGRESSION.skillBooks.necromancer.crest, '☠');
  assert.equal(PROGRESSION.skillBooks.necromancer.color, '#16a085');

  assert.ok(PROGRESSION.skillBooks.artificer, 'artificer skill book exists');
  assert.equal(PROGRESSION.skillBooks.artificer.title, 'Magitek Blueprint Index');
  assert.equal(PROGRESSION.skillBooks.artificer.crest, '⚙');
  assert.equal(PROGRESSION.skillBooks.artificer.color, '#d35400');
});

test('All 24 active skills exist in PROGRESSION.skillTree', () => {
  const expectedSkills = {
    shadow_blade: [
      'shadow_strike', 'smoke_screen', 'poison_coat', 'assassinate',
      'mirage_flurry', 'death_mark', 'dance_of_shadows', 'eclipse_strike'
    ],
    soul_binder: [
      'soul_rend', 'bone_armor', 'corpse_explosion', 'raise_skeletal_vanguard',
      'plague_curse', 'death_nova', 'grim_harvest', 'apocalypse_harvest'
    ],
    artificer: [
      'wrench_strike', 'acid_flask', 'deploy_sentry', 'tesla_coil',
      'pyro_bomb', 'siege_cannon', 'philosopher_infusion', 'orbital_strike_beacon'
    ]
  };

  for (const [cls, skills] of Object.entries(expectedSkills)) {
    for (const skillId of skills) {
      const node = PROGRESSION.skillTree[skillId];
      assert.ok(node, `Skill ${skillId} (${cls}) exists in PROGRESSION.skillTree`);
      assert.ok(node.maxLevel > 0, `Skill ${skillId} has maxLevel`);
      assert.ok(node.reqLevel > 0, `Skill ${skillId} has reqLevel`);
    }
  }
});

test('All 18 class passives exist in PROGRESSION.passives', () => {
  const expectedPassives = {
    assassin: [
      'dagger_mastery', 'shadow_step', 'lethal_precision',
      'venom_tolerance', 'executioners_instinct', 'abyssal_reflexes'
    ],
    necromancer: [
      'necrotic_affinity', 'soul_reservoir', 'death_ward',
      'scythe_mastery', 'eternal_phylactery', 'unholy_fortitude'
    ],
    artificer: [
      'engineering_savvy', 'magitek_efficiency', 'reinforced_alloys',
      'precision_calipers', 'reactive_chassis', 'transmutation_mastery'
    ]
  };

  for (const [combatClass, passives] of Object.entries(expectedPassives)) {
    for (const passiveId of passives) {
      const p = PROGRESSION.passives[passiveId];
      assert.ok(p, `Passive ${passiveId} (${combatClass}) exists in PROGRESSION.passives`);
      assert.equal(p.classId, combatClass, `Passive ${passiveId} belongs to ${combatClass}`);
      assert.ok(p.stat, `Passive ${passiveId} has a stat`);
      assert.ok(p.per > 0, `Passive ${passiveId} has per value`);
      assert.ok(p.maxLevel > 0, `Passive ${passiveId} has maxLevel`);
    }
  }
});

test('New hybrid jobs are registered in PROGRESSION.hybridJobs with 2 required classes', () => {
  const hybrids = ['nightblade_phantom', 'eldritch_lord', 'quantum_technomancer'];
  const expectedPairings = {
    nightblade_phantom: ['shadow_blade', 'drifter'],
    eldritch_lord: ['soul_binder', 'codeweaver'],
    quantum_technomancer: ['artificer', 'stormcaller'],
  };

  for (const id of hybrids) {
    const h = PROGRESSION.hybridJobs[id];
    assert.ok(h, `Hybrid job ${id} exists in PROGRESSION.hybridJobs`);
    assert.ok(h.name, `Hybrid job ${id} has a name`);
    assert.ok(h.bonus, `Hybrid job ${id} has bonus stats`);
    assert.ok(h.signatureSkillId, `Hybrid job ${id} has signatureSkillId`);
    assert.ok(PROGRESSION.skillTree[h.signatureSkillId], `Signature skill ${h.signatureSkillId} exists in skillTree`);
    assert.equal(h.requires?.length, 2, `Hybrid job ${id} must require 2 classes`);
    assert.deepEqual(h.requires, expectedPairings[id], `Hybrid job ${id} requirements match expected complementary classes`);
  }
});

test('Tier 2 advanced job skills do not require Tier 1 branch-exclusive skills (no deadlock)', () => {
  const branchExclusiveSkillIds = new Set();
  for (const classBranches of Object.values(PROGRESSION.jobBranches)) {
    for (const choice of classBranches.choices) {
      if (choice.signatureSkillId) {
        branchExclusiveSkillIds.add(choice.signatureSkillId);
      }
    }
  }

  const newAdvancedSkills = [
    'death_mark', 'dance_of_shadows',
    'death_nova', 'grim_harvest',
    'siege_cannon', 'philosopher_infusion'
  ];

  for (const skillId of newAdvancedSkills) {
    const node = PROGRESSION.skillTree[skillId];
    assert.ok(node, `Skill ${skillId} exists in skillTree`);
    assert.ok(node.reqAdvancedJob, `Skill ${skillId} is an advanced job skill`);
    if (node.reqSkill) {
      assert.ok(
        !branchExclusiveSkillIds.has(node.reqSkill.id),
        `Advanced job skill ${skillId} requires ${node.reqSkill.id}, which is branch-exclusive! Must require a base skill instead.`
      );
    }
  }
});

