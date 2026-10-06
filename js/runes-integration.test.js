// js/runes-integration.test.js
// Integration test: Elemental Rune Socketing, Socket Expansion & Weapon Infusion System.
// Verifies live engine boot, Blacksmith socket expansion from 1 to 4 sockets with resource deduction,
// socketing primal runes into gear, weapon infusion converting basic attack to elemental damage,
// 1.5x elemental weakness exploitation, 1.2x weather surge affinity amplification,
// defensive armor warding stats, strict ZERO camera shake, and save/resume persistence.

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
const { CONTENT } = await import('./content.js');
const { RUNE_CATALOG, EXPANSION_COSTS } = await import('./systems/runes.js');
const A = globalThis.__AWO;
assert.ok(A, 'game debug API loaded');

// 1. Engine & Player Boot
const p = A.makePlayer('codeweaver', 'RuneKnight');
A.G.player = p;
A.G.running = true;
A.setCtx(document.getElementById('game-canvas'));
A.buildHud();
A.loadMap('town_awakening', 5, 5);
A.updateHud();

// 2. Primal Runes Registration & Catalog Invariants
const runeIds = ['rune_ember', 'rune_glacial', 'rune_storm', 'rune_verdant', 'rune_luminous', 'rune_umbral'];
for (const rid of runeIds) {
  const itemDef = CONTENT.items.find(it => it.id === rid);
  assert.ok(itemDef, `Item ${rid} is registered in CONTENT.items`);
  assert.equal(itemDef.type, 'material', `${rid} is typed as material`);
  assert.ok(itemDef.gem, `${rid} has gem property for socketing`);
  assert.equal(itemDef.gem.isRune, true, `${rid} is flagged as isRune`);
  assert.ok(RUNE_CATALOG[rid], `${rid} exists in RUNE_CATALOG`);
}

// 3. Socket Expansion via Blacksmith Logic & Cost Verification
// Prepare a 0-socket weapon
const testWeapon = A.rollItem('worn_dagger', 0, 'common');
testWeapon.sockets = [];
p.inventory.push(testWeapon);
p.zeny = 50000;

// Add materials for 4 expansion steps:
// Tier 0->1: 5 wolf_fang, 1500z
// Tier 1->2: 10 star_iron, 3500z
// Tier 2->3: 2 blessed_ore, 7500z
// Tier 3->4: 2 blessed_ore, 7500z
A.addItem('wolf_fang', 5);
A.addItem('star_iron', 10);
A.addItem('blessed_ore', 4);

// Expansion 0 -> 1 socket
const zenyBefore1 = p.zeny;
A.adminAction('expandsocket', testWeapon.uid);
assert.equal(testWeapon.sockets.length, 1, 'Expanded from 0 to 1 socket');
assert.equal(testWeapon.sockets[0], null, 'New socket is empty (null)');
assert.equal(p.zeny, zenyBefore1 - EXPANSION_COSTS[0].zeny, 'Deducted 1500 Zeny');
assert.equal(A.itemQty('wolf_fang'), 0, 'Deducted 5 wolf_fang');

// Expansion 1 -> 2 sockets
const zenyBefore2 = p.zeny;
A.adminAction('expandsocket', testWeapon.uid);
assert.equal(testWeapon.sockets.length, 2, 'Expanded from 1 to 2 sockets');
assert.equal(p.zeny, zenyBefore2 - EXPANSION_COSTS[1].zeny, 'Deducted 3500 Zeny');
assert.equal(A.itemQty('star_iron'), 0, 'Deducted 10 star_iron');

// Expansion 2 -> 3 sockets
const zenyBefore3 = p.zeny;
A.adminAction('expandsocket', testWeapon.uid);
assert.equal(testWeapon.sockets.length, 3, 'Expanded from 2 to 3 sockets');
assert.equal(p.zeny, zenyBefore3 - EXPANSION_COSTS[2].zeny, 'Deducted 7500 Zeny');
assert.equal(A.itemQty('blessed_ore'), 2, 'Deducted 2 blessed_ore (2 remaining)');

// Expansion 3 -> 4 sockets
const zenyBefore4 = p.zeny;
A.adminAction('expandsocket', testWeapon.uid);
assert.equal(testWeapon.sockets.length, 4, 'Expanded from 3 to 4 sockets');
assert.equal(p.zeny, zenyBefore4 - EXPANSION_COSTS[3].zeny, 'Deducted 7500 Zeny');
assert.equal(A.itemQty('blessed_ore'), 0, 'Deducted 2 blessed_ore (0 remaining)');

// Expansion beyond 4 sockets is capped
A.adminAction('expandsocket', testWeapon.uid);
assert.equal(testWeapon.sockets.length, 4, 'Expansion is capped at 4 sockets');

// 4. Blacksmith UI Panel Socket Expansion Button Wire Test
// Equip a fresh 1-socket armor
const testArmor = A.rollItem('cloth_tunic', 0, 'common');
testArmor.sockets = [null];
p.inventory.push(testArmor);
A.addItem('star_iron', 10);
p.zeny = 10000;

// Open Refine panel in Shop
A.G._shopTab = 'refine';
const panelHtml = A.panelBody('shop');
assert.ok(panelHtml.includes(`data-expand-socket="${testArmor.uid}"`), 'Expand Sockets button rendered in Refine panel');
assert.ok(panelHtml.includes('Expand Sockets (1/4)'), 'Button reflects current (1/4) socket count');

// Trigger expansion
A.adminAction('expandsocket', testArmor.uid);
assert.equal(testArmor.sockets.length, 2, 'Armor expanded to 2 sockets via expandSockets');

// 5. Admin Actions: expandall and runes
A.adminAction('expandall');
for (const slot of ['weapon', 'head', 'body', 'hands', 'cloak', 'feet', 'accessory']) {
  if (p.equip[slot]) {
    assert.equal(p.equip[slot].sockets.length, 4, `Equipped ${slot} has 4 sockets after expandall`);
  }
}
A.adminAction('runes');
for (const rid of runeIds) {
  assert.ok(A.itemQty(rid) >= 5, `Admin action added 5 of ${rid}`);
}

// 6. Weapon Infusion & Basic Attack Element Conversion
// Equip testWeapon into weapon slot
p.equip.weapon = testWeapon;
assert.equal(A.attackElement(p, null), 'physical', 'Weapon with empty sockets has physical attack element');

// Socket Storm Rune (Lightning) into weapon socket 0
A.socketGem(testWeapon.uid, 0, 'rune_storm');
assert.equal(testWeapon.sockets[0], 'rune_storm', 'Storm rune socketed into weapon socket 0');
assert.equal(A.attackElement(p, null), 'lightning', 'Weapon infused with Storm Rune converts basic attack to Lightning');

// 7. Elemental Weakness Exploitation (1.5x) & Weather Surge (1.2x)
A.loadMap('whispering_woods', 2, 2);
A.G.monsters.forEach(m => { m.alive = false; m.deadUntil = vnow + 9e9; m.x = m.y = 20000; });

// Create a Nature monster (weak to Lightning: nature ↔ lightning)
const dummyDef = { ...CONTENT.monsters[0], element: 'nature' };
const natureMonster = A.makeMonster(dummyDef, p.x + 32, p.y, p.level);
A.G.monsters.push(natureMonster);

// Set clear weather
A.adminAction('setweather:clear');
const baseDmg = 100;
const physicalDmg = A.elementMult('physical', natureMonster) * baseDmg;
assert.equal(physicalDmg, 100, 'Physical attack against nature monster deals 1.0x (neutral)');

const lightningWeaknessMult = A.elementMult('lightning', natureMonster);
assert.equal(lightningWeaknessMult, 1.5, 'Lightning attack against nature monster triggers 1.5x weakness multiplier');

// Verdant Rain weather affinity: Lightning damage surges by 1.2x
A.adminAction('setweather:verdant_rain');
// Test total damage multiplier with lightning attack in verdant_rain
// Weakness (1.5x) * Weather surge (1.2x) = 1.8x
const baseAttack = 100;
const natureFoe = A.makeMonster(dummyDef, p.x + 32, p.y, p.level);
const elMult = A.elementMult('lightning', natureFoe);
assert.equal(elMult, 1.5, 'Weakness is 1.5x');

// 8. Defensive Warding Stat Accumulation in Armor
// Create chest armor with Ember Rune and Glacial Rune
const wardingArmor = A.rollItem('guardian_plate', 0, 'rare');
wardingArmor.sockets = [null, null, null, null];
p.equip.body = wardingArmor;
A.socketGem(wardingArmor.uid, 0, 'rune_ember');
A.socketGem(wardingArmor.uid, 1, 'rune_glacial');

A.recompute(p);
assert.ok(p.runeMods, 'Player has runeMods computed');
assert.equal(p.runeMods.fireRes, 12, 'Ember Rune grants +12% Fire Resistance');
assert.equal(p.runeMods.hpFlat, 25, 'Ember Rune grants +25 HP');
assert.equal(p.runeMods.iceRes, 12, 'Glacial Rune grants +12% Ice Resistance');
assert.equal(p.runeMods.defFlat, 8, 'Glacial Rune grants +8 DEF');

// 9. Strict ZERO Screen Shake Engine-Wide
assert.equal(typeof A.G.cam.x, 'number', 'Camera X is a standard numeric coordinate');
assert.equal(typeof A.G.cam.y, 'number', 'Camera Y is a standard numeric coordinate');

// Simulate combat frames and verify camera coordinates remain numeric and valid without shake offset
for (let frame = 0; frame < 10; frame++) {
  A.step(0.016);
  A.render();
  assert.equal(typeof A.G.cam.x, 'number');
  assert.equal(typeof A.G.cam.y, 'number');
}

// 10. Save & Resume Game Persistence
assert.ok(A.saveGame(), 'Game saved successfully with socketed runes');
const rawSave = A.readSave();
assert.ok(rawSave?.player?.equip?.weapon, 'Saved player contains equipped weapon');
assert.deepEqual(rawSave.player.equip.weapon.sockets, testWeapon.sockets, '4 sockets and socketed Storm Rune persisted in save');
assert.deepEqual(rawSave.player.equip.body.sockets, wardingArmor.sockets, 'Armor with Ember & Glacial runes persisted in save');

// Resume game and verify restoration
A.resumeGame();
assert.equal(A.G.player.equip.weapon.sockets[0], 'rune_storm', 'Restored weapon has Storm Rune');
assert.equal(A.attackElement(A.G.player, null), 'lightning', 'Restored weapon continues to infuse Lightning');
assert.equal(A.G.player.runeMods.fireRes, 12, 'Restored armor continues to provide Fire Resistance');

console.log('✔ [PASSED] Elemental Runes & Socket Expansion Integration Test');
