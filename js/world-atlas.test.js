import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ZONE_ATLAS_NODES,
  ATLAS_HIGHWAYS,
  isZoneUnlocked,
  canFastTravel,
  executeFastTravel,
  toggleMinimapRadar,
  getMinimapRadarState,
  getRadarBlips,
} from './render/world-atlas.js';

test('ZONE_ATLAS_NODES covers all 10 zones and town hub with valid bounds', () => {
  const expectedZones = [
    'town_awakening',
    'whispering_woods',
    'sunken_ruins',
    'ashen_steppes',
    'frostpeak_tundra',
    'twilight_mire',
    'dragon_caldera',
    'tempest_spires',
    'sunless_chasm',
    'astral_rift',
    'glitched_monolith'
  ];

  for (const zoneId of expectedZones) {
    const node = ZONE_ATLAS_NODES[zoneId];
    assert.ok(node, `Missing atlas node for zone ${zoneId}`);
    assert.equal(typeof node.name, 'string');
    assert.ok(node.x >= 0 && node.x <= 800, `Node ${zoneId} x (${node.x}) out of bounds`);
    assert.ok(node.y >= 0 && node.y <= 600, `Node ${zoneId} y (${node.y}) out of bounds`);
    assert.ok(Array.isArray(node.levelRange) && node.levelRange.length === 2, `Node ${zoneId} needs [min, max] level range`);
    assert.ok(typeof node.sigil === 'string', `Node ${zoneId} missing sigil`);
    assert.ok(typeof node.color === 'string', `Node ${zoneId} missing color`);
  }
});

test('ATLAS_HIGHWAYS defines directional and bidirectional road connections', () => {
  assert.ok(Array.isArray(ATLAS_HIGHWAYS), 'ATLAS_HIGHWAYS must be an array');
  assert.ok(ATLAS_HIGHWAYS.length >= 10, 'Must have at least 10 highway connections');

  for (const hw of ATLAS_HIGHWAYS) {
    assert.ok(ZONE_ATLAS_NODES[hw.from], `Highway from unknown node: ${hw.from}`);
    assert.ok(ZONE_ATLAS_NODES[hw.to], `Highway to unknown node: ${hw.to}`);
  }
});

test('isZoneUnlocked correctly evaluates prerequisites and guardian kills', () => {
  const emptySlain = new Set();
  assert.equal(isZoneUnlocked('town_awakening', emptySlain), true, 'Town always unlocked');
  assert.equal(isZoneUnlocked('whispering_woods', emptySlain), true, 'Whispering Woods always unlocked');
  assert.equal(isZoneUnlocked('sunken_ruins', emptySlain), false, 'Sunken ruins locked without Woods guardian');

  const woodsSlain = new Set(['ancient_treant']);
  assert.equal(isZoneUnlocked('sunken_ruins', woodsSlain), true, 'Sunken ruins unlocked with Treant slain');
  assert.equal(isZoneUnlocked('ashen_steppes', woodsSlain), true, 'Ashen steppes unlocked with Treant slain');
  assert.equal(isZoneUnlocked('astral_rift', woodsSlain), false, 'Astral rift locked without late guardians');
});

test('canFastTravel validates unlocked status, combat state, and zeny cost', () => {
  const p = {
    level: 50,
    zeny: 500,
    inCombat: false,
  };
  const slain = new Set(['ancient_treant']);

  const canTravelTown = canFastTravel('town_awakening', p, slain, 'whispering_woods');
  assert.equal(canTravelTown.ok, true, 'Can fast travel to town');
  assert.equal(canTravelTown.cost, 0, 'Fast travel to town is free');

  const canTravelSteppes = canFastTravel('ashen_steppes', p, slain, 'whispering_woods');
  assert.equal(canTravelSteppes.ok, true, 'Can fast travel to unlocked steppes');
  assert.ok(canTravelSteppes.cost > 0, 'Regional travel has zeny cost');

  const inCombatPlayer = { ...p, inCombat: true };
  const combatCheck = canFastTravel('town_awakening', inCombatPlayer, slain, 'whispering_woods');
  assert.equal(combatCheck.ok, false, 'Cannot fast travel while in combat');
  assert.ok(combatCheck.reason.includes('combat'), 'Reason mentions combat');

  const brokePlayer = { ...p, zeny: 5 };
  const brokeCheck = canFastTravel('ashen_steppes', brokePlayer, slain, 'whispering_woods');
  assert.equal(brokeCheck.ok, false, 'Cannot fast travel without enough zeny');

  const lockedCheck = canFastTravel('glitched_monolith', p, slain, 'whispering_woods');
  assert.equal(lockedCheck.ok, false, 'Cannot fast travel to locked zone');
});

test('executeFastTravel deducts zeny and prepares map warp', () => {
  let loadedMap = null;
  const mockG = {
    player: { zeny: 1000 },
    loadMap: (id, x, y) => { loadedMap = { id, x, y }; },
    guardiansSlain: new Set(['ancient_treant']),
    mapId: 'whispering_woods',
  };

  const res = executeFastTravel('ashen_steppes', mockG);
  assert.equal(res.success, true, 'Fast travel executed successfully');
  assert.ok(mockG.player.zeny < 1000, 'Zeny was deducted');
  assert.equal(loadedMap?.id, 'ashen_steppes', 'Loaded target zone map');
});

test('toggleMinimapRadar switches radar mode and dimensions', () => {
  const radarState = getMinimapRadarState();
  assert.equal(radarState.expanded, false, 'Starts unexpanded');
  assert.equal(radarState.width, 136, 'Compact width 136');

  const toggled = toggleMinimapRadar();
  assert.equal(toggled.expanded, true, 'Toggled to expanded');
  assert.equal(toggled.width, 240, 'Expanded width 240');
  assert.equal(toggled.height, 240, 'Expanded height 240');

  const toggledBack = toggleMinimapRadar();
  assert.equal(toggledBack.expanded, false, 'Toggled back to compact');
  assert.equal(toggledBack.width, 136);
});

test('getRadarBlips gathers entities with threat categories and normalized coords', () => {
  const mockG = {
    map: { width: 40, height: 30 },
    player: { x: 10, y: 15, facing: 'down' },
    monsters: [
      { id: 'slime_1', x: 12, y: 15, name: 'Green Slime', aggro: false },
      { id: 'elite_1', x: 14, y: 16, name: 'Champion Orc', aggro: true, isElite: true },
      { id: 'boss_1', x: 20, y: 20, name: 'Ancient Treant', isBoss: true }
    ],
    npcs: [
      { id: 'npc_eloween', x: 8, y: 10, name: 'Elder Elowen' }
    ],
    portals: [
      { to: 'sunken_ruins', x: 38, y: 15, label: 'Sunken Ruins Entrance' }
    ]
  };

  const blips = getRadarBlips(mockG);
  assert.ok(blips.player, 'Must return player blip with facing direction');
  assert.equal(blips.player.facing, 'down');
  assert.equal(blips.monsters.length, 3, 'Must return 3 monster blips');

  const bossBlip = blips.monsters.find(m => m.type === 'boss');
  assert.ok(bossBlip, 'Boss blip marked as boss type');

  const eliteBlip = blips.monsters.find(m => m.type === 'elite');
  assert.ok(eliteBlip, 'Elite blip marked as elite type');

  assert.equal(blips.npcs.length, 1, 'Must return 1 NPC blip');
  assert.equal(blips.portals.length, 1, 'Must return 1 portal blip');
});

test('world chronicle renders world atlas tab and canvas in runtime', async () => {
  const { createRuntime } = await import('./test-support/runtime.js');
  const { A } = await createRuntime();
  A.togglePanel('world');
  const panel = document.querySelector('.panel[data-kind="world"]');
  assert.ok(panel, 'World panel opened');
  const atlasCanvas = panel.querySelector('#world-atlas-canvas');
  assert.ok(atlasCanvas, 'World atlas canvas rendered');
  const travelBar = panel.querySelector('#atlas-travel-bar');
  assert.ok(travelBar, 'Atlas travel bar rendered');
  A.togglePanel('world');
});
