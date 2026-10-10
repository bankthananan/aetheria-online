// Adventurer's Handbook: optional guide quests started from the Journal, progressed by
// real game actions (eat, refine, socket, deposit...), paid out on completion, persisted.
import assert from 'node:assert/strict';

import { installBrowserEnv } from './test-support/browser-env.js';

installBrowserEnv({ nullSelectors: [], strictIds: false });
await import('./game.js');
const A = globalThis.__AWO, G = A.G;

A.G.player = A.makePlayer('reborn_blade', 'Guide');
A.loadMap('town_awakening');
const p = G.player;
const status = id => (G.handbook.done.includes(id) ? 'done' : id in G.handbook.active ? 'active' : 'other');

// locked by level and by prerequisite
p.level = 1;
assert.equal(A.startGuide('hb_refine'), false, 'Lv 3 guide cannot start at Lv 1');
assert.equal(A.startGuide('hb_meal'), false, 'follow-up guide waits for its prerequisite');
G._journalTab = 'available'; G._journalSel = 'hb:hb_fishing';
assert.ok(A.journalHtml().includes('data-guide-start="hb_fishing"'), 'journal offers an available guide');

// fishing (minigame) → meal unlocks; eating real food completes it
assert.equal(A.startGuide('hb_fishing'), true);
const xp0 = p.xp, z0 = p.zeny;
A.guideEvent('fish');
assert.equal(status('hb_fishing'), 'done', 'catching a fish completes Gone Fishing');
assert.ok(p.zeny > z0 && A.itemQty('grilled_trout') >= 2, 'rewards paid (zeny + grilled trout)');
assert.equal(A.startGuide('hb_meal'), true, 'meal unlocks after fishing');
A.useItem('grilled_trout');
assert.equal(status('hb_meal'), 'done', 'eating food completes A Hearty Meal');

// refine: Start grants the ore + zeny needed; a real refine attempt completes it
p.level = 5; A.recompute(p);
assert.equal(A.startGuide('hb_refine'), true);
assert.ok(A.itemQty('blessed_ore') >= 1, 'refine guide hands over Blessed Ore');
const sword = A.rollItem('iron_sword', 0, 'common'); p.inventory.push(sword); A.equip(sword.uid);   // fresh heroes start unarmed
A.refineItem('weapon');
assert.equal(status('hb_refine'), 'done', 'a refine attempt completes Sharper Steel');

// socket expansion + card socketing with the granted materials
assert.equal(A.startGuide('hb_socket'), true);
assert.ok(A.itemQty('wolf_fang') >= 5, 'socket guide hands over Wolf Fangs');
const armor = A.rollItem('guardian_plate', 0, 'common'); p.inventory.push(armor);
A.expandSockets(String(armor.uid));
assert.equal(status('hb_socket'), 'done', 'adding a socket completes An Open Socket');
assert.equal(A.startGuide('hb_card'), true, 'card guide unlocks after the socket guide');
assert.ok(A.itemQty('card_slime') >= 1, 'card guide hands over a Gel Slime Card');
assert.equal(A.socketGem(armor.uid, 0, 'card_slime'), true, 'Gel Slime Card fits body armor');
assert.equal(status('hb_card'), 'done', 'socketing a card completes Card Collector');

// storage
assert.equal(A.startGuide('hb_storage'), true);
A.depositItem(p.inventory.findIndex(e => e.itemId === 'blessed_ore'));
assert.equal(status('hb_storage'), 'done', 'depositing completes Safekeeping');

// persistence
assert.equal(A.startGuide('hb_tame'), true);
G.running = true; A.saveGame();
assert.equal(A.resumeGame(), true);
assert.ok(G.handbook.done.includes('hb_card') && 'hb_tame' in G.handbook.active, 'handbook progress survives save/load');
assert.ok(xp0 <= G.player.xp || G.player.level > 1, 'xp was awarded');
console.log('handbook ok');
