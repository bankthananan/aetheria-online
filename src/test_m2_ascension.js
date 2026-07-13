// Verification Script for M2 Ascension, Combat Modifiers, Healer Bot, and Data Integrity Fix

// 1. Setup Node.js global environment mocks
const audioParam = {
  setValueAtTime: () => {},
  exponentialRampToValueAtTime: () => {},
  linearRampToValueAtTime: () => {},
  setValueCurveAtTime: () => {},
};

const dummyNode = {
  connect: () => {},
  gain: audioParam,
  frequency: audioParam,
  Q: audioParam,
  start: () => {},
  stop: () => {},
};

globalThis.window = {
  AudioContext: class {
    constructor() {
      this.currentTime = 0;
      this.sampleRate = 44100;
      this.state = 'suspended';
    }
    createGain() { return dummyNode; }
    createOscillator() { return dummyNode; }
    createBuffer(channels, size, rate) {
      return {
        getChannelData: () => new Float32Array(size)
      };
    }
    createBufferSource() {
      return {
        buffer: null,
        connect: () => {},
        start: () => {},
        stop: () => {},
      };
    }
    createBiquadFilter() { return dummyNode; }
    resume() {
      this.state = 'running';
      return Promise.resolve();
    }
  },
  webkitAudioContext: class {},
  addEventListener: () => {},
  removeEventListener: () => {},
};

globalThis.document = {
  getElementById: () => null,
  createElement: () => ({
    getContext: () => ({
      beginPath: () => {},
      arc: () => {},
      strokeRect: () => {},
      fillRect: () => {},
      moveTo: () => {},
      stroke: () => {},
      quadraticCurveTo: () => {},
      fillText: () => {},
      measureText: () => ({ width: 10 }),
      createLinearGradient: () => ({ addColorStop: () => {} }),
    }),
  }),
};

globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
};

globalThis.requestAnimationFrame = (callback) => 1;

globalThis.performance = {
  now: () => Date.now(),
};

import assert from 'assert';
import { GameState } from './state.js';
import { GameEngine } from './engine.js';
import { CLASSES, MONSTERS, ITEMS, SKILL_TREE } from './database.js';

globalThis.SKILL_TREE = SKILL_TREE;

console.log("=== RUNNING MILESTONE 2 VERIFICATION ===");

// Helper to create a clean setup
function setup() {
  const state = new GameState();
  state.recalculateStats();
  const canvas = {
    getContext: () => ({
      beginPath: () => {},
      arc: () => {},
      strokeRect: () => {},
      fillRect: () => {},
      moveTo: () => {},
      stroke: () => {},
      quadraticCurveTo: () => {},
      fillText: () => {},
      measureText: () => ({ width: 10 }),
      createLinearGradient: () => ({ addColorStop: () => {} }),
    }),
    addEventListener: () => {},
    removeEventListener: () => {},
    width: 800,
    height: 600,
  };
  const engine = new GameEngine(canvas, state, () => {}, () => {});
  engine.monsters = [];
  engine.projectiles = [];
  return { state, engine };
}

// 1. Test Ascension Logic
{
  console.log("\n[TEST 1] Verifying ascension requirements...");
  const { state } = setup();

  // Set class to lord_knight (T3)
  state.character.classId = 'lord_knight';
  state.recalculateStats();

  // Initial check should fail (levels are low, no token)
  state.character.baseLevel = 70;
  state.character.jobLevel = 40;
  state.character.inventory['dragon_hunt_trial_proof'] = 0;
  let check = state.canUpClass('dragon_knight');
  assert.strictEqual(check.success, false, "Ascension should fail with base lvl 70 and job lvl 40");
  assert.match(check.reason, /Requires Base Lv. 75 and Job Lv. 50/, "Error message should mention level requirements");

  // Bump levels, still no token
  state.character.baseLevel = 75;
  state.character.jobLevel = 50;
  check = state.canUpClass('dragon_knight');
  assert.strictEqual(check.success, false, "Ascension should fail without trial proof token or quest completion");
  assert.match(check.reason, /Requires Dragon Hunt Trial Proof or completed quest "Dragon Hunt Trial"/, "Error message should mention quest requirements");

  // Give token
  state.character.inventory['dragon_hunt_trial_proof'] = 1;
  check = state.canUpClass('dragon_knight');
  assert.strictEqual(check.success, true, "Ascension should pass when requirements are met");

  // Test promotion and item consumption
  const promoteRes = state.promoteClass('dragon_knight');
  assert.strictEqual(promoteRes.success, true, "Promotion should be successful");
  assert.strictEqual(state.character.classId, 'dragon_knight', "Class should be updated to dragon_knight");
  assert.strictEqual(state.character.inventory['dragon_hunt_trial_proof'] || 0, 0, "Dragon Hunt Trial Proof should be consumed");
  console.log("✓ Ascension logic requirements and token consumption verified successfully.");
}

// 2. Test Combat Modifiers
{
  console.log("\n[TEST 2] Verifying combat damage scaling (deals +50%, receives -30%)...");
  const { state, engine } = setup();

  state.character.classId = 'dragon_knight';
  state.character.mounted = true;
  state.character.equipment.mount = { id: 'fire_drake' };
  state.atk = 100;
  state.critical = 0;

  // Mock Math.random to avoid crit/double-attack/misses
  const originalRandom = Math.random;
  Math.random = () => 0.1;

  // Target a non-dragon monster first
  const normalTarget = {
    id: 'mob_normal',
    name: 'Normal Monster',
    pixelX: 100, pixelY: 100, gridX: 2, gridY: 2,
    hp: 1000, maxHp: 1000, def: 10, flee: 0
  };
  engine.player.attackTarget = normalTarget;
  engine.performPhysicalAttack();
  // Fire Drake mounted: 100 * 1.15 = 115. def = 10. Damage = 105. Normal target hp = 1000 - 105 = 895.
  // Wait! Floating point: Math.floor(100 * 1.15) is 114 or 115 depending on JS precision.
  // Let's check normalTarget hp
  const dmgNormal = 1000 - normalTarget.hp;
  console.log(`Dealt ${dmgNormal} damage to non-dragon monster`);

  // Target a dragon monster
  const dragonTarget = {
    id: 'mob_dragon',
    name: 'Red Fire Dragon',
    pixelX: 100, pixelY: 100, gridX: 2, gridY: 2,
    hp: 1000, maxHp: 1000, def: 10, flee: 0,
    type: 'dragon'
  };
  engine.player.attackTarget = dragonTarget;
  engine.performPhysicalAttack();
  const dmgDragon = 1000 - dragonTarget.hp;
  console.log(`Dealt ${dmgDragon} damage to dragon monster`);

  // Assert deals +50% (+50% means dmgDragon is Math.floor(dmgNormal * 1.5))
  assert.strictEqual(dmgDragon, Math.floor(dmgNormal * 1.5), "Dealt damage to dragon monster should be scaled by 1.5");

  // Verify damage received reduction (-30% => receives 70% damage)
  // Let's test non-dragon attacker
  const normalAttacker = {
    id: 'normal_atk', name: 'Normal Attacker',
    atk: 100, hit: 100
  };
  state.def = 10;
  state.playerHp = 1000;
  engine.performMonsterAttack(normalAttacker);
  const dmgRecNormal = 1000 - state.playerHp;
  console.log(`Received ${dmgRecNormal} damage from normal monster`);

  // Test dragon attacker
  const dragonAttacker = {
    id: 'dragon_atk', name: 'Dragon Attacker',
    atk: 100, hit: 100,
    type: 'dragon'
  };
  state.playerHp = 1000;
  engine.performMonsterAttack(dragonAttacker);
  const dmgRecDragon = 1000 - state.playerHp;
  console.log(`Received ${dmgRecDragon} damage from dragon monster`);

  // Assert receives -30% (-30% means dmgRecDragon is Math.floor(dmgRecNormal * 0.7))
  assert.strictEqual(dmgRecDragon, Math.floor(dmgRecNormal * 0.7), "Received damage from dragon monster should be scaled by 0.7");

  Math.random = originalRandom;
  console.log("✓ Combat modifiers (+50% dealt, -30% received) verified successfully.");
}

// 3. Test Healer Bot Support
{
  console.log("\n[TEST 3] Verifying healer bot support for dragon_shaman class...");
  const { state, engine } = setup();

  // Spawn a dragon_shaman bot
  const shamanBot = {
    id: 'bot_shaman',
    name: 'Shaman Bot',
    classId: 'dragon_shaman',
    gridX: 5, gridY: 4, // stands near player (5, 5)
    lastAction: 0,
    actionCooldown: 1000,
    combatTarget: null,
    path: []
  };
  engine.simulatedPlayers = [shamanBot];

  // Set player HP to low value to trigger heal (max HP is 180, so < 90)
  state.playerHp = 50;
  
  const originalRandom = Math.random;
  Math.random = () => 0.9;

  console.log("DEBUG BEFORE BOT ACTION:", { playerHp: state.playerHp, maxHp: state.maxHp, shamanBot });

  // Call bot simulated action
  engine.updateSimulatedPlayers(100);

  Math.random = originalRandom;

  console.log("DEBUG AFTER BOT ACTION:", { playerHp: state.playerHp });

  // Assert player was healed
  assert.ok(state.playerHp > 50, "Player should be healed by dragon_shaman bot");
  console.log(`✓ Healer bot support for dragon_shaman verified successfully (Player Hp healed to ${state.playerHp}).`);
}

// 4. Test Data Integrity Magic Damage NaN bug
{
  console.log("\n[TEST 4] Verifying magic damage doesn't throw NaN for monsters lacking mdef...");
  const { state, engine } = setup();

  state.character.classId = 'high_wizard';
  state.recalculateStats();
  state.matk = 100;

  // Spore lacks mdef property in database. Let's spawn spore or create a target that has no mdef
  const targetNoMdef = {
    id: 'mob_no_mdef',
    name: 'Poring No Mdef',
    pixelX: 100, pixelY: 100, gridX: 2, gridY: 2,
    hp: 1000, maxHp: 1000, def: 5, flee: 0
    // no mdef defined!
  };

  // Perform magic bolt skill (level 5)
  const skillIndex = SKILL_TREE.mage.findIndex(s => s.id === 'fire_bolt');
  assert.ok(skillIndex !== -1, "Fire Bolt skill should exist in mage skill tree");
  
  // Cast skill
  engine.executeOffensiveSkill(SKILL_TREE.mage[skillIndex], 5, targetNoMdef);

  // Assert target's HP is not NaN, meaning it has successfully deducted health
  assert.ok(!isNaN(targetNoMdef.hp), "Target HP must not be NaN after magic attack");
  assert.ok(targetNoMdef.hp < 1000, "Target HP should be reduced after magic attack");
  console.log(`✓ Data Integrity Fix verified successfully: magic damage calculated correctly (Target HP: ${targetNoMdef.hp}).`);
}

console.log("\n=== ALL ASCENSION & MODIFIER TESTS PASSED SUCCESSFULLY! ===");
process.exit(0);
