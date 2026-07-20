// Equipment decision audit: real derived-stat comparisons, gained/lost
// substats, stable rolled trader stock, exact-item purchases, and combined
// story/guild Trader Rank progression.
import assert from 'node:assert/strict';

let vnow = 1000;
globalThis.performance = { now: () => vnow };

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
globalThis.innerHeight = 900;

await import('./game.js');
const A = globalThis.__AWO;
assert.ok(A, 'game debug API loaded');

const p = A.makePlayer('far_shot', 'GearTester');
A.G.player = p;
p.zeny = 999999;

// A real swap must compare the final sheet and explicitly classify substats.
const current = A.rollItem('iron_sword', 0, 'rare');
current.affixes = [
  { stat: 'hpFlat', value: 50, label: '+50 Max HP' },
  { stat: 'lifesteal', value: 4, label: '4% Lifesteal' },
];
p.equip.weapon = current;
A.recompute(p, true);

const candidate = A.rollItem('hero_blade', 0, 'epic');
candidate.affixes = [
  { stat: 'atkPct', value: 8, label: '+8% ATK' },
  { stat: 'critPct', value: 6, label: '+6% Crit' },
  { stat: 'hpFlat', value: 70, label: '+70 Max HP' },
];
const comparison = A.compareEquipment(candidate, p);
assert.equal(comparison.slot, 'weapon');
assert.equal(comparison.current.uid, current.uid, 'comparison targets the actually equipped slot');
assert.ok(comparison.metrics.some(metric => metric.key === 'atkStat' && metric.delta > 0), 'comparison uses final class ATK');
assert.ok(comparison.metrics.some(metric => metric.key === 'maxHp' && metric.delta === 20), 'comparison includes final max HP');
assert.equal(comparison.affixes.find(change => change.stat === 'atkPct')?.kind, 'new', 'new substat is labeled new');
assert.equal(comparison.affixes.find(change => change.stat === 'lifesteal')?.kind, 'removed', 'missing old substat is labeled removed');
assert.equal(comparison.affixes.find(change => change.stat === 'hpFlat')?.kind, 'improved', 'larger shared substat is labeled improved');
assert.ok(comparison.affixes.find(change => change.stat === 'critPct')?.recommended, 'class-core substat is recommended');
const comparisonHtml = A.gearComparisonHtml(candidate, p);
for (const copy of ['Suggested upgrade', 'NEW BONUS', 'REMOVED', 'recommended', 'vs equipped']) assert.ok(comparisonHtml.includes(copy), `comparison UI must include ${copy}`);

// The status and inventory surfaces expose the same advice/bonus system.
p.inventory.push(candidate);
const statusHtml = A.panelBody('char');
assert.ok(statusHtml.includes('Suggested substats for'), 'status panel explains class substat priorities');
assert.ok(statusHtml.includes('Equipment contribution'), 'status panel summarizes active equipment contribution');
assert.ok(statusHtml.includes('Lifesteal'), 'paper doll exposes equipped substats');
const inventoryHtml = A.panelBody('inv');
assert.ok(inventoryHtml.includes('NEW BONUS') && inventoryHtml.includes('REMOVED'), 'inventory uses gained/removed substat comparison');

// Trader stock is rolled once per rotation, visibly varied, and buying by uid
// delivers the exact inspected instance before replacing the offer.
A.G._shopItems = ['iron_sword', 'hero_blade', 'leather_vest', 'guardian_plate', 'minor_potion'];
A.G.guildRankIdx = 0;
A.G.quest = A.CONTENT.quests.find(quest => quest.phase === 1).id;
A.G.won = false;
const rotation = A.rerollShop();
assert.equal(rotation.stock.length, 4, 'every equipment offer gets a rolled stock instance');
assert.ok(new Set(rotation.stock.map(inst => inst.rarity)).size >= 2, 'a rotation visibly contains varied rarity tiers');
const openingRarityBias = A.shopRollBias('iron_sword');
const offer = A.shopStockItem('iron_sword');
const price = A.shopPrice(offer), zenyBefore = p.zeny;
const shopHtml = A.panelBody('shop');
assert.ok(shopHtml.includes(`data-buy="${offer.uid}"`), 'shop buy button references the inspected equipment uid');
assert.ok(shopHtml.includes('Trader Rank') && shopHtml.includes('Guild') && shopHtml.includes('Story'), 'shop explains both rank sources');
assert.ok(shopHtml.includes('Full catalog') && shopHtml.includes('main story AND'), 'shop states the combined full-catalog condition');
A.buy(offer.uid);
assert.ok(p.inventory.some(inst => inst.uid === offer.uid), 'purchase delivers the exact inspected item');
assert.equal(p.zeny, zenyBefore - price, 'purchase charges the rarity/substat-scaled displayed price');
assert.notEqual(A.shopStockItem('iron_sword').uid, offer.uid, 'purchased offer is replaced with a fresh roll');

// Story chapters improve Trader Rank, but the final S/full catalog requires
// BOTH a finished story and maximum Guild Rank.
const phaseThree = A.CONTENT.quests.find(quest => quest.phase === 3);
A.G.quest = phaseThree.id; A.G.guildRankIdx = 0; A.G.won = false;
assert.equal(A.GUILD_RANKS[A.storyShopRankIdx()], 'C-', 'phase III grants Story Rank C-');
assert.equal(A.GUILD_RANKS[A.effectiveShopRankIdx()], 'C-', 'story rank raises effective trader stock');
assert.ok(A.shopRollBias('iron_sword') > openingRarityBias, 'later story chapters deterministically improve rarity bias');
A.G._shopItems = A.CONTENT.npcs.find(npc => npc.id === 'npc_shopkeeper').shopItems;
const phaseRotation = A.rerollShop();
assert.ok(phaseRotation.ids.length <= 4, 'rank-conditioned gear stays on a four-item rotation before Trader S');
assert.ok(phaseRotation.ids.every(itemId => A.GUILD_RANKS.indexOf(A.CONTENT.items.find(item => item.id === itemId).rankReq) <= A.effectiveShopRankIdx()), 'rotation never offers gear above effective Trader Rank');
assert.ok(!A.panelBody('shop').includes('Transcendent Sigil'), 'locked S gear is absent from pre-cap rotations');
A.G.guildRankIdx = A.GUILD_RANKS.length - 1;
assert.equal(A.GUILD_RANKS[A.effectiveShopRankIdx()], 'A+', 'maximum guild rank alone cannot unlock Trader S');
A.G.won = true; A.G.guildRankIdx = A.GUILD_RANKS.length - 2;
assert.equal(A.GUILD_RANKS[A.effectiveShopRankIdx()], 'A+', 'story completion alone cannot unlock Trader S');
A.G.guildRankIdx = A.GUILD_RANKS.length - 1;
assert.equal(A.GUILD_RANKS[A.effectiveShopRankIdx()], 'S', 'finished story plus maximum guild rank unlocks Trader S');
const masterRotation = A.rerollShop();
const allRankGear = A.CONTENT.items.filter(item => item.rankReq).map(item => item.id).sort();
assert.equal(masterRotation.fullCatalog, true, 'Trader S replaces rotation with the master catalog');
assert.deepEqual([...masterRotation.ids].sort(), allRankGear, 'Trader S makes every rank-conditioned item buyable');
const masterShopHtml = A.panelBody('shop');
assert.ok(masterShopHtml.includes('Trader S Master Catalog') && masterShopHtml.includes('Transcendent Sigil'), 'full-catalog UI exposes the S-rank item');

console.log('Equipment audit passed: comparisons, class advice, rolled stock, exact purchases, and story/guild Trader Rank are valid.');
