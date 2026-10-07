// js/raids-fx.test.js
// Unit tests for Canvas 2D Visual Effects, Geometric Telegraphs & Zero-Shake Renderer.

import assert from 'node:assert/strict';
import {
  createRaidsRenderer,
  drawOrientedBoxTelegraph,
  drawConeTelegraph,
  drawCircleTelegraph,
  createTelegraph,
} from './render/raids-fx.js';

function createMockCtx() {
  const calls = [];
  const record = (name) => function (...args) {
    calls.push({
      name,
      args,
      fillStyle: this.fillStyle,
      strokeStyle: this.strokeStyle,
      lineWidth: this.lineWidth,
      globalAlpha: this.globalAlpha,
      font: this.font,
    });
  };

  return {
    calls,
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
    rect: record('rect'),
    setLineDash: record('setLineDash'),
    measureText: () => ({ width: 40 }),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    globalAlpha: 1,
    font: '',
    textAlign: 'left',
    textBaseline: 'alphabetic',
  };
}

// ============================================================================
// 1. createRaidsRenderer initializes all renderer methods
// ============================================================================
console.log('Testing createRaidsRenderer initialization...');
const renderer = createRaidsRenderer();
assert.equal(typeof renderer.drawBossAura, 'function', 'drawBossAura is a function');
assert.equal(typeof renderer.drawAegisBarrier, 'function', 'drawAegisBarrier is a function');
assert.equal(typeof renderer.drawBreakGauge, 'function', 'drawBreakGauge is a function');
assert.equal(typeof renderer.drawTelegraphs, 'function', 'drawTelegraphs is a function');
assert.equal(typeof renderer.drawStaggerBursts, 'function', 'drawStaggerBursts is a function');
assert.equal(typeof renderer.triggerStaggerBurst, 'function', 'triggerStaggerBurst is a function');
assert.equal(typeof renderer.addTelegraph, 'function', 'addTelegraph is a function');
assert.equal(typeof renderer.updateFx, 'function', 'updateFx is a function');

assert.equal(typeof drawOrientedBoxTelegraph, 'function', 'drawOrientedBoxTelegraph is exported');
assert.equal(typeof drawConeTelegraph, 'function', 'drawConeTelegraph is exported');
assert.equal(typeof drawCircleTelegraph, 'function', 'drawCircleTelegraph is exported');
assert.equal(typeof createTelegraph, 'function', 'createTelegraph is exported');

// ============================================================================
// 2. drawBossAura renders elemental rune circles for void, fire, nature, default
// ============================================================================
console.log('Testing drawBossAura elemental rune circles...');
const cam = { x: 200, y: 150 };

// Void boss
{
  const ctx = createMockCtx();
  const boss = { x: 300, y: 250, element: 'void' };
  renderer.drawBossAura(ctx, boss, cam, 1000);
  assert.ok(ctx.calls.length > 5, 'Draw calls made for void boss aura');
  assert.ok(
    ctx.calls.some((c) => c.strokeStyle === '#9c27b0' || c.strokeStyle === '#ba68c8'),
    'Void palette colors used for stroke'
  );
}

// Fire boss
{
  const ctx = createMockCtx();
  const boss = { x: 300, y: 250, element: 'fire' };
  renderer.drawBossAura(ctx, boss, cam, 1000);
  assert.ok(ctx.calls.length > 5, 'Draw calls made for fire boss aura');
  assert.ok(
    ctx.calls.some((c) => c.strokeStyle === '#e65100' || c.strokeStyle === '#ff9800'),
    'Fire palette colors used for stroke'
  );
}

// Nature boss
{
  const ctx = createMockCtx();
  const boss = { x: 300, y: 250, bossDef: { element: 'nature' } };
  renderer.drawBossAura(ctx, boss, cam, 1000);
  assert.ok(ctx.calls.length > 5, 'Draw calls made for nature boss aura');
  assert.ok(
    ctx.calls.some((c) => c.strokeStyle === '#2e7d32' || c.strokeStyle === '#81c784'),
    'Nature palette colors used for stroke'
  );
}

// Default palette fallback
{
  const ctx = createMockCtx();
  const boss = { x: 300, y: 250 };
  renderer.drawBossAura(ctx, boss, cam, 1000);
  assert.ok(ctx.calls.length > 5, 'Draw calls made for default boss aura');
  assert.ok(
    ctx.calls.some((c) => c.strokeStyle === '#00e5ff' || c.strokeStyle === '#80d8ff'),
    'Default cyan palette used'
  );
}

// ============================================================================
// 3. drawBossAura renders enraged corona and spark flares when enraged
// ============================================================================
console.log('Testing drawBossAura enraged corona and spires...');
{
  const ctxNormal = createMockCtx();
  const bossNormal = { x: 300, y: 250, element: 'fire', enraged: false };
  renderer.drawBossAura(ctxNormal, bossNormal, cam, 1000);

  const ctxEnraged = createMockCtx();
  const bossEnraged = { x: 300, y: 250, element: 'fire', enraged: true };
  renderer.drawBossAura(ctxEnraged, bossEnraged, cam, 1000);

  assert.ok(
    ctxEnraged.calls.length > ctxNormal.calls.length,
    'Enraged boss aura renders additional spires, flares, and orbiting sparks'
  );
}

// ============================================================================
// 4. drawAegisBarrier draws 6-sided hexagonal dome around boss
// ============================================================================
console.log('Testing drawAegisBarrier hexagonal dome...');
{
  const ctx = createMockCtx();
  const boss = { x: 300, y: 250 };
  renderer.drawAegisBarrier(ctx, boss, cam, 1000);

  assert.ok(ctx.calls.length > 0, 'Aegis barrier renders');
  assert.ok(
    ctx.calls.some((c) => c.strokeStyle === '#84ffff'),
    'Uses #84ffff stroke for aegis hex'
  );
  assert.ok(
    ctx.calls.some((c) => c.fillStyle === 'rgba(0, 229, 255, 0.18)'),
    'Uses rgba(0, 229, 255, 0.18) fill for aegis hex'
  );
  const lineTos = ctx.calls.filter((c) => c.name === 'lineTo');
  assert.ok(lineTos.length >= 5, 'Contains at least 5 lineTo vertex segments for 6-sided hex');
  assert.ok(ctx.calls.some((c) => c.name === 'closePath'), 'Hex closes path');
}

// ============================================================================
// 5. drawBreakGauge renders shield bar, text, and add mitigation indicator
// ============================================================================
console.log('Testing drawBreakGauge shield bar and mitigation badge...');
{
  const ctx = createMockCtx();
  const raidState = {
    x: 400,
    y: 300,
    breakShield: 5000,
    maxBreakShield: 8000,
    adds: [
      { id: 'magma_beetle', index: 0, alive: true },
      { id: 'ember_imp', index: 1, alive: true },
    ],
  };

  renderer.drawBreakGauge(ctx, raidState, cam, 1000);

  // Background rect and fill rect
  assert.ok(
    ctx.calls.some((c) => c.name === 'fillRect' && c.fillStyle === 'rgba(15, 12, 24, 0.85)'),
    'Draws dark backing fill rect'
  );
  assert.ok(
    ctx.calls.some((c) => c.name === 'strokeRect' && c.strokeStyle === '#ffeb3b'),
    'Draws yellow stroke rect border'
  );
  assert.ok(
    ctx.calls.some((c) => c.name === 'fillRect' && c.fillStyle === '#00e5ff'),
    'Draws cyan shield gauge bar'
  );

  // Shield text
  const textCalls = ctx.calls.filter((c) => c.name === 'fillText');
  assert.ok(textCalls.length >= 2, 'Renders gauge text and mitigation indicator');
  assert.ok(
    textCalls.some((c) => c.args[0].includes('🛡 5000 / 8000')),
    'Shield bar text displays correct values'
  );
  // Add mitigation: 2 alive adds -> 2 * 15% = 30% resistance
  assert.ok(
    textCalls.some((c) => c.args[0].includes('30%') || c.args[0].includes('RES')),
    'Mitigation badge indicates add resistance bonus'
  );

  // When shield <= 0, no break gauge is rendered
  const ctxEmpty = createMockCtx();
  renderer.drawBreakGauge(ctxEmpty, { ...raidState, breakShield: 0 }, cam, 1000);
  assert.equal(ctxEmpty.calls.length, 0, 'No break gauge drawn if breakShield is 0');
}

// ============================================================================
// 6. drawTelegraphs renders box/fissure, cone/breath, and circle/cataclysm
// ============================================================================
console.log('Testing drawTelegraphs geometric shapes...');
{
  const ctx = createMockCtx();
  const telegraphs = [
    createTelegraph('box', { ox: 300, oy: 200, tx: 400, ty: 200, len: 100, width: 30, progress: 0.5 }),
    createTelegraph('fissure', { ox: 350, oy: 250, tx: 350, ty: 400, len: 150, width: 40, progress: 0.7 }),
    createTelegraph('cone', { ox: 300, oy: 200, angle: 0, radius: 80, fov: Math.PI / 3, progress: 0.4 }),
    createTelegraph('breath', { ox: 300, oy: 200, angle: Math.PI, radius: 90, fov: Math.PI / 2, progress: 0.6 }),
    createTelegraph('circle', { ox: 300, oy: 200, radius: 60, progress: 0.3 }),
    createTelegraph('cataclysm', { ox: 300, oy: 200, radius: 75, progress: 0.8 }),
  ];

  renderer.drawTelegraphs(ctx, telegraphs, cam, 1000);
  assert.ok(ctx.calls.length > 20, 'Draws all telegraph geometries');
  assert.ok(ctx.calls.some((c) => c.name === 'arc'), 'Circle/cone telegraphs draw arcs');
  assert.ok(ctx.calls.some((c) => c.name === 'lineTo'), 'Box telegraphs draw lines');
}

// ============================================================================
// 7. triggerStaggerBurst and drawStaggerBursts spawn, move, and draw particles
// ============================================================================
console.log('Testing triggerStaggerBurst, particle movement and rendering...');
{
  const testRenderer = createRaidsRenderer();
  testRenderer.triggerStaggerBurst(400, 300, 24);

  const ctx = createMockCtx();
  testRenderer.drawStaggerBursts(ctx, null, cam, 1000);
  assert.ok(ctx.calls.length > 20, 'Draws burst diamond particles');
  assert.ok(
    ctx.calls.some((c) => ['#ffd54f', '#00e5ff', '#ffffff'].includes(c.fillStyle)),
    'Uses burst palette colors'
  );

  // Update dt: particles move
  testRenderer.updateFx(0.1);

  // After long dt: all particles expire and are pruned
  testRenderer.updateFx(3.0);
  const ctxEmpty = createMockCtx();
  testRenderer.drawStaggerBursts(ctxEmpty, null, cam, 1000);
  assert.equal(ctxEmpty.calls.length, 0, 'Expired particles are pruned');
}

// ============================================================================
// 8. Offscreen culling: skip drawing when boss is outside viewport
// ============================================================================
console.log('Testing offscreen culling...');
{
  const ctx = createMockCtx();
  const farBoss = { x: -600, y: -600 };
  renderer.drawBossAura(ctx, farBoss, { x: 0, y: 0 }, 1000, 832, 576);
  renderer.drawAegisBarrier(ctx, farBoss, { x: 0, y: 0 }, 1000, 832, 576);
  assert.equal(ctx.calls.length, 0, 'Offscreen boss draws zero elements (culled)');

  const farBoss2 = { x: 1200, y: 1200 };
  renderer.drawBossAura(ctx, farBoss2, { x: 0, y: 0 }, 1000, 832, 576);
  renderer.drawAegisBarrier(ctx, farBoss2, { x: 0, y: 0 }, 1000, 832, 576);
  assert.equal(ctx.calls.length, 0, 'Far positive offscreen boss draws zero elements (culled)');
}

// ============================================================================
// 9. STRICT ZERO SCREEN SHAKE: Freeze camera and verify no mutations
// ============================================================================
console.log('Testing STRICT ZERO SCREEN SHAKE camera invariants...');
{
  const frozenCam = Object.freeze({ x: 400, y: 300 });
  const boss = Object.freeze({ x: 450, y: 350, element: 'fire', enraged: true });
  const raidState = Object.freeze({
    x: 450,
    y: 350,
    breakShield: 5000,
    maxBreakShield: 8000,
    adds: Object.freeze([{ id: 'magma_beetle', index: 0, alive: true }]),
  });
  const telegraphs = [
    createTelegraph('box', { ox: 450, oy: 350, tx: 550, ty: 350, len: 100, width: 30, progress: 0.5 }),
    createTelegraph('cone', { ox: 450, oy: 350, angle: 0, radius: 80, fov: Math.PI / 3, progress: 0.4 }),
    createTelegraph('circle', { ox: 450, oy: 350, radius: 60, progress: 0.3 }),
  ];

  const shakeRenderer = createRaidsRenderer();
  shakeRenderer.triggerStaggerBurst(450, 350, 10);

  const ctx = createMockCtx();
  assert.doesNotThrow(() => {
    shakeRenderer.drawBossAura(ctx, boss, frozenCam, 1000);
    shakeRenderer.drawAegisBarrier(ctx, boss, frozenCam, 1000);
    shakeRenderer.drawBreakGauge(ctx, raidState, frozenCam, 1000);
    shakeRenderer.drawTelegraphs(ctx, telegraphs, frozenCam, 1000);
    shakeRenderer.drawStaggerBursts(ctx, null, frozenCam, 1000);
  }, 'Renderer must never mutate frozen camera object');

  assert.equal(frozenCam.x, 400, 'cam.x remains exactly 400');
  assert.equal(frozenCam.y, 300, 'cam.y remains exactly 300');
}

console.log('✔ All raids visual FX and zero-shake tests passed.');
