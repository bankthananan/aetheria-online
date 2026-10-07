// js/render/raids-fx.js
// Canvas 2D Visual Effects, Geometric Telegraphs & Zero-Shake Renderer.
// Provides boss auras, Aegis hexagonal domes, stagger burst particles,
// break gauges, and geometric telegraphs with STRICT ZERO SCREEN SHAKE.

const ELEMENT_PALETTES = {
  void: { primary: '#9c27b0', secondary: '#ba68c8', glow: 'rgba(156, 39, 176, 0.35)' },
  fire: { primary: '#e65100', secondary: '#ff9800', glow: 'rgba(230, 81, 0, 0.35)' },
  nature: { primary: '#2e7d32', secondary: '#81c784', glow: 'rgba(46, 125, 50, 0.35)' },
  default: { primary: '#00e5ff', secondary: '#80d8ff', glow: 'rgba(0, 229, 255, 0.35)' },
};

/**
 * Draw oriented directional box telegraph between (ox, oy) and (tx, ty) or along length.
 */
export function drawOrientedBoxTelegraph(
  ctx,
  ox,
  oy,
  tx,
  ty,
  len,
  width,
  progress,
  color = 'rgba(239, 68, 68, 0.4)'
) {
  if (!ctx) return;
  const dx = tx - ox;
  const dy = ty - oy;
  const dist = Math.hypot(dx, dy);
  const dirAngle = dist > 0.0001 ? Math.atan2(dy, dx) : 0;
  const boxLen = len ?? (dist > 0.0001 ? dist : 120);
  const boxW = width ?? 40;
  const hw = boxW / 2;

  const ux = Math.cos(dirAngle);
  const uy = Math.sin(dirAngle);
  const px = -uy;
  const py = ux;

  ctx.save();

  // Full boundary box
  ctx.beginPath();
  ctx.moveTo(ox + px * hw, oy + py * hw);
  ctx.lineTo(ox + ux * boxLen + px * hw, oy + uy * boxLen + py * hw);
  ctx.lineTo(ox + ux * boxLen - px * hw, oy + uy * boxLen - py * hw);
  ctx.lineTo(ox - px * hw, oy - py * hw);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Progress charging fill
  const clampedProgress = Math.max(0, Math.min(1, progress ?? 0));
  const curLen = boxLen * clampedProgress;
  if (curLen > 0) {
    ctx.beginPath();
    ctx.moveTo(ox + px * hw, oy + py * hw);
    ctx.lineTo(ox + ux * curLen + px * hw, oy + uy * curLen + py * hw);
    ctx.lineTo(ox + ux * curLen - px * hw, oy + uy * curLen - py * hw);
    ctx.lineTo(ox - px * hw, oy - py * hw);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 23, 68, 0.45)';
    ctx.fill();
    ctx.strokeStyle = '#ff1744';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Draw cone/breath telegraph from origin point with field of view and radius.
 */
export function drawConeTelegraph(
  ctx,
  ox,
  oy,
  angle = 0,
  radius = 80,
  fov = Math.PI / 3,
  progress = 0,
  color = 'rgba(239, 68, 68, 0.4)'
) {
  if (!ctx) return;
  const halfFov = (fov || Math.PI / 3) / 2;
  const startAngle = angle - halfFov;
  const endAngle = angle + halfFov;

  ctx.save();

  // Full cone sector
  ctx.beginPath();
  ctx.moveTo(ox, oy);
  ctx.arc(ox, oy, radius, startAngle, endAngle);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Progress charging cone
  const clampedProgress = Math.max(0, Math.min(1, progress ?? 0));
  const curR = radius * clampedProgress;
  if (curR > 0) {
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.arc(ox, oy, curR, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 23, 68, 0.45)';
    ctx.fill();
    ctx.strokeStyle = '#ff1744';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Draw radial circle/cataclysm telegraph with outer border and charging inner ring.
 */
export function drawCircleTelegraph(
  ctx,
  cx,
  cy,
  radius = 60,
  progress = 0,
  color = 'rgba(239, 68, 68, 0.4)'
) {
  if (!ctx) return;
  ctx.save();

  // Full perimeter circle
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Progress charging circle
  const clampedProgress = Math.max(0, Math.min(1, progress ?? 0));
  const curR = radius * clampedProgress;
  if (curR > 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, curR, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 23, 68, 0.45)';
    ctx.fill();
    ctx.strokeStyle = '#ff1744';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Factory helper to create well-formed telegraph descriptor.
 */
export function createTelegraph(type = 'circle', opts = {}) {
  return {
    type,
    ox: opts.ox ?? opts.x ?? 0,
    oy: opts.oy ?? opts.y ?? 0,
    tx: opts.tx ?? opts.targetX ?? (opts.ox ?? opts.x ?? 0) + 100,
    ty: opts.ty ?? opts.targetY ?? (opts.oy ?? opts.y ?? 0),
    angle: opts.angle ?? 0,
    radius: opts.radius ?? 60,
    len: opts.len ?? opts.length ?? 120,
    width: opts.width ?? 40,
    fov: opts.fov ?? Math.PI / 3,
    duration: opts.duration ?? 1.5,
    progress: opts.progress ?? 0,
    color: opts.color || 'rgba(239, 68, 68, 0.4)',
    ...opts,
  };
}

/**
 * Factory to create Raid & World Boss Visual FX Renderer.
 */
export function createRaidsRenderer({ T = (s) => s, PX = null } = {}) {
  const particles = [];
  const internalTelegraphs = [];

  /**
   * Draw elemental rune circles and enraged flare corona around boss.
   * STRICT ZERO SCREEN SHAKE: cam is never modified.
   */
  function drawBossAura(ctx, bossEntity, cam, now = Date.now(), viewW = 832, viewH = 576) {
    if (!ctx || !bossEntity || !cam) return;

    const sx = Math.round(bossEntity.x - cam.x);
    const sy = Math.round(bossEntity.y - cam.y);

    // Offscreen culling
    if (sx < -100 || sx > viewW + 100 || sy < -100 || sy > viewH + 100) {
      return;
    }

    const elemKey = (bossEntity.element || bossEntity.bossDef?.element || 'default').toLowerCase();
    const palette = ELEMENT_PALETTES[elemKey] || ELEMENT_PALETTES.default;
    const t = (now % 60000) / 1000;

    ctx.save();

    // 1. Concentric Rune Circles (~36-48px)
    // Inner rune ring
    ctx.beginPath();
    ctx.arc(sx, sy, 36, 0, Math.PI * 2);
    ctx.strokeStyle = palette.primary;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Middle diffuse glow ring
    ctx.beginPath();
    ctx.arc(sx, sy, 42, 0, Math.PI * 2);
    ctx.strokeStyle = palette.glow;
    ctx.lineWidth = 4;
    ctx.stroke();

    // Outer concentric ring
    ctx.beginPath();
    ctx.arc(sx, sy, 48, 0, Math.PI * 2);
    ctx.strokeStyle = palette.secondary;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Rotating rune notch marks using cos/sin angle offsets
    const notchCount = 8;
    const rot = t * 0.8;
    for (let i = 0; i < notchCount; i++) {
      const a = rot + (i * Math.PI * 2) / notchCount;
      ctx.beginPath();
      ctx.moveTo(sx + Math.cos(a) * 36, sy + Math.sin(a) * 36);
      ctx.lineTo(sx + Math.cos(a) * 44, sy + Math.sin(a) * 44);
      ctx.strokeStyle = palette.secondary;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Counter-rotating rune dots
    const dotCount = 12;
    const counterRot = -t * 0.5;
    for (let i = 0; i < dotCount; i++) {
      const a = counterRot + (i * Math.PI * 2) / dotCount;
      ctx.beginPath();
      ctx.arc(sx + Math.cos(a) * 48, sy + Math.sin(a) * 48, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = palette.primary;
      ctx.fill();
    }

    // 2. Enraged Corona
    if (bossEntity.enraged) {
      const enrageR = 56 + Math.sin(t * 8) * 4;

      // Pulsating outer ring
      ctx.beginPath();
      ctx.arc(sx, sy, enrageR, 0, Math.PI * 2);
      ctx.strokeStyle = '#ff1744';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Radiating spires and flares
      const spires = 8;
      const spireRot = t * 1.5;
      for (let i = 0; i < spires; i++) {
        const a = spireRot + (i * Math.PI * 2) / spires;
        const rInner = enrageR - 2;
        const rOuter = enrageR + 14 + (i % 2 === 0 ? 6 : 0);
        ctx.beginPath();
        ctx.moveTo(sx + Math.cos(a) * rInner, sy + Math.sin(a) * rInner);
        ctx.lineTo(sx + Math.cos(a) * rOuter, sy + Math.sin(a) * rOuter);
        ctx.strokeStyle = i % 2 === 0 ? '#ff5252' : '#ffab00';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Orbiting spark particles
      const sparkCount = 6;
      for (let i = 0; i < sparkCount; i++) {
        const sa = -t * 2.2 + (i * Math.PI * 2) / sparkCount;
        const sr = 60 + Math.sin(t * 5 + i) * 6;
        const spx = sx + Math.cos(sa) * sr;
        const spy = sy + Math.sin(sa) * sr;
        ctx.beginPath();
        ctx.arc(spx, spy, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#ffeb3b';
        ctx.fill();
      }
    }

    ctx.restore();
  }

  /**
   * Draw Aegis hexagonal barrier dome around boss.
   * STRICT ZERO SCREEN SHAKE: cam is never modified.
   */
  function drawAegisBarrier(ctx, bossEntity, cam, now = Date.now(), viewW = 832, viewH = 576) {
    if (!ctx || !bossEntity || !cam) return;

    const sx = Math.round(bossEntity.x - cam.x);
    const sy = Math.round(bossEntity.y - cam.y);

    // Offscreen culling
    if (sx < -100 || sx > viewW + 100 || sy < -100 || sy > viewH + 100) {
      return;
    }

    const radius = 52;
    const t = ((now % 60000) / 1000) * 0.6;

    ctx.save();

    // 6 vertices of hexagonal energy dome
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = t + (i * Math.PI) / 3;
      const px = sx + radius * Math.cos(angle);
      const py = sy + radius * Math.sin(angle);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(0, 229, 255, 0.18)';
    ctx.fill();
    ctx.strokeStyle = '#84ffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inner hex ripple / lattice line connectors
    const innerRadius = 34 + Math.sin(t * 4) * 3;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = -t + (i * Math.PI) / 3;
      const px = sx + innerRadius * Math.cos(angle);
      const py = sy + innerRadius * Math.sin(angle);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.strokeStyle = 'rgba(132, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Lattice connector lines between center and vertices
    for (let i = 0; i < 6; i++) {
      const angle = t + (i * Math.PI) / 3;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + radius * Math.cos(angle), sy + radius * Math.sin(angle));
      ctx.strokeStyle = 'rgba(132, 255, 255, 0.25)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Draw Break shield gauge bar, numeric progress, and add mitigation badge.
   * STRICT ZERO SCREEN SHAKE: cam is never modified.
   */
  function drawBreakGauge(ctx, raidState, cam, now = Date.now(), viewW = 832, viewH = 576) {
    if (!ctx || !raidState || !cam || !raidState.breakShield || raidState.breakShield <= 0) {
      return;
    }

    const bx = Math.round(raidState.x - cam.x - 60);
    const by = Math.round(raidState.y - cam.y - 48);

    // Offscreen culling
    if (bx < -140 || bx > viewW + 140 || by < -80 || by > viewH + 80) {
      return;
    }

    const w = 120;
    const h = 10;
    const maxShield = raidState.maxBreakShield || raidState.breakShield || 1;
    const gaugeRatio = Math.max(0, Math.min(1, raidState.breakShield / maxShield));

    ctx.save();

    // Backing card fill
    ctx.fillStyle = 'rgba(15, 12, 24, 0.85)';
    ctx.fillRect(bx, by, w, h);
    ctx.strokeStyle = '#ffeb3b';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, w, h);

    // Break shield bar fill
    const fillW = Math.round((w - 2) * gaugeRatio);
    if (fillW > 0) {
      ctx.fillStyle = '#00e5ff';
      ctx.fillRect(bx + 1, by + 1, fillW, h - 2);

      // Highlight line
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(bx + 1, by + 1, fillW, 1);
    }

    // Shield label text
    const label = `🛡 ${raidState.breakShield} / ${maxShield}`;
    ctx.font = 'bold 9px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, bx + w / 2, by + h / 2);

    // Alive adds mitigation badge indicator
    const aliveAdds = Array.isArray(raidState.adds)
      ? raidState.adds.filter((a) => a && a.alive !== false).length
      : raidState.aliveAddsCount || 0;

    if (aliveAdds > 0) {
      const resPct = Math.round(Math.min(0.6, aliveAdds * 0.15) * 100);
      const badgeText = `🛡 +${resPct}% RES`;
      const badgeW = 68;
      const badgeH = 13;
      const badgeX = bx + Math.round((w - badgeW) / 2);
      const badgeY = by - 16;

      ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
      ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
      ctx.strokeStyle = '#ff8a80';
      ctx.lineWidth = 1;
      ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);

      ctx.font = 'bold 8px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(badgeText, badgeX + badgeW / 2, badgeY + badgeH / 2);
    }

    ctx.restore();
  }

  /**
   * Draw active telegraphs array.
   * STRICT ZERO SCREEN SHAKE: cam is never modified.
   */
  function drawTelegraphs(ctx, telegraphs, cam, now = Date.now(), viewW = 832, viewH = 576) {
    if (!ctx || !cam) return;
    const list = Array.isArray(telegraphs) ? telegraphs : internalTelegraphs;
    if (!list || !list.length) return;

    for (const t of list) {
      if (!t) continue;
      const sx = t.ox - cam.x;
      const sy = t.oy - cam.y;

      if (t.type === 'box' || t.type === 'fissure') {
        const stx = t.tx != null ? t.tx - cam.x : sx + (t.len || 120);
        const sty = t.ty != null ? t.ty - cam.y : sy;
        drawOrientedBoxTelegraph(ctx, sx, sy, stx, sty, t.len, t.width, t.progress, t.color);
      } else if (t.type === 'cone' || t.type === 'breath') {
        drawConeTelegraph(ctx, sx, sy, t.angle, t.radius, t.fov, t.progress, t.color);
      } else if (t.type === 'circle' || t.type === 'cataclysm') {
        drawCircleTelegraph(ctx, sx, sy, t.radius, t.progress, t.color);
      }
    }
  }

  /**
   * Draw stagger burst particles (diamond shards / radiant motes).
   * STRICT ZERO SCREEN SHAKE: cam is never modified.
   */
  function drawStaggerBursts(ctx, particlesToDraw, cam, now = Date.now(), viewW = 832, viewH = 576) {
    if (!ctx || !cam) return;
    const list = Array.isArray(particlesToDraw) ? particlesToDraw : particles;
    if (!list || !list.length) return;

    for (const p of list) {
      if (!p) continue;
      const px = Math.round(p.x - cam.x);
      const py = Math.round(p.y - cam.y);

      // Offscreen culling
      if (px < -20 || px > viewW + 20 || py < -20 || py > viewH + 20) {
        continue;
      }

      const alpha = Math.max(0, 1 - p.t / (p.duration || 1));
      if (alpha <= 0) continue;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color || '#ffd54f';
      const s = p.size || 4;
      ctx.beginPath();
      ctx.moveTo(px, py - s);
      ctx.lineTo(px + s * 0.6, py);
      ctx.lineTo(px, py + s);
      ctx.lineTo(px - s * 0.6, py);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  /**
   * Spawn stagger burst particles at (x, y).
   */
  function triggerStaggerBurst(x, y, count = 24) {
    const colors = ['#ffd54f', '#00e5ff', '#ffffff'];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 120;
      const duration = 0.6 + Math.random() * 0.6;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        t: 0,
        duration,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 3 + Math.random() * 3,
      });
    }
  }

  /**
   * Add a telegraph to internal list.
   */
  function addTelegraph(telegraph) {
    const obj =
      typeof telegraph === 'string'
        ? createTelegraph(telegraph)
        : telegraph && telegraph.type
        ? createTelegraph(telegraph.type, telegraph)
        : telegraph;
    if (obj) {
      internalTelegraphs.push(obj);
    }
    return obj;
  }

  /**
   * Update particle kinematics and telegraph progress over dt seconds.
   */
  function updateFx(dt) {
    const delta = dt > 10 ? dt / 1000 : dt;

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * delta;
      p.y += p.vy * delta;
      p.t += delta;
      if (p.t >= p.duration) {
        particles.splice(i, 1);
      }
    }

    // Update internal telegraphs
    for (let i = internalTelegraphs.length - 1; i >= 0; i--) {
      const tg = internalTelegraphs[i];
      const dur = tg.duration || 1.5;
      tg.progress = (tg.progress || 0) + delta / dur;
      if (tg.progress >= 1) {
        internalTelegraphs.splice(i, 1);
      }
    }
  }

  return {
    drawBossAura,
    drawAegisBarrier,
    drawBreakGauge,
    drawTelegraphs,
    drawStaggerBursts,
    triggerStaggerBurst,
    addTelegraph,
    updateFx,
  };
}
