// js/homestead-fx.test.js
// Unit tests for Homestead Canvas 2D Visual Effects & Zero-Shake Renderer.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHomesteadRenderer } from './render/homestead-fx.js';

function createMockCtx() {
  const calls = [];
  const gradientStops = [];

  const record = (name) => function (...args) {
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
    ellipse: record('ellipse'),
    stroke: record('stroke'),
    fill: record('fill'),
    fillRect: record('fillRect'),
    strokeRect: record('strokeRect'),
    fillText: record('fillText'),
    lineTo: record('lineTo'),
    moveTo: record('moveTo'),
    measureText: () => ({ width: 50 }),
    createRadialGradient: function (...args) {
      record('createRadialGradient').apply(this, args);
      return createGradientMock('radial', args);
    },
    createLinearGradient: function (...args) {
      record('createLinearGradient').apply(this, args);
      return createGradientMock('linear', args);
    },
  };

  return { ctx, calls, gradientStops };
}

test('homestead-fx: initializes renderer methods', () => {
  const fx = createHomesteadRenderer();
  assert.equal(typeof fx.drawCropPlots, 'function');
  assert.equal(typeof fx.drawPasturePets, 'function');
  assert.equal(typeof fx.drawHearthFire, 'function');
  assert.equal(typeof fx.drawMannequins, 'function');
  assert.equal(typeof fx.updateFx, 'function');
  assert.equal(typeof fx.triggerPetHearts, 'function');
});

test('homestead-fx: renders crop plots across growth stages and watering state', () => {
  const fx = createHomesteadRenderer();
  const { ctx, calls } = createMockCtx();
  const cam = { x: 100, y: 100 };

  const plots = [
    { id: 0, x: 160, y: 416, stage: 0, cropId: null, watered: false },
    { id: 1, x: 224, y: 416, stage: 1, cropId: 'seed_silverleaf', watered: true },
    { id: 2, x: 288, y: 416, stage: 2, cropId: 'seed_golden_wheat', watered: false },
    { id: 3, x: 352, y: 416, stage: 3, cropId: 'seed_moonflower', watered: true },
    { id: 4, x: 416, y: 416, stage: 3, cropId: 'seed_ember_blossom', watered: false },
  ];

  fx.drawCropPlots(ctx, plots, cam, 1000, 832, 576);

  assert.ok(calls.some(c => c.name === 'fillRect'), 'Draws plot soil rectangles');
  assert.ok(calls.some(c => c.name === 'fill' || c.name === 'stroke'), 'Draws plant stems or petals');
});

test('homestead-fx: renders pasture roaming pets and petting hearts', () => {
  const fx = createHomesteadRenderer();
  const { ctx, calls } = createMockCtx();
  const cam = { x: 0, y: 0 };

  const pets = [
    { id: 'slime_pet', x: 550, y: 200, loyalty: 50 },
    { id: 'wolf_pet', x: 600, y: 250, loyalty: 30 },
  ];

  fx.triggerPetHearts(550, 200);
  fx.updateFx(100);
  fx.drawPasturePets(ctx, pets, cam, 1000, 832, 576);

  assert.ok(calls.some(c => c.name === 'save'), 'Uses canvas state saving');
  assert.ok(calls.some(c => c.name === 'restore'), 'Uses canvas state restoration');
});

test('homestead-fx: renders cozy hearth warmth gradient and flames', () => {
  const fx = createHomesteadRenderer();
  const { ctx, calls, gradientStops } = createMockCtx();
  const cam = { x: 0, y: 0 };
  const hearth = { x: 192, y: 128 };

  fx.drawHearthFire(ctx, hearth, cam, 1000, 832, 576);

  assert.ok(calls.some(c => c.name === 'createRadialGradient'), 'Creates hearth warmth radial gradient');
  assert.ok(gradientStops.length > 0, 'Adds warmth gradient color stops');
});

test('homestead-fx: renders armory mannequins with equipment stands', () => {
  const fx = createHomesteadRenderer();
  const { ctx, calls } = createMockCtx();
  const cam = { x: 0, y: 0 };
  const mannequins = [
    { id: 'mannequin_a', x: 256, y: 128, loadout: { weapon: { id: 'spire_blade' }, head: { id: 'iron_helm' } } },
    { id: 'mannequin_b', x: 320, y: 128, loadout: { weapon: null } },
  ];

  fx.drawMannequins(ctx, mannequins, cam, 1000, 832, 576);

  assert.ok(calls.some(c => c.name === 'fillRect'), 'Draws wooden stand pedestal');
  assert.ok(calls.some(c => c.name === 'fillText'), 'Draws mannequin label');
});

test('homestead-fx: offscreen culling skips entities outside viewport', () => {
  const fx = createHomesteadRenderer();
  const { ctx, calls } = createMockCtx();
  const cam = { x: 0, y: 0 };

  const farPlots = [{ id: 99, x: 5000, y: 5000, stage: 1, cropId: 'seed_silverleaf' }];
  const farPets = [{ id: 'far_pet', x: -2000, y: -2000 }];
  const farHearth = { x: 9999, y: 9999 };
  const farMannequins = [{ id: 'far_man', x: 8888, y: 8888, loadout: {} }];

  fx.drawCropPlots(ctx, farPlots, cam, 1000, 832, 576);
  fx.drawPasturePets(ctx, farPets, cam, 1000, 832, 576);
  fx.drawHearthFire(ctx, farHearth, cam, 1000, 832, 576);
  fx.drawMannequins(ctx, farMannequins, cam, 1000, 832, 576);

  assert.equal(calls.length, 0, 'No drawing calls made for out-of-bounds entities');
});

test('homestead-fx: STRICT ZERO SCREEN SHAKE - cam.x and cam.y are never modified', () => {
  const fx = createHomesteadRenderer();
  const { ctx } = createMockCtx();

  // Freeze camera object to strictly prevent and detect any property modification
  const frozenCam = Object.freeze({ x: 320, y: 240 });

  const plots = [{ id: 0, x: 320, y: 240, stage: 3, cropId: 'seed_silverleaf', watered: true }];
  const pets = [{ id: 'pet_slime', x: 350, y: 260, loyalty: 50 }];
  const hearth = { x: 320, y: 240 };
  const mannequins = [{ id: 'mannequin_a', x: 340, y: 240, loadout: {} }];

  assert.doesNotThrow(() => {
    fx.drawCropPlots(ctx, plots, frozenCam, 2000, 832, 576);
    fx.drawPasturePets(ctx, pets, frozenCam, 2000, 832, 576);
    fx.drawHearthFire(ctx, hearth, frozenCam, 2000, 832, 576);
    fx.drawMannequins(ctx, mannequins, frozenCam, 2000, 832, 576);
  });

  assert.equal(frozenCam.x, 320);
  assert.equal(frozenCam.y, 240);
});
