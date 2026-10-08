// js/render/stronghold-ui.js
// Guild Stronghold Management Console, Trophy Pedestals & Siege Encounter HUD
// Part of the Guild Stronghold & Hall of Trophies expansion.

import {
  FACILITY_DEFINITIONS,
  TROPHY_PEDESTAL_DEFINITIONS,
  SIEGE_WAVE_TEMPLATES,
  SIEGE_REWARDS,
} from '../systems/stronghold.js';

function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch]));
}

const ITEM_NAMES = {
  iron_ore: 'Iron Ore',
  star_iron: 'Star Iron',
  blessed_ore: 'Blessed Ore',
  wood: 'Wood',
  hardwood: 'Hardwood',
  silverleaf: 'Silverleaf',
  essence_nature: 'Essence of Nature',
  caldera_crystal: 'Caldera Crystal',
  titan_heart: 'Titan Heart',
  voidmaw_eye: 'Voidmaw Eye',
  spire_emblem: 'Spire Emblem',
  dimensional_shard: 'Dimensional Shard',
  guild_commendation: 'Guild Commendation',
  stronghold_banner: 'Stronghold Vanguard Banner',
};

function getItemQty(inventory, itemId) {
  if (!Array.isArray(inventory)) return 0;
  return inventory
    .filter(slot => slot && slot.itemId === itemId)
    .reduce((sum, slot) => sum + (typeof slot.qty === 'number' ? slot.qty : 1), 0);
}

function formatPerk(key, val) {
  switch (key) {
    case 'maxHp': return `+${val} HP`;
    case 'physDef': return `+${val} Phys DEF`;
    case 'magicDef': return `+${val} Magic DEF`;
    case 'critChance': return `+${val}% Crit`;
    case 'critDmg': return `+${val}% Crit DMG`;
    case 'dmgPct': return `+${val}% All DMG`;
    case 'moveSpdPct': return `+${val}% Move Spd`;
    case 'cooldownRecoveryPct': return `+${val}% CDR`;
    case 'lootBias': return `+${Math.round(val * 100)}% Loot Bias`;
    case 'res_fire': return `+${val}% Fire RES`;
    case 'res_nature': return `+${val}% Nature RES`;
    case 'res_void': return `+${val}% Void RES`;
    case 'res_light': return `+${val}% Light RES`;
    default: return `+${val} ${key}`;
  }
}

/**
 * Creates the Stronghold UI Renderer.
 * @param {object} options
 * @param {Function} [options.T]
 * @param {object} [options.FACILITY_DEFINITIONS]
 * @param {object} [options.TROPHY_PEDESTAL_DEFINITIONS]
 * @param {object} [options.SIEGE_REWARDS]
 */
export function createStrongholdUIRenderer({
  T = (s) => s,
  FACILITY_DEFINITIONS: facilities = FACILITY_DEFINITIONS,
  TROPHY_PEDESTAL_DEFINITIONS: pedestals = TROPHY_PEDESTAL_DEFINITIONS,
  SIEGE_REWARDS: rewards = SIEGE_REWARDS,
} = {}) {

  /**
   * Formats the Stronghold facilities and trophy pedestal management interface.
   * @param {object} strongholdState
   * @param {object} player
   * @param {number} guildPoints
   * @returns {string} HTML string
   */
  function renderStrongholdConsoleHtml(strongholdState = {}, player = {}, guildPoints = 0) {
    const fState = strongholdState?.facilities || {};
    const tState = strongholdState?.trophies || {};
    const playerZeny = player?.zeny ?? 0;
    const inv = player?.inventory || [];

    // Facilities Overview Cards
    const facilityKeys = Object.keys(facilities);
    const facilityCardsHtml = facilityKeys.map(fId => {
      const fDef = facilities[fId];
      const currentTier = Math.max(0, Math.min(3, fState[fId] ?? 0));
      const currentTierData = fDef.tiers[currentTier] || fDef.tiers[0];
      const isMax = currentTier >= 3;
      const nextTierData = isMax ? null : fDef.tiers[currentTier + 1];

      let costsAndUpgradeHtml = '';
      if (!isMax && nextTierData) {
        const hasGP = (guildPoints ?? 0) >= nextTierData.costGP;
        const hasZeny = playerZeny >= nextTierData.costZeny;
        let allMatsHave = true;

        const matsHtml = (nextTierData.costMats || []).map(mat => {
          const currentCount = getItemQty(inv, mat.itemId);
          const matHave = currentCount >= mat.qty;
          if (!matHave) allMatsHave = false;
          const matBaseName = ITEM_NAMES[mat.itemId] || mat.itemId;
          const matName = esc(T(matBaseName, 'items'));
          return `<div class="cost-item cost-item--mat" style="box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden; font-size: 11px; color: ${matHave ? '#81c784' : '#e57373'}; word-break: break-word;">${currentCount} / ${mat.qty} ${matName}</div>`;
        }).join('');

        const canUpgrade = hasGP && hasZeny && allMatsHave;

        costsAndUpgradeHtml = `
          <div class="facility-costs" style="box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden; background: rgba(0, 0, 0, 0.25); border-radius: 4px; padding: 8px; display: flex; flex-direction: column; gap: 4px;">
            <small style="box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden; color: #90a4ae; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; word-break: break-word;">${T('Upgrade Requirements', 'ui')}:</small>
            <div class="cost-item cost-item--gp" style="box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden; font-size: 11px; color: ${hasGP ? '#81c784' : '#e57373'}; word-break: break-word;">GP: ${guildPoints ?? 0} / ${nextTierData.costGP}</div>
            <div class="cost-item cost-item--zeny" style="box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden; font-size: 11px; color: ${hasZeny ? '#81c784' : '#e57373'}; word-break: break-word;">Zeny: ${playerZeny} / ${nextTierData.costZeny}</div>
            ${matsHtml}
          </div>
          <button class="btn btn--primary" data-upgrade-facility="${fId}" ${canUpgrade ? '' : 'disabled'} style="box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden; white-space: nowrap; text-overflow: ellipsis; padding: 8px 12px; font-weight: bold;">${T('Upgrade Facility', 'ui')}</button>
        `;
      } else {
        costsAndUpgradeHtml = `
          <div style="box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden; text-align: center; padding: 6px 0;">
            <span class="badge badge--gold" style="box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden; display: inline-block; padding: 4px 12px; border-radius: 4px; background: rgba(255, 215, 0, 0.2); border: 1px solid #ffd700; color: #ffd700; font-weight: bold; font-size: 12px; white-space: nowrap; text-overflow: ellipsis;">${T('Max Tier', 'ui')}</span>
          </div>
        `;
      }

      // Daily stipend button for Treasury Vault (tier >= 1)
      let stipendHtml = '';
      if (fId === 'treasury' && currentTier >= 1) {
        const stipendAmount = currentTierData?.dailyStipend || 0;
        const lastStipendClaimAt = strongholdState?.lastStipendClaimAt ?? 0;
        const canClaim = lastStipendClaimAt === 0 || (Date.now() - lastStipendClaimAt >= 86400000);
        stipendHtml = `
          <button class="btn btn--good" data-claim-stipend="1" ${canClaim ? '' : 'disabled'} style="box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden; white-space: nowrap; text-overflow: ellipsis; padding: 8px 12px; font-weight: bold; margin-top: 4px;">${T('Claim Stipend', 'ui')} (+${stipendAmount}z)</button>
        `;
      }

      return `
        <div class="facility-card facility-card--${fId}" style="box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden; background: rgba(22, 26, 35, 0.95); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 8px; padding: 14px; display: flex; flex-direction: column; gap: 10px;">
          <div style="box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden; display: flex; justify-content: space-between; align-items: center; gap: 8px;">
            <div style="box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden; display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 20px; box-sizing: border-box; min-width: 0; overflow-x: hidden;">${fDef.icon}</span>
              <b style="font-size: 14px; color: #fff; word-break: break-word; box-sizing: border-box; min-width: 0; overflow-x: hidden;">${esc(T(fDef.name, 'ui'))}</b>
            </div>
            <span class="badge badge--tier" style="box-sizing: border-box; min-width: 0; overflow-x: hidden; padding: 2px 8px; border-radius: 4px; background: rgba(240, 212, 125, 0.15); border: 1px solid #f0d47d; color: #f0d47d; font-size: 11px; font-weight: bold; white-space: nowrap; text-overflow: ellipsis;">Tier ${currentTier}/3</span>
          </div>
          <div class="facility-perk" style="box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden; font-size: 12px; color: #cfd8dc; word-break: break-word;">
            ${esc(T(currentTierData.perkDesc || '', 'ui'))}
          </div>
          ${costsAndUpgradeHtml}
          ${stipendHtml}
        </div>
      `;
    }).join('');

    // Hall of Trophies Pedestals Cards
    const pedestalKeys = Object.keys(pedestals);
    const pedestalCardsHtml = pedestalKeys.map(pId => {
      const pDef = pedestals[pId];
      const isSocketed = Boolean(tState[pId]);
      const hasItem = getItemQty(inv, pDef.targetTrophy) >= pDef.trophyQty;
      const targetTrophyBaseName = ITEM_NAMES[pDef.targetTrophy] || pDef.targetTrophy;
      const targetTrophyName = esc(T(targetTrophyBaseName, 'items'));
      const auraName = esc(T(pDef.auraName, 'ui'));
      const perksDesc = Object.entries(pDef.perks || {}).map(([k, v]) => formatPerk(k, v)).join(', ');

      const actionBtnHtml = isSocketed
        ? `<button class="btn btn--ghost" data-unmount-pedestal="${pId}" style="box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden; white-space: nowrap; text-overflow: ellipsis; padding: 8px 12px; font-weight: bold;">${T('Retrieve Trophy', 'ui')}</button>`
        : `<button class="btn btn--primary" data-mount-pedestal="${pId}" ${hasItem ? '' : 'disabled'} style="box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden; white-space: nowrap; text-overflow: ellipsis; padding: 8px 12px; font-weight: bold;">${T('Mount Trophy', 'ui')}</button>`;

      return `
        <div class="pedestal-card pedestal-card--${pId}" style="box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden; background: rgba(22, 26, 35, 0.95); border: 1px solid ${isSocketed ? pDef.color : 'rgba(255, 255, 255, 0.12)'}; border-radius: 8px; padding: 14px; display: flex; flex-direction: column; gap: 10px; box-shadow: ${isSocketed ? `0 0 12px ${pDef.color}33` : 'none'};">
          <div style="box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden; display: flex; justify-content: space-between; align-items: center; gap: 8px;">
            <div style="box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden; display: flex; align-items: center; gap: 6px;">
              <span class="badge badge--element" style="box-sizing: border-box; min-width: 0; overflow-x: hidden; padding: 2px 6px; border-radius: 4px; background: ${pDef.color}22; border: 1px solid ${pDef.color}; color: ${pDef.color}; font-size: 10px; font-weight: bold; white-space: nowrap; text-overflow: ellipsis;">${pDef.element.toUpperCase()}</span>
              <b style="font-size: 13px; color: #fff; word-break: break-word; box-sizing: border-box; min-width: 0; overflow-x: hidden;">${esc(T(pDef.name, 'ui'))}</b>
            </div>
            <span class="pedestal-status-badge" style="box-sizing: border-box; min-width: 0; overflow-x: hidden; font-size: 11px; font-weight: 800; color: ${isSocketed ? '#69f0ae' : '#757575'}; white-space: nowrap; text-overflow: ellipsis;">${isSocketed ? '[SOCKETED]' : '[EMPTY]'}</span>
          </div>
          <div style="box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden; font-size: 12px; color: #b0bec5; word-break: break-word;">
            <span style="color: #90a4ae;">${T('Trophy', 'ui')}:</span> <b>${pDef.trophyQty}× ${targetTrophyName}</b>
          </div>
          <div style="box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden; background: rgba(0, 0, 0, 0.25); border-radius: 4px; padding: 8px; display: flex; flex-direction: column; gap: 2px;">
            <div style="box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden; font-size: 12px; font-weight: bold; color: ${pDef.color}; word-break: break-word;">✦ ${auraName}</div>
            <div style="box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden; font-size: 11px; color: #cfd8dc; word-break: break-word;">${perksDesc}</div>
          </div>
          ${actionBtnHtml}
        </div>
      `;
    }).join('');

    return `
      <div class="stronghold-console-shell" style="box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden; display: flex; flex-direction: column; gap: 20px;">
        <!-- Facilities Section -->
        <div class="stronghold-section-head" style="box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden;">
          <h3 style="margin: 0 0 4px 0; font-size: 16px; color: #f0d47d; word-break: break-word; box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden;">🏛️ ${T('Stronghold Facilities', 'ui')}</h3>
          <p style="margin: 0; font-size: 12px; color: var(--text-muted, #9e9e9e); word-break: break-word; box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden;">${T('Upgrade guild facilities to unlock passive empire perks, crafting bonuses, and daily resources.', 'ui')}</p>
        </div>
        <div class="facilities-grid" style="box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden; display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px;">
          ${facilityCardsHtml}
        </div>

        <!-- Hall of Trophies Section -->
        <div class="stronghold-section-head" style="box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden; margin-top: 8px;">
          <h3 style="margin: 0 0 4px 0; font-size: 16px; color: #80d8ff; word-break: break-word; box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden;">🏆 ${T('Hall of Trophies', 'ui')}</h3>
          <p style="margin: 0; font-size: 12px; color: var(--text-muted, #9e9e9e); word-break: break-word; box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden;">${T('Mount mighty boss remnants onto consecrated pedestals to channel permanent account-wide auras.', 'ui')}</p>
        </div>
        <div class="pedestals-grid" style="box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden; display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px;">
          ${pedestalCardsHtml}
        </div>
      </div>
    `.trim();
  }

  /**
   * Renders the Active Siege Encounter HUD.
   * @param {object} siegeState
   * @param {object} crystalEntity
   * @returns {string} HTML string
   */
  function renderSiegeHudHtml(siegeState, crystalEntity) {
    if (!siegeState || !siegeState.active || !crystalEntity) {
      return '';
    }

    const wave = siegeState.wave || 1;
    const hp = Math.max(0, crystalEntity.hp || 0);
    const maxHp = Math.max(1, crystalEntity.maxHp || 15000);
    const percentage = Math.max(0, Math.min(100, Math.round((hp / maxHp) * 100)));
    const barColor = percentage >= 50 ? '#4caf50' : (percentage >= 25 ? '#ff9800' : '#f44336');
    const foesRemaining = siegeState.foesRemaining !== undefined
      ? siegeState.foesRemaining
      : Math.max(0, (siegeState.totalWaveFoes ?? 0) - (siegeState.defeatedFoes ?? 0));

    return `
      <div class="stronghold-siege-hud" style="box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden; padding: 8px 12px; background: rgba(18, 14, 26, 0.94); border: 1px solid #00e5ff; border-radius: 6px; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.7); margin-bottom: 6px;">
        <div style="box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden; display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap;">
          <!-- Wave Pill -->
          <span class="siege-wave-pill" style="box-sizing: border-box; min-width: 0; overflow-x: hidden; padding: 2px 8px; border-radius: 12px; background: rgba(255, 87, 34, 0.25); border: 1px solid #ff5722; color: #ff8a65; font-weight: 800; font-size: 11px; white-space: nowrap; text-overflow: ellipsis;">⚔ ${T('WAVE', 'ui')} ${wave} / 3</span>

          <!-- Crystal HP Bar -->
          <div class="siege-crystal-meter" style="box-sizing: border-box; min-width: 0; overflow-x: hidden; flex: 1 1 160px; max-width: 280px; display: flex; flex-direction: column; gap: 2px;">
            <div style="box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden; display: flex; justify-content: space-between; font-size: 10px; font-weight: bold; color: #e0e0e0; white-space: nowrap; text-overflow: ellipsis;">
              <span>💎 ${hp} / ${maxHp} HP (${percentage}%)</span>
            </div>
            <div style="box-sizing: border-box; width: 100%; max-width: 100%; height: 8px; background: rgba(255, 255, 255, 0.15); border-radius: 4px; overflow: hidden; min-width: 0;">
              <div style="box-sizing: border-box; width: ${percentage}%; height: 100%; background: ${barColor}; transition: width 0.3s ease; min-width: 0;"></div>
            </div>
          </div>

          <!-- Foes Remaining Pill -->
          <span class="siege-foes-pill" style="box-sizing: border-box; min-width: 0; overflow-x: hidden; padding: 2px 8px; border-radius: 12px; background: rgba(156, 39, 176, 0.25); border: 1px solid #ab47bc; color: #e1bee7; font-weight: 700; font-size: 11px; white-space: nowrap; text-overflow: ellipsis;">👾 ${foesRemaining} ${T('Foes Remaining', 'ui')}</span>
        </div>
      </div>
    `.trim();
  }

  /**
   * Renders the Siege Victory Modal Dialog.
   * @param {object} victoryResult
   * @returns {string} HTML string
   */
  function renderSiegeVictoryModalHtml(victoryResult) {
    if (!victoryResult) {
      return '';
    }

    const grade = victoryResult.grade || 'B';
    const crystalHp = victoryResult.crystalHp ?? 0;
    const guildPoints = victoryResult.guildPoints ?? 0;
    const zeny = victoryResult.zeny ?? 0;
    const commendations = victoryResult.commendations ?? 0;
    const ore = victoryResult.ore;
    const oreCount = victoryResult.oreCount ?? 0;

    const oreBaseName = ore ? (ITEM_NAMES[ore] || ore) : '';
    const oreHtml = ore ? `
      <div class="spoil-item spoil-item--ore" style="box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden; padding: 8px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 4px; font-size: 13px; font-weight: bold; color: #80cbc4; word-break: break-word;">
        +${oreCount}× ${esc(T(oreBaseName, 'items'))}
      </div>
    ` : '';

    return `
      <div class="siege-victory-overlay" style="position: fixed; inset: 0; box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden; background: rgba(0, 0, 0, 0.8); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 16px;">
        <div class="siege-victory-shell" style="box-sizing: border-box; width: 100%; max-width: 520px; min-width: 0; overflow-x: hidden; background: #161a23; border: 2px solid #ffd700; border-radius: 8px; padding: 24px; text-align: center; display: flex; flex-direction: column; gap: 16px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8);">
          <header style="box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden;">
            <h2 style="margin: 0; font-size: 24px; color: #ffd700; word-break: break-word; box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden;">🏆 ${T('Siege Victory!', 'ui')}</h2>
          </header>

          <!-- Rank Crest Badge -->
          <div style="box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden; display: flex; justify-content: center;">
            <span class="badge badge--rank" style="box-sizing: border-box; min-width: 0; overflow-x: hidden; padding: 6px 20px; border-radius: 20px; background: rgba(255, 215, 0, 0.2); border: 2px solid #ffd700; color: #ffd700; font-weight: 900; font-size: 18px; letter-spacing: 1px; white-space: nowrap; text-overflow: ellipsis;">RANK ${grade}</span>
          </div>

          <!-- Preserved Crystal HP -->
          <div style="box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden; font-size: 14px; color: #80d8ff; font-weight: bold; word-break: break-word;">
            💎 ${crystalHp} HP Preserved
          </div>

          <!-- Spoils Breakdown Grid -->
          <div class="siege-spoils-grid" style="box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden; display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 8px;">
            <div class="spoil-item spoil-item--gp" style="box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden; padding: 8px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 4px; font-size: 13px; font-weight: bold; color: #f0d47d; word-break: break-word;">
              +${guildPoints} ${T('Guild Points', 'ui')}
            </div>
            <div class="spoil-item spoil-item--zeny" style="box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden; padding: 8px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 4px; font-size: 13px; font-weight: bold; color: #ffca28; word-break: break-word;">
              +${zeny} Zeny
            </div>
            <div class="spoil-item spoil-item--commendations" style="box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden; padding: 8px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 4px; font-size: 13px; font-weight: bold; color: #64b5f6; word-break: break-word;">
              +${commendations}× ${T('Guild Commendation', 'ui')}
            </div>
            ${oreHtml}
          </div>

          <!-- Claim Button -->
          <div style="box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden; margin-top: 8px;">
            <button class="btn btn--primary siege-claim-btn" data-claim-siege-spoils="1" style="box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden; padding: 10px 24px; font-size: 14px; font-weight: bold; white-space: nowrap; text-overflow: ellipsis;">
              ${T('Claim Commendations', 'ui')}
            </button>
          </div>
        </div>
      </div>
    `.trim();
  }

  return {
    renderStrongholdConsoleHtml,
    renderSiegeHudHtml,
    renderSiegeVictoryModalHtml,
  };
}
