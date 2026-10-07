# Design Specification: Phase 2 — Companion & Pet Familiars

**Author:** Prometheus / DeepMind Antigravity  
**Date:** 2026-10-07  
**Status:** Approved Architectural Spec  
**Target Architecture:** Zero-build plain ES-module browser RPG (`index.html` + `js/*.js`)

---

## 1. Executive Summary & Vision

Phase 2 of the Endgame Progression & Ecology Triad introduces **Companion & Pet Familiars** to *Aetheria Online*. Players can tame wild creatures across Aetheria by crafting specialized taming baits from the Gathering & Fishing ecosystem, bond with them through cooked feast feeding, and adventure alongside an animated Canvas 2D follower that provides passive auras and an auto-loot vacuum mechanic.

Per architectural requirements, implementation is strictly phased: **Core systems, math, content, and engine integration are implemented and tested first; UX/UI panels and window popups are implemented last.**

---

## 2. Core Constraints & Engine Invariants

1. **Strict ZERO Screen Shake:** Follower movement, taming fanfare, item vacuuming, and feeding emotes must NEVER modify or displace `G.cam.x` or `G.cam.y`. All visual effects are rendered purely as Canvas 2D drawing primitives.
2. **Surface Identity Preservation:** All 255 exported keys on `window.__AWO` must remain unchanged. New subsystems are exposed via `G.petsSystem` and `G.petsFx`.
3. **Save State Compatibility (`awo_save_v1`):** Pet data is serialized cleanly under `world.pets` (or `p.pets`) with safe default fallbacks for existing saves.
4. **Dual Bilingual Localization:** 100% parity across English (`en`) and Thai (`th`) for all companions, baits, recipes, UI strings, and notifications.
5. **Deterministic Testing:** All test suites must be flake-free and runnable in Node via `installBrowserEnv()`.

---

## 3. Companion Roster & Passive Auras

Five authorable companion archetypes span the progression zones:

| Companion ID | Name | Species Archetype | Target Wild Monster | Required Crafted Bait | Base Aura (Bond Lv1) | Max Aura (Bond Lv5) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `pet_slime` | **Gel Slime** | Nature / Starter | `slime` (Whispering Woods) | `bait_sweet_gelatin` | +5 HP Regen/s, +3% Move Speed | +25 HP Regen/s, +7% Move Speed |
| `pet_wolf` | **Timber Wolf Pup** | Beast / Woods & Ruins | `wolf`, `frost_wolf` | `bait_tender_jerky` | +6% Phys ATK, +4% Crit Chance | +18% Phys ATK, +10% Crit Chance |
| `pet_sprite` | **Blight Sprite** | Arcane / Ruin & Sky | `blight_sprite`, `void_wisp` | `bait_luminous_nectar` | +8% Magic ATK, +6 MP Regen/s, +5% Cast Spd | +20% Magic ATK, +20 MP Regen/s, +12% Cast Spd |
| `pet_bear` | **Glacial Bear Cub** | Frost / Tundra | `tundra_lurker`, `frost_revenant` | `bait_glacial_salmon` | +10% DEF, +12% Ice Res, +80 Max HP | +25% DEF, +25% Ice Res, +300 Max HP |
| `pet_dragon` | **Magma Hatchling** | Dragon / Caldera | `ember_imp`, `flame_dragon` | `bait_magma_fruit` | +10% Fire/Void DMG, +15% Crit DMG, +10% Zeny | +25% Fire/Void DMG, +35% Crit DMG, +25% Zeny |

### Devotion Status (Loyalty $\ge 80$)
When loyalty reaches 80/100, the companion attains **Devoted** status:
- $+10\%$ bonus multiplier to all aura stat values.
- Subtle golden sparkle halo orbiting the companion on Canvas.

---

## 4. Taming Mechanics

### In-Combat Taming Flow
1. **Targeting:** Player must have an active monster target (`G.target`) within **3.5 tiles** range.
2. **Health Threshold:** Target monster's HP must be **strictly below 30%** (`target.hp / target.maxHp < 0.30`).
3. **Bait Match:** The used bait must match the target monster's acceptable species catalog.
4. **Success Formula:**
   $$\text{Success Chance} = \text{clamp}\left(0.45 + (\text{LUK} \times 0.005) + \left(1 - \frac{\text{HP}\%}{0.30}\right) \times 0.20, \; 0.20, \; 0.90\right)$$
5. **Resolution:**
   - **Success:** Consumes bait, pacifies monster, awards companion to `G.pets.owned[petId]`. If no active companion is summoned, summons immediately. Plays quest/levelup chime.
   - **Failure:** Consumes bait, monster resists and briefly enrages (+10% ATK for 3s). Displays combat float text.

---

## 5. Feast Bonding & Progression

### Bond Levels & EXP Thresholds
- **Bond Lv 1:** 0 EXP (Auto-loot radius: 2.0 tiles)
- **Bond Lv 2:** 100 EXP (Auto-loot radius: 2.5 tiles)
- **Bond Lv 3:** 250 EXP (Auto-loot radius: 3.2 tiles, $+10\%$ bonus zeny looted)
- **Bond Lv 4:** 500 EXP (Auto-loot radius: 4.0 tiles)
- **Bond Lv 5 (Soulbound):** 1,000 EXP (Auto-loot radius: 5.0 tiles, $+20\%$ bonus zeny looted, $5\%$ chance to duplicate gathered/dropped materials)

### Feeding Feasts
Companions can be fed cooked meals crafted via Fishing & Alchemy:
- **Grilled Trout (`grilled_trout`):** $+15$ Loyalty, $+50$ Pet EXP.
- **Smoked Salmon (`smoked_salmon`):** $+25$ Loyalty, $+120$ Pet EXP.
- **Golden Carp Sashimi (`golden_carp_sashimi`):** $+50$ Loyalty, $+300$ Pet EXP.
- Action emits a floating heart emote (`♥`) drifting upwards above the follower entity.

---

## 6. Canvas Follower Simulation & Auto-Loot Dash (`js/render/pets-fx.js`)

### Kinematics
- Follower entity maintains world position `(pet.x, pet.y)` trailing the player at ~1.5 tiles distance.
- Uses spring-damped lerp for movement.
- Flips horizontally to match player movement facing direction.
- Sprites: 16×16 pixel art rendered directly to Canvas 2D.
- Idle bobbing cycle ($\sin(t \times 4)$) and walk cycle ($\sin(t \times 12)$).

### Auto-Loot Dash & Suction
- Hooked in `killMonster(m)`: when loot drops within the pet's pickup radius, the pet triggers **Auto-Loot Dash**.
- Pet zips toward corpse coordinates $(m.x, m.y)$ with a golden sparkle trail.
- Emits 4–6 inward suction motes and completes a celebratory vertical bounce.
- Zero screen shake invariant strictly preserved.

---

## 7. UX/UI Boxing Boundaries & Popup Modals (`js/render/pets-ui.js`)

Per user directive, UX/UI is isolated and implemented last, adhering to strict container boundaries:

### World Chronicle "Companions & Familiars" Tab
- Container: `.world-chronicle` tab `#chronicle-tab-companions`.
- Boundary rules:
  - `width: 100%; max-width: 100%; box-sizing: border-box; overflow-x: hidden;`
  - All grid/flex items use `min-width: 0;` to prevent layout blowouts.
- **Active Companion Showcase (Top):**
  - Pixel art avatar, bond tier badge, loyalty gauge, aura stat pills, Summon/Dismiss toggle.
  - Feast Quick-Feed Tray with one-click feeding.
- **Roster Grid (Bottom):**
  - Responsive 2-column grid of all 5 archetypes with taming bait requirements and wild habitats.

### Popup Modal Architecture (`.pet-modal-overlay`)
- Appended directly to `$('#overlays')` with `z-index: 70`.
- Modal Shell: `max-width: min(460px, 92vw); max-height: 85vh; overflow-y: auto; box-sizing: border-box;`.
- Focus Trapping: Focus cycled within modal via Tab/Shift+Tab; initial focus on close button.
- Light Dismiss: Closes cleanly on backdrop click or `Esc` key press.
- Pauses game combat ticks while modal is active.

---

## 8. Implementation Strategy (Logic First, UX/UI Last)

1. **Task 1: Core Pet Subsystem & Unit Tests** (`js/systems/pets.js`, `js/pets.test.js`)
2. **Task 2: Content Registration, Taming Baits, Pixel Icons & Bilingual Localization** (`js/content.js`, `js/pixelart.js`, `js/locale.js`)
3. **Task 3: Canvas Follower Entity, Vacuum Particle FX & Zero-Shake Renderer** (`js/render/pets-fx.js`, `js/pets-fx.test.js`)
4. **Task 4: Engine Integration, Taming Hook, Auto-Loot Hook, recompute() & Save Persistence** (`js/game.js`, `js/engine-surface.test.js`)
5. **Task 5: Companion Chronicle Tab & Modal UI with Boxing Containment** (`js/render/pets-ui.js`, `js/pets-ui.test.js`)
6. **Task 6: Comprehensive End-to-End Integration Suite & Documentation** (`js/pets-integration.test.js`, `CLAUDE.md`)
