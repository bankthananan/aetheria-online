// js/render/homestead-fx.js
// Canvas 2D Visual Effects, Crop Growth Stages, Roaming Pasture Pets,
// Hearth Fire Embers & Zero-Shake Renderer for Adventurer's Homestead.
// Part of Module 3: The Sovereign Realm expansion.

export function createHomesteadRenderer({ T = (s) => s, PX = null } = {}) {
  const particles = [];
  let internalTime = 0;

  /**
   * Spawns floating heart particles at world coordinates.
   */
  function triggerPetHearts(x, y, count = 5) {
    for (let i = 0; i < count; i++) {
      particles.push({
        type: 'heart',
        x: (x || 0) + (Math.random() - 0.5) * 20,
        y: (y || 0) - 10 + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 15,
        vy: -20 - Math.random() * 25,
        life: 1.0,
        maxLife: 1.0,
        size: 10 + Math.random() * 4,
        color: '#ff4081',
      });
    }
  }

  /**
   * Spawns crop bloom pollen/sparkle particles.
   */
  function spawnBloomSparkles(x, y, color = '#ffd54f', count = 2) {
    for (let i = 0; i < count; i++) {
      particles.push({
        type: 'pollen',
        x: (x || 0) + (Math.random() - 0.5) * 24,
        y: (y || 0) + (Math.random() - 0.5) * 16,
        vx: (Math.random() - 0.5) * 10,
        vy: -10 - Math.random() * 15,
        life: 0.8 + Math.random() * 0.4,
        maxLife: 1.2,
        size: 2 + Math.random() * 2,
        color,
      });
    }
  }

  /**
   * Spawns rising hearth embers and chimney motes.
   */
  function spawnHearthEmbers(x, y, count = 2) {
    for (let i = 0; i < count; i++) {
      particles.push({
        type: 'ember',
        x: (x || 0) + 16 + (Math.random() - 0.5) * 14,
        y: (y || 0) + 16 + (Math.random() - 0.5) * 6,
        vx: (Math.random() - 0.5) * 8,
        vy: -25 - Math.random() * 30,
        life: 0.9 + Math.random() * 0.6,
        maxLife: 1.5,
        size: 1.5 + Math.random() * 2,
        color: Math.random() > 0.4 ? '#ff7043' : '#ffb74d',
      });
    }
  }

  /**
   * Updates particle physics and lifetimes.
   */
  function updateFx(dt) {
    const deltaSec = Math.max(0, (Number(dt) || 16) / 1000);
    internalTime += deltaSec;

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * deltaSec;
      p.y += p.vy * deltaSec;
      p.life -= deltaSec;
      if (p.life <= 0) {
        particles.splice(i, 1);
      }
    }
  }

  /**
   * Renders the 6 Botanical Sanctum crop plots.
   */
  function drawCropPlots(ctx, plots = [], cam, now = Date.now(), viewW = 832, viewH = 576) {
    if (!ctx || !cam || !Array.isArray(plots) || plots.length === 0) return;

    for (const plot of plots) {
      if (!plot) continue;
      const px = plot.x ?? 0;
      const py = plot.y ?? 0;
      const sx = Math.round(px - cam.x);
      const sy = Math.round(py - cam.y);

      // Offscreen culling: skip plots outside viewport bounds
      if (sx < -48 || sx > viewW + 48 || sy < -48 || sy > viewH + 48) {
        continue;
      }

      ctx.save();

      // 1. Base furrowed tilled soil mound (32x32)
      ctx.fillStyle = plot.watered ? '#3e2723' : '#5d4037';
      ctx.fillRect(sx, sy, 32, 32);

      // Furrow ridge lines
      ctx.strokeStyle = plot.watered ? '#271711' : '#4e342e';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sx + 4, sy + 8);
      ctx.lineTo(sx + 28, sy + 8);
      ctx.moveTo(sx + 4, sy + 16);
      ctx.lineTo(sx + 28, sy + 16);
      ctx.moveTo(sx + 4, sy + 24);
      ctx.lineTo(sx + 28, sy + 24);
      ctx.stroke();

      // Water sheen / droplets
      if (plot.watered) {
        ctx.fillStyle = 'rgba(129, 212, 250, 0.45)';
        ctx.fillRect(sx + 6, sy + 6, 3, 2);
        ctx.fillRect(sx + 22, sy + 14, 3, 2);
        ctx.fillRect(sx + 10, sy + 22, 2, 2);
      }

      // 2. Growth Stage Visuals
      const stage = plot.stage ?? 0;
      const cropId = plot.cropId;

      if (stage === 1) {
        // Stage 1: SEEDLING (Small bright green sprout)
        ctx.fillStyle = '#81c784';
        ctx.strokeStyle = '#4caf50';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sx + 16, sy + 26);
        ctx.lineTo(sx + 16, sy + 18);
        ctx.stroke();
        // Tiny sprout leaves
        ctx.beginPath();
        ctx.arc(sx + 13, sy + 18, 2.5, 0, Math.PI * 2);
        ctx.arc(sx + 19, sy + 18, 2.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (stage === 2) {
        // Stage 2: VEGETATIVE (Budding foliage)
        ctx.fillStyle = '#388e3c';
        ctx.strokeStyle = '#2e7d32';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(sx + 16, sy + 28);
        ctx.lineTo(sx + 16, sy + 14);
        ctx.stroke();
        // Leaf cluster
        ctx.beginPath();
        ctx.arc(sx + 11, sy + 15, 3.5, 0, Math.PI * 2);
        ctx.arc(sx + 21, sy + 15, 3.5, 0, Math.PI * 2);
        ctx.arc(sx + 16, sy + 11, 4, 0, Math.PI * 2);
        ctx.fill();
      } else if (stage === 3) {
        // Stage 3: MATURE (Blooming Flora & Harvest Indicator)
        let bloomColor = '#e0e0e0';
        let accentColor = '#ffffff';

        if (cropId === 'seed_golden_wheat') {
          bloomColor = '#ffd54f';
          accentColor = '#ffb300';
        } else if (cropId === 'seed_moonflower') {
          bloomColor = '#80d8ff';
          accentColor = '#b388ff';
        } else if (cropId === 'seed_ember_blossom') {
          bloomColor = '#ff5722';
          accentColor = '#ff7043';
        } else {
          // seed_silverleaf
          bloomColor = '#cfd8dc';
          accentColor = '#ffffff';
        }

        // Stem
        ctx.strokeStyle = '#2e7d32';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(sx + 16, sy + 28);
        ctx.lineTo(sx + 16, sy + 12);
        ctx.stroke();

        // Bloom petals / Wheat heads
        ctx.fillStyle = bloomColor;
        ctx.beginPath();
        ctx.arc(sx + 16, sy + 10, 5, 0, Math.PI * 2);
        ctx.arc(sx + 11, sy + 10, 3.5, 0, Math.PI * 2);
        ctx.arc(sx + 21, sy + 10, 3.5, 0, Math.PI * 2);
        ctx.arc(sx + 16, sy + 6, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Bloom Core
        ctx.fillStyle = accentColor;
        ctx.beginPath();
        ctx.arc(sx + 16, sy + 10, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Pulsating harvest sparkle halo
        const haloAlpha = 0.35 + Math.sin(now * 0.005 + (plot.id || 0)) * 0.25;
        ctx.strokeStyle = `rgba(255, 235, 59, ${haloAlpha.toFixed(2)})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(sx + 16, sy + 10, 8, 0, Math.PI * 2);
        ctx.stroke();

        // Spawn occasional bloom sparkles
        if (Math.random() < 0.05) {
          spawnBloomSparkles(px + 16, py + 10, bloomColor, 1);
        }
      }

      ctx.restore();
    }

    // Render floating pollen particles if any
    const activePollen = particles.filter(p => p.type === 'pollen');
    if (activePollen.length > 0) {
      ctx.save();
      for (const p of activePollen) {
        const sx = Math.round(p.x - cam.x);
        const sy = Math.round(p.y - cam.y);
        if (sx < -20 || sx > viewW + 20 || sy < -20 || sy > viewH + 20) continue;
        const alpha = Math.max(0, p.life / p.maxLife);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color || '#ffd54f';
        ctx.beginPath();
        ctx.arc(sx, sy, p.size || 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  /**
   * Renders familiars wandering inside the Companion Pasture.
   */
  function drawPasturePets(ctx, roamingPets = [], cam, now = Date.now(), viewW = 832, viewH = 576) {
    if (!ctx || !cam || !Array.isArray(roamingPets) || roamingPets.length === 0) return;

    for (const pet of roamingPets) {
      if (!pet) continue;
      const px = pet.x ?? 0;
      const py = pet.y ?? 0;
      const sx = Math.round(px - cam.x);
      const sy = Math.round(py - cam.y);

      // Offscreen culling
      if (sx < -48 || sx > viewW + 48 || sy < -48 || sy > viewH + 48) {
        continue;
      }

      ctx.save();

      // Gentle vertical bobbing
      const bob = Math.sin(now * 0.003 + (px * 0.1)) * 2;
      const drawY = sy + bob;

      // Soft shadow ellipse beneath pet
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.beginPath();
      if (typeof ctx.ellipse === 'function') {
        ctx.ellipse(sx + 16, sy + 28, 10, 4, 0, 0, Math.PI * 2);
      } else {
        ctx.arc(sx + 16, sy + 28, 6, 0, Math.PI * 2);
      }
      ctx.fill();

      // Draw stylized companion avatar
      const petId = String(pet.id || '').toLowerCase();
      let bodyColor = '#4caf50'; // Slime green fallback

      if (petId.includes('wolf')) bodyColor = '#78909c';
      else if (petId.includes('sprite') || petId.includes('fairy')) bodyColor = '#ba68c8';
      else if (petId.includes('bear')) bodyColor = '#8d6e63';
      else if (petId.includes('dragon') || petId.includes('drake')) bodyColor = '#ef5350';
      else if (petId.includes('slime')) bodyColor = '#26a69a';

      // Companion body dome / circle
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.arc(sx + 16, drawY + 18, 9, 0, Math.PI * 2);
      ctx.fill();

      // Companion eyes
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(sx + 13, drawY + 16, 2, 2);
      ctx.fillRect(sx + 17, drawY + 16, 2, 2);

      // Loyal companion indicator heart
      if ((pet.loyalty || 0) >= 40) {
        ctx.fillStyle = '#ff4081';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('♥', sx + 16, drawY + 7);
      }

      ctx.restore();
    }

    // Render floating pet hearts if any
    const activeHearts = particles.filter(p => p.type === 'heart');
    if (activeHearts.length > 0) {
      ctx.save();
      for (const p of activeHearts) {
        const sx = Math.round(p.x - cam.x);
        const sy = Math.round(p.y - cam.y);
        if (sx < -20 || sx > viewW + 20 || sy < -20 || sy > viewH + 20) continue;
        const alpha = Math.max(0, p.life / p.maxLife);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color || '#ff4081';
        ctx.font = `bold ${Math.round(p.size)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('♥', sx, sy);
      }
      ctx.restore();
    }
  }

  /**
   * Renders the Cozy Hearth fireplace warmth and crackling flames.
   */
  function drawHearthFire(ctx, hearth, cam, now = Date.now(), viewW = 832, viewH = 576) {
    if (!ctx || !hearth || !cam) return;

    const hx = hearth.x ?? 0;
    const hy = hearth.y ?? 0;
    const sx = Math.round(hx - cam.x);
    const sy = Math.round(hy - cam.y);

    // Offscreen culling
    if (sx < -64 || sx > viewW + 64 || sy < -64 || sy > viewH + 64) {
      return;
    }

    ctx.save();

    // 1. Ambient warmth radial glow
    const cx = sx + 16;
    const cy = sy + 16;
    const pulseRadius = 40 + Math.sin(now * 0.004) * 6;
    const warmthGrad = ctx.createRadialGradient(cx, cy, 4, cx, cy, pulseRadius);
    warmthGrad.addColorStop(0, 'rgba(255, 179, 0, 0.32)');
    warmthGrad.addColorStop(0.6, 'rgba(255, 87, 34, 0.12)');
    warmthGrad.addColorStop(1, 'rgba(255, 87, 34, 0)');
    ctx.fillStyle = warmthGrad;
    ctx.fillRect(cx - pulseRadius, cy - pulseRadius, pulseRadius * 2, pulseRadius * 2);

    // 2. Stone fireplace mantle base (32x32)
    ctx.fillStyle = '#424242';
    ctx.fillRect(sx, sy, 32, 32);

    // Hearth fire pit opening
    ctx.fillStyle = '#212121';
    ctx.fillRect(sx + 6, sy + 10, 20, 20);

    // 3. Crackling flames
    const flameFlicker = Math.sin(now * 0.015) * 3;
    ctx.fillStyle = '#ff5722';
    ctx.beginPath();
    ctx.moveTo(sx + 8, sy + 28);
    ctx.lineTo(sx + 16, sy + 12 + flameFlicker);
    ctx.lineTo(sx + 24, sy + 28);
    ctx.closePath();
    ctx.fill();

    // Inner yellow flame
    ctx.fillStyle = '#ffeb3b';
    ctx.beginPath();
    ctx.moveTo(sx + 11, sy + 28);
    ctx.lineTo(sx + 16, sy + 16 + flameFlicker);
    ctx.lineTo(sx + 21, sy + 28);
    ctx.closePath();
    ctx.fill();

    // Spawn embers occasionally
    if (Math.random() < 0.25) {
      spawnHearthEmbers(hx, hy, 1);
    }

    ctx.restore();

    // Render rising fireplace embers if any
    const activeEmbers = particles.filter(p => p.type === 'ember');
    if (activeEmbers.length > 0) {
      ctx.save();
      for (const p of activeEmbers) {
        const esx = Math.round(p.x - cam.x);
        const esy = Math.round(p.y - cam.y);
        if (esx < -20 || esx > viewW + 20 || esy < -20 || esy > viewH + 20) continue;
        const alpha = Math.max(0, p.life / p.maxLife);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color || '#ff7043';
        ctx.beginPath();
        ctx.arc(esx, esy, p.size || 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  /**
   * Renders Armory Mannequins display stands and equipped gear previews.
   */
  function drawMannequins(ctx, mannequins = [], cam, now = Date.now(), viewW = 832, viewH = 576) {
    if (!ctx || !cam || !Array.isArray(mannequins) || mannequins.length === 0) return;

    for (const man of mannequins) {
      if (!man) continue;
      const mx = man.x ?? 0;
      const my = man.y ?? 0;
      const sx = Math.round(mx - cam.x);
      const sy = Math.round(my - cam.y);

      // Offscreen culling
      if (sx < -48 || sx > viewW + 48 || sy < -48 || sy > viewH + 48) {
        continue;
      }

      ctx.save();

      // Wooden base pedestal
      ctx.fillStyle = '#8d6e63';
      ctx.fillRect(sx + 8, sy + 26, 16, 5);

      // Vertical stand pole
      ctx.fillStyle = '#6d4c41';
      ctx.fillRect(sx + 15, sy + 10, 3, 16);

      // Shoulder crossbar
      ctx.fillStyle = '#8d6e63';
      ctx.fillRect(sx + 8, sy + 12, 16, 4);

      // Head knob / dummy head
      ctx.fillStyle = '#d7ccc8';
      ctx.beginPath();
      ctx.arc(sx + 16, sy + 8, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Equipment previews if loaded
      const loadout = man.loadout || {};
      if (loadout.head) {
        ctx.fillStyle = '#78909c';
        ctx.fillRect(sx + 12, sy + 4, 8, 5);
      }
      if (loadout.body) {
        ctx.fillStyle = '#546e7a';
        ctx.fillRect(sx + 10, sy + 14, 12, 10);
      }
      if (loadout.weapon) {
        ctx.strokeStyle = '#cfd8dc';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sx + 24, sy + 8);
        ctx.lineTo(sx + 24, sy + 26);
        ctx.stroke();
      }

      // Small plaque / label
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      const label = man.id === 'mannequin_b' ? 'Mannequin B' : 'Mannequin A';
      ctx.fillText(label, sx + 16, sy + 38);

      ctx.restore();
    }
  }

  return {
    drawCropPlots,
    drawPasturePets,
    drawHearthFire,
    drawMannequins,
    triggerPetHearts,
    updateFx,
  };
}
