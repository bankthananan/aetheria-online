// js/render/gathering-fx.js
// Canvas 2D renderer for Open-World Resource Gathering & 1-Tap Fishing Mini-Game.
// Renders sparkling herb blossoms, faceted mineral clusters, concentric water ripple spots,
// and the retro fishing timing HUD bar with strictly ZERO screen shake.

const HERB_PALETTES = {
  moonlight_lotus: '#ce93d8', // violet-silver with starlight shimmer
  ember_blossom: '#ff7043',   // orange-red ember glow
  frost_lily: '#80d8ff',       // cyan-white glacial frost
  sunken_kelp: '#4db6ac',      // teal marine kelp
  silverleaf: '#a5d6a7',       // pale mint silver
};

const ORE_PALETTES = {
  copper_ore: '#ffb74d',
  iron_vein: '#90a4ae',
  caldera_crystal: '#ff4081',
  voidstone_ore: '#7e57c2',
  pyrite_ore: '#ffd54f',
  silicon_crystal: '#4fc3f7',
};

export function createGatheringRenderer({ T = (s) => s } = {}) {
  /**
   * Draws gathering nodes (herbs, ores, water ripples) on the world canvas.
   * STRICT ZERO SCREEN SHAKE: Camera cam coordinates are strictly immutable.
   */
  function drawGatherNodes(ctx, nodes, cam, now = Date.now(), viewW = 832, viewH = 576) {
    if (!ctx || !nodes || !cam) return;

    const t = now / 1000;

    for (const node of nodes) {
      if (!node) continue;

      const sx = Math.round(node.x - cam.x);
      const sy = Math.round(node.y - cam.y);

      // Offscreen culling: skip if outside viewport with 40px margin
      if (sx < -40 || sx > viewW + 40 || sy < -40 || sy > viewH + 40) {
        continue;
      }

      // If harvested or on cooldown, render subtle depleted marker and continue
      if (node.harvested || (node.cooldownRemainingMs && node.cooldownRemainingMs > 0)) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(sx, sy, 3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(120, 120, 120, 0.3)';
        ctx.fill();
        ctx.restore();
        continue;
      }

      ctx.save();

      if (node.type === 'herb') {
        const herbColor = HERB_PALETTES[node.resourceId] || '#a5d6a7';

        // 1. Stem
        ctx.beginPath();
        ctx.strokeStyle = '#4caf50';
        ctx.lineWidth = 1.5;
        ctx.moveTo(sx, sy + 6);
        ctx.quadraticCurveTo(sx + Math.sin(t * 2) * 2, sy, sx, sy - 2);
        ctx.stroke();

        // 2. Blooming petals (4 petals oscillating with time)
        const petalCount = 4;
        const petalSway = Math.sin(t * 3) * 0.2;
        const petalR = 3.5 + Math.sin(t * 2.5) * 0.5;
        for (let i = 0; i < petalCount; i++) {
          const angle = petalSway + (i * Math.PI * 2) / petalCount;
          const px = sx + Math.cos(angle) * 4;
          const py = (sy - 2) + Math.sin(angle) * 4;
          ctx.beginPath();
          ctx.arc(px, py, petalR, 0, Math.PI * 2);
          ctx.fillStyle = herbColor;
          ctx.fill();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }

        // Flower center pistil
        ctx.beginPath();
        ctx.arc(sx, sy - 2, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#fff9c4';
        ctx.fill();

        // 3. Gentle hovering spark particles
        const sparkCount = 3;
        for (let i = 0; i < sparkCount; i++) {
          const sparkAngle = (t * 1.8) + (i * Math.PI * 2) / sparkCount;
          const dist = 7 + Math.sin(t * 3 + i) * 2;
          const spx = sx + Math.cos(sparkAngle) * dist;
          const spy = (sy - 4) + Math.sin(sparkAngle) * (dist * 0.6);
          ctx.beginPath();
          ctx.arc(spx, spy, 1.2, 0, Math.PI * 2);
          ctx.fillStyle = herbColor;
          ctx.fill();
        }

        // 4. Floating label
        const herbName = node.resourceName || node.resourceId || 'Herb';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = herbColor;
        ctx.fillText(`✦ ${T(herbName, 'items')}`, sx, sy - 14);

      } else if (node.type === 'ore') {
        const oreColor = ORE_PALETTES[node.resourceId] || '#b0bec5';

        // 1. Rocky mineral cluster base
        ctx.beginPath();
        ctx.moveTo(sx - 8, sy + 6);
        ctx.lineTo(sx - 10, sy);
        ctx.lineTo(sx - 4, sy - 8);
        ctx.lineTo(sx + 5, sy - 7);
        ctx.lineTo(sx + 9, sy + 1);
        ctx.lineTo(sx + 5, sy + 7);
        ctx.closePath();
        ctx.fillStyle = oreColor;
        ctx.fill();
        ctx.strokeStyle = '#263238';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // 2. Secondary shading facet
        ctx.beginPath();
        ctx.moveTo(sx - 4, sy - 8);
        ctx.lineTo(sx, sy);
        ctx.lineTo(sx - 4, sy + 5);
        ctx.lineTo(sx - 10, sy);
        ctx.closePath();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.fill();

        // 3. Gleaming highlight facet
        const gleam = 0.4 + 0.4 * Math.sin(t * 3.5);
        ctx.beginPath();
        ctx.moveTo(sx - 4, sy - 8);
        ctx.lineTo(sx + 4, sy - 6);
        ctx.lineTo(sx, sy);
        ctx.closePath();
        ctx.fillStyle = `rgba(255, 255, 255, ${gleam.toFixed(2)})`;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // 4. Floating label
        const oreName = node.resourceName || node.resourceId || 'Ore';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = oreColor;
        ctx.fillText(`⛏ ${T(oreName, 'items')}`, sx, sy - 14);

      } else if (node.type === 'water_ripple') {
        // 2 Expanding concentric rings oscillating with (now % 2000) / 2000
        const rippleProgress = (now % 2000) / 2000;
        ctx.strokeStyle = 'rgba(129, 212, 250, 0.7)';
        ctx.lineWidth = 1.5;

        for (let i = 0; i < 2; i++) {
          const p = (rippleProgress + i * 0.5) % 1;
          const rx = 4 + p * 16;
          const ry = rx * 0.5;
          ctx.beginPath();
          if (typeof ctx.ellipse === 'function') {
            ctx.ellipse(sx, sy, rx, ry, 0, 0, Math.PI * 2);
          } else {
            ctx.arc(sx, sy, rx, 0, Math.PI * 2);
          }
          ctx.stroke();
        }

        // Floating label
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#81d4fa';
        ctx.fillText(`🎣 ${T('Fishing Spot', 'ui')}`, sx, sy - 14);
      }

      ctx.restore();
    }
  }

  /**
   * Draws the active fishing reaction timing bar HUD at the bottom-center of the screen.
   * STRICT ZERO SCREEN SHAKE: Screen-space coordinates only, zero camera trauma.
   */
  function drawFishingHud(ctx, fishingState, viewW = 832, viewH = 576, now = Date.now()) {
    if (!ctx || !fishingState || !fishingState.active) return;

    const boxW = 240;
    const boxH = 34;
    const bx = Math.round((viewW - boxW) / 2);
    const by = viewH - 120;

    ctx.save();

    // 1. Backing frame
    ctx.fillStyle = 'rgba(18, 14, 28, 0.92)';
    ctx.fillRect(bx, by, boxW, boxH);
    ctx.strokeStyle = '#ffd54f';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, boxW, boxH);

    // 2. Water track inside
    const x0 = bx + 8;
    const trackW = boxW - 16;
    const y0 = by + 6;
    const trackH = boxH - 12;

    ctx.fillStyle = 'rgba(13, 71, 161, 0.75)';
    ctx.fillRect(x0, y0, trackW, trackH);

    // 3. Green sweet-spot zone
    const sweetMin = fishingState.sweetMin ?? 0.35;
    const sweetMax = fishingState.sweetMax ?? 0.65;
    const sStart = x0 + sweetMin * trackW;
    const sEnd = x0 + sweetMax * trackW;
    const sWidth = Math.max(0, sEnd - sStart);

    ctx.fillStyle = 'rgba(102, 187, 106, 0.85)';
    ctx.fillRect(sStart, y0, sWidth, trackH);
    ctx.strokeStyle = '#a5d6a7';
    ctx.lineWidth = 1;
    ctx.strokeRect(sStart, y0, sWidth, trackH);

    // 4. Needle indicator
    const needleNorm = fishingState.needle ?? 0.5;
    const nx = x0 + needleNorm * trackW;
    ctx.fillStyle = '#ffeb3b';
    ctx.fillRect(Math.round(nx - 2), y0 - 2, 4, trackH + 4);

    // 5. Prompt text
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`🎣 ${T('Reel In! [SPACE / TAP]', 'ui')}`, bx + Math.round(boxW / 2), by - 6);

    ctx.restore();
  }

  return {
    drawGatherNodes,
    drawFishingHud,
  };
}
