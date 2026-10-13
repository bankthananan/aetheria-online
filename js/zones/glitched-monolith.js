// js/zones/glitched-monolith.js - Band 6 Endgame Zones: Glitched Monolith & Source Core.
import { source_core_subdungeon } from './regional-dungeons.js';

const W1 = 50, H1 = 38;
const glitchedTiles = (() => {
  const rows = [];
  for (let y = 0; y < H1; y++) {
    if (y === 0 || y === H1 - 1) {
      rows.push('O'.repeat(W1));
    } else {
      let r = 'O';
      for (let x = 1; x < W1 - 1; x++) {
        // Continuous 2-tile road 'R'
        if ((x === 2 || x === 3 || x === 46 || x === 47) && (y >= 2 && y <= 35)) {
          r += 'R';
        } else if ((y === 16 || y === 17) && (x >= 2 && x <= 47)) {
          r += 'R';
        } else if ((x === 40 || x === 41) && (y >= 18 && y <= 31)) {
          r += 'R';
        } else if (x === 1 && (y === 4 || y === 18)) {
          // Portal pads
          r += 'P';
        } else if (x === 40 && y === 30) {
          // Subdungeon portal pad
          r += 'P';
        } else if (x === 36 && y === 18) {
          // Boss marker
          r += 'B';
        } else if (x >= 30 && x <= 43 && y >= 12 && y <= 25) {
          // 14x14 Colosseum arena floor around B
          r += 'X';
        } else if (x === 20 && y === 10) {
          // Water tile for quantum glitchfish ripple
          r += 'W';
        } else if ((x % 8 === 0 || x % 8 === 1) && (y % 6 === 0 || y % 6 === 1) && (x < 28 && y < 14)) {
          r += 'O'; // gentle thematic pillars in NW corner only
        } else if (x % 5 === 0 && y % 5 === 0) {
          r += 'F';
        } else {
          r += 'X';
        }
      }
      r += 'O';
      rows.push(r);
    }
  }
  return rows;
})();

export const glitched_monolith = {
  id: 'glitched_monolith',
  name: 'Glitched Monolith',
  ambient: 'Corrupted glyphs shimmer along obsidian pillars. Reality flickers like a failing CRT.',
  chronicle: {
    province: 'The Uncompiled Boundary',
    epithet: 'Monolith of the Lost Runtime',
    landmark: 'The Fractured Terminal',
    lore: 'A colossal monolith standing at the edge of reality where uncompiled game code and raw memories bleed into physical architecture.',
  },
  width: W1,
  height: H1,
  band: [81, 100],
  tiles: glitchedTiles,
  playerStart: { x: 2, y: 18 },
  portals: [
    { x: 1, y: 18, toMap: 'astral_rift', toX: 47, toY: 18, label: 'Exit to Astral Rift' },
    { x: 1, y: 4, toMap: 'sunless_chasm', toX: 47, toY: 33, label: 'To Sunless Chasm' },
    { x: 40, y: 30, toMap: 'source_core_subdungeon', toX: 2, toY: 2, label: 'Enter Source Core' },
  ],
  spawns: [
    { monsterId: 'memory_phantom', count: 10, depth: [0.00, 0.35], levelRange: [81, 84] },
    { monsterId: 'debug_drone', count: 8, depth: [0.25, 0.60], levelRange: [83, 86] },
    { monsterId: 'overtime_wraith', count: 8, depth: [0.45, 0.80], levelRange: [84, 88] },
    { monsterId: 'compiler_golem', count: 8, depth: [0.65, 0.98], levelRange: [86, 90] },
    { monsterId: 'system_architect', count: 1 },
  ],
  npcs: [],
  boss: {
    monsterId: 'system_architect',
    x: 36,
    y: 18,
  },
};

export { source_core_subdungeon };

export const GLITCHED_MONOLITH_MAPS = {
  glitched_monolith,
  source_core_subdungeon,
};
