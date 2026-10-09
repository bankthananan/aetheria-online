// js/render/spire-ui.js
// Abyssal Spire UX/UI Encounter HUD, Checkpoint Elevator Modal & Reliquary Shop with Strict Boxing Containment.

import {
  SPIRE_BIOMES,
  SPIRE_AFFIXES,
  CHECKPOINT_FLOORS,
} from '../systems/spire.js';

export const SPIRE_RELIQUARY_CATALOG = [
  {
    id: 'crown_of_the_ascendant',
    name: 'Crown of the Ascendant',
    category: 'relic',
    icon: '👑',
    cost: 2500,
    desc: 'A celestial coronet forged from raw starlight. Increases damage in Spire & Dungeons by +15% and grants +10% all elemental resistances.',
  },
  {
    id: 'abyssal_compass',
    name: 'Abyssal Compass',
    category: 'relic',
    icon: '🧭',
    cost: 1200,
    desc: 'A gyroscopic needle pointing toward the spire zenith. Increases Flee by +15% and Movement Speed by +10%.',
  },
  {
    id: 'spire_sigil',
    name: 'Ascendant Sigil',
    category: 'accessory',
    icon: '💠',
    cost: 800,
    desc: 'A luminescent seal worn by tower conquerors. Grants +220 HP, +16 ATK, and +14 DEF.',
  },
  {
    id: 'spire_blade',
    name: 'Spire Blade',
    category: 'transmog',
    icon: '⚔️',
    cost: 1500,
    desc: 'A slender ascendant blade radiating celestial resonance.',
  },
  {
    id: 'spire_scythe',
    name: 'Spire Scythe',
    category: 'transmog',
    icon: '🌙',
    cost: 1500,
    desc: 'A curved ascendant war-scythe forged from tower alloy.',
  },
  {
    id: 'spire_greatsword',
    name: 'Spire Greatsword',
    category: 'transmog',
    icon: '🗡️',
    cost: 1500,
    desc: 'A massive ascendant greatsword humming with tower power.',
  },
  {
    id: 'spire_staff',
    name: 'Spire Staff',
    category: 'transmog',
    icon: '🪄',
    cost: 1500,
    desc: 'An ascendant catalyst channeling the spire leylines.',
  },
  {
    id: 'spire_bow',
    name: 'Spire Bow',
    category: 'transmog',
    icon: '🏹',
    cost: 1500,
    desc: 'An ascendant recurve bow tuned to the upper spire winds.',
  },
  {
    id: 'spire_knuckles',
    name: 'Spire Knuckles',
    category: 'transmog',
    icon: '🥊',
    cost: 1500,
    desc: 'Ascendant knuckle wraps dense with condensed starlight.',
  },
];

/**
 * Escapes HTML characters for safe user-facing insertion.
 * @param {any} val
 * @returns {string}
 */
function esc(val) {
  return String(val ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch]));
}

/**
 * Maps a floor number to its respective Biome definition.
 * @param {number} floor
 * @param {object} biomes
 * @returns {object}
 */
function getBiomeForFloor(floor, biomes = SPIRE_BIOMES) {
  const f = Math.max(1, Math.min(100, Math.floor(floor || 1)));
  if (f <= 20) return biomes.depths;
  if (f <= 40) return biomes.glacial;
  if (f <= 60) return biomes.caldera;
  if (f <= 80) return biomes.storm;
  return biomes.void;
}

/**
 * Factory creating the Spire UI Renderer.
 * @param {object} options
 * @param {Function} [options.T]
 * @param {object} [options.SPIRE_BIOMES]
 * @param {object} [options.SPIRE_AFFIXES]
 * @param {number[]} [options.CHECKPOINT_FLOORS]
 */
export function createSpireUIRenderer({
  T = (s) => s,
  SPIRE_BIOMES: biomes = SPIRE_BIOMES,
  SPIRE_AFFIXES: affixes = SPIRE_AFFIXES,
  CHECKPOINT_FLOORS: checkpoints = CHECKPOINT_FLOORS,
} = {}) {

  /**
   * Renders the active Spire Encounter HUD.
   * @param {object} spireState
   * @returns {string} HTML string
   */
  function renderSpireHudHtml(spireState) {
    if (!spireState || !spireState.active) {
      return '';
    }

    const currentFloor = Math.max(1, Math.min(100, Math.floor(spireState.currentFloor || 1)));
    const biome = getBiomeForFloor(currentFloor, biomes);
    const isMilestone = currentFloor % 10 === 0;
    const emblemsEarned = spireState.emblemsEarned || 0;
    const activeAffixes = Array.isArray(spireState.activeAffixes) ? spireState.activeAffixes : [];

    // Milestone Boss Badge
    const milestoneBadge = isMilestone
      ? `<span class="spire-milestone-badge" style="flex-shrink: 0; box-sizing: border-box; padding: 2px 8px; border-radius: 4px; background: var(--oxblood); color: var(--text); font-weight: 800; font-size: 11px; white-space: nowrap; border: 1px solid var(--danger); text-shadow: 0 1px 2px rgba(0,0,0,0.8);">☠ ${T('MILESTONE BOSS', 'ui')}</span>`
      : '';

    // Active Affixes Badges
    const affixBadges = activeAffixes.map(affix => {
      const name = esc(T(affix.name || affix.id, 'ui'));
      const desc = esc(T(affix.desc || '', 'ui'));
      const icon = affix.icon || '🌀';
      return `<span class="spire-affix-badge" title="${desc}" style="flex-shrink: 0; box-sizing: border-box; display: inline-flex; align-items: center; gap: 4px; padding: 2px 6px; border-radius: 4px; background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); font-size: 11px; color: var(--text); white-space: nowrap;">${icon} ${name}</span>`;
    }).join('');

    return `
      <div class="spire-encounter-hud" style="box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden; padding: 8px 12px; background: var(--wood-deep); border: 1px solid #7c4dff; border-radius: 6px; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.7); margin-bottom: 6px;">
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden;">
          <!-- Floor Pill & Biome Badge -->
          <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap; box-sizing: border-box; min-width: 0; overflow-x: hidden;">
            <span class="spire-floor-pill" style="flex-shrink: 0; box-sizing: border-box; padding: 2px 8px; border-radius: 12px; background: rgba(124, 77, 255, 0.25); border: 1px solid #7c4dff; color: #b388ff; font-weight: 800; font-size: 11px; white-space: nowrap;">✦ ${T('Floor', 'ui')} ${currentFloor} / 100</span>
            <span class="spire-biome-badge" style="flex-shrink: 0; box-sizing: border-box; padding: 2px 8px; border-radius: 12px; background: ${biome.color}; color: var(--text); font-weight: 700; font-size: 11px; white-space: nowrap; border: 1px solid rgba(255,255,255,0.2);">${esc(T(biome.name, 'maps'))}</span>
            ${milestoneBadge}
          </div>

          <!-- Affixes and Emblems -->
          <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap; box-sizing: border-box; min-width: 0; overflow-x: hidden;">
            ${affixBadges}
            <span class="spire-emblems-pill" style="flex-shrink: 0; box-sizing: border-box; padding: 2px 8px; border-radius: 12px; background: color-mix(in srgb, var(--info) 15%, transparent); border: 1px solid var(--info); color: var(--info); font-weight: 700; font-size: 11px; white-space: nowrap;">💎 ${emblemsEarned} ${T('Emblems', 'ui')}</span>
          </div>
        </div>
      </div>
    `.trim();
  }

  /**
   * Renders the Checkpoint Elevator Modal HTML.
   * @param {object} spireProgress
   * @param {object} [options]
   * @param {boolean} [options.inline]
   * @returns {string} HTML string
   */
  function renderElevatorModalHtml(spireProgress = {}, { inline = false } = {}) {
    const highestFloor = typeof spireProgress?.highestFloor === 'number' ? spireProgress.highestFloor : 0;
    const totalEmblems = typeof spireProgress?.emblems === 'number' ? spireProgress.emblems : 0;
    const unlockedCheckpoints = Array.isArray(spireProgress?.unlockedCheckpoints) && spireProgress.unlockedCheckpoints.length > 0
      ? spireProgress.unlockedCheckpoints
      : [1];
    const unlockedTitles = Array.isArray(spireProgress?.unlockedTitles) && spireProgress.unlockedTitles.length > 0
      ? spireProgress.unlockedTitles.map(t => esc(T(t, 'ui'))).join(', ')
      : T('None', 'ui');

    // 10 Checkpoints list
    const checkpointsHtml = checkpoints.map(floor => {
      const biome = getBiomeForFloor(floor, biomes);
      const isUnlocked = unlockedCheckpoints.includes(floor);

      if (isUnlocked) {
        return `
          <div class="spire-checkpoint-card spire-checkpoint-unlocked" style="box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden; display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(124, 77, 255, 0.4); border-radius: 6px; margin-bottom: 8px;">
            <div style="box-sizing: border-box; min-width: 0; display: flex; align-items: center; gap: 8px;">
              <span style="font-weight: 800; font-size: 14px; color: var(--text); box-sizing: border-box; min-width: 0;">Floor ${floor}</span>
              <span class="spire-biome-pill" style="flex-shrink: 0; box-sizing: border-box; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 10px; background: ${biome.color}; color: var(--text); border: 1px solid rgba(255,255,255,0.2);">${esc(T(biome.name, 'maps'))}</span>
            </div>
            <button class="btn btn--primary spire-ascend-btn" data-spire-ascend="${floor}" style="box-sizing: border-box; min-width: 0; padding: 6px 14px; cursor: pointer; font-weight: 700;">${T('Ascend', 'ui')}</button>
          </div>
        `.trim();
      } else {
        const requiredFloor = floor - 1;
        const reqText = T('Requires Floor {f} Cleared', 'ui').replace('{f}', requiredFloor);
        return `
          <div class="spire-checkpoint-card spire-checkpoint-locked" style="box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden; display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 6px; margin-bottom: 8px; opacity: 0.65;">
            <div style="box-sizing: border-box; min-width: 0; display: flex; align-items: center; gap: 8px;">
              <span style="font-weight: 700; font-size: 14px; color: var(--text-muted); box-sizing: border-box; min-width: 0;">🔒 Floor ${floor}</span>
              <span class="spire-biome-pill" style="flex-shrink: 0; box-sizing: border-box; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 10px; background: rgba(255, 255, 255, 0.08); color: var(--text-muted);">${esc(T(biome.name, 'maps'))}</span>
            </div>
            <span style="box-sizing: border-box; min-width: 0; font-size: 11px; color: var(--danger-text); font-weight: 600;">${esc(reqText)}</span>
          </div>
        `.trim();
      }
    }).join('\n');

    const overlayStyle = inline
      ? `position: relative; box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden; display: flex; align-items: center; justify-content: center;`
      : `position: fixed; inset: 0; box-sizing: border-box; z-index: 9999; display: flex; align-items: center; justify-content: center; background: rgba(9, 5, 2, 0.8); backdrop-filter: blur(4px); width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden;`;

    return `
      <div class="spire-elevator-overlay" style="${overlayStyle}">
        <div class="spire-elevator-shell" style="box-sizing: border-box; width: 100%; max-width: ${inline ? '100%' : '560px'}; min-width: 0; ${inline ? '' : 'max-height: 90vh; overflow-y: auto;'} overflow-x: hidden; border-radius: 8px; background: ${inline ? 'var(--card-bg)' : 'var(--wood-deep)'}; border: 2px solid #7c4dff; box-shadow: 0 16px 40px rgba(0, 0, 0, 0.9); padding: 20px; color: var(--text);">
          <!-- Header with Title and Close Button -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; border-bottom: 1px solid rgba(124, 77, 255, 0.3); padding-bottom: 10px; box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden;">
            <h2 style="margin: 0; font-size: 17px; font-weight: 800; color: #b388ff; text-shadow: 0 2px 4px rgba(0,0,0,0.8); box-sizing: border-box; min-width: 0; word-break: break-word;">
              🌀 ${T('Ascendant Elevator', 'ui')} — ${T('Abyssal Spire', 'ui')}
            </h2>
            ${inline ? '' : `<button class="btn btn--ghost spire-modal-close" data-spire-close="1" style="box-sizing: border-box; min-width: 0; font-size: 17px; line-height: 1; padding: 4px 8px; cursor: pointer; color: #b388ff; background: transparent; border: 1px solid transparent; border-radius: 4px;">✕</button>`}
          </div>

          <!-- Stats Banner -->
          <div class="spire-stats-banner" style="box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; padding: 10px 12px; background: rgba(0, 0, 0, 0.4); border: 1px solid rgba(124, 77, 255, 0.3); border-radius: 6px; margin-bottom: 14px;">
            <div style="box-sizing: border-box; min-width: 0;">
              <small style="color: var(--text-muted); font-size: 11px; display: block; box-sizing: border-box; min-width: 0;">${T('Highest Floor Cleared', 'ui')}</small>
              <b style="color: var(--gold-bright); font-size: 14px; box-sizing: border-box; min-width: 0;">${highestFloor} / 100</b>
            </div>
            <div style="box-sizing: border-box; min-width: 0;">
              <small style="color: var(--text-muted); font-size: 11px; display: block; box-sizing: border-box; min-width: 0;">${T('Total Emblems', 'ui')}</small>
              <b style="color: var(--info); font-size: 14px; box-sizing: border-box; min-width: 0;">💎 ${totalEmblems}</b>
            </div>
            <div style="box-sizing: border-box; min-width: 0;">
              <small style="color: var(--text-muted); font-size: 11px; display: block; box-sizing: border-box; min-width: 0;">${T('Prestige Titles', 'ui')}</small>
              <b style="color: #b388ff; font-size: 14px; box-sizing: border-box; min-width: 0;">${unlockedTitles}</b>
            </div>
          </div>

          <!-- Checkpoints Grid / List -->
          <div class="spire-checkpoint-list" style="box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden;">
            ${checkpointsHtml}
          </div>
        </div>
      </div>
    `.trim();
  }

  /**
   * Renders the Spire Reliquary Shop HTML tab.
   * @param {object} spireProgress
   * @param {Array} inventory
   * @returns {string} HTML string
   */
  function renderSpireReliquaryTabHtml(spireProgress = {}, inventory = []) {
    const emblems = typeof spireProgress?.emblems === 'number' ? spireProgress.emblems : 0;

    const itemsHtml = SPIRE_RELIQUARY_CATALOG.map(item => {
      const hasEnough = emblems >= item.cost;
      const buttonHtml = hasEnough
        ? `<button class="btn btn--primary" data-spire-buy="${item.id}" data-spire-cost="${item.cost}" style="box-sizing: border-box; min-width: 0; width: 100%; padding: 6px 12px; cursor: pointer; font-weight: 700;">${T('Exchange', 'ui')}</button>`
        : `<button class="btn btn--disabled" disabled style="box-sizing: border-box; min-width: 0; width: 100%; padding: 6px 12px; cursor: not-allowed; opacity: 0.5;">${T('Need More Emblems', 'ui')}</button>`;

      return `
        <div class="spire-reliquary-item-card" style="box-sizing: border-box; min-width: 0; display: flex; flex-direction: column; justify-content: space-between; padding: 12px; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(124, 77, 255, 0.3); border-radius: 6px;">
          <div style="box-sizing: border-box; min-width: 0; margin-bottom: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 6px; box-sizing: border-box; min-width: 0; margin-bottom: 4px;">
              <span style="font-weight: 800; font-size: 12px; color: var(--text); box-sizing: border-box; min-width: 0; word-break: break-word;">${item.icon} ${esc(T(item.name, 'items'))}</span>
              <span style="box-sizing: border-box; min-width: 0; color: var(--info); font-weight: 700; font-size: 12px; white-space: nowrap;">💎 ${item.cost.toLocaleString()} ${T('Emblems', 'ui')}</span>
            </div>
            <p style="box-sizing: border-box; min-width: 0; font-size: 11px; color: var(--text-muted); margin: 4px 0 0 0; line-height: 1.4; word-break: break-word;">${esc(T(item.desc, 'items'))}</p>
          </div>
          <div style="box-sizing: border-box; min-width: 0; margin-top: 8px;">
            ${buttonHtml}
          </div>
        </div>
      `.trim();
    }).join('\n');

    return `
      <div class="spire-reliquary-catalog" style="box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden; padding: 14px; background: var(--wood-deep); border: 1px solid #7c4dff; border-radius: 6px;">
        <!-- Header row with Reliquary Title and Emblems Balance -->
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; border-bottom: 1px solid rgba(124, 77, 255, 0.3); padding-bottom: 8px; box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden;">
          <div>
            <h3 style="margin: 0; font-size: 14px; font-weight: 800; color: #b388ff; box-sizing: border-box; min-width: 0;">
              ✨ ${T('Spire Reliquary', 'ui')}
            </h3>
            <small style="color: var(--text-muted); font-size: 11px; box-sizing: border-box; min-width: 0;">
              ${T('Exchange earned Spire Emblems for ascendant relics and transmogs.', 'ui')}
            </small>
          </div>
          <span class="spire-emblem-balance" style="box-sizing: border-box; min-width: 0; padding: 4px 10px; border-radius: 12px; background: color-mix(in srgb, var(--info) 20%, transparent); border: 1px solid var(--info); color: var(--info); font-weight: 800; font-size: 12px; white-space: nowrap;">
            💎 ${emblems} ${T('Spire Emblems', 'ui')}
          </span>
        </div>

        <!-- Catalog Items Grid -->
        <div class="spire-reliquary-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 10px; box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden;">
          ${itemsHtml}
        </div>
      </div>
    `.trim();
  }

  return {
    renderSpireHudHtml,
    renderElevatorModalHtml,
    renderSpireReliquaryTabHtml,
  };
}
