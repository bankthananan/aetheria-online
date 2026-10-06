// js/systems/weather.js - Dynamic World Weather & Environmental Affinities Subsystem.
// Controls biome-specific weather cycling, elemental affinity multipliers, combat modifiers, and aggro range scaling.

export const WEATHER_CATALOG = {
  clear: {
    id: 'clear',
    name: 'Clear Skies',
    icon: '☀️',
    desc: 'Mild atmospheric conditions across the realm.',
    affinities: {},
    combat: {},
    aggroMult: 1.0,
  },
  verdant_rain: {
    id: 'verdant_rain',
    name: 'Verdant Downpour',
    icon: '🌧️',
    desc: 'Heavy rains empower nature and lightning.',
    affinities: { nature: 1.20, lightning: 1.20 },
    combat: { chainBonus: 1 },
    aggroMult: 1.0,
  },
  whispering_mist: {
    id: 'whispering_mist',
    name: 'Whispering Mist',
    icon: '🌫️',
    desc: 'Dense fog conceals movement and obscures vision.',
    affinities: { holy: 1.15 },
    combat: { fleeFlat: 15, holyPct: 15 },
    aggroMult: 0.75,
  },
  biting_blizzard: {
    id: 'biting_blizzard',
    name: 'Biting Blizzard',
    icon: '❄️',
    desc: 'Freezing gales empower ice and chill foes.',
    affinities: { ice: 1.25 },
    combat: { slowBonusMs: 1000 },
    aggroMult: 1.0,
  },
  diamond_dust: {
    id: 'diamond_dust',
    name: 'Diamond Dust',
    icon: '✨',
    desc: 'Crystalline air heightens magical focus and critical strikes.',
    affinities: {},
    combat: { critPct: 10, magicAtkPct: 10, mpCostMult: 0.8 },
    aggroMult: 1.0,
  },
  ashfall: {
    id: 'ashfall',
    name: 'Volcanic Ashfall',
    icon: '🌋',
    desc: 'Choking ash empowers flames and amplifies burns.',
    affinities: { fire: 1.25 },
    combat: { defPct: -10, burnTickMult: 1.3 },
    aggroMult: 1.0,
  },
  heatwave: {
    id: 'heatwave',
    name: 'Solar Flare',
    icon: '🔥',
    desc: 'Blistering solar heat ignites foes and stifles ice.',
    affinities: { fire: 1.30, ice: 0.85 },
    combat: { burnProcChance: 0.2 },
    aggroMult: 1.0,
  },
  cosmic_eclipse: {
    id: 'cosmic_eclipse',
    name: 'Cosmic Eclipse',
    icon: '🌑',
    desc: 'Cosmic shadows strengthen void arts and awaken rare horrors.',
    affinities: { void: 1.25, holy: 1.25 },
    combat: { rareSpawnMult: 2.0, expMult: 1.15 },
    aggroMult: 1.0,
  },
  stellar_drift: {
    id: 'stellar_drift',
    name: 'Stellar Drift',
    icon: '🌌',
    desc: 'Starlight showers accelerate physical and spiritual recovery.',
    affinities: {},
    combat: { regenMult: 2.0, critDmgMult: 1.2 },
    aggroMult: 1.0,
  },
};

export const BIOME_WEATHER_POOLS = {
  town_awakening: ['clear'],
  whispering_woods: ['clear', 'verdant_rain', 'whispering_mist'],
  ww_goblin_cave: ['clear', 'whispering_mist'],
  ww_elder_hollow: ['clear', 'whispering_mist'],
  sunken_ruins: ['clear', 'verdant_rain', 'whispering_mist'],
  frostpeak_tundra: ['clear', 'biting_blizzard', 'diamond_dust'],
  dragon_caldera: ['clear', 'ashfall', 'heatwave'],
  astral_rift: ['clear', 'cosmic_eclipse', 'stellar_drift'],
  celestial_rift: ['clear', 'cosmic_eclipse', 'stellar_drift'],
};

export function createWeatherSystem({
  now = () => performance.now(),
  rnd = Math.random,
  cycleDurationMs = 180000, // 3 minutes per weather cycle
} = {}) {
  // Map ID -> { weatherId, nextTransitionAt }
  const mapStates = new Map();

  function getPool(mapId) {
    return BIOME_WEATHER_POOLS[mapId] || ['clear'];
  }

  function rollNextWeather(mapId, currentId) {
    const pool = getPool(mapId);
    if (pool.length <= 1) return pool[0] || 'clear';
    const candidates = pool.filter(id => id !== currentId);
    const chosen = candidates[Math.floor(rnd() * candidates.length)] || pool[0];
    return chosen;
  }

  function ensureMapState(mapId) {
    let state = mapStates.get(mapId);
    if (!state) {
      const pool = getPool(mapId);
      const initialId = pool[0] || 'clear';
      state = {
        weatherId: initialId,
        nextTransitionAt: now() + cycleDurationMs,
      };
      mapStates.set(mapId, state);
    }
    return state;
  }

  function getWeather(mapId) {
    const state = ensureMapState(mapId);
    return WEATHER_CATALOG[state.weatherId] || WEATHER_CATALOG.clear;
  }

  function update(dt, mapId) {
    if (!mapId) return;
    const state = ensureMapState(mapId);
    const t = now();
    if (t >= state.nextTransitionAt) {
      state.weatherId = rollNextWeather(mapId, state.weatherId);
      state.nextTransitionAt = t + cycleDurationMs;
    }
  }

  function getAffinityMultiplier(element, mapId) {
    if (!element || !mapId) return 1.0;
    const weather = getWeather(mapId);
    if (!weather || !weather.affinities) return 1.0;
    return weather.affinities[element] ?? 1.0;
  }

  function getCombatModifiers(mapId) {
    const weather = getWeather(mapId);
    return weather?.combat || {};
  }

  function getAggroRangeMult(mapId) {
    const weather = getWeather(mapId);
    return weather?.aggroMult ?? 1.0;
  }

  function setWeatherOverride(mapId, weatherId) {
    if (!mapId || !WEATHER_CATALOG[weatherId]) return;
    const state = ensureMapState(mapId);
    state.weatherId = weatherId;
    state.nextTransitionAt = now() + cycleDurationMs;
  }

  return {
    getWeather,
    update,
    getAffinityMultiplier,
    getCombatModifiers,
    getAggroRangeMult,
    setWeatherOverride,
  };
}
