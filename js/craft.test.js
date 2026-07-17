// Crafting: recipes consume exact zeny + material stacks and produce the output;
// missing materials or zeny refuse the craft untouched.
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

const { CONTENT } = await import('./content.js');
await import('./game.js');
const A = globalThis.__AWO;
assert.ok(A, 'game debug API loaded');

const p = A.makePlayer('reborn_blade', 'CraftTester');
A.G.player = p;
A.buildHud();
A.recompute(p, true);
A.loadMap('town_awakening');

const qty = id => p.inventory.find(e => !e.uid && e.itemId === id)?.qty || 0;
const recipe = CONTENT.recipes.find(r => r.id === 'r_sharpening');
assert.ok(recipe, 'sharpening stone recipe exists');

// 1) Refusal leaves everything untouched.
p.zeny = 1000;
const zenyBefore = p.zeny;
A.craftItem('r_sharpening');
assert.equal(qty('sharpening_stone'), 0, 'craft without materials must produce nothing');
assert.equal(p.zeny, zenyBefore, 'refused craft must not charge zeny');

// 2) Success consumes exact zeny + materials and yields the output.
A.addItem('wolf_fang', 5);
A.craftItem('r_sharpening');
assert.equal(qty('sharpening_stone'), 1, 'craft produces the output');
assert.equal(qty('wolf_fang'), 3, 'craft consumes exactly the recipe materials');
assert.equal(p.zeny, zenyBefore - recipe.cost, 'craft charges exactly the recipe cost');

// 3) Zeny gate: enough materials, empty purse → refused.
p.zeny = 0;
A.craftItem('r_sharpening');
assert.equal(qty('sharpening_stone'), 1, 'craft refused with empty purse');
assert.equal(qty('wolf_fang'), 3, 'refused craft must not consume materials');

// 4) Gear recipe rolls a real instance.
p.zeny = 5000;
A.addItem('dragon_heart', 1); A.addItem('star_iron', 3);
A.craftItem('r_seraph');
assert.ok(p.inventory.some(e => e.uid && e.itemId === 'seraph_ward'), 'gear recipe yields an equipment instance');
assert.equal(qty('dragon_heart'), 0, 'gear recipe consumes its materials');

console.log('Craft audit passed: refusal, exact consumption, zeny gate, gear instance output.');
