// js/spire-fx.test.js
// Unit tests for Abyssal Spire Visual Effects, Affix Particles & Zero-Shake Renderer.

import assert from 'node:assert/strict';
import { createSpireRenderer } from './render/spire-fx.js';

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
    });
  };

  return {
    calls,
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
    measureText: () => ({ width: 60 }),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: 'left',
  };
}

// ============================================================================
// 1. createSpireRenderer initializes all renderer methods
// ============================================================================
console.log('Testing createSpireRenderer initialization...');
{
  const renderer = createSpireRenderer();
  assert.equal(typeof renderer.drawSpireAffixFx, 'function', 'drawSpireAffixFx is a function');
  assert.equal(typeof renderer.drawAscendancePortal, 'function', 'drawAscendancePortal is a function');
  assert.equal(typeof renderer.drawMilestoneBossFanfare, 'function', 'drawMilestoneBossFanfare is a function');
  assert.equal(typeof renderer.drawGravitonVortex, 'function', 'drawGravitonVortex is a function');
  assert.equal(typeof renderer.triggerClearPortal, 'function', 'triggerClearPortal is a function');
  assert.equal(typeof renderer.updateFx, 'function', 'updateFx is a function');
}

// ============================================================================
// 2. drawSpireAffixFx renders magma surge, glacial chill, sunder mist, graviton well, chrono haste
// ============================================================================
console.log('Testing drawSpireAffixFx...');
{
  const renderer = createSpireRenderer();
  const cam = { x: 100, y: 100 };

  // Null & empty guards
  const emptyCtx = createMockCtx();
  renderer.drawSpireAffixFx(null, [{ id: 'magma_surge' }], cam);
  renderer.drawSpireAffixFx(emptyCtx, null, cam);
  renderer.drawSpireAffixFx(emptyCtx, [], cam);
  renderer.drawSpireAffixFx(emptyCtx, [{ id: 'magma_surge' }], null);
  assert.equal(emptyCtx.calls.length, 0, 'No calls when params are missing or empty');

  // Magma surge: 12-16 fiery cinder/ember particles (orange/red/yellow: #ff7043, #ffb74d, #e65100)
  {
    const ctx = createMockCtx();
    renderer.drawSpireAffixFx(ctx, [{ id: 'magma_surge' }], cam, 1000);
    assert.ok(ctx.calls.length >= 12, 'Magma surge renders at least 12 particles');
    const colors = ctx.calls.map(c => c.fillStyle).filter(Boolean);
    assert.ok(colors.some(c => c === '#ff7043' || c === '#ffb74d' || c === '#e65100'), 'Magma surge uses fire palette');
  }

  // Glacial chill: 12-16 drifting frosted snowflakes/hex crystals (cyan/white: #80d8ff, #e0f7fa)
  {
    const ctx = createMockCtx();
    renderer.drawSpireAffixFx(ctx, [{ id: 'glacial_chill' }], cam, 1000);
    assert.ok(ctx.calls.length >= 12, 'Glacial chill renders at least 12 snowflakes/hex crystals');
    const colors = ctx.calls.map(c => c.fillStyle || c.strokeStyle).filter(Boolean);
    assert.ok(colors.some(c => c === '#80d8ff' || c === '#e0f7fa'), 'Glacial chill uses frosty cyan/white palette');
  }

  // Sunder mist: soft translucent lilac ambient haze patches ('rgba(171, 71, 188, 0.12)')
  {
    const ctx = createMockCtx();
    renderer.drawSpireAffixFx(ctx, [{ id: 'sunder_mist' }], cam, 1000);
    assert.ok(ctx.calls.length > 0, 'Sunder mist renders haze');
    const colors = ctx.calls.map(c => c.fillStyle).filter(Boolean);
    assert.ok(colors.includes('rgba(171, 71, 188, 0.12)'), 'Sunder mist uses translucent lilac haze fill');
  }

  // Graviton well: rotating concentric ellipse rings pulling toward center
  {
    const ctx = createMockCtx();
    renderer.drawSpireAffixFx(ctx, [{ id: 'graviton_well' }], cam, 1000, 832, 576);
    assert.ok(ctx.calls.length > 0, 'Graviton well renders rings');
    assert.ok(ctx.calls.some(c => c.name === 'arc' || c.name === 'ellipse'), 'Graviton well draws ellipse/arc rings');
  }

  // Chrono haste: 8-12 sparkling golden speed lines or motes (#ffd54f, #fff59d)
  {
    const ctx = createMockCtx();
    renderer.drawSpireAffixFx(ctx, [{ id: 'chrono_haste' }], cam, 1000);
    assert.ok(ctx.calls.length >= 8, 'Chrono haste renders at least 8 speed lines or motes');
    const colors = ctx.calls.map(c => c.fillStyle || c.strokeStyle).filter(Boolean);
    assert.ok(colors.some(c => c === '#ffd54f' || c === '#fff59d'), 'Chrono haste uses golden palette');
  }

  // Combined affixes: dual affix roll
  {
    const ctx = createMockCtx();
    renderer.drawSpireAffixFx(ctx, [{ id: 'magma_surge' }, { id: 'sunder_mist' }], cam, 1000);
    const colors = ctx.calls.map(c => c.fillStyle).filter(Boolean);
    assert.ok(colors.some(c => c === '#ff7043' || c === '#ffb74d' || c === '#e65100'), 'Draws magma particles');
    assert.ok(colors.includes('rgba(171, 71, 188, 0.12)'), 'Draws sunder mist haze');
  }
}

// ============================================================================
// 3. drawAscendancePortal renders expanding concentric portal rings and label
// ============================================================================
console.log('Testing drawAscendancePortal...');
{
  const mockT = (text) => `[${text}]`;
  const renderer = createSpireRenderer({ T: mockT });
  const cam = { x: 200, y: 150 };
  const portalPos = { x: 500, y: 400 };

  const ctx = createMockCtx();
  renderer.drawAscendancePortal(ctx, portalPos, cam, 1200, 832, 576);

  assert.ok(ctx.calls.length > 5, 'Portal draws multiple canvas elements');
  // Concentric expanding stroke rings (radius 24 to 36, strokeStyle #ab47bc / #e1bee7, lineWidth 2)
  const ringStrokes = ctx.calls.filter(c => c.strokeStyle === '#ab47bc' || c.strokeStyle === '#e1bee7');
  assert.ok(ringStrokes.length > 0, 'Draws expanding portal rings with #ab47bc or #e1bee7');
  assert.ok(ringStrokes.some(c => c.lineWidth === 2), 'Portal ring lineWidth is 2');

  // Central glowing cosmic void ellipse ('rgba(33, 33, 33, 0.85)')
  const voidFills = ctx.calls.filter(c => c.fillStyle === 'rgba(33, 33, 33, 0.85)');
  assert.ok(voidFills.length > 0, 'Draws cosmic void ellipse with rgba(33, 33, 33, 0.85)');

  // Text label: '🌀 ' + T('Ascendance Portal', 'ui')
  const labelCalls = ctx.calls.filter(c => c.name === 'fillText');
  assert.ok(labelCalls.length > 0, 'Draws portal label text');
  assert.ok(labelCalls.some(c => c.args[0] === '🌀 [Ascendance Portal]' && c.font === 'bold 10px sans-serif' && c.fillStyle === '#ffffff'),
    'Label contains portal icon, translated name, bold 10px font, and white fill');
}

// ============================================================================
// 4. drawMilestoneBossFanfare draws boss warning crest and pulsating warning ring
// ============================================================================
console.log('Testing drawMilestoneBossFanfare...');
{
  const renderer = createSpireRenderer();
  const cam = { x: 200, y: 150 };
  const boss = { x: 500, y: 350, radius: 32 };

  const ctx = createMockCtx();
  renderer.drawMilestoneBossFanfare(ctx, boss, cam, 2000, 832, 576);

  assert.ok(ctx.calls.length > 0, 'Fanfare draws canvas elements');

  // Pulsating red/gold warning crest: text '☠ MILESTONE BOSS' (font: 'bold 11px sans-serif', fillStyle: '#ff5252')
  const fanfareText = ctx.calls.find(c => c.name === 'fillText' && c.args[0] === '☠ MILESTONE BOSS');
  assert.ok(fanfareText, 'Draws ☠ MILESTONE BOSS warning crest');
  assert.equal(fanfareText.font, 'bold 11px sans-serif', 'Warning crest font is bold 11px sans-serif');
  assert.equal(fanfareText.fillStyle, '#ff5252', 'Warning crest fillStyle is #ff5252');

  // Pulsating outer ring with radius ~ 48px, strokeStyle = 'rgba(255, 82, 82, 0.6)'
  const warningRings = ctx.calls.filter(c => c.strokeStyle === 'rgba(255, 82, 82, 0.6)');
  assert.ok(warningRings.length > 0, 'Draws pulsating outer warning ring with rgba(255, 82, 82, 0.6)');
  const ringArcs = ctx.calls.filter(c => c.name === 'arc' && Math.abs(c.args[2] - 48) <= 8);
  assert.ok(ringArcs.length > 0, 'Warning ring radius is ~48px');
}

// ============================================================================
// 5. drawGravitonVortex draws inward vortex arcs
// ============================================================================
console.log('Testing drawGravitonVortex...');
{
  const renderer = createSpireRenderer();
  const cam = { x: 100, y: 100 };
  const ctx = createMockCtx();

  renderer.drawGravitonVortex(ctx, 400, 300, cam, 3000);
  assert.ok(ctx.calls.length > 0, 'Vortex draws elements');
  assert.ok(ctx.calls.some(c => c.name === 'beginPath'), 'Vortex calls beginPath');
  assert.ok(ctx.calls.some(c => c.name === 'stroke' || c.name === 'fill'), 'Vortex strokes or fills arcs');
}

// ============================================================================
// 6. Offscreen culling: skips drawing entities located outside the viewport
// ============================================================================
console.log('Testing offscreen culling...');
{
  const renderer = createSpireRenderer();
  const cam = { x: 0, y: 0 };
  const viewW = 832;
  const viewH = 576;

  // Ascendance portal far outside viewport
  {
    const ctx = createMockCtx();
    renderer.drawAscendancePortal(ctx, { x: 1500, y: 1500 }, cam, 1000, viewW, viewH);
    assert.equal(ctx.calls.length, 0, 'Far right-down portal is culled');

    renderer.drawAscendancePortal(ctx, { x: -200, y: -200 }, cam, 1000, viewW, viewH);
    assert.equal(ctx.calls.length, 0, 'Far left-up portal is culled');
  }

  // Milestone boss fanfare far outside viewport
  {
    const ctx = createMockCtx();
    renderer.drawMilestoneBossFanfare(ctx, { x: 2000, y: 2000 }, cam, 1000, viewW, viewH);
    assert.equal(ctx.calls.length, 0, 'Far right-down boss is culled');

    renderer.drawMilestoneBossFanfare(ctx, { x: -300, y: -300 }, cam, 1000, viewW, viewH);
    assert.equal(ctx.calls.length, 0, 'Far left-up boss is culled');
  }
}

// ============================================================================
// 7. STRICT ZERO SCREEN SHAKE: Frozen camera coordinates must never mutate
// ============================================================================
console.log('Testing STRICT ZERO SCREEN SHAKE with Object.freeze(cam)...');
{
  const renderer = createSpireRenderer();
  const frozenCam = Object.freeze({ x: 300, y: 200 });
  const ctx = createMockCtx();

  // Draw calls should execute without error despite frozen cam
  assert.doesNotThrow(() => {
    renderer.drawSpireAffixFx(ctx, [{ id: 'magma_surge' }, { id: 'graviton_well' }], frozenCam, 1000);
    renderer.drawAscendancePortal(ctx, { x: 350, y: 250 }, frozenCam, 1000);
    renderer.drawMilestoneBossFanfare(ctx, { x: 350, y: 250 }, frozenCam, 1000);
    renderer.drawGravitonVortex(ctx, 350, 250, frozenCam, 1000);
  }, 'Renderer never mutates frozen camera object (strict 0 shake)');

  assert.equal(frozenCam.x, 300, 'frozenCam.x remains untouched');
  assert.equal(frozenCam.y, 200, 'frozenCam.y remains untouched');
}

// ============================================================================
// 8. Particle lifecycle: triggerClearPortal and updateFx
// ============================================================================
console.log('Testing triggerClearPortal and updateFx...');
{
  const renderer = createSpireRenderer();
  assert.doesNotThrow(() => {
    renderer.triggerClearPortal(400, 300);
    renderer.updateFx(0.016);
    renderer.updateFx(1.0);
  }, 'triggerClearPortal and updateFx execute cleanly');
}

console.log('✔ All Abyssal Spire renderer unit tests passed.');
