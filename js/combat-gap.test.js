// Fighting-up must stay earned: the level-gap knobs hold their tuned values and
// burn DOTs obey the same gap penalty as direct hits (they used to bypass it,
// letting a Lv16 melt Lv22-25 monsters — see gapsim findings, 2026-07).
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

const { COMBAT } = await import('./combat.js');
const { CONTENT } = await import('./content.js');
await import('./game.js');
const A = globalThis.__AWO;
assert.ok(A, 'game debug API loaded');

// 1) The tuned wall values must not silently drift soft again.
const t = A.DESIGN.tuning;
assert.equal(t.combatGapFalloff, 0.15, 'combatGapFalloff drifted');
assert.equal(t.combatGapFloor, 0.12, 'combatGapFloor drifted');
assert.equal(t.combatGapHitPerLvl, 6, 'combatGapHitPerLvl drifted');
assert.equal(A.combatGapFactor(16, 20), 1 - 4 * 0.15, '+4 damage factor');
assert.equal(A.combatGapFactor(16, 22), 0.12, '+6 must hit the floor (wall)');
assert.equal(A.combatGapFactor(16, 25), 0.12, '+9 must hit the floor (wall)');
assert.equal(A.combatGapFactor(25, 16), 1, 'fighting down is never damage-penalized');

// 2) Burn DOT ticks must be gap-scaled like every other player damage source.
const p = A.makePlayer('codeweaver', 'GapTester');
p.level = 16; p.jobLevel = 16; p.skillPoints = 5;
p.alloc.int = 60;   // high ATK so a scaled and an unscaled burn tick genuinely differ
A.G.player = p;
A.buildHud();
A.recompute(p, true);
A.learnSkill('arcane_bolt');           // prerequisite chain for flame_burst
A.learnSkill('flame_burst');
assert.ok(p.skillLevels.flame_burst, 'test setup: flame_burst learnable at Lv16');
A.loadMap('whispering_woods');
A.G.monsters.forEach(m => { m.alive = false; m.deadUntil = vnow + 9e9; m.x = m.y = 20000; });
p.hp = p.maxHp; p.mp = p.maxMp;
const acolyte = CONTENT.monsters.find(m => m.id === 'drowned_acolyte');
const m = A.makeMonster(acolyte, p.x + 32, p.y, 25);   // +9 above the player
A.G.monsters.push(m);
A.G.target = m;
A.castSkillById('flame_burst');
const burn = m.statuses.burn;
assert.ok(burn, 'flame_burst must apply burn');
const burnDef = COMBAT.statusEffects.burn;
const expected = Math.max(burnDef.tickDamage,
  Math.round(p.atkStat * burnDef.powerRatio * A.combatGapFactor(p.level, m.lvl)));
assert.equal(burn.tickDamage, expected, 'burn tick must include the level-gap factor');
const unscaled = Math.round(p.atkStat * burnDef.powerRatio);
assert.ok(burn.tickDamage < unscaled || unscaled <= burnDef.tickDamage,
  'burn tick must not use unscaled player ATK vs a far-higher monster');

console.log('Combat gap audit passed: wall knobs intact, burn DOT obeys the level-gap penalty.');
