// js/render/hud-buffs.js
// HUD Buff, Debuff & Status Aura Bar.
// Aggregates temporary buffs, debuffs, elemental imbues, pet combat skills,
// mount state, homestead hearth/meals, and regional equipment set bonuses.
// Strict ZERO Screen Shake: DOM-only status bar.

import { getActiveSetBonuses } from '../systems/equipment-sets.js';

const IMBUE_ICONS = {
  fire: '🔥',
  ice: '❄️',
  lightning: '⚡',
  nature: '🌿',
  holy: '✨',
  void: '🌌',
  shadow: '🌑',
  earth: '🪨',
  water: '💧',
  wind: '🌪️',
};

const STATUS_META = {
  poison: { icon: '☠️', label: 'Poison', kind: 'debuff', detail: 'Taking periodic poison damage' },
  burn: { icon: '🔥', label: 'Burn', kind: 'debuff', detail: 'Taking periodic fire damage' },
  bleed: { icon: '🩸', label: 'Bleed', kind: 'debuff', detail: 'Taking periodic bleeding damage' },
  chill: { icon: '❄️', label: 'Chill', kind: 'debuff', detail: 'Movement and attack speed slowed' },
  freeze: { icon: '🧊', label: 'Freeze', kind: 'debuff', detail: 'Frozen in place' },
  stun: { icon: '💫', label: 'Stun', kind: 'debuff', detail: 'Stunned and unable to act' },
  curse: { icon: '👁️', label: 'Curse', kind: 'debuff', detail: 'Defense and stats weakened' },
  sunder: { icon: '🔨', label: 'Sunder', kind: 'debuff', detail: 'Armor defense reduced' },
  regen: { icon: '💚', label: 'Regeneration', kind: 'buff', detail: 'Restoring health over time' },
  haste: { icon: '💨', label: 'Haste', kind: 'buff', detail: 'Increased movement and attack speed' },
  aegis: { icon: '🛡️', label: 'Aegis', kind: 'buff', detail: 'Damage reduction active' },
};

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Formats milliseconds into a compact timer label ('5s', '2m', or '' when permanent/expired).
 * @param {number|null|undefined} ms
 * @returns {string}
 */
export function formatBuffDuration(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return '';
  const totalSec = Math.ceil(ms / 1000);
  if (totalSec >= 60) {
    return `${Math.ceil(totalSec / 60)}m`;
  }
  return `${totalSec}s`;
}

/**
 * Collects all active HUD buffs, debuffs, mount states, and equipment set auras.
 * @param {object} G - Game state object
 * @param {number} [nowMs=Date.now()] - Current runtime timestamp in ms
 * @returns {Array<object>}
 */
export function collectActiveHudBuffs(G, nowMs = Date.now()) {
  if (!G || !G.player) return [];
  const p = G.player;
  const list = [];

  // 1. Mount state
  if (G.mounted) {
    list.push({
      id: 'mount_active',
      kind: 'mount',
      icon: '🐎',
      label: 'Mounted',
      detail: '+40% Movement Speed (Z to dismount)',
      remainingMs: null,
      durationMs: null,
    });
  }

  // 2. Homestead Hearth Rest Buff
  const hearthUntil = G.homestead?.hearthBuffExpiresAt || 0;
  if (hearthUntil > nowMs) {
    list.push({
      id: 'hearth_rest',
      kind: 'food',
      icon: '🔥',
      label: 'Well Rested',
      detail: '+10% EXP from Cozy Hearth',
      remainingMs: hearthUntil - nowMs,
      durationMs: 1800000,
    });
  }

  // 3. Weapon Elemental Imbue
  if (p.imbue && p.imbue.until > nowMs) {
    const el = String(p.imbue.element || 'holy').toLowerCase();
    const elName = el.charAt(0).toUpperCase() + el.slice(1);
    list.push({
      id: `imbue_${el}`,
      kind: 'imbue',
      icon: IMBUE_ICONS[el] || '✨',
      label: `Imbue: ${elName}`,
      detail: `Weapon imbued with ${elName} element`,
      remainingMs: p.imbue.until - nowMs,
      durationMs: p.imbue.durationMs || 30000,
    });
  }

  // 4. Pet Combat Buffs & Barrier Shield
  if (p.petAtkBuffUntil && p.petAtkBuffUntil > nowMs) {
    list.push({
      id: 'pet_howl_of_fury',
      kind: 'pet',
      icon: '🐺',
      label: 'Howl of Fury',
      detail: '+15% ATK from Evolved Companion',
      remainingMs: p.petAtkBuffUntil - nowMs,
      durationMs: 12000,
    });
  }

  const buffShield = Array.isArray(p.buffs)
    ? (p.buffs.find(b => b && b.until > nowMs && (b.id === 'draconic_shield' || b.shield))?.shield || 0)
    : 0;
  const totalShield = (p.shield || 0) + (p.bloodShield || 0) + buffShield;
  if (totalShield > 0) {
    list.push({
      id: 'pet_shield',
      kind: 'pet',
      icon: '🛡️',
      label: 'Barrier Shield',
      detail: `Absorbs ${Math.ceil(totalShield)} incoming damage`,
      remainingMs: null,
      durationMs: null,
    });
  }

  // 5. Player Buffs (Skills & Culinary Feasts)
  const rawBuffs = Array.isArray(p.buffs)
    ? p.buffs
    : (p.buffs && typeof p.buffs === 'object' ? Object.entries(p.buffs).map(([k, v]) => ({ id: k, ...v })) : []);
  const seenBuffIds = new Set();
  for (const b of rawBuffs) {
    if (!b || !(b.until > nowMs)) continue;
    const bid = b.id || b.sourceSkillId || b.stat || 'buff';
    if (seenBuffIds.has(bid)) continue;
    seenBuffIds.add(bid);
    const isMeal = (b.durationMs || 0) >= 600000 || String(bid).includes('bread') || String(bid).includes('salmon') || String(bid).includes('banquet');
    const statLabel = b.stat ? String(b.stat).toUpperCase() : '';
    const mag = b.mult ? `${b.mult > 1 ? '+' : ''}${Math.round((b.mult - 1) * 100)}%` : (b.flat ? `+${b.flat}` : '');
    list.push({
      id: `buff_${bid}`,
      kind: isMeal ? 'food' : 'buff',
      icon: isMeal ? '🍲' : '⚡',
      label: b.name || (statLabel ? `${statLabel} Boost` : 'Combat Buff'),
      detail: `${statLabel} ${mag}`.trim() || 'Temporary attribute enhancement',
      remainingMs: b.until - nowMs,
      durationMs: b.durationMs || 15000,
    });
  }

  // 6. Player Status Effects / Debuffs
  if (p.statuses && typeof p.statuses === 'object') {
    for (const [effect, st] of Object.entries(p.statuses)) {
      if (!st || !(st.until > nowMs)) continue;
      const meta = STATUS_META[effect] || {
        icon: '☠️',
        label: effect.charAt(0).toUpperCase() + effect.slice(1),
        kind: 'debuff',
        detail: `Status effect: ${effect}`,
      };
      list.push({
        id: `status_${effect}`,
        kind: meta.kind,
        icon: meta.icon,
        label: meta.label,
        detail: meta.detail,
        remainingMs: st.until - nowMs,
        durationMs: st.durationMs || 8000,
      });
    }
  }

  // 7. Active Regional Equipment Sets
  if (p.equip && typeof p.equip === 'object') {
    const setInfo = getActiveSetBonuses(p.equip);
    if (setInfo && Array.isArray(setInfo.activeSets)) {
      for (const s of setInfo.activeSets) {
        list.push({
          id: s.id,
          kind: 'set',
          icon: '⚜️',
          label: s.name,
          detail: `${s.piecesEquipped}/${s.totalPieces} Set Bonus Active`,
          remainingMs: null,
          durationMs: null,
        });
      }
    }
  }

  return list;
}

/**
 * Renders the HTML string for the HUD Buff & Status Aura Bar.
 * @param {Array<object>} buffs
 * @param {Function} [translateFn]
 * @returns {string}
 */
export function renderHudBuffBarHtml(buffs = [], translateFn = s => s) {
  if (!Array.isArray(buffs) || buffs.length === 0) return '';
  return buffs.map(b => {
    const timer = formatBuffDuration(b.remainingMs);
    const title = `${translateFn(b.label, 'ui')} — ${translateFn(b.detail, 'ui')}${timer ? ` (${timer})` : ''}`;
    const pct = (b.remainingMs && b.durationMs && b.durationMs > 0)
      ? Math.max(0, Math.min(100, Math.round((1 - b.remainingMs / b.durationMs) * 100)))
      : 0;
    return `<div class="hud-buff-chip hud-buff-chip--${escHtml(b.kind)}" data-buff-id="${escHtml(b.id)}" title="${escHtml(title)}" role="status" aria-label="${escHtml(title)}" style="--buff-elapsed:${pct}%">` +
      `<span class="hud-buff-chip__icon" aria-hidden="true">${b.icon}</span>` +
      (timer ? `<span class="hud-buff-chip__timer">${escHtml(timer)}</span>` : '') +
      `</div>`;
  }).join('');
}
