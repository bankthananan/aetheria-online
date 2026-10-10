// Window keys (docs/UI_FLOW_DESIGN.md §2): one table, plain keys reserved from the hotbar, RO Alt aliases never walk.
import assert from 'node:assert/strict';
import { createRuntime } from './test-support/runtime.js';

const { A, dispatch, makeEl } = await createRuntime({ nullSelectors: [], strictIds: false });
const plain = A.WINDOW_KEYS.map(w => w[1]);
assert.equal(new Set(plain).size, plain.length, 'each window has its own plain key');
for (const code of plain) assert.equal(A.setHotkeyBinding(0, code), false, `${code} is reserved for a window`);
assert.ok(A.normaliseHotkeys(Array(9).fill(null)).every(c => !plain.includes(c)), 'fallback slot keys skip window keys');

const key = (k, code, extra = {}) => dispatch(window, 'keydown', { key: k, code, target: makeEl('div'), preventDefault() {}, repeat: false, ...extra });
A.G.keys.s = false; key('s', 'KeyS', { altKey: true });
assert.equal(!!A.G.keys.s, false, 'Alt+S opens Abilities without walking south');
A.G.keys.s = false; key('s', 'KeyS');
assert.equal(A.G.keys.s, true, 'plain S still walks');
const farm = A.G.autoFarm; key('f', 'KeyF', { altKey: true });
assert.equal(A.G.autoFarm, farm, 'unbound Alt+F does not fall through to Hunt');
console.log('Window keys passed.');
