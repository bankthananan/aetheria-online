# Project: Ragnarok Draconic Expansion

## Architecture
- Codebase structure:
  - `src/state.js`: Handles character, stats, promotions, and quest logic.
  - `src/database.js`: Defines maps, monsters, items, classes, skills, and quests.
  - `src/engine.js`: Handles map rendering, movement, combat, visual effects, and particle spawning.
  - `src/ui.js`: Renders the HTML UI panels, equipment grid, hotkeys, and inventory.
  - `src/audio.js`: Handles chiptune synthesis and SFX.
- Integration points:
  - Mounts: Add mount equipping / toggling logic. Recalculate stats like movement speed, DEF, Max HP, and attack multipliers.
  - Class Promos: Tier 3 Peak ascension (Dragon Knight, Wyvern Hunter, Dragon Shaman).
  - Maps: Add "Volcanic Hatchery" and "Dragon Peak" to BIOMES.
  - SFX/BGM: Audio synthesizers for dragon roars, fire breaths, and chiptune map BGMs.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | R1: Dragon Mounts & Skills | Add dragon egg item, hatching logic, mount state/toggle, and mounted active skills | None | DONE |
| 2 | R2: Class Ascension | Create Dragon Knight, Wyvern Hunter, Dragon Shaman promotions and dragon hunt trial quest | M1 | DONE |
| 3 | R3: Maps & Nests | Implement Volcanic Hatchery & Dragon Peak biomes, custom obstacles, MVP bosses, and card drops | M1, M2 | PLANNED |
| 4 | R4: Synth Audio | Synthesize dragon SFX and compose chiptune loops for the new maps | M3 | PLANNED |
| 5 | Verification & E2E | Implement verification script src/test_draconic.js and run E2E test suite | M1, M2, M3, M4 | PLANNED |

## Interface Contracts
### Mount System (R1)
- `GameState.character.equipment.mount`: stores active mount item ID (e.g. `fire_drake`, `wind_wyvern`, `earth_wyrm`) or null.
- `GameState.character.mounted`: boolean indicating if the player is currently mounted.
- Active skills: `dragon_breath`, `mounted_barrage`, `draconic_shield`. Enforce mount checking in `castSkill`.

### Class Promo (R2)
- Target class IDs: `dragon_knight`, `wyvern_hunter`, `dragon_shaman`.
- Requires base level 75, job level 50, and quest token `dragon_hunt_trial_proof` (or completed quest).
- Custom modifiers for dragon slayer classes against dragon-type monsters (+50% dmg dealt, -30% dmg received).

### Biomes & Nests (R3)
- Biome IDs: `volcanic_hatchery`, `dragon_peak`.
- MVP Monster IDs: `red_fire_dragon`, `golden_drake`.
- Card IDs: `red_dragon_card`, `golden_drake_card`.

### Synth Audio (R4)
- New SFX: `dragon_roar`, `fire_breath`.
- New BGM: `volcanic_hatchery_bgm`, `dragon_peak_bgm` or mapped theme keys.
