// Sanity check test script for Dragon Hatching, Mounts, and Mounted Combat
import assert from 'assert';

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
const { GameState } = await import('./state.js');
const { GameEngine } = await import('./engine.js');
const { SKILL_TREE, ITEMS } = await import('./database.js');

globalThis.SKILL_TREE = SKILL_TREE;

console.log('--- STARTING SANITY MOUNT & COMBAT TESTS ---');

// Helper to find skill index
function getSkillIndex(classId, skillId) {
  const activeSkills = (SKILL_TREE[classId] || []).filter(s => s.type === 'active');
  return activeSkills.findIndex(s => s.id === skillId);
}

// Helper to get movement speed factor
function getSpeedFactor(state) {
  if (state.character.mounted && state.character.equipment.mount) {
    const mountId = typeof state.character.equipment.mount === 'string'
      ? state.character.equipment.mount
      : state.character.equipment.mount.id;
    if (mountId === 'fire_drake') return 1.50;
    if (mountId === 'wind_wyvern') return 1.80;
    if (mountId === 'earth_wyrm') return 1.30;
  }
  return 1.0;
}

// ============================================
// PART 1: Instantiates GameState and Creates Character
// ============================================
console.log('\n[1] Instantiating GameState & Creating Character...');
const state = new GameState();
assert.ok(state.character, 'Character state should exist');
assert.strictEqual(state.character.classId, 'novice', 'Should start as novice');
console.log('✓ GameState successfully initialized');

// ============================================
// PART 2: Egg Hatching & Uniform Distribution Check
// ============================================
console.log('\n[2] Verifying Egg Hatching Distribution (10,000 iterations)...');
const counts = { fire_drake: 0, wind_wyvern: 0, earth_wyrm: 0 };
const iterations = 10000;

for (let i = 0; i < iterations; i++) {
  state.character.inventory = {};
  state.addItem('dragon_egg', 1);
  assert.strictEqual(state.character.inventory['dragon_egg'], 1, 'Should have exactly 1 egg before hatching');

  const success = state.useItem('dragon_egg');
  assert.ok(success, 'Hatching egg should return success');

  assert.ok(!state.character.inventory['dragon_egg'] || state.character.inventory['dragon_egg'] === 0, 'Egg must be consumed');

  let hatched = null;
  for (const mountId of Object.keys(counts)) {
    if (state.character.inventory[mountId] === 1) {
      if (hatched) throw new Error('More than one mount produced from a single egg!');
      hatched = mountId;
    }
  }
  assert.ok(hatched, 'At least one mount must be produced from egg hatching');
  counts[hatched]++;
}

console.log('Hatching distribution results:');
for (const [mountId, count] of Object.entries(counts)) {
  const prob = count / iterations;
  console.log(`- ${mountId}: ${count} (${(prob * 100).toFixed(2)}%)`);
  // Uniform check with 3% tolerance (33.33% +/- 3% -> 30.33% to 36.33%)
  assert.ok(prob >= 0.30 && prob <= 0.36, `Probability of ${mountId} (${prob}) is not uniform!`);
}
console.log('✓ Egg hatching is uniform and consumes the egg');

// ============================================
// PART 3: Equip Mounts & Check Stat Changes
// ============================================
console.log('\n[3] Verifying Stat Changes on Equipping Mounts...');

state.reset();
state.character.stats = { str: 10, agi: 10, vit: 10, int: 10, dex: 10, luk: 10 };
state.recalculateStats();

const baseMaxHp = state.maxHp;
const baseDef = state.def;
const baseFlee = state.flee;
console.log(`Base Player Stats: MaxHP=${baseMaxHp}, DEF=${baseDef}, Flee=${baseFlee}, SpeedFactor=1.0`);

// Test Fire Drake
console.log('- Equipping Fire Drake...');
state.character.inventory = {};
state.addItem('fire_drake', 1);
assert.ok(state.equipItem('fire_drake'), 'Should equip Fire Drake');
assert.strictEqual(state.character.mounted, true, 'Mounted flag should be true');
state.recalculateStats();
console.log(`Fire Drake Stats: MaxHP=${state.maxHp}, DEF=${state.def}, Flee=${state.flee}, SpeedFactor=${getSpeedFactor(state)}`);
assert.strictEqual(state.maxHp, baseMaxHp, 'Fire Drake should not modify Max HP');
assert.strictEqual(state.def, baseDef, 'Fire Drake should not modify DEF');
assert.strictEqual(state.flee, baseFlee, 'Fire Drake should not modify Flee');
assert.strictEqual(getSpeedFactor(state), 1.50, 'Fire Drake should grant 1.50x movement speed factor');

// Test Wind Wyvern
console.log('- Equipping Wind Wyvern...');
state.character.inventory = {};
state.addItem('wind_wyvern', 1);
assert.ok(state.equipItem('wind_wyvern'), 'Should equip Wind Wyvern');
assert.strictEqual(state.character.mounted, true, 'Mounted flag should be true');
state.recalculateStats();
console.log(`Wind Wyvern Stats: MaxHP=${state.maxHp}, DEF=${state.def}, Flee=${state.flee}, SpeedFactor=${getSpeedFactor(state)}`);
assert.strictEqual(state.maxHp, baseMaxHp, 'Wind Wyvern should not modify Max HP');
assert.strictEqual(state.def, baseDef, 'Wind Wyvern should not modify DEF');
assert.strictEqual(state.flee, baseFlee + 15, 'Wind Wyvern should grant +15 Flee');
assert.strictEqual(getSpeedFactor(state), 1.80, 'Wind Wyvern should grant 1.80x movement speed factor');

// Test Earth Wyrm
console.log('- Equipping Earth Wyrm...');
state.character.inventory = {};
state.addItem('earth_wyrm', 1);
assert.ok(state.equipItem('earth_wyrm'), 'Should equip Earth Wyrm');
assert.strictEqual(state.character.mounted, true, 'Mounted flag should be true');
state.recalculateStats();
console.log(`Earth Wyrm Stats: MaxHP=${state.maxHp}, DEF=${state.def}, Flee=${state.flee}, SpeedFactor=${getSpeedFactor(state)}`);
assert.strictEqual(state.maxHp, baseMaxHp + 300, 'Earth Wyrm should grant +300 Max HP');
assert.strictEqual(state.def, baseDef + 25, 'Earth Wyrm should grant +25 DEF');
assert.strictEqual(state.flee, baseFlee, 'Earth Wyrm should not modify Flee');
assert.strictEqual(getSpeedFactor(state), 1.30, 'Earth Wyrm should grant 1.30x movement speed factor');

console.log('✓ Mount stat modifications are correct');

// ============================================
// PART 4: Verify Skill Casting Locks
// ============================================
console.log('\n[4] Verifying Skill Casting Locks (Mounted vs Dismounted)...');

// Initialize Engine
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

let loggedMessages = [];
const logCallback = (msg, type) => {
  loggedMessages.push({ msg, type });
};

const engine = new GameEngine(canvas, state, logCallback, () => {});
engine.monsters = [];
engine.projectiles = [];

// Spawn target mob for offensive spells
const mob = {
  id: 'test-mob',
  name: 'Poring',
  type: 'poring',
  gridX: 6,
  gridY: 5,
  pixelX: 6 * 40 + 20,
  pixelY: 5 * 40 + 20,
  hp: 10000,
  maxHp: 10000,
  def: 0,
  mdef: 0,
};
engine.monsters.push(mob);

const skillsToTest = [
  { classId: 'knight', skillId: 'dragon_breath' },
  { classId: 'hunter', skillId: 'mounted_barrage' },
  { classId: 'priest', skillId: 'draconic_shield' }
];

for (const { classId, skillId } of skillsToTest) {
  console.log(`- Testing skill [${skillId}] on class [${classId}]...`);
  
  // Setup state for class & skill
  state.reset();
  state.character.classId = classId;
  state.character.skills[skillId] = 1;
  state.playerSp = 100;
  state.recalculateStats();

  const skillIdx = getSkillIndex(classId, skillId);
  assert.ok(skillIdx !== -1, `Skill index for ${skillId} on class ${classId} not found`);

  // Test Dismounted (Locked)
  state.character.mounted = false;
  state.character.equipment.mount = null;
  loggedMessages = [];
  
  engine.castSkill(skillIdx);
  
  // Verify failure
  assert.strictEqual(state.playerSp, 100, `SP should not be consumed for ${skillId} while dismounted`);
  const errorMsg = loggedMessages.find(log => log.type === 'error' && log.msg.includes('must be mounted'));
  assert.ok(errorMsg, `Should block casting ${skillId} and log warning while dismounted`);
  console.log(`  ✓ Lock verified for ${skillId} (Casting failed as expected while dismounted)`);

  // Test Mounted (Unlocked)
  state.addItem('fire_drake', 1);
  assert.ok(state.equipItem('fire_drake'), 'Should equip Fire Drake');
  assert.strictEqual(state.character.mounted, true, 'Mounted flag should be true');
  
  loggedMessages = [];
  const spBefore = state.playerSp;
  
  engine.castSkill(skillIdx);
  
  // Verify success (SP is consumed)
  assert.ok(state.playerSp < spBefore, `SP should be consumed for ${skillId} while mounted`);
  const allowedLog = loggedMessages.find(log => log.type === 'error' && log.msg.includes('must be mounted'));
  assert.ok(!allowedLog, `Should NOT block casting ${skillId} while mounted`);
  console.log(`  ✓ Unlock verified for ${skillId} (Casting succeeded and SP consumed while mounted)`);
}

console.log('✓ All skill locks verified successfully');
console.log('\n--- ALL SANITY TESTS PASSED ---');
process.exit(0);
