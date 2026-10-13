import assert from 'node:assert/strict';
import test from 'node:test';
import { REGIONAL_DUNGEONS } from './zones/regional-dungeons.js';
import { MAPS } from './maps.js';
import { CONTENT } from './content.js';

test('regional dungeons definition and map wiring', () => {
  const expectedDungeons = [
    { id: 'ww_goblin_cave', parentId: 'whispering_woods', entranceX: 38, entranceY: 29 },
    { id: 'sr_drowned_catacombs', parentId: 'sunken_ruins', entranceX: 26, entranceY: 3 },
    { id: 'as_sandstone_necropolis', parentId: 'ashen_steppes', entranceX: 38, entranceY: 28 },
    { id: 'ft_glacial_chasm', parentId: 'frostpeak_tundra', entranceX: 38, entranceY: 26 },
    { id: 'tm_sporeheart_hollow', parentId: 'twilight_mire', entranceX: 38, entranceY: 28 },
    { id: 'dc_obsidian_foundry', parentId: 'dragon_caldera', entranceX: 38, entranceY: 30 },
    { id: 'ts_thunderforge_peak', parentId: 'tempest_spires', entranceX: 38, entranceY: 28 },
    { id: 'sc_abyssal_crypts', parentId: 'sunless_chasm', entranceX: 38, entranceY: 28 },
    { id: 'ar_singularity_vault', parentId: 'astral_rift', entranceX: 5, entranceY: 1 },
    { id: 'source_core_subdungeon', parentId: 'glitched_monolith', entranceX: 40, entranceY: 30 },
  ];

  const monsterById = Object.fromEntries(CONTENT.monsters.map(m => [m.id, m]));

  for (const { id, parentId, entranceX, entranceY } of expectedDungeons) {
    assert.ok(REGIONAL_DUNGEONS[id], `Missing definition for dungeon ${id}`);
    assert.ok(MAPS[id], `Dungeon ${id} must be registered in MAPS`);
    assert.ok(MAPS[id].tiles.length > 0, `Dungeon ${id} must have tiles`);
    assert.ok(MAPS[id].playerStart, `Dungeon ${id} must define playerStart`);
    assert.ok(MAPS[id].portals.length > 0, `Dungeon ${id} must have return portal`);

    const bossId = REGIONAL_DUNGEONS[id].boss?.monsterId;
    assert.ok(bossId, `Dungeon ${id} must define a boss monsterId`);
    const bossDef = monsterById[bossId];
    if (bossDef) {
      assert.ok(bossDef.sizeTiles >= 2, `Boss ${bossId} must have sizeTiles >= 2`);
      // Level band
      assert.ok(Array.isArray(MAPS[id].band) && MAPS[id].band[0] < MAPS[id].band[1], `${id} must define valid band`);
      assert.ok(bossDef.level <= MAPS[id].band[1], `${id} boss level ${bossDef.level} must be <= band ceiling`);
    } else {
      assert.ok(Array.isArray(MAPS[id].band) && MAPS[id].band[0] < MAPS[id].band[1], `${id} must define valid band`);
    }

    // Spawns
    if (MAPS[id].spawns && MAPS[id].spawns.length > 0) {
      const normalSpawns = MAPS[id].spawns.filter(sp => monsterById[sp.monsterId]?.sizeTiles < 2);
      if (normalSpawns.length >= 3) {
        const bossSpawns = MAPS[id].spawns.filter(sp => sp.monsterId === bossId);
        assert.equal(bossSpawns.length, 1, `${id} must spawn its boss`);

        for (const sp of normalSpawns) {
          assert.ok(Array.isArray(sp.depth) && sp.depth[0] < sp.depth[1], `${id}/${sp.monsterId} depth habitat invalid`);
          assert.ok(Array.isArray(sp.levelRange) && sp.levelRange[0] <= sp.levelRange[1], `${id}/${sp.monsterId} levelRange invalid`);
          assert.ok(sp.levelRange[0] >= MAPS[id].band[0] && sp.levelRange[1] <= MAPS[id].band[1], `${id}/${sp.monsterId} levelRange outside band`);
        }
      }
    }

    // Portal coordinates & no bounce-back loops
    const parentMap = MAPS[parentId];
    assert.ok(parentMap, `Parent map ${parentId} must exist`);
    const overworldPortal = parentMap.portals.find(p => p.toMap === id);
    assert.ok(overworldPortal, `Parent map ${parentId} must have portal to ${id}`);
    assert.equal(overworldPortal.toX, 2, `Overworld portal to ${id} must arrive at toX: 2`);
    assert.equal(overworldPortal.toY, 2, `Overworld portal to ${id} must arrive at toY: 2`);

    const dungeonReturnPortal = MAPS[id].portals.find(p => p.toMap === parentId);
    assert.ok(dungeonReturnPortal, `${id} must have portal returning to ${parentId}`);
    assert.ok(
      dungeonReturnPortal.toX !== entranceX || dungeonReturnPortal.toY !== entranceY,
      `${id} return portal must not spawn player on top of entrance portal pad (avoid bounce-back)`
    );
  }
});
