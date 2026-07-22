# Ragnarok Progression, Equipment, and Ecology Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two selectable third jobs per base class, promotion-gated cumulative Job Levels, RO-style skill dependency graph, class-compatible gear families, and five better-distributed regional monsters.

**Architecture:** Extend existing `PROGRESSION` records and `js/game.js` dispatchers; do not create parallel class, equipment, or spawn systems. Use `advancedJobId` beside existing `jobBranchId`, one shared equipment compatibility predicate, native SVG behind existing HTML skill nodes, and deterministic spacing inside existing depth-based spawn placement.

**Tech Stack:** Plain JavaScript ES modules, HTML/CSS, native SVG, Canvas 2D, Web Audio, Node `assert`, headless Brave; zero new dependencies and zero build step.

## Global Constraints

- Active game only: `index.html`, `autotest.html`, and `js/*.js`; do not modify legacy `src/` behavior.
- Data modules remain database; no JSON, SQLite, IndexedDB, server, framework, or dependency migration.
- Preserve all existing uncommitted edits; inspect each target diff before editing and never reset/revert user work.
- Job Levels remain cumulative: active caps are exactly `[15, 40, 50]`; promotion never resets Job Level.
- Seven base classes each have exactly two second jobs and two third jobs; third-job choice is independent of second-job choice.
- `classReq` uses base class IDs only; `null` means universal and an array means compatible base classes.
- Existing equipped legacy gear remains equipped after migration; future incompatible equip attempts fail without state mutation.
- Keep current heat formula, nursery, anchored respawns, guardians, and approximate regional populations.
- Non-trivial changes need runnable Node assertions; final completion requires temporary headless Node harness plus real Brave screenshots.
- Do not commit unless user explicitly requests it.

## File Map

- Modify `js/progression.js`: Job cap table, 14 third-job records, `reqAdvancedJob` gates, exclusive passives.
- Modify `js/combat.js`: seven alternate exclusive third-job actives; reuse seven existing advanced actives as default-path exclusives.
- Modify `js/design.js`: third-job stat budgets only.
- Modify `js/game.js`: active Job cap, third-job selection/migration/gating, compatibility predicate, skill graph rendering, spawn spacing, validation, save schema.
- Modify `js/content.js`: weapon families, armor compatibility, five monsters, drops/shop rows.
- Modify `js/maps.js`: five new spawn rows and widened overlapping depth bands.
- Modify `js/pixelart.js`: five monster motion sets and gear icon mappings.
- Modify `js/locale.js`: English-keyed Thai translations for new jobs, skills, gear, monsters, and UI gates.
- Modify `autotest.html`: deterministic third-job choice/graph and incompatible-gear screenshot staging.
- Modify `js/job-branch.test.js`: third-job choices, caps, migration, save/rebirth, exclusive gates.
- Modify `js/skill-system.test.js`: graph markup and path-state coverage.
- Modify `js/equipment.test.js`: compatibility and weapon-family progression coverage.
- Modify `js/heat-guidance.test.js`: regional type and spacing coverage.
- Modify `js/art.test.js`: sprite/icon completeness for new content.
- Modify `ISEKAI_README.md`: final behavior/counts after tests pass.

---

### Task 1: Promotion-Gated Job Levels and Third-Job State

**Files:**
- Modify: `js/progression.js:3-11`
- Modify: `js/game.js:489-919`
- Modify: `js/game.js:1101-1131`
- Modify: `js/game.js:2039-2050`
- Modify: `js/game.js:5687-5760`
- Test: `js/job-branch.test.js`

**Interfaces:**
- Produces: `PROGRESSION.jobLevelCaps: [15, 40, 50]`
- Produces: `activeJobLevelCap(player): number`
- Produces: `advancedJobsFor(classId): AdvancedJob[]`
- Produces: `advancedJobFor(player, allowDefault?): AdvancedJob|null`
- Produces: `normaliseAdvancedJob(player): player`
- Produces: `chooseAdvancedJob(advancedJobId, player?): boolean`
- Extends player/save state with `advancedJobId: string|null`

- [ ] **Step 1: Add failing Job-cap and third-job state assertions**

Append focused assertions to `js/job-branch.test.js` before implementation:

```js
assert.deepEqual(A.PROGRESSION.jobLevelCaps, [15, 40, 50], 'career Job caps are fixed at 15/40/50');
const capped = A.makePlayer('reborn_blade', 'CapTester');
A.G.player = capped;
capped.jobLevel = 15; capped.jobXp = 0; capped.tierIndex = 0;
assert.equal(A.activeJobLevelCap(capped), 15, 'base job cap is 15');
A.gainXp(A.jobXpForNext(15) * 3);
assert.equal(capped.jobLevel, 15, 'base job cannot earn second-job levels early');
assert.equal(capped.jobXp, 0, 'XP does not bank at a promotion cap');
capped.tierIndex = 1;
assert.equal(A.activeJobLevelCap(capped), 40, 'second job unlocks Job 40');
A.gainXp(A.jobXpForNext(15));
assert.equal(capped.jobLevel, 16, 'Job XP resumes after promotion');
capped.tierIndex = 2;
assert.equal(A.activeJobLevelCap(capped), 50, 'third job unlocks Job 50');
for (const classId of classIds) {
  const cfg = A.PROGRESSION.advancedJobs[classId];
  assert.equal(cfg.choices.length, 2, `${classId} has two third-job choices`);
  assert.ok(cfg.choices.some(job => job.id === cfg.defaultId), `${classId} has a valid third-job default`);
}
```

- [ ] **Step 2: Run test and confirm red state**

Run: `node js/job-branch.test.js`

Expected: exit code 1 with missing `jobLevelCaps`, `advancedJobs`, or `activeJobLevelCap`.

- [ ] **Step 3: Add cap table and player state**

In `js/progression.js`, replace the single-cap assumption with:

```js
jobLevelCap: 50,          // absolute save/UI ceiling
jobLevelCaps: [15, 40, 50],
```

In `makePlayer`, add `advancedJobId: null` beside `jobBranchId`. In rebirth reset, clear both. Add:

```js
function activeJobLevelCap(p) {
  return PROGRESSION.jobLevelCaps[Math.max(0, Math.min(p?.tierIndex || 0, PROGRESSION.jobLevelCaps.length - 1))];
}
```

Change `gainXp()` Job XP loop to use `activeJobLevelCap(p)`, clear `jobXp` at that active cap, and keep `PROGRESSION.jobLevelCap` only as absolute display/save ceiling.

- [ ] **Step 4: Define concrete third jobs**

Add `PROGRESSION.advancedJobs` with exact IDs and visible titles:

```js
advancedJobs: {
  reborn_blade: { defaultId: 'voidcleaver_lord', choices: [
    { id: 'voidcleaver_lord', name: 'Voidcleaver Lord', role: 'Destroyer', focus: 'Cleave · Rupture · Finish', color: '#c57ee8' },
    { id: 'aegis_paragon', name: 'Aegis Paragon', role: 'Fortress', focus: 'Guard · Control · Endure', color: '#78a7d8' },
  ] },
  drifter: { defaultId: 'tempest_reaper', choices: [
    { id: 'tempest_reaper', name: 'Tempest Reaper', role: 'Reaper', focus: 'Area · Speed · Pursuit', color: '#df777c' },
    { id: 'crimson_sovereign', name: 'Crimson Sovereign', role: 'Executioner', focus: 'Power · Sustain · Execute', color: '#c94655' },
  ] },
  codeweaver: { defaultId: 'reality_debugger', choices: [
    { id: 'reality_debugger', name: 'Reality Debugger', role: 'Artillery', focus: 'Burn · Detonate · Area', color: '#b98bea' },
    { id: 'absolute_architect', name: 'Absolute Architect', role: 'Controller', focus: 'Freeze · Ward · Survival', color: '#70bde8' },
  ] },
  far_shot: { defaultId: 'worldbane_sniper', choices: [
    { id: 'worldbane_sniper', name: 'Worldbane Sniper', role: 'Deadeye', focus: 'Range · Precision · Finish', color: '#7fcf91' },
    { id: 'starhawk_warden', name: 'Starhawk Warden', role: 'Hunter', focus: 'Volley · Control · Fortune', color: '#b4d56f' },
  ] },
  lightbringer: { defaultId: 'seraph_warden', choices: [
    { id: 'seraph_warden', name: 'Seraph Warden', role: 'Guardian', focus: 'Heal · Ward · Endure', color: '#efd36f' },
    { id: 'solar_justicar', name: 'Solar Justicar', role: 'Judge', focus: 'Smite · Burn · Finish', color: '#f29b57' },
  ] },
  iron_fist: { defaultId: 'grandmaster', choices: [
    { id: 'grandmaster', name: 'Grandmaster', role: 'Combo Master', focus: 'Tempo · Stun · Detonate', color: '#e69b61' },
    { id: 'adamant_sage', name: 'Adamant Sage', role: 'Bulwark', focus: 'Guard · Shockwave · Control', color: '#b99a77' },
  ] },
  stormcaller: { defaultId: 'archon_of_storms', choices: [
    { id: 'archon_of_storms', name: 'Archon of Storms', role: 'Storm Weaver', focus: 'Slow · Shock · Area', color: '#70cddd' },
    { id: 'cinder_archon', name: 'Cinder Archon', role: 'Firebrand', focus: 'Burn · Sustain · Finish', color: '#ef7654' },
  ] },
},
```

Add balanced `bonus` objects whose sums match new per-class Tier-2 budgets in `DESIGN.jobBranchBalance.thirdJobStatPointBudgets`.

- [ ] **Step 5: Add selection and migration helpers**

Implement `advancedJobsFor`, `advancedJobFor`, `chooseAdvancedJob`, and `normaliseAdvancedJob`. `normaliseAdvancedJob` must:

```js
if ((p.tierIndex || 0) < 2) p.advancedJobId = null;
else if (!valid) {
  const byTitle = cfg.choices.find(job => job.name === p.className);
  p.advancedJobId = (byTitle || cfg.choices.find(job => job.id === cfg.defaultId) || cfg.choices[0]).id;
}
```

Do not reduce legitimate historical `jobLevel` values. `normalisePlayerProgression` clamps only to absolute Job 50.

- [ ] **Step 6: Persist schema and validate behavior**

Add `advancedJobId` to `saveGame()` and `resumeGame()`. Increment save version from 4 to 5 and update assertions expecting version 4. Export all new helpers through `window.__AWO`.

Run: `node js/job-branch.test.js`

Expected: exit code 0.

- [ ] **Step 7: Checkpoint without commit**

Run: `git diff --check -- js/progression.js js/design.js js/game.js js/job-branch.test.js`

Expected: exit code 0. Do not commit unless user requests it.

---

### Task 2: Third-Job Choice Flow and Exclusive Skills

**Files:**
- Modify: `js/combat.js:120-170`
- Modify: `js/progression.js:46-215`
- Modify: `js/game.js:576-919`
- Modify: `js/game.js:1410-1485`
- Modify: `js/game.js:1750-1900`
- Modify: `js/job-branch.test.js`

**Interfaces:**
- Produces: `advancedJobAllowsSkill(player, skillId): boolean`
- Produces: `advancedJobAllowsPassive(player, passiveId): boolean`
- Produces: `advancedJobChoicePanelHtml(player): string`
- Produces: `showAdvancedJobChoice(player): void`
- Consumes: `chooseAdvancedJob`, `advancedJobFor`, `advancedJobsFor`

- [ ] **Step 1: Add failing exclusivity and promotion-choice tests**

Add:

```js
const thirdChoice = A.makePlayer('reborn_blade', 'ThirdChoice');
A.G.player = thirdChoice;
thirdChoice.level = 40; thirdChoice.jobLevel = 40; thirdChoice.tierIndex = 1;
thirdChoice.jobBranchId = 'rift_knight';
A.startAdvanceQuest(2);
A.G.advance.progress = A.G.advance.def.objective.count;
A.checkAdvance();
assert.equal(thirdChoice.tierIndex, 1, 'completed mastery trial waits for third-job choice');
assert.equal(A.G.advance.choiceReady, true, 'third-job choice becomes ready');
const thirdHtml = A.advancedJobChoicePanelHtml(thirdChoice);
assert.ok(thirdHtml.includes('Voidcleaver Lord') && thirdHtml.includes('Aegis Paragon'), 'third-job chooser compares both final jobs');
assert.equal(A.chooseAdvancedJob('aegis_paragon', thirdChoice), true);
assert.equal(thirdChoice.advancedJobId, 'aegis_paragon');
assert.equal(thirdChoice.tierIndex, 2);
assert.equal(A.advancedJobAllowsSkill(thirdChoice, 'aegis_wall'), true);
assert.equal(A.advancedJobAllowsSkill(thirdChoice, 'world_cleaver'), false);
```

- [ ] **Step 2: Run test and confirm failure**

Run: `node js/job-branch.test.js`

Expected: exit code 1 at missing advanced choice UI or gate.

- [ ] **Step 3: Gate exact active/passive pairs**

Add `reqAdvancedJob` to these existing actives:

```text
world_cleaver=voidcleaver_lord
apocalypse=tempest_reaper
arcane_nova=reality_debugger
star_fall=worldbane_sniper
dawnbreaker=seraph_warden
dragon_kick=grandmaster
cataclysm=archon_of_storms
```

Use these existing uncommitted advanced actives for alternate paths:

```text
aegis_wall=aegis_paragon
death_sentence=crimson_sovereign
aegis_of_frost=absolute_architect
hawks_focus=starhawk_warden
wrath_of_dawn=solar_justicar
zen_state=adamant_sage
world_ender=cinder_archon
```

Gate passive pairs:

```text
bulwark_mastery / riposte_mastery
bloodfury / undying_fury
elemental_focus / arcane_precision
swift_wind / marksmans_edge
holy_vigor / holy_fervor
inner_calm / flowing_step
tempest_soul / tempest_vigor
```

First passive in each pair belongs to default third job; second belongs to alternate, except Lightbringer uses `holy_vigor=seraph_warden` and `holy_fervor=solar_justicar`.

- [ ] **Step 4: Route every runtime path through gates**

Implement:

```js
function advancedJobAllowsSkill(p, id) {
  const required = PROGRESSION.skillTree[id]?.reqAdvancedJob;
  return !required || required === p?.advancedJobId;
}
function advancedJobAllowsPassive(p, id) {
  const required = PROGRESSION.passives[id]?.reqAdvancedJob;
  return !required || required === p?.advancedJobId;
}
```

Apply both gates in `canLearn`, `canLearnPassive`, `castSkillById`, Auto-Hunt skill selection, heal selection, learn-all, hotbar picker, skill rendering, and progression normalization. When normalization removes foreign ranks, refund removed rank count to `skillPoints` and clear matching hotbar/cooldown entries.

- [ ] **Step 5: Split Tier-2 completion from selection**

At `checkAdvance()`, Tier 1 completion still opens second-job choice. Tier 2 completion opens `showAdvancedJobChoice()` without calling `doPromote`. `chooseAdvancedJob()` applies selected bonus and exactly two existing promotion skill points once, sets `className`, clears `G.advance`, and updates HUD/panels/save.

Admin `promote` selects each class's `defaultId` for deterministic operation.

- [ ] **Step 6: Test save migration and rebirth**

Add assertions that a v4 tier-2 save with old fixed `className` maps to default `advancedJobId`, foreign exclusive ranks refund, save v5 round-trips selection, and rebirth clears `advancedJobId`.

Run: `node js/job-branch.test.js && node js/automation.test.js && node js/rebirth.test.js`

Expected: all exit code 0.

- [ ] **Step 7: Checkpoint without commit**

Run: `git diff --check -- js/combat.js js/progression.js js/game.js js/job-branch.test.js`

Expected: exit code 0.

---

### Task 3: RO-Style SVG/HTML Skill Graph

**Files:**
- Modify: `js/game.js:4113-4253`
- Modify: `js/game.js:4950-4990`
- Modify: `js/game.js:5509-5532`
- Modify: `autotest.html:73-94`
- Test: `js/skill-system.test.js`

**Interfaces:**
- Produces: `skillGraphHtml(player): string`
- Produces: `renderSkillGraphLines(root=document): void`
- Consumes: `advancedJobAllowsSkill`, `advancedJobAllowsPassive`, current `skillNodeTip`, learning handlers, drag handlers.

- [ ] **Step 1: Replace obsolete no-graph assertions with failing graph assertions**

Change `js/skill-system.test.js`:

```js
const html = A.skillsPanelHtml(player);
assert.equal((html.match(/class="ro-job-stage/g) || []).length, 3, `${classId} graph has three career stages`);
assert.ok(html.includes('class="ro-skill-graph"'), `${classId} renders graph container`);
assert.ok(html.includes('class="ro-skill-lines"') && html.includes('aria-hidden="true"'), `${classId} renders decorative SVG layer`);
for (const skill of ownSkills) assert.ok(html.includes(`data-skill="${skill.id}"`), `${classId} includes ${skill.id}`);
```

Add an advanced Reborn Blade assertion that both `data-advanced-job="voidcleaver_lord"` and `data-advanced-job="aegis_paragon"` appear, while selected/rejected branches use distinct classes.

- [ ] **Step 2: Run test and confirm failure**

Run: `node js/skill-system.test.js`

Expected: exit code 1 because current output uses `ro-job-grid`/`ro-job-lane` without SVG.

- [ ] **Step 3: Build semantic node and stage markup**

Keep current `cardHtml` state calculation, tooltip attributes, and drag attributes. Render each node as:

```html
<button type="button" class="ro-skill ..." data-skill="skill_id" data-kind="active" data-stage="1" data-parent="parent_id">
  ...existing icon, name, rank, prerequisite, role, state...
</button>
```

Locked nodes omit `data-learn`/`data-passive` but remain focusable for tooltips. Graph wrapper:

```html
<div class="ro-skill-graph-wrap">
  <div class="ro-skill-graph">
    <svg class="ro-skill-lines" aria-hidden="true"></svg>
    <section class="ro-job-stage" data-tier="0">...</section>
    <section class="ro-job-stage" data-tier="1">...</section>
    <section class="ro-job-stage ro-third-stage" data-tier="2">...</section>
  </div>
</div>
```

Inside Tier 2, group exclusive nodes under two `ro-third-branch` sections with exact `data-advanced-job` IDs. Shared nodes render above both branches.

- [ ] **Step 4: Draw native SVG dependency paths**

After panel HTML mounts, call `renderSkillGraphLines()`. For every `[data-parent]`, measure child/parent against `.ro-skill-graph`, create one SVG `path`, and classify it:

```js
const state = child.classList.contains('incompatible') ? 'incompatible'
  : child.classList.contains('ready') ? 'ready'
  : child.classList.contains('preview') || child.classList.contains('tier-capped') ? 'preview'
  : parent.classList.contains('owned') || parent.classList.contains('maxed') ? 'learned'
  : 'locked';
path.setAttribute('class', `ro-skill-line ${state}`);
path.setAttribute('d', `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`);
```

Clear SVG before redraw. Register one debounced native `resize` listener; no `ResizeObserver` abstraction needed.

- [ ] **Step 5: Add graph CSS**

Replace lane-grid CSS with horizontal scroll and a fixed readable minimum width:

```css
.ro-skill-graph-wrap{overflow-x:auto;padding:8px}
.ro-skill-graph{position:relative;display:grid;grid-template-columns:repeat(3,minmax(270px,1fr));gap:38px;min-width:900px}
.ro-skill-lines{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible;z-index:0}
.ro-job-stage{position:relative;z-index:1}
.ro-skill-line{fill:none;stroke:#53657e;stroke-width:2}
.ro-skill-line.learned{stroke:#e3bd58}.ro-skill-line.ready{stroke:#71c47c}.ro-skill-line.preview{stroke:#6fb0ef}
.ro-skill-line.incompatible{stroke:#c65356;stroke-dasharray:6 5}
.ro-third-branch.incompatible{opacity:.62}
```

Preserve existing colors, tooltip CSS, reset note, combat guide, and responsive panel width.

- [ ] **Step 6: Extend autotest staging**

Update `career=3` to choose default third job. Add `thirdchoice=1` staging to complete Tier-2 trial and show final choice. Add `advanced=<id>` override for selected graph screenshots.

Run: `node js/skill-system.test.js && node js/job-branch.test.js`

Expected: exit code 0.

- [ ] **Step 7: Checkpoint without commit**

Run: `git diff --check -- js/game.js autotest.html js/skill-system.test.js`

Expected: exit code 0.

---

### Task 4: Class-Compatible Weapon and Armor Families

**Files:**
- Modify: `js/content.js:80-165`
- Modify: `js/content.js:167-172`
- Modify: `js/game.js:80-100`
- Modify: `js/game.js:226-430`
- Modify: `js/game.js:4900-5050`
- Modify: `js/pixelart.js` item icon and `ITEM_ICON` sections
- Modify: `autotest.html:123-131`
- Test: `js/equipment.test.js`
- Test: `js/art.test.js`

**Interfaces:**
- Produces: `canUseItem(player, itemOrId): boolean`
- Produces: `itemClassRequirementText(item): string`
- Consumes: `itemById`, base `player.classId`, existing equip/comparison/shop/inventory renderers.

- [ ] **Step 1: Add failing compatibility tests**

Append:

```js
const ranger = A.makePlayer('far_shot', 'RangerGear');
const blade = A.makePlayer('reborn_blade', 'BladeGear');
assert.equal(A.canUseItem(ranger, 'hunter_bow'), true);
assert.equal(A.canUseItem(blade, 'hunter_bow'), false);
assert.equal(A.canUseItem(blade, 'iron_sword'), true);
assert.equal(A.canUseItem(ranger, 'iron_sword'), false);
A.G.player = ranger;
const sword = A.rollItem('iron_sword', 0, 'common');
ranger.inventory.push(sword);
const oldWeapon = ranger.equip.weapon;
assert.equal(A.equip(sword.uid), false, 'incompatible equip is rejected');
assert.equal(ranger.equip.weapon, oldWeapon, 'failed equip does not mutate slot');
for (const classId of A.DESIGN.classes.map(cls => cls.id)) {
  const usable = A.CONTENT.items.filter(item => item.type === 'weapon' && A.canUseItem(A.makePlayer(classId, 'Coverage'), item));
  for (const band of [[1, 20], [21, 50], [51, 80]])
    assert.ok(usable.some(item => item.gearLevel >= band[0] && item.gearLevel <= band[1]), `${classId} has ${band[0]}-${band[1]} weapon progression`);
}
```

- [ ] **Step 2: Run test and confirm failure**

Run: `node js/equipment.test.js`

Expected: exit code 1 because `canUseItem`, `hunter_bow`, and `gearLevel` are absent.

- [ ] **Step 3: Add concrete weapon progression**

Keep `worn_dagger` universal for migration/emergency use. Add early/mid/late rows with `gearLevel` and these compatibility arrays:

```text
Sword/greatsword: reborn_blade,lightbringer
Dagger/scythe: drifter
Bow: far_shot
Staff/grimoire: codeweaver,stormcaller
Knuckles/claws: iron_fist
Mace: lightbringer
```

Use exact new IDs:

```text
training_greatsword, mythril_greatsword, astral_greatsword
scrap_scythe, crimson_scythe, void_scythe
hunter_bow, frost_bow, starhawk_bow
apprentice_staff, rune_staff, astral_staff
leather_knuckles, dragon_claws, star_knuckles
novice_mace, dawn_mace, seraph_mace
```

Set early/mid/late `gearLevel` to `5/35/65`, values near equivalent existing sword tiers, and add selected rows to regional drops/shop stock. Assign existing swords `gearLevel` plus sword-family `classReq`.

- [ ] **Step 4: Add selected armor-family restrictions**

Apply base-class arrays to body/head/hands/feet items:

```js
const HEAVY = ['reborn_blade', 'lightbringer'];
const MEDIUM = ['drifter', 'far_shot', 'iron_fist'];
const CLOTH = ['codeweaver', 'stormcaller'];
```

Because data modules cannot share runtime constants outside the export without extra abstraction, write arrays directly on item rows. Keep `cloth_tunic`, cloaks, and accessories universal. Heavy examples: `guardian_plate`, `mythril_plate`, `astral_plate`, iron/mythril/titan plate pieces. Medium examples: `leather_vest`, `drakescale_boots`. Add `adept_robe`, `runic_gloves`, and `astral_slippers` for cloth progression rather than class-locking every current defensive drop.

- [ ] **Step 5: Implement one shared compatibility predicate**

```js
function canUseItem(p, itemOrId) {
  const item = typeof itemOrId === 'string' ? itemById[itemOrId] : itemOrId;
  return !!item && (!item.classReq || item.classReq.includes(p.classId));
}
function itemClassRequirementText(item) {
  return item.classReq?.map(id => T(DESIGN.classes.find(cls => cls.id === id)?.name || id, 'classes')).join(', ') || T('All classes', 'ui');
}
```

Call it from `equip(uid)` before any inventory/equip mutation. Use same result to disable inventory and shop equip affordances and show `Requires: ...` in item/comparison HTML. Items stay lootable, buyable, sellable, storable, and refinable.

- [ ] **Step 6: Preserve legacy equipped gear**

Do not call `canUseItem` during save normalization on already equipped instances. New equip attempts enforce restrictions. Rebirth recomputation must keep legacy equipped weapon. Update tests that manually equip incompatible gear to use class-compatible IDs where compatibility is relevant; keep direct legacy-instance tests only when testing migration.

- [ ] **Step 7: Add icons and autotest gear staging**

Add pixel icons and `ITEM_ICON` mappings for every new weapon/armor ID. Change `autotest.html?gear=1` to seed both compatible and incompatible items for selected class; only compatible pieces are auto-equipped.

Run: `node js/equipment.test.js && node js/art.test.js && node js/monster-system.test.js`

Expected: exit code 0.

- [ ] **Step 8: Checkpoint without commit**

Run: `git diff --check -- js/content.js js/game.js js/pixelart.js autotest.html js/equipment.test.js js/art.test.js`

Expected: exit code 0.

---

### Task 5: Regional Monster Variety and Deterministic Spacing

**Files:**
- Modify: `js/content.js:4-78`
- Modify: `js/maps.js:250-390`
- Modify: `js/pixelart.js` monster sprite section
- Modify: `js/game.js:1231-1390`
- Test: `js/heat-guidance.test.js`
- Test: `js/art.test.js`

**Interfaces:**
- Produces: `spawnPointIsSpaced(x, y, monsters, minTiles=2): boolean`
- Consumes: existing `buildHeatField`, `heatDepthAt`, `heatLevel`, `makeMonster`, map spawn `depth`/`levelRange`.

- [ ] **Step 1: Add failing ecology tests**

Add exact regional expectations:

```js
const regionalNewcomers = {
  whispering_woods: 'moss_hornet',
  sunken_ruins: 'bog_lantern',
  frostpeak_tundra: 'snowfang_lynx',
  dragon_caldera: 'cinder_drake',
  astral_rift: 'void_crawler',
};
for (const [mapId, monsterId] of Object.entries(regionalNewcomers)) {
  A.loadMap(mapId);
  assert.ok(A.G.monsters.some(monster => monster.def.id === monsterId), `${mapId} contains ${monsterId}`);
  const normalTypes = new Set(A.G.monsters.filter(monster => monster.def.sizeTiles < 2).map(monster => monster.def.id));
  assert.ok(normalTypes.size >= 4, `${mapId} has at least four normal monster types`);
  const separated = A.G.monsters.filter((monster, index, all) => all.every((other, j) => j === index || Math.hypot(monster.x - other.x, monster.y - other.y) >= 32));
  assert.ok(separated.length >= Math.floor(A.G.monsters.length * 0.8), `${mapId} avoids one-tile spawn clumps`);
}
```

- [ ] **Step 2: Run test and confirm failure**

Run: `node js/heat-guidance.test.js`

Expected: exit code 1 because five monster IDs do not exist.

- [ ] **Step 3: Add five concrete monster definitions**

Add normal monsters using existing materials:

```text
moss_hornet (Woods Lv7): slime_gel, wolf_fang; ranged poison-colored projectile
bog_lantern (Ruins Lv22): shade_dust, mana_potion; passive until engaged, ranged
snowfang_lynx (Tundra Lv38): frost_shard, wolf_pelt; aggressive melee
cinder_drake (Caldera Lv54): ember_ash, sand_fang; aggressive ranged fire
void_crawler (Rift Lv70): void_shard, star_iron; aggressive melee
```

Use stats interpolated between adjacent regional monsters; do not exceed guardian stats or add new status mechanics.

- [ ] **Step 4: Add sprites and spawn records**

Create five compact base matrices and wrap each with existing `monsterMotionSet`, yielding idle/walk/attack arrays. Add spawn rows and redistribute counts so each field has roughly its current total normal population, not current total plus a full new pack.

Use overlapping broad depth bands:

```text
Woods newcomer 0.22-0.58
Ruins newcomer 0.34-0.74
Tundra newcomer 0.42-0.78
Caldera newcomer 0.45-0.82
Rift newcomer 0.30-0.68
```

Widen neighboring bands enough to reach annex depth while retaining weakest nursery and deepest guardian prey.

- [ ] **Step 5: Add deterministic spacing to existing placement**

Inside current spawn candidate selection, prefer cells at least two tiles from placed normal monsters. Use existing bounded retry loop; after retries, accept valid habitat cell so counts never drop:

```js
function spawnPointIsSpaced(x, y, monsters, minTiles = 2) {
  const min = minTiles * TILE;
  return monsters.every(monster => Math.hypot(monster.x - x, monster.y - y) >= min);
}
```

Do not apply spacing to fixed boss markers. Respawn continues near home coordinates and need not re-run global spacing.

- [ ] **Step 6: Run ecology and art tests**

Run: `node js/heat-guidance.test.js && node js/art.test.js && node js/monster-system.test.js`

Expected: all exit code 0 across repeated heat samples; no population loss or nursery failure.

- [ ] **Step 7: Checkpoint without commit**

Run: `git diff --check -- js/content.js js/maps.js js/pixelart.js js/game.js js/heat-guidance.test.js js/art.test.js`

Expected: exit code 0.

---

### Task 6: Validation, Thai Copy, Autotest, and Documentation

**Files:**
- Modify: `js/game.js:226-430`
- Modify: `js/locale.js`
- Modify: `js/locale.test.js`
- Modify: `autotest.html`
- Modify: `ISEKAI_README.md:27-103`

**Interfaces:**
- Extends existing `selfCheck()` only; no new validation framework.
- Consumes all records and helpers from Tasks 1–5.

- [ ] **Step 1: Add failing self-check/data assertions**

In existing tests, assert:

```js
assert.ok(A.PROGRESSION.jobLevelCaps.every((cap, i, caps) => i === 0 || cap > caps[i - 1]));
for (const item of A.CONTENT.items) {
  assert.ok(item.classReq == null || (Array.isArray(item.classReq) && item.classReq.length > 0));
  assert.ok(item.classReq == null || item.classReq.every(id => classIds.includes(id)));
}
for (const [classId, cfg] of Object.entries(A.PROGRESSION.advancedJobs)) {
  assert.equal(cfg.choices.length, 2);
  assert.equal(new Set(cfg.choices.map(job => job.id)).size, 2);
}
```

- [ ] **Step 2: Extend `selfCheck()` minimally**

Validate exact cap order, two unique third jobs/default per class, stat-budget sums, known `reqAdvancedJob` targets, valid nonempty `classReq` arrays, weapon progression in `1–20`, `21–50`, and `51–80`, malformed spawn depth/level ranges, and existing content/sprite/drop references.

Reuse current accumulated `errs` pattern and single final loud failure. No separate schema layer.

- [ ] **Step 3: Add Thai translations and locale coverage**

Add translations for all 14 third-job names, seven alternate exclusive skill names/flavor lines, new passives already present in uncommitted changes, 18 weapon IDs, three cloth armor IDs, five monster names/flavor lines, and UI keys:

```text
THIRD JOB
Choose final path
Final choice · rebirth required to change
Requires classes
All classes
Promotion required
Incompatible path
```

In `js/locale.test.js`, render third-job choice and incompatible gear in Thai and assert translated text appears rather than English key fallback.

- [ ] **Step 4: Finish deterministic screenshot staging**

Ensure `autotest.html` supports:

```text
panel=skills&career=1
panel=skills&career=2
panel=skills&thirdchoice=1
panel=skills&career=3&advanced=aegis_paragon
panel=inv&class=far_shot&gear=1
panel=char&class=far_shot&gear=1
map=whispering_woods&tilephase=0&anim=idle:0
map=astral_rift&tilephase=0&anim=idle:0
```

Fix existing unconditional four-monster clustering at `autotest.html:149-151` so it runs only for FX/boss showcase params; ecology screenshots must preserve real spawn distribution.

- [ ] **Step 5: Update documentation from measured final data**

Update `ISEKAI_README.md` to state 14 second jobs, 14 third jobs, Job caps 15/40/50, SVG dependency graph, weapon families/class restrictions, 28 monsters, and five regional spawn types. Do not claim counts until tests confirm actual arrays.

Run: `node js/locale.test.js && node js/job-branch.test.js && node js/equipment.test.js && node js/heat-guidance.test.js`

Expected: exit code 0.

- [ ] **Step 6: Checkpoint without commit**

Run: `git diff --check`

Expected: exit code 0.

---

### Task 7: Required Full Verification

**Files:**
- Create temporarily outside repo: `/tmp/aetheria-ragnarok-final.mjs`
- Create temporarily outside repo: `/tmp/aetheria-shots/*.png`
- No repository test artifact for temporary harness/screenshots.

**Interfaces:**
- Consumes final `window.__AWO` exports and `autotest.html` query staging.
- Produces verification evidence only.

- [ ] **Step 1: Run focused repository tests**

Run:

```bash
node js/job-branch.test.js
node js/skill-system.test.js
node js/equipment.test.js
node js/heat-guidance.test.js
node js/art.test.js
node js/locale.test.js
node js/automation.test.js
node js/rebirth.test.js
node js/monster-system.test.js
```

Expected: every command exits 0. Do not judge by output text.

- [ ] **Step 2: Run full repository suite**

Run: `npm test`

Expected: exit code 0. Report legacy failures separately if any; do not hide them.

- [ ] **Step 3: Write one temporary headless Node harness**

Create `/tmp/aetheria-ragnarok-final.mjs` by copying the established browser shims from `js/job-branch.test.js`, importing the repository's absolute `js/game.js`, and asserting one end-to-end path:

```js
const p = A.makePlayer('far_shot', 'FinalHarness');
A.G.player = p;
p.jobLevel = 15; p.tierIndex = 0; p.jobXp = 0;
A.gainXp(A.jobXpForNext(15) * 2);
assert.equal(p.jobLevel, 15); assert.equal(p.jobXp, 0);
p.level = 15; p.jobBranchId = 'sky_piercer'; p.tierIndex = 1;
A.gainXp(A.jobXpForNext(15)); assert.equal(p.jobLevel, 16);
p.level = 40; p.jobLevel = 40; p.advancedJobId = 'worldbane_sniper'; p.tierIndex = 2;
assert.equal(A.activeJobLevelCap(p), 50);
assert.equal(A.advancedJobAllowsSkill(p, 'star_fall'), true);
assert.equal(A.advancedJobAllowsSkill(p, 'hawks_focus'), false);
const bow = A.rollItem('hunter_bow', 0, 'common'); p.inventory.push(bow);
assert.equal(A.equip(bow.uid), true);
const sword = A.rollItem('iron_sword', 0, 'common'); p.inventory.push(sword);
assert.equal(A.equip(sword.uid), false);
A.loadMap('whispering_woods');
assert.ok(A.G.monsters.some(m => m.def.id === 'moss_hornet'));
```

- [ ] **Step 4: Run temporary harness by exit code**

Run: `node /tmp/aetheria-ragnarok-final.mjs`

Expected: exit code 0.

- [ ] **Step 5: Start active-game server**

Run in background:

```bash
python3 -m http.server 8777
```

Wait until `http://localhost:8777/autotest.html` responds. Reuse an already-running server if port 8777 is occupied by this repo.

- [ ] **Step 6: Capture deterministic Brave screenshots**

Create `/tmp/aetheria-shots`, then run exact headless Brave commands for:

```text
skills-base.png     ?panel=skills&career=1&tilephase=0&anim=idle:0
skills-second.png   ?panel=skills&career=2&tilephase=0&anim=idle:0
third-choice.png    ?panel=skills&thirdchoice=1&tilephase=0&anim=idle:0
skills-third.png    ?panel=skills&career=3&advanced=aegis_paragon&tilephase=0&anim=idle:0
gear-ranger.png     ?panel=inv&class=far_shot&gear=1&tilephase=0&anim=idle:0
char-ranger.png     ?panel=char&class=far_shot&gear=1&tilephase=0&anim=idle:0
woods-ecology.png   ?map=whispering_woods&tilephase=0&anim=idle:0
aether-ecology.png  ?map=astral_rift&tilephase=0&anim=idle:0
```

Command template:

```bash
"/Applications/Brave Browser.app/Contents/MacOS/Brave Browser" --headless --disable-gpu --screenshot=/tmp/aetheria-shots/<name>.png --window-size=1440,1000 --virtual-time-budget=5000 "http://localhost:8777/autotest.html?<query>"
```

Also capture one narrow graph with `--window-size=760,900`.

- [ ] **Step 7: Read every PNG**

Use image Read on all nine screenshots. Verify:

- no red runtime-error banner;
- full third-job choice names and exclusive nodes visible;
- prerequisite lines terminate at correct nodes and do not obscure labels;
- horizontal graph remains readable at narrow width;
- incompatible ranger sword shows class requirement and does not appear equipped;
- ranger has compatible bow equipped;
- ecology shots preserve real distribution, annex occupancy, nursery stock, and no obvious pile of overlapping monsters.

If any visual fails, fix and rerun both relevant Node test and screenshot.

- [ ] **Step 8: Final integrity check**

Run:

```bash
git diff --check
git status --short
```

Expected: no whitespace errors. Status includes pre-existing edits plus intended files only. Report exact tests/screenshots run and any skipped check. Do not claim completion unless both temporary Node harness and Brave image review passed.
