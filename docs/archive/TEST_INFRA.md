# Ragnarok RPG Test Infrastructure

This document describes the testing infrastructure, guidelines, and execution procedures for the Ragnarok retro RPG project, with a specific focus on the Draconic Expansion.

## Overview
The testing architecture supports running tests in a headless Node.js environment by providing mock browser globals (DOM, Canvas, AudioContext, localStorage).

## Key Principles & Best Practices

### 1. Handling Floating-Point Precision Errors
JavaScript uses IEEE 754 double-precision floats, which leads to precision losses (e.g., `100 * 1.15` evaluates to `114.99999999999999`). 
- **Rule**: Never use strict equality (`assert.strictEqual`) on values that have undergone floating-point multiplication and subsequent rounding (like `Math.floor`).
- **Solution**: Use delta-based comparisons or rounded checks:
  ```javascript
  // For raw floating point checks
  assert.ok(Math.abs(actual - expected) < 0.001, `Expected ${expected}, got ${actual}`);

  // For integer-based damage checks
  const damageDealt = initialHp - target.hp;
  assert.ok(damageDealt === 104 || damageDealt === 105, `Damage dealt (${damageDealt}) out of expected range`);
  ```

### 2. Environment Mocking
Since the game engine targets a browser context, the test runner must inject mock globals:
- **`window` / `webkitAudioContext`**: Mocks audio synthesis nodes to prevent `AudioContext is not defined` errors.
- **`document`**: Mocks canvas rendering context (`2d`) with dummy functions (`beginPath`, `ellipse`, `fill`, etc.) to prevent drawing failures.
- **`localStorage`**: Injects a key-value store mock to enable save/load testing.

---

## 4-Tier E2E Test Suite Design

The E2E test suite is structured into four sequential tiers to ensure maximum reliability and feature stability.

### Tier 1: Feature Coverage (Functional Tests)
Verifies that individual features work as expected under normal conditions.

#### Feature 1: Dragon Egg Hatching
1. **Definition Check**: Verify `dragon_egg` item exists in database with type `consumable` and subType `hatch_egg`.
2. **Egg Consumption**: Verify that calling `state.useItem('dragon_egg')` decreases egg count by exactly 1.
3. **Mount Looting**: Verify that hatching a `dragon_egg` adds one of `fire_drake`, `wind_wyvern`, or `earth_wyrm` to the player's inventory.
4. **Invalid Hatching**: Verify that calling `useItem('dragon_egg')` with 0 eggs in inventory returns `false`.
5. **Uniform Hatching Distribution**: Run hatching 10,000 times; verify each mount yields a probability between 30% and 36%.

#### Feature 2: Mount Equipping and Attributes
1. **Equip Mount**: Verify equipping a mount sets `state.character.mounted = true` and updates `state.character.equipment.mount`.
2. **Unequip Mount**: Verify unequiping a mount clears the equipment slot and sets `mounted = false`.
3. **Movement Speed Multipliers**: Verify movement speed factors: `fire_drake` (+50%), `wind_wyvern` (+80%), `earth_wyrm` (+30%).
4. **Stat Modifications**: Verify passive stat gains: `wind_wyvern` (+15 Flee), `earth_wyrm` (+25 DEF, +300 Max HP).
5. **Dismount Attribute Removal**: Verify that setting `mounted = false` while keeping the mount item equipped removes speed multipliers and stat bonuses.

#### Feature 3: Mounted Active Skills
1. **Casting Locks**: Verify that `dragon_breath`, `mounted_barrage`, and `draconic_shield` throw casting warnings and do not consume SP if player is dismounted.
2. **Dragon Breath Splash Damage**: Verify that casting Dragon Breath deals physical damage to the target and 50% splash damage to all adjacent monsters (within 1-tile distance) while ignoring distant monsters.
3. **Mounted Barrage Projectiles**: Verify that casting Mounted Barrage fires 5 projectiles (`#facc15` color, speed 14) and deals 5 hits of damage.
4. **Draconic Shield Healing & Reduction**: Verify casting Draconic Shield heals the caster (`150 + lvl * 45 + vit * 3` HP) and applies damage reduction (`20% + 2% * lvl`).
5. **Draconic Shield SP Drain & Dismount**: Verify that Draconic Shield drains SP every second and deactivates when SP hits 0, or when the player dismounts.

#### Feature 4: Dragon Slayer Class Ascension
1. **Promotion Level Restraints**: Verify that promotion to `dragon_knight`, `wyvern_hunter`, or `dragon_shaman` fails if base level < 75 or job level < 50.
2. **Promotion Token Restraints**: Verify promotion fails if the quest token `dragon_hunt_trial_proof` is missing from inventory.
3. **Promotion Completion**: Verify promotion meeting all requirements succeeds, transitions the class ID, resets job level/exp, and consumes the token.
4. **Dragon-Type Damage Bonus**: Verify +50% physical and magical damage is dealt to Dragon-type monsters, and standard damage is dealt to non-dragons.
5. **Dragon-Type Damage Reduction**: Verify 30% damage reduction is applied when receiving attacks from Dragon-type monsters.

#### Feature 5: Maps/Biomes & MVP Bosses/Card drops
1. **Warp Biome Verification**: Warp the player to `volcanic_hatchery` and `dragon_peak` and assert background tiles, bgColors, and BGM themes load.
2. **Biome Obstacle Damage**: Verify stepping on bubbling lava in Volcanic Hatchery deals fire damage over time, and stepping on clouds in Dragon Peak applies a movement slow.
3. **MVP Boss Spawning**: Verify `red_fire_dragon` (Volcanic Lair) and `golden_drake` (Dragon Peak) spawn with boss stats (high HP/ATK) and broadcast an announcement log.
4. **MVP Card Drops**: Verify defeating the bosses yields `red_dragon_card` and `golden_drake_card` at their configured drop rates.
5. **MVP Card Effects**: Verify `red_dragon_card` (+30% Fire Attack in weapon) and `golden_drake_card` (+30% movement speed in shield) apply correct attributes.

---

### Tier 2: Boundary/Corner Cases
Verifies system behavior at critical limits, error states, and threshold transitions.

#### Feature 1: Dragon Egg Hatching
1. **Inventory Stack Boundary**: Hatching when the egg is the only item in inventory vs. when it is in a stacked slot of 99 items.
2. **Boundary Random Seed Values**: Mock `Math.random` to return exactly `0.0`, `0.33`, `0.34`, `0.66`, `0.67`, and `0.99` to verify precise mount selection intervals.
3. **Interrupted Hatching**: Attempt to hatch an egg while transitioning biomes or in a dead state (ensure action is rejected).
4. **Invalid Item Usage**: Attempt to use `dragon_egg` when character class is locked or has not completed novice trial (ensure it still hatches since it's a general consumable).
5. **Maximum Inventory Capacity**: Hatching when inventory is full (if limits are implemented).

#### Feature 2: Mount Equipping and Attributes
1. **Refinement Lock**: Verify calling `refineItem('mount')` yields a failure response and does not consume materials.
2. **Socketing Lock**: Verify calling `socketCard(cardId, 'mount')` yields a slot-mismatch error.
3. **Mount Swapping**: Equip a mount when one is already equipped; verify the old mount is returned to inventory and the new speed/stat modifiers replace the old ones in a single tick.
4. **Extreme Stats Recalculation**: Test mount equipping with 1 HP / 0 SP, ensuring stat recalculation does not result in NaN or negative HP values.
5. **Equip Requirements**: Attempt to equip mounts on different class tiers (Novice, Swordman, Lord Knight), confirming mounts are equippable by all tiers.

#### Feature 3: Mounted Active Skills
1. **Exact SP Threshold**: Cast a skill with SP exactly equal to the cost, and with SP exactly 1 point below the cost.
2. **Shield Drain deactivation**: Verify that when SP drains to 0 exactly, the shield deactivates without throwing errors or keeping the timer active.
3. **Splash Damage Lethality**: Verify that when splash damage from Dragon Breath reduces adjacent monsters' HP to 0, they respawn normally and loot drops are processed.
4. **Active Projectile Cap**: Rapidly cast Mounted Barrage to ensure projectiles do not exceed memory limits or cause visual rendering lag.
5. **Dismount mid-cast**: Dismount the player exactly when a projectile is mid-air; verify the projectile completes its flight and deals normal damage, but subsequent casts are locked.

#### Feature 4: Dragon Slayer Class Ascension
1. **Off-by-One Levels**: Attempt promotion at Level 74/50 and Level 75/49, asserting failure.
2. **Multiple Promotion Tokens**: Promote a player who has 5 quest tokens, verifying that exactly 1 token is consumed.
3. **Cross-Class weapon compatibility**: Verify that a Dragon Knight cannot equip Archer weapons (e.g. composite bow) but can equip Swordman weapons.
4. **Promotion Heal Limit**: Verify the full HP/SP restore on promotion does not exceed the newly calculated Max HP/SP.
5. **Invalid Class Upgrades**: Verify a Knight cannot promote directly to Wyvern Hunter or Dragon Shaman (requires correct subclass path).

#### Feature 5: Maps/Biomes & MVP Bosses/Card drops
1. **Lava Obstacle Lethality**: Verify that lava obstacle damage can reduce player HP to 0, correctly triggering death penalty (1% exp loss) and Prontera respawn.
2. **Speed Cap Stack**: Stack Wind Wyvern (+80%), Golden Drake Card (+30%), and Agi Up buff (+35%) to verify movement speed is clamped to the engine's safe maximum limit to prevent clipping.
3. **Boss Despawn on Warp**: Warp to Prontera while a boss has aggro on the player; verify the boss is despanwed/reset and does not follow the player.
4. **Double Card Socketing**: Socket two Red Dragon Cards into a 2-slot weapon; verify the fire attack bonus accumulates correctly (+60%).
5. **Boss Aggro Range Limit**: Stand 1 tile outside the MVP boss aggro range; verify the boss remains passive, then take one step inside to trigger immediate chase.

---

### Tier 3: Cross-Feature Combinations
Verifies interactions between different systems in pairwise combinations.

1. **Egg Hatching + Mount Equipping**: Hatch a mount and immediately equip it from inventory; verify stats recalculate in the same frame.
2. **Mount Equipping + Mounted Skills**: Verify that equipping a mount dynamically unlocks casting for mounted skills, and unequipping/dismounting instantly locks them.
3. **Mount Equipping + Class Ascension**: Verify that ascending to a Dragon Slayer class preserves the equipped mount and its stats.
4. **Mount Equipping + Biomes/Obstacles**: Verify that riding an Earth Wyrm reduces damage taken from bubbling lava obstacles in the Volcanic Hatchery map.
5. **Mounted Skills + Class Ascension**: Verify that a Dragon Knight's `dragon_breath` deals +50% damage against Dragon-type monsters.
6. **Mounted Skills + Biomes/Obstacles**: Verify that active buffs (like Draconic Shield) mitigate damage taken from environmental hazards like lava.
7. **Mounted Skills + MVP Nests**: Fight the MVP Red Fire Dragon; verify that Knight's `dragon_breath` splash damage strikes the boss and any surrounding baby drakes simultaneously.
8. **Class Ascension + MVP Nest Cards**: Defeat an MVP boss as a Dragon Slayer, loot its card, socket it, and verify that the card damage buffs combine multiplicatively with the slayer's dragon-type bonus.
9. **Class Ascension + Biomes/Obstacles**: Verify that a Dragon Shaman takes less damage from both environmental hazards (in Volcanic Hatchery) and Dragon-type monsters.
10. **MVP Nest Cards + Mount Equipping**: Socket a Golden Drake Card (+30% speed) while mounted on a Wind Wyvern (+80% speed) and verify the final speed factor is computed correctly.

---

### Tier 4: Real-World Application Scenarios
Simulates realistic play sessions and complex player workflows.

#### 1. The Ultimate Dragon Slayer Run
- **Flow**:
  1. Initialize character as Novice, level up to 10/10, complete Novice Trial quest, promote to Swordman.
  2. Level up to 40/40, complete Sograt Desert Survey quest, promote to Knight.
  3. Reach level 75/50 and complete the "Dragon Hunt Trial" quest to earn the quest proof.
  4. Promote class to Dragon Knight.
  5. Buy/loot a `dragon_egg`, use it to hatch a mount (repeat if necessary until obtaining `fire_drake`).
  6. Equip the `fire_drake` and mount it.
  7. Warp to the Volcanic Hatchery biome.
  8. Navigate around bubbling lava obstacles.
  9. Engage and defeat the MVP boss `red_fire_dragon` using Knight's `dragon_breath` skill.
  10. Assert the boss drops the `red_dragon_card`, socket it in the weapon, and verify the fire physical damage output increase against monsters.

#### 2. The High-Speed Wyvern Raid
- **Flow**:
  1. Initialize character as Archer, level up to 40, promote to Hunter.
  2. Obtain and hatch a `wind_wyvern` mount.
  3. Equip and mount the Wind Wyvern, noting the +80% speed increase.
  4. Warp to the Dragon Peak biome.
  5. Speedrun through the map, utilizing the high movement speed and +15 Flee bonus to dodge aggressive flying wyverns and cloud obstacles.
  6. Engage the MVP Boss `golden_drake`.
  7. Defeat the boss using Hunter's `mounted_barrage` skill.
  8. Loot the `golden_drake_card` from the boss drops.
  9. Socket the card into the shield, verify the movement speed increases to the absolute maximum.

#### 3. Tank/Support Nest Survival
- **Flow**:
  1. Initialize character as Acolyte, promote to Priest, and eventually ascend to Dragon Shaman.
  2. Hatch and equip an `earth_wyrm` mount (+300 Max HP, +25 DEF).
  3. Warp to the Volcanic Hatchery nest.
  4. Deliberately step on lava obstacles to trigger damage.
  5. Cast `draconic_shield` to heal the damage and activate the barrier.
  6. Engage a pack of fire basilisks, confirming the shield absorbs a portion of the incoming damage.
  7. Manage SP consumption by using Blue Potions as SP drains over time.
  8. Recruit/stand next to simulated bots (bots will cast Blessing/Heal).
  9. Perform a dismount, asserting the shield deactivates immediately and DEF/HP returns to normal.

---

## Running the E2E Test Suite

### Command Execution
To run all tests in the suite:
```bash
# Run sanity checks and E2E scripts
node src/test_draconic.js
node src/test_mounts_sanity.js
node src/test_mounts_empirical.js
node src/test_m1_challenger_2.js
node src/test_e2e_suite.js
```

### Exit Codes
- **`0`**: Success. All assertions passed (including dynamically handled expected failures / pending implementations).
- **`1`**: Failure. Detail of the failed assertion is printed to stderr.
