// js/systems/enchanting.js
// Mythic Enchanting Altar Subsystem.
// Allows imbuing high-tier weapons and armors with boss catalyst materials
// to grant powerful mythic stat enhancements and secondary affixes.
// Strict ZERO Screen Shake: Camera is untouched.

export const MYTHIC_ENCHANTS = {
  kernel_core: {
    catalystId: 'kernel_core',
    name: "Architect's Insight",
    desc: '+15 All Stats, +10% Cooldown Reduction',
    costZeny: 10000,
    statMods: {
      allStats: 15,
      cdrPct: 10,
    },
  },
  colossus_plating: {
    catalystId: 'colossus_plating',
    name: 'Colossal Might',
    desc: '+40 ATK, +5% Armor Penetration',
    costZeny: 7500,
    statMods: {
      physAtk: 40,
      armorPenPct: 5,
    },
  },
  voidstone_ore: {
    catalystId: 'voidstone_ore',
    name: 'Void Shroud',
    desc: '+25% Void RES, +6% Lifesteal',
    costZeny: 5000,
    statMods: {
      res_void: 25,
      lifestealPct: 6,
    },
  },
};

/**
 * Validates whether an item instance can receive a mythic enchant.
 * @param {object} inst
 * @param {string} catalystId
 * @returns {{ ok: boolean, reason?: string }}
 */
export function canEnchantItem(inst, catalystId) {
  if (!inst || (!inst.uid && !inst.gearLevel)) {
    return { ok: false, reason: 'Invalid equipment instance' };
  }
  if (!MYTHIC_ENCHANTS[catalystId]) {
    return { ok: false, reason: 'Unknown catalyst material' };
  }
  return { ok: true };
}

/**
 * Applies a mythic enchant to an equipment instance.
 * @param {object} inst
 * @param {string} catalystId
 * @returns {object} The mutated gear instance
 */
export function applyMythicEnchant(inst, catalystId) {
  const enchantDef = MYTHIC_ENCHANTS[catalystId];
  if (!enchantDef) return inst;

  inst.mythicEnchant = {
    catalystId,
    name: enchantDef.name,
    desc: enchantDef.desc,
    statMods: { ...enchantDef.statMods },
  };

  return inst;
}

/**
 * Extracts cumulative mythic enchant stat bonuses from an equipment item.
 * @param {object} inst
 * @returns {object}
 */
export function getEnchantBonus(inst) {
  if (!inst || !inst.mythicEnchant || !inst.mythicEnchant.statMods) return {};
  return { ...inst.mythicEnchant.statMods };
}
