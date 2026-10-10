// js/render/raids-ui.js
// UX/UI Raid Encounter HUD & Victory Modal UI Renderer with Strict Boxing Containment.
// Renders active world boss encounter HUD (segmented HP bar, break shield, add mitigation, contribution pill, timer)
// and victory spoils modal (tier crest, performance breakdown, spoils showcase).

import { WORLD_BOSS_CATALOG, CONTRIBUTION_TIERS, RAID_STATES } from '../systems/raids.js';
import { CONTENT } from '../content.js';

const ITEM_NAME = Object.fromEntries(CONTENT.items.map(i => [i.id, i.name]));
const itemName = id => ITEM_NAME[id] || id;

export const TIER_COLORS = {
  bronze: '#cd7f32',
  silver: '#c0c0c0',
  gold: '#ffd700',
  paragon: '#e040fb',
};

/**
 * Computes contribution tier based on score.
 * @param {number} score
 * @param {object} [tiers]
 * @returns {string}
 */
export function getContributionTier(score, tiers = CONTRIBUTION_TIERS) {
  if (score >= 12000) return tiers.PARAGON || 'paragon';
  if (score >= 6000) return tiers.GOLD || 'gold';
  if (score >= 2500) return tiers.SILVER || 'silver';
  return tiers.BRONZE || 'bronze';
}

/**
 * Formats milliseconds remaining into M:SS string.
 * @param {number} remainingMs
 * @returns {string}
 */
export function formatRaidTimer(remainingMs) {
  const totalSecs = Math.max(0, Math.ceil(remainingMs / 1000));
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

/**
 * Safe string escaper for user-facing values.
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
 * Factory creating the Raids UI Renderer.
 * @param {object} options
 * @param {Function} [options.T]
 * @param {object} [options.WORLD_BOSS_CATALOG]
 * @param {object} [options.CONTRIBUTION_TIERS]
 */
export function createRaidsUIRenderer({
  T = (s) => s,
  WORLD_BOSS_CATALOG: catalog = WORLD_BOSS_CATALOG,
  CONTRIBUTION_TIERS: tiers = CONTRIBUTION_TIERS,
} = {}) {

  /**
   * Renders the active World Boss Encounter HUD.
   * @param {object} raidState
   * @returns {string} HTML string
   */
  function renderRaidHudHtml(raidState) {
    if (!raidState || !raidState.active) {
      return '';
    }

    const bossDef = raidState.bossDef || (raidState.bossId && catalog[raidState.bossId]) || {};
    const bossName = T(bossDef.name || 'World Boss', 'monsters');
    const elementRaw = (bossDef.element || 'void').toUpperCase();
    const elementBadge = `[${T(elementRaw, 'ui')}]`;

    // Timer calculation & formatting
    const now = raidState._now ?? (typeof Date !== 'undefined' ? Date.now() : 0);
    const remainingMs = raidState.remainingMs ?? (raidState.expiresAt ? Math.max(0, raidState.expiresAt - now) : (raidState.durationMs || 0));
    const formattedTimer = formatRaidTimer(remainingMs);

    // HP calculation & percentage
    const maxHp = raidState.maxHp || bossDef.maxHp || 1;
    const currentHp = Math.max(0, raidState.hp ?? 0);
    const hpPercent = Math.max(0, Math.min(100, Math.round((currentHp / maxHp) * 100)));

    // Score & Contribution Tier
    const score = raidState.score || 0;
    const tier = raidState.tier || getContributionTier(score, tiers);
    const tierKey = (tier || 'bronze').toLowerCase();
    const tierColor = TIER_COLORS[tierKey] || '#cd7f32';
    const tierBadge = `[${tierKey.toUpperCase()}]`;

    // Break Shield Bar (only when breakShield > 0)
    let breakShieldHtml = '';
    if (raidState.breakShield && raidState.breakShield > 0) {
      const maxBreakShield = raidState.maxBreakShield || bossDef.breakShieldHp || raidState.breakShield || 1;
      const breakPercent = Math.max(0, Math.min(100, Math.round((raidState.breakShield / maxBreakShield) * 100)));
      const aliveAdds = (raidState.adds || []).filter(a => a && a.alive).length;
      const mitigationPct = Math.round(Math.min(0.60, aliveAdds * 0.15) * 100);

      const addMitigationBadge = mitigationPct > 0
        ? `<span class="raid-mitigation-badge" style="flex-shrink: 0; box-sizing: border-box; padding: 1px 6px; font-size: 10px; font-weight: 700; color: var(--info); background: color-mix(in srgb, var(--info) 35%, transparent); border: 1px solid var(--info); border-radius: 4px; white-space: nowrap; margin-left: 6px;">🛡 +${mitigationPct}%</span>`
        : '';

      breakShieldHtml = `
        <div class="raid-break-shield-container" style="box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden; margin-top: 5px;">
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; margin-bottom: 2px; box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden;">
            <div style="display: flex; align-items: center; box-sizing: border-box; min-width: 0; overflow-x: hidden;">
              <span style="color: var(--info); font-weight: bold; box-sizing: border-box; min-width: 0; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">
                🛡 ${raidState.breakShield.toLocaleString()} / ${maxBreakShield.toLocaleString()}
              </span>
              ${addMitigationBadge}
            </div>
            <span style="color: var(--info); font-size: 10px; box-sizing: border-box; min-width: 0; white-space: nowrap;">
              ${breakPercent}%
            </span>
          </div>
          <div class="raid-break-bar" style="position: relative; width: 100%; max-width: 100%; min-width: 0; box-sizing: border-box; height: 10px; background: var(--card-bg); border: 1px solid var(--info); border-radius: 3px; overflow: hidden;">
            <div class="raid-break-fill" style="width: ${breakPercent}%; height: 100%; background: linear-gradient(90deg, var(--info), var(--info)); transition: width 0.2s ease; box-sizing: border-box; min-width: 0;"></div>
          </div>
        </div>
      `;
    }

    return `
      <div class="raid-encounter-hud" style="box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden; padding: 8px 12px; background: var(--wood-deep); border: 1px solid var(--gold-deep); border-radius: 6px; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.7); margin-bottom: 6px;">
        <!-- Header row: Boss Name + Element Badge & Timer + Contribution -->
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 5px; box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden;">
          <div style="display: flex; align-items: center; gap: 6px; box-sizing: border-box; min-width: 0; overflow-x: hidden;">
            <span style="font-size: 12px; font-weight: 800; color: var(--gold-bright); text-shadow: 0 1px 3px rgba(0,0,0,0.8); box-sizing: border-box; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${esc(bossName)}
            </span>
            <span class="raid-element-badge" style="flex-shrink: 0; font-size: 10px; font-weight: 700; color: var(--warn); background: color-mix(in srgb, var(--warn) 15%, transparent); border: 1px solid var(--warn); border-radius: 3px; padding: 1px 4px; box-sizing: border-box; white-space: nowrap;">
              ${esc(elementBadge)}
            </span>
          </div>
          <div style="display: flex; align-items: center; gap: 6px; box-sizing: border-box; min-width: 0; overflow-x: hidden;">
            <!-- Contribution Pill -->
            <div class="raid-contribution-pill" style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 6px; border-radius: 10px; background: var(--card-bg); border: 1px solid ${tierColor}; box-sizing: border-box; min-width: 0; white-space: nowrap;">
              <span style="color: ${tierColor}; font-weight: 800; font-size: 10px; box-sizing: border-box; min-width: 0; white-space: nowrap;">${esc(tierBadge)}</span>
              <span style="color: var(--text); font-size: 10px; font-weight: 600; box-sizing: border-box; min-width: 0; white-space: nowrap;">${score.toLocaleString()}</span>
            </div>
            <!-- Timer indicator -->
            <div class="raid-timer" style="display: inline-flex; align-items: center; gap: 3px; padding: 2px 6px; border-radius: 10px; background: var(--card-bg); border: 1px solid var(--gold-deep); color: var(--gold-bright); font-size: 10px; font-weight: 700; box-sizing: border-box; min-width: 0; white-space: nowrap;">
              <span>⏳</span>
              <span>${esc(formattedTimer)}</span>
            </div>
          </div>
        </div>

        <!-- HP Bar with 60% and 30% phase dividers -->
        <div class="raid-hp-container" style="position: relative; width: 100%; max-width: 100%; min-width: 0; box-sizing: border-box; height: 18px; background: var(--card-bg); border: 1px solid var(--gold-deep); border-radius: 4px; overflow: hidden;">
          <div class="raid-hp-fill" style="width: ${hpPercent}%; height: 100%; background: linear-gradient(90deg, var(--danger), var(--danger)); transition: width 0.2s ease; box-sizing: border-box; min-width: 0;"></div>
          <!-- 60% Phase 2 Break Shield Marker -->
          <div class="raid-phase-divider raid-marker-60" title="${esc(T('60% Phase 2 Break Shield', 'ui'))}" style="position: absolute; left: 60%; top: 0; bottom: 0; width: 2px; background: var(--gold-bright); box-shadow: 0 0 4px var(--gold-bright); z-index: 2; pointer-events: none; box-sizing: border-box; min-width: 0;"></div>
          <!-- 30% Phase 3 Apex Enrage Marker -->
          <div class="raid-phase-divider raid-marker-30" title="${esc(T('30% Phase 3 Apex Enrage', 'ui'))}" style="position: absolute; left: 30%; top: 0; bottom: 0; width: 2px; background: #e040fb; box-shadow: 0 0 4px #e040fb; z-index: 2; pointer-events: none; box-sizing: border-box; min-width: 0;"></div>
          <div class="raid-hp-text" style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 800; color: var(--text); text-shadow: 1px 1px 2px #000; pointer-events: none; box-sizing: border-box; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${currentHp.toLocaleString()} / ${maxHp.toLocaleString()} (${hpPercent}%)
          </div>
        </div>

        <!-- Break Shield Bar (Phase 2) -->
        ${breakShieldHtml}
      </div>
    `.trim();
  }

  /**
   * Renders the Overworld Victory Modal for defeated World Boss.
   * @param {object} victoryResult
   * @returns {string} HTML string
   */
  function renderVictoryModalHtml(victoryResult) {
    if (!victoryResult) {
      return '';
    }

    const tier = (victoryResult.tier || getContributionTier(victoryResult.score || 0, tiers)).toLowerCase();
    const tierColor = TIER_COLORS[tier] || '#cd7f32';
    const tierUpper = tier.toUpperCase();
    const score = victoryResult.score ?? 0;
    const metrics = victoryResult.metrics || {};
    const cache = victoryResult.cache || {};

    const trophiesText = (cache.trophies && cache.trophies.length > 0)
      ? cache.trophies.map(id => T(itemName(id), 'items')).join(', ')
      : 'None';
    const runesText = (cache.runes && cache.runes.length > 0)
      ? cache.runes.map(id => T(itemName(id), 'items')).join(', ')
      : 'None';
    const feastText = cache.feast ? T(itemName(cache.feast), 'items') : 'None';
    const gemsText = `${cache.gems || 0}× Blessed Ore`;

    return `
      <div class="raid-victory-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; box-sizing: border-box; z-index: 9999; display: flex; align-items: center; justify-content: center; background: rgba(9, 5, 2, 0.8); backdrop-filter: blur(4px);">
        <div class="raid-victory-shell ro-parchment" style="box-sizing: border-box; width: 100%; max-width: 520px; min-width: 0; max-height: 90vh; overflow-y: auto; overflow-x: hidden; border-radius: 8px; background: var(--window-bg); border: 2px solid var(--gold); box-shadow: 0 16px 40px rgba(0, 0, 0, 0.9); padding: 20px; color: var(--text);">
          <!-- Header with Title and Close Button -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 1px solid color-mix(in srgb, var(--gold) 30%, transparent); padding-bottom: 10px; box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden;">
            <h2 style="margin: 0; font-size: 20px; font-weight: 800; color: var(--gold-bright); text-shadow: 0 2px 4px rgba(0,0,0,0.8); box-sizing: border-box; min-width: 0; word-break: break-word;">
              🏆 ${esc(T('Raid Victory!', 'ui'))}
            </h2>
            <button class="btn btn--ghost raid-modal-close" data-claim-raid-spoils="1" style="box-sizing: border-box; min-width: 0; font-size: 17px; line-height: 1; padding: 4px 8px; cursor: pointer; color: var(--gold); background: transparent; border: 1px solid transparent; border-radius: 4px;">✕</button>
          </div>

          <!-- Tier Crest Badge -->
          <div class="raid-tier-crest-container" style="display: flex; flex-direction: column; align-items: center; justify-content: center; margin-bottom: 16px; padding: 12px; background: var(--card-bg); border: 1px solid color-mix(in srgb, var(--gold) 25%, transparent); border-radius: 6px; box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden;">
            <div class="raid-tier-crest" style="font-size: 24px; font-weight: 900; letter-spacing: 2px; color: ${tierColor}; text-shadow: 0 0 12px ${tierColor}; padding: 4px 20px; border: 2px solid ${tierColor}; border-radius: 20px; background: var(--card-bg); margin-bottom: 6px; box-sizing: border-box; min-width: 0; white-space: nowrap;">
              ${esc(tierUpper)}
            </div>
            <div style="font-size: 12px; color: var(--text); font-weight: 600; box-sizing: border-box; min-width: 0; word-break: break-word;">
              ${esc(T('Contribution Score', 'ui'))}: ${score}
            </div>
          </div>

          <!-- Performance Breakdown Grid -->
          <div style="margin-bottom: 16px; box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden;">
            <h3 style="margin: 0 0 8px 0; font-size: 12px; color: var(--gold); text-transform: uppercase; letter-spacing: 1px; box-sizing: border-box; min-width: 0; word-break: break-word;">
              ${esc(T('Performance Breakdown', 'ui'))}
            </h3>
            <div class="raid-metrics-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden;">
              <div style="box-sizing: border-box; min-width: 0; background: var(--card-bg); padding: 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.06);">
                <div style="font-size: 11px; color: var(--text-muted); box-sizing: border-box; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${esc(T('Damage Dealt', 'ui'))}:</div>
                <div style="font-size: 14px; font-weight: bold; color: var(--danger-text); box-sizing: border-box; min-width: 0; word-break: break-word;">${(metrics.damage || 0).toLocaleString()}</div>
              </div>
              <div style="box-sizing: border-box; min-width: 0; background: var(--card-bg); padding: 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.06);">
                <div style="font-size: 11px; color: var(--text-muted); box-sizing: border-box; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${esc(T('Break Shield Damage', 'ui'))}:</div>
                <div style="font-size: 14px; font-weight: bold; color: var(--info); box-sizing: border-box; min-width: 0; word-break: break-word;">${(metrics.breakDamage || 0).toLocaleString()}</div>
              </div>
              <div style="box-sizing: border-box; min-width: 0; background: var(--card-bg); padding: 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.06);">
                <div style="font-size: 11px; color: var(--text-muted); box-sizing: border-box; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${esc(T('Adds Slain', 'ui'))}:</div>
                <div style="font-size: 14px; font-weight: bold; color: var(--gold-bright); box-sizing: border-box; min-width: 0; word-break: break-word;">${metrics.addsKilled || 0}</div>
              </div>
              <div style="box-sizing: border-box; min-width: 0; background: var(--card-bg); padding: 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.06);">
                <div style="font-size: 11px; color: var(--text-muted); box-sizing: border-box; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${esc(T('Hazards Dodged', 'ui'))}:</div>
                <div style="font-size: 14px; font-weight: bold; color: var(--success-text); box-sizing: border-box; min-width: 0; word-break: break-word;">${metrics.hazardsDodged || 0}</div>
              </div>
            </div>
          </div>

          <!-- Spoils Showcase Grid -->
          <div style="margin-bottom: 20px; box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden;">
            <h3 style="margin: 0 0 8px 0; font-size: 12px; color: var(--gold); text-transform: uppercase; letter-spacing: 1px; box-sizing: border-box; min-width: 0; word-break: break-word;">
              ${esc(T('Spoils Showcase', 'ui'))}
            </h3>
            <div class="raid-spoils-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden;">
              <div style="box-sizing: border-box; min-width: 0; background: var(--card-bg); padding: 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.06);">
                <div style="font-size: 11px; color: var(--text-muted); box-sizing: border-box; min-width: 0;">${esc(T('Zeny', 'ui'))}:</div>
                <div style="font-size: 12px; font-weight: bold; color: var(--gold-bright); box-sizing: border-box; min-width: 0; word-break: break-word;">${cache.zeny ?? 0} Zeny</div>
              </div>
              <div style="box-sizing: border-box; min-width: 0; background: var(--card-bg); padding: 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.06);">
                <div style="font-size: 11px; color: var(--text-muted); box-sizing: border-box; min-width: 0;">${esc(T('Dimensional Shards', 'ui'))}:</div>
                <div style="font-size: 12px; font-weight: bold; color: #ce93d8; box-sizing: border-box; min-width: 0; word-break: break-word;">${cache.dimensional_shard ?? 0}× Shards</div>
              </div>
              <div style="box-sizing: border-box; min-width: 0; background: var(--card-bg); padding: 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.06);">
                <div style="font-size: 11px; color: var(--text-muted); box-sizing: border-box; min-width: 0;">${esc(T('Apex Trophies', 'ui'))}:</div>
                <div style="font-size: 12px; font-weight: bold; color: var(--warn); box-sizing: border-box; min-width: 0; word-break: break-word;">${esc(trophiesText)}</div>
              </div>
              <div style="box-sizing: border-box; min-width: 0; background: var(--card-bg); padding: 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.06);">
                <div style="font-size: 11px; color: var(--text-muted); box-sizing: border-box; min-width: 0;">${esc(T('Primal Runes', 'ui'))}:</div>
                <div style="font-size: 12px; font-weight: bold; color: var(--success-text); box-sizing: border-box; min-width: 0; word-break: break-word;">${esc(runesText)}</div>
              </div>
              <div style="box-sizing: border-box; min-width: 0; background: var(--card-bg); padding: 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.06);">
                <div style="font-size: 11px; color: var(--text-muted); box-sizing: border-box; min-width: 0;">${esc(T('Feasts', 'ui'))}:</div>
                <div style="font-size: 12px; font-weight: bold; color: var(--success-text); box-sizing: border-box; min-width: 0; word-break: break-word;">${esc(feastText)}</div>
              </div>
              <div style="box-sizing: border-box; min-width: 0; background: var(--card-bg); padding: 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.06);">
                <div style="font-size: 11px; color: var(--text-muted); box-sizing: border-box; min-width: 0;">${esc(T('Gems', 'ui'))}:</div>
                <div style="font-size: 12px; font-weight: bold; color: var(--info); box-sizing: border-box; min-width: 0; word-break: break-word;">${esc(gemsText)}</div>
              </div>
            </div>
          </div>

          <!-- Action Button: Claim Spoils -->
          <div style="display: flex; justify-content: flex-end; box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden;">
            <button class="btn btn--primary raid-claim-btn" data-claim-raid-spoils="1" style="box-sizing: border-box; min-width: 0; padding: 10px 28px; font-size: 14px; font-weight: 800; cursor: pointer; border-radius: 4px;">
              ${esc(T('Claim Spoils', 'ui'))}
            </button>
          </div>
        </div>
      </div>
    `.trim();
  }

  return {
    renderRaidHudHtml,
    renderVictoryModalHtml,
  };
}
