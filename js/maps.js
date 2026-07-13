// js/maps.js - connected isekai regions. Tile art = string rows, decoded by legend.
// ponytail: string-rows over 2D arrays; content team parses rows[y][x] -> legend[char].

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
  'P': { type: 'floor', walkable: true,  color: '#e0b84f' }, // portal pad (walkable)
  'B': { type: 'floor', walkable: true,  color: '#a63d45' }, // boss floor marker (walkable)
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

// Hand-crafted regional layouts. Stone/cobble axes read as old pilgrimage roads and fortress
// courts; clustered blockers create SNES-era silhouettes without narrowing any travel lane.
// P pads + B guardian markers remain fixed to each map's portal and encounter wiring.
const tundraTiles = [
  'MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM',
  'MPcSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSM',
  'MSccSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSM',
  'MSSccSTSSSSSSSSSSSSSISSSSSSSSSSSSSSSSSSM',
  'MSSScTMMTSSSSSSSSIIIIIIISSSSSSSSSMSSSSSM',
  'MSSSTMMTMSSSSSSSIIIIIIIIISSSSSSSMMTSSSSM',
  'MSSSSMTMccSSSSSIIIIIIIIIIISSSSSMMTMMSSSM',
  'MSSSSSMScccSSSSIIIIIIIIIIIITSSSSTMMSSSSM',
  'MSSSSSSSSSccSSSIIIIIIIIIIIISSSSSSMSSSSSM',
  'MSSSSSSSSSScccIIIIIIIIIIIIISSSSSSSSSSSSM',
  'MSSSSSSSSSSSSccIIIIIIIIIIIISSSSSSSSSSSSM',
  'MSSSSSSSSSSSSScIIIIIIIIIIIISSSSSSSSSSSSM',
  'MSSSSSSSSSSSSSSIIIIIIIIIIIISSSSTSSSSSSSM',
  'MSSSSSSSSSSSSSSSIIIIIIIIISSSSSSSSSSTSSSM',
  'MSSSSTSSSSSSSSSSSIIIIIIISSSSSSSSSSTMMSSM',
  'MSSSSSSSSSSSSSSSSSScIcSSSSSSSSSSSTMMTMSM',
  'MSSSSSSSSSSSSSSSSSSSSccSSSSSSSSSSSMTMSSM',
  'MSSSSSSSSSSSTSSSSSSSSScccSSSSSSSSSSMSSSM',
  'MSSSSSSSSSSSSSSSSSSSSSSSccFFFFIFFSSSSSSM',
  'MSSSSSSSSSSSSSSSSSSSSSSSSccFFIIIFSSSSSSM',
  'MSSSSSSSSMSSSSSSSSSSSSSSSFBcIIIIISSSSSSM',
  'MSSSSSSSMTMSSSSSSSSSSSSSSFFFcIIIFSSSSSSM',
  'MSSSSSSMTMMTSSSSSSSSSSSSSFFFFcIcFSSSSSSM',
  'MSSSSSSSMMTSSSSSTSSSSSSSSFFFFMMTcSSSSSSM',
  'MSSSSSSSSTSSSSSTMMSSSSSSSSSSMMTMMcSSSSSM',
  'MSSSSSSSSSSSSSTMMTMSSSSSSSSSSTMMScccSSSM',
  'MSSSSSSSSSSSSSSMTMSSSSTSSSSSSSMSSSTccSSM',
  'MSSSSSSSSSSSSSSSMSSSSSSSSSSSSSSSSSSSccSM',
  'MSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSScPM',
  'MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM',
];
const calderaTiles = [
  'MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM',
  'MPcccccccDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDM',
  'McRRcccccDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDM',
  'MccRRccccDDDDDDMDDDDDDDDDDDDDDDDDDDDDDDDDM',
  'MccccRccLDDDDDMMMDDDDDDDDDDDDDDDDDDDDD#DDM',
  'McccccRLLLDDDMMMMMDDDDDDDDDDDDDDDDDDD###DM',
  'MDDDDDLLLLLDLDMMMDDDDDDDDDDDDDDDDLDD#####M',
  'MDDDDDDLLLDLLLDMDDDDDDDDDDDDDDDLLLLLD###DM',
  'MDDDDDDDLDLLLLLDDDDDDDDDDDDDDDDLLLLLDD#DDM',
  'MDDDDDDDDDDLLLDDLDDDDDDDDDDDDDLLLLLLLDDDDM',
  'MDDDDDDDDDDDLRRLLLDDDDDDDDDDDDDLLLLLDDDDDM',
  'MDDDDDDDDDDDDDLLLLLDDDDDDDDDDDDLLLLLDDDDDM',
  'MDDDDDMDDDDDDDDLLLDDDDDDDDDDDDDDDLDDDDDDDM',
  'MDDDDMMMDDDDDDDDLRRLDDDDDDDDDDDDDDDDDDDDDM',
  'MDDDMMMMMDDDDDDDDDLLLFFFFDDDDDDDDDDDDDDDDM',
  'MDDDDMMMDDDDDDDDDLLLLLFFFDDDDDDDDDDDDDDDDM',
  'MDDDDDMDDDDDDDDDDDLLLRRFFDDDDDDDDDDDMDDDDM',
  'MDDDDDDDDDDDDDDDDDFLFFLRFDDDDDDDDDDMMMDDDM',
  'MDDDDDDDDDDDDDDDDDFFFLLLRDDDDDDDDDMMMMMDDM',
  'MDDDDDDDDDDDDDDDDDFFLLLLLRRDDDDDDDD###DDDM',
  'MDDDDDDDDDDDDDDDDDFFFLLLccLRcccccccc#ccccM',
  'MDDDDDDDDDLDDDDDDDFFFFLcFLFRRFFFFFFFFFFFFM',
  'MDDDDDDDLLLLLDDDDDFFFFFcLLFFBRRFFFFFFFFFFM',
  'MDDDDDDDLLLLLDDDDDFFFFFcFLFFFFLRFFFFFFFFFM',
  'MDDDDDDLLLLLLLDDDDDDDDDcFFLFFLLLRFFFFFFFFM',
  'MDDDDDDDLLLLLDDDDDDDDDDcFFFFLLLLLRRFFFFFFM',
  'MDDDDDDDLLLLLDDDDDDDDDDc#FFFFLLLFFRRFFFFFM',
  'MDDDDDDDDMLDDDDDDDDDDDD###FFFFLFFFFFRFFFFM',
  'MDDDDDDDMMMDDDDDDDDDDD#####FFFFFFFFFFRRFFM',
  'MDDDDDDMMMMMDDDDDDDDDDD###FFFFFFFFFFFFRRFM',
  'MDDDDDDDMMMDDDDDDDDDDDDc#FFFFFFFFFFFFFFFPM',
  'MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM',
];
const astralTiles = [
  'OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO',
  'OPXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXO',
  'OXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXO',
  'OXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXO',
  'OXXXXXXXXXXXXXXXXFFFIIFFFXXXXXXXXXXXXXXXXO',
  'OXXXXXXXXXXXXXXXXFFFIIFFFXXXXXXXXXXXXXXXXO',
  'OXXXXXXXXXOXXXXXXFFpIIFFpXXXXXXXXXXXXXXXXO',
  'OXXXXXXXXOOOXXFFFFpFIIFpFFFFXXXXXXXXXXXXXO',
  'OXXXXXXXOOOOIXFFFpFFIIpFFFApXXXXXXXXXXXXXO',
  'OXXXXXXXXOOIIIFFpFFFIIFFFA#AXXXXXXXXXXXXXO',
  'OXXXXXXXXXOXIXFpFFFFIIFFA#AIOXXXXXXXXXXXXO',
  'OXXXXXXXXXXXXXpFFFFpIIFFpAIIIXXXXXXXXXXXXO',
  'OXXXXXXXXXXXXXFFFFpFIIFpFFAIXXXXXXXXXXXXXO',
  'OXXXXXXXXXXXXXFFFpFIIIIIFFFpXXXXXXXXXXXXXO',
  'OXXXXXXXFFFpFFFFpFIFIIFFIFpFFFFpFIOXXXXXXO',
  'OXXXXXXXFFpFFFFpFFIFIIFFIpFFFFpFIIIOXXXXXO',
  'OXXXXXXXIIIIIIIIIIIIIIIIIIIIIIIIAIOOOXXXXO',
  'OXXXXXXXIIIIIIIIIIIIIIIIIIIIIIIIIAOOXXXXXO',
  'OXXXXXXXFFFFpFAFFpIFIIpFIFFpFFFFpFOXXXXXXO',
  'OXXXXXXXFFFpFA#ApFFIIIIIFFpFFFFpFFXXXXXXXO',
  'OXXXXXXXXXXXOOOIOFFFIIFFFpFFFFpFFFFXXXXXXO',
  'OXXXXXXXXXXXXOIIIFFpIIFFpFFFFpFFFFpXXXXXXO',
  'OXXXXXXXOXXXXXOIXFpFIIFpFFFFpFFFFpFXXXXXXO',
  'OXXXXXXOOOXXXXXXXpFFIIpFFFFpFFFFpFFXXXXXXO',
  'OXXXXXOOOOOXXXXXXFFFAIFFFFpFFFBpFFFXXXXXXO',
  'OXXXXXXOOOXXXXXXXFFA#AFFFpFFFFpFFFFXXXXXXO',
  'OXXXXXXXOXXXXXXXXFA#A#AFpFFFFpFFFFpXXXXXXO',
  'OXXXXXXXXXXXXXXXXFpA#AFpFFFFpFFFFpFXXXXXXO',
  'OXXXXXXXXXXXXXXXXpFFAIpFFXXXXXXXXXXXXXXXXO',
  'OXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXO',
  'OXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXO',
  'OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO',
];

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
    // Half-timber river town: south gate and guild road feed a fountain market square;
    // a bridge, kitchen garden, merchant row, and guild hall form distinct readable quarters.
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
      { id: 'elder',    name: 'Elder Maro', x: 26, y: 21, role: 'guild', title: 'Guild Master', color: '#e8c46a' }, // guild hall door
      { id: 'merchant', name: 'Marla',      x: 25, y: 9,  role: 'shop',  title: 'Trader',       color: '#6ac1e8' }, // shop / market stalls
      { id: 'oracle',   name: 'Lost Oracle',x: 14, y: 12, role: 'story', title: 'Oracle',       color: '#c98ae8' }, // by the fountain
    ],
    portals: [
      { x: 16, y: 26, toMap: 'whispering_woods', toX: 2, toY: 13, label: 'To Whispering Woods' },
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
    width: 42, height: 34, band: [1, 15],
    legend: LEGEND,
    tiles: [
      'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
      'T.......,,,......,,.........,.,.,....,...T',
      'T......TTT,TTTT.,..WWWWW...,TTTTTTTTT....T',
      'T......TTTTTTT.TT,.WWWWW.,TTTTTTTTTT,,T,.T',
      'T......,TTTTTTTTTT,WWWWW,.TTTTTTTTTTTT.T,T',
      'T.....,TTTTT.TTTT.WWWWW...TTTTTTTTT,TT,T.T',
      'T....RTTTT,TTTTTTTWWWW.,.T.TTTTT,TTTT,,T,T',
      'T..,.RT,TTTTTTTTTTWWW,.,.TTTT,,T,,TT,TTT,T',
      'T...,RTTTTTTT.TTWTWW....,TT,TT,TTTT.TT.T.T',
      'T....R,TTT.T,TTTTWWWW...,,,.TTTTTTT.TTT,.T',
      'T....R..,.TTTTTTWWWWW.....,.TTTTTTT.,.,..T',
      'T.,..R.,.,,,,,.WWWWWWW......,..,.,,.,....T',
      'T..RRRRRRRR.....WWWWWWW,.........,.....,.T',
      'TP.RRRRRRRRRRR,,..WWWWW...........,TTTTT,T',
      'T.,RRRRRRRRRRRRRR..WWWWW......,...,TTTTT.T',
      'T........RRRRRRRRRRRbWWW.........,TTT.,TTT',
      'T...........RRRRRRRRRRRb......,...TT,TT,TT',
      'T..,...........RRRRRRRRR.......,.,.T,T,TTT',
      'T..........,....,WWbRRRRR,,...,..,TTTTTTTT',
      'T...,.,....,..,........,TRR,T...,.TTTTT,,T',
      'T..,,TTTTTTT,.......,..TTT,RRT,T,,TTTT.TTT',
      'T.,TTT,TT..TTT,..,....TTTTTTTRTTT.TTTTTTTT',
      'T.T,TTTTTTT.TTT...,...,TTTTT.TR.T,,.T.TT,T',
      'T.TTTT,TTTT.TTT..,,...TTTT.TTTTRT..TTT,T,T',
      'T.T,TTTTTTTTT.TTTT,TT.TTTTTTT,TTR...,.,,.T',
      'T,TTTT,TTTTTTTTT.,TTTTTTTTTTTTTTTR.,.....T',
      'T.TTTT,TTTT.TT,TTTT.T,,T.TT,TTTT,........T',
      'T,TTTTTTTTTTTTTTTTTT.T..TTTTTTT,,...B....T',
      'T.T.,TTTTTTTT,TT..TTTT,....,.....,,......T',
      'T..TTTTT.,TTTTT,T,TTTT.,.................T',
      'T..,,TT,TTT,,,TTTTTTT,..................,T',
      'T...,,.,,.,.,...,.....................P..T',
      'T.,..........,....................,.....,T',
      'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
    ],
    spawns: [
      { monsterId: 'slime',  count: 12, minLevelHint: 1 },
      { monsterId: 'goblin', count: 9, minLevelHint: 2 },
      { monsterId: 'wolf',   count: 8, minLevelHint: 3 },
      { monsterId: 'elderwood_treant', count: 1, minLevelHint: 7 },   // zone guardian
    ],
    npcs: [
      { id: 'ranger', name: 'Woodwatch Ilya', x: 4, y: 3, role: 'quest', title: 'Wood Warden', color: '#8fe86a' },
    ],
    portals: [
      { x: 1,  y: 13, toMap: 'town_awakening', toX: 16, toY: 24, label: 'Back to Town' },
      { x: 38, y: 31, toMap: 'sunken_ruins',   toX: 3,  toY: 3,  label: 'To Sunken Ruins' },
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
    // Flooded abbey: a broken nave and transept descend into cloisters reclaimed by moss.
    width: 30, height: 28, band: [16, 30],
    legend: LEGEND,
    tiles: [
      '##############################',
      '#FFFFFF####WWWW####FFFFFFFF..#',
      '#F....F####WWWW####F......F..#',
      '#pP...pppppp..ccccppp.....p..#',
      '#F,...F....F.,c....F....,.F..#',
      '#FFFF.F.,..F..c....F.FFFFFF..#',
      '#..#F.FFFF.F..c.ccFF.F#..,...#',
      '#..#F....F.F..c.c...,FF#.....#',
      '#..#pppp.ppp..ccc.pppp.#..,..#',
      '#..#.....W,.....W....,#......#',
      '#..A.FFF.W.Fccc.W.FFF.A....,.#',
      '#..A.F.F...F..c...F.F.A......#',
      '#..A.F,FFFFF..ccccF.F.A.....,#',
      '#,.A.F......,......F.#.,.....#',
      '#..A.FFFFFF.cc.cccFFF.A......#',
      '#.,A......F.cc.c......A.,....#',
      '#..A#####.F.cc.c.#####A......#',
      '#..,.....cc.cc,cc........,...#',
      '#..WWWW..F......F..WWWW......#',
      '#..WWWW..cccccccc..WWWW...,..#',
      '#........c,.....c....,.......#',
      '#..pppppcc.cccc.ccccccp....,.#',
      '#..F.......,.........c,......#',
      '#..F..FF.cccccccc,cc..F.....,#',
      '#,.F........,.....Bc..F,.....#',
      '#..FFFFFcccccccccccc..F......#',
      '#.,..........,........F.,....#',
      '##############################',
    ],
    spawns: [
      { monsterId: 'shade',      count: 14, minLevelHint: 16 },
      { monsterId: 'ruin_golem', count: 1, minLevelHint: 8 }, // mini-boss, marked 'B' at ~18,24
    ],
    npcs: [
      { id: 'ghost_scholar', name: 'Bound Scholar', x: 4, y: 3, role: 'story', title: 'Ruins Archivist', color: '#9ad0e8' },
    ],
    portals: [
      { x: 2, y: 3, toMap: 'whispering_woods', toX: 37, toY: 31, label: 'Back to Woods' },   // beside the pad, not on it (no bounce-back)
      { x: 20, y: 24, toMap: 'frostpeak_tundra', toX: 2, toY: 2, label: 'To Frostpeak Tundra' },
    ],
  },

  frostpeak_tundra: {
    id: 'frostpeak_tundra', name: 'Frostpeak Tundra',
    ambient: 'Wind screams across the white silence; something hunts here.',
    chronicle: {
      province: 'The Northreach',
      epithet: 'The Crownless White',
      landmark: 'Revenant Pass',
      lore: 'Border cairns mark a duchy erased from every warm-country map. Its last watch still walks the pass, bound by an oath to a crown that vanished generations ago.',
    },
    width: 40, height: 30, band: [31, 45], legend: LEGEND, tiles: tundraTiles,
    spawns: [
      { monsterId: 'frost_wolf', count: 14, minLevelHint: 10 },
      { monsterId: 'ice_wraith', count: 10, minLevelHint: 13 },
      { monsterId: 'frost_revenant', count: 1, minLevelHint: 15 },   // zone guardian
    ],
    npcs: [],
    portals: [
      { x: 1, y: 1, toMap: 'sunken_ruins', toX: 20, toY: 23, label: 'Back to Ruins' },
      { x: 38, y: 28, toMap: 'dragon_caldera', toX: 2, toY: 2, label: 'To Dragon Caldera' },
    ],
  },

  dragon_caldera: {
    id: 'dragon_caldera', name: 'Dragon Caldera',
    ambient: 'The air shimmers with heat. Far below, something vast stirs.',
    chronicle: {
      province: 'The Ashen Crown',
      epithet: 'Forge of the Wyrm-Kings',
      landmark: 'The Cinder Throne',
      lore: 'Forge-lords built their fortress around dragonfire and paid tribute in steel. Their furnaces remain hot, though only imps and the old tyrant remember their names.',
    },
    width: 42, height: 32, band: [46, 60], legend: LEGEND, tiles: calderaTiles,
    spawns: [
      { monsterId: 'ember_imp', count: 12, minLevelHint: 18 },
      { monsterId: 'sand_stalker', count: 10, minLevelHint: 16 },
      { monsterId: 'flame_dragon', count: 1, minLevelHint: 22 },
    ],
    npcs: [],
    portals: [
      { x: 1, y: 1, toMap: 'frostpeak_tundra', toX: 37, toY: 28, label: 'Back to Frostpeak' },
      { x: 40, y: 30, toMap: 'astral_rift', toX: 2, toY: 2, label: 'To the Astral Rift' },
    ],
  },

  astral_rift: {
    id: 'astral_rift', name: 'Astral Rift',
    ambient: 'Reality thins here; stars bleed through the cracks in the world.',
    chronicle: {
      province: 'The Starfall Scar',
      epithet: 'Where the Third Moon Should Be',
      landmark: 'The Unwritten Throne',
      lore: 'The first summoners tore this wound while reaching beyond one world too many. Every stolen destiny gathers here around a king whom history refuses to record.',
    },
    width: 42, height: 32, band: [61, 80], legend: LEGEND, tiles: astralTiles,
    spawns: [
      { monsterId: 'void_wisp', count: 11, minLevelHint: 25 },
      { monsterId: 'star_reaver', count: 9, minLevelHint: 28 },
      { monsterId: 'astral_knight', count: 7, minLevelHint: 32 },
      { monsterId: 'nullking', count: 1, minLevelHint: 38 },
    ],
    npcs: [],
    portals: [
      { x: 1, y: 1, toMap: 'dragon_caldera', toX: 39, toY: 30, label: 'Back to Caldera' },
    ],
  },
};
