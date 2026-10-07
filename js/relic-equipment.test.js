// Relic & Artifact Equipment Integration Test:
// Tests 8-slot paper-doll UI, relic equipping/swapping, character sheet passive stat
// modifications, gear comparison, and Phoenix Feather revive interception in live engine.
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
const A = globalThis.__AWO;
assert.ok(A, 'game debug API loaded');

// 1. Initial player has empty relic slot and bloodShield initialized
const p = A.makePlayer('reborn_blade', 'RelicTester');
A.G.player = p;
assert.equal(p.equip.relic, null, 'Relic slot should be null on new character');
assert.equal(p.bloodShield, 0, 'Player bloodShield should initialize to 0');

// 2. Paper-doll renders all 8 equipment slots including Relic
const charPanelHtml = A.panelBody('char');
assert.ok(charPanelHtml.includes('Relic'), 'Character paper-doll must display Relic slot');

// 3. Roll and equip Bramble Carapace (+12% Max HP)
const hpBefore = p.maxHp;
const thornmail = A.addItem('thornmail_carapace', 1);
thornmail.affixes = [];
assert.ok(thornmail.uid, 'Relic added as equipment instance with uid');
assert.equal(A.itemSlot(A.CONTENT.items.find(i => i.id === 'thornmail_carapace')), 'relic', 'itemSlot resolves to relic');

A.equip(thornmail.uid);
assert.equal(p.equip.relic?.uid, thornmail.uid, 'Bramble Carapace equipped into relic slot');
assert.equal(p.maxHp, Math.round(hpBefore * 1.12), 'Bramble Carapace grants +12% Max HP');

// 4. Compare equipment on another relic (Chalice of the Undying)
const chalice = A.addItem('vampiric_grail', 1);
chalice.affixes = [];
const comp = A.compareEquipment(chalice, p);
assert.equal(comp.slot, 'relic', 'compareEquipment identifies relic slot');
assert.equal(comp.current.uid, thornmail.uid, 'compareEquipment identifies current relic');

// 5. Swap to Chalice of the Undying (+6% Lifesteal)
A.equip(chalice.uid);
assert.equal(p.equip.relic?.uid, chalice.uid, 'Chalice of the Undying equipped');
assert.ok(p.inventory.some(it => it.uid === thornmail.uid), 'Previous relic returned to inventory');
assert.equal(p.lifesteal, 6, 'Chalice of the Undying sets player lifesteal to 6%');

// 6. Unequip relic restores baseline stats
A.unequip('relic');
assert.equal(p.equip.relic, null, 'Relic slot is empty after unequip');
assert.equal(p.lifesteal, 0, 'Lifesteal resets to 0 when relic is unequipped');
assert.equal(p.maxHp, hpBefore, 'Max HP returns to baseline');

// 7. Phoenix Feather prevents lethal player death
const feather = A.addItem('phoenix_feather', 1);
A.equip(feather.uid);
assert.equal(p.equip.relic?.uid, feather.uid);

p.hp = 0;
const mapBefore = A.G.mapId;
A.playerDeath();
assert.equal(A.G.mapId, mapBefore, 'Player does not get warped to town on Phoenix revive');
assert.equal(p.hp, Math.round(p.maxHp * 0.40), 'Phoenix Feather restores player to 40% Max HP');

console.log('Relic equipment integration test passed.');
