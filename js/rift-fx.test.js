// js/rift-fx.test.js
// Unit tests for the Rift & Dimensional Incursion Canvas Renderer.
// Verifies canvas draw calls, vortex animation math, HUD banner layout, and strict 0-shake invariants.

import assert from 'node:assert/strict';
import { createRiftRenderer } from './render/rift-fx.js';

const calls = [];
const record = name => function (...args) {
  calls.push({ name, args, fillStyle: this.fillStyle, strokeStyle: this.strokeStyle });
};

const mockCtx = {
  save: record('save'),
  restore: record('restore'),
  beginPath: record('beginPath'),
  closePath: record('closePath'),
  ellipse: record('ellipse'),
  arc: record('arc'),
  stroke: record('stroke'),
  fill: record('fill'),
  fillRect: record('fillRect'),
  strokeRect: record('strokeRect'),
  fillText: record('fillText'),
  measureText: () => ({ width: 60 }),
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
};

const renderer = createRiftRenderer();

// 1. Offscreen culling: does not draw if coordinates are far off camera
const cam = { x: 500, y: 500 };
calls.length = 0;
renderer.drawRiftTear(mockCtx, { x: 50, y: 50 }, cam, 1000, 832, 576);
assert.equal(calls.length, 0, 'Offscreen rift tear is culled without drawing');

// 2. Onscreen rendering: draws pulsing vortex ellipses and orbiting sparks
calls.length = 0;
renderer.drawRiftTear(mockCtx, { x: 550, y: 550 }, cam, 1000, 832, 576);
assert.ok(calls.length > 5, 'Onscreen rift tear issues multiple canvas calls');
assert.ok(calls.some(c => c.name === 'beginPath'), 'Contains path calls');
assert.ok(calls.some(c => c.name === 'stroke' || c.name === 'fill'), 'Contains stroke/fill draw calls');

// 3. Strict ZERO camera shake invariant
const originalCamX = cam.x;
const originalCamY = cam.y;
for (let t = 0; t < 100; t += 10) {
  renderer.drawRiftTear(mockCtx, { x: 550, y: 550 }, cam, t * 100, 832, 576);
  assert.equal(cam.x, originalCamX, 'cam.x must never be mutated (strictly 0 shake)');
  assert.equal(cam.y, originalCamY, 'cam.y must never be mutated (strictly 0 shake)');
}

// 4. Incursion HUD Banner rendering
calls.length = 0;
const incursion = {
  currentWave: 2,
  timeRemainingMs: 45000,
  mutator: { id: 'void_decay', name: 'Void Decay', icon: '🟣' },
};
renderer.drawIncursionHud(mockCtx, incursion, 832, 576, 1000);
assert.ok(calls.some(c => c.name === 'fillRect'), 'HUD banner draws backdrop');
assert.ok(calls.some(c => c.name === 'fillText'), 'HUD banner draws wave and timer text');

console.log('✔ All rift renderer unit tests passed.');
