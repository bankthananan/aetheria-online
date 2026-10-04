// Shared map-connectivity helpers. A tile can be walkable yet belong to an
// isolated pocket, so spawning must use the entrance's connected region.
export function isWalkableTile(map, col, row) {
  if (!map || row < 0 || col < 0 || row >= map.height || col >= map.width) return false;
  return Boolean(map.legend[map.tiles[row]?.[col]]?.walkable);
}

const DIRS8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

function walkableNeighbours(map, current) {
  const neighbours = [];
  for (const [dc, dr] of DIRS8) {
    const col = current.col + dc;
    const row = current.row + dr;
    if (!isWalkableTile(map, col, row)) continue;
    if (dc && dr && (!isWalkableTile(map, current.col + dc, current.row)
      || !isWalkableTile(map, current.col, current.row + dr))) continue;
    neighbours.push({ col, row });
  }
  return neighbours;
}

export function connectedWalkableTiles(map, startCol, startRow) {
  if (!isWalkableTile(map, startCol, startRow)) return [];

  const key = (col, row) => `${col},${row}`;
  const queue = [{ col: startCol, row: startRow }];
  const seen = new Set([key(startCol, startRow)]);
  const connected = [];

  for (let head = 0; head < queue.length; head++) {
    const current = queue[head];
    connected.push(current);
    for (const { col, row } of walkableNeighbours(map, current)) {
      const tileKey = key(col, row);
      if (seen.has(tileKey)) continue;
      seen.add(tileKey);
      queue.push({ col, row });
    }
  }

  return connected;
}

function distanceField(map, starts) {
  const key = (col, row) => `${col},${row}`;
  const queue = [];
  const distances = new Map();
  for (const start of starts) {
    const tileKey = key(start.col, start.row);
    if (!isWalkableTile(map, start.col, start.row) || distances.has(tileKey)) continue;
    distances.set(tileKey, 0);
    queue.push(start);
  }
  for (let head = 0; head < queue.length; head++) {
    const current = queue[head];
    const distance = distances.get(key(current.col, current.row));
    for (const next of walkableNeighbours(map, current)) {
      const tileKey = key(next.col, next.row);
      if (distances.has(tileKey)) continue;
      distances.set(tileKey, distance + 1);
      queue.push(next);
    }
  }
  return distances;
}

// Build one deterministic depth field for a hunting map. Depth follows actual
// walkable corridors from the progression entrance to the guardian rather than
// straight-line distance through walls, water, trees, or lava.
export function buildHeatField(map) {
  if (!map?.band) return null;
  let boss = null;
  for (let row = 0; row < map.height && !boss; row++) {
    const col = map.tiles[row]?.indexOf('B') ?? -1;
    if (col >= 0) boss = { col, row };
  }
  if (!boss) return null;

  const gates = [...(map.portals || []).map(portal => ({ col: portal.x, row: portal.y })),
    ...(map.playerStart ? [{ col: map.playerStart.x, row: map.playerStart.y }] : [])]
    .filter(gate => isWalkableTile(map, gate.col, gate.row));
  if (!gates.length) return null;

  const fromBoss = distanceField(map, [boss]);
  const gateDistances = gates.map(gate => fromBoss.get(`${gate.col},${gate.row}`) ?? -1);
  const farthest = Math.max(...gateDistances, 1);
  // A portal beside the guardian is the exit, not a second safe entrance.
  const entries = gates.filter((_gate, index) => gateDistances[index] >= farthest * 0.6);
  const fromEntry = distanceField(map, entries.length ? entries : [gates[gateDistances.indexOf(farthest)]]);
  const guardianDistance = Math.max(1, fromEntry.get(`${boss.col},${boss.row}`) ?? farthest);
  const depths = new Map();
  for (const [tileKey, distance] of fromEntry) depths.set(tileKey, Math.min(1, distance / guardianDistance));
  return { boss, entries, guardianDistance, depths };
}

export function heatDepthAt(field, col, row) {
  return field?.depths.get(`${col},${row}`) ?? null;
}

// Return the first portal on the shortest map-to-map route.
export function nextPortalToward(maps, fromMapId, targetMapId) {
  if (fromMapId === targetMapId || !maps[fromMapId] || !maps[targetMapId]) return null;
  const queue = [{ mapId: fromMapId, firstPortal: null }];
  const seen = new Set([fromMapId]);

  for (let head = 0; head < queue.length; head++) {
    const current = queue[head];
    for (const portal of maps[current.mapId].portals || []) {
      if (seen.has(portal.toMap)) continue;
      const firstPortal = current.firstPortal || portal;
      if (portal.toMap === targetMapId) return firstPortal;
      seen.add(portal.toMap);
      queue.push({ mapId: portal.toMap, firstPortal });
    }
  }
  return null;
}

export function nearestWalkableTile(isWalkable, gc, gr) {
  if (isWalkable(gc, gr)) return { c: gc, r: gr };
  for (let rad = 1; rad <= 6; rad++)
    for (let dc = -rad; dc <= rad; dc++) for (let dr = -rad; dr <= rad; dr++) {
      if (Math.max(Math.abs(dc), Math.abs(dr)) !== rad) continue;
      if (isWalkable(gc + dc, gr + dr)) return { c: gc + dc, r: gr + dr };
    }
  return null;
}

export function findGridPath(isWalkable, sc, sr, gc, gr, getTileChar = () => '') {
  if (sc === gc && sr === gr) return [{ c: sc, r: sr }];
  const key = (c, r) => c + ',' + r, heur = (c, r) => Math.hypot(c - gc, r - gr);
  const open = [{ c: sc, r: sr, g: 0, f: heur(sc, sr) }], came = {}, gsc = { [key(sc, sr)]: 0 };
  let iter = 0;
  while (open.length && iter++ < 3000) {
    let bi = 0; for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i;
    const cur = open.splice(bi, 1)[0];
    if (cur.c === gc && cur.r === gr) {
      const path = []; let k = key(gc, gr);
      while (k !== undefined) { const [c, r] = k.split(',').map(Number); path.unshift({ c, r }); k = came[k]; }
      return path;
    }
    for (const [dc, dr] of DIRS8) {
      const nc = cur.c + dc, nr = cur.r + dr;
      if (!isWalkable(nc, nr)) continue;
      if (dc && dr && (!isWalkable(cur.c + dc, cur.r) || !isWalkable(cur.c, cur.r + dr))) continue; // no corner-cut
      const isWind = getTileChar(nc, nr) === '^';
      const penalty = (isWind && dr > 0) ? 99 : 0;
      const ng = cur.g + (dc && dr ? 1.414 : 1) + penalty, nk = key(nc, nr);
      if (gsc[nk] === undefined || ng < gsc[nk]) { gsc[nk] = ng; came[nk] = key(cur.c, cur.r); open.push({ c: nc, r: nr, g: ng, f: ng + heur(nc, nr) }); }
    }
  }
  return null;
}
