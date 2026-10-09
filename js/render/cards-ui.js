// js/render/cards-ui.js - Bestiary Codex & Monster Cards UI Renderer.
// Provides HTML renderers for the World Chronicle ('M') Bestiary Tab,
// card frames, socketing modals, and canvas album opening fanfare.
// Strict ZERO Screen Shake: Camera coords are never modified.

import { CARD_CATALOG, ZONE_ALBUM_MILESTONES } from '../systems/cards.js';
import { CONTENT } from '../content.js';
import { RARITY } from '../loot.js';

// ponytail: one rarity palette — cards read the same as gear
export const RARITY_COLORS = Object.fromEntries(Object.entries(RARITY).map(([k, r]) => [k, r.color]));

export const ZONE_LABELS = {
  woods: 'Whispering Woods',
  ruins: 'Sunken Ruins',
  tundra: 'Frostpeak Tundra',
  caldera: 'Dragon Caldera',
  rift: 'Astral Rift',
  incursion: 'Rift Incursions',
};

export function createCardsUIRenderer({
  T = (s) => s,
  CARD_CATALOG: catalog = CARD_CATALOG,
  ZONE_ALBUM_MILESTONES: milestones = ZONE_ALBUM_MILESTONES,
} = {}) {

  function getSlotBadge(targetSlot) {
    switch (targetSlot) {
      case 'weapon': return T('⚔ Weapon Slot', 'ui');
      case 'armor': return T('🛡 Armor Slot', 'ui');
      case 'accessory': return T('💍 Accessory Slot', 'ui');
      case 'any': return T('✦ Any Gear Slot', 'ui');
      default: return T('Gear Slot', 'ui');
    }
  }

  function renderCardFrameHtml(cardDef, { isCollected = true } = {}) {
    if (!cardDef) return '';
    const color = RARITY_COLORS[cardDef.rarity] || 'var(--text-muted)';
    const statusText = isCollected ? T('Collected', 'ui') : T('Uncollected', 'ui');
    const opacity = isCollected ? '1' : '0.65';
    const filter = isCollected ? 'none' : 'grayscale(60%)';

    let statLines = [];
    if (cardDef.statMods) {
      for (const [k, v] of Object.entries(cardDef.statMods)) {
        const sign = v > 0 ? '+' : '';
        const pct = k.includes('Pct') ? '%' : '';
        statLines.push(`${sign}${v}${pct} ${k.replace('Pct', '')}`);
      }
    }
    if (cardDef.onHit) {
      const chance = Math.round((cardDef.onHit.chance || 0) * 100);
      statLines.push(`${chance}% chance on hit: ${cardDef.onHit.effect.replace('_', ' ')} (${cardDef.onHit.dmgPct || 100}% DMG)`);
    }

    return `
      <div class="card-frame" style="border: 2px solid ${color}; border-radius: 8px; padding: 12px; background: var(--card-bg); box-shadow: 0 4px 12px rgba(0,0,0,0.5); opacity: ${opacity}; filter: ${filter}; max-width: 260px; color: var(--text);">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.15); padding-bottom: 6px; margin-bottom: 8px;">
          <span style="font-weight: bold; color: ${color}; font-size: 12px;">${T(cardDef.name, 'items')}</span>
          <span style="font-size: 10px; background: ${color}; color: var(--wood-deep); padding: 2px 6px; border-radius: 4px; font-weight: bold; text-transform: uppercase;">${cardDef.rarity}</span>
        </div>
        <div style="font-size: 11px; color: var(--success-text); margin-bottom: 6px;">
          ${getSlotBadge(cardDef.targetSlot)}
        </div>
        <div style="font-size: 11px; background: rgba(0,0,0,0.3); border-radius: 4px; padding: 8px; margin-bottom: 8px; line-height: 1.4;">
          ${statLines.length ? statLines.map(line => `<div style="color: var(--info);">• ${line}</div>`).join('') : `<div style="color: var(--text-muted);">${cardDef.collectionBonus || 'Special Affinity'}</div>`}
        </div>
        <div style="font-size: 10px; color: var(--text-muted); font-style: italic; margin-bottom: 8px; min-height: 28px;">
          "${T(cardDef.flavor, 'items')}"
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 10px; border-top: 1px solid rgba(255,255,255,0.1); pt: 4px;">
          <span style="color: ${isCollected ? 'var(--success-text)' : 'var(--danger-text)'}; font-weight: bold;">🎴 ${statusText}</span>
          <span style="color: var(--text-muted);">Zone: ${cardDef.zone}</span>
        </div>
      </div>
    `.trim();
  }

  function renderBestiaryTab(bestiaryState = { monsters: {}, cards: {} }, {
    selectedZone = 'woods',
    selectedMonsterId = null,
  } = {}) {
    const validZones = ['woods', 'ruins', 'tundra', 'caldera', 'rift', 'incursion'];
    if (!validZones.includes(selectedZone)) {
      selectedZone = 'woods';
    }

    const zoneCards = Object.values(catalog).filter(c => c.zone === selectedZone);
    const totalZoneCards = zoneCards.length;
    const collectedZoneCards = zoneCards.filter(c => !!bestiaryState?.cards?.[c.id]).length;
    const milestone = milestones[selectedZone] || { name: 'Regional Mastery' };

    // Filter monsters for selectedZone based on their card's zone
    const zoneMonsters = (CONTENT.monsters || []).filter(m => {
      const card = catalog['card_' + m.id];
      return card && card.zone === selectedZone;
    });

    const activeMonster = zoneMonsters.find(m => m.id === selectedMonsterId) || zoneMonsters[0] || null;
    const activeCard = activeMonster ? catalog['card_' + activeMonster.id] : null;
    const activeMonsterState = activeMonster ? (bestiaryState?.monsters?.[activeMonster.id] || { kills: 0, drops: {}, mastery: 0 }) : null;

    // Build zone buttons
    const zoneButtonsHtml = validZones.map(z => {
      const isActive = z === selectedZone;
      const count = Object.values(catalog).filter(c => c.zone === z && bestiaryState?.cards?.[c.id]).length;
      const total = Object.values(catalog).filter(c => c.zone === z).length;
      return `
        <button class="book-tab bestiary-zone-btn ${isActive ? 'active' : ''}" data-zone="${z}" style="margin: 0 4px 4px 0;">
          ${T(ZONE_LABELS[z] || z, 'ui')} (${count}/${total})
        </button>
      `;
    }).join('');

    // Build monster list items
    const monsterListHtml = zoneMonsters.map(m => {
      const isSelected = activeMonster && m.id === activeMonster.id;
      const mState = bestiaryState?.monsters?.[m.id] || { kills: 0, drops: {}, mastery: 0 };
      const card = catalog['card_' + m.id];
      const hasCard = !!bestiaryState?.cards?.[card?.id];
      const stars = '★'.repeat(mState.mastery || 0);

      return `
        <div class="bestiary-monster-row ${isSelected ? 'selected' : ''}" data-monster-id="${m.id}" style="display: flex; align-items: center; justify-content: space-between; padding: 6px 8px; margin-bottom: 4px; border-radius: 4px; cursor: pointer; background: ${isSelected ? 'color-mix(in srgb, var(--gold) 22%, transparent)' : 'var(--card-bg)'}; border: 1px solid ${isSelected ? 'var(--gold)' : 'transparent'};">
          <div>
            <span style="font-weight: bold; font-size: 12px; color: ${m.spriteColor || 'var(--text)'};">${T(m.name, 'monsters')}</span>
            <span style="font-size: 10px; color: var(--text-muted); margin-left: 4px;">Lv.${m.level || 1}</span>
            ${stars ? `<span style="font-size: 10px; color: var(--gold-bright); margin-left: 4px;">${stars}</span>` : ''}
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 10px; color: var(--text-muted);">${mState.kills || 0} ⚔</span>
            ${hasCard ? `<span title="${T('Card Collected', 'ui')}" style="font-size: 11px;">🎴</span>` : `<span title="${T('Card Missing', 'ui')}" style="font-size: 11px; opacity: 0.3;">🎴</span>`}
          </div>
        </div>
      `;
    }).join('');

    // Right details pane
    let detailsPaneHtml = `<div style="color: var(--text-muted); text-align: center; padding: 40px;">${T('No monster selected', 'ui')}</div>`;
    if (activeMonster) {
      const dropsListHtml = (activeMonster.drops || []).map(d => {
        const isDiscovered = !!activeMonsterState?.drops?.[d.itemId];
        const itemDef = CONTENT.items?.find(it => it.id === d.itemId);
        const itemName = itemDef ? T(itemDef.name, 'items') : d.itemId;
        const chancePct = Math.round((d.chance || 0) * 100);

        return `
          <div style="font-size: 11px; padding: 3px 0; color: ${isDiscovered ? 'var(--success-text)' : 'var(--text-muted)'};">
            ${isDiscovered ? `✔ ${itemName} (${chancePct}%)` : `? ??? (${T('Undiscovered', 'ui')})`}
          </div>
        `;
      }).join('');

      const cardFrameHtml = activeCard ? renderCardFrameHtml(activeCard, {
        isCollected: !!bestiaryState?.cards?.[activeCard.id],
      }) : '';

      detailsPaneHtml = `
        <div style="display: flex; gap: 16px; flex-wrap: wrap;">
          <div style="flex: 1; min-width: min(220px, 100%);">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
              <h3 style="margin: 0; color: ${activeMonster.spriteColor || 'var(--text)'}; font-size: 14px;">${T(activeMonster.name, 'monsters')}</h3>
              <span style="background: rgba(255,255,255,0.15); padding: 2px 6px; border-radius: 4px; font-size: 10px;">Lv.${activeMonster.level || 1}</span>
              ${activeMonster.element ? `<span style="background: color-mix(in srgb, var(--info) 20%, transparent); color: var(--info); padding: 2px 6px; border-radius: 4px; font-size: 10px;">${activeMonster.element}</span>` : ''}
            </div>
            <p style="font-size: 11px; color: var(--text-muted); font-style: italic; margin-top: 0; margin-bottom: 10px;">
              "${T(activeMonster.flavor || '', 'monsters')}"
            </p>
            <div style="background: rgba(0,0,0,0.3); border-radius: 6px; padding: 8px; margin-bottom: 12px; font-size: 11px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span style="color: var(--text-muted);">${T('Kills', 'ui')}:</span>
                <span style="font-weight: bold; color: var(--text);">${activeMonsterState?.kills || 0}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span style="color: var(--text-muted);">${T('Mastery', 'ui')}:</span>
                <span style="font-weight: bold; color: var(--gold-bright);">${activeMonsterState?.mastery || 0}★</span>
              </div>
            </div>
            <div style="margin-bottom: 12px;">
              <h4 style="margin: 0 0 6px 0; font-size: 12px; color: var(--gold-bright);">${T('Drops', 'ui')}</h4>
              <div style="background: rgba(0,0,0,0.25); border-radius: 6px; padding: 8px;">
                ${dropsListHtml || `<div style="color: var(--text-muted); font-size: 10px;">${T('No drops', 'ui')}</div>`}
              </div>
            </div>
          </div>
          <div style="flex: 0 1 240px; max-width: 100%;">
            ${cardFrameHtml}
          </div>
        </div>
      `;
    }

    return `
      <div class="bestiary-codex-container" style="display: flex; flex-direction: column; gap: 12px; color: var(--text); height: 100%;">
        <div class="bestiary-zones-bar" style="display: flex; flex-wrap: wrap;">
          ${zoneButtonsHtml}
        </div>
        <div class="bestiary-milestone-banner" style="background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 6px; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center; font-size: 12px;">
          <div>
            <span style="color: var(--gold-bright); font-weight: bold;">🏆 ${T(milestone.name, 'ui')}</span>
            <span style="color: var(--text-muted); margin-left: 8px;">(${collectedZoneCards}/${totalZoneCards} ${T('Cards', 'ui')})</span>
          </div>
          <div style="color: var(--success-text); font-size: 11px;">
            ${milestone.bonus ? Object.entries(milestone.bonus).map(([k, v]) => `+${v} ${k}`).join(', ') : ''}
          </div>
        </div>
        <div style="display: flex; gap: 16px; flex: 1; min-height: 320px;">
          <div class="bestiary-monster-list" style="flex: 0 0 220px; background: rgba(0,0,0,0.25); border-radius: 6px; padding: 8px; overflow-y: auto; max-height: 380px;">
            ${monsterListHtml || `<div style="color: var(--text-muted); text-align: center;">${T('No monsters', 'ui')}</div>`}
          </div>
          <div class="bestiary-details-pane" style="flex: 1; background: rgba(0,0,0,0.25); border-radius: 6px; padding: 12px; overflow-y: auto; max-height: 380px;">
            ${detailsPaneHtml}
          </div>
        </div>
      </div>
    `.trim();
  }

  function renderSocketModalHtml(itemInst, inventory = []) {
    if (!itemInst) return '';
    const sockets = Array.isArray(itemInst.sockets) ? itemInst.sockets : [];

    // Filter available cards in inventory matching itemInst.slot
    const compatibleCards = inventory.filter(it => {
      if (!it || it.type !== 'card') return false;
      const cardDef = catalog[it.id || it.itemId];
      if (!cardDef) return false;
      if (cardDef.targetSlot === 'any') return true;
      if (cardDef.targetSlot === 'weapon') return itemInst.slot === 'weapon';
      if (cardDef.targetSlot === 'armor') return ['body', 'head', 'hands', 'feet', 'cloak'].includes(itemInst.slot);
      if (cardDef.targetSlot === 'accessory') return itemInst.slot === 'accessory';
      return false;
    });

    const socketListHtml = sockets.map((s, idx) => {
      const cardDef = s ? catalog[s] : null;
      return `
        <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.3); padding: 8px; border-radius: 4px; margin-bottom: 6px;">
          <span style="font-size: 12px; color: ${cardDef ? RARITY_COLORS[cardDef.rarity] : 'var(--text-muted)'};">
            ${idx + 1}. ${cardDef ? T(cardDef.name, 'items') : `[${T('Empty Socket', 'ui')}]`}
          </span>
          ${cardDef ? `<button class="unsocket-btn" data-slot-index="${idx}" style="font-size: 10px; background: var(--oxblood); color: var(--text); border: none; padding: 2px 6px; border-radius: 4px; cursor: pointer;">${T('Unsocket', 'ui')}</button>` : ''}
        </div>
      `;
    }).join('');

    const cardOptionsHtml = compatibleCards.map(c => {
      const cardDef = catalog[c.id || c.itemId];
      return `
        <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.05); padding: 6px 8px; border-radius: 4px; margin-bottom: 4px;">
          <div>
            <span style="font-size: 12px; font-weight: bold; color: ${RARITY_COLORS[cardDef.rarity]};">${T(cardDef.name, 'items')}</span>
            <div style="font-size: 10px; color: var(--text-muted);">${cardDef.collectionBonus || ''}</div>
          </div>
          <button class="socket-card-btn" data-card-id="${cardDef.id}" style="font-size: 11px; background: var(--forest); color: var(--text); border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;">
            ${T('Socket', 'ui')}
          </button>
        </div>
      `;
    }).join('');

    return `
      <div class="socket-modal-content" style="background: var(--panel-bg); border: 2px solid var(--gold); border-radius: 8px; padding: 16px; color: var(--text); max-width: 400px;">
        <h3 style="margin: 0 0 12px 0; font-size: 14px; color: var(--gold-bright);">${T('Socket Card into', 'ui')} ${itemInst.name || itemInst.id}</h3>
        <div style="margin-bottom: 12px;">
          <h4 style="margin: 0 0 6px 0; font-size: 12px; color: var(--text-muted);">${T('Current Sockets', 'ui')}</h4>
          ${socketListHtml || `<div style="color: var(--text-muted); font-size: 11px;">${T('No sockets available', 'ui')}</div>`}
        </div>
        <div>
          <h4 style="margin: 0 0 6px 0; font-size: 12px; color: var(--text-muted);">${T('Compatible Cards in Bag', 'ui')}</h4>
          <div style="max-height: 180px; overflow-y: auto;">
            ${cardOptionsHtml || `<div style="color: var(--text-muted); font-size: 11px;">${T('No compatible cards in inventory', 'ui')}</div>`}
          </div>
        </div>
      </div>
    `.trim();
  }

  function drawAlbumOpeningFanfare(ctx, viewW = 832, viewH = 576, progress = 0) {
    if (!ctx) return;
    const cx = Math.round(viewW / 2);
    const cy = Math.round(viewH / 2);
    const p = Math.max(0, Math.min(1, progress));

    ctx.save();

    // Semi-translucent dark vignette
    ctx.fillStyle = `rgba(10, 8, 18, ${0.45 * (1 - p)})`;
    ctx.fillRect(0, 0, viewW, viewH);

    // Radiant expanding golden rays
    const rayCount = 12;
    const angleOffset = p * Math.PI * 0.8;
    const rayLength = 120 + p * 160;

    ctx.lineWidth = 3;
    for (let i = 0; i < rayCount; i++) {
      const angle = angleOffset + (i * 2 * Math.PI) / rayCount;
      const x2 = cx + Math.cos(angle) * rayLength;
      const y2 = cy + Math.sin(angle) * rayLength;

      ctx.strokeStyle = `rgba(255, 215, 79, ${0.8 * (1 - p * 0.7)})`;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // Glowing core sphere
    const coreRadius = 24 + p * 36;
    ctx.beginPath();
    ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 245, 157, ${0.85 * (1 - p * 0.5)})`;
    ctx.fill();

    // Glittering sparkle motes
    const sparkleCount = 16;
    for (let i = 0; i < sparkleCount; i++) {
      const sAngle = (i * 137.5 * Math.PI) / 180;
      const sDist = p * (60 + (i % 5) * 35);
      const sx = cx + Math.cos(sAngle) * sDist;
      const sy = cy + Math.sin(sAngle) * sDist;
      const sRadius = 2 + (i % 3);

      ctx.beginPath();
      ctx.arc(sx, sy, sRadius, 0, Math.PI * 2);
      ctx.fillStyle = (i % 2 === 0) ? '#ffffff' : '#ffd54f';
      ctx.fill();
    }

    ctx.restore();
  }

  return {
    renderCardFrameHtml,
    renderBestiaryTab,
    renderSocketModalHtml,
    drawAlbumOpeningFanfare,
  };
}
