// js/render/raids-ui.js
// UX/UI Raid Encounter HUD & Victory Modal UI Renderer with Strict Boxing Containment.
// Renders active world boss encounter HUD (segmented HP bar, break shield, add mitigation, contribution pill, timer)
// and victory spoils modal (tier crest, performance breakdown, spoils showcase).

import { WORLD_BOSS_CATALOG, CONTRIBUTION_TIERS, RAID_STATES } from '../systems/raids.js';

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
        ? `<span class="raid-mitigation-badge" style="box-sizing: border-box; min-width: 0; padding: 1px 6px; font-size: 10px; font-weight: 700; color: #90caf9; background: rgba(25, 118, 210, 0.35); border: 1px solid #42a5f5; border-radius: 4px; white-space: nowrap; margin-left: 6px;">🛡 +${mitigationPct}%</span>`
        : '';

      breakShieldHtml = `
        <div class="raid-break-shield-container" style="box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden; margin-top: 5px;">
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; margin-bottom: 2px; box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden;">
            <div style="display: flex; align-items: center; box-sizing: border-box; min-width: 0; overflow-x: hidden;">
              <span style="color: #64b5f6; font-weight: bold; box-sizing: border-box; min-width: 0; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">
                🛡 ${raidState.breakShield.toLocaleString()} / ${maxBreakShield.toLocaleString()}
              </span>
              ${addMitigationBadge}
            </div>
            <span style="color: #90caf9; font-size: 10px; box-sizing: border-box; min-width: 0; white-space: nowrap;">
              ${breakPercent}%
            </span>
          </div>
          <div class="raid-break-bar" style="position: relative; width: 100%; max-width: 100%; min-width: 0; box-sizing: border-box; height: 10px; background: rgba(10, 20, 36, 0.9); border: 1px solid #1976d2; border-radius: 3px; overflow: hidden;">
            <div class="raid-break-fill" style="width: ${breakPercent}%; height: 100%; background: linear-gradient(90deg, #1565c0, #42a5f5); transition: width 0.2s ease; box-sizing: border-box; min-width: 0;"></div>
          </div>
        </div>
      `;
    }

    return `
      <div class="raid-encounter-hud" style="box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden; padding: 8px 12px; background: rgba(18, 14, 26, 0.94); border: 1px solid #8d6e3f; border-radius: 6px; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.7); margin-bottom: 6px;">
        <!-- Header row: Boss Name + Element Badge & Timer + Contribution -->
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 5px; box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden;">
          <div style="display: flex; align-items: center; gap: 6px; box-sizing: border-box; min-width: 0; overflow-x: hidden;">
            <span style="font-size: 13px; font-weight: 800; color: #ffd700; text-shadow: 0 1px 3px rgba(0,0,0,0.8); box-sizing: border-box; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${esc(bossName)}
            </span>
            <span class="raid-element-badge" style="font-size: 10px; font-weight: 700; color: #ffb74d; background: rgba(255, 183, 77, 0.15); border: 1px solid #ffb74d; border-radius: 3px; padding: 1px 4px; box-sizing: border-box; min-width: 0; white-space: nowrap;">
              ${esc(elementBadge)}
            </span>
          </div>
          <div style="display: flex; align-items: center; gap: 6px; box-sizing: border-box; min-width: 0; overflow-x: hidden;">
            <!-- Contribution Pill -->
            <div class="raid-contribution-pill" style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 6px; border-radius: 10px; background: rgba(26, 20, 36, 0.85); border: 1px solid ${tierColor}; box-sizing: border-box; min-width: 0; white-space: nowrap;">
              <span style="color: ${tierColor}; font-weight: 800; font-size: 10px; box-sizing: border-box; min-width: 0; white-space: nowrap;">${esc(tierBadge)}</span>
              <span style="color: #e0e0e0; font-size: 10px; font-weight: 600; box-sizing: border-box; min-width: 0; white-space: nowrap;">${score.toLocaleString()}</span>
            </div>
            <!-- Timer indicator -->
            <div class="raid-timer" style="display: inline-flex; align-items: center; gap: 3px; padding: 2px 6px; border-radius: 10px; background: rgba(26, 20, 36, 0.85); border: 1px solid #8d6e3f; color: #ffd700; font-size: 10px; font-weight: 700; box-sizing: border-box; min-width: 0; white-space: nowrap;">
              <span>⏳</span>
              <span>${esc(formattedTimer)}</span>
            </div>
          </div>
        </div>

        <!-- HP Bar with 60% and 30% phase dividers -->
        <div class="raid-hp-container" style="position: relative; width: 100%; max-width: 100%; min-width: 0; box-sizing: border-box; height: 18px; background: rgba(15, 10, 20, 0.9); border: 1px solid #8d6e3f; border-radius: 4px; overflow: hidden;">
          <div class="raid-hp-fill" style="width: ${hpPercent}%; height: 100%; background: linear-gradient(90deg, #b71c1c, #e53935); transition: width 0.2s ease; box-sizing: border-box; min-width: 0;"></div>
          <!-- 60% Phase 2 Break Shield Marker -->
          <div class="raid-phase-divider raid-marker-60" title="${esc(T('60% Phase 2 Break Shield', 'ui'))}" style="position: absolute; left: 60%; top: 0; bottom: 0; width: 2px; background: #ffd700; box-shadow: 0 0 4px #ffd700; z-index: 2; pointer-events: none; box-sizing: border-box; min-width: 0;"></div>
          <!-- 30% Phase 3 Apex Enrage Marker -->
          <div class="raid-phase-divider raid-marker-30" title="${esc(T('30% Phase 3 Apex Enrage', 'ui'))}" style="position: absolute; left: 30%; top: 0; bottom: 0; width: 2px; background: #e040fb; box-shadow: 0 0 4px #e040fb; z-index: 2; pointer-events: none; box-sizing: border-box; min-width: 0;"></div>
          <div class="raid-hp-text" style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 800; color: #fff8dc; text-shadow: 1px 1px 2px #000; pointer-events: none; box-sizing: border-box; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
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
      ? cache.trophies.join(', ')
      : 'None';
    const runesText = (cache.runes && cache.runes.length > 0)
      ? cache.runes.join(', ')
      : 'None';
    const feastText = cache.feast || 'None';
    const gemsText = `${cache.gems || 0}× Blessed Ore`;

    return `
      <div class="raid-victory-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; box-sizing: border-box; z-index: 9999; display: flex; align-items: center; justify-content: center; background: rgba(10, 8, 16, 0.85); backdrop-filter: blur(4px);">
        <div class="raid-victory-shell" style="box-sizing: border-box; width: 100%; max-width: 520px; min-width: 0; max-height: 90vh; overflow-y: auto; overflow-x: hidden; border-radius: 8px; background: linear-gradient(180deg, #1d1629 0%, #0f0b17 100%); border: 2px solid #b69455; box-shadow: 0 16px 40px rgba(0, 0, 0, 0.9); padding: 20px; color: #fff8dc;">
          <!-- Header with Title and Close Button -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 1px solid rgba(182, 148, 85, 0.3); padding-bottom: 10px; box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden;">
            <h2 style="margin: 0; font-size: 20px; font-weight: 800; color: #ffd700; text-shadow: 0 2px 4px rgba(0,0,0,0.8); box-sizing: border-box; min-width: 0; word-break: break-word;">
              🏆 ${esc(T('Raid Victory!', 'ui'))}
            </h2>
            <button class="btn btn--ghost raid-modal-close" data-claim-raid-spoils="1" style="box-sizing: border-box; min-width: 0; font-size: 18px; line-height: 1; padding: 4px 8px; cursor: pointer; color: #b69455; background: transparent; border: 1px solid transparent; border-radius: 4px;">✕</button>
          </div>

          <!-- Tier Crest Badge -->
          <div class="raid-tier-crest-container" style="display: flex; flex-direction: column; align-items: center; justify-content: center; margin-bottom: 16px; padding: 12px; background: rgba(0,0,0,0.35); border: 1px solid rgba(182, 148, 85, 0.25); border-radius: 6px; box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden;">
            <div class="raid-tier-crest" style="font-size: 24px; font-weight: 900; letter-spacing: 2px; color: ${tierColor}; text-shadow: 0 0 12px ${tierColor}; padding: 4px 20px; border: 2px solid ${tierColor}; border-radius: 20px; background: rgba(10, 8, 16, 0.7); margin-bottom: 6px; box-sizing: border-box; min-width: 0; white-space: nowrap;">
              ${esc(tierUpper)}
            </div>
            <div style="font-size: 13px; color: #e0e0e0; font-weight: 600; box-sizing: border-box; min-width: 0; word-break: break-word;">
              ${esc(T('Contribution Score', 'ui'))}: ${score}
            </div>
          </div>

          <!-- Performance Breakdown Grid -->
          <div style="margin-bottom: 16px; box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden;">
            <h3 style="margin: 0 0 8px 0; font-size: 13px; color: #b69455; text-transform: uppercase; letter-spacing: 1px; box-sizing: border-box; min-width: 0; word-break: break-word;">
              ${esc(T('Performance Breakdown', 'ui'))}
            </h3>
            <div class="raid-metrics-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden;">
              <div style="box-sizing: border-box; min-width: 0; background: rgba(0,0,0,0.3); padding: 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.06);">
                <div style="font-size: 11px; color: #a0a0a0; box-sizing: border-box; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${esc(T('Damage Dealt', 'ui'))}:</div>
                <div style="font-size: 14px; font-weight: bold; color: #ff8a80; box-sizing: border-box; min-width: 0; word-break: break-word;">${(metrics.damage || 0).toLocaleString()}</div>
              </div>
              <div style="box-sizing: border-box; min-width: 0; background: rgba(0,0,0,0.3); padding: 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.06);">
                <div style="font-size: 11px; color: #a0a0a0; box-sizing: border-box; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${esc(T('Break Shield Damage', 'ui'))}:</div>
                <div style="font-size: 14px; font-weight: bold; color: #80d8ff; box-sizing: border-box; min-width: 0; word-break: break-word;">${(metrics.breakDamage || 0).toLocaleString()}</div>
              </div>
              <div style="box-sizing: border-box; min-width: 0; background: rgba(0,0,0,0.3); padding: 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.06);">
                <div style="font-size: 11px; color: #a0a0a0; box-sizing: border-box; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${esc(T('Adds Slain', 'ui'))}:</div>
                <div style="font-size: 14px; font-weight: bold; color: #ffd180; box-sizing: border-box; min-width: 0; word-break: break-word;">${metrics.addsKilled || 0}</div>
              </div>
              <div style="box-sizing: border-box; min-width: 0; background: rgba(0,0,0,0.3); padding: 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.06);">
                <div style="font-size: 11px; color: #a0a0a0; box-sizing: border-box; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${esc(T('Hazards Dodged', 'ui'))}:</div>
                <div style="font-size: 14px; font-weight: bold; color: #b9f6ca; box-sizing: border-box; min-width: 0; word-break: break-word;">${metrics.hazardsDodged || 0}</div>
              </div>
            </div>
          </div>

          <!-- Spoils Showcase Grid -->
          <div style="margin-bottom: 20px; box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden;">
            <h3 style="margin: 0 0 8px 0; font-size: 13px; color: #b69455; text-transform: uppercase; letter-spacing: 1px; box-sizing: border-box; min-width: 0; word-break: break-word;">
              ${esc(T('Spoils Showcase', 'ui'))}
            </h3>
            <div class="raid-spoils-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden;">
              <div style="box-sizing: border-box; min-width: 0; background: rgba(0,0,0,0.3); padding: 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.06);">
                <div style="font-size: 11px; color: #a0a0a0; box-sizing: border-box; min-width: 0;">${esc(T('Zeny', 'ui'))}:</div>
                <div style="font-size: 13px; font-weight: bold; color: #ffd54f; box-sizing: border-box; min-width: 0; word-break: break-word;">${cache.zeny ?? 0} Zeny</div>
              </div>
              <div style="box-sizing: border-box; min-width: 0; background: rgba(0,0,0,0.3); padding: 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.06);">
                <div style="font-size: 11px; color: #a0a0a0; box-sizing: border-box; min-width: 0;">${esc(T('Dimensional Shards', 'ui'))}:</div>
                <div style="font-size: 13px; font-weight: bold; color: #ce93d8; box-sizing: border-box; min-width: 0; word-break: break-word;">${cache.dimensional_shard ?? 0}× Shards</div>
              </div>
              <div style="box-sizing: border-box; min-width: 0; background: rgba(0,0,0,0.3); padding: 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.06);">
                <div style="font-size: 11px; color: #a0a0a0; box-sizing: border-box; min-width: 0;">${esc(T('Apex Trophies', 'ui'))}:</div>
                <div style="font-size: 13px; font-weight: bold; color: #ffb74d; box-sizing: border-box; min-width: 0; word-break: break-word;">${esc(trophiesText)}</div>
              </div>
              <div style="box-sizing: border-box; min-width: 0; background: rgba(0,0,0,0.3); padding: 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.06);">
                <div style="font-size: 11px; color: #a0a0a0; box-sizing: border-box; min-width: 0;">${esc(T('Primal Runes', 'ui'))}:</div>
                <div style="font-size: 13px; font-weight: bold; color: #80cbc4; box-sizing: border-box; min-width: 0; word-break: break-word;">${esc(runesText)}</div>
              </div>
              <div style="box-sizing: border-box; min-width: 0; background: rgba(0,0,0,0.3); padding: 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.06);">
                <div style="font-size: 11px; color: #a0a0a0; box-sizing: border-box; min-width: 0;">${esc(T('Feasts', 'ui'))}:</div>
                <div style="font-size: 13px; font-weight: bold; color: #aed581; box-sizing: border-box; min-width: 0; word-break: break-word;">${esc(feastText)}</div>
              </div>
              <div style="box-sizing: border-box; min-width: 0; background: rgba(0,0,0,0.3); padding: 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.06);">
                <div style="font-size: 11px; color: #a0a0a0; box-sizing: border-box; min-width: 0;">${esc(T('Gems', 'ui'))}:</div>
                <div style="font-size: 13px; font-weight: bold; color: #90caf9; box-sizing: border-box; min-width: 0; word-break: break-word;">${esc(gemsText)}</div>
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
