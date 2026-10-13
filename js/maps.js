// js/maps.js - connected isekai regions. Tile art = string rows, decoded by legend.
// ponytail: string-rows over 2D arrays; content team parses rows[y][x] -> legend[char].
import { REGIONAL_DUNGEONS } from './zones/regional-dungeons.js';
import { GLITCHED_MONOLITH_MAPS } from './zones/glitched-monolith.js';

const LEGEND = {
  // Bright, controlled 16-bit regional colors: warm civilization, cool wilderness,
  // and a blue-black astral endgame. Colors also provide the minimap language.
  '.': { type: 'grass', walkable: true,  color: '#4f8a48' },
  ',': { type: 'bush',  walkable: true,  color: '#72a34f' },
  'R': { type: 'road',  walkable: true,  color: '#b58b55' },
  'F': { type: 'floor', walkable: true,  color: '#777b82' },
  'T': { type: 'tree',  walkable: false, color: '#20523b' },
  '#': { type: 'wall',  walkable: false, color: '#4b5058' },
  'W': { type: 'water', walkable: false, color: '#277aa0' },
  '~': { type: 'deep_water', walkable: false, color: '#17507d' },
  'w': { type: 'shallow_water', walkable: true, color: '#399bcf' },
  'K': { type: 'kelp', walkable: false, color: '#164a2b' },
  '_': { type: 'cloudbridge', walkable: true, color: '#e0f0f5' },
  '^': { type: 'windstream', walkable: true, color: '#a8d8eb' },
  'P': { type: 'floor', walkable: true,  color: '#e0b84f' }, // portal pad (walkable)
  'B': { type: 'floor', walkable: true,  color: '#a63d45' }, // boss floor marker (walkable)
  'V': { type: 'floor', walkable: true,  color: '#3a1a5c' }, // raid boss floor marker (walkable)
  'S': { type: 'snow',  walkable: true,  color: '#e9f0ee' },
  'I': { type: 'ice',   walkable: true,  color: '#80c8d8' },
  'D': { type: 'sand',  walkable: true,  color: '#b9855d' },
  'L': { type: 'lava',  walkable: false, color: '#e4492c' },
  'M': { type: 'rock',  walkable: false, color: '#554d50' },
  'X': { type: 'void',     walkable: true,  color: '#111b35' }, // astral void floor
  'O': { type: 'voidrock', walkable: false, color: '#45456f' }, // void crystal (blocks)
  // Half-timber town, abbey, and fortress vocabulary.
  'c': { type: 'cobble',   walkable: true,  color: '#8b8b82' }, // cobblestone street
  'p': { type: 'plaza',    walkable: true,  color: '#c3ad7b' }, // paved plaza
  'r': { type: 'roof',     walkable: false, color: '#a64738' }, // timber-roof shingle
  'h': { type: 'hwall',    walkable: false, color: '#c28e58' }, // half-timber facade
  'd': { type: 'door',     walkable: false, color: '#4a2c24' }, // house door (NPCs stand in front)
  'i': { type: 'window',   walkable: false, color: '#e6a84d' }, // lit window
  'f': { type: 'fence',    walkable: false, color: '#765338' }, // wooden fence
  'g': { type: 'hedge',    walkable: false, color: '#397044' }, // hedge
  'o': { type: 'flowers',  walkable: true,  color: '#6f9b45' }, // flowerbed
  'u': { type: 'fountain', walkable: false, color: '#3f9bb1' }, // fountain / shrine basin
  'A': { type: 'townwall', walkable: false, color: '#9d998d' }, // dressed stone rampart
  'G': { type: 'gate',     walkable: true,  color: '#a58459' }, // town gate (walkable)
  'l': { type: 'lamp',     walkable: false, color: '#c88b3b' }, // lamp post
  's': { type: 'stall',    walkable: false, color: '#d46a47' }, // market stall
  'b': { type: 'bridge',   walkable: true,  color: '#7e5b3d' }, // wooden bridge
};

// Standardized 50x38 4-Quadrant Overworld generator
export function createOverworldTiles({
  border = 'T',
  ground = '.',
  accent = ',',
  road = 'R',
  bossPos = { x: 36, y: 18 },
  portals = [],
  water = [],
  walkableTiles = [],
  scatterSeed = 0,
} = {}) {
  const W = 50, H = 38;
  const grid = Array.from({ length: H }, () => Array(W).fill(ground));

  // 1. Perimeter barrier
  for (let x = 0; x < W; x++) {
    grid[0][x] = border;
    grid[H - 1][x] = border;
  }
  for (let y = 0; y < H; y++) {
    grid[y][0] = border;
    grid[y][W - 1] = border;
  }

  // 2. Thematic accent scatter in open clearings
  if (scatterSeed > 0) {
    for (let y = 5; y <= 32; y++) {
      for (let x = 5; x <= 44; x++) {
        // preserve travel arteries
        if (x <= 4 || x >= 45 || (y >= 15 && y <= 18) || (x >= 37 && x <= 40)) continue;
        // preserve 14x14 Colosseum
        if (x >= 29 && x <= 44 && y >= 11 && y <= 26) continue;
        // preserve Incursion clearing
        if (x >= 6 && x <= 17 && y >= 22 && y <= 33) continue;
        const hash = ((x * 73856093) ^ (y * 19349663) ^ scatterSeed) >>> 0;
        if (hash % 17 === 0) grid[y][x] = accent;
      }
    }
  }

  // 3. Continuous 2-tile wide King's Road
  for (let y = 2; y <= 35; y++) {
    grid[y][2] = road;
    grid[y][3] = road;
    grid[y][46] = road;
    grid[y][47] = road;
  }
  for (let x = 2; x <= 47; x++) {
    grid[16][x] = road;
    grid[17][x] = road;
  }
  for (let y = 18; y <= 31; y++) {
    grid[y][38] = road;
    grid[y][39] = road;
  }

  // 4. Incursion ritual clearing: 10x10 open space in SW
  for (let y = 22; y <= 33; y++) {
    for (let x = 6; x <= 17; x++) {
      grid[y][x] = ground;
    }
  }

  // 5. 14x14 Guardian Colosseum Arena around bossPos (x: 30..43, y: 12..25)
  for (let y = 12; y <= 25; y++) {
    for (let x = 30; x <= 43; x++) {
      grid[y][x] = ground;
    }
  }
  grid[bossPos.y][bossPos.x] = 'B';

  // 6. Water bodies
  for (const [wx, wy] of water) {
    if (wx >= 0 && wx < W && wy >= 0 && wy < H) {
      grid[wy][wx] = 'W';
    }
  }

  // 7. Explicit walkable tiles (shorelines, gathering nodes, landing pads, NPCs)
  for (const [x, y] of walkableTiles) {
    if (x >= 0 && x < W && y >= 0 && y < H) {
      grid[y][x] = ground;
    }
  }

  // 8. Portal pads 'P'
  for (const p of portals) {
    if (p.x >= 0 && p.x < W && p.y >= 0 && p.y < H) {
      grid[p.y][p.x] = 'P';
    }
  }

  return grid.map(r => r.join(''));
}

const woodsTiles = createOverworldTiles({
  border: 'T', ground: '.', accent: ',', road: 'R',
  bossPos: { x: 36, y: 18 },
  portals: [
    { x: 1, y: 13 }, { x: 48, y: 4 }, { x: 48, y: 33 }, { x: 38, y: 29 }, { x: 38, y: 28 }
  ],
  water: [[22, 8]],
  walkableTiles: [
    [2, 13], [4, 3], [14, 12], [28, 22], [30, 18], [18, 24],
    [21, 8], [23, 8], [22, 7], [22, 9], // shore around (22, 8)
    [47, 4], [47, 33], [38, 30], [38, 27]
  ],
  scatterSeed: 211,
});

const ruinsTiles = createOverworldTiles({
  border: '#', ground: 'F', accent: 'w', road: 'R',
  bossPos: { x: 36, y: 18 },
  portals: [
    { x: 1, y: 33 }, { x: 48, y: 4 }, { x: 48, y: 33 }, { x: 26, y: 3 }
  ],
  water: [[5, 19]],
  walkableTiles: [
    [2, 33], [4, 3], [8, 14], [24, 12],
    [4, 19], [6, 19], [5, 18], [5, 20], // shore around (5, 19)
    [47, 4], [47, 33], [26, 4]
  ],
  scatterSeed: 307,
});

const steppesTiles = createOverworldTiles({
  border: 'M', ground: 'D', accent: '.', road: 'R',
  bossPos: { x: 36, y: 18 },
  portals: [
    { x: 1, y: 4 }, { x: 48, y: 4 }, { x: 48, y: 33 }, { x: 38, y: 28 }
  ],
  water: [[20, 10]],
  walkableTiles: [
    [2, 4], [47, 4], [47, 33], [38, 29],
    [19, 10], [21, 10], [20, 9], [20, 11]
  ],
  scatterSeed: 353,
});

const tundraTiles = createOverworldTiles({
  border: 'M', ground: 'S', accent: 'I', road: 'R',
  bossPos: { x: 36, y: 18 },
  portals: [
    { x: 1, y: 33 }, { x: 48, y: 4 }, { x: 48, y: 33 }, { x: 38, y: 26 }
  ],
  water: [[21, 7]],
  walkableTiles: [
    [2, 33], [42, 31], [12, 14], [32, 16],
    [20, 7], [22, 7], [21, 6], [21, 8], // shore around (21, 7)
    [47, 4], [47, 33], [38, 27]
  ],
  scatterSeed: 401,
});

const mireTiles = createOverworldTiles({
  border: 'T', ground: '.', accent: ',', road: 'R',
  bossPos: { x: 36, y: 18 },
  portals: [
    { x: 1, y: 4 }, { x: 1, y: 33 }, { x: 48, y: 4 }, { x: 48, y: 33 }, { x: 38, y: 28 }
  ],
  water: [[22, 12]],
  walkableTiles: [
    [2, 4], [2, 33], [47, 4], [47, 33], [38, 29],
    [21, 12], [23, 12], [22, 11], [22, 13]
  ],
  scatterSeed: 449,
});

const calderaTiles = createOverworldTiles({
  border: 'M', ground: 'D', accent: 'F', road: 'R',
  bossPos: { x: 36, y: 18 },
  portals: [
    { x: 1, y: 4 }, { x: 1, y: 33 }, { x: 48, y: 4 }, { x: 48, y: 33 }, { x: 38, y: 30 }
  ],
  water: [[22, 10]],
  walkableTiles: [
    [2, 4], [2, 33], [44, 33], [16, 14], [28, 18],
    [21, 10], [23, 10], [22, 9], [22, 11], // shore around (22, 10)
    [47, 4], [47, 33], [38, 29]
  ],
  scatterSeed: 503,
});

const spiresTiles = createOverworldTiles({
  border: 'M', ground: 'F', accent: '.', road: 'R',
  bossPos: { x: 36, y: 18 },
  portals: [
    { x: 1, y: 33 }, { x: 1, y: 4 }, { x: 48, y: 18 }, { x: 38, y: 28 }
  ],
  water: [[20, 10]],
  walkableTiles: [
    [2, 33], [2, 4], [47, 18], [38, 29],
    [19, 10], [21, 10], [20, 9], [20, 11]
  ],
  scatterSeed: 557,
});

const chasmTiles = createOverworldTiles({
  border: '#', ground: 'F', accent: 'X', road: 'R',
  bossPos: { x: 36, y: 18 },
  portals: [
    { x: 1, y: 4 }, { x: 1, y: 33 }, { x: 48, y: 18 }, { x: 48, y: 33 }, { x: 38, y: 28 }
  ],
  water: [[24, 12]],
  walkableTiles: [
    [2, 4], [2, 33], [47, 18], [47, 33], [38, 29],
    [23, 12], [25, 12], [24, 11], [24, 13]
  ],
  scatterSeed: 587,
});

const astralTiles = (() => {
  const rows = createOverworldTiles({
    border: 'O', ground: 'X', accent: 'I', road: 'R',
    bossPos: { x: 36, y: 18 },
    portals: [
      { x: 1, y: 4 }, { x: 1, y: 18 }, { x: 1, y: 33 }, { x: 48, y: 18 }, { x: 5, y: 1 }, { x: 3, y: 1 }
    ],
    water: [[26, 14], [34, 22]],
    walkableTiles: [
      [2, 4], [2, 18], [2, 33], [44, 33], [12, 10],
      [25, 14], [27, 14], [26, 13], [26, 15], // shore around (26, 14)
      [33, 22], [35, 22], [34, 21], [34, 23], // shore around (34, 22)
      [47, 18], [5, 2], [4, 1]
    ],
    scatterSeed: 601,
  });
  // Stamp world boss 'V' at (45, 15)
  const grid = rows.map(r => r.split(''));
  grid[15][45] = 'V';
  return grid.map(r => r.join(''));
})();

export const MAPS = {
  town_awakening: {
    id: 'town_awakening',
    name: 'Town of Awakening',
    ambient: 'Warm bells and unfamiliar stars — you are not home.',
    chronicle: {
      province: 'Crownlands of Aster',
      epithet: 'The Bell-Town Beyond the Veil',
      landmark: 'Moonwell Market',
      lore: 'Raised around an older summoning well, this walled river town shelters outworlders before the crown decides whether they are hero, omen, or weapon.',
    },
    width: 34, height: 28,
    legend: LEGEND,
    tiles: [
      'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      'A.............,................,.A',
      'A..........,................,....A',
      'A.....T.,................,....T..A',
      'A.WWW,................,rrrrrrr...A',
      'A.WWW..............,...rrrrrrr...A',
      'A.WWW..rrrrr....,.l....rrrrrrr...A',
      'A.WWW..rrrrr.,.........rrrrrrr,..A',
      'A.WWW..rrrrrlppppppplpchidiihhcccA',
      'A.WWW..hidihpppppppppccccccccccccA',
      'A.WWW....c.ppppuuppppccscscscccccA',
      'A,WWW....c.pppppppppppcccccccccccA',
      'A.WWW....c.pppppppppppcccccccccccA',
      'A.WWW....c.plpppccpplpcccccccccccA',
      'A.bbbcccccccccccccpppp....,......A',
      'A.WWWcccccccccccccc....,.........A',
      'A.WWW..........cccc.,...rrrrrrr..A',
      'A.WWW..........cccc.....rrrrrrr..A',
      'A.WWW.gggggg..,lccc.....rrrrrrr,.A',
      'A.WWW.foooof...cccc.....rrrrrrr..A',
      'A.WWW.foooof...cccc.....hidiihh..A',
      'A.WWW,foooof...cccccccccccccccc..A',
      'A.WWW.foooof...lccl,.............A',
      'A.WWW.ffofff...cccc..............A',
      'A.WWW.......T,.cccc...T.......,T.A',
      'A.....T...,....cccc........,.....A',
      'A......,.......cPcc.....,........A',
      'AAAAAAAAAAAAAAAAGGAAAAAAAAAAAAAAAA',
    ],
    spawns: [],
    npcs: [
      { id: 'elder',    name: 'Elder Maro', x: 26, y: 21, role: 'guild', title: 'Guild Master', color: '#e8c46a' },
      { id: 'merchant', name: 'Marla',      x: 25, y: 9,  role: 'shop',  title: 'Trader',       color: '#6ac1e8' },
      { id: 'oracle',   name: 'Lost Oracle',x: 14, y: 12, role: 'story', title: 'Oracle',       color: '#c98ae8' },
    ],
    portals: [
      { x: 16, y: 26, toMap: 'whispering_woods', toX: 2, toY: 13, label: 'To Whispering Woods' },
      { x: 27, y: 21, toMap: 'guild_stronghold', toX: 16, toY: 22, label: 'Enter Guild Stronghold' },
      { x: 14, y: 8, toMap: 'player_homestead', toX: 14, toY: 17, label: 'Enter Homestead' },
    ],
    playerStart: { x: 17, y: 24 },
  },

  whispering_woods: {
    id: 'whispering_woods',
    name: 'Whispering Woods',
    ambient: 'Leaves murmur secrets; small things rustle in the brush.',
    chronicle: {
      province: 'The Greenward',
      epithet: "The King's Road Gone Wild",
      landmark: "Saint Orra's Causeway",
      lore: 'The old pilgrimage road still cuts through the trees, but no royal patrol has kept it since the forest began remembering the names of everyone buried beneath it.',
    },
    width: 50, height: 38, band: [1, 15],
    legend: LEGEND,
    tiles: woodsTiles,
    playerStart: { x: 2, y: 13 },
    spawns: [
      { monsterId: 'slime', count: 18, depth: [0.00, 0.28], levelRange: [1, 5] },
      { monsterId: 'goblin', count: 14, depth: [0.20, 0.58], levelRange: [3, 8] },
      { monsterId: 'mossback_beetle', count: 6, depth: [0.35, 0.68], levelRange: [5, 8] },
      { monsterId: 'wolf', count: 10, depth: [0.48, 0.82], levelRange: [7, 11] },
      { monsterId: 'thornback_boar', count: 6, depth: [0.68, 0.96], levelRange: [10, 15] },
      { monsterId: 'elderwood_treant', count: 1 },
    ],
    npcs: [
      { id: 'ranger', name: 'Woodwatch Ilya', x: 4, y: 3, role: 'quest', title: 'Wood Warden', color: '#8fe86a' },
    ],
    portals: [
      { x: 1, y: 13, toMap: 'town_awakening', toX: 16, toY: 25, label: 'Back to Town' },
      { x: 48, y: 4, toMap: 'sunken_ruins', toX: 2, toY: 33, label: 'To Sunken Ruins' },
      { x: 48, y: 33, toMap: 'ashen_steppes', toX: 2, toY: 4, label: 'To Ashen Steppes' },
      { x: 38, y: 29, toMap: 'ww_goblin_cave', toX: 2, toY: 2, label: 'Enter Goblin Warrens' },
      { x: 38, y: 28, toMap: 'ww_elder_hollow', toX: 2, toY: 2, label: 'Enter Elderwood Hollow' },
    ],
  },

  sunken_ruins: {
    id: 'sunken_ruins',
    name: 'Sunken Ruins',
    ambient: 'Dripping dark and old stone — something huge stirs below.',
    chronicle: {
      province: 'The Drowned March',
      epithet: 'Abbey of the First Gate',
      landmark: 'The Flooded Nave',
      lore: 'Veil-scholars once judged summoned heroes here. When their king demanded an army from other worlds, the river swallowed the abbey and left its stone guardian awake.',
    },
    width: 50, height: 38, band: [12, 28],
    legend: LEGEND,
    tiles: ruinsTiles,
    playerStart: { x: 2, y: 33 },
    spawns: [
      { monsterId: 'mire_leech', count: 8, depth: [0.00, 0.35], levelRange: [16, 20] },
      { monsterId: 'shade', count: 16, depth: [0.18, 0.62], levelRange: [18, 24] },
      { monsterId: 'drowned_acolyte', count: 6, depth: [0.55, 0.92], levelRange: [24, 28] },
      { monsterId: 'ruin_crawler', count: 1, depth: [0.93, 0.98], levelRange: [20, 24] },
      { monsterId: 'ruin_golem', count: 1 },
    ],
    npcs: [
      { id: 'ghost_scholar', name: 'Bound Scholar', x: 4, y: 3, role: 'story', title: 'Ruins Archivist', color: '#9ad0e8' },
    ],
    portals: [
      { x: 1, y: 33, toMap: 'whispering_woods', toX: 47, toY: 4, label: 'Back to Woods' },
      { x: 48, y: 4, toMap: 'frostpeak_tundra', toX: 2, toY: 33, label: 'To Frostpeak Tundra' },
      { x: 48, y: 33, toMap: 'twilight_mire', toX: 2, toY: 4, label: 'To Twilight Mire' },
      { x: 26, y: 3, toMap: 'sr_drowned_catacombs', toX: 2, toY: 2, label: 'Enter Drowned Catacombs' },
    ],
  },

  ashen_steppes: {
    id: 'ashen_steppes',
    name: 'Ashen Steppes',
    ambient: 'Heat shimmers over cracked clay. Nomad watchtowers keep silent vigil.',
    chronicle: {
      province: 'The Sun-Scorched Savannah',
      epithet: 'Canyon of Petrified Sands',
      landmark: 'The Sunstone Outpost',
      lore: 'Sun-scorched plains and petrified canyons where nomad clans once forged pacts under the heatwave.',
    },
    width: 50, height: 38, band: [14, 28],
    legend: LEGEND,
    tiles: steppesTiles,
    playerStart: { x: 2, y: 4 },
    spawns: [
      { monsterId: 'sand_scorpion', count: 12, depth: [0.00, 0.40], levelRange: [14, 18] },
      { monsterId: 'hyena_marauder', count: 10, depth: [0.30, 0.75], levelRange: [18, 23] },
      { monsterId: 'canyon_basilisk', count: 6, depth: [0.65, 0.98], levelRange: [22, 26] },
      { monsterId: 'karrion_goliath', count: 1 },
    ],
    npcs: [],
    portals: [
      { x: 1, y: 4, toMap: 'whispering_woods', toX: 47, toY: 33, label: 'Back to Woods' },
      { x: 48, y: 4, toMap: 'twilight_mire', toX: 2, toY: 33, label: 'To Twilight Mire' },
      { x: 48, y: 33, toMap: 'dragon_caldera', toX: 2, toY: 4, label: 'To Dragon Caldera' },
      { x: 38, y: 28, toMap: 'as_sandstone_necropolis', toX: 2, toY: 2, label: 'Enter Sandstone Necropolis' },
    ],
  },

  frostpeak_tundra: {
    id: 'frostpeak_tundra',
    name: 'Frostpeak Tundra',
    ambient: 'Wind screams across the white silence; something hunts here.',
    chronicle: {
      province: 'The Northreach',
      epithet: 'The Crownless White',
      landmark: 'Revenant Pass',
      lore: 'Border cairns mark a duchy erased from every warm-country map. Its last watch still walks the pass, bound by an oath to a crown that vanished generations ago.',
    },
    width: 50, height: 38, band: [24, 45],
    legend: LEGEND,
    tiles: tundraTiles,
    playerStart: { x: 2, y: 33 },
    spawns: [
      { monsterId: 'frost_wolf', count: 16, depth: [0.00, 0.40], levelRange: [31, 35] },
      { monsterId: 'ice_wraith', count: 12, depth: [0.30, 0.72], levelRange: [35, 40] },
      { monsterId: 'rime_harpy', count: 7, depth: [0.62, 0.94], levelRange: [40, 44] },
      { monsterId: 'tundra_lurker', count: 1, depth: [0.95, 0.99], levelRange: [38, 41] },
      { monsterId: 'frost_revenant', count: 1 },
    ],
    npcs: [
      { id: 'hakon', name: 'Hakon of the Last Watch', x: 42, y: 31, role: 'story', title: 'Exiled Watchman', color: '#bfe6ff' },
    ],
    portals: [
      { x: 1, y: 33, toMap: 'sunken_ruins', toX: 47, toY: 4, label: 'Back to Ruins' },
      { x: 48, y: 4, toMap: 'tempest_spires', toX: 2, toY: 33, label: 'To Tempest Spires' },
      { x: 48, y: 33, toMap: 'dragon_caldera', toX: 2, toY: 33, label: 'Thermal Tunnel to Caldera' },
      { x: 38, y: 26, toMap: 'ft_glacial_chasm', toX: 2, toY: 2, label: 'Enter Glacial Chasm' },
    ],
  },

  twilight_mire: {
    id: 'twilight_mire',
    name: 'Twilight Mire',
    ambient: 'Bioluminescent mushrooms glow in murky fog. Water ripples with unseen teeth.',
    chronicle: {
      province: 'The Bioluminescent Bayou',
      epithet: 'The Sunken Boardwalks',
      landmark: 'The Sporeheart Hollow',
      lore: 'A bioluminescent swamp steeped in toxic mists and ancient roots, glowing with ethereal spores.',
    },
    width: 50, height: 38, band: [25, 40],
    legend: LEGEND,
    tiles: mireTiles,
    playerStart: { x: 2, y: 4 },
    spawns: [
      { monsterId: 'spore_creeper', count: 12, depth: [0.00, 0.40], levelRange: [25, 30] },
      { monsterId: 'bog_witch', count: 10, depth: [0.30, 0.75], levelRange: [30, 35] },
      { monsterId: 'marsh_hydra', count: 6, depth: [0.65, 0.98], levelRange: [34, 38] },
      { monsterId: 'bog_behemoth', count: 1 },
    ],
    npcs: [],
    portals: [
      { x: 1, y: 4, toMap: 'sunken_ruins', toX: 47, toY: 33, label: 'Back to Sunken Ruins' },
      { x: 1, y: 33, toMap: 'ashen_steppes', toX: 47, toY: 4, label: 'Back to Ashen Steppes' },
      { x: 48, y: 4, toMap: 'tempest_spires', toX: 2, toY: 4, label: 'To Tempest Spires' },
      { x: 48, y: 33, toMap: 'sunless_chasm', toX: 2, toY: 4, label: 'To Sunless Chasm' },
      { x: 38, y: 28, toMap: 'tm_sporeheart_hollow', toX: 2, toY: 2, label: 'Enter Sporeheart Hollow' },
    ],
  },

  dragon_caldera: {
    id: 'dragon_caldera',
    name: 'Dragon Caldera',
    ambient: 'The air shimmers with heat. Far below, something vast stirs.',
    chronicle: {
      province: 'The Ashen Crown',
      epithet: 'Forge of the Wyrm-Kings',
      landmark: 'The Cinder Throne',
      lore: 'Forge-lords built their fortress around dragonfire and paid tribute in steel. Their furnaces remain hot, though only imps and the old tyrant remember their names.',
    },
    width: 50, height: 38, band: [36, 60],
    legend: LEGEND,
    tiles: calderaTiles,
    playerStart: { x: 2, y: 4 },
    spawns: [
      { monsterId: 'ember_imp', count: 14, depth: [0.00, 0.40], levelRange: [46, 51] },
      { monsterId: 'sand_stalker', count: 12, depth: [0.32, 0.73], levelRange: [51, 56] },
      { monsterId: 'magma_beetle', count: 7, depth: [0.64, 0.95], levelRange: [55, 59] },
      { monsterId: 'ashwing', count: 1, depth: [0.96, 0.99], levelRange: [52, 55] },
      { monsterId: 'flame_dragon', count: 1 },
    ],
    npcs: [
      { id: 'ashsmith', name: 'Veya the Ashsmith', x: 44, y: 33, role: 'story', title: 'Last Forgekeeper', color: '#ffb06a' },
    ],
    portals: [
      { x: 1, y: 4, toMap: 'ashen_steppes', toX: 47, toY: 33, label: 'Back to Steppes' },
      { x: 1, y: 33, toMap: 'frostpeak_tundra', toX: 47, toY: 33, label: 'Thermal Tunnel to Tundra' },
      { x: 48, y: 4, toMap: 'sunless_chasm', toX: 2, toY: 33, label: 'To Sunless Chasm' },
      { x: 48, y: 33, toMap: 'astral_rift', toX: 2, toY: 4, label: 'To Astral Rift' },
      { x: 38, y: 30, toMap: 'dc_obsidian_foundry', toX: 2, toY: 2, label: 'Enter Obsidian Foundry' },
    ],
  },

  tempest_spires: {
    id: 'tempest_spires',
    name: 'Tempest Spires',
    ambient: 'Ozone electrifies the wind. Lightning arcs through thunderclouds below.',
    chronicle: {
      province: 'The Skyward Crags',
      epithet: 'Pinnacle of Ionized Tempests',
      landmark: 'The Lightning Needle',
      lore: 'High-altitude peaks where atmospheric lightning arcs between wind-carved stone towers.',
    },
    width: 50, height: 38, band: [48, 64],
    legend: LEGEND,
    tiles: spiresTiles,
    playerStart: { x: 2, y: 4 },
    spawns: [
      { monsterId: 'gale_harpy', count: 12, depth: [0.00, 0.40], levelRange: [48, 52] },
      { monsterId: 'lightning_wisp', count: 10, depth: [0.30, 0.75], levelRange: [52, 56] },
      { monsterId: 'skyward_valkyrie', count: 6, depth: [0.65, 0.98], levelRange: [56, 60] },
      { monsterId: 'storm_roc', count: 1 },
    ],
    npcs: [],
    portals: [
      { x: 1, y: 33, toMap: 'frostpeak_tundra', toX: 47, toY: 4, label: 'Back to Frostpeak Tundra' },
      { x: 1, y: 4, toMap: 'twilight_mire', toX: 47, toY: 4, label: 'Back to Twilight Mire' },
      { x: 48, y: 18, toMap: 'astral_rift', toX: 2, toY: 18, label: 'To Astral Rift' },
      { x: 38, y: 28, toMap: 'ts_thunderforge_peak', toX: 2, toY: 2, label: 'Enter Thunderforge Peak' },
    ],
  },

  sunless_chasm: {
    id: 'sunless_chasm',
    name: 'Sunless Chasm',
    ambient: 'Abyssal quiet echoes in the depths. Resonant crystals hum in the shadow.',
    chronicle: {
      province: 'The Deep Abyss',
      epithet: 'The Obsidian Trench',
      landmark: 'The Void Fissure',
      lore: 'Subterranean deep caverns illuminated by humming crystals, descending into the forgotten dark.',
    },
    width: 50, height: 38, band: [58, 74],
    legend: LEGEND,
    tiles: chasmTiles,
    playerStart: { x: 2, y: 4 },
    spawns: [
      { monsterId: 'cave_stalker', count: 12, depth: [0.00, 0.40], levelRange: [58, 62] },
      { monsterId: 'crystal_arachnid', count: 10, depth: [0.30, 0.75], levelRange: [62, 66] },
      { monsterId: 'void_cultist', count: 6, depth: [0.65, 0.98], levelRange: [66, 70] },
      { monsterId: 'shadowfiend_lord', count: 1 },
    ],
    npcs: [],
    portals: [
      { x: 1, y: 4, toMap: 'twilight_mire', toX: 47, toY: 33, label: 'Back to Twilight Mire' },
      { x: 1, y: 33, toMap: 'dragon_caldera', toX: 47, toY: 4, label: 'Back to Dragon Caldera' },
      { x: 48, y: 18, toMap: 'astral_rift', toX: 2, toY: 33, label: 'To Astral Rift' },
      { x: 48, y: 33, toMap: 'glitched_monolith', toX: 2, toY: 4, label: 'Glitch Conduit to Monolith' },
      { x: 38, y: 28, toMap: 'sc_abyssal_crypts', toX: 2, toY: 2, label: 'Enter Abyssal Crypts' },
    ],
  },

  astral_rift: {
    id: 'astral_rift',
    name: 'Astral Rift',
    ambient: 'Reality thins here; stars bleed through the cracks in the world.',
    chronicle: {
      province: 'The Starfall Scar',
      epithet: 'Where the Third Moon Should Be',
      landmark: 'The Unwritten Throne',
      lore: 'The first summoners tore this wound while reaching beyond one world too many. Every stolen destiny gathers here around a king whom history refuses to record.',
    },
    width: 50, height: 38, band: [61, 88],
    legend: LEGEND,
    tiles: astralTiles,
    playerStart: { x: 2, y: 4 },
    spawns: [
      { monsterId: 'void_wisp', count: 13, depth: [0.00, 0.32], levelRange: [61, 66] },
      { monsterId: 'star_reaver', count: 11, depth: [0.22, 0.52], levelRange: [66, 71] },
      { monsterId: 'astral_knight', count: 9, depth: [0.45, 0.72], levelRange: [71, 75] },
      { monsterId: 'void_construct', count: 2, depth: [0.45, 0.85], levelRange: [65, 75] },
      { monsterId: 'rift_manta', count: 7, depth: [0.65, 0.96], levelRange: [75, 79] },
      { monsterId: 'constellation_mite', count: 1, depth: [0.66, 0.74], levelRange: [69, 72] },
      { monsterId: 'nullking', count: 1 },
      { monsterId: 'voidmaw_sovereign', count: 1 },
    ],
    npcs: [
      { id: 'star_echo', name: 'Echo of Serin', x: 44, y: 33, role: 'story', title: 'Rift Cartographer', color: '#d7c2ff' },
    ],
    portals: [
      { x: 1, y: 4, toMap: 'dragon_caldera', toX: 47, toY: 33, label: 'Back to Caldera' },
      { x: 1, y: 18, toMap: 'tempest_spires', toX: 47, toY: 18, label: 'Back to Tempest Spires' },
      { x: 1, y: 33, toMap: 'sunless_chasm', toX: 47, toY: 18, label: 'Back to Sunless Chasm' },
      { x: 48, y: 18, toMap: 'glitched_monolith', toX: 2, toY: 18, label: 'To Glitched Monolith' },
      { x: 5, y: 1, toMap: 'ar_singularity_vault', toX: 2, toY: 2, label: 'Enter Singularity Vault' },
      { x: 3, y: 1, toMap: 'celestial_rift', toX: 2, toY: 2, label: 'Enter the Celestial Rift' },
    ],
  },

  ww_elder_hollow: {
    id: 'ww_elder_hollow',
    name: 'Elderwood Hollow',
    ambient: 'Blighted sap drips from ancient hollows. A mournful song resonates.',
    chronicle: {
      province: 'The Greenward',
      epithet: 'The Blighted Heart',
      landmark: 'The Sorrowful Grove',
      lore: 'The hollowed heart of an ancient sentinel, now consumed by void rot.',
    },
    width: 24, height: 18, band: [1, 14],
    legend: LEGEND,
    tiles: [
      'TTTTTTTTTTTTTTTTTTTTTTTT',
      'TP.....................T',
      'T..TTTT...TTTTTT...TT..T',
      'T..T........T.......T..T',
      'T..T..TTTT..T..TT...T..T',
      'T.....T..T.....T....T..T',
      'TTTTT.T..TTTTTTT.TTTTTTT',
      'T.....T..........T.....T',
      'T.TTTTT..TTTTTT..T.....T',
      'T........T....T........T',
      'T..TTTT..T....T..TTTT..T',
      'T..T.....T.......T..T..T',
      'T..T.TTTTT.TTTTT.T..T..T',
      'T....T.....T...T....T..T',
      'T...................T..T',
      'T....TTTTTTTTTTTTTTTT..T',
      'T...................B..T',
      'TTTTTTTTTTTTTTTTTTTTTTTT',
    ],
    spawns: [
      { monsterId: 'slime', count: 4, depth: [0.0, 0.35], levelRange: [1, 5] },
      { monsterId: 'blight_sprite', count: 6, depth: [0.35, 0.70], levelRange: [9, 12] },
      { monsterId: 'barkskin_warden', count: 5, depth: [0.70, 0.95], levelRange: [11, 14] },
      { monsterId: 'corrupted_dryad', count: 1 },
    ],
    npcs: [],
    portals: [
      { x: 1, y: 1, toMap: 'whispering_woods', toX: 38, toY: 27, label: 'Exit to Whispering Woods' },
    ],
  },

  celestial_rift: {
    id: 'celestial_rift',
    name: 'Celestial Rift',
    ambient: 'Crystalline platforms hang in impossible geometries, waiting for the next challenger.',
    chronicle: {
      province: 'The Shattered Plane',
      epithet: 'Arena of Ascendant Trials',
      landmark: 'The Resonance Chamber',
      lore: 'A pocket dimension carved by ancient mages, now corrupted by astral incursion. Heroes test themselves against trials that demand perfect discipline.',
    },
    width: 22, height: 16,
    legend: LEGEND,
    tiles: (() => {
      const W = 22, H = 16, rows = [];
      for (let y = 0; y < H; y++) rows.push(y === 0 || y === H - 1 ? 'O'.repeat(W) : 'O' + 'X'.repeat(W - 2) + 'O');
      rows[13] = rows[13].slice(0, 19) + 'P' + rows[13].slice(20);
      return rows;
    })(),
    riftPool: ['void_wisp', 'star_reaver', 'astral_knight'],
    spawns: [],
    npcs: [],
    portals: [
      { x: 19, y: 13, toMap: 'astral_rift', toX: 4, toY: 1, label: 'Back to Astral Rift' },
    ],
    playerStart: { x: 2, y: 2 },
  },

  abyssal_spire: {
    id: 'abyssal_spire',
    name: 'Abyssal Spire',
    ambient: 'An impossibly tall tower piercing dimensional space. Each floor echoes with ascendant trials.',
    chronicle: {
      province: 'The Shattered Plane',
      epithet: 'Tower of 100 Ascendant Trials',
      landmark: 'The Zenith Elevator',
      lore: 'Carved from primordial voidstone and starlight, the Abyssal Spire tests the greatest legends of Aetheria across 100 grueling floors.',
    },
    width: 24, height: 18,
    legend: LEGEND,
    tiles: (() => {
      const W = 24, H = 18, rows = [];
      for (let y = 0; y < H; y++) rows.push(y === 0 || y === H - 1 ? 'O'.repeat(W) : 'O' + 'X'.repeat(W - 2) + 'O');
      rows[15] = rows[15].slice(0, 21) + 'P' + rows[15].slice(22);
      return rows;
    })(),
    spawns: [],
    npcs: [],
    portals: [
      { x: 21, y: 15, toMap: 'town_awakening', toX: 14, toY: 13, label: 'Exit the Spire' },
    ],
    playerStart: { x: 2, y: 2 },
  },

  guild_stronghold: {
    id: 'guild_stronghold',
    name: 'Guild Stronghold',
    ambient: 'A resolute bastion carved from living granite, echoing with the triumphs of Aetheria\'s legendary guild.',
    chronicle: {
      province: 'The Greenward',
      epithet: 'Citadel of the Sovereign Vanguard',
      landmark: 'The Stronghold Crystal',
      lore: 'Sanctuary of the legendary guild, housing the Hall of Trophies and the ancient crystal core.',
    },
    width: 32, height: 24,
    legend: LEGEND,
    tiles: (() => {
      const W = 32, H = 24, rows = [];
      for (let y = 0; y < H; y++) {
        if (y === 23) rows.push('O'.repeat(16) + 'P' + 'O'.repeat(15));
        else if (y === 0 || y === H - 1) rows.push('O'.repeat(W));
        else rows.push('O' + '.'.repeat(W - 2) + 'O');
      }
      return rows;
    })(),
    spawns: [],
    npcs: [
      { id: 'guild_smith', name: 'Master Smith Borgan', x: 5, y: 10, role: 'craft', title: 'Guild Forge Master', color: '#ff9800' },
      { id: 'guild_banker', name: 'Treasurer Vane', x: 5, y: 14, role: 'banker', title: 'Guild Treasurer', color: '#ffd700' },
      { id: 'guild_tactician', name: 'Tactician Cedric', x: 27, y: 14, role: 'tactician', title: 'Master Tactician', color: '#4caf50' },
    ],
    portals: [
      { x: 16, y: 23, toMap: 'town_awakening', toX: 26, toY: 21, label: 'Back to Town' },
    ],
    playerStart: { x: 16, y: 22 },
  },

  player_homestead: {
    id: 'player_homestead',
    name: "Adventurer's Homestead",
    ambient: 'A tranquil personal haven with fragrant soil, crackling hearthfire, and roaming familiars.',
    chronicle: {
      province: 'Crownlands of Aster',
      epithet: 'The Sovereign Sanctuary',
      landmark: 'The Botanical Sanctum',
      lore: 'A secluded personal estate granted to seasoned adventurers, featuring rich fertile plots, a pasture paddock, and a warm hearth.',
    },
    width: 28, height: 20,
    legend: LEGEND,
    tiles: (() => {
      const W = 28, H = 20, rows = [];
      for (let y = 0; y < H; y++) {
        if (y === 0 || y === H - 1) rows.push('#'.repeat(W));
        else if (y === 18) rows.push('#' + '.'.repeat(13) + 'P' + '.'.repeat(12) + '#');
        else rows.push('#' + '.'.repeat(W - 2) + '#');
      }
      return rows;
    })(),
    spawns: [],
    npcs: [],
    portals: [
      { x: 14, y: 18, toMap: 'town_awakening', toX: 14, toY: 9, label: 'Exit to Town' },
    ],
    playerStart: { x: 14, y: 17 },
  },
};

for (const [id, dungeon] of Object.entries(REGIONAL_DUNGEONS)) {
  MAPS[id] = {
    ...dungeon,
    legend: LEGEND,
  };
}

for (const [id, dungeon] of Object.entries(GLITCHED_MONOLITH_MAPS)) {
  MAPS[id] = {
    ...dungeon,
    legend: LEGEND,
  };
}

// Keep every established landmark, portal, boss marker, and save coordinate in
// place, then grow town_awakening east and south into a distinct optional annex.
function expandRegion(map, spec) {
  const oldWidth = map.width, oldHeight = map.height;
  const width = oldWidth + spec.east, height = oldHeight + spec.south;
  const grid = Array.from({ length: height }, () => Array(width).fill(spec.ground));

  for (let row = 0; row < oldHeight; row++)
    for (let col = 0; col < oldWidth; col++) grid[row][col] = map.tiles[row][col];

  // Retire the old east/south boundary so the annex is part of the same region.
  for (let row = 1; row < oldHeight - 1; row++) grid[row][oldWidth - 1] = spec.ground;
  for (let col = 1; col < oldWidth - 1; col++) grid[oldHeight - 1][col] = spec.ground;

  for (let row = 1; row < height - 1; row++) for (let col = 1; col < width - 1; col++) {
    if (col < oldWidth - 1 && row < oldHeight - 1) continue;
    const hash = ((col * 73856093) ^ (row * 19349663) ^ spec.seed) >>> 0;
    grid[row][col] = hash % 23 === 0 ? spec.blocked : hash % 7 === 0 ? spec.accent : spec.ground;
  }

  for (const stamp of spec.stamps || []) for (let dy = 0; dy < stamp.rows.length; dy++) {
    for (let dx = 0; dx < stamp.rows[dy].length; dx++) {
      const ch = stamp.rows[dy][dx], col = stamp.x + dx, row = stamp.y + dy;
      if (ch !== ' ' && col > 0 && row > 0 && col < width - 1 && row < height - 1) grid[row][col] = ch;
    }
  }

  for (const path of spec.paths || []) {
    const steps = Math.max(Math.abs(path.to.x - path.from.x), Math.abs(path.to.y - path.from.y), 1);
    for (let i = 0; i <= steps; i++) {
      const col = Math.round(path.from.x + (path.to.x - path.from.x) * i / steps);
      const row = Math.round(path.from.y + (path.to.y - path.from.y) * i / steps);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++)
        if (col + dx > 0 && row + dy > 0 && col + dx < width - 1 && row + dy < height - 1) grid[row + dy][col + dx] = path.tile;
    }
  }

  for (const point of spec.safe || []) grid[point.y][point.x] = spec.ground;
  for (let col = 0; col < width; col++) grid[0][col] = grid[height - 1][col] = spec.border;
  for (let row = 0; row < height; row++) grid[row][0] = grid[row][width - 1] = spec.border;

  map.tiles = grid.map(row => row.join(''));
  map.width = width;
  map.height = height;
}

const REGION_EXPANSIONS = {
  town_awakening: {
    east: 6, south: 6, ground: '.', border: 'A', blocked: 'g', accent: 'o', seed: 101,
    stamps: [{ x: 3, y: 29, rows: ['ffffffffffff', 'foooooooooof', 'ffffffffffff'] }],
    paths: [{ from: { x: 16, y: 26 }, to: { x: 20, y: 31 }, tile: 'c' }],
    safe: [{ x: 20, y: 31 }],
  },
};

for (const [mapId, spec] of Object.entries(REGION_EXPANSIONS)) expandRegion(MAPS[mapId], spec);
