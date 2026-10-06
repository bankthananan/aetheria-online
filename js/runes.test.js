// js/runes.test.js
// Unit tests for the Elemental Rune Socketing & Socket Expansion Subsystem.
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createRuneSystem,
  RUNE_CATALOG,
  EXPANSION_COSTS,
} from './systems/runes.js';

test('Rune Subsystem: Catalog defines 6 primal elements and attributes', () => {
  const expectedElements = ['fire', 'ice', 'lightning', 'nature', 'holy', 'void'];
  const keys = Object.keys(RUNE_CATALOG);
  assert.equal(keys.length, 6, 'Must define exactly 6 primal runes');

  for (const el of expectedElements) {
    const runeKey = `rune_${el === 'fire' ? 'ember' : el === 'ice' ? 'glacial' : el === 'lightning' ? 'storm' : el === 'nature' ? 'verdant' : el === 'holy' ? 'luminous' : 'umbral'}`;
    const rune = RUNE_CATALOG[runeKey];
    assert.ok(rune, `Rune catalog contains ${runeKey}`);
    assert.equal(rune.element, el, `Rune has correct element ${el}`);
    assert.ok(rune.weaponDmgPct > 0, 'Rune grants weapon damage percentage');
    assert.ok(rune.resPct > 0, 'Rune grants resistance percentage');
    assert.ok(rune.color, 'Rune defines a UI hex color');
  }
});

test('Rune Subsystem: Socket expansion cost tiers and 4-socket hard cap', () => {
  const runes = createRuneSystem();

  // Tier 1: 0 -> 1 socket
  const cost0 = runes.getSocketExpansionCost(0);
  assert.ok(cost0, '0 sockets has expansion cost');
  assert.equal(cost0.zeny, 1500);
  assert.ok(cost0.materials.some(m => m.id === 'wolf_fang'));

  // Tier 2: 1 -> 2 sockets
  const cost1 = runes.getSocketExpansionCost(1);
  assert.equal(cost1.zeny, 3500);
  assert.ok(cost1.materials.some(m => m.id === 'star_iron'));

  // Tier 3: 2 -> 3 sockets
  const cost2 = runes.getSocketExpansionCost(2);
  assert.equal(cost2.zeny, 7500);
  assert.ok(cost2.materials.some(m => m.id === 'blessed_ore'));

  // Tier 4: 3 -> 4 sockets
  const cost3 = runes.getSocketExpansionCost(3);
  assert.equal(cost3.zeny, 7500);
  assert.ok(cost3.materials.some(m => m.id === 'blessed_ore'));

  // Tier 5: 4 sockets (capped)
  const cost4 = runes.getSocketExpansionCost(4);
  assert.equal(cost4, null, 'Items with 4 sockets cannot be expanded further');
  const cost5 = runes.getSocketExpansionCost(5);
  assert.equal(cost5, null, 'Items with 5+ sockets cannot be expanded further');
});

test('Rune Subsystem: Socket expansion execution adds empty socket and consumes resources', () => {
  const runes = createRuneSystem();
  const inst = { uid: 101, itemId: 'hero_blade', sockets: [] };
  let zeny = 5000;
  const inventory = [{ itemId: 'wolf_fang', qty: 10 }];
  const removed = [];

  const removeItem = (id, count) => {
    removed.push({ id, count });
    const slot = inventory.find(it => it.itemId === id);
    if (slot) slot.qty -= count;
  };

  const result = runes.expandSockets({
    inst,
    zeny,
    inventory,
    deductZeny: amt => { zeny -= amt; },
    removeItem: removeItem,
  });

  assert.equal(result.success, true, 'Socket expansion succeeds');
  assert.equal(inst.sockets.length, 1, 'Socket array expanded to 1');
  assert.equal(inst.sockets[0], null, 'New socket is empty (null)');
  assert.equal(zeny, 3500, 'Zeny deducted by 1500');
  assert.equal(removed[0].id, 'wolf_fang');
  assert.equal(removed[0].count, 5);
});

test('Rune Subsystem: Weapon rune element detection', () => {
  const runes = createRuneSystem();
  const mockItemDb = {
    rune_storm: { id: 'rune_storm', gem: { isRune: true, element: 'lightning' } },
    ruby_shard: { id: 'ruby_shard', gem: { stat: 'atkPct', value: 4 } },
  };

  // No sockets
  assert.equal(runes.getWeaponRuneElement({ sockets: [] }, mockItemDb), null);

  // Traditional stat gem only
  assert.equal(runes.getWeaponRuneElement({ sockets: ['ruby_shard'] }, mockItemDb), null);

  // Storm rune in first socket
  assert.equal(runes.getWeaponRuneElement({ sockets: ['rune_storm'] }, mockItemDb), 'lightning');

  // Storm rune in second socket
  assert.equal(runes.getWeaponRuneElement({ sockets: ['ruby_shard', 'rune_storm'] }, mockItemDb), 'lightning');
});

test('Rune Subsystem: Armor & accessory warding stat modifiers', () => {
  const runes = createRuneSystem();
  const mockItemDb = {
    rune_ember: { id: 'rune_ember', gem: { isRune: true, element: 'fire', hpFlat: 25, resPct: 12 } },
    rune_glacial: { id: 'rune_glacial', gem: { isRune: true, element: 'ice', defFlat: 8, resPct: 12 } },
  };

  const equip = {
    body: { sockets: ['rune_ember'] },
    cloak: { sockets: ['rune_glacial'] },
    weapon: { sockets: ['rune_ember'] }, // Weapon rune is infusion, not defensive warding
  };

  const mods = runes.getRuneCombatModifiers(equip, mockItemDb);
  assert.equal(mods.fireRes, 12, 'Body grants 12% Fire Resistance');
  assert.equal(mods.iceRes, 12, 'Cloak grants 12% Ice Resistance');
  assert.equal(mods.hpFlat, 25, 'Body grants +25 HP');
  assert.equal(mods.defFlat, 8, 'Cloak grants +8 DEF');
});
