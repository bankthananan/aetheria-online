// Procedural 16×16 pixel tiles (deterministic, cached offscreen canvases)
// and multi-layer parallax backdrop. Moved from game.js.
import { PAL } from "../pixelart.js";

export function createTileRenderer({
  getCtx,
  getState,
  tileChar,
  TS = 32,
  getCanvasW = () => 832,
  getCanvasH = () => 576,
  now = () => performance.now(),
}) {
const tileCache = {};
const TILE_PHASES = Object.freeze({ water: 4, grass: 2, tree: 2 });
const TILE_PHASE_MS = Object.freeze({ water: 260, grass: 420, tree: 420 });
const reducedMotionQuery = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
const prefersReducedMotion = () => !!reducedMotionQuery?.matches;
const hash2 = (x, y) => { const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); };
function buildTile(type, phase = 0) {
  const phases = TILE_PHASES[type] || 1;
  phase = ((phase % phases) + phases) % phases;
  const cacheKey = `${type}:${phase}`;
  if (tileCache[cacheKey]) return tileCache[cacheKey];
  const N = 16, cvs = document.createElement('canvas'); cvs.width = N; cvs.height = N;
  const c = cvs.getContext('2d');
  if (!c?.fillRect) { tileCache[cacheKey] = cvs; return cvs; } // headless-safe
  const put = (x, y, hex, wd = 1, ht = 1) => { c.fillStyle = hex; c.fillRect(x, y, wd, ht); };
  const P = PAL;
  if (type === 'grass' || type === 'bush') {
    put(0, 0, P.f, N, N);
    // FF5-style: tonal clumps + scattered grass blades, not flat noise
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const r = hash2(x, y); if (r > 0.90) put(x, y, P.j); else if (r < 0.14) put(x, y, P.F); }
    const sway = type === 'grass' && phase === 1 ? 1 : 0;
    [[3, 12], [4, 11], [8, 14], [12, 7], [13, 6], [6, 5], [10, 10]].forEach(([x, y], i) => {
      const dx = i % 2 ? -sway : sway;
      put(x + dx, y, P.j); put(x + dx, y - 1, P.g);
    });
    if (type === 'grass' && phase === 1) { put(2, 3, P.F); put(14, 12, P.j); put(9, 4, P.g); }
    if (type === 'bush') { c.fillStyle = P.G; c.beginPath(); c.arc(8, 10, 5, 0, 7); c.fill(); c.fillStyle = P.g; c.fillRect(6, 8, 2, 2); c.fillRect(10, 9, 2, 2); c.fillStyle = P.k; c.fillRect(3, 14, 10, 1); }
  } else if (type === 'water') {
    for (let y = 0; y < N; y++) put(0, y, (y % 4 < 2) ? P.v : P.V, N, 1);        // banded depth
    const wave = (phase * 4) % N, counter = (12 - phase * 3 + N) % N;
    for (let y = 1; y < N; y += 4) { put(wave, y, P.C, 4, 1); put(counter, y + 2, P.C, 4, 1); }
    put((3 + phase * 2) % 13, 2, '#bfe3f5', 3, 1);
    put((10 - phase * 2 + N) % 14, 6, '#bfe3f5', 2, 1);
    put((5 + phase * 3) % 13, 11, '#bfe3f5', 3, 1); // moving sun glints
  } else if (type === 'road') {
    put(0, 0, '#81745e', N, N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const r = hash2(x + 5, y + 9); if (r > 0.88) put(x, y, '#a09070'); else if (r < 0.08) put(x, y, '#655b4c'); }
    [[1, 1], [7, 2], [11, 6], [3, 9], [9, 11]].forEach(([x, y]) => { put(x, y, '#686157', 3, 2); put(x, y, '#a49a87', 3, 1); });
  } else if (type === 'floor') {
    put(0, 0, '#575962', N, N);
    c.strokeStyle = '#383b43'; c.lineWidth = 1; c.strokeRect(0.5, 0.5, N - 1, N - 1); c.beginPath(); c.moveTo(8, 0); c.lineTo(8, 16); c.moveTo(0, 8); c.lineTo(16, 8); c.stroke();
    put(0, 0, '#747781', N, 1); put(10, 9, '#343740', 1, 4); put(10, 12, '#434650', 3, 1);
  } else if (type === 'wall') {
    put(0, 0, '#46474c', N, N);
    for (let y = 0; y < N; y += 5) put(0, y, '#23262b', N, 1);
    for (let x = 0; x < N; x += 8) put(x, 0, '#292b30', 1, 5);
    for (let x = 4; x < N; x += 8) put(x, 5, '#292b30', 1, 5);
    for (let x = 0; x < N; x += 8) put(x, 10, '#292b30', 1, 6);
    put(0, 1, '#676970', N, 1); put(3, 6, '#52624d', 2, 1); put(12, 11, '#52624d', 2, 1);
  } else if (type === 'snow') {
    put(0, 0, '#e8eef2', N, N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const r = hash2(x + 3, y + 7); if (r > 0.9) put(x, y, '#ffffff'); else if (r < 0.08) put(x, y, '#cfdae6'); }
  } else if (type === 'ice') {
    put(0, 0, '#a9d6e5', N, N);
    c.strokeStyle = '#cdeaf5'; c.lineWidth = 1; c.beginPath(); c.moveTo(2, 5); c.lineTo(9, 12); c.moveTo(12, 3); c.lineTo(15, 9); c.moveTo(4, 13); c.lineTo(11, 15); c.stroke();
    put(0, 0, '#c6e6f0', N, 1);
  } else if (type === 'sand') {
    put(0, 0, '#8b705c', N, N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const r = hash2(x + 9, y + 2); if (r > 0.9) put(x, y, '#aa8a69'); else if (r < 0.09) put(x, y, '#5e5048'); }
    c.strokeStyle = '#645146'; c.beginPath(); c.moveTo(0, 6); c.bezierCurveTo(6, 4, 10, 8, 16, 6); c.moveTo(0, 12); c.bezierCurveTo(6, 10, 10, 14, 16, 12); c.stroke();
  } else if (type === 'lava') {
    put(0, 0, '#e2551f', N, N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const r = hash2(x + 1, y + 5); if (r > 0.82) put(x, y, '#ffd24d'); else if (r < 0.12) put(x, y, '#9e2f10'); }
  } else if (type === 'rock') {
    put(0, 0, '#6b5a4a', N, N);
    c.fillStyle = P.k; c.beginPath(); c.moveTo(2, 13); c.lineTo(3, 7); c.lineTo(6, 3); c.lineTo(11, 3); c.lineTo(14, 8); c.lineTo(13, 14); c.closePath(); c.fill();
    c.fillStyle = '#57493c'; c.beginPath(); c.moveTo(3, 12); c.lineTo(4, 7); c.lineTo(7, 4); c.lineTo(11, 4); c.lineTo(13, 8); c.lineTo(12, 13); c.closePath(); c.fill();
    c.fillStyle = '#7d6b58'; c.beginPath(); c.moveTo(4, 7); c.lineTo(7, 4); c.lineTo(10, 5); c.lineTo(8, 9); c.lineTo(4, 10); c.closePath(); c.fill();
    put(6, 5, '#a58d72', 3, 1); put(9, 10, '#3e352f', 3, 2); put(3, 14, P.k, 10, 1);
  } else if (type === 'void') {
    put(0, 0, '#111a2c', N, N);   // blue-black celestial cathedral floor
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const r = hash2(x + 2, y + 6); if (r > 0.96) put(x, y, '#f0d98b'); else if (r > 0.91) put(x, y, '#7891c2'); else if (r < 0.06) put(x, y, '#263653'); }
    put(0, 7, '#233452', N, 1); put(7, 0, '#233452', 1, N);
  } else if (type === 'voidrock') {
    put(0, 0, '#1b2740', N, N);
    c.fillStyle = '#344d78'; c.beginPath(); c.moveTo(8, 2); c.lineTo(13, 9); c.lineTo(8, 15); c.lineTo(3, 9); c.closePath(); c.fill();
    c.fillStyle = '#7891c2'; c.fillRect(7, 6, 2, 5); c.fillStyle = '#f0d98b'; c.fillRect(7, 4, 1, 2);
  } else if (type === 'tree') {
    put(0, 0, P.f, N, N);                                      // grass base
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { if (hash2(x, y) < 0.12) put(x, y, P.F); }
    put(6, 10, P.k, 4, 6); put(7, 10, P.N, 2, 5); put(7, 10, P.o, 1, 4);        // outlined trunk + root shadow
    c.fillStyle = P.k; c.beginPath(); c.arc(5, 7, 4.8, 0, 7); c.arc(10, 6, 5.2, 0, 7); c.arc(9, 10, 5.1, 0, 7); c.fill();
    c.fillStyle = P.G; c.beginPath(); c.arc(5, 7, 4, 0, 7); c.arc(10, 6, 4.4, 0, 7); c.arc(9, 10, 4.2, 0, 7); c.fill();
    c.fillStyle = P.F; c.beginPath(); c.arc(11, 10, 2.8, 0, 7); c.fill();
    c.fillStyle = P.g; c.beginPath(); c.arc(5, 5, 2.4, 0, 7); c.fill(); c.beginPath(); c.arc(9, 4, 2.1, 0, 7); c.fill();
    const shimmer = phase === 1 ? 1 : 0;
    c.fillStyle = P.j; [[4, 4], [8, 3], [11, 5], [6, 8]].forEach(([x, y], i) => c.fillRect(x + (i % 2 ? -shimmer : shimmer), y, 1, 1));
  } else if (type === 'cobble') {
    put(0, 0, '#5d6065', N, N);                                // cool mortar base
    const stones = [[1,1,4,3],[6,1,5,3],[12,1,3,3],[1,5,3,3],[5,5,4,3],[10,5,5,3],[1,9,5,3],[7,9,4,3],[12,9,3,3],[2,13,4,2],[7,13,5,2],[13,13,2,2]];
    for (const [x,y,w2,h2] of stones) { put(x, y, '#777b80', w2, h2); put(x, y, '#a7abb0', w2, 1); }
  } else if (type === 'plaza') {
    put(0, 0, '#8c8b85', N, N);                                // dressed guild-square stone
    c.strokeStyle = '#686a69'; c.lineWidth = 1; c.strokeRect(0.5, 0.5, N - 1, N - 1);
    c.beginPath(); c.moveTo(8, 0); c.lineTo(8, 16); c.moveTo(0, 8); c.lineTo(16, 8); c.stroke();
    put(0, 0, '#b1afa6', N, 1);
  } else if (type === 'roof') {
    put(0, 0, '#303b4b', N, N);                                // outlined northern slate
    put(0, 0, P.k, N, 1); put(0, 1, '#8290a3', N, 2);          // ridge cap
    for (let y = 4; y < N; y += 4) {
      put(0, y, '#18212d', N, 1); put(0, y + 1, '#657286', N, 1);
      for (let x = (y % 8 ? 4 : 0); x < N; x += 8) put(x, y + 1, '#202b38', 1, 3);
    }
    put(2, 3, '#4d5b6e', 5, 1); put(10, 7, '#4d5b6e', 4, 1);
  } else if (type === 'hwall') {
    put(0, 0, '#c4b48e', N, N);                                // plaster in a dark timber frame
    put(0, 0, P.k, N, 1); put(0, 1, '#8e7a5d', N, 2);
    for (const x of [0, 7, 15]) { put(x, 3, P.k, 2, N - 3); put(x + 1, 3, '#6a452c', 1, N - 3); }
    put(0, 8, P.k, N, 2); put(0, 9, '#6a452c', N, 1); put(0, N - 1, P.k, N, 1);
    for (let i = 2; i < 7; i++) { put(i, i + 2, '#8e6b48'); put(14 - i, i + 2, '#8e6b48'); }
  } else if (type === 'door') {
    put(0, 0, '#c4b48e', N, N); put(0, 0, P.k, N, 1); put(0, 1, '#8e7a5d', N, 2);
    put(3, 4, P.k, 10, 12); put(4, 4, '#59402d', 8, 12);
    for (const x of [6, 9]) put(x, 5, '#7b5737', 1, 10);       // vertical oak boards
    put(4, 8, '#2f211a', 8, 1); put(4, 13, '#2f211a', 8, 1);
    put(10, 10, P.y, 1, 2); put(10, 10, '#fff2a6');            // brass knob
  } else if (type === 'window') {
    put(0, 0, '#c4b48e', N, N); put(0, 0, P.k, N, 1); put(0, 1, '#8e7a5d', N, 2);
    put(2, 3, '#7d643f', 12, 11); put(3, 4, P.k, 10, 9);
    put(4, 5, '#e8a73f', 8, 7); put(5, 5, '#ffe39a', 5, 4);    // warm two-tone glow
    put(8, 5, P.N, 1, 7); put(4, 8, P.N, 8, 1);               // cross muntin
    put(2, 13, P.k, 12, 1); put(3, 14, P.n, 10, 1);           // outlined sill
  } else if (type === 'fence') {
    put(0, 0, P.f, N, N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { if (hash2(x, y) < 0.10) put(x, y, P.F); }
    put(0, 5, P.k, N, 4); put(0, 6, P.n, N, 2); put(0, 10, P.k, N, 3); put(0, 11, P.n, N, 1);
    for (const x of [2, 8, 14]) { put(x - 1, 2, P.k, 4, 13); put(x, 3, P.N, 2, 11); put(x, 3, P.o, 1, 10); put(x, 2, P.k, 2, 1); }
  } else if (type === 'hedge') {
    put(0, 0, P.f, N, N);
    c.fillStyle = P.k; c.beginPath(); c.arc(4, 8, 4, 0, 7); c.arc(8, 6, 5, 0, 7); c.arc(12, 8, 4, 0, 7); c.fill();
    c.fillStyle = P.G; c.beginPath(); c.arc(4, 8, 3.2, 0, 7); c.arc(8, 6, 4.2, 0, 7); c.arc(12, 8, 3.2, 0, 7); c.fill();
    c.fillStyle = P.g; [[4,6],[7,4],[10,6],[6,9],[12,9]].forEach(([x,y]) => c.fillRect(x, y, 2, 2));
    put(2, 12, P.k, 12, 2); put(3, 12, P.F, 10, 1);
  } else if (type === 'flowers') {
    put(0, 0, P.f, N, N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const r = hash2(x, y); if (r > 0.92) put(x, y, P.j); else if (r < 0.10) put(x, y, P.F); }
    const buds = [[3,4,P.r],[11,3,P.p],[6,9,P.y],[13,11,P.x],[2,12,P.p],[9,13,P.r],[8,6,P.x]];
    for (const [x,y,col] of buds) { put(x, y + 2, P.G, 1, 3); put(x - 1, y, P.k, 4, 3); put(x, y, col, 2, 2); put(x + 1, y, P.x); }
  } else if (type === 'fountain') {
    put(0, 0, '#8c8b85', N, N);                               // chapel-square base
    c.fillStyle = P.a; c.beginPath(); c.arc(8, 8, 7, 0, 7); c.fill();          // stone basin rim
    c.fillStyle = P.v; c.beginPath(); c.arc(8, 8, 5, 0, 7); c.fill();          // water
    c.fillStyle = P.C; c.beginPath(); c.arc(8, 8, 2.4, 0, 7); c.fill();        // spout splash
    c.fillStyle = P.A; c.fillRect(7, 7, 2, 2);                                 // center pillar
    c.strokeStyle = '#c2beb6'; c.lineWidth = 1; c.beginPath(); c.arc(8, 8, 7, 0, 7); c.stroke();
  } else if (type === 'townwall') {
    put(0, 0, '#777872', N, N);
    for (let y = 0; y < N; y += 5) put(0, y, '#4e514f', N, 1);
    for (let x = 0; x < N; x += 8) put(x, 0, '#4e514f', 1, 5);
    for (let x = 4; x < N; x += 8) put(x, 5, '#4e514f', 1, 5);
    put(0, 0, '#a0a39c', N, 1); put(2, 0, '#4e514f', 2, 2); put(9, 0, '#4e514f', 2, 2);
  } else if (type === 'gate') {
    put(0, 0, '#5d6065', N, N);                               // cobble underfoot (walkable)
    const stones = [[2,2,3,3],[6,2,4,3],[2,11,4,3],[10,11,4,3]];
    for (const [x,y,w2,h2] of stones) put(x, y, P.a, w2, h2);
    put(0, 0, '#7a7060', 2, N); put(N - 2, 0, '#7a7060', 2, N);   // gate jambs
    put(2, 0, P.o, 2, 2); put(12, 0, P.o, 2, 2);                  // raised portcullis wood
  } else if (type === 'lamp') {
    put(0, 0, '#5d6065', N, N);
    put(4, 1, 'rgba(255,210,92,.18)', 8, 8); put(5, 2, 'rgba(255,210,92,.24)', 6, 6); // pixel glow halo
    put(7, 6, '#252930', 2, 8); put(6, 13, P.k, 4, 2); put(7, 12, P.N, 2, 2);
    put(5, 2, P.k, 6, 6); put(6, 3, '#81572d', 4, 4); put(7, 3, P.y, 2, 3); put(7, 3, '#fff2c0');
  } else if (type === 'stall') {
    put(0, 0, '#81745e', N, N);
    put(0, 0, P.k, N, 1);
    for (let x = 0; x < N; x += 4) put(x, 1, '#842f3d', 2, 4); // oxblood guild awning
    for (let x = 2; x < N; x += 4) put(x, 1, '#d8cfb8', 2, 4);
    put(0, 5, P.k, N, 2); put(1, 5, P.N, N - 2, 1);            // outlined awning trim
    put(0, 8, P.k, N, 6); put(1, 9, P.n, N - 2, 4); put(1, 9, P.o, N - 2, 1); // wooden counter
    put(3, 6, P.g, 2, 2); put(7, 6, P.r, 2, 2); put(11, 6, P.y, 2, 2);   // goods on display
  } else if (type === 'bridge') {
    for (let y = 0; y < N; y++) put(0, y, (y % 4 < 2) ? P.v : P.V, N, 1);   // water beneath
    put(0, 1, P.k, N, 3); put(0, 13, P.k, N, 3);              // hard rail outline
    put(0, 2, P.o, N, 1); put(0, 14, P.o, N, 1);
    for (let x = 0; x < N; x += 3) { put(x, 4, P.k, 1, 9); put(x + 1, 4, P.n, 2, 9); put(x + 1, 4, P.o, 1, 9); }
  } else { // fallback flat
    put(0, 0, P.f, N, N);
  }
  tileCache[cacheKey] = cvs; return cvs;
}
function drawTile(type, x, y, targetCtx = getCtx()) {
  const G = getState();
  const phase = G.debugTilePhase != null
    ? G.debugTilePhase
    : (prefersReducedMotion() ? 0 : Math.floor(now() / (TILE_PHASE_MS[type] || 1000)));
  const cvs = buildTile(type, phase);
  if (!cvs.width) return false;
  targetCtx.drawImage(cvs, Math.floor(x), Math.floor(y), TS + 1, TS + 1);
  return true;
}

// Small direct overdraws soften the most visible terrain seams without
// obscuring the readable walk grid. Edge pixels stay inside the current tile.
function drawTileEdges(type, col, row, x, y, targetCtx = getCtx()) {
  const G = getState();
  const neighbors = [
    { dc: 0, dr: -1, dir: 'top' }, { dc: 1, dr: 0, dir: 'right' },
    { dc: 0, dr: 1, dir: 'bottom' }, { dc: -1, dr: 0, dir: 'left' },
  ];
  let drawn = 0;
  const band = (dir, color, thickness = 2, dotted = false) => {
    targetCtx.fillStyle = color;
    const horizontal = dir === 'top' || dir === 'bottom';
    const bx = dir === 'right' ? x + TS - thickness : x;
    const by = dir === 'bottom' ? y + TS - thickness : y;
    targetCtx.fillRect(Math.floor(bx), Math.floor(by), horizontal ? TS : thickness, horizontal ? thickness : TS);
    if (dotted) {
      targetCtx.fillStyle = '#dff2ff';
      for (let p = 4; p < TS; p += 9) {
        const dx = horizontal ? x + p : (dir === 'right' ? x + TS - 1 : x);
        const dy = horizontal ? (dir === 'bottom' ? y + TS - 1 : y) : y + p;
        targetCtx.fillRect(Math.floor(dx), Math.floor(dy), horizontal ? 3 : 1, horizontal ? 1 : 3);
      }
    }
    drawn++;
  };
  for (const n of neighbors) {
    const neighborInfo = G.legend[tileChar(col + n.dc, row + n.dr)];
    const other = neighborInfo?.type;
    if (!other || other === type) continue;
    if (type === 'water' && other !== 'bridge') band(n.dir, '#e8dcae', 2, true);
    else if (type === 'road' && (other === 'grass' || other === 'bush')) band(n.dir, '#3f7d3a', 2);
    else if ((type === 'snow' && other === 'grass') || (type === 'grass' && other === 'snow')) band(n.dir, '#9eabbc', 1);
    else if ((type === 'lava' && other === 'rock') || (type === 'rock' && other === 'lava')) band(n.dir, '#612817', 1);
  }
  return drawn;
}

// Cached procedural backdrop strips: two cloud bands share one canvas, then
// mountains and treeline scroll at progressively faster parallax rates.
const parallaxCache = {};
function buildParallaxStrip(kind) {
  if (parallaxCache[kind]) return parallaxCache[kind];
  const sizes = { clouds: [512, 190], mountains: [512, 190], trees: [512, 130] };
  const [w, h] = sizes[kind];
  const cvs = document.createElement('canvas'); cvs.width = w; cvs.height = h;
  const c = cvs.getContext('2d');
  if (!c?.fillRect) { parallaxCache[kind] = cvs; return cvs; }
  c.clearRect(0, 0, w, h);
  if (kind === 'clouds') {
    const cloud = (x, y, scale, color) => {
      c.fillStyle = color;
      c.fillRect(x, y + 8 * scale, 42 * scale, 8 * scale);
      c.fillRect(x + 8 * scale, y + 3 * scale, 24 * scale, 10 * scale);
      c.fillRect(x + 16 * scale, y, 10 * scale, 8 * scale);
    };
    cloud(22, 26, 2, 'rgba(239,246,245,.38)'); cloud(286, 88, 1, 'rgba(231,241,239,.30)');
    cloud(402, 22, 1, 'rgba(255,244,218,.30)'); cloud(156, 132, 1, 'rgba(226,238,236,.23)');
  } else if (kind === 'mountains') {
    c.fillStyle = '#263b4e'; c.beginPath(); c.moveTo(0, h); c.lineTo(0, 130); c.lineTo(78, 48); c.lineTo(130, 116); c.lineTo(218, 30); c.lineTo(306, 126); c.lineTo(394, 57); c.lineTo(512, 138); c.lineTo(512, h); c.closePath(); c.fill();
    c.fillStyle = '#39536a'; c.beginPath(); c.moveTo(60, 132); c.lineTo(78, 48); c.lineTo(102, 105); c.lineTo(132, 116); c.lineTo(218, 30); c.lineTo(245, 94); c.lineTo(394, 57); c.lineTo(420, 92); c.lineTo(512, 140); c.lineTo(512, h); c.lineTo(0, h); c.closePath(); c.fill();
    c.fillStyle = '#90a8b4'; [[72,55,18],[207,38,24],[385,65,18]].forEach(([x,y,w2]) => c.fillRect(x, y, w2, 5));
  } else {
    c.fillStyle = '#183426'; c.fillRect(0, 82, w, h - 82);
    for (let x = 0; x < w; x += 18) {
      const top = 25 + Math.floor(hash2(x, 41) * 42);
      c.fillStyle = '#10291d'; c.fillRect(x + 7, top + 18, 4, h - top);
      c.beginPath(); c.moveTo(x, top + 32); c.lineTo(x + 9, top); c.lineTo(x + 18, top + 32); c.closePath(); c.fill();
      c.fillStyle = '#2b5335'; c.fillRect(x + 3, top + 24, 12, 5);
    }
  }
  parallaxCache[kind] = cvs; return cvs;
}
function drawParallax(cx = 0, cy = 0) {
  const ctx = getCtx();
  if (!ctx) return false;
  const CANVAS_W = getCanvasW();
  const CANVAS_H = getCanvasH();
  const sky = ctx.createLinearGradient?.(0, 0, 0, CANVAS_H);
  if (sky?.addColorStop) { sky.addColorStop(0, '#6989a3'); sky.addColorStop(0.55, '#9db7b5'); sky.addColorStop(1, '#d7c38f'); ctx.fillStyle = sky; }
  else ctx.fillStyle = '#6989a3';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  const drawStrip = (kind, y, factor, drift = 0) => {
    const strip = buildParallaxStrip(kind);
    if (!strip?.width) return;
    const offset = ((cx * factor + drift) % strip.width + strip.width) % strip.width;
    for (let x = -offset; x < CANVAS_W; x += strip.width) ctx.drawImage(strip, Math.floor(x), Math.floor(y - cy * factor * 0.04));
  };
  drawStrip('clouds', 18, 0.10, prefersReducedMotion() ? 0 : now() / 40000 * 512);
  drawStrip('mountains', CANVAS_H - 290, 0.25);
  drawStrip('trees', CANVAS_H - 130, 0.50);
  return true;
}


  return {
    TILE_PHASES,
    TILE_PHASE_MS,
    prefersReducedMotion,
    hash2,
    buildTile,
    drawTile,
    drawTileEdges,
    buildParallaxStrip,
    drawParallax,
  };
}
