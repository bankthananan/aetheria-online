import assert from 'node:assert/strict';

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
globalThis.localStorage = {
  _data: {}, getItem(key) { return this._data[key] || null; },
  setItem(key, value) { this._data[key] = String(value); }, removeItem(key) { delete this._data[key]; },
};
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

const { MAPS } = await import('./maps.js');
const { T, setLanguage } = await import('./locale.js');
const { AUDIO } = await import('./audio.js');
await import('./game.js');
const A = globalThis.__AWO;

assert.ok(A, 'game debug API loaded');
A.G.player = A.makePlayer('reborn_blade', 'Heat Tester');
A.G.player.level = 80;
A.recompute(A.G.player);
A.buildHud();

for (const map of Object.values(MAPS)) {
  A.loadMap(map.id);
  assert.equal(AUDIO.currentMusicTheme(), map.id, `${map.id} plays its own regional score`);
}

const huntingMaps = Object.values(MAPS).filter(map => map.band);
for (let sample = 0; sample < 20; sample++) for (const map of huntingMaps) {
  A.loadMap(map.id);
  const normal = A.G.monsters.filter(monster => monster.def.sizeTiles < 2);
  assert.equal(normal.length, map.spawns.filter(spawn => spawn.levelRange).reduce((sum, spawn) => sum + spawn.count, 0),
    `${map.id} spawned the full normal population`);
  for (const monster of normal) {
    const depth = A.heatDepthAt(A.G.heatField, Math.floor(monster.x / 32), Math.floor(monster.y / 32));
    const [minDepth, maxDepth] = monster.spawnSpec.depth;
    const [minLevel, maxLevel] = monster.spawnSpec.levelRange;
    assert.ok(depth >= minDepth && depth <= maxDepth,
      `${map.id}/${monster.def.id} depth ${depth} escaped ${minDepth}-${maxDepth}`);
    assert.ok(monster.lvl >= minLevel && monster.lvl <= maxLevel,
      `${map.id}/${monster.def.id} level ${monster.lvl} escaped ${minLevel}-${maxLevel}`);
  }
}

A.loadMap('whispering_woods');
const slimes = A.G.monsters.filter(monster => monster.def.id === 'slime');
const boars = A.G.monsters.filter(monster => monster.def.id === 'thornback_boar');
assert.ok(slimes.filter(monster => A.heatDepthAt(A.G.heatField, Math.floor(monster.x / 32), Math.floor(monster.y / 32)) <= 0.20).length >= 6,
  'at least 40% of Slimes are guaranteed in the entry nursery');
assert.ok(boars.every(monster => A.heatDepthAt(A.G.heatField, Math.floor(monster.x / 32), Math.floor(monster.y / 32)) >= 0.68),
  'all Thornback Boars spawn in the deep woods');

for (const monster of [slimes[0], boars[0]]) {
  monster.alive = false;
  A.respawn(monster);
  const depth = A.heatDepthAt(A.G.heatField, Math.floor(monster.x / 32), Math.floor(monster.y / 32));
  assert.ok(depth >= monster.spawnSpec.depth[0] && depth <= monster.spawnSpec.depth[1], `${monster.def.id} respawn stayed in habitat`);
  assert.ok(monster.lvl >= monster.spawnSpec.levelRange[0] && monster.lvl <= monster.spawnSpec.levelRange[1], `${monster.def.id} respawn stayed in level range`);
}

// Hunt selects only monsters up to player level +5. Deliberate canvas clicks
// remain unrestricted so players can still choose a dangerous manual fight.
A.G.player.level = 5;
A.G.player.godMode = true;
A.recompute(A.G.player);
A.loadMap('whispering_woods');
assert.equal(A.autoHuntLevelCap(A.G.player), 10, 'Lv5 Hunt ceiling is Lv10');
const eligibleSlime = A.G.monsters.find(monster => monster.def.id === 'slime');
const strongBoar = A.G.monsters.find(monster => monster.def.id === 'thornback_boar');
for (const monster of A.G.monsters) {
  monster.alive = monster === eligibleSlime || monster === strongBoar;
  monster.deadUntil = monster.alive ? 0 : Infinity;
}
eligibleSlime.lvl = 10; eligibleSlime.hp = eligibleSlime.maxHp = 999999;
strongBoar.lvl = 11; strongBoar.hp = strongBoar.maxHp = 999999;
eligibleSlime.x = A.G.player.x; eligibleSlime.y = A.G.player.y;
strongBoar.x = A.G.player.x + 32; strongBoar.y = A.G.player.y;
A.G.autoFarm = true; A.G.huntTargetId = null; A.G.target = null; A.G.manualIntent = null;
A.step(0);
assert.equal(A.G.target, eligibleSlime, 'generic Hunt skips a closer monster above player level +5');
assert.equal(A.G.targetSource, 'hunt', 'automatic acquisition marks Hunt-owned targets');

for (const monster of A.G.monsters) {
  monster.alive = monster === strongBoar;
  monster.deadUntil = monster.alive ? 0 : Infinity;
}
A.G.target = null; A.G.targetSource = null; strongBoar.x = A.G.player.x + 10 * 32;
A.step(0);
assert.equal(A.G.target, null, 'Hunt stays idle when every target is above its level ceiling');

// Aggressive retaliation is also non-manual, so it cannot make Hunt attack a
// dangerous target on the following frame.
strongBoar.x = A.G.player.x; strongBoar.y = A.G.player.y; strongBoar.atkCdUntil = 0;
const hpBeforeRetaliation = strongBoar.hp;
const originalRandom = Math.random;
Math.random = () => 0;
A.step(0);
assert.equal(A.G.target, null, 'over-limit aggression cannot become a Hunt retaliation target');
A.step(0);
assert.equal(strongBoar.hp, hpBeforeRetaliation, 'Hunt does not attack an over-limit retaliation target');

A.onCanvasClick(strongBoar.x, strongBoar.y);
assert.equal(A.G.target, strongBoar, 'manual monster clicks can still select stronger prey');
assert.equal(A.G.targetSource, 'manual', 'manual clicks preserve player target ownership');
A.G.player.attackCdUntil = 0;
A.step(0);
assert.ok(strongBoar.hp < hpBeforeRetaliation, 'manual combat can damage a monster above the Hunt ceiling');
Math.random = originalRandom;

A.G.target = null; A.G.targetSource = null; A.G.huntTargetId = 'thornback_boar';
strongBoar.x = A.G.player.x + 10 * 32; strongBoar.lvl = 11;
A.step(0);
assert.equal(A.G.target, null, 'focused quest Hunt also respects the level ceiling');
strongBoar.lvl = 10;
A.step(0);
assert.equal(A.G.target, strongBoar, 'focused quest Hunt selects the target at the +5 boundary');
A.G.autoFarm = false; A.G.huntTargetId = null; A.G.target = null;
A.G.player.level = 80;
A.recompute(A.G.player);

for (const [questId, npcId] of [['q_meet', 'oracle'], ['q_market_intro', 'merchant'], ['q_guild_intro', 'elder']]) {
  A.startQuest(questId);
  A.loadMap('town_awakening');
  A.activateTaskGuide('story', questId);
  assert.equal(A.G.taskGuide?.mode, 'npc', `${questId} uses NPC guidance`);
  assert.equal(A.G.taskGuide?.npcId, npcId, `${questId} guides to ${npcId}`);
  assert.ok(A.G.path?.length, `${questId} has a traversable route`);
  const npc = A.G.npcs.find(candidate => candidate.id === npcId);
  A.G.player.x = npc.x * 32 + 16; A.G.player.y = npc.y * 32 + 16;
  assert.equal(A.interact(npcId), true, `${npcId} interaction succeeds`);
  assert.equal(A.G.quest, null, `${questId} completes through live quest logic`);
}

A.startQuest('q_briar');
A.loadMap('whispering_woods');
A.activateTaskGuide('story', 'q_briar');
assert.equal(A.G.huntTargetId, 'thornback_boar', 'deep-Woods quest focuses Thornback Boars');
assert.equal(A.G.autoFarm, true, 'deep-Woods quest starts focused hunting on arrival');

setLanguage('th');
for (const [key, category] of [
  ['Supplies for the Road', 'quests'], ['A Name on the Board', 'quests'],
  ['To Whispering Woods', 'maps'], ['Navigate to this task', 'ui'], ['Rewards: {items}', 'ui'],
  ['Auto-hunt ON — targets up to Lv {level}; stronger monsters are ignored.', 'ui'],
  ['Auto-hunt target limit: Lv {level}', 'ui'],
]) assert.notEqual(T(key, category), key, `${category}/${key} has a Thai translation`);

console.log('Heat habitats, respawns, quest guidance, and Thai runtime labels passed.');
