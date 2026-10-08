// Homestead Subsystem: Botanical Sanctum Cultivation, Companion Pasture,
// Armory Mannequins & Cozy Hearth Rest Buff.
// Part of Module 3: The Sovereign Realm expansion.

export const CROP_DEFINITIONS = {
  seed_silverleaf: {
    id: 'seed_silverleaf',
    name: 'Silverleaf Seeds',
    baseDurationMs: 300000, // 5 min
    produceId: 'silverleaf',
    minYield: 2,
    maxYield: 3,
    seedReturnChance: 0.50,
  },
  seed_golden_wheat: {
    id: 'seed_golden_wheat',
    name: 'Golden Wheat Seeds',
    baseDurationMs: 480000, // 8 min
    produceId: 'golden_grain',
    minYield: 3,
    maxYield: 4,
    seedReturnChance: 0.60,
  },
  seed_moonflower: {
    id: 'seed_moonflower',
    name: 'Moonflower Seeds',
    baseDurationMs: 720000, // 12 min
    produceId: 'moonlight_lotus',
    minYield: 2,
    maxYield: 3,
    seedReturnChance: 0.40,
  },
  seed_ember_blossom: {
    id: 'seed_ember_blossom',
    name: 'Ember Blossom Seeds',
    baseDurationMs: 900000, // 15 min
    produceId: 'ember_blossom',
    minYield: 2,
    maxYield: 3,
    seedReturnChance: 0.35,
  },
};

export const MANNEQUIN_SLOTS = [
  'weapon',
  'shield',
  'head',
  'body',
  'accessory1',
  'accessory2',
  'relic',
];

export const PASTURE_FORAGE_TABLE = {
  slime: {
    baseItems: [{ itemId: 'slime_gel', minQty: 3, maxQty: 5 }],
    bonusItems: [{ itemId: 'seed_silverleaf', qty: 1, chance: 0.50 }],
  },
  beast: {
    baseItems: [
      { itemId: 'wolf_pelt', minQty: 1, maxQty: 2 },
      { itemId: 'beast_fang', minQty: 1, maxQty: 2 },
    ],
    bonusItems: [],
  },
  fairy: {
    baseItems: [{ itemId: 'essence_nature', minQty: 1, maxQty: 1 }],
    bonusItems: [{ itemId: 'seed_moonflower', qty: 1, chance: 0.50 }],
  },
  drake: {
    baseItems: [{ itemId: 'essence_fire', minQty: 1, maxQty: 1 }],
    bonusItems: [{ itemId: 'seed_ember_blossom', qty: 1, chance: 0.50 }],
  },
  general: {
    baseItems: [{ itemId: 'golden_grain', minQty: 2, maxQty: 3 }],
    bonusItems: [{ itemId: 'seed_golden_wheat', qty: 1, chance: 0.50 }],
  },
};

export const HEARTH_BUFF_DURATION_MS = 1800000; // 30 minutes
export const PETTING_COOLDOWN_MS = 86400000; // 24 hours

export const STAGE_EMPTY = 0;
export const STAGE_SEEDLING = 1;
export const STAGE_VEGETATIVE = 2;
export const STAGE_MATURE = 3;

function createEmptyPlot(id) {
  return {
    id,
    cropId: null,
    stage: STAGE_EMPTY,
    progressMs: 0,
    durationMs: 0,
    watered: false,
    plantedAt: 0,
  };
}

function createEmptyLoadout() {
  const loadout = {};
  for (const slot of MANNEQUIN_SLOTS) {
    loadout[slot] = null;
  }
  return loadout;
}

function getPetCategory(petId = '') {
  const id = String(petId).toLowerCase();
  if (id.includes('slime')) return 'slime';
  if (id.includes('wolf') || id.includes('hound') || id.includes('beast') || id.includes('bear') || id.includes('boar')) return 'beast';
  if (id.includes('fairy') || id.includes('wisp') || id.includes('celestial') || id.includes('spirit') || id.includes('nature')) return 'fairy';
  if (id.includes('drake') || id.includes('dragon') || id.includes('flame') || id.includes('fire')) return 'drake';
  return 'general';
}

function addItemToInventory(inventory, itemId, qty = 1) {
  if (!Array.isArray(inventory)) return;
  const existing = inventory.find(slot => slot && (slot.itemId === itemId || slot.id === itemId) && !slot.uid);
  if (existing) {
    if (typeof existing.qty === 'number') {
      existing.qty += qty;
    } else {
      existing.qty = 1 + qty;
    }
  } else {
    inventory.push({ itemId, qty });
  }
}

function removeItemFromInventory(inventory, itemId, qty = 1) {
  if (!Array.isArray(inventory)) return false;
  const slot = inventory.find(s => s && (s.itemId === itemId || s.id === itemId));
  if (!slot) return false;
  const curQty = typeof slot.qty === 'number' ? slot.qty : 1;
  if (curQty < qty) return false;
  if (curQty === qty) {
    const idx = inventory.indexOf(slot);
    if (idx !== -1) inventory.splice(idx, 1);
  } else {
    slot.qty -= qty;
  }
  return true;
}

export function createHomesteadSystem({ now = Date.now, rnd = Math.random } = {}) {
  const plots = Array.from({ length: 6 }, (_, i) => createEmptyPlot(i));
  let lastPetTimes = {};
  let pendingPastureGifts = [];
  const mannequins = {
    mannequin_a: { id: 'mannequin_a', loadout: createEmptyLoadout() },
    mannequin_b: { id: 'mannequin_b', loadout: createEmptyLoadout() },
  };
  let hearthBuffExpiresAt = 0;

  // --- Botanical Sanctum (Plots & Growth) ---

  function getPlots() {
    return plots.map(p => ({ ...p }));
  }

  function getPlot(plotIdx) {
    if (plotIdx < 0 || plotIdx >= plots.length) return null;
    return plots[plotIdx];
  }

  function plantSeed(plotIdx, seedId, player) {
    const plot = getPlot(plotIdx);
    if (!plot) return { success: false, reason: 'invalid_plot' };
    if (plot.cropId !== null || plot.stage !== STAGE_EMPTY) {
      return { success: false, reason: 'plot_occupied' };
    }
    const cropDef = CROP_DEFINITIONS[seedId];
    if (!cropDef) return { success: false, reason: 'invalid_seed' };

    if (!removeItemFromInventory(player?.inventory, seedId, 1)) {
      return { success: false, reason: 'missing_seed' };
    }

    plot.cropId = seedId;
    plot.stage = STAGE_SEEDLING;
    plot.progressMs = 0;
    plot.durationMs = cropDef.baseDurationMs;
    plot.watered = false;
    plot.plantedAt = now();

    return { success: true, plot: { ...plot } };
  }

  function waterPlot(plotIdx) {
    const plot = getPlot(plotIdx);
    if (!plot) return { success: false, reason: 'invalid_plot' };
    if (plot.cropId === null || plot.stage === STAGE_EMPTY) {
      return { success: false, reason: 'empty_plot' };
    }
    if (plot.watered) {
      return { success: false, reason: 'already_watered' };
    }
    plot.watered = true;
    return { success: true, plot: { ...plot } };
  }

  function tickCrops(dtMs) {
    const elapsed = Math.max(0, Number(dtMs) || 0);
    if (elapsed <= 0) return;

    for (const plot of plots) {
      if (!plot.cropId || plot.stage === STAGE_EMPTY || plot.stage === STAGE_MATURE) {
        continue;
      }
      const speedMult = plot.watered ? 2 : 1;
      plot.progressMs += elapsed * speedMult;
      const ratio = plot.progressMs / (plot.durationMs || 1);

      if (ratio >= 1.0) {
        plot.stage = STAGE_MATURE;
      } else if (ratio >= 0.5) {
        plot.stage = STAGE_VEGETATIVE;
      } else {
        plot.stage = STAGE_SEEDLING;
      }
    }
  }

  function harvestPlot(plotIdx, player) {
    const plot = getPlot(plotIdx);
    if (!plot) return { success: false, reason: 'invalid_plot' };
    if (plot.stage !== STAGE_MATURE || !plot.cropId) {
      return { success: false, reason: 'not_mature' };
    }
    const cropDef = CROP_DEFINITIONS[plot.cropId];
    if (!cropDef) return { success: false, reason: 'unknown_crop' };

    const min = cropDef.minYield ?? 2;
    const max = cropDef.maxYield ?? 3;
    const yieldQty = Math.floor(rnd() * (max - min + 1)) + min;

    addItemToInventory(player?.inventory, cropDef.produceId, yieldQty);

    let returnedSeed = false;
    let seedQty = 0;
    if (rnd() <= (cropDef.seedReturnChance ?? 0)) {
      addItemToInventory(player?.inventory, cropDef.id, 1);
      returnedSeed = true;
      seedQty = 1;
    }

    // Reset plot
    plot.cropId = null;
    plot.stage = STAGE_EMPTY;
    plot.progressMs = 0;
    plot.durationMs = 0;
    plot.watered = false;
    plot.plantedAt = 0;

    return {
      success: true,
      yieldItem: cropDef.produceId,
      yieldQty,
      returnedSeed,
      seedQty,
      plot: { ...plot },
    };
  }

  // --- Companion Pasture ---

  function petCompanion(petId, ownedPets) {
    if (!ownedPets || !ownedPets[petId]) {
      return { success: false, reason: 'not_owned' };
    }
    const last = lastPetTimes[petId];
    if (last && now() - last < PETTING_COOLDOWN_MS) {
      return { success: false, reason: 'cooldown' };
    }
    lastPetTimes[petId] = now();
    const pet = ownedPets[petId];
    pet.loyalty = Math.min(100, (pet.loyalty || 0) + 5);

    return { success: true, loyalty: pet.loyalty };
  }

  function feedCompanion(petId, ownedPets, foodItemId, player) {
    if (!ownedPets || !ownedPets[petId]) {
      return { success: false, reason: 'not_owned' };
    }
    if (!removeItemFromInventory(player?.inventory, foodItemId, 1)) {
      return { success: false, reason: 'missing_food' };
    }
    const pet = ownedPets[petId];
    pet.loyalty = Math.min(100, (pet.loyalty || 0) + 15);
    return { success: true, loyalty: pet.loyalty };
  }

  function generatePastureGifts(ownedPets) {
    if (!ownedPets) return [];
    for (const [petId, pet] of Object.entries(ownedPets)) {
      if (!pet || (pet.loyalty || 0) < 40) continue;
      const cat = getPetCategory(petId);
      const table = PASTURE_FORAGE_TABLE[cat] || PASTURE_FORAGE_TABLE.general;

      for (const item of table.baseItems) {
        const min = item.minQty ?? 1;
        const max = item.maxQty ?? 1;
        const qty = min === max ? min : Math.floor(rnd() * (max - min + 1)) + min;
        pendingPastureGifts.push({ itemId: item.itemId, qty });
      }

      for (const bItem of table.bonusItems) {
        if (rnd() <= (bItem.chance ?? 0)) {
          pendingPastureGifts.push({ itemId: bItem.itemId, qty: bItem.qty ?? 1 });
        }
      }
    }
    return [...pendingPastureGifts];
  }

  function getPendingPastureGifts() {
    return pendingPastureGifts.map(g => ({ ...g }));
  }

  function collectPastureGifts(player) {
    if (pendingPastureGifts.length === 0) {
      return { success: false, reason: 'no_gifts' };
    }
    for (const gift of pendingPastureGifts) {
      addItemToInventory(player?.inventory, gift.itemId, gift.qty);
    }
    const collected = [...pendingPastureGifts];
    pendingPastureGifts = [];
    return { success: true, gifts: collected };
  }

  // --- Armory Mannequins ---

  function getMannequin(mannequinId) {
    return mannequins[mannequinId] || null;
  }

  function saveLoadout(mannequinId, player) {
    const man = mannequins[mannequinId];
    if (!man || !player) return { success: false, reason: 'invalid_target' };
    for (const slot of MANNEQUIN_SLOTS) {
      man.loadout[slot] = player.equip?.[slot] ? JSON.parse(JSON.stringify(player.equip[slot])) : null;
    }
    return { success: true, loadout: { ...man.loadout } };
  }

  function swapLoadout(mannequinId, player) {
    const man = mannequins[mannequinId];
    if (!man || !player) return { success: false, reason: 'invalid_target' };
    if (!player.equip) player.equip = {};

    for (const slot of MANNEQUIN_SLOTS) {
      const playerItem = player.equip[slot] ? JSON.parse(JSON.stringify(player.equip[slot])) : null;
      const mannequinItem = man.loadout[slot] ? JSON.parse(JSON.stringify(man.loadout[slot])) : null;
      player.equip[slot] = mannequinItem;
      man.loadout[slot] = playerItem;
    }

    return {
      success: true,
      playerEquip: player.equip,
      mannequinLoadout: { ...man.loadout },
    };
  }

  function retrieveLoadout(mannequinId, player) {
    const man = mannequins[mannequinId];
    if (!man || !player) return { success: false, reason: 'invalid_target' };
    if (!Array.isArray(player.inventory)) player.inventory = [];

    for (const slot of MANNEQUIN_SLOTS) {
      const item = man.loadout[slot];
      if (item) {
        player.inventory.push(item);
        man.loadout[slot] = null;
      }
    }

    return { success: true };
  }

  // --- Cozy Hearth ---

  function restAtHearth(player) {
    if (player) {
      if (typeof player.maxHp === 'number') player.hp = player.maxHp;
      if (typeof player.maxMp === 'number') player.mp = player.maxMp;
    }
    hearthBuffExpiresAt = now() + HEARTH_BUFF_DURATION_MS;
    return { success: true, buffExpiresAt: hearthBuffExpiresAt };
  }

  function isHearthBuffActive() {
    return now() < hearthBuffExpiresAt;
  }

  function getHearthBuffTimeRemaining() {
    return Math.max(0, hearthBuffExpiresAt - now());
  }

  // --- State Persistence ---

  function serialize() {
    return {
      plots: plots.map(p => ({ ...p })),
      lastPetTimes: { ...lastPetTimes },
      pendingPastureGifts: pendingPastureGifts.map(g => ({ ...g })),
      mannequins: {
        mannequin_a: {
          id: 'mannequin_a',
          loadout: { ...mannequins.mannequin_a.loadout },
        },
        mannequin_b: {
          id: 'mannequin_b',
          loadout: { ...mannequins.mannequin_b.loadout },
        },
      },
      hearthBuffExpiresAt,
    };
  }

  function deserialize(data) {
    if (!data || typeof data !== 'object') {
      for (let i = 0; i < plots.length; i++) {
        plots[i] = createEmptyPlot(i);
      }
      lastPetTimes = {};
      pendingPastureGifts = [];
      mannequins.mannequin_a.loadout = createEmptyLoadout();
      mannequins.mannequin_b.loadout = createEmptyLoadout();
      hearthBuffExpiresAt = 0;
      return;
    }

    if (Array.isArray(data.plots)) {
      for (let i = 0; i < 6; i++) {
        if (data.plots[i]) {
          plots[i] = {
            id: i,
            cropId: data.plots[i].cropId ?? null,
            stage: data.plots[i].stage ?? STAGE_EMPTY,
            progressMs: data.plots[i].progressMs ?? 0,
            durationMs: data.plots[i].durationMs ?? 0,
            watered: !!data.plots[i].watered,
            plantedAt: data.plots[i].plantedAt ?? 0,
          };
        } else {
          plots[i] = createEmptyPlot(i);
        }
      }
    }

    if (data.lastPetTimes && typeof data.lastPetTimes === 'object') {
      lastPetTimes = { ...data.lastPetTimes };
    }

    if (Array.isArray(data.pendingPastureGifts)) {
      pendingPastureGifts = data.pendingPastureGifts.map(g => ({ ...g }));
    }

    if (data.mannequins && typeof data.mannequins === 'object') {
      for (const mId of ['mannequin_a', 'mannequin_b']) {
        if (data.mannequins[mId]?.loadout) {
          const l = createEmptyLoadout();
          for (const s of MANNEQUIN_SLOTS) {
            l[s] = data.mannequins[mId].loadout[s] ?? null;
          }
          mannequins[mId].loadout = l;
        }
      }
    }

    hearthBuffExpiresAt = typeof data.hearthBuffExpiresAt === 'number' ? data.hearthBuffExpiresAt : 0;
  }

  return {
    getPlots,
    getPlot,
    plantSeed,
    waterPlot,
    tickCrops,
    harvestPlot,
    petCompanion,
    feedCompanion,
    generatePastureGifts,
    getPendingPastureGifts,
    collectPastureGifts,
    getMannequin,
    saveLoadout,
    swapLoadout,
    retrieveLoadout,
    restAtHearth,
    isHearthBuffActive,
    getHearthBuffTimeRemaining,
    serialize,
    deserialize,
  };
}
