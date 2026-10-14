// Equipment decision audit: real derived-stat comparisons, gained/lost
// substats, stable rolled trader stock, exact-item purchases, and combined
// story/guild Trader Rank progression.
import assert from 'node:assert/strict';

import { installBrowserEnv } from './test-support/browser-env.js';
import { ITEM_ICON } from './pixelart.js';

let vnow = 1000;

installBrowserEnv({
  now: () => vnow,
  innerWidth: 1440,
  innerHeight: 900,
  nullSelectors: [],
  strictIds: false,
});

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

// All equipment paths share base-class compatibility; promotions never alter it.
const lockedSword = A.rollItem('training_greatsword', 0, 'common');
p.inventory.push(lockedSword);
const weaponBeforeLockedEquip = p.equip.weapon;
assert.equal(A.canUseItem(p, 'training_greatsword'), false, 'Far Shot cannot use sword-family gear');
A.equip(lockedSword.uid);
assert.equal(p.equip.weapon, weaponBeforeLockedEquip, 'incompatible equip does not mutate the equipped slot');
assert.ok(p.inventory.some(item => item.uid === lockedSword.uid), 'incompatible gear remains in inventory');
A.G._bagSel = 'u' + lockedSword.uid;   // details pane shows the selected slot
assert.ok(A.panelBody('inv').includes('Reborn Blade, Lightbringer'), 'locked inventory gear shows required base classes');
const bow = A.rollItem('hunter_bow', 0, 'common');
p.inventory.push(bow);
assert.equal(A.canUseItem(p, bow), true, 'Far Shot can use bow-family gear');
A.equip(bow.uid);
assert.equal(p.equip.weapon.uid, bow.uid, 'compatible family weapon equips normally');
p.tierIndex = 2; p.advancedJobId = 'worldbane_sniper'; p.className = 'Worldbane Sniper';
assert.equal(A.canUseItem(p, bow), true, 'promotion keeps base-class equipment compatibility');

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
A.G._shopItems = A.CONTENT.npcs.find(npc => npc.id === 'merchant' || npc.id === 'npc_shopkeeper').shopItems;
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
const regionalSets = [
  'duneslayer_vest', 'sunwalker_mail',
  'sporeweaver_robe', 'mire_stalker_tunic',
  'thunderlord_chainmail', 'gale_dancer_silks',
  'umbral_assassin_garb', 'darksteel_bulwark',
];
for (const id of regionalSets) {
  const item = A.CONTENT.items.find(i => i.id === id);
  assert.ok(item, `Item ${id} must exist in CONTENT.items`);
  assert.equal(item.type, 'armor', `${id} must be armor`);
  assert.ok(item.def > 0, `${id} must provide DEF`);
  assert.ok(item.gearLevel > 0, `${id} must have gearLevel > 0`);
}

// Task 3: Specialized weapons and class armor sets for Shadow Blade, Soul Binder, and Artificer
const expectedWeapons = [
  'iron_dagger', 'shadow_kris', 'nightstalker_stiletto', 'abyssal_fang', 'eclipse_edge',
  'bone_wand', 'soul_binder_staff', 'bone_scythe', 'nether_grimoire', 'abyssal_harvester',
  'heavy_wrench', 'steam_pistol', 'magitek_driver', 'mortar_cannon', 'clockwork_obliteration_engine',
];
for (const id of expectedWeapons) {
  const item = A.CONTENT.items.find(i => i.id === id);
  assert.ok(item, `Weapon ${id} must exist in CONTENT.items`);
  assert.equal(item.type, 'weapon', `${id} must have type 'weapon'`);
  assert.ok(Number.isFinite(item.gearLevel) && item.gearLevel > 0, `${id} must have gearLevel > 0`);
  assert.ok(Number.isFinite(item.atk) && item.atk > 0, `${id} must have positive ATK`);
  assert.ok(Array.isArray(item.classReq) && item.classReq.length > 0, `${id} must specify classReq`);
}

const expectedArmors = [
  'shadow_leathers', 'acolyte_robes', 'tinkerer_smock',
  'nightstalker_tunic', 'bone_woven_vestments', 'engineer_overalls',
  'phantom_garb', 'lich_mantle', 'magitek_harness',
  'void_assassin_vestments', 'netherlord_regalia', 'mechlord_power_chassis',
];
for (const id of expectedArmors) {
  const item = A.CONTENT.items.find(i => i.id === id);
  assert.ok(item, `Armor ${id} must exist in CONTENT.items`);
  assert.equal(item.type, 'armor', `${id} must have type 'armor'`);
  assert.ok(Number.isFinite(item.gearLevel) && item.gearLevel > 0, `${id} must have gearLevel > 0`);
  assert.ok(Number.isFinite(item.def) && item.def > 0, `${id} must have positive DEF`);
  assert.ok(Array.isArray(item.classReq) && item.classReq.length > 0, `${id} must specify classReq`);
}

for (const id of [...expectedWeapons, ...expectedArmors]) {
  assert.ok(ITEM_ICON[id], `Item ${id} must have a registered icon in ITEM_ICON`);
}

const targetClasses = ['shadow_blade', 'soul_binder', 'artificer'];
const dropWeapons = ['hero_blade', 'mythril_sword', 'frost_brand', 'dawn_edge', 'void_edge', 'astral_glaive'];
for (const cid of targetClasses) {
  const hero = A.makePlayer(cid, 'Tester');
  for (const wid of dropWeapons) {
    const sub = A.classWeaponFor(hero, wid);
    assert.ok(sub, `${cid} must receive a weapon substitute for ${wid}`);
    assert.ok(A.canUseItem(hero, sub), `${cid} must be able to use substitute ${sub} for ${wid}`);
  }
}

// Negative tests: non-matching classes cannot equip class-locked gear
const incompatibleHero = A.makePlayer('reborn_blade', 'Swordsman');
const lockedItems = [
  'shadow_kris', 'abyssal_fang', 'eclipse_edge', 'shadow_leathers', 'void_assassin_vestments',
  'soul_binder_staff', 'bone_scythe', 'nether_grimoire', 'acolyte_robes', 'netherlord_regalia',
  'steam_pistol', 'mortar_cannon', 'clockwork_obliteration_engine', 'tinkerer_smock', 'mechlord_power_chassis',
];
for (const id of lockedItems) {
  const item = A.CONTENT.items.find(i => i.id === id);
  assert.equal(A.canUseItem(incompatibleHero, item), false, `reborn_blade cannot equip class-locked ${id}`);
}

// Equip round-trip verification: compatible class equips, incompatible class rejected
const assassinHero = A.makePlayer('shadow_blade', 'Shadow');
A.G.player = assassinHero;
const krisInst = A.rollItem('shadow_kris', 0, 'rare');
assassinHero.inventory.push(krisInst);
A.equip(krisInst.uid);
assert.equal(assassinHero.equip.weapon?.uid, krisInst.uid, 'shadow_blade equips shadow_kris successfully');

const illegalInst = A.rollItem('mechlord_power_chassis', 0, 'epic');
assassinHero.inventory.push(illegalInst);
A.equip(illegalInst.uid);
assert.notEqual(assassinHero.equip.body?.uid, illegalInst.uid, 'shadow_blade cannot equip mechlord_power_chassis');

console.log('Equipment audit passed: comparisons, class advice, rolled stock, exact purchases, and story/guild Trader Rank are valid.');

