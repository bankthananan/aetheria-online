# Grand Zenith Content Expansion Implementation Plan

> **For Claude / Agent:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the Grand Zenith Content Expansion across 5 pillars: 4 regional subdungeons, 4 new Lv 70 hybrid jobs, expanded fishing/mining nodes with precision strikes, the Lv 81–100 Glitched Monolith endgame chapter, and Homestead culinary feast crafting.

**Architecture:** Extend Aetheria Online's zero-build plain ES module architecture by adding modular zone definitions in `js/zones/`, updating progression/combat tables in `js/progression.js` and `js/combat.js`, expanding resource nodes in `js/systems/gathering.js`, and adding cooking/artificing in `js/systems/homestead.js`. All wiring is guarded deterministically by `selfCheck()`, maintaining full backwards compatibility with `awo_save_v1` and `window.__AWO`.

**Tech Stack:** Vanilla JavaScript (ES modules), HTML5 Canvas 2D, Web Audio API, Node.js test harness (`script/run-tests.mjs`).

---

### Task 1: Regional Subdungeons for Ruins, Tundra, Caldera, and Rift

**Files:**
- Create: `js/zones/regional-dungeons.js`
- Modify: `js/maps.js`
- Modify: `js/content.js`
- Modify: `js/pixelart.js`
- Test: `js/regional-dungeons.test.js`

**Step 1: Write the failing test**

Create `js/regional-dungeons.test.js`:
```javascript
import assert from 'node:assert/strict';
import test from 'node:test';
import { REGIONAL_DUNGEONS } from './zones/regional-dungeons.js';
import { MAPS } from './maps.js';
import { CONTENT } from './content.js';

test('regional dungeons definition and map wiring', () => {
  const expectedDungeonIds = [
    'sr_drowned_catacombs',
    'ft_glacial_chasm',
    'dc_obsidian_foundry',
    'ar_singularity_vault'
  ];

  for (const id of expectedDungeonIds) {
    assert.ok(REGIONAL_DUNGEONS[id], `Missing definition for dungeon ${id}`);
    assert.ok(MAPS[id], `Dungeon ${id} must be registered in MAPS`);
    assert.ok(MAPS[id].tiles.length > 0, `Dungeon ${id} must have tiles`);
    assert.ok(MAPS[id].playerStart, `Dungeon ${id} must define playerStart`);
    assert.ok(MAPS[id].portals.length > 0, `Dungeon ${id} must have return portal`);

    const bossId = REGIONAL_DUNGEONS[id].boss?.monsterId;
    assert.ok(bossId, `Dungeon ${id} must define a boss monsterId`);
    const bossDef = CONTENT.monsters.find(m => m.id === bossId);
    assert.ok(bossDef, `Boss ${bossId} must exist in CONTENT.monsters`);
  }
});
```

**Step 2: Run test to verify it fails**

Run: `node js/regional-dungeons.test.js`  
Expected: FAIL (Cannot find module './zones/regional-dungeons.js')

**Step 3: Implement minimal code**

1. Create `js/zones/regional-dungeons.js` with definitions for:
   - `sr_drowned_catacombs` (Sunken Ruins, Boss: `lich_malakar`, Lv 28)
   - `ft_glacial_chasm` (Frostpeak Tundra, Boss: `frostbite_matron`, Lv 44)
   - `dc_obsidian_foundry` (Dragon Caldera, Boss: `magma_golem_core`, Lv 60)
   - `ar_singularity_vault` (Astral Rift, Boss: `singularity_herald`, Lv 80)
   Include 22×16 tile maps, `P` entrance pad, `B` boss marker, and monster spawns.
2. In `js/content.js`, add `lich_malakar`, `frostbite_matron`, `magma_golem_core`, and `singularity_herald` to `CONTENT.monsters` with appropriate HP, ATK, DEF, EXP, and drops.
3. In `js/pixelart.js`, add 6-frame pixel art matrices for the 4 bosses in `PX.monster`.
4. In `js/maps.js`, import `REGIONAL_DUNGEONS`, assign each into `MAPS`, and add entrance portals in `sunken_ruins`, `frostpeak_tundra`, `dragon_caldera`, and `astral_rift`.

**Step 4: Run test to verify it passes**

Run: `node js/regional-dungeons.test.js`  
Expected: PASS

**Step 5: Run full test suite and commit**

Run: `npm test`  
Expected: All suites pass (90/90 passed)

```bash
git add js/zones/regional-dungeons.js js/maps.js js/content.js js/pixelart.js js/regional-dungeons.test.js
git commit -m "feat(dungeons): add 4 regional subdungeons for ruins, tundra, caldera, and rift"
```

---

### Task 2: Complete the Hybrid Job Matrix

**Files:**
- Modify: `js/progression.js`
- Modify: `js/combat.js`
- Modify: `js/content.js`
- Test: `js/hybrid-jobs-matrix.test.js`

**Step 1: Write the failing test**

Create `js/hybrid-jobs-matrix.test.js`:
```javascript
import assert from 'node:assert/strict';
import test from 'node:test';
import { PROGRESSION } from './progression.js';
import { COMBAT } from './combat.js';

test('hybrid job matrix contains all 6 archetypes with valid skills', () => {
  const expectedHybrids = [
    'spellblade',
    'vanguard',
    'arcane_archer',
    'dreadnought',
    'storm_templar',
    'chi_tempest'
  ];

  for (const id of expectedHybrids) {
    const hybrid = PROGRESSION.hybridJobs[id];
    assert.ok(hybrid, `Hybrid ${id} must exist in PROGRESSION.hybridJobs`);
    assert.ok(hybrid.requires && hybrid.requires.length === 2, `Hybrid ${id} must have 2 requirement callings`);
    assert.ok(hybrid.bonus, `Hybrid ${id} must define stat bonus`);
    assert.ok(hybrid.signatureSkillId, `Hybrid ${id} must define signatureSkillId`);

    const skill = COMBAT.skills[hybrid.signatureSkillId];
    assert.ok(skill, `Signature skill ${hybrid.signatureSkillId} must exist in COMBAT.skills`);
  }
});
```

**Step 2: Run test to verify it fails**

Run: `node js/hybrid-jobs-matrix.test.js`  
Expected: FAIL (Hybrid arcane_archer must exist in PROGRESSION.hybridJobs)

**Step 3: Implement minimal code**

1. In `js/progression.js`:
   - Expand `PROGRESSION.hybridJobs` to include `arcane_archer`, `dreadnought`, `storm_templar`, and `chi_tempest` with signature skills, mechanics, and required base callings.
   - Add advancement trial quests for each hybrid in `PROGRESSION.tiers` or class trials.
   - Add skill tree nodes in `PROGRESSION.skillTree` for each signature skill (`arcane_arrow_barrage`, `colossal_onslaught`, `tempest_sanctuary`, `cyclone_lotus_kick`).
2. In `js/combat.js`:
   - Define active skills in `COMBAT.skills`:
     - `arcane_arrow_barrage`: multi-hit crystal arrow barrage.
     - `colossal_onslaught`: heavy crush gap-closer with armor break.
     - `tempest_sanctuary`: lightning ground ring healing allies and shocking enemies.
     - `cyclone_lotus_kick`: whirlwind kick pulling foes inward.

**Step 4: Run test to verify it passes**

Run: `node js/hybrid-jobs-matrix.test.js`  
Expected: PASS

**Step 5: Run full test suite and commit**

Run: `npm test`  
Expected: All suites pass

```bash
git add js/progression.js js/combat.js js/content.js js/hybrid-jobs-matrix.test.js
git commit -m "feat(classes): complete 6-archetype Lv 70 hybrid job matrix with signature skills"
```

---

### Task 3: Overworld & Subdungeon Fishing & Mining Expansion

**Files:**
- Modify: `js/systems/gathering.js`
- Modify: `js/render/gathering-fx.js`
- Modify: `js/content.js`
- Modify: `js/pixelart.js`
- Test: `js/gathering-expansion.test.js`

**Step 1: Write the failing test**

Create `js/gathering-expansion.test.js`:
```javascript
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MAP_RESOURCE_NODES,
  ORE_CATALOG,
  FISH_CATALOG,
  createGatheringSystem
} from './systems/gathering.js';
import { CONTENT } from './content.js';

test('gathering expansion adds nodes to astral rift, homestead, and subdungeons', () => {
  // Astral Rift must have nodes
  assert.ok(MAP_RESOURCE_NODES.astral_rift && MAP_RESOURCE_NODES.astral_rift.length >= 3,
    'astral_rift must have at least 3 gathering nodes');

  // Homestead must have fishing pond & quarry
  assert.ok(MAP_RESOURCE_NODES.player_homestead && MAP_RESOURCE_NODES.player_homestead.length >= 2,
    'player_homestead must have at least 2 gathering nodes');

  // Subdungeons must have ore nodes
  assert.ok(MAP_RESOURCE_NODES.ww_goblin_cave && MAP_RESOURCE_NODES.ww_goblin_cave.length >= 1,
    'ww_goblin_cave must have mineral vein');

  // Check new ores and fish exist in catalog and items
  const newOres = ['voidstone_ore', 'pyrite_ore', 'silicon_crystal'];
  for (const oreId of newOres) {
    assert.ok(ORE_CATALOG[oreId], `ORE_CATALOG must include ${oreId}`);
    assert.ok(CONTENT.items.some(i => i.id === oreId), `CONTENT.items must include ${oreId}`);
  }

  const newFish = ['cosmic_jellyfish', 'void_ray', 'spring_bass'];
  for (const fishId of newFish) {
    assert.ok(FISH_CATALOG[fishId], `FISH_CATALOG must include ${fishId}`);
    assert.ok(CONTENT.items.some(i => i.id === fishId), `CONTENT.items must include ${fishId}`);
  }
});
```

**Step 2: Run test to verify it fails**

Run: `node js/gathering-expansion.test.js`  
Expected: FAIL (astral_rift must have at least 3 gathering nodes)

**Step 3: Implement minimal code**

1. In `js/systems/gathering.js`:
   - Expand `ORE_CATALOG` with `voidstone_ore`, `pyrite_ore`, `silicon_crystal`.
   - Expand `FISH_CATALOG` with `cosmic_jellyfish`, `void_ray`, `spring_bass`.
   - Add nodes to `MAP_RESOURCE_NODES` for `astral_rift`, `player_homestead`, `ww_goblin_cave`, `sr_drowned_catacombs`, `ft_glacial_chasm`, `dc_obsidian_foundry`.
   - Implement `precisionStrike` mining roll inside `harvestNode()` giving bonus yield and gem shards when a sweet-spot is hit.
2. In `js/content.js`:
   - Register items in `CONTENT.items` for all new ores and fish with appropriate prices and flavor descriptions.
3. In `js/render/gathering-fx.js`:
   - Add palette colors for new ores and herbs in `ORE_PALETTES` and `HERB_PALETTES`.
4. In `js/pixelart.js`:
   - Map icons in `ITEM_ICON` for the new fish and ores.

**Step 4: Run test to verify it passes**

Run: `node js/gathering-expansion.test.js`  
Expected: PASS

**Step 5: Run full test suite and commit**

Run: `npm test`  
Expected: All suites pass

```bash
git add js/systems/gathering.js js/render/gathering-fx.js js/content.js js/pixelart.js js/gathering-expansion.test.js
git commit -m "feat(gathering): add astral, homestead, and subdungeon nodes with precision strike mining"
```

---

### Task 4: Band 6 & The Isekai Endgame ("The Glitched Monolith", Base Lv 81–100, Job Lv 70)

**Files:**
- Modify: `js/design.js`
- Create: `js/zones/glitched-monolith.js`
- Modify: `js/maps.js`
- Modify: `js/content.js`
- Modify: `js/pixelart.js`
- Test: `js/glitched-monolith.test.js`

**Step 1: Write the failing test**

Create `js/glitched-monolith.test.js`:
```javascript
import assert from 'node:assert/strict';
import test from 'node:test';
import { DESIGN } from './design.js';
import { MAPS } from './maps.js';
import { CONTENT } from './content.js';

test('glitched monolith endgame cap, maps, and monsters', () => {
  // Check level caps
  assert.equal(DESIGN.tuning.maxLevel, 100, 'Max Base Level must be 100');
  assert.ok(DESIGN.xpCurve(100) > DESIGN.xpCurve(80), 'XP curve must calculate up to Lv 100');

  // Check maps
  assert.ok(MAPS.glitched_monolith, 'MAPS must include glitched_monolith');
  assert.ok(MAPS.source_core_subdungeon, 'MAPS must include source_core_subdungeon');

  // Check monsters
  const expectedMonsters = [
    'memory_phantom',
    'overtime_wraith',
    'compiler_golem',
    'debug_drone',
    'system_architect'
  ];
  for (const mId of expectedMonsters) {
    const def = CONTENT.monsters.find(m => m.id === mId);
    assert.ok(def, `Monster ${mId} must exist in CONTENT.monsters`);
    assert.ok(def.level >= 80, `Monster ${mId} level must be >= 80`);
  }

  // Check Transcendent Source gear set
  const setGear = ['architect_blade', 'firewall_hauberk', 'terminal_visor', 'overclock_ring'];
  for (const gId of setGear) {
    assert.ok(CONTENT.items.some(i => i.id === gId), `Item ${gId} must exist in CONTENT.items`);
  }
});
```

**Step 2: Run test to verify it fails**

Run: `node js/glitched-monolith.test.js`  
Expected: FAIL (Max Base Level must be 100)

**Step 3: Implement minimal code**

1. In `js/design.js`:
   - Update `DESIGN.tuning.maxLevel = 100`.
   - Update `PROGRESSION.jobLevelCap = 70` and `jobLevelCaps = [15, 40, 50, 60, 70]`.
   - Ensure `DESIGN.xpCurve(level)` scales cleanly through Lv 100.
2. Create `js/zones/glitched-monolith.js`:
   - Define `glitched_monolith` (44×34 tile overworld map with digital aesthetic, server racks `#`, glitch void `X`, return portal to Astral Rift).
   - Define `source_core_subdungeon` (24×18 tile core room with Boss marker `B`).
3. In `js/maps.js`:
   - Register both maps in `MAPS` and connect portals from `astral_rift` to `glitched_monolith`.
4. In `js/content.js`:
   - Add the 5 monsters (`memory_phantom`, `overtime_wraith`, `compiler_golem`, `debug_drone`, `system_architect`).
   - Add the Transcendent Source equipment set (`architect_blade`, `firewall_hauberk`, `terminal_visor`, `overclock_ring`, `subroutine_boots`).
5. In `js/pixelart.js`:
   - Add pixel art matrices in `PX.monster` and item icons in `ITEM_ICON`.

**Step 4: Run test to verify it passes**

Run: `node js/glitched-monolith.test.js`  
Expected: PASS

**Step 5: Run full test suite and commit**

Run: `npm test`  
Expected: All suites pass

```bash
git add js/design.js js/zones/glitched-monolith.js js/maps.js js/content.js js/pixelart.js js/glitched-monolith.test.js
git commit -m "feat(endgame): add Lv 81-100 Glitched Monolith zone, monsters, and Transcendent gear"
```

---

### Task 5: Homestead Culinary Arts & Artificing

**Files:**
- Modify: `js/systems/homestead.js`
- Modify: `js/render/homestead-ui.js`
- Modify: `js/content.js`
- Modify: `js/game.js`
- Test: `js/homestead-culinary.test.js`

**Step 1: Write the failing test**

Create `js/homestead-culinary.test.js`:
```javascript
import assert from 'node:assert/strict';
import test from 'node:test';
import { createHomesteadSystem, CULINARY_FEASTS } from './systems/homestead.js';
import { CONTENT } from './content.js';

test('homestead culinary feasts and buff application', () => {
  assert.ok(CULINARY_FEASTS, 'CULINARY_FEASTS catalog must exist');
  assert.ok(CULINARY_FEASTS.artisan_hearth_bread, 'artisan_hearth_bread feast must exist');
  assert.ok(CULINARY_FEASTS.pan_seared_salmon, 'pan_seared_salmon feast must exist');
  assert.ok(CULINARY_FEASTS.celestial_banquet, 'celestial_banquet feast must exist');

  const hs = createHomesteadSystem();
  const player = {
    inventory: [
      { id: 'produce_golden_wheat', qty: 5 },
      { id: 'produce_silverleaf', qty: 5 }
    ],
    buffs: {}
  };

  const res = hs.cookFeast(player, 'artisan_hearth_bread');
  assert.ok(res.success, 'Cooking feast with valid ingredients must succeed');
  assert.ok(player.buffs.artisan_hearth_bread, 'Player must receive feast buff');
  assert.ok(player.buffs.artisan_hearth_bread.durationMs >= 1800000, 'Feast buff duration must be >= 30m');
});
```

**Step 2: Run test to verify it fails**

Run: `node js/homestead-culinary.test.js`  
Expected: FAIL (CULINARY_FEASTS catalog must exist)

**Step 3: Implement minimal code**

1. In `js/systems/homestead.js`:
   - Export `CULINARY_FEASTS` catalog defining required crops/fish, cook time, and buff stats (`durationMs`, `statBonus`).
   - Implement `cookFeast(player, feastId)` consuming ingredients and setting `player.buffs[feastId] = { ...buff, expiresAt }`.
   - Implement `transmuteCards(player, cardIds)` allowing 3 duplicate cards to transmute into an Old Card Album or Card Essence.
2. In `js/content.js`:
   - Register items for all prepared feasts in `CONTENT.items`.
3. In `js/render/homestead-ui.js`:
   - Add Culinary Stove UI modal renderer displaying available feasts, ingredient requirements, and Cook button.
4. In `js/game.js`:
   - In `recompute(player)`, incorporate active feast buffs into the player's final stats calculation (`hpMax`, `atk`, `def`, `expBonus`).

**Step 4: Run test to verify it passes**

Run: `node js/homestead-culinary.test.js`  
Expected: PASS

**Step 5: Run full test suite and commit**

Run: `npm test`  
Expected: All suites pass

```bash
git add js/systems/homestead.js js/render/homestead-ui.js js/content.js js/game.js js/homestead-culinary.test.js
git commit -m "feat(homestead): add culinary feasts cooking system, long buffs, and card transmutation"
```

---

## Final Verification Checklist
- Run `npm test` (all 90+ test suites must pass).
- Run headless Node test verifying `selfCheck()` completes without errors on clean state.
- Verify `autotest.html` loads cleanly in browser with zero red error banners.
