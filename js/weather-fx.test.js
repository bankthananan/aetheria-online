import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createWeatherRenderer } from './render/weather-fx.js';

function createMockCtx() {
  const operations = [];
  return {
    operations,
    save: () => operations.push('save'),
    restore: () => operations.push('restore'),
    fillRect: (...args) => operations.push(['fillRect', ...args]),
    beginPath: () => operations.push('beginPath'),
    moveTo: (...args) => operations.push(['moveTo', ...args]),
    lineTo: (...args) => operations.push(['lineTo', ...args]),
    stroke: () => operations.push('stroke'),
    fill: () => operations.push('fill'),
    arc: (...args) => operations.push(['arc', ...args]),
    set fillStyle(val) { operations.push(['fillStyle', val]); },
    set strokeStyle(val) { operations.push(['strokeStyle', val]); },
    set lineWidth(val) { operations.push(['lineWidth', val]); },
    set globalAlpha(val) { operations.push(['globalAlpha', val]); },
    // Specifically ensure NO shake/translate is called
    translate: (...args) => { throw new Error(`Unexpected translate called in weather renderer: ${args}`); },
    rotate: (...args) => { throw new Error(`Unexpected rotate called in weather renderer: ${args}`); },
  };
}

test('weather-fx: initializes renderer and handles clear weather gracefully', () => {
  const ctx = createMockCtx();
  const renderer = createWeatherRenderer({
    getCtx: () => ctx,
    now: () => 1000,
    CANVAS_W: 832,
    CANVAS_H: 576,
  });

  renderer.drawWeather('whispering_woods', { id: 'clear' });
  // Clear weather does not spawn heavy particle storms
  assert.ok(true);
});

test('weather-fx: draws rain streaks without screen shake', () => {
  const ctx = createMockCtx();
  const renderer = createWeatherRenderer({
    getCtx: () => ctx,
    now: () => 1000,
    CANVAS_W: 832,
    CANVAS_H: 576,
  });

  renderer.drawWeather('whispering_woods', { id: 'verdant_rain' });
  const strokes = ctx.operations.filter(op => op === 'stroke' || (Array.isArray(op) && op[0] === 'lineTo'));
  assert.ok(strokes.length > 0, 'Rain should draw diagonal streak strokes');
});

test('weather-fx: draws blizzard snowflakes without screen shake', () => {
  const ctx = createMockCtx();
  const renderer = createWeatherRenderer({
    getCtx: () => ctx,
    now: () => 1000,
    CANVAS_W: 832,
    CANVAS_H: 576,
  });

  renderer.drawWeather('frostpeak_tundra', { id: 'biting_blizzard' });
  const rects = ctx.operations.filter(op => Array.isArray(op) && op[0] === 'fillRect');
  assert.ok(rects.length > 0, 'Blizzard should draw falling snow particles');
});

test('weather-fx: draws ashfall embers in dragon caldera', () => {
  const ctx = createMockCtx();
  const renderer = createWeatherRenderer({
    getCtx: () => ctx,
    now: () => 1000,
    CANVAS_W: 832,
    CANVAS_H: 576,
  });

  renderer.drawWeather('dragon_caldera', { id: 'ashfall' });
  const rects = ctx.operations.filter(op => Array.isArray(op) && op[0] === 'fillRect');
  assert.ok(rects.length > 0, 'Ashfall should draw falling ash and ember particles');
});

test('weather-fx: respects prefersReducedMotion', () => {
  let reduced = false;
  const ctx = createMockCtx();
  const renderer = createWeatherRenderer({
    getCtx: () => ctx,
    now: () => 1000,
    prefersReducedMotion: () => reduced,
    CANVAS_W: 832,
    CANVAS_H: 576,
  });

  renderer.drawWeather('whispering_woods', { id: 'verdant_rain' });
  const opsNormal = ctx.operations.length;

  ctx.operations.length = 0;
  reduced = true;
  renderer.drawWeather('whispering_woods', { id: 'verdant_rain' });
  const opsReduced = ctx.operations.length;

  assert.ok(opsReduced <= opsNormal, 'Reduced motion should execute fewer or equal draw operations');
});
