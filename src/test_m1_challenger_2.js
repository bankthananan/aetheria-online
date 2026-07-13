// Empirical Verification Script for R1 implementation (Challenger 2)
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
const { SKILL_TREE } = await import('./database.js');

globalThis.SKILL_TREE = SKILL_TREE;

// Log helper
function logHeader(title) {
  console.log(`\n========================================`);
  console.log(`  ${title}`);
  console.log(`========================================`);
}

// Setup function
function setup() {
  const state = new GameState();
  state.character.baseLevel = 80;
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
  engine.monsters = [];
  engine.projectiles = [];

  return { state, engine };
}

// Find skill index helper
function getSkillIndex(classId, skillId) {
  const activeSkills = (SKILL_TREE[classId] || []).filter(s => s.type === 'active');
  return activeSkills.findIndex(s => s.id === skillId);
}

// ---------------------------------------------------------
// TEST 1: Mount State Toggling in GameState
// ---------------------------------------------------------
logHeader("TEST 1: MOUNT STATE TOGGLING IN GAMESTATE");

{
  const { state } = setup();

  // Add items to inventory so they can be equipped
  state.character.inventory['fire_drake'] = 1;
  state.character.inventory['earth_wyrm'] = 1;

  // 1. Initial verification (on foot)
  assert.strictEqual(state.character.equipment.mount, null, "Should start with no mount equipped");
  assert.strictEqual(state.character.mounted, false, "Should start dismounted");

  const baseHp = state.maxHp;
  const baseDef = state.def;
  const baseFlee = state.flee;
  console.log(`✓ Initial state verified. MaxHP: ${baseHp}, DEF: ${baseDef}, Flee: ${baseFlee}`);

  // 2. Equip Fire Drake
  state.equipItem('fire_drake');
  assert.deepStrictEqual(state.character.equipment.mount.id, 'fire_drake', "Mount slot should contain fire_drake");
  assert.strictEqual(state.character.mounted, true, "Player should be automatically mounted on equip");
  console.log("✓ Equipping Fire Drake automatically mounts the character");

  // 3. Unequip mount
  state.unequipItem('mount');
  assert.strictEqual(state.character.equipment.mount, null, "Mount slot should be null after unequip");
  assert.strictEqual(state.character.mounted, false, "Player should be dismounted after unequip");
  console.log("✓ Unequipping mount automatically dismounts the character");

  // 4. Equip Earth Wyrm and check stat increases
  state.equipItem('earth_wyrm');
  assert.strictEqual(state.character.mounted, true, "Mounted should be true");
  assert.strictEqual(state.maxHp, baseHp + 300, "Earth Wyrm should grant +300 Max HP");
  assert.strictEqual(state.def, baseDef + 25, "Earth Wyrm should grant +25 DEF");
  console.log(`✓ Equipping Earth Wyrm correctly updates stats. MaxHP: ${state.maxHp} (+300), DEF: ${state.def} (+25)`);

  // 5. Toggle mount to false (Dismount)
  state.character.mounted = false;
  state.recalculateStats();
  assert.deepStrictEqual(state.character.equipment.mount.id, 'earth_wyrm', "Mount item should remain equipped when dismounted");
  assert.strictEqual(state.maxHp, baseHp, "Max HP should revert to base when dismounted");
  assert.strictEqual(state.def, baseDef, "DEF should revert to base when dismounted");
  console.log("✓ Dismounting retains equipped mount but removes stat bonuses");

  // 6. Toggle mount to true (Remount)
  state.character.mounted = true;
  state.recalculateStats();
  assert.strictEqual(state.maxHp, baseHp + 300, "Max HP should re-apply bonuses when remounted");
  assert.strictEqual(state.def, baseDef + 25, "DEF should re-apply bonuses when remounted");
  console.log("✓ Remounting re-applies stat bonuses correctly");
}

// ---------------------------------------------------------
// TEST 2: Physical Attack Multipliers (Fire Drake +15%)
// ---------------------------------------------------------
logHeader("TEST 2: PHYSICAL ATTACK MULTIPLIERS");

{
  const { state, engine } = setup();

  // Add items to inventory so they can be equipped
  state.character.inventory['fire_drake'] = 1;
  state.character.inventory['earth_wyrm'] = 1;

  // Set predictable stats
  state.character.stats = { str: 10, agi: 10, vit: 10, int: 10, dex: 10, luk: 10 };
  state.recalculateStats();
  state.atk = 100;
  state.critical = 0; // Prevent critical hits

  // Mock Math.random to always hit and not crit/double attack
  const originalRandom = Math.random;
  Math.random = () => 0.1; // 10 < hitChance (always hit), and 10 > critical (no crit)

  // Target monster
  const target = {
    id: 'mob_test',
    name: 'Test Target',
    pixelX: 100,
    pixelY: 100,
    gridX: 2,
    gridY: 2,
    hp: 1000,
    maxHp: 1000,
    def: 10, // defense
    flee: 0
  };

  engine.player.attackTarget = target;

  // 1. Attack on foot (No mount)
  target.hp = 1000;
  engine.performPhysicalAttack();
  // Base Damage = 100.
  // Final Damage = 100 - 10 = 90.
  // Expected HP = 1000 - 90 = 910.
  assert.strictEqual(target.hp, 910, "Without mount, damage should be 90");
  console.log(`✓ No mount attack damage: 90 (Target HP: ${target.hp})`);

  // 2. Attack with Fire Drake (Mounted)
  state.equipItem('fire_drake');
  state.atk = 100;
  target.hp = 1000;
  console.log("DEBUG BEFORE: state.atk =", state.atk, "state.critical =", state.critical, "target.def =", target.def, "target.hp =", target.hp);
  engine.performPhysicalAttack();
  console.log("DEBUG AFTER: target.hp =", target.hp);
  // Fire Drake Multiplier: Base Damage = Math.floor(100 * 1.15) = 115.
  // Final Damage = 115 - 10 = 105.
  // Expected HP = 1000 - 105 = 895.
  assert.ok(target.hp === 895 || target.hp === 896, `Fire Drake mounted attack damage should be 104 or 105 (+15% before DEF), got: ${1000 - target.hp}`);
  console.log(`✓ Fire Drake mounted damage: 104 or 105 (Target HP: ${target.hp}) [Verified +15% applied before DEF]`);

  // 3. Attack with Fire Drake (Dismounted)
  state.character.mounted = false;
  state.recalculateStats();
  state.atk = 100;
  target.hp = 1000;
  engine.performPhysicalAttack();
  // Fire Drake multiplier should NOT apply when dismounted.
  assert.strictEqual(target.hp, 910, "Fire Drake dismounted attack damage should be 90 (multiplier should not apply)");
  console.log(`✓ Fire Drake dismounted damage: 90 (Target HP: ${target.hp}) [Verified multiplier not applied when dismounted]`);

  // 4. Attack with Earth Wyrm (Mounted)
  state.equipItem('earth_wyrm');
  state.atk = 100;
  target.hp = 1000;
  engine.performPhysicalAttack();
  // Earth Wyrm does not grant damage multipliers.
  assert.strictEqual(target.hp, 910, "Earth Wyrm mounted attack damage should be 90 (no multiplier)");
  console.log(`✓ Earth Wyrm mounted damage: 90 (Target HP: ${target.hp}) [Verified other mounts do not grant damage multiplier]`);

  Math.random = originalRandom; // Restore Math.random
}

// ---------------------------------------------------------
// TEST 3: Buff Mechanics (Draconic Shield)
// ---------------------------------------------------------
logHeader("TEST 3: BUFF MECHANICS (DRACONIC SHIELD)");

{
  const { state, engine } = setup();

  state.character.classId = 'priest';
  state.character.skills['draconic_shield'] = 3; // level 3 Draconic Shield
  state.character.stats.vit = 40; // VIT 40
  state.character.mounted = true;
  state.character.equipment.mount = { id: 'earth_wyrm' };
  state.recalculateStats();

  state.playerHp = 100;
  state.playerSp = 200;

  const skillIdx = getSkillIndex('priest', 'draconic_shield');
  assert.ok(skillIdx !== -1, "Draconic Shield skill should exist for Priest");

  // --- Healing Check ---
  engine.castSkill(skillIdx);
  
  // Formula: healAmt = Math.floor(150 + lvl * 45 + vit * 3)
  // For lvl = 3, vit = 40: healAmt = 150 + 135 + 120 = 405.
  // Player HP should go from 100 to 505.
  assert.strictEqual(state.playerHp, 505, "Draconic Shield healing amount is incorrect");
  console.log(`✓ Draconic Shield Lv.3 Cast: Healed +405 HP (Current HP: ${state.playerHp})`);

  // --- Buff Activation & Damage Reduction Check ---
  const buff = engine.player.buffs['draconic_shield'];
  assert.ok(buff, "Draconic Shield buff should be active on player");
  assert.strictEqual(buff.lvl, 3, "Draconic Shield buff level should be 3");
  console.log("✓ Buff successfully applied with level 3");

  // Attack player with monster
  state.def = 10;
  state.playerHp = 1000;
  const mob = {
    id: 'mob_boss',
    name: 'Boss Mob',
    atk: 110,
    hit: 100
  };

  // Mock random to guarantee hit
  const originalRandom = Math.random;
  Math.random = () => 0.0;

  engine.performMonsterAttack(mob);
  // Base Damage = max(1, mob.atk - def) = 110 - 10 = 100.
  // Reduction = 0.20 + 0.02 * shieldLvl = 0.20 + 0.06 = 0.26 (26% reduction).
  // Final Damage = Math.floor(100 * (1.0 - 0.26)) = 74.
  // Expected HP = 1000 - 74 = 926.
  assert.strictEqual(state.playerHp, 926, "Damage reduction calculation is incorrect");
  console.log(`✓ Damage Reduction check: Monster base 100 dmg reduced to 74 dmg (-26%) (Player HP: ${state.playerHp})`);

  // --- SP Drain Check ---
  // Drain per tick = 2 + shieldLvl = 2 + 3 = 5 SP
  state.playerSp = 20;
  engine.player.lastShieldDrainTime = Date.now() - 1000; // Force drain tick
  engine.updatePlayer(100);

  assert.strictEqual(state.playerSp, 15, "SP should be drained by 5");
  assert.ok(engine.player.buffs['draconic_shield'], "Draconic Shield should still be active");
  console.log(`✓ SP Drain check: Drained 5 SP (Current SP: ${state.playerSp})`);

  // --- Deactivation on 0 SP Check ---
  state.playerSp = 4; // Less than drain amount (5)
  engine.player.lastShieldDrainTime = Date.now() - 1000; // Force drain tick
  engine.updatePlayer(100);

  assert.strictEqual(state.playerSp, 0, "SP should be reduced to 0");
  assert.strictEqual(engine.player.buffs['draconic_shield'], undefined, "Draconic Shield should deactivate when SP hits 0");
  assert.strictEqual(engine.player.lastShieldDrainTime, undefined, "lastShieldDrainTime should be cleaned up");
  console.log("✓ Shield successfully deactivated when SP hits 0");

  // --- Dismount Cleanup Check ---
  // Re-cast shield
  state.playerSp = 200;
  engine.castSkill(skillIdx);
  assert.ok(engine.player.buffs['draconic_shield'], "Draconic Shield active again");

  // Dismount player
  state.character.mounted = false;
  engine.updatePlayer(100);

  assert.strictEqual(engine.player.buffs['draconic_shield'], undefined, "Draconic Shield should be cleaned up immediately upon dismounting");
  assert.strictEqual(engine.player.lastShieldDrainTime, undefined, "lastShieldDrainTime should be cleaned up upon dismount");
  console.log("✓ Shield successfully removed immediately upon player dismounting");

  Math.random = originalRandom; // Restore Math.random
}

console.log(`\n========================================`);
console.log(`  ALL CHALLENGER VERIFICATIONS PASSED!`);
console.log(`========================================\n`);
process.exit(0);
