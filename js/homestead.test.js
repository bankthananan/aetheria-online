import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createHomesteadSystem,
  CROP_DEFINITIONS,
  MANNEQUIN_SLOTS,
  PASTURE_FORAGE_TABLE,
  HEARTH_BUFF_DURATION_MS,
  PETTING_COOLDOWN_MS,
} from './systems/homestead.js';

test('homestead: constants validation', () => {
  assert.ok(CROP_DEFINITIONS.seed_silverleaf);
  assert.ok(CROP_DEFINITIONS.seed_golden_wheat);
  assert.ok(CROP_DEFINITIONS.seed_moonflower);
  assert.ok(CROP_DEFINITIONS.seed_ember_blossom);

  assert.equal(CROP_DEFINITIONS.seed_silverleaf.produceId, 'silverleaf');
  assert.equal(CROP_DEFINITIONS.seed_golden_wheat.produceId, 'golden_grain');
  assert.equal(CROP_DEFINITIONS.seed_moonflower.produceId, 'moonlight_lotus');
  assert.equal(CROP_DEFINITIONS.seed_ember_blossom.produceId, 'ember_blossom');

  assert.ok(Array.isArray(MANNEQUIN_SLOTS));
  assert.ok(MANNEQUIN_SLOTS.includes('weapon'));
  assert.ok(MANNEQUIN_SLOTS.includes('body'));

  assert.equal(HEARTH_BUFF_DURATION_MS, 1800000); // 30 mins
  assert.equal(PETTING_COOLDOWN_MS, 86400000); // 24 hours
});

test('homestead: crop planting, watering speed boost, growth stages and harvest', () => {
  let virtualNow = 1000;
  const sys = createHomesteadSystem({ now: () => virtualNow });
  const player = {
    inventory: [{ itemId: 'seed_silverleaf', qty: 2 }]
  };

  // Initial plots are 6 empty plots
  const plots = sys.getPlots();
  assert.equal(plots.length, 6);
  assert.equal(plots[0].stage, 0);

  // Invalid plot index fails
  assert.equal(sys.plantSeed(-1, 'seed_silverleaf', player).success, false);
  assert.equal(sys.plantSeed(6, 'seed_silverleaf', player).success, false);

  // 1. Plant seed in Plot 0
  const plantRes = sys.plantSeed(0, 'seed_silverleaf', player);
  assert.equal(plantRes.success, true);
  assert.equal(player.inventory.find(i => i.itemId === 'seed_silverleaf').qty, 1);
  let plot = sys.getPlot(0);
  assert.equal(plot.cropId, 'seed_silverleaf');
  assert.equal(plot.stage, 1); // SEEDLING
  assert.equal(plot.watered, false);

  // Planting again on occupied plot fails
  assert.equal(sys.plantSeed(0, 'seed_silverleaf', player).success, false);

  // 2. Water plot (doubles growth speed)
  const waterRes = sys.waterPlot(0);
  assert.equal(waterRes.success, true);
  assert.equal(sys.getPlot(0).watered, true);

  // 3. Advance virtual time: base 300s -> watered takes 150s.
  // At 75s (halfway) -> VEGETATIVE (stage 2)
  virtualNow += 75000;
  sys.tickCrops(75000);
  assert.equal(sys.getPlot(0).stage, 2);

  // At 151s -> MATURE (stage 3)
  virtualNow += 80000;
  sys.tickCrops(80000);
  assert.equal(sys.getPlot(0).stage, 3);

  // 4. Harvest crop
  const harvestRes = sys.harvestPlot(0, player);
  assert.equal(harvestRes.success, true);
  assert.ok(harvestRes.yieldQty >= 2);
  assert.ok(player.inventory.some(i => i.itemId === 'silverleaf'));
  assert.equal(sys.getPlot(0).cropId, null);
  assert.equal(sys.getPlot(0).stage, 0); // EMPTY
});

test('homestead: companion pasture daily petting and forage gift collection', () => {
  let virtualNow = 10000;
  const sys = createHomesteadSystem({ now: () => virtualNow });
  const ownedPets = {
    slime_pet: { id: 'slime_pet', loyalty: 45, level: 1 },
    wolf_pet: { id: 'wolf_pet', loyalty: 50, level: 1 }
  };
  const player = { inventory: [] };

  // 1. Daily petting increases loyalty
  const petRes = sys.petCompanion('slime_pet', ownedPets);
  assert.equal(petRes.success, true);
  assert.equal(ownedPets.slime_pet.loyalty, 50);

  // Repeated petting on same day fails cooldown
  const petAgain = sys.petCompanion('slime_pet', ownedPets);
  assert.equal(petAgain.success, false);

  // Petting non-existent pet fails
  assert.equal(sys.petCompanion('dragon_pet', ownedPets).success, false);

  // Petting after 24 hours succeeds
  virtualNow += PETTING_COOLDOWN_MS + 100;
  const petNextDay = sys.petCompanion('slime_pet', ownedPets);
  assert.equal(petNextDay.success, true);
  assert.equal(ownedPets.slime_pet.loyalty, 55);

  // 2. Daily forage gifts for loyal pets (loyalty >= 40)
  sys.generatePastureGifts(ownedPets);
  const gifts = sys.getPendingPastureGifts();
  assert.ok(gifts.length >= 2);

  // Collect gifts into player inventory
  const collectRes = sys.collectPastureGifts(player);
  assert.equal(collectRes.success, true);
  assert.ok(player.inventory.some(i => i.itemId === 'slime_gel'));
  assert.equal(sys.getPendingPastureGifts().length, 0);

  // Collecting again when empty returns false
  assert.equal(sys.collectPastureGifts(player).success, false);
});

test('homestead: armory mannequin 1-click equipment swap and retrieve', () => {
  const sys = createHomesteadSystem();
  const player = {
    equip: {
      weapon: { id: 'iron_sword', uid: 'w1' },
      head: { id: 'iron_helm', uid: 'h1' },
      body: null,
      shield: null,
      accessory1: null,
      accessory2: null,
      relic: null
    },
    inventory: []
  };

  // 1. Save current gear to Mannequin A
  const saveRes = sys.saveLoadout('mannequin_a', player);
  assert.equal(saveRes.success, true);
  assert.equal(sys.getMannequin('mannequin_a').loadout.weapon.id, 'iron_sword');
  assert.equal(sys.getMannequin('mannequin_a').loadout.head.id, 'iron_helm');

  // 2. Change player's weapon to wooden_staff
  player.equip.weapon = { id: 'wooden_staff', uid: 'w2' };

  // 3. Swap loadout atomically
  const swapRes = sys.swapLoadout('mannequin_a', player);
  assert.equal(swapRes.success, true);
  assert.equal(player.equip.weapon.id, 'iron_sword');
  assert.equal(sys.getMannequin('mannequin_a').loadout.weapon.id, 'wooden_staff');

  // 4. Retrieve loadout moves mannequin items to inventory and empties mannequin
  const retRes = sys.retrieveLoadout('mannequin_a', player);
  assert.equal(retRes.success, true);
  assert.ok(player.inventory.some(i => i.id === 'wooden_staff' || i.itemId === 'wooden_staff'));
  assert.equal(sys.getMannequin('mannequin_a').loadout.weapon, null);
});

test('homestead: cozy hearth rest restores health and grants Well Rested buff', () => {
  let virtualNow = 20000;
  const sys = createHomesteadSystem({ now: () => virtualNow });
  const player = { hp: 50, maxHp: 200, mp: 10, maxMp: 100 };

  const restRes = sys.restAtHearth(player);
  assert.equal(restRes.success, true);
  assert.equal(player.hp, 200);
  assert.equal(player.mp, 100);
  assert.equal(sys.isHearthBuffActive(), true);
  assert.equal(sys.getHearthBuffTimeRemaining(), HEARTH_BUFF_DURATION_MS);

  // Time passes past 30 minutes
  virtualNow += HEARTH_BUFF_DURATION_MS + 1000;
  assert.equal(sys.isHearthBuffActive(), false);
  assert.equal(sys.getHearthBuffTimeRemaining(), 0);
});

test('homestead: state serialization and deserialization round-trip', () => {
  let virtualNow = 50000;
  const sys1 = createHomesteadSystem({ now: () => virtualNow });
  const player = {
    inventory: [{ itemId: 'seed_golden_wheat', qty: 1 }],
    equip: { weapon: { id: 'spire_blade' } }
  };

  sys1.plantSeed(2, 'seed_golden_wheat', player);
  sys1.waterPlot(2);
  sys1.saveLoadout('mannequin_b', player);
  sys1.restAtHearth({ hp: 10, maxHp: 100, mp: 5, maxMp: 50 });

  const state = sys1.serialize();

  const sys2 = createHomesteadSystem({ now: () => virtualNow });
  sys2.deserialize(state);

  assert.equal(sys2.getPlot(2).cropId, 'seed_golden_wheat');
  assert.equal(sys2.getPlot(2).watered, true);
  assert.equal(sys2.getMannequin('mannequin_b').loadout.weapon.id, 'spire_blade');
  assert.equal(sys2.isHearthBuffActive(), true);
});
