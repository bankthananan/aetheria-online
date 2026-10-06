import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  pointInCircle,
  pointInOrientedBox,
  pointInCone,
  createBossMechanics,
} from './systems/boss-mechanics.js';

test('boss-mechanics: pointInCircle collision', () => {
  assert.equal(pointInCircle(10, 10, 10, 10, 20), true);
  assert.equal(pointInCircle(35, 10, 10, 10, 20), false);
});

test('boss-mechanics: pointInOrientedBox collision', () => {
  // Origin (0, 0) towards Target (100, 0), length 100, width 40
  assert.equal(pointInOrientedBox(50, 10, 0, 0, 100, 0, 100, 40), true);
  assert.equal(pointInOrientedBox(50, 30, 0, 0, 100, 0, 100, 40), false); // out of width
  assert.equal(pointInOrientedBox(120, 0, 0, 0, 100, 0, 100, 40), false); // beyond length
});

test('boss-mechanics: pointInCone collision', () => {
  // Origin (0, 0) facing right (100, 0), radius 100, fov 60 deg (PI/3)
  assert.equal(pointInCone(50, 0, 0, 0, 100, 0, 100, Math.PI / 3), true);
  assert.equal(pointInCone(-20, 0, 0, 0, 100, 0, 100, Math.PI / 3), false); // behind
});

test('boss-mechanics: Ruin Golem creates seismic fissure telegraph', () => {
  let telegraphCreated = null;
  const mechanics = createBossMechanics();

  const mockMonster = {
    def: { id: 'ruin_golem', name: 'Ruin Golem', sizeTiles: 2 },
    x: 100,
    y: 100,
    hp: 1000,
    maxHp: 1000,
    atk: 50,
    atkBase: 50,
    lastCombatAt: 5000,
    nextSlamAt: 4000,
  };
  const mockPlayer = { x: 200, y: 100, hp: 500, maxHp: 500, physDef: 20 };

  mechanics.updateBoss(mockMonster, mockPlayer, 0.016, {
    now: () => 5000,
    TUNING: { bossEnrageAt: 0.35, bossSlamEveryMs: 4000 },
    COMBAT: { attackSpeedMs: 1000 },
    TS: 32,
    dist: (x1, y1, x2, y2) => Math.hypot(x1 - x2, y1 - y2),
    addTelegraph: (tg) => { telegraphCreated = tg; },
    addScreenShake: () => {},
    calcDamage: () => ({ dmg: 50 }),
    buffMult: () => 1,
    playerAvoidsHit: () => false,
    playerDeath: () => {},
    floatText: () => {},
    playSfx: () => {},
  });

  assert.ok(telegraphCreated, 'Telegraph should be scheduled');
  assert.equal(telegraphCreated.kind, 'line', 'Ruin Golem should use line telegraph');
});

test('boss-mechanics: Frost Revenant creates cone telegraph', () => {
  let telegraphCreated = null;
  const mechanics = createBossMechanics();
  const mockMonster = {
    def: { id: 'frost_revenant', name: 'Frost Revenant', sizeTiles: 2 },
    x: 100,
    y: 100,
    hp: 1000,
    maxHp: 1000,
    atk: 50,
    atkBase: 50,
    lastCombatAt: 5000,
    nextSlamAt: 4000,
  };
  const mockPlayer = { x: 150, y: 100, hp: 500, maxHp: 500, physDef: 20 };

  mechanics.updateBoss(mockMonster, mockPlayer, 0.016, {
    now: () => 5000,
    TUNING: { bossEnrageAt: 0.35, bossSlamEveryMs: 4000 },
    COMBAT: { attackSpeedMs: 1000 },
    TS: 32,
    dist: (x1, y1, x2, y2) => Math.hypot(x1 - x2, y1 - y2),
    addTelegraph: (tg) => { telegraphCreated = tg; },
    addScreenShake: () => {},
    calcDamage: () => ({ dmg: 50 }),
    buffMult: () => 1,
    playerAvoidsHit: () => false,
    playerDeath: () => {},
    floatText: () => {},
    playSfx: () => {},
  });

  assert.ok(telegraphCreated);
  assert.equal(telegraphCreated.kind, 'cone');
});

test('boss-mechanics: Nullking vortex pulls player inward during telegraph', () => {
  let telegraphCreated = null;
  const mechanics = createBossMechanics();
  const mockMonster = {
    def: { id: 'nullking', name: 'Nullking', sizeTiles: 2 },
    x: 100,
    y: 100,
    hp: 1000,
    maxHp: 1000,
    atk: 50,
    atkBase: 50,
    lastCombatAt: 5000,
    nextSlamAt: 4000,
  };
  const mockPlayer = { x: 200, y: 100, hp: 500, maxHp: 500, physDef: 20 };

  // Frame 1: schedules vortex at player target (200, 100)
  mechanics.updateBoss(mockMonster, mockPlayer, 0.016, {
    now: () => 5000,
    TUNING: { bossEnrageAt: 0.35, bossSlamEveryMs: 4000 },
    COMBAT: { attackSpeedMs: 1000 },
    TS: 32,
    dist: (x1, y1, x2, y2) => Math.hypot(x1 - x2, y1 - y2),
    addTelegraph: (tg) => { telegraphCreated = tg; },
    addScreenShake: () => {},
    calcDamage: () => ({ dmg: 50 }),
    buffMult: () => 1,
    playerAvoidsHit: () => false,
    playerDeath: () => {},
    floatText: () => {},
    playSfx: () => {},
  });

  assert.ok(telegraphCreated);
  assert.equal(telegraphCreated.kind, 'vortex');

  // Move player slightly away from target center: target is (200, 100), player is (240, 100)
  mockPlayer.x = 240;
  // Frame 2: pull effect in action
  mechanics.updateBoss(mockMonster, mockPlayer, 0.1, {
    now: () => 5100,
    TUNING: { bossEnrageAt: 0.35, bossSlamEveryMs: 4000 },
    COMBAT: { attackSpeedMs: 1000 },
    TS: 32,
    dist: (x1, y1, x2, y2) => Math.hypot(x1 - x2, y1 - y2),
    addTelegraph: () => {},
    addScreenShake: () => {},
    calcDamage: () => ({ dmg: 50 }),
    buffMult: () => 1,
    playerAvoidsHit: () => false,
    playerDeath: () => {},
    floatText: () => {},
    playSfx: () => {},
  });

  // Player was at 240, pulled towards targetX 200, so x should decrease
  assert.ok(mockPlayer.x < 240, `Player should be pulled towards vortex center, actual: ${mockPlayer.x}`);
});

test('boss-mechanics: updateHazards deals damage over time and clearBossState cleans up', () => {
  const mechanics = createBossMechanics();
  const mockMonster = {
    def: { id: 'flame_dragon', name: 'Flame Dragon', sizeTiles: 2 },
    x: 100,
    y: 100,
    hp: 1000,
    maxHp: 1000,
    atk: 50,
    atkBase: 50,
    lastCombatAt: 5000,
    nextSlamAt: 4000,
  };
  const mockPlayer = { x: 120, y: 100, hp: 500, maxHp: 500, physDef: 20 };

  // Schedule magma cone
  let currentTime = 5000;
  mechanics.updateBoss(mockMonster, mockPlayer, 0.016, {
    now: () => currentTime,
    TUNING: { bossEnrageAt: 0.35, bossSlamEveryMs: 4000 },
    COMBAT: { attackSpeedMs: 1000 },
    TS: 32,
    dist: (x1, y1, x2, y2) => Math.hypot(x1 - x2, y1 - y2),
    addTelegraph: () => {},
    addScreenShake: () => {},
    calcDamage: () => ({ dmg: 50 }),
    buffMult: () => 1,
    playerAvoidsHit: () => false,
    playerDeath: () => {},
    floatText: () => {},
    playSfx: () => {},
  });

  // Impact: trigger hazard creation
  currentTime = 6200;
  mechanics.updateBoss(mockMonster, mockPlayer, 0.016, {
    now: () => currentTime,
    TUNING: { bossEnrageAt: 0.35, bossSlamEveryMs: 4000 },
    COMBAT: { attackSpeedMs: 1000 },
    TS: 32,
    dist: (x1, y1, x2, y2) => Math.hypot(x1 - x2, y1 - y2),
    addTelegraph: () => {},
    addScreenShake: () => {},
    calcDamage: () => ({ dmg: 50 }),
    buffMult: () => 1,
    playerAvoidsHit: () => false,
    playerDeath: () => {},
    floatText: () => {},
    playSfx: () => {},
  });

  assert.ok(mechanics.getHazards().length > 0, 'Flame dragon should spawn magma hazards');

  // Place player right inside hazard (target was 120, 100, hazard at 100, 100)
  mockPlayer.x = 100;
  mockPlayer.y = 100;
  const hpBefore = mockPlayer.hp;
  mechanics.updateHazards(mockPlayer, 0.016, {
    now: () => currentTime,
    floatText: () => {},
    playerDeath: () => {},
  });
  assert.ok(mockPlayer.hp < hpBefore, 'Hazard tick should damage player');

  // clearBossState should remove hazards
  mechanics.clearBossState(mockMonster);
  assert.equal(mechanics.getHazards().length, 0, 'clearBossState should clear hazards');
});

