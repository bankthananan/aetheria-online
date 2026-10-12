// js/systems/gathering.js - Open-World Resource Gathering & 1-Tap Fishing Subsystem.
// Controls biome-specific herb & ore nodes, day/night and weather spawning rules,
// harvest cooldowns, and the oscillating needle fishing reaction mini-game.

export const NODE_TYPES = {
  HERB: 'herb',
  ORE: 'ore',
  WATER_RIPPLE: 'water_ripple',
};

export const HERB_CATALOG = {
  silverleaf: {
    id: 'silverleaf',
    name: 'Silverleaf',
    type: NODE_TYPES.HERB,
    icon: '🌿',
    rarity: 'common',
    desc: 'A humble silver-veined medicinal leaf found commonly in temperate fields.',
  },
  frost_lily: {
    id: 'frost_lily',
    name: 'Frost Lily',
    type: NODE_TYPES.HERB,
    icon: '❄️',
    rarity: 'uncommon',
    desc: 'A delicate crystalline blossom that only thrives in frigid sub-zero permafrost.',
  },
  ember_blossom: {
    id: 'ember_blossom',
    name: 'Ember Blossom',
    type: NODE_TYPES.HERB,
    icon: '🔥',
    rarity: 'rare',
    desc: 'A fiery botanical bloom growing in the scorched crust near volcanic vents.',
  },
  sunken_kelp: {
    id: 'sunken_kelp',
    name: 'Sunken Kelp',
    type: NODE_TYPES.HERB,
    icon: '🌾',
    rarity: 'uncommon',
    desc: 'Deep marine kelp harvested from submerged ruins and flooded halls.',
  },
  moonlight_lotus: {
    id: 'moonlight_lotus',
    name: 'Moonlight Lotus',
    type: NODE_TYPES.HERB,
    icon: '🪷',
    rarity: 'rare',
    desc: 'An ethereal nocturnal flower that unfurls its luminescent petals only beneath starry night skies.',
  },
};

export const ORE_CATALOG = {
  copper_ore: {
    id: 'copper_ore',
    name: 'Copper Ore',
    type: NODE_TYPES.ORE,
    icon: '⛏️',
    rarity: 'common',
    desc: 'Malleable metallic ore essential for early smithing and alchemy vessels.',
  },
  iron_vein: {
    id: 'iron_vein',
    name: 'Iron Vein',
    type: NODE_TYPES.ORE,
    icon: '🪨',
    rarity: 'uncommon',
    desc: 'Dense iron-rich deposit prized for reinforced metallurgy and warded defenses.',
  },
  caldera_crystal: {
    id: 'caldera_crystal',
    name: 'Caldera Crystal',
    type: NODE_TYPES.ORE,
    icon: '💎',
    rarity: 'rare',
    desc: 'Geothermally compressed crystal pulsating with concentrated elemental heat.',
  },
  voidstone_ore: {
    id: 'voidstone_ore',
    name: 'Voidstone Ore',
    type: NODE_TYPES.ORE,
    icon: '🌑',
    rarity: 'rare',
    desc: 'Resonating dark mineral mined from astral fissures.',
  },
  pyrite_ore: {
    id: 'pyrite_ore',
    name: 'Pyrite Ore',
    type: NODE_TYPES.ORE,
    icon: '✨',
    rarity: 'common',
    desc: "Glinting fool's gold vein rich in sulfur compounds.",
  },
  silicon_crystal: {
    id: 'silicon_crystal',
    name: 'Silicon Crystal',
    type: NODE_TYPES.ORE,
    icon: '💎',
    rarity: 'uncommon',
    desc: 'Semi-conductive crystalline strata formed under intense cold pressure.',
  },
};

export const FISH_CATALOG = {
  glowing_trout: {
    id: 'glowing_trout',
    name: 'Glowing Trout',
    type: 'fish',
    icon: '🐟',
    rarity: 'common',
    desc: 'Freshwater forest trout with bioluminescent scales.',
  },
  abyssal_bass: {
    id: 'abyssal_bass',
    name: 'Abyssal Bass',
    type: 'fish',
    icon: '🐡',
    rarity: 'uncommon',
    desc: 'Deep-swimming predatory bass harvested from sunken abbey waters.',
  },
  glacial_salmon: {
    id: 'glacial_salmon',
    name: 'Glacial Salmon',
    type: 'fish',
    icon: '🐟',
    rarity: 'uncommon',
    desc: 'Fatty, nutrient-rich arctic salmon thriving in sub-zero currents.',
  },
  magma_koi: {
    id: 'magma_koi',
    name: 'Magma Koi',
    type: 'fish',
    icon: '🐠',
    rarity: 'rare',
    desc: 'Exotic heat-resistant fish swimming in superheated thermal vents.',
  },
  stormfin: {
    id: 'stormfin',
    name: 'Stormfin',
    type: 'fish',
    icon: '⚡',
    rarity: 'rare',
    desc: 'Charged electro-aquatic fish that surfaces exclusively during storm downpours.',
  },
  golden_carp: {
    id: 'golden_carp',
    name: 'Golden Carp',
    type: 'fish',
    icon: '✨',
    rarity: 'legendary',
    desc: 'Legendary radiant fish of fortune with razor-sharp reflexes and peerless flavor.',
  },
  cosmic_jellyfish: {
    id: 'cosmic_jellyfish',
    name: 'Cosmic Jellyfish',
    type: 'fish',
    icon: '🪼',
    rarity: 'rare',
    desc: 'Translucent creature drifting across the astral fabric.',
  },
  void_ray: {
    id: 'void_ray',
    name: 'Void Ray',
    type: 'fish',
    icon: '🐟',
    rarity: 'uncommon',
    desc: 'Dark-finned ray gliding silently through gravity wells.',
  },
  spring_bass: {
    id: 'spring_bass',
    name: 'Spring Bass',
    type: 'fish',
    icon: '🐠',
    rarity: 'common',
    desc: 'Plump freshwater bass raised in homestead garden ponds.',
  },
};

export const STORM_WEATHER_IDS = ['verdant_rain', 'stellar_drift', 'cosmic_eclipse'];

export const MAP_BASE_FISH = {
  whispering_woods: 'glowing_trout',
  sunken_ruins: 'abyssal_bass',
  frostpeak_tundra: 'glacial_salmon',
  dragon_caldera: 'magma_koi',
  astral_rift: 'void_ray',
  player_homestead: 'spring_bass',
};

export const HARVEST_RESPAWN_MS = 60000;

export const MAP_RESOURCE_NODES = {
  whispering_woods: [
    { id: 'node_ww_silverleaf_1', mapId: 'whispering_woods', type: NODE_TYPES.HERB, resourceId: 'silverleaf', x: 14, y: 12 },
    { id: 'node_ww_silverleaf_2', mapId: 'whispering_woods', type: NODE_TYPES.HERB, resourceId: 'silverleaf', x: 28, y: 22 },
    { id: 'node_ww_copper_1', mapId: 'whispering_woods', type: NODE_TYPES.ORE, resourceId: 'copper_ore', x: 30, y: 18 },
    { id: 'node_ww_ripple_1', mapId: 'whispering_woods', type: NODE_TYPES.WATER_RIPPLE, resourceId: 'glowing_trout', x: 22, y: 8 },
    { id: 'node_ww_moonlight_1', mapId: 'whispering_woods', type: NODE_TYPES.HERB, resourceId: 'moonlight_lotus', x: 18, y: 24, nightOnly: true },
  ],
  sunken_ruins: [
    { id: 'node_sr_kelp_1', mapId: 'sunken_ruins', type: NODE_TYPES.HERB, resourceId: 'sunken_kelp', x: 8, y: 14 },
    { id: 'node_sr_iron_1', mapId: 'sunken_ruins', type: NODE_TYPES.ORE, resourceId: 'iron_vein', x: 24, y: 12 },
    { id: 'node_sr_ripple_1', mapId: 'sunken_ruins', type: NODE_TYPES.WATER_RIPPLE, resourceId: 'abyssal_bass', x: 5, y: 19 },
  ],
  frostpeak_tundra: [
    { id: 'node_ft_lily_1', mapId: 'frostpeak_tundra', type: NODE_TYPES.HERB, resourceId: 'frost_lily', x: 12, y: 14 },
    { id: 'node_ft_iron_1', mapId: 'frostpeak_tundra', type: NODE_TYPES.ORE, resourceId: 'iron_vein', x: 32, y: 16 },
    { id: 'node_ft_ripple_1', mapId: 'frostpeak_tundra', type: NODE_TYPES.WATER_RIPPLE, resourceId: 'glacial_salmon', x: 21, y: 7 },
  ],
  dragon_caldera: [
    { id: 'node_dc_ember_1', mapId: 'dragon_caldera', type: NODE_TYPES.HERB, resourceId: 'ember_blossom', x: 16, y: 14 },
    { id: 'node_dc_crystal_1', mapId: 'dragon_caldera', type: NODE_TYPES.ORE, resourceId: 'caldera_crystal', x: 28, y: 18 },
    { id: 'node_dc_ripple_1', mapId: 'dragon_caldera', type: NODE_TYPES.WATER_RIPPLE, resourceId: 'magma_koi', x: 22, y: 10 },
  ],
  astral_rift: [
    { id: 'node_ar_voidstone_1', mapId: 'astral_rift', type: NODE_TYPES.ORE, resourceId: 'voidstone_ore', x: 12, y: 10 },
    { id: 'node_ar_ripple_1', mapId: 'astral_rift', type: NODE_TYPES.WATER_RIPPLE, resourceId: 'cosmic_jellyfish', x: 26, y: 14 },
    { id: 'node_ar_ripple_2', mapId: 'astral_rift', type: NODE_TYPES.WATER_RIPPLE, resourceId: 'void_ray', x: 34, y: 22 },
  ],
  player_homestead: [
    { id: 'node_hs_quarry_1', mapId: 'player_homestead', type: NODE_TYPES.ORE, resourceId: 'copper_ore', x: 18, y: 6 },
    { id: 'node_hs_pond_1', mapId: 'player_homestead', type: NODE_TYPES.WATER_RIPPLE, resourceId: 'spring_bass', x: 8, y: 14 },
  ],
  ww_goblin_cave: [
    { id: 'node_gc_iron_1', mapId: 'ww_goblin_cave', type: NODE_TYPES.ORE, resourceId: 'iron_vein', x: 10, y: 8 },
  ],
  sr_drowned_catacombs: [
    { id: 'node_sr_pyrite_1', mapId: 'sr_drowned_catacombs', type: NODE_TYPES.ORE, resourceId: 'pyrite_ore', x: 12, y: 8 },
  ],
  ft_glacial_chasm: [
    { id: 'node_ft_silicon_1', mapId: 'ft_glacial_chasm', type: NODE_TYPES.ORE, resourceId: 'silicon_crystal', x: 10, y: 8 },
  ],
  dc_obsidian_foundry: [
    { id: 'node_dc_crystal_1', mapId: 'dc_obsidian_foundry', type: NODE_TYPES.ORE, resourceId: 'caldera_crystal', x: 12, y: 10 },
  ],
};

// Global lookup of all authored nodes by id
const ALL_AUTHORED_NODES = new Map();
for (const [mapId, nodes] of Object.entries(MAP_RESOURCE_NODES)) {
  for (const node of nodes) {
    ALL_AUTHORED_NODES.set(node.id, { ...node, mapId });
  }
}

export function createGatheringSystem({ now = Date.now, rnd = Math.random } = {}) {
  // Map of nodeId -> { harvested: boolean, cooldownRemainingMs: number }
  const nodeStates = new Map();
  let activeFishing = null;

  function getNodeState(nodeId) {
    let state = nodeStates.get(nodeId);
    if (!state) {
      state = { harvested: false, cooldownRemainingMs: 0 };
      nodeStates.set(nodeId, state);
    }
    return state;
  }

  function getNodesForMap(mapId, { dayPhase = 0.2, weatherId = 'clear' } = {}) {
    const authored = MAP_RESOURCE_NODES[mapId] || [];
    const results = [];

    for (const node of authored) {
      // moonlight_lotus only active when dayPhase >= 0.45 && dayPhase <= 0.90
      if (node.resourceId === 'moonlight_lotus' || node.nightOnly) {
        if (dayPhase < 0.45 || dayPhase > 0.90) {
          continue;
        }
      }

      const state = getNodeState(node.id);
      results.push({
        id: node.id,
        mapId,
        type: node.type,
        resourceId: node.resourceId,
        x: node.x,
        y: node.y,
        nightOnly: !!node.nightOnly,
        harvested: !!state.harvested,
        cooldownRemainingMs: state.cooldownRemainingMs,
      });
    }

    return results;
  }

  function harvestNode(nodeId, { dayPhase, precisionStrike = false } = {}) {
    const node = ALL_AUTHORED_NODES.get(nodeId);
    if (!node) return null;

    if (dayPhase !== undefined && (node.resourceId === 'moonlight_lotus' || node.nightOnly)) {
      if (dayPhase < 0.45 || dayPhase > 0.90) {
        return null;
      }
    }

    const state = getNodeState(nodeId);
    if (state.harvested || state.cooldownRemainingMs > 0) {
      return null;
    }

    state.harvested = true;
    state.cooldownRemainingMs = HARVEST_RESPAWN_MS;

    if (node.type === NODE_TYPES.ORE) {
      const isPrecision = !!precisionStrike || (rnd() < 0.25);
      if (isPrecision) {
        return {
          success: true,
          precision: true,
          items: [
            { id: node.resourceId, qty: 2 },
            { id: 'blessed_ore', qty: 1 },
          ],
        };
      }
      return {
        success: true,
        precision: false,
        items: [{ id: node.resourceId, qty: 1 }],
      };
    }

    return {
      success: true,
      items: [{ id: node.resourceId, qty: 1 }],
    };
  }

  function startFishing(rippleId, { mapId, weatherId = 'clear', targetFish: forcedFish } = {}) {
    const node = ALL_AUTHORED_NODES.get(rippleId);
    const resolvedMapId = mapId || (node ? node.mapId : 'whispering_woods');

    if (node) {
      const state = getNodeState(rippleId);
      if (state.harvested || state.cooldownRemainingMs > 0) {
        return null;
      }
    }

    const baseFish = (node && node.resourceId && FISH_CATALOG[node.resourceId])
      ? node.resourceId
      : (MAP_BASE_FISH[resolvedMapId] || 'glowing_trout');

    let targetFish = forcedFish || null;
    if (!targetFish) {
      const isStorm = STORM_WEATHER_IDS.includes(weatherId);
      const roll = rnd();
      if (roll < 0.10) {
        targetFish = 'golden_carp';
      } else if (isStorm && roll < 0.40) {
        targetFish = 'stormfin';
      } else {
        targetFish = baseFish;
      }
    }

    const isGolden = targetFish === 'golden_carp';
    const sweetMin = isGolden ? 0.45 : 0.35;
    const sweetMax = isGolden ? 0.55 : 0.65;

    activeFishing = {
      active: true,
      rippleId,
      t: 0,
      speed: 3.0,
      needle: 0.5,
      sweetMin,
      sweetMax,
      targetFish,
    };

    return activeFishing;
  }

  function updateFishing(dt) {
    if (!activeFishing || !activeFishing.active) return;
    activeFishing.t += dt;
    activeFishing.needle = 0.5 + 0.48 * Math.sin(activeFishing.t * activeFishing.speed);
  }

  function resolveFishingCast() {
    if (!activeFishing || !activeFishing.active) {
      return { success: false, fishId: null };
    }

    const { needle, sweetMin, sweetMax, targetFish, rippleId } = activeFishing;
    const hit = needle >= sweetMin && needle <= sweetMax;

    if (hit) {
      if (rippleId) {
        const state = getNodeState(rippleId);
        state.harvested = true;
        state.cooldownRemainingMs = HARVEST_RESPAWN_MS;
      }
      const caughtFish = targetFish;
      activeFishing = null;
      return { success: true, fishId: caughtFish };
    } else {
      activeFishing = null;
      return { success: false, fishId: null };
    }
  }

  function cancelFishing() {
    activeFishing = null;
  }

  function getActiveFishing() {
    return activeFishing;
  }

  function tick(dt = 0, { activeMapId, dayPhase, weatherId } = {}) {
    const dtMs = dt >= 1000 ? dt : dt * 1000;
    const dtSec = dt >= 1000 ? dt / 1000 : dt;

    for (const state of nodeStates.values()) {
      if (state.harvested || state.cooldownRemainingMs > 0) {
        state.cooldownRemainingMs -= dtMs;
        if (state.cooldownRemainingMs <= 0) {
          state.cooldownRemainingMs = 0;
          state.harvested = false;
        }
      }
    }

    if (activeFishing && activeFishing.active) {
      updateFishing(dtSec);
    }
  }

  function serialize() {
    const nodes = {};
    for (const [id, state] of nodeStates.entries()) {
      if (state.harvested || state.cooldownRemainingMs > 0) {
        nodes[id] = {
          harvested: state.harvested,
          cooldownRemainingMs: state.cooldownRemainingMs,
        };
      }
    }
    return {
      version: 1,
      nodes,
      fishing: activeFishing ? { ...activeFishing } : null,
    };
  }

  function deserialize(data) {
    if (!data) return;
    nodeStates.clear();
    if (data.nodes && typeof data.nodes === 'object') {
      for (const [id, state] of Object.entries(data.nodes)) {
        nodeStates.set(id, {
          harvested: !!state.harvested,
          cooldownRemainingMs: Math.max(0, state.cooldownRemainingMs || 0),
        });
      }
    }
    if (data.fishing && data.fishing.active) {
      activeFishing = { ...data.fishing };
    } else {
      activeFishing = null;
    }
  }

  return {
    getNodesForMap,
    harvestNode,
    startFishing,
    updateFishing,
    resolveFishingCast,
    cancelFishing,
    getActiveFishing,
    tick,
    serialize,
    deserialize,
    getNodeState,
  };
}
