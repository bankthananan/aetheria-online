// Empirical Verification Script for Sidebar Tab Panels Overhaul
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

globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
};

globalThis.requestAnimationFrame = (callback) => 1;

globalThis.performance = {
  now: () => Date.now(),
};

// Element mockup class
class MockElement {
  constructor(idOrTag) {
    this.id = typeof idOrTag === 'string' ? idOrTag : '';
    this.tagName = typeof idOrTag === 'string' ? idOrTag.toUpperCase() : 'DIV';
    this.innerHTML = '';
    this.innerText = '';
    this.value = '';
    this.children = [];
    this.className = '';
    this.classList = {
      add: (cls) => {},
      remove: (cls) => {},
      contains: (cls) => false,
    };
    this.style = {};
    this.dataset = {};
    this.listeners = {};
  }

  addEventListener(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  trigger(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(data));
    }
  }

  appendChild(child) {
    this.children.push(child);
  }

  remove() {}

  querySelectorAll(selector) {
    const list = [];
    if (selector.includes('data-stat-up')) {
      for (const stat of ['str', 'agi', 'vit', 'int', 'dex', 'luk']) {
        const btn = new MockElement('button');
        btn.dataset.statUp = stat;
        btn.addEventListener('click', (e) => {
          // Trigger the registered click handler on Status Panel with this mock button as target
          if (panelListeners.statusUp[stat]) {
            panelListeners.statusUp[stat]({ currentTarget: btn });
          }
        });
        list.push(btn);
      }
    } else if (selector.includes('data-stat-down')) {
      for (const stat of ['str', 'agi', 'vit', 'int', 'dex', 'luk']) {
        const btn = new MockElement('button');
        btn.dataset.statDown = stat;
        btn.addEventListener('click', (e) => {
          // Trigger click handler
          if (panelListeners.statusDown[stat]) {
            panelListeners.statusDown[stat]({ currentTarget: btn });
          }
        });
        list.push(btn);
      }
    } else if (selector.includes('data-toggle-mount')) {
      const btn = new MockElement('button');
      btn.dataset.toggleMount = '';
      btn.addEventListener('click', (e) => {
        if (panelListeners.toggleMount) {
          panelListeners.toggleMount({ currentTarget: btn });
        }
      });
      list.push(btn);
    } else if (selector.includes('data-unsocket-slot')) {
      // In inventory slots, find filled sockets. Let's return dynamic mock elements if required.
      // For now, we will handle socket/unsocket verification via the state functions directly.
    }
    return list;
  }
}

// Global registry of listener triggers to simulate button clicks
const panelListeners = {
  statusUp: {},
  statusDown: {},
  toggleMount: null,
};

const documentElements = {};
function getOrCreateElement(id) {
  if (!documentElements[id]) {
    documentElements[id] = new MockElement(id);
  }
  return documentElements[id];
}

globalThis.document = {
  getElementById: (id) => getOrCreateElement(id),
  createElement: (tag) => new MockElement(tag),
  querySelectorAll: (selector) => {
    if (selector === '.nav-tab-btn') {
      return ['status', 'skills', 'inventory', 'quests', 'party', 'admin'].map(name => {
        const tab = new MockElement('button');
        tab.dataset.panel = name;
        return tab;
      });
    }
    const inputs = ['char-name', 'char-gender', 'char-hair', 'char-hair-color', 'char-cloth-color'];
    if (inputs.includes(selector)) {
      return [getOrCreateElement(selector)];
    }
    return [];
  }
};

// 2. Import project modules
const { GameState } = await import('./state.js');
const { GameUI } = await import('./ui.js');
const { SKILL_TREE, ITEMS } = await import('./database.js');

globalThis.SKILL_TREE = SKILL_TREE;

console.log('--- STARTING SIDEBAR PANELS EMPIRICAL TESTS ---');

// Mock engine reference
const mockEngine = {
  player: {
    buffs: {},
    attackTarget: null,
  },
  simulatedPlayers: [],
  onLog: (msg, type) => {},
  spawnParticleEffect: () => {},
};

// Set up UI
const state = new GameState();
const ui = new GameUI(state, () => mockEngine, () => {});

// Intercept GameUI event registering so we can trigger clicks programmatically in tests
const statusPanel = document.getElementById('panel-status');
const oldQuerySelectorAll = statusPanel.querySelectorAll;
statusPanel.querySelectorAll = function(selector) {
  const btns = oldQuerySelectorAll.call(this, selector);
  btns.forEach(btn => {
    if (selector.includes('data-stat-up')) {
      const stat = btn.dataset.statUp;
      btn.addEventListener = (event, handler) => {
        panelListeners.statusUp[stat] = handler;
      };
    } else if (selector.includes('data-stat-down')) {
      const stat = btn.dataset.statDown;
      btn.addEventListener = (event, handler) => {
        panelListeners.statusDown[stat] = handler;
      };
    }
  });
  return btns;
};

// Same intercept for toggle mount button in inventory panel
const inventoryPanel = document.getElementById('panel-inventory');
inventoryPanel.querySelectorAll = function(selector) {
  const btns = oldQuerySelectorAll.call(this, selector);
  btns.forEach(btn => {
    if (selector.includes('data-toggle-mount')) {
      btn.addEventListener = (event, handler) => {
        panelListeners.toggleMount = handler;
      };
    }
  });
  return btns;
};

// Helper for testing
function runVerification() {
  // =========================================================================
  // TASK 1: Upgrade and downgrade base stats correctly updates the character
  // stats and triggers stat recalculation.
  // =========================================================================
  console.log('\n[Verification 1] Testing Stat Upgrade & Downgrade...');
  state.reset();
  state.character.statPoints = 50;
  state.character.stats.str = 10;
  state.recalculateStats();

  const baseStr = state.character.stats.str;
  const baseStatPoints = state.character.statPoints;
  const baseAtk = state.atk;

  console.log(`- Initial State: STR=${baseStr}, Points=${baseStatPoints}, ATK=${baseAtk}`);

  // Re-render panel to trigger binding
  ui.renderStatusPanel();

  // Simulate clicking STR upgrade button
  const upHandler = panelListeners.statusUp['str'];
  assert.ok(upHandler, 'Upgrade listener for STR should be registered');
  upHandler({ currentTarget: { dataset: { statUp: 'str' } } });

  console.log(`- After Upgrade: STR=${state.character.stats.str}, Points=${state.character.statPoints}, ATK=${state.atk}`);
  assert.strictEqual(state.character.stats.str, baseStr + 1, 'STR should increment by 1');
  assert.ok(state.character.statPoints < baseStatPoints, 'Stat points should decrease');
  assert.ok(state.atk > baseAtk, 'ATK should increase (triggers recalculation)');

  // Simulate clicking STR downgrade button
  const downHandler = panelListeners.statusDown['str'];
  assert.ok(downHandler, 'Downgrade listener for STR should be registered');
  downHandler({ currentTarget: { dataset: { statDown: 'str' } } });

  console.log(`- After Downgrade: STR=${state.character.stats.str}, Points=${state.character.statPoints}, ATK=${state.atk}`);
  assert.strictEqual(state.character.stats.str, baseStr, 'STR should revert to base value');
  assert.strictEqual(state.character.statPoints, baseStatPoints, 'Stat points should be refunded completely');
  assert.strictEqual(state.atk, baseAtk, 'ATK should revert to base value');
  console.log('✓ Stat Upgrade/Downgrade correctly updates character stats & triggers recalculation.');


  // =========================================================================
  // TASK 2: Socketing and unsocketing cards updates the cardSlots property on
  // the character state.
  // =========================================================================
  console.log('\n[Verification 2] Testing Card Socketing & Unsocketing...');
  state.reset();
  
  // Verify cardSlots is initialized as empty lists
  assert.deepStrictEqual(state.character.cardSlots, {
    weapon: [],
    shield: [],
    armor: [],
    headgear: [],
    mount: []
  }, 'cardSlots should be initialized as empty array lists');

  // Add a weapon and card to inventory
  state.addItem('novice_knife', 1);
  state.addItem('archer_skeleton_card', 2);
  
  // Equip weapon
  state.equipItem('novice_knife');
  assert.strictEqual(state.character.equipment.weapon.id, 'novice_knife');
  assert.deepStrictEqual(state.character.cardSlots.weapon, [], 'cardSlots.weapon should be empty initially');

  // Socket a card
  console.log('- Socketing card 1...');
  const res1 = state.socketCard('archer_skeleton_card', 'weapon');
  assert.ok(res1.success, 'Socketing card 1 should succeed');
  assert.deepStrictEqual(state.character.cardSlots.weapon, ['archer_skeleton_card'], 'cardSlots.weapon should contain the socketed card ID');
  assert.strictEqual(state.character.inventory['archer_skeleton_card'], 1, 'Archer Skeleton card inventory count should decrease to 1');

  // Socket second card (weapon allows up to 2 cards)
  console.log('- Socketing card 2...');
  const res2 = state.socketCard('archer_skeleton_card', 'weapon');
  assert.ok(res2.success, 'Socketing card 2 should succeed');
  assert.deepStrictEqual(state.character.cardSlots.weapon, ['archer_skeleton_card', 'archer_skeleton_card'], 'cardSlots.weapon should contain both cards');
  assert.ok(!state.character.inventory['archer_skeleton_card'] || state.character.inventory['archer_skeleton_card'] === 0, 'Archer Skeleton card inventory should be empty');

  // Unsocket first card (index 0)
  console.log('- Unsocketing card at index 0...');
  const resUnsocket = state.unsocketCard('weapon', 0);
  assert.ok(resUnsocket.success, 'Unsocketing card should succeed');
  assert.strictEqual(resUnsocket.cardId, 'archer_skeleton_card');
  assert.deepStrictEqual(state.character.cardSlots.weapon, ['archer_skeleton_card'], 'cardSlots.weapon should now contain only 1 card');
  assert.strictEqual(state.character.inventory['archer_skeleton_card'], 1, 'Card should return to inventory');

  // Unsocket remaining card (index 0)
  console.log('- Unsocketing remaining card at index 0...');
  const resUnsocket2 = state.unsocketCard('weapon', 0);
  assert.ok(resUnsocket2.success, 'Unsocketing second card should succeed');
  assert.deepStrictEqual(state.character.cardSlots.weapon, [], 'cardSlots.weapon should be empty');
  assert.strictEqual(state.character.inventory['archer_skeleton_card'], 2, 'Both cards should be back in inventory');

  // Unequip weapon
  console.log('- Unequipping weapon...');
  state.unequipItem('weapon');
  assert.deepStrictEqual(state.character.cardSlots.weapon, [], 'cardSlots.weapon should reset to empty list when unequipped');
  console.log('✓ Card socketing and unsocketing correctly updates the cardSlots property.');


  // =========================================================================
  // TASK 3: Dismounted status locks/tooltips work as expected.
  // =========================================================================
  console.log('\n[Verification 3] Testing Dismounted Status Locks and Tooltips...');
  state.reset();
  
  // Set class to knight so Dragon Breath is available, and add 1 level to it
  state.character.classId = 'knight';
  state.character.skills['dragon_breath'] = 1;
  state.recalculateStats();

  // Case A: Dismounted
  state.character.mounted = false;
  ui.renderSkillsPanel();
  const skillsPanelHTML = document.getElementById('panel-skills').innerHTML;
  
  // Check for dismounted warning banner and styling in rendered HTML
  console.log('- Checking dismounted view rendering...');
  assert.ok(skillsPanelHTML.includes('⚠️ Requires Mount (Dismounted)'), 'Rendered skills HTML must contain dismounted mount skill warning');
  assert.ok(skillsPanelHTML.includes('border-rose-900 bg-rose-950/10'), 'Rendered skills HTML must contain warning border styling class');

  // Case B: Mounted
  state.character.mounted = true;
  ui.renderSkillsPanel();
  const skillsPanelHTMLMounted = document.getElementById('panel-skills').innerHTML;

  // Check that the dismounted banner is gone
  console.log('- Checking mounted view rendering...');
  assert.ok(!skillsPanelHTMLMounted.includes('⚠️ Requires Mount (Dismounted)'), 'Rendered skills HTML must NOT contain dismounted mount skill warning when mounted');
  assert.ok(!skillsPanelHTMLMounted.includes('border-rose-900 bg-rose-950/10'), 'Rendered skills HTML must NOT contain warning border styling class when mounted');
  console.log('✓ Dismounted status locks/tooltips render and update correctly.');


  // =========================================================================
  // TASK 4: Party Leave button correctly updates the simulated players array.
  // =========================================================================
  console.log('\n[Verification 4] Testing Party Leave Button...');
  
  // Populate simulated players list
  mockEngine.simulatedPlayers = [
    { name: 'Priest_Bot_1', classId: 'priest', hp: 500, maxHp: 500 },
    { name: 'Knight_Bot_2', classId: 'knight', hp: 800, maxHp: 800 }
  ];
  
  assert.strictEqual(mockEngine.simulatedPlayers.length, 2, 'Should initially have 2 simulated party members');

  // Render party panel
  ui.renderPartyPanel();

  // Look up party leave listener
  const leaveBtn = document.getElementById('party-leave-btn');
  assert.ok(leaveBtn, 'Party leave button should exist in document');

  // Simulate button click
  console.log('- Clicking Leave Party button...');
  leaveBtn.trigger('click');

  // Verify that the simulated players array has been cleared
  console.log(`- Simulated players list length: ${mockEngine.simulatedPlayers.length}`);
  assert.strictEqual(mockEngine.simulatedPlayers.length, 0, 'Simulated players array must be cleared upon leaving party');
  console.log('✓ Party Leave button correctly clears the simulated players array.');

  console.log('\n========================================');
  console.log('  ALL EMPIRICAL PANEL VERIFICATIONS PASSED');
  console.log('========================================');
}

runVerification();
process.exit(0);
