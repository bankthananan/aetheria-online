// js/render/command-palette.js
// Universal Command & Codex Search Palette (Ctrl+K / Cmd+K / '/').
// Searches across Zones, Monsters, Items, and Game Menus in English & Thai,
// and executes direct navigation / fast-travel / auto-hunt / codex jumps.
// Strict ZERO Screen Shake.

import { ZONE_ATLAS_NODES, isZoneUnlocked, executeFastTravel } from './world-atlas.js';
import { CONTENT } from '../content.js';
import { T } from '../locale.js';

export const PANEL_SHORTCUTS = [
  { id: 'panel_atlas', category: 'panel', icon: '🗺️', title: '10-Zone World Atlas', subtitle: 'World (M) · Fast Travel & Realm Map', panelId: 'world', subTab: 'atlas' },
  { id: 'panel_char', category: 'panel', icon: '🛡️', title: 'Character Status', subtitle: 'Status (C) · Stats, Paperdoll & Sets', panelId: 'char' },
  { id: 'panel_inv', category: 'panel', icon: '🎒', title: 'Satchel Inventory', subtitle: 'Satchel (I) · Gear, Gems & Cards', panelId: 'inv' },
  { id: 'panel_skills', category: 'panel', icon: '✨', title: 'Class Abilities & Skill Tree', subtitle: 'Abilities (K) · Active & Passive Skills', panelId: 'skills' },
  { id: 'panel_spire', category: 'panel', icon: '🌀', title: 'Abyssal Spire', subtitle: 'World (M) · Endless Challenge Tower', panelId: 'world', subTab: 'spire' },
  { id: 'panel_stronghold', category: 'panel', icon: '🏰', title: 'Guild Stronghold', subtitle: 'World (M) · Facilities, Trophies & Siege', panelId: 'world', subTab: 'stronghold' },
  { id: 'panel_homestead', category: 'panel', icon: '🏡', title: "Adventurer's Homestead", subtitle: 'World (M) · Crops, Hearth & Mannequins', panelId: 'world', subTab: 'homestead' },
  { id: 'panel_pets', category: 'panel', icon: '🐾', title: 'Companions & Mounts', subtitle: 'Pets (P) · Summon, Mount & Evolve', panelId: 'pets' },
  { id: 'panel_book', category: 'panel', icon: '📖', title: 'Bestiary & Collection Book', subtitle: 'Book (B) · Monsters, Cards & Items', panelId: 'book', bookTab: 'bestiary' },
  { id: 'panel_automation', category: 'panel', icon: '🤖', title: 'Automation Console', subtitle: 'Auto (T) · Hunt Profiles & Macros', panelId: 'automation' },
  { id: 'panel_loadouts', category: 'panel', icon: '⚔️', title: 'Equipment Loadouts', subtitle: 'Loadouts (L) · Save & Swap Gear Sets', panelId: 'loadouts' },
];

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function matchesQuery(q, ...fields) {
  if (!q) return true;
  for (const f of fields) {
    if (f && String(f).toLowerCase().includes(q)) return true;
  }
  return false;
}

/**
 * Searches the unified game index across Panels, Zones, Monsters, and Items.
 * @param {string} query
 * @param {object} G
 * @param {object} [opts]
 * @returns {Array<object>}
 */
export function searchGameIndex(query = '', G = {}, opts = {}) {
  const q = String(query || '').trim().toLowerCase();
  const limit = opts.limit || 14;
  const results = [];
  const slain = G?.guardiansSlain || new Set();
  const inv = G?.player?.inventory || [];

  // 1. Panels & Subsystems
  for (const p of PANEL_SHORTCUTS) {
    const thTitle = T(p.title, 'ui');
    if (matchesQuery(q, p.title, p.subtitle, thTitle, p.id)) {
      results.push({
        ...p,
        actionLabel: 'Open Menu',
      });
    }
  }

  // 2. Zones (10-Zone World Atlas)
  for (const node of Object.values(ZONE_ATLAS_NODES)) {
    const thName = T(node.name, 'maps');
    if (matchesQuery(q, node.name, thName, node.id, node.desc)) {
      const unlocked = isZoneUnlocked(node.id, slain);
      results.push({
        id: node.id,
        category: 'zone',
        icon: node.sigil || '🗺️',
        title: node.name,
        subtitle: `Lv ${node.levelRange[0]}–${node.levelRange[1]} · ${unlocked ? 'Unlocked' : 'Locked'}`,
        unlocked,
        actionLabel: 'Fast Travel / Route',
      });
    }
  }

  // If query is empty, return top featured shortcuts (Panels + Starting Zones)
  if (!q) {
    return results.slice(0, limit);
  }

  // 3. Monsters (Bestiary)
  const monsters = CONTENT?.monsters || [];
  for (const m of monsters) {
    const thName = T(m.name, 'monsters');
    if (matchesQuery(q, m.name, thName, m.id, m.element)) {
      results.push({
        id: m.id,
        category: 'monster',
        icon: m.sizeTiles >= 2 ? '💀' : '👾',
        title: m.name,
        subtitle: `Lv ${m.level || 1}${m.element ? ` · ${m.element}` : ''}`,
        actionLabel: 'Hunt / Route',
      });
    }
  }

  // 4. Items & Equipment
  const items = CONTENT?.items || [];
  for (const it of items) {
    const thName = T(it.name, 'items');
    if (matchesQuery(q, it.name, thName, it.id, it.type)) {
      const owned = inv.some(e => (e.itemId || e.id) === it.id && (e.qty ?? 1) > 0);
      results.push({
        id: it.id,
        category: 'item',
        icon: it.type === 'weapon' ? '⚔️' : it.type === 'card' ? '🃏' : it.type === 'potion' ? '🧪' : '💎',
        title: it.name,
        subtitle: `${it.type || 'item'}${owned ? ' · In Satchel' : ''}`,
        owned,
        actionLabel: owned ? 'Open in Satchel' : 'View in Codex',
      });
    }
  }

  return results.slice(0, limit);
}

/**
 * Renders the Command & Codex Search Palette HTML.
 * @param {object} state - { query, results, activeIndex }
 * @param {object} [G]
 * @param {Function} [translateFn]
 * @returns {string}
 */
export function renderCommandPaletteHtml(state = {}, G = {}, translateFn = T) {
  const query = state.query || '';
  const results = Array.isArray(state.results) ? state.results : searchGameIndex(query, G);
  const activeIdx = Math.max(0, Math.min(state.activeIndex || 0, Math.max(0, results.length - 1)));

  const categoryLabels = {
    panel: translateFn('Menus', 'ui'),
    zone: translateFn('Zones', 'ui'),
    monster: translateFn('Monsters', 'ui'),
    item: translateFn('Items', 'ui'),
  };

  const rowsHtml = results.length
    ? results.map((r, idx) => {
        const isActive = idx === activeIdx;
        const catBadge = categoryLabels[r.category] || r.category;
        return `<div class="cmd-palette-row${isActive ? ' is-active' : ''}" data-cmd-index="${idx}" data-cmd-id="${escHtml(r.id)}" data-cmd-cat="${escHtml(r.category)}" role="option" aria-selected="${isActive}">` +
          `<span class="cmd-palette-row__icon" aria-hidden="true">${r.icon || '✦'}</span>` +
          `<div class="cmd-palette-row__main">` +
            `<div class="cmd-palette-row__title"><b>${escHtml(translateFn(r.title, r.category === 'monster' ? 'monsters' : r.category === 'item' ? 'items' : r.category === 'zone' ? 'maps' : 'ui'))}</b> <small class="cmd-palette-row__cat">${escHtml(catBadge)}</small></div>` +
            `<small class="cmd-palette-row__sub">${escHtml(r.subtitle || '')}</small>` +
          `</div>` +
          `<span class="cmd-palette-row__action">${escHtml(translateFn(r.actionLabel || 'Open Menu', 'ui'))} ↵</span>` +
        `</div>`;
      }).join('')
    : `<div class="cmd-palette-empty">${escHtml(translateFn('No matching entries found.', 'ui'))}</div>`;

  return `<div class="cmd-palette-modal ro-parchment" role="dialog" aria-modal="true" aria-label="${escHtml(translateFn('Command & Codex Search', 'ui'))}">` +
    `<div class="cmd-palette-head">` +
      `<span class="cmd-palette-head__title">🔍 ${escHtml(translateFn('Command & Codex Search', 'ui'))}</span>` +
      `<button type="button" class="panel__close" data-cmd-close="1" aria-label="${escHtml(translateFn('Close', 'ui'))}">✕</button>` +
    `</div>` +
    `<div class="cmd-palette-body">` +
      `<div class="cmd-palette-input-wrap">` +
        `<input type="search" id="cmd-palette-input" class="cmd-palette-input" value="${escHtml(query)}" placeholder="${escHtml(translateFn('Search zones, monsters, items, or menus…', 'ui'))}" autocomplete="off" />` +
      `</div>` +
      `<div class="cmd-palette-list" role="listbox">${rowsHtml}</div>` +
      `<div class="cmd-palette-foot"><small class="ro-muted">${escHtml(translateFn('Press ↑↓ to navigate · Enter to execute · Esc to close', 'ui'))}</small></div>` +
    `</div>` +
  `</div>`;
}

/**
 * Executes the selected command palette entry against the engine API.
 * @param {object} entry
 * @param {object} engine - Engine surface (window.__AWO or subset)
 * @returns {{ ok: boolean, action?: string }}
 */
export function executeCommandAction(entry, engine) {
  if (!entry || !engine) return { ok: false };
  const G = engine.G || {};

  if (entry.category === 'panel') {
    const panelId = entry.panelId || 'world';
    if (entry.subTab) G._chronicleTab = entry.subTab;
    if (entry.bookTab) G._bookTab = entry.bookTab;
    engine.togglePanel?.(panelId);
    return { ok: true, action: 'panel' };
  }

  if (entry.category === 'zone') {
    const ft = executeFastTravel(entry.id, {
      ...G,
      loadMap: m => engine.loadMap?.(m),
    });
    if (ft.success) {
      return { ok: true, action: 'fast_travel' };
    }
    if (typeof engine.activateWorldRoute === 'function') {
      engine.activateWorldRoute(entry.id);
      return { ok: true, action: 'route' };
    }
    if (isZoneUnlocked(entry.id, G.guardiansSlain || new Set()) && typeof engine.loadMap === 'function') {
      engine.loadMap(entry.id);
      return { ok: true, action: 'load_map' };
    }
    G._chronicleTab = 'atlas';
    engine.togglePanel?.('world');
    return { ok: true, action: 'atlas' };
  }

  if (entry.category === 'monster') {
    G.huntTargetId = entry.id;
    if (typeof engine.activateTaskGuide === 'function') {
      engine.activateTaskGuide('monster', entry.id);
      return { ok: true, action: 'hunt_monster' };
    }
    G._bookTab = 'bestiary';
    engine.togglePanel?.('book');
    return { ok: true, action: 'codex_monster' };
  }

  if (entry.category === 'item') {
    const inv = G.player?.inventory || [];
    const owned = inv.some(e => (e.itemId || e.id) === entry.id && (e.qty ?? 1) > 0);
    if (owned) {
      G._bagSearch = entry.title || entry.id;
      engine.togglePanel?.('inv');
      return { ok: true, action: 'open_satchel' };
    }
    G._bookTab = 'items';
    engine.togglePanel?.('book');
    return { ok: true, action: 'codex_item' };
  }

  return { ok: false };
}
