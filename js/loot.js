// loot.js — equipment rarity + random affixes. Higher rarity = stronger base
// stats (mult) AND more bonus effects (affix count).
export const RARITY = {
  common:    { name: 'Common',    color: '#c9c9c9', mult: 1.00, affixes: 0, weight: 58 },
  uncommon:  { name: 'Uncommon',  color: '#5fbf7a', mult: 1.12, affixes: 1, weight: 26 },
  rare:      { name: 'Rare',      color: '#4a90d9', mult: 1.28, affixes: 2, weight: 11 },
  epic:      { name: 'Epic',      color: '#b06be0', mult: 1.48, affixes: 3, weight: 4 },
  legendary: { name: 'Legendary', color: '#e6a23c', mult: 1.75, affixes: 4, weight: 1 },
};
export const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

// Rune sockets rolled at drop time, [min, max] per rarity — only rare-and-above
// equipment gets sockets at all.
export const SOCKET_BOUNDS = { common: [0, 0], uncommon: [0, 0], rare: [1, 1], epic: [1, 2], legendary: [2, 3] };

// Affix pool. `stat` is read by the engine in recompute()/combat. `roll` returns the value.
// {v} in label is replaced by the rolled value.
export const AFFIXES = [
  { stat: 'atkPct',    label: '+{v}% ATK',       min: 4,  max: 12 },
  { stat: 'critPct',   label: '+{v}% Crit',      min: 2,  max: 8 },
  { stat: 'hpFlat',    label: '+{v} Max HP',     min: 20, max: 70 },
  { stat: 'mpFlat',    label: '+{v} Max MP',     min: 10, max: 35 },
  { stat: 'defPct',    label: '+{v}% DEF',       min: 5,  max: 14 },
  { stat: 'lifesteal', label: '{v}% Lifesteal',  min: 2,  max: 6 },
  { stat: 'hitFlat',   label: '+{v} Hit',        min: 6,  max: 18 },
  { stat: 'fleeFlat',  label: '+{v} Flee',       min: 5,  max: 15 },
];
