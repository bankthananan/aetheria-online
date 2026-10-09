// js/stronghold-ui.test.js
// Comprehensive unit test suite for Stronghold UI Renderer.

import assert from 'node:assert/strict';
import { createStrongholdUIRenderer } from './render/stronghold-ui.js';
import {
  FACILITY_DEFINITIONS,
  TROPHY_PEDESTAL_DEFINITIONS,
  SIEGE_REWARDS,
} from './systems/stronghold.js';

console.log('=== RUNNING STRONGHOLD UI TEST SUITE ===');

// 1. Factory initialization & renderer methods presence
const ui = createStrongholdUIRenderer({
  T: (s) => s,
  FACILITY_DEFINITIONS,
  TROPHY_PEDESTAL_DEFINITIONS,
  SIEGE_REWARDS,
});

assert.ok(ui, 'createStrongholdUIRenderer factory returned an object');
assert.equal(typeof ui.renderStrongholdConsoleHtml, 'function', 'renderStrongholdConsoleHtml is a function');
assert.equal(typeof ui.renderSiegeHudHtml, 'function', 'renderSiegeHudHtml is a function');
assert.equal(typeof ui.renderSiegeVictoryModalHtml, 'function', 'renderSiegeVictoryModalHtml is a function');

// 2. renderStrongholdConsoleHtml facilities rendering
const emptyState = {
  facilities: { treasury: 0, forge: 0, conservatory: 0, training: 0 },
  trophies: { pedestal_colossus: false, pedestal_voidmaw: false, pedestal_zenith: false, pedestal_incursion: false },
  lastStipendClaimAt: 0,
};
const poorPlayer = { zeny: 100, inventory: [] };
const consoleHtmlEmpty = ui.renderStrongholdConsoleHtml(emptyState, poorPlayer, 0);

assert.ok(consoleHtmlEmpty.includes('stronghold-console-shell'), 'Renders .stronghold-console-shell');
assert.ok(consoleHtmlEmpty.includes('facility-card--treasury'), 'Renders Treasury Vault card');
assert.ok(consoleHtmlEmpty.includes('facility-card--forge'), 'Renders Guild Forge card');
assert.ok(consoleHtmlEmpty.includes('facility-card--conservatory'), 'Renders Botanical Conservatory card');
assert.ok(consoleHtmlEmpty.includes('facility-card--training'), 'Renders Tactical Training Grounds card');
assert.ok(consoleHtmlEmpty.includes('Tier 0/3'), 'Displays Tier 0/3 badges for baseline facilities');
assert.ok(consoleHtmlEmpty.includes('data-upgrade-facility="treasury"'), 'Upgrade facility button present for treasury');
assert.ok(consoleHtmlEmpty.includes('data-upgrade-facility="forge"'), 'Upgrade facility button present for forge');
assert.ok(consoleHtmlEmpty.includes('data-upgrade-facility="conservatory"'), 'Upgrade facility button present for conservatory');
assert.ok(consoleHtmlEmpty.includes('data-upgrade-facility="training"'), 'Upgrade facility button present for training');
assert.ok(consoleHtmlEmpty.includes('disabled'), 'Upgrade buttons are disabled for poor player');

// When player has enough GP, Zeny, and mats
const richPlayer = {
  zeny: 100000,
  inventory: [
    { itemId: 'iron_ore', qty: 20 },
    { itemId: 'wood', qty: 20 },
    { itemId: 'hardwood', qty: 20 },
  ],
};
const consoleHtmlRich = ui.renderStrongholdConsoleHtml(emptyState, richPlayer, 500);
// Check that treasury upgrade button is not disabled
const treasuryMatch = consoleHtmlRich.match(/<button[^>]+data-upgrade-facility="treasury"[^>]*>/);
assert.ok(treasuryMatch && !treasuryMatch[0].includes('disabled'), 'Treasury upgrade button enabled for rich player');

// Treasury stipend rendering
assert.ok(!consoleHtmlEmpty.includes('data-claim-stipend'), 'No stipend button when treasury is tier 0');

const tier1State = {
  facilities: { treasury: 1, forge: 1, conservatory: 1, training: 1 },
  trophies: {},
  lastStipendClaimAt: 0,
};
const consoleHtmlTier1 = ui.renderStrongholdConsoleHtml(tier1State, richPlayer, 500);
assert.ok(consoleHtmlTier1.includes('data-claim-stipend="1"'), 'Shows daily stipend button when treasury tier >= 1');
assert.ok(consoleHtmlTier1.includes('+500z'), 'Displays stipend amount +500z for Tier 1 treasury');
assert.ok(!consoleHtmlTier1.match(/<button[^>]+data-claim-stipend="1"[^>]*disabled/), 'Stipend button is enabled when lastStipendClaimAt is 0');

// Stipend cooldown test
const claimedRecentlyState = {
  facilities: { treasury: 1, forge: 0, conservatory: 0, training: 0 },
  trophies: {},
  lastStipendClaimAt: Date.now() - 1000, // 1 second ago
};
const consoleHtmlClaimed = ui.renderStrongholdConsoleHtml(claimedRecentlyState, richPlayer, 500);
const stipendClaimedMatch = consoleHtmlClaimed.match(/<button[^>]+data-claim-stipend="1"[^>]*>/);
assert.ok(stipendClaimedMatch && stipendClaimedMatch[0].includes('disabled'), 'Stipend button is disabled during 24h cooldown');

// Max Tier facility rendering
const maxTierState = {
  facilities: { treasury: 3, forge: 3, conservatory: 3, training: 3 },
  trophies: {},
  lastStipendClaimAt: 0,
};
const consoleHtmlMax = ui.renderStrongholdConsoleHtml(maxTierState, richPlayer, 500);
assert.ok(consoleHtmlMax.includes('Max Tier'), 'Renders Max Tier badge for Tier 3 facilities');
assert.ok(!consoleHtmlMax.includes('data-upgrade-facility='), 'Does not render upgrade buttons for maxed facilities');

// 3. renderStrongholdConsoleHtml trophy pedestals rendering
assert.ok(consoleHtmlEmpty.includes('pedestal-card--pedestal_colossus'), 'Renders Colossus pedestal');
assert.ok(consoleHtmlEmpty.includes('pedestal-card--pedestal_voidmaw'), 'Renders Voidmaw pedestal');
assert.ok(consoleHtmlEmpty.includes('pedestal-card--pedestal_zenith'), 'Renders Zenith pedestal');
assert.ok(consoleHtmlEmpty.includes('pedestal-card--pedestal_incursion'), 'Renders Incursion pedestal');
assert.ok(consoleHtmlEmpty.includes('[EMPTY]'), 'Shows [EMPTY] badge for unsocketed pedestals');
assert.ok(consoleHtmlEmpty.includes('data-mount-pedestal="pedestal_colossus"'), 'Renders Mount Trophy button for Colossus');
assert.ok(consoleHtmlEmpty.includes('Colossal Fortitude'), 'Displays Colossus aura name');
assert.ok(consoleHtmlEmpty.includes('Singularity Edge'), 'Displays Voidmaw aura name');
assert.ok(consoleHtmlEmpty.includes('Zenith Ascendance'), 'Displays Zenith aura name');
assert.ok(consoleHtmlEmpty.includes('Aetheric Resonance'), 'Displays Incursion aura name');

// Socketed pedestals test
const socketedState = {
  facilities: { treasury: 0, forge: 0, conservatory: 0, training: 0 },
  trophies: { pedestal_colossus: true, pedestal_voidmaw: true, pedestal_zenith: false, pedestal_incursion: false },
};
const consoleHtmlSocketed = ui.renderStrongholdConsoleHtml(socketedState, richPlayer, 0);
assert.ok(consoleHtmlSocketed.includes('[SOCKETED]'), 'Shows [SOCKETED] badge for mounted pedestals');
assert.ok(consoleHtmlSocketed.includes('data-unmount-pedestal="pedestal_colossus"'), 'Shows Retrieve Trophy button for socketed pedestal');
assert.ok(consoleHtmlSocketed.includes('data-unmount-pedestal="pedestal_voidmaw"'), 'Shows Retrieve Trophy button for socketed Voidmaw');
assert.ok(consoleHtmlSocketed.includes('data-mount-pedestal="pedestal_zenith"'), 'Shows Mount Trophy button for unsocketed Zenith');

// 4. renderSiegeHudHtml empty/inactive checks
assert.equal(ui.renderSiegeHudHtml(null, null), '', 'Returns empty string when siegeState is null');
assert.equal(ui.renderSiegeHudHtml({ active: false }, { hp: 100, maxHp: 100 }), '', 'Returns empty string when siegeState is inactive');
assert.equal(ui.renderSiegeHudHtml({ active: true }, null), '', 'Returns empty string when crystalEntity is null');

// 5. renderSiegeHudHtml active encounter rendering
const activeSiege = {
  active: true,
  wave: 2,
  totalWaveFoes: 8,
  defeatedFoes: 3,
};
const crystal = { hp: 12000, maxHp: 15000 };
const hudHtml = ui.renderSiegeHudHtml(activeSiege, crystal);

assert.ok(hudHtml.includes('stronghold-siege-hud'), 'Renders .stronghold-siege-hud');
assert.ok(hudHtml.includes('WAVE 2 / 3'), 'Displays WAVE 2 / 3 badge');
assert.ok(hudHtml.includes('12000 / 15000 HP (80%)'), 'Displays crystal HP label and percentage');
assert.ok(hudHtml.includes('5 Foes Remaining'), 'Displays 5 Foes Remaining (8 total - 3 defeated)');
assert.ok(hudHtml.includes('var(--success)'), 'Uses green bar for >= 50% crystal HP');

// Damaged crystal colors
const lowCrystal = { hp: 3000, maxHp: 15000 }; // 20%
const lowHudHtml = ui.renderSiegeHudHtml(activeSiege, lowCrystal);
assert.ok(lowHudHtml.includes('var(--danger)'), 'Uses red bar for < 25% crystal HP');

const midCrystal = { hp: 6000, maxHp: 15000 }; // 40%
const midHudHtml = ui.renderSiegeHudHtml(activeSiege, midCrystal);
assert.ok(midHudHtml.includes('var(--warn)'), 'Uses orange bar for 25-49% crystal HP');

// 6. renderSiegeVictoryModalHtml results
assert.equal(ui.renderSiegeVictoryModalHtml(null), '', 'Returns empty string for null victoryResult');

const vicS = {
  grade: 'S',
  crystalHp: 14200,
  guildPoints: 100,
  zeny: 6000,
  commendations: 3,
  ore: 'blessed_ore',
  oreCount: 2,
};
const modalHtmlS = ui.renderSiegeVictoryModalHtml(vicS);
assert.ok(modalHtmlS.includes('siege-victory-overlay'), 'Renders .siege-victory-overlay');
assert.ok(modalHtmlS.includes('siege-victory-shell'), 'Renders .siege-victory-shell');
assert.ok(modalHtmlS.includes('Siege Victory!'), 'Header displays Siege Victory!');
assert.ok(modalHtmlS.includes('RANK S'), 'Displays RANK S crest');
assert.ok(modalHtmlS.includes('14200 HP Preserved'), 'Displays preserved crystal HP');
assert.ok(modalHtmlS.includes('+100 Guild Points'), 'Displays +100 Guild Points');
assert.ok(modalHtmlS.includes('+6000 Zeny'), 'Displays +6000 Zeny');
assert.ok(modalHtmlS.includes('+3× Guild Commendation'), 'Displays +3× Guild Commendation');
assert.ok(modalHtmlS.includes('+2× Blessed Ore'), 'Displays +2× Blessed Ore');
assert.ok(modalHtmlS.includes('data-claim-siege-spoils="1"'), 'Contains data-claim-siege-spoils button');
assert.ok(modalHtmlS.includes('Claim Commendations'), 'Button label says Claim Commendations');

const vicB = {
  grade: 'B',
  crystalHp: 2000,
  guildPoints: 35,
  zeny: 1800,
  commendations: 1,
  ore: null,
  oreCount: 0,
};
const modalHtmlB = ui.renderSiegeVictoryModalHtml(vicB);
assert.ok(modalHtmlB.includes('RANK B'), 'Displays RANK B crest');
assert.ok(modalHtmlB.includes('+35 Guild Points'), 'Displays +35 Guild Points');
assert.ok(!modalHtmlB.includes('Blessed Ore'), 'Rank B without ore does not render ore spoil');

// 7. Strict Boxing Containment checks
const renderedOutputs = [
  { name: 'Console HTML', html: consoleHtmlEmpty },
  { name: 'Siege HUD HTML', html: hudHtml },
  { name: 'Victory Modal HTML', html: modalHtmlS },
];

for (const { name, html } of renderedOutputs) {
  assert.ok(html.includes('box-sizing: border-box'), `${name} must include 'box-sizing: border-box'`);
  assert.ok(html.includes('min-width: 0'), `${name} must include 'min-width: 0'`);
  assert.ok(html.includes('overflow-x: hidden'), `${name} must include 'overflow-x: hidden'`);
}

console.log('✔ [PASSED] Stronghold UI unit tests passed successfully.');
