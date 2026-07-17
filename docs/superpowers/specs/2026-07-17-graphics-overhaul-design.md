# Graphics Overhaul — reference-style pixel art, animation, tiles, UI, parallax

**Date:** 2026-07-17 · **Status:** approved by user
**Goal:** bring Aetheria Online's visuals up to the style of the user's reference
asset sheet: chunky outlined sprites with hand-drawn animation frames, a rich
tileset with ambient animation, a wood/parchment UI kit, and parallax backdrops.
Everything stays in the zero-asset architecture: hand-authored pixel matrices in
`js/pixelart.js` + procedural canvas + CSS. No image files, no build step.

## 1. Sprite & animation system

### 1a. Players + NPCs — LPC spritesheets (revised 2026-07-17, user-supplied MCP)

Humanoid sprites come from the LPC character MCP
(`https://lpc-character-mcp.gamezxz.workers.dev/mcp`, tool
`generate_random_character`, seedable): full Universal LPC spritesheets
(832×3456 PNG, 13×54 grid of 64×64 frames, 4 directions, spellcast/thrust/
walk/slash/shoot/hurt rows). Workflow: roll seeded batches, curate one sheet
per class archetype (7) + NPC role (4), commit PNGs under `assets/lpc/`
plus an attribution file (LPC assets are CC-BY-SA/GPL — credit the Universal
LPC Spritesheet project). This is a deliberate exception to the zero-image
rule, approved by the user by supplying the MCP.

Engine gains an LPC renderer in `js/game.js`: preload sheets, draw the
64×64 cell for (state, direction, frame) via `drawImage` source rects.
States: `idle` (walk frame 0), `walk` (9 frames), `attack` (slash rows,
6 frames), `cast` (spellcast rows, 7 frames, used for skill casts),
`hurt` (hurt row). Facing becomes true 4-direction (derived from the
existing facing vector). Row/frame constants verified against the actual
sheet at implementation time. Headless-safe: if `Image` is unavailable or a
sheet hasn't loaded, fall back to the existing pixel-matrix sprites (which
are kept as fallback art, so Node harnesses and slow loads still render).

### 1b. Monsters — hand-drawn frame sets (LPC is humanoid-only)

`PX.monster` changes from `name → matrix` to `name → { state → [matrix, …] }`:
23 monsters, redrawn ~20×20 (bosses gilded_ravager / flame_dragon / nullking up
to 32×32): `idle×2, walk×2, attack×2` (6 each, 138 total). Art rules from the
reference: hard `k` outline, 3-tone shading ramps (extend PAL as needed),
readable chunky shapes. Legacy single-matrix entries stay valid during
migration; `drawPx` resolves `state + frameIndex` with the `matrixCanvas`
cache key gaining `:state:frame`. Facing stays mirror-flip for monsters.
Cadence: idle ~600 ms/frame, walk ~140 ms/frame, attack over ~300 ms; state
picked per entity (attack timer set where swings resolve, walk while moving,
else idle). Missing sprite → colored rect fallback exactly as today.

## 2. Tileset upgrade + ambient animation

- `tileCache[type]` becomes an array of phase canvases for animated types; the
  renderer indexes by time. Animated: **water** (4-phase waves), **grass**
  (2-phase sway speckle), **tree** canopy (2-phase shimmer). Static types keep 1 phase.
- Edge transitions: when drawing a tile, look at the 4 neighbors; grass↔path,
  grass↔water, sand↔water get a drawn border strip (rounded shore, path fringe)
  instead of a hard color seam. Implemented as procedural overdraw keyed by a
  neighbor bitmask (cached).
- Richer static art in `drawTile`: trees with full canopies + trunk shadow, houses
  with shingled roofs and windows, fences, flowers, rocks, stumps — reference tileset vocabulary.

## 3. UI kit reskin (`js/theme.js` only)

Pure CSS: wood-plank panel frames (layered gradients + box-shadows, gold corner
studs), parchment panel interiors, chunky beveled HP/MP/XP bars, reference-style
buttons (green/blue/red beveled). No markup changes beyond what CSS hooks require.

## 4. Parallax backdrop

Procedurally drawn layers — sky gradient, drifting clouds, mountain silhouette,
treeline — rendered on the title screen and in the out-of-map void (replacing
black), scrolling at fractional camera speed (clouds also drift with time).

## 5. Verification (required per CLAUDE.md)

- `selfCheck()`: every player class / npc role must have an LPC sheet mapping
  (plus its matrix fallback), every monster a complete frame set with valid
  dimensions — fail loudly on any missing state/frame.
- `js/art.test.js` extended: monster frame-set completeness, per-frame palette
  validity, consistent dimensions within a state, LPC sheet files exist on disk.
- Headless Node harness per phase + headless Brave screenshots via `autotest.html`;
  new `anim=<state>:<frame>` query param freezes animation for deterministic shots.

## Phasing (each independently shippable)

1. LPC engine renderer + generate/curate the 7 class sheets + 4 NPC sheets (players & NPCs fully animated, 4-direction).
2. Monster frame-set engine support + pilot monsters (slime, goblin, wolf).
3. Remaining 20 monsters.
4. Tileset upgrade + ambient tile animation.
5. UI reskin.
6. Parallax backdrop.

## Out of scope

Run-vs-walk distinction, interact animation, mobile controls art, effects/FX
redraw, legacy `src/` project, 4-way facing for monsters (mirror-flip stays).
