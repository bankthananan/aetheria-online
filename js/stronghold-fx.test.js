// js/stronghold-fx.test.js
// Unit tests for Stronghold Canvas 2D Visual Effects, Pedestal Beacons & Zero-Shake Renderer.

import assert from 'node:assert/strict';
import { createStrongholdRenderer } from './render/stronghold-fx.js';

function createMockCtx() {
  const calls = [];
  const gradientStops = [];
  let lineDash = [];

  const record = (name) => function (...args) {
    calls.push({
      name,
      args,
      fillStyle: this.fillStyle,
      strokeStyle: this.strokeStyle,
      lineWidth: this.lineWidth,
      font: this.font,
      textAlign: this.textAlign,
      lineDash: [...lineDash],
      lineDashOffset: this.lineDashOffset,
    });
  };

  const createGradientMock = (type, args) => {
    const stops = [];
    return {
      type,
      args,
      stops,
      addColorStop(offset, color) {
        stops.push({ offset, color });
        gradientStops.push({ type, offset, color });
      },
    };
  };

  const ctx = {
    calls,
    gradientStops,
    save: record('save'),
    restore: record('restore'),
    beginPath: record('beginPath'),
    closePath: record('closePath'),
    arc: record('arc'),
    stroke: record('stroke'),
    fill: record('fill'),
    fillRect: record('fillRect'),
    strokeRect: record('strokeRect'),
    fillText: record('fillText'),
    lineTo: record('lineTo'),
    moveTo: record('moveTo'),
    measureText: () => ({ width: 60 }),
    createRadialGradient: function (...args) {
      record('createRadialGradient').apply(this, args);
      return createGradientMock('radial', args);
    },
    createLinearGradient: function (...args) {
      record('createLinearGradient').apply(this, args);
      return createGradientMock('linear', args);
    },
    setLineDash: function (segments) {
      lineDash = segments ? [...segments] : [];
      record('setLineDash').apply(this, [segments]);
    },
    getLineDash: () => [...lineDash],
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: 'left',
    lineDashOffset: 0,
  };

  return ctx;
}

console.log('--- Stronghold FX Renderer Test Suite ---');

// ============================================================================
// 1. createStrongholdRenderer initializes all renderer methods
// ============================================================================
console.log('1. Testing createStrongholdRenderer method initialization...');
{
  const renderer = createStrongholdRenderer();
  assert.equal(typeof renderer.drawCrystalBeacon, 'function', 'drawCrystalBeacon is a function');
  assert.equal(typeof renderer.drawPedestalBeams, 'function', 'drawPedestalBeams is a function');
  assert.equal(typeof renderer.drawSiegeLanes, 'function', 'drawSiegeLanes is a function');
  assert.equal(typeof renderer.updateFx, 'function', 'updateFx is a function');
}

// ============================================================================
// 2. drawCrystalBeacon renders rune circles, gradient glow, and hexagonal shield when siegeActive
// ============================================================================
console.log('2. Testing drawCrystalBeacon with healthy HP and siegeActive...');
{
  const renderer = createStrongholdRenderer();
  const cam = { x: 100, y: 100 };
  const ctx = createMockCtx();

  const crystal = {
    x: 400,
    y: 300,
    hp: 1000,
    maxHp: 1000,
    siegeActive: true,
  };

  renderer.drawCrystalBeacon(ctx, crystal, cam, 1000);

  // Concentric rune circles (radius 28px and 40px)
  const arcCalls = ctx.calls.filter(c => c.name === 'arc');
  assert.ok(arcCalls.length >= 2, 'Renders concentric circles with arc');
  const radii = arcCalls.map(c => c.args[2]);
  assert.ok(radii.some(r => Math.abs(r - 28) < 1), 'Contains circle with radius ~28px');
  assert.ok(radii.some(r => Math.abs(r - 40) < 1), 'Contains circle with radius ~40px');

  // Radial gradient glow: emerald ('rgba(0, 230, 118, 0.35)') when healthy
  const radialGradients = ctx.calls.filter(c => c.name === 'createRadialGradient');
  assert.ok(radialGradients.length > 0, 'Creates radial gradient for healthy glow');
  assert.ok(
    ctx.gradientStops.some(s => s.type === 'radial' && s.color.includes('rgba(0, 230, 118')),
    'Uses emerald radial gradient glow when healthy'
  );

  // Hexagonal energy shield lattice when siegeActive
  const shieldFillCalls = ctx.calls.filter(c => c.name === 'fill' && c.fillStyle === 'rgba(0, 229, 255, 0.12)');
  const shieldStrokeCalls = ctx.calls.filter(c => c.name === 'stroke' && c.strokeStyle === '#00e5ff');
  assert.ok(shieldFillCalls.length > 0, 'Hexagonal shield fill with rgba(0, 229, 255, 0.12)');
  assert.ok(shieldStrokeCalls.length > 0, 'Hexagonal shield stroke with #00e5ff');

  // Text label: '💎 Stronghold Crystal'
  const textCalls = ctx.calls.filter(c => c.name === 'fillText');
  assert.ok(textCalls.length > 0, 'Draws crystal label');
  assert.ok(
    textCalls.some(c => typeof c.args[0] === 'string' && c.args[0].includes('Stronghold Crystal')),
    'Label contains Stronghold Crystal'
  );
}

// ============================================================================
// 3. drawCrystalBeacon switches color styling when crystal HP is below 40%
// ============================================================================
console.log('3. Testing drawCrystalBeacon low HP amber/red glow (< 40%)...');
{
  const renderer = createStrongholdRenderer();
  const cam = { x: 100, y: 100 };
  const ctx = createMockCtx();

  const damagedCrystal = {
    x: 400,
    y: 300,
    hp: 300,
    maxHp: 1000, // 30% HP < 40%
    siegeActive: false,
  };

  renderer.drawCrystalBeacon(ctx, damagedCrystal, cam, 1000);

  // Radial gradient glow: amber/red ('rgba(255, 82, 82, 0.45)')
  assert.ok(
    ctx.gradientStops.some(s => s.type === 'radial' && s.color.includes('rgba(255, 82, 82')),
    'Uses amber/red radial gradient glow when HP < 40%'
  );
}

// ============================================================================
// 4. drawPedestalBeams draws vertical elemental columns for colossus, voidmaw, zenith, incursion
// ============================================================================
console.log('4. Testing drawPedestalBeams with socketed trophy pedestals...');
{
  const renderer = createStrongholdRenderer();
  const cam = { x: 0, y: 0 };
  const ctx = createMockCtx();

  const pedestals = [
    { id: 'pedestal_colossus', x: 200, y: 200, socketed: true, color: '#ff5722', name: 'Colossus Vanguard' },
    { id: 'pedestal_voidmaw', x: 300, y: 200, socketed: true, color: '#9c27b0', name: 'Voidmaw Singularity' },
    { id: 'pedestal_zenith', x: 400, y: 200, socketed: true, color: '#ffd700', name: 'Zenith Ascendant' },
    { id: 'pedestal_incursion', x: 500, y: 200, socketed: true, color: '#00e5ff', name: 'Incursion Vanguard' },
  ];

  renderer.drawPedestalBeams(ctx, pedestals, cam, 1000);

  // Check linear gradients created for each pedestal beam
  const linearGradCalls = ctx.calls.filter(c => c.name === 'createLinearGradient');
  assert.equal(linearGradCalls.length, 4, '4 linear gradients created for 4 socketed pedestals');

  const linearStops = ctx.gradientStops.filter(s => s.type === 'linear');
  assert.ok(linearStops.some(s => s.color === '#ff5722'), 'Colossus beam uses #ff5722');
  assert.ok(linearStops.some(s => s.color === '#9c27b0'), 'Voidmaw beam uses #9c27b0');
  assert.ok(linearStops.some(s => s.color === '#ffd700'), 'Zenith beam uses #ffd700');
  assert.ok(linearStops.some(s => s.color === '#00e5ff'), 'Incursion beam uses #00e5ff');

  // Verify vertical beam column fillRect calls
  const fillRectCalls = ctx.calls.filter(c => c.name === 'fillRect');
  assert.ok(fillRectCalls.length >= 4, 'At least 4 fillRect calls for radiant beam columns');
}

// ============================================================================
// 5. drawPedestalBeams draws empty base ring when pedestal is not socketed
// ============================================================================
console.log('5. Testing drawPedestalBeams with unsocketed pedestal...');
{
  const renderer = createStrongholdRenderer();
  const cam = { x: 0, y: 0 };
  const ctx = createMockCtx();

  const emptyPedestals = [
    { id: 'pedestal_colossus', x: 200, y: 200, socketed: false, color: '#ff5722' },
  ];

  renderer.drawPedestalBeams(ctx, emptyPedestals, cam, 1000);

  // No linear gradient beam created
  const linearGradCalls = ctx.calls.filter(c => c.name === 'createLinearGradient');
  assert.equal(linearGradCalls.length, 0, 'Unsocketed pedestal does NOT draw radiant beam column');

  // Marble pedestal base ring drawn with 'rgba(255, 255, 255, 0.25)'
  const marbleRings = ctx.calls.filter(c => c.name === 'stroke' && c.strokeStyle.includes('rgba(255, 255, 255, 0.25)'));
  assert.ok(marbleRings.length > 0, 'Draws subtle marble pedestal base ring (rgba(255, 255, 255, 0.25))');
}

// ============================================================================
// 6. drawSiegeLanes draws dashed hazard vectors and chevrons
// ============================================================================
console.log('6. Testing drawSiegeLanes dashed hazard vector lines & chevrons...');
{
  const renderer = createStrongholdRenderer();
  const cam = { x: 0, y: 0 };
  const ctx = createMockCtx();

  const lanes = [
    { x1: 50, y1: 50, x2: 350, y2: 350 },
  ];

  renderer.drawSiegeLanes(ctx, lanes, cam, 1000);

  // Dashed hazard lines with setLineDash([6, 6])
  const dashCalls = ctx.calls.filter(c => c.name === 'setLineDash');
  assert.ok(dashCalls.length > 0, 'setLineDash called for hazard lane');
  assert.ok(dashCalls.some(c => Array.isArray(c.args[0]) && c.args[0][0] === 6 && c.args[0][1] === 6), 'Uses [6, 6] dash pattern');

  // Stroke color 'rgba(244, 67, 54, 0.4)'
  const hazardStrokes = ctx.calls.filter(c => c.name === 'stroke' && c.strokeStyle.includes('rgba(244, 67, 54'));
  assert.ok(hazardStrokes.length > 0, 'Draws hazard vector strokes with rgba(244, 67, 54, 0.4)');

  // Chevrons drawn along the vector line (multiple moveTo / lineTo calls)
  const lineToCalls = ctx.calls.filter(c => c.name === 'lineTo');
  assert.ok(lineToCalls.length >= 4, 'Multiple lineTo calls for hazard line and chevrons');
}

// ============================================================================
// 7. Offscreen culling: skip drawing when entities are outside viewport bounds
// ============================================================================
console.log('7. Testing offscreen culling for all elements...');
{
  const renderer = createStrongholdRenderer();
  const cam = { x: 0, y: 0 };
  const viewW = 832;
  const viewH = 576;

  // Crystal offscreen
  {
    const ctx = createMockCtx();
    renderer.drawCrystalBeacon(ctx, { x: 1500, y: 1500, hp: 100, maxHp: 100 }, cam, 1000, viewW, viewH);
    assert.equal(ctx.calls.length, 0, 'Far bottom-right crystal is culled');

    renderer.drawCrystalBeacon(ctx, { x: -300, y: -300, hp: 100, maxHp: 100 }, cam, 1000, viewW, viewH);
    assert.equal(ctx.calls.length, 0, 'Far top-left crystal is culled');
  }

  // Pedestals offscreen
  {
    const ctx = createMockCtx();
    renderer.drawPedestalBeams(ctx, [
      { x: 1500, y: 1500, socketed: true },
      { x: -300, y: -300, socketed: false },
    ], cam, 1000, viewW, viewH);
    assert.equal(ctx.calls.length, 0, 'Offscreen pedestals are culled');
  }

  // Siege lanes offscreen
  {
    const ctx = createMockCtx();
    renderer.drawSiegeLanes(ctx, [
      { x1: 1500, y1: 1500, x2: 1800, y2: 1800 },
      { x1: -500, y1: -500, x2: -300, y2: -300 },
    ], cam, 1000, viewW, viewH);
    assert.equal(ctx.calls.length, 0, 'Offscreen siege lanes are culled');
  }
}

// ============================================================================
// 8. STRICT ZERO SCREEN SHAKE: Frozen camera coordinates must never mutate
// ============================================================================
console.log('8. Testing STRICT ZERO SCREEN SHAKE with Object.freeze(cam)...');
{
  const renderer = createStrongholdRenderer();
  const frozenCam = Object.freeze({ x: 300, y: 200 });
  const ctx = createMockCtx();

  const crystal = { x: 350, y: 250, hp: 500, maxHp: 1000, siegeActive: true };
  const pedestals = [
    { x: 320, y: 220, socketed: true, color: '#ff5722' },
    { x: 340, y: 240, socketed: false },
  ];
  const lanes = [{ x1: 200, y1: 150, x2: 400, y2: 300 }];

  assert.doesNotThrow(() => {
    renderer.drawCrystalBeacon(ctx, crystal, frozenCam, 1000);
    renderer.drawPedestalBeams(ctx, pedestals, frozenCam, 1000);
    renderer.drawSiegeLanes(ctx, lanes, frozenCam, 1000);
  }, 'Renderer never mutates frozen camera object (strict 0 shake)');

  assert.equal(frozenCam.x, 300, 'frozenCam.x remains untouched');
  assert.equal(frozenCam.y, 200, 'frozenCam.y remains untouched');
}

// ============================================================================
// 9. Particle kinematics and updateFx
// ============================================================================
console.log('9. Testing updateFx particle lifecycle...');
{
  const renderer = createStrongholdRenderer();
  assert.doesNotThrow(() => {
    renderer.updateFx(0.016);
    renderer.updateFx(1.0);
  }, 'updateFx runs cleanly');
}

console.log('✔ All Stronghold FX unit tests passed successfully.');
