import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  NODE_TYPES,
  HERB_CATALOG,
  ORE_CATALOG,
  FISH_CATALOG,
  MAP_RESOURCE_NODES,
  STORM_WEATHER_IDS,
  createGatheringSystem,
} from './systems/gathering.js';

test('gathering: catalogs and node types define all required resources', () => {
  // 1. Node Types
  assert.equal(NODE_TYPES.HERB, 'herb');
  assert.equal(NODE_TYPES.ORE, 'ore');
  assert.equal(NODE_TYPES.WATER_RIPPLE, 'water_ripple');

  // 2. Herb Catalog completeness
  const expectedHerbs = [
    'silverleaf',
    'frost_lily',
    'ember_blossom',
    'sunken_kelp',
    'moonlight_lotus',
  ];
  for (const id of expectedHerbs) {
    assert.ok(HERB_CATALOG[id], `Herb ${id} exists in catalog`);
    assert.equal(HERB_CATALOG[id].id, id);
    assert.ok(HERB_CATALOG[id].name, `Herb ${id} has a name`);
    assert.ok(HERB_CATALOG[id].icon, `Herb ${id} has an icon`);
    assert.equal(HERB_CATALOG[id].type, NODE_TYPES.HERB);
  }

  // 3. Ore Catalog completeness
  const expectedOres = ['copper_ore', 'iron_vein', 'caldera_crystal'];
  for (const id of expectedOres) {
    assert.ok(ORE_CATALOG[id], `Ore ${id} exists in catalog`);
    assert.equal(ORE_CATALOG[id].id, id);
    assert.ok(ORE_CATALOG[id].name, `Ore ${id} has a name`);
    assert.ok(ORE_CATALOG[id].icon, `Ore ${id} has an icon`);
    assert.equal(ORE_CATALOG[id].type, NODE_TYPES.ORE);
  }

  // 4. Fish Catalog completeness
  const expectedFish = [
    'glowing_trout',
    'abyssal_bass',
    'glacial_salmon',
    'magma_koi',
    'stormfin',
    'golden_carp',
  ];
  for (const id of expectedFish) {
    assert.ok(FISH_CATALOG[id], `Fish ${id} exists in catalog`);
    assert.equal(FISH_CATALOG[id].id, id);
    assert.ok(FISH_CATALOG[id].name, `Fish ${id} has a name`);
    assert.ok(FISH_CATALOG[id].icon, `Fish ${id} has an icon`);
    assert.equal(FISH_CATALOG[id].type, 'fish');
  }
});

test('gathering: authored node placements exist for all four major regions', () => {
  const maps = ['whispering_woods', 'sunken_ruins', 'frostpeak_tundra', 'dragon_caldera'];
  for (const mapId of maps) {
    const nodes = MAP_RESOURCE_NODES[mapId];
    assert.ok(Array.isArray(nodes) && nodes.length > 0, `Map ${mapId} has authored resource nodes`);
    for (const node of nodes) {
      assert.ok(node.id, `Node has an id: ${JSON.stringify(node)}`);
      assert.ok(node.type, `Node has a type: ${node.id}`);
      assert.ok(node.resourceId, `Node has a resourceId: ${node.id}`);
      assert.equal(typeof node.x, 'number');
      assert.equal(typeof node.y, 'number');
    }
  }

  // Verify specific authored requirements:
  // Whispering woods: silverleaf, copper_ore, glowing_trout ripple, moonlight_lotus
  const wwResources = MAP_RESOURCE_NODES.whispering_woods.map(n => n.resourceId);
  assert.ok(wwResources.includes('silverleaf'), 'whispering_woods has silverleaf');
  assert.ok(wwResources.includes('copper_ore'), 'whispering_woods has copper_ore');
  assert.ok(wwResources.includes('glowing_trout'), 'whispering_woods has glowing_trout ripple');
  assert.ok(wwResources.includes('moonlight_lotus'), 'whispering_woods has moonlight_lotus');

  // Sunken ruins: sunken_kelp, iron_vein, abyssal_bass ripple
  const srResources = MAP_RESOURCE_NODES.sunken_ruins.map(n => n.resourceId);
  assert.ok(srResources.includes('sunken_kelp'), 'sunken_ruins has sunken_kelp');
  assert.ok(srResources.includes('iron_vein'), 'sunken_ruins has iron_vein');
  assert.ok(srResources.includes('abyssal_bass'), 'sunken_ruins has abyssal_bass ripple');

  // Frostpeak tundra: frost_lily, iron_vein, glacial_salmon ripple
  const ftResources = MAP_RESOURCE_NODES.frostpeak_tundra.map(n => n.resourceId);
  assert.ok(ftResources.includes('frost_lily'), 'frostpeak_tundra has frost_lily');
  assert.ok(ftResources.includes('iron_vein'), 'frostpeak_tundra has iron_vein');
  assert.ok(ftResources.includes('glacial_salmon'), 'frostpeak_tundra has glacial_salmon ripple');

  // Dragon caldera: ember_blossom, caldera_crystal, magma_koi ripple
  const dcResources = MAP_RESOURCE_NODES.dragon_caldera.map(n => n.resourceId);
  assert.ok(dcResources.includes('ember_blossom'), 'dragon_caldera has ember_blossom');
  assert.ok(dcResources.includes('caldera_crystal'), 'dragon_caldera has caldera_crystal');
  assert.ok(dcResources.includes('magma_koi'), 'dragon_caldera has magma_koi ripple');
});

test('gathering: getNodesForMap returns node instances with runtime state', () => {
  const sys = createGatheringSystem();
  const nodes = sys.getNodesForMap('whispering_woods', { dayPhase: 0.6 });
  assert.ok(nodes.length > 0);

  const sample = nodes[0];
  assert.ok(sample.id);
  assert.ok(sample.type);
  assert.ok(sample.resourceId);
  assert.equal(typeof sample.x, 'number');
  assert.equal(typeof sample.y, 'number');
  assert.equal(sample.harvested, false);
  assert.equal(sample.cooldownRemainingMs, 0);
});

test('gathering: moonlight_lotus hides during day and appears during night', () => {
  const sys = createGatheringSystem();

  // Day phase = 0.20 (morning): moonlight_lotus must NOT be returned
  const dayNodes = sys.getNodesForMap('whispering_woods', { dayPhase: 0.20 });
  const hasLotusAtDay = dayNodes.some(n => n.resourceId === 'moonlight_lotus');
  assert.equal(hasLotusAtDay, false, 'Moonlight Lotus must be hidden during daytime (dayPhase = 0.20)');

  // Day phase = 0.44 (just before evening cutoff): moonlight_lotus must NOT be returned
  const preEveningNodes = sys.getNodesForMap('whispering_woods', { dayPhase: 0.44 });
  assert.equal(preEveningNodes.some(n => n.resourceId === 'moonlight_lotus'), false);

  // Day phase = 0.45 (evening start): moonlight_lotus is active
  const eveningNodes = sys.getNodesForMap('whispering_woods', { dayPhase: 0.45 });
  assert.equal(eveningNodes.some(n => n.resourceId === 'moonlight_lotus'), true, 'Moonlight Lotus active at dayPhase = 0.45');

  // Day phase = 0.60 (night): moonlight_lotus is active
  const nightNodes = sys.getNodesForMap('whispering_woods', { dayPhase: 0.60 });
  assert.equal(nightNodes.some(n => n.resourceId === 'moonlight_lotus'), true, 'Moonlight Lotus active at dayPhase = 0.60');

  // Day phase = 0.90 (night end): moonlight_lotus is active
  const lateNightNodes = sys.getNodesForMap('whispering_woods', { dayPhase: 0.90 });
  assert.equal(lateNightNodes.some(n => n.resourceId === 'moonlight_lotus'), true, 'Moonlight Lotus active at dayPhase = 0.90');

  // Day phase = 0.95 (predawn): moonlight_lotus must NOT be returned
  const predawnNodes = sys.getNodesForMap('whispering_woods', { dayPhase: 0.95 });
  assert.equal(predawnNodes.some(n => n.resourceId === 'moonlight_lotus'), false, 'Moonlight Lotus hidden at dayPhase = 0.95');
});

test('gathering: harvestNode puts node on 60s cooldown and yields expected items', () => {
  const sys = createGatheringSystem();
  const nodeId = 'node_ww_silverleaf_1';

  // 1. Initial harvest succeeds
  const result = sys.harvestNode(nodeId);
  assert.ok(result, 'Harvest result is truthy');
  assert.equal(result.success, true);
  assert.deepEqual(result.items, [{ id: 'silverleaf', qty: 1 }]);

  // 2. Node is now harvested and on cooldown
  const nodes = sys.getNodesForMap('whispering_woods');
  const harvestedNode = nodes.find(n => n.id === nodeId);
  assert.ok(harvestedNode);
  assert.equal(harvestedNode.harvested, true);
  assert.equal(harvestedNode.cooldownRemainingMs, 60000);

  // 3. Immediate repeated harvest fails
  const repeatHarvest = sys.harvestNode(nodeId);
  assert.equal(repeatHarvest, null, 'Harvesting a node on cooldown returns null');
});

test('gathering: tick advances cooldown and respawns harvested node', () => {
  const sys = createGatheringSystem();
  const nodeId = 'node_ww_silverleaf_1';

  // Harvest node
  sys.harvestNode(nodeId);

  // Tick 30 seconds
  sys.tick(30);
  let node = sys.getNodesForMap('whispering_woods').find(n => n.id === nodeId);
  assert.equal(node.harvested, true);
  assert.equal(node.cooldownRemainingMs, 30000);

  // Still cannot harvest while cooling down
  assert.equal(sys.harvestNode(nodeId), null);

  // Tick remaining 30 seconds
  sys.tick(30);
  node = sys.getNodesForMap('whispering_woods').find(n => n.id === nodeId);
  assert.equal(node.harvested, false);
  assert.equal(node.cooldownRemainingMs, 0);

  // Can harvest again after respawn
  const reHarvest = sys.harvestNode(nodeId);
  assert.ok(reHarvest);
  assert.equal(reHarvest.success, true);
  assert.deepEqual(reHarvest.items, [{ id: 'silverleaf', qty: 1 }]);
});

test('gathering: startFishing initializes oscillating session with fish and sweet-spot', () => {
  // Deterministic normal fish roll (rnd = 0.5 -> base map fish)
  const sys = createGatheringSystem({ rnd: () => 0.5 });
  const session = sys.startFishing('node_ww_ripple_1', { mapId: 'whispering_woods' });

  assert.ok(session);
  assert.equal(session.active, true);
  assert.equal(session.rippleId, 'node_ww_ripple_1');
  assert.equal(session.t, 0);
  assert.equal(session.speed, 3.0);
  assert.equal(session.needle, 0.5);
  assert.equal(session.sweetMin, 0.35);
  assert.equal(session.sweetMax, 0.65);
  assert.equal(session.targetFish, 'glowing_trout');

  assert.deepEqual(sys.getActiveFishing(), session);
});

test('gathering: golden carp rolls with 10% chance and gives narrower sweet-spot', () => {
  // Deterministic roll < 0.10 gives golden_carp
  const sys = createGatheringSystem({ rnd: () => 0.05 });
  const session = sys.startFishing('node_ww_ripple_1', { mapId: 'whispering_woods' });

  assert.equal(session.targetFish, 'golden_carp');
  assert.equal(session.sweetMin, 0.45);
  assert.equal(session.sweetMax, 0.55);
});

test('gathering: resolveFishingCast succeeds inside sweet-spot and marks ripple harvested', () => {
  const sys = createGatheringSystem({ rnd: () => 0.5 });
  sys.startFishing('node_ww_ripple_1', { mapId: 'whispering_woods' });

  // At t=0, needle is 0.50, which is comfortably inside [0.35, 0.65]
  const result = sys.resolveFishingCast();
  assert.equal(result.success, true);
  assert.equal(result.fishId, 'glowing_trout');

  // Session must be closed
  assert.equal(sys.getActiveFishing(), null);

  // Ripple node must now be on cooldown
  const node = sys.getNodesForMap('whispering_woods').find(n => n.id === 'node_ww_ripple_1');
  assert.equal(node.harvested, true);
  assert.equal(node.cooldownRemainingMs, 60000);

  // Cannot fish on the same ripple while harvested
  const recast = sys.startFishing('node_ww_ripple_1', { mapId: 'whispering_woods' });
  assert.equal(recast, null);
});

test('gathering: resolveFishingCast fails outside sweet-spot without consuming ripple', () => {
  const sys = createGatheringSystem({ rnd: () => 0.5 });
  sys.startFishing('node_ww_ripple_1', { mapId: 'whispering_woods' });

  // Advance time so sin(t * 3.0) reaches 1.0 (needle = 0.5 + 0.48 = 0.98, well outside [0.35, 0.65])
  const dtToPeak = (Math.PI / 2) / 3.0;
  sys.updateFishing(dtToPeak);

  const active = sys.getActiveFishing();
  assert.ok(active.needle > 0.90, `Needle is high: ${active.needle}`);

  const result = sys.resolveFishingCast();
  assert.equal(result.success, false);
  assert.equal(result.fishId, null);

  // Session closed
  assert.equal(sys.getActiveFishing(), null);

  // Ripple remains unharvested and available for immediate retry
  const node = sys.getNodesForMap('whispering_woods').find(n => n.id === 'node_ww_ripple_1');
  assert.equal(node.harvested, false);
  assert.equal(node.cooldownRemainingMs, 0);

  const recast = sys.startFishing('node_ww_ripple_1', { mapId: 'whispering_woods' });
  assert.ok(recast, 'Can recast immediately after miss');
});

test('gathering: stormfin rolls during storm/rain weather and not during clear weather', () => {
  // rnd = 0.25 falls into the stormfin window [0.10, 0.40)
  const sysStorm = createGatheringSystem({ rnd: () => 0.25 });

  // 1. In verdant_rain weather -> rolls stormfin
  const stormSession = sysStorm.startFishing('node_ww_ripple_1', {
    mapId: 'whispering_woods',
    weatherId: 'verdant_rain',
  });
  assert.equal(stormSession.targetFish, 'stormfin');
  sysStorm.cancelFishing();

  // 2. In stellar_drift weather -> rolls stormfin
  const driftSession = sysStorm.startFishing('node_ww_ripple_1', {
    mapId: 'whispering_woods',
    weatherId: 'stellar_drift',
  });
  assert.equal(driftSession.targetFish, 'stormfin');
  sysStorm.cancelFishing();

  // 3. In clear weather with the same roll (0.25) -> rolls standard map fish (glowing_trout)
  const clearSession = sysStorm.startFishing('node_ww_ripple_1', {
    mapId: 'whispering_woods',
    weatherId: 'clear',
  });
  assert.equal(clearSession.targetFish, 'glowing_trout');
  sysStorm.cancelFishing();
});

test('gathering: cancelFishing clears session without penalty', () => {
  const sys = createGatheringSystem();
  sys.startFishing('node_ww_ripple_1', { mapId: 'whispering_woods' });
  assert.ok(sys.getActiveFishing());

  sys.cancelFishing();
  assert.equal(sys.getActiveFishing(), null);

  const node = sys.getNodesForMap('whispering_woods').find(n => n.id === 'node_ww_ripple_1');
  assert.equal(node.harvested, false);
  assert.equal(node.cooldownRemainingMs, 0);
});

test('gathering: serialization and deserialization preserves node states and active fishing', () => {
  const sys1 = createGatheringSystem({ rnd: () => 0.5 });

  // Harvest one herb
  sys1.harvestNode('node_ww_silverleaf_1');
  // Tick partial cooldown
  sys1.tick(20);

  // Start active fishing session
  sys1.startFishing('node_ww_ripple_1', { mapId: 'whispering_woods' });
  sys1.tick(0.5);

  // Serialize state
  const savedData = sys1.serialize();
  assert.ok(savedData.nodes['node_ww_silverleaf_1']);
  assert.equal(savedData.nodes['node_ww_silverleaf_1'].harvested, true);
  assert.equal(savedData.nodes['node_ww_silverleaf_1'].cooldownRemainingMs, 39500);
  assert.ok(savedData.fishing);
  assert.equal(savedData.fishing.active, true);

  // Restore into a fresh system
  const sys2 = createGatheringSystem({ rnd: () => 0.5 });
  sys2.deserialize(savedData);

  const restoredNode = sys2.getNodesForMap('whispering_woods').find(n => n.id === 'node_ww_silverleaf_1');
  assert.equal(restoredNode.harvested, true);
  assert.equal(restoredNode.cooldownRemainingMs, 39500);

  const restoredFishing = sys2.getActiveFishing();
  assert.ok(restoredFishing);
  assert.equal(restoredFishing.rippleId, 'node_ww_ripple_1');
  assert.equal(restoredFishing.targetFish, 'glowing_trout');
  assert.equal(restoredFishing.t, savedData.fishing.t);
});
