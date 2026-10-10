// A save holding an item id that no longer exists in CONTENT used to crash the
// Satchel render, so the bag would not open. resumeGame now drops those entries.
import assert from 'node:assert/strict';

import { installBrowserEnv } from './test-support/browser-env.js';

installBrowserEnv({ nullSelectors: [], strictIds: false });
await import('./game.js');
const A = globalThis.__AWO;

A.G.player = A.makePlayer('codeweaver', 'Hero');
A.loadMap('town_awakening');
A.addItem('minor_potion', 2);
A.G.running = true;
A.saveGame();

const save = JSON.parse(globalThis.localStorage.getItem('awo_save_v1'));
save.player.inventory.push({ itemId: 'removed_item', qty: 1 }, { itemId: 'removed_sword', uid: 9001, rarity: 'rare', affixes: [] }, null);
save.world.storage = [...(save.world.storage || []), { itemId: 'removed_ore', qty: 5 }];
globalThis.localStorage.setItem('awo_save_v1', JSON.stringify(save));

assert.equal(A.resumeGame(), true, 'save with stale items still loads');
assert.ok(A.G.player.inventory.every(e => e && e.itemId !== 'removed_item' && e.itemId !== 'removed_sword'), 'unknown bag entries dropped');
assert.ok(A.G.player.inventory.some(e => e.itemId === 'minor_potion'), 'known items kept');
assert.ok(!A.G.storage.some(e => e.itemId === 'removed_ore'), 'unknown storage entries dropped');
for (const tab of ['all', 'gear', 'use', 'etc', 'quest']) { A.G._bagTab = tab; assert.doesNotThrow(() => A.panelBody('inv'), `bag renders (${tab})`); }
console.log('stale save items ok');
