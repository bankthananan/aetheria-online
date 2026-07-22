// Class skill-manual and respec audit: distinct job books, readable ownership,
// complete refunds, safe hotbar cleanup, shop access, and save compatibility.
import assert from 'node:assert/strict';

globalThis.performance = { now: () => 1000 };
const ctx2d = () => new Proxy({
  measureText: () => ({ width: 10 }),
  createLinearGradient: () => ({ addColorStop() {} }),
  createRadialGradient: () => ({ addColorStop() {} }),
}, { get(target, key) { return key in target ? target[key] : () => {}; } });
function makeEl() {
  return {
    style: { setProperty() {} }, dataset: {}, children: [], textContent: '', innerHTML: '',
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    appendChild(child) { this.children.push(child); child.parentNode = this; return child; },
    remove() {}, addEventListener() {}, removeEventListener() {}, setAttribute() {}, focus() {}, click() {},
    querySelector() { return makeEl(); }, querySelectorAll() { return []; },
    getContext: ctx2d, toDataURL() { return 'data:image/png;base64,'; },
  };
}
const elements = Object.fromEntries(['root', 'hud', 'overlays', 'fx-layer', 'game-canvas'].map(id => [`#${id}`, makeEl()]));
globalThis.window = globalThis;
globalThis.addEventListener = () => {};
globalThis.document = {
  head: makeEl(), body: makeEl(), createElement: makeEl,
  querySelector: selector => elements[selector] || makeEl(), querySelectorAll: () => [],
  getElementById: id => elements[`#${id}`] || makeEl(), addEventListener() {}, removeEventListener() {},
};
globalThis.localStorage = { _data: {}, getItem(key) { return this._data[key] || null; }, setItem(key, value) { this._data[key] = String(value); }, removeItem(key) { delete this._data[key]; } };
const audioParam = { setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {}, cancelScheduledValues() {} };
const audioNode = { connect() { return this; }, start() {}, stop() {}, gain: audioParam, frequency: audioParam, Q: audioParam };
globalThis.AudioContext = class {
  constructor() { this.currentTime = 0; this.destination = {}; this.state = 'running'; }
  createOscillator() { return { ...audioNode }; } createGain() { return { ...audioNode }; }
  createBiquadFilter() { return { ...audioNode }; }
  createBuffer(_channels, size) { return { getChannelData: () => new Float32Array(size) }; }
  createBufferSource() { return { ...audioNode, buffer: null }; } resume() { return Promise.resolve(); }
};
globalThis.webkitAudioContext = globalThis.AudioContext;
globalThis.requestAnimationFrame = () => 1;
globalThis.setTimeout = () => 0;
globalThis.Image = class {};
globalThis.innerWidth = 1440;
globalThis.innerHeight = 1000;
globalThis.confirm = () => true;

await import('./game.js');
const { setLanguage } = await import('./locale.js');
const { COMBAT } = await import('./combat.js');
const A = globalThis.__AWO;
assert.ok(A, 'game debug API loaded');

const classIds = Object.keys(A.PROGRESSION.tiers);
const bookTitles = new Set();
for (const classId of classIds) {
  const player = A.makePlayer(classId, `Book-${classId}`);
  const ownSkills = COMBAT.skills.filter(skill => skill.classId === player.combatClass);
  const book = A.PROGRESSION.skillBooks[player.combatClass];
  assert.ok(book?.title && book?.color && book?.motto, `${classId} owns a complete manual identity`);
  assert.ok(!bookTitles.has(book.title), `${classId} manual title is unique`);
  bookTitles.add(book.title);
  const roots = ownSkills.filter(skill => !A.PROGRESSION.skillTree[skill.id].reqSkill);
  assert.equal(roots.length, 1, `${classId} keeps exactly one free starter skill`);

  const html = A.skillsPanelHtml(player);
  assert.ok(html.includes(book.title) && html.includes(`--book-accent:${book.color}`), `${classId} renders its own visual manual`);
  assert.equal((html.match(/class="ro-job-lane/g) || []).length, 3, `${classId} manual has three job chapters`);
  for (const skill of ownSkills) assert.ok(html.includes(`data-skill="${skill.id}"`), `${classId} includes ${skill.id}`);
  assert.ok(html.includes('class="ro-skill-graph"'), `${classId} manual renders the dependency graph`);
  assert.ok(html.includes('class="ro-skill-lines"') && html.includes('aria-hidden="true"'), `${classId} graph includes a decorative native SVG layer`);
}
assert.equal(bookTitles.size, classIds.length, 'all seven classes have distinct manuals');

const finalBlade = A.makePlayer('reborn_blade', 'FinalGraph');
finalBlade.tierIndex = 2;
finalBlade.jobBranchId = A.PROGRESSION.jobBranches.reborn_blade.defaultId;
finalBlade.advancedJobId = 'voidcleaver_lord';
finalBlade.className = 'Voidcleaver Lord';
finalBlade.jobLevel = 50;
A.recompute(finalBlade, true);
const finalHtml = A.skillsPanelHtml(finalBlade);
assert.ok(finalHtml.includes('data-advanced-job="voidcleaver_lord"') && finalHtml.includes('data-advanced-job="aegis_paragon"'), 'both final-job branches remain visible');
assert.ok(finalHtml.includes('data-skill="world_cleaver"') && finalHtml.includes('data-skill="aegis_wall"'), 'selected and rejected exclusive skills both remain in the graph');
assert.ok(finalHtml.includes('ro-third-branch incompatible') && finalHtml.includes('locked incompatible'), 'rejected final-job nodes are visibly sealed');

// Thai uses full translated skill labels rather than clipped shorthand.
setLanguage('th');
const thaiMage = A.makePlayer('codeweaver', 'ThaiManual');
const thaiHtml = A.skillsPanelHtml(thaiMage);
assert.ok(thaiHtml.includes('คัมภีร์เวทรูน') && thaiHtml.includes('กระสุนเวทอาร์เคน'), 'Thai class manual and full skill label render');
assert.ok(thaiHtml.includes('ต้องการ'), 'Thai prerequisites are written on their cards');
setLanguage('en');

// Stat respec refunds the canonical full budget despite escalating spend costs.
const p = A.makePlayer('codeweaver', 'RespecTester');
A.G.player = p;
p.level = 20;
p.statPoints = A.statPointEntitlement(p);
A.recompute(p, true);
for (let i = 0; i < 6; i++) A.spendStat('int');
assert.equal(p.alloc.int, 6, 'test staged allocated INT');
A.addItem('soul_ledger');
assert.equal(A.useItem('soul_ledger'), true, 'Soul Ledger performs a stat reset');
assert.deepEqual(p.alloc, { str: 0, agi: 0, vit: 0, int: 0, dex: 0, luk: 0 }, 'all allocated stats are cleared');
assert.equal(p.statPoints, A.statPointEntitlement(p), 'all earned stat points are refunded');
assert.ok(!p.inventory.some(slot => slot.itemId === 'soul_ledger'), 'successful stat reset consumes one ledger');
A.addItem('soul_ledger');
const ledgerQty = p.inventory.find(slot => slot.itemId === 'soul_ledger').qty;
assert.equal(A.useItem('soul_ledger'), false, 'no-op stat reset is rejected');
assert.equal(p.inventory.find(slot => slot.itemId === 'soul_ledger').qty, ledgerQty, 'no-op stat reset does not consume its item');

// Skill respec refunds active/passive ranks, keeps the free root and item slots,
// and removes skills the player no longer owns from the action bar.
p.jobLevel = 24; p.tierIndex = 1;
p.skillLevels = { arcane_bolt: 3, flame_burst: 2, meteor: 1, mana_font: 2 };
p.skillPoints = A.skillPointEntitlement(p) - A.skillPointsSpent(p);
p.hotbar[0] = { type: 'skill', id: 'arcane_bolt' };
p.hotbar[1] = { type: 'skill', id: 'flame_burst' };
p.hotbar[2] = { type: 'skill', id: 'meteor' };
p.hotbar[5] = { type: 'item', itemId: 'minor_potion' };
p.skillCd = { flame_burst: 9999 }; p.momentum = 5;
A.recompute(p, false);
A.addItem('memory_prism');
assert.equal(A.useItem('memory_prism'), true, 'Memory Prism performs a skill reset');
assert.deepEqual(p.skillLevels, { arcane_bolt: 1 }, 'skill reset preserves only the free starter rank');
assert.equal(p.skillPoints, A.skillPointEntitlement(p), 'all earned skill points are refunded');
assert.equal(p.momentum, 0, 'skill reset clears combo momentum');
assert.deepEqual(p.skillCd, {}, 'skill reset clears obsolete cooldowns');
assert.ok(!p.hotbar.some(slot => slot?.type === 'skill' && slot.id !== 'arcane_bolt'), 'unlearned skills are removed from hotbar');
assert.ok(p.hotbar.some(slot => slot?.type === 'item' && slot.itemId === 'minor_potion'), 'item hotbar slots survive skill reset');
assert.ok(!p.inventory.some(slot => slot.itemId === 'memory_prism'), 'successful skill reset consumes one prism');

// Cancelling preserves both the build and the consumable.
p.skillLevels.flame_burst = 1; p.skillPoints--;
A.addItem('memory_prism');
globalThis.confirm = () => false;
assert.equal(A.useItem('memory_prism'), false, 'cancelled skill reset returns false');
assert.equal(p.skillLevels.flame_burst, 1, 'cancelled skill reset keeps learned skills');
assert.equal(p.inventory.find(slot => slot.itemId === 'memory_prism').qty, 1, 'cancelled skill reset keeps the prism');
globalThis.confirm = () => true;

// Both manuals are permanently sold, appear in Use, and cannot be assigned to
// a combat hotkey. Their stack data uses the existing save schema unchanged.
A.G._shopItems = A.CONTENT.npcs.find(npc => npc.id === 'npc_shopkeeper').shopItems;
p.zeny = 999999;
const shopHtml = A.panelBody('shop');
assert.ok(shopHtml.includes('Soul Ledger') && shopHtml.includes('Memory Prism'), 'Marla sells both reset items');
const inventoryHtml = A.panelBody('inv');
assert.ok(inventoryHtml.includes('data-use="memory_prism"'), 'reset item appears in inventory Use actions');
assert.ok(!inventoryHtml.includes('data-assign-item="memory_prism"'), 'reset item cannot be assigned to combat hotbar');
A.G.running = true;
A.saveGame();
const saved = JSON.parse(globalThis.localStorage.getItem('awo_save_v1'));
assert.equal(saved.v, 5, 'reset items persist inside the branch-aware save schema');
assert.ok(saved.player.inventory.some(slot => slot.itemId === 'memory_prism'), 'unused reset item persists in the normal inventory schema');
assert.equal(saved.player.skillLevels.flame_burst, 1, 'cancelled build state persists normally');

console.log('Skill-system audit passed: distinct class manuals and safe stat/skill reset consumables are valid.');
