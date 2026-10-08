// js/render/homestead-ui.js
// Responsive Modals & HUD Components for Adventurer's Homestead & Botanical Sanctum.
// Part of Module 3: The Sovereign Realm expansion.

import {
  CROP_DEFINITIONS,
  MANNEQUIN_SLOTS,
} from '../systems/homestead.js';

function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch]));
}

function getItemQty(inventory, itemId) {
  if (!Array.isArray(inventory)) return 0;
  return inventory
    .filter(slot => slot && (slot.itemId === itemId || slot.id === itemId))
    .reduce((sum, slot) => sum + (typeof slot.qty === 'number' ? slot.qty : 1), 0);
}

function formatDuration(ms) {
  const totalSec = Math.max(0, Math.floor((ms || 0) / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min > 0) return `${min}m ${sec}s`;
  return `${sec}s`;
}

export function createHomesteadUIRenderer({
  T = (s) => s,
  CROP_DEFINITIONS: cropDefs = CROP_DEFINITIONS,
  MANNEQUIN_SLOTS: mannequinSlots = MANNEQUIN_SLOTS,
} = {}) {

  /**
   * Renders the Botanical Sanctum plot modal.
   */
  function renderPlotModalHtml(plot = {}, playerInventory = []) {
    const plotId = plot.id ?? 0;
    const stage = plot.stage ?? 0;
    const cropId = plot.cropId;
    const cropDef = cropDefs[cropId] || null;

    let contentHtml = '';

    if (stage === 0) {
      // EMPTY: Seed Selection Tray
      const seedOptions = Object.entries(cropDefs).map(([sid, def]) => {
        const qty = getItemQty(playerInventory, sid);
        const canPlant = qty > 0;
        return `
          <div class="homestead-seed-card" style="box-sizing: border-box; min-width: 0; display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; margin-bottom: 6px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 6px;">
            <div style="box-sizing: border-box; min-width: 0; flex: 1; padding-right: 8px;">
              <div style="font-weight: bold; color: #a5d6a7; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${esc(T(def.name, 'items'))}</div>
              <div style="font-size: 11px; color: #cfd8dc;">Yields: ${esc(T(def.produceId, 'items'))} · Time: ${formatDuration(def.baseDurationMs)}</div>
              <div style="font-size: 11px; color: ${canPlant ? '#81c784' : '#ef5350'};">Owned: ${qty}</div>
            </div>
            <button class="btn ${canPlant ? 'btn--primary' : 'btn--disabled'}" data-homestead-plant="${esc(sid)}" data-homestead-plot="${plotId}" ${canPlant ? '' : 'disabled'} style="box-sizing: border-box; min-width: 0; padding: 4px 10px; font-size: 11px;">
              ${T('Plant Seed', 'ui')}
            </button>
          </div>
        `;
      }).join('');

      contentHtml = `
        <div style="box-sizing: border-box; min-width: 0; width: 100%; max-width: 100%; overflow-x: hidden;">
          <p style="font-size: 12px; color: #b0bec5; margin: 0 0 10px 0;">Empty fertile furrow. Select a viable seed from your bag to sow:</p>
          <div class="homestead-seeds-list" style="box-sizing: border-box; min-width: 0; width: 100%; max-width: 100%; overflow-x: hidden;">
            ${seedOptions}
          </div>
        </div>
      `;
    } else if (stage === 1 || stage === 2) {
      // SEEDLING or VEGETATIVE: Progress & Watering
      const progress = plot.progressMs || 0;
      const duration = plot.durationMs || (cropDef?.baseDurationMs || 300000);
      const pct = Math.min(100, Math.round((progress / duration) * 100));
      const remainingMs = Math.max(0, duration - progress);
      const stageName = stage === 1 ? 'Seedling' : 'Vegetative';

      contentHtml = `
        <div style="box-sizing: border-box; min-width: 0; width: 100%; max-width: 100%; overflow-x: hidden; text-align: center;">
          <div style="font-size: 15px; font-weight: bold; color: #81c784; margin-bottom: 4px;">${esc(T(cropDef?.name || 'Crop', 'items'))}</div>
          <div style="font-size: 12px; color: #cfd8dc; margin-bottom: 12px;">Stage: <span style="color: #ffd54f;">${stageName}</span></div>
          
          <div style="box-sizing: border-box; min-width: 0; width: 100%; height: 16px; background: rgba(0, 0, 0, 0.4); border-radius: 8px; overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.15); margin-bottom: 8px;">
            <div style="box-sizing: border-box; min-width: 0; height: 100%; width: ${pct}%; background: linear-gradient(90deg, #4caf50, #81c784); border-radius: 8px; transition: width 0.3s ease;"></div>
          </div>
          <div style="font-size: 11px; color: #90a4ae; margin-bottom: 14px;">${pct}% · ${formatDuration(remainingMs)} remaining</div>

          <div style="box-sizing: border-box; min-width: 0; display: flex; justify-content: center; gap: 8px;">
            ${plot.watered ? `
              <span class="badge" style="box-sizing: border-box; min-width: 0; background: rgba(3, 169, 244, 0.2); color: #81d4fa; border: 1px solid #03a9f4; padding: 4px 10px; border-radius: 4px; font-size: 11px;">
                💧 Watered (2× Growth Speed)
              </span>
            ` : `
              <button class="btn btn--secondary" data-homestead-water="${plotId}" style="box-sizing: border-box; min-width: 0; padding: 6px 14px;">
                💧 ${T('Water Plot', 'ui')}
              </button>
            `}
          </div>
        </div>
      `;
    } else {
      // MATURE: Harvest Ready
      contentHtml = `
        <div style="box-sizing: border-box; min-width: 0; width: 100%; max-width: 100%; overflow-x: hidden; text-align: center;">
          <div style="font-size: 16px; font-weight: bold; color: #ffd54f; margin-bottom: 4px;">🌸 ${esc(T(cropDef?.name || 'Mature Flora', 'items'))}</div>
          <div style="font-size: 12px; color: #81c784; margin-bottom: 12px;">Ready for harvest!</div>
          <p style="font-size: 12px; color: #b0bec5; margin: 0 0 16px 0;">Yields prime botanicals and has a chance to return viable seeds.</p>
          <button class="btn btn--good" data-homestead-harvest="${plotId}" style="box-sizing: border-box; min-width: 0; padding: 8px 18px; font-size: 13px;">
            🌾 ${T('Harvest Crop', 'ui')}
          </button>
        </div>
      `;
    }

    return `
      <div class="homestead-modal-overlay" style="box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden; padding: 12px;">
        <div class="homestead-modal-shell" style="box-sizing: border-box; width: 100%; max-width: 440px; min-width: 0; overflow-x: hidden; margin: 0 auto; background: #1c2128; border: 1px solid #30363d; border-radius: 8px; padding: 16px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);">
          <div style="box-sizing: border-box; min-width: 0; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 8px; margin-bottom: 12px;">
            <div style="font-weight: bold; font-size: 14px; color: #e6edf3;">🌱 ${T('Plot', 'ui')} ${plotId + 1}</div>
            <button class="btn btn--ghost" data-homestead-close="1" style="box-sizing: border-box; min-width: 0; padding: 2px 8px; font-size: 12px;">✕</button>
          </div>
          ${contentHtml}
        </div>
      </div>
    `;
  }

  /**
   * Renders the Companion Pasture dialog.
   */
  function renderPastureDialogHtml(ownedPets = {}, pendingGifts = []) {
    const petsList = Object.values(ownedPets || {});
    
    let petsCards = '';
    if (petsList.length === 0) {
      petsCards = `
        <div style="box-sizing: border-box; min-width: 0; width: 100%; max-width: 100%; overflow-x: hidden; text-align: center; color: #8b949e; padding: 16px 0;">
          No companions currently owned. Tame wild creatures or hatch eggs to populate your pasture paddock!
        </div>
      `;
    } else {
      petsCards = petsList.map(pet => {
        const loyalty = pet.loyalty || 0;
        const statusBadge = loyalty >= 80 ? 'Devoted ♥' : loyalty >= 40 ? 'Loyal' : 'Bonding';
        return `
          <div class="homestead-pet-card" style="box-sizing: border-box; min-width: 0; display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; margin-bottom: 6px; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 6px;">
            <div style="box-sizing: border-box; min-width: 0; flex: 1; padding-right: 8px;">
              <div style="font-weight: bold; color: #58a6ff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${esc(pet.name || pet.id)}</div>
              <div style="font-size: 11px; color: #8b949e;">Loyalty: ${loyalty}/100 · <span style="color: #ff7b72;">${statusBadge}</span></div>
              <div style="box-sizing: border-box; min-width: 0; width: 100%; height: 6px; background: rgba(0, 0, 0, 0.4); border-radius: 3px; overflow: hidden; margin-top: 4px;">
                <div style="box-sizing: border-box; min-width: 0; height: 100%; width: ${loyalty}%; background: #ff4081; border-radius: 3px;"></div>
              </div>
            </div>
            <button class="btn btn--primary" data-homestead-pet="${esc(pet.id)}" style="box-sizing: border-box; min-width: 0; padding: 4px 10px; font-size: 11px;">
              💖 ${T('Pet Companion', 'ui')}
            </button>
          </div>
        `;
      }).join('');
    }

    let giftBoxHtml = '';
    if (Array.isArray(pendingGifts) && pendingGifts.length > 0) {
      const itemsList = pendingGifts.map(g => `${g.qty}x ${esc(T(g.itemId, 'items'))}`).join(', ');
      giftBoxHtml = `
        <div style="box-sizing: border-box; min-width: 0; width: 100%; max-width: 100%; overflow-x: hidden; background: rgba(46, 160, 67, 0.15); border: 1px solid #2ea043; border-radius: 6px; padding: 10px; margin-top: 12px; display: flex; align-items: center; justify-content: space-between;">
          <div style="box-sizing: border-box; min-width: 0; flex: 1; padding-right: 8px;">
            <div style="font-weight: bold; color: #3fb950; font-size: 12px;">🎁 Forage Gifts Available!</div>
            <div style="font-size: 11px; color: #e6edf3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${itemsList}</div>
          </div>
          <button class="btn btn--good" data-homestead-collect-gifts="1" style="box-sizing: border-box; min-width: 0; padding: 5px 12px; font-size: 11px;">
            ${T('Collect All Gifts', 'ui')}
          </button>
        </div>
      `;
    } else {
      giftBoxHtml = `
        <div style="box-sizing: border-box; min-width: 0; width: 100%; max-width: 100%; overflow-x: hidden; font-size: 11px; color: #8b949e; text-align: center; margin-top: 10px;">
          High-loyalty companions (Loyalty ≥ 40) find daily forage gifts in the pasture meadow.
        </div>
      `;
    }

    return `
      <div class="homestead-pasture-dialog" style="box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden; padding: 12px;">
        <div style="box-sizing: border-box; width: 100%; max-width: 480px; min-width: 0; overflow-x: hidden; margin: 0 auto; background: #1c2128; border: 1px solid #30363d; border-radius: 8px; padding: 16px;">
          <div style="box-sizing: border-box; min-width: 0; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 8px; margin-bottom: 12px;">
            <div style="font-weight: bold; font-size: 14px; color: #e6edf3;">🐾 ${T('Companion Pasture', 'ui')}</div>
            <button class="btn btn--ghost" data-homestead-close="1" style="box-sizing: border-box; min-width: 0; padding: 2px 8px; font-size: 12px;">✕</button>
          </div>
          <div style="box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden;">
            ${petsCards}
          </div>
          ${giftBoxHtml}
        </div>
      </div>
    `;
  }

  /**
   * Renders the Armory Mannequin loadout modal.
   */
  function renderMannequinModalHtml(mannequinId, mannequinLoadout = {}, playerEquip = {}) {
    const label = mannequinId === 'mannequin_b' ? 'Armory Mannequin B' : 'Armory Mannequin A';

    const slotRows = mannequinSlots.map(slot => {
      const storedItem = mannequinLoadout[slot] || null;
      const wornItem = playerEquip[slot] || null;

      const storedText = storedItem ? `${esc(T(storedItem.itemId, 'items'))}${storedItem.plus ? ` +${storedItem.plus}` : ''}` : `<span style="color: #6e7681;">[Empty]</span>`;
      const wornText = wornItem ? `${esc(T(wornItem.itemId, 'items'))}${wornItem.plus ? ` +${wornItem.plus}` : ''}` : `<span style="color: #6e7681;">[Empty]</span>`;

      return `
        <tr style="box-sizing: border-box; min-width: 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
          <td style="box-sizing: border-box; min-width: 0; padding: 6px 8px; font-weight: bold; color: #8b949e; text-transform: capitalize;">${slot}</td>
          <td style="box-sizing: border-box; min-width: 0; padding: 6px 8px; color: #58a6ff;">${wornText}</td>
          <td style="box-sizing: border-box; min-width: 0; padding: 6px 8px; color: #a5d6a7;">${storedText}</td>
        </tr>
      `;
    }).join('');

    return `
      <div class="homestead-mannequin-modal" style="box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden; padding: 12px;">
        <div style="box-sizing: border-box; width: 100%; max-width: 520px; min-width: 0; overflow-x: hidden; margin: 0 auto; background: #1c2128; border: 1px solid #30363d; border-radius: 8px; padding: 16px;">
          <div style="box-sizing: border-box; min-width: 0; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 8px; margin-bottom: 12px;">
            <div style="font-weight: bold; font-size: 14px; color: #e6edf3;">👗 ${label}</div>
            <button class="btn btn--ghost" data-homestead-close="1" style="box-sizing: border-box; min-width: 0; padding: 2px 8px; font-size: 12px;">✕</button>
          </div>

          <table style="box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; border-collapse: collapse; font-size: 12px; margin-bottom: 14px;">
            <thead>
              <tr style="box-sizing: border-box; min-width: 0; border-bottom: 1px solid rgba(255, 255, 255, 0.1); color: #c9d1d9;">
                <th style="box-sizing: border-box; min-width: 0; text-align: left; padding: 6px 8px;">Slot</th>
                <th style="box-sizing: border-box; min-width: 0; text-align: left; padding: 6px 8px;">Currently Worn</th>
                <th style="box-sizing: border-box; min-width: 0; text-align: left; padding: 6px 8px;">Mannequin Gear</th>
              </tr>
            </thead>
            <tbody>
              ${slotRows}
            </tbody>
          </table>

          <div style="box-sizing: border-box; min-width: 0; display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap;">
            <button class="btn btn--primary" data-homestead-swap-mannequin="${esc(mannequinId)}" style="box-sizing: border-box; min-width: 0; padding: 6px 12px; font-size: 12px;">
              🔄 ${T('Equip This Loadout', 'ui')}
            </button>
            <button class="btn btn--secondary" data-homestead-store-mannequin="${esc(mannequinId)}" style="box-sizing: border-box; min-width: 0; padding: 6px 12px; font-size: 12px;">
              📥 ${T('Save Current Loadout', 'ui')}
            </button>
            <button class="btn btn--ghost" data-homestead-retrieve-mannequin="${esc(mannequinId)}" style="box-sizing: border-box; min-width: 0; padding: 6px 12px; font-size: 12px;">
              📤 ${T('Retrieve Equipment', 'ui')}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Renders the Cozy Hearth modal.
   */
  function renderHearthModalHtml(buffActive = false, remainingMs = 0) {
    return `
      <div class="homestead-hearth-modal" style="box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden; padding: 12px;">
        <div style="box-sizing: border-box; width: 100%; max-width: 440px; min-width: 0; overflow-x: hidden; margin: 0 auto; background: #1c2128; border: 1px solid #30363d; border-radius: 8px; padding: 16px; text-align: center;">
          <div style="box-sizing: border-box; min-width: 0; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 8px; margin-bottom: 12px;">
            <div style="font-weight: bold; font-size: 14px; color: #e6edf3;">🔥 ${T('Cozy Hearth', 'ui')}</div>
            <button class="btn btn--ghost" data-homestead-close="1" style="box-sizing: border-box; min-width: 0; padding: 2px 8px; font-size: 12px;">✕</button>
          </div>
          <p style="font-size: 12px; color: #b0bec5; margin: 0 0 14px 0;">
            A crackling hearth fire radiating warm serenity. Resting here restores 100% HP & MP and bestows the Well Rested combat EXP buff (+10% EXP for 30 minutes).
          </p>
          ${buffActive ? `
            <div style="box-sizing: border-box; min-width: 0; width: 100%; max-width: 100%; overflow-x: hidden; background: rgba(255, 179, 0, 0.12); border: 1px solid #ffb300; border-radius: 6px; padding: 10px; margin-bottom: 14px; color: #ffd54f; font-size: 12px;">
              🌟 <strong>${T('Well Rested', 'ui')}</strong> Buff Active (+10% Combat EXP)<br>
              <small style="color: #ffe082;">${formatDuration(remainingMs)} remaining</small>
            </div>
          ` : ''}
          <button class="btn btn--good" data-homestead-rest-hearth="1" style="box-sizing: border-box; min-width: 0; padding: 8px 18px; font-size: 13px;">
            🔥 ${T('Rest by the Hearth', 'ui')}
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Renders a cohesive Homestead overview dashboard for chronicle or inspection.
   */
  function renderHomesteadOverviewHtml(homesteadState = {}, player = {}, ownedPets = {}) {
    const plots = homesteadState.plots || [];
    const pendingGifts = homesteadState.pendingPastureGifts || [];
    const buffActive = (homesteadState.hearthBuffExpiresAt || 0) > Date.now();
    const buffRemainingMs = Math.max(0, (homesteadState.hearthBuffExpiresAt || 0) - Date.now());

    const plotsSummary = plots.map(p => {
      const stageName = p.stage === 3 ? 'Mature 🌸' : p.stage === 2 ? 'Vegetative 🌿' : p.stage === 1 ? 'Seedling 🌱' : 'Empty 🟫';
      const cName = p.cropId ? (cropDefs[p.cropId]?.name || p.cropId) : 'None';
      return `
        <div style="box-sizing: border-box; min-width: 0; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 4px; padding: 6px 8px; font-size: 11px;">
          <div style="font-weight: bold; color: #e6edf3;">Plot ${p.id + 1}</div>
          <div style="color: #8b949e;">${stageName}</div>
          <div style="color: #a5d6a7;">${cName}</div>
          ${p.watered ? '<div style="color: #81d4fa;">💧 Watered</div>' : ''}
        </div>
      `;
    }).join('');

    return `
      <div class="homestead-overview-dashboard" style="box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden; padding: 12px;">
        <div style="box-sizing: border-box; width: 100%; max-width: 600px; min-width: 0; overflow-x: hidden; margin: 0 auto; background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 16px;">
          <h3 style="margin: 0 0 12px 0; color: #58a6ff; font-size: 16px;">🏡 Adventurer's Homestead & Botanical Sanctum</h3>
          
          <!-- Botanical Sanctum -->
          <div style="box-sizing: border-box; min-width: 0; width: 100%; max-width: 100%; overflow-x: hidden; margin-bottom: 16px;">
            <div style="font-weight: bold; color: #81c784; font-size: 13px; margin-bottom: 6px;">Botanical Sanctum (6 Plots)</div>
            <div style="box-sizing: border-box; min-width: 0; display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;">
              ${plotsSummary}
            </div>
          </div>

          <!-- Companion Pasture -->
          <div style="box-sizing: border-box; min-width: 0; width: 100%; max-width: 100%; overflow-x: hidden; margin-bottom: 16px;">
            <div style="font-weight: bold; color: #ff7b72; font-size: 13px; margin-bottom: 6px;">Companion Pasture</div>
            <div style="font-size: 12px; color: #c9d1d9;">Companions Grazing: ${Object.keys(ownedPets || {}).length}</div>
            <div style="font-size: 12px; color: #3fb950;">Pending Forage Gifts: ${pendingGifts.length} items</div>
          </div>

          <!-- Armory Mannequins & Hearth -->
          <div style="box-sizing: border-box; min-width: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <div style="box-sizing: border-box; min-width: 0; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 6px; padding: 10px;">
              <div style="font-weight: bold; color: #79c0ff; font-size: 12px; margin-bottom: 4px;">Armory Mannequins</div>
              <div style="font-size: 11px; color: #8b949e;">Mannequin A & B ready for 1-click loadout swapping.</div>
            </div>
            <div style="box-sizing: border-box; min-width: 0; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 6px; padding: 10px;">
              <div style="font-weight: bold; color: #ffa657; font-size: 12px; margin-bottom: 4px;">Cozy Hearth</div>
              <div style="font-size: 11px; color: ${buffActive ? '#ffd54f' : '#8b949e'};">
                ${buffActive ? `Well Rested (+10% EXP) · ${formatDuration(buffRemainingMs)}` : 'Rest to claim Well Rested buff.'}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  return {
    renderPlotModalHtml,
    renderPastureDialogHtml,
    renderMannequinModalHtml,
    renderHearthModalHtml,
    renderHomesteadOverviewHtml,
  };
}
