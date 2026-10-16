// js/render/pets-fx.js
// Canvas 2D renderer and follower kinematics for Pet Familiars & Companions.
// Includes trailing spring physics, auto-loot dash suction particles, floating emotes,
// and procedural archetype sprites with STRICTLY ZERO screen shake.

export const PET_ARCHETYPE_COLORS = {
  pet_slime: '#66bb6a',
  pet_wolf: '#78909c',
  pet_sprite: '#ab47bc',
  pet_bear: '#cfd8dc',
  pet_dragon: '#e53935',
  pet_king_slime: '#81c784',
  pet_alpha_direwolf: '#90a4ae',
  pet_fae_queen: '#ba68c8',
  pet_armored_ursa: '#eceff1',
  pet_infernal_wyrm: '#ff5252',
};

/**
 * Creates a new follower entity object.
 */
export function createFollowerEntity(petId = 'pet_slime', startX = 0, startY = 0) {
  return {
    id: petId,
    x: startX,
    y: startY,
    facing: 'right',
    state: 'idle',
    t: 0,
    hopOffset: 0,
    dashTarget: null,
    dashProgress: 0,
    devoted: false,
    motes: [],
    emotes: [],
  };
}

/**
 * Updates follower kinematics, trailing positions, dash behavior, motes, and emotes.
 */
export function updateFollower(petEntity, playerPos, dt = 0.016) {
  if (!petEntity) return;

  petEntity.t += dt;

  if (playerPos) {
    // 1. Calculate trailing target based on player facing direction
    let targetX = playerPos.x;
    let targetY = playerPos.y;

    if (playerPos.facing === 'left') {
      targetX = playerPos.x + 32;
      targetY = playerPos.y + 4;
    } else if (playerPos.facing === 'right') {
      targetX = playerPos.x - 32;
      targetY = playerPos.y + 4;
    } else if (playerPos.facing === 'up') {
      targetX = playerPos.x;
      targetY = playerPos.y + 32;
    } else {
      // default / down
      targetX = playerPos.x;
      targetY = playerPos.y - 32;
    }

    // Teleport / Map warp check
    const distToTarget = Math.hypot(targetX - petEntity.x, targetY - petEntity.y);
    if (distToTarget > 300) {
      petEntity.x = targetX;
      petEntity.y = targetY;
    }

    // 2. Dash kinematics (Auto-loot vacuum sprint)
    if (petEntity.dashTarget) {
      const dx = petEntity.dashTarget.x - petEntity.x;
      const dy = petEntity.dashTarget.y - petEntity.y;
      const dashDist = Math.hypot(dx, dy);

      if (dashDist < 6) {
        // Reached target
        petEntity.x = petEntity.dashTarget.x;
        petEntity.y = petEntity.dashTarget.y;
        petEntity.hopOffset = -6; // celebratory hop
        if (!Array.isArray(petEntity.motes)) petEntity.motes = [];
        for (let i = 0; i < 5; i++) {
          petEntity.motes.push({
            x: petEntity.x + (Math.random() - 0.5) * 24,
            y: petEntity.y + (Math.random() - 0.5) * 24,
            targetX: petEntity.x,
            targetY: petEntity.y,
            t: 0,
            duration: 0.35 + Math.random() * 0.15,
            color: '#ffd54f',
          });
        }
        petEntity.dashTarget = null;
        petEntity.dashProgress = 0;
      } else {
        const speed = 280;
        const step = speed * dt;
        if (step >= dashDist) {
          petEntity.x = petEntity.dashTarget.x;
          petEntity.y = petEntity.dashTarget.y;
          petEntity.hopOffset = -6;
          if (!Array.isArray(petEntity.motes)) petEntity.motes = [];
          for (let i = 0; i < 5; i++) {
            petEntity.motes.push({
              x: petEntity.x + (Math.random() - 0.5) * 24,
              y: petEntity.y + (Math.random() - 0.5) * 24,
              targetX: petEntity.x,
              targetY: petEntity.y,
              t: 0,
              duration: 0.35 + Math.random() * 0.15,
              color: '#ffd54f',
            });
          }
          petEntity.dashTarget = null;
          petEntity.dashProgress = 0;
        } else {
          petEntity.x += (dx / dashDist) * step;
          petEntity.y += (dy / dashDist) * step;
          petEntity.facing = dx >= 0 ? 'right' : 'left';
          petEntity.state = 'moving';
          petEntity.hopOffset = Math.sin(petEntity.t * 16) * 3;
        }
      }
    } else {
      // 3. Normal follow kinematics
      const dx = targetX - petEntity.x;
      const dy = targetY - petEntity.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 16) {
        const speed = dist > 80 ? 200 : 120;
        const step = Math.min(speed * dt, dist);
        petEntity.x += (dx / dist) * step;
        petEntity.y += (dy / dist) * step;
        petEntity.facing = dx >= 0 ? 'right' : 'left';
        petEntity.state = 'moving';
        petEntity.hopOffset = Math.sin(petEntity.t * 12) * 3;
      } else {
        petEntity.state = 'idle';
        petEntity.hopOffset = Math.sin(petEntity.t * 4) * 2;
      }
    }
  }

  // 4. Update motes
  if (Array.isArray(petEntity.motes) && petEntity.motes.length > 0) {
    for (const mote of petEntity.motes) {
      mote.t += dt;
    }
    petEntity.motes = petEntity.motes.filter((m) => m.t < m.duration);
  }

  // 5. Update emotes
  if (Array.isArray(petEntity.emotes) && petEntity.emotes.length > 0) {
    for (const emote of petEntity.emotes) {
      emote.y += emote.vy * dt;
      emote.life += dt;
      emote.alpha = Math.max(0, 1 - emote.life / emote.maxLife);
    }
    petEntity.emotes = petEntity.emotes.filter((e) => e.life < e.maxLife);
  }
}

/**
 * Triggers an auto-loot sprint toward a target coordinate, spawning converging suction motes.
 */
export function triggerAutoLoot(petEntity, targetPos) {
  if (!petEntity || !targetPos) return;

  petEntity.dashTarget = { x: targetPos.x, y: targetPos.y };
  if (!Array.isArray(petEntity.motes)) petEntity.motes = [];

  for (let i = 0; i < 5; i++) {
    petEntity.motes.push({
      x: targetPos.x + (Math.random() - 0.5) * 24,
      y: targetPos.y + (Math.random() - 0.5) * 24,
      targetX: targetPos.x,
      targetY: targetPos.y,
      t: 0,
      duration: 0.35 + Math.random() * 0.15,
      color: '#ffd54f',
    });
  }
}

/**
 * Triggers a floating emote icon above the pet.
 */
export function triggerEmote(petEntity, emoteType = 'heart') {
  if (!petEntity) return;
  if (!Array.isArray(petEntity.emotes)) petEntity.emotes = [];

  const text = emoteType === 'heart' ? '♥' : (emoteType === 'devoted' ? '★' : '✦');
  const color = emoteType === 'heart' ? '#ff4081' : (emoteType === 'devoted' ? '#ffd54f' : '#80d8ff');

  petEntity.emotes.push({
    text,
    x: petEntity.x,
    y: petEntity.y - 12,
    vy: -18,
    alpha: 1.0,
    life: 0,
    maxLife: 1.2,
    color,
  });
}

/**
 * Renders procedural companion archetype sprites.
 */
function drawArchetypeSprite(ctx, petEntity, sx, sy) {
  const dir = petEntity.facing === 'left' ? -1 : 1;
  const id = petEntity.id;
  const baseId = id === 'pet_king_slime' ? 'pet_slime' :
                 id === 'pet_alpha_direwolf' ? 'pet_wolf' :
                 id === 'pet_fae_queen' ? 'pet_sprite' :
                 id === 'pet_armored_ursa' ? 'pet_bear' :
                 id === 'pet_infernal_wyrm' ? 'pet_dragon' : id;

  ctx.save();

  if (id !== baseId) {
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(sx, sy - 10, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  switch (baseId) {
    case 'pet_slime': {
      // Bouncy green droplet with shiny eye highlight and tiny blush
      ctx.fillStyle = '#66bb6a';
      ctx.beginPath();
      if (typeof ctx.ellipse === 'function') {
        ctx.ellipse(sx, sy, 8, 7, 0, 0, Math.PI * 2);
      } else {
        ctx.arc(sx, sy, 7.5, 0, Math.PI * 2);
      }
      ctx.fill();

      ctx.strokeStyle = '#43a047';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Shiny eye highlight
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(sx - 3 * dir, sy - 3, 2, 0, Math.PI * 2);
      ctx.fill();

      // Eyes
      ctx.fillStyle = '#1b5e20';
      ctx.beginPath();
      ctx.arc(sx + 2 * dir, sy - 1, 1.2, 0, Math.PI * 2);
      ctx.arc(sx + 5 * dir, sy - 1, 1.2, 0, Math.PI * 2);
      ctx.fill();

      // Blush
      ctx.fillStyle = '#ff80ab';
      ctx.beginPath();
      ctx.arc(sx + dir, sy + 2, 1.2, 0, Math.PI * 2);
      ctx.arc(sx + 6 * dir, sy + 2, 1.2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'pet_wolf': {
      // Grey quadrupede shape with perked ears and wagging tail
      ctx.fillStyle = '#78909c';
      ctx.beginPath();
      if (typeof ctx.ellipse === 'function') {
        ctx.ellipse(sx - 2 * dir, sy + 1, 8, 5, 0, 0, Math.PI * 2);
      } else {
        ctx.arc(sx - 2 * dir, sy + 1, 6, 0, Math.PI * 2);
      }
      ctx.fill();

      // Head
      ctx.beginPath();
      if (typeof ctx.ellipse === 'function') {
        ctx.ellipse(sx + 5 * dir, sy - 3, 5, 4.5, 0, 0, Math.PI * 2);
      } else {
        ctx.arc(sx + 5 * dir, sy - 3, 4.5, 0, Math.PI * 2);
      }
      ctx.fill();

      // Perked ears
      ctx.fillStyle = '#546e7a';
      ctx.beginPath();
      ctx.moveTo(sx + 3 * dir, sy - 6);
      ctx.lineTo(sx + 4 * dir, sy - 11);
      ctx.lineTo(sx + 6 * dir, sy - 6);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(sx + 6 * dir, sy - 5);
      ctx.lineTo(sx + 8 * dir, sy - 10);
      ctx.lineTo(sx + 9 * dir, sy - 5);
      ctx.closePath();
      ctx.fill();

      // Wagging tail
      ctx.strokeStyle = '#546e7a';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(sx - 9 * dir, sy);
      const tailWag = Math.sin(petEntity.t * 10) * 4;
      ctx.lineTo(sx - 14 * dir, sy - 4 + tailWag);
      ctx.stroke();

      // Snout / dark nose
      ctx.fillStyle = '#263238';
      ctx.beginPath();
      ctx.arc(sx + 9 * dir, sy - 2, 1.2, 0, Math.PI * 2);
      ctx.fill();

      // Eye
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(sx + 5 * dir, sy - 4, 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#263238';
      ctx.beginPath();
      ctx.arc(sx + 5 * dir, sy - 4, 0.7, 0, Math.PI * 2);
      ctx.fill();

      // Paws
      ctx.fillStyle = '#546e7a';
      ctx.beginPath();
      ctx.rect(sx - 6 * dir, sy + 5, 3, 3);
      ctx.rect(sx + 4 * dir, sy + 5, 3, 3);
      ctx.fill();
      break;
    }

    case 'pet_sprite': {
      // Glowing winged fairy wisp with oscillating wing paths
      ctx.fillStyle = 'rgba(206, 147, 216, 0.4)';
      ctx.beginPath();
      ctx.arc(sx, sy - 2, 8, 0, Math.PI * 2);
      ctx.fill();

      // Oscillating wings
      const wingFlap = Math.sin(petEntity.t * 18) * 3;
      ctx.fillStyle = 'rgba(225, 190, 231, 0.75)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 1;

      // Left wing
      ctx.beginPath();
      if (typeof ctx.ellipse === 'function') {
        ctx.ellipse(sx - 5 * dir, sy - 6, 6, 3, -0.3 + wingFlap * 0.08, 0, Math.PI * 2);
      } else {
        ctx.arc(sx - 5 * dir, sy - 6, 4, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.stroke();

      // Right wing
      ctx.beginPath();
      if (typeof ctx.ellipse === 'function') {
        ctx.ellipse(sx + 5 * dir, sy - 6, 6, 3, 0.3 - wingFlap * 0.08, 0, Math.PI * 2);
      } else {
        ctx.arc(sx + 5 * dir, sy - 6, 4, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.stroke();

      // Fairy wisp core
      ctx.fillStyle = '#ab47bc';
      ctx.beginPath();
      ctx.arc(sx, sy - 2, 5, 0, Math.PI * 2);
      ctx.fill();

      // Luminous inner center
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(sx + 1 * dir, sy - 3, 2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'pet_bear': {
      // Polar bear cub with round ears and dark nose
      ctx.fillStyle = '#cfd8dc';
      ctx.beginPath();
      if (typeof ctx.ellipse === 'function') {
        ctx.ellipse(sx, sy + 1, 9, 7, 0, 0, Math.PI * 2);
      } else {
        ctx.arc(sx, sy + 1, 7, 0, Math.PI * 2);
      }
      ctx.fill();

      // Cub head
      ctx.beginPath();
      if (typeof ctx.ellipse === 'function') {
        ctx.ellipse(sx + 5 * dir, sy - 3, 6, 5.5, 0, 0, Math.PI * 2);
      } else {
        ctx.arc(sx + 5 * dir, sy - 3, 5.5, 0, Math.PI * 2);
      }
      ctx.fill();

      // Round ears
      ctx.fillStyle = '#b0bec5';
      ctx.beginPath();
      ctx.arc(sx + 2 * dir, sy - 8, 2.8, 0, Math.PI * 2);
      ctx.arc(sx + 7 * dir, sy - 7.5, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Inner ear
      ctx.fillStyle = '#eceff1';
      ctx.beginPath();
      ctx.arc(sx + 2 * dir, sy - 8, 1.4, 0, Math.PI * 2);
      ctx.arc(sx + 7 * dir, sy - 7.5, 1.2, 0, Math.PI * 2);
      ctx.fill();

      // Dark button nose
      ctx.fillStyle = '#263238';
      ctx.beginPath();
      ctx.arc(sx + 9 * dir, sy - 2, 1.6, 0, Math.PI * 2);
      ctx.fill();

      // Eye
      ctx.beginPath();
      ctx.arc(sx + 5 * dir, sy - 4, 1.2, 0, Math.PI * 2);
      ctx.fill();

      // White eye specular
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(sx + 4.6 * dir, sy - 4.4, 0.6, 0, Math.PI * 2);
      ctx.fill();

      // Paws
      ctx.fillStyle = '#b0bec5';
      ctx.beginPath();
      ctx.arc(sx - 4 * dir, sy + 7, 2.5, 0, Math.PI * 2);
      ctx.arc(sx + 4 * dir, sy + 7, 2.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'pet_dragon': {
      // Crimson wyrmling with small folded wings and ember spark
      ctx.fillStyle = '#e53935';
      ctx.beginPath();
      if (typeof ctx.ellipse === 'function') {
        ctx.ellipse(sx, sy, 8, 6, 0, 0, Math.PI * 2);
      } else {
        ctx.arc(sx, sy, 6.5, 0, Math.PI * 2);
      }
      ctx.fill();

      // Head
      ctx.beginPath();
      if (typeof ctx.ellipse === 'function') {
        ctx.ellipse(sx + 6 * dir, sy - 4, 5.5, 4.5, 0, 0, Math.PI * 2);
      } else {
        ctx.arc(sx + 6 * dir, sy - 4, 5, 0, Math.PI * 2);
      }
      ctx.fill();

      // Horns
      ctx.fillStyle = '#b71c1c';
      ctx.beginPath();
      ctx.moveTo(sx + 3 * dir, sy - 7);
      ctx.lineTo(sx + 1 * dir, sy - 12);
      ctx.lineTo(sx + 5 * dir, sy - 8);
      ctx.closePath();
      ctx.fill();

      // Folded wings
      ctx.fillStyle = '#c62828';
      ctx.beginPath();
      const dragonFlap = Math.sin(petEntity.t * 8) * 2;
      ctx.moveTo(sx - 2 * dir, sy - 2);
      ctx.lineTo(sx - 7 * dir, sy - 9 + dragonFlap);
      ctx.lineTo(sx + 1 * dir, sy - 4);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#b71c1c';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Curved tail
      ctx.strokeStyle = '#e53935';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(sx - 7 * dir, sy + 1);
      ctx.quadraticCurveTo(sx - 12 * dir, sy - 1, sx - 11 * dir, sy - 6);
      ctx.stroke();

      // Eye
      ctx.fillStyle = '#ffd54f';
      ctx.beginPath();
      ctx.arc(sx + 6 * dir, sy - 5, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#263238';
      ctx.beginPath();
      ctx.rect(sx + 6 * dir - 0.4, sy - 6, 0.8, 2);
      ctx.fill();

      // Ember spark near mouth
      const emberPhase = petEntity.t * 6;
      const emberX = sx + 11 * dir + Math.sin(emberPhase) * 2;
      const emberY = sy - 4 + Math.cos(emberPhase) * 2;
      ctx.fillStyle = '#ffd54f';
      ctx.beginPath();
      ctx.arc(emberX, emberY, 1.4, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    default: {
      // Default fallback cute companion
      const baseColor = PET_ARCHETYPE_COLORS[id] || '#66bb6a';
      ctx.fillStyle = baseColor;
      ctx.beginPath();
      if (typeof ctx.ellipse === 'function') {
        ctx.ellipse(sx, sy, 8, 7, 0, 0, Math.PI * 2);
      } else {
        ctx.arc(sx, sy, 7.5, 0, Math.PI * 2);
      }
      ctx.fill();
      break;
    }
  }

  ctx.restore();
}

/**
 * Draws follower companion entity, ground shadow, devotion sparkles, vacuum particles, and emotes.
 * STRICT ZERO SCREEN SHAKE: Cam coordinates are NEVER mutated.
 */
export function drawFollower(ctx, petEntity, cam, now = Date.now(), viewW = 832, viewH = 576) {
  if (!ctx || !petEntity || !cam) return;

  // IMPORTANT: NEVER modify cam.x or cam.y (Strict ZERO screen shake).
  const sx = Math.round(petEntity.x - cam.x);
  const sy = Math.round(petEntity.y - cam.y + (petEntity.hopOffset || 0));

  // Offscreen culling: skip if outside viewport with 40px margin
  if (sx < -40 || sx > viewW + 40 || sy < -40 || sy > viewH + 40) {
    return;
  }

  // 1. Draw soft drop shadow beneath companion
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  if (typeof ctx.ellipse === 'function') {
    ctx.ellipse(sx, Math.round(petEntity.y - cam.y) + 7, 7, 3, 0, 0, Math.PI * 2);
  } else {
    ctx.arc(sx, Math.round(petEntity.y - cam.y) + 7, 5, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.restore();

  // 2. Draw companion procedural archetype sprite
  drawArchetypeSprite(ctx, petEntity, sx, sy);

  // 3. Devoted gold aura sparkles
  if (petEntity.devoted) {
    ctx.save();
    ctx.fillStyle = '#ffd54f';
    for (let i = 0; i < 3; i++) {
      const angle = (petEntity.t * 3) + (i * (Math.PI * 2 / 3));
      const sparkX = sx + Math.cos(angle) * 14;
      const sparkY = sy + Math.sin(angle) * 8 - 2;
      const sparkR = 1.5 + Math.sin(petEntity.t * 8 + i) * 0.5;
      ctx.beginPath();
      ctx.arc(sparkX, sparkY, Math.max(0.5, sparkR), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 4. Suction motes (converging inward particle lines)
  if (Array.isArray(petEntity.motes) && petEntity.motes.length > 0) {
    ctx.save();
    const petScreenX = Math.round(petEntity.x - cam.x);
    const petScreenY = Math.round(petEntity.y - cam.y);

    for (const mote of petEntity.motes) {
      const p = Math.min(1, Math.max(0, mote.t / (mote.duration || 0.4)));
      const curX = mote.x + (mote.targetX - mote.x) * p;
      const curY = mote.y + (mote.targetY - mote.y) * p;
      const mx = Math.round(curX - cam.x);
      const my = Math.round(curY - cam.y);

      ctx.save();
      ctx.strokeStyle = mote.color || '#ffd54f';
      ctx.fillStyle = mote.color || '#ffd54f';
      ctx.lineWidth = 1.5;
      if (typeof ctx.globalAlpha !== 'undefined') {
        ctx.globalAlpha = Math.max(0, 1 - p);
      }

      ctx.beginPath();
      ctx.moveTo(mx, my);
      const dx = petScreenX - mx;
      const dy = petScreenY - my;
      const len = Math.hypot(dx, dy);
      if (len > 0.1) {
        const streakLen = Math.min(6, len);
        ctx.lineTo(mx + (dx / len) * streakLen, my + (dy / len) * streakLen);
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(mx, my, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  // 5. Floating emotes
  if (Array.isArray(petEntity.emotes) && petEntity.emotes.length > 0) {
    ctx.save();
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';

    for (const emote of petEntity.emotes) {
      const ex = Math.round(emote.x - cam.x);
      const ey = Math.round(emote.y - cam.y);
      if (typeof ctx.globalAlpha !== 'undefined') {
        ctx.globalAlpha = Math.max(0, Math.min(1, emote.alpha));
      }
      ctx.fillStyle = emote.color || '#ff4081';
      ctx.fillText(emote.text, ex, ey);
    }
    ctx.restore();
  }
}

/**
 * Factory creating the pets renderer instance.
 */
export function createPetsRenderer({ T = (s) => s, PX = null } = {}) {
  return {
    createFollowerEntity,
    updateFollower,
    triggerAutoLoot,
    triggerEmote,
    drawFollower,
  };
}
