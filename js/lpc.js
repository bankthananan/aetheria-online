// lpc.js — Liberty Puppet Company (LPC) universal spritesheet metadata: cell
// geometry, per-state row/frame layout, and sheet paths. Pure data, no logic.
// player/npc maps are filled in as sheets are added (Tasks 2+); an id with no
// entry here just falls back to the existing pixel-matrix sprite in drawPlayer.
export const LPC = {
  cell: 64,          // each frame is a 64x64 square on the sheet
  cols: 13,          // sheet grid width (frames per row, walk uses 9 of them)
  states: {
    cast:   { row: 0,  frames: 7 },
    thrust: { row: 4,  frames: 8 },
    walk:   { row: 8,  frames: 9 },
    attack: { row: 12, frames: 6 },
    hurt:   { row: 20, frames: 6, downOnly: true },
  },
  dirs: ['up', 'left', 'down', 'right'],
  player: {},   // combatClass -> sheet path
  npc: {},      // npc role/id -> sheet path
};
