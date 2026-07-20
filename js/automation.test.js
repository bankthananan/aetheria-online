import assert from 'node:assert/strict';

let clock = 1000;
globalThis.performance = { now: () => clock };
const ctx2d = () => new Proxy({
  measureText: () => ({ width: 10 }),
  createLinearGradient: () => ({ addColorStop() {} }),
  createRadialGradient: () => ({ addColorStop() {} }),
}, { get(target, key) { return key in target ? target[key] : () => {}; } });
function makeEl() {
  return {
    style: { setProperty() {} }, dataset: {}, children: [], textContent: '', innerHTML: '', hidden: false,
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
  setItem(key, value) { this._data[key] = String(value); }, removeItem(key) { delete this._data[key]; }, clear() { this._data = {}; },
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

await import('./game.js');
const A = globalThis.__AWO;
assert.ok(A, 'game debug API loaded');

assert.deepEqual(A.normaliseAutoConfig(null), { skills: true, heal: true, potions: true, profile: 'balanced' },
  'automation defaults enable the connected controller');
assert.deepEqual(A.normaliseAutoConfig({ skills: false, heal: false, potions: false, profile: 'unknown' }),
  { skills: false, heal: false, potions: false, profile: 'balanced' }, 'saved toggles survive and invalid profiles migrate');

const mage = A.makePlayer('codeweaver', 'Rotation');
A.G.player = mage;
mage.level = 80; mage.tierIndex = 2; mage.jobLevel = 50;
mage.skillLevels = { arcane_bolt: 1, flame_burst: 1, prismatic_ray: 1, meteor: 1 };
A.recompute(mage, false);
mage.mp = mage.maxMp; mage.momentum = 0; mage.skillCd = {};
A.loadMap('whispering_woods');
const target = A.G.monsters.find(monster => monster.def.id === 'slime');
target.x = mage.x; target.y = mage.y; target.hp = target.maxHp; target.statuses = {};
A.G.target = target; A.G.monsters = [target]; A.G.autoConfig = A.normaliseAutoConfig(null);
assert.equal(A.chooseAutoSkill(mage, target)?.id, 'flame_burst', 'smart rotation opens with a missing status setup');
target.statuses.burn = { until: clock + 5000 };
assert.equal(A.chooseAutoSkill(mage, target)?.id, 'prismatic_ray', 'matching detonator beats the starter while burn is live');
mage.momentum = 3;
assert.equal(A.chooseAutoSkill(mage, target)?.id, 'meteor', 'ready matching finisher wins the damage decision');
A.G.autoConfig.skills = false;
assert.equal(A.chooseAutoSkill(mage, target), null, 'Smart Skills toggle disables automated skill selection');

const paladin = A.makePlayer('lightbringer', 'Recovery');
A.G.player = paladin;
paladin.level = 80; paladin.tierIndex = 2; paladin.jobLevel = 50;
paladin.skillLevels = { smite: 1, lay_on_hands: 1, sanctuary: 1 };
A.recompute(paladin, false);
paladin.maxHp = 1000; paladin.hp = 400; paladin.maxMp = paladin.mp = 200; paladin.skillCd = {};
assert.equal(A.chooseAutoHealSkill(paladin)?.id, 'sanctuary', 'large missing health selects the stronger learned heal');
paladin.inventory = [
  { itemId: 'elixir', qty: 1 }, { itemId: 'greater_potion', qty: 1 }, { itemId: 'minor_potion', qty: 1 }, { itemId: 'mana_potion', qty: 1 },
];
paladin.hp = 975;
assert.equal(A.bestRecoveryItem(paladin, 'hp')?.id, 'minor_potion', 'recovery chooses the smallest sufficient health potion');
paladin.hp = 900;
assert.equal(A.bestRecoveryItem(paladin, 'hp')?.id, 'greater_potion', 'recovery upgrades potion size when a minor potion underfills badly');

A.G.autoConfig = { skills: true, heal: false, potions: true, profile: 'balanced' };
paladin.hp = 100; paladin.potionCdUntil = clock + 2000;
const inventoryOnCooldown = JSON.stringify(paladin.inventory);
assert.equal(A.autoRecoveryAction(), null, 'potion cooldown produces no rejected automation action');
assert.equal(JSON.stringify(paladin.inventory), inventoryOnCooldown, 'cooldown-aware recovery consumes nothing');
clock += 3000; paladin.potionCdUntil = 0; paladin.hp = paladin.maxHp; paladin.mp = 0;
const manaAction = A.autoRecoveryAction();
assert.deepEqual(manaAction, { type: 'item', id: 'mana_potion' }, 'automation restores mana when health is safely above danger');

// Focused encounters report explicit wait/unsafe states and preserve a manual
// target even when it is not the currently tracked species.
A.G.player = mage; mage.level = 5; A.recompute(mage, false);
A.loadMap('whispering_woods');
const slime = A.G.monsters.find(monster => monster.def.id === 'slime');
const boar = A.G.monsters.find(monster => monster.def.id === 'thornback_boar');
A.G.autoFarm = true; A.G.huntTargetId = 'slime'; A.G.target = null; A.G.manualIntent = null; A.G._autoAcquireAt = 0;
for (const monster of A.G.monsters) { monster.alive = false; monster.deadUntil = clock + 4000; }
A.acquireAutoTarget(mage);
assert.equal(A.G.autoState.phase, 'waiting', 'dead focused population exposes a respawn wait state');
boar.alive = true; boar.lvl = 11; boar.x = mage.x; boar.y = mage.y;
A.onCanvasClick(boar.x, boar.y);
A.step(0);
assert.equal(A.G.target, boar, 'manual monster choice survives focused-hunt species filtering');
assert.equal(A.G.targetSource, 'manual', 'manual target ownership remains explicit');

// Delivery bounties route to their rolled source, and a completed tracked hunt
// becomes a turn-in route without clearing the guide.
const delivery = { id: 'delivery-source', kind: 'deliver', target: 'blessed_ore', targetName: 'Blessed Ore', count: 3,
  progress: 0, sourceMonsterId: 'magma_beetle' };
A.G.activeGuilds = [delivery];
const deliveryAction = A.taskAction('guild', delivery.id);
assert.equal(deliveryAction.monsterId, 'magma_beetle', 'delivery route respects its persisted source monster');
assert.equal(deliveryAction.mapId, 'dragon_caldera', 'delivery route uses the source monster habitat');

mage.level = 80; A.recompute(mage, false); A.loadMap('whispering_woods');
const bounty = { id: 'turn-in', kind: 'kill', target: 'slime', targetName: 'Gel Slime', count: 1,
  progress: 0, done: false, reward: { exp: 1, zeny: 1 }, pts: 1 };
A.G.activeGuilds = [bounty];
A.G.taskGuide = { source: 'guild', taskId: bounty.id, mode: 'hunt', monsterId: 'slime', mapId: 'whispering_woods', resumeAutoFarm: false };
A.G.autoFarm = true; A.G.huntTargetId = 'slime';
A.guildKill('slime');
assert.equal(A.G.taskGuide?.mode, 'npc', 'completed tracked bounty transitions to its turn-in objective');
assert.equal(A.G.taskGuide?.npcId, 'elder', 'tracked turn-in routes to Elder Maro');
assert.equal(A.G.taskGuide?.mapId, 'town_awakening', 'tracked turn-in plots a cross-map return route');

const panel = A.automationPanelHtml(mage);
assert.ok(panel.includes('data-auto-toggle="skills"') && panel.includes('data-auto-toggle="heal"') && panel.includes('data-auto-toggle="potions"'),
  'Automation Console exposes the three independent combat toggles');
assert.equal((panel.match(/data-auto-profile=/g) || []).length, 3, 'Automation Console exposes all recovery profiles');

A.G.autoConfig = { skills: false, heal: true, potions: false, profile: 'cautious' };
A.G.running = true;
A.saveGame();
const saved = JSON.parse(globalThis.localStorage.getItem('awo_save_v1'));
assert.deepEqual(saved.world.autoConfig, A.G.autoConfig, 'automation preferences persist in the compatible save schema');
assert.equal(saved.v, 3, 'automation preferences require no save-version migration');
assert.equal(A.resumeGame(), true, 'automation save resumes through the live load path');
assert.deepEqual(A.G.autoConfig, { skills: false, heal: true, potions: false, profile: 'cautious' },
  'automation preferences survive a full save/load round trip');

assert.equal(A.stopAutomationOnDeath(), true, 'death reports that active automation was stopped');
assert.equal(A.G.autoFarm, false, 'death safety disables Hunt');
assert.equal(A.G.taskGuide, null, 'death safety clears active route guidance');
assert.equal(A.G.autoState.phase, 'blocked', 'death safety leaves a visible stopped state');

const stale = structuredClone(saved);
stale.world.autoFarm = true;
stale.world.huntTargetId = 'slime';
stale.world.taskGuide = { source: 'guild', taskId: 'missing-bounty', mode: 'hunt', monsterId: 'slime', mapId: 'whispering_woods' };
stale.world.activeGuilds = [];
globalThis.localStorage.setItem('awo_save_v1', JSON.stringify(stale));
assert.equal(A.resumeGame(), true, 'stale task save still loads safely');
assert.equal(A.G.taskGuide, null, 'missing persisted task is discarded during reconciliation');
assert.equal(A.G.autoFarm, false, 'stale task does not silently become unrelated free hunting');

console.log('Automation controller audit passed: tracking, encounters, smart skills, recovery, HUD state, and persistence are valid.');
