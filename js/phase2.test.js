import assert from 'node:assert/strict';

// Mock minimal DOM environment for Node testing (same shim as phase1.test.js)
globalThis.localStorage = {
  getItem() { return 'en'; },
  setItem() {},
  removeItem() {},
};

globalThis.window = {
  AudioContext: class {
    constructor() {
      this.currentTime = 0;
      this.destination = {};
    }
    createGain() {
      return {
        gain: {
          value: 1,
          setValueAtTime() {},
          linearRampToValueAtTime() {},
          exponentialRampToValueAtTime() {},
          setTargetAtTime(v) { this.value = v; },
          cancelScheduledValues() {},
        },
        connect() { return this; },
        disconnect() {},
      };
    }
    createBuffer() {
      return { getChannelData: () => new Float32Array(100) };
    }
    createBufferSource() {
      return { buffer: null, connect() { return this; }, start() {}, stop() {} };
    }
    createOscillator() {
      return { type: 'square', frequency: { value: 440, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() { return this; }, start() {}, stop() {} };
    }
    createBiquadFilter() {
      return { type: 'bandpass', frequency: { value: 1200 }, connect() { return this; } };
    }
  },
  addEventListener() {},
  removeEventListener() {},
};

const makeCtx = () => new Proxy({}, {
  get(target, prop) {
    if (prop in target) return target[prop];
    return () => {};
  }
});

const makeEl = () => ({
  style: {}, dataset: {}, children: [],
  classList: { add() {}, remove() {}, contains() { return false; } },
  appendChild(c) { return c; }, removeChild() {}, remove() {},
  querySelectorAll() { return []; }, querySelector() { return null; }, addEventListener() {}, setAttribute() {}
});
const elements = Object.fromEntries(['root', 'hud', 'overlays', 'fx-layer', 'game-canvas', 'touch-controls'].map(id => [`#${id}`, makeEl()]));

globalThis.document = {
  createElement(tag) {
    const el = makeEl();
    if (tag === 'canvas') {
      el.width = 100;
      el.height = 100;
      el.getContext = () => makeCtx();
    }
    return el;
  },
  getElementById(id) { return elements[`#${id}`] || makeEl(); },
  querySelector(sel) { return elements[sel] || makeEl(); },
  querySelectorAll() { return []; },
  body: makeEl(),
  head: makeEl(),
};

const { COMBAT } = await import('./combat.js');
await import('./game.js');

const A = globalThis.window.__AWO;
const { G, DESIGN, makePlayer, loadMap, addItem,
  monsterElement, skillElement, elementMult, applyCrossCombo, applyStatus,
  performDodge, performParry, playerAvoidsHit, evaluateMacroRules, normaliseAutoConfig } = A;
const TS = 32;
const FOREVER = Number.MAX_SAFE_INTEGER;

console.log('=== RUNNING PHASE 2 TEST SUITE ===');

G.player = makePlayer(DESIGN.classes[0].id, 'Tester');
loadMap('whispering_woods');
const p = G.player;
// park monsters so nothing interferes with combat assertions
G.monsters.forEach(m => { m.x = m.y = m.homeX = m.homeY = 2000; });
assert.ok(G.monsters.length >= 3, 'field map has monsters to test against');

// ---- Task 2.1: elemental weakness matrix ----
const E = DESIGN.tuning.elements;
assert.equal(E.ids.length, 6, 'six elements defined');
for (const [def, att] of Object.entries(E.weakness)) {
  assert.ok(E.ids.includes(def) && E.ids.includes(att), `weakness pair ${def}→${att} uses real elements`);
}
assert.equal(skillElement(COMBAT.skills.find(s => s.id === 'flame_burst')), 'fire', 'burn skill is fire');
assert.equal(skillElement(COMBAT.skills.find(s => s.id === 'frost_chains')), 'ice', 'slow skill is ice');
assert.equal(skillElement(COMBAT.skills.find(s => s.id === 'static_field')), 'lightning', 'stun skill is lightning');
assert.equal(skillElement(COMBAT.skills.find(s => s.id === 'piercing_shot')), 'physical', 'plain skill is physical');
const fireMon = { def: { element: 'fire' } }, plainMon = { def: {} };
assert.equal(monsterElement(fireMon), 'fire');
assert.equal(monsterElement(plainMon), 'physical');
assert.equal(elementMult('ice', fireMon), E.weaknessMult, 'fire monster weak to ice');
assert.equal(elementMult('fire', fireMon), 1, 'fire monster not weak to fire');
assert.equal(elementMult('lightning', plainMon), E.weaknessMult, 'physical monster weak to lightning');
console.log('✓ Task 2.1 | Elemental weakness matrix verified');

// ---- Task 2.2: cross-class combos ----
const earthshaker = COMBAT.skills.find(s => s.id === 'earthshaker');
const iceLance = COMBAT.skills.find(s => s.id === 'ice_lance');
const piercingShot = COMBAT.skills.find(s => s.id === 'piercing_shot');
assert.ok(COMBAT.crossCombos.length >= 3, 'three cross-class combos defined');

// Cryo-Shatter: slow + earthshaker → 250% burst, primer consumed
const m1 = G.monsters[0];
m1.statuses = { slow: { until: FOREVER } };
let r = applyCrossCombo(earthshaker, m1, 100, false);
assert.equal(r.dmg, 250, 'Cryo-Shatter deals 250% burst');
assert.ok(!m1.statuses.slow, 'Cryo-Shatter consumes the slow primer');

// Superconduct: stun + ice_lance → AOE sunder on nearby monsters
const m2 = G.monsters[1];
m1.statuses = { stun: { until: FOREVER } };
m2.statuses = {};
m2.x = m1.x; m2.y = m1.y; m2.alive = true;
applyCrossCombo(iceLance, m1, 100, false);
assert.ok(m2.statuses.sunder, 'Superconduct sunders nearby monsters');

// Melt Surge: burn + piercing_shot → guaranteed crit at 2x
m1.statuses = { burn: { until: FOREVER, nextTick: FOREVER } };
r = applyCrossCombo(piercingShot, m1, 100, false);
assert.equal(r.dmg, 200, 'Melt Surge doubles the hit');
assert.equal(r.isCrit, true, 'Melt Surge forces a critical');
console.log('✓ Task 2.2 | Cross-class primer/detonator combos verified');

// ---- Task 2.3: stamina, dodge roll, timed parry ----
const S = DESIGN.tuning.stamina;
assert.equal(p.stamina, S.max, 'player starts at full stamina');
const preX = p.x, preY = p.y;
assert.equal(performDodge(), true, 'dodge fires with full stamina');
assert.equal(p.stamina, S.max - S.dodgeCost, 'dodge spends stamina');
assert.ok(p.invulnUntil > 0, 'dodge grants i-frames');
assert.ok(p.x !== preX || p.y !== preY, 'dodge moves the player');
const attacker = G.monsters[2];
attacker.statuses = {};
assert.equal(playerAvoidsHit(attacker), true, 'hits are negated during i-frames');
assert.equal(performDodge(), false, 'no dodge while i-frames are active');

p.invulnUntil = 0;
assert.equal(playerAvoidsHit(attacker), false, 'hits land with no dodge or parry active');
assert.equal(performParry(), true, 'parry opens its window');
assert.ok(p.parryUntil > 0, 'parry window set');
assert.equal(playerAvoidsHit(attacker), true, 'parry negates the incoming hit');
assert.ok(attacker.statuses.stun, 'parry stuns the attacker');
assert.ok(p.buffs.some(b => b.sourceSkillId === 'parry'), 'parry arms the counter buff');
assert.equal(p.parryUntil, 0, 'parry window is consumed');

p.stamina = 0;
assert.equal(performDodge(), false, 'no stamina, no dodge');
assert.equal(performParry(), false, 'no stamina, no parry');
p.stamina = S.max;
console.log('✓ Task 2.3 | Stamina dodge roll & timed parry verified');

// ---- Task 2.4: macro condition builder ----
const cfg = normaliseAutoConfig({ rules: [
  { when: 'hp_pct', op: '<', value: 0.35, action: 'use_item', arg: 'minor_potion' },
  { when: 'nonsense', op: '<', value: 0.5, action: 'use_item', arg: 'x' },   // invalid → dropped
  { when: 'mp_pct', op: '<', value: 2, action: 'stop_hunt', arg: '' },       // value clamped to 1
] });
assert.equal(cfg.rules.length, 2, 'invalid rules are dropped');
assert.equal(cfg.rules[1].value, 1, 'rule values clamp to [0,1]');

G.autoConfig = normaliseAutoConfig({ rules: [{ when: 'hp_pct', op: '<', value: 0.35, action: 'use_item', arg: 'minor_potion' }] });
addItem('minor_potion', 3);
p.hp = Math.max(1, Math.floor(p.maxHp * 0.2));
const hpBefore = p.hp;
assert.equal(evaluateMacroRules(p), true, 'low-HP rule fires');
assert.ok(p.hp > hpBefore, 'macro rule used the potion');
assert.equal(evaluateMacroRules(p), false, 'fired rule rests on its cooldown');
p.hp = p.maxHp;
console.log('✓ Task 2.4 | Macro rule builder & evaluation verified');

console.log('=== PHASE 2 TEST SUITE PASSED ===');
process.exit(0); // music sequencer interval keeps the loop alive otherwise
