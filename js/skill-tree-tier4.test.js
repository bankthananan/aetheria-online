import assert from 'node:assert/strict';
import { createRuntime } from './test-support/runtime.js';

const { A } = await createRuntime({ classId: 'shadow_blade', nullSelectors: [], strictIds: false });
const G = A.G;

const EXPECTED_HYBRIDS = {
  reborn_blade: { hybridName: 'Dreadnought', skillId: 'colossal_onslaught', lineage: ['reborn_blade', 'drifter'] },
  drifter: { hybridName: 'Spellblade', skillId: 'elemental_strike', lineage: ['drifter', 'codeweaver'] },
  codeweaver: { hybridName: 'Spellblade', skillId: 'elemental_strike', lineage: ['drifter', 'codeweaver'] },
  far_shot: { hybridName: 'Arcane Archer', skillId: 'arcane_arrow_barrage', lineage: ['far_shot', 'codeweaver'] },
  lightbringer: { hybridName: 'Vanguard', skillId: 'phalanx', lineage: ['iron_fist', 'lightbringer'] },
  iron_fist: { hybridName: 'Chi Tempest', skillId: 'cyclone_lotus_kick', lineage: ['iron_fist', 'stormcaller'] },
  stormcaller: { hybridName: 'Storm Templar', skillId: 'tempest_sanctuary', lineage: ['lightbringer', 'stormcaller'] },
  shadow_blade: { hybridName: 'Nightblade Sovereign', skillId: 'eclipse_strike', lineage: ['shadow_blade', 'drifter'] },
  soul_binder: { hybridName: 'Eldritch Netherlord', skillId: 'apocalypse_harvest', lineage: ['soul_binder', 'codeweaver'] },
  artificer: { hybridName: 'Quantum Technomancer', skillId: 'orbital_strike_beacon', lineage: ['artificer', 'stormcaller'] },
};

// Test 1: Verify all 10 classes render 4 job chapters and have accurate Chapter IV hybrid metadata
for (const [classId, expected] of Object.entries(EXPECTED_HYBRIDS)) {
  const p = A.makePlayer(classId, `Tester-${classId}`);
  G.player = p;
  G._skillTab = 3;
  G._skillSel = null;

  const html = A.skillsPanelHtml(p);
  // Assert 4 total lanes exist and exactly one is visible when G._skillTab = 3
  assert.equal((html.match(/class="ro-job-lane/g) || []).length, 4, `${classId} renders 4 job lanes`);
  assert.equal((html.match(/class="ro-job-lane[^"]*" data-tier="3"(?! hidden)>/g) || []).length, 1, `${classId} Chapter IV is visible when tab 3 is active`);
  assert.equal((html.match(/data-tier="\d" hidden>/g) || []).length, 3, `${classId} the other three chapters are hidden`);

  // Assert tab 3 button exists
  assert.ok(html.includes('data-skill-tab="3"'), `${classId} contains Tier IV tab button`);
  assert.ok(html.includes('IV · '), `${classId} tab button labeled with Roman numeral IV`);

  // Assert hybrid banner contains crest, title, and lineage
  assert.ok(html.includes('class="ro-hybrid-banner"'), `${classId} contains ro-hybrid-banner`);
  assert.ok(html.includes(expected.hybridName), `${classId} banner contains hybrid title ${expected.hybridName}`);
  assert.ok(html.includes(`data-skill="${expected.skillId}"`), `${classId} contains signature skill card for ${expected.skillId}`);

  // At baseline Lv 1, the hybrid skill cannot be learned yet
  assert.equal(A.canLearn(p, expected.skillId), false, `${classId} cannot learn ${expected.skillId} before promotion`);
}

// Test 2: Full progression, Lv 70 promotion, hybrid skill learning, and hotbar assignment
{
  const p = A.makePlayer('shadow_blade', 'MasterAssassin');
  G.player = p;
  p.level = 70;
  p.jobLevel = 70;
  p.skillPoints = 15;
  p.tierIndex = 2;
  p.jobBranchId = 'nightstalker';
  p.advancedJobId = 'shadow_sovereign';

  // Advance to Tier 3 (Tier IV Hybrid Calling)
  A.doPromote(p, 3);
  assert.equal(p.tierIndex, 3, 'player is now Tier 3 (Tier IV)');
  assert.equal(p.hybridJobId, 'nightblade_phantom', 'player hybridJobId set to nightblade_phantom');

  // Open Chapter IV
  G._skillTab = 3;
  let html = A.skillsPanelHtml(p);
  assert.ok(html.includes('class="ro-job-lane unlocked" data-tier="3">'), 'Chapter IV is unlocked');
  assert.ok(html.includes('data-skill="eclipse_strike"'), 'eclipse_strike card rendered');

  // Verify canLearn is now true
  assert.equal(A.canLearn(p, 'eclipse_strike'), true, 'eclipse_strike can now be learned');

  // Select skill in UI detail strip
  G._skillSel = 'eclipse_strike';
  html = A.skillsPanelHtml(p);
  assert.ok(html.includes('data-learn="eclipse_strike"'), 'detail strip offers Learn for eclipse_strike');

  // Learn skill
  const pointsBefore = p.skillPoints;
  A.learnSkill('eclipse_strike');
  assert.equal(A.skillLevel(p, 'eclipse_strike'), 1, 'eclipse_strike level raised to 1');
  assert.equal(p.skillPoints, pointsBefore - 1, 'consumed 1 skill point');

  // Detail strip now offers → Bar assignment
  html = A.skillsPanelHtml(p);
  assert.ok(html.includes('data-assign-skill="eclipse_strike"'), 'detail strip offers hotbar assignment');

  // Assign to hotbar slot 0 and verify
  A.assignSkillHotbar('eclipse_strike', 0);
  assert.equal(p.hotbar[0]?.id, 'eclipse_strike', 'hotbar slot 0 has eclipse_strike');

  // Execute skill via castSkillById
  p.momentum = 50;
  p.target = { id: 'dummy_target', hp: 1000, maxHp: 1000, def: 10, stats: {} };
  A.castSkillById('eclipse_strike');
  assert.ok(p.skillCd['eclipse_strike'] > 0, 'eclipse_strike triggered cooldown on cast');
}

// Test 3: Soul Binder / Necromancer Hybrid UI verification
{
  const p = A.makePlayer('soul_binder', 'EldritchMaster');
  G.player = p;
  p.level = 70;
  p.jobLevel = 70;
  p.skillPoints = 10;
  p.tierIndex = 2;
  p.jobBranchId = 'dread_summoner';
  p.advancedJobId = 'abyssal_lich';

  A.doPromote(p, 3);
  assert.equal(p.hybridJobId, 'eldritch_lord');

  G._skillTab = 3;
  G._skillSel = 'apocalypse_harvest';
  let html = A.skillsPanelHtml(p);
  assert.ok(html.includes('Eldritch Netherlord'), 'renders Eldritch Netherlord title');
  assert.ok(html.includes('data-learn="apocalypse_harvest"'), 'detail strip offers Learn for apocalypse_harvest');

  A.learnSkill('apocalypse_harvest');
  assert.equal(A.skillLevel(p, 'apocalypse_harvest'), 1);
  assert.ok(A.skillsPanelHtml(p).includes('data-assign-skill="apocalypse_harvest"'));
}

// Test 4: Artificer Hybrid UI verification
{
  const p = A.makePlayer('artificer', 'TechnomancerMaster');
  G.player = p;
  p.level = 70;
  p.jobLevel = 70;
  p.skillPoints = 10;
  p.tierIndex = 2;
  p.jobBranchId = 'clockwork_engineer';
  p.advancedJobId = 'magitek_mechlord';

  A.doPromote(p, 3);
  assert.equal(p.hybridJobId, 'quantum_technomancer');

  G._skillTab = 3;
  G._skillSel = 'orbital_strike_beacon';
  let html = A.skillsPanelHtml(p);
  assert.ok(html.includes('Quantum Technomancer'), 'renders Quantum Technomancer title');
  assert.ok(html.includes('data-learn="orbital_strike_beacon"'), 'detail strip offers Learn for orbital_strike_beacon');

  A.learnSkill('orbital_strike_beacon');
  assert.equal(A.skillLevel(p, 'orbital_strike_beacon'), 1);
  assert.ok(A.skillsPanelHtml(p).includes('data-assign-skill="orbital_strike_beacon"'));
}

console.log('Skill tree Tier IV tests passed.');
