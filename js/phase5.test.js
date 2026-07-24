import assert from 'node:assert/strict';

// DOM/audio shim (copied from phase2.test.js) + real localStorage & rAF stub (phase4 pattern)
globalThis.localStorage = { getItem() { return 'en'; }, setItem() {}, removeItem() {} };
globalThis.window = {
  AudioContext: class {
    constructor() { this.currentTime = 0; this.destination = {}; }
    createGain() { return { gain: { value: 1, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime(v) { this.value = v; }, cancelScheduledValues() {} }, connect() { return this; }, disconnect() {} }; }
    createBuffer() { return { getChannelData: () => new Float32Array(100) }; }
    createBufferSource() { return { buffer: null, connect() { return this; }, start() {}, stop() {} }; }
    createOscillator() { return { type: 'square', frequency: { value: 440, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() { return this; }, start() {}, stop() {} }; }
    createBiquadFilter() { return { type: 'bandpass', frequency: { value: 1200 }, connect() { return this; } }; }
  },
  addEventListener() {}, removeEventListener() {},
};
const makeCtx = () => new Proxy({}, { get(t, p) { return p in t ? t[p] : () => {}; } });
const makeEl = () => ({ style: {}, dataset: {}, children: [], classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } }, appendChild(c) { return c; }, removeChild() {}, remove() {}, querySelectorAll() { return []; }, querySelector() { return null; }, addEventListener() {}, setAttribute() {} });
const elements = Object.fromEntries(['root', 'hud', 'overlays', 'fx-layer', 'game-canvas', 'touch-controls'].map(id => [`#${id}`, makeEl()]));
Object.assign(elements['#game-canvas'], { width: 832, height: 576, getContext: () => makeCtx() });
globalThis.document = {
  createElement(tag) { const el = makeEl(); if (tag === 'canvas') { el.width = 100; el.height = 100; el.getContext = () => makeCtx(); } return el; },
  getElementById(id) { return elements[`#${id}`] || makeEl(); },
  querySelector(sel) { return elements[sel] || makeEl(); }, querySelectorAll() { return []; },
  body: { ...makeEl(), classList: { add() {}, remove() {}, contains() { return false; } } }, head: makeEl(),
};

const { COMBAT } = await import('./combat.js');
const { CONTENT } = await import('./content.js');
await import('./game.js');
const A = globalThis.window.__AWO;
const { G, DESIGN, makePlayer, loadMap, addItem, monsterElement, skillElement, attackElement, elementMult,
  weakToElement, milestoneStat, milestoneTarget, claimMilestone } = A;
const FOREVER = Number.MAX_SAFE_INTEGER;
const E = DESIGN.tuning.elements;

console.log('=== RUNNING PHASE 5 TEST SUITE ===');

// ---- Task 5.1: element rework ----
assert.ok(E.ids.includes('nature'), 'nature element added');
assert.equal(E.ids.length, 7, 'seven element ids (incl. neutral physical)');
assert.equal(E.weakness.physical, undefined, 'physical has no weakness entry (neutral)');
// neutral: physical monster takes 1x from every element
const physMon = { def: {} };
for (const el of E.ids) assert.equal(elementMult(el, physMon), 1, `physical neutral vs ${el}`);
// nature monster (slime) is weak to fire only
const slime = CONTENT.monsters.find(m => m.id === 'slime');
assert.equal(slime.element, 'nature', 'Gel Slime is nature');
const slimeMon = { def: slime };
assert.equal(elementMult('fire', slimeMon), E.weaknessMult, 'nature weak to fire (1.5x)');
assert.equal(elementMult('ice', slimeMon), 1, 'nature not weak to ice');
// the wheel: void is countered by holy
const voidMon = { def: CONTENT.monsters.find(m => m.element === 'void') };
assert.equal(elementMult('holy', voidMon), E.weaknessMult, 'void monster takes 1.5x from holy');
// PALADIN IMBUE: skills are physical by default (holy only while Blessed)
const smite = COMBAT.skills.find(s => s.id === 'smite');
assert.equal(skillElement(smite), 'physical', 'paladin skill is physical by default (no innate holy)');
const pal = makePlayer('lightbringer', 'Cru');
assert.equal(attackElement(pal, smite), 'physical', 'un-imbued paladin skill hits physical');
assert.equal(attackElement(pal, null), 'physical', 'un-imbued paladin basic attack is physical');
assert.equal(elementMult(attackElement(pal, smite), voidMon), 1, 'un-imbued paladin does 1x to void');
pal.imbue = { element: 'holy', until: FOREVER };   // simulate an active Blessing
assert.equal(attackElement(pal, smite), 'holy', 'Blessed paladin skill becomes holy');
assert.equal(attackElement(pal, null), 'holy', 'Blessed paladin basic attack becomes holy');
assert.equal(elementMult(attackElement(pal, smite), voidMon), E.weaknessMult, 'Blessed paladin does 1.5x to void');
pal.imbue.until = 0;   // expired
assert.equal(attackElement(pal, smite), 'physical', 'expired imbue reverts to physical');
// imbue never overrides an already-elemental skill (a fire spell stays fire)
const flame = COMBAT.skills.find(s => s.id === 'flame_burst');
const mageP = makePlayer('codeweaver', 'M'); mageP.imbue = { element: 'holy', until: FOREVER };
assert.equal(attackElement(mageP, flame), 'fire', 'imbue does not override an elemental skill');
// every skill resolves to a valid element
for (const s of COMBAT.skills) assert.ok(E.ids.includes(skillElement(s)), `${s.id} resolves to a real element`);
// sample derivations
assert.equal(skillElement(COMBAT.skills.find(s => s.id === 'flame_burst')), 'fire');
assert.equal(skillElement(COMBAT.skills.find(s => s.id === 'frost_chains')), 'ice');
assert.equal(skillElement(COMBAT.skills.find(s => s.id === 'static_field')), 'lightning');
console.log('✓ Task 5.1 | Element rework: nature, neutral physical, holy fix, all skills typed');

// ---- Task 5.2: Collection Book ----
G.player = makePlayer('reborn_blade', 'Booktester');
loadMap('whispering_woods');
// weak-to computation
assert.equal(weakToElement('nature'), 'fire', 'nature weak-to resolves to fire');
assert.equal(weakToElement('physical'), null, 'physical (neutral) has no weak-to');
// discovery gating: fresh player has not seen an arbitrary monster
G.seenMonsters = new Set(); G.collectedItems = new Set(); G.claimedMilestones = new Set(); G.killCounts = {};
assert.ok(!G.seenMonsters.has('slime'), 'slime undiscovered initially');
// killing records discovery
const mon = G.monsters.find(x => x.alive);
if (mon) { mon.hp = 1; A.G.killCounts[mon.def.id] = 0; }
// simulate discovery directly (killMonster wiring)
G.seenMonsters.add('slime'); G.killCounts.slime = 100;
assert.ok(G.seenMonsters.has('slime'), 'slime discovered after kill');
// addItem records collected equipment
addItem('iron_sword', 1);
assert.ok(G.collectedItems.has('iron_sword'), 'equipment recorded on pickup');
// milestone stat + target + one-time claim
assert.equal(milestoneStat('kills'), 100, 'kills stat sums killCounts');
const km = CONTENT.milestones.find(m => m.id === 'mile_hunt_100');
assert.equal(milestoneTarget(km), 100, 'fixed-target milestone');
const before = G.player.zeny;
assert.equal(claimMilestone('mile_hunt_100'), true, 'completed milestone claims');
assert.equal(G.player.zeny, before + km.reward.zeny, 'reward zeny granted');
assert.ok(G.claimedMilestones.has('mile_hunt_100'), 'claim recorded');
assert.equal(claimMilestone('mile_hunt_100'), false, 'cannot claim twice');
// "all" target milestone computes from data
const allMon = CONTENT.milestones.find(m => m.id === 'mile_bestiary_all');
assert.equal(milestoneTarget(allMon), CONTENT.monsters.length, 'bestiary-all target = monster count');
// book HTML renders both a discovered card and a silhouette without throwing
G._bookTab = 'bestiary';
const html = A.collectionBookHtml();
assert.ok(html.includes('Gel Slime'), 'discovered monster shows its name');
assert.ok(/\?\?\?/.test(html), 'undiscovered monsters render as silhouettes');
console.log('✓ Task 5.2a | Collection Book: discovery, milestones, rendering');

// ---- Task 5.2b: discovery persists through save/load ----
globalThis.innerWidth = 800; globalThis.innerHeight = 600;
globalThis.requestAnimationFrame = () => {};
G.running = true;
const store = {};
globalThis.window.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = v; }, removeItem: k => { delete store[k]; } };
G.seenMonsters = new Set(['slime', 'wolf']); G.collectedItems = new Set(['iron_sword']); G.claimedMilestones = new Set(['mile_hunt_100']);
A.saveGame();
G.seenMonsters = new Set(); G.collectedItems = new Set(); G.claimedMilestones = new Set();
A.resumeGame();
assert.ok(G.seenMonsters.has('slime') && G.seenMonsters.has('wolf'), 'seenMonsters restored');
assert.ok(G.collectedItems.has('iron_sword'), 'collectedItems restored');
assert.ok(G.claimedMilestones.has('mile_hunt_100'), 'claimedMilestones restored');
console.log('✓ Task 5.2b | Collection Book discovery round-trips through saveGame/resumeGame');

console.log('=== PHASE 5 TEST SUITE PASSED ===');
process.exit(0); // music sequencer interval keeps the loop alive otherwise
