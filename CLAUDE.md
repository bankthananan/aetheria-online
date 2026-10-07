# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Two codebases in one repo

1. **Active game — "Aetheria Online" (isekai RPG)**: `index.html` + `js/*.js`. Zero build step, no dependencies, plain ES modules + Web Audio. This is where all current work happens. Docs: `docs/ISEKAI_README.md`.
2. **Legacy — Vite "Ragnarok Draconic Expansion"**: `index.legacy.html` + `src/*.js`. Preserved, not actively developed.

## Tests

`npm test` runs `script/run-tests.mjs`, which auto-discovers every `js/**/*.test.js` plus the legacy `src/test_e2e_suite.js`, runs each in its own Node process, and exits non-zero on any failure. New `*.test.js` files are picked up automatically — no `package.json` edit needed. Filter with `node script/run-tests.mjs <substring|path>`; add `--bail`, `--verbose`, or `--list` as needed.

## Running the active game

ES modules can't load over `file://`, so serve the folder:

```bash
python3 -m http.server 8777
# open http://localhost:8777/   (index.html is the game)
```

Debug handle in the browser console: `window.__AWO` (exports engine internals — `G` state, `loadMap`, `gainXp`, `addItem`, `castSkillById`, `togglePanel`, …). Name the hero `admin` on the title screen for the in-game admin panel.

## Verification — required before claiming "done"

Every change is verified **two ways** (logic bugs hide from screenshots; render/load crashes hide from Node — e.g. a browser-only `process is not defined` crash that Node tests missed):

1. **Headless Node logic harness**: write a `.mjs` script (in a tmp dir, not the repo) that shims `window`/`document`/canvas 2d context/`AudioContext`/`localStorage`, imports `js/game.js`, and drives `window.__AWO` with `assert`. Run with `node <file>.mjs` and **judge by exit code, not by grepping output** — strings like "refine fail: ✓" false-match naive greps.
2. **Headless Brave screenshot** of the real UI via the auto-driver page `autotest.html`:
   ```bash
   "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser" --headless --disable-gpu \
     --screenshot=out.png --virtual-time-budget=5000 \
     "http://localhost:8777/autotest.html?panel=char&gear=1"
   ```
   then Read the PNG. `autotest.html` clicks through class-select/start and takes query params: `panel=char|inv|skills|quest|shop|admin`, `class=`, `map=`, `gear=1`, `adv=1`, `farm=1`, `admin=1`, `fx=1`, `fxskill=<id>`, `boss=1`, `slam=1`, and more (see the file). It surfaces runtime errors in a red banner so crashes show up in the screenshot.

If a harness needs an internal that isn't exported, add it to the `__AWO` export in `js/game.js`.

**Known test flakes**:
- Any assertion on player movement/facing must first park monsters (`G.monsters.forEach(m => { m.x = m.y = m.homeX = m.homeY = 2000; })`) — an adjacent spawn attacks, auto-retaliate re-faces the player, and the assertion flakes ~1 in 5.
- Deliver-kind guild bounties (40% of rolls) don't complete via `guildKill` — tests that kill-loop a bounty must force `kind === 'kill'` first.
- Never strict-equal floats that went through multiplication + rounding; use delta or range checks.
- Freeze visual animation in screenshot assertions (`anim=<state>:<frame>` and `tilephase=<n>`); ambient monster/tile frames otherwise change with virtual time.

## Architecture of the active game

- `js/game.js` (~6,800 lines) is the **engine**: game loop, combat, effects, quests, HUD, panels, shops, save/load. Self-contained runtime systems are modularized:
  - `js/pathing.js` — grid A* pathfinding and nearest-walkable search with windstream directional penalties
  - `js/selfcheck.js` — comprehensive boot integrity check and content audit
  - `js/render/tiles.js` — procedural 16×16 pixel tile generation and multi-layer parallax backdrops
  - `js/render/combat-fx.js` — trauma screen shake engine, geometric boss telegraph renderers (circle, fissure, cone, vortex), and spring-scaled combat floaties
  - `js/render/elite-fx.js` — rotating dashed cyan ring for Champions, radiant golden halo for Elites, hexagonal kinetic shield, and magma hazard pools
  - `js/render/weather-fx.js` — 16-bit ambient canvas weather particles (rain streaks, snowflakes, volcanic ash/embers, mist bands, starlight) with strict zero camera shake
  - `js/render/rift-fx.js` — Canvas 2D renderer for pulsating cosmic vortex ellipses, orbiting void sparks, and incursion HUD banner with strict zero camera shake
  - `js/render/gathering-fx.js` — Canvas 2D renderer for animated sparkling herbs, rocky mineral clusters, expanding water ripples, and retro wooden fishing HUD timing bar with strict zero camera shake
  - `js/render/cards-ui.js` — Canvas 2D and HTML renderers for Bestiary Codex UI in World Chronicle (`M`), card rarity frames, socketing modals, and Old Card Album opening fanfare with strict zero camera shake
  - `js/render/pets-fx.js` — Canvas 2D follower entity, smooth trailing kinematics, vacuum suction motes, floating heart/star emotes, and strict zero-shake rendering
  - `js/render/pets-ui.js` — World Chronicle 'Companions & Familiars' tab renderer, active companion banner, feast quick-feed tray, and responsive roster grid with boxing containment
  - `js/render/raids-fx.js` — Canvas 2D renderer for elemental ground rune circles, hexagonal Aegis energy dome, break gauge bar, geometric telegraphs (fissure box, breath cone, cataclysm ring), shatter bursts, and strict zero camera shake.
  - `js/render/raids-ui.js` — Top encounter HUD with segmented phase dividers, break shield meter, contribution pill, and victory summary modal with performance breakdown, spoils showcase, and strict boxing containment.
  - `js/render/spire-fx.js` — Canvas 2D affix shaders, ascendance portal with concentric rings and rising sparkles, milestone boss warning fanfare, and strict zero camera shake.
  - `js/render/spire-ui.js` — Top encounter HUD with biome and affix badges, 10-floor elevator modal selector, Spire Reliquary exchange catalog, and strict boxing containment (`box-sizing: border-box`, `min-width: 0`, `overflow-x: hidden`).
  - `js/systems/boss-mechanics.js` — Guardian encounter state machine, telegraph patterns, lingering ground hazards, and geometric collision tests (oriented box, cone, circle)
  - `js/systems/elite-monsters.js` — procedural Champion & Elite affixes (Molten, Frost Nova, Vortex, Shielding, Avenger), hazard lifecycle, damage mitigation, and bonus loot/gem multipliers
  - `js/systems/relics.js` — Relic & Legendary Artifact equipment system (8th paper-doll slot, on-hit procs, blood shield absorption, thorns, and Phoenix Feather lethal revive)
  - `js/systems/weather.js` — Dynamic World Weather cycling, elemental damage affinities, combat modifiers, and monster aggro range scaling
  - `js/systems/runes.js` — Elemental Rune Socketing & Socket Expansion subsystem (Blacksmith socket expansion up to 4 sockets, primal elemental runes, weapon elemental infusion, and defensive warding stats)
  - `js/systems/incursions.js` — World Event Rifts & Dimensional Incursions subsystem (overworld rift tears, 3-wave incursion encounters with Void Stalker Champions and Dimensional Herald mini-boss, dimensional mutators, weather surges, and Dimensional Cache loot generator)
  - `js/systems/gathering.js` — Gathering & Fishing subsystem: Tri-node resource placement, respawn timers, nocturnal Moonlight Lotus night filtering, storm-only Stormfin bite probability, retro 1-tap timing bar oscillating golden needle, sweet spot validation, and cooldown persistence
  - `js/systems/cards.js` — Monster Cards & Bestiary Codex subsystem: full 43-card catalog, rarity brackets, target slot affinities, LUK-scaled card drop rolls, Old Card Album roll weights, socketing/unsocketing validation, bestiary kill/drop tracking, and 6 zone album milestones
  - `js/systems/pets.js` — Companion & Pet Familiars Subsystem: 5 archetypes, LUK & HP-scaled wild creature taming, feast bonding, passive auras with Devoted multiplier, auto-loot radius, and persistence
  - `js/systems/raids.js` — Core Raid & World Boss Subsystem: 3 apex titan archetypes (Voidmaw Sovereign, Caldera Colossus, Ancient Behemoth), 7-stage state machine, Aegis break-shield staggering, minion mitigation scaling, apex enrage corona, and tiered contribution grading (Bronze -> Paragon).
  - `js/systems/spire.js` — Core Abyssal Spire Challenge Tower Subsystem: 100-floor challenge tower partitioned into 5 biome tiers (Shadow Depths, Glacial Ascent, Magma Foundry, Storm Spires, Void Zenith), 8 dynamic environmental affixes, milestone boss scaling every 10 floors up to Floor 100 (Primordial Nullking), permanent elevator checkpoints every 10 floors, Spire Emblem economy, relics (`crown_of_the_ascendant`, `abyssal_compass`, `spire_sigil`), 6 weapon transmogs, and prestige titles.
  - `js/systems/guild.js` — Adventurer's Guild bounties, rank ladder, and turn-ins
  - `js/systems/*.js` (boss-mechanics, dailies, difficulty, elite-monsters, exploration, game-clock, gathering, guidance, incursions, loadouts, loot-preferences, mastery, pets, player-features, raids, rare-spawns, relics, runes, spire, subdungeon, weather)
  - `js/input.js`, `js/viewport.js`, `js/expansion-runtime.js`, `js/guidance-runtime.js`, `js/equipment-features.js`
  - `js/zones/` holds per-zone content packages.
  The remaining `js/` modules are **logic-free data modules**.
- **The data modules ARE the database** — a deliberate, settled decision (the user has declined DB migration twice). Do not propose moving content to JSON/SQLite/IndexedDB. Static imports are version-controlled, diff-able, and zero-build; a DB adds a load step for zero gain.
  - `js/design.js` — classes, stat formulas, `xpCurve`, and the `tuning` balance knobs (all balance changes go here, never in engine code)
  - `js/combat.js` — active skills + combat rules
  - `js/content.js` — monsters, items, NPCs, quests
  - `js/maps.js` — biomes, tile legends, spawns, portals
  - `js/progression.js` — skill tree nodes, passives, class tiers
  - `js/loot.js` — rarity tiers + affix pool
  - `js/pixelart.js` — pixel-matrix sprites + `ITEM_ICON` map; `js/sprites.js` — title-screen portraits; `js/theme.js` — CSS design system; `js/audio.js` — Web Audio chiptune/SFX
- `selfCheck()` in `js/selfcheck.js` (called from `js/game.js`) runs at load and **fails loudly** on any mis-wiring: spawn/drop/reward pointing at an unknown id, skill without a tree node, monster without a sprite, missing item icon, bad quest difficulty, non-finite formula. When adding content, reload and let it tell you what's missing.
- Step-by-step recipes for adding monsters/items/skills/quests/maps are in the "Extending the game" section of `docs/ISEKAI_README.md` — each is one data-module edit plus whatever `selfCheck()` demands.

## Legacy project (src/)

Only touch when explicitly asked. Its test suite runs headlessly in Node with mocked browser globals:

```bash
npm run test:legacy           # = node src/test_e2e_suite.js (also included in npm test)
node src/test_draconic.js     # or any other src/test_*.js individually
```

Exit code 0 = pass, 1 = fail. Historical test design notes live in `docs/archive/TEST_INFRA.md`.
