// js/zones/whispering-woods/dungeons/elder-hollow.js - Elderwood Hollow sub-dungeon module.

export const ELDER_HOLLOW = {
  id: 'ww_elder_hollow',
  name: 'Elderwood Hollow',
  width: 24,
  height: 18,
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
    { monsterId: 'blight_sprite', count: 6, depth: [0.0, 0.6], levelRange: [9, 12] },
    { monsterId: 'barkskin_warden', count: 4, depth: [0.4, 0.9], levelRange: [11, 14] },
  ],
  boss: {
    monsterId: 'corrupted_dryad',
    x: 20,
    y: 16
  }
};
