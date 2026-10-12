import assert from 'node:assert/strict';
import test from 'node:test';
import { PROGRESSION } from './progression.js';
import { COMBAT } from './combat.js';

test('hybrid job matrix contains all 6 archetypes with valid skills', () => {
  const expectedHybrids = [
    'spellblade',
    'vanguard',
    'arcane_archer',
    'dreadnought',
    'storm_templar',
    'chi_tempest'
  ];

  const allTiers = Object.values(PROGRESSION.tiers).flat();

  for (const id of expectedHybrids) {
    const hybrid = PROGRESSION.hybridJobs[id];
    assert.ok(hybrid, `Hybrid ${id} must exist in PROGRESSION.hybridJobs`);
    assert.ok(hybrid.requires && hybrid.requires.length === 2, `Hybrid ${id} must have 2 requirement callings`);
    assert.ok(hybrid.bonus, `Hybrid ${id} must define stat bonus`);
    assert.ok(hybrid.signatureSkillId, `Hybrid ${id} must define signatureSkillId`);

    const skill = (COMBAT.skills.find ? COMBAT.skills.find(s => s.id === hybrid.signatureSkillId) : null) || COMBAT.skills[hybrid.signatureSkillId];
    assert.ok(skill, `Signature skill ${hybrid.signatureSkillId} must exist in COMBAT.skills`);

    const treeNode = PROGRESSION.skillTree[hybrid.signatureSkillId];
    assert.ok(treeNode, `Skill tree node for ${hybrid.signatureSkillId} must exist`);
    assert.equal(treeNode.maxLevel, 3, `Skill ${hybrid.signatureSkillId} maxLevel must be 3`);
    assert.equal(treeNode.reqLevel, 55, `Skill ${hybrid.signatureSkillId} reqLevel must be 55`);
    assert.equal(treeNode.reqTier, 3, `Skill ${hybrid.signatureSkillId} reqTier must be 3`);
    assert.equal(treeNode.reqHybridJob, id, `Skill ${hybrid.signatureSkillId} reqHybridJob must be ${id}`);

    const tierEntry = allTiers.find(t => t.isHybrid && t.name === `Hybrid: ${hybrid.name}`);
    assert.ok(tierEntry, `Hybrid ${id} (${hybrid.name}) must be referenced in PROGRESSION.tiers with isHybrid: true`);
  }
});
