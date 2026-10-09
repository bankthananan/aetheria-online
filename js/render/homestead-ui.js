// js/render/homestead-ui.js
// Responsive Modals & HUD Components for Adventurer's Homestead & Botanical Sanctum.
// Part of Module 3: The Sovereign Realm expansion.

import {
  CROP_DEFINITIONS,
  MANNEQUIN_SLOTS,
} from '../systems/homestead.js';
import { CONTENT } from '../content.js';

const ITEM_NAME = Object.fromEntries(CONTENT.items.map(i => [i.id, i.name]));
const itemName = id => ITEM_NAME[id] || id;

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
              <div style="font-weight: bold; color: var(--success-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${esc(T(def.name, 'items'))}</div>
              <div style="font-size: 11px; color: var(--text-muted);">Yields: ${esc(T(itemName(def.produceId), 'items'))} · Time: ${formatDuration(def.baseDurationMs)}</div>
              <div style="font-size: 11px; color: ${canPlant ? 'var(--success-text)' : 'var(--danger-text)'};">Owned: ${qty}</div>
            </div>
            <button class="btn ${canPlant ? 'btn--primary' : 'btn--disabled'}" data-homestead-plant="${esc(sid)}" data-homestead-plot="${plotId}" ${canPlant ? '' : 'disabled'} style="box-sizing: border-box; min-width: 0; padding: 4px 10px; font-size: 11px;">
              ${T('Plant Seed', 'ui')}
            </button>
          </div>
        `;
      }).join('');

      contentHtml = `
        <div style="box-sizing: border-box; min-width: 0; width: 100%; max-width: 100%; overflow-x: hidden;">
          <p style="font-size: 12px; color: var(--text-muted); margin: 0 0 10px 0;">Empty fertile furrow. Select a viable seed from your bag to sow:</p>
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
          <div style="font-size: 14px; font-weight: bold; color: var(--success-text); margin-bottom: 4px;">${esc(T(cropDef?.name || 'Crop', 'items'))}</div>
          <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 12px;">Stage: <span style="color: var(--gold-bright);">${stageName}</span></div>
          
          <div style="box-sizing: border-box; min-width: 0; width: 100%; height: 16px; background: rgba(0, 0, 0, 0.4); border-radius: 8px; overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.15); margin-bottom: 8px;">
            <div style="box-sizing: border-box; min-width: 0; height: 100%; width: ${pct}%; background: linear-gradient(90deg, var(--success), var(--success)); border-radius: 8px; transition: width 0.3s ease;"></div>
          </div>
          <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 14px;">${pct}% · ${formatDuration(remainingMs)} remaining</div>

          <div style="box-sizing: border-box; min-width: 0; display: flex; justify-content: center; gap: 8px;">
            ${plot.watered ? `
              <span class="badge" style="flex-shrink: 0; box-sizing: border-box; background: color-mix(in srgb, var(--info) 20%, transparent); color: var(--info); border: 1px solid var(--info); padding: 4px 10px; border-radius: 4px; font-size: 11px;">
                💧 ${T('Watered (2× Growth Speed)', 'ui')}
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
          <div style="font-size: 14px; font-weight: bold; color: var(--gold-bright); margin-bottom: 4px;">🌸 ${esc(T(cropDef?.name || 'Mature Flora', 'items'))}</div>
          <div style="font-size: 12px; color: var(--success-text); margin-bottom: 12px;">Ready for harvest!</div>
          <p style="font-size: 12px; color: var(--text-muted); margin: 0 0 16px 0;">Yields prime botanicals and has a chance to return viable seeds.</p>
          <button class="btn btn--good" data-homestead-harvest="${plotId}" style="box-sizing: border-box; min-width: 0; padding: 8px 18px; font-size: 12px;">
            🌾 ${T('Harvest Crop', 'ui')}
          </button>
        </div>
      `;
    }

    return `
      <div class="homestead-modal-overlay" style="box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden; padding: 12px;">
        <div class="homestead-modal-shell" style="box-sizing: border-box; width: 100%; max-width: 440px; min-width: 0; overflow-x: hidden; margin: 0 auto; background: var(--wood-deep); border: 2px solid var(--gold); border-radius: 8px; padding: 16px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);">
          <div style="box-sizing: border-box; min-width: 0; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 8px; margin-bottom: 12px;">
            <div style="font-weight: bold; font-size: 14px; color: var(--text);">🌱 ${T('Plot', 'ui')} ${plotId + 1}</div>
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
        <div style="box-sizing: border-box; min-width: 0; width: 100%; max-width: 100%; overflow-x: hidden; text-align: center; color: var(--text-muted); padding: 16px 0;">
          No companions currently owned. Tame wild creatures or hatch eggs to populate your pasture paddock!
        </div>
      `;
    } else {
      petsCards = petsList.map(pet => {
        const loyalty = pet.loyalty || 0;
        const statusBadge = loyalty >= 80 ? T('Devoted ♥', 'ui') : loyalty >= 40 ? T('Loyal', 'ui') : T('Bonding', 'ui');
        return `
          <div class="homestead-pet-card" style="box-sizing: border-box; min-width: 0; display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; margin-bottom: 6px; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 6px;">
            <div style="box-sizing: border-box; min-width: 0; flex: 1; padding-right: 8px;">
              <div style="font-weight: bold; color: var(--info); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${esc(pet.name || pet.id)}</div>
              <div style="font-size: 11px; color: var(--text-muted);">Loyalty: ${loyalty}/100 · <span style="color: var(--danger-text);">${statusBadge}</span></div>
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
      const itemsList = pendingGifts.map(g => `${g.qty}x ${esc(T(itemName(g.itemId), 'items'))}`).join(', ');
      giftBoxHtml = `
        <div style="box-sizing: border-box; min-width: 0; width: 100%; max-width: 100%; overflow-x: hidden; background: color-mix(in srgb, var(--success) 15%, transparent); border: 1px solid var(--success); border-radius: 6px; padding: 10px; margin-top: 12px; display: flex; align-items: center; justify-content: space-between;">
          <div style="box-sizing: border-box; min-width: 0; flex: 1; padding-right: 8px;">
            <div style="font-weight: bold; color: var(--success-text); font-size: 12px;">🎁 Forage Gifts Available!</div>
            <div style="font-size: 11px; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${itemsList}</div>
          </div>
          <button class="btn btn--good" data-homestead-collect-gifts="1" style="box-sizing: border-box; min-width: 0; padding: 5px 12px; font-size: 11px;">
            ${T('Collect All Gifts', 'ui')}
          </button>
        </div>
      `;
    } else {
      giftBoxHtml = `
        <div style="box-sizing: border-box; min-width: 0; width: 100%; max-width: 100%; overflow-x: hidden; font-size: 11px; color: var(--text-muted); text-align: center; margin-top: 10px;">
          High-loyalty companions (Loyalty ≥ 40) find daily forage gifts in the pasture meadow.
        </div>
      `;
    }

    return `
      <div class="homestead-pasture-dialog" style="box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden; padding: 12px;">
        <div style="box-sizing: border-box; width: 100%; max-width: 480px; min-width: 0; overflow-x: hidden; margin: 0 auto; background: var(--wood-deep); border: 2px solid var(--gold); border-radius: 8px; padding: 16px;">
          <div style="box-sizing: border-box; min-width: 0; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 8px; margin-bottom: 12px;">
            <div style="font-weight: bold; font-size: 14px; color: var(--text);">🐾 ${T('Companion Pasture', 'ui')}</div>
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

      const storedText = storedItem ? `${esc(T(itemName(storedItem.itemId), 'items'))}${storedItem.plus ? ` +${storedItem.plus}` : ''}` : `<span style="color: var(--text-muted);">[Empty]</span>`;
      const wornText = wornItem ? `${esc(T(itemName(wornItem.itemId), 'items'))}${wornItem.plus ? ` +${wornItem.plus}` : ''}` : `<span style="color: var(--text-muted);">[Empty]</span>`;

      return `
        <tr style="box-sizing: border-box; min-width: 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
          <td style="box-sizing: border-box; min-width: 0; padding: 6px 8px; font-weight: bold; color: var(--text-muted); text-transform: capitalize;">${slot}</td>
          <td style="box-sizing: border-box; min-width: 0; padding: 6px 8px; color: var(--info);">${wornText}</td>
          <td style="box-sizing: border-box; min-width: 0; padding: 6px 8px; color: var(--success-text);">${storedText}</td>
        </tr>
      `;
    }).join('');

    return `
      <div class="homestead-mannequin-modal" style="box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden; padding: 12px;">
        <div style="box-sizing: border-box; width: 100%; max-width: 520px; min-width: 0; overflow-x: hidden; margin: 0 auto; background: var(--wood-deep); border: 2px solid var(--gold); border-radius: 8px; padding: 16px;">
          <div style="box-sizing: border-box; min-width: 0; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 8px; margin-bottom: 12px;">
            <div style="font-weight: bold; font-size: 14px; color: var(--text);">👗 ${label}</div>
            <button class="btn btn--ghost" data-homestead-close="1" style="box-sizing: border-box; min-width: 0; padding: 2px 8px; font-size: 12px;">✕</button>
          </div>

          <table style="box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; border-collapse: collapse; font-size: 12px; margin-bottom: 14px;">
            <thead>
              <tr style="box-sizing: border-box; min-width: 0; border-bottom: 1px solid rgba(255, 255, 255, 0.1); color: var(--text);">
                <th style="box-sizing: border-box; min-width: 0; text-align: left; padding: 6px 8px;">${T('Slot', 'ui')}</th>
                <th style="box-sizing: border-box; min-width: 0; text-align: left; padding: 6px 8px;">${T('Currently Worn', 'ui')}</th>
                <th style="box-sizing: border-box; min-width: 0; text-align: left; padding: 6px 8px;">${T('Mannequin Gear', 'ui')}</th>
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
        <div style="box-sizing: border-box; width: 100%; max-width: 440px; min-width: 0; overflow-x: hidden; margin: 0 auto; background: var(--wood-deep); border: 2px solid var(--gold); border-radius: 8px; padding: 16px; text-align: center;">
          <div style="box-sizing: border-box; min-width: 0; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 8px; margin-bottom: 12px;">
            <div style="font-weight: bold; font-size: 14px; color: var(--text);">🔥 ${T('Cozy Hearth', 'ui')}</div>
            <button class="btn btn--ghost" data-homestead-close="1" style="box-sizing: border-box; min-width: 0; padding: 2px 8px; font-size: 12px;">✕</button>
          </div>
          <p style="font-size: 12px; color: var(--text-muted); margin: 0 0 14px 0;">
            A crackling hearth fire radiating warm serenity. Resting here restores 100% HP & MP and bestows the Well Rested combat EXP buff (+10% EXP for 30 minutes).
          </p>
          ${buffActive ? `
            <div style="box-sizing: border-box; min-width: 0; width: 100%; max-width: 100%; overflow-x: hidden; background: color-mix(in srgb, var(--gold) 12%, transparent); border: 1px solid var(--gold); border-radius: 6px; padding: 10px; margin-bottom: 14px; color: var(--gold-bright); font-size: 12px;">
              🌟 <strong>${T('Well Rested', 'ui')}</strong> Buff Active (+10% Combat EXP)<br>
              <small style="color: var(--gold-bright);">${formatDuration(remainingMs)} remaining</small>
            </div>
          ` : ''}
          <button class="btn btn--good" data-homestead-rest-hearth="1" style="box-sizing: border-box; min-width: 0; padding: 8px 18px; font-size: 12px;">
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
      const cName = p.cropId ? (cropDefs[p.cropId]?.name || p.cropId) : '';
      return `
        <div style="box-sizing: border-box; min-width: 0; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 4px; padding: 6px 8px; font-size: 11px;">
          <div style="font-weight: bold; color: var(--text);">Plot ${p.id + 1}</div>
          <div style="color: var(--text-muted);">${stageName}</div>
          ${cName ? `<div style="color: var(--success-text);">${esc(T(cName, 'items'))}</div>` : ''}
          ${p.watered ? `<div style="color: var(--info);">💧 ${T('Watered', 'ui')}</div>` : ''}
        </div>
      `;
    }).join('');

    return `
      <div class="homestead-overview-dashboard" style="box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden; padding: 12px;">
        <div style="box-sizing: border-box; width: 100%; max-width: 600px; min-width: 0; overflow-x: hidden; margin: 0 auto; background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 8px; padding: 16px;">
          
          <!-- Botanical Sanctum -->
          <div style="box-sizing: border-box; min-width: 0; width: 100%; max-width: 100%; overflow-x: hidden; margin-bottom: 16px;">
            <div style="font-weight: bold; color: var(--gold-bright); font-size: 12px; margin-bottom: 6px;">Botanical Sanctum (6 Plots)</div>
            <div style="box-sizing: border-box; min-width: 0; display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;">
              ${plotsSummary}
            </div>
          </div>

          <!-- Companion Pasture -->
          <div style="box-sizing: border-box; min-width: 0; width: 100%; max-width: 100%; overflow-x: hidden; margin-bottom: 16px;">
            <div style="font-weight: bold; color: var(--gold-bright); font-size: 12px; margin-bottom: 6px;">Companion Pasture</div>
            <div style="font-size: 12px; color: var(--text);">Companions Grazing: ${Object.keys(ownedPets || {}).length}</div>
            <div style="font-size: 12px; color: ${pendingGifts.length ? 'var(--success-text)' : 'var(--text-muted)'};">Pending Forage Gifts: ${pendingGifts.length} items</div>
          </div>

          <!-- Armory Mannequins & Hearth -->
          <div style="box-sizing: border-box; min-width: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <div style="box-sizing: border-box; min-width: 0; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 6px; padding: 10px;">
              <div style="font-weight: bold; color: var(--gold-bright); font-size: 12px; margin-bottom: 4px;">Armory Mannequins</div>
              <div style="font-size: 11px; color: var(--text-muted);">Mannequin A & B ready for 1-click loadout swapping.</div>
            </div>
            <div style="box-sizing: border-box; min-width: 0; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 6px; padding: 10px;">
              <div style="font-weight: bold; color: var(--gold-bright); font-size: 12px; margin-bottom: 4px;">Cozy Hearth</div>
              <div style="font-size: 11px; color: ${buffActive ? 'var(--gold-bright)' : 'var(--text-muted)'};">
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
    renderPastureModalHtml: renderPastureDialogHtml,
    renderMannequinModalHtml,
    renderHearthModalHtml,
    renderHomesteadOverviewHtml,
    renderHomesteadChronicleTabHtml: renderHomesteadOverviewHtml,
  };
}
