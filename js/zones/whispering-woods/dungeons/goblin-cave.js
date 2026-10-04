// js/zones/whispering-woods/dungeons/goblin-cave.js - Goblin Warrens sub-dungeon module.

export const GOBLIN_CAVE = {
  id: 'ww_goblin_cave',
  name: 'Goblin Warrens',
  width: 22,
  height: 16,
  tiles: [
    '######################',
    '#P...................#',
    '#..###...######...##.#',
    '#..#........#......#.#',
    '#..#..####..#..##..#.#',
    '#.....#..#.....#.....#',
    '#####.#..#######.#####',
    '#.....#..........#...#',
    '#.#####..######..#...#',
    '#........#....#......#',
    '#..####..#....#..###.#',
    '#..#.....#.......#...#',
    '#..#.#####.#####.#.B.#',
    '#....#.....#...#.....#',
    '#....................#',
    '######################',
  ],
  spawns: [
    { monsterId: 'goblin', count: 8, depth: [0.0, 0.6], levelRange: [5, 8] },
    { monsterId: 'goblin_scout', count: 5, depth: [0.3, 0.8], levelRange: [6, 9] },
  ],
  boss: {
    monsterId: 'goblin_chieftain',
    x: 19,
    y: 12
  }
};
