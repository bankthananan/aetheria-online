// Game State Manager
// Handles character parameters, stat distribution, leveling, skills, inventory, equipment, quests, and saving

import { CLASSES, ITEMS, QUESTS, SKILL_TREE } from './database.js';

// Calculate EXP requirements
export function getBaseExpRequired(level) {
  if (level >= 99) return Infinity;
  return Math.floor(Math.pow(level, 2.2) * 80 + level * 50 + 100);
}

export function getJobExpRequired(jobLevel, classId) {
  const maxJob = classId === 'novice' ? 10 : 50;
  if (jobLevel >= maxJob) return Infinity;
  return Math.floor(Math.pow(jobLevel, 2.0) * 50 + jobLevel * 30 + 50);
}

// Calculate the stat point cost for upgrading a stat (Ragnarok Online style)
export function getStatCost(val) {
  if (val >= 99) return Infinity;
  return Math.floor((val - 1) / 10) + 2;
}

// Helper to get item tier based on price
export function getItemTier(item) {
  if (!item) return 1;
  if (item.id === 'novice_knife') return 1;
  const price = item.price || 0;
  if (price >= 12000) return 3;
  if (price >= 1200) return 2;
  return 1;
}

export class GameState {
  constructor() {
    this.reset();
  }

  reset() {
    this.character = {
      name: 'Novice Hero',
      gender: 'male',
      appearance: {
        hair: 1,
        hairColor: '#eab308', // Gold
        clothColor: '#3b82f6', // Blue
        headgear: null
      },
      classId: 'novice',
      baseLevel: 1,
      jobLevel: 1,
      baseExp: 0,
      jobExp: 0,
      
      // Base stats
      stats: {
        str: 1,
        agi: 1,
        vit: 1,
        int: 1,
        dex: 1,
        luk: 1
      },
      
      statPoints: 10,
      skillPoints: 0,
      skills: {}, // e.g. { first_aid: 1 }
      
      zenny: 1000,
      inventory: {
        red_potion: 10,
        blue_potion: 5,
        novice_knife: 1
      },
      equipment: {
        weapon: { id: 'novice_knife', refine: 0, socketedCards: [] },
        shield: null,
        armor: null,
        headgear: null,
        mount: null
      },
      mounted: false,
      equipmentData: {
        novice_knife: { refine: 0, socketedCards: [] }
      },
      cardSlots: { weapon: [], shield: [], armor: [], headgear: [], mount: [] },
      activeQuests: {}, // { questId: { monsters: { poring: 2 }, items: {} } }
      completedQuests: {}, // { questId: true }
      guildRank: 'F', // Guild Adventure Rank: F, E, D, C, B, A, S
      guildRankProgress: 0,
    };
    
    this.currentBiome = 'prontera';
    this.playerHp = 150;
    this.playerSp = 20;
    
    // Auto-save key
    this.saveKey = 'isekai_mmo_rpg_save_v1';
  }

  // Save game to localStorage
  save() {
    try {
      const data = {
        character: this.character,
        currentBiome: this.currentBiome,
        playerHp: this.playerHp,
        playerSp: this.playerSp
      };
      localStorage.setItem(this.saveKey, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save game state', e);
    }
  }

  // Load game from localStorage
  load() {
    try {
      const dataStr = localStorage.getItem(this.saveKey);
      if (dataStr) {
        const data = JSON.parse(dataStr);
        this.character = { ...this.character, ...data.character };
        if (!this.character.equipmentData) {
          this.character.equipmentData = {};
        }
        if (this.character.mounted === undefined) {
          this.character.mounted = false;
        }
        if (!this.character.equipment) {
          this.character.equipment = {};
        }
        if (this.character.equipment.mount === undefined) {
          this.character.equipment.mount = null;
        }
        if (!this.character.cardSlots) {
          this.character.cardSlots = { weapon: [], shield: [], armor: [], headgear: [], mount: [] };
        }
        this.currentBiome = data.currentBiome || 'prontera';
        this.playerHp = data.playerHp !== undefined ? data.playerHp : this.playerHp;
        this.playerSp = data.playerSp !== undefined ? data.playerSp : this.playerSp;
        this.recalculateStats();
        return true;
      }
    } catch (e) {
      console.error('Failed to load game state', e);
    }
    this.recalculateStats();
    return false;
  }

  // Upgrade stat
  upgradeStat(statName) {
    const currentVal = this.character.stats[statName];
    if (currentVal >= 99) return false;
    const cost = getStatCost(currentVal);
    if (this.character.statPoints >= cost) {
      this.character.statPoints -= cost;
      this.character.stats[statName]++;
      this.recalculateStats();
      this.save();
      return true;
    }
    return false;
  }

  downgradeStat(statName) {
    const currentVal = this.character.stats[statName];
    if (currentVal <= 1) return false;
    const refund = getStatCost(currentVal - 1);
    this.character.statPoints += refund;
    this.character.stats[statName]--;
    this.recalculateStats();
    this.save();
    return true;
  }

  // Upgrade skill
  upgradeSkill(skillId) {
    if (this.character.skillPoints <= 0) return false;
    
    // Search both the novice base tree and the current class tree
    // (mirrors what renderSkillsPanel displays)
    const classSkills = SKILL_TREE[this.character.classId] || [];
    const allAvailable = this.character.classId === 'novice'
      ? classSkills
      : [...SKILL_TREE.novice, ...classSkills];
    const skill = allAvailable.find(s => s.id === skillId);
    if (!skill) return false;
    
    const currentLvl = this.character.skills[skillId] || 0;
    if (currentLvl >= skill.maxLevel) return false;
    
    // Check prerequisites
    if (skill.req) {
      for (const [reqId, reqLvl] of Object.entries(skill.req)) {
        if ((this.character.skills[reqId] || 0) < reqLvl) return false;
      }
    }
    
    this.character.skillPoints--;
    this.character.skills[skillId] = currentLvl + 1;
    this.recalculateStats();
    this.save();
    return true;
  }

  // Get current active/passive stats
  recalculateStats() {
    const c = this.character;
    const cls = CLASSES[c.classId] || CLASSES.novice;
    
    // Equipment stats
    let eqAtk = 0;
    let eqMatk = 0;
    let eqDef = 0;
    let eqMdef = 0;
    let critBonus = 0;
    let vitBonus = 0;
    let strBonus = 0;
    let dexBonus = 0;

    let atkMultiplier = 1.0;
    let cardHitBonus = 0;
    let cardFleeBonus = 0;
    let cardMdefBonus = 0;
    let cardHpBonus = 0;

    // Apply equipment, refinement, and card bonuses
    for (const slot of ['weapon', 'shield', 'armor', 'headgear', 'mount']) {
      const equip = c.equipment[slot];
      if (equip) {
        let itemId, refine, socketedCards;
        if (typeof equip === 'string') {
          itemId = equip;
          refine = 0;
          socketedCards = [];
          c.equipment[slot] = { id: itemId, refine, socketedCards };
        } else {
          itemId = equip.id;
          refine = equip.refine || 0;
          socketedCards = equip.socketedCards || [];
        }

        if (itemId && ITEMS[itemId]) {
          const item = ITEMS[itemId];
          if (item.atk) eqAtk += item.atk;
          if (item.matk) eqMatk += item.matk;
          if (item.def) eqDef += item.def;
          if (item.mdef) eqMdef += item.mdef;
          if (item.critChance) critBonus += item.critChance;
          if (item.vitBonus) vitBonus += item.vitBonus;
          if (item.strBonus) strBonus += item.strBonus;
          if (item.dexBonus) dexBonus += item.dexBonus;

          // Refine stats
          const tier = getItemTier(item);
          if (slot === 'weapon') {
            const refineBonus = refine * (tier === 1 ? 8 : 18);
            if (item.atk) eqAtk += refineBonus;
            if (item.matk) eqMatk += refineBonus;
          } else if (slot !== 'mount') {
            const refineBonus = refine * (tier === 1 ? 3 : 6);
            eqDef += refineBonus;
          }

          // Card stats
          for (const cardId of socketedCards) {
            if (cardId === 'poring_card') cardHpBonus += 150;
            else if (cardId === 'archer_skeleton_card') atkMultiplier += 0.10;
            else if (cardId === 'scorpion_card') cardHitBonus += 15;
            else if (cardId === 'familiar_card') cardFleeBonus += 12;
            else if (cardId === 'golden_bug_card') cardMdefBonus += 30;
          }
        }
      }
    }

    // Owl's Eye Passive: +1 DEX per level
    if (c.skills.owls_eye) {
      dexBonus += c.skills.owls_eye;
    }
    // Improve Dodge Passive: +3 Flee per level
    let dodgeFleeBonus = 0;
    if (c.skills.improve_dodge) {
      dodgeFleeBonus += c.skills.improve_dodge * 3;
    }

    const str = c.stats.str + strBonus;
    const agi = c.stats.agi;
    const vit = c.stats.vit + vitBonus;
    const int = c.stats.int;
    const dex = c.stats.dex + dexBonus;
    const luk = c.stats.luk;

    // HP & SP calculations
    this.maxHp = Math.floor(cls.baseHp + (vit * cls.hpPerVit) + (c.baseLevel * 18)) + cardHpBonus;
    this.maxSp = Math.floor(cls.baseSp + (int * cls.spPerInt) + (c.baseLevel * 4));
    
    // HP / SP skill expansions
    if (c.skills.meditatio) {
      this.maxSp = Math.floor(this.maxSp * (1 + c.skills.meditatio * 0.01));
    }

    if (c.mounted && c.equipment.mount) {
      const mountId = typeof c.equipment.mount === 'string' ? c.equipment.mount : c.equipment.mount.id;
      if (mountId === 'earth_wyrm') {
        this.maxHp += 300;
      }
    }

    // Ensure player current HP/SP does not exceed max
    if (this.playerHp > this.maxHp) this.playerHp = this.maxHp;
    if (this.playerSp > this.maxSp) this.playerSp = this.maxSp;

    // Base Combat Calculations
    this.atk = Math.floor((eqAtk + str + Math.floor(dex / 5) + Math.floor(luk / 3)) * atkMultiplier);
    this.matk = Math.floor(eqMatk + int + Math.floor(dex / 5) + Math.floor(luk / 3));
    this.def = Math.floor(eqDef + Math.floor(vit / 2));
    this.mdef = Math.floor(eqMdef + Math.floor(int / 2)) + cardMdefBonus;

    this.hit = Math.floor(c.baseLevel + dex + Math.floor(luk / 3) + 100) + cardHitBonus;
    this.flee = Math.floor(c.baseLevel + agi + Math.floor(luk / 5) + dodgeFleeBonus) + cardFleeBonus;

    if (c.mounted && c.equipment.mount) {
      const mountId = typeof c.equipment.mount === 'string' ? c.equipment.mount : c.equipment.mount.id;
      if (mountId === 'wind_wyvern') {
        this.flee += 15;
      } else if (mountId === 'earth_wyrm') {
        this.def += 25;
      }
    }
    
    // Critical Rate (e.g. 1% + LUK * 0.3 + Equip critical bonus)
    this.critical = Math.min(100, Math.floor(1 + (luk * 0.3) + critBonus));

    // Attack Speed (ASPD)
    // Novices start slow, high agi/dex speeds it up
    const weaponWeightPenalty = (c.equipment.weapon && (typeof c.equipment.weapon === 'string' ? c.equipment.weapon : c.equipment.weapon.id)) ? 10 : 0;
    const baseAspd = 150 - weaponWeightPenalty;
    const aspdMultiplier = Math.sqrt(agi * 11 + dex * 3) * 1.6;
    this.aspd = Math.floor(Math.min(190, baseAspd + aspdMultiplier));

    // Attack Interval in milliseconds (190 ASPD = 5 attacks/sec = 200ms delay)
    // Formula: cooldown = (200 - ASPD) * 20ms
    this.attackCooldown = Math.max(200, (200 - this.aspd) * 20);
  }

  // Add items to inventory
  addItem(itemId, count = 1) {
    if (!ITEMS[itemId]) return;
    if (this.character.inventory[itemId]) {
      this.character.inventory[itemId] += count;
    } else {
      this.character.inventory[itemId] = count;
    }
    
    // Track quest gathering
    this.trackQuestProgress('items', itemId, count);
    
    this.save();
  }

  // Remove items
  removeItem(itemId, count = 1) {
    if (!this.character.inventory[itemId]) return false;
    if (this.character.inventory[itemId] < count) return false;
    
    this.character.inventory[itemId] -= count;
    if (this.character.inventory[itemId] === 0) {
      delete this.character.inventory[itemId];
    }
    this.save();
    return true;
  }

  // Equip Item
  equipItem(itemId) {
    const item = ITEMS[itemId];
    if (!item || !this.character.inventory[itemId]) return false;

    // Check class requirement
    if (item.reqClass && item.reqClass !== 'any') {
      const currentClass = CLASSES[this.character.classId];
      // Allow exact match or if current class is a subclass (upclass chain)
      let allowed = currentClass.id === item.reqClass;
      if (!allowed && currentClass.reqClass) {
        allowed = currentClass.reqClass === item.reqClass;
      }
      if (!allowed && CLASSES[currentClass.reqClass]?.reqClass) {
        allowed = CLASSES[currentClass.reqClass].reqClass === item.reqClass;
      }
      
      if (!allowed) {
        return false;
      }
    }

    const slot = item.slot; // weapon, shield, armor, headgear
    if (!slot) return false;

    // Unequip current slot first
    this.unequipItem(slot);

    // Retrieve from equipmentData or initialize
    if (!this.character.equipmentData) {
      this.character.equipmentData = {};
    }
    if (!this.character.equipmentData[itemId]) {
      this.character.equipmentData[itemId] = {
        refine: 0,
        socketedCards: []
      };
    }
    const data = this.character.equipmentData[itemId];

    // Equip new item as object
    this.character.equipment[slot] = {
      id: itemId,
      refine: data.refine || 0,
      socketedCards: data.socketedCards || []
    };
    
    if (slot === 'mount') {
      this.character.mounted = true;
    }
    
    const c = this.character;
    if (!c.cardSlots) c.cardSlots = {};
    c.cardSlots[item.slot] = c.equipment[item.slot].socketedCards || [];
    
    this.recalculateStats();
    this.save();
    return true;
  }

  // Unequip slot
  unequipItem(slot) {
    const equipped = this.character.equipment[slot];
    if (equipped) {
      const itemId = typeof equipped === 'string' ? equipped : equipped.id;
      if (itemId) {
        if (!this.character.equipmentData) this.character.equipmentData = {};
        this.character.equipmentData[itemId] = {
          refine: equipped.refine || 0,
          socketedCards: equipped.socketedCards || []
        };
      }
      this.character.equipment[slot] = null;
      if (slot === 'mount') {
        this.character.mounted = false;
      }
      
      const c = this.character;
      if (!c.cardSlots) c.cardSlots = {};
      c.cardSlots[slot] = [];
      
      this.recalculateStats();
      this.save();
      return true;
    }
    return false;
  }

  // Refine Item in Slot
  refineItem(slot) {
    if (slot === 'mount') return { success: false, reason: "Mounts cannot be refined." };
    const c = this.character;
    const equip = c.equipment[slot];
    if (!equip) return { success: false, reason: 'No item equipped in this slot' };
    
    let itemId = typeof equip === 'string' ? equip : equip.id;
    let currentRefine = typeof equip === 'string' ? 0 : (equip.refine || 0);
    
    if (currentRefine >= 10) {
      return { success: false, reason: 'Item is already refined to +10' };
    }
    
    const matId = (slot === 'weapon') ? 'oridecon' : 'elunium';
    if (!c.inventory[matId] || c.inventory[matId] < 1) {
      return { success: false, reason: `Missing required material: ${ITEMS[matId]?.name || matId}` };
    }
    
    // Consume material
    this.removeItem(matId, 1);
    
    const targetRefine = currentRefine + 1;
    const rates = {
      1: 1.0, 2: 1.0, 3: 1.0, 4: 1.0,
      5: 0.80, 6: 0.65, 7: 0.50, 8: 0.35,
      9: 0.20, 10: 0.10
    };
    const successRate = rates[targetRefine] !== undefined ? rates[targetRefine] : 0.10;
    
    const roll = Math.random();
    if (roll <= successRate) {
      // Success!
      if (typeof c.equipment[slot] === 'string') {
        c.equipment[slot] = { id: itemId, refine: 1, socketedCards: [] };
      } else {
        c.equipment[slot].refine = targetRefine;
      }
      
      if (!c.equipmentData) c.equipmentData = {};
      if (!c.equipmentData[itemId]) {
        c.equipmentData[itemId] = { refine: 0, socketedCards: [] };
      }
      c.equipmentData[itemId].refine = targetRefine;
      
      this.recalculateStats();
      this.save();
      return { success: true, newRefine: targetRefine, itemId };
    } else {
      // Break!
      this.removeItem(itemId, 1);
      c.equipment[slot] = null;
      if (c.equipmentData && c.equipmentData[itemId]) {
        delete c.equipmentData[itemId];
      }
      
      this.recalculateStats();
      this.save();
      return { success: false, broken: true, itemId };
    }
  }

  // Socket Card into Slot Equipment
  socketCard(cardItemId, slot) {
    const c = this.character;
    const equip = c.equipment[slot];
    if (!equip) return { success: false, reason: 'No item equipped in this slot' };
    
    let itemId = typeof equip === 'string' ? equip : equip.id;
    const item = ITEMS[itemId];
    if (!item) return { success: false, reason: 'Equipped item template not found' };
    
    if (!c.inventory[cardItemId] || c.inventory[cardItemId] < 1) {
      return { success: false, reason: 'You do not own this card' };
    }
    
    const card = ITEMS[cardItemId];
    if (!card || card.type !== 'card') {
      return { success: false, reason: 'Invalid card item' };
    }
    
    if (card.cardSlot !== slot) {
      return { success: false, reason: `This card can only be socketed into ${card.cardSlot}` };
    }
    
    // Normalize slot equipment if string
    if (typeof c.equipment[slot] === 'string') {
      c.equipment[slot] = { id: itemId, refine: 0, socketedCards: [] };
    }
    
    const maxSlots = slot === 'weapon' ? 2 : 1;
    const socketed = c.equipment[slot].socketedCards || [];
    
    if (socketed.length >= maxSlots) {
      return { success: false, reason: 'No available card slots on this equipment' };
    }
    
    // Consume card
    this.removeItem(cardItemId, 1);
    
    // Add card to equipment
    if (!c.equipment[slot].socketedCards) {
      c.equipment[slot].socketedCards = [];
    }
    c.equipment[slot].socketedCards.push(cardItemId);
    c.cardSlots[slot] = c.equipment[slot].socketedCards;
    
    // Sync with equipmentData
    if (!c.equipmentData) c.equipmentData = {};
    if (!c.equipmentData[itemId]) {
      c.equipmentData[itemId] = { refine: 0, socketedCards: [] };
    }
    c.equipmentData[itemId].socketedCards = [...c.equipment[slot].socketedCards];
    
    this.recalculateStats();
    this.save();
    return { success: true, socketedCards: c.equipment[slot].socketedCards };
  }

  unsocketCard(slot, cardIdx) {
    const c = this.character;
    const equip = c.equipment[slot];
    if (!equip || !equip.socketedCards) return { success: false, reason: 'No item or cards in slot' };
    if (cardIdx < 0 || cardIdx >= equip.socketedCards.length) return { success: false, reason: 'Invalid card index' };
    
    const cardId = equip.socketedCards[cardIdx];
    equip.socketedCards.splice(cardIdx, 1);
    
    // Return card to inventory
    c.inventory[cardId] = (c.inventory[cardId] || 0) + 1;
    
    // Sync with equipmentData
    const itemId = equip.id;
    if (c.equipmentData && c.equipmentData[itemId]) {
      c.equipmentData[itemId].socketedCards = [...equip.socketedCards];
    }
    
    // Sync cardSlots
    if (!c.cardSlots) c.cardSlots = {};
    c.cardSlots[slot] = [...equip.socketedCards];
    
    this.recalculateStats();
    this.save();
    return { success: true, cardId };
  }

  // Use consumable item
  useItem(itemId) {
    if (this.playerHp <= 0) return false;
    const item = ITEMS[itemId];
    if (!item || item.type !== 'consumable' || !this.character.inventory[itemId]) return false;

    if (item.subType === 'heal_hp') {
      if (this.playerHp >= this.maxHp) return false;
      this.playerHp = Math.min(this.maxHp, this.playerHp + item.value);
    } else if (item.subType === 'heal_sp') {
      if (this.playerSp >= this.maxSp) return false;
      this.playerSp = Math.min(this.maxSp, this.playerSp + item.value);
    } else if (item.subType === 'heal_both') {
      if (this.playerHp >= this.maxHp && this.playerSp >= this.maxSp) return false;
      this.playerHp = Math.min(this.maxHp, this.playerHp + item.value);
      this.playerSp = Math.min(this.maxSp, this.playerSp + item.value);
    } else if (item.subType === 'teleport') {
      // Handled in canvas engine directly by setting random coords
      if (window.gameEngine) {
        window.gameEngine.teleportRandom();
      }
    } else if (item.subType === 'warp_town') {
      if (window.gameEngine) {
        window.gameEngine.changeBiome('prontera');
      }
    } else if (item.subType === 'hatch_egg') {
      const mounts = ['fire_drake', 'wind_wyvern', 'earth_wyrm'];
      const chosenMount = mounts[Math.floor(Math.random() * mounts.length)];
      this.removeItem(itemId, 1);
      this.addItem(chosenMount, 1);
      if (window.gameEngine) {
        window.gameEngine.onLog(`Hatch: The Dragon Egg cracked open! You obtained a [${ITEMS[chosenMount].name}]!`, 'lvl-up');
        window.gameEngine.spawnParticleEffect(window.gameEngine.player.pixelX, window.gameEngine.player.pixelY, '#facc15', 20);
      }
      this.save();
      return true;
    } else {
      return false;
    }

    this.removeItem(itemId, 1);
    this.save();
    return true;
  }

  // Gain Experience
  gainExp(base, job) {
    const c = this.character;
    
    // Gain Base Exp
    c.baseExp += base;
    let baseNeeded = getBaseExpRequired(c.baseLevel);
    let levelUps = 0;
    while (c.baseExp >= baseNeeded && c.baseLevel < 99) {
      c.baseExp -= baseNeeded;
      c.baseLevel++;
      c.statPoints += 3 + Math.floor(c.baseLevel / 5);
      levelUps++;
      baseNeeded = getBaseExpRequired(c.baseLevel);
    }

    // Gain Job Exp
    c.jobExp += job;
    let jobNeeded = getJobExpRequired(c.jobLevel, c.classId);
    const maxJob = c.classId === 'novice' ? 10 : 50;
    let jobLevelUps = 0;
    while (c.jobExp >= jobNeeded && c.jobLevel < maxJob) {
      c.jobExp -= jobNeeded;
      c.jobLevel++;
      c.skillPoints++;
      jobLevelUps++;
      jobNeeded = getJobExpRequired(c.jobLevel, c.classId);
    }

    this.recalculateStats();
    this.save();

    return {
      levelUp: levelUps > 0,
      jobLevelUp: jobLevelUps > 0,
      prevLevel: c.baseLevel - levelUps,
      newLevel: c.baseLevel,
      prevJobLevel: c.jobLevel - jobLevelUps,
      newJobLevel: c.jobLevel
    };
  }

  // Up Class system checks and triggers
  canUpClass(targetClassId) {
    const c = this.character;
    const currentClass = CLASSES[c.classId];
    const targetClass = CLASSES[targetClassId];
    
    if (!targetClass || !currentClass) return { success: false, reason: 'Invalid classes' };
    
    // Novice -> Tier 1
    if (currentClass.tier === 0 && targetClass.tier === 1) {
      if (c.baseLevel < 10 || c.jobLevel < 10) {
        return { success: false, reason: 'Requires Base Lv. 10 and Job Lv. 10' };
      }
      if (!c.inventory.novice_badge) {
        return { success: false, reason: 'Requires Novice Trial Proof (Complete Quest "Guild Novice Trial")' };
      }
      if (!currentClass.upClassTier.includes(targetClassId)) {
        return { success: false, reason: 'Cannot up-class to this path' };
      }
      return { success: true };
    }

    // Tier 1 -> Tier 2
    if (currentClass.tier === 1 && targetClass.tier === 2) {
      if (c.baseLevel < 40 || c.jobLevel < 40) {
        return { success: false, reason: 'Requires Base Lv. 40 and Job Lv. 40' };
      }
      if (!c.inventory.adventurer_license) {
        return { success: false, reason: 'Requires Guild Adventurer License (Complete Quest "Sograt Desert Survey")' };
      }
      if (targetClass.reqClass !== c.classId) {
        return { success: false, reason: `Target class requires ${CLASSES[targetClass.reqClass].name}` };
      }
      return { success: true };
    }

    // Tier 2 -> Tier 3
    if (currentClass.tier === 2 && targetClass.tier === 3) {
      if (c.baseLevel < 70 || c.jobLevel < 50) {
        return { success: false, reason: 'Requires Base Lv. 70 and Job Lv. 50' };
      }
      if (!c.inventory.peak_sigil) {
        return { success: false, reason: 'Requires Peak Achievement Sigil (Complete Quest "Mjolnir Icy Ascent")' };
      }
      if (targetClass.reqClass !== c.classId) {
        return { success: false, reason: `Target class requires ${CLASSES[targetClass.reqClass].name}` };
      }
      return { success: true };
    }

    // Tier 3 -> Tier 4 (Dragon Slayer Ascension)
    if (currentClass.tier === 3 && targetClass.tier === 4) {
      if (c.baseLevel < 75 || c.jobLevel < 50) {
        return { success: false, reason: 'Requires Base Lv. 75 and Job Lv. 50' };
      }
      const hasProof = c.inventory.dragon_hunt_trial_proof && c.inventory.dragon_hunt_trial_proof >= 1;
      const hasCompletedQuest = c.completedQuests['dragon_hunt_trial'];
      if (!hasProof && !hasCompletedQuest) {
        return { success: false, reason: 'Requires Dragon Hunt Trial Proof or completed quest "Dragon Hunt Trial"' };
      }
      if (targetClass.reqClass !== c.classId) {
        return { success: false, reason: `Target class requires ${CLASSES[targetClass.reqClass].name}` };
      }
      return { success: true };
    }

    return { success: false, reason: 'Condition not supported' };
  }

  promoteClass(targetClassId) {
    const check = this.canUpClass(targetClassId);
    if (!check.success) return check;

    // Deduct quest items if required
    const currentClass = CLASSES[this.character.classId];
    if (currentClass.tier === 0) {
      this.removeItem('novice_badge', 1);
    } else if (currentClass.tier === 1) {
      this.removeItem('adventurer_license', 1);
    } else if (currentClass.tier === 2) {
      this.removeItem('peak_sigil', 1);
    } else if (currentClass.tier === 3) {
      if (this.character.inventory.dragon_hunt_trial_proof && this.character.inventory.dragon_hunt_trial_proof >= 1) {
        this.removeItem('dragon_hunt_trial_proof', 1);
      }
    }

    // Promote class
    this.character.classId = targetClassId;
    this.character.jobLevel = 1;
    this.character.jobExp = 0;
    
    // Auto equip default tier weapon if user has it, otherwise spawn it
    const newClass = CLASSES[targetClassId];
    const starterWeaponId = newClass.allowedWeapons[0];
    if (starterWeaponId) {
      this.addItem(starterWeaponId, 1);
      this.equipItem(starterWeaponId);
    }

    this.recalculateStats();
    
    // Full heal on promotion
    this.playerHp = this.maxHp;
    this.playerSp = this.maxSp;
    
    this.save();
    
    return { success: true };
  }

  // Quest methods
  acceptQuest(questId) {
    const quest = QUESTS.find(q => q.id === questId);
    if (!quest) return false;
    
    if (this.character.activeQuests[questId]) return false; // Already accepted
    
    // Validate level requirements
    if (this.character.baseLevel < (quest.minLevel || 0)) {
      return false;
    }
    
    // Validate class requirements
    if (quest.reqClass && quest.reqClass !== 'any' && quest.reqClass !== this.character.classId) {
      return false;
    }
    if (this.character.completedQuests[questId] && questId !== 'novice_trial') {
      // Repeatable check, let's allow redoing everything except novice trial
    }

    const progress = {
      monsters: {},
      items: {},
      completed: false
    };

    // Initialize counts
    if (quest.targets.monsters) {
      for (const mobId of Object.keys(quest.targets.monsters)) {
        progress.monsters[mobId] = 0;
      }
    }

    // Check items already in inventory
    if (quest.targets.items) {
      for (const [itemId, reqCount] of Object.entries(quest.targets.items)) {
        const hasCount = this.character.inventory[itemId] || 0;
        progress.items[itemId] = Math.min(reqCount, hasCount);
      }
    }

    this.character.activeQuests[questId] = progress;
    this.save();
    return true;
  }

  trackQuestProgress(type, id, amount = 1) {
    let changed = false;
    for (const [questId, progress] of Object.entries(this.character.activeQuests)) {
      const quest = QUESTS.find(q => q.id === questId);
      if (!quest) continue;

      if (type === 'monsters' && quest.targets.monsters && quest.targets.monsters[id] !== undefined) {
        const required = quest.targets.monsters[id];
        const current = progress.monsters[id] || 0;
        if (current < required) {
          progress.monsters[id] = Math.min(required, current + amount);
          changed = true;
        }
      }
      
      if (type === 'items' && quest.targets.items && quest.targets.items[id] !== undefined) {
        const required = quest.targets.items[id];
        const current = progress.items[id] || 0;
        if (current < required) {
          progress.items[id] = Math.min(required, current + amount);
          changed = true;
        }
      }
    }

    if (changed) {
      this.save();
    }
  }

  checkQuestReadyToHandIn(questId) {
    const progress = this.character.activeQuests[questId];
    const quest = QUESTS.find(q => q.id === questId);
    if (!progress || !quest) return false;

    // Check monsters
    if (quest.targets.monsters) {
      for (const [mobId, count] of Object.entries(quest.targets.monsters)) {
        if ((progress.monsters[mobId] || 0) < count) return false;
      }
    }

    // Check items
    if (quest.targets.items) {
      for (const [itemId, count] of Object.entries(quest.targets.items)) {
        if ((this.character.inventory[itemId] || 0) < count) return false;
      }
    }

    return true;
  }

  completeQuest(questId) {
    if (!this.checkQuestReadyToHandIn(questId)) return false;

    const quest = QUESTS.find(q => q.id === questId);
    if (!quest) return false;

    // Deduct items
    if (quest.targets.items) {
      for (const [itemId, count] of Object.entries(quest.targets.items)) {
        this.removeItem(itemId, count);
      }
    }

    // Give rewards
    this.character.zenny += quest.rewards.zenny;
    
    // EXP
    this.gainExp(quest.rewards.exp, quest.rewards.jobExp);

    // Items
    if (quest.rewards.items) {
      for (const [itemId, count] of Object.entries(quest.rewards.items)) {
        this.addItem(itemId, count);
      }
    }

    // Mark as completed
    this.character.completedQuests[questId] = true;
    delete this.character.activeQuests[questId];
    
    // Boost Adventurer Guild Rank
    this.character.guildRankProgress += 15;
    if (this.character.guildRankProgress >= 100) {
      this.character.guildRankProgress = 0;
      const ranks = ['F', 'E', 'D', 'C', 'B', 'A', 'S'];
      const curIndex = ranks.indexOf(this.character.guildRank);
      if (curIndex < ranks.length - 1) {
        this.character.guildRank = ranks[curIndex + 1];
      }
    }

    this.save();
    return true;
  }
}
