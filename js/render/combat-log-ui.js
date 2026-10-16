// js/render/combat-log-ui.js
// Combat Log 2.0 (Categorized All/Combat/Loot/System tabs with soft-edge fade)
// & Celebratory Rare Loot / Boss Fanfare Banners.
// Strict ZERO Screen Shake.

import { T } from '../locale.js';

export const MYTHIC_CATALYST_IDS = new Set([
  'kernel_core',
  'colossus_plating',
  'voidstone_ore',
]);

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Classifies a log message into 'combat', 'loot', or 'sys'.
 * @param {string} text
 * @param {string} [kind='']
 * @returns {'combat'|'loot'|'sys'}
 */
export function classifyLogChannel(text = '', kind = '') {
  const s = String(text || '').toLowerCase();
  if (kind === 'sys' || s.startsWith('+') || s.includes('chronicle') || s.includes('saved') || s.includes('welcome')) {
    return 'sys';
  }
  if (
    s.includes('found ') ||
    s.includes('obtained') ||
    s.includes('equipped') ||
    s.includes('crafted') ||
    s.includes('bought') ||
    s.includes('sold') ||
    s.includes('zeny') ||
    s.includes('card') ||
    s.includes('socketed') ||
    s.includes('아이템') ||
    s.includes('ได้รับ') ||
    s.includes('สวมใส่')
  ) {
    return 'loot';
  }
  if (
    kind === 'bad' ||
    s.includes('defeated') ||
    s.includes('damage') ||
    s.includes('healed') ||
    s.includes('slain') ||
    s.includes('exp') ||
    s.includes('crit') ||
    s.includes('กำจัด')
  ) {
    return 'combat';
  }
  return kind === 'good' ? 'loot' : 'sys';
}

/**
 * Filters buffered log entries by active tab ('all', 'combat', 'loot', 'sys').
 * @param {Array<object>} entries
 * @param {string} [tab='all']
 * @returns {Array<object>}
 */
export function filterLogEntries(entries = [], tab = 'all') {
  if (!Array.isArray(entries)) return [];
  if (!tab || tab === 'all') return entries;
  return entries.filter(e => e && (e.channel || classifyLogChannel(e.text, e.kind)) === tab);
}

/**
 * Renders the filter tab pill strip above the message log.
 * @param {string} [activeTab='all']
 * @param {Function} [translateFn]
 * @returns {string}
 */
export function renderLogFilterTabsHtml(activeTab = 'all', translateFn = T) {
  const tabs = [
    { id: 'all', label: 'All' },
    { id: 'combat', label: 'Combat' },
    { id: 'loot', label: 'Loot' },
    { id: 'sys', label: 'System' },
  ];
  return `<div class="msg-log-tabs" role="tablist" aria-label="Message log filters">` +
    tabs.map(t => {
      const isAct = t.id === activeTab;
      return `<button type="button" class="msg-log-tab${isAct ? ' is-active' : ''}" data-log-tab="${t.id}" role="tab" aria-selected="${isAct}">${escHtml(translateFn(t.label, 'ui'))}</button>`;
    }).join('') +
  `</div>`;
}

/**
 * Evaluates whether a loot drop or boss kill event warrants a top-center ceremonial fanfare banner.
 * @param {object} event
 * @returns {object|null}
 */
export function shouldTriggerFanfare(event = {}) {
  if (!event || typeof event !== 'object') return null;

  if (event.type === 'boss_kill') {
    return {
      kind: 'boss',
      icon: '👑',
      headline: 'Guardian Vanquished!',
      title: event.name || event.monsterId || 'Zone Guardian',
    };
  }

  if (event.type === 'item') {
    const id = String(event.itemId || event.id || '');
    const name = event.name || id;
    const itemType = event.itemType || (id.startsWith('card_') ? 'card' : '');
    const rarity = String(event.rarity || '').toLowerCase();

    if (itemType === 'card' || id.startsWith('card_')) {
      return {
        kind: 'card',
        icon: '🃏',
        headline: 'Monster Card Discovered!',
        title: name,
      };
    }

    if (MYTHIC_CATALYST_IDS.has(id)) {
      return {
        kind: 'catalyst',
        icon: '🔮',
        headline: 'Mythic Catalyst Acquired!',
        title: name,
      };
    }

    if (rarity === 'legendary') {
      return {
        kind: 'legendary',
        icon: '🌟',
        headline: 'Legendary Treasure Found!',
        title: name,
      };
    }

    if (rarity === 'epic') {
      return {
        kind: 'epic',
        icon: '✦',
        headline: 'Epic Equipment Found!',
        title: name,
      };
    }
  }

  return null;
}

/**
 * Renders the HTML string for a celebratory Loot / Boss Fanfare plaque.
 * @param {object} banner - { kind, icon, headline, title }
 * @param {Function} [translateFn]
 * @returns {string}
 */
export function renderLootFanfareHtml(banner, translateFn = T) {
  if (!banner) return '';
  const kind = escHtml(banner.kind || 'loot');
  const icon = banner.icon || '✦';
  const headline = escHtml(translateFn(banner.headline || 'Rare Discovery!', 'ui'));
  const ns = banner.kind === 'boss' ? 'monsters' : 'items';
  const title = escHtml(translateFn(banner.title || '', ns));

  return `<div class="loot-fanfare loot-fanfare--${kind}" role="status" aria-live="polite">` +
    `<span class="loot-fanfare__icon" aria-hidden="true">${icon}</span>` +
    `<div class="loot-fanfare__copy">` +
      `<small class="loot-fanfare__headline">${headline}</small>` +
      `<b class="loot-fanfare__title">${title}</b>` +
    `</div>` +
    `<button type="button" class="loot-fanfare__close" data-fanfare-close="1" aria-label="Dismiss">✕</button>` +
  `</div>`;
}
