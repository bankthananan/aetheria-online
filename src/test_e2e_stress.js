// Stress Test and Memory Leak/Flakiness Detector for E2E Test Suite
import { execSync } from 'child_process';
import assert from 'assert';

// Import mocks to run setup/teardown in this process
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
      return { getChannelData: () => new Float32Array(size) };
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

const { GameState } = await import('./state.js');
const { GameEngine } = await import('./engine.js');
const { SKILL_TREE } = await import('./database.js');

globalThis.SKILL_TREE = SKILL_TREE;

// Listen for unhandled rejections
let unhandledRejections = [];
process.on('unhandledRejection', (reason, promise) => {
  unhandledRejections.push({ reason, promise });
});

let uncaughtExceptions = [];
process.on('uncaughtException', (err) => {
  uncaughtExceptions.push(err);
});

// Setup function mimicking E2E suite
function runSingleSetupAndTeardown() {
  const state = new GameState();
  state.character.baseLevel = 80;
  state.character.jobLevel = 50;
  state.character.classId = 'knight';
  state.character.inventory = { dragon_egg: 1, fire_drake: 1 };
  state.character.equipment = {
    weapon: null,
    shield: null,
    armor: null,
    headgear: null,
    mount: null
  };
  state.character.mounted = true;
  state.character.skills = { dragon_breath: 1 };
  state.character.stats = { str: 20, agi: 20, vit: 20, int: 20, dex: 20, luk: 20 };
  
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

  const engine = new GameEngine(canvas, state, () => {}, () => {});
  
  // Setup targets
  const target = {
    id: 'mob_target',
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
  engine.monsters = [target];
  engine.player.attackTarget = target;
  
  // Cast skill (this might set off animations or logic)
  const activeSkills = (SKILL_TREE.knight || []).filter(s => s.type === 'active');
  const skillIdx = activeSkills.findIndex(s => s.id === 'dragon_breath');
  if (skillIdx !== -1) {
    engine.castSkill(skillIdx);
  }
  
  // Run update
  engine.updatePlayer(100);
  
  // Kill the monster to trigger spawn timer setTimeout
  target.hp = 0;
  engine.monsters = [];
  
  // In the real E2E tests, the engine is NOT destroyed.
  // We don't call destroy() here to simulate the E2E test suite's leaks.
  // (uncommenting the next line would set running=false, but won't clear timeouts)
  // engine.destroy();
}

console.log("=== STRESS TESTING & VULNERABILITY ANALYSIS ===");

// 1. Check for Flakiness (Subprocess execution loop)
console.log("\n[1] Running E2E suite 30 times to verify flakiness...");
let failedRuns = 0;
for (let i = 1; i <= 30; i++) {
  try {
    execSync('node src/test_e2e_suite.js', { stdio: 'ignore' });
  } catch (err) {
    failedRuns++;
    console.log(`✗ Run ${i} FAILED`);
  }
}
if (failedRuns === 0) {
  console.log("✓ E2E Suite is stable across 30 runs (0% flakiness detected).");
} else {
  console.log(`🚨 Flakiness detected! ${failedRuns}/30 runs failed.`);
}

// 2. Check for Memory Leaks (Repeated Engine Instantiations)
console.log("\n[2] Checking for memory leaks over 1000 engine setups...");
if (global.gc) {
  global.gc();
}
const startMemory = process.memoryUsage().heapUsed;
console.log(`Starting Heap: ${(startMemory / 1024 / 1024).toFixed(2)} MB`);

for (let i = 0; i < 1000; i++) {
  runSingleSetupAndTeardown();
}

if (global.gc) {
  global.gc();
}
const endMemory = process.memoryUsage().heapUsed;
console.log(`Ending Heap: ${(endMemory / 1024 / 1024).toFixed(2)} MB`);
const leakSize = endMemory - startMemory;
console.log(`Heap Growth: ${(leakSize / 1024 / 1024).toFixed(2)} MB`);

if (leakSize > 5 * 1024 * 1024) {
  console.log("🚨 Potential memory leak detected! Heap grew by >5MB after 1000 setups.");
} else {
  console.log("✓ Heap growth is within safe limits under garbage collection.");
}

// Let's count active timeouts (if possible via internal Node.js metrics)
const activeHandles = process._getActiveHandles ? process._getActiveHandles() : [];
const activeTimers = activeHandles.filter(h => h.constructor.name === 'Timeout' || h.constructor.name === 'Timer');
console.log(`Active handles: ${activeHandles.length}`);
console.log(`Active timers: ${activeTimers.length}`);

// 3. Check for Unhandled Promise Rejections and Uncaught Exceptions
console.log("\n[3] Checking for unhandled promise rejections and uncaught exceptions...");
if (unhandledRejections.length === 0) {
  console.log("✓ No unhandled promise rejections detected.");
} else {
  console.log(`🚨 ${unhandledRejections.length} unhandled rejections detected!`);
  unhandledRejections.forEach((ur, idx) => {
    console.log(`   [#${idx + 1}] Reason:`, ur.reason);
  });
}

if (uncaughtExceptions.length === 0) {
  console.log("✓ No uncaught exceptions detected.");
} else {
  console.log(`🚨 ${uncaughtExceptions.length} uncaught exceptions detected!`);
  uncaughtExceptions.forEach((ue, idx) => {
    console.log(`   [#${idx + 1}] Error:`, ue.stack || ue.message);
  });
}

console.log("\nStress test run completed.");
if (failedRuns > 0 || unhandledRejections.length > 0 || uncaughtExceptions.length > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
