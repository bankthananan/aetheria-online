# Aetheria Online — Isekai Adventure

A browser RPG in the spirit of Ragnarok Online, reskinned as an isekai (a burned-out
office worker respawns in the world of Aetheria). Zero build step, no dependencies —
just static files and the Web Audio API.

## Run it
ES modules can't load over `file://`, so serve the folder:

```bash
cd aetheria-online
python3 -m http.server 8777
# open http://localhost:8777/   (index.html is the game)
```

(Or `npx vite` and open `/`.) The old Vite project is preserved at `index.legacy.html`.

## Controls
- **Move**: WASD / Arrow keys, **or click the ground** — click-to-move **A*-routes around trees/walls/water** (no more getting stuck).
- **Fight**: click a monster to target it and auto-path into range. Auto-attacks fire on cooldown; **melee classes cleave** nearby foes. Getting hit **auto-retaliates** against the attacker. While Hunt is active, a ground click temporarily takes priority; on arrival Hunt reacquires the nearest valid monster from the new position.
- **Hotbar**: defaults to `1`–`9`. Starts with your starter skill + a potion; learned skills auto-slot, and right-click any slot to reassign. Use the **⌨ button** beside the bar to rebind slots to numbers or unused letters; conflicts swap safely and bindings persist in the save.
- **Auto-farm**: `F` (or the ⚔ Farm button) — auto-targets and fights the nearest monster, **skipping bosses**. Great for grinding.
- **Talk**: `E` near an NPC, or click one from any distance to walk over and talk automatically. Press `Space` to continue/close dialogue.
- **Menus**: `C` character · `I` inventory · `K` skills · `Q` quests · `M` World Chronicle
- Debug handle in the console: `window.__AWO`

## Progression systems
- **Stat points** (3/level): spend in the Character panel on STR/AGI/VIT/INT/DEX/LUK — recomputes ATK/DEF/HP/MP/crit live. **Escalating cost, RO-style**: a +1 costs `1 + floor(stat/25)` points (knob: `tuning.statCostEvery`), so pumping a towering main stat gets pricey while off-stats stay cheap — the + buttons show the live cost.
- **Skill tree — Ragnarok-style graph** (1 skill point/Job Lv, Job cap **50**): the Skills panel opens with a visual **Build → Setup/Detonate → Finish** combat map, then draws the dependency graph with job-tier badges, prerequisite lines, `lvl/max`, and owned/learnable/tier-capped/maxed states. The tree costs more than the 54-point maximum budget (including two job-change bonuses), so a character cannot max every active and passive. Rich tooltips explain Momentum, status consumption, resource cost, rank gates, and the bound action key. Click a lit node to learn/upgrade; drag any learned active onto a hotbar slot. Includes a **stat-growth hex radar**, recommended build, and passive band. Nodes auto-layout by dependency depth. Defined in `js/progression.js` / `js/combat.js`.
- **Class tiers via advancement quests**: reaching base Lv 15 / Lv 40 offers a **job-change quest** (e.g. "Trial of the Rift Knight — fell 5 Dire Wolves"). Completing it promotes you (new title + permanent stat bonus) **and unlocks that tier's branch of the skill tree**. Each class now gains a new second-job ability; its first-job signature skill is capped at Lv5 until the second class, then mastery ranks Lv6–10 unlock gradually at Job Lv18/22/26/30/34. Advanced skills continue opening through Job Lv50.
- **Monster levels**: each spawn rolls its own level around the definition's base (bosses fixed) and scales HP/ATK/DEF/EXP to match — shown as `Lv N` on the nameplate (colour-coded normal/strong/elite/boss).
- **Earned leveling**: a steeper XP curve **plus a level-gap penalty** — killing mobs far below you gives a fraction of their XP, at/above your level pays full-to-bonus. No more powerleveling on trash.
- **Loot & zeny drops**: equipment rarity bias scales with **monster level and your LUK**; every kill also drops zeny scaled by monster level (bosses pay a jackpot).
- **Quest difficulty**: story quests and guild bounties carry an Easy/Normal/Hard/Elite tier (colour badge); guild bounties roll their difficulty, drawing tougher monsters and paying multiplied rewards at higher tiers.
- **Base / Job level split (RO-style)**: base level (cap **80**) grants stat points; job level (cap **50**) grants a finite skill-point budget — both feed from the same exp. Skills & passives gate on **job level**; class tiers gate on base level (advance at **15 / 40**). Legacy uncapped saves migrate safely to Job 50 while preserving learned ranks.
- **Five 15–20 level bands**: Woods 1–15 → Ruins 16–30 → Tundra 31–45 → Caldera 46–60 → Rift 61–80, every monster rebased with formula-derived stats (and monster hit/flee curves tuned so low-DEX classes stay viable at 70+).
- **Dynamic level heat map**: a monster's level comes from WHERE it stands — band floor beside the entry gates (Lv1–2 mobs at the woods entrance), rising with depth to the band ceiling next to the zone guardian. A **nursery** (`tuning.heatNursery`) keeps the first stretch past each gate flat at the band floor, and the zone's weakest mob is **guaranteed to stock it** — so a fresh arrival always finds fair, at-level prey instead of being forced to punch several levels up. Respawns are **anchored** — a fallen mob returns near its home turf (entry zones stay stocked with entry-level prey; respawn 5s) and re-levels by position. Spawn counts scale with the bigger maps (~30 mobs in the woods). Maps were **widened** (woods 42×34, tundra 40×30, caldera & rift 42×32) so the gradient has real geography — push deeper only when you're ready.
- **Town rest**: safe maps (town) rapidly regenerate HP/MP — retreat, breathe, restock.
- **Job XP bar**: a thin blue bar rides above the gold base-XP bar, filling permanently at Job Lv50.
- **Stats do more**: AGI = attack speed (to −45% delay) + walk speed (to +50%) + flee · INT = magic ATK + MP + **spell/arrow reach** · shown live in the Character panel along with a **stat radar**, the class's **recommended build**, and per-stat explanations. The class-select screen shows each class's playstyle, build letters, growth spread, and a **base-stat radar** for at-a-glance comparison.
- **Fighting up is earned**: damage shrinks 15% per monster-level above you (floor 12%) **and** the monster gets +6 HIT per level it's above you — so an evasion/DPS build can't just dodge-tank far-higher mobs either. Both penalties bite around +6 levels, turning a much-higher mob (or under-leveled boss) into a wall, not a speed bump. Farming down still pays nothing (exp gap). Monsters carry ×1.6 HP so every fight takes real time. Knobs in `DESIGN.tuning` (`combatGapFalloff`/`combatGapFloor`/`combatGapHitPerLvl`).
- **Safe death recovery**: death revives the hero in town at half HP/MP and explicitly disables Hunt, focused quest hunting, active quest/world navigation, targets, queued paths, and held movement. The story quest remains active, but the player must deliberately resume its route. Monster processing also stops on the lethal hit so the previous map cannot damage the revived hero again in the same frame.
- **Boss mechanics**: bosses telegraph a red **ground slam** every ~8s (step out of the ring to dodge) and **enrage** below 35% HP (+40% ATK, faster swings, red aura). Leashing/respawn resets both.
- **Death penalty**: dying costs 10% of carried zeny and revives you at half HP/MP in town.
- **Level-phased main story**: the **35-quest playthrough** (41 declarations including seven class-trial alternatives) is divided into five visible chapters matching the world bands — Woods 1–15, Ruins 16–30, Tundra 31–45, Caldera 46–60, Rift 61–80. Every quest has a recommended/unlock Base Level; if the next beat is early, the Journal holds it as **Next Chapter**, shows the required level, and starts it automatically after hunting or bounty XP reaches the gate. The five-phase roadmap remains visible in the Quest Journal.
- **Quest objectives beyond kills**: `kill`, `collect` (items are consumed on turn-in), `explore` (set foot in a map), `talk` (speak with an NPC). The main story mixes all four types (pelts for winter, reporting victories, gathering frost shards/ember ash/star iron between battles). Guild bounties roll **deliveries** 40% of the time (pays ×1.3, Turn-in button in the Quest panel).
- **Up to 3 guild bounties at once**: accept multiple; one kill advances every matching bounty; the HUD tracker and the Quest window (even while open) update live as progress lands. Every bounty shows **where to go** — 📍 the target's home zone for culls, and 📍 *which monster drops it · where* for deliveries.
- **Bounty regions unlock by CONQUEST**: the guild only posts a zone's bounties after you slay the **previous zone's guardian** (woods are always posted) — merely walking into a new map unlocks nothing. Each guardian kill refreshes the board and the guild panel names the next gate ("Slay the Elderwood Treant to unlock Sunken Ruins bounties"). Legacy saves migrate (zones you'd reached stay unlocked).
- **Bounties are accepted AND claimed at the guild hall** — talk to **Elder Maro** to open the board; completing a kill bounty flags it ✔ *report to the guild* (no auto-payout), and deliveries hand over their goods there too. The Quest menu (Q) only tracks progress. **Guild points scale by region tier × difficulty** (Woods: 3/6/9 … Rift-tier 65+ per bounty).
- **Every hunting ground has a zone guardian**: Elderwood Treant (woods, Lv14) · Ruin Golem (ruins, Lv28) · Frost Revenant (tundra, Lv44) · Flame Dragon (caldera, Lv60) · Nullking (rift, Lv80) — all with slam/enrage/leash boss mechanics. `selfCheck()` enforces the rule for future maps.
- **World Chronicle (`M`)**: exploration reveals each region's province, historical epithet, landmark, danger band, and guardian status along a connected pilgrimage road. Unvisited areas remain redacted. Any previously visited region can be selected with **Plot route**—the hero follows real map portals with the same gold minimap guidance as quests; the Chronicle never teleports or skips discovery. Active travel routes persist in saves.
- **Hotbar editing**: right-click any slot (or left-click an empty one) → picker with learned skills, potions, Clear, and key settings. Skill slots are color-coded as builder/detonator/finisher/utility, show resource readiness and a radial cooldown, and glow when a finisher is ready. Drag learned skill-tree nodes directly onto slots. The bar starts with just your starter skill + a potion; **newly learned skills auto-slot** into the first free key.
- **Consumables with effects**: buff foods (Sharpening Stone +15% ATK / Iron Tonic +15% DEF, 60s) and the **Teleport Scroll** (instant return to town) — item fields `buff` / `teleport`, interpreted by `useItem`. **Restore potions share a 1.5s cooldown** (`tuning.potionCdMs`, countdown shown on the hotbar slot) — potion spam can no longer face-tank monsters far above your level.
- **Rotating shop**: the trader's Buy tab has a ⭐ Featured section — 4 rank-gated items rerolled every 5 minutes and on every guild rank-up.
- **Refinement (+0 → +9, safe)**: the shop's **Enhance** tab refines any weapon/armor/accessory — each + adds +5% base ATK/DEF (and +6% sell value). Fuel = a **specific named fragment** per bracket (2 per attempt): **Wolf Fang** for +0–2, **Shade Dust** for +3–5, **Star Iron** for +6–8 — with 1× **Blessed Ore** as the universal substitute. One clear farm target per bracket. Success falls from 100% to 30% at high +; failure only wastes the attempt. Refined gear shows as `+3 Iron Sword` everywhere and survives save/load.
- **Guild ranks** (F → E- → E → E+ → D- → … → A+ → S): completing bounties earns region-tier × difficulty guild points that climb the 17-step ladder. Rank gates bounty tiers (**Hard unlocks at D-, Elite at B-**), multiplies bounty pay (+5%/rank), improves **drop rarity**, and unlocks **rank-gated premium shop stock** (`rankReq` on items — Mythril @ D, Frost Brand/Seraph @ C, Void/Astral @ B). Rank + progress shown in the Quest panel and Shop.
- **Crafting**: the trader's **Craft** tab turns spare materials into supplies and gear (`CONTENT.recipes`) — buff foods from fangs and dust, potions from shards and cores, **Blessed Ore** from star iron, and a Seraph Ward forged from a Dragon Heart. Recipes show live have/need counts; a balance test guarantees no recipe can mint zeny.
- **Town storage chest**: the trader's **Storage** tab parks items (except quest items) outside the backpack — stackables move one unit per click, gear moves whole with its rarity/refine intact; the chest persists in saves.
- **Achievements**: 12 lifetime badges (kills, guardians, levels, zeny, +9 refine, guild rank, story) polled from live run state — 🏆 toast on unlock, listed in the Character panel, persisted. Defined in `CONTENT.achievements`, validated by `selfCheck()`.
- **Day/night cycle**: a 10-minute visual cycle (`tuning.dayCycleMs`) tints the world through amber dusk, blue night, and dawn — render-only, no gameplay effect.
- **Shop buy & sell**: the trader has Buy/Sell tabs — sell anything except quest items at half value (**rarity-scaled** for rolled gear, so an Epic sells for more than a Common of the same base). Both tabs (and the inventory) **group items by category** — Weapons, Armor & Accessories, Potions, Materials — with a count per section; the Enhance tab splits Equipped vs. In Bag.
- **Simulated balance**: combat numbers are tuned from a DPS/TTK simulator — at-level mobs genuinely threaten (`tuning.monsterAtkMult`), bosses are ~10s fights with real survival pressure, and at-level grinding lands at ~20–40 kills per level.
- **Save / load** (localStorage, single slot): the run **auto-saves every 5s**, on every zone change, and on page close. The title screen offers **▶ Continue** (showing your level & class) plus 🗑 to erase. Persists level/xp/zeny/stats/skills/gear/inventory/hotbar/**custom action keys** and quest + guild + map state; the uid counter is restored so fresh drops never collide. Nothing to install — refresh-safe.
- **Boss leash**: bosses regenerate only if you truly disengage (far from them AND no hits for 4s) — ranged kiting no longer resets them.

## World & content (expanded)
- **Base level cap 80 / Job level cap 50**, with endless free-roam & farming after the story — slaying the finale boss doesn't end the game.
- **7 classes**: Reborn Blade (tank), Drifter (dps), Codeweaver (mage), Far Shot (archer), **Lightbringer** (paladin — melee + self-heal), **Iron Fist** (melee combo), and **Stormcaller** (ranged caster).
- **6 biomes**: Town → Whispering Woods → Sunken Ruins → **Frostpeak Tundra** (snow/ice) → **Dragon Caldera** (sand/lava) → **Astral Rift** (void starfield), each with pixel tiles.
- **Regional history**: all six maps carry Chronicle records for their province, epithet, landmark, and place in Aetheria's failed summoning age; first arrival updates the Chronicle and enriches the zone-introduction banner.
- **23 animated monsters** incl. six guardians/bosses (Elderwood Treant, Frost Revenant, Gilded Ravager, Ruin Golem, **Flame Dragon**, **The Nullking**), plus Frost Wolf, Ice Wraith, Sand Stalker, Ember Imp, and the endgame Void Wisp / Star Reaver / Astral Knight.
- **Expanded gear**: Mythril/Frost/Dawn/**Void/Astral** weapons, Mythril Plate, Seraph Ward & **Astral Plate** armor, Greater Potion, Elixir & **Celestial Draught** — all roll the full rarity/affix range. Hands/feet/cloak have mid & late upgrades too (Mythril Gauntlets, Drakescale Boots, Aurora Cloak → Titan Grips, Astral Greaves, Voidweave Cloak), dropped in their bands and sold rank-gated.
- **35-quest, five-phase playthrough** chaining from the awakening and one of seven class trials through each region guardian to the Lv80 Nullking, then farm freely.
- **Class calling trials**: after the guild introduction the story forks once per class (`nextQuestByClass` on the hub quest) — each of the 7 classes gets its own flavored trial (the tank holds the road, the mage gathers debugging paste, the archer thins the treeline…) before every branch merges back at *Prove Yourself*. `selfCheck()` walks the chain once per class and requires full coverage with no cycles.
- **Rebirth (NG+)**: at Base Lv 80 the Character panel offers **Rebirth** — level/job/skills/stat points reset to 1, while gear, zeny, storage, guild rank, and the world all survive. Each rebirth permanently grants **+5 all stats and +10% max HP/MP**, and the world bites back: monsters gain **+15% HP/ATK/DEF** and pay **+10% EXP** per rebirth (knobs: `tuning.rebirth*`). Stacks without limit.
- **Roaming rare boss**: every ~20 minutes the **Gilded Ravager** (Lv45 ☠) is announced prowling a random field map — full slam/enrage boss mechanics, a zeny jackpot, and a guaranteed Blessed Ore among its trophy drops. It stays put until slain and never counts as zone conquest (knob: `tuning.rareBossEveryMs`).

## Graphics & combat feel
- **Layered 16-bit art pipeline**: players and NPCs use 4-direction LPC sheets (`assets/lpc/`, with pixel-matrix fallbacks); every monster has two hand-authored-style frames for idle, walk, and attack in `js/pixelart.js`. Everything renders nearest-neighbour: crisp, no blur.
- **Living world presentation**: animated water/grass/tree tiles, neighbour-aware shore and terrain seams, richer outlined town/prop tiles, cached cloud/mountain/treeline parallax, ground shadows, and **depth-sorted** entities.
- **Wood-and-parchment UI kit**: HUD bars, panels, hotbar, minimap, Quest tracker, dialogue, toasts, and tooltips share the same chunky brass-framed visual language, including mobile layouts.
- **Monster name plates**: shown above every monster, colour-coded — white (normal) · orange (strong) · **purple** (elite) · **red ☠** (boss).
- **Item icons**: every weapon/armor/potion/material has a pixel icon shown in the inventory, shop, equip lines, and hotbar (`PX.item` in `js/pixelart.js`, mapped by `ITEM_ICON`).
- **Admin tools**: name your hero **`admin`** on the title screen to get a ⚙ Admin panel — god mode, +levels/zeny/points, spawn legendary gear, learn-all, force class advance, spawn/kill monsters, and map warps.
- **Attack effects**: melee swings draw a slash arc + cleave nearby foes; ranged/mage fire projectiles (arcane bolt, **fireball** with explosion); AOE skills burst an expanding ring; buffs sparkle. Skill families get **distinct effects**: storm skills (Meteor/Blizzard/Star Fall/Arrow Rain) rain streaks into the blast radius, novas detonate double rings, quake skills crack the ground radially, **Chain Lightning** draws jagged flickering bolts, holy skills flash a rising cross, and heavy finishers double-arc.
- **Equipment rarity** (`js/loot.js`): weapons/armor drop as instances rolled Common→Legendary. Higher rarity = higher base stats **and** more affixes (e.g. +% ATK, +Crit, +Max HP, Lifesteal, +Flee). Boss/high-level foes bias toward better rolls; quests reward better gear. The Inventory shows rarity colors, affixes, and a **stat comparison vs your currently-equipped item** (e.g. `DEF 17 (▲ +15 vs equipped)`).

## Menu panels
- **Character (`C`)**: stats + allocate points, and a **7-slot equipment paper-doll** — Weapon, Head, Body, Hands, Cloak, Feet, Accessory — each showing the equipped piece's icon, rarity-coloured name, and stat. Click a slot to unequip. Multi-slot gear (`EQUIP_SLOTS`/`itemSlot`); DEF sums across all armor slots.
- **Inventory (`I`)**: **category tabs** (All / Gear / Use / Etc / Quest) with items grouped and sorted by type (Weapons, Armor & Accessories, …), each line showing rarity, affixes, and the vs-equipped comparison. Equip or **→Bar** any item to a hotkey.
- **Skills (`K`)**: visual combat-loop guide plus RO-style tree. **Active skills** expose builder/setup/detonator/finisher roles and can be dragged to the action bar; **Passive skills** invest points for permanent stat bonuses (`PROGRESSION.passives`, e.g. Iron Body +% Max HP).
- **Quests (`Q`)**: **Story** progression arc plus the **Adventurer's Guild** board of randomized repeatable bounties (`genGuildQuest`/`refreshGuildBoard`) — accept a bounty, cull the target count, collect the reward. Keeps the game endless after the story completes.
- **World (`M`)**: discovery-based Chronicle with lore, threat bands, conquest state, current-location marker, and non-teleport route plotting to visited regions.

## The multi-agent design team → files
Each specialist agent produced one data module; `js/game.js` is the engine that fuses them.

| Role | File | Owns |
|------|------|------|
| Game Director / System Designer | `js/design.js` | concept, 7 classes, stat formulas, xp curve, **`tuning` balance knobs** |
| Combat Designer | `js/combat.js` | 75 active skills across 7 classes, status effects, combat rules |
| Map Designer | `js/maps.js` | 6 tile biomes, spawns, portals |
| Content Designer | `js/content.js` | 23 monsters, 63 items, 10 NPCs, 35-quest playthrough, story |
| Music Director / Sound Engineer | `js/audio.js` | Web Audio chiptune themes + SFX (no asset files) |
| UX/UI Designer | `js/theme.js` | parchment/emerald/gold design system + full CSS |
| — progression — | `js/progression.js` | stat points, skill trees, class tiers |
| — pixel art — | `js/pixelart.js` | palette + class/NPC fallbacks + six-frame monster sets |
| — LPC art — | `js/lpc.js`, `assets/lpc/` | 4-direction player/NPC sheet mappings + attribution |
| — loot — | `js/loot.js` | equipment rarity tiers + affix pool |
| — menu art — | `js/sprites.js` | SVG class portraits for the title screen |
| — engine — | `js/game.js` | loop, movement, combat, effects, quests, HUD, panels, shops, progression + loot wiring |

The five regions and Base Lv 1→80 phased arc form a complete campaign; extend by adding
rows to any data module (new monsters/items/quests/maps) — the engine reads them directly.

## Extending the game (adding content)

**The `js/*.js` data modules already _are_ the database.** They're plain, logic-free
data objects (`CONTENT.monsters`, `COMBAT.skills`, `MAPS`, …) — version-controlled,
diff-able, commentable, and statically `import`ed with no loader or fetch. A real DB
file (JSON/SQLite/IndexedDB) would _remove_ those benefits and _add_ a load step, for
zero gain in a zero-build browser game. So content stays in these modules — the win is
keeping them **pure data** and letting `selfCheck()` guard the wiring.

`selfCheck()` (in `game.js`, runs at load) fails **loudly** if anything is mis-wired —
a spawn/drop/reward pointing at an unknown id, a skill with no tree node, a monster with
no sprite, a missing item icon, a bad quest difficulty, a broken formula. So "did I wire
it up right?" is answered the moment you reload.

Recipes (each is one data edit + whatever the self-check demands):
- **Monster** → add to `CONTENT.monsters` (id, level, hp/atk/def/exp, drops) · add `PX.monster[id] = { idle:[f0,f1], walk:[f0,f1], attack:[f0,f1] }` (same dimensions per state, ≤32×32, hard outline) · spawn it in a `MAPS` zone · icons for its drops in `ITEM_ICON`.
- **Player class / NPC art** → add the credited LPC PNG under `assets/lpc/` · map it in `LPC.player` or `LPC.npc` in `js/lpc.js` · keep a matching `PX.player`/`PX.npc` matrix fallback for headless tests and slow image loads.
- **Item / gear** → add to `CONTENT.items` (weapons/armor/accessory auto-roll rarity+affixes) · map an icon in `ITEM_ICON` · optional fields: `slot` (head/hands/feet/cloak), `rankReq` (guild-rank gate + featured-rotation pool), `buff: {stat, mult, durationMs}` (consumable buff), `teleport: <mapId>` (scroll).
- **Quest** objectives → `{ type: 'kill'|'collect'|'explore'|'talk', target, count }` — collect consumes on turn-in; explore target is a mapId; talk target is a map NPC id. selfCheck validates all four.
- **Skill** → add to `COMBAT.skills` (classId, type, power, cost, cooldown) · add a `PROGRESSION.skillTree` node (`maxLevel`, `reqLevel`, optional `reqSkill`/`reqTier`). The tree UI **auto-positions** it by dependency depth — no coordinates.
- **Passive** → one row in `PROGRESSION.passives` (classId, stat, per, maxLevel).
- **Quest** → add to `CONTENT.quests` (objective, rewards, `difficulty`, `nextQuestId` to chain).
- **Map / biome** → add to `MAPS` with a tile legend + spawns + portals; new tile types get a texture in `buildTile()`.
- **Balance** → tune `DESIGN.tuning` (level spread, exp-gap falloff, drop bias, zeny) and `DESIGN.xpCurve` in one place — no engine edits.
