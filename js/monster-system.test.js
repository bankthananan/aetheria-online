// Engine-level monster durability audit: opening pace, low-rolled Wolves,
// guardian health, and retained-gear pressure after a real rebirth.
import assert from 'node:assert/strict';

let vnow = 1000;
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
  querySelector: selector => elements[selector] || makeEl(), querySelectorAll: () => [],
  getElementById: id => elements[`#${id}`] || makeEl(), addEventListener() {}, removeEventListener() {},
};
globalThis.localStorage = { _data: {}, getItem(key) { return this._data[key] || null; }, setItem(key, value) { this._data[key] = String(value); }, removeItem(key) { delete this._data[key]; } };
const audioParam = { setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {}, cancelScheduledValues() {} };
const audioNode = { connect() { return this; }, start() {}, stop() {}, gain: audioParam, frequency: audioParam, Q: audioParam };
globalThis.AudioContext = class {
  constructor() { this.currentTime = 0; this.destination = {}; this.state = 'running'; }
  createOscillator() { return { ...audioNode }; } createGain() { return { ...audioNode }; }
  createBiquadFilter() { return { ...audioNode }; }
  createBuffer(_channels, size) { return { getChannelData: () => new Float32Array(size) }; }
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
Math.random = () => 0.5; // landed, non-critical hits and deterministic loot rolls

const def = id => A.CONTENT.monsters.find(monster => monster.id === id);
function spendAll(player, stat) {
  A.G.player = player;
  while (player.statPoints >= A.statCost(player, stat)) A.spendStat(stat);
}
function cast(player, monster, skillId) {
  A.G.player = player;
  A.G.monsters = [monster];
  A.G.target = monster;
  player.x = monster.x = 100;
  player.y = monster.y = 100;
  player.skillCd[skillId] = 0;
  player.mp = player.maxMp;
  vnow += 5000;
  A.castSkillById(skillId);
}

// A focused new ranger needs three real Piercing Shots to clear the opening Slime.
const novice = A.makePlayer('far_shot', 'DurabilityTester');
spendAll(novice, 'dex');
const openingSlime = A.makeMonster(def('slime'), 100, 100, 1);
cast(novice, openingSlime, 'piercing_shot');
cast(novice, openingSlime, 'piercing_shot');
assert.ok(openingSlime.alive && openingSlime.hp > 0, 'opening Slime must survive two starter casts');
cast(novice, openingSlime, 'piercing_shot');
assert.equal(openingSlime.alive, false, 'opening Slime should fall on the third starter cast');

// A level-10 ranger with common shop gear and a max first-job starter rank
// still needs two casts against the lowest Wolf roll.
const hunter = A.makePlayer('far_shot', 'WolfTester');
hunter.level = 10;
hunter.statPoints = A.PROGRESSION.startStatPoints + A.PROGRESSION.statPointsPerLevel * 9;
hunter.skillLevels.piercing_shot = 5;
hunter.equip.weapon = A.rollItem('iron_sword', 0, 'common');
hunter.equip.accessory = A.rollItem('power_ring', 0, 'common');
A.recompute(hunter, true);
spendAll(hunter, 'dex');
const lowWolf = A.makeMonster(def('wolf'), 100, 100, 8);
cast(hunter, lowWolf, 'piercing_shot');
assert.ok(lowWolf.alive && lowWolf.hp > 0, 'level-10 Piercing Shot must not one-shot a low-rolled Wolf');
cast(hunter, lowWolf, 'piercing_shot');
assert.equal(lowWolf.alive, false, 'low-rolled Wolf should fall on the second focused starter cast');

// Guardians use their own higher multiplier and do not inherit the normal-mob
// sqrt(level) curve on top of it.
const nullkingStats = A.monsterStatsFor(def('nullking'), 80);
assert.equal(
  nullkingStats.hp,
  Math.round(def('nullking').hp * A.DESIGN.tuning.monsterHpMult * A.DESIGN.tuning.bossHpMult),
  'guardian HP must use the dedicated guardian multiplier exactly once',
);
assert.equal(A.DESIGN.tuning.bossHpMult, 3.2, 'guardian multiplier must remain above the old 2.4x band');

// A real rebirth keeps legendary gear. Its usable ATK adds early monster HP,
// preventing the retained weapon from flattening the restarted world.
const veteran = A.makePlayer('far_shot', 'RebirthTester');
veteran.equip.weapon = A.rollItem('astral_glaive', 0, 'legendary');
veteran.equip.accessory = A.rollItem('transcendent_sigil', 0, 'legendary');
veteran.level = A.DESIGN.levelCap;
A.G.player = veteran;
A.recompute(veteran, true);
assert.equal(A.doRebirth(), true, 'max-level player can rebirth');
assert.equal(veteran.level, 1, 'rebirth resets Base Level');
assert.equal(veteran.rebirths, 1, 'rebirth counter increments');
assert.equal(veteran.equip.weapon.itemId, 'astral_glaive', 'rebirth keeps the equipped weapon');
const rebornSlime = A.monsterStatsFor(def('slime'), 1);
const rebornBasicDamage = Math.max(1, veteran.atkStat - rebornSlime.dv);
assert.ok(Math.ceil(rebornSlime.hp / rebornBasicDamage) >= 4, 'retained legendary gear must not one-shot rebirth Slimes');

// Magic formulas do not use weapon ATK, so they receive base rebirth scaling
// without paying the physical/ranged retained-gear surcharge.
const mage = A.makePlayer('codeweaver', 'MageRebirthTester');
mage.rebirths = 1;
mage.equip.weapon = A.rollItem('astral_glaive', 0, 'legendary');
mage.equip.accessory = A.rollItem('transcendent_sigil', 0, 'legendary');
A.G.player = mage;
A.recompute(mage, true);
const mageSlime = A.monsterStatsFor(def('slime'), 1);
assert.ok(mageSlime.hp < rebornSlime.hp, 'irrelevant weapon ATK must not inflate magic-class rebirth enemies');
assert.ok(Math.ceil(mageSlime.hp / Math.max(1, mage.atkStat - mageSlime.dv)) >= 4, 'magic rebirth opening remains durable');

const statusHtml = A.panelBody('char');
assert.ok(statusHtml.includes('+45% HP') && statusHtml.includes('+30% DEF') && statusHtml.includes('+15% ATK'), 'status explains split rebirth monster scaling');

console.log('Monster-system audit passed: opening pace, Wolf durability, guardian HP, and retained-gear rebirth scaling are valid.');
