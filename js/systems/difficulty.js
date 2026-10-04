// js/systems/difficulty.js - Scaling multipliers, difficulty modes, and reward scaling.

import { DESIGN } from '../design.js';
export const DIFFICULTY_TIERS = DESIGN.tuning.zoneDifficulty;

export const DifficultySystem = {
  getTier(tierKey) {
    return DIFFICULTY_TIERS[tierKey?.toUpperCase()] || DIFFICULTY_TIERS.NORMAL;
  },

  scaleStats(baseStats, tierKey) {
    const tier = this.getTier(tierKey);
    return {
      ...baseStats,
      maxHp: Math.round(baseStats.maxHp * tier.hpMult),
      hp: Math.round(baseStats.hp * tier.hpMult),
      atk: Math.round(baseStats.atk * tier.atkMult),
      def: Math.round(baseStats.def * tier.defMult),
      exp: Math.round(baseStats.exp * tier.expMult),
      difficultyTier: tier.id,
    };
  }
};
