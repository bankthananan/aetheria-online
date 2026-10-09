// js/render/pets-ui.js
// Companion Chronicle Tab & Modal UI Renderer with Strict Boxing Containment.
// Renders active companion showcase, feast quick-feed tray, and full roster grid.

import { PET_CATALOG, FEAST_VALUES } from '../systems/pets.js';

export const PET_DETAILS = {
  pet_slime: {
    habitat: 'Whispering Woods',
    monsterName: 'Gel Slime',
    baitName: 'Sweet Gelatin',
    icon: '🟢',
    color: '#66bb6a',
  },
  pet_wolf: {
    habitat: 'Whispering Woods / Frostpeak Tundra',
    monsterName: 'Timber Wolf / Frost Wolf',
    baitName: 'Tender Jerky',
    icon: '🐺',
    color: '#78909c',
  },
  pet_sprite: {
    habitat: 'Sunken Ruins / Astral Rift',
    monsterName: 'Blight Sprite / Void Wisp',
    baitName: 'Luminous Nectar',
    icon: '🧚',
    color: '#ab47bc',
  },
  pet_bear: {
    habitat: 'Frostpeak Tundra',
    monsterName: 'Tundra Lurker / Frost Revenant',
    baitName: 'Glacial Salmon Nibble',
    icon: '🐻',
    color: '#cfd8dc',
  },
  pet_dragon: {
    habitat: 'Dragon Caldera',
    monsterName: 'Ember Imp / Flame Dragon',
    baitName: 'Magma Berry Cluster',
    icon: '🐉',
    color: '#e53935',
  },
};

export const FEAST_DETAILS = {
  grilled_trout: {
    name: 'Grilled Trout',
    icon: '🐟',
  },
  smoked_salmon: {
    name: 'Smoked Salmon',
    icon: '🍣',
  },
  golden_carp_sashimi: {
    name: 'Golden Carp Sashimi',
    icon: '🍱',
  },
};

/**
 * Creates the Pets UI renderer factory.
 * @param {object} options
 * @param {Function} [options.T] Localization function
 * @param {object} [options.PET_CATALOG] Pet catalog definitions
 * @param {object} [options.FEAST_VALUES] Feast meal values
 */
export function createPetsUIRenderer({
  T = (s) => s,
  PET_CATALOG: catalog = PET_CATALOG,
  FEAST_VALUES: feastValues = FEAST_VALUES,
} = {}) {

  function getInventoryQty(inventory, itemId) {
    if (!Array.isArray(inventory)) return 0;
    let total = 0;
    for (const item of inventory) {
      if (!item) continue;
      const id = item.itemId || item.id;
      if (id === itemId) {
        total += (typeof item.qty === 'number' ? item.qty : 1);
      }
    }
    return total;
  }

  function computeAura(petDef, bondLevel = 1, loyalty = 0) {
    if (!petDef || !petDef.auras || !petDef.auras.base || !petDef.auras.max) return {};
    const bond = Math.max(1, Math.min(5, bondLevel));
    const t = (bond - 1) / 4;
    const stats = {};
    for (const stat in petDef.auras.base) {
      const baseVal = petDef.auras.base[stat];
      const maxVal = petDef.auras.max[stat];
      stats[stat] = baseVal + (maxVal - baseVal) * t;
    }
    const devotionMult = loyalty >= 80 ? 1.10 : 1.0;
    for (const stat in stats) {
      stats[stat] = Number((stats[stat] * devotionMult).toFixed(4));
    }
    return stats;
  }

  function computeLootRadius(petDef, bondLevel = 1) {
    if (!petDef) return 2.0;
    const bond = Math.max(1, Math.min(5, bondLevel));
    const t = (bond - 1) / 4;
    return Number((petDef.baseLootRadius + (petDef.maxLootRadius - petDef.baseLootRadius) * t).toFixed(2));
  }

  function formatStatPill(statKey, val) {
    switch (statKey) {
      case 'hpRegen':
        return `+${Math.round(val)}/s HP regen`;
      case 'moveMult':
        return `+${Math.round(val * 100)}% Speed`;
      case 'physAtkPct':
        return `+${Math.round(val * 100)}% ATK`;
      case 'critChance':
        return `+${Math.round(val)}% Crit`;
      case 'magicAtkPct':
        return `+${Math.round(val * 100)}% M.ATK`;
      case 'mpRegen':
        return `+${Math.round(val)}/s MP regen`;
      case 'castSpeedPct':
        return `+${Math.round(val * 100)}% Cast Spd`;
      case 'physDefPct':
        return `+${Math.round(val * 100)}% DEF`;
      case 'magicDefPct':
        return `+${Math.round(val * 100)}% M.DEF`;
      case 'res_ice':
        return `+${Math.round(val)}% Ice Res`;
      case 'maxHp':
        return `+${Math.round(val)} Max HP`;
      case 'dmg_fire':
        return `+${Math.round(val)} Fire DMG`;
      case 'dmg_void':
        return `+${Math.round(val)} Void DMG`;
      case 'critDmgPct':
        return `+${Math.round(val * 100)}% Crit DMG`;
      case 'zenyMult':
        return `+${Math.round((val - 1) * 100)}% Zeny`;
      default:
        return `+${val} ${statKey}`;
    }
  }

  function renderStatPills(petDef, bondLevel = 1, loyalty = 0) {
    const stats = computeAura(petDef, bondLevel, loyalty);
    const lootRadius = computeLootRadius(petDef, bondLevel);
    const pills = [];

    // Auto-Loot Radius pill
    pills.push(`
      <span class="aura-pill" style="display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 12px; font-size: 11px; color: var(--text-muted); min-width: 0; box-sizing: border-box;">
        🐾 ${lootRadius.toFixed(1)}m Auto-Loot radius
      </span>
    `.trim());

    // Stat aura pills
    for (const [k, v] of Object.entries(stats)) {
      pills.push(`
        <span class="aura-pill" style="display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; background: color-mix(in srgb, var(--success) 15%, transparent); border: 1px solid color-mix(in srgb, var(--success) 45%, transparent); border-radius: 12px; font-size: 11px; color: var(--success-text); min-width: 0; box-sizing: border-box;">
          ✦ ${formatStatPill(k, v)}
        </span>
      `.trim());
    }

    return pills.join(' ');
  }

  /**
   * Renders the complete Companions Tab HTML.
   * @param {object} petsState
   * @param {Array} inventory
   * @returns {string} HTML string
   */
  function renderCompanionsTab(petsState = { activePetId: null, owned: {} }, inventory = []) {
    if (!petsState || typeof petsState !== 'object') {
      petsState = { activePetId: null, owned: {} };
    }
    if (!petsState.owned || typeof petsState.owned !== 'object') {
      petsState.owned = {};
    }

    // --- 1. Active Pet Banner ---
    let activeBannerHtml = '';
    const activePet = (petsState.activePetId && petsState.owned[petsState.activePetId])
      ? petsState.owned[petsState.activePetId]
      : null;

    if (activePet) {
      const activeDef = catalog[activePet.id] || { id: activePet.id, name: activePet.name || 'Companion', auras: {} };
      const petDetails = PET_DETAILS[activePet.id] || { habitat: 'Unknown Habitat', monsterName: 'Wild Creature', baitName: 'Taming Bait', icon: '🐾', color: 'var(--gold)' };
      const loyalty = activePet.loyalty || 0;
      const bondLevel = activePet.bondLevel || 1;
      const isDevoted = loyalty >= 80;

      // Filter inventory for feast items
      const availableFeasts = [];
      for (const fId of Object.keys(feastValues)) {
        const qty = getInventoryQty(inventory, fId);
        if (qty > 0) {
          availableFeasts.push({
            id: fId,
            qty,
            values: feastValues[fId],
            details: FEAST_DETAILS[fId] || { name: fId, icon: '🍲' },
          });
        }
      }

      const feastsHtml = availableFeasts.length > 0
        ? availableFeasts.map(f => `
            <div class="feast-item" style="display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 6px 10px; background: rgba(0,0,0,0.3); border-radius: 6px; width: 100%; max-width: 100%; box-sizing: border-box; overflow-x: hidden; min-width: 0;">
              <div style="display: flex; align-items: center; gap: 8px; min-width: 0; box-sizing: border-box;">
                <span style="font-size: 14px;">${f.details.icon}</span>
                <div style="min-width: 0; box-sizing: border-box;">
                  <span style="font-weight: bold; font-size: 12px; color: var(--text);">${T(f.details.name, 'items')}</span>
                  <span style="color: var(--gold-bright); font-weight: bold; font-size: 12px; margin-left: 4px;">×${f.qty}</span>
                  <div style="font-size: 10px; color: var(--success-text);">+${f.values.loyalty} Loyalty, +${f.values.exp} EXP</div>
                </div>
              </div>
              <button class="btn btn--sm pet-feed-btn" data-feed-pet-id="${activePet.id}" data-feast-id="${f.id}" style="font-size: 11px; padding: 4px 10px; background: var(--success); color: var(--text); border: 1px solid var(--success); border-radius: 4px; cursor: pointer; white-space: nowrap; min-width: 0; box-sizing: border-box;">
                ${T('Feed', 'ui')}
              </button>
            </div>
          `).join('')
        : `<div class="feast-hint" style="color: var(--text-muted); font-style: italic; font-size: 11px; padding: 8px; text-align: center; width: 100%; max-width: 100%; box-sizing: border-box; overflow-x: hidden; min-width: 0;">${T('Cook feasts via Fishing & Alchemy to feed your companion!', 'ui')}</div>`;

      activeBannerHtml = `
        <div class="active-pet-card" style="width: 100%; max-width: 100%; box-sizing: border-box; overflow-x: hidden; background: var(--card-bg); border: 2px solid ${petDetails.color || 'var(--gold)'}; border-radius: 10px; padding: 16px; display: flex; flex-direction: column; gap: 14px; box-shadow: 0 4px 16px rgba(0,0,0,0.4); min-width: 0;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; width: 100%; max-width: 100%; box-sizing: border-box; overflow-x: hidden; min-width: 0;">
            <div style="display: flex; align-items: center; gap: 12px; min-width: 0; box-sizing: border-box;">
              <div style="font-size: 32px; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.06); border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); flex-shrink: 0; min-width: 0; box-sizing: border-box;">
                ${petDetails.icon}
              </div>
              <div style="min-width: 0; box-sizing: border-box;">
                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; min-width: 0; box-sizing: border-box;">
                  <h3 style="margin: 0; font-size: 14px; color: var(--text); font-weight: bold;">${T(activeDef.name, 'ui')}</h3>
                  ${isDevoted ? `<span class="badge-devoted" style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px; background: linear-gradient(135deg, var(--gold-bright), var(--gold)); color: var(--wood-deep); min-width: 0; box-sizing: border-box;">★ Devoted</span>` : ''}
                  <span style="font-size: 10px; background: color-mix(in srgb, var(--success) 20%, transparent); border: 1px solid var(--success); color: var(--success-text); padding: 2px 6px; border-radius: 4px; font-weight: bold; min-width: 0; box-sizing: border-box;">✓ ${T('Active Companion', 'ui')}</span>
                </div>
                <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">
                  ${T('Bond Lv.', 'ui')} <b style="color: var(--gold-bright);">${bondLevel}</b> · ${T('Loyalty', 'ui')}: <b style="color: var(--success-text);">${loyalty}/100</b>
                </div>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; min-width: 0; box-sizing: border-box; flex-shrink: 0;">
              <button class="btn btn--ghost pet-dismiss-btn" data-dismiss-pet="1" style="font-size: 12px; padding: 6px 12px; border-color: color-mix(in srgb, var(--danger) 60%, transparent); color: var(--danger-text); cursor: pointer; min-width: 0; box-sizing: border-box;">
                ${T('Dismiss', 'ui')}
              </button>
            </div>
          </div>

          <div style="width: 100%; max-width: 100%; box-sizing: border-box; overflow-x: hidden; min-width: 0;">
            <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px; min-width: 0; box-sizing: border-box;">
              <span style="color: var(--text-muted);">${T('Loyalty Progress', 'ui')}</span>
              <span style="color: var(--gold-bright); font-weight: bold;">${loyalty}%</span>
            </div>
            <div class="loyalty-bar" style="background: rgba(255,255,255,0.1); border-radius: 4px; height: 8px; overflow: hidden; width: 100%; max-width: 100%; box-sizing: border-box; overflow-x: hidden; min-width: 0;">
              <div style="background: linear-gradient(90deg, var(--success), var(--success)); height: 100%; width: ${Math.min(100, Math.max(0, loyalty))}%;"></div>
            </div>
          </div>

          <div style="width: 100%; max-width: 100%; box-sizing: border-box; overflow-x: hidden; min-width: 0;">
            <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
              ${T('Active Aura Buffs', 'ui')}
            </div>
            <div class="aura-pills-container" style="display: flex; flex-wrap: wrap; gap: 6px; width: 100%; max-width: 100%; box-sizing: border-box; overflow-x: hidden; min-width: 0;">
              ${renderStatPills(activeDef, bondLevel, loyalty)}
            </div>
          </div>

          <div class="feast-tray" style="width: 100%; max-width: 100%; box-sizing: border-box; overflow-x: hidden; min-width: 0; background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 8px;">
            <div style="font-size: 11px; color: var(--gold-bright); font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">
              🍖 ${T('Feast Quick-Feed Tray', 'ui')}
            </div>
            <div style="display: flex; flex-direction: column; gap: 6px; width: 100%; max-width: 100%; box-sizing: border-box; overflow-x: hidden; min-width: 0;">
              ${feastsHtml}
            </div>
          </div>
        </div>
      `;
    } else {
      activeBannerHtml = `
        <div class="active-pet-banner empty" style="width: 100%; max-width: 100%; box-sizing: border-box; overflow-x: hidden; padding: 20px 16px; border: 1px dashed rgba(255,255,255,0.25); border-radius: 8px; text-align: center; background: rgba(0,0,0,0.2); min-width: 0; display: flex; flex-direction: column; align-items: center; gap: 6px;">
          <div style="font-size: 28px;">🐾</div>
          <h3 style="margin: 0; font-size: 14px; color: var(--text); font-weight: bold;">${T('No Active Companion Summoned', 'ui')}</h3>
          <p style="margin: 0; font-size: 12px; color: var(--text-muted); max-width: 480px;">${T('Summon an owned companion from your roster below to receive their aura buffs and auto-loot assistance.', 'ui')}</p>
        </div>
      `;
    }

    // --- 2. Companion Roster Grid ---
    const catalogList = Object.values(catalog);
    const rosterCardsHtml = catalogList.map(petDef => {
      const isOwned = Boolean(petsState.owned && petsState.owned[petDef.id]);
      const ownedPet = isOwned ? petsState.owned[petDef.id] : null;
      const isActive = petsState.activePetId === petDef.id;
      const petDetails = PET_DETAILS[petDef.id] || { habitat: 'Wild Habitat', monsterName: 'Wild Creature', baitName: 'Taming Bait', icon: '🐾', color: 'var(--gold)' };

      if (isOwned && ownedPet) {
        const bondLevel = ownedPet.bondLevel || 1;
        const loyalty = ownedPet.loyalty || 0;
        const isDevoted = loyalty >= 80;

        const actionHtml = isActive
          ? `<span class="badge-active" style="padding: 3px 8px; border-radius: 4px; font-weight: bold; font-size: 11px; background: color-mix(in srgb, var(--success) 20%, transparent); border: 1px solid var(--success); color: var(--success-text); min-width: 0; box-sizing: border-box;">✓ ${T('Summoned', 'ui')}</span>`
          : `<button class="btn btn--sm pet-summon-btn" data-summon-pet="${petDef.id}" style="font-size: 11px; padding: 4px 10px;">🐾 ${T('Summon', 'ui')}</button>`;

        return `
          <div class="companion-roster-card owned" style="background: var(--card-bg); border: 1px solid ${isActive ? 'var(--gold)' : 'var(--card-border)'}; border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 8px; width: 100%; max-width: 100%; box-sizing: border-box; overflow-x: hidden; min-width: 0;">
            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; max-width: 100%; box-sizing: border-box; overflow-x: hidden; min-width: 0;">
              <div style="display: flex; align-items: center; gap: 8px; min-width: 0; box-sizing: border-box;">
                <span style="font-size: 20px;">${petDetails.icon}</span>
                <span style="font-weight: bold; font-size: 12px; color: var(--text);">${T(petDef.name, 'ui')}</span>
              </div>
              <div style="min-width: 0; box-sizing: border-box;">
                ${actionHtml}
              </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; width: 100%; max-width: 100%; box-sizing: border-box; overflow-x: hidden; min-width: 0;">
              <span style="color: var(--gold-bright); font-weight: bold;">${T('Bond Lv.', 'ui')} ${bondLevel}</span>
              <div style="display: flex; align-items: center; gap: 6px; min-width: 0; box-sizing: border-box;">
                ${isDevoted ? `<span class="badge-devoted" style="display: inline-block; padding: 1px 5px; border-radius: 3px; font-weight: bold; font-size: 9px; background: linear-gradient(135deg, var(--gold-bright), var(--gold)); color: var(--wood-deep); min-width: 0; box-sizing: border-box;">★ Devoted</span>` : ''}
                <span style="color: var(--text-muted);">${T('Loyalty', 'ui')}: ${loyalty}/100</span>
              </div>
            </div>

            <div class="loyalty-bar" style="background: rgba(255,255,255,0.1); border-radius: 3px; height: 6px; overflow: hidden; width: 100%; max-width: 100%; box-sizing: border-box; overflow-x: hidden; min-width: 0;">
              <div style="background: var(--success); height: 100%; width: ${Math.min(100, Math.max(0, loyalty))}%;"></div>
            </div>

            <div class="aura-pills-container" style="display: flex; flex-wrap: wrap; gap: 4px; width: 100%; max-width: 100%; box-sizing: border-box; overflow-x: hidden; min-width: 0;">
              ${renderStatPills(petDef, bondLevel, loyalty)}
            </div>
          </div>
        `.trim();
      } else {
        // Untamed
        return `
          <div class="companion-roster-card untamed" style="background: var(--card-bg); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 8px; width: 100%; max-width: 100%; box-sizing: border-box; overflow-x: hidden; min-width: 0; opacity: 0.85;">
            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; max-width: 100%; box-sizing: border-box; overflow-x: hidden; min-width: 0;">
              <div style="display: flex; align-items: center; gap: 8px; min-width: 0; box-sizing: border-box;">
                <span style="font-size: 20px; filter: grayscale(50%);">${petDetails.icon}</span>
                <span style="font-weight: bold; font-size: 12px; color: var(--text-muted);">${T(petDef.name, 'ui')}</span>
              </div>
              <span class="badge-untamed" style="padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); color: var(--text-muted); min-width: 0; box-sizing: border-box;">[Untamed]</span>
            </div>

            <div style="font-size: 11px; color: var(--text-muted); font-style: italic; min-width: 0; box-sizing: border-box;">
              ${T(petDef.desc, 'ui')}
            </div>

            <div style="background: rgba(0,0,0,0.3); border-radius: 4px; padding: 8px; display: flex; flex-direction: column; gap: 4px; font-size: 11px; width: 100%; max-width: 100%; box-sizing: border-box; overflow-x: hidden; min-width: 0;">
              <div style="color: var(--info); min-width: 0; box-sizing: border-box;"><b style="color: var(--text-muted);">${T('Habitat', 'ui')}:</b> ${T(petDetails.habitat, 'ui')}</div>
              <div style="color: var(--danger-text); min-width: 0; box-sizing: border-box;"><b style="color: var(--text-muted);">${T('Target Creature', 'ui')}:</b> ${T(petDetails.monsterName, 'ui')}</div>
              <div style="color: var(--success-text); min-width: 0; box-sizing: border-box;"><b style="color: var(--text-muted);">${T('Required Bait', 'ui')}:</b> ${T(petDetails.baitName, 'ui')}</div>
            </div>
          </div>
        `.trim();
      }
    }).join('');

    return `
      <div class="companions-container" style="display: flex; flex-direction: column; gap: 16px; width: 100%; max-width: 100%; box-sizing: border-box; overflow-x: hidden; min-width: 0; color: var(--text);">
        ${activeBannerHtml}

        <div style="width: 100%; max-width: 100%; box-sizing: border-box; overflow-x: hidden; min-width: 0;">
          <h3 style="margin: 0 0 10px 0; font-size: 14px; color: var(--gold-bright); text-transform: uppercase; letter-spacing: 0.5px;">
            📜 ${T('Companion Sanctuary Roster', 'ui')}
          </h3>
          <div class="companion-roster-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px; width: 100%; max-width: 100%; box-sizing: border-box; overflow-x: hidden; min-width: 0;">
            ${rosterCardsHtml}
          </div>
        </div>
      </div>
    `.trim();
  }

  /**
   * Renders the feed modal popup HTML.
   * @param {object} petState
   * @param {Array} inventory
   * @returns {string} Modal HTML string
   */
  function renderFeedModalHtml(petState, inventory = []) {
    if (!petState) return '';
    const petDef = catalog[petState.id] || { id: petState.id, name: petState.name || 'Companion' };
    const details = PET_DETAILS[petState.id] || { habitat: 'Wild Habitat', monsterName: 'Wild Creature', baitName: 'Taming Bait', icon: '🐾', color: 'var(--gold)' };
    const loyalty = petState.loyalty || 0;
    const isDevoted = loyalty >= 80;

    // Filter inventory for feast items
    const availableFeasts = [];
    for (const fId of Object.keys(feastValues)) {
      const qty = getInventoryQty(inventory, fId);
      if (qty > 0) {
        availableFeasts.push({
          id: fId,
          qty,
          values: feastValues[fId],
          details: FEAST_DETAILS[fId] || { name: fId, icon: '🍲' },
        });
      }
    }

    const feastsListHtml = availableFeasts.length > 0
      ? availableFeasts.map(f => `
          <div class="feast-row" style="display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 10px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; width: 100%; max-width: 100%; box-sizing: border-box; overflow-x: hidden; min-width: 0;">
            <div style="display: flex; align-items: center; gap: 8px; min-width: 0; box-sizing: border-box;">
              <span style="font-size: 20px;">${f.details.icon}</span>
              <div style="min-width: 0; box-sizing: border-box;">
                <div style="font-weight: bold; font-size: 12px; color: var(--text);">${T(f.details.name, 'items')} <span style="color: var(--gold-bright);">×${f.qty}</span></div>
                <div style="font-size: 11px; color: var(--success-text);">+${f.values.loyalty} Loyalty · +${f.values.exp} EXP</div>
              </div>
            </div>
            <button class="btn btn--sm pet-feed-btn" data-feed-pet-id="${petState.id}" data-feast-id="${f.id}" style="font-size: 12px; padding: 6px 12px; background: var(--success); color: var(--text); border: 1px solid var(--success); border-radius: 4px; cursor: pointer; white-space: nowrap; min-width: 0; box-sizing: border-box;">
              ${T('Feed', 'ui')}
            </button>
          </div>
        `).join('')
      : `<div class="feast-hint" style="color: var(--text-muted); font-style: italic; font-size: 12px; padding: 12px; text-align: center; width: 100%; max-width: 100%; box-sizing: border-box; overflow-x: hidden; min-width: 0;">${T('Cook feasts via Fishing & Alchemy to feed your companion!', 'ui')}</div>`;

    return `
      <div class="pet-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="pet-feed-modal-title" style="position: fixed; inset: 0; background: rgba(0,0,0,0.75); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 16px; width: 100%; max-width: 100%; box-sizing: border-box; overflow-x: hidden; min-width: 0;">
        <div class="pet-modal-shell" style="background: var(--panel-bg); border: 2px solid var(--gold); border-radius: 12px; padding: 20px; width: 100%; max-width: 440px; box-sizing: border-box; overflow-x: hidden; min-width: 0; display: flex; flex-direction: column; gap: 16px; box-shadow: 0 12px 32px rgba(0,0,0,0.8); position: relative;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; width: 100%; max-width: 100%; box-sizing: border-box; overflow-x: hidden; min-width: 0; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 12px;">
            <div style="min-width: 0; box-sizing: border-box;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 20px;">${details.icon}</span>
                <h3 id="pet-feed-modal-title" style="margin: 0; font-size: 14px; color: var(--text);">${T(petDef.name, 'ui')}</h3>
                ${isDevoted ? `<span class="badge-devoted" style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px; background: linear-gradient(135deg, var(--gold-bright), var(--gold)); color: var(--wood-deep); min-width: 0; box-sizing: border-box;">★ Devoted</span>` : ''}
              </div>
              <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">Bond Lv. ${petState.bondLevel || 1} · Loyalty: ${loyalty}/100</div>
            </div>
            <button class="pet-modal-close" aria-label="${T('Close', 'ui')}" data-modal-close="true" style="background: transparent; border: none; color: var(--text-muted); font-size: 17px; cursor: pointer; padding: 4px; line-height: 1; min-width: 0; box-sizing: border-box;">✕</button>
          </div>

          <div style="width: 100%; max-width: 100%; box-sizing: border-box; overflow-x: hidden; min-width: 0;">
            <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px; min-width: 0; box-sizing: border-box;">
              <span style="color: var(--text-muted);">Loyalty Progress</span>
              <span style="color: var(--gold-bright); font-weight: bold;">${loyalty}%</span>
            </div>
            <div style="background: rgba(255,255,255,0.1); border-radius: 4px; height: 8px; overflow: hidden; width: 100%; max-width: 100%; box-sizing: border-box; overflow-x: hidden; min-width: 0;">
              <div style="background: linear-gradient(90deg, var(--success), var(--success)); height: 100%; width: ${Math.min(100, Math.max(0, loyalty))}%;"></div>
            </div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 8px; width: 100%; max-width: 100%; box-sizing: border-box; overflow-x: hidden; min-width: 0;">
            <h4 style="margin: 0; font-size: 12px; color: var(--gold-bright); text-transform: uppercase; letter-spacing: 0.5px;">${T('Feast Quick-Feed', 'ui')}</h4>
            <div style="display: flex; flex-direction: column; gap: 8px; width: 100%; max-width: 100%; box-sizing: border-box; overflow-x: hidden; min-width: 0; max-height: 240px; overflow-y: auto;">
              ${feastsListHtml}
            </div>
          </div>
        </div>
      </div>
    `.trim();
  }

  return {
    renderCompanionsTab,
    renderFeedModalHtml,
  };
}
