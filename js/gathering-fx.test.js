// js/gathering-fx.test.js
// Unit tests for the Gathering & Fishing Canvas 2D Renderer.
// Verifies canvas draw calls, herb/ore/water ripple visual elements,
// fishing HUD timing bar layout, offscreen culling, and strict ZERO screen shake.

import assert from 'node:assert/strict';
import { createGatheringRenderer } from './render/gathering-fx.js';

const calls = [];
const record = name => function (...args) {
  calls.push({
    name,
    args,
    fillStyle: this.fillStyle,
    strokeStyle: this.strokeStyle,
    lineWidth: this.lineWidth,
    font: this.font,
    textAlign: this.textAlign,
  });
};

const mockCtx = {
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
  fillText: record('fillText'),
  measureText: () => ({ width: 50 }),
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
  font: '',
  textAlign: '',
};

// 1. Factory returns drawGatherNodes and drawFishingHud functions
const renderer = createGatheringRenderer({ T: s => s });
assert.equal(typeof renderer.drawGatherNodes, 'function', 'Factory exposes drawGatherNodes');
assert.equal(typeof renderer.drawFishingHud, 'function', 'Factory exposes drawFishingHud');

// Null/empty guards
assert.doesNotThrow(() => renderer.drawGatherNodes(null, [], { x: 0, y: 0 }), 'Handles null ctx in drawGatherNodes');
assert.doesNotThrow(() => renderer.drawGatherNodes(mockCtx, null, { x: 0, y: 0 }), 'Handles null nodes in drawGatherNodes');
assert.doesNotThrow(() => renderer.drawGatherNodes(mockCtx, [], null), 'Handles null cam in drawGatherNodes');
assert.doesNotThrow(() => renderer.drawFishingHud(null, { active: true }), 'Handles null ctx in drawFishingHud');
assert.doesNotThrow(() => renderer.drawFishingHud(mockCtx, null), 'Handles null fishingState in drawFishingHud');
assert.doesNotThrow(() => renderer.drawFishingHud(mockCtx, { active: false }), 'Handles inactive fishingState in drawFishingHud');

// 2. drawGatherNodes renders herb node without errors and invokes stroke/fill
const cam = { x: 100, y: 100 };
calls.length = 0;
const herbNode = {
  id: 'node_herb_1',
  type: 'herb',
  resourceId: 'silverleaf',
  resourceName: 'Silverleaf',
  x: 150,
  y: 150,
};
renderer.drawGatherNodes(mockCtx, [herbNode], cam, 1000, 832, 576);

assert.ok(calls.length > 5, 'Onscreen herb node issues canvas calls');
assert.ok(calls.some(c => c.name === 'beginPath'), 'Herb node starts paths');
assert.ok(calls.some(c => c.name === 'stroke'), 'Herb node strokes stem and petals');
assert.ok(calls.some(c => c.name === 'fill'), 'Herb node fills petals and sparks');
assert.ok(calls.some(c => c.name === 'fillText' && c.args[0].includes('Silverleaf')), 'Herb node displays label');

// Verify herb palette variants render without error
const herbVariants = ['moonlight_lotus', 'ember_blossom', 'frost_lily', 'sunken_kelp', 'silverleaf'];
for (const resId of herbVariants) {
  calls.length = 0;
  renderer.drawGatherNodes(mockCtx, [{
    id: `node_${resId}`,
    type: 'herb',
    resourceId: resId,
    x: 150,
    y: 150,
  }], cam, 1200, 832, 576);
  assert.ok(calls.some(c => c.name === 'fill'), `Herb variant ${resId} successfully fills`);
}

// 3. drawGatherNodes renders ore and water ripple nodes
// Ore node
calls.length = 0;
const oreNode = {
  id: 'node_ore_1',
  type: 'ore',
  resourceId: 'copper_ore',
  resourceName: 'Copper Ore',
  x: 200,
  y: 200,
};
renderer.drawGatherNodes(mockCtx, [oreNode], cam, 1000, 832, 576);
assert.ok(calls.some(c => c.name === 'fill'), 'Ore node fills facets');
assert.ok(calls.some(c => c.name === 'stroke'), 'Ore node strokes angular borders');
assert.ok(calls.some(c => c.name === 'fillText' && c.args[0].includes('Copper Ore')), 'Ore node displays label');

// Ore variants
const oreVariants = ['copper_ore', 'iron_vein', 'caldera_crystal'];
for (const resId of oreVariants) {
  calls.length = 0;
  renderer.drawGatherNodes(mockCtx, [{
    id: `node_${resId}`,
    type: 'ore',
    resourceId: resId,
    x: 200,
    y: 200,
  }], cam, 1500, 832, 576);
  assert.ok(calls.some(c => c.name === 'fill'), `Ore variant ${resId} successfully fills`);
}

// Water ripple node
calls.length = 0;
const rippleNode = {
  id: 'node_rip_1',
  type: 'water_ripple',
  x: 250,
  y: 250,
};
renderer.drawGatherNodes(mockCtx, [rippleNode], cam, 1000, 832, 576);
assert.ok(calls.some(c => c.name === 'stroke'), 'Water ripple strokes expanding rings');
assert.ok(calls.some(c => c.name === 'fillText' && c.args[0].includes('Fishing Spot')), 'Water ripple displays fishing spot label');

// 4. drawGatherNodes culls offscreen nodes
calls.length = 0;
const offscreenCam = { x: 1000, y: 1000 };
const offscreenNodes = [
  { id: 'off_herb', type: 'herb', resourceId: 'silverleaf', x: 100, y: 100 },
  { id: 'off_ore', type: 'ore', resourceId: 'copper_ore', x: 2500, y: 2500 },
  { id: 'off_rip', type: 'water_ripple', x: 1000, y: -200 },
];
renderer.drawGatherNodes(mockCtx, offscreenNodes, offscreenCam, 1000, 832, 576);
assert.equal(calls.length, 0, 'Offscreen nodes are completely culled');

// Depleted nodes do not render active label
calls.length = 0;
const depletedNode = {
  id: 'dep_1',
  type: 'herb',
  resourceId: 'silverleaf',
  x: 150,
  y: 150,
  harvested: true,
};
renderer.drawGatherNodes(mockCtx, [depletedNode], cam, 1000, 832, 576);
assert.ok(!calls.some(c => c.name === 'fillText'), 'Depleted harvested node does not draw active resource label');

// Cooldown remaining node
calls.length = 0;
const cooldownNode = {
  id: 'cool_1',
  type: 'ore',
  resourceId: 'iron_vein',
  x: 150,
  y: 150,
  cooldownRemainingMs: 15000,
};
renderer.drawGatherNodes(mockCtx, [cooldownNode], cam, 1000, 832, 576);
assert.ok(!calls.some(c => c.name === 'fillText'), 'Cooldown node does not draw active resource label');

// 5. drawFishingHud renders frame, sweet spot band, and oscillating needle
calls.length = 0;
const activeFishingState = {
  active: true,
  needle: 0.5,
  sweetMin: 0.35,
  sweetMax: 0.65,
};
renderer.drawFishingHud(mockCtx, activeFishingState, 832, 576, 1000);

// Frame (240x34)
assert.ok(
  calls.some(c => c.name === 'fillRect' && c.args[2] === 240 && c.args[3] === 34),
  'Fishing HUD draws backing frame background'
);
assert.ok(
  calls.some(c => c.name === 'strokeRect' && c.args[2] === 240 && c.args[3] === 34),
  'Fishing HUD strokes backing frame border'
);

// Track (224x22)
assert.ok(
  calls.some(c => c.name === 'fillRect' && c.args[2] === 224 && c.args[3] === 22),
  'Fishing HUD draws dark blue water track'
);

// Sweet spot zone (width = (0.65 - 0.35) * 224 = 67.2)
assert.ok(
  calls.some(c => c.name === 'fillRect' && Math.abs(c.args[2] - 67.2) < 0.1),
  'Fishing HUD draws green sweet spot zone fill'
);
assert.ok(
  calls.some(c => c.name === 'strokeRect' && Math.abs(c.args[2] - 67.2) < 0.1),
  'Fishing HUD draws green sweet spot zone border'
);

// Needle indicator (width 4, height 22 + 4 = 26)
assert.ok(
  calls.some(c => c.name === 'fillRect' && c.args[2] === 4 && c.args[3] === 26),
  'Fishing HUD draws golden vertical needle indicator'
);

// Prompt text
assert.ok(
  calls.some(c => c.name === 'fillText' && c.args[0].includes('Reel In! [SPACE / TAP]')),
  'Fishing HUD draws prompt reel in text'
);

// Inactive fishing hud does nothing
calls.length = 0;
renderer.drawFishingHud(mockCtx, { active: false }, 832, 576, 1000);
assert.equal(calls.length, 0, 'Inactive fishing state renders nothing');

// 6. Strict ZERO screen shake: verify cam.x and cam.y before and after remain strictly equal
const shakeCheckCam = { x: 412, y: 288 };
const initialCamX = shakeCheckCam.x;
const initialCamY = shakeCheckCam.y;

const testNodes = [
  { id: 'n1', type: 'herb', resourceId: 'ember_blossom', x: 450, y: 320 },
  { id: 'n2', type: 'ore', resourceId: 'caldera_crystal', x: 500, y: 350 },
  { id: 'n3', type: 'water_ripple', x: 550, y: 380 },
];

for (let tick = 0; tick < 100; tick++) {
  const simNow = 10000 + tick * 50;
  renderer.drawGatherNodes(mockCtx, testNodes, shakeCheckCam, simNow, 832, 576);

  assert.equal(shakeCheckCam.x, initialCamX, 'cam.x must never be modified by drawGatherNodes');
  assert.equal(shakeCheckCam.y, initialCamY, 'cam.y must never be modified by drawGatherNodes');

  const dynFishing = {
    active: true,
    needle: (Math.sin(tick * 0.1) + 1) / 2,
    sweetMin: 0.35,
    sweetMax: 0.65,
  };
  renderer.drawFishingHud(mockCtx, dynFishing, 832, 576, simNow);

  assert.equal(shakeCheckCam.x, initialCamX, 'cam.x must never be modified by drawFishingHud');
  assert.equal(shakeCheckCam.y, initialCamY, 'cam.y must never be modified by drawFishingHud');
}

console.log('✔ All gathering and fishing renderer unit tests passed.');
