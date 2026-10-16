import assert from 'node:assert/strict';
import test from 'node:test';
import { canEvolvePet, evolvePet, PET_EVOLUTIONS, PET_CATALOG, getPetDef } from './systems/pets.js';
import { createRuntime } from './test-support/runtime.js';

test('canEvolvePet validates bond, loyalty, and zeny requirements', () => {
  const lowBondWolf = { id: 'pet_wolf', bondLevel: 3, loyalty: 100 };
  const lowLoyaltyWolf = { id: 'pet_wolf', bondLevel: 5, loyalty: 60 };
  const readyWolf = { id: 'pet_wolf', bondLevel: 5, loyalty: 85 };

  assert.equal(canEvolvePet(lowBondWolf, 10000).ok, false, 'Requires Bond Level 5');
  assert.equal(canEvolvePet(lowLoyaltyWolf, 10000).ok, false, 'Requires 80% Loyalty');
  assert.equal(canEvolvePet(readyWolf, 1000).ok, false, 'Requires 5000 Zeny');
  assert.equal(canEvolvePet(readyWolf, 5000).ok, true, 'Ready wolf can evolve');
});

test('evolvePet mutates pet into evolved archetype with skill and deducted cost', () => {
  const wolf = { id: 'pet_wolf', bondLevel: 5, loyalty: 90, name: 'Fang' };
  let deducted = 0;
  const res = evolvePet(wolf, 5000, (amt) => { deducted = amt; });

  assert.equal(res.success, true);
  assert.equal(deducted, 5000);
  assert.equal(wolf.id, 'pet_alpha_direwolf');
  assert.equal(wolf.evolved, true);
  assert.ok(wolf.skill, 'Should attach combat skill');
  assert.equal(wolf.skill.id, 'howl_of_fury');
  assert.equal(getPetDef(wolf.id).canMount, true);
});

test('evolveActivePet runtime integration and combat skill execution', async () => {
  const { A } = await createRuntime();
  const p = A.G.player;
  p.zeny = 10000;

  // Setup ready wolf in player's companions
  A.G.pets.owned.pet_wolf = { id: 'pet_wolf', name: 'Wolfie', bondLevel: 5, loyalty: 90, exp: 1200 };
  A.G.pets.activePetId = 'pet_wolf';
  A.recompute(p);

  const evolveSuccess = A.evolveActivePet('pet_wolf');
  assert.equal(evolveSuccess, true, 'Evolution should succeed');
  assert.equal(A.G.pets.activePetId, 'pet_alpha_direwolf', 'activePetId updated to evolved form');
  assert.ok(A.G.pets.owned.pet_alpha_direwolf, 'Owned map contains evolved form');
  assert.equal(p.zeny, 5000, 'Zeny should be deducted by 5000');

  // Verify pet combat skill activation in combat
  const dummyTarget = { x: p.x + 10, y: p.y, hp: 1000, maxHp: 1000, alive: true, size: 32, def: { id: 'boss_dummy' } };
  A.G.target = dummyTarget;

  const baseAtk = p.physAtk;
  // Step simulation - pet auto-casts Howl of Fury
  A.step(16);
  assert.ok(p.petAtkBuffUntil > 0, 'Pet buff timer set');
  assert.ok(p.physAtk > baseAtk, 'ATK buff applied to player stats');
});
