// lpc.js — Liberty Puppet Company (LPC) universal spritesheet metadata: cell
// geometry, per-state row/frame layout, and sheet paths. Pure data, no logic.
//
// The row table below was MEASURED from the sheets (alpha-scan every 64px row,
// count the left-packed non-empty frames) rather than copied from a spec — all
// 11 sheets in assets/lpc/ share this identical 54-row ULPC v3 core:
//
//   rows  0-3   spellcast   7 frames      rows 26-29  jump         5 frames
//   rows  4-7   thrust      8 frames      rows 30-33  sit          3 frames
//   rows  8-11  walk        9 frames      rows 34-37  emote        3 frames
//   rows 12-15  slash       6 frames      rows 38-41  run          8 frames
//   rows 16-19  shoot      13 frames      rows 42-45  combat idle  2 frames
//   row     20  hurt        6 frames      rows 46-49  backslash   13 frames
//   row     21  climb       6 frames      rows 50-53  halfslash    6 frames
//   rows 22-25  idle        2 frames
//
// Each 4-row block is one animation in `dirs` order (up/left/down/right); the
// two single-row blocks are down-facing only.
//
// ponytail: blade.png and monk.png carry 12 extra rows (54-65) holding the ULPC
// 128px OVERSIZE weapon block — a greatsword swing whose arc leaves the 64px
// cell. Rendering it needs a second cell size plus a draw offset, so the engine
// ignores it and both classes use their 64px slash. Wire it up only if the big
// weapons start looking clipped.
export const LPC = {
  cell: 64,          // each frame is a 64x64 square on the sheet
  cols: 13,          // core grid width (blade=18, monk=24 because of the oversize block)
  // `ms` is the duration of ONE full pass for one-shot states, and the per-frame
  // dwell time for looping states (walk/run/idle/combatIdle/sit/emote).
  states: {
    cast:       { row: 0,  frames: 7,  ms: 420 },
    thrust:     { row: 4,  frames: 8,  ms: 400 },
    walk:       { row: 8,  frames: 9,  ms: 90,  loop: true },
    attack:     { row: 12, frames: 6,  ms: 340 },   // "slash" in LPC terms
    shoot:      { row: 16, frames: 13, ms: 560 },
    hurt:       { row: 20, frames: 6,  ms: 200, downOnly: true },
    climb:      { row: 21, frames: 6,  ms: 600, downOnly: true },
    idle:       { row: 22, frames: 2,  ms: 900, loop: true },
    jump:       { row: 26, frames: 5,  ms: 300 },
    sit:        { row: 30, frames: 3,  ms: 600, loop: true },
    emote:      { row: 34, frames: 3,  ms: 600, loop: true },
    run:        { row: 38, frames: 8,  ms: 70,  loop: true },
    combatIdle: { row: 42, frames: 2,  ms: 700, loop: true },
    backslash:  { row: 46, frames: 13, ms: 520 },
    halfslash:  { row: 50, frames: 6,  ms: 260 },
  },
  dirs: ['up', 'left', 'down', 'right'],
  // Per-class animation identity. Before this table every class swung a sword on
  // basic attack — the archer sword-slashed and so did both mages. `finisher` is
  // the wind-up-heavy variant used for Momentum finishers, the payoff moment.
  anim: {
    blade:        { attack: 'attack',    finisher: 'backslash' },
    berserker:    { attack: 'attack',    finisher: 'backslash' },
    mage:         { attack: 'cast',      finisher: 'cast' },
    ranger:       { attack: 'shoot',     finisher: 'shoot' },
    paladin:      { attack: 'attack',    finisher: 'backslash' },
    monk:         { attack: 'halfslash', finisher: 'backslash' },
    elementalist: { attack: 'cast',      finisher: 'cast' },
  },
  player: {    // combatClass -> sheet path (see assets/lpc/CREDITS.md for seeds)
    blade: 'assets/lpc/blade.png',
    berserker: 'assets/lpc/berserker.png',
    mage: 'assets/lpc/mage.png',
    ranger: 'assets/lpc/ranger.png',
    paladin: 'assets/lpc/paladin.png',
    monk: 'assets/lpc/monk.png',
    elementalist: 'assets/lpc/elementalist.png',
  },
  npc: {        // npc role -> sheet path (see assets/lpc/CREDITS.md for seeds)
    shop: 'assets/lpc/npc_shop.png',
    quest: 'assets/lpc/npc_quest.png',
    guild: 'assets/lpc/npc_guild.png',
    story: 'assets/lpc/npc_story.png',
  },
};
