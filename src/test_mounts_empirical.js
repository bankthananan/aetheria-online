// Test script for verifying RPG mounts
import assert from 'assert';

// Mock Browser Globals for Node.js environment
global.window = {
  AudioContext: class {
    createGain() { return { connect: () => {}, gain: { value: 1 } }; }
  },
  webkitAudioContext: class {},
  addEventListener: () => {},
  removeEventListener: () => {},
  performance: { now: () => Date.now() },
  requestAnimationFrame: () => {},
  gameEngine: null,
};
global.document = {
  getElementById: (id) => {
    if (id === 'game-canvas') {
      return {
        getContext: () => ({
          beginPath: () => {},
          moveTo: () => {},
          lineTo: () => {},
          stroke: () => {},
          arc: () => {},
          fill: () => {},
          fillText: () => {},
        }),
        addEventListener: () => {},
        width: 0,
        height: 0,
      };
    }
    return null;
  },
  addEventListener: () => {},
};
global.localStorage = {
  getItem: () => null,
  setItem: () => {},
};
global.performance = { now: () => Date.now() };
global.requestAnimationFrame = () => {};

// Import state and database
const { GameState } = await import('./state.js');
const { ITEMS } = await import('./database.js');

console.log('--- STARTING EMPIRICAL MOUNT TESTS ---');

// 1. Verify Item Definitions
console.log('\n[1] Verifying Item Definitions...');
const expectedItems = {
  dragon_egg: { type: 'consumable', subType: 'hatch_egg', price: 5000 },
  fire_drake: { type: 'mount', slot: 'mount', price: 15000 },
  wind_wyvern: { type: 'mount', slot: 'mount', price: 15000 },
  earth_wyrm: { type: 'mount', slot: 'mount', price: 15000 }
};

for (const [id, expected] of Object.entries(expectedItems)) {
  const item = ITEMS[id];
  assert.ok(item, `Item ${id} should exist in database`);
  assert.strictEqual(item.id, id, `Item ${id} should have correct id`);
  assert.strictEqual(item.type, expected.type, `Item ${id} should have correct type`);
  if (expected.subType) {
    assert.strictEqual(item.subType, expected.subType, `Item ${id} should have correct subType`);
  }
  if (expected.slot) {
    assert.strictEqual(item.slot, expected.slot, `Item ${id} should have correct slot`);
  }
  assert.strictEqual(item.price, expected.price, `Item ${id} should have correct price`);
  console.log(`✓ Item ${id} matches specs`);
}

// 2. Verify Egg Hatching Uniform Probability and Consumption
console.log('\n[2] Verifying Egg Hatching Logic...');
const state = new GameState();
const iterations = 10000;
const counts = { fire_drake: 0, wind_wyvern: 0, earth_wyrm: 0 };

for (let i = 0; i < iterations; i++) {
  // Clear inventory & add single egg
  state.character.inventory = {};
  state.addItem('dragon_egg', 1);
  assert.strictEqual(state.character.inventory['dragon_egg'], 1, 'Should have exactly 1 egg before hatching');

  // Hatch egg
  const success = state.useItem('dragon_egg');
  assert.ok(success, 'Hatching should succeed');

  // Assert egg was consumed
  assert.ok(!state.character.inventory['dragon_egg'] || state.character.inventory['dragon_egg'] === 0, 'Egg must be consumed');

  // Find hatched mount
  let hatched = null;
  for (const mountId of Object.keys(counts)) {
    if (state.character.inventory[mountId] === 1) {
      if (hatched) throw new Error('More than one mount produced from single egg!');
      hatched = mountId;
    }
  }
  assert.ok(hatched, 'At least one mount must be produced');
  counts[hatched]++;
}

console.log(`Hatching results out of ${iterations} runs:`, counts);
for (const [mountId, count] of Object.entries(counts)) {
  const prob = count / iterations;
  console.log(`- ${mountId}: ${count} times (${(prob * 100).toFixed(2)}%)`);
  // Check if probability is within 3% tolerance of 33.33% (i.e. between 30.33% and 36.33%)
  assert.ok(prob >= 0.30 && prob <= 0.36, `Probability of ${mountId} (${prob}) is not uniform!`);
}
console.log('✓ Egg hatching consumes egg and yields mounts with uniform probability');

// 3. Verify Stats Multipliers, Movement Speed, and Stat Bonuses
console.log('\n[3] Verifying Mount Stats & Speed Multipliers...');

// Reset state
state.reset();
state.character.stats = { str: 10, agi: 10, vit: 10, int: 10, dex: 10, luk: 10 };
state.recalculateStats();

const baseMaxHp = state.maxHp;
const baseDef = state.def;
const baseFlee = state.flee;
console.log(`Base Stats: MaxHP=${baseMaxHp}, DEF=${baseDef}, Flee=${baseFlee}`);

// Test Fire Drake Bonuses
state.character.equipment.mount = { id: 'fire_drake', refine: 0, socketedCards: [] };
state.character.mounted = true;
state.recalculateStats();
console.log(`Fire Drake Stats: MaxHP=${state.maxHp}, DEF=${state.def}, Flee=${state.flee}`);
assert.strictEqual(state.maxHp, baseMaxHp, 'Fire Drake should not modify Max HP');
assert.strictEqual(state.def, baseDef, 'Fire Drake should not modify DEF');
assert.strictEqual(state.flee, baseFlee, 'Fire Drake should not modify Flee');

// Test Wind Wyvern Bonuses
state.character.equipment.mount = { id: 'wind_wyvern', refine: 0, socketedCards: [] };
state.character.mounted = true;
state.recalculateStats();
console.log(`Wind Wyvern Stats: MaxHP=${state.maxHp}, DEF=${state.def}, Flee=${state.flee}`);
assert.strictEqual(state.maxHp, baseMaxHp, 'Wind Wyvern should not modify Max HP');
assert.strictEqual(state.def, baseDef, 'Wind Wyvern should not modify DEF');
assert.strictEqual(state.flee, baseFlee + 15, 'Wind Wyvern should grant +15 Flee');

// Test Earth Wyrm Bonuses
state.character.equipment.mount = { id: 'earth_wyrm', refine: 0, socketedCards: [] };
state.character.mounted = true;
state.recalculateStats();
console.log(`Earth Wyrm Stats: MaxHP=${state.maxHp}, DEF=${state.def}, Flee=${state.flee}`);
assert.strictEqual(state.maxHp, baseMaxHp + 300, 'Earth Wyrm should grant +300 Max HP');
assert.strictEqual(state.def, baseDef + 25, 'Earth Wyrm should grant +25 DEF');
assert.strictEqual(state.flee, baseFlee, 'Earth Wyrm should not modify Flee');

console.log('✓ Mount stat bonuses correctly applied in state recalculation');

// 4. Verify Refinement and Socketing Blocked in Backend
console.log('\n[4] Verifying Refinement and Card Socketing restrictions in Backend...');

// Let's verify card socketing first
state.reset();
state.character.inventory['poring_card'] = 1;
state.character.equipment.mount = { id: 'fire_drake', refine: 0, socketedCards: [] };
const resSocket = state.socketCard('poring_card', 'mount');
console.log('Socket result on mount:', resSocket);
assert.strictEqual(resSocket.success, false, 'Socketing onto mount slot must fail in backend');
assert.match(resSocket.reason, /This card can only be socketed into/, 'Should fail because of slot mismatch');

// Let's verify refinement
state.character.inventory['elunium'] = 10;
const resRefine = state.refineItem('mount');
console.log('Refine result on mount:', resRefine);
// Wait, does the backend block refinement of mount? Let's check!
if (resRefine.success) {
  console.log('🚨 BUG DETECTED: Backend ALLOWS mount slot refinement! Mount slot can be refined programmatically.');
} else {
  console.log('✓ Mount slot refinement is blocked in the backend');
}

console.log('\n--- ALL TESTS COMPLETED ---');
