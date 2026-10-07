// js/spire.test.js
// Unit tests for the Abyssal Spire Challenge Tower Subsystem.

import assert from 'node:assert/strict';
import {
  SPIRE_BIOMES,
  SPIRE_AFFIXES,
  CHECKPOINT_FLOORS,
  MILESTONE_BOSS_FLOORS,
  createSpireSystem,
} from './systems/spire.js';

let mockTime = 1700000000000;
const now = () => mockTime;
let mockSeed = 0.12345;
const rnd = () => {
  mockSeed = (mockSeed * 9301 + 49297) % 233280;
  return mockSeed / 233280;
};

// -------------------------------------------------------------
// 1. Biome Routing Across All 5 Tiers
// -------------------------------------------------------------
{
  const spire = createSpireSystem({ now, rnd });

  // Tier 1: Shadow Depths (1-20)
  assert.equal(spire.getBiomeForFloor(1).id, 'depths', 'F1 belongs to Shadow Depths');
  assert.equal(spire.getBiomeForFloor(10).id, 'depths', 'F10 belongs to Shadow Depths');
  assert.equal(spire.getBiomeForFloor(20).id, 'depths', 'F20 belongs to Shadow Depths');
  assert.equal(spire.getBiomeForFloor(1).name, 'Shadow Depths');
  assert.equal(spire.getBiomeForFloor(1).color, '#4a148c');
  assert.deepEqual(spire.getBiomeForFloor(1).pool, ['shade', 'corrupted_dryad', 'mire_leech', 'blight_sprite']);

  // Tier 2: Glacial Ascent (21-40)
  assert.equal(spire.getBiomeForFloor(21).id, 'glacial', 'F21 belongs to Glacial Ascent');
  assert.equal(spire.getBiomeForFloor(30).id, 'glacial', 'F30 belongs to Glacial Ascent');
  assert.equal(spire.getBiomeForFloor(40).id, 'glacial', 'F40 belongs to Glacial Ascent');
  assert.equal(spire.getBiomeForFloor(21).name, 'Glacial Ascent');
  assert.equal(spire.getBiomeForFloor(21).color, '#0277bd');

  // Tier 3: Magma Foundry (41-60)
  assert.equal(spire.getBiomeForFloor(41).id, 'caldera', 'F41 belongs to Magma Foundry');
  assert.equal(spire.getBiomeForFloor(50).id, 'caldera', 'F50 belongs to Magma Foundry');
  assert.equal(spire.getBiomeForFloor(60).id, 'caldera', 'F60 belongs to Magma Foundry');
  assert.equal(spire.getBiomeForFloor(41).name, 'Magma Foundry');
  assert.equal(spire.getBiomeForFloor(41).color, '#d84315');

  // Tier 4: Storm Spires (61-80)
  assert.equal(spire.getBiomeForFloor(61).id, 'storm', 'F61 belongs to Storm Spires');
  assert.equal(spire.getBiomeForFloor(70).id, 'storm', 'F70 belongs to Storm Spires');
  assert.equal(spire.getBiomeForFloor(80).id, 'storm', 'F80 belongs to Storm Spires');
  assert.equal(spire.getBiomeForFloor(61).name, 'Storm Spires');
  assert.equal(spire.getBiomeForFloor(61).color, '#f57f17');

  // Tier 5: Void Zenith (81-100)
  assert.equal(spire.getBiomeForFloor(81).id, 'void', 'F81 belongs to Void Zenith');
  assert.equal(spire.getBiomeForFloor(90).id, 'void', 'F90 belongs to Void Zenith');
  assert.equal(spire.getBiomeForFloor(100).id, 'void', 'F100 belongs to Void Zenith');
  assert.equal(spire.getBiomeForFloor(100).name, 'Void Zenith');
  assert.equal(spire.getBiomeForFloor(100).color, '#212121');

  // Clamping check for out-of-bounds inputs
  assert.equal(spire.getBiomeForFloor(0).id, 'depths', 'Floor <= 0 clamps to Depths');
  assert.equal(spire.getBiomeForFloor(-5).id, 'depths', 'Negative floor clamps to Depths');
  assert.equal(spire.getBiomeForFloor(105).id, 'void', 'Floor > 100 clamps to Void');
}

// -------------------------------------------------------------
// 2. Stat Scaling Math (Spec Formulas)
// -------------------------------------------------------------
{
  const spire = createSpireSystem({ now, rnd });

  // Formula checks:
  // hpMult = (1 + (floor - 1) * 0.08) * (isBoss ? 3.5 : 1.0)
  // atkMult = 1 + (floor - 1) * 0.04
  // defMult = 1 + (floor - 1) * 0.025

  // Floor 1 Normal
  const scaleF1 = spire.getFloorStatScale(1, false);
  assert.equal(scaleF1.hpMult, 1.000);
  assert.equal(scaleF1.atkMult, 1.000);
  assert.equal(scaleF1.defMult, 1.000);

  // Floor 1 Boss
  const scaleF1Boss = spire.getFloorStatScale(1, true);
  assert.equal(scaleF1Boss.hpMult, 3.500);
  assert.equal(scaleF1Boss.atkMult, 1.000);
  assert.equal(scaleF1Boss.defMult, 1.000);

  // Floor 10 Normal: (1 + 9 * 0.08) = 1.72
  const scaleF10 = spire.getFloorStatScale(10, false);
  assert.equal(scaleF10.hpMult, 1.720);
  assert.equal(scaleF10.atkMult, 1.360);
  assert.equal(scaleF10.defMult, 1.225);

  // Floor 10 Boss: 1.72 * 3.5 = 6.02
  const scaleF10Boss = spire.getFloorStatScale(10, true);
  assert.equal(scaleF10Boss.hpMult, 6.020);
  assert.equal(scaleF10Boss.atkMult, 1.360);
  assert.equal(scaleF10Boss.defMult, 1.225);

  // Floor 50 Normal & Boss: hpMult base = 1 + 49*0.08 = 4.92; Boss = 4.92 * 3.5 = 17.22
  const scaleF50 = spire.getFloorStatScale(50, false);
  assert.equal(scaleF50.hpMult, 4.920);
  assert.equal(scaleF50.atkMult, 2.960);
  assert.equal(scaleF50.defMult, 2.225);
  const scaleF50Boss = spire.getFloorStatScale(50, true);
  assert.equal(scaleF50Boss.hpMult, 17.220);

  // Floor 100 Boss: hpMult base = 1 + 99*0.08 = 8.92; Boss = 8.92 * 3.5 = 31.22
  const scaleF100Boss = spire.getFloorStatScale(100, true);
  assert.equal(scaleF100Boss.hpMult, 31.220);
  assert.equal(scaleF100Boss.atkMult, 4.960);
  assert.equal(scaleF100Boss.defMult, 3.475);
}

// -------------------------------------------------------------
// 3. Milestone Floor Detection & Milestone Boss IDs
// -------------------------------------------------------------
{
  const spire = createSpireSystem({ now, rnd });

  const milestoneFloors = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  for (let f = 1; f <= 105; f++) {
    const isMilestone = milestoneFloors.includes(f);
    assert.equal(spire.isMilestoneFloor(f), isMilestone, `isMilestoneFloor check for ${f}`);
  }

  assert.equal(spire.getMilestoneBossId(10), 'corrupted_treant_boss');
  assert.equal(spire.getMilestoneBossId(20), 'abyssal_siren_golem_boss');
  assert.equal(spire.getMilestoneBossId(30), 'frost_alpha_boss');
  assert.equal(spire.getMilestoneBossId(40), 'glacial_dragon_boss');
  assert.equal(spire.getMilestoneBossId(50), 'caldera_avatar_boss');
  assert.equal(spire.getMilestoneBossId(60), 'magma_lord_boss');
  assert.equal(spire.getMilestoneBossId(70), 'tempest_warden_boss');
  assert.equal(spire.getMilestoneBossId(80), 'twin_elementals_boss');
  assert.equal(spire.getMilestoneBossId(90), 'herald_sovereign_boss');
  assert.equal(spire.getMilestoneBossId(100), 'nullking_spire_boss');

  assert.equal(spire.getMilestoneBossId(1), null);
  assert.equal(spire.getMilestoneBossId(45), null);
  assert.equal(spire.getMilestoneBossId(99), null);
}

// -------------------------------------------------------------
// 4. Dynamic Affix Count: 1 on F1-40, 2 on F41-100
// -------------------------------------------------------------
{
  const spire = createSpireSystem({ now, rnd });

  const checkAffixes = (floor, expectedCount) => {
    const affixes = spire.rollFloorAffixes(floor);
    assert.equal(affixes.length, expectedCount, `Floor ${floor} should roll exactly ${expectedCount} affixes`);
    affixes.forEach(affix => {
      assert.ok(affix.id && affix.name && affix.icon && affix.desc, 'Affix has all required descriptor fields');
      assert.ok(SPIRE_AFFIXES[affix.id], `Affix ${affix.id} is in SPIRE_AFFIXES catalog`);
    });
    if (expectedCount > 1) {
      const ids = new Set(affixes.map(a => a.id));
      assert.equal(ids.size, expectedCount, `Affixes rolled on floor ${floor} must be distinct`);
    }
  };

  checkAffixes(1, 1);
  checkAffixes(20, 1);
  checkAffixes(40, 1);
  checkAffixes(41, 2);
  checkAffixes(60, 2);
  checkAffixes(85, 2);
  checkAffixes(100, 2);
}

// -------------------------------------------------------------
// 5. Checkpoint Elevator Unlocks
// -------------------------------------------------------------
{
  const spire = createSpireSystem({ now, rnd });
  assert.deepEqual(spire.getUnlockedCheckpoints(), [1], 'Only Floor 1 unlocked initially');
  assert.equal(spire.isCheckpointUnlocked(1), true);
  assert.equal(spire.isCheckpointUnlocked(11), false);

  // Attempting to start at locked checkpoint should fail
  assert.equal(spire.startRun(11), null, 'Cannot start at locked checkpoint 11');

  // Start at F1 and climb to F10
  const run = spire.startRun(1);
  assert.ok(run, 'Run starts at Floor 1');
  assert.equal(run.currentFloor, 1);
  assert.equal(run.cleared, false);

  // Clear floors 1 to 9
  for (let f = 1; f <= 9; f++) {
    const result = spire.clearFloor();
    assert.equal(result.floor, f);
    assert.equal(result.unlockedCheckpoint, null, 'Non-milestone floor does not unlock checkpoint');
    if (f < 9) {
      const advanced = spire.advanceFloor();
      assert.equal(advanced.currentFloor, f + 1);
    }
  }

  // Advance to F10 and clear it
  spire.advanceFloor();
  assert.equal(spire.getActiveRun().currentFloor, 10);
  const f10Result = spire.clearFloor();
  assert.equal(f10Result.unlockedCheckpoint, 11, 'Clearing F10 unlocks F11');
  assert.equal(spire.isCheckpointUnlocked(11), true, 'F11 is marked unlocked');
  assert.deepEqual(spire.getUnlockedCheckpoints(), [1, 11]);

  // End run and start directly at newly unlocked F11
  spire.endRun('completed');
  assert.equal(spire.getActiveRun(), null);

  const run2 = spire.startRun(11);
  assert.ok(run2, 'Able to start run at checkpoint 11');
  assert.equal(run2.currentFloor, 11);

  // Simulate clearing up to F20
  for (let f = 11; f <= 19; f++) {
    spire.clearFloor();
    spire.advanceFloor();
  }
  assert.equal(spire.getActiveRun().currentFloor, 20);
  const f20Result = spire.clearFloor();
  assert.equal(f20Result.unlockedCheckpoint, 21, 'Clearing F20 unlocks F21');
  assert.equal(spire.isCheckpointUnlocked(21), true);
  assert.deepEqual(spire.getUnlockedCheckpoints(), [1, 11, 21]);
}

// -------------------------------------------------------------
// 6. Spire Emblem Awards (Standard, Boss, First-Clear)
// -------------------------------------------------------------
{
  const spire = createSpireSystem({ now, rnd });

  // Formula:
  // base = isMilestoneFloor(floor) ? 15 : (1 + Math.floor(floor / 30));
  // bonus = isFirstClear ? (isMilestoneFloor(floor) ? 50 : 0) : 0;
  // return base + bonus;

  // Standard floors
  assert.equal(spire.calculateFloorEmblems(1, false), 1, 'F1 repeat: 1');
  assert.equal(spire.calculateFloorEmblems(1, true), 1, 'F1 first clear: 1 (non-milestone bonus is 0)');
  assert.equal(spire.calculateFloorEmblems(29, false), 1, 'F29 repeat: 1');
  assert.equal(spire.calculateFloorEmblems(31, false), 2, 'F31 repeat: 2 (1 + floor(31/30))');
  assert.equal(spire.calculateFloorEmblems(61, false), 3, 'F61 repeat: 3 (1 + floor(61/30))');
  assert.equal(spire.calculateFloorEmblems(91, false), 4, 'F91 repeat: 4 (1 + floor(91/30))');

  // Milestone boss floors
  assert.equal(spire.calculateFloorEmblems(10, false), 15, 'F10 repeat: 15');
  assert.equal(spire.calculateFloorEmblems(10, true), 65, 'F10 first-clear: 15 base + 50 bonus = 65');
  assert.equal(spire.calculateFloorEmblems(50, false), 15, 'F50 repeat: 15');
  assert.equal(spire.calculateFloorEmblems(50, true), 65, 'F50 first-clear: 65');
  assert.equal(spire.calculateFloorEmblems(100, true), 65, 'F100 first-clear: 65');

  // Live clear tracking
  spire.startRun(1);
  const clear1 = spire.clearFloor();
  assert.equal(clear1.earnedEmblems, 1);
  assert.equal(spire.getEmblems(), 1);

  // Advance and clear F2
  spire.advanceFloor();
  const clear2 = spire.clearFloor();
  assert.equal(clear2.earnedEmblems, 1);
  assert.equal(spire.getEmblems(), 2);
  spire.endRun();

  // Re-run floor 1 (highestFloor is now 2)
  spire.startRun(1);
  const reClear1 = spire.clearFloor();
  assert.equal(reClear1.earnedEmblems, 1);
  assert.equal(spire.getEmblems(), 3);
}

// -------------------------------------------------------------
// 7. Prestige Titles at Floor 50 and Floor 100
// -------------------------------------------------------------
{
  const spire = createSpireSystem({ now, rnd });
  assert.deepEqual(spire.serialize().unlockedTitles, []);

  // Jump to F49 by setting state via deserialize or clearing
  spire.deserialize({
    highestFloor: 49,
    unlockedCheckpoints: [1, 11, 21, 31, 41],
    emblems: 0,
    unlockedTitles: [],
  });

  spire.startRun(41);
  for (let f = 41; f <= 49; f++) {
    spire.clearFloor();
    spire.advanceFloor();
  }
  assert.equal(spire.getActiveRun().currentFloor, 50);

  const f50Clear = spire.clearFloor();
  assert.equal(f50Clear.titleUnlocked, 'title_spire_challenger', 'F50 awards title_spire_challenger');
  assert.ok(spire.serialize().unlockedTitles.includes('title_spire_challenger'));

  // Climb up to F100
  spire.deserialize({
    highestFloor: 99,
    unlockedCheckpoints: [1, 11, 21, 31, 41, 51, 61, 71, 81, 91],
    emblems: 100,
    unlockedTitles: ['title_spire_challenger'],
  });

  spire.startRun(91);
  for (let f = 91; f <= 99; f++) {
    spire.clearFloor();
    spire.advanceFloor();
  }
  assert.equal(spire.getActiveRun().currentFloor, 100);

  const f100Clear = spire.clearFloor();
  assert.equal(f100Clear.titleUnlocked, 'title_abyssal_sovereign', 'F100 awards title_abyssal_sovereign');
  assert.ok(spire.serialize().unlockedTitles.includes('title_abyssal_sovereign'));
  assert.ok(spire.serialize().unlockedTitles.includes('title_spire_challenger'));

  // Advance past 100 should return null (tower conquered)
  assert.equal(spire.advanceFloor(), null, 'Cannot advance past Floor 100');
}

// -------------------------------------------------------------
// 8. Emblem Spending for Reliquary Purchases
// -------------------------------------------------------------
{
  const spire = createSpireSystem({ now, rnd });
  assert.equal(spire.getEmblems(), 0);

  // Cannot spend when 0
  assert.equal(spire.spendEmblems(50), false, 'Cannot spend emblems without balance');
  assert.equal(spire.getEmblems(), 0);

  // Set emblems via deserialize
  spire.deserialize({
    highestFloor: 50,
    unlockedCheckpoints: [1, 11, 21, 31, 41, 51],
    emblems: 150,
    unlockedTitles: ['title_spire_challenger'],
  });

  assert.equal(spire.getEmblems(), 150);

  // Spend partial amount
  assert.equal(spire.spendEmblems(50), true, 'Spend 50 emblems succeeds');
  assert.equal(spire.getEmblems(), 100, 'Remaining balance is 100');

  // Try spending more than remaining
  assert.equal(spire.spendEmblems(150), false, 'Overspending fails');
  assert.equal(spire.getEmblems(), 100, 'Balance unchanged after failed spend');

  // Spend exact remaining amount
  assert.equal(spire.spendEmblems(100), true, 'Exact spend succeeds');
  assert.equal(spire.getEmblems(), 0, 'Balance is now 0');
}

// -------------------------------------------------------------
// 9. State Serialization and Deserialization Round-Trip
// -------------------------------------------------------------
{
  const spire1 = createSpireSystem({ now, rnd });
  spire1.deserialize({
    highestFloor: 75,
    unlockedCheckpoints: [1, 11, 21, 31, 41, 51, 61, 71],
    emblems: 420,
    unlockedTitles: ['title_spire_challenger'],
  });

  const serialized = spire1.serialize();
  assert.equal(serialized.highestFloor, 75);
  assert.deepEqual(serialized.unlockedCheckpoints, [1, 11, 21, 31, 41, 51, 61, 71]);
  assert.equal(serialized.emblems, 420);
  assert.deepEqual(serialized.unlockedTitles, ['title_spire_challenger']);

  const spire2 = createSpireSystem({ now, rnd });
  spire2.deserialize(serialized);
  assert.equal(spire2.getHighestFloor(), 75);
  assert.deepEqual(spire2.getUnlockedCheckpoints(), [1, 11, 21, 31, 41, 51, 61, 71]);
  assert.equal(spire2.getEmblems(), 420);
  assert.deepEqual(spire2.serialize().unlockedTitles, ['title_spire_challenger']);

  // Edge cases in deserialization: null or empty data
  const spire3 = createSpireSystem({ now, rnd });
  spire3.deserialize(null);
  assert.equal(spire3.getHighestFloor(), 0);
  assert.deepEqual(spire3.getUnlockedCheckpoints(), [1]);
  assert.equal(spire3.getEmblems(), 0);

  spire3.deserialize({});
  assert.equal(spire3.getHighestFloor(), 0);
  assert.deepEqual(spire3.getUnlockedCheckpoints(), [1]);
  assert.equal(spire3.getEmblems(), 0);
}

// -------------------------------------------------------------
// Checkpoint floors catalog check
// -------------------------------------------------------------
{
  assert.deepEqual(CHECKPOINT_FLOORS, [1, 11, 21, 31, 41, 51, 61, 71, 81, 91]);
  assert.equal(Object.keys(MILESTONE_BOSS_FLOORS).length, 10);
  assert.equal(Object.keys(SPIRE_BIOMES).length, 5);
  assert.equal(Object.keys(SPIRE_AFFIXES).length, 8);
}

console.log('All Abyssal Spire subsystem unit tests passed.');
