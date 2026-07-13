# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Two codebases in one repo

1. **Active game — "Aetheria Online" (isekai RPG)**: `index.html` + `js/*.js`. Zero build step, no dependencies, plain ES modules + Web Audio. This is where all current work happens. Docs: `ISEKAI_README.md`.
2. **Legacy — Vite "Ragnarok Draconic Expansion"**: `index.legacy.html` + `src/*.js`. Preserved, not actively developed. All `package.json` scripts (`npm run dev/build`, `npm test`) target this legacy project, **not** the active game.

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

## Architecture of the active game

- `js/game.js` (~2700 lines) is the **engine**: game loop, movement/A* pathing, combat, effects, quests, HUD, panels, shops, save/load. Everything else in `js/` is a **logic-free data module**.
- **The data modules ARE the database** — a deliberate, settled decision (the user has declined DB migration twice). Do not propose moving content to JSON/SQLite/IndexedDB. Static imports are version-controlled, diff-able, and zero-build; a DB adds a load step for zero gain.
  - `js/design.js` — classes, stat formulas, `xpCurve`, and the `tuning` balance knobs (all balance changes go here, never in engine code)
  - `js/combat.js` — active skills + combat rules
  - `js/content.js` — monsters, items, NPCs, quests
  - `js/maps.js` — biomes, tile legends, spawns, portals
  - `js/progression.js` — skill tree nodes, passives, class tiers
  - `js/loot.js` — rarity tiers + affix pool
  - `js/pixelart.js` — pixel-matrix sprites + `ITEM_ICON` map; `js/sprites.js` — title-screen portraits; `js/theme.js` — CSS design system; `js/audio.js` — Web Audio chiptune/SFX
- `selfCheck()` in `js/game.js` runs at load and **fails loudly** on any mis-wiring: spawn/drop/reward pointing at an unknown id, skill without a tree node, monster without a sprite, missing item icon, bad quest difficulty, non-finite formula. When adding content, reload and let it tell you what's missing.
- Step-by-step recipes for adding monsters/items/skills/quests/maps are in the "Extending the game" section of `ISEKAI_README.md` — each is one data-module edit plus whatever `selfCheck()` demands.

## Legacy project (src/)

Only touch when explicitly asked. Its test suite runs headlessly in Node with mocked browser globals:

```bash
npm test                      # = node src/test_e2e_suite.js
node src/test_draconic.js     # or any other src/test_*.js individually
```

Exit code 0 = pass, 1 = fail. Test design notes live in `TEST_INFRA.md`.
