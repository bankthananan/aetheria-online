// Automated Verification Script for Mounted Active Skills and Combat Mechanics

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

// 2. Import modules
import { GameState } from './state.js';
import { GameEngine } from './engine.js';
import { SKILL_TREE } from './database.js';

// Attach SKILL_TREE to globalThis because engine.js misses importing it!
globalThis.SKILL_TREE = SKILL_TREE;


// Test runner helper
const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

// Global logger to collect logged messages
let loggedMessages = [];
const logCallback = (msg, type) => {
  loggedMessages.push({ msg, type });
};

// Helper to create fresh GameState and GameEngine instances
function setup() {
  loggedMessages = [];
  const state = new GameState();
  
  // Set starting stats/state to have enough HP/SP and levels
  state.character.baseLevel = 80;
  state.character.stats.vit = 20;
  state.character.stats.str = 20;
  state.character.stats.dex = 20;
  state.character.stats.int = 20;
  state.character.skills = {};
  state.playerHp = 1000;
  state.playerSp = 500;
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

  const engine = new GameEngine(canvas, state, logCallback, () => {});
  
  // Clear default auto-spawned monsters to have controlled combat tests
  engine.monsters = [];
  engine.projectiles = [];
  
  return { state, engine };
}

// Helper to find skill index
function getSkillIndex(classId, skillId) {
  const activeSkills = (SKILL_TREE[classId] || []).filter(s => s.type === 'active');
  return activeSkills.findIndex(s => s.id === skillId);
}

// --- Test Case 1: Casting checks ---
test("Casting checking: Mounted active skills can only be cast while mounted", () => {
  const { state, engine } = setup();
  
  // Make sure player is swordman class (has access to knight skills later, or just set to knight)
  state.character.classId = 'knight';
  state.character.skills['dragon_breath'] = 1;
  state.recalculateStats();
  
  // Verify skill index
  const skillIdx = getSkillIndex('knight', 'dragon_breath');
  if (skillIdx === -1) {
    throw new Error("Dragon Breath skill index not found for Knight");
  }

  // 1. Cast while on foot (mounted = false)
  state.character.mounted = false;
  state.playerSp = 100;
  
  engine.castSkill(skillIdx);
  
  // Assert: cast failed, warning message logged, SP not consumed
  const warningMsg = loggedMessages.find(log => log.type === 'error');
  if (!warningMsg) {
    throw new Error("No warning message logged when casting Dragon Breath on foot");
  }
  if (!warningMsg.msg.includes("must be mounted")) {
    throw new Error(`Unexpected error message: ${warningMsg.msg}`);
  }
  if (state.playerSp !== 100) {
    throw new Error(`SP was consumed: expected 100, got ${state.playerSp}`);
  }

  // 2. Cast while mounted
  state.character.mounted = true;
  state.character.equipment.mount = { id: 'fire_drake' }; // Equip fire_drake mount
  
  // Add a target monster close to the player
  engine.monsters = [{
    id: 'test_mob',
    name: 'Test Monster',
    gridX: 5,
    gridY: 6,
    pixelX: 5 * 40 + 20,
    pixelY: 6 * 40 + 20,
    hp: 1000,
    maxHp: 1000,
    def: 10,
    mdef: 10,
    atk: 10
  }];
  engine.player.attackTarget = engine.monsters[0];
  
  loggedMessages = []; // Reset logs
  engine.castSkill(skillIdx);
  
  // Assert: cast succeeded, SP consumed, combat message logged
  const combatLog = loggedMessages.find(log => log.type === 'combat-log');
  if (!combatLog) {
    throw new Error("No combat log recorded after successful cast while mounted");
  }
  if (state.playerSp >= 100) {
    throw new Error(`SP was not consumed after casting: expected <100, got ${state.playerSp}`);
  }
});

// --- Test Case 2: Knight's Dragon Breath ---
test("Knight's Dragon Breath: deals fire damage to target and splash damage to adjacent monsters", () => {
  const { state, engine } = setup();
  
  state.character.classId = 'knight';
  state.character.skills['dragon_breath'] = 1;
  state.character.mounted = true;
  state.character.equipment.mount = { id: 'fire_drake' };
  
  // Set player ATK to exactly 100 for easy validation
  // atk = Math.floor((eqAtk + str + Math.floor(dex / 5) + Math.floor(luk / 3)) * atkMultiplier);
  // To get exactly 100, let's override state.atk directly after recalculation
  state.recalculateStats();
  state.atk = 100;

  // Monsters layout:
  // - Target monster: at (5, 6), distance 1 from player (5, 5). Max distance is 2.
  // - Splash monster: at (6, 6), adjacent to target (5, 6)
  // - Safe monster: at (10, 10), far away
  const targetMob = {
    id: 'target',
    name: 'Target Mob',
    gridX: 5,
    gridY: 6,
    pixelX: 5 * 40 + 20,
    pixelY: 6 * 40 + 20,
    hp: 1000,
    maxHp: 1000,
    def: 10,
    mdef: 10,
  };
  const splashMob = {
    id: 'splash',
    name: 'Splash Mob',
    gridX: 6,
    gridY: 6,
    pixelX: 6 * 40 + 20,
    pixelY: 6 * 40 + 20,
    hp: 500,
    maxHp: 500,
    def: 5,
    mdef: 5,
  };
  const safeMob = {
    id: 'safe',
    name: 'Safe Mob',
    gridX: 10,
    gridY: 10,
    pixelX: 10 * 40 + 20,
    pixelY: 10 * 40 + 20,
    hp: 500,
    maxHp: 500,
    def: 5,
    mdef: 5,
  };
  
  engine.monsters = [targetMob, splashMob, safeMob];
  engine.player.attackTarget = targetMob;

  const skillIdx = getSkillIndex('knight', 'dragon_breath');
  engine.castSkill(skillIdx);

  // Assert Target damage:
  // Base damage = Math.floor(atk * (2.0 + lvl * 0.5)) = Math.floor(100 * (2.0 + 1 * 0.5)) = 250
  // Target defense = 10
  // Final damage = 250 - 10 = 240
  // Expected target hp = 1000 - 240 = 760
  if (targetMob.hp !== 760) {
    throw new Error(`Target Mob hp mismatch: expected 760, got ${targetMob.hp}`);
  }

  // Assert Splash damage:
  // Splash damage = Math.floor(damage * 0.5) = Math.floor(250 * 0.5) = 125
  // Splash defense = 5
  // Final splash damage = 125 - 5 = 120
  // Expected splash hp = 500 - 120 = 380
  if (splashMob.hp !== 380) {
    throw new Error(`Splash Mob hp mismatch: expected 380, got ${splashMob.hp}`);
  }

  // Assert Safe monster damage: remains 500
  if (safeMob.hp !== 500) {
    throw new Error(`Safe Mob hp mismatch: expected 500, got ${safeMob.hp}`);
  }
});

// --- Test Case 3: Hunter's Mounted Barrage ---
test("Hunter's Mounted Barrage: fires rapid volley of 5 projectiles striking the target", () => {
  const { state, engine } = setup();
  
  state.character.classId = 'hunter';
  state.character.skills['mounted_barrage'] = 1;
  state.character.mounted = true;
  state.character.equipment.mount = { id: 'wind_wyvern' };
  
  state.recalculateStats();
  state.atk = 100;

  const targetMob = {
    id: 'target',
    name: 'Target Mob',
    gridX: 5,
    gridY: 6,
    pixelX: 5 * 40 + 20,
    pixelY: 6 * 40 + 20,
    hp: 1000,
    maxHp: 1000,
    def: 10,
    mdef: 10,
  };
  
  engine.monsters = [targetMob];
  engine.player.attackTarget = targetMob;

  const skillIdx = getSkillIndex('hunter', 'mounted_barrage');
  engine.castSkill(skillIdx);

  // Assert Projectiles fired: should be 5
  if (engine.projectiles.length !== 5) {
    throw new Error(`Projectiles count mismatch: expected 5, got ${engine.projectiles.length}`);
  }

  // Assert projectile details (should be color '#facc15' and speed 14)
  for (let i = 0; i < 5; i++) {
    const proj = engine.projectiles[i];
    if (proj.color !== '#facc15') {
      throw new Error(`Projectile ${i} color mismatch: expected #facc15, got ${proj.color}`);
    }
    if (proj.speed !== 14) {
      throw new Error(`Projectile ${i} speed mismatch: expected 14, got ${proj.speed}`);
    }
  }

  // Assert damage:
  // Hits = 5
  // Base damage = Math.floor(atk * (0.6 + lvl * 0.15)) = Math.floor(100 * (0.6 + 0.15)) = 75
  // Total damage = 75 * 5 = 375
  // Damage after defense = Math.max(1, 375 - target.def) = 375 - 10 = 365
  // Expected target hp = 1000 - 365 = 635
  if (targetMob.hp !== 635) {
    throw new Error(`Target Mob hp mismatch: expected 635, got ${targetMob.hp}`);
  }
});

// --- Test Case 4: Shaman/Priest's Draconic Shield ---
test("Priest's Draconic Shield: heals, reduces incoming damage, and removes upon dismounting", () => {
  const { state, engine } = setup();
  
  state.character.classId = 'priest';
  state.character.skills['draconic_shield'] = 1;
  state.character.mounted = true;
  state.character.equipment.mount = { id: 'earth_wyrm' };
  
  // Set player VIT to 20
  state.character.stats.vit = 20;
  state.recalculateStats();

  // Set current player HP to 100 (well below maxHp)
  state.playerHp = 100;
  
  const skillIdx = getSkillIndex('priest', 'draconic_shield');
  
  // Cast Draconic Shield
  engine.castSkill(skillIdx);

  // Assert: Caster healed
  // healAmt = Math.floor(150 + lvl * 45 + vit * 3) = Math.floor(150 + 45 + 60) = 255
  // Expected playerHp = 100 + 255 = 355
  if (state.playerHp !== 355) {
    throw new Error(`Player HP mismatch after heal: expected 355, got ${state.playerHp}`);
  }

  // Assert: Buff is active
  const buff = engine.player.buffs['draconic_shield'];
  if (!buff) {
    throw new Error("Draconic Shield buff is not active after casting");
  }
  if (buff.lvl !== 1) {
    throw new Error(`Draconic Shield buff lvl mismatch: expected 1, got ${buff.lvl}`);
  }

  // Assert: Damage reduction (22% reduction at level 1)
  // Mock Math.random to guarantee monster hits player (avoid missing)
  const originalRandom = Math.random;
  Math.random = () => 0.0; // Force roll to 0.0, ensuring it is <= hitChance (hit!)
  
  const monster = {
    id: 'mob',
    name: 'Strong Monster',
    hit: 100,
    atk: 100, // Monster attack
  };
  
  // Set player defense to 10
  state.def = 10;
  state.playerHp = 500; // Reset player HP
  
  engine.performMonsterAttack(monster);
  
  // Restore Math.random
  Math.random = originalRandom;

  // Base damage = max(1, monster.atk - state.def) = 100 - 10 = 90
  // Level 1 reduction = 0.20 + 0.02 * 1 = 0.22 (22%)
  // Reduced damage = Math.floor(90 * 0.78) = 70
  // Expected player HP = 500 - 70 = 430
  const expectedHp = 430;
  if (state.playerHp !== expectedHp) {
    throw new Error(`Damage reduction check failed: expected player HP to be ${expectedHp}, got ${state.playerHp}`);
  }

  // Assert: Active buff should be removed upon dismounting
  // Dismount the player
  state.character.mounted = false;
  
  // Trigger updatePlayer tick or stat recalculation to check if engine updates buffs accordingly
  engine.updatePlayer(100);

  const buffAfterDismount = engine.player.buffs['draconic_shield'];
  if (buffAfterDismount) {
    throw new Error("BUG FOUND: Draconic Shield active buff is NOT removed upon dismounting!");
  }
});

// --- Test Case 5: Draconic Shield SP Drain ---
test("Priest's Draconic Shield SP Drain: drains SP over time and deactivates when SP hits 0", () => {
  const { state, engine } = setup();
  
  state.character.classId = 'priest';
  state.character.skills['draconic_shield'] = 1;
  state.character.mounted = true;
  state.character.equipment.mount = { id: 'earth_wyrm' };
  
  state.recalculateStats();
  state.playerSp = 100; // Enough SP to cast
  
  const skillIdx = getSkillIndex('priest', 'draconic_shield');
  
  // Cast Draconic Shield
  engine.castSkill(skillIdx);
  
  // Ensure the buff is active
  if (!engine.player.buffs['draconic_shield']) {
    throw new Error("Draconic Shield buff did not apply.");
  }
  
  // Set SP to exactly 5
  state.playerSp = 5;
  
  // Set lastShieldDrainTime to 1000ms ago to trigger drain immediately on update
  engine.player.lastShieldDrainTime = Date.now() - 1000;
  
  // Level 1 shield drain: 2 + lvl = 2 + 1 = 3 SP
  engine.updatePlayer(100);
  
  if (state.playerSp !== 2) {
    throw new Error(`Expected SP to be 2 after 1 drain tick, got ${state.playerSp}`);
  }
  if (!engine.player.buffs['draconic_shield']) {
    throw new Error("Draconic Shield buff deactivated prematurely.");
  }
  
  // Next tick deactivates shield because remaining SP (2) is less than drain amount (3)
  engine.player.lastShieldDrainTime = Date.now() - 1000;
  engine.updatePlayer(100);
  
  if (state.playerSp !== 0) {
    throw new Error(`Expected SP to be 0 after second drain tick, got ${state.playerSp}`);
  }
  if (engine.player.buffs['draconic_shield']) {
    throw new Error("Draconic Shield buff is still active after SP hit 0.");
  }
});

// Run all tests
console.log("=== RUNNING COMBAT & MOUNTED SKILLS VERIFICATION ===");
let passedCount = 0;
let failedCount = 0;
const failures = [];

for (const t of tests) {
  try {
    t.fn();
    console.log(`[PASS] ${t.name}`);
    passedCount++;
  } catch (err) {
    console.log(`[FAIL] ${t.name}`);
    console.log(`       Reason: ${err.message}`);
    failures.push({ name: t.name, reason: err.message });
    failedCount++;
  }
}

console.log("\n=== TEST RESULTS SUMMARY ===");
console.log(`Passed: ${passedCount}/${tests.length}`);
console.log(`Failed: ${failedCount}/${tests.length}`);

if (failedCount > 0) {
  console.log("\nFailed tests details:");
  failures.forEach(f => {
    console.log(`- ${f.name}: ${f.reason}`);
  });
  process.exit(1);
} else {
  console.log("\nAll verification tests completed successfully!");
  process.exit(0);
}
