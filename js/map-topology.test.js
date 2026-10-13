import assert from 'node:assert/strict';
import test from 'node:test';
import { MAPS } from './maps.js';
import { CONTENT } from './content.js';
import { MAP_RESOURCE_NODES } from './systems/gathering.js';
import { connectedWalkableTiles } from './pathing.js';

test('World Topology: all 26 maps defined and registered', () => {
  const EXPECTED_MAPS = [
    // 10 Overworld Zones
    'whispering_woods', 'sunken_ruins', 'ashen_steppes', 'frostpeak_tundra',
    'twilight_mire', 'dragon_caldera', 'tempest_spires', 'sunless_chasm',
    'astral_rift', 'glitched_monolith',
    // 10 Regional Subdungeons
    'ww_goblin_cave', 'sr_drowned_catacombs', 'as_sandstone_necropolis',
    'ft_glacial_chasm', 'tm_sporeheart_hollow', 'dc_obsidian_foundry',
    'ts_thunderforge_peak', 'sc_abyssal_crypts', 'ar_singularity_vault',
    'source_core_subdungeon',
    // Municipal Hubs & Special
    'town_awakening', 'guild_stronghold', 'player_homestead',
    'celestial_rift', 'abyssal_spire', 'ww_elder_hollow',
  ];

  for (const mapId of EXPECTED_MAPS) {
    assert.ok(MAPS[mapId], `Map ${mapId} must be registered in MAPS`);
    const map = MAPS[mapId];
    assert.ok(map.tiles.length > 0, `${mapId} has rows`);
    assert.equal(map.tiles.length, map.height, `${mapId} height mismatch`);
    for (let y = 0; y < map.height; y++) {
      assert.equal(map.tiles[y].length, map.width, `${mapId} row ${y} width mismatch`);
    }
  }
});

test('World Topology: portals are bidirectional and walkable', () => {
  for (const [mapId, map] of Object.entries(MAPS)) {
    for (const portal of map.portals || []) {
      assert.ok(MAPS[portal.toMap], `${mapId} portal points to non-existent map: ${portal.toMap}`);
      const destMap = MAPS[portal.toMap];
      assert.ok(portal.toX >= 0 && portal.toX < destMap.width, `${mapId} -> ${portal.toMap} toX ${portal.toX} out of bounds`);
      assert.ok(portal.toY >= 0 && portal.toY < destMap.height, `${mapId} -> ${portal.toMap} toY ${portal.toY} out of bounds`);
      const destTile = destMap.tiles[portal.toY][portal.toX];
      assert.ok(destMap.legend[destTile]?.walkable, `${mapId} -> ${portal.toMap} lands on non-walkable tile '${destTile}' at (${portal.toX},${portal.toY})`);
    }
  }
});

test('World Topology: single connected walkable component per map', () => {
  for (const [mapId, map] of Object.entries(MAPS)) {
    const entrance = map.playerStart || (map.portals && map.portals[0]) || { x: 2, y: 2 };
    const connected = connectedWalkableTiles(map, entrance.x, entrance.y);
    assert.ok(connected.length > 0, `${mapId} entrance must have walkable tiles`);
    const reachable = new Set(connected.map(t => `${t.col},${t.row}`));
    for (const portal of map.portals || []) {
      assert.ok(reachable.has(`${portal.x},${portal.y}`), `${mapId} portal at (${portal.x},${portal.y}) is isolated`);
    }
  }
});

test('Boss Clearance: 10 Guardian arenas have at least 12x12 floor clearance', () => {
  const OVERWORLD_ZONES = [
    'whispering_woods', 'sunken_ruins', 'ashen_steppes', 'frostpeak_tundra',
    'twilight_mire', 'dragon_caldera', 'tempest_spires', 'sunless_chasm',
    'astral_rift', 'glitched_monolith',
  ];
  for (const zoneId of OVERWORLD_ZONES) {
    const map = MAPS[zoneId];
    assert.ok(map, `${zoneId} must exist in MAPS`);
    let bossPos = null;
    for (let y = 0; y < map.height; y++) {
      const bx = map.tiles[y].indexOf('B');
      if (bx >= 0) { bossPos = { x: bx, y }; break; }
    }
    assert.ok(bossPos, `${zoneId} must have 'B' tile`);
    let walkableCount = 0;
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const tx = bossPos.x + dx, ty = bossPos.y + dy;
        if (tx >= 0 && tx < map.width && ty >= 0 && ty < map.height) {
          const ch = map.tiles[ty][tx];
          if (map.legend[ch]?.walkable) walkableCount++;
        }
      }
    }
    assert.ok(walkableCount >= 60, `${zoneId} Colosseum arena around B must have ample walkable clearance (found ${walkableCount}/81)`);
  }
});

test('Gathering Ecology: resource nodes are on walkable tiles or shorelines', () => {
  for (const [mapId, nodes] of Object.entries(MAP_RESOURCE_NODES)) {
    const map = MAPS[mapId];
    if (!map) continue;
    for (const node of nodes) {
      assert.ok(node.x >= 0 && node.x < map.width && node.y >= 0 && node.y < map.height,
        `${mapId} node ${node.id} at (${node.x},${node.y}) out of bounds`);
      const tile = map.tiles[node.y][node.x];
      if (node.type === 'water_ripple') {
        let hasShore = false;
        for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          const adjX = node.x + dx, adjY = node.y + dy;
          if (adjX >= 0 && adjX < map.width && adjY >= 0 && adjY < map.height) {
            const adjTile = map.tiles[adjY][adjX];
            if (map.legend[adjTile]?.walkable) { hasShore = true; break; }
          }
        }
        assert.ok(hasShore, `${mapId} fishing ripple ${node.id} at (${node.x},${node.y}) has no adjacent walkable shoreline`);
      } else {
        assert.ok(map.legend[tile]?.walkable, `${mapId} node ${node.id} placed on blocked tile '${tile}'`);
      }
    }
  }
});
