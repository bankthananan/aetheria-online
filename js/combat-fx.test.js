import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createCombatFx } from './render/combat-fx.js';

test('combat-fx: screen shake trauma accumulation and decay', () => {
  let currentTime = 1000;
  const fx = createCombatFx({
    getCtx: () => null,
    prefersReducedMotion: () => false,
    now: () => currentTime,
  });

  fx.addScreenShake(0.5);
  let offset = fx.getScreenShakeOffset();
  assert.ok(offset.x !== 0 || offset.y !== 0, 'Offset should be non-zero when trauma > 0');

  // Advance time by 1 second (decay rate 1.8/s should clear 0.5 trauma)
  currentTime += 1000;
  fx.update(1.0);
  offset = fx.getScreenShakeOffset();
  assert.equal(offset.x, 0, 'Offset should decay to 0');
  assert.equal(offset.y, 0, 'Offset should decay to 0');
});

test('combat-fx: reduced motion suppresses screen shake', () => {
  const fx = createCombatFx({
    getCtx: () => null,
    prefersReducedMotion: () => true,
    now: () => 1000,
  });

  fx.addScreenShake(1.0);
  const offset = fx.getScreenShakeOffset();
  assert.equal(offset.x, 0);
  assert.equal(offset.y, 0);
});

test('combat-fx: telegraph registration and expiration', () => {
  let currentTime = 2000;
  const fx = createCombatFx({
    getCtx: () => null,
    prefersReducedMotion: () => false,
    now: () => currentTime,
  });

  fx.addTelegraph({
    id: 'test_telegraph',
    kind: 'circle',
    x: 100,
    y: 100,
    radius: 32,
    durationMs: 500,
  });

  assert.equal(fx.getTelegraphs().length, 1);
  currentTime += 600;
  fx.update(0.6);
  assert.equal(fx.getTelegraphs().length, 0, 'Expired telegraph should be removed');
});

test('combat-fx: floatie tags formatting', () => {
  let currentTime = 3000;
  const fx = createCombatFx({
    getCtx: () => null,
    prefersReducedMotion: () => false,
    now: () => currentTime,
  });

  fx.addFloatText(50, 50, '150', 'crit', 'CRIT!');
  const list = fx.getFloaties();
  assert.equal(list.length, 1);
  assert.equal(list[0].tag, 'CRIT!');
  assert.equal(list[0].text, '150');
});
