// js/systems/rare-spawns.js - Timed and kill-threshold based elite spawns.

export const RareSpawnsSystem = {
  createDefaultState() {
    return {
      killCounters: {},  // zoneId:monsterKey -> count
      lastSpawnTimes: {}, // zoneId:rareKey -> timestamp
      activeRares: {},    // zoneId -> rareDef
    };
  },

  registerKill(state, zoneId, monsterKey, rareDefs) {
    if (!state || !rareDefs) return null;
    const key = `${zoneId}:${monsterKey}`;
    state.killCounters[key] = (state.killCounters[key] || 0) + 1;

    for (const rare of rareDefs) {
      if (rare.triggerMob === monsterKey && rare.killThreshold) {
        const last=state.lastSpawnTimes[`${zoneId}:${rare.id}`];
        if (state.killCounters[key] >= rare.killThreshold && !state.activeRares[zoneId] && (last===undefined || Date.now()-last>=(rare.respawnTimerMs||0))) {
          state.killCounters[key] = 0; // reset counter
          state.activeRares[zoneId] = rare;
          state.lastSpawnTimes[`${zoneId}:${rare.id}`] = Date.now();
          return rare;
        }
      }
    }
    return null;
  },

  clearRare(state, zoneId) {
    if (!state || !state.activeRares) return;
    delete state.activeRares[zoneId];
  },

  getActiveRare(state, zoneId) {
    return (state && state.activeRares && state.activeRares[zoneId]) || null;
  }
};
