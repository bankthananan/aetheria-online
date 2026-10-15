import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createCombatFx } from './render/combat-fx.js';

test('combat-fx: screen shake is disabled by default', () => {
  const fx = createCombatFx({
    getCtx: () => null,
    prefersReducedMotion: () => false,
    now: () => 1000,
  });

  fx.addScreenShake(1.0);
  const offset = fx.getScreenShakeOffset();
  assert.equal(offset.x, 0);
  assert.equal(offset.y, 0);
});

test('combat-fx: screen shake trauma accumulation and decay when explicitly enabled', () => {
  let currentTime = 1000;
  const fx = createCombatFx({
    getCtx: () => null,
    prefersReducedMotion: () => false,
    now: () => currentTime,
    enableScreenShake: true,
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

test('combat-fx: Tier IV Hybrid Ultimate VFX presets and triggers', () => {
  const fx = createCombatFx({
    getCtx: () => null,
    prefersReducedMotion: () => false,
    now: () => 1000,
  });

  const hybridSkills = [
    'eclipse_strike',
    'apocalypse_harvest',
    'orbital_strike_beacon',
    'colossal_onslaught',
    'elemental_strike',
    'arcane_arrow_barrage',
    'phalanx',
    'cyclone_lotus_kick',
    'tempest_sanctuary',
  ];

  for (const skillId of hybridSkills) {
    const preset = fx.HYBRID_FX_PRESETS[skillId];
    assert.ok(preset, `Preset missing for hybrid skill: ${skillId}`);
    assert.ok(preset.color.startsWith('#'), `Valid color expected for ${skillId}`);
    assert.ok(preset.secondaryColor.startsWith('#'), `Valid secondaryColor expected for ${skillId}`);
    assert.ok(preset.style, `Style expected for ${skillId}`);
    assert.ok(preset.label, `Label expected for ${skillId}`);

    const res = fx.triggerHybridVfx(skillId, 100, 100, 64);
    assert.equal(res, preset);
  }

  // Verify telegraphs were registered for styles with targeting indicators
  assert.ok(fx.getTelegraphs().length >= 3, 'Telegraphs should be spawned for orbital beam, nether sweep, and radial burst');

  // Verify strict ZERO camera shake on hybrid ultimate triggers
  const shake = fx.getScreenShakeOffset();
  assert.deepEqual(shake, { x: 0, y: 0, angle: 0 }, 'Screen shake must remain strictly zero on player hybrid skills');
});
