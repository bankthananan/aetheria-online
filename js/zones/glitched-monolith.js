// js/zones/glitched-monolith.js - Band 6 Endgame Zones: Glitched Monolith & Source Core.

const W1 = 44, H1 = 34;
const glitchedTiles = (() => {
  const rows = [];
  for (let y = 0; y < H1; y++) {
    if (y === 0 || y === H1 - 1) rows.push('O'.repeat(W1));
    else if (y === 1) rows.push('OP' + 'X'.repeat(W1 - 3) + 'O');
    else if (y === 30) rows.push('O' + 'X'.repeat(39) + 'P' + 'X'.repeat(W1 - 42) + 'O');
    else if (y === 28) rows.push('O' + 'X'.repeat(37) + 'B' + 'X'.repeat(W1 - 40) + 'O');
    else {
      let r = 'O';
      for (let x = 1; x < W1 - 1; x++) {
        if ((x % 8 === 0 || x % 8 === 1) && (y % 6 === 0 || y % 6 === 1) && (x < 36 || y < 26)) r += 'O';
        else if (x % 4 === 0 && y % 4 === 0) r += 'F';
        else r += 'X';
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
  playerStart: { x: 2, y: 2 },
  portals: [
    { x: 1, y: 1, toMap: 'astral_rift', toX: 38, toY: 28, label: 'Exit to Astral Rift' },
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
};

const W2 = 24, H2 = 18;
const sourceCoreTiles = (() => {
  const rows = [];
  for (let y = 0; y < H2; y++) {
    if (y === 0 || y === H2 - 1) rows.push('O'.repeat(W2));
    else if (y === 1) rows.push('OP' + 'X'.repeat(W2 - 3) + 'O');
    else if (y === 14) rows.push('O' + 'X'.repeat(19) + 'B' + 'X'.repeat(W2 - 22) + 'O');
    else {
      let r = 'O';
      for (let x = 1; x < W2 - 1; x++) {
        if ((x === 6 || x === 17) && (y >= 4 && y <= 12 && y !== 8)) r += 'O';
        else r += 'X';
      }
      r += 'O';
      rows.push(r);
    }
  }
  return rows;
})();

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
  width: W2,
  height: H2,
  band: [81, 100],
  tiles: sourceCoreTiles,
  playerStart: { x: 2, y: 2 },
  portals: [
    { x: 1, y: 1, toMap: 'glitched_monolith', toX: 38, toY: 30, label: 'Return to Glitched Monolith' },
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
    x: 20,
    y: 14,
  },
};

export const GLITCHED_MONOLITH_MAPS = {
  glitched_monolith,
  source_core_subdungeon,
};
