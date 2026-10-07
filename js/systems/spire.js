// js/systems/spire.js
// Core Abyssal Spire Challenge Tower Subsystem.
// Manages progressive 100-floor gauntlet, elemental biomes, dynamic affixes,
// milestone boss floors, checkpoint elevator unlocks, emblem economy, and titles.

export const SPIRE_BIOMES = {
  depths: {
    id: 'depths',
    name: 'Shadow Depths',
    minFloor: 1,
    maxFloor: 20,
    color: '#4a148c',
    pool: ['shade', 'corrupted_dryad', 'mire_leech', 'blight_sprite'],
  },
  glacial: {
    id: 'glacial',
    name: 'Glacial Ascent',
    minFloor: 21,
    maxFloor: 40,
    color: '#0277bd',
    pool: ['frost_wolf', 'rime_harpy', 'ice_wraith', 'tundra_lurker'],
  },
  caldera: {
    id: 'caldera',
    name: 'Magma Foundry',
    minFloor: 41,
    maxFloor: 60,
    color: '#d84315',
    pool: ['ember_imp', 'magma_beetle', 'ashwing', 'sand_stalker'],
  },
  storm: {
    id: 'storm',
    name: 'Storm Spires',
    minFloor: 61,
    maxFloor: 80,
    color: '#f57f17',
    pool: ['zephyr_hawk', 'storm_elemental', 'void_wisp', 'zenith_warden'],
  },
  void: {
    id: 'void',
    name: 'Void Zenith',
    minFloor: 81,
    maxFloor: 100,
    color: '#212121',
    pool: ['void_stalker', 'star_reaver', 'astral_knight', 'rift_manta'],
  },
};

export const SPIRE_AFFIXES = {
  magma_surge: {
    id: 'magma_surge',
    name: 'Magma Surge',
    icon: '🌋',
    desc: 'Ground fissures erupt beneath combatants.',
  },
  glacial_chill: {
    id: 'glacial_chill',
    name: 'Glacial Chill',
    icon: '❄️',
    desc: 'Movement cast and attack speed slowed by 15%.',
  },
  mana_drain: {
    id: 'mana_drain',
    name: 'Mana Drain',
    icon: '🔮',
    desc: 'Skill MP cost +25%; defeated foes drop mana motes.',
  },
  sunder_mist: {
    id: 'sunder_mist',
    name: 'Sunder Mist',
    icon: '🌫️',
    desc: 'Environmental fog reduces physical and magical DEF by 20%.',
  },
  berserk_foes: {
    id: 'berserk_foes',
    name: 'Berserk Foes',
    icon: '💢',
    desc: 'Monsters below 50% HP gain +30% attack speed and +25% attack power.',
  },
  kinetic_reflect: {
    id: 'kinetic_reflect',
    name: 'Kinetic Reflect',
    icon: '🛡️',
    desc: 'Monsters reflect 5% of direct damage taken.',
  },
  graviton_well: {
    id: 'graviton_well',
    name: 'Graviton Well',
    icon: '🌀',
    desc: 'Center of arena pulls combatants inward.',
  },
  chrono_haste: {
    id: 'chrono_haste',
    name: 'Chrono Haste',
    icon: '⚡',
    desc: 'All skill cooldowns recover 30% faster.',
  },
};

export const CHECKPOINT_FLOORS = [1, 11, 21, 31, 41, 51, 61, 71, 81, 91];

export const MILESTONE_BOSS_FLOORS = {
  10: 'corrupted_treant_boss',
  20: 'abyssal_siren_golem_boss',
  30: 'frost_alpha_boss',
  40: 'glacial_dragon_boss',
  50: 'caldera_avatar_boss',
  60: 'magma_lord_boss',
  70: 'tempest_warden_boss',
  80: 'twin_elementals_boss',
  90: 'herald_sovereign_boss',
  100: 'nullking_spire_boss',
};

export function createSpireSystem({
  now = Date.now,
  rnd = Math.random,
} = {}) {
  let highestFloor = 0;
  let unlockedCheckpoints = [1];
  let emblems = 0;
  let unlockedTitles = [];
  let activeRun = null;

  function getBiomeForFloor(floor) {
    const f = Math.max(1, Math.min(100, Math.floor(floor || 1)));
    if (f <= 20) return SPIRE_BIOMES.depths;
    if (f <= 40) return SPIRE_BIOMES.glacial;
    if (f <= 60) return SPIRE_BIOMES.caldera;
    if (f <= 80) return SPIRE_BIOMES.storm;
    return SPIRE_BIOMES.void;
  }

  function isMilestoneFloor(floor) {
    return typeof floor === 'number' && floor > 0 && floor % 10 === 0 && floor <= 100;
  }

  function getMilestoneBossId(floor) {
    return MILESTONE_BOSS_FLOORS[floor] || null;
  }

  function getFloorStatScale(floor, isBoss = false) {
    const f = typeof floor === 'number' && floor > 0 ? floor : 1;
    const hpMult = (1 + (f - 1) * 0.08) * (isBoss ? 3.5 : 1.0);
    const atkMult = 1 + (f - 1) * 0.04;
    const defMult = 1 + (f - 1) * 0.025;
    return {
      hpMult: Number(hpMult.toFixed(3)),
      atkMult: Number(atkMult.toFixed(3)),
      defMult: Number(defMult.toFixed(3)),
    };
  }

  function rollFloorAffixes(floor) {
    const affixKeys = Object.keys(SPIRE_AFFIXES);
    const count = floor >= 41 ? 2 : 1;
    const shuffled = [...affixKeys].sort(() => rnd() - 0.5);
    return shuffled.slice(0, count).map(k => SPIRE_AFFIXES[k]);
  }

  function isCheckpointUnlocked(floor) {
    return unlockedCheckpoints.includes(floor);
  }

  function calculateFloorEmblems(floor, isFirstClear = false) {
    const base = isMilestoneFloor(floor) ? 15 : (1 + Math.floor(floor / 30));
    const bonus = isFirstClear ? (isMilestoneFloor(floor) ? 50 : 0) : 0;
    return base + bonus;
  }

  function startRun(startingFloor = 1) {
    if (typeof startingFloor !== 'number' || !Number.isFinite(startingFloor)) return null;
    if (startingFloor < 1 || startingFloor > 100) return null;
    const isAllowed = unlockedCheckpoints.includes(startingFloor) || startingFloor <= highestFloor + 1;
    if (!isAllowed) return null;

    const affixes = rollFloorAffixes(startingFloor);
    const startedAt = typeof now === 'function' ? now() : Date.now();
    activeRun = {
      currentFloor: startingFloor,
      activeAffixes: affixes,
      emblemsEarned: 0,
      cleared: false,
      startedAt,
    };
    return activeRun;
  }

  function clearFloor() {
    if (!activeRun) return null;
    activeRun.cleared = true;
    const isMilestone = isMilestoneFloor(activeRun.currentFloor);
    const isFirstClear = activeRun.currentFloor > highestFloor;
    if (activeRun.currentFloor > highestFloor) {
      highestFloor = activeRun.currentFloor;
    }

    // Unlock checkpoint if milestone
    if (isMilestone && activeRun.currentFloor < 100) {
      const nextCheckpoint = activeRun.currentFloor + 1;
      if (!unlockedCheckpoints.includes(nextCheckpoint)) {
        unlockedCheckpoints.push(nextCheckpoint);
        unlockedCheckpoints.sort((a, b) => a - b);
      }
    }

    // Title unlocks
    if (activeRun.currentFloor >= 50 && !unlockedTitles.includes('title_spire_challenger')) {
      unlockedTitles.push('title_spire_challenger');
    }
    if (activeRun.currentFloor >= 100 && !unlockedTitles.includes('title_abyssal_sovereign')) {
      unlockedTitles.push('title_abyssal_sovereign');
    }

    const earned = calculateFloorEmblems(activeRun.currentFloor, isFirstClear);
    activeRun.emblemsEarned += earned;
    emblems += earned;

    return {
      floor: activeRun.currentFloor,
      earnedEmblems: earned,
      totalEmblems: emblems,
      unlockedCheckpoint: isMilestone && activeRun.currentFloor < 100 ? activeRun.currentFloor + 1 : null,
      titleUnlocked: activeRun.currentFloor === 50 ? 'title_spire_challenger' : (activeRun.currentFloor === 100 ? 'title_abyssal_sovereign' : null),
    };
  }

  function advanceFloor() {
    if (!activeRun || !activeRun.cleared) return null;
    if (activeRun.currentFloor >= 100) return null; // Tower conquered!
    activeRun.currentFloor += 1;
    activeRun.cleared = false;
    activeRun.activeAffixes = rollFloorAffixes(activeRun.currentFloor);
    return activeRun;
  }

  function getUnlockedCheckpoints() {
    return [...unlockedCheckpoints];
  }

  function getHighestFloor() {
    return highestFloor;
  }

  function getActiveRun() {
    return activeRun;
  }

  function getEmblems() {
    return emblems;
  }

  function getUnlockedTitles() {
    return [...unlockedTitles];
  }

  function spendEmblems(amount) {
    if (typeof amount === 'number' && amount > 0 && emblems >= amount) {
      emblems -= amount;
      return true;
    }
    return false;
  }

  function endRun(reason = 'abandon') {
    activeRun = null;
    return true;
  }

  function serialize() {
    return {
      highestFloor,
      unlockedCheckpoints: [...unlockedCheckpoints],
      emblems,
      unlockedTitles: [...unlockedTitles],
    };
  }

  function deserialize(data) {
    if (!data || typeof data !== 'object') {
      highestFloor = 0;
      unlockedCheckpoints = [1];
      emblems = 0;
      unlockedTitles = [];
      activeRun = null;
      return;
    }

    highestFloor = typeof data.highestFloor === 'number' && Number.isFinite(data.highestFloor)
      ? Math.max(0, data.highestFloor)
      : 0;

    if (Array.isArray(data.unlockedCheckpoints) && data.unlockedCheckpoints.length > 0) {
      unlockedCheckpoints = Array.from(
        new Set(data.unlockedCheckpoints.filter(n => typeof n === 'number' && Number.isFinite(n)))
      ).sort((a, b) => a - b);
      if (!unlockedCheckpoints.includes(1)) {
        unlockedCheckpoints.unshift(1);
      }
    } else {
      unlockedCheckpoints = [1];
    }

    emblems = typeof data.emblems === 'number' && Number.isFinite(data.emblems)
      ? Math.max(0, data.emblems)
      : 0;

    if (Array.isArray(data.unlockedTitles)) {
      unlockedTitles = Array.from(new Set(data.unlockedTitles.filter(t => typeof t === 'string')));
    } else {
      unlockedTitles = [];
    }

    activeRun = null;
  }

  return {
    getBiomeForFloor,
    isMilestoneFloor,
    getMilestoneBossId,
    getFloorStatScale,
    rollFloorAffixes,
    startRun,
    clearFloor,
    advanceFloor,
    calculateFloorEmblems,
    isCheckpointUnlocked,
    getUnlockedCheckpoints,
    getHighestFloor,
    getActiveRun,
    getEmblems,
    getUnlockedTitles,
    spendEmblems,
    endRun,
    serialize,
    deserialize,
  };
}
