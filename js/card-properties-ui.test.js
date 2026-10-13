// js/card-properties-ui.test.js
// Acceptance test suite for Card and Gem properties display, equipment socket list,
// socket picker stat preview, and English/Thai localization parity.

import test from 'node:test';
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

await import('./game.js');
const { setLanguage, currentLang } = await import('./locale.js');
const A = globalThis.__AWO;

test('Card properties display in Satchel bag-detail', () => {
  setLanguage('en');
  const p = A.makePlayer('reborn_blade', 'CardInspector');
  A.G.player = p;
  A.addItem('card_wolf', 1);
  A.addItem('card_slime', 1);

  // Select card_wolf
  A.G._bagSel = 'icard_wolf';
  const wolfHtml = A.panelBody('inv');
  assert.ok(wolfHtml.includes('card-properties-box'), 'Wolf card displays card-properties-box');
  assert.ok(wolfHtml.includes('Fits: Weapon'), 'Wolf card displays target slot Fits: Weapon');
  assert.ok(wolfHtml.includes('+8 ATK, +4% Crit'), 'Wolf card displays +8 ATK, +4% Crit socket bonus');
  assert.ok(wolfHtml.includes('+8 ATK, +4% Crit Chance'), 'Wolf card displays collection bonus');

  // Select card_slime
  A.G._bagSel = 'icard_slime';
  const slimeHtml = A.panelBody('inv');
  assert.ok(slimeHtml.includes('card-properties-box'), 'Slime card displays card-properties-box');
  assert.ok(slimeHtml.includes('Fits: Armor'), 'Slime card displays target slot Fits: Armor');
  assert.ok(slimeHtml.includes('+60 Max HP'), 'Slime card displays +60 Max HP');
});

test('Gem & Rune properties display in Satchel bag-detail', () => {
  setLanguage('en');
  const p = A.makePlayer('reborn_blade', 'GemInspector');
  A.G.player = p;
  A.addItem('ruby_shard', 1);
  A.addItem('rune_ember', 1);

  // Select ruby_shard
  A.G._bagSel = 'iruby_shard';
  const rubyHtml = A.panelBody('inv');
  assert.ok(rubyHtml.includes('gem-properties-box'), 'Ruby shard displays gem-properties-box');
  assert.ok(rubyHtml.includes('+4% ATK'), 'Ruby shard displays +4% ATK socket bonus');
  assert.ok(rubyHtml.includes('Set Bonus: +50%'), 'Ruby shard notes +50% Set Bonus');

  // Select rune_ember
  A.G._bagSel = 'irune_ember';
  const runeHtml = A.panelBody('inv');
  assert.ok(runeHtml.includes('gem-properties-box'), 'Ember rune displays gem-properties-box');
  assert.ok(runeHtml.includes('Weapon Infusion'), 'Ember rune displays Weapon Infusion');
  assert.ok(runeHtml.includes('+15% Fire DMG'), 'Ember rune displays +15% Fire DMG');
  assert.ok(runeHtml.includes('Armor Warding'), 'Ember rune displays Armor Warding');
  assert.ok(runeHtml.includes('+12% Fire Res, +25 Max HP'), 'Ember rune displays +12% Fire Res, +25 Max HP');
});

test('Equipment displays socketed card and gem breakdown and set bonus', () => {
  setLanguage('en');
  const p = A.makePlayer('reborn_blade', 'GearInspector');
  A.G.player = p;

  const weapon = A.rollItem('iron_sword', 0, 'legendary');
  weapon.sockets = ['card_wolf', 'ruby_shard', null];
  weapon.affixes = [];
  p.inventory.push(weapon);

  A.G._bagSel = 'u' + weapon.uid;
  const gearHtml = A.panelBody('inv');
  assert.ok(gearHtml.includes('gear-sockets-list'), 'Weapon displays gear-sockets-list');
  assert.ok(gearHtml.includes('Sockets (2/3)'), 'Weapon indicates 2/3 sockets filled');
  assert.ok(gearHtml.includes('Dire Wolf Card'), 'Weapon lists Dire Wolf Card');
  assert.ok(gearHtml.includes('+8 ATK, +4% Crit'), 'Weapon shows Dire Wolf stats');
  assert.ok(gearHtml.includes('Ruby Shard'), 'Weapon lists Ruby Shard');
  assert.ok(gearHtml.includes('+4% ATK'), 'Weapon shows Ruby Shard stats');
  assert.ok(gearHtml.includes('Empty socket'), 'Weapon lists Empty socket');

  // Set bonus with 3 identical ruby shards
  const armor = A.rollItem('guardian_plate', 0, 'legendary');
  armor.sockets = ['ruby_shard', 'ruby_shard', 'ruby_shard'];
  armor.affixes = [];
  p.inventory.push(armor);

  A.G._bagSel = 'u' + armor.uid;
  const armorHtml = A.panelBody('inv');
  assert.ok(armorHtml.includes('Set Bonus'), 'Armor with 3 ruby shards displays Set Bonus');
  assert.ok(armorHtml.includes('+50% Gem stats (+2% ATK)'), 'Armor displays exact +50% set bonus calculation');
});

test('Socket picker candidate buttons display stat preview', () => {
  setLanguage('en');
  const p = A.makePlayer('reborn_blade', 'PickerTester');
  A.G.player = p;

  const weapon = A.rollItem('iron_sword', 0, 'legendary');
  weapon.sockets = [null, null];
  weapon.affixes = [];
  p.inventory.push(weapon);
  A.equip(weapon.uid);

  A.addItem('card_wolf', 1);
  A.addItem('ruby_shard', 1);

  // Open socket picker for socket 0
  A.G._socketFor = weapon.uid + ':0';
  const dollHtml = A.panelBody('char');
  assert.ok(dollHtml.includes('socket-picker-row'), 'Paper doll renders socket picker row');
  assert.ok(dollHtml.includes('data-socket-put="card_wolf"'), 'Candidate button exists for card_wolf');
  assert.ok(dollHtml.includes('+8 ATK, +4% Crit'), 'Candidate button previews wolf card stats');
  assert.ok(dollHtml.includes('data-socket-put="ruby_shard"'), 'Candidate button exists for ruby_shard');
  assert.ok(dollHtml.includes('+4% ATK'), 'Candidate button previews ruby shard stats');

  // Close socket picker
  A.G._socketFor = null;
});

test('Card and Gem properties render in Thai without regressions', () => {
  setLanguage('th');
  const p = A.makePlayer('reborn_blade', 'ThaiInspector');
  A.G.player = p;
  A.addItem('card_wolf', 1);
  A.addItem('ruby_shard', 1);

  A.G._bagSel = 'icard_wolf';
  const wolfTh = A.panelBody('inv');
  assert.ok(wolfTh.includes('ช่องอาวุธ'), 'Thai translation for Fits: Weapon appears');
  assert.ok(wolfTh.includes('โบนัสเมื่อใส่'), 'Thai translation for Socket Bonus appears');
  assert.ok(wolfTh.includes('โบนัสสะสมสมุดภาพ'), 'Thai translation for Codex Collection Bonus appears');

  A.G._bagSel = 'iruby_shard';
  const rubyTh = A.panelBody('inv');
  assert.ok(rubyTh.includes('ใส่ได้ทุกช่องอุปกรณ์'), 'Thai translation for Fits: Any Gear Slot appears');
  assert.ok(rubyTh.includes('โบนัสเซ็ต'), 'Thai translation for Set Bonus appears');

  setLanguage('en');
});
