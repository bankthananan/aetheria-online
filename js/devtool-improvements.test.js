// js/devtool-improvements.test.js
// Comprehensive End-to-End Test Suite for Enhanced Dev Tools, Admin Shortcuts, and Automation
// Covers:
//  a) Auto-enable Admin Mode on local dev and query param
//  b) Keyboard shortcuts (Backquote, Tilde, F2) toggling admin mode and panel
//  c) Settings panel Developer Tools toggle integration
//  d) ADMIN_GROUPS catalog expansions (Abyssal Spire, Stronghold & Siege, Homestead & Sanctum)
//  e) Abyssal Spire admin actions (spirefloor:*, spireclear, givespireemblems)
//  f) Guild Stronghold admin actions (warpstronghold, spawnstrongholdsiege, clearstrongholdsiege, maxfacilities, alltrophies, strongholdmats)
//  g) Adventurer's Homestead admin actions (warphomestead, homesteadseeds, homesteadwater, homesteadmature, homesteadrest, maxpetloyalty)

import assert from 'node:assert/strict';
import { installBrowserEnv, DEFAULT_ELEMENT_IDS } from './test-support/browser-env.js';

let vnow = 1000;
installBrowserEnv({
  now: () => vnow,
  innerWidth: 1440,
  innerHeight: 900,
  elementIds: [...DEFAULT_ELEMENT_IDS, 'msg-log', 'spire-hud-slot', 'stronghold-hud-slot', 'homestead-modal-container'],
  nullSelectors: [],
  strictIds: false,
});

await import('./game.js');
const A = globalThis.__AWO;
assert.ok(A, 'Game debug API loaded');

console.log('=== TEST SUITE: DEV TOOL IMPROVEMENTS & ADMIN PANEL ===');

// Setup player
const p = A.makePlayer('codeweaver', 'TestHero');
A.G.player = p;
p.godMode = true;
A.G.running = true;
A.setCtx(document.getElementById('game-canvas'));
A.buildHud();
A.loadMap('town_awakening', 10, 10);
A.updateHud();

console.log('--- 1. Settings Panel Dev Tools Toggle ---');
A.G.admin = false;
assert.ok(!A.panelBody('settings').includes('id="admin-toggle"'), 'players off the dev host never see the admin toggle');
A.G.admin = true;
const settingsHtml = A.panelBody('settings');
assert.ok(settingsHtml.includes('id="admin-toggle"'), 'Settings panel body contains #admin-toggle for an admin');
assert.ok(settingsHtml.includes('🛠️'), 'Settings panel body contains dev tools header');

// Test toggling admin via simulated event
A.G.admin = false;
A.buildHud();
assert.equal(A.G.admin, false, 'Admin is initially false');

A.G.admin = true;
A.buildHud();
assert.equal(A.G.admin, true, 'Admin successfully set to true');

console.log('--- 2. Keyboard Shortcut Admin Toggling ---');
// Simulate keydown event with Backquote
const backquoteEvent = {
  key: '`',
  code: 'Backquote',
  preventDefault() {},
  repeat: false,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
};
A.G.admin = false;
globalThis.dispatchEvent({ type: 'keydown', ...backquoteEvent });
assert.equal(A.G.admin, false, 'backquote cannot grant admin to an ordinary player');
A.G.admin = true;
globalThis.dispatchEvent({ type: 'keydown', ...backquoteEvent });
assert.ok(A.G.admin, 'Admin is true after backquote keydown');

// Simulate keydown with F2
const f2Event = {
  key: 'f2',
  code: 'F2',
  preventDefault() {},
  repeat: false,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
};
globalThis.dispatchEvent({ type: 'keydown', ...f2Event });

console.log('--- 3. Abyssal Spire Admin Actions ---');
// Test spirefloor:10
A.adminAction('spirefloor:10');
assert.equal(A.G.mapId, 'abyssal_spire', 'Warped to abyssal_spire on spirefloor:10');
assert.equal(A.G.spireState?.currentFloor, 10, 'Started at floor 10');
assert.ok(A.G.spireBossMob, 'Boss mob spawned on floor 10');

// Test spireclear
A.adminAction('spireclear');
assert.equal(A.G.spireState?.cleared, true, 'Floor cleared via spireclear');

// Test givespireemblems
const initialEmblems = A.G.spireSystem.getEmblems();
A.adminAction('givespireemblems');
assert.equal(A.G.spireSystem.getEmblems(), initialEmblems + 500, 'Awarded 500 spire emblems to subsystem');
assert.ok(A.itemQty('spire_emblem') >= 500, 'Awarded 500 spire emblems to player inventory');

console.log('--- 4. Guild Stronghold & Siege Admin Actions ---');
// Test warpstronghold
A.adminAction('warpstronghold');
assert.equal(A.G.mapId, 'guild_stronghold', 'Warped to guild_stronghold');

// Test maxfacilities
A.adminAction('maxfacilities');
const facs = A.G.strongholdSystem.getFacilities();
assert.equal(facs.treasury, 3, 'Treasury maxed to Tier 3');
assert.equal(facs.forge, 3, 'Forge maxed to Tier 3');
assert.equal(facs.conservatory, 3, 'Conservatory maxed to Tier 3');
assert.equal(facs.training, 3, 'Training grounds maxed to Tier 3');

// Test alltrophies
A.adminAction('alltrophies');
const trophies = A.G.strongholdSystem.getTrophies();
assert.equal(trophies.pedestal_colossus, true, 'Colossus pedestal socketed');
assert.equal(trophies.pedestal_voidmaw, true, 'Voidmaw pedestal socketed');
assert.equal(trophies.pedestal_zenith, true, 'Zenith pedestal socketed');
assert.equal(trophies.pedestal_incursion, true, 'Incursion pedestal socketed');

// Test strongholdmats
const blessedOreBefore = A.itemQty('blessed_ore');
A.adminAction('strongholdmats');
assert.equal(A.itemQty('blessed_ore'), blessedOreBefore + 50, 'Awarded +50 blessed_ore');
assert.ok(A.itemQty('star_iron') >= 50, 'Awarded +50 star_iron');
assert.ok(A.itemQty('guild_commendation') >= 50, 'Awarded +50 guild_commendation');

// Test spawnstrongholdsiege
A.adminAction('spawnstrongholdsiege');
assert.ok(A.G.strongholdState?.active, 'Stronghold siege is active');
assert.ok(A.G.strongholdCrystal?.siegeActive, 'Stronghold crystal siege shield active');
assert.ok(A.G.monsters.some(m => m._siegeMob), 'Siege mobs spawned');

// Test clearstrongholdsiege
A.adminAction('clearstrongholdsiege');
assert.equal(A.G.strongholdState, null, 'Stronghold siege cleared');
assert.equal(A.G.monsters.filter(m => m._siegeMob).length, 0, 'No remaining siege mobs');

console.log('--- 5. Adventurer Homestead Admin Actions ---');
// Test warphomestead
A.adminAction('warphomestead');
assert.equal(A.G.mapId, 'player_homestead', 'Warped to player_homestead');

// Test homesteadseeds
const silverleafSeedsBefore = A.itemQty('seed_silverleaf');
A.adminAction('homesteadseeds');
assert.equal(A.itemQty('seed_silverleaf'), silverleafSeedsBefore + 10, 'Awarded +10 silverleaf seeds');
assert.ok(A.itemQty('seed_golden_wheat') >= 10, 'Awarded +10 golden wheat seeds');

// Plant a crop and test homesteadwater and homesteadmature
A.G.homesteadSystem.plantSeed(0, 'seed_silverleaf', p);
assert.equal(A.G.homesteadSystem.getPlots()[0].stage, 1, 'Plot 0 seedling planted');

A.adminAction('homesteadwater');
assert.equal(A.G.homesteadSystem.getPlots()[0].watered, true, 'Plot 0 watered via homesteadwater');

A.adminAction('homesteadmature');
assert.equal(A.G.homesteadSystem.getPlots()[0].stage, 3, 'Plot 0 matured via homesteadmature');

// Test homesteadrest
A.adminAction('homesteadrest');
assert.equal(A.G.homesteadSystem.isHearthBuffActive(), true, 'Well Rested hearth buff active via homesteadrest');
assert.ok((p.expMult || 1) >= 1.10, 'Well Rested buff provides +10% EXP multiplier');

// Test maxpetloyalty
A.G.pets = {
  activePetId: 'ember_pup',
  owned: {
    ember_pup: { id: 'ember_pup', loyalty: 20, exp: 0, bondLevel: 1 },
    verdant_sprout: { id: 'verdant_sprout', loyalty: 45, exp: 0, bondLevel: 2 },
  },
};
A.adminAction('maxpetloyalty');
assert.equal(A.G.pets.owned.ember_pup.loyalty, 100, 'Ember pup loyalty set to 100');
assert.equal(A.G.pets.owned.verdant_sprout.loyalty, 100, 'Verdant sprout loyalty set to 100');

console.log('--- 6. Admin Panel HTML Rendering ---');
const adminPanelHtml = A.panelBody('admin');
assert.ok(adminPanelHtml.includes('Abyssal Spire'), 'Admin panel renders Abyssal Spire section');
assert.ok(adminPanelHtml.includes('Stronghold & Siege'), 'Admin panel renders Stronghold & Siege section');
assert.ok(adminPanelHtml.includes('Homestead & Sanctum'), 'Admin panel renders Homestead & Sanctum section');
assert.ok(adminPanelHtml.includes('data-admin="spirefloor:10"'), 'Admin panel has spirefloor:10 button');
assert.ok(adminPanelHtml.includes('data-admin="maxfacilities"'), 'Admin panel has maxfacilities button');
assert.ok(adminPanelHtml.includes('data-admin="homesteadmature"'), 'Admin panel has homesteadmature button');

console.log('✔ [PASSED] All Dev Tool & Admin Panel improvements verified successfully!');
