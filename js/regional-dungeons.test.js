import assert from 'node:assert/strict';
import test from 'node:test';
import { REGIONAL_DUNGEONS } from './zones/regional-dungeons.js';
import { MAPS } from './maps.js';
import { CONTENT } from './content.js';

test('regional dungeons definition and map wiring', () => {
  const expectedDungeonIds = [
    'sr_drowned_catacombs',
    'ft_glacial_chasm',
    'dc_obsidian_foundry',
    'ar_singularity_vault'
  ];

  for (const id of expectedDungeonIds) {
    assert.ok(REGIONAL_DUNGEONS[id], `Missing definition for dungeon ${id}`);
    assert.ok(MAPS[id], `Dungeon ${id} must be registered in MAPS`);
    assert.ok(MAPS[id].tiles.length > 0, `Dungeon ${id} must have tiles`);
    assert.ok(MAPS[id].playerStart, `Dungeon ${id} must define playerStart`);
    assert.ok(MAPS[id].portals.length > 0, `Dungeon ${id} must have return portal`);

    const bossId = REGIONAL_DUNGEONS[id].boss?.monsterId;
    assert.ok(bossId, `Dungeon ${id} must define a boss monsterId`);
    const bossDef = CONTENT.monsters.find(m => m.id === bossId);
    assert.ok(bossDef, `Boss ${bossId} must exist in CONTENT.monsters`);
  }
});
