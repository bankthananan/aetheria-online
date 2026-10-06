# Fishing, Gathering & Alchemy System Specification (World Expansion Triad — Phase 3)

## Overview

The **Fishing, Gathering & Alchemy System** introduces open-world interactive resource harvesting, a retro 1-tap reaction mini-game, and an extensive alchemy and culinary crafting system into *Aetheria Online*. Players can harvest biome-specific herbs and ore veins, fish from shimmering water ripples using a precision timing bar, and combine their harvest into potent combat elixirs and gourmet feasts with active status buffs.

---

## 1. Core Mechanics & Subsystems

### 1.1 Gathering Nodes (`js/systems/gathering.js`)
Nodes are placed across overworld biomes and dungeons on walkable/water tiles with harvest and respawn states:
- **Herbs**:
  - `silverleaf`: Found across all temperate fields (`whispering_woods`, `town_awakening`).
  - `frost_lily`: Cold alpine flower exclusive to `frostpeak_tundra`.
  - `ember_blossom`: Volcanic fire herb growing near lava edges in `dragon_caldera`.
  - `sunken_kelp`: Aquatic flora found along shoreline shallows in `sunken_ruins`.
  - `moonlight_lotus`: Luminescent rare bloom in `whispering_woods` that **only manifests during Night phase** (`dayPhase >= 0.45 && dayPhase <= 0.90`).
- **Ores**:
  - `copper_ore`: Basic mineral found in early zones.
  - `iron_vein`: Sturdy metal deposits in ruins and tundras.
  - `caldera_crystal`: High-grade thermal crystal in `dragon_caldera`.
- **Water Fishing Ripples**:
  - Animated ripple spots on water perimeter tiles across all maps.
  - Interacting opens the Fishing 1-Tap Timing Mini-Game.

### 1.2 Fishing Mini-Game (Retro 1-Tap Sweet-Spot Bar)
- When interacting with a fishing ripple:
  - The game initializes a fishing encounter with needle speed, sweet-spot boundaries `[sweetMin, sweetMax]`, and catch pool.
  - Renders a retro canvas HUD bar centered above the player with:
    - Backing card with wood/brass borders.
    - Blue water track with a glowing green **Sweet-Spot Zone**.
    - Golden needle sweeping back and forth smoothly (`Math.sin` oscillation).
  - **Catch Trigger**:
    - Pressing `Space`, clicking canvas, or tapping touch screen stops the needle.
    - **Success** (needle inside sweet spot): Catches fish, plays pickup chime, triggers celebratory particle burst, awards item, and puts ripple on respawn cooldown (60s).
    - **Failure** (needle outside): Fish splashes away; player can recast immediately.
  - **Fish Roster**:
    - `glowing_trout`: Forest freshwater fish (`whispering_woods`).
    - `abyssal_bass`: Deep sea fish with high vitality (`sunken_ruins`).
    - `glacial_salmon`: Rich arctic fish (`frostpeak_tundra`).
    - `magma_koi`: Superheated exotic fish (`dragon_caldera`).
    - `stormfin`: Rare electric fish that **only bites during rainfall/storm weather** (`verdant_rain`, `stellar_drift`, `cosmic_eclipse`).
    - `golden_carp`: Legendary rare catch with a razor-thin sweet spot (±6% zone), yielding astronomical vendor value and master feasts.

### 1.3 Alchemy & Gourmet Cooking (`CONTENT.recipes`)
New recipes added to `CONTENT.recipes` under categories consumable/elixir/feast:
- **Combat Elixirs**:
  - `draught_vitality`: +200 Max HP for 300s (`silverleaf` + `frost_lily`).
  - `tonic_swiftness`: +15% Movement & Attack Speed for 180s (`silverleaf` + `sunken_kelp`).
  - `brew_berserker`: +25% ATK, -10% DEF for 120s (`ember_blossom` + `magma_koi`).
  - `elixir_ironbark`: +30% DEF for 180s (`silverleaf` + `copper_ore`).
  - `essence_night`: +20% Crit DMG for 240s (`moonlight_lotus` + `abyssal_bass`).
- **Gourmet Feasts**:
  - `grilled_trout`: Restores 400 HP + grants +10 flat ATK for 300s.
  - `smoked_salmon`: Restores 600 HP + grants +15 flat DEF for 300s.
  - `golden_carp_sashimi`: Full HP/MP recovery + +10% to all attributes for 600s.

---

## 2. Invariants & Engine Constraints

1. **Strict ZERO Screen Shake**:
   - 0% camera trauma engine-wide. Fishing casts, bites, reel-ins, and harvests use sparkling canvas particles, sound effects, and floating combat text without displacing `cam.x` or `cam.y`.
2. **Zero-Build ES Module Architecture**:
   - Plain ES modules, zero bundler or build steps, runnable via plain Node tests and browser HTTP server.
3. **Preserve `window.__AWO` Export Surface**:
   - Exactly maintain all 255 exported keys without modification.
4. **Save Compatibility**:
   - Persist node cooldowns, active player elixir buffs, and fishing stats cleanly under `awo_save_v1`.
5. **Full Dual Localization**:
   - All newly added items, fish, herbs, ores, recipes, and UI strings provide complete English and Thai translations in `js/locale.js`.
