// Shared headless browser environment for Node test suites.
//
// Installs the minimal browser surface the live game touches (window, document,
// canvas 2D context, localStorage, Web Audio, timers, rAF) onto `globalThis`.
// Every suite runs in its own process (see script/run-tests.mjs), so installing
// globals once per file is safe.
//
// Usage:
//   import { installBrowserEnv } from './test-support/browser-env.js';
//   const env = installBrowserEnv({ innerWidth: 1440, innerHeight: 1000 });
//   await import('./game.js');
//   const A = globalThis.__AWO;
//
// Options (all optional):
//   now           initial performance.now() value, or a function returning the
//                 current time (lets a suite own its clock: `now: () => vnow`),
//                 or 'real' to keep Node's real performance clock             (1000)
//   innerWidth    viewport width                                     (1366)
//   innerHeight   viewport height                                    (768)
//   storage       initial localStorage contents, e.g. { awo_lang: 'en' }
//   realTimers    keep Node's setTimeout/clearTimeout instead of no-ops (false)
//   elementIds    ids pre-created and returned by getElementById / '#id' queries
//   nullSelectors selectors for which document.querySelector returns null (['#panel'])
//   strictIds     getElementById returns null for unknown ids instead of a fresh element (true)
//   confirm       window.confirm implementation                      (() => true)
//   ctx2d         extra/overriding 2D-context methods, e.g. a drawImage spy ({})
//
// Returned handle:
//   advance(ms)        move performance.now() forward (numeric `now` only)
//   failWrites(bool)   make localStorage.setItem throw (quota simulation)
//   store              raw backing object for localStorage
//   readSave(key)      JSON.parse a stored value (default key: awo_save_v1)
//   element(id)        the pre-created element for an id
//   dispatch(t, type, event)  fire a synthetic event on window/document/element
//   makeEl(tag), makeCtx()    factories for extra mock elements / 2D contexts

export const DEFAULT_ELEMENT_IDS = Object.freeze(['root', 'hud', 'overlays', 'fx-layer', 'game-canvas', 'touch-controls']);

export function installBrowserEnv({
  now = 1000,
  innerWidth = 1366,
  innerHeight = 768,
  storage = {},
  realTimers = false,
  elementIds = DEFAULT_ELEMENT_IDS,
  nullSelectors = ['#panel'],
  strictIds = true,
  confirm = () => true,
  ctx2d: ctxOverrides = {},
} = {}) {
  const realPerformance = globalThis.performance;
  let time = typeof now === 'number' ? now : 0;
  const clock = now === 'real' ? () => realPerformance.now()
    : typeof now === 'function' ? now
      : () => time;
  let brokenStorage = false;

  // --- events -------------------------------------------------------------
  const listeners = new WeakMap();
  const eventful = target => Object.assign(target, {
    addEventListener(type, fn) {
      const all = listeners.get(this) || {};
      (all[type] ||= new Set()).add(fn);
      listeners.set(this, all);
    },
    removeEventListener(type, fn) { listeners.get(this)?.[type]?.delete(fn); },
    dispatchEvent(e) { for (const fn of listeners.get(this)?.[e.type] || []) fn(e); return true; },
  });

  // --- canvas / DOM -------------------------------------------------------
  const ctx2d = () => new Proxy({
    measureText: () => ({ width: 10 }),
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
    createPattern: () => ({}),
    getImageData: (_x, _y, w = 1, h = 1) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h }),
    ...ctxOverrides,
  }, { get: (o, k) => (k in o ? o[k] : () => {}) });

  const makeEl = (tag = 'div') => {
    const classes = new Set();
    const attrs = {};
    return eventful({
      tagName: String(tag).toUpperCase(), width: 300, height: 150,
      style: { setProperty() {}, removeProperty() {} }, dataset: {}, children: [], innerHTML: '', textContent: '', value: '',
      classList: {
        add: (...xs) => xs.forEach(x => classes.add(x)),
        remove: (...xs) => xs.forEach(x => classes.delete(x)),
        contains: x => classes.has(x),
        toggle(x, on) { const yes = on ?? !classes.has(x); yes ? classes.add(x) : classes.delete(x); return yes; },
      },
      appendChild(c) { this.children.push(c); c.parentNode = this; return c; },
      insertBefore(c) { return this.appendChild(c); },
      removeChild(c) { this.children = this.children.filter(x => x !== c); return c; },
      get firstChild() { return this.children[0] ?? null; },
      remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter(c => c !== this); },
      setAttribute(k, v) { attrs[k] = String(v); },
      getAttribute(k) { return attrs[k] ?? null; },
      removeAttribute(k) { delete attrs[k]; },
      focus() {}, blur() {},
      click() { this.onclick?.({ preventDefault() {}, stopPropagation() {} }); },
      querySelector() { return makeEl(); },
      querySelectorAll() { return []; },
      getContext: ctx2d,
      toDataURL: () => 'data:image/png;base64,',
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 832, height: 576, right: 832, bottom: 576 }),
      setPointerCapture() {}, releasePointerCapture() {},
    });
  };

  const elements = Object.fromEntries(elementIds.map(id => [id, makeEl()]));
  // match index.html's <canvas id="game-canvas" width="832" height="576">
  if (elements['game-canvas']) Object.assign(elements['game-canvas'], { tagName: 'CANVAS', width: 832, height: 576 });
  const nulls = new Set(nullSelectors);

  globalThis.window = globalThis;
  eventful(globalThis);
  globalThis.performance = { now: clock };
  globalThis.document = eventful({
    head: makeEl('head'), body: makeEl('body'), documentElement: makeEl('html'),
    hidden: false, visibilityState: 'visible',
    createElement: makeEl,
    querySelector: s => (nulls.has(s) ? null : (elements[s.replace(/^#/, '')] ||= makeEl())),
    querySelectorAll: () => [],
    getElementById: id => elements[id] || (strictIds ? null : (elements[id] = makeEl())),
  });

  // --- storage ------------------------------------------------------------
  const store = { ...storage };
  globalThis.localStorage = {
    getItem: k => store[k] ?? null,
    setItem(k, v) { if (brokenStorage) throw Error('Storage full'); store[k] = String(v); },
    removeItem: k => { delete store[k]; },
    clear: () => { for (const k of Object.keys(store)) delete store[k]; },
  };

  // --- Web Audio (params record the last value so audio suites can assert) --
  const param = value => ({
    value,
    setValueAtTime(v) { this.value = v; }, linearRampToValueAtTime(v) { this.value = v; },
    exponentialRampToValueAtTime(v) { this.value = v; }, setTargetAtTime(v) { this.value = v; },
    cancelScheduledValues() {},
  });
  const node = extra => ({
    connect() { return this; }, disconnect() {}, start() {}, stop() {},
    gain: param(1), frequency: param(440), Q: param(1), ...extra,
  });
  globalThis.AudioContext = class {
    constructor() { this.currentTime = 0; this.destination = {}; this.state = 'running'; }
    createOscillator() { return node({ type: 'square' }); }
    createGain() { return node(); }
    createBiquadFilter() { return node({ type: 'lowpass' }); }
    createBuffer(_n, size) { return { getChannelData: () => new Float32Array(size) }; }
    createBufferSource() { return node({ buffer: null }); }
    resume() { this.state = 'running'; return Promise.resolve(); }
    suspend() { this.state = 'suspended'; return Promise.resolve(); }
  };
  globalThis.webkitAudioContext = globalThis.AudioContext;

  // --- misc ---------------------------------------------------------------
  globalThis.Image = class { constructor() { this.complete = false; } };
  globalThis.requestAnimationFrame = () => 1;
  globalThis.cancelAnimationFrame = () => {};
  if (!realTimers) { globalThis.setTimeout = () => 0; globalThis.clearTimeout = () => {}; }
  globalThis.innerWidth = innerWidth;
  globalThis.innerHeight = innerHeight;
  globalThis.confirm = confirm;

  return {
    advance: ms => { time += ms; },
    failWrites: v => { brokenStorage = v; },
    store,
    readSave: (key = 'awo_save_v1') => JSON.parse(store[key]),
    element: id => elements[id],
    dispatch: (target, type, event = {}) => target.dispatchEvent({ type, preventDefault() {}, stopPropagation() {}, ...event }),
    makeEl,
    makeCtx: ctx2d,
  };
}
