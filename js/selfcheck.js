// Load-time data integrity check. Fails loudly (console) when content ids,
// sprites, icons, quests or formulas drift out of sync. Moved verbatim from game.js.
import { DESIGN } from './design.js';
const TUNING = DESIGN.tuning;
import { CONTENT } from './content.js';
import { MAPS } from './maps.js';
import { COMBAT } from './combat.js';
import { PROGRESSION } from './progression.js';
import { PX, ITEM_ICON, SLOT_ICON } from './pixelart.js';
import { LPC } from './lpc.js';

export function runSelfCheck(engine) {
  const {
    CLASS_COMBAT,
    DIFFICULTY,
    F,
    GUILD_RANKS,
    ITEM_ICON,
    NPC_BY_ROLE,
    REFINE_FRAG,
    SLOT_ICON,
    ZONE_ORDER,
    advancedJobConfig,
    chance,
    itemById,
    itemDropSource,
    jobBranchConfig,
    jobXpForNext,
    monById,
    npcById,
    questById,
    questSuccessorIds,
    skillsFor,
    xpForNext,
    zoneGuardian,
  } = engine;

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
  if (!Array.isArray(PROGRESSION.jobLevelCaps) || PROGRESSION.jobLevelCaps.join(',') !== '15,40,50,60')
    errs.push('job level caps must be exactly 15 < 40 < 50 < 60');
  for (const c of DESIGN.classes) {
    const cfg = advancedJobConfig(c.id);
    if (!cfg || cfg.choices?.length !== 2) errs.push(`class ${c.id} must have exactly two third-job choices`);
    else {
      const ids = cfg.choices.map(job => job.id);
      if (new Set(ids).size !== 2 || !ids.includes(cfg.defaultId)) errs.push(`class ${c.id} third-job IDs/default invalid`);
      for (const job of cfg.choices) {
        for (const [id, node] of Object.entries(PROGRESSION.skillTree))
          if (node.reqAdvancedJob === job.id && !COMBAT.skills.some(skill => skill.id === id)) errs.push(`${id} gates unknown skill`);
        for (const [id, passive] of Object.entries(PROGRESSION.passives || {}))
          if (passive.reqAdvancedJob === job.id && !passive.name) errs.push(`${id} has invalid exclusive passive`);
      }
    }
    const usableWeapons = CONTENT.items.filter(it => it.type === 'weapon' && (!it.classReq || it.classReq.includes(c.id)));
    if (!usableWeapons.some(it => (it.gearLevel || 1) <= 10) || !usableWeapons.some(it => (it.gearLevel || 1) >= 30) || !usableWeapons.some(it => (it.gearLevel || 1) >= 60))
      errs.push(`class ${c.id} lacks usable early/mid/late weapon progression`);
  }
  for (const item of CONTENT.items) if (Array.isArray(item.classReq) && (!item.classReq.length || item.classReq.some(id => !DESIGN.classes.some(c => c.id === id))))
    errs.push(`item ${item.id} has invalid classReq`);
  const SIEGE_DROPS = new Set(['iron_ore', 'beast_fang', 'essence_fire', 'hardwood']);
  for (const m of CONTENT.monsters)
    for (const d of m.drops) if (!itemById[d.itemId] && !SIEGE_DROPS.has(d.itemId)) errs.push(`monster ${m.id} drops unknown ${d.itemId}`);
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
  for (const c of DESIGN.classes) {
    const cfg = jobBranchConfig(c.id), budget = DESIGN.jobBranchBalance?.tierStatPointBudgets?.[c.id];
    if (!cfg || cfg.choices?.length !== 2) { errs.push(`class ${c.id} must have exactly two second-job branches`); continue; }
    if (!cfg.choices.some(branch => branch.id === cfg.defaultId)) errs.push(`class ${c.id} branch default is invalid`);
    if (new Set(cfg.choices.map(branch => branch.id)).size !== cfg.choices.length) errs.push(`class ${c.id} branch ids are not unique`);
    for (const branch of cfg.choices) {
      const signature = COMBAT.skills.find(skill => skill.id === branch.signatureSkillId);
      const node = PROGRESSION.skillTree[branch.signatureSkillId];
      for (const ti of [1, 2]) {
        const tier = branch.tiers?.[ti], points = Object.values(tier?.bonus || {}).reduce((sum, value) => sum + value, 0);
        if (!(tier?.name && points === budget?.[ti])) errs.push(`${c.id}/${branch.id} tier ${ti} has wrong title/stat budget`);
      }
      if (!signature || signature.classId !== CLASS_COMBAT[c.id]) errs.push(`${c.id}/${branch.id} signature skill is invalid`);
      if (!(node?.reqBranch === branch.id && node.reqTier === DESIGN.jobBranchBalance?.signature?.reqTier)) errs.push(`${c.id}/${branch.id} signature gate is invalid`);
      // ---- branch identity: unique passive mechanic + illustrative combo + Tier-2 mastery trial ----
      const mech = branch.mechanic, trigger = mech && COMBAT.skills.find(sk2 => sk2.id === mech.triggerSkillId);
      if (!mech || !trigger || trigger.classId !== CLASS_COMBAT[c.id]) errs.push(`${c.id}/${branch.id} mechanic trigger skill is invalid`);
      else if (!DESIGN.jobBranchBalance.mechanic[mech.kind]) errs.push(`${c.id}/${branch.id} mechanic kind '${mech.kind}' is unknown`);
      else if (mech.kind === 'bonusBuff' && !['atk', 'def'].includes(mech.stat)) errs.push(`${c.id}/${branch.id} bonusBuff needs stat atk|def`);
      else if (mech.kind === 'detonateAmp' && !(mech.statuses?.length && mech.statuses.every(st => ['stun', 'burn', 'slow', 'sunder'].includes(st)))) errs.push(`${c.id}/${branch.id} detonateAmp needs statuses from stun|burn|slow|sunder (never mark — it must persist)`);
      else if (mech.kind === 'detonateAmp' && signature?.detonate && mech.statuses.includes(signature.detonate)) errs.push(`${c.id}/${branch.id} mechanic competes with its own signature's detonate (${signature.detonate})`);
      else if (mech.kind === 'procCdr' && !COMBAT.skills.some(sk2 => sk2.id === mech.targetSkillId)) errs.push(`${c.id}/${branch.id} procCdr targets unknown skill ${mech.targetSkillId}`);
      else if (mech.kind === 'extendStatus' && !COMBAT.statusEffects[trigger.effect]) errs.push(`${c.id}/${branch.id} extendStatus trigger applies no status`);
      if (!(Array.isArray(branch.combo) && branch.combo.length >= 2 && branch.combo.length <= 4 && branch.combo.every(id => skillIds.has(id))))
        errs.push(`${c.id}/${branch.id} combo must list 2-4 real skills`);
      const mastery = branch.tiers?.[2]?.advance;
      if (!mastery?.name || !mastery?.objective) errs.push(`${c.id}/${branch.id} is missing its Tier-2 mastery trial`);
      else {
        const o = mastery.objective;
        if (o.type === 'kill' && !monById[o.target]) errs.push(`${c.id}/${branch.id} mastery trial kills unknown ${o.target}`);
        if (o.type === 'collect' && !itemById[o.target]) errs.push(`${c.id}/${branch.id} mastery trial collects unknown ${o.target}`);
      }
    }
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
  // LPC sheet metadata: every state must sit inside the measured 54-row core, and
  // every class needs an attack/finisher identity or it silently sword-slashes.
  const LPC_SHEET_ROWS = 54;
  for (const [id, st] of Object.entries(LPC.states)) {
    if (!Number.isFinite(st.row) || !Number.isFinite(st.frames) || !Number.isFinite(st.ms)) errs.push(`LPC state ${id} missing row/frames/ms`);
    if (st.frames > LPC.cols) errs.push(`LPC state ${id} wants ${st.frames} frames but the core grid is ${LPC.cols} wide`);
    if (st.row + (st.downOnly ? 1 : LPC.dirs.length) > LPC_SHEET_ROWS) errs.push(`LPC state ${id} runs past row ${LPC_SHEET_ROWS}`);
  }
  for (const cc of Object.values(CLASS_COMBAT)) {
    if (!LPC.player[cc]) errs.push(`no LPC sheet for ${cc}`);
    const a = LPC.anim[cc];
    if (!a) { errs.push(`no LPC anim identity for ${cc}`); continue; }
    for (const k of ['attack', 'finisher']) if (!LPC.states[a[k]]) errs.push(`LPC anim ${cc}.${k} → unknown state ${a[k]}`);
  }
  for (const k of new Set(Object.values(ITEM_ICON))) if (!PX.item[k]) errs.push(`missing item icon '${k}'`);
  for (const it of CONTENT.items) if (!ITEM_ICON[it.id]) errs.push(`item ${it.id} has no icon mapping`);
  for (const [id, pa] of Object.entries(PROGRESSION.passives || {})) {
    if (!Object.values(CLASS_COMBAT).includes(pa.classId)) errs.push(`passive ${id} bad class ${pa.classId}`);
    if (pa.reqLevel > PROGRESSION.jobLevelCap) errs.push(`passive ${id} requires Job Lv beyond cap`);
    if ((pa.reqTier || 0) > 2) errs.push(`passive ${id} has invalid tier`);
  }
  for (const k of new Set(Object.values(SLOT_ICON))) if (!PX.item[k]) errs.push(`missing slot icon '${k}'`);
  // tuning knobs + quest difficulty tiers must be present/valid
  for (const k of ['monsterLevelSpread','monsterStatPerLevel','monsterAtkMult','monsterHpMult','monsterHpLevelGrowth','monsterDefLevelGrowth','bossHpMult','bossDefLevelGrowth','monsterExpMult','expGapFalloff','expGapRise','expGapMin','expGapMax','dropLevelBias','dropLuckBias','zenyPerLevel','combatGapFalloff','combatGapFloor','deathZenyLoss','bossSlamEveryMs','bossEnrageAt','statCostEvery','potionCdMs','combatGapHitPerLvl','autoHuntMaxLevelGap','hitBaseChance','hitStatScale','hitChanceMin','hitChanceMax','heatNursery','rareBossEveryMs','dayCycleMs','rebirthStatBonus','rebirthHpMpPct','rebirthMonsterAtkMult','rebirthMonsterDefMult','rebirthMonsterHpMult','rebirthGearHpPerAtk','rebirthGearHpCap','rebirthMonsterExp'])
    if (!Number.isFinite(TUNING?.[k])) errs.push(`tuning.${k} missing/non-numeric`);
  for (const k of ['max','finisherMin','perHit','decayMs','powerPerPoint','detonateBonus'])
    if (!Number.isFinite(TUNING?.momentum?.[k])) errs.push(`tuning.momentum.${k} missing/non-numeric`);
  // refinement: chance table must cover every step to max, fuel tables every bracket
  const rf = TUNING.refine || {};
  if (!Number.isFinite(rf.max) || !Number.isFinite(rf.atkPerPlus)) errs.push('tuning.refine.max/atkPerPlus missing');
  if (!Array.isArray(rf.chance) || rf.chance.length !== rf.max) errs.push(`tuning.refine.chance must have ${rf.max} entries`);
  if (rf.chance?.some(c => !(c > 0 && c <= 100))) errs.push('tuning.refine.chance has a non-percentage entry');
  for (const k of ['fragsPerTier', 'orePerTier'])
    if (!Array.isArray(rf[k]) || rf[k].length !== 3 || rf[k].some(n => !(n >= 1))) errs.push(`tuning.refine.${k} needs 3 positive brackets`);
  // every non-neutral element must be somebody's weakness, or its whole kit is dead damage
  for (const el of (TUNING.elements?.ids || []).filter(e => e !== 'physical'))
    if (!Object.values(TUNING.elements.weakness).includes(el)) errs.push(`element ${el} is nobody's weakness — attacks of that element can never crit the wheel`);
  for (const s of COMBAT.skills) if (s.detonate && !COMBAT.statusEffects[s.detonate]) errs.push(`skill ${s.id} detonate → unknown status ${s.detonate}`);
  // elemental matrix, cross-class combos, stamina knobs (Phase 2)
  const elemIds = new Set(TUNING.elements?.ids || []);
  if (!elemIds.size || !Number.isFinite(TUNING.elements?.weaknessMult)) errs.push('tuning.elements missing/invalid');
  for (const [def, att] of Object.entries(TUNING.elements?.weakness || {}))
    if (!elemIds.has(def) || !elemIds.has(att)) errs.push(`tuning.elements.weakness ${def}→${att} unknown element`);
  for (const md of CONTENT.monsters) if (md.element && !elemIds.has(md.element) && md.element !== 'earth') errs.push(`monster ${md.id} → unknown element ${md.element}`);
  if (!(COMBAT.crossCombos || []).length) errs.push('no cross-class combos defined');
  for (const combo of COMBAT.crossCombos || []) {
    if (!COMBAT.skills.some(s => s.id === combo.detonatorSkill)) errs.push(`crossCombo ${combo.id} → unknown detonator ${combo.detonatorSkill}`);
    if (!COMBAT.statusEffects[combo.primerStatus]) errs.push(`crossCombo ${combo.id} → unknown primer status ${combo.primerStatus}`);
    if (combo.aoeStatus && !COMBAT.statusEffects[combo.aoeStatus]) errs.push(`crossCombo ${combo.id} → unknown aoe status ${combo.aoeStatus}`);
  }
  for (const k of ['max', 'regenPerSec', 'dodgeCost', 'dodgeMs', 'dodgeDistTiles', 'parryCost', 'parryWindowMs', 'parryStunMs', 'counterMult', 'counterMs'])
    if (!Number.isFinite(TUNING?.stamina?.[k])) errs.push(`tuning.stamina.${k} missing/non-numeric`);
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
  for (const mile of CONTENT.milestones || []) {
    if (!['kills', 'bestiary', 'items'].includes(mile.type)) errs.push(`milestone ${mile.id} bad type ${mile.type}`);
    if (!Number.isFinite(mile.target) || mile.target < 0) errs.push(`milestone ${mile.id} bad target`);
    if (mile.reward?.itemId && !itemById[mile.reward.itemId]) errs.push(`milestone ${mile.id} → unknown reward item ${mile.reward.itemId}`);
    if (!mile.label || !mile.icon) errs.push(`milestone ${mile.id} missing label/icon`);
  }
  if (!achIds.size) errs.push('no achievements defined');
  for (const q of CONTENT.quests) if (q.difficulty && !DIFFICULTY[q.difficulty]) errs.push(`quest ${q.id} bad difficulty ${q.difficulty}`);
  for (const it of CONTENT.items) if (it.rankReq && !GUILD_RANKS.includes(it.rankReq)) errs.push(`item ${it.id} bad rankReq ${it.rankReq}`);
  for (const fid of REFINE_FRAG) if (!itemById[fid]) errs.push(`refine fragment unknown item ${fid}`);
  for (const mid of ZONE_ORDER) if (!MAPS[mid] || !zoneGuardian(mid)) errs.push(`zone order entry ${mid} missing map/guardian`);
  for (const [mid, m] of Object.entries(MAPS)) m.tiles.forEach((row, y) => { if (row.length !== m.width) errs.push(`map ${mid} row ${y} width ${row.length} != ${m.width}`); });
  for (const it of CONTENT.items) if (it.buff && !(['atk', 'def', 'hp', 'speed', 'critDmg', 'all'].includes(it.buff.stat) && (Number.isFinite(it.buff.mult) || Number.isFinite(it.buff.flat)) && it.buff.durationMs > 0)) errs.push(`item ${it.id} bad buff spec`);
  for (const it of CONTENT.items) if (it.teleport && !MAPS[it.teleport]) errs.push(`item ${it.id} teleport → unknown map ${it.teleport}`);
  for (const [id, profile] of Object.entries(TUNING.automationProfiles || {})) {
    if (!(profile.healSkillAt > profile.hpPotionAt && profile.hpPotionAt > profile.mpPotionAt && profile.mpPotionAt > 0 && profile.healSkillAt < 1)) errs.push(`automation profile ${id} thresholds invalid`);
  }
  if (errs.length) { console.error('[selfcheck] FAILED:\n' + errs.join('\n')); throw new Error('data self-check failed'); }
  console.log('[selfcheck] OK — classes/skills/maps/drops/quests/formulas all resolve');
}

export function selfCheck(engine) {
  if (engine) return runSelfCheck(engine);
  const monById = Object.fromEntries(CONTENT.monsters.map(m => [m.id, m]));
  const itemById = Object.fromEntries(CONTENT.items.map(i => [i.id, i]));
  const npcById = Object.fromEntries(CONTENT.npcs.map(n => [n.id, n]));
  const questById = Object.fromEntries(CONTENT.quests.map(q => [q.id, q]));
  const monsterMapName = {};
  const monsterMapId = {};
  for (const map of Object.values(MAPS)) {
    for (const sp of (map.spawns || [])) {
      if (!(sp.monsterId in monsterMapName)) {
        monsterMapName[sp.monsterId] = map.name;
        monsterMapId[sp.monsterId] = map.id;
      }
    }
  }
  const itemDropSource = itemId => {
    for (const m of CONTENT.monsters) {
      if (m.drops.some(d => d.itemId === itemId)) {
        return { mon: m.name, monsterId: m.id, map: monsterMapName[m.id], mapId: monsterMapId[m.id] };
      }
    }
    return null;
  };
  const VARS = ['baseHp','vit','level','int','str','dex','weaponAtk','armorDef','agi','luk','attackerAtk','defenderDef','isCrit'];
  const compile = expr => new Function('a', `const {${VARS.join(',')}}=a; return (${expr});`);
  const F = Object.fromEntries(Object.entries(DESIGN.formulas).map(([k, e]) => [k, compile(e)]));
  const defaultEngine = {
    CLASS_COMBAT: { reborn_blade: 'blade', drifter: 'berserker', codeweaver: 'mage', far_shot: 'ranger', lightbringer: 'paladin', iron_fist: 'monk', stormcaller: 'elementalist' },
    DIFFICULTY: {
      easy:   { name: 'Easy',   color: '#7bd88f', mult: 0.8, band: [1, 5] },
      normal: { name: 'Normal', color: '#e0c351', mult: 1.0, band: [6, 12] },
      hard:   { name: 'Hard',   color: '#e8963c', mult: 1.4, band: [13, 18] },
      elite:  { name: 'Elite',  color: '#e0574b', mult: 2.0, band: [18, 99] },
    },
    F,
    GUILD_RANKS: ['F', 'E-', 'E', 'E+', 'D-', 'D', 'D+', 'C-', 'C', 'C+', 'B-', 'B', 'B+', 'A-', 'A', 'A+', 'S'],
    ITEM_ICON,
    NPC_BY_ROLE: { shop: 'npc_shopkeeper', guild: 'elder', quest: 'npc_guide', story: 'npc_storyteller' },
    REFINE_FRAG: ['wolf_fang', 'shade_dust', 'star_iron'],
    SLOT_ICON,
    ZONE_ORDER: ['whispering_woods', 'sunken_ruins', 'frostpeak_tundra', 'dragon_caldera', 'astral_rift'],
    advancedJobConfig: classId => PROGRESSION.advancedJobs?.[classId] || null,
    chance: p => Math.random() < p,
    itemById,
    itemDropSource,
    jobBranchConfig: classId => PROGRESSION.jobBranches?.[classId] || null,
    jobXpForNext: new Function('level', `return (${DESIGN.jobXpCurve});`),
    monById,
    npcById,
    questById,
    questSuccessorIds: q => q.nextQuestByClass ? Object.values(q.nextQuestByClass) : (q.nextQuestId ? [q.nextQuestId] : []),
    skillsFor: cc => COMBAT.skills.filter(s => s.classId === cc),
    xpForNext: new Function('level', `return (${DESIGN.xpCurve});`),
    zoneGuardian: mid => MAPS[mid].spawns.map(sp => monById[sp.monsterId]).find(d => d?.sizeTiles >= 2)?.id,
  };
  return runSelfCheck(defaultEngine);
}

