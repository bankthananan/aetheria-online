# Aetheria Mobile and Gameplay Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Native execution with one final save/combat review is recommended because the integration tasks share `js/game.js`. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver full phone/desktop action parity, reliable expansion progression, class training, contextual guidance, loot relevance/protection, two loadouts, a Woods event, and a bounded Rift expedition.

**Architecture:** Preserve the zero-build engine and its current data modules. Add focused state/validation/input helpers; one writer integrates them into `js/game.js`. Keep transactions and lifecycle behavior shared across desktop and touch, with optional save fields and legacy defaults.

**Tech Stack:** Plain JavaScript ES modules, Canvas 2D, DOM/CSS, localStorage, Node strict assertions, headless Brave; no new product dependency or backend.

**Spec:** [Approved concrete design in plan.md](2026-09-22-mobile-support-plan.md#concrete-design-for-the-full-requested-scope). Read the entire concrete design and its preceding research/verification limitations before execution. Written-spec approval was received on 2026-09-23; this execution plan is not yet approved.

## Global Constraints

- Preserve the live zero-build application (`index.html` and `js/*.js`), existing desktop controls, `awo_save_v1`, and `window.__AWO`.
- Keep balance values in `js/design.js` and content in the existing JavaScript data modules. Leave the legacy application untouched.
- No new runtime dependencies or backend are required.
- Runtime objects, DOM references, paths, and live combat timers must not enter the save.
- Work on `js/game.js` is serialized even if independent helpers or checks use subagents.
- Preserve all pre-existing uncommitted work. Do not restore files to HEAD or commit other people's edits as this task's work.
- Keep one-off harnesses, screenshots, browser profiles, and diagnostic artifacts outside the repository. Permanent regression tests and their reusable fixtures belong under `js/`.
- Run `npm test` for code/data changes; require exit code 0. Active-game logic also requires a temporary `.mjs` integration harness using `window.__AWO`. Runtime/visual changes require inspected Brave screenshots and runtime-error-banner checks.
- The current environment makes `.git` read-only. Checkpoint through diffs and the task ledger here; make scoped commits only if a later execution environment permits Git writes. Do not request repeated approval or bypass filesystem policy.

## Review Focus

1. A save failure immediately after a reward: keep memory internally consistent, show unsaved state, and never award again on retry. Task 1 and every claim integration cover this.
2. Nested panels and phone interruption: closing one overlay must not resume combat while another pause reason remains. Task 3 covers overlapping pause reasons and hidden-time deadlines.
3. Multi-pointer cancellation and rotation: a cancelled joystick cannot cancel another pointer or leave movement stuck; world targeting must use the current viewport. Tasks 4–5 cover this.
4. Same-name equipment with different UIDs, missing consumables, and changed class after rebirth: failed loadout application leaves every item and resource unchanged. Task 10 covers this.
5. Re-entered/reloaded encounters and repeated completion events: practice cannot reward normal progression; events and expeditions must not duplicate claims or leave temporary effects. Tasks 7, 11, and 12 cover this.

## Execution boundaries and file ownership

This release is divided into independently checked packages: integrity (Tasks 1–2), mobile (3–5), training (6–7), guidance/loot (8–9), loadouts (10), Woods event (11), Rift (12), and release acceptance (13). Do not enable a menu entry until its transaction and exit paths work. Each task includes its own tests and integration; do not create disconnected helper modules and mark the feature done.

| File(s) | Responsibility |
| --- | --- |
| `js/game.js` | Sole runtime integration owner: game actions, panels, saves, combat evidence, existing functions preserved |
| `js/design.js` | Training/event/expedition budgets and existing balance values |
| `js/content.js`, `js/progression.js`, `js/zones/whispering-woods/*` | Lessons, objective metadata, original event content and texts |
| `js/theme.js`, `index.html`, `autotest.html` | Responsive presentation and runtime screenshot scenarios |
| `js/locale.js` | English/Thai UI strings for every new player-facing surface |
| `js/audio.js` | Idempotent pause/resume without changing user volume preferences |
| `js/systems/player-features.js` | Optional persistent feature fields and normalization |
| `js/systems/game-clock.js`, `js/input.js`, `js/viewport.js` | Simulation time, multi-pointer input, viewport coordinate contract |
| `js/systems/training.js`, `js/systems/guidance.js` | Objective evidence and contextual information models |
| `js/systems/loot-preferences.js`, `js/systems/loadouts.js` | Pure filtering and all-or-nothing equipment validation |
| `js/systems/woods-event.js`, `js/systems/expedition.js` | Bounded encounter transitions and stable checkpoints |
| Existing `js/systems/*.js` expansion modules | Repair existing interfaces, actual runtime wiring, and state serialization |
| `js/test-support/runtime.js`, `js/*-improvements.test.js` | Reusable deterministic browser fixture and permanent regression coverage |
| `package.json` | Include the new regression files and existing expansion suite in `npm test` |

Line numbers are intentionally replaced below with named function anchors because the working tree is dirty and earlier tasks change line positions.

### Task 1: Save normalization, observable failures, and clean resets

**Files:** Create `js/systems/player-features.js`, `js/test-support/runtime.js`, `js/persistence-improvements.test.js`. Modify `js/game.js` at `G`, `begin`, `saveGame`, `resumeGame`, `doRebirth`; modify `package.json` and `js/locale.js`.

**Interfaces:**

- `normalizeFeatures(raw, catalog)` returns `{version:1, loot:{mode:'all', affixes:[], quiet:false}, goal:null, loadouts:[null,null], training:{completed:{},claimed:{}}, woods:{stage:'available',claimed:false,revealed:false}, expedition:{nextRun:1,claimedThrough:0,pendingReward:null}}`, retaining valid supplied values. A pending reward is `{runId,variantId:'mana_surge_v1'}` and must be claimed before another expedition starts. `catalog` contains known class, item, recipe, skill, affix and map IDs. It does not mutate `raw`.
- `normalizeExpansion(raw)` reconstructs `dungeonState`, `exploration`, `rareSpawns`, `dailies`, `mastery`, and `zoneDifficulty` from existing modules' defaults and valid saved data. Store this under `world.expansion`; features under `player.features`.
- Runtime `saveGame()` returns `true` only after successful storage, otherwise `false`; it sets `G.saveStatus` to `saved`, `unavailable`, or `failed`. Never swallow a storage failure without visible status.
- Permanent fixture `await createRuntime({classId='reborn_blade', mapId='town_awakening'})` returns `{A, advance(ms), failWrites(bool), readSave(), dispatch(target,type,event), element(id)}`. `A` is `window.__AWO`; `readSave` parses the backing storage. Each test file starts one engine import and calls runtime `A.resetNewGameState()` to isolate scenarios without module-cache tricks.

- [ ] **1. Create a failing round-trip test and reusable fixture.** Extract the browser/audio mocks preceding `await import('./game.js')` in `js/equipment.test.js` into the new fixture, without modifying that existing test. Add real listener maps, class sets, stable ID elements, a controlled `performance.now()`, and a storage failure switch. Import `../game.js` only after globals exist. Keep mock timers inert unless explicitly advanced.

```js
import assert from 'node:assert/strict';
import { createRuntime } from './test-support/runtime.js';
const { A, readSave, failWrites } = await createRuntime({});
A.G.mastery.zonePoints.whispering_woods = 123;
A.G.exploration.unlockedPOIs.whispering_woods = ['ww_poi_scout_satchel'];
assert.equal(A.saveGame(), true);
assert.equal(readSave().world.expansion.mastery.zonePoints.whispering_woods, 123);
A.resumeGame();
assert.equal(A.G.mastery.zonePoints.whispering_woods, 123);
failWrites(true);
assert.equal(A.saveGame(), false);
assert.equal(A.G.saveStatus, 'failed');
failWrites(false);
A.resetNewGameState();
assert.deepEqual(A.G.mastery.zonePoints, {});
```

- [ ] **2. Run** `node js/persistence-improvements.test.js`; expect missing fixture/API or missing saved expansion assertions to fail before the implementation.
- [ ] **3. Implement safe normalization and reset hooks.** Copy only recognized fields; reject negative/nonfinite counters, unknown IDs, and invalid enums. Create fresh containers on every call. Use existing default factories. Preserve old saves that omit both new fields. Keep active dungeon/encounter objects out of saved state; serialize their approved checkpoint equivalents.

```js
const count = value => Number.isSafeInteger(value) && value >= 0 ? value : 0;
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
// Use these guards at every saved counter/map boundary; do not spread raw save data.
// Save one complete snapshot, including claim flags and awarded inventory:
try {
  ls.setItem(saveKey(), JSON.stringify(data));
  G.saveStatus = 'saved';
  return true;
} catch {
  G.saveStatus = 'failed';
  return false;
}
```

- [ ] **4. Add legacy/malformed fixture assertions.** Set `player.features` and `world.expansion` absent, null, arrays, and counters to negative values. Loading must produce defaults without changing owned gear. New game clears new state; rebirth preserves the approved subsets. Display and retry a failed save without re-running reward code. Register the test in `npm test`.
- [ ] **5. Run** `node js/persistence-improvements.test.js` and `npm test`; record both exit codes and review the diff for unrelated changes before checkpointing.

### Task 2: Finish existing expansion player paths

**Files:** Modify `js/systems/dailies.js`, `difficulty.js`, `rare-spawns.js`, `subdungeon.js`, `mastery.js`, `js/expansion.test.js`, `js/game.js`, `js/design.js`, `js/locale.js`, `package.json`. Create `js/expansion-improvements.test.js`.

**Interfaces:** Keep the existing modules' exports. Runtime exports `refreshDailies()`, `claimDaily(id):boolean`, `setZoneDifficulty(mapId,tier):boolean`, `enterSubdungeon(id):boolean`, `exitSubdungeon():boolean`, and `claimMastery(zoneId,rank):boolean`. `G.dailies.activeDailies` is canonical. Difficulty is owned by `G.zoneDifficulty`, not module-global state.

- [ ] **1. Write regression cases for the currently broken paths.** Exercise `adminAction('rerolldailies')`, `adminAction('completedailies')`, `adminAction('cyclediff')`, and the actual board/entry/claim APIs. Convert `console.assert` in the existing expansion suite to `assert.ok` with `node:assert/strict`.

```js
const { A } = await createRuntime({mapId:'whispering_woods'});
assert.doesNotThrow(() => A.adminAction('rerolldailies'));
assert.ok(A.G.dailies.activeDailies.length > 0);
A.adminAction('completedailies');
const daily = A.G.dailies.activeDailies[0];
assert.equal(daily.completed, true);
assert.equal(A.claimDaily(daily.id), true);
const after = JSON.stringify(A.G.player);
assert.equal(A.claimDaily(daily.id), false);
assert.equal(JSON.stringify(A.G.player), after);
assert.equal(A.setZoneDifficulty('whispering_woods', 'HARD'), true);
assert.equal(A.G.zoneDifficulty.whispering_woods, 'hard');
```

- [ ] **2. Run** `node js/expansion-improvements.test.js`; expect missing methods/current admin errors.
- [ ] **3. Wire canonical APIs and entity creation.** Daily refresh uses `checkAndRefreshDailies(state,pool)` and admin reroll uses `rollDailies(pool,3)` with an explicit reset of claims. A returned rare definition creates one reachable monster tagged with the rare ID; its death clears the active rare. Dungeon entry records the parent tile coordinates before `loadMap`, and boss completion marks the dungeon. Difficulty modifies new monsters once from base stats; avoid compounding on reload. Move the existing difficulty multipliers and mastery perk magnitudes to `DESIGN.tuning` while retaining current values.

```js
// Canonical state and normalization for the existing admin difficulty action:
const key = String(tier).toLowerCase();
if (!['normal', 'hard', 'nightmare'].includes(key) || !MAPS[mapId]) return false;
G.zoneDifficulty[mapId] = key;
// In admin helpers, call runtime setZoneDifficulty rather than nonexistent module setters.
```

- [ ] **4. Verify real effects and exact-once claims.** Test the rare threshold produces a live actor, dungeon exit returns to the recorded portal, mastery grants its declared perk once, daily midnight refresh behaves predictably, and old/new save round-trips preserve completion. Include invalid dungeon IDs and unreachable entrance protection. Bound daily reward values centrally, using current declared rewards where present. No weekly system is added merely because a comment mentions one.
- [ ] **5. Run** both expansion test files, persistence tests, and `npm test`; inspect board, dungeon and mastery UI through `window.__AWO` before checkpointing.

### Task 3: Pause-aware simulation and audio lifecycle

**Files:** Create `js/systems/game-clock.js`, `js/lifecycle-improvements.test.js`. Modify `js/game.js` at `now`, `frame`, `step`, panels/dialogues/job choices, visibility handlers, `begin`, and `resumeGame`; modify `js/audio.js`, `js/locale.js`, `js/theme.js`.

**Interfaces:** `createGameClock(read=()=>performance.now())` returns `{now(),pause(reason),resume(reason),reset(),isPaused()}` using a set of reasons. Runtime exports `pauseGame(reason)`, `resumeGameFromPause(reason)`, `clearInput()`. `resumeGame()` retains its existing meaning: load a saved game. AUDIO gains `pausePlayback()` and `resumePlayback()` without changing stored volume/mute preferences.

- [ ] **1. Pin nested pause timing with a unit regression.**

```js
let t = 1000;
const clock = createGameClock(() => t);
clock.pause('panel'); t += 2000; clock.pause('hidden');
clock.resume('panel'); t += 3000;
assert.equal(clock.now(), 1000);
assert.equal(clock.isPaused(), true);
clock.resume('hidden'); t += 100;
assert.equal(clock.now(), 1100);
```

- [ ] **2. Run** `node js/lifecycle-improvements.test.js`; expect missing clock behavior before implementation.
- [ ] **3. Implement accumulated paused time and explicit reasons.** Preserve calendar `Date.now()` for dailies/profile timestamps; route combat `now()` through the clock. `frame` resets `last` while paused and does not call simulation. Count modal reasons by identity, so replacing one panel cannot leak a pause. Audit Escape, close buttons, cutscenes, promotion/rebirth choices, and code that directly removes overlays.

```js
// Core pause accounting; pause/resume are idempotent per reason.
if (!reasons.size) pausedAt = read();
reasons.add(reason);
// On resume, after deleting the reason:
if (!reasons.size && pausedAt !== null) {
  pausedTotal += read() - pausedAt;
  pausedAt = null;
}
// now() uses (pausedAt ?? read()) - pausedTotal.
```

- [ ] **4. Add runtime tests.** Put a monster slam and player cooldown 500ms in the future, pause, advance raw time by 60 seconds, resume, and assert neither elapsed during pause. Verify app return stays paused until Resume is tapped, Hunt stays off, keyboard/joystick state clears, and volume settings survive audio suspend/resume. Check rejected AudioContext promises are handled without runtime-error banners.
- [ ] **5. Run** lifecycle, automation, phase2, phase3 tests and `npm test`; inspect Resume and nested panel flows before checkpointing.

### Task 4: Pointer input and all nine touch actions

**Files:** Create `js/input.js`, `js/input-improvements.test.js`. Modify `index.html`, `js/game.js` at `initTouchControls`, keyboard handlers, `buildHud`, `updateHud`, `useHotbarSlot`; modify `js/locale.js`, `js/theme.js`.

**Interfaces:** `createInputController({move,action,blocked})` returns `{pointerDown(id,role,x,y),pointerMove(id,x,y),pointerUp(id),clear(),dispose()}`. Roles: `move`, `attack`, `dodge`, `parry`, `interact`, `slot:0`…`slot:8`. `move(x,y)` receives normalized axes; `action(role)` is called once per press. DOM wiring owns pointer capture. `blocked()` checks pause/death/UI state. Runtime `dispatchPlayerAction(role)` routes through existing combat functions and never changes balance.

- [ ] **1. Write multi-pointer/cancellation tests.**

```js
const actions = [], moves = [];
const input = createInputController({move:(x,y)=>moves.push([x,y]), action:a=>actions.push(a), blocked:()=>false});
input.pointerDown(11, 'move', 20, 20);
input.pointerMove(11, 60, 20);
input.pointerDown(12, 'slot:8', 200, 200);
input.pointerUp(12);
assert.deepEqual(actions, ['slot:8']);
assert.ok(moves.at(-1)[0] > 0);
input.pointerUp(11);
assert.deepEqual(moves.at(-1), [0,0]);
input.clear(); input.clear();
assert.deepEqual(actions, ['slot:8']);
```

- [ ] **2. Run** `node js/input-improvements.test.js` for the expected initial failure.
- [ ] **3. Replace duplicate touch/click listeners with pointer routing.** Bind once per live container; dispose old listeners before rebuilding. Use pointercancel and lostpointercapture as releases. Keep native `click` for keyboard-activated buttons without duplicating pointer actions. Scope `touch-action:none` to controls/world gestures, not scrollable sheets. `clearInput` from Task 3 calls controller `clear` and resets `G.keys`.

```js
function dispatchPlayerAction(role) {
  if (!G.running || !G.player || G.player.hp <= 0 || gameClock.isPaused()) return false;
  if (role.startsWith('slot:')) return useHotbarSlot(Number(role.slice(5)));
  const actions = {attack:playerBasicAttack, dodge:performDodge, parry:performParry, interact};
  return actions[role]?.();
}
```

- [ ] **4. Render nine slots from `p.hotbar`.** Use the same readiness/quantity/cooldown calculations as `renderHotbar`. Empty slots open touch-accessible assignment when out of combat. Add Settings controls for Automatic/On/Off touch visibility. Test attack + movement, slot 8, item usage, held keyboard state plus pointer release, two touches in the joystick region, repeated initialization, and blocked panel actions.
- [ ] **5. Run** input/lifecycle/phase1/automation tests and `npm test`; exercise real DOM events in the browser before checkpointing.

### Task 5: Adaptive camera, safe-area HUD, and touch sheets

**Files:** Create `js/viewport.js`, `js/viewport-improvements.test.js`. Modify `js/game.js` at canvas constants, rendering bounds, `syncRuntimeScale`, `onCanvasClick`, camera clamp, effects, skill graph; modify `js/theme.js`, `index.html`, `autotest.html`, `js/locale.js`.

**Interfaces:** `computeViewport({width,height,touch,insets})` returns `{rect:{x,y,width,height},logical:{width,height},scale,mode}`. `screenToWorld(point,rect,logical,camera)` returns `{x,y}`. `insets` contains four CSS-pixel safe-area values; `mode` is desktop/portrait/landscape. Runtime exposes `getViewport()` for diagnostics. Keep TS=32 and world coordinates unchanged.

- [ ] **1. Test round-trip coordinates and resize bounds.**

```js
for (const [width,height] of [[360,800],[390,844],[412,915],[844,390],[768,1024],[1366,768]]) {
  const v = computeViewport({width,height,touch:width<1000,insets:{top:0,right:0,bottom:20,left:0}});
  assert.ok(v.rect.x >= 0 && v.rect.y >= 0);
  assert.ok(v.rect.x + v.rect.width <= width);
  assert.ok(v.rect.y + v.rect.height <= height-20);
  const p = screenToWorld({x:v.rect.x+v.rect.width/2,y:v.rect.y+v.rect.height/2},v.rect,v.logical,{x:100,y:200});
  assert.ok(Math.abs(p.x-(100+v.logical.width/2)) < 1e-6);
  assert.ok(Math.abs(p.y-(200+v.logical.height/2)) < 1e-6);
}
```

- [ ] **2. Run** `node js/viewport-improvements.test.js` before adding the implementation.
- [ ] **3. Introduce a shared viewport result.** Reserve 84 CSS pixels at top and 220 at bottom in phone portrait; landscape reserves 56 at top and overlays compact bottom-corner controls. Read safe-area padding from CSS and `visualViewport` where available. At very small heights prioritize a nonnegative play area and a scrollable control/settings sheet. Desktop keeps 832×576; phone logical dimensions derive from the play rectangle at a target scale of 0.8 CSS pixels per world pixel. Keep target scale in `DESIGN.tuning.presentation` because it is configurable presentation data, not a magic number spread through the engine.

```js
const scale = touch ? 0.8 : Math.min(1, availableWidth / 832, availableHeight / 576);
const logical = touch
  ? {width:Math.floor(availableWidth/scale), height:Math.floor(availableHeight/scale)}
  : {width:832,height:576};
// The canvas, FX layer, camera clamp and pointer conversion all use this logical size.
```

- [ ] **4. Replace every viewport assumption coherently.** Audit all `CANVAS_W/H` uses, background buffers versus viewport buffers, particles, parallax, culling, camera edges and hit testing. Add an edge arrow for an offscreen current hostile target. Remove the rotation blocker and align the two HTML entry points' viewport declarations. Allow text zoom in sheets. Style one touch action grid, readable top HUD, collapsible tracker, safe-area padding, and scrollable sheets; eliminate duplicated hotbars on phones.
- [ ] **5. Add tests for nonzero left/right insets, a resize during input, tile-edge clicks, small maps, and no change in attack range after orientation change.** Capture every listed viewport for gameplay, inventory, skills, dialogue and character creation. Inspect images and banner, then run `npm test` and checkpoint.

### Task 6: Combat evidence and meaningful branch objectives

**Files:** Create `js/systems/training.js`, `js/training-improvements.test.js`. Modify `js/game.js` at damage/heal/status/avoidance/branch proc/advance hooks and `js/progression.js` objective metadata.

**Interfaces:** `recordTrainingEvidence(state,event,requirements)` returns a new state. Events are `{kind,source:'manual'|'automation',classId,targetId,skillId,mechanicId,amount,distance,sequenceId}`. Kinds include `move`, `attackHit`, `dodgeAvoided`, `parrySucceeded`, `effectiveHeal`, `detonated`, `finisherHit`, `equipped`, `skillLearned`, `branchProc`. Only applicable fields are present. Runtime `emitCombatEvidence(event)` supplies source identity at the initiating action and propagates it through delayed hits/statuses; it never accepts UI clicks as success.

- [ ] **1. Pin false-positive exclusions.**

```js
const requirement = {kind:'parrySucceeded',count:1};
const base = {progress:0,done:false};
assert.equal(recordTrainingEvidence(base,{kind:'parryPressed',source:'manual'},requirement).done,false);
assert.equal(recordTrainingEvidence(base,{kind:'parrySucceeded',source:'automation'},requirement).done,false);
assert.equal(recordTrainingEvidence(base,{kind:'parrySucceeded',source:'manual'},requirement).done,true);
```

- [ ] **2. Run** `node js/training-improvements.test.js`; expect the absent helper to fail initially.
- [ ] **3. Emit evidence where the real effect succeeds.** Parry inside `playerAvoidsHit` after the parry branch, healing from actual restored HP, ranged hit with pre-hit distance, detonation from consumed/matched statuses, finisher with real momentum consumption, and branchProc only when the branch handler changes state. Capture source for delayed/projectile effects when cast, not from the current Hunt flag at impact.

```js
// Example at the successful parry gate, after the hit is rejected:
emitCombatEvidence({kind:'parrySucceeded',source:'manual',classId:p.classId,targetId:m.id});
// Branch objectives accepted before this release have no evidenceVersion and retain legacy rules.
const requiresEvidence = G.advance?.evidenceVersion === 1;
```

- [ ] **4. For newly accepted tier-2 branch trials, store `evidenceVersion:1` plus the branch mechanic ID and require one successful proc in addition to existing objectives.** Derive requirements from each branch's `mechanic` definition; assert all 14 branches resolve to an actual handler. Preserve legacy in-progress trial completion. Add tests for wrong mechanic, wrong class, unrelated kill, healing at full HP, failed hit, and a manual projectile resolving after Hunt is toggled.
- [ ] **5. Run** training/job-branch/phase2 tests and `npm test`; checkpoint only after every branch has a tested evidence route.

### Task 7: Player-accessible practice and first-session lessons

**Files:** Extend `js/systems/training.js`, `js/training-improvements.test.js`. Modify `js/game.js` at town/menu/dialogue, `killMonster`, practice combat, exits and saves; `js/content.js`, `js/design.js`, `js/locale.js`, `js/theme.js`, `autotest.html`.

**Interfaces:** Runtime exports `startTraining(lessonId):boolean`, `retryTraining():boolean`, `exitTraining():boolean`, `claimTrainingReward():boolean`. `G.trainingSession` is runtime-only `{lessonId,returnLocation,actors,progress}`. Stable completion/claims live in `player.features.training`. `CONTENT.trainingLessons` maps IDs to class/prerequisite/evidence metadata; starting lessons use real available skills.

- [ ] **1. Add actual engine integration assertions.**

```js
const { A } = await createRuntime({classId:'reborn_blade'});
const before = {xp:A.G.player.xp, kills:structuredClone(A.G.killCounts), bag:structuredClone(A.G.player.inventory)};
assert.equal(A.startTraining('basic_attack'), true);
const dummy = A.G.monsters.find(m => m.practice);
assert.ok(dummy);
A.killMonster(dummy);
assert.equal(A.G.player.xp, before.xp);
assert.deepEqual(A.G.killCounts, before.kills);
assert.deepEqual(A.G.player.inventory, before.bag);
assert.equal(A.exitTraining(), true);
assert.equal(A.G.mapId, 'town_awakening');
```

- [ ] **2. Run** training tests for the expected failure, then implement the dedicated practice roster and town entry.
- [ ] **3. Add basic movement/attack/avoidance/equipment/skill lessons and seven class exercises.** Use a separate practice encounter within the existing map/render architecture, with tagged actors and no normal reward hooks. Disable Hunt/route entry while practicing. Keep the real player's inventory/skill ownership untouched; gate unavailable advanced lessons with clear prerequisite text. Predictable dummy windup: 1500ms. Training completion reward: 25 zeny plus one minor potion per class, once; put these initial budgets in `DESIGN.tuning.training`.

```js
// This guard belongs before every ordinary XP/loot/quest hook in killMonster:
if (m.practice) {
  m.alive = false;
  updateTrainingEncounter();
  return;
}
// updateTrainingEncounter is a runtime coordinator in game.js:
// it evaluates current evidence, resets the dummy for retry, and refreshes the training panel.
```

- [ ] **4. Register reward claims before awarding, then save one combined snapshot.** Keep claimed memory state when persistence fails, show unsaved status, and retry saving without paying again. On reload from unfinished practice, load the saved safe return point. On exit preserve legitimate item/skill changes made during basic lessons while clearing temporary dummy effects. Exercise death, exit, new game, rebirth and repeat claims for all classes.
- [ ] **5. Verify** touch-only training entry and completion prompts in English/Thai; run training/persistence tests and `npm test`, then checkpoint.

### Task 8: Contextual skill details and one pinned acquisition goal

**Files:** Create `js/systems/guidance.js`, `js/guidance-improvements.test.js`. Modify `js/game.js` at skill details, Collection Book, inventory/craft panels, task guidance; modify `js/locale.js`, `js/theme.js`.

**Interfaces:** `skillGuide(skillId,{combat,progression,player})` returns `{skillId,element,requirements,setupIds,detonates,cooldown,cost,available}` from existing data. `goalProgress(goal,{items,recipes,maps,monsters,player,storage})` returns `{valid,missing,sources}`. `missing` is an array of `{itemId,needed,owned}`. Runtime `pinGoal({kind:'item'|'recipe',id}|null):boolean` and `openGuide(kind,id)` preserve origin `{panel,scrollTop,selection}`. Stored quantities are disclosed separately and not treated as spendable bag items.

- [ ] **1. Test real definitions, not duplicate guide strings.**

```js
const { A } = await createRuntime({});
const before = JSON.stringify(A.G.player.inventory);
assert.equal(A.pinGoal({kind:'item',id:'wolf_fang'}),true);
assert.equal(JSON.stringify(A.G.player.inventory),before);
assert.equal(A.G.autoFarm,false);
assert.equal(A.pinGoal({kind:'item',id:'missing_item'}),false);
assert.equal(A.G.player.features.goal.id,'wolf_fang');
```

- [ ] **2. Run** `node js/guidance-improvements.test.js`, then implement the pure models and tap-open detail sheets.
- [ ] **3. Derive source rows from monster drops, existing shops/crafting, and map/quest gates.** Reuse the existing item-source helper but return structured data before HTML rendering. Unknown sources remain explicitly unknown; do not invent guaranteed drops. Link known destinations through existing route logic without auto-enabling Hunt.

```js
const owned = player.inventory.filter(e => !e.uid && e.itemId === material.itemId)
  .reduce((sum,e) => sum + e.qty, 0);
const missing = Math.max(0, material.qty - owned);
// Return owned/needed values; pinning performs no removeItem/addItem operation.
```

- [ ] **4. Test setup/detonator relationships against actual COMBAT fields; locked-source explanations; insufficient recipe materials; changed bag quantity after craft; save migration; detail close restoring originating scroll and selection.** Add Thai strings and ensure detail links can be reached by touch.
- [ ] **5. Run** guidance/skill-system/equipment tests and `npm test`; inspect both origin-return flows and checkpoint.

### Task 9: Loot relevance and protected equipment

**Files:** Create `js/systems/loot-preferences.js`, `js/loot-improvements.test.js`. Modify `js/game.js` at inventory toolbar, `killMonster` notifications, storage/equipment rows and `sellItem`; modify `js/locale.js`, `js/theme.js`.

**Interfaces:** `matchesLoot(entry,definition,preferences,classId):boolean` supports all/usable/affixes; affixes means any selected valid affix. Empty affix selection shows all with a hint. `setItemProtection(uid,bool):boolean` finds inventory/equipment/storage instances, sets `protected`, and persists. Relevance preferences use the Task 1 feature schema.

- [ ] **1. Add regression cases for actual sale and filter behavior.**

```js
const { A } = await createRuntime({});
A.addItem('iron_sword',1);
const gear = A.G.player.inventory.find(e => e.uid);
assert.equal(A.setItemProtection(gear.uid,true),true);
const gold = A.G.player.zeny;
A.sellItem(String(gear.uid));
assert.equal(A.G.player.zeny,gold);
assert.ok(A.G.player.inventory.some(e=>e.uid===gear.uid));
A.saveGame(); A.resumeGame();
assert.equal(A.G.player.inventory.find(e=>e.uid===gear.uid).protected,true);
```

- [ ] **2. Run** `node js/loot-improvements.test.js`; expect missing protection behavior.
- [ ] **3. Implement display-only relevance and handler-level protection.** Validate selected affixes against AFFIXES. Count hidden items and expose Show All. Keep acquisition and RNG untouched; quiet mode only suppresses irrelevant loot notifications. Escaping and translations apply to all tooltips and labels.

```js
// In sellItem's instance branch, before splice/currency mutation:
if (e.protected) { toast(T('Unprotect this item before selling.', 'ui'), 'sys'); return false; }
// UI filtering creates a view; it must never replace player.inventory.
const visible = p.inventory.filter(e => matchesLoot(e,itemById[e.itemId],p.features.loot,p.classId));
```

- [ ] **4. Test equipment↔bag↔storage transfers preserve protection; both merchant and bag sale handlers reject protected items; unprotect restores ordinary sale; All recovers every filtered item; filtering never affects collectedItems or drop count.** Test name/affix search combined with category and relevance filters and a non-gear potion.
- [ ] **5. Run** loot/equipment/persistence tests and `npm test`; inspect phone toolbar and checkpoint.

### Task 10: Transactional equipment/hotbar loadouts

**Files:** Create `js/systems/loadouts.js`, `js/loadout-improvements.test.js`. Modify `js/game.js` at equipment panel, save/rebirth, and new loadout handlers; modify `js/locale.js`, `js/theme.js`.

**Interfaces:** `captureLoadout(player,name)` returns `{name,equipment:{slot:uid|null},hotbar:[...nine entries]}`. `prepareLoadout(player,preset,{itemById,itemSlot,canUseItem,canUseSkill})` returns `{ok:true,equipment,inventory,hotbar}` or `{ok:false,reason,details}` without mutation. Runtime exports `saveLoadout(index,name):boolean`, `renameLoadout(index,name):boolean`, `applyLoadout(index):{ok,reason?}`. Index is 0 or 1; names trim to 24 Unicode code points and render escaped. Explicit empty slots unequip current items. No inventory capacity is added: the current bag is unbounded.

- [ ] **1. Add a failed-transaction regression with real UIDs.**

```js
const { A } = await createRuntime({});
assert.equal(A.saveLoadout(0,'Boss'),true);
A.G.player.features.loadouts[0].equipment.weapon = 999999;
const before = JSON.stringify(A.G.player);
assert.equal(A.applyLoadout(0).ok,false);
assert.equal(JSON.stringify(A.G.player),before);
```

- [ ] **2. Run** `node js/loadout-improvements.test.js`; expect missing runtime methods.
- [ ] **3. Implement preflight against bag+equipped ownership.** Exclude storage; require unique UIDs, correct slots, class eligibility, legal learned skills, and at least one owned item for an item hotbar entry. Reject unsafe location/session conditions. Compute next inventory as all currently owned bag+equipped items minus chosen equipment, retaining stack entries and object identity.

```js
const result = prepareLoadout(p,p.features.loadouts[index],catalog);
if (!result.ok) return result;
const hp = p.hp, mp = p.mp, stamina = p.stamina;
Object.assign(p,{equip:result.equipment, inventory:result.inventory, hotbar:result.hotbar});
recompute(p,false);
p.hp = Math.min(hp,p.maxHp); p.mp = Math.min(mp,p.maxMp); p.stamina = stamina;
saveGame();
return {ok:true};
```

- [ ] **4. Test two same-name items with different affixes/sockets, duplicate UID/slot, sold/stored gear, wrong-class gear after rebirth, zero consumable quantity, locked/unlearned skills, empty slots, invalid preset index, and out-of-town rejection.** Compare sorted UID multisets and currency/quantities before/after successful application. Verify cooldown deadlines, buffs and protection remain unchanged; repeated application grants no HP/MP. Test rename/overwrite confirmation UI and HTML escaping.
- [ ] **5. Run** loadout/equipment/rebirth/persistence tests and `npm test`; inspect both presets on phones and checkpoint. This task must be included in final independent save/combat review.

### Task 11: Woods supplies/waystone event with recovery

**Files:** Create `js/systems/woods-event.js`, `js/zones/whispering-woods/events.js`, `js/woods-event-improvements.test.js`. Modify zone `index.js`, `js/game.js` map interaction/monster updates/tracker/world panel/save hooks, `js/design.js`, `js/locale.js`, `autotest.html`.

**Interfaces:** `transitionWoods(state,event)` returns `{state,effects}`. Stable stages are available/supplies/defenseReady/defending/recovery/complete. Events are accept/collectSupplies/startDefense/attackerKilled/waystoneHit/leave/reload/repair/claim. Runtime `woodsAction(action):boolean` validates proximity and prerequisites before calling the reducer. Attackers carry `{woodsEventId,runId}`; unrelated kills cannot advance it.

- [ ] **1. Test recovery and claim idempotence in real runtime.**

```js
const { A } = await createRuntime({mapId:'whispering_woods'});
assert.equal(A.woodsAction('accept'),true);
assert.equal(A.woodsAction('startDefense'),false); // no supplies yet
const before = A.G.player.zeny;
assert.equal(A.woodsAction('claim'),false);
assert.equal(A.G.player.zeny,before);
```

- [ ] **2. Run** `node js/woods-event-improvements.test.js` for the expected initial failure.
- [ ] **3. Author original content and deterministic transitions.** Use existing satchel/waystone POIs after verifying their tiles are connected and reachable. Expose explicit Interact actions at each stage. Initial tuning in DESIGN: waystone HP 100, two waves of three goblins, attackers deal 5 damage every 1500ms when in range, completion reward 150 zeny and three wolf fangs. Enemy player damage uses existing combat formulas. Telegraph attacks against the waystone. Arrival alone must not auto-complete the supply interaction.

```js
// Reducer invariant examples:
if (event.type === 'reload' && state.stage === 'defending')
  return {state:{...state,stage:'defenseReady'},effects:[]};
if (event.type === 'leave' && state.stage === 'defending')
  return {state:{...state,stage:'recovery'},effects:['despawnAttackers']};
if (event.type === 'claim' && (state.stage !== 'complete' || state.claimed))
  return {state,effects:[]};
```

- [ ] **4. Implement visible completion consequence.** Reveal and mark the actual Goblin Warrens route without removing existing access. Kill hooks inspect encounter identity and once-only actor death. Claim writes completion/reward together. Repair is a free explicit retry interaction. Exercise victory, object destruction, death, zone exit, reload checkpoint, duplicate death notifications, pause and repeated claims. Confirm patrol/ordinary kills do not count.
- [ ] **5. Run** Woods/expansion/persistence tests and `npm test`; capture supplies, defense, recovery and revealed-route states, inspect them, then checkpoint.

### Task 12: Three-wave Mana Surge expedition beside endless Rift

**Files:** Create `js/systems/expedition.js`, `js/expedition-improvements.test.js`. Modify `js/game.js` Rift entry/wave/kill/exit/death/save, `js/design.js`, `js/content.js`, `js/locale.js`, `autotest.html`.

**Interfaces:** Runtime exports `startExpedition():boolean`, `claimExpeditionReward():boolean`, `exitExpedition():boolean`. Session state is `G.expedition={runId,wave,status,mutatorId}` or null; status active/complete. Persistent `features.expedition.nextRun` allocates monotonic IDs and `claimedThrough` prevents replay. `advanceExpedition(session,aliveCount)` returns `{session,spawnNext,completed}`. Only one run may exist; wave count and bonuses live in DESIGN.

- [ ] **1. Test bounded advancement and preserved endless behavior.**

```js
const { A } = await createRuntime({});
// The existing entry is the portal at (3,1) in astral_rift; no extra level gate exists.
A.loadMap('astral_rift',3,1);
assert.equal(A.startExpedition(),true);
for (let wave=0; wave<3; wave++) {
  for (const m of [...A.G.monsters]) if (m.alive) A.killMonster(m);
}
assert.equal(A.G.expedition.status,'complete');
assert.equal(A.G.expedition.wave,3);
assert.equal(A.claimExpeditionReward(),true);
const gold=A.G.player.zeny;
assert.equal(A.claimExpeditionReward(),false);
assert.equal(A.G.player.zeny,gold);
```

- [ ] **2. Run** `node js/expedition-improvements.test.js` before implementation. The existing Rift entry is the astral_rift portal at (3,1), with no extra level or guardian check in `handlePortals`. Both choices use that entry; require the player to be at the entry interaction and do not invent a new progression gate. Intercept that portal to offer the choice without repeatedly reopening it while the player remains on the tile.
- [ ] **3. Add the entry choice and isolate wave progression.** Endless selection continues calling existing Rift behavior. Expedition selects Mana Surge, uses three waves with existing wave size/scale, and adds one `void_construct` elite in the final wave at a configured 1.25 HP/attack multiplier. Initial completion reward: 300 zeny and one star iron. Reward and multiplier values belong in DESIGN. Run-tagged actors bypass ordinary floor advancement after wave 3.

```js
if (G.expedition?.status === 'active') {
  const next = advanceExpedition(G.expedition,G.monsters.filter(m=>m.alive).length);
  G.expedition = next.session;
  if (next.spawnNext) spawnRiftWave();
  if (next.completed) showExpeditionCompletion();
  return; // no ordinary endless-floor increment for this roster
}
// showExpeditionCompletion is the game.js coordinator that opens Claim/Exit controls.
```

- [ ] **4. Make completion and interruption atomic.** Finishing wave 3 stores `pendingReward:{runId,variantId:'mana_surge_v1'}`. Claim validates that record and a run ID beyond claimedThrough, updates the ledger and clears the pending record before adding rewards, then persists one snapshot. A completed pending reward is claimable from town after exit/reload and blocks starting another expedition until claimed. Unfinished reload returns to town with no bonus. Guard every map-change/death/rebirth/new-game path against temporary effect leakage. Repeated runs allocate distinct IDs. Test save failure and retry, return to endless Rift, all seven classes, background pause, and stale kill callbacks from a departed map.
- [ ] **5. Run** expedition/phase3/persistence tests and `npm test`; inspect entry preview, wave 3, Claim/Exit, and reload notice before checkpointing.

### Task 13: Release acceptance and final review

**Files:** Modify `autotest.html` for stable scenarios; update `2026-09-22-mobile-support-plan.md` and this task ledger with actual evidence. Add no diagnostic files to the repository.

**Interfaces:** Autotest query parameters for the new surfaces are `training=basic_attack`, `loot=1`, `loadouts=1`, `woodsevent=supplies|defending|recovery|complete`, `expedition=1`. They call the real APIs above and validate setup; fixture failures go to the visible error banner instead of displaying fabricated panels. Existing query parameters continue working.

- [ ] **1. Run the full deterministic suite once after integration:** `npm test`. Run a temporary `.mjs` journey harness from `/private/tmp` importing the reusable fixture by absolute path and exercising new game → lessons → quest combat → loot/protect → preset → event → expedition → save/reload. Assert real inventory/claim/position outcomes. Park unrelated monsters and use controlled clocks rather than timing sleeps.
- [ ] **2. Serve the live zero-build app on loopback and probe it before launching a browser.** Use available ports rather than killing another user's server.

```sh
python3 -m http.server 8777 --bind 127.0.0.1
```

In a separate terminal check `curl --fail http://127.0.0.1:8777/autotest.html`. Use a freshly created temporary browser profile and screenshots outside the repository:

```sh
"/Applications/Brave Browser.app/Contents/MacOS/Brave Browser" \
  --headless --disable-gpu --no-first-run --touch-events=enabled \
  --user-data-dir=/private/tmp/aetheria-acceptance-profile \
  --window-size=390,844 --virtual-time-budget=12000 \
  --screenshot=/private/tmp/aetheria-acceptance-training.png \
  'http://127.0.0.1:8777/autotest.html?training=basic_attack'
```

- [ ] **3. Inspect images and errors at 360×800, 390×844, 412×915, 844×390, 768×1024, and 1366×768.** Cover title/class selection, gameplay, dialogue, settings, inventory, skills, training, loadouts, event stages and expedition completion. Match CSS viewport/device metrics, not merely the browser's outer window size. Repeat key flows in Thai. Verify actual `index.html`, because autoplay fixtures do not establish first-time navigation.
- [ ] **4. Exercise actual multi-touch input through browser automation or a phone.** Two concurrent touch points, finger leaving the control, pointercancel, orientation while moving, modal open during attack, and app switch while an enemy telegraph is active must leave deterministic results. Screenshot success alone cannot satisfy this check.
- [ ] **5. Measure ordinary and crowded combat frame times before/after on the same device.** Record p50/p95 and device/browser details; target 30 FPS or better on the representative phone. Verify iOS Safari and Android Chrome when hardware is available; otherwise mark both unexercised. If Brave repeats exit 134, record that exact failure and any safe fallback used; never claim visual acceptance from Node tests.
- [ ] **6. Obtain one independent review of save, combat timing, loadout conservation, and reward transactions after the implementation.** Respect AGENTS.md's maximum of two helpers and avoid overlapping writers. Address concrete defects, rerun affected tests, then the required full check if code changed.
- [ ] **7. Update evidence and handoff.** Record changed files, actual checks/exit codes, screenshots inspected, open device limits, and any scope not fulfilled. Do not label the release fully accepted while physical or browser checks remain outstanding. Preserve original uncommitted work and stop only task-owned local servers.

## Plan self-review

- Spec 1 is covered by Tasks 1–2; spec 2 by Tasks 3–5; spec 3 by Tasks 6–7; spec 4 by Tasks 8–9; spec 5 by Task 10; spec 6 by Task 11; spec 7 by Task 12. Task 13 covers player journeys, visual/runtime checks, performance and final review.
- The five Review Focus conditions have explicit owners and regression cases. Every task names exact files and API contracts. Runtime helpers introduced in snippets are defined in their task's text.
- `resumeGame` remains save loading; `resumeGameFromPause` is a new lifecycle function. `G.dailies.activeDailies` is canonical. Loadout equipment UIDs are references, never cloned owned items. Both HTML entry points use the same viewport/input semantics.
- Initial rewards and encounter budgets above are new feature settings, not a broad rebalance. Revise them only with measured gameplay evidence and keep revisions in DESIGN.
- The plan does not authorize a native app, cloud saves, multiplayer, external deployment, new monetization, or destructive Git operations.

## Execution handoff

Recommend **Native execution in this session**, followed by one independent save/combat reviewer. Most tasks touch the same engine file, so serial integration avoids overlapping edits and repeated context setup. The alternative is subagent-driven execution with non-overlapping helper ownership and serial engine integration, constrained by the repository's lean-agent policy.

Pending: review this plan and select Native or Subagent-driven execution. Then read the corresponding execution skill and implement the approved tasks. No product-code changes were made while preparing this plan.
