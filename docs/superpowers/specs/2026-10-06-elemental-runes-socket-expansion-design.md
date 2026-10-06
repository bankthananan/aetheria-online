# Elemental Rune Socketing, Socket Expansion & Weapon Infusion System Design Specification

## Overview

The **Elemental Rune Socketing, Socket Expansion & Weapon Infusion System** deepens character customization and elemental combat in Aetheria Online. Players can expand equipment sockets up to a maximum cap of 4 sockets per item through Blacksmith Refinement, and inscribe primal Elemental Runes (Fire, Ice, Lightning, Nature, Holy, Void) into weapons, armor, and accessories to infuse basic attacks with elemental properties, trigger weakness multipliers, and activate dynamic weather affinity synergies.

---

## 1. Design Goals & Principles

1. **Strategic Build Variety:** Allow players of all classes to specialize in elemental affinities and counter specific monster types.
2. **Dynamic Weather Synergy:** Directly bridge weapon attacks with the active atmospheric weather system (e.g., Lightning infusion surging during Verdant Downpour).
3. **Meaningful Resource Sinks:** Give players compelling long-term uses for Zeny, Beast Fangs, Shade Dust, Star Iron, and Blessed Ore via socket expansion.
4. **Strict Zero Screen Shake:** Camera shake is 0% engine-wide. Elemental attack procs, crits, and surges use crisp 16-bit retro canvas particles and floating combat text without camera trauma.
5. **Surface & Save Stability:** Preserve all 255 keys on `window.__AWO` and maintain full backward compatibility with `awo_save_v1`.

---

## 2. Socket Expansion System (Blacksmith Socket Punching)

### Mechanics
- Existing equipment retains their initial dropped sockets rolled from `SOCKET_BOUNDS`.
- Any weapon, armor, or accessory with fewer than **4 sockets** (`inst.sockets.length < 4`) can be expanded at the Blacksmith (`expandSockets(itemUid)`).
- When expanded, a new empty socket (`null`) is appended to `inst.sockets`.
- **Refinement Costs:**
  - 1st socket addition: 1,500 Zeny + 5 Beast Fang (`wolf_fang`) / Shade Dust (`shade_dust`)
  - 2nd socket addition: 3,500 Zeny + 10 Star Iron (`star_iron`)
  - 3rd / 4th socket addition: 7,500 Zeny + 2 Blessed Ore (`blessed_ore`)
- Hard cap: No item may exceed 4 sockets.

---

## 3. Elemental Runes Catalog

Six primal runes are added to the game database (`js/content.js`), socketable via `socketGem(uid, idx, runeId)`:

| Rune Item | ID | Element | In Weapon (Infusion) | In Armor / Acc (Warding) | Value | Color |
|:---|:---|:---|:---|:---|:---|:---|
| **Ember Rune** | `rune_ember` | 🔥 Fire | Basic attack becomes **Fire**; +15% Fire DMG; 15% Burn proc. | +12% Fire Resistance, +25 Max HP. | 120 | `#ff6b4a` |
| **Glacial Rune** | `rune_glacial` | ❄️ Ice | Basic attack becomes **Ice**; +15% Ice DMG; 20% Chilling Slow. | +12% Ice Resistance, +8 DEF. | 120 | `#64c8ff` |
| **Storm Rune** | `rune_storm` | ⚡ Lightning | Basic attack becomes **Lightning**; +15% Lightning DMG; 10% Shock stun proc. | +12% Lightning Resistance, +6 Flee. | 120 | `#ffd24d` |
| **Verdant Rune** | `rune_verdant` | 🌿 Nature | Basic attack becomes **Nature**; +15% Nature DMG; Poison DOT on hit. | +12% Nature Resistance, +3% HP Regen. | 120 | `#66dd66` |
| **Luminous Rune** | `rune_luminous` | ✨ Holy | Basic attack becomes **Holy**; +15% Holy DMG; +8% Lifesteal vs Void/Undead. | +12% Holy Resistance, +5% Healing. | 150 | `#fff080` |
| **Umbral Rune** | `rune_umbral` | 🌑 Void | Basic attack becomes **Void**; +15% Void DMG; +10% Armor Penetration. | +12% Void Resistance, +5% Crit DMG. | 150 | `#ba68c8` |

---

## 4. Weapon Infusion & Combat Synergies

### Infusion Resolution (`attackElement(p, sk)`)
1. If a skill `sk` is specified and has an intrinsic element (`skillElement(sk) !== 'physical'`), it retains its intrinsic element.
2. If Paladin weapon buff `imbueElement(p)` is active, it takes priority.
3. If basic attack (or physical skill) and the equipped weapon has an elemental rune socketed (`getWeaponRuneElement(p.equip.weapon)`), `attackElement()` returns that rune's element.
4. Otherwise, falls back to `'physical'`.

### Combat Interactions
- **Weakness Multiplier:** Infused attacks against enemies weak to that element deal **1.5× damage** and display floating **`WEAK!`** text.
- **Weather Surge Multiplier:** Infused attacks matching active map weather (e.g. Storm Rune during Verdant Downpour) receive the weather affinity multiplier (e.g. **1.2× damage**) and display floating **`SURGE!`** text.
- **On-Hit Status Effects:**
  - Fire: 15% chance to inflict `burn` status.
  - Ice: 20% chance to inflict `slow` status.
  - Lightning: 10% chance to inflict `stun` status.
  - Nature: 15% chance to inflict `poison` status.

---

## 5. UI & Visual Feedback

1. **Socket Dots Display (`socketDotsHtml`):**
   - Renders 1–4 colored dots under the item in inventory and paper-doll views.
   - Traditional Gems: Ruby (Red), Sapphire (Blue), Emerald (Green).
   - Primal Runes: Fire (Orange), Ice (Cyan), Lightning (Yellow), Nature (Green), Holy (Gold), Void (Purple).
2. **Refine Panel Expansion Button:**
   - Under Refine / Blacksmith view: gear cards with `< 4` sockets display an `[Expand Socket (N/4)]` action button with required materials and Zeny.
3. **Weapon Infusion Aura:**
   - Subtle 1-pixel colored aura pulse around equipped weapon icon in HUD and character sheet.
4. **Strict Zero Screen Shake:**
   - Hit impacts, rune status procs, and elemental surges never trigger camera movement.

---

## 6. Architecture & Implementation Plan

### Modules
- **`js/systems/runes.js`**: Pure subsystem managing rune catalog, socket queries, infusion resolution, socket expansion costs, and validation.
- **`js/content.js`**: Add 6 rune items with `gem: { isRune: true, element: '...', ... }`.
- **`js/game.js`**: Wire `attackElement` weapon rune check, add `expandSockets(uid)`, update Blacksmith UI, update `socketDotsHtml`, and persist in save state.
- **`js/locale.js`**: Thai and English translations for all rune names, descriptions, and UI prompts.

---

## 7. Verification Plan

1. **Unit Tests (`js/runes.test.js`):**
   - Test rune catalog queries, socket expansion rules, cost validation, and maximum socket clamp (cap 4).
   - Test `getWeaponRuneElement()` resolution.
2. **Integration Tests (`js/runes-integration.test.js`):**
   - Live engine test equipping weapon with socketed rune.
   - Test basic attack converting to rune element.
   - Test damage amplification against weak monsters and under matching weather.
   - Test Blacksmith socket expansion from 1 socket up to 4 sockets with item/Zeny consumption.
3. **Regression Tests:**
   - `node js/engine-surface.test.js`: verify 255 keys on `window.__AWO` preserved and render hashes unchanged.
   - Full suite `npm test` passing (44+ suites).
