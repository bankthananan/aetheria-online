// js/new-classes-craft-loot.test.js
// Verification suite for New Classes Blacksmith Crafting, Starter Kits & Loot Ecology.

import test from 'node:test';
import assert from 'node:assert/strict';
import { installBrowserEnv } from './test-support/browser-env.js';

let vnow = 1000;
installBrowserEnv({ now: () => vnow, innerWidth: 1440, innerHeight: 900, nullSelectors: [], strictIds: false });

const { CONTENT } = await import('./content.js');
await import('./game.js');
const A = globalThis.__AWO;

test('All 27 new class weapons and armors have valid blacksmith crafting recipes', () => {
  const expectedItems = [
    // Weapons Band 1-5
    'iron_dagger', 'shadow_kris', 'nightstalker_stiletto', 'abyssal_fang', 'eclipse_edge',
    'bone_wand', 'soul_binder_staff', 'bone_scythe', 'nether_grimoire', 'abyssal_harvester',
    'heavy_wrench', 'steam_pistol', 'magitek_driver', 'mortar_cannon', 'clockwork_obliteration_engine',
    // Armors Band 2-5
    'shadow_leathers', 'acolyte_robes', 'tinkerer_smock',
    'nightstalker_tunic', 'bone_woven_vestments', 'engineer_overalls',
    'phantom_garb', 'lich_mantle', 'magitek_harness',
    'void_assassin_vestments', 'netherlord_regalia', 'mechlord_power_chassis'
  ];

  for (const itemId of expectedItems) {
    const r = CONTENT.recipes.find(x => x.out === itemId);
    assert.ok(r, `Recipe for ${itemId} exists in CONTENT.recipes`);
    assert.ok(r.cost > 0, `Recipe ${r.id} has positive zeny cost`);
    assert.ok(Array.isArray(r.mats) && r.mats.length > 0, `Recipe ${r.id} requires materials`);
    for (const m of r.mats) {
      const matDef = CONTENT.items.find(i => i.id === m.itemId);
      assert.ok(matDef, `Material ${m.itemId} exists in CONTENT.items`);
      assert.ok(m.qty > 0, `Material quantity is positive for ${m.itemId}`);
    }

    // No zeny minting: cost + mat resale >= output resale
    const outItem = CONTENT.items.find(i => i.id === itemId);
    const matsResale = r.mats.reduce((sum, m) => {
      const it = CONTENT.items.find(i => i.id === m.itemId);
      return sum + Math.floor((it.value || 0) * 0.4) * m.qty;
    }, 0);
    const outResale = Math.floor((outItem.value || 0) * 0.4);
    assert.ok(r.cost + matsResale >= outResale, `Recipe ${r.id} does not mint zeny (cost ${r.cost} + mats ${matsResale} >= out ${outResale})`);
  }
});

test('craftItem successfully consumes materials and produces equipment instance in player inventory', () => {
  const p = A.makePlayer('shadow_blade', 'Crafter');
  A.G.player = p;
  p.zeny = 1000;
  p.inventory = [
    { itemId: 'copper_ore', qty: 5 },
    { itemId: 'wolf_fang', qty: 5 }
  ];

  const recipe = CONTENT.recipes.find(r => r.out === 'iron_dagger');
  assert.ok(recipe, 'iron_dagger recipe found');

  A.craftItem(recipe.id);

  assert.equal(p.zeny, 1000 - recipe.cost, 'Zeny deducted properly');
  const copper = p.inventory.find(i => !i.uid && i.itemId === 'copper_ore');
  assert.equal(copper?.qty, 3, 'Copper ore stack consumed by 2 (5 - 2 = 3)');
  const daggerInst = p.inventory.find(i => i.uid && i.itemId === 'iron_dagger');
  assert.ok(daggerInst, 'Crafted iron_dagger instance created in inventory');
  assert.ok(daggerInst.uid, 'Has unique instance uid');
  assert.equal(CONTENT.items.find(i => i.id === daggerInst.itemId)?.type, 'weapon');
});

test('Starter kits, calling quest rewards, and trader inventory include starter weapons', () => {
  // makePlayer provides starter weapon for new classes
  const sb = A.makePlayer('shadow_blade', 'S');
  const nec = A.makePlayer('soul_binder', 'N');
  const art = A.makePlayer('artificer', 'A');

  assert.ok(sb.inventory.some(i => i.itemId === 'iron_dagger'), 'Shadow blade starts with iron_dagger');
  assert.ok(nec.inventory.some(i => i.itemId === 'bone_wand'), 'Soul binder starts with bone_wand');
  assert.ok(art.inventory.some(i => i.itemId === 'heavy_wrench'), 'Artificer starts with heavy_wrench');

  // Calling quest rewards contain starter weapons
  const qSb = CONTENT.quests.find(q => q.id === 'q_calling_shadow_blade');
  const qNec = CONTENT.quests.find(q => q.id === 'q_calling_soul_binder');
  const qArt = CONTENT.quests.find(q => q.id === 'q_calling_artificer');
  assert.ok(qSb.rewards.items.includes('iron_dagger'), 'Calling quest rewards iron_dagger');
  assert.ok(qNec.rewards.items.includes('bone_wand'), 'Calling quest rewards bone_wand');
  assert.ok(qArt.rewards.items.includes('heavy_wrench'), 'Calling quest rewards heavy_wrench');

  // Marla the Trader stocks starter weapons
  const merchant = CONTENT.npcs.find(n => n.id === 'merchant');
  assert.ok(merchant.shopItems.includes('iron_dagger'), 'Trader sells iron_dagger');
  assert.ok(merchant.shopItems.includes('bone_wand'), 'Trader sells bone_wand');
  assert.ok(merchant.shopItems.includes('heavy_wrench'), 'Trader sells heavy_wrench');
});
