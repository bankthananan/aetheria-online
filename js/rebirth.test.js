// Rebirth (NG+): only at the level cap; resets level/job/skills/stat points while
// keeping gear, zeny, guild rank, and world state; grants permanent stacking
// stat and HP/MP bonuses that survive save/load.
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
const T = A.DESIGN.tuning;

const p = A.makePlayer('reborn_blade', 'PhoenixTester');
A.G.player = p;
A.buildHud();
A.recompute(p, true);
A.loadMap('town_awakening');
A.G.running = true;

// baseline: a fresh Lv1 hero of this class (for bonus comparisons)
const freshStr = p.stats.str, freshMaxHp = p.maxHp;

// 1) Below the cap, rebirth refuses.
p.level = 79;
assert.equal(A.doRebirth(), false, 'rebirth must refuse below the level cap');
assert.equal(p.rebirths, 0, 'refused rebirth must not count');

// 2) At the cap: stage a developed character, then rebirth.
p.level = A.DESIGN.levelCap; p.jobLevel = 50; p.tierIndex = 2; p.jobBranchId = 'rift_knight';
p.alloc.str = 40; p.statPoints = 7; p.skillPoints = 3;
p.skillLevels.rift_slash = 5;
p.zeny = 12345;
const sword = A.rollItem('iron_sword', 0, 'common');
p.inventory.push(sword);
A.equip(sword.uid);
A.G.guildRankIdx = 6; A.G.guardiansSlain.add('elderwood_treant');
A.recompute(p, true);

assert.equal(A.doRebirth(), true, 'rebirth must fire at the level cap');
assert.equal(p.rebirths, 1);
assert.equal(p.level, 1, 'level resets');
assert.equal(p.jobLevel, 1, 'job level resets');
assert.equal(p.tierIndex, 0, 'class tier resets');
assert.equal(p.jobBranchId, null, 'second-job branch resets so the next life can choose again');
assert.equal(p.alloc.str, 0, 'stat allocation resets');
assert.ok(!p.skillLevels.rift_slash || p.skillLevels.rift_slash === 1, 'learned skill ranks reset to a fresh kit');
assert.equal(p.zeny, 12345, 'zeny survives rebirth');
assert.equal(p.equip.weapon?.uid, sword.uid, 'equipped gear survives rebirth');
assert.equal(A.G.guildRankIdx, 6, 'guild rank survives rebirth');
assert.ok(A.G.guardiansSlain.has('elderwood_treant'), 'world conquest survives rebirth');

// 3) Permanent bonuses: +stat and +HP/MP vs an unreborn Lv1.
assert.equal(p.stats.str, freshStr + T.rebirthStatBonus, 'rebirth grants the permanent all-stat bonus');
const expectedHp = Math.round((freshMaxHp) * 1);   // fresh baseline had no bonus
assert.ok(p.maxHp > expectedHp, 'rebirth grants permanent max HP');
assert.ok(A.G.achievements.has('ach_reborn'), 'rebirth unlocks the Twice-Born achievement');

// 4) Bonuses persist through save/load.
A.saveGame();
A.G.player = null;
assert.ok(A.resumeGame(), 'save must load back');
const p2 = A.G.player;
assert.equal(p2.rebirths, 1, 'rebirth count survives save/load');
assert.equal(p2.stats.str, freshStr + T.rebirthStatBonus, 'stat bonus survives save/load');

// 5) Second rebirth stacks.
p2.level = A.DESIGN.levelCap;
assert.equal(A.doRebirth(), true);
assert.equal(p2.rebirths, 2);
assert.equal(p2.stats.str, freshStr + 2 * T.rebirthStatBonus, 'bonuses stack per rebirth');

// 6) NG+ hardcore: HP/DEF/ATK scale independently. Retained usable weapon
// ATK adds early-run HP pressure that fades as monster level approaches 80.
const slimeDef = A.CONTENT.monsters.find(m => m.id === 'slime');
const ng2 = A.monsterStatsFor(slimeDef, slimeDef.level);
p2.rebirths = 0;
const ng0 = A.monsterStatsFor(slimeDef, slimeDef.level);
p2.rebirths = 2;
const near = (a, b) => Math.abs(a - b) <= 1;   // engine rounds once; recomputing here rounds twice
const retainedAtk = A.effAtk(p2.equip.weapon) + A.effAtk(p2.equip.accessory);
const levelProgress = (slimeDef.level - 1) / (A.DESIGN.levelCap - 1);
const retainedGearHp = Math.min(T.rebirthGearHpCap, retainedAtk * T.rebirthGearHpPerAtk) * (1 - levelProgress);
assert.ok(near(ng2.hp, ng0.hp * (1 + 2 * T.rebirthMonsterHpMult + retainedGearHp)), 'monster HP scales with rebirths and retained attack gear');
assert.ok(near(ng2.dv, ng0.dv * (1 + 2 * T.rebirthMonsterDefMult)), 'monster DEF scales per rebirth');
assert.ok(near(ng2.atk, ng0.atk * (1 + 2 * T.rebirthMonsterAtkMult)), 'monster ATK scales per rebirth');
assert.ok(ng2.exp > ng0.exp, 'harder monsters pay more EXP');

console.log('Rebirth audit passed: cap gate, clean reset, kept wealth/world, stacking permanent bonuses, persistence.');
