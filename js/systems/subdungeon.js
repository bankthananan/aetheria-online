// js/systems/subdungeon.js - Instanced sub-dungeon state, entry, tracking, and exits.

export const SubdungeonSystem = {
  createDefaultState() {
    return {
      currentDungeonId: null,
      activeFloor: 1,
      parentPortal: null, // { mapId, x, y }
      clearedDungeons: {},
      bestTimes: {},
      killCounts: {},
      objectivesComplete: false,
    };
  },

  isInsideDungeon(dungeonState) {
    return !!(dungeonState && dungeonState.currentDungeonId);
  },

  getActiveDungeonId(dungeonState) {
    return dungeonState ? dungeonState.currentDungeonId : null;
  },

  enterDungeon(dungeonState, dungeonDef, parentCoords, time=Date.now()) {
    if (!dungeonState) return null;
    dungeonState.currentDungeonId = dungeonDef.id;
    dungeonState.activeFloor = 1;
    dungeonState.parentPortal = { ...parentCoords };
    dungeonState.killCounts = {};
    dungeonState.objectivesComplete = false;
    dungeonState.startTime = time;
    return dungeonState;
  },

  recordKill(dungeonState, monsterKey) {
    if (!this.isInsideDungeon(dungeonState)) return;
    dungeonState.killCounts[monsterKey] = (dungeonState.killCounts[monsterKey] || 0) + 1;
  },

  completeDungeon(dungeonState, dungeonId, time=Date.now()) {
    if (!dungeonState) return;
    dungeonState.clearedDungeons[dungeonId] = true;
    dungeonState.objectivesComplete = true;
    if (Number.isFinite(dungeonState.startTime)) {
      const elapsedSec = Math.max(0,Math.floor((time - dungeonState.startTime) / 1000));
      const prevBest = dungeonState.bestTimes[dungeonId];
      if (prevBest === undefined || elapsedSec < prevBest) {
        dungeonState.bestTimes[dungeonId] = elapsedSec;
      }
    }
  },

  exitDungeon(dungeonState) {
    if (!dungeonState) return null;
    const returnPortal = dungeonState.parentPortal;
    dungeonState.currentDungeonId = null;
    dungeonState.parentPortal = null;
    dungeonState.objectivesComplete = false;
    return returnPortal;
  }
};
