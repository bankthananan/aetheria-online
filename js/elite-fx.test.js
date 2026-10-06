import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  drawEliteAura,
  drawEliteShield,
  drawMoltenHazards,
} from './render/elite-fx.js';

function createMockCtx() {
  const calls = [];
  return {
    calls,
    save: () => calls.push('save'),
    restore: () => calls.push('restore'),
    beginPath: () => calls.push('beginPath'),
    arc: (...args) => calls.push(['arc', ...args]),
    stroke: () => calls.push('stroke'),
    fill: () => calls.push('fill'),
    closePath: () => calls.push('closePath'),
    lineTo: (...args) => calls.push(['lineTo', ...args]),
    moveTo: (...args) => calls.push(['moveTo', ...args]),
    setLineDash: (d) => calls.push(['setLineDash', d]),
    strokeStyle: '',
    fillStyle: '',
    lineWidth: 1,
    globalAlpha: 1,
  };
}

test('elite-fx: drawEliteAura renders cyan ring for champion', () => {
  const ctx = createMockCtx();
  const mob = { eliteTier: 'champion' };
  drawEliteAura(ctx, mob, 100, 100, 32, 5000);

  assert.ok(ctx.calls.length > 0, 'Should execute canvas drawing commands');
  assert.equal(ctx.strokeStyle, '#5bc0de');
});

test('elite-fx: drawEliteAura renders gold ring for elite', () => {
  const ctx = createMockCtx();
  const mob = { eliteTier: 'elite' };
  drawEliteAura(ctx, mob, 100, 100, 32, 5000);

  assert.ok(ctx.calls.length > 0);
  assert.equal(ctx.strokeStyle, '#ffcc00');
});

test('elite-fx: drawEliteShield renders barrier only when shieldActive is true', () => {
  const ctx1 = createMockCtx();
  const mobInactive = { shieldActive: false };
  drawEliteShield(ctx1, mobInactive, 100, 100, 32, 5000);
  assert.equal(ctx1.calls.length, 0, 'No drawing when shield is inactive');

  const ctx2 = createMockCtx();
  const mobActive = { shieldActive: true };
  drawEliteShield(ctx2, mobActive, 100, 100, 32, 5000);
  assert.ok(ctx2.calls.length > 0, 'Draws barrier when shieldActive is true');
});

test('elite-fx: drawMoltenHazards renders active hazards', () => {
  const ctx = createMockCtx();
  const hazards = [
    { x: 100, y: 100, radius: 24, expiresAt: 6000 },
  ];
  drawMoltenHazards(ctx, hazards, 0, 0, 5000);
  assert.ok(ctx.calls.length > 0, 'Draws molten hazards');
});
