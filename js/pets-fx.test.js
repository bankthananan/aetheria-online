// js/pets-fx.test.js
// Unit tests for Companion & Pet Familiars Canvas Follower, Vacuum FX & Zero-Shake Renderer.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createPetsRenderer,
  createFollowerEntity,
  updateFollower,
  triggerAutoLoot,
  triggerEmote,
  drawFollower,
} from './render/pets-fx.js';

function createMockCtx() {
  const calls = [];
  const record = (name) => function (...args) {
    calls.push({
      name,
      args,
      fillStyle: this.fillStyle,
      strokeStyle: this.strokeStyle,
      lineWidth: this.lineWidth,
      font: this.font,
      textAlign: this.textAlign,
      globalAlpha: this.globalAlpha,
    });
  };

  const ctx = {
    calls,
    save: record('save'),
    restore: record('restore'),
    beginPath: record('beginPath'),
    closePath: record('closePath'),
    ellipse: record('ellipse'),
    arc: record('arc'),
    moveTo: record('moveTo'),
    lineTo: record('lineTo'),
    quadraticCurveTo: record('quadraticCurveTo'),
    stroke: record('stroke'),
    fill: record('fill'),
    fillRect: record('fillRect'),
    strokeRect: record('strokeRect'),
    rect: record('rect'),
    fillText: record('fillText'),
    measureText: () => ({ width: 16 }),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: '',
    globalAlpha: 1.0,
  };

  return ctx;
}

test('1. createPetsRenderer initializes renderer methods', () => {
  const renderer = createPetsRenderer({ T: (s) => s });
  assert.equal(typeof renderer.createFollowerEntity, 'function');
  assert.equal(typeof renderer.updateFollower, 'function');
  assert.equal(typeof renderer.triggerAutoLoot, 'function');
  assert.equal(typeof renderer.triggerEmote, 'function');
  assert.equal(typeof renderer.drawFollower, 'function');
});

test('2. createFollowerEntity creates well-formed entity', () => {
  const defaultEntity = createFollowerEntity();
  assert.equal(defaultEntity.id, 'pet_slime');
  assert.equal(defaultEntity.x, 0);
  assert.equal(defaultEntity.y, 0);
  assert.equal(defaultEntity.facing, 'right');
  assert.equal(defaultEntity.state, 'idle');
  assert.equal(defaultEntity.t, 0);
  assert.equal(defaultEntity.hopOffset, 0);
  assert.equal(defaultEntity.dashTarget, null);
  assert.equal(defaultEntity.dashProgress, 0);
  assert.equal(defaultEntity.devoted, false);
  assert.deepEqual(defaultEntity.motes, []);
  assert.deepEqual(defaultEntity.emotes, []);

  const customEntity = createFollowerEntity('pet_dragon', 120, 240);
  assert.equal(customEntity.id, 'pet_dragon');
  assert.equal(customEntity.x, 120);
  assert.equal(customEntity.y, 240);
  assert.equal(customEntity.facing, 'right');
  assert.equal(customEntity.state, 'idle');
  assert.equal(customEntity.t, 0);
  assert.deepEqual(customEntity.motes, []);
  assert.deepEqual(customEntity.emotes, []);
});

test('3. updateFollower moves follower toward player trailing position, flips facing, and updates hopOffset', () => {
  const entity = createFollowerEntity('pet_slime', 0, 100);

  // Player facing right: trailing target is (player.x - 32, player.y + 4) -> (68, 104)
  const playerRight = { x: 100, y: 100, facing: 'right' };
  updateFollower(entity, playerRight, 0.1);

  assert.ok(entity.x > 0, 'Follower x moves towards player trailing target');
  assert.equal(entity.facing, 'right', 'Follower faces right when moving right');
  assert.equal(entity.state, 'moving', 'Follower state is moving when distance > 16');
  assert.ok(entity.t > 0, 'Simulation timer t increases');
  assert.notEqual(entity.hopOffset, 0, 'Hop offset oscillates during movement');

  // Player facing left: trailing target is (player.x + 32, player.y + 4) -> (-68, 104)
  const playerLeft = { x: -100, y: 100, facing: 'left' };
  updateFollower(entity, playerLeft, 0.1);
  assert.equal(entity.facing, 'left', 'Follower faces left when trailing target is to the left');

  // Player facing up: trailing target is (player.x, player.y + 32)
  const playerUp = { x: entity.x, y: entity.y - 100, facing: 'up' };
  updateFollower(entity, playerUp, 0.1);
  assert.equal(entity.state, 'moving');

  // Near target (distance <= 16): state should be idle and hopOffset uses idle oscillation
  entity.x = 100;
  entity.y = 100;
  const playerRest = { x: 100, y: 132, facing: 'down' }; // target is (100, 100)
  updateFollower(entity, playerRest, 0.05);
  assert.equal(entity.state, 'idle', 'Follower state is idle within 16px of target');
  assert.ok(Math.abs(entity.hopOffset) <= 2.1, 'Idle hop offset is small');

  // Far distance (> 300): teleports / snaps directly to target
  const playerFar = { x: 1000, y: 1000, facing: 'right' };
  updateFollower(entity, playerFar, 0.016);
  assert.equal(entity.x, 1000 - 32, 'Teleports x to target when distance > 300');
  assert.equal(entity.y, 1000 + 4, 'Teleports y to target when distance > 300');
});

test('4. triggerAutoLoot sets dashTarget and spawns suction motes', () => {
  const entity = createFollowerEntity('pet_wolf', 50, 50);
  const targetPos = { x: 200, y: 150 };

  triggerAutoLoot(entity, targetPos);
  assert.deepEqual(entity.dashTarget, { x: 200, y: 150 });
  assert.ok(entity.motes.length >= 5, 'Spawns at least 5 suction motes');

  const firstMote = entity.motes[0];
  assert.equal(firstMote.targetX, 200);
  assert.equal(firstMote.targetY, 150);
  assert.equal(firstMote.t, 0);
  assert.equal(firstMote.color, '#ffd54f');
  assert.ok(firstMote.duration > 0);

  // Update follower during dash moves quickly toward dashTarget
  const startX = entity.x;
  const dummyPlayer = { x: 50, y: 50, facing: 'right' };
  updateFollower(entity, dummyPlayer, 0.1);
  assert.ok(entity.x > startX, 'Entity advances towards dashTarget');

  // When reaching within 6px of dashTarget, completes dash, triggers celebratory hop, and clears dashTarget
  entity.x = 198;
  entity.y = 150;
  const initialMoteCount = entity.motes.length;
  updateFollower(entity, dummyPlayer, 0.016);
  assert.equal(entity.dashTarget, null, 'dashTarget is cleared upon arrival');
  assert.equal(entity.hopOffset, -6, 'Celebratory hop applied on arrival');
  assert.ok(entity.motes.length > initialMoteCount, 'Spawns converging motes on reaching dash target');
});

test('5. triggerEmote adds floating heart / star emotes', () => {
  const entity = createFollowerEntity('pet_sprite', 100, 100);

  triggerEmote(entity, 'heart');
  assert.equal(entity.emotes.length, 1);
  assert.equal(entity.emotes[0].text, '♥');
  assert.equal(entity.emotes[0].color, '#ff4081');
  assert.equal(entity.emotes[0].alpha, 1.0);
  assert.equal(entity.emotes[0].vy, -18);
  assert.equal(entity.emotes[0].life, 0);

  triggerEmote(entity, 'devoted');
  assert.equal(entity.emotes.length, 2);
  assert.equal(entity.emotes[1].text, '★');
  assert.equal(entity.emotes[1].color, '#ffd54f');

  triggerEmote(entity, 'sparkle');
  assert.equal(entity.emotes.length, 3);
  assert.equal(entity.emotes[2].text, '✦');
  assert.equal(entity.emotes[2].color, '#80d8ff');

  // Updating follower updates emote position, decreases alpha, and expires dead emotes
  const initialY = entity.emotes[0].y;
  updateFollower(entity, { x: 100, y: 100, facing: 'down' }, 0.5);
  assert.ok(entity.emotes[0].y < initialY, 'Emote floats upward');
  assert.ok(entity.emotes[0].life >= 0.5, 'Emote life increments');
  assert.ok(entity.emotes[0].alpha < 1.0, 'Emote alpha decays');

  // Advance time beyond maxLife (1.2s) to expire emotes
  updateFollower(entity, { x: 100, y: 100, facing: 'down' }, 1.5);
  assert.equal(entity.emotes.length, 0, 'Emotes removed after reaching maxLife');
});

test('6. drawFollower draws shadow, sprite, and emotes without throwing', () => {
  const ctx = createMockCtx();
  const cam = { x: 100, y: 100 };

  // Test null / edge-case guards
  assert.doesNotThrow(() => drawFollower(null, null, cam));
  assert.doesNotThrow(() => drawFollower(ctx, null, cam));
  assert.doesNotThrow(() => drawFollower(ctx, createFollowerEntity(), null));

  const archetypes = ['pet_slime', 'pet_wolf', 'pet_sprite', 'pet_bear', 'pet_dragon'];

  for (const petId of archetypes) {
    ctx.calls.length = 0;
    const pet = createFollowerEntity(petId, 200, 200);
    pet.devoted = true;
    triggerEmote(pet, 'heart');
    triggerAutoLoot(pet, { x: 220, y: 220 });

    drawFollower(ctx, pet, cam, 1000, 832, 576);

    assert.ok(ctx.calls.length > 5, `${petId} issues canvas calls`);
    assert.ok(ctx.calls.some((c) => c.name === 'save'), `${petId} invokes save`);
    assert.ok(ctx.calls.some((c) => c.name === 'restore'), `${petId} invokes restore`);
    assert.ok(ctx.calls.some((c) => c.name === 'fill'), `${petId} invokes fill`);
    assert.ok(ctx.calls.some((c) => c.name === 'fillText' && c.args[0] === '♥'), `${petId} renders emote`);
  }
});

test('7. Offscreen culling prevents drawing outside viewport bounds', () => {
  const ctx = createMockCtx();
  const cam = { x: 0, y: 0 };

  // Way offscreen to the right and bottom
  const farPet = createFollowerEntity('pet_slime', 3000, 3000);
  ctx.calls.length = 0;
  drawFollower(ctx, farPet, cam, 1000, 832, 576);
  assert.equal(ctx.calls.length, 0, 'No draw calls for far offscreen entity (positive bounds)');

  // Far offscreen to the left and top
  const negativePet = createFollowerEntity('pet_slime', -500, -500);
  ctx.calls.length = 0;
  drawFollower(ctx, negativePet, cam, 1000, 832, 576);
  assert.equal(ctx.calls.length, 0, 'No draw calls for far offscreen entity (negative bounds)');
});

test('8. Strict ZERO Screen Shake: verify cam.x and cam.y before and after drawFollower remain strictly identical', () => {
  const ctx = createMockCtx();
  const cam = Object.freeze({ x: 142.857, y: 285.714 });
  const pet = createFollowerEntity('pet_dragon', 200, 200);
  pet.devoted = true;
  triggerEmote(pet, 'heart');
  triggerAutoLoot(pet, { x: 210, y: 210 });

  assert.doesNotThrow(() => {
    drawFollower(ctx, pet, cam, Date.now(), 832, 576);
  }, 'Frozen camera object must not be mutated (Zero Screen Shake)');

  assert.equal(cam.x, 142.857, 'cam.x must be strictly unmodified');
  assert.equal(cam.y, 285.714, 'cam.y must be strictly unmodified');
});
