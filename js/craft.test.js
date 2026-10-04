// Crafting: recipes consume exact zeny + material stacks and produce the output;
// missing materials or zeny refuse the craft untouched.
import assert from 'node:assert/strict';

import { installBrowserEnv } from './test-support/browser-env.js';

let vnow = 0;

installBrowserEnv({
  now: () => vnow,
  innerWidth: 1440,
  innerHeight: 900,
  nullSelectors: [],
  strictIds: false,
});

const { CONTENT } = await import('./content.js');
await import('./game.js');
const A = globalThis.__AWO;
assert.ok(A, 'game debug API loaded');

const p = A.makePlayer('reborn_blade', 'CraftTester');
A.G.player = p;
A.buildHud();
A.recompute(p, true);
A.loadMap('town_awakening');

const qty = id => p.inventory.find(e => !e.uid && e.itemId === id)?.qty || 0;
const recipe = CONTENT.recipes.find(r => r.id === 'r_sharpening');
assert.ok(recipe, 'sharpening stone recipe exists');

// 1) Refusal leaves everything untouched.
p.zeny = 1000;
const zenyBefore = p.zeny;
A.craftItem('r_sharpening');
assert.equal(qty('sharpening_stone'), 0, 'craft without materials must produce nothing');
assert.equal(p.zeny, zenyBefore, 'refused craft must not charge zeny');

// 2) Success consumes exact zeny + materials and yields the output.
A.addItem('wolf_fang', 5);
A.craftItem('r_sharpening');
assert.equal(qty('sharpening_stone'), 1, 'craft produces the output');
assert.equal(qty('wolf_fang'), 3, 'craft consumes exactly the recipe materials');
assert.equal(p.zeny, zenyBefore - recipe.cost, 'craft charges exactly the recipe cost');

// 3) Zeny gate: enough materials, empty purse → refused.
p.zeny = 0;
A.craftItem('r_sharpening');
assert.equal(qty('sharpening_stone'), 1, 'craft refused with empty purse');
assert.equal(qty('wolf_fang'), 3, 'refused craft must not consume materials');

// 4) Gear recipe rolls a real instance.
p.zeny = 5000;
A.addItem('dragon_heart', 1); A.addItem('star_iron', 3);
A.craftItem('r_seraph');
assert.ok(p.inventory.some(e => e.uid && e.itemId === 'seraph_ward'), 'gear recipe yields an equipment instance');
assert.equal(qty('dragon_heart'), 0, 'gear recipe consumes its materials');

console.log('Craft audit passed: refusal, exact consumption, zeny gate, gear instance output.');
