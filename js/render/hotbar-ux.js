// js/render/hotbar-ux.js
// Action Hotbar 2.0 telemetry & visual state helpers.
// Computes radial conic cooldown sweep angles/percentages, sub-second cooldown labels,
// MP/Momentum resource checks, target range checks, and combo-primed highlights.
// Strict ZERO Screen Shake.

/**
 * Formats cooldown milliseconds into a crisp label:
 * - Under 3000ms: '0.9s', '2.5s' (tenths of a second, rounded up to 0.1s)
 * - 3000ms and above: '5s' (whole seconds, rounded up)
 * @param {number} ms
 * @returns {string}
 */
export function formatCooldownLabel(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return '';
  if (ms < 3000) {
    const tenths = Math.max(1, Math.ceil(ms / 100));
    return `${(tenths / 10).toFixed(1)}s`;
  }
  return `${Math.ceil(ms / 1000)}s`;
}

/**
 * Computes rich telemetry for a single hotbar slot.
 * @param {object|null} slot - Hotbar slot descriptor ({ type: 'skill'|'item', id, itemId })
 * @param {number} index - 0-based slot index
 * @param {object} G - Game runtime state
 * @param {object} [opts]
 * @returns {object}
 */
export function computeHotbarSlotState(slot, index, G, opts = {}) {
  const nowMs = opts.nowMs ?? Date.now();
  const skills = opts.skills || [];
  const finisherMin = opts.finisherMin ?? 3;
  const tileSize = opts.tileSize ?? 32;

  const base = {
    slotIndex: index,
    empty: !slot,
    cooldownRemainingMs: 0,
    cooldownTotalMs: 0,
    cooldownPct: 0,
    cooldownAngleDeg: 0,
    cooldownText: '',
    insufficientMp: false,
    insufficientMomentum: false,
    outOfRange: false,
    comboPrimed: false,
  };

  if (!slot || !G || !G.player) return base;
  const p = G.player;

  if (slot.type === 'skill') {
    const s = skills.find(x => x.id === slot.id);
    if (!s) return base;

    const cdUntil = p.skillCd?.[slot.id] || 0;
    const rem = Math.max(0, cdUntil - nowMs);
    const total = Math.max(1, s.cooldownMs || 1000);
    const ratio = rem > 0 ? Math.max(0, Math.min(1, rem / total)) : 0;

    base.cooldownRemainingMs = rem;
    base.cooldownTotalMs = total;
    base.cooldownPct = Math.round(ratio * 100);
    base.cooldownAngleDeg = Math.round(ratio * 360);
    base.cooldownText = formatCooldownLabel(rem);

    if (s.finisher) {
      base.insufficientMomentum = (p.momentum || 0) < finisherMin;
    } else {
      base.insufficientMp = (p.mp || 0) < (s.mpCost || 0);
    }

    // Range check against live target
    const tgt = G.target;
    const rangeTiles = s.rangeTiles || s.range || 0;
    if (tgt && tgt.alive && rangeTiles > 0 && Number.isFinite(p.x) && Number.isFinite(tgt.x)) {
      const dx = tgt.x - p.x;
      const dy = tgt.y - p.y;
      const distPx = Math.hypot(dx, dy);
      const maxRangePx = (rangeTiles + 0.75) * tileSize;
      base.outOfRange = distPx > maxRangePx;
    }

    // Combo-primed check:
    // 1) Finisher ready with sufficient momentum and off cooldown
    // 2) Detonator skill when target currently has the matching status effect active
    const learned = (p.skillLevels?.[slot.id] || 0) > 0;
    if (learned && rem <= 0 && !base.insufficientMp && !base.insufficientMomentum) {
      if (s.finisher && (p.momentum || 0) >= finisherMin) {
        base.comboPrimed = true;
      } else if (s.detonate && tgt && tgt.alive && tgt.statuses?.[s.detonate]?.until > nowMs) {
        base.comboPrimed = true;
      }
    }
  } else if (slot.type === 'item') {
    const rem = Math.max(0, (p.potionCdUntil || 0) - nowMs);
    const total = opts.potionCooldownMs || 5000;
    const ratio = rem > 0 ? Math.max(0, Math.min(1, rem / total)) : 0;
    base.cooldownRemainingMs = rem;
    base.cooldownTotalMs = total;
    base.cooldownPct = Math.round(ratio * 100);
    base.cooldownAngleDeg = Math.round(ratio * 360);
    base.cooldownText = formatCooldownLabel(rem);
  }

  return base;
}
