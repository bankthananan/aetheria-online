// An invalid plot/mannequin id must not create the blocking homestead backdrop:
// the guard used to run after the overlay was appended, stranding an empty,
// close-less modal over the game.
import assert from 'node:assert/strict';

import { installBrowserEnv } from './test-support/browser-env.js';

installBrowserEnv({ nullSelectors: [], strictIds: true });
await import('./game.js');
const G = globalThis.__AWO.G;

let appended = 0;
const orig = document.body.appendChild?.bind(document.body);
document.body.appendChild = el => { appended++; return orig ? orig(el) : el; };

G.openHomesteadMannequinModal('nope');
G.openHomesteadPlotModal(999);
assert.equal(appended, 0, 'bad id must not create the backdrop');

G.openHomesteadMannequinModal('mannequin_a');
assert.equal(appended, 1, 'valid id still opens the modal');
console.log('homestead modal guard ok');
