// js/pets.test.js
// Unit tests for Core Companion & Pet Familiars Subsystem.
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  clamp,
  PET_CATALOG,
  BAIT_TO_PET_MAP,
  FEAST_VALUES,
  BOND_EXP_THRESHOLDS,
  createPetsSystem,
} from './systems/pets.js';

test('clamp: correctly bounds values within [min, max]', () => {
  assert.equal(clamp(5, 0, 10), 5);
  assert.equal(clamp(-5, 0, 10), 0);
  assert.equal(clamp(15, 0, 10), 10);
  assert.equal(clamp(0, 0, 10), 0);
  assert.equal(clamp(10, 0, 10), 10);
});

test('PET_CATALOG: defines 5 distinct companions with required properties', () => {
  const companionIds = ['pet_slime', 'pet_wolf', 'pet_sprite', 'pet_bear', 'pet_dragon'];
  assert.equal(Object.keys(PET_CATALOG).length, 5);

  for (const id of companionIds) {
    const pet = PET_CATALOG[id];
    assert.ok(pet, `Catalog contains ${id}`);
    assert.equal(pet.id, id);
    assert.ok(typeof pet.name === 'string' && pet.name.length > 0);
    assert.ok(pet.targetMonster, `${id} has targetMonster`);
    assert.ok(pet.requiredBait, `${id} has requiredBait`);
    assert.ok(pet.baseLootRadius > 0);
    assert.ok(pet.maxLootRadius >= pet.baseLootRadius);
    assert.ok(pet.auras && pet.auras.base && pet.auras.max);
    assert.ok(typeof pet.desc === 'string' && pet.desc.length > 0);

    // Verify BAIT_TO_PET_MAP consistency
    assert.equal(BAIT_TO_PET_MAP[pet.requiredBait], id);
  }

  // Specific companion checks
  const slime = PET_CATALOG.pet_slime;
  assert.equal(slime.name, 'Gel Slime');
  assert.equal(slime.targetMonster, 'slime');
  assert.equal(slime.requiredBait, 'bait_sweet_gelatin');
  assert.equal(slime.baseLootRadius, 2.0);
  assert.equal(slime.maxLootRadius, 3.5);
  assert.deepEqual(slime.auras.base, { hpRegen: 5, moveMult: 0.03 });
  assert.deepEqual(slime.auras.max, { hpRegen: 25, moveMult: 0.07 });

  const wolf = PET_CATALOG.pet_wolf;
  assert.equal(wolf.name, 'Timber Wolf Pup');
  assert.deepEqual(wolf.targetMonster, ['wolf', 'frost_wolf']);
  assert.equal(wolf.requiredBait, 'bait_tender_jerky');

  const sprite = PET_CATALOG.pet_sprite;
  assert.equal(sprite.name, 'Blight Sprite');
  assert.deepEqual(sprite.targetMonster, ['blight_sprite', 'void_wisp']);
  assert.equal(sprite.requiredBait, 'bait_luminous_nectar');

  const bear = PET_CATALOG.pet_bear;
  assert.equal(bear.name, 'Glacial Bear Cub');
  assert.deepEqual(bear.targetMonster, ['tundra_lurker', 'frost_revenant']);
  assert.equal(bear.requiredBait, 'bait_glacial_salmon');

  const dragon = PET_CATALOG.pet_dragon;
  assert.equal(dragon.name, 'Magma Hatchling');
  assert.deepEqual(dragon.targetMonster, ['ember_imp', 'flame_dragon']);
  assert.equal(dragon.requiredBait, 'bait_magma_fruit');
});

test('FEAST_VALUES and BOND_EXP_THRESHOLDS: correctly defined', () => {
  assert.deepEqual(BOND_EXP_THRESHOLDS, [0, 100, 250, 500, 1000]);
  assert.deepEqual(FEAST_VALUES.grilled_trout, { loyalty: 15, exp: 50 });
  assert.deepEqual(FEAST_VALUES.smoked_salmon, { loyalty: 25, exp: 120 });
  assert.deepEqual(FEAST_VALUES.golden_carp_sashimi, { loyalty: 50, exp: 300 });
});

test('createPetsSystem: getPetDef and getPetForMonster lookups', () => {
  const sys = createPetsSystem();

  assert.equal(sys.getPetDef('pet_slime')?.name, 'Gel Slime');
  assert.equal(sys.getPetDef('non_existent'), null);

  assert.equal(sys.getPetForMonster('slime')?.id, 'pet_slime');
  assert.equal(sys.getPetForMonster('wolf')?.id, 'pet_wolf');
  assert.equal(sys.getPetForMonster('frost_wolf')?.id, 'pet_wolf');
  assert.equal(sys.getPetForMonster('blight_sprite')?.id, 'pet_sprite');
  assert.equal(sys.getPetForMonster('void_wisp')?.id, 'pet_sprite');
  assert.equal(sys.getPetForMonster('tundra_lurker')?.id, 'pet_bear');
  assert.equal(sys.getPetForMonster('frost_revenant')?.id, 'pet_bear');
  assert.equal(sys.getPetForMonster('ember_imp')?.id, 'pet_dragon');
  assert.equal(sys.getPetForMonster('flame_dragon')?.id, 'pet_dragon');
  assert.equal(sys.getPetForMonster('goblin'), null);
});

test('createPetsSystem: attemptTame calculates Pokémon-style dynamic catch rates with HP, LUK, and status scaling', () => {
  const sysPass = createPetsSystem({ rnd: () => 0.05 });
  const p = { stats: { luk: 10 } };
  const mHealthy = { id: 'slime', hp: 80, maxHp: 100 };
  const mWeak = { id: 'slime', hp: 20, maxHp: 100 };
  const mDead = { id: 'slime', hp: 0, maxHp: 100 };

  // Rejects invalid monster
  assert.equal(sysPass.attemptTame(p, null, 'bait_sweet_gelatin').success, false);
  assert.equal(sysPass.attemptTame(p, mDead, 'bait_sweet_gelatin').success, false);

  // Can tame healthy monster with low roll (e.g. lucky catch at 80% HP)
  const resHealthy = sysPass.attemptTame(p, mHealthy, 'bait_sweet_gelatin');
  assert.equal(resHealthy.success, true);
  assert.ok(resHealthy.chance > 0.35 && resHealthy.chance < 0.45, `Expected ~41% catch chance at 80% HP (got ${resHealthy.chance})`);

  // Weaker monster has significantly higher catch chance (80% missing HP -> ~74% catch chance)
  const resWeak = sysPass.attemptTame(p, mWeak, 'bait_sweet_gelatin');
  assert.equal(resWeak.success, true);
  assert.ok(resWeak.chance > resHealthy.chance, 'Catch chance increases as HP decreases');
  assert.ok(resWeak.chance > 0.70, `Expected ~74% catch chance at 20% HP (got ${resWeak.chance})`);

  // Rejects wrong bait (bait for another monster or unknown bait)
  const resWrongBait = sysPass.attemptTame(p, mWeak, 'bait_magma_fruit');
  assert.equal(resWrongBait.success, false);
  assert.match(resWrongBait.reason, /rejects/i);

  const resUnknownBait = sysPass.attemptTame(p, mWeak, 'unknown_bait');
  assert.equal(resUnknownBait.success, false);

  // Multi-target monster check: frost_wolf with bait_tender_jerky
  const mWolf = { id: 'frost_wolf', hp: 10, maxHp: 100 };
  const resWolf = sysPass.attemptTame(p, mWolf, 'bait_tender_jerky');
  assert.equal(resWolf.success, true);
  assert.equal(resWolf.petId, 'pet_wolf');

  // Failed roll gives breakout feedback
  const sysFail = createPetsSystem({ rnd: () => 0.95 });
  const resFail = sysFail.attemptTame(p, mWeak, 'bait_sweet_gelatin');
  assert.equal(resFail.success, false);
  assert.match(resFail.reason, /broke free/i);

  // LUK scaling verification
  // At hp = 80 / 100: missingHp = 0.20 -> 0.25 + 0.11 = 0.36
  // With luk = 0: chance = 0.36
  // With luk = 40: lukBonus = 40 * 0.005 = 0.20 -> chance = 0.56
  // A roll of 0.45 should fail with luk = 0, but pass with luk = 40
  const sysLukTest = createPetsSystem({ rnd: () => 0.45 });
  const pLowLuk = { stats: { luk: 0 } };
  const pHighLuk = { stats: { luk: 40 } };
  assert.equal(sysLukTest.attemptTame(pLowLuk, mHealthy, 'bait_sweet_gelatin').success, false);
  assert.equal(sysLukTest.attemptTame(pHighLuk, mHealthy, 'bait_sweet_gelatin').success, true);

  // Status condition bonus verification (+15% when monster is afflicted with status)
  const mStatus = { id: 'slime', hp: 80, maxHp: 100, status: { slow: 2 } };
  const sysStatusTest = createPetsSystem({ rnd: () => 0.50 });
  assert.equal(sysStatusTest.attemptTame(pLowLuk, mHealthy, 'bait_sweet_gelatin').success, false);
  assert.equal(sysStatusTest.attemptTame(pLowLuk, mStatus, 'bait_sweet_gelatin').success, true);
});

test('createPetsSystem: feedPet increases loyalty and advances bond levels', () => {
  const sys = createPetsSystem();
  const pet = { id: 'pet_slime', bondLevel: 1, loyalty: 20, exp: 0 };

  // Feed grilled trout (+15 loyalty, +50 exp)
  const res1 = sys.feedPet(pet, 'grilled_trout');
  assert.equal(res1.success, true);
  assert.equal(pet.loyalty, 35);
  assert.equal(pet.exp, 50);
  assert.equal(pet.bondLevel, 1);

  // Feed smoked salmon (+25 loyalty, +120 exp -> loyalty 60, exp 170)
  // 170 exp >= 100 threshold -> bondLevel 2
  const res2 = sys.feedPet(pet, 'smoked_salmon');
  assert.equal(res2.success, true);
  assert.equal(pet.loyalty, 60);
  assert.equal(pet.exp, 170);
  assert.equal(pet.bondLevel, 2);

  // Feed golden carp sashimi (+50 loyalty, +300 exp -> loyalty capped at 100, exp 470)
  // 470 exp >= 250 threshold -> bondLevel 3
  const res3 = sys.feedPet(pet, 'golden_carp_sashimi');
  assert.equal(res3.success, true);
  assert.equal(pet.loyalty, 100);
  assert.equal(pet.exp, 470);
  assert.equal(pet.bondLevel, 3);

  // Unknown dish: default { loyalty: 5, exp: 20 }
  const resDefault = sys.feedPet(pet, 'mysterious_snack');
  assert.equal(resDefault.success, true);
  assert.equal(pet.loyalty, 100); // Already at max clamp 100
  assert.equal(pet.exp, 490);
  assert.equal(pet.bondLevel, 3);

  // Threshold progression to Lv 4 (500 exp) and Lv 5 (1000 exp)
  sys.feedPet(pet, 'grilled_trout'); // +50 exp -> 540 exp >= 500 -> bondLevel 4
  assert.equal(pet.bondLevel, 4);

  sys.feedPet(pet, 'golden_carp_sashimi'); // +300 -> 840 exp
  sys.feedPet(pet, 'golden_carp_sashimi'); // +300 -> 1140 exp >= 1000 -> bondLevel 5
  assert.equal(pet.bondLevel, 5);
  assert.equal(pet.exp, 1140);
});

test('createPetsSystem: computeAuraStats interpolates between base and max and applies Devoted bonus', () => {
  const sys = createPetsSystem();

  // Invalid or null input returns empty object
  assert.deepEqual(sys.computeAuraStats(null), {});
  assert.deepEqual(sys.computeAuraStats({}), {});
  assert.deepEqual(sys.computeAuraStats({ id: 'unknown_pet' }), {});

  // Timber Wolf Pup: base { physAtkPct: 0.06, critChance: 4 }, max { physAtkPct: 0.18, critChance: 10 }
  // Lv 1, loyalty 50 (non-devoted)
  const petLv1 = { id: 'pet_wolf', bondLevel: 1, loyalty: 50 };
  const statsLv1 = sys.computeAuraStats(petLv1);
  assert.equal(statsLv1.physAtkPct, 0.06);
  assert.equal(statsLv1.critChance, 4);

  // Lv 3 (midpoint t = (3 - 1)/4 = 0.5), loyalty 50
  // physAtkPct: 0.06 + (0.18 - 0.06) * 0.5 = 0.12
  // critChance: 4 + (10 - 4) * 0.5 = 7
  const petLv3 = { id: 'pet_wolf', bondLevel: 3, loyalty: 50 };
  const statsLv3 = sys.computeAuraStats(petLv3);
  assert.equal(statsLv3.physAtkPct, 0.12);
  assert.equal(statsLv3.critChance, 7);

  // Lv 5, loyalty 79 (just below devoted threshold 80)
  const petLv5Normal = { id: 'pet_wolf', bondLevel: 5, loyalty: 79 };
  const statsLv5Normal = sys.computeAuraStats(petLv5Normal);
  assert.equal(statsLv5Normal.physAtkPct, 0.18);
  assert.equal(statsLv5Normal.critChance, 10);

  // Lv 5, loyalty 80 (Devoted bonus +10% multiplier)
  // physAtkPct: 0.18 * 1.10 = 0.198
  // critChance: 10 * 1.10 = 11
  const petLv5Devoted = { id: 'pet_wolf', bondLevel: 5, loyalty: 80 };
  const statsLv5Devoted = sys.computeAuraStats(petLv5Devoted);
  assert.equal(statsLv5Devoted.physAtkPct, 0.198);
  assert.equal(statsLv5Devoted.critChance, 11);

  // Magma Hatchling multi-stat check with devoted bonus
  const petDragonDevoted = { id: 'pet_dragon', bondLevel: 1, loyalty: 90 };
  const statsDragon = sys.computeAuraStats(petDragonDevoted);
  // base: { dmg_fire: 10, dmg_void: 10, critDmgPct: 0.15, zenyMult: 1.10 }
  // * 1.10 -> dmg_fire: 11, dmg_void: 11, critDmgPct: 0.165, zenyMult: 1.21
  assert.equal(statsDragon.dmg_fire, 11);
  assert.equal(statsDragon.dmg_void, 11);
  assert.equal(statsDragon.critDmgPct, 0.165);
  assert.equal(statsDragon.zenyMult, 1.21);
});

test('createPetsSystem: getAutoLootRadius scales from Lv1 to Lv5', () => {
  const sys = createPetsSystem();

  // Fallback for null / missing def
  assert.equal(sys.getAutoLootRadius(null), 2.0);
  assert.equal(sys.getAutoLootRadius({ id: 'unknown' }), 2.0);

  // Gel Slime: base 2.0, max 3.5
  assert.equal(sys.getAutoLootRadius({ id: 'pet_slime', bondLevel: 1 }), 2.0);
  assert.equal(sys.getAutoLootRadius({ id: 'pet_slime', bondLevel: 3 }), 2.75);
  assert.equal(sys.getAutoLootRadius({ id: 'pet_slime', bondLevel: 5 }), 3.5);

  // Magma Hatchling: base 3.5, max 5.0
  assert.equal(sys.getAutoLootRadius({ id: 'pet_dragon', bondLevel: 1 }), 3.5);
  assert.equal(sys.getAutoLootRadius({ id: 'pet_dragon', bondLevel: 5 }), 5.0);
});

test('createPetsSystem: getBondLootBonus activates at Lv3 and Lv5', () => {
  const sys = createPetsSystem();

  assert.deepEqual(sys.getBondLootBonus(null), { zenyBonusPct: 0.0, dupeMatChance: 0.0 });
  assert.deepEqual(sys.getBondLootBonus({ bondLevel: 1 }), { zenyBonusPct: 0.0, dupeMatChance: 0.0 });
  assert.deepEqual(sys.getBondLootBonus({ bondLevel: 2 }), { zenyBonusPct: 0.0, dupeMatChance: 0.0 });
  assert.deepEqual(sys.getBondLootBonus({ bondLevel: 3 }), { zenyBonusPct: 0.10, dupeMatChance: 0.0 });
  assert.deepEqual(sys.getBondLootBonus({ bondLevel: 4 }), { zenyBonusPct: 0.10, dupeMatChance: 0.0 });
  assert.deepEqual(sys.getBondLootBonus({ bondLevel: 5 }), { zenyBonusPct: 0.20, dupeMatChance: 0.05 });
});

test('createPetsSystem: serialize and deserialize preserve companion state cleanly', () => {
  const sys = createPetsSystem();

  // Handling empty / null cases
  assert.deepEqual(sys.serialize(null), { activePetId: null, owned: {} });
  assert.deepEqual(sys.deserialize(null), { activePetId: null, owned: {} });

  const state = {
    activePetId: 'pet_slime',
    owned: {
      pet_slime: { id: 'pet_slime', bondLevel: 2, loyalty: 60, exp: 120 },
      pet_wolf: { id: 'pet_wolf', bondLevel: 4, loyalty: 90, exp: 600 },
    },
  };

  const serialized = sys.serialize(state);
  assert.equal(serialized.activePetId, 'pet_slime');
  assert.equal(serialized.owned.pet_slime.bondLevel, 2);
  assert.equal(serialized.owned.pet_wolf.loyalty, 90);

  // Modify original state to ensure deep copy
  state.owned.pet_slime.bondLevel = 99;
  assert.equal(serialized.owned.pet_slime.bondLevel, 2);

  const restored = sys.deserialize(serialized);
  assert.equal(restored.activePetId, 'pet_slime');
  assert.equal(restored.owned.pet_slime.bondLevel, 2);
  assert.equal(restored.owned.pet_wolf.loyalty, 90);

  // Modify restored state to ensure decoupled copy
  restored.owned.pet_wolf.loyalty = 10;
  assert.equal(serialized.owned.pet_wolf.loyalty, 90);
});
