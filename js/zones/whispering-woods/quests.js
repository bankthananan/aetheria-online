// js/zones/whispering-woods/quests.js - Side quests and discovery tasks for Whispering Woods.

export const WHISPERING_WOODS_SIDE_QUESTS = {
  sq_ww_lost_scout: {
    id: 'sq_ww_lost_scout',
    name: 'The Lost Satchel',
    zone: 'whispering_woods',
    reqLevel: 4,
    description: 'Find Woodwatch Ilya’s dropped reconnaissance satchel along the Briar Trail.',
    type: 'explore',
    targetPOI: 'ww_poi_scout_satchel',
    reward: { exp: 350, zeny: 150, item: 'minor_potion' }
  },
  sq_ww_beetle_carapace: {
    id: 'sq_ww_beetle_carapace',
    name: 'Armor Reinforcement',
    zone: 'whispering_woods',
    reqLevel: 6,
    description: 'Cull 6 Mossback Beetles to gather reinforced shell plates.',
    type: 'hunt',
    targetMob: 'mossback_beetle',
    count: 6,
    reward: { exp: 520, zeny: 200, item: 'blessed_ore' }
  },
  sq_ww_warren_purge: {
    id: 'sq_ww_warren_purge',
    name: 'Curb the Warrens',
    zone: 'whispering_woods',
    reqLevel: 10,
    description: 'Infiltrate the Goblin Warrens sub-dungeon and defeat the Goblin Chieftain.',
    type: 'hunt',
    targetMob: 'goblin_chieftain',
    count: 1,
    reward: { exp: 1200, zeny: 500, item: 'leather_vest' }
  },
  sq_ww_dryad_sorrow: {
    id: 'sq_ww_dryad_sorrow',
    name: 'Cleansing the Hollow',
    zone: 'whispering_woods',
    reqLevel: 13,
    description: 'Enter Elderwood Hollow and put the Corrupted Dryad to rest.',
    type: 'hunt',
    targetMob: 'corrupted_dryad',
    count: 1,
    reward: { exp: 1500, zeny: 650, item: 'iron_helm' }
  }
};
