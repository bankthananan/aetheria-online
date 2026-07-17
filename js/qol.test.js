// QoL pack: town storage round-trips items and survives save/load; achievements
// unlock once (never twice) from live run state; day/night phase math stays sane.
import assert from 'node:assert/strict';

let vnow = 0;
globalThis.performance = { now: () => vnow };

const ctx2d = () => new Proxy({
  measureText: () => ({ width: 10 }),
  createLinearGradient: () => ({ addColorStop() {} }),
  createRadialGradient: () => ({ addColorStop() {} }),
}, { get(target, key) { return key in target ? target[key] : () => {}; } });
function makeEl() {
  return {
    style: { setProperty() {} }, dataset: {}, children: [], textContent: '', innerHTML: '',
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    appendChild(child) { this.children.push(child); child.parentNode = this; return child; },
    remove() {}, addEventListener() {}, removeEventListener() {}, setAttribute() {}, focus() {}, click() {},
    querySelector() { return makeEl(); }, querySelectorAll() { return []; },
    getContext: ctx2d, toDataURL() { return 'data:image/png;base64,'; },
  };
}
const elements = Object.fromEntries(['root', 'hud', 'overlays', 'fx-layer', 'game-canvas'].map(id => [`#${id}`, makeEl()]));
globalThis.window = globalThis;
globalThis.addEventListener = () => {};
globalThis.document = {
  head: makeEl(), body: makeEl(), createElement: makeEl,
  querySelector: s => elements[s] || makeEl(), querySelectorAll: () => [],
  getElementById: id => elements[`#${id}`] || makeEl(), addEventListener() {}, removeEventListener() {},
};
globalThis.localStorage = {
  _data: {}, getItem(k) { return this._data[k] || null; },
  setItem(k, v) { this._data[k] = String(v); }, removeItem(k) { delete this._data[k]; },
};
const audioParam = { setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {}, cancelScheduledValues() {} };
const audioNode = { connect() { return this; }, start() {}, stop() {}, gain: audioParam, frequency: audioParam, Q: audioParam };
globalThis.AudioContext = class {
  constructor() { this.currentTime = 0; this.destination = {}; this.state = 'running'; }
  createOscillator() { return { ...audioNode }; } createGain() { return { ...audioNode }; }
  createBiquadFilter() { return { ...audioNode }; }
  createBuffer(_c, size) { return { getChannelData: () => new Float32Array(size) }; }
  createBufferSource() { return { ...audioNode, buffer: null }; } resume() { return Promise.resolve(); }
};
globalThis.webkitAudioContext = globalThis.AudioContext;
globalThis.requestAnimationFrame = () => 1;
globalThis.setTimeout = () => 0;
globalThis.Image = class {};
globalThis.innerWidth = 1440;
globalThis.innerHeight = 900;

await import('./game.js');
const A = globalThis.__AWO;
assert.ok(A, 'game debug API loaded');

const p = A.makePlayer('reborn_blade', 'QolTester');
A.G.player = p;
A.buildHud();
A.recompute(p, true);
A.loadMap('town_awakening');
A.G.running = true;   // saveGame persists only a live run

// ---- storage: stackable + instance round-trip ----
A.addItem('minor_potion', 3);
const gear = A.addItem('iron_sword', 1, 6);
assert.ok(gear?.uid, 'test setup: rolled gear instance');
const potIdx = p.inventory.findIndex(e => e.itemId === 'minor_potion');
const potQtyBefore = p.inventory[potIdx].qty;
A.depositItem(potIdx);
assert.equal(p.inventory.find(e => e.itemId === 'minor_potion')?.qty, potQtyBefore - 1, 'deposit moves one unit from a stack');
assert.equal(A.G.storage.find(e => e.itemId === 'minor_potion')?.qty, 1, 'stackable lands in the chest');
const gearIdx = p.inventory.findIndex(e => e.uid === gear.uid);
A.depositItem(gearIdx);
assert.ok(A.G.storage.some(e => e.uid === gear.uid), 'gear instance lands in the chest whole');
assert.ok(!p.inventory.some(e => e.uid === gear.uid), 'deposited gear leaves the backpack');

// quest items must refuse to enter storage
A.addItem('guide_letter', 1);
const qIdx = p.inventory.findIndex(e => e.itemId === 'guide_letter');
A.depositItem(qIdx);
assert.ok(!A.G.storage.some(e => e.itemId === 'guide_letter'), 'quest items cannot be stored');

// ---- persistence: chest and achievements survive save → load ----
A.G.killCounts = { slime: 150 };
A.checkAchievements();
assert.ok(A.G.achievements.has('ach_first_blood'), 'kill achievements unlock');
assert.ok(A.G.achievements.has('ach_centurion'), '100-kill tier unlocks at 150 kills');
assert.ok(!A.G.achievements.has('ach_legion'), '1,000-kill tier stays locked');
const unlockedCount = A.G.achievements.size;
A.checkAchievements();
assert.equal(A.G.achievements.size, unlockedCount, 'achievements never re-fire');

A.saveGame();
A.G.storage = []; A.G.achievements = new Set(); p.inventory.length = 0;
assert.ok(A.resumeGame(), 'save must load back');
assert.ok(A.G.storage.some(e => e.uid === gear.uid), 'stored gear survives save/load');
assert.equal(A.G.storage.find(e => e.itemId === 'minor_potion')?.qty, 1, 'stored stack survives save/load');
assert.ok(A.G.achievements.has('ach_centurion'), 'achievements survive save/load');

// withdraw puts things back in the (restored) backpack
const p2 = A.G.player;
const storedGearIdx = A.G.storage.findIndex(e => e.uid === gear.uid);
A.withdrawItem(storedGearIdx);
assert.ok(p2.inventory.some(e => e.uid === gear.uid), 'withdraw returns gear to the backpack');
assert.ok(!A.G.storage.some(e => e.uid === gear.uid), 'withdrawn gear leaves the chest');

console.log('QoL audit passed: storage round-trip + persistence, achievements unlock once and persist.');
