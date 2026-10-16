import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatCooldownLabel,
  computeHotbarSlotState,
} from './render/hotbar-ux.js';

test('formatCooldownLabel shows sub-second decimals under 3s and integer seconds above 3s', () => {
  assert.equal(formatCooldownLabel(0), '');
  assert.equal(formatCooldownLabel(-200), '');
  assert.equal(formatCooldownLabel(840), '0.9s');
  assert.equal(formatCooldownLabel(2450), '2.5s');
  assert.equal(formatCooldownLabel(4200), '5s');
});

test('computeHotbarSlotState computes radial cooldown percentage, MP/range status, and combo-primed state', () => {
  const nowMs = 5000;
  const skills = [
    { id: 'arcane_bolt', name: 'Arcane Bolt', mpCost: 12, cooldownMs: 4000, rangeTiles: 5, type: 'damage' },
    { id: 'pressure_point', name: 'Pressure Point', mpCost: 18, cooldownMs: 6000, rangeTiles: 2, detonate: 'stun', type: 'damage' },
    { id: 'world_cleaver', name: 'World Cleaver', mpCost: 0, cooldownMs: 8000, rangeTiles: 3, finisher: true, type: 'damage' },
  ];

  const G = {
    player: {
      x: 100,
      y: 100,
      mp: 10,
      momentum: 4,
      skillLevels: { arcane_bolt: 3, pressure_point: 2, world_cleaver: 1 },
      skillCd: {
        arcane_bolt: nowMs + 2000, // 50% remaining of 4000ms
      },
    },
    target: {
      alive: true,
      x: 100 + 32 * 4, // 4 tiles away (tileSize = 32)
      y: 100,
      statuses: {
        stun: { until: nowMs + 3000 },
      },
    },
  };

  // Slot 0: Arcane Bolt (on cooldown, insufficient MP, in range)
  const s0 = computeHotbarSlotState({ type: 'skill', id: 'arcane_bolt' }, 0, G, { nowMs, skills, finisherMin: 3, tileSize: 32 });
  assert.equal(s0.cooldownRemainingMs, 2000);
  assert.equal(s0.cooldownPct, 50);
  assert.equal(s0.cooldownAngleDeg, 180);
  assert.equal(s0.cooldownText, '2.0s');
  assert.equal(s0.insufficientMp, true);
  assert.equal(s0.outOfRange, false);
  assert.equal(s0.comboPrimed, false);

  // Slot 1: Pressure Point (detonates stun on target, out of range since 4 tiles > 2 tiles, insufficient MP)
  G.player.mp = 50;
  const s1 = computeHotbarSlotState({ type: 'skill', id: 'pressure_point' }, 1, G, { nowMs, skills, finisherMin: 3, tileSize: 32 });
  assert.equal(s1.insufficientMp, false);
  assert.equal(s1.outOfRange, true);
  assert.equal(s1.comboPrimed, true, 'Detonator is combo-primed when target has matching status');

  // Slot 2: World Cleaver (finisher with momentum 4 >= 3)
  const s2 = computeHotbarSlotState({ type: 'skill', id: 'world_cleaver' }, 2, G, { nowMs, skills, finisherMin: 3, tileSize: 32 });
  assert.equal(s2.comboPrimed, true, 'Finisher is combo-primed when momentum >= finisherMin');
  assert.equal(s2.insufficientMomentum, false);
});
