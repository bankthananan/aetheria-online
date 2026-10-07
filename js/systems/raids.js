// js/systems/raids.js
// Core Raid & World Boss Subsystem.
// Coordinates multi-phase world boss encounters, Aegis break-shield staggering,
// minion mitigation, dynamic enrage thresholds, and tiered contribution rewards.

export const RAID_STATES = {
  IDLE: 'IDLE',
  ANNOUNCING: 'ANNOUNCING',
  ENGAGED: 'ENGAGED',
  BREAK_STAGGER: 'BREAK_STAGGER',
  ENRAGED: 'ENRAGED',
  DEFEATED: 'DEFEATED',
  COLLAPSED: 'COLLAPSED',
};

export const CONTRIBUTION_TIERS = {
  BRONZE: 'bronze',
  SILVER: 'silver',
  GOLD: 'gold',
  PARAGON: 'paragon',
};

export const WORLD_BOSS_CATALOG = {
  voidmaw_sovereign: {
    id: 'voidmaw_sovereign',
    name: 'Voidmaw Sovereign',
    zone: 'rift',
    element: 'void',
    maxHp: 28000,
    atk: 85,
    def: 35,
    breakThresholdHp: 0.60,
    enrageThresholdHp: 0.30,
    breakShieldHp: 7000,
    breakTimerMs: 35000,
    staggerDurationMs: 8000,
    staggerVulnerabilityMult: 1.40,
    signatureMechanics: ['void_singularity', 'rift_decay', 'phase_shift'],
    addsPool: ['void_stalker', 'void_wisp'],
    apexTrophy: 'voidmaw_eye',
  },
  caldera_colossus: {
    id: 'caldera_colossus',
    name: 'Caldera Colossus',
    zone: 'dragon_caldera',
    element: 'fire',
    maxHp: 32000,
    atk: 95,
    def: 45,
    breakThresholdHp: 0.60,
    enrageThresholdHp: 0.30,
    breakShieldHp: 8000,
    breakTimerMs: 35000,
    staggerDurationMs: 8000,
    staggerVulnerabilityMult: 1.40,
    signatureMechanics: ['magma_fissure', 'meteor_cataclysm', 'flame_sweep'],
    addsPool: ['magma_beetle', 'ember_imp'],
    apexTrophy: 'titan_heart',
  },
  ancient_behemoth: {
    id: 'ancient_behemoth',
    name: 'Ancient Behemoth',
    zone: 'whispering_woods',
    element: 'nature',
    maxHp: 30000,
    atk: 90,
    def: 40,
    breakThresholdHp: 0.60,
    enrageThresholdHp: 0.30,
    breakShieldHp: 7500,
    breakTimerMs: 35000,
    staggerDurationMs: 8000,
    staggerVulnerabilityMult: 1.40,
    signatureMechanics: ['thorny_brambles', 'seismic_shockwave', 'crushing_slam'],
    addsPool: ['thornback_boar', 'blight_sprite'],
    apexTrophy: 'titan_heart',
  },
};

export function createRaidsSystem({
  now = Date.now,
  rnd = Math.random,
} = {}) {
  const getTime = typeof now === 'function' ? now : () => Date.now();
  let activeRaid = null;
  let cooldownRemainingMs = 0;

  function getBossDef(bossId) {
    return WORLD_BOSS_CATALOG[bossId] || null;
  }

  function getActiveRaid() {
    return activeRaid;
  }

  function getCooldownRemaining() {
    return Math.max(0, cooldownRemainingMs);
  }

  function resetToIdle() {
    activeRaid = null;
    cooldownRemainingMs = 0;
  }

  function startRaid(bossId, {
    mapId = 'dragon_caldera',
    x = 400,
    y = 300,
    durationMs = 180000,
  } = {}) {
    const bossDef = getBossDef(bossId);
    if (!bossDef) return null;

    activeRaid = {
      active: true,
      bossId,
      bossDef,
      mapId,
      x,
      y,
      hp: bossDef.maxHp,
      maxHp: bossDef.maxHp,
      state: RAID_STATES.ENGAGED,
      phase: 1,
      breakShield: 0,
      maxBreakShield: 0,
      breakTimeRemainingMs: 0,
      staggered: false,
      staggerTimeRemainingMs: 0,
      enraged: false,
      adds: [],
      score: 0,
      metrics: {
        damage: 0,
        breakDamage: 0,
        addsKilled: 0,
        hazardsDodged: 0,
      },
      startedAt: getTime(),
      expiresAt: getTime() + durationMs,
      durationMs,
    };
    return activeRaid;
  }

  function applyDamage(rawDamage, { isBreak = false, weatherId = 'clear' } = {}) {
    if (!activeRaid || !activeRaid.active) {
      return { actualDamage: 0, state: RAID_STATES.IDLE };
    }

    if (rawDamage <= 0) {
      return {
        actualDamage: 0,
        breakDamage: 0,
        state: activeRaid.state,
        staggered: activeRaid.staggered,
      };
    }

    // Phase 2 Break Shield Phase
    if (activeRaid.state === RAID_STATES.BREAK_STAGGER && activeRaid.breakShield > 0) {
      const aliveAdds = activeRaid.adds.filter(a => a.alive).length;
      const addMitigation = Math.min(0.60, aliveAdds * 0.15); // Each add grants 15% resistance up to 60%
      const dmgToShield = Math.max(1, Math.round(rawDamage * (1 - addMitigation)));
      const appliedBreakDmg = Math.min(activeRaid.breakShield, dmgToShield);
      activeRaid.breakShield -= appliedBreakDmg;
      activeRaid.metrics.breakDamage += appliedBreakDmg;
      activeRaid.score += Math.round(appliedBreakDmg * 0.20);

      if (activeRaid.breakShield <= 0) {
        activeRaid.staggered = true;
        activeRaid.staggerTimeRemainingMs = activeRaid.bossDef.staggerDurationMs;
        return {
          actualDamage: 0,
          breakDamage: appliedBreakDmg,
          staggered: true,
          state: activeRaid.state,
        };
      }
      return {
        actualDamage: 0,
        breakDamage: appliedBreakDmg,
        staggered: false,
        state: activeRaid.state,
      };
    }

    // Direct HP damage (normal or staggered vulnerability)
    const effectiveDmg = activeRaid.staggered
      ? Math.round(rawDamage * (activeRaid.bossDef.staggerVulnerabilityMult || 1.40))
      : rawDamage;
    const actualDmg = Math.min(activeRaid.hp, effectiveDmg);
    activeRaid.hp -= actualDmg;
    activeRaid.metrics.damage += actualDmg;
    activeRaid.score += Math.round(actualDmg * 0.10);

    // Phase check
    if (activeRaid.hp <= activeRaid.maxHp * activeRaid.bossDef.breakThresholdHp && activeRaid.phase === 1) {
      activeRaid.phase = 2;
      activeRaid.state = RAID_STATES.BREAK_STAGGER;
      activeRaid.breakShield = activeRaid.bossDef.breakShieldHp;
      activeRaid.maxBreakShield = activeRaid.bossDef.breakShieldHp;
      activeRaid.breakTimeRemainingMs = activeRaid.bossDef.breakTimerMs;
      // spawn 3 adds
      activeRaid.adds = activeRaid.bossDef.addsPool
        .concat([activeRaid.bossDef.addsPool[0]])
        .slice(0, 3)
        .map((addId, idx) => ({
          id: addId,
          index: idx,
          alive: true,
        }));
    } else if (
      activeRaid.hp <= activeRaid.maxHp * activeRaid.bossDef.enrageThresholdHp &&
      activeRaid.phase === 2 &&
      activeRaid.breakShield <= 0
    ) {
      activeRaid.phase = 3;
      activeRaid.state = RAID_STATES.ENRAGED;
      activeRaid.enraged = true;
    }

    if (activeRaid.hp <= 0) {
      return resolveVictory();
    }

    return {
      actualDamage: actualDmg,
      state: activeRaid.state,
      staggered: activeRaid.staggered,
    };
  }

  function recordAddKill(addIndex) {
    if (!activeRaid || !activeRaid.active) return false;
    const targetAdd = activeRaid.adds.find(a => a.index === addIndex) || activeRaid.adds[addIndex];
    if (targetAdd && targetAdd.alive) {
      targetAdd.alive = false;
      activeRaid.metrics.addsKilled += 1;
      activeRaid.score += 150;
      return true;
    }
    return false;
  }

  function recordHazardDodge() {
    if (!activeRaid || !activeRaid.active) return false;
    activeRaid.metrics.hazardsDodged += 1;
    activeRaid.score += 100;
    return true;
  }

  function update(dt = 0) {
    if (!activeRaid || !activeRaid.active) return null;
    const dtMs = typeof dt === 'number' && dt > 0 ? (dt > 100 ? dt : dt * 1000) : 0;

    // 1. Break Shield countdown
    if (activeRaid.breakShield > 0) {
      activeRaid.breakTimeRemainingMs = Math.max(0, activeRaid.breakTimeRemainingMs - dtMs);
      if (activeRaid.breakTimeRemainingMs <= 0) {
        // Barrier detonation occurs, breakShield dissolves, combat resumes
        activeRaid.breakShield = 0;
        activeRaid.detonated = true;
        if (activeRaid.hp <= activeRaid.maxHp * activeRaid.bossDef.enrageThresholdHp) {
          activeRaid.phase = 3;
          activeRaid.state = RAID_STATES.ENRAGED;
          activeRaid.enraged = true;
        } else {
          activeRaid.state = RAID_STATES.ENGAGED;
        }
      }
    }

    // 2. Stagger countdown
    if (activeRaid.staggered) {
      activeRaid.staggerTimeRemainingMs = Math.max(0, activeRaid.staggerTimeRemainingMs - dtMs);
      if (activeRaid.staggerTimeRemainingMs <= 0) {
        activeRaid.staggered = false;
        if (activeRaid.hp <= activeRaid.maxHp * activeRaid.bossDef.enrageThresholdHp) {
          activeRaid.phase = 3;
          activeRaid.state = RAID_STATES.ENRAGED;
          activeRaid.enraged = true;
        } else {
          activeRaid.state = RAID_STATES.ENGAGED;
        }
      }
    }

    // 3. Raid expiration
    if (getTime() >= activeRaid.expiresAt) {
      return collapseRaid();
    }

    return {
      active: activeRaid.active,
      state: activeRaid.state,
    };
  }

  function computeContributionTier(score) {
    if (score >= 12000) return CONTRIBUTION_TIERS.PARAGON;
    if (score >= 6000) return CONTRIBUTION_TIERS.GOLD;
    if (score >= 2500) return CONTRIBUTION_TIERS.SILVER;
    return CONTRIBUTION_TIERS.BRONZE;
  }

  function generateRaidCache(tier, bossDef) {
    const trophy = bossDef?.apexTrophy;
    switch (tier) {
      case CONTRIBUTION_TIERS.PARAGON:
        return {
          zeny: 25000,
          dimensional_shard: 15,
          trophies: trophy ? [trophy, trophy] : [],
          runes: ['rune_ember', 'rune_glacial'],
          feast: 'golden_carp_sashimi',
          gems: 4,
          cardChance: 1.00,
        };
      case CONTRIBUTION_TIERS.GOLD:
        return {
          zeny: 12000,
          dimensional_shard: 8,
          trophies: trophy ? [trophy] : [],
          runes: ['rune_ember', 'rune_glacial'],
          feast: 'smoked_salmon',
          gems: 2,
          cardChance: 0.35,
        };
      case CONTRIBUTION_TIERS.SILVER:
        return {
          zeny: 6000,
          dimensional_shard: 5,
          trophies: [],
          runes: ['rune_ember'],
          feast: 'smoked_salmon',
          gems: 1,
          cardChance: 0.15,
        };
      case CONTRIBUTION_TIERS.BRONZE:
      default:
        return {
          zeny: 3000,
          dimensional_shard: 3,
          trophies: [],
          runes: ['rune_ember'],
          feast: 'grilled_trout',
          gems: 0,
          cardChance: 0.05,
        };
    }
  }

  function resolveVictory() {
    if (!activeRaid) return { success: false, reason: 'No active raid' };
    activeRaid.state = RAID_STATES.DEFEATED;
    const tier = computeContributionTier(activeRaid.score);
    const cache = generateRaidCache(tier, activeRaid.bossDef);
    activeRaid.active = false;
    return {
      success: true,
      tier,
      cache,
      metrics: activeRaid.metrics,
      score: activeRaid.score,
    };
  }

  function collapseRaid() {
    if (!activeRaid) return { success: false, reason: 'No active raid' };
    activeRaid.state = RAID_STATES.COLLAPSED;
    activeRaid.active = false;
    return { success: false, reason: 'Time expired or raid collapsed!' };
  }

  function serialize() {
    return {
      activeRaid: activeRaid ? JSON.parse(JSON.stringify(activeRaid)) : null,
      cooldownRemainingMs,
    };
  }

  function deserialize(data) {
    if (!data) return;
    activeRaid = data.activeRaid ? JSON.parse(JSON.stringify(data.activeRaid)) : null;
    cooldownRemainingMs = typeof data.cooldownRemainingMs === 'number' ? data.cooldownRemainingMs : 0;
  }

  return {
    getBossDef,
    getActiveRaid,
    getCooldownRemaining,
    resetToIdle,
    startRaid,
    applyDamage,
    recordAddKill,
    recordHazardDodge,
    update,
    computeContributionTier,
    generateRaidCache,
    resolveVictory,
    collapseRaid,
    serialize,
    deserialize,
  };
}
