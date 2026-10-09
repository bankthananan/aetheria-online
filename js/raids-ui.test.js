// js/raids-ui.test.js
// Unit tests for World Boss Raid Encounter HUD & Victory Modal UI Renderer.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRaidsUIRenderer, TIER_COLORS, getContributionTier, formatRaidTimer } from './render/raids-ui.js';
import { WORLD_BOSS_CATALOG, CONTRIBUTION_TIERS, RAID_STATES } from './systems/raids.js';

test('1. createRaidsUIRenderer factory creates renderer methods', () => {
  const ui = createRaidsUIRenderer();
  assert.ok(typeof ui === 'object' && ui !== null, 'factory returns an object');
  assert.equal(typeof ui.renderRaidHudHtml, 'function', 'renderRaidHudHtml is a function');
  assert.equal(typeof ui.renderVictoryModalHtml, 'function', 'renderVictoryModalHtml is a function');
});

test('2. renderRaidHudHtml returns empty string when raidState is null or inactive', () => {
  const ui = createRaidsUIRenderer();
  assert.equal(ui.renderRaidHudHtml(null), '', 'returns empty string on null');
  assert.equal(ui.renderRaidHudHtml(undefined), '', 'returns empty string on undefined');
  assert.equal(ui.renderRaidHudHtml({}), '', 'returns empty string on empty object');
  assert.equal(ui.renderRaidHudHtml({ active: false }), '', 'returns empty string on active: false');
  assert.equal(ui.renderRaidHudHtml({ active: false, hp: 1000 }), '', 'returns empty string when inactive with hp');
});

test('3. renderRaidHudHtml generates boss header, element badge, segmented HP bar with 60% and 30% phase dividers, and countdown timer', () => {
  const ui = createRaidsUIRenderer();
  const testNow = 1000000;
  const raidState = {
    active: true,
    bossId: 'caldera_colossus',
    bossDef: {
      id: 'caldera_colossus',
      name: 'Caldera Colossus',
      element: 'fire',
      maxHp: 32000,
    },
    hp: 24000,
    maxHp: 32000,
    breakShield: 0,
    maxBreakShield: 8000,
    score: 1200,
    _now: testNow,
    expiresAt: testNow + 125000, // 2 minutes 5 seconds -> 2:05
  };

  const html = ui.renderRaidHudHtml(raidState);

  // Boss title & element badge
  assert.ok(html.includes('Caldera Colossus'), 'contains boss name');
  assert.ok(html.includes('[FIRE]'), 'contains uppercase element badge');

  // HP bar and percentage
  assert.ok(html.includes('75%'), 'displays 75% HP percentage');
  assert.ok(html.includes('24,000') || html.includes('24000'), 'displays current HP');
  assert.ok(html.includes('32,000') || html.includes('32000'), 'displays max HP');

  // Phase dividers at 60% and 30%
  assert.ok(html.includes('60%'), 'includes 60% phase divider marker');
  assert.ok(html.includes('30%'), 'includes 30% phase divider marker');
  assert.ok(html.includes('Phase 2 Break Shield') || html.includes('raid-marker-60'), 'indicates Phase 2 Break Shield marker');
  assert.ok(html.includes('Phase 3 Apex Enrage') || html.includes('raid-marker-30'), 'indicates Phase 3 Apex Enrage marker');

  // Countdown timer
  assert.ok(html.includes('2:05'), 'contains formatted M:SS timer display');
  assert.ok(html.includes('⏳') || html.includes('⏱'), 'contains hourglass or clock icon');
});

test('4. renderRaidHudHtml renders break shield bar with active add mitigation badge during Phase 2', () => {
  const ui = createRaidsUIRenderer();
  const raidState = {
    active: true,
    phase: 2,
    bossDef: {
      name: 'Voidmaw Sovereign',
      element: 'void',
      maxHp: 28000,
    },
    hp: 16000,
    maxHp: 28000,
    breakShield: 5000,
    maxBreakShield: 7000,
    adds: [
      { id: 'void_stalker', alive: true },
      { id: 'void_wisp', alive: true },
      { id: 'void_stalker', alive: false },
    ],
    score: 3000,
    expiresAt: Date.now() + 60000,
  };

  const html = ui.renderRaidHudHtml(raidState);

  // Break shield presence & values
  assert.ok(html.includes('raid-break-shield') || html.includes('raid-break-bar'), 'renders break shield container');
  assert.ok(html.includes('5,000') || html.includes('5000'), 'shows current break shield value');
  assert.ok(html.includes('7,000') || html.includes('7000'), 'shows max break shield value');
  assert.ok(html.includes('🛡'), 'shows shield icon');

  // Active add mitigation badge (2 alive adds = 2 * 15% = 30%)
  assert.ok(html.includes('+30%'), 'shows +30% active add mitigation badge');

  // When breakShield is 0, no break shield bar is rendered
  const noBreakRaid = { ...raidState, breakShield: 0 };
  const noBreakHtml = ui.renderRaidHudHtml(noBreakRaid);
  assert.ok(!noBreakHtml.includes('raid-break-fill'), 'no break shield bar rendered when breakShield is 0');
});

test('5. renderRaidHudHtml renders score and contribution tier badges (Bronze, Silver, Gold, Paragon)', () => {
  const ui = createRaidsUIRenderer();
  const baseRaid = {
    active: true,
    bossDef: { name: 'Ancient Behemoth', element: 'nature', maxHp: 30000 },
    hp: 30000,
    maxHp: 30000,
    breakShield: 0,
    maxBreakShield: 7500,
    expiresAt: Date.now() + 60000,
  };

  // Bronze (< 2500)
  const bronzeHtml = ui.renderRaidHudHtml({ ...baseRaid, score: 1500 });
  assert.ok(bronzeHtml.includes('[BRONZE]'), 'renders [BRONZE] badge');
  assert.ok(bronzeHtml.includes(TIER_COLORS.bronze), 'renders bronze tier color');
  assert.ok(bronzeHtml.includes('1,500') || bronzeHtml.includes('1500'), 'displays bronze score');

  // Silver (2500 - 5999)
  const silverHtml = ui.renderRaidHudHtml({ ...baseRaid, score: 3500 });
  assert.ok(silverHtml.includes('[SILVER]'), 'renders [SILVER] badge');
  assert.ok(silverHtml.includes(TIER_COLORS.silver), 'renders silver tier color');
  assert.ok(silverHtml.includes('3,500') || silverHtml.includes('3500'), 'displays silver score');

  // Gold (6000 - 11999)
  const goldHtml = ui.renderRaidHudHtml({ ...baseRaid, score: 8000 });
  assert.ok(goldHtml.includes('[GOLD]'), 'renders [GOLD] badge');
  assert.ok(goldHtml.includes(TIER_COLORS.gold), 'renders gold tier color');
  assert.ok(goldHtml.includes('8,000') || goldHtml.includes('8000'), 'displays gold score');

  // Paragon (>= 12000)
  const paragonHtml = ui.renderRaidHudHtml({ ...baseRaid, score: 15000 });
  assert.ok(paragonHtml.includes('[PARAGON]'), 'renders [PARAGON] badge');
  assert.ok(paragonHtml.includes(TIER_COLORS.paragon), 'renders paragon tier color');
  assert.ok(paragonHtml.includes('15,000') || paragonHtml.includes('15000'), 'displays paragon score');
});

test('6. renderVictoryModalHtml generates modal shell, tier crest, performance breakdown grid, spoils showcase, and claim spoils button', () => {
  const ui = createRaidsUIRenderer();

  // Null input
  assert.equal(ui.renderVictoryModalHtml(null), '', 'returns empty string on null');
  assert.equal(ui.renderVictoryModalHtml(undefined), '', 'returns empty string on undefined');

  const victoryResult = {
    success: true,
    tier: 'gold',
    score: 8500,
    metrics: {
      damage: 22000,
      breakDamage: 5500,
      addsKilled: 3,
      hazardsDodged: 4,
    },
    cache: {
      zeny: 12000,
      dimensional_shard: 8,
      trophies: ['titan_heart'],
      runes: ['rune_ember', 'rune_glacial'],
      feast: 'smoked_salmon',
      gems: 2,
    },
  };

  const html = ui.renderVictoryModalHtml(victoryResult);

  // Shell and header
  assert.ok(html.includes('raid-victory-overlay'), 'contains overlay class');
  assert.ok(html.includes('raid-victory-shell'), 'contains shell class');
  assert.ok(html.includes('Raid Victory!'), 'contains victory title');
  assert.ok(html.includes('🏆'), 'contains victory trophy icon');

  // Tier Crest Badge
  assert.ok(html.includes('GOLD'), 'contains GOLD tier badge');
  assert.ok(html.includes('Contribution Score: 8500') || html.includes('Contribution Score'), 'contains Contribution Score');
  assert.ok(html.includes('8500'), 'contains score number');

  // Performance Breakdown Grid
  assert.ok(html.includes('Damage Dealt'), 'contains Damage Dealt metric');
  assert.ok(html.includes('22,000') || html.includes('22000'), 'contains damage value');
  assert.ok(html.includes('Break Shield Damage'), 'contains Break Shield Damage metric');
  assert.ok(html.includes('5,500') || html.includes('5500'), 'contains break damage value');
  assert.ok(html.includes('Adds Slain'), 'contains Adds Slain metric');
  assert.ok(html.includes('3'), 'contains adds killed count');
  assert.ok(html.includes('Hazards Dodged'), 'contains Hazards Dodged metric');
  assert.ok(html.includes('4'), 'contains hazards dodged count');

  // Spoils Showcase Grid
  assert.ok(html.includes('12000 Zeny') || html.includes('12,000 Zeny'), 'shows Zeny spoils');
  assert.ok(html.includes('8× Shards'), 'shows Dimensional Shards spoils');
  assert.ok(html.includes('Heart of the Colossus') && !html.includes('titan_heart'), 'shows apex trophies spoils');
  assert.ok(html.includes('Ember Rune, Glacial Rune'), 'shows primal runes spoils');
  assert.ok(html.includes('Smoked Salmon'), 'shows feast spoils');
  assert.ok(html.includes('2× Blessed Ore'), 'shows gems spoils');

  // Action and Close buttons with data-claim-raid-spoils
  assert.ok(html.includes('raid-claim-btn'), 'contains claim button class');
  assert.ok(html.includes('data-claim-raid-spoils="1"'), 'claim button has data-claim-raid-spoils="1"');
  assert.ok(html.includes('Claim Spoils'), 'claim button text');
  assert.ok(html.includes('raid-modal-close'), 'contains close button class');
  assert.ok(html.includes('✕'), 'contains close button icon');
});

test('7. Strict Boxing Containment: verify containment CSS on HUD and Victory Modal', () => {
  const ui = createRaidsUIRenderer();
  const raidState = {
    active: true,
    bossDef: { name: 'Caldera Colossus', element: 'fire', maxHp: 32000 },
    hp: 20000,
    maxHp: 32000,
    breakShield: 3000,
    maxBreakShield: 8000,
    adds: [{ alive: true }],
    score: 5000,
    expiresAt: Date.now() + 60000,
  };

  const victoryResult = {
    tier: 'paragon',
    score: 15000,
    metrics: { damage: 30000, breakDamage: 8000, addsKilled: 5, hazardsDodged: 6 },
    cache: {
      zeny: 25000,
      dimensional_shard: 15,
      trophies: ['titan_heart'],
      runes: ['rune_ember'],
      feast: 'golden_carp_sashimi',
      gems: 4,
    },
  };

  const hudHtml = ui.renderRaidHudHtml(raidState);
  const modalHtml = ui.renderVictoryModalHtml(victoryResult);

  // HUD Strict Boxing Containment
  assert.ok(hudHtml.includes('raid-encounter-hud'), 'HUD has raid-encounter-hud class');
  assert.ok(hudHtml.includes('box-sizing: border-box'), 'HUD uses box-sizing: border-box');
  assert.ok(hudHtml.includes('min-width: 0'), 'HUD uses min-width: 0');
  assert.ok(hudHtml.includes('overflow-x: hidden'), 'HUD uses overflow-x: hidden');
  assert.ok(hudHtml.includes('width: 100%'), 'HUD uses width: 100%');
  assert.ok(hudHtml.includes('max-width: 100%'), 'HUD uses max-width: 100%');

  // Modal Strict Boxing Containment
  assert.ok(modalHtml.includes('raid-victory-overlay'), 'Modal has raid-victory-overlay class');
  assert.ok(modalHtml.includes('raid-victory-shell'), 'Modal has raid-victory-shell class');
  assert.ok(modalHtml.includes('box-sizing: border-box'), 'Modal uses box-sizing: border-box');
  assert.ok(modalHtml.includes('min-width: 0'), 'Modal uses min-width: 0');
  assert.ok(modalHtml.includes('overflow-x: hidden'), 'Modal uses overflow-x: hidden');
  assert.ok(modalHtml.includes('max-width: 520px'), 'Modal shell specifies max-width: 520px');
});
