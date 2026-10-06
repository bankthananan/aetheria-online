// js/render/weather-fx.js - 16-Bit Ambient Weather Particle Renderer.
// Strictly 0 screen shake. Renders crisp retro rain streaks, snowflakes, ash embers,
// mist bands, and celestial motes within the viewport bounds.

export function createWeatherRenderer({
  getCtx,
  now = () => performance.now(),
  prefersReducedMotion = () => false,
  CANVAS_W = 832,
  CANVAS_H = 576,
} = {}) {
  const MAX_PARTICLES = 60;
  const particles = [];

  // Seed initial particles
  function initParticles() {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      particles.push({
        x: Math.random() * CANVAS_W,
        y: Math.random() * CANVAS_H,
        speedX: 0,
        speedY: 0,
        size: 1 + (i % 2),
        phase: Math.random() * Math.PI * 2,
        kind: 'generic',
      });
    }
  }
  initParticles();

  function drawWeather(mapId, weather) {
    if (!weather || weather.id === 'clear') return;
    const ctx = getCtx();
    if (!ctx) return;

    const reduced = prefersReducedMotion();
    const count = reduced ? Math.floor(MAX_PARTICLES * 0.4) : MAX_PARTICLES;
    const t = now() / 1000;

    ctx.save();

    switch (weather.id) {
      case 'verdant_rain': {
        // Fast diagonal rain streaks
        ctx.strokeStyle = 'rgba(175, 220, 255, 0.45)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < count; i++) {
          const speedY = reduced ? 300 : 550;
          const speedX = reduced ? 80 : 160;
          const px = (particles[i].x + t * speedX) % CANVAS_W;
          const py = (particles[i].y + t * speedY) % CANVAS_H;
          ctx.moveTo(px, py);
          ctx.lineTo(px + 3, py + 11);
        }
        ctx.stroke();

        // Occasional soft ground splash ripples
        ctx.strokeStyle = 'rgba(175, 220, 255, 0.25)';
        for (let i = 0; i < Math.floor(count * 0.25); i++) {
          const rx = (particles[i * 4].x + t * 40) % CANVAS_W;
          const ry = (particles[i * 4].y + t * 60) % CANVAS_H;
          if (ry > CANVAS_H * 0.4) {
            ctx.beginPath();
            ctx.arc(rx, ry, 3, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
        break;
      }

      case 'whispering_mist': {
        // Soft drifting mist bands
        const mistCount = reduced ? 3 : 6;
        ctx.fillStyle = 'rgba(210, 235, 225, 0.12)';
        for (let i = 0; i < mistCount; i++) {
          const mx = ((i * 150) + t * (reduced ? 8 : 16)) % (CANVAS_W + 200) - 100;
          const my = (i * 90) % CANVAS_H;
          ctx.fillRect(mx, my, 260, 48);
        }
        break;
      }

      case 'biting_blizzard': {
        // Drifting snow flurries and wind streaks
        ctx.fillStyle = 'rgba(235, 248, 255, 0.75)';
        for (let i = 0; i < count; i++) {
          const speedX = reduced ? 100 : 220;
          const speedY = reduced ? 70 : 140;
          const drift = Math.sin(t * 2 + particles[i].phase) * 8;
          const sx = (particles[i].x + t * speedX + drift) % CANVAS_W;
          const sy = (particles[i].y + t * speedY) % CANVAS_H;
          const s = particles[i].size;
          ctx.fillRect(sx, sy, s, s);
        }

        // Fast wind gust streaks
        ctx.strokeStyle = 'rgba(220, 240, 255, 0.28)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < Math.floor(count * 0.2); i++) {
          const wx = (particles[i * 5].x + t * 380) % CANVAS_W;
          const wy = (particles[i * 5].y + t * 60) % CANVAS_H;
          ctx.moveTo(wx, wy);
          ctx.lineTo(wx + 22, wy + 4);
        }
        ctx.stroke();
        break;
      }

      case 'diamond_dust': {
        // Twinkling crystalline sparkles
        for (let i = 0; i < Math.floor(count * 0.65); i++) {
          const p = particles[i];
          const x = (p.x + t * 10) % CANVAS_W;
          const y = (p.y + Math.sin(t + p.phase) * 6) % CANVAS_H;
          const a = 0.3 + Math.abs(Math.sin(t * 3 + p.phase)) * 0.65;
          ctx.fillStyle = `rgba(225, 248, 255, ${a.toFixed(2)})`;
          ctx.fillRect(x, y, 2, 2);
        }
        break;
      }

      case 'ashfall': {
        // Dark ash flakes & glowing orange embers
        for (let i = 0; i < count; i++) {
          const p = particles[i];
          const sway = Math.sin(t * 1.5 + p.phase) * 12;
          const ax = (p.x + sway + CANVAS_W) % CANVAS_W;
          const ay = (p.y + t * (reduced ? 35 : 65)) % CANVAS_H;
          const isEmber = i % 3 === 0;
          ctx.fillStyle = isEmber ? 'rgba(255, 120, 35, 0.75)' : 'rgba(75, 65, 65, 0.65)';
          ctx.fillRect(ax, ay, p.size, p.size);
        }
        break;
      }

      case 'heatwave': {
        // Rising warm sparks & subtle heat haze
        ctx.fillStyle = 'rgba(255, 130, 30, 0.06)';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        for (let i = 0; i < Math.floor(count * 0.5); i++) {
          const p = particles[i];
          const riseX = (p.x + Math.sin(t * 2 + p.phase) * 14) % CANVAS_W;
          const riseY = CANVAS_H - ((p.y + t * (reduced ? 40 : 80)) % CANVAS_H);
          ctx.fillStyle = 'rgba(255, 175, 55, 0.60)';
          ctx.fillRect(riseX, riseY, 2, 2);
        }
        break;
      }

      case 'cosmic_eclipse': {
        // Soft violet nebula vignette & drifting void motes
        ctx.fillStyle = 'rgba(55, 20, 80, 0.08)';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        for (let i = 0; i < Math.floor(count * 0.6); i++) {
          const p = particles[i];
          const vx = (p.x + Math.cos(t * 0.8 + p.phase) * 16) % CANVAS_W;
          const vy = (p.y + Math.sin(t * 0.8 + p.phase) * 16) % CANVAS_H;
          const a = 0.35 + Math.abs(Math.sin(t * 2 + p.phase)) * 0.55;
          ctx.fillStyle = `rgba(185, 130, 255, ${a.toFixed(2)})`;
          ctx.fillRect(vx, vy, 2, 3);
          ctx.fillRect(vx - 1, vy + 1, 4, 1);
        }
        break;
      }

      case 'stellar_drift': {
        // Falling starlight trails & astral glints
        ctx.strokeStyle = 'rgba(210, 230, 255, 0.40)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < Math.floor(count * 0.4); i++) {
          const p = particles[i];
          const sx = (p.x + t * 45) % CANVAS_W;
          const sy = (p.y + t * 120) % CANVAS_H;
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx + 2, sy + 7);
        }
        ctx.stroke();

        for (let i = 0; i < Math.floor(count * 0.4); i++) {
          const p = particles[i * 2];
          const gx = (p.x + t * 5) % CANVAS_W;
          const gy = (p.y + Math.sin(t + p.phase) * 5) % CANVAS_H;
          const a = 0.4 + Math.abs(Math.sin(t * 2.5 + p.phase)) * 0.55;
          ctx.fillStyle = `rgba(235, 245, 255, ${a.toFixed(2)})`;
          ctx.fillRect(gx, gy, 2, 2);
        }
        break;
      }

      default:
        break;
    }

    ctx.restore();
  }

  return {
    drawWeather,
  };
}
