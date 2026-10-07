# World Boss Raids & Incursion Climax Design Specification

**Date:** 2026-10-07  
**Project:** Aetheria Online (`index.html` + `js/*.js`)  
**Status:** Approved Specification  

---

## Overview

The **World Boss Raids & Incursion Climax System** serves as the grand climax of the *Endgame Progression & Ecology Triad* for Aetheria Online. It introduces cooperative high-stakes raid encounters through a dual-activation model:
1. **Incursion Climax (Wave 4)**: Dimensional tears escalating during intense weather or rare cosmic convergence, awakening the Apex Void Sovereign (`voidmaw_sovereign`).
2. **Overworld Apex Titans**: Ancient colossal beasts awakened via overworld beacons or crafted summoning horns (`titan_horn`), such as the Magma Colossus (`caldera_colossus`) and Primordial Behemoth (`ancient_behemoth`).

The encounters feature a tactical 3-phase combat lifecycle with a break/stagger gauge, telegraphed hazard geometry, real-time contribution scoring, tiered raid rewards, and full integration with Monster Cards, Socket Expansion, and Pet Familiars.

---

## 1. Core Architecture & Subsystem Boundaries

### 1.1 Architecture & Separation of Concerns
The system is built on modular, zero-build plain ES modules with zero global namespace contamination:
- **`js/systems/raids.js`**: Core raid state machine, encounter lifecycle, break/stagger gauge mechanics, contribution scoring, and loot table generators.
- **`js/render/raids-fx.js`**: Specialized Canvas 2D renderer for boss elemental auras, translucent hexagonal Aegis Barrier domes, break gauge bars, geometric telegraphs (linear fissure, breath cone, cataclysm ring), and stagger crystal bursts with strict zero camera shake.
- **`js/render/raids-ui.js`**: HTML/DOM renderers for the top-center Raid Encounter HUD and the post-battle Victory Summary Modal with strict boxing containment (`box-sizing: border-box`, `min-width: 0`, `overflow-x: hidden`).
- **`js/game.js`**: Thin engine integration wiring raid updates into `step(dt)`, combat hooks, monster death listeners, save/resume serialization, and admin test hooks.

### 1.2 Incursion Climax & Overworld Titan Lifecycle

```
[IDLE]
  │
  ├─► [Incursion Wave 3 Complete] ──(Weather Surge / 35% roll)──► [INCURSION CLIMAX: voidmaw_sovereign]
  │
  └─► [Titan Horn / Beacon Activated] ──────────────────────────► [OVERWORLD TITAN: caldera_colossus / ancient_behemoth]
                                                                        │
                                                                        ▼
                                                                 [ENGAGED: Phase 1]
                                                                        │ (HP <= 60%)
                                                                        ▼
                                                           [BREAK_STAGGER: Phase 2]
                                                            ├──► Staggered! (8s stun, +40% vuln)
                                                            └──► Detonation (AoE burst)
                                                                        │ (HP <= 30%)
                                                                        ▼
                                                                 [ENRAGED: Phase 3]
                                                                        │
                                                    ┌───────────────────┴───────────────────┐
                                                    ▼                                       ▼
                                          [DEFEATED: Phase 4]                      [COLLAPSED / TIMEOUT]
                                           (Tiered Raid Cache)                      (Tear dissolved)
```

1. **`IDLE`**: No active raid encounter.
2. **`ANNOUNCING` (Beacon / Tear Destabilization)**: A 10-second warning banner broadcasts across the zone. World boss manifests on a designated arena tile.
3. **`ENGAGED` (Phase 1: Guardian Tactics, 100% → 60% HP)**: Normal combat rules apply with basic attack patterns and signature telegraphs.
4. **`BREAK_STAGGER` (Phase 2: Add Swarm & Aegis Barrier, 60% → 30% HP)**: Boss gains impenetrable barrier and channels an apocalyptic ritual. Raid adds spawn. Players must deplete the Break Gauge within 35 seconds.
5. **`ENRAGED` (Phase 3: Apex Enrage & Hazard Cascade, 30% → 0% HP)**: Boss enters enrage (+25% attack speed, +20% damage) with persistent arena hazards and elemental weather scaling.
6. **`DEFEATED`**: Boss is slain. Contribution score evaluates into a Tier (Bronze, Silver, Gold, Paragon), spawning a Raid Cache and opening the Victory Summary Modal.
7. **`COLLAPSED`**: If the 180-second raid timer expires or the player wipes/flees, the boss retreats and the event despawns without rewards.

---

## 2. World Boss Catalog & Combat Mechanics

### 2.1 World Boss Archetypes

| Boss ID | Name | Zone | Element | HP | Base ATK | Signature Mechanic |
|---|---|---|---|---|---|---|
| `voidmaw_sovereign` | Voidmaw Sovereign | Incursion / Rift | Void / Astral | 28,000 | 85 | Void Singularity pull, dimensional rifts, phase shifting |
| `caldera_colossus` | Caldera Colossus | `dragon_caldera` | Fire / Earth | 32,000 | 95 | Magma Fissure lines, falling meteor cataclysms, flame burst |
| `ancient_behemoth` | Ancient Behemoth | `whispering_woods` | Nature / Physical | 30,000 | 90 | Thorny Bramble hazard fields, crushing seismic shockwaves |

### 2.2 Break Gauge & Stagger System
- In Phase 2 (at $\le 60\%$ HP), the boss casts **Aegis Barrier**:
  - Direct damage to the boss is reduced to 0.
  - A Break Gauge appears with maximum resilience = $25\%$ of the boss's max HP (e.g. 7,000 – 8,000 Break HP).
  - 2–3 elemental adds spawn around the boss (e.g. `void_stalker` or `magma_beetle`). Each add alive grants the barrier $+15\%$ damage resistance.
  - **Player Objective**: Defeat adds and focus attacks onto the Break Shield before the 35-second timer runs out.
  - **Success (`Staggered`)**: Barrier shatters! Boss is stunned for 8 seconds, taking $+40\%$ bonus damage from all player attacks and skills.
  - **Failure (`Barrier Detonation`)**: Barrier unleashes an unavoidable arena pulse dealing $35\%$ player max HP as damage, and resumes combat without vulnerability.

### 2.3 Phase 3 Apex Enrage & Hazard Cascades
- Triggered immediately upon reaching $\le 30\%$ HP:
  - Attack speed increases by $+25\%$.
  - Damage increases by $+20\%$.
  - Periodically spawns lingering ground hazards (4-second lifespan, ticking every 800ms for $6\%$ max HP damage):
    - *Voidmaw Sovereign*: Void Puddle patches.
    - *Caldera Colossus*: Magma pools.
    - *Ancient Behemoth*: Toxic Spore fields.
  - **Weather Synergy**: If atmospheric weather matches the boss's element (e.g. `ashfall` for Caldera Colossus, `verdant_rain` for Ancient Behemoth, `stellar_drift` for Voidmaw Sovereign), boss elemental strikes gain $+25\%$ bonus intensity.

---

## 3. Contribution Scoring & Tiered Loot Engine

### 3.1 Contribution Scoring Metrics
During the raid encounter, the system tracks player performance metrics:
- **Direct Damage**: $+1$ point per 10 direct HP damage dealt.
- **Break Damage**: $+2$ points per 10 damage dealt to the Phase 2 Break Shield.
- **Add Disruption**: $+150$ points per summoned raid add eliminated.
- **Hazard Avoidance**: $+100$ bonus points per telegraphed hazard avoided without taking damage.

### 3.2 Contribution Tiers & Rewards

| Tier | Required Score | Zeny | Dimensional Shards | Apex Trophies | Runes & Cards | Feasts & Gems |
|---|---|---|---|---|---|---|
| **Bronze** | $0 - 2,499$ | 3,000 | 3 | 0 | 1× Common/Uncommon Rune | `grilled_trout` |
| **Silver** | $2,500 - 5,999$ | 6,000 | 5 | 0 | 1× Primal Rune | `smoked_salmon`, 1× Gem |
| **Gold** | $6,000 - 11,999$ | 12,000 | 8 | 1× `titan_heart` or `voidmaw_eye` | 2× Primal Runes, 25% Card Roll | 2× `smoked_salmon`, 2× Gems |
| **Paragon** | $\ge 12,000$ | 25,000 | 15 | 2× `titan_heart` or `voidmaw_eye` | 2× Primal Runes, 100% Boss Card Roll | 1× `golden_carp_sashimi`, 4× Gems |

---

## 4. Visual Effects & Strict Zero Screen Shake (`js/render/raids-fx.js`)

### 4.1 Visual Hierarchy & FX
- **Elemental Ground Auras**: Rotating concentric geometric rune circles under the boss matching elemental theme.
- **Aegis Barrier**: Translucent hexagonal energy dome with ripple refraction.
- **Apex Enrage Corona**: Orbiting fiery or void sparks and a radiant enrage symbol above the boss.
- **Stagger Burst**: Fractured glass particle explosion with floating star motes above the boss.

### 4.2 Geometric Telegraph Rendering
- **Linear Fissure**: `drawOrientedBoxTelegraph(ctx, ox, oy, tx, ty, len, width, progress, color)`
- **Apex Breath Cone**: `drawConeTelegraph(ctx, ox, oy, angle, radius, fov, progress, color)`
- **Cataclysm Ring**: `drawCircleTelegraph(ctx, cx, cy, radius, progress, color)`

### 4.3 Strict ZERO Screen Shake Invariant
- **Fundamental Rule**: `G.cam.x` and `G.cam.y` are **NEVER** modified, shaken, or displaced by any boss mechanic, slam, phase transition, barrier detonation, or enrage roar.
- Impact weight is conveyed exclusively via:
  1. Expanding concentric stroke rings (`ctx.arc` + `stroke`).
  2. Spring-scaled floating damage numbers (`floatText`).
  3. Dynamic audio sound effects (`AUDIO.playSfx`).
- Automated tests enforce `Object.freeze(G.cam)` during raid execution.

---

## 5. UX/UI Raid HUD & Victory Modal (`js/render/raids-ui.js`)

### 5.1 Top-Center Encounter HUD
- Positioned fixed at the top-center of the viewport:
  - Boss Title & Elemental Badge.
  - Multi-segmented HP bar with 60% and 30% phase dividers.
  - Break Shield gauge (rendered dynamically during Phase 2).
  - Real-time personal Contribution Score & Tier Badge (`[BRONZE]`, `[SILVER]`, `[GOLD]`, `[PARAGON]`).
  - Raid timer bar (180s countdown).

### 5.2 Victory Summary Modal & Boxing Containment
- Modal overlay (`.raid-victory-modal`) displayed on victory:
  - Animated Tier Crest (Bronze, Silver, Gold, Paragon).
  - Combat Performance Breakdown Grid (Damage, Break, Adds, Final Score).
  - Spoils Showcase (Zeny, Trophies, Shards, Runes, Cards, Feasts).
  - `[Claim Spoils]` primary action button.
- **Strict Boxing Containment Rules**:
  - `box-sizing: border-box;`
  - `width: 100%; max-width: 100%; min-width: 0;`
  - `overflow-x: hidden;`
  - Prevents horizontal scrollbars, text clipping, and modal overflow on all responsive viewport resolutions.

---

## 6. Content, Recipes & Pixel Art

### 6.1 New Items (`js/content.js`)
- `titan_horn`: Consumable summon horn to awaken an Overworld Apex Titan.
- `titan_heart`: Apex material from Caldera Colossus & Ancient Behemoth.
- `voidmaw_eye`: Apex material from Voidmaw Sovereign.
- `titan_pendant`: Legendary accessory granting $+250$ Max HP, $+15$ All Defenses, $+8\%$ Stagger Damage.
- `voidmaw_edge`: Legendary weapon granting $+45$ ATK, $+15\%$ Void Damage, $+5\%$ On-Hit Void Rift.

### 6.2 New Recipes (`CONTENT.recipes`)
- `r_titan_horn`: Mats: `dimensional_shard` ×5, `blessed_ore` ×2, `caldera_crystal` ×1, `star_iron` ×4. Cost: 500 Zeny.
- `r_titan_pendant`: Mats: `titan_heart` ×2, `star_iron` ×8, `essence_night` ×1. Cost: 2,500 Zeny.
- `r_voidmaw_edge`: Mats: `voidmaw_eye` ×2, `dimensional_shard` ×8, `blessed_ore` ×4. Cost: 3,000 Zeny.

### 6.3 Pixel Art Icons (`js/pixelart.js`)
- 16×16 matrices for `titan_horn`, `titan_heart`, and `voidmaw_eye`, mapped into `ITEM_ICON`.

### 6.4 Dual Bilingual Localization (`js/locale.js`)
- 100% complete English and Thai translations for all bosses, raid phases, mechanics, items, recipes, and UI strings.

---

## 7. Engine Integration & Persistence

### 7.1 Engine Hooks (`js/game.js`)
- Mounted on game state as `G.raidsSystem`, `G.raidsFx`, `G.raidsUI`, `G.raidState`.
- `window.__AWO` preserves exactly **255 keys** (no exports added or removed).
- Save/Resume persists raid cooldowns and titan beacon records in `awo_save_v1` (`world.raids`).
- Admin commands: `adminAction('spawnraid', { bossId })` and `adminAction('endraid')`.

---

## 8. Verification & Acceptance Criteria

1. **Unit Test Coverage**:
   - `js/raids.test.js`: State transitions, break gauge math, scoring, and loot generation.
   - `js/raids-fx.test.js`: Telegraph rendering, canvas drawing, offscreen culling, and camera invariance.
   - `js/raids-ui.test.js`: Top HUD rendering, victory modal markup, and boxing containment.
2. **Integration Test Suite**:
   - `js/raids-integration.test.js`: End-to-end combat simulation, incursion climax trigger, phase transitions, break stagger stun, contribution grading, spoils claiming, save/resume persistence, and zero screen shake.
3. **Engine Stability**:
   - `node js/engine-surface.test.js` passes with 255 keys.
   - `node js/locale.test.js` passes with 0 missing translations.
   - `npm test` passes all suites with exit code 0.
