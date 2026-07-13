// Test script for verifying RPG sidebar panels overhaul
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
      this.destination = {};
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
  performance: { now: () => Date.now() },
};

class MockElement {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase();
    this.classList = {
      classes: new Set(),
      add: (c) => this.classList.classes.add(c),
      remove: (c) => this.classList.classes.delete(c),
      toggle: (c) => {
        if (this.classList.classes.has(c)) {
          this.classList.classes.delete(c);
        } else {
          this.classList.classes.add(c);
        }
      },
      contains: (c) => this.classList.classes.has(c),
    };
    this.listeners = {};
    this.innerHTML = '';
    this.innerText = '';
    this.value = '';
    this.children = [];
    this.dataset = {};
    this.style = {};
    this.scrollTop = 0;
    this.scrollHeight = 0;
  }
  addEventListener(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }
  removeEventListener(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }
  dispatchEvent(event) {
    const list = this.listeners[event] || [];
    for (const cb of list) {
      cb({ target: this });
    }
  }
  querySelector(selector) {
    return new MockElement();
  }
  querySelectorAll(selector) {
    if (selector === '.nav-tab-btn') {
      return [
        Object.assign(new MockElement('button'), { dataset: { panel: 'status' } }),
        Object.assign(new MockElement('button'), { dataset: { panel: 'skills' } }),
        Object.assign(new MockElement('button'), { dataset: { panel: 'inventory' } }),
        Object.assign(new MockElement('button'), { dataset: { panel: 'quests' } }),
        Object.assign(new MockElement('button'), { dataset: { panel: 'party' } })
      ];
    }
    if (selector === 'button[data-toggle-mount]') {
      const btn = new MockElement('button');
      btn.dataset.toggleMount = true;
      return [btn];
    }
    return [];
  }
  appendChild(child) {
    this.children.push(child);
  }
}

const elements = {};
globalThis.document = {
  getElementById: (id) => {
    if (!elements[id]) {
      elements[id] = new MockElement();
    }
    return elements[id];
  },
  createElement: (tag) => {
    return new MockElement(tag);
  },
  querySelectorAll: (selector) => {
    return new MockElement().querySelectorAll(selector);
  },
  activeElement: { tagName: 'BODY' },
  addEventListener: () => {},
  removeEventListener: () => {}
};

globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
};

globalThis.requestAnimationFrame = (callback) => 1;

globalThis.performance = {
  now: () => Date.now(),
};

// Import code under test
const { GameState } = await import('./state.js');
const { GameUI } = await import('./ui.js');
const { ITEMS } = await import('./database.js');

console.log("=== RUNNING SIDEBAR OVERHAUL EMPIRICAL TESTS ===");

// 1. Stats Upgrading & Downgrading
console.log("\n[1] Verifying Stats Upgrading and Downgrading...");
const state = new GameState();
state.character.statPoints = 100;
state.character.stats = { str: 20, agi: 20, vit: 20, int: 20, dex: 20, luk: 20 };
state.recalculateStats();

const initialStr = state.character.stats.str;
const initialAtk = state.atk;
const initialPoints = state.character.statPoints;

// Upgrade
const upgraded = state.upgradeStat('str');
assert.strictEqual(upgraded, true, "Upgrading STR should succeed");
assert.strictEqual(state.character.stats.str, initialStr + 1, "STR should be incremented");
assert.ok(state.character.statPoints < initialPoints, "Stat points should decrease");
assert.ok(state.atk > initialAtk, "ATK should increase after STR upgrade");

// Downgrade
const downgraded = state.downgradeStat('str');
assert.strictEqual(downgraded, true, "Downgrading STR should succeed");
assert.strictEqual(state.character.stats.str, initialStr, "STR should return to initial value");
assert.strictEqual(state.character.statPoints, initialPoints, "Stat points should be refunded");
assert.strictEqual(state.atk, initialAtk, "ATK should return to initial value");
console.log("✓ Stats upgrading and downgrading verified successfully!");

// 2. Card Socketing & Unsocketing
console.log("\n[2] Verifying Card Socketing and Unsocketing updates cardSlots...");
state.character.inventory['novice_knife'] = 1;
state.character.inventory['archer_skeleton_card'] = 2;
state.equipItem('novice_knife');

assert.deepStrictEqual(state.character.cardSlots.weapon, [], "cardSlots.weapon should start empty");

// Socket 1
const s1 = state.socketCard('archer_skeleton_card', 'weapon');
assert.strictEqual(s1.success, true, "Socketing first card should succeed");
assert.deepStrictEqual(state.character.cardSlots.weapon, ['archer_skeleton_card'], "cardSlots.weapon should contain the socketed card");

// Socket 2
const s2 = state.socketCard('archer_skeleton_card', 'weapon');
assert.strictEqual(s2.success, true, "Socketing second card should succeed");
assert.deepStrictEqual(state.character.cardSlots.weapon, ['archer_skeleton_card', 'archer_skeleton_card'], "cardSlots.weapon should contain both cards");

// Unsocket
const u1 = state.unsocketCard('weapon', 0);
assert.strictEqual(u1.success, true, "Unsocketing should succeed");
assert.deepStrictEqual(state.character.cardSlots.weapon, ['archer_skeleton_card'], "cardSlots.weapon should update after unsocketing");

// Unequip
state.unequipItem('weapon');
assert.deepStrictEqual(state.character.cardSlots.weapon, [], "cardSlots.weapon should be empty after unequipping weapon");
console.log("✓ Card socketing and unsocketing updates cardSlots verified successfully!");

// 3. Dismounted Status Locks/Tooltips
console.log("\n[3] Verifying Dismounted Status Locks/Tooltips...");
const ui = new GameUI(state, () => ({ simulatedPlayers: [] }), () => {});

// Add mount and active skill
state.character.classId = 'knight';
state.character.skills.dragon_breath = 1;
state.character.inventory['fire_drake'] = 1;
state.equipItem('fire_drake');

// Test dismounted state
state.character.mounted = false;
ui.renderSkillsPanel();

const dismountedSkillsHtml = document.getElementById('panel-skills').innerHTML;
assert.ok(dismountedSkillsHtml.includes("Requires Mount (Dismounted)"), "Skills panel should show warning banner when dismounted");
assert.ok(dismountedSkillsHtml.includes("border-rose-900 bg-rose-950/10"), "Skills panel card container should have dismounted error border/bg classes");

// Test mounted state
state.character.mounted = true;
ui.renderSkillsPanel();

const mountedSkillsHtml = document.getElementById('panel-skills').innerHTML;
assert.ok(!mountedSkillsHtml.includes("Requires Mount (Dismounted)"), "Skills panel should NOT show warning banner when mounted");
assert.ok(!mountedSkillsHtml.includes("border-rose-900 bg-rose-950/10"), "Skills panel card container should NOT have dismounted error border/bg classes");
console.log("✓ Dismounted status locks/tooltips in UI verified successfully!");

// 4. Party Leave Button updates simulatedPlayers
console.log("\n[4] Verifying Party Leave button updates simulatedPlayers...");
const mockEngine = {
  simulatedPlayers: [
    { name: 'Bot_1', classId: 'swordman', hp: 100, maxHp: 100, combatTarget: null, appearance: {} },
    { name: 'Bot_2', classId: 'archer', hp: 100, maxHp: 100, combatTarget: null, appearance: {} }
  ]
};

const ui2 = new GameUI(state, () => mockEngine, () => {});
ui2.renderPartyPanel();

// Get the Leave Party button from the rendered party panel HTML
const partyPanel = document.getElementById('panel-party');
assert.ok(partyPanel.innerHTML.includes("Bot"), "Party panel should initially display simulated bots");
assert.strictEqual(mockEngine.simulatedPlayers.length, 2, "Engine should initially have 2 simulated players");

// Simulate clicking Leave Party button
const leaveBtn = document.getElementById('party-leave-btn');
assert.ok(leaveBtn, "Leave Party button should exist");
leaveBtn.dispatchEvent('click');

assert.strictEqual(mockEngine.simulatedPlayers.length, 0, "Engine simulatedPlayers array should be cleared after leaving party");
assert.ok(!partyPanel.innerHTML.includes("Bot"), "Party panel should not display simulated bots anymore");
console.log("✓ Party Leave button updates simulatedPlayers verified successfully!");

console.log("\n=== ALL SIDEBAR OVERHAUL EMPIRICAL TESTS PASSED SUCCESSFULLY! ===");
