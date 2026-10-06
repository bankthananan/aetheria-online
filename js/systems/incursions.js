// js/systems/incursions.js
// World Event Rifts & Dimensional Incursions Subsystem.
// Manages emergent dimensional tears, 3-wave incursion defense events,
// void mutators, Elite Heralds, and Dimensional Cache reward scaling.

export const INCURSION_STATES = {
  IDLE: 'IDLE',
  TEAR_OPEN: 'TEAR_OPEN',
  INCURSION_ACTIVE: 'INCURSION_ACTIVE',
  SEALED: 'SEALED',
  COLLAPSED: 'COLLAPSED',
};

export const MUTATORS = {
  void_decay: {
    id: 'void_decay',
    name: 'Void Decay',
    icon: '🟣',
    desc: 'Dimensional entropy creates decaying ground patches.',
  },
  graviton_well: {
    id: 'graviton_well',
    name: 'Graviton Well',
    icon: '🌀',
    desc: 'The rift pulls all nearby entities towards the vortex singularity.',
  },
  primal_instability: {
    id: 'primal_instability',
    name: 'Primal Instability',
    icon: '⚡',
    desc: 'Incursion monsters deal +20% bonus elemental damage matching active weather.',
  },
  phase_shift: {
    id: 'phase_shift',
    name: 'Phase Shift',
    icon: '🌌',
    desc: 'Void entities periodically slip into the ether, ignoring strikes.',
  },
};

export const WAVE_TEMPLATES = [
  { wave: 1, monsters: ['void_wisp', 'void_wisp', 'void_wisp'] },
  { wave: 2, monsters: ['void_stalker', 'void_stalker', 'void_stalker'] },
  { wave: 3, monsters: ['void_herald', 'void_stalker', 'void_stalker'] },
];

const PRIMAL_RUNES = [
  'rune_ember',
  'rune_glacial',
  'rune_storm',
  'rune_verdant',
  'rune_luminous',
  'rune_umbral',
];

export function createIncursionSystem({
  now = () => Date.now(),
  rnd = Math.random,
} = {}) {
  const BASE_COOLDOWN_MS = 480000;      // 8 minutes
  const TEAR_DURATION_MS = 120000;      // 2 minutes
  const INCURSION_DURATION_MS = 90000;  // 90 seconds

  let state = INCURSION_STATES.IDLE;
  let cooldownRemainingMs = BASE_COOLDOWN_MS;
  let currentTear = null;
  let activeIncursion = null;
  let lastRewardCache = null;

  function getState() {
    return state;
  }

  function getCooldownRemaining() {
    return Math.max(0, cooldownRemainingMs);
  }

  function resetToIdle() {
    state = INCURSION_STATES.IDLE;
    cooldownRemainingMs = BASE_COOLDOWN_MS;
    currentTear = null;
    activeIncursion = null;
    lastRewardCache = null;
  }

  function pickRandomMutator() {
    const keys = Object.keys(MUTATORS);
    const key = keys[Math.floor(rnd() * keys.length)];
    return MUTATORS[key];
  }

  function triggerTear({ mapId, x, y }) {
    state = INCURSION_STATES.TEAR_OPEN;
    currentTear = {
      mapId,
      x,
      y,
      createdAt: now(),
      expiresAt: now() + TEAR_DURATION_MS,
      mutator: pickRandomMutator(),
    };
    activeIncursion = null;
    lastRewardCache = null;
    return currentTear;
  }

  function startIncursion() {
    if (state !== INCURSION_STATES.TEAR_OPEN || !currentTear) {
      return null;
    }

    state = INCURSION_STATES.INCURSION_ACTIVE;
    const wave = 1;
    activeIncursion = {
      mapId: currentTear.mapId,
      x: currentTear.x,
      y: currentTear.y,
      mutator: currentTear.mutator,
      currentWave: wave,
      waveMonsterIds: [...WAVE_TEMPLATES[wave - 1].monsters],
      startedAt: now(),
      expiresAt: now() + INCURSION_DURATION_MS,
      timeRemainingMs: INCURSION_DURATION_MS,
    };
    return activeIncursion;
  }

  function checkWaveClear(activeMonsters = []) {
    if (state !== INCURSION_STATES.INCURSION_ACTIVE) return false;
    // Cleared if no monsters remain alive
    const aliveCount = activeMonsters.filter(m => m && m.alive).length;
    return aliveCount === 0;
  }

  function advanceWave() {
    if (state !== INCURSION_STATES.INCURSION_ACTIVE || !activeIncursion) {
      return null;
    }
    if (activeIncursion.currentWave < 3) {
      activeIncursion.currentWave += 1;
      activeIncursion.waveMonsterIds = [...WAVE_TEMPLATES[activeIncursion.currentWave - 1].monsters];
    }
    return activeIncursion;
  }

  function generateCacheLoot() {
    const zeny = 2500 + Math.floor(rnd() * 2500); // 2500 - 5000 Zeny
    const shardCount = 3 + Math.floor(rnd() * 4); // 3 - 6 Shards
    const runeCount = 1 + (rnd() < 0.4 ? 1 : 0);  // 1 - 2 Runes
    const runes = [];
    for (let i = 0; i < runeCount; i++) {
      const rid = PRIMAL_RUNES[Math.floor(rnd() * PRIMAL_RUNES.length)];
      runes.push(rid);
    }

    const matPool = [
      { id: 'wolf_fang', qty: 5 },
      { id: 'star_iron', qty: 4 },
      { id: 'blessed_ore', qty: 2 },
    ];
    const matPick = matPool[Math.floor(rnd() * matPool.length)];

    return {
      zeny,
      materials: [
        { id: 'dimensional_shard', qty: shardCount },
        matPick,
      ],
      runes,
    };
  }

  function sealIncursion() {
    if (state !== INCURSION_STATES.INCURSION_ACTIVE) return null;
    state = INCURSION_STATES.SEALED;
    const cache = generateCacheLoot();
    lastRewardCache = {
      x: activeIncursion ? activeIncursion.x : 0,
      y: activeIncursion ? activeIncursion.y : 0,
      cache,
    };
    cooldownRemainingMs = BASE_COOLDOWN_MS;
    return lastRewardCache;
  }

  function collapseIncursion() {
    state = INCURSION_STATES.COLLAPSED;
    activeIncursion = null;
    currentTear = null;
    cooldownRemainingMs = BASE_COOLDOWN_MS;
    return true;
  }

  function tick(dt = 0, { activeMapId = '', isIntenseWeather = false } = {}) {
    const dtMs = dt * 1000;
    const currentTime = now();

    if (state === INCURSION_STATES.IDLE) {
      // Weather surge halves cooldown (decrement tick is 2x faster)
      const multiplier = isIntenseWeather ? 2.0 : 1.0;
      cooldownRemainingMs -= dtMs * multiplier;
      if (cooldownRemainingMs <= 0) {
        cooldownRemainingMs = 0;
      }
    } else if (state === INCURSION_STATES.TEAR_OPEN && currentTear) {
      if (currentTime >= currentTear.expiresAt) {
        // Tear dissolved without interaction
        resetToIdle();
      }
    } else if (state === INCURSION_STATES.INCURSION_ACTIVE && activeIncursion) {
      activeIncursion.timeRemainingMs = Math.max(0, activeIncursion.expiresAt - currentTime);
      if (activeIncursion.timeRemainingMs <= 0) {
        collapseIncursion();
      }
    }
  }

  function getCurrentTear() {
    return currentTear;
  }

  function getActiveIncursion() {
    return activeIncursion;
  }

  function getLastRewardCache() {
    return lastRewardCache;
  }

  function serialize() {
    return {
      state,
      cooldownRemainingMs,
      currentTear,
      activeIncursion,
    };
  }

  function deserialize(data) {
    if (!data) return;
    state = data.state || INCURSION_STATES.IDLE;
    cooldownRemainingMs = typeof data.cooldownRemainingMs === 'number' ? data.cooldownRemainingMs : BASE_COOLDOWN_MS;
    currentTear = data.currentTear || null;
    activeIncursion = data.activeIncursion || null;
  }

  return {
    getState,
    getCooldownRemaining,
    resetToIdle,
    triggerTear,
    startIncursion,
    checkWaveClear,
    advanceWave,
    generateCacheLoot,
    sealIncursion,
    collapseIncursion,
    tick,
    getCurrentTear,
    getActiveIncursion,
    getLastRewardCache,
    serialize,
    deserialize,
  };
}
