// js/zones/regional-dungeons.js - Standardized 32x22 winged regional subdungeons.

export function createWingedDungeonTiles(wallChar = '#', floorChar = '.') {
  const W = 32, H = 22;
  const rows = [];
  for (let y = 0; y < H; y++) {
    if (y === 0 || y === H - 1) {
      rows.push(wallChar.repeat(W));
    } else if (y === 1) {
      // Foyer top row with return portal pad at x: 1
      rows.push(wallChar + 'P' + floorChar.repeat(W - 3) + wallChar);
    } else if (y >= 2 && y <= 4) {
      // Foyer open floor (player starts at 2, 2)
      rows.push(wallChar + floorChar.repeat(W - 2) + wallChar);
    } else if (y === 5) {
      // Divider wall between foyer and lower wings with left passage (x: 2..5) and right passage (x: 20..23)
      let r = wallChar;
      for (let x = 1; x < W - 1; x++) {
        if ((x >= 2 && x <= 5) || (x >= 20 && x <= 23)) {
          r += floorChar;
        } else {
          r += wallChar;
        }
      }
      r += wallChar;
      rows.push(r);
    } else {
      // Lower wings (y: 6..20)
      // Left extraction wing: x: 1..14 (guarantees (10, 8), (12, 8), (12, 10) walkable)
      // Divider wall: x: 15..16 (passage at y: 13)
      // Right 12x12 boss sanctum: x: 17..30 (boss marker 'B' at 24, 13 with >=12x12 clearance)
      let r = wallChar;
      for (let x = 1; x < W - 1; x++) {
        if (x <= 14) {
          r += floorChar;
        } else if (x === 15 || x === 16) {
          r += (y === 13) ? floorChar : wallChar;
        } else {
          if (x === 24 && y === 13) {
            r += 'B';
          } else {
            r += floorChar;
          }
        }
      }
      r += wallChar;
      rows.push(r);
    }
  }
  return rows;
}

export const ww_goblin_cave = {
  id: 'ww_goblin_cave',
  name: 'Goblin Warrens',
  ambient: 'Chittering echoes through damp tunnels. The chieftain watches.',
  chronicle: {
    province: 'The Greenward',
    epithet: 'The Scrap Warrens',
    landmark: 'Chieftain’s Hoard',
    lore: 'Carved beneath the briars, this warren shelters the goblin clan that preys on unwary travelers.',
  },
  width: 32,
  height: 22,
  band: [1, 14],
  tiles: createWingedDungeonTiles('#', '.'),
  playerStart: { x: 2, y: 2 },
  portals: [
    { x: 1, y: 1, toMap: 'whispering_woods', toX: 38, toY: 30, label: 'Exit to Whispering Woods' },
  ],
  spawns: [
    { monsterId: 'slime', count: 4, depth: [0.0, 0.35], levelRange: [1, 5] },
    { monsterId: 'goblin', count: 8, depth: [0.35, 0.70], levelRange: [3, 8] },
    { monsterId: 'goblin_scout', count: 5, depth: [0.70, 0.95], levelRange: [6, 9] },
    { monsterId: 'goblin_chieftain', count: 1 },
  ],
  npcs: [],
  boss: {
    monsterId: 'goblin_chieftain',
    x: 24,
    y: 13,
  },
};

export const sr_drowned_catacombs = {
  id: 'sr_drowned_catacombs',
  name: 'Drowned Catacombs',
  ambient: 'Cold dark waters lap against ancient tombs. Lich Malakar guards the forbidden sanctum.',
  chronicle: {
    province: 'The Drowned March',
    epithet: 'Catacombs of the Sunk Abbot',
    landmark: 'Malakar\'s Crypt',
    lore: 'Sealed beneath the flooded abbey, these catacombs inter the fallen high priests of the First Gate.',
  },
  width: 32,
  height: 22,
  band: [16, 28],
  tiles: createWingedDungeonTiles('#', 'F'),
  playerStart: { x: 2, y: 2 },
  portals: [
    { x: 1, y: 1, toMap: 'sunken_ruins', toX: 26, toY: 4, label: 'Exit to Sunken Ruins' },
  ],
  spawns: [
    { monsterId: 'mire_leech', count: 4, depth: [0.0, 0.35], levelRange: [16, 20] },
    { monsterId: 'shade', count: 6, depth: [0.30, 0.70], levelRange: [18, 24] },
    { monsterId: 'drowned_acolyte', count: 4, depth: [0.65, 0.95], levelRange: [24, 28] },
    { monsterId: 'lich_malakar', count: 1 },
  ],
  npcs: [],
  boss: {
    monsterId: 'lich_malakar',
    x: 24,
    y: 13,
  },
};

export const as_sandstone_necropolis = {
  id: 'as_sandstone_necropolis',
  name: 'Sandstone Necropolis',
  ambient: 'Sun-baked dust sifts down ancient tombs. The Sandstone Colossus guards the forgotten kings.',
  chronicle: {
    province: 'The Sun-Scorched Savannah',
    epithet: 'The Dune Crypts',
    landmark: 'Altar of the Colossus',
    lore: 'Ancient subterranean tombs carved into sandstone bedrock where the Dune Vanguard slumbers.',
  },
  width: 32,
  height: 22,
  band: [18, 28],
  tiles: createWingedDungeonTiles('#', 'D'),
  playerStart: { x: 2, y: 2 },
  portals: [
    { x: 1, y: 1, toMap: 'ashen_steppes', toX: 38, toY: 29, label: 'Exit to Ashen Steppes' },
  ],
  spawns: [],
  npcs: [],
  boss: {
    monsterId: 'sandstone_colossus',
    x: 24,
    y: 13,
  },
};

export const ft_glacial_chasm = {
  id: 'ft_glacial_chasm',
  name: 'Glacial Chasm',
  ambient: 'Freezing winds howl through treacherous chasms. The Frostbite Matron stirs in her icy lair.',
  chronicle: {
    province: 'The Northreach',
    epithet: 'Fissure of the Frost Queen',
    landmark: 'The Brood Hollow',
    lore: 'A treacherous chasm carved into glacial bedrock, harboring the matriarch of the frost-beasts.',
  },
  width: 32,
  height: 22,
  band: [30, 44],
  tiles: createWingedDungeonTiles('M', 'S'),
  playerStart: { x: 2, y: 2 },
  portals: [
    { x: 1, y: 1, toMap: 'frostpeak_tundra', toX: 38, toY: 27, label: 'Exit to Frostpeak Tundra' },
  ],
  spawns: [
    { monsterId: 'frost_wolf', count: 5, depth: [0.0, 0.35], levelRange: [31, 35] },
    { monsterId: 'ice_wraith', count: 5, depth: [0.30, 0.70], levelRange: [35, 40] },
    { monsterId: 'rime_harpy', count: 4, depth: [0.65, 0.95], levelRange: [40, 44] },
    { monsterId: 'frostbite_matron', count: 1 },
  ],
  npcs: [],
  boss: {
    monsterId: 'frostbite_matron',
    x: 24,
    y: 13,
  },
};

export const tm_sporeheart_hollow = {
  id: 'tm_sporeheart_hollow',
  name: 'Sporeheart Hollow',
  ambient: 'Bioluminescent spores pulse in the suffocating damp. The Sporeheart Matron weaves toxic cocoons.',
  chronicle: {
    province: 'The Bioluminescent Bayou',
    epithet: 'The Fungal Core',
    landmark: 'Matron\'s Sporebed',
    lore: 'Deep cavern beneath the mire roots pulsating with ancient spores and fungal rot.',
  },
  width: 32,
  height: 22,
  band: [30, 40],
  tiles: createWingedDungeonTiles('#', '.'),
  playerStart: { x: 2, y: 2 },
  portals: [
    { x: 1, y: 1, toMap: 'twilight_mire', toX: 38, toY: 29, label: 'Exit to Twilight Mire' },
  ],
  spawns: [],
  npcs: [],
  boss: {
    monsterId: 'sporeheart_matron',
    x: 24,
    y: 13,
  },
};

export const dc_obsidian_foundry = {
  id: 'dc_obsidian_foundry',
  name: 'Obsidian Foundry',
  ambient: 'Intense heat radiates from ancient smelters. The Magma Golem Core burns with violent power.',
  chronicle: {
    province: 'The Ashen Crown',
    epithet: 'Crucible of Molten Steel',
    landmark: 'The Magma Crucible',
    lore: 'Ancient foundry furnaces fueled by caldera magma, where the core of an obsidian colossus still burns.',
  },
  width: 32,
  height: 22,
  band: [46, 60],
  tiles: createWingedDungeonTiles('M', 'D'),
  playerStart: { x: 2, y: 2 },
  portals: [
    { x: 1, y: 1, toMap: 'dragon_caldera', toX: 38, toY: 29, label: 'Exit to Dragon Caldera' },
  ],
  spawns: [
    { monsterId: 'ember_imp', count: 5, depth: [0.0, 0.35], levelRange: [46, 51] },
    { monsterId: 'sand_stalker', count: 5, depth: [0.30, 0.70], levelRange: [51, 56] },
    { monsterId: 'magma_beetle', count: 4, depth: [0.65, 0.95], levelRange: [55, 60] },
    { monsterId: 'magma_golem_core', count: 1 },
  ],
  npcs: [],
  boss: {
    monsterId: 'magma_golem_core',
    x: 24,
    y: 13,
  },
};

export const ts_thunderforge_peak = {
  id: 'ts_thunderforge_peak',
  name: 'Thunderforge Peak',
  ambient: 'High voltage arcs between ancient copper pillars. The Thunderforge Titan channels atmospheric fury.',
  chronicle: {
    province: 'The Skyward Crags',
    epithet: 'The Storm Anvil',
    landmark: 'Titan\'s Forge',
    lore: 'An ancient electrified workshop perched atop the spires where storm energy is harnessed.',
  },
  width: 32,
  height: 22,
  band: [52, 64],
  tiles: createWingedDungeonTiles('M', 'F'),
  playerStart: { x: 2, y: 2 },
  portals: [
    { x: 1, y: 1, toMap: 'tempest_spires', toX: 38, toY: 29, label: 'Exit to Tempest Spires' },
  ],
  spawns: [],
  npcs: [],
  boss: {
    monsterId: 'thunderforge_titan',
    x: 24,
    y: 13,
  },
};

export const sc_abyssal_crypts = {
  id: 'sc_abyssal_crypts',
  name: 'Abyssal Crypts',
  ambient: 'Cold darkness swallows all light. The Abyssal Dreadlord reigns over the quiet forgotten tombs.',
  chronicle: {
    province: 'The Deep Abyss',
    epithet: 'The Umbral Tombs',
    landmark: 'Chamber of Dread',
    lore: 'Silent subterranean catacombs shrouded in impenetrable shadow and eternal cold.',
  },
  width: 32,
  height: 22,
  band: [62, 74],
  tiles: createWingedDungeonTiles('#', 'F'),
  playerStart: { x: 2, y: 2 },
  portals: [
    { x: 1, y: 1, toMap: 'sunless_chasm', toX: 38, toY: 29, label: 'Exit to Sunless Chasm' },
  ],
  spawns: [],
  npcs: [],
  boss: {
    monsterId: 'abyssal_dreadlord',
    x: 24,
    y: 13,
  },
};

export const ar_singularity_vault = {
  id: 'ar_singularity_vault',
  name: 'Singularity Vault',
  ambient: 'Gravitational waves bend starlight into dark spirals. The Singularity Herald awaits.',
  chronicle: {
    province: 'The Starfall Scar',
    epithet: 'Heart of Event Horizon',
    landmark: 'The Collapsed Core',
    lore: 'A hidden vault at the edge of the astral rift where unstable dimensional energies converge into a singularity.',
  },
  width: 32,
  height: 22,
  band: [61, 80],
  tiles: createWingedDungeonTiles('O', 'X'),
  playerStart: { x: 2, y: 2 },
  portals: [
    { x: 1, y: 1, toMap: 'astral_rift', toX: 5, toY: 2, label: 'Exit to Astral Rift' },
  ],
  spawns: [
    { monsterId: 'void_wisp', count: 5, depth: [0.0, 0.35], levelRange: [61, 66] },
    { monsterId: 'star_reaver', count: 5, depth: [0.30, 0.70], levelRange: [66, 72] },
    { monsterId: 'rift_manta', count: 4, depth: [0.65, 0.95], levelRange: [75, 80] },
    { monsterId: 'singularity_herald', count: 1 },
  ],
  npcs: [],
  boss: {
    monsterId: 'singularity_herald',
    x: 24,
    y: 13,
  },
};

export const source_core_subdungeon = {
  id: 'source_core_subdungeon',
  name: 'Source Core',
  ambient: 'The air hums with overclocked computational energy. The System Architect awaits.',
  chronicle: {
    province: 'The Uncompiled Boundary',
    epithet: 'Heart of the Machine',
    landmark: 'The Kernel Altar',
    lore: 'The pulsating core of the Glitched Monolith where the System Architect commands the primordial logic of Aetheria.',
  },
  width: 32,
  height: 22,
  band: [81, 100],
  tiles: createWingedDungeonTiles('O', 'X'),
  playerStart: { x: 2, y: 2 },
  portals: [
    { x: 1, y: 1, toMap: 'glitched_monolith', toX: 40, toY: 29, label: 'Return to Glitched Monolith' },
  ],
  spawns: [
    { monsterId: 'debug_drone', count: 4, depth: [0.00, 0.40], levelRange: [81, 86] },
    { monsterId: 'compiler_golem', count: 4, depth: [0.35, 0.75], levelRange: [85, 90] },
    { monsterId: 'overtime_wraith', count: 4, depth: [0.70, 0.95], levelRange: [83, 88] },
    { monsterId: 'system_architect', count: 1 },
  ],
  npcs: [],
  boss: {
    monsterId: 'system_architect',
    x: 24,
    y: 13,
  },
};

export const REGIONAL_DUNGEONS = {
  ww_goblin_cave,
  sr_drowned_catacombs,
  as_sandstone_necropolis,
  ft_glacial_chasm,
  tm_sporeheart_hollow,
  dc_obsidian_foundry,
  ts_thunderforge_peak,
  sc_abyssal_crypts,
  ar_singularity_vault,
  source_core_subdungeon,
};
