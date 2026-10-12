# Grand Zenith Content Expansion Design Specification

**Date:** 2026-10-12  
**Status:** Approved  
**Project:** Aetheria Online (`index.html` + `js/*.js`)

---

## 1. Executive Summary & Goal

Aetheria Online currently features an end-to-end Base Lv 1–80 and Job Lv 1–50/60 progression arc across 6 biomes, 7 classes, and numerous rich sub-systems (Weather, Relics, Cards, Runes, Pets, Raids, Spire, Homestead, Stronghold).

The **Grand Zenith Content Expansion** comprehensively addresses every content and system gap identified during architectural analysis:
1. **Pillar 1: Regional Subdungeon Delving** — Adds 4 multi-floor instanced subdungeons to Sunken Ruins, Frostpeak Tundra, Dragon Caldera, and Astral Rift with unique boss mechanics, traps, and completion records.
2. **Pillar 2: Complete Hybrid Job Matrix** — Adds 4 new Lv 70 Hybrid Masteries (`arcane_archer`, `dreadnought`, `storm_templar`, `chi_tempest`) completing the hybrid class pairings for all 7 base callings.
3. **Pillar 3: Band 6 & The Isekai Endgame ("The Glitched Monolith", Base Lv 81–100, Job Lv 70)** — Raises Base Level Cap to 100 and Job Level Cap to 70. Delivers the narrative climax where modern Earth office artifacts collide with corrupt fantasy code, introducing Transcendent Set Gear.
4. **Pillar 4: Homestead Culinary Arts & Artificing** — Deepens Homestead and Gathering with a Culinary Stove for long-duration Feast Buffs (30–60m), plus an Artificer Workbench to transmute duplicate cards and materials.
5. **Pillar 5: Overworld & Subdungeon Fishing & Mining Expansion** — Adds 15+ resource nodes across Astral Rift, subdungeons, Homestead, and the new endgame; adds new ore/fish species; and implements the 2-strike "Precision Strike" mining mechanic.

All additions adhere to zero-build ES modules, data modules as database, save compatibility (`awo_save_v1`), engine exports (`window.__AWO`), and deterministic validation via `selfCheck()`.

---

## 2. Pillar 1: Regional Subdungeons

### 2.1 Overview & Architecture
Building upon [js/systems/subdungeon.js](file:///Users/thanananasanthia/Desktop/personal/game-rpg/js/systems/subdungeon.js) and the pattern in `js/zones/whispering-woods/dungeons/`, each of the remaining 4 regions receives an instanced dungeon module:

| Subdungeon ID | Name | Parent Region | Level Band | Boss | Signature Hazard |
|---|---|---|---|---|---|
| `sr_drowned_catacombs` | Drowned Catacombs | `sunken_ruins` | Lv 20–28 | Arch-Lich Malakar (Lv 28) | Waterlogged floors slowing movement; Mana Drain curse |
| `ft_glacial_chasm` | Glacial Chasm | `frostpeak_tundra` | Lv 36–44 | Frostbite Matron (Lv 44) | Slippery ice corridors; Falling stalactites |
| `dc_obsidian_foundry` | Obsidian Foundry | `dragon_caldera` | Lv 50–60 | Magma Golem Core (Lv 60) | Lava stepping stones; Heat pulse damage over time |
| `ar_singularity_vault` | Singularity Vault | `astral_rift` | Lv 68–80 | Void Singularity Herald (Lv 80) | Gravitational vortex suction; Dimensional phase shifts |

### 2.2 Map Layout & Portals
- Tile grids use 22×16 or 24×18 character matrices with portal pad `P` and boss marker `B`.
- Portals connect bi-directionally between overworld and dungeon coordinates.
- Overworld map definitions in [js/maps.js](file:///Users/thanananasanthia/Desktop/personal/game-rpg/js/maps.js) receive entry portals labeled "Enter <Dungeon Name>".
- `SubdungeonSystem.enterDungeon()` tracks `parentPortal` so players exit precisely outside the entrance.

### 2.3 Dungeon Loot & Badges
- Clear state saved in `G.subdungeons.clearedDungeons[id]` with `bestTimes` tracking.
- Boss Trophy Chest on clear containing: guaranteed `Blessed Ore`, high-tier monster cards, dungeon tokens, and zone-tier refinement fuel.

---

## 3. Pillar 2: Complete Hybrid Job Matrix

### 3.1 Overview & Architecture
Currently, [js/progression.js](file:///Users/thanananasanthia/Desktop/personal/game-rpg/js/progression.js) only defines 2 hybrid jobs (`spellblade` and `vanguard`). The remaining classes lack hybrid choices. We expand `PROGRESSION.hybridJobs` to 6 archetypes:

```text
Base Calling Pairings (Lv 70 Hybrid Masteries):
1. Drifter + Codeweaver      -> Spellblade (Existing)
2. Iron Fist + Lightbringer  -> Vanguard (Existing)
3. Far Shot + Codeweaver     -> Arcane Archer (NEW)
4. Reborn Blade + Drifter    -> Dreadnought (NEW)
5. Lightbringer + Stormcaller-> Storm Templar (NEW)
6. Iron Fist + Stormcaller   -> Chi Tempest (NEW)
```

### 3.2 Hybrid Specifications

#### 1. Arcane Archer (`arcane_archer`)
- **Prerequisites**: Far Shot (Sky Piercer or Wild Warden) + Lv 70.
- **Role**: Ranged Magic Sniper (DEX/INT).
- **Stat Bonus**: `dex: 10, int: 10, agi: 5`.
- **Signature Skill**: `arcane_arrow_barrage` (Fires 5 seeking crystal arrows that deal split Physical/Magic damage and detonate burns/slows).
- **Passive Mechanic**: `prismatic_quiver` (Basic attacks cycle between Fire, Frost, and Lightning elemental infusion, gaining +15% damage vs vulnerable foes).
- **Unlock Quest**: *Trial of the Prismatic String* (Slay 1 Void Construct in Astral Rift).

#### 2. Dreadnought (`dreadnought`)
- **Prerequisites**: Reborn Blade (Rift Knight) + Drifter + Lv 70.
- **Role**: Unstoppable Heavy Juggernaut (STR/VIT).
- **Stat Bonus**: `str: 12, vit: 12, agi: 3`.
- **Signature Skill**: `colossal_onslaught` (Charges forward dealing massive physical crush damage, shattering armor and granting CC immunity for 4s).
- **Passive Mechanic**: `retaliatory_momentum` (Taking damage converts 20% of lost HP into bonus ATK for 8s; stacks up to 5 times).
- **Unlock Quest**: *Trial of the Unbroken Colossus* (Slay 1 Void Construct in Astral Rift).

#### 3. Storm Templar (`storm_templar`)
- **Prerequisites**: Lightbringer (Dawnguard/Sunblade) + Stormcaller + Lv 70.
- **Role**: Holy-Lightning Crusader (VIT/INT).
- **Stat Bonus**: `vit: 10, int: 10, str: 6`.
- **Signature Skill**: `tempest_sanctuary` (Calls down a lightning-charged sacred circle; allies inside regenerate HP/MP while foes suffer continuous shock damage).
- **Passive Mechanic**: `thunderous_grace` (Healing skills discharge a chain lightning arc to the nearest enemy for 50% of healed amount).
- **Unlock Quest**: *Trial of the Thunderous Halo* (Slay 1 Void Construct in Astral Rift).

#### 4. Chi Tempest (`chi_tempest`)
- **Prerequisites**: Iron Fist (Ki Adept/Stone Disciple) + Stormcaller + Lv 70.
- **Role**: Storm Martial Artist (AGI/INT/STR).
- **Stat Bonus**: `agi: 10, int: 8, str: 8`.
- **Signature Skill**: `cyclone_lotus_kick` (Leaps into a whirlwind kick pulling nearby foes inward and finishing with a lightning thunderclap).
- **Passive Mechanic**: `conductive_ki` (Every 3rd martial combo strike triggers an electric spark dealing 40% ATK magic damage in a 2-tile radius).
- **Unlock Quest**: *Trial of the Cyclone Fist* (Slay 1 Void Construct in Astral Rift).

---

## 4. Pillar 3: Band 6 & The Isekai Endgame ("The Glitched Monolith", Lv 81–100)

### 4.1 Narrative Concept & Atmosphere
The protagonist's past office life and the underlying game world collide. A tear in reality opens beyond the Astral Rift: **The Glitched Monolith**. Modern office cubicles, glowing CRT terminals, suspended highway overpasses, and fiber optic flora protrude from floating fantasy stone.

### 4.2 Level Cap & Progression
- **Base Level Cap**: Raised from 80 to **100** (stat points continuing at 3/level with progressive cost formula).
- **Job Level Cap**: Raised from 50 (60 hybrid) to **70**.
- **XP Curve**: Formula extended continuously via `DESIGN.xpCurve` in [js/design.js](file:///Users/thanananasanthia/Desktop/personal/game-rpg/js/design.js).

### 4.3 New Biome Maps
1. **`glitched_monolith`** (Overworld, 44×34 tiles):
   - Tiles: Glitched void floor, server rack pillars, optic cables, floating concrete slabs.
   - Ambient text: *"Flickering monitor screens and broken code drift through the shattered void."*
2. **`source_core_subdungeon`** (Dungeon, 24×18 tiles):
   - The heart of the corrupted operating system.
   - Boss: **The System Architect (Lv 100 ☠)** (telegraphs "Memory Leak" hazard pools, "Null Pointer" beam lasers, and "Stack Overflow" screen pulses).

### 4.4 New Monster Roster
1. *Memory Phantom* (Lv 84, Void/Ghost, drops `corrupted_ram`, `silicon_ore`).
2. *Overtime Wraith* (Lv 88, Void/Undead, drops `spectral_id_badge`, `energy_drink`).
3. *Compiler Golem* (Lv 92, Earth/Mech, drops `silicon_ore`, `motherboard_shard`).
4. *Debug Drone* (Lv 96, Lightning/Mech, drops `gold_wire`, `greater_potion`).
5. *The System Architect* (Lv 100 ☠, Boss, drops `architect_crown`, `kernel_heart`, `blessed_ore`, `source_code_card`).

### 4.5 Transcendent Equipment & Set Bonuses
New Tier 4 "Source" Equipment (Lv 85–100):
- Weapons: `architect_blade`, `debugger_staff`, `fiber_optic_bow`, `kernel_crusher`.
- Armor: `firewall_hauberk`, `terminal_visor`, `subroutine_boots`, `overclock_ring`.
- **Set Bonus Engine**: Wearing 2 pieces grants +10% All Damage; wearing 4 pieces grants "Runtime Overclock" (+15% Attack Speed, +15% Cast Speed, 5% chance on hit to trigger a Glitch Shock).

---

## 5. Pillar 4: Homestead Culinary Arts & Artificing

### 5.1 Culinary Stove & Feast System
- Station located in `player_homestead` near the Cozy Hearth.
- Interacting opens the **Culinary Feasts** interface.
- Consumes Homestead crops (`produce_golden_wheat`, `produce_silverleaf`, `produce_moonflower`, `produce_ember_blossom`) + harvested fish/meats.
- Grants long-duration **Feast Buffs** (30–60 minutes, persistent across deaths):
  1. *Artisan Hearth Bread*: +10% Max HP, +5% DEF (30 min).
  2. *Pan-Seared Glacial Salmon*: +12% Physical ATK, +5% Crit (45 min).
  3. *Moonlit Lotus Nectar*: +15% Magic ATK, +5 MP/s regen (45 min).
  4. *Celestial Banquet*: +15% All Stats, +10% EXP Gain (60 min).

### 5.2 Artificer Workbench
- Station located in `player_homestead` or `guild_stronghold`.
- **Card Transmutation**: 3 duplicate monster cards -> 1 Old Card Album or Card Essence.
- **Rune Extraction / Polishing**: Combines low-tier elemental shards into Flawless Runes.
- **Socket Punching**: Craft `blacksmith_drill` items to guarantee socket expansion without failing.

---

## 6. Pillar 5: Fishing & Mining World Expansion

### 6.1 Expanded Node Distribution
Add 16 new authored nodes to `MAP_RESOURCE_NODES` in [js/systems/gathering.js](file:///Users/thanananasanthia/Desktop/personal/game-rpg/js/systems/gathering.js):
- **Astral Rift (3 nodes)**:
  - ⛏️ `node_ar_voidstone_1` (Ore: *Voidstone Seam*, yields `voidstone_ore`)
  - 🎣 `node_ar_ripple_1` (Ripple: *Starlight Ripple*, yields `cosmic_jellyfish` & `void_ray`)
  - 🌸 `node_ar_starlight_1` (Herb: *Starlight Orchid*, nocturnal cosmic flower)
- **Player Homestead (2 nodes)**:
  - 🎣 `node_hs_pond_1` (Ripple: *Homestead Tranquil Pond*, peaceful daily fishing for *Spring Bass* and *Golden Carp*)
  - ⛏️ `node_hs_quarry_1` (Ore: *Sanctum Mineral Vein*, daily respawning iron/copper/crystal)
- **Subdungeon Rich Deposits (4 nodes)**:
  - `node_ww_goblin_gold_1` (Goblin Cave: *Pyrite Vein*)
  - `node_sr_drowned_silver_1` (Drowned Catacombs: *Sunken Silver Vein*)
  - `node_ft_frost_quartz_1` (Glacial Chasm: *Permafrost Quartz*)
  - `node_dc_magma_sulfur_1` (Obsidian Foundry: *Sulfur Crystal Deposit*)
- **Glitched Monolith (4 nodes)**:
  - ⛏️ `node_gm_silicon_1` & `node_gm_silicon_2` (Ore: *Silicon Crystal Node*)
  - 🎣 `node_gm_datastream_1` (Ripple: *Data Stream Ripple*, yields `packet_eel` & `glitch_tetra`)
  - 🌿 `node_gm_optic_moss_1` (Herb: *Fiber Optic Moss*)

### 6.2 Precision Strike Mining Mini-Game
- When interacting with an Ore Node, an oscillating timing bar identical to fishing renders.
- Hitting the golden "Flawless Strike" zone grants:
  - Double ore yield (`qty: 2`).
  - 25% chance to chip a random Gem Shard (`ruby_shard`, `sapphire_shard`, `emerald_shard`).
  - 10% chance to unearth a `blessed_ore`.

---

## 7. Data Compatibility & Self-Check Validation

1. **SelfCheck Verification**:
   - Every new monster registered in `CONTENT.monsters` will have entries in `PX.monster` in [js/pixelart.js](file:///Users/thanananasanthia/Desktop/personal/game-rpg/js/pixelart.js).
   - Every new item in `CONTENT.items` mapped in `ITEM_ICON`.
   - Every new skill defined in `COMBAT.skills` and placed in `PROGRESSION.skillTree`.
   - All maps registered with valid entrance/exit coordinates and walkable tile matrices.
2. **Save Compatibility**:
   - `awo_save_v1` preserves player level, inventory, hybrid class, and gathering states.
   - Any uninitialized fields deserialize safely with standard default fallback values.
3. **Engine Runtime**:
   - Zero screen-shake guarantee upheld across all new renderers.
   - Headless test compatibility: all new pixel art retains matrix fallbacks.

---

## 8. Rollout & Phased Implementation Plan

The implementation will be executed systematically in 5 modular tasks:
- **Phase 1**: Regional Subdungeons (Data, Maps, System Wiring, Tests)
- **Phase 2**: Hybrid Job Matrix Completion (Skills, Trees, Trials, Mechanics, Tests)
- **Phase 3**: Band 6 & The Glitched Monolith (Level Cap 100, Job Cap 70, Monsters, Maps, Sets, Tests)
- **Phase 4**: Fishing & Mining World Expansion (New Nodes, Ore/Fish Catalogs, Precision Strike, Tests)
- **Phase 5**: Homestead Culinary Arts & Artificing (Cooking Station, Feast Buffs, Transmutation, Integration Tests)
