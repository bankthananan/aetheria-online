// js/systems/equipment-sets.js
// Regional Equipment Set System.
// Defines 8 regional gear sets across Bands 2–5 and provides
// threshold evaluation, cumulative bonus calculation, and tooltip rendering.
// Strict ZERO Screen Shake: Calculations modify stat properties only.

export const EQUIPMENT_SETS = {
  set_duneslayer: {
    id: 'set_duneslayer',
    name: 'Duneslayer Regalia',
    zone: 'ashen_steppes',
    band: 2,
    pieces: ['duneslayer_vest', 'shadow_leathers'],
    bonuses: {
      2: {
        name: 'Dune Agility',
        statMods: { flee: 15, critChance: 4 },
        desc: '+15 Flee, +4% Critical Chance',
      },
    },
  },
  set_sunwalker: {
    id: 'set_sunwalker',
    name: 'Sunwalker Armor',
    zone: 'ashen_steppes',
    band: 2,
    pieces: ['sunwalker_mail', 'tinkerer_smock', 'acolyte_robes'],
    bonuses: {
      2: {
        name: 'Solar Barrier',
        statMods: { physDef: 20, res_fire: 10 },
        desc: '+20 DEF, +10% Fire Resistance',
      },
    },
  },
  set_sporeweaver: {
    id: 'set_sporeweaver',
    name: 'Sporeweaver Vestments',
    zone: 'twilight_mire',
    band: 3,
    pieces: ['sporeweaver_robe', 'bone_woven_vestments'],
    bonuses: {
      2: {
        name: 'Fungal Resonance',
        statMods: { maxMp: 50, mpRegen: 4 },
        desc: '+50 Max MP, +4 MP/s Regen',
      },
    },
  },
  set_mire_stalker: {
    id: 'set_mire_stalker',
    name: 'Mire Stalker Leathers',
    zone: 'twilight_mire',
    band: 3,
    pieces: ['mire_stalker_tunic', 'nightstalker_tunic', 'engineer_overalls'],
    bonuses: {
      2: {
        name: 'Marsh Ambush',
        statMods: { physAtk: 16, critChance: 5 },
        desc: '+16 ATK, +5% Critical Chance',
      },
    },
  },
  set_thunderlord: {
    id: 'set_thunderlord',
    name: 'Thunderlord Mail',
    zone: 'tempest_spires',
    band: 4,
    pieces: ['thunderlord_chainmail', 'magitek_harness'],
    bonuses: {
      2: {
        name: 'Lightning Dynamo',
        statMods: { physAtk: 24, magicAtk: 20 },
        desc: '+24 ATK, +20 MATK',
      },
    },
  },
  set_gale_dancer: {
    id: 'set_gale_dancer',
    name: 'Gale Dancer Silks',
    zone: 'tempest_spires',
    band: 4,
    pieces: ['gale_dancer_silks', 'phantom_garb', 'lich_mantle'],
    bonuses: {
      2: {
        name: 'Tempest Grace',
        statMods: { flee: 25, moveSpeedPct: 5 },
        desc: '+25 Flee, +5% Movement Speed',
      },
    },
  },
  set_umbral_assassin: {
    id: 'set_umbral_assassin',
    name: 'Umbral Assassin Garb',
    zone: 'sunless_chasm',
    band: 5,
    pieces: ['umbral_assassin_garb', 'void_assassin_vestments'],
    bonuses: {
      2: {
        name: 'Void Execution',
        statMods: { physAtk: 32, critChance: 8 },
        desc: '+32 ATK, +8% Critical Chance',
      },
    },
  },
  set_darksteel_bulwark: {
    id: 'set_darksteel_bulwark',
    name: 'Darksteel Bulwark Plate',
    zone: 'sunless_chasm',
    band: 5,
    pieces: ['darksteel_bulwark', 'netherlord_regalia', 'mechlord_power_chassis'],
    bonuses: {
      2: {
        name: 'Abyssal Bastion',
        statMods: { physDef: 40, maxHp: 350, res_void: 15 },
        desc: '+40 DEF, +350 Max HP, +15% Void Resistance',
      },
    },
  },
};

// Reverse lookup index: itemId -> setDef
const ITEM_TO_SET_MAP = {};
for (const set of Object.values(EQUIPMENT_SETS)) {
  for (const pieceId of set.pieces) {
    ITEM_TO_SET_MAP[pieceId] = set;
  }
}

/**
 * Returns the set definition containing this itemId, if any.
 * @param {string} itemId
 * @returns {object|null}
 */
export function getEquipmentSetFor(itemId) {
  return ITEM_TO_SET_MAP[itemId] || null;
}

/**
 * Evaluates currently equipped gear and returns all active set bonuses and aggregated stats.
 * @param {object} equipment Map of slot -> gear instance
 * @returns {{ activeSets: Array<{ id: string, name: string, count: number, bonus: object }>, statMods: object }}
 */
export function getActiveSetBonuses(equipment = {}) {
  const counts = {};
  for (const inst of Object.values(equipment)) {
    if (!inst || !inst.itemId) continue;
    const set = getEquipmentSetFor(inst.itemId);
    if (!set) continue;
    counts[set.id] = (counts[set.id] || 0) + 1;
  }

  const activeSets = [];
  const statMods = {};

  for (const [setId, count] of Object.entries(counts)) {
    const set = EQUIPMENT_SETS[setId];
    if (!set) continue;

    for (const [thresholdStr, bonus] of Object.entries(set.bonuses)) {
      const threshold = parseInt(thresholdStr, 10);
      if (count >= threshold) {
        activeSets.push({
          id: set.id,
          name: set.name,
          count,
          threshold,
          bonus,
        });

        if (bonus.statMods) {
          for (const [stat, val] of Object.entries(bonus.statMods)) {
            statMods[stat] = (statMods[stat] || 0) + val;
          }
        }
      }
    }
  }

  return { activeSets, statMods };
}

/**
 * Formats a statMods record into human-readable stat lines.
 * @param {object} statMods
 * @returns {string}
 */
export function formatSetBonusText(statMods = {}) {
  const parts = [];
  for (const [k, v] of Object.entries(statMods)) {
    const sign = v > 0 ? '+' : '';
    const pct = k.includes('Pct') || k.includes('Chance') ? '%' : '';
    let name = k.replace('Pct', '').replace('Chance', ' Crit');
    if (k === 'physAtk') name = 'ATK';
    else if (k === 'magicAtk') name = 'MATK';
    else if (k === 'physDef') name = 'DEF';
    else if (k === 'maxHp') name = 'HP';
    else if (k === 'maxMp') name = 'MP';
    else if (k === 'flee') name = 'Flee';
    else if (k.startsWith('res_')) name = `${k.replace('res_', '')} RES`;
    parts.push(`${sign}${v}${pct} ${name}`);
  }
  return parts.join(', ');
}

/**
 * Renders the HTML preview block for item tooltips describing set membership and bonuses.
 * @param {string} itemId
 * @param {object} equipment
 * @param {Function} T
 * @returns {string}
 */
export function renderSetBonusTooltipHtml(itemId, equipment = {}, T = s => s) {
  const set = getEquipmentSetFor(itemId);
  if (!set) return '';

  const equippedCount = Object.values(equipment).filter(inst => inst && set.pieces.includes(inst.itemId)).length;
  const isSetComplete = equippedCount >= 2;

  let piecesHtml = set.pieces.map(pId => {
    const isWorn = Object.values(equipment).some(inst => inst?.itemId === pId);
    return `<span style="color:${isWorn ? '#4ade80' : 'rgba(255,255,255,0.4)'}">${isWorn ? '✔ ' : '○ '}${T(pId, 'items')}</span>`;
  }).join('<br>');

  let bonusesHtml = Object.entries(set.bonuses).map(([num, b]) => {
    const active = equippedCount >= parseInt(num, 10);
    return `<div style="margin-top:4px;color:${active ? '#f59e0b' : 'rgba(255,255,255,0.45)'}">
      <b>(${num}) ${T(b.name, 'ui')}:</b> ${T(b.desc, 'ui')}
    </div>`;
  }).join('');

  return `
    <div class="set-bonus-box" style="margin-top:8px;padding:8px;border:1px solid rgba(245,158,11,0.3);background:rgba(20,13,8,0.7);border-radius:4px;font-size:11px;">
      <div style="font-weight:bold;color:#f59e0b;margin-bottom:4px">
        ✨ ${T(set.name, 'ui')} (${equippedCount}/${set.pieces.length})
      </div>
      <div style="font-size:10px;line-height:1.4">${piecesHtml}</div>
      ${bonusesHtml}
    </div>
  `;
}
