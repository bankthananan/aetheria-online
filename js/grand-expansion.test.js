import assert from 'node:assert/strict';
import test from 'node:test';
import { createRuntime } from './test-support/runtime.js';
import { isZoneUnlocked, canFastTravel, executeFastTravel, toggleMinimapRadar } from './render/world-atlas.js';
import { getActiveSetBonuses } from './systems/equipment-sets.js';

test('Grand Expansion End-to-End Holistic Acceptance Test', async () => {
  const { A } = await createRuntime();
  const G = A.G;
  const p = G.player;
  p.zeny = 100000;

  // =========================================================================
  // PILLAR 1: Graphical 10-Zone World Atlas & Minimap Radar 2.0
  // =========================================================================
  // Unlocks & Fast Travel
  assert.equal(isZoneUnlocked('whispering_woods', new Set()), true, 'Starting zone unlocked');
  assert.equal(isZoneUnlocked('dragon_caldera', new Set()), false, 'Deep zone locked initially');
  assert.equal(isZoneUnlocked('dragon_caldera', new Set(['glacier_titan'])), true, 'Unlocked with guardian defeated');

  const ftCheck = canFastTravel('whispering_woods', p, new Set(), 'town_awakening');
  assert.equal(ftCheck.ok, true, 'Can fast travel to unlocked node');

  const zenyBefore = p.zeny;
  G.loadMap = (mapId) => A.loadMap(mapId);
  const ftSuccess = executeFastTravel('whispering_woods', G);
  assert.equal(ftSuccess.success, true, 'Fast travel execution succeeded');
  assert.ok(p.zeny < zenyBefore, 'Fast travel fee deducted');
  assert.equal(G.mapId, 'whispering_woods', 'Loaded destination zone');

  // Radar Mode Toggle
  const r1 = toggleMinimapRadar();
  assert.equal(r1.expanded, true, 'Radar mode expanded on toggle');
  const r2 = toggleMinimapRadar();
  assert.equal(r2.expanded, false, 'Radar mode toggles back to normal');

  // =========================================================================
  // PILLAR 2: Multi-Window Modernization & Direct Item Interaction
  // =========================================================================
  assert.equal(typeof A.canSocketIntoSlot, 'function', 'canSocketIntoSlot exposed on surface');
  const weaponCard = { id: 'card_goblin', type: 'card', targetSlot: 'weapon' };
  assert.equal(A.canSocketIntoSlot(weaponCard, 'weapon'), true, 'Weapon card can socket into weapon');
  assert.equal(A.canSocketIntoSlot(weaponCard, 'head'), false, 'Weapon card rejects incompatible head slot');
  const gem = { id: 'ruby_chip', gem: true };
  assert.equal(A.canSocketIntoSlot(gem, 'weapon'), true, 'Gem can socket into weapon');
  assert.equal(A.canSocketIntoSlot(gem, 'head'), true, 'Gem can socket into head (universal)');

  // =========================================================================
  // PILLAR 3: Regional Equipment Set Bonuses & Mythic Enchanting Altar
  // =========================================================================
  // Set bonus activation
  const duneslayerVest = A.rollItem('duneslayer_vest', 0, 'rare');
  const shadowLeathers = A.rollItem('shadow_leathers', 0, 'rare');
  p.equip.body = duneslayerVest;
  p.equip.feet = shadowLeathers;
  A.recompute(p);

  const activeSets = getActiveSetBonuses(p.equip);
  assert.ok(activeSets.activeSets.some(s => s.id === 'set_duneslayer'), 'Duneslayer set active');
  assert.equal(activeSets.statMods.flee, 15, 'Set grants +15 flee');
  assert.equal(activeSets.statMods.critChance, 4, 'Set grants +4% crit');

  // Mythic Infusion Altar
  A.addItem('kernel_core', 1);
  const ironSword = A.rollItem('iron_sword', 0, 'epic');
  p.equip.weapon = ironSword;
  A.recompute(p);
  const preMythicAtk = p.physAtk;

  const infuseOk = A.infuseMythicItem('weapon', 'kernel_core');
  assert.equal(infuseOk, true, 'Mythic infusion succeeded');
  assert.equal(ironSword.mythicEnchant?.catalystId, 'kernel_core');
  assert.ok(p.physAtk > preMythicAtk, 'STR from allStats increases ATK');

  // =========================================================================
  // PILLAR 4: Mounts & Familiar Combat Evolution (Pets 2.0)
  // =========================================================================
  // Companions and Evolution
  G.pets.owned.pet_wolf = { id: 'pet_wolf', name: 'Fang', bondLevel: 5, loyalty: 90, exp: 1200 };
  G.pets.activePetId = 'pet_wolf';
  A.recompute(p);

  // Mount toggle
  const speedBeforeMount = p.moveMult;
  const mountOk = A.toggleMount();
  assert.equal(mountOk, true, 'Mounting wolf succeeded');
  assert.equal(G.mounted, true, 'Player is mounted');
  assert.ok(p.moveMult > speedBeforeMount * 1.35, 'Move speed boosted by +40%');

  // Evolve companion
  const evoOk = A.evolveActivePet('pet_wolf');
  assert.equal(evoOk, true, 'Evolving wolf succeeded');
  assert.equal(G.pets.activePetId, 'pet_alpha_direwolf', 'Evolved into Alpha Direwolf');
  assert.equal(G.pets.owned.pet_alpha_direwolf.evolved, true);

  // Familiar combat skill in battle
  const targetMob = { x: p.x + 10, y: p.y, hp: 500, maxHp: 500, alive: true, size: 24, def: { id: 'wild_boar' } };
  G.target = targetMob;

  const preCombatAtk = p.physAtk;
  A.step(16);
  assert.ok(p.petAtkBuffUntil > 0, 'Howl of Fury buff applied');
  assert.ok(p.physAtk > preCombatAtk, 'Player ATK increased by pet buff');

  // Attacking dismounts player
  A.playerBasicAttack();
  assert.equal(G.mounted, false, 'Dismounted upon combat attack');

  console.log('Grand Expansion E2E acceptance test completed successfully!');
});
