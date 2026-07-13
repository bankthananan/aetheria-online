// Shared map-connectivity helpers. A tile can be walkable yet belong to an
// isolated pocket, so spawning must use the entrance's connected region.
export function isWalkableTile(map, col, row) {
  if (!map || row < 0 || col < 0 || row >= map.height || col >= map.width) return false;
  return Boolean(map.legend[map.tiles[row]?.[col]]?.walkable);
}

const DIRS8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

export function connectedWalkableTiles(map, startCol, startRow) {
  if (!isWalkableTile(map, startCol, startRow)) return [];

  const key = (col, row) => `${col},${row}`;
  const queue = [{ col: startCol, row: startRow }];
  const seen = new Set([key(startCol, startRow)]);
  const connected = [];

  for (let head = 0; head < queue.length; head++) {
    const current = queue[head];
    connected.push(current);
    for (const [dc, dr] of DIRS8) {
      const col = current.col + dc;
      const row = current.row + dr;
      const tileKey = key(col, row);
      if (seen.has(tileKey) || !isWalkableTile(map, col, row)) continue;
      if (dc && dr && (!isWalkableTile(map, current.col + dc, current.row)
        || !isWalkableTile(map, current.col, current.row + dr))) continue;
      seen.add(tileKey);
      queue.push({ col, row });
    }
  }

  return connected;
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
