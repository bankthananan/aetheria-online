// player-models.js — Full Class & Job Visual Model Evolution System (59 Archetypes)
// Covers 10 Base Classes (Tier I), 20 Second-Job Branches (Tier II),
// 20 Third-Job Evolutions (Tier III), and 9 Hybrid Callings (Tier IV).
// Pure ES module; zero build step; zero screen shake.

import { PAL, PX } from '../pixelart.js';
import { PROGRESSION } from '../progression.js';

const CLASS_COMBAT_MAP = {
  reborn_blade: 'blade',
  drifter: 'berserker',
  codeweaver: 'mage',
  far_shot: 'ranger',
  lightbringer: 'paladin',
  iron_fist: 'monk',
  stormcaller: 'elementalist',
  shadow_blade: 'assassin',
  soul_binder: 'necromancer',
  artificer: 'artificer',
};

const HYBRID_BY_CLASS = {
  reborn_blade: 'dreadnought',
  drifter: 'spellblade',
  codeweaver: 'spellblade',
  far_shot: 'arcane_archer',
  lightbringer: 'vanguard',
  iron_fist: 'chi_tempest',
  stormcaller: 'storm_templar',
  shadow_blade: 'nightblade_phantom',
  soul_binder: 'eldritch_lord',
  artificer: 'quantum_technomancer',
};

export const CLASS_JOB_MODELS = {
  // =====================================================================
  // 1. REBORN BLADE LINE (blade)
  // =====================================================================
  reborn_blade: {
    id: 'reborn_blade', tier: 0, classId: 'reborn_blade', combatClass: 'blade',
    name: 'Reborn Blade', role: 'Vanguard Swordsman', crest: '⚔',
    palette: { primary: '#78a7d8', secondary: '#c9d1e0', accent: '#ef744d', aura: '#78a7d8' },
    regalia: {
      headgear: 'Crested Vanguard Circlet',
      mantle: 'Crimson Squire Half-Cape',
      mainhand: 'Rift-Edge Broadsword',
      offhand: 'Steel Buckler',
      auraStyle: 'vanguard_pulse',
    },
    pixelStyle: { remap: {}, crown: 'none', wings: 'none', weapon: 'base' },
  },
  rift_knight: {
    id: 'rift_knight', tier: 1, classId: 'reborn_blade', combatClass: 'blade',
    name: 'Rift Knight', role: 'Bulwark', crest: '🛡',
    palette: { primary: '#5e97d1', secondary: '#eef5ff', accent: '#f2ca59', aura: '#65d4f5' },
    regalia: {
      headgear: 'Plumed Aegis Greathelm',
      mantle: 'Azure Fortress Tabard',
      mainhand: 'Runed Bastion Longsword',
      offhand: 'Tower Aegis Shield',
      auraStyle: 'aegis_ring',
    },
    pixelStyle: { remap: { r: 'u', R: 'U' }, crown: 'plume_cyan', wings: 'shield_wall', weapon: 'spear_left' },
  },
  rift_reaver: {
    id: 'rift_reaver', tier: 1, classId: 'reborn_blade', combatClass: 'blade',
    name: 'Rift Reaver', role: 'Breaker', crest: '⚡',
    palette: { primary: '#95b8e8', secondary: '#a486dc', accent: '#96edff', aura: '#a486dc' },
    regalia: {
      headgear: 'Horned Rift-Visor',
      mantle: 'Tattered Paradox Cloak',
      mainhand: 'Sundering Rift-Greatsword',
      offhand: 'Paradox Gauntlet',
      auraStyle: 'rift_sparks',
    },
    pixelStyle: { remap: { r: 'p', R: 'q', y: 'c' }, crown: 'horns_violet', wings: 'cape_violet', weapon: 'greatsword_right' },
  },
  voidcleaver_lord: {
    id: 'voidcleaver_lord', tier: 2, classId: 'reborn_blade', combatClass: 'blade',
    name: 'Voidcleaver Lord', role: 'Breaker', crest: '🌌',
    palette: { primary: '#78a7d8', secondary: '#563b91', accent: '#96edff', aura: '#a486dc' },
    regalia: {
      headgear: 'Abyssal Sovereign Horn-Crown',
      mantle: 'Astral Rift Wing-Mantle',
      mainhand: 'World-Cleaver Singularity Blade',
      offhand: 'Orbiting Void Sigil',
      auraStyle: 'void_singularity',
    },
    pixelStyle: { remap: { r: 'p', R: 'q', w: 'c', m: 'u' }, crown: 'crown_void', wings: 'wings_void', weapon: 'cleaver_dual' },
  },
  aegis_paragon: {
    id: 'aegis_paragon', tier: 2, classId: 'reborn_blade', combatClass: 'blade',
    name: 'Aegis Paragon', role: 'Bulwark', crest: '🏛',
    palette: { primary: '#95b8e8', secondary: '#f2ca59', accent: '#ffffff', aura: '#f2ca59' },
    regalia: {
      headgear: 'Golden Valhallan Wing-Helm',
      mantle: 'Immortal Citadels Mantle',
      mainhand: 'Dawn-Steel Sunblade',
      offhand: 'Colossus Mirror-Aegis',
      auraStyle: 'citadel_dome',
    },
    pixelStyle: { remap: { r: 'y', R: 'Y', m: 'w' }, crown: 'crown_gold', wings: 'wings_gold', weapon: 'aegis_banner' },
  },

  // =====================================================================
  // 2. DRIFTER LINE (berserker)
  // =====================================================================
  drifter: {
    id: 'drifter', tier: 0, classId: 'drifter', combatClass: 'berserker',
    name: 'Drifter', role: 'Fury Dual-Blader', crest: '☄',
    palette: { primary: '#df777c', secondary: '#c75f35', accent: '#f2ca59', aura: '#ef744d' },
    regalia: {
      headgear: 'Crimson Wanderer Bandana',
      mantle: 'Fur-Trimmed Outrider Pauldrons',
      mainhand: 'Notched Cleaver',
      offhand: 'Hunting War-Hatchet',
      auraStyle: 'ember_step',
    },
    pixelStyle: { remap: {}, crown: 'none', wings: 'none', weapon: 'base' },
  },
  bladewind: {
    id: 'bladewind', tier: 1, classId: 'drifter', combatClass: 'berserker',
    name: 'Bladewind Dancer', role: 'Skirmisher', crest: '🌪',
    palette: { primary: '#df777c', secondary: '#96edff', accent: '#eef5ff', aura: '#65d4f5' },
    regalia: {
      headgear: 'Zephyr Silk Headband',
      mantle: 'Twin Cyclone Ribbons',
      mainhand: 'Gale-Curved Scimitar',
      offhand: 'Whirlwind Wakizashi',
      auraStyle: 'gale_ribbons',
    },
    pixelStyle: { remap: { N: 'U', n: 'u', y: 'c' }, crown: 'plume_cyan', wings: 'cape_cyan', weapon: 'twin_blades' },
  },
  blood_marauder: {
    id: 'blood_marauder', tier: 1, classId: 'drifter', combatClass: 'berserker',
    name: 'Blood Marauder', role: 'Executioner', crest: '🩸',
    palette: { primary: '#c94655', secondary: '#9e3929', accent: '#ef744d', aura: '#ef744d' },
    regalia: {
      headgear: 'Spiked Ravager Visage',
      mantle: 'Blood-Hide Trophy Pelt',
      mainhand: 'Gore-Drinker Execution Axe',
      offhand: 'Barbed Chain-Hook',
      auraStyle: 'crimson_frenzy',
    },
    pixelStyle: { remap: { N: 'R', n: 'r', A: 'B' }, crown: 'horns_red', wings: 'spikes_red', weapon: 'great_axe' },
  },
  tempest_reaper: {
    id: 'tempest_reaper', tier: 2, classId: 'drifter', combatClass: 'berserker',
    name: 'Tempest Reaper', role: 'Skirmisher', crest: '⚡',
    palette: { primary: '#df777c', secondary: '#65d4f5', accent: '#ffffff', aura: '#96edff' },
    regalia: {
      headgear: 'Storm-Horned Valkyrie Crest',
      mantle: 'Hurricane Vortex Pinions',
      mainhand: 'Sky-Rending Crescent Scythe',
      offhand: 'Tempest Chain-Blade',
      auraStyle: 'cyclone_vortex',
    },
    pixelStyle: { remap: { N: 'U', n: 'c', r: 'w' }, crown: 'crown_storm', wings: 'wings_cyan', weapon: 'scythe_right' },
  },
  crimson_sovereign: {
    id: 'crimson_sovereign', tier: 2, classId: 'drifter', combatClass: 'berserker',
    name: 'Crimson Sovereign', role: 'Executioner', crest: '👑',
    palette: { primary: '#c94655', secondary: '#f2ca59', accent: '#ef744d', aura: '#ef744d' },
    regalia: {
      headgear: 'Crown of Undying Slaughter',
      mantle: 'Sovereign Blood-drake Wings',
      mainhand: 'Guiiloutine Greataxe of Ruin',
      offhand: 'Crimson Skull Totem',
      auraStyle: 'sovereign_bloodstorm',
    },
    pixelStyle: { remap: { N: 'R', n: 'r', A: 'y', a: 'w' }, crown: 'crown_crimson', wings: 'wings_crimson', weapon: 'cleaver_dual' },
  },

  // =====================================================================
  // 3. CODEWEAVER LINE (mage)
  // =====================================================================
  codeweaver: {
    id: 'codeweaver', tier: 0, classId: 'codeweaver', combatClass: 'mage',
    name: 'Codeweaver', role: 'Arcane Compiler', crest: '⌘',
    palette: { primary: '#b98bea', secondary: '#6673e8', accent: '#f2ca59', aura: '#b98bea' },
    regalia: {
      headgear: 'Pointed Runic Spire-Hat',
      mantle: 'Indigo Grimoire Vestments',
      mainhand: 'Amber Logic-Staff',
      offhand: 'Floating Source Glyph',
      auraStyle: 'Logic_glyphs',
    },
    pixelStyle: { remap: {}, crown: 'none', wings: 'none', weapon: 'base' },
  },
  rune_compiler: {
    id: 'rune_compiler', tier: 1, classId: 'codeweaver', combatClass: 'mage',
    name: 'Rune Compiler', role: 'Artillery', crest: '🔥',
    palette: { primary: '#b98bea', secondary: '#ef744d', accent: '#f2ca59', aura: '#ef744d' },
    regalia: {
      headgear: 'Solar-Rune Circlet Spire',
      mantle: 'Pyro-Scripted Mantle',
      mainhand: 'Combustion Matrix Scepter',
      offhand: 'Orbiting Ember Tome',
      auraStyle: 'combustion_matrix',
    },
    pixelStyle: { remap: { u: 'p', U: 'q', y: 'r' }, crown: 'crown_gold', wings: 'cape_violet', weapon: 'staff_left' },
  },
  frost_scribe: {
    id: 'frost_scribe', tier: 1, classId: 'codeweaver', combatClass: 'mage',
    name: 'Frost Scribe', role: 'Controller', crest: '❄',
    palette: { primary: '#70bde8', secondary: '#96edff', accent: '#eef5ff', aura: '#65d4f5' },
    regalia: {
      headgear: 'Glacial Tiara-Hood',
      mantle: 'Rime-Woven Stole',
      mainhand: 'Permafrost Spire-Rod',
      offhand: 'Cryo-Lattice Prism',
      auraStyle: 'cryo_lattice',
    },
    pixelStyle: { remap: { u: 'l', U: 'z', y: 'x' }, crown: 'plume_cyan', wings: 'cape_cyan', weapon: 'orb_left' },
  },
  reality_debugger: {
    id: 'reality_debugger', tier: 2, classId: 'codeweaver', combatClass: 'mage',
    name: 'Reality Debugger', role: 'Artillery', crest: '✦',
    palette: { primary: '#b98bea', secondary: '#96edff', accent: '#f2ca59', aura: '#b98bea' },
    regalia: {
      headgear: 'Crown of the Root-Kernel',
      mantle: 'Levitation Hex-Array Wings',
      mainhand: 'Omega Compiler Staff',
      offhand: 'Twin Floating Grimoires',
      auraStyle: 'kernel_hex_array',
    },
    pixelStyle: { remap: { u: 'p', U: 'q', y: 'c' }, crown: 'crown_void', wings: 'wings_void', weapon: 'dual_orbs' },
  },
  absolute_architect: {
    id: 'absolute_architect', tier: 2, classId: 'codeweaver', combatClass: 'mage',
    name: 'Absolute Architect', role: 'Controller', crest: '💠',
    palette: { primary: '#70bde8', secondary: '#ffffff', accent: '#65d4f5', aura: '#96edff' },
    regalia: {
      headgear: 'Crystalline Seraph-Diadem',
      mantle: 'Zero-Kelvin Prism Fin-Wings',
      mainhand: 'Scepter of Absolute Zero',
      offhand: 'Aegis Ward Monolith',
      auraStyle: 'absolute_zero_dome',
    },
    pixelStyle: { remap: { u: 'c', U: 'l', y: 'w' }, crown: 'crown_storm', wings: 'wings_cyan', weapon: 'aegis_banner' },
  },

  // =====================================================================
  // 4. FAR SHOT LINE (ranger)
  // =====================================================================
  far_shot: {
    id: 'far_shot', tier: 0, classId: 'far_shot', combatClass: 'ranger',
    name: 'Far Shot', role: 'Woodland Marksman', crest: '➶',
    palette: { primary: '#7fcf91', secondary: '#2f7844', accent: '#f2ca59', aura: '#7fcf91' },
    regalia: {
      headgear: 'Feathered Ranger Hood',
      mantle: 'Forest Stalker Cloak',
      mainhand: 'Yew Recurve Bow',
      offhand: 'Fletched Quiver',
      auraStyle: 'wind_leaf',
    },
    pixelStyle: { remap: {}, crown: 'none', wings: 'none', weapon: 'base' },
  },
  sky_piercer: {
    id: 'sky_piercer', tier: 1, classId: 'far_shot', combatClass: 'ranger',
    name: 'Sky Piercer', role: 'Sniper', crest: '🎯',
    palette: { primary: '#7fcf91', secondary: '#96edff', accent: '#f2ca59', aura: '#65d4f5' },
    regalia: {
      headgear: 'Deadeye Hawk-Visor',
      mantle: 'Gale-Fletched Half-Mantle',
      mainhand: 'Compound Wind-Longbow',
      offhand: 'Armor-Piercing Bodkin Quiver',
      auraStyle: 'deadeye_crosshair',
    },
    pixelStyle: { remap: { g: 'l', G: 'z' }, crown: 'plume_cyan', wings: 'cape_cyan', weapon: 'greatbow' },
  },
  wild_warden: {
    id: 'wild_warden', tier: 1, classId: 'far_shot', combatClass: 'ranger',
    name: 'Wild Warden', role: 'Hunter', crest: '🦅',
    palette: { primary: '#b4d56f', secondary: '#68c57c', accent: '#e0ad63', aura: '#68c57c' },
    regalia: {
      headgear: 'Antlered Sylvan Hood',
      mantle: 'Briar-Woven Camouflage Cape',
      mainhand: 'Thorn-Vined Hunting Bow',
      offhand: 'Perched Hunting Falcon',
      auraStyle: 'sylvan_flock',
    },
    pixelStyle: { remap: { y: 'L', N: 'G' }, crown: 'horns_gold', wings: 'cape_green', weapon: 'falcon_left' },
  },
  worldbane_sniper: {
    id: 'worldbane_sniper', tier: 2, classId: 'far_shot', combatClass: 'ranger',
    name: 'Worldbane Sniper', role: 'Deadeye', crest: '☄',
    palette: { primary: '#7fcf91', secondary: '#f2ca59', accent: '#96edff', aura: '#96edff' },
    regalia: {
      headgear: 'Astral Horizon Target-Crown',
      mantle: 'Starlight Ballista Mantle',
      mainhand: 'Worldbane Great-Arbalest',
      offhand: 'Starfall Quiver Array',
      auraStyle: 'starfall_orbit',
    },
    pixelStyle: { remap: { g: 'c', G: 'u', y: 'x' }, crown: 'crown_storm', wings: 'wings_cyan', weapon: 'greatbow' },
  },
  starhawk_warden: {
    id: 'starhawk_warden', tier: 2, classId: 'far_shot', combatClass: 'ranger',
    name: 'Starhawk Warden', role: 'Hunter', crest: '🌟',
    palette: { primary: '#b4d56f', secondary: '#f2ca59', accent: '#68c57c', aura: '#f2ca59' },
    regalia: {
      headgear: 'Golden Starhawk Plume-Helm',
      mantle: 'Celestial Feather Pinions',
      mainhand: 'Solar-Strung Skybow',
      offhand: 'Ascendant Spirit-Hawk',
      auraStyle: 'starhawk_halo',
    },
    pixelStyle: { remap: { g: 'y', G: 'G', n: 'L' }, crown: 'crown_gold', wings: 'wings_gold', weapon: 'falcon_left' },
  },

  // =====================================================================
  // 5. LIGHTBRINGER LINE (paladin)
  // =====================================================================
  lightbringer: {
    id: 'lightbringer', tier: 0, classId: 'lightbringer', combatClass: 'paladin',
    name: 'Lightbringer', role: 'Sacred Templar', crest: '✚',
    palette: { primary: '#efd36f', secondary: '#eef5ff', accent: '#9b7618', aura: '#efd36f' },
    regalia: {
      headgear: 'Sun-Crested Circlet',
      mantle: 'Ivory Sanctuary Surcoat',
      mainhand: 'Blessed Warhammer',
      offhand: 'Dawn-Cross Kite Shield',
      auraStyle: 'sanctuary_glow',
    },
    pixelStyle: { remap: {}, crown: 'none', wings: 'none', weapon: 'base' },
  },
  dawnguard: {
    id: 'dawnguard', tier: 1, classId: 'lightbringer', combatClass: 'paladin',
    name: 'Dawnguard', role: 'Warden', crest: '🛡',
    palette: { primary: '#efd36f', secondary: '#ffffff', accent: '#65d4f5', aura: '#f2ca59' },
    regalia: {
      headgear: 'Mitre-Helm of the Dawn',
      mantle: 'Golden Cathedral Cape',
      mainhand: 'Scepter of Grace',
      offhand: 'Towering Sun-Aegis',
      auraStyle: 'cathedral_ward',
    },
    pixelStyle: { remap: { m: 'y', B: 'Y' }, crown: 'crown_gold', wings: 'shield_wall', weapon: 'spear_left' },
  },
  sunblade: {
    id: 'sunblade', tier: 1, classId: 'lightbringer', combatClass: 'paladin',
    name: 'Sunblade', role: 'Inquisitor', crest: '☀',
    palette: { primary: '#f29b57', secondary: '#ef744d', accent: '#f2ca59', aura: '#ef744d' },
    regalia: {
      headgear: 'Blazing Inquisitor Diadem',
      mantle: 'Scarlet Judgment Mantle',
      mainhand: 'Radiant Claymore of Conviction',
      offhand: 'Searing Rosary Seal',
      auraStyle: 'solar_flare',
    },
    pixelStyle: { remap: { y: 'r', Y: 'R' }, crown: 'horns_gold', wings: 'cape_crimson', weapon: 'greatsword_right' },
  },
  seraph_warden: {
    id: 'seraph_warden', tier: 2, classId: 'lightbringer', combatClass: 'paladin',
    name: 'Seraph Warden', role: 'Guardian', crest: '👼',
    palette: { primary: '#efd36f', secondary: '#ffffff', accent: '#96edff', aura: '#ffffff' },
    regalia: {
      headgear: 'Six-Winged Seraphic Halo',
      mantle: 'Luminous Archangel Wings',
      mainhand: 'Dawnbreaker Relic Lance',
      offhand: 'Sanctified Seraph-Bulwark',
      auraStyle: 'seraphic_choir',
    },
    pixelStyle: { remap: { m: 'x', B: 'y' }, crown: 'crown_gold', wings: 'wings_gold', weapon: 'aegis_banner' },
  },
  solar_justicar: {
    id: 'solar_justicar', tier: 2, classId: 'lightbringer', combatClass: 'paladin',
    name: 'Solar Justicar', role: 'Judge', crest: '⚖',
    palette: { primary: '#f29b57', secondary: '#f2ca59', accent: '#ef744d', aura: '#f2ca59' },
    regalia: {
      headgear: 'Helios Crown of Final Judgment',
      mantle: 'Corona Flame-Pinions',
      mainhand: 'Hammer of Dawn & Verdict Lance',
      offhand: 'Scales of Solar Wrath',
      auraStyle: 'helios_judgment',
    },
    pixelStyle: { remap: { w: 'y', y: 'r', Y: 'R' }, crown: 'crown_crimson', wings: 'wings_crimson', weapon: 'cleaver_dual' },
  },

  // =====================================================================
  // 6. IRON FIST LINE (monk)
  // =====================================================================
  iron_fist: {
    id: 'iron_fist', tier: 0, classId: 'iron_fist', combatClass: 'monk',
    name: 'Iron Fist', role: 'Martial Striker', crest: '◉',
    palette: { primary: '#e69b61', secondary: '#ded3bb', accent: '#f2ca59', aura: '#e69b61' },
    regalia: {
      headgear: 'Ascetic Focus Headband',
      mantle: 'Monastic Linen Gi',
      mainhand: 'Iron-Bound Cestus',
      offhand: 'Ki-Wrapped Knuckles',
      auraStyle: 'ki_breath',
    },
    pixelStyle: { remap: {}, crown: 'none', wings: 'none', weapon: 'base' },
  },
  ki_adept: {
    id: 'ki_adept', tier: 1, classId: 'iron_fist', combatClass: 'monk',
    name: 'Ki Adept', role: 'Striker', crest: '🐉',
    palette: { primary: '#e69b61', secondary: '#65d4f5', accent: '#f2ca59', aura: '#65d4f5' },
    regalia: {
      headgear: 'Azure Dragon-Tail Bandana',
      mantle: 'Flowing Meridian Sash',
      mainhand: 'Dragon-Claw Katar Gauntlets',
      offhand: 'Spiraling Chi Sphere',
      auraStyle: 'dragon_meridian',
    },
    pixelStyle: { remap: { i: 'c', I: 'l', y: 'y' }, crown: 'plume_cyan', wings: 'cape_cyan', weapon: 'orb_left' },
  },
  stone_disciple: {
    id: 'stone_disciple', tier: 1, classId: 'iron_fist', combatClass: 'monk',
    name: 'Stone Disciple', role: 'Guardian', crest: '⛰',
    palette: { primary: '#b99a77', secondary: '#a7a7a5', accent: '#f2ca59', aura: '#e0ad63' },
    regalia: {
      headgear: 'Basalt Prayer Beads & Circlet',
      mantle: 'Granite-Plated Shoulder Mantle',
      mainhand: ' Mountain-Crusher Tonfas',
      offhand: 'Immovable Earth Seal',
      auraStyle: 'adamant_stance',
    },
    pixelStyle: { remap: { i: 'L', I: 'n', y: 'y' }, crown: 'horns_gold', wings: 'shield_wall', weapon: 'twin_blades' },
  },
  grandmaster: {
    id: 'grandmaster', tier: 2, classId: 'iron_fist', combatClass: 'monk',
    name: 'Grandmaster', role: 'Combo Master', crest: '☯',
    palette: { primary: '#e69b61', secondary: '#f2ca59', accent: '#ef744d', aura: '#f2ca59' },
    regalia: {
      headgear: 'Celestial Dragon-God Crown',
      mantle: 'Eight-Gate Golden Chakra Ring',
      mainhand: 'Fists of the Rising Heavens',
      offhand: 'Twin Orbiting Lotus Pearls',
      auraStyle: 'eight_gates_lotus',
    },
    pixelStyle: { remap: { i: 'y', I: 'O', N: 'R' }, crown: 'crown_gold', wings: 'wings_gold', weapon: 'dual_orbs' },
  },
  adamant_sage: {
    id: 'adamant_sage', tier: 2, classId: 'iron_fist', combatClass: 'monk',
    name: 'Adamant Sage', role: 'Bulwark', crest: '🪷',
    palette: { primary: '#b99a77', secondary: '#68c57c', accent: '#f2ca59', aura: '#68c57c' },
    regalia: {
      headgear: 'Enlightened Bodhi Halo',
      mantle: 'Floating Prayer-Bead Rosary Ring',
      mainhand: 'Diamond-Sutra Palm Guards',
      offhand: 'Zen Bell of Sanctuary',
      auraStyle: 'zen_mandala',
    },
    pixelStyle: { remap: { i: 'g', I: 'G', y: 'x' }, crown: 'crown_storm', wings: 'wings_cyan', weapon: 'aegis_banner' },
  },

  // =====================================================================
  // 7. STORMCALLER LINE (elementalist)
  // =====================================================================
  stormcaller: {
    id: 'stormcaller', tier: 0, classId: 'stormcaller', combatClass: 'elementalist',
    name: 'Stormcaller', role: 'Elemental Weaver', crest: 'ϟ',
    palette: { primary: '#70cddd', secondary: '#a486dc', accent: '#ef744d', aura: '#70cddd' },
    regalia: {
      headgear: 'Tempest-Horned Tiara',
      mantle: 'Dual-Element Silk Mantle',
      mainhand: ' Fulmination Conduit Rod',
      offhand: 'Cinder-Spark Focus',
      auraStyle: 'tri_element_spark',
    },
    pixelStyle: { remap: {}, crown: 'none', wings: 'none', weapon: 'base' },
  },
  tempest_mage: {
    id: 'tempest_mage', tier: 1, classId: 'stormcaller', combatClass: 'elementalist',
    name: 'Tempest Mage', role: 'Conduit', crest: '🌩',
    palette: { primary: '#70cddd', secondary: '#96edff', accent: '#ffffff', aura: '#65d4f5' },
    regalia: {
      headgear: 'Lightning-Rod Diadem',
      mantle: 'Cumulonimbus Storm-Cloak',
      mainhand: 'Thunderhead Trident-Staff',
      offhand: 'Static Field Globe',
      auraStyle: 'thunder_arc',
    },
    pixelStyle: { remap: { p: 'l', q: 'z', r: 'c' }, crown: 'plume_cyan', wings: 'cape_cyan', weapon: 'spear_left' },
  },
  pyroclast: {
    id: 'pyroclast', tier: 1, classId: 'stormcaller', combatClass: 'elementalist',
    name: 'Pyroclast', role: 'Cataclysm', crest: '🌋',
    palette: { primary: '#ef7654', secondary: '#9e3929', accent: '#f2ca59', aura: '#ef744d' },
    regalia: {
      headgear: 'Obsidian Magma-Horns',
      mantle: 'Volcanic Ash-Plume Cloak',
      mainhand: 'Caldera Heart Torch-Staff',
      offhand: 'Molten Slag Core',
      auraStyle: 'magma_eruption',
    },
    pixelStyle: { remap: { p: 'r', q: 'R', c: 'y' }, crown: 'horns_red', wings: 'spikes_red', weapon: 'staff_left' },
  },
  archon_of_storms: {
    id: 'archon_of_storms', tier: 2, classId: 'stormcaller', combatClass: 'elementalist',
    name: 'Archon of Storms', role: 'Storm Weaver', crest: '🌀',
    palette: { primary: '#70cddd', secondary: '#ffffff', accent: '#f2ca59', aura: '#96edff' },
    regalia: {
      headgear: 'Sovereign Nimbus Halo-Crown',
      mantle: 'Living Thundercloud Pinions',
      mainhand: ' Fulminating Sky-Scepter',
      offhand: 'Eye of the Hurricane',
      auraStyle: 'archon_tempest',
    },
    pixelStyle: { remap: { p: 'c', q: 'u', r: 'y' }, crown: 'crown_storm', wings: 'wings_cyan', weapon: 'dual_orbs' },
  },
  cinder_archon: {
    id: 'cinder_archon', tier: 2, classId: 'stormcaller', combatClass: 'elementalist',
    name: 'Cinder Archon', role: 'Firebrand', crest: '🔥',
    palette: { primary: '#ef7654', secondary: '#f2ca59', accent: '#ffffff', aura: '#ef744d' },
    regalia: {
      headgear: 'Solar-Flare Phoenix Crown',
      mantle: 'Blazing Phoenix Wing-Plumes',
      mainhand: 'World-Ender Cataclysm Staff',
      offhand: 'Supernova Sun-Core',
      auraStyle: 'phoenix_supernova',
    },
    pixelStyle: { remap: { p: 'r', q: 'R', u: 'y', c: 'x' }, crown: 'crown_crimson', wings: 'wings_crimson', weapon: 'dual_orbs' },
  },

  // =====================================================================
  // 8. SHADOW BLADE LINE (assassin)
  // =====================================================================
  shadow_blade: {
    id: 'shadow_blade', tier: 0, classId: 'shadow_blade', combatClass: 'assassin',
    name: 'Shadow Blade', role: 'Silent Umbra', crest: '🗡',
    palette: { primary: '#8e44ad', secondary: '#2c163b', accent: '#68c57c', aura: '#a486dc' },
    regalia: {
      headgear: 'Silent Umbra Cowl & Mask',
      mantle: 'Shadow-Weave Split Scarf',
      mainhand: 'Venom-Tipped Stiletto',
      offhand: 'Reverse-Grip Parrying Dirk',
      auraStyle: 'umbra_mist',
    },
    pixelStyle: { remap: {}, crown: 'none', wings: 'none', weapon: 'base' },
  },
  nightstalker: {
    id: 'nightstalker', tier: 1, classId: 'shadow_blade', combatClass: 'assassin',
    name: 'Nightstalker', role: 'Executioner', crest: '☠',
    palette: { primary: '#8e44ad', secondary: '#68c57c', accent: '#ef744d', aura: '#68c57c' },
    regalia: {
      headgear: 'Viper-Fanged Execution Hood',
      mantle: 'Nightshade Poison-Vial Cloak',
      mainhand: 'Serrated Guillotine Katar',
      offhand: 'Envenomed Kris Dagger',
      auraStyle: 'venom_vapor',
    },
    pixelStyle: { remap: { p: 'g', w: 'r' }, crown: 'horns_violet', wings: 'cape_green', weapon: 'twin_blades' },
  },
  phantom_blade: {
    id: 'phantom_blade', tier: 1, classId: 'shadow_blade', combatClass: 'assassin',
    name: 'Phantom Blade', role: 'Skirmisher', crest: '👻',
    palette: { primary: '#a569bd', secondary: '#96edff', accent: '#eef5ff', aura: '#96edff' },
    regalia: {
      headgear: 'Mirage-Veiled Visor',
      mantle: 'Phase-Shifting Afterimage Cloak',
      mainhand: 'Twin Spectral Chakram-Blades',
      offhand: 'Phantom Echo-Dagger',
      auraStyle: 'mirage_afterimage',
    },
    pixelStyle: { remap: { p: 'c', q: 'U', w: 'x' }, crown: 'plume_cyan', wings: 'cape_cyan', weapon: 'twin_blades' },
  },
  shadow_sovereign: {
    id: 'shadow_sovereign', tier: 2, classId: 'shadow_blade', combatClass: 'assassin',
    name: 'Shadow Sovereign', role: 'Executioner', crest: '🌑',
    palette: { primary: '#8e44ad', secondary: '#ef744d', accent: '#f2ca59', aura: '#a486dc' },
    regalia: {
      headgear: 'Horned Crown of the Eclipse',
      mantle: 'Four-Bladed Shadow-Arachnid Mantle',
      mainhand: 'Reaper-Claw of the Death Mark',
      offhand: 'Heart-Seeker Abyssal Katar',
      auraStyle: 'death_mark_eclipse',
    },
    pixelStyle: { remap: { p: 'r', q: 'k', w: 'y' }, crown: 'crown_void', wings: 'wings_void', weapon: 'cleaver_dual' },
  },
  void_stalker: {
    id: 'void_stalker', tier: 2, classId: 'shadow_blade', combatClass: 'assassin',
    name: 'Void Stalker', role: 'Omni-Skirmisher', crest: '🌌',
    palette: { primary: '#a569bd', secondary: '#65d4f5', accent: '#ffffff', aura: '#65d4f5' },
    regalia: {
      headgear: 'Rift-Walker Blindfold Diadem',
      mantle: 'Dimensional Tear Wing-Shroud',
      mainhand: 'Horizon-Slicing Twin Talons',
      offhand: 'Null-Step Phase Blade',
      auraStyle: 'dimensional_step',
    },
    pixelStyle: { remap: { p: 'c', q: 'p', w: 'x' }, crown: 'crown_storm', wings: 'wings_cyan', weapon: 'twin_blades' },
  },

  // =====================================================================
  // 9. SOUL BINDER LINE (necromancer)
  // =====================================================================
  soul_binder: {
    id: 'soul_binder', tier: 0, classId: 'soul_binder', combatClass: 'necromancer',
    name: 'Soul Binder', role: 'Crypt Occultist', crest: '☠',
    palette: { primary: '#16a085', secondary: '#ded3bb', accent: '#96edff', aura: '#68c57c' },
    regalia: {
      headgear: 'Skull-Crested Crypt Hood',
      mantle: 'Bone-Ribbed Shroud',
      mainhand: 'Ossuary Scythe-Staff',
      offhand: 'Wailing Soul Lantern',
      auraStyle: 'soul_wisps',
    },
    pixelStyle: { remap: {}, crown: 'none', wings: 'none', weapon: 'base' },
  },
  dread_summoner: {
    id: 'dread_summoner', tier: 1, classId: 'soul_binder', combatClass: 'necromancer',
    name: 'Dread Summoner', role: 'Commander', crest: '🦴',
    palette: { primary: '#16a085', secondary: '#eef5ff', accent: '#f2ca59', aura: '#68c57c' },
    regalia: {
      headgear: 'Horned Ossuary Crown',
      mantle: 'Skeletal Pauldron-Mantle',
      mainhand: 'Commanding Bone-Scepter',
      offhand: 'Grimoire of the Legion',
      auraStyle: 'bone_legion',
    },
    pixelStyle: { remap: { g: 'i', G: 'I', m: 'y' }, crown: 'horns_gold', wings: 'spikes_bone', weapon: 'scythe_right' },
  },
  plague_harbinger: {
    id: 'plague_harbinger', tier: 1, classId: 'soul_binder', combatClass: 'necromancer',
    name: 'Plague Harbinger', role: 'Defiler', crest: '🧪',
    palette: { primary: '#1abc9c', secondary: '#68c57c', accent: '#a486dc', aura: '#68c57c' },
    regalia: {
      headgear: 'Blight-Doctor Beaked Visage',
      mantle: 'Miasma-Censer Shroud',
      mainhand: 'Rot-Weeping Scythe',
      offhand: 'Swinging Contagion Thurible',
      auraStyle: 'miasma_cloud',
    },
    pixelStyle: { remap: { g: 'p', G: 'G', w: 'g' }, crown: 'horns_violet', wings: 'cape_green', weapon: 'orb_left' },
  },
  abyssal_lich: {
    id: 'abyssal_lich', tier: 2, classId: 'soul_binder', combatClass: 'necromancer',
    name: 'Abyssal Lich', role: 'Arch-Lich', crest: '👑',
    palette: { primary: '#16a085', secondary: '#a486dc', accent: '#96edff', aura: '#65d4f5' },
    regalia: {
      headgear: 'High Phylactery Spire-Crown',
      mantle: 'Levitation Bone-Wing Ribcage',
      mainhand: 'Soul-Wave Arch-Staff',
      offhand: 'Orbiting Twin Skull-Phylacteries',
      auraStyle: 'phylactery_vortex',
    },
    pixelStyle: { remap: { g: 'c', G: 'z', w: 'y' }, crown: 'crown_void', wings: 'wings_void', weapon: 'dual_orbs' },
  },
  nether_knight: {
    id: 'nether_knight', tier: 2, classId: 'soul_binder', combatClass: 'necromancer',
    name: 'Nether Knight', role: 'Death Knight', crest: '⚔',
    palette: { primary: '#1abc9c', secondary: '#343c49', accent: '#96edff', aura: '#68c57c' },
    regalia: {
      headgear: 'Dread-Plate Greathelm of Undeath',
      mantle: 'Spectral Runeblade Pinions',
      mainhand: 'Grim-Harvest Execution Scythe',
      offhand: 'Soul-Forged Tower Shield',
      auraStyle: 'nether_frost_ring',
    },
    pixelStyle: { remap: { g: 'm', G: 'B', w: 'c' }, crown: 'crown_storm', wings: 'wings_cyan', weapon: 'scythe_right' },
  },

  // =====================================================================
  // 10. ARTIFICER LINE (artificer)
  // =====================================================================
  artificer: {
    id: 'artificer', tier: 0, classId: 'artificer', combatClass: 'artificer',
    name: 'Artificer', role: 'Magitek Machinist', crest: '⚙',
    palette: { primary: '#d35400', secondary: '#f2ca59', accent: '#96edff', aura: '#e0ad63' },
    regalia: {
      headgear: 'Brass Caliper Goggles',
      mantle: 'Riveted Boiler-Leather Apron',
      mainhand: 'Torque-Spanner Wrench',
      offhand: 'Volatile Acid Flask',
      auraStyle: 'clockwork_cogs',
    },
    pixelStyle: { remap: {}, crown: 'none', wings: 'none', weapon: 'base' },
  },
  clockwork_engineer: {
    id: 'clockwork_engineer', tier: 1, classId: 'artificer', combatClass: 'artificer',
    name: 'Clockwork Engineer', role: 'Tactician', crest: '⚡',
    palette: { primary: '#d35400', secondary: '#65d4f5', accent: '#f2ca59', aura: '#65d4f5' },
    regalia: {
      headgear: 'Arc-Lens Telemetry Visor',
      mantle: 'Twin-Piston Servo Backpack',
      mainhand: 'Tesla-Coil Dynamo Wrench',
      offhand: 'Autonomous Micro-Sentry Drone',
      auraStyle: 'tesla_dynamo',
    },
    pixelStyle: { remap: { O: 'y', N: 'B', m: 'c' }, crown: 'plume_cyan', wings: 'mech_pack', weapon: 'spear_left' },
  },
  mad_alchemist: {
    id: 'mad_alchemist', tier: 1, classId: 'artificer', combatClass: 'artificer',
    name: 'Mad Alchemist', role: 'Demolitionist', crest: '⚗',
    palette: { primary: '#e67e22', secondary: '#68c57c', accent: '#ef744d', aura: '#68c57c' },
    regalia: {
      headgear: 'Fume-Filter Respirator Goggles',
      mantle: 'Pressurized Elixir-Tank Harness',
      mainhand: 'Alchemical Mortar Launcher',
      offhand: 'Cluster of Nitro-Flasks',
      auraStyle: 'alchemical_fumes',
    },
    pixelStyle: { remap: { O: 'g', N: 'q', m: 'r' }, crown: 'horns_red', wings: 'cape_green', weapon: 'orb_left' },
  },
  magitek_mechlord: {
    id: 'magitek_mechlord', tier: 2, classId: 'artificer', combatClass: 'artificer',
    name: 'Magitek Mechlord', role: 'Siege Master', crest: '🤖',
    palette: { primary: '#d35400', secondary: '#eef5ff', accent: '#96edff', aura: '#96edff' },
    regalia: {
      headgear: 'Aegis-Chassis Command Helm',
      mantle: 'Shoulder-Mounted Siege Railguns',
      mainhand: 'Hyper-Velocity Plasma Cannon',
      offhand: 'Reactive Force-Field Generator',
      auraStyle: 'mechlord_chassis',
    },
    pixelStyle: { remap: { O: 'w', N: 'B', m: 'c', n: 'y' }, crown: 'crown_storm', wings: 'wings_gold', weapon: 'greatbow' },
  },
  grand_alchemist: {
    id: 'grand_alchemist', tier: 2, classId: 'artificer', combatClass: 'artificer',
    name: 'Grand Alchemist', role: 'Transmuter', crest: '✨',
    palette: { primary: '#e67e22', secondary: '#f2ca59', accent: '#a486dc', aura: '#f2ca59' },
    regalia: {
      headgear: 'Philosopher Crown of Transmutation',
      mantle: 'Golden Aether-Crucible Wings',
      mainhand: 'Caduceus of the Rubedo Stone',
      offhand: 'Orbiting Elixir Philosophers',
      auraStyle: 'philosopher_halo',
    },
    pixelStyle: { remap: { O: 'y', N: 'R', m: 'p' }, crown: 'crown_gold', wings: 'wings_crimson', weapon: 'dual_orbs' },
  },

  // =====================================================================
  // 11. TIER-IV HYBRID CALLINGS (9 Archetypes)
  // =====================================================================
  dreadnought: {
    id: 'dreadnought', tier: 3, classId: 'reborn_blade', combatClass: 'blade',
    name: 'Dreadnought', role: 'Heavy Juggernaut', crest: '🌋',
    palette: { primary: '#e0b64c', secondary: '#9e3929', accent: '#ffffff', aura: '#f2ca59' },
    regalia: {
      headgear: 'Titan-Slayer Juggernaut Great-Crown',
      mantle: 'Colossus Magma-Steel Wing-Mantle',
      mainhand: 'Twin Colossal Void-Cleavers',
      offhand: 'Unbreakable Bastion Core',
      auraStyle: 'hybrid_ascendant_gold',
    },
    pixelStyle: { remap: { r: 'y', R: 'R', w: 'L', B: 'k' }, crown: 'crown_hybrid', wings: 'wings_hybrid', weapon: 'cleaver_dual' },
  },
  spellblade: {
    id: 'spellblade', tier: 3, classId: 'codeweaver', combatClass: 'mage',
    name: 'Spellblade', role: 'Magical Melee', crest: '⚛',
    palette: { primary: '#b98bea', secondary: '#ef744d', accent: '#96edff', aura: '#96edff' },
    regalia: {
      headgear: 'Runic-Edge Astral Diadem',
      mantle: 'Fire-and-Frost Dual Halo Pinions',
      mainhand: 'Compiled Source-Code Greatsword',
      offhand: 'Orbiting Elemental Grimoire',
      auraStyle: 'hybrid_ascendant_arcane',
    },
    pixelStyle: { remap: { u: 'r', U: 'q', y: 'c' }, crown: 'crown_hybrid', wings: 'wings_hybrid', weapon: 'greatsword_right' },
  },
  arcane_archer: {
    id: 'arcane_archer', tier: 3, classId: 'far_shot', combatClass: 'ranger',
    name: 'Arcane Archer', role: 'Ranged Magic', crest: '🌠',
    palette: { primary: '#6ec6ff', secondary: '#b98bea', accent: '#f2ca59', aura: '#65d4f5' },
    regalia: {
      headgear: 'Star-Weaver Horizon Crown',
      mantle: 'Constellation Light-Feather Wings',
      mainhand: 'Astral-Stringed Singularity Bow',
      offhand: 'Floating Rune-Arrow Battery',
      auraStyle: 'hybrid_ascendant_arcane',
    },
    pixelStyle: { remap: { g: 'c', G: 'p', y: 'x' }, crown: 'crown_hybrid', wings: 'wings_hybrid', weapon: 'greatbow' },
  },
  vanguard: {
    id: 'vanguard', tier: 3, classId: 'lightbringer', combatClass: 'paladin',
    name: 'Vanguard', role: 'Heavy Defense', crest: '🛡',
    palette: { primary: '#ffe9a6', secondary: '#e69b61', accent: '#ffffff', aura: '#f2ca59' },
    regalia: {
      headgear: 'Sacred Phalanx Sovereign Helm',
      mantle: 'Radiant Asura-Seraph Pinions',
      mainhand: 'Spear of the Unbroken Phalanx',
      offhand: 'Sanctified Ki-Fortress Shield',
      auraStyle: 'hybrid_ascendant_gold',
    },
    pixelStyle: { remap: { w: 'y', m: 'x', B: 'O' }, crown: 'crown_hybrid', wings: 'wings_hybrid', weapon: 'aegis_banner' },
  },
  chi_tempest: {
    id: 'chi_tempest', tier: 3, classId: 'iron_fist', combatClass: 'monk',
    name: 'Chi Tempest', role: 'Elemental Martial Arts', crest: '🌪',
    palette: { primary: '#2ecc71', secondary: '#70cddd', accent: '#f2ca59', aura: '#65d4f5' },
    regalia: {
      headgear: 'Cyclone-Lotus Sovereign Crown',
      mantle: 'Living Storm-Dragon Chakra Wings',
      mainhand: 'Thunder-Palm Gauntlets',
      offhand: 'Eye of the Lotus Typhoon',
      auraStyle: 'hybrid_ascendant_arcane',
    },
    pixelStyle: { remap: { i: 'c', I: 'g', y: 'y' }, crown: 'crown_hybrid', wings: 'wings_hybrid', weapon: 'dual_orbs' },
  },
  storm_templar: {
    id: 'storm_templar', tier: 3, classId: 'stormcaller', combatClass: 'elementalist',
    name: 'Storm Templar', role: 'Holy Shock', crest: '⚡',
    palette: { primary: '#f2d24d', secondary: '#70cddd', accent: '#ffffff', aura: '#f2ca59' },
    regalia: {
      headgear: 'Divine Thunder-Judge Mitre',
      mantle: 'Seraphic Lightning-Pinion Mantle',
      mainhand: 'Mjolnir-Lance of Sanctuary',
      offhand: 'Aegis of the Tempest Choir',
      auraStyle: 'hybrid_ascendant_gold',
    },
    pixelStyle: { remap: { p: 'y', q: 'U', u: 'c' }, crown: 'crown_hybrid', wings: 'wings_hybrid', weapon: 'aegis_banner' },
  },
  nightblade_phantom: {
    id: 'nightblade_phantom', tier: 3, classId: 'shadow_blade', combatClass: 'assassin',
    name: 'Nightblade Sovereign', role: 'Void Assassin', crest: '🌑',
    palette: { primary: '#8e44ad', secondary: '#df777c', accent: '#96edff', aura: '#a486dc' },
    regalia: {
      headgear: 'Abyssal Eclipse Emperor Crown',
      mantle: 'Six-Winged Void-Reaper Shroud',
      mainhand: 'Twin Eclipse-Rending Scythe-Blades',
      offhand: 'Singularity Shadow-Chain',
      auraStyle: 'hybrid_ascendant_void',
    },
    pixelStyle: { remap: { p: 'r', q: 'k', w: 'c' }, crown: 'crown_hybrid', wings: 'wings_hybrid', weapon: 'cleaver_dual' },
  },
  eldritch_lord: {
    id: 'eldritch_lord', tier: 3, classId: 'soul_binder', combatClass: 'necromancer',
    name: 'Eldritch Netherlord', role: 'Nether Occultist', crest: '👁',
    palette: { primary: '#16a085', secondary: '#b98bea', accent: '#f2ca59', aura: '#a486dc' },
    regalia: {
      headgear: 'Astral Necro-Kernel Sovereign Crown',
      mantle: 'Eldritch Rift-Seraph Bone Wings',
      mainhand: 'Apocalypse Harvest Great-Scythe',
      offhand: 'Codex of the Nether-Gate',
      auraStyle: 'hybrid_ascendant_void',
    },
    pixelStyle: { remap: { g: 'p', G: 'q', w: 'y', m: 'c' }, crown: 'crown_hybrid', wings: 'wings_hybrid', weapon: 'scythe_right' },
  },
  quantum_technomancer: {
    id: 'quantum_technomancer', tier: 3, classId: 'artificer', combatClass: 'artificer',
    name: 'Quantum Technomancer', role: 'Quantum Engineer', crest: '🛰',
    palette: { primary: '#e67e22', secondary: '#70cddd', accent: '#ffffff', aura: '#96edff' },
    regalia: {
      headgear: 'Orbital Singularity Command Halo',
      mantle: 'Quantum Thruster Wing-Arrays',
      mainhand: 'Star-Forge Rail-Scepter',
      offhand: 'Orbital Strike Satellite Beacon',
      auraStyle: 'hybrid_ascendant_arcane',
    },
    pixelStyle: { remap: { O: 'c', N: 'U', m: 'y', n: 'w' }, crown: 'crown_hybrid', wings: 'wings_hybrid', weapon: 'greatbow' },
  },
};

// Stamp helper on a 16x22 mutable char grid
function stampGrid(grid, points) {
  for (const [x, y, ch] of points) {
    if (y >= 0 && y < 22 && x >= 0 && x < 16 && ch in PAL) {
      grid[y][x] = ch;
    }
  }
}

const CROWN_STAMPS = {
  plume_cyan: [
    [6, 0, 'k'], [7, 0, 'c'], [8, 0, 'l'], [9, 0, 'k'],
    [7, 1, 'c'], [8, 1, 'x'],
  ],
  horns_violet: [
    [3, 0, 'k'], [4, 0, 'p'], [11, 0, 'p'], [12, 0, 'k'],
    [4, 1, 'q'], [11, 1, 'q'],
  ],
  horns_red: [
    [3, 0, 'k'], [4, 0, 'r'], [11, 0, 'r'], [12, 0, 'k'],
    [4, 1, 'R'], [11, 1, 'R'],
  ],
  horns_gold: [
    [3, 0, 'k'], [4, 0, 'y'], [11, 0, 'y'], [12, 0, 'k'],
    [4, 1, 'Y'], [11, 1, 'Y'],
  ],
  crown_gold: [
    [4, 0, 'k'], [5, 0, 'y'], [7, 0, 'x'], [8, 0, 'x'], [10, 0, 'y'], [11, 0, 'k'],
    [5, 1, 'y'], [6, 1, 'Y'], [7, 1, 'y'], [8, 1, 'y'], [9, 1, 'Y'], [10, 1, 'y'],
  ],
  crown_void: [
    [3, 0, 'k'], [4, 0, 'p'], [7, 0, 'c'], [8, 0, 'c'], [11, 0, 'p'], [12, 0, 'k'],
    [4, 1, 'q'], [6, 1, 'p'], [7, 1, 'x'], [8, 1, 'x'], [9, 1, 'p'], [11, 1, 'q'],
  ],
  crown_storm: [
    [3, 0, 'k'], [5, 0, 'c'], [7, 0, 'x'], [8, 0, 'x'], [10, 0, 'c'], [12, 0, 'k'],
    [4, 1, 'l'], [6, 1, 'c'], [7, 1, 'y'], [8, 1, 'y'], [9, 1, 'c'], [11, 1, 'l'],
  ],
  crown_crimson: [
    [3, 0, 'k'], [4, 0, 'r'], [7, 0, 'y'], [8, 0, 'y'], [11, 0, 'r'], [12, 0, 'k'],
    [4, 1, 'R'], [6, 1, 'r'], [7, 1, 'x'], [8, 1, 'x'], [9, 1, 'r'], [11, 1, 'R'],
  ],
  crown_hybrid: [
    [2, 0, 'k'], [3, 0, 'y'], [5, 0, 'c'], [7, 0, 'x'], [8, 0, 'x'], [10, 0, 'c'], [12, 0, 'y'], [13, 0, 'k'],
    [3, 1, 'Y'], [5, 1, 'y'], [7, 1, 'c'], [8, 1, 'c'], [10, 1, 'y'], [12, 1, 'Y'],
  ],
};

const WING_STAMPS = {
  shield_wall: [
    [1, 9, 'k'], [1, 10, 'w'], [1, 11, 'y'], [1, 12, 'w'], [1, 13, 'k'],
    [2, 10, 'm'], [2, 11, 'y'], [2, 12, 'm'],
  ],
  cape_violet: [
    [2, 9, 'k'], [2, 10, 'p'], [2, 11, 'q'], [2, 12, 'p'], [2, 13, 'k'],
    [13, 9, 'k'], [13, 10, 'p'], [13, 11, 'q'], [13, 12, 'p'], [13, 13, 'k'],
  ],
  cape_cyan: [
    [2, 9, 'k'], [2, 10, 'c'], [2, 11, 'l'], [2, 12, 'z'], [2, 13, 'k'],
    [13, 9, 'k'], [13, 10, 'c'], [13, 11, 'l'], [13, 12, 'z'], [13, 13, 'k'],
  ],
  cape_green: [
    [2, 9, 'k'], [2, 10, 'g'], [2, 11, 'G'], [2, 12, 'g'], [2, 13, 'k'],
    [13, 9, 'k'], [13, 10, 'g'], [13, 11, 'G'], [13, 12, 'g'], [13, 13, 'k'],
  ],
  cape_crimson: [
    [2, 9, 'k'], [2, 10, 'r'], [2, 11, 'R'], [2, 12, 'y'], [2, 13, 'k'],
    [13, 9, 'k'], [13, 10, 'r'], [13, 11, 'R'], [13, 12, 'y'], [13, 13, 'k'],
  ],
  spikes_red: [
    [1, 7, 'k'], [1, 8, 'r'], [2, 8, 'R'], [14, 7, 'k'], [14, 8, 'r'], [13, 8, 'R'],
  ],
  spikes_bone: [
    [1, 7, 'k'], [1, 8, 'i'], [2, 8, 'w'], [14, 7, 'k'], [14, 8, 'i'], [13, 8, 'w'],
  ],
  mech_pack: [
    [1, 8, 'k'], [1, 9, 'O'], [1, 10, 'y'], [1, 11, 'c'], [1, 12, 'k'],
    [14, 8, 'k'], [14, 9, 'O'], [14, 10, 'y'], [14, 11, 'c'], [14, 12, 'k'],
  ],
  wings_void: [
    [0, 6, 'k'], [0, 7, 'p'], [0, 8, 'q'], [1, 7, 'c'], [1, 8, 'p'], [1, 9, 'q'], [1, 10, 'k'],
    [15, 6, 'k'], [15, 7, 'p'], [15, 8, 'q'], [14, 7, 'c'], [14, 8, 'p'], [14, 9, 'q'], [14, 10, 'k'],
  ],
  wings_gold: [
    [0, 6, 'k'], [0, 7, 'y'], [0, 8, 'x'], [1, 7, 'x'], [1, 8, 'y'], [1, 9, 'Y'], [1, 10, 'k'],
    [15, 6, 'k'], [15, 7, 'y'], [15, 8, 'x'], [14, 7, 'x'], [14, 8, 'y'], [14, 9, 'Y'], [14, 10, 'k'],
  ],
  wings_cyan: [
    [0, 6, 'k'], [0, 7, 'c'], [0, 8, 'l'], [1, 7, 'x'], [1, 8, 'c'], [1, 9, 'z'], [1, 10, 'k'],
    [15, 6, 'k'], [15, 7, 'c'], [15, 8, 'l'], [14, 7, 'x'], [14, 8, 'c'], [14, 9, 'z'], [14, 10, 'k'],
  ],
  wings_crimson: [
    [0, 6, 'k'], [0, 7, 'r'], [0, 8, 'y'], [1, 7, 'y'], [1, 8, 'r'], [1, 9, 'R'], [1, 10, 'k'],
    [15, 6, 'k'], [15, 7, 'r'], [15, 8, 'y'], [14, 7, 'y'], [14, 8, 'r'], [14, 9, 'R'], [14, 10, 'k'],
  ],
  wings_hybrid: [
    [0, 5, 'k'], [0, 6, 'y'], [0, 7, 'c'], [0, 8, 'p'], [1, 6, 'x'], [1, 7, 'y'], [1, 8, 'c'], [1, 9, 'p'], [1, 10, 'k'],
    [15, 5, 'k'], [15, 6, 'y'], [15, 7, 'c'], [15, 8, 'p'], [14, 6, 'x'], [14, 7, 'y'], [14, 8, 'c'], [14, 9, 'p'], [14, 10, 'k'],
  ],
};

const WEAPON_STAMPS = {
  spear_left: [
    [0, 3, 'k'], [0, 4, 'x'], [0, 5, 'c'], [0, 6, 'y'], [0, 7, 'n'], [0, 8, 'n'], [0, 9, 'n'], [0, 10, 'k'],
  ],
  greatsword_right: [
    [14, 4, 'k'], [14, 5, 'x'], [14, 6, 'w'], [14, 7, 'c'], [14, 8, 'w'], [14, 9, 'y'], [14, 10, 'n'], [14, 11, 'k'],
  ],
  cleaver_dual: [
    [0, 9, 'k'], [0, 10, 'x'], [0, 11, 'r'], [0, 12, 'y'], [0, 13, 'k'],
    [15, 9, 'k'], [15, 10, 'x'], [15, 11, 'r'], [15, 12, 'y'], [15, 13, 'k'],
  ],
  aegis_banner: [
    [14, 3, 'k'], [14, 4, 'y'], [15, 4, 'x'], [14, 5, 'y'], [15, 5, 'c'], [14, 6, 'n'], [14, 7, 'n'], [14, 8, 'k'],
  ],
  twin_blades: [
    [0, 10, 'k'], [0, 11, 'c'], [0, 12, 'w'], [0, 13, 'k'],
    [15, 10, 'k'], [15, 11, 'c'], [15, 12, 'w'], [15, 13, 'k'],
  ],
  great_axe: [
    [14, 6, 'k'], [14, 7, 'r'], [15, 7, 'w'], [14, 8, 'R'], [15, 8, 'w'], [14, 9, 'n'], [14, 10, 'n'], [14, 11, 'k'],
  ],
  scythe_right: [
    [12, 3, 'k'], [13, 3, 'c'], [14, 3, 'x'], [15, 4, 'w'], [14, 5, 'n'], [14, 6, 'n'], [14, 7, 'n'], [14, 8, 'k'],
  ],
  staff_left: [
    [1, 4, 'k'], [1, 5, 'y'], [0, 5, 'r'], [2, 5, 'c'], [1, 6, 'y'], [1, 7, 'n'], [1, 8, 'n'], [1, 9, 'k'],
  ],
  orb_left: [
    [0, 8, 'k'], [0, 9, 'c'], [1, 9, 'x'], [0, 10, 'l'], [0, 11, 'k'],
  ],
  dual_orbs: [
    [0, 4, 'k'], [0, 5, 'c'], [1, 5, 'x'], [0, 6, 'k'],
    [15, 4, 'k'], [15, 5, 'y'], [14, 5, 'x'], [15, 6, 'k'],
  ],
  greatbow: [
    [14, 5, 'k'], [15, 6, 'y'], [15, 7, 'c'], [15, 8, 'x'], [15, 9, 'c'], [15, 10, 'y'], [14, 11, 'k'],
  ],
  falcon_left: [
    [0, 5, 'k'], [0, 6, 'y'], [1, 6, 'x'], [2, 6, 'L'], [1, 7, 'n'], [0, 7, 'k'],
  ],
};

function buildJobPixelMatrix(modelId, walk = false) {
  const model = CLASS_JOB_MODELS[modelId] || CLASS_JOB_MODELS.reborn_blade;
  const baseGroup = walk ? PX.playerWalk : PX.player;
  const source = baseGroup[model.combatClass] || baseGroup.blade;
  if (model.tier === 0) {
    return source.map(r => r.padEnd(16, ' ').slice(0, 16));
  }
  const remap = model.pixelStyle?.remap || {};
  const grid = source.map(row => {
    const padded = row.padEnd(16, ' ').slice(0, 16);
    return Array.from(padded, ch => (remap[ch] && remap[ch] in PAL ? remap[ch] : ch));
  });
  const ps = model.pixelStyle || {};
  if (ps.wings && WING_STAMPS[ps.wings]) stampGrid(grid, WING_STAMPS[ps.wings]);
  if (ps.crown && CROWN_STAMPS[ps.crown]) stampGrid(grid, CROWN_STAMPS[ps.crown]);
  if (ps.weapon && WEAPON_STAMPS[ps.weapon]) stampGrid(grid, WEAPON_STAMPS[ps.weapon]);
  return grid.map(r => r.join(''));
}

// Register all 59 job matrices into PX.jobModel and PX.jobModelWalk
PX.jobModel = PX.jobModel || {};
PX.jobModelWalk = PX.jobModelWalk || {};
for (const id of Object.keys(CLASS_JOB_MODELS)) {
  PX.jobModel[id] = buildJobPixelMatrix(id, false);
  PX.jobModelWalk[id] = buildJobPixelMatrix(id, true);
}

export function getJobPixelMatrix(modelId, walk = false) {
  const table = walk ? PX.jobModelWalk : PX.jobModel;
  return table[modelId] || table.reborn_blade;
}

export function resolvePlayerVisualModel(p, opts = {}) {
  if (opts.modelId && CLASS_JOB_MODELS[opts.modelId]) {
    const direct = CLASS_JOB_MODELS[opts.modelId];
    return { ...direct, lineage: [direct], activeTier: direct.tier, previewTier: direct.tier };
  }
  const classId = p?.classId || 'reborn_blade';
  const baseModel = CLASS_JOB_MODELS[classId] || CLASS_JOB_MODELS.reborn_blade;

  const branchChoices = PROGRESSION.jobBranches?.[classId]?.choices || [];
  const defaultBranchId = PROGRESSION.jobBranches?.[classId]?.defaultId || branchChoices[0]?.id;
  const branchId = p?.jobBranchId || defaultBranchId;
  const tier1Model = CLASS_JOB_MODELS[branchId] || baseModel;

  const advChoices = PROGRESSION.advancedJobs?.[classId]?.choices || [];
  const defaultAdvId = PROGRESSION.advancedJobs?.[classId]?.defaultId || advChoices[0]?.id;
  const advId = p?.advancedJobId || defaultAdvId;
  const tier2Model = CLASS_JOB_MODELS[advId] || tier1Model;

  const hybridId = p?.hybridJobId || HYBRID_BY_CLASS[classId] || 'dreadnought';
  const tier3Model = CLASS_JOB_MODELS[hybridId] || tier2Model;

  const lineage = [baseModel, tier1Model, tier2Model, tier3Model];
  const activeTier = Math.max(0, Math.min(3, p?.hybridJobId ? 3 : (p?.advancedJobId ? 2 : (p?.jobBranchId ? 1 : (p?.tierIndex || 0)))));
  const chosenTier = Number.isInteger(opts.previewTier)
    ? Math.max(0, Math.min(3, opts.previewTier))
    : activeTier;
  const resolved = lineage[chosenTier] || baseModel;

  return {
    ...resolved,
    lineage,
    activeTier,
    previewTier: chosenTier,
  };
}

// World-canvas directional regalia & aura renderer (zero screen shake)
export function drawPlayerJobRegalia(ctx, p, px, py, anim = {}, nowMs = 0, modelOverride = null) {
  if (!ctx || !p) return;
  const model = modelOverride || resolvePlayerVisualModel(p);
  const tier = model.tier || 0;
  const pal = model.palette || CLASS_JOB_MODELS.reborn_blade.palette;
  const dir = anim.dir || 'down';
  const pulse = Math.sin(nowMs / 320);

  ctx.save();

  // 1. Ground Aura Ring (scales with promotion tier; distinct silhouette for expansion classes at Tier 0)
  if (tier >= 1 || ['assassin', 'necromancer', 'artificer'].includes(model.combatClass)) {
    const rx = 13 + tier * 2.5;
    const ry = rx * 0.44;
    ctx.strokeStyle = pal.aura;
    ctx.lineWidth = tier >= 2 ? 2 : 1.5;
    ctx.beginPath();
    ctx.ellipse(px, py + 7, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();

    if (tier >= 2) {
      // Orbiting tier motes
      const count = tier === 3 ? 4 : 2;
      ctx.fillStyle = pal.accent;
      for (let i = 0; i < count; i++) {
        const ang = (nowMs / 650) + (i * Math.PI * 2) / count;
        const ox = px + Math.cos(ang) * (rx + 2);
        const oy = py + 7 + Math.sin(ang) * (ry + 1);
        ctx.fillRect(Math.round(ox - 1.5), Math.round(oy - 1.5), 3, 3);
      }
    }
  }

  // 2. Mantle / Wing Silhouette behind torso
  const headY = py - 24 + (anim.state === 'walk' || anim.state === 'run' ? (anim.frame % 2 ? -1 : 0) : 0);
  const torsoY = headY + 11;
  if (tier >= 2) {
    const wingSpan = tier === 3 ? 16 : 12;
    const flap = Math.round(pulse * 1.5);
    ctx.fillStyle = pal.secondary;
    ctx.strokeStyle = pal.primary;
    ctx.lineWidth = 1.5;
    // Left wing
    ctx.beginPath();
    ctx.moveTo(px - 4, torsoY);
    ctx.lineTo(px - wingSpan, torsoY - 6 + flap);
    ctx.lineTo(px - wingSpan + 3, torsoY + 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Right wing
    ctx.beginPath();
    ctx.moveTo(px + 4, torsoY);
    ctx.lineTo(px + wingSpan, torsoY - 6 + flap);
    ctx.lineTo(px + wingSpan - 3, torsoY + 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (tier === 1) {
    // Second-job shoulder pauldrons
    ctx.fillStyle = pal.primary;
    ctx.fillRect(Math.round(px - 10), Math.round(torsoY - 2), 4, 4);
    ctx.fillRect(Math.round(px + 6), Math.round(torsoY - 2), 4, 4);
  }

  // 3. Headgear / Crown / Class-Specific Crest above head
  if (tier >= 1 || ['assassin', 'necromancer', 'artificer'].includes(model.combatClass)) {
    ctx.fillStyle = pal.accent;
    if (tier === 3) {
      // Ascendant Hybrid floating halo-crown
      ctx.strokeStyle = pal.accent;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(px, headY - 6, 8, 3, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillRect(Math.round(px - 1.5), Math.round(headY - 11), 3, 4);
    } else if (tier === 2) {
      // Three-point sovereign crown
      ctx.fillRect(Math.round(px - 6), Math.round(headY - 5), 12, 2);
      ctx.fillRect(Math.round(px - 6), Math.round(headY - 8), 2, 3);
      ctx.fillRect(Math.round(px - 1), Math.round(headY - 9), 2, 4);
      ctx.fillRect(Math.round(px + 4), Math.round(headY - 8), 2, 3);
    } else {
      // Tier 1 / Expansion class diadem / goggles / hood crest
      ctx.fillRect(Math.round(px - 4), Math.round(headY - 5), 8, 2);
      ctx.fillStyle = pal.primary;
      ctx.fillRect(Math.round(px - 1), Math.round(headY - 7), 2, 3);
    }
  }

  // 4. Directional Weapon / Offhand Accent
  const handOffsetX = dir === 'left' ? -11 : dir === 'right' ? 9 : 10;
  const handY = torsoY + 2;
  if (tier >= 1 || ['assassin', 'necromancer', 'artificer'].includes(model.combatClass)) {
    ctx.fillStyle = pal.primary;
    ctx.fillRect(Math.round(px + handOffsetX), Math.round(handY - 4), 3, 8);
    ctx.fillStyle = pal.accent;
    ctx.fillRect(Math.round(px + handOffsetX), Math.round(handY - 6), 3, 2);
  }

  ctx.restore();
}

const escHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function renderJobPortraitHtml(modelOrId, opts = {}) {
  const model = typeof modelOrId === 'string'
    ? (CLASS_JOB_MODELS[modelOrId] || CLASS_JOB_MODELS.reborn_blade)
    : (modelOrId || CLASS_JOB_MODELS.reborn_blade);
  const size = opts.size || 52;
  const pxDataURL = opts.pxDataURL || null;
  const spriteUrl = pxDataURL ? pxDataURL('jobModel', model.id) : '';
  const pal = model.palette || CLASS_JOB_MODELS.reborn_blade.palette;
  const roman = ['I', 'II', 'III', 'IV'][model.tier || 0] || 'I';

  const imgHtml = spriteUrl
    ? `<img src="${spriteUrl}" width="${size}" height="${Math.round(size * 1.375)}" class="job-model-sprite" alt="${escHtml(model.name)}">`
    : `<span class="job-model-crest-fallback" aria-hidden="true">${escHtml(model.crest || '✦')}</span>`;

  return `<div class="job-model-portrait tier-${model.tier || 0}" data-model-id="${escHtml(model.id)}" style="--model-primary:${pal.primary};--model-secondary:${pal.secondary};--model-accent:${pal.accent};--model-aura:${pal.aura};--model-size:${size}px">
    <span class="job-model-aura-ring" aria-hidden="true"></span>
    ${imgHtml}
    <span class="job-model-tier-pill">T-${roman}</span>
  </div>`;
}

export function renderHeroModelShowcaseHtml(p, opts = {}) {
  const tr = opts.T || (k => k);
  const resolved = resolvePlayerVisualModel(p, { previewTier: opts.previewTier });
  const roman = ['I', 'II', 'III', 'IV'];
  const portrait = renderJobPortraitHtml(resolved, { size: 56, pxDataURL: opts.pxDataURL });
  const isPreview = resolved.previewTier !== resolved.activeTier;

  const tabsHtml = resolved.lineage.map((m, idx) => {
    const active = idx === resolved.previewTier;
    const unlocked = idx <= resolved.activeTier;
    return `<button type="button" class="st-model-tab${active ? ' is-active' : ''}${unlocked ? ' is-unlocked' : ' is-locked'}" data-preview-model-tier="${idx}" title="${escHtml(tr(m.name, 'classes'))}">
      <span class="st-model-tab__roman">${roman[idx]}</span>
      <span class="st-model-tab__name">${escHtml(tr(m.name, 'classes'))}</span>
      ${unlocked ? '' : '<i class="st-model-tab__lock" aria-hidden="true">🔒</i>'}
    </button>`;
  }).join('');

  const reg = resolved.regalia || {};
  const chips = [
    ['👑', tr('Headgear', 'ui'), reg.headgear],
    ['🦋', tr('Mantle', 'ui'), reg.mantle],
    ['⚔', tr('Armament', 'ui'), `${reg.mainhand} · ${reg.offhand}`],
  ];

  return `<section class="ro-box st-model-showcase" data-active-model="${escHtml(resolved.id)}" style="--model-primary:${resolved.palette.primary};--model-aura:${resolved.palette.aura}">
    <div class="st-model-stage">
      ${portrait}
      <div class="st-model-meta">
        <div class="st-model-head">
          <small class="ro-muted">${escHtml(tr('Visual Model', 'ui'))} · ${isPreview ? `<b class="st-model-preview-badge">${escHtml(tr('Previewing', 'ui'))} Tier ${roman[resolved.previewTier]}</b>` : `<b class="st-model-live-badge">${escHtml(tr('Live Form', 'ui'))}</b>`}</small>
          <strong class="st-model-title">${escHtml(tr(resolved.name, 'classes'))} <span class="st-model-role">[${escHtml(resolved.role)}]</span></strong>
        </div>
        <div class="st-regalia-grid">
          ${chips.map(([icon, label, val]) => `<div class="st-regalia-chip"><small>${icon} ${escHtml(label)}</small><b>${escHtml(val)}</b></div>`).join('')}
        </div>
      </div>
    </div>
    <div class="st-model-preview-tabs" role="tablist" aria-label="${escHtml(tr('Model Evolution', 'ui'))}">
      ${tabsHtml}
    </div>
  </section>`;
}
