// Stronghold Subsystem: Facility Upgrades, Hall of Trophies & Crystal Siege
// Part of the Guild Stronghold expansion.

export const FACILITY_DEFINITIONS = {
  treasury: {
    id: 'treasury',
    name: 'Treasury Vault',
    icon: '💰',
    tiers: [
      { tier: 0, costGP: 0, costZeny: 0, costMats: [], perkDesc: 'Unbuilt.' },
      { tier: 1, costGP: 30, costZeny: 5000, costMats: [{ itemId: 'iron_ore', qty: 10 }], dailyStipend: 500, bankCap: 50000, zenyDropPct: 0, perkDesc: '+500z daily stipend, +50k bank cap.' },
      { tier: 2, costGP: 75, costZeny: 15000, costMats: [{ itemId: 'star_iron', qty: 10 }], dailyStipend: 1500, bankCap: 150000, zenyDropPct: 5, perkDesc: '+1,500z daily stipend, +5% Zeny drops.' },
      { tier: 3, costGP: 150, costZeny: 40000, costMats: [{ itemId: 'blessed_ore', qty: 5 }], dailyStipend: 3500, bankCap: 500000, zenyDropPct: 10, perkDesc: '+3,500z daily stipend, +10% Zeny drops.' }
    ]
  },
  forge: {
    id: 'forge',
    name: 'Guild Forge',
    icon: '⚒️',
    tiers: [
      { tier: 0, costGP: 0, costZeny: 0, costMats: [], perkDesc: 'Baseline anvil.' },
      { tier: 1, costGP: 30, costZeny: 6000, costMats: [{ itemId: 'iron_ore', qty: 10 }], refineBonusPct: 5, craftCostDiscountPct: 10, perkDesc: '+5% refine chance, -10% craft costs.' },
      { tier: 2, costGP: 75, costZeny: 18000, costMats: [{ itemId: 'star_iron', qty: 10 }, { itemId: 'caldera_crystal', qty: 5 }], refineBonusPct: 10, craftCostDiscountPct: 15, perkDesc: '+10% refine chance, -15% craft costs.' },
      { tier: 3, costGP: 150, costZeny: 45000, costMats: [{ itemId: 'blessed_ore', qty: 8 }, { itemId: 'titan_heart', qty: 2 }], refineBonusPct: 15, craftCostDiscountPct: 20, duplicateCraftChance: 0.10, perkDesc: '+15% refine chance, -20% craft costs, 10% duplicate craft chance.' }
    ]
  },
  conservatory: {
    id: 'conservatory',
    name: 'Botanical Conservatory',
    icon: '🌿',
    tiers: [
      { tier: 0, costGP: 0, costZeny: 0, costMats: [], perkDesc: 'Barren garden.' },
      { tier: 1, costGP: 25, costZeny: 4000, costMats: [{ itemId: 'wood', qty: 10 }], nodesCount: 2, yieldBonusPct: 0, perkDesc: 'Spawns 2 daily courtyard gathering nodes.' },
      { tier: 2, costGP: 60, costZeny: 12000, costMats: [{ itemId: 'silverleaf', qty: 15 }, { itemId: 'essence_nature', qty: 5 }], nodesCount: 3, yieldBonusPct: 15, perkDesc: '3 daily nodes + 15% gathering yield.' },
      { tier: 3, costGP: 120, costZeny: 30000, costMats: [{ itemId: 'essence_nature', qty: 10 }, { itemId: 'titan_heart', qty: 2 }], nodesCount: 4, yieldBonusPct: 30, perkDesc: '4 daily rare nodes + 30% yield.' }
    ]
  },
  training: {
    id: 'training',
    name: 'Tactical Training Grounds',
    icon: '⚔️',
    tiers: [
      { tier: 0, costGP: 0, costZeny: 0, costMats: [], perkDesc: 'Empty sparring yard.' },
      { tier: 1, costGP: 35, costZeny: 7000, costMats: [{ itemId: 'hardwood', qty: 10 }], expMult: 1.05, skillExpMult: 1.0, dmgPct: 0, perkDesc: '+5% combat EXP account-wide.' },
      { tier: 2, costGP: 80, costZeny: 20000, costMats: [{ itemId: 'star_iron', qty: 10 }], expMult: 1.10, skillExpMult: 1.10, dmgPct: 0, perkDesc: '+10% combat EXP, +10% Skill EXP.' },
      { tier: 3, costGP: 160, costZeny: 50000, costMats: [{ itemId: 'blessed_ore', qty: 10 }, { itemId: 'titan_heart', qty: 2 }], expMult: 1.20, skillExpMult: 1.20, dmgPct: 5, perkDesc: '+20% combat EXP, +20% Skill EXP, +5% All Damage.' }
    ]
  }
};

export const TROPHY_PEDESTAL_DEFINITIONS = {
  pedestal_colossus: {
    id: 'pedestal_colossus',
    name: 'Colossus Vanguard Pedestal',
    element: 'fire',
    targetTrophy: 'titan_heart',
    trophyQty: 1,
    auraName: 'Colossal Fortitude',
    perks: { maxHp: 200, physDef: 15, res_fire: 10, res_nature: 10 },
    color: '#ff5722'
  },
  pedestal_voidmaw: {
    id: 'pedestal_voidmaw',
    name: 'Voidmaw Singularity Pedestal',
    element: 'void',
    targetTrophy: 'voidmaw_eye',
    trophyQty: 1,
    auraName: 'Singularity Edge',
    perks: { critChance: 6, critDmg: 15, res_void: 10 },
    color: '#9c27b0'
  },
  pedestal_zenith: {
    id: 'pedestal_zenith',
    name: 'Zenith Ascendant Pedestal',
    element: 'lightning',
    targetTrophy: 'spire_emblem',
    trophyQty: 25,
    auraName: 'Zenith Ascendance',
    perks: { dmgPct: 8, moveSpdPct: 10, cooldownRecoveryPct: 10 },
    color: '#ffd700'
  },
  pedestal_incursion: {
    id: 'pedestal_incursion',
    name: 'Incursion Vanguard Pedestal',
    element: 'light',
    targetTrophy: 'dimensional_shard',
    trophyQty: 10,
    auraName: 'Aetheric Resonance',
    perks: { magicDef: 15, lootBias: 0.20, res_holy: 10 },
    color: '#00e5ff'
  },
  pedestal_architect: {
    id: 'pedestal_architect',
    name: 'Architect Kernel Pedestal',
    element: 'void',
    targetTrophy: 'kernel_core',
    trophyQty: 1,
    auraName: 'Kernel Overdrive',
    perks: { allStats: 10, matk: 15, res_void: 15 },
    color: '#00ffcc'
  }
};

export const SIEGE_WAVE_TEMPLATES = [
  { wave: 1, name: 'Vanguard Breachers', foes: [{ id: 'siege_grunt', count: 4 }, { id: 'siege_hound', count: 2 }] },
  { wave: 2, name: 'Sappers & Bombardiers', foes: [{ id: 'siege_grunt', count: 4 }, { id: 'siege_sapper', count: 2 }, { id: 'siege_archer', count: 2 }] },
  { wave: 3, name: 'The Siege Warlord', foes: [{ id: 'siege_grunt', count: 6 }, { id: 'siege_sapper', count: 2 }, { id: 'siege_archer', count: 2 }, { id: 'siege_warlord_boss', count: 1 }] }
];

export const SIEGE_REWARDS = {
  S: { minHpPct: 0.80, guildPoints: 100, zeny: 6000, commendations: 3, ore: 'blessed_ore', oreCount: 2 },
  A: { minHpPct: 0.50, guildPoints: 60, zeny: 3500, commendations: 2, ore: 'blessed_ore', oreCount: 1 },
  B: { minHpPct: 0.01, guildPoints: 35, zeny: 1800, commendations: 1, ore: null, oreCount: 0 }
};

function getItemQty(inventory, itemId) {
  if (!Array.isArray(inventory)) return 0;
  return inventory
    .filter(slot => slot && slot.itemId === itemId)
    .reduce((sum, slot) => sum + (typeof slot.qty === 'number' ? slot.qty : 1), 0);
}

function removeItemFromInventory(inventory, itemId, qty = 1) {
  if (!Array.isArray(inventory)) return;
  let remaining = qty;
  for (let i = inventory.length - 1; i >= 0; i--) {
    const slot = inventory[i];
    if (slot && slot.itemId === itemId) {
      const currentQty = typeof slot.qty === 'number' ? slot.qty : 1;
      if (currentQty <= remaining) {
        remaining -= currentQty;
        inventory.splice(i, 1);
      } else {
        slot.qty = currentQty - remaining;
        remaining = 0;
        break;
      }
      if (remaining <= 0) break;
    }
  }
}

function addItemToInventory(inventory, itemId, qty = 1) {
  if (!Array.isArray(inventory)) return;
  const existing = inventory.find(slot => slot && slot.itemId === itemId && !slot.uid);
  if (existing && typeof existing.qty === 'number') {
    existing.qty += qty;
  } else {
    inventory.push({ itemId, qty });
  }
}

export function createStrongholdSystem({ now = Date.now, rnd = Math.random } = {}) {
  const facilities = {
    treasury: 0,
    forge: 0,
    conservatory: 0,
    training: 0,
  };

  const trophies = {
    pedestal_colossus: false,
    pedestal_voidmaw: false,
    pedestal_zenith: false,
    pedestal_incursion: false,
    pedestal_architect: false,
  };

  let lastStipendClaimAt = 0;
  let lastSiegeEndAt = 0;   // persisted; drives the siege cooldown
  const harvestNodes = [];
  let activeSiege = null;

  // --- Facility Methods ---

  function getFacilities() {
    return { ...facilities };
  }

  function getFacilityTier(facilityId) {
    return facilities[facilityId] ?? 0;
  }

  function canUpgradeFacility(facilityId, player, guildPoints) {
    const def = FACILITY_DEFINITIONS[facilityId];
    if (!def) return false;
    const currentTier = facilities[facilityId] ?? 0;
    if (currentTier >= 3) return false;
    const nextTier = def.tiers[currentTier + 1];
    if (!nextTier) return false;
    if ((guildPoints ?? 0) < nextTier.costGP) return false;
    if (!player || (player.zeny ?? 0) < nextTier.costZeny) return false;

    const inv = player.inventory || [];
    for (const mat of nextTier.costMats || []) {
      if (getItemQty(inv, mat.itemId) < mat.qty) return false;
    }
    return true;
  }

  function upgradeFacility(facilityId, player, guildPoints, deductGP) {
    if (!canUpgradeFacility(facilityId, player, guildPoints)) {
      return { success: false, reason: 'Upgrade requirements not met' };
    }
    const currentTier = facilities[facilityId] ?? 0;
    const nextTier = FACILITY_DEFINITIONS[facilityId].tiers[currentTier + 1];

    if (typeof deductGP === 'function') {
      deductGP(nextTier.costGP);
    }
    player.zeny -= nextTier.costZeny;

    for (const mat of nextTier.costMats || []) {
      removeItemFromInventory(player.inventory, mat.itemId, mat.qty);
    }

    facilities[facilityId] = currentTier + 1;
    const remainingGP = typeof guildPoints === 'number' ? guildPoints - nextTier.costGP : undefined;
    return {
      success: true,
      newTier: facilities[facilityId],
      remainingGP,
    };
  }

  function canClaimDailyStipend() {
    const treasuryTier = facilities.treasury ?? 0;
    if (treasuryTier < 1) return false;
    return lastStipendClaimAt === 0 || (now() - lastStipendClaimAt >= 86400000);
  }

  function claimDailyStipend(player) {
    if (!canClaimDailyStipend()) {
      return { success: false, reason: 'Stipend not available' };
    }
    const tier = facilities.treasury ?? 0;
    const amount = FACILITY_DEFINITIONS.treasury.tiers[tier]?.dailyStipend || 0;
    if (player) {
      player.zeny = (player.zeny || 0) + amount;
    }
    lastStipendClaimAt = now();
    return { success: true, zeny: amount };
  }

  function getPassiveModifiers() {
    const treasuryTier = facilities.treasury ?? 0;
    const forgeTier = facilities.forge ?? 0;
    const conservatoryTier = facilities.conservatory ?? 0;
    const trainingTier = facilities.training ?? 0;

    const treasuryData = FACILITY_DEFINITIONS.treasury.tiers[treasuryTier] || {};
    const forgeData = FACILITY_DEFINITIONS.forge.tiers[forgeTier] || {};
    const conservatoryData = FACILITY_DEFINITIONS.conservatory.tiers[conservatoryTier] || {};
    const trainingData = FACILITY_DEFINITIONS.training.tiers[trainingTier] || {};

    return {
      expMult: trainingData.expMult ?? 1.0,
      skillExpMult: trainingData.skillExpMult ?? 1.0,
      zenyDropPct: treasuryData.zenyDropPct ?? 0,
      dmgPct: trainingData.dmgPct ?? 0,
      refineBonusPct: forgeData.refineBonusPct ?? 0,
      craftCostDiscountPct: forgeData.craftCostDiscountPct ?? 0,
      duplicateCraftChance: forgeData.duplicateCraftChance ?? 0,
      nodesCount: conservatoryData.nodesCount ?? 0,
      yieldBonusPct: conservatoryData.yieldBonusPct ?? 0,
    };
  }

  // --- Hall of Trophies Methods ---

  function getTrophies() {
    return { ...trophies };
  }

  function isPedestalSocketed(pedestalId) {
    return Boolean(trophies[pedestalId]);
  }

  function mountTrophy(pedestalId, player) {
    const def = TROPHY_PEDESTAL_DEFINITIONS[pedestalId];
    if (!def) return { success: false, reason: 'Invalid pedestal' };
    if (trophies[pedestalId]) return { success: false, reason: 'Pedestal already socketed' };

    const inv = player?.inventory || [];
    if (getItemQty(inv, def.targetTrophy) < def.trophyQty) {
      return { success: false, reason: 'Insufficient trophy items' };
    }

    removeItemFromInventory(inv, def.targetTrophy, def.trophyQty);
    trophies[pedestalId] = true;
    return { success: true };
  }

  function unmountTrophy(pedestalId, player) {
    const def = TROPHY_PEDESTAL_DEFINITIONS[pedestalId];
    if (!def) return { success: false, reason: 'Invalid pedestal' };
    if (!trophies[pedestalId]) return { success: false, reason: 'Pedestal not socketed' };

    trophies[pedestalId] = false;
    if (player?.inventory) {
      addItemToInventory(player.inventory, def.targetTrophy, def.trophyQty);
    }
    return { success: true };
  }

  function getTrophyAuras() {
    const auras = {
      maxHp: 0,
      physDef: 0,
      magicDef: 0,
      critChance: 0,
      critDmg: 0,
      dmgPct: 0,
      moveSpdPct: 0,
      cooldownRecoveryPct: 0,
      lootBias: 0,
      res_fire: 0,
      res_nature: 0,
      res_void: 0,
      res_holy: 0,
      allStats: 0,
      matk: 0,
    };

    for (const [id, def] of Object.entries(TROPHY_PEDESTAL_DEFINITIONS)) {
      if (trophies[id] && def.perks) {
        for (const [key, val] of Object.entries(def.perks)) {
          if (key in auras) {
            auras[key] += val;
          } else {
            auras[key] = val;
          }
        }
      }
    }

    return auras;
  }

  // --- Crystal Siege State Machine ---

  function startSiege() {
    const wave1 = SIEGE_WAVE_TEMPLATES[0];
    const foesCount = wave1 ? wave1.foes.reduce((sum, f) => sum + f.count, 0) : 6;
    activeSiege = {
      active: true,
      wave: 1,
      crystalHp: 15000,
      maxCrystalHp: 15000,
      defeatedFoes: 0,
      totalWaveFoes: foesCount,
      startedAt: now(),
    };
    return activeSiege;
  }

  function getSiegeState() {
    return activeSiege;
  }

  function damageCrystal(amount) {
    if (!activeSiege) return 0;
    activeSiege.crystalHp = Math.max(0, activeSiege.crystalHp - amount);
    if (activeSiege.crystalHp <= 0) {
      failSiege();
    }
    return activeSiege.crystalHp;
  }

  function advanceSiegeWave() {
    if (activeSiege && activeSiege.wave < 3) {
      activeSiege.wave += 1;
      const waveTemplate = SIEGE_WAVE_TEMPLATES.find(t => t.wave === activeSiege.wave);
      activeSiege.totalWaveFoes = waveTemplate ? waveTemplate.foes.reduce((sum, f) => sum + f.count, 0) : 0;
      activeSiege.defeatedFoes = 0;
    }
    return activeSiege;
  }

  function resolveSiegeVictory() {
    if (!activeSiege) return { success: false, reason: 'No active siege' };
    const hpRatio = activeSiege.crystalHp / activeSiege.maxCrystalHp;
    let grade = 'B';
    if (hpRatio >= 0.80) {
      grade = 'S';
    } else if (hpRatio >= 0.50) {
      grade = 'A';
    }
    const reward = SIEGE_REWARDS[grade];
    activeSiege.active = false;
    lastSiegeEndAt = now();
    return {
      success: true,
      grade,
      ...reward,
      crystalHp: activeSiege.crystalHp,
    };
  }

  function failSiege() {
    if (activeSiege) {
      activeSiege.active = false;
      activeSiege.failure = true;
      activeSiege.cooldownUntil = now() + 60000;
    }
    lastSiegeEndAt = now();
    return { success: false, reason: 'Crystal Shattered' };
  }

  // --- Serialization ---

  // ms left before another siege may start (0 = ready)
  function siegeCooldownLeft(cooldownMs) {
    return lastSiegeEndAt ? Math.max(0, lastSiegeEndAt + cooldownMs - now()) : 0;
  }

  function serialize() {
    return {
      lastSiegeEndAt,
      facilities: { ...facilities },
      trophies: { ...trophies },
      lastStipendClaimAt,
    };
  }

  function deserialize(data) {
    if (data && typeof data === 'object') {
      if (data.facilities && typeof data.facilities === 'object') {
        for (const k of ['treasury', 'forge', 'conservatory', 'training']) {
          if (typeof data.facilities[k] === 'number') {
            facilities[k] = Math.max(0, Math.min(3, data.facilities[k]));
          }
        }
      }
      if (data.trophies && typeof data.trophies === 'object') {
        for (const k of Object.keys(trophies)) {
          if (k in data.trophies) {
            trophies[k] = Boolean(data.trophies[k]);
          }
        }
      }
      if (Number.isFinite(data.lastSiegeEndAt) && data.lastSiegeEndAt >= 0) lastSiegeEndAt = data.lastSiegeEndAt;
      if (typeof data.lastStipendClaimAt === 'number') {
        lastStipendClaimAt = data.lastStipendClaimAt;
      }
    }
  }

  return {
    facilities,
    trophies,
    harvestNodes,
    getFacilities,
    getFacilityTier,
    canUpgradeFacility,
    upgradeFacility,
    canClaimDailyStipend,
    claimDailyStipend,
    getPassiveModifiers,
    getTrophies,
    isPedestalSocketed,
    mountTrophy,
    unmountTrophy,
    getTrophyAuras,
    startSiege,
    getSiegeState,
    damageCrystal,
    advanceSiegeWave,
    resolveSiegeVictory,
    failSiege,
    serialize,
    deserialize,
    siegeCooldownLeft,
  };
}
