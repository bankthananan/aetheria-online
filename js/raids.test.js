// js/raids.test.js
// Unit tests for Core Raid & World Boss Subsystem.

import assert from 'node:assert/strict';
import {
  createRaidsSystem,
  RAID_STATES,
  CONTRIBUTION_TIERS,
  WORLD_BOSS_CATALOG,
} from './systems/raids.js';

let vnow = 10000;
const raidsSystem = createRaidsSystem({
  now: () => vnow,
  rnd: () => 0.5,
});

// ============================================================================
// 1. World Boss Catalog Definitions
// ============================================================================
console.log('Testing World Boss Catalog...');
assert.ok(WORLD_BOSS_CATALOG.voidmaw_sovereign, 'Voidmaw Sovereign exists in catalog');
assert.ok(WORLD_BOSS_CATALOG.caldera_colossus, 'Caldera Colossus exists in catalog');
assert.ok(WORLD_BOSS_CATALOG.ancient_behemoth, 'Ancient Behemoth exists in catalog');

// Check Voidmaw Sovereign
const voidmaw = raidsSystem.getBossDef('voidmaw_sovereign');
assert.equal(voidmaw.id, 'voidmaw_sovereign');
assert.equal(voidmaw.name, 'Voidmaw Sovereign');
assert.equal(voidmaw.zone, 'rift');
assert.equal(voidmaw.element, 'void');
assert.equal(voidmaw.maxHp, 28000);
assert.equal(voidmaw.atk, 85);
assert.equal(voidmaw.def, 35);
assert.equal(voidmaw.breakThresholdHp, 0.60);
assert.equal(voidmaw.enrageThresholdHp, 0.30);
assert.equal(voidmaw.breakShieldHp, 7000);
assert.equal(voidmaw.breakTimerMs, 35000);
assert.equal(voidmaw.staggerDurationMs, 8000);
assert.equal(voidmaw.staggerVulnerabilityMult, 1.40);
assert.deepEqual(voidmaw.signatureMechanics, ['void_singularity', 'rift_decay', 'phase_shift']);
assert.deepEqual(voidmaw.addsPool, ['void_stalker', 'void_wisp']);
assert.equal(voidmaw.apexTrophy, 'voidmaw_eye');

// Check Caldera Colossus
const caldera = raidsSystem.getBossDef('caldera_colossus');
assert.equal(caldera.id, 'caldera_colossus');
assert.equal(caldera.zone, 'dragon_caldera');
assert.equal(caldera.element, 'fire');
assert.equal(caldera.maxHp, 32000);
assert.equal(caldera.atk, 95);
assert.equal(caldera.def, 45);
assert.equal(caldera.breakShieldHp, 8000);
assert.equal(caldera.breakTimerMs, 35000);
assert.equal(caldera.staggerDurationMs, 8000);
assert.equal(caldera.staggerVulnerabilityMult, 1.40);
assert.deepEqual(caldera.addsPool, ['magma_beetle', 'ember_imp']);
assert.equal(caldera.apexTrophy, 'titan_heart');

// Check Ancient Behemoth
const behemoth = raidsSystem.getBossDef('ancient_behemoth');
assert.equal(behemoth.id, 'ancient_behemoth');
assert.equal(behemoth.zone, 'whispering_woods');
assert.equal(behemoth.element, 'nature');
assert.equal(behemoth.maxHp, 30000);
assert.equal(behemoth.atk, 90);
assert.equal(behemoth.def, 40);
assert.equal(behemoth.breakShieldHp, 7500);
assert.equal(behemoth.breakTimerMs, 35000);
assert.equal(behemoth.staggerDurationMs, 8000);
assert.equal(behemoth.staggerVulnerabilityMult, 1.40);
assert.deepEqual(behemoth.addsPool, ['thornback_boar', 'blight_sprite']);
assert.equal(behemoth.apexTrophy, 'titan_heart');

// Check System Architect
assert.ok(WORLD_BOSS_CATALOG.system_architect, 'System Architect exists in catalog');
const architect = raidsSystem.getBossDef('system_architect');
assert.equal(architect.id, 'system_architect');
assert.equal(architect.name, 'System Architect');
assert.equal(architect.zone, 'glitched_monolith');
assert.equal(architect.element, 'void');
assert.equal(architect.maxHp, 48000);
assert.equal(architect.atk, 125);
assert.equal(architect.def, 55);
assert.equal(architect.breakThresholdHp, 0.60);
assert.equal(architect.enrageThresholdHp, 0.30);
assert.equal(architect.breakShieldHp, 12000);
assert.equal(architect.breakTimerMs, 35000);
assert.equal(architect.staggerDurationMs, 8000);
assert.equal(architect.staggerVulnerabilityMult, 1.50);
assert.deepEqual(architect.signatureMechanics, ['kernel_panic', 'null_pointer_beam', 'runtime_collapse']);
assert.deepEqual(architect.addsPool, ['debug_drone', 'memory_phantom']);
assert.equal(architect.apexTrophy, 'kernel_core');

assert.equal(raidsSystem.getBossDef('non_existent_boss'), null, 'Invalid boss returns null');

// ============================================================================
// 2. startRaid initializes well-formed state
// ============================================================================
console.log('Testing startRaid initialization...');
assert.equal(raidsSystem.startRaid('invalid_boss'), null, 'startRaid with invalid ID returns null');

vnow = 10000;
const raid = raidsSystem.startRaid('caldera_colossus', {
  mapId: 'dragon_caldera',
  x: 400,
  y: 300,
  durationMs: 180000,
});

assert.ok(raid, 'startRaid returns raid state');
assert.equal(raid.active, true, 'Raid is active');
assert.equal(raid.bossId, 'caldera_colossus', 'Boss ID matches');
assert.equal(raid.mapId, 'dragon_caldera', 'Map ID matches');
assert.equal(raid.x, 400, 'X position matches');
assert.equal(raid.y, 300, 'Y position matches');
assert.equal(raid.hp, 32000, 'HP starts at maxHp');
assert.equal(raid.maxHp, 32000, 'maxHp is 32000');
assert.equal(raid.state, RAID_STATES.ENGAGED, 'Initial state is ENGAGED');
assert.equal(raid.phase, 1, 'Initial phase is 1');
assert.equal(raid.breakShield, 0, 'breakShield starts at 0');
assert.equal(raid.maxBreakShield, 0, 'maxBreakShield starts at 0');
assert.equal(raid.breakTimeRemainingMs, 0, 'breakTimeRemainingMs starts at 0');
assert.equal(raid.staggered, false, 'staggered starts false');
assert.equal(raid.staggerTimeRemainingMs, 0, 'staggerTimeRemainingMs starts at 0');
assert.equal(raid.enraged, false, 'enraged starts false');
assert.deepEqual(raid.adds, [], 'adds starts empty');
assert.equal(raid.score, 0, 'score starts at 0');
assert.deepEqual(raid.metrics, {
  damage: 0,
  breakDamage: 0,
  addsKilled: 0,
  hazardsDodged: 0,
}, 'metrics start at zero');
assert.equal(raid.startedAt, 10000, 'startedAt timestamp matches');
assert.equal(raid.expiresAt, 190000, 'expiresAt matches startedAt + durationMs');
assert.equal(raid.durationMs, 180000, 'durationMs is 180000');

assert.equal(raidsSystem.getActiveRaid(), raid, 'getActiveRaid returns current active raid');

// ============================================================================
// 3. applyDamage Phase 1 normal damage and scoring
// ============================================================================
console.log('Testing Phase 1 damage and scoring...');
const res1 = raidsSystem.applyDamage(2000);
assert.equal(res1.actualDamage, 2000, 'Damage matches raw damage');
assert.equal(res1.state, RAID_STATES.ENGAGED, 'State remains ENGAGED');
assert.equal(res1.staggered, false, 'Not staggered');
assert.equal(raid.hp, 30000, 'HP reduced to 30000');
assert.equal(raid.metrics.damage, 2000, 'Metrics damage tracked');
assert.equal(raid.score, 200, 'Score awarded (10% of 2000 = 200)');

const res2 = raidsSystem.applyDamage(3000);
assert.equal(res2.actualDamage, 3000);
assert.equal(raid.hp, 27000, 'HP reduced to 27000');
assert.equal(raid.metrics.damage, 5000);
assert.equal(raid.score, 500, 'Score updated to 500 (200 + 300)');

// ============================================================================
// 4. Phase 2 transition at 60% HP, Aegis break shield activation & add mitigation
// ============================================================================
console.log('Testing Phase 2 transition, Aegis break shield & minion mitigation...');
// 60% of 32000 is 19200. Currently HP is 27000. Deal 8000 damage -> HP 19000 (<= 19200)
const res3 = raidsSystem.applyDamage(8000);
assert.equal(res3.actualDamage, 8000);
assert.equal(res3.state, RAID_STATES.BREAK_STAGGER, 'State transitions to BREAK_STAGGER');
assert.equal(raid.phase, 2, 'Phase transitions to 2');
assert.equal(raid.breakShield, 8000, 'breakShield initialized to 8000');
assert.equal(raid.maxBreakShield, 8000, 'maxBreakShield initialized to 8000');
assert.equal(raid.breakTimeRemainingMs, 35000, 'breakTimeRemainingMs initialized to 35000');
assert.equal(raid.adds.length, 3, '3 adds spawned');
assert.equal(raid.adds.filter(a => a.alive).length, 3, 'All 3 adds are alive');
assert.equal(raid.adds[0].id, 'magma_beetle');
assert.equal(raid.adds[1].id, 'ember_imp');
assert.equal(raid.adds[2].id, 'magma_beetle');

// With 3 adds alive: mitigation = min(0.60, 3 * 0.15) = 0.45.
// Raw damage 1000 -> Math.round(1000 * 0.55) = 550 break damage to shield.
const preScore = raid.score;
const breakHit1 = raidsSystem.applyDamage(1000);
assert.equal(breakHit1.actualDamage, 0, 'HP takes 0 damage while break shield is active');
assert.equal(breakHit1.breakDamage, 550, 'Break shield takes 550 mitigated damage');
assert.equal(breakHit1.staggered, false, 'Boss is not yet staggered');
assert.equal(raid.breakShield, 7450, 'breakShield reduced from 8000 to 7450');
assert.equal(raid.hp, 19000, 'Boss HP is completely shielded');
assert.equal(raid.metrics.breakDamage, 550, 'Metrics track break damage');
assert.equal(raid.score, preScore + 110, 'Score awarded 20% of break damage (550 * 0.20 = 110)');

// ============================================================================
// 5. Add kills reduce mitigation and award score
// ============================================================================
console.log('Testing minion kills and mitigation reduction...');
// Kill Add 0
const preKillScore = raid.score;
const killed0 = raidsSystem.recordAddKill(0);
assert.equal(killed0, true, 'Add 0 marked dead');
assert.equal(raid.adds[0].alive, false, 'Add 0 is not alive');
assert.equal(raid.metrics.addsKilled, 1, 'Metrics track 1 add killed');
assert.equal(raid.score, preKillScore + 150, 'Killing add awards 150 score');

// Now 2 adds alive: mitigation = 2 * 0.15 = 0.30.
// Raw damage 1000 -> Math.round(1000 * 0.70) = 700 break damage.
const breakHit2 = raidsSystem.applyDamage(1000);
assert.equal(breakHit2.breakDamage, 700, 'Damage to shield increased to 700 with 2 adds');
assert.equal(raid.breakShield, 6750, 'breakShield is now 6750 (7450 - 700)');

// Kill Add 1 and Add 2
raidsSystem.recordAddKill(1);
raidsSystem.recordAddKill(2);
assert.equal(raid.metrics.addsKilled, 3, 'All 3 adds killed');
assert.equal(raid.adds.filter(a => a.alive).length, 0, '0 alive adds');

// Now 0 adds alive: mitigation = 0%.
// Raw damage 1000 -> 1000 break damage.
const breakHit3 = raidsSystem.applyDamage(1000);
assert.equal(breakHit3.breakDamage, 1000, 'Full unmitigated damage to shield with 0 adds');
assert.equal(raid.breakShield, 5750, 'breakShield is now 5750');

// ============================================================================
// 6. Depleting break shield triggers Staggered mode (+40% vulnerability for 8s)
// ============================================================================
console.log('Testing break shield depletion and stagger vulnerability...');
// Deplete the remaining 5750 break shield
const breakHitFinal = raidsSystem.applyDamage(6000);
assert.equal(breakHitFinal.breakDamage, 5750, 'Absorbs up to remaining shield');
assert.equal(breakHitFinal.staggered, true, 'Depleting shield triggers staggered: true');
assert.equal(raid.breakShield, 0, 'Shield reduced to 0');
assert.equal(raid.staggered, true, 'Raid state staggered is true');
assert.equal(raid.staggerTimeRemainingMs, 8000, 'Stagger duration is 8000ms');

// Attack during Stagger: +40% vulnerability mult
const staggerHpBefore = raid.hp;
const staggerDmgRes = raidsSystem.applyDamage(1000);
assert.equal(staggerDmgRes.actualDamage, 1400, 'Raw 1000 damage deals 1400 (1.40x) during stagger');
assert.equal(raid.hp, staggerHpBefore - 1400, 'Boss HP reduced by 1400');

// Update stagger timer
raidsSystem.update(4.0); // 4 seconds pass
assert.equal(raid.staggered, true, 'Still staggered after 4 seconds');
assert.equal(raid.staggerTimeRemainingMs, 4000, '4000ms stagger remaining');

raidsSystem.update(4.0); // Remaining 4 seconds pass
assert.equal(raid.staggered, false, 'Stagger expires after 8 seconds');
assert.equal(raid.state, RAID_STATES.ENGAGED, 'State returns to ENGAGED');

// ============================================================================
// 7. Barrier detonation if timer runs out
// ============================================================================
console.log('Testing barrier detonation timeout...');
// Test detonation on Ancient Behemoth
const behemothRaid = raidsSystem.startRaid('ancient_behemoth');
// Push into Phase 2: maxHp 30000, 60% threshold = 18000. Deal 13000 damage -> HP 17000
raidsSystem.applyDamage(13000);
assert.equal(behemothRaid.phase, 2, 'Behemoth entered Phase 2');
assert.equal(behemothRaid.breakShield, 7500, 'Behemoth break shield active');
assert.equal(behemothRaid.breakTimeRemainingMs, 35000, 'Break timer is 35000ms');

// Advance time partially
raidsSystem.update(20.0);
assert.equal(behemothRaid.breakShield, 7500, 'Shield intact after 20 seconds');
assert.equal(behemothRaid.breakTimeRemainingMs, 15000, '15000ms remaining');

// Advance remaining 15 seconds to trigger detonation
raidsSystem.update(16.0);
assert.equal(behemothRaid.breakShield, 0, 'Break shield dissolves on detonation');
assert.equal(behemothRaid.detonated, true, 'Detonation flag set');
assert.equal(behemothRaid.staggered, false, 'Boss was not staggered');
assert.equal(behemothRaid.state, RAID_STATES.ENGAGED, 'Combat resumes into ENGAGED state');

// ============================================================================
// 8. Phase 3 Enrage transition at 30% HP
// ============================================================================
console.log('Testing Phase 3 Enrage transition...');
// Ancient Behemoth maxHp: 30000, enrage threshold 0.30 * 30000 = 9000 HP.
// Current HP: 17000. Deal 8500 damage -> HP 8500 (<= 9000).
const enrageHit = raidsSystem.applyDamage(8500);
assert.equal(enrageHit.actualDamage, 8500);
assert.equal(behemothRaid.phase, 3, 'Phase transitions to 3');
assert.equal(behemothRaid.state, RAID_STATES.ENRAGED, 'State transitions to ENRAGED');
assert.equal(behemothRaid.enraged, true, 'enraged flag set to true');

// ============================================================================
// 9. Hazard dodges awarding contribution score
// ============================================================================
console.log('Testing hazard dodge metrics and scoring...');
const preDodgeScore = behemothRaid.score;
const dodgeOk = raidsSystem.recordHazardDodge();
assert.equal(dodgeOk, true, 'recordHazardDodge returned true');
assert.equal(behemothRaid.metrics.hazardsDodged, 1, 'metrics.hazardsDodged incremented');
assert.equal(behemothRaid.score, preDodgeScore + 100, 'Dodging hazard awards 100 score');

// ============================================================================
// 10. Defeat and Contribution Tier computation (Bronze -> Paragon)
// ============================================================================
console.log('Testing boss defeat and contribution tier scaling...');
// Boss currently has 8500 HP. Kill boss with 9000 damage.
const victory = raidsSystem.applyDamage(9000);
assert.equal(victory.success, true, 'Raid resolved as victory');
assert.equal(behemothRaid.state, RAID_STATES.DEFEATED, 'Boss state is DEFEATED');
assert.equal(behemothRaid.active, false, 'Raid is no longer active');
assert.ok(victory.tier, 'Victory returns contribution tier');
assert.ok(victory.cache, 'Victory returns cache rewards');

// Test all contribution tier cutoffs
assert.equal(raidsSystem.computeContributionTier(0), CONTRIBUTION_TIERS.BRONZE);
assert.equal(raidsSystem.computeContributionTier(2499), CONTRIBUTION_TIERS.BRONZE);
assert.equal(raidsSystem.computeContributionTier(2500), CONTRIBUTION_TIERS.SILVER);
assert.equal(raidsSystem.computeContributionTier(5999), CONTRIBUTION_TIERS.SILVER);
assert.equal(raidsSystem.computeContributionTier(6000), CONTRIBUTION_TIERS.GOLD);
assert.equal(raidsSystem.computeContributionTier(11999), CONTRIBUTION_TIERS.GOLD);
assert.equal(raidsSystem.computeContributionTier(12000), CONTRIBUTION_TIERS.PARAGON);
assert.equal(raidsSystem.computeContributionTier(99999), CONTRIBUTION_TIERS.PARAGON);

// ============================================================================
// 11. generateRaidCache returns correct items and trophies
// ============================================================================
console.log('Testing raid cache generation across tiers...');
const voidmawDef = raidsSystem.getBossDef('voidmaw_sovereign');
const bronzeCache = raidsSystem.generateRaidCache(CONTRIBUTION_TIERS.BRONZE, voidmawDef);
assert.equal(bronzeCache.zeny, 3000);
assert.equal(bronzeCache.dimensional_shard, 3);
assert.deepEqual(bronzeCache.trophies, []);
assert.deepEqual(bronzeCache.runes, ['rune_ember']);
assert.equal(bronzeCache.feast, 'grilled_trout');
assert.equal(bronzeCache.gems, 0);
assert.equal(bronzeCache.cardChance, 0.05);

const silverCache = raidsSystem.generateRaidCache(CONTRIBUTION_TIERS.SILVER, voidmawDef);
assert.equal(silverCache.zeny, 6000);
assert.equal(silverCache.dimensional_shard, 5);
assert.deepEqual(silverCache.trophies, []);
assert.deepEqual(silverCache.runes, ['rune_ember']);
assert.equal(silverCache.feast, 'smoked_salmon');
assert.equal(silverCache.gems, 1);
assert.equal(silverCache.cardChance, 0.15);

const goldCache = raidsSystem.generateRaidCache(CONTRIBUTION_TIERS.GOLD, voidmawDef);
assert.equal(goldCache.zeny, 12000);
assert.equal(goldCache.dimensional_shard, 8);
assert.deepEqual(goldCache.trophies, ['voidmaw_eye']);
assert.deepEqual(goldCache.runes, ['rune_ember', 'rune_glacial']);
assert.equal(goldCache.feast, 'smoked_salmon');
assert.equal(goldCache.gems, 2);
assert.equal(goldCache.cardChance, 0.35);

const calderaDef = raidsSystem.getBossDef('caldera_colossus');
const paragonCache = raidsSystem.generateRaidCache(CONTRIBUTION_TIERS.PARAGON, calderaDef);
assert.equal(paragonCache.zeny, 25000);
assert.equal(paragonCache.dimensional_shard, 15);
assert.deepEqual(paragonCache.trophies, ['titan_heart', 'titan_heart']);
assert.deepEqual(paragonCache.runes, ['rune_ember', 'rune_glacial']);
assert.equal(paragonCache.feast, 'golden_carp_sashimi');
assert.equal(paragonCache.gems, 4);
assert.equal(paragonCache.cardChance, 1.00);

// ============================================================================
// 12. Raid expiration timeout collapse
// ============================================================================
console.log('Testing raid expiration timeout...');
vnow = 50000;
raidsSystem.startRaid('voidmaw_sovereign', { durationMs: 180000 });
assert.equal(raidsSystem.getActiveRaid().active, true);

vnow += 180001; // Exceed duration
const collapseRes = raidsSystem.update(0.1);
assert.equal(collapseRes.success, false);
assert.equal(raidsSystem.getActiveRaid().state, RAID_STATES.COLLAPSED);
assert.equal(raidsSystem.getActiveRaid().active, false);

// ============================================================================
// 13. serialize and deserialize preserve state cleanly
// ============================================================================
console.log('Testing serialization and deserialization...');
vnow = 100000;
raidsSystem.startRaid('caldera_colossus');
raidsSystem.applyDamage(5000);
raidsSystem.recordHazardDodge();
const snap = raidsSystem.serialize();

assert.ok(snap.activeRaid, 'Serialized active raid exists');
assert.equal(snap.activeRaid.bossId, 'caldera_colossus');
assert.equal(snap.activeRaid.hp, 27000);
assert.equal(snap.activeRaid.metrics.hazardsDodged, 1);

const restoredSystem = createRaidsSystem({
  now: () => vnow,
  rnd: () => 0.5,
});
restoredSystem.deserialize(snap);
const restoredRaid = restoredSystem.getActiveRaid();
assert.ok(restoredRaid, 'Deserialized raid exists');
assert.equal(restoredRaid.bossId, 'caldera_colossus');
assert.equal(restoredRaid.hp, 27000);
assert.equal(restoredRaid.metrics.damage, 5000);
assert.equal(restoredRaid.metrics.hazardsDodged, 1);
assert.equal(restoredRaid.state, RAID_STATES.ENGAGED);

console.log('✔ All raid subsystem unit tests passed successfully.');
