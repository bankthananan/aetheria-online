import assert from 'node:assert/strict';
// js/expansion.test.js - Unit and integration tests for content expansion engines and zone modules.

import { SubdungeonSystem } from './systems/subdungeon.js';
import { DifficultySystem, DIFFICULTY_TIERS } from './systems/difficulty.js';
import { ExplorationSystem } from './systems/exploration.js';
import { RareSpawnsSystem } from './systems/rare-spawns.js';
import { DailiesSystem } from './systems/dailies.js';
import { MasterySystem, MASTERY_RANKS } from './systems/mastery.js';

import * as WhisperingWoods from './zones/whispering-woods/index.js';

console.log('=== RUNNING CONTENT EXPANSION TEST SUITE ===');

// 1. Subdungeon System Test
const dungeonState = SubdungeonSystem.createDefaultState();
SubdungeonSystem.enterDungeon(dungeonState, WhisperingWoods.GOBLIN_CAVE, { mapId: 'whispering_woods', x: 12, y: 18 });
assert.ok(SubdungeonSystem.isInsideDungeon(dungeonState), 'Should be inside dungeon');
assert.ok(SubdungeonSystem.getActiveDungeonId(dungeonState) === 'ww_goblin_cave', 'Active dungeon ID matches');

SubdungeonSystem.recordKill(dungeonState, 'goblin');
SubdungeonSystem.completeDungeon(dungeonState, 'ww_goblin_cave');
assert.ok(dungeonState.clearedDungeons['ww_goblin_cave'] === true, 'Dungeon marked as cleared');

const exitPortal = SubdungeonSystem.exitDungeon(dungeonState);
assert.ok(exitPortal.x === 12 && exitPortal.y === 18, 'Exits to parent portal coordinates');
assert.ok(!SubdungeonSystem.isInsideDungeon(dungeonState), 'No longer inside dungeon');
console.log('✓ Task 1 | Subdungeon State Machine & Transitions Verified');

// 2. Difficulty Scaling Test
const baseGoblin = { maxHp: 100, hp: 100, atk: 20, def: 10, exp: 50 };
const hardGoblin = DifficultySystem.scaleStats(baseGoblin, 'HARD');
assert.ok(hardGoblin.hp === 150, 'Hard HP scaled correctly (1.5x)');
assert.ok(hardGoblin.exp === 80, 'Hard EXP scaled correctly (1.6x)');
const nightmareGoblin = DifficultySystem.scaleStats(baseGoblin, 'NIGHTMARE');
assert.ok(nightmareGoblin.hp === 220, 'Nightmare HP scaled correctly (2.2x)');
console.log('✓ Task 2 | Difficulty Mode Multipliers & Scaling Verified');

// 3. Exploration Engine Test
const explState = ExplorationSystem.createDefaultState();
const step1 = ExplorationSystem.recordStep(explState, 'whispering_woods', 5, 5);
const step2 = ExplorationSystem.recordStep(explState, 'whispering_woods', 5, 5);
assert.ok(step1 === true && step2 === false, 'Discovers tile once');
assert.ok(ExplorationSystem.getDiscoveryCount(explState, 'whispering_woods') === 1, 'Tile count matches');
ExplorationSystem.unlockPOI(explState, 'whispering_woods', 'ww_poi_scout_satchel');
assert.ok(explState.unlockedPOIs['whispering_woods'].length === 1, 'POI unlocked');
console.log('✓ Task 3 | Exploration Fog & POI Tracking Verified');

// 4. Rare Spawns Engine Test
const rareState = RareSpawnsSystem.createDefaultState();
let spawnedRare = null;
for (let i = 0; i < 20; i++) {
  spawnedRare = RareSpawnsSystem.registerKill(rareState, 'whispering_woods', 'wolf', WhisperingWoods.WHISPERING_WOODS_RARES);
}
assert.ok(spawnedRare && spawnedRare.id === 'fang_the_bloodwolf', 'Fang spawns after kill threshold');
assert.ok(RareSpawnsSystem.getActiveRare(rareState, 'whispering_woods') !== null, 'Rare marked active');
RareSpawnsSystem.clearRare(rareState, 'whispering_woods');
assert.ok(RareSpawnsSystem.getActiveRare(rareState, 'whispering_woods') === null, 'Rare cleared on slay');
console.log('✓ Task 4 | Rare Spawns & Kill-Counter Tracking Verified');

// 5. Dailies & Mastery Test
const dailyState = DailiesSystem.createDefaultState();
const samplePool = [
  { id: 'daily_1', type: 'hunt', targetId: 'goblin', required: 5 },
  { id: 'daily_2', type: 'hunt', targetId: 'wolf', required: 3 },
  { id: 'daily_3', type: 'explore', targetId: 'satchel', required: 1 },
];
DailiesSystem.checkAndRefreshDailies(dailyState, samplePool);
assert.ok(dailyState.activeDailies.length === 3, 'Rolls 3 daily challenges');
DailiesSystem.updateProgress(dailyState, 'hunt', 'goblin', 5);
assert.ok(dailyState.activeDailies.find(d => d.targetId === 'goblin').completed, 'Challenge completed');

const masteryState = MasterySystem.createDefaultState();
MasterySystem.addPoints(masteryState, 'whispering_woods', 260);
const rank = MasterySystem.getZoneRank(masteryState, 'whispering_woods');
assert.ok(rank && rank.rank === 'silver', 'Reaches Silver Mastery at 260 pts');
console.log('✓ Task 5 | Dailies & Zone Mastery Progression Verified');

console.log('=== CONTENT EXPANSION TEST SUITE PASSED ===');
