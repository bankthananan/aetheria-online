// js/cards-integration.test.js
// End-to-End Integration Suite: Monster Cards & Bestiary Codex Subsystem.
// Tests live engine boot, content invariants, monster kill & bestiary drop recording,
// card drop roll & LUK scaling, equipment socketing & recompute(p) stat buffs,
// Old Card Album opening & fanfare, combat on-hit procs, zone collection milestones,
// World Chronicle Bestiary UI panel, strict ZERO screen shake, and save/resume persistence.

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
const { CARD_CATALOG, ZONE_ALBUM_MILESTONES, createCardsSystem } = await import('./systems/cards.js');
const { createCardsUIRenderer } = await import('./render/cards-ui.js');

const A = globalThis.__AWO;
assert.ok(A, 'game debug API loaded');

// 1. Initial player & map boot
const p = A.makePlayer('reborn_blade', 'CardMaster');
A.G.player = p;
p.godMode = true;
p.zeny = 10000;
A.G.running = true;
A.setCtx(document.getElementById('game-canvas'));
A.buildHud();
A.loadMap('whispering_woods', 14, 12);
A.updateHud();

console.log('Testing a) Content Invariants...');
// ============================================================================
// a) Content Invariants
// ============================================================================
assert.ok(Object.keys(CARD_CATALOG).length >= 60, 'CARD_CATALOG contains all expanded monster cards');

for (const [cardId, cardDef] of Object.entries(CARD_CATALOG)) {
  const item = CONTENT.items[cardId];
  assert.ok(item, `Card item ${cardId} registered in CONTENT.items`);
  assert.equal(item.type, 'card', `Card item ${cardId} has type 'card'`);
  assert.equal(item.cardId, cardDef.id, `Card item ${cardId} links to cardId`);
  assert.ok(item.name, `Card item ${cardId} has valid name`);
  assert.ok(item.price > 0, `Card item ${cardId} has positive price`);
}

// Old Card Album item & recipe
const ocaItem = CONTENT.items.old_card_album;
assert.ok(ocaItem, 'old_card_album registered in CONTENT.items');
assert.equal(ocaItem.type, 'consumable', 'old_card_album has type consumable');
assert.equal(ocaItem.price, 1500, 'old_card_album price is 1500');

const ocaRecipe = CONTENT.recipes.find(r => r.id === 'r_old_card_album');
assert.ok(ocaRecipe, 'r_old_card_album registered in CONTENT.recipes');
assert.equal(ocaRecipe.out, 'old_card_album', 'r_old_card_album outputs old_card_album');
assert.equal(ocaRecipe.cost, 500, 'r_old_card_album crafting cost is 500');

console.log('Testing b) Monster Kills & Bestiary Progress...');
// ============================================================================
// b) Monster Kills & Bestiary Progress
// ============================================================================
A.G.bestiary = A.G.cardsSystem.deserialize(null);
const slimeDef = CONTENT.monsters.find(m => m.id === 'slime');
assert.ok(slimeDef, 'Slime monster definition exists');

const dummySlime = A.makeMonster(slimeDef, p.x + 32, p.y, slimeDef.level);
A.G.monsters.push(dummySlime);

// Kill slime and verify kill recorded in G.bestiary
A.killMonster(dummySlime);
assert.equal(A.G.bestiary.monsters['slime']?.kills, 1, 'Bestiary records slime kill');
assert.equal(A.G.bestiary.monsters['slime']?.mastery, 0, '1 kill is 0 mastery stars');

// Simulate 10 kills -> mastery rank 1
for (let i = 0; i < 9; i++) {
  A.G.cardsSystem.recordBestiaryKill(A.G.bestiary, 'slime');
}
assert.equal(A.G.bestiary.monsters['slime']?.kills, 10, 'Bestiary tracks 10 kills');
assert.equal(A.G.bestiary.monsters['slime']?.mastery, 1, '10 kills reaches mastery star 1');

// Simulate 50 kills -> mastery rank 2
for (let i = 0; i < 40; i++) {
  A.G.cardsSystem.recordBestiaryKill(A.G.bestiary, 'slime');
}
assert.equal(A.G.bestiary.monsters['slime']?.mastery, 2, '50 kills reaches mastery star 2');

// Simulate 200 kills -> mastery rank 3
for (let i = 0; i < 150; i++) {
  A.G.cardsSystem.recordBestiaryKill(A.G.bestiary, 'slime');
}
assert.equal(A.G.bestiary.monsters['slime']?.mastery, 3, '200 kills reaches mastery star 3 (max)');

// Bestiary drop recording
A.G.cardsSystem.recordBestiaryDrop(A.G.bestiary, 'slime', 'gel');
assert.equal(A.G.bestiary.monsters['slime']?.drops?.['gel'], true, 'Bestiary records discovered drop');

console.log('Testing c) Monster Card Drop Mechanics & LUK Scaling...');
// ============================================================================
// c) Monster Card Drop Mechanics & LUK Scaling
// ============================================================================
// Deterministic drop roll tests
let mockRnd = 0.005; // Less than 1% normal drop chance
const testCardsSystem = createCardsSystem({ rnd: () => mockRnd });

const normalDrop = testCardsSystem.rollCardDrop(slimeDef, { luck: 0 });
assert.equal(normalDrop, 'card_slime', 'rollCardDrop succeeds when roll < baseChance');

mockRnd = 0.05; // 5%, misses normal (1%) but hits boss (10%)
const missNormal = testCardsSystem.rollCardDrop(slimeDef, { isBoss: false, luck: 0 });
assert.equal(missNormal, null, 'Normal monster misses at 5% roll');

const hitBoss = testCardsSystem.rollCardDrop(slimeDef, { isBoss: true, luck: 0 });
assert.equal(hitBoss, 'card_slime', 'Boss monster hits at 5% roll');

// LUK scaling test: base 1%, luck 50 -> +100% chance (effective 2%)
mockRnd = 0.015; // 1.5%
const missNoLuck = testCardsSystem.rollCardDrop(slimeDef, { luck: 0 });
assert.equal(missNoLuck, null, '1.5% roll misses with 0 LUK (1% base)');

const hitWithLuck = testCardsSystem.rollCardDrop(slimeDef, { luck: 50 });
assert.equal(hitWithLuck, 'card_slime', '1.5% roll succeeds with 50 LUK (2% effective)');

console.log('Testing d) Equipment Socketing & recompute(p) Stat Buffs...');
// ============================================================================
// d) Equipment Socketing & recompute(p) Stat Buffs
// ============================================================================
// Create gear with sockets
const sword = A.rollItem('hero_blade', 0, 'legendary');
sword.sockets = [null, null];
sword.affixes = [];
p.inventory.push(sword);

// Give Gel Slime Card (+60 Max HP, targetSlot: armor)
// Give Wolf Card (+8 ATK, +4 Crit, targetSlot: weapon)
A.addItem('card_slime', 1);
A.addItem('card_wolf', 1);

// Equip weapon with empty sockets
A.equip(sword.uid);

// Test socket constraints: cannot socket armor card into weapon
const invalidSocket = A.socketGem(sword.uid, 0, 'card_slime');
assert.equal(invalidSocket, false, 'Cannot socket armor card into weapon slot');

// Valid socket: Wolf Card into equipped weapon
const atkBefore = p.physAtk;
const critBefore = p.critChance;

const validSocket = A.socketGem(sword.uid, 0, 'card_wolf');
assert.equal(validSocket, true, 'Successfully socketed Wolf Card into weapon');
assert.equal(sword.sockets[0], 'card_wolf', 'Socket 0 holds card_wolf');
assert.equal(A.itemQty('card_wolf'), 0, 'Wolf Card consumed from inventory');

assert.equal(p.physAtk, atkBefore + 8, 'Wolf Card adds +8 physical ATK');
assert.equal(p.critChance, critBefore + 4, 'Wolf Card adds +4% Crit Chance');
assert.equal(p.cardMods?.physAtk, 8, 'cardMods tracks +8 physAtk');
assert.equal(p.cardMods?.critChance, 4, 'cardMods tracks +4 critChance');

// Armor card socketing test: Guardian Plate (+60 Max HP from Slime Card)
const armor = A.rollItem('guardian_plate', 0, 'legendary');
armor.sockets = [null, null];
armor.affixes = [];
p.inventory.push(armor);
A.equip(armor.uid);

const hpBeforeArmor = p.maxHp;
const armorSocket = A.socketGem(armor.uid, 0, 'card_slime');
assert.equal(armorSocket, true, 'Successfully socketed Slime Card into armor');
assert.equal(armor.sockets[0], 'card_slime', 'Socket 0 holds card_slime');
assert.equal(p.maxHp, hpBeforeArmor + 60, 'Slime Card adds +60 Max HP');

console.log('Testing e) Old Card Album Consumption & Fanfare (Strict 0 Screen Shake)...');
// ============================================================================
// e) Old Card Album Consumption & Fanfare (Strict 0 Screen Shake)
// ============================================================================
A.addItem('old_card_album', 1);
assert.equal(A.itemQty('old_card_album'), 1, 'Player has 1 Old Card Album');

const camBeforeOCA = { x: A.G.cam.x, y: A.G.cam.y };
const invCountBefore = p.inventory.length;

const ocaUsed = A.useItem('old_card_album');
assert.equal(ocaUsed, true, 'Opening Old Card Album succeeds');
assert.equal(A.itemQty('old_card_album'), 0, 'Old Card Album consumed');

// Check that a card was granted
const hasNewCard = p.inventory.some(item => item.itemId?.startsWith('card_'));
assert.ok(hasNewCard, 'Player received a monster card from Old Card Album');

// Strict ZERO camera shake verification
assert.equal(A.G.cam.x, camBeforeOCA.x, 'Camera X unchanged by album opening');
assert.equal(A.G.cam.y, camBeforeOCA.y, 'Camera Y unchanged by album opening');

console.log('Testing f) Combat On-Hit Procs (Strict 0 Screen Shake)...');
// ============================================================================
// f) Combat On-Hit Procs (Strict 0 Screen Shake)
// ============================================================================
// Socket Frost Revenant Card (12% chance on hit: Frost Nova, 120% DMG, Slow) into weapon
const revenantWeapon = A.rollItem('hero_blade', 0, 'legendary');
revenantWeapon.sockets = ['card_frost_revenant'];
revenantWeapon.affixes = [];
p.inventory.push(revenantWeapon);
A.equip(revenantWeapon.uid);

const targetMonster = A.makeMonster(slimeDef, p.x + 30, p.y, 1);
const nearbyMonster = A.makeMonster(slimeDef, p.x + 40, p.y, 1);
targetMonster.hp = 1000;
nearbyMonster.hp = 1000;
A.G.monsters = [targetMonster, nearbyMonster];

const camBeforeProc = { x: A.G.cam.x, y: A.G.cam.y };
const nearbyHpBefore = nearbyMonster.hp;

// Mock Math.random to trigger harpy proc (chance is 0.12)
const origRandom = Math.random;
Math.random = () => 0.05;

A.damageMonster(targetMonster, 100, false, false);
Math.random = origRandom;

// Verify splash damage from Frost Nova hit nearby monster
assert.ok(nearbyMonster.hp < nearbyHpBefore, 'Frost Nova on-hit proc dealt splash damage to nearby monster');
assert.equal(A.G.cam.x, camBeforeProc.x, 'Camera X strictly unchanged by on-hit proc');
assert.equal(A.G.cam.y, camBeforeProc.y, 'Camera Y strictly unchanged by on-hit proc');

console.log('Testing g) Zone Collection Milestones...');
// ============================================================================
// g) Zone Collection Milestones
// ============================================================================
// Complete all 12 cards of Whispering Woods
const woodsCards = Object.values(CARD_CATALOG).filter(c => c.zone === 'woods').map(c => c.id);
assert.equal(woodsCards.length, 12, 'Whispering Woods has 12 monster cards');

for (const cId of woodsCards) {
  A.G.cardsSystem.recordCardAcquired(A.G.bestiary, cId);
}

const speedBeforeMilestone = p.moveMult;
A.recompute(p);

// Woods milestone: Forest Strider (+3% Move Speed)
assert.ok(p.moveMult > speedBeforeMilestone, 'Woods milestone grants movement speed bonus');
assert.equal(p.cardMods?.moveMult, 0.03, 'cardMods includes 0.03 moveMult from completed Woods album');

console.log('Testing h) World Chronicle Bestiary UI Panel...');
// ============================================================================
// h) World Chronicle Bestiary UI Panel
// ============================================================================
A.G._chronicleTab = 'road';
const roadHtml = A.worldChronicleHtml();
assert.ok(!roadHtml.includes('data-chronicle-tab="bestiary"'), 'card Codex lives in the Book, not the Chronicle');
assert.ok(roadHtml.includes('Roads of the Outworlder'), 'Chronicle road tab rendered');

A.G._bookTab = 'cards';
A.G._bestiaryZone = 'woods';
const bestiaryHtml = A.collectionBookHtml();
assert.ok(bestiaryHtml.includes('data-book-tab="cards"'), 'Book has a Cards tab');
assert.ok(bestiaryHtml.includes('Forest Strider'), 'Milestone banner for Whispering Woods rendered');
assert.ok(bestiaryHtml.includes('Slime'), 'Slime monster row rendered in Bestiary');
assert.ok(bestiaryHtml.includes('12/12'), 'Whispering Woods card completion displays 12/12');

console.log('Testing i) Admin Actions for Cards...');
// ============================================================================
// i) Admin Actions for Cards
// ============================================================================
const slimeCardsBefore = A.itemQty('card_slime');
A.adminAction('givecard:card_slime');
assert.equal(A.itemQty('card_slime'), slimeCardsBefore + 1, 'givecard:card_slime adds card');

const ocaBeforeAdmin = A.itemQty('old_card_album');
A.adminAction('givecardalbum');
assert.equal(A.itemQty('old_card_album'), ocaBeforeAdmin + 1, 'givecardalbum adds album');

A.adminAction('resetbestiary');
assert.equal(Object.keys(A.G.bestiary.monsters).length, 0, 'resetbestiary resets monsters');
assert.equal(Object.keys(A.G.bestiary.cards).length, 0, 'resetbestiary resets cards');

console.log('Testing j) Save & Resume State Persistence...');
// ============================================================================
// j) Save & Resume State Persistence
// ============================================================================
// Populate bestiary state
A.G.cardsSystem.recordBestiaryKill(A.G.bestiary, 'goblin');
A.G.cardsSystem.recordBestiaryDrop(A.G.bestiary, 'goblin', 'goblin_ear');
A.G.cardsSystem.recordCardAcquired(A.G.bestiary, 'card_goblin');

// Save game
const saved = A.saveGame();
assert.equal(saved, true, 'saveGame succeeded');

const rawSave = A.readSave();
assert.ok(rawSave.world.bestiary, 'Save data includes world.bestiary');
assert.equal(rawSave.world.bestiary.monsters['goblin']?.kills, 1, 'Persisted goblin kill');
assert.equal(rawSave.world.bestiary.monsters['goblin']?.drops?.['goblin_ear'], true, 'Persisted goblin drop');
assert.equal(rawSave.world.bestiary.cards['card_goblin'], true, 'Persisted goblin card acquisition');

// Wipe in-memory state
A.G.bestiary = A.G.cardsSystem.deserialize(null);
assert.equal(A.G.bestiary.cards['card_goblin'], undefined, 'In-memory bestiary wiped');

// Resume game
const resumed = A.resumeGame();
assert.equal(resumed, true, 'resumeGame succeeded');
assert.equal(A.G.bestiary.monsters['goblin']?.kills, 1, 'Restored goblin kill');
assert.equal(A.G.bestiary.monsters['goblin']?.drops?.['goblin_ear'], true, 'Restored goblin drop');
assert.equal(A.G.bestiary.cards['card_goblin'], true, 'Restored goblin card acquisition');

console.log('All Monster Cards & Bestiary integration tests passed cleanly!');
