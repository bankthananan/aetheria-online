# Relic & Artifact Equipment System Design Specification

## Overview

The **Relic & Artifact Equipment System** introduces an 8th dedicated equipment slot (`relic`) to Aetheria Online. Relics are rare, powerful artifacts that grant unique, game-altering passive combat perks rather than simple numerical stat increases. This system enhances build variety, tactical survival options, and endgame item chasing.

---

## 1. Relic Catalog

| ID | Name | Slot | Source | Passive Perk Details |
| :--- | :--- | :--- | :--- | :--- |
| `phoenix_feather` | **Phoenix Feather** | `relic` | Flame Dragon / Crafting | **Lethal Revive:** When player takes fatal damage, death is negated. Restores 40% Max HP and triggers a 3-tile radial fire burst dealing 120% ATK damage to nearby enemies. 180s cooldown. |
| `midas_touch` | **Hand of Midas** | `relic` | Guild Shop (Rank C+) | **Gilded Strike:** Critical hits burst with +15–35 bonus Zeny directly awarded to the player. Monster kills yield +30% bonus Zeny. |
| `storm_conduit` | **Storm Conduit** | `relic` | Zenith Warden / Crafting | **Chain Lightning:** Attacks have a 25% chance to discharge Chain Lightning, arcing to up to 3 nearby enemies within 4 tiles for 85% weapon damage. |
| `thornmail_carapace` | **Bramble Carapace** | `relic` | Ruin Golem / Crafting | **Thorns & Fortitude:** Reflects 35% of melee damage received back to attacker as true physical damage. Grants +12% Max HP. |
| `frostbite_pendant` | **Frostbite Pendant** | `relic` | Frostpeak Tundra Rares | **Glacial Touch:** Attacks have a 20% chance to freeze/slow target for 2.5s, reducing attack speed and movement speed by 50%. |
| `vampiric_grail` | **Chalice of the Undying** | `relic` | Nullking / Astral Rift | **Blood Pact:** Grants +6% true lifesteal on all damage dealt. Excess healing generates a temporary Blood Shield (up to 15% Max HP) that absorbs damage. |

---

## 2. Paper-Doll Equipment UI Layout

Currently, the character paper-doll displays 7 slots in a 2-column grid (`weapon`, `head`, `body`, `hands`, `cloak`, `feet`, `accessory`). Adding `relic` completes a symmetrical 4×2 grid:

```
+--------------------+--------------------+
| Weapon             | Head               |
+--------------------+--------------------+
| Body               | Hands              |
+--------------------+--------------------+
| Cloak              | Feet               |
+--------------------+--------------------+
| Accessory          | Relic              |
+--------------------+--------------------+
```

- **Slot Identifier:** `'relic'`
- **Slot Label:** `'Relic'`
- **Slot Fallback Icon:** `'core'` or `'gem'` from [`js/pixelart.js`](file:///Users/thanananasanthia/Desktop/personal/game-rpg/js/pixelart.js)
- **Equip / Unequip Mechanics:** Relics follow identical right-click and inventory equip/swap semantics as other equipment pieces.

---

## 3. Subsystem Architecture (`js/systems/relics.js`)

A dedicated module encapsulating all relic trigger logic and cooldown timers:

```js
export function createRelicSystem({
  now = () => performance.now(),
  dist = (x1, y1, x2, y2) => Math.hypot(x1 - x2, y1 - y2),
  TS = 32,
} = {})
```

### Methods:
1. `getEquippedRelic(player)`:
   Resolves the equipped relic item instance from `player.equip.relic`.
2. `getPassiveModifiers(player)`:
   Calculates additive passive stats (e.g. `hpPct`, `lifesteal`) to inject into `recalcPlayerStats()`.
3. `onHit(player, target, damage, isCrit, context)`:
   - **Storm Conduit:** Rolls 25% chance for Chain Lightning zap across up to 3 nearby enemies.
   - **Hand of Midas:** On crit, awards bonus Zeny with golden float text `+XXz`.
   - **Frostbite Pendant:** 20% chance to apply `slow` status for 2.5s.
   - **Chalice of the Undying:** Heals player for 6% damage dealt; overflows into `player.bloodShield`.
4. `onTakeDamage(player, attacker, damage, context)`:
   - **Blood Shield:** Absorbs incoming damage before depleting `player.hp`.
   - **Bramble Carapace:** Reflects 35% melee damage back to attacker with float text `THORNS!`.
5. `onLethalDamage(player, rawDamage, context)`:
   - **Phoenix Feather:** Intercepts fatal blows when `player.hp <= 0` and cooldown has elapsed:
     - Sets `player.hp = Math.round(player.maxHp * 0.40)`.
     - Sets cooldown: `relic._nextReviveAt = now() + 180000`.
     - Deals 120% ATK radial fire damage to enemies within 3 tiles.
     - Displays floating banner `PHOENIX REBIRTH!`.
     - Returns `true` (death prevented).
   - Returns `false` if no revive available.
6. `onKill(player, monster, context)`:
   - **Hand of Midas:** Returns `{ zenyMult: 1.30 }`.

---

## 4. Item Definitions & Acquisition

### Content Entries ([`js/content.js`](file:///Users/thanananasanthia/Desktop/personal/game-rpg/js/content.js)):
```js
{ id: "phoenix_feather", name: "Phoenix Feather", type: "relic", desc: "A blazing plume that refuses to let its bearer turn to ash.", value: 3500, relicPerk: "lethal_revive", rarity: "epic" },
{ id: "midas_touch", name: "Hand of Midas", type: "relic", desc: "A gilded glove from a forgotten king whose touch turned greed into gold.", value: 3000, relicPerk: "gilded_strike", rankReq: "C+", rarity: "epic" },
{ id: "storm_conduit", name: "Storm Conduit", type: "relic", desc: "A humming capacitor holding captive lightning.", value: 3200, relicPerk: "chain_lightning", rarity: "epic" },
{ id: "thornmail_carapace", name: "Bramble Carapace", type: "relic", desc: "Hardened chitin bristling with venomous barbs.", value: 2400, relicPerk: "thorns", rarity: "rare" },
{ id: "frostbite_pendant", name: "Frostbite Pendant", type: "relic", desc: "A shard of permafrost that chills everything it nears.", value: 2600, relicPerk: "glacial_touch", rarity: "rare" },
{ id: "vampiric_grail", name: "Chalice of the Undying", type: "relic", desc: "An obsidian goblet brimming with stolen starlight.", value: 5000, relicPerk: "blood_pact", rarity: "legendary" },
```

### Crafting Recipes:
- **Phoenix Feather:** `1x dragon_heart` + `3x ember_ash` + 2,500 Zeny.
- **Storm Conduit:** `1x zenith_core` + `2x storm_core` + 3,000 Zeny.
- **Bramble Carapace:** `1x golem_core` + `3x crawler_shell` + 1,500 Zeny.

### Drop Tables:
- `flame_dragon`: 15% chance to drop `phoenix_feather`.
- `nullking`: 20% chance to drop `vampiric_grail`.
- `zenith_warden`: 15% chance to drop `storm_conduit`.
- `sunken_ruins` / `ruin_golem`: 10% chance to drop `thornmail_carapace`.

---

## 5. Engine Wiring ([`js/game.js`](file:///Users/thanananasanthia/Desktop/personal/game-rpg/js/game.js))

- **`EQUIP_SLOTS`:** Add `'relic'`.
- **`SLOT_LABEL`:** Add `relic: 'Relic'`.
- **`SLOT_ICON`:** Add `relic: 'core'`.
- **`itemSlot(it)`:** Map `it.type === 'relic' ? 'relic'`.
- **`recalcPlayerStats`:** Factor in `relicSystem.getPassiveModifiers(p)`.
- **`playerBasicAttack` / `damageMonster`:** Call `relicSystem.onHit(p, target, dmg, isCrit, context)`.
- **`damagePlayer` / incoming damage:** Call `relicSystem.onTakeDamage(p, attacker, dmg, context)`.
- **`playerDeath`:** Check `if (relicSystem.onLethalDamage(p, dmg, context)) return;` before proceeding to defeat state.
- **`killMonster`:** Query `relicSystem.onKill(p, monster, context)` for bonus Zeny scaling.
- **Save State:** `equip: { weapon: null, ..., relic: null, ...(sp.equip || {}) }` cleanly defaults missing relic slots in legacy saves.

---

## 6. Constraints & Invariants

1. **Zero Screen Shake:** Camera shake is strictly disabled for all relic visual procs.
2. **Surface Stability:** Preserve all 255 keys on `window.__AWO`.
3. **Deterministic Testing:** Mock PRNG in tests to verify procs reliably.
4. **Zero Build Step:** Plain ES modules in browser and Node runtime.
