// Window positions come from the save file (untrusted): only lowercase panel ids with finite x/y survive.
import assert from 'node:assert/strict';
import { normalizeFeatures } from './systems/player-features.js';

const f = normalizeFeatures({ winPos: { char: { x: 10.4, y: 20.6 }, inv: { x: 'a', y: 3 }, 'x<script>': { x: 1, y: 1 }, shop: { x: Infinity, y: 0 } } });
assert.deepEqual(f.winPos, { char: { x: 10, y: 21 } }, 'invalid ids and non-finite coords are dropped');
assert.deepEqual(normalizeFeatures({}).winPos, {}, 'missing → empty');
console.log('Window positions passed.');
