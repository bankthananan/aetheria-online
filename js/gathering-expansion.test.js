import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MAP_RESOURCE_NODES,
  ORE_CATALOG,
  HERB_CATALOG,
  FISH_CATALOG,
  createGatheringSystem
} from './systems/gathering.js';
import { CONTENT } from './content.js';

test('gathering expansion adds nodes to astral rift, homestead, and subdungeons', () => {
  // Astral Rift must have nodes
  assert.ok(MAP_RESOURCE_NODES.astral_rift && MAP_RESOURCE_NODES.astral_rift.length >= 3,
    'astral_rift must have at least 3 gathering nodes');

  // Homestead must have fishing pond & quarry
  assert.ok(MAP_RESOURCE_NODES.player_homestead && MAP_RESOURCE_NODES.player_homestead.length >= 2,
    'player_homestead must have at least 2 gathering nodes');

  // Subdungeons must have ore nodes
  assert.ok(MAP_RESOURCE_NODES.ww_goblin_cave && MAP_RESOURCE_NODES.ww_goblin_cave.length >= 1,
    'ww_goblin_cave must have mineral vein');
  assert.ok(MAP_RESOURCE_NODES.sr_drowned_catacombs && MAP_RESOURCE_NODES.sr_drowned_catacombs.length >= 1,
    'sr_drowned_catacombs must have mineral vein');
  assert.ok(MAP_RESOURCE_NODES.ft_glacial_chasm && MAP_RESOURCE_NODES.ft_glacial_chasm.length >= 1,
    'ft_glacial_chasm must have mineral vein');
  assert.ok(MAP_RESOURCE_NODES.dc_obsidian_foundry && MAP_RESOURCE_NODES.dc_obsidian_foundry.length >= 1,
    'dc_obsidian_foundry must have mineral vein');
  assert.ok(MAP_RESOURCE_NODES.as_sandstone_necropolis && MAP_RESOURCE_NODES.as_sandstone_necropolis.length >= 1,
    'as_sandstone_necropolis must have mineral vein');
  assert.ok(MAP_RESOURCE_NODES.tm_sporeheart_hollow && MAP_RESOURCE_NODES.tm_sporeheart_hollow.length >= 1,
    'tm_sporeheart_hollow must have mineral vein');
  assert.ok(MAP_RESOURCE_NODES.ts_thunderforge_peak && MAP_RESOURCE_NODES.ts_thunderforge_peak.length >= 1,
    'ts_thunderforge_peak must have mineral vein');
  assert.ok(MAP_RESOURCE_NODES.sc_abyssal_crypts && MAP_RESOURCE_NODES.sc_abyssal_crypts.length >= 1,
    'sc_abyssal_crypts must have mineral vein');
  assert.ok(MAP_RESOURCE_NODES.source_core_subdungeon && MAP_RESOURCE_NODES.source_core_subdungeon.length >= 1,
    'source_core_subdungeon must have mineral vein');

  // Check new ores, herbs, and fish exist in catalog and items
  const newOres = ['voidstone_ore', 'pyrite_ore', 'silicon_crystal', 'muck_iron', 'cobalt_ore', 'darksteel_ore', 'matrix_ore'];
  for (const oreId of newOres) {
    assert.ok(ORE_CATALOG[oreId], `ORE_CATALOG must include ${oreId}`);
    assert.ok(CONTENT.items.some(i => i.id === oreId), `CONTENT.items must include ${oreId}`);
  }

  const newHerbs = [
    'sunroot_thistle', 'dune_blossom', 'ghost_spore_shroom', 'glowshroom_bloom',
    'storm_petal', 'charged_iris', 'shadow_orchid', 'void_polyp',
    'nebula_bloom', 'binary_fungus', 'source_anomaly'
  ];
  for (const herbId of newHerbs) {
    assert.ok(HERB_CATALOG[herbId], `HERB_CATALOG must include ${herbId}`);
    assert.ok(CONTENT.items.some(i => i.id === herbId), `CONTENT.items must include ${herbId}`);
  }

  const newFish = [
    'cosmic_jellyfish', 'void_ray', 'spring_bass',
    'mirage_pike', 'bog_gar', 'thunder_eel', 'blind_cavefish', 'quantum_glitchfish'
  ];
  for (const fishId of newFish) {
    assert.ok(FISH_CATALOG[fishId], `FISH_CATALOG must include ${fishId}`);
    assert.ok(CONTENT.items.some(i => i.id === fishId), `CONTENT.items must include ${fishId}`);
  }

  // Precision strike test
  const sys = createGatheringSystem({ rnd: () => 0.1 }); // triggers precision (< 0.25)
  const oreNode = MAP_RESOURCE_NODES.astral_rift.find(n => n.type === 'ore');
  assert.ok(oreNode, 'astral_rift must have an ore node');
  const res = sys.harvestNode(oreNode.id, { precisionStrike: true });
  assert.ok(res && res.success, 'harvestNode must succeed');
  assert.equal(res.precision, true, 'harvestNode must report precision: true');
  assert.ok(res.items.some(it => it.id === oreNode.resourceId && it.qty >= 2), 'precision strike yields bonus ore qty');
  assert.ok(res.items.some(it => it.id === 'blessed_ore'), 'precision strike yields bonus blessed_ore');
});

test('gathering expansion: non-precision mining and palettes/icons verification', async () => {
  const { ITEM_ICON } = await import('./pixelart.js');
  // Regular harvest test (rnd = 0.5 >= 0.25, precisionStrike = false)
  const sys = createGatheringSystem({ rnd: () => 0.5 });
  const oreNode = MAP_RESOURCE_NODES.player_homestead.find(n => n.type === 'ore');
  assert.ok(oreNode, 'player_homestead must have an ore node');
  const regularRes = sys.harvestNode(oreNode.id, { precisionStrike: false });
  assert.ok(regularRes && regularRes.success);
  assert.equal(regularRes.precision, false);
  assert.deepEqual(regularRes.items, [{ id: oreNode.resourceId, qty: 1 }]);

  // Check ITEM_ICON mappings
  assert.equal(ITEM_ICON.voidstone_ore, 'ore');
  assert.equal(ITEM_ICON.pyrite_ore, 'ore');
  assert.equal(ITEM_ICON.silicon_crystal, 'gem');
  assert.equal(ITEM_ICON.muck_iron, 'ore');
  assert.equal(ITEM_ICON.cobalt_ore, 'ore');
  assert.equal(ITEM_ICON.darksteel_ore, 'ore');
  assert.equal(ITEM_ICON.matrix_ore, 'gem');
  assert.equal(ITEM_ICON.sunroot_thistle, 'gem_green');
  assert.equal(ITEM_ICON.dune_blossom, 'gem_red');
  assert.equal(ITEM_ICON.ghost_spore_shroom, 'gem');
  assert.equal(ITEM_ICON.glowshroom_bloom, 'gem_blue');
  assert.equal(ITEM_ICON.storm_petal, 'gem_blue');
  assert.equal(ITEM_ICON.charged_iris, 'gem_blue');
  assert.equal(ITEM_ICON.shadow_orchid, 'gem_blue');
  assert.equal(ITEM_ICON.void_polyp, 'crawler_shell');
  assert.equal(ITEM_ICON.nebula_bloom, 'gem_blue');
  assert.equal(ITEM_ICON.binary_fungus, 'gem_green');
  assert.equal(ITEM_ICON.source_anomaly, 'core');
  assert.equal(ITEM_ICON.cosmic_jellyfish, 'crawler_shell');
  assert.equal(ITEM_ICON.void_ray, 'crawler_shell');
  assert.equal(ITEM_ICON.spring_bass, 'crawler_shell');
  assert.equal(ITEM_ICON.mirage_pike, 'crawler_shell');
  assert.equal(ITEM_ICON.bog_gar, 'crawler_shell');
  assert.equal(ITEM_ICON.thunder_eel, 'storm_core');
  assert.equal(ITEM_ICON.blind_cavefish, 'crawler_shell');
  assert.equal(ITEM_ICON.quantum_glitchfish, 'core');

  // Check homestead fishing ripple
  const fishSession = sys.startFishing('node_hs_pond_1', { mapId: 'player_homestead' });
  assert.ok(fishSession, 'homestead fishing ripple should start session');
  assert.equal(fishSession.targetFish, 'spring_bass');
});

test('all gathering node IDs across MAP_RESOURCE_NODES are unique', () => {
  const seenIds = new Set();
  const duplicateIds = [];

  for (const [mapId, nodes] of Object.entries(MAP_RESOURCE_NODES)) {
    for (const node of nodes) {
      if (seenIds.has(node.id)) {
        duplicateIds.push({ id: node.id, mapId });
      }
      seenIds.add(node.id);
    }
  }

  assert.deepEqual(duplicateIds, [], `Found duplicate gathering node IDs: ${JSON.stringify(duplicateIds)}`);
  assert.equal(seenIds.has('node_dc_foundry_crystal_1'), true, 'node_dc_foundry_crystal_1 must exist');
});


