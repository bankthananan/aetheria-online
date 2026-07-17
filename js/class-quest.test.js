// Class calling trials: after the guild intro, the story forks to the hero's
// class trial (kill or collect), then every branch merges back into q_prove.
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
// quest chains advance via setTimeout — queue callbacks and flush them explicitly
let pendingTimers = [];
globalThis.setTimeout = fn => { pendingTimers.push(fn); return 0; };
const flush = () => { const fns = pendingTimers; pendingTimers = []; fns.forEach(fn => { try { fn(); } catch {} }); };
globalThis.Image = class {};
globalThis.innerWidth = 1440;
globalThis.innerHeight = 900;

const { DESIGN } = await import('./design.js');
const { CONTENT } = await import('./content.js');
await import('./game.js');
const A = globalThis.__AWO;
assert.ok(A, 'game debug API loaded');

const questById = Object.fromEntries(CONTENT.quests.map(q => [q.id, q]));

for (const cls of DESIGN.classes) {
  pendingTimers = [];
  const p = A.makePlayer(cls.id, 'Trials');
  p.level = 5;
  A.G.player = p;
  A.buildHud();
  A.recompute(p, true);
  A.loadMap('town_awakening');
  A.G.quest = null; A.G.pendingQuest = null; A.G.killCounts = {};
  flush();

  A.startQuest('q_guild_intro', true);
  assert.equal(A.G.quest, 'q_guild_intro', `${cls.id}: guild intro starts`);
  A.G.talked.add('elder');
  A.checkQuest();
  flush();

  const trialId = `q_calling_${cls.id}`;
  assert.equal(A.G.quest, trialId, `${cls.id}: story forks to its own calling trial`);

  const trial = questById[trialId];
  if (trial.objective.type === 'kill') {
    A.G.killCounts[trial.objective.target] = trial.objective.count;
  } else {
    A.addItem(trial.objective.target, trial.objective.count);
  }
  A.checkQuest();
  flush();
  assert.equal(A.G.quest, 'q_prove', `${cls.id}: trial merges back into q_prove`);
  if (trial.objective.type === 'collect') {
    const left = p.inventory.find(e => e.itemId === trial.objective.target)?.qty || 0;
    assert.equal(left, 0, `${cls.id}: collect trial consumes its materials on turn-in`);
  }
}

console.log(`Class trial audit passed: all ${DESIGN.classes.length} classes fork to their calling and merge into q_prove.`);
