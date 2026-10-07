# Design Specification: The Abyssal Spire (Endless 100-Floor Challenge Tower & Ascendance)

**Date:** 2026-10-07  
**Module:** Module 1 of "The Sovereign Realm" Expansion  
**Status:** Approved for Implementation Planning  
**Target Systems:** `js/systems/spire.js`, `js/render/spire-fx.js`, `js/render/spire-ui.js`, `js/game.js`, `js/content.js`, `js/pixelart.js`, `js/locale.js`, `js/maps.js`  

---

## 1. Executive Summary & Vision

The **Abyssal Spire** is a 100-floor roguelite endgame challenge tower designed to test the player's min-maxed builds, runes, relics, monster cards, and companion familiars. Expanding beyond the original 1-room Celestial Rift arena, the Spire delivers an escalating, multi-biome ascent structured into 5 thematic tiers with dynamic environmental floor affixes, checkpoint elevators every 10 floors, milestone boss battles, and a dedicated Spire Emblems economy offering prestige titles, relics, and class transmog skins.

---

## 2. Floor Architecture & Progression Mechanics

### 2.1 The 5 Biome Tiers (20 Floors Each)
The 100 floors are partitioned into 5 ascending atmospheric biomes, each featuring distinct arena color palettes, ambient particles, and curated monster pools:

| Tier | Floors | Biome Name | Theme / Color Palette | Monster Pool | Level Band |
| :--- | :---: | :--- | :--- | :--- | :---: |
| **Tier 1** | 1–20 | **Shadow Depths** | Deep Obsidian & Violet (`#4a148c`) | Shadow creeps, Cavern crawlers, Dryads, Leeches | Lv 40–50 |
| **Tier 2** | 21–40 | **Glacial Ascent** | Sub-zero Frost Crystal (`#0277bd`) | Frost wolves, Rime harpies, Ice wraiths, Tundra lurkers | Lv 50–60 |
| **Tier 3** | 41–60 | **Magma Foundry** | Volcanic Brimstone (`#d84315`) | Ember imps, Magma beetles, Ashwings, Sand stalkers | Lv 60–70 |
| **Tier 4** | 61–80 | **Storm Spires** | Ionized Crackling Ozone (`#f57f17`) | Zephyr hawks, Storm elementals, Tempest wisps, Zenith wardens | Lv 70–80 |
| **Tier 5** | 81–100 | **Void Zenith** | Cosmic Singularity (`#212121`) | Void stalkers, Star reavers, Astral knights, Rift mantas | Lv 80–99+ |

### 2.2 Permanent Checkpoint Elevators
1. **Milestone Checkpoints:** Conquering a milestone floor (Floor 10, 20, 30, 40, 50, 60, 70, 80, 90) permanently unlocks the corresponding starting elevator checkpoint:
   - Floor 1 (Default)
   - Floor 11 (Requires Floor 10 Cleared)
   - Floor 21 (Requires Floor 20 Cleared)
   - Floor 31 (Requires Floor 30 Cleared)
   - Floor 41 (Requires Floor 40 Cleared)
   - Floor 51 (Requires Floor 50 Cleared)
   - Floor 61 (Requires Floor 60 Cleared)
   - Floor 71 (Requires Floor 70 Cleared)
   - Floor 81 (Requires Floor 80 Cleared)
   - Floor 91 (Requires Floor 90 Cleared)
2. **Elevator Navigation:** Accessible via the Spire Portal Terminal in Town of Awakening and the Spire Antechamber map. Players select any unlocked checkpoint to begin an ascent run.
3. **Session Run State:** Tracks `currentFloor`, `activeAffixes`, `spireEmblemsEarned`, `highestFloorEver`, and `activeRun`.

### 2.3 Monster Stat Scaling Formula
Floor monsters scale exponentially based on the floor level:
$$\text{HP}_{\text{floor}} = \text{BaseHP} \times (1 + (\text{floor} - 1) \times 0.08) \times (\text{isBoss} ? 3.5 : 1.0)$$
$$\text{ATK}_{\text{floor}} = \text{BaseATK} \times (1 + (\text{floor} - 1) \times 0.04)$$
$$\text{DEF}_{\text{floor}} = \text{BaseDEF} \times (1 + (\text{floor} - 1) \times 0.025)$$

---

## 3. Dynamic Floor Affixes (8 Modifiers)

Floors 1–40 roll **1 random affix**; Floors 41–100 roll **2 random affixes**:

| Affix ID | Name | Icon | Mechanics |
| :--- | :--- | :---: | :--- |
| `magma_surge` | Magma Surge | 🌋 | Ground fissures erupt beneath the player every 8s dealing 12% Max HP damage if un-dodged. |
| `glacial_chill` | Glacial Chill | ❄️ | Continuous movement slows player Haste and Cast Speed by 15% (rewards rhythmic stutter-stepping). |
| `mana_drain` | Mana Drain | 🔮 | Skill MP cost increased by +25%; defeated monsters release restorative mana motes (+20 MP). |
| `sunder_mist` | Sunder Mist | 🌫️ | Atmospheric fog reduces physical and magical DEF of both players and monsters by 20%. |
| `berserk_foes` | Berserk Foes | 💢 | Monsters below 50% HP gain +30% attack speed and +25% attack power. |
| `kinetic_reflect` | Kinetic Reflect | 🛡️ | Monsters reflect 5% of direct damage back to the attacker as true damage. |
| `graviton_well` | Graviton Well | 🌀 | Arena singularity pulls all combatants towards the center for 2.5s every 12s. |
| `chrono_haste` | Chrono Haste | ⚡ | Skill cooldowns for all entities recover 30% faster (high-speed chaos combat). |

---

## 4. Milestone Boss Encounters (Every 10 Floors)

Milestone floors pit players against formidable boss entities:

1. **Floor 10:** Corrupted Treant (`corrupted_treant_boss`) — Nature barrier and root slam.
2. **Floor 20:** Abyssal Siren & Ruin Golem Duo — Tidal charm waves and seismic tremors.
3. **Floor 30:** Frost Revenant Alpha (`frost_alpha_boss`) — Glacial freeze nova.
4. **Floor 40:** Glacial Dragon Shade — Sub-zero frost breath cone.
5. **Floor 50:** Caldera Colossus Avatar — Magma fissures and +200 Spire Emblems. Grants **Spire Challenger** (*ผู้ท้าชิงแห่งยอดหอคอย*) title.
6. **Floor 60:** Magma Lord Ignis — Consecration lava pools.
7. **Floor 70:** Zenith Tempest Warden — Chain lightning arcs and wind vortex.
8. **Floor 80:** Twin Storm Elementals — Ionized cross-combos and dual charges.
9. **Floor 90:** Dimensional Herald Sovereign — Void decay patches and phantom clones.
10. **Floor 100:** Primordial Nullking & Void Singularity — The ultimate challenge of Aetheria. Grants **Abyssal Sovereign** (*จอมราชันย์แห่งอบิส*) title and Apex Trophy cache.

---

## 5. Spire Economy, Reliquary & Transmog Rewards

### 5.1 Currency: Spire Emblems (`spire_emblem`)
- Non-boss floors award **1–3 Spire Emblems**.
- Milestone floors award **10–25 Spire Emblems**.
- First-time milestone clear bonus: **+50 Emblems** directly to player currency inventory.

### 5.2 Spire Archon Reliquary (`CONTENT.items`)
Exchanged with the Spire Archon vendor (`npc_spire_archon`):

#### New Relics & Accessories
- `crown_of_the_ascendant`: Legendary Relic (Cost: 250 Emblems). Effect: $+15\%$ damage dealt in Spire & Dungeons, $+10\%$ all elemental resistances.
- `abyssal_compass`: Epic Relic (Cost: 150 Emblems). Effect: $+15\%$ Flee, $+10\%$ Movement Speed, reveals monster elemental weaknesses on UI.
- `spire_sigil`: Epic Accessory (Cost: 100 Emblems). Stats: $+220$ Max HP, $+16$ Physical/Magical ATK, $+14$ DEF.

#### Ascendant Transmog Weapons (Cosmetic Weapon Skins)
- `spire_blade`: Reborn Blade / Sword (Cost: 120 Emblems)
- `spire_scythe`: Drifter / Scythe (Cost: 120 Emblems)
- `spire_greatsword`: Paladin / Greatsword (Cost: 120 Emblems)
- `spire_staff`: Codeweaver / Staff (Cost: 120 Emblems)
- `spire_bow`: Far Shot / Bow (Cost: 120 Emblems)
- `spire_knuckles`: Iron Fist / Knuckles (Cost: 120 Emblems)

---

## 6. Canvas Visuals & Strict Zero Screen Shake Invariant

### 6.1 Canvas 2D Effects (`js/render/spire-fx.js`)
- `drawSpireAffixFx(ctx, activeAffixes, cam, now)`: Ambient ground shaders (rising cinder particles for `magma_surge`, snowflake drifts for `glacial_chill`, purple fog for `sunder_mist`, inward particle lines for `graviton_well`).
- `drawAscendancePortal(ctx, portalPos, cam, now)`: Glowing dimensional portal appearing upon floor clear with expanding concentric stroke rings.
- `drawMilestoneBossFanfare(ctx, bossEntity, cam, now)`: Pulsating boss alert crest and glowing warning ring.

### 6.2 Strict ZERO Screen Shake
- **Camera Invariant:** `G.cam.x` and `G.cam.y` are **NEVER** modified, shaken, or displaced by floor clears, boss slams, or affix eruptions.
- Impact weight is conveyed exclusively via:
  1. Concentric stroke rings (`ctx.arc` + `stroke`).
  2. Spring-scaled floating text (`floatText`).
  3. Dynamic Web Audio cues (`AUDIO.playSfx`).
- Automated tests enforce `Object.freeze(G.cam)`.

---

## 7. UX/UI Encounter HUD & Checkpoint Elevator Modal

### 7.1 Top Encounter HUD
- Positioned fixed at the top of the viewport during an active run:
  - Floor Number & Biome Tag: e.g. `Floor 45 / 100 [Magma Foundry]`.
  - Active Affix Badges with tooltips: `[🌋 Magma Surge]`, `[⚡ Chrono Haste]`.
  - Remaining monster headcount counter.
  - Spire Emblems tally counter.

### 7.2 Checkpoint Elevator Modal (`.spire-elevator-modal`)
- Full modal overlay with responsive shell:
  - Checkpoint Floor selection grid: Floor 1, 11, 21, 31, 41, 51, 61, 71, 81, 91.
  - Locked floors displaying lock icons and requirement badges (`Requires F20 Cleared`).
  - `[Ascend]` primary button to initiate run at the chosen checkpoint.
  - Close button `[✕]`.

### 7.3 Strict Boxing Containment Rules
- Every container, grid, and modal element must enforce:
  ```css
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  overflow-x: hidden;
  ```
- Elevator modal shell enforces `max-width: 520px; max-height: 90vh; overflow-y: auto; overflow-x: hidden;`.
- Prevents horizontal scrollbars and modal overflow across all responsive screen resolutions.

---

## 8. Engine Integration & Save Persistence

### 8.1 Engine Wiring (`js/game.js`)
- Subsystem mounted under game state as:
  - `G.spireSystem`: Instance of `createSpireSystem()`.
  - `G.spireFx`: Instance of `createSpireRenderer()`.
  - `G.spireUI`: Instance of `createSpireUIRenderer()`.
  - `G.spireState`: Active run state object.
- Step updates in `step(dt)`: updates affix timers, portal animations, and clear checks.
- Admin hooks: `adminAction('spirefloor', { floor })` and `adminAction('spireclear')`.
- Hardcoded **255 keys preserved on `window.__AWO`** (`node js/engine-surface.test.js`).

### 8.2 Save/Resume Persistence (`awo_save_v1`)
- Stored cleanly in `world.spire`:
  ```json
  {
    "highestFloor": 50,
    "unlockedCheckpoints": [1, 11, 21, 31, 41, 51],
    "emblems": 185,
    "unlockedTitles": ["title_spire_challenger"],
    "activeRun": null
  }
  ```
- Timed or active floor runs reset cleanly to the last elevator checkpoint upon session disconnect.

---

## 9. Dual Bilingual Localization (`js/locale.js`)

100% complete English (`en`) and Thai (`th`) translations:
- **Biomes:** Shadow Depths (*ห้วงลึกแห่งเงามืด*), Glacial Ascent (*เส้นทางน้ำแข็งสูงชัน*), Magma Foundry (*โรงหลอมแมกมา*), Storm Spires (*ยอดหอคอยสายฟ้า*), Void Zenith (*จุดสูงสุดแห่งความว่างเปล่า*).
- **Affixes:** Magma Surge (*คลื่นแมกมาพวยพุ่ง*), Glacial Chill (*ความเย็นยะเยือก*), Mana Drain (*สูบกลืนมานา*), Sunder Mist (*หมอกสลายเกราะ*), Berserk Foes (*ศัตรูคลุ้มคลั่ง*), Kinetic Reflect (*สะท้อนแรงปะทะ*), Graviton Well (*หลุมแรงโน้มถ่วง*), Chrono Haste (*ความเร่งกาลเวลา*).
- **Titles:** Spire Challenger (*ผู้ท้าชิงแห่งยอดหอคอย*), Abyssal Sovereign (*จอมราชันย์แห่งอบิส*).
- **Items & UI Strings:** Full bilingual parity verified in `js/locale.test.js`.

---

## 10. Acceptance Criteria & Test Strategy

1. **Unit Tests (`js/spire.test.js`):**
   - 100-floor scaling math, biome configurations, checkpoint unlock triggers, affix selection, roster generation, and serialization.
2. **Visual & FX Tests (`js/spire-fx.test.js`):**
   - Affix particle shaders, portal rendering, boss alert fanfare, and strict camera invariance (`Object.freeze(G.cam)`).
3. **UX/UI Tests (`js/spire-ui.test.js`):**
   - Top HUD rendering, elevator modal generation, checkpoint lock status, and strict boxing CSS containment assertions.
4. **End-to-End Integration Suite (`js/spire-integration.test.js`):**
   - Checkpoint selection, 10-floor climb, milestone boss encounter, affix hazard dodges, Spire Emblem accumulation, shop purchasing, and save/resume persistence.
5. **Quality Gates:**
   - Exact 255 keys on `window.__AWO` (`node js/engine-surface.test.js`).
   - 100% localization match (`node js/locale.test.js`).
   - All repository test suites pass (`npm test`).
