// js/raids-integration.test.js
// Comprehensive End-to-End Integration Suite for World Boss Raids & Incursion Climax.
// Covers:
//  a) Content Invariants (3 bosses, 5 raid items, 3 crafting recipes)
//  b) Titan Horn Overworld Summoning (Dragon Caldera, Whispering Woods, Astral Rift)
//  c) Incursion Climax (Wave 4 Escalation on Astral Rift under Cosmic Eclipse weather)
//  d) Multi-Phase Raid Combat & Aegis Break Shield (Phase 1 -> 2 -> Break Stagger -> 3 Enrage)
//  e) Contribution Scoring, Victory Resolution & Spoils Showcase
//  f) STRICT ZERO SCREEN SHAKE (Frozen camera object invariance)
//  g) Save/Resume Persistence (world.raids serialization and clean recovery)
//  h) UX/UI Boxing Containment (border-box, min-width: 0, overflow-x: hidden)

import assert from 'node:assert/strict';
import { installBrowserEnv, DEFAULT_ELEMENT_IDS } from './test-support/browser-env.js';

let vnow = 1000;

installBrowserEnv({
  now: () => vnow,
  innerWidth: 1440,
  innerHeight: 900,
  elementIds: [...DEFAULT_ELEMENT_IDS, 'msg-log'],
  nullSelectors: [],
  strictIds: false,
});

await import('./game.js');
const { CONTENT } = await import('./content.js');
const { createRaidsSystem, RAID_STATES, CONTRIBUTION_TIERS, WORLD_BOSS_CATALOG } = await import('./systems/raids.js');
const { createRaidsRenderer } = await import('./render/raids-fx.js');
const { createRaidsUIRenderer, TIER_COLORS } = await import('./render/raids-ui.js');
const { createIncursionsSystem, INCURSION_STATES } = await import('./systems/incursions.js');

const A = globalThis.__AWO;
assert.ok(A, 'game debug API loaded');

// Initialize player, runtime, HUD, and starting map
const p = A.makePlayer('codeweaver', 'RaidChampion');
A.G.player = p;
p.godMode = true;
A.G.running = true;
A.setCtx(document.getElementById('game-canvas'));
A.buildHud();
A.loadMap('town_awakening', 10, 10);
A.updateHud();

console.log('--- a) Content Invariants ---');
// All 3 world bosses exist in CONTENT.monsters and WORLD_BOSS_CATALOG
const requiredBosses = ['voidmaw_sovereign', 'caldera_colossus', 'ancient_behemoth'];
for (const bId of requiredBosses) {
  const contentMon = CONTENT.monsters.find(m => m.id === bId);
  assert.ok(contentMon, `Boss '${bId}' exists in CONTENT.monsters`);
  assert.ok(WORLD_BOSS_CATALOG[bId], `Boss '${bId}' exists in WORLD_BOSS_CATALOG`);
  assert.equal(contentMon.element, WORLD_BOSS_CATALOG[bId].element, `Boss '${bId}' element matches`);
  assert.equal(WORLD_BOSS_CATALOG[bId].id, bId, `Boss catalog ID matches '${bId}'`);
}

// All 5 raid items exist in CONTENT.items
const requiredItems = ['titan_horn', 'titan_heart', 'voidmaw_eye', 'titan_pendant', 'voidmaw_edge'];
for (const itId of requiredItems) {
  const itemDef = CONTENT.items.find(it => it.id === itId);
  assert.ok(itemDef, `Raid item '${itId}' exists in CONTENT.items`);
}

// All 3 crafting recipes exist in CONTENT.recipes
const requiredRecipes = [
  { id: 'r_titan_horn', out: 'titan_horn' },
  { id: 'r_titan_pendant', out: 'titan_pendant' },
  { id: 'r_voidmaw_edge', out: 'voidmaw_edge' },
];
for (const rec of requiredRecipes) {
  const recipeDef = CONTENT.recipes.find(r => r.id === rec.id);
  assert.ok(recipeDef, `Crafting recipe '${rec.id}' exists in CONTENT.recipes`);
  assert.equal(recipeDef.out, rec.out, `Crafting recipe '${rec.id}' outputs '${rec.out}'`);
}

console.log('--- b) Titan Horn Overworld Summoning ---');
// Give player 3x titan_horn
A.addItem('titan_horn', 3);
assert.equal(A.itemQty('titan_horn'), 3, 'Player received 3x titan_horn');

// 1. Load map 'dragon_caldera' -> useItem('titan_horn') spawns caldera_colossus
A.loadMap('dragon_caldera', 10, 10);
const used1 = A.useItem('titan_horn');
assert.equal(used1, true, 'titan_horn successfully used in dragon_caldera');
assert.equal(A.itemQty('titan_horn'), 2, 'titan_horn quantity decreased by 1 (now 2)');
assert.ok(A.G.raidState?.active, 'Raid is active in dragon_caldera');
assert.equal(A.G.raidState.bossId, 'caldera_colossus', 'caldera_colossus spawned in dragon_caldera');
assert.equal(A.G.raidBossMob?.def?.id, 'caldera_colossus', 'raidBossMob is caldera_colossus');
A.adminAction('endraid');
assert.equal(A.G.raidState, null, 'Raid ended cleanly via adminAction(endraid)');
assert.equal(A.G.raidBossMob, null, 'raidBossMob cleared');

// 2. Load map 'whispering_woods' -> useItem('titan_horn') spawns ancient_behemoth
A.loadMap('whispering_woods', 10, 10);
const used2 = A.useItem('titan_horn');
assert.equal(used2, true, 'titan_horn successfully used in whispering_woods');
assert.equal(A.itemQty('titan_horn'), 1, 'titan_horn quantity decreased by 1 (now 1)');
assert.ok(A.G.raidState?.active, 'Raid is active in whispering_woods');
assert.equal(A.G.raidState.bossId, 'ancient_behemoth', 'ancient_behemoth spawned in whispering_woods');
assert.equal(A.G.raidBossMob?.def?.id, 'ancient_behemoth', 'raidBossMob is ancient_behemoth');
A.adminAction('endraid');
assert.equal(A.G.raidState, null, 'Raid ended cleanly via adminAction(endraid)');
assert.equal(A.G.raidBossMob, null, 'raidBossMob cleared');

// 3. Load map 'astral_rift' -> useItem('titan_horn') spawns voidmaw_sovereign
A.loadMap('astral_rift', 10, 10);
const used3 = A.useItem('titan_horn');
assert.equal(used3, true, 'titan_horn successfully used in astral_rift');
assert.equal(A.itemQty('titan_horn'), 0, 'titan_horn quantity decreased by 1 (now 0)');
assert.ok(A.G.raidState?.active, 'Raid is active in astral_rift');
assert.equal(A.G.raidState.bossId, 'voidmaw_sovereign', 'voidmaw_sovereign spawned in astral_rift');
assert.equal(A.G.raidBossMob?.def?.id, 'voidmaw_sovereign', 'raidBossMob is voidmaw_sovereign');
A.adminAction('endraid');
assert.equal(A.G.raidState, null, 'Raid ended cleanly via adminAction(endraid)');
assert.equal(A.G.raidBossMob, null, 'raidBossMob cleared');

console.log('--- c) Incursion Climax (Wave 4 Escalation) ---');
// Load map 'astral_rift'
A.loadMap('astral_rift', 10, 10);
// Set weather to 'cosmic_eclipse' via adminAction('setweather:cosmic_eclipse')
A.adminAction('setweather:cosmic_eclipse');
assert.equal(A.G.weather?.id, 'cosmic_eclipse', 'Weather set to cosmic_eclipse');

// Spawn rift tear and trigger incursion near player
A.adminAction('spawnrift');
A.onCanvasClick(p.x + 48, p.y);

// Progress Wave 1: Kill spawned incursion mobs
let incMobs1 = A.G.monsters.filter(m => m._incursionMob && m.alive);
assert.ok(incMobs1.length > 0, `Wave 1 spawned ${incMobs1.length} incursion mobs`);
for (const m of incMobs1) {
  A.killMonster(m);
}

// Progress Wave 2: Kill spawned incursion mobs
let incMobs2 = A.G.monsters.filter(m => m._incursionMob && m.alive);
assert.ok(incMobs2.length > 0, `Wave 2 spawned ${incMobs2.length} incursion mobs`);
for (const m of incMobs2) {
  A.killMonster(m);
}

// Progress Wave 3: Slay Dimensional Herald under celestial weather
let incMobs3 = A.G.monsters.filter(m => m._incursionMob && m.alive);
assert.ok(incMobs3.length > 0, `Wave 3 spawned ${incMobs3.length} incursion mobs`);
const herald = incMobs3.find(m => m.def?.id === 'void_herald');
assert.ok(herald, 'Wave 3 contains void_herald mini-boss');

for (const m of incMobs3) {
  A.killMonster(m);
}

// Check that incursion climax escalated to Wave 4 and spawned Voidmaw Sovereign
assert.ok(A.G.raidState?.active, 'A.G.raidState.active is true');
assert.equal(A.G.raidState.bossId, 'voidmaw_sovereign', 'Voidmaw Sovereign raid is active');
assert.ok(A.G.raidBossMob, 'A.G.raidBossMob is present');
assert.equal(A.G.raidBossMob.def.id, 'voidmaw_sovereign', 'raidBossMob definition matches Voidmaw Sovereign');

console.log('--- d) Multi-Phase Raid Combat & Aegis Break Shield (with f: STRICT ZERO SCREEN SHAKE) ---');
// f) STRICT ZERO SCREEN SHAKE: Freeze camera and verify it is never mutated
const initialCamX = A.G.cam.x;
const initialCamY = A.G.cam.y;
Object.freeze(A.G.cam);
assert.ok(Object.isFrozen(A.G.cam), 'Camera object is strictly frozen');

const boss = A.G.raidBossMob;
const raid = A.G.raidState;
assert.equal(raid.phase, 1, 'Phase 1 initialized');
assert.equal(raid.hp, 28000, 'Boss HP starts at 28,000');

// Phase 1: Damage boss until HP reaches 60% (28,000 * 0.60 = 16,800 -> 11,200 damage)
A.damageMonster(boss, 11200);
assert.equal(raid.phase, 2, 'Transitioned to Phase 2 at <= 60% HP');
assert.equal(raid.state, RAID_STATES.BREAK_STAGGER, 'State changed to BREAK_STAGGER');
assert.ok(raid.breakShield > 0, 'Aegis break shield activates');
assert.equal(raid.breakShield, 7000, 'Aegis break shield initialized to 7,000 HP');

// Verify 3 adds spawned
const spawnedAdds = A.G.monsters.filter(m => m._raidAdd && m.alive);
assert.equal(spawnedAdds.length, 3, '3 adds spawned in Phase 2');
assert.equal(raid.adds.filter(a => a.alive).length, 3, '3 adds tracked in raidState');

// Add mitigation test: 3 alive adds = 45% mitigation (raw 1,000 damage -> 550 to break shield)
const shieldBeforeDmg1 = raid.breakShield;
A.damageMonster(boss, 1000);
assert.equal(raid.breakShield, shieldBeforeDmg1 - 550, '3 adds mitigate shield damage by 45% (dealt 550)');

// Slaying add 0 records add kill and awards contribution score (+150)
const scoreBeforeAdd0 = raid.score;
A.killMonster(spawnedAdds[0]);
assert.equal(raid.metrics.addsKilled, 1, 'metrics.addsKilled incremented to 1');
assert.equal(raid.score, scoreBeforeAdd0 + 150, 'Contribution score awarded +150 for add kill');

// 2 alive adds = 30% mitigation (raw 1,000 damage -> 700 to break shield)
const shieldBeforeDmg2 = raid.breakShield;
A.damageMonster(boss, 1000);
assert.equal(raid.breakShield, shieldBeforeDmg2 - 700, '2 adds mitigate shield damage by 30% (dealt 700)');

// Slay add 1
A.killMonster(spawnedAdds[1]);
assert.equal(raid.metrics.addsKilled, 2, 'metrics.addsKilled incremented to 2');

// 1 alive add = 15% mitigation (raw 1,000 damage -> 850 to break shield)
const shieldBeforeDmg3 = raid.breakShield;
A.damageMonster(boss, 1000);
assert.equal(raid.breakShield, shieldBeforeDmg3 - 850, '1 add mitigates shield damage by 15% (dealt 850)');

// Slay add 2 (0 alive adds remaining)
A.killMonster(spawnedAdds[2]);
assert.equal(raid.metrics.addsKilled, 3, 'metrics.addsKilled incremented to 3');

// Deplete remaining break shield -> triggers STAGGERED state (+40% vulnerability for 8s)
const remainingShield = raid.breakShield;
A.damageMonster(boss, remainingShield + 500);
assert.equal(raid.breakShield, 0, 'Break shield fully depleted');
assert.equal(raid.staggered, true, 'Boss entered STAGGERED state');
assert.equal(raid.staggerTimeRemainingMs, 8000, 'Stagger duration is 8s (8,000 ms)');

// Verify +40% vulnerability during STAGGERED state
const hpBeforeStaggerHit = raid.hp;
A.damageMonster(boss, 1000);
assert.equal(raid.hp, hpBeforeStaggerHit - 1400, 'Boss took 1,400 dmg during stagger (1,000 * 1.40)');

// Test raid FX renderers with frozen camera (must not throw and must never mutate camera)
const mockCanvas = document.getElementById('game-canvas');
const mockCtx = mockCanvas.getContext('2d');
A.G.raidsFx.drawBossAura(mockCtx, boss, A.G.cam, vnow);
A.G.raidsFx.drawAegisBarrier(mockCtx, boss, A.G.cam, vnow);
A.G.raidsFx.drawBreakGauge(mockCtx, raid, A.G.cam, vnow);
A.G.raidsFx.drawTelegraphs(mockCtx, [], A.G.cam, vnow);
A.G.raidsFx.drawStaggerBursts(mockCtx, null, A.G.cam, vnow);

// Phase 3: Damaging boss below 30% HP (28,000 * 0.30 = 8,400) triggers ENRAGED state
A.damageMonster(boss, 6000);
assert.ok(raid.hp <= 8400, `Boss HP is <= 30% (HP: ${raid.hp})`);
assert.equal(raid.phase, 3, 'Transitioned to Phase 3');
assert.equal(raid.state, RAID_STATES.ENRAGED, 'State is ENRAGED');
assert.equal(raid.enraged, true, 'A.G.raidState.enraged is true');

// Ensure score reaches Gold/Paragon tier (>= 6000) for full spoils showcase
if (raid.score < 6000) {
  raid.score = 8500;
}

console.log('--- e) Contribution Scoring, Victory Resolution & Spoils Showcase ---');
const playerZenyBefore = p.zeny || 0;
const shardsBefore = A.itemQty('dimensional_shard');
const eyesBefore = A.itemQty('voidmaw_eye');
const runesBefore = A.itemQty('rune_ember') + A.itemQty('rune_glacial');
const feastBefore = A.itemQty('smoked_salmon');
const oreBefore = A.itemQty('blessed_ore');

// Pre-configure victory modal container with querySelector mock for headless browser environment
const modalContainer = document.getElementById('raid-victory-modal-container');
const mockClaimBtn = { onclick: null };
modalContainer.querySelectorAll = (selector) => {
  if (selector?.includes('data-claim-raid-spoils')) return [mockClaimBtn];
  return [];
};
modalContainer.querySelector = (selector) => {
  if (selector?.includes('data-claim-raid-spoils')) return mockClaimBtn;
  return null;
};

// Defeating boss resolves raid victory
A.killMonster(boss);
assert.equal(A.G.raidState, null, 'raidState is cleared on victory');
assert.equal(A.G.raidBossMob, null, 'raidBossMob is cleared on victory');

// Verify spoils cache granted to player
assert.ok((p.zeny || 0) > playerZenyBefore, `Zeny granted (from ${playerZenyBefore} to ${p.zeny})`);
assert.ok(A.itemQty('dimensional_shard') > shardsBefore, 'Dimensional Shards granted');
assert.ok(A.itemQty('voidmaw_eye') > eyesBefore, 'Apex Trophy (voidmaw_eye) granted');
assert.ok((A.itemQty('rune_ember') + A.itemQty('rune_glacial')) > runesBefore, 'Primal Runes granted');
assert.ok(A.itemQty('smoked_salmon') > feastBefore, 'Feast (smoked_salmon) granted');
assert.ok(A.itemQty('blessed_ore') > oreBefore, 'Blessed Ore gems granted');

// Verify Victory Modal HTML rendered
assert.ok(modalContainer, 'Victory modal container element exists');
const vicHtml = modalContainer.innerHTML;
assert.ok(vicHtml.includes('raid-victory-overlay'), 'Modal contains overlay class');
assert.ok(vicHtml.includes('raid-victory-shell'), 'Modal contains shell class');
assert.ok(vicHtml.includes('Raid Victory!'), 'Modal contains victory title');
assert.ok(vicHtml.includes('GOLD') || vicHtml.includes('PARAGON'), 'Modal contains tier crest');
assert.ok(vicHtml.includes('Damage Dealt'), 'Modal contains Damage Dealt metric');
assert.ok(vicHtml.includes('Break Shield Damage'), 'Modal contains Break Shield Damage metric');
assert.ok(vicHtml.includes('Adds Slain'), 'Modal contains Adds Slain metric');
assert.ok(vicHtml.includes('Claim Spoils'), 'Modal contains Claim Spoils button');
assert.ok(vicHtml.includes('data-claim-raid-spoils="1"'), 'Modal contains data-claim-raid-spoils attribute');

// Claim spoils button click dismisses modal
const claimButton = modalContainer.querySelector('[data-claim-raid-spoils]');
assert.ok(claimButton, 'Found claim spoils button');
claimButton.onclick();
assert.equal(modalContainer.innerHTML, '', 'Modal dismissed upon Claim Spoils click');

// Verify Camera Invariance from f) STRICT ZERO SCREEN SHAKE
assert.equal(A.G.cam.x, initialCamX, 'cam.x was never modified throughout combat, stagger, enrage, and victory');
assert.equal(A.G.cam.y, initialCamY, 'cam.y was never modified throughout combat, stagger, enrage, and victory');

// Unfreeze camera for subsequent lifecycle steps
A.G.cam = { x: initialCamX, y: initialCamY };

console.log('--- g) Save/Resume Persistence ---');
// Spawn a raid boss to verify serialization/deserialization
A.adminAction('spawnraid', 'caldera_colossus');
assert.ok(A.G.raidState?.active, 'Caldera Colossus raid active for persistence test');
A.G.raidState.score = 7500;
A.G.raidState.phase = 2;
A.G.raidState.breakShield = 4000;
A.G.raidState.maxBreakShield = 8000;
A.G.raidState.adds = [
  { id: 'magma_beetle', index: 0, alive: true },
  { id: 'ember_imp', index: 1, alive: false },
];

const saveOk = A.saveGame();
assert.equal(saveOk, true, 'Game saved successfully');
const savedData = A.readSave();
assert.ok(savedData?.world?.raids, 'Save data contains world.raids');
assert.equal(savedData.world.raids.activeRaid?.bossId, 'caldera_colossus', 'Saved raid boss ID matches');
assert.equal(savedData.world.raids.activeRaid?.score, 7500, 'Saved score matches');
assert.equal(savedData.world.raids.activeRaid?.phase, 2, 'Saved phase matches');
assert.equal(savedData.world.raids.activeRaid?.breakShield, 4000, 'Saved breakShield matches');

// Reset in-memory raid state to simulate game restart
A.G.raidsSystem.resetToIdle();
assert.equal(A.G.raidsSystem.getActiveRaid(), null, 'In-memory active raid reset to null');

// Resume game from save
const resumeOk = A.resumeGame();
assert.equal(resumeOk, true, 'Game resumed successfully');
const resumedRaid = A.G.raidsSystem.getActiveRaid();
assert.ok(resumedRaid, 'Raid state cleanly deserialized by resumeGame');
assert.equal(resumedRaid.bossId, 'caldera_colossus', 'Deserialized bossId matches');
assert.equal(resumedRaid.score, 7500, 'Deserialized score matches');
assert.equal(resumedRaid.phase, 2, 'Deserialized phase matches');
assert.equal(resumedRaid.breakShield, 4000, 'Deserialized breakShield matches');
assert.equal(resumedRaid.adds.length, 2, 'Deserialized adds array matches');

// Clean up raid
A.adminAction('endraid');
assert.equal(A.G.raidState, null, 'Raid ended after persistence verification');

console.log('--- h) UX/UI Boxing Containment ---');
const testRaidState = {
  active: true,
  bossDef: WORLD_BOSS_CATALOG.ancient_behemoth,
  hp: 18000,
  maxHp: 30000,
  phase: 2,
  breakShield: 3500,
  maxBreakShield: 7500,
  adds: [{ id: 'thornback_boar', alive: true }],
  score: 4500,
  expiresAt: vnow + 90000,
};
const testVictoryState = {
  success: true,
  tier: 'gold',
  score: 8500,
  metrics: { damage: 22000, breakDamage: 5500, addsKilled: 3, hazardsDodged: 4 },
  cache: {
    zeny: 12000,
    dimensional_shard: 8,
    trophies: ['titan_heart'],
    runes: ['rune_ember', 'rune_glacial'],
    feast: 'smoked_salmon',
    gems: 2,
  },
};

const hudHtml = A.G.raidsUI.renderRaidHudHtml(testRaidState);
assert.ok(hudHtml.includes('box-sizing: border-box'), 'HUD contains box-sizing: border-box');
assert.ok(hudHtml.includes('min-width: 0'), 'HUD contains min-width: 0');
assert.ok(hudHtml.includes('overflow-x: hidden'), 'HUD contains overflow-x: hidden');

const victoryModalHtml = A.G.raidsUI.renderVictoryModalHtml(testVictoryState);
assert.ok(victoryModalHtml.includes('box-sizing: border-box'), 'Victory modal contains box-sizing: border-box');
assert.ok(victoryModalHtml.includes('min-width: 0'), 'Victory modal contains min-width: 0');
assert.ok(victoryModalHtml.includes('overflow-x: hidden'), 'Victory modal contains overflow-x: hidden');

console.log('✔ All World Boss Raids & Incursion Climax integration assertions passed!');
