# Graphics Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring Aetheria Online's visuals to the user's reference asset-sheet style: LPC-animated players/NPCs (4-direction walk/attack/cast), hand-drawn animated monster frames, animated + edge-blended tileset, wood/parchment UI, parallax backdrop.

**Architecture:** Players/NPCs render from Universal LPC spritesheet PNGs (`assets/lpc/`) generated via the user's LPC character MCP; existing pixel matrices stay as headless/loading fallback. Monsters upgrade `PX.monster` entries from single matrices to `{state: [frames]}` objects rendered by an extended `drawPx`. Tiles gain phase-array caches for ambient animation and neighbor-aware edge overdraw. UI is CSS-only in `js/theme.js`. Spec: `docs/superpowers/specs/2026-07-17-graphics-overhaul-design.md`.

**Tech Stack:** Plain ES modules, canvas 2D, no build step. Verification per CLAUDE.md: headless Node harness (judge by exit code) + headless Brave screenshots of `autotest.html`.

## Global Constraints

- Serve with `python3 -m http.server 8777`; game at `http://localhost:8777/`.
- Every task verifies BOTH ways before "done": Node `.mjs` harness in the scratchpad (never the repo) driving `window.__AWO`, judged by exit code; and a headless Brave screenshot of `autotest.html` that is actually Read and eyeballed.
- Brave: `"/Applications/Brave Browser.app/Contents/MacOS/Brave Browser" --headless --disable-gpu --screenshot=<out>.png --virtual-time-budget=5000 "<url>"`.
- Park monsters before any movement/facing assertion: `G.monsters.forEach(m => { m.x = m.y = m.homeX = m.homeY = 2000; })`.
- No new dependencies. No engine logic in data modules. Balance knobs never touched.
- Monster art style contract (applies to every monster frame task): hard `k` outline around the full silhouette; ≥3 shading tones per material (extend `PAL` with new ramp keys when needed — every new key gets a hex + comment); width ≤32, height ≤32; frames within one state share identical dimensions; walk frames differ from idle by limb/body offsets (not palette swaps); attack frames show a wind-up + strike silhouette change.
- Monster frame contract: `{ idle: [f0,f1], walk: [f0,f1], attack: [f0,f1] }` — exactly these states, exactly 2 frames each.
- LPC sheet layout (verify once in Task 2, then trust): 64×64 cells, 13 cols; row groups of 4 directions in order up/left/down/right — spellcast rows 0–3 (7 frames), thrust 4–7 (8), walk 8–11 (9), slash 12–15 (6), shoot 16–19 (13), hurt row 20 (6 frames, down-facing only).
- Commit after every task with a conventional message ending in the Claude Fable co-author trailer.

---

### Task 1: LPC renderer + player animation state machine (engine)

**Files:**
- Modify: `js/game.js` (drawPlayer ~2355, basicAttack ~1018, castSkill ~1160-1179, player-damage sites ~1326 & ~1350, preloadSprites ~2204, `__AWO` export ~4600s)
- Create: `js/lpc.js` (data module: sheet metadata)

**Interfaces:**
- Produces: `js/lpc.js` exports `LPC = { cell: 64, cols: 13, states: { cast:{row:0,frames:7}, thrust:{row:4,frames:8}, walk:{row:8,frames:9}, attack:{row:12,frames:6}, hurt:{row:20,frames:6,downOnly:true} }, dirs: ['up','left','down','right'], player: { blade:'assets/lpc/blade.png', … }, npc: { shop:'assets/lpc/npc_shop.png', … } }` (player/npc maps filled by Tasks 2–3; empty objects until then).
- Produces in `js/game.js`: `lpcImage(src)` (cached loader, returns HTMLImageElement or null when headless/unloaded); `drawLpc(src, cx, cy, state, dir, frame, size)` → bool; `playerAnim(p)` → `{state, dir, frame}`; timers `p.animAttackUntil`, `p.animCastUntil`, `p.hurtUntil`; `G.debugAnim` freeze override `{state, frame, dir?}`.

- [ ] **Step 1: Create `js/lpc.js`** with the metadata above (player/npc maps empty for now), logic-free.

- [ ] **Step 2: Engine wiring in `js/game.js`.** Import LPC. Add:

```js
// ---- LPC spritesheet rendering (players/NPCs); pixel matrices remain the fallback ----
const lpcCache = {};
function lpcImage(src) {
  if (!src || typeof Image === 'undefined') return null;      // headless-safe
  let img = lpcCache[src];
  if (!img) { img = new Image(); img.src = src; lpcCache[src] = img; }
  return img.complete && img.naturalWidth ? img : null;
}
function drawLpc(src, cx, cy, state, dir, frame, size) {
  const img = lpcImage(src); if (!img) return false;
  const st = LPC.states[state] || LPC.states.walk;
  const row = st.row + (st.downOnly ? 0 : LPC.dirs.indexOf(dir));
  const f = Math.min(frame, st.frames - 1);
  const c = LPC.cell;
  ctx.drawImage(img, f * c, row * c, c, c, Math.round(cx - size / 2), Math.round(cy - size + c * 0.28), size, size);
  return true;
}
function facingDir(p) {
  const { x, y } = p.facing;
  return Math.abs(x) >= Math.abs(y) ? (x < 0 ? 'left' : 'right') : (y < 0 ? 'up' : 'down');
}
const ANIM = { walkMs: 90, attackMs: 340, castMs: 420, hurtMs: 200, idleMs: 600 };
function playerAnim(p) {
  if (G.debugAnim) return { state: G.debugAnim.state, dir: G.debugAnim.dir || 'down', frame: G.debugAnim.frame | 0 };
  const t = now(), dir = facingDir(p);
  if (p.hurtUntil > t) return { state: 'hurt', dir, frame: Math.floor((ANIM.hurtMs - (p.hurtUntil - t)) / (ANIM.hurtMs / 3)) };
  if (p.animCastUntil > t) return { state: 'cast', dir, frame: Math.floor((ANIM.castMs - (p.animCastUntil - t)) / (ANIM.castMs / 7)) };
  if (p.animAttackUntil > t) return { state: 'attack', dir, frame: Math.floor((ANIM.attackMs - (p.animAttackUntil - t)) / (ANIM.attackMs / 6)) };
  if (p.moving) return { state: 'walk', dir, frame: 1 + Math.floor(t / ANIM.walkMs) % 8 };
  return { state: 'walk', dir, frame: 0 };                    // walk frame 0 = standing idle
}
```

- [ ] **Step 3: Use it in `drawPlayer`.** Before the existing matrix path: `const a = playerAnim(p); if (drawLpc(LPC.player[p.combatClass], px, py + 8, a.state, a.dir, a.frame, 64)) { /* skip matrix path */ } else { …existing playerWalk/bob code unchanged… }`. Keep the shadow/buff ring.

- [ ] **Step 4: Set timers.** `p.animAttackUntil = now() + ANIM.attackMs;` in `basicAttack` next to `p.attackCdUntil` (~1019). `p.animCastUntil = now() + ANIM.castMs;` in `castSkill` where the cooldown is set (~1179). `p.hurtUntil = now() + ANIM.hurtMs;` at both `p.hp -= dmg` sites (~1326, ~1350). Add `G.debugAnim = null` to state init; export `LPC` and nothing else new via `__AWO` (G already exposed).

- [ ] **Step 5: Node harness** (scratchpad `lpc-engine.test.mjs`): shim globals WITHOUT `Image` (headless path), import game, assert: `playerAnim` returns walk frame 0 when still, walk frames 1–8 cycle when `p.moving=true`; after `A.castSkillById(...)` or setting `p.animAttackUntil`, state is attack; `drawLpc('x',0,0,'walk','down',0,64) === false` headless; park monsters first. Exit code judges.

- [ ] **Step 6: Screenshot** `autotest.html` (no params) — game must render identically to before (fallback path, no LPC files yet exist). Read the PNG; no red banner.

- [ ] **Step 7: Commit** `feat: LPC spritesheet renderer + player animation state machine (fallback-safe)`.

### Task 2: Generate + curate the 7 class sheets; wire them in

**Files:**
- Create: `assets/lpc/<class>.png` ×7 (blade, berserker, mage, ranger, paladin, monk, elementalist), `assets/lpc/CREDITS.md`
- Modify: `js/lpc.js` (fill `LPC.player`), `autotest.html` (anim freeze param)

**Interfaces:**
- Consumes: Task 1's `drawLpc`/`playerAnim`/`G.debugAnim`.
- Produces: committed PNGs + filled `LPC.player` map; autotest param `anim=<state>:<frame>[:dir]` → sets `A.G.debugAnim`.

- [ ] **Step 1: Roll candidates.** MCP over curl (session handshake as below), `count: 8` per call, fixed seeds for reproducibility (`seed: 100, 200, …`), bodyType varied. Save each returned PNG URL to the scratchpad. Repeat until every archetype has a plausible match: blade=armored sword-bearer, berserker=muscular/wild, mage=robed, ranger=hooded/leather, paladin=heavy armor + bright palette, monk=simple robe/wraps, elementalist=ornate robe. Cat-ears/cyclops-type rolls are rejected.

```bash
SID=$(curl -s -D - -o /dev/null -X POST https://lpc-character-mcp.gamezxz.workers.dev/mcp \
  -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"curl","version":"1.0"}}}' \
  | tr -d '\r' | awk -F': ' 'tolower($1)=="mcp-session-id"{print $2}')
curl -s -X POST … -H "Mcp-Session-Id: $SID" -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"generate_random_character","arguments":{"count":8,"bodyType":"male","seed":100}}}'
```

- [ ] **Step 2: Curate.** Crop each candidate's walk-down row (`sips` crop or Read the PNG) and Read it; pick the 7. Copy the chosen PNGs to `assets/lpc/<class>.png`. Verify the row-layout constants once against one sheet (crop row 8 = walk-up etc.); fix `js/lpc.js` constants if they differ.

- [ ] **Step 3: Fill `LPC.player`** with the 7 paths. Write `assets/lpc/CREDITS.md`: sheets generated with the Universal LPC Spritesheet Generator character assets (CC-BY-SA 3.0 / GPL 3.0) via lpc-character-mcp; link https://github.com/liberatedpixelcup/Universal-LPC-Spritesheet-Character-Generator.

- [ ] **Step 4: autotest anim param.** In `autotest.html` after class start: `const anim = params.get('anim'); if (anim) { const [st, fr, dir] = anim.split(':'); A.G.debugAnim = { state: st, frame: +fr || 0, dir: dir || 'down' }; }`.

- [ ] **Step 5: Screenshots** for each class: `autotest.html?class=<class>` plus one `anim=attack:3` and one `anim=walk:4` shot for blade. Read PNGs: LPC character visible, correctly scaled/anchored (feet near tile), no cell-bleed.

- [ ] **Step 6: Node harness**: assert `LPC.player` covers all 7 combat classes and every mapped file exists on disk (`fs.access`), art.test.js additions come in Task 4.

- [ ] **Step 7: Commit** `feat: LPC character sheets for all 7 classes + anim freeze param`.

### Task 3: NPC sheets

**Files:**
- Create: `assets/lpc/npc_shop.png`, `npc_quest.png`, `npc_guild.png`, `npc_story.png`
- Modify: `js/lpc.js` (fill `LPC.npc`), `js/game.js` (`drawNpc` ~2321)

**Interfaces:**
- Consumes: `drawLpc`; NPC roles shop/quest/guild/story.
- Produces: NPCs render LPC idle (walk frame 0, facing down) with a slow 2-frame shuffle: `drawLpc(LPC.npc[n.role], x, y + 8, 'walk', 'down', Math.floor(now() / 800) % 2, 64)` before the existing matrix fallback in `drawNpc`.

- [ ] **Step 1:** Roll + curate 4 civilian-looking sheets (trader=apron-ish, guild=imposing, quest=friendly, story=elder/robed), same MCP loop; save + fill `LPC.npc`.
- [ ] **Step 2:** Modify `drawNpc` as above (keep label code).
- [ ] **Step 3:** Screenshot town (`autotest.html` default map): NPCs visible as LPC characters with labels. Node harness: `LPC.npc` covers all 4 roles, files exist.
- [ ] **Step 4: Commit** `feat: LPC NPC sheets for all 4 roles`.

### Task 4: Monster frame-set support in drawPx + validation

**Files:**
- Modify: `js/game.js` (`drawPx` ~2024, `drawMonster` ~2335, monster attack ~1342, monster movement step, `selfCheck` ~303-306, `preloadSprites` ~2204), `js/art.test.js`

**Interfaces:**
- Consumes: existing `PX.monster` single matrices.
- Produces: `drawPx(group, name, cx, cy, size, flip, state = 'idle', frame = 0)` accepting both legacy matrices and `{idle:[…], walk:[…], attack:[…]}`; `monsterAnim(m)` → `{state, frame}`; `m.animAttackUntil`, `m.movedAt`.

- [ ] **Step 1: Extend `drawPx`:**

```js
function drawPx(group, name, cx, cy, size, flip, state = 'idle', frame = 0) {
  let rows = PX[group]?.[name]; if (!rows) return false;
  let key = group + ':' + name;
  if (!Array.isArray(rows)) {                                  // frame-set object
    const st = rows[state] ? state : 'idle';
    const frames = rows[st]; if (!frames?.length) return false;
    const fi = frame % frames.length;
    rows = frames[fi]; key += ':' + st + ':' + fi;
  }
  const cvs = matrixCanvas(key, rows);
  …rest unchanged…
}
```

- [ ] **Step 2: `monsterAnim` + wiring:**

```js
function monsterAnim(m) {
  if (G.debugAnim) return { state: G.debugAnim.state, frame: G.debugAnim.frame | 0 };
  const t = now();
  if (m.animAttackUntil > t) return { state: 'attack', frame: (m.animAttackUntil - t) > 150 ? 0 : 1 };
  if (t - (m.movedAt || 0) < 120) return { state: 'walk', frame: Math.floor(t / 180) % 2 };
  return { state: 'idle', frame: Math.floor(t / 600) % 2 };
}
```

In `drawMonster`: `const a = monsterAnim(m); if (!drawPx('monster', m.def.id, x, y, s, m.facingLeft, a.state, a.frame)) …fallback…` (add `m.facingLeft = p.x < m.x` while chasing if not already tracked; otherwise omit flip). Set `m.animAttackUntil = now() + 300` in the monster attack block (~1343); set `m.movedAt = now()` where monster x/y change in the movement/path step.

- [ ] **Step 3: `preloadSprites`** — iterate frame-set entries: for objects, cache every `state:frame`.

- [ ] **Step 4: `selfCheck`** — replace the monster sprite check: legacy array entries still pass; object entries must have exactly `idle/walk/attack` with 2 same-sized frames each, else push an error string naming monster+state.

- [ ] **Step 5: `js/art.test.js`** — replace the per-matrix loop with a normalizer: `const frames = Array.isArray(entry) ? [entry] : Object.values(entry).flat()` and run existing checks per frame; for object entries assert the exact state/frame contract; also assert `assets/lpc/*.png` exist for every `LPC.player`/`LPC.npc` mapping (import LPC from `js/lpc.js`, use `node:fs`).

- [ ] **Step 6: Verify** — `node js/art.test.js` exit 0; Node harness drives a monster attack (`m.animAttackUntil` future → `monsterAnim(m).state === 'attack'`); screenshot unchanged-looking game (all monsters still legacy matrices). Commit `feat: frame-set monster animation pipeline + validation`.

### Task 5: Pilot monster frames — slime, goblin, wolf

**Files:**
- Modify: `js/pixelart.js` (replace 3 `monster` entries with frame sets)

**Interfaces:** frame contract + style contract from Global Constraints; existing PAL keys preferred, new ramps allowed.

- [ ] **Step 1:** Redraw `slime` as `{idle:[…2], walk:[…2], attack:[…2]}` ~20×16 (squash/stretch between idle frames, lean forward + lunge for attack). Start from the existing matrix as the silhouette base.
- [ ] **Step 2:** Same for `goblin` (~20×22: idle breathe, walk leg swap, attack club swing) and `wolf` (~24×18: idle tail/ear twitch, walk gallop poses, attack pounce).
- [ ] **Step 3:** `node js/art.test.js` exit 0 (contract enforced). Reload check: Node harness boots game (selfCheck passes).
- [ ] **Step 4:** Screenshots: `autotest.html?anim=idle:0`, `?anim=idle:1`, `?anim=attack:1` on the starter map (slime/goblin/wolf spawn there). Read each: frames visibly differ, no clipped pixels.
- [ ] **Step 5: Commit** `feat: animated frame sets for slime, goblin, wolf`.

### Tasks 6–9: Remaining 20 monsters (4 batches of 5)

Same files, interfaces, steps, and verification as Task 5, one commit per batch:

- [ ] **Task 6:** thornback_boar, shade, mire_leech, drowned_acolyte, elderwood_treant — screenshot map `whispering_woods` / `sunken_ruins`.
- [ ] **Task 7:** frost_revenant, frost_wolf, ice_wraith, rime_harpy, ruin_golem — screenshot `frostpeak_tundra`.
- [ ] **Task 8:** sand_stalker, ember_imp, magma_beetle, flame_dragon (boss, ≤32×32), gilded_ravager (boss, ≤32×32) — screenshot `dragon_caldera`.
- [ ] **Task 9:** void_wisp, star_reaver, astral_knight, rift_manta, nullking (boss, ≤32×32) — screenshot `astral_rift`. After this task NO legacy monster matrices remain: flip the `selfCheck` monster rule to REQUIRE frame-set objects.

### Task 10: Animated tiles (water / grass / tree)

**Files:**
- Modify: `js/game.js` (`buildTile` ~2045, `drawTile` ~2198, `preloadSprites`)

**Interfaces:**
- Produces: `buildTile(type, phase = 0)` cached as `tileCache[type + ':' + phase]`; `const TILE_PHASES = { water: 4, grass: 2, tree: 2 };` `const TILE_PHASE_MS = { water: 260, grass: 420, tree: 420 };` `drawTile(type, x, y)` picks `phase = Math.floor(now() / TILE_PHASE_MS[type]) % TILE_PHASES[type]` for animated types, 0 otherwise.

- [ ] **Step 1:** Thread `phase` through `buildTile`/`drawTile`/`preloadSprites` (preload all phases).
- [ ] **Step 2:** Water: shift the existing wave-highlight rows/pixels by phase (e.g. highlight x-offset `(phase * 4) % 16`, second row counter-phase). Grass: phase 1 nudges the blade/speckle pixels 1px and swaps 2–3 speckle positions. Tree: phase 1 shifts canopy highlight pixels 1px (shimmer).
- [ ] **Step 3:** Node harness: `buildTile('water',0)` and `buildTile('water',1)` return distinct cached canvases; non-animated type returns the same object for any phase.
- [ ] **Step 4:** Two screenshots ~600ms of virtual time apart aren't feasible in one run — instead screenshot with a forced phase: temporarily accept `A.G.debugTilePhase` (checked in `drawTile`), set via new autotest param `tilephase=1`; compare `tilephase=0` vs `tilephase=1` PNGs for visible water difference.
- [ ] **Step 5: Commit** `feat: ambient tile animation (water waves, grass sway, canopy shimmer)`.

### Task 11: Tile edge transitions

**Files:**
- Modify: `js/game.js` (render loop tile pass ~2226-2233)

**Interfaces:**
- Produces: `drawTileEdges(type, col, row, x, y)` called after each `drawTile`; uses `tileChar(col±1, row±1)` + `G.legend` to find neighbor types; draws direct (uncached) strips.

- [ ] **Step 1:** Implement: water tile with land neighbor → 2px sand/foam strip on that edge (`#e8dcae` over `#dff2ff` dots); path/road tile with grass neighbor → 1-2px grass fringe pixels; snow↔grass and lava↔rock get a 1px darkened blend line. ~30 lines, four `if (neighborType !== …)` strips per tile, only for types in a small `EDGE_RULES` map.
- [ ] **Step 2:** Node harness: shim ctx recording fillRect calls; assert a water tile bordered by grass triggers edge fills and an all-water interior tile does not.
- [ ] **Step 3:** Screenshot starter map shoreline + path: coastline reads as a shore, not a hard seam. Commit `feat: neighbor-aware tile edge transitions`.

### Task 12: Richer static tiles

**Files:**
- Modify: `js/game.js` (`buildTile` bodies for: tree, roof, hwall, door, window, fence, flowers, rock, stall, lamp, bridge, hedge)

- [ ] **Step 1:** Upgrade drawings toward the reference: tree = round layered canopy (3 greens + `k` outline) on a visible trunk with root shadow; roof = shingle rows with ridge highlight; hwall = plank/timber framing; window = cross-muntin + warm glow; fence = post-and-rail with outline; flowers = 3-color clusters; rock = faceted boulder with outline; stall = striped awning; lamp = iron post + glow halo; bridge = plank run with rails; hedge = lumpy outlined bush row.
- [ ] **Step 2:** Screenshots: town map + `whispering_woods`; Read and compare against reference vocabulary (chunky, outlined, 3-tone). Node: art.test + full boot suite still exit 0.
- [ ] **Step 3: Commit** `feat: reference-style tile art upgrade`.

### Task 13: UI kit reskin

**Files:**
- Modify: `js/theme.js` only (css string + palette entries)

**Interfaces:** all existing class names/markup unchanged.

- [ ] **Step 1:** Add wood/gold vars (`--wood:#8a5a2b;--wood-dark:#5d3a1a;--wood-light:#b97f45;--gold:#e8b74a;--parchment` stays). Reskin: `.panel`, `.dialogue`, `.toast`, `.sk-tip`, `.slot-picker` → wood frame (border + inset gradient via layered `box-shadow`s + `linear-gradient` background on a parchment body); `.panel__head` → carved-wood header with gold text; `.bar` → chunky 2px-black-border bevel with gloss line (`linear-gradient` overlay), HP green-red per reference stays red family; `.skill-btn`, `.btn` → beveled reference-style buttons (green primary, blue ghost, red danger); `.hotbar`, `.stat-stack`, `.minimap`, `.quest-tracker` → wood-framed. Keep reduced-motion + mobile blocks working.
- [ ] **Step 2:** Screenshots: `panel=char&gear=1`, `panel=inv`, `panel=skills`, `panel=shop`, dialogue (`dlg=1` if that param exists — otherwise default town interaction shot), plus bare HUD. Read each: frames/bars/buttons match the reference kit, text readable, no overflow at 680px width (add `--window-size=680,800` variant for the mobile media query).
- [ ] **Step 3:** Node: full test suite (`for t in js/*.test.js; do node $t || exit 1; done`) exit 0. Commit `feat: wood-and-parchment UI reskin`.

### Task 14: Parallax backdrop

**Files:**
- Modify: `js/game.js` (`render` start ~2218-2222)

**Interfaces:**
- Produces: `drawParallax(cx, cy)` replacing the flat `THEME.palette.bg` fill: sky gradient → 2 cloud bands (drift `now()/40000`, parallax `cx * 0.1`) → mountain silhouette strip (`cx * 0.25`) → treeline strip (`cx * 0.5`), each a cached offscreen canvas tiled horizontally.

- [ ] **Step 1:** Implement with 3 cached strips (built once, headless-safe guards like `buildTile`). Only visible where tiles don't cover (map edges / void); also becomes the title-screen canvas backdrop automatically since render runs behind the DOM title.
- [ ] **Step 2:** Node: harness asserts render() runs without error headless (existing boot test covers). Screenshot: warp near a map edge (`map=astral_rift` has void borders; or clamp camera past edge on small map) → layers visible instead of flat charcoal. Day/night tint still applies on top (verify with `night=1`).
- [ ] **Step 3: Commit** `feat: parallax sky/mountain/treeline backdrop`.

### Task 15: Final sweep

- [ ] **Step 1:** Run every `js/*.test.js` (exit codes), then screenshot matrix: each of the 6 maps, 3 panels, one attack anim freeze, night mode. Read all.
- [ ] **Step 2:** Fix anything selfCheck or screenshots surface.
- [ ] **Step 3:** Update `ISEKAI_README.md` "Extending the game" (monster recipe now = 6-frame set; new class/NPC = LPC sheet + `LPC.player` entry) and CLAUDE.md's known-flakes section if animation introduces new ones.
- [ ] **Step 4:** Commit `docs: graphics overhaul notes` and push (user has auto-deploy via GitHub Pages).
