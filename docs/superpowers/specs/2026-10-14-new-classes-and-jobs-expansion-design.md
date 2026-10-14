# Design Document: 3 New Classes & 4-Tier Job Progression Expansion

**Date:** 2026-10-14  
**Status:** Approved for Implementation Planning  
**Target Systems:** `js/design.js`, `js/progression.js`, `js/combat.js`, `js/content.js`, `js/game.js`, `js/pixelart.js`, `js/locale.js`

---

## 1. Executive Summary & Goals

*Aetheria Online* expands its roster from 7 classes to a full **10-Class MMORPG Ecosystem**, introducing three iconic missing archetypes:
1. **Shadow Blade (`shadow_blade`, `assassin`)**: Agility/Luck stealth skirmisher with poisoned daggers, shadow steps, clones, and lethal critical execution.
2. **Soul Binder (`soul_binder`, `necromancer`)**: Dark Occultist controlling undead thralls, necrotic afflictions, soul-fragment harvesting, and life siphon.
3. **Artificer (`artificer`, `artificer`)**: Magitek combatant deploying automated sentry turrets, electrified tesla pylons, volatile alchemical flasks, and tactical traps.

Each class features the full **4-Tier RO-Style Job Progression**:
- **Tier 0: Base Job (Lv 1–15)**: Foundational class mechanics, starter weapon, 3 base active skills, and primary passives.
- **Tier 1: Second Job Branches (Lv 15–40)**: Branching choice between two specialized playstyles, each with an exclusive signature skill and unique branch passive mechanic.
- **Tier 2: Third Job Advanced (Lv 40–70)**: High-tier specialization offering two distinct paths, culminating in screen-clearing finishers and master passives.
- **Tier 3: Fourth Job Hybrid (Lv 70–100)**: Transcendent hybrid mastery following the defeat of the Void Construct in an epic trial.

---

## 2. 10-Class Complete Roster & Class Matrix

| Class ID | Combat Class | Identity | Primary Stats | Weapon Type | Crest / Color | Job Book |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `reborn_blade` | `blade` | Tank / Vanguard | STR / VIT | Sword / Greatsword | ✦ `#78a7d8` | Rift Vanguard Manual |
| `drifter` | `berserker` | Duelist / Berserker | AGI / STR | Dual Blades / Axes | ☄ `#df777c` | Tempest Reaper Arts |
| `codeweaver` | `mage` | Runic Artillery | INT / DEX | Staff / Wand | ⌘ `#b98bea` | Runic Grimoire |
| `far_shot` | `ranger` | Sniper / Hunter | DEX / AGI | Bow | ➶ `#7fcf91` | Sky Piercer Fieldbook |
| `lightbringer` | `paladin` | Holy Guardian | VIT / INT | Mace / Shield | ✚ `#efd36f` | Dawnlit Testament |
| `iron_fist` | `monk` | Martial Artist | STR / AGI | Knuckles / Claws | ◉ `#e69b61` | Way of the Iron Fist |
| `stormcaller` | `elementalist` | Shaman / Storm | INT / LUK | Rod / Totem | ϟ `#70cddd` | Tempest Codex |
| **`shadow_blade`** | **`assassin`** | **Stealth Skirmisher** | **AGI / DEX / LUK** | **Dagger / Katar** | **🗡 `#8e44ad`** | **Manual of the Silent Umbra** |
| **`soul_binder`** | **`necromancer`**| **Necrotic Occultist** | **INT / VIT / LUK** | **Scythe / Grimoire** | **☠ `#16a085`** | **Necrotic Grimoire** |
| **`artificer`** | **`artificer`** | **Magitek Engineer** | **DEX / INT / STR** | **Wrench / Mortar** | **⚙ `#d35400`** | **Magitek Blueprint Index** |

---

## 3. Detailed Class Specifications

### 3.1 Shadow Blade (`shadow_blade`, `assassin`)
*Whispers in the dark that strike before their shadow catches up.*

* **Growth Curves:** STR: 0.8, AGI: 1.5, VIT: 0.7, INT: 0.5, DEX: 1.2, LUK: 1.3
* **Recommended Build:** `ADL` (Agility / Dexterity / Luck)
* **Tier 0 Base Skills (Lv 1):**
  - `shadow_strike`: Rapid twin stab dealing 140% physical damage with +15% innate Crit chance. Cooldown: 2.2s.
  - `smoke_screen`: Drop an evasive smoke bomb granting +30 Flee and blinding nearby monsters (35% miss chance) for 4s. Cooldown: 12s.
  - `poison_coat`: Coat blades in virulent venom for 12s; all basic attacks and skills inflict Poison DoT (50% MATK/s). Cooldown: 15s.
* **Tier 1 Job Branches (Lv 15 Advancement):**
  - **Nightstalker (`nightstalker`)**: Ambush and lethal toxicity.
    - *Signature Skill:* `assassinate` — Teleport behind target, striking for 280% damage. Guaranteed critical strike if used from smoke screen or stealth. Cooldown: 6s.
    - *Branch Mechanic:* `venom_amplification` — Poison DoTs tick 50% faster and erode 15% of the monster's physical DEF while active.
    - *Trial of the Nightstalker:* Slay 6 Shade assassins in Sunken Ruins.
  - **Phantom Blade (`phantom_blade`)**: Elusive duelist and clone flurries.
    - *Signature Skill:* `mirage_flurry` — Summon 2 shadow mirages that mirror your attack, dealing 3×85% slashing damage. Cooldown: 5s.
    - *Branch Mechanic:* `phantom_step` — Successfully dodging an attack immediately refunds 1s of cooldown across all active skills.
    - *Trial of the Phantom:* Slay 5 Cave Stalkers with zero deaths.
* **Tier 2 Advanced Jobs (Lv 40 Advancement):**
  - **Shadow Sovereign (`shadow_sovereign`)**:
    - *Signature / Finisher:* `death_mark` — Inscribe an execution seal on target; increases all damage taken by 25% for 5s, then detonates for 400% accumulated damage.
    - *Passive:* `executioners_instinct` (+4% Crit, +15% Crit DMG against enemies below 35% HP).
  - **Void Stalker (`void_stalker`)**:
    - *Signature / Finisher:* `dance_of_shadows` — 7-hit omni-slash striking all targets within 5 tiles with complete damage invulnerability during execution.
    - *Passive:* `abyssal_reflexes` (+25 Flee, +10% Movement Speed).
* **Tier 3 Hybrid Job (Lv 70):**
  - **Nightblade Sovereign (`nightblade_phantom`)**:
    - *Hybrid Trial:* Slay the Void Construct in Astral Rift.
    - *Hybrid Skill:* `eclipse_strike` — Cloak the entire battlefield in pure darkness; basic attacks unleash piercing void waves dealing 320% damage for 8s.
* **Passives:**
  - `dagger_mastery` (+3% ATK per rank)
  - `shadow_step` (+3 Flee per rank)
  - `lethal_precision` (+2% Crit per rank)
  - `venom_tolerance` (+4% Max HP, +5% Nature Res per rank)

---

### 3.2 Soul Binder (`soul_binder`, `necromancer`)
*Channels the resonant soul-fragments of the fallen into spectral servitude and decaying curses.*

* **Growth Curves:** STR: 0.5, AGI: 0.6, VIT: 1.2, INT: 1.5, DEX: 0.8, LUK: 1.4
* **Recommended Build:** `IVL` (Intelligence / Vitality / Luck)
* **Tier 0 Base Skills (Lv 1):**
  - `soul_rend`: Tear life-force from the foe, dealing 130% void magic damage and extracting 1 Soul Fragment (stacks up to 5). Cooldown: 2.0s.
  - `bone_armor`: Encase yourself in whirling bone shards granting +20% Phys DEF and reflecting 15% physical damage for 8s. Cooldown: 14s.
  - `corpse_explosion`: Detonate a defeated enemy or consumed Soul Fragment, dealing 180% AoE void magic damage in a 3-tile radius. Cooldown: 4s.
* **Tier 1 Job Branches (Lv 15 Advancement):**
  - **Dread Summoner (`dread_summoner`)**: Master of the spectral legion.
    - *Signature Skill:* `raise_skeletal_vanguard` — Summon an armored skeletal warrior with 50% player HP that taunts monsters and cleaves for 50% player MATK. Cooldown: 20s.
    - *Branch Mechanic:* `legion_empowerment` — While your summon is alive, you take 15% less damage and regenerate 2% Max MP per second.
    - *Trial of the Dread Summoner:* Raise 5 skeletons and purge 6 Drowned Acolytes.
  - **Plague Harbinger (`plague_harbinger`)**: Curse of decay and siphon.
    - *Signature Skill:* `plague_curse` — Afflict target with spreading necrosis: deals 80% MATK/s for 6s and reduces monster attack speed by 25%. Cooldown: 5s.
    - *Branch Mechanic:* `soul_siphon` — Dealing damage to afflicted enemies restores 5% of damage dealt directly as player HP.
    - *Trial of the Plague:* Defeat 6 Spore Creepers in Twilight Mire.
* **Tier 2 Advanced Jobs (Lv 40 Advancement):**
  - **Abyssal Lich (`abyssal_lich`)**:
    - *Signature / Finisher:* `death_nova` — Consume all active Soul Fragments to release a catastrophic radial soul wave dealing up to 500% void magic damage.
    - *Passive:* `eternal_phylactery` (+10% Max MP, fatal damage instead consumes all soul fragments to heal 30% HP; 90s CD).
  - **Nether Knight (`nether_knight`)**:
    - *Signature / Finisher:* `grim_harvest` — Wide sweeping scythe strike dealing 350% physical+void damage and converting 10% of total damage into shielding.
    - *Passive:* `unholy_fortitude` (+4% Max HP per rank, +10% Void Res).
* **Tier 3 Hybrid Job (Lv 70):**
  - **Eldritch Netherlord (`eldritch_lord`)**:
    - *Hybrid Trial:* Slay the Void Construct in Astral Rift.
    - *Hybrid Skill:* `apocalypse_harvest` — Open the Nether Gate: summons a storm of screaming wraiths dealing continuous void damage and granting 100% lifesteal for 6s.
* **Passives:**
  - `necrotic_affinity` (+4% Magic ATK per rank)
  - `soul_reservoir` (+5% Max MP per rank)
  - `death_ward` (+4% Max HP per rank)
  - `scythe_mastery` (+3% Magic ATK, +2% Crit per rank)

---

### 3.3 Artificer (`artificer`, `artificer`)
*Master of magitek contraptions, deployable sentries, and volatile alchemical combustions.*

* **Growth Curves:** STR: 1.0, AGI: 0.8, VIT: 0.9, INT: 1.3, DEX: 1.4, LUK: 0.6
* **Recommended Build:** `DIS` (Dexterity / Intelligence / Strength)
* **Tier 0 Base Skills (Lv 1):**
  - `wrench_strike`: Crushing strike with a heavy magitek wrench dealing 130% physical damage with a 20% chance to stagger (0.5s stun). Cooldown: 2.0s.
  - `acid_flask`: Hurl a corrosive shatter-flask dealing 110% area damage and melting 15% of all hit enemies' DEF for 5s. Cooldown: 4.5s.
  - `deploy_sentry`: Erect an automated clockwork sentry turret that fires rapid darts (35% player ATK) at the closest enemy for 10s. Cooldown: 12s.
* **Tier 1 Job Branches (Lv 15 Advancement):**
  - **Clockwork Engineer (`clockwork_engineer`)**: Pylon fortifications and automation.
    - *Signature Skill:* `tesla_coil` — Deploy a high-voltage tesla pylon that discharges lightning into up to 3 nearby enemies every 1.5s for 90% MATK. Cooldown: 14s.
    - *Branch Mechanic:* `overclock_grid` — Standing within 4 tiles of your deployed sentry or tesla coil increases Attack Speed and Movement Speed by 20%.
    - *Trial of the Engineer:* Defeat 6 Ruin Crawlers using sentry turrets.
  - **Mad Alchemist (`mad_alchemist`)**: Volatile grenades and combustion.
    - *Signature Skill:* `pyro_bomb` — Launch a phosphorus grenade creating a 3×3 blaze pool dealing 240% fire damage over 4s. Cooldown: 6s.
    - *Branch Mechanic:* `alchemical_catalyst` — Acid Flask and Pyro Bomb detonations trigger explosive secondary chain reactions on burning targets.
    - *Trial of the Alchemist:* Incinerate 5 Sand Scorpions with Pyro Bomb.
* **Tier 2 Advanced Jobs (Lv 40 Advancement):**
  - **Magitek Mechlord (`magitek_mechlord`)**:
    - *Signature / Finisher:* `siege_cannon` — Charge and fire a devastating rail beam dealing 450% piercing physical/lightning damage.
    - *Passive:* `reactive_chassis` (+4% DEF per rank, incoming critical hits generate a 10% barrier).
  - **Grand Alchemist (`grand_alchemist`)**:
    - *Signature / Finisher:* `philosopher_infusion` — Drink the supreme elixir, increasing ATK, MATK, and Speed by 30% for 10s.
    - *Passive:* `transmutation_mastery` (+3% ATK, +3% MATK per rank).
* **Tier 3 Hybrid Job (Lv 70):**
  - **Quantum Technomancer (`quantum_technomancer`)**:
    - *Hybrid Trial:* Slay the Void Construct in Astral Rift.
    - *Hybrid Skill:* `orbital_strike_beacon` — Designate ground zero with a quantum beacon, dropping a kinetic orbital beam dealing 600% ultimate area damage.
* **Passives:**
  - `engineering_savvy` (+3% ATK per rank)
  - `magitek_efficiency` (+5% Max MP, -1 MP cost per rank)
  - `reinforced_alloys` (+4% DEF per rank)
  - `precision_calipers` (+3 Hit, +2% Crit per rank)

---

## 4. Equipment Progression & New Itemization

We introduce 15 specialized weapons and 12 class armor sets distributed cleanly across Bands 1 through 5:

### 4.1 Weapons

| Item ID | Item Name | Weapon Slot | Band / Lvl | Base ATK / MATK | Compatible Classes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `iron_dagger` | Iron Dagger | Weapon | Band 1 (Lv 1) | ATK 14 | `shadow_blade`, `drifter` |
| `shadow_kris` | Shadow Kris | Weapon | Band 2 (Lv 18) | ATK 38, Crit +4% | `shadow_blade` |
| `nightstalker_stiletto`| Stiletto of the Night | Weapon | Band 3 (Lv 34) | ATK 68, Flee +6 | `shadow_blade` |
| `abyssal_fang` | Abyssal Fang | Weapon | Band 4 (Lv 56) | ATK 112, Crit +8%| `shadow_blade` |
| `eclipse_edge` | Eclipse Edge | Weapon | Band 5 (Lv 72) | ATK 165, Crit +12%| `shadow_blade` |
| `bone_wand` | Bone Wand | Weapon | Band 1 (Lv 1) | MATK 16 | `soul_binder`, `codeweaver` |
| `soul_binder_staff` | Soulbinder Caduceus | Weapon | Band 2 (Lv 18) | MATK 42, MP +30 | `soul_binder` |
| `bone_scythe` | Grim Bone Scythe | Weapon | Band 3 (Lv 34) | MATK 74, ATK 40 | `soul_binder` |
| `nether_grimoire` | Nether Grimoire | Weapon | Band 4 (Lv 56) | MATK 120, Lifesteal 4% | `soul_binder` |
| `abyssal_harvester`| Abyssal Harvester | Weapon | Band 5 (Lv 72) | MATK 175, ATK 60 | `soul_binder` |
| `heavy_wrench` | Heavy Magitek Wrench | Weapon | Band 1 (Lv 1) | ATK 15 | `artificer`, `iron_fist` |
| `steam_pistol` | Steamcarbine Pistol | Weapon | Band 2 (Lv 18) | ATK 40, MATK 20 | `artificer` |
| `magitek_driver` | Magitek Rotary Driver | Weapon | Band 3 (Lv 34) | ATK 72, MATK 35 | `artificer` |
| `mortar_cannon` | Field Mortar Cannon | Weapon | Band 4 (Lv 56) | ATK 118, MATK 50 | `artificer` |
| `clockwork_obliteration_engine`| Clockwork Annihilator | Weapon | Band 5 (Lv 72) | ATK 170, MATK 75 | `artificer` |

### 4.2 Class Armor Sets

- **Band 2 (Ashen Steppes, Lv 22–24):**
  - `shadow_leathers` (DEF 18, Flee +6) — `shadow_blade`
  - `acolyte_robes` (DEF 16, Max MP +40) — `soul_binder`
  - `tinkerer_smock` (DEF 20, Max MP +20) — `artificer`
- **Band 3 (Twilight Mire, Lv 34–36):**
  - `nightstalker_tunic` (DEF 26, Crit +4%) — `shadow_blade`
  - `bone_woven_vestments` (DEF 24, Max HP +80) — `soul_binder`
  - `engineer_overalls` (DEF 30, ATK +6) — `artificer`
- **Band 4 (Tempest Spires, Lv 58–60):**
  - `phantom_garb` (DEF 40, Flee +12, Crit +5%) — `shadow_blade`
  - `lich_mantle` (DEF 38, MATK +12, Max MP +100) — `soul_binder`
  - `magitek_harness` (DEF 44, ATK +10, MATK +10) — `artificer`
- **Band 5 (Sunless Chasm, Lv 68–70):**
  - `void_assassin_vestments` (DEF 54, Crit +8%, Flee +16) — `shadow_blade`
  - `netherlord_regalia` (DEF 52, MATK +18, Lifesteal +3%) — `soul_binder`
  - `mechlord_power_chassis` (DEF 62, ATK +15, DEF +10%) — `artificer`

---

## 5. Advancement Quests & Class Storyline

1. **Trial of the Second Job (Lv 15):**
   - **Shadow Blade:** `Whispers of the Nightstalker` vs `Mirage in the Woods` (Dialogue at Town Assassin Enclave).
   - **Soul Binder:** `Rite of the Bone Crypt` (Defeat skeletal minions in Sunken Ruins).
   - **Artificer:** `Blueprint Calibration` (Collect 5 Iron Ore and test sentry against Ruin Crawlers).
2. **Trial of the Third Job (Lv 40):**
   - **Shadow Blade:** `Shadow Sovereign's Mark` (Defeat 5 Frost Wolves in Tundra).
   - **Soul Binder:** `Phylactery of the Abyssal Lich` (Defeat 5 Ice Wraiths).
   - **Artificer:** `Siege Calibration Protocol` (Defeat 5 Rime Harpies).
3. **Trial of the Fourth Job (Lv 70):**
   - All 3 classes undertake their Hybrid Ascension trial: Slaying the Void Construct in Astral Rift.

---

## 6. Pixel Art & Sprite Rig Strategy

- **Player Sprites in `PX.player`:**
  - `assassin`: Cloaked ninja silhouette with dual glowing violet daggers (`#8e44ad`).
  - `necromancer`: Tattered eerie green cowl wielding a curved soul scythe (`#16a085`).
  - `artificer`: Steampunk goggles, brass toolbelt, and shoulder-mounted cannon (`#d35400`).
- **Deployable FX in `PX.skill` & `combat-fx.js`:**
  - Sentry turret pixel entity with rotating barrel.
  - Skeletal vanguard pixel minion following the player.
  - Poison smoke cloud, corrosive acid splash, and shadow clone mirage silhouettes.

---

## 7. Localization (English & Thai)

Full parity between `L10N.en` and `L10N.th`:
- Class names: `Shadow Blade` (ชาโดว์เบลด), `Soul Binder` (โซลไบนเดอร์), `Artificer` (อาร์ติฟิเซอร์).
- Job titles: `Nightstalker` (ไนท์สตอล์กเกอร์), `Phantom Blade` (แฟนทอมเบลด), `Dread Summoner` (เดรดซัมมอนเนอร์), `Plague Harbinger` (เพลกฮาร์บินเจอร์), `Clockwork Engineer` (วิศวกรฟันเฟือง), `Mad Alchemist` (นักเล่นแร่แปรธาตุคลั่ง), etc.
- Complete skill names, descriptions, quest titles, and equipment names.

---

## 8. Verification & Acceptance Criteria

1. **Unit & Balance Tests:**
   - Class registration: `DESIGN.classes` contains all 10 classes with valid stat growths.
   - Skill tree validation: `PROGRESSION.skillTree` has no orphan nodes; prerequisites and caps resolve.
   - Job advancement: `doPromote` correctly sets tierIndex, job titles, stat bonuses, and unlocked skills.
2. **Combat Integration:**
   - All 3 new classes can basic attack, cast all tier skills, deploy turrets/summons, and proc branch mechanics.
3. **Equipment Compatibility:**
   - Equip checks (`canUseItem`) enforce `classReq` properly for daggers, scythes, wrenches, and armors.
4. **Localization Coverage:**
   - `locale-coverage.test.js` passes with 0 missing Thai/English keys.
5. **Full Suite:**
   - `npm test` passes 100% with 0 regressions.
