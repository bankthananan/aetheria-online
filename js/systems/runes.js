// js/systems/runes.js - Elemental Rune Socketing & Socket Expansion Subsystem.
// Handles equipment socket expansion up to 4 sockets, primal rune catalog,
// weapon elemental infusion resolution, and defensive warding stat bonuses.

export const RUNE_CATALOG = {
  rune_ember: {
    id: 'rune_ember',
    name: 'Ember Rune',
    element: 'fire',
    icon: '🔥',
    weaponDmgPct: 15,
    onHitEffect: 'burn',
    onHitChance: 0.15,
    resPct: 12,
    hpFlat: 25,
    color: '#ff6b4a',
    desc: 'Infuses weapon with Fire. In armor, grants +12% Fire Resistance and +25 HP.',
  },
  rune_glacial: {
    id: 'rune_glacial',
    name: 'Glacial Rune',
    element: 'ice',
    icon: '❄️',
    weaponDmgPct: 15,
    onHitEffect: 'slow',
    onHitChance: 0.20,
    resPct: 12,
    defFlat: 8,
    color: '#64c8ff',
    desc: 'Infuses weapon with Ice. In armor, grants +12% Ice Resistance and +8 DEF.',
  },
  rune_storm: {
    id: 'rune_storm',
    name: 'Storm Rune',
    element: 'lightning',
    icon: '⚡',
    weaponDmgPct: 15,
    onHitEffect: 'stun',
    onHitChance: 0.10,
    resPct: 12,
    fleeFlat: 6,
    color: '#ffd24d',
    desc: 'Infuses weapon with Lightning. In armor, grants +12% Lightning Resistance and +6 Flee.',
  },
  rune_verdant: {
    id: 'rune_verdant',
    name: 'Verdant Rune',
    element: 'nature',
    icon: '🌿',
    weaponDmgPct: 15,
    onHitEffect: 'poison',
    onHitChance: 0.15,
    resPct: 12,
    regenPct: 3,
    color: '#66dd66',
    desc: 'Infuses weapon with Nature. In armor, grants +12% Nature Resistance and +3% HP Regen.',
  },
  rune_luminous: {
    id: 'rune_luminous',
    name: 'Luminous Rune',
    element: 'holy',
    icon: '✨',
    weaponDmgPct: 15,
    onHitEffect: 'lifesteal_undead',
    onHitChance: 1.0,
    resPct: 12,
    healPct: 5,
    color: '#fff080',
    desc: 'Infuses weapon with Holy. In armor, grants +12% Holy Resistance and +5% Healing.',
  },
  rune_umbral: {
    id: 'rune_umbral',
    name: 'Umbral Rune',
    element: 'void',
    icon: '🌑',
    weaponDmgPct: 15,
    onHitEffect: 'armor_pen',
    onHitChance: 1.0,
    resPct: 12,
    critDmgPct: 5,
    color: '#ba68c8',
    desc: 'Infuses weapon with Void. In armor, grants +12% Void Resistance and +5% Crit DMG.',
  },
};

export const EXPANSION_COSTS = [
  { zeny: 1500, materials: [{ id: 'wolf_fang', qty: 5 }] },   // 0 -> 1 socket
  { zeny: 3500, materials: [{ id: 'star_iron', qty: 10 }] },  // 1 -> 2 sockets
  { zeny: 7500, materials: [{ id: 'blessed_ore', qty: 2 }] }, // 2 -> 3 sockets
  { zeny: 7500, materials: [{ id: 'blessed_ore', qty: 2 }] }, // 3 -> 4 sockets
];

export function createRuneSystem() {
  function getSocketExpansionCost(currentCount = 0) {
    if (typeof currentCount !== 'number' || currentCount < 0 || currentCount >= 4) {
      return null;
    }
    return EXPANSION_COSTS[currentCount] || null;
  }

  function canExpandSockets({ inst, zeny = 0, inventory = [] }) {
    if (!inst) return { canExpand: false, reason: 'No item selected' };
    const currentCount = Array.isArray(inst.sockets) ? inst.sockets.length : 0;
    if (currentCount >= 4) return { canExpand: false, reason: 'Already at maximum 4 sockets' };

    const cost = getSocketExpansionCost(currentCount);
    if (!cost) return { canExpand: false, reason: 'Cannot expand sockets' };

    if (zeny < cost.zeny) {
      return { canExpand: false, reason: `Need ${cost.zeny} Zeny` };
    }

    for (const req of cost.materials) {
      const owned = inventory.reduce((total, it) => it?.itemId === req.id ? total + (it.qty || 1) : total, 0);
      if (owned < req.qty) {
        return { canExpand: false, reason: `Need ${req.qty} ${req.id}` };
      }
    }

    return { canExpand: true, cost };
  }

  function expandSockets({ inst, zeny = 0, inventory = [], deductZeny, removeItem }) {
    const check = canExpandSockets({ inst, zeny, inventory });
    if (!check.canExpand) {
      return { success: false, reason: check.reason };
    }

    const { cost } = check;
    if (typeof deductZeny === 'function') {
      deductZeny(cost.zeny);
    }
    if (typeof removeItem === 'function') {
      for (const req of cost.materials) {
        removeItem(req.id, req.qty);
      }
    }

    if (!Array.isArray(inst.sockets)) {
      inst.sockets = [];
    }
    inst.sockets.push(null);

    return {
      success: true,
      newSockets: inst.sockets.length,
      cost,
    };
  }

  function getWeaponRuneElement(weaponInst, itemById = {}) {
    if (!weaponInst || !Array.isArray(weaponInst.sockets)) return null;
    for (const gid of weaponInst.sockets) {
      if (!gid) continue;
      const rune = RUNE_CATALOG[gid] || (itemById[gid]?.gem?.isRune ? itemById[gid].gem : null);
      if (rune && rune.element) {
        return rune.element;
      }
    }
    return null;
  }

  function getRuneCombatModifiers(equip = {}, itemById = {}) {
    const mods = {
      fireRes: 0,
      iceRes: 0,
      lightningRes: 0,
      natureRes: 0,
      holyRes: 0,
      voidRes: 0,
      hpFlat: 0,
      defFlat: 0,
      fleeFlat: 0,
      regenPct: 0,
      healPct: 0,
      critDmgPct: 0,
    };

    if (!equip) return mods;

    // Scan armor and accessory slots (weapon sockets are for weapon infusion)
    const wardingSlots = ['head', 'body', 'hands', 'cloak', 'feet', 'accessory', 'relic'];
    for (const slot of wardingSlots) {
      const inst = equip[slot];
      if (!inst || !Array.isArray(inst.sockets)) continue;
      for (const gid of inst.sockets) {
        if (!gid) continue;
        const catalogRune = RUNE_CATALOG[gid];
        const dbGem = itemById[gid]?.gem;
        const el = catalogRune?.element || (dbGem?.isRune ? dbGem.element : null);
        if (el) {
          const resKey = `${el}Res`;
          if (resKey in mods) mods[resKey] += (catalogRune?.resPct || dbGem?.resPct || 12);
        }
        if (catalogRune?.hpFlat || dbGem?.hpFlat) mods.hpFlat += (catalogRune?.hpFlat || dbGem?.hpFlat || 0);
        if (catalogRune?.defFlat || dbGem?.defFlat) mods.defFlat += (catalogRune?.defFlat || dbGem?.defFlat || 0);
        if (catalogRune?.fleeFlat || dbGem?.fleeFlat) mods.fleeFlat += (catalogRune?.fleeFlat || dbGem?.fleeFlat || 0);
        if (catalogRune?.regenPct || dbGem?.regenPct) mods.regenPct += (catalogRune?.regenPct || dbGem?.regenPct || 0);
        if (catalogRune?.healPct || dbGem?.healPct) mods.healPct += (catalogRune?.healPct || dbGem?.healPct || 0);
        if (catalogRune?.critDmgPct || dbGem?.critDmgPct) mods.critDmgPct += (catalogRune?.critDmgPct || dbGem?.critDmgPct || 0);
      }
    }

    return mods;
  }

  return {
    getSocketExpansionCost,
    canExpandSockets,
    expandSockets,
    getWeaponRuneElement,
    getRuneCombatModifiers,
  };
}
