// One home per action (docs/UI_FLOW_DESIGN.md §3): each action has one implementing surface.
import assert from 'node:assert/strict';
import { createRuntime } from './test-support/runtime.js';

const { A } = await createRuntime({ nullSelectors: [], strictIds: false });
const G = A.G, p = G.player;
const isMat = e => A.CONTENT.items.find(i => i.id === e.itemId)?.type === 'material';

// Deposit: the Satchel no longer has its own copy; Storage's bulk button reuses depositItem
assert.ok(!A.panelBody('inv').includes('inv-deposit-mats'), 'Satchel has no deposit-anywhere button');
A.addItem('wolf_fang', 4); A.addItem('slime_gel', 3);
const mats = p.inventory.filter(isMat).reduce((n, e) => n + e.qty, 0);
const stored = () => G.storage.reduce((n, e) => n + (e.qty || 1), 0), before = stored();
assert.equal(A.depositAllMaterials(), mats, 'every material unit is moved');
assert.equal(p.inventory.filter(isMat).length, 0, 'no materials left in the bag');
assert.equal(stored(), before + mats, 'storage gained exactly those units');
G._shopTab = 'storage';
assert.ok(A.panelBody('shop').includes('data-deposit-mats'), 'Trader › Storage owns the bulk deposit');

// Settings: hotbar assignment lives on the hotbar slot picker only
const settings = A.panelBody('settings');
assert.ok(!settings.includes('data-edit-slot'), 'Settings has no duplicate hotbar row');
assert.ok(settings.includes('data-return-title'), 'Settings can save and return to the title');

// Card Codex: Book only
assert.ok(!A.worldChronicleHtml().includes('data-chronicle-tab="bestiary"'), 'Chronicle has no bestiary tab');
G._bookTab = 'cards';
assert.ok(A.collectionBookHtml().includes('data-zone='), 'Book › Cards renders the zone codex');

// Refine route: the Satchel can walk you to Marla
const route = A.taskAction('npc', 'merchant');
assert.equal(route?.mode, 'npc'); assert.ok(route.mapId, 'Trader route resolves to a map');
const gear = p.inventory.find(e => e.uid);
if (gear) { G._bagSel = 'u' + gear.uid; assert.ok(A.panelBody('inv').includes('data-refine-route'), 'gear detail offers Refine at Trader'); }
console.log('One home per action passed.');
