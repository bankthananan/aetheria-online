import assert from 'node:assert/strict';
import { createRuntime } from './test-support/runtime.js';
import { matchesLoot } from './systems/loot-preferences.js';
const {A}=await createRuntime();
A.addItem('iron_sword',1);
const gear=A.G.player.inventory.find(e=>e.uid);
assert.equal(A.setItemProtection(gear.uid,true),true);
const gold=A.G.player.zeny;
A.sellItem(String(gear.uid));
assert.equal(A.G.player.zeny,gold);
assert.ok(A.G.player.inventory.some(e=>e.uid===gear.uid));
A.depositItem(A.G.player.inventory.findIndex(e=>e.uid===gear.uid));
assert.equal(A.G.storage.find(e=>e.uid===gear.uid).protected,true);
A.withdrawItem(A.G.storage.findIndex(e=>e.uid===gear.uid));
A.saveGame();A.resumeGame();
assert.equal(A.G.player.inventory.find(e=>e.uid===gear.uid).protected,true);
assert.equal(A.setItemProtection(gear.uid,false),true);
A.sellItem(String(gear.uid));
assert.equal(A.G.player.inventory.some(e=>e.uid===gear.uid),false);
assert.equal(matchesLoot({uid:1,affixes:[]},{classReq:['drifter']},{mode:'usable',affixes:[]},'reborn_blade'),false);
assert.equal(matchesLoot({qty:1},{type:'potion'},{mode:'affixes',affixes:['str']},'reborn_blade'),true);
assert.equal(matchesLoot({uid:1,affixes:[]},{},{mode:'affixes',affixes:[]},'reborn_blade'),true);

// Quick Sell Audit
const p = A.G.player;
p.inventory = [];
p.zeny = 1000;

// Empty inventory case
const emptyRes = A.quickSellItems({ p, notify: false });
assert.equal(emptyRes.count, 0);
assert.equal(emptyRes.zeny, 0);
assert.equal(p.zeny, 1000);

// Populate mixed bag
A.addItem('minor_potion', 5); // consumable - keep
A.addItem('iron_ore', 10); // material - keep
A.addItem('iron_sword', 1); // gear 1
A.addItem('cloth_tunic', 1); // gear 2
A.addItem('leather_vest', 1); // gear 3
A.addItem('iron_boots', 1); // gear 4

const items = p.inventory.filter(e => e.uid);
assert.equal(items.length, 4);

// Set rarities and protection
items[0].rarity = 'common';
items[0].protected = false; // sell

items[1].rarity = 'magic';
items[1].protected = false; // sell

items[2].rarity = 'rare';
items[2].protected = false; // KEEP (rare)

items[3].rarity = 'common';
items[3].protected = true; // KEEP (protected)

const expectedPrice1 = A.sellPrice(items[0]);
const expectedPrice2 = A.sellPrice(items[1]);
const expectedTotal = expectedPrice1 + expectedPrice2;

const sellRes = A.quickSellItems({ p, notify: false });
assert.equal(sellRes.count, 2, 'Exactly 2 items sold (unprotected common and magic)');
assert.equal(sellRes.zeny, expectedTotal, 'Zeny earned matches sum of sell prices');
assert.equal(p.zeny, 1000 + expectedTotal, 'Player zeny correctly credited');

// Verify kept items
assert.ok(p.inventory.some(e => e.itemId === 'minor_potion' && e.qty === 5), 'Consumables preserved');
assert.ok(p.inventory.some(e => e.itemId === 'iron_ore' && e.qty === 10), 'Materials preserved');
assert.ok(p.inventory.some(e => e.uid === items[2].uid), 'Rare gear preserved');
assert.ok(p.inventory.some(e => e.uid === items[3].uid), 'Protected gear preserved');

// UI Buttons presence audit
const invHtml = A.panelBody('inv');
assert.ok(invHtml.includes('id="inv-quick-sell"'), 'Inventory toolbar must include #inv-quick-sell button');

A.G._shopTab = 'sell';
const shopHtml = A.panelBody('shop');
assert.ok(shopHtml.includes('id="shop-quick-sell"'), 'Shop sell tab must include #shop-quick-sell button');

console.log('Protected loot & quick sell passed.');

