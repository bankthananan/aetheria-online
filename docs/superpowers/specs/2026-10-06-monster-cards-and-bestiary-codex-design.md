# Monster Cards & Bestiary Codex Design Specification

## 1. Overview & Vision
Inspired by classic Ragnarok Online card mechanics, this specification defines the **Monster Cards & Bestiary Codex** subsystem for Aetheria Online. Every creature roaming Aetheria drops a unique Monster Card that can be socketed into equipment gear, bestowing distinct combat affixes, passive stat boosts, and tactical procs. Simultaneously, an interactive **Bestiary Codex** embedded within the World Chronicle (`M`) tracks monster hunting progress, elemental weaknesses, drop tables, and card album collection milestones.

---

## 2. Core Architecture & Components

```
┌────────────────────────────────────────────────────────┐
│               MONSTER CARDS & BESTIARY                 │
└────────────────────────────────────────────────────────┘
          │                                 │
          ▼                                 ▼
┌───────────────────┐             ┌───────────────────┐
│  CARD SUBSYSTEM   │             │  BESTIARY CODEX   │
│ (js/systems/      │             │ (js/render/ &     │
│    cards.js)      │             │  Chronicle 'M')   │
├───────────────────┤             ├───────────────────┤
│ • 43 Monster Cards│             │ • Monster Codex   │
│ • Drop Roll Engine│             │ • Kill & Drop Logs│
│ • Socketing Rules │             │ • Album Milestones│
│ • On-Hit Triggers │             │ • Zero Shake UI   │
└───────────────────┘             └───────────────────┘
```

### 2.1 File Layout & Responsibilities
- **`js/systems/cards.js`**: Core card system logic:
  - `CARD_CATALOG`: Registry of all 43 monster cards with rarity, socket targets, stat modifiers, and on-hit procs.
  - `createCardsSystem({ now, rnd })`:
    - `getCardDef(cardId)`: Retrieves card definition.
    - `getCardForMonster(monsterId)`: Returns card for a given monster ID.
    - `rollCardDrop(monsterDef, { isElite, isBoss, luck })`: Drop probability calculator:
      - Normal mobs: 1.0% base drop rate (+ LUK scaling).
      - Champion / Elite mobs: 3.5% base drop rate.
      - Zone Guardians & Rare Bosses: 10.0% base drop rate.
    - `canSocketCard(itemInst, cardId, slotIndex)`: Validates equipment type (weapon vs armor vs accessory) and socket availability.
    - `socketCard(itemInst, cardId, slotIndex)`: Inserts card into the target item socket.
    - `unsocketCard(itemInst, slotIndex, { cost, zeny, deductZeny })`: Safely removes a card without destroying gear.
    - `recordBestiaryKill(bestiaryState, monsterId)`: Increments kill count and updates discovery level.
    - `recordBestiaryDrop(bestiaryState, monsterId, itemId)`: Unlocks drop item visibility in the codex.
    - `recordCardAcquired(bestiaryState, cardId)`: Marks card as unlocked in the bestiary album.
    - `calculateCollectionBonuses(bestiaryState)`: Computes passive account bonuses for completed zone albums.
    - `serialize(bestiaryState)` / `deserialize(data)`: Save state handling.
- **`js/content.js`**:
  - Registers 43 card items in `CONTENT.items` under type `'card'`.
  - Registers `old_card_album` (consumable item that rolls a random card from the catalog).
  - Registers `r_old_card_album` recipe in `CONTENT.recipes`.
- **`js/pixelart.js`**:
  - Registers `ITEM_ICON` mappings for all cards to appropriate icons (e.g. `'card_item'`, `'book'`, `'scroll'`).
- **`js/locale.js`**:
  - Full English and Thai bilingual translations for all card names, descriptions, affixes, and codex UI.
- **`js/render/cards-ui.js`**:
  - Canvas / DOM UI renderer for the Bestiary Codex tab in World Chronicle (`M`), card inspection tooltips, and socketing modal. Strict ZERO camera shake.
- **`js/game.js`**:
  - Wires monster death hooks, item drop logging, equipment card stat aggregation in `recompute(p)`, and on-hit combat procs.

---

## 3. Card Catalog & Affix Specifications

Cards fit into equipment sockets:
- `targetSlot`: `'weapon'`, `'armor'`, `'accessory'`, or `'any'`.

### 3.1 Card Tiers & Sample Catalog (All 43 Mapped)
1. **Common Tier (Normal Overworld Mobs)**:
   - `card_slime` (Armor): +60 Max HP, +10% Slime Gel drop rate.
   - `card_goblin` (Weapon): +6 ATK, +5% Zeny gained from kills.
   - `card_goblin_scout` (Accessory): +6 Flee, +3% Move Speed.
   - `card_goblin_chieftain` (Weapon): +12 ATK, +4% Melee Cleave radius.
   - `card_barkskin_warden` (Armor): +10 DEF, +5% Nature Resistance.
   - `card_blight_sprite` (Accessory): +8 MATK, +5% Mana cost reduction.
   - `card_corrupted_dryad` (Armor): +80 Max HP, +2% HP Regen per 5s.
   - `card_wolf` (Weapon): +8 ATK, +4% Critical Chance.
   - `card_thornback_boar` (Armor): +12 DEF, Reflects 5% physical damage taken.
   - `card_mossback_beetle` (Armor): +15 DEF, +50 Max HP.
   - `card_shade` (Accessory): +10 Flee, +5% Shadow/Void Resistance.
   - `card_mire_leech` (Weapon): +2% Physical Lifesteal.
   - `card_drowned_acolyte` (Accessory): +12 MATK, +8% Water/Ice Resistance.
   - `card_ruin_crawler` (Armor): +14 DEF, +6% Stun Resistance.
   - `card_tidecrawler` (Weapon): +10 ATK, +5% damage against Aquatic monsters.
   - `card_abyssal_siren` (Accessory): +15 MATK, +5% Cast Speed.
   - `card_leviathans_shadow` (Armor): +100 Max HP, +10% Water Resistance.
   - `card_void_construct` (Armor): +18 DEF, +8% Void Resistance.
   - `card_frost_wolf` (Weapon): +12 ATK, 10% chance on hit to inflict Slow.
   - `card_ice_wraith` (Accessory): +15 MATK, +10% Ice Damage.
   - `card_rime_harpy` (Weapon): +8 ATK, +6% Attack Speed.
   - `card_tundra_lurker` (Armor): +16 DEF, +10% Ice Resistance.
   - `card_sand_stalker` (Weapon): +14 ATK, +8% Hit Rate.
   - `card_ember_imp` (Accessory): +15 MATK, +10% Fire Damage.
   - `card_magma_beetle` (Armor): +20 DEF, +12% Fire Resistance.
   - `card_ashwing` (Accessory): +12 Flee, +4% Move Speed.
   - `card_zephyr_hawk` (Weapon): +10 ATK, +8% Attack Speed.
   - `card_storm_elemental` (Accessory): +18 MATK, +12% Lightning Damage.
   - `card_void_wisp` (Accessory): +16 MATK, +60 Max MP.
   - `card_star_reaver` (Weapon): +16 ATK, +6% Critical Damage.
   - `card_astral_knight` (Armor): +22 DEF, +120 Max HP.
   - `card_rift_manta` (Accessory): +14 Flee, +10% Void Resistance.
   - `card_constellation_mite` (Armor): +15 DEF, +10% All Elemental Resistance.
   - `card_void_stalker` (Weapon): +18 ATK, 8% chance on hit to inflict Void Vulnerability.

2. **Epic Tier (Guardians, Champions & Rare Spawns)**:
   - `card_elderwood_treant` (Armor): +180 Max HP, +15% Nature Resistance, 10% chance when hit to entangle attacker for 1.5s.
   - `card_ruin_golem` (Armor): +28 DEF, +150 Max HP, reduces incoming physical damage by 5%.
   - `card_frost_revenant` (Weapon): +22 ATK, +15% Ice Damage, 12% chance on hit to trigger Frost Nova (dealing 120% Ice damage in radius).
   - `card_flame_dragon` (Weapon): +28 ATK, +20% Fire Damage, 8% chance on attack to summon falling Meteor dealing 150% Fire damage.
   - `card_gilded_ravager` (Accessory): +15% Zeny gain, +5 LUK, +10% Item Drop Rarity.
   - `card_zenith_warden` (Armor): +25 DEF, +180 Max HP, +15% Holy Resistance.
   - `card_void_herald` (Weapon): +25 ATK, +20 MATK, 10% chance on spell cast to trigger Void Tear dealing 140% Void damage.
   - `card_voidmaw_sovereign` (Armor): +30 DEF, +220 Max HP, reduces all damage taken during Incursions by 10%.

3. **Legendary Tier (Finale Boss)**:
   - `card_nullking` (Any): +35 ATK, +35 MATK, +15% All Elemental Damage, attacks penetrate 20% enemy DEF.

---

## 4. Bestiary Codex & Zone Albums

### 4.1 Monster Entry Structure
Each entry in the Bestiary displays:
- **Header**: Monster Name, Level, Element badge, Biome/Zone.
- **Lore**: Rich historical epithet and behavioral flavor.
- **Hunting Mastery**:
  - `kills`: Lifetime kill tally.
  - `rank`: Mastery Star tier (★ at 10 kills, ★★ at 50 kills, ★★★ at 200 kills). Rank increases drop rate (+5% at ★★★).
- **Vulnerabilities**: Displays damage multipliers against each element (e.g. Fire vs Ice: 150%).
- **Drop Table**: Lists all possible item drops. Items remain darkened as `???` until dropped at least once.
- **Card Slot**: Illustrated frame displaying the Monster Card. Shows `Uncollected` or vibrant card art with socket affix description once acquired.

### 4.2 Zone Collection Milestones
Completing full card sets for a region unlocks permanent passive traits:
- **Whispering Woods Complete (11 cards)**: *Forest Strider* (+3% Movement Speed).
- **Sunken Ruins Complete (8 cards)**: *Tidal Resilience* (+10% Water Resistance, +50 Max HP).
- **Frostpeak Tundra Complete (5 cards)**: *Glacial Fortitude* (+15 DEF, +10% Ice Resistance).
- **Dragon Caldera Complete (5 cards)**: *Caldera Fury* (+12 ATK, +10% Fire Damage).
- **Astral Rift Complete (9 cards)**: *Starweaver* (+15 MATK, +10% Void Damage).
- **Grand Master of Aetheria (All 43 cards)**: *Legendary Paragon* (+5% All Stats, +10% Drop Rarity).

---

## 5. Old Card Album (OCA) & Crafting

- **Item**: `old_card_album`
- **Use Effect**: Opens with a radiant golden fanfare particle burst (0% camera shake), granting 1 random monster card chosen from the full 43-card catalog.
  - Normal cards: 78% probability.
  - Epic / Boss cards: 20% probability.
  - Nullking card: 2% probability.
- **Alchemy Recipe (`r_old_card_album`)**:
  - 1x `caldera_crystal`
  - 1x `essence_night`
  - 2x `blessed_ore`
  - 1x `golem_core`
  - Cost: 500 Zeny

---

## 6. Strict Constraints & Quality Invariants

1. **Strict ZERO Screen Shake Engine-Wide**:
   - Zero camera displacement (`cam.x`, `cam.y` remain steady). No shake on card drop toasts, album openings, or boss card procs.
2. **Surface Stability**:
   - Strictly preserve all 255 keys on `window.__AWO`.
3. **Save Compatibility**:
   - Persist bestiary kill counts, drop discoveries, acquired cards, and slotted card IDs within `awo_save_v1` under `p.bestiary` and item `sockets`.
4. **Dual Bilingual Localization**:
   - 100% English and Thai localizations in `js/locale.js`.
5. **Deterministic Test Verification**:
   - Unit tests (`js/cards.test.js`) and End-to-End integration tests (`js/cards-integration.test.js`).
   - All existing 51 test suites must continue passing.
