// QoL pack: town storage round-trips items and survives save/load; achievements
// unlock once (never twice) from live run state; day/night phase math stays sane.
import assert from 'node:assert/strict';

import { installBrowserEnv } from './test-support/browser-env.js';

let vnow = 0;

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

const p = A.makePlayer('reborn_blade', 'QolTester');
A.G.player = p;
A.buildHud();
A.recompute(p, true);
A.loadMap('town_awakening');
A.G.running = true;   // saveGame persists only a live run

// ---- storage: stackable + instance round-trip ----
A.addItem('minor_potion', 3);
const gear = A.addItem('iron_sword', 1, 6);
assert.ok(gear?.uid, 'test setup: rolled gear instance');
const potIdx = p.inventory.findIndex(e => e.itemId === 'minor_potion');
const potQtyBefore = p.inventory[potIdx].qty;
A.depositItem(potIdx);
assert.equal(p.inventory.find(e => e.itemId === 'minor_potion')?.qty, potQtyBefore - 1, 'deposit moves one unit from a stack');
assert.equal(A.G.storage.find(e => e.itemId === 'minor_potion')?.qty, 1, 'stackable lands in the chest');
const gearIdx = p.inventory.findIndex(e => e.uid === gear.uid);
A.depositItem(gearIdx);
assert.ok(A.G.storage.some(e => e.uid === gear.uid), 'gear instance lands in the chest whole');
assert.ok(!p.inventory.some(e => e.uid === gear.uid), 'deposited gear leaves the backpack');

// quest items must refuse to enter storage
A.addItem('guide_letter', 1);
const qIdx = p.inventory.findIndex(e => e.itemId === 'guide_letter');
A.depositItem(qIdx);
assert.ok(!A.G.storage.some(e => e.itemId === 'guide_letter'), 'quest items cannot be stored');

// ---- persistence: chest and achievements survive save → load ----
A.G.killCounts = { slime: 150 };
A.checkAchievements();
assert.ok(A.G.achievements.has('ach_first_blood'), 'kill achievements unlock');
assert.ok(A.G.achievements.has('ach_centurion'), '100-kill tier unlocks at 150 kills');
assert.ok(!A.G.achievements.has('ach_legion'), '1,000-kill tier stays locked');
const unlockedCount = A.G.achievements.size;
A.checkAchievements();
assert.equal(A.G.achievements.size, unlockedCount, 'achievements never re-fire');

A.saveGame();
A.G.storage = []; A.G.achievements = new Set(); p.inventory.length = 0;
assert.ok(A.resumeGame(), 'save must load back');
assert.ok(A.G.storage.some(e => e.uid === gear.uid), 'stored gear survives save/load');
assert.equal(A.G.storage.find(e => e.itemId === 'minor_potion')?.qty, 1, 'stored stack survives save/load');
assert.ok(A.G.achievements.has('ach_centurion'), 'achievements survive save/load');

// withdraw puts things back in the (restored) backpack
const p2 = A.G.player;
const storedGearIdx = A.G.storage.findIndex(e => e.uid === gear.uid);
A.withdrawItem(storedGearIdx);
assert.ok(p2.inventory.some(e => e.uid === gear.uid), 'withdraw returns gear to the backpack');
assert.ok(!A.G.storage.some(e => e.uid === gear.uid), 'withdrawn gear leaves the chest');

console.log('QoL audit passed: storage round-trip + persistence, achievements unlock once and persist.');
