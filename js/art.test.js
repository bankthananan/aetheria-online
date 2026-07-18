import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PAL, PX } from './pixelart.js';
import { MAPS } from './maps.js';
import { CONTENT } from './content.js';
import { THEME } from './theme.js';
import { LPC } from './lpc.js';
import { buildHeatField, connectedWalkableTiles, heatDepthAt, nextPortalToward } from './pathing.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');

const HEX = /^#[0-9a-f]{6}$/i;
const spriteGroups = ['player', 'playerWalk', 'npc', 'monster', 'item'];

for (const [key, color] of Object.entries(PAL)) {
  assert.ok(color == null || HEX.test(color), `palette key ${key} has invalid color ${color}`);
}

for (const group of spriteGroups) {
  assert.ok(PX[group] && Object.keys(PX[group]).length, `${group} sprite group is empty`);
  for (const [name, entry] of Object.entries(PX[group])) {
    const isFrameSet = !Array.isArray(entry);
    if (isFrameSet) {                                          // {idle/walk/attack:[frame,frame]} contract
      assert.deepEqual(Object.keys(entry).sort(), ['attack', 'idle', 'walk'], `${group}.${name} frame-set must have exactly idle/walk/attack`);
      for (const st of ['idle', 'walk', 'attack']) {
        const frames = entry[st];
        assert.equal(frames.length, 2, `${group}.${name}.${st} must have exactly 2 frames`);
        const h0 = frames[0].length, w0 = Math.max(...frames[0].map(row => row.length));
        frames.forEach((f, fi) => {
          const h = f.length, w = Math.max(...f.map(row => row.length));
          assert.ok(h === h0 && w === w0, `${group}.${name}.${st} frame ${fi} dimension mismatch`);
          assert.ok(h <= 32 && w <= 32, `${group}.${name}.${st} frame ${fi} exceeds 32x32`);
        });
      }
    }
    const frames = isFrameSet ? Object.values(entry).flat() : [entry];
    for (const rows of frames) {
      assert.ok(Array.isArray(rows) && rows.length >= 8, `${group}.${name} needs a readable sprite matrix`);
      const width = Math.max(...rows.map(row => row.length));
      assert.ok(width >= 8 && width <= 32 && rows.length <= 32, `${group}.${name} exceeds the supported sprite scale`);
      let painted = 0;
      const colors = new Set();
      for (const row of rows) {
        assert.equal(typeof row, 'string', `${group}.${name} contains a non-string row`);
        for (const pixel of row) {
          assert.ok(pixel === ' ' || pixel === '.' || pixel in PAL, `${group}.${name} uses unknown palette key '${pixel}'`);
          if (PAL[pixel]) { painted++; colors.add(pixel); }
        }
      }
      assert.ok(painted >= 20, `${group}.${name} silhouette is too sparse`);
      assert.ok(colors.size >= 3, `${group}.${name} needs at least three material/shading colors`);
    }
  }
}

for (const [id, file] of Object.entries(LPC.player)) assert.ok(fs.existsSync(path.join(repoRoot, file)), `LPC.player.${id} sheet missing on disk: ${file}`);
for (const [role, file] of Object.entries(LPC.npc)) assert.ok(fs.existsSync(path.join(repoRoot, file)), `LPC.npc.${role} sheet missing on disk: ${file}`);

for (const id of ['blade', 'berserker', 'mage', 'ranger', 'paladin', 'monk', 'elementalist']) {
  assert.ok(PX.player[id] && PX.playerWalk[id], `class ${id} needs idle and walk art`);
}
for (const role of ['shop', 'guild', 'quest', 'story']) assert.ok(PX.npc[role], `NPC role ${role} needs art`);
for (const monster of CONTENT.monsters) assert.ok(PX.monster[monster.id], `monster ${monster.id} needs art`);

const expandedMinimums = {
  town_awakening: [40, 34], whispering_woods: [50, 40], sunken_ruins: [40, 34],
  frostpeak_tundra: [48, 36], dragon_caldera: [50, 38], astral_rift: [50, 38],
};
const monsterById = Object.fromEntries(CONTENT.monsters.map(monster => [monster.id, monster]));

for (const map of Object.values(MAPS)) {
  for (const field of ['province', 'epithet', 'landmark', 'lore']) {
    assert.ok(typeof map.chronicle?.[field] === 'string' && map.chronicle[field].trim(), `${map.id} needs chronicle.${field}`);
  }
  assert.equal(map.tiles.length, map.height, `${map.id} height mismatch`);
  map.tiles.forEach((row, index) => assert.equal(row.length, map.width, `${map.id} row ${index} width mismatch`));
  assert.ok(map.portals?.length, `${map.id} needs at least one portal`);
  for (const portal of map.portals) {
    const tile = map.tiles[portal.y]?.[portal.x];
    assert.ok(map.legend[tile]?.walkable, `${map.id} portal at ${portal.x},${portal.y} is blocked`);
  }
  for (const npc of map.npcs || []) {
    const tile = map.tiles[npc.y]?.[npc.x];
    assert.ok(map.legend[tile]?.walkable, `${map.id} NPC ${npc.id} is standing on a blocked tile`);
  }
  if (map.spawns.length) assert.ok(map.tiles.some(row => row.includes('B')), `${map.id} needs a guardian landmark`);
  const entrance = map.playerStart || map.portals[0];
  const connected = connectedWalkableTiles(map, entrance.x, entrance.y);
  const reachable = new Set(connected.map(tile => `${tile.col},${tile.row}`));
  assert.ok(connected.length, `${map.id} entrance has no connected walkable region`);
  const [minWidth, minHeight] = expandedMinimums[map.id];
  assert.ok(map.width >= minWidth && map.height >= minHeight, `${map.id} lost its expanded footprint`);
  for (const portal of map.portals) assert.ok(reachable.has(`${portal.x},${portal.y}`), `${map.id} portal is isolated from the entrance`);
  for (const npc of map.npcs || []) assert.ok(reachable.has(`${npc.x},${npc.y}`), `${map.id} NPC ${npc.id} is isolated from the entrance`);
  if (map.spawns.length) {
    const normalSpawns = map.spawns.filter(spawn => monsterById[spawn.monsterId]?.sizeTiles < 2);
    assert.ok(new Set(normalSpawns.map(spawn => spawn.monsterId)).size >= 3, `${map.id} needs at least three normal monster species`);
    const population = normalSpawns.reduce((sum, spawn) => sum + spawn.count, 0);
    assert.ok(population / connected.length * 100 >= 1.5, `${map.id} monster population is too sparse for its expanded map`);
    const bossRow = map.tiles.findIndex(row => row.includes('B'));
    const bossCol = map.tiles[bossRow].indexOf('B');
    assert.ok(reachable.has(`${bossCol},${bossRow}`), `${map.id} guardian is isolated from the entrance`);

    const heatField = buildHeatField(map);
    assert.ok(heatField?.depths.size, `${map.id} needs a walkable entry-to-guardian heat field`);
    let previousMinDepth = -1;
    for (const spawn of normalSpawns) {
      const def = monsterById[spawn.monsterId];
      assert.ok(Array.isArray(spawn.depth) && spawn.depth.length === 2, `${map.id}/${spawn.monsterId} needs a depth habitat`);
      assert.ok(spawn.depth[0] >= 0 && spawn.depth[0] <= spawn.depth[1] && spawn.depth[1] <= 1,
        `${map.id}/${spawn.monsterId} has an invalid depth habitat`);
      assert.ok(spawn.depth[0] >= previousMinDepth, `${map.id} species must be ordered entry-to-guardian`);
      previousMinDepth = spawn.depth[0];
      assert.ok(Array.isArray(spawn.levelRange) && spawn.levelRange.length === 2,
        `${map.id}/${spawn.monsterId} needs a level range`);
      assert.ok(spawn.levelRange[0] >= map.band[0] && spawn.levelRange[1] <= map.band[1],
        `${map.id}/${spawn.monsterId} level range escaped the map band`);
      assert.ok(def.level >= spawn.levelRange[0] && def.level <= spawn.levelRange[1],
        `${map.id}/${spawn.monsterId} base level escaped its species range`);
      const habitatTiles = connected.filter(tile => {
        const depth = heatDepthAt(heatField, tile.col, tile.row);
        return depth != null && depth >= spawn.depth[0] && depth <= spawn.depth[1];
      });
      assert.ok(habitatTiles.length >= spawn.count,
        `${map.id}/${spawn.monsterId} habitat has ${habitatTiles.length} tiles for ${spawn.count} monsters`);
    }
  }
}

const woodsNormals = MAPS.whispering_woods.spawns.filter(spawn => monsterById[spawn.monsterId].sizeTiles < 2);
assert.ok(woodsNormals.find(spawn => spawn.monsterId === 'slime').depth[1] <= 0.30,
  'Slimes must remain beside the Whispering Woods entrance');
assert.ok(woodsNormals.find(spawn => spawn.monsterId === 'thornback_boar').depth[0] >= 0.65,
  'Thornback Boars must remain in the deep Whispering Woods');

const mapIds = Object.keys(MAPS);
for (const from of mapIds) for (const to of mapIds) {
  if (from === to) continue;
  const portal = nextPortalToward(MAPS, from, to);
  assert.ok(portal && MAPS[from].portals.includes(portal), `no quest route from ${from} to ${to}`);
}

function luminance(hex) {
  const channels = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(value => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

for (const key of ['bg', 'panelBg', 'panelBorder', 'textPrimary', 'textMuted', 'accent', 'accentAlt', 'hpRed', 'mpBlue']) {
  assert.ok(HEX.test(THEME.palette[key]), `theme palette is missing ${key}`);
}
assert.ok(contrast(THEME.palette.textPrimary, THEME.palette.panelBg) >= 4.5, 'panel text contrast is below WCAG AA');
assert.ok(THEME.css.includes('.hud') && THEME.css.includes('.panel') && THEME.css.includes('.hotbar'), 'theme lost core HUD selectors');
const trackerCss = THEME.css.match(/#hud \.quest-tracker\{([^}]*)\}/)?.[1] || '';
assert.match(trackerCss, /overflow-y:\s*auto/, 'HUD quest tracker must scroll when quests exceed its max height');
assert.match(trackerCss, /overscroll-behavior:\s*contain/, 'HUD quest tracker must not pass wheel scrolling to the game page');
assert.match(trackerCss, /touch-action:\s*pan-y/, 'HUD quest tracker must support touch scrolling');
assert.ok(!/letter-spacing:\s*-/.test(THEME.css), 'theme uses negative letter spacing');

console.log('Art audit passed: sprites, maps, palette keys, HUD contracts, and contrast are valid.');
