# World Event Rifts, Dimensional Incursions & Rift Portals Specification

## Overview

The **World Event Rifts & Dimensional Incursions System** brings dynamic emergent open-world events to *Aetheria Online*. Spontaneously or under cosmic weather conditions, dimensional tears tear through the fabric of adventure zones (`whispering_woods`, `sunken_ruins`, `frostpeak_tundra`, `dragon_caldera`). Players interact with the tears to stabilize the rift, triggering a high-stakes 3-wave incursion of otherworldly void entities. Sealing the rift rewards players with a **Dimensional Cache** packed with Primal Runes, Blessed Ore, Star Iron, and Dimensional Shards to feed into the Phase 1 Socket Expansion system.

---

## 1. Core Mechanics & Lifecycle

### Incursion State Machine (`js/systems/incursions.js`)
An incursion operates as an autonomous state machine attached to the world state:

1. **`IDLE`**: No active rift. A background world clock ticks towards the next rift spawn (base cooldown: 8 minutes).
   - *Weather Surge Acceleration*: If an intense atmospheric weather event is active (`cosmic_eclipse`, `stellar_drift`, `ashfall`, `biting_blizzard`, `verdant_rain`), the spawn timer ticks 2x faster (rifts appear every 4-5 minutes).
2. **`TEAR_OPEN`**: A dimensional tear manifests on a walkable tile 4–8 tiles from the player.
   - Visually renders as a swirling purple/void elliptical vortex with floating energy sparks.
   - Remains unstable for 120 seconds. If not triggered within that window, the tear safely dissolves back into `IDLE`.
   - Walking into or clicking on the tear begins the incursion.
3. **`INCURSION_ACTIVE`**:
   - The rift destabilizes into an active battlefield with a 90-second event timer.
   - A top-center Incursion HUD banner appears showing:
     - Active Wave (e.g. `Wave 1/3`, `Wave 2/3`, `Wave 3/3 - HERALD`)
     - Time remaining (bar + seconds)
     - Active Dimensional Mutator
   - **Wave 1 (Minions)**: 3× `void_wisp` (fast ranged void attackers).
   - **Wave 2 (Infiltrators & Champion)**: 3× `void_stalker` + 1 Champion with a random affix (Molten / Frost Nova / Vortex).
   - **Wave 3 (Herald)**: 1× `void_herald` (Mini-boss with high HP, void aura, and elite mechanics) + 2 elite guards.
   - **Mutators (1 randomly assigned per rift)**:
     - `void_decay`: Enemies leave small decaying pools dealing minor damage.
     - `graviton_well`: The rift periodically pulses a gentle pull towards the vortex.
     - `primal_instability`: Enemies deal +20% damage matching the active world weather element.
     - `phase_shift`: Enemies periodically phase for 1s, dodging physical attacks.
4. **`SEALED`**:
   - Upon defeating the `void_herald` before time expires, the rift collapses with radiant particles.
   - A golden **Dimensional Cache** (`rift_cache`) spawns at the rift center.
   - Opening or auto-collecting the cache rewards the player and transitions state to `IDLE` with full cooldown.
5. **`COLLAPSED` (Failure)**:
   - If the 90-second timer expires or the player flees the map/dies, remaining rift monsters fade away and the tear implodes without rewards.

---

## 2. Rewards & Economy Integration

The system directly feeds the **Phase 1 Elemental Rune & Socket Expansion** loop:

### Dimensional Cache (`rift_cache`) Loot Table:
- **Zeny**: 2,500 – 5,000 Zeny.
- **Dimensional Shards (`dimensional_shard`)**: 3 – 6 shards (new tradeable material).
- **Primal Runes**: Guaranteed 1–2 Primal Runes (rolled equally across Fire, Ice, Lightning, Nature, Holy, Void).
- **Socket Expansion Fuel**: Guaranteed 3–5 `star_iron` or 1–2 `blessed_ore` or 5 `wolf_fang`.
- **Gear Drop**: 50% chance of a Rare/Epic gear piece with 2–4 pre-rolled sockets.

### Monster Drops:
- `void_wisp`: Drops `shade_dust` (35%), `mana_potion` (20%), `dimensional_shard` (10%).
- `void_stalker`: Drops `star_iron` (25%), `blessed_ore` (10%), `dimensional_shard` (25%).
- `void_herald`: Drops `dimensional_shard` (100%), `blessed_ore` (50%), `hero_blade` or `astral_plate` (15%).

---

## 3. Visuals & Rendering (`js/render/rift-fx.js`)

- **Vortex Renderer**:
  - Multi-layered procedural canvas ellipses in indigo (`#4a148c`), deep violet (`#7b1fa2`), and celestial cyan (`#00e5ff`).
  - Orbiting orbital spark particles drawn with standard canvas math (`cos`/`sin` angle progression).
- **Incursion HUD Banner**:
  - Clean retro frame fixed at the top of the viewport.
  - Displays event name, wave progression indicator, and countdown progress bar.
- **Strict Zero Screen Shake Constraint**:
  - Strictly 0% camera shake or viewport displacement at all times.
  - Wave transitions, herald spawns, and rift sealing use expanding radial rings and floating combat text (`floatText`), NEVER camera trauma.

---

## 4. Architectural Boundaries & Invariants

1. **Subsystem Decoupling**:
   - `createIncursionSystem()` in `js/systems/incursions.js`.
   - `createRiftRenderer()` in `js/render/rift-fx.js`.
   - Distinct from existing endless tower `celestial_rift` (`G.rift`). The new subsystem uses `G.incursion`.
2. **Surface Stability**:
   - `window.__AWO` key count remains exactly 255. No new keys exported.
   - Admin action `adminAction('spawnrift')` and `adminAction('sealrift')` provide test and dev hooks.
3. **Save Compatibility**:
   - `G.incursion` serializes cleanly into `awo_save_v1` (storing state, timer, cooldown, and position).
4. **Localization**:
   - Dual English and Thai translations in `js/locale.js` for all incursion UI, mutators, monster names, and descriptions.
