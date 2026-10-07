// js/render/spire-fx.js
// Canvas 2D visual effects renderer for Abyssal Spire Challenge Tower.
// Provides ambient affix particle rendering, ascendance clear portal,
// milestone boss fanfare, graviton vortex, and strict ZERO screen shake camera handling.

/**
 * Factory for Abyssal Spire Visual FX Renderer.
 * @param {Object} options
 * @param {Function} options.T - Localization translation function
 * @param {Object} [options.PX] - Pixel art sprite definitions
 */
export function createSpireRenderer({ T = (s) => s, PX = null } = {}) {
  // Internal particle pool for ambient affix motes and ascendance portal bursts
  const particles = [];
  let internalTime = 0;

  /**
   * Spawns clear portal celebration particles at world coordinates.
   * @param {number} x - World X
   * @param {number} y - World Y
   */
  function triggerClearPortal(x, y) {
    const burstCount = 24;
    const colors = ['#ab47bc', '#e1bee7', '#00e5ff', '#ffffff'];
    for (let i = 0; i < burstCount; i++) {
      const angle = (Math.PI * 2 * i) / burstCount + (Math.random() - 0.5) * 0.3;
      const speed = 25 + Math.random() * 45;
      particles.push({
        x: x || 0,
        y: y || 0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 20, // upward ascension drift
        life: 1.2 + Math.random() * 0.8,
        maxLife: 2.0,
        size: 1.5 + Math.random() * 2,
        color: colors[i % colors.length],
      });
    }
  }

  /**
   * Advances internal particles and oscillating time offsets, pruning dead motes.
   * @param {number} dt - Delta time in seconds
   */
  function updateFx(dt = 0.016) {
    const delta = typeof dt === 'number' && dt > 0 ? dt : 0.016;
    internalTime += delta;

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= delta;
      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
      p.x += (p.vx || 0) * delta;
      p.y += (p.vy || 0) * delta;
    }
  }

  /**
   * Draws ambient visual effects for active floor affixes.
   * STRICT ZERO SCREEN SHAKE: cam.x and cam.y are NEVER mutated.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {Array} activeAffixes - Array of affix objects or IDs
   * @param {Object} cam - Camera viewport { x, y }
   * @param {number} now - Timestamp in ms
   * @param {number} viewW - Viewport width
   * @param {number} viewH - Viewport height
   */
  function drawSpireAffixFx(ctx, activeAffixes = [], cam, now = Date.now(), viewW = 832, viewH = 576) {
    if (!ctx || !cam || !Array.isArray(activeAffixes) || activeAffixes.length === 0) {
      return;
    }

    const t = (now % 100000) / 1000;

    for (const affix of activeAffixes) {
      const id = typeof affix === 'string' ? affix : affix?.id;
      if (!id) continue;

      if (id === 'magma_surge') {
        // Draw 12-16 rising fiery cinder/ember particles (orange/red/yellow: #ff7043, #ffb74d, #e65100)
        ctx.save();
        const count = 16;
        const colors = ['#ff7043', '#ffb74d', '#e65100'];
        for (let i = 0; i < count; i++) {
          const seed = (i * 97 + 13) % 100;
          const speed = 45 + (seed % 35);
          const sway = Math.sin(t * 2.5 + i * 1.3) * 14;
          const px = (seed * 8.32 + sway + viewW) % viewW;
          const py = viewH - ((t * speed + seed * 5.76) % viewH);
          const r = 1.5 + (i % 3) * 0.8;

          ctx.beginPath();
          ctx.arc(px, py, r, 0, Math.PI * 2);
          ctx.fillStyle = colors[i % colors.length];
          ctx.fill();
        }
        ctx.restore();
      } else if (id === 'glacial_chill') {
        // Draw 12-16 drifting frosted snowflakes/hex crystals across the screen (cyan/white: #80d8ff, #e0f7fa)
        ctx.save();
        const count = 16;
        const colors = ['#80d8ff', '#e0f7fa'];
        for (let i = 0; i < count; i++) {
          const seed = (i * 73 + 29) % 100;
          const speedX = 24 + (seed % 20);
          const speedY = 32 + ((seed * 3) % 25);
          const drift = Math.sin(t * 1.8 + i) * 10;
          const px = (seed * 8.32 + t * speedX + drift) % viewW;
          const py = (seed * 5.76 + t * speedY) % viewH;
          const s = 2.5 + (i % 2) * 1.5;

          ctx.beginPath();
          ctx.moveTo(px - s, py);
          ctx.lineTo(px + s, py);
          ctx.moveTo(px, py - s);
          ctx.lineTo(px, py + s);
          ctx.moveTo(px - s * 0.7, py - s * 0.7);
          ctx.lineTo(px + s * 0.7, py + s * 0.7);
          ctx.strokeStyle = colors[i % colors.length];
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        ctx.restore();
      } else if (id === 'sunder_mist') {
        // Draw soft translucent lilac ambient haze patches ('rgba(171, 71, 188, 0.12)')
        ctx.save();
        ctx.fillStyle = 'rgba(171, 71, 188, 0.12)';
        const patchCount = 5;
        for (let i = 0; i < patchCount; i++) {
          const mx = ((i * 180) + t * 16) % (viewW + 220) - 100;
          const my = (i * 115 + Math.sin(t + i) * 20) % viewH;
          ctx.fillRect(mx, my, 280, 56);
        }
        ctx.restore();
      } else if (id === 'graviton_well') {
        // Draw rotating concentric ellipse rings pulling toward center
        ctx.save();
        const cx = viewW / 2;
        const cy = viewH / 2;
        const ringCount = 4;
        for (let i = 0; i < ringCount; i++) {
          const phase = ((t * 0.45 + i / ringCount) % 1);
          const rx = 180 * (1 - phase) + 20;
          const ry = 90 * (1 - phase) + 10;
          const rot = t * 0.6 + i * 0.5;

          ctx.beginPath();
          if (typeof ctx.ellipse === 'function') {
            ctx.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2);
          } else {
            ctx.arc(cx, cy, (rx + ry) / 2, 0, Math.PI * 2);
          }
          ctx.strokeStyle = `rgba(186, 104, 200, ${(0.25 + (1 - phase) * 0.45).toFixed(2)})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
        ctx.restore();
      } else if (id === 'chrono_haste') {
        // Draw 8-12 sparkling golden speed lines or motes ('#ffd54f', '#fff59d')
        ctx.save();
        const count = 10;
        const colors = ['#ffd54f', '#fff59d'];
        for (let i = 0; i < count; i++) {
          const seed = (i * 89 + 17) % 100;
          const speedX = 180 + (seed % 120);
          const px = (seed * 8.32 + t * speedX) % viewW;
          const py = (seed * 5.76 + Math.sin(t * 3.5 + i) * 8) % viewH;
          const len = 12 + (seed % 14);

          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px + len, py);
          ctx.strokeStyle = colors[i % colors.length];
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Golden spark dot
          ctx.beginPath();
          ctx.arc(px + len, py, 1.2, 0, Math.PI * 2);
          ctx.fillStyle = colors[(i + 1) % colors.length];
          ctx.fill();
        }
        ctx.restore();
      }
    }
  }

  /**
   * Draws the Ascendance Portal leading to the next Spire floor.
   * STRICT ZERO SCREEN SHAKE: cam is never mutated.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {Object} portalPos - World coordinates { x, y }
   * @param {Object} cam - Camera viewport { x, y }
   * @param {number} now - Timestamp in ms
   * @param {number} viewW - Viewport width
   * @param {number} viewH - Viewport height
   */
  function drawAscendancePortal(ctx, portalPos, cam, now = Date.now(), viewW = 832, viewH = 576) {
    if (!ctx || !portalPos || !cam) return;

    const px = Math.round(portalPos.x - cam.x);
    const py = Math.round(portalPos.y - cam.y);

    // Offscreen culling: skip if outside viewport (+80px margin)
    if (px < -80 || px > viewW + 80 || py < -80 || py > viewH + 80) {
      return;
    }

    const t = (now % 60000) / 1000;

    ctx.save();

    // 1. Concentric expanding stroke rings (radius 24 to 36, strokeStyle = '#ab47bc' / '#e1bee7', lineWidth = 2)
    const ringCount = 3;
    for (let i = 0; i < ringCount; i++) {
      const progress = ((t * 0.6 + i / ringCount) % 1);
      const r = 24 + progress * 12; // expands from 24 to 36
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.strokeStyle = i % 2 === 0 ? '#ab47bc' : '#e1bee7';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // 2. Central glowing cosmic void ellipse ('rgba(33, 33, 33, 0.85)')
    ctx.beginPath();
    const voidRx = 20;
    const voidRy = 14;
    if (typeof ctx.ellipse === 'function') {
      ctx.ellipse(px, py, voidRx, voidRy, 0, 0, Math.PI * 2);
    } else {
      ctx.arc(px, py, 17, 0, Math.PI * 2);
    }
    ctx.fillStyle = 'rgba(33, 33, 33, 0.85)';
    ctx.fill();

    // 3. Floating ascending sparkles
    const sparkleCount = 6;
    for (let i = 0; i < sparkleCount; i++) {
      const angle = (t * 2.2) + (i * Math.PI * 2 / sparkleCount);
      const rise = ((t * 32 + i * 14) % 36);
      const sx = px + Math.cos(angle) * (14 + Math.sin(t * 3 + i) * 3);
      const sy = py - rise;
      ctx.beginPath();
      ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = i % 2 === 0 ? '#e1bee7' : '#ab47bc';
      ctx.fill();
    }

    // Render active ascending burst motes near this portal
    for (const p of particles) {
      const sx = Math.round(p.x - cam.x);
      const sy = Math.round(p.y - cam.y);
      if (sx >= -10 && sx <= viewW + 10 && sy >= -10 && sy <= viewH + 10) {
        ctx.beginPath();
        ctx.arc(sx, sy, p.size || 1.5, 0, Math.PI * 2);
        ctx.fillStyle = p.color || '#e1bee7';
        ctx.fill();
      }
    }

    // 4. Text label above: '🌀 ' + T('Ascendance Portal', 'ui')
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('🌀 ' + T('Ascendance Portal', 'ui'), px, py - 44);

    ctx.restore();
  }

  /**
   * Draws milestone boss warning fanfare (floors 10, 20, ..., 100).
   * STRICT ZERO SCREEN SHAKE: cam is never mutated.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {Object} bossEntity - Boss world coordinates & radius { x, y, radius }
   * @param {Object} cam - Camera viewport { x, y }
   * @param {number} now - Timestamp in ms
   * @param {number} viewW - Viewport width
   * @param {number} viewH - Viewport height
   */
  function drawMilestoneBossFanfare(ctx, bossEntity, cam, now = Date.now(), viewW = 832, viewH = 576) {
    if (!ctx || !bossEntity || !cam) return;

    const bx = Math.round(bossEntity.x - cam.x);
    const by = Math.round(bossEntity.y - cam.y);

    // Offscreen culling: skip if outside viewport (+80px margin)
    if (bx < -80 || bx > viewW + 80 || by < -80 || by > viewH + 80) {
      return;
    }

    const t = (now % 60000) / 1000;

    ctx.save();

    // 1. Pulsating outer ring with radius ~ 48px, strokeStyle = 'rgba(255, 82, 82, 0.6)'
    const pulseR = 48 + Math.sin(t * 4.5) * 4;
    ctx.beginPath();
    ctx.arc(bx, by, pulseR, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 82, 82, 0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 2. Secondary inner golden radiant ring
    ctx.beginPath();
    ctx.arc(bx, by, 38 + Math.cos(t * 3.5) * 3, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 3. Warning crest text above boss: '☠ MILESTONE BOSS'
    const bossRadius = bossEntity.radius || 32;
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff5252';
    ctx.fillText('☠ MILESTONE BOSS', bx, by - bossRadius - 16);

    ctx.restore();
  }

  /**
   * Draws inward graviton vortex arcs around target center coordinates.
   * STRICT ZERO SCREEN SHAKE: cam is never mutated.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} centerX - World center X
   * @param {number} centerY - World center Y
   * @param {Object} cam - Camera viewport { x, y }
   * @param {number} now - Timestamp in ms
   */
  function drawGravitonVortex(ctx, centerX, centerY, cam, now = Date.now()) {
    if (!ctx || !cam) return;

    const sx = Math.round(centerX - cam.x);
    const sy = Math.round(centerY - cam.y);

    const t = (now % 60000) / 1000;

    ctx.save();
    const arms = 4;
    ctx.strokeStyle = 'rgba(186, 104, 200, 0.65)';
    ctx.lineWidth = 1.5;

    for (let a = 0; a < arms; a++) {
      const armBase = (a * (Math.PI * 2) / arms) + t * 2;
      ctx.beginPath();
      const points = 12;
      for (let p = 0; p < points; p++) {
        const frac = p / points;
        const r = 42 * (1 - frac);
        const theta = armBase + frac * 2.5;
        const x = sx + Math.cos(theta) * r;
        const y = sy + Math.sin(theta) * r;
        if (p === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      // Spiraling core sparkle
      const sparkTheta = armBase + (t * 3.5);
      const sparkR = 14 + Math.sin(t * 6 + a) * 4;
      ctx.beginPath();
      ctx.arc(sx + Math.cos(sparkTheta) * sparkR, sy + Math.sin(sparkTheta) * sparkR, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = '#00e5ff';
      ctx.fill();
    }

    ctx.restore();
  }

  return {
    drawSpireAffixFx,
    drawAscendancePortal,
    drawMilestoneBossFanfare,
    drawGravitonVortex,
    triggerClearPortal,
    updateFx,
  };
}
