// js/render/world-atlas.js
// Graphical 10-Zone World Atlas & Tactical Minimap Radar 2.0.
// Provides visual parchment atlas node-graph navigation, waystone fast travel,
// and tactical radar overlay with directional FOV and threat blips.
// Strict ZERO Screen Shake: Camera offsets are never altered.

export const ZONE_ATLAS_NODES = {
  town_awakening: {
    id: 'town_awakening',
    name: 'Town of Awakening',
    tier: 1,
    levelRange: [1, 10],
    x: 400,
    y: 540,
    sigil: '🏛️',
    color: '#f59e0b',
    desc: 'The peaceful starting hub where reborn souls gather, trade, and forge equipment.',
  },
  whispering_woods: {
    id: 'whispering_woods',
    name: 'Whispering Woods',
    tier: 1,
    levelRange: [1, 15],
    x: 400,
    y: 440,
    sigil: '🌲',
    color: '#22c55e',
    guardian: 'ancient_treant',
    desc: 'Sun-dappled glades teeming with woodland beasts and ancient sentient roots.',
  },
  sunken_ruins: {
    id: 'sunken_ruins',
    name: 'Sunken Ruins',
    tier: 2,
    levelRange: [16, 25],
    x: 250,
    y: 380,
    sigil: '🌊',
    color: '#06b6d4',
    guardian: 'drowned_mariner',
    desc: 'Submerged ancient temples and tidal passages haunted by water spirits.',
  },
  ashen_steppes: {
    id: 'ashen_steppes',
    name: 'Ashen Steppes',
    tier: 2,
    levelRange: [20, 32],
    x: 550,
    y: 380,
    sigil: '🏜️',
    color: '#d97706',
    guardian: 'dune_scourge',
    desc: 'Vast arid wastes swept by stinging dust storms and prowling predators.',
  },
  frostpeak_tundra: {
    id: 'frostpeak_tundra',
    name: 'Frostpeak Tundra',
    tier: 3,
    levelRange: [30, 45],
    x: 160,
    y: 270,
    sigil: '❄️',
    color: '#38bdf8',
    guardian: 'glacier_titan',
    desc: 'Frigid windswept glaciers and snow drifts home to ferocious frost beasts.',
  },
  twilight_mire: {
    id: 'twilight_mire',
    name: 'Twilight Mire',
    tier: 3,
    levelRange: [35, 50],
    x: 370,
    y: 280,
    sigil: '🍄',
    color: '#a855f7',
    guardian: 'bog_horror',
    desc: 'Bioluminescent swamp waters shrouded in perpetual twilight and toxic mists.',
  },
  dragon_caldera: {
    id: 'dragon_caldera',
    name: 'Dragon Caldera',
    tier: 3,
    levelRange: [45, 60],
    x: 640,
    y: 270,
    sigil: '🌋',
    color: '#ef4444',
    guardian: 'magma_wyrm',
    desc: 'Molten rivers and basalt pillars where flame drakes roost above bubbling lava.',
  },
  tempest_spires: {
    id: 'tempest_spires',
    name: 'Tempest Spires',
    tier: 4,
    levelRange: [55, 70],
    x: 250,
    y: 170,
    sigil: '⚡',
    color: '#818cf8',
    guardian: 'storm_herald',
    desc: 'Jagged mountain peaks charged with relentless lightning and howling gales.',
  },
  sunless_chasm: {
    id: 'sunless_chasm',
    name: 'Sunless Chasm',
    tier: 4,
    levelRange: [65, 80],
    x: 550,
    y: 170,
    sigil: '🕳️',
    color: '#6366f1',
    guardian: 'void_behemoth',
    desc: 'A bottomless abyss echoing with abyssal whispers and reality-bending shadows.',
  },
  astral_rift: {
    id: 'astral_rift',
    name: 'Astral Rift',
    tier: 5,
    levelRange: [75, 90],
    x: 400,
    y: 100,
    sigil: '✨',
    color: '#ec4899',
    guardian: 'rift_architect',
    desc: 'Shattered celestial ruins floating within the fabric of cosmic ether.',
  },
  glitched_monolith: {
    id: 'glitched_monolith',
    name: 'Glitched Monolith',
    tier: 5,
    levelRange: [90, 100],
    x: 400,
    y: 35,
    sigil: '👁️',
    color: '#10b981',
    guardian: 'glitch_overlord',
    desc: 'The reality-fractured core where the System Architect oversees the simulation.',
  },
};

export const ATLAS_HIGHWAYS = [
  { from: 'town_awakening', to: 'whispering_woods' },
  { from: 'whispering_woods', to: 'sunken_ruins' },
  { from: 'whispering_woods', to: 'ashen_steppes' },
  { from: 'sunken_ruins', to: 'frostpeak_tundra' },
  { from: 'sunken_ruins', to: 'twilight_mire' },
  { from: 'ashen_steppes', to: 'twilight_mire' },
  { from: 'ashen_steppes', to: 'dragon_caldera' },
  { from: 'frostpeak_tundra', to: 'tempest_spires' },
  { from: 'twilight_mire', to: 'tempest_spires' },
  { from: 'twilight_mire', to: 'sunless_chasm' },
  { from: 'dragon_caldera', to: 'sunless_chasm' },
  { from: 'tempest_spires', to: 'astral_rift' },
  { from: 'sunless_chasm', to: 'astral_rift' },
  { from: 'astral_rift', to: 'glitched_monolith' },
];

export const ZONE_GUARDIANS = {
  whispering_woods: 'ancient_treant',
  sunken_ruins: 'drowned_mariner',
  ashen_steppes: 'dune_scourge',
  frostpeak_tundra: 'glacier_titan',
  twilight_mire: 'bog_horror',
  dragon_caldera: 'magma_wyrm',
  tempest_spires: 'storm_herald',
  sunless_chasm: 'void_behemoth',
  astral_rift: 'rift_architect',
  glitched_monolith: 'glitch_overlord',
};

export const ZONE_PREREQUISITES = {
  town_awakening: [],
  whispering_woods: [],
  sunken_ruins: ['whispering_woods'],
  ashen_steppes: ['whispering_woods'],
  frostpeak_tundra: ['sunken_ruins'],
  twilight_mire: ['sunken_ruins', 'ashen_steppes'],
  dragon_caldera: ['ashen_steppes', 'frostpeak_tundra'],
  tempest_spires: ['frostpeak_tundra', 'twilight_mire'],
  sunless_chasm: ['twilight_mire', 'dragon_caldera'],
  astral_rift: ['dragon_caldera', 'tempest_spires', 'sunless_chasm'],
  glitched_monolith: ['astral_rift', 'sunless_chasm'],
};

/**
 * Checks if a zone is unlocked based on guardian defeat progress.
 * @param {string} zoneId
 * @param {Set<string>|Array<string>} guardiansSlain
 * @returns {boolean}
 */
export function isZoneUnlocked(zoneId, guardiansSlain = new Set()) {
  if (zoneId === 'town_awakening' || zoneId === 'whispering_woods') return true;
  const prereqs = ZONE_PREREQUISITES[zoneId];
  if (!prereqs || !prereqs.length) return true;
  const slainSet = guardiansSlain instanceof Set ? guardiansSlain : new Set(guardiansSlain);
  return prereqs.some(p => {
    const guardian = ZONE_GUARDIANS[p];
    return guardian && slainSet.has(guardian);
  });
}

/**
 * Validates whether the player can fast travel to a specified destination zone.
 * @param {string} zoneId
 * @param {object} player
 * @param {Set<string>|Array<string>} guardiansSlain
 * @param {string} currentMapId
 * @returns {{ ok: boolean, reason?: string, cost: number }}
 */
export function canFastTravel(zoneId, player = {}, guardiansSlain = new Set(), currentMapId = '') {
  if (zoneId === currentMapId) {
    return { ok: false, reason: 'Already at this location', cost: 0 };
  }
  if (!ZONE_ATLAS_NODES[zoneId]) {
    return { ok: false, reason: 'Unknown destination', cost: 0 };
  }
  if (!isZoneUnlocked(zoneId, guardiansSlain)) {
    return { ok: false, reason: 'Zone is locked by ancient barrier', cost: 0 };
  }
  if (player.inCombat) {
    return { ok: false, reason: 'Cannot fast travel while in combat', cost: 0 };
  }

  const cost = zoneId === 'town_awakening' ? 0 : Math.round((ZONE_ATLAS_NODES[zoneId].levelRange[0] || 1) * 15);
  if ((player.zeny || 0) < cost) {
    return { ok: false, reason: `Not enough zeny (requires ${cost} Zeny)`, cost };
  }

  return { ok: true, cost };
}

/**
 * Executes fast travel warp to destination.
 * @param {string} zoneId
 * @param {object} G
 * @returns {{ success: boolean, reason?: string }}
 */
export function executeFastTravel(zoneId, G) {
  const currentMap = G.mapId || G.map?.id || '';
  const check = canFastTravel(zoneId, G.player, G.guardiansSlain, currentMap);
  if (!check.ok) return { success: false, reason: check.reason };

  if (check.cost > 0 && G.player) {
    G.player.zeny = Math.max(0, (G.player.zeny || 0) - check.cost);
  }

  if (typeof G.loadMap === 'function') {
    G.loadMap(zoneId);
  }

  return { success: true };
}

// Minimap radar state
let radarState = {
  expanded: false,
  width: 136,
  height: 136,
};

/**
 * Returns current minimap radar state.
 */
export function getMinimapRadarState() {
  return { ...radarState };
}

/**
 * Toggles minimap radar between compact (136px) and expanded (240px).
 */
export function toggleMinimapRadar() {
  radarState.expanded = !radarState.expanded;
  radarState.width = radarState.expanded ? 240 : 136;
  radarState.height = radarState.expanded ? 240 : 136;
  return { ...radarState };
}

/**
 * Collects normalized entity blips for the radar minimap.
 * @param {object} G
 * @returns {object}
 */
export function getRadarBlips(G) {
  if (!G || !G.map) return { player: null, monsters: [], npcs: [], portals: [] };

  const mw = G.map.width || 1;
  const mh = G.map.height || 1;

  const player = G.player ? {
    x: G.player.x,
    y: G.player.y,
    facing: G.player.facing || 'down',
    normX: G.player.x / mw,
    normY: G.player.y / mh,
  } : null;

  const monsters = (G.monsters || []).map(m => {
    let type = 'normal';
    if (m.isBoss) type = 'boss';
    else if (m.isElite) type = 'elite';
    else if (m.aggro) type = 'aggro';

    return {
      id: m.id,
      name: m.name,
      x: m.x,
      y: m.y,
      normX: m.x / mw,
      normY: m.y / mh,
      type,
    };
  });

  const npcs = (G.npcs || []).map(n => ({
    id: n.id,
    name: n.name,
    x: n.x,
    y: n.y,
    normX: n.x / mw,
    normY: n.y / mh,
  }));

  const portals = (G.portals || []).map(p => ({
    to: p.to,
    label: p.label,
    x: p.x,
    y: p.y,
    normX: p.x / mw,
    normY: p.y / mh,
  }));

  return { player, monsters, npcs, portals };
}

/**
 * Renders the World Atlas canvas onto a provided HTML5 Canvas context.
 * @param {HTMLCanvasElement} canvas
 * @param {object} state
 */
export function renderWorldAtlas(canvas, {
  currentZone = 'town_awakening',
  guardiansSlain = new Set(),
  selectedZone = null,
  zeny = 0,
  T = (s) => s,
} = {}) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width || 800;
  const h = canvas.height || 600;

  // Background parchment styling
  ctx.fillStyle = '#16100b';
  ctx.fillRect(0, 0, w, h);

  // Faint decorative grid lines
  ctx.strokeStyle = 'rgba(217, 119, 6, 0.08)';
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  for (let y = 0; y < h; y += 40) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }

  // Draw Highways
  for (const hw of ATLAS_HIGHWAYS) {
    const fromNode = ZONE_ATLAS_NODES[hw.from];
    const toNode = ZONE_ATLAS_NODES[hw.to];
    if (!fromNode || !toNode) continue;

    const fromUnlocked = isZoneUnlocked(hw.from, guardiansSlain);
    const toUnlocked = isZoneUnlocked(hw.to, guardiansSlain);
    const activeRoute = fromUnlocked && toUnlocked;

    ctx.beginPath();
    ctx.moveTo(fromNode.x, fromNode.y);
    ctx.lineTo(toNode.x, toNode.y);

    if (activeRoute) {
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
      ctx.lineWidth = 3;
      ctx.setLineDash([]);
    } else {
      ctx.strokeStyle = 'rgba(100, 100, 100, 0.25)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
    }
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Draw Zone Nodes
  for (const [id, node] of Object.entries(ZONE_ATLAS_NODES)) {
    const unlocked = isZoneUnlocked(id, guardiansSlain);
    const isCurrent = id === currentZone;
    const isSelected = id === selectedZone;

    // Outer glow for current / selected
    if (isCurrent || isSelected) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, 24, 0, Math.PI * 2);
      ctx.fillStyle = isCurrent ? 'rgba(34, 197, 94, 0.25)' : 'rgba(245, 158, 11, 0.25)';
      ctx.fill();
    }

    // Node Circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, 16, 0, Math.PI * 2);
    ctx.fillStyle = unlocked ? '#281a10' : '#141414';
    ctx.fill();

    ctx.strokeStyle = unlocked ? (node.color || '#f59e0b') : '#4b5563';
    ctx.lineWidth = isCurrent ? 3 : 2;
    ctx.stroke();

    // Node Sigil
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(unlocked ? node.sigil : '🔒', node.x, node.y + 1);

    // Node Label
    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = unlocked ? '#fef3c7' : '#6b7280';
    ctx.fillText(T(node.name, 'maps'), node.x, node.y + 26);

    // Level Range
    ctx.font = '9px sans-serif';
    ctx.fillStyle = unlocked ? 'rgba(254, 243, 199, 0.7)' : '#4b5563';
    ctx.fillText(`Lv. ${node.levelRange[0]}-${node.levelRange[1]}`, node.x, node.y + 37);

    // Current Player Indicator
    if (isCurrent) {
      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText(`● ${T('YOU ARE HERE', 'ui')}`, node.x, node.y - 24);
    }
  }
}
