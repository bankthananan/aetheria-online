// js/render/elite-fx.js - Visual aura, shield barrier, and hazard effects for Champion and Elite monsters.

/**
 * Draw rotating ground aura beneath Champion or Elite monster.
 * - Champion: dashed cyan ring (#5bc0de)
 * - Elite: golden radiant halo (#ffcc00)
 */
export function drawEliteAura(ctx, monster, screenX, screenY, size = 32, now = 0) {
  if (!monster || !monster.eliteTier) return;

  const tier = monster.eliteTier;
  const radius = size * 0.75;

  ctx.save();
  ctx.beginPath();
  ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);

  if (tier === 'champion') {
    ctx.strokeStyle = '#5bc0de';
    ctx.lineWidth = 2;
    if (typeof ctx.setLineDash === 'function') {
      ctx.setLineDash([4, 4]);
    }
    ctx.stroke();
  } else if (tier === 'elite') {
    ctx.strokeStyle = '#ffcc00';
    ctx.lineWidth = 3;
    if (typeof ctx.setLineDash === 'function') {
      ctx.setLineDash([]);
    }
    ctx.stroke();

    // Outward radiant rays
    const rays = 8;
    const rayOffset = (now * 0.001) % (Math.PI * 2);
    for (let i = 0; i < rays; i++) {
      const angle = rayOffset + (i * (Math.PI * 2) / rays);
      const innerR = radius - 2;
      const outerR = radius + 6;
      ctx.beginPath();
      ctx.moveTo(screenX + Math.cos(angle) * innerR, screenY + Math.sin(angle) * innerR);
      ctx.lineTo(screenX + Math.cos(angle) * outerR, screenY + Math.sin(angle) * outerR);
      ctx.stroke();
    }
  }

  ctx.restore();
}

/**
 * Draw kinetic shield barrier around monster if shieldActive is true.
 * Hexagonal energy barrier.
 */
export function drawEliteShield(ctx, monster, screenX, screenY, size = 32, now = 0) {
  if (!monster || !monster.shieldActive) return;

  const radius = size * 0.85;
  const rot = (now * 0.0015) % (Math.PI * 2);

  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = rot + (i * Math.PI) / 3;
    const px = screenX + radius * Math.cos(angle);
    const py = screenY + radius * Math.sin(angle);
    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.closePath();

  ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
  ctx.fill();

  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2;
  if (typeof ctx.setLineDash === 'function') {
    ctx.setLineDash([]);
  }
  ctx.stroke();

  ctx.restore();
}

/**
 * Draw ground magma hazard pools.
 */
export function drawMoltenHazards(ctx, hazards, camX = 0, camY = 0, now = 0) {
  if (!hazards || !hazards.length) return;

  for (const h of hazards) {
    if (h.expiresAt && now >= h.expiresAt) continue;

    const sx = Math.round(h.x - camX);
    const sy = Math.round(h.y - camY);
    const radius = h.radius || 24;

    ctx.save();

    // Outer magma pool
    ctx.beginPath();
    ctx.arc(sx, sy, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(239, 68, 68, 0.45)';
    ctx.fill();

    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 2;
    if (typeof ctx.setLineDash === 'function') {
      ctx.setLineDash([]);
    }
    ctx.stroke();

    // Inner bubbling core
    const innerPulse = Math.sin((now + h.x) * 0.005) * 2;
    ctx.beginPath();
    ctx.arc(sx, sy, Math.max(4, (radius * 0.5) + innerPulse), 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(251, 146, 60, 0.65)';
    ctx.fill();

    ctx.restore();
  }
}
