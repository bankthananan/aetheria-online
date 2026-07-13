// Game Database for RPG
// Contains: Biomes/Maps, Monsters, Classes, Skills, Items, Quests

export const BIOMES = {
  prontera: {
    id: 'prontera',
    name: 'Prontera Fields',
    bgColor: '#4a8505',
    gridColor: 'rgba(255, 255, 255, 0.08)',
    baseTile: 'grass',
    difficulty: 'Novice to Tier 1',
    description: 'A serene green field populated by low-level creatures. Ideal for beginners.',
    musicTheme: 'cheerful',
    colorTheme: { ground: '#60a5fa', overlay: 'rgba(74, 133, 5, 0.2)' },
    monsterSpawns: ['poring', 'fabre', 'lunatic', 'chongchong'],
    gatheringNodes: ['wood_log', 'red_herb'],
    npcNames: ['Guildmaster Roy', 'Healer Kafra', 'Adventurer Zack'],
  },
  payon: {
    id: 'payon',
    name: 'Payon Forest',
    bgColor: '#1c3d18',
    gridColor: 'rgba(255, 255, 255, 0.06)',
    baseTile: 'forest',
    difficulty: 'Tier 1 to Tier 2',
    description: 'A dense bamboo forest inhabited by aggressive nature spirits and skeletons.',
    musicTheme: 'mystical',
    colorTheme: { ground: '#0f172a', overlay: 'rgba(28, 61, 24, 0.3)' },
    monsterSpawns: ['spore', 'wilow', 'archer_skeleton', 'poporing'],
    gatheringNodes: ['bamboo_shoot', 'blue_herb'],
    npcNames: ['Hunter Rin', 'Alchemist Dan'],
  },
  sograt: {
    id: 'sograt',
    name: 'Sograt Desert',
    bgColor: '#d4a373',
    gridColor: 'rgba(0, 0, 0, 0.05)',
    baseTile: 'sand',
    difficulty: 'Tier 2 to Tier 3',
    description: 'A scorching desert wasteland where sandstorms blow and deadly insects dwell.',
    musicTheme: 'desert',
    colorTheme: { ground: '#78350f', overlay: 'rgba(212, 163, 115, 0.15)' },
    monsterSpawns: ['muka', 'peco_peco', 'scorpion', 'pyramid_bat'],
    gatheringNodes: ['iron_ore', 'yellow_herb'],
    npcNames: ['Wanderer Jack', 'Merchant Ali'],
  },
  mjolnir: {
    id: 'mjolnir',
    name: 'Mjolnir Mountains',
    bgColor: '#e2e8f0',
    gridColor: 'rgba(0, 0, 0, 0.05)',
    baseTile: 'snow',
    difficulty: 'Tier 3 Peak',
    description: 'A treacherous icy mountain peak covered in snow. Home to fierce wolves and frost beasts.',
    musicTheme: 'epic',
    colorTheme: { ground: '#0f172a', overlay: 'rgba(226, 232, 240, 0.2)' },
    monsterSpawns: ['savage_babe', 'wolf', 'peco_peco_egg', 'frost_wind'],
    gatheringNodes: ['frost_crystal', 'gold_ore'],
    npcNames: ['Veteran Thor', 'Blacksmith Hilda'],
  },
  geffen: {
    id: 'geffen',
    name: 'Geffen Dungeon',
    bgColor: '#1e1b4b',
    gridColor: 'rgba(255, 255, 255, 0.05)',
    baseTile: 'stone',
    difficulty: 'Raid (All Classes)',
    description: 'A dark underground cavern filled with undead souls and demonic bosses.',
    musicTheme: 'creepy',
    colorTheme: { ground: '#020617', overlay: 'rgba(30, 27, 75, 0.4)' },
    monsterSpawns: ['zombie', 'familiar', 'soldier_skeleton', 'baphomet_jr'],
    gatheringNodes: ['dark_matter', 'rare_relic'],
    npcNames: ['Mage Vex', 'Paladin Luke'],
  },
  volcanic_hatchery: {
    id: 'volcanic_hatchery',
    name: 'Volcanic Hatchery',
    bgColor: '#7c2d12',
    gridColor: 'rgba(255, 100, 0, 0.12)',
    baseTile: 'lava',
    difficulty: 'Tier 3 Dragon (Lv 60+)',
    description: 'A scorching volcanic cavern where dragon eggs hatch and lava basilisks patrol the boiling rock.',
    musicTheme: 'volcanic',
    colorTheme: { ground: '#450a0a', overlay: 'rgba(220, 38, 38, 0.25)' },
    monsterSpawns: ['dragon_hatchling', 'lava_basilisk'],
    gatheringNodes: ['dragon_scale', 'iron_ore'],
    npcNames: ['Explorer Tira', 'Fire Sage Brun'],
    obstacles: [
      { type: 'lava', positions: [[3,3],[3,4],[3,5],[4,3],[12,8],[12,9],[13,8]] },
    ],
    mvpBoss: {
      id: 'red_fire_dragon',
      name: 'Red Fire Dragon',
      level: 80,
      maxHp: 120000,
      atk: 1800,
      def: 300,
      mdef: 200,
      flee: 120,
      exp: 80000,
      jobExp: 70000,
      color: '#dc2626',
      size: 42,
      behavior: 'mvp',
      type: 'dragon',
      drops: [
        { item: 'red_dragon_card', chance: 0.05 },
        { item: 'dragon_scale', chance: 1.0 },
        { item: 'oridecon', chance: 0.8 }
      ]
    }
  },
  dragon_peak: {
    id: 'dragon_peak',
    name: 'Dragon Peak',
    bgColor: '#0c4a6e',
    gridColor: 'rgba(147, 197, 253, 0.1)',
    baseTile: 'cloud',
    difficulty: 'Tier 3+ Dragon (Lv 70+)',
    description: 'A windswept mountain summit shrouded in storm clouds. Wyverns nest on the jagged crags.',
    musicTheme: 'dragon_peak',
    colorTheme: { ground: '#0f172a', overlay: 'rgba(14, 165, 233, 0.15)' },
    monsterSpawns: ['storm_wyvern'],
    gatheringNodes: ['frost_crystal', 'dragon_scale'],
    npcNames: ['Sky Warden Kara', 'Veteran Dragon Hunter Zenn'],
    obstacles: [
      { type: 'cloud', positions: [[2,2],[2,3],[13,10],[13,11],[14,10]] },
    ],
    mvpBoss: {
      id: 'golden_drake',
      name: 'Golden Drake',
      level: 85,
      maxHp: 150000,
      atk: 2100,
      def: 250,
      mdef: 280,
      flee: 200,
      exp: 100000,
      jobExp: 90000,
      color: '#eab308',
      size: 40,
      behavior: 'mvp',
      type: 'dragon',
      drops: [
        { item: 'golden_drake_card', chance: 0.05 },
        { item: 'dragon_scale', chance: 1.0 },
        { item: 'elunium', chance: 0.8 }
      ]
    }
  }
};

export const MONSTERS = {
  // Prontera
  poring: {
    id: 'poring',
    name: 'Poring',
    level: 1,
    maxHp: 50,
    atk: 5,
    def: 2,
    flee: 2,
    exp: 15,
    jobExp: 10,
    color: '#ff8a8a',
    size: 15,
    behavior: 'passive',
    drops: [{ item: 'jellopy', chance: 0.7 }, { item: 'red_herb', chance: 0.3 }, { item: 'poring_card', chance: 0.02 }]
  },
  fabre: {
    id: 'fabre',
    name: 'Fabre',
    level: 2,
    maxHp: 65,
    atk: 8,
    def: 3,
    flee: 3,
    exp: 20,
    jobExp: 15,
    color: '#a7f3d0',
    size: 14,
    behavior: 'passive',
    drops: [{ item: 'fluff', chance: 0.6 }, { item: 'feather', chance: 0.2 }]
  },
  lunatic: {
    id: 'lunatic',
    name: 'Lunatic',
    level: 3,
    maxHp: 80,
    atk: 10,
    def: 2,
    flee: 5,
    exp: 28,
    jobExp: 20,
    color: '#ffffff',
    size: 13,
    behavior: 'passive',
    drops: [{ item: 'clover', chance: 0.5 }, { item: 'carrot', chance: 0.4 }]
  },
  chongchong: {
    id: 'chongchong',
    name: 'Chongchong',
    level: 4,
    maxHp: 100,
    atk: 12,
    def: 4,
    flee: 8,
    exp: 35,
    jobExp: 25,
    color: '#93c5fd',
    size: 12,
    behavior: 'aggressive',
    drops: [{ item: 'insect_shell', chance: 0.6 }, { item: 'wing_fly', chance: 0.1 }]
  },
  
  // Payon
  spore: {
    id: 'spore',
    name: 'Spore',
    level: 12,
    maxHp: 400,
    atk: 28,
    def: 10,
    flee: 15,
    exp: 110,
    jobExp: 90,
    color: '#ea580c',
    size: 18,
    behavior: 'passive',
    drops: [{ item: 'mushroom_spore', chance: 0.5 }, { item: 'blue_herb', chance: 0.15 }]
  },
  wilow: {
    id: 'wilow',
    name: 'Coco Willow',
    level: 15,
    maxHp: 650,
    atk: 42,
    def: 15,
    flee: 20,
    exp: 180,
    jobExp: 140,
    color: '#854d0e',
    size: 22,
    behavior: 'aggressive',
    drops: [{ item: 'resin', chance: 0.4 }, { item: 'solid_trunk', chance: 0.2 }]
  },
  archer_skeleton: {
    id: 'archer_skeleton',
    name: 'Archer Skeleton',
    level: 22,
    maxHp: 1100,
    atk: 85,
    def: 22,
    flee: 30,
    exp: 390,
    jobExp: 310,
    color: '#cbd5e1',
    size: 16,
    behavior: 'aggressive',
    isRanged: true,
    drops: [{ item: 'deformed_bow', chance: 0.05 }, { item: 'iron_ore', chance: 0.3 }, { item: 'archer_skeleton_card', chance: 0.02 }]
  },
  poporing: {
    id: 'poporing',
    name: 'Poporing',
    level: 18,
    maxHp: 900,
    atk: 60,
    def: 12,
    flee: 25,
    exp: 280,
    jobExp: 220,
    color: '#86efac',
    size: 17,
    behavior: 'passive',
    drops: [{ item: 'garlet', chance: 0.5 }, { item: 'grape', chance: 0.2 }]
  },

  // Sograt
  muka: {
    id: 'muka',
    name: 'Muka (Cactus)',
    level: 30,
    maxHp: 2200,
    atk: 140,
    def: 35,
    flee: 45,
    exp: 720,
    jobExp: 610,
    color: '#15803d',
    size: 18,
    behavior: 'passive',
    drops: [{ item: 'cactus_needle', chance: 0.5 }, { item: 'yellow_herb', chance: 0.25 }]
  },
  peco_peco: {
    id: 'peco_peco',
    name: 'Peco Peco',
    level: 35,
    maxHp: 3100,
    atk: 195,
    def: 45,
    flee: 60,
    exp: 1050,
    jobExp: 890,
    color: '#facc15',
    size: 20,
    behavior: 'passive',
    drops: [{ item: 'peco_feather', chance: 0.4 }, { item: 'meat', chance: 0.3 }]
  },
  scorpion: {
    id: 'scorpion',
    name: 'Scorpion',
    level: 38,
    maxHp: 3800,
    atk: 250,
    def: 60,
    flee: 75,
    exp: 1480,
    jobExp: 1250,
    color: '#b45309',
    size: 15,
    behavior: 'aggressive',
    drops: [{ item: 'scorpion_tail', chance: 0.4 }, { item: 'iron_ore', chance: 0.2 }, { item: 'scorpion_card', chance: 0.02 }, { item: 'oridecon', chance: 0.05 }, { item: 'elunium', chance: 0.05 }]
  },

  // Mjolnir
  savage_babe: {
    id: 'savage_babe',
    name: 'Savage Babe',
    level: 45,
    maxHp: 5200,
    atk: 360,
    def: 80,
    flee: 90,
    exp: 2200,
    jobExp: 1900,
    color: '#eab308',
    size: 16,
    behavior: 'passive',
    drops: [{ item: 'animal_skin', chance: 0.5 }, { item: 'meat', chance: 0.4 }]
  },
  wolf: {
    id: 'wolf',
    name: 'Dire Wolf',
    level: 52,
    maxHp: 7500,
    atk: 540,
    def: 110,
    flee: 120,
    exp: 3600,
    jobExp: 3100,
    color: '#475569',
    size: 20,
    behavior: 'aggressive',
    drops: [{ item: 'claw', chance: 0.45 }, { item: 'fur', chance: 0.35 }, { item: 'oridecon', chance: 0.08 }, { item: 'elunium', chance: 0.08 }]
  },
  frost_wind: {
    id: 'frost_wind',
    name: 'Frost Wind',
    level: 58,
    maxHp: 9800,
    atk: 720,
    def: 140,
    flee: 150,
    exp: 5200,
    jobExp: 4500,
    color: '#a5f3fc',
    size: 22,
    behavior: 'aggressive',
    drops: [{ item: 'frost_crystal', chance: 0.4 }, { item: 'mystic_frozen', chance: 0.05 }, { item: 'oridecon', chance: 0.12 }, { item: 'elunium', chance: 0.12 }]
  },

  // Geffen / Cavern
  zombie: {
    id: 'zombie',
    name: 'Zombie',
    level: 25,
    maxHp: 2000,
    atk: 110,
    def: 30,
    flee: 10,
    exp: 550,
    jobExp: 450,
    color: '#4d7c0f',
    size: 18,
    behavior: 'aggressive',
    drops: [{ item: 'decayed_tooth', chance: 0.4 }, { item: 'white_herb', chance: 0.1 }]
  },
  familiar: {
    id: 'familiar',
    name: 'Familiar Bat',
    level: 20,
    maxHp: 850,
    atk: 75,
    def: 15,
    flee: 45,
    exp: 340,
    jobExp: 280,
    color: '#701a75',
    size: 10,
    behavior: 'aggressive',
    drops: [{ item: 'wing_bat', chance: 0.5 }, { item: 'wing_fly', chance: 0.2 }, { item: 'familiar_card', chance: 0.02 }]
  },
  soldier_skeleton: {
    id: 'soldier_skeleton',
    name: 'Soldier Skeleton',
    level: 48,
    maxHp: 6500,
    atk: 480,
    def: 95,
    flee: 100,
    exp: 2800,
    jobExp: 2400,
    color: '#e2e8f0',
    size: 17,
    behavior: 'aggressive',
    drops: [{ item: 'broken_sword', chance: 0.3 }, { item: 'steel', chance: 0.08 }, { item: 'oridecon', chance: 0.1 }, { item: 'elunium', chance: 0.1 }]
  },

  // BOSSES (MVP)
  baphomet: {
    id: 'baphomet',
    name: 'Baphomet (MVP)',
    level: 80,
    maxHp: 150000,
    atk: 3200,
    def: 350,
    flee: 250,
    exp: 80000,
    jobExp: 75000,
    color: '#1e293b',
    size: 40,
    behavior: 'aggressive',
    isBoss: true,
    drops: [
      { item: 'dragon_slayer', chance: 0.1 },
      { item: 'majestic_goat', chance: 0.05 },
      { item: 'mvp_medal', chance: 1.0 },
      { item: 'royal_jelly', chance: 0.5 },
      { item: 'oridecon', chance: 0.4 },
      { item: 'elunium', chance: 0.4 }
    ]
  },
  golden_bug: {
    id: 'golden_bug',
    name: 'Golden Thief Bug (MVP)',
    level: 65,
    maxHp: 85000,
    atk: 1800,
    def: 500,
    flee: 180,
    exp: 42000,
    jobExp: 38000,
    color: '#facc15',
    size: 32,
    behavior: 'aggressive',
    isBoss: true,
    drops: [
      { item: 'golden_shield', chance: 0.1 },
      { item: 'gold_ore', chance: 0.8 },
      { item: 'mvp_medal', chance: 1.0 },
      { item: 'royal_jelly', chance: 0.6 },
      { item: 'golden_bug_card', chance: 0.1 },
      { item: 'oridecon', chance: 0.3 },
      { item: 'elunium', chance: 0.3 }
    ]
  },
  red_fire_dragon: {
    id: 'red_fire_dragon',
    name: 'Red Fire Dragon (MVP)',
    level: 85,
    maxHp: 200000,
    atk: 3500,
    def: 400,
    mdef: 150,
    flee: 280,
    exp: 100000,
    jobExp: 95000,
    color: '#dc2626',
    size: 45,
    behavior: 'aggressive',
    isBoss: true,
    type: 'dragon',
    drops: [
      { item: 'dragon_scale', chance: 0.8 },
      { item: 'dragon_hunt_trial_proof', chance: 0.5 },
      { item: 'oridecon', chance: 0.5 },
      { item: 'elunium', chance: 0.5 }
    ]
  },
  golden_drake: {
    id: 'golden_drake',
    name: 'Golden Drake (MVP)',
    level: 90,
    maxHp: 250000,
    atk: 4000,
    def: 450,
    mdef: 200,
    flee: 300,
    exp: 120000,
    jobExp: 110000,
    color: '#eab308',
    size: 48,
    behavior: 'aggressive',
    isBoss: true,
    type: 'dragon',
    drops: [
      { item: 'dragon_scale', chance: 0.9 },
      { item: 'oridecon', chance: 0.6 },
      { item: 'elunium', chance: 0.6 }
    ]
  },
  wyvern: {
    id: 'wyvern',
    name: 'Wyvern',
    level: 70,
    maxHp: 15000,
    atk: 900,
    def: 180,
    mdef: 80,
    flee: 160,
    exp: 8000,
    jobExp: 7500,
    color: '#06b6d4',
    size: 25,
    behavior: 'aggressive',
    type: 'dragon',
    drops: [
      { item: 'dragon_scale', chance: 0.3 },
      { item: 'oridecon', chance: 0.1 }
    ]
  },
  dragon_hatchling: {
    id: 'dragon_hatchling',
    name: 'Dragon Hatchling',
    level: 60,
    maxHp: 8000,
    atk: 520,
    def: 110,
    mdef: 60,
    flee: 130,
    exp: 4200,
    jobExp: 3800,
    color: '#fb923c',
    size: 16,
    behavior: 'passive',
    type: 'dragon',
    drops: [
      { item: 'dragon_scale', chance: 0.2 },
      { item: 'red_herb', chance: 0.3 },
      { item: 'oridecon', chance: 0.05 }
    ]
  },
  lava_basilisk: {
    id: 'lava_basilisk',
    name: 'Lava Basilisk',
    level: 66,
    maxHp: 12000,
    atk: 750,
    def: 160,
    mdef: 80,
    flee: 145,
    exp: 6500,
    jobExp: 6000,
    color: '#ea580c',
    size: 22,
    behavior: 'aggressive',
    type: 'dragon',
    drops: [
      { item: 'dragon_scale', chance: 0.4 },
      { item: 'yellow_herb', chance: 0.2 },
      { item: 'elunium', chance: 0.08 }
    ]
  },
  storm_wyvern: {
    id: 'storm_wyvern',
    name: 'Storm Wyvern',
    level: 75,
    maxHp: 18000,
    atk: 950,
    def: 190,
    mdef: 90,
    flee: 180,
    exp: 9500,
    jobExp: 9000,
    color: '#2563eb',
    size: 26,
    behavior: 'aggressive',
    type: 'dragon',
    drops: [
      { item: 'dragon_scale', chance: 0.5 },
      { item: 'blue_herb', chance: 0.15 },
      { item: 'oridecon', chance: 0.1 },
      { item: 'elunium', chance: 0.1 }
    ]
  }
};

export const CLASSES = {
  novice: {
    id: 'novice',
    name: 'Novice',
    tier: 0,
    weaponType: 'Knife',
    weaponName: 'Novice Dagger',
    baseHp: 150,
    baseSp: 20,
    hpPerVit: 12,
    spPerInt: 3,
    growthStats: { str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 },
    allowedWeapons: ['novice_knife'],
    upClassTier: ['swordman', 'mage', 'acolyte', 'thief', 'archer'],
    description: 'An aspiring adventurer. Ready to choose a path in the guild.'
  },

  // TIER 1
  swordman: {
    id: 'swordman',
    name: 'Swordman',
    tier: 1,
    weaponType: 'Sword',
    weaponName: 'Broadsword',
    baseHp: 400,
    baseSp: 40,
    hpPerVit: 22,
    spPerInt: 4,
    growthStats: { str: 4, agi: 2, vit: 5, int: 1, dex: 3, luk: 1 },
    allowedWeapons: ['broadsword', 'wooden_shield'],
    upClassTier: ['knight'],
    reqClass: 'novice',
    description: 'A melee warrior with high physical defense and vitality.'
  },
  mage: {
    id: 'mage',
    name: 'Mage',
    tier: 1,
    weaponType: 'Staff',
    weaponName: 'Arcane Staff',
    baseHp: 200,
    baseSp: 120,
    hpPerVit: 8,
    spPerInt: 9,
    growthStats: { str: 1, agi: 1, vit: 2, int: 6, dex: 4, luk: 1 },
    allowedWeapons: ['arcane_staff'],
    upClassTier: ['wizard'],
    reqClass: 'novice',
    description: 'A master of elemental magic who deals heavy area-of-effect damage.'
  },
  acolyte: {
    id: 'acolyte',
    name: 'Acolyte',
    tier: 1,
    weaponType: 'Mace',
    weaponName: 'Mace of Light',
    baseHp: 300,
    baseSp: 90,
    hpPerVit: 14,
    spPerInt: 7,
    growthStats: { str: 2, agi: 2, vit: 3, int: 5, dex: 3, luk: 2 },
    allowedWeapons: ['mace_light', 'wooden_shield'],
    upClassTier: ['priest'],
    reqClass: 'novice',
    description: 'A holy supporter capable of healing allies and purging dark spirits.'
  },
  thief: {
    id: 'thief',
    name: 'Thief',
    tier: 1,
    weaponType: 'Dagger',
    weaponName: 'Stiletto Dagger',
    baseHp: 280,
    baseSp: 50,
    hpPerVit: 12,
    spPerInt: 3,
    growthStats: { str: 3, agi: 6, vit: 2, int: 1, dex: 4, luk: 2 },
    allowedWeapons: ['stiletto'],
    upClassTier: ['assassin'],
    reqClass: 'novice',
    description: 'A quick shadow striker with high evasion and double-strike mechanics.'
  },
  archer: {
    id: 'archer',
    name: 'Archer',
    tier: 1,
    weaponType: 'Bow',
    weaponName: 'Composite Bow',
    baseHp: 250,
    baseSp: 60,
    hpPerVit: 10,
    spPerInt: 4,
    growthStats: { str: 2, agi: 4, vit: 2, int: 2, dex: 6, luk: 1 },
    allowedWeapons: ['composite_bow'],
    upClassTier: ['hunter'],
    reqClass: 'novice',
    description: 'A precision marksman who strikes enemies from afar with swift arrows.'
  },

  // TIER 2
  knight: {
    id: 'knight',
    name: 'Knight',
    tier: 2,
    weaponType: 'Two-Handed Sword',
    weaponName: 'Claymore',
    baseHp: 1200,
    baseSp: 150,
    hpPerVit: 35,
    spPerInt: 5,
    growthStats: { str: 8, agi: 4, vit: 10, int: 2, dex: 5, luk: 2 },
    allowedWeapons: ['claymore', 'broadsword', 'round_shield'],
    upClassTier: ['lord_knight'],
    reqClass: 'swordman',
    description: 'A legendary armored soldier wielding heavy claymores or spears.'
  },
  wizard: {
    id: 'wizard',
    name: 'Wizard',
    tier: 2,
    weaponType: 'Staff',
    weaponName: 'Survivor Staff',
    baseHp: 600,
    baseSp: 450,
    hpPerVit: 11,
    spPerInt: 15,
    growthStats: { str: 2, agi: 2, vit: 4, int: 14, dex: 9, luk: 2 },
    allowedWeapons: ['survivor_staff', 'arcane_staff'],
    upClassTier: ['high_wizard'],
    reqClass: 'mage',
    description: 'A wizard capable of invoking catastrophic natural disasters.'
  },
  priest: {
    id: 'priest',
    name: 'Priest',
    tier: 2,
    weaponType: 'Mace',
    weaponName: 'Spiritual Mace',
    baseHp: 800,
    baseSp: 320,
    hpPerVit: 18,
    spPerInt: 11,
    growthStats: { str: 3, agi: 3, vit: 6, int: 11, dex: 7, luk: 4 },
    allowedWeapons: ['spiritual_mace', 'mace_light', 'round_shield'],
    upClassTier: ['high_priest'],
    reqClass: 'acolyte',
    description: 'The ultimate shield of the divine, capable of resurrection and shields.'
  },
  assassin: {
    id: 'assassin',
    name: 'Assassin',
    tier: 2,
    weaponType: 'Katar',
    weaponName: 'Jur Katar',
    baseHp: 900,
    baseSp: 180,
    hpPerVit: 16,
    spPerInt: 4,
    growthStats: { str: 7, agi: 12, vit: 4, int: 2, dex: 7, luk: 5 },
    allowedWeapons: ['jur_katar', 'stiletto'],
    upClassTier: ['assassin_cross'],
    reqClass: 'thief',
    description: 'An elite killer utilizing dual-wielding and special Katar weapons.'
  },
  hunter: {
    id: 'hunter',
    name: 'Hunter',
    tier: 2,
    weaponType: 'Bow',
    weaponName: 'Gakkung Bow',
    baseHp: 750,
    baseSp: 220,
    hpPerVit: 13,
    spPerInt: 5,
    growthStats: { str: 3, agi: 9, vit: 4, int: 4, dex: 12, luk: 3 },
    allowedWeapons: ['gakkung', 'composite_bow'],
    upClassTier: ['sniper'],
    reqClass: 'archer',
    description: 'A master of traps and falconry, striking enemies with rapid fires.'
  },

  // TIER 3
  lord_knight: {
    id: 'lord_knight',
    name: 'Lord Knight',
    tier: 3,
    weaponType: 'Sword',
    weaponName: 'Dragon Slayer',
    baseHp: 3200,
    baseSp: 400,
    hpPerVit: 55,
    spPerInt: 7,
    growthStats: { str: 15, agi: 7, vit: 18, int: 4, dex: 10, luk: 4 },
    allowedWeapons: ['dragon_slayer', 'claymore', 'round_shield', 'golden_shield'],
    upClassTier: ['dragon_knight'],
    reqClass: 'knight',
    description: 'A supreme knight who can go into high-speed frenzy and crush shields.'
  },
  high_wizard: {
    id: 'high_wizard',
    name: 'High Wizard',
    tier: 3,
    weaponType: 'Staff',
    weaponName: 'Wizardry Staff',
    baseHp: 1500,
    baseSp: 1100,
    hpPerVit: 16,
    spPerInt: 25,
    growthStats: { str: 3, agi: 4, vit: 8, int: 25, dex: 16, luk: 4 },
    allowedWeapons: ['wizardry_staff', 'survivor_staff'],
    upClassTier: ['dragon_arcanist'],
    reqClass: 'wizard',
    description: 'A mage who has reached the pinnacle of magic, amplifying spells tenfold.'
  },
  high_priest: {
    id: 'high_priest',
    name: 'High Priest',
    tier: 3,
    weaponType: 'Mace',
    weaponName: 'Grand Cross Mace',
    baseHp: 2200,
    baseSp: 850,
    hpPerVit: 30,
    spPerInt: 18,
    growthStats: { str: 5, agi: 6, vit: 12, int: 20, dex: 12, luk: 8 },
    allowedWeapons: ['grand_cross_mace', 'spiritual_mace', 'round_shield', 'golden_shield'],
    upClassTier: ['dragon_shaman'],
    reqClass: 'priest',
    description: 'A holy figure who bestows god-like damage resistance and aura buffers.'
  },
  assassin_cross: {
    id: 'assassin_cross',
    name: 'Assassin Cross',
    tier: 3,
    weaponType: 'Katar',
    weaponName: 'Infiltrator Katar',
    baseHp: 2400,
    baseSp: 450,
    hpPerVit: 26,
    spPerInt: 6,
    growthStats: { str: 14, agi: 22, vit: 8, int: 3, dex: 14, luk: 10 },
    allowedWeapons: ['infiltrator', 'jur_katar'],
    upClassTier: ['dragon_executioner'],
    reqClass: 'assassin',
    description: 'A legendary assassin cross who poisons blades and deals deadly shockwaves.'
  },
  sniper: {
    id: 'sniper',
    name: 'Sniper',
    tier: 3,
    weaponType: 'Bow',
    weaponName: 'Hunter Bow',
    baseHp: 2000,
    baseSp: 550,
    hpPerVit: 22,
    spPerInt: 8,
    growthStats: { str: 5, agi: 18, vit: 8, int: 8, dex: 22, luk: 6 },
    allowedWeapons: ['hunter_bow', 'gakkung'],
    upClassTier: ['wyvern_hunter'],
    reqClass: 'hunter',
    description: 'A high-speed long-range executioner whose arrows pierce steel armor.'
  },
  dragon_knight: {
    id: 'dragon_knight',
    name: 'Dragon Knight',
    tier: 4,
    weaponType: 'Sword',
    weaponName: 'Dragon Slayer',
    baseHp: 4500,
    baseSp: 550,
    hpPerVit: 70,
    spPerInt: 9,
    growthStats: { str: 22, agi: 10, vit: 24, int: 6, dex: 14, luk: 6 },
    allowedWeapons: ['dragon_slayer', 'claymore', 'round_shield', 'golden_shield'],
    reqClass: 'lord_knight',
    description: 'A legendary peak knight who has mastered dragon riding and combat.'
  },
  wyvern_hunter: {
    id: 'wyvern_hunter',
    name: 'Wyvern Hunter',
    tier: 4,
    weaponType: 'Bow',
    weaponName: 'Hunter Bow',
    baseHp: 2800,
    baseSp: 750,
    hpPerVit: 28,
    spPerInt: 10,
    growthStats: { str: 7, agi: 24, vit: 11, int: 11, dex: 30, luk: 8 },
    allowedWeapons: ['hunter_bow', 'gakkung'],
    reqClass: 'sniper',
    description: 'A legendary master marksman hunting from the back of a swift wyvern.'
  },
  dragon_shaman: {
    id: 'dragon_shaman',
    name: 'Dragon Shaman',
    tier: 4,
    weaponType: 'Mace',
    weaponName: 'Grand Cross Mace',
    baseHp: 3100,
    baseSp: 1200,
    hpPerVit: 38,
    spPerInt: 24,
    growthStats: { str: 7, agi: 8, vit: 16, int: 28, dex: 16, luk: 10 },
    allowedWeapons: ['grand_cross_mace', 'spiritual_mace', 'round_shield', 'golden_shield'],
    reqClass: 'high_priest',
    description: 'A holy oracle who channels draconic energy for supreme support.'
  },
  dragon_arcanist: {
    id: 'dragon_arcanist',
    name: 'Dragon Arcanist',
    tier: 4,
    weaponType: 'Staff',
    weaponName: 'Dragon Heart Staff',
    baseHp: 2200,
    baseSp: 1600,
    hpPerVit: 20,
    spPerInt: 32,
    growthStats: { str: 4, agi: 6, vit: 12, int: 35, dex: 22, luk: 6 },
    allowedWeapons: ['dragon_heart_staff', 'wizardry_staff'],
    reqClass: 'high_wizard',
    description: 'A peak wizard who channels ancient dragon leyline energy for supreme magic.'
  },
  dragon_executioner: {
    id: 'dragon_executioner',
    name: 'Dragon Executioner',
    tier: 4,
    weaponType: 'Katar',
    weaponName: 'Dragon Tooth Katar',
    baseHp: 3200,
    baseSp: 600,
    hpPerVit: 32,
    spPerInt: 8,
    growthStats: { str: 20, agi: 30, vit: 11, int: 4, dex: 18, luk: 14 },
    allowedWeapons: ['dragon_tooth_katar', 'infiltrator'],
    reqClass: 'assassin_cross',
    description: 'A lethal shadow assassin who strikes dragon vitals with poison-infused katar.'
  }
};

export const SKILL_TREE = {
  novice: [
    { id: 'first_aid', name: 'First Aid', maxLevel: 5, type: 'active', desc: 'Heals 15 + 5/Level HP. SP cost: 3.', req: {}, baseSpCost: 3 },
    { id: 'play_dead', name: 'Play Dead', maxLevel: 1, type: 'active', desc: 'Pretend to die, monsters will ignore you. SP cost: 5.', req: {}, baseSpCost: 5 }
  ],
  swordman: [
    { id: 'bash', name: 'Bash', maxLevel: 10, type: 'active', desc: 'Strike target dealing 130% + 20%/Level damage. Level 6+ has stun chance.', req: {}, baseSpCost: 8 },
    { id: 'hp_rec', name: 'Increase HP Recovery', maxLevel: 10, type: 'passive', desc: 'Passively heals HP every 8 seconds, +5/Level.', req: {} },
    { id: 'magnum_break', name: 'Magnum Break', maxLevel: 10, type: 'active', desc: 'Fire slash dealing fire damage in a 3x3 area. SP cost: 15.', req: { bash: 5 }, baseSpCost: 15 }
  ],
  mage: [
    { id: 'fire_bolt', name: 'Fire Bolt', maxLevel: 10, type: 'active', desc: 'Summons fire hits dealing 120%/Level magic damage.', req: {}, baseSpCost: 10 },
    { id: 'cold_bolt', name: 'Cold Bolt', maxLevel: 10, type: 'active', desc: 'Summons water hits dealing 120%/Level magic damage.', req: {}, baseSpCost: 10 },
    { id: 'sp_rec', name: 'Increase SP Recovery', maxLevel: 10, type: 'passive', desc: 'Increases SP regeneration by 3 + 2/Level per tick.', req: {} }
  ],
  acolyte: [
    { id: 'heal', name: 'Heal', maxLevel: 10, type: 'active', desc: 'Restore target HP. Heal amount based on Level & INT. SP: 12.', req: {}, baseSpCost: 12 },
    { id: 'blessing', name: 'Blessing', maxLevel: 10, type: 'active', desc: 'Boosts STR, INT, and DEX by +1/Level for 60s.', req: {}, baseSpCost: 20 },
    { id: 'increase_agi', name: 'Increase AGI', maxLevel: 10, type: 'active', desc: 'Increases AGI by +1/Level and movespeed for 60s.', req: { heal: 3 }, baseSpCost: 15 }
  ],
  thief: [
    { id: 'double_attack', name: 'Double Attack', maxLevel: 10, type: 'passive', desc: 'Gives 5%/Level chance to double hit when using Daggers.', req: {} },
    { id: 'improve_dodge', name: 'Improve Dodge', maxLevel: 10, type: 'passive', desc: 'Increases Flee Rate by +3/Level.', req: {} },
    { id: 'hiding', name: 'Hiding', maxLevel: 5, type: 'active', desc: 'Hide in shadows. Monsters do not see you. SP: 10.', req: { double_attack: 3 }, baseSpCost: 10 }
  ],
  archer: [
    { id: 'double_strafe', name: 'Double Strafe', maxLevel: 10, type: 'active', desc: 'Fire two arrows rapidly dealing 180% + 20%/Level damage.', req: {}, baseSpCost: 12 },
    { id: 'owls_eye', name: 'Owl\'s Eye', maxLevel: 10, type: 'passive', desc: 'Passively increases DEX by +1/Level.', req: {} },
    { id: 'vultures_eye', name: 'Vulture\'s Eye', maxLevel: 10, type: 'passive', desc: 'Passively increases range and Hit rate.', req: { owls_eye: 3 } }
  ],

  // TIER 2
  knight: [
    { id: 'bowling_bash', name: 'Bowling Bash', maxLevel: 10, type: 'active', desc: 'Heavy dual-strike that knocks back and damages targets by 500% + 50%/Level.', req: { bash: 5 }, baseSpCost: 22 },
    { id: 'pierce', name: 'Pierce', maxLevel: 10, type: 'active', desc: 'Pierces targets. Higher damage against larger targets.', req: {}, baseSpCost: 10 },
    { id: 'spear_quicken', name: 'Spear Quicken', maxLevel: 10, type: 'active', desc: 'Temp boost to ASPD (+15% to +35%) when using Spear/Sword.', req: { pierce: 5 }, baseSpCost: 30 },
    { id: 'dragon_breath', name: 'Dragon Breath', maxLevel: 5, type: 'active', desc: 'Breathe columns of fire, dealing fire damage to target and splashing adjacent enemies. Requires mount. SP: 20 + 2/Lv.', req: {}, baseSpCost: 20 }
  ],
  wizard: [
    { id: 'storm_gust', name: 'Storm Gust', maxLevel: 10, type: 'active', desc: 'Ice blizzard AOE that hits 7 times. Chance to freeze.', req: { cold_bolt: 5 }, baseSpCost: 45 },
    { id: 'meteor_storm', name: 'Meteor Storm', maxLevel: 10, type: 'active', desc: 'Rain fire meteors dealing massive damage in AOE.', req: { fire_bolt: 5 }, baseSpCost: 50 },
    { id: 'jupitel_thunder', name: 'Jupitel Thunder', maxLevel: 10, type: 'active', desc: 'Lightning sphere that strikes target and knocks back.', req: {}, baseSpCost: 20 }
  ],
  priest: [
    { id: 'sanctuary', name: 'Sanctuary', maxLevel: 10, type: 'active', desc: 'Cast a holy circle on ground. Heals allies and damages Undead.', req: { heal: 5 }, baseSpCost: 40 },
    { id: 'magnificat', name: 'Magnificat', maxLevel: 5, type: 'active', desc: 'Doubles SP regeneration rate for 60s.', req: {}, baseSpCost: 30 },
    { id: 'resurrection', name: 'Resurrection', maxLevel: 4, type: 'active', desc: 'Revives dead players with 10%-80% HP.', req: { magnificat: 2 }, baseSpCost: 50 },
    { id: 'draconic_shield', name: 'Draconic Shield', maxLevel: 5, type: 'active', desc: 'Manifests a draconic barrier, reducing incoming damage and healing the caster. Requires mount. SP: 30 + 2/Lv.', req: {}, baseSpCost: 30 }
  ],
  assassin: [
    { id: 'sonic_blow', name: 'Sonic Blow', maxLevel: 10, type: 'active', desc: 'Strike 8 times in critical speed dealing 600% - 1200% ATK.', req: { double_attack: 5 }, baseSpCost: 28 },
    { id: 'grimtooth', name: 'Grimtooth', maxLevel: 10, type: 'active', desc: 'Attack from hiding. Deals ranged ground damage.', req: { hiding: 3 }, baseSpCost: 12 },
    { id: 'cloaking', name: 'Cloaking', maxLevel: 10, type: 'active', desc: 'Walk hidden beside walls at full movement speed.', req: {} }
  ],
  hunter: [
    { id: 'blitz_beat', name: 'Blitz Beat', maxLevel: 10, type: 'passive', desc: 'Auto-attack has chance (based on LUK) to strike with Falcon.', req: {}, baseSpCost: 0 },
    { id: 'falconry', name: 'Falconry Mastery', maxLevel: 1, type: 'passive', desc: 'Allows hiring a Falcon assistant.', req: {} },
    { id: 'claymore_trap', name: 'Claymore Trap', maxLevel: 5, type: 'active', desc: 'Set explosive trap dealing fire AOE damage.', req: {}, baseSpCost: 20 },
    { id: 'mounted_barrage', name: 'Mounted Barrage', maxLevel: 5, type: 'active', desc: 'Unleash a rapid volley of arrows from dragon-back, striking the target 5 times. Requires mount. SP: 25 + 2/Lv.', req: {}, baseSpCost: 25 }
  ],

  // TIER 3
  lord_knight: [
    { id: 'frenzy', name: 'Frenzy / Berserk', maxLevel: 1, type: 'active', desc: 'Triple HP, Max ASPD, but lose SP/HP over time. SP cost: 100.', req: { bowling_bash: 5 }, baseSpCost: 100 },
    { id: 'clashing_spiral', name: 'Clashing Spiral', maxLevel: 5, type: 'active', desc: '5 heavy spiral strikes that pin target and ignore defense. SP: 40.', req: { pierce: 5 }, baseSpCost: 40 },
    { id: 'dragon_breath', name: 'Dragon Breath', maxLevel: 5, type: 'active', desc: 'Breathe columns of fire, dealing fire damage to target and splashing adjacent enemies. Requires mount. SP: 20 + 2/Lv.', req: {}, baseSpCost: 20 }
  ],
  high_wizard: [
    { id: 'mystical_amp', name: 'Mystical Amplification', maxLevel: 10, type: 'active', desc: 'Next magic spell deals +50% damage. SP: 35.', req: { storm_gust: 5 }, baseSpCost: 35 },
    { id: 'grav_field', name: 'Gravitational Field', maxLevel: 5, type: 'active', desc: 'Heavy gravity area. Bypasses Magic Defense.', req: {}, baseSpCost: 60 }
  ],
  high_priest: [
    { id: 'assumptio', name: 'Assumptio', maxLevel: 5, type: 'active', desc: 'Doubles physical & magical defense of target for 60s.', req: { sanctuary: 3 }, baseSpCost: 30 },
    { id: 'meditatio', name: 'Meditatio', maxLevel: 10, type: 'passive', desc: 'Increases Max SP (+1%/Lv), SP recovery speed and Heal power.', req: { magnificat: 3 } },
    { id: 'draconic_shield', name: 'Draconic Shield', maxLevel: 5, type: 'active', desc: 'Manifests a draconic barrier, reducing incoming damage and healing the caster. Requires mount. SP: 30 + 2/Lv.', req: {}, baseSpCost: 30 }
  ],
  assassin_cross: [
    { id: 'edp', name: 'Enchant Deadly Poison', maxLevel: 5, type: 'active', desc: 'Consumes poison bottle to boost weapon ATK by +300% for 45s.', req: { sonic_blow: 5 }, baseSpCost: 50 },
    { id: 'soul_destroyer', name: 'Soul Destroyer', maxLevel: 10, type: 'active', desc: 'Infuse physical & magic waves to strike from distance.', req: {}, baseSpCost: 35 }
  ],
  sniper: [
    { id: 'sharp_shooting', name: 'Sharp Shooting', maxLevel: 5, type: 'active', desc: 'Pierces all targets in a line with 100% Critical rate.', req: { double_strafe: 5 }, baseSpCost: 30 },
    { id: 'falcon_assault', name: 'Falcon Assault', maxLevel: 5, type: 'active', desc: 'Orders falcon to strike target dealing massive defense-ignoring dmg.', req: { blitz_beat: 5 }, baseSpCost: 40 },
    { id: 'mounted_barrage', name: 'Mounted Barrage', maxLevel: 5, type: 'active', desc: 'Unleash a rapid volley of arrows from dragon-back, striking the target 5 times. Requires mount. SP: 25 + 2/Lv.', req: {}, baseSpCost: 25 }
  ],
  dragon_knight: [
    { id: 'frenzy', name: 'Frenzy / Berserk', maxLevel: 1, type: 'active', desc: 'Triple HP, Max ASPD, but lose SP/HP over time. SP cost: 100.', req: { bowling_bash: 5 }, baseSpCost: 100 },
    { id: 'clashing_spiral', name: 'Clashing Spiral', maxLevel: 5, type: 'active', desc: '5 heavy spiral strikes that pin target and ignore defense. SP: 40.', req: { pierce: 5 }, baseSpCost: 40 },
    { id: 'dragon_breath', name: 'Dragon Breath', maxLevel: 5, type: 'active', desc: 'Breathe columns of fire, dealing fire damage to target and splashing adjacent enemies. Requires mount. SP: 20 + 2/Lv.', req: {}, baseSpCost: 20 }
  ],
  wyvern_hunter: [
    { id: 'sharp_shooting', name: 'Sharp Shooting', maxLevel: 5, type: 'active', desc: 'Pierces all targets in a line with 100% Critical rate.', req: { double_strafe: 5 }, baseSpCost: 30 },
    { id: 'falcon_assault', name: 'Falcon Assault', maxLevel: 5, type: 'active', desc: 'Orders falcon to strike target dealing massive defense-ignoring dmg.', req: { blitz_beat: 5 }, baseSpCost: 40 },
    { id: 'mounted_barrage', name: 'Mounted Barrage', maxLevel: 5, type: 'active', desc: 'Unleash a rapid volley of arrows from dragon-back, striking the target 5 times. Requires mount. SP: 25 + 2/Lv.', req: {}, baseSpCost: 25 }
  ],
  dragon_shaman: [
    { id: 'assumptio', name: 'Assumptio', maxLevel: 5, type: 'active', desc: 'Doubles physical & magical defense of target for 60s.', req: { sanctuary: 3 }, baseSpCost: 30 },
    { id: 'meditatio', name: 'Meditatio', maxLevel: 10, type: 'passive', desc: 'Increases Max SP (+1%/Lv), SP recovery speed and Heal power.', req: { magnificat: 3 } },
    { id: 'draconic_shield', name: 'Draconic Shield', maxLevel: 5, type: 'active', desc: 'Manifests a draconic barrier, reducing incoming damage and healing the caster. Requires mount. SP: 30 + 2/Lv.', req: {}, baseSpCost: 30 }
  ],
  dragon_arcanist: [
    { id: 'mystical_amp', name: 'Mystical Amplification', maxLevel: 10, type: 'active', desc: 'Next magic spell deals +50% damage. SP: 35.', req: { storm_gust: 5 }, baseSpCost: 35 },
    { id: 'grav_field', name: 'Gravitational Field', maxLevel: 5, type: 'active', desc: 'Heavy gravity area. Bypasses Magic Defense.', req: {}, baseSpCost: 60 }
  ],
  dragon_executioner: [
    { id: 'edp', name: 'Enchant Deadly Poison', maxLevel: 5, type: 'active', desc: 'Consumes poison bottle to boost weapon ATK by +300% for 45s.', req: { sonic_blow: 5 }, baseSpCost: 50 },
    { id: 'soul_destroyer', name: 'Soul Destroyer', maxLevel: 10, type: 'active', desc: 'Infuse physical & magic waves to strike from distance.', req: {}, baseSpCost: 35 }
  ]
};

export const ITEMS = {
  // Consumables
  red_potion: { id: 'red_potion', name: 'Red Potion', type: 'consumable', subType: 'heal_hp', value: 100, price: 50, desc: 'Heals ~100 HP.' },
  yellow_potion: { id: 'yellow_potion', name: 'Yellow Potion', type: 'consumable', subType: 'heal_hp', value: 300, price: 150, desc: 'Heals ~300 HP.' },
  white_potion: { id: 'white_potion', name: 'White Potion', type: 'consumable', subType: 'heal_hp', value: 800, price: 300, desc: 'Heals ~800 HP.' },
  blue_potion: { id: 'blue_potion', name: 'Blue Potion', type: 'consumable', subType: 'heal_sp', value: 120, price: 500, desc: 'Restores ~120 SP.' },
  royal_jelly: { id: 'royal_jelly', name: 'Royal Jelly', type: 'consumable', subType: 'heal_both', value: 400, price: 1200, desc: 'Restores large HP and SP.' },
  wing_fly: { id: 'wing_fly', name: 'Fly Wing', type: 'consumable', subType: 'teleport', price: 100, desc: 'Teleport instantly to a random spot.' },
  wing_butterfly: { id: 'wing_butterfly', name: 'Butterfly Wing', type: 'consumable', subType: 'warp_town', price: 300, desc: 'Return to Prontera Fields.' },

  // Weapons (Tier 0 & 1)
  novice_knife: { id: 'novice_knife', name: 'Novice Knife', type: 'weapon', atk: 12, slot: 'weapon', reqClass: 'novice', price: 100, slots: 2, desc: 'A basic knife given to rookies.' },
  broadsword: { id: 'broadsword', name: 'Broadsword', type: 'weapon', atk: 35, slot: 'weapon', reqClass: 'swordman', price: 800, slots: 2, desc: 'A standard steel sword for defensive fighters.' },
  arcane_staff: { id: 'arcane_staff', name: 'Arcane Staff', type: 'weapon', matk: 45, slot: 'weapon', reqClass: 'mage', price: 1000, slots: 2, desc: 'A staff that channels elemental elements.' },
  mace_light: { id: 'mace_light', name: 'Mace of Light', type: 'weapon', atk: 28, matk: 20, slot: 'weapon', reqClass: 'acolyte', price: 900, slots: 2, desc: 'A holy mace dealing additional light damage.' },
  stiletto: { id: 'stiletto', name: 'Stiletto Dagger', type: 'weapon', atk: 42, slot: 'weapon', reqClass: 'thief', price: 1100, slots: 2, desc: 'A thin, sharp stiletto for fast thrusts.' },
  composite_bow: { id: 'composite_bow', name: 'Composite Bow', type: 'weapon', atk: 30, slot: 'weapon', reqClass: 'archer', price: 850, slots: 2, desc: 'A light bow built for quick standard shots.' },

  // Weapons (Tier 2 & 3)
  claymore: { id: 'claymore', name: 'Claymore', type: 'weapon', atk: 110, slot: 'weapon', reqClass: 'knight', price: 5000, slots: 2, desc: 'A giant two-handed sword that cuts armor.' },
  survivor_staff: { id: 'survivor_staff', name: 'Survivor Staff', type: 'weapon', matk: 120, slot: 'weapon', reqClass: 'wizard', price: 6000, slots: 2, desc: 'Increases Spell Casting speed and magic output.' },
  spiritual_mace: { id: 'spiritual_mace', name: 'Spiritual Mace', type: 'weapon', atk: 80, matk: 75, slot: 'weapon', reqClass: 'priest', price: 5500, slots: 2, desc: 'A blessed mace boosting spell recoveries.' },
  jur_katar: { id: 'jur_katar', name: 'Jur Katar', type: 'weapon', atk: 95, slot: 'weapon', reqClass: 'assassin', price: 7000, slots: 2, desc: 'A specialized assassin katar that boosts critical hits.' },
  gakkung: { id: 'gakkung', name: 'Gakkung Bow', type: 'weapon', atk: 85, slot: 'weapon', reqClass: 'hunter', price: 6500, slots: 2, desc: 'A durable horn-composite recurve bow.' },

  dragon_slayer: { id: 'dragon_slayer', name: 'Dragon Slayer', type: 'weapon', atk: 240, slot: 'weapon', reqClass: 'lord_knight', price: 25000, slots: 2, desc: 'A legendary claymore forged in dragon blood.' },
  wizardry_staff: { id: 'wizardry_staff', name: 'Wizardry Staff', type: 'weapon', matk: 280, slot: 'weapon', reqClass: 'high_wizard', price: 30000, slots: 2, desc: 'A catalyst staff containing raw magical energy.' },
  grand_cross_mace: { id: 'grand_cross_mace', name: 'Grand Cross Mace', type: 'weapon', atk: 180, matk: 160, slot: 'weapon', reqClass: 'high_priest', price: 28000, slots: 2, desc: 'Emits a holy radiance that wards off demons.' },
  infiltrator: { id: 'infiltrator', name: 'Infiltrator Katar', type: 'weapon', atk: 210, slot: 'weapon', reqClass: 'assassin_cross', price: 35000, slots: 2, desc: 'Silent weapon that pierces human and beast armor alike.' },
  hunter_bow: { id: 'hunter_bow', name: 'Hunter Bow', type: 'weapon', atk: 190, slot: 'weapon', reqClass: 'sniper', price: 32000, slots: 2, desc: 'Fires heavy arrows that pin targets down.' },

  // Armor & Headgear
  wooden_shield: { id: 'wooden_shield', name: 'Wooden Shield', type: 'shield', def: 5, slot: 'shield', price: 150, slots: 1, desc: 'Basic wooden buckler.' },
  round_shield: { id: 'round_shield', name: 'Round Shield', type: 'shield', def: 18, slot: 'shield', price: 1500, slots: 1, desc: 'A sturdy iron round shield.' },
  golden_shield: { id: 'golden_shield', name: 'Golden Shield', type: 'shield', def: 45, mdef: 15, slot: 'shield', price: 12000, slots: 1, desc: 'MVP Golden Thief Bug armor. Negates magical lock.' },
  
  adventurer_coat: { id: 'adventurer_coat', name: 'Adventurer Coat', type: 'armor', def: 4, slot: 'armor', price: 200, slots: 1, desc: 'Simple linen coat.' },
  chain_mail: { id: 'chain_mail', name: 'Chain Mail', type: 'armor', def: 25, slot: 'armor', price: 2800, slots: 1, desc: 'Interlocking metal rings offering robust protection.' },
  lord_armor: { id: 'lord_armor', name: 'Lord Armor', type: 'armor', def: 60, vitBonus: 5, slot: 'armor', price: 18000, slots: 1, desc: 'High-tier armor lined with gold trim.' },

  ribbon: { id: 'ribbon', name: 'Red Ribbon', type: 'headgear', def: 1, slot: 'headgear', price: 80, slots: 1, desc: 'A cute decorative ribbon.' },
  goggles: { id: 'goggles', name: 'Goggles', type: 'headgear', def: 3, dexBonus: 2, slot: 'headgear', price: 1200, slots: 1, desc: 'Lenses that help pinpoint arrows.' },
  majestic_goat: { id: 'majestic_goat', name: 'Majestic Goat Horns', type: 'headgear', def: 12, strBonus: 5, slot: 'headgear', price: 20000, slots: 1, desc: 'MVP Baphomet horns. Radiates supreme physical strength.' },

  // Gathering Materials & Monster Drops
  jellopy: { id: 'jellopy', name: 'Jellopy', type: 'etc', price: 5, desc: 'A crystallized liquid jelly drop.' },
  fluff: { id: 'fluff', name: 'Fluff', type: 'etc', price: 8, desc: 'A tiny cotton wad from insect cocoons.' },
  feather: { id: 'feather', name: 'Feather', type: 'etc', price: 10, desc: 'A clean white lunatic feather.' },
  insect_shell: { id: 'insect_shell', name: 'Insect Shell', type: 'etc', price: 15, desc: 'Hard insect wing armor plate.' },
  clover: { id: 'clover', name: 'Four-Leaf Clover', type: 'etc', price: 30, desc: 'Super rare clover that boosts luck.' },
  solid_trunk: { id: 'solid_trunk', name: 'Solid Trunk', type: 'etc', price: 40, desc: 'A heavy block of wood from willow bark.' },
  iron_ore: { id: 'iron_ore', name: 'Iron Ore', type: 'etc', price: 50, desc: 'Unrefined iron ore used in forging.' },
  steel: { id: 'steel', name: 'Steel Plate', type: 'etc', price: 250, desc: 'Refined carbon steel for heavy armors.' },
  frost_crystal: { id: 'frost_crystal', name: 'Frost Crystal', type: 'etc', price: 120, desc: 'A snowflake crystal that never melts.' },
  bamboo_shoot: { id: 'bamboo_shoot', name: 'Bamboo Wood', type: 'etc', price: 65, desc: 'Flexible bamboo stalks from Payon forest.' },
  dark_matter: { id: 'dark_matter', name: 'Dark Core', type: 'etc', price: 200, desc: 'An orb of condensed dark shadows.' },
  mvp_medal: { id: 'mvp_medal', name: 'MVP Guild Medal', type: 'etc', price: 5000, desc: 'Guild badge of honor, awarded for boss kills.' },
  
  // Extra herbs / gathering items
  red_herb: { id: 'red_herb', name: 'Red Herb', type: 'etc', price: 15, desc: 'A medicinal red leaf.' },
  yellow_herb: { id: 'yellow_herb', name: 'Yellow Herb', type: 'etc', price: 25, desc: 'A medicinal yellow leaf.' },
  blue_herb: { id: 'blue_herb', name: 'Blue Herb', type: 'etc', price: 60, desc: 'A rare blue leaf that restores magic energy.' },
  white_herb: { id: 'white_herb', name: 'White Herb', type: 'etc', price: 100, desc: 'A potent medicinal white leaf.' },

  // Refinement Materials
  oridecon: { id: 'oridecon', name: 'Oridecon', type: 'etc', price: 1000, desc: 'A rare mineral used to refine weapons.' },
  elunium: { id: 'elunium', name: 'Elunium', type: 'etc', price: 1000, desc: 'A rare mineral used to refine armor, shields, and headgear.' },

  // Cards
  poring_card: { id: 'poring_card', name: 'Poring Card', type: 'card', cardSlot: 'armor', price: 2000, desc: 'Slots into armor. Grants +150 Max HP.' },
  archer_skeleton_card: { id: 'archer_skeleton_card', name: 'Archer Skeleton Card', type: 'card', cardSlot: 'weapon', price: 5000, desc: 'Slots into weapon. Grants +10% ATK.' },
  scorpion_card: { id: 'scorpion_card', name: 'Scorpion Card', type: 'card', cardSlot: 'weapon', price: 4000, desc: 'Slots into weapon. Grants +15 Hit.' },
  familiar_card: { id: 'familiar_card', name: 'Familiar Card', type: 'card', cardSlot: 'headgear', price: 3000, desc: 'Slots into headgear. Grants +12 Flee.' },
  golden_bug_card: { id: 'golden_bug_card', name: 'Golden Thief Bug Card', type: 'card', cardSlot: 'shield', price: 15000, desc: 'Slots into shield. Grants +30 MDEF.' },

  // Quest Items
  novice_badge: { id: 'novice_badge', name: 'Novice Trial Proof', type: 'quest', desc: 'Proof that you survived the Novice Trial.' },
  adventurer_license: { id: 'adventurer_license', name: 'Guild Adventurer License', type: 'quest', desc: 'Proof of Class Promotion Tier 1.' },
  peak_sigil: { id: 'peak_sigil', name: 'Peak Achievement Sigil', type: 'quest', desc: 'Symbol of a hero ready to ascend to Tier 3.' },
  dragon_egg: { id: 'dragon_egg', name: 'Dragon Egg', type: 'consumable', subType: 'hatch_egg', price: 5000, desc: 'A warm, patterned dragon egg. Use it to hatch one of three mounts: Fire Drake, Wind Wyvern, or Earth Wyrm.' },
  fire_drake: { id: 'fire_drake', name: 'Fire Drake Mount', type: 'mount', slot: 'mount', price: 15000, desc: 'A volcanic red dragon. Grants +50% move speed, fire footprints, and +15% physical fire damage.' },
  wind_wyvern: { id: 'wind_wyvern', name: 'Wind Wyvern Mount', type: 'mount', slot: 'mount', price: 15000, desc: 'A swift sky-blue wyvern. Grants +80% move speed, wind speed lines, and +15 Flee.' },
  earth_wyrm: { id: 'earth_wyrm', name: 'Earth Wyrm Mount', type: 'mount', slot: 'mount', price: 15000, desc: 'A heavy earth wyrm. Grants +30% move speed, +25 DEF, and +300 Max HP.' },
  dragon_scale: { id: 'dragon_scale', name: 'Dragon Scale', type: 'etc', price: 500, desc: 'A shimmering scale from a dragon monster.' },
  dragon_hunt_trial_proof: { id: 'dragon_hunt_trial_proof', name: 'Dragon Hunt Trial Proof', type: 'quest', desc: 'Proof of completing the Dragon Hunt Trial.' },
  red_dragon_card: {
    id: 'red_dragon_card',
    name: 'Red Dragon Card',
    type: 'card',
    price: 0,
    desc: 'An MVP card from the Red Fire Dragon. Socketing grants +30% Fire Attack and +5% ATK vs Dragon-type.'
  },
  golden_drake_card: {
    id: 'golden_drake_card',
    name: 'Golden Drake Card',
    type: 'card',
    price: 0,
    desc: 'An MVP card from the Golden Drake. Socketing grants +30% movement speed and +15 Flee.'
  },

  dragon_slayer_lance: {
    id: 'dragon_slayer_lance',
    name: 'Dragon Slayer Lance',
    type: 'weapon',
    atk: 330,
    slot: 'weapon',
    reqClass: 'dragon_knight',
    price: 60000,
    slots: 2,
    desc: 'A massive heavy lance specifically forged to puncture dragon scales.'
  },
  wyvern_strike_bow: {
    id: 'wyvern_strike_bow',
    name: 'Wyvern Strike Bow',
    type: 'weapon',
    atk: 290,
    slot: 'weapon',
    reqClass: 'wyvern_hunter',
    price: 60000,
    slots: 2,
    desc: 'A heavy recurve bow constructed from flexible wyvern wingbones.'
  },
  caduceus_of_light: {
    id: 'caduceus_of_light',
    name: 'Caduceus of Light',
    type: 'weapon',
    atk: 220,
    matk: 240,
    slot: 'weapon',
    reqClass: 'dragon_shaman',
    price: 60000,
    slots: 2,
    desc: 'A divine rod that radiates holy light and draconic restorative magic.'
  },
  dragon_heart_staff: {
    id: 'dragon_heart_staff',
    name: 'Dragon Heart Staff',
    type: 'weapon',
    matk: 380,
    slot: 'weapon',
    reqClass: 'dragon_arcanist',
    price: 65000,
    slots: 2,
    desc: 'An ancient staff embedded with a crimson dragon heart crystal.'
  },
  dragon_tooth_katar: {
    id: 'dragon_tooth_katar',
    name: 'Dragon Tooth Katar',
    type: 'weapon',
    atk: 310,
    slot: 'weapon',
    reqClass: 'dragon_executioner',
    price: 62000,
    slots: 2,
    desc: 'A dual-pronged katar fashioned from razor-sharp dragon fangs.'
  },
  dragon_scale_mail: {
    id: 'dragon_scale_mail',
    name: 'Dragon Scale Mail',
    type: 'armor',
    def: 95,
    vitBonus: 8,
    slot: 'armor',
    price: 45000,
    slots: 1,
    desc: 'Elite heavy plate lined with interlocking fire-resistant dragon scales.'
  },
  dragon_scale_shield: {
    id: 'dragon_scale_shield',
    name: 'Dragon Scale Shield',
    type: 'shield',
    def: 60,
    mdef: 25,
    slot: 'shield',
    price: 35000,
    slots: 1,
    desc: 'A heavy shield providing robust protection against elemental breath.'
  }
};

export const QUESTS = [
  {
    id: 'novice_trial',
    name: 'Guild Novice Trial',
    desc: 'Defeat 5 Porings and gather 3 Jellopies to prove you are ready to choose your first class tier.',
    minLevel: 1,
    reqClass: 'novice',
    targets: {
      monsters: { poring: 5 },
      items: { jellopy: 3 }
    },
    rewards: {
      exp: 100,
      jobExp: 100,
      zenny: 200,
      items: { novice_badge: 1 }
    }
  },
  {
    id: 'payon_extermination',
    name: 'Payon Forest Extermination',
    desc: 'The Payon guild reports an outbreak. Kill 8 Spores and gather 2 Blue Herbs.',
    minLevel: 10,
    reqClass: 'any',
    targets: {
      monsters: { spore: 8 },
      items: { blue_herb: 2 }
    },
    rewards: {
      exp: 800,
      jobExp: 700,
      zenny: 1000,
      items: { yellow_potion: 5 }
    }
  },
  {
    id: 'desert_survey',
    name: 'Sograt Desert Survey',
    desc: 'Gather 5 Iron Ores from the Sograt Desert and defeat 6 Scorpions to earn your Class Tier 2 recommendation.',
    minLevel: 25,
    reqClass: 'any',
    targets: {
      monsters: { scorpion: 6 },
      items: { iron_ore: 5 }
    },
    rewards: {
      exp: 5000,
      jobExp: 4500,
      zenny: 3000,
      items: { adventurer_license: 1, white_potion: 10 }
    }
  },
  {
    id: 'mjolnir_peak',
    name: 'Mjolnir Icy Ascent',
    desc: 'Defeat 8 Dire Wolves on the snowy mountain of Mjolnir, and gather 4 Frost Crystals.',
    minLevel: 45,
    reqClass: 'any',
    targets: {
      monsters: { wolf: 8 },
      items: { frost_crystal: 4 }
    },
    rewards: {
      exp: 12000,
      jobExp: 11000,
      zenny: 8000,
      items: { peak_sigil: 1, blue_potion: 15 }
    }
  },
  {
    id: 'boss_gtb',
    name: 'Guild Raid: Golden Thief Bug',
    desc: 'Subjugate the Golden Thief Bug in the Sograt Desert and recover its Golden Shield.',
    minLevel: 30,
    reqClass: 'any',
    targets: {
      monsters: { golden_bug: 1 }
    },
    rewards: {
      exp: 30000,
      jobExp: 25000,
      zenny: 15000,
      items: { royal_jelly: 10, golden_shield: 1 }
    }
  },
  {
    id: 'boss_baphomet',
    name: 'Guild Raid: Baphomet Lord',
    desc: 'Defeat the Demon Lord Baphomet in Geffen Dungeon. (Elite Guild Subjugation)',
    minLevel: 55,
    reqClass: 'any',
    targets: {
      monsters: { baphomet: 1 }
    },
    rewards: {
      exp: 100000,
      jobExp: 90000,
      zenny: 50000,
      items: { majestic_goat: 1, royal_jelly: 20 }
    }
  },
  {
    id: 'dragon_hunt_trial',
    name: 'Dragon Hunt Trial',
    desc: 'Defeat the Red Fire Dragon to prove your absolute strength as a Dragon Slayer.',
    minLevel: 75,
    reqClass: 'any',
    targets: {
      monsters: { red_fire_dragon: 1 }
    },
    rewards: {
      exp: 50000,
      jobExp: 50000,
      zenny: 20000,
      items: { dragon_hunt_trial_proof: 1 }
    }
  },
  {
    id: 'wyvern_nest_clear',
    name: 'Wyvern Nest Cleansing',
    desc: 'Rogue wyverns are attacking the caravan routes. Defeat 5 Wyverns and gather 3 Dragon Scales to secure the pass.',
    minLevel: 70,
    reqClass: 'any',
    targets: {
      monsters: { wyvern: 5 },
      items: { dragon_scale: 3 }
    },
    rewards: {
      exp: 45000,
      jobExp: 42000,
      zenny: 15000,
      items: { royal_jelly: 5, white_potion: 15 }
    }
  },
  {
    id: 'dragon_scale_crafting',
    name: 'Draconic Blacksmithing',
    desc: 'Hilda needs materials to craft peak dragon gear. Bring her 10 Dragon Scales and 5 Steel Plates.',
    minLevel: 75,
    reqClass: 'any',
    targets: {
      items: { dragon_scale: 10, steel: 5 }
    },
    rewards: {
      exp: 30000,
      jobExp: 30000,
      zenny: 5000,
      items: { dragon_scale_mail: 1 }
    }
  },

  // ─── Dragon Slayer Trials Narrative Questline ────────────────────────────────
  {
    id: 'dragon_slayer_chapter1',
    name: '📖 Chapter 1: The Dragon Egg Prophecy',
    desc: '"Elder Zenn leans forward, firelight dancing in his scarred eyes. \'The prophecy speaks clearly \u2014 only one who raises a dragon from birth may command enough power to face the Golden Drake. Find a Dragon Egg and hatch it. Your journey begins now.\'" Obtain and use a Dragon Egg to hatch a mount.',
    minLevel: 40,
    reqClass: 'any',
    targets: {
      items: { dragon_egg: 1 }
    },
    rewards: {
      exp: 15000,
      jobExp: 12000,
      zenny: 5000,
      items: { dragon_scale: 5, red_potion: 20 }
    }
  },
  {
    id: 'dragon_slayer_chapter2',
    name: '📖 Chapter 2: Trial by Fire',
    desc: '"Fire Sage Brun crosses her arms, skeptical. \'Strength? You want to prove strength? Then enter the Volcanic Hatchery and slay 10 Lava Basilisks. Bring their scales back to me. Only then will I grant you my blessing.\'" Defeat 10 Lava Basilisks and gather 5 Dragon Scales.',
    minLevel: 55,
    reqClass: 'any',
    targets: {
      monsters: { lava_basilisk: 10 },
      items: { dragon_scale: 5 }
    },
    rewards: {
      exp: 35000,
      jobExp: 30000,
      zenny: 12000,
      items: { oridecon: 3, elunium: 3, blue_potion: 15 }
    }
  },
  {
    id: 'dragon_slayer_chapter3',
    name: '📖 Chapter 3: Storm of the Peak',
    desc: '"Sky Warden Kara\'s face is grim. \'The storm wyverns are blockading the ascent path. No one can reach the summit while they nest there. Clear the way \u2014 defeat 8 Storm Wyverns \u2014 and I will open the passage to Dragon Peak.\'" Defeat 8 Storm Wyverns on Dragon Peak.',
    minLevel: 65,
    reqClass: 'any',
    targets: {
      monsters: { storm_wyvern: 8 }
    },
    rewards: {
      exp: 55000,
      jobExp: 48000,
      zenny: 20000,
      items: { dragon_scale: 10, white_potion: 20, oridecon: 5 }
    }
  },
  {
    id: 'dragon_slayer_chapter4',
    name: '📖 Chapter 4: Slay the Golden Drake',
    desc: '"Zenn places a weathered hand on your shoulder, voice low. \'I\'ve hunted dragons for forty years and never faced anything like the Golden Drake. But you \u2014 you\'ve earned this fight. Ascend Dragon Peak. Claim glory for the Guild \u2014 or join the countless who came before you.\'" Defeat the Golden Drake MVP boss.',
    minLevel: 70,
    reqClass: 'any',
    targets: {
      monsters: { golden_drake: 1 }
    },
    rewards: {
      exp: 150000,
      jobExp: 120000,
      zenny: 50000,
      items: { golden_drake_card: 1, dragon_scale: 20, dragon_hunt_trial_proof: 1 }
    }
  }
];
