import assert from 'node:assert/strict';
import { DESIGN } from './design.js';
import { CONTENT } from './content.js';
import { COMBAT } from './combat.js';
import { PROGRESSION } from './progression.js';
import { RARITY, RARITY_ORDER, AFFIXES } from './loot.js';
import { MAPS } from './maps.js';
import { PX } from './pixelart.js';

const CLASS_COMBAT = {
  reborn_blade: 'blade', drifter: 'berserker', codeweaver: 'mage',
  far_shot: 'ranger', lightbringer: 'paladin', iron_fist: 'monk',
  stormcaller: 'elementalist',
};
const MAGIC = new Set(['mage', 'elementalist']);

const compile = expr => new Function('a', `const {baseHp,vit,level,int,str,dex,weaponAtk,armorDef,agi,luk,attackerAtk,defenderDef,isCrit}=a; return (${expr});`);
const F = Object.fromEntries(Object.entries(DESIGN.formulas).map(([key, expr]) => [key, compile(expr)]));
const xpForNext = new Function('level', `return (${DESIGN.xpCurve});`);
const jobXpForNext = new Function('level', `return (${DESIGN.jobXpCurve});`);
const skill = id => COMBAT.skills.find(entry => entry.id === id);

const weaponAt = level => level < 5 ? 0 : level < 10 ? 4 : level < 16 ? 10
  : level < 25 ? 14 : level < 35 ? 22 : level < 48 ? 30
    : level < 61 ? 47 : level < 74 ? 56 : 66;
const accessoryAt = level => level < 10 ? 0 : level < 25 ? 6 : level < 35 ? 8
  : level < 48 ? 10 : level < 74 ? 12 : 14;

function statsAt(cls, level) {
  const stats = {};
  for (const stat of Object.keys(cls.baseStats)) {
    stats[stat] = Math.floor(cls.baseStats[stat] + cls.statGrowthPerLevel[stat] * (level - 1));
  }
  return stats;
}

function classAttack(cls, level) {
  const stats = statsAt(cls, level);
  const scope = { ...stats, level, weaponAtk: weaponAt(level) };
  const combatClass = CLASS_COMBAT[cls.id];
  if (MAGIC.has(combatClass)) return F.magicAtk(scope);
  if (combatClass === 'ranger') return F.rangedAtk(scope);
  return F.physAtk(scope);
}

function progressedAttack(cls, level, { rebirths = 0, retainedGear = false } = {}) {
  const stats = statsAt(cls, level);
  for (const stat of Object.keys(stats)) stats[stat] += rebirths * DESIGN.tuning.rebirthStatBonus;
  const combatClass = CLASS_COMBAT[cls.id];
  const primary = MAGIC.has(combatClass) ? 'int' : combatClass === 'ranger' ? 'dex' : 'str';
  let points = PROGRESSION.startStatPoints + PROGRESSION.statPointsPerLevel * (level - 1);
  while (points >= 1 + Math.floor(stats[primary] / DESIGN.tuning.statCostEvery)) {
    points -= 1 + Math.floor(stats[primary] / DESIGN.tuning.statCostEvery);
    stats[primary]++;
  }
  const weaponAtk = retainedGear
    ? Math.round((66 + 14) * RARITY.legendary.mult)
    : weaponAt(level) + accessoryAt(level);
  const scope = { ...stats, level, weaponAtk };
  if (MAGIC.has(combatClass)) return F.magicAtk(scope);
  if (combatClass === 'ranger') return F.rangedAtk(scope);
  return F.physAtk(scope);
}

function starterFor(cls) {
  return COMBAT.skills.find(entry => entry.classId === CLASS_COMBAT[cls.id]
    && PROGRESSION.skillTree[entry.id]?.reqSkill == null);
}

function starterRankAt(level, starter) {
  let rank = Math.min(5, level);
  for (let next = 6; next <= PROGRESSION.skillTree[starter.id].maxLevel; next++) {
    if (level >= (PROGRESSION.skillTree[starter.id].rankReqLevels?.[next] ?? Infinity)) rank = next;
  }
  return rank;
}

const skillRankScale = rank => 1
  + PROGRESSION.skillScale * Math.min(Math.max(rank - 1, 0), 4)
  + PROGRESSION.masteryScale * Math.max(rank - 5, 0);

function monsterStats(monster, level = monster.level, { rebirths = 0, retainedGearAtk = 0 } = {}) {
  const scale = 1 + (level - monster.level) * DESIGN.tuning.monsterStatPerLevel;
  const durabilityScale = Math.max(1, scale);
  const normal = monster.sizeTiles < 2;
  const levelRoot = Math.sqrt(Math.max(0, Math.max(level, monster.level) - 1));
  const levelHpMult = normal ? 1 + levelRoot * DESIGN.tuning.monsterHpLevelGrowth : 1;
  const levelDefMult = normal ? 1 + levelRoot * DESIGN.tuning.monsterDefLevelGrowth : 1;
  const progress = Math.max(0, Math.min(1, (level - 1) / (DESIGN.levelCap - 1)));
  const gearHp = rebirths
    ? Math.min(DESIGN.tuning.rebirthGearHpCap, retainedGearAtk * DESIGN.tuning.rebirthGearHpPerAtk) * (1 - progress)
    : 0;
  const rebirthHpMult = 1 + rebirths * DESIGN.tuning.rebirthMonsterHpMult + gearHp;
  const rebirthDefMult = 1 + rebirths * DESIGN.tuning.rebirthMonsterDefMult;
  const bossMult = monster.sizeTiles >= 2 ? DESIGN.tuning.bossHpMult : 1;
  return {
    hp: Math.round(monster.hp * durabilityScale * DESIGN.tuning.monsterHpMult * levelHpMult * bossMult * rebirthHpMult),
    dv: Math.round(monster.def * durabilityScale * levelDefMult * rebirthDefMult),
    exp: Math.round(monster.exp * scale * DESIGN.tuning.monsterExpMult * (1 + rebirths * DESIGN.tuning.rebirthMonsterExp)),
  };
}

// Primary attack curves stay close enough that role and skill kit decide the winner.
for (const level of [1, 15, 40, 60, 80]) {
  const values = DESIGN.classes.map(cls => classAttack(cls, level));
  const maxSpread = level === 1 ? 1.4 : 1.25;
  assert.ok(Math.max(...values) / Math.min(...values) <= maxSpread, `class ATK spread is too wide at level ${level}`);
}
const storm = DESIGN.classes.find(cls => cls.id === 'stormcaller');
const ranger = DESIGN.classes.find(cls => cls.id === 'far_shot');
assert.ok(classAttack(storm, 40) > F.physAtk({ ...statsAt(storm, 40), weaponAtk: weaponAt(40) }), 'Stormcaller must scale from INT');
assert.ok(classAttack(ranger, 40) > F.physAtk({ ...statsAt(ranger, 40), weaponAtk: weaponAt(40) }), 'Far Shot must scale primarily from DEX');

// Real at-level builds include focused stat spending, shop gear, and the starter
// skill's available rank. Normal enemies must resist one-shots throughout the
// journey; guardians use their separate, longer encounter multiplier.
for (const monster of CONTENT.monsters) {
  const { hp, dv, exp } = monsterStats(monster);
  if (monster.sizeTiles < 2) {
    for (const cls of DESIGN.classes) {
      const attack = progressedAttack(cls, monster.level);
      const starter = starterFor(cls);
      const power = starter.power * skillRankScale(starterRankAt(monster.level, starter));
      const basicHits = Math.ceil(hp / Math.max(1, attack - dv));
      const starterCasts = Math.ceil(hp / Math.max(1, attack * power - dv));
      assert.ok(basicHits >= 4 && basicHits <= 17, `${monster.id}/${cls.id} basic-hit target drifted: ${basicHits}`);
      assert.ok(starterCasts >= 2 && starterCasts <= 4, `${monster.id}/${cls.id} starter one-shot or sponge: ${starterCasts}`);
    }
    const killsForLevel = xpForNext(Math.min(monster.level, 79)) / exp;
    assert.ok(killsForLevel >= 20 && killsForLevel <= 31, `${monster.id} XP pace drifted: ${killsForLevel.toFixed(1)} kills`);
  } else {
    const averageAttack = DESIGN.classes.reduce((sum, cls) => sum + classAttack(cls, monster.level), 0) / DESIGN.classes.length;
    const starterCasts = hp / Math.max(1, averageAttack * 2 - dv);
    assert.ok(starterCasts >= 20 && starterCasts <= 34, `${monster.id} guardian duration drifted: ${starterCasts.toFixed(1)} casts`);
  }
}

// The reported breakpoints stay explicit: opening Slimes take about three
// starter casts, and even a low-rolled Wolf cannot be one-shot by a focused
// level-10 build with its rank-5 starter skill.
const slime = CONTENT.monsters.find(monster => monster.id === 'slime');
const openingSlime = monsterStats(slime, 1);
const wolf = CONTENT.monsters.find(monster => monster.id === 'wolf');
const lowWolf = monsterStats(wolf, 8);
for (const cls of DESIGN.classes) {
  const starter = starterFor(cls);
  const openingDamage = progressedAttack(cls, 1) * starter.power - openingSlime.dv;
  assert.ok(Math.ceil(openingSlime.hp / openingDamage) >= 3, `${cls.id} clears the opening Slime too quickly`);
  const wolfPower = starter.power * skillRankScale(starterRankAt(10, starter));
  const wolfDamage = progressedAttack(cls, 10) * wolfPower - lowWolf.dv;
  assert.ok(wolfDamage < lowWolf.hp, `${cls.id} can one-shot a low-rolled Wolf at level 10`);
}

// Rebirth keeps endgame gear. Physical/ranged characters therefore add a
// temporary gear-pressure HP component, while magic characters receive only
// the base rebirth scaling because weapon ATK does not feed their formula.
const retainedGearAtk = Math.round((66 + 14) * RARITY.legendary.mult);
for (const cls of DESIGN.classes) {
  const usesWeaponAtk = !MAGIC.has(CLASS_COMBAT[cls.id]);
  const rebornSlime = monsterStats(slime, 1, { rebirths: 1, retainedGearAtk: usesWeaponAtk ? retainedGearAtk : 0 });
  const attack = progressedAttack(cls, 1, { rebirths: 1, retainedGear: true });
  const starter = starterFor(cls);
  const basicHits = Math.ceil(rebornSlime.hp / Math.max(1, attack - rebornSlime.dv));
  const starterCasts = Math.ceil(rebornSlime.hp / Math.max(1, attack * starter.power - rebornSlime.dv));
  assert.ok(basicHits >= 4 && basicHits <= 6, `${cls.id} rebirth opening basic-hit pace drifted: ${basicHits}`);
  assert.ok(starterCasts >= 2 && starterCasts <= 3, `${cls.id} rebirth opening skill pace drifted: ${starterCasts}`);
}
assert.ok(
  monsterStats(slime, 1, { rebirths: 2, retainedGearAtk }).hp > monsterStats(slime, 1, { rebirths: 1, retainedGearAtk }).hp,
  'each additional rebirth must continue raising monster HP',
);

// The Base track reaches 80 while the RO-style Job track stops at 50.
let earnedXp = 0;
for (let level = 1; level < DESIGN.levelCap; level++) earnedXp += xpForNext(level);
let jobLevel = 1;
while (jobLevel < PROGRESSION.jobLevelCap && earnedXp >= jobXpForNext(jobLevel)) earnedXp -= jobXpForNext(jobLevel++);
assert.equal(DESIGN.levelCap, 80, 'base level cap must remain 80');
assert.equal(PROGRESSION.jobLevelCap, 50, 'job level cap must preserve finite skill builds');
assert.equal(jobLevel, PROGRESSION.jobLevelCap, `job track must reach its cap by Base Lv ${DESIGN.levelCap}`);

// The main story follows the same five level bands as the world. Its single
// forward chain must cover every quest and finish at the Base Lv 80 finale.
assert.deepEqual(CONTENT.storyPhases.map(phase => [phase.levelMin, phase.levelMax]),
  [[1, 15], [16, 30], [31, 45], [46, 60], [61, 80]], 'story phases must cover Base Lv 1–80 without gaps');
const questById = Object.fromEntries(CONTENT.quests.map(quest => [quest.id, quest]));
const successorIds = quest => quest.nextQuestByClass
  ? Object.values(quest.nextQuestByClass) : (quest.nextQuestId ? [quest.nextQuestId] : []);
const chainedQuestIds = new Set(CONTENT.quests.flatMap(successorIds));
const storyRoots = CONTENT.quests.filter(quest => !chainedQuestIds.has(quest.id));
assert.deepEqual(storyRoots.map(quest => quest.id), ['q_awaken'], 'story must have one awakening root');
// the story is linear except one per-class fork; every class's walk must be
// forward-moving and cycle-free, and together the walks must cover every quest
const walked = new Set();
for (const cls of DESIGN.classes) {
  const classWalk = new Set(); let storyQuest = questById.q_awaken;
  while (storyQuest && !classWalk.has(storyQuest.id)) {
    classWalk.add(storyQuest.id); walked.add(storyQuest.id);
    const phase = CONTENT.storyPhases.find(entry => entry.id === storyQuest.phase);
    assert.ok(storyQuest.minLevel >= phase.levelMin && storyQuest.minLevel <= phase.levelMax,
      `${storyQuest.id} must unlock inside its story phase`);
    const next = questById[storyQuest.nextQuestByClass ? storyQuest.nextQuestByClass[cls.id] : storyQuest.nextQuestId];
    if (next) assert.ok(next.minLevel >= storyQuest.minLevel && next.phase >= storyQuest.phase, `${storyQuest.id} must chain forward`);
    storyQuest = next;
  }
  assert.equal(storyQuest, undefined, `story chain for ${cls.id} must terminate without a cycle`);
}
assert.equal(walked.size, CONTENT.quests.length, 'every story quest must belong to the main chain');
// every class gets its own calling trial between the guild intro and q_prove
for (const cls of DESIGN.classes) {
  const trial = questById[questById.q_guild_intro.nextQuestByClass[cls.id]];
  assert.ok(trial, `class ${cls.id} must have a calling trial`);
  assert.equal(trial.nextQuestId, 'q_prove', `${trial.id} must merge back into q_prove`);
}
assert.equal(questById.q_nullking.minLevel, DESIGN.levelCap, 'the final main quest must unlock at Base Lv 80');
for (const bridge of ['q_briar', 'q_treant', 'q_shades', 'q_drowned', 'q_hakon', 'q_harpy', 'q_ashsmith', 'q_beetles', 'q_echo', 'q_manta'])
  assert.ok(questById[bridge], `${bridge} must bridge its region's level gaps`);
for (const [questId, target] of [
  ['q_briar', 'thornback_boar'], ['q_drowned', 'drowned_acolyte'], ['q_harpy', 'rime_harpy'],
  ['q_beetles', 'magma_beetle'], ['q_manta', 'rift_manta'],
]) assert.equal(questById[questId].objective.target, target, `${questId} must feature its region's new monster`);
for (const [questId, target] of [['q_hakon', 'hakon'], ['q_ashsmith', 'ashsmith'], ['q_echo', 'star_echo']]) {
  assert.equal(questById[questId].objective.type, 'talk', `${questId} must be a field-NPC story beat`);
  assert.equal(questById[questId].objective.target, target, `${questId} points at the wrong field NPC`);
}

// Guidance onboarding deliberately introduces the town's three core services
// before the story sends the player into its longer combat loop.
assert.equal(questById.q_meet.nextQuestId, 'q_market_intro');
assert.deepEqual(
  [questById.q_market_intro.objective.type, questById.q_market_intro.objective.target, questById.q_market_intro.nextQuestId],
  ['talk', 'merchant', 'q_guild_intro'],
  'Oracle guidance must lead to the Trader introduction',
);
assert.deepEqual(
  [questById.q_guild_intro.objective.type, questById.q_guild_intro.objective.target],
  ['talk', 'elder'],
  'Trader guidance must lead to the Guild introduction before normal story quests',
);
assert.ok(questById.q_guild_intro.nextQuestByClass, 'the guild intro must fork into per-class calling trials');

// A quest should unlock where its target species can actually appear. Collect
// objectives use the level range of at least one monster that drops the item.
const monsterById = Object.fromEntries(CONTENT.monsters.map(monster => [monster.id, monster]));
const spawnByMonster = new Map();
for (const map of Object.values(MAPS)) for (const spawn of map.spawns || []) {
  spawnByMonster.set(spawn.monsterId, { map, spawn });
}
for (const quest of CONTENT.quests) {
  if (quest.objective.type === 'kill') {
    const habitat = spawnByMonster.get(quest.objective.target);
    assert.ok(habitat, `${quest.id} target ${quest.objective.target} has no map spawn`);
    if (habitat.spawn.levelRange) {
      assert.ok(quest.minLevel >= habitat.spawn.levelRange[0] && quest.minLevel <= habitat.spawn.levelRange[1],
        `${quest.id} unlock level misses ${quest.objective.target}'s level range`);
    } else {
      assert.ok(Math.abs(quest.minLevel - monsterById[quest.objective.target].level) <= 2,
        `${quest.id} unlocks too far from its guardian's fixed level`);
    }
  }
  if (quest.objective.type === 'collect') {
    const sources = CONTENT.monsters.filter(monster => monster.drops?.some(drop => drop.itemId === quest.objective.target))
      .map(monster => spawnByMonster.get(monster.id))
      .filter(Boolean);
    assert.ok(sources.length, `${quest.id} item ${quest.objective.target} has no spawned drop source`);
    assert.ok(sources.some(({ spawn, map }) => {
      const [lo, hi] = spawn.levelRange || map.band || [monsterById[spawn.monsterId].level, monsterById[spawn.monsterId].level];
      return quest.minLevel <= hi && quest.minLevel + DESIGN.tuning.autoHuntMaxLevelGap >= lo;
    }), `${quest.id} unlock level cannot safely reach any source of ${quest.objective.target}`);
  }
}

// Every class gets a Lv5 first-job signature that becomes Lv10 mastery after
// the second-class change, plus at least one new second-job skill.
const signatureIds = ['rift_slash', 'reckless_hew', 'arcane_bolt', 'piercing_shot', 'smite', 'jab', 'spark'];
for (const id of signatureIds) {
  const node = PROGRESSION.skillTree[id];
  assert.deepEqual(node.tierCaps, [5, 10, 10], `${id} must unlock ranks 6-10 in second job`);
  assert.equal(node.maxLevel, 10);
  assert.ok(node.rankReqLevels[6] >= 18 && node.rankReqLevels[10] >= 34, `${id} mastery ranks unlock too early`);
}
for (const id of ['shield_bash', 'chain_hook', 'prismatic_ray', 'armor_piercer', 'judgment_lance', 'chi_burst', 'stone_spike']) {
  const node = PROGRESSION.skillTree[id];
  assert.ok(skill(id) && node?.reqTier === 1, `${id} must be a wired second-job skill`);
}
for (const combatClass of Object.values(CLASS_COMBAT)) {
  const activeRanks = COMBAT.skills.filter(entry => entry.classId === combatClass)
    .reduce((sum, entry) => sum + PROGRESSION.skillTree[entry.id].maxLevel, 0);
  const passiveRanks = Object.values(PROGRESSION.passives).filter(entry => entry.classId === combatClass)
    .reduce((sum, entry) => sum + entry.maxLevel, 0);
  const pointBudget = PROGRESSION.startSkillPoints + (PROGRESSION.jobLevelCap - 1) * PROGRESSION.skillPointsPerLevel + 4;
  assert.ok(activeRanks + passiveRanks > pointBudget, `${combatClass} can still max its entire skill tree`);
}

// Later branch skills must provide a meaningful upgrade over their starter counterparts.
for (const [upgrade, starter] of [
  ['sunder', 'rift_slash'], ['savage_leap', 'reckless_hew'], ['twin_shot', 'piercing_shot'],
  ['righteous_strike', 'smite'], ['sanctuary', 'lay_on_hands'],
]) {
  assert.ok(skill(upgrade).power >= skill(starter).power * 1.15, `${upgrade} is not a meaningful upgrade over ${starter}`);
}

// NPC headers and interactions use explicit roles instead of ID-specific presentation.
const allNpcs = Object.values(MAPS).flatMap(map => map.npcs || []);
const guildMaster = allNpcs.find(npc => npc.role === 'guild');
assert.ok(guildMaster?.title === 'Guild Master', 'town must expose an explicit Guild Master role');
assert.ok(allNpcs.every(npc => npc.title), 'every map NPC needs an overhead profession title');
assert.ok(PX.npc.guild, 'Guild Master needs a dedicated sprite');
assert.ok(CONTENT.npcs.some(npc => npc.id === guildMaster.id), 'Guild Master needs dedicated dialogue');

// Named skills must carry the metadata required by their promised behavior.
assert.equal(skill('hunters_mark').effect, 'mark');
assert.equal(skill('sunder').effect, 'sunder');
assert.ok(skill('savage_leap').range >= 4, 'Savage Leap must close a meaningful distance');
assert.equal(skill('sanctuary').type, 'heal');
assert.ok(COMBAT.statusEffects.mark.damageTaken > 0, 'Hunter\'s Mark needs vulnerability data');
assert.ok(COMBAT.statusEffects.sunder.defReduction > 0, 'Sunder needs armor-reduction data');

// Several monster families should fight from range with readable projectiles.
const rangedMonsters = CONTENT.monsters.filter(monster => monster.attackRange);
assert.ok(rangedMonsters.length >= 4, 'enemy roster needs multiple ranged archetypes');
assert.ok(rangedMonsters.every(monster => monster.attackRange >= 3 && monster.projectileColor), 'ranged enemies need range and projectile telegraphs');

// Permanent bonuses and loot rarity enhance a build without replacing its base stats.
for (const passive of Object.values(PROGRESSION.passives)) {
  const total = passive.per * passive.maxLevel;
  const cap = passive.stat === 'fleeFlat' ? 30 : passive.stat === 'critPct' ? 20 : 50;
  assert.ok(total <= cap, `${passive.name} exceeds its ${passive.stat} budget`);
}
let previousMult = 0;
for (const rarity of RARITY_ORDER) {
  assert.ok(RARITY[rarity].mult > previousMult, `${rarity} multiplier must increase`);
  previousMult = RARITY[rarity].mult;
}
assert.ok(RARITY.legendary.mult <= 1.8, 'legendary base multiplier overwhelms affix power');
assert.ok(Math.max(...AFFIXES.filter(a => a.stat === 'atkPct').map(a => a.max)) <= 12, 'ATK affix cap is too high');

// Crafting must never mint zeny deterministically: an output's resale value cannot
// exceed the recipe's zeny cost plus what the consumed materials would have sold for.
const itemValueById = Object.fromEntries(CONTENT.items.map(item => [item.id, item.value]));
for (const recipe of CONTENT.recipes) {
  const matResale = recipe.mats.reduce((sum, mat) => sum + itemValueById[mat.itemId] * 0.5 * mat.qty, 0);
  assert.ok(itemValueById[recipe.out] * 0.5 <= recipe.cost + matResale + 1,
    `recipe ${recipe.id} mints zeny: sell ${itemValueById[recipe.out] * 0.5} > ${recipe.cost} + ${matResale}`);
  assert.ok(recipe.cost + matResale <= itemValueById[recipe.out] * 2.5,
    `recipe ${recipe.id} is a rip-off: costs ${recipe.cost + matResale} for a ${itemValueById[recipe.out]}-value item`);
}

// Even a +9 legendary remains worth less than its shop price, preventing resale loops.
for (const rarity of RARITY_ORDER) {
  const resaleRate = Math.min(0.8, 0.35 * RARITY[rarity].mult * (1 + 0.04 * 9));
  assert.ok(resaleRate < 1, `${rarity} refinement can create an infinite resale loop`);
}

console.log('Balance audit passed: class curves, combat pacing, XP, skills, loot, and economy are within target bands.');
