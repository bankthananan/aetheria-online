// js/systems/elite-monsters.js - Procedural Champion & Elite monster affixes, state machine, and tactical combat mechanics.

const AFFIX_POOL = ['molten', 'frost_nova', 'vortex', 'shielding', 'avenger'];
const GEM_SHARDS = ['ruby_shard', 'sapphire_shard', 'emerald_shard'];

export function createEliteSystem({
  rnd = Math.random,
  now = () => performance.now(),
  dist = (x1, y1, x2, y2) => Math.hypot(x1 - x2, y1 - y2),
  TS = 32,
} = {}) {
  let activeHazards = [];

  function rollTier(def) {
    if (!def) return null;
    // Exclude bosses, guardians, and world roaming rares
    if ((def.sizeTiles && def.sizeTiles >= 2) || def.rare || def.raid) return null;
    const r = rnd();
    if (r < 0.03) return 'elite';
    if (r < 0.12) return 'champion';
    return null;
  }

  function rollAffixes(tier) {
    if (tier === 'champion') {
      const idx = Math.floor(rnd() * AFFIX_POOL.length);
      return [AFFIX_POOL[idx]];
    }
    if (tier === 'elite') {
      const pool = [...AFFIX_POOL];
      const idx1 = Math.floor(rnd() * pool.length);
      const aff1 = pool.splice(idx1, 1)[0];
      const idx2 = Math.floor(rnd() * pool.length);
      const aff2 = pool[idx2];
      return [aff1, aff2];
    }
    return [];
  }

  function applyEliteMods(monster, tier, affixes = null) {
    if (!tier) return;
    monster.eliteTier = tier;
    monster.eliteAffixes = affixes || rollAffixes(tier);

    const t = now();
    monster._nextMoltenAt = 0;
    monster._nextFrostNovaAt = t + 2500;
    monster._nextVortexAt = t + 3500;
    monster._nextShieldAt = t + 4000;
    monster.shieldActive = false;
    monster.shieldUntil = 0;
    monster.avengerStacks = 0;

    if (tier === 'champion') {
      monster.maxHp = Math.round(monster.maxHp * 1.8);
      monster.hp = monster.maxHp;
      monster.atk = Math.round(monster.atk * 1.25);
      monster.atkBase = Math.round(monster.atkBase * 1.25);
    } else if (tier === 'elite') {
      monster.maxHp = Math.round(monster.maxHp * 3.0);
      monster.hp = monster.maxHp;
      monster.atk = Math.round(monster.atk * 1.40);
      monster.atkBase = Math.round(monster.atkBase * 1.40);
    }
  }

  function mitigateDamage(monster, dmg) {
    if (monster?.shieldActive) {
      return Math.max(1, Math.round(dmg * 0.30));
    }
    return dmg;
  }

  function getHazards() {
    return activeHazards;
  }

  function clearHazards() {
    activeHazards = [];
  }

  function updateElites(monsters, player, dt, {
    now: customNow = now,
    floatText = () => {},
    addTelegraph = () => {},
    playerDeath = () => {},
    applyPlayerStatus = () => {},
  } = {}) {
    const t = customNow();

    // 1. Molten hazards ticking damage on player
    activeHazards = activeHazards.filter(h => t < h.expiresAt);
    for (const h of activeHazards) {
      if (dist(player.x, player.y, h.x, h.y) <= h.radius) {
        if (!h.lastTick || t - h.lastTick >= 800) {
          h.lastTick = t;
          const dmg = Math.max(1, Math.round(player.maxHp * 0.05));
          if (!player.godMode) player.hp -= dmg;
          floatText(player.x, player.y, dmg, 'enemy');
          if (player.hp <= 0) {
            playerDeath();
            return;
          }
        }
      }
    }

    // 2. Individual elite monster affix updates
    for (const m of monsters) {
      if (!m.alive || !m.eliteTier) continue;
      const inCombat = t - (m.lastCombatAt || 0) < 6000;
      const affixes = m.eliteAffixes || [];

      // Molten trail
      if (affixes.includes('molten')) {
        if (!m._nextMoltenAt || t >= m._nextMoltenAt) {
          m._nextMoltenAt = t + 1200;
          activeHazards.push({
            id: `molten_${m.x}_${m.y}`,
            x: m.x,
            y: m.y,
            radius: TS * 0.9,
            expiresAt: t + 3500,
            lastTick: t,
          });
        }
      }

      // Frost Nova
      if (affixes.includes('frost_nova') && inCombat) {
        if (!m.frostNovaAt && t >= (m._nextFrostNovaAt || (m._nextFrostNovaAt = t + 6000))) {
          m.frostNovaAt = t + 1100;
          m.frostNovaOriginX = m.x;
          m.frostNovaOriginY = m.y;
          addTelegraph({
            id: `tg_frostnova_${m.x}_${m.y}`,
            kind: 'circle',
            x: m.x,
            y: m.y,
            radius: TS * 2.8,
            durationMs: 1100,
            color: '#70c5e8',
          });
        }
        if (m.frostNovaAt && t >= m.frostNovaAt) {
          m.frostNovaAt = null;
          m._nextFrostNovaAt = t + 6000;
          const hit = dist(player.x, player.y, m.frostNovaOriginX, m.frostNovaOriginY) <= TS * 2.8;
          if (hit) {
            const novaDmg = Math.max(1, Math.round(m.atk * 0.9));
            if (!player.godMode) player.hp -= novaDmg;
            floatText(player.x, player.y, novaDmg, 'enemy');
            floatText(player.x, player.y - 14, 'SLOWED!', 'status');
            applyPlayerStatus('slow', 3500);
            if (player.hp <= 0) {
              playerDeath();
              return;
            }
          }
        }
      }

      // Vortex pulse
      if (affixes.includes('vortex') && inCombat) {
        if (t >= (m._nextVortexAt || (m._nextVortexAt = t + 7500))) {
          m._nextVortexAt = t + 7500;
          const d = dist(player.x, player.y, m.x, m.y);
          if (d > 10 && d < TS * 8) {
            const pullDist = TS * 1.6;
            const dirX = (m.x - player.x) / d;
            const dirY = (m.y - player.y) / d;
            player.x += dirX * pullDist;
            player.y += dirY * pullDist;
            floatText(player.x, player.y - 12, 'VORTEX!', 'status');
          }
        }
      }

      // Shielding
      if (affixes.includes('shielding') && inCombat) {
        if (!m.shieldActive && t >= (m._nextShieldAt || (m._nextShieldAt = t + 8500))) {
          m.shieldActive = true;
          m.shieldUntil = t + 3000;
          m._nextShieldAt = t + 8500;
          floatText(m.x, m.y - 12, 'SHIELDED!', 'status');
        }
        if (m.shieldActive && t >= m.shieldUntil) {
          m.shieldActive = false;
        }
      }
    }
  }

  function handleEliteDeath(dyingMonster, allMonsters, player, {
    floatText = () => {},
  } = {}) {
    const t = now();

    // 1. Avenger affix trigger on nearby living monsters
    for (const m of allMonsters) {
      if (m !== dyingMonster && m.alive && m.eliteAffixes?.includes('avenger')) {
        if (dist(m.x, m.y, dyingMonster.x, dyingMonster.y) <= TS * 4.5) {
          m.avengerStacks = Math.min(3, (m.avengerStacks || 0) + 1);
          m.atk = Math.round(m.atk * 1.15);
          m.hp = Math.min(m.maxHp, m.hp + Math.round(m.maxHp * 0.12));
          floatText(m.x, m.y - 15, 'AVENGER!', 'status');
        }
      }
    }

    // 2. Molten death burst
    if (dyingMonster.eliteAffixes?.includes('molten')) {
      for (let i = 0; i < 3; i++) {
        const angle = (i * Math.PI * 2) / 3;
        activeHazards.push({
          id: `molten_burst_${dyingMonster.x}_${dyingMonster.y}_${i}`,
          x: dyingMonster.x + Math.cos(angle) * TS * 1.2,
          y: dyingMonster.y + Math.sin(angle) * TS * 1.2,
          radius: TS * 0.8,
          expiresAt: t + 3000,
          lastTick: t,
        });
      }
    }

    // 3. Loot & progression rewards
    const tier = dyingMonster.eliteTier;
    if (tier === 'champion') {
      const gemRoll = rnd() < 0.25 ? GEM_SHARDS[Math.floor(rnd() * GEM_SHARDS.length)] : null;
      return {
        xpMult: 2.5,
        zenyMult: 3.0,
        dropBiasBonus: 2,
        gemDrop: gemRoll,
      };
    }
    if (tier === 'elite') {
      const gemRoll = GEM_SHARDS[Math.floor(rnd() * GEM_SHARDS.length)];
      return {
        xpMult: 4.0,
        zenyMult: 6.0,
        dropBiasBonus: 4,
        gemDrop: gemRoll,
      };
    }

    return {
      xpMult: 1.0,
      zenyMult: 1.0,
      dropBiasBonus: 0,
      gemDrop: null,
    };
  }

  return {
    rollTier,
    rollAffixes,
    applyEliteMods,
    mitigateDamage,
    updateElites,
    handleEliteDeath,
    getHazards,
    clearHazards,
  };
}
