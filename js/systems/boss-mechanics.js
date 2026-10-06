// js/systems/boss-mechanics.js - Guardian encounter state machine, telegraph patterns, and geometric hit testing.

export function pointInCircle(px, py, cx, cy, radius) {
  return Math.hypot(px - cx, py - cy) <= radius;
}

export function pointInOrientedBox(px, py, ox, oy, tx, ty, length, width) {
  const dx = tx - ox;
  const dy = ty - oy;
  const len = Math.hypot(dx, dy) || 1;
  const nx = dx / len;
  const ny = dy / len;

  // Vector from origin to point
  const pxRel = px - ox;
  const pyRel = py - oy;

  // Project onto forward and perpendicular vectors
  const forward = pxRel * nx + pyRel * ny;
  const perp = Math.abs(-pxRel * ny + pyRel * nx);

  return forward >= 0 && forward <= length && perp <= (width / 2);
}

export function pointInCone(px, py, ox, oy, tx, ty, radius, fovRadians) {
  const d = Math.hypot(px - ox, py - oy);
  if (d > radius) return false;
  if (d < 1) return true;

  const targetAngle = Math.atan2(ty - oy, tx - ox);
  const pointAngle = Math.atan2(py - oy, px - ox);

  let diff = pointAngle - targetAngle;
  while (diff < -Math.PI) diff += Math.PI * 2;
  while (diff > Math.PI) diff -= Math.PI * 2;

  return Math.abs(diff) <= (fovRadians / 2);
}

export function createBossMechanics() {
  let activeHazards = [];

  function updateHazards(player, dt, { now = () => performance.now(), floatText = () => {}, playerDeath = () => {} } = {}) {
    const t = now();
    activeHazards = activeHazards.filter(h => t < h.expiresAt);

    for (const h of activeHazards) {
      if (pointInCircle(player.x, player.y, h.x, h.y, h.radius)) {
        if (!h.lastTick || t - h.lastTick >= 800) {
          h.lastTick = t;
          const dmg = Math.max(1, Math.round(player.maxHp * 0.07));
          if (!player.godMode) player.hp -= dmg;
          floatText(player.x, player.y, dmg, 'enemy');
          if (player.hp <= 0) {
            playerDeath();
            return;
          }
        }
      }
    }
  }

  function clearBossState(m) {
    if (!m) return;
    m.enraged = false;
    m.phase = 0;
    if (m.atkBase) m.atk = m.atkBase;
    m.slamAt = null;
    m.nextSlamAt = 0;
    m.attackPattern = null;
    if (m.def?.id) {
      activeHazards = activeHazards.filter(h => h.bossId !== m.def.id);
    }
  }

  function getHazards() {
    return activeHazards;
  }

  function updateBoss(m, p, dt, {
    now = () => performance.now(),
    TUNING = { bossEnrageAt: 0.35, bossSlamEveryMs: 4000 },
    COMBAT = { attackSpeedMs: 1000 },
    ANIM = { hurtMs: 150 },
    TS = 32,
    dist = (x1, y1, x2, y2) => Math.hypot(x1 - x2, y1 - y2),
    playerAvoidsHit = () => false,
    calcDamage = (atk, def, pen) => ({ dmg: Math.max(1, Math.round(atk - def)) }),
    buffMult = () => 1,
    playerDeath = () => {},
    floatText = () => {},
    playSfx = () => {},
    addScreenShake = () => {},
    addTelegraph = () => {},
    spawnCrack = () => {},
    spawnRing = () => {},
    spawnRaidAdds = null,
    toast = () => {},
  } = {}) {
    const d = dist(m.x, m.y, p.x, p.y);
    const inCombat = now() - (m.lastCombatAt || 0) < 6000;

    // Phase 1 HP threshold trigger
    if (!m.phase && m.hp < m.maxHp * 0.70) {
      m.phase = 1;
      m.atk = Math.round(m.atkBase * 1.1);
      m.nextSlamAt = now() + 1200;
      spawnRing?.(m.x, m.y, TS * 2.2, '#ffb347');
      toast?.(`⚠ ${m.def.name} awakens — slams accelerate!`, 'bad');
    }

    // Enrage HP threshold trigger
    if (!m.enraged && m.hp < m.maxHp * (TUNING.bossEnrageAt || 0.35)) {
      m.enraged = true;
      m.atk = Math.round(m.atkBase * 1.4);
      playSfx?.('playerHurt');
      toast?.(`☠ ${m.def.name} is ENRAGED!`, 'bad');
    }

    // Raid 3-phase HP gates (100/66/33%)
    if (m.def?.raid) {
      if (!m.raidAddsSpawned && m.hp < m.maxHp * 0.66) {
        m.raidAddsSpawned = true;
        if (spawnRaidAdds) {
          spawnRaidAdds(m);
        }
        spawnRing?.(m.x, m.y, TS * 2.5, '#7a4fd0');
        toast?.(`⚠ ${m.def.name} calls forth rift wisps!`, 'bad');
      }
      if (!m.raidPhase3 && m.hp < m.maxHp * 0.33) {
        m.raidPhase3 = true;
        toast?.(`☠ ${m.def.name} tears the ground open!`, 'bad');
      }
    }

    if (!inCombat || d > 9 * TS) return;

    const slamInterval = (TUNING.bossSlamEveryMs || 4000) * (m.phase ? 0.8 : 1) * (m.enraged ? 0.7 : 1);
    const slamR = TS * 1.8 * (m.raidPhase3 ? Math.min(2.6, 1 + 0.2 * (m.raidHazardTicks || 0)) : 1);
    const bossId = m.def?.id || '';

    // 1. Telegraph Creation
    if (!m.slamAt && now() >= (m.nextSlamAt || (m.nextSlamAt = now() + slamInterval))) {
      m.slamAt = now() + 1150;
      m.slamX = p.x;
      m.slamY = p.y;
      m.targetX = p.x;
      m.targetY = p.y;
      m.originX = m.x;
      m.originY = m.y;
      m.angle = Math.atan2(p.y - m.y, p.x - m.x);

      if (bossId === 'ruin_golem') {
        m.attackPattern = 'fissure';
        addTelegraph({
          id: `tg_${m.def.id}`,
          ownerId: m.def.id,
          kind: 'line',
          x: m.x,
          y: m.y,
          angle: m.angle,
          length: TS * 6,
          width: TS * 1.5,
          durationMs: 1150,
          color: '#d4883b',
        });
      } else if (bossId === 'frost_revenant') {
        m.attackPattern = 'frost_cone';
        addTelegraph({
          id: `tg_${m.def.id}`,
          ownerId: m.def.id,
          kind: 'cone',
          x: m.x,
          y: m.y,
          angle: m.angle,
          radius: TS * 5,
          fov: Math.PI / 3, // 60 deg
          durationMs: 1150,
          color: '#80c8d8',
        });
      } else if (bossId === 'flame_dragon') {
        m.attackPattern = 'magma_cone';
        addTelegraph({
          id: `tg_${m.def.id}`,
          ownerId: m.def.id,
          kind: 'cone',
          x: m.x,
          y: m.y,
          angle: m.angle,
          radius: TS * 5.5,
          fov: Math.PI * 0.42, // ~75 deg
          durationMs: 1200,
          color: '#e4492c',
        });
      } else if (bossId === 'nullking') {
        m.attackPattern = 'vortex';
        addTelegraph({
          id: `tg_${m.def.id}`,
          ownerId: m.def.id,
          kind: 'vortex',
          x: m.targetX,
          y: m.targetY,
          radius: TS * 3.2,
          durationMs: 1350,
          color: '#7a4fd0',
        });
      } else {
        // Elderwood Treant & generic fallback circle
        m.attackPattern = 'circle';
        addTelegraph({
          id: `tg_${m.def.id}`,
          ownerId: m.def.id,
          kind: 'circle',
          x: m.targetX,
          y: m.targetY,
          radius: slamR,
          durationMs: 1100,
          color: bossId === 'elderwood_treant' ? '#4f8a48' : '#ff4433',
        });
      }
    }

    // 2. Active Telegraph Pull Effect (Nullking vortex pull)
    if (m.slamAt && m.attackPattern === 'vortex' && now() < m.slamAt) {
      const vDist = dist(p.x, p.y, m.targetX, m.targetY);
      if (vDist > 10 && vDist < TS * 3.5) {
        const pullDirX = (m.targetX - p.x) / vDist;
        const pullDirY = (m.targetY - p.y) / vDist;
        p.x += pullDirX * 32 * dt;
        p.y += pullDirY * 32 * dt;
      }
    }

    // 3. Telegraph Impact Execution
    if (m.slamAt && now() >= m.slamAt) {
      m.slamAt = null;
      m.nextSlamAt = now() + slamInterval;
      if (m.raidPhase3) {
        m.raidHazardTicks = (m.raidHazardTicks || 0) + 1;
      }
      spawnCrack?.(m.slamX, m.slamY, slamR, '#ff5533');
      spawnRing?.(m.slamX, m.slamY, slamR, '#ff5533');
      playSfx?.('hit');
      addScreenShake?.(m.enraged ? 0.75 : 0.55);

      let isHit = false;
      let hitDmgMult = 1.6;

      if (m.attackPattern === 'fissure') {
        isHit = pointInOrientedBox(p.x, p.y, m.originX, m.originY, m.targetX, m.targetY, TS * 6, TS * 1.5);
        hitDmgMult = 1.7;
      } else if (m.attackPattern === 'frost_cone') {
        isHit = pointInCone(p.x, p.y, m.originX, m.originY, m.targetX, m.targetY, TS * 5, Math.PI / 3);
        hitDmgMult = 1.5;
      } else if (m.attackPattern === 'magma_cone') {
        isHit = pointInCone(p.x, p.y, m.originX, m.originY, m.targetX, m.targetY, TS * 5.5, Math.PI * 0.42);
        hitDmgMult = 1.6;
        // Spawn 2 lingering magma pools
        activeHazards.push(
          { bossId: m.def.id, x: m.targetX - 20, y: m.targetY, radius: TS * 1.2, expiresAt: now() + 4000 },
          { bossId: m.def.id, x: m.targetX + 20, y: m.targetY - 10, radius: TS * 1.2, expiresAt: now() + 4000 }
        );
      } else if (m.attackPattern === 'vortex') {
        isHit = pointInCircle(p.x, p.y, m.targetX, m.targetY, TS * 3.2);
        hitDmgMult = 2.0;
      } else {
        isHit = pointInCircle(p.x, p.y, m.targetX, m.targetY, slamR);
      }

      if (isHit && !playerAvoidsHit(m)) {
        const { dmg } = calcDamage(m.atk * hitDmgMult, p.physDef * buffMult(p, 'def'), 0);
        if (!p.godMode) p.hp -= dmg;
        p.hurtUntil = now() + (ANIM?.hurtMs || 150);
        playSfx?.('playerHurt');
        addScreenShake?.(0.65);
        floatText(p.x, p.y, p.godMode ? '0' : dmg, 'enemy');

        if (bossId === 'elderwood_treant' || bossId === 'frost_revenant') {
          floatText(p.x, p.y - 14, bossId === 'frost_revenant' ? 'CHILLED!' : 'ROOTED!', 'status');
        }

        if (p.hp <= 0) {
          playerDeath();
          return;
        }
      } else {
        floatText(m.targetX || p.x, m.targetY || p.y, 'dodged!', 'heal');
      }
    }
  }

  return {
    updateBoss,
    updateHazards,
    getHazards,
    clearBossState,
    pointInCircle,
    pointInOrientedBox,
    pointInCone,
  };
}
