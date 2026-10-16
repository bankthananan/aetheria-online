import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MYTHIC_ENCHANTS,
  canEnchantItem,
  applyMythicEnchant,
  getEnchantBonus,
} from './systems/enchanting.js';

test('MYTHIC_ENCHANTS catalog contains boss catalyst enchantments', () => {
  const catalysts = ['kernel_core', 'colossus_plating', 'voidstone_ore'];

  for (const catId of catalysts) {
    const enchant = MYTHIC_ENCHANTS[catId];
    assert.ok(enchant, `Missing mythic enchant definition for catalyst ${catId}`);
    assert.ok(enchant.name, `Missing name for ${catId} enchant`);
    assert.ok(enchant.statMods, `Missing statMods for ${catId} enchant`);
    assert.ok(enchant.costZeny > 0, `Catalyst ${catId} needs zeny cost`);
  }
});

test('canEnchantItem validates item suitability and catalyst', () => {
  const validWeapon = { uid: 101, itemId: 'hero_blade', type: 'weapon' };
  const commonMaterial = { id: 'wood', type: 'material' };

  assert.equal(canEnchantItem(validWeapon, 'kernel_core').ok, true, 'Valid weapon can receive kernel_core');
  assert.equal(canEnchantItem(commonMaterial, 'kernel_core').ok, false, 'Non-equip cannot be enchanted');
  assert.equal(canEnchantItem(validWeapon, 'invalid_catalyst').ok, false, 'Invalid catalyst rejected');
});

test('applyMythicEnchant adds mythic enchant affix to gear instance', () => {
  const weapon = { uid: 101, itemId: 'hero_blade', type: 'weapon', atk: 22 };
  const enchanted = applyMythicEnchant(weapon, 'kernel_core');

  assert.ok(enchanted.mythicEnchant, 'Must contain mythicEnchant object');
  assert.equal(enchanted.mythicEnchant.catalystId, 'kernel_core');
  assert.equal(enchanted.mythicEnchant.name, "Architect's Insight");

  const bonuses = getEnchantBonus(enchanted);
  assert.equal(bonuses.allStats, 15, 'Grants +15 all stats');
  assert.equal(bonuses.cdrPct, 10, 'Grants +10% CDR');
});

test('infuseMythicItem runtime integration consumes catalyst and increases player stats', async () => {
  const { createRuntime } = await import('./test-support/runtime.js');
  const { A } = await createRuntime();
  const p = A.G.player;
  p.zeny = 50000;
  A.addItem('kernel_core', 1);
  assert.equal(A.itemQty('kernel_core'), 1);

  const weapon = A.rollItem('iron_sword', 0, 'rare');
  p.equip.weapon = weapon;
  A.recompute(p);
  const baseAtk = p.physAtk;

  const success = A.infuseMythicItem('weapon', 'kernel_core');
  assert.equal(success, true, 'Infusion must succeed');
  assert.equal(A.itemQty('kernel_core'), 0, 'Catalyst should be consumed');
  assert.equal(weapon.mythicEnchant?.catalystId, 'kernel_core');
  assert.ok(p.physAtk > baseAtk, 'STR from allStats must increase ATK');
});

