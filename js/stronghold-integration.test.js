// js/stronghold-integration.test.js
// Comprehensive End-to-End Integration Suite for Guild Stronghold & Hall of Trophies.
// Covers:
//  a) Content Invariants (5 siege monsters, 2 items, map with portals and npcs)
//  b) Town Gate & Access Gate Invariant (Rank D entry check, door/warp)
//  c) Facility Progression & Passive Wireup (Tiers 0->1, expMult bonus, daily stipend)
//  d) Hall of Trophies & Account-Wide Auras (4 pedestals, perks wireup, unmount revert)
//  e) Central Crystal Siege Defense Encounter (Waves 1-3, aggro intercept, Rank S victory, spoils)
//  f) STRICT ZERO SCREEN SHAKE (Frozen camera object invariance throughout combat, FX, wave transitions)
//  g) Save/Resume Persistence & Clean Session Disconnect (world.stronghold, idle reset on reload)
//  h) UX/UI Boxing Containment (box-sizing: border-box, min-width: 0, overflow-x: hidden)

import assert from 'node:assert/strict';
import { installBrowserEnv, DEFAULT_ELEMENT_IDS } from './test-support/browser-env.js';

let vnow = 1000;
installBrowserEnv({
  now: () => vnow,
  innerWidth: 1440,
  innerHeight: 900,
  elementIds: [...DEFAULT_ELEMENT_IDS, 'msg-log', 'stronghold-hud-slot'],
  nullSelectors: [],
  strictIds: false,
});

const { CONTENT } = await import('./content.js');
await import('./game.js');
const {
  FACILITY_DEFINITIONS,
  TROPHY_PEDESTAL_DEFINITIONS,
  SIEGE_WAVE_TEMPLATES,
  SIEGE_REWARDS,
  createStrongholdSystem,
} = await import('./systems/stronghold.js');
const { createStrongholdRenderer } = await import('./render/stronghold-fx.js');
const { createStrongholdUIRenderer } = await import('./render/stronghold-ui.js');
const { MAPS } = await import('./maps.js');

const A = globalThis.__AWO;
assert.ok(A, 'game debug API loaded');

if (!A.startStrongholdSiege) {
  A.startStrongholdSiege = () => A.G.startStrongholdSiege();
}

// Set up test player
const p = A.makePlayer('reborn_blade', 'StrongholdChampion');
A.G.player = p;
p.godMode = true;
A.G.running = true;
A.setCtx(document.getElementById('game-canvas'));
A.buildHud();
A.loadMap('town_awakening', 10, 10);
A.updateHud();

console.log('--- a) Content Invariants ---');
// 1. 5 siege monsters exist in CONTENT.monsters
const expectedSiegeMonsters = [
  'siege_grunt',
  'siege_hound',
  'siege_sapper',
  'siege_archer',
  'siege_warlord_boss',
];
for (const mobId of expectedSiegeMonsters) {
  const mobDef = CONTENT.monsters.find(m => m.id === mobId);
  assert.ok(mobDef, `Siege monster '${mobId}' exists in CONTENT.monsters`);
  assert.equal(mobDef.id, mobId);
  assert.ok(mobDef.name, `Monster '${mobId}' has name`);
  assert.ok(mobDef.level >= 60, `Monster '${mobId}' level is >= 60 (endgame level: ${mobDef.level})`);
}

// 2. Stronghold materials and gear exist in CONTENT.items
const expectedItems = [
  'guild_commendation',
  'stronghold_banner',
  'iron_ore',
  'beast_fang',
  'essence_fire',
  'hardwood',
];
for (const itemId of expectedItems) {
  const itemDef = CONTENT.items.find(i => i.id === itemId);
  assert.ok(itemDef, `Item '${itemId}' exists in CONTENT.items`);
  assert.equal(itemDef.id, itemId);
  assert.ok(itemDef.name, `Item '${itemId}' has name`);
}

// 3. Map 'guild_stronghold' exists in MAPS
assert.ok(MAPS.guild_stronghold, "Map 'guild_stronghold' exists in MAPS");
assert.equal(MAPS.guild_stronghold.width, 32, 'Map width is 32');
assert.equal(MAPS.guild_stronghold.height, 24, 'Map height is 24');

// Exit portal exists
const exitPortal = MAPS.guild_stronghold.portals.find(pt => pt.toMap === 'town_awakening');
assert.ok(exitPortal, 'Exit portal to town_awakening exists in guild_stronghold');
assert.equal(exitPortal.x, 16);
assert.equal(exitPortal.y, 23);

// NPCs exist
assert.ok(MAPS.guild_stronghold.npcs.length >= 3, 'guild_stronghold has npcs');
const expectedNpcRoles = ['craft', 'banker', 'tactician'];
for (const role of expectedNpcRoles) {
  const npc = MAPS.guild_stronghold.npcs.find(n => n.role === role);
  assert.ok(npc, `NPC with role '${role}' exists in guild_stronghold`);
}

console.log('--- b) Town Gate & Access Gate Invariant ---');
const TS = 32;
// Ensure in town_awakening
A.loadMap('town_awakening', 10, 10);
assert.equal(A.G.mapId, 'town_awakening');

// Player with guildRankIdx = 0 (below Rank D) interacting with door (27, 21) cannot enter
A.G.guildRankIdx = 0;
A.G.player.x = 27 * TS;
A.G.player.y = 21 * TS;
A.G.lastPortalAt = 0;
vnow += 1000;
A.step(0.016);
assert.equal(A.G.mapId, 'town_awakening', 'Player with guildRankIdx = 0 cannot enter stronghold');

// Advance A.G.guildRankIdx to 2 (Rank D): warp succeeds
A.G.guildRankIdx = 2;
A.loadMap('guild_stronghold', 16, 22);
assert.equal(A.G.mapId, 'guild_stronghold', 'Warp to guild_stronghold succeeds with guildRankIdx = 2');

// Door interaction with canonical Rank D index succeeds as well
A.loadMap('town_awakening', 10, 10);
A.G.guildRankIdx = A.GUILD_RANKS.indexOf('D');
A.G.player.x = 27 * TS;
A.G.player.y = 21 * TS;
A.G.lastPortalAt = 0;
vnow += 1000;
A.step(0.016);
assert.equal(A.G.mapId, 'guild_stronghold', 'Door interaction with Rank D enters guild_stronghold');

console.log('--- c) Facility Progression & Passive Wireup ---');
// Ensure on guild_stronghold map
A.loadMap('guild_stronghold', 16, 22);

// Provide resources
A.G.guildPoints = 500;
A.G.player.zeny = 100000;
A.G.player.inventory.push(
  { itemId: 'iron_ore', qty: 50 },
  { itemId: 'wood', qty: 50 },
  { itemId: 'hardwood', qty: 50 }
);

// Reset facility tiers to 0 initially
A.G.strongholdSystem.deserialize({
  facilities: { treasury: 0, forge: 0, conservatory: 0, training: 0 },
  trophies: {},
  lastStipendClaimAt: 0,
});
A.recompute(A.G.player);
assert.equal(A.G.player.expMult || 1.0, 1.0, 'Baseline expMult is 1.0');

// Upgrade Treasury Vault, Guild Forge, Conservatory, Training Grounds to Tier 1
const deductGP = pts => { A.G.guildPoints -= pts; };
const upTreasury = A.G.strongholdSystem.upgradeFacility('treasury', A.G.player, A.G.guildPoints, deductGP);
assert.equal(upTreasury.success, true, 'Treasury upgraded to Tier 1');

const upForge = A.G.strongholdSystem.upgradeFacility('forge', A.G.player, A.G.guildPoints, deductGP);
assert.equal(upForge.success, true, 'Guild Forge upgraded to Tier 1');

const upConservatory = A.G.strongholdSystem.upgradeFacility('conservatory', A.G.player, A.G.guildPoints, deductGP);
assert.equal(upConservatory.success, true, 'Conservatory upgraded to Tier 1');

const upTraining = A.G.strongholdSystem.upgradeFacility('training', A.G.player, A.G.guildPoints, deductGP);
assert.equal(upTraining.success, true, 'Training Grounds upgraded to Tier 1');

assert.equal(A.G.strongholdSystem.getFacilityTier('treasury'), 1);
assert.equal(A.G.strongholdSystem.getFacilityTier('forge'), 1);
assert.equal(A.G.strongholdSystem.getFacilityTier('conservatory'), 1);
assert.equal(A.G.strongholdSystem.getFacilityTier('training'), 1);

// Verify player stats update in recompute(player) (expMult becomes 1.05)
A.recompute(A.G.player);
assert.equal(A.G.player.expMult, 1.05, 'expMult becomes 1.05 after training grounds tier 1 upgrade');

// Claim daily stipend and verify zeny increases
const zenyBeforeStipend = A.G.player.zeny;
const stipendRes = A.G.strongholdSystem.claimDailyStipend(A.G.player);
assert.equal(stipendRes.success, true, 'Daily stipend claim succeeded');
assert.equal(stipendRes.zeny, 500, 'Stipend gave 500 Zeny');
assert.equal(A.G.player.zeny, zenyBeforeStipend + 500, 'Player zeny increased by 500');

console.log('--- d) Hall of Trophies & Account-Wide Auras ---');
// Clear trophies and reset
A.G.strongholdSystem.deserialize({
  facilities: { treasury: 1, forge: 1, conservatory: 1, training: 1 },
  trophies: { pedestal_colossus: false, pedestal_voidmaw: false, pedestal_zenith: false, pedestal_incursion: false, pedestal_architect: false },
  lastStipendClaimAt: vnow,
});
A.recompute(A.G.player);

const baselineHp = A.G.player.maxHp;
const baselinePhysDef = A.G.player.physDef;
const baselineResFire = A.G.player.res_fire || 0;
const baselineResNature = A.G.player.res_nature || 0;
const baselineCritChance = A.G.player.critChance || 0;
const baselineCritDmg = A.G.player.critDmg || 0;
const baselineResVoid = A.G.player.res_void || 0;
const baselineDmgMult = A.G.player.dmgMult || 1.0;
const baselineMoveMult = A.G.player.moveMult || 1.0;
const baselineMagicDef = A.G.player.magicDef || 0;
const baselineResHoly = A.G.player.res_holy || 0;
const baselineStr = A.G.player.stats?.str || 0;
const baselineMatk = A.G.player.magicAtk || 0;

// Stock player inventory with trophy items
A.G.player.inventory.push(
  { itemId: 'titan_heart', qty: 2 },
  { itemId: 'voidmaw_eye', qty: 2 },
  { itemId: 'spire_emblem', qty: 30 },
  { itemId: 'dimensional_shard', qty: 15 },
  { itemId: 'kernel_core', qty: 2 }
);

// 1. Socket titan_heart into pedestal_colossus -> recompute -> verify +200 Max HP, +15 Phys DEF, +10 Fire/Nature RES
const mColossus = A.G.strongholdSystem.mountTrophy('pedestal_colossus', A.G.player);
assert.equal(mColossus.success, true, 'Mounted titan_heart into pedestal_colossus');
A.recompute(A.G.player);
assert.equal(A.G.player.maxHp, baselineHp + 200, '+200 Max HP from Colossus pedestal');
assert.equal(A.G.player.physDef, baselinePhysDef + 15, '+15 Phys DEF from Colossus pedestal');
assert.equal(A.G.player.res_fire, baselineResFire + 10, '+10 Fire RES from Colossus pedestal');
assert.equal(A.G.player.res_nature, baselineResNature + 10, '+10 Nature RES from Colossus pedestal');

// 2. Socket voidmaw_eye into pedestal_voidmaw -> verify +6 Crit Chance, +15 Crit DMG, +10 Void RES
const mVoidmaw = A.G.strongholdSystem.mountTrophy('pedestal_voidmaw', A.G.player);
assert.equal(mVoidmaw.success, true, 'Mounted voidmaw_eye into pedestal_voidmaw');
A.recompute(A.G.player);
assert.equal(A.G.player.critChance, baselineCritChance + 6, '+6 Crit Chance from Voidmaw pedestal');
assert.equal(A.G.player.critDmg, baselineCritDmg + 15, '+15 Crit DMG from Voidmaw pedestal');
assert.equal(A.G.player.res_void, baselineResVoid + 10, '+10 Void RES from Voidmaw pedestal');

// 3. Socket spire_emblem (25x) into pedestal_zenith -> verify +8% All Damage, +10% Move Speed
const mZenith = A.G.strongholdSystem.mountTrophy('pedestal_zenith', A.G.player);
assert.equal(mZenith.success, true, 'Mounted spire_emblem into pedestal_zenith');
A.recompute(A.G.player);
assert.equal(Math.round(A.G.player.dmgMult * 100) / 100, Math.round(baselineDmgMult * 1.08 * 100) / 100, '+8% All Damage from Zenith pedestal');
assert.equal(Math.round(A.G.player.moveMult * 100) / 100, Math.round(baselineMoveMult * 1.10 * 100) / 100, '+10% Move Speed from Zenith pedestal');

// 4. Socket dimensional_shard (10x) into pedestal_incursion -> verify +15 Magic DEF, +0.20 lootBias, +10 Light RES
const mIncursion = A.G.strongholdSystem.mountTrophy('pedestal_incursion', A.G.player);
assert.equal(mIncursion.success, true, 'Mounted dimensional_shard into pedestal_incursion');
A.recompute(A.G.player);
assert.equal(A.G.player.magicDef, baselineMagicDef + 15, '+15 Magic DEF from Incursion pedestal');
assert.equal(A.G.player.res_holy, baselineResHoly + 10, '+10 Holy RES from Incursion pedestal');
assert.equal(A.G.strongholdSystem.getTrophyAuras().lootBias, 0.20, '+0.20 lootBias from Incursion pedestal');

// 4b. Socket kernel_core (1x) into pedestal_architect -> verify +10 All Stats, +15 MATK, +15 Void RES
const mArchitect = A.G.strongholdSystem.mountTrophy('pedestal_architect', A.G.player);
assert.equal(mArchitect.success, true, 'Mounted kernel_core into pedestal_architect');
A.recompute(A.G.player);
assert.ok(A.G.player.stats.str >= baselineStr + 10, '+10 All Stats from Architect pedestal');
assert.ok(A.G.player.magicAtk >= baselineMatk + 15, '+15 MATK from Architect pedestal');
assert.equal(A.G.strongholdSystem.getTrophyAuras().allStats, 10, '+10 allStats from Architect pedestal aura');
assert.equal(A.G.strongholdSystem.getTrophyAuras().matk, 15, '+15 matk from Architect pedestal aura');

// 5. Unmount pedestal_colossus & pedestal_architect -> verify Max HP returns to baseline
const titanCountBeforeUnmount = A.G.player.inventory.find(i => i.itemId === 'titan_heart')?.qty || 0;
const kernelCountBeforeUnmount = A.G.player.inventory.find(i => i.itemId === 'kernel_core')?.qty || 0;
const uColossus = A.G.strongholdSystem.unmountTrophy('pedestal_colossus', A.G.player);
const uArchitect = A.G.strongholdSystem.unmountTrophy('pedestal_architect', A.G.player);
assert.equal(uColossus.success, true, 'Unmounted pedestal_colossus');
assert.equal(uArchitect.success, true, 'Unmounted pedestal_architect');
A.recompute(A.G.player);
assert.equal(A.G.player.maxHp, baselineHp, 'Max HP cleanly returns to baseline');
assert.equal(A.G.player.physDef, baselinePhysDef, 'Phys DEF cleanly returns to baseline');
assert.equal(A.G.player.res_fire, baselineResFire, 'Fire RES returns to baseline');
assert.equal(A.G.player.res_nature, baselineResNature, 'Nature RES returns to baseline');
assert.equal(A.G.player.stats.str, baselineStr, 'STR cleanly returns to baseline');
const titanCountAfterUnmount = A.G.player.inventory.find(i => i.itemId === 'titan_heart')?.qty || 0;
const kernelCountAfterUnmount = A.G.player.inventory.find(i => i.itemId === 'kernel_core')?.qty || 0;
assert.equal(titanCountAfterUnmount, titanCountBeforeUnmount + 1, 'titan_heart safely returned to player inventory');
assert.equal(kernelCountAfterUnmount, kernelCountBeforeUnmount + 1, 'kernel_core safely returned to player inventory');

console.log('--- e) Central Crystal Siege Defense Encounter ---');
// Ensure on guild_stronghold map
A.loadMap('guild_stronghold', 16, 22);

// Start siege defense via A.startStrongholdSiege()
const siegeStart = A.startStrongholdSiege();
assert.ok(siegeStart, 'startStrongholdSiege returned siege object');
assert.equal(A.G.strongholdState?.active, true, 'strongholdState.active === true');
assert.equal(A.G.strongholdCrystal.hp, 15000, 'crystal HP === 15000');
assert.equal(A.G.strongholdCrystal.maxHp, 15000, 'crystal maxHp === 15000');
assert.equal(A.G.strongholdState.wave, 1, 'Wave 1 active');

// Test aggro interception: A.damageMonster(mob, 50) sets mob._siegeTarget = 'player'
const initialMob = A.G.monsters.find(m => m.alive && m._siegeMob);
assert.ok(initialMob, 'Siege mob present in Wave 1');
assert.equal(initialMob._siegeTarget, 'crystal', 'Initial siege mob target is crystal');
A.damageMonster(initialMob, 50);
assert.equal(initialMob._siegeTarget, 'player', 'Damage switches target to player');

// Verify killing a siege mob drops registered items without throwing TypeError
const dropTestMob = A.makeMonster(CONTENT.monsters.find(m => m.id === 'siege_sapper'), 16 * 32, 12 * 32, 65);
assert.doesNotThrow(() => {
  A.killMonster(dropTestMob);
}, 'Killing a siege mob with registered drops should not throw TypeError');

// Track spoils before victory
const preGP = A.G.guildPoints || 0;
const preZeny = A.G.player.zeny || 0;
const preCommendations = A.G.player.inventory.find(i => i.itemId === 'guild_commendation')?.qty || 0;
const preBlessedOre = A.G.player.inventory.find(i => i.itemId === 'blessed_ore')?.qty || 0;

// Advance through waves 1, 2, and 3 by defeating siege monsters
// Clear wave 1
while (A.G.monsters.some(m => m.alive && m._siegeMob && A.G.strongholdState?.wave === 1)) {
  const m = A.G.monsters.find(mo => mo.alive && mo._siegeMob);
  if (!m) break;
  A.killMonster(m);
}
assert.equal(A.G.strongholdState?.wave, 2, 'Successfully advanced to Wave 2');

// Clear wave 2
while (A.G.monsters.some(m => m.alive && m._siegeMob && A.G.strongholdState?.wave === 2)) {
  const m = A.G.monsters.find(mo => mo.alive && mo._siegeMob);
  if (!m) break;
  A.killMonster(m);
}
assert.equal(A.G.strongholdState?.wave, 3, 'Successfully advanced to Wave 3');

// In Wave 3, verify boss siege_warlord_boss spawned
const boss = A.G.monsters.find(m => m.alive && m.def.id === 'siege_warlord_boss');
assert.ok(boss, "Wave 3 boss 'siege_warlord_boss' spawned");

// Slay other mobs in wave 3 first
for (const m of A.G.monsters.filter(mo => mo.alive && mo._siegeMob && mo !== boss)) {
  A.killMonster(m);
}

// Remove random boss mob drops so we verify exact victory spoils
boss.def.drops = [];
const gpBeforeVictory = A.G.guildPoints || 0;
const zenyBeforeFinalBoss = A.G.player.zeny;
const commendationsBeforeVictory = A.G.player.inventory.find(i => i.itemId === 'guild_commendation')?.qty || 0;
const blessedOreBeforeVictory = A.G.player.inventory.find(i => i.itemId === 'blessed_ore')?.qty || 0;

// Crystal HP is > 80%
assert.ok(A.G.strongholdCrystal.hp >= 15000 * 0.8, 'Crystal HP > 80%');

// Slain Wave 3 boss siege_warlord_boss -> victory resolved with Rank S!
A.killMonster(boss);

assert.equal(A.G.strongholdState, null, 'Siege state cleared to null after victory');
assert.equal(A.G.strongholdCrystal.siegeActive, false, 'Crystal siegeActive reset to false');

// Verify spoils awarded: Guild Points (+100), Zeny (+6000), guild_commendation (3x), blessed_ore (2x)
assert.equal(A.G.guildPoints, gpBeforeVictory + 100, '+100 Guild Points awarded for Rank S');
assert.ok(A.G.player.zeny >= zenyBeforeFinalBoss + 6000, '+6000 Zeny awarded for Rank S');
const postCommendations = A.G.player.inventory.find(i => i.itemId === 'guild_commendation')?.qty || 0;
assert.equal(postCommendations, commendationsBeforeVictory + 3, '+3 guild_commendation awarded');
const postBlessedOre = A.G.player.inventory.find(i => i.itemId === 'blessed_ore')?.qty || 0;
assert.equal(postBlessedOre, blessedOreBeforeVictory + 2, '+2 blessed_ore awarded');

// Verify victory modal rendered in DOM with Rank S crest and spoils breakdown
const modalContainer = document.getElementById('siege-victory-modal-container');
assert.ok(modalContainer, 'Victory modal container rendered in DOM');
assert.ok(modalContainer.innerHTML.includes('RANK S'), 'Victory modal displays RANK S crest');
assert.ok(modalContainer.innerHTML.includes('15000 HP Preserved'), 'Victory modal displays preserved crystal HP');
assert.ok(modalContainer.innerHTML.includes('+100'), 'Victory modal displays +100 GP');
assert.ok(modalContainer.innerHTML.includes('+6000 Zeny'), 'Victory modal displays +6000 Zeny');
assert.ok(modalContainer.innerHTML.includes('+3×'), 'Victory modal displays +3x Guild Commendation');
assert.ok(modalContainer.innerHTML.includes('+2×'), 'Victory modal displays +2x Blessed Ore');

console.log('--- f) STRICT ZERO SCREEN SHAKE ---');
A.startStrongholdSiege();
const fixedCamX = A.G.cam.x;
const fixedCamY = A.G.cam.y;

// Freeze camera
Object.freeze(A.G.cam);
assert.ok(Object.isFrozen(A.G.cam), 'A.G.cam is strictly frozen');

// Combat attacks with frozen camera
const currentSiegeMob = A.G.monsters.find(m => m.alive && m._siegeMob);
if (currentSiegeMob) {
  A.damageMonster(currentSiegeMob, 50);
}

// Crystal hit with frozen camera
A.G.strongholdCrystal.hp = Math.max(0, A.G.strongholdCrystal.hp - 100);

// FX rendering with frozen camera
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
A.G.strongholdFx.drawCrystalBeacon(ctx, A.G.strongholdCrystal, A.G.cam, vnow, 1440, 900);
A.G.strongholdFx.drawPedestalBeams(ctx, [
  { id: 'pedestal_colossus', x: 12 * TS, y: 4 * TS, socketed: true, color: '#ff5722' },
  { id: 'pedestal_voidmaw', x: 14 * TS, y: 4 * TS, socketed: true, color: '#9c27b0' },
  { id: 'pedestal_zenith', x: 18 * TS, y: 4 * TS, socketed: true, color: '#ffd700' },
  { id: 'pedestal_incursion', x: 20 * TS, y: 4 * TS, socketed: true, color: '#00e5ff' },
], A.G.cam, vnow, 1440, 900);
A.G.strongholdFx.drawSiegeLanes(ctx, [{ x1: 3 * TS, y1: 11 * TS, x2: 16 * TS, y2: 12 * TS, color: '#f44336' }], A.G.cam, vnow, 1440, 900);
A.G.strongholdFx.updateFx(0.016);

// Wave advances and victory resolution with frozen camera
while (A.G.monsters.some(m => m.alive && m._siegeMob)) {
  const m = A.G.monsters.find(mo => mo.alive && mo._siegeMob);
  if (!m) break;
  A.killMonster(m);
}

// Verify A.G.cam.x and A.G.cam.y are never modified
assert.equal(A.G.cam.x, fixedCamX, 'A.G.cam.x remained completely unaltered (Strict Zero Screen Shake)');
assert.equal(A.G.cam.y, fixedCamY, 'A.G.cam.y remained completely unaltered (Strict Zero Screen Shake)');

// Unfreeze camera for subsequent tests
A.G.cam = { x: fixedCamX, y: fixedCamY };

console.log('--- g) Save/Resume Persistence & Clean Session Disconnect ---');
// Prepare known stronghold state
A.G.strongholdSystem.deserialize({
  facilities: { treasury: 2, forge: 2, conservatory: 1, training: 3 },
  trophies: { pedestal_colossus: true, pedestal_voidmaw: false, pedestal_zenith: true, pedestal_incursion: false, pedestal_architect: false },
  lastStipendClaimAt: 999999,
});
A.G.stronghold = A.G.strongholdSystem.serialize();

// Start a temporary siege encounter
A.startStrongholdSiege();
assert.equal(A.G.strongholdState?.active, true, 'Active siege before save');
assert.equal(A.G.strongholdCrystal.siegeActive, true, 'Crystal siege active before save');
assert.ok(A.G.monsters.some(m => m._siegeMob), 'Siege mobs present before save');

// Save game
const saved = A.saveGame();
assert.equal(saved, true, 'A.saveGame() succeeded');

const rawSave = A.readSave();
assert.ok(rawSave?.world?.stronghold, 'world.stronghold serialized in save file');
assert.deepEqual(rawSave.world.stronghold.facilities, { treasury: 2, forge: 2, conservatory: 1, training: 3 }, 'Facilities persisted');
assert.deepEqual(rawSave.world.stronghold.trophies, { pedestal_colossus: true, pedestal_voidmaw: false, pedestal_zenith: true, pedestal_incursion: false, pedestal_architect: false }, 'Trophies persisted');
assert.equal(rawSave.world.stronghold.lastStipendClaimAt, 999999, 'lastStipendClaimAt persisted');

// Resume game
const resumed = A.resumeGame();
assert.equal(resumed, true, 'A.resumeGame() succeeded');

// Deserialized cleanly
assert.deepEqual(A.G.strongholdSystem.getFacilities(), { treasury: 2, forge: 2, conservatory: 1, training: 3 }, 'Facilities restored after resumeGame');
assert.equal(A.G.strongholdSystem.isPedestalSocketed('pedestal_colossus'), true, 'Colossus pedestal restored');
assert.equal(A.G.strongholdSystem.isPedestalSocketed('pedestal_voidmaw'), false, 'Voidmaw pedestal restored');
assert.equal(A.G.strongholdSystem.isPedestalSocketed('pedestal_zenith'), true, 'Zenith pedestal restored');
assert.equal(A.G.strongholdSystem.isPedestalSocketed('pedestal_incursion'), false, 'Incursion pedestal restored');
assert.equal(A.G.strongholdSystem.isPedestalSocketed('pedestal_architect'), false, 'Architect pedestal restored');

// Active temporary siege encounter resets to idle on session reload
assert.equal(A.G.strongholdState, null, 'Active siege encounter reset to idle on session reload');
assert.equal(A.G.strongholdCrystal.siegeActive, false, 'Crystal siegeActive reset to false on reload');
assert.equal(A.G.monsters.filter(m => m._siegeMob).length, 0, 'Temporary siege monsters removed on reload');

console.log('--- h) UX/UI Boxing Containment ---');
const consoleHtml = A.G.strongholdUI.renderStrongholdConsoleHtml(A.G.strongholdSystem.serialize(), A.G.player, A.G.guildPoints);
assert.ok(consoleHtml.includes('box-sizing: border-box'), 'Console HTML contains box-sizing: border-box');
assert.ok(consoleHtml.includes('min-width: 0'), 'Console HTML contains min-width: 0');
assert.ok(consoleHtml.includes('overflow-x: hidden'), 'Console HTML contains overflow-x: hidden');

const hudHtml = A.G.strongholdUI.renderSiegeHudHtml(
  { active: true, wave: 2, foesRemaining: 4 },
  { hp: 12000, maxHp: 15000 }
);
assert.ok(hudHtml.includes('box-sizing: border-box'), 'Siege HUD HTML contains box-sizing: border-box');
assert.ok(hudHtml.includes('min-width: 0'), 'Siege HUD HTML contains min-width: 0');
assert.ok(hudHtml.includes('overflow-x: hidden'), 'Siege HUD HTML contains overflow-x: hidden');

const victoryHtml = A.G.strongholdUI.renderSiegeVictoryModalHtml({
  success: true,
  grade: 'S',
  crystalHp: 15000,
  guildPoints: 100,
  zeny: 6000,
  commendations: 3,
  ore: 'blessed_ore',
  oreCount: 2,
});
assert.ok(victoryHtml.includes('box-sizing: border-box'), 'Victory modal HTML contains box-sizing: border-box');
assert.ok(victoryHtml.includes('min-width: 0'), 'Victory modal HTML contains min-width: 0');
assert.ok(victoryHtml.includes('overflow-x: hidden'), 'Victory modal HTML contains overflow-x: hidden');

console.log('All Stronghold Integration Tests Passed Successfully!');
