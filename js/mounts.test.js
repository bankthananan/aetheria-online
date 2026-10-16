import assert from 'node:assert/strict';
import test from 'node:test';
import { canMount } from './systems/pets.js';
import { createRuntime } from './test-support/runtime.js';

test('canMount validates companion mount eligibility', () => {
  const slime = { id: 'pet_slime', bondLevel: 5, loyalty: 100 };
  const wolfLowBond = { id: 'pet_wolf', bondLevel: 1, loyalty: 50 };
  const wolfMounted = { id: 'pet_wolf', bondLevel: 3, loyalty: 50 };
  const direwolf = { id: 'pet_alpha_direwolf', bondLevel: 1, loyalty: 20 };
  const wyrm = { id: 'pet_infernal_wyrm', bondLevel: 5, loyalty: 90 };

  assert.equal(canMount(slime), false, 'Slime cannot be mounted');
  assert.equal(canMount(wolfLowBond), false, 'Wolf requires bond level 2+ to mount');
  assert.equal(canMount(wolfMounted), true, 'Wolf with bond level 3 is mountable');
  assert.equal(canMount(direwolf), true, 'Alpha Direwolf evolved form is mountable');
  assert.equal(canMount(wyrm), true, 'Infernal Wyrm evolved form is mountable');
});

test('Mount toggle increases movement speed by 40% and dismounts on action', async () => {
  const { A } = await createRuntime();
  const p = A.G.player;

  // 1. Cannot mount without active companion
  A.G.pets.activePetId = null;
  assert.equal(A.toggleMount(), false, 'Cannot mount without active pet');
  assert.equal(A.G.mounted, false);

  // 2. Cannot mount unmountable pet (slime)
  A.G.pets.owned.pet_slime = { id: 'pet_slime', bondLevel: 5, loyalty: 100 };
  A.G.pets.activePetId = 'pet_slime';
  assert.equal(A.toggleMount(), false, 'Cannot mount gel slime');
  assert.equal(A.G.mounted, false);

  // 3. Mount eligible wolf
  A.G.pets.owned.pet_wolf = { id: 'pet_wolf', bondLevel: 3, loyalty: 70 };
  A.G.pets.activePetId = 'pet_wolf';
  A.recompute(p);
  const baseSpeed = p.moveMult;

  const mountedOk = A.toggleMount();
  assert.equal(mountedOk, true, 'Mounting wolf must succeed');
  assert.equal(A.G.mounted, true, 'G.mounted should be true');
  assert.ok(p.moveMult > baseSpeed * 1.35, 'Move speed should increase by +40%');

  // 4. Dismount toggle
  const dismountOk = A.toggleMount();
  assert.equal(dismountOk, true, 'Dismounting must succeed');
  assert.equal(A.G.mounted, false, 'G.mounted should be false');
  assert.equal(p.moveMult, baseSpeed, 'Move speed returns to base');

  // 5. Basic attack dismounts rider
  A.toggleMount();
  assert.equal(A.G.mounted, true);
  const dummyTarget = { x: p.x + 10, y: p.y, hp: 100, maxHp: 100, alive: true, size: 24, def: { id: 'target_dummy' } };
  A.G.target = dummyTarget;
  A.playerBasicAttack();
  assert.equal(A.G.mounted, false, 'Attacking must dismount player');
});
