// js/render/rift-fx.js
// Canvas 2D renderer for Dimensional Rifts & Incursions.
// Draws pulsating cosmic vortex ellipses, orbiting void spark particles,
// and the top incursion HUD status banner with strictly 0% screen shake.

export function createRiftRenderer({ T = (s) => s } = {}) {
  function drawRiftTear(ctx, tear, cam, now = Date.now(), viewW = 832, viewH = 576) {
    if (!ctx || !tear || !cam) return;

    const sx = Math.round(tear.x - cam.x);
    const sy = Math.round(tear.y - cam.y);

    // Off-screen culling
    if (sx < -60 || sx > viewW + 60 || sy < -60 || sy > viewH + 60) {
      return;
    }

    const t = (now % 10000) / 1000;

    ctx.save();

    // 1. Outer Glow Vortex Ellipse
    ctx.beginPath();
    const outerRx = 26 + Math.sin(t * 3) * 3;
    const outerRy = 16 + Math.cos(t * 3) * 2;
    if (typeof ctx.ellipse === 'function') {
      ctx.ellipse(sx, sy, outerRx, outerRy, t * 0.4, 0, Math.PI * 2);
    } else {
      ctx.arc(sx, sy, outerRx, 0, Math.PI * 2);
    }
    ctx.strokeStyle = 'rgba(123, 31, 162, 0.4)';
    ctx.lineWidth = 4;
    ctx.stroke();

    // 2. Middle Void Incursion Vortex
    ctx.beginPath();
    const midRx = 18 + Math.cos(t * 4) * 2;
    const midRy = 11 + Math.sin(t * 4) * 1.5;
    if (typeof ctx.ellipse === 'function') {
      ctx.ellipse(sx, sy, midRx, midRy, -t * 0.8, 0, Math.PI * 2);
    } else {
      ctx.arc(sx, sy, midRx, 0, Math.PI * 2);
    }
    ctx.strokeStyle = '#ba68c8';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 3. Singularity Core (Cyan celestial spark)
    ctx.beginPath();
    const coreRx = 10 + Math.sin(t * 6) * 1.5;
    const coreRy = 6 + Math.cos(t * 6);
    if (typeof ctx.ellipse === 'function') {
      ctx.ellipse(sx, sy, coreRx, coreRy, t, 0, Math.PI * 2);
    } else {
      ctx.arc(sx, sy, coreRx, 0, Math.PI * 2);
    }
    ctx.fillStyle = '#00e5ff';
    ctx.fill();

    // 4. Orbiting Spark Particles (strictly zero camera trauma)
    const sparkCount = 4;
    for (let i = 0; i < sparkCount; i++) {
      const angle = (t * 2) + (i * Math.PI * 2 / sparkCount);
      const px = sx + Math.cos(angle) * (20 + Math.sin(t * 4 + i) * 3);
      const py = sy + Math.sin(angle) * (12 + Math.cos(t * 4 + i) * 2);
      ctx.beginPath();
      ctx.arc(px, py, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = i % 2 === 0 ? '#ba68c8' : '#00e5ff';
      ctx.fill();
    }

    // 5. Floating prompt label
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e1bee7';
    ctx.fillText(`✦ ${T('Dimensional Tear', 'ui')}`, sx, sy - 26);

    ctx.restore();
  }

  function drawIncursionHud(ctx, incursion, viewW = 832, viewH = 576, now = Date.now()) {
    if (!ctx || !incursion) return;

    const boxW = 280;
    const boxH = 38;
    const bx = Math.round((viewW - boxW) / 2);
    const by = 12;

    ctx.save();

    // Background Card
    ctx.fillStyle = 'rgba(18, 12, 34, 0.90)';
    ctx.fillRect(bx, by, boxW, boxH);
    ctx.strokeStyle = 'rgba(186, 104, 200, 0.7)';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, boxW, boxH);

    // Text Header
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';

    const waveLabel = incursion.currentWave >= 3
      ? T('Wave 3/3 — HERALD', 'ui')
      : T('Wave {w}/3', 'ui').replace('{w}', incursion.currentWave || 1);

    const mutIcon = incursion.mutator?.icon || '⚡';
    ctx.fillText(`${mutIcon} ${T('Dimensional Incursion', 'ui')} · ${waveLabel}`, bx + 10, by + 16);

    // Timer Countdown
    const secsLeft = Math.max(0, Math.ceil((incursion.timeRemainingMs || 0) / 1000));
    ctx.textAlign = 'right';
    ctx.fillStyle = secsLeft <= 15 ? '#ff5252' : '#e1bee7';
    ctx.fillText(`${secsLeft}s`, bx + boxW - 10, by + 16);

    // Countdown Progress Bar
    const totalDurationMs = 90000;
    const ratio = Math.max(0, Math.min(1, (incursion.timeRemainingMs || 0) / totalDurationMs));
    const barW = boxW - 20;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(bx + 10, by + 24, barW, 4);

    ctx.fillStyle = secsLeft <= 15 ? '#ff5252' : '#00e5ff';
    ctx.fillRect(bx + 10, by + 24, Math.round(barW * ratio), 4);

    ctx.restore();
  }

  return {
    drawRiftTear,
    drawIncursionHud,
  };
}
