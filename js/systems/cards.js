// js/systems/cards.js - Monster Cards & Bestiary Codex Subsystem.
// Manages the 43 monster cards catalog, socketing rules, Old Card Album drop rolls,
// bestiary kill & drop logging, and zone collection milestone bonuses.

export const CARD_CATALOG = {
  // ===== Whispering Woods (12 Cards) =====
  card_slime: {
    id: 'card_slime',
    monsterId: 'slime',
    name: 'Gel Slime Card',
    rarity: 'common',
    targetSlot: 'armor',
    zone: 'woods',
    statMods: { maxHp: 60 },
    flavor: 'A wobbling blob. In armor, grants +60 Max HP.',
    collectionBonus: '+60 Max HP',
  },
  card_goblin: {
    id: 'card_goblin',
    monsterId: 'goblin',
    name: 'Scrap Goblin Card',
    rarity: 'common',
    targetSlot: 'weapon',
    zone: 'woods',
    statMods: { physAtk: 6, zenyPct: 5 },
    flavor: 'A scrawny raider. In weapon, grants +6 ATK and +5% Zeny gained from kills.',
    collectionBonus: '+6 ATK, +5% Zeny',
  },
  card_goblin_scout: {
    id: 'card_goblin_scout',
    monsterId: 'goblin_scout',
    name: 'Goblin Scout Card',
    rarity: 'common',
    targetSlot: 'accessory',
    zone: 'woods',
    statMods: { flee: 6, moveSpeedPct: 3 },
    flavor: 'A quick-footed skirmisher. In accessory, grants +6 Flee and +3% Move Speed.',
    collectionBonus: '+6 Flee, +3% Move Speed',
  },
  card_goblin_chieftain: {
    id: 'card_goblin_chieftain',
    monsterId: 'goblin_chieftain',
    name: 'Goblin Chieftain Card',
    rarity: 'uncommon',
    targetSlot: 'weapon',
    zone: 'woods',
    statMods: { physAtk: 12, cleaveRadiusPct: 4 },
    flavor: 'The crowned scrap-king of the warrens. In weapon, grants +12 ATK and +4% Melee Cleave radius.',
    collectionBonus: '+12 ATK, +4% Melee Cleave radius',
  },
  card_barkskin_warden: {
    id: 'card_barkskin_warden',
    monsterId: 'barkskin_warden',
    name: 'Barkskin Warden Card',
    rarity: 'common',
    targetSlot: 'armor',
    zone: 'woods',
    statMods: { physDef: 10, res_nature: 5 },
    flavor: 'Living wood animated to guard the elder grove. In armor, grants +10 DEF and +5% Nature Resistance.',
    collectionBonus: '+10 DEF, +5% Nature Res',
  },
  card_blight_sprite: {
    id: 'card_blight_sprite',
    monsterId: 'blight_sprite',
    name: 'Blight Sprite Card',
    rarity: 'common',
    targetSlot: 'accessory',
    zone: 'woods',
    statMods: { magicAtk: 8, manaCostPct: -5 },
    flavor: 'A fluttering spirit warped by corrupted spores. In accessory, grants +8 MATK and -5% Mana cost.',
    collectionBonus: '+8 MATK, -5% Mana Cost',
  },
  card_corrupted_dryad: {
    id: 'card_corrupted_dryad',
    monsterId: 'corrupted_dryad',
    name: 'Corrupted Dryad Card',
    rarity: 'uncommon',
    targetSlot: 'armor',
    zone: 'woods',
    statMods: { maxHp: 80, hpRegenPct: 2 },
    flavor: 'A weeping guardian entangled in shadow roots. In armor, grants +80 Max HP and +2% HP Regen per 5s.',
    collectionBonus: '+80 Max HP, +2% HP Regen',
  },
  card_wolf: {
    id: 'card_wolf',
    monsterId: 'wolf',
    name: 'Dire Wolf Card',
    rarity: 'common',
    targetSlot: 'weapon',
    zone: 'woods',
    statMods: { physAtk: 8, critChance: 4 },
    flavor: 'Lean, fast, and always hunting. In weapon, grants +8 ATK and +4% Critical Chance.',
    collectionBonus: '+8 ATK, +4% Crit Chance',
  },
  card_thornback_boar: {
    id: 'card_thornback_boar',
    monsterId: 'thornback_boar',
    name: 'Thornback Boar Card',
    rarity: 'common',
    targetSlot: 'armor',
    zone: 'woods',
    statMods: { physDef: 12, reflectPhysPct: 5 },
    flavor: 'Bramble roots armor its hide. In armor, grants +12 DEF and reflects 5% physical damage taken.',
    collectionBonus: '+12 DEF, 5% Thorns',
  },
  card_mossback_beetle: {
    id: 'card_mossback_beetle',
    monsterId: 'mossback_beetle',
    name: 'Mossback Beetle Card',
    rarity: 'common',
    targetSlot: 'armor',
    zone: 'woods',
    statMods: { physDef: 15, maxHp: 50 },
    flavor: 'A patient shell-creeper. In armor, grants +15 DEF and +50 Max HP.',
    collectionBonus: '+15 DEF, +50 Max HP',
  },
  card_shade: {
    id: 'card_shade',
    monsterId: 'shade',
    name: 'Woodland Shade Card',
    rarity: 'common',
    targetSlot: 'accessory',
    zone: 'woods',
    statMods: { flee: 10, res_void: 5 },
    flavor: 'A restless spirit bound to the ruins edge. In accessory, grants +10 Flee and +5% Void Resistance.',
    collectionBonus: '+10 Flee, +5% Void Res',
  },
  card_elderwood_treant: {
    id: 'card_elderwood_treant',
    monsterId: 'elderwood_treant',
    name: 'Elderwood Treant Card',
    rarity: 'epic',
    targetSlot: 'armor',
    zone: 'woods',
    statMods: { maxHp: 180, res_nature: 15 },
    onHit: { effect: 'entangle', chance: 0.10, duration: 1.5 },
    flavor: 'The forest’s oldest warden. In armor, grants +180 Max HP, +15% Nature Resistance, and 10% chance to entangle attackers.',
    collectionBonus: '+180 Max HP, +15% Nature Res',
  },

  // ===== Sunken Ruins & Whispering Depths (8 Cards) =====
  card_mire_leech: {
    id: 'card_mire_leech',
    monsterId: 'mire_leech',
    name: 'Mire Leech Card',
    rarity: 'common',
    targetSlot: 'weapon',
    zone: 'ruins',
    statMods: { physAtk: 6, lifestealPct: 2 },
    flavor: 'A pale feeder swollen on memories. In weapon, grants +2% Physical Lifesteal.',
    collectionBonus: '+2% Physical Lifesteal',
  },
  card_drowned_acolyte: {
    id: 'card_drowned_acolyte',
    monsterId: 'drowned_acolyte',
    name: 'Drowned Acolyte Card',
    rarity: 'common',
    targetSlot: 'accessory',
    zone: 'ruins',
    statMods: { magicAtk: 12, res_water: 8, res_ice: 8 },
    flavor: 'An abbey novice still chanting through water. In accessory, grants +12 MATK and +8% Water/Ice Resistance.',
    collectionBonus: '+12 MATK, +8% Water/Ice Res',
  },
  card_ruin_crawler: {
    id: 'card_ruin_crawler',
    monsterId: 'ruin_crawler',
    name: 'Ruin Crawler Card',
    rarity: 'common',
    targetSlot: 'armor',
    zone: 'ruins',
    statMods: { physDef: 14, stunResPct: 6 },
    flavor: 'Stone plates clicking beneath drowned halls. In armor, grants +14 DEF and +6% Stun Resistance.',
    collectionBonus: '+14 DEF, +6% Stun Res',
  },
  card_tidecrawler: {
    id: 'card_tidecrawler',
    monsterId: 'tidecrawler',
    name: 'Tidecrawler Card',
    rarity: 'common',
    targetSlot: 'weapon',
    zone: 'ruins',
    statMods: { physAtk: 10, dmgVsAquaticPct: 5 },
    flavor: 'A heavily armored crustacean guarding shallows. In weapon, grants +10 ATK and +5% damage against Aquatic monsters.',
    collectionBonus: '+10 ATK, +5% Aquatic Dmg',
  },
  card_abyssal_siren: {
    id: 'card_abyssal_siren',
    monsterId: 'abyssal_siren',
    name: 'Abyssal Siren Card',
    rarity: 'uncommon',
    targetSlot: 'accessory',
    zone: 'ruins',
    statMods: { magicAtk: 15, castSpeedPct: 5 },
    flavor: 'Her song draws you into crushing depths. In accessory, grants +15 MATK and +5% Cast Speed.',
    collectionBonus: '+15 MATK, +5% Cast Speed',
  },
  card_leviathans_shadow: {
    id: 'card_leviathans_shadow',
    monsterId: 'leviathans_shadow',
    name: 'Leviathan Shadow Card',
    rarity: 'rare',
    targetSlot: 'armor',
    zone: 'ruins',
    statMods: { maxHp: 100, res_water: 10 },
    flavor: 'A fraction of abyssal terror made manifest. In armor, grants +100 Max HP and +10% Water Resistance.',
    collectionBonus: '+100 Max HP, +10% Water Res',
  },
  card_void_construct: {
    id: 'card_void_construct',
    monsterId: 'void_construct',
    name: 'Void Construct Card',
    rarity: 'rare',
    targetSlot: 'armor',
    zone: 'ruins',
    statMods: { physDef: 18, res_void: 8 },
    flavor: 'A geometric nightmare of hard light and heavy gravity. In armor, grants +18 DEF and +8% Void Resistance.',
    collectionBonus: '+18 DEF, +8% Void Res',
  },
  card_ruin_golem: {
    id: 'card_ruin_golem',
    monsterId: 'ruin_golem',
    name: 'Ruin Golem Card',
    rarity: 'epic',
    targetSlot: 'armor',
    zone: 'ruins',
    statMods: { physDef: 28, maxHp: 150, physDmgReductionPct: 5 },
    flavor: 'An ancient guardian of stone. In armor, grants +28 DEF, +150 Max HP, and reduces incoming physical damage by 5%.',
    collectionBonus: '+28 DEF, +150 Max HP, -5% Phys Dmg',
  },

  // ===== Frostpeak Tundra (5 Cards) =====
  card_frost_wolf: {
    id: 'card_frost_wolf',
    monsterId: 'frost_wolf',
    name: 'Frost Wolf Card',
    rarity: 'common',
    targetSlot: 'weapon',
    zone: 'tundra',
    statMods: { physAtk: 12 },
    onHit: { effect: 'slow', chance: 0.10, duration: 3.0 },
    flavor: 'A wolf of living ice. In weapon, grants +12 ATK and 10% chance on hit to inflict Slow.',
    collectionBonus: '+12 ATK, Slow on Hit',
  },
  card_ice_wraith: {
    id: 'card_ice_wraith',
    monsterId: 'ice_wraith',
    name: 'Ice Wraith Card',
    rarity: 'common',
    targetSlot: 'accessory',
    zone: 'tundra',
    statMods: { magicAtk: 15, dmg_ice: 10 },
    flavor: 'A frozen soul that drifts the peaks. In accessory, grants +15 MATK and +10% Ice Damage.',
    collectionBonus: '+15 MATK, +10% Ice Dmg',
  },
  card_rime_harpy: {
    id: 'card_rime_harpy',
    monsterId: 'rime_harpy',
    name: 'Storm Harpy Card',
    rarity: 'common',
    targetSlot: 'weapon',
    zone: 'tundra',
    statMods: { physAtk: 8, atkSpeedPct: 6 },
    flavor: 'Rides the storm-front with thunder. In weapon, grants +8 ATK and +6% Attack Speed.',
    collectionBonus: '+8 ATK, +6% Atk Speed',
  },
  card_tundra_lurker: {
    id: 'card_tundra_lurker',
    monsterId: 'tundra_lurker',
    name: 'Tundra Lurker Card',
    rarity: 'common',
    targetSlot: 'armor',
    zone: 'tundra',
    statMods: { physDef: 16, res_ice: 10 },
    flavor: 'Vanishes beneath powder snow. In armor, grants +16 DEF and +10% Ice Resistance.',
    collectionBonus: '+16 DEF, +10% Ice Res',
  },
  card_frost_revenant: {
    id: 'card_frost_revenant',
    monsterId: 'frost_revenant',
    name: 'Frost Revenant Card',
    rarity: 'epic',
    targetSlot: 'weapon',
    zone: 'tundra',
    statMods: { physAtk: 22, dmg_ice: 15 },
    onHit: { effect: 'frost_nova', chance: 0.12, dmgPct: 120 },
    flavor: 'A king who froze on his throne. In weapon, grants +22 ATK, +15% Ice Damage, and 12% chance on hit to trigger Frost Nova.',
    collectionBonus: '+22 ATK, Frost Nova on Hit',
  },

  // ===== Dragon Caldera (5 Cards) =====
  card_sand_stalker: {
    id: 'card_sand_stalker',
    monsterId: 'sand_stalker',
    name: 'Sand Stalker Card',
    rarity: 'common',
    targetSlot: 'weapon',
    zone: 'caldera',
    statMods: { physAtk: 14, hitRatePct: 8 },
    flavor: 'Waits beneath the dunes. In weapon, grants +14 ATK and +8% Hit Rate.',
    collectionBonus: '+14 ATK, +8% Hit Rate',
  },
  card_ember_imp: {
    id: 'card_ember_imp',
    monsterId: 'ember_imp',
    name: 'Ember Imp Card',
    rarity: 'common',
    targetSlot: 'accessory',
    zone: 'caldera',
    statMods: { magicAtk: 15, dmg_fire: 10 },
    flavor: 'A gleeful little devil made of coals. In accessory, grants +15 MATK and +10% Fire Damage.',
    collectionBonus: '+15 MATK, +10% Fire Dmg',
  },
  card_magma_beetle: {
    id: 'card_magma_beetle',
    monsterId: 'magma_beetle',
    name: 'Magma Beetle Card',
    rarity: 'common',
    targetSlot: 'armor',
    zone: 'caldera',
    statMods: { physDef: 20, res_fire: 12 },
    flavor: 'Its basalt shell seals a furnace core. In armor, grants +20 DEF and +12% Fire Resistance.',
    collectionBonus: '+20 DEF, +12% Fire Res',
  },
  card_ashwing: {
    id: 'card_ashwing',
    monsterId: 'ashwing',
    name: 'Ashwing Card',
    rarity: 'common',
    targetSlot: 'accessory',
    zone: 'caldera',
    statMods: { flee: 12, moveSpeedPct: 4 },
    flavor: 'Soot-feathered flier nesting in vents. In accessory, grants +12 Flee and +4% Move Speed.',
    collectionBonus: '+12 Flee, +4% Move Speed',
  },
  card_flame_dragon: {
    id: 'card_flame_dragon',
    monsterId: 'flame_dragon',
    name: 'Flame Dragon Card',
    rarity: 'epic',
    targetSlot: 'weapon',
    zone: 'caldera',
    statMods: { physAtk: 28, dmg_fire: 20 },
    onHit: { effect: 'meteor', chance: 0.08, dmgPct: 150 },
    flavor: 'The tyrant of the caldera. In weapon, grants +28 ATK, +20% Fire Damage, and 8% chance to call down Meteor.',
    collectionBonus: '+28 ATK, Meteor on Attack',
  },

  // ===== Astral Rift & Sky Peaks (9 Cards) =====
  card_zephyr_hawk: {
    id: 'card_zephyr_hawk',
    monsterId: 'zephyr_hawk',
    name: 'Zephyr Hawk Card',
    rarity: 'common',
    targetSlot: 'weapon',
    zone: 'rift',
    statMods: { physAtk: 10, atkSpeedPct: 8 },
    flavor: 'Dances on windstreams with blinding speed. In weapon, grants +10 ATK and +8% Attack Speed.',
    collectionBonus: '+10 ATK, +8% Atk Speed',
  },
  card_storm_elemental: {
    id: 'card_storm_elemental',
    monsterId: 'storm_elemental',
    name: 'Storm Elemental Card',
    rarity: 'common',
    targetSlot: 'accessory',
    zone: 'rift',
    statMods: { magicAtk: 18, dmg_lightning: 12 },
    flavor: 'A coalesced tempest of sparks and fury. In accessory, grants +18 MATK and +12% Lightning Damage.',
    collectionBonus: '+18 MATK, +12% Lightning Dmg',
  },
  card_zenith_warden: {
    id: 'card_zenith_warden',
    monsterId: 'zenith_warden',
    name: 'The Zenith Warden Card',
    rarity: 'epic',
    targetSlot: 'armor',
    zone: 'rift',
    statMods: { physDef: 25, maxHp: 180, res_holy: 15 },
    flavor: 'An ancient construct guarding highest peaks. In armor, grants +25 DEF, +180 Max HP, and +15% Holy Resistance.',
    collectionBonus: '+25 DEF, +180 Max HP, +15% Holy Res',
  },
  card_void_wisp: {
    id: 'card_void_wisp',
    monsterId: 'void_wisp',
    name: 'Void Wisp Card',
    rarity: 'common',
    targetSlot: 'accessory',
    zone: 'rift',
    statMods: { magicAtk: 16, maxMp: 60 },
    flavor: 'A mote of unmade reality. In accessory, grants +16 MATK and +60 Max MP.',
    collectionBonus: '+16 MATK, +60 Max MP',
  },
  card_star_reaver: {
    id: 'card_star_reaver',
    monsterId: 'star_reaver',
    name: 'Star Reaver Card',
    rarity: 'common',
    targetSlot: 'weapon',
    zone: 'rift',
    statMods: { physAtk: 16, critDmgPct: 6 },
    flavor: 'A warrior swinging a blade of cold starlight. In weapon, grants +16 ATK and +6% Critical Damage.',
    collectionBonus: '+16 ATK, +6% Crit Dmg',
  },
  card_astral_knight: {
    id: 'card_astral_knight',
    monsterId: 'astral_knight',
    name: 'Astral Knight Card',
    rarity: 'common',
    targetSlot: 'armor',
    zone: 'rift',
    statMods: { physDef: 22, maxHp: 120 },
    flavor: 'Armored in condensed moonlight. In armor, grants +22 DEF and +120 Max HP.',
    collectionBonus: '+22 DEF, +120 Max HP',
  },
  card_rift_manta: {
    id: 'card_rift_manta',
    monsterId: 'rift_manta',
    name: 'Rift Manta Card',
    rarity: 'common',
    targetSlot: 'accessory',
    zone: 'rift',
    statMods: { flee: 14, res_void: 10 },
    flavor: 'Swims between broken constellations. In accessory, grants +14 Flee and +10% Void Resistance.',
    collectionBonus: '+14 Flee, +10% Void Res',
  },
  card_constellation_mite: {
    id: 'card_constellation_mite',
    monsterId: 'constellation_mite',
    name: 'Constellation Mite Card',
    rarity: 'common',
    targetSlot: 'armor',
    zone: 'rift',
    statMods: { physDef: 15, res_all: 10 },
    flavor: 'A tiny star-eater skittering across broken paths. In armor, grants +15 DEF and +10% All Elemental Resistance.',
    collectionBonus: '+15 DEF, +10% All Elemental Res',
  },
  card_nullking: {
    id: 'card_nullking',
    monsterId: 'nullking',
    name: 'The Nullking Card',
    rarity: 'legendary',
    targetSlot: 'any',
    zone: 'rift',
    statMods: { physAtk: 35, magicAtk: 35, dmg_all: 15, defPenetrationPct: 20 },
    flavor: 'The crowned end of all things. In any slot, grants +35 ATK, +35 MATK, +15% All Elemental Damage, and 20% DEF Penetration.',
    collectionBonus: '+35 ATK/MATK, +15% All Dmg, 20% DEF Pen',
  },

  // ===== Incursions & Roaming Bosses (4 Cards) =====
  card_void_stalker: {
    id: 'card_void_stalker',
    monsterId: 'void_stalker',
    name: 'Void Stalker Card',
    rarity: 'uncommon',
    targetSlot: 'weapon',
    zone: 'incursion',
    statMods: { physAtk: 18 },
    onHit: { effect: 'void_vuln', chance: 0.08, duration: 4.0 },
    flavor: 'A predatory entity from dimensional seams. In weapon, grants +18 ATK and 8% chance to inflict Void Vulnerability.',
    collectionBonus: '+18 ATK, Void Vulnerability on Hit',
  },
  card_void_herald: {
    id: 'card_void_herald',
    monsterId: 'void_herald',
    name: 'Dimensional Herald Card',
    rarity: 'epic',
    targetSlot: 'weapon',
    zone: 'incursion',
    statMods: { physAtk: 25, magicAtk: 20 },
    onHit: { effect: 'void_tear', chance: 0.10, dmgPct: 140 },
    flavor: 'The harbinger of the rift. In weapon, grants +25 ATK, +20 MATK, and 10% chance to trigger Void Tear.',
    collectionBonus: '+25 ATK, +20 MATK, Void Tear on Hit',
  },
  card_voidmaw_sovereign: {
    id: 'card_voidmaw_sovereign',
    monsterId: 'voidmaw_sovereign',
    name: 'Voidmaw Sovereign Card',
    rarity: 'epic',
    targetSlot: 'armor',
    zone: 'incursion',
    statMods: { physDef: 30, maxHp: 220, incursionDmgReductionPct: 10 },
    flavor: 'A world-eating tide given a crown. In armor, grants +30 DEF, +220 Max HP, and -10% damage taken in Incursions.',
    collectionBonus: '+30 DEF, +220 Max HP, -10% Incursion Dmg',
  },
  card_gilded_ravager: {
    id: 'card_gilded_ravager',
    monsterId: 'gilded_ravager',
    name: 'Gilded Ravager Card',
    rarity: 'epic',
    targetSlot: 'accessory',
    zone: 'incursion',
    statMods: { zenyPct: 15, luk: 5, dropRarityPct: 10 },
    flavor: 'A nomad tyrant crowned in stolen gold. In accessory, grants +15% Zeny gain, +5 LUK, and +10% Item Drop Rarity.',
    collectionBonus: '+15% Zeny, +5 LUK, +10% Drop Rarity',
  },

  // ===== Ashen Steppes (5 Cards) =====
  card_sand_scorpion: {
    id: 'card_sand_scorpion',
    monsterId: 'sand_scorpion',
    name: 'Sand Scorpion Card',
    rarity: 'common',
    targetSlot: 'weapon',
    zone: 'steppes',
    statMods: { physAtk: 10, critChance: 3 },
    flavor: 'A venomous hunter of the dunes. In weapon, grants +10 ATK and +3% Critical Chance.',
    collectionBonus: '+10 ATK, +3% Crit Chance',
  },
  card_hyena_marauder: {
    id: 'card_hyena_marauder',
    monsterId: 'hyena_marauder',
    name: 'Hyena Marauder Card',
    rarity: 'common',
    targetSlot: 'accessory',
    zone: 'steppes',
    statMods: { flee: 8, moveSpeedPct: 3 },
    flavor: 'A cackling nomad scavenger. In accessory, grants +8 Flee and +3% Move Speed.',
    collectionBonus: '+8 Flee, +3% Move Speed',
  },
  card_canyon_basilisk: {
    id: 'card_canyon_basilisk',
    monsterId: 'canyon_basilisk',
    name: 'Canyon Basilisk Card',
    rarity: 'uncommon',
    targetSlot: 'armor',
    zone: 'steppes',
    statMods: { physDef: 14, maxHp: 80 },
    flavor: 'A petrifying reptilian sentinel. In armor, grants +14 DEF and +80 Max HP.',
    collectionBonus: '+14 DEF, +80 Max HP',
  },
  card_karrion_goliath: {
    id: 'card_karrion_goliath',
    monsterId: 'karrion_goliath',
    name: 'Karrion Goliath Card',
    rarity: 'epic',
    targetSlot: 'armor',
    zone: 'steppes',
    statMods: { physDef: 26, maxHp: 180, physDmgReductionPct: 6 },
    flavor: 'Colossal titan of petrified clay. In armor, grants +26 DEF, +180 Max HP, and -6% incoming Physical Damage.',
    collectionBonus: '+26 DEF, +180 Max HP, -6% Phys Dmg',
  },
  card_sandstone_colossus: {
    id: 'card_sandstone_colossus',
    monsterId: 'sandstone_colossus',
    name: 'Sandstone Colossus Card',
    rarity: 'epic',
    targetSlot: 'weapon',
    zone: 'steppes',
    statMods: { physAtk: 22, defPenetrationPct: 8 },
    flavor: 'Ancient tomb guardian of the desert kings. In weapon, grants +22 ATK and +8% DEF Penetration.',
    collectionBonus: '+22 ATK, +8% DEF Penetration',
  },

  // ===== Twilight Mire (5 Cards) =====
  card_spore_creeper: {
    id: 'card_spore_creeper',
    monsterId: 'spore_creeper',
    name: 'Spore Creeper Card',
    rarity: 'common',
    targetSlot: 'armor',
    zone: 'mire',
    statMods: { maxHp: 100, res_nature: 8 },
    flavor: 'A spore-ridden swamp crawler. In armor, grants +100 Max HP and +8% Nature Resistance.',
    collectionBonus: '+100 Max HP, +8% Nature Res',
  },
  card_bog_witch: {
    id: 'card_bog_witch',
    monsterId: 'bog_witch',
    name: 'Bog Witch Card',
    rarity: 'uncommon',
    targetSlot: 'weapon',
    zone: 'mire',
    statMods: { magicAtk: 16, castSpeedPct: 4 },
    flavor: 'A corrupt sorceress chanting in the mists. In weapon, grants +16 MATK and +4% Cast Speed.',
    collectionBonus: '+16 MATK, +4% Cast Speed',
  },
  card_marsh_hydra: {
    id: 'card_marsh_hydra',
    monsterId: 'marsh_hydra',
    name: 'Marsh Hydra Card',
    rarity: 'rare',
    targetSlot: 'accessory',
    zone: 'mire',
    statMods: { hpRegenPct: 4, maxHp: 120 },
    flavor: 'A multi-headed terror of the bayou. In accessory, grants +4% HP Regen and +120 Max HP.',
    collectionBonus: '+4% HP Regen, +120 Max HP',
  },
  card_bog_behemoth: {
    id: 'card_bog_behemoth',
    monsterId: 'bog_behemoth',
    name: 'Bog Behemoth Card',
    rarity: 'epic',
    targetSlot: 'armor',
    zone: 'mire',
    statMods: { physDef: 30, maxHp: 220, res_nature: 15 },
    flavor: 'Primordial titan of the sunken bayou. In armor, grants +30 DEF, +220 Max HP, and +15% Nature Resistance.',
    collectionBonus: '+30 DEF, +220 Max HP, +15% Nature Res',
  },
  card_sporeheart_matron: {
    id: 'card_sporeheart_matron',
    monsterId: 'sporeheart_matron',
    name: 'Sporeheart Matron Card',
    rarity: 'epic',
    targetSlot: 'accessory',
    zone: 'mire',
    statMods: { magicAtk: 24, manaCostPct: -8 },
    flavor: 'Fungal broodmother brooding in the hollow. In accessory, grants +24 MATK and -8% Mana Cost.',
    collectionBonus: '+24 MATK, -8% Mana Cost',
  },

  // ===== Tempest Spires (5 Cards) =====
  card_gale_harpy: {
    id: 'card_gale_harpy',
    monsterId: 'gale_harpy',
    name: 'Gale Harpy Card',
    rarity: 'common',
    targetSlot: 'weapon',
    zone: 'spires',
    statMods: { physAtk: 18, critChance: 5 },
    flavor: 'A razor-winged storm hunter. In weapon, grants +18 ATK and +5% Critical Chance.',
    collectionBonus: '+18 ATK, +5% Crit Chance',
  },
  card_lightning_wisp: {
    id: 'card_lightning_wisp',
    monsterId: 'lightning_wisp',
    name: 'Lightning Wisp Card',
    rarity: 'common',
    targetSlot: 'accessory',
    zone: 'spires',
    statMods: { magicAtk: 20, castSpeedPct: 6 },
    flavor: 'A ball of pure ionized plasma. In accessory, grants +20 MATK and +6% Cast Speed.',
    collectionBonus: '+20 MATK, +6% Cast Speed',
  },
  card_skyward_valkyrie: {
    id: 'card_skyward_valkyrie',
    monsterId: 'skyward_valkyrie',
    name: 'Skyward Valkyrie Card',
    rarity: 'uncommon',
    targetSlot: 'armor',
    zone: 'spires',
    statMods: { physDef: 22, res_lightning: 10 },
    flavor: 'A fallen maiden of the thunder peaks. In armor, grants +22 DEF and +10% Lightning Resistance.',
    collectionBonus: '+22 DEF, +10% Lightning Res',
  },
  card_storm_roc: {
    id: 'card_storm_roc',
    monsterId: 'storm_roc',
    name: 'Storm Roc Card',
    rarity: 'epic',
    targetSlot: 'weapon',
    zone: 'spires',
    statMods: { physAtk: 28, dmg_lightning: 12 },
    flavor: 'Apex predator of the storm-swept spires. In weapon, grants +28 ATK and +12% Lightning Damage.',
    collectionBonus: '+28 ATK, +12% Lightning Dmg',
  },
  card_thunderforge_titan: {
    id: 'card_thunderforge_titan',
    monsterId: 'thunderforge_titan',
    name: 'Thunderforge Titan Card',
    rarity: 'epic',
    targetSlot: 'armor',
    zone: 'spires',
    statMods: { physDef: 34, maxHp: 240, res_lightning: 15 },
    flavor: 'Electrified guardian of the storm anvil. In armor, grants +34 DEF, +240 Max HP, and +15% Lightning Resistance.',
    collectionBonus: '+34 DEF, +240 Max HP, +15% Lightning Res',
  },

  // ===== Sunless Chasm (5 Cards) =====
  card_cave_stalker: {
    id: 'card_cave_stalker',
    monsterId: 'cave_stalker',
    name: 'Cave Stalker Card',
    rarity: 'common',
    targetSlot: 'accessory',
    zone: 'chasm',
    statMods: { flee: 12, critChance: 4 },
    flavor: 'An eyeless shadow of the underground depths. In accessory, grants +12 Flee and +4% Critical Chance.',
    collectionBonus: '+12 Flee, +4% Crit Chance',
  },
  card_crystal_arachnid: {
    id: 'card_crystal_arachnid',
    monsterId: 'crystal_arachnid',
    name: 'Crystal Arachnid Card',
    rarity: 'uncommon',
    targetSlot: 'armor',
    zone: 'chasm',
    statMods: { physDef: 25, maxHp: 140 },
    flavor: 'A crystal-carapace weaver of the abyss. In armor, grants +25 DEF and +140 Max HP.',
    collectionBonus: '+25 DEF, +140 Max HP',
  },
  card_void_cultist: {
    id: 'card_void_cultist',
    monsterId: 'void_cultist',
    name: 'Void Cultist Card',
    rarity: 'uncommon',
    targetSlot: 'weapon',
    zone: 'chasm',
    statMods: { magicAtk: 24, dmg_void: 8 },
    flavor: 'A fanatic chanting dark hymns into the fissure. In weapon, grants +24 MATK and +8% Void Damage.',
    collectionBonus: '+24 MATK, +8% Void Dmg',
  },
  card_shadowfiend_lord: {
    id: 'card_shadowfiend_lord',
    monsterId: 'shadowfiend_lord',
    name: 'Shadowfiend Lord Card',
    rarity: 'epic',
    targetSlot: 'weapon',
    zone: 'chasm',
    statMods: { physAtk: 32, defPenetrationPct: 12 },
    flavor: 'Abyssal overlord crowned in eternal darkness. In weapon, grants +32 ATK and +12% DEF Penetration.',
    collectionBonus: '+32 ATK, +12% DEF Penetration',
  },
  card_abyssal_dreadlord: {
    id: 'card_abyssal_dreadlord',
    monsterId: 'abyssal_dreadlord',
    name: 'Abyssal Dreadlord Card',
    rarity: 'epic',
    targetSlot: 'armor',
    zone: 'chasm',
    statMods: { physDef: 36, maxHp: 260, res_void: 15 },
    flavor: 'Ancient terror slumbering in the sunken crypts. In armor, grants +36 DEF, +260 Max HP, and +15% Void Resistance.',
    collectionBonus: '+36 DEF, +260 Max HP, +15% Void Res',
  },
};

export const ZONE_ALBUM_MILESTONES = {
  woods: {
    name: 'Forest Strider',
    bonus: { moveMult: 0.03 },
    cardIds: [
      'card_slime',
      'card_goblin',
      'card_goblin_scout',
      'card_goblin_chieftain',
      'card_barkskin_warden',
      'card_blight_sprite',
      'card_corrupted_dryad',
      'card_wolf',
      'card_thornback_boar',
      'card_mossback_beetle',
      'card_shade',
      'card_elderwood_treant',
    ],
    get cards() { return this.cardIds; },
  },
  ruins: {
    name: 'Tidal Resilience',
    bonus: { res_water: 10, maxHp: 50 },
    cardIds: [
      'card_mire_leech',
      'card_drowned_acolyte',
      'card_ruin_crawler',
      'card_ruin_golem',
      'card_tidecrawler',
      'card_abyssal_siren',
      'card_leviathans_shadow',
      'card_void_construct',
    ],
    get cards() { return this.cardIds; },
  },
  steppes: {
    name: 'Sunstone Nomad',
    bonus: { physAtk: 10, flee: 8 },
    cardIds: [
      'card_sand_scorpion',
      'card_hyena_marauder',
      'card_canyon_basilisk',
      'card_karrion_goliath',
      'card_sandstone_colossus',
    ],
    get cards() { return this.cardIds; },
  },
  tundra: {
    name: 'Glacial Fortitude',
    bonus: { physDef: 15, res_ice: 10 },
    cardIds: [
      'card_frost_wolf',
      'card_ice_wraith',
      'card_rime_harpy',
      'card_tundra_lurker',
      'card_frost_revenant',
    ],
    get cards() { return this.cardIds; },
  },
  mire: {
    name: 'Sporeweaver Resilience',
    bonus: { maxHp: 120, res_nature: 10 },
    cardIds: [
      'card_spore_creeper',
      'card_bog_witch',
      'card_marsh_hydra',
      'card_bog_behemoth',
      'card_sporeheart_matron',
    ],
    get cards() { return this.cardIds; },
  },
  caldera: {
    name: 'Caldera Fury',
    bonus: { physAtk: 12, dmg_fire: 10 },
    cardIds: [
      'card_sand_stalker',
      'card_ember_imp',
      'card_magma_beetle',
      'card_ashwing',
      'card_flame_dragon',
    ],
    get cards() { return this.cardIds; },
  },
  spires: {
    name: 'Thunderbound Striker',
    bonus: { critChance: 4, dmg_lightning: 10 },
    cardIds: [
      'card_gale_harpy',
      'card_lightning_wisp',
      'card_skyward_valkyrie',
      'card_storm_roc',
      'card_thunderforge_titan',
    ],
    get cards() { return this.cardIds; },
  },
  chasm: {
    name: 'Abyssal Dominance',
    bonus: { physDef: 20, res_void: 10 },
    cardIds: [
      'card_cave_stalker',
      'card_crystal_arachnid',
      'card_void_cultist',
      'card_shadowfiend_lord',
      'card_abyssal_dreadlord',
    ],
    get cards() { return this.cardIds; },
  },
  rift: {
    name: 'Starweaver',
    bonus: { magicAtk: 15, dmg_void: 10 },
    cardIds: [
      'card_zephyr_hawk',
      'card_storm_elemental',
      'card_zenith_warden',
      'card_void_wisp',
      'card_star_reaver',
      'card_astral_knight',
      'card_rift_manta',
      'card_constellation_mite',
      'card_nullking',
    ],
    get cards() { return this.cardIds; },
  },
  grandmaster: {
    name: 'Legendary Paragon',
    bonus: { allStatPct: 0.05, dropRarity: 0.10 },
    get cardIds() { return Object.keys(CARD_CATALOG); },
    get cards() { return this.cardIds; },
  },
};

export function createCardsSystem({ now = Date.now, rnd = Math.random } = {}) {
  function getCardDef(cardId) {
    if (!cardId || typeof cardId !== 'string') return null;
    return CARD_CATALOG[cardId] || null;
  }

  function getCardForMonster(monsterId) {
    if (!monsterId || typeof monsterId !== 'string') return null;
    return CARD_CATALOG[`card_${monsterId}`] || Object.values(CARD_CATALOG).find(c => c.monsterId === monsterId) || null;
  }

  function rollCardDrop(monsterDef, { isElite = false, isBoss = false, luck = 0 } = {}) {
    if (!monsterDef || !monsterDef.id) return null;
    const baseChance = isBoss ? 0.10 : (isElite ? 0.035 : 0.01);
    const effectiveChance = baseChance * (1 + (luck || 0) * 0.02);
    if (rnd() < effectiveChance) {
      return `card_${monsterDef.id}`;
    }
    return null;
  }

  function rollOldCardAlbum() {
    const r = rnd();
    if (r < 0.02) {
      return 'card_nullking';
    }
    const epicCards = Object.values(CARD_CATALOG).filter(c => c.rarity === 'epic');
    if (r < 0.22) {
      const idx = Math.min(epicCards.length - 1, Math.floor(rnd() * epicCards.length));
      return epicCards[idx].id;
    }
    const regularCards = Object.values(CARD_CATALOG).filter(c => c.id !== 'card_nullking' && c.rarity !== 'epic');
    const idx = Math.min(regularCards.length - 1, Math.floor(rnd() * regularCards.length));
    return regularCards[idx].id;
  }

  function canSocketCard(itemInst, cardId, slotIndex) {
    if (!itemInst || typeof itemInst !== 'object') {
      return { canSocket: false, reason: 'Invalid equipment item' };
    }
    const cardDef = getCardDef(cardId);
    if (!cardDef) {
      return { canSocket: false, reason: 'Invalid monster card' };
    }
    if (!Array.isArray(itemInst.sockets)) {
      return { canSocket: false, reason: 'Item has no sockets' };
    }
    if (slotIndex < 0 || slotIndex >= itemInst.sockets.length) {
      return { canSocket: false, reason: 'Invalid socket index' };
    }
    if (itemInst.sockets[slotIndex] !== null && itemInst.sockets[slotIndex] !== undefined) {
      return { canSocket: false, reason: 'Socket is already occupied' };
    }

    let itemSlot = itemInst.slot || itemInst.type;
    if (!itemSlot && itemInst.itemId) {
      if (itemInst.itemId.includes('blade') || itemInst.itemId.includes('sword') || itemInst.itemId.includes('bow') || itemInst.itemId.includes('staff') || itemInst.itemId.includes('dagger') || itemInst.itemId.includes('wand')) itemSlot = 'weapon';
      else if (itemInst.itemId.includes('plate') || itemInst.itemId.includes('robe') || itemInst.itemId.includes('armor') || itemInst.itemId.includes('helm') || itemInst.itemId.includes('shield') || itemInst.itemId.includes('boots') || itemInst.itemId.includes('cloak')) itemSlot = 'armor';
      else if (itemInst.itemId.includes('ring') || itemInst.itemId.includes('amulet') || itemInst.itemId.includes('necklace') || itemInst.itemId.includes('accessory')) itemSlot = 'accessory';
    }
    const targetSlot = cardDef.targetSlot;
    if (targetSlot === 'any') {
      return { canSocket: true };
    }
    if (targetSlot === 'weapon') {
      if (itemSlot === 'weapon') return { canSocket: true };
      return { canSocket: false, reason: 'Card can only be socketed into weapons' };
    }
    if (targetSlot === 'armor') {
      const armorSlots = ['body', 'head', 'hands', 'feet', 'cloak', 'armor'];
      if (armorSlots.includes(itemSlot)) return { canSocket: true };
      return { canSocket: false, reason: 'Card can only be socketed into armor' };
    }
    if (targetSlot === 'accessory') {
      if (itemSlot === 'accessory') return { canSocket: true };
      return { canSocket: false, reason: 'Card can only be socketed into accessories' };
    }

    return { canSocket: false, reason: 'Incompatible target slot' };
  }

  function socketCard(itemInst, cardId, slotIndex) {
    const check = canSocketCard(itemInst, cardId, slotIndex);
    if (!check.canSocket) {
      return { success: false, reason: check.reason };
    }
    itemInst.sockets[slotIndex] = cardId;
    return { success: true };
  }

  function unsocketCard(itemInst, slotIndex, { cost = 0, zeny = 0, deductZeny } = {}) {
    if (!itemInst || !Array.isArray(itemInst.sockets)) {
      return { success: false, reason: 'Invalid equipment item' };
    }
    if (slotIndex < 0 || slotIndex >= itemInst.sockets.length) {
      return { success: false, reason: 'Invalid socket index' };
    }
    const cardId = itemInst.sockets[slotIndex];
    if (!cardId) {
      return { success: false, reason: 'No card in socket' };
    }
    if (cost > 0 && zeny < cost) {
      return { success: false, reason: 'Insufficient zeny' };
    }
    if (cost > 0 && typeof deductZeny === 'function') {
      deductZeny(cost);
    }
    itemInst.sockets[slotIndex] = null;
    return { success: true, cardId };
  }

  function recordBestiaryKill(bestiaryState, monsterId) {
    if (!bestiaryState || typeof bestiaryState !== 'object') {
      return { firstKill: false, masteryLevel: 0 };
    }
    bestiaryState.monsters = bestiaryState.monsters || {};
    if (!bestiaryState.monsters[monsterId]) {
      bestiaryState.monsters[monsterId] = { kills: 0, drops: {}, mastery: 0 };
    }
    const entry = bestiaryState.monsters[monsterId];
    const firstKill = entry.kills === 0;
    entry.kills += 1;
    const mastery = entry.kills >= 200 ? 3 : (entry.kills >= 50 ? 2 : (entry.kills >= 10 ? 1 : 0));
    entry.mastery = mastery;
    return { firstKill, masteryLevel: mastery };
  }

  function recordBestiaryDrop(bestiaryState, monsterId, itemId) {
    if (!bestiaryState || typeof bestiaryState !== 'object') {
      return { firstDrop: false };
    }
    bestiaryState.monsters = bestiaryState.monsters || {};
    if (!bestiaryState.monsters[monsterId]) {
      bestiaryState.monsters[monsterId] = { kills: 0, drops: {}, mastery: 0 };
    }
    const entry = bestiaryState.monsters[monsterId];
    entry.drops = entry.drops || {};
    const firstDrop = !entry.drops[itemId];
    entry.drops[itemId] = true;
    return { firstDrop };
  }

  function recordCardAcquired(bestiaryState, cardId) {
    if (!bestiaryState || typeof bestiaryState !== 'object') {
      return { firstCard: false };
    }
    bestiaryState.cards = bestiaryState.cards || {};
    const firstCard = !bestiaryState.cards[cardId];
    bestiaryState.cards[cardId] = true;
    return { firstCard };
  }

  function calculateCollectionBonuses(bestiaryState) {
    const cards = bestiaryState?.cards || {};
    const aggregated = {};
    for (const milestone of Object.values(ZONE_ALBUM_MILESTONES)) {
      const required = milestone.cardIds || [];
      if (required.length > 0 && required.every(id => Boolean(cards[id]))) {
        for (const [stat, val] of Object.entries(milestone.bonus || {})) {
          aggregated[stat] = (aggregated[stat] || 0) + val;
        }
      }
    }
    return aggregated;
  }

  function serialize(bestiaryState) {
    if (!bestiaryState || typeof bestiaryState !== 'object') {
      return { monsters: {}, cards: {} };
    }
    return {
      monsters: JSON.parse(JSON.stringify(bestiaryState.monsters || {})),
      cards: { ...(bestiaryState.cards || {}) },
    };
  }

  function deserialize(data) {
    if (!data || typeof data !== 'object') {
      return { monsters: {}, cards: {} };
    }
    return {
      monsters: data.monsters && typeof data.monsters === 'object' ? data.monsters : {},
      cards: data.cards && typeof data.cards === 'object' ? data.cards : {},
    };
  }

  return {
    getCardDef,
    getCardForMonster,
    rollCardDrop,
    rollOldCardAlbum,
    canSocketCard,
    socketCard,
    unsocketCard,
    recordBestiaryKill,
    recordBestiaryDrop,
    recordCardAcquired,
    calculateCollectionBonuses,
    serialize,
    deserialize,
  };
}
