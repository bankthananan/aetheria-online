// js/systems/exploration.js - Zone fog discovery, POIs, lore fragments, and milestone tracker.

export const ExplorationSystem = {
  createDefaultState() {
    return {
      discoveredTiles: {}, // mapId -> boolean[][] or string set "x,y"
      unlockedPOIs: {},    // mapId -> string[]
      loreFragments: [],   // string[]
      claimedMilestones: {}, // mapId -> { 25: true, 50: true, 75: true, 100: true }
    };
  },

  recordStep(state, mapId, x, y) {
    if (!state) return false;
    if (!state.discoveredTiles[mapId]) {
      state.discoveredTiles[mapId] = {};
    }
    const key = `${x},${y}`;
    if (!state.discoveredTiles[mapId][key]) {
      state.discoveredTiles[mapId][key] = true;
      return true; // newly discovered
    }
    return false;
  },

  getDiscoveryCount(state, mapId) {
    if (!state || !state.discoveredTiles[mapId]) return 0;
    return Object.keys(state.discoveredTiles[mapId]).length;
  },

  getExplorationPercentage(state, mapId, totalWalkableTiles) {
    if (!totalWalkableTiles || totalWalkableTiles <= 0) return 100;
    const count = this.getDiscoveryCount(state, mapId);
    return Math.min(100, Math.round((count / totalWalkableTiles) * 100));
  },

  unlockPOI(state, mapId, poiId) {
    if (!state) return false;
    if (!state.unlockedPOIs[mapId]) {
      state.unlockedPOIs[mapId] = [];
    }
    if (!state.unlockedPOIs[mapId].includes(poiId)) {
      state.unlockedPOIs[mapId].push(poiId);
      return true;
    }
    return false;
  },

  collectLore(state, fragmentId) {
    if (!state) return false;
    if (!state.loreFragments.includes(fragmentId)) {
      state.loreFragments.push(fragmentId);
      return true;
    }
    return false;
  }
};
