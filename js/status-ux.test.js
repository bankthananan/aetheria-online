// Status window UX (docs/UI_MENU_REDESIGN.md §S): starred build stats, batch spending,
// and socketing worn gear straight from the paper doll.
import assert from 'node:assert/strict';
import { createRuntime } from './test-support/runtime.js';
import { CARD_CATALOG } from './systems/cards.js';

const { A } = await createRuntime({ classId: 'reborn_blade', nullSelectors: [], strictIds: false });
const p = A.G.player;

// ★ ranks follow the class's growth table
const growth = p._cls.statGrowthPerLevel;
const ranks = A.buildStatRanks(p);
const top = Object.entries(growth).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);
assert.deepEqual(Object.keys(ranks).sort((a, b) => ranks[a] - ranks[b]), top, 'top-3 growth stats are starred in order');
const html = A.panelBody('char');
assert.equal((html.match(/class="st-star"/g) || []).length, 3, 'three starred rows');
assert.ok(!html.includes('Recommended build:</span> <b>VSA'), 'cryptic letter code is gone');

// batch: one click spends a whole step, and stops when points run out
p.statPoints = 400;
const str0 = p.alloc.str || 0;
assert.equal(A.spendStatTimes('str', 10), 10, '+10 lands ten pluses');
assert.equal(p.alloc.str, str0 + 10);
const before = { ...p.alloc };
assert.equal(A.spendStatsByBuild(30), 30, 'spend-by-build places 30 pluses');
for (const k of Object.keys(before)) if (!(k in ranks)) assert.equal(p.alloc[k], before[k], `${k} (not starred) untouched`);
p.statPoints = 1;
assert.ok(A.spendStatTimes('vit', 10) <= 1, 'batch stops when points run out');

// socket from the doll: picker lists gems anywhere, cards only for a matching slot
A.adminAction('legw');
A.equip(p.inventory.at(-1).uid);
A.adminAction('expandall');
const weapon = p.equip.weapon;
assert.ok(weapon?.sockets?.length, 'weapon has sockets');
const idx = weapon.sockets.findIndex(x => !x);
const weaponCard = Object.values(CARD_CATALOG).find(c => c.targetSlot === 'weapon').id;
const armorCard = Object.values(CARD_CATALOG).find(c => c.targetSlot === 'armor').id;
const gem = A.CONTENT.items.find(it => it.gem && !it.gem.isRune)?.id;
for (const id of [weaponCard, armorCard, gem]) A.addItem(id, 1);
const cands = A.socketCandidates(weapon, idx).map(it => it.id);
assert.ok(cands.includes(weaponCard), 'weapon card offered for weapon socket');
assert.ok(cands.includes(gem), 'gem offered for any socket');
assert.ok(!cands.includes(armorCard), 'armor card not offered for weapon socket');

A.G._socketFor = `${weapon.uid}:${idx}`;
assert.ok(A.panelBody('char').includes(`data-socket-put="${weaponCard}"`), 'Status renders the picker under the doll');
assert.ok(A.socketGem(weapon.uid, idx, weaponCard), 'picking sockets the card');
assert.equal(weapon.sockets[idx], weaponCard);
A.G._socketFor = `${weapon.uid}:${idx}`;
assert.ok(!A.panelBody('char').includes('data-socket-put'), 'a filled socket shows no picker');

console.log('Status UX passed.');
