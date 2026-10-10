// UI flow phase 1 (docs/UI_FLOW_DESIGN.md §6): menus keep Hunt running, typing never fires
// game keys, alt-tab keeps the pinned hunt target, B/V can't be stolen by hotbar slots.
// DOM-dependent parts (Escape stack, dialogue choice, siege) are checked in the browser.
import assert from 'node:assert/strict';
import { createRuntime } from './test-support/runtime.js';

const { A, dispatch, makeEl } = await createRuntime({ mapId: 'whispering_woods', nullSelectors: [], strictIds: false });

// M1 — a menu pause only freezes the clock
A.G.autoFarm = true;
A.pauseGame('modal'); A.resumeGameFromPause('modal');
assert.equal(A.G.autoFarm, true, 'opening and closing a menu keeps Hunt on');
A.pauseGame('hidden'); A.resumeGameFromPause('hidden');
assert.equal(A.G.autoFarm, false, 'leaving the tab still stops Hunt');

// M4 — alt-tab keeps the Automation hunt pin
A.G.huntTargetId = 'gel_slime';
dispatch(window, 'blur', {});
assert.equal(A.G.huntTargetId, 'gel_slime', 'interruption keeps the pinned hunt target');
A.resumeGameFromPause('interruption');

// M2 — keys typed into a text field never reach the game
const input = makeEl('input'); input.closest = sel => (sel.includes('input') ? input : null);
A.G.keys.i = false;
dispatch(window, 'keydown', { key: 'i', code: 'KeyI', target: input, preventDefault() {}, repeat: false });
assert.equal(!!A.G.keys.i, false, 'typing "i" in a field is ignored');
dispatch(window, 'keydown', { key: 'i', code: 'KeyI', target: makeEl('div'), preventDefault() {}, repeat: false });
assert.equal(A.G.keys.i, true, 'the same key outside a field still registers');
const box = makeEl('input'); box.type = 'checkbox'; box.closest = () => null;   // CSS :not([type=checkbox]) → no text-field match
A.G.keys.k = false;
dispatch(window, 'keydown', { key: 'k', code: 'KeyK', target: box, preventDefault() {}, repeat: false });
assert.equal(A.G.keys.k, true, 'a focused checkbox/slider does not swallow game keys');

// Reserved keys — B (Book) and V (parry) can't be bound, and fallbacks never hand them out
assert.equal(A.setHotkeyBinding(0, 'KeyR'), true, 'a free letter binds');
assert.equal(A.setHotkeyBinding(0, 'KeyB'), false, 'B is reserved');
assert.equal(A.setHotkeyBinding(0, 'KeyV'), false, 'V is reserved');
const crowded = A.normaliseHotkeys(Array(9).fill('KeyB'));
assert.ok(!crowded.includes('KeyB') && !crowded.includes('KeyV') && crowded.every(Boolean), 'fallback keys skip reserved codes');

console.log('UI flow phase 1 passed.');
