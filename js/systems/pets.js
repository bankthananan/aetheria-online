// js/systems/pets.js
// Core Companion & Pet Familiars Subsystem.
// Handles companion catalog definitions, wild creature taming, feast bonding,
// passive stat aura scaling with Devoted bonus, auto-loot radius, and serialization.

/**
 * Bounding utility clamping val between min and max.
 * @param {number} val
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

/**
 * Catalog of authorable companion archetypes.
 */
export const PET_CATALOG = {
  pet_slime: {
    id: 'pet_slime',
    name: 'Gel Slime',
    targetMonster: 'slime',
    requiredBait: 'bait_sweet_gelatin',
    baseLootRadius: 2.0,
    maxLootRadius: 3.5,
    auras: {
      base: { hpRegen: 5, moveMult: 0.03 },
      max: { hpRegen: 25, moveMult: 0.07 },
    },
    desc: 'A bouncy, friendly slime companion that rejuvenates your vitality and picks up nearby spoils.',
  },
  pet_wolf: {
    id: 'pet_wolf',
    name: 'Timber Wolf Pup',
    targetMonster: ['wolf', 'frost_wolf'],
    requiredBait: 'bait_tender_jerky',
    baseLootRadius: 2.5,
    maxLootRadius: 4.0,
    auras: {
      base: { physAtkPct: 0.06, critChance: 4 },
      max: { physAtkPct: 0.18, critChance: 10 },
    },
    desc: 'A spirited wolf pup whose loyal hunting instincts bolster your attack strength and precision.',
  },
  pet_sprite: {
    id: 'pet_sprite',
    name: 'Blight Sprite',
    targetMonster: ['blight_sprite', 'void_wisp'],
    requiredBait: 'bait_luminous_nectar',
    baseLootRadius: 3.0,
    maxLootRadius: 4.5,
    auras: {
      base: { magicAtkPct: 0.08, mpRegen: 6, castSpeedPct: 0.05 },
      max: { magicAtkPct: 0.20, mpRegen: 20, castSpeedPct: 0.12 },
    },
    desc: 'A fluttering fae sprite suffused with arcane light, replenishing mana and accelerating invocations.',
  },
  pet_bear: {
    id: 'pet_bear',
    name: 'Glacial Bear Cub',
    targetMonster: ['tundra_lurker', 'frost_revenant'],
    requiredBait: 'bait_glacial_salmon',
    baseLootRadius: 2.5,
    maxLootRadius: 4.0,
    auras: {
      base: { physDefPct: 0.10, magicDefPct: 0.10, res_ice: 12, maxHp: 80 },
      max: { physDefPct: 0.25, magicDefPct: 0.25, res_ice: 25, maxHp: 300 },
    },
    desc: 'A sturdy polar bear cub whose thick pelt shields against frost and brutal blows.',
  },
  pet_dragon: {
    id: 'pet_dragon',
    name: 'Magma Hatchling',
    targetMonster: ['ember_imp', 'flame_dragon'],
    requiredBait: 'bait_magma_fruit',
    baseLootRadius: 3.5,
    maxLootRadius: 5.0,
    auras: {
      base: { dmg_fire: 10, dmg_void: 10, critDmgPct: 0.15, zenyMult: 1.10 },
      max: { dmg_fire: 25, dmg_void: 25, critDmgPct: 0.35, zenyMult: 1.25 },
    },
    desc: 'A fiery wyrmling breathing embers of destruction and hoarding sparkling zeny.',
  },
};

/**
 * Mapping of taming bait item IDs to their corresponding companion IDs.
 */
export const BAIT_TO_PET_MAP = {
  bait_sweet_gelatin: 'pet_slime',
  bait_tender_jerky: 'pet_wolf',
  bait_luminous_nectar: 'pet_sprite',
  bait_glacial_salmon: 'pet_bear',
  bait_magma_fruit: 'pet_dragon',
};

/**
 * Loyalty and EXP values granted when feeding crafted feast items.
 */
export const FEAST_VALUES = {
  grilled_trout: { loyalty: 15, exp: 50 },
  smoked_salmon: { loyalty: 25, exp: 120 },
  golden_carp_sashimi: { loyalty: 50, exp: 300 },
};

/**
 * Bond level thresholds (Bond Lv 1 to Lv 5).
 */
export const BOND_EXP_THRESHOLDS = [0, 100, 250, 500, 1000];

/**
 * Creates an instance of the pet companion subsystem.
 * @param {object} options
 * @param {Function} [options.now]
 * @param {Function} [options.rnd]
 */
export function createPetsSystem({ now = Date.now, rnd = Math.random } = {}) {
  /**
   * Retrieves definition for pet ID.
   * @param {string} petId
   * @returns {object|null}
   */
  function getPetDef(petId) {
    if (!petId) return null;
    return PET_CATALOG[petId] || null;
  }

  /**
   * Retrieves companion definition if monsterId is tameable.
   * @param {string} monsterId
   * @returns {object|null}
   */
  function getPetForMonster(monsterId) {
    if (!monsterId) return null;
    for (const pet of Object.values(PET_CATALOG)) {
      if (Array.isArray(pet.targetMonster)) {
        if (pet.targetMonster.includes(monsterId)) return pet;
      } else if (pet.targetMonster === monsterId) {
        return pet;
      }
    }
    return null;
  }

  /**
   * Attempts to tame a monster using bait.
   * @param {object} player
   * @param {object} monster
   * @param {string} baitId
   * @returns {{ success: boolean, reason?: string, petId?: string, petDef?: object }}
   */
  function attemptTame(player, monster, baitId) {
    if (!monster || typeof monster.hp !== 'number' || monster.hp <= 0) {
      return { success: false, reason: 'Invalid target creature!' };
    }
    if (typeof monster.maxHp !== 'number' || monster.maxHp <= 0) {
      return { success: false, reason: 'Invalid target creature!' };
    }

    const hpRatio = monster.hp / monster.maxHp;
    if (hpRatio > 0.30) {
      return { success: false, reason: 'Creature must be weakened below 30% HP!' };
    }

    const petId = BAIT_TO_PET_MAP[baitId];
    if (!petId) {
      return { success: false, reason: 'This creature rejects this bait!' };
    }

    const petDef = PET_CATALOG[petId];
    if (!petDef) {
      return { success: false, reason: 'This creature rejects this bait!' };
    }

    const targetId = monster.id || monster.def?.id;
    const isMatch = Array.isArray(petDef.targetMonster)
      ? petDef.targetMonster.includes(targetId)
      : petDef.targetMonster === targetId;

    if (!isMatch) {
      return { success: false, reason: 'This creature rejects this bait!' };
    }

    const hpFactor = (1 - (hpRatio / 0.30)) * 0.20;
    const lukBonus = ((player?.stats?.luk || 0) * 0.005);
    const chance = clamp(0.45 + lukBonus + hpFactor, 0.20, 0.90);

    if (rnd() < chance) {
      return { success: true, petId: petDef.id, petDef };
    }

    return { success: false, reason: 'The creature resisted taming!' };
  }

  /**
   * Feeds a companion with a feast item.
   * @param {object} petState
   * @param {string} feastItemId
   * @returns {{ success: boolean, loyalty?: number, bondLevel?: number, exp?: number, reason?: string }}
   */
  function feedPet(petState, feastItemId) {
    if (!petState) {
      return { success: false, reason: 'No companion specified!' };
    }

    const feast = FEAST_VALUES[feastItemId] || { loyalty: 5, exp: 20 };
    petState.loyalty = clamp((petState.loyalty || 0) + feast.loyalty, 0, 100);
    petState.exp = (petState.exp || 0) + feast.exp;

    let level = 1;
    for (let i = 0; i < BOND_EXP_THRESHOLDS.length; i++) {
      if (petState.exp >= BOND_EXP_THRESHOLDS[i]) {
        level = i + 1;
      }
    }
    petState.bondLevel = clamp(level, 1, 5);

    return {
      success: true,
      loyalty: petState.loyalty,
      bondLevel: petState.bondLevel,
      exp: petState.exp,
    };
  }

  /**
   * Computes passive aura stats based on companion archetype, bond level, and loyalty.
   * @param {object} petState
   * @returns {object}
   */
  function computeAuraStats(petState) {
    if (!petState || !petState.id) return {};
    const petDef = getPetDef(petState.id);
    if (!petDef || !petDef.auras || !petDef.auras.base || !petDef.auras.max) return {};

    const bond = clamp(petState.bondLevel || 1, 1, 5);
    const t = (bond - 1) / 4;
    const stats = {};

    for (const stat in petDef.auras.base) {
      const baseVal = petDef.auras.base[stat];
      const maxVal = petDef.auras.max[stat];
      stats[stat] = baseVal + (maxVal - baseVal) * t;
    }

    const devotionMult = (petState.loyalty >= 80) ? 1.10 : 1.0;
    for (const stat in stats) {
      stats[stat] = Number((stats[stat] * devotionMult).toFixed(4));
    }

    return stats;
  }

  /**
   * Calculates dynamic auto-loot vacuum radius based on bond level.
   * @param {object} petState
   * @returns {number}
   */
  function getAutoLootRadius(petState) {
    const petDef = getPetDef(petState?.id);
    if (!petDef) return 2.0;

    const bond = clamp(petState?.bondLevel || 1, 1, 5);
    const t = (bond - 1) / 4;
    return Number((petDef.baseLootRadius + (petDef.maxLootRadius - petDef.baseLootRadius) * t).toFixed(2));
  }

  /**
   * Retrieves bond-tier looting perks (bonus zeny, duplicate material chance).
   * @param {object} petState
   * @returns {{ zenyBonusPct: number, dupeMatChance: number }}
   */
  function getBondLootBonus(petState) {
    const bond = clamp(petState?.bondLevel || 1, 1, 5);
    if (bond >= 5) return { zenyBonusPct: 0.20, dupeMatChance: 0.05 };
    if (bond >= 3) return { zenyBonusPct: 0.10, dupeMatChance: 0.00 };
    return { zenyBonusPct: 0.00, dupeMatChance: 0.00 };
  }

  /**
   * Serializes pet state cleanly for persistence in awo_save_v1.
   * @param {object} petsState
   * @returns {{ activePetId: string|null, owned: object }}
   */
  function serialize(petsState) {
    return {
      activePetId: petsState?.activePetId || null,
      owned: petsState?.owned ? JSON.parse(JSON.stringify(petsState.owned)) : {},
    };
  }

  /**
   * Deserializes pet state with safe default fallbacks.
   * @param {object} data
   * @returns {{ activePetId: string|null, owned: object }}
   */
  function deserialize(data) {
    return {
      activePetId: data?.activePetId || null,
      owned: data?.owned ? JSON.parse(JSON.stringify(data.owned)) : {},
    };
  }

  return {
    PET_CATALOG,
    BAIT_TO_PET_MAP,
    getPetDef,
    getPetForMonster,
    attemptTame,
    feedPet,
    computeAuraStats,
    getAutoLootRadius,
    getBondLootBonus,
    serialize,
    deserialize,
  };
}
