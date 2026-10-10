// js/systems/mastery.js - Zone mastery tracking and milestone perks.

export const MASTERY_RANKS = [
  { rank: 'bronze', reqPoints: 100, perk: 'moveSpeed_5', label: 'Move speed +5% in this zone', title: 'Bronze Explorer' },
  { rank: 'silver', reqPoints: 250, perk: 'dropRate_10', label: 'Drop rate +10% in this zone', title: 'Silver Pathdrifter' },
  { rank: 'gold',   reqPoints: 500, perk: 'freeTeleport', label: 'Free travel here from town', title: 'Gold Wanderer' },
  { rank: 'platinum', reqPoints: 1000, perk: 'globalExp_3', label: 'EXP +3% in every zone', title: 'Platinum Sovereign' },
];

export const MasterySystem = {
  createDefaultState() {
    return {
      zonePoints: {}, // zoneId -> number
      claimedRanks: {}, // zoneId -> { bronze: true, ... }
    };
  },

  addPoints(state, zoneId, points) {
    if (!state) return;
    state.zonePoints[zoneId] = (state.zonePoints[zoneId] || 0) + points;
  },

  getZoneRank(state, zoneId) {
    const pts = (state && state.zonePoints[zoneId]) || 0;
    let highest = null;
    for (const r of MASTERY_RANKS) {
      if (pts >= r.reqPoints) highest = r;
    }
    return highest;
  }
};
