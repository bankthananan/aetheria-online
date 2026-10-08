// js/render/stronghold-fx.js
// Canvas 2D Visual Effects, Pedestal Beacons & Zero-Shake Renderer for Guild Stronghold.
// Handles crystal sanctuary motes, hexagonal energy shield lattice, trophy pedestal beams,
// siege lane hazard vectors, and STRICT ZERO SCREEN SHAKE camera handling.

/**
 * Factory for Stronghold Visual FX Renderer.
 * @param {Object} [options]
 * @param {Function} [options.T] - Localization translation function
 * @param {Object} [options.PX] - Optional pixel art sprite definitions
 */
export function createStrongholdRenderer({ T = (s) => s, PX = null } = {}) {
  // Internal particle pool for crystal sanctuary motes and pedestal embers
  const particles = [];
  let internalTime = 0;
  let internalAngle = 0;

  /**
   * Spawns ascending sanctuary motes at world coordinates.
   * @param {number} x - World X
   * @param {number} y - World Y
   * @param {number} [count=6]
   */
  function spawnSanctuaryMotes(x, y, count = 6) {
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.2;
      const speed = 15 + Math.random() * 25;
      particles.push({
        type: 'sanctuary',
        x: (x || 0) + (Math.random() - 0.5) * 30,
        y: (y || 0) + (Math.random() - 0.5) * 20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0 + Math.random() * 1.0,
        maxLife: 2.0,
        size: 1.2 + Math.random() * 1.5,
        color: 'rgba(185, 246, 202, 0.75)',
      });
    }
  }

  /**
   * Spawns rising embers along a pedestal beam.
   * @param {number} x - World X
   * @param {number} y - World Y
   * @param {string} [color='#00e5ff']
   * @param {string} [pedestalId=null]
   * @param {number} [count=4]
   */
  function spawnPedestalEmbers(x, y, color = '#00e5ff', pedestalId = null, count = 4) {
    for (let i = 0; i < count; i++) {
      const speed = 20 + Math.random() * 30;
      particles.push({
        type: 'ember',
        pedestalId,
        x: (x || 0) + (Math.random() - 0.5) * 16,
        y: y || 0,
        vx: (Math.random() - 0.5) * 8,
        vy: -speed,
        life: 0.8 + Math.random() * 0.8,
        maxLife: 1.6,
        size: 1.2 + Math.random() * 1.8,
        color: color || '#00e5ff',
      });
    }
  }

  /**
   * Advances particle positions, updates oscillating angles, and prunes expired motes.
   * @param {number} [dt=0.016] - Delta time in seconds
   */
  function updateFx(dt = 0.016) {
    const delta = typeof dt === 'number' && dt > 0 ? (dt > 10 ? dt / 1000 : dt) : 0.016;
    internalTime += delta;
    internalAngle = (internalAngle + delta * 1.5) % (Math.PI * 2);

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
   * Draws Stronghold Crystal beacon, rotating rune circles, radial glow,
   * hexagonal energy shield lattice during siege, and drifting sanctuary motes.
   * STRICT ZERO SCREEN SHAKE: cam.x and cam.y are NEVER modified.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {Object} crystalEntity
   * @param {Object} cam - Camera coordinates { x, y }
   * @param {number} [now=Date.now()]
   * @param {number} [viewW=832]
   * @param {number} [viewH=576]
   */
  function drawCrystalBeacon(ctx, crystalEntity, cam, now = Date.now(), viewW = 832, viewH = 576) {
    if (!ctx || !crystalEntity || !cam) return;

    // Center coords strictly relative to camera (read-only)
    const cx = Math.round(crystalEntity.x - cam.x);
    const cy = Math.round(crystalEntity.y - cam.y);

    // Offscreen culling: skip if outside viewport bounds with margin
    if (cx < -80 || cx > viewW + 80 || cy < -80 || cy > viewH + 80) {
      return;
    }

    const t = (now % 60000) / 1000;
    const maxHp = crystalEntity.maxHp || 1;
    const currentHp = crystalEntity.hp !== undefined ? crystalEntity.hp : maxHp;
    const hpRatio = currentHp / maxHp;
    const isDamaged = hpRatio < 0.40;

    ctx.save();

    // 1. Radial gradient glow: emerald when healthy, amber/red if HP < 40%
    const glowRadius = 48;
    const glowGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowRadius);
    if (isDamaged) {
      glowGrad.addColorStop(0, 'rgba(255, 82, 82, 0.45)');
      glowGrad.addColorStop(1, 'rgba(255, 82, 82, 0)');
    } else {
      glowGrad.addColorStop(0, 'rgba(0, 230, 118, 0.35)');
      glowGrad.addColorStop(1, 'rgba(0, 230, 118, 0)');
    }
    ctx.beginPath();
    ctx.arc(cx, cy, glowRadius, 0, Math.PI * 2);
    ctx.fillStyle = glowGrad;
    ctx.fill();

    // 2. Rotating concentric rune circles (radius 28px and 40px) using cos/sin angle offsets
    const runeColor = isDamaged ? '#ff5252' : '#00e676';

    // Inner circle (radius 28px)
    ctx.beginPath();
    ctx.arc(cx, cy, 28, 0, Math.PI * 2);
    ctx.strokeStyle = isDamaged ? 'rgba(255, 82, 82, 0.65)' : 'rgba(0, 230, 118, 0.65)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const innerNotches = 6;
    const innerRot = t * 1.2;
    ctx.beginPath();
    for (let i = 0; i < innerNotches; i++) {
      const a = innerRot + (i * Math.PI * 2) / innerNotches;
      const r1 = 25;
      const r2 = 31;
      ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
      ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
    }
    ctx.strokeStyle = runeColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Outer circle (radius 40px) - counter-rotating
    ctx.beginPath();
    ctx.arc(cx, cy, 40, 0, Math.PI * 2);
    ctx.strokeStyle = isDamaged ? 'rgba(255, 82, 82, 0.45)' : 'rgba(0, 230, 118, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const outerNotches = 8;
    const outerRot = -t * 0.9;
    ctx.beginPath();
    for (let i = 0; i < outerNotches; i++) {
      const a = outerRot + (i * Math.PI * 2) / outerNotches;
      const r1 = 37;
      const r2 = 43;
      ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
      ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
    }
    ctx.strokeStyle = runeColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 3. Hexagonal energy shield lattice if crystalEntity.siegeActive
    if (crystalEntity.siegeActive) {
      const shieldRadius = 48;
      const shieldRot = t * 0.5;

      // Hexagonal outer perimeter
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = shieldRot + (i * Math.PI) / 3;
        const hx = cx + shieldRadius * Math.cos(a);
        const hy = cy + shieldRadius * Math.sin(a);
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(0, 229, 255, 0.12)';
      ctx.fill();
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Hexagonal lattice spokes from center to vertices
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = shieldRot + (i * Math.PI) / 3;
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + shieldRadius * Math.cos(a), cy + shieldRadius * Math.sin(a));
      }
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // 4. Drifting ascending sanctuary motes
    const moteCount = 8;
    for (let i = 0; i < moteCount; i++) {
      const seed = (i * 37 + 11) % 100;
      const speed = 20 + (seed % 15);
      const prog = (t * speed + seed * 8) % 65;
      const mx = cx + Math.sin(t * 1.8 + i * 1.2) * 22;
      const my = cy + 20 - prog;
      const alpha = Math.max(0, 1 - prog / 65) * 0.85;

      ctx.beginPath();
      ctx.arc(mx, my, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = isDamaged ? `rgba(255, 138, 128, ${alpha})` : `rgba(185, 246, 202, ${alpha})`;
      ctx.fill();
    }

    // Also draw any pool particles of type 'sanctuary'
    for (const p of particles) {
      if (p.type === 'sanctuary') {
        const mx = Math.round(p.x - cam.x);
        const my = Math.round(p.y - cam.y);
        if (mx >= -20 && mx <= viewW + 20 && my >= -20 && my <= viewH + 20) {
          ctx.beginPath();
          ctx.arc(mx, my, p.size || 1.5, 0, Math.PI * 2);
          ctx.fillStyle = p.color || 'rgba(185, 246, 202, 0.75)';
          ctx.fill();
        }
      }
    }

    // 5. Label above: '💎 ' + T('Stronghold Crystal', 'ui')
    const crystalLabel = '💎 ' + (T('Stronghold Crystal', 'ui') || 'Stronghold Crystal');
    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(crystalLabel, cx, cy - 54);

    ctx.restore();
  }

  /**
   * Draws radiant beam columns, ascending embers, base rings, and aura crests
   * for socketed trophy pedestals, or subtle marble base rings for empty ones.
   * STRICT ZERO SCREEN SHAKE: cam.x and cam.y are NEVER modified.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {Array} pedestals
   * @param {Object} cam - Camera coordinates { x, y }
   * @param {number} [now=Date.now()]
   * @param {number} [viewW=832]
   * @param {number} [viewH=576]
   */
  function drawPedestalBeams(ctx, pedestals = [], cam, now = Date.now(), viewW = 832, viewH = 576) {
    if (!ctx || !cam || !Array.isArray(pedestals) || pedestals.length === 0) {
      return;
    }

    const t = (now % 60000) / 1000;

    for (const pedestal of pedestals) {
      if (!pedestal) continue;

      const px = Math.round(pedestal.x - cam.x);
      const py = Math.round(pedestal.y - cam.y);

      // Offscreen culling: vertical beam extends upward by ~90px
      if (px < -80 || px > viewW + 80 || py < -120 || py > viewH + 80) {
        continue;
      }

      ctx.save();

      if (pedestal.socketed) {
        const baseColor = pedestal.color || '#00e5ff';
        const beamH = 75 + Math.sin(t * 3.2 + (pedestal.x % 10)) * 8; // height ~ 60–90px
        const beamW = 20; // width ~ 18–24px

        // Vertical radiant beam column extending upward using linear gradient
        const beamGrad = ctx.createLinearGradient(px, py, px, py - beamH);
        beamGrad.addColorStop(0, baseColor);
        beamGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = beamGrad;
        ctx.fillRect(px - Math.round(beamW / 2), py - Math.round(beamH), beamW, Math.round(beamH));

        // Radiant core glow line
        const coreW = 6;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fillRect(px - Math.round(coreW / 2), py - Math.round(beamH), coreW, Math.round(beamH));

        // Pedestal rune base ring
        ctx.beginPath();
        ctx.arc(px, py, 14, 0, Math.PI * 2);
        ctx.strokeStyle = baseColor;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(px, py, 8, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Elemental particle motes rising along the column
        const emberCount = 6;
        for (let i = 0; i < emberCount; i++) {
          const seed = (i * 23 + (pedestal.x % 17)) % 50;
          const emberProg = (t * 30 + seed * 9) % beamH;
          const ex = px + Math.sin(t * 4.5 + i * 1.5) * (beamW * 0.35);
          const ey = py - emberProg;
          const alpha = Math.max(0, 1 - emberProg / beamH) * 0.9;

          ctx.beginPath();
          ctx.arc(ex, ey, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = baseColor;
          ctx.fill();
        }

        // Draw pool particles matching this pedestal
        for (const p of particles) {
          if (p.type === 'ember' && p.pedestalId === pedestal.id) {
            const ex = Math.round(p.x - cam.x);
            const ey = Math.round(p.y - cam.y);
            if (ex >= -10 && ex <= viewW + 10 && ey >= -10 && ey <= viewH + 10) {
              ctx.beginPath();
              ctx.arc(ex, ey, p.size || 1.5, 0, Math.PI * 2);
              ctx.fillStyle = p.color || baseColor;
              ctx.fill();
            }
          }
        }

        // Glowing aura crest / icon above beam
        const crestY = py - Math.round(beamH) - 10;
        ctx.beginPath();
        ctx.arc(px, crestY, 8, 0, Math.PI * 2);
        ctx.fillStyle = baseColor;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        const crestIcon = pedestal.icon || '✨';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(crestIcon, px, crestY + 3);
      } else {
        // Unsocketed pedestal: subtle marble pedestal base ring (dashed/notch pattern)
        ctx.beginPath();
        ctx.arc(px, py, 14, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 1.5;
        if (ctx.setLineDash) ctx.setLineDash([3, 3]);
        ctx.stroke();
        if (ctx.setLineDash) ctx.setLineDash([]);
      }

      ctx.restore();
    }
  }

  /**
   * Draws dashed hazard vector lines and pulsing alert chevrons for siege wave lanes.
   * STRICT ZERO SCREEN SHAKE: cam.x and cam.y are NEVER modified.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {Array} lanes - Array of { x1, y1, x2, y2 }
   * @param {Object} cam - Camera coordinates { x, y }
   * @param {number} [now=Date.now()]
   * @param {number} [viewW=832]
   * @param {number} [viewH=576]
   */
  function drawSiegeLanes(ctx, lanes = [], cam, now = Date.now(), viewW = 832, viewH = 576) {
    if (!ctx || !cam || !Array.isArray(lanes) || lanes.length === 0) {
      return;
    }

    const t = (now % 60000) / 1000;

    for (const lane of lanes) {
      if (!lane) continue;

      const sx1 = Math.round(lane.x1 - cam.x);
      const sy1 = Math.round(lane.y1 - cam.y);
      const sx2 = Math.round(lane.x2 - cam.x);
      const sy2 = Math.round(lane.y2 - cam.y);

      // Offscreen culling: check if bounding box of the lane segment is outside viewport
      const minX = Math.min(sx1, sx2);
      const maxX = Math.max(sx1, sx2);
      const minY = Math.min(sy1, sy2);
      const maxY = Math.max(sy1, sy2);
      if (maxX < -80 || minX > viewW + 80 || maxY < -80 || minY > viewH + 80) {
        continue;
      }

      ctx.save();

      // 1. Dashed hazard vector line with pulsing dash offset
      ctx.beginPath();
      ctx.moveTo(sx1, sy1);
      ctx.lineTo(sx2, sy2);
      ctx.strokeStyle = 'rgba(244, 67, 54, 0.4)';
      ctx.lineWidth = 2;
      if (ctx.setLineDash) ctx.setLineDash([6, 6]);
      ctx.lineDashOffset = -(t * 24) % 12;
      ctx.stroke();
      if (ctx.setLineDash) ctx.setLineDash([]);

      // 2. Hazard chevrons / alert arrows along the vector
      const dx = sx2 - sx1;
      const dy = sy2 - sy1;
      const dist = Math.hypot(dx, dy);

      if (dist > 15) {
        const dir = Math.atan2(dy, dx);
        const chevronLen = 6;
        const chevronAngle = Math.PI / 4;
        const count = Math.max(1, Math.floor(dist / 60));

        ctx.strokeStyle = 'rgba(244, 67, 54, 0.7)';
        ctx.lineWidth = 2;

        for (let i = 1; i <= count; i++) {
          const ratio = ((i / (count + 1)) + (t * 0.25)) % 1;
          const cx = sx1 + dx * ratio;
          const cy = sy1 + dy * ratio;

          ctx.beginPath();
          ctx.moveTo(
            cx - chevronLen * Math.cos(dir - chevronAngle),
            cy - chevronLen * Math.sin(dir - chevronAngle)
          );
          ctx.lineTo(cx, cy);
          ctx.lineTo(
            cx - chevronLen * Math.cos(dir + chevronAngle),
            cy - chevronLen * Math.sin(dir + chevronAngle)
          );
          ctx.stroke();
        }
      }

      ctx.restore();
    }
  }

  return {
    drawCrystalBeacon,
    drawPedestalBeams,
    drawSiegeLanes,
    updateFx,
    spawnSanctuaryMotes,
    spawnPedestalEmbers,
  };
}
