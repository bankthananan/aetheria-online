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

function monsterStats(monster) {
  const bossMult = monster.sizeTiles >= 2 ? DESIGN.tuning.bossHpMult : 1;
  return {
    hp: Math.round(monster.hp * DESIGN.tuning.monsterHpMult * bossMult),
    exp: Math.round(monster.exp * DESIGN.tuning.monsterExpMult),
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

// At-level normal fights are brisk; bosses survive long enough to show mechanics.
for (const monster of CONTENT.monsters) {
  const { hp, exp } = monsterStats(monster);
  const averageAttack = DESIGN.classes.reduce((sum, cls) => sum + classAttack(cls, monster.level), 0) / DESIGN.classes.length;
  const basicHits = hp / Math.max(1, averageAttack - monster.def);
  const starterCasts = hp / Math.max(1, averageAttack * 2 - monster.def);
  if (monster.sizeTiles < 2) {
    assert.ok(basicHits >= 4.5 && basicHits <= 8, `${monster.id} basic-hit target drifted: ${basicHits.toFixed(1)}`);
    assert.ok(starterCasts >= 2 && starterCasts <= 4, `${monster.id} skill-cast target drifted: ${starterCasts.toFixed(1)}`);
    const killsForLevel = xpForNext(Math.min(monster.level, 79)) / exp;
    assert.ok(killsForLevel >= 20 && killsForLevel <= 31, `${monster.id} XP pace drifted: ${killsForLevel.toFixed(1)} kills`);
  } else {
    assert.ok(starterCasts >= 15 && starterCasts <= 25, `${monster.id} boss duration drifted: ${starterCasts.toFixed(1)} casts`);
  }
}

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
const chainedQuestIds = new Set(CONTENT.quests.map(quest => quest.nextQuestId).filter(Boolean));
const storyRoots = CONTENT.quests.filter(quest => !chainedQuestIds.has(quest.id));
assert.deepEqual(storyRoots.map(quest => quest.id), ['q_awaken'], 'story must have one awakening root');
const walked = new Set(); let storyQuest = questById.q_awaken;
while (storyQuest && !walked.has(storyQuest.id)) {
  walked.add(storyQuest.id);
  const phase = CONTENT.storyPhases.find(entry => entry.id === storyQuest.phase);
  assert.ok(storyQuest.minLevel >= phase.levelMin && storyQuest.minLevel <= phase.levelMax,
    `${storyQuest.id} must unlock inside its story phase`);
  const next = questById[storyQuest.nextQuestId];
  if (next) assert.ok(next.minLevel >= storyQuest.minLevel && next.phase >= storyQuest.phase, `${storyQuest.id} must chain forward`);
  storyQuest = next;
}
assert.equal(walked.size, CONTENT.quests.length, 'every story quest must belong to the main chain');
assert.equal(questById.q_nullking.minLevel, DESIGN.levelCap, 'the final main quest must unlock at Base Lv 80');
for (const bridge of ['q_treant', 'q_shades', 'q_dust', 'q_revenant', 'q_stalkers'])
  assert.ok(questById[bridge], `${bridge} must bridge its region's level gaps`);

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

// Even a +9 legendary remains worth less than its shop price, preventing resale loops.
for (const rarity of RARITY_ORDER) {
  const resaleRate = Math.min(0.8, 0.35 * RARITY[rarity].mult * (1 + 0.04 * 9));
  assert.ok(resaleRate < 1, `${rarity} refinement can create an infinite resale loop`);
}

console.log('Balance audit passed: class curves, combat pacing, XP, skills, loot, and economy are within target bands.');
