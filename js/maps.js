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
      { monsterId: 'slime',  count: 14, minLevelHint: 1 },
      { monsterId: 'goblin', count: 11, minLevelHint: 2 },
      { monsterId: 'wolf',   count: 10, minLevelHint: 3 },
      { monsterId: 'thornback_boar', count: 8, minLevelHint: 5 },
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
      { monsterId: 'shade',      count: 16, minLevelHint: 16 },
      { monsterId: 'mire_leech', count: 8, minLevelHint: 18 },
      { monsterId: 'drowned_acolyte', count: 7, minLevelHint: 20 },
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
      { monsterId: 'frost_wolf', count: 16, minLevelHint: 10 },
      { monsterId: 'ice_wraith', count: 12, minLevelHint: 13 },
      { monsterId: 'rime_harpy', count: 8, minLevelHint: 14 },
      { monsterId: 'frost_revenant', count: 1, minLevelHint: 15 },   // zone guardian
    ],
    npcs: [
      { id: 'hakon', name: 'Hakon of the Last Watch', x: 42, y: 31, role: 'story', title: 'Exiled Watchman', color: '#bfe6ff' },
    ],
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
      { monsterId: 'ember_imp', count: 14, minLevelHint: 18 },
      { monsterId: 'sand_stalker', count: 12, minLevelHint: 16 },
      { monsterId: 'magma_beetle', count: 8, minLevelHint: 20 },
      { monsterId: 'flame_dragon', count: 1, minLevelHint: 22 },
    ],
    npcs: [
      { id: 'ashsmith', name: 'Veya the Ashsmith', x: 44, y: 33, role: 'story', title: 'Last Forgekeeper', color: '#ffb06a' },
    ],
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
      { monsterId: 'void_wisp', count: 13, minLevelHint: 25 },
      { monsterId: 'star_reaver', count: 11, minLevelHint: 28 },
      { monsterId: 'astral_knight', count: 9, minLevelHint: 32 },
      { monsterId: 'rift_manta', count: 8, minLevelHint: 34 },
      { monsterId: 'nullking', count: 1, minLevelHint: 38 },
    ],
    npcs: [
      { id: 'star_echo', name: 'Echo of Serin', x: 44, y: 33, role: 'story', title: 'Rift Cartographer', color: '#d7c2ff' },
    ],
    portals: [
      { x: 1, y: 1, toMap: 'dragon_caldera', toX: 39, toY: 30, label: 'Back to Caldera' },
    ],
  },
};

// Keep every established landmark, portal, boss marker, and save coordinate in
// place, then grow each region east and south into a distinct optional annex.
// This preserves the heat-map difficulty curve while giving hunts more room.
function expandRegion(map, spec) {
  const oldWidth = map.width, oldHeight = map.height;
  const width = oldWidth + spec.east, height = oldHeight + spec.south;
  const grid = Array.from({ length: height }, () => Array(width).fill(spec.ground));

  for (let row = 0; row < oldHeight; row++)
    for (let col = 0; col < oldWidth; col++) grid[row][col] = map.tiles[row][col];

  // Retire the old east/south boundary so the annex is part of the same region.
  for (let row = 1; row < oldHeight - 1; row++) grid[row][oldWidth - 1] = spec.ground;
  for (let col = 1; col < oldWidth - 1; col++) grid[oldHeight - 1][col] = spec.ground;

  // Sparse deterministic clusters make each annex readable without creating
  // noisy mazes or depending on random generation at runtime.
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

  // Broad landmark roads keep the old map and new district visually linked.
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
  whispering_woods: {
    east: 8, south: 6, ground: '.', border: 'T', blocked: 'T', accent: ',', seed: 211,
    stamps: [{ x: 42, y: 5, rows: ['TTT,,T', 'T,,,,T', 'TT,,TT'] }, { x: 8, y: 35, rows: ['TTT,,,TT', 'T,,,,,,T', 'TT,,,,TT'] }],
    paths: [{ from: { x: 38, y: 31 }, to: { x: 46, y: 37 }, tile: 'R' }],
    safe: [{ x: 46, y: 37 }],
  },
  sunken_ruins: {
    east: 10, south: 6, ground: 'F', border: '#', blocked: '#', accent: ',', seed: 307,
    stamps: [{ x: 32, y: 8, rows: ['WWWWW', 'WFFFWW', 'WFFFWW', 'WWWWW'] }, { x: 5, y: 29, rows: ['##FFFFF##', '#FFcccFF#', '##FFFFF##'] }],
    paths: [{ from: { x: 20, y: 24 }, to: { x: 36, y: 30 }, tile: 'c' }],
    safe: [{ x: 36, y: 30 }],
  },
  frostpeak_tundra: {
    east: 8, south: 6, ground: 'S', border: 'M', blocked: 'M', accent: 'I', seed: 401,
    stamps: [{ x: 41, y: 8, rows: ['IIII', 'IIIII', 'IIIII', 'IIII'] }, { x: 10, y: 32, rows: ['MMSSSMM', 'MSSSSSM'] }],
    paths: [{ from: { x: 38, y: 28 }, to: { x: 42, y: 31 }, tile: 'c' }],
    safe: [{ x: 42, y: 31 }],
  },
  dragon_caldera: {
    east: 8, south: 6, ground: 'D', border: 'M', blocked: 'M', accent: 'F', seed: 503,
    stamps: [{ x: 43, y: 8, rows: ['LLLLL', 'LDDDL', 'LLDLL', 'LDDDL', 'LLLLL'] }, { x: 12, y: 34, rows: ['MDDDDDMM', 'MDFRFDMM'] }],
    paths: [{ from: { x: 40, y: 30 }, to: { x: 44, y: 33 }, tile: 'c' }],
    safe: [{ x: 44, y: 33 }],
  },
  astral_rift: {
    east: 8, south: 6, ground: 'X', border: 'O', blocked: 'O', accent: 'I', seed: 601,
    stamps: [{ x: 43, y: 7, rows: ['FFIIFF', 'FpIIpF', 'FFIIFF'] }, { x: 12, y: 34, rows: ['OOXXXOO', 'OXXIXXO'] }],
    paths: [{ from: { x: 38, y: 28 }, to: { x: 44, y: 33 }, tile: 'I' }],
    safe: [{ x: 44, y: 33 }],
  },
};

for (const [mapId, spec] of Object.entries(REGION_EXPANSIONS)) expandRegion(MAPS[mapId], spec);
