# Aetheria Online — Player Class & Job Visual Model Evolution Specification

**Date:** 2026-10-16  
**Target Surface:** Active Zero-Build ES-Module Game (`index.html` + `js/*.js`)  
**Core Mandate:** Every base class (10), Tier-2 job branch (20), Tier-3 advanced job (20), and Tier-4 hybrid job (9) has a distinct, recognizable visual model on the world canvas and across UI character/promotion surfaces. Strict ZERO screen shake; 100% bilingual (`en`/`th`) parity; full save & `__AWO` compatibility.

---

## 1. Problem Analysis & Current Gaps

1. **Duplicate Base Class Spritesheets in `js/lpc.js`:**
   - Currently, `assassin` reuses `assets/lpc/blade.png`, `necromancer` reuses `assets/lpc/mage.png`, and `artificer` reuses `assets/lpc/ranger.png` without palette or silhouette differentiation.
2. **Zero Visual Progression Across Job Promotions (`Tier 1 → Tier 2 → Tier 3 → Tier 4`):**
   - `drawPlayer(p, cx, cy)` only checks `p.combatClass`. Promoting to a Second Job (e.g., *Rift Knight* vs *Rift Reaver*), Third Job (*Voidcleaver Lord* vs *Aegis Paragon*), or Hybrid Job (*Dreadnought*, *Spellblade*, *Eldritch Netherlord*) never changes the character's appearance, armament, headgear, cloak, or aura.
3. **Missing Visual Previews in Character & Promotion UI:**
   - The **Status (`C`)** window has no character model showcase.
   - The **Job Promotion Modals (`showJobChoice` / `showAdvancedJobChoice`)** and **Skill Manual (`K`)** do not display the visual model of each specialization.

---

## 2. Architecture: `js/render/player-models.js`

We will introduce a dedicated, self-contained visual module `js/render/player-models.js` (paired with `js/player-models.test.js`) that resolves any player state (`classId`, `combatClass`, `tierIndex`, `jobBranchId`, `advancedJobId`, `hybridJobId`, `equip`) into a complete **Visual Model Descriptor** (`resolvePlayerVisualModel(p)`):

### 2.1 Visual Model Descriptor Schema
```js
{
  modelId: 'voidcleaver_lord',     // canonical visual archetype ID
  tierIndex: 2,                    // 0 = Base, 1 = Second Job, 2 = Third Job, 3 = Hybrid
  combatClass: 'blade',
  title: 'Voidcleaver Lord',
  palette: {
    primary: '#c57ee8',            // main armor / robe trim
    secondary: '#2b1640',          // deep mantle / inner cloth
    accent: '#ffd24d',             // crest / weapon edge glow
    aura: 'rgba(197, 126, 232, 0.45)',
  },
  regalia: {
    headgear: 'void_horned_helm',  // crown, hood, helm, visor, halo, circlet, cowl, etc.
    mantle: 'void_tattered_cape',  // cape, seraph_wings, mech_pack, bone_mantle, scarf, etc.
    mainhand: 'void_greatsword',   // weapon silhouette
    offhand: 'paradox_sigil',      // shield, dagger, tome, flask, phylactery, etc.
    auraStyle: 'rift_crest',       // none (T1), branch_ring (T2), ascendant_halo (T3), hybrid_orbit (T4)
  },
  lpcTint: null | { hueRotateDeg, saturate, brightness }, // distinct sheet tinting for Assassin/Necromancer/Artificer & job branches
}
```

### 2.2 Complete Coverage Matrix (59 Visual Archetypes)
| Base Class (T1) | Second Job Branches (T2) | Third Job Advanced (T3) | Hybrid Ascendant (T4) |
| :--- | :--- | :--- | :--- |
| **Reborn Blade** (`blade`) | `rift_knight` (Tower Shield + Blue Plume), `rift_reaver` (Twin Violet Blades) | `voidcleaver_lord` (Void Horned Helm + Rift Greatsword), `aegis_paragon` (Golden Fortress Crest + Grand Aegis) | `dreadnought` (Colossus Juggernaut Plate + Siege Cleaver) |
| **Drifter** (`berserker`) | `bladewind` (Wind Scarf + Twin Curved Sabers), `blood_marauder` (Spiked Pauldrons + Executioner Axe) | `tempest_reaper` (Cyclone Mantle + Storm Greatscythe), `crimson_sovereign` (Blood Crown + Gore Greataxe) | `spellblade` (Runic Mantle + Enchanted Dual-Edge) |
| **Codeweaver** (`mage`) | `rune_compiler` (Solar Circlet + Floating Grimoire), `frost_scribe` (Glacial Tiara + Cryo Rod) | `reality_debugger` (Matrix Halo + Reality Staff), `absolute_architect` (Crystalline Crown + Frost Monolith Orb) | *(shares `spellblade` / `arcane_archer` / `eldritch_lord`)* |
| **Far Shot** (`ranger`) | `sky_piercer` (Hawkeye Visor + Longbow), `wild_warden` (Feathered Hood + Spirit Falcon Crest) | `worldbane_sniper` ( Astral Sight Hood + Greatbow), `starhawk_warden` (Emerald Mantle + Starhawk Companion Crest) | `arcane_archer` (Aether Quiver + Runic Longbow) |
| **Lightbringer** (`paladin`) | `dawnguard` (Winged Diadem + Sacred Kite Shield), `sunblade` (Solar Halo + Flaming Broadsword) | `seraph_warden` (Luminous Seraph Wings + Sanctuary Mace), `solar_justicar` (Radiant Sun-Crown + Judgment Lance) | `vanguard` (Sacred Aegis Plate + Radiant Halberd) |
| **Iron Fist** (`monk`) | `ki_adept` (Dragon Headband + Golden Ki Cestus), `stone_disciple` (Earth Prayer Beads + Stone Gauntlets) | `grandmaster` (Celestial Halo + Twin Dragon Orbs), `adamant_sage` (Monolith Mantle + Jade Titan Grips) | `chi_tempest` (Lotus Lightning Chakram + Storm Sash) |
| **Stormcaller** (`elementalist`) | `tempest_mage` (Thunder Crest + Lightning Scepter), `pyroclast` (Ember Horns + Magma Fokus) | `archon_of_storms` (Fulminating Crown + Storm Caller), `cinder_archon` (Volcanic Mantle + Solar Pyre Staff) | `storm_templar` (Thunder Aegis + Divine Storm Hammer) |
| **Shadow Blade** (`assassin`) | `nightstalker` (Venom Mask + Twin Kris Daggers), `phantom_blade` (Mirage Veil + Reverse-Grip Katars) | `shadow_sovereign` (Umbral Crown + Executioner Twin-Blades), `void_stalker` (Abyssal Hood + Rift Chakrams) | `nightblade_phantom` (Eclipse Shroud + Void Phantom Blades) |
| **Soul Binder** (`necromancer`) | `dread_summoner` (Skull Tiara + Bone Totem), `plague_harbinger` (Blight Hood + Censer Lantern) | `abyssal_lich` (Phylactery Arch-Crown + Lich Staff), `nether_knight` (Deathguard Helm + Nether Greatscythe) | `eldritch_lord` (Eldritch Eye Crown + Abyssal Grimoire) |
| **Artificer** (`artificer`) | `clockwork_engineer` (Brass Goggles + Servo Wrench), `mad_alchemist` (Plague Goggles + Volatile Bandolier) | `magitek_mechlord` (Mechlord Visor + Dual Shoulder Cannons), `grand_alchemist` (Philosopher Crown + Aether Alembic) | `quantum_technomancer` (Quantum Halo + Orbitalizer Core) |

---

## 3. World Canvas & UI Rendering Integration

1. **In-World Canvas Regalia & Silhouette Renderer (`drawPlayerJobRegalia(ctx, p, px, py, animState)`):**
   - Renders directional **Back Mantle** (behind the character when facing down/left/right, in front when facing up), **Tier Ground Sigil** (under the feet for Tier 2/3/4), **Headgear/Crown/Visor** (tracked to head bob during walk/idle/attack), and **Weapon/Offhand Job Accents**.
   - Preserves the exact deterministic `engine-surface.test.js` fingerprint for default `tierIndex === 0` `blade` startup state while making every class and job promotion visually unmistakable in live play.
2. **Procedural 24×24 Evolved Job Pixel Portrait Generator (`renderJobPortraitDataURL(modelDescriptor)`):**
   - Generates crisp, high-contrast 16-bit pixel-art portraits for all 59 job archetypes (combining class base silhouette with branch palette, headgear, mantle, and weapon pixels).
3. **UI Surfaces Enhanced:**
   - **Status Panel (`C`)**: Adds a **Hero Model Card** in `.st-head` showing the live evolved job sprite, active Regalia badges (`Headgear · Mantle · Armament`), and tier evolution preview buttons (`Tier I` / `Tier II` / `Tier III` / `Tier IV`) so players can preview their hero's appearance at every stage.
   - **Job Choice Modals (`showJobChoice` & `showAdvancedJobChoice`)**: Displays each branch's evolved portrait on its selection card.
   - **Skill Manual (`K`)**: Displays the current chapter's job portrait in the manual header.
