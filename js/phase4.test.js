import assert from 'node:assert/strict';

// Mock minimal DOM environment for Node testing (same shim as phase1/phase2 tests)
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
elements['#game-canvas'].getContext = () => makeCtx(); // resumeGame() re-inits the runtime canvas via startRuntime()

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

await import('./game.js');

const A = globalThis.window.__AWO;
const { G, DESIGN, makePlayer, loadMap, floatText, drawFloaties, FLOAT_CAP, FLOAT_LIFE_MS, setCtx } = A;

console.log('=== RUNNING PHASE 4 TEST SUITE ===');

G.player = makePlayer(DESIGN.classes[0].id, 'Tester');
loadMap('whispering_woods');
setCtx({ width: 100, height: 100, getContext: () => makeCtx() });
G.monsters.forEach(m => { m.x = m.y = m.homeX = m.homeY = 2000; }); // park monsters, no interference

// ---- Task 4.1: canvas damage number renderer ----
G.floaties = [];
floatText(64, 64, 42, 'dmg');
assert.equal(G.floaties.length, 1, 'floatText pushes one entry');
assert.equal(G.floaties[0].text, 42, 'entry keeps the given text');
assert.equal(G.floaties[0].kind, 'dmg', 'entry keeps the given kind');
assert.equal(G.floaties[0].x, 64, 'entry keeps world x');
assert.ok(typeof G.floaties[0].born === 'number' && G.floaties[0].born > 0, 'entry stamps a born time');

floatText(10, 10, '99', 'crit');
floatText(10, 10, 'miss', 'miss');
assert.equal(G.floaties.length, 3, 'each call pushes its own entry');
assert.equal(G.floaties[1].kind, 'crit', 'crit entry recorded');
assert.equal(G.floaties[2].kind, 'miss', 'miss entry recorded');
console.log('✓ Task 4.1a | floatText pushes entries with correct kind/text');

// cap enforcement — drop oldest once over FLOAT_CAP
G.floaties = [];
for (let i = 0; i < FLOAT_CAP + 15; i++) floatText(0, 0, i, 'dmg');
assert.equal(G.floaties.length, FLOAT_CAP, 'array never exceeds the fixed cap');
assert.equal(G.floaties[0].text, 15, 'oldest entries are dropped, not newest');
assert.equal(G.floaties[G.floaties.length - 1].text, FLOAT_CAP + 14, 'newest entry survives the cap');
console.log('✓ Task 4.1b | cap enforcement drops oldest entries first');

// expiry — an entry born before FLOAT_LIFE_MS ago is culled on the next draw pass
G.floaties = [];
floatText(5, 5, 'fresh', 'dmg');
floatText(5, 5, 'stale', 'dmg');
G.floaties[1].born -= FLOAT_LIFE_MS + 50; // simulate an entry that has outlived its lifetime
assert.doesNotThrow(() => drawFloaties(), 'drawFloaties runs without throwing');
assert.equal(G.floaties.length, 1, 'the expired entry was culled');
assert.equal(G.floaties[0].text, 'fresh', 'the still-live entry survives the draw pass');
console.log('✓ Task 4.1c | entries expire after their lifetime');

// ---- Task 4.2: colorblind / high-contrast preset ----
const { applyHighContrast, saveGame, resumeGame, floatColor } = A;
const hcClasses = new Set();
document.body.classList.add = c => hcClasses.add(c);
document.body.classList.remove = c => hcClasses.delete(c);
document.body.classList.contains = c => hcClasses.has(c);

applyHighContrast(true);
assert.equal(G.highContrast, true, 'applyHighContrast(true) sets G.highContrast');
assert.ok(hcClasses.has('hc-mode'), 'applyHighContrast(true) adds the hc-mode body class');

applyHighContrast(false);
assert.equal(G.highContrast, false, 'applyHighContrast(false) clears G.highContrast');
assert.ok(!hcClasses.has('hc-mode'), 'applyHighContrast(false) removes the hc-mode body class');
console.log('✓ Task 4.2a | toggle sets G.highContrast and the body class');

// the canvas renderer reads a distinct high-contrast damage palette
assert.notEqual(floatColor('heal'), floatColor('crit'), 'HC-off heal/crit colors already differ');
applyHighContrast(true);
const hcHeal = floatColor('heal'), hcCrit = floatColor('crit');
applyHighContrast(false);
assert.notEqual(hcHeal, floatColor('heal'), 'HC-on heal color differs from the default palette');
assert.notEqual(hcCrit, floatColor('crit'), 'HC-on crit color differs from the default palette');
console.log('✓ Task 4.2b | floatColor reads a separate high-contrast palette');

// round-trips through saveGame/resumeGame
globalThis.innerWidth = 800; globalThis.innerHeight = 600; // resumeGame() re-inits the runtime canvas via startRuntime()
globalThis.requestAnimationFrame = () => {};
G.running = true;
const store = {};
globalThis.window.localStorage = {
  getItem: k => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = v; },
  removeItem: k => { delete store[k]; },
};
applyHighContrast(true);
saveGame();
applyHighContrast(false);
assert.equal(G.highContrast, false, 'sanity: flag cleared before resume');
resumeGame();
assert.equal(G.highContrast, true, 'resumeGame restores G.highContrast from the save');
assert.ok(hcClasses.has('hc-mode'), 'resumeGame re-applies the hc-mode body class');
console.log('✓ Task 4.2c | highContrast round-trips through saveGame/resumeGame');

// ---- Task 4.4: class-aware weapon drops ----
{
  const { classWeaponFor, canUseItem } = A;
  const farShot = makePlayer('far_shot', 'Archer');
  // hero_blade (sword, gearLevel 25) re-rolls to the archer weapon nearest that tier
  const sub = classWeaponFor(farShot, 'hero_blade');
  assert.ok(canUseItem(farShot, sub), 'substituted weapon is usable by the archer');
  assert.equal(sub, 'frost_bow', 'gearLevel 25 sword maps to the closest bow tier (35)');
  // endgame sword maps to the endgame bow
  assert.equal(classWeaponFor(farShot, 'astral_glaive'), 'starhawk_bow', 'gearLevel 80 sword maps to the top bow');
  // classless and non-weapon drops pass through untouched
  assert.equal(classWeaponFor(farShot, 'worn_dagger'), 'worn_dagger', 'classless weapon unchanged');
  assert.equal(classWeaponFor(farShot, 'minor_potion'), 'minor_potion', 'non-weapon unchanged');
  // a hero who can already wield the drop keeps it
  const blade = makePlayer('reborn_blade', 'Knight');
  assert.equal(classWeaponFor(blade, 'hero_blade'), 'hero_blade', 'sword class keeps sword drops');
  // every dropping class-locked weapon maps to something usable for every class
  const dropWeapons = ['hero_blade', 'mythril_sword', 'frost_brand', 'dawn_edge', 'void_edge', 'astral_glaive'];
  for (const cls of DESIGN.classes) {
    const hero = makePlayer(cls.id, 'T');
    for (const wid of dropWeapons)
      assert.ok(canUseItem(hero, classWeaponFor(hero, wid)), `${cls.id} gets a usable substitute for ${wid}`);
  }
  console.log('✓ Task 4.4 | Class-aware weapon drop substitution verified');
}

console.log('=== PHASE 4 TEST SUITE PASSED ===');
process.exit(0); // music sequencer interval keeps the loop alive otherwise
