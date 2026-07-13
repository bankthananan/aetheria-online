// sprites.js — inline SVG art so players/NPCs/monsters are visually distinct.
// Rasterized to <img> via data-URI by the engine, then drawn on the canvas.
const S = (vb, body) => `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${vb} ${vb}'>${body}</svg>`;
const SHADOW = (cx, cy, rx) => `<ellipse cx='${cx}' cy='${cy}' rx='${rx}' ry='2.5' fill='rgba(0,0,0,.28)'/>`;

export const SPRITES = {
  // ---- player classes (humanoid, each with its signature weapon) ----
  player: {
    blade: S(32, SHADOW(16, 29, 8) +
      `<circle cx='16' cy='8' r='5' fill='#e8d9c0' stroke='#333' stroke-width='1'/>
       <rect x='11' y='12' width='10' height='12' rx='2' fill='#c9d1e0' stroke='#5b6470' stroke-width='1.3'/>
       <rect x='9' y='13' width='3' height='9' rx='1' fill='#aab4c4'/><rect x='20' y='13' width='3' height='9' rx='1' fill='#aab4c4'/>
       <rect x='22.5' y='3' width='2.4' height='19' rx='1' fill='#eef4ff' stroke='#8894a6' stroke-width='.7'/>
       <rect x='20.5' y='21' width='6.5' height='2.2' rx='1' fill='#8894a6'/>`),
    berserker: S(32, SHADOW(16, 29, 8) +
      `<circle cx='15' cy='8' r='5' fill='#e8c0a0' stroke='#333' stroke-width='1'/>
       <rect x='10' y='12' width='11' height='12' rx='2' fill='#e0714b' stroke='#8a3a20' stroke-width='1.3'/>
       <rect x='7' y='13' width='3' height='9' rx='1' fill='#c85a38'/><rect x='21' y='13' width='3' height='9' rx='1' fill='#c85a38'/>
       <rect x='24' y='3' width='2.4' height='18' fill='#8a5a3a'/>
       <path d='M22 3 Q29 4 27.5 11 L24 10 Q25.5 6 22 6Z' fill='#c8ced4' stroke='#7a8088' stroke-width='.8'/>`),
    mage: S(32, SHADOW(16, 29, 8) +
      `<path d='M16 1 22 11 10 11Z' fill='#6f7bef' stroke='#3a45a8' stroke-width='1'/>
       <circle cx='16' cy='13' r='4' fill='#e8d9c0'/>
       <path d='M10 26 12 16 Q16 14 20 16 L22 26Z' fill='#5561d8' stroke='#3a45a8' stroke-width='1.2'/>
       <rect x='23' y='5' width='2' height='21' fill='#8a6a3a'/>
       <circle cx='24' cy='5' r='3' fill='#7fe0ff' stroke='#3aa8c8' stroke-width='1'/>`),
    ranger: S(32, SHADOW(16, 29, 8) +
      `<path d='M11 9 Q16 4 21 9 L20 13 12 13Z' fill='#5fbf7a' stroke='#2f7a45' stroke-width='1'/>
       <circle cx='16' cy='12.5' r='3.4' fill='#e8d9c0'/>
       <rect x='11' y='15' width='10' height='10' rx='2' fill='#4f9e63' stroke='#2f7a45' stroke-width='1.2'/>
       <path d='M7 5 Q2.5 16 7 27' fill='none' stroke='#8a6a3a' stroke-width='2'/>
       <line x1='7' y1='5.5' x2='7' y2='26.5' stroke='#e8e8e8' stroke-width='.7'/>`),
  },

  // ---- NPCs by role (standing folk with a role prop) ----
  npc: {
    shop: S(32, SHADOW(16, 29, 8) +
      `<circle cx='16' cy='8' r='5' fill='#e8d9c0' stroke='#333' stroke-width='1'/>
       <rect x='10' y='12' width='12' height='13' rx='2' fill='#b98a4b' stroke='#7a5628' stroke-width='1.2'/>
       <rect x='13' y='14' width='6' height='10' fill='#8a6a3a'/>
       <circle cx='16' cy='19' r='3.2' fill='#e0b64c' stroke='#8a6a1a' stroke-width='1'/>
       <text x='16' y='21.2' font-size='5' text-anchor='middle' fill='#7a5010' font-family='sans-serif' font-weight='bold'>$</text>`),
    quest: S(32, SHADOW(16, 29, 8) +
      `<path d='M9 12 Q16 3 23 12 L21 14 11 14Z' fill='#3f9e6b' stroke='#256b45' stroke-width='1'/>
       <circle cx='16' cy='13' r='4' fill='#e8d9c0'/>
       <path d='M9 26 11 15 21 15 23 26Z' fill='#3f9e6b' stroke='#256b45' stroke-width='1.2'/>
       <rect x='23' y='5' width='2' height='21' fill='#8a6a3a'/>
       <circle cx='24' cy='5' r='2.6' fill='#e0b64c' stroke='#a5851a' stroke-width='.8'/>`),
    story: S(32, SHADOW(16, 29, 8) +
      `<circle cx='16' cy='9' r='5' fill='#e8d9c0' stroke='#333' stroke-width='1'/>
       <path d='M12 12 Q16 20 20 12Z' fill='#e0e0e0'/>
       <rect x='10' y='13' width='12' height='13' rx='2' fill='#9575cd' stroke='#5e3f9e' stroke-width='1.2'/>
       <rect x='12' y='19' width='8' height='6' rx='1' fill='#c98a3a' stroke='#7a5010' stroke-width='.8'/>
       <line x1='16' y1='19' x2='16' y2='25' stroke='#7a5010' stroke-width='.6'/>`),
  },

  // ---- monsters (each a recognizable creature silhouette) ----
  monster: {
    slime: S(32, SHADOW(16, 28, 11) +
      `<path d='M4 24 Q4 12 16 11 Q28 12 28 24 Q28 27 24 27 L8 27 Q4 27 4 24Z' fill='#4fc3f7' stroke='#1c7fb0' stroke-width='1.5'/>
       <ellipse cx='16' cy='15' rx='6' ry='2' fill='rgba(255,255,255,.4)'/>
       <circle cx='12' cy='20' r='2' fill='#123'/><circle cx='20' cy='20' r='2' fill='#123'/>`),
    goblin: S(32, SHADOW(16, 29, 9) +
      `<polygon points='7,13 2,9 9,12' fill='#6b9c3f'/><polygon points='25,13 30,9 23,12' fill='#6b9c3f'/>
       <circle cx='16' cy='13' r='8' fill='#8bc34a' stroke='#4f7a25' stroke-width='1.4'/>
       <rect x='11' y='20' width='10' height='8' rx='2' fill='#6b8e34' stroke='#4f7a25' stroke-width='1'/>
       <circle cx='13' cy='12' r='1.5' fill='#301'/><circle cx='19' cy='12' r='1.5' fill='#301'/>
       <path d='M12 16 Q16 19 20 16' stroke='#301' stroke-width='1.1' fill='none'/>`),
    wolf: S(32, SHADOW(16, 28, 12) +
      `<path d='M5 22 L5 16 L9 12 L13 12 L15 15 L22 15 L27 12 L27 19 L24 23 L8 23Z' fill='#9e9e9e' stroke='#5a5a5a' stroke-width='1.2'/>
       <polygon points='9,12 8,6 13,11' fill='#7d7d7d'/>
       <rect x='6' y='22' width='2.4' height='6' fill='#7d7d7d'/><rect x='21' y='22' width='2.4' height='6' fill='#7d7d7d'/>
       <circle cx='10' cy='16' r='1.4' fill='#f5d020'/>
       <path d='M5 16 L1 17 L5 18Z' fill='#7d7d7d'/>`),
    shade: S(32, `<ellipse cx='16' cy='27' rx='9' ry='2' fill='rgba(80,40,120,.25)'/>
       <path d='M8 26 Q6 9 16 8 Q26 9 24 26 L21 23 18 26 16 23 14 26 11 23Z' fill='#7e57c2' opacity='.9' stroke='#4a2f80' stroke-width='1'/>
       <ellipse cx='16' cy='6' rx='7' ry='3' fill='#9575cd' opacity='.5'/>
       <circle cx='12' cy='16' r='2' fill='#e6dcff'/><circle cx='20' cy='16' r='2' fill='#e6dcff'/>`),
    ruin_golem: S(48, `<ellipse cx='24' cy='45' rx='18' ry='4' fill='rgba(0,0,0,.32)'/>
       <rect x='4' y='16' width='8' height='19' rx='2' fill='#6d4c41' stroke='#4e342e' stroke-width='2'/>
       <rect x='36' y='16' width='8' height='19' rx='2' fill='#6d4c41' stroke='#4e342e' stroke-width='2'/>
       <rect x='12' y='14' width='24' height='22' rx='3' fill='#795548' stroke='#4e342e' stroke-width='2'/>
       <rect x='14' y='36' width='8' height='10' rx='1' fill='#5d4037' stroke='#4e342e' stroke-width='1.5'/>
       <rect x='26' y='36' width='8' height='10' rx='1' fill='#5d4037' stroke='#4e342e' stroke-width='1.5'/>
       <rect x='18' y='3' width='12' height='12' rx='2' fill='#8d6e63' stroke='#4e342e' stroke-width='2'/>
       <circle cx='22' cy='9' r='1.7' fill='#ff5b3d'/><circle cx='28' cy='9' r='1.7' fill='#ff5b3d'/>
       <path d='M14 24 L22 22 M28 28 L34 26 M20 30 L26 31' stroke='#4e342e' stroke-width='1' fill='none'/>`),
  },
};

// ---- 32×32 tile textures (keyed by legend `type`), drawn instead of flat squares ----
export const TILES = {
  grass: S(32, `<rect width='32' height='32' fill='#3f7d3a'/>
    <g stroke='#4e9245' stroke-width='1' stroke-linecap='round'>
      <path d='M5 26v-4M7 25v-5M9 27v-3'/><path d='M20 10v-4M22 9v-5M24 11v-3'/><path d='M14 20v-4M16 19v-5'/></g>
    <g stroke='#357033' stroke-width='1' stroke-linecap='round'><path d='M26 24v-3M28 26v-3M4 12v-3M13 30v-3'/></g>`),
  bush: S(32, `<rect width='32' height='32' fill='#3f7d3a'/>
    <circle cx='16' cy='21' r='8' fill='#356e2f'/><circle cx='10' cy='23' r='6' fill='#2f6329'/><circle cx='22' cy='23' r='6' fill='#356e2f'/>
    <circle cx='13' cy='18' r='2' fill='#5aa04a'/><circle cx='20' cy='19' r='1.6' fill='#5aa04a'/>`),
  road: S(32, `<rect width='32' height='32' fill='#b79b6b'/>
    <g fill='#a88d5c' stroke='#9c8250' stroke-width='.6'>
      <rect x='2' y='3' width='9' height='7' rx='2'/><rect x='13' y='2' width='8' height='7' rx='2'/><rect x='23' y='4' width='7' height='7' rx='2'/>
      <rect x='4' y='13' width='8' height='7' rx='2'/><rect x='15' y='12' width='9' height='8' rx='2'/><rect x='25' y='14' width='6' height='7' rx='2'/>
      <rect x='2' y='23' width='9' height='7' rx='2'/><rect x='14' y='23' width='9' height='7' rx='2'/><rect x='25' y='24' width='6' height='6' rx='2'/></g>`),
  floor: S(32, `<rect width='32' height='32' fill='#6b6f78'/>
    <g stroke='#565a62' stroke-width='1.2' fill='none'><path d='M0 11H32M0 22H32M11 0V11M22 11V22M11 22V32'/></g>
    <rect width='32' height='2' fill='#787c85' opacity='.6'/>`),
  wall: S(32, `<rect width='32' height='32' fill='#4a4a4a'/>
    <g stroke='#3a3a3a' stroke-width='1.5' fill='none'><path d='M0 11H32M0 22H32M8 0V11M20 0V11M2 11V22M14 11V22M26 11V22M8 22V32M20 22V32'/></g>
    <rect width='32' height='3' fill='#585858'/>`),
  water: S(32, `<rect width='32' height='32' fill='#2b6ca3'/>
    <g stroke='#4a90d9' stroke-width='1.4' fill='none' opacity='.7' stroke-linecap='round'>
      <path d='M2 8q4-3 8 0t8 0t8 0'/><path d='M2 18q4-3 8 0t8 0t8 0'/><path d='M2 28q4-3 8 0t8 0t8 0'/></g>`),
  tree: S(32, `<rect width='32' height='32' fill='#3f7d3a'/>
    <rect x='14' y='18' width='4' height='10' rx='1' fill='#6b4a2a'/>
    <circle cx='16' cy='13' r='10' fill='#1f4d22'/><circle cx='10' cy='16' r='6' fill='#256b2a'/><circle cx='22' cy='16' r='6' fill='#256b2a'/>
    <circle cx='13' cy='10' r='3' fill='#3a8a3f' opacity='.7'/><circle cx='19' cy='12' r='2' fill='#3a8a3f' opacity='.5'/>`),
};
