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

const { AUDIO, SFX } = await import('./audio.js');

console.log('=== RUNNING PHASE 4 AUDIO TEST SUITE ===');

// ---- Task 4.3: FM synthesis SFX ----
AUDIO.init();
assert.ok('parry' in SFX, 'SFX map contains parry');
assert.doesNotThrow(() => AUDIO.playSfx('parry'), 'parry SFX runs without throwing');
assert.doesNotThrow(() => AUDIO.playSfx('hit'), 'hit SFX runs without throwing');
assert.doesNotThrow(() => AUDIO.playSfx('levelup'), 'levelup SFX runs without throwing');
console.log('✓ Task 4.3 | FM synthesis SFX (parry/hit/levelup) verified');

console.log('=== PHASE 4 AUDIO TEST SUITE PASSED ===');
process.exit(0); // music sequencer interval keeps the loop alive otherwise
