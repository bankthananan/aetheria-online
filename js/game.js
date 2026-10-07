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
import { PAL, PX, ITEM_ICON } from './pixelart.js';
import { RARITY, RARITY_ORDER, AFFIXES, SOCKET_BOUNDS } from './loot.js';
import { LPC } from './lpc.js';
import { buildHeatField, connectedWalkableTiles, heatDepthAt, nextPortalToward, findGridPath, nearestWalkableTile } from './pathing.js';
import { T, currentLang, setLanguage } from './locale.js';
import { SubdungeonSystem } from './systems/subdungeon.js';
import { DifficultySystem } from './systems/difficulty.js';
import { ExplorationSystem } from './systems/exploration.js';
import { RareSpawnsSystem } from './systems/rare-spawns.js';
import { DailiesSystem } from './systems/dailies.js';
import { MasterySystem, MASTERY_RANKS } from './systems/mastery.js';
import * as WhisperingWoods from './zones/whispering-woods/index.js';
import { normalizeFeatures, normalizeExpansion } from './systems/player-features.js';
import { createExpansion } from './expansion-runtime.js';
import { createGameClock } from './systems/game-clock.js';
import { createInputController } from './input.js';
import { computeViewport } from './viewport.js';
import { createEquipmentFeatures } from './equipment-features.js';
import { matchesLoot } from './systems/loot-preferences.js';
import { createGuidance } from './guidance-runtime.js';
import { runSelfCheck } from './selfcheck.js';
import { createTileRenderer } from './render/tiles.js';
import { createCombatFx } from './render/combat-fx.js';
import { createBossMechanics } from './systems/boss-mechanics.js';
import { createGuild } from './systems/guild.js';
import { createEliteSystem } from './systems/elite-monsters.js';
import { drawEliteAura, drawEliteShield, drawMoltenHazards } from './render/elite-fx.js';
import { createRelicSystem } from './systems/relics.js';
import { createWeatherSystem } from './systems/weather.js';
import { createWeatherRenderer } from './render/weather-fx.js';
import { createRuneSystem } from './systems/runes.js';
import { createIncursionSystem, INCURSION_STATES } from './systems/incursions.js';
import { createRiftRenderer } from './render/rift-fx.js';
import { createGatheringSystem } from './systems/gathering.js';
import { createGatheringRenderer } from './render/gathering-fx.js';
import { createCardsSystem, CARD_CATALOG, ZONE_ALBUM_MILESTONES } from './systems/cards.js';
import { createCardsUIRenderer, RARITY_COLORS } from './render/cards-ui.js';
import { createPetsSystem } from './systems/pets.js';
import { createPetsRenderer } from './render/pets-fx.js';
import { createPetsUIRenderer } from './render/pets-ui.js';

const ZONE_PACKAGES = {
  whispering_woods: WhisperingWoods,
};

const TS = 32;                       // tile size in px
let CANVAS_W = 832, CANVAS_H = 576;
let runtimeViewport=null;

// ---- reconciliation between designers' independent id schemes ----
const CLASS_COMBAT = { reborn_blade:'blade', drifter:'berserker', codeweaver:'mage', far_shot:'ranger', lightbringer:'paladin', iron_fist:'monk', stormcaller:'elementalist' };
const MELEE = new Set(['blade','berserker','paladin','monk']);
const MAGIC = new Set(['mage','elementalist']);
const NPC_BY_ROLE = { shop:'npc_shopkeeper', guild:'elder', quest:'npc_guide', story:'npc_storyteller' };
const MAP_MUSIC = {
  town_awakening: 'town_awakening', whispering_woods: 'whispering_woods',
  sunken_ruins: 'sunken_ruins', frostpeak_tundra: 'frostpeak_tundra',
  dragon_caldera: 'dragon_caldera', astral_rift: 'astral_rift',
  celestial_rift: 'celestial_rift',
  ww_goblin_cave: 'ww_goblin_cave',
  ww_elder_hollow: 'ww_elder_hollow',
};
// Celestial Rift: 3 daily mutators, rotating by day-of-year so every player on a
// given calendar day sees the same one. Magnitudes live in DESIGN.tuning.rift.
const RIFT_MUTATORS = [
  { id: 'volcanic_ticks',  name: 'Volcanic Ticks' },
  { id: 'reflective_void', name: 'Reflective Void' },
  { id: 'mana_surge',      name: 'Mana Surge' },
];
const dayOfYear = (d = new Date()) => Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
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
const ITEM_CAT = it => it.type === 'weapon' ? 'Weapons' : (it.type === 'armor' || it.type === 'accessory' || it.type === 'relic') ? 'Armor & Accessories' : it.type === 'potion' ? 'Potions' : it.type === 'reset' ? 'Reset Manuals' : it.type === 'material' ? 'Materials' : 'Quest Items';
const ITEM_CAT_ORDER = { 'Weapons': 0, 'Armor & Accessories': 1, 'Potions': 2, 'Reset Manuals': 3, 'Materials': 4, 'Quest Items': 5 };
const skillsFor = cc => COMBAT.skills.filter(s => s.classId === cc);
// equipment slots (paper-doll). Item's slot comes from `itemSlot()`.
const EQUIP_SLOTS = ['weapon', 'head', 'body', 'hands', 'cloak', 'feet', 'accessory', 'relic'];
const SLOT_LABEL = { weapon: 'Weapon', head: 'Head', body: 'Body', hands: 'Hands', cloak: 'Cloak', feet: 'Feet', accessory: 'Accessory', relic: 'Relic' };
const SLOT_ICON = { weapon: 'sword', head: 'helm', body: 'plate', hands: 'gloves', cloak: 'cloak', feet: 'boots', accessory: 'ring', relic: 'core' };
const itemSlot = it => it.type === 'weapon' ? 'weapon' : it.type === 'accessory' ? 'accessory' : it.type === 'relic' ? 'relic' : (it.slot || 'body');

// ---- compile formula strings (strict mode: no `with`, so destructure a scope) ----
const VARS = ['baseHp','vit','level','int','str','dex','weaponAtk','armorDef','agi','luk','attackerAtk','defenderDef','isCrit'];
const compile = expr => new Function('a', `const {${VARS.join(',')}}=a; return (${expr});`);
const F = Object.fromEntries(Object.entries(DESIGN.formulas).map(([k, e]) => [k, compile(e)]));
const xpForNext = new Function('level', `return (${DESIGN.xpCurve});`);
const jobXpForNext = new Function('level', `return (${DESIGN.jobXpCurve});`);

// ---- tiny helpers ----
const $ = sel => document.querySelector(sel);
const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
const gameClock = createGameClock();
const now = () => gameClock.now();
const eliteSystem = createEliteSystem({
  rnd: () => Math.random(),
  now,
  dist: (x1, y1, x2, y2) => Math.hypot(x1 - x2, y1 - y2),
  TS,
});
const relicSystem = createRelicSystem({
  now,
  dist: (x1, y1, x2, y2) => Math.hypot(x1 - x2, y1 - y2),
  TS,
  rnd: () => Math.random(),
});
const weatherSystem = createWeatherSystem({
  now,
  rnd: () => Math.random(),
});
const runeSystem = createRuneSystem();
const incursionSystem = createIncursionSystem({
  now,
  rnd: () => Math.random(),
});
const riftRenderer = createRiftRenderer({ T });
const gatheringSystem = createGatheringSystem({
  now,
  rnd: () => Math.random(),
});
const gatheringRenderer = createGatheringRenderer({ T });
const cardsSystem = createCardsSystem({
  now,
  rnd: () => Math.random(),
});
const cardsUI = createCardsUIRenderer({ T });
const petsSystem = createPetsSystem({
  now,
  rnd: () => Math.random(),
});
const petsFx = createPetsRenderer({ T, PX });
const petsUI = createPetsUIRenderer({ T });
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
const isEquip = itemId => ['weapon', 'armor', 'accessory', 'relic'].includes(itemById[itemId]?.type);
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
  const [sMin, sMax] = SOCKET_BOUNDS[rarity] || [0, 0];
  const sockets = Array(sMax > 0 ? rndInt(sMin, sMax) : 0).fill(null);
  return { itemId, uid: ++_uid, rarity, affixes, plus: 0, sockets };
}
// loot bias grows with the monster's rolled level, the hero's LUK, and guild rank.
const dropBias = (m, p) => (m.lvl || m.def.level) * TUNING.dropLevelBias + (m.def.sizeTiles >= 2 ? 3 : 0) + (p?.stats?.luk || 0) * TUNING.dropLuckBias + (G.guildRankIdx || 0) * 0.15;
const itemRarity = inst => RARITY[inst?.rarity] || RARITY.common;
const itemAffixes = inst => Array.isArray(inst?.affixes) ? inst.affixes : [];
const refineMult = inst => 1 + TUNING.refine.atkPerPlus * (inst.plus || 0);
const effAtk = inst => inst ? Math.round((itemById[inst.itemId].atk || 0) * itemRarity(inst).mult * refineMult(inst)) : 0;
const effDef = inst => inst ? Math.round((itemById[inst.itemId].def || 0) * itemRarity(inst).mult * refineMult(inst)) : 0;
const instName = inst => (inst.plus ? `+${inst.plus} ` : '') + T(itemById[inst.itemId].name, 'items');
// display icon honors a cosmetic transmog override; base stats never look at it.
const dispItemId = inst => inst?.transmogItemId || inst?.itemId;

// ---- rune sockets (Phase 3.3): gem materials slotted into rare+ gear ----
// ponytail: no affix extraction/rerolling — sockets are a separate, simpler
// bonus channel that just joins the same equipment stacking layer as affixes.
function socketStats(inst) {
  const acc = {};
  if (!inst || !Array.isArray(inst.sockets)) return acc;
  for (const gid of inst.sockets) {
    const g = gid && itemById[gid]?.gem; if (!g) continue;
    acc[g.stat] = (acc[g.stat] || 0) + g.value;
  }
  // set bonus: all sockets on this item hold the same gem
  if (inst.sockets.length >= 3 && inst.sockets.every(gid => gid && gid === inst.sockets[0])) {
    const g = itemById[inst.sockets[0]].gem;
    acc[g.stat] += Math.round(g.value * TUNING.gemSetBonusMult);
  }
  return acc;
}
function findGearInstance(uid) {
  const p = G.player, u = +uid;
  for (const slot of EQUIP_SLOTS) if (p.equip[slot]?.uid === u) return p.equip[slot];
  return p.inventory.find(e => e.uid === u) || null;
}
function socketGem(uid, idx, gemItemId) {
  const inst = findGearInstance(uid);
  if (!inst || !Array.isArray(inst.sockets) || idx < 0 || idx >= inst.sockets.length) return false;
  if (inst.sockets[idx]) return false;                    // already filled
  if (itemById[gemItemId]?.type === 'card') {
    const slot = itemSlot(itemById[inst.itemId]) || itemById[inst.itemId]?.type;
    const cardCheck = cardsSystem.canSocketCard({ ...inst, slot }, gemItemId, idx);
    if (!cardCheck.canSocket || itemQty(gemItemId) < 1) return false;
    removeItem(gemItemId, 1);
    inst.sockets[idx] = gemItemId;
    cardsSystem.recordCardAcquired(G.bestiary, gemItemId);
    recompute(G.player);
    saveGame();
    return true;
  }
  if (!itemById[gemItemId]?.gem || itemQty(gemItemId) < 1) return false;
  removeItem(gemItemId, 1);
  inst.sockets[idx] = gemItemId;
  recompute(G.player);
  saveGame();
  return true;
}
// cosmetic-only: swap the rendered icon/name to another owned same-slot item.
function transmogItem(uid, newItemId) {
  const inst = findGearInstance(uid); if (!inst) return false;
  const slot = itemSlot(itemById[inst.itemId]);
  if (newItemId && (!itemById[newItemId] || itemSlot(itemById[newItemId]) !== slot)) return false;
  inst.transmogItemId = newItemId || null;
  saveGame();
  return true;
}
const GEM_DOT_COLOR = { atkPct: '#e2695f', hpFlat: '#4a90d9', defPct: '#5fbf7a' };
const RUNE_DOT_COLOR = { fire: '#ff6b4a', ice: '#64c8ff', lightning: '#ffd24d', nature: '#66dd66', holy: '#fff080', void: '#ba68c8' };
function socketDotsHtml(inst) {
  if (!inst?.sockets?.length) return '';
  const dots = inst.sockets.map((gid, i) => {
    const gem = gid && itemById[gid]?.gem;
    const cardDef = gid && cardsSystem.getCardDef(gid);
    const color = gem ? (gem.isRune ? (RUNE_DOT_COLOR[gem.element] || '#ffd24d') : (GEM_DOT_COLOR[gem.stat] || '#888'))
      : cardDef ? (RARITY_COLORS[cardDef.rarity] || '#ffd54f')
      : 'transparent';
    const title = esc(gem ? T(itemById[gid].name, 'items') : cardDef ? T(cardDef.name, 'items') : T('Empty socket', 'ui'));
    const pick = (!gem && !cardDef) ? ` data-socket-slot="${inst.uid}:${i}"` : '';
    return `<i${pick} title="${title}" style="width:8px;height:8px;border-radius:50%;display:inline-block;margin-right:3px;border:1px solid ${gem || cardDef ? color : 'var(--text-muted)'};background:${color};${pick ? 'cursor:pointer' : ''}"></i>`;
  }).join('');
  return `<span class="gear-sockets" style="display:inline-flex;align-items:center;margin-left:4px;vertical-align:middle">${dots}</span>`;
}
function equippedAffixes(p) {
  const acc = { atkPct: 0, critPct: 0, hpFlat: 0, mpFlat: 0, defPct: 0, lifesteal: 0, hitFlat: 0, fleeFlat: 0 };
  for (const s of EQUIP_SLOTS) {
    for (const a of itemAffixes(p.equip[s])) acc[a.stat] = (acc[a.stat] || 0) + a.value;
    const sb = socketStats(p.equip[s]);
    for (const stat in sb) acc[stat] = (acc[stat] || 0) + sb[stat];
  }
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
  return runSelfCheck({ CLASS_COMBAT, DIFFICULTY, F, GUILD_RANKS, ITEM_ICON, NPC_BY_ROLE, REFINE_FRAG, SLOT_ICON, ZONE_ORDER,
    advancedJobConfig, chance, itemById, itemDropSource, jobBranchConfig, jobXpForNext, monById,
    npcById, questById, questSuccessorIds, skillsFor, xpForNext, zoneGuardian });
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
  audioVolumes: { master: 1.0, music: 0.8, sfx: 1.0 },
  highContrast: false,  // Settings > Accessibility: hc-mode body class + high-contrast damage palette
  seenMonsters: new Set(),     // Collection Book: monster ids ever encountered/killed
  collectedItems: new Set(),   // Collection Book: equipment ids ever obtained
  claimedMilestones: new Set(),// Collection Book: milestone ids whose reward was claimed
  target: null,
  targetSource: null,   // hunt | retaliate | manual; preserves deliberate high-level challenges
  effects: [],          // transient attack/spell visuals
  floaties: [],         // canvas damage-number entries {x,y,text,kind,born}
  path: null,           // [{x,y}] pixel waypoints for click-to-move (A* routed)
  manualIntent: null,   // explicit click action: finish moving/talking before Hunt reacquires
  quest: null,          // active quest id
  pendingQuest: null,   // next story quest waiting for its Base Level gate
  advance: null,        // active class-advancement quest {ti, def, progress}
  jobChoiceOpen: false, // full-screen second-job decision freezes the combat simulation
  killCounts: {},       // monsterId -> kills (for kill quests)
  lastPortalAt: 0,
  running: false,
  muted: false,
  won: false,
  autoFarm: false,      // auto-target & attack nearby non-boss monsters
  huntTargetId: null,   // focused task hunting ignores every other monster type
  taskGuide: null,      // active tracker navigation across maps / to NPCs
  autoConfig: { skills: true, heal: true, potions: true, profile: 'balanced' },
  autoState: { phase: 'idle', label: 'Automation ready', detail: 'Track a task or enable Hunt.' },
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
  rift: { floor: 0, active: false, best: 0, mutatorId: null, nextBurnAt: 0 }, // Celestial Rift run state
  dungeonState: SubdungeonSystem.createDefaultState(),
  exploration: ExplorationSystem.createDefaultState(),
  rareSpawns: RareSpawnsSystem.createDefaultState(),
  dailies: DailiesSystem.createDefaultState(),
  mastery: MasterySystem.createDefaultState(),
  zoneDifficulty: { whispering_woods: 'normal' },
  weather: null,
  bestiary: cardsSystem.deserialize(null),
  cardsSystem,
  cardsUI,
  pets: petsSystem.deserialize(null),
  petsSystem,
  petsFx,
  petsUI,
  petFollower: null,
  saveStatus: 'saved',
};

function syncPetFollower() {
  if (G.pets?.activePetId && G.pets?.owned?.[G.pets.activePetId]) {
    const activePet = G.pets.owned[G.pets.activePetId];
    if (!G.petFollower || G.petFollower.id !== activePet.id) {
      G.petFollower = petsFx.createFollowerEntity(activePet.id, G.player?.x || 0, G.player?.y || 0);
    }
    if (G.petFollower) {
      G.petFollower.devoted = ((activePet.loyalty || 0) >= 80);
    }
  } else {
    G.petFollower = null;
  }
}
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
    className: tiers[0].name, tierIndex: 0, jobBranchId: null, advancedJobId: null, level: 1, xp: 0,
    jobLevel: 1, jobXp: 0,     // finite RO-style job track; every level through the cap grants 1 point
    rebirths: 0,               // NG+ count — permanent stat/HP/MP bonuses scale with it
    zeny: 50,
    features: normalizeFeatures(),
    inventory: [{ itemId: 'minor_potion', qty: 3 }],
    equip: { weapon: null, head: null, body: null, hands: null, cloak: null, feet: null, accessory: null, relic: null },
    bloodShield: 0,
    lifesteal: 0,
    x: 0, y: 0, facing: { x: 0, y: 1 },
    hp: 1, mp: 1,
    attackCdUntil: 0, skillCd: {}, buffs: [], momentum: 0, lastSkillAt: 0,
    stamina: DESIGN.tuning.stamina.max, invulnUntil: 0, parryUntil: 0, imbue: null,
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

// A base calling owns two permanent second-job branches. Skills and art still
// use combatClass, while the selected branch overlays titles, stat bonuses,
// and one exclusive signature skill. Old tiered saves fall back to defaultId.
const jobBranchesFor = classId => PROGRESSION.jobBranches?.[classId]?.choices || [];
const jobBranchConfig = classId => PROGRESSION.jobBranches?.[classId] || null;
function jobBranchFor(p, allowDefault = (p?.tierIndex || 0) > 0) {
  const cfg = jobBranchConfig(p?.classId);
  if (!cfg) return null;
  const selected = cfg.choices.find(branch => branch.id === p.jobBranchId);
  return selected || (allowDefault ? cfg.choices.find(branch => branch.id === cfg.defaultId) || cfg.choices[0] : null);
}
function tierForPlayer(p, ti = p?.tierIndex || 0, allowDefault = (p?.tierIndex || 0) >= ti) {
  const base = PROGRESSION.tiers[p?.classId]?.[ti] || null;
  if (!base || ti === 0) return base;
  if (ti === 2) {
    const advanced = advancedJobFor(p, allowDefault);
    if (advanced) return { ...base, ...advanced, name: advanced.name };
    const branch = jobBranchFor(p, false);
    return branch?.tiers?.[2] ? { ...base, ...branch.tiers[2] } : base;
  }
  const branch = jobBranchFor(p, allowDefault);
  return branch?.tiers?.[ti] ? { ...base, ...branch.tiers[ti], advance: branch.tiers[ti].advance || base.advance } : base;
}

// ---- Third-job (advanced job) helpers — independent of second-job branch. ----
const advancedJobsFor = classId => PROGRESSION.advancedJobs?.[classId]?.choices || [];
const advancedJobConfig = classId => PROGRESSION.advancedJobs?.[classId] || null;
function advancedJobFor(p, allowDefault = (p?.tierIndex || 0) >= 2) {
  const cfg = advancedJobConfig(p?.classId);
  if (!cfg) return null;
  const selected = cfg.choices.find(job => job.id === p.advancedJobId);
  return selected || (allowDefault ? cfg.choices.find(job => job.id === cfg.defaultId) || cfg.choices[0] : null);
}
function activeJobLevelCap(p) {
  const caps = PROGRESSION.jobLevelCaps;
  return caps[Math.max(0, Math.min(p?.tierIndex || 0, caps.length - 1))];
}
function chooseAdvancedJob(advancedJobId, p = G.player) {
  const cfg = advancedJobConfig(p?.classId);
  if (!cfg) return false;
  const job = cfg.choices.find(j => j.id === advancedJobId);
  if (!job || p.tierIndex !== 1 || p.advancedJobId) return false;
  if (!G.advance || G.advance.ti !== 2 || advanceProgress() < G.advance.def.objective.count) return false;
  p.advancedJobId = job.id;
  p.tierIndex = 2;
  p.className = job.name;
  p.skillPoints += PROGRESSION.skillPointsPerLevel * 2; // promotion skill-point bonus
  if (G.taskGuide?.source === 'advance') finishTaskGuide();
  G.advance = null;
  recompute(p, true);
  const chooser = typeof document !== 'undefined' ? document.getElementById('job-choice') : null;
  if (chooser?.remove) chooser.remove();
  G.jobChoiceOpen = false;
  updateQuestTracker(); updateHud(); renderHotbar(); refreshPanel('char'); refreshPanel('skills'); refreshPanel('quest'); saveGame();
  return true;
}
function normaliseAdvancedJob(p) {
  const cfg = advancedJobConfig(p?.classId);
  if (!cfg) { p.advancedJobId = null; return p; }
  if ((p.tierIndex || 0) < 2) { p.advancedJobId = null; return p; }
  const valid = cfg.choices.find(job => job.id === p.advancedJobId);
  if (!valid) {
    const byTitle = cfg.choices.find(job => job.name === p.className);
    p.advancedJobId = (byTitle || cfg.choices.find(job => job.id === cfg.defaultId) || cfg.choices[0]).id;
  }
  return p;
}
function branchAllowsSkill(p, id) {
  const required = PROGRESSION.skillTree[id]?.reqBranch;
  return !required || required === p?.jobBranchId;
}
function advancedJobAllowsSkill(p, id) {
  const required = PROGRESSION.skillTree[id]?.reqAdvancedJob;
  return !required || required === p?.advancedJobId;
}
function advancedJobAllowsPassive(p, id) {
  const required = PROGRESSION.passives[id]?.reqAdvancedJob;
  return !required || required === p?.advancedJobId;
}
// ---- branch identity mechanics: one small dispatcher per kind, magnitudes from
// DESIGN.jobBranchBalance.mechanic so every branch is tuned from one table. ----
function branchMechanic(p) { return jobBranchFor(p, false)?.mechanic || null; }
// pre-damage: consumes one of the target's allowed statuses for bonus damage (branch-gated detonate)
function branchDetonateBonus(p, sk, t, dmg) {
  const mech = branchMechanic(p);
  if (!mech || mech.kind !== 'detonateAmp' || mech.triggerSkillId !== sk.id) return dmg;
  const key = (mech.statuses || []).find(id => t.statuses?.[id]?.until > now());
  if (!key) return dmg;
  delete t.statuses[key];
  return Math.round(dmg * (1 + DESIGN.jobBranchBalance.mechanic.detonateAmp.extraPct));
}
// per-target: extends the status the trigger skill just applied
function extendBranchStatus(p, sk, target) {
  const mech = branchMechanic(p);
  if (!mech || mech.kind !== 'extendStatus' || mech.triggerSkillId !== sk.id) return;
  const st = target?.statuses?.[sk.effect];
  if (st) st.until += DESIGN.jobBranchBalance.mechanic.extendStatus.extraMs;
}
// once per cast/hit: heal / cooldown-reduce / bonus-buff kinds
function procBranchMechanic(p, sk, { dmg = 0 } = {}) {
  const mech = branchMechanic(p);
  if (!mech || mech.triggerSkillId !== sk.id) return;
  if (mech.kind === 'procHeal') {
    const heal = Math.round(dmg * DESIGN.jobBranchBalance.mechanic.procHeal.pct);
    if (heal > 0) { p.hp = clamp(p.hp + heal, 0, p.maxHp); floatText(p.x, p.y, '+' + heal, 'heal'); }
  } else if (mech.kind === 'procCdr') {
    const cur = p.skillCd[mech.targetSkillId] || 0;
    p.skillCd[mech.targetSkillId] = Math.max(now(), cur - DESIGN.jobBranchBalance.mechanic.procCdr.ms);
  } else if (mech.kind === 'bonusBuff') {
    const cfg = DESIGN.jobBranchBalance.mechanic.bonusBuff;
    p.buffs.push({ stat: mech.stat, mult: 1 + cfg.mult, until: now() + cfg.durationMs, sourceSkillId: 'branch:' + p.jobBranchId });
  }
}
function normaliseJobBranch(p) {
  const cfg = jobBranchConfig(p?.classId);
  if (!cfg) { p.jobBranchId = null; return p; }
  const valid = cfg.choices.find(branch => branch.id === p.jobBranchId);
  if ((p.tierIndex || 0) <= 0) p.jobBranchId = null;
  else if (!valid) {
    const named = cfg.choices.find(branch => Object.values(branch.tiers || {}).some(tier => tier.name === p.className));
    p.jobBranchId = (named || cfg.choices.find(branch => branch.id === cfg.defaultId) || cfg.choices[0])?.id || null;
  }
  const tier = tierForPlayer(p, 1);
  if ((p.tierIndex || 0) === 1 && tier?.name) p.className = tier.name;
  for (const [id, node] of Object.entries(PROGRESSION.skillTree)) {
    if (!node.reqBranch || branchAllowsSkill(p, id)) continue;
    delete p.skillLevels?.[id];
    if (Array.isArray(p.hotbar)) p.hotbar = p.hotbar.map(slot => slot?.type === 'skill' && slot.id === id ? null : slot);
  }
  return p;
}

// derived stat = class base+growth + spent points + accumulated tier bonuses
function tierBonusFor(p) {
  const acc = {};
  for (let i = 1; i <= p.tierIndex; i++)
    for (const [k, v] of Object.entries(tierForPlayer(p, i)?.bonus || {})) acc[k] = (acc[k] || 0) + v;
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
// Ascension-style preview: a second-job (tierIndex 1) player may spend one skill
// point on a single Tier-2 (reqTier 2) skill or passive before their mastery
// trial clears, capped at rank 1. Only one such node may be held at a time —
// the slot is derived from skillLevels (no extra save state needed): any node
// gated above the player's current tier that already has a level IS the pick.
function previewSlotUsedBy(p) {
  const activeHit = Object.entries(PROGRESSION.skillTree).find(([id, n]) => (n.reqTier || 0) > p.tierIndex && skillLevel(p, id) > 0);
  if (activeHit) return activeHit[0];
  const passiveHit = Object.entries(PROGRESSION.passives).find(([id, pa]) => (pa.reqTier || 0) > p.tierIndex && skillLevel(p, id) > 0);
  return passiveHit ? passiveHit[0] : null;
}
function canPreview(p, id, reqTier) {
  if (p.tierIndex !== 1 || reqTier !== 2) return false;   // scoped to the Lv15→40 second-job plateau only
  const used = previewSlotUsedBy(p);
  return !used || used === id;
}
function previewSlotName(id) {
  const s = COMBAT.skills.find(x => x.id === id);
  return s ? T(s.name, 'skills') : T(PROGRESSION.passives[id]?.name || id, 'passives');
}
function hybridJobAllowsSkill(p, id) {
  const node = PROGRESSION.skillTree[id];
  if (!node || !node.reqHybridJob) return true;
  return p.hybridJobId === node.reqHybridJob;
}
function canLearn(p, id) {
  const node = PROGRESSION.skillTree[id]; if (!node) return false;
  if (!branchAllowsSkill(p, id)) return false;
  if (!advancedJobAllowsSkill(p, id)) return false;
  if (!hybridJobAllowsSkill(p, id)) return false;
  if (skillLevel(p, id) >= node.maxLevel) return false;
  const gate = skillRankGate(p, id);
  if (p.skillPoints < 1 || (p.jobLevel || p.level) < gate.reqLevel) return false;
  if (p.tierIndex < gate.reqTier && !(gate.nextRank === 1 && canPreview(p, id, gate.reqTier))) return false;
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
  if (!advancedJobAllowsPassive(p, id)) return false;
  const lv = p.skillLevels[id] || 0, reqTier = pa.reqTier || 0;
  if (lv >= pa.maxLevel || p.skillPoints < 1 || (p.jobLevel || p.level) < pa.reqLevel) return false;
  return p.tierIndex >= reqTier || (lv === 0 && canPreview(p, id, reqTier));
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
  p.jobXp = p.jobLevel >= activeJobLevelCap(p) ? 0 : Math.max(0, Number(p.jobXp) || 0);
  p.skillLevels = p.skillLevels && typeof p.skillLevels === 'object' ? p.skillLevels : {};
  for (const [id, raw] of Object.entries(p.skillLevels)) {
    const max = PROGRESSION.skillTree[id]?.maxLevel || PROGRESSION.passives[id]?.maxLevel;
    if (!max) delete p.skillLevels[id];
    else p.skillLevels[id] = Math.min(Math.max(Math.floor(Number(raw) || 0), 0), max);
  }
  normaliseJobBranch(p);
  normaliseAdvancedJob(p);
  if ((p.tierIndex || 0) >= 2) {
    const finalTier = tierForPlayer(p, 2);
    if (finalTier?.name) p.className = finalTier.name;
  }
  // Third-job-exclusive ranks from legacy or malformed saves are refunded
  // instead of silently deleting earned points.
  for (const [id, raw] of Object.entries(p.skillLevels)) {
    const required = PROGRESSION.skillTree[id]?.reqAdvancedJob || PROGRESSION.passives[id]?.reqAdvancedJob;
    if (required && required !== p.advancedJobId) {
      const refund = Math.max(0, Math.floor(Number(raw) || 0));
      if (refund) p.skillPoints = (p.skillPoints || 0) + refund;
      delete p.skillLevels[id];
      if (Array.isArray(p.hotbar)) p.hotbar = p.hotbar.map(slot => slot?.type === 'skill' && slot.id === id ? null : slot);
      if (p.skillCd) delete p.skillCd[id];
    }
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
  const next = tierForPlayer(p, p.tierIndex + 1);   // branch-aware: picks up a chosen branch's own Tier-2 mastery trial
  if (!next || !next.advance || G.advance || p.level < next.reqLevel) return;
  if (next.isHybrid) {
     const hybridKey = Object.keys(PROGRESSION.hybridJobs).find(k => next.name.includes(PROGRESSION.hybridJobs[k].name));
     if (hybridKey) {
        const req = PROGRESSION.hybridJobs[hybridKey].requires;
        const hasReqs = req.every(r => (p.pastLives || []).includes(r) || p.classId === r);
        if (!hasReqs) return; // lacking past lives
     }
  }
  startAdvanceQuest(p.tierIndex + 1);
}
function startAdvanceQuest(ti) {
  const q = tierForPlayer(G.player, ti).advance;
  G.advance = { ti, def: q, progress: 0 };
  AUDIO.playSfx('levelup');
  toast(`✦ Job Change available: ${q.name}!`, 'good');
  logMsg(`✦ Class advancement quest started: ${q.name} — ${q.desc}`, 'good');
  updateQuestTracker();
}
function statBonusText(bonus = {}) {
  return Object.entries(bonus).map(([stat, value]) => `+${value} ${stat.toUpperCase()}`).join(' · ');
}
function jobChoicePanelHtml(p = G.player) {
  const branches = jobBranchesFor(p?.classId);
  const cards = branches.map((branch, index) => {
    const second = branch.tiers?.[1], advanced = branch.tiers?.[2];
    const skill = COMBAT.skills.find(entry => entry.id === branch.signatureSkillId);
    return `<button class="job-choice-card" data-job-branch="${esc(branch.id)}" style="--path-color:${branch.color || '#e6bd54'}">
      <span class="job-choice-no">0${index + 1}</span><small>${T(branch.role || 'SECOND JOB', 'ui')}</small>
      <b>${esc(T(second?.name || branch.label, 'classes'))}</b>
      <em>${esc(T(branch.focus || '', 'ui'))}</em>
      <span class="job-choice-stats">${esc(statBonusText(second?.bonus))}</span>
      <span class="job-choice-skill">✦ ${T('Signature', 'ui')}: <strong>${esc(T(skill?.name || branch.signatureSkillId, 'skills'))}</strong><i>${esc(T(skill?.flavor || '', 'skills'))}</i></span>
      <span class="job-choice-future">Lv 40 → ${esc(T(advanced?.name || '', 'classes'))} · ${esc(statBonusText(advanced?.bonus))}</span>
      <span class="job-choice-pick">${T('CHOOSE THIS PATH', 'ui')}</span>
    </button>`;
  }).join('');
  return `<section class="job-choice-shell"><header><small>${T('TRIAL COMPLETE · SECOND JOB', 'ui')}</small><h2>${T('Choose your specialization', 'ui')}</h2><p>${T('This choice is permanent until rebirth. Both paths use the same total promotion stat budget.', 'ui')}</p></header><div class="job-choice-grid">${cards}</div></section>`;
}
function showJobChoice(p = G.player) {
  if (!p || typeof document === 'undefined' || typeof HTMLElement === 'undefined') return false;
  let box = document.getElementById('job-choice');
  if (box) { box.remove(); }
  box = document.createElement('div');
  box.id = 'job-choice'; box.className = 'job-choice-overlay';
  box.innerHTML = jobChoicePanelHtml(p);
  box.querySelectorAll('[data-job-branch]').forEach(button => button.onclick = () => { chooseJobBranch(button.dataset.jobBranch, p); if (box) box.remove(); G.jobChoiceOpen = false; });
  ($('#overlays') || document.body).appendChild(box);
  G.jobChoiceOpen = true;
  return true;
}
function advanceProgress() {
  if (!G.advance) return 0;
  const o = G.advance.def.objective;
  return o.type === 'collect' ? Math.min(itemQty(o.target), o.count) : Math.min(G.advance.progress, o.count);
}
function checkAdvance() {
  if (!G.advance) return;
  updateQuestTracker();
  if (advanceProgress() < G.advance.def.objective.count) return;
  if (G.advance.ti === 1 && !G.player.jobBranchId) {
    if (!G.advance.choiceReady) {
      G.advance.choiceReady = true;
      if (G.taskGuide?.source === 'advance') finishTaskGuide();
      AUDIO.playSfx('levelup');
      toast(`✦ Trial complete — choose your second job!`, 'good');
      logMsg(`✦ Your calling now branches. Choose one path; rebirth is the only way to choose again.`, 'good');
    }
    showJobChoice(G.player);
    updateQuestTracker();
    return;
  }
  if (G.advance.ti === 2 && !G.player.advancedJobId) {
    if (!G.advance.choiceReady) {
      G.advance.choiceReady = true;
      if (G.taskGuide?.source === 'advance') finishTaskGuide();
      AUDIO.playSfx('levelup');
      toast(`✦ Trial complete — choose your third job!`, 'good');
      logMsg(`✦ Your calling now branches into final paths. Choose one path; rebirth is the only way to choose again.`, 'good');
    }
    showAdvancedJobChoice(G.player);
    updateQuestTracker();
    return;
  }
  doPromote(G.player, G.advance.ti);
}
function chooseJobBranch(branchId, p = G.player) {
  const branch = jobBranchesFor(p?.classId).find(choice => choice.id === branchId);
  if (!branch || p.tierIndex !== 0 || p.jobBranchId) return false;
  if (!G.advance || G.advance.ti !== 1 || advanceProgress() < G.advance.def.objective.count) return false;
  return doPromote(p, 1, branchId);
}
function advancedJobChoicePanelHtml(p) {
  const cfg = advancedJobConfig(p?.classId);
  if (!cfg) return '';
  const cards = cfg.choices.map((job, index) => {
    return `<button class="job-choice-card" data-advanced-job="${esc(job.id)}" style="--path-color:${job.color || '#e6bd54'}">
      <span class="job-choice-no">0${index + 1}</span><small>${T(job.role || 'THIRD JOB', 'ui')}</small>
      <b>${esc(T(job.name, 'classes'))}</b>
      <em>${esc(T(job.focus || '', 'ui'))}</em>
      <span class="job-choice-stats">${esc(statBonusText(job.bonus))}</span>
      <span class="job-choice-pick">${T('CHOOSE THIS PATH', 'ui')}</span>
    </button>`;
  }).join('');
  return `<section class="job-choice-shell"><header><small>${T('TRIAL COMPLETE · THIRD JOB', 'ui')}</small><h2>${T('Choose your final evolution', 'ui')}</h2><p>${T('This choice is permanent until rebirth. Both paths use the same total promotion stat budget.', 'ui')}</p></header><div class="job-choice-grid">${cards}</div></section>`;
}
function showAdvancedJobChoice(p = G.player) {
  if (!p || typeof document === 'undefined' || typeof HTMLElement === 'undefined') return false;
  let box = document.getElementById('job-choice');
  if (box) { box.remove(); }
  box = document.createElement('div');
  box.id = 'job-choice'; box.className = 'job-choice-overlay';
  box.innerHTML = advancedJobChoicePanelHtml(p);
  box.querySelectorAll('[data-advanced-job]').forEach(button => button.onclick = () => {
    chooseAdvancedJob(button.dataset.advancedJob, p);
    if (box) box.remove();
    G.jobChoiceOpen = false;
  });
  ($('#overlays') || document.body).appendChild(box);
  G.jobChoiceOpen = true;
  return true;
}
function doPromote(p, ti, branchId = p.jobBranchId) {
  const t = PROGRESSION.tiers[p.classId];
  if (!t || ti < 0 || ti >= t.length) return false;
  if (ti === 1 && branchId) {
    const branch = jobBranchesFor(p.classId).find(choice => choice.id === branchId);
    if (!branch) { showJobChoice(p); return false; }
    p.jobBranchId = branch.id;
    p.tierIndex = 1;
    p.className = branch.tiers[1].name;
    p.skillPoints += PROGRESSION.skillPointsPerLevel * 2; // promotion skill-point bonus
    recompute(p, true);
    toast(T('Advanced calling unlocked! Specialization bonus applied.', 'ui'), 'good');
    logMsg(`✦ Promoted to Tier 1: [${branch.role}] ${branch.tiers[1].name}. Specialization bonus applied.`, 'good');
    AUDIO.playSfx('levelup');
  } else if (ti === 2) {
    // Stage Tier-2 base advance or choices. If advancedJobId is set, promote directly.
    if (!p.advancedJobId && G.advance?.ti === 2) {
      if (advanceProgress() < G.advance.def.objective.count) return false;
      showAdvancedJobChoice(p);
      return false;
    }
    const job = advancedJobFor(p, true);
    p.advancedJobId = job.id;
    p.tierIndex = 2;
    p.className = job.name;
    p.skillPoints += PROGRESSION.skillPointsPerLevel * 2; // promotion skill-point bonus
    recompute(p, true);
    toast(T('Advanced calling unlocked! Evolution bonus applied.', 'ui'), 'good');
    logMsg(`✦ Promoted to Tier 2: [${job.role}] ${job.name}. Evolution bonus applied.`, 'good');
    AUDIO.playSfx('levelup');
  } else if (ti === 3) {
    const jobKey = Object.keys(PROGRESSION.hybridJobs).find(k => t[3].name.includes(PROGRESSION.hybridJobs[k].name));
    const job = PROGRESSION.hybridJobs[jobKey];
    p.hybridJobId = job.id;
    p.tierIndex = 3;
    p.className = job.name;
    p.skillPoints += PROGRESSION.skillPointsPerLevel * 3; // promotion skill-point bonus
    recompute(p, true);
    toast(T('Hybrid Calling unlocked! The cycle completes.', 'ui'), 'good');
    logMsg(`✦ Promoted to Tier 4: [${job.role}] ${job.name}. Hybrid bonus applied.`, 'good');
    AUDIO.playSfx('levelup');
  }
  G.advance = null;
  updateHud(); renderHotbar(); refreshPanel('char'); refreshPanel('skills'); refreshPanel('quest'); saveGame();
  return true;
}
function equippedItem(p, slot) { return p.equip[slot] ? itemById[p.equip[slot].itemId] : null; }

function buffMult(p, stat) {
  let m = 1;
  for (const b of (p.buffs || [])) if (b.until > now() && (b.stat === stat || b.stat === 'all')) m *= (b.mult || 1);
  return m;
}

function buffFlat(p, stat) {
  let f = 0;
  for (const b of (p.buffs || [])) if (b.until > now() && b.stat === stat) f += (b.flat || 0);
  return f;
}

function recompute(p, fill) {
  const st = statBlock(p);
  p.stats = st;
  const weaponAtk = effAtk(p.equip.weapon) + effAtk(p.equip.accessory) + effAtk(p.equip.relic);   // rarity-scaled
  const armorDef = ['head', 'body', 'hands', 'cloak', 'feet', 'accessory', 'relic'].reduce((s, k) => s + effDef(p.equip[k]), 0);
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
  const relicMods = relicSystem.getPassiveModifiers(p);
  const weatherMods = weatherSystem.getCombatModifiers(G?.mapId);
  const runeMods = runeSystem.getRuneCombatModifiers(p.equip, itemById);
  // Cards: socketed cards stat modifiers & bestiary collection milestones
  const cardMods = {};
  if (p.equip) {
    for (const slot of Object.keys(p.equip)) {
      const inst = p.equip[slot];
      if (inst && Array.isArray(inst.sockets)) {
        for (const cardId of inst.sockets) {
          if (!cardId) continue;
          const cDef = cardsSystem.getCardDef(cardId);
          if (cDef?.statMods) {
            for (const [k, v] of Object.entries(cDef.statMods)) {
              cardMods[k] = (cardMods[k] || 0) + v;
            }
          }
        }
      }
    }
  }
  const milestoneBonuses = cardsSystem.calculateCollectionBonuses(G?.bestiary);
  for (const [k, v] of Object.entries(milestoneBonuses)) {
    cardMods[k] = (cardMods[k] || 0) + v;
  }
  p.maxHp = Math.round((Math.round(p.maxHp * (1 + (ps.hpPct + relicMods.hpPct) / 100)) + (runeMods.hpFlat || 0) + (cardMods.maxHp || 0) + buffFlat(p, 'hp')) * buffMult(p, 'hp'));
  p.maxMp = Math.round((Math.round(p.maxMp * (1 + ps.mpPct / 100)) + (cardMods.maxMp || 0) + buffFlat(p, 'mp')) * buffMult(p, 'mp'));
  p.physAtk = Math.round(p.physAtk * (1 + ps.atkPct / 100)) + (cardMods.physAtk || 0) + buffFlat(p, 'atk');
  p.rangedAtk = Math.round(p.rangedAtk * (1 + ps.atkPct / 100)) + (cardMods.physAtk || 0) + buffFlat(p, 'atk');
  p.magicAtk = Math.round(p.magicAtk * (1 + (ps.atkPct + (weatherMods.magicAtkPct || 0)) / 100)) + (cardMods.magicAtk || 0) + buffFlat(p, 'atk');
  p.physDef = Math.round(p.physDef * (1 + (ps.defPct + relicMods.defPct + (weatherMods.defPct || 0)) / 100)) + (runeMods.defFlat || 0) + (cardMods.physDef || 0) + buffFlat(p, 'def');
  p.critChance = Math.min(100, p.critChance + ps.critPct + (weatherMods.critPct || 0) + (cardMods.critChance || 0));
  p.flee += ps.fleeFlat + (weatherMods.fleeFlat || 0) + (runeMods.fleeFlat || 0) + (cardMods.flee || 0);
  p.hit += (cardMods.hit || 0);
  p.lifesteal = (af.lifesteal || 0) + (relicMods.lifesteal || 0) + (cardMods.lifesteal || 0);
  if (cardMods.allStatPct) {
    p.physAtk = Math.round(p.physAtk * (1 + cardMods.allStatPct));
    p.rangedAtk = Math.round(p.rangedAtk * (1 + cardMods.allStatPct));
    p.magicAtk = Math.round(p.magicAtk * (1 + cardMods.allStatPct));
    p.physDef = Math.round(p.physDef * (1 + cardMods.allStatPct));
    p.maxHp = Math.round(p.maxHp * (1 + cardMods.allStatPct));
    p.maxMp = Math.round(p.maxMp * (1 + cardMods.allStatPct));
  }
  const activePetObj = (G?.pets?.activePetId && G?.pets?.owned?.[G.pets.activePetId])
    ? G.pets.owned[G.pets.activePetId]
    : null;
  const petAura = activePetObj ? petsSystem.computeAuraStats(activePetObj) : {};
  if (petAura.maxHp) p.maxHp += petAura.maxHp;
  if (petAura.physAtkPct) {
    p.physAtk = Math.round(p.physAtk * (1 + petAura.physAtkPct));
    p.rangedAtk = Math.round(p.rangedAtk * (1 + petAura.physAtkPct));
  }
  if (petAura.magicAtkPct) p.magicAtk = Math.round(p.magicAtk * (1 + petAura.magicAtkPct));
  if (petAura.physDefPct) p.physDef = Math.round(p.physDef * (1 + petAura.physDefPct));
  if (petAura.critChance) p.critChance = Math.min(100, p.critChance + petAura.critChance);
  if (petAura.moveMult) p.moveMult *= (1 + petAura.moveMult);
  p.hpRegen = (p.hpRegen || 0) + (petAura.hpRegen || 0);
  p.mpRegen = (p.mpRegen || 0) + (petAura.mpRegen || 0);
  if (petAura.critDmgPct) p.critDmgBonus = (p.critDmgBonus || 0) + petAura.critDmgPct;
  if (petAura.castSpeedPct) p.castSpeed = (p.castSpeed || 1) * (1 + petAura.castSpeedPct);
  if (petAura.res_ice) p.res_ice = (p.res_ice || 0) + petAura.res_ice;
  if (petAura.dmg_fire) p.dmg_fire = (p.dmg_fire || 0) + petAura.dmg_fire;
  if (petAura.dmg_void) p.dmg_void = (p.dmg_void || 0) + petAura.dmg_void;
  p.petAura = petAura;
  p.cardMods = cardMods;
  p.runeMods = runeMods;
  p.atkStat = MAGIC.has(p.combatClass) ? p.magicAtk : p.combatClass === 'ranger' ? p.rangedAtk : p.physAtk;
  // ---- stat-driven combat feel: AGI = attack + walk speed · INT = reach ----
  p.atkDelay = Math.round(COMBAT.attackSpeedMs * (1 - Math.min(0.45, st.agi * TUNING.agiAtkSpeed)));
  p.moveMult = (1 + Math.min(0.5, st.agi * TUNING.agiMoveSpeed)) * buffMult(p, 'speed');
  if (G.mastery?.claimedRanks[G.mapId]?.bronze) p.moveMult *= 1 + TUNING.expansion.masterySpeed;
  if (cardMods.moveMult) p.moveMult *= (1 + cardMods.moveMult);
  if (cardMods.moveSpeedPct) p.moveMult *= (1 + cardMods.moveSpeedPct / 100);
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
  if (it.relicPerk) out.push(`<b style="color:var(--text-accent, #38bdf8)">${T('Relic Perk', 'ui')}</b>`);
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
  const weaponAtk = effAtk(p.equip.weapon) + effAtk(p.equip.accessory) + effAtk(p.equip.relic);
  const armorDef = ['head', 'body', 'hands', 'cloak', 'feet', 'accessory', 'relic'].reduce((sum, slot) => sum + effDef(p.equip[slot]), 0);
  return `<div class="gear-summary"><b>${T('Equipment contribution', 'ui')}</b><div>${T('Base gear', 'ui')}: +${weaponAtk} ${T('weapon ATK', 'ui')} · +${armorDef} ${T('armor DEF', 'ui')}</div><div class="gear-bonuses">${active || `<span class="gear-bonus gear-bonus--muted">${T('No active substats', 'ui')}</span>`}</div></div>`;
}

function addStack(itemId, qty = 1) {
  const inv = G.player.inventory;
  const slot = inv.find(s => s.itemId === itemId && !s.uid);
  if (slot) slot.qty += qty; else inv.push({ itemId, qty });
}
// weapons/armor become rarity-rolled instances (not stackable); everything else stacks
function addItem(itemId, qty = 1, bias = 0) {
  if (itemById[itemId]) G.collectedItems?.add(itemId);   // Collection Book discovery
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
  if (Object.values(G.mastery?.claimedRanks || {}).some(r=>r.platinum)) amount *= 1 + TUNING.expansion.masteryXp;
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
  // ---- job level (skill points, capped by current career stage) ----
  const jobCap = activeJobLevelCap(p);
  if (p.jobLevel < jobCap) {
    p.jobXp += amount;
    while (p.jobLevel < jobCap && p.jobXp >= jobXpForNext(p.jobLevel)) {
      p.jobXp -= jobXpForNext(p.jobLevel);
      p.jobLevel++;
      p.skillPoints += PROGRESSION.skillPointsPerLevel;
      AUDIO.playSfx('levelup');
      toast(T('Job level up! Job Lv {level}/{cap} — +{points} skill point.', 'ui')
        .replace('{level}', p.jobLevel).replace('{cap}', jobCap)
        .replace('{points}', PROGRESSION.skillPointsPerLevel), 'good');
    }
    if (p.jobLevel >= jobCap) p.jobXp = 0;
  } else p.jobXp = 0;
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
  const candidates = (G.spawnTiles || []).filter(tile => inHabitat(tile) && !used.has(`${tile.col},${tile.row}`));
  if (!candidates.length) return randomWalkableTile(inHabitat, false);
  // Deterministic farthest-point sampling: preserve habitat and nursery rules,
  // but spread successive placements away from already occupied tiles.
  const occupied = [...used].map(key => key.split(',').map(Number));
  const hash = tile => ((tile.col * 73856093) ^ (tile.row * 19349663) ^ ((spawn.monsterId.length + 11) * 83492791)) >>> 0;
  candidates.sort((a, b) => {
    const distance = tile => occupied.length
      ? Math.min(...occupied.map(([c, r]) => (tile.col - c) ** 2 + (tile.row - r) ** 2))
      : 0;
    return (distance(b) - distance(a)) || (hash(a) - hash(b));
  });
  return candidates[0];
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
function nearestWalkable(gc, gr) { return nearestWalkableTile(walkTile, gc, gr); }
function findPath(sc, sr, gc, gr) { return findGridPath(walkTile, sc, sr, gc, gr, tileChar); }

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

let bgBufferCanvas = null;

function renderBgBuffer() {
  if (typeof document === 'undefined') return;
  if (!bgBufferCanvas) bgBufferCanvas = document.createElement('canvas');
  bgBufferCanvas.width = G.map.width * TS;
  bgBufferCanvas.height = G.map.height * TS;
  const bgCtx = bgBufferCanvas.getContext('2d');
  if (!bgCtx) return;
  bgCtx.imageSmoothingEnabled = false;
  bgCtx.clearRect(0, 0, bgBufferCanvas.width, bgBufferCanvas.height);
  for (let r = 0; r < G.map.height; r++) {
    for (let c = 0; c < G.map.width; c++) {
      const ch = tileChar(c, r);
      const info = G.legend[ch];
      if (!info) continue;
      const isAnim = (TILE_PHASES[info.type] || 1) > 1;
      if (!isAnim) {
        const tx = c * TS, ty = r * TS;
        if (!drawTile(info.type, tx, ty, bgCtx)) {
          bgCtx.fillStyle = info.color;
          bgCtx.fillRect(tx, ty, TS, TS);
        }
        drawTileEdges(info.type, c, r, tx, ty, bgCtx);
      }
    }
  }
}

function loadMap(mapId, spawnX, spawnY) {
  if (!MAPS[mapId]) return false;
  const dungeonDef=[WhisperingWoods.GOBLIN_CAVE,WhisperingWoods.ELDER_HOLLOW].find(d=>d.id===mapId);
  if(dungeonDef && G.dungeonState.currentDungeonId!==mapId) SubdungeonSystem.enterDungeon(G.dungeonState,dungeonDef,{mapId:G.mapId||'whispering_woods',x:Math.floor(G.player.x/TS),y:Math.floor(G.player.y/TS)},now());
  else if(!dungeonDef && G.dungeonState.currentDungeonId) SubdungeonSystem.exitDungeon(G.dungeonState);
  const map = MAPS[mapId];
  const wasRift = G.mapId === 'celestial_rift' && mapId !== 'celestial_rift';
  G.map = map; G.mapId = mapId; G.tiles = map.tiles; G.legend = map.legend;
  G.weather = weatherSystem.getWeather(mapId);
  recompute(G.player);
  G.heatField = buildHeatField(map);
  G.target = null; G.targetSource = null; G.path = null; G.manualIntent = null; G.effects = []; G.floaties = []; combatFx.clearTelegraphs(); eliteSystem.clearHazards();   // don't carry paths/spell zones across maps
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
      if (def.sizeTiles >= 2) {                 // boss → the 'B' marker tile (raid bosses use their own 'V' marker so they don't stack on the zone guardian)
        const b = (def.raid && findChar('V')) || findChar('B') || randomWalkableTile();
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
  const activeRare=G.rareSpawns.activeRares[mapId];
  if(activeRare) spawnZoneRare((ZONE_PACKAGES[mapId]?.WHISPERING_WOODS_RARES||[]).find(r=>r.id===activeRare.id));
  refreshDailies();

  if (!G.guildBoard || !G.guildBoard.length) refreshGuildBoard();
  AUDIO.playMusic(MAP_MUSIC[mapId] || 'whispering_woods');
  renderBgBuffer();
  const firstVisit = !G.visited.has(mapId);
  logMsg(T(map.ambient, 'maps'), 'sys');
  showZoneBanner(map, firstVisit);
  updateMinimap();
  G.visited.add(mapId); checkQuest();   // explore objectives (guild regions unlock via guardian kills)
  if (firstVisit) logMsg(currentLang === 'th' ? `✦ อัปเดตพงศาวดารแล้ว — ${T(map.chronicle.epithet, 'maps')}` : `✦ Chronicle updated — ${map.chronicle.epithet}.`, 'good');
  refreshPanel('world');
  if (G.taskGuide) setTimeout(continueTaskGuide, 0);
  if (mapId === 'celestial_rift') {
    G.rift.floor = 1; G.rift.active = true;
    G.rift.mutatorId = RIFT_MUTATORS[dayOfYear() % RIFT_MUTATORS.length].id;
    G.rift.nextBurnAt = now() + TUNING.rift.burnEveryMs;
    G.rift.best = Math.max(G.rift.best, G.rift.floor);
    spawnRiftWave();
    const mutName = RIFT_MUTATORS.find(x => x.id === G.rift.mutatorId).name;
    toast(`✦ Celestial Rift — Floor 1 | Mutator: ${mutName} | Best: ${G.rift.best}`, 'good');
  } else if (wasRift) {
    G.rift.active = false;   // leaving the rift (portal exit or death) ends the run cleanly
  }
  if (G.petFollower) {
    G.petFollower.x = G.player.x;
    G.petFollower.y = G.player.y;
  }
  saveGame();   // persist on every zone change (no-op until the run is live)
}
// Celestial Rift wave spawn: fresh roster each floor, hp/atk scaled by
// floorScale ** floor. Reuses 3 existing endgame monsters (riftPool) rather
// than authoring rift-only content.
function spawnRiftWave() {
  const T_ = TUNING.rift, pool = G.map.riftPool;
  const scale = Math.pow(T_.floorScale, G.rift.floor);
  G.monsters = [];
  for (let i = 0; i < T_.waveSize; i++) {
    const def = monById[pool[i % pool.length]];
    const t = G.spawnTiles.length ? G.spawnTiles[rndInt(0, G.spawnTiles.length - 1)] : { col: 2, row: 2 };
    const m = makeMonster(def, t.col * TS + TS / 2, t.row * TS + TS / 2, def.level, null, false);
    m.hp = m.maxHp = Math.round(m.maxHp * scale);
    m.atk = m.atkBase = Math.round(m.atk * scale);
    G.monsters.push(m);
  }
}

function spawnIncursionWave(inc) {
  if (!inc || !inc.waveMonsterIds) return;
  const p = G.player;
  let champAssigned = false;
  for (const mid of inc.waveMonsterIds) {
    const mDef = monById[mid] || monById['void_wisp'] || CONTENT.monsters[0];
    const angle = Math.random() * Math.PI * 2;
    const r = (1.5 + Math.random()) * TS;
    const mx = clamp(inc.x + Math.cos(angle) * r, TS * 2, (G.map.width - 2) * TS);
    const my = clamp(inc.y + Math.sin(angle) * r, TS * 2, (G.map.height - 2) * TS);
    const mLevel = Math.max(mDef.level, p?.level || 1);
    const mob = makeMonster(mDef, mx, my, mLevel);
    mob._incursionMob = true;
    if (inc.currentWave === 2 && mid === 'void_stalker' && !champAssigned) {
      champAssigned = true;
      eliteSystem.applyEliteMods(mob, 'champion');
    }
    G.monsters.push(mob);
  }
}

function triggerIncursionStart() {
  const inc = incursionSystem.startIncursion();
  if (!inc) return;
  toast(`⚡ ${T('Dimensional Incursion', 'ui')}!`, 'bad');
  logMsg('A Dimensional Incursion has erupted from the tear!', 'bad');
  AUDIO.playSfx('skill');
  spawnIncursionWave(inc);
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
  // Guardians keep their flat HP multiplier instead of the HP curve, but they get
  // their own gentler DEF curve — otherwise they are the softest-skinned thing on
  // their own map, with less armor than the trash mobs standing next to them.
  const levelDefMult = 1 + levelRoot * (normal ? TUNING.monsterDefLevelGrowth : TUNING.bossDefLevelGrowth);

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
  const difficulty=DifficultySystem.getTier(G.zoneDifficulty?.[G.mapId]);
  return { lvl, atk:Math.round(atk*difficulty.atkMult), atkBase:Math.round(atk*difficulty.atkMult), dv: Math.round(def.def * durabilityScale * levelDefMult * rbDefMult*difficulty.defMult),
    exp: Math.round(def.exp * scale * TUNING.monsterExpMult * (1 + rb * TUNING.rebirthMonsterExp)*difficulty.expMult),
    hp: Math.round(def.hp * durabilityScale * TUNING.monsterHpMult * levelHpMult * bossMult * rbHpMult*difficulty.hpMult),
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
function makeMonster(def, x, y, levelOverride, spawnSpec = null, eliteTierOverride = null) {
  const lvl = levelOverride != null ? levelOverride : rollMonsterLevel(def);
  const st = monsterStatsFor(def, lvl);
  const { atk, atkBase, dv, exp, hp } = st;
  const mob = {
    def, spawnSpec, x, y, homeX: x, homeY: y,
    difficultyTier: DifficultySystem.getTier(G.zoneDifficulty?.[G.mapId]).id,
    lvl, atk, atkBase, dv,
    exp,
    hp, maxHp: hp,
    alive: true, deadUntil: 0,
    atkCdUntil: 0, statuses: {}, phase: 0,
    size: (def.sizeTiles || 1) * TS,
    flee: st.flee, hit: st.hit,
  };
  const isRift = Boolean(G.rift?.active && G.mapId === 'celestial_rift');
  const tier = (eliteTierOverride !== null && eliteTierOverride !== undefined)
    ? (eliteTierOverride || null)
    : (isRift ? null : eliteSystem.rollTier(def));
  if (tier) {
    eliteSystem.applyEliteMods(mob, tier);
  }
  return mob;
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

const AUTO_DEFAULTS = Object.freeze({ skills: true, heal: true, potions: true, profile: 'balanced' });
const AUTO_PRIORITY_SLOTS = 6;   // rotation depth shown in the Automation panel
function normaliseAutoConfig(raw) {
  const cfg = raw && typeof raw === 'object' ? raw : {};
  const profile = TUNING.automationProfiles?.[cfg.profile] ? cfg.profile : AUTO_DEFAULTS.profile;
  return {
    skills: cfg.skills !== false,
    heal: cfg.heal !== false,
    potions: cfg.potions !== false,
    profile,
    targetId: typeof cfg.targetId === 'string' ? cfg.targetId : null,   // player-pinned Hunt species; quest guides still override
    priority: Array.isArray(cfg.priority) ? cfg.priority.filter(id => typeof id === 'string').slice(0, AUTO_PRIORITY_SLOTS) : [],
    // macro rules: IF hp/mp threshold THEN item/skill/stop-hunt (Phase 2 condition builder)
    rules: Array.isArray(cfg.rules) ? cfg.rules
      .filter(r => r && typeof r === 'object'
        && ['hp_pct', 'mp_pct'].includes(r.when) && ['<', '>'].includes(r.op)
        && Number.isFinite(+r.value) && ['use_item', 'cast_skill', 'stop_hunt'].includes(r.action))
      .map(r => ({ when: r.when, op: r.op, value: clamp(+r.value, 0, 1), action: r.action, arg: typeof r.arg === 'string' ? r.arg : '' }))
      .slice(0, 8) : [],
  };
}

// Evaluate macro rules each automation tick; a fired rule rests 2s so a
// persistent condition can't spam items or skills.
function evaluateMacroRules(p = G.player) {
  for (const r of G.autoConfig?.rules || []) {
    if (now() < (r._nextAt || 0)) continue;
    const val = r.when === 'hp_pct' ? (p.maxHp > 0 ? p.hp / p.maxHp : 0) : (p.maxMp > 0 ? p.mp / p.maxMp : 0);
    if (!(r.op === '<' ? val < r.value : val > r.value)) continue;
    r._nextAt = now() + 2000;
    if (r.action === 'use_item') {
      if (itemQty(r.arg) > 0 && useItem(r.arg)) { setAutoState('recover', T('Macro Rule', 'ui'), T(itemById[r.arg]?.name || r.arg, 'items')); return true; }
    } else if (r.action === 'cast_skill') {
      castSkillById(r.arg);
      setAutoState('recover', T('Macro Rule', 'ui'), T(COMBAT.skills.find(s => s.id === r.arg)?.name || r.arg, 'skills'));
      return true;
    } else if (r.action === 'stop_hunt' && G.autoFarm) {
      toggleFarm();
      setAutoState('idle', T('Macro Rule', 'ui'), T('Hunt stopped', 'ui'));
      return true;
    }
  }
  return false;
}
const autoProfile = () => TUNING.automationProfiles[G.autoConfig?.profile] || TUNING.automationProfiles.balanced;
function setAutoState(phase, label, detail = '') {
  const next = { phase, label, detail, changedAt: now() };
  const prev = G.autoState || {};
  if (prev.phase === phase && prev.label === label && prev.detail === detail) return prev;
  G.autoState = next;
  updateAutomationHud();
  return next;
}
const automationActive = () => Boolean(G.autoFarm || G.taskGuide);

function healAmountForSkill(p, skill) {
  const lvl = skillLevel(p, skill.id);
  if (skill.id === 'sanctuary') return Math.round(p.maxHp * (0.12 + 0.055 * 5) * (1 + 0.15 * (lvl - 1)));
  return Math.round(p.maxHp * (0.12 * skill.power) * (1 + 0.15 * (lvl - 1)));
}
function chooseAutoHealSkill(p = G.player) {
  const missing = Math.max(0, p.maxHp - p.hp);
  const candidates = skillsFor(p.combatClass)
    .filter(skill => branchAllowsSkill(p, skill.id) && skill.type === 'heal' && skillLevel(p, skill.id) > 0
      && now() >= (p.skillCd[skill.id] || 0) && p.mp >= skill.mpCost
      && !(skill.id === 'sanctuary' && p.sanctuary && p.sanctuary.until > now()))
    .map(skill => ({ skill, amount: healAmountForSkill(p, skill) }))
    .sort((a, b) => {
      const aEnough = a.amount >= missing, bEnough = b.amount >= missing;
      if (aEnough !== bEnough) return aEnough ? -1 : 1;
      return aEnough ? a.amount - b.amount : b.amount - a.amount;
    });
  return candidates[0]?.skill || null;
}

function bestRecoveryItem(p = G.player, kind = 'hp') {
  const restoreKey = kind === 'mp' ? 'mpRestore' : 'hpRestore';
  const max = kind === 'mp' ? p.maxMp : p.maxHp, value = kind === 'mp' ? p.mp : p.hp;
  const missing = Math.max(0, max - value), profile = autoProfile();
  const otherLow = kind === 'hp'
    ? (p.maxMp > 0 ? p.mp / p.maxMp : 0) <= profile.mpPotionAt
    : (p.maxHp > 0 ? p.hp / p.maxHp : 0) <= profile.hpPotionAt;
  return p.inventory
    .filter(entry => !entry.uid && entry.qty > 0 && itemById[entry.itemId]?.[restoreKey] > 0)
    .map(entry => {
      const item = itemById[entry.itemId], restore = item[restoreKey];
      const shortfall = Math.max(0, missing - restore), overfill = Math.max(0, restore - missing);
      const otherRestore = kind === 'hp' ? item.mpRestore : item.hpRestore;
      const scarceComboPenalty = otherRestore && !otherLow ? (item.value || 0) * 2 : 0;
      return { entry, item, score: shortfall * 3 + overfill + scarceComboPenalty + (item.value || 0) * 0.02 };
    })
    .sort((a, b) => a.score - b.score || (a.item.value || 0) - (b.item.value || 0))[0]?.item || null;
}

const AUTO_BUFF_STAT = {
  guard_sigil: 'def', bulwark: 'def', mana_shield: 'def', holy_shield: 'def',
  iron_guard: 'def', ki_barrier: 'def', storm_ward: 'def',
  blood_frenzy: 'atk', bloodlust: 'atk', blessing: 'atk',
};
function autoSkillReady(p, skill) {
  return skillLevel(p, skill.id) > 0 && now() >= (p.skillCd[skill.id] || 0)
    && (skill.finisher ? p.momentum >= TUNING.momentum.finisherMin : p.mp >= skill.mpCost);
}
function skillTargetInRange(p, target, skill) {
  if (skill.type === 'heal' || (skill.type === 'buff' && skill.id !== 'hunters_mark')) return true;
  if (!target?.alive) return false;
  const reach = ((skill.type === 'melee' && skill.id !== 'savage_leap') ? skill.range : skill.range + (p.rangeBonus || 0)) * TS + target.size / 2;
  return dist(p.x, p.y, target.x, target.y) <= reach;
}
// A skill is eligible for auto-cast once ready, in range, and not eating into
// the MP reserved for the player's own heal skill while HP is already low.
function autoSkillEligible(p, target, skill, healingReserve) {
  if (!branchAllowsSkill(p, skill.id) || skill.type === 'heal' || !autoSkillReady(p, skill) || !skillTargetInRange(p, target, skill)) return false;
  if (skill.type !== 'buff' && !skill.finisher && Number.isFinite(healingReserve) && p.mp - skill.mpCost < healingReserve
    && p.hp / Math.max(1, p.maxHp) <= autoProfile().healSkillAt + 0.15) return false;
  return true;
}
function chooseAutoSkill(p = G.player, target = G.target) {
  if (!G.autoConfig.skills || !target?.alive) return null;
  const nearby = G.monsters.filter(monster => monster.alive && dist(target.x, target.y, monster.x, monster.y) <= 3 * TS + monster.size / 2).length;
  const mpRatio = p.maxMp > 0 ? p.mp / p.maxMp : 0;
  const healingReserve = G.autoConfig.heal
    ? Math.min(...skillsFor(p.combatClass).filter(candidate => branchAllowsSkill(p, candidate.id) && candidate.type === 'heal' && skillLevel(p, candidate.id) > 0).map(candidate => candidate.mpCost), Infinity)
    : 0;
  // Player-ranked rotation: cast the first ready+in-range skill from the priority
  // list as-is, no scoring. Skills left off the list (or all unready) fall through
  // to the heuristic below.
  for (const skillId of G.autoConfig.priority || []) {
    const skill = COMBAT.skills.find(s => s.id === skillId && s.classId === p.combatClass);
    if (skill && autoSkillEligible(p, target, skill, healingReserve)) return skill;
  }
  const candidates = [];
  for (const skill of skillsFor(p.combatClass)) {
    if (!autoSkillEligible(p, target, skill, healingReserve)) continue;
    let score = skill.power * 10 - skill.mpCost * 0.15;
    if (skill.type === 'buff') {
      if (skill.id === 'hunters_mark') {
        if (liveStatus(target, 'mark')) continue;
        score = 82;
      } else {
        const stat = AUTO_BUFF_STAT[skill.id] || 'atk';
        if (p.buffs.some(buff => buff.sourceSkillId && buff.stat === stat && buff.until > now())) continue;
        score = 68;
      }
    } else {
      const setupLive = skill.effect ? liveStatus(target, skill.effect) : null;
      const detonateLive = skill.detonate ? liveStatus(target, skill.detonate) : null;
      if (skill.detonate) score += detonateLive ? 115 : -45;
      if (skill.effect) score += setupLive ? -16 : 30;
      if (skill.finisher) score += 64 + p.momentum * 7;
      if (skill.type === 'aoe') score += Math.max(0, nearby - 1) * 13;
      if (target.hp / target.maxHp < 0.24) score += skill.finisher ? 24 : 5;
      if (!skill.finisher && mpRatio < 0.25) score -= skill.mpCost * 0.8;
    }
    candidates.push({ skill, score });
  }
  candidates.sort((a, b) => b.score - a.score || a.skill.cooldownMs - b.skill.cooldownMs || a.skill.id.localeCompare(b.skill.id));
  return candidates[0]?.skill || null;
}

function autoRecoveryAction() {
  const p = G.player, cfg = G.autoConfig, profile = autoProfile();
  if (evaluateMacroRules(p)) return { type: 'macro' };
  const hpRatio = p.maxHp > 0 ? p.hp / p.maxHp : 0, mpRatio = p.maxMp > 0 ? p.mp / p.maxMp : 0;
  if (cfg.heal && hpRatio <= profile.healSkillAt) {
    const heal = chooseAutoHealSkill(p);
    if (heal) {
      castSkillById(heal.id);
      // Sanctuary only heals while its caster holds the circle. Give it enough
      // time to tick before Hunt resumes its chase, unless manual input takes over.
      if (heal.id === 'sanctuary' && p.sanctuary) {
        p._autoHoldUntil = Math.min(p.sanctuary.until, now() + 3500);
        G.path = null;
      }
      setAutoState('recover', T('Auto Heal', 'ui'), T(heal.name, 'skills'));
      return { type: 'skill', id: heal.id };
    }
  }
  if (cfg.potions && now() >= (p.potionCdUntil || 0) && hpRatio <= profile.hpPotionAt) {
    const item = bestRecoveryItem(p, 'hp');
    if (item && useItem(item.id)) {
      setAutoState('recover', T('Auto Potion', 'ui'), T(item.name, 'items'));
      return { type: 'item', id: item.id };
    }
  }
  // Mana recovery waits until HP is comfortably above its danger line so the
  // shared potion cooldown remains available for an emergency health potion.
  if (cfg.skills && cfg.potions && now() >= (p.potionCdUntil || 0)
    && mpRatio <= profile.mpPotionAt && hpRatio > profile.hpPotionAt + 0.12) {
    const item = bestRecoveryItem(p, 'mp');
    if (item && useItem(item.id)) {
      setAutoState('recover', T('Auto Mana', 'ui'), T(item.name, 'items'));
      return { type: 'item', id: item.id };
    }
  }
  return null;
}

function acquireAutoTarget(p = G.player) {
  if (!G.autoFarm || G.manualIntent || dlg) return null;
  const focusId = G.huntTargetId || G.autoConfig?.targetId || null;   // quest guide always outranks a player pin
  const species = G.monsters.filter(monster => focusId ? monster.def.id === focusId : monster.def.sizeTiles < 2);
  const alive = species.filter(monster => monster.alive);
  const safeAlive = alive.filter(monster => autoHuntEligible(monster, p));
  const eligible = safeAlive.filter(monster => now() >= (monster._autoSkipUntil || 0));
  const local = focusId ? eligible : eligible.filter(monster => dist(p.x, p.y, monster.x, monster.y) < 14 * TS);
  const candidates = (local.length ? local : eligible)
    .sort((a, b) => dist(p.x, p.y, a.x, a.y) - dist(p.x, p.y, b.x, b.y));
  for (const candidate of candidates) {
    if (!pathTo(candidate.x, candidate.y)) { candidate._autoSkipUntil = now() + 3000; continue; }
    G.target = candidate;
    G.targetSource = 'hunt';
    candidate.provoked = true;
    const name = T(candidate.def.name, 'monsters');
    setAutoState('encounter', T('Encounter found', 'ui'), `${name} · Lv ${candidate.lvl}`);
    return candidate;
  }
  const name = focusId ? T(monById[focusId]?.name || focusId, 'monsters') : T('nearby monsters', 'ui');
  if (alive.length && !safeAlive.length) {
    const minLevel = Math.min(...alive.map(monster => monster.lvl));
    setAutoState('blocked', T('Unsafe encounter', 'ui'), T('{name} begins at Lv {level}; safe limit is Lv {cap}.', 'ui')
      .replace('{name}', name).replace('{level}', minLevel).replace('{cap}', autoHuntLevelCap(p)));
  } else if (species.length && !alive.length) {
    const next = Math.min(...species.map(monster => monster.deadUntil || Infinity));
    const seconds = Number.isFinite(next) ? Math.max(1, Math.ceil((next - now()) / 1000)) : '?';
    setAutoState('waiting', T('Waiting for encounter', 'ui'), T('{name} respawns in about {seconds}s.', 'ui').replace('{name}', name).replace('{seconds}', seconds));
  } else {
    setAutoState('search', T('Searching', 'ui'), T('No reachable {name} found on this map.', 'ui').replace('{name}', name));
  }
  return null;
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
  let dmg = F.damage({ attackerAtk: atk, defenderDef: def, isCrit });
  if (isCrit && arguments[3]) dmg = Math.round(dmg * arguments[3]);
  return { dmg, isCrit };
}

// Objective-aware recovery and skill rotation. Basic attacks continue even when
// either optional automation feature is disabled.
function autoFarmActions() {
  const p = G.player;
  if (autoRecoveryAction()) return;
  const t = G.target;
  if (!t || !t.alive) return;
  const skill = chooseAutoSkill(p, t);
  if (skill) {
    castSkillById(skill.id);
    setAutoState('combat', T('Auto Skill', 'ui'), T(skill.name, 'skills'));
    return;
  }
  setAutoState('combat', T('Basic attack', 'ui'), `${T(t.def.name, 'monsters')} · Lv ${t.lvl}`);
}

function playerBasicAttack() {
  const t = G.target, p = G.player;
  if (!t || !t.alive) return;
  if (dist(p.x, p.y, t.x, t.y) > p.basicRange * TS + t.size / 2) return;
  if (now() < p.attackCdUntil) return;
  p.attackCdUntil = now() + (p.atkDelay || COMBAT.attackSpeedMs);   // AGI-scaled swing speed
  // A 13-frame bow draw must not outlast the swing it belongs to, or a fast AGI
  // build would never finish an animation before starting the next one.
  p.animAttackUntil = now() + Math.min(animMs(attackStateFor(p)), p.atkDelay || COMBAT.attackSpeedMs);
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
  const { dmg, isCrit } = calcDamage(atk * combatGapFactor(p.level, m.lvl), monsterDef(m), p.critChance, buffMult(p, 'critDmg'));
  const el = attackElement(p, null);
  damageMonster(m, applyElement(el, m, dmg), isCrit, silent);
  if (el === 'fire' && Math.random() < 0.15) applyStatus(m, 'burn', 1);
  else if (el === 'ice' && Math.random() < 0.20) applyStatus(m, 'slow', 1);
  else if (el === 'lightning' && Math.random() < 0.10) applyStatus(m, 'stun', 1);
  else if (el === 'nature' && Math.random() < 0.15) applyStatus(m, 'poison', 1);
}

const liveStatus = (m, id) => m.statuses[id] && m.statuses[id].until > now() ? m.statuses[id] : null;
const monsterDef = m => Math.max(0, Math.round(m.dv * (liveStatus(m, 'sunder')?.defMult || 1)));

// ---- elemental weakness: a defender of element X takes bonus damage from weakness[X] ----
const monsterElement = m => (m?.def?.element || (typeof m === 'string' && (monsterById[m]?.element || (CONTENT.monsters.find(x => x.id === m)?.element))) || 'physical');
// Resolve a skill's damage element. Explicit sk.element wins; otherwise derive
// from class → name theme → status effect, defaulting to neutral 'physical'.
// ponytail: name/effect resolver instead of tagging all ~90 skills by hand —
// override on a skill with an explicit `element:` field only where it's wrong.
function skillElement(sk) {
  if (sk.element) return sk.element;
  if (sk.classId === 'paladin') return 'physical';     // holy comes ONLY from the Blessing weapon imbue, never innately
  const n = sk.id;
  if (/frost|ice|rime|blizzard|glacial|absolute_clause/.test(n)) return 'ice';
  if (/flame|fire|ember|inferno|meteor|pyro|solar|prismatic|frostfire/.test(n)) return 'fire';
  if (/spark|thunder|storm|shock|static|lightning|tempest|overload/.test(n)) return 'lightning';
  if (/quake|earth|stone|seismic|titan|adamant|colossus/.test(n)) return 'nature';
  if (sk.effect === 'burn') return 'fire';
  if (sk.effect === 'slow') return 'ice';
  if (sk.effect === 'stun') return 'lightning';
  return 'physical';
}

// Element presentation shared by the skill tooltip, Abilities rows, and Collection Book.
const ELEMENT_META = {
  physical:  { label: 'Neutral',   color: '#b9b9b9', icon: '◆' },
  fire:      { label: 'Fire',      color: '#ff8b3d', icon: '🔥' },
  ice:       { label: 'Ice',       color: '#6ec6ff', icon: '❄' },
  lightning: { label: 'Lightning', color: '#f2d24d', icon: '⚡' },
  nature:    { label: 'Nature',    color: '#7bc56a', icon: '🌿' },
  holy:      { label: 'Holy',      color: '#ffe9a6', icon: '✨' },
  void:      { label: 'Void',      color: '#b98cff', icon: '🌌' },
};
const elementMeta = el => ELEMENT_META[el] || ELEMENT_META.physical;
// Weapon imbue: a temporary buff (Paladin's Blessing) that reskins PHYSICAL damage
// to another element. Elemental skills (a fire spell) keep their own element.
const imbueElement = p => (p?.imbue && now() < p.imbue.until) ? p.imbue.element : null;
function attackElement(p, sk) {
  const base = sk ? skillElement(sk) : 'physical';   // sk omitted = basic attack
  if (base === 'physical') {
    const im = imbueElement(p);
    if (im) return im;
    const runeEl = runeSystem.getWeaponRuneElement(p?.equip?.weapon, itemById);
    if (runeEl) return runeEl;
  }
  return base;
}
const elementChip = el => { const m = elementMeta(el); return `<span class="elem-chip" style="color:${m.color};border-color:${m.color}">${m.icon} ${m.label}</span>`; };
const weakToElement = monEl => TUNING.elements.weakness[monEl] || null;   // null = neutral, no weakness
function elementMult(attackEl, m) {
  const E = TUNING.elements;
  return E.weakness[monsterElement(m)] === attackEl ? E.weaknessMult : 1;
}
function applyElement(attackEl, m, dmg) {
  const mult = elementMult(attackEl, m);
  if (mult > 1) floatText(m.x, m.y - 12, 'WEAK!', 'crit');
  const weatherMult = weatherSystem.getAffinityMultiplier(attackEl, G?.mapId);
  if (weatherMult > 1) floatText(m.x, m.y - 20, 'SURGE!', 'magic');
  return Math.round(dmg * mult * weatherMult);
}

// ---- cross-class combos: a primer status (from any source) consumed by the named detonator skill ----
function applyCrossCombo(sk, m, dmg, isCrit) {
  for (const combo of COMBAT.crossCombos) {
    if (combo.detonatorSkill !== sk.id || !liveStatus(m, combo.primerStatus)) continue;
    delete m.statuses[combo.primerStatus];
    if (combo.burstMult) dmg = Math.round(dmg * combo.burstMult);
    if (combo.critMult) { dmg = Math.round(dmg * combo.critMult); isCrit = true; }
    if (combo.aoeStatus) for (const o of G.monsters)
      if (o.alive && dist(m.x, m.y, o.x, o.y) <= combo.aoeRadiusTiles * TS + o.size / 2) applyStatus(o, combo.aoeStatus, 1);
    combatFx.addScreenShake(0.35);
    floatText(m.x, m.y - 20, combo.name + '!', 'crit', 'COMBO!');
    logMsg(`✦ ${combo.name} — ${combo.description}`, 'good');
    spawnRing(m.x, m.y, TS * 1.4, '#b9e2ff');
  }
  return { dmg, isCrit };
}

function damageMonster(m, dmg, isCrit, silent) {
  const mark = liveStatus(m, 'mark');
  if (mark) dmg = Math.max(1, Math.round(dmg * (1 + mark.damageTaken)));
  dmg = eliteSystem.mitigateDamage(m, dmg);
  m.hp -= dmg;
  m.lastCombatAt = now();          // keeps a boss "in combat" so it won't leash/regen mid-fight
  if (isCrit) {
    combatFx.addScreenShake(0.25);
    floatText(m.x, m.y, dmg, 'crit', 'CRIT!');
  } else {
    floatText(m.x, m.y, dmg, 'dmg');
  }
  const p = G.player;
  relicSystem.onHit(p, m, dmg, isCrit, {
    monsters: G.monsters,
    floatText: (x, y, t, col) => floatText(x, y, t, col || 'crit'),
    spawnZap: (src, dst) => spawnBolt(src.x, src.y, dst.x, dst.y, '#fef08a', '#ffffff', true),
  });
  // Card on-hit procs (strict ZERO screen shake)
  if (p?.equip) {
    for (const slot of Object.keys(p.equip)) {
      const inst = p.equip[slot];
      if (!inst?.sockets) continue;
      for (const cardId of inst.sockets) {
        if (!cardId) continue;
        const cardDef = cardsSystem.getCardDef(cardId);
        if (cardDef?.onHit && Math.random() < (cardDef.onHit.chance || 0)) {
          const hit = cardDef.onHit;
          if (hit.effect === 'entangle' || hit.effect === 'slow') {
            applyStatus(m, hit.effect, hit.duration || 2.0);
            floatText(m.x, m.y - 14, hit.effect.toUpperCase() + '!', 'magic');
          } else if (hit.effect === 'void_vuln') {
            applyStatus(m, 'sunder', hit.duration || 4.0);
            floatText(m.x, m.y - 14, 'VOID VULN!', 'magic');
          } else if (hit.effect === 'frost_nova') {
            const novaDmg = Math.round(dmg * ((hit.dmgPct || 120) / 100));
            floatText(m.x, m.y - 16, 'FROST NOVA!', 'crit');
            spawnRing(m.x, m.y, TS * 1.5, '#80d8ff');
            for (const o of G.monsters) {
              if (o.alive && dist(m.x, m.y, o.x, o.y) <= 2 * TS + o.size / 2) {
                o.hp -= novaDmg;
                floatText(o.x, o.y, novaDmg, 'dmg');
                applyStatus(o, 'slow', 2.0);
                if (o.hp <= 0) killMonster(o);
              }
            }
          } else if (hit.effect === 'meteor') {
            const meteorDmg = Math.round(dmg * ((hit.dmgPct || 150) / 100));
            floatText(m.x, m.y - 16, 'METEOR!', 'crit');
            spawnSlash(m.x, m.y, '#ff5722', 32);
            for (const o of G.monsters) {
              if (o.alive && dist(m.x, m.y, o.x, o.y) <= 1.5 * TS + o.size / 2) {
                o.hp -= meteorDmg;
                floatText(o.x, o.y, meteorDmg, 'dmg');
                applyStatus(o, 'burn', 2.0);
                if (o.hp <= 0) killMonster(o);
              }
            }
          } else if (hit.effect === 'void_tear') {
            const tearDmg = Math.round(dmg * ((hit.dmgPct || 140) / 100));
            floatText(m.x, m.y - 16, 'VOID TEAR!', 'crit');
            spawnRing(m.x, m.y, TS * 1.2, '#ab47bc');
            m.hp -= tearDmg;
            floatText(m.x, m.y, tearDmg, 'dmg');
            if (m.hp <= 0) killMonster(m);
          }
        }
      }
    }
  }
  const relic = relicSystem.getEquippedRelic(p);
  const baseLifesteal = relic?.id === 'vampiric_grail' ? Math.max(0, p.lifesteal - 6) : p.lifesteal;
  if (baseLifesteal > 0) { const heal = Math.max(1, Math.round(dmg * baseLifesteal / 100)); p.hp = clamp(p.hp + heal, 0, p.maxHp); }
  // Reflective Void (rift mutator): monsters return a slice of damage taken
  if (G.rift.active && G.mapId === 'celestial_rift' && G.rift.mutatorId === 'reflective_void' && !p.godMode) {
    const reflect = Math.max(1, Math.round(dmg * TUNING.rift.reflectPct));
    p.hp = clamp(p.hp - reflect, 0, p.maxHp);
    floatText(p.x, p.y, reflect, 'enemy');
  }
  if (m.hp <= 0) killMonster(m);
  // ponytail: best-effort ordering — a reflect kill fires playerDeath after any
  // floor-advance/loot from this same hit already ran; acceptable for a rift mutator.
  if (p.hp <= 0) playerDeath();
}

// exp is scaled by the level gap: farming mobs far below you is nearly worthless,
// fighting at/above your level pays full-to-bonus. This is the real anti-powerlevel lever.
// The two directions use different slopes on purpose: the down-side is the
// anti-powerlevel lever, the up-side has to out-pay combatGapFalloff or fighting
// up is strictly worse than farming at level and the risk is never worth taking.
function expGapFactor(playerLevel, monLevel) {
  const gap = monLevel - playerLevel;
  const f = 1 + gap * (gap >= 0 ? TUNING.expGapRise : TUNING.expGapFalloff);
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
  if (!m.alive) return;
  m.alive = false;
  if (m.def.sizeTiles >= 2) {
    bossMechanics.clearBossState(m);
    combatFx.clearTelegraphs(m.def.id);
  }
  m.deadUntil = now() + R.respawnMs;
  G.seenMonsters?.add(m.def.id);   // Collection Book discovery
  // rift waves are cleared explicitly (see below), never respawned on the normal timer
  if (G.rift.active && G.mapId === 'celestial_rift') m.deadUntil = Infinity;
  AUDIO.playSfx('monsterDie');
  if (G.target === m) { G.target = null; G.targetSource = null; G.path = null; }
  if (G.autoFarm) setAutoState('search', T('Finding next encounter', 'ui'), T(m.def.name, 'monsters'));
  const p = G.player;
  const eliteReward = eliteSystem.handleEliteDeath(m, G.monsters, p, {
    floatText,
  });
  const relicKill = relicSystem.onKill(p, m);
  const xpGain = Math.max(1, Math.round(m.exp * expGapFactor(p.level, m.lvl) * (eliteReward?.xpMult || 1)));
  gainXp(xpGain);
  G.killCounts[m.def.id] = (G.killCounts[m.def.id] || 0) + 1;
  cardsSystem.recordBestiaryKill(G.bestiary, m.def.id);
  // zeny drop scaled by monster level (bosses pay a jackpot)
  const zBase = m.lvl * TUNING.zenyPerLevel * (m.def.sizeTiles >= 2 ? 6 : 1);
  const zeny = Math.round(rndInt(Math.round(zBase * 0.5), Math.round(zBase * 1.5)) * (eliteReward?.zenyMult || 1) * (relicKill?.zenyMult || 1));
  if (zeny > 0) { p.zeny += zeny; }
  // drops (equipment rolls rarity + affixes, biased by monster level & your LUK)
  const dropMult = DifficultySystem.getTier(m.difficultyTier).dropChanceMult * (G.mastery.claimedRanks[G.mapId]?.silver ? 1 + TUNING.expansion.masteryDrop : 1);
  const dropBiasBonus = eliteReward?.dropBiasBonus || 0;
  for (const d of m.def.drops) if (chance(Math.min(1,d.chance * dropMult))) {
    const dropId = classWeaponFor(p, d.itemId);
    cardsSystem.recordBestiaryDrop(G.bestiary, m.def.id, dropId);
    const got = addItem(dropId, 1, dropBias(m, p) + dropBiasBonus), it = itemById[dropId];
    if(p.features.loot.quiet&&got&&!matchesLoot(got,it,p.features.loot,p.classId))continue;
    if (got?.uid && got.rarity !== 'common') { toast(`✦ ${itemRarity(got).name} drop: ${it.name}!`, 'good'); logMsg(`Looted [${itemRarity(got).name}] ${it.name}!`, 'good'); }
    else logMsg(`Looted ${it.name}.`, 'good');
    AUDIO.playSfx('pickup');
  }
  // Companion Auto-Loot dash & bond perks (strict ZERO camera shake)
  if (G.pets?.activePetId && G.pets?.owned?.[G.pets.activePetId]) {
    const activePet = G.pets.owned[G.pets.activePetId];
    const lootRadius = petsSystem.getAutoLootRadius(activePet) * TS;
    const distToMon = Math.hypot(m.x - p.x, m.y - p.y);
    if (distToMon <= lootRadius) {
      if (G.petFollower) petsFx.triggerAutoLoot(G.petFollower, m);
      const bondLoot = petsSystem.getBondLootBonus(activePet);
      if (bondLoot.zenyBonusPct > 0 && zeny > 0) {
        const bonusZ = Math.round(zeny * bondLoot.zenyBonusPct);
        p.zeny += bonusZ;
      }
      if (bondLoot.dupeMatChance > 0 && chance(bondLoot.dupeMatChance)) {
        for (const d of m.def.drops) {
          const it = itemById[d.itemId];
          if (it && it.type === 'material') {
            addItem(d.itemId, 1);
            toast(`🐾 ${T('Companion duplicated', 'ui')} ${T(it.name, 'items')}!`, 'good');
            break;
          }
        }
      }
    }
  }
  // Card drop roll (strict ZERO camera shake)
  const rolledCard = cardsSystem.rollCardDrop(m.def, {
    isElite: Boolean(m.eliteTier),
    isBoss: Boolean(m.def.sizeTiles >= 2 || m.def.raid),
    luck: p.stats?.luk || 0,
  });
  if (rolledCard) {
    addItem(rolledCard, 1);
    cardsSystem.recordCardAcquired(G.bestiary, rolledCard);
    const cardDef = cardsSystem.getCardDef(rolledCard);
    const cardName = cardDef ? T(cardDef.name, 'items') : rolledCard;
    toast(`🎴 ${T('Monster Card Drop', 'ui')}: [${cardName}]!`, 'good');
    logMsg(`Acquired rare monster card: [${cardName}]!`, 'good');
    AUDIO.playSfx('quest');
  }
  if (eliteReward?.gemDrop) {
    addItem(eliteReward.gemDrop, 1);
    const gemItem = itemById[eliteReward.gemDrop];
    toast(`💎 Bonus Gem Shard: ${gemItem?.name || eliteReward.gemDrop}!`, 'good');
    logMsg(`Found bonus gem shard: ${gemItem?.name || eliteReward.gemDrop}!`, 'good');
  }
  if (m.eliteTier) {
    const tierName = m.eliteTier === 'elite' ? 'Elite' : 'Champion';
    toast(`★ ${tierName} ${m.def.name} defeated!`, 'good');
    AUDIO.playSfx('quest');
  }
  logMsg(`Defeated Lv${m.lvl} ${m.def.name} (+${xpGain} xp, +${zeny}z).`);
  // class-advancement quest progress (kill objective)
  if (G.advance && G.advance.def.objective.type === 'kill' && G.advance.def.objective.target === m.def.id) G.advance.progress++;
  checkQuest();
  checkAdvance();
  guildKill(m.def.id);

  // Content Expansion hooks: subdungeons, rare spawn triggers, dailies & mastery
  if (SubdungeonSystem.isInsideDungeon(G.dungeonState)) {
    SubdungeonSystem.recordKill(G.dungeonState, m.def.id);
    const d=[WhisperingWoods.GOBLIN_CAVE,WhisperingWoods.ELDER_HOLLOW].find(d=>d.id===G.mapId);
    if(d?.boss.monsterId===m.def.id) SubdungeonSystem.completeDungeon(G.dungeonState,d.id,now());
  }
  const zonePkg = ZONE_PACKAGES[G.mapId];
  if (zonePkg?.WHISPERING_WOODS_RARES && !m.zoneRareId) {
    const spawnedRare = RareSpawnsSystem.registerKill(G.rareSpawns, G.mapId, m.def.id, zonePkg.WHISPERING_WOODS_RARES);
    if (spawnedRare) {
      spawnZoneRare(spawnedRare);
      toast(`⚠ Rare Beast Sighted: ${spawnedRare.name}!`, 'bad');
      logMsg(`A ferocious presence stirs: ${spawnedRare.name} has appeared!`, 'bad');
    }
  }
  refreshDailies();
  DailiesSystem.updateProgress(G.dailies, 'hunt', m.def.id, 1);
  if(m.zoneRareId) { RareSpawnsSystem.clearRare(G.rareSpawns,G.mapId); m.deadUntil=Infinity; }
  MasterySystem.addPoints(G.mastery, G.mapId, m.def.sizeTiles >= 2 ? 15 : 1);
  if (m.def.id === 'ruin_golem') { toast('The ruins are cleared — a frozen path opens to the north.', 'good'); }
  if (m.def.id === 'flame_dragon') { toast('☠ The Flame Dragon falls — and behind its throne, the sky TEARS OPEN. The Astral Rift awaits.', 'good'); logMsg('A rift portal has opened at the far edge of the caldera.', 'sys'); }
  if (m.def.id === 'nullking') { toast(T('✦☠ The Nullking is unmade!', 'ui'), 'good'); triggerVictory(); }   // the TRUE finale
  if (m.def.raid) { toast(`🏆 ${m.def.name} falls — the tide recoils!`, 'good'); logMsg(`${m.def.name} slain. A mythic drop awaits.`, 'good'); }
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
  // Celestial Rift: clearing every monster in the current wave advances the floor
  if (G.rift.active && G.mapId === 'celestial_rift' && G.monsters.every(mo => !mo.alive)) {
    G.rift.floor++;
    G.rift.best = Math.max(G.rift.best, G.rift.floor);
    spawnRiftWave();
    toast(`✦ Celestial Rift — Floor ${G.rift.floor}! Best: ${G.rift.best}`, 'good');
  }
  // Dimensional Incursion wave clear check
  if (incursionSystem.getState() === INCURSION_STATES.INCURSION_ACTIVE) {
    const incMobs = G.monsters.filter(mo => mo._incursionMob && mo.alive);
    if (incMobs.length === 0) {
      const activeInc = incursionSystem.getActiveIncursion();
      if (activeInc && activeInc.currentWave >= 3) {
        incursionSystem.sealIncursion();
        addItem('rift_cache', 1);
        AUDIO.playSfx('levelup');
        toast(`✨ ${T('Rift Sealed!', 'ui')}`, 'good');
        logMsg('Dimensional Incursion sealed — claimed Dimensional Cache!', 'good');
      } else {
        const nextInc = incursionSystem.advanceWave();
        if (nextInc) {
          toast(`⚡ ${T('Wave {w}/3', 'ui').replace('{w}', nextInc.currentWave)}`, 'bad');
          spawnIncursionWave(nextInc);
        }
      }
    }
  }
}

// A weapon drop the hero can't wield re-rolls to the closest-tier weapon of
// their own class — drop tables are sword-heavy, but every class should see
// usable weapon drops from the same monsters. Non-weapons pass through as-is.
function classWeaponFor(p, itemId) {
  const it = itemById[itemId];
  if (!it || it.type !== 'weapon' || canUseItem(p, it)) return itemId;
  const own = CONTENT.items.filter(w => w.type === 'weapon' && w.classReq?.includes(p.classId));
  if (!own.length) return itemId;
  own.sort((a, b) =>
    Math.abs((a.gearLevel || 0) - (it.gearLevel || 0)) - Math.abs((b.gearLevel || 0) - (it.gearLevel || 0))
    || Math.abs(a.atk - it.atk) - Math.abs(b.atk - it.atk));
  return own[0].id;
}

function applyStatus(m, effect, skillLvl = 1) {
  if (!effect) return;
  const def = COMBAT.statusEffects[effect];
  if (!def) return;
  // burn/poison scales with the caster's ATK, so it must obey the same level-gap
  // penalty as every other player damage source — else DOTs bypass the wall
  const tickDamage = (effect === 'burn' || effect === 'poison')
    ? Math.max(def.tickDamage, Math.round((G.player?.atkStat || 0) * (def.powerRatio || 0)
        * combatGapFactor(G.player?.level || 1, m.lvl)))
    : def.tickDamage;
  const status = { until: now() + def.durationMs, nextTick: now() + 1000, tickDamage };
  if (def.damageTaken) status.damageTaken = def.damageTaken + (def.perLevel || 0) * (skillLvl - 1);
  if (def.defReduction) status.defMult = Math.max(0, 1 - def.defReduction - (def.perLevel || 0) * (skillLvl - 1));
  m.statuses[effect] = status;
}

// ---- active dodge roll + timed parry (stamina-fueled) ----
function performDodge() {
  const p = G.player, S = TUNING.stamina;
  if (!p || p.stamina < S.dodgeCost || now() < p.invulnUntil) return false;
  p.stamina -= S.dodgeCost;
  const k = G.keys;
  let dx = ((k['d'] || k['arrowright']) ? 1 : 0) - ((k['a'] || k['arrowleft']) ? 1 : 0);
  let dy = ((k['s'] || k['arrowdown']) ? 1 : 0) - ((k['w'] || k['arrowup']) ? 1 : 0);
  if (!dx && !dy) { dx = p.facing?.x || 0; dy = p.facing?.y || 1; }
  const len = Math.hypot(dx, dy) || 1, roll = S.dodgeDistTiles * TS;
  moveEntity(p, (dx / len) * roll, (dy / len) * roll, 12);
  p.invulnUntil = now() + S.dodgeMs;
  G.path = null;
  spawnRing(p.x, p.y, TS, '#9fd8ff');
  AUDIO.playSfx('skill');
  return true;
}
function performParry() {
  const p = G.player, S = TUNING.stamina;
  if (!p || p.stamina < S.parryCost || now() < p.parryUntil) return false;
  p.stamina -= S.parryCost;
  p.parryUntil = now() + S.parryWindowMs;
  spawnRing(p.x, p.y, TS * 0.8, '#ffd24d');
  return true;
}
// Shared incoming-hit gate for every monster damage source: dodge i-frames
// negate outright; an open parry window negates, stuns the attacker, and arms
// a counter-attack buff.
function playerAvoidsHit(m) {
  const p = G.player, S = TUNING.stamina;
  if (now() < p.invulnUntil) { floatText(p.x, p.y, 'dodged!', 'heal'); return true; }
  if (now() < p.parryUntil) {
    p.parryUntil = 0;
    applyStatus(m, 'stun', 1);
    if (m.statuses.stun) m.statuses.stun.until = now() + S.parryStunMs;
    p.buffs.push({ stat: 'atk', mult: S.counterMult, until: now() + S.counterMs, sourceSkillId: 'parry' });
    floatText(p.x, p.y, 'PARRY!', 'crit');
    spawnRing(p.x, p.y, TS, '#ffd24d');
    AUDIO.playSfx('parry');
    return true;
  }
  return false;
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
  if (!branchAllowsSkill(p, id)) { logMsg(`${sk.name} belongs to another second-job path.`, 'bad'); return; }
  if (!skillLevel(p, sk.id)) { logMsg(`${sk.name} not learned — open Skills (K).`, 'sys'); return; }
  if (now() < (p.skillCd[sk.id] || 0)) { logMsg(`${sk.name} on cooldown.`, 'sys'); return; }
  const M = TUNING.momentum;
  if (sk.finisher) {
    if (p.momentum < M.finisherMin) { logMsg(`${sk.name} — not enough Momentum.`, 'bad'); return; }
  } else if (p.mp < sk.mpCost) { logMsg('Not enough MP.', 'bad'); return; }

  const targetsInRange = () => {
    const t = G.target;
    if (sk.type === 'heal' || (sk.type === 'buff' && sk.id !== 'hunters_mark') || sk.type === 'aoe') return true;
    if (!t || !t.alive) { logMsg('No target.', 'sys'); return false; }
    const reach = ((sk.type === 'melee' && sk.id !== 'savage_leap') ? sk.range : sk.range + (p.rangeBonus || 0)) * TS + t.size / 2;   // INT extends ranged/magic
    if (dist(p.x, p.y, t.x, t.y) > reach) { logMsg('Target out of range.', 'sys'); return false; }
    return true;
  };
  if (!targetsInRange()) return;

  let momentumMult = 1;
  if (sk.finisher) {
    momentumMult = 1 + M.powerPerPoint * p.momentum;
    p.momentum = 0;
    combatFx.addScreenShake(0.55);
  }
  else { p.mp -= sk.mpCost; }
  p.skillCd[sk.id] = now() + sk.cooldownMs;
  // Buffs and heals are channelled; damage skills use the class's own attack
  // motion, and Momentum finishers get the heavy wind-up variant.
  p.animCastState = (sk.type === 'buff' || sk.type === 'heal') ? 'cast'
    : sk.finisher ? finisherStateFor(p) : attackStateFor(p);
  p.animCastUntil = now() + animMs(p.animCastState);
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
    procBranchMechanic(p, sk);
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
    p.buffs.push({ stat: eff[0], mult, until: now() + 8000, sourceSkillId: sk.id });
    skillFx(sk, p.x, p.y);
    // Blessing also imbues the weapon with holy — the ONLY way a Paladin deals holy (1.5× vs void).
    if (sk.id === 'blessing') { p.imbue = { element: 'holy', until: now() + TUNING.holyImbueMs }; spawnRing(p.x, p.y, TS, '#ffe9a6'); }
    toast(sk.id === 'blessing' ? `${sk.name} — ✨ ${T('weapon imbued with Holy', 'ui')}!` : `${sk.name} Lv${lvl} active!`, 'good');
    procBranchMechanic(p, sk);
    return;
  }
  if (sk.type === 'aoe') {
    const cx = G.target ? G.target.x : p.x, cy = G.target ? G.target.y : p.y;
    skillFx(sk, cx, cy);
    let hit = false, lastDmg = 0;
    for (const m of G.monsters) if (m.alive && dist(cx, cy, m.x, m.y) <= sk.radius * TS + m.size / 2) {
      let { dmg, isCrit } = calcDamage(atk * combatGapFactor(p.level, m.lvl), monsterDef(m), p.critChance, buffMult(p, 'critDmg'));
      if (sk.detonate && m.statuses[sk.detonate] && m.statuses[sk.detonate].until > now()) {
        dmg = Math.round(dmg * (1 + M.detonateBonus));
        delete m.statuses[sk.detonate];
        combatFx.addScreenShake(0.35);
        floatText(m.x, m.y - 12, 'DETONATE!', 'detonate');
      }
      dmg = applyElement(attackElement(p, sk), m, dmg);
      ({ dmg, isCrit } = applyCrossCombo(sk, m, dmg, isCrit));
      damageMonster(m, dmg, isCrit); applyStatus(m, sk.effect, lvl);
      extendBranchStatus(p, sk, m);
      hit = true; lastDmg = dmg;
    }
    if (hit) { if (!sk.finisher) gainMomentum(p); procBranchMechanic(p, sk, { dmg: lastDmg }); }
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
  let { dmg, isCrit } = calcDamage(atk * combatGapFactor(p.level, t.lvl), monsterDef(t), p.critChance, buffMult(p, 'critDmg'));
  if (sk.detonate && t.statuses[sk.detonate] && t.statuses[sk.detonate].until > now()) {
    dmg = Math.round(dmg * (1 + M.detonateBonus));
    delete t.statuses[sk.detonate];
    combatFx.addScreenShake(0.35);
    floatText(t.x, t.y - 12, 'DETONATE!', 'detonate');
  }
  dmg = branchDetonateBonus(p, sk, t, dmg);
  dmg = applyElement(attackElement(p, sk), t, dmg);
  ({ dmg, isCrit } = applyCrossCombo(sk, t, dmg, isCrit));
  damageMonster(t, dmg, isCrit); applyStatus(t, sk.effect, lvl);
  extendBranchStatus(p, sk, t);
  procBranchMechanic(p, sk, { dmg });
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
  bossMechanics.updateHazards(p, dt, {
    now,
    floatText,
    playerDeath,
  });
  eliteSystem.updateElites(G.monsters, p, dt, {
    now,
    floatText,
    addTelegraph: combatFx.addTelegraph,
    playerDeath,
    applyPlayerStatus: (type, durationMs) => {
      if (type === 'slow') {
        p.slowUntil = Math.max(p.slowUntil || 0, now() + durationMs);
      }
    },
  });
  if (p.hp <= 0) return;
  for (const m of G.monsters) {
    if (!m.alive) { if (now() >= m.deadUntil) respawn(m); continue; }

    // status ticks
    let stunned = false, slowed = false;
    for (const [k, s] of Object.entries(m.statuses)) {
      if (now() > s.until) { delete m.statuses[k]; continue; }
      if (k === 'stun') stunned = true;
      if (k === 'slow') slowed = true;
      if ((k === 'burn' || k === 'poison') && now() >= s.nextTick) {
        s.nextTick += 1000;
        const tickDamage = s.tickDamage ?? (COMBAT.statusEffects[k]?.tickDamage || 6);
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
        bossMechanics.clearBossState(m);
        combatFx.clearTelegraphs(m.def.id);
        if (m.hp < m.maxHp) {
          m.hp = Math.min(m.maxHp, m.hp + m.maxHp * 0.06 * dt);       // slow regen only while reset
          if (now() >= (m._healAt || 0)) { floatText(m.x, m.y, '+' + Math.round(m.maxHp * 0.06), 'heal'); m._healAt = now() + 800; }
        }
        if (dist(m.x, m.y, m.homeX, m.homeY) > TS * 0.7) followMonsterPath(m, m.homeX, m.homeY, speed, dt);
        else m.path = null;
        continue;
      }
      // ---- boss mechanics: tactical telegraphs, geometric attacks & screen shake ----
      bossMechanics.updateBoss(m, p, dt, {
        now,
        TUNING,
        COMBAT,
        ANIM,
        TS,
        dist,
        playerAvoidsHit,
        calcDamage,
        buffMult,
        playerDeath,
        floatText,
        playSfx: AUDIO.playSfx,
        addScreenShake: combatFx.addScreenShake,
        addTelegraph: combatFx.addTelegraph,
        spawnCrack,
        spawnRing,
        spawnRaidAdds: (boss) => {
          const addDef = monById['void_wisp'], n = rndInt(2, 3);
          for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2;
            G.monsters.push(makeMonster(addDef, boss.x + Math.cos(a) * TS * 2, boss.y + Math.sin(a) * TS * 2));
          }
          spawnRing(boss.x, boss.y, TS * 2.5, '#7a4fd0');
        },
        toast,
      });
      if (p.hp <= 0) return;
    }

    const aggro = m.def.behavior === 'aggressive' || m.provoked;
    const aggroTiles = Math.max(R.aggroRangeTiles * weatherSystem.getAggroRangeMult(G?.mapId), (m.def.attackRange || 0) + 1);
    if (aggro && d < aggroTiles * TS * (m.def.id === 'ruin_golem' ? 4 : 1)) {
      const range = (m.size / 2) + TS * (m.def.attackRange || 0.6);
      if (d > range) followMonsterPath(m, p.x, p.y, speed, dt);       // route around trees/walls
      else if (now() >= m.atkCdUntil) {                                // attack player
        m.atkCdUntil = now() + COMBAT.attackSpeedMs * (m.def.attackCooldownMult || 1) * (slowed ? 2 : 1) * (m.enraged ? 0.7 : 1);
        m.animAttackUntil = now() + 300;
        m.path = null; m.lastCombatAt = now();
        // fighting up is dangerous both ways: a monster above your level lands hits an
        // evasion build would otherwise dodge (mirror of combatGapFactor on your damage)
        if (rollHit(m.hit + gapHit(m.lvl, p.level), p.flee) && !playerAvoidsHit(m)) {
          const { dmg, isCrit } = calcDamage(m.atk, p.physDef * buffMult(p, 'def'), 5);
          if (m.def.attackRange) spawnBolt(m.x, m.y, p.x, p.y, m.def.projectileColor || '#ffffff', '#ffffff');
          const isMelee = !m.def.attackRange || m.def.attackRange <= 1.5;
          const relicDef = relicSystem.onTakeDamage(p, m, dmg, {
            isMelee,
            floatText: (x, y, t, col) => floatText(x, y, t, col || 'status'),
          });
          const actualDmg = Math.max(0, dmg - (relicDef.absorbed || 0));
          if (!p.godMode) p.hp -= actualDmg;                                  // admin god mode
          p.hurtUntil = now() + ANIM.hurtMs;
          AUDIO.playSfx('playerHurt');
          floatText(p.x, p.y, p.godMode ? '0' : actualDmg, p.godMode ? 'heal' : 'enemy');
          const matchesFocus = !G.huntTargetId || m.def.id === G.huntTargetId;
          if ((!G.target || !G.target.alive) && matchesFocus && (!G.autoFarm || autoHuntEligible(m, p))) {
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
  const t = m.def.sizeTiles >= 2 ? ((m.def.raid && findChar('V')) || findChar('B') || { col: 2, row: 2 }) : walkableNearHome(m);
  if (!t) { m.deadUntil = now() + 1000; return; }
  m.x = t.col * TS + TS / 2; m.y = t.row * TS + TS / 2;
  // Re-level at the new home-near position, clamped to the species habitat/range.
  if (m.def.sizeTiles < 2) {
    const lvl = heatLevel(G.map, t.col, t.row, m.spawnSpec, G.heatField);
    if (lvl != null) { const st = monsterStatsFor(m.def, lvl); Object.assign(m, st, { maxHp: st.hp }); }
  }
  m.hp = m.maxHp; m.alive = true; m.statuses = {}; m.provoked = false; m.path = null; m.leashing = false;
  m.enraged = false; m.phase = 0; m.atk = m.atkBase; m.slamAt = null; m.nextSlamAt = 0;
  m.raidAddsSpawned = false; m.raidPhase3 = false; m.raidHazardTicks = 0;   // raid-only 3-phase state reset
  delete m.eliteTier;
  delete m.eliteAffixes;
  delete m.shieldActive;
  const tier = eliteSystem.rollTier(m.def);
  if (tier) {
    eliteSystem.applyEliteMods(m, tier);
  }
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
function doRebirth(newClassId = null) {
  const p = G.player;
  if (p.level < DESIGN.levelCap) return false;
  newClassId = newClassId || p.classId;
  const fresh = makePlayer(newClassId, p.name);   // canonical starting progression for this class
  p.rebirths = (p.rebirths || 0) + 1;
  p.pastLives = [...new Set([...(p.pastLives || []), p.classId])];
  Object.assign(p, { classId: newClassId, _cls: fresh._cls, level: 1, xp: 0, jobLevel: 1, jobXp: 0, tierIndex: 0, jobBranchId: null, advancedJobId: null, hybridJobId: null, className: fresh.className,
    combatClass: fresh.combatClass, alloc: fresh.alloc, statPoints: fresh.statPoints, skillPoints: fresh.skillPoints,
    skillLevels: fresh.skillLevels, hotbar: fresh.hotbar, momentum: 0, skillCd: {}, buffs: [] });
  G.advance = null;   // the class-advancement trials will re-offer at their level gates
  G.jobChoiceOpen = false;
  recompute(p, true);
  const msg = `✦ ${T('Rebirth {n} — the world begins again, but your soul remembers.', 'ui').replace('{n}', p.rebirths)}`;
  toast(msg, 'good'); logMsg(msg, 'good');
  AUDIO.playSfx('levelup');
  checkAchievements(); updateHud(); renderHotbar(); refreshPanel('char'); saveGame();
  return true;
}

function showRebirthClassChoice() {
  const p = G.player;
  let box = document.getElementById('rebirth-choice');
  if (box) box.remove();
  box = document.createElement('div');
  box.id = 'rebirth-choice'; box.className = 'job-choice-overlay';
  const cards = DESIGN.classes.map(c => {
    const cc = CLASS_COMBAT[c.id], url = typeof pxDataURL !== 'undefined' ? pxDataURL('player', cc) : '';
    const portrait = url
      ? `<span class="cc-portrait"><img src="${url}" width="64" height="64" alt="" class="cc-portrait-img"></span>`
      : `<span class="cc-portrait cc-portrait-fallback">✦</span>`;
    return `<button class="job-choice-card" data-rebirth-class="${c.id}" style="--path-color:#e6bd54">
      ${portrait}
      <b>${esc(T(c.name, 'classes'))}</b>
      <em>${esc(T(c.role, 'classes'))}</em>
      <span class="job-choice-pick">${T('REBORN AS THIS', 'ui')}</span>
    </button>`;
  }).join('');
  box.innerHTML = `<section class="job-choice-shell"><header><small>${T('LEVEL CAP REACHED', 'ui')}</small><h2>${T('Choose your next life', 'ui')}</h2><p>${T('Your past life will be remembered, unlocking new hybrid paths.', 'ui')}</p></header><div class="job-choice-grid">${cards}</div><button class="btn btn--ghost" style="margin-top:20px" onclick="document.getElementById('rebirth-choice').remove()">${T('Cancel', 'ui')}</button></section>`;
  box.querySelectorAll('[data-rebirth-class]').forEach(button => button.onclick = () => {
    doRebirth(button.dataset.rebirthClass);
    if (box) box.remove();
  });
  ($('#overlays') || document.body).appendChild(box);
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
  setAutoState('blocked', T('Automation stopped', 'ui'), T('Death canceled Hunt mode and active quest navigation.', 'ui'));
  updateFarmButton();
  return stopped;
}

function playerDeath() {
  const p = G.player;
  if (relicSystem.onLethalDamage(p, p.maxHp, {
    monsters: G.monsters,
    floatText: (x, y, t, col) => floatText(x, y, t, col || 'crit'),
    spawnRing,
    playSfx: (id) => AUDIO.playSfx(id || 'heal'),
  })) {
    recompute(p, false);
    return;
  }
  // dying inside the rift returns to its portal source map, not town — same penalty either way
  const inRift = G.rift.active && G.mapId === 'celestial_rift';
  const automationStopped = stopAutomationOnDeath();
  const loss = Math.floor(p.zeny * TUNING.deathZenyLoss);
  p.zeny -= loss;
  toast(`You fell... revived ${inRift ? 'at the Astral Rift' : 'in town'} at half strength${loss ? ` — dropped ${loss}z on the way` : ''}.${automationStopped ? ' Hunt and route stopped.' : ''}`, 'bad');
  if (automationStopped) logMsg('Death canceled Hunt mode and active quest navigation. Choose a route again when ready.', 'sys');
  p.hp = Math.ceil(p.maxHp * 0.5); p.mp = Math.ceil(p.maxMp * 0.5); p.buffs = [];
  loadMap(inRift ? 'astral_rift' : 'town_awakening');
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
    const monsterId = bountyMonsterId(bounty);
    const mapId = monsterMapId[monsterId];
    return monsterId && mapId
      ? { source, taskId, mode: 'hunt', monsterId, mapId, label: monById[monsterId].name }
      : null;
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
  setAutoState(G.autoFarm ? 'search' : 'idle', G.autoFarm ? T('Searching', 'ui') : T('Automation ready', 'ui'),
    G.autoFarm ? T('Finding the next safe encounter.', 'ui') : T('Track a task or enable Hunt.', 'ui'));
  updateFarmButton();
  if ($('#quest-tracker')) updateQuestTracker();
  refreshPanel('world');
}

// Reconcile a tracked task after its objective changes. Keeping the same guide
// alive through hunt -> turn-in means one click can drive the whole objective;
// an invalid or stale restored guide is dropped safely.
function refreshTaskGuideAction({ continueNow = true } = {}) {
  const guide = G.taskGuide;
  if (!guide) return false;
  const action = taskAction(guide.source, guide.taskId);
  if (!action?.mapId) { finishTaskGuide(); return false; }
  const changed = action.mode !== guide.mode || action.mapId !== guide.mapId
    || action.monsterId !== guide.monsterId || action.npcId !== guide.npcId;
  if (changed) {
    G.taskGuide = { ...action, resumeAutoFarm: guide.resumeAutoFarm };
    G.huntTargetId = null;
    G.autoFarm = false;
    G.target = null;
    G.targetSource = null;
    G.path = null;
    G.manualIntent = null;
  }
  if (continueNow) continueTaskGuide();
  updateFarmButton();
  updateQuestTracker();
  return true;
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
      finishTaskGuide(false);
      return;
    }
    const destination = translateAny(guide.label, ['maps', 'npcs', 'monsters']);
    setAutoState('route', T('Tracking route', 'ui'), T('Heading to {name}', 'ui').replace('{name}', destination));
    updateFarmButton();
    return;
  }

  if (guide.mode === 'hunt') {
    G.huntTargetId = guide.monsterId;
    G.autoFarm = true;
    updateFarmButton();
    const name = T(monById[guide.monsterId]?.name || guide.label, 'monsters');
    setAutoState('search', T('Focused hunt', 'ui'), name);
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
      finishTaskGuide(false);
    } else setAutoState('route', T('Tracking objective', 'ui'), T(npc.name, 'npcs'));
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

// guild bounty regions unlock by CONQUEST, not tourism: slaying a zone's guardian
// earns the guild's trust for the NEXT zone. Woods are always posted.
const ZONE_ORDER = ['whispering_woods', 'sunken_ruins', 'frostpeak_tundra', 'dragon_caldera', 'astral_rift'];
const WORLD_ORDER = ['town_awakening', ...ZONE_ORDER];
const zoneGuardian = mid => MAPS[mid].spawns.map(sp => monById[sp.monsterId]).find(d => d?.sizeTiles >= 2)?.id;

// ---- Adventurer's Guild: repeatable randomized bounties ----
const {
  GUILD_DIFF_WEIGHTS,
  pickWeighted,
  guildAllowedDiffs,
  addGuildPoints,
  unlockedMonsterIds,
  genGuildQuest,
  finishGuild,
  claimGuild,
  guildTurnIn,
  refreshGuildBoard,
  rerollGuildBoard,
  bountyWhere,
  bountyMonsterId,
  bountyLevelRange,
  bountyLevelHtml,
  acceptGuild,
  guildRevokeArmed,
  guildRevokeButton,
  requestGuildRevoke,
  revokeGuild,
  guildKill,
} = createGuild({
  G,
  DIFFICULTY,
  nextUid: () => ++_uid,
  monById,
  monsterMapName,
  monsterLevelRange,
  itemById,
  itemDropSource,
  itemQty,
  removeItem,
  gainXp,
  toast,
  logMsg,
  updateQuestTracker,
  refreshPanel,
  finishTaskGuide,
  refreshTaskGuideAction,
  saveGame,
  rerollShop,
  ZONE_ORDER,
  zoneGuardian,
  GUILD_RANKS,
  GUILD_HARD_AT,
  GUILD_ELITE_AT,
  GUILD_DIFF_PTS,
  GUILD_TIER_PTS,
  DIFF_PTS_MULT,
  monsterTier,
  guildPointsNeed,
  GUILD_MAX_ACTIVE,
});

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
// Duration of one pass of an LPC state, and the class's own attack/finisher state.
const animMs = state => LPC.states[state]?.ms ?? ANIM.attackMs;
const attackStateFor = p => LPC.anim[p.combatClass]?.attack || 'attack';
const finisherStateFor = p => LPC.anim[p.combatClass]?.finisher || 'attack';
// One-shot states play their frames across `ms` and hold the last frame; looping
// states advance one frame per `ms`. Replaces five hand-rolled frame formulas.
function animFrame(state, elapsed) {
  const st = LPC.states[state]; if (!st) return 0;
  return st.loop
    ? Math.floor(elapsed / st.ms) % st.frames
    : Math.min(st.frames - 1, Math.floor(elapsed / (st.ms / st.frames)));
}
function playerAnim(p) {
  if (G.debugAnim) return { state: G.debugAnim.state, dir: G.debugAnim.dir || 'down', frame: G.debugAnim.frame | 0 };
  const t = now(), dir = facingDir(p);
  const shot = (state, until) => ({ state, dir, frame: animFrame(state, animMs(state) - (until - t)) });
  if (p.hurtUntil > t) return shot('hurt', p.hurtUntil);
  // the stamina dodge roll finally has a body to go with its i-frames
  if (p.invulnUntil > t) return shot('jump', p.invulnUntil);
  if (p.animCastUntil > t) return shot(p.animCastState || 'cast', p.animCastUntil);
  if (p.animAttackUntil > t) return shot(attackStateFor(p), p.animAttackUntil);
  if (p.moving) {
    // AGI buys real speed, so show it: past a brisk pace the hero runs, not walks
    const state = (p.moveMult || 1) >= 1.25 ? 'run' : 'walk';
    return { state, dir, frame: animFrame(state, t) };
  }
  // standing: a battle stance while something is actually engaged, else breathing
  const state = G.target?.alive ? 'combatIdle' : 'idle';
  return { state, dir, frame: animFrame(state, t) };
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
const {
  TILE_PHASES,
  TILE_PHASE_MS,
  prefersReducedMotion,
  hash2,
  buildTile,
  drawTile,
  drawTileEdges,
  buildParallaxStrip,
  drawParallax,
} = createTileRenderer({
  getCtx: () => ctx,
  getState: () => G,
  tileChar,
  TS,
  getCanvasW: () => CANVAS_W,
  getCanvasH: () => CANVAS_H,
  now,
});
const combatFx = createCombatFx({
  getCtx: () => ctx,
  prefersReducedMotion,
  now,
  getFloaties: () => G.floaties,
  setFloaties: (f) => { G.floaties = f; },
  floatColor: (k) => floatColor(k),
});
const bossMechanics = createBossMechanics();
const weatherRenderer = createWeatherRenderer({
  getCtx: () => ctx,
  now,
  prefersReducedMotion,
  CANVAS_W,
  CANVAS_H,
});
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

  // static tilemap offscreen buffer blit
  if (bgBufferCanvas) {
    const sx = Math.max(0, cx), sy = Math.max(0, cy);
    const sxEnd = Math.min(bgBufferCanvas.width, cx + CANVAS_W);
    const syEnd = Math.min(bgBufferCanvas.height, cy + CANVAS_H);
    const sw = Math.max(0, sxEnd - sx), sh = Math.max(0, syEnd - sy);
    if (sw > 0 && sh > 0) {
      const dx = sx - cx, dy = sy - cy;
      ctx.drawImage(bgBufferCanvas, sx, sy, sw, sh, dx, dy, sw, sh);
    }
  }

  // tiles — animated tiles, portal pads ('P') and boss markers ('B')
  const col0 = Math.floor(cx / TS), row0 = Math.floor(cy / TS);
  for (let row = row0; row <= row0 + CANVAS_H / TS + 1; row++) {
    for (let col = col0; col <= col0 + CANVAS_W / TS + 1; col++) {
      if (row < 0 || col < 0 || row >= G.map.height || col >= G.map.width) continue;
      const ch = tileChar(col, row), info = G.legend[ch];
      if (!info) continue;
      const isAnim = (TILE_PHASES[info.type] || 1) > 1;
      if (isAnim || ch === 'P' || ch === 'B') {
        const x = col * TS - cx, y = row * TS - cy;
        if (!drawTile(info.type, x, y)) { ctx.fillStyle = info.color; ctx.fillRect(x, y, TS, TS); }
        drawTileEdges(info.type, col, row, x, y);
        if (ch === 'P') { ctx.fillStyle = 'rgba(224,182,76,.30)'; ctx.fillRect(x, y, TS, TS); }
        else if (ch === 'B') { ctx.fillStyle = 'rgba(180,40,40,.30)'; ctx.fillRect(x, y, TS, TS); }
      }
    }
  }

  // portals — glowing pad + label ring
  for (const pt of G.portals) {
    const x = pt.x * TS - cx + TS / 2, y = pt.y * TS - cy + TS / 2;
    ctx.strokeStyle = THEME.palette.accentAlt; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x, y, TS / 2 + 2 * Math.sin(now() / 250), 0, 7); ctx.stroke();
  }

  // Dimensional Rift Tear
  if (incursionSystem.getState() === INCURSION_STATES.TEAR_OPEN) {
    const tear = incursionSystem.getCurrentTear();
    if (tear && tear.mapId === G.mapId) {
      riftRenderer.drawRiftTear(ctx, tear, G.cam, now(), CANVAS_W, CANVAS_H);
    }
  } else if (incursionSystem.getState() === INCURSION_STATES.INCURSION_ACTIVE) {
    const activeInc = incursionSystem.getActiveIncursion();
    if (activeInc && activeInc.mapId === G.mapId) {
      riftRenderer.drawRiftTear(ctx, activeInc, G.cam, now(), CANVAS_W, CANVAS_H);
    }
  }

  // Gathering & Fishing nodes
  const curDayPhase = G.dayPhaseOverride ?? ((now() % TUNING.dayCycleMs) / TUNING.dayCycleMs);
  const gatherNodes = gatheringSystem.getNodesForMap(G.mapId, { dayPhase: curDayPhase, weatherId: G.weather?.id });
  gatheringRenderer.drawGatherNodes(ctx, gatherNodes, G.cam, now(), CANVAS_W, CANVAS_H);

  drawGroundEffects();
  combatFx.drawTelegraphs(cx, cy);

  // ---- entities: depth-sorted (2.5D overlap) with ground shadows ----
  const drawables = [];
  for (const n of G.npcs) drawables.push({ y: n.y * TS + TS / 2, draw: () => drawNpc(n, cx, cy) });
  for (const m of G.monsters) if (m.alive) drawables.push({ y: m.y, draw: () => drawMonster(m, cx, cy) });
  if (G.petFollower) drawables.push({ y: G.petFollower.y, draw: () => petsFx.drawFollower(ctx, G.petFollower, G.cam, now(), CANVAS_W, CANVAS_H) });
  drawables.push({ y: p.y, draw: () => drawPlayer(p, cx, cy) });
  drawables.sort((a, b) => a.y - b.y);
  for (const d2 of drawables) d2.draw();

  drawEffects();   // attack/spell visual effects on top
  drawAtmosphere();
  drawDayNight();
  drawFloaties();  // damage numbers on top of everything
  if (incursionSystem.getState() === INCURSION_STATES.INCURSION_ACTIVE) {
    const activeInc = incursionSystem.getActiveIncursion();
    if (activeInc && activeInc.mapId === G.mapId) {
      riftRenderer.drawIncursionHud(ctx, activeInc, CANVAS_W, CANVAS_H, now());
    }
  }
  const activeFishing = gatheringSystem.getActiveFishing();
  if (activeFishing?.active) {
    gatheringRenderer.drawFishingHud(ctx, activeFishing, CANVAS_W, CANVAS_H, now());
  }
  const target=G.target;
  if(target?.alive){
    const x=target.x-cx,y=target.y-cy;
    if(x<0||y<0||x>CANVAS_W||y>CANVAS_H){
      const angle=Math.atan2(y-CANVAS_H/2,x-CANVAS_W/2);
      const radius=Math.min((CANVAS_W/2-18)/Math.max(.001,Math.abs(Math.cos(angle))),(CANVAS_H/2-18)/Math.max(.001,Math.abs(Math.sin(angle))));
      ctx.save();ctx.translate(CANVAS_W/2+Math.cos(angle)*Math.max(0,radius),CANVAS_H/2+Math.sin(angle)*Math.max(0,radius));ctx.rotate(angle);
      ctx.fillStyle='#ffd24d';ctx.strokeStyle='#19120d';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(9,0);ctx.lineTo(-7,-7);ctx.lineTo(-7,7);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
    }
  }
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
  const curWeather = weatherSystem.getWeather(G?.mapId);
  if (curWeather && curWeather.id !== 'clear') {
    weatherRenderer.drawWeather(G?.mapId, curWeather);
    return;
  }
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
  // idle-breathe rather than the old walk-frames-0/1 shuffle-in-place
  if (!drawLpc(LPC.npc[n.role], x, y + 8, 'idle', 'down', animFrame('idle', now()), 64)) {
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
  drawEliteAura(ctx, m, x, y, s, now());
  if (m.enraged) {   // pulsing red aura while enraged
    ctx.strokeStyle = '#ff3b2f'; ctx.lineWidth = 2 + Math.abs(Math.sin(now() / 110)) * 2;
    ctx.globalAlpha = 0.75; ctx.beginPath(); ctx.arc(x, y, s * 0.62, 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
  }
  const a = monsterAnim(m);
  // legacy matrices aren't left-right symmetric (one-sided markings) — only frame-set
  // art (Tasks 5-9) is drawn flip-aware; flipping a legacy monster would visibly mirror it.
  const flip = Array.isArray(PX.monster[m.def.id]) ? false : m.facingLeft;
  if (!drawPx('monster', m.def.id, x, y, s, flip, a.state, a.frame)) { ctx.fillStyle = m.def.spriteColor; ctx.fillRect(x - s / 2, y - s / 2, s, s); }
  drawEliteShield(ctx, m, x, y, s, now());
  if (m === G.target) { ctx.strokeStyle = THEME.palette.danger; ctx.lineWidth = 2; ctx.strokeRect(x - s / 2 - 3, y - s / 2 - 3, s + 6, s + 6); }
  const w = s, hpw = w * (m.hp / m.maxHp);
  ctx.fillStyle = '#000'; ctx.fillRect(x - w / 2, y - s / 2 - 8, w, 4);
  ctx.fillStyle = THEME.palette.hpRed; ctx.fillRect(x - w / 2, y - s / 2 - 8, hpw, 4);
  // name label — level prefix + boss/elite colour-coding
  const boss = m.def.sizeTiles >= 2;
  const eliteBadge = m.eliteTier === 'elite' ? ' [★ ELITE]' : (m.eliteTier === 'champion' ? ' [★ CHAMPION]' : '');
  const label = `Lv${m.lvl} ${boss ? '☠ ' : ''}${T(m.def.name, 'monsters')}${eliteBadge}`;
  const nameColor = m.eliteTier === 'elite' ? '#ffcc00' : (m.eliteTier === 'champion' ? '#5bc0de' : monsterNameColor(m));
  labelText(label, x, y - s / 2 - 12, nameColor, (boss || m.eliteTier) ? 'bold 12px sans-serif' : '10px sans-serif');
  const statusName = { stun: 'STUN', burn: 'BURN', slow: 'SLOW', mark: 'MARK', sunder: 'BROKEN' };
  const statuses = Object.keys(m.statuses).filter(id => liveStatus(m, id) && statusName[id]).map(id => statusName[id]);
  if (statuses.length) labelText(statuses.join(' · '), x, y - s / 2 - 24, '#9fe6ff', 'bold 8px sans-serif');
  const affixLabels = m.eliteAffixes?.map(a => a.toUpperCase().replace('_', ' '));
  if (affixLabels?.length) {
    labelText(affixLabels.join(' · '), x, y - s / 2 - (statuses.length ? 34 : 24), '#ffd54f', 'bold 8px sans-serif');
  }
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
      const col = { blade: '#c9d1e0', berserker: '#e0714b', mage: '#6f7bef', ranger: '#5fbf7a', paladin: '#f0e6c0', monk: '#d4a359', elementalist: '#9d7be0' }[p.combatClass];
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
  drawMoltenHazards(ctx, eliteSystem.getHazards(), cx, cy, now());
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
  syncModalPause();
  const dt = Math.max(0,Math.min(0.05, (t - last) / 1000)); last = t;
  step(dt);
  render();
  renderMinimap();
  updateHud();
  requestAnimationFrame(frame);
}

function step(dt) {
  if (gameClock.isPaused()) return;
  if (G.physicsSuspended) return;
  const p = G.player;
  if (G.jobChoiceOpen) return; // the permanent choice is readable because the world is truly paused
  weatherSystem.update(dt, G?.mapId);
  G.weather = weatherSystem.getWeather(G?.mapId);
  if (G.petFollower) {
    petsFx.updateFollower(G.petFollower, p, dt);
  }

  // Incursion subsystem update
  const adventureMaps = ['whispering_woods', 'sunken_ruins', 'frostpeak_tundra', 'dragon_caldera'];
  const isIntenseWeather = ['cosmic_eclipse', 'stellar_drift', 'ashfall', 'biting_blizzard', 'verdant_rain'].includes(G.weather?.id);
  incursionSystem.tick(dt, { activeMapId: G.mapId, isIntenseWeather });

  if (incursionSystem.getState() === INCURSION_STATES.IDLE && incursionSystem.getCooldownRemaining() <= 0 && adventureMaps.includes(G.mapId)) {
    const rx = clamp(p.x + (Math.random() < 0.5 ? 1 : -1) * (4 + Math.floor(Math.random() * 3)) * TS, TS * 2, (G.map.width - 2) * TS);
    const ry = clamp(p.y + (Math.random() < 0.5 ? 1 : -1) * (4 + Math.floor(Math.random() * 3)) * TS, TS * 2, (G.map.height - 2) * TS);
    incursionSystem.triggerTear({ mapId: G.mapId, x: rx, y: ry });
    toast(`⚡ ${T('A Dimensional Tear has ruptured nearby!', 'ui')}`, 'bad');
  } else if (incursionSystem.getState() === INCURSION_STATES.TEAR_OPEN) {
    const tear = incursionSystem.getCurrentTear();
    if (tear && tear.mapId === G.mapId && dist(p.x, p.y, tear.x, tear.y) < TS * 1.5) {
      triggerIncursionStart();
    }
  } else if (incursionSystem.getState() === INCURSION_STATES.INCURSION_ACTIVE) {
    const activeInc = incursionSystem.getActiveIncursion();
    if (activeInc) {
      if (activeInc.mutator?.id === 'void_decay' && now() >= (activeInc._nextDecayAt || 0)) {
        activeInc._nextDecayAt = now() + 2000;
        p.hp = Math.max(1, p.hp - 15);
        floatText(p.x, p.y, 15, 'enemy');
      }
      if (activeInc.mutator?.id === 'graviton_well') {
        const d = dist(p.x, p.y, activeInc.x, activeInc.y);
        if (d > TS && d < TS * 8) {
          const pull = dt * 15;
          const angle = Math.atan2(activeInc.y - p.y, activeInc.x - p.x);
          p.x += Math.cos(angle) * pull;
          p.y += Math.sin(angle) * pull;
        }
      }
    }
  } else if (incursionSystem.getState() === INCURSION_STATES.COLLAPSED) {
    G.monsters = G.monsters.filter(mo => !mo._incursionMob);
    toast(`💀 ${T('The Dimensional Rift has collapsed!', 'ui')}`, 'bad');
    logMsg('The incursion was not sealed in time — the rift collapsed into oblivion.', 'bad');
    incursionSystem.resetToIdle();
  } else if (incursionSystem.getState() === INCURSION_STATES.SEALED) {
    G.monsters = G.monsters.filter(mo => !mo._incursionMob);
    incursionSystem.resetToIdle();
  }

  // Gathering & Fishing subsystem tick
  const curDayPhase = G.dayPhaseOverride ?? ((now() % TUNING.dayCycleMs) / TUNING.dayCycleMs);
  gatheringSystem.tick(dt, { activeMapId: G.mapId, dayPhase: curDayPhase, weatherId: G.weather?.id });
  
  // Windstream environment tick
  const tx = Math.floor(p.x / TS), ty = Math.floor(p.y / TS);
  if (tileChar(tx, ty) === '^' && now() >= (p.windImmunityUntil || 0)) {
    if (walkableAt(p.x, p.y - TS)) {
      p.y -= TS;
    }
    p.windImmunityUntil = now() + 1000;
  }

  // Exploration tile tracking
  if (ExplorationSystem.recordStep(G.exploration, G.mapId, tx, ty)) {
    const zonePkg = ZONE_PACKAGES[G.mapId];
    if (zonePkg?.WHISPERING_WOODS_EXPLORATION?.pois) {
      for (const poi of zonePkg.WHISPERING_WOODS_EXPLORATION.pois) {
        if (Math.abs(poi.x - tx) <= 1 && Math.abs(poi.y - ty) <= 1) {
          if (ExplorationSystem.unlockPOI(G.exploration, G.mapId, poi.id)) {
            toast(`📍 Discovered Landmark: ${poi.name}!`, 'good');
            MasterySystem.addPoints(G.mastery, G.mapId, 20);
          }
        }
      }
    }
  }

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
  // regen a trickle of MP (Mana Surge rift mutator speeds this up)
  const manaSurge = G.rift.active && G.mapId === 'celestial_rift' && G.rift.mutatorId === 'mana_surge';
  p.mp = clamp(p.mp + 3 * dt * (manaSurge ? TUNING.rift.manaSurgeMult : 1), 0, p.maxMp);
  // Volcanic Ticks (rift mutator): a small periodic burn while the run is active
  if (G.rift.active && G.mapId === 'celestial_rift' && G.rift.mutatorId === 'volcanic_ticks' && now() >= (G.rift.nextBurnAt || 0)) {
    G.rift.nextBurnAt = now() + TUNING.rift.burnEveryMs;
    if (!p.godMode) {
      p.hp = clamp(p.hp - TUNING.rift.burnTickDmg, 0, p.maxHp);
      floatText(p.x, p.y, TUNING.rift.burnTickDmg, 'enemy');
      if (p.hp <= 0) { playerDeath(); return; }
    }
  }
  // town rest: safe maps (no spawns) heal body and mind quickly — the rift's
  // empty spawns array is a wave-count technicality, not a safe town, so exclude it
  if (!G.map.spawns.length && G.mapId !== 'celestial_rift') {
    p.hp = clamp(p.hp + p.maxHp * 0.06 * dt, 0, p.maxHp);
    p.mp = clamp(p.mp + p.maxMp * 0.06 * dt, 0, p.maxMp);
  }

  if (!G.manualIntent && G.huntTargetId && G.target && G.targetSource !== 'manual' && G.target.def.id !== G.huntTargetId) {
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

  // One objective-aware acquisition path handles focused and free Hunt.
  if (G.autoFarm && !G.manualIntent && !dlg && (!G.target || !G.target.alive)) acquireAutoTarget(p);

  const S = TUNING.stamina;
  p.stamina = Math.min(S.max, (p.stamina ?? S.max) + S.regenPerSec * dt);

  // movement — WASD/arrows take priority and cancel any click-to-move
  const k = G.keys;
  let dx = 0, dy = 0;
  if (k['a'] || k['arrowleft']) dx -= 1;
  if (k['d'] || k['arrowright']) dx += 1;
  if (k['w'] || k['arrowup']) dy -= 1;
  if (k['s'] || k['arrowdown']) dy += 1;
  if(touchJoystickState.active){dx+=touchJoystickState.normX;dy+=touchJoystickState.normY;}
  const isSlowed = Boolean(p.slowUntil && now() < p.slowUntil);
  const spd = 130 * (p.moveMult || 1) * (isSlowed ? 0.6 : 1) * dt;   // AGI quickens the step
  const mx0 = p.x, my0 = p.y;                        // for walk-animation detection
  if (dx || dy) {                                   // WASD/arrows override click-to-move
    G.path = null;
    G.manualIntent = null;
    const len = Math.hypot(dx, dy) || 1;
    faceToward(p, p.x + dx, p.y + dy);
    moveEntity(p, (dx / len) * spd, (dy / len) * spd, 12);
  } else if (G.target && G.target.alive && !(p._autoHoldUntil > now())) { // chase unless a recovery zone asks us to hold
    const d = dist(p.x, p.y, G.target.x, G.target.y);
    if (d <= p.basicRange * TS + G.target.size / 2 - 4) { G.path = null; }  // in range → stop & auto-attack
    else {
      if (!G.path || now() >= (p._repathAt || 0)) {
        const routed = pathTo(G.target.x, G.target.y);
        p._repathAt = now() + 400;
        if (!routed || !G.path) {
          const abandoned = G.target;
          abandoned._autoSkipUntil = now() + 3000;
          G.target = null; G.targetSource = null; G.path = null;
          if (G.autoFarm) setAutoState('search', T('Searching', 'ui'), T('Skipped unreachable {name}.', 'ui').replace('{name}', T(abandoned.def.name, 'monsters')));
        }
      }
      if (G.target && !followPath(p, G.path, spd, 12)) G.path = null;
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
  } else if (G.manualIntent?.type === 'incursion_tear') {
    const tear = incursionSystem.getCurrentTear();
    if (!tear || tear.mapId !== G.mapId) {
      G.manualIntent = null;
    } else if (dist(p.x, p.y, tear.x, tear.y) < TS * 2) {
      G.path = null;
      G.manualIntent = null;
      triggerIncursionStart();
    } else if (!G.path) {
      G.manualIntent = null;
    }
  } else if (G.manualIntent?.type === 'fishing_ripple') {
    const intent = G.manualIntent;
    if (dist(p.x, p.y, intent.x, intent.y) < TS * 2.5) {
      G.path = null;
      G.manualIntent = null;
      gatheringSystem.startFishing(intent.id, { mapId: G.mapId, weatherId: G.weather?.id });
      toast(`🎣 ${T('Cast line! Press SPACE or tap to reel in!', 'ui')}`, 'good');
      AUDIO.playSfx('pickup');
    } else if (!G.path) {
      G.manualIntent = null;
    }
  } else if (G.manualIntent?.type === 'gather_node') {
    const intent = G.manualIntent;
    if (dist(p.x, p.y, intent.x, intent.y) < TS * 2.0) {
      G.path = null;
      G.manualIntent = null;
      const curDayPhase = G.dayPhaseOverride ?? ((now() % TUNING.dayCycleMs) / TUNING.dayCycleMs);
      const res = gatheringSystem.harvestNode(intent.id, { dayPhase: curDayPhase });
      if (res?.items) {
        for (const it of res.items) addItem(it.id, it.qty);
        const firstDef = itemById[res.items[0]?.id];
        toast(`🌿 ${T('Harvested', 'ui')} ${firstDef ? T(firstDef.name, 'items') : 'resource'}!`, 'good');
        AUDIO.playSfx('pickup');
      }
    } else if (!G.path) {
      G.manualIntent = null;
    }
  }

  if (G.taskGuide?.mode === 'npc' && G.taskGuide.mapId === G.mapId) {
    const npc = G.npcs.find(n => n.id === G.taskGuide.npcId);
    if (npc && dist(p.x, p.y, npc.x * TS + TS / 2, npc.y * TS + TS / 2) < TS * 1.6) {
      finishTaskGuide();
      interact();
    }
  }

  combatFx.update(dt);
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
// canvas-drawn damage numbers — a DOM div per hit thrashed layout under cleave/AOE/burn ticks.
const FLOAT_CAP = 80, FLOAT_LIFE_MS = 850, FLOAT_RISE_PX = 24;
// ponytail: fixed cap + drop-oldest, no pooling — 80 concurrent floaties never happens outside a screenshot stress test
const FLOAT_FONT_STACK = 'ui-monospace,"SFMono-Regular",Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace';
function floatText(worldX, worldY, text, kind, tag = '') {
  combatFx.addFloatText(worldX, worldY, text, kind, tag);
}
function floatColor(kind) {
  if (typeof kind === 'string' && (kind.startsWith('#') || kind.startsWith('rgb'))) return kind;
  const dt = G.highContrast ? COMBAT.damageTextHC : COMBAT.damageText;
  if (kind === 'enemy') return dt.enemyColor;
  if (kind === 'crit') return dt.critColor;
  if (kind === 'dmg') return dt.playerColor;
  if (kind === 'heal') return dt.healColor;
  if (kind === 'weakness') return '#5bc0de';
  if (kind === 'resist') return '#aaaaaa';
  if (kind === 'detonate') return '#ff8800';
  if (kind === 'status') return '#e0a0ff';
  if (kind === 'miss') return '#bbb';
  return '#fff';
}
function drawFloaties() {
  combatFx.drawFloaties(G.cam.x, G.cam.y);
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
  const TOAST_MAX = 4;
  const existing = document.querySelectorAll('.toast') || [];
  if (existing.length >= TOAST_MAX && existing[0]?.remove) existing[0].remove();
  const setIndex = (target, idx) => {
    if (!target?.style) return;
    if (typeof target.style.setProperty === 'function') target.style.setProperty('--toast-index', idx);
    else target.style['--toast-index'] = idx;
  };
  (document.querySelectorAll('.toast') || []).forEach((t, i) => setIndex(t, i));
  const el = document.createElement('div');
  el.className = 'toast' + (kind ? ` line--${kind}` : '');
  el.textContent = text;
  setIndex(el, (document.querySelectorAll('.toast') || []).length);
  document.body.appendChild(el);
  setTimeout(() => {
    if (el?.remove) el.remove();
    (document.querySelectorAll('.toast') || []).forEach((t, i) => setIndex(t, i));
  }, 3200);
}
function showZoneBanner(map, firstVisit) {
  document.querySelector('.zone-banner')?.remove();
  const el = document.createElement('div'); el.className = 'zone-banner' + (firstVisit ? ' discovery' : '');
  el.innerHTML = `<small>${firstVisit ? (currentLang === 'th' ? 'ค้นพบดินแดนใหม่ · ' : 'NEW DISCOVERY · ') : ''}${esc(T(map.chronicle.province, 'maps'))}</small><b>${esc(T(map.name, 'maps'))}</b><em>${esc(T(map.chronicle.epithet, 'maps'))}</em><span>${esc(T(map.ambient, 'maps'))}</span>`;
  document.body.appendChild(el);
  setTimeout(() => el.classList.add('leaving'), 2100);
  setTimeout(() => el.remove(), 2700);
}
let touchJoystickState = { active: false, touchId: null, startX: 0, startY: 0, normX: 0, normY: 0 };

function isTouchDevice() {
  return typeof window !== 'undefined' && (
    'ontouchstart' in window ||
    (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0)
  );
}

let touchInput=null;
let touchDisposers=[];
function clearInput() {
  G.keys={}; touchInput?.clear();
  touchJoystickState.active=false;touchJoystickState.normX=touchJoystickState.normY=0;
  G.path=null;G.manualIntent=null;G.target=null;G.targetSource=null;
}
function pauseGame(reason) {
  const wasPaused=gameClock.isPaused();
  gameClock.pause(reason);
  if(!wasPaused){clearInput();G.autoFarm=false;AUDIO.pausePlayback();}
}
function resumeGameFromPause(reason) {
  const wasPaused=gameClock.isPaused();
  gameClock.resume(reason);
  if(wasPaused&&!gameClock.isPaused()){last=performance.now();AUDIO.resumePlayback();}
}
function syncModalPause() {
  if(!G.running)return;
  const modal=G.jobChoiceOpen||dlg||document.querySelectorAll('.panel, .slot-picker, .job-choice-overlay, .overlay-cut, #hud .hud-menu.open').length>0;
  if(modal)pauseGame('modal');else resumeGameFromPause('modal');
}
function pauseForInterruption() {
  if(!G.running)return;
  G.taskGuide=null;G.huntTargetId=null;
  pauseGame('interruption');saveGame();
  let el=document.getElementById('resume-game');
  if(!el){el=document.createElement('button');el.id='resume-game';el.className='btn';
    el.style.cssText='position:fixed;z-index:100;top:45%;left:50%;transform:translate(-50%,-50%);min-height:56px;padding:18px 32px';
    el.onclick=()=>{if(document.hidden)return;el.remove();resumeGameFromPause('interruption');};
    document.body.appendChild(el);
  }
  el.textContent=T('Game paused','ui')+' · '+T('Resume','ui');
}
function dispatchPlayerAction(role) {
  syncModalPause();
  if(!G.running||!G.player||G.player.hp<=0||gameClock.isPaused())return false;
  if(role.startsWith('slot:')){
    const slot=Number(role.slice(5));if(!Number.isInteger(slot)||slot<0||slot>8)return false;
    if(!G.player.hotbar[slot]){openSlotPicker(slot);syncModalPause();return true;}
    return useHotbarSlot(slot);
  }
  return ({attack:playerBasicAttack,dodge:performDodge,parry:performParry,interact})[role]?.();
}
function initTouchControls() {
  touchInput?.dispose();touchDisposers.forEach(fn=>fn());touchDisposers=[];
  let container=document.getElementById('touch-controls');
  if(!container){container=document.createElement('div');container.id='touch-controls';document.body.appendChild(container);}
  container.className='touch-controls';
  const pref=G.player?.features?.touch||'auto';
  container.style.display=(pref==='on'||pref==='auto'&&isTouchDevice())?'flex':'none';
  container.innerHTML='<div class="touch-zone" data-role="move" aria-label="Move"><div class="touch-joystick-base"><div class="touch-joystick-knob"></div></div></div><div class="touch-action-buttons">'+
    Array.from({length:9},(_,i)=>hotbarSlotHtml(G.player.hotbar[i],i).replace('class="','data-role="slot:'+i+'" class="touch-action-btn ')).join('')+
    ['attack','dodge','parry','interact'].map(role=>'<button type="button" class="touch-action-btn" data-role="'+role+'">'+T({attack:'Attack',dodge:'Dodge',parry:'Parry',interact:'Interact'}[role],'ui')+'</button>').join('')+'</div>';
  const knob=container.querySelector('.touch-joystick-knob');
  touchInput=createInputController({
    move:(x,y)=>{touchJoystickState.active=!!(x||y);touchJoystickState.normX=x;touchJoystickState.normY=y;if(knob)knob.style.transform='translate('+(x*45)+'px,'+(y*45)+'px)';},
    action:dispatchPlayerAction,
    blocked:()=>!G.running||G.player.hp<=0||gameClock.isPaused(),
  });
  const bind=(el,type,fn)=>{el.addEventListener(type,fn);touchDisposers.push(()=>el.removeEventListener(type,fn));};
  container.querySelectorAll('[data-role]').forEach(el=>{
    bind(el,'pointerdown',e=>{e.preventDefault();syncModalPause();el.setPointerCapture?.(e.pointerId);touchInput.pointerDown(e.pointerId,el.dataset.role,e.clientX,e.clientY);});
    bind(el,'pointermove',e=>touchInput.pointerMove(e.pointerId,e.clientX,e.clientY));
    for(const type of ['pointerup','pointercancel','lostpointercapture'])bind(el,type,e=>touchInput.pointerUp(e.pointerId));
    if(el.dataset.role!=='move')bind(el,'click',e=>{if(e.detail===0)dispatchPlayerAction(el.dataset.role);});
  });
}

// =====================================================================
// HUD
// =====================================================================
function buildHud() {
  const p = G.player;
  $('#hud').innerHTML = `
    <div class="hud">
      <div id="danger-vignette" class="danger-vignette"></div>
      <div class="level-badge"><span class="hud-crest">${CLASS_CREST[p.combatClass] || 'A'}</span><small>${T('LV', 'ui')}</small><b id="hud-level">1</b></div>
      <div class="stat-stack">
        <div class="bar hp-bar" role="progressbar" aria-label="${T('Health', 'ui')}"><div class="fill" id="hp-fill"></div><div class="shield-fill" id="shield-fill"></div><div class="label" id="hp-label"></div></div>
        <div class="bar mp-bar" role="progressbar" aria-label="${T('Mana', 'ui')}"><div class="fill" id="mp-fill"></div><div class="label" id="mp-label"></div></div>
        <div class="bar stamina-bar" role="progressbar" aria-label="${T('Stamina', 'ui')}" title="${T('Stamina — Space to dodge roll, V to parry', 'ui')}"><div class="fill" id="stamina-fill"></div></div>
        <div class="hud-identity"><span id="hud-name"></span><span class="hud-sep">◆</span><span id="hud-job"></span><span class="hud-sep">◆</span><span class="hud-coin">G</span><span id="hud-zeny"></span></div>
      </div>
      <div id="boss-frame" class="boss-frame" style="display:none">
        <div class="boss-portrait"><span id="boss-icon">☠</span></div>
        <div class="boss-details">
          <div class="boss-header">
            <b id="boss-name"></b>
            <div id="boss-weaknesses" class="boss-weaknesses"></div>
          </div>
          <div class="bar boss-hp-bar"><div class="fill" id="boss-hp-fill"></div><div class="label" id="boss-hp-label"></div></div>
          <div class="bar boss-stagger-bar"><div class="fill" id="boss-stagger-fill"></div></div>
        </div>
      </div>
      <div class="minimap"><canvas id="minimap-canvas" width="136" height="136"></canvas><div id="minimap-name" style="position:absolute;bottom:2px;left:6px;font-size:10px;color:var(--text-muted)"></div><div id="minimap-weather" style="position:absolute;top:2px;right:6px;font-size:10px;font-weight:600;pointer-events:auto;cursor:help"></div></div>
      <button id="mobile-menu-btn" class="mobile-menu-btn btn btn--ghost" type="button" aria-label="${T('Menu', 'ui')}">
        <span class="m-icon">☰</span> <span class="m-label">${T('Menu', 'ui')}</span><span id="mobile-menu-badge" class="hud-badge-dot" style="display:none"></span>
      </button>
      <div class="quest-tracker" id="quest-tracker" tabindex="0" role="region" aria-label="${T('Active quests and bounties', 'ui')}"></div>
      <button class="auto-status" id="auto-status" data-panel="automation" type="button" hidden aria-live="polite">
        <span class="auto-status__icon" aria-hidden="true">◎</span><span class="auto-status__copy"><b></b><small></small></span><span class="auto-status__gear" aria-hidden="true">⚙</span>
      </button>
      <div class="msg-log" id="msg-log"></div>
      <div class="hotbar-shell">
        <div id="momentum-pips" class="momentum-pips" title="${T('Damage skills build Momentum. Finishers consume it.', 'ui')}">
          <span class="momentum-label">${T('Momentum', 'ui')}</span><span class="momentum-track"></span><span class="momentum-state"></span>
        </div>
        <div class="hotbar" aria-label="${T('Action bar', 'ui')}"></div>
        <button class="hotbar-config" id="hotbar-config" title="${T('Customize action keys', 'ui')}" aria-label="${T('Customize action keys', 'ui')}">⌨</button>
      </div>
      <div class="bar xp-bar"><div class="fill" id="xp-fill"></div></div>
      <div class="bar job-bar" title="${T('Job XP (1 skill point per level · cap {cap})', 'ui').replace('{cap}', activeJobLevelCap(p))}"><div class="fill" id="job-fill"></div></div>
      <div class="hud-menu">
        <button class="btn btn--ghost" data-panel="char">${T('Status (C)', 'ui')}</button>
        <button class="btn btn--ghost" data-panel="inv">${T('Satchel (I)', 'ui')}</button>
        <button class="btn btn--ghost" data-panel="skills">${T('Abilities (K)', 'ui')}</button>
        <button class="btn btn--ghost" data-panel="quest">${T('Journal (Q)', 'ui')}</button>
        <button class="btn btn--ghost" data-panel="world">${T('World (M)', 'ui')}</button>
        <button class="btn btn--ghost" id="farm-btn">${T('⚔ Hunt (F)', 'ui')}</button>
        <button class="btn btn--ghost" data-panel="automation">${T('⚙ Auto', 'ui')}</button>
        <button class="btn btn--ghost" data-panel="book">📖 ${T('Book (B)', 'ui')}</button>
        <button class="btn btn--ghost" data-panel="adventure">✦ ${T('Adventures', 'ui')}</button>
        <button class="btn btn--ghost" data-panel="guide">${T('Field guide', 'ui')}</button>
        <button class="btn btn--ghost" data-panel="loadouts">${T('Loadouts', 'ui')}</button>
        <button class="btn btn--ghost" data-panel="settings">⚙ ${T('Audio', 'ui')}</button>
        ${G.admin ? `<button class="btn btn--ghost" data-panel="admin" style="color:#ffd24d;border-color:#ffd24d">⚙ ${T('Admin', 'ui')}</button>` : ''}
        <button class="btn btn--ghost" id="lang-btn" title="${T('Change Language', 'ui')}">🌐 ${currentLang === 'th' ? 'EN' : 'TH'}</button>
        <button class="btn btn--ghost" id="mute-btn">🔊</button>
      </div>
    </div>`;
  renderHotbar();
  initTouchControls();
  $('#hud').querySelectorAll('[data-panel]').forEach(b => b.onclick = () => {
    togglePanel(b.dataset.panel);
    $('#hud .hud-menu')?.classList.remove('open');
    $('#mobile-menu-btn')?.classList.remove('active');
  });
  const mBtn = $('#mobile-menu-btn');
  const hMenu = $('#hud .hud-menu');
  if (mBtn && hMenu) {
    mBtn.onclick = (e) => {
      e.stopPropagation();
      AUDIO.playSfx('menu');
      hMenu.classList.toggle('open');
      mBtn.classList.toggle('active', hMenu.classList.contains('open'));
    };
  }
  $('#mute-btn').onclick = e => { G.muted = !G.muted; AUDIO.setMuted(G.muted); e.target.textContent = G.muted ? '🔇' : '🔊'; };
  $('#farm-btn').onclick = () => { toggleFarm(); $('#hud .hud-menu')?.classList.remove('open'); $('#mobile-menu-btn')?.classList.remove('active'); };
  $('#hotbar-config').onclick = () => togglePanel('hotkeys');
  $('#lang-btn').onclick = () => {
    setLanguage(currentLang === 'th' ? 'en' : 'th');
    AUDIO.playSfx('menu');
    buildHud();
    const openPanel = $('#panel');
    if (openPanel) {
      const kind = openPanel.dataset.kind;
      openPanel.querySelector('.panel__head').innerHTML = `${panelTitle(kind)}<button class="panel__close">✕</button>`;
      openPanel.querySelector('.panel__close').onclick = () => { hideSkillTip(); cancelHotkeyRebind(false); if(kind==='guide')closeGuide();else openPanel.remove(); };
      refreshPanel(kind);
    }
  };
  if (currentLang === 'th') {
    $('#hud-name').textContent = `${T(p.className, 'classes')} ${p.name}`;
  } else {
    $('#hud-name').textContent = p.name + ' the ' + p.className;
  }
  updateFarmButton();
  updateAutomationHud();
}
function updateAutomationHud() {
  const el = $('#auto-status');
  if (!el) return;
  const state = G.autoState || { phase: 'idle', label: T('Automation ready', 'ui'), detail: T('Track a task or enable Hunt.', 'ui') };
  const icons = { idle: '◎', route: '➤', search: '⌖', encounter: '!', combat: '⚔', recover: '✚', waiting: '◷', blocked: '⚠' };
  el.dataset.phase = state.phase;
  el.hidden = !automationActive() && state.phase === 'idle';
  if (!el.querySelector('.auto-status__icon')) return;   // HUD not built yet
  el.querySelector('.auto-status__icon').textContent = icons[state.phase] || '◎';
  el.querySelector('b').textContent = state.label;
  el.querySelector('small').textContent = state.detail || '';
  el.title = T('Open Automation Console', 'ui');
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
  setAutoState(G.autoFarm ? 'search' : 'idle', G.autoFarm ? T('Searching', 'ui') : T('Automation ready', 'ui'),
    G.autoFarm ? T('Finding the next safe encounter.', 'ui') : T('Track a task or enable Hunt.', 'ui'));
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
    b.onclick = () => dispatchPlayerAction('slot:'+i);
    b.oncontextmenu = e => { e.preventDefault(); openSlotPicker(i); };
    b.ondragover = e => { if (e.dataTransfer?.types?.includes('text/x-awo-skill')) { e.preventDefault(); b.classList.add('drop-ready'); } };
    b.ondragleave = () => b.classList.remove('drop-ready');
    b.ondrop = e => { const id = e.dataTransfer?.getData('text/x-awo-skill'); b.classList.remove('drop-ready'); if (id) { e.preventDefault(); assignSkillHotbar(id, i); } };
  });
  initTouchControls();
}
// right-click (or click-when-empty) popup to assign/clear a hotbar slot
function openSlotPicker(i) {
  const old = $('#slot-picker'); if (old) old.remove();
  const p = G.player;
  const skillRows = skillsFor(p.combatClass).filter(s => branchAllowsSkill(p, s.id) && skillLevel(p, s.id) > 0)
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
  if ($('#hud-job')) $('#hud-job').textContent = `${T('Job Lv', 'ui')} ${p.jobLevel}/${activeJobLevelCap(p)}`;
  const safeRatio = (value, max) => Number.isFinite(value) && Number.isFinite(max) && max > 0 ? clamp(value / max, 0, 1) : 0;
  const hpRatio = safeRatio(p.hp, p.maxHp), mpRatio = safeRatio(p.mp, p.maxMp);
  $('#hp-fill').style.width = (100 * hpRatio) + '%';
  $('#mp-fill').style.width = (100 * mpRatio) + '%';
  if ($('#stamina-fill')) $('#stamina-fill').style.width = (100 * safeRatio(p.stamina, TUNING.stamina.max)) + '%';
  const need = p.level >= DESIGN.levelCap ? 1 : xpForNext(p.level);
  $('#xp-fill').style.width = (100 * p.xp / need) + '%';
  if ($('#job-fill')) $('#job-fill').style.width = (p.jobLevel >= activeJobLevelCap(p) ? 100 : 100 * p.jobXp / jobXpForNext(p.jobLevel)) + '%';
  const shield = ((p.buffs || []).find(b => b.id === 'draconic_shield' || b.shield)?.shield || 0) + (p.bloodShield || 0);
  if ($('#shield-fill')) $('#shield-fill').style.width = (shield > 0 ? Math.min(100, 100 * shield / p.maxHp) : 0) + '%';
  $('#hp-label').textContent = `HP ${Math.ceil(p.hp)} / ${p.maxHp}${shield > 0 ? ` (+${shield})` : ''}`;
  $('#mp-label').textContent = `MP ${Math.floor(p.mp)} / ${p.maxMp}`;
  // Boss frame update: only show when engaged in combat or nearby
  const boss = (G.monsters || []).find(m => {
    if (!m.alive) return false;
    const isSpecial = m.def?.sizeTiles >= 2 || m.def?.isRareBoss || m.def?.isZoneGuardian || m.def?.isRaidBoss || G.huntTargetId === m.def?.id;
    if (!isSpecial) return false;
    const d = dist(m.x, m.y, p.x, p.y);
    const inCombat = (now() - (m.lastCombatAt || 0) < 6000) || m === G.target;
    return inCombat || d < 12 * TS;
  });
  const bFrame = $('#boss-frame');
  if (bFrame) {
    if (boss && G.running) {
      bFrame.style.display = 'flex';
      const bRatio = clamp(boss.hp / (boss.maxHp || 1), 0, 1);
      const bName = $('#boss-name'); if (bName) bName.textContent = `Lv${boss.lvl || boss.def.level} ${T(boss.def.name, 'monsters')}`;
      const bHpFill = $('#boss-hp-fill'); if (bHpFill) bHpFill.style.width = (100 * bRatio) + '%';
      const bHpLabel = $('#boss-hp-label'); if (bHpLabel) bHpLabel.textContent = `${Math.ceil(100 * bRatio)}%`;
      const elem = typeof monsterElement === 'function' ? monsterElement(boss) : null;
      const bWeak = $('#boss-weaknesses');
      if (bWeak) bWeak.innerHTML = elem ? `<span class="elem-chip">${T(elem, 'ui')}</span>` : '';
    } else {
      bFrame.style.display = 'none';
    }
  }
  const hpBar = document.querySelector('.hp-bar'), mpBar = document.querySelector('.mp-bar');
  if (hpBar) { hpBar.setAttribute('aria-valuenow', Math.ceil(p.hp)); hpBar.setAttribute('aria-valuemax', p.maxHp); }
  if (mpBar) {
    mpBar.setAttribute('aria-valuenow', Math.floor(p.mp)); mpBar.setAttribute('aria-valuemax', p.maxMp);
    mpBar.classList.toggle('low', mpRatio > 0 && mpRatio < 0.25);
    mpBar.classList.toggle('empty', mpRatio <= 0);
    mpBar.title = `Mana ${Math.floor(p.mp)} / ${p.maxMp} · regenerates over time`;
  }
  // hotbar slots: skill cooldown/level/lock, or item quantity
  document.querySelectorAll('#hud .hotbar [data-slot], #touch-controls [data-slot]').forEach(b => {
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
  const mBadge = $('#mobile-menu-badge');
  if (mBadge) mBadge.style.display = (p.statPoints || p.skillPoints) ? 'block' : 'none';
  const dv = $('#danger-vignette');
  if (dv) dv.classList.toggle('danger-active', hpRatio > 0 && hpRatio <= 0.25);
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
  const weatherEl = $('#minimap-weather');
  if (weatherEl) {
    const curW = weatherSystem.getWeather(G?.mapId);
    if (curW) {
      weatherEl.textContent = `${curW.icon} ${T(curW.name, 'ui')}`;
      weatherEl.title = `${T(curW.name, 'ui')}: ${T(curW.desc, 'ui')}`;
    }
  }
  updateAutomationHud();
}

function updateQuestTracker() {
  const el = $('#quest-tracker'); if (!el) return;
  let html = goalTrackerHtml();
  const typeName = (t) => { if (currentLang === 'th') { return { kill: 'กำจัด', collect: 'รวบรวม', explore: 'สำรวจ', talk: 'คุยกับ' }[t] || t; } return t; };
  if (G.advance) {
    const a = G.advance, o = a.def.objective, done = advanceProgress() >= o.count;
    const finalChoice = a.ti === 2;
    html += a.choiceReady
      ? `<button class="task-link job-choice-ready" ${finalChoice ? 'data-advanced-job-choice="1"' : 'data-job-choice="1"'} style="margin-bottom:6px;padding-bottom:6px;border-bottom:1px solid rgba(224,182,76,.35)"><b style="color:#f0d47d">✦ ${T(finalChoice ? 'Choose Third Job' : 'Choose Second Job', 'ui')}</b><br><span>${T('Your trial is complete. Choose one permanent specialization.', 'ui')}</span></button>`
      : `<button class="task-link${G.taskGuide?.source === 'advance' ? ' active' : ''}" data-task="advance" title="${T('Navigate to this task', 'ui')}" style="margin-bottom:6px;padding-bottom:6px;border-bottom:1px solid rgba(224,182,76,.35)">
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
  const isCollapsed = el.classList.contains('collapsed');
  const header = `<div class="tracker-header" id="tracker-toggle"><span>📜 ${T('Objectives', 'ui')}</span><span class="tracker-chevron">${isCollapsed ? '▸' : '▾'}</span></div>`;
  el.innerHTML = header + `<div class="tracker-body">${html}</div>`;
  bindGuideLinks(el);
  const tToggle = el.querySelector('#tracker-toggle');
  if (tToggle) {
    tToggle.onclick = (e) => {
      e.stopPropagation();
      el.classList.toggle('collapsed');
      const chev = el.querySelector('.tracker-chevron');
      if (chev) chev.textContent = el.classList.contains('collapsed') ? '▸' : '▾';
    };
  }
  el.querySelectorAll('[data-task]').forEach(task => task.onclick = () => activateTaskGuide(task.dataset.task, task.dataset.taskId));
  el.querySelectorAll('[data-job-choice]').forEach(button => button.onclick = () => showJobChoice(G.player));
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
  el.querySelector('.panel__close').onclick = () => { hideSkillTip(); cancelHotkeyRebind(false); if(id==='guide')closeGuide();else el.remove(); };

  // Task 1.4: Focus trap cycling inside .panel elements
  el.addEventListener('keydown', e => {
    if (e.key === 'Tab') {
      const focusables = Array.from(el.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter(item => !item.disabled && item.offsetWidth > 0);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  const closeBtn = el.querySelector('.panel__close');
  if (closeBtn && typeof closeBtn.focus === 'function') {
    closeBtn.focus();
  }

  wirePanel(id, el);
  AUDIO.playSfx('menu');
}
function panelTitle(id) { return T({ guide:'Field guide', loadouts:'Loadouts', adventure:'Adventures', char: 'Status', inv: 'Satchel', skills: 'Abilities', hotkeys: 'Action Keybindings', quest: 'Quest Journal', world: 'World Chronicle', automation: 'Automation Console', guild: "Adventurer's Guild", shop: 'Trader', admin: 'Admin Tools', settings: 'Settings & Audio', book: 'Collection Book' }[id], 'ui'); }

const ADMIN_GROUPS = [
  ['🧍 Character', [
    ['lvl5', '+5 Base Levels'], ['job5', '+5 Job Levels'], ['points', '+10 Stat & Skill pts'],
    ['heal', 'Full Heal'], ['god', 'Toggle God Mode'], ['learnall', 'Learn All Skills'],
    ['promote', 'Force Class Advance'],
  ]],
  ['💰 Wealth & Gear', [
    ['zeny', '+5000 Zeny'], ['legw', 'Legendary Weapon'], ['lega', 'Legendary Armor'],
    ['potions', '+10 of each Potion'], ['frags', '+20 Refine Fragments & Ore'], ['refineworn', 'Max-refine Worn Gear (+9)'],
    ['expandall', 'Expand All Sockets (4)'], ['runes', '+5 of each Elemental Rune'],
  ]],
  ['🏰 Quests & Guild', [
    ['skipquest', 'Complete Current Story Quest'], ['guildpts', '+50 Guild Points'],
    ['bountydone', 'Finish & Claim All Bounties'], ['board', 'Refresh Guild Board & Shop'],
  ]],
  ['🗺 World & Dungeons', [
    ['town', 'Warp: Town'], ['woods', 'Warp: Woods'], ['ruins', 'Warp: Ruins'],
    ['tundra', 'Warp: Tundra'], ['caldera', 'Warp: Caldera'], ['rift', 'Warp: Rift'],
    ['warpgoblin', 'Warp: Goblin Cave'], ['warpelder', 'Warp: Elder Hollow'],
    ['warpboss', 'Warp to Zone Guardian'], ['spawnboss', 'Spawn Guardian Here'],
    ['killall', 'Kill All Monsters'], ['respawnall', 'Respawn All Monsters'],
  ]],
  ['🌟 Expansion & Mastery', [
    ['addmastery', '+100 Zone Mastery Pts'], ['chartmap', 'Reveal 100% Map Fog'],
    ['completedailies', 'Complete All Dailies'], ['rerolldailies', 'Reroll Daily Challenges'],
    ['spawnrare', 'Spawn Rare Beast (Fang)'], ['cyclediff', 'Cycle Difficulty (N/H/NM)'],
    ['spawnrift', 'Spawn Dimensional Tear'], ['sealrift', 'Seal Active Incursion'],
    ['resetgather', 'Reset Gather Nodes'], ['catchfish', '+1 of All Fish'],
  ]],
  ['🎴 Monster Cards & Bestiary', [
    ['givecardalbum', '+1 Old Card Album'], ['givecard:card_slime', '+1 Slime Card'],
    ['givecard:card_nullking', '+1 Nullking Card'], ['giveallcards', '+1 All Cards'],
    ['resetbestiary', 'Reset Bestiary'],
  ]],
];
function adminAction(a, val) {
  const p = G.player;
  if (a === 'setweather' || a?.startsWith?.('setweather:')) {
    const wId = val || (a.startsWith('setweather:') ? a.slice('setweather:'.length) : 'clear');
    weatherSystem.setWeatherOverride(G.mapId, wId);
    G.weather = weatherSystem.getWeather(G.mapId);
    recompute(p);
    updateHud();
    toast(`Weather set to: ${wId}`, 'good');
  }
  else if (a === 'expandall') {
    for (const slot of EQUIP_SLOTS) {
      const it = p.equip[slot];
      if (it) {
        if (!Array.isArray(it.sockets)) it.sockets = [];
        while (it.sockets.length < 4) it.sockets.push(null);
      }
    }
    recompute(p);
    updateHud();
    toast('Expanded all worn gear to 4 sockets.', 'good');
  }
  else if (a === 'runes') {
    for (const rid of ['rune_ember', 'rune_glacial', 'rune_storm', 'rune_verdant', 'rune_luminous', 'rune_umbral']) {
      addStack(rid, 5);
    }
    toast('+5 of each Elemental Rune added.', 'good');
  }
  else if (a === 'expandsocket') {
    expandSockets(val);
  }
  else if (a === 'lvl5') { for (let i = 0; i < 5; i++) { if (p.level < DESIGN.levelCap) { p.level++; p.statPoints += PROGRESSION.statPointsPerLevel; } if (p.jobLevel < activeJobLevelCap(p)) { p.jobLevel++; p.skillPoints += PROGRESSION.skillPointsPerLevel; } } recompute(p, true); maybeStartAdvance(p); maybeStartPendingQuest(); }
  else if (a === 'job5') { const gained = Math.min(5, activeJobLevelCap(p) - p.jobLevel); p.jobLevel += gained; p.skillPoints += gained; if (p.jobLevel >= activeJobLevelCap(p)) p.jobXp = 0; toast(`Job Lv ${p.jobLevel}/${activeJobLevelCap(p)} (+${gained} skill points).`, 'good'); }
  else if (a === 'zeny') p.zeny += 5000;
  else if (a === 'points') { p.statPoints += 10; p.skillPoints += 10; }
  else if (a === 'heal') { p.hp = p.maxHp; p.mp = p.maxMp; }
  else if (a === 'god') { p.godMode = !p.godMode; toast('God mode ' + (p.godMode ? 'ON' : 'off'), p.godMode ? 'good' : 'sys'); }
  else if (a === 'learnall') { for (const s of skillsFor(p.combatClass)) if (branchAllowsSkill(p, s.id)) p.skillLevels[s.id] = PROGRESSION.skillTree[s.id]?.maxLevel || 1; recompute(p); }
  else if (a === 'legw') { p.inventory.push(rollItem('hero_blade', 0, 'legendary')); logMsg('Spawned Legendary Otherworld Blade.', 'good'); }
  else if (a === 'lega') { p.inventory.push(rollItem('guardian_plate', 0, 'legendary')); logMsg('Spawned Legendary Guardian Plate.', 'good'); }
  else if (a === 'potions') { addStack('minor_potion', 10); addStack('mid_potion', 10); addStack('mana_potion', 10); addStack('greater_potion', 10); }
  else if (a === 'frags') { for (const id of [...REFINE_FRAG, 'blessed_ore']) addStack(id, 20); logMsg('+20 Beast Fang / Shade Dust / Star Iron / Blessed Ore.', 'good'); }
  else if (a === 'refineworn') { for (const slot of EQUIP_SLOTS) if (p.equip[slot]) p.equip[slot].plus = 9; recompute(p); toast('All worn gear refined to +9.', 'good'); }
  else if (a === 'promote') { const t = PROGRESSION.tiers[p.classId]; if (p.tierIndex + 1 < t.length) doPromote(p, p.tierIndex + 1, p.jobBranchId || jobBranchConfig(p.classId)?.defaultId); else toast('Already max tier.', 'sys'); }
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
  else if (a === 'warpgoblin') loadMap('ww_goblin_cave', 1, 1);
  else if (a === 'warpelder') loadMap('ww_elder_hollow', 1, 1);
  else if (a === 'addmastery') {
    MasterySystem.addPoints(G.mastery, G.mapId, 100);
    toast(`+100 Mastery Points added to ${G.map.name}!`, 'good');
  }
  else if (a === 'chartmap') {
    if (G.exploration) {
      if (!G.exploration.discoveredTiles[G.mapId]) G.exploration.discoveredTiles[G.mapId] = {};
      for (let r = 0; r < G.map.height; r++) {
        for (let c = 0; c < G.map.width; c++) {
          G.exploration.discoveredTiles[G.mapId][`${c},${r}`] = true;
        }
      }
      toast(`Mapped 100% of ${G.map.name}!`, 'good');
    }
  }
  else if (a === 'completedailies') {
    if (G.dailies && G.dailies.activeDailies) {
      G.dailies.activeDailies.forEach(c => { c.progress = c.required; c.completed = true; });
      toast('All daily challenges marked completed!', 'good');
    }
  }
  else if (a === 'rerolldailies') {
    refreshDailies(true);
    toast('Rerolled new daily challenges!', 'sys');
  }
  else if (a === 'spawnrare') {
    const rareDef = monById['wolf'] || monById['slime'];
    const beast = makeMonster(rareDef, p.x + 48, p.y, rareDef.level + 2);
    beast.name = 'Fang, the Bloodthirsty';
    beast.hp = beast.maxHp = Math.round(beast.hp * 2.5);
    beast.atk = Math.round(beast.atk * 1.5);
    beast.color = '#ff3344';
    G.monsters.push(beast);
    toast('Spawned Rare Hunt: Fang, the Bloodthirsty!', 'bad');
  }
  else if (a === 'cyclediff') {
    const tiers = ['NORMAL', 'HARD', 'NIGHTMARE'];
    const current = (G.zoneDifficulty[G.mapId]||'normal').toUpperCase();
    const nextIdx = (tiers.indexOf(current) + 1) % tiers.length;
    setZoneDifficulty(G.mapId, tiers[nextIdx]);
    toast(`Zone Difficulty set to: ${tiers[nextIdx]}`, 'good');
  }
  else if (a === 'spawnrift') {
    const rx = clamp(p.x + 48, TS * 2, (G.map.width - 2) * TS);
    const ry = clamp(p.y, TS * 2, (G.map.height - 2) * TS);
    incursionSystem.triggerTear({ mapId: G.mapId, x: rx, y: ry });
    toast('Admin: Spawned Dimensional Tear nearby!', 'bad');
  }
  else if (a === 'sealrift') {
    if (incursionSystem.getState() === INCURSION_STATES.INCURSION_ACTIVE) {
      incursionSystem.sealIncursion();
      addItem('rift_cache', 1);
      toast('Admin: Sealed Incursion and granted Dimensional Cache!', 'good');
    }
  }
  else if (a === 'resetgather' || a === 'spawngather') {
    gatheringSystem.deserialize(null);
    toast('Resource nodes reset!', 'good');
  }
  else if (a === 'catchfish') {
    for (const fid of ['glowing_trout', 'abyssal_bass', 'glacial_salmon', 'magma_koi', 'stormfin', 'golden_carp']) {
      addItem(fid, 1);
    }
    toast('Granted 1 of every fish!', 'good');
  }
  else if (a === 'givecardalbum') {
    addItem('old_card_album', 1);
    toast('+1 Old Card Album added.', 'good');
  }
  else if (a === 'givecard' || a?.startsWith?.('givecard:')) {
    const cardId = val || (a.startsWith('givecard:') ? a.slice('givecard:'.length) : 'card_slime');
    if (CONTENT.items[cardId]) {
      addItem(cardId, 1);
      cardsSystem.recordCardAcquired(G.bestiary, cardId);
      toast(`+1 ${cardId} added.`, 'good');
    }
  }
  else if (a === 'giveallcards') {
    for (const cardId of Object.keys(CARD_CATALOG)) {
      addItem(cardId, 1);
      cardsSystem.recordCardAcquired(G.bestiary, cardId);
    }
    toast('Added 1 of every monster card.', 'good');
  }
  else if (a === 'resetbestiary') {
    G.bestiary = cardsSystem.deserialize(null);
    toast('Bestiary reset.', 'good');
  }
  recompute(p); renderHotbar(); updateHud();
}

// transmog: cosmetic-only icon swap — options are every owned item that shares
// this equipment slot (bag + currently equipped), plus the item's own true id.
function transmogOptionsHtml(p, slot, inst) {
  const ids = new Set([inst.itemId]);
  for (const e of p.inventory) if (e.uid && itemSlot(itemById[e.itemId]) === slot) ids.add(e.itemId);
  for (const s of EQUIP_SLOTS) if (p.equip[s] && itemSlot(itemById[p.equip[s].itemId]) === slot) ids.add(p.equip[s].itemId);
  const current = dispItemId(inst);
  return [...ids].map(id => `<option value="${id}" ${id === current ? 'selected' : ''}>${esc(T(itemById[id].name, 'items'))}</option>`).join('');
}
// paper-doll: 7 equipment slots with icons; click a filled slot to unequip
function paperDoll(p) {
  return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:5px">` + EQUIP_SLOTS.map(slot => {
    const inst = p.equip[slot], it = inst ? itemById[inst.itemId] : null, rc = inst ? itemRarity(inst) : null;
    const icon = inst ? itemIconImg(dispItemId(inst), 26)
      : `<img src="${pxDataURL('item', SLOT_ICON[slot])}" width="26" height="26" style="image-rendering:pixelated;opacity:.22;flex:0 0 26px" alt="">`;
    const stat = inst ? itemMainStatsHtml(inst) : T('empty', 'ui');
    const bonus = inst ? itemAffixesHtml(inst, p) : '';
    const sockets = inst ? socketDotsHtml(inst) : '';
    const transmog = inst ? `<select class="transmog-select" data-transmog="${inst.uid}" title="${T('Transmog appearance', 'ui')}" style="font-size:10px;max-width:90px">${transmogOptionsHtml(p, slot, inst)}</select>` : '';
    return `<div class="doll-slot" ${inst ? `data-unequip="${slot}" title="${T('Unequip', 'ui')} ${esc(instName(inst))}"` : ''}>
      ${icon}<div style="font-size:10px;line-height:1.25;overflow:hidden">
        <span style="color:var(--text-muted)">${T(SLOT_LABEL[slot], 'ui')}</span><br>
        ${inst ? `<b style="color:${rc.color}">${esc(instName(inst))}</b> <small style="color:${rc.color}">◆${rc.name}</small>${sockets}<br><span style="color:var(--text)">${stat}</span><div class="gear-bonuses gear-bonuses--slot">${bonus}</div>${transmog}` : `<span style="color:var(--text-muted)">${stat}</span>`}
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
  const cc = p.combatClass, tree = PROGRESSION.skillTree;
  // Keep every class skill visible; rejected branch/final-job nodes are sealed
  // in place so players can understand what the unchosen path contains.
  const actives = skillsFor(cc);
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
    const incompatible = isPassive
      ? !!pa.reqAdvancedJob && pa.reqAdvancedJob !== p.advancedJobId
      : (!!node.reqBranch && !!p.jobBranchId && !branchAllowsSkill(p, id)) || (!!node.reqAdvancedJob && !!p.advancedJobId && !advancedJobAllowsSkill(p, id));
    const reqTier = isPassive ? (pa.reqTier || 0) : (node?.reqTier || 0);
    let currentCap = isPassive ? max : skillCapForTier(node, p.tierIndex);
    if (p.tierIndex < reqTier) currentCap = Math.min(currentCap, 1);   // Ascension preview: rank 1 only pre-promotion
    const tierCapped = !maxed && lv >= currentCap;
    const state = incompatible ? 'locked incompatible' : maxed ? 'maxed' : tierCapped ? 'owned tier-capped' : lv > 0 ? 'owned' : clickable ? 'ready' : 'locked';
    const glyph = isPassive ? '◈' : (SKILL_GLYPH[s.type] || '✦');
    const name = isPassive ? T(pa.name, 'passives') : T(s.name, 'skills');
    const attr = clickable ? (isPassive ? `data-passive="${id}"` : `data-learn="${id}"`) : '';
    const [role, roleClass] = isPassive ? [T('PASSIVE', 'ui'), 'passive'] : roleFor(s);
    const drag = !isPassive && lv > 0 ? `draggable="true" data-drag-skill="${id}"` : '';
    const req = incompatible
      ? (pa?.reqAdvancedJob || node?.reqAdvancedJob ? `${T('Exclusive to', 'ui')} ${esc(T((advancedJobsFor(p.classId).find(job => job.id === (pa?.reqAdvancedJob || node?.reqAdvancedJob))?.name || (pa?.reqAdvancedJob || node?.reqAdvancedJob)), 'classes'))}` : T('Incompatible job path', 'ui'))
      : isPassive
      ? `${T('Job Lv', 'ui')} ${pa.reqLevel}${pa.reqTier && p.tierIndex < pa.reqTier ? ` · ${clickable || tierCapped ? T('Ascension preview', 'ui') : T('Job advancement required', 'ui')}` : ''}`
      : node.reqSkill
        ? `${T('Requires', 'ui')} ${esc(T((COMBAT.skills.find(x => x.id === node.reqSkill.id) || {}).name || node.reqSkill.id, 'skills'))} Lv ${node.reqSkill.lvl}${node.reqBranch ? ` · ${esc(T(jobBranchesFor(p.classId).find(branch => branch.id === node.reqBranch)?.tiers?.[1]?.name || node.reqBranch, 'classes'))}` : ''}`
        : T('Starter skill · granted free', 'ui');
    const status = incompatible ? T('INCOMPATIBLE', 'ui') : maxed ? T('MAXED', 'ui') : tierCapped ? T('MASTERY CAP', 'ui') : lv > 0 ? T('LEARNED', 'ui') : clickable ? T('LEARN +', 'ui') : T('LOCKED', 'ui');
    return `<button type="button" class="ro-skill ${state}${clickable ? ' can' : ''} is-${roleClass}" ${attr} ${drag} data-skill="${id}" data-kind="${isPassive ? 'passive' : 'active'}" data-tier="${reqTier}">
      <span class="ro-skill-icon">${glyph}<i>${lv}/${max}</i></span>
      <span class="ro-skill-copy"><b>${esc(name)}</b><small>${req}</small><em>${isPassive ? esc(T(pa.desc, 'passives').replace('{v}', pa.per * Math.max(1, lv))) : `${T('Job Lv', 'ui')} ${node.reqLevel} · ${T(role, 'ui')}`}</em></span>
      <span class="ro-skill-state">${status}</span></button>`;
  };

  const selectedBranch = jobBranchFor(p, false);
  const selectedAdvancedJob = advancedJobFor(p, false);
  const stageLabels = [T('FIRST JOB', 'ui'), T('SECOND JOB', 'ui'), T('ADVANCED JOB', 'ui')];

  const lanes = [0, 1, 2].map(tier => {
    const activeSet = actives.filter(s => (tree[s.id]?.reqTier || 0) === tier)
      .sort((a, b) => (tree[a.id].reqLevel - tree[b.id].reqLevel) || a.name.localeCompare(b.name));
    const passiveSet = passives.filter(pa => (pa.reqTier || 0) === tier)
      .sort((a, b) => (a.reqLevel - b.reqLevel) || a.name.localeCompare(b.name));
    const unlocked = p.tierIndex >= tier;
    const tierName = tier === 0 ? PROGRESSION.tiers[p.classId]?.[0]?.name
      : tier === 1 ? selectedBranch?.tiers?.[1]?.name || T('Choose at Lv 15', 'ui')
      : selectedAdvancedJob?.name || T('Choose at Lv 40', 'ui');

    let contentHtml = '';
    if (tier === 2) {
      // Branch layout for Tier 3
      const defaultJob = advancedJobsFor(p.classId)[0];
      const altJob = advancedJobsFor(p.classId)[1];
      const isDefault = p.advancedJobId === defaultJob?.id;
      const isAlt = p.advancedJobId === altJob?.id;

      const actDefault = activeSet.filter(s => tree[s.id]?.reqAdvancedJob === defaultJob?.id || (!tree[s.id]?.reqAdvancedJob && (!p.advancedJobId || isDefault)));
      const actAlt = activeSet.filter(s => tree[s.id]?.reqAdvancedJob === altJob?.id || (!tree[s.id]?.reqAdvancedJob && (!p.advancedJobId || isAlt)));
      const passDefault = passiveSet.filter(pa => pa.reqAdvancedJob === defaultJob?.id || (!pa.reqAdvancedJob && (!p.advancedJobId || isDefault)));
      const passAlt = passiveSet.filter(pa => pa.reqAdvancedJob === altJob?.id || (!pa.reqAdvancedJob && (!p.advancedJobId || isAlt)));

      contentHtml = `<div class="ro-third-branches">
        <div class="ro-third-branch${isAlt ? ' incompatible' : ''}" data-advanced-job="${defaultJob?.id || ''}">
          <div class="ro-branch-label">${esc(T(defaultJob?.name || '', 'classes'))}</div>
          <div class="ro-lane-label">◆ ${T('ACTIVE SKILLS', 'ui')}</div>
          <div class="ro-skill-list">${actDefault.map(s => cardHtml(s)).join('') || `<small class="ro-empty">${T('No active skills.', 'ui')}</small>`}</div>
          <div class="ro-lane-label passive">◈ ${T('PASSIVE MASTERIES', 'ui')}</div>
          <div class="ro-skill-list passive-list">${passDefault.map(pa => cardHtml(pa, true)).join('') || `<small class="ro-empty">${T('No passive masteries.', 'ui')}</small>`}</div>
        </div>
        <div class="ro-third-branch${isDefault ? ' incompatible' : ''}" data-advanced-job="${altJob?.id || ''}">
          <div class="ro-branch-label">${esc(T(altJob?.name || '', 'classes'))}</div>
          <div class="ro-lane-label">◆ ${T('ACTIVE SKILLS', 'ui')}</div>
          <div class="ro-skill-list">${actAlt.map(s => cardHtml(s)).join('') || `<small class="ro-empty">${T('No active skills.', 'ui')}</small>`}</div>
          <div class="ro-lane-label passive">◈ ${T('PASSIVE MASTERIES', 'ui')}</div>
          <div class="ro-skill-list passive-list">${passAlt.map(pa => cardHtml(pa, true)).join('') || `<small class="ro-empty">${T('No passive masteries.', 'ui')}</small>`}</div>
        </div>
      </div>`;
    } else {
      contentHtml = `
      <div class="ro-lane-label">◆ ${T('ACTIVE SKILLS', 'ui')}</div>
      <div class="ro-skill-list">${activeSet.map(s => cardHtml(s)).join('') || `<small class="ro-empty">${T('No active skills in this chapter.', 'ui')}</small>`}</div>
      <div class="ro-lane-label passive">◈ ${T('PASSIVE MASTERIES', 'ui')}</div>
      <div class="ro-skill-list passive-list">${passiveSet.map(pa => cardHtml(pa, true)).join('') || `<small class="ro-empty">${T('No passive masteries in this chapter.', 'ui')}</small>`}</div>`;
    }

    return `<section class="ro-job-lane${unlocked ? ' unlocked' : ' locked-job'}" data-tier="${tier}">
      <header><span>0${tier + 1}</span><div><small>${stageLabels[tier]}</small><b>${esc(T(tierName || stageLabels[tier], 'classes'))}</b></div><i>${unlocked ? T('UNLOCKED', 'ui') : T('PROMOTION REQUIRED', 'ui')}</i></header>
      ${contentHtml}
    </section>`;
  }).join('');

  const g = p._cls.statGrowthPerLevel;
  const header = `<header class="ro-book-head"><div class="ro-crest">${book.crest}</div><div class="ro-book-title">
      <small>${T('CLASS SKILL MANUAL', 'ui')} · ${esc(T(p.className, 'classes'))}</small><h3>${esc(T(book.title, 'ui'))}</h3>
      <b>${esc(T(book.focus, 'ui'))}</b><p>${esc(T(book.motto, 'ui'))}</p></div>
    <div class="ro-book-stats"><strong>${p.skillPoints}<small>${T('SKILL POINTS', 'ui')}</small></strong><span>${T('Job Lv', 'ui')} ${p.jobLevel}/${activeJobLevelCap(p)}</span><span>${T('Recommended build:', 'ui')} <b>${recommendedBuild(g)}</b></span></div>
    <div class="ro-book-radar">${svgRadar(g)}</div></header>`;
  const resetNote = `<aside class="ro-reset-note"><span>↺</span><div><b>${T('RESET YOUR BUILD', 'ui')}</b><small>${T('Soul Ledger and Memory Prism are sold by Marla. Reset items preserve your level, gear, and rebirth bonuses.', 'ui')}</small></div></aside>`;
  const guide = `<details class="skill-guide"><summary>${T('COMBAT COMBO GUIDE', 'ui')} <small>${T('Build, setup, detonate, then finish.', 'ui')}</small></summary>${combatLoopHtml(p, actives)}</details>`;
  const branchIdentity = (p.jobBranchId && selectedBranch?.mechanic) ? `<section class="ro-branch-identity">
    <header><small>${T('BRANCH IDENTITY', 'ui')}</small><b>${esc(T(selectedBranch.label, 'classes'))} · ${esc(T(selectedBranch.mechanic.name, 'ui'))}</b></header>
    <p>${esc(T(selectedBranch.mechanic.desc, 'ui'))}</p>
    <div class="ro-branch-combo"><small>${T('CORE COMBO', 'ui')}</small><div class="flow-skills">${selectedBranch.combo.map(id => COMBAT.skills.find(s => s.id === id)).filter(Boolean).map(s => skillFlowChip(s, p)).join('')}</div></div>
  </section>` : '';

  return `<div class="ro-skill-book" style="--book-accent:${book.color};--book-deep:${book.deep}">${header}${branchIdentity}
    <div class="ro-skill-graph-wrap">
      <div class="ro-skill-graph" id="skill-graph">
        <svg class="ro-skill-lines" id="skill-lines" aria-hidden="true"></svg>
        ${lanes}
      </div>
    </div>
    ${resetNote}${guide}</div>`;
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
    const previewable = lv === 0 && p.tierIndex < (pa.reqTier || 0) && canPreview(p, id, pa.reqTier);
    if (p.tierIndex < (pa.reqTier || 0) && !previewable) {
      const used = lv === 0 ? previewSlotUsedBy(p) : null;
      if (used && used !== id) {
        needs.push(currentLang === 'th' ? `ช่องพรีวิวถูกใช้โดย ${previewSlotName(used)}` : `preview slot used by ${previewSlotName(used)}`);
      } else {
        const tierName = tierForPlayer(p, pa.reqTier, true)?.name;
        needs.push(currentLang === 'th' ? `เปลี่ยนอาชีพเป็น ${T(tierName, 'classes') || `ระดับ ${pa.reqTier + 1}`}` : `advance to ${tierName || `Tier ${pa.reqTier + 1}`}`);
      }
    }
    if (p.jobLevel < pa.reqLevel) {
      needs.push(currentLang === 'th' ? `เลเวลงาน ${pa.reqLevel}` : `Job Lv ${pa.reqLevel}`);
    }
    if (!p.skillPoints) {
      needs.push(currentLang === 'th' ? `แต้มสกิล 1 แต้ม` : '1 skill point');
    }
    const need = needs.length ? `<div class="tip-gate">🔒 ${currentLang === 'th' ? 'ต้องการ' : 'Requires'}: ${needs.join(', ')}</div>` : '';
    const previewNote = (previewable || (lv > 0 && p.tierIndex < (pa.reqTier || 0)))
      ? `<div class="tip-mastery">✦ ${currentLang === 'th' ? `พรีวิวสายอาชีพถัดไป — จำกัดเลเวล 1 จนกว่าจะเลื่อนขั้น` : `Ascension preview — capped at Rank 1 until you advance (one at a time)`}</div>`
      : '';

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
      <div class="tip-flav">${currentLang === 'th' ? 'เพิ่มโบนัสสถานะถาวร — ทำงานตลอดเวลา' : 'Permanent stat bonus — always on.'}</div>${need}${previewNote}${hint}`;
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
  const previewable = rankGate && rankGate.nextRank === 1 && canPreview(p, id, rankGate.reqTier);
  if (rankGate && p.tierIndex < rankGate.reqTier && !previewable) {
    const used = rankGate.nextRank === 1 ? previewSlotUsedBy(p) : null;
    if (used && used !== id) {
      gates.push(currentLang === 'th' ? `ช่องพรีวิวถูกใช้โดย ${previewSlotName(used)}` : `preview slot used by ${previewSlotName(used)}`);
    } else {
      const tierName = tierForPlayer(p, rankGate.reqTier, true)?.name;
      gates.push(currentLang === 'th' ? `เปลี่ยนอาชีพเป็น ${T(tierName, 'classes') || `ระดับ ${rankGate.reqTier + 1}`}` : `advance to ${tierName || `Tier ${rankGate.reqTier + 1}`}`);
    }
  }
  if (node.reqBranch && !branchAllowsSkill(p, id)) {
    const required = jobBranchesFor(p.classId).find(branch => branch.id === node.reqBranch);
    gates.push(currentLang === 'th' ? `เลือกเส้นทาง ${T(required?.tiers?.[1]?.name || node.reqBranch, 'classes')}` : `choose ${required?.tiers?.[1]?.name || node.reqBranch}`);
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
  } else if (previewable || (lv > 0 && rankGate && p.tierIndex < rankGate.reqTier)) {
    masteryHtml = `<div class="tip-mastery">✦ ${currentLang === 'th' ? `พรีวิวสายอาชีพถัดไป — จำกัดเลเวล 1 จนกว่าจะเลื่อนขั้น` : `Ascension preview — capped at Rank 1 until you advance (one at a time)`}</div>`;
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

  return `<div class="tip-name">${T(s.name, 'skills')} <small style="color:var(--text-muted)">· ${displayType}${s.effect ? ` · ${currentLang === 'th' ? 'มอบสถานะ' : 'inflicts'} ${displayEffect}` : ''}</small> ${elementChip(skillElement(s))}${s.classId === 'paladin' && isDamageSkill(s) ? ` <small style="color:#ffe9a6">✨ ${currentLang === 'th' ? 'ศักดิ์สิทธิ์เมื่อได้รับพร' : 'holy while Blessed'}</small>` : ''}</div>
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
  const currentTab = G._chronicleTab || 'road';
  const tabNav = `
    <div class="chronicle-tabs" style="display:flex;gap:8px;margin-bottom:12px;border-bottom:1px solid rgba(255,255,255,0.15);padding-bottom:8px">
      <button class="btn btn--ghost chronicle-tab-btn ${currentTab === 'road' ? 'active' : ''}" data-chronicle-tab="road" style="font-weight:bold;${currentTab === 'road' ? 'background:rgba(92,107,192,0.4);border-color:#7986cb;' : ''}">
        🗺 ${T('Roads of the Outworlder', 'ui')}
      </button>
      <button class="btn btn--ghost chronicle-tab-btn ${currentTab === 'bestiary' ? 'active' : ''}" data-chronicle-tab="bestiary" style="font-weight:bold;${currentTab === 'bestiary' ? 'background:rgba(92,107,192,0.4);border-color:#7986cb;' : ''}">
        📖 ${T('Bestiary Codex', 'ui')}
      </button>
      <button class="btn btn--ghost chronicle-tab-btn ${currentTab === 'companions' ? 'active' : ''}" data-chronicle-tab="companions" style="font-weight:bold;${currentTab === 'companions' ? 'background:rgba(92,107,192,0.4);border-color:#7986cb;' : ''}">
        🐾 ${T('Companions & Familiars', 'ui')}
      </button>
    </div>
  `;

  if (currentTab === 'bestiary') {
    return `<section class="world-chronicle" style="max-width:860px">
      <header class="world-head" style="margin-bottom:10px">
        <div>
          <small>${T('AETHERIA · ECOLOGICAL ARCHIVES', 'ui')}</small>
          <h2>${T('Bestiary Codex', 'ui')}</h2>
          <p>${T('Documented species, hunting mastery, drop records, and monster card affinities.', 'ui')}</p>
        </div>
      </header>
      ${tabNav}
      <div class="bestiary-body">
        ${cardsUI.renderBestiaryTab(G.bestiary, { selectedZone: G._bestiaryZone || 'woods', selectedMonsterId: G._bestiaryMonsterId || null })}
      </div>
    </section>`;
  }

  if (currentTab === 'companions') {
    return `<section class="world-chronicle" style="max-width:860px">
      <header class="world-head" style="margin-bottom:10px">
        <div>
          <small>${T('AETHERIA · COMPANION SANCTUARY', 'ui')}</small>
          <h2>${T('Companions & Familiars', 'ui')}</h2>
          <p>${T('Loyal beasts and bonded familiars granting passive auras and auto-loot perks.', 'ui')}</p>
        </div>
      </header>
      ${tabNav}
      <div class="companions-body">
        ${petsUI.renderCompanionsTab(G.pets, G.player?.inventory || [])}
      </div>
    </section>`;
  }

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
    ${tabNav}
    <div class="world-road">${nodes}</div>
    <footer class="world-foot"><span>◆ ${T('current location', 'ui')}</span><span>✓ ${T('guardian conquered', 'ui')}</span><span>${T('Route guidance follows real portals', 'ui')}</span></footer>
  </section>`;
}

function automationPanelHtml(p = G.player) {
  G.autoConfig = normaliseAutoConfig(G.autoConfig);
  const cfg = G.autoConfig, state = G.autoState || {};
  const focus = G.huntTargetId
    ? T(monById[G.huntTargetId]?.name || G.huntTargetId, 'monsters')
    : G.taskGuide ? translateAny(G.taskGuide.label, ['monsters', 'npcs', 'maps'])
    : cfg.targetId ? `${T(monById[cfg.targetId]?.name || cfg.targetId, 'monsters')} (${T('pinned', 'ui')})`
    : T('Free Hunt', 'ui');
  const toggle = (key, label, copy, glyph) => `<button class="auto-toggle${cfg[key] ? ' active' : ''}" data-auto-toggle="${key}" aria-pressed="${cfg[key]}">
    <span class="auto-toggle__glyph">${glyph}</span><span><b>${T(label, 'ui')}</b><small>${T(copy, 'ui')}</small></span><em>${cfg[key] ? T('ON', 'ui') : T('OFF', 'ui')}</em></button>`;
  const profiles = Object.entries(TUNING.automationProfiles).map(([id, profile]) => {
    const label = id[0].toUpperCase() + id.slice(1);
    return `<button class="auto-profile${cfg.profile === id ? ' active' : ''}" data-auto-profile="${id}" aria-pressed="${cfg.profile === id}"><b>${T(label, 'ui')}</b><small>${T('Heal skill {heal}% · HP potion {hp}% · MP potion {mp}%', 'ui')
      .replace('{heal}', Math.round(profile.healSkillAt * 100)).replace('{hp}', Math.round(profile.hpPotionAt * 100)).replace('{mp}', Math.round(profile.mpPotionAt * 100))}</small></button>`;
  }).join('');

  // Target pin: any monster species currently present on this map, mirroring the
  // same monsterId-focus mechanic quest guides already use (acquireAutoTarget).
  const mapSpecies = [...new Map(G.monsters.map(m => [m.def.id, m])).values()];
  const targetHtml = mapSpecies.length ? `<div class="auto-target-grid">
      <button class="auto-target${!cfg.targetId ? ' active' : ''}" data-auto-target="free" aria-pressed="${!cfg.targetId}"><b>${T('Free Hunt', 'ui')}</b><small>${T('Any nearby monster', 'ui')}</small></button>
      ${mapSpecies.map(m => `<button class="auto-target${cfg.targetId === m.def.id ? ' active' : ''}" data-auto-target="${esc(m.def.id)}" aria-pressed="${cfg.targetId === m.def.id}"><b>${esc(T(m.def.name, 'monsters'))}</b><small>Lv ${m.lvl}</small></button>`).join('')}
    </div>` : `<small class="auto-empty">${T('No monsters present on this map to pin.', 'ui')}</small>`;

  // Skill priority: a fixed rotation of drop slots (hotbar-style drag target) fed
  // by the player's learned, non-heal actives; unranked skills keep using chooseAutoSkill's heuristic.
  const rotationSkills = skillsFor(p.combatClass).filter(sk => branchAllowsSkill(p, sk.id) && sk.type !== 'heal' && skillLevel(p, sk.id) > 0);
  const priority = cfg.priority.filter(id => rotationSkills.some(sk => sk.id === id));
  const pool = rotationSkills.filter(sk => !priority.includes(sk.id));
  const chip = sk => `<span class="auto-skill-chip" draggable="true" data-drag-skill="${sk.id}" data-add-priority="${sk.id}" title="${esc(T('Drag or click to rank', 'ui'))}">${SKILL_GLYPH[sk.type] || '✦'} ${esc(T(sk.name, 'skills'))}</span>`;
  const slotHtml = Array.from({ length: AUTO_PRIORITY_SLOTS }, (_, i) => {
    const sk = rotationSkills.find(s => s.id === priority[i]);
    return `<div class="auto-slot${sk ? ' filled' : ''}" data-auto-slot="${i}"><span class="auto-slot__rank">${i + 1}</span>
      ${sk ? `<span class="auto-slot__skill" draggable="true" data-drag-skill="${sk.id}">${SKILL_GLYPH[sk.type] || '✦'} ${esc(T(sk.name, 'skills'))}</span><button class="auto-slot__clear" data-auto-slot-clear="${i}">×</button>`
        : `<span class="auto-slot__empty">${T('Drop a skill here', 'ui')}</span>`}</div>`;
  }).join('');
  const poolHtml = pool.length ? pool.map(chip).join('') : `<small class="auto-empty">${T('All learned skills are ranked.', 'ui')}</small>`;

  return `<section class="automation-console">
    <header class="automation-live" data-phase="${esc(state.phase || 'idle')}"><span>◎</span><div><small>${T('LIVE DECISION', 'ui')}</small><b>${esc(state.label || T('Automation ready', 'ui'))}</b><em>${esc(state.detail || '')}</em></div></header>
    <div class="automation-objective"><span><small>${T('CURRENT OBJECTIVE', 'ui')}</small><b>${esc(focus)}</b></span><span><small>${T('SAFE HUNT LIMIT', 'ui')}</small><b>Lv ${autoHuntLevelCap(p)}</b></span></div>
    <div class="automation-section"><h3>${T('Hunt Target', 'ui')}</h3><p>${T('Pin the species Hunt should chase; quest guides briefly override it.', 'ui')}</p>${targetHtml}</div>
    <div class="automation-section"><h3>${T('Combat Decisions', 'ui')}</h3><p>${T('Tracking owns travel and target choice. Your clicks always take priority.', 'ui')}</p>
      <div class="auto-toggle-grid">${toggle('skills', 'Smart Skills', 'Uses setup, detonators, finishers, buffs, and mana recovery.', '✦')}${toggle('heal', 'Auto Heal', 'Uses learned healing skills before emergency potions.', '✚')}${toggle('potions', 'Auto Potions', 'Chooses the smallest useful HP or MP recovery item.', '◇')}</div></div>
    <div class="automation-section"><h3>${T('Skill Priority', 'ui')}</h3><p>${T('Drag skills into rank order. Automation casts the top ready skill; unranked skills use its own judgment.', 'ui')}</p>
      <div class="auto-slot-grid">${slotHtml}</div><div class="auto-skill-pool">${poolHtml}</div></div>
    <div class="automation-section"><h3>${T('Recovery Profile', 'ui')}</h3><p>${T('Choose how early automation recovers. Potion cooldown is always respected.', 'ui')}</p><div class="auto-profile-grid">${profiles}</div></div>
    <div class="automation-section"><h3>${T('Macro Rules', 'ui')}</h3><p>${T('IF a resource crosses a threshold THEN act. Checked before built-in recovery.', 'ui')}</p>
      <div class="macro-rule-list">${(cfg.rules || []).map((r, i) => `<div class="macro-rule"><code>${T('IF', 'ui')} ${r.when === 'hp_pct' ? 'HP' : 'MP'} ${r.op === '<' ? '&lt;' : '&gt;'} ${Math.round(r.value * 100)}% ${T('THEN', 'ui')} ${r.action === 'use_item' ? `${T('use', 'ui')} ${esc(T(itemById[r.arg]?.name || r.arg, 'items'))}` : r.action === 'cast_skill' ? `${T('cast', 'ui')} ${esc(T(COMBAT.skills.find(s => s.id === r.arg)?.name || r.arg, 'skills'))}` : T('stop hunt', 'ui')}</code><button class="macro-rule__del" data-macro-del="${i}" aria-label="${T('Delete rule', 'ui')}">×</button></div>`).join('')
        || `<small class="auto-empty">${T('No rules yet — automation uses only its built-in judgment.', 'ui')}</small>`}</div>
      <div class="macro-builder">
        <span>${T('IF', 'ui')}</span>
        <select id="macro-when"><option value="hp_pct">HP</option><option value="mp_pct">MP</option></select>
        <select id="macro-op"><option value="<">&lt;</option><option value=">">&gt;</option></select>
        <input id="macro-val" type="number" min="1" max="99" value="35" aria-label="${T('Threshold percent', 'ui')}">%
        <span>${T('THEN', 'ui')}</span>
        <select id="macro-action"><option value="use_item">${T('Use item', 'ui')}</option><option value="cast_skill">${T('Cast skill', 'ui')}</option><option value="stop_hunt">${T('Stop hunt', 'ui')}</option></select>
        <select id="macro-arg">
          <optgroup label="${T('Items', 'ui')}">${[...new Map(p.inventory.filter(s => !s.uid && (itemById[s.itemId]?.hpRestore || itemById[s.itemId]?.mpRestore || itemById[s.itemId]?.type === 'potion')).map(s => [s.itemId, itemById[s.itemId]])).values()].map(it => `<option value="${esc(it.id)}">${esc(T(it.name, 'items'))}</option>`).join('')}</optgroup>
          <optgroup label="${T('Skills', 'ui')}">${rotationSkills.map(sk => `<option value="${esc(sk.id)}">${esc(T(sk.name, 'skills'))}</option>`).join('')}</optgroup>
        </select>
        <button class="btn" id="macro-add">＋ ${T('Add Rule', 'ui')}</button>
      </div>
      <details class="macro-json"><summary>${T('JSON profile (export / import)', 'ui')}</summary>
        <textarea id="macro-json" rows="3" spellcheck="false">${esc(JSON.stringify(cfg.rules || []))}</textarea>
        <button class="btn" id="macro-json-apply">${T('Import JSON', 'ui')}</button></details>
    </div>
    <footer class="automation-foot">⚠ ${T('Death stops Hunt and route guidance. Stronger monsters remain ignored until you choose them manually.', 'ui')}</footer>
  </section>`;
}

function applyHighContrast(on) {
  G.highContrast = !!on;
  if (typeof document !== 'undefined' && document.body) {
    if (G.highContrast) document.body.classList.add('hc-mode');
    else document.body.classList.remove('hc-mode');
  }
}

// ===== Collection Book (hotkey B) — bestiary / items / elements / skills + milestones =====
const BOOK_TABS = [['bestiary', '👹 Bestiary'], ['items', '🎒 Items'], ['elements', '🔮 Elements'], ['skills', '📜 Skills']];
const collectibleItems = () => CONTENT.items.filter(it => isEquip(it.id));

function monsterIconImg(m, sz = 40) {
  const url = pxDataURL('monster', m.id);
  return url ? `<img src="${url}" width="${sz}" height="${sz}" style="image-rendering:pixelated" alt="">`
    : `<span style="display:inline-block;width:${sz}px;height:${sz}px;background:${m.spriteColor};border-radius:4px"></span>`;
}
function bookItemSource(itemId) {
  const from = CONTENT.monsters.filter(m => (m.drops || []).some(d => d.itemId === itemId));
  if (from.length) return `${T('Drops from', 'ui')}: ${from.slice(0, 3).map(m => T(m.name, 'monsters')).join(', ')}`;
  return T('Trader or crafting', 'ui');
}
function milestoneStat(type) {
  if (type === 'kills') return Object.values(G.killCounts).reduce((s, n) => s + n, 0);
  if (type === 'bestiary') return G.seenMonsters.size;
  if (type === 'items') return G.collectedItems.size;
  return 0;
}
function milestoneTarget(mile) {
  if (mile.target > 0) return mile.target;
  if (mile.type === 'bestiary') return CONTENT.monsters.length;
  if (mile.type === 'items') return collectibleItems().length;
  return 1;
}
function claimMilestone(id) {
  const mile = (CONTENT.milestones || []).find(m => m.id === id);
  if (!mile || G.claimedMilestones.has(id)) return false;
  if (milestoneStat(mile.type) < milestoneTarget(mile)) return false;
  G.claimedMilestones.add(id);
  const p = G.player;
  if (mile.reward.zeny) p.zeny += mile.reward.zeny;
  if (mile.reward.itemId) addItem(mile.reward.itemId, 1);
  const parts = [mile.reward.zeny ? `${mile.reward.zeny}z` : null, mile.reward.itemId ? T(itemById[mile.reward.itemId].name, 'items') : null].filter(Boolean).join(' + ');
  toast(`🎁 ${mile.label} — ${T('reward', 'ui')}: ${parts}!`, 'good');
  updateHud(); saveGame(); refreshPanel('book');
  return true;
}
function collectionBookHtml() {
  const tab = BOOK_TABS.some(([k]) => k === G._bookTab) ? G._bookTab : 'bestiary';
  const tabs = BOOK_TABS.map(([k, label]) => `<button class="book-tab${tab === k ? ' active' : ''}" data-book-tab="${k}">${label}</button>`).join('');
  const miles = (CONTENT.milestones || []).map(mile => {
    const have = milestoneStat(mile.type), need = milestoneTarget(mile), done = have >= need, claimed = G.claimedMilestones.has(mile.id);
    const pct = Math.min(100, Math.round(100 * have / need));
    const btn = claimed ? `<span class="mile-claimed">✓ ${T('Claimed', 'ui')}</span>`
      : done ? `<button class="btn mile-claim" data-mile-claim="${mile.id}">${T('Claim', 'ui')}</button>`
      : `<span class="mile-progress">${have}/${need}</span>`;
    return `<div class="mile-row${claimed ? ' is-claimed' : done ? ' is-ready' : ''}"><span class="mile-ico">${mile.icon}</span>
      <div class="mile-main"><b>${mile.label}</b><div class="mile-bar"><div class="mile-fill" style="width:${pct}%"></div></div></div>${btn}</div>`;
  }).join('');
  return `<section class="collection-book">
    <div class="book-tabs">${tabs}</div>
    <div class="book-pane">${bookTabHtml(tab)}</div>
    <div class="book-milestones"><h3>🏅 ${T('Collection Milestones', 'ui')}</h3>${miles}</div>
  </section>`;
}
function bookTabHtml(tab) {
  if (tab === 'elements') {
    const rows = TUNING.elements.ids.map(el => {
      const w = weakToElement(el);
      return `<div class="elem-row">${elementChip(el)} <span class="elem-vs">${w ? `${T('weak to', 'ui')} ${elementChip(w)} <b>(${TUNING.elements.weaknessMult}×)</b>` : T('Neutral — no weakness', 'ui')}</span></div>`;
    }).join('');
    return `<div class="elem-list"><p class="book-hint">${T('An attack of the listed element deals bonus damage to a monster of that type.', 'ui')}</p>${rows}</div>`;
  }
  if (tab === 'skills') {
    const byClass = {};
    for (const s of COMBAT.skills) (byClass[s.classId] = byClass[s.classId] || []).push(s);
    return Object.entries(byClass).map(([cls, list]) => `<div class="book-skillgroup"><h4>${cls}</h4>${
      list.map(s => { const role = s.finisher ? 'finisher' : s.detonate ? 'detonator' : isDamageSkill(s) ? 'builder' : 'utility';
        return `<div class="book-skill"><b>${T(s.name, 'skills')}</b> ${elementChip(skillElement(s))} <small>${s.type} · ${role}${s.effect ? ` · ${s.effect}` : ''}</small></div>`; }).join('')
    }</div>`).join('');
  }
  if (tab === 'items') {
    const items = collectibleItems();
    return `<div class="book-grid">${items.map(it => {
      const got = G.collectedItems.has(it.id);
      if (!got) return `<div class="book-card locked"><span class="book-lock">🔒</span><b>???</b></div>`;
      const atk = it.atk ? `ATK ${it.atk}` : '', def = it.def ? `DEF ${it.def}` : '';
      return `<div class="book-card"><div class="book-card-head">${itemIconImg(it.id, 28)}<b>${esc(T(it.name, 'items'))}</b></div>
        <small>${[atk, def].filter(Boolean).join(' · ') || ITEM_CAT(it)}</small>
        <small class="book-req">${it.classReq ? itemClassRequirementText(it) : T('All classes', 'ui')}</small>
        <small class="book-src">${bookItemSource(it.id)}</small></div>`;
    }).join('')}</div>`;
  }
  // bestiary (default)
  return `<div class="book-grid">${CONTENT.monsters.map(m => {
    const seen = G.seenMonsters.has(m.id);
    if (!seen) return `<div class="book-card locked"><span class="book-lock">?</span><b>???</b></div>`;
    const el = m.element || 'physical', w = weakToElement(el), kills = G.killCounts[m.id] || 0;
    const drops = (m.drops || []).map(d => esc(T(itemById[d.itemId]?.name || d.itemId, 'items'))).join(', ') || '—';
    return `<div class="book-card"><div class="book-card-head">${monsterIconImg(m, 34)}<b>${esc(T(m.name, 'monsters'))}</b></div>
      <small>Lv ${m.level} · HP ${m.hp} · ATK ${m.atk}</small>
      <small>${elementChip(el)} ${w ? `${T('weak to', 'ui')} ${elementChip(w)}` : ''}</small>
      <small class="book-src">${T('Drops', 'ui')}: ${drops}</small>
      <small class="book-kills">${T('Defeated', 'ui')}: <b>${kills}</b></small></div>`;
  }).join('')}</div>`;
}

function panelBody(id) {
  if(id==='guide')return guidePanelHtml();
  if(id==='loadouts')return loadoutPanelHtml();
  const p = G.player;
  if(id==='adventure') return adventurePanelHtml();
  if (id === 'book') return collectionBookHtml();
  if (id === 'settings') {
    const v = G.audioVolumes || { master: 1.0, music: 0.8, sfx: 1.0 };
    return `<div style="display:flex;flex-direction:column;gap:12px;padding:8px">
      <label>${T('Touch controls','ui')} <select id="touch-preference">${['auto','on','off'].map(value=>`<option value="${value}" ${G.player.features.touch===value?'selected':''}>${T({auto:'Automatic',on:'On',off:'Off'}[value],'ui')}</option>`).join('')}</select></label>
      <div>${T('Assign actions','ui')} ${Array.from({length:9},(_,i)=>`<button class="btn" data-edit-slot="${i}">${i+1}</button>`).join(' ')}</div>
      <div style="font-weight:bold;font-size:14px;color:var(--gold-bright,#f0d47d)">🔊 Volume Controls</div>
      <div class="setting-row">
        <span>Master Volume (<b id="vol-master-val">${Math.round(v.master * 100)}%</b>)</span>
        <input type="range" id="vol-master" min="0" max="1" step="0.05" value="${v.master}" style="width:140px">
      </div>
      <div class="setting-row">
        <span>Music Volume (<b id="vol-music-val">${Math.round(v.music * 100)}%</b>)</span>
        <input type="range" id="vol-music" min="0" max="1" step="0.05" value="${v.music}" style="width:140px">
      </div>
      <div class="setting-row">
        <span>SFX Volume (<b id="vol-sfx-val">${Math.round(v.sfx * 100)}%</b>)</span>
        <input type="range" id="vol-sfx" min="0" max="1" step="0.05" value="${v.sfx}" style="width:140px">
      </div>
      <div style="font-weight:bold;font-size:14px;color:var(--gold-bright,#f0d47d);margin-top:6px">♿ Accessibility & Scaling</div>
      <div class="setting-row">
        <span>UI Scaling (<b id="vol-scale-val">${Math.round((G.uiScale || 1.0) * 100)}%</b>)</span>
        <input type="range" id="vol-scale" min="0.8" max="1.3" step="0.05" value="${G.uiScale || 1.0}" style="width:140px">
      </div>
      <div class="setting-row">
        <span>High Contrast Mode</span>
        <input type="checkbox" id="hc-toggle" ${G.highContrast ? 'checked' : ''}>
      </div>
    </div>`;
  }
  if (id === 'hotkeys') return hotkeysPanelHtml(p);
  if (id === 'world') return worldChronicleHtml();
  if (id === 'automation') return automationPanelHtml(p);
  if (id === 'char') {
    const s = p.stats;
    const tiers = PROGRESSION.tiers[p.classId] || [];
    const branch = jobBranchFor(p, false);
    const nextBase = tiers[p.tierIndex + 1];
    const next = branch ? tierForPlayer(p, p.tierIndex + 1, false) : nextBase;
    
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
    
    const choiceNext = p.tierIndex === 0 && !branch;
    const tierText = currentLang === 'th'
      ? `ระดับอาชีพ ${p.tierIndex + 1}${choiceNext ? ` · เลือกอาชีพขั้นสองที่ Lv ${nextBase?.reqLevel || 15}` : next ? ` · ถัดไป: <b style="color:var(--text)">${T(next.name, 'classes')}</b> ที่ Lv ${next.reqLevel}` : ` · ${T('max advancement', 'ui')}`}`
      : `Tier ${p.tierIndex + 1}${choiceNext ? ` · choose a second job @ Lv ${nextBase?.reqLevel || 15}` : next ? ` · next: <b style="color:var(--text)">${next.name}</b> @ Lv ${next.reqLevel}` : ' · max advancement'}`;
      
    return `<div style="display:flex;gap:22px;flex-wrap:wrap">
      <div style="min-width:230px">
        <b style="color:var(--accent-alt)">${p.name}</b> — ${T(p.className, 'classes')}
        <div style="color:var(--text-muted);font-size:12px;margin:2px 0 8px">
          ${tierText}<br>
          ${branch ? `<span style="color:${branch.color || 'var(--accent-alt)'}">◆ ${esc(T(branch.role, 'ui'))} · ${esc(T(branch.focus, 'ui'))}</span><br>` : ''}
          ${T('Level', 'ui')} <b style="color:var(--text)">${p.level}</b>/${DESIGN.levelCap} &nbsp; XP ${Math.floor(p.xp)}/${p.level >= DESIGN.levelCap ? 'MAX' : xpForNext(p.level)}<br>
          ${T('Job Lv', 'ui')} <b style="color:#6fb0ef">${p.jobLevel}/${activeJobLevelCap(p)}</b> &nbsp; Job XP ${p.jobLevel >= activeJobLevelCap(p) ? 'MAX' : `${Math.floor(p.jobXp)}/${jobXpForNext(p.jobLevel)}`}
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
    const q = (G._invSearch || '').trim().toLowerCase();
    const inTab = it => tab === 'all' || (tab === 'gear' && ['weapon', 'armor', 'accessory', 'relic'].includes(it.type)) || (tab === 'use' && ['potion', 'reset'].includes(it.type)) || (tab === 'etc' && it.type === 'material') || (tab === 'quest' && it.type === 'quest');
    const matchesSearch = (e, it) => {
      if (!q) return true;
      if (it && it.name && it.name.toLowerCase().includes(q)) return true;
      if (it && it.desc && it.desc.toLowerCase().includes(q)) return true;
      if (e.affixes) {
        for (const a of e.affixes) {
          if (a.stat && a.stat.toLowerCase().includes(q)) return true;
        }
      }
      return false;
    };
    const cat = ITEM_CAT, ORDER = ITEM_CAT_ORDER;
    const rarRank = e => e.uid ? RARITY_ORDER.indexOf(e.rarity) : -1;
    const groups = {};
    for (const e of p.inventory) { const it = itemById[e.itemId]; if (!inTab(it) || !matchesSearch(e, it) || !matchesLoot(e,it,p.features.loot,p.classId)) continue; const c = cat(it); (groups[c] = groups[c] || []).push(e); }
    const slotRank = e => e.uid ? EQUIP_SLOTS.indexOf(itemSlot(itemById[e.itemId])) : 99;
    for (const c in groups) groups[c].sort((a, b) => (slotRank(a) - slotRank(b)) || (rarRank(b) - rarRank(a)) || ((b.plus || 0) - (a.plus || 0)) || itemById[a.itemId].name.localeCompare(itemById[b.itemId].name));

    const rowHtml = e => {
      const it = itemById[e.itemId];
      if (e.uid) {   // rarity-rolled equipment instance — compare vs the item's slot
        const rc = itemRarity(e), slot = itemSlot(it);
        const usable = canUseItem(p, it);
        const requirement = it.classReq ? `<small class="gear-requirement${usable ? '' : ' locked'}">${T('Required classes', 'ui')}: ${esc(itemClassRequirementText(it))}</small>` : '';
        return `<div class="gear-row">
          <div class="gear-row__copy">${itemIconImg(dispItemId(e))} <b style="color:${rc.color}">${esc(instName(e))}</b> <small style="color:${rc.color}">◆${rc.name}</small> <small style="color:var(--text-muted)">[${T(SLOT_LABEL[slot], 'ui')}]</small>${socketDotsHtml(e)} — ${itemMainStatsHtml(e)}
            ${requirement}<span class="gear-bonuses">${itemAffixesHtml(e, p)}</span>${gearComparisonHtml(e, p)}<button class="btn" data-guide-kind="item" data-guide-id="${e.itemId}">${T('Source','ui')}</button></div>
          <button class="btn" data-protect="${e.uid}" data-protected="${!!e.protected}">${T(e.protected?'Unprotect':'Protect','ui')}</button><button class="btn" ${usable ? `data-equip="${e.uid}"` : 'disabled'}>${usable ? T('Equip', 'ui') : '🔒 ' + T('Class locked', 'ui')}</button></div>`;
      }
      const act = it.type === 'potion'
        ? `<span style="display:flex;gap:6px"><button class="btn" data-use="${it.id}">${T('Use', 'ui')}</button><button class="btn btn--ghost" data-assign-item="${it.id}" title="${T('Assign to a hotkey', 'ui')}">${T('→Bar', 'ui')}</button></span>`
        : it.type === 'reset' ? `<button class="btn reset-use" data-use="${it.id}">${T('Use', 'ui')}</button>`
        : it.gem ? `<button class="btn ${G._socketPick === it.id ? 'btn--ghost' : ''}" data-pick-gem="${it.id}">${G._socketPick === it.id ? T('Cancel', 'ui') : T('Socket…', 'ui')}</button>` : '';
      return `<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:4px 0;border-bottom:1px solid rgba(201,162,75,.12)">
        <span>${itemIconImg(e.itemId)} <b>${T(it.name, 'items')}</b> ×${e.qty}<br><small style="color:var(--text-muted)">${T(it.desc, 'items')}</small><button class="btn" data-guide-kind="item" data-guide-id="${e.itemId}">${T('Source','ui')}</button></span>${act}</div>`;
    };
    const toolbarHtml = `<div class="inv-toolbar">
      <label>${T('Loot relevance','ui')} <select data-loot-mode>${['all','usable','affixes'].map(mode=>`<option value="${mode}" ${p.features.loot.mode===mode?'selected':''}>${T({all:'All',usable:'Usable',affixes:'Selected affixes'}[mode],'ui')}</option>`).join('')}</select></label>
      <label><input type="checkbox" data-loot-quiet ${p.features.loot.quiet?'checked':''}>${T('Quiet irrelevant drops','ui')}</label>
      <span>${p.inventory.filter(e=>!matchesLoot(e,itemById[e.itemId],p.features.loot,p.classId)).length} ${T('hidden','ui')} <button class="btn" data-loot-all>${T('Show all','ui')}</button></span>
      ${p.features.loot.mode==='affixes'?`<details><summary>${T('Select affixes; none shows all','ui')}</summary>${[...new Set(AFFIXES.map(a=>a.stat))].map(stat=>`<label><input type="checkbox" data-loot-affix="${esc(stat)}" ${p.features.loot.affixes.includes(stat)?'checked':''}>${esc(stat)}</label>`).join(' ')}</details>`:''}
      <input type="search" id="inv-search" class="inv-search-input" placeholder="${T('Search items / affixes...', 'ui')}" value="${esc(G._invSearch || '')}">
      <button class="btn btn--ghost" id="inv-sort-rarity" title="${T('Sort by Rarity', 'ui')}">✨ ${T('Sort', 'ui')}</button>
      <button class="btn btn--ghost" id="inv-deposit-mats" title="${T('Deposit Materials to Storage', 'ui')}">📥 ${T('Deposit Mats', 'ui')}</button>
    </div>`;
    const tabsHtml = `<div class="bag-tabs">${tabs.map(([k, l]) => `<span class="bag-tab ${tab === k ? 'on' : ''}" data-bagtab="${k}">${l}</span>`).join('')}</div>`;
    const body = Object.keys(groups).sort((a, b) => ORDER[a] - ORDER[b]).map(c => `<div class="bag-cat">${T(c, 'ui')} (${groups[c].length})</div>${groups[c].map(rowHtml).join('')}`).join('');
    return `<div style="color:var(--accent-alt);margin-bottom:6px">💰 ${p.zeny} ${T('zeny', 'ui')}</div>${toolbarHtml}${tabsHtml}${body || `<i>${T('Nothing in this tab.', 'ui')}</i>`}`;
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
        <small style="color:${advanceProgress() >= o.count ? 'var(--success)' : 'var(--text)'}">${T(o.type, 'ui')} ${objectiveName(o)}: ${advanceProgress()}/${o.count}</small>${a.choiceReady ? `<br><button class="btn job-choice-open" ${a.ti === 2 ? 'data-advanced-job-choice="1"' : 'data-job-choice="1"'}>✦ ${T(a.ti === 2 ? 'Choose Third Job' : 'Choose Second Job', 'ui')}</button>` : ''}</div>` + story;
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
          <small>${bStatus(g)} — ${T('Reward', 'ui')}: ${g.reward.exp} XP, ${g.reward.zeny} Zeny, ${g.pts || 0} ${T('pts', 'ui')}</small>
          <div class="bounty-actions">${guildRevokeButton(g)}</div></div>`).join('')
      : `<div style="color:var(--text-muted);font-size:12px;margin:4px 0">${T('No bounties accepted.', 'ui')}</div>`;

    // Zone Mastery & Exploration Status
    const mapKey = G.mapId;
    const mRank = MasterySystem.getZoneRank(G.mastery, mapKey);
    const mPts = (G.mastery?.zonePoints && G.mastery.zonePoints[mapKey]) || 0;
    const discCount = ExplorationSystem.getDiscoveryCount(G.exploration, mapKey);
    const pois = (G.exploration?.unlockedPOIs && G.exploration.unlockedPOIs[mapKey]) || [];

    const masteryHtml = `<div class="q-cat" style="display:flex;justify-content:space-between;align-items:baseline;margin-top:12px">
      <span>🗺 ${T('Zone Mastery & Exploration', 'ui')}</span>
      <small style="color:var(--accent-alt)">${mRank ? `★ ${mRank.title}` : T('Unranked Explorer', 'ui')} (${mPts} pts)</small>
    </div>
    <div class="q-card" style="font-size:12px;line-height:1.5">
      <div><b>${T(G.map.name, 'maps')}</b> · ${discCount} ${T('tiles charted', 'ui')} · ${pois.length} ${T('Landmarks found', 'ui')}</div>
      <div style="color:var(--text-muted);font-size:11px;margin-top:2px">${T('Chart uncharted territory, conquer sub-dungeons, and slay rare beasts to earn permanent zone bonuses.', 'ui')}</div>
    </div>`;

    return `<div class="q-cat">📖 ${T('Main Story', 'ui')} · ${T('Base Lv', 'ui')} 1–${DESIGN.levelCap}</div>${storyRoadmapHtml()}${story}
      <div class="q-cat">🏰 ${T('Accepted Bounties', 'ui')} (${G.activeGuilds.length}/${GUILD_MAX_ACTIVE})</div>${active}
      ${masteryHtml}
      <div style="color:var(--text-muted);font-size:12px;margin-top:6px">${T('Accept and claim bounties with Elder Maro at the guild hall in town.', 'ui')}</div>`;
  }
  if (id === 'guild') {
    const slotsFree = GUILD_MAX_ACTIVE - G.activeGuilds.length;
    const active = G.activeGuilds.length
      ? `<div class="q-cat" style="font-size:13px">📜 ${T('Your open bounties', 'ui')}</div>` + G.activeGuilds.map(g => {
        const ready = g.kind === 'deliver' ? itemQty(g.target) >= g.count : !!g.done;
        const prog = g.kind === 'deliver' ? (currentLang === 'th' ? `มีแล้ว ${Math.min(itemQty(g.target), g.count)}/${g.count}` : `have ${Math.min(itemQty(g.target), g.count)}/${g.count}`) : `${g.progress}/${g.count}`;
        return `<div class="q-card" style="border-color:${ready ? 'var(--success)' : 'var(--panel-border)'}"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
          <span>${g.kind === 'deliver' ? '📦' : '⚔'} <b>${T(g.targetName, g.kind === 'deliver' ? 'items' : 'monsters')}</b> ×${g.count} ${diffBadge(g.difficulty)}<br><small style="color:var(--accent-alt)">${bountyWhere(g)}</small><br>${bountyLevelHtml(g)}<br><small style="color:var(--text-muted)">${prog} · ${g.reward.exp} XP, ${g.reward.zeny} Zeny, <b style="color:var(--accent-alt)">${g.pts || 0} ${T('pts', 'ui')}</b></small></span>
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
      <span>${diffBadge(bq.difficulty)} ${bq.kind === 'deliver' ? T('Deliver', 'ui') : T('Cull', 'ui')} ${bq.count} <b>${T(bq.targetName, bq.kind === 'deliver' ? 'items' : 'monsters')}</b><br><small style="color:var(--accent-alt)">${bountyWhere(bq)}</small><br>${bountyLevelHtml(bq)}<br><small style="color:var(--text-muted)">${T('Reward', 'ui')}: ${bq.reward.exp} XP, ${bq.reward.zeny} Zeny · <b style="color:var(--accent-alt)">${bq.pts} ${T('guild pts', 'ui')}</b></small></span>
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
          <button class="btn" data-guide-kind="recipe" data-guide-id="${r.id}">${T('Source','ui')}</button><button class="btn" data-craft="${r.id}" ${ok ? '' : 'disabled'}>${T('Craft', 'ui')}</button></div>`;
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
        const requirement = it.classReq ? `<small class="gear-requirement${canUseItem(p, it) ? '' : ' locked'}">${T('Required classes', 'ui')}: ${esc(itemClassRequirementText(it))}</small>` : '';
        const btn = locked
          ? `<span class="btn" style="opacity:.5;pointer-events:none">🔒 ${currentLang === 'th' ? `ยศร้านค้า ${T(it.rankReq, 'ui')}` : `Trader ${it.rankReq}`}</span>`
          : `<button class="btn" data-buy="${inst?.uid || it.id}" ${p.zeny < price ? 'disabled' : ''}>${T('Buy', 'ui')} ${price}z</button>`;
        if (!inst) return `<div class="gear-row ${locked ? 'locked' : ''}"><span class="gear-row__copy">${itemIconImg(it.id)} <b>${T(it.name, 'items')}</b> — ${price}z${it.rankReq ? ` <small style="color:#8a641d">[${currentLang === 'th' ? `ยศร้านค้า ${T(it.rankReq, 'ui')}` : `Trader ${it.rankReq}`}]</small>` : ''}<br><small style="color:var(--text-muted)">${T(it.desc, 'items')}</small></span>${btn}</div>`;
        const rc = itemRarity(inst), slot = itemSlot(it);
        return `<div class="gear-row ${locked ? 'locked' : ''}">
          <div class="gear-row__copy">${itemIconImg(it.id)} <b style="color:${rc.color}">${esc(instName(inst))}</b> <small class="rarity-badge" style="--rarity:${rc.color}">◆${rc.name}</small> <small style="color:var(--text-muted)">[${T(SLOT_LABEL[slot], 'ui')}]</small>${it.rankReq ? ` <small style="color:#8a641d">[${currentLang === 'th' ? `ยศร้านค้า ${T(it.rankReq, 'ui')}` : `Trader ${it.rankReq}`}]</small>` : ''}<br>
            <span>${itemMainStatsHtml(inst)} · <b>${price}z</b></span><br><small style="color:var(--text-muted)">${T(it.desc, 'items')}</small>${requirement}
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
      const tier = refineTier(plus), frags = tierOwned(tier), nFrags = refineFrags(tier), nOre = refineOre(tier);
      const haveFuel = frags >= nFrags || itemQty('blessed_ore') >= nOre;
      const disabled = plus >= REFINE_MAX || !haveFuel || p.zeny < cost;
      const badge = slot ? `<span style="font-size:10px;font-weight:700;padding:1px 7px;border-radius:9px;background:rgba(95,191,122,.15);color:var(--success);border:1px solid rgba(95,191,122,.5)">${T(SLOT_LABEL[slot], 'ui')}</span> ` : '';
      const fragName = itemById[REFINE_FRAG[tier]].name;
      const fuelTxt = plus >= REFINE_MAX ? 'MAX' : (currentLang === 'th'
        ? `ต้องการ <b>${T(fragName, 'items')}</b> ×${nFrags} <b style="color:${frags >= nFrags ? 'var(--success)' : 'var(--danger)'}">(มีอยู่ ${frags})</b> — หรือ Blessed Ore ${nOre} ชิ้น`
        : `needs ${nFrags}× <b>${fragName}</b> <b style="color:${frags >= nFrags ? 'var(--success)' : 'var(--danger)'}">(have ${frags})</b> — or ${nOre}× Blessed Ore`);
      const sCount = Array.isArray(inst.sockets) ? inst.sockets.length : 0;
      const expCost = runeSystem.getSocketExpansionCost(sCount);
      const expCheck = expCost ? runeSystem.canExpandSockets({ inst, zeny: p.zeny, inventory: p.inventory }) : null;
      let expBtn = '';
      if (sCount < 4 && expCost) {
        const matDesc = expCost.materials.map(m => `${m.qty}× ${T(itemById[m.id]?.name || m.id, 'items')}`).join(' + ');
        const expTitle = `${matDesc} + ${expCost.zeny}z`;
        const expLabel = `+ ${T('Expand Sockets ({n}/4)', 'ui').replace('{n}', sCount)}`;
        expBtn = `<button class="btn btn--ghost" data-expand-socket="${ref}" ${expCheck?.canExpand ? '' : 'disabled'} title="${expTitle}" style="font-size:11px;padding:3px 8px">${expLabel}</button>`;
      }
      return `<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:4px 0;border-bottom:1px solid rgba(201,162,75,.15)">
        <span>${itemIconImg(inst.itemId)} ${badge}<b style="color:${rc.color}">${instName(inst)}</b> — ${plus}/${REFINE_MAX} · ${REFINE_CHANCE[plus]}% ${T('success', 'ui')} ${socketDotsHtml(inst)}<br>
          <small style="color:var(--text-muted)">${fuelTxt}</small></span>
        <div style="display:flex;gap:6px;align-items:center">
          ${expBtn}
          <button class="btn" data-refine="${ref}" ${disabled ? 'disabled' : ''}>${T('Refine', 'ui')} (${cost}z)</button>
        </div></div>`;
    };
    const wornRows = EQUIP_SLOTS.filter(slot => p.equip[slot]).map(slot => enhRow(p.equip[slot], slot, slot)).join('');
    const bagRows = p.inventory.filter(e => e.uid).map(e => enhRow(e, e.uid, null)).join('');
    const enhBody =
      `<div class="bag-cat" style="color:var(--success)">⚔ ${T('Currently Equipped', 'ui')}</div>` +
      (wornRows || `<small style="color:var(--text-muted)">${T('Nothing equipped.', 'ui')}</small>`) +
      `<div class="bag-cat">🎒 ${T('In Bag', 'ui')}</div>` +
      (bagRows || `<small style="color:var(--text-muted)">${T('No spare equipment in the bag.', 'ui')}</small>`);
      
    const refineFuelText = currentLang === 'th'
      ? `🔨 เชื้อเพลิงตีบวก: <b>เขี้ยวสัตว์ป่า (Beast Fang)</b> ×${refineFrags(0)} สำหรับ +0–2 · <b>ผงเงา (Shade Dust)</b> ×${refineFrags(1)} สำหรับ +3–5 · <b>แร่ดารา (Star Iron)</b> ×${refineFrags(2)} สำหรับ +6–8 — หรือใช้ Blessed Ore ${refineOre(0)}/${refineOre(1)}/${refineOre(2)} ชิ้นแทนได้ (คุณมีอยู่ ${itemQty('blessed_ore')} ชิ้น)`
      : `🔨 Refining fuel: <b>Beast Fang</b> ×${refineFrags(0)} for +0–2 · <b>Shade Dust</b> ×${refineFrags(1)} for +3–5 · <b>Star Iron</b> ×${refineFrags(2)} for +6–8 — or ${refineOre(0)}/${refineOre(1)}/${refineOre(2)}× Blessed Ore as a substitute (you have ${itemQty('blessed_ore')}).`;
      
    return head + `<div style="color:var(--text-muted);font-size:12px;margin-bottom:8px">${refineFuelText}</div>` + enhBody;
  }
  if (id === 'admin') {
    const status = `<div style="color:#ffd24d;margin-bottom:8px;font-size:12px;line-height:1.6">
      God mode: <b>${p.godMode ? 'ON 🛡' : 'off'}</b> · Lv <b>${p.level}</b>/${DESIGN.levelCap} · Job <b>${p.jobLevel}</b>/${activeJobLevelCap(p)} · ${p.className}<br>
      💰${p.zeny} · 🏅 Rank ${GUILD_RANKS[G.guildRankIdx || 0]} (${G.guildPoints || 0} pts) · 🗺 ${G.map.name} · ${G.monsters.filter(m => m.alive).length} mobs alive</div>`;
    return status + ADMIN_GROUPS.map(([title, btns]) =>
      `<div class="q-cat" style="font-size:12px;margin:8px 0 4px">${title}</div>
       <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px">
         ${btns.map(([a, l]) => `<button class="btn" data-admin="${a}" style="font-size:11px;padding:5px 8px">${l}</button>`).join('')}</div>`).join('');
  }
  return '';
}

function bindGuideLinks(el) {
  el.querySelectorAll('[data-guide-kind]').forEach(b=>b.onclick=()=>openGuide(b.dataset.guideKind,b.dataset.guideId));
}
function wirePanel(id, el) {
  bindGuideLinks(el);
  el.querySelectorAll('[data-pin-kind]').forEach(b=>b.onclick=()=>pinGoal({kind:b.dataset.pinKind,id:b.dataset.pinId}));
  el.querySelectorAll('[data-unpin]').forEach(b=>b.onclick=()=>pinGoal(null));
  el.querySelectorAll('[data-guide-back]').forEach(b=>b.onclick=closeGuide);
  el.querySelectorAll('[data-guide-picker]').forEach(b=>b.onchange=()=>{const [kind,id]=b.value.split(':');if(id)openGuide(kind,id);});
  el.querySelectorAll('[data-guide-skill]').forEach(b=>b.onchange=()=>{if(b.value)openGuide('skill',b.value);});
  el.querySelectorAll('[data-guide-route]').forEach(b=>b.onclick=()=>{if(activateWorldRoute(b.dataset.guideRoute)){G.taskGuide.resumeAutoFarm=false;document.getElementById('panel')?.remove();}});
  el.querySelectorAll('[data-protect]').forEach(b=>b.onclick=()=>{setItemProtection(+b.dataset.protect,b.dataset.protected!=='true');refreshPanel(id);});
  el.querySelectorAll('[data-loot-mode]').forEach(b=>b.onchange=()=>{if(['all','usable','affixes'].includes(b.value))G.player.features.loot.mode=b.value;saveGame();refreshPanel(id);});
  el.querySelectorAll('[data-loot-quiet]').forEach(b=>b.onchange=()=>{G.player.features.loot.quiet=b.checked;saveGame();});
  el.querySelectorAll('[data-loot-all]').forEach(b=>b.onclick=()=>{G.player.features.loot.mode='all';G._invSearch='';G._bagTab='all';saveGame();refreshPanel(id);});
  el.querySelectorAll('[data-loot-affix]').forEach(b=>b.onchange=()=>{const selected=new Set(G.player.features.loot.affixes);b.checked?selected.add(b.dataset.lootAffix):selected.delete(b.dataset.lootAffix);G.player.features.loot.affixes=[...selected].filter(s=>AFFIXES.some(a=>a.stat===s));saveGame();refreshPanel(id);});
  el.querySelectorAll('[data-loadout-save]').forEach(b=>b.onclick=()=>{
    const index=+b.dataset.loadoutSave;
    if(G.player.features.loadouts[index]&&!window.confirm(T('Overwrite this loadout?','ui')))return;
    saveLoadout(index,el.querySelector(`[data-loadout-name="${index}"]`).value);refreshPanel(id);
  });
  el.querySelectorAll('[data-loadout-rename]').forEach(b=>b.onclick=()=>{const i=+b.dataset.loadoutRename;renameLoadout(i,el.querySelector(`[data-loadout-name="${i}"]`).value);refreshPanel(id);});
  el.querySelectorAll('[data-loadout-apply]').forEach(b=>b.onclick=()=>{const result=applyLoadout(+b.dataset.loadoutApply);toast(T(result.ok?'Loadout applied':result.reason,'ui'),result.ok?'good':'bad');refreshPanel(id);});
  el.querySelectorAll('[data-daily-claim]').forEach(b=>b.onclick=()=>{claimDaily(b.dataset.dailyClaim);refreshPanel('adventure');});
  el.querySelectorAll('[data-mastery-claim]').forEach(b=>b.onclick=()=>{claimMastery(G.mapId,b.dataset.masteryClaim);refreshPanel('adventure');});
  el.querySelectorAll('[data-mastery-travel]').forEach(b=>b.onclick=()=>{masteryTravel(b.dataset.masteryTravel);refreshPanel('adventure');});
  el.querySelectorAll('[data-zone-difficulty]').forEach(b=>b.onchange=()=>setZoneDifficulty(G.mapId,b.value));
  el.querySelectorAll('[data-dungeon-enter]').forEach(b=>b.onclick=()=>{enterSubdungeon(b.dataset.dungeonEnter);refreshPanel('adventure');});
  el.querySelector('[data-dungeon-exit]')?.addEventListener('click',()=>{exitSubdungeon();refreshPanel('adventure');});
  if (id === 'book') {
    el.querySelectorAll('[data-book-tab]').forEach(b => b.onclick = () => { G._bookTab = b.dataset.bookTab; refreshPanel('book'); });
    el.querySelectorAll('[data-mile-claim]').forEach(b => b.onclick = () => claimMilestone(b.dataset.mileClaim));
  }
  if (id === 'world') {
    el.querySelectorAll('[data-chronicle-tab]').forEach(b => b.onclick = () => {
      G._chronicleTab = b.dataset.chronicleTab;
      refreshPanel('world');
    });
    el.querySelectorAll('[data-zone]').forEach(b => b.onclick = () => {
      G._bestiaryZone = b.dataset.zone;
      G._bestiaryMonsterId = null;
      refreshPanel('world');
    });
    el.querySelectorAll('[data-monster-id]').forEach(b => b.onclick = () => {
      G._bestiaryMonsterId = b.dataset.monsterId;
      refreshPanel('world');
    });
    el.querySelectorAll('[data-summon-pet]').forEach(b => b.onclick = () => {
      if (!G.pets) G.pets = { activePetId: null, owned: {} };
      G.pets.activePetId = b.dataset.summonPet;
      syncPetFollower();
      recompute(G.player);
      saveGame();
      refreshPanel('world');
    });
    el.querySelectorAll('[data-dismiss-pet]').forEach(b => b.onclick = () => {
      if (!G.pets) G.pets = { activePetId: null, owned: {} };
      G.pets.activePetId = null;
      syncPetFollower();
      recompute(G.player);
      saveGame();
      refreshPanel('world');
    });
    el.querySelectorAll('[data-feed-pet-id]').forEach(b => b.onclick = () => {
      const petId = b.dataset.feedPetId;
      const feastId = b.dataset.feastId;
      if (itemQty(feastId) > 0 && G.pets?.owned?.[petId]) {
        removeItem(feastId, 1);
        petsSystem.feedPet(G.pets.owned[petId], feastId);
        if (G.petFollower) petsFx.triggerEmote(G.petFollower, 'heart');
        AUDIO.playSfx('pickup');
        recompute(G.player);
        saveGame();
        refreshPanel('world');
      }
    });
  }
  if (id === 'settings') {
    const touchPref=el.querySelector('#touch-preference');
    if(touchPref)touchPref.onchange=()=>{G.player.features.touch=touchPref.value;initTouchControls();syncRuntimeScale();saveGame();};
    el.querySelectorAll('[data-edit-slot]').forEach(b=>b.onclick=()=>openSlotPicker(+b.dataset.editSlot));
    const masterEl = el.querySelector('#vol-master');
    const musicEl = el.querySelector('#vol-music');
    const sfxEl = el.querySelector('#vol-sfx');
    const update = () => {
      G.audioVolumes = {
        master: masterEl ? parseFloat(masterEl.value) : 1.0,
        music: musicEl ? parseFloat(musicEl.value) : 0.8,
        sfx: sfxEl ? parseFloat(sfxEl.value) : 1.0,
      };
      const mVal = el.querySelector('#vol-master-val');
      const muVal = el.querySelector('#vol-music-val');
      const sfVal = el.querySelector('#vol-sfx-val');
      if (mVal) mVal.textContent = `${Math.round(G.audioVolumes.master * 100)}%`;
      if (muVal) muVal.textContent = `${Math.round(G.audioVolumes.music * 100)}%`;
      if (sfVal) sfVal.textContent = `${Math.round(G.audioVolumes.sfx * 100)}%`;
      AUDIO.setVolumes(G.audioVolumes);
      saveGame();
    };
    if (masterEl) masterEl.oninput = update;
    if (musicEl) musicEl.oninput = update;
    if (sfxEl) sfxEl.oninput = update;
    const hcEl = el.querySelector('#hc-toggle');
    if (hcEl) hcEl.onchange = () => { applyHighContrast(hcEl.checked); saveGame(); };
    const scaleEl = el.querySelector('#vol-scale');
    if (scaleEl) {
      scaleEl.oninput = () => {
        G.uiScale = parseFloat(scaleEl.value);
        document.documentElement.style.setProperty('--ui-scale', G.uiScale);
        const scVal = el.querySelector('#vol-scale-val');
        if (scVal) scVal.textContent = `${Math.round(G.uiScale * 100)}%`;
        saveGame();
      };
    }
  }
  el.querySelectorAll('[data-macro-del]').forEach(b => b.onclick = () => {
    const rules = (G.autoConfig.rules || []).slice();
    rules.splice(+b.dataset.macroDel, 1);
    G.autoConfig = normaliseAutoConfig({ ...G.autoConfig, rules });
    saveGame(); refreshPanel('automation');
  });
  const macroAdd = el.querySelector('#macro-add');
  if (macroAdd) macroAdd.onclick = () => {
    const action = el.querySelector('#macro-action').value, arg = el.querySelector('#macro-arg').value;
    if (action === 'use_item' && !itemById[arg]) return toast(T('Pick an item for this rule.', 'ui'), 'bad');
    if (action === 'cast_skill' && !COMBAT.skills.some(s => s.id === arg)) return toast(T('Pick a skill for this rule.', 'ui'), 'bad');
    const rule = { when: el.querySelector('#macro-when').value, op: el.querySelector('#macro-op').value,
      value: clamp((+el.querySelector('#macro-val').value || 0) / 100, 0, 1), action, arg };
    G.autoConfig = normaliseAutoConfig({ ...G.autoConfig, rules: [...(G.autoConfig.rules || []), rule] });
    saveGame(); refreshPanel('automation');
  };
  const macroImport = el.querySelector('#macro-json-apply');
  if (macroImport) macroImport.onclick = () => {
    try {
      const rules = JSON.parse(el.querySelector('#macro-json').value);
      G.autoConfig = normaliseAutoConfig({ ...G.autoConfig, rules });
      saveGame(); refreshPanel('automation');
      toast(T('Macro profile imported.', 'ui'), 'good');
    } catch { toast(T('Invalid JSON profile.', 'ui'), 'bad'); }
  };
  el.querySelectorAll('[data-auto-toggle]').forEach(b => b.onclick = () => {
    const key = b.dataset.autoToggle;
    if (!['skills', 'heal', 'potions'].includes(key)) return;
    G.autoConfig = normaliseAutoConfig({ ...G.autoConfig, [key]: !G.autoConfig[key] });
    saveGame();
    refreshPanel('automation');
  });
  el.querySelectorAll('[data-auto-profile]').forEach(b => b.onclick = () => {
    G.autoConfig = normaliseAutoConfig({ ...G.autoConfig, profile: b.dataset.autoProfile });
    saveGame();
    refreshPanel('automation');
  });
  el.querySelectorAll('[data-auto-target]').forEach(b => b.onclick = () => {
    const target = b.dataset.autoTarget;
    G.autoConfig = normaliseAutoConfig({ ...G.autoConfig, targetId: target === 'free' ? null : target });
    saveGame();
    refreshPanel('automation');
  });
  el.querySelectorAll('[data-add-priority]').forEach(b => b.onclick = () => {
    const skillId = b.dataset.addPriority;
    const priority = (G.autoConfig.priority || []).filter(existing => existing !== skillId);
    if (priority.length < AUTO_PRIORITY_SLOTS) priority.push(skillId);
    G.autoConfig = normaliseAutoConfig({ ...G.autoConfig, priority });
    saveGame();
    refreshPanel('automation');
  });
  el.querySelectorAll('[data-auto-slot-clear]').forEach(b => b.onclick = () => {
    const priority = (G.autoConfig.priority || []).slice();
    priority.splice(+b.dataset.autoSlotClear, 1);
    G.autoConfig = normaliseAutoConfig({ ...G.autoConfig, priority });
    saveGame();
    refreshPanel('automation');
  });
  el.querySelectorAll('[data-auto-slot]').forEach(slotEl => {
    slotEl.ondragover = e => { if (e.dataTransfer?.types?.includes('text/x-awo-skill')) { e.preventDefault(); slotEl.classList.add('drop-ready'); } };
    slotEl.ondragleave = () => slotEl.classList.remove('drop-ready');
    slotEl.ondrop = e => {
      const skillId = e.dataTransfer?.getData('text/x-awo-skill');
      slotEl.classList.remove('drop-ready');
      if (!skillId) return;
      e.preventDefault();
      const priority = (G.autoConfig.priority || []).filter(existing => existing !== skillId);
      priority.splice(+slotEl.dataset.autoSlot, 0, skillId);
      G.autoConfig = normaliseAutoConfig({ ...G.autoConfig, priority });
      saveGame();
      refreshPanel('automation');
    };
  });
  el.querySelectorAll('[data-task]').forEach(task => task.onclick = event => { event.stopPropagation(); activateTaskGuide(task.dataset.task, task.dataset.taskId); });
  el.querySelectorAll('[data-job-choice]').forEach(button => button.onclick = event => { event.stopPropagation(); showJobChoice(G.player); });
  el.querySelectorAll('[data-advanced-job-choice]').forEach(button => button.onclick = event => { event.stopPropagation(); showAdvancedJobChoice(G.player); });
  el.querySelectorAll('[data-use]').forEach(b => b.onclick = () => { useItem(b.dataset.use); refreshPanel(id); });
  el.querySelectorAll('[data-equip]').forEach(b => b.onclick = () => { equip(b.dataset.equip); refreshPanel(id); });
  el.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => { buy(b.dataset.buy); refreshPanel('shop'); });
  el.querySelectorAll('[data-sell]').forEach(b => b.onclick = () => { sellItem(b.dataset.sell); refreshPanel('shop'); });
  el.querySelectorAll('[data-refine]').forEach(b => b.onclick = () => { refineItem(b.dataset.refine); refreshPanel('shop'); });
  el.querySelectorAll('[data-expand-socket]').forEach(b => b.onclick = () => { expandSockets(b.dataset.expandSocket); refreshPanel('shop'); });
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
  const invSearch = el.querySelector('#inv-search');
  if (invSearch) {
    invSearch.oninput = e => { G._invSearch = e.target.value; refreshPanel('inv'); };
  }
  const invSort = el.querySelector('#inv-sort-rarity');
  if (invSort) {
    invSort.onclick = () => {
      const rarRank = e => e.uid ? RARITY_ORDER.indexOf(e.rarity) : -1;
      G.player.inventory.sort((a, b) => (rarRank(b) - rarRank(a)) || ((b.plus || 0) - (a.plus || 0)));
      saveGame();
      refreshPanel('inv');
    };
  }
  const invDep = el.querySelector('#inv-deposit-mats');
  if (invDep) {
    invDep.onclick = () => {
      if (!G.world.storage) G.world.storage = [];
      let count = 0;
      const remaining = [];
      for (const item of G.player.inventory) {
        const it = itemById[item.itemId];
        if (it && it.type === 'material') {
          const existing = G.world.storage.find(s => s.itemId === item.itemId && !s.uid);
          if (existing) existing.qty += item.qty;
          else G.world.storage.push({ itemId: item.itemId, qty: item.qty });
          count += item.qty;
        } else {
          remaining.push(item);
        }
      }
      G.player.inventory = remaining;
      saveGame();
      refreshPanel('inv');
      toast(T(`Deposited {n} materials into storage.`, 'ui').replace('{n}', count), 'info');
    };
  }
  // rune sockets: click a gem to arm it, then click an empty socket dot to insert it.
  el.querySelectorAll('[data-pick-gem]').forEach(b => b.onclick = () => {
    G._socketPick = G._socketPick === b.dataset.pickGem ? null : b.dataset.pickGem;
    refreshPanel('inv');
  });
  el.querySelectorAll('[data-socket-slot]').forEach(b => b.onclick = e => {
    e.stopPropagation();   // dots can sit inside a doll-slot's data-unequip container
    if (!G._socketPick) return toast(T('Pick a gem from your bag first.', 'ui'), 'bad');
    const [uid, idx] = b.dataset.socketSlot.split(':');
    if (socketGem(uid, +idx, G._socketPick)) { G._socketPick = null; toast(T('Gem socketed.', 'ui'), 'good'); refreshPanel(id); }
  });
  // transmog: cosmetic-only appearance swap on an equipped item's own row.
  el.querySelectorAll('[data-transmog]').forEach(sel => {
    sel.onclick = e => e.stopPropagation();          // don't let the doll-slot's unequip fire
    sel.onchange = () => { transmogItem(sel.dataset.transmog, sel.value); refreshPanel(id); };
  });
  // drag-a-skill source: used by both the skills panel (→ hotbar) and the
  // Automation panel (→ priority slot), so it's wired for every panel.
  el.querySelectorAll('[data-drag-skill]').forEach(nd => {
    nd.addEventListener('dragstart', e => {
      e.dataTransfer?.setData('text/x-awo-skill', nd.dataset.dragSkill);
      if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copy';
      hideSkillTip();
    });
  });
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
    // Draw SVG dependency lines
    setTimeout(() => renderSkillGraphLines(el), 0);
  }
}

// Debounced resize drawing
let resizeTimer = null;
if (typeof window !== 'undefined') {
  window.addEventListener('resize', () => {
    const el = document.getElementById('panel');
    if (el && el.dataset.kind === 'skills') {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => renderSkillGraphLines(el), 60);
    }
  });
}

function renderSkillGraphLines(root = document) {
  const svg = root.querySelector('#skill-lines');
  const graph = root.querySelector('#skill-graph');
  if (!svg || !graph) return;
  svg.innerHTML = '';
  const rGraph = graph.getBoundingClientRect();
  const nodes = root.querySelectorAll('.ro-skill[data-skill]');
  const nodeMap = new Map();
  nodes.forEach(nd => nodeMap.set(nd.dataset.skill, nd));

  const p = G.player;
  const tree = PROGRESSION.skillTree;

  nodes.forEach(child => {
    const cid = child.dataset.skill;
    const kind = child.dataset.kind;
    if (kind !== 'active') return; // passive nodes have no graphic lines
    const node = tree[cid];
    if (!node || !node.reqSkill) return;
    const parent = nodeMap.get(node.reqSkill.id);
    if (!parent) return;

    const rP = parent.getBoundingClientRect();
    const rC = child.getBoundingClientRect();

    // calculate coords relative to graph container
    const x1 = rP.left + rP.width - rGraph.left;
    const y1 = rP.top + rP.height / 2 - rGraph.top;
    const x2 = rC.left - rGraph.left;
    const y2 = rC.top + rC.height / 2 - rGraph.top;

    // determine path state based on learnable/preview/owned states
    let state = 'locked';
    const clv = skillLevel(p, cid);
    const plv = skillLevel(p, node.reqSkill.id);
    const cIncompat = child.classList.contains('locked') && (
      (node.reqBranch && !branchAllowsSkill(p, cid)) ||
      (node.reqAdvancedJob && !advancedJobAllowsSkill(p, cid))
    );

    if (cIncompat) {
      state = 'incompatible';
    } else if (clv > 0) {
      if (p.tierIndex < (node.reqTier || 0)) state = 'preview';
      else state = 'learned';
    } else if (plv >= node.reqSkill.lvl && canLearn(p, cid)) {
      const gate = skillRankGate(p, cid);
      if (p.tierIndex < gate.reqTier) state = 'preview';
      else state = 'ready';
    }

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const mid = x1 + (x2 - x1) * 0.5;
    path.setAttribute('d', `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`);
    path.setAttribute('class', `ro-skill-line ${state}`);
    svg.appendChild(path);
  });
}
function refreshPanel(id) {
  const el = $('#panel');
  if (el && el.dataset.kind === id) {
    const body = el.querySelector('.panel__body');
    const scrollTop = body.scrollTop;
    body.innerHTML = panelBody(id);
    wirePanel(id, el);
    requestAnimationFrame(() => { body.scrollTop = scrollTop; });
  }
}

function useItem(itemId) {
  const it = itemById[itemId]; if (!it || itemQty(itemId) <= 0) return false;
  if (!it.reset && !it.hpRestore && !it.mpRestore && !it.buff && !it.teleport && itemId !== 'rift_cache' && itemId !== 'old_card_album' && it.type !== 'taming_bait') { logMsg('This item cannot be used directly.', 'sys'); return false; }
  const p = G.player;
  if (it.type === 'taming_bait') {
    if (!G.target || !G.target.alive) {
      logMsg(T('Target a wounded creature nearby to tame!', 'ui'), 'sys');
      return false;
    }
    const dist = Math.hypot(G.target.x - p.x, G.target.y - p.y);
    if (dist > 3.5 * TS) {
      logMsg(T('Target is too far away to tame!', 'ui'), 'sys');
      return false;
    }
    const res = petsSystem.attemptTame(p, G.target, itemId);
    if (!res.success) {
      removeItem(itemId, 1);
      logMsg(T(res.reason, 'ui'), 'bad');
      toast(T(res.reason, 'ui'), 'bad');
      AUDIO.playSfx('miss');
      saveGame();
      return false;
    }
    removeItem(itemId, 1);
    const petDef = res.petDef;
    const petId = res.petId;
    G.pets.owned[petId] = {
      id: petId,
      name: petDef.name,
      bondLevel: 1,
      loyalty: 20,
      exp: 0,
      unlockedAt: now(),
    };
    if (!G.pets.activePetId) {
      G.pets.activePetId = petId;
      syncPetFollower();
      recompute(p);
    }
    G.target.alive = false;
    G.target.deadUntil = now() + R.respawnMs;
    G.target = null;
    G.targetSource = null;
    G.path = null;
    AUDIO.playSfx('quest');
    toast(`🐾 ${T('Successfully tamed', 'ui')} [${T(petDef.name, 'items')}]!`, 'good');
    logMsg(`Successfully tamed ${petDef.name}!`, 'good');
    if (G.petFollower) petsFx.triggerEmote(G.petFollower, 'heart');
    saveGame();
    return true;
  }
  if (itemId === 'old_card_album') {
    removeItem(itemId);
    AUDIO.playSfx('levelup');
    const rolledCardId = cardsSystem.rollOldCardAlbum();
    addItem(rolledCardId, 1);
    cardsSystem.recordCardAcquired(G.bestiary, rolledCardId);
    const cardDef = cardsSystem.getCardDef(rolledCardId);
    const cardName = cardDef ? T(cardDef.name, 'items') : rolledCardId;
    toast(`🎴 ${T('Opened Old Card Album!', 'ui')}: [${cardName}]`, 'good');
    logMsg(`Opened Old Card Album: Acquired [${cardName}]!`, 'good');
    if (ctx) {
      cardsUI.drawAlbumOpeningFanfare(ctx, CANVAS_W, CANVAS_H, 1.0);
    }
    saveGame();
    return true;
  }
  if (itemId === 'rift_cache') {
    removeItem(itemId);
    AUDIO.playSfx('levelup');
    const loot = incursionSystem.generateCacheLoot();
    p.zeny = (p.zeny || 0) + (loot.zeny || 0);
    for (const mat of (loot.materials || [])) {
      if (mat?.id && mat?.qty) addItem(mat.id, mat.qty);
    }
    for (const rId of (loot.runes || [])) {
      addItem(rId, 1);
    }
    toast(`✨ ${T('Dimensional Cache opened!', 'ui')}`, 'good');
    logMsg(`Opened Dimensional Cache: +${loot.zeny} Zeny, shards, materials, and runes!`, 'good');
    saveGame();
    return true;
  }
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
  if (it.buff) {
    p.buffs.push({ stat: it.buff.stat, mult: it.buff.mult || 1, flat: it.buff.flat || 0, until: now() + it.buff.durationMs, name: it.name });
    recompute(p);
    toast(`${it.name} — ${it.buff.stat.toUpperCase()} up!`, 'good');
  }
  if (it.teleport) { removeItem(itemId); AUDIO.playSfx('menu'); loadMap(it.teleport); logMsg('The scroll crumbles — town swims into view.', 'sys'); return true; }
  removeItem(itemId); AUDIO.playSfx('pickup'); logMsg(`Used ${it.name}.`, 'good');
  return true;
}
function canUseItem(p, itemOrId) {
  const item = typeof itemOrId === 'string' ? itemById[itemOrId] : itemOrId;
  return !!item && (!item.classReq || item.classReq.includes(p.classId));
}
function itemClassRequirementText(item) {
  if (!item.classReq) return T('All classes', 'ui');
  return item.classReq.map(id => T(DESIGN.classes.find(cls => cls.id === id)?.name || id, 'classes')).join(', ');
}
function equip(uid) {
  const p = G.player, u = +uid, idx = p.inventory.findIndex(e => e.uid === u);
  if (idx < 0) return;
  const inst = p.inventory[idx], item = itemById[inst.itemId], slot = itemSlot(item);
  if (!canUseItem(p, item)) {
    logMsg(currentLang === 'th' ? `ไม่สามารถสวมใส่: เฉพาะอาชีพ ${itemClassRequirementText(item)}` : `Cannot equip: only for ${itemClassRequirementText(item)}`, 'bad');
    AUDIO.playSfx('menu');
    return;
  }
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
  const baseIds = (G._shopItems || npcById.merchant?.shopItems || npcById.npc_shopkeeper?.shopItems || []).filter(itemId => !itemById[itemId]?.rankReq);
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
// refinement: +0..+max, safe (fail wastes the attempt, item never breaks/downgrades).
// All numbers live in DESIGN.tuning.refine.
const REFINE_MAX = TUNING.refine.max, REFINE_CHANCE = TUNING.refine.chance;
const refineCost = inst => Math.max(50, Math.floor((itemById[inst.itemId].value || 0) * 0.15 * ((inst.plus || 0) + 1)));
// fuel: ONE named fragment per bracket — a clear farm target, not "whatever's in the bag".
// Blessed Ore remains the universal substitute. Both scale with the bracket, so the
// +6→+9 stretch costs real farming instead of the same 2 fragments as +0→+3.
const REFINE_FRAG = ['wolf_fang', 'shade_dust', 'star_iron'];   // +0-2 · +3-5 · +6-8
const refineTier = plus => plus < 3 ? 0 : plus < 6 ? 1 : 2;
const refineFrags = tier => TUNING.refine.fragsPerTier[tier];
const refineOre = tier => TUNING.refine.orePerTier[tier];
const tierOwned = t => itemQty(REFINE_FRAG[t]);
function refineItem(ref) {
  const p = G.player;
  const inst = /^\d+$/.test(ref) ? p.inventory.find(e => e.uid === +ref) : p.equip[ref];
  if (!inst) return;
  const plus = inst.plus || 0;
  if (plus >= REFINE_MAX) { toast('Already +9.', 'sys'); return; }
  const tier = refineTier(plus), fragId = REFINE_FRAG[tier];
  const nFrags = refineFrags(tier), nOre = refineOre(tier);
  const useFrags = tierOwned(tier) >= nFrags;                   // fragments first — ore is the fallback
  if (!useFrags && itemQty('blessed_ore') < nOre) { toast(`Need ${nFrags}× ${itemById[fragId].name} — or ${nOre}× Blessed Ore.`, 'bad'); return; }
  const cost = refineCost(inst);
  if (p.zeny < cost) { toast('Not enough zeny.', 'bad'); return; }
  p.zeny -= cost;
  const fuel = useFrags ? (removeItem(fragId, nFrags), `${nFrags}× ${itemById[fragId].name}`) : (removeItem('blessed_ore', nOre), `${nOre}× Blessed Ore`);
  if (Math.random() * 100 < REFINE_CHANCE[plus]) {
    inst.plus = plus + 1; recompute(p); AUDIO.playSfx('levelup');
    toast(`✨ ${instName(inst)} — refine success!`, 'good'); logMsg(`${instName(inst)} refined with ${fuel}.`, 'good');
  } else {
    AUDIO.playSfx('playerHurt');
    toast(`The ${useFrags ? 'fragments shatter' : 'ore shatters'}... ${instName(inst)} is unharmed.`, 'bad'); logMsg(`Refine failed — ${fuel} lost, ${instName(inst)} unharmed.`, 'bad');
  }
}
function expandSockets(ref) {
  const p = G.player;
  const inst = /^\d+$/.test(ref) ? p.inventory.find(e => e.uid === +ref) : p.equip[ref];
  if (!inst) return false;
  const res = runeSystem.expandSockets({
    inst,
    zeny: p.zeny,
    inventory: p.inventory,
    deductZeny: amt => { p.zeny -= amt; },
    removeItem: (id, qty) => removeItem(id, qty),
  });
  if (!res.success) {
    toast(res.reason || 'Cannot expand sockets.', 'bad');
    return false;
  }
  AUDIO.playSfx('levelup');
  recompute(p);
  toast(`✨ ${T('Socket expanded!', 'ui')} (${res.newSockets}/4)`, 'good');
  logMsg(`${instName(inst)} sockets expanded to ${res.newSockets}.`, 'good');
  return true;
}
function sellItem(ref) {
  const p = G.player;
  const itemId = /^\d+$/.test(ref) ? p.inventory.find(e => e.uid === +ref)?.itemId : ref;
  if (itemById[itemId]?.type === 'quest') { toast('Quest items cannot be sold.', 'bad'); return; }
  if (/^\d+$/.test(ref)) {                                     // equipment instance by uid
    const idx = p.inventory.findIndex(e => e.uid === +ref); if (idx < 0) return;
    const e = p.inventory[idx], price = sellPrice(e);
    if(e.protected){toast(T('Unprotect this item before selling.','ui'),'sys');return false;}
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
.sk-name{position:absolute;bottom:3px;right:4px;font-size:9px;color:var(--text-muted);max-width:46px;overflow:hidden}
.skill-btn .lvl{position:absolute;top:2px;right:4px;font-size:10px;color:var(--success);font-weight:700}
.skill-btn .qty{position:absolute;bottom:2px;right:4px;font-size:11px;color:var(--accent-alt);font-weight:700}
.skill-btn.locked{opacity:.45;filter:grayscale(.6)}
.skill-btn.empty{opacity:.4}
.skill-btn.item-slot{background:linear-gradient(180deg,#2c3a22,#1a2313);border-color:#6fae5a}
.hotbar{gap:6px}
.hotbar .skill-btn{width:46px;height:46px}
.quest-tracker{position:fixed;top:160px;right:12px;width:190px;background:rgba(20,26,18,.82);border:1px solid var(--panel-border);border-radius:6px;padding:8px;font-size:11px;line-height:1.4}
.auto-status{position:fixed;right:12px;bottom:96px;z-index:16;width:190px;display:grid;grid-template-columns:24px minmax(0,1fr) 18px;align-items:center;gap:6px;padding:7px;background:rgba(9,18,31,.94);border:1px solid #60738d;color:var(--text);font:inherit;text-align:left;cursor:pointer;box-shadow:2px 2px 0 rgba(0,0,0,.5)}
.auto-status[hidden]{display:none}.auto-status:hover{border-color:#e6bd54}.auto-status__icon{display:grid;place-items:center;width:22px;height:22px;background:#172b49;border:1px solid #7890ad;color:#a9d0ff;font-weight:900}.auto-status__copy{min-width:0;display:flex;flex-direction:column}.auto-status__copy b{overflow:hidden;color:#e9edf3;font-size:10px;text-overflow:ellipsis;white-space:nowrap}.auto-status__copy small{overflow:hidden;color:#91a1b5;font-size:8px;text-overflow:ellipsis;white-space:nowrap}.auto-status__gear{color:#718197;font-size:10px}.auto-status[data-phase="combat"],.auto-status[data-phase="encounter"]{border-color:#b85c5c}.auto-status[data-phase="recover"]{border-color:#62a97c}.auto-status[data-phase="route"]{border-color:#d2ad4e}.auto-status[data-phase="blocked"]{border-color:#e0795f}
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
.gear-requirement{display:block;margin-top:3px;color:#9dc19f}.gear-requirement.locked{color:#e49a8b;font-weight:800}
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
.ro-branch-identity{margin:0 8px 8px;padding:8px 9px;border:1px solid var(--book-accent);background:color-mix(in srgb,var(--book-deep) 82%,#000)}.ro-branch-identity>header{display:flex;align-items:baseline;gap:6px;margin-bottom:4px}.ro-branch-identity>header small{color:#9aa8bd;font-size:7px;letter-spacing:1px}.ro-branch-identity>header b{color:var(--book-accent);font-size:10px}.ro-branch-identity>p{margin:0 0 6px;color:#d6dee9;font-size:9px;line-height:1.4}.ro-branch-combo{display:flex;align-items:center;gap:6px;flex-wrap:wrap}.ro-branch-combo>small{color:#8997aa;font-size:7px;letter-spacing:.6px}
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
#hud .hotbar-shell .role-mark{position:absolute;right:3px;top:2px;min-width:13px;height:13px;padding:0 2px;border:1px solid currentColor;background:#080d14;font-size:9px;font-weight:800;line-height:12px;text-align:center}
#hud .hotbar-shell .skill-btn .lvl{top:auto;right:3px;bottom:2px;font-size:9px;color:#b8c3d2}
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
.automation-console{width:min(650px,82vw);display:grid;gap:10px}.automation-live{display:grid;grid-template-columns:38px minmax(0,1fr);gap:9px;align-items:center;padding:10px;background:#0c192b;border:1px solid #72849a}.automation-live>span{display:grid;place-items:center;width:36px;height:36px;border:1px solid #d2ad4e;background:#203454;color:#f0d47d;font-size:20px}.automation-live>div{display:flex;min-width:0;flex-direction:column}.automation-live small,.automation-objective small{color:#8292a7;font-size:8px;font-weight:900;letter-spacing:1px}.automation-live b{color:#f2d07b;font:700 14px var(--font-head)}.automation-live em{color:#b7c2d2;font-size:10px;font-style:normal}.automation-objective{display:grid;grid-template-columns:2fr 1fr;gap:6px}.automation-objective>span{display:flex;flex-direction:column;padding:7px;background:#13243d;border:1px solid #50637d}.automation-objective b{color:#e7ecf3;font-size:11px}.automation-section{padding:9px;background:#101d32;border:1px solid #53657e}.automation-section h3{margin:0;color:#f0d47d;font:700 13px var(--font-head)}.automation-section p{margin:2px 0 8px;color:#96a5b8;font-size:9px}.auto-toggle-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:5px}.auto-toggle{display:grid;grid-template-columns:25px minmax(0,1fr) auto;align-items:center;gap:5px;padding:7px;background:#0b1525;border:1px solid #52647c;color:#8392a6;text-align:left;cursor:pointer}.auto-toggle.active{background:#173329;border-color:#70a980;color:#e7edf3}.auto-toggle__glyph{color:#f0d47d;font-size:16px;text-align:center}.auto-toggle span:nth-child(2){display:flex;min-width:0;flex-direction:column}.auto-toggle b{font-size:9px}.auto-toggle small{color:#8d9bad;font-size:7px;line-height:1.35}.auto-toggle em{color:#75859a;font-size:8px;font-style:normal;font-weight:900}.auto-toggle.active em{color:#92d0a2}.auto-profile-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:5px}.auto-profile{display:flex;flex-direction:column;gap:2px;padding:7px;background:#0b1525;border:1px solid #52647c;color:#8998aa;text-align:left;cursor:pointer}.auto-profile.active{background:#26341c;border-color:#b1bd69;color:#f0e9c4}.auto-profile b{font-size:10px}.auto-profile small{font-size:7px;line-height:1.4}.automation-foot{padding:7px;border:1px solid #684b49;background:#291b21;color:#d3a7a3;font-size:8px;line-height:1.45}
.auto-target-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:5px}.auto-target{display:flex;flex-direction:column;gap:2px;padding:7px;background:#0b1525;border:1px solid #52647c;color:#8998aa;text-align:left;cursor:pointer}.auto-target.active{background:#20304f;border-color:#6fa9e6;color:#eaf1fb}.auto-target b{font-size:9px}.auto-target small{font-size:7px;color:#8d9bad}
.auto-empty{display:block;padding:6px 2px;color:#75859a;font-size:8px;font-style:italic}
.auto-slot-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:5px;margin-bottom:7px}.auto-slot{display:flex;align-items:center;gap:5px;padding:6px 7px;min-height:32px;background:#0b1525;border:1px dashed #4a5b73}.auto-slot.filled{border-style:solid;border-color:#c9a24b;background:#211b0f}.auto-slot.drop-ready{border-color:#efd16f;background:#2a2312}.auto-slot__rank{display:grid;place-items:center;width:16px;height:16px;border:1px solid #52647c;color:#8d9bad;font-size:8px;font-weight:900}.auto-slot.filled .auto-slot__rank{border-color:#c9a24b;color:#f0d47d}.auto-slot__skill{flex:1;min-width:0;overflow-wrap:anywhere;color:#e7ecf3;font-size:9px;cursor:grab}.auto-slot__empty{flex:1;color:#5c6c82;font-size:8px;font-style:italic}.auto-slot__clear{border:1px solid #684b49;background:#291b21;color:#d3a7a3;font-size:9px;line-height:1;cursor:pointer;padding:2px 5px}
.auto-skill-pool{display:flex;flex-wrap:wrap;gap:5px}.auto-skill-chip{padding:4px 7px;background:#0b1525;border:1px solid #52647c;color:#c3cddb;font-size:9px;cursor:grab}.auto-skill-chip:hover{border-color:#efd16f;color:#f0e9c4}
.dialogue__choices .btn{display:flex;align-items:center;justify-content:space-between}
.dialogue__choices .btn kbd{margin-left:auto;padding:1px 6px;border:1px solid #9aa8b9;background:#080d14;color:#efd16f;font-size:9px;box-shadow:inset 0 -1px #000}
.job-choice-overlay{position:fixed;inset:0;z-index:58;display:grid;place-items:center;padding:20px;background:rgba(5,9,16,.9);backdrop-filter:blur(2px)}
.job-choice-shell{width:min(780px,94vw);padding:18px;background:#0e1a2d;border:2px solid #aeb9ca;box-shadow:inset 0 0 0 2px #273b5d,0 18px 55px rgba(0,0,0,.72)}
.job-choice-shell>header{text-align:center}.job-choice-shell>header small{color:#8fc5e8;font-size:8px;font-weight:900;letter-spacing:1.6px}.job-choice-shell h2{margin:4px 0;color:#f2d07b;font:700 25px var(--font-head)}.job-choice-shell>header p{margin:0 0 13px;color:#aeb9ca;font-size:10px}
.job-choice-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.job-choice-card{position:relative;display:flex;min-width:0;flex-direction:column;align-items:flex-start;gap:5px;padding:15px 14px 13px;background:linear-gradient(155deg,color-mix(in srgb,var(--path-color) 13%,#14243c),#0a1322 72%);border:1px solid color-mix(in srgb,var(--path-color) 75%,#8a99ac);color:#dfe6ee;text-align:left;cursor:pointer;box-shadow:inset 0 3px 0 var(--path-color),2px 2px 0 rgba(0,0,0,.55)}
.job-choice-card:hover,.job-choice-card:focus-visible{outline:1px solid #fff3b4;filter:brightness(1.16);transform:translateY(-2px)}.job-choice-no{position:absolute;right:10px;top:8px;color:color-mix(in srgb,var(--path-color) 60%,#546379);font:700 22px var(--font-head)}.job-choice-card>small{color:var(--path-color);font-size:8px;font-weight:900;letter-spacing:1.2px}.job-choice-card>b{padding-right:30px;color:#f3f5f7;font:700 18px var(--font-head)}.job-choice-card>em{color:#b5c1d0;font-size:9px;font-style:normal}.job-choice-stats{padding:3px 6px;background:#080e18;border:1px solid #52647c;color:#b8d8ef;font-size:9px;font-weight:800}.job-choice-skill{display:flex;width:100%;flex-direction:column;margin-top:4px;padding:7px;border-left:3px solid var(--path-color);background:#101e32;color:#d5b85d;font-size:9px}.job-choice-skill strong{color:#f1f3f6;font-size:11px}.job-choice-skill i{margin-top:2px;color:#94a3b6;font-size:8px;font-style:italic;line-height:1.35}.job-choice-future{color:#a7b8c9;font-size:9px}.job-choice-pick{align-self:stretch;margin-top:5px;padding:5px;border:1px solid var(--path-color);color:#f2d07b;font-size:8px;font-weight:900;letter-spacing:1px;text-align:center}.job-choice-open{margin-top:6px}.job-choice-ready{border-color:#e6bd54!important;background:rgba(230,189,84,.12)!important}
@media(max-width:760px){
  .panel[data-kind="skills"]{width:calc(100vw - 16px);max-width:calc(100vw - 16px)}
  .ro-book-head{grid-template-columns:48px minmax(0,1fr);padding:8px}.ro-crest{width:42px;height:42px;font-size:25px}.ro-book-stats{grid-column:1/-1;display:grid;grid-template-columns:1fr 1fr 1fr}.ro-book-stats strong{font-size:18px}.ro-book-radar{display:none}
  .ro-job-grid{grid-template-columns:1fr}.ro-skill{grid-template-columns:40px minmax(0,1fr) auto}.ro-skill-state{grid-column:3;grid-row:1;align-self:end;margin:0}.ro-skill-copy b{font-size:11px}.ro-skill-copy small,.ro-skill-copy em{font-size:8px}
  .skill-guide>summary small{display:block;margin:2px 0 0}.flow-grid{grid-template-columns:1fr}.flow-arrow{height:14px;transform:rotate(90deg)}.flow-copy{min-height:0}.flow-head{align-items:flex-start;flex-wrap:wrap}.flow-head>div:first-child{flex-basis:100%}
  .job-choice-overlay{align-items:start;overflow-y:auto;padding:9px}.job-choice-shell{padding:12px}.job-choice-grid{grid-template-columns:1fr}.job-choice-shell h2{font-size:21px}
}
#hud .mp-bar .fill{background:linear-gradient(90deg,#315f9d,#5b91d2);transition:width .16s linear}
#hud .mp-bar.low .fill{background:linear-gradient(90deg,#6e3f86,#a666b8)}
#hud .mp-bar.empty .label{color:#ef9b9e}

@media(max-width:680px){
  .auto-status{top:auto;right:auto;bottom:130px;left:6px;width:min(250px,64vw)}
  #hud .hotbar-shell{width:96vw}.hotbar-shell .hotbar{max-width:calc(96vw - 38px);overflow-x:auto!important}.hotbar-shell .momentum-state{display:none}
  .skill-flow{width:82vw}.flow-grid{display:flex;flex-direction:column;gap:4px}.flow-arrow{height:12px;transform:rotate(90deg)}.flow-copy{min-height:0}.flow-legend span:last-child{margin-left:0}
  .hotkey-grid{grid-template-columns:1fr;min-width:78vw}
  .world-chronicle{width:86vw}.world-head{padding:9px;gap:8px}.world-head h2{font-size:17px}.world-seal{flex-basis:54px;height:54px}.world-road{padding:7px 2px}.world-node{grid-template-columns:38px minmax(0,1fr);gap:7px;padding:8px}.world-sigil{width:36px;height:36px;font-size:18px}.world-node-head{gap:6px}.world-copy p{font-size:10px}.world-facts{grid-template-columns:1fr}.world-fact{white-space:normal}.world-link{margin-left:20px}.world-foot span:last-child{margin-left:0}
  .gear-row{flex-direction:column}.gear-row>.btn{align-self:flex-start}.gear-compare__head{align-items:flex-start;flex-direction:column;gap:1px}
  .automation-console{width:84vw}.auto-toggle-grid,.auto-profile-grid,.auto-target-grid,.auto-slot-grid{grid-template-columns:1fr}.automation-objective{grid-template-columns:1fr}
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
  const ls = storage(); if (!G.player || !G.running) return false;
  if (!ls) { G.saveStatus = 'unavailable'; showSaveStatus(); return false; }
  const p = G.player;
  const data = { v: 5,
    player: { classId: p.classId, name: p.name, className: p.className, tierIndex: p.tierIndex, jobBranchId: p.jobBranchId, advancedJobId: p.advancedJobId, hybridJobId: p.hybridJobId,
      level: p.level, xp: p.xp, jobLevel: p.jobLevel, jobXp: p.jobXp, rebirths: p.rebirths || 0, pastLives: p.pastLives || [], zeny: p.zeny, hp: p.hp, mp: p.mp,
      alloc: p.alloc, statPoints: p.statPoints, skillPoints: p.skillPoints, skillLevels: p.skillLevels,
      equip: p.equip, inventory: p.inventory, hotbar: p.hotbar, hotkeys: p.hotkeys, features: p.features,
      buffs: (p.buffs || []).filter(b => b.until > now()) },
    world: { mapId: G.mapId, col: Math.floor(p.x / TS), row: Math.floor(p.y / TS),
      quest: G.quest, pendingQuest: G.pendingQuest, killCounts: G.killCounts, won: G.won, autoFarm: G.autoFarm,
      huntTargetId: G.huntTargetId, taskGuide: G.taskGuide, autoConfig: G.autoConfig, audioVolumes: G.audioVolumes, highContrast: G.highContrast,
      advance: G.advance, guildBoard: G.guildBoard, activeGuilds: G.activeGuilds,
      guildRankIdx: G.guildRankIdx, guildPoints: G.guildPoints,
      visited: [...G.visited], talked: [...G.talked], guardiansSlain: [...G.guardiansSlain],
      seenMonsters: [...G.seenMonsters], collectedItems: [...G.collectedItems], claimedMilestones: [...G.claimedMilestones],
      storage: G.storage, achievements: [...G.achievements], riftBest: G.rift.best,
      weather: G.weather?.id || 'clear',
      incursion: incursionSystem.serialize(),
      gathering: gatheringSystem.serialize(),
      bestiary: cardsSystem.serialize(G.bestiary),
      pets: petsSystem.serialize(G.pets),
      expansion: normalizeExpansion(G) } };
  try { ls.setItem(saveKey(), JSON.stringify(data)); G.saveStatus='saved'; showSaveStatus(); return true; }
  catch { G.saveStatus='failed'; showSaveStatus(); return false; }
}
function showSaveStatus() {
  let el=document.getElementById('save-status');
  if (!el && G.saveStatus!=='saved') {
    el=document.createElement('button');el.id='save-status';el.className='btn';
    el.style.cssText='position:fixed;top:100px;left:8px;z-index:100;max-width:90vw';
    el.onclick=()=>saveGame();document.body.appendChild(el);
  }
  if(el){el.textContent=currentLang==='th'?'ยังไม่ได้บันทึก — แตะเพื่อลองอีกครั้ง':'Progress not saved — tap to retry';el.style.display=G.saveStatus==='saved'?'none':'block';}
}
// shared canvas/HUD boot used by both new-game and continue
let runtimeResizeBound = false;
function syncRuntimeScale() {
  if(!canvas)return;
  clearInput();
  const pref=G.player?.features?.touch||'auto';
  const touch=pref==='on'||pref==='auto'&&isTouchDevice();
  const css=typeof getComputedStyle==='function'?getComputedStyle(document.documentElement):null;
  const insets=Object.fromEntries(['top','right','bottom','left'].map(k=>[k,parseFloat(css?.getPropertyValue('--safe-'+k))||0]));
  runtimeViewport=computeViewport({width:window.visualViewport?.width||innerWidth,height:window.visualViewport?.height||innerHeight,touch,insets});
  const {rect,logical,scale,mode}=runtimeViewport;
  CANVAS_W=logical.width;CANVAS_H=logical.height;
  canvas.width=CANVAS_W;canvas.height=CANVAS_H;
  ctx.imageSmoothingEnabled=false;
  Object.assign(canvas.style,{left:rect.x+'px',top:rect.y+'px',width:rect.width+'px',height:rect.height+'px',transform:'none',maxWidth:'none',maxHeight:'none'});
  document.body.dataset.viewport=mode;
  const fx=$('#fx-layer');if(fx)Object.assign(fx.style,{left:rect.x+'px',top:rect.y+'px',width:logical.width+'px',height:logical.height+'px',transformOrigin:'top left',transform:'scale('+scale+')'});
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
  if (!runtimeResizeBound) { window.addEventListener('resize', syncRuntimeScale); window.visualViewport?.addEventListener('resize',syncRuntimeScale); runtimeResizeBound = true; }
  buildHud();
}
function resumeGame() {
  const d = readSave(); if (!d) return false;
  gameClock.reset();document.getElementById('resume-game')?.remove();AUDIO.resumePlayback();
  G.jobChoiceOpen = false;
  AUDIO.init();
  const sp = d.player, p = makePlayer(sp.classId, sp.name);
  p.features=normalizeFeatures(sp.features,{items:Object.keys(itemById),skills:COMBAT.skills.map(s=>s.id),recipes:(CONTENT.recipes||[]).map(r=>r.id),affixes:AFFIXES.map(a=>a.stat)});
  Object.assign(G,normalizeExpansion(d.world?.expansion));
  Object.assign(p, { className: sp.className || p.className, tierIndex: sp.tierIndex || 0, jobBranchId: sp.jobBranchId || null, advancedJobId: sp.advancedJobId || null, hybridJobId: sp.hybridJobId || null, level: sp.level, xp: sp.xp,
    jobLevel: sp.jobLevel ?? sp.level, jobXp: sp.jobXp ?? 0, rebirths: sp.rebirths || 0, pastLives: sp.pastLives || [],
    zeny: sp.zeny, alloc: { str: 0, agi: 0, vit: 0, int: 0, dex: 0, luk: 0, ...(sp.alloc || {}) }, statPoints: sp.statPoints, skillPoints: sp.skillPoints,
    skillLevels: sp.skillLevels || p.skillLevels, equip: { ...p.equip, ...(sp.equip || {}) }, inventory: sp.inventory || p.inventory,
    hotbar: Array.isArray(sp.hotbar) ? sp.hotbar.slice(0, 9) : p.hotbar,
    hotkeys: normaliseHotkeys(sp.hotkeys),
    buffs: (sp.buffs || []).filter(b => b.until > now()) });
  normalisePlayerProgression(p); // migrate old uncapped-job saves without deleting learned ranks
  while (p.hotbar.length < 9) p.hotbar.push(null);
  // restore the uid counter past every saved instance so fresh drops don't collide
  let maxUid = 0; const scan = e => { if (e && e.uid > maxUid) maxUid = e.uid; };
  Object.values(sp.equip || {}).forEach(scan); (sp.inventory || []).forEach(scan);
  (d.world?.storage || []).forEach(scan);   // stored gear carries uids too
  const scanBounty = g => {
    const m = g?.id?.match(/^g(\d+)$/);
    if (m) maxUid = Math.max(maxUid, parseInt(m[1], 10));
  };
  (d.world?.guildBoard || []).forEach(scanBounty);
  (d.world?.activeGuilds || []).forEach(scanBounty);
  _uid = maxUid;
  G.player = p; recompute(p, false);
  p.hp = clamp(sp.hp ?? p.maxHp, 1, p.maxHp); p.mp = clamp(sp.mp ?? p.maxMp, 0, p.maxMp);
  G.admin = p.name.trim().toLowerCase() === 'admin';
  const w = d.world;
  G.audioVolumes = w.audioVolumes || { master: 1.0, music: 0.8, sfx: 1.0 };
  AUDIO.setVolumes(G.audioVolumes);
  applyHighContrast(!!w.highContrast);
  G.quest = w.quest || null; G.pendingQuest = w.pendingQuest || null; G.killCounts = w.killCounts || {}; G.won = !!w.won; G.autoFarm = !!w.autoFarm;
  G.huntTargetId = null; G.taskGuide = null; G.autoConfig = normaliseAutoConfig(w.autoConfig);
  // legacy saves flagged `won` at the Flame Dragon (old finale); if the story is still
  // running, clear it so the TRUE finale (Nullking) can still play its cutscene once
  if (G.won && (G.quest || G.pendingQuest)) G.won = false;
  G.advance = w.advance || null; G.guildBoard = (w.guildBoard && w.guildBoard.length) ? w.guildBoard : (refreshGuildBoard(), G.guildBoard);
  // A legacy save may have captured a completed trial before its choice callback.
  // Preserve completion for either career choice, but never choose on its behalf.
  const pendingCareerChoice = G.advance?.ti === 1 ? !p.jobBranchId
    : G.advance?.ti === 2 ? !p.advancedJobId : false;
  if (pendingCareerChoice && advanceProgress() >= G.advance.def.objective.count) G.advance.choiceReady = true;
  G.activeGuilds = w.activeGuilds || (w.activeGuild ? [w.activeGuild] : []);   // legacy single-bounty saves
  G.guildRankIdx = w.guildRankIdx || 0; G.guildPoints = w.guildPoints || 0;
  G.guardiansSlain = new Set(w.guardiansSlain || []);
  if (!w.guardiansSlain && w.visited)   // legacy saves: reaching a zone implies the previous guardian fell
    for (let i = 1; i < ZONE_ORDER.length; i++)
      if (w.visited.includes(ZONE_ORDER[i])) G.guardiansSlain.add(zoneGuardian(ZONE_ORDER[i - 1]));
  G.visited = new Set(w.visited || []); G.talked = new Set(w.talked || []);
  G.storage = w.storage || []; G.achievements = new Set(w.achievements || []);
  // ponytail: only the best floor is persisted — resuming mid-rift restarts the
  // run fresh at floor 1 (loadMap('celestial_rift', ...) below handles that entry).
  G.rift = { floor: 0, active: false, best: w.riftBest || 0, mutatorId: null, nextBurnAt: 0 };
  // Collection Book discovery — backfill seenMonsters from existing kill counts so old saves aren't blank.
  G.seenMonsters = new Set([...(w.seenMonsters || []), ...Object.keys(G.killCounts || {})]);
  G.collectedItems = new Set(w.collectedItems || []);
  G.claimedMilestones = new Set(w.claimedMilestones || []);
  // Runtime targets and paths are never restored. Rebuild the persisted intent
  // against the current quest/bounty data so removed or completed tasks cannot
  // revive a stale route after loading.
  if (w.taskGuide?.source) {
    const action = taskAction(w.taskGuide.source, w.taskGuide.taskId);
    if (action?.mapId) G.taskGuide = { ...action, resumeAutoFarm: !!w.taskGuide.resumeAutoFarm };
    else G.autoFarm = false;
  }
  if (!G.taskGuide && G.autoFarm && w.huntTargetId && monById[w.huntTargetId]) G.huntTargetId = w.huntTargetId;
  G.autoState = G.taskGuide
    ? { phase: 'route', label: T('Tracking route', 'ui'), detail: translateAny(G.taskGuide.label, ['monsters', 'npcs', 'maps']) }
    : G.autoFarm
      ? { phase: 'search', label: T('Searching', 'ui'), detail: T('Finding the next safe encounter.', 'ui') }
      : { phase: 'idle', label: T('Automation ready', 'ui'), detail: T('Track a task or enable Hunt.', 'ui') };
  preloadSprites();
  $('#root').innerHTML = '';
  startRuntime();
  const savedDungeon=[WhisperingWoods.GOBLIN_CAVE,WhisperingWoods.ELDER_HOLLOW].some(d=>d.id===w.mapId);
  const entrance=savedDungeon?MAPS.whispering_woods.portals.find(p=>p.toMap===w.mapId):null;
  if (w.weather) weatherSystem.setWeatherOverride(w.mapId, w.weather);
  if (w.incursion) incursionSystem.deserialize(w.incursion);
  if (w.gathering) gatheringSystem.deserialize(w.gathering);
  G.bestiary = cardsSystem.deserialize(w.bestiary);
  G.pets = petsSystem.deserialize(w.pets);
  syncPetFollower();
  loadMap(savedDungeon?'whispering_woods':MAPS[w.mapId]?w.mapId:'town_awakening',savedDungeon?entrance?.x:w.col,savedDungeon?entrance?.y:w.row);
  maybeStartPendingQuest();
  updateQuestTracker();
  if (G.advance?.choiceReady) {
    if (G.advance.ti === 2) showAdvancedJobChoice(p);
    else showJobChoice(p);
  }
  updateFarmButton();
  
  const tx = Math.floor(p.x / TS), ty = Math.floor(p.y / TS);
  if (tileChar(tx, ty) === '^') {
    G.physicsSuspended = true;
    const overlay = document.createElement('div');
    overlay.id = 'physics-resync-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);color:#fff;display:flex;align-items:center;justify-content:center;z-index:9999;font-size:24px;font-weight:bold;font-family:sans-serif;pointer-events:none;';
    overlay.textContent = 'Re-syncing physics...';
    document.body.appendChild(overlay);
    setTimeout(() => {
      G.physicsSuspended = false;
      overlay.remove();
    }, 1000);
  }

  G.running = true; last = now(); requestAnimationFrame(frame);
  toast(T('Welcome back, {name} — Lv {level} {class}.', 'ui')
    .replace('{name}', p.name).replace('{level}', p.level).replace('{class}', T(p.className, 'classes')), 'good');
  return true;
}

function begin(classId, name) {
  gameClock.reset();document.getElementById('resume-game')?.remove();AUDIO.resumePlayback();
  AUDIO.init();
  incursionSystem.resetToIdle();
  gatheringSystem.deserialize(null);
  G.bestiary = cardsSystem.deserialize(null);
  G.pets = petsSystem.deserialize(null);
  syncPetFollower();
  Object.assign(G,normalizeExpansion());
  G.player = makePlayer(classId, name);
  G.admin = G.player.name.trim().toLowerCase() === 'admin';   // name your hero "admin" for dev tools
  G.won = false; G.autoFarm = false; G.huntTargetId = null; G.taskGuide = null; G.advance = null; G.jobChoiceOpen = false; G.quest = null; G.pendingQuest = null; G.killCounts = {};
  G.autoConfig = normaliseAutoConfig(null);
  G.autoState = { phase: 'idle', label: T('Automation ready', 'ui'), detail: T('Track a task or enable Hunt.', 'ui') };
  G.visited = new Set(); G.talked = new Set();
  G.seenMonsters = new Set(); G.collectedItems = new Set(); G.claimedMilestones = new Set();
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
  syncModalPause();
  if(gameClock.isPaused())return;
  // Fishing active: reel in!
  if (gatheringSystem.getActiveFishing()?.active) {
    const res = gatheringSystem.resolveFishingCast();
    if (res.success) {
      addItem(res.fishId, 1);
      const fishDef = itemById[res.fishId];
      toast(`🎣 ${T('Caught', 'ui')} ${fishDef ? T(fishDef.name, 'items') : 'Fish'}!`, 'good');
      AUDIO.playSfx('pickup');
    } else {
      toast(`💨 ${T('The fish got away...', 'ui')}`, 'bad');
      AUDIO.playSfx('miss');
    }
    return;
  }
  // Incursion tear click interaction
  if (incursionSystem.getState() === INCURSION_STATES.TEAR_OPEN) {
    const tear = incursionSystem.getCurrentTear();
    if (tear && tear.mapId === G.mapId && dist(wx, wy, tear.x, tear.y) < TS * 1.5) {
      G.target = null; G.targetSource = null; G.path = null;
      if (dist(G.player.x, G.player.y, tear.x, tear.y) < TS * 2) {
        G.manualIntent = null;
        triggerIncursionStart();
      } else if (pathTo(tear.x, tear.y)) {
        G.manualIntent = { type: 'incursion_tear', x: tear.x, y: tear.y };
      }
      return;
    }
  }
  // Gathering & Fishing node interaction
  const curDayPhase = G.dayPhaseOverride ?? ((now() % TUNING.dayCycleMs) / TUNING.dayCycleMs);
  const gatherNodes = gatheringSystem.getNodesForMap(G.mapId, { dayPhase: curDayPhase, weatherId: G.weather?.id });
  let clickedNode = null, bestDist = TS * 1.5;
  for (const nd of gatherNodes) {
    const d = dist(wx, wy, nd.x, nd.y);
    if (d < bestDist) {
      clickedNode = nd;
      bestDist = d;
    }
  }
  if (clickedNode) {
    G.target = null; G.targetSource = null; G.path = null;
    if (clickedNode.harvested || (clickedNode.cooldownRemainingMs || 0) > 0) {
      toast(T('Resource node is depleted.', 'ui'), 'bad');
      return;
    }
    if (clickedNode.type === 'water_ripple') {
      if (dist(G.player.x, G.player.y, clickedNode.x, clickedNode.y) <= TS * 2.5) {
        G.manualIntent = null;
        gatheringSystem.startFishing(clickedNode.id, { mapId: G.mapId, weatherId: G.weather?.id });
        toast(`🎣 ${T('Cast line! Press SPACE or tap to reel in!', 'ui')}`, 'good');
        AUDIO.playSfx('pickup');
      } else if (pathTo(clickedNode.x, clickedNode.y)) {
        G.manualIntent = { type: 'fishing_ripple', id: clickedNode.id, x: clickedNode.x, y: clickedNode.y };
      }
      return;
    } else {
      if (dist(G.player.x, G.player.y, clickedNode.x, clickedNode.y) <= TS * 2.0) {
        G.manualIntent = null;
        const res = gatheringSystem.harvestNode(clickedNode.id, { dayPhase: curDayPhase });
        if (res?.items) {
          for (const it of res.items) addItem(it.id, it.qty);
          const firstDef = itemById[res.items[0]?.id];
          toast(`🌿 ${T('Harvested', 'ui')} ${firstDef ? T(firstDef.name, 'items') : 'resource'}!`, 'good');
          AUDIO.playSfx('pickup');
        }
      } else if (pathTo(clickedNode.x, clickedNode.y)) {
        G.manualIntent = { type: 'gather_node', id: clickedNode.id, x: clickedNode.x, y: clickedNode.y };
      }
      return;
    }
  }
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
  if (G.running && gatheringSystem.getActiveFishing()?.active && (key === ' ' || code === 'Space')) {
    e.preventDefault();
    if (!e.repeat) {
      const res = gatheringSystem.resolveFishingCast();
      if (res.success) {
        addItem(res.fishId, 1);
        const fishDef = itemById[res.fishId];
        toast(`🎣 ${T('Caught', 'ui')} ${fishDef ? T(fishDef.name, 'items') : 'Fish'}!`, 'good');
        AUDIO.playSfx('pickup');
      } else {
        toast(`💨 ${T('The fish got away...', 'ui')}`, 'bad');
        AUDIO.playSfx('miss');
      }
    }
    return;
  }
  if (G.running && captureHotkeyBinding(e)) return;
  syncModalPause();
  if(gameClock.isPaused() && !['escape','c','i','k','m','q','b'].includes(key))return;
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
  else if (key === 'b') togglePanel('book');
  else if (key === ' ') performDodge();          // dialogue-advance space returns earlier
  else if (key === 'v') performParry();
  else if (key === 'escape') {
    hideSkillTip();
    cancelHotkeyRebind(false);
    const openModals = Array.from(document.querySelectorAll('.panel, .dialogue, .slot-picker'));
    if (openModals.length > 0) {
      const topmost = openModals[openModals.length - 1];
      if (topmost.classList.contains('dialogue')) {
        topmost.remove();
        dlg = null;
      } else {
        if(topmost.dataset.kind==='guide')closeGuide();else topmost.remove();
      }
    }
  }
  if (['arrowup','arrowdown','arrowleft','arrowright',' '].includes(key)) e.preventDefault();
});
window.addEventListener('keyup', e => { G.keys[e.key.toLowerCase()] = false; });
window.addEventListener('beforeunload', saveGame);   // don't lose the last few seconds on close/refresh
window.addEventListener('blur',pauseForInterruption);
document.addEventListener?.('visibilitychange',()=>{if(document.hidden)pauseForInterruption();});

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
  window.__AWO = { G, makePlayer, recompute, loadMap, startQuest, maybeStartPendingQuest, storyPhaseFor, storyPhaseLabel, storyRoadmapHtml, storyShopRankIdx, effectiveShopRankIdx, buildHud, step, render, renderMinimap, updateHud, castSkill, castSkillById, useHotbarSlot, assignItemHotbar, assignSkillHotbar, setHotkeyBinding, resetHotkeys, normaliseHotkeys, hotkeyLabel, hotkeysPanelHtml, skillsPanelHtml, worldChronicleHtml, automationPanelHtml, updateAutomationHud, renderHotbar, openSlotPicker, adminAction, toggleFarm, activateTaskGuide, activateWorldRoute, continueTaskGuide, finishTaskGuide, refreshTaskGuideAction, taskAction, playerBasicAttack, killMonster, damageMonster, gainXp, useItem, equip,interact, learnSkill, learnPassive, canLearnPassive, passiveBonuses, spendStat, resetStatPoints, resetSkillPoints, statPointEntitlement, maybeStartAdvance, startAdvanceQuest, doPromote, checkAdvance, canLearn, skillLevel, skillCapForTier, skillRankGate, previewSlotUsedBy, canPreview, skillPointEntitlement, skillPointsSpent, normalisePlayerProgression, jobBranchesFor, jobBranchFor, tierForPlayer, branchAllowsSkill, normaliseJobBranch, jobChoicePanelHtml, showJobChoice, chooseJobBranch, statCost, xpForNext, jobXpForNext, togglePanel, panelBody, rollItem, addItem, itemQty, effAtk, effDef, itemSlot, itemAffixes, socketStats, socketGem, transmogItem, findGearInstance, SOCKET_BOUNDS, compareEquipment, gearStatSnapshot, gearComparisonHtml, gearBuildAdviceHtml, unequip, acceptGuild, requestGuildRevoke, revokeGuild, guildKill, guildTurnIn, claimGuild, finishGuild, refreshGuildBoard, rerollGuildBoard, bountyLevelRange, bountyLevelHtml, checkQuest, makeMonster, monsterStatsFor, heatLevel, buildHeatField, heatDepthAt, respawn, spawnRareBoss, placeRareBoss, checkAchievements, depositItem, withdrawItem, craftItem, doRebirth, autoHuntEligible, autoHuntLevelCap, normaliseAutoConfig, autoProfile, setAutoState, chooseAutoHealSkill, bestRecoveryItem, chooseAutoSkill, autoRecoveryAction, acquireAutoTarget, zoneGuardian, ZONE_ORDER, WORLD_ORDER, genGuildQuest, expGapFactor, combatGapFactor, updateMonsters, stopAutomationOnDeath, playerDeath, dropBias, saveGame, resumeGame, hasSave, readSave, deleteSave, sellItem, sellPrice, buy, refineItem, instName, refineCost, refineFrags, refineOre, addGuildPoints, guildAllowedDiffs, guildPointsNeed, GUILD_RANKS, rerollShop, shopRollBias, shopPrice, shopStockItem, refineTier, tierOwned, RARITY, setLanguage, onCanvasClick: (wx, wy) => handleClick(wx, wy), findPath, pathTo, DESIGN, PROGRESSION, CONTENT, setCtx: (cv) => { canvas = cv; ctx = cv.getContext('2d'); },
    LPC, playerAnim, drawLpc, monsterAnim, animFrame, animMs, attackStateFor, finisherStateFor, drawPx, drawMonster, PX, selfCheck,
    TILE_PHASES, TILE_PHASE_MS, prefersReducedMotion, buildTile, drawTile, drawTileEdges, drawParallax, buildParallaxStrip,
    advancedJobsFor, advancedJobFor, activeJobLevelCap, chooseAdvancedJob, showAdvancedJobChoice, normaliseAdvancedJob, advancedJobAllowsSkill, advancedJobAllowsPassive,
    canUseItem, itemClassRequirementText, classWeaponFor, getBgBuffer: () => bgBufferCanvas, initTouchControls, isTouchDevice,
    monsterElement, skillElement, attackElement, imbueElement, elementMult, applyCrossCombo, applyStatus,
    elementMeta, weakToElement, collectionBookHtml, milestoneStat, milestoneTarget, claimMilestone,
    performDodge, performParry, playerAvoidsHit, evaluateMacroRules, normaliseAutoConfig,
    floatText, drawFloaties, FLOAT_CAP, FLOAT_LIFE_MS, applyHighContrast, floatColor };

const {refreshDailies,claimDaily,claimMastery,setZoneDifficulty,masteryTravel,enterSubdungeon,exitSubdungeon,spawnZoneRare,adventurePanelHtml}=createExpansion({G,DESIGN,CONTENT,MAPS,zone:WhisperingWoods,gainXp,saveGame,loadMap,makeMonster,recompute,esc});
Object.assign(window.__AWO,{refreshDailies,claimDaily,claimMastery,setZoneDifficulty,enterSubdungeon,exitSubdungeon,spawnZoneRare});
Object.assign(window.__AWO,{gameClock,pauseGame,resumeGameFromPause,clearInput,dispatchPlayerAction,initTouchControls,getViewport:()=>runtimeViewport,syncRuntimeScale,masteryTravel});
const {saveLoadout,renameLoadout,applyLoadout,setItemProtection,loadoutPanelHtml}=createEquipmentFeatures({G,itemById,itemSlot,canUseItem,canUseSkill:(p,id)=>skillLevel(p,id)>0&&branchAllowsSkill(p,id)&&skillsFor(p.combatClass).some(s=>s.id===id),recompute,saveGame,renderHotbar,esc});
Object.assign(window.__AWO,{saveLoadout,renameLoadout,applyLoadout,setItemProtection,frame});
const {pinGoal,openGuide,closeGuide,guidePanelHtml,goalTrackerHtml}=createGuidance({G,CONTENT,COMBAT,PROGRESSION,MAPS,esc,saveGame,updateQuestTracker,togglePanel,skillsFor,skillElement});
Object.assign(window.__AWO,{pinGoal,openGuide,closeGuide});
boot();
