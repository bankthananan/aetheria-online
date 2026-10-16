import assert from 'node:assert/strict';
import test from 'node:test';
import {
  EQUIPMENT_SETS,
  getEquipmentSetFor,
  getActiveSetBonuses,
  formatSetBonusText,
} from './systems/equipment-sets.js';

test('EQUIPMENT_SETS defines 8 regional sets across Bands 2-5', () => {
  const expectedSets = [
    'set_duneslayer',
    'set_sunwalker',
    'set_sporeweaver',
    'set_mire_stalker',
    'set_thunderlord',
    'set_gale_dancer',
    'set_umbral_assassin',
    'set_darksteel_bulwark'
  ];

  for (const setId of expectedSets) {
    const setDef = EQUIPMENT_SETS[setId];
    assert.ok(setDef, `Missing set definition for ${setId}`);
    assert.ok(Array.isArray(setDef.pieces) && setDef.pieces.length >= 2, `${setId} needs at least 2 pieces`);
    assert.ok(setDef.name, `${setId} missing name`);
    assert.ok(setDef.bonuses[2], `${setId} needs 2-piece bonus`);
    assert.ok(setDef.bonuses[2].statMods, `${setId} 2-piece bonus needs statMods`);
  }
});

test('getEquipmentSetFor correctly maps items to their respective sets', () => {
  assert.equal(getEquipmentSetFor('duneslayer_vest')?.id, 'set_duneslayer');
  assert.equal(getEquipmentSetFor('sporeweaver_robe')?.id, 'set_sporeweaver');
  assert.equal(getEquipmentSetFor('thunderlord_chainmail')?.id, 'set_thunderlord');
  assert.equal(getEquipmentSetFor('darksteel_bulwark')?.id, 'set_darksteel_bulwark');
  assert.equal(getEquipmentSetFor('wooden_sword'), null, 'Common unassigned gear has no set');
});

test('getActiveSetBonuses aggregates stats and counts for equipped items', () => {
  const mockEquipment = {
    body: { itemId: 'duneslayer_vest' },
    hands: { itemId: 'shadow_leathers' },
    feet: { itemId: 'darksteel_bulwark' }
  };

  const active = getActiveSetBonuses(mockEquipment);
  assert.ok(Array.isArray(active.activeSets), 'Must return activeSets array');
  assert.equal(active.activeSets.length, 1, 'Only Duneslayer has 2 pieces equipped');
  assert.equal(active.activeSets[0].id, 'set_duneslayer');
  assert.equal(active.activeSets[0].count, 2);
  assert.ok((active.statMods.flee || 0) > 0, 'Duneslayer grants flee');
});

test('formatSetBonusText describes stat increases', () => {
  const text = formatSetBonusText({ flee: 15, critChance: 4 });
  assert.ok(text.includes('+15 Flee') || text.includes('15 Flee'));
  assert.ok(text.includes('Crit'));
});
