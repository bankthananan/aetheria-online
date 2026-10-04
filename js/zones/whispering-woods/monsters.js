// js/zones/whispering-woods/monsters.js - Monster definitions and variant tiers for Whispering Woods.

export const WHISPERING_WOODS_MONSTERS = {
  slime: {
    id: 'slime', name: 'Gel Slime', level: 2, hp: 75, atk: 10, def: 4, exp: 7,
    element: 'nature', drops: [{ id: 'slime_gel', chance: 0.70 }, { id: 'minor_potion', chance: 0.10 }]
  },
  goblin: {
    id: 'goblin', name: 'Scrap Goblin', level: 5, hp: 116, atk: 16, def: 6, exp: 37,
    element: 'neutral', drops: [{ id: 'goblin_ear', chance: 0.60 }, { id: 'worn_dagger', chance: 0.15 }]
  },
  goblin_scout: {
    id: 'goblin_scout', name: 'Goblin Scout', level: 6, hp: 125, atk: 18, def: 5, exp: 44,
    element: 'neutral', ranged: 3.5, drops: [{ id: 'goblin_ear', chance: 0.65 }, { id: 'minor_potion', chance: 0.20 }]
  },
  mossback_beetle: {
    id: 'mossback_beetle', name: 'Mossback Beetle', level: 7, hp: 145, atk: 19, def: 9, exp: 52,
    element: 'nature', drops: [{ id: 'slime_gel', chance: 0.40 }, { id: 'wolf_pelt', chance: 0.25 }]
  },
  wolf: {
    id: 'wolf', name: 'Dire Wolf', level: 9, hp: 170, atk: 23, def: 9, exp: 111,
    element: 'neutral', drops: [{ id: 'wolf_pelt', chance: 0.60 }, { id: 'wolf_fang', chance: 0.35 }]
  },
  blight_sprite: {
    id: 'blight_sprite', name: 'Blight Sprite', level: 10, hp: 160, atk: 28, def: 6, exp: 135,
    element: 'nature', ranged: 3.5, drops: [{ id: 'slime_gel', chance: 0.50 }, { id: 'mana_potion', chance: 0.25 }]
  },
  thornback_boar: {
    id: 'thornback_boar', name: 'Thornback Boar', level: 12, hp: 218, atk: 31, def: 12, exp: 190,
    element: 'nature', drops: [{ id: 'wolf_pelt', chance: 0.45 }, { id: 'mid_potion', chance: 0.15 }]
  },
  barkskin_warden: {
    id: 'barkskin_warden', name: 'Barkskin Warden', level: 13, hp: 280, atk: 34, def: 15, exp: 240,
    element: 'nature', drops: [{ id: 'wolf_pelt', chance: 0.50 }, { id: 'blessed_ore', chance: 0.10 }]
  },
  elderwood_treant: {
    id: 'elderwood_treant', name: 'Elderwood Treant', level: 15, hp: 1250, atk: 46, def: 18, exp: 1004,
    element: 'nature', isBoss: true, drops: [{ id: 'mid_potion', chance: 1.0 }, { id: 'blessed_ore', chance: 0.50 }, { id: 'leather_vest', chance: 0.35 }]
  },
  // Sub-dungeon exclusive monsters
  goblin_chieftain: {
    id: 'goblin_chieftain', name: 'Goblin Chieftain', level: 12, hp: 850, atk: 38, def: 14, exp: 520,
    element: 'neutral', isBoss: true, drops: [{ id: 'goblin_ear', chance: 1.0 }, { id: 'hero_blade', chance: 0.25 }]
  },
  corrupted_dryad: {
    id: 'corrupted_dryad', name: 'Corrupted Dryad', level: 14, hp: 980, atk: 42, def: 16, exp: 680,
    element: 'void', isBoss: true, drops: [{ id: 'shade_dust', chance: 1.0 }, { id: 'vitality_amulet', chance: 0.30 }]
  },
  fang_the_bloodwolf: {
    id: 'fang_the_bloodwolf', name: 'Fang, The Bloodwolf', level: 15, hp: 1400, atk: 48, def: 19, exp: 1200,
    element: 'neutral', isBoss: true, drops: [{ id: 'wolf_fang', chance: 1.0 }, { id: 'iron_boots', chance: 0.50 }]
  }
};
