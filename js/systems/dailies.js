// js/systems/dailies.js - Daily and weekly rotating challenge system.

export const DailiesSystem = {
  createDefaultState() {
    return {
      lastRollDate: null,
      activeDailies: [],
      claimedDailies: {},
    };
  },

  getCurrentDayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  },

  checkAndRefreshDailies(state, challengePool) {
    const today = this.getCurrentDayKey();
    if (state.lastRollDate !== today) {
      state.lastRollDate = today;
      state.activeDailies = this.rollDailies(challengePool, 3);
      state.claimedDailies = {};
      return true;
    }
    return false;
  },

  rollDailies(pool, count = 3) {
    if (!pool || pool.length === 0) return [];
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count).map(task => ({
      ...task,
      progress: 0,
      completed: false,
    }));
  },

  updateProgress(state, challengeType, targetId, amount = 1) {
    if (!state || !state.activeDailies) return;
    for (const daily of state.activeDailies) {
      if (daily.type === challengeType && daily.targetId === targetId && !daily.completed) {
        daily.progress = Math.min(daily.required, daily.progress + amount);
        if (daily.progress >= daily.required) {
          daily.completed = true;
        }
      }
    }
  }
};
