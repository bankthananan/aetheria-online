# Fishing, Gathering & Alchemy Implementation Plan (World Expansion Triad — Phase 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement interactive open-world resource gathering (herbs, ores), a retro 1-tap timing bar fishing mini-game, and combat elixir & feast alchemy crafting with active HUD buffs in Aetheria Online.

---

## Files To Create & Modify

| File | Action | Purpose |
|:---|:---|:---|
| `js/systems/gathering.js` | Create | Core Gathering & Fishing state machine, node management, fishing mechanics, sweet-spots, serialization. |
| `js/gathering.test.js` | Create | Unit tests for gathering state, node respawn, fishing sweet-spot validation, weather/night filtering. |
| `js/render/gathering-fx.js` | Create | Canvas 2D renderer for sparkling herb/ore nodes, water ripples, and the retro 1-tap fishing timing bar. |
| `js/gathering-fx.test.js` | Create | Unit tests for gathering & fishing canvas rendering and strict ZERO screen shake verification. |
| `js/content.js` | Modify | Register new gatherable items, ores, fish, elixirs, feasts, and alchemy/cooking recipes. |
| `js/pixelart.js` | Modify | Map sprite icon matrix mappings for all new items. |
| `js/locale.js` | Modify | Bilingual English & Thai translations for gathering nodes, fish, elixirs, feasts, and UI prompts. |
| `js/game.js` | Modify | Wire gathering & fishing systems, input handling (Space/Click), consumable buffs, admin actions, save/load. |
| `js/gathering-integration.test.js` | Create | Full engine headless integration test with browser mocks exercising the complete gathering/fishing/alchemy loop. |
| `CLAUDE.md` | Modify | Document `js/systems/gathering.js` and `js/render/gathering-fx.js` in the engine architecture overview. |

---

## Tasks

### Task 1: Gathering & Fishing Subsystem Core & Unit Tests
- [ ] Create `js/systems/gathering.js`:
  - Define node categories (`herb`, `ore`, `water_ripple`).
  - Catalog of herbs (`silverleaf`, `frost_lily`, `ember_blossom`, `sunken_kelp`, `moonlight_lotus`).
  - Catalog of ores (`copper_ore`, `iron_vein`, `caldera_crystal`).
  - Catalog of fish (`glowing_trout`, `abyssal_bass`, `glacial_salmon`, `magma_koi`, `stormfin`, `golden_carp`).
  - Implement `createGatheringSystem({ now, rnd })`:
    - `getNodesForMap(mapId, { dayPhase, weatherId })`: returns active map nodes considering night/weather conditions.
    - `harvestNode(nodeId)`: marks node harvested, yields items, starts respawn timer.
    - `startFishing(rippleId, { mapId, weatherId })`: generates sweet spot and target fish.
    - `updateFishing(dt)`: updates oscillating needle position (0.0 to 1.0).
    - `resolveFishingCast()`: tests needle position against sweet-spot; returns `{ success, fishId }`.
    - `tick(dt)`: updates respawn timers for harvested nodes.
    - `serialize()` / `deserialize(data)`: persistence support.
- [ ] Create `js/gathering.test.js`:
  - 8+ unit tests verifying node definitions, day/night filtering (moonlight lotus), storm filtering (stormfin), harvest cooldowns, sweet-spot hit/miss logic, and serialization.
- [ ] Run `node js/gathering.test.js` and verify all tests pass.
- [ ] Commit: `feat(gathering): implement gathering and fishing core subsystem and unit tests`.

---

### Task 2: Content Registration, Icon Mappings & Dual Bilingual Localization
- [ ] In `js/content.js`:
  - Register gatherable items: `silverleaf`, `frost_lily`, `ember_blossom`, `sunken_kelp`, `moonlight_lotus`.
  - Register ores: `copper_ore`, `iron_vein`, `caldera_crystal`.
  - Register fish: `glowing_trout`, `abyssal_bass`, `glacial_salmon`, `magma_koi`, `stormfin`, `golden_carp`.
  - Register elixirs: `draught_vitality`, `tonic_swiftness`, `brew_berserker`, `elixir_ironbark`, `essence_night`.
  - Register feasts: `grilled_trout`, `smoked_salmon`, `golden_carp_sashimi`.
  - Register recipes in `CONTENT.recipes`.
- [ ] In `js/pixelart.js`:
  - Map icon references for all new items in `ITEM_ICON`.
- [ ] In `js/locale.js`:
  - Add English and Thai translations for all newly registered items, recipes, buffs, and UI strings.
- [ ] Run `node js/locale.test.js` and verify bilingual completeness.
- [ ] Commit: `feat(gathering): register gathering items, recipes, icon mappings, and dual localization`.

---

### Task 3: Gathering & Fishing Canvas 2D Renderer & Unit Tests
- [ ] Create `js/render/gathering-fx.js`:
  - `createGatheringRenderer({ T })`:
    - `drawGatherNodes(ctx, nodes, cam, now)`: renders animated sparkling herb blossoms, glistening mineral veins, and rippling concentric water circles.
    - `drawFishingHud(ctx, fishingState, viewW, viewH)`: renders retro wooden timing bar, sweet-spot green band, oscillating golden needle indicator, and helper text ("Space / Tap to Reel").
    - Strict **ZERO Screen Shake** (0% camera displacement).
- [ ] Create `js/gathering-fx.test.js`:
  - Unit tests verifying mock 2D canvas draw operations for herbs, ores, water ripples, and fishing HUD bar with zero camera movement.
- [ ] Run `node js/gathering-fx.test.js` and verify all tests pass.
- [ ] Commit: `feat(gathering): implement gathering and fishing canvas renderer`.

---

### Task 4: Engine Lifecycle, Interaction, Buff Tracking & Save Persistence
- [ ] In `js/game.js`:
  - Import `createGatheringSystem` and `createGatheringRenderer`.
  - Instantiate `gatheringSystem` and `gatheringRenderer`.
  - In `handleClick(wx, wy)`: route player click to harvest nearby nodes or cast fishing line at water ripples.
  - In keydown handler: capture `Space` when `G.fishing?.active` to reel in line immediately.
  - In `useItem(itemId)`: support consuming elixirs and feasts, applying timed stat buffs in `p.buffs`.
  - In `step(dt)`: tick active node respawns, fishing needle oscillation, and player buff countdowns.
  - In `render()`: call `gatheringRenderer.drawGatherNodes` and `gatheringRenderer.drawFishingHud`.
  - In `adminAction(a, val)`: add `spawngather` and `catchfish` admin shortcuts.
  - In `saveGame()` and `resumeGame()`: serialize and deserialize gathering state.
  - Verify `window.__AWO` surface remains exactly 255 keys via `node js/engine-surface.test.js`.
- [ ] Commit: `feat(gathering): wire gathering nodes, fishing interaction, and elixir buffs into engine`.

---

### Task 5: End-to-End Integration Test, Documentation & Mainline Merge
- [ ] Create `js/gathering-integration.test.js`:
  - Setup browser mock environment using `installBrowserEnv()`.
  - Test gathering herbs and ores with inventory increases and node cooldowns.
  - Test night-only `moonlight_lotus` visibility/harvestability.
  - Test storm-only `stormfin` fishing availability.
  - Test fishing mini-game: sweet-spot hit yields fish, sweet-spot miss leaves ripple.
  - Test crafting elixir from gathered ingredients and consuming it to gain active stat buffs.
  - Test strict ZERO screen shake across all gathering/fishing operations.
  - Test save and load persistence of gathering state and active elixir buffs.
- [ ] Run `npm test` and verify all 49/49 suites pass cleanly.
- [ ] Update `CLAUDE.md` architecture section documenting `js/systems/gathering.js` and `js/render/gathering-fx.js`.
- [ ] Merge feature branch into `main`, delete feature branch, and run final `npm test` on `main`.
- [ ] Commit: `test(gathering): add comprehensive integration test suite and document architecture`.
