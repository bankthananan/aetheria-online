// game.js — the engine that fuses the design team's six data modules into a
// playable isekai RPG. Pure browser runtime; no build step, no dependencies.
import { DESIGN }  from './design.js';
import { COMBAT }  from './combat.js';
import { MAPS }    from './maps.js';
import { CONTENT } from './content.js';
import { THEME }   from './theme.js';
import { AUDIO }   from './audio.js';
import { PROGRESSION } from './progression.js';
import { SPRITES } from './sprites.js';
import { PAL, PX } from './pixelart.js';
import { RARITY, RARITY_ORDER, AFFIXES } from './loot.js';
import { LPC } from './lpc.js';
import { buildHeatField, connectedWalkableTiles, heatDepthAt, nextPortalToward } from './pathing.js';
import { T, currentLang, setLanguage } from './locale.js';

const TS = 32;                       // tile size in px
const CANVAS_W = 832, CANVAS_H = 576;

// ---- reconciliation between designers' independent id schemes ----
const CLASS_COMBAT = { reborn_blade:'blade', drifter:'berserker', codeweaver:'mage', far_shot:'ranger', lightbringer:'paladin', iron_fist:'monk', stormcaller:'elementalist' };
const MELEE = new Set(['blade','berserker','paladin','monk']);
const MAGIC = new Set(['mage','elementalist']);
const NPC_BY_ROLE = { shop:'npc_shopkeeper', guild:'elder', quest:'npc_guide', story:'npc_storyteller' };
const MAP_MUSIC = {
  town_awakening: 'town_awakening', whispering_woods: 'whispering_woods',
  sunken_ruins: 'sunken_ruins', frostpeak_tundra: 'frostpeak_tundra',
  dragon_caldera: 'dragon_caldera', astral_rift: 'astral_rift',
};
const TUNING = DESIGN.tuning;
// quest / bounty difficulty tiers: colour + reward multiplier + monster-level band for guild rolls
const DIFFICULTY = {
  easy:   { name: 'Easy',   color: '#7bd88f', mult: 0.8, band: [1, 5] },
  normal: { name: 'Normal', color: '#e0c351', mult: 1.0, band: [6, 12] },
  hard:   { name: 'Hard',   color: '#e8963c', mult: 1.4, band: [13, 18] },
  elite:  { name: 'Elite',  color: '#e0574b', mult: 2.0, band: [18, 99] },
};
const diffBadge = d => { const c = DIFFICULTY[d] || DIFFICULTY.normal; return `<span class="difficulty-badge" style="--difficulty-color:${c.color};display:inline-block;font-size:10px;font-weight:700;padding:1px 7px;border-radius:9px;border:1px solid var(--difficulty-color)">${T(c.name, 'ui')}</span>`; };
// Adventurer's Guild rank ladder. Bounties award points by difficulty; ranking up
// unlocks harder bounties (hard @ D-, elite @ B-), multiplies rewards, sweetens
// loot rarity, and opens rank-gated shop stock (items with `rankReq`).
const GUILD_RANKS = ['F', 'E-', 'E', 'E+', 'D-', 'D', 'D+', 'C-', 'C', 'C+', 'B-', 'B', 'B+', 'A-', 'A', 'A+', 'S'];
const GUILD_HARD_AT = 4, GUILD_ELITE_AT = 10;            // rank index gates (D-, B-)
const GUILD_DIFF_PTS = { easy: 1, normal: 2, hard: 4, elite: 8 };   // legacy fallback (old saves)
// points scale by REGION TIER (which 15-level band the target lives in) × difficulty:
// tier 0 easy/normal/hard = 3/6/9 · tier 1 = 10/20/30 · ... up to tier 4
const GUILD_TIER_PTS = [3, 10, 22, 40, 65];
const DIFF_PTS_MULT = { easy: 1, normal: 2, hard: 3, elite: 4.5 };
const monsterTier = lvl => Math.min(4, Math.floor((lvl - 1) / 15));
const guildPointsNeed = i => 15 + i * 12;                // points to advance from rank i
// glyph per skill type — the node "icon" in the skill tree (no art assets needed)
const SKILL_GLYPH = { melee: '†', ranged: '➶', aoe: '✦', buff: '◇', heal: '+' };
const CLASS_CREST = { blade: 'B', berserker: 'D', mage: 'C', ranger: 'F', paladin: 'L', monk: 'I', elementalist: 'S' };
const DEFAULT_HOTKEYS = Array.from({ length: 9 }, (_, i) => `Digit${i + 1}`);
const RESERVED_HOTKEYS = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyE', 'KeyF',
  'KeyC', 'KeyI', 'KeyK', 'KeyM', 'KeyQ',
]);

// ---- lookups ----
const monById = Object.fromEntries(CONTENT.monsters.map(m => [m.id, m]));
const itemById = Object.fromEntries(CONTENT.items.map(i => [i.id, i]));
const npcById = Object.fromEntries(CONTENT.npcs.map(n => [n.id, n]));
const questById = Object.fromEntries(CONTENT.quests.map(q => [q.id, q]));
const translateAny = (key, categories) => {
  for (const category of categories) {
    const translated = T(key, category);
    if (translated !== key) return translated;
  }
  return key;
};
// each monster's home zone name (first map it spawns in) — for guild bounty location hints
const monsterMapName = {};
const monsterMapId = {};
const monsterLevelRange = {};
for (const map of Object.values(MAPS)) for (const sp of (map.spawns || [])) if (!(sp.monsterId in monsterMapName)) {
  monsterMapName[sp.monsterId] = map.name;
  monsterMapId[sp.monsterId] = map.id;
  const fallbackLevel = monById[sp.monsterId]?.level || 1;
  monsterLevelRange[sp.monsterId] = sp.levelRange ? [...sp.levelRange] : [fallbackLevel, fallbackLevel];
}
// which monster drops a material + where it lives (for delivery bounty hints)
const itemDropSource = itemId => { for (const m of CONTENT.monsters) if (m.drops.some(d => d.itemId === itemId)) return { mon: m.name, monsterId: m.id, map: monsterMapName[m.id], mapId: monsterMapId[m.id] }; return null; };
const npcLocation = npcId => { for (const map of Object.values(MAPS)) { const npc = (map.npcs || []).find(n => n.id === npcId); if (npc) return { mapId: map.id, npc }; } return null; };
// shared item-category grouping (inventory + shop buy/sell)
const ITEM_CAT = it => it.type === 'weapon' ? 'Weapons' : (it.type === 'armor' || it.type === 'accessory') ? 'Armor & Accessories' : it.type === 'potion' ? 'Potions' : it.type === 'reset' ? 'Reset Manuals' : it.type === 'material' ? 'Materials' : 'Quest Items';
const ITEM_CAT_ORDER = { 'Weapons': 0, 'Armor & Accessories': 1, 'Potions': 2, 'Reset Manuals': 3, 'Materials': 4, 'Quest Items': 5 };
const skillsFor = cc => COMBAT.skills.filter(s => s.classId === cc);
// item id -> pixel icon key (see pixelart.js PX.item)
const ITEM_ICON = {
  worn_dagger: 'dagger', iron_sword: 'sword', hero_blade: 'greatsword',
  cloth_tunic: 'tunic', leather_vest: 'vest', guardian_plate: 'plate',
  minor_potion: 'potred', mid_potion: 'potred', mana_potion: 'potblue',
  slime_gel: 'gem', goblin_ear: 'gem', wolf_pelt: 'gem', wolf_fang: 'gem', shade_dust: 'gem', golem_core: 'core',
  guide_letter: 'scroll', ancient_seal: 'scroll',
  mythril_sword: 'sword', frost_brand: 'sword', dawn_edge: 'greatsword',
  mythril_plate: 'plate', seraph_ward: 'plate',
  greater_potion: 'potred', elixir: 'potblue',
  frost_shard: 'gem', ice_core: 'core', sand_fang: 'gem', ember_ash: 'gem', dragon_heart: 'core',
  iron_helm: 'helm', dragon_helm: 'helm', iron_gauntlets: 'gloves', iron_boots: 'boots',
  warding_cloak: 'cloak', power_ring: 'ring', vitality_amulet: 'ring',
  void_edge: 'sword', astral_glaive: 'greatsword', astral_plate: 'plate', void_helm: 'helm',
  astral_signet: 'ring', celestial_draught: 'potblue', void_shard: 'gem', star_iron: 'gem', null_core: 'core',
  sharpening_stone: 'gem', iron_tonic: 'potblue', teleport_scroll: 'scroll', blessed_ore: 'core',
  soul_ledger: 'scroll', memory_prism: 'gem',
  bronze_ring: 'ring', silver_amulet: 'ring', gold_ring: 'ring', star_pendant: 'ring', comet_ring: 'ring', transcendent_sigil: 'ring',
  steel_sword: 'sword', knight_plate: 'plate',
  mythril_gauntlets: 'gloves', drakescale_boots: 'boots', aurora_cloak: 'cloak',
  titan_grips: 'gloves', astral_greaves: 'boots', voidweave_cloak: 'cloak',
};
// equipment slots (paper-doll). Item's slot comes from `itemSlot()`.
const EQUIP_SLOTS = ['weapon', 'head', 'body', 'hands', 'cloak', 'feet', 'accessory'];
const SLOT_LABEL = { weapon: 'Weapon', head: 'Head', body: 'Body', hands: 'Hands', cloak: 'Cloak', feet: 'Feet', accessory: 'Accessory' };
const SLOT_ICON = { weapon: 'sword', head: 'helm', body: 'plate', hands: 'gloves', cloak: 'cloak', feet: 'boots', accessory: 'ring' };
const itemSlot = it => it.type === 'weapon' ? 'weapon' : it.type === 'accessory' ? 'accessory' : (it.slot || 'body');

// ---- compile formula strings (strict mode: no `with`, so destructure a scope) ----
const VARS = ['baseHp','vit','level','int','str','dex','weaponAtk','armorDef','agi','luk','attackerAtk','defenderDef','isCrit'];
const compile = expr => new Function('a', `const {${VARS.join(',')}}=a; return (${expr});`);
const F = Object.fromEntries(Object.entries(DESIGN.formulas).map(([k, e]) => [k, compile(e)]));
const xpForNext = new Function('level', `return (${DESIGN.xpCurve});`);
const jobXpForNext = new Function('level', `return (${DESIGN.jobXpCurve});`);

// ---- tiny helpers ----
const $ = sel => document.querySelector(sel);
const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
const now = () => performance.now();
const chance = p => Math.random() < p;
const esc = v => String(v ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const isDamageSkill = s => ['melee', 'ranged', 'aoe'].includes(s?.type);
const hotkeyLabel = code => code?.startsWith('Digit') ? code.slice(5)
  : code?.startsWith('Numpad') ? `Num ${code.slice(6)}`
  : code?.startsWith('Key') ? code.slice(3) : code || '?';
const isBindableHotkey = code => /^(Digit[0-9]|Numpad[0-9]|Key[A-Z])$/.test(code || '') && !RESERVED_HOTKEYS.has(code);
function normaliseHotkeys(keys) {
  const wanted = Array.isArray(keys) ? keys : [], seen = new Set(), out = new Array(9).fill(null);
  for (let i = 0; i < out.length; i++) {
    const code = wanted[i];
    if (isBindableHotkey(code) && !seen.has(code)) { out[i] = code; seen.add(code); }
  }
  const fallbacks = [...DEFAULT_HOTKEYS, 'Digit0', ...'RTYUOPGHJLZXVBNM'.split('').map(x => `Key${x}`)];
  for (let i = 0; i < out.length; i++) if (!out[i]) {
    const code = fallbacks.find(x => !seen.has(x)); out[i] = code; seen.add(code);
  }
  return out;
}
function eventHotkeyCode(e) {
  if (e.code) return e.code;
  const key = String(e.key || '');
  if (/^[0-9]$/.test(key)) return `Digit${key}`;
  if (/^[a-z]$/i.test(key)) return `Key${key.toUpperCase()}`;
  return '';
}

// ---- loot: rarity + affix rolls (higher rarity → stronger base + more affixes) ----
let _uid = 0;
const rndInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const isEquip = itemId => ['weapon', 'armor', 'accessory'].includes(itemById[itemId]?.type);
function pickRarity(bias = 0) {
  const weighted = RARITY_ORDER.map(k => { let w = RARITY[k].weight; if (bias > 0 && RARITY[k].affixes > 0) w *= (1 + bias * RARITY[k].affixes * 0.6); return [k, w]; });
  const total = weighted.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [k, w] of weighted) { r -= w; if (r <= 0) return k; }
  return 'common';
}
function rollItem(itemId, bias = 0, forceRarity) {
  const rarity = RARITY[forceRarity] ? forceRarity : pickRarity(bias);
  const pool = [...AFFIXES], affixes = [];
  for (let i = 0; i < RARITY[rarity].affixes && pool.length; i++) {
    const a = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
    const value = rndInt(a.min, a.max);
    affixes.push({ stat: a.stat, value, label: a.label.replace('{v}', value) });
  }
  return { itemId, uid: ++_uid, rarity, affixes, plus: 0 };
}
// loot bias grows with the monster's rolled level, the hero's LUK, and guild rank.
const dropBias = (m, p) => (m.lvl || m.def.level) * TUNING.dropLevelBias + (m.def.sizeTiles >= 2 ? 3 : 0) + (p?.stats?.luk || 0) * TUNING.dropLuckBias + (G.guildRankIdx || 0) * 0.15;
const itemRarity = inst => RARITY[inst?.rarity] || RARITY.common;
const itemAffixes = inst => Array.isArray(inst?.affixes) ? inst.affixes : [];
const effAtk = inst => inst ? Math.round((itemById[inst.itemId].atk || 0) * itemRarity(inst).mult * (1 + 0.05 * (inst.plus || 0))) : 0;
const effDef = inst => inst ? Math.round((itemById[inst.itemId].def || 0) * itemRarity(inst).mult * (1 + 0.05 * (inst.plus || 0))) : 0;
const instName = inst => (inst.plus ? `+${inst.plus} ` : '') + T(itemById[inst.itemId].name, 'items');
function equippedAffixes(p) {
  const acc = { atkPct: 0, critPct: 0, hpFlat: 0, mpFlat: 0, defPct: 0, lifesteal: 0, hitFlat: 0, fleeFlat: 0 };
  for (const s of EQUIP_SLOTS) for (const a of itemAffixes(p.equip[s])) acc[a.stat] = (acc[a.stat] || 0) + a.value;
  return acc;
}

// Gear advice is intentionally class-shaped instead of pretending every build
// wants the same scalar "gear score". The first three substats are the core
// recommendation; the fourth is a useful secondary stat.
const GEAR_AFFIX_UI = {
  atkPct:    { name: 'ATK',       suffix: '%' },
  critPct:   { name: 'Crit',      suffix: '%' },
  hpFlat:    { name: 'Max HP',    suffix: '' },
  mpFlat:    { name: 'Max MP',    suffix: '' },
  defPct:    { name: 'DEF',       suffix: '%' },
  lifesteal: { name: 'Lifesteal', suffix: '%' },
  hitFlat:   { name: 'Hit',       suffix: '' },
  fleeFlat:  { name: 'Flee',      suffix: '' },
};
const CLASS_GEAR_PRIORITIES = {
  blade:       ['hpFlat', 'defPct', 'lifesteal', 'atkPct'],
  berserker:   ['atkPct', 'critPct', 'lifesteal', 'fleeFlat'],
  mage:        ['atkPct', 'mpFlat', 'critPct', 'hpFlat'],
  ranger:      ['atkPct', 'critPct', 'hitFlat', 'fleeFlat'],
  paladin:     ['hpFlat', 'defPct', 'lifesteal', 'atkPct'],
  monk:        ['atkPct', 'critPct', 'lifesteal', 'hitFlat'],
  elementalist:['atkPct', 'mpFlat', 'critPct', 'hpFlat'],
};
const gearPriorities = p => CLASS_GEAR_PRIORITIES[p?.combatClass] || ['atkPct', 'hpFlat', 'defPct', 'critPct'];
const affixTotals = inst => {
  const totals = {};
  for (const a of itemAffixes(inst)) totals[a.stat] = (totals[a.stat] || 0) + (Number(a.value) || 0);
  return totals;
};
const affixValueText = (stat, value, signed = true) => {
  const ui = GEAR_AFFIX_UI[stat] || { name: stat, suffix: '' };
  const sign = signed && value > 0 ? '+' : '';
  return `${sign}${value}${ui.suffix} ${T(ui.name, 'ui')}`;
};

// =====================================================================
// SELF-CHECK (ponytail: one runnable check — fail loud in console if data drifts)
// =====================================================================
function selfCheck() {
  const errs = [];
  for (const c of DESIGN.classes) {
    const cc = CLASS_COMBAT[c.id];
    if (!cc) errs.push(`class ${c.id} has no combat mapping`);
    else if (skillsFor(cc).length === 0) errs.push(`class ${cc} has no skills`);
  }
  for (const map of Object.values(MAPS)) {
    for (const field of ['province', 'epithet', 'landmark', 'lore'])
      if (typeof map.chronicle?.[field] !== 'string' || !map.chronicle[field].trim())
        errs.push(`map ${map.id} missing chronicle.${field}`);
    for (const sp of map.spawns) if (!monById[sp.monsterId]) errs.push(`map ${map.id} spawns unknown ${sp.monsterId}`);
    for (const sp of map.spawns) {
      const def = monById[sp.monsterId];
      if (!def || def.sizeTiles >= 2) continue;
      if (!(Array.isArray(sp.depth) && sp.depth.length === 2 && sp.depth[0] >= 0 && sp.depth[0] < sp.depth[1] && sp.depth[1] <= 1))
        errs.push(`map ${map.id} spawn ${sp.monsterId} has invalid depth habitat`);
      if (!(Array.isArray(sp.levelRange) && sp.levelRange.length === 2 && Number.isInteger(sp.levelRange[0])
        && Number.isInteger(sp.levelRange[1]) && sp.levelRange[0] <= def.level && def.level <= sp.levelRange[1]
        && sp.levelRange[0] >= map.band?.[0] && sp.levelRange[1] <= map.band?.[1]))
        errs.push(`map ${map.id} spawn ${sp.monsterId} has invalid level range`);
    }
    for (const pt of map.portals || []) if (!MAPS[pt.toMap]) errs.push(`map ${map.id} portal → unknown map ${pt.toMap}`);
    // every hunting ground needs a zone guardian (guild bounties scale by unlocked regions)
    if (map.spawns.length && !map.spawns.some(sp => monById[sp.monsterId]?.sizeTiles >= 2))
      errs.push(`map ${map.id} has no guardian boss (sizeTiles>=2 spawn required)`);
    // ...and a level band + boss marker for the heat map
    if (map.spawns.length) {
      if (!map.band || !(map.band[0] < map.band[1])) errs.push(`map ${map.id} missing/invalid band`);
      if (!map.tiles.some(r => r.includes('B'))) errs.push(`map ${map.id} has no 'B' guardian marker`);
      const guard = map.spawns.map(sp => monById[sp.monsterId]).find(d => d?.sizeTiles >= 2);
      if (map.band && guard && guard.level > map.band[1]) errs.push(`map ${map.id} guardian above band ceiling`);
    }
  }
  for (const m of CONTENT.monsters)
    for (const d of m.drops) if (!itemById[d.itemId]) errs.push(`monster ${m.id} drops unknown ${d.itemId}`);
  for (const q of CONTENT.quests) {
    for (const it of q.rewards.items) if (!itemById[it]) errs.push(`quest ${q.id} rewards unknown ${it}`);
    const o = q.objective, allNpcIds = Object.values(MAPS).flatMap(m => m.npcs || []).map(n => n.id);
    if (o.type === 'kill' && !monById[o.target]) errs.push(`quest ${q.id} kill target unknown ${o.target}`);
    if (o.type === 'collect' && !itemById[o.target]) errs.push(`quest ${q.id} collect target unknown ${o.target}`);
    if (o.type === 'collect' && !itemDropSource(o.target)) errs.push(`quest ${q.id} collect target has no monster source ${o.target}`);
    if (o.type === 'explore' && !MAPS[o.target]) errs.push(`quest ${q.id} explore target unknown map ${o.target}`);
    if (o.type === 'talk' && !allNpcIds.includes(o.target)) errs.push(`quest ${q.id} talk target unknown npc ${o.target}`);
    for (const nid of questSuccessorIds(q)) if (!questById[nid]) errs.push(`quest ${q.id} chains to unknown quest ${nid}`);
    if (q.nextQuestByClass) {
      const classIds = DESIGN.classes.map(c => c.id);
      for (const cid of classIds) if (!q.nextQuestByClass[cid]) errs.push(`quest ${q.id} class fork misses class ${cid}`);
      for (const cid of Object.keys(q.nextQuestByClass)) if (!classIds.includes(cid)) errs.push(`quest ${q.id} class fork names unknown class ${cid}`);
    }
    if (q.giverNpcId && !npcById[q.giverNpcId]) errs.push(`quest ${q.id} giver unknown npc ${q.giverNpcId}`);
    for (const f of ['startLines', 'doneLines'])
      if (q[f] && !(Array.isArray(q[f]) && q[f].length && q[f].every(l => typeof l === 'string' && l))) errs.push(`quest ${q.id} bad ${f}`);
  }
  // Main-story phases must cover Base Lv 1–80 without gaps, and every quest
  // must form one forward-moving chain inside those bands.
  const phases = CONTENT.storyPhases || [];
  if (!phases.length) errs.push('story phases missing');
  phases.forEach((phase, i) => {
    if (phase.id !== i + 1) errs.push(`story phase ${phase.id} is out of order`);
    if (i === 0 && phase.levelMin !== 1) errs.push('story phases must begin at Base Lv 1');
    if (i && phase.levelMin !== phases[i - 1].levelMax + 1) errs.push(`story phase ${phase.id} leaves a level gap`);
    if (!(phase.levelMin <= phase.levelMax && MAPS[phase.mapId])) errs.push(`story phase ${phase.id} has an invalid band/map`);
  });
  if (phases.at(-1)?.levelMax !== DESIGN.levelCap) errs.push(`story phases must end at Base Lv ${DESIGN.levelCap}`);
  for (const q of CONTENT.quests) {
    const phase = phases.find(entry => entry.id === q.phase);
    if (!phase) errs.push(`quest ${q.id} has unknown story phase ${q.phase}`);
    else if (!(q.minLevel >= phase.levelMin && q.minLevel <= phase.levelMax)) errs.push(`quest ${q.id} level gate is outside phase ${q.phase}`);
    for (const nid of questSuccessorIds(q)) {
      const next = questById[nid];
      if (next && (next.phase < q.phase || next.minLevel < q.minLevel)) errs.push(`quest ${q.id} chains backward to ${next.id}`);
    }
  }
  const chainedIds = new Set(CONTENT.quests.flatMap(q => questSuccessorIds(q)));
  const roots = CONTENT.quests.filter(q => !chainedIds.has(q.id));
  if (roots.length !== 1 || roots[0]?.id !== 'q_awaken') errs.push('main story must have one q_awaken root');
  // the story is linear except one per-class fork: walk it once per class and
  // require every quest to be reached by some class, with no cycles anywhere
  const storyUnion = new Set();
  for (const cls of DESIGN.classes) {
    const storyWalk = new Set(); let storyNode = questById.q_awaken;
    while (storyNode && !storyWalk.has(storyNode.id)) {
      storyWalk.add(storyNode.id);
      storyNode = questById[storyNode.nextQuestByClass ? storyNode.nextQuestByClass[cls.id] : storyNode.nextQuestId];
    }
    if (storyNode) errs.push(`story chain for class ${cls.id} has a cycle`);
    storyWalk.forEach(id => storyUnion.add(id));
  }
  if (storyUnion.size !== CONTENT.quests.length) errs.push('main story chain has an orphan');
  const s = { baseHp:100, vit:9, level:5, int:10, str:8, dex:10, weaponAtk:15, agi:9, luk:6, armorDef:8, attackerAtk:40, defenderDef:12, isCrit:true };
  for (const [k, fn] of Object.entries(F)) if (!Number.isFinite(fn(s))) errs.push(`formula ${k} not finite`);
  if (!Number.isFinite(xpForNext(5))) errs.push('xpCurve not finite');
  if (!Number.isFinite(jobXpForNext(5))) errs.push('jobXpCurve not finite');
  if (!(Number.isInteger(PROGRESSION.jobLevelCap) && PROGRESSION.jobLevelCap > 1)) errs.push('progression jobLevelCap invalid');
  if (!(PROGRESSION.skillScale > 0 && PROGRESSION.masteryScale > 0)) errs.push('progression skill scaling invalid');
  // progression: every skill has a tree node, prereqs point at real skills, each class has tiers
  const skillIds = new Set(COMBAT.skills.map(s2 => s2.id));
  for (const cc of new Set(Object.values(CLASS_COMBAT))) {
    const book = PROGRESSION.skillBooks?.[cc];
    if (!(book?.title && book?.crest && book?.color && book?.deep && book?.focus && book?.motto)) errs.push(`class ${cc} missing skill-book identity`);
  }
  for (const sk of COMBAT.skills) if (!PROGRESSION.skillTree[sk.id]) errs.push(`skill ${sk.id} missing tree node`);
  for (const [id, n] of Object.entries(PROGRESSION.skillTree)) {
    if (!skillIds.has(id)) errs.push(`tree node ${id} has no skill`);
    if (n.reqSkill && !skillIds.has(n.reqSkill.id)) errs.push(`${id} requires unknown skill ${n.reqSkill.id}`);
    if (!(Number.isInteger(n.maxLevel) && n.maxLevel > 0)) errs.push(`${id} has invalid maxLevel`);
    if ((n.reqLevel || 1) > PROGRESSION.jobLevelCap) errs.push(`${id} requires Job Lv beyond cap`);
    if (n.tierCaps) {
      if (!(Array.isArray(n.tierCaps) && n.tierCaps.length === 3 && n.tierCaps[2] === n.maxLevel)) errs.push(`${id} has invalid tierCaps`);
      if (n.tierCaps.some((cap, i) => cap < 1 || (i && cap < n.tierCaps[i - 1]))) errs.push(`${id} tierCaps must rise monotonically`);
    }
    for (const [rank, req] of Object.entries(n.rankReqLevels || {}))
      if (!(+rank >= 2 && +rank <= n.maxLevel && req >= 1 && req <= PROGRESSION.jobLevelCap)) errs.push(`${id} has invalid rank ${rank} requirement`);
  }
  for (const c of DESIGN.classes) if (!(PROGRESSION.tiers[c.id]?.length)) errs.push(`class ${c.id} has no tiers`);
  for (const tiers of Object.values(PROGRESSION.tiers)) for (const t of tiers) if (t.advance) {
    const o = t.advance.objective;
    if (o.type === 'kill' && !monById[o.target]) errs.push(`advance quest kills unknown ${o.target}`);
    if (o.type === 'collect' && !itemById[o.target]) errs.push(`advance quest collects unknown ${o.target}`);
  }
  // pixel sprites: art for each class, monster, and NPC role
  for (const cc of Object.values(CLASS_COMBAT)) if (!PX.player[cc]) errs.push(`no player pixel sprite for ${cc}`);
  for (const m of CONTENT.monsters) {
    const rows = PX.monster[m.id];
    if (!rows) { errs.push(`no monster pixel sprite for ${m.id}`); continue; }
    if (Array.isArray(rows)) { errs.push(`monster ${m.id} still uses a legacy single-frame sprite`); continue; }
    const states = Object.keys(rows);
    if (states.length !== 3 || !['idle', 'walk', 'attack'].every(st => rows[st])) {
      errs.push(`monster ${m.id} frame-set must have exactly idle/walk/attack`); continue;
    }
    for (const st of ['idle', 'walk', 'attack']) {
      const frames = rows[st];
      if (!Array.isArray(frames) || frames.length !== 2) { errs.push(`monster ${m.id} state ${st} must have exactly 2 frames`); continue; }
      const [h0, w0] = [frames[0].length, Math.max(...frames[0].map(r => r.length))];
      frames.forEach((f, fi) => {
        const h = f.length, w = Math.max(...f.map(r => r.length));
        if (h !== h0 || w !== w0) errs.push(`monster ${m.id} state ${st} frame ${fi} dimension mismatch`);
        if (h > 32 || w > 32) errs.push(`monster ${m.id} state ${st} frame ${fi} exceeds 32x32`);
      });
    }
  }
  for (const role of Object.keys(NPC_BY_ROLE)) if (!PX.npc[role]) errs.push(`no npc pixel sprite for role ${role}`);
  for (const cc of Object.values(CLASS_COMBAT)) if (!PX.playerWalk[cc]) errs.push(`no walk frame for ${cc}`);
  for (const k of new Set(Object.values(ITEM_ICON))) if (!PX.item[k]) errs.push(`missing item icon '${k}'`);
  for (const it of CONTENT.items) if (!ITEM_ICON[it.id]) errs.push(`item ${it.id} has no icon mapping`);
  for (const [id, pa] of Object.entries(PROGRESSION.passives || {})) {
    if (!Object.values(CLASS_COMBAT).includes(pa.classId)) errs.push(`passive ${id} bad class ${pa.classId}`);
    if (pa.reqLevel > PROGRESSION.jobLevelCap) errs.push(`passive ${id} requires Job Lv beyond cap`);
    if ((pa.reqTier || 0) > 2) errs.push(`passive ${id} has invalid tier`);
  }
  for (const k of new Set(Object.values(SLOT_ICON))) if (!PX.item[k]) errs.push(`missing slot icon '${k}'`);
  // tuning knobs + quest difficulty tiers must be present/valid
  for (const k of ['monsterLevelSpread','monsterStatPerLevel','monsterAtkMult','monsterHpMult','monsterHpLevelGrowth','monsterDefLevelGrowth','bossHpMult','monsterExpMult','expGapFalloff','expGapMin','expGapMax','dropLevelBias','dropLuckBias','zenyPerLevel','combatGapFalloff','combatGapFloor','deathZenyLoss','bossSlamEveryMs','bossEnrageAt','statCostEvery','potionCdMs','combatGapHitPerLvl','autoHuntMaxLevelGap','hitBaseChance','hitStatScale','hitChanceMin','hitChanceMax','heatNursery','rareBossEveryMs','dayCycleMs','rebirthStatBonus','rebirthHpMpPct','rebirthMonsterAtkMult','rebirthMonsterDefMult','rebirthMonsterHpMult','rebirthGearHpPerAtk','rebirthGearHpCap','rebirthMonsterExp'])
    if (!Number.isFinite(TUNING?.[k])) errs.push(`tuning.${k} missing/non-numeric`);
  for (const k of ['max','finisherMin','perHit','decayMs','powerPerPoint','detonateBonus'])
    if (!Number.isFinite(TUNING?.momentum?.[k])) errs.push(`tuning.momentum.${k} missing/non-numeric`);
  for (const s of COMBAT.skills) if (s.detonate && !COMBAT.statusEffects[s.detonate]) errs.push(`skill ${s.id} detonate → unknown status ${s.detonate}`);
  for (const r of CONTENT.recipes || []) {
    if (!itemById[r.out]) errs.push(`recipe ${r.id} → unknown output ${r.out}`);
    if (!Number.isFinite(r.cost) || r.cost < 0) errs.push(`recipe ${r.id} bad cost`);
    if (!r.mats?.length) errs.push(`recipe ${r.id} has no materials`);
    for (const m of r.mats || []) if (!itemById[m.itemId]) errs.push(`recipe ${r.id} → unknown material ${m.itemId}`);
  }
  if (!(CONTENT.recipes || []).length) errs.push('no crafting recipes defined');
  const achIds = new Set();
  for (const a of CONTENT.achievements || []) {
    if (achIds.has(a.id)) errs.push(`duplicate achievement ${a.id}`); achIds.add(a.id);
    if (a.type === 'guardian' && !monById[a.target]) errs.push(`achievement ${a.id} → unknown monster ${a.target}`);
    if (a.type === 'rank' && !GUILD_RANKS.includes(a.target)) errs.push(`achievement ${a.id} → unknown guild rank ${a.target}`);
    if (!a.name || !a.desc || !a.icon) errs.push(`achievement ${a.id} missing name/desc/icon`);
  }
  if (!achIds.size) errs.push('no achievements defined');
  for (const q of CONTENT.quests) if (q.difficulty && !DIFFICULTY[q.difficulty]) errs.push(`quest ${q.id} bad difficulty ${q.difficulty}`);
  for (const it of CONTENT.items) if (it.rankReq && !GUILD_RANKS.includes(it.rankReq)) errs.push(`item ${it.id} bad rankReq ${it.rankReq}`);
  for (const fid of REFINE_FRAG) if (!itemById[fid]) errs.push(`refine fragment unknown item ${fid}`);
  for (const mid of ZONE_ORDER) if (!MAPS[mid] || !zoneGuardian(mid)) errs.push(`zone order entry ${mid} missing map/guardian`);
  for (const [mid, m] of Object.entries(MAPS)) m.tiles.forEach((row, y) => { if (row.length !== m.width) errs.push(`map ${mid} row ${y} width ${row.length} != ${m.width}`); });
  for (const it of CONTENT.items) if (it.buff && !(['atk', 'def'].includes(it.buff.stat) && Number.isFinite(it.buff.mult) && it.buff.durationMs > 0)) errs.push(`item ${it.id} bad buff spec`);
  for (const it of CONTENT.items) if (it.teleport && !MAPS[it.teleport]) errs.push(`item ${it.id} teleport → unknown map ${it.teleport}`);
  if (errs.length) { console.error('[selfcheck] FAILED:\n' + errs.join('\n')); throw new Error('data self-check failed'); }
  console.log('[selfcheck] OK — classes/skills/maps/drops/quests/formulas all resolve');
}

// =====================================================================
// GAME STATE
// =====================================================================
const G = {
  player: null,
  map: null, mapId: null, tiles: null, legend: null,
  heatField: null,
  monsters: [], npcs: [], portals: [],
  spawnTiles: [],
  cam: { x: 0, y: 0 },
  keys: {},
  target: null,
  targetSource: null,   // hunt | retaliate | manual; preserves deliberate high-level challenges
  effects: [],          // transient attack/spell visuals
  path: null,           // [{x,y}] pixel waypoints for click-to-move (A* routed)
  manualIntent: null,   // explicit click action: finish moving/talking before Hunt reacquires
  quest: null,          // active quest id
  pendingQuest: null,   // next story quest waiting for its Base Level gate
  advance: null,        // active class-advancement quest {ti, def, progress}
  killCounts: {},       // monsterId -> kills (for kill quests)
  lastPortalAt: 0,
  running: false,
  muted: false,
  won: false,
  autoFarm: false,      // auto-target & attack nearby non-boss monsters
  huntTargetId: null,   // focused task hunting ignores every other monster type
  taskGuide: null,      // active tracker navigation across maps / to NPCs
  rareBossMapId: null,  // map currently prowled by the roaming rare boss (null = none)
  nextRareBossAt: 0,    // ponytail: not persisted — the hunt simply restarts each session
  storage: [],          // town chest: item entries parked outside the backpack (persisted)
  achievements: new Set(), // unlocked achievement ids (persisted)
  dayPhaseOverride: null,  // test/screenshot hook: force a day-cycle phase 0..1
  guildBoard: [],       // repeatable adventurer's-guild bounties
  activeGuilds: [],     // up to GUILD_MAX_ACTIVE accepted bounties
  guildRankIdx: 0,      // index into GUILD_RANKS
  guildPoints: 0,       // progress toward the next rank
  visited: new Set(),   // mapIds entered (explore objectives)
  talked: new Set(),    // map-NPC ids spoken to (talk objectives)
  guardiansSlain: new Set(),   // zone guardians defeated — gates guild bounty regions
  debugAnim: null,      // {state,frame,dir?} freeze override for LPC anim screenshots/tests
  debugTilePhase: null, // deterministic ambient-tile phase for screenshots/tests
};
const GUILD_MAX_ACTIVE = 3;
// legacy alias: old saves & tests use the singular — maps to the first active bounty
Object.defineProperty(G, 'activeGuild', {
  get() { return G.activeGuilds[0] || null; },
  set(v) { G.activeGuilds = v ? [v] : []; },
});

// =====================================================================
// PLAYER
// =====================================================================
function makePlayer(classId, name) {
  const cls = DESIGN.classes.find(c => c.id === classId);
  const tiers = PROGRESSION.tiers[classId] || [{ name: cls.name }];
  const p = {
    classId, combatClass: CLASS_COMBAT[classId], name: name || 'Hero',
    className: tiers[0].name, tierIndex: 0, level: 1, xp: 0,
    jobLevel: 1, jobXp: 0,     // finite RO-style job track; every level through the cap grants 1 point
    rebirths: 0,               // NG+ count — permanent stat/HP/MP bonuses scale with it
    zeny: 50,
    inventory: [{ itemId: 'minor_potion', qty: 3 }],
    equip: { weapon: null, head: null, body: null, hands: null, cloak: null, feet: null, accessory: null },
    lifesteal: 0,
    x: 0, y: 0, facing: { x: 0, y: 1 },
    hp: 1, mp: 1,
    attackCdUntil: 0, skillCd: {}, buffs: [], momentum: 0, lastSkillAt: 0,
    animAttackUntil: 0, animCastUntil: 0, hurtUntil: 0,   // LPC anim-state timers
    // progression
    alloc: { str: 0, agi: 0, vit: 0, int: 0, dex: 0, luk: 0 },
    statPoints: PROGRESSION.startStatPoints,
    skillPoints: PROGRESSION.startSkillPoints,
    skillLevels: {},          // skillId -> learned level (0/undefined = locked)
    _cls: cls,
  };
  p.equip.body = rollItem('cloth_tunic', 0, 'common');   // starting gear (you woke up wearing it)
  // auto-learn each class's tier-1 skill so the hero can fight immediately
  const first = skillsFor(p.combatClass).find(s => PROGRESSION.skillTree[s.id]?.reqSkill == null);
  if (first) p.skillLevels[first.id] = 1;
  // 9-slot action bar: only what you actually HAVE — the starter skill and a potion.
  // New skills auto-slot when learned; everything is editable via right-click.
  p.hotbar = new Array(9).fill(null);
  p.hotkeys = normaliseHotkeys(DEFAULT_HOTKEYS);
  if (first) p.hotbar[0] = { type: 'skill', id: first.id };
  p.hotbar[5] = { type: 'item', itemId: 'minor_potion' };
  recompute(p, true);
  return p;
}

// assign an item / skill to the first free hotbar slot (or a specific one)
function assignItemHotbar(itemId, slot) {
  const p = G.player;
  let i = slot != null ? slot : p.hotbar.findIndex((s, k) => k >= 5 && !s);
  if (i < 0) i = p.hotbar.findIndex(s => !s);
  if (i < 0) i = 8;
  p.hotbar[i] = { type: 'item', itemId };
  renderHotbar(); AUDIO.playSfx('menu'); logMsg(`${itemById[itemId].name} → hotkey ${hotkeyLabel(p.hotkeys[i])}.`, 'good');
}
function assignSkillHotbar(id, slot) {
  const p = G.player;
  let i = slot != null ? slot : p.hotbar.findIndex(s => !s);
  if (i < 0) i = 0;
  p.hotbar[i] = { type: 'skill', id };
  renderHotbar(); AUDIO.playSfx('menu'); logMsg(`${COMBAT.skills.find(s => s.id === id).name} → hotkey ${hotkeyLabel(p.hotkeys[i])}.`, 'good');
}

function setHotkeyBinding(slot, code) {
  const p = G.player;
  if (!p || slot < 0 || slot >= p.hotbar.length || !isBindableHotkey(code)) return false;
  p.hotkeys = normaliseHotkeys(p.hotkeys);
  const other = p.hotkeys.indexOf(code), old = p.hotkeys[slot];
  if (other >= 0 && other !== slot) p.hotkeys[other] = old;   // swap instead of silently stealing a binding
  p.hotkeys[slot] = code;
  renderHotbar();
  logMsg(`Action slot ${slot + 1} is now bound to ${hotkeyLabel(code)}${other >= 0 && other !== slot ? ' (keys swapped)' : ''}.`, 'good');
  AUDIO.playSfx('menu');
  return true;
}
function resetHotkeys() {
  if (!G.player) return;
  G.player.hotkeys = normaliseHotkeys(DEFAULT_HOTKEYS);
  pendingHotkeySlot = null;
  renderHotbar(); refreshPanel('hotkeys');
  toast('Action keys reset to 1–9.', 'sys');
}

// derived stat = class base+growth + spent points + accumulated tier bonuses
function tierBonusFor(p) {
  const tiers = PROGRESSION.tiers[p.classId] || [];
  const acc = {};
  for (let i = 1; i <= p.tierIndex; i++)
    for (const [k, v] of Object.entries(tiers[i]?.bonus || {})) acc[k] = (acc[k] || 0) + v;
  return acc;
}
function statBlock(p) {
  const c = p._cls, g = c.statGrowthPerLevel, lv = p.level - 1, tb = tierBonusFor(p);
  const rb = (p.rebirths || 0) * TUNING.rebirthStatBonus;   // NG+: permanent all-stat bonus
  const st = {};
  for (const k of ['str','agi','vit','int','dex','luk'])
    st[k] = Math.floor(c.baseStats[k] + g[k] * lv) + (p.alloc?.[k] || 0) + (tb[k] || 0) + rb;
  return st;
}

// ---- skill tree / progression helpers ----
const skillLevel = (p, id) => p.skillLevels[id] || 0;
const skillRankScale = lvl => 1
  + PROGRESSION.skillScale * Math.min(Math.max(lvl - 1, 0), 4)
  + PROGRESSION.masteryScale * Math.max(lvl - 5, 0);
const skillPower = (p, sk) => sk.power * skillRankScale(skillLevel(p, sk.id));
const skillCapForTier = (node, tierIndex) => node?.tierCaps
  ? node.tierCaps[Math.min(Math.max(tierIndex, 0), node.tierCaps.length - 1)]
  : node?.maxLevel || 0;
function skillRankGate(p, id) {
  const node = PROGRESSION.skillTree[id];
  if (!node) return null;
  const nextRank = skillLevel(p, id) + 1;
  let reqTier = node.reqTier || 0;
  if (node.tierCaps) {
    const masteryTier = node.tierCaps.findIndex(cap => cap >= nextRank);
    if (masteryTier >= 0) reqTier = Math.max(reqTier, masteryTier);
  }
  return { nextRank, reqTier, reqLevel: node.rankReqLevels?.[nextRank] || node.reqLevel || 1 };
}
function canLearn(p, id) {
  const node = PROGRESSION.skillTree[id]; if (!node) return false;
  if (skillLevel(p, id) >= node.maxLevel) return false;
  const gate = skillRankGate(p, id);
  if (p.skillPoints < 1 || (p.jobLevel || p.level) < gate.reqLevel) return false;
  if (p.tierIndex < gate.reqTier) return false;
  if (node.reqSkill && skillLevel(p, node.reqSkill.id) < node.reqSkill.lvl) return false;
  return true;
}
function learnSkill(id) {
  const p = G.player; if (!canLearn(p, id)) return;
  p.skillLevels[id] = skillLevel(p, id) + 1;
  p.skillPoints--;
  // a freshly learned skill hops onto the first free hotbar slot automatically
  if (p.skillLevels[id] === 1 && !p.hotbar.some(s => s && s.type === 'skill' && s.id === id)) {
    const free = p.hotbar.findIndex(s => !s);
    if (free >= 0) {
      p.hotbar[free] = { type: 'skill', id };
      renderHotbar();
      const skName = COMBAT.skills.find(s => s.id === id).name;
      logMsg(currentLang === 'th' ? `${T(skName, 'skills')} → ปุ่มลัด ${hotkeyLabel(p.hotkeys[free])}` : `${skName} → hotkey ${hotkeyLabel(p.hotkeys[free])}.`, 'sys');
    }
  }
  AUDIO.playSfx('levelup');
  const skName = COMBAT.skills.find(s => s.id === id).name;
  logMsg(currentLang === 'th' ? `เรียนรู้ความสามารถ ${T(skName, 'skills')} เลเวล ${p.skillLevels[id]}` : `Learned ${skName} Lv ${p.skillLevels[id]}.`, 'good');
}
// ---- passive skills ----
const passivesFor = cc => Object.entries(PROGRESSION.passives || {}).filter(([, v]) => v.classId === cc).map(([id, v]) => ({ id, ...v }));
function passiveBonuses(p) {
  const acc = { hpPct: 0, mpPct: 0, atkPct: 0, defPct: 0, critPct: 0, fleeFlat: 0 };
  for (const pa of passivesFor(p.combatClass)) { const lv = p.skillLevels[pa.id] || 0; if (lv) acc[pa.stat] += pa.per * lv; }
  return acc;
}
function canLearnPassive(p, id) {
  const pa = PROGRESSION.passives[id]; if (!pa) return false;
  return (p.skillLevels[id] || 0) < pa.maxLevel && p.skillPoints >= 1
    && (p.jobLevel || p.level) >= pa.reqLevel && p.tierIndex >= (pa.reqTier || 0);
}
function learnPassive(id) {
  const p = G.player; if (!canLearnPassive(p, id)) return;
  p.skillLevels[id] = (p.skillLevels[id] || 0) + 1; p.skillPoints--;
  recompute(p); AUDIO.playSfx('levelup');
  const paName = PROGRESSION.passives[id].name;
  logMsg(currentLang === 'th' ? `เรียนรู้ความสามารถติดตัว ${T(paName, 'passives')} → เลเวล ${p.skillLevels[id]}` : `Passive ${paName} → Lv ${p.skillLevels[id]}.`, 'good');
}
function skillPointEntitlement(p) {
  return PROGRESSION.startSkillPoints
    + Math.max(0, Math.min(p.jobLevel || 1, PROGRESSION.jobLevelCap) - 1) * PROGRESSION.skillPointsPerLevel
    + Math.max(0, p.tierIndex || 0) * 2;
}
const statPointEntitlement = p => PROGRESSION.startStatPoints
  + Math.max(0, Math.min(p.level || 1, DESIGN.levelCap) - 1) * PROGRESSION.statPointsPerLevel;
function skillPointsSpent(p) {
  let spent = 0;
  for (const [id, raw] of Object.entries(p.skillLevels || {})) {
    const max = PROGRESSION.skillTree[id]?.maxLevel || PROGRESSION.passives[id]?.maxLevel || 0;
    spent += Math.min(Math.max(Math.floor(Number(raw) || 0), 0), max);
  }
  const starter = skillsFor(p.combatClass).find(s => PROGRESSION.skillTree[s.id]?.reqSkill == null);
  if (starter && skillLevel(p, starter.id) > 0) spent--; // the starting rank is granted free
  return Math.max(0, spent);
}
function normalisePlayerProgression(p) {
  p.jobLevel = Math.min(Math.max(Math.floor(Number(p.jobLevel) || 1), 1), PROGRESSION.jobLevelCap);
  p.jobXp = p.jobLevel >= PROGRESSION.jobLevelCap ? 0 : Math.max(0, Number(p.jobXp) || 0);
  p.skillLevels = p.skillLevels && typeof p.skillLevels === 'object' ? p.skillLevels : {};
  for (const [id, raw] of Object.entries(p.skillLevels)) {
    const max = PROGRESSION.skillTree[id]?.maxLevel || PROGRESSION.passives[id]?.maxLevel;
    if (!max) delete p.skillLevels[id];
    else p.skillLevels[id] = Math.min(Math.max(Math.floor(Number(raw) || 0), 0), max);
  }
  const unspentBudget = Math.max(0, skillPointEntitlement(p) - skillPointsSpent(p));
  p.skillPoints = Math.min(Math.max(Math.floor(Number(p.skillPoints) || 0), 0), unspentBudget);
  return p;
}
// RO-style escalating cost: the higher the stat already is, the more points one +1 costs
const statCost = (p, stat) => 1 + Math.floor((p.stats?.[stat] ?? statBlock(p)[stat]) / TUNING.statCostEvery);
function spendStat(stat) {
  const p = G.player, cost = statCost(p, stat);
  if (p.statPoints < cost) return;
  p.alloc[stat] = (p.alloc[stat] || 0) + 1;
  p.statPoints -= cost;
  recompute(p);
  AUDIO.playSfx('menu');
}
function resetStatPoints(p = G.player) {
  if (!p || !Object.values(p.alloc || {}).some(value => value > 0)) return false;
  p.alloc = { str: 0, agi: 0, vit: 0, int: 0, dex: 0, luk: 0 };
  p.statPoints = statPointEntitlement(p);
  recompute(p, false);
  updateHud();
  return true;
}
function resetSkillPoints(p = G.player) {
  if (!p || skillPointsSpent(p) <= 0) return false;
  const starter = skillsFor(p.combatClass).find(s => PROGRESSION.skillTree[s.id]?.reqSkill == null);
  p.skillLevels = starter ? { [starter.id]: 1 } : {};
  p.skillPoints = skillPointEntitlement(p);
  p.skillCd = {};
  p.momentum = 0;
  p.hotbar = (p.hotbar || new Array(9).fill(null)).map(slot => slot?.type === 'skill' && slot.id !== starter?.id ? null : slot);
  if (starter && !p.hotbar.some(slot => slot?.type === 'skill' && slot.id === starter.id)) {
    const free = p.hotbar.findIndex(slot => !slot);
    p.hotbar[free >= 0 ? free : 0] = { type: 'skill', id: starter.id };
  }
  recompute(p, false);
  renderHotbar();
  updateHud();
  return true;
}
// When the hero hits a tier's level requirement, offer that tier's advancement quest
// (promotion is earned by completing it, not automatic).
function maybeStartAdvance(p) {
  const tiers = PROGRESSION.tiers[p.classId] || [];
  const next = tiers[p.tierIndex + 1];
  if (next?.advance && !G.advance && p.level >= next.reqLevel) startAdvanceQuest(p.tierIndex + 1);
}
function startAdvanceQuest(ti) {
  const q = PROGRESSION.tiers[G.player.classId][ti].advance;
  G.advance = { ti, def: q, progress: 0 };
  AUDIO.playSfx('levelup');
  toast(`✦ Job Change available: ${q.name}!`, 'good');
  logMsg(`✦ Class advancement quest started: ${q.name} — ${q.desc}`, 'good');
  updateQuestTracker();
}
function advanceProgress() {
  if (!G.advance) return 0;
  const o = G.advance.def.objective;
  return o.type === 'collect' ? Math.min(itemQty(o.target), o.count) : Math.min(G.advance.progress, o.count);
}
function checkAdvance() {
  if (!G.advance) return;
  updateQuestTracker();
  if (advanceProgress() >= G.advance.def.objective.count) doPromote(G.player, G.advance.ti);
}
function doPromote(p, ti) {
  const tiers = PROGRESSION.tiers[p.classId] || [];
  p.tierIndex = ti;
  p.className = tiers[ti].name;
  p.skillPoints += 2;                              // advancement grants points for the new tree
  recompute(p, true);
  if (G.taskGuide?.source === 'advance') finishTaskGuide();
  G.advance = null;
  AUDIO.playSfx('levelup');
  const mastery = ti === 1 ? ' First-job signature skills can now grow beyond Lv5.' : '';
  toast(`✦ CLASS ADVANCEMENT — you are now a ${p.className}! New skills unlocked.${mastery}`, 'good');
  logMsg(`✦ Advanced to ${p.className}! Open Skills (K) — a new tier of the tree is available.${mastery}`, 'good');
  if ($('#hud-name')) $('#hud-name').textContent = p.name + ' the ' + p.className;
  updateQuestTracker();
}

function equippedItem(p, slot) { return p.equip[slot] ? itemById[p.equip[slot].itemId] : null; }

function buffMult(p, stat) {
  let m = 1;
  for (const b of p.buffs) if (b.stat === stat && b.until > now()) m *= b.mult;
  return m;
}

function recompute(p, fill) {
  const st = statBlock(p);
  p.stats = st;
  const weaponAtk = effAtk(p.equip.weapon) + effAtk(p.equip.accessory);   // rarity-scaled
  const armorDef = ['head', 'body', 'hands', 'cloak', 'feet', 'accessory'].reduce((s, k) => s + effDef(p.equip[k]), 0);
  const base = { ...st, level: p.level, baseHp: 100, weaponAtk, armorDef, isCrit: false };
  p.maxHp = F.maxHp(base);
  p.maxMp = F.maxMp(base);
  // NG+: each rebirth deepens the vessel permanently
  const rbMult = 1 + (p.rebirths || 0) * TUNING.rebirthHpMpPct;
  p.maxHp = Math.round(p.maxHp * rbMult);
  p.maxMp = Math.round(p.maxMp * rbMult);
  p.physAtk = F.physAtk(base);
  p.rangedAtk = F.rangedAtk(base);
  p.magicAtk = F.magicAtk(base);
  p.physDef = F.physDef(base);
  p.hit = F.hit(base);
  p.flee = F.flee(base);
  p.critChance = F.critChance(base);
  // ---- apply equipment affixes (bonus effects from rarity) ----
  const af = equippedAffixes(p);
  p.maxHp += af.hpFlat; p.maxMp += af.mpFlat;
  p.physAtk = Math.round(p.physAtk * (1 + af.atkPct / 100));
  p.rangedAtk = Math.round(p.rangedAtk * (1 + af.atkPct / 100));
  p.magicAtk = Math.round(p.magicAtk * (1 + af.atkPct / 100));
  p.physDef = Math.round(p.physDef * (1 + af.defPct / 100));
  p.hit += af.hitFlat; p.flee += af.fleeFlat;
  p.critChance = Math.min(100, p.critChance + af.critPct);
  p.lifesteal = af.lifesteal || 0;
  // ---- passive skills: permanent % bonuses ----
  const ps = passiveBonuses(p);
  p.maxHp = Math.round(p.maxHp * (1 + ps.hpPct / 100));
  p.maxMp = Math.round(p.maxMp * (1 + ps.mpPct / 100));
  p.physAtk = Math.round(p.physAtk * (1 + ps.atkPct / 100));
  p.rangedAtk = Math.round(p.rangedAtk * (1 + ps.atkPct / 100));
  p.magicAtk = Math.round(p.magicAtk * (1 + ps.atkPct / 100));
  p.physDef = Math.round(p.physDef * (1 + ps.defPct / 100));
  p.critChance = Math.min(100, p.critChance + ps.critPct);
  p.flee += ps.fleeFlat;
  p.atkStat = MAGIC.has(p.combatClass) ? p.magicAtk : p.combatClass === 'ranger' ? p.rangedAtk : p.physAtk;
  // ---- stat-driven combat feel: AGI = attack + walk speed · INT = reach ----
  p.atkDelay = Math.round(COMBAT.attackSpeedMs * (1 - Math.min(0.45, st.agi * TUNING.agiAtkSpeed)));
  p.moveMult = 1 + Math.min(0.5, st.agi * TUNING.agiMoveSpeed);
  p.rangeBonus = st.int * TUNING.intRange;                       // extra tiles for ranged/magic
  p.basicRange = MELEE.has(p.combatClass) ? 1.5 : 5 + p.rangeBonus;
  if (fill) { p.hp = p.maxHp; p.mp = p.maxMp; }
  p.hp = clamp(p.hp, 0, p.maxHp);
  p.mp = clamp(p.mp, 0, p.maxMp);
}

// Compare the real character sheet before/after a swap. This catches effects
// that raw item ATK/DEF cannot explain (percent affixes, HP/MP, hit, flee,
// crit, lifesteal, and class-specific attack formulas).
const GEAR_METRICS = [
  { key: 'atkStat',    name: 'ATK',       suffix: '' },
  { key: 'physDef',    name: 'DEF',       suffix: '' },
  { key: 'maxHp',      name: 'Max HP',    suffix: '' },
  { key: 'maxMp',      name: 'Max MP',    suffix: '' },
  { key: 'hit',        name: 'Hit',       suffix: '' },
  { key: 'flee',       name: 'Flee',      suffix: '' },
  { key: 'critChance', name: 'Crit',      suffix: '%' },
  { key: 'lifesteal',  name: 'Lifesteal', suffix: '%' },
];
function gearStatSnapshot(p, equip = p.equip) {
  const copy = { ...p, equip: { ...equip }, buffs: [...(p.buffs || [])], stats: { ...(p.stats || {}) } };
  recompute(copy, false);
  return Object.fromEntries(GEAR_METRICS.map(metric => [metric.key, Number(copy[metric.key]) || 0]));
}
function compareEquipment(candidate, p = G.player) {
  if (!candidate || !p || !isEquip(candidate.itemId)) return null;
  const item = itemById[candidate.itemId], slot = itemSlot(item), current = p.equip[slot] || null;
  const before = gearStatSnapshot(p), after = gearStatSnapshot(p, { ...p.equip, [slot]: candidate });
  const metrics = GEAR_METRICS.map(metric => ({ ...metric, before: before[metric.key], after: after[metric.key], delta: after[metric.key] - before[metric.key] }))
    .filter(metric => metric.delta !== 0);
  const oldAffixes = affixTotals(current), newAffixes = affixTotals(candidate), priorities = gearPriorities(p);
  const affixes = [...new Set([...Object.keys(newAffixes), ...Object.keys(oldAffixes)])]
    .map(stat => {
      const beforeValue = oldAffixes[stat] || 0, afterValue = newAffixes[stat] || 0, delta = afterValue - beforeValue;
      const kind = beforeValue === 0 ? 'new' : afterValue === 0 ? 'removed' : delta > 0 ? 'improved' : 'reduced';
      return { stat, before: beforeValue, after: afterValue, delta, kind, recommended: priorities.slice(0, 3).includes(stat), useful: priorities.includes(stat) };
    }).filter(change => change.delta !== 0);
  const gains = metrics.filter(metric => metric.delta > 0), losses = metrics.filter(metric => metric.delta < 0);
  const coreLoss = affixes.some(change => change.recommended && change.delta < 0);
  const primaryKeys = [item.atk ? 'atkStat' : null, item.def ? 'physDef' : null].filter(Boolean);
  const primaryGain = metrics.some(metric => primaryKeys.includes(metric.key) && metric.delta > 0);
  let verdict = 'same';
  if (!current) verdict = 'empty';
  else if (gains.length && !losses.length) verdict = 'upgrade';
  else if (primaryGain && !coreLoss) verdict = 'upgrade';
  else if (gains.length && losses.length) verdict = 'tradeoff';
  else if (!gains.length && losses.length) verdict = 'keep';
  return { candidate, current, item, slot, metrics, affixes, priorities, verdict };
}
const gearVerdictText = verdict => ({
  empty: currentLang === 'th' ? 'แนะนำ · ช่องว่าง' : 'Suggested · fills empty slot',
  upgrade: currentLang === 'th' ? 'แนะนำให้อัปเกรด' : 'Suggested upgrade',
  tradeoff: currentLang === 'th' ? 'มีข้อแลกเปลี่ยน · ตรวจสอบโบนัส' : 'Trade-off · check bonuses',
  keep: currentLang === 'th' ? 'แนะนำให้ใช้ของเดิม' : 'Keep equipped item',
  same: currentLang === 'th' ? 'ผลรวมเท่ากัน' : 'No sheet change',
}[verdict] || verdict);
const gearVerdictIcon = verdict => ({ empty: '＋', upgrade: '▲', tradeoff: '◆', keep: '▼', same: '=' }[verdict] || '=');
function itemMainStatsHtml(inst) {
  const it = itemById[inst.itemId], out = [];
  if (it.atk) out.push(`${T('ATK', 'ui')} <b>${effAtk(inst)}</b>`);
  if (it.def) out.push(`${T('DEF', 'ui')} <b>${effDef(inst)}</b>`);
  return out.join(' · ') || `<span style="color:var(--text-muted)">${T('no base stat', 'ui')}</span>`;
}
function itemAffixesHtml(inst, p = G.player) {
  const priorities = gearPriorities(p);
  if (!itemAffixes(inst).length) return `<span class="gear-bonus gear-bonus--muted">${T('No substats', 'ui')}</span>`;
  return itemAffixes(inst).map(a => {
    const core = priorities.slice(0, 3).includes(a.stat), useful = priorities.includes(a.stat);
    return `<span class="gear-bonus${core ? ' gear-bonus--core' : useful ? ' gear-bonus--useful' : ''}">${core ? '★ ' : useful ? '• ' : ''}${esc(affixValueText(a.stat, a.value))}${core ? ` <i>${T('recommended', 'ui')}</i>` : ''}</span>`;
  }).join('');
}
function gearComparisonHtml(inst, p = G.player) {
  const comparison = compareEquipment(inst, p);
  if (!comparison) return '';
  const metricRows = comparison.metrics.map(metric => `<span class="gear-delta ${metric.delta > 0 ? 'gain' : 'loss'}">${metric.delta > 0 ? '▲ +' : '▼ '}${metric.delta}${metric.suffix} ${T(metric.name, 'ui')}</span>`).join('');
  const affixRows = comparison.affixes.map(change => {
    const ui = GEAR_AFFIX_UI[change.stat] || { name: change.stat, suffix: '' };
    const flag = change.recommended ? ` <i>★ ${T('recommended', 'ui')}</i>` : change.useful ? ` <i>• ${T('useful', 'ui')}</i>` : '';
    let text;
    if (change.kind === 'new') text = `${T('NEW BONUS', 'ui')} · ${affixValueText(change.stat, change.after)}`;
    else if (change.kind === 'removed') text = `${T('REMOVED', 'ui')} · ${affixValueText(change.stat, change.before)}`;
    else text = `${change.kind === 'improved' ? T('IMPROVED', 'ui') : T('REDUCED', 'ui')} · ${T(ui.name, 'ui')} ${change.before}${ui.suffix} → ${change.after}${ui.suffix} (${change.delta > 0 ? '+' : ''}${change.delta}${ui.suffix})`;
    return `<span class="gear-affix-change ${change.delta > 0 ? 'gain' : 'loss'}">${text}${flag}</span>`;
  }).join('');
  const current = comparison.current
    ? `${T('vs equipped', 'ui')} <b>${esc(instName(comparison.current))}</b>`
    : T('Nothing equipped in this slot.', 'ui');
  return `<div class="gear-compare gear-compare--${comparison.verdict}">
    <div class="gear-compare__head"><b>${gearVerdictIcon(comparison.verdict)} ${gearVerdictText(comparison.verdict)}</b><small>${current}</small></div>
    ${metricRows ? `<div class="gear-deltas">${metricRows}</div>` : ''}
    ${affixRows ? `<div class="gear-affix-changes">${affixRows}</div>` : `<div class="gear-affix-changes"><span class="gear-affix-change neutral">${T('No substat changes.', 'ui')}</span></div>`}
  </div>`;
}
function gearBuildAdviceHtml(p) {
  const priorities = gearPriorities(p);
  return `<div class="gear-advice"><b>★ ${T('Suggested substats for', 'ui')} ${T(p.className, 'classes')}</b><span>${priorities.map((stat, i) => `<em class="${i < 3 ? 'core' : ''}">${i < 3 ? '★ ' : '• '}${T(GEAR_AFFIX_UI[stat].name, 'ui')}</em>`).join('')}</span><small>${T('Stars are core priorities; the dot is a useful secondary. Trade-offs are shown instead of hidden behind one gear score.', 'ui')}</small></div>`;
}
function equippedGearSummaryHtml(p) {
  const totals = equippedAffixes(p);
  const active = Object.entries(totals).filter(([, value]) => value > 0)
    .map(([stat, value]) => `<span class="gear-bonus">${affixValueText(stat, value)}</span>`).join('');
  const weaponAtk = effAtk(p.equip.weapon) + effAtk(p.equip.accessory);
  const armorDef = ['head', 'body', 'hands', 'cloak', 'feet', 'accessory'].reduce((sum, slot) => sum + effDef(p.equip[slot]), 0);
  return `<div class="gear-summary"><b>${T('Equipment contribution', 'ui')}</b><div>${T('Base gear', 'ui')}: +${weaponAtk} ${T('weapon ATK', 'ui')} · +${armorDef} ${T('armor DEF', 'ui')}</div><div class="gear-bonuses">${active || `<span class="gear-bonus gear-bonus--muted">${T('No active substats', 'ui')}</span>`}</div></div>`;
}

function addStack(itemId, qty = 1) {
  const inv = G.player.inventory;
  const slot = inv.find(s => s.itemId === itemId && !s.uid);
  if (slot) slot.qty += qty; else inv.push({ itemId, qty });
}
// weapons/armor become rarity-rolled instances (not stackable); everything else stacks
function addItem(itemId, qty = 1, bias = 0) {
  if (isEquip(itemId)) { const inst = rollItem(itemId, bias); G.player.inventory.push(inst); return inst; }
  addStack(itemId, qty);
}
function itemQty(itemId) { return G.player.inventory.find(s => s.itemId === itemId && !s.uid)?.qty || 0; }
function removeItem(itemId, qty = 1) {
  const inv = G.player.inventory, slot = inv.find(s => s.itemId === itemId && !s.uid);
  if (!slot) return;
  slot.qty -= qty;
  if (slot.qty <= 0) inv.splice(inv.indexOf(slot), 1);
}

// Every XP source feeds BOTH tracks. Base levels continue to 80; the finite Job
// track stops at 50 so no character can simply buy every branch of the tree.
function gainXp(amount) {
  const p = G.player;
  // ---- base level (stat points, capped) ----
  if (p.level < DESIGN.levelCap) {
    p.xp += amount;
    while (p.level < DESIGN.levelCap && p.xp >= xpForNext(p.level)) {
      p.xp -= xpForNext(p.level);
      p.level++;
      p.statPoints += PROGRESSION.statPointsPerLevel;
      recompute(p, true);
      AUDIO.playSfx('levelup');
      toast(T('Level up! Lv {level} — +{points} stat points.', 'ui')
        .replace('{level}', p.level).replace('{points}', PROGRESSION.statPointsPerLevel), 'good');
      maybeStartAdvance(p);
    }
    if (p.level >= DESIGN.levelCap) p.xp = 0;
  }
  // ---- job level (skill points, capped at 50) ----
  if (p.jobLevel < PROGRESSION.jobLevelCap) {
    p.jobXp += amount;
    while (p.jobLevel < PROGRESSION.jobLevelCap && p.jobXp >= jobXpForNext(p.jobLevel)) {
      p.jobXp -= jobXpForNext(p.jobLevel);
      p.jobLevel++;
      p.skillPoints += PROGRESSION.skillPointsPerLevel;
      AUDIO.playSfx('levelup');
      toast(T('Job level up! Job Lv {level}/{cap} — +{points} skill point.', 'ui')
        .replace('{level}', p.jobLevel).replace('{cap}', PROGRESSION.jobLevelCap)
        .replace('{points}', PROGRESSION.skillPointsPerLevel), 'good');
    }
    if (p.jobLevel >= PROGRESSION.jobLevelCap) p.jobXp = 0;
  }
  // A held story chapter opens the moment its Base Level requirement is met.
  maybeStartPendingQuest();
}

// =====================================================================
// MAP LOADING
// =====================================================================
function tileChar(col, row) {
  if (row < 0 || col < 0 || row >= G.map.height || col >= G.map.width) return '#';
  const rowStr = G.tiles[row];
  return (col < rowStr.length) ? rowStr[col] : '#';
}
function walkableAt(px, py) {
  const col = Math.floor(px / TS), row = Math.floor(py / TS);
  const info = G.legend[tileChar(col, row)];
  return info ? info.walkable : false;
}
function randomWalkableTile(predicate, allowFallback = true) {
  const connected = G.spawnTiles?.length
    ? G.spawnTiles
    : connectedWalkableTiles(G.map, G.map.playerStart?.x ?? 1, G.map.playerStart?.y ?? 1);
  const eligible = predicate ? connected.filter(predicate) : connected;
  const pool = eligible.length ? eligible : allowFallback ? connected : [];
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
}
function spawnTileFor(spawn, nurseryOnly = false, used = new Set()) {
  const [minDepth, maxDepth] = spawn.depth || [0, 1];
  const nurseryMax = Math.min(maxDepth, TUNING.heatNursery);
  const inHabitat = tile => {
    const depth = heatDepthAt(G.heatField, tile.col, tile.row);
    return depth != null && depth >= minDepth && depth <= (nurseryOnly ? nurseryMax : maxDepth);
  };
  return randomWalkableTile(tile => inHabitat(tile) && !used.has(`${tile.col},${tile.row}`), false)
    || randomWalkableTile(inHabitat, false);
}
function findChar(ch) {
  for (let row = 0; row < G.map.height; row++) {
    const i = G.tiles[row].indexOf(ch);
    if (i >= 0) return { col: i, row };
  }
  return null;
}

// ---- A* grid pathfinding (routes around trees/walls/water) ----
const walkTile = (c, r) => { const info = G.legend[tileChar(c, r)]; return info ? info.walkable : false; };
function nearestWalkable(gc, gr) {
  if (walkTile(gc, gr)) return { c: gc, r: gr };
  for (let rad = 1; rad <= 6; rad++)
    for (let dc = -rad; dc <= rad; dc++) for (let dr = -rad; dr <= rad; dr++) {
      if (Math.max(Math.abs(dc), Math.abs(dr)) !== rad) continue;
      if (walkTile(gc + dc, gr + dr)) return { c: gc + dc, r: gr + dr };
    }
  return null;
}
const DIRS8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
function findPath(sc, sr, gc, gr) {
  if (sc === gc && sr === gr) return [{ c: sc, r: sr }];
  const key = (c, r) => c + ',' + r, heur = (c, r) => Math.hypot(c - gc, r - gr);
  const open = [{ c: sc, r: sr, g: 0, f: heur(sc, sr) }], came = {}, gsc = { [key(sc, sr)]: 0 };
  let iter = 0;
  while (open.length && iter++ < 3000) {
    let bi = 0; for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i;
    const cur = open.splice(bi, 1)[0];
    if (cur.c === gc && cur.r === gr) {
      const path = []; let k = key(gc, gr);
      while (k !== undefined) { const [c, r] = k.split(',').map(Number); path.unshift({ c, r }); k = came[k]; }
      return path;
    }
    for (const [dc, dr] of DIRS8) {
      const nc = cur.c + dc, nr = cur.r + dr;
      if (!walkTile(nc, nr)) continue;
      if (dc && dr && (!walkTile(cur.c + dc, cur.r) || !walkTile(cur.c, cur.r + dr))) continue; // no corner-cut
      const ng = cur.g + (dc && dr ? 1.414 : 1), nk = key(nc, nr);
      if (gsc[nk] === undefined || ng < gsc[nk]) { gsc[nk] = ng; came[nk] = key(cur.c, cur.r); open.push({ c: nc, r: nr, g: ng, f: ng + heur(nc, nr) }); }
    }
  }
  return null;
}
// build a pixel-waypoint path from the player to a world point (routed around obstacles)
function pathTo(wx, wy) {
  const p = G.player;
  let gc = Math.floor(wx / TS), gr = Math.floor(wy / TS);
  const near = nearestWalkable(gc, gr); if (!near) { G.path = null; return false; }
  const path = findPath(Math.floor(p.x / TS), Math.floor(p.y / TS), near.c, near.r);
  G.path = (path && path.length > 1) ? path.slice(1).map(t => ({ x: t.c * TS + TS / 2, y: t.r * TS + TS / 2 })) : null;
  return Boolean(path);
}
// move an entity toward a pixel path; returns false when the path is done/blocked
function followPath(e, path, speed, rad) {
  if (!path || !path.length) return false;
  const wp = path[0], d = dist(e.x, e.y, wp.x, wp.y);
  if (d < 6) { path.shift(); return path.length > 0; }
  const bx = e.x, by = e.y;
  faceToward(e, wp.x, wp.y);
  moveEntity(e, ((wp.x - e.x) / d) * speed, ((wp.y - e.y) / d) * speed, rad);
  if (Math.abs(e.x - bx) < 0.02 && Math.abs(e.y - by) < 0.02) return false; // stuck → drop path
  return true;
}

function loadMap(mapId, spawnX, spawnY) {
  const map = MAPS[mapId];
  G.map = map; G.mapId = mapId; G.tiles = map.tiles; G.legend = map.legend;
  G.heatField = buildHeatField(map);
  G.target = null; G.targetSource = null; G.path = null; G.manualIntent = null; G.effects = [];   // don't carry paths/spell zones across maps
  if (G.player) G.player.sanctuary = null;

  // NPCs: map gives position/identity, content gives behavior
  // per-NPC dialogue when CONTENT defines this npc id; otherwise the role's generic voice
  G.npcs = map.npcs.map(n => ({ ...n, content: npcById[n.id] || npcById[NPC_BY_ROLE[n.role]] }));

  // portals
  G.portals = map.portals.map(p => ({ ...p }));

  // Establish the player's connected region before populating the map. This
  // excludes walkable-looking islands enclosed by trees, water, or walls.
  const start = (spawnX != null) ? { x: spawnX, y: spawnY }
    : { ...(map.playerStart || { x: 2, y: 2 }) };
  if (!walkTile(start.x, start.y)) { const nw = nearestWalkable(start.x, start.y); if (nw) { start.x = nw.c; start.y = nw.r; } }
  G.player.x = start.x * TS + TS / 2;
  G.player.y = start.y * TS + TS / 2;
  const reserved = new Set([
    ...G.portals.map(portal => `${portal.x},${portal.y}`),
    ...G.npcs.map(npc => `${npc.x},${npc.y}`),
    `${start.x},${start.y}`,
  ]);
  const connected = connectedWalkableTiles(map, start.x, start.y);
  const openSpawnTiles = connected.filter(tile => !reserved.has(`${tile.col},${tile.row}`) && tileChar(tile.col, tile.row) !== 'B');
  G.spawnTiles = openSpawnTiles.length ? openSpawnTiles : connected;

  // Species occupy explicit habitats along the walkable entry→guardian depth field.
  // Instance level then rises only inside that species' own regional level range.
  G.monsters = [];
  const usedSpawnTiles = new Set();
  const weakestId = map.spawns.filter(spawn => monById[spawn.monsterId].sizeTiles < 2)
    .sort((a, b) => a.levelRange[0] - b.levelRange[0])[0]?.monsterId;
  for (const sp of map.spawns) {
    const def = monById[sp.monsterId];
    const nurseryCount = (map.band && sp.monsterId === weakestId) ? Math.ceil(sp.count * 0.4) : 0;
    for (let i = 0; i < sp.count; i++) {
      let col, row;
      if (def.sizeTiles >= 2) {                 // boss → the 'B' marker tile
        const b = findChar('B') || randomWalkableTile();
        if (!b) continue;
        col = b.col; row = b.row;
      } else {
        const t = spawnTileFor(sp, i < nurseryCount, usedSpawnTiles);
        if (!t) continue;
        col = t.col; row = t.row;
        usedSpawnTiles.add(`${col},${row}`);
      }
      const lvl = def.sizeTiles >= 2 ? def.level : heatLevel(map, col, row, sp, G.heatField);
      G.monsters.push(makeMonster(def, col * TS + TS / 2, row * TS + TS / 2, lvl ?? undefined, sp));
    }
  }

  if (G.rareBossMapId === mapId) placeRareBoss();   // the roaming rare prowls here until slain

  if (!G.guildBoard || !G.guildBoard.length) refreshGuildBoard();
  AUDIO.playMusic(MAP_MUSIC[mapId] || 'whispering_woods');
  const firstVisit = !G.visited.has(mapId);
  logMsg(T(map.ambient, 'maps'), 'sys');
  showZoneBanner(map, firstVisit);
  updateMinimap();
  G.visited.add(mapId); checkQuest();   // explore objectives (guild regions unlock via guardian kills)
  if (firstVisit) logMsg(currentLang === 'th' ? `✦ อัปเดตพงศาวดารแล้ว — ${T(map.chronicle.epithet, 'maps')}` : `✦ Chronicle updated — ${map.chronicle.epithet}.`, 'good');
  refreshPanel('world');
  if (G.taskGuide) setTimeout(continueTaskGuide, 0);
  saveGame();   // persist on every zone change (no-op until the run is live)
}

// A spawned monster rolls its own level around the definition's base (bosses are
// fixed). hp/atk/def/exp scale with the rolled level so a Lv8 wolf really is tougher
// than a Lv6 one. Instance combat stats live on the monster (m.atk/m.dv/m.exp/m.lvl),
// never on m.def (which is the shared, read-only definition).
function rollMonsterLevel(def) {
  if (def.sizeTiles >= 2) return def.level;                 // bosses: fixed
  return def.level + rndInt(0, TUNING.monsterLevelSpread);
}
// level → concrete combat stats for a definition (shared by spawn and respawn)
function monsterStatsFor(def, lvl) {
  const scale = 1 + (lvl - def.level) * TUNING.monsterStatPerLevel;
  // Normal monsters gain an absolute-level durability curve in addition to the
  // rolled-level delta. HP/DEF never fall below the species' authored baseline:
  // a low-rolled wolf may hit less hard, but it does not become a paper wolf.
  // Guardians stay on their already-long dedicated boss multiplier.
  const normal = def.sizeTiles < 2;
  const durabilityScale = Math.max(1, scale);
  const durabilityLevel = Math.max(lvl, def.level);
  const levelRoot = Math.sqrt(Math.max(0, durabilityLevel - 1));
  const levelHpMult = normal ? 1 + levelRoot * TUNING.monsterHpLevelGrowth : 1;
  const levelDefMult = normal ? 1 + levelRoot * TUNING.monsterDefLevelGrowth : 1;

  // NG+ separates damage, armor, and health. Retained physical/ranged gear is
  // converted into extra early-run HP pressure, then fades to zero at the cap;
  // magic classes do not pay for weapon ATK that their damage formula cannot use.
  const rb = G.player?.rebirths || 0;
  const levelProgress = clamp((lvl - 1) / Math.max(1, DESIGN.levelCap - 1), 0, 1);
  const retainedAtk = rb && G.player && !MAGIC.has(G.player.combatClass)
    ? effAtk(G.player.equip?.weapon) + effAtk(G.player.equip?.accessory) : 0;
  const retainedGearHp = rb
    ? Math.min(TUNING.rebirthGearHpCap, retainedAtk * TUNING.rebirthGearHpPerAtk) * (1 - levelProgress)
    : 0;
  const rbAtkMult = 1 + rb * TUNING.rebirthMonsterAtkMult;
  const rbDefMult = 1 + rb * TUNING.rebirthMonsterDefMult;
  const rbHpMult = 1 + rb * TUNING.rebirthMonsterHpMult + retainedGearHp;
  const atk = Math.round(def.atk * scale * TUNING.monsterAtkMult * rbAtkMult);
  const bossMult = def.sizeTiles >= 2 ? TUNING.bossHpMult : 1;
  return { lvl, atk, atkBase: atk, dv: Math.round(def.def * durabilityScale * levelDefMult * rbDefMult),
    exp: Math.round(def.exp * scale * TUNING.monsterExpMult * (1 + rb * TUNING.rebirthMonsterExp)),
    hp: Math.round(def.hp * durabilityScale * TUNING.monsterHpMult * levelHpMult * bossMult * rbHpMult),
    flee: 30 + lvl * 1.5, hit: 85 + lvl * 2.5 };
}
// HEAT MAP: shortest walkable-path depth selects the habitat; level interpolation
// happens inside that species' range so entry Slimes can never become deep-map
// enemies and deep Thornback Boars can never roll down to Lv1.
function heatLevel(map, col, row, spawn, field = G.map === map ? G.heatField : buildHeatField(map)) {
  if (!map.band) return null;
  const depth = heatDepthAt(field, col, row);
  if (depth == null) return null;
  const [minDepth, maxDepth] = spawn?.depth || [0, 1];
  const [lo, hi] = spawn?.levelRange || map.band;
  const progress = clamp((depth - minDepth) / Math.max(0.001, maxDepth - minDepth), 0, 1);
  return clamp(Math.round(lo + progress * (hi - lo)) + rndInt(0, TUNING.monsterLevelSpread), lo, hi);
}
function makeMonster(def, x, y, levelOverride, spawnSpec = null) {
  const lvl = levelOverride != null ? levelOverride : rollMonsterLevel(def);
  const st = monsterStatsFor(def, lvl);
  const { atk, atkBase, dv, exp, hp } = st;
  return {
    def, spawnSpec, x, y, homeX: x, homeY: y,
    lvl, atk, atkBase, dv,
    exp,
    hp, maxHp: hp,
    alive: true, deadUntil: 0,
    atkCdUntil: 0, statuses: {}, phase: 0,
    size: (def.sizeTiles || 1) * TS,
    flee: st.flee, hit: st.hit,
  };
}

// =====================================================================
// COMBAT
// =====================================================================
const R = COMBAT.combatRules;

function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }

const autoHuntLevelCap = p => (p?.level || 1) + TUNING.autoHuntMaxLevelGap;
function autoHuntEligible(m, p = G.player) {
  return Boolean(m?.alive && m.lvl <= autoHuntLevelCap(p));
}

function rollHit(atkHit, defFlee) {
  if (!R.missIfFleeExceedsHit) return true;
  const hitChance = clamp(
    TUNING.hitBaseChance + (atkHit - defFlee) * TUNING.hitStatScale,
    TUNING.hitChanceMin,
    TUNING.hitChanceMax,
  );
  return Math.random() < hitChance;
}
function calcDamage(atk, def) {
  const isCrit = Math.random() * 100 < (arguments[2] || 0);
  const dmg = F.damage({ attackerAtk: atk, defenderDef: def, isCrit });
  return { dmg, isCrit };
}

// while auto-farming: heal when hurt, keep buffs up, and rotate damage skills on the target
function autoFarmActions() {
  const p = G.player;
  // 1) heal at <45% HP — prefer a heal skill, else a restore potion
  if (p.hp < p.maxHp * 0.45) {
    const heal = skillsFor(p.combatClass).find(s => s.type === 'heal' && skillLevel(p, s.id) && now() >= (p.skillCd[s.id] || 0) && p.mp >= s.mpCost);
    if (heal) { castSkillById(heal.id); return; }
    const pot = p.inventory.find(e => !e.uid && itemById[e.itemId].hpRestore && e.qty > 0);
    if (pot) { useItem(pot.itemId); return; }
  }
  const t = G.target;
  if (!t || !t.alive) return;
  const d = dist(p.x, p.y, t.x, t.y);
  // finishers gate on Momentum (not MP), matching castSkillById — else auto-farm wastes ticks on ungated finishers
  const ready = s => skillLevel(p, s.id) && now() >= (p.skillCd[s.id] || 0) && (s.finisher ? p.momentum >= TUNING.momentum.finisherMin : p.mp >= s.mpCost);
  // 2) keep a buff up first, then fire a ready damage skill if the target is in range
  if (!p.buffs.some(b => b.until > now())) {
    const buff = skillsFor(p.combatClass).find(s => s.type === 'buff' && ready(s));
    if (buff) { castSkillById(buff.id); return; }
  }
  for (const s of skillsFor(p.combatClass)) {
    if (s.type === 'buff' || s.type === 'heal' || !ready(s)) continue;
    const reach = (s.type === 'melee' ? s.range : s.range + (p.rangeBonus || 0)) * TS + t.size / 2;
    if (d <= reach) { castSkillById(s.id); return; }   // melee/ranged/aoe damage
  }
}

function playerBasicAttack() {
  const t = G.target, p = G.player;
  if (!t || !t.alive) return;
  if (dist(p.x, p.y, t.x, t.y) > p.basicRange * TS + t.size / 2) return;
  if (now() < p.attackCdUntil) return;
  p.attackCdUntil = now() + (p.atkDelay || COMBAT.attackSpeedMs);   // AGI-scaled swing speed
  p.animAttackUntil = now() + ANIM.attackMs;
  faceToward(p, t.x, t.y);
  AUDIO.playSfx('attack');
  const atk = p.atkStat * buffMult(p, 'atk');
  // visual: melee slash arc, ranged bolt/arrow
  if (MELEE.has(p.combatClass)) spawnSlash(t.x, t.y, '#ffffff', 24);
  else spawnBolt(p.x, p.y, t.x, t.y, MAGIC.has(p.combatClass) ? '#8fe6ff' : '#fff2b0', MAGIC.has(p.combatClass) ? '#fff' : null);
  strike(t, atk, p);
  // melee classes cleave: the swing splashes nearby foes around the target for reduced damage
  if (MELEE.has(p.combatClass)) {
    const CLEAVE = 1.3 * TS;
    for (const m of G.monsters)
      if (m.alive && m !== t && dist(t.x, t.y, m.x, m.y) <= CLEAVE + m.size / 2)
        strike(m, atk * 0.6, p, true);
  }
}

// one hit resolution vs a monster (hit/miss, crit, damage, floaty)
function strike(m, atk, p, silent) {
  if (!rollHit(p.hit, m.flee)) { floatText(m.x, m.y, 'miss', 'miss'); return; }
  const { dmg, isCrit } = calcDamage(atk * combatGapFactor(p.level, m.lvl), monsterDef(m), p.critChance);
  damageMonster(m, dmg, isCrit, silent);
}

const liveStatus = (m, id) => m.statuses[id] && m.statuses[id].until > now() ? m.statuses[id] : null;
const monsterDef = m => Math.max(0, Math.round(m.dv * (liveStatus(m, 'sunder')?.defMult || 1)));

function damageMonster(m, dmg, isCrit, silent) {
  const mark = liveStatus(m, 'mark');
  if (mark) dmg = Math.max(1, Math.round(dmg * (1 + mark.damageTaken)));
  m.hp -= dmg;
  m.lastCombatAt = now();          // keeps a boss "in combat" so it won't leash/regen mid-fight
  if (!silent) AUDIO.playSfx('hit');
  floatText(m.x, m.y, dmg, isCrit ? 'crit' : 'dmg');
  const p = G.player;   // lifesteal affix: heal a fraction of damage dealt
  if (p.lifesteal) { const heal = Math.max(1, Math.round(dmg * p.lifesteal / 100)); p.hp = clamp(p.hp + heal, 0, p.maxHp); }
  if (m.hp <= 0) killMonster(m);
}

// exp is scaled by the level gap: farming mobs far below you is nearly worthless,
// fighting at/above your level pays full-to-bonus. This is the real anti-powerlevel lever.
function expGapFactor(playerLevel, monLevel) {
  const f = 1 - (playerLevel - monLevel) * TUNING.expGapFalloff;
  return clamp(f, TUNING.expGapMin, TUNING.expGapMax);
}
// ...and the mirror for combat: your damage shrinks vs monsters ABOVE your level,
// so an under-leveled boss kill is a real feat, not a potion-tank.
function combatGapFactor(playerLevel, monLevel) {
  return clamp(1 - Math.max(0, monLevel - playerLevel) * TUNING.combatGapFalloff, TUNING.combatGapFloor, 1);
}
// extra monster accuracy per level it is above you — the mirror of the damage penalty,
// so an evasion build can't safely farm mobs far above its level
function gapHit(monLevel, playerLevel) {
  return Math.max(0, monLevel - playerLevel) * TUNING.combatGapHitPerLvl;
}
function killMonster(m) {
  m.alive = false;
  m.deadUntil = now() + R.respawnMs;
  AUDIO.playSfx('monsterDie');
  if (G.target === m) { G.target = null; G.targetSource = null; G.path = null; }
  const p = G.player;
  const xpGain = Math.max(1, Math.round(m.exp * expGapFactor(p.level, m.lvl)));
  gainXp(xpGain);
  G.killCounts[m.def.id] = (G.killCounts[m.def.id] || 0) + 1;
  // zeny drop scaled by monster level (bosses pay a jackpot)
  const zBase = m.lvl * TUNING.zenyPerLevel * (m.def.sizeTiles >= 2 ? 6 : 1);
  const zeny = rndInt(Math.round(zBase * 0.5), Math.round(zBase * 1.5));
  if (zeny > 0) { p.zeny += zeny; }
  // drops (equipment rolls rarity + affixes, biased by monster level & your LUK)
  for (const d of m.def.drops) if (chance(d.chance)) {
    const got = addItem(d.itemId, 1, dropBias(m, p)), it = itemById[d.itemId];
    if (got?.uid && got.rarity !== 'common') { toast(`✦ ${itemRarity(got).name} drop: ${it.name}!`, 'good'); logMsg(`Looted [${itemRarity(got).name}] ${it.name}!`, 'good'); }
    else logMsg(`Looted ${it.name}.`, 'good');
    AUDIO.playSfx('pickup');
  }
  logMsg(`Defeated Lv${m.lvl} ${m.def.name} (+${xpGain} xp, +${zeny}z).`);
  // class-advancement quest progress (kill objective)
  if (G.advance && G.advance.def.objective.type === 'kill' && G.advance.def.objective.target === m.def.id) G.advance.progress++;
  checkQuest();
  checkAdvance();
  guildKill(m.def.id);
  if (m.def.id === 'ruin_golem') { toast('The ruins are cleared — a frozen path opens to the north.', 'good'); }
  if (m.def.id === 'flame_dragon') { toast('☠ The Flame Dragon falls — and behind its throne, the sky TEARS OPEN. The Astral Rift awaits.', 'good'); logMsg('A rift portal has opened at the far edge of the caldera.', 'sys'); }
  if (m.def.id === 'nullking') { toast(T('✦☠ The Nullking is unmade!', 'ui'), 'good'); triggerVictory(); }   // the TRUE finale
  // a slain roaming rare never respawns in place — the world timer re-announces it later
  if (m.def.rare) {
    m.deadUntil = Infinity;
    G.rareBossMapId = null;
    G.nextRareBossAt = now() + TUNING.rareBossEveryMs;
    const msg = T('🏆 {name} slain — a rare trophy claimed!', 'ui').replace('{name}', T(m.def.name, 'monsters'));
    toast(msg, 'good'); logMsg(msg, 'good');
  }
  // conquest unlocks the guild's next hunting ground
  if (m.def.sizeTiles >= 2 && !m.def.rare && !G.guardiansSlain.has(m.def.id)) {
    G.guardiansSlain.add(m.def.id);
    const zi = ZONE_ORDER.findIndex(mid => zoneGuardian(mid) === m.def.id);
    refreshGuildBoard();
    refreshPanel('world');
    if (zi >= 0 && ZONE_ORDER[zi + 1]) toast(`🏰 Guardian slain — the guild now posts bounties for ${MAPS[ZONE_ORDER[zi + 1]].name}!`, 'good');
  }
}

function applyStatus(m, effect, skillLvl = 1) {
  if (!effect) return;
  const def = COMBAT.statusEffects[effect];
  if (!def) return;
  // burn scales with the caster's ATK, so it must obey the same level-gap
  // penalty as every other player damage source — else DOTs bypass the wall
  const tickDamage = effect === 'burn'
    ? Math.max(def.tickDamage, Math.round((G.player?.atkStat || 0) * (def.powerRatio || 0)
        * combatGapFactor(G.player?.level || 1, m.lvl)))
    : def.tickDamage;
  const status = { until: now() + def.durationMs, nextTick: now() + 1000, tickDamage };
  if (def.damageTaken) status.damageTaken = def.damageTaken + (def.perLevel || 0) * (skillLvl - 1);
  if (def.defReduction) status.defMult = 1 - def.defReduction - (def.perLevel || 0) * (skillLvl - 1);
  m.statuses[effect] = status;
}

function castSkill(hotkey) {   // by class hotkey (legacy/UI convenience)
  const sk = skillsFor(G.player.combatClass).find(s => s.hotkey === hotkey);
  if (sk) castSkillById(sk.id);
}
// use whatever is in hotbar slot i (skill or item)
function useHotbarSlot(i) {
  const slot = G.player.hotbar[i]; if (!slot) return;
  const btn = document.querySelector(`#hud .hotbar [data-slot="${i}"]`);
  if (btn) { btn.classList.remove('pressed'); void btn.offsetWidth; btn.classList.add('pressed'); setTimeout(() => btn.classList.remove('pressed'), 140); }
  if (slot.type === 'skill') castSkillById(slot.id);
  else if (slot.type === 'item') { if (itemQty(slot.itemId) > 0) useItem(slot.itemId); else logMsg('None left.', 'sys'); }
}
function gainMomentum(p) {
  const M = TUNING.momentum;
  p.momentum = Math.min(M.max, p.momentum + M.perHit);
  p.lastSkillAt = now();
}

function castSkillById(id) {
  const p = G.player;
  const sk = COMBAT.skills.find(s => s.id === id);
  if (!sk) return;
  if (!skillLevel(p, sk.id)) { logMsg(`${sk.name} not learned — open Skills (K).`, 'sys'); return; }
  if (now() < (p.skillCd[sk.id] || 0)) { logMsg(`${sk.name} on cooldown.`, 'sys'); return; }
  const M = TUNING.momentum;
  if (sk.finisher) {
    if (p.momentum < M.finisherMin) { logMsg(`${sk.name} — not enough Momentum.`, 'bad'); return; }
  } else if (p.mp < sk.mpCost) { logMsg('Not enough MP.', 'bad'); return; }

  const targetsInRange = () => {
    const t = G.target;
    if (sk.type === 'heal' || (sk.type === 'buff' && sk.id !== 'hunters_mark')) return true;
    if (!t || !t.alive) { logMsg('No target.', 'sys'); return false; }
    const reach = ((sk.type === 'melee' && sk.id !== 'savage_leap') ? sk.range : sk.range + (p.rangeBonus || 0)) * TS + t.size / 2;   // INT extends ranged/magic
    if (dist(p.x, p.y, t.x, t.y) > reach) { logMsg('Target out of range.', 'sys'); return false; }
    return true;
  };
  if (!targetsInRange()) return;

  let momentumMult = 1;
  if (sk.finisher) { momentumMult = 1 + M.powerPerPoint * p.momentum; p.momentum = 0; }
  else { p.mp -= sk.mpCost; }
  p.skillCd[sk.id] = now() + sk.cooldownMs;
  p.animCastUntil = now() + ANIM.castMs;
  AUDIO.playSfx('skill');
  const lvl = skillLevel(p, sk.id);
  const atk = p.atkStat * buffMult(p, 'atk') * skillPower(p, sk) * momentumMult;

  if (sk.type === 'heal') {
    if (sk.id === 'sanctuary') {
      const scale = 1 + 0.15 * (lvl - 1);
      const heal = Math.round(p.maxHp * 0.12 * scale);
      p.hp = clamp(p.hp + heal, 0, p.maxHp);
      p.sanctuary = { x: p.x, y: p.y, radius: TS * 2.2, until: now() + 6000, nextTick: now() + 1000,
        heal: Math.round(p.maxHp * 0.055 * scale) };
      spawnAura(p.x, p.y, p.sanctuary.radius, '#7dff9a', 6000);
      spawnCross(p.x, p.y - 6, '#d9ffe0'); floatText(p.x, p.y, '+' + heal, 'heal');
      toast(`${sk.name} — remain in the circle to recover!`, 'good');
      return;
    }
    const heal = Math.round(p.maxHp * (0.12 * sk.power) * (1 + 0.15 * (lvl - 1)));
    p.hp = clamp(p.hp + heal, 0, p.maxHp);
    spawnRing(p.x, p.y, TS * 1.3, '#7dff9a'); spawnCross(p.x, p.y - 6, '#d9ffe0'); floatText(p.x, p.y, '+' + heal, 'heal');
    toast(`${sk.name} — restored ${heal} HP!`, 'good');
    return;
  }
  if (sk.type === 'buff') {
    if (sk.id === 'hunters_mark') {
      const t = G.target;
      applyStatus(t, 'mark', lvl); skillFx(sk, t.x, t.y);
      toast(`${sk.name} — ${20 + 5 * (lvl - 1)}% vulnerability!`, 'good');
      return;
    }
    // combat agent left buffs numeric-less → engine defines their effect, scaled by skill level
    const eff = { guard_sigil: ['def', 1.5], blood_frenzy: ['atk', 1.4], hunters_mark: ['atk', 1.4], holy_shield: ['def', 1.6],
      bulwark: ['def', 1.6], mana_shield: ['def', 1.4], bloodlust: ['atk', 1.45], blessing: ['atk', 1.35],
      iron_guard: ['def', 1.5], ki_barrier: ['def', 1.4], storm_ward: ['def', 1.4] }[sk.id] || ['atk', 1.3];
    const mult = 1 + (eff[1] - 1) * (1 + 0.25 * (lvl - 1));
    p.buffs.push({ stat: eff[0], mult, until: now() + 8000 });
    skillFx(sk, p.x, p.y);
    toast(`${sk.name} Lv${lvl} active!`, 'good');
    return;
  }
  if (sk.type === 'aoe') {
    const cx = G.target ? G.target.x : p.x, cy = G.target ? G.target.y : p.y;
    skillFx(sk, cx, cy);
    let hit = false;
    for (const m of G.monsters) if (m.alive && dist(cx, cy, m.x, m.y) <= sk.radius * TS + m.size / 2) {
      let { dmg, isCrit } = calcDamage(atk * combatGapFactor(p.level, m.lvl), monsterDef(m), p.critChance);
      if (sk.detonate && m.statuses[sk.detonate] && m.statuses[sk.detonate].until > now()) { dmg = Math.round(dmg * (1 + M.detonateBonus)); delete m.statuses[sk.detonate]; }
      damageMonster(m, dmg, isCrit); applyStatus(m, sk.effect, lvl);
      hit = true;
    }
    if (hit && !sk.finisher) gainMomentum(p);
    return;
  }
  // melee / ranged single target
  const t = G.target;
  if (sk.id === 'savage_leap') {
    const d = dist(p.x, p.y, t.x, t.y), stop = t.size / 2 + TS * 0.72;
    if (d > stop) {
      const ox = p.x, oy = p.y, travel = d - stop;
      const nx = p.x + ((t.x - p.x) / d) * travel, ny = p.y + ((t.y - p.y) / d) * travel;
      if (walkableAt(nx, ny)) { p.x = nx; p.y = ny; G.path = null; spawnRing(ox, oy, TS, '#ff9a6a'); spawnBurst(nx, ny, '#ff9a6a', 14); }
    }
  }
  faceToward(p, t.x, t.y);
  skillFx(sk, t.x, t.y);
  if (!rollHit(p.hit + 20, t.flee)) { floatText(t.x, t.y, 'miss', 'miss'); return; }
  let { dmg, isCrit } = calcDamage(atk * combatGapFactor(p.level, t.lvl), monsterDef(t), p.critChance);
  if (sk.detonate && t.statuses[sk.detonate] && t.statuses[sk.detonate].until > now()) { dmg = Math.round(dmg * (1 + M.detonateBonus)); delete t.statuses[sk.detonate]; }
  damageMonster(t, dmg, isCrit); applyStatus(t, sk.effect, lvl);
  if (!sk.finisher) gainMomentum(p);
}

function faceToward(e, tx, ty) {
  const dx = tx - e.x, dy = ty - e.y;
  if (Math.abs(dx) > Math.abs(dy)) e.facing = { x: Math.sign(dx), y: 0 };
  else e.facing = { x: 0, y: Math.sign(dy) };
}

// =====================================================================
// MONSTER AI
// =====================================================================
function updateMonsters(dt) {
  const p = G.player;
  for (const m of G.monsters) {
    if (!m.alive) { if (now() >= m.deadUntil) respawn(m); continue; }

    // status ticks
    let stunned = false, slowed = false;
    for (const [k, s] of Object.entries(m.statuses)) {
      if (now() > s.until) { delete m.statuses[k]; continue; }
      if (k === 'stun') stunned = true;
      if (k === 'slow') slowed = true;
      if (k === 'burn' && now() >= s.nextTick) {
        s.nextTick += 1000;
        const tickDamage = s.tickDamage ?? COMBAT.statusEffects.burn.tickDamage;
        m.hp -= tickDamage;
        floatText(m.x, m.y, tickDamage, 'dmg');
        if (m.hp <= 0) { killMonster(m); continue; }
      }
    }
    if (stunned) continue;

    const d = dist(m.x, m.y, p.x, p.y);
    const speed = (m.def.sizeTiles >= 2 ? 42 : 60) * (slowed ? 0.5 : 1);   // guardians lumber

    // ---- boss leash: only reset if the hero has truly fled AND the fight has paused ----
    // (distance is measured to the BOSS, not its spawn, so ranged kiting doesn't false-trigger it)
    if (m.def.sizeTiles >= 2) {
      const bossDist = d, outOfCombat = now() - (m.lastCombatAt || 0) > 4000;
      if (bossDist > 16 * TS && outOfCombat) m.leashing = true;
      else if (bossDist < 13 * TS) m.leashing = false;
      if (m.leashing) {
        m.provoked = false;
        m.enraged = false; m.phase = 0; m.atk = m.atkBase; m.slamAt = null; // full reset while leashed
        if (m.hp < m.maxHp) {
          m.hp = Math.min(m.maxHp, m.hp + m.maxHp * 0.06 * dt);       // slow regen only while reset
          if (now() >= (m._healAt || 0)) { floatText(m.x, m.y, '+' + Math.round(m.maxHp * 0.06), 'heal'); m._healAt = now() + 800; }
        }
        if (dist(m.x, m.y, m.homeX, m.homeY) > TS * 0.7) followMonsterPath(m, m.homeX, m.homeY, speed, dt);
        else m.path = null;
        continue;
      }
      // ---- boss mechanics: enrage + telegraphed ground slam (dodge by moving) ----
      if (!m.phase && m.hp < m.maxHp * 0.70) {
        m.phase = 1; m.atk = Math.round(m.atkBase * 1.1); m.nextSlamAt = now() + 1400;
        spawnRing(m.x, m.y, TS * 2.2, '#ffb347');
        toast(`⚠ ${m.def.name} awakens — slams accelerate!`, 'bad');
      }
      if (!m.enraged && m.hp < m.maxHp * TUNING.bossEnrageAt) {
        m.enraged = true; m.atk = Math.round(m.atkBase * 1.4);
        AUDIO.playSfx('playerHurt');
        toast(`☠ ${m.def.name} is ENRAGED!`, 'bad');
      }
      const inCombat = now() - (m.lastCombatAt || 0) < 6000;
      if (inCombat && d < 8 * TS) {
        const slamInterval = TUNING.bossSlamEveryMs * (m.phase ? 0.8 : 1) * (m.enraged ? 0.7 : 1);
        if (!m.slamAt && now() >= (m.nextSlamAt || (m.nextSlamAt = now() + slamInterval))) {
          m.slamX = p.x; m.slamY = p.y; m.slamAt = now() + 1100;      // mark the ground under the hero
          fx({ kind: 'ring', x: m.slamX, y: m.slamY, r: TS * 1.8, color: '#ff4433', life: 1100 });
          fx({ kind: 'crack', x: m.slamX, y: m.slamY, r: TS * 1.1, color: '#ff8866', life: 1100 });
        }
        if (m.slamAt && now() >= m.slamAt) {                          // impact
          m.slamAt = null; m.nextSlamAt = now() + slamInterval;
          spawnCrack(m.slamX, m.slamY, TS * 1.8, '#ff5533'); spawnRing(m.slamX, m.slamY, TS * 1.8, '#ff5533');
          AUDIO.playSfx('hit');
          if (dist(p.x, p.y, m.slamX, m.slamY) <= TS * 1.8) {
            const { dmg } = calcDamage(m.atk * 1.6, p.physDef * buffMult(p, 'def'), 0);
            if (!p.godMode) p.hp -= dmg;
            p.hurtUntil = now() + ANIM.hurtMs;
            AUDIO.playSfx('playerHurt');
            floatText(p.x, p.y, p.godMode ? '0' : dmg, 'enemy');
            // Death replaces the map and monster roster. Stop this old roster's
            // update immediately so another queued hit cannot kill the revived hero.
            if (p.hp <= 0) { playerDeath(); return; }
          } else floatText(m.slamX, m.slamY, 'dodged!', 'heal');
        }
      }
    }

    const aggro = m.def.behavior === 'aggressive' || m.provoked;
    const aggroTiles = Math.max(R.aggroRangeTiles, (m.def.attackRange || 0) + 1);
    if (aggro && d < aggroTiles * TS * (m.def.id === 'ruin_golem' ? 4 : 1)) {
      const range = (m.size / 2) + TS * (m.def.attackRange || 0.6);
      if (d > range) followMonsterPath(m, p.x, p.y, speed, dt);       // route around trees/walls
      else if (now() >= m.atkCdUntil) {                                // attack player
        m.atkCdUntil = now() + COMBAT.attackSpeedMs * (m.def.attackCooldownMult || 1) * (slowed ? 2 : 1) * (m.enraged ? 0.7 : 1);
        m.animAttackUntil = now() + 300;
        m.path = null; m.lastCombatAt = now();
        // fighting up is dangerous both ways: a monster above your level lands hits an
        // evasion build would otherwise dodge (mirror of combatGapFactor on your damage)
        if (rollHit(m.hit + gapHit(m.lvl, p.level), p.flee)) {
          const { dmg, isCrit } = calcDamage(m.atk, p.physDef * buffMult(p, 'def'), 5);
          if (m.def.attackRange) spawnBolt(m.x, m.y, p.x, p.y, m.def.projectileColor || '#ffffff', '#ffffff');
          if (!p.godMode) p.hp -= dmg;                                  // admin god mode
          p.hurtUntil = now() + ANIM.hurtMs;
          AUDIO.playSfx('playerHurt');
          floatText(p.x, p.y, p.godMode ? '0' : dmg, p.godMode ? 'heal' : 'enemy');
          if ((!G.target || !G.target.alive) && (!G.autoFarm || autoHuntEligible(m, p))) {
            G.target = m; G.targetSource = 'retaliate';
          }
          if (p.hp <= 0) { playerDeath(); return; }
        } else floatText(p.x, p.y, 'miss', 'miss');
      }
    }
  }
}

// non-boss mobs respawn NEAR their home turf (keeps the entry zones stocked with
// entry-level monsters instead of the population drifting deep)
function walkableNearHome(m, rad = 6) {
  const hc = Math.floor(m.homeX / TS), hr = Math.floor(m.homeY / TS);
  const connected = new Set(G.spawnTiles.map(tile => `${tile.col},${tile.row}`));
  const inHabitat = tile => {
    if (!m.spawnSpec?.depth) return true;
    const depth = heatDepthAt(G.heatField, tile.col, tile.row);
    return depth != null && depth >= m.spawnSpec.depth[0] && depth <= m.spawnSpec.depth[1];
  };
  for (let i = 0; i < 40; i++) {
    const c = hc + rndInt(-rad, rad), r = hr + rndInt(-rad, rad);
    const tile = { col: c, row: r };
    if (connected.has(`${c},${r}`) && inHabitat(tile)) return tile;
  }
  return randomWalkableTile(inHabitat, false) || (m.spawnSpec?.depth ? null : randomWalkableTile());
}
function respawn(m) {
  const t = m.def.sizeTiles >= 2 ? (findChar('B') || { col: 2, row: 2 }) : walkableNearHome(m);
  if (!t) return;
  m.x = t.col * TS + TS / 2; m.y = t.row * TS + TS / 2;
  // Re-level at the new home-near position, clamped to the species habitat/range.
  if (m.def.sizeTiles < 2) {
    const lvl = heatLevel(G.map, t.col, t.row, m.spawnSpec, G.heatField);
    if (lvl != null) { const st = monsterStatsFor(m.def, lvl); Object.assign(m, st, { maxHp: st.hp }); }
  }
  m.hp = m.maxHp; m.alive = true; m.statuses = {}; m.provoked = false; m.path = null; m.leashing = false;
  m.enraged = false; m.phase = 0; m.atk = m.atkBase; m.slamAt = null; m.nextSlamAt = 0;
}

// ---- roaming rare boss: an MVP-style world event announced on a timer ----
const rareBossDef = () => CONTENT.monsters.find(m => m.rare);
function spawnRareBoss(mapId) {
  const fields = Object.keys(MAPS).filter(id => MAPS[id].band);
  G.rareBossMapId = mapId || fields[rndInt(0, fields.length - 1)];
  G.nextRareBossAt = now() + TUNING.rareBossEveryMs;
  const def = rareBossDef();
  const msg = T('⚠ A rare beast stirs — {name} prowls {map}!', 'ui')
    .replace('{name}', T(def.name, 'monsters'))
    .replace('{map}', T(MAPS[G.rareBossMapId].name, 'maps'));
  toast(msg, 'bad'); logMsg(msg, 'sys');
  AUDIO.playSfx('quest');
  if (G.mapId === G.rareBossMapId) placeRareBoss();
}
function placeRareBoss() {
  const def = rareBossDef();
  if (!def || G.monsters.some(m => m.def === def && m.alive)) return;
  const t = G.spawnTiles.length ? G.spawnTiles[rndInt(0, G.spawnTiles.length - 1)] : null;
  if (!t) return;
  G.monsters.push(makeMonster(def, t.col * TS + TS / 2, t.row * TS + TS / 2));
}

// ---- rebirth (NG+): reset the character at the level cap for permanent power.
// Gear, zeny, storage, guild rank, and world/story state all survive; only the
// hero's level/job/skills/stat points start over. ponytail: the active story
// quest is deliberately left running — a reborn Lv1 simply grinds back to it.
function doRebirth() {
  const p = G.player;
  if (p.level < DESIGN.levelCap) return false;
  const fresh = makePlayer(p.classId, p.name);   // canonical starting progression for this class
  p.rebirths = (p.rebirths || 0) + 1;
  Object.assign(p, { level: 1, xp: 0, jobLevel: 1, jobXp: 0, tierIndex: 0, className: fresh.className,
    alloc: fresh.alloc, statPoints: fresh.statPoints, skillPoints: fresh.skillPoints,
    skillLevels: fresh.skillLevels, hotbar: fresh.hotbar, momentum: 0, skillCd: {}, buffs: [] });
  G.advance = null;   // the class-advancement trials will re-offer at their level gates
  recompute(p, true);
  const msg = `✦ ${T('Rebirth {n} — the world begins again, but your soul remembers.', 'ui').replace('{n}', p.rebirths)}`;
  toast(msg, 'good'); logMsg(msg, 'good');
  AUDIO.playSfx('levelup');
  checkAchievements(); updateHud(); renderHotbar(); refreshPanel('char'); saveGame();
  return true;
}

// ---- achievements: declarative lifetime badges, polled every couple seconds ----
function checkAchievements() {
  const p = G.player; if (!p) return;
  const kills = Object.values(G.killCounts).reduce((s, n) => s + n, 0);
  const met = a =>
    a.type === 'kills' ? kills >= a.count :
    a.type === 'guardian' ? G.guardiansSlain.has(a.target) :
    a.type === 'guardians' ? G.guardiansSlain.size >= a.count :
    a.type === 'level' ? p.level >= a.count :
    a.type === 'jobLevel' ? p.jobLevel >= a.count :
    a.type === 'zeny' ? p.zeny >= a.count :
    a.type === 'refine' ? [...Object.values(p.equip || {}), ...p.inventory].some(e => e && (e.plus || 0) >= a.count) :
    a.type === 'rank' ? (G.guildRankIdx || 0) >= GUILD_RANKS.indexOf(a.target) :
    a.type === 'rebirths' ? (p.rebirths || 0) >= a.count :
    a.type === 'story' ? G.won : false;
  for (const a of CONTENT.achievements) {
    if (G.achievements.has(a.id) || !met(a)) continue;
    G.achievements.add(a.id);
    const msg = `${a.icon} ${T('Achievement unlocked:', 'ui')} ${T(a.name, 'achievements')}`;
    toast(msg, 'good'); logMsg(msg, 'good'); AUDIO.playSfx('quest');
    refreshPanel('char');
  }
}

// ---- trader crafting: consume zeny + material stacks, produce the recipe output ----
function craftItem(recipeId) {
  const r = (CONTENT.recipes || []).find(x => x.id === recipeId), p = G.player;
  if (!r) return;
  const stack = id => p.inventory.find(e => !e.uid && e.itemId === id);
  if (p.zeny < r.cost || r.mats.some(m => (stack(m.itemId)?.qty || 0) < m.qty)) {
    logMsg(T('Not enough materials.', 'ui'), 'bad'); return;
  }
  p.zeny -= r.cost;
  for (const m of r.mats) {
    const s = stack(m.itemId);
    s.qty -= m.qty;
    if (s.qty <= 0) p.inventory.splice(p.inventory.indexOf(s), 1);
  }
  const got = addItem(r.out, 1);
  const name = got?.uid ? instName(got) : T(itemById[r.out].name, 'items');
  toast(`🔨 ${T('Crafted', 'ui')} ${name}!`, 'good');
  AUDIO.playSfx('pickup');
  refreshPanel('shop');
}

// ---- town storage chest (kept at the trader): move items between bag and chest ----
function depositItem(idx) {
  const e = G.player.inventory[idx]; if (!e || itemById[e.itemId].type === 'quest') return;
  if (e.uid) { G.player.inventory.splice(idx, 1); G.storage.push(e); }
  else {
    e.qty--;
    const s = G.storage.find(x => !x.uid && x.itemId === e.itemId);
    if (s) s.qty++; else G.storage.push({ itemId: e.itemId, qty: 1 });
    if (e.qty <= 0) G.player.inventory.splice(idx, 1);
  }
  AUDIO.playSfx('pickup'); refreshPanel('shop');
}
function withdrawItem(idx) {
  const e = G.storage[idx]; if (!e) return;
  if (e.uid) { G.storage.splice(idx, 1); G.player.inventory.push(e); }
  else {
    e.qty--;
    const b = G.player.inventory.find(x => !x.uid && x.itemId === e.itemId);
    if (b) b.qty++; else G.player.inventory.push({ itemId: e.itemId, qty: 1 });
    if (e.qty <= 0) G.storage.splice(idx, 1);
  }
  AUDIO.playSfx('pickup'); refreshPanel('shop');
}

function moveEntity(e, dx, dy, rad) {
  if (dx && walkableAt(e.x + dx + Math.sign(dx) * rad, e.y)) e.x += dx;
  if (dy && walkableAt(e.x, e.y + dy + Math.sign(dy) * rad)) e.y += dy;
}

// monster movement toward (tx,ty) via A* (throttled repath, staggered, greedy fallback)
function followMonsterPath(m, tx, ty, speed, dt) {
  m.facingLeft = tx < m.x;                                    // face the movement/chase target
  if (!m.path || m.path.length === 0 || now() >= (m.repathAt || 0)) {
    const pa = findPath(Math.floor(m.x / TS), Math.floor(m.y / TS), Math.floor(tx / TS), Math.floor(ty / TS));
    m.path = (pa && pa.length > 1) ? pa.slice(1).map(t => ({ x: t.c * TS + TS / 2, y: t.r * TS + TS / 2 })) : null;
    m.repathAt = now() + 450 + (Math.floor(m.x) % 100) * 3;   // stagger without Math.random
  }
  const ox = m.x, oy = m.y;
  if (m.path && m.path.length) {
    const wp = m.path[0], dd = dist(m.x, m.y, wp.x, wp.y);
    if (dd < 6) m.path.shift();
    else moveEntity(m, ((wp.x - m.x) / dd) * speed * dt, ((wp.y - m.y) / dd) * speed * dt, m.size * 0.35);
  } else {
    moveEntity(m, Math.sign(tx - m.x) * speed * dt, Math.sign(ty - m.y) * speed * dt, m.size * 0.35);
  }
  if (m.x !== ox || m.y !== oy) m.movedAt = now();
}

function stopAutomationOnDeath() {
  const stopped = Boolean(G.autoFarm || G.huntTargetId || G.taskGuide || G.target || G.path || G.manualIntent);
  G.autoFarm = false;
  G.huntTargetId = null;
  G.taskGuide = null;
  G.target = null;
  G.targetSource = null;
  G.path = null;
  G.manualIntent = null;
  G.keys = {};              // a held movement key must not carry through respawn
  updateFarmButton();
  return stopped;
}

function playerDeath() {
  const p = G.player;
  const automationStopped = stopAutomationOnDeath();
  const loss = Math.floor(p.zeny * TUNING.deathZenyLoss);
  p.zeny -= loss;
  toast(`You fell... revived in town at half strength${loss ? ` — dropped ${loss}z on the way` : ''}.${automationStopped ? ' Hunt and route stopped.' : ''}`, 'bad');
  if (automationStopped) logMsg('Death canceled Hunt mode and active quest navigation. Choose a route again when ready.', 'sys');
  p.hp = Math.ceil(p.maxHp * 0.5); p.mp = Math.ceil(p.maxMp * 0.5); p.buffs = [];
  loadMap('town_awakening');
  updateFarmButton();
  updateQuestTracker();
}

// =====================================================================
// QUESTS
// =====================================================================
const storyPhaseById = Object.fromEntries((CONTENT.storyPhases || []).map(phase => [phase.id, phase]));
const storyPhaseFor = quest => storyPhaseById[quest?.phase] || null;
// Main-story chapters provide a second route into better trader stock. The
// thresholds align with the existing guild ladder: phase II reaches D-, phase
// III C-, phase IV B-, phase V A-, and finishing the story reaches A+.
// Trader S is reserved for the combined story-complete + Guild S capstone.
const STORY_SHOP_RANK_BY_PHASE = [0, 0, 4, 7, 10, 13];
const storyShopRankForQuest = quest => STORY_SHOP_RANK_BY_PHASE[quest?.phase || 1] || 0;
function storyShopRankIdx() {
  if (G.won) return GUILD_RANKS.length - 2; // story alone reaches A+; S is the combined capstone
  return storyShopRankForQuest(storyFocusQuest());
}
function effectiveShopRankIdx() {
  const guildRank = G.guildRankIdx || 0, maxRank = GUILD_RANKS.length - 1;
  if (G.won && guildRank >= maxRank) return maxRank;
  return Math.min(maxRank - 1, Math.max(guildRank, storyShopRankIdx()));
}
const storyPhaseLabel = quest => {
  const phase = storyPhaseFor(quest);
  if (!phase) return T('MAIN STORY', 'ui');
  const label = currentLang === 'th' ? 'ช่วงที่' : 'PHASE';
  return `${label} ${phase.numeral} · Lv ${phase.levelMin}–${phase.levelMax}`;
};
const storyFocusQuest = () => questById[G.quest] || questById[G.pendingQuest] || null;

function storyPhaseBadge(quest) {
  const phase = storyPhaseFor(quest);
  if (!phase) return '';
  const label = currentLang === 'th' ? 'ช่วงที่' : 'Phase';
  return `<span class="story-phase-badge" style="--phase-color:${phase.color}">${label} ${phase.numeral} · Lv ${phase.levelMin}–${phase.levelMax}</span>`;
}

function storyRoadmapHtml() {
  const focus = storyFocusQuest();
  const focusPhase = focus?.phase || (CONTENT.storyPhases.length + 1);
  return `<div class="story-roadmap">${CONTENT.storyPhases.map(phase => {
    const cleared = G.won || phase.id < focusPhase;
    const active = !cleared && phase.id === focusPhase;
    const waiting = active && G.pendingQuest === focus?.id;
    
    let state = cleared ? 'CLEARED' : waiting ? `UNLOCK AT LV ${focus.minLevel}` : active ? 'IN PROGRESS' : 'LOCKED';
    if (currentLang === 'th') {
      state = cleared ? 'สำเร็จแล้ว' : waiting ? `ปลดล็อกที่ Lv ${focus.minLevel}` : active ? 'กำลังทำ' : 'ล็อกอยู่';
    }
    
    const symbol = cleared ? '✓' : active ? (waiting ? '◇' : '◆') : '·';
    const map = MAPS[phase.mapId];
    const subLabel = currentLang === 'th'
      ? `ช่วงที่ ${phase.numeral} · เลเวลหลัก ${phase.levelMin}–${phase.levelMax}`
      : `PHASE ${phase.numeral} · BASE LV ${phase.levelMin}–${phase.levelMax}`;
      
    return `<div class="story-phase ${cleared ? 'cleared' : active ? 'active' : 'locked'}" style="--phase-color:${phase.color}">
      <span class="story-phase__sigil">${symbol}</span>
      <span class="story-phase__copy"><small>${subLabel}</small><b>${T(phase.name, 'storyPhases')}</b><em>${T(map?.name || phase.mapId, 'maps')}</em></span>
      <span class="story-phase__state">${state}</span>
    </div>`;
  }).join('')}</div>`;
}

function maybeStartPendingQuest() {
  const q = questById[G.pendingQuest];
  if (!q || !G.player || G.player.level < (q.minLevel || 1)) return false;
  G.pendingQuest = null;
  return startQuest(q.id, false);
}

// the story forks once per class (nextQuestByClass on the hub quest); everywhere else it's linear
const nextQuestFor = q => questById[q.nextQuestByClass ? q.nextQuestByClass[G.player.classId] : q.nextQuestId];
const questSuccessorIds = q => q.nextQuestByClass ? Object.values(q.nextQuestByClass) : (q.nextQuestId ? [q.nextQuestId] : []);

function startQuest(id, quiet) {
  const q = questById[id];
  if (!q) return false;
  if (G.player.level < (q.minLevel || 1)) {
    G.quest = null;
    G.pendingQuest = q.id;
    const phase = storyPhaseFor(q);
    toast(currentLang === 'th' ? `บทเนื้อเรื่องล็อกอยู่ — เลเวลหลักต้องถึง ${q.minLevel} เพื่อเริ่ม ${T(q.name, 'quests')}` : `Chapter locked — reach Base Lv ${q.minLevel} for ${q.name}.`, 'sys');
    logMsg(currentLang === 'th' ? `${phase ? `ช่วงที่ ${phase.numeral}: ${T(phase.name, 'storyPhases')}` : 'เควสต์เนื้อเรื่องถัดไป'} จะปลดล็อกที่เลเวลหลัก ${q.minLevel} ฝึกฝนเลเวลผ่านการล่ามอนสเตอร์หรือทำเควสต์ล่าค่าหัวกิลด์` : `${phase ? `Phase ${phase.numeral}: ${phase.name}` : 'Next story quest'} unlocks at Base Lv ${q.minLevel}. Train through hunts or guild bounties.`, 'sys');
    updateQuestTracker();
    return false;
  }
  G.pendingQuest = null;
  G.quest = id;
  // talk/explore quests demand a FRESH visit — forget any earlier one (else they'd insta-complete)
  if (q.objective.type === 'talk') G.talked.delete(q.objective.target);
  if (q.objective.type === 'explore') G.visited.delete(q.objective.target);
  toast(currentLang === 'th' ? `เควสต์ใหม่: ${T(q.name, 'quests')}` : `New quest: ${q.name}`, 'good');
  logMsg(T(q.description, 'quests'), 'sys');
  // chained quests pass quiet — their startLines already played in the completion dialogue
  if (q.startLines && !quiet) showDialogue(npcById[q.giverNpcId]?.name || 'Elowen', q.startLines);
  updateQuestTracker();
  return true;
}

function questProgress(q) {
  if (q.objective.type === 'kill') return Math.min(G.killCounts[q.objective.target] || 0, q.objective.count);
  if (q.objective.type === 'collect') return Math.min(itemQty(q.objective.target), q.objective.count);
  if (q.objective.type === 'explore') return G.visited.has(q.objective.target) ? q.objective.count : 0;
  if (q.objective.type === 'talk') return G.talked.has(q.objective.target) ? q.objective.count : 0;
  return 0;
}

function objectiveName(objective) {
  if (!objective) return '';
  if (objective.type === 'kill') return T(monById[objective.target]?.name || objective.target, 'monsters');
  if (objective.type === 'collect') return T(itemById[objective.target]?.name || objective.target, 'items');
  if (objective.type === 'explore') return T(MAPS[objective.target]?.name || objective.target, 'maps');
  if (objective.type === 'talk') return T(npcById[objective.target]?.name || npcLocation(objective.target)?.npc.name || objective.target, 'npcs');
  return objective.target;
}

function actionForObjective(objective, source, taskId) {
  if (!objective) return null;
  if (objective.type === 'kill') {
    return { source, taskId, mode: 'hunt', monsterId: objective.target, mapId: monsterMapId[objective.target], label: objectiveName(objective) };
  }
  if (objective.type === 'collect') {
    const drop = itemDropSource(objective.target);
    return drop ? { source, taskId, mode: 'hunt', monsterId: drop.monsterId, mapId: drop.mapId, label: drop.mon } : null;
  }
  if (objective.type === 'explore') {
    return { source, taskId, mode: 'explore', mapId: objective.target, label: objectiveName(objective) };
  }
  if (objective.type === 'talk') {
    const location = npcLocation(objective.target);
    return location ? { source, taskId, mode: 'npc', mapId: location.mapId, npcId: objective.target, label: location.npc.name } : null;
  }
  return null;
}

function taskAction(source, taskId) {
  if (source === 'story') {
    const q = questById[G.quest];
    return q && (!taskId || taskId === q.id) ? actionForObjective(q.objective, source, q.id) : null;
  }
  if (source === 'advance') {
    return G.advance ? actionForObjective(G.advance.def.objective, source, G.advance.def.name) : null;
  }
  if (source === 'guild') {
    const bounty = G.activeGuilds.find(g => g.id === taskId);
    if (!bounty) return null;
    const ready = bounty.kind === 'deliver' ? itemQty(bounty.target) >= bounty.count : bounty.done;
    if (ready) {
      const location = npcLocation('elder');
      return { source, taskId, mode: 'npc', mapId: location.mapId, npcId: 'elder', label: 'Elder Maro' };
    }
    if (bounty.kind === 'kill') {
      return { source, taskId, mode: 'hunt', monsterId: bounty.target, mapId: monsterMapId[bounty.target], label: bounty.targetName };
    }
    const drop = itemDropSource(bounty.target);
    return drop ? { source, taskId, mode: 'hunt', monsterId: drop.monsterId, mapId: drop.mapId, label: drop.mon } : null;
  }
  return null;
}

function activateTaskGuide(source, taskId) {
  const action = taskAction(source, taskId);
  if (!action?.mapId) { toast(T('No route is available for this task.', 'ui'), 'bad'); return; }
  const resumeAutoFarm = G.taskGuide?.resumeAutoFarm ?? G.autoFarm;
  G.taskGuide = { ...action, resumeAutoFarm };
  G.huntTargetId = null;
  G.autoFarm = false;
  G.target = null;
  G.targetSource = null;
  G.path = null;
  G.manualIntent = null;
  continueTaskGuide();
  updateFarmButton();
  updateQuestTracker();
}

// The Chronicle can plot a route to places the hero has personally visited.
// This uses the same portal/path guidance as quests; it never teleports or
// reveals an uncharted region's route.
function activateWorldRoute(mapId) {
  const map = MAPS[mapId];
  if (!map || !G.visited.has(mapId)) { toast(T('That road is not recorded in your Chronicle yet.', 'ui'), 'bad'); return false; }
  if (mapId === G.mapId) { toast(currentLang === 'th' ? `คุณอยู่ใน ${T(map.name, 'maps')} อยู่แล้ว` : `You are already in ${map.name}.`, 'sys'); return false; }
  const resumeAutoFarm = G.taskGuide?.resumeAutoFarm ?? G.autoFarm;
  G.taskGuide = { source: 'world', taskId: mapId, mode: 'explore', mapId, label: map.name, resumeAutoFarm };
  G.huntTargetId = null;
  G.autoFarm = false;
  G.target = null;
  G.targetSource = null;
  G.path = null;
  G.manualIntent = null;
  continueTaskGuide();
  updateFarmButton();
  updateQuestTracker();
  toast(currentLang === 'th' ? `กำหนดเส้นทางแล้ว: ${T(map.name, 'maps')} เดินตามเครื่องหมายสีทอง` : `Route marked: ${map.name}. Follow the gold marker.`, 'good');
  return true;
}

function finishTaskGuide(restoreAutoFarm = true) {
  const guide = G.taskGuide;
  if (!guide) return;
  G.taskGuide = null;
  G.huntTargetId = null;
  G.target = null;
  G.targetSource = null;
  G.path = null;
  G.manualIntent = null;
  G.autoFarm = restoreAutoFarm && guide.resumeAutoFarm;
  updateFarmButton();
  if ($('#quest-tracker')) updateQuestTracker();
  refreshPanel('world');
}

function continueTaskGuide() {
  const guide = G.taskGuide;
  if (!guide || !G.player || !G.map) return;
  G.target = null;
  G.targetSource = null;
  G.path = null;

  if (G.mapId !== guide.mapId) {
    const portal = nextPortalToward(MAPS, G.mapId, guide.mapId);
    if (!portal || !pathTo(portal.x * TS + TS / 2, portal.y * TS + TS / 2)) {
      const label = translateAny(guide.label, ['maps', 'npcs', 'monsters']);
      toast(T('No path to {label}.', 'ui').replace('{label}', label), 'bad');
      finishTaskGuide();
      return;
    }
    updateFarmButton();
    return;
  }

  if (guide.mode === 'hunt') {
    G.huntTargetId = guide.monsterId;
    G.autoFarm = true;
    updateFarmButton();
    const name = T(monById[guide.monsterId]?.name || guide.label, 'monsters');
    toast(T('Focused hunt: {name}.', 'ui').replace('{name}', name), 'good');
    return;
  }
  if (guide.mode === 'explore') {
    G.visited.add(guide.mapId);
    const arrivedByChronicle = guide.source === 'world';
    const destination = translateAny(guide.label, ['maps', 'npcs', 'monsters']);
    finishTaskGuide();
    checkQuest();
    if (arrivedByChronicle) toast(T('Arrived: {destination}.', 'ui').replace('{destination}', destination), 'good');
    return;
  }
  if (guide.mode === 'npc') {
    const npc = G.npcs.find(n => n.id === guide.npcId);
    if (!npc || !pathTo(npc.x * TS + TS / 2, npc.y * TS + TS / 2)) {
      const label = translateAny(guide.label, ['npcs', 'maps', 'monsters']);
      toast(T('Could not reach {label}.', 'ui').replace('{label}', label), 'bad');
      finishTaskGuide();
    }
  }
}

function checkQuest(options) {
  const q = questById[G.quest];
  if (!q) return;
  updateQuestTracker();
  if (questProgress(q) >= q.objective.count) completeQuest(q, options);
}

function completeQuest(q, { suppressDialogue = false } = {}) {
  if (q.objective.type === 'collect') removeItem(q.objective.target, q.objective.count);   // hand the goods over
  gainXp(q.rewards.exp);
  G.player.zeny += q.rewards.zeny;
  for (const it of q.rewards.items) addItem(it, 1, 1.4);   // quest gear rolls a bit better
  toast(T('Quest complete: {name}  (+{exp} xp, +{gold}z)', 'ui')
    .replace('{name}', T(q.name, 'quests')).replace('{exp}', q.rewards.exp).replace('{gold}', q.rewards.zeny), 'good');
  const rewardNames = q.rewards.items.map(id => T(itemById[id].name, 'items')).join(', ');
  logMsg(T('Rewards: {items}', 'ui').replace('{items}', rewardNames), 'good');
  AUDIO.playSfx('levelup');
  // reset kill counter for the target so chained kill-quests count fresh
  if (q.objective.type === 'kill') G.killCounts[q.objective.target] = 0;
  if (G.taskGuide?.source === 'story' && G.taskGuide.taskId === q.id) finishTaskGuide();
  const next = nextQuestFor(q);
  const oldStoryShopRank = storyShopRankForQuest(q);
  const nextStoryShopRank = next ? storyShopRankForQuest(next) : oldStoryShopRank;
  const nextReady = next && G.player.level >= (next.minLevel || 1);
  G.quest = null;
  G.pendingQuest = next && !nextReady ? next.id : null;
  if (nextStoryShopRank > oldStoryShopRank) {
    const transitionRank = Math.min(GUILD_RANKS.length - 2, Math.max(G.guildRankIdx || 0, nextStoryShopRank));
    rerollShop(transitionRank);
    const rank = GUILD_RANKS[nextStoryShopRank];
    const msg = T('Story milestone reached — trader stock advanced to Rank {rank} with better rarity.', 'ui').replace('{rank}', rank);
    toast(`🛒 ${msg}`, 'good'); logMsg(`🛒 ${msg}`, 'good');
  }
  updateQuestTracker();
  // one dialogue for the beat: this quest's outro + the next one's intro (the chain itself
  // never waits on the dialogue — a replaced dialogue must not strand the story)
  const lines = [...(q.doneLines || []), ...(nextReady ? (next.startLines || []) : [])];
  if (!suppressDialogue && lines.length) showDialogue(npcById[q.giverNpcId]?.name || 'Elowen', lines);
  if (nextReady) setTimeout(() => startQuest(next.id, true), 800);
  else if (next) {
    const phase = storyPhaseFor(next);
    toast(T('Next: {quest} — unlocks at Base Lv {level}.', 'ui')
      .replace('{quest}', T(next.name, 'quests')).replace('{level}', next.minLevel), 'sys');
    const chapter = phase ? `${T('Phase', 'ui')} ${phase.numeral}: ${T(phase.name, 'storyPhases')}` : T('The next chapter', 'ui');
    logMsg(T('{chapter} is waiting. Reach Base Lv {level} to continue.', 'ui')
      .replace('{chapter}', chapter).replace('{level}', next.minLevel), 'sys');
  }
}

// ---- Adventurer's Guild: repeatable randomized bounties ----
const GUILD_DIFF_WEIGHTS = [['easy', 30], ['normal', 40], ['hard', 22], ['elite', 8]];
function pickWeighted(pairs) {
  const total = pairs.reduce((s, [, w]) => s + w, 0); let r = Math.random() * total;
  for (const [k, w] of pairs) { r -= w; if (r <= 0) return k; } return pairs[0][0];
}
// bounty difficulties available at the current guild rank
function guildAllowedDiffs() {
  const i = G.guildRankIdx || 0;
  return GUILD_DIFF_WEIGHTS.filter(([k]) => k === 'easy' || k === 'normal' || (k === 'hard' && i >= GUILD_HARD_AT) || (k === 'elite' && i >= GUILD_ELITE_AT));
}
function addGuildPoints(n) {
  G.guildPoints = (G.guildPoints || 0) + n;
  while (G.guildRankIdx < GUILD_RANKS.length - 1 && G.guildPoints >= guildPointsNeed(G.guildRankIdx)) {
    G.guildPoints -= guildPointsNeed(G.guildRankIdx);
    G.guildRankIdx++;
    AUDIO.playSfx('levelup');
    toast(`🏅 Guild rank up — you are now Rank ${GUILD_RANKS[G.guildRankIdx]}!`, 'good');
    logMsg(`Guild rank ${GUILD_RANKS[G.guildRankIdx]} earned. Better bounties, rewards, stock & drops.`, 'good');
    refreshGuildBoard();   // a new rank may unlock harder bounties
    rerollShop(); toast('🛒 New featured stock at the trader!', 'good');
  }
}
// guild bounty regions unlock by CONQUEST, not tourism: slaying a zone's guardian
// earns the guild's trust for the NEXT zone. Woods are always posted.
const ZONE_ORDER = ['whispering_woods', 'sunken_ruins', 'frostpeak_tundra', 'dragon_caldera', 'astral_rift'];
const WORLD_ORDER = ['town_awakening', ...ZONE_ORDER];
const zoneGuardian = mid => MAPS[mid].spawns.map(sp => monById[sp.monsterId]).find(d => d?.sizeTiles >= 2)?.id;
function unlockedMonsterIds() {
  const ids = new Set();
  for (let i = 0; i < ZONE_ORDER.length; i++) {
    if (i > 0 && !G.guardiansSlain.has(zoneGuardian(ZONE_ORDER[i - 1]))) break;
    for (const sp of MAPS[ZONE_ORDER[i]].spawns) { const d = monById[sp.monsterId]; if (d && d.sizeTiles < 2) ids.add(d.id); }
  }
  return ids;
}
function genGuildQuest() {
  const diff = pickWeighted(guildAllowedDiffs()), mult = DIFFICULTY[diff].mult;
  const rankMult = 1 + (G.guildRankIdx || 0) * 0.05;   // higher rank → the guild pays better
  const unlocked = unlockedMonsterIds();
  const pool = CONTENT.monsters.filter(m => unlocked.has(m.id));
  const m = pool[Math.floor(Math.random() * pool.length)];
  const count = Math.round((5 + Math.floor(Math.random() * 11)) * (0.7 + mult * 0.3));
  const pts = Math.round(GUILD_TIER_PTS[monsterTier(m.level)] * DIFF_PTS_MULT[diff]);   // region tier × difficulty
  const base = { id: 'g' + (++_uid), progress: 0, difficulty: diff, pts, sourceMonsterId: m.id,
    reward: { exp: Math.floor(m.exp * count * 0.6 * mult * rankMult), zeny: Math.floor(m.level * count * 8 * mult * rankMult) } };
  const mapName = monsterMapName[m.id];   // where to hunt (or where the material drops)
  // 40% of bounties are DELIVERIES: bring N of a material the band's monsters drop (pays ×1.3)
  const mats = m.drops.map(d => d.itemId).filter(id => itemById[id]?.type === 'material');
  if (mats.length && Math.random() < 0.4) {
    const itemId = mats[Math.floor(Math.random() * mats.length)];
    const dCount = Math.max(3, Math.round(count * 0.8));
    return { ...base, kind: 'deliver', target: itemId, targetName: itemById[itemId].name, count: dCount,
      dropFrom: m.name, mapName,
      reward: { exp: Math.floor(base.reward.exp * 1.3), zeny: Math.floor(base.reward.zeny * 1.3) } };
  }
  return { ...base, kind: 'kill', target: m.id, targetName: m.name, count, mapName };
}
// shared payout for kill-completion and delivery turn-in
function finishGuild(g) {
  gainXp(g.reward.exp); G.player.zeny += g.reward.zeny;
  const pts = g.pts ?? (GUILD_DIFF_PTS[g.difficulty] || 2);   // legacy bounties lack .pts
  const toastMsg = currentLang === 'th'
    ? `✔ ส่งเควสกิลด์สำเร็จ! +${g.reward.exp} XP, +${g.reward.zeny} Zeny, +${pts} คะแนนกิลด์`
    : `✔ Guild bounty done! +${g.reward.exp} xp, +${g.reward.zeny}z, +${pts} guild pts`;
  toast(toastMsg, 'good');
  const logMsgText = currentLang === 'th'
    ? `เควสกิลด์สำเร็จ: ${g.kind === 'deliver' ? `ส่งมอบ ${T(g.targetName, 'items')} ${g.count} ชิ้น` : `กำจัด ${T(g.targetName, 'monsters')} ${g.count} ตัว`}.`
    : `Guild bounty complete: ${g.kind === 'deliver' ? `delivered ${g.count} ${g.targetName}` : `${g.count} ${g.targetName} felled`}.`;
  logMsg(logMsgText, 'good');
  G.activeGuilds = G.activeGuilds.filter(x => x !== g);
  addGuildPoints(pts);
  updateQuestTracker();
}
// claim a finished bounty IN PERSON at the guild hall (kill: needs done; deliver: hands over the goods)
function claimGuild(id) {
  const g = id ? G.activeGuilds.find(x => x.id === id)
    : G.activeGuilds.find(x => x.kind === 'deliver' ? itemQty(x.target) >= x.count : x.done);
  if (!g) return;
  if (g.kind === 'deliver') {
    if (itemQty(g.target) < g.count) {
      const msg = currentLang === 'th'
        ? `ต้องการ ${T(g.targetName, 'items')} จำนวน ${g.count} ชิ้น (ปัจจุบันมี ${itemQty(g.target)} ชิ้น)`
        : `Need ${g.count}× ${g.targetName} (have ${itemQty(g.target)}).`;
      toast(msg, 'sys');
      return;
    }
    removeItem(g.target, g.count);
  } else if (!g.done) {
    const msg = currentLang === 'th'
      ? `ยังล่าไม่ครบ: ${g.progress}/${g.count} ${T(g.targetName, 'monsters')}`
      : `Still hunting: ${g.progress}/${g.count} ${g.targetName}.`;
    toast(msg, 'sys');
    return;
  }
  finishGuild(g);
}
const guildTurnIn = claimGuild;   // legacy alias (tests, old callers)
function refreshGuildBoard() {
  G.guildBoard = [genGuildQuest(), genGuildQuest(), genGuildQuest()];
  return G.guildBoard;
}
function rerollGuildBoard() {
  refreshGuildBoard();
  toast(T('Guild board refreshed. Accepted bounties were not changed.', 'ui'), 'good');
  updateQuestTracker();
  saveGame();
  return true;
}
// location hint for a bounty (kill: where the mob lives · deliver: which mob drops it + where)
// — falls back to a live lookup for legacy saves that predate the stored fields
function bountyWhere(g) {
  if (g.kind === 'deliver') {
    const from = g.dropFrom, map = g.mapName || itemDropSource(g.target)?.map;
    if (!from && !map) { const s = itemDropSource(g.target); return s ? `📍 ${T(s.mon, 'monsters')} · ${T(s.map, 'maps')}` : ''; }
    return `📍 ${from ? T(from, 'monsters') + ' · ' : ''}${map ? T(map, 'maps') : '??'}`;
  }
  const map = g.mapName || monsterMapName[g.target];
  return map ? `📍 ${T(map, 'maps')}` : '';
}
// The recommended level comes from the target monster's real map spawn band,
// including the material source for delivery bounties. Stored source ids keep
// new delivery rolls exact; name/drop lookups preserve old saves.
function bountyMonsterId(g) {
  if (g.sourceMonsterId && monById[g.sourceMonsterId]) return g.sourceMonsterId;
  if (g.kind === 'kill' && monById[g.target]) return g.target;
  const namedSource = g.dropFrom && CONTENT.monsters.find(monster => monster.name === g.dropFrom);
  return namedSource?.id || itemDropSource(g.target)?.monsterId || null;
}
function bountyLevelRange(g) {
  const monsterId = bountyMonsterId(g);
  if (!monsterId) return [1, 1];
  const level = monById[monsterId]?.level || 1;
  return [...(monsterLevelRange[monsterId] || [level, level])];
}
function bountyLevelHtml(g, compact = false) {
  const [min, max] = bountyLevelRange(g);
  const dangerous = G.player.level < min;
  const recommendation = T('Recommended Lv {level}+', 'ui').replace('{level}', min);
  const targetBand = T('Target Lv {min}–{max}', 'ui').replace('{min}', min).replace('{max}', max);
  if (compact) return `<span class="bounty-level${dangerous ? ' bounty-level--danger' : ''}">${dangerous ? '⚠ ' : ''}${recommendation} · ${targetBand}</span>`;
  const warning = dangerous ? ` · ${T('Too strong for your current level', 'ui')}` : '';
  return `<span class="bounty-level${dangerous ? ' bounty-level--danger' : ''}">${dangerous ? '⚠ ' : ''}${recommendation} · ${targetBand}${warning}</span>`;
}
function acceptGuild(id) {
  if (G.activeGuilds.length >= GUILD_MAX_ACTIVE) {
    const msg = currentLang === 'th'
      ? `กิลด์อนุญาตให้รับภารกิจพร้อมกันได้สูงสุด ${GUILD_MAX_ACTIVE} งานเท่านั้น`
      : `The guild allows ${GUILD_MAX_ACTIVE} open bounties at once.`;
    toast(msg, 'sys');
    return;
  }
  const idx = G.guildBoard.findIndex(q => q.id === id); if (idx < 0) return;
  const g = G.guildBoard[idx];
  G.activeGuilds.push(g);
  G.guildBoard[idx] = genGuildQuest();
  const msg = currentLang === 'th'
    ? `รับภารกิจกิลด์แล้ว: ${g.kind === 'deliver' ? `ส่งของ ${T(g.targetName, 'items')} จำนวน ${g.count} ชิ้น` : `กำจัด ${T(g.targetName, 'monsters')} จำนวน ${g.count} ตัว`} (${G.activeGuilds.length}/${GUILD_MAX_ACTIVE})`
    : `Guild task accepted: ${g.kind === 'deliver' ? `deliver ${g.count} ${g.targetName}` : `cull ${g.count} ${g.targetName}`} (${G.activeGuilds.length}/${GUILD_MAX_ACTIVE}).`;
  toast(msg, 'good');
  updateQuestTracker();
}
let pendingGuildRevoke = null;
const guildRevokeArmed = id => pendingGuildRevoke?.id === id;
function guildRevokeButton(g) {
  const armed = guildRevokeArmed(g.id);
  const label = armed ? T('Confirm Revoke', 'ui') : T('Revoke', 'ui');
  const title = armed ? T('Click again to confirm bounty revoke', 'ui') : T('Revoke bounty', 'ui');
  return `<button class="btn btn--danger${armed ? ' btn--confirm' : ''}" data-guildrevoke="${g.id}" title="${title}">${armed ? '⚠' : '✕'} ${label}</button>`;
}
function requestGuildRevoke(id) {
  const g = G.activeGuilds.find(bounty => bounty.id === id);
  if (!g) return false;
  if (guildRevokeArmed(id)) {
    pendingGuildRevoke = null;
    return revokeGuild(id);
  }
  pendingGuildRevoke = { id };
  const name = T(g.targetName, g.kind === 'deliver' ? 'items' : 'monsters');
  toast(T('Revoke armed: click Confirm Revoke to abandon {name}. Delivery items stay in your bag.', 'ui').replace('{name}', name), 'sys');
  refreshPanel('quest');
  refreshPanel('guild');
  return false;
}
function revokeGuild(id) {
  const idx = G.activeGuilds.findIndex(g => g.id === id);
  if (idx < 0) return false;
  const [g] = G.activeGuilds.splice(idx, 1);
  if (pendingGuildRevoke?.id === id) pendingGuildRevoke = null;
  if (G.taskGuide?.source === 'guild' && G.taskGuide.taskId === g.id) finishTaskGuide();
  const targetName = T(g.targetName, g.kind === 'deliver' ? 'items' : 'monsters');
  const msg = T('Guild bounty revoked: {name}. No rewards were granted.', 'ui').replace('{name}', targetName);
  toast(msg, 'sys');
  logMsg(msg, 'sys');
  updateQuestTracker();
  saveGame();
  return true;
}
function guildKill(monId) {
  // every accepted kill-bounty on this monster advances together; payout waits for the guild hall
  for (const g of G.activeGuilds) {
    if (g.kind === 'deliver' || g.target !== monId || g.done) continue;
    if (++g.progress >= g.count) {
      g.done = true;
      const msg = currentLang === 'th'
        ? `✔ ล่ามอนสเตอร์สำเร็จ: ${T(g.targetName, 'monsters')} — กลับไปรายงานผู้อาวุโสมาโรเพื่อรับรางวัล!`
        : `✔ Bounty complete: ${g.targetName} — report to Elder Maro to claim.`;
      toast(msg, 'good');
    }
  }
  const guided = G.taskGuide?.source === 'guild' && G.activeGuilds.find(g => g.id === G.taskGuide.taskId);
  if (guided) {
    const ready = guided.kind === 'deliver' ? itemQty(guided.target) >= guided.count : guided.done;
    if (ready) finishTaskGuide();
  }
  updateQuestTracker();
}

function triggerVictory() {
  if (G.won) return;
  G.won = true;
  rerollShop(effectiveShopRankIdx());
  const shopMsg = (G.guildRankIdx || 0) >= GUILD_RANKS.length - 1
    ? T('Main story and Guild Rank complete — Trader Rank S and the full catalog are unlocked.', 'ui')
    : T('Main story complete — Story Rank A+ unlocked. Reach Guild Rank S to unlock the full Trader Rank S catalog.', 'ui');
  logMsg(`🛒 ${shopMsg}`, 'good');
  setTimeout(() => runCutscene(CONTENT.story.victoryOutro, () => {
    G.running = true; last = now(); requestAnimationFrame(frame);   // resume — free-roam & farming continue
    toast(T('Victory! The world is yours to roam. Toggle auto-farm with F.', 'ui'), 'good');
  }), 500);
}

// =====================================================================
// RENDERING
// =====================================================================
let ctx, canvas;

// ---- pixel-art rasterizer: paint a char-matrix onto an offscreen canvas (synchronous) ----
const pxCache = {};
function hexToRGB(hex) { return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]; }
function matrixCanvas(key, rows) {
  if (pxCache[key]) return pxCache[key];
  const h = rows.length, w = rows.reduce((m, r) => Math.max(m, r.length), 0);
  const cvs = document.createElement('canvas'); cvs.width = w; cvs.height = h;
  const c = cvs.getContext('2d');
  const idata = c.createImageData && c.createImageData(w, h);
  if (!idata) { pxCache[key] = cvs; return cvs; }           // headless-safe
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const ch = rows[y][x], hex = PAL[ch];
    const i = (y * w + x) * 4;
    if (!hex) { idata.data[i + 3] = 0; continue; }
    const [r, g, b] = hexToRGB(hex);
    idata.data[i] = r; idata.data[i + 1] = g; idata.data[i + 2] = b; idata.data[i + 3] = 255;
  }
  c.putImageData(idata, 0, 0);
  pxCache[key] = cvs; return cvs;
}
// PNG data-URI of a pixel sprite (for embedding in HTML, e.g. class-select cards)
function pxDataURL(group, name) {
  try { const c = matrixCanvas(group + ':' + name, PX[group]?.[name]); return c && c.toDataURL ? c.toDataURL() : ''; } catch { return ''; }
}
const itemIconImg = (id, sz = 24) => `<img src="${pxDataURL('item', ITEM_ICON[id] || 'gem')}" width="${sz}" height="${sz}" style="image-rendering:pixelated;vertical-align:middle;flex:0 0 ${sz}px" alt="">`;
// draw a pixel sprite centered at (cx,cy), nearest-neighbor upscaled to `size`; flip = mirror horizontally
function drawPx(group, name, cx, cy, size, flip, state = 'idle', frame = 0) {
  let rows = PX[group]?.[name]; if (!rows) return false;
  let key = group + ':' + name;
  if (!Array.isArray(rows)) {                                  // frame-set object {idle/walk/attack:[frames]}
    const st = rows[state] ? state : 'idle';
    const frames = rows[st]; if (!frames?.length) return false;
    const fi = ((frame % frames.length) + frames.length) % frames.length;   // safe for negative frame (debugAnim abuse)
    rows = frames[fi]; key += ':' + st + ':' + fi;
  }
  const cvs = matrixCanvas(key, rows);
  if (!cvs.width) return false;
  // aspect-aware: fit width to `size`, anchor feet at the old square's bottom line.
  // square sprites (all NPCs/monsters) → dh === size → pixel-identical to before; taller sprites grow upward.
  const scale = size / cvs.width, dw = size, dh = cvs.height * scale;
  const top = Math.round(cy + size / 2 - dh);
  if (flip) {
    ctx.save(); ctx.translate(Math.round(cx), 0); ctx.scale(-1, 1);
    ctx.drawImage(cvs, Math.round(-dw / 2), top, dw, dh); ctx.restore();
  } else ctx.drawImage(cvs, Math.round(cx - dw / 2), top, dw, dh);
  return true;
}

// ---- LPC spritesheet rendering (players/NPCs); pixel matrices remain the fallback ----
const lpcCache = {};
function lpcImage(src) {
  if (!src || typeof Image === 'undefined') return null;      // headless-safe
  let img = lpcCache[src];
  if (!img) { img = new Image(); img.src = src; lpcCache[src] = img; }
  return img.complete && img.naturalWidth ? img : null;
}
function drawLpc(src, cx, cy, state, dir, frame, size) {
  const img = lpcImage(src); if (!img) return false;
  const st = LPC.states[state] || LPC.states.walk;
  const row = st.row + (st.downOnly ? 0 : LPC.dirs.indexOf(dir));
  const f = Math.min(frame, st.frames - 1);
  const c = LPC.cell;
  ctx.drawImage(img, f * c, row * c, c, c, Math.round(cx - size / 2), Math.round(cy - size + c * 0.28), size, size);
  return true;
}
function facingDir(p) {
  const { x, y } = p.facing;
  return Math.abs(x) >= Math.abs(y) ? (x < 0 ? 'left' : 'right') : (y < 0 ? 'up' : 'down');
}
const ANIM = { walkMs: 90, attackMs: 340, castMs: 420, hurtMs: 200, idleMs: 600 };
function playerAnim(p) {
  if (G.debugAnim) return { state: G.debugAnim.state, dir: G.debugAnim.dir || 'down', frame: G.debugAnim.frame | 0 };
  const t = now(), dir = facingDir(p);
  if (p.hurtUntil > t) return { state: 'hurt', dir, frame: Math.floor((ANIM.hurtMs - (p.hurtUntil - t)) / (ANIM.hurtMs / 3)) };
  if (p.animCastUntil > t) return { state: 'cast', dir, frame: Math.floor((ANIM.castMs - (p.animCastUntil - t)) / (ANIM.castMs / 7)) };
  if (p.animAttackUntil > t) return { state: 'attack', dir, frame: Math.floor((ANIM.attackMs - (p.animAttackUntil - t)) / (ANIM.attackMs / 6)) };
  if (p.moving) return { state: 'walk', dir, frame: 1 + Math.floor(t / ANIM.walkMs) % 8 };
  return { state: 'walk', dir, frame: 0 };                    // walk frame 0 = standing idle
}
// monster equivalent of playerAnim — no `dir`, just state/frame (monster frame-sets are flip-only, no 4-way facing)
function monsterAnim(m) {
  if (G.debugAnim) return { state: G.debugAnim.state, frame: G.debugAnim.frame | 0 };
  const t = now();
  if (m.animAttackUntil > t) return { state: 'attack', frame: (m.animAttackUntil - t) > 150 ? 0 : 1 };
  if (t - (m.movedAt || 0) < 120) return { state: 'walk', frame: Math.floor(t / 180) % 2 };
  return { state: 'idle', frame: Math.floor(t / 600) % 2 };
}

// ---- procedural 16×16 pixel tiles (deterministic, cached offscreen canvases) ----
const tileCache = {};
const TILE_PHASES = Object.freeze({ water: 4, grass: 2, tree: 2 });
const TILE_PHASE_MS = Object.freeze({ water: 260, grass: 420, tree: 420 });
const reducedMotionQuery = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
const prefersReducedMotion = () => !!reducedMotionQuery?.matches;
const hash2 = (x, y) => { const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); };
function buildTile(type, phase = 0) {
  const phases = TILE_PHASES[type] || 1;
  phase = ((phase % phases) + phases) % phases;
  const cacheKey = `${type}:${phase}`;
  if (tileCache[cacheKey]) return tileCache[cacheKey];
  const N = 16, cvs = document.createElement('canvas'); cvs.width = N; cvs.height = N;
  const c = cvs.getContext('2d');
  if (!c?.fillRect) { tileCache[cacheKey] = cvs; return cvs; } // headless-safe
  const put = (x, y, hex, wd = 1, ht = 1) => { c.fillStyle = hex; c.fillRect(x, y, wd, ht); };
  const P = PAL;
  if (type === 'grass' || type === 'bush') {
    put(0, 0, P.f, N, N);
    // FF5-style: tonal clumps + scattered grass blades, not flat noise
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const r = hash2(x, y); if (r > 0.90) put(x, y, P.j); else if (r < 0.14) put(x, y, P.F); }
    const sway = type === 'grass' && phase === 1 ? 1 : 0;
    [[3, 12], [4, 11], [8, 14], [12, 7], [13, 6], [6, 5], [10, 10]].forEach(([x, y], i) => {
      const dx = i % 2 ? -sway : sway;
      put(x + dx, y, P.j); put(x + dx, y - 1, P.g);
    });
    if (type === 'grass' && phase === 1) { put(2, 3, P.F); put(14, 12, P.j); put(9, 4, P.g); }
    if (type === 'bush') { c.fillStyle = P.G; c.beginPath(); c.arc(8, 10, 5, 0, 7); c.fill(); c.fillStyle = P.g; c.fillRect(6, 8, 2, 2); c.fillRect(10, 9, 2, 2); c.fillStyle = P.k; c.fillRect(3, 14, 10, 1); }
  } else if (type === 'water') {
    for (let y = 0; y < N; y++) put(0, y, (y % 4 < 2) ? P.v : P.V, N, 1);        // banded depth
    const wave = (phase * 4) % N, counter = (12 - phase * 3 + N) % N;
    for (let y = 1; y < N; y += 4) { put(wave, y, P.C, 4, 1); put(counter, y + 2, P.C, 4, 1); }
    put((3 + phase * 2) % 13, 2, '#bfe3f5', 3, 1);
    put((10 - phase * 2 + N) % 14, 6, '#bfe3f5', 2, 1);
    put((5 + phase * 3) % 13, 11, '#bfe3f5', 3, 1); // moving sun glints
  } else if (type === 'road') {
    put(0, 0, '#81745e', N, N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const r = hash2(x + 5, y + 9); if (r > 0.88) put(x, y, '#a09070'); else if (r < 0.08) put(x, y, '#655b4c'); }
    [[1, 1], [7, 2], [11, 6], [3, 9], [9, 11]].forEach(([x, y]) => { put(x, y, '#686157', 3, 2); put(x, y, '#a49a87', 3, 1); });
  } else if (type === 'floor') {
    put(0, 0, '#575962', N, N);
    c.strokeStyle = '#383b43'; c.lineWidth = 1; c.strokeRect(0.5, 0.5, N - 1, N - 1); c.beginPath(); c.moveTo(8, 0); c.lineTo(8, 16); c.moveTo(0, 8); c.lineTo(16, 8); c.stroke();
    put(0, 0, '#747781', N, 1); put(10, 9, '#343740', 1, 4); put(10, 12, '#434650', 3, 1);
  } else if (type === 'wall') {
    put(0, 0, '#46474c', N, N);
    for (let y = 0; y < N; y += 5) put(0, y, '#23262b', N, 1);
    for (let x = 0; x < N; x += 8) put(x, 0, '#292b30', 1, 5);
    for (let x = 4; x < N; x += 8) put(x, 5, '#292b30', 1, 5);
    for (let x = 0; x < N; x += 8) put(x, 10, '#292b30', 1, 6);
    put(0, 1, '#676970', N, 1); put(3, 6, '#52624d', 2, 1); put(12, 11, '#52624d', 2, 1);
  } else if (type === 'snow') {
    put(0, 0, '#e8eef2', N, N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const r = hash2(x + 3, y + 7); if (r > 0.9) put(x, y, '#ffffff'); else if (r < 0.08) put(x, y, '#cfdae6'); }
  } else if (type === 'ice') {
    put(0, 0, '#a9d6e5', N, N);
    c.strokeStyle = '#cdeaf5'; c.lineWidth = 1; c.beginPath(); c.moveTo(2, 5); c.lineTo(9, 12); c.moveTo(12, 3); c.lineTo(15, 9); c.moveTo(4, 13); c.lineTo(11, 15); c.stroke();
    put(0, 0, '#c6e6f0', N, 1);
  } else if (type === 'sand') {
    put(0, 0, '#8b705c', N, N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const r = hash2(x + 9, y + 2); if (r > 0.9) put(x, y, '#aa8a69'); else if (r < 0.09) put(x, y, '#5e5048'); }
    c.strokeStyle = '#645146'; c.beginPath(); c.moveTo(0, 6); c.bezierCurveTo(6, 4, 10, 8, 16, 6); c.moveTo(0, 12); c.bezierCurveTo(6, 10, 10, 14, 16, 12); c.stroke();
  } else if (type === 'lava') {
    put(0, 0, '#e2551f', N, N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const r = hash2(x + 1, y + 5); if (r > 0.82) put(x, y, '#ffd24d'); else if (r < 0.12) put(x, y, '#9e2f10'); }
  } else if (type === 'rock') {
    put(0, 0, '#6b5a4a', N, N);
    c.fillStyle = P.k; c.beginPath(); c.moveTo(2, 13); c.lineTo(3, 7); c.lineTo(6, 3); c.lineTo(11, 3); c.lineTo(14, 8); c.lineTo(13, 14); c.closePath(); c.fill();
    c.fillStyle = '#57493c'; c.beginPath(); c.moveTo(3, 12); c.lineTo(4, 7); c.lineTo(7, 4); c.lineTo(11, 4); c.lineTo(13, 8); c.lineTo(12, 13); c.closePath(); c.fill();
    c.fillStyle = '#7d6b58'; c.beginPath(); c.moveTo(4, 7); c.lineTo(7, 4); c.lineTo(10, 5); c.lineTo(8, 9); c.lineTo(4, 10); c.closePath(); c.fill();
    put(6, 5, '#a58d72', 3, 1); put(9, 10, '#3e352f', 3, 2); put(3, 14, P.k, 10, 1);
  } else if (type === 'void') {
    put(0, 0, '#111a2c', N, N);   // blue-black celestial cathedral floor
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const r = hash2(x + 2, y + 6); if (r > 0.96) put(x, y, '#f0d98b'); else if (r > 0.91) put(x, y, '#7891c2'); else if (r < 0.06) put(x, y, '#263653'); }
    put(0, 7, '#233452', N, 1); put(7, 0, '#233452', 1, N);
  } else if (type === 'voidrock') {
    put(0, 0, '#1b2740', N, N);
    c.fillStyle = '#344d78'; c.beginPath(); c.moveTo(8, 2); c.lineTo(13, 9); c.lineTo(8, 15); c.lineTo(3, 9); c.closePath(); c.fill();
    c.fillStyle = '#7891c2'; c.fillRect(7, 6, 2, 5); c.fillStyle = '#f0d98b'; c.fillRect(7, 4, 1, 2);
  } else if (type === 'tree') {
    put(0, 0, P.f, N, N);                                      // grass base
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { if (hash2(x, y) < 0.12) put(x, y, P.F); }
    put(6, 10, P.k, 4, 6); put(7, 10, P.N, 2, 5); put(7, 10, P.o, 1, 4);        // outlined trunk + root shadow
    c.fillStyle = P.k; c.beginPath(); c.arc(5, 7, 4.8, 0, 7); c.arc(10, 6, 5.2, 0, 7); c.arc(9, 10, 5.1, 0, 7); c.fill();
    c.fillStyle = P.G; c.beginPath(); c.arc(5, 7, 4, 0, 7); c.arc(10, 6, 4.4, 0, 7); c.arc(9, 10, 4.2, 0, 7); c.fill();
    c.fillStyle = P.F; c.beginPath(); c.arc(11, 10, 2.8, 0, 7); c.fill();
    c.fillStyle = P.g; c.beginPath(); c.arc(5, 5, 2.4, 0, 7); c.fill(); c.beginPath(); c.arc(9, 4, 2.1, 0, 7); c.fill();
    const shimmer = phase === 1 ? 1 : 0;
    c.fillStyle = P.j; [[4, 4], [8, 3], [11, 5], [6, 8]].forEach(([x, y], i) => c.fillRect(x + (i % 2 ? -shimmer : shimmer), y, 1, 1));
  } else if (type === 'cobble') {
    put(0, 0, '#5d6065', N, N);                                // cool mortar base
    const stones = [[1,1,4,3],[6,1,5,3],[12,1,3,3],[1,5,3,3],[5,5,4,3],[10,5,5,3],[1,9,5,3],[7,9,4,3],[12,9,3,3],[2,13,4,2],[7,13,5,2],[13,13,2,2]];
    for (const [x,y,w2,h2] of stones) { put(x, y, '#777b80', w2, h2); put(x, y, '#a7abb0', w2, 1); }
  } else if (type === 'plaza') {
    put(0, 0, '#8c8b85', N, N);                                // dressed guild-square stone
    c.strokeStyle = '#686a69'; c.lineWidth = 1; c.strokeRect(0.5, 0.5, N - 1, N - 1);
    c.beginPath(); c.moveTo(8, 0); c.lineTo(8, 16); c.moveTo(0, 8); c.lineTo(16, 8); c.stroke();
    put(0, 0, '#b1afa6', N, 1);
  } else if (type === 'roof') {
    put(0, 0, '#303b4b', N, N);                                // outlined northern slate
    put(0, 0, P.k, N, 1); put(0, 1, '#8290a3', N, 2);          // ridge cap
    for (let y = 4; y < N; y += 4) {
      put(0, y, '#18212d', N, 1); put(0, y + 1, '#657286', N, 1);
      for (let x = (y % 8 ? 4 : 0); x < N; x += 8) put(x, y + 1, '#202b38', 1, 3);
    }
    put(2, 3, '#4d5b6e', 5, 1); put(10, 7, '#4d5b6e', 4, 1);
  } else if (type === 'hwall') {
    put(0, 0, '#c4b48e', N, N);                                // plaster in a dark timber frame
    put(0, 0, P.k, N, 1); put(0, 1, '#8e7a5d', N, 2);
    for (const x of [0, 7, 15]) { put(x, 3, P.k, 2, N - 3); put(x + 1, 3, '#6a452c', 1, N - 3); }
    put(0, 8, P.k, N, 2); put(0, 9, '#6a452c', N, 1); put(0, N - 1, P.k, N, 1);
    for (let i = 2; i < 7; i++) { put(i, i + 2, '#8e6b48'); put(14 - i, i + 2, '#8e6b48'); }
  } else if (type === 'door') {
    put(0, 0, '#c4b48e', N, N); put(0, 0, P.k, N, 1); put(0, 1, '#8e7a5d', N, 2);
    put(3, 4, P.k, 10, 12); put(4, 4, '#59402d', 8, 12);
    for (const x of [6, 9]) put(x, 5, '#7b5737', 1, 10);       // vertical oak boards
    put(4, 8, '#2f211a', 8, 1); put(4, 13, '#2f211a', 8, 1);
    put(10, 10, P.y, 1, 2); put(10, 10, '#fff2a6');            // brass knob
  } else if (type === 'window') {
    put(0, 0, '#c4b48e', N, N); put(0, 0, P.k, N, 1); put(0, 1, '#8e7a5d', N, 2);
    put(2, 3, '#7d643f', 12, 11); put(3, 4, P.k, 10, 9);
    put(4, 5, '#e8a73f', 8, 7); put(5, 5, '#ffe39a', 5, 4);    // warm two-tone glow
    put(8, 5, P.N, 1, 7); put(4, 8, P.N, 8, 1);               // cross muntin
    put(2, 13, P.k, 12, 1); put(3, 14, P.n, 10, 1);           // outlined sill
  } else if (type === 'fence') {
    put(0, 0, P.f, N, N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { if (hash2(x, y) < 0.10) put(x, y, P.F); }
    put(0, 5, P.k, N, 4); put(0, 6, P.n, N, 2); put(0, 10, P.k, N, 3); put(0, 11, P.n, N, 1);
    for (const x of [2, 8, 14]) { put(x - 1, 2, P.k, 4, 13); put(x, 3, P.N, 2, 11); put(x, 3, P.o, 1, 10); put(x, 2, P.k, 2, 1); }
  } else if (type === 'hedge') {
    put(0, 0, P.f, N, N);
    c.fillStyle = P.k; c.beginPath(); c.arc(4, 8, 4, 0, 7); c.arc(8, 6, 5, 0, 7); c.arc(12, 8, 4, 0, 7); c.fill();
    c.fillStyle = P.G; c.beginPath(); c.arc(4, 8, 3.2, 0, 7); c.arc(8, 6, 4.2, 0, 7); c.arc(12, 8, 3.2, 0, 7); c.fill();
    c.fillStyle = P.g; [[4,6],[7,4],[10,6],[6,9],[12,9]].forEach(([x,y]) => c.fillRect(x, y, 2, 2));
    put(2, 12, P.k, 12, 2); put(3, 12, P.F, 10, 1);
  } else if (type === 'flowers') {
    put(0, 0, P.f, N, N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const r = hash2(x, y); if (r > 0.92) put(x, y, P.j); else if (r < 0.10) put(x, y, P.F); }
    const buds = [[3,4,P.r],[11,3,P.p],[6,9,P.y],[13,11,P.x],[2,12,P.p],[9,13,P.r],[8,6,P.x]];
    for (const [x,y,col] of buds) { put(x, y + 2, P.G, 1, 3); put(x - 1, y, P.k, 4, 3); put(x, y, col, 2, 2); put(x + 1, y, P.x); }
  } else if (type === 'fountain') {
    put(0, 0, '#8c8b85', N, N);                               // chapel-square base
    c.fillStyle = P.a; c.beginPath(); c.arc(8, 8, 7, 0, 7); c.fill();          // stone basin rim
    c.fillStyle = P.v; c.beginPath(); c.arc(8, 8, 5, 0, 7); c.fill();          // water
    c.fillStyle = P.C; c.beginPath(); c.arc(8, 8, 2.4, 0, 7); c.fill();        // spout splash
    c.fillStyle = P.A; c.fillRect(7, 7, 2, 2);                                 // center pillar
    c.strokeStyle = '#c2beb6'; c.lineWidth = 1; c.beginPath(); c.arc(8, 8, 7, 0, 7); c.stroke();
  } else if (type === 'townwall') {
    put(0, 0, '#777872', N, N);
    for (let y = 0; y < N; y += 5) put(0, y, '#4e514f', N, 1);
    for (let x = 0; x < N; x += 8) put(x, 0, '#4e514f', 1, 5);
    for (let x = 4; x < N; x += 8) put(x, 5, '#4e514f', 1, 5);
    put(0, 0, '#a0a39c', N, 1); put(2, 0, '#4e514f', 2, 2); put(9, 0, '#4e514f', 2, 2);
  } else if (type === 'gate') {
    put(0, 0, '#5d6065', N, N);                               // cobble underfoot (walkable)
    const stones = [[2,2,3,3],[6,2,4,3],[2,11,4,3],[10,11,4,3]];
    for (const [x,y,w2,h2] of stones) put(x, y, P.a, w2, h2);
    put(0, 0, '#7a7060', 2, N); put(N - 2, 0, '#7a7060', 2, N);   // gate jambs
    put(2, 0, P.o, 2, 2); put(12, 0, P.o, 2, 2);                  // raised portcullis wood
  } else if (type === 'lamp') {
    put(0, 0, '#5d6065', N, N);
    put(4, 1, 'rgba(255,210,92,.18)', 8, 8); put(5, 2, 'rgba(255,210,92,.24)', 6, 6); // pixel glow halo
    put(7, 6, '#252930', 2, 8); put(6, 13, P.k, 4, 2); put(7, 12, P.N, 2, 2);
    put(5, 2, P.k, 6, 6); put(6, 3, '#81572d', 4, 4); put(7, 3, P.y, 2, 3); put(7, 3, '#fff2c0');
  } else if (type === 'stall') {
    put(0, 0, '#81745e', N, N);
    put(0, 0, P.k, N, 1);
    for (let x = 0; x < N; x += 4) put(x, 1, '#842f3d', 2, 4); // oxblood guild awning
    for (let x = 2; x < N; x += 4) put(x, 1, '#d8cfb8', 2, 4);
    put(0, 5, P.k, N, 2); put(1, 5, P.N, N - 2, 1);            // outlined awning trim
    put(0, 8, P.k, N, 6); put(1, 9, P.n, N - 2, 4); put(1, 9, P.o, N - 2, 1); // wooden counter
    put(3, 6, P.g, 2, 2); put(7, 6, P.r, 2, 2); put(11, 6, P.y, 2, 2);   // goods on display
  } else if (type === 'bridge') {
    for (let y = 0; y < N; y++) put(0, y, (y % 4 < 2) ? P.v : P.V, N, 1);   // water beneath
    put(0, 1, P.k, N, 3); put(0, 13, P.k, N, 3);              // hard rail outline
    put(0, 2, P.o, N, 1); put(0, 14, P.o, N, 1);
    for (let x = 0; x < N; x += 3) { put(x, 4, P.k, 1, 9); put(x + 1, 4, P.n, 2, 9); put(x + 1, 4, P.o, 1, 9); }
  } else { // fallback flat
    put(0, 0, P.f, N, N);
  }
  tileCache[cacheKey] = cvs; return cvs;
}
function drawTile(type, x, y) {
  const phase = G.debugTilePhase != null
    ? G.debugTilePhase
    : (prefersReducedMotion() ? 0 : Math.floor(now() / (TILE_PHASE_MS[type] || 1000)));
  const cvs = buildTile(type, phase);
  if (!cvs.width) return false;
  ctx.drawImage(cvs, Math.floor(x), Math.floor(y), TS + 1, TS + 1);
  return true;
}

// Small direct overdraws soften the most visible terrain seams without
// obscuring the readable walk grid. Edge pixels stay inside the current tile.
function drawTileEdges(type, col, row, x, y) {
  const neighbors = [
    { dc: 0, dr: -1, dir: 'top' }, { dc: 1, dr: 0, dir: 'right' },
    { dc: 0, dr: 1, dir: 'bottom' }, { dc: -1, dr: 0, dir: 'left' },
  ];
  let drawn = 0;
  const band = (dir, color, thickness = 2, dotted = false) => {
    ctx.fillStyle = color;
    const horizontal = dir === 'top' || dir === 'bottom';
    const bx = dir === 'right' ? x + TS - thickness : x;
    const by = dir === 'bottom' ? y + TS - thickness : y;
    ctx.fillRect(Math.floor(bx), Math.floor(by), horizontal ? TS : thickness, horizontal ? thickness : TS);
    if (dotted) {
      ctx.fillStyle = '#dff2ff';
      for (let p = 4; p < TS; p += 9) {
        const dx = horizontal ? x + p : (dir === 'right' ? x + TS - 1 : x);
        const dy = horizontal ? (dir === 'bottom' ? y + TS - 1 : y) : y + p;
        ctx.fillRect(Math.floor(dx), Math.floor(dy), horizontal ? 3 : 1, horizontal ? 1 : 3);
      }
    }
    drawn++;
  };
  for (const n of neighbors) {
    const neighborInfo = G.legend[tileChar(col + n.dc, row + n.dr)];
    const other = neighborInfo?.type;
    if (!other || other === type) continue;
    if (type === 'water' && other !== 'bridge') band(n.dir, '#e8dcae', 2, true);
    else if (type === 'road' && (other === 'grass' || other === 'bush')) band(n.dir, '#3f7d3a', 2);
    else if ((type === 'snow' && other === 'grass') || (type === 'grass' && other === 'snow')) band(n.dir, '#9eabbc', 1);
    else if ((type === 'lava' && other === 'rock') || (type === 'rock' && other === 'lava')) band(n.dir, '#612817', 1);
  }
  return drawn;
}

// Cached procedural backdrop strips: two cloud bands share one canvas, then
// mountains and treeline scroll at progressively faster parallax rates.
const parallaxCache = {};
function buildParallaxStrip(kind) {
  if (parallaxCache[kind]) return parallaxCache[kind];
  const sizes = { clouds: [512, 190], mountains: [512, 190], trees: [512, 130] };
  const [w, h] = sizes[kind];
  const cvs = document.createElement('canvas'); cvs.width = w; cvs.height = h;
  const c = cvs.getContext('2d');
  if (!c?.fillRect) { parallaxCache[kind] = cvs; return cvs; }
  c.clearRect(0, 0, w, h);
  if (kind === 'clouds') {
    const cloud = (x, y, scale, color) => {
      c.fillStyle = color;
      c.fillRect(x, y + 8 * scale, 42 * scale, 8 * scale);
      c.fillRect(x + 8 * scale, y + 3 * scale, 24 * scale, 10 * scale);
      c.fillRect(x + 16 * scale, y, 10 * scale, 8 * scale);
    };
    cloud(22, 26, 2, 'rgba(239,246,245,.38)'); cloud(286, 88, 1, 'rgba(231,241,239,.30)');
    cloud(402, 22, 1, 'rgba(255,244,218,.30)'); cloud(156, 132, 1, 'rgba(226,238,236,.23)');
  } else if (kind === 'mountains') {
    c.fillStyle = '#263b4e'; c.beginPath(); c.moveTo(0, h); c.lineTo(0, 130); c.lineTo(78, 48); c.lineTo(130, 116); c.lineTo(218, 30); c.lineTo(306, 126); c.lineTo(394, 57); c.lineTo(512, 138); c.lineTo(512, h); c.closePath(); c.fill();
    c.fillStyle = '#39536a'; c.beginPath(); c.moveTo(60, 132); c.lineTo(78, 48); c.lineTo(102, 105); c.lineTo(132, 116); c.lineTo(218, 30); c.lineTo(245, 94); c.lineTo(394, 57); c.lineTo(420, 92); c.lineTo(512, 140); c.lineTo(512, h); c.lineTo(0, h); c.closePath(); c.fill();
    c.fillStyle = '#90a8b4'; [[72,55,18],[207,38,24],[385,65,18]].forEach(([x,y,w2]) => c.fillRect(x, y, w2, 5));
  } else {
    c.fillStyle = '#183426'; c.fillRect(0, 82, w, h - 82);
    for (let x = 0; x < w; x += 18) {
      const top = 25 + Math.floor(hash2(x, 41) * 42);
      c.fillStyle = '#10291d'; c.fillRect(x + 7, top + 18, 4, h - top);
      c.beginPath(); c.moveTo(x, top + 32); c.lineTo(x + 9, top); c.lineTo(x + 18, top + 32); c.closePath(); c.fill();
      c.fillStyle = '#2b5335'; c.fillRect(x + 3, top + 24, 12, 5);
    }
  }
  parallaxCache[kind] = cvs; return cvs;
}
function drawParallax(cx = 0, cy = 0) {
  if (!ctx) return false;
  const sky = ctx.createLinearGradient?.(0, 0, 0, CANVAS_H);
  if (sky?.addColorStop) { sky.addColorStop(0, '#6989a3'); sky.addColorStop(0.55, '#9db7b5'); sky.addColorStop(1, '#d7c38f'); ctx.fillStyle = sky; }
  else ctx.fillStyle = '#6989a3';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  const drawStrip = (kind, y, factor, drift = 0) => {
    const strip = buildParallaxStrip(kind);
    if (!strip?.width) return;
    const offset = ((cx * factor + drift) % strip.width + strip.width) % strip.width;
    for (let x = -offset; x < CANVAS_W; x += strip.width) ctx.drawImage(strip, Math.floor(x), Math.floor(y - cy * factor * 0.04));
  };
  drawStrip('clouds', 18, 0.10, prefersReducedMotion() ? 0 : now() / 40000 * 512);
  drawStrip('mountains', CANVAS_H - 290, 0.25);
  drawStrip('trees', CANVAS_H - 130, 0.50);
  return true;
}
function preloadSprites() {
  for (const [group, set] of Object.entries(PX)) for (const [name, rows] of Object.entries(set)) {
    if (!rows) continue;                                        // malformed — selfCheck reports it cleanly, don't throw here
    if (Array.isArray(rows)) { matrixCanvas(group + ':' + name, rows); continue; }
    for (const [st, frames] of Object.entries(rows)) {
      if (!Array.isArray(frames)) continue;                     // malformed — selfCheck reports it cleanly, don't throw here
      frames.forEach((f, fi) => { if (Array.isArray(f)) matrixCanvas(`${group}:${name}:${st}:${fi}`, f); });
    }
  }
  ['grass', 'bush', 'water', 'road', 'floor', 'wall', 'tree', 'snow', 'ice', 'sand', 'lava', 'rock', 'void', 'voidrock',
   'cobble', 'plaza', 'roof', 'hwall', 'door', 'window', 'fence', 'hedge', 'flowers', 'fountain',
   'townwall', 'gate', 'lamp', 'stall', 'bridge'].forEach(type => {
     for (let phase = 0; phase < (TILE_PHASES[type] || 1); phase++) buildTile(type, phase);
   });
  ['clouds', 'mountains', 'trees'].forEach(buildParallaxStrip);
}

function render() {
  const p = G.player;
  // camera — a narrow overscan reveals the parallax beyond authored map edges.
  const mapW = G.map.width * TS, mapH = G.map.height * TS;
  const edgeReveal = TS * 2;
  G.cam.x = clamp(p.x - CANVAS_W / 2, -edgeReveal, Math.max(0, mapW - CANVAS_W) + edgeReveal);
  G.cam.y = clamp(p.y - CANVAS_H / 2, -edgeReveal, Math.max(0, mapH - CANVAS_H) + edgeReveal);
  const cx = G.cam.x, cy = G.cam.y;

  ctx.imageSmoothingEnabled = false;   // crisp pixel-art upscaling
  drawParallax(cx, cy);

  // tiles — pixel-art texture per legend type, flat-color fallback
  const col0 = Math.floor(cx / TS), row0 = Math.floor(cy / TS);
  for (let row = row0; row <= row0 + CANVAS_H / TS + 1; row++) {
    for (let col = col0; col <= col0 + CANVAS_W / TS + 1; col++) {
      if (row < 0 || col < 0 || row >= G.map.height || col >= G.map.width) continue;
      const ch = tileChar(col, row), info = G.legend[ch];
      if (!info) continue;
      const x = col * TS - cx, y = row * TS - cy;
      if (!drawTile(info.type, x, y)) { ctx.fillStyle = info.color; ctx.fillRect(x, y, TS, TS); }
      drawTileEdges(info.type, col, row, x, y);
      if (ch === 'P') { ctx.fillStyle = 'rgba(224,182,76,.30)'; ctx.fillRect(x, y, TS, TS); }
      else if (ch === 'B') { ctx.fillStyle = 'rgba(180,40,40,.30)'; ctx.fillRect(x, y, TS, TS); }
    }
  }

  // portals — glowing pad + label ring
  for (const pt of G.portals) {
    const x = pt.x * TS - cx + TS / 2, y = pt.y * TS - cy + TS / 2;
    ctx.strokeStyle = THEME.palette.accentAlt; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x, y, TS / 2 + 2 * Math.sin(now() / 250), 0, 7); ctx.stroke();
  }

  drawGroundEffects();

  // ---- entities: depth-sorted (2.5D overlap) with ground shadows ----
  const drawables = [];
  for (const n of G.npcs) drawables.push({ y: n.y * TS + TS / 2, draw: () => drawNpc(n, cx, cy) });
  for (const m of G.monsters) if (m.alive) drawables.push({ y: m.y, draw: () => drawMonster(m, cx, cy) });
  drawables.push({ y: p.y, draw: () => drawPlayer(p, cx, cy) });
  drawables.sort((a, b) => a.y - b.y);
  for (const d2 of drawables) d2.draw();

  drawEffects();   // attack/spell visual effects on top
  drawAtmosphere();
  drawDayNight();
}

// day/night tint riding the world clock: day → amber dusk → blue night → dawn
function drawDayNight() {
  const ph = G.dayPhaseOverride ?? (now() % TUNING.dayCycleMs) / TUNING.dayCycleMs;
  const nightA = ph < 0.45 ? 0 : ph < 0.55 ? (ph - 0.45) * 10 * 0.32 : ph < 0.9 ? 0.32 : (1 - ph) * 10 * 0.32;
  if (nightA > 0.001) { ctx.fillStyle = `rgba(14,22,58,${nightA.toFixed(3)})`; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H); }
  const duskA = ph > 0.42 && ph < 0.58 ? (1 - Math.abs(ph - 0.5) / 0.08) * 0.10 : 0;
  if (duskA > 0.001) { ctx.fillStyle = `rgba(255,138,40,${duskA.toFixed(3)})`; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H); }
}

// Region weather uses crisp pixel clusters and streaks so the scene keeps its
// SNES-era readability instead of becoming a soft particle overlay.
function drawAtmosphere() {
  const t = now() / 1000;
  ctx.save();
  if (G.mapId === 'whispering_woods') {
    ctx.fillStyle = 'rgba(8,28,15,.10)'; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    for (let i = 0; i < 14; i++) {
      const x = (hash2(i, 31) * CANVAS_W + t * (5 + i % 3)) % CANVAS_W;
      const y = (hash2(i, 47) * CANVAS_H + t * (8 + i % 4)) % CANVAS_H;
      ctx.fillStyle = i % 3 ? 'rgba(145,181,92,.34)' : 'rgba(213,188,92,.34)'; ctx.fillRect(x | 0, y | 0, 3, 2);
    }
  } else if (G.mapId === 'sunken_ruins') {
    ctx.fillStyle = 'rgba(15,18,27,.14)'; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    for (let i = 0; i < 18; i++) {
      const x = (hash2(i, 73) * CANVAS_W + t * (2 + i % 2)) % CANVAS_W;
      const y = (hash2(i, 91) * CANVAS_H + Math.sin(t + i) * 5) % CANVAS_H;
      ctx.fillStyle = 'rgba(194,190,164,.28)'; ctx.fillRect(x | 0, y | 0, 1 + i % 2, 1 + i % 2);
    }
  } else if (G.mapId === 'frostpeak_tundra') {
    ctx.strokeStyle = 'rgba(239,248,255,.62)'; ctx.lineWidth = 1;
    for (let i = 0; i < 34; i++) {
      const x = (hash2(i, 17) * CANVAS_W + t * (18 + i % 5)) % CANVAS_W;
      const y = (hash2(i, 29) * CANVAS_H + t * (28 + i % 7)) % CANVAS_H;
      ctx.beginPath(); ctx.moveTo(x | 0, y | 0); ctx.lineTo((x + 4) | 0, (y + 2) | 0); ctx.stroke();
    }
  } else if (G.mapId === 'dragon_caldera') {
    ctx.fillStyle = 'rgba(70,18,10,.08)'; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    for (let i = 0; i < 24; i++) {
      const x = (hash2(i, 53) * CANVAS_W + Math.sin(t + i) * 9 + CANVAS_W) % CANVAS_W;
      const y = CANVAS_H - ((hash2(i, 67) * CANVAS_H + t * (22 + i % 8)) % CANVAS_H);
      ctx.fillStyle = i % 4 ? 'rgba(240,105,43,.58)' : 'rgba(255,210,77,.72)'; ctx.fillRect(x | 0, y | 0, 2, 2);
    }
  } else if (G.mapId === 'astral_rift') {
    for (let i = 0; i < 24; i++) {
      const x = (hash2(i, 101) * CANVAS_W) | 0, y = (hash2(i, 113) * CANVAS_H) | 0;
      const a = 0.25 + Math.abs(Math.sin(t * (1 + i % 3) + i)) * 0.55;
      ctx.fillStyle = `rgba(194,216,255,${a.toFixed(2)})`; ctx.fillRect(x, y, 1, 3); ctx.fillRect(x - 1, y + 1, 3, 1);
    }
  }
  ctx.restore();
}

function groundShadow(x, y, rx) {
  ctx.fillStyle = 'rgba(0,0,0,.30)';
  ctx.beginPath(); ctx.ellipse(x, y, rx, rx * 0.42, 0, 0, 7); ctx.fill();
}
const NPC_ROLE = {
  shop:  { label: 'Trader',       mark: '◆', color: '#74d6ef' },
  guild: { label: 'Guild Master', mark: '◆', color: '#e6bd54' },
  quest: { label: 'Quest Guide',  mark: '◆', color: '#7bd88f' },
  story: { label: 'Lorekeeper',   mark: '◆', color: '#c99aef' },
};
function drawNpc(n, cx, cy) {
  const x = n.x * TS - cx + TS / 2, y = n.y * TS - cy + TS / 2;
  groundShadow(x, y + 14, 11);
  if (!drawLpc(LPC.npc[n.role], x, y + 8, 'walk', 'down', Math.floor(now() / 800) % 2, 64)) {
    if (!drawPx('npc', n.role, x, y, 32)) { ctx.fillStyle = n.color; ctx.beginPath(); ctx.arc(x, y, 11, 0, 7); ctx.fill(); }
  }
  const role = NPC_ROLE[n.role] || NPC_ROLE.quest;
  labelText(T(n.name, 'npcs'), x, y - 34, '#fff4d6', 'bold 11px sans-serif');
  labelText(`${role.mark} ${T(n.title || role.label, 'npcs')}`, x, y - 23, role.color, '9px sans-serif');
}
function monsterNameColor(m) {
  const lv = m.lvl || m.def.level;
  if (m.def.sizeTiles >= 2) return '#ff5555';       // boss → red
  if (lv >= 13) return '#c77dff';                    // elite → purple
  if (lv >= 8) return '#f0a83c';                     // strong → orange
  return '#e8dfc8';                                  // normal
}
function drawMonster(m, cx, cy) {
  const x = m.x - cx, y = m.y - cy, s = m.size * 1.15;
  groundShadow(x, y + s * 0.42, s * 0.4);
  if (m.enraged) {   // pulsing red aura while enraged
    ctx.strokeStyle = '#ff3b2f'; ctx.lineWidth = 2 + Math.abs(Math.sin(now() / 110)) * 2;
    ctx.globalAlpha = 0.75; ctx.beginPath(); ctx.arc(x, y, s * 0.62, 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
  }
  const a = monsterAnim(m);
  // legacy matrices aren't left-right symmetric (one-sided markings) — only frame-set
  // art (Tasks 5-9) is drawn flip-aware; flipping a legacy monster would visibly mirror it.
  const flip = Array.isArray(PX.monster[m.def.id]) ? false : m.facingLeft;
  if (!drawPx('monster', m.def.id, x, y, s, flip, a.state, a.frame)) { ctx.fillStyle = m.def.spriteColor; ctx.fillRect(x - s / 2, y - s / 2, s, s); }
  if (m === G.target) { ctx.strokeStyle = THEME.palette.danger; ctx.lineWidth = 2; ctx.strokeRect(x - s / 2 - 3, y - s / 2 - 3, s + 6, s + 6); }
  const w = s, hpw = w * (m.hp / m.maxHp);
  ctx.fillStyle = '#000'; ctx.fillRect(x - w / 2, y - s / 2 - 8, w, 4);
  ctx.fillStyle = THEME.palette.hpRed; ctx.fillRect(x - w / 2, y - s / 2 - 8, hpw, 4);
  // name label — level prefix + boss/elite colour-coding
  const boss = m.def.sizeTiles >= 2;
  const label = `Lv${m.lvl} ${boss ? '☠ ' : ''}${T(m.def.name, 'monsters')}`;
  labelText(label, x, y - s / 2 - 12, monsterNameColor(m), boss ? 'bold 12px sans-serif' : '10px sans-serif');
  const statusName = { stun: 'STUN', burn: 'BURN', slow: 'SLOW', mark: 'MARK', sunder: 'BROKEN' };
  const statuses = Object.keys(m.statuses).filter(id => liveStatus(m, id) && statusName[id]).map(id => statusName[id]);
  if (statuses.length) labelText(statuses.join(' · '), x, y - s / 2 - 24, '#9fe6ff', 'bold 8px sans-serif');
}
function drawPlayer(p, cx, cy) {
  const px = p.x - cx, py = p.y - cy;
  groundShadow(px, py + 15, 11);
  if (p.buffs.some(b => b.until > now())) { ctx.strokeStyle = THEME.palette.accentAlt; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(px, py + 4, 18, 0, 7); ctx.stroke(); }
  const a = playerAnim(p);
  if (drawLpc(LPC.player[p.combatClass], px, py + 8, a.state, a.dir, a.frame, 64)) { /* skip matrix path */ } else {
    const moving = p.moving, group = (moving && Math.floor(now() / 140) % 2 === 1) ? 'playerWalk' : 'player';
    const bob = moving ? -Math.abs(Math.sin(now() / 90)) * 2 : 0;
    if (!drawPx(group, p.combatClass, px, py + bob, 36, p.facing.x < 0)) {
      const col = { blade: '#c9d1e0', berserker: '#e0714b', mage: '#6f7bef', ranger: '#5fbf7a', paladin: '#f0e6c0' }[p.combatClass];
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(px, py, 13, 0, 7); ctx.fill();
    }
  }
}
// text with a dark outline for readability over any tile
function labelText(txt, x, y, color, font) {
  ctx.font = font; ctx.textAlign = 'center';
  ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.85)'; ctx.strokeText(txt, x, y);
  ctx.fillStyle = color; ctx.fillText(txt, x, y);
}

// =====================================================================
// ATTACK / SPELL EFFECTS
// =====================================================================
const FX_COLOR = { arcane_bolt: '#8fe6ff', flame_burst: '#ff8b3d', frost_chains: '#bfe6ff',
  piercing_shot: '#fff2b0', arrow_rain: '#fff2b0', shockwave: '#d7dcff', whirl_reap: '#ffb27a',
  rift_slash: '#eaf2ff', reckless_hew: '#ff9a6a',
  // tree-filler skills
  sunder: '#eaf2ff', quake: '#d8c9a0', titan_slam: '#ffd9a0',
  savage_leap: '#ff9a6a', cleaving_storm: '#ffb27a', decapitate: '#ff6a4a',
  ice_lance: '#bfe6ff', chain_lightning: '#c7a0ff', blizzard: '#dff2ff',
  twin_shot: '#fff2b0', snare_trap: '#c9e6a0', explosive_arrow: '#ff8b3d', falcon_strike: '#ffe14d',
  righteous_strike: '#ffe9a8', divine_wrath: '#ffd24d' };
const fx = o => { o.born = now(); G.effects.push(o); };
const spawnSlash = (x, y, color, r = 20) => fx({ kind: 'slash', x, y, color, r, life: 200 });
const spawnBolt = (x0, y0, x1, y1, color, core, big) => fx({ kind: 'bolt', x0, y0, x1, y1, color, core, big, life: Math.max(140, dist(x0, y0, x1, y1) / 0.7) });
const spawnRing = (x, y, r, color, delay) => fx({ kind: 'ring', x, y, r, color, delay, life: 320 });
const spawnBurst = (x, y, color, r = 18) => fx({ kind: 'burst', x, y, r, r0: 2, color, life: 260 });
const spawnRain = (x, y, r, color) => fx({ kind: 'rain', x, y, r, color, life: 620 });        // streaks falling into the radius
const spawnCrack = (x, y, r, color) => fx({ kind: 'crack', x, y, r, color, life: 420 });      // radial ground fissures
const spawnZap = (x0, y0, x1, y1, color) => fx({ kind: 'zap', x0, y0, x1, y1, color, life: 300 }); // jagged lightning
const spawnCross = (x, y, color) => fx({ kind: 'cross', x, y, r: 22, color, life: 430 });     // holy cross flash
const spawnAura = (x, y, r, color, life) => fx({ kind: 'aura', x, y, r, color, life });       // persistent ground zone

// per-skill FX families (anything unlisted falls back to its type's default)
const FX_RAIN  = new Set(['meteor', 'blizzard', 'star_fall', 'arrow_rain']);
const FX_NOVA  = new Set(['arcane_nova', 'divine_wrath', 'dawnbreaker', 'world_cleaver']);
const FX_QUAKE = new Set(['shockwave', 'quake', 'apocalypse', 'cleaving_storm', 'whirl_reap', 'consecrate']);
const FX_ZAP   = new Set(['chain_lightning']);
const FX_HOLY  = new Set(['smite', 'righteous_strike', 'blessing', 'holy_shield', 'lay_on_hands', 'sanctuary']);

// spawn the right visual for a skill toward (tx,ty)
function skillFx(sk, tx, ty) {
  const p = G.player, col = FX_COLOR[sk.id] || '#ffffff';
  if (sk.id === 'hunters_mark') {
    spawnBolt(p.x, p.y, tx, ty, '#7bd88f', '#ffffff'); spawnRing(tx, ty, TS * 0.8, '#7bd88f');
    return;
  }
  if (sk.type === 'buff') {
    spawnRing(p.x, p.y, TS * 1.3, col === '#ffffff' ? '#e6bd54' : col);
    if (FX_HOLY.has(sk.id)) spawnCross(p.x, p.y - 4, '#ffe9a8');
    return;
  }
  if (sk.type === 'aoe') {
    const R = sk.radius * TS;
    if (FX_ZAP.has(sk.id)) { spawnZap(p.x, p.y, tx, ty, col); spawnRing(tx, ty, R, col); spawnBurst(tx, ty, '#ffffff', 14); }
    else if (FX_RAIN.has(sk.id)) { spawnRain(tx, ty, R, col); spawnRing(tx, ty, R, col, 180); }
    else if (FX_NOVA.has(sk.id)) { spawnBurst(tx, ty, col, 24); spawnRing(tx, ty, R * 0.6, '#ffffff'); spawnRing(tx, ty, R, col, 130); }
    else if (FX_QUAKE.has(sk.id)) { spawnCrack(tx, ty, R, col); spawnRing(tx, ty, R, col); }
    else if (sk.id === 'flame_burst') { spawnBolt(p.x, p.y, tx, ty, '#ff8b3d', '#ffe14d', true); spawnRing(tx, ty, R, '#ff8b3d'); }
    else spawnRing(tx, ty, R, col);
    return;
  }
  if (sk.type === 'ranged') { spawnBolt(p.x, p.y, tx, ty, col, sk.id === 'arcane_bolt' ? '#ffffff' : null, sk.id !== 'piercing_shot'); return; }
  // melee: slash arc; heavy finishers double-arc; holy strikes flash a cross
  spawnSlash(tx, ty, col, 26);
  if (sk.power >= 2.7) spawnSlash(tx, ty, '#ffffff', 34);
  if (FX_HOLY.has(sk.id)) spawnCross(tx, ty, '#ffe9a8');
}

function drawGroundEffects() {
  const cx = G.cam.x, cy = G.cam.y;
  for (const e of G.effects) {
    if (e.kind !== 'aura') continue;
    const t = (now() - e.born) / e.life; if (t < 0 || t >= 1) continue;
    const x = e.x - cx, y = e.y - cy, pulse = 0.82 + Math.sin(now() / 180) * 0.08;
    ctx.save();
    ctx.globalAlpha = Math.min(0.28, (1 - t) * 0.55); ctx.fillStyle = e.color;
    ctx.beginPath(); ctx.ellipse(x, y + 8, e.r * pulse, e.r * 0.48 * pulse, 0, 0, 7); ctx.fill();
    ctx.globalAlpha = Math.min(0.85, (1 - t) * 1.5); ctx.strokeStyle = e.color; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(x, y + 8, e.r * pulse, e.r * 0.48 * pulse, 0, 0, 7); ctx.stroke();
    ctx.restore();
  }
}

function drawEffects() {
  if (!G.effects.length) return;
  const cx = G.cam.x, cy = G.cam.y, keep = [];
  for (const e of G.effects) {
    const t = (now() - e.born - (e.delay || 0)) / e.life;
    if (t < 0) { keep.push(e); continue; }               // delayed effect not started yet
    if (t >= 1) { if (e.kind === 'bolt') keep.push({ kind: 'burst', x: e.x1, y: e.y1, color: e.color, r: e.big ? 24 : 14, r0: 2, life: 240, born: now() }); continue; }
    if (e.kind === 'aura') { keep.push(e); continue; }    // rendered beneath entities by drawGroundEffects()
    ctx.save();
    if (e.kind === 'slash') {
      const x = e.x - cx, y = e.y - cy, a0 = -0.9 + t * 2.4;
      ctx.globalAlpha = 1 - t; ctx.strokeStyle = e.color; ctx.lineWidth = 5 * (1 - t) + 1; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(x, y, e.r, a0, a0 + 1.7); ctx.stroke();
    } else if (e.kind === 'bolt') {
      const lx = x => (e.x0 + (e.x1 - e.x0) * x) - cx, ly = y => (e.y0 + (e.y1 - e.y0) * y) - cy;
      ctx.globalAlpha = .45; ctx.fillStyle = e.color;
      ctx.beginPath(); ctx.arc(lx(Math.max(0, t - .14)), ly(Math.max(0, t - .14)), (e.big ? 6 : 4) * .8, 0, 7); ctx.fill();
      ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(lx(t), ly(t), e.big ? 6 : 4, 0, 7); ctx.fill();
      if (e.core) { ctx.fillStyle = e.core; ctx.beginPath(); ctx.arc(lx(t), ly(t), e.big ? 3 : 2, 0, 7); ctx.fill(); }
    } else if (e.kind === 'burst') {
      const x = e.x - cx, y = e.y - cy, r = e.r0 + (e.r - e.r0) * t;
      ctx.globalAlpha = 1 - t; ctx.fillStyle = e.color; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
      ctx.globalAlpha = (1 - t) * .9; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke();
    } else if (e.kind === 'ring') {
      const x = e.x - cx, y = e.y - cy;
      ctx.globalAlpha = 1 - t; ctx.strokeStyle = e.color; ctx.lineWidth = 5 * (1 - t) + 1;
      ctx.beginPath(); ctx.arc(x, y, e.r * t, 0, 7); ctx.stroke();
    } else if (e.kind === 'rain') {
      // 10 streaks fall into the radius, staggered by index (deterministic offsets)
      const x = e.x - cx, y = e.y - cy;
      ctx.strokeStyle = e.color; ctx.lineCap = 'round';
      for (let i = 0; i < 10; i++) {
        const ti = t * 1.5 - i * 0.055; if (ti <= 0 || ti >= 1) continue;
        const px = x + (hash2(i, e.born % 97) - 0.5) * e.r * 1.8;
        const py = y + (hash2(i + 31, e.born % 89) - 0.5) * e.r * 0.9;
        const drop = (1 - ti) * (e.r + 46);
        ctx.globalAlpha = Math.min(1, 2.5 * (1 - ti)); ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(px, py - drop - 13); ctx.lineTo(px, py - drop); ctx.stroke();
        if (ti > 0.88) { ctx.globalAlpha = 0.9; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(px, py, 2.5, 0, 7); ctx.fill(); }
      }
    } else if (e.kind === 'crack') {
      // radial ground fissures spreading outward
      const x = e.x - cx, y = e.y - cy, len = e.r * (0.35 + 0.65 * t);
      ctx.globalAlpha = 1 - t; ctx.strokeStyle = e.color; ctx.lineWidth = 3 * (1 - t) + 1; ctx.lineCap = 'round';
      for (let i = 0; i < 7; i++) {
        const a = i * 0.897 + 0.4, midA = a + 0.14, ex2 = x + Math.cos(a) * len, ey = y + Math.sin(a) * len * 0.55;
        ctx.beginPath(); ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(midA) * len * 0.5, y + Math.sin(midA) * len * 0.3);
        ctx.lineTo(ex2, ey); ctx.stroke();
      }
    } else if (e.kind === 'zap') {
      // jagged lightning that flickers, then the bolt-end burst comes from the ring/burst combo
      const flick = Math.floor(now() / 45) % 2 === 0;
      ctx.globalAlpha = (1 - t) * (flick ? 1 : 0.55);
      const segs = 5, dx2 = (e.x1 - e.x0) / segs, dy2 = (e.y1 - e.y0) / segs;
      const nx = -(e.y1 - e.y0), ny = e.x1 - e.x0, nl = Math.hypot(nx, ny) || 1;
      const jag = i => (i === 0 || i === segs) ? 0 : (hash2(i, e.born % 83) - 0.5) * 26;
      const pts = []; for (let i = 0; i <= segs; i++) pts.push([e.x0 + dx2 * i + (nx / nl) * jag(i) - cx, e.y0 + dy2 * i + (ny / nl) * jag(i) - cy]);
      ctx.strokeStyle = e.color; ctx.lineWidth = 3; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const [px, py] of pts.slice(1)) ctx.lineTo(px, py); ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const [px, py] of pts.slice(1)) ctx.lineTo(px, py); ctx.stroke();
    } else if (e.kind === 'cross') {
      // holy cross flash rising slightly
      const x = e.x - cx, y = e.y - cy - t * 8, s = e.r * (0.7 + 0.5 * t);
      ctx.globalAlpha = t < 0.25 ? t * 4 : 1 - (t - 0.25) / 0.75;
      ctx.strokeStyle = e.color; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x, y + s * 0.7); ctx.moveTo(x - s * 0.6, y - s * 0.35); ctx.lineTo(x + s * 0.6, y - s * 0.35); ctx.stroke();
      ctx.globalAlpha *= 0.5; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x, y + s * 0.7); ctx.moveTo(x - s * 0.6, y - s * 0.35); ctx.lineTo(x + s * 0.6, y - s * 0.35); ctx.stroke();
    }
    ctx.restore();
    keep.push(e);
  }
  G.effects = keep;
}

// =====================================================================
// MAIN LOOP
// =====================================================================
let last = 0;
function frame(t) {
  if (!G.running) return;
  const dt = Math.min(0.05, (t - last) / 1000); last = t;
  step(dt);
  render();
  renderMinimap();
  updateHud();
  requestAnimationFrame(frame);
}

function step(dt) {
  const p = G.player;
  // roaming rare boss world timer (first window arms lazily on the first frame)
  if (!G.nextRareBossAt) G.nextRareBossAt = now() + TUNING.rareBossEveryMs;
  else if (!G.rareBossMapId && now() >= G.nextRareBossAt) spawnRareBoss();
  // achievements poll (cheap declarative checks, one integration point)
  if (now() >= (G._nextAchAt || 0)) { G._nextAchAt = now() + 2000; checkAchievements(); }
  // prune buffs
  p.buffs = p.buffs.filter(b => b.until > now());
  // Momentum decays out of combat
  const _M = TUNING.momentum;
  if (p.momentum > 0 && now() - p.lastSkillAt > _M.decayMs) { p.momentum--; p.lastSkillAt = now(); }
  // Sanctuary is positional: its healing only applies while the caster remains inside.
  if (p.sanctuary) {
    if (now() >= p.sanctuary.until) p.sanctuary = null;
    else if (now() >= p.sanctuary.nextTick) {
      p.sanctuary.nextTick += 1000;
      if (dist(p.x, p.y, p.sanctuary.x, p.sanctuary.y) <= p.sanctuary.radius) {
        p.hp = clamp(p.hp + p.sanctuary.heal, 0, p.maxHp);
        floatText(p.x, p.y, '+' + p.sanctuary.heal, 'heal');
      }
    }
  }
  // regen a trickle of MP
  p.mp = clamp(p.mp + 3 * dt, 0, p.maxMp);
  // town rest: safe maps (no spawns) heal body and mind quickly
  if (!G.map.spawns.length) {
    p.hp = clamp(p.hp + p.maxHp * 0.06 * dt, 0, p.maxHp);
    p.mp = clamp(p.mp + p.maxMp * 0.06 * dt, 0, p.maxMp);
  }

  if (!G.manualIntent && G.huntTargetId && G.target && G.target.def.id !== G.huntTargetId) {
    G.target = null;
    G.targetSource = null;
    G.path = null;
  }
  if (G.autoFarm && !G.manualIntent && G.target && G.targetSource !== 'manual' && !autoHuntEligible(G.target, p)) {
    G.target = null;
    G.targetSource = null;
    G.path = null;
  }
  if (!G.manualIntent && G.taskGuide && G.taskGuide.mode !== 'hunt' && !G.path && !G.target) continueTaskGuide();

  // auto-farm: if idle, lock onto the nearest NON-boss monster and go
  if (G.autoFarm && !G.manualIntent && !dlg && (!G.target || !G.target.alive)) {
    const focusId = G.huntTargetId;
    const candidates = G.monsters
      .filter(m => autoHuntEligible(m, p)
        && (focusId ? m.def.id === focusId : m.def.sizeTiles < 2)
        && (focusId || dist(p.x, p.y, m.x, m.y) < 14 * TS))
      .sort((a, b) => dist(p.x, p.y, a.x, a.y) - dist(p.x, p.y, b.x, b.y));
    for (const candidate of candidates) {
      if (!pathTo(candidate.x, candidate.y)) continue;
      G.target = candidate;
      G.targetSource = 'hunt';
      candidate.provoked = true;
      break;
    }
  }

  // movement — WASD/arrows take priority and cancel any click-to-move
  const k = G.keys;
  let dx = 0, dy = 0;
  if (k['a'] || k['arrowleft']) dx -= 1;
  if (k['d'] || k['arrowright']) dx += 1;
  if (k['w'] || k['arrowup']) dy -= 1;
  if (k['s'] || k['arrowdown']) dy += 1;
  const spd = 130 * (p.moveMult || 1) * dt;   // AGI quickens the step
  const mx0 = p.x, my0 = p.y;                        // for walk-animation detection
  if (dx || dy) {                                   // WASD/arrows override click-to-move
    G.path = null;
    G.manualIntent = null;
    const len = Math.hypot(dx, dy) || 1;
    faceToward(p, p.x + dx, p.y + dy);
    moveEntity(p, (dx / len) * spd, (dy / len) * spd, 12);
  } else if (G.target && G.target.alive) {          // chase the clicked monster along a routed path
    const d = dist(p.x, p.y, G.target.x, G.target.y);
    if (d <= p.basicRange * TS + G.target.size / 2 - 4) { G.path = null; }  // in range → stop & auto-attack
    else {
      if (!G.path || now() >= (p._repathAt || 0)) { pathTo(G.target.x, G.target.y); p._repathAt = now() + 400; }
      if (!followPath(p, G.path, spd, 12)) G.path = null;
    }
  } else if (G.path) {                              // walking to a clicked point
    if (!followPath(p, G.path, spd, 12)) G.path = null;
  }
  p.moving = Math.abs(p.x - mx0) > 0.02 || Math.abs(p.y - my0) > 0.02;

  // Explicit clicks outrank Hunt until their action completes. A ground click
  // hands control back at the destination; an NPC click talks on arrival.
  if (G.manualIntent?.type === 'npc') {
    const intent = G.manualIntent;
    const npc = G.npcs.find(n => n.id === intent.npcId);
    if (!npc) G.manualIntent = null;
    else if (dist(p.x, p.y, npc.x * TS + TS / 2, npc.y * TS + TS / 2) < TS * 1.6) {
      G.path = null; G.manualIntent = null; interact(npc.id);
    } else if (!G.path) {
      G.manualIntent = null;
      toast(T('Could not reach {name}.', 'ui').replace('{name}', T(npc.name, 'npcs')), 'bad');
    }
  } else if (G.manualIntent?.type === 'move' && !G.path) {
    G.manualIntent = null;   // next tick Hunt finds the nearest monster from here
  }

  if (G.taskGuide?.mode === 'npc' && G.taskGuide.mapId === G.mapId) {
    const npc = G.npcs.find(n => n.id === G.taskGuide.npcId);
    if (npc && dist(p.x, p.y, npc.x * TS + TS / 2, npc.y * TS + TS / 2) < TS * 1.6) {
      finishTaskGuide();
      interact();
    }
  }

  if (G.autoFarm && !G.manualIntent && !dlg) autoFarmActions();
  playerBasicAttack();
  updateMonsters(dt);
  handlePortals();
  if (now() - (G._lastSave || 0) > 5000) { G._lastSave = now(); saveGame(); }   // autosave every 5s
}

function handlePortals() {
  if (now() - G.lastPortalAt < 800) return;
  const p = G.player, col = Math.floor(p.x / TS), row = Math.floor(p.y / TS);
  for (const pt of G.portals) {
    if (pt.x === col && pt.y === row) {
      G.lastPortalAt = now();
      AUDIO.playSfx('menu');
      loadMap(pt.toMap, pt.toX, pt.toY);
      return;
    }
  }
}

// =====================================================================
// FLOATING TEXT / MESSAGES
// =====================================================================
const fxLayer = () => $('#fx-layer');
function floatText(worldX, worldY, text, kind) {
  const el = document.createElement('div');
  el.className = 'dmg-float' + (kind === 'crit' ? ' dmg-float--crit' : kind === 'heal' ? ' dmg-float--heal' : '');
  if (kind === 'enemy') el.style.color = COMBAT.damageText.enemyColor;
  else if (kind === 'crit') el.style.color = COMBAT.damageText.critColor;
  else if (kind === 'dmg') el.style.color = COMBAT.damageText.playerColor;
  else if (kind === 'miss') el.style.color = '#bbb';
  el.textContent = kind === 'crit' ? text + '!' : text;
  el.style.left = (worldX - G.cam.x) + 'px';
  el.style.top = (worldY - G.cam.y - 20) + 'px';
  fxLayer().appendChild(el);
  setTimeout(() => el.remove(), 850);
}

function logMsg(text, kind = '') {
  const log = $('#msg-log'); if (!log) return;
  const line = document.createElement('div');
  line.className = 'line' + (kind ? ` line--${kind}` : '');
  line.textContent = text;
  log.appendChild(line);
  while (log.children.length > 8) log.firstChild.remove();
}
function toast(text, kind = '') {
  const el = document.createElement('div');
  el.className = 'toast' + (kind ? ` line--${kind}` : '');
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}
function showZoneBanner(map, firstVisit) {
  document.querySelector('.zone-banner')?.remove();
  const el = document.createElement('div'); el.className = 'zone-banner' + (firstVisit ? ' discovery' : '');
  el.innerHTML = `<small>${firstVisit ? (currentLang === 'th' ? 'ค้นพบดินแดนใหม่ · ' : 'NEW DISCOVERY · ') : ''}${esc(T(map.chronicle.province, 'maps'))}</small><b>${esc(T(map.name, 'maps'))}</b><em>${esc(T(map.chronicle.epithet, 'maps'))}</em><span>${esc(T(map.ambient, 'maps'))}</span>`;
  document.body.appendChild(el);
  setTimeout(() => el.classList.add('leaving'), 2100);
  setTimeout(() => el.remove(), 2700);
}

// =====================================================================
// HUD
// =====================================================================
function buildHud() {
  const p = G.player;
  $('#hud').innerHTML = `
    <div class="hud">
      <div class="level-badge"><span class="hud-crest">${CLASS_CREST[p.combatClass] || 'A'}</span><small>${T('LV', 'ui')}</small><b id="hud-level">1</b></div>
      <div class="stat-stack">
        <div class="bar hp-bar" role="progressbar" aria-label="${T('Health', 'ui')}"><div class="fill" id="hp-fill"></div><div class="label" id="hp-label"></div></div>
        <div class="bar mp-bar" role="progressbar" aria-label="${T('Mana', 'ui')}"><div class="fill" id="mp-fill"></div><div class="label" id="mp-label"></div></div>
        <div class="hud-identity"><span id="hud-name"></span><span class="hud-sep">◆</span><span id="hud-job"></span><span class="hud-sep">◆</span><span class="hud-coin">G</span><span id="hud-zeny"></span></div>
      </div>
      <div class="minimap"><canvas id="minimap-canvas" width="136" height="136"></canvas><div id="minimap-name" style="position:absolute;bottom:2px;left:6px;font-size:10px;color:var(--text-muted)"></div></div>
      <div class="quest-tracker" id="quest-tracker" tabindex="0" role="region" aria-label="${T('Active quests and bounties', 'ui')}"></div>
      <div class="msg-log" id="msg-log"></div>
      <div class="hotbar-shell">
        <div id="momentum-pips" class="momentum-pips" title="${T('Damage skills build Momentum. Finishers consume it.', 'ui')}">
          <span class="momentum-label">${T('Momentum', 'ui')}</span><span class="momentum-track"></span><span class="momentum-state"></span>
        </div>
        <div class="hotbar" aria-label="${T('Action bar', 'ui')}"></div>
        <button class="hotbar-config" id="hotbar-config" title="${T('Customize action keys', 'ui')}" aria-label="${T('Customize action keys', 'ui')}">⌨</button>
      </div>
      <div class="bar xp-bar"><div class="fill" id="xp-fill"></div></div>
      <div class="bar job-bar" title="${T('Job XP (1 skill point per level · cap {cap})', 'ui').replace('{cap}', PROGRESSION.jobLevelCap)}"><div class="fill" id="job-fill"></div></div>
      <div class="hud-menu">
        <button class="btn btn--ghost" data-panel="char">${T('Status (C)', 'ui')}</button>
        <button class="btn btn--ghost" data-panel="inv">${T('Satchel (I)', 'ui')}</button>
        <button class="btn btn--ghost" data-panel="skills">${T('Abilities (K)', 'ui')}</button>
        <button class="btn btn--ghost" data-panel="quest">${T('Journal (Q)', 'ui')}</button>
        <button class="btn btn--ghost" data-panel="world">${T('World (M)', 'ui')}</button>
        <button class="btn btn--ghost" id="farm-btn">${T('⚔ Hunt (F)', 'ui')}</button>
        ${G.admin ? `<button class="btn btn--ghost" data-panel="admin" style="color:#ffd24d;border-color:#ffd24d">⚙ ${T('Admin', 'ui')}</button>` : ''}
        <button class="btn btn--ghost" id="lang-btn" title="${T('Change Language', 'ui')}">🌐 ${currentLang === 'th' ? 'EN' : 'TH'}</button>
        <button class="btn btn--ghost" id="mute-btn">🔊</button>
      </div>
    </div>`;
  renderHotbar();
  $('#hud').querySelectorAll('[data-panel]').forEach(b => b.onclick = () => togglePanel(b.dataset.panel));
  $('#mute-btn').onclick = e => { G.muted = !G.muted; AUDIO.setMuted(G.muted); e.target.textContent = G.muted ? '🔇' : '🔊'; };
  $('#farm-btn').onclick = () => toggleFarm();
  $('#hotbar-config').onclick = () => togglePanel('hotkeys');
  $('#lang-btn').onclick = () => {
    setLanguage(currentLang === 'th' ? 'en' : 'th');
    AUDIO.playSfx('menu');
    buildHud();
    const openPanel = $('#panel');
    if (openPanel) {
      const kind = openPanel.dataset.kind;
      openPanel.querySelector('.panel__head').innerHTML = `${panelTitle(kind)}<button class="panel__close">✕</button>`;
      openPanel.querySelector('.panel__close').onclick = () => { hideSkillTip(); cancelHotkeyRebind(false); openPanel.remove(); };
      refreshPanel(kind);
    }
  };
  if (currentLang === 'th') {
    $('#hud-name').textContent = `${T(p.className, 'classes')} ${p.name}`;
  } else {
    $('#hud-name').textContent = p.name + ' the ' + p.className;
  }
  updateFarmButton();
}
function updateFarmButton() {
  const b = $('#farm-btn'); if (!b) return;
  const routing = G.taskGuide && G.mapId !== G.taskGuide.mapId;
  const worldRoute = routing && G.taskGuide.source === 'world';
  const huntLimit = T('Auto-hunt target limit: Lv {level}', 'ui').replace('{level}', autoHuntLevelCap(G.player));
  b.textContent = routing ? `➤ ${worldRoute ? T('Travel', 'ui') : T('Quest', 'ui')} (F)` : G.huntTargetId ? T('⚔ Quest Hunt ✓ (F)', 'ui') : G.autoFarm ? T('⚔ Hunting ✓ (F)', 'ui') : T('⚔ Hunt (F)', 'ui');
  b.title = routing ? T('Heading to {name}', 'ui').replace('{name}', translateAny(G.taskGuide.label, ['monsters', 'npcs', 'maps'])) : G.huntTargetId ? `${T('Focused hunt: {name}', 'ui').replace('{name}', T(monById[G.huntTargetId]?.name || G.huntTargetId, 'monsters'))}. ${huntLimit}` : `${T('Toggle automatic hunting', 'ui')}. ${huntLimit}`;
  b.style.color = (G.autoFarm || routing) ? 'var(--success)' : '';
  b.style.borderColor = (G.autoFarm || routing) ? 'var(--success)' : '';
}
function toggleFarm() {
  if (G.taskGuide) {
    const wasWorldRoute = G.taskGuide.source === 'world';
    finishTaskGuide(false);
    toast(wasWorldRoute ? T('Travel route cleared.', 'ui') : T('Quest guidance stopped.', 'ui'), 'sys');
    return;
  }
  G.huntTargetId = null;
  G.autoFarm = !G.autoFarm;
  updateFarmButton();
  const message = G.autoFarm
    ? T('Auto-hunt ON — targets up to Lv {level}; stronger monsters are ignored.', 'ui').replace('{level}', autoHuntLevelCap(G.player))
    : T('Auto-farm off.', 'ui');
  toast(message, G.autoFarm ? 'good' : 'sys');
}

function hotbarSlotHtml(slot, i) {
  const key = hotkeyLabel(G.player.hotkeys?.[i] || DEFAULT_HOTKEYS[i]);
  if (!slot) return `<button class="skill-btn empty" data-slot="${i}" title="Empty slot · ${key} · click to assign" aria-label="Empty action slot, key ${key}"><span class="key">${key}</span><span class="empty-plus">+</span></button>`;
  if (slot.type === 'skill') {
    const s = COMBAT.skills.find(x => x.id === slot.id);
    const role = s.finisher ? 'finisher' : s.detonate ? 'detonator' : isDamageSkill(s) ? 'builder' : 'utility';
    const roleMark = s.finisher ? 'F' : s.detonate ? 'D' : isDamageSkill(s) ? '+' : '◇';
    const resource = s.finisher ? `Momentum ${TUNING.momentum.finisherMin}+` : `${s.mpCost} MP`;
    const synergy = s.detonate ? ` · detonates ${s.detonate}` : s.effect ? ` · applies ${s.effect}` : '';
    return `<button class="skill-btn role-${role}${s.detonate ? ' has-detonate' : ''}" data-slot="${i}" title="${esc(s.name)} · ${resource}${synergy} · right-click to edit" aria-label="${esc(s.name)}, key ${key}">
      <span class="key">${key}</span><span class="role-mark">${roleMark}</span><span class="hotbar-glyph">${SKILL_GLYPH[s.type] || '✦'}</span><span class="sk-name">${esc(s.name.split(' ')[0])}</span><span class="lvl"></span><span class="cd" style="display:none"></span></button>`;
  }
  const it = itemById[slot.itemId];
  return `<button class="skill-btn item-slot" data-slot="${i}" title="${esc(it.name)} — ${esc(it.desc)} — right-click to edit" aria-label="${esc(it.name)}, key ${key}">
    <span class="key">${key}</span>${itemIconImg(slot.itemId, 28)}<span class="qty"></span><span class="cd" style="display:none"></span></button>`;
}
function renderHotbar() {
  const bar = document.querySelector('#hud .hotbar'); if (!bar) return;
  G.player.hotkeys = normaliseHotkeys(G.player.hotkeys);
  bar.innerHTML = G.player.hotbar.map((s, i) => hotbarSlotHtml(s, i)).join('');
  bar.querySelectorAll('[data-slot]').forEach(b => {
    const i = +b.dataset.slot;
    b.onclick = () => G.player.hotbar[i] ? useHotbarSlot(i) : openSlotPicker(i);
    b.oncontextmenu = e => { e.preventDefault(); openSlotPicker(i); };
    b.ondragover = e => { if (e.dataTransfer?.types?.includes('text/x-awo-skill')) { e.preventDefault(); b.classList.add('drop-ready'); } };
    b.ondragleave = () => b.classList.remove('drop-ready');
    b.ondrop = e => { const id = e.dataTransfer?.getData('text/x-awo-skill'); b.classList.remove('drop-ready'); if (id) { e.preventDefault(); assignSkillHotbar(id, i); } };
  });
}
// right-click (or click-when-empty) popup to assign/clear a hotbar slot
function openSlotPicker(i) {
  const old = $('#slot-picker'); if (old) old.remove();
  const p = G.player;
  const skillRows = skillsFor(p.combatClass).filter(s => skillLevel(p, s.id) > 0)
    .map(s => `<div class="sp-row" data-skill="${s.id}">${SKILL_GLYPH[s.type] || '•'} ${s.name} L${skillLevel(p, s.id)}</div>`).join('');
  const itemRows = p.inventory.filter(e => !e.uid && itemById[e.itemId].type === 'potion')
    .map(e => `<div class="sp-row" data-item="${e.itemId}">${itemIconImg(e.itemId, 18)} ${itemById[e.itemId].name} ×${e.qty}</div>`).join('');
  const pk = document.createElement('div');
  pk.id = 'slot-picker'; pk.className = 'slot-picker';
  pk.innerHTML = `<div class="sp-head">Slot ${i + 1} <kbd>${hotkeyLabel(p.hotkeys[i])}</kbd></div>${skillRows}${itemRows}<div class="sp-sep"></div><div class="sp-row" data-key-settings="1">⌨ Change action keys…</div><div class="sp-row" data-clear="1">✖ Clear slot</div>`;
  document.body.appendChild(pk);
  const btn = document.querySelector(`#hud .hotbar [data-slot="${i}"]`);
  if (btn) {
    const r = btn.getBoundingClientRect(), pw = pk.offsetWidth || 180, ph = pk.offsetHeight || 100;
    let x = r.left + r.width / 2 - pw / 2, y = r.top - ph - 8;
    x = Math.max(8, Math.min(x, (globalThis.innerWidth || 1200) - pw - 8));
    y = Math.max(8, y);
    pk.style.left = x + 'px'; pk.style.top = y + 'px';
  }
  const close = () => { pk.remove(); document.removeEventListener?.('mousedown', onDoc, true); };
  pk.querySelectorAll('[data-skill]').forEach(row => row.onclick = () => { assignSkillHotbar(row.dataset.skill, i); close(); });
  pk.querySelectorAll('[data-item]').forEach(row => row.onclick = () => { assignItemHotbar(row.dataset.item, i); close(); });
  pk.querySelector('[data-key-settings]').onclick = () => { close(); togglePanel('hotkeys'); };
  pk.querySelector('[data-clear]').onclick = () => { G.player.hotbar[i] = null; renderHotbar(); AUDIO.playSfx('menu'); close(); };
  const onDoc = e => { if (!pk.contains(e.target)) close(); };
  setTimeout(() => document.addEventListener('mousedown', onDoc, true), 0);
}

let pendingHotkeySlot = null;
function startHotkeyRebind(slot) {
  pendingHotkeySlot = slot;
  const panel = $('#panel');
  panel?.querySelectorAll('[data-rebind]').forEach(b => {
    const active = +b.dataset.rebind === slot;
    b.classList.toggle('listening', active);
    b.textContent = active ? 'Press a key…' : hotkeyLabel(G.player.hotkeys[+b.dataset.rebind]);
  });
}
function cancelHotkeyRebind(refresh = true) {
  const hadPending = pendingHotkeySlot != null;
  pendingHotkeySlot = null;
  if (hadPending && refresh) refreshPanel('hotkeys');
}
function captureHotkeyBinding(e) {
  if (pendingHotkeySlot == null) return false;
  e.preventDefault(); e.stopPropagation();
  if (String(e.key).toLowerCase() === 'escape') { cancelHotkeyRebind(); return true; }
  const code = eventHotkeyCode(e);
  if (e.ctrlKey || e.metaKey || e.altKey || !isBindableHotkey(code)) {
    toast('Choose a number or unused letter. Movement and menu keys stay reserved.', 'bad');
    return true;
  }
  const slot = pendingHotkeySlot;
  if (setHotkeyBinding(slot, code)) {
    pendingHotkeySlot = null;
    refreshPanel('hotkeys');
  }
  return true;
}
function hotkeysPanelHtml(p) {
  p.hotkeys = normaliseHotkeys(p.hotkeys);
  const row = (slot, i) => {
    let glyph = '·', name = T('Empty slot', 'ui'), meta = T('Click the empty action-bar slot to assign something', 'ui');
    if (slot?.type === 'skill') {
      const s = COMBAT.skills.find(x => x.id === slot.id);
      glyph = SKILL_GLYPH[s.type] || '✦';
      name = T(s.name, 'skills');
      meta = s.finisher
        ? T('Finisher · spends Momentum', 'ui')
        : s.detonate
          ? (currentLang === 'th' ? `จุดชนวนสถานะ ${s.detonate}` : `Detonates ${s.detonate}`)
          : isDamageSkill(s)
            ? T('Builder · earns Momentum', 'ui')
            : T('Utility', 'ui');
    } else if (slot?.type === 'item') {
      const it = itemById[slot.itemId];
      glyph = '◈';
      name = T(it.name, 'items');
      meta = T('Consumable', 'ui');
    }
    return `<div class="hotkey-row"><span class="hotkey-slot-no">${i + 1}</span><span class="hotkey-row-glyph">${glyph}</span><span class="hotkey-action"><b>${esc(name)}</b><small>${esc(meta)}</small></span><button class="keycap" data-rebind="${i}" title="${T('Click, then press a new key', 'ui')}">${hotkeyLabel(p.hotkeys[i])}</button></div>`;
  };
  return `<div class="hotkey-intro"><b>${T('Action keybindings', 'ui')}</b><span>${T('Click a keycap, then press a number or unused letter. If that key is already assigned, the two slots swap.', 'ui')}</span></div>
    <div class="hotkey-grid">${p.hotbar.map(row).join('')}</div>
    <div class="hotkey-foot"><span>${T('Reserved: WASD, E/F, C/I/K/Q', 'ui')}</span><button class="btn btn--ghost" data-reset-hotkeys="1">${T('Reset to 1–9', 'ui')}</button></div>`;
}

const style = document.createElement('style');
function updateHud() {
  const p = G.player;
  $('#hud-level').textContent = p.level;
  $('#hud-zeny').textContent = p.zeny;
  if ($('#hud-job')) $('#hud-job').textContent = `${T('Job Lv', 'ui')} ${p.jobLevel}/${PROGRESSION.jobLevelCap}`;
  const safeRatio = (value, max) => Number.isFinite(value) && Number.isFinite(max) && max > 0 ? clamp(value / max, 0, 1) : 0;
  const hpRatio = safeRatio(p.hp, p.maxHp), mpRatio = safeRatio(p.mp, p.maxMp);
  $('#hp-fill').style.width = (100 * hpRatio) + '%';
  $('#mp-fill').style.width = (100 * mpRatio) + '%';
  const need = p.level >= DESIGN.levelCap ? 1 : xpForNext(p.level);
  $('#xp-fill').style.width = (100 * p.xp / need) + '%';
  if ($('#job-fill')) $('#job-fill').style.width = (p.jobLevel >= PROGRESSION.jobLevelCap ? 100 : 100 * p.jobXp / jobXpForNext(p.jobLevel)) + '%';
  $('#hp-label').textContent = `HP ${Math.ceil(p.hp)} / ${p.maxHp}`;
  $('#mp-label').textContent = `MP ${Math.floor(p.mp)} / ${p.maxMp}`;
  const hpBar = document.querySelector('.hp-bar'), mpBar = document.querySelector('.mp-bar');
  if (hpBar) { hpBar.setAttribute('aria-valuenow', Math.ceil(p.hp)); hpBar.setAttribute('aria-valuemax', p.maxHp); }
  if (mpBar) {
    mpBar.setAttribute('aria-valuenow', Math.floor(p.mp)); mpBar.setAttribute('aria-valuemax', p.maxMp);
    mpBar.classList.toggle('low', mpRatio > 0 && mpRatio < 0.25);
    mpBar.classList.toggle('empty', mpRatio <= 0);
    mpBar.title = `Mana ${Math.floor(p.mp)} / ${p.maxMp} · regenerates over time`;
  }
  // hotbar slots: skill cooldown/level/lock, or item quantity
  document.querySelectorAll('#hud .hotbar [data-slot]').forEach(b => {
    const slot = p.hotbar[+b.dataset.slot]; if (!slot) return;
    if (slot.type === 'skill') {
      const lv = skillLevel(p, slot.id);
      b.classList.toggle('locked', lv === 0);
      const lvl = b.querySelector('.lvl'); if (lvl) lvl.textContent = lv ? 'L' + lv : '🔒';
      const s = COMBAT.skills.find(x => x.id === slot.id);
      const cd = b.querySelector('.cd'); const left = (p.skillCd[slot.id] || 0) - now();
      const resourceBlocked = s.finisher ? p.momentum < TUNING.momentum.finisherMin : p.mp < s.mpCost;
      b.classList.toggle('resource-blocked', resourceBlocked);
      b.classList.toggle('cast-ready', lv > 0 && left <= 0 && !resourceBlocked);
      b.classList.toggle('finisher-ready', !!s.finisher && lv > 0 && left <= 0 && !resourceBlocked);
      if (cd) { if (left > 0) { cd.style.display = 'flex'; cd.style.setProperty('--cd-angle', `${Math.max(0, Math.min(360, left / s.cooldownMs * 360))}deg`); cd.textContent = Math.ceil(left / 1000); } else cd.style.display = 'none'; }
    } else if (slot.type === 'item') {
      const q = itemQty(slot.itemId);
      const qty = b.querySelector('.qty'); if (qty) qty.textContent = q;
      b.classList.toggle('locked', q === 0);
      const it = itemById[slot.itemId];
      const cd = b.querySelector('.cd'); const left = (it.hpRestore || it.mpRestore) ? (p.potionCdUntil || 0) - now() : 0;
      if (cd) { if (left > 0) { cd.style.display = 'flex'; cd.textContent = Math.ceil(left / 1000); } else cd.style.display = 'none'; }
    }
  });
  // pending-point nudges on the menu buttons
  const cbtn = $('#hud').querySelector('[data-panel="char"]');
  if (cbtn) cbtn.textContent = T('Status (C)', 'ui') + (p.statPoints ? ` +${p.statPoints}` : '');
  const kbtn = $('#hud').querySelector('[data-panel="skills"]');
  if (kbtn) kbtn.textContent = T('Abilities (K)', 'ui') + (p.skillPoints ? ` +${p.skillPoints}` : '');
  const mpips = $('#momentum-pips');
  if (mpips) {
    const MM = TUNING.momentum, ready = p.momentum >= MM.finisherMin;
    const track = mpips.querySelector('.momentum-track');
    if (track) track.innerHTML = Array.from({ length: MM.max }, (_, i) =>
      `<span class="pip${i < p.momentum ? ' on' : ''}${ready ? ' ready' : ''}" data-momentum-pip="${i}"></span>`).join('');
    const state = mpips.querySelector('.momentum-state');
    if (state) state.textContent = ready ? T('FINISHER READY', 'ui') : T('{prog}/{min} TO FINISH', 'ui').replace('{prog}', p.momentum).replace('{min}', MM.finisherMin);
    mpips.classList.toggle('ready', ready);
  }
  const flowMomentum = document.querySelector('.skill-flow .flow-momentum');
  if (flowMomentum) {
    const ready = p.momentum >= TUNING.momentum.finisherMin;
    flowMomentum.querySelectorAll('.pip').forEach((pip, i) => { pip.classList.toggle('on', i < p.momentum); pip.classList.toggle('ready', ready); });
    const count = flowMomentum.querySelector('b'); if (count) count.textContent = `${p.momentum}/${TUNING.momentum.max}`;
  }
}

function updateQuestTracker() {
  const el = $('#quest-tracker'); if (!el) return;
  let html = '';
  const typeName = (t) => { if (currentLang === 'th') { return { kill: 'กำจัด', collect: 'รวบรวม', explore: 'สำรวจ', talk: 'คุยกับ' }[t] || t; } return t; };
  if (G.advance) {
    const a = G.advance, o = a.def.objective, done = advanceProgress() >= o.count;
    html += `<button class="task-link${G.taskGuide?.source === 'advance' ? ' active' : ''}" data-task="advance" title="${T('Navigate to this task', 'ui')}" style="margin-bottom:6px;padding-bottom:6px;border-bottom:1px solid rgba(224,182,76,.35)">
      <b style="color:#e6a23c">✦ ${T(a.def.name, 'quests')}</b><br>${T(a.def.desc, 'quests')}<br>
      <span style="color:${done ? 'var(--success)' : 'var(--text)'}">▸ ${typeName(o.type)} ${objectiveName(o)}: ${advanceProgress()}/${o.count}</span></button>`;
  }
  const q = questById[G.quest], pending = questById[G.pendingQuest];
  if (!q && pending) {
    const phase = storyPhaseFor(pending);
    html += `<div class="quest-wait"><small style="color:${phase?.color || 'var(--accent-alt)'}">${storyPhaseLabel(pending)}</small><br>
      <b style="color:var(--accent-alt)">${T('Next', 'ui')} · ${T(pending.name, 'quests')}</b><br>
      <span>${T('🔒 Base Lv {v} required', 'ui').replace('{v}', pending.minLevel)}</span><br>
      <small style="color:var(--text-muted)">${T('You are Lv {lvl}. Train with hunts or guild bounties.', 'ui').replace('{lvl}', G.player.level)}</small></div>`;
  } else if (!q) html += `<b>${T('Quest', 'ui')}</b><br><span style="color:var(--text-muted)">${T('Story complete — free roam.', 'ui')}</span>`;
  else {
    const prog = questProgress(q);
    html += `<button class="task-link${G.taskGuide?.source === 'story' ? ' active' : ''}" data-task="story" data-task-id="${q.id}" title="${T('Navigate to this task', 'ui')}">
      <small style="color:${storyPhaseFor(q)?.color || 'var(--accent-alt)'}">${storyPhaseLabel(q)}</small><br>
      <b style="color:var(--accent-alt)">${T(q.name, 'quests')}</b><br>${T(q.description, 'quests')}<br>
      <span style="color:${prog >= q.objective.count ? 'var(--success)' : 'var(--text)'}">▸ ${typeName(q.objective.type)} ${objectiveName(q.objective)}: ${prog}/${q.objective.count}</span></button>`;
  }
  if (G.activeGuilds.length) {
    html += `<div style="margin-top:6px;padding-top:6px;border-top:1px solid rgba(95,191,122,.3)"><b style="color:var(--success)">🏰 ${T('Bounties', 'ui')} (${G.activeGuilds.length}/${GUILD_MAX_ACTIVE})</b>` +
      G.activeGuilds.map(g => {
        const prog = g.kind === 'deliver' ? Math.min(itemQty(g.target), g.count) : g.progress;
        const ready = g.kind === 'deliver' ? prog >= g.count : !!g.done;
        const targetName = T(g.targetName, g.kind === 'deliver' ? 'items' : 'monsters');
        return `<button class="task-link task-link--compact${G.taskGuide?.taskId === g.id ? ' active' : ''}" data-task="guild" data-task-id="${g.id}" title="${T('Navigate to this task', 'ui')}"><span style="color:${ready ? 'var(--success)' : 'var(--text)'}">${g.kind === 'deliver' ? '📦' : '⚔'} ${targetName}: ${prog}/${g.count}${ready ? T(' — report to guild!', 'ui') : ''}</span><br>${bountyLevelHtml(g, true)}</button>`;
      }).join('') + `</div>`;
  }
  el.innerHTML = html;
  el.querySelectorAll('[data-task]').forEach(task => task.onclick = () => activateTaskGuide(task.dataset.task, task.dataset.taskId));
  refreshPanel('quest'); refreshPanel('guild');   // live-update open windows (bg progress/completions)
}

// Cache the static tile layer once per map; redraw base+dots each frame.
let miniBase = null;
function updateMinimap() {
  const c = $('#minimap-canvas'); if (!c) return;
  miniBase = document.createElement('canvas'); miniBase.width = c.width; miniBase.height = c.height;
  const bctx = miniBase.getContext('2d');
  const sx = c.width / G.map.width, sy = c.height / G.map.height;
  for (let row = 0; row < G.map.height; row++)
    for (let col = 0; col < G.map.width; col++) {
      const info = G.legend[tileChar(col, row)];
      bctx.fillStyle = info ? info.color : '#000';
      bctx.fillRect(col * sx, row * sy, Math.ceil(sx), Math.ceil(sy));
    }
  $('#minimap-name').textContent = T(G.map.name, 'maps');
}

function renderMinimap() {
  const c = $('#minimap-canvas'); if (!c || !miniBase) return;
  const mctx = c.getContext('2d');
  const sx = c.width / G.map.width, sy = c.height / G.map.height;
  mctx.drawImage(miniBase, 0, 0);
  for (const m of G.monsters) if (m.alive) {
    const focused = G.huntTargetId === m.def.id;
    mctx.fillStyle = focused ? '#ffd24d' : m.def.sizeTiles >= 2 ? '#fff' : m.def.spriteColor;
    const size = focused ? 5 : m.def.sizeTiles >= 2 ? 4 : 2;
    mctx.fillRect((m.x / TS) * sx - size / 2, (m.y / TS) * sy - size / 2, size, size);
  }
  for (const n of G.npcs) { mctx.fillStyle = '#ffd76a'; mctx.fillRect(n.x * sx - 1, n.y * sy - 1, 3, 3); }
  if (G.taskGuide && !G.huntTargetId) {
    let goal = null;
    if (G.taskGuide.mapId === G.mapId && G.taskGuide.mode === 'npc') goal = G.npcs.find(n => n.id === G.taskGuide.npcId);
    else if (G.taskGuide.mapId !== G.mapId) goal = nextPortalToward(MAPS, G.mapId, G.taskGuide.mapId);
    if (goal) {
      mctx.strokeStyle = '#ffd24d'; mctx.lineWidth = 2;
      mctx.strokeRect(goal.x * sx - 3, goal.y * sy - 3, 7, 7);
    }
  }
  mctx.fillStyle = '#fff'; mctx.fillRect((G.player.x / TS) * sx - 2, (G.player.y / TS) * sy - 2, 4, 4);
}

// =====================================================================
// PANELS
// =====================================================================
function togglePanel(id) {
  hideSkillTip();
  cancelHotkeyRebind(false);
  const existing = $('#panel'); if (existing && existing.dataset.kind === id) { existing.remove(); return; }
  if (existing) existing.remove();
  const el = document.createElement('div');
  el.className = 'panel'; el.id = 'panel'; el.dataset.kind = id;
  el.innerHTML = `<div class="panel__head">${panelTitle(id)}<button class="panel__close">✕</button></div><div class="panel__body">${panelBody(id)}</div>`;
  $('#overlays').appendChild(el);
  el.querySelector('.panel__close').onclick = () => { hideSkillTip(); cancelHotkeyRebind(false); el.remove(); };
  wirePanel(id, el);
  AUDIO.playSfx('menu');
}
function panelTitle(id) { return { char: 'Status', inv: 'Satchel', skills: 'Abilities', hotkeys: 'Action Keybindings', quest: 'Quest Journal', world: 'World Chronicle', guild: "Adventurer's Guild", shop: 'Trader', admin: 'Admin Tools' }[id]; }

const ADMIN_GROUPS = [
  ['🧍 Character', [
    ['lvl5', '+5 Base Levels'], ['job5', '+5 Job Levels'], ['points', '+10 Stat & Skill pts'],
    ['heal', 'Full Heal'], ['god', 'Toggle God Mode'], ['learnall', 'Learn All Skills'],
    ['promote', 'Force Class Advance'],
  ]],
  ['💰 Wealth & Gear', [
    ['zeny', '+5000 Zeny'], ['legw', 'Legendary Weapon'], ['lega', 'Legendary Armor'],
    ['potions', '+10 of each Potion'], ['frags', '+20 Refine Fragments & Ore'], ['refineworn', 'Max-refine Worn Gear (+9)'],
  ]],
  ['🏰 Quests & Guild', [
    ['skipquest', 'Complete Current Story Quest'], ['guildpts', '+50 Guild Points'],
    ['bountydone', 'Finish & Claim All Bounties'], ['board', 'Refresh Guild Board & Shop'],
  ]],
  ['🗺 World', [
    ['town', 'Warp: Town'], ['woods', 'Warp: Woods'], ['ruins', 'Warp: Ruins'],
    ['tundra', 'Warp: Tundra'], ['caldera', 'Warp: Caldera'], ['rift', 'Warp: Rift'],
    ['warpboss', 'Warp to Zone Guardian'], ['spawnboss', 'Spawn Guardian Here'],
    ['killall', 'Kill All Monsters'], ['respawnall', 'Respawn All Monsters'],
  ]],
];
function adminAction(a) {
  const p = G.player;
  if (a === 'lvl5') { for (let i = 0; i < 5; i++) { if (p.level < DESIGN.levelCap) { p.level++; p.statPoints += PROGRESSION.statPointsPerLevel; } if (p.jobLevel < PROGRESSION.jobLevelCap) { p.jobLevel++; p.skillPoints += PROGRESSION.skillPointsPerLevel; } } recompute(p, true); maybeStartAdvance(p); maybeStartPendingQuest(); }
  else if (a === 'job5') { const gained = Math.min(5, PROGRESSION.jobLevelCap - p.jobLevel); p.jobLevel += gained; p.skillPoints += gained; if (p.jobLevel >= PROGRESSION.jobLevelCap) p.jobXp = 0; toast(`Job Lv ${p.jobLevel}/${PROGRESSION.jobLevelCap} (+${gained} skill points).`, 'good'); }
  else if (a === 'zeny') p.zeny += 5000;
  else if (a === 'points') { p.statPoints += 10; p.skillPoints += 10; }
  else if (a === 'heal') { p.hp = p.maxHp; p.mp = p.maxMp; }
  else if (a === 'god') { p.godMode = !p.godMode; toast('God mode ' + (p.godMode ? 'ON' : 'off'), p.godMode ? 'good' : 'sys'); }
  else if (a === 'learnall') { for (const s of skillsFor(p.combatClass)) p.skillLevels[s.id] = PROGRESSION.skillTree[s.id]?.maxLevel || 1; recompute(p); }
  else if (a === 'legw') { p.inventory.push(rollItem('hero_blade', 0, 'legendary')); logMsg('Spawned Legendary Otherworld Blade.', 'good'); }
  else if (a === 'lega') { p.inventory.push(rollItem('guardian_plate', 0, 'legendary')); logMsg('Spawned Legendary Guardian Plate.', 'good'); }
  else if (a === 'potions') { addStack('minor_potion', 10); addStack('mid_potion', 10); addStack('mana_potion', 10); addStack('greater_potion', 10); }
  else if (a === 'frags') { for (const id of [...REFINE_FRAG, 'blessed_ore']) addStack(id, 20); logMsg('+20 Wolf Fang / Shade Dust / Star Iron / Blessed Ore.', 'good'); }
  else if (a === 'refineworn') { for (const slot of EQUIP_SLOTS) if (p.equip[slot]) p.equip[slot].plus = 9; recompute(p); toast('All worn gear refined to +9.', 'good'); }
  else if (a === 'promote') { const t = PROGRESSION.tiers[p.classId]; if (p.tierIndex + 1 < t.length) doPromote(p, p.tierIndex + 1); else toast('Already max tier.', 'sys'); }
  else if (a === 'skipquest') { const q = questById[G.quest]; if (q) { if (q.objective.type === 'collect') addStack(q.objective.target, q.objective.count); completeQuest(q); } else toast('No active story quest.', 'sys'); }
  else if (a === 'guildpts') addGuildPoints(50);
  else if (a === 'bountydone') {
    for (const g of [...G.activeGuilds]) { if (g.kind === 'deliver') addStack(g.target, g.count); else g.done = true; claimGuild(g.id); }
    if (!G.activeGuilds.length) toast('All bounties claimed.', 'good');
  }
  else if (a === 'board') { refreshGuildBoard(); rerollShop(); toast('Guild board + featured stock rerolled.', 'good'); }
  else if (a === 'spawnboss') {
    const def = G.map.spawns.map(sp => monById[sp.monsterId]).find(d => d?.sizeTiles >= 2) || monById['ruin_golem'];
    G.monsters.push(makeMonster(def, p.x + 64, p.y, def.level)); toast(`Spawned ${def.name}!`, 'bad');
  }
  else if (a === 'warpboss') {
    const b = findChar('B');
    if (b) { p.x = b.col * TS + TS / 2 - 48; p.y = b.row * TS + TS / 2; toast('Warped to the zone guardian.', 'sys'); }
    else toast('No guardian marker on this map.', 'sys');
  }
  else if (a === 'killall') { G.monsters.forEach(m => { if (m.alive) { m.hp = 0; killMonster(m); } }); }
  else if (a === 'respawnall') { G.monsters.forEach(m => { if (!m.alive) respawn(m); }); toast('All monsters respawned.', 'sys'); }
  else if (a === 'town') loadMap('town_awakening');
  else if (a === 'woods') loadMap('whispering_woods', 2, 13);
  else if (a === 'ruins') loadMap('sunken_ruins', 3, 3);
  else if (a === 'tundra') loadMap('frostpeak_tundra', 2, 2);
  else if (a === 'caldera') loadMap('dragon_caldera', 2, 2);
  else if (a === 'rift') loadMap('astral_rift', 2, 2);
  recompute(p); renderHotbar(); updateHud();
}

// paper-doll: 7 equipment slots with icons; click a filled slot to unequip
function paperDoll(p) {
  return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:5px">` + EQUIP_SLOTS.map(slot => {
    const inst = p.equip[slot], it = inst ? itemById[inst.itemId] : null, rc = inst ? itemRarity(inst) : null;
    const icon = inst ? itemIconImg(inst.itemId, 26)
      : `<img src="${pxDataURL('item', SLOT_ICON[slot])}" width="26" height="26" style="image-rendering:pixelated;opacity:.22;flex:0 0 26px" alt="">`;
    const stat = inst ? itemMainStatsHtml(inst) : T('empty', 'ui');
    const bonus = inst ? itemAffixesHtml(inst, p) : '';
    return `<div class="doll-slot" ${inst ? `data-unequip="${slot}" title="${T('Unequip', 'ui')} ${esc(instName(inst))}"` : ''}>
      ${icon}<div style="font-size:10px;line-height:1.25;overflow:hidden">
        <span style="color:var(--text-muted)">${T(SLOT_LABEL[slot], 'ui')}</span><br>
        ${inst ? `<b style="color:${rc.color}">${esc(instName(inst))}</b> <small style="color:${rc.color}">◆${rc.name}</small><br><span style="color:var(--text)">${stat}</span><div class="gear-bonuses gear-bonuses--slot">${bonus}</div>` : `<span style="color:var(--text-muted)">${stat}</span>`}
      </div></div>`;
  }).join('') + `</div>`;
}

// ---- Class skill manual --------------------------------------------------
// Skills stay data-driven, but are presented as three job chapters instead of
// an auto-routed graph. Full names and written prerequisites remain readable in
// both languages, even when a class has several branches.
const STAT_LETTER = { str: 'S', agi: 'A', vit: 'V', int: 'I', dex: 'D', luk: 'L' };
function recommendedBuild(growth) {
  return Object.entries(growth).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => STAT_LETTER[k]).join('');
}
// small hexagonal stat-growth radar (reads the class's per-level growth from design.js)
function svgRadar(growth) {
  const order = ['str', 'agi', 'vit', 'int', 'dex', 'luk'];
  const max = Math.max(...order.map(k => growth[k] || 0), 0.1), R = 40, cx = 56, cy = 52;
  const pt = (i, f) => { const a = (-90 + i * 60) * Math.PI / 180; return [cx + Math.cos(a) * R * f, cy + Math.sin(a) * R * f]; };
  const poly = f => order.map((_, i) => pt(i, f).map(n => n.toFixed(1)).join(',')).join(' ');
  const grid = [0.33, 0.66, 1].map(f => `<polygon points="${poly(f)}" fill="none" stroke="#5c5240" stroke-width="0.6"/>`).join('');
  const axes = order.map((_, i) => { const [x, y] = pt(i, 1); return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#5c5240" stroke-width="0.5"/>`; }).join('');
  const shape = `<polygon points="${order.map((k, i) => pt(i, (growth[k] || 0) / max).map(n => n.toFixed(1)).join(',')).join(' ')}" fill="rgba(79,127,180,.42)" stroke="#e6bd54" stroke-width="1.4"/>`;
  const labels = order.map((k, i) => { const [x, y] = pt(i, 1.24); return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" fill="#b8ab8e" font-size="8" text-anchor="middle" dominant-baseline="middle">${k.toUpperCase()}</text>`; }).join('');
  return `<svg width="112" height="108" viewBox="0 0 112 108">${grid}${axes}${shape}${labels}</svg>`;
}
function hotkeyForSkill(p, id) {
  const slot = p.hotbar.findIndex(x => x?.type === 'skill' && x.id === id);
  return slot >= 0 ? hotkeyLabel(p.hotkeys[slot]) : '';
}
function skillFlowChip(s, p) {
  const learned = skillLevel(p, s.id) > 0, key = learned ? hotkeyForSkill(p, s.id) : '';
  const tag = s.finisher ? 'FINISH' : s.detonate ? `DET ${s.detonate}` : s.effect && isDamageSkill(s) ? `SET ${s.effect}` : isDamageSkill(s) ? '+M' : 'UTIL';
  const inner = `<span>${esc(T(s.name, 'skills'))}</span><small>${tag}</small>${key ? `<kbd>${key}</kbd>` : ''}`;
  if (learned && !key) return `<button class="flow-skill learned unbound" data-assign-skill="${s.id}" title="${currentLang === 'th' ? `ใส่ ${esc(T(s.name, 'skills'))} ลงในช่องปุ่มลัดว่างช่องแรก` : `Add ${esc(s.name)} to the first empty action slot`}">${inner}<i>+ BAR</i></button>`;
  return `<span class="flow-skill ${learned ? 'learned' : 'locked'}" title="${learned ? (currentLang === 'th' ? 'เรียนรู้แล้ว' : 'Learned') : (currentLang === 'th' ? 'ยังไม่ได้เรียนรู้' : 'Not learned yet')}">${inner}</span>`;
}
function combatLoopHtml(p, actives) {
  const M = TUNING.momentum;
  const builders = actives.filter(s => isDamageSkill(s) && !s.finisher);
  const synergies = actives.filter(s => (s.effect && isDamageSkill(s)) || s.detonate);
  const finishers = actives.filter(s => s.finisher);
  const pips = Array.from({ length: M.max }, (_, i) => `<span class="pip${i < p.momentum ? ' on' : ''}${p.momentum >= M.finisherMin ? ' ready' : ''}"></span>`).join('');
  
  const emptyText = currentLang === 'th' ? 'ไม่มีความสามารถในส่วนนี้' : 'No skills in this role';
  const card = (step, title, copy, skills, cls) => `<div class="flow-card ${cls}"><div class="flow-step">${step}</div><div class="flow-title">${title}</div><div class="flow-copy">${copy}</div><div class="flow-skills">${skills.map(s => skillFlowChip(s, p)).join('') || `<span class="flow-empty">${emptyText}</span>`}</div></div>`;
  
  const headTitle = currentLang === 'th' ? 'ลูปการต่อสู้' : 'Combat Loop';
  const headSub = currentLang === 'th' ? 'สะสม → สร้างช่องโหว่ → เผด็จศึก' : 'Build → create an opening → cash out';
  const nowText = currentLang === 'th' ? 'ปัจจุบัน' : 'NOW';
  const keysBtn = currentLang === 'th' ? '⌨ ปุ่มกด' : '⌨ Keys';
  
  const step1Title = currentLang === 'th' ? 'สะสมโมเมนตัม' : 'BUILD';
  const step1Desc = currentLang === 'th' ? `การโจมตีปกติและใช้สกิลกายภาพจะเพิ่มโมเมนตัม +${M.perHit}` : `Landed damage skills add +${M.perHit} Momentum.`;
  
  const step2Title = currentLang === 'th' ? 'คอมโบ & จุดชนวน' : 'SETUP + DETONATE';
  const step2Desc = currentLang === 'th' ? `สร้างสถานะเผาไหม้/เชื่องช้า/สตัน การโจมตีจุดชนวนที่ตรงกันจะแรงขึ้น +${Math.round(M.detonateBonus * 100)}%` : `Apply burn, slow, or stun; matching detonators deal +${Math.round(M.detonateBonus * 100)}%.`;
  
  const step3Title = currentLang === 'th' ? 'เผด็จศึก' : 'FINISH';
  const step3Desc = currentLang === 'th' ? `เมื่อมีโมเมนตัม ${M.finisherMin}+ ขึ้นไป สกิลเผด็จศึกจะใช้โมเมนตัมทั้งหมดเพิ่มดาเมจจุดละ +${Math.round(M.powerPerPoint * 100)}%` : `At ${M.finisherMin}+ Momentum, finishers consume all for +${Math.round(M.powerPerPoint * 100)}% damage per point.`;
  
  const legendBuilder = currentLang === 'th' ? 'สะสมโมเมนตัม' : 'Builder';
  const legendSetup = currentLang === 'th' ? 'สร้างสถานะตั้งต้น' : 'Status setup';
  const legendDetonate = currentLang === 'th' ? 'ตัวจุดชนวน' : 'Detonator';
  const legendFinisher = currentLang === 'th' ? 'ตัวปิดเผด็จศึก' : 'Finisher';
  const legendHint = currentLang === 'th' ? 'ลากความสามารถที่เรียนรู้แล้วลงไปในแถบปุ่มลัดด้านล่าง' : 'Drag any learned node onto the action bar.';

  return `<section class="skill-flow" aria-label="${currentLang === 'th' ? 'ลูปคอมโบความสามารถ' : 'Skill combat loop'}">
    <div class="flow-head"><div><b>${headTitle}</b><span>${headSub}</span></div><div class="flow-momentum"><small>${nowText}</small><span class="momentum-track">${pips}</span><b>${p.momentum}/${M.max}</b></div><button class="btn btn--ghost" data-open-panel="hotkeys">${keysBtn}</button></div>
    <div class="flow-grid">
      ${card('01', step1Title, step1Desc, builders, 'build')}
      <div class="flow-arrow">›</div>
      ${card('02', step2Title, step2Desc, synergies, 'chain')}
      <div class="flow-arrow">›</div>
      ${card('03', step3Title, step3Desc, finishers, 'finish')}
    </div>
    <div class="flow-legend"><span><i class="legend-box builder"></i> ${legendBuilder}</span><span><i class="legend-box setup"></i> ${legendSetup}</span><span><i class="legend-box detonate"></i> ${legendDetonate}</span><span><i class="legend-box finisher"></i> ${legendFinisher}</span><span>${legendHint}</span></div>
  </section>`;
}
function skillsPanelHtml(p) {
  const cc = p.combatClass, tree = PROGRESSION.skillTree, actives = skillsFor(cc);
  const passives = passivesFor(cc), book = PROGRESSION.skillBooks[cc];
  const roleFor = s => s.finisher ? ['FINISH', 'finisher']
    : s.detonate ? ['DETONATE', 'detonator']
    : s.effect && isDamageSkill(s) ? ['SETUP', 'setup']
    : isDamageSkill(s) ? ['BUILD', 'builder'] : ['UTILITY', 'utility'];
  const cardHtml = (entry, isPassive = false) => {
    const pa = isPassive ? entry : null, s = isPassive ? null : entry, node = isPassive ? pa : tree[s.id];
    const id = isPassive ? pa.id : s.id;
    const lv = skillLevel(p, id), max = isPassive ? pa.maxLevel : (node?.maxLevel || 1);
    const learnable = isPassive ? canLearnPassive(p, id) : canLearn(p, id), maxed = lv >= max, clickable = learnable && !maxed;
    const currentCap = isPassive ? max : skillCapForTier(node, p.tierIndex);
    const tierCapped = !maxed && lv >= currentCap;
    const state = maxed ? 'maxed' : tierCapped ? 'owned tier-capped' : lv > 0 ? 'owned' : clickable ? 'ready' : 'locked';
    const glyph = isPassive ? '◈' : (SKILL_GLYPH[s.type] || '✦');
    const name = isPassive ? T(pa.name, 'passives') : T(s.name, 'skills');
    const attr = clickable ? (isPassive ? `data-passive="${id}"` : `data-learn="${id}"`) : '';
    const [role, roleClass] = isPassive ? [T('PASSIVE', 'ui'), 'passive'] : roleFor(s);
    const drag = !isPassive && lv > 0 ? `draggable="true" data-drag-skill="${id}"` : '';
    const req = isPassive
      ? `${T('Job Lv', 'ui')} ${pa.reqLevel}${pa.reqTier ? ` · ${T('Job advancement required', 'ui')}` : ''}`
      : node.reqSkill
        ? `${T('Requires', 'ui')} ${esc(T((COMBAT.skills.find(x => x.id === node.reqSkill.id) || {}).name || node.reqSkill.id, 'skills'))} Lv ${node.reqSkill.lvl}`
        : T('Starter skill · granted free', 'ui');
    const status = maxed ? T('MAXED', 'ui') : tierCapped ? T('MASTERY CAP', 'ui') : lv > 0 ? T('LEARNED', 'ui') : clickable ? T('LEARN +', 'ui') : T('LOCKED', 'ui');
    return `<div class="ro-skill ${state}${clickable ? ' can' : ''} is-${roleClass}" ${attr} ${drag} data-skill="${id}" data-kind="${isPassive ? 'passive' : 'active'}">
      <span class="ro-skill-icon">${glyph}<i>${lv}/${max}</i></span>
      <span class="ro-skill-copy"><b>${esc(name)}</b><small>${req}</small><em>${isPassive ? esc(T(pa.desc, 'passives').replace('{v}', pa.per * Math.max(1, lv))) : `${T('Job Lv', 'ui')} ${node.reqLevel} · ${T(role, 'ui')}`}</em></span>
      <span class="ro-skill-state">${status}</span></div>`;
  };

  const tiers = PROGRESSION.tiers[p.classId] || [];
  const stageLabels = [T('FIRST JOB', 'ui'), T('SECOND JOB', 'ui'), T('ADVANCED JOB', 'ui')];
  const lanes = [0, 1, 2].map(tier => {
    const activeSet = actives.filter(s => (tree[s.id]?.reqTier || 0) === tier)
      .sort((a, b) => (tree[a.id].reqLevel - tree[b.id].reqLevel) || a.name.localeCompare(b.name));
    const passiveSet = passives.filter(pa => (pa.reqTier || 0) === tier)
      .sort((a, b) => (a.reqLevel - b.reqLevel) || a.name.localeCompare(b.name));
    const unlocked = p.tierIndex >= tier;
    return `<section class="ro-job-lane${unlocked ? ' unlocked' : ' locked-job'}" data-tier="${tier}">
      <header><span>0${tier + 1}</span><div><small>${stageLabels[tier]}</small><b>${esc(T(tiers[tier]?.name || stageLabels[tier], 'classes'))}</b></div><i>${unlocked ? T('UNLOCKED', 'ui') : T('PROMOTION REQUIRED', 'ui')}</i></header>
      <div class="ro-lane-label">◆ ${T('ACTIVE SKILLS', 'ui')}</div>
      <div class="ro-skill-list">${activeSet.map(s => cardHtml(s)).join('') || `<small class="ro-empty">${T('No active skills in this chapter.', 'ui')}</small>`}</div>
      <div class="ro-lane-label passive">◈ ${T('PASSIVE MASTERIES', 'ui')}</div>
      <div class="ro-skill-list passive-list">${passiveSet.map(pa => cardHtml(pa, true)).join('') || `<small class="ro-empty">${T('No passive masteries in this chapter.', 'ui')}</small>`}</div>
    </section>`;
  }).join('');
  const g = p._cls.statGrowthPerLevel;
  const header = `<header class="ro-book-head"><div class="ro-crest">${book.crest}</div><div class="ro-book-title">
      <small>${T('CLASS SKILL MANUAL', 'ui')} · ${esc(T(p.className, 'classes'))}</small><h3>${esc(T(book.title, 'ui'))}</h3>
      <b>${esc(T(book.focus, 'ui'))}</b><p>${esc(T(book.motto, 'ui'))}</p></div>
    <div class="ro-book-stats"><strong>${p.skillPoints}<small>${T('SKILL POINTS', 'ui')}</small></strong><span>${T('Job Lv', 'ui')} ${p.jobLevel}/${PROGRESSION.jobLevelCap}</span><span>${T('Recommended build:', 'ui')} <b>${recommendedBuild(g)}</b></span></div>
    <div class="ro-book-radar">${svgRadar(g)}</div></header>`;
  const resetNote = `<aside class="ro-reset-note"><span>↺</span><div><b>${T('RESET YOUR BUILD', 'ui')}</b><small>${T('Soul Ledger and Memory Prism are sold by Marla. Reset items preserve your level, gear, and rebirth bonuses.', 'ui')}</small></div></aside>`;
  const guide = `<details class="skill-guide"><summary>${T('COMBAT COMBO GUIDE', 'ui')} <small>${T('Build, setup, detonate, then finish.', 'ui')}</small></summary>${combatLoopHtml(p, actives)}</details>`;
  return `<div class="ro-skill-book" style="--book-accent:${book.color};--book-deep:${book.deep}">${header}<div class="ro-job-grid">${lanes}</div>${resetNote}${guide}</div>`;
}

// plain-language "what does it do" line for a skill at level L
function skillEffectLine(s, L, p) {
  const pow = s.power * skillRankScale(L);
  if (currentLang === 'th') {
    if (s.id === 'hunters_mark') return `ทำสัญลักษณ์บนเป้าหมาย ได้รับความเสียหายแรงขึ้น +${20 + 5 * (L - 1)}% เป็นเวลา 10 วินาที`;
    if (s.id === 'sanctuary') return `สร้างวงเวทรักษา 6 วินาที (ฟื้นฟู HP รวม ≈ ${Math.round(p.maxHp * (0.395 + 0.059 * (L - 1)))} HP)`;
    if (s.type === 'heal') return `ฟื้นฟู HP ≈ ${Math.round(p.maxHp * (0.12 * s.power) * (1 + 0.15 * (L - 1)))}`;
    if (s.type === 'buff') return `เสริมความแกร่งให้ตัวเองเป็นเวลา 8 วินาที`;
    const dmg = Math.round(p.atkStat * pow);
    const extra = s.id === 'sunder' ? `; ลด DEF ลง ${20 + 5 * (L - 1)}% เป็นเวลา 7 วินาที`
      : s.id === 'savage_leap' ? '; กระโดดพุ่งเข้าหาเป้าหมาย' : '';
    if (s.type === 'aoe') return `สร้างความเสียหาย ≈ ${dmg} แก่ศัตรูทั้งหมดในรัศมี ${s.radius}${extra}`;
    return `สร้างความเสียหาย ≈ ${dmg} แก่เป้าหมาย${extra}`;
  }

  if (s.id === 'hunters_mark') return `Marks one foe for +${20 + 5 * (L - 1)}% damage taken for 10s`;
  if (s.id === 'sanctuary') return `Creates a 6s healing circle (≈ ${Math.round(p.maxHp * (0.395 + 0.059 * (L - 1)))} total HP)`;
  if (s.type === 'heal') return `Restores ≈ ${Math.round(p.maxHp * (0.12 * s.power) * (1 + 0.15 * (L - 1)))} HP`;
  if (s.type === 'buff') return `Strengthens you for 8s`;
  const dmg = Math.round(p.atkStat * pow);
  const extra = s.id === 'sunder' ? `; reduces DEF by ${20 + 5 * (L - 1)}% for 7s`
    : s.id === 'savage_leap' ? '; leaps to the target' : '';
  if (s.type === 'aoe') return `≈ ${dmg} damage to every foe in radius ${s.radius}${extra}`;
  return `≈ ${dmg} damage to the target${extra}`;
}
// rich hover-tooltip HTML for a skill / passive node
function skillNodeTip(id, isPassive) {
  const p = G.player;
  if (isPassive) {
    const pa = PROGRESSION.passives[id]; if (!pa) return '';
    const lv = p.skillLevels[id] || 0, can = canLearnPassive(p, id);
    const nxt = lv < pa.maxLevel ? T(pa.desc, 'passives').replace('{v}', pa.per * (lv + 1)) : 'MAX';
    const needs = [];
    if (p.tierIndex < (pa.reqTier || 0)) {
      const tierName = PROGRESSION.tiers[p.classId]?.[pa.reqTier]?.name;
      needs.push(currentLang === 'th' ? `เปลี่ยนอาชีพเป็น ${T(tierName, 'ui') || `ระดับ ${pa.reqTier + 1}`}` : `advance to ${tierName || `Tier ${pa.reqTier + 1}`}`);
    }
    if (p.jobLevel < pa.reqLevel) {
      needs.push(currentLang === 'th' ? `เลเวลงาน ${pa.reqLevel}` : `Job Lv ${pa.reqLevel}`);
    }
    if (!p.skillPoints) {
      needs.push(currentLang === 'th' ? `แต้มสกิล 1 แต้ม` : '1 skill point');
    }
    const need = needs.length ? `<div class="tip-gate">🔒 ${currentLang === 'th' ? 'ต้องการ' : 'Requires'}: ${needs.join(', ')}</div>` : '';
    
    let hint = '';
    if (lv >= pa.maxLevel) {
      hint = `<div class="tip-hint" style="color:#e6bd54">${currentLang === 'th' ? 'ระดับสูงสุด' : 'Maxed'}</div>`;
    } else if (can) {
      hint = `<div class="tip-hint" style="color:var(--success)">${currentLang === 'th' ? `คลิกเพื่อ${lv ? 'อัปเกรด' : 'เรียนรู้'} (ใช้ 1 แต้ม)` : `Click to ${lv ? 'raise' : 'learn'} (1 point)`}</div>`;
    }

    const displayName = T(pa.name, 'passives');
    const displayDesc = lv ? `ปัจจุบัน: ${T(pa.desc, 'passives').replace('{v}', pa.per * lv)}` : `แต่ละเลเวล: ${T(pa.desc, 'passives').replace('{v}', pa.per)}`;
    const displayDescEn = lv ? `Now: ${pa.desc.replace('{v}', pa.per * lv)}` : `Each level: ${pa.desc.replace('{v}', pa.per)}`;

    return `<div class="tip-name" style="color:#6fb0ef">${displayName} <small style="color:var(--text-muted)">· ${currentLang === 'th' ? 'ติดตัว' : 'passive'}</small></div>
      <div class="tip-eff">${currentLang === 'th' ? displayDesc : displayDescEn}</div>
      <div class="tip-row">${currentLang === 'th' ? 'เลเวล' : 'Level'} <b>${lv}/${pa.maxLevel}</b>${lv < pa.maxLevel ? ` · ${currentLang === 'th' ? 'ถัดไป' : 'next'}: <b>${nxt}</b>` : ''}</div>
      <div class="tip-flav">${currentLang === 'th' ? 'เพิ่มโบนัสสถานะถาวร — ทำงานตลอดเวลา' : 'Permanent stat bonus — always on.'}</div>${need}${hint}`;
  }
  const s = COMBAT.skills.find(x => x.id === id); if (!s) return '';
  const node = PROGRESSION.skillTree[id] || {}, lv = skillLevel(p, id), max = node.maxLevel || 1, L = lv || 1;
  
  // Format range text
  let rangeTxt = '';
  if (currentLang === 'th') {
    rangeTxt = s.id === 'hunters_mark' ? `ระยะ ${s.range}` : (s.type === 'buff' || s.type === 'heal') ? 'ใช้กับตัวเอง' : s.type === 'aoe' ? `ระยะ ${s.range}, รัศมี ${s.radius}` : `ระยะ ${s.range}`;
  } else {
    rangeTxt = s.id === 'hunters_mark' ? `range ${s.range}` : (s.type === 'buff' || s.type === 'heal') ? 'self-cast' : s.type === 'aoe' ? `range ${s.range}, radius ${s.radius}` : `range ${s.range}`;
  }

  // Format resource text
  let resourceTxt = '';
  if (currentLang === 'th') {
    resourceTxt = s.finisher ? `โมเมนตัม <b>${TUNING.momentum.finisherMin}+</b>` : `MP <b>${s.mpCost}</b>`;
  } else {
    resourceTxt = s.finisher ? `Momentum <b>${TUNING.momentum.finisherMin}+</b>` : `MP <b>${s.mpCost}</b>`;
  }

  const gates = [];
  const rankGate = skillRankGate(p, id);
  if (rankGate && p.tierIndex < rankGate.reqTier) {
    const tierName = PROGRESSION.tiers[p.classId]?.[rankGate.reqTier]?.name;
    gates.push(currentLang === 'th' ? `เปลี่ยนอาชีพเป็น ${T(tierName, 'ui') || `ระดับ ${rankGate.reqTier + 1}`}` : `advance to ${tierName || `Tier ${rankGate.reqTier + 1}`}`);
  }
  if (rankGate && p.jobLevel < rankGate.reqLevel) {
    gates.push(currentLang === 'th' ? `เลเวลงาน ${rankGate.reqLevel}` : `Job Lv ${rankGate.reqLevel}`);
  }
  if (node.reqSkill && skillLevel(p, node.reqSkill.id) < node.reqSkill.lvl) {
    const reqName = COMBAT.skills.find(x => x.id === node.reqSkill.id)?.name;
    gates.push(currentLang === 'th' ? `${T(reqName, 'skills')} เลเวล ${node.reqSkill.lvl}` : `${reqName} Lv ${node.reqSkill.lvl}`);
  }
  if (!p.skillPoints && lv < max) {
    gates.push(currentLang === 'th' ? `แต้มสกิล 1 แต้ม` : '1 skill point');
  }

  const gateHtml = gates.length ? `<div class="tip-gate">🔒 ${currentLang === 'th' ? 'ต้องการ' : 'Requires'}: ${gates.join(', ')}</div>` : '';
  
  let hint = '';
  if (lv >= max) {
    hint = `<div class="tip-hint" style="color:#e6bd54">${currentLang === 'th' ? 'ระดับสูงสุด' : 'Maxed out'}</div>`;
  } else if (!gates.length) {
    hint = `<div class="tip-hint" style="color:var(--success)">${currentLang === 'th' ? `คลิกเพื่อ${lv ? 'อัปเกรด' : 'เรียนรู้'} (ใช้ 1 แต้ม)` : `Click to ${lv ? 'upgrade' : 'learn'} (1 point)`}</div>`;
  }

  let masteryHtml = '';
  if (node.tierCaps) {
    if (currentLang === 'th') {
      masteryHtml = `<div class="tip-mastery">จำกัดเลเวลอาชีพแรก <b>เลเวล ${node.tierCaps[0]}</b> · ความชำนาญอาชีพที่สอง <b>เลเวล ${node.tierCaps[0] + 1}–${node.maxLevel}</b>${lv >= node.tierCaps[0] && lv < node.maxLevel ? ` · ขั้นถัดไปที่เลเวลงาน ${rankGate?.reqLevel}` : ''}</div>`;
    } else {
      masteryHtml = `<div class="tip-mastery">First-job cap <b>Lv ${node.tierCaps[0]}</b> · second-job mastery <b>Lv ${node.tierCaps[0] + 1}–${node.maxLevel}</b>${lv >= node.tierCaps[0] && lv < node.maxLevel ? ` · next rank at Job ${rankGate?.reqLevel}` : ''}</div>`;
    }
  }

  const displayEffect = currentLang === 'th' ? ({ bleed: 'เลือดออก', poison: 'ยาพิษ', freeze: 'แช่แข็ง', stun: 'มึนงง', slow: 'สโลว์', mark: 'มาร์ก' }[s.effect] || s.effect) : s.effect;

  const mechanics = [];
  if (isDamageSkill(s) && !s.finisher) {
    mechanics.push(currentLang === 'th' 
      ? `<span class="tip-mechanic build">+M บิวเดอร์</span> โจมตีโดนเพื่อรับโมเมนตัม +${TUNING.momentum.perHit} แต้ม`
      : `<span class="tip-mechanic build">+M Builder</span> Land a hit to gain +${TUNING.momentum.perHit} Momentum.`);
  }
  if (s.effect && isDamageSkill(s)) {
    mechanics.push(currentLang === 'th'
      ? `<span class="tip-mechanic setup">เซ็ตอัป</span> มอบสถานะ <b>${displayEffect}</b>`
      : `<span class="tip-mechanic setup">Setup</span> Applies <b>${s.effect}</b>.`);
  }
  if (s.detonate) {
    mechanics.push(currentLang === 'th'
      ? `<span class="tip-mechanic detonate">ระเบิดสถานะ</span> ใช้สถานะ <b>${displayEffect}</b> เพื่อสร้างความเสียหายเพิ่ม +${Math.round(TUNING.momentum.detonateBonus * 100)}%${s.effect === s.detonate ? ' แล้วมอบสถานะอีกครั้ง' : ''}`
      : `<span class="tip-mechanic detonate">Detonate</span> Consumes active <b>${s.detonate}</b> for +${Math.round(TUNING.momentum.detonateBonus * 100)}% damage${s.effect === s.detonate ? ', then reapplies it' : ''}.`);
  }
  if (s.finisher) {
    mechanics.push(currentLang === 'th'
      ? `<span class="tip-mechanic finish">ฟินิชเชอร์</span> ใช้โมเมนตัมทั้งหมดเพื่อสร้างความเสียหายเพิ่มขึ้น +${Math.round(TUNING.momentum.powerPerPoint * 100)}% ต่อแต้ม`
      : `<span class="tip-mechanic finish">Finisher</span> Consumes all Momentum for +${Math.round(TUNING.momentum.powerPerPoint * 100)}% damage per point.`);
  }
  const mechanicHtml = mechanics.length ? `<div class="tip-mechanics">${mechanics.map(x => `<div>${x}</div>`).join('')}</div>` : '';
  
  const key = hotkeyForSkill(p, id);
  let barHint = '';
  if (lv) {
    if (currentLang === 'th') {
      barHint = `<div class="tip-bar">${key ? `ปุ่มใช้งาน <kbd>${key}</kbd>` : 'ไม่ได้อยู่บนแถบใช้งาน — ลากโหนดนี้ลงในช่อง'}</div>`;
    } else {
      barHint = `<div class="tip-bar">${key ? `Action key <kbd>${key}</kbd>` : 'Not on action bar — drag this node onto a slot.'}</div>`;
    }
  }

  const displayType = currentLang === 'th' ? ({ active: 'ใช้งาน', passive: 'ติดตัว', heal: 'รักษา', aoe: 'โจมตีหมู่', buff: 'บัฟ' }[s.type] || s.type) : s.type;

  return `<div class="tip-name">${T(s.name, 'skills')} <small style="color:var(--text-muted)">· ${displayType}${s.effect ? ` · ${currentLang === 'th' ? 'มอบสถานะ' : 'inflicts'} ${displayEffect}` : ''}</small></div>
    <div class="tip-eff">${skillEffectLine(s, L, p)} <small style="color:var(--text-muted)">(${lv ? (currentLang === 'th' ? 'เลเวล ' : 'Lv ') + lv : (currentLang === 'th' ? 'ที่ เลเวล 1' : 'at Lv 1')})</small></div>
    <div class="tip-row">${resourceTxt} · ${currentLang === 'th' ? 'คูลดาวน์' : 'cooldown'} <b>${s.cooldownMs / 1000}${currentLang === 'th' ? ' วินาที' : 's'}</b> · ${rangeTxt}</div>
    <div class="tip-row">${currentLang === 'th' ? 'เลเวล' : 'Level'} <b>${lv}/${max}</b></div>${masteryHtml}
    ${mechanicHtml}<div class="tip-flav">"${T(s.flavor, 'skills')}"</div>${barHint}${gateHtml}${hint}`;
}
function hideSkillTip() { const t = document.getElementById('sk-tip'); if (t) t.style.display = 'none'; }

const WORLD_SIGIL = {
  town_awakening: '⌂', whispering_woods: '♣', sunken_ruins: '†',
  frostpeak_tundra: '▲', dragon_caldera: '♨', astral_rift: '✦',
};
function worldChronicleHtml() {
  const knownCount = WORLD_ORDER.filter(id => G.visited.has(id)).length;
  const nodes = WORLD_ORDER.map((id, index) => {
    const map = MAPS[id], known = G.visited.has(id), current = G.mapId === id;
    const routed = G.taskGuide?.source === 'world' && G.taskGuide.mapId === id;
    if (!known) {
      return `<article class="world-node unknown" aria-label="${T('Uncharted region', 'ui')}">
        <div class="world-sigil">?</div><div class="world-copy"><span class="world-province">${T('UNCHARTED', 'ui')}</span>
        <b>${T('Beyond the inked road', 'ui')}</b><p>${T('Walk this land before its name and history can enter your Chronicle.', 'ui')}</p></div></article>`;
    }
    const c = map.chronicle, guardianId = zoneGuardian(id), guardian = guardianId ? monById[guardianId] : null;
    const guardianSlain = guardianId && G.guardiansSlain.has(guardianId);
    const threat = map.band ? `Lv ${map.band[0]}–${map.band[1]}` : T('Sanctuary', 'ui');
    const guardianFact = guardian
      ? `<span class="world-fact ${guardianSlain ? 'cleared' : ''}"><small>${T('GUARDIAN', 'ui')}</small>${guardianSlain ? '✓ ' : ''}${esc(T(guardian.name, 'monsters'))}</span>`
      : `<span class="world-fact cleared"><small>${T('STATUS', 'ui')}</small>${T('Safe haven', 'ui')}</span>`;
    const route = current
      ? `<span class="world-you-are-here">◆ ${T('YOU ARE HERE', 'ui')}</span>`
      : `<button class="btn btn--ghost world-route${routed ? ' active' : ''}" data-world-route="${id}">${routed ? '◆ ' + T('Route active', 'ui') : '➤ ' + T('Plot route', 'ui')}</button>`;
    return `<article class="world-node known${current ? ' current' : ''}${routed ? ' routing' : ''}">
      <div class="world-sigil">${WORLD_SIGIL[id] || '◆'}</div>
      <div class="world-copy">
        <div class="world-node-head"><div><span class="world-province">${esc(T(c.province, 'maps'))}</span><b>${esc(T(map.name, 'maps'))}</b><em>${esc(T(c.epithet, 'maps'))}</em></div>${route}</div>
        <p>${esc(T(c.lore, 'maps'))}</p>
        <div class="world-facts"><span class="world-fact"><small>${T('LANDMARK', 'ui')}</small>${esc(T(c.landmark, 'maps'))}</span><span class="world-fact"><small>${T('THREAT', 'ui')}</small>${threat}</span>${guardianFact}</div>
      </div></article>`;
  }).map((node, index) => {
    if (index >= WORLD_ORDER.length - 1) return node;
    const roadKnown = G.visited.has(WORLD_ORDER[index]) && G.visited.has(WORLD_ORDER[index + 1]);
    return `${node}<div class="world-link${roadKnown ? ' known' : ''}"><i></i><span>${roadKnown ? T('ROAD RECORDED', 'ui') : T('THE INK FADES', 'ui')}</span></div>`;
  }).join('');
  return `<section class="world-chronicle">
    <header class="world-head"><div><small>${T('AETHERIA · THE THIRD VEIL AGE', 'ui')}</small><h2>${T('Roads of the Outworlder', 'ui')}</h2><p>${T('Places become history only after you walk them. Recorded roads can be plotted, but never skipped.', 'ui')}</p></div>
      <div class="world-seal" role="progressbar" aria-label="${T('Regions discovered', 'ui')}" aria-valuemin="0" aria-valuemax="${WORLD_ORDER.length}" aria-valuenow="${knownCount}"><b>${knownCount}/${WORLD_ORDER.length}</b><span>${T('CHARTED', 'ui')}</span></div></header>
    <div class="world-road">${nodes}</div>
    <footer class="world-foot"><span>◆ ${T('current location', 'ui')}</span><span>✓ ${T('guardian conquered', 'ui')}</span><span>${T('Route guidance follows real portals', 'ui')}</span></footer>
  </section>`;
}

function panelBody(id) {
  const p = G.player;
  if (id === 'hotkeys') return hotkeysPanelHtml(p);
  if (id === 'world') return worldChronicleHtml();
  if (id === 'char') {
    const s = p.stats;
    const tiers = PROGRESSION.tiers[p.classId] || [];
    const next = tiers[p.tierIndex + 1];
    
    const STAT_DESC = currentLang === 'th' ? {
      str: 'พลังโจมตีกายภาพ (phys ATK)',
      agi: 'ความเร็วโจมตี & เดิน · หลบหลีก (ASPD/FLEE)',
      vit: 'HP สูงสุด · พลังป้องกัน (max HP/DEF)',
      int: 'พลังโจมตีเวท · MP · ระยะทาง (magic ATK/MP/reach)',
      dex: 'ความแม่นยำ · โจมตีไกล (HIT/ranged ATK)',
      luk: 'โอกาสคริติคอล (crit chance)'
    } : {
      str: 'phys ATK',
      agi: 'atk & walk speed · flee',
      vit: 'max HP · DEF',
      int: 'magic ATK · MP · reach',
      dex: 'HIT · ranged ATK',
      luk: 'crit chance'
    };
    
    const statRow = k => {
      const c = statCost(p, k);
      const titleText = currentLang === 'th'
        ? `ใช้ ${c} ${c > 1 ? T('points', 'ui') : T('point', 'ui')}`
        : `costs ${c} point${c > 1 ? 's' : ''}`;
      return `<div class="stat-row"><span>${k.toUpperCase()} <b>${s[k]}</b> <small style="color:var(--text-muted)">${STAT_DESC[k]}</small></span>
        <button class="btn stat-plus" data-stat="${k}" title="${titleText}" ${p.statPoints >= c ? '' : 'disabled'}>+<small style="opacity:.75">${c}</small></button></div>`;
    };
    
    const aspd = Math.round((1 - (p.atkDelay || 1000) / COMBAT.attackSpeedMs) * 100);
    const move = Math.round(((p.moveMult || 1) - 1) * 100);
    
    const tierText = currentLang === 'th'
      ? `ระดับอาชีพ ${p.tierIndex + 1}${next ? ` · ถัดไป: <b style="color:var(--text)">${T(next.name, 'classes')}</b> ที่ Lv ${next.reqLevel}` : ` · ${T('max advancement', 'ui')}`}`
      : `Tier ${p.tierIndex + 1}${next ? ` · next: <b style="color:var(--text)">${next.name}</b> @ Lv ${next.reqLevel}` : ' · max advancement'}`;
      
    return `<div style="display:flex;gap:22px;flex-wrap:wrap">
      <div style="min-width:230px">
        <b style="color:var(--accent-alt)">${p.name}</b> — ${T(p.className, 'classes')}
        <div style="color:var(--text-muted);font-size:12px;margin:2px 0 8px">
          ${tierText}<br>
          ${T('Level', 'ui')} <b style="color:var(--text)">${p.level}</b>/${DESIGN.levelCap} &nbsp; XP ${Math.floor(p.xp)}/${p.level >= DESIGN.levelCap ? 'MAX' : xpForNext(p.level)}<br>
          ${T('Job Lv', 'ui')} <b style="color:#6fb0ef">${p.jobLevel}/${PROGRESSION.jobLevelCap}</b> &nbsp; Job XP ${p.jobLevel >= PROGRESSION.jobLevelCap ? 'MAX' : `${Math.floor(p.jobXp)}/${jobXpForNext(p.jobLevel)}`}
        </div>
        <div style="font-size:12px;margin-bottom:6px;color:var(--text-muted)">${T('Recommended build:', 'ui')} <b style="color:#c77dff;letter-spacing:2px">${recommendedBuild(p._cls.statGrowthPerLevel)}</b></div>
        <div style="color:var(--accent-alt);margin-bottom:6px">${T('Unspent stat points:', 'ui')} <b>${p.statPoints}</b> <small style="color:var(--text-muted)">· ${T('higher stats cost more per +', 'ui')}</small></div>
        ${['str','agi','vit','int','dex','luk'].map(statRow).join('')}
      </div>
      <div style="color:var(--text-muted);min-width:240px">
        <div style="display:flex;justify-content:center;margin-bottom:4px">${svgRadar(s)}</div>
        ${T('ATK', 'ui')} <b style="color:var(--text)">${p.atkStat}</b> &nbsp; ${T('DEF', 'ui')} <b style="color:var(--text)">${p.physDef}</b><br>
        ${T('HIT', 'ui')} ${p.hit} &nbsp; ${T('FLEE', 'ui')} ${p.flee} &nbsp; ${T('CRIT', 'ui')} ${p.critChance}%<br>
        ${T('Max HP', 'ui')} ${p.maxHp} &nbsp; ${T('Max MP', 'ui')} ${p.maxMp}<br>
        ${T('ASPD', 'ui')} <b style="color:var(--text)">+${aspd}%</b> · ${T('Move', 'ui')} <b style="color:var(--text)">+${move}%</b>${p.rangeBonus ? ` · ${T('Reach', 'ui')} <b style="color:var(--text)">+${p.rangeBonus.toFixed(1)}</b> ${T('tiles', 'ui')}` : ''}<br>
        <div style="color:var(--accent-alt);margin:10px 0 6px">${T('Equipment', 'ui')}</div>
        ${gearBuildAdviceHtml(p)}
        ${equippedGearSummaryHtml(p)}
        ${paperDoll(p)}
        <div style="color:var(--accent-alt);margin:10px 0 6px">✦ ${T('Rebirth', 'ui')}${p.rebirths ? ` <b style="color:#c77dff">×${p.rebirths}</b>` : ''}</div>
        <div style="font-size:12px">${T('Each rebirth: +{s} all stats, +{p}% HP/MP — forever.', 'ui').replace('{s}', TUNING.rebirthStatBonus).replace('{p}', Math.round(TUNING.rebirthHpMpPct * 100))}</div>
        <div style="font-size:12px;color:#e2695f">${T('The world bites back: each rebirth gives monsters +{h}% HP, +{d}% DEF, and +{a}% ATK. Retained attack gear adds early-run HP that fades by max level; EXP rises +{x}%.', 'ui').replace('{h}', Math.round(TUNING.rebirthMonsterHpMult * 100)).replace('{d}', Math.round(TUNING.rebirthMonsterDefMult * 100)).replace('{a}', Math.round(TUNING.rebirthMonsterAtkMult * 100)).replace('{x}', Math.round(TUNING.rebirthMonsterExp * 100))}</div>
        ${p.level >= DESIGN.levelCap
          ? `<button class="btn" data-rebirth="1" style="margin-top:6px">✦ ${T('Rebirth now', 'ui')}</button>
             <div style="font-size:11px;color:#e2695f;margin-top:4px">${T('Resets level, job, skills, and stat points. Keeps gear, zeny, guild rank, and the world.', 'ui')}</div>`
          : `<div style="font-size:11px;color:var(--text-muted)">${T('Unlocks at Base Lv {lvl}.', 'ui').replace('{lvl}', DESIGN.levelCap)}</div>`}
        <div style="color:var(--accent-alt);margin:10px 0 6px">🏆 ${T('Achievements', 'ui')} (${G.achievements.size}/${CONTENT.achievements.length})</div>
        ${CONTENT.achievements.map(a => { const got = G.achievements.has(a.id); return `<div style="opacity:${got ? 1 : .45};padding:1px 0;font-size:12px">${a.icon} <b style="color:${got ? 'var(--text)' : 'var(--text-muted)'}">${T(a.name, 'achievements')}</b> — <small>${T(a.desc, 'achievements')}</small></div>`; }).join('')}
      </div></div>`;
  }
  if (id === 'inv') {
    if (!p.inventory.length) return `<div style="color:var(--accent-alt);margin-bottom:8px">💰 ${p.zeny} ${T('zeny', 'ui')}</div><i>${T('Bag is empty.', 'ui')}</i>`;
    const tab = G._bagTab || 'all';
    const tabs = [['all', T('All', 'ui')], ['gear', T('Gear', 'ui')], ['use', T('Use', 'ui')], ['etc', T('Etc', 'ui')], ['quest', T('Quest', 'ui')]];
    const inTab = it => tab === 'all' || (tab === 'gear' && ['weapon', 'armor', 'accessory'].includes(it.type)) || (tab === 'use' && ['potion', 'reset'].includes(it.type)) || (tab === 'etc' && it.type === 'material') || (tab === 'quest' && it.type === 'quest');
    const cat = ITEM_CAT, ORDER = ITEM_CAT_ORDER;
    const rarRank = e => e.uid ? RARITY_ORDER.indexOf(e.rarity) : -1;
    const groups = {};
    for (const e of p.inventory) { const it = itemById[e.itemId]; if (!inTab(it)) continue; const c = cat(it); (groups[c] = groups[c] || []).push(e); }
    const slotRank = e => e.uid ? EQUIP_SLOTS.indexOf(itemSlot(itemById[e.itemId])) : 99;
    for (const c in groups) groups[c].sort((a, b) => (slotRank(a) - slotRank(b)) || (rarRank(b) - rarRank(a)) || ((b.plus || 0) - (a.plus || 0)) || itemById[a.itemId].name.localeCompare(itemById[b.itemId].name));

    const rowHtml = e => {
      const it = itemById[e.itemId];
      if (e.uid) {   // rarity-rolled equipment instance — compare vs the item's slot
        const rc = itemRarity(e), slot = itemSlot(it);
        return `<div class="gear-row">
          <div class="gear-row__copy">${itemIconImg(e.itemId)} <b style="color:${rc.color}">${esc(instName(e))}</b> <small style="color:${rc.color}">◆${rc.name}</small> <small style="color:var(--text-muted)">[${T(SLOT_LABEL[slot], 'ui')}]</small> — ${itemMainStatsHtml(e)}
            <span class="gear-bonuses">${itemAffixesHtml(e, p)}</span>${gearComparisonHtml(e, p)}</div>
          <button class="btn" data-equip="${e.uid}">${T('Equip', 'ui')}</button></div>`;
      }
      const act = it.type === 'potion'
        ? `<span style="display:flex;gap:6px"><button class="btn" data-use="${it.id}">${T('Use', 'ui')}</button><button class="btn btn--ghost" data-assign-item="${it.id}" title="${T('Assign to a hotkey', 'ui')}">${T('→Bar', 'ui')}</button></span>`
        : it.type === 'reset' ? `<button class="btn reset-use" data-use="${it.id}">${T('Use', 'ui')}</button>` : '';
      return `<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:4px 0;border-bottom:1px solid rgba(201,162,75,.12)">
        <span>${itemIconImg(e.itemId)} <b>${T(it.name, 'items')}</b> ×${e.qty}<br><small style="color:var(--text-muted)">${T(it.desc, 'items')}</small></span>${act}</div>`;
    };
    const tabsHtml = `<div class="bag-tabs">${tabs.map(([k, l]) => `<span class="bag-tab ${tab === k ? 'on' : ''}" data-bagtab="${k}">${l}</span>`).join('')}</div>`;
    const body = Object.keys(groups).sort((a, b) => ORDER[a] - ORDER[b]).map(c => `<div class="bag-cat">${T(c, 'ui')} (${groups[c].length})</div>${groups[c].map(rowHtml).join('')}`).join('');
    return `<div style="color:var(--accent-alt);margin-bottom:8px">💰 ${p.zeny} ${T('zeny', 'ui')}</div>${tabsHtml}${body || `<i>${T('Nothing in this tab.', 'ui')}</i>`}`;
  }
  if (id === 'skills') return skillsPanelHtml(p);
  if (id === 'quest') {
    const q = questById[G.quest], pending = questById[G.pendingQuest];
    let story = q
      ? `<div class="q-card task-card story-active-card${G.taskGuide?.source === 'story' ? ' active' : ''}" style="--phase-color:${storyPhaseFor(q)?.color || 'var(--accent-alt)'}" data-task="story" data-task-id="${q.id}" title="${T('Navigate to this task', 'ui')}">${storyPhaseBadge(q)}<br><b style="color:var(--accent-alt)">${T(q.name, 'quests')}</b> ${diffBadge(q.difficulty)} <small style="color:var(--text-muted)">${T('Recommended Lv', 'ui')} ${q.minLevel}+</small><br>${T(q.description, 'quests')}<br>
          <small>${T('Objective', 'ui')}: ${T(q.objective.type, 'ui')} ${objectiveName(q.objective)} — ${questProgress(q)}/${q.objective.count}</small><br>
          <small style="color:var(--text-muted)">${T('Reward', 'ui')}: ${q.rewards.exp} XP, ${q.rewards.zeny} Zeny, ${q.rewards.items.map(i => T(itemById[i].name, 'items')).join(', ')}</small></div>`
      : pending
        ? `<div class="q-card story-wait-card">${storyPhaseBadge(pending)}<br><b style="color:var(--accent-alt)">${T('Next ·', 'ui')} ${T(pending.name, 'quests')}</b> ${diffBadge(pending.difficulty)}<br>
          <span class="story-lock-copy">${currentLang === 'th' ? `🔒 ต้องการ <b>เลเวลหลัก ${pending.minLevel}</b> เพื่อเริ่มต้นเควสต์นี้ ปัจจุบันคุณเลเวล ${p.level}` : `🔒 Reach <b>Base Lv ${pending.minLevel}</b> to begin this quest. You are Lv ${p.level}.`}</span>
          <div class="story-level-bar"><i style="width:${Math.min(100, Math.round(p.level / pending.minLevel * 100))}%"></i></div>
          <small style="color:var(--text-muted)">${T("Keep training through zone hunts and Adventurer's Guild bounties. The chapter starts automatically when you level up.", 'ui')}</small></div>`
        : `<div class="q-card"><i>${T("Main story complete — Aetheria is yours to roam. Take guild bounties below, or turn on auto-farm.", 'ui')}</i></div>`;
    if (G.advance) {
      const a = G.advance, o = a.def.objective;
      story = `<div class="q-card task-card${G.taskGuide?.source === 'advance' ? ' active' : ''}" data-task="advance" title="${T('Navigate to this task', 'ui')}" style="border-color:var(--accent-alt)"><b style="color:var(--accent-alt)">✦ ${T(a.def.name, 'quests')}</b> <small style="color:var(--text-muted)">(${T('class advancement', 'ui')})</small><br>${T(a.def.desc, 'quests')}<br>
        <small style="color:${advanceProgress() >= o.count ? 'var(--success)' : 'var(--text)'}">${T(o.type, 'ui')} ${objectiveName(o)}: ${advanceProgress()}/${o.count}</small></div>` + story;
    }
    const bStatus = g => {
      if (g.kind === 'deliver') { const have = Math.min(itemQty(g.target), g.count);
        return have >= g.count ? `<b style="color:var(--success)">${T('Goods ready — deliver to the guild hall', 'ui')}</b>` : (currentLang === 'th' ? `มีแล้ว ${have}/${g.count}` : `have ${have}/${g.count}`); }
      return g.done ? `<b style="color:var(--success)">${T('Complete — report to the guild hall', 'ui')}</b>` : (currentLang === 'th' ? `ความคืบหน้า ${g.progress}/${g.count}` : `Progress ${g.progress}/${g.count}`);
    };
    const active = G.activeGuilds.length
      ? G.activeGuilds.map(g => `<div class="q-card task-card${G.taskGuide?.taskId === g.id ? ' active' : ''}" data-task="guild" data-task-id="${g.id}" title="${T('Navigate to this task', 'ui')}" style="border-color:${(g.done || (g.kind === 'deliver' && itemQty(g.target) >= g.count)) ? 'var(--success)' : 'var(--panel-border)'}">
          <b>${g.kind === 'deliver' ? '📦 ' + T('Deliver', 'ui') : '⚔ ' + T('Cull', 'ui')} ${g.count} ${T(g.targetName, g.kind === 'deliver' ? 'items' : 'monsters')}</b> ${diffBadge(g.difficulty)}<br>
          <small style="color:var(--accent-alt)">${bountyWhere(g)}</small><br>${bountyLevelHtml(g)}<br>
          <small>${bStatus(g)} — ${T('Reward', 'ui')}: ${g.reward.exp} XP, ${g.reward.zeny} Zeny, ${g.pts || 0} pts</small>
          <div class="bounty-actions">${guildRevokeButton(g)}</div></div>`).join('')
      : `<div style="color:var(--text-muted);font-size:12px;margin:4px 0">${T('No bounties accepted.', 'ui')}</div>`;
    return `<div class="q-cat">📖 ${T('Main Story', 'ui')} · ${T('Base Lv', 'ui')} 1–${DESIGN.levelCap}</div>${storyRoadmapHtml()}${story}
      <div class="q-cat">🏰 ${T('Accepted Bounties', 'ui')} (${G.activeGuilds.length}/${GUILD_MAX_ACTIVE})</div>${active}
      <div style="color:var(--text-muted);font-size:12px;margin-top:6px">${T('Accept and claim bounties with Elder Maro at the guild hall in town.', 'ui')}</div>`;
  }
  if (id === 'guild') {
    const slotsFree = GUILD_MAX_ACTIVE - G.activeGuilds.length;
    const active = G.activeGuilds.length
      ? `<div class="q-cat" style="font-size:13px">📜 ${T('Your open bounties', 'ui')}</div>` + G.activeGuilds.map(g => {
        const ready = g.kind === 'deliver' ? itemQty(g.target) >= g.count : !!g.done;
        const prog = g.kind === 'deliver' ? (currentLang === 'th' ? `มีแล้ว ${Math.min(itemQty(g.target), g.count)}/${g.count}` : `have ${Math.min(itemQty(g.target), g.count)}/${g.count}`) : `${g.progress}/${g.count}`;
        return `<div class="q-card" style="border-color:${ready ? 'var(--success)' : 'var(--panel-border)'}"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
          <span>${g.kind === 'deliver' ? '📦' : '⚔'} <b>${T(g.targetName, g.kind === 'deliver' ? 'items' : 'monsters')}</b> ×${g.count} ${diffBadge(g.difficulty)}<br><small style="color:var(--accent-alt)">${bountyWhere(g)}</small><br>${bountyLevelHtml(g)}<br><small style="color:var(--text-muted)">${prog} · ${g.reward.exp} XP, ${g.reward.zeny} Zeny, <b style="color:var(--accent-alt)">${g.pts || 0} pts</b></small></span>
          <span class="bounty-actions"><button class="btn btn--ghost" data-task="guild" data-task-id="${g.id}" title="${T('Navigate to this task', 'ui')}">➤</button><button class="btn" data-guildclaim="${g.id}" ${ready ? '' : 'disabled'}>${g.kind === 'deliver' ? T('Turn in', 'ui') : T('Claim', 'ui')}</button>${guildRevokeButton(g)}</span></div></div>`;
      }).join('') : '';
    let lockHint = '';
    for (let i = 1; i < ZONE_ORDER.length; i++) if (!G.guardiansSlain.has(zoneGuardian(ZONE_ORDER[i - 1]))) {
      lockHint = currentLang === 'th'
        ? `<div style="color:var(--text-muted);font-size:12px;margin-bottom:6px">🔒 ปราบ <b>${T(monById[zoneGuardian(ZONE_ORDER[i - 1])].name, 'monsters')}</b> (${T(MAPS[ZONE_ORDER[i - 1]].name, 'maps')}) เพื่อปลดล็อกเควสต์ของ <b>${T(MAPS[ZONE_ORDER[i]].name, 'maps')}</b></div>`
        : `<div style="color:var(--text-muted);font-size:12px;margin-bottom:6px">🔒 Slay <b>${monById[zoneGuardian(ZONE_ORDER[i - 1])].name}</b> (${MAPS[ZONE_ORDER[i - 1]].name}) to unlock <b>${MAPS[ZONE_ORDER[i]].name}</b> bounties.</div>`;
      break;
    }
    const acceptHint = lockHint + `<div style="color:var(--text-muted);font-size:12px;margin-bottom:6px">${
      currentLang === 'th'
        ? (slotsFree ? `มีช่องรับภารกิจว่างอยู่ ${slotsFree} ช่อง — เลือกรับได้ที่ด้านล่างนี้:` : 'ช่องรับภารกิจกิลด์เต็มแล้ว — ส่งเควสเดิมก่อน')
        : (slotsFree ? `${slotsFree} bounty slot${slotsFree > 1 ? 's' : ''} free — accept below:` : 'All bounty slots in use — finish one first.')
    }</div>`;
    const board = (G.guildBoard || []).map(bq => `<div class="q-card"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
      <span>${diffBadge(bq.difficulty)} ${bq.kind === 'deliver' ? T('Deliver', 'ui') : T('Cull', 'ui')} ${bq.count} <b>${T(bq.targetName, bq.kind === 'deliver' ? 'items' : 'monsters')}</b><br><small style="color:var(--accent-alt)">${bountyWhere(bq)}</small><br>${bountyLevelHtml(bq)}<br><small style="color:var(--text-muted)">${T('Reward', 'ui')}: ${bq.reward.exp} XP, ${bq.reward.zeny} Zeny · <b style="color:var(--accent-alt)">${bq.pts} guild pts</b></small></span>
      <button class="btn" data-guild="${bq.id}" ${slotsFree ? '' : 'disabled'}>${T('Accept', 'ui')}</button></div></div>`).join('');
    const boardHead = `<div class="q-cat guild-board-head"><span>📋 ${T('Available Bounties', 'ui')}</span><button class="btn btn--ghost" data-guildrefresh="1">↻ ${T('Refresh Board', 'ui')}</button></div>`;
    const ri = G.guildRankIdx || 0, pts = G.guildPoints || 0, atMax = ri >= GUILD_RANKS.length - 1;
    const unlocks = ri < GUILD_HARD_AT ? (currentLang === 'th' ? `เควสต์ระดับยากเปิดเมื่อยศ ${T(GUILD_RANKS[GUILD_HARD_AT], 'ui')}` : `hard bounties at ${GUILD_RANKS[GUILD_HARD_AT]}`) : ri < GUILD_ELITE_AT ? (currentLang === 'th' ? `เควสต์ระดับอีลิทเปิดเมื่อยศ ${T(GUILD_RANKS[GUILD_ELITE_AT], 'ui')}` : `elite bounties at ${GUILD_RANKS[GUILD_ELITE_AT]}`) : T('all bounty tiers unlocked', 'ui');
    const rankHead = `<div class="q-cat" style="display:flex;justify-content:space-between;align-items:baseline;gap:10px">
      <span>🏅 <span style="font-size:12px;background:rgba(230,189,84,.15);border:1px solid #e6bd54;border-radius:9px;padding:1px 9px;color:#e6bd54">${currentLang === 'th' ? 'ยศ ' + T(GUILD_RANKS[ri], 'ui') : 'Rank ' + GUILD_RANKS[ri]}</span></span>
      <small style="color:var(--text-muted);font-weight:400">${atMax ? T('MAX rank', 'ui') : `${pts}/${guildPointsNeed(ri)} pts ${currentLang === 'th' ? 'เพื่อเลื่อนเป็น' : 'to'} ${T(GUILD_RANKS[ri + 1], 'ui')}`} · ${unlocks}</small></div>`;
    return `${rankHead}<div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">${T("Points scale with the bounty's region (deeper zones pay far more) × its difficulty.", 'ui')}</div>${active}${acceptHint}${boardHead}${board}`;
  }
  if (id === 'shop') {
    if (!G.shopRotation?.stock || now() - G.shopRotation.at > TUNING.shopStockMs) rerollShop();
    const tab = G._shopTab || 'buy', rankIdx = effectiveShopRankIdx();
    const guildRankIdx = G.guildRankIdx || 0, storyRankIdx = storyShopRankIdx();
    
    const guildRankText = currentLang === 'th'
      ? `ยศร้านค้า <b style="color:#e6bd54">${T(GUILD_RANKS[rankIdx], 'ui')}</b> · กิลด์ ${T(GUILD_RANKS[guildRankIdx], 'ui')} / เนื้อเรื่อง ${T(GUILD_RANKS[storyRankIdx], 'ui')}`
      : `Trader Rank <b style="color:#e6bd54">${GUILD_RANKS[rankIdx]}</b> · Guild ${GUILD_RANKS[guildRankIdx]} / Story ${GUILD_RANKS[storyRankIdx]}`;

    const head = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <span style="color:var(--accent-alt)">💰 ${p.zeny} ${T('zeny', 'ui')}</span>
      <span style="font-size:12px;color:var(--text-muted)">🏅 ${guildRankText}</span></div>
      <div class="bag-tabs">
        <span class="bag-tab ${tab === 'buy' ? 'on' : ''}" data-shoptab="buy">${T('Buy', 'ui')}</span>
        <span class="bag-tab ${tab === 'sell' ? 'on' : ''}" data-shoptab="sell">${T('Sell', 'ui')}</span>
        <span class="bag-tab ${tab === 'enhance' ? 'on' : ''}" data-shoptab="enhance">${T('Enhance', 'ui')}</span>
        <span class="bag-tab ${tab === 'craft' ? 'on' : ''}" data-shoptab="craft">${T('Craft', 'ui')}</span>
        <span class="bag-tab ${tab === 'storage' ? 'on' : ''}" data-shoptab="storage">${T('Storage', 'ui')}</span>
      </div>
      ${tab === 'buy' ? `<div class="shop-rarity-note">✦ ${T('Rolled gear keeps its shown rarity and substats until stock rotates. Main-story chapters or Guild Rank can raise Trader Rank and improve rarity odds.', 'ui')}<br>🏆 ${T('Full catalog: finish the main story AND reach Guild Rank S to unlock Trader Rank S.', 'ui')}</div>${gearBuildAdviceHtml(p)}` : ''}`;

    if (tab === 'craft') {
      const have = id => p.inventory.find(e => !e.uid && e.itemId === id)?.qty || 0;
      const rows = (CONTENT.recipes || []).map(r => {
        const out = itemById[r.out];
        const ok = p.zeny >= r.cost && r.mats.every(m => have(m.itemId) >= m.qty);
        const mats = r.mats.map(m => {
          const g = have(m.itemId) >= m.qty;
          return `<span style="color:${g ? 'var(--text)' : '#e2695f'}">${itemIconImg(m.itemId)} ${T(itemById[m.itemId].name, 'items')} ${Math.min(have(m.itemId), m.qty)}/${m.qty}</span>`;
        }).join(' · ');
        return `<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:5px 0;border-bottom:1px solid rgba(201,162,75,.15)">
          <span>${itemIconImg(r.out)} <b>${T(out.name, 'items')}</b> — ${r.cost}z<br>
            <small style="color:var(--text-muted)">${T(out.desc, 'items')}</small><br><small>${mats}</small></span>
          <button class="btn" data-craft="${r.id}" ${ok ? '' : 'disabled'}>${T('Craft', 'ui')}</button></div>`;
      }).join('');
      return head + `<div style="font-size:12px;color:var(--text-muted);margin-bottom:6px">${T('Turn spare materials into supplies and gear.', 'ui')}</div>${rows}`;
    }

    if (tab === 'storage') {
      const line = (e, action, idx) => {
        const it = itemById[e.itemId];
        return `<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:4px 0;border-bottom:1px solid rgba(201,162,75,.15)">
          <span>${itemIconImg(e.itemId)} ${e.uid ? instName(e) : `<b>${T(it.name, 'items')}</b>`}${!e.uid && e.qty > 1 ? ` ×${e.qty}` : ''}</span>
          <button class="btn" data-${action}="${idx}">${T(action === 'deposit' ? 'Deposit' : 'Withdraw', 'ui')}</button></div>`;
      };
      const stored = G.storage.map((e, i) => line(e, 'withdraw', i)).join('')
        || `<div style="color:var(--text-muted);padding:4px 0">${T('The chest is empty.', 'ui')}</div>`;
      const bag = p.inventory
        .map((e, i) => ({ e, i }))
        .filter(({ e }) => itemById[e.itemId].type !== 'quest')
        .map(({ e, i }) => line(e, 'deposit', i)).join('')
        || `<div style="color:var(--text-muted);padding:4px 0">${T('Your backpack is empty.', 'ui')}</div>`;
      return head + `<div style="font-size:12px;color:var(--text-muted);margin-bottom:6px">${T('Goods left here are kept safe between adventures.', 'ui')}</div>
        <div class="bag-cat">📦 ${T('Storage', 'ui')} (${G.storage.length})</div>${stored}
        <div class="bag-cat">🎒 ${T('Backpack', 'ui')}</div>${bag}`;
    }
      
    if (tab === 'buy') {
      const rowFor = itId => {
        const it = itemById[itId];
        const need = it.rankReq ? GUILD_RANKS.indexOf(it.rankReq) : -1, locked = need > rankIdx;
        let inst = isEquip(itId) ? shopStockItem(itId) : null;
        if (isEquip(itId) && !inst) {
          inst = rollItem(itId, shopRollBias(itId));
          G.shopRotation.stock.push(inst);
        }
        const price = inst ? shopPrice(inst) : it.value;
        const btn = locked
          ? `<span class="btn" style="opacity:.5;pointer-events:none">🔒 ${currentLang === 'th' ? `ยศร้านค้า ${T(it.rankReq, 'ui')}` : `Trader ${it.rankReq}`}</span>`
          : `<button class="btn" data-buy="${inst?.uid || it.id}" ${p.zeny < price ? 'disabled' : ''}>${T('Buy', 'ui')} ${price}z</button>`;
        if (!inst) return `<div class="gear-row ${locked ? 'locked' : ''}"><span class="gear-row__copy">${itemIconImg(it.id)} <b>${T(it.name, 'items')}</b> — ${price}z${it.rankReq ? ` <small style="color:#8a641d">[${currentLang === 'th' ? `ยศร้านค้า ${T(it.rankReq, 'ui')}` : `Trader ${it.rankReq}`}]</small>` : ''}<br><small style="color:var(--text-muted)">${T(it.desc, 'items')}</small></span>${btn}</div>`;
        const rc = itemRarity(inst), slot = itemSlot(it);
        return `<div class="gear-row ${locked ? 'locked' : ''}">
          <div class="gear-row__copy">${itemIconImg(it.id)} <b style="color:${rc.color}">${esc(instName(inst))}</b> <small class="rarity-badge" style="--rarity:${rc.color}">◆${rc.name}</small> <small style="color:var(--text-muted)">[${T(SLOT_LABEL[slot], 'ui')}]</small>${it.rankReq ? ` <small style="color:#8a641d">[${currentLang === 'th' ? `ยศร้านค้า ${T(it.rankReq, 'ui')}` : `Trader ${it.rankReq}`}]</small>` : ''}<br>
            <span>${itemMainStatsHtml(inst)} · <b>${price}z</b></span><br><small style="color:var(--text-muted)">${T(it.desc, 'items')}</small>
            <span class="gear-bonuses">${itemAffixesHtml(inst, p)}</span>${gearComparisonHtml(inst, p)}</div>${btn}</div>`;
      };
      const baseIds = (G._shopItems || []).filter(itId => !itemById[itId]?.rankReq);
      const grouped = {};
      for (const itId of baseIds) { const c = ITEM_CAT(itemById[itId]); (grouped[c] = grouped[c] || []).push(itId); }
      const rows = Object.keys(grouped).sort((a, b) => ITEM_CAT_ORDER[a] - ITEM_CAT_ORDER[b])
        .map(c => `<div class="bag-cat">${T(c, 'ui')} (${grouped[c].length})</div>${grouped[c].map(rowFor).join('')}`).join('');
      const featuredIds = G.shopRotation.ids || [];
      const featuredLabel = G.shopRotation.fullCatalog
        ? T('🏆 Trader S Master Catalog — all rank gear unlocked', 'ui')
        : T('⭐ Featured rank gear — rotates with rank & time', 'ui');
      const featured = `<div class="bag-cat">${featuredLabel}</div>` +
        (featuredIds.length ? featuredIds.map(rowFor).join('') : `<small>${T('Advance the main story or raise Guild Rank to unlock rotating featured stock.', 'ui')}</small>`);
      return head + rows + featured;
    }
    
    // sell tab — everything except quest items, at half value (rarity-scaled for gear), grouped by category
    const sellRow = e => {
      const it = itemById[e.itemId], price = sellPrice(e);
      const rc = e.uid ? itemRarity(e) : null;
      const label = e.uid
        ? `<b style="color:${rc.color}">${instName(e)}</b> <small style="color:${rc.color}">◆${rc.name}</small>`
        : `<b>${T(it.name, 'items')}</b> ×${e.qty}`;
      return `<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:4px 0;border-bottom:1px solid rgba(201,162,75,.15)">
        <span>${itemIconImg(e.itemId)} ${label}<br><small style="color:var(--text-muted)">${T(it.desc, 'items')}</small></span>
        <button class="btn" data-sell="${e.uid || e.itemId}">${T('Sell', 'ui')} ${price}z</button></div>`;
    };
    const sellables = p.inventory.filter(e => itemById[e.itemId].type !== 'quest');
    const sellGroups = {};
    for (const e of sellables) { const c = ITEM_CAT(itemById[e.itemId]); (sellGroups[c] = sellGroups[c] || []).push(e); }
    const rows = sellables.length
      ? Object.keys(sellGroups).sort((a, b) => ITEM_CAT_ORDER[a] - ITEM_CAT_ORDER[b])
          .map(c => `<div class="bag-cat">${T(c, 'ui')} (${sellGroups[c].length})</div>${sellGroups[c].map(sellRow).join('')}`).join('')
      : `<i>${T('Nothing to sell.', 'ui')}</i>`;
    if (tab === 'sell') return head + rows;
    
    // enhance tab — equipped gear (with slot badges) first, then bag gear, each in its own section
    const enhRow = (inst, ref, slot) => {
      const rc = itemRarity(inst), plus = inst.plus || 0, cost = refineCost(inst);
      const tier = refineTier(plus), frags = tierOwned(tier), haveFuel = frags >= REFINE_FRAGS || itemQty('blessed_ore') >= 1;
      const disabled = plus >= REFINE_MAX || !haveFuel || p.zeny < cost;
      const badge = slot ? `<span style="font-size:10px;font-weight:700;padding:1px 7px;border-radius:9px;background:rgba(95,191,122,.15);color:var(--success);border:1px solid rgba(95,191,122,.5)">${T(SLOT_LABEL[slot], 'ui')}</span> ` : '';
      const fragName = itemById[REFINE_FRAG[tier]].name;
      const fuelTxt = plus >= REFINE_MAX ? 'MAX' : (currentLang === 'th'
        ? `ต้องการ <b>${T(fragName, 'items')}</b> ×${REFINE_FRAGS} <b style="color:${frags >= REFINE_FRAGS ? 'var(--success)' : 'var(--danger)'}">(มีอยู่ ${frags})</b> — หรือ Blessed Ore 1 ชิ้น`
        : `needs ${REFINE_FRAGS}× <b>${fragName}</b> <b style="color:${frags >= REFINE_FRAGS ? 'var(--success)' : 'var(--danger)'}">(have ${frags})</b> — or 1 Blessed Ore`);
      return `<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:4px 0;border-bottom:1px solid rgba(201,162,75,.15)">
        <span>${itemIconImg(inst.itemId)} ${badge}<b style="color:${rc.color}">${instName(inst)}</b> — ${plus}/${REFINE_MAX} · ${REFINE_CHANCE[plus]}% ${T('success', 'ui')}<br>
          <small style="color:var(--text-muted)">${fuelTxt}</small></span>
        <button class="btn" data-refine="${ref}" ${disabled ? 'disabled' : ''}>${T('Refine', 'ui')} (${cost}z)</button></div>`;
    };
    const wornRows = EQUIP_SLOTS.filter(slot => p.equip[slot]).map(slot => enhRow(p.equip[slot], slot, slot)).join('');
    const bagRows = p.inventory.filter(e => e.uid).map(e => enhRow(e, e.uid, null)).join('');
    const enhBody =
      `<div class="bag-cat" style="color:var(--success)">⚔ ${T('Currently Equipped', 'ui')}</div>` +
      (wornRows || `<small style="color:var(--text-muted)">${T('Nothing equipped.', 'ui')}</small>`) +
      `<div class="bag-cat">🎒 ${T('In Bag', 'ui')}</div>` +
      (bagRows || `<small style="color:var(--text-muted)">${T('No spare equipment in the bag.', 'ui')}</small>`);
      
    const refineFuelText = currentLang === 'th'
      ? `🔨 เชื้อเพลิงตีบวก: <b>เขี้ยวหมาป่า (Wolf Fang)</b> สำหรับ +0–2 · <b>ผงเงา (Shade Dust)</b> สำหรับ +3–5 · <b>แร่ดารา (Star Iron)</b> สำหรับ +6–8 (ใช้ ${REFINE_FRAGS} ชิ้นต่อครั้ง) — หรือใช้ Blessed Ore 1 ชิ้นแทนได้ (คุณมีอยู่ ${itemQty('blessed_ore')} ชิ้น)`
      : `🔨 Refining fuel: <b>Wolf Fang</b> for +0–2 · <b>Shade Dust</b> for +3–5 · <b>Star Iron</b> for +6–8 (${REFINE_FRAGS} per attempt) — or 1× Blessed Ore as a substitute (you have ${itemQty('blessed_ore')}).`;
      
    return head + `<div style="color:var(--text-muted);font-size:12px;margin-bottom:8px">${refineFuelText}</div>` + enhBody;
  }
  if (id === 'admin') {
    const status = `<div style="color:#ffd24d;margin-bottom:8px;font-size:12px;line-height:1.6">
      God mode: <b>${p.godMode ? 'ON 🛡' : 'off'}</b> · Lv <b>${p.level}</b>/${DESIGN.levelCap} · Job <b>${p.jobLevel}</b>/${PROGRESSION.jobLevelCap} · ${p.className}<br>
      💰${p.zeny} · 🏅 Rank ${GUILD_RANKS[G.guildRankIdx || 0]} (${G.guildPoints || 0} pts) · 🗺 ${G.map.name} · ${G.monsters.filter(m => m.alive).length} mobs alive</div>`;
    return status + ADMIN_GROUPS.map(([title, btns]) =>
      `<div class="q-cat" style="font-size:12px;margin:8px 0 4px">${title}</div>
       <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px">
         ${btns.map(([a, l]) => `<button class="btn" data-admin="${a}" style="font-size:11px;padding:5px 8px">${l}</button>`).join('')}</div>`).join('');
  }
  return '';
}

function wirePanel(id, el) {
  el.querySelectorAll('[data-task]').forEach(task => task.onclick = event => { event.stopPropagation(); activateTaskGuide(task.dataset.task, task.dataset.taskId); });
  el.querySelectorAll('[data-use]').forEach(b => b.onclick = () => { useItem(b.dataset.use); refreshPanel(id); });
  el.querySelectorAll('[data-equip]').forEach(b => b.onclick = () => { equip(b.dataset.equip); refreshPanel(id); });
  el.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => { buy(b.dataset.buy); refreshPanel('shop'); });
  el.querySelectorAll('[data-sell]').forEach(b => b.onclick = () => { sellItem(b.dataset.sell); refreshPanel('shop'); });
  el.querySelectorAll('[data-refine]').forEach(b => b.onclick = () => { refineItem(b.dataset.refine); refreshPanel('shop'); });
  el.querySelectorAll('[data-deposit]').forEach(b => b.onclick = () => depositItem(+b.dataset.deposit));
  el.querySelectorAll('[data-withdraw]').forEach(b => b.onclick = () => withdrawItem(+b.dataset.withdraw));
  el.querySelectorAll('[data-craft]').forEach(b => b.onclick = () => craftItem(b.dataset.craft));
  el.querySelectorAll('[data-shoptab]').forEach(b => b.onclick = () => { G._shopTab = b.dataset.shoptab; refreshPanel('shop'); });
  el.querySelectorAll('[data-stat]').forEach(b => b.onclick = () => { spendStat(b.dataset.stat); refreshPanel('char'); });
  el.querySelectorAll('[data-rebirth]').forEach(b => b.onclick = () => {
    if (typeof confirm !== 'function' || confirm(T('Rebirth resets your level, job, skills, and stat points — permanently gaining power. Continue?', 'ui'))) doRebirth();
  });
  el.querySelectorAll('[data-learn]').forEach(b => b.onclick = () => { learnSkill(b.dataset.learn); refreshPanel('skills'); });
  el.querySelectorAll('[data-passive]').forEach(b => b.onclick = () => { learnPassive(b.dataset.passive); refreshPanel('skills'); });
  el.querySelectorAll('[data-guild]').forEach(b => b.onclick = () => { acceptGuild(b.dataset.guild); refreshPanel(id); });
  el.querySelectorAll('[data-guildrefresh]').forEach(b => b.onclick = () => rerollGuildBoard());
  el.querySelectorAll('[data-guildclaim]').forEach(b => b.onclick = () => { claimGuild(b.dataset.guildclaim); refreshPanel(id); });
  el.querySelectorAll('[data-guildrevoke]').forEach(b => b.onclick = event => {
    event.stopPropagation();
    requestGuildRevoke(b.dataset.guildrevoke);
  });
  el.querySelectorAll('[data-assign-item]').forEach(b => b.onclick = () => assignItemHotbar(b.dataset.assignItem));
  el.querySelectorAll('[data-assign-skill]').forEach(b => b.onclick = () => assignSkillHotbar(b.dataset.assignSkill));
  el.querySelectorAll('[data-rebind]').forEach(b => b.onclick = () => startHotkeyRebind(+b.dataset.rebind));
  el.querySelectorAll('[data-reset-hotkeys]').forEach(b => b.onclick = resetHotkeys);
  el.querySelectorAll('[data-open-panel]').forEach(b => b.onclick = () => togglePanel(b.dataset.openPanel));
  el.querySelectorAll('[data-world-route]').forEach(b => b.onclick = () => { if (activateWorldRoute(b.dataset.worldRoute)) el.remove(); });
  el.querySelectorAll('[data-admin]').forEach(b => b.onclick = () => { adminAction(b.dataset.admin); refreshPanel('admin'); });
  el.querySelectorAll('[data-unequip]').forEach(b => b.onclick = () => { unequip(b.dataset.unequip); refreshPanel('char'); });
  el.querySelectorAll('[data-bagtab]').forEach(b => b.onclick = () => { G._bagTab = b.dataset.bagtab; refreshPanel('inv'); });
  // skill-tree hover tooltips: describe what each node does, positioned beside it
  if (id === 'skills') {
    let tip = document.getElementById('sk-tip');
    if (!tip) { tip = document.createElement('div'); tip.id = 'sk-tip'; tip.className = 'sk-tip'; document.body.appendChild(tip); }
    tip.style.display = 'none';
    el.querySelectorAll('.ro-skill[data-skill]').forEach(nd => {
      const show = () => {
        tip.innerHTML = skillNodeTip(nd.dataset.skill, nd.dataset.kind === 'passive');
        tip.style.display = 'block'; tip.style.left = '-9999px'; tip.style.top = '0px';
        const r = nd.getBoundingClientRect(), tw = tip.offsetWidth, th = tip.offsetHeight;
        let x = r.right + 12; if (x + tw > innerWidth - 8) x = r.left - tw - 12; if (x < 8) x = 8;
        let y = r.top + r.height / 2 - th / 2; y = Math.max(8, Math.min(y, innerHeight - th - 8));
        tip.style.left = x + 'px'; tip.style.top = y + 'px';
      };
      nd.addEventListener('mouseenter', show);
      nd.addEventListener('click', show);          // touch/click also reveals it
      nd.addEventListener('mouseleave', hideSkillTip);
    });
    el.querySelectorAll('[data-drag-skill]').forEach(nd => {
      nd.addEventListener('dragstart', e => {
        e.dataTransfer?.setData('text/x-awo-skill', nd.dataset.dragSkill);
        if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copy';
        hideSkillTip();
      });
    });
  }
}
function refreshPanel(id) {
  const el = $('#panel');
  if (el && el.dataset.kind === id) {
    el.querySelector('.panel__body').innerHTML = panelBody(id);
    wirePanel(id, el);   // re-attach handlers to the freshly-rendered buttons
  }
}

function useItem(itemId) {
  const it = itemById[itemId]; if (itemQty(itemId) <= 0) return false;
  const p = G.player;
  if (it.reset) {
    const hasSpent = it.reset === 'stats'
      ? Object.values(p.alloc || {}).some(value => value > 0)
      : skillPointsSpent(p) > 0;
    if (!hasSpent) {
      logMsg(T(it.reset === 'stats' ? 'No allocated stat points to reset.' : 'No spent skill points to reset.', 'ui'), 'sys');
      return false;
    }
    const question = T(it.reset === 'stats'
      ? 'Use Soul Ledger? Every allocated stat point will be refunded.'
      : 'Use Memory Prism? All spent active and passive skill points will be refunded.', 'ui');
    if (typeof confirm === 'function' && !confirm(question)) return false;
    const reset = it.reset === 'stats' ? resetStatPoints(p) : resetSkillPoints(p);
    if (!reset) return false;
    removeItem(itemId);
    AUDIO.playSfx('levelup');
    logMsg(T(it.reset === 'stats'
      ? 'Soul Ledger used — all stat points refunded.'
      : 'Memory Prism used — all skill points refunded.', 'ui'), 'good');
    saveGame();
    return true;
  }
  // shared potion cooldown: unlimited chug-rate made every level wall face-tankable
  if (it.hpRestore || it.mpRestore) {
    if (now() < (p.potionCdUntil || 0)) { logMsg('Catch your breath — potion not ready.', 'sys'); return false; }
    p.potionCdUntil = now() + TUNING.potionCdMs;
  }
  if (it.hpRestore) { p.hp = clamp(p.hp + it.hpRestore, 0, p.maxHp); }
  if (it.mpRestore) { p.mp = clamp(p.mp + it.mpRestore, 0, p.maxMp); }
  if (it.buff) { p.buffs.push({ stat: it.buff.stat, mult: it.buff.mult, until: now() + it.buff.durationMs }); toast(`${it.name} — ${it.buff.stat.toUpperCase()} up!`, 'good'); }
  if (it.teleport) { removeItem(itemId); AUDIO.playSfx('menu'); loadMap(it.teleport); logMsg('The scroll crumbles — town swims into view.', 'sys'); return true; }
  removeItem(itemId); AUDIO.playSfx('pickup'); logMsg(`Used ${it.name}.`, 'good');
  return true;
}
function equip(uid) {
  const p = G.player, u = +uid, idx = p.inventory.findIndex(e => e.uid === u);
  if (idx < 0) return;
  const inst = p.inventory[idx], item = itemById[inst.itemId], slot = itemSlot(item);
  p.inventory.splice(idx, 1);
  if (p.equip[slot]) p.inventory.push(p.equip[slot]);   // swap the old piece back to the bag
  p.equip[slot] = inst;
  recompute(p);
  logMsg(`Equipped [${itemRarity(inst).name}] ${instName(inst)}.`, 'good'); AUDIO.playSfx('menu');
}
function unequip(slot) {
  const p = G.player; if (!p.equip[slot]) return;
  p.inventory.push(p.equip[slot]); p.equip[slot] = null;
  recompute(p); AUDIO.playSfx('menu');
}
// Rank-tagged items at/below the player's guild rank feed a four-slot Featured
// pool. Every equipment offer is a real rolled instance: its rarity, substats,
// and price stay stable until the rotation changes, and the inspected item is
// exactly the one delivered to the bag.
const shopRollBias = (itemId, rankIdx = effectiveShopRankIdx()) => rankIdx * TUNING.shopRarityBiasPerRank
  + ((G.shopRotation?.ids || []).includes(itemId) ? TUNING.shopFeaturedRarityBias : 0);
const shopPrice = inst => {
  const base = itemById[inst.itemId]?.value || 0;
  const rolled = base * itemRarity(inst).mult * (1 + itemAffixes(inst).length * TUNING.shopAffixMarkup);
  return Math.max(1, Math.ceil(rolled / 5) * 5);
};
const shopStockItem = itemId => (G.shopRotation?.stock || []).find(inst => inst.itemId === itemId) || null;
function rerollShop(rankOverride) {
  const rankIdx = rankOverride ?? effectiveShopRankIdx();
  const pool = CONTENT.items.filter(it => it.rankReq && GUILD_RANKS.indexOf(it.rankReq) <= rankIdx);
  const fullCatalog = rankIdx >= GUILD_RANKS.length - 1;
  const picks = fullCatalog ? pool.map(item => item.id) : [];
  const p2 = [...pool];
  while (!fullCatalog && picks.length < 4 && p2.length) picks.push(p2.splice(Math.floor(Math.random() * p2.length), 1)[0].id);
  // Rank-conditioned gear belongs to rotation, not the always-on shelves.
  // Trader S turns that rotating shelf into the complete master catalog.
  const baseIds = (G._shopItems || npcById.npc_shopkeeper?.shopItems || []).filter(itemId => !itemById[itemId]?.rankReq);
  G.shopRotation = { ids: picks, stock: [], fullCatalog, at: now() };
  const gearIds = [...new Set([...baseIds, ...picks])].filter(isEquip);
  G.shopRotation.stock = gearIds.map(itemId => rollItem(itemId, shopRollBias(itemId, rankIdx)));
  // A trader rotation should visibly teach rarity even if the random sample is
  // unusually flat. Preserve randomness, but guarantee at least two tiers.
  if (G.shopRotation.stock.length > 1 && new Set(G.shopRotation.stock.map(inst => inst.rarity)).size === 1) {
    const firstTier = G.shopRotation.stock[0].rarity;
    G.shopRotation.stock[1] = rollItem(G.shopRotation.stock[1].itemId, 0, firstTier === 'common' ? 'uncommon' : 'common');
  }
  return G.shopRotation;
}
function buy(ref) {
  const stock = (G.shopRotation?.stock || []).find(inst => String(inst.uid) === String(ref));
  const itemId = stock?.itemId || ref;
  const it = itemById[itemId]; const p = G.player;
  if (!it) return;
  const need = it.rankReq ? GUILD_RANKS.indexOf(it.rankReq) : -1;
  if (need > effectiveShopRankIdx()) { toast(`The trader eyes you: "Trader Rank ${it.rankReq} first."`, 'bad'); return; }
  const price = stock ? shopPrice(stock) : it.value;
  if (p.zeny < price) { toast('Not enough zeny.', 'bad'); return; }
  p.zeny -= price;
  if (isEquip(itemId)) {
    const inst = stock || rollItem(itemId, 0, 'common');
    p.inventory.push(inst);
    if (stock) {
      const idx = G.shopRotation.stock.indexOf(stock);
      G.shopRotation.stock[idx] = rollItem(itemId, shopRollBias(itemId));
    }
    logMsg(`Bought [${itemRarity(inst).name}] ${it.name} for ${price}z.`, 'good');
  }
  else { addStack(itemId); logMsg(`Bought ${it.name}.`, 'good'); }
  AUDIO.playSfx('pickup');
}
// Materials sell for half value. Equipment rarity/refinement helps, but resale is capped
// below shop price so buying random gear can never become an infinite-money loop.
const sellPrice = e => {
  const value = itemById[e.itemId].value || 0;
  if (!e.uid) return Math.max(1, Math.floor(value * 0.5));
  const rolled = value * 0.35 * itemRarity(e).mult * (1 + 0.04 * (e.plus || 0));
  return Math.max(1, Math.min(Math.floor(value * 0.8), Math.floor(rolled)));
};
// refinement: +0..+9, safe (fail wastes the attempt, item never breaks/downgrades)
const REFINE_MAX = 9, REFINE_CHANCE = [100, 100, 90, 80, 70, 60, 50, 40, 30];
const refineCost = inst => Math.max(50, Math.floor((itemById[inst.itemId].value || 0) * 0.15 * ((inst.plus || 0) + 1)));
// fuel: ONE named fragment per bracket — a clear farm target, not "whatever's in the bag".
// Blessed Ore remains the universal substitute.
const REFINE_FRAG = ['wolf_fang', 'shade_dust', 'star_iron'];   // +0-2 · +3-5 · +6-8
const REFINE_FRAGS = 2;                       // fragments per attempt
const refineTier = plus => plus < 3 ? 0 : plus < 6 ? 1 : 2;
const tierOwned = t => itemQty(REFINE_FRAG[t]);
function refineItem(ref) {
  const p = G.player;
  const inst = /^\d+$/.test(ref) ? p.inventory.find(e => e.uid === +ref) : p.equip[ref];
  if (!inst) return;
  const plus = inst.plus || 0;
  if (plus >= REFINE_MAX) { toast('Already +9.', 'sys'); return; }
  const tier = refineTier(plus), fragId = REFINE_FRAG[tier];
  const useFrags = tierOwned(tier) >= REFINE_FRAGS;             // fragments first — ore is the fallback
  if (!useFrags && itemQty('blessed_ore') < 1) { toast(`Need ${REFINE_FRAGS}× ${itemById[fragId].name} — or 1× Blessed Ore.`, 'bad'); return; }
  const cost = refineCost(inst);
  if (p.zeny < cost) { toast('Not enough zeny.', 'bad'); return; }
  p.zeny -= cost;
  const fuel = useFrags ? (removeItem(fragId, REFINE_FRAGS), `${REFINE_FRAGS}× ${itemById[fragId].name}`) : (removeItem('blessed_ore', 1), 'Blessed Ore');
  if (Math.random() * 100 < REFINE_CHANCE[plus]) {
    inst.plus = plus + 1; recompute(p); AUDIO.playSfx('levelup');
    toast(`✨ ${instName(inst)} — refine success!`, 'good'); logMsg(`${instName(inst)} refined with ${fuel}.`, 'good');
  } else {
    AUDIO.playSfx('playerHurt');
    toast(`The ${useFrags ? 'fragments shatter' : 'ore shatters'}... ${instName(inst)} is unharmed.`, 'bad'); logMsg(`Refine failed — ${fuel} lost, ${instName(inst)} unharmed.`, 'bad');
  }
}
function sellItem(ref) {
  const p = G.player;
  if (/^\d+$/.test(ref)) {                                     // equipment instance by uid
    const idx = p.inventory.findIndex(e => e.uid === +ref); if (idx < 0) return;
    const e = p.inventory[idx], price = sellPrice(e);
    p.inventory.splice(idx, 1); p.zeny += price;
    logMsg(`Sold [${itemRarity(e).name}] ${itemById[e.itemId].name} (+${price}z).`, 'good');
  } else {                                                     // one from a stack by item id
    const e = p.inventory.find(s => s.itemId === ref && !s.uid); if (!e) return;
    const price = sellPrice(e);
    removeItem(ref, 1); p.zeny += price;
    logMsg(`Sold ${itemById[ref].name} (+${price}z).`, 'good');
  }
  AUDIO.playSfx('pickup');
}

// =====================================================================
// NPC INTERACTION
// =====================================================================
function nearbyNpc(npcId) {
  const p = G.player;
  return G.npcs.find(n => (!npcId || n.id === npcId) && dist(p.x, p.y, n.x * TS + TS / 2, n.y * TS + TS / 2) < TS * 1.6);
}
function interact(npcId) {
  const n = nearbyNpc(npcId); if (!n) return false;
  G.target = null; G.targetSource = null; G.path = null; G.manualIntent = null;
  AUDIO.playSfx('menu');
  const talkQuest = questById[G.quest];
  const completesTalkQuest = talkQuest?.objective.type === 'talk' && talkQuest.objective.target === n.id;
  const next = completesTalkQuest ? nextQuestFor(talkQuest) : null;
  const nextReady = next && G.player.level >= (next.minLevel || 1);
  const questFollowup = completesTalkQuest
    ? [...(talkQuest.doneLines || []), ...(nextReady ? (next.startLines || []) : [])]
    : [];
  G.talked.add(n.id);
  checkQuest(completesTalkQuest ? { suppressDialogue: true } : undefined);
  const content = n.content;
  // A talk objective first lets the named NPC introduce their service/lore,
  // then presents Elowen's quest follow-up instead of replacing either dialog.
  const afterNpcDialogue = onClose => {
    if (questFollowup.length) showDialogue(npcById[talkQuest.giverNpcId]?.name || 'Elowen', questFollowup, onClose);
    else if (onClose) onClose();
  };
  if (n.role === 'guild') {
    const lines = [...(content?.dialogue || []), `You currently hold Guild Rank ${GUILD_RANKS[G.guildRankIdx || 0]}.`];
    showDialogue(n.name, lines, () => afterNpcDialogue(() => togglePanel('guild')));
    return true;
  }
  if (n.role === 'shop') { G._shopItems = content?.shopItems || []; showDialogue(n.name, content?.dialogue || ['Welcome, traveler.'], () => afterNpcDialogue(() => togglePanel('shop'))); }
  else if (n.role === 'quest') {
    const q = questById[G.quest];
    const pending = questById[G.pendingQuest];
    const lines = content?.dialogue ? [...content.dialogue] : ['The path awaits, hero.'];
    if (q) lines.push(`Current task — ${q.name}: ${q.description}`);
    else if (pending) lines.push(`Our next chapter is ${pending.name}. Train until Base Level ${pending.minLevel}; I will call for you the moment you are ready.`);
    showDialogue(n.name, lines, () => afterNpcDialogue());
  } else { showDialogue(n.name, content?.dialogue || CONTENT.story.intro.slice(0, 2), () => afterNpcDialogue()); }
  return true;
}

let dlg;
function showDialogue(name, lines, onClose) {
  if (dlg) dlg.remove();
  let i = 0;
  dlg = document.createElement('div'); dlg.className = 'dialogue';
  const translatedName = T(name, 'npcs');
  const translatedLines = lines.map(line => {
    if (line.startsWith('You currently hold Guild Rank ')) {
      const rank = line.substring('You currently hold Guild Rank '.length).replace('.', '');
      return currentLang === 'th' ? `ปัจจุบันคุณมียศกิลด์ ${T(rank, 'ui')}` : line;
    }
    if (line.startsWith('Our next chapter is ')) {
      const match = line.match(/Our next chapter is (.+?)\. Train until Base Level (\d+); I will call for you the moment you are ready\./);
      if (match) {
        return currentLang === 'th'
          ? `บทต่อไปของเราคือ ${T(match[1], 'quests')} จงฝึกฝนจนกว่าเลเวลหลักจะถึง ${match[2]} แล้วฉันจะเรียกหาคุณทันทีที่คุณพร้อม`
          : line;
      }
    }
    if (line.startsWith('Current task — ')) {
      const match = line.match(/Current task — (.+?): (.+)/);
      if (match) {
        return currentLang === 'th'
          ? `ภารกิจปัจจุบัน — ${T(match[1], 'quests')}: ${T(match[2], 'quests')}`
          : line;
      }
    }
    const translated = T(line, 'dialogues');
    if (translated !== line) return translated;
    return T(line, 'quests');
  });

  const render = () => {
    const btnText = i < translatedLines.length - 1 ? T('Continue', 'ui') : T('Close', 'ui');
    dlg.innerHTML = `<div class="dialogue__name">${translatedName}</div><div class="dialogue__text">${translatedLines[i]}</div>
      <div class="dialogue__choices"><button class="btn"><span>${btnText}</span><kbd>Space</kbd></button></div>`;
    dlg.querySelector('button').onclick = () => {
      i++;
      if (i >= translatedLines.length) { dlg.remove(); dlg = null; if (onClose) onClose(); }
      else render();
    };
  };
  render();
  $('#overlays').appendChild(dlg);
}
function advanceDialogue() {
  const button = dlg?.querySelector('button');
  if (!button) return false;
  button.click();
  return true;
}

// =====================================================================
// CUTSCENE
// =====================================================================
function runCutscene(lines, done) {
  G.running = false;
  let i = 0;
  const box = document.createElement('div');
  box.className = 'overlay-cut';
  box.style.cssText = 'position:fixed;inset:0;background:rgba(8,10,7,.94);z-index:50;display:flex;align-items:center;justify-content:center';
  const render = () => {
    box.innerHTML = `<div style="max-width:640px;text-align:center;padding:30px;font-size:19px;line-height:1.7;color:#f4e8cf;font-family:var(--font-head)">
      <p>${T(lines[i], 'dialogues')}</p><button class="btn" style="margin-top:26px">${i < lines.length - 1 ? (currentLang === 'th' ? 'ต่อไป' : 'Continue') : (currentLang === 'th' ? 'เริ่มต้น' : 'Begin')}</button></div>`;
    box.querySelector('button').onclick = () => { i++; if (i >= lines.length) { box.remove(); done(); } else render(); };
  };
  render();
  document.body.appendChild(box);
}

// =====================================================================
// TITLE / CLASS SELECT
// =====================================================================
function showSignIn() {
  $('#root').innerHTML = `
    <div class="title-screen signin-screen">
      <button class="btn btn--ghost" id="title-lang-btn" style="position:absolute;top:10px;right:10px;font-size:14px">🌐 ${currentLang === 'th' ? 'EN' : 'TH'}</button>
      <form class="signin-panel" id="signin-form">
        <h1 class="title-h1">${DESIGN.concept.title}</h1>
        <p class="signin-copy">${T(DESIGN.concept.tagline, 'dialogues')}</p>
        <label class="signin-label" for="signin-name">${T('Adventurer ID', 'ui')}</label>
        <input id="signin-name" class="signin-input" autocomplete="username" maxlength="24" placeholder="${T('Enter your account name', 'ui')}" autofocus />
        <button class="btn signin-primary" id="signin-btn" type="submit">${T('Sign In', 'ui')}</button>
        <button class="btn btn--ghost signin-guest" id="guest-btn" type="button">${T('Continue as Guest', 'ui')}</button>
        <div class="signin-hint">${T('Profiles are stored locally in this browser.', 'ui')}</div>
      </form>
    </div>`;
  const name = $('#signin-name');
  const form = $('#signin-form');
  $('#title-lang-btn').onclick = () => {
    setLanguage(currentLang === 'th' ? 'en' : 'th');
    AUDIO.playSfx('menu');
    showSignIn();
  };
  form.onsubmit = e => {
    e.preventDefault();
    if (!signIn(name.value)) {
      name.focus();
      name.style.borderColor = 'var(--danger)';
      return;
    }
    AUDIO.playSfx('menu');
    showTitle();
  };
  $('#guest-btn').onclick = () => { signOut(); AUDIO.playSfx('menu'); showTitle(); };
}

function showTitle() {
  // Keep the procedural world backdrop visible beneath the DOM title card.
  const titleCanvas = $('#game-canvas');
  if (titleCanvas?.getContext) {
    canvas = titleCanvas; ctx = canvas.getContext('2d');
    Object.assign(canvas.style, { display: 'block', position: 'fixed', inset: '0', width: '100vw', height: '100vh', imageRendering: 'pixelated' });
    drawParallax(0, 0);
  }
  const profile = currentProfile();
  const cards = DESIGN.classes.map(c => {
    const cc = CLASS_COMBAT[c.id], url = pxDataURL('player', cc);
    const portrait = url
      ? `<span class="cc-portrait"><img src="${url}" width="64" height="64" alt="" class="cc-portrait-img"></span>`
      : `<span class="cc-portrait cc-portrait-fallback">${SPRITES.player[cc]}</span>`;
    const g = c.statGrowthPerLevel;
    const tops = Object.entries(g).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k.toUpperCase()} ${v}`).join(' · ');
    return `<button class="class-card btn--ghost" data-class="${c.id}">
      ${portrait}
      <b class="cc-name">${T(c.name, 'classes')}</b>
      <span class="cc-role">${T(c.role, 'classes')}</span>
      <span class="cc-build">${T('Build', 'ui')} ${T(recommendedBuild(g), 'classes')} · ${tops}</span>
      <span class="cc-radar radar-wrap">${svgRadar(c.baseStats)}</span>
      <span class="cc-flavor">${T(c.playstyle || c.flavor, 'classes')}</span>
    </button>`;
  }).join('');
  const sv = readSave();
  const continueHtml = sv ? `<div style="margin:6px 0 18px">
    <button class="btn" id="continue-btn" style="font-size:16px;padding:10px 30px">▶ ${T('Continue', 'ui')} — Lv ${sv.player.level} ${T(sv.player.className, 'classes')}</button>
    <button class="btn btn--ghost" id="delete-save-btn" title="${T('Erase saved game', 'ui')}" style="margin-left:8px">🗑</button>
    <div style="font-size:11px;color:var(--text-muted);margin-top:8px">— ${T('or start a new life below', 'ui')} —</div></div>` : '';
  $('#root').innerHTML = `
    <div class="title-screen">
      <div class="title-inner">
        <div class="account-bar">
          <span>${profile ? `${T('Signed in as', 'ui')} <b>${esc(profile.name)}</b>` : T('Playing as Guest', 'ui')}</span>
          <div style="display:flex;gap:8px;align-items:center">
            <button class="btn btn--ghost" id="title-lang-btn" style="font-size:14px">🌐 ${currentLang === 'th' ? 'EN' : 'TH'}</button>
            <button class="btn btn--ghost" id="switch-profile-btn" type="button">${profile ? T('Sign Out', 'ui') : T('Sign In', 'ui')}</button>
          </div>
        </div>
        <h1 class="title-h1">${DESIGN.concept.title}</h1>
        <p style="font-style:italic;color:var(--text-muted);margin:0 0 14px">${T(DESIGN.concept.tagline, 'dialogues')}</p>
        <p style="font-size:13px;line-height:1.6;max-width:600px;margin:0 auto 22px">${T(DESIGN.concept.premise, 'dialogues')}</p>
        ${continueHtml}
        <h2 style="font-family:var(--font-head);color:var(--text);font-size:20px">${T('Choose your calling', 'ui')}</h2>
        <div class="class-scroll"><div class="class-grid">${cards}</div></div>
        <input id="hero-name" placeholder="${T('Name your hero', 'ui')}" style="padding:8px;border-radius:6px;border:1px solid var(--panel-border);background:#1c160e;color:var(--text);margin-bottom:14px" />
        <br><button class="btn" id="start-btn" disabled style="font-size:16px;padding:10px 28px">${T('Cross the Veil', 'ui')}</button>
        <p style="font-size:11px;color:var(--text-muted);margin-top:18px">${T("Move WASD or click the ground (auto-paths around obstacles) · Click a monster to fight · Hotbar 1–9 (rebindable) · Talk E · Menus C/I/K/Q", 'ui')}</p>
      </div></div>`;
  let chosen = null;
  $('#title-lang-btn').onclick = () => {
    setLanguage(currentLang === 'th' ? 'en' : 'th');
    AUDIO.playSfx('menu');
    showTitle();
  };
  $('#root').querySelectorAll('.class-card').forEach(b => b.onclick = () => {
    chosen = b.dataset.class;
    $('#root').querySelectorAll('.class-card').forEach(x => x.style.outline = '');
    b.style.outline = '2px solid var(--accent)';
    $('#start-btn').disabled = false;
    AUDIO.playSfx('menu');
  });
  $('#start-btn').onclick = () => { if (chosen) begin(chosen, $('#hero-name').value.trim()); };
  // a corrupt/stale save must never white-screen the title — fall back to a fresh start
  const cont = $('#continue-btn'); if (cont) cont.onclick = () => {
    try { resumeGame(); } catch (e) { console.error('resume failed', e); toast(T('Save could not be loaded — start a new game (🗑 clears it).', 'ui'), 'bad'); }
  };
  const del = $('#delete-save-btn'); if (del) del.onclick = () => { deleteSave(); AUDIO.playSfx('menu'); showTitle(); };
  $('#switch-profile-btn').onclick = () => { signOut(); AUDIO.playSfx('menu'); showSignIn(); };
}

// style helpers for class cards
const extraCss = `
.class-card{display:flex;flex-direction:column;align-items:center;text-align:center;gap:4px;padding:12px 10px;cursor:pointer;background:#17243d;border:2px solid #7e8ca1;border-radius:3px;box-shadow:inset 0 0 0 1px #273b5d,0 2px 0 #080d17}
.class-card:hover{background:#203556;border-color:#e6bd54;transform:translateY(-1px)}
.cc-portrait{position:relative;width:70px;height:70px;display:flex;align-items:center;justify-content:center;flex:0 0 70px;background:#0c1425;border:2px solid #b8c3d2;box-shadow:inset 0 0 0 2px #273b5d}
.cc-portrait:after{content:"";position:absolute;left:7px;right:7px;bottom:-4px;height:4px;background:#8e2938;border-left:1px solid #e6bd54;border-right:1px solid #e6bd54}
.cc-portrait-img{display:block;image-rendering:pixelated;image-rendering:crisp-edges;object-fit:contain;padding:2px}
.cc-portrait-fallback{font-size:36px}
.cc-name{color:#f2d07b;font-family:var(--font-head);font-size:14px;line-height:1.15}
.cc-role{font-size:10px;color:#c4ccda}
.cc-build{font-size:10px;color:#8fc5e8;line-height:1.3}
.cc-radar{width:92px;height:92px;margin-top:2px}
.cc-radar svg{width:100%;height:auto;display:block}
.cc-flavor{font-size:10px;line-height:1.4;color:#aeb9ca;margin-top:4px}
/* --- responsive title / class-select (first page); class grid is ALWAYS 2 rows --- */
.title-screen{position:fixed;inset:0;display:flex;align-items:flex-start;justify-content:center;background-color:#0d1422;background-image:repeating-linear-gradient(0deg,rgba(255,255,255,.018) 0,rgba(255,255,255,.018) 1px,transparent 1px,transparent 4px),linear-gradient(90deg,#101a2d 0,#1b2639 50%,#10151f 100%);z-index:40;overflow-x:hidden;overflow-y:auto;padding:24px 0}
.title-screen *{box-sizing:border-box}
.title-inner{max-width:920px;width:100%;padding:30px;text-align:center;margin:auto;border-top:3px double #aeb9ca;border-bottom:3px double #aeb9ca;background:rgba(8,14,25,.54)}
.title-h1{font-family:var(--font-head);font-size:44px;color:#f2d07b;text-shadow:2px 2px 0 #4e1d27;margin:0 0 6px;line-height:1.05;overflow-wrap:break-word}
.account-bar{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 auto 18px;max-width:760px;padding:8px 10px;border:1px solid #66758b;border-radius:3px;background:#111e34;font-size:12px;color:#b7c2d2}
.account-bar b{color:var(--accent-alt)}
.account-bar .btn{padding:4px 10px;font-size:11px;white-space:nowrap}
.signin-screen{align-items:center;padding:18px}
.signin-panel{width:min(420px,100%);padding:28px 24px;border:2px solid #b8c3d2;border-radius:3px;background:#13213a;box-shadow:inset 0 0 0 2px #273b5d,0 12px 32px rgba(0,0,0,.55);text-align:left}
.signin-panel .title-h1{text-align:center;font-size:34px;margin-bottom:8px}
.signin-copy{text-align:center;color:var(--text-muted);font-style:italic;margin:0 0 24px}
.signin-label{display:block;font-size:12px;font-weight:700;color:var(--accent-alt);margin-bottom:6px}
.signin-input{width:100%;padding:10px 11px;border-radius:2px;border:1px solid #91a0b5;background:#09111f;color:var(--text);font:inherit;margin-bottom:14px}
.signin-input:focus{outline:2px solid rgba(201,162,75,.45);outline-offset:1px}
.signin-primary,.signin-guest{width:100%;justify-content:center;margin-top:6px}
.signin-hint{font-size:11px;color:var(--text-muted);text-align:center;margin-top:14px}
.class-scroll{overflow-x:auto;margin:16px 0;padding-bottom:6px}
.class-grid{display:grid;grid-template-columns:repeat(4,minmax(150px,1fr));grid-auto-rows:1fr;gap:10px}
.hud-menu{position:fixed;top:12px;right:160px;display:flex;gap:4px;align-items:center}
.hud-identity{display:flex;align-items:center;gap:5px;font-size:11px;color:var(--accent-alt);white-space:nowrap;text-shadow:1px 1px #000}
.hud-identity #hud-job{color:#8fc5e8}
.hud-sep{font-size:7px;color:#8390a3}
.hud-coin{display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;color:#2b2108;background:#e6bd54;border:1px solid #fff0a8;font:bold 9px var(--font-ui)}
.hud-crest{position:absolute;left:3px;top:3px;color:#f2d07b;font:bold 9px var(--font-head)}
.world-canvas{width:min(832px,100vw,calc(100vh * 1.4444));height:auto;aspect-ratio:832/576;border:2px solid #aeb9ca;outline:3px solid #111827;box-shadow:0 0 0 5px #433b32,0 10px 34px rgba(0,0,0,.72);background:#080d17}
.zone-banner{position:fixed;left:50%;top:18%;transform:translateX(-50%);z-index:35;min-width:280px;max-width:min(520px,88vw);padding:10px 20px;text-align:center;background:#13213a;border:2px solid #b8c3d2;box-shadow:inset 0 0 0 2px #273b5d,3px 3px 0 rgba(0,0,0,.55);pointer-events:none;animation:zoneIn .18s steps(3,end)}
.zone-banner.discovery{border-color:#f0d47d;box-shadow:inset 0 0 0 2px #604923,3px 3px 0 rgba(0,0,0,.55)}
.zone-banner small{display:block;color:#91a2b8;font-size:8px;font-weight:800;letter-spacing:1.2px}
.zone-banner b{display:block;color:#f2d07b;font:700 17px var(--font-head);letter-spacing:0;text-shadow:1px 1px #000}
.zone-banner em{display:block;color:#d8e0e9;font:italic 10px var(--font-head)}
.zone-banner span{display:block;margin-top:3px;color:#c4ccda;font-size:10px;line-height:1.35}
.zone-banner.leaving{opacity:0;transform:translate(-50%,-6px);transition:opacity .45s linear,transform .45s linear}
@keyframes zoneIn{from{opacity:0;transform:translate(-50%,5px)}to{opacity:1;transform:translate(-50%,0)}}
@media (max-width:680px){
  .title-inner{padding:20px 12px}
  .title-h1{font-size:30px}
  .account-bar{align-items:stretch;flex-direction:column}
  .hud-menu{top:auto;right:6px;bottom:76px;max-width:52vw;flex-wrap:wrap;justify-content:flex-end}
  .hud-menu .btn{font-size:9px;padding:4px 6px}
  .zone-banner{top:14%;min-width:0;width:78vw;padding:8px 12px}
}
@media (max-width:400px){ .title-h1{font-size:24px} }
.sk-name{position:absolute;bottom:3px;right:4px;font-size:8px;color:var(--text-muted);max-width:46px;overflow:hidden}
.skill-btn .lvl{position:absolute;top:2px;right:4px;font-size:9px;color:var(--success);font-weight:700}
.skill-btn .qty{position:absolute;bottom:2px;right:4px;font-size:11px;color:var(--accent-alt);font-weight:700}
.skill-btn.locked{opacity:.45;filter:grayscale(.6)}
.skill-btn.empty{opacity:.4}
.skill-btn.item-slot{background:linear-gradient(180deg,#2c3a22,#1a2313);border-color:#6fae5a}
.hotbar{gap:6px}
.hotbar .skill-btn{width:46px;height:46px}
.quest-tracker{position:fixed;top:160px;right:12px;width:190px;background:rgba(20,26,18,.82);border:1px solid var(--panel-border);border-radius:6px;padding:8px;font-size:11px;line-height:1.4}
.task-link{display:block;width:100%;margin:0;padding:0;background:transparent;border:0;color:inherit;font:inherit;line-height:inherit;text-align:left;cursor:pointer}
.task-link--compact{margin-top:4px;padding:3px 2px;border-top:1px solid rgba(95,191,122,.15)}
.task-link:hover,.task-link.active{background:rgba(230,189,84,.1);outline:1px solid rgba(230,189,84,.35)}
.task-card{cursor:pointer;transition:border-color .12s linear,background .12s linear}
.task-card:hover,.task-card.active{background:rgba(230,189,84,.1);border-color:var(--accent-alt)!important}
.minimap{overflow:hidden}
.stat-row{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:3px 0;border-bottom:1px solid rgba(201,162,75,.12)}
.stat-plus{padding:1px 10px;font-size:14px;line-height:1.2}
.stat-plus:disabled{opacity:.3;cursor:default}
.tree-node{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(201,162,75,.15)}
.tree-node.owned{background:linear-gradient(90deg,rgba(63,158,107,.12),transparent)}
.tree-lv{font-size:11px;color:var(--success);font-weight:700;margin-left:6px}
.skill-learn:disabled{opacity:.35;cursor:default}
.btn:disabled{opacity:.4;cursor:default;filter:grayscale(.4)}
.doll-slot{display:flex;align-items:center;gap:6px;padding:5px;border:1px solid var(--panel-border);border-radius:6px;background:rgba(0,0,0,.25)}
.doll-slot[data-unequip]{cursor:pointer}
.doll-slot[data-unequip]:hover{background:rgba(224,90,74,.18);border-color:var(--danger)}
.gear-row{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:8px 0;border-bottom:1px solid rgba(92,63,27,.2)}
.gear-row.locked{opacity:.62}.gear-row>.btn{flex:0 0 auto}.gear-row__copy{display:block;min-width:0;flex:1;line-height:1.45}
.rarity-badge{display:inline-block;padding:1px 5px;border:1px solid var(--rarity);color:var(--rarity);font-weight:800}
.gear-bonuses{display:flex;gap:4px;flex-wrap:wrap;margin-top:4px}.gear-bonuses--slot{gap:2px;margin-top:3px}
.gear-bonus{display:inline-block;padding:1px 5px;border:1px solid #71809a;background:rgba(34,54,81,.1);color:#34465f;font-size:9px;line-height:1.35}
.gear-bonus i{font-size:7px;font-style:normal}.gear-bonus--core{border-color:#94711f;background:rgba(206,166,63,.16);color:#66480c;font-weight:800}.gear-bonus--useful{border-color:#56724d;color:#34552e}.gear-bonus--muted{opacity:.62}
.gear-advice{margin:0 0 7px;padding:7px 8px;border-left:3px solid #a47b27;background:rgba(183,144,57,.1);font-size:10px}.gear-advice>b,.gear-advice>small{display:block}.gear-advice>span{display:flex;gap:4px;flex-wrap:wrap;margin:4px 0}.gear-advice em{padding:1px 5px;border:1px solid #708067;color:#405a36;font-style:normal}.gear-advice em.core{border-color:#a47b27;color:#6d4c0c;font-weight:800}.gear-advice small{color:var(--text-muted);line-height:1.35}
.gear-summary{margin-bottom:7px;padding:6px 8px;border:1px solid rgba(105,75,30,.3);background:rgba(255,250,224,.25);font-size:10px}.gear-summary>b{color:var(--accent-alt)}
.gear-compare{margin-top:5px;padding:5px 7px;border-left:3px solid #7b6d55;background:rgba(91,75,48,.08);font-size:9px}.gear-compare--upgrade,.gear-compare--empty{border-left-color:#4f7a48;background:rgba(71,117,65,.1)}.gear-compare--tradeoff{border-left-color:#9a7422;background:rgba(177,129,30,.1)}.gear-compare--keep{border-left-color:#963741;background:rgba(150,55,65,.08)}
.gear-compare__head{display:flex;align-items:baseline;justify-content:space-between;gap:8px;flex-wrap:wrap}.gear-compare__head small{color:var(--text-muted)}
.gear-deltas,.gear-affix-changes{display:flex;gap:3px;flex-wrap:wrap;margin-top:3px}.gear-delta,.gear-affix-change{padding:1px 4px;border:1px solid currentColor}.gear-delta.gain,.gear-affix-change.gain{color:#315f36}.gear-delta.loss,.gear-affix-change.loss{color:#8a2f38}.gear-affix-change.neutral{color:var(--text-muted)}.gear-affix-change i{font-size:7px;font-style:normal;font-weight:800}
.shop-rarity-note{margin-bottom:7px;padding:5px 7px;border:1px solid #987735;background:rgba(192,151,54,.11);color:#624817;font-size:10px;line-height:1.4}
.bag-cat{color:var(--accent-alt);font-weight:700;margin:10px 0 4px;border-bottom:1px solid rgba(201,162,75,.3);padding-bottom:2px}
.bag-tabs{display:flex;gap:4px;margin-bottom:8px}
.bag-tab{font-size:11px;padding:3px 10px;cursor:pointer;border:1px solid var(--panel-border);border-radius:5px;color:var(--text-muted)}
.bag-tab.on{background:var(--accent);color:#0e1a12;border-color:var(--accent)}
.q-cat{color:var(--accent-alt);font-weight:700;margin:12px 0 5px;font-size:14px}
.q-card{border:1px solid var(--panel-border);border-radius:6px;padding:8px 10px;margin-bottom:6px;background:rgba(0,0,0,.2)}
/* Main-story chapter road: Base Lv bands stay visible even while a quest is held. */
.story-roadmap{display:grid;grid-template-columns:repeat(5,minmax(104px,1fr));gap:5px;margin:0 0 9px;overflow-x:auto;padding:1px 1px 5px}
.story-phase{position:relative;display:grid;grid-template-columns:24px minmax(0,1fr);gap:5px;align-items:center;min-height:64px;padding:6px;background:#101a2b;border:1px solid #526176;border-top:3px solid var(--phase-color);box-shadow:1px 1px 0 rgba(0,0,0,.45)}
.story-phase.cleared{background:#10261d;border-color:#426b54;border-top-color:var(--phase-color)}
.story-phase.active{background:#172744;box-shadow:inset 0 0 0 1px var(--phase-color),1px 1px 0 rgba(0,0,0,.5)}
.story-phase.locked{filter:saturate(.35);opacity:.58}
.story-phase__sigil{display:flex;align-items:center;justify-content:center;width:22px;height:22px;border:1px solid var(--phase-color);color:var(--phase-color);background:#080d16;font-weight:900}
.story-phase__copy{display:flex;min-width:0;flex-direction:column;line-height:1.15}.story-phase__copy small{color:#96a3b5;font-size:7px;letter-spacing:.3px}.story-phase__copy b{margin:2px 0;color:#eef2f5;font:700 9px var(--font-head)}.story-phase__copy em{color:var(--phase-color);font:italic 8px var(--font-head);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.story-phase__state{grid-column:1/-1;color:var(--phase-color);font-size:7px;font-weight:900;letter-spacing:.7px;text-align:center}
.story-phase-badge{display:inline-block;margin-bottom:5px;padding:2px 7px;border:1px solid var(--phase-color);border-left:4px solid var(--phase-color);background:rgba(13,21,35,.8);color:var(--phase-color);font-size:9px;font-weight:800;letter-spacing:.4px;text-transform:uppercase}
.story-active-card{border-left:3px solid var(--phase-color,var(--accent-alt))}
.story-wait-card{border-color:#69778b;background:linear-gradient(90deg,rgba(75,91,112,.18),rgba(0,0,0,.18))}
.story-lock-copy{display:block;margin:6px 0 4px;color:var(--parchment-ink,#252823);font-size:12px}
.story-level-bar{height:7px;margin:4px 0 7px;border:1px solid #647188;background:#080d16}.story-level-bar i{display:block;height:100%;background:linear-gradient(90deg,#5278a8,#e6bd54)}
.quest-wait{padding-left:7px;border-left:3px solid #718198}
/* World Chronicle: a readable linear pilgrimage road, revealed by exploration. */
.panel[data-kind="world"] .panel__body{padding:9px;background:#0f1c30}
.world-chronicle{width:min(760px,84vw);color:#e8edf3}
.world-head{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:12px 14px;background:#101d32;border:1px solid #7f8da0;border-left:4px solid #d5b85d;box-shadow:inset 0 0 0 1px #314b73}
.world-head>div:first-child{min-width:0}.world-head small{color:#91a2b8;font-size:8px;font-weight:800;letter-spacing:1.3px}
.world-head h2{margin:1px 0 2px;color:#f0d47d;font:700 20px var(--font-head)}
.world-head p{margin:0;color:#aeb9c8;font-size:9px;line-height:1.45}
.world-seal{flex:0 0 66px;height:66px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#080d14;border:2px solid #cbd4dd;outline:2px solid #314b73;border-radius:50%;box-shadow:2px 2px 0 rgba(0,0,0,.55)}
.world-seal b{color:#f0d47d;font:700 17px var(--font-head);line-height:1}.world-seal span{margin-top:3px;color:#8997aa;font-size:7px;letter-spacing:1px}
.world-road{padding:10px 8px 4px}
.world-node{display:grid;grid-template-columns:50px minmax(0,1fr);gap:10px;position:relative;padding:10px;background:#142744;border:1px solid #60718a;box-shadow:2px 2px 0 rgba(0,0,0,.45)}
.world-node.current{border-color:#f0d47d;box-shadow:inset 0 0 0 1px #725822,2px 2px 0 rgba(0,0,0,.5)}
.world-node.routing{border-color:#89ad8e;box-shadow:inset 0 0 0 1px #3f6048,2px 2px 0 rgba(0,0,0,.5)}
.world-node.unknown{min-height:70px;align-items:center;background:#0b1525;border-style:dashed;border-color:#46566d;color:#68778b}
.world-sigil{width:46px;height:46px;display:flex;align-items:center;justify-content:center;background:#080d14;border:2px solid #aeb9c8;box-shadow:inset 0 0 0 2px #314b73;color:#f0d47d;font:700 23px var(--font-head)}
.world-node.unknown .world-sigil{border-color:#46566d;color:#68778b;box-shadow:none}
.world-copy{min-width:0}.world-node-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
.world-node-head>div{display:flex;flex-direction:column;min-width:0}.world-province{color:#91a2b8;font-size:8px;font-weight:800;letter-spacing:1px}
.world-copy b{color:#f1eee3;font:700 15px var(--font-head)}.world-copy em{color:#d5b85d;font:italic 10px var(--font-head)}
.world-copy p{margin:6px 0;color:#b9c3d0;font:11px/1.45 var(--font-head)}
.world-node.unknown .world-copy b{color:#718197}.world-node.unknown .world-copy p{margin:3px 0;color:#5f6f84;font-family:var(--font-ui);font-size:9px}
.world-facts{display:grid;grid-template-columns:1.35fr .65fr 1fr;gap:4px}
.world-fact{min-width:0;padding:4px 6px;background:#0b1628;border:1px solid #4f6078;color:#d8e0e9;font-size:9px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.world-fact small{display:block;color:#718197;font-size:7px;font-weight:800;letter-spacing:.7px}.world-fact.cleared{border-color:#52775e;color:#9dc19f}
.world-you-are-here{flex:0 0 auto;padding:4px 6px;background:#604923;border:1px solid #f0d47d;color:#fff4c2;font-size:8px;font-weight:800;letter-spacing:.5px}
.world-route{flex:0 0 auto;min-height:24px;padding:3px 7px;font-size:8px}.world-route.active{border-color:#89ad8e;color:#9dc19f}
.world-link{position:relative;height:24px;margin-left:30px;border-left:2px dotted #46566d}.world-link i{position:absolute;left:-4px;top:10px;width:6px;height:6px;background:#46566d;transform:rotate(45deg)}
.world-link span{position:absolute;left:10px;top:7px;color:#596a80;font-size:7px;letter-spacing:.8px}.world-link.known{border-left-style:solid;border-color:#a98742}.world-link.known i{background:#d5b85d}.world-link.known span{color:#a98742}
.world-foot{display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding:6px 9px;border-top:1px solid #405675;color:#718197;font-size:8px}.world-foot span:last-child{margin-left:auto}
/* RO-style class skill manual: three job chapters, full labels, no crossing lines. */
.panel[data-kind="skills"]{width:min(940px,94vw);max-width:94vw}
.panel[data-kind="skills"] .panel__body{padding:8px;background:#0a111d}
.ro-skill-book{color:#dce4ec;background:linear-gradient(160deg,var(--book-deep),#0a111d 38%,#111b2b);border:1px solid color-mix(in srgb,var(--book-accent) 58%,#4b5665);box-shadow:inset 0 0 0 1px rgba(255,255,255,.04)}
.ro-book-head{display:grid;grid-template-columns:58px minmax(0,1fr) 134px 92px;align-items:center;gap:10px;padding:11px 12px;border-bottom:2px solid var(--book-accent);background:linear-gradient(90deg,color-mix(in srgb,var(--book-deep) 88%,#000),rgba(8,13,20,.76))}
.ro-crest{display:flex;align-items:center;justify-content:center;width:52px;height:52px;border:2px solid var(--book-accent);background:var(--book-deep);color:var(--book-accent);font:32px/1 var(--font-head);box-shadow:inset 0 0 0 3px rgba(0,0,0,.28),0 0 12px color-mix(in srgb,var(--book-accent) 24%,transparent);transform:rotate(2deg)}
.ro-book-title{min-width:0}.ro-book-title small{color:#8e9caf;font-size:8px;font-weight:900;letter-spacing:1.5px}.ro-book-title h3{margin:2px 0;color:var(--book-accent);font:700 20px/1.1 var(--font-head);letter-spacing:.3px}.ro-book-title b{color:#e8edf3;font-size:10px;letter-spacing:.6px}.ro-book-title p{margin:3px 0 0;color:#a6b1bf;font-size:9px;font-style:italic;line-height:1.35}
.ro-book-stats{display:flex;flex-direction:column;gap:3px;padding:6px 8px;border:1px solid #526178;background:rgba(4,8,14,.62);font-size:8px;color:#aeb9c8}.ro-book-stats strong{display:flex;align-items:center;gap:7px;color:var(--book-accent);font:700 24px/1 var(--font-head)}.ro-book-stats strong small{color:#e4e9ef;font:800 7px/1.2 var(--font-ui);letter-spacing:1px}.ro-book-stats span b{color:#d7a6f1;letter-spacing:1px}.ro-book-radar{width:92px;overflow:hidden}.ro-book-radar svg{width:92px;height:88px}
.ro-job-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;padding:8px}
.ro-job-lane{min-width:0;border:1px solid #526178;background:rgba(11,21,37,.88);box-shadow:inset 0 3px 0 color-mix(in srgb,var(--book-accent) 76%,#fff)}
.ro-job-lane>header{display:grid;grid-template-columns:25px minmax(0,1fr);align-items:center;gap:5px;min-height:46px;padding:6px 7px;border-bottom:1px solid #526178;background:linear-gradient(90deg,color-mix(in srgb,var(--book-deep) 82%,#101827),#142238)}
.ro-job-lane>header>span{grid-row:1/3;color:var(--book-accent);font:700 20px/1 var(--font-head)}.ro-job-lane>header div{display:flex;flex-direction:column;min-width:0}.ro-job-lane>header small{color:#8997aa;font-size:7px;font-weight:900;letter-spacing:1px}.ro-job-lane>header b{overflow-wrap:anywhere;color:#eef2f6;font-size:10px;line-height:1.2}.ro-job-lane>header>i{grid-column:2;color:#9dc19f;font-size:7px;font-style:normal;font-weight:800;letter-spacing:.6px}.ro-job-lane.locked-job>header>i{color:#d3987f}
.ro-lane-label{margin:7px 6px 4px;color:var(--book-accent);font-size:7px;font-weight:900;letter-spacing:1px}.ro-lane-label.passive{margin-top:9px;padding-top:7px;border-top:1px dashed #53657e;color:#d7a6f1}
.ro-skill-list{display:grid;gap:4px;padding:0 5px}.ro-skill-list.passive-list{padding-bottom:6px}.ro-empty{padding:8px;color:#718197;font-size:8px;font-style:italic}
.ro-skill{position:relative;display:grid;grid-template-columns:38px minmax(0,1fr);align-items:center;gap:6px;min-height:56px;padding:5px 5px 5px 4px;border:1px solid #53657e;border-left:3px solid #63758d;background:#101d32;box-shadow:1px 1px 0 rgba(0,0,0,.48);transition:filter .12s,transform .12s,border-color .12s}
.ro-skill-icon{position:relative;display:flex;align-items:center;justify-content:center;width:34px;height:34px;border:1px solid #718197;background:#080d14;color:#d8e0e9;font-size:18px}.ro-skill-icon i{position:absolute;right:-3px;bottom:-4px;min-width:21px;padding:1px 3px;border:1px solid #53657e;background:#080d14;color:#cbd4de;font:700 7px/1.2 var(--font-ui);font-style:normal;text-align:center}
.ro-skill-copy{display:flex;flex-direction:column;min-width:0;padding-right:2px}.ro-skill-copy b{overflow-wrap:anywhere;color:#e8edf3;font-size:10px;line-height:1.2}.ro-skill-copy small{margin-top:2px;color:#94a2b4;font-size:7px;line-height:1.3}.ro-skill-copy em{margin-top:3px;color:#8fc5e8;font-size:7px;font-style:normal;font-weight:800;letter-spacing:.25px}
.ro-skill-state{grid-column:1/-1;justify-self:end;margin-top:-2px;padding:1px 4px;border:1px solid #53657e;background:#080d14;color:#9ba8b8;font-size:6px;font-weight:900;letter-spacing:.7px}
.ro-skill.locked{background:#0d1726;border-color:#465468}.ro-skill.locked .ro-skill-copy b{color:#a7b1be}.ro-skill.locked .ro-skill-icon{color:#8795a7}.ro-skill.ready{border-color:#71c47c;background:#173528;box-shadow:inset 0 0 0 1px rgba(113,196,124,.2),0 0 7px rgba(113,196,124,.22)}.ro-skill.ready .ro-skill-state{color:#9ee6a7;border-color:#71c47c}.ro-skill.owned{border-color:color-mix(in srgb,var(--book-accent) 72%,#798698);background:color-mix(in srgb,var(--book-deep) 68%,#17253a)}.ro-skill.maxed{border-color:#e3bd58;background:#392f1a}.ro-skill.maxed .ro-skill-state{color:#f0d47d;border-color:#8b7238}.ro-skill.tier-capped{border-color:#6fb0ef;background:#172b45}.ro-skill.can{cursor:pointer}.ro-skill.can:hover{filter:brightness(1.2);transform:translateY(-1px);outline:1px solid rgba(255,255,255,.2)}
.ro-skill.is-builder{border-left-color:#6f9669}.ro-skill.is-setup{border-left-color:#638cc1}.ro-skill.is-detonator{border-left-color:#ad78cf}.ro-skill.is-finisher{border-left-color:#c65356}.ro-skill.is-passive{border-left-color:#9c72bd}.ro-skill[draggable="true"]{cursor:grab}.ro-skill[draggable="true"]:active{cursor:grabbing}
.ro-reset-note{display:flex;align-items:center;gap:8px;margin:0 8px 8px;padding:7px 9px;border:1px solid #8b7238;background:#2a2417}.ro-reset-note>span{color:#f0d47d;font-size:22px}.ro-reset-note div{display:flex;flex-direction:column}.ro-reset-note b{color:#f0d47d;font-size:8px;letter-spacing:1px}.ro-reset-note small{color:#c4bda9;font-size:8px;line-height:1.35}
.skill-guide{margin:0 8px 8px;border:1px solid #526178;background:#0b1628}.skill-guide>summary{padding:7px 9px;color:#efd16f;font-size:9px;font-weight:900;letter-spacing:.7px;cursor:pointer}.skill-guide>summary small{margin-left:8px;color:#8997aa;font-size:8px;font-weight:400;letter-spacing:0}.skill-guide .skill-flow{width:auto;margin:0;border-width:1px 0 0;box-shadow:none}
/* skill hover tooltip */
.sk-tip{position:fixed;z-index:60;max-width:264px;background:linear-gradient(180deg,#2f2716,#1a140c);
  border:1px solid var(--panel-border);border-radius:8px;padding:9px 11px;box-shadow:0 6px 22px rgba(0,0,0,.65);
  font-size:12px;line-height:1.5;pointer-events:none}
.sk-tip .tip-name{font-weight:700;color:var(--accent-alt);font-size:13px;margin-bottom:2px}
.sk-tip .tip-eff{color:#ffe14d;font-weight:600;margin:2px 0}
.sk-tip .tip-row{color:var(--text-muted)}
.sk-tip .tip-row b{color:var(--text)}
.sk-tip .tip-mastery{margin:4px 0;padding:4px 6px;border-left:2px solid #6fb0ef;background:rgba(111,176,239,.1);color:#a9cceb;font-size:10px}
.sk-tip .tip-flav{color:#b8ab8e;font-style:italic;margin-top:4px}
.sk-tip .tip-gate{color:var(--danger);margin-top:4px}
.sk-tip .tip-hint{margin-top:3px;font-weight:600}
/* hotbar slot picker */
.slot-picker{position:fixed;z-index:60;min-width:180px;max-height:300px;overflow-y:auto;
  background:linear-gradient(180deg,#2f2716,#1a140c);border:1px solid var(--panel-border);
  border-radius:8px;padding:6px;box-shadow:0 6px 22px rgba(0,0,0,.65);font-size:12px}
.slot-picker .sp-head{font-weight:700;color:var(--accent-alt);padding:2px 8px 6px;border-bottom:1px solid rgba(224,182,76,.3);margin-bottom:4px}
.slot-picker .sp-row{padding:4px 8px;cursor:pointer;border-radius:4px;white-space:nowrap}
.slot-picker .sp-row:hover{background:rgba(63,158,107,.25)}
/* job xp bar — thin blue strip riding above the gold base-xp bar */
.job-bar{position:fixed;left:0;right:0;bottom:8px;height:4px;border-radius:0;border:none;background:rgba(20,26,30,.8)}
.job-bar .fill{border-radius:0;background:linear-gradient(180deg,#9fd0ff,#6fb0ef)}
/* action bar: readable skill roles, readiness, drag targets, and configurable keys */
#hud .hotbar-shell{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);display:flex;align-items:stretch;gap:4px;z-index:11;pointer-events:auto}
#hud .hotbar-shell .hotbar{position:static;left:auto;bottom:auto;transform:none;display:flex;overflow:visible}
#hud .hotbar-shell .skill-btn{width:50px;height:50px;flex:0 0 50px}
#hud .hotbar-shell .hotbar-config{width:34px;border:1px solid #8997aa;background:#101d32;color:#d5b85d;font-size:17px;cursor:pointer;box-shadow:inset 0 0 0 1px #31466a,2px 2px 0 rgba(0,0,0,.55)}
#hud .hotbar-shell .hotbar-config:hover{border-color:#efd16f;background:#233e66}
#hud .hotbar-shell .hotbar-glyph{position:absolute;left:50%;top:49%;transform:translate(-50%,-50%);font-size:22px;line-height:1;color:#e9edf2;text-shadow:1px 1px #05080d}
#hud .hotbar-shell .role-mark{position:absolute;right:3px;top:2px;min-width:13px;height:13px;padding:0 2px;border:1px solid currentColor;background:#080d14;font-size:8px;font-weight:800;line-height:11px;text-align:center}
#hud .hotbar-shell .skill-btn .lvl{top:auto;right:3px;bottom:2px;font-size:8px;color:#b8c3d2}
#hud .hotbar-shell .skill-btn .sk-name{left:3px;right:auto;bottom:2px;max-width:32px;color:#c8d0da;text-align:left;text-overflow:ellipsis;white-space:nowrap}
#hud .hotbar-shell .role-builder{border-bottom:3px solid #6f9669}
#hud .hotbar-shell .role-builder .role-mark{color:#9dc19f}
#hud .hotbar-shell .role-detonator{border-bottom:3px solid #ad78cf}
#hud .hotbar-shell .role-detonator .role-mark{color:#d7a6f1}
#hud .hotbar-shell .role-finisher{border-bottom:3px solid #c65356}
#hud .hotbar-shell .role-finisher .role-mark{color:#ef9b9e}
#hud .hotbar-shell .role-utility{border-bottom:3px solid #638cc1}
#hud .hotbar-shell .resource-blocked:not(.item-slot){opacity:.58;filter:saturate(.55)}
#hud .hotbar-shell .finisher-ready{border-color:#f0d47d;background:#51303a;box-shadow:inset 0 0 0 1px #9c4b55,0 0 8px rgba(240,212,125,.55);animation:finisherReady .9s steps(2,end) infinite}
#hud .hotbar-shell .skill-btn.pressed{transform:translateY(2px) scale(.96);filter:brightness(1.35)}
#hud .hotbar-shell .skill-btn.drop-ready{outline:2px solid #efd16f;outline-offset:2px;background:#3a664b;transform:translateY(-3px)}
#hud .hotbar-shell .empty-plus{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#7f8da0;font-size:20px}
#hud .hotbar-shell .skill-btn .cd{background:conic-gradient(rgba(5,8,13,.84) var(--cd-angle),rgba(5,8,13,.26) 0);font-size:14px;text-shadow:1px 1px #000}
@keyframes finisherReady{50%{filter:brightness(1.18)}}

/* Momentum is a labeled part of the action loop, not a row of unexplained dots. */
#hud .hotbar-shell .momentum-pips{position:absolute;left:50%;bottom:59px;transform:translateX(-50%);display:flex;align-items:center;gap:7px;justify-content:center;z-index:5;width:max-content;padding:3px 7px;background:rgba(8,13,20,.9);border:1px solid #68778b;box-shadow:2px 2px 0 rgba(0,0,0,.5)}
#hud .momentum-pips .momentum-label{font-size:8px;font-weight:800;letter-spacing:1px;color:#b8c3d2;text-transform:uppercase}
#hud .momentum-pips .momentum-track,.skill-flow .momentum-track{display:flex;gap:4px}
#hud .momentum-pips .momentum-state{min-width:82px;font-size:8px;font-weight:800;color:#8f9caf;letter-spacing:.4px}
#hud .momentum-pips.ready .momentum-state{color:#f0d47d}
#hud .momentum-pips .pip,.skill-flow .pip{width:10px;height:10px;border-radius:1px;background:#111925;border:1px solid #69778a;transition:all .12s}
#hud .momentum-pips .pip.on,.skill-flow .pip.on{background:#d2ad4e;border-color:#ffe59a;box-shadow:0 0 0 1px #725822}
#hud .momentum-pips .pip.on.ready,.skill-flow .pip.on.ready{background:#963741;border-color:#efb2b5;box-shadow:0 0 0 1px #5d1f27}

/* Skill-system map: role-first flow above the dependency tree. */
.skill-flow{width:min(780px,84vw);margin-bottom:12px;padding:9px;background:#101d32;border:1px solid #7f8da0;box-shadow:inset 0 0 0 1px #314b73}
.flow-head{display:flex;align-items:center;gap:12px;margin-bottom:8px;padding-bottom:7px;border-bottom:1px solid #50637d}
.flow-head>div:first-child{display:flex;flex-direction:column;flex:1;min-width:0}
.flow-head>div:first-child b{color:#f0d47d;font-family:var(--font-head);font-size:15px}
.flow-head>div:first-child span{color:#aeb9c8;font-size:10px}
.flow-momentum{display:flex;align-items:center;gap:6px;padding:4px 7px;background:#080d14;border:1px solid #5e6d81}
.flow-momentum small{font-size:8px;color:#8997aa}.flow-momentum b{font-size:9px;color:#efd16f}
.flow-grid{display:grid;grid-template-columns:minmax(0,1fr) 16px minmax(0,1fr) 16px minmax(0,1fr);align-items:stretch}
.flow-arrow{display:flex;align-items:center;justify-content:center;color:#d5b85d;font-size:24px}
.flow-card{position:relative;min-width:0;padding:8px;border:1px solid #60718a;background:#142744}
.flow-card.build{border-top:3px solid #6f9669}.flow-card.chain{border-top:3px solid #ad78cf}.flow-card.finish{border-top:3px solid #c65356}
.flow-step{position:absolute;right:6px;top:5px;color:#63758d;font-size:9px;font-weight:800}
.flow-title{font-size:11px;font-weight:900;letter-spacing:.8px;color:#f1eee3}
.flow-copy{min-height:42px;margin:3px 0 6px;color:#aeb9c8;font-size:9px;line-height:1.4}
.flow-skills{display:flex;flex-wrap:wrap;gap:3px;align-content:flex-start}
.flow-skill{position:relative;display:inline-flex;align-items:center;gap:3px;min-width:0;padding:2px 4px;border:1px solid #4f6078;background:#0b1525;color:#718197;font:8px var(--font-ui);line-height:1.2}
button.flow-skill{cursor:pointer}.flow-skill.learned{color:#e8edf3;border-color:#8494a9;background:#192f50}.flow-skill.unbound:hover{border-color:#f0d47d;background:#294c3a}
.flow-skill small{color:#90a0b5;font-size:7px}.flow-skill kbd{color:#efd16f}.flow-skill i{color:#9dc19f;font-size:7px;font-style:normal}
.flow-skill.locked{opacity:.45}.flow-empty{color:#718197;font-size:9px;font-style:italic}
.flow-legend{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:7px;color:#95a3b5;font-size:8px}
.flow-legend span:last-child{margin-left:auto}.legend-box{display:inline-block;width:8px;height:8px;margin-right:3px;background:#60718a}.legend-box.builder{background:#6f9669}.legend-box.setup{background:#638cc1}.legend-box.detonate{background:#ad78cf}.legend-box.finisher{background:#c65356}

.tip-mechanics{display:grid;gap:3px;margin:6px 0;padding:6px;background:#0b1628;border:1px solid #53657e}
.tip-mechanic{display:inline-block;min-width:58px;margin-right:4px;padding:1px 4px;border:1px solid currentColor;font-size:8px;font-weight:800;text-align:center;text-transform:uppercase}
.tip-mechanic.build{color:#9dc19f}.tip-mechanic.setup{color:#9fc3ea}.tip-mechanic.detonate{color:#d7a6f1}.tip-mechanic.finish{color:#ef9b9e}
.tip-bar{margin-top:4px;color:#aeb9c8}.tip-bar kbd,.slot-picker kbd{color:#f0d47d}

/* Keybinding panel */
.hotkey-intro{display:flex;flex-direction:column;gap:2px;margin-bottom:8px;color:#aeb9c8;font-size:10px}.hotkey-intro b{color:#f0d47d;font:700 15px var(--font-head)}
.hotkey-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px;min-width:min(560px,78vw)}
.hotkey-row{display:grid;grid-template-columns:22px 26px minmax(0,1fr) 58px;align-items:center;gap:5px;min-height:43px;padding:4px 6px;background:#101d32;border:1px solid #586a82}
.hotkey-slot-no{color:#718197;font-size:9px}.hotkey-row-glyph{color:#efd16f;font-size:18px;text-align:center}.hotkey-action{display:flex;flex-direction:column;min-width:0}.hotkey-action b{overflow:hidden;color:#e8edf3;font-size:10px;text-overflow:ellipsis;white-space:nowrap}.hotkey-action small{overflow:hidden;color:#8796a9;font-size:8px;text-overflow:ellipsis;white-space:nowrap}
.keycap{min-width:50px;height:27px;background:#172a47;border:1px solid #aeb9c8;color:#efd16f;font-weight:800;cursor:pointer;box-shadow:inset 0 -2px 0 #080d14}.keycap:hover{background:#233e66;border-color:#efd16f}.keycap.listening{color:#fff;background:#604923;border-color:#f0d47d;animation:keyListen .7s steps(2,end) infinite}
.hotkey-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:8px;color:#8796a9;font-size:9px}
@keyframes keyListen{50%{filter:brightness(1.35)}}
.slot-picker .sp-sep{height:1px;margin:4px;background:#53657e}
.dialogue__choices .btn{display:flex;align-items:center;justify-content:space-between}
.dialogue__choices .btn kbd{margin-left:auto;padding:1px 6px;border:1px solid #9aa8b9;background:#080d14;color:#efd16f;font-size:9px;box-shadow:inset 0 -1px #000}
@media(max-width:760px){
  .panel[data-kind="skills"]{width:calc(100vw - 16px);max-width:calc(100vw - 16px)}
  .ro-book-head{grid-template-columns:48px minmax(0,1fr);padding:8px}.ro-crest{width:42px;height:42px;font-size:25px}.ro-book-stats{grid-column:1/-1;display:grid;grid-template-columns:1fr 1fr 1fr}.ro-book-stats strong{font-size:18px}.ro-book-radar{display:none}
  .ro-job-grid{grid-template-columns:1fr}.ro-skill{grid-template-columns:40px minmax(0,1fr) auto}.ro-skill-state{grid-column:3;grid-row:1;align-self:end;margin:0}.ro-skill-copy b{font-size:11px}.ro-skill-copy small,.ro-skill-copy em{font-size:8px}
  .skill-guide>summary small{display:block;margin:2px 0 0}.flow-grid{grid-template-columns:1fr}.flow-arrow{height:14px;transform:rotate(90deg)}.flow-copy{min-height:0}.flow-head{align-items:flex-start;flex-wrap:wrap}.flow-head>div:first-child{flex-basis:100%}
}
#hud .mp-bar .fill{background:linear-gradient(90deg,#315f9d,#5b91d2);transition:width .16s linear}
#hud .mp-bar.low .fill{background:linear-gradient(90deg,#6e3f86,#a666b8)}
#hud .mp-bar.empty .label{color:#ef9b9e}

@media(max-width:680px){
  #hud .hotbar-shell{width:96vw}.hotbar-shell .hotbar{max-width:calc(96vw - 38px);overflow-x:auto!important}.hotbar-shell .momentum-state{display:none}
  .skill-flow{width:82vw}.flow-grid{display:flex;flex-direction:column;gap:4px}.flow-arrow{height:12px;transform:rotate(90deg)}.flow-copy{min-height:0}.flow-legend span:last-child{margin-left:0}
  .hotkey-grid{grid-template-columns:1fr;min-width:78vw}
  .world-chronicle{width:86vw}.world-head{padding:9px;gap:8px}.world-head h2{font-size:17px}.world-seal{flex-basis:54px;height:54px}.world-road{padding:7px 2px}.world-node{grid-template-columns:38px minmax(0,1fr);gap:7px;padding:8px}.world-sigil{width:36px;height:36px;font-size:18px}.world-node-head{gap:6px}.world-copy p{font-size:10px}.world-facts{grid-template-columns:1fr}.world-fact{white-space:normal}.world-link{margin-left:20px}.world-foot span:last-child{margin-left:0}
  .gear-row{flex-direction:column}.gear-row>.btn{align-self:flex-start}.gear-compare__head{align-items:flex-start;flex-direction:column;gap:1px}
}
@media(prefers-reduced-motion:reduce){#hud .hotbar-shell .finisher-ready,.keycap.listening{animation:none}}
`;

// =====================================================================
// BOOT
// =====================================================================
// =====================================================================
// SAVE / LOAD  (localStorage, single slot — the .js data modules are the
// content DB; this persists just the player's run.)
// =====================================================================
const SAVE_KEY = 'awo_save_v1';
const AUTH_KEY = 'awo_auth_v1';
function storage() { try { return window.localStorage || null; } catch { return null; } }
function profileId(name) { return String(name || '').trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32); }
function readSession() { const ls = storage(); if (!ls) return null; try { return JSON.parse(ls.getItem(AUTH_KEY)); } catch { return null; } }
function currentProfile() { const s = readSession(); return s?.id ? s : null; }
function saveKey() { const p = currentProfile(); return p ? `${SAVE_KEY}_${p.id}` : SAVE_KEY; }
function signIn(name) {
  const id = profileId(name);
  if (!id) return false;
  const ls = storage(); if (!ls) return false;
  const profile = { id, name: String(name).trim().slice(0, 24), signedInAt: Date.now() };
  try { ls.setItem(AUTH_KEY, JSON.stringify(profile)); } catch { return false; }
  return true;
}
function signOut() { const ls = storage(); try { ls && ls.removeItem(AUTH_KEY); } catch {} }
function readSave() { const ls = storage(); if (!ls) return null; try { return JSON.parse(ls.getItem(saveKey())); } catch { return null; } }
function hasSave() { return !!readSave(); }
function deleteSave() { const ls = storage(); try { ls && ls.removeItem(saveKey()); } catch {} }
function saveGame() {
  const ls = storage(); if (!ls || !G.player || !G.running) return;   // only persist a live run
  const p = G.player;
  const data = { v: 3,
    player: { classId: p.classId, name: p.name, className: p.className, tierIndex: p.tierIndex,
      level: p.level, xp: p.xp, jobLevel: p.jobLevel, jobXp: p.jobXp, rebirths: p.rebirths || 0, zeny: p.zeny, hp: p.hp, mp: p.mp,
      alloc: p.alloc, statPoints: p.statPoints, skillPoints: p.skillPoints, skillLevels: p.skillLevels,
      equip: p.equip, inventory: p.inventory, hotbar: p.hotbar, hotkeys: p.hotkeys },
    world: { mapId: G.mapId, col: Math.floor(p.x / TS), row: Math.floor(p.y / TS),
      quest: G.quest, pendingQuest: G.pendingQuest, killCounts: G.killCounts, won: G.won, autoFarm: G.autoFarm,
      huntTargetId: G.huntTargetId, taskGuide: G.taskGuide,
      advance: G.advance, guildBoard: G.guildBoard, activeGuilds: G.activeGuilds,
      guildRankIdx: G.guildRankIdx, guildPoints: G.guildPoints,
      visited: [...G.visited], talked: [...G.talked], guardiansSlain: [...G.guardiansSlain],
      storage: G.storage, achievements: [...G.achievements] } };
  try { ls.setItem(saveKey(), JSON.stringify(data)); } catch {}
}
// shared canvas/HUD boot used by both new-game and continue
let runtimeResizeBound = false;
function syncRuntimeScale() {
  const fx = $('#fx-layer'); if (!fx) return;
  const scale = Math.min(1, innerWidth / CANVAS_W, innerHeight / CANVAS_H);
  fx.style.transform = `translate(-50%,-50%) scale(${scale})`;
}
function startRuntime() {
  canvas = $('#game-canvas');
  canvas.classList.add('world-canvas');
  Object.assign(canvas.style, { display: 'block', position: 'fixed', inset: 'auto', top: '50%', left: '50%', width: '', height: '', transform: 'translate(-50%,-50%)', imageRendering: 'pixelated' });
  ctx = canvas.getContext('2d');
  canvas.onclick = onCanvasClick;
  // overlay the FX layer exactly on top of the (centered) canvas so damage numbers land on target
  const fx = $('#fx-layer');
  fx.style.cssText = `position:fixed;top:50%;left:50%;width:${CANVAS_W}px;height:${CANVAS_H}px;transform:translate(-50%,-50%);pointer-events:none;overflow:hidden;z-index:14`;
  syncRuntimeScale();
  if (!runtimeResizeBound) { window.addEventListener('resize', syncRuntimeScale); runtimeResizeBound = true; }
  buildHud();
}
function resumeGame() {
  const d = readSave(); if (!d) return false;
  AUDIO.init();
  const sp = d.player, p = makePlayer(sp.classId, sp.name);
  Object.assign(p, { className: sp.className || p.className, tierIndex: sp.tierIndex || 0, level: sp.level, xp: sp.xp,
    jobLevel: sp.jobLevel ?? sp.level, jobXp: sp.jobXp ?? 0, rebirths: sp.rebirths || 0,
    zeny: sp.zeny, alloc: sp.alloc, statPoints: sp.statPoints, skillPoints: sp.skillPoints,
    skillLevels: sp.skillLevels || p.skillLevels, equip: sp.equip || p.equip, inventory: sp.inventory || p.inventory,
    hotbar: Array.isArray(sp.hotbar) ? sp.hotbar.slice(0, 9) : p.hotbar,
    hotkeys: normaliseHotkeys(sp.hotkeys) });
  normalisePlayerProgression(p); // migrate old uncapped-job saves without deleting learned ranks
  while (p.hotbar.length < 9) p.hotbar.push(null);
  // restore the uid counter past every saved instance so fresh drops don't collide
  let maxUid = 0; const scan = e => { if (e && e.uid > maxUid) maxUid = e.uid; };
  Object.values(sp.equip || {}).forEach(scan); (sp.inventory || []).forEach(scan);
  (d.world?.storage || []).forEach(scan);   // stored gear carries uids too
  _uid = maxUid;
  G.player = p; recompute(p, false);
  p.hp = clamp(sp.hp ?? p.maxHp, 1, p.maxHp); p.mp = clamp(sp.mp ?? p.maxMp, 0, p.maxMp);
  G.admin = p.name.trim().toLowerCase() === 'admin';
  const w = d.world;
  G.quest = w.quest || null; G.pendingQuest = w.pendingQuest || null; G.killCounts = w.killCounts || {}; G.won = !!w.won; G.autoFarm = !!w.autoFarm;
  G.huntTargetId = w.huntTargetId || null; G.taskGuide = w.taskGuide || null;
  // legacy saves flagged `won` at the Flame Dragon (old finale); if the story is still
  // running, clear it so the TRUE finale (Nullking) can still play its cutscene once
  if (G.won && (G.quest || G.pendingQuest)) G.won = false;
  G.advance = w.advance || null; G.guildBoard = (w.guildBoard && w.guildBoard.length) ? w.guildBoard : (refreshGuildBoard(), G.guildBoard);
  G.activeGuilds = w.activeGuilds || (w.activeGuild ? [w.activeGuild] : []);   // legacy single-bounty saves
  G.guildRankIdx = w.guildRankIdx || 0; G.guildPoints = w.guildPoints || 0;
  G.guardiansSlain = new Set(w.guardiansSlain || []);
  if (!w.guardiansSlain && w.visited)   // legacy saves: reaching a zone implies the previous guardian fell
    for (let i = 1; i < ZONE_ORDER.length; i++)
      if (w.visited.includes(ZONE_ORDER[i])) G.guardiansSlain.add(zoneGuardian(ZONE_ORDER[i - 1]));
  G.visited = new Set(w.visited || []); G.talked = new Set(w.talked || []);
  G.storage = w.storage || []; G.achievements = new Set(w.achievements || []);
  preloadSprites();
  $('#root').innerHTML = '';
  startRuntime();
  loadMap(w.mapId || 'town_awakening', w.col, w.row);
  maybeStartPendingQuest();
  updateQuestTracker();
  updateFarmButton();
  G.running = true; last = now(); requestAnimationFrame(frame);
  toast(T('Welcome back, {name} — Lv {level} {class}.', 'ui')
    .replace('{name}', p.name).replace('{level}', p.level).replace('{class}', T(p.className, 'classes')), 'good');
  return true;
}

function begin(classId, name) {
  AUDIO.init();
  G.player = makePlayer(classId, name);
  G.admin = G.player.name.trim().toLowerCase() === 'admin';   // name your hero "admin" for dev tools
  G.won = false; G.autoFarm = false; G.huntTargetId = null; G.taskGuide = null; G.advance = null; G.quest = null; G.pendingQuest = null; G.killCounts = {};
  G.visited = new Set(); G.talked = new Set();
  G.storage = []; G.achievements = new Set();
  G.activeGuilds = []; G.guildRankIdx = 0; G.guildPoints = 0; G.guardiansSlain = new Set(); refreshGuildBoard();
  preloadSprites();
  $('#root').innerHTML = '';
  runCutscene(CONTENT.story.intro, () => {
    startRuntime();
    loadMap('town_awakening');
    startQuest('q_awaken');
    G.running = true; last = now();
    requestAnimationFrame(frame);
  });
}

function onCanvasClick(e) {
  const rect = canvas.getBoundingClientRect();
  const wx = (e.clientX - rect.left) * (CANVAS_W / rect.width) + G.cam.x;
  const wy = (e.clientY - rect.top) * (CANVAS_H / rect.height) + G.cam.y;
  handleClick(wx, wy);
}
// world-space click handler (also called by the headless test harness)
function handleClick(wx, wy) {
  // 1) NPCs get first pick in their tighter sprite hitbox. Remember the
  // interaction so a distant click means "walk there, then talk".
  const n = G.npcs.find(nn => dist(wx, wy, nn.x * TS + TS / 2, nn.y * TS + TS / 2) < TS);
  if (n) {
    G.target = null; G.targetSource = null; G.path = null;
    const close = dist(G.player.x, G.player.y, n.x * TS + TS / 2, n.y * TS + TS / 2) < TS * 1.6;
    if (close) { G.manualIntent = null; interact(n.id); }
    else if (pathTo(n.x * TS + TS / 2, n.y * TS + TS / 2)) G.manualIntent = { type: 'npc', npcId: n.id };
    else { G.manualIntent = null; toast(T('Could not reach {name}.', 'ui').replace('{name}', T(n.name, 'npcs')), 'bad'); }
    return;
  }
  // 2) click a monster → target it and A*-route into range
  let best = null, bestD = 1e9;
  for (const m of G.monsters) if (m.alive) { const d = dist(wx, wy, m.x, m.y); if (d < m.size / 2 + 14 && d < bestD) { best = m; bestD = d; } }
  if (best) { G.manualIntent = null; G.target = best; G.targetSource = 'manual'; best.provoked = true; pathTo(best.x, best.y); return; }
  // 3) click ground → route there
  G.target = null;
  G.targetSource = null;
  G.manualIntent = pathTo(wx, wy) ? { type: 'move', x: wx, y: wy } : null;
}

// input
window.addEventListener('keydown', e => {
  const key = e.key.toLowerCase();
  const code = eventHotkeyCode(e);
  if (G.running && dlg && (key === ' ' || code === 'Space')) {
    e.preventDefault();
    if (!e.repeat) advanceDialogue();
    return;
  }
  if (G.running && captureHotkeyBinding(e)) return;
  G.keys[key] = true;
  if (!G.running) return;
  const slot = !e.ctrlKey && !e.metaKey && !e.altKey ? G.player.hotkeys.indexOf(code) : -1;
  if (slot >= 0) { e.preventDefault(); if (!e.repeat) useHotbarSlot(slot); }
  else if (e.repeat) return;
  else if (key === 'f') toggleFarm();
  else if (key === 'e') interact();
  else if (key === 'c') togglePanel('char');
  else if (key === 'i') togglePanel('inv');
  else if (key === 'k') togglePanel('skills');
  else if (key === 'm') togglePanel('world');
  else if (key === 'q') togglePanel('quest');
  else if (key === 'escape') { hideSkillTip(); cancelHotkeyRebind(false); const p = $('#panel'); if (p) p.remove(); if (dlg) { dlg.remove(); dlg = null; } }
  if (['arrowup','arrowdown','arrowleft','arrowright',' '].includes(key)) e.preventDefault();
});
window.addEventListener('keyup', e => { G.keys[e.key.toLowerCase()] = false; });
window.addEventListener('beforeunload', saveGame);   // don't lose the last few seconds on close/refresh

// inject theme + extra css, run checks, show title
function boot() {
  selfCheck();
  style.textContent = THEME.css + extraCss;
  document.head.appendChild(style);
  if (currentProfile()) showTitle();
  else showSignIn();
}

// Debug handle — inspect/drive the game from the console (and used by the headless smoke test).
if (typeof window !== 'undefined')
  window.__AWO = { G, makePlayer, recompute, loadMap, startQuest, maybeStartPendingQuest, storyPhaseFor, storyPhaseLabel, storyRoadmapHtml, storyShopRankIdx, effectiveShopRankIdx, buildHud, step, render, renderMinimap, updateHud, castSkill, castSkillById, useHotbarSlot, assignItemHotbar, assignSkillHotbar, setHotkeyBinding, resetHotkeys, normaliseHotkeys, hotkeyLabel, hotkeysPanelHtml, skillsPanelHtml, worldChronicleHtml, renderHotbar, openSlotPicker, adminAction, toggleFarm, activateTaskGuide, activateWorldRoute, continueTaskGuide, finishTaskGuide, taskAction, playerBasicAttack, killMonster, gainXp, useItem, equip,interact, learnSkill, learnPassive, canLearnPassive, passiveBonuses, spendStat, resetStatPoints, resetSkillPoints, statPointEntitlement, maybeStartAdvance, startAdvanceQuest, doPromote, checkAdvance, canLearn, skillLevel, skillCapForTier, skillRankGate, skillPointEntitlement, skillPointsSpent, normalisePlayerProgression, statCost, xpForNext, jobXpForNext, togglePanel, panelBody, rollItem, addItem, effAtk, effDef, itemSlot, itemAffixes, compareEquipment, gearStatSnapshot, gearComparisonHtml, gearBuildAdviceHtml, unequip, acceptGuild, requestGuildRevoke, revokeGuild, guildKill, guildTurnIn, claimGuild, finishGuild, refreshGuildBoard, rerollGuildBoard, bountyLevelRange, bountyLevelHtml, checkQuest, makeMonster, monsterStatsFor, heatLevel, buildHeatField, heatDepthAt, respawn, spawnRareBoss, placeRareBoss, checkAchievements, depositItem, withdrawItem, craftItem, doRebirth, autoHuntEligible, autoHuntLevelCap, zoneGuardian, ZONE_ORDER, WORLD_ORDER, genGuildQuest, expGapFactor, combatGapFactor, updateMonsters, stopAutomationOnDeath, playerDeath, dropBias, saveGame, resumeGame, hasSave, readSave, deleteSave, sellItem, sellPrice, buy, refineItem, instName, refineCost, addGuildPoints, guildAllowedDiffs, guildPointsNeed, GUILD_RANKS, rerollShop, shopRollBias, shopPrice, shopStockItem, refineTier, tierOwned, RARITY, setLanguage, onCanvasClick: (wx, wy) => handleClick(wx, wy), findPath, pathTo, DESIGN, PROGRESSION, CONTENT, setCtx: (cv) => { canvas = cv; ctx = cv.getContext('2d'); },
    LPC, playerAnim, drawLpc, monsterAnim, drawPx, drawMonster, PX, selfCheck,
    TILE_PHASES, TILE_PHASE_MS, prefersReducedMotion, buildTile, drawTile, drawTileEdges, drawParallax, buildParallaxStrip };

boot();
