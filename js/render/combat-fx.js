// js/render/combat-fx.js - Screen shake, geometric boss telegraphs, and arcade floaties.

const FLOAT_CAP = 80;
const FLOAT_LIFE_MS = 850;
const FLOAT_RISE_PX = 24;
const FLOAT_FONT_STACK = 'ui-monospace,"SFMono-Regular",Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace';

export function createCombatFx({
  getCtx,
  prefersReducedMotion = () => false,
  now = () => performance.now(),
  getFloaties: customGetFloaties,
  setFloaties: customSetFloaties,
  floatColor: customFloatColor,
  enableScreenShake = false,
}) {
  let trauma = 0;
  let telegraphs = [];
  let internalFloaties = [];

  const getFloatList = customGetFloaties || (() => internalFloaties);
  const setFloatList = customSetFloaties || ((newList) => { internalFloaties = newList; });

  const maxOffsetX = 12;
  const maxOffsetY = 12;
  const maxAngle = 0.03;

  function addScreenShake(amount) {
    if (!enableScreenShake || prefersReducedMotion()) return;
    trauma = Math.min(1.0, trauma + amount);
  }

  function getScreenShakeOffset() {
    if (!enableScreenShake || prefersReducedMotion() || trauma <= 0) return { x: 0, y: 0, angle: 0 };
    const shake = trauma * trauma;
    const t = now();
    return {
      x: Math.round(maxOffsetX * shake * Math.sin(t * 0.045)),
      y: Math.round(maxOffsetY * shake * Math.cos(t * 0.052)),
      angle: maxAngle * shake * Math.sin(t * 0.038),
    };
  }

  function addTelegraph(tg) {
    const t = now();
    telegraphs.push({
      ...tg,
      born: t,
      expiresAt: t + (tg.durationMs || 1000),
    });
  }

  function getTelegraphs() {
    return telegraphs;
  }

  function clearTelegraphs(ownerId) {
    if (ownerId) {
      telegraphs = telegraphs.filter(t => t.ownerId !== ownerId);
    } else {
      telegraphs = [];
    }
  }

  function update(dt) {
    // Decay trauma linearly by 1.8 per second
    if (trauma > 0) {
      trauma = Math.max(0, trauma - dt * 1.8);
    }

    const t = now();
    telegraphs = telegraphs.filter(tg => t < tg.expiresAt);
    setFloatList(getFloatList().filter(f => (t - f.born) < FLOAT_LIFE_MS));
  }

  function drawTelegraphs(camX, camY) {
    const ctx = getCtx();
    if (!ctx || !telegraphs.length) return;
    const t = now();

    for (const tg of telegraphs) {
      const progress = Math.min(1, Math.max(0, (t - tg.born) / (tg.durationMs || 1000)));
      const alphaPulse = 0.35 + 0.25 * Math.sin(t * 0.015);
      const color = tg.color || '#ff4433';

      ctx.save();
      if (tg.kind === 'circle') {
        const x = tg.x - camX, y = tg.y - camY;
        const r = tg.radius || 48;
        // Inner fill
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.18;
        ctx.fill();
        // Expanding charge indicator
        ctx.beginPath();
        ctx.arc(x, y, r * progress, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.35;
        ctx.fill();
        // Warning outline
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = color;
        ctx.globalAlpha = alphaPulse;
        ctx.stroke();
      } else if (tg.kind === 'line') {
        const x1 = tg.x - camX, y1 = tg.y - camY;
        const angle = tg.angle || 0;
        const length = tg.length || 192;
        const width = tg.width || 48;

        ctx.translate(x1, y1);
        ctx.rotate(angle);
        // Box fill
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.20;
        ctx.fillRect(0, -width / 2, length, width);
        // Charge fill
        ctx.globalAlpha = 0.38;
        ctx.fillRect(0, -width / 2, length * progress, width);
        // Border outline
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = alphaPulse;
        ctx.strokeRect(0, -width / 2, length, width);
      } else if (tg.kind === 'cone') {
        const x = tg.x - camX, y = tg.y - camY;
        const angle = tg.angle || 0;
        const radius = tg.radius || 160;
        const fov = tg.fov || (Math.PI / 3);

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.arc(x, y, radius, angle - fov / 2, angle + fov / 2);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.20;
        ctx.fill();

        ctx.lineWidth = 2;
        ctx.strokeStyle = color;
        ctx.globalAlpha = alphaPulse;
        ctx.stroke();
      } else if (tg.kind === 'vortex') {
        const x = tg.x - camX, y = tg.y - camY;
        const r = tg.radius || 100;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = '#7a4fd0';
        ctx.globalAlpha = 0.15;
        ctx.fill();

        // Inward swirling spirals
        ctx.strokeStyle = '#c99aef';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.6;
        for (let a = 0; a < 3; a++) {
          const spin = t * 0.008 + (a * (Math.PI * 2 / 3));
          ctx.beginPath();
          ctx.arc(x, y, r * (1 - progress * 0.4), spin, spin + 1.2);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
  }

  function addFloatText(worldX, worldY, text, kind = 'dmg', tag = '') {
    const list = getFloatList();
    list.push({
      x: worldX,
      y: worldY,
      text: text,
      kind,
      tag,
      born: now(),
    });
    if (list.length > FLOAT_CAP) list.shift();
  }

  function getFloaties() {
    return getFloatList();
  }

  function floatColor(kind) {
    if (kind === 'enemy') return '#ff6b6b';
    if (kind === 'crit') return '#ffcc00';
    if (kind === 'dmg') return '#ffffff';
    if (kind === 'heal') return '#72db85';
    if (kind === 'weakness') return '#5bc0de';
    if (kind === 'resist') return '#aaaaaa';
    if (kind === 'detonate') return '#ff8800';
    if (kind === 'miss') return '#bbb';
    if (kind === 'status') return '#e0a0ff';
    return '#fff';
  }

  function drawFloaties(camX, camY) {
    const ctx = getCtx();
    const list = getFloatList();
    if (!ctx || !list.length) return;
    const t = now();
    const reduced = prefersReducedMotion();
    const keep = [];

    for (const f of list) {
      const elapsed = (t - f.born) / FLOAT_LIFE_MS;
      if (elapsed >= 1) continue;
      keep.push(f);

      // Spring-scale pop curve: rapid scale to 1.35x, settles to 1.0x
      let scale = 1.0;
      if (!reduced) {
        if (elapsed < 0.15) {
          scale = 0.7 + (elapsed / 0.15) * 0.65;
        } else if (elapsed < 0.3) {
          scale = 1.35 - ((elapsed - 0.15) / 0.15) * 0.35;
        }
      }

      const rise = reduced ? 0 : elapsed * FLOAT_RISE_PX;
      const x = f.x - camX;
      const y = f.y - camY - 20 - rise;
      const alpha = elapsed < 0.6 ? 1 : Math.max(0, 1 - (elapsed - 0.6) / 0.4);

      const isSpecial = f.kind === 'crit' || f.kind === 'weakness' || f.kind === 'detonate';
      const rawText = f.text;
      const displayText = f.tag ? `${f.tag} ${rawText}` : (f.kind === 'crit' ? `${rawText}!` : String(rawText));

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(x, y);
      ctx.scale(scale, scale);
      ctx.font = `800 ${isSpecial ? 20 : 16}px ${FLOAT_FONT_STACK}`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,.85)';
      ctx.strokeText(displayText, 0, 0);
      ctx.fillStyle = (customFloatColor || floatColor)(f.kind);
      ctx.fillText(displayText, 0, 0);
      ctx.restore();
    }
    setFloatList(keep);
  }


  return {
    addScreenShake,
    getScreenShakeOffset,
    addTelegraph,
    getTelegraphs,
    clearTelegraphs,
    update,
    drawTelegraphs,
    addFloatText,
    getFloaties,
    drawFloaties,
  };
}
