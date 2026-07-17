# Graphics Overhaul — reference-style pixel art, animation, tiles, UI, parallax

**Date:** 2026-07-17 · **Status:** approved by user
**Goal:** bring Aetheria Online's visuals up to the style of the user's reference
asset sheet: chunky outlined sprites with hand-drawn animation frames, a rich
tileset with ambient animation, a wood/parchment UI kit, and parallax backdrops.
Everything stays in the zero-asset architecture: hand-authored pixel matrices in
`js/pixelart.js` + procedural canvas + CSS. No image files, no build step.

## 1. Sprite & animation system

### Data shape (`js/pixelart.js`)
`PX.player`, `PX.monster`, `PX.npc` change from `name → matrix` to
`name → { state → [matrix, …] }`:

- **player** (7 classes, redrawn at 24×32): `idle×2, walk×4, attack×3, hurt×1, defeat×1` (11 frames/class, 77 total)
- **monster** (23, redrawn ~20×20; bosses gilded_ravager / flame_dragon / nullking up to 32×32): `idle×2, walk×2, attack×2` (6 each, 138 total)
- **npc** (shop/quest/guild/story): `idle×2` (8 total)

`PX.item` is unchanged. Art rules from the reference: hard `k` outline around
every silhouette, 3-tone shading ramps (add palette entries as needed), readable
chunky shapes.

### Engine (`js/game.js`)
- Animation clock derives frame from `G.time` (or perf clock already driving the loop).
  Cadence: idle ~600 ms/frame, walk ~140 ms/frame, attack plays its 3 frames over ~300 ms.
- State selection per entity: `defeat` if dead (player), `hurt` for ~150 ms after
  taking damage, `attack` while an attack anim timer runs (set where swings/casts
  resolve), `walk` while moving, else `idle`.
- `drawPx(group, name, …)` resolves `state + frameIndex`; `matrixCanvas` cache key
  gains `:state:frame`. Facing stays horizontal mirror-flip.
- Fallbacks preserved: missing sprite → colored rect/circle exactly as today.

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

- `selfCheck()`: every player class / monster / npc role must have a complete
  frame set with valid dimensions — fail loudly on any missing state/frame.
- `js/art.test.js` extended: frame-set completeness, per-frame palette validity,
  consistent dimensions within a state.
- Headless Node harness per phase + headless Brave screenshots via `autotest.html`;
  new `anim=<state>:<frame>` query param freezes animation for deterministic shots.

## Phasing (each independently shippable)

1. Engine animation system + pilot art (1 class: blade; 3 monsters: slime, goblin, wolf) — proves the pipeline end to end.
2. Remaining 6 player classes + 4 NPCs.
3. Remaining 20 monsters.
4. Tileset upgrade + ambient tile animation.
5. UI reskin.
6. Parallax backdrop.

## Out of scope

Directional (4-way) sprite art (mirror-flip stays), run-vs-walk distinction,
interact animation, mobile controls art, effects/FX redraw, legacy `src/` project.
