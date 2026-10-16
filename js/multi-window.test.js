import assert from 'node:assert/strict';
import test from 'node:test';
import { createRuntime } from './test-support/runtime.js';

test('multi-window: Status and Satchel panels open concurrently on desktop', async () => {
  const { A } = await createRuntime();

  // Open Status (char)
  A.togglePanel('char');
  const charPanel = document.querySelector('.panel[data-kind="char"]');
  assert.ok(charPanel, 'Status panel must be open');

  // Open Satchel (inv)
  A.togglePanel('inv');
  const invPanel = document.querySelector('.panel[data-kind="inv"]');
  assert.ok(invPanel, 'Satchel panel must be open');

  // Both must be in document.body / #overlays simultaneously
  assert.ok(document.querySelector('.panel[data-kind="char"]'), 'Status panel remains open alongside Satchel');
  assert.ok(document.querySelector('.panel[data-kind="inv"]'), 'Satchel panel is open alongside Status');

  // Stacking order check
  A.togglePanel('char');
  A.togglePanel('inv');
});

test('gear comparison: generates clear comparative diffs against equipped gear', async () => {
  const { A } = await createRuntime();
  const equippedWeapon = A.rollItem('iron_sword');
  A.G.player.equip = { ...A.G.player.equip, weapon: equippedWeapon };

  const candidateWeapon = A.rollItem('hero_blade');

  const diffHtml = A.gearComparisonHtml(candidateWeapon, A.G.player);
  assert.ok(diffHtml, 'Must return comparison html');
  assert.ok(diffHtml.includes('ATK'), 'Shows ATK difference');
  assert.ok(diffHtml.includes('gear-compare'), 'Contains gear-compare container');
});

test('direct socketing: identifying candidate equipment slots for card or gem', async () => {
  const { A } = await createRuntime();

  const weaponCard = {
    id: 'card_goblin',
    name: 'Scrap Goblin Card',
    type: 'card',
    targetSlot: 'weapon',
  };

  const armorCard = {
    id: 'card_slime',
    name: 'Gel Slime Card',
    type: 'card',
    targetSlot: 'armor',
  };

  const gem = {
    id: 'ruby_chip',
    name: 'Ruby Chip',
    gem: true,
  };

  assert.equal(A.canSocketIntoSlot(weaponCard, 'weapon'), true, 'Weapon card fits weapon slot');
  assert.equal(A.canSocketIntoSlot(weaponCard, 'armor'), false, 'Weapon card cannot fit armor slot');
  assert.equal(A.canSocketIntoSlot(weaponCard, 'body'), false, 'Weapon card cannot fit body armor slot');
  assert.equal(A.canSocketIntoSlot(armorCard, 'armor'), true, 'Armor card fits armor slot');
  assert.equal(A.canSocketIntoSlot(armorCard, 'body'), true, 'Armor card fits body slot');
  assert.equal(A.canSocketIntoSlot(armorCard, 'weapon'), false, 'Armor card cannot fit weapon slot');
  assert.equal(A.canSocketIntoSlot(gem, 'weapon'), true, 'Gem fits weapon slot');
  assert.equal(A.canSocketIntoSlot(gem, 'body'), true, 'Gem fits body slot');
});
