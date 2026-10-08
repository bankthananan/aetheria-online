import assert from 'node:assert/strict';
import {
  FACILITY_DEFINITIONS,
  TROPHY_PEDESTAL_DEFINITIONS,
  SIEGE_WAVE_TEMPLATES,
  SIEGE_REWARDS,
  createStrongholdSystem,
} from './systems/stronghold.js';

console.log('--- Stronghold Subsystem Test Suite ---');

// ----------------------------------------------------
// 1. Constant Definitions Integrity Tests
// ----------------------------------------------------
assert.ok(FACILITY_DEFINITIONS.treasury, 'treasury facility definition exists');
assert.ok(FACILITY_DEFINITIONS.forge, 'forge facility definition exists');
assert.ok(FACILITY_DEFINITIONS.conservatory, 'conservatory facility definition exists');
assert.ok(FACILITY_DEFINITIONS.training, 'training facility definition exists');

for (const [key, fac] of Object.entries(FACILITY_DEFINITIONS)) {
  assert.equal(fac.tiers.length, 4, `${key} has 4 tiers (0..3)`);
  assert.equal(fac.tiers[0].tier, 0);
  assert.equal(fac.tiers[3].tier, 3);
}

assert.equal(Object.keys(TROPHY_PEDESTAL_DEFINITIONS).length, 4, '4 trophy pedestals defined');
assert.ok(TROPHY_PEDESTAL_DEFINITIONS.pedestal_colossus);
assert.ok(TROPHY_PEDESTAL_DEFINITIONS.pedestal_voidmaw);
assert.ok(TROPHY_PEDESTAL_DEFINITIONS.pedestal_zenith);
assert.ok(TROPHY_PEDESTAL_DEFINITIONS.pedestal_incursion);

assert.equal(SIEGE_WAVE_TEMPLATES.length, 3, '3 siege wave templates defined');
assert.ok(SIEGE_REWARDS.S && SIEGE_REWARDS.A && SIEGE_REWARDS.B, 'S, A, B siege rewards defined');

// ----------------------------------------------------
// 2. Facility Upgrade Validation, Cost Deductions & Progression
// ----------------------------------------------------
{
  let nowTime = 1000000;
  const sys = createStrongholdSystem({ now: () => nowTime });

  assert.deepEqual(sys.getFacilities(), {
    treasury: 0,
    forge: 0,
    conservatory: 0,
    training: 0,
  }, 'facilities start at tier 0');

  assert.equal(sys.getFacilityTier('treasury'), 0);

  // Player without enough funds/mats
  const poorPlayer = { zeny: 100, inventory: [] };
  assert.equal(sys.canUpgradeFacility('treasury', poorPlayer, 10), false, 'cannot upgrade with insufficient GP, Zeny, Mats');

  // Player with enough GP and Zeny but missing Mats
  const richPlayerMissingMats = { zeny: 100000, inventory: [] };
  assert.equal(sys.canUpgradeFacility('treasury', richPlayerMissingMats, 50), false, 'cannot upgrade without mats');

  // Player with mats but missing Zeny
  const playerMissingZeny = { zeny: 1000, inventory: [{ itemId: 'iron_ore', qty: 10 }] };
  assert.equal(sys.canUpgradeFacility('treasury', playerMissingZeny, 50), false, 'cannot upgrade without zeny');

  // Player with mats & zeny but missing GP
  const playerMissingGP = { zeny: 10000, inventory: [{ itemId: 'iron_ore', qty: 10 }] };
  assert.equal(sys.canUpgradeFacility('treasury', playerMissingGP, 20), false, 'cannot upgrade without GP');

  // Valid upgrade to Tier 1
  const readyPlayer = { zeny: 10000, inventory: [{ itemId: 'iron_ore', qty: 15 }] };
  let gp = 50;
  const deductGP = amount => { gp -= amount; };
  assert.equal(sys.canUpgradeFacility('treasury', readyPlayer, gp), true, 'can upgrade when all requirements met');

  const res1 = sys.upgradeFacility('treasury', readyPlayer, gp, deductGP);
  assert.equal(res1.success, true);
  assert.equal(res1.newTier, 1);
  assert.equal(sys.getFacilityTier('treasury'), 1);
  assert.equal(gp, 20, 'deducted 30 GP');
  assert.equal(readyPlayer.zeny, 5000, 'deducted 5000 Zeny');
  assert.equal(readyPlayer.inventory.find(i => i.itemId === 'iron_ore')?.qty, 5, 'deducted 10 iron_ore, 5 left');

  // Upgrade Treasury Tier 1 -> Tier 2
  // Tier 2 requires 75 GP, 15000 Zeny, 10 star_iron
  gp = 100;
  readyPlayer.zeny = 20000;
  readyPlayer.inventory.push({ itemId: 'star_iron', qty: 10 });
  assert.equal(sys.canUpgradeFacility('treasury', readyPlayer, gp), true);
  const res2 = sys.upgradeFacility('treasury', readyPlayer, gp, deductGP);
  assert.equal(res2.success, true);
  assert.equal(res2.newTier, 2);
  assert.equal(gp, 25);
  assert.equal(readyPlayer.zeny, 5000);
  assert.equal(readyPlayer.inventory.find(i => i.itemId === 'star_iron'), undefined, 'star_iron completely consumed');

  // Upgrade Treasury Tier 2 -> Tier 3
  // Tier 3 requires 150 GP, 40000 Zeny, 5 blessed_ore
  gp = 200;
  readyPlayer.zeny = 50000;
  readyPlayer.inventory.push({ itemId: 'blessed_ore', qty: 8 });
  assert.equal(sys.canUpgradeFacility('treasury', readyPlayer, gp), true);
  const res3 = sys.upgradeFacility('treasury', readyPlayer, gp, deductGP);
  assert.equal(res3.success, true);
  assert.equal(res3.newTier, 3);
  assert.equal(gp, 50);
  assert.equal(readyPlayer.zeny, 10000);
  assert.equal(readyPlayer.inventory.find(i => i.itemId === 'blessed_ore')?.qty, 3, '3 blessed_ore left');

  // Attempting to upgrade past Tier 3 must fail
  assert.equal(sys.canUpgradeFacility('treasury', readyPlayer, 999), false, 'cannot upgrade past max tier 3');
  const pastMax = sys.upgradeFacility('treasury', readyPlayer, 999, deductGP);
  assert.equal(pastMax.success, false, 'upgrade past max returns failure');

  // Test multi-material upgrade (Forge Tier 2 requires star_iron: 10 AND caldera_crystal: 5)
  // First forge tier 1: 30 GP, 6000 Zeny, 10 iron_ore
  readyPlayer.zeny = 30000;
  readyPlayer.inventory.push({ itemId: 'iron_ore', qty: 10 });
  sys.upgradeFacility('forge', readyPlayer, 100, () => {});
  assert.equal(sys.getFacilityTier('forge'), 1);

  // Forge tier 2 check with only one material
  readyPlayer.inventory.push({ itemId: 'star_iron', qty: 10 });
  assert.equal(sys.canUpgradeFacility('forge', readyPlayer, 100), false, 'cannot upgrade forge missing second mat caldera_crystal');
  readyPlayer.inventory.push({ itemId: 'caldera_crystal', qty: 5 });
  assert.equal(sys.canUpgradeFacility('forge', readyPlayer, 100), true, 'can upgrade forge with both mats present');
  const forgeRes2 = sys.upgradeFacility('forge', readyPlayer, 100, () => {});
  assert.equal(forgeRes2.success, true);
  assert.equal(sys.getFacilityTier('forge'), 2);
}

// ----------------------------------------------------
// 3. Daily Stipend Cooldown & Zeny Payouts
// ----------------------------------------------------
{
  let nowTime = 1000000;
  const sys = createStrongholdSystem({ now: () => nowTime });
  const player = { zeny: 10000, inventory: [{ itemId: 'iron_ore', qty: 20 }] };

  // Tier 0 treasury cannot claim stipend
  assert.equal(sys.canClaimDailyStipend(), false, 'cannot claim stipend at tier 0');
  assert.equal(sys.claimDailyStipend(player).success, false, 'claim fails at tier 0');

  // Upgrade to tier 1 (dailyStipend: 500)
  sys.upgradeFacility('treasury', player, 100, () => {});
  assert.equal(sys.canClaimDailyStipend(), true, 'can claim initial stipend at tier 1');

  const claim1 = sys.claimDailyStipend(player);
  assert.equal(claim1.success, true);
  assert.equal(claim1.zeny, 500);
  assert.equal(player.zeny, 10000 - 5000 + 500, 'player received 500 zeny');

  // Immediate re-claim must be on cooldown
  assert.equal(sys.canClaimDailyStipend(), false, 'stipend on cooldown immediately after claim');
  assert.equal(sys.claimDailyStipend(player).success, false, 'claim fails while on cooldown');

  // Advance time by 86399999 ms (1ms short of 24h)
  nowTime += 86399999;
  assert.equal(sys.canClaimDailyStipend(), false, 'stipend still on cooldown at 23h 59m 59s');

  // Advance 1 more ms to reach exactly 24 hours (86,400,000 ms)
  nowTime += 1;
  assert.equal(sys.canClaimDailyStipend(), true, 'stipend available after 24 hours');
  const claim2 = sys.claimDailyStipend(player);
  assert.equal(claim2.success, true);
  assert.equal(claim2.zeny, 500);
}

// ----------------------------------------------------
// 4. Passive Modifiers Aggregation
// ----------------------------------------------------
{
  const sys = createStrongholdSystem();
  let passives = sys.getPassiveModifiers();
  assert.equal(passives.expMult, 1.0);
  assert.equal(passives.skillExpMult, 1.0);
  assert.equal(passives.zenyDropPct, 0);
  assert.equal(passives.dmgPct, 0);
  assert.equal(passives.refineBonusPct, 0);
  assert.equal(passives.craftCostDiscountPct, 0);
  assert.equal(passives.duplicateCraftChance, 0);

  // Upgrade Training to Tier 3, Forge to Tier 3, Treasury to Tier 2
  const p = {
    zeny: 999999,
    inventory: [
      { itemId: 'hardwood', qty: 20 },
      { itemId: 'star_iron', qty: 50 },
      { itemId: 'blessed_ore', qty: 50 },
      { itemId: 'titan_heart', qty: 20 },
      { itemId: 'iron_ore', qty: 50 },
      { itemId: 'caldera_crystal', qty: 20 },
    ],
  };

  sys.upgradeFacility('training', p, 999, () => {}); // T1
  sys.upgradeFacility('training', p, 999, () => {}); // T2
  sys.upgradeFacility('training', p, 999, () => {}); // T3: expMult: 1.20, skillExpMult: 1.20, dmgPct: 5

  sys.upgradeFacility('forge', p, 999, () => {}); // T1
  sys.upgradeFacility('forge', p, 999, () => {}); // T2
  sys.upgradeFacility('forge', p, 999, () => {}); // T3: refineBonusPct: 15, craftCostDiscountPct: 20, duplicateCraftChance: 0.10

  sys.upgradeFacility('treasury', p, 999, () => {}); // T1
  sys.upgradeFacility('treasury', p, 999, () => {}); // T2: zenyDropPct: 5

  passives = sys.getPassiveModifiers();
  assert.equal(passives.expMult, 1.20);
  assert.equal(passives.skillExpMult, 1.20);
  assert.equal(passives.dmgPct, 5);
  assert.equal(passives.refineBonusPct, 15);
  assert.equal(passives.craftCostDiscountPct, 20);
  assert.equal(passives.duplicateCraftChance, 0.10);
  assert.equal(passives.zenyDropPct, 5);
}

// ----------------------------------------------------
// 5. Hall of Trophies: Mounting, Unmounting & Auras
// ----------------------------------------------------
{
  const sys = createStrongholdSystem();
  assert.deepEqual(sys.getTrophies(), {
    pedestal_colossus: false,
    pedestal_voidmaw: false,
    pedestal_zenith: false,
    pedestal_incursion: false,
  });

  const p = {
    inventory: [
      { itemId: 'titan_heart', qty: 2 },
      { itemId: 'spire_emblem', qty: 25 },
      { itemId: 'dimensional_shard', qty: 5 }, // Incursion needs 10
    ],
  };

  // Missing enough items for incursion
  assert.equal(sys.mountTrophy('pedestal_incursion', p).success, false, 'cannot mount when inventory has insufficient quantity');

  // Mount colossus (needs 1 titan_heart)
  const mountColossus = sys.mountTrophy('pedestal_colossus', p);
  assert.equal(mountColossus.success, true);
  assert.equal(sys.isPedestalSocketed('pedestal_colossus'), true);
  assert.equal(p.inventory.find(i => i.itemId === 'titan_heart')?.qty, 1, '1 titan_heart consumed');

  // Attempt to mount colossus again while already socketed
  assert.equal(sys.mountTrophy('pedestal_colossus', p).success, false, 'cannot mount already socketed pedestal');

  // Mount zenith (needs 25 spire_emblem)
  const mountZenith = sys.mountTrophy('pedestal_zenith', p);
  assert.equal(mountZenith.success, true);
  assert.equal(sys.isPedestalSocketed('pedestal_zenith'), true);
  assert.equal(p.inventory.find(i => i.itemId === 'spire_emblem'), undefined, 'spire_emblem fully consumed');

  // Cumulative auras calculation
  let auras = sys.getTrophyAuras();
  // Colossus perks: { maxHp: 200, physDef: 15, res_fire: 10, res_nature: 10 }
  // Zenith perks: { dmgPct: 8, moveSpdPct: 10, cooldownRecoveryPct: 10 }
  assert.equal(auras.maxHp, 200);
  assert.equal(auras.physDef, 15);
  assert.equal(auras.res_fire, 10);
  assert.equal(auras.res_nature, 10);
  assert.equal(auras.dmgPct, 8);
  assert.equal(auras.moveSpdPct, 10);
  assert.equal(auras.cooldownRecoveryPct, 10);
  assert.equal(auras.magicDef, 0);

  // Unmount colossus: should return titan_heart to player inventory
  const unmountColossus = sys.unmountTrophy('pedestal_colossus', p);
  assert.equal(unmountColossus.success, true);
  assert.equal(sys.isPedestalSocketed('pedestal_colossus'), false);
  assert.equal(p.inventory.find(i => i.itemId === 'titan_heart')?.qty, 2, 'titan_heart returned to inventory');

  // Auras after unmounting
  auras = sys.getTrophyAuras();
  assert.equal(auras.maxHp, 0, 'colossus maxHp bonus removed after unmount');
  assert.equal(auras.physDef, 0);
  assert.equal(auras.dmgPct, 8, 'zenith bonus persists');

  // Unmount again must fail
  assert.equal(sys.unmountTrophy('pedestal_colossus', p).success, false, 'cannot unmount unsocketed pedestal');
}

// ----------------------------------------------------
// 6. Crystal Siege Lifecycle, Waves, Grading & Failure
// ----------------------------------------------------
{
  let nowTime = 500000;
  const sys = createStrongholdSystem({ now: () => nowTime });

  assert.equal(sys.getSiegeState(), null, 'siege state is initially null');

  // Start siege
  const siege = sys.startSiege();
  assert.equal(siege.active, true);
  assert.equal(siege.wave, 1);
  assert.equal(siege.crystalHp, 15000);
  assert.equal(siege.maxCrystalHp, 15000);
  assert.equal(siege.totalWaveFoes, 6);

  // Damage crystal
  const hpAfterDamage = sys.damageCrystal(2000);
  assert.equal(hpAfterDamage, 13000);
  assert.equal(sys.getSiegeState().crystalHp, 13000);

  // Wave advancement 1 -> 2
  sys.advanceSiegeWave();
  assert.equal(sys.getSiegeState().wave, 2);
  assert.equal(sys.getSiegeState().totalWaveFoes, 8); // 4 + 2 + 2

  // Wave advancement 2 -> 3
  sys.advanceSiegeWave();
  assert.equal(sys.getSiegeState().wave, 3);
  assert.equal(sys.getSiegeState().totalWaveFoes, 11); // 6 + 2 + 2 + 1

  // Wave advancement 3 -> no further wave
  sys.advanceSiegeWave();
  assert.equal(sys.getSiegeState().wave, 3, 'wave does not exceed 3');

  // Resolve victory: 13,000 / 15,000 = ~86.67% HP -> Grade S
  const victoryS = sys.resolveSiegeVictory();
  assert.equal(victoryS.success, true);
  assert.equal(victoryS.grade, 'S');
  assert.equal(victoryS.guildPoints, 100);
  assert.equal(victoryS.zeny, 6000);
  assert.equal(victoryS.commendations, 3);
  assert.equal(victoryS.ore, 'blessed_ore');
  assert.equal(victoryS.oreCount, 2);
  assert.equal(sys.getSiegeState().active, false);

  // Second siege: Grade A (50% - 79%)
  sys.startSiege();
  sys.damageCrystal(6000); // 9000 / 15000 = 60%
  const victoryA = sys.resolveSiegeVictory();
  assert.equal(victoryA.grade, 'A');
  assert.equal(victoryA.guildPoints, 60);

  // Third siege: Grade B (1% - 49%)
  sys.startSiege();
  sys.damageCrystal(12000); // 3000 / 15000 = 20%
  const victoryB = sys.resolveSiegeVictory();
  assert.equal(victoryB.grade, 'B');
  assert.equal(victoryB.guildPoints, 35);
  assert.equal(victoryB.ore, null);

  // Fourth siege: Crystal Shatters (Failure)
  sys.startSiege();
  const hpDead = sys.damageCrystal(16000);
  assert.equal(hpDead, 0);
  const state = sys.getSiegeState();
  assert.equal(state.active, false);
  assert.equal(state.failure, true);
  assert.equal(state.cooldownUntil, nowTime + 60000);
}

// ----------------------------------------------------
// 7. Serialization and Deserialization Round-Trip
// ----------------------------------------------------
{
  let nowTime = 2500000;
  const sys1 = createStrongholdSystem({ now: () => nowTime });

  const player = {
    zeny: 999999,
    inventory: [
      { itemId: 'iron_ore', qty: 50 },
      { itemId: 'wood', qty: 50 },
      { itemId: 'titan_heart', qty: 5 },
    ],
  };

  sys1.upgradeFacility('treasury', player, 100, () => {});
  sys1.upgradeFacility('conservatory', player, 100, () => {});
  sys1.claimDailyStipend(player);
  sys1.mountTrophy('pedestal_colossus', player);

  const saved = sys1.serialize();
  assert.deepEqual(saved.facilities, {
    treasury: 1,
    forge: 0,
    conservatory: 1,
    training: 0,
  });
  assert.equal(saved.trophies.pedestal_colossus, true);
  assert.equal(saved.trophies.pedestal_voidmaw, false);
  assert.equal(saved.lastStipendClaimAt, nowTime);

  // Restore into a fresh system instance
  const sys2 = createStrongholdSystem({ now: () => nowTime });
  sys2.deserialize(saved);

  assert.deepEqual(sys2.getFacilities(), saved.facilities);
  assert.equal(sys2.isPedestalSocketed('pedestal_colossus'), true);
  assert.equal(sys2.isPedestalSocketed('pedestal_voidmaw'), false);
  assert.equal(sys2.canClaimDailyStipend(), false, 'stipend cooldown preserved in deserialized state');

  const restoredAuras = sys2.getTrophyAuras();
  assert.equal(restoredAuras.maxHp, 200);
  assert.equal(restoredAuras.physDef, 15);
}

console.log('All Stronghold subsystem unit tests passed successfully!');
