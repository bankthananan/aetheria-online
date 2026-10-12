import assert from 'node:assert/strict';
import test from 'node:test';
import { DESIGN } from './design.js';
import { MAPS } from './maps.js';
import { CONTENT } from './content.js';

test('glitched monolith endgame cap, maps, and monsters', () => {
  // Check level caps
  assert.equal(DESIGN.tuning.maxLevel, 100, 'Max Base Level must be 100');
  const xpForNext = typeof DESIGN.xpCurve === 'function' ? DESIGN.xpCurve : new Function('level', 'return (' + DESIGN.xpCurve + ');');
  assert.ok(xpForNext(100) > xpForNext(80), 'XP curve must calculate up to Lv 100');

  // Check maps
  assert.ok(MAPS.glitched_monolith, 'MAPS must include glitched_monolith');
  assert.ok(MAPS.source_core_subdungeon, 'MAPS must include source_core_subdungeon');
  assert.ok(MAPS.glitched_monolith.band && MAPS.glitched_monolith.band[0] >= 81, 'glitched_monolith band floor >= 81');

  // Check monsters
  const expectedMonsters = [
    'memory_phantom',
    'overtime_wraith',
    'compiler_golem',
    'debug_drone',
    'system_architect'
  ];
  for (const mId of expectedMonsters) {
    const def = CONTENT.monsters.find(m => m.id === mId);
    assert.ok(def, `Monster ${mId} must exist in CONTENT.monsters`);
    assert.ok(def.level >= 80, `Monster ${mId} level must be >= 80`);
  }

  // Check Transcendent Source gear set
  const setGear = ['architect_blade', 'firewall_hauberk', 'terminal_visor', 'overclock_ring', 'subroutine_boots'];
  for (const gId of setGear) {
    assert.ok(CONTENT.items.some(i => i.id === gId), `Item ${gId} must exist in CONTENT.items`);
  }
});
