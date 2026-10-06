# Dynamic World Weather & Elemental Affinities System Design Specification

## Overview

The **Dynamic World Weather & Elemental Affinities System** introduces real-time, cyclical environmental weather conditions across the biomes of Aetheria Online. Weather changes dynamically over time, altering the atmospheric visual backdrop with retro 16-bit canvas particles and providing tactical elemental combat synergies (amplifying specific elements, enhancing status effects, or altering combat pacing).

---

## 1. Design Goals & Principles

1. **Environmental Immersion:** Transform static biomes into living, breathing environments through dynamic atmospheric cycles.
2. **Elemental Synergy:** Reward smart build adaptation and skill selection (e.g., casting Lightning in a Verdant Downpour, or unleashing Fire during a Solar Flare).
3. **Strict Zero Screen Shake:** Camera shake is strictly 0% engine-wide. Weather effects use smooth, low-impact canvas particles and subtle ambient color tinting without visual jarring or motion discomfort.
4. **Zero-Build ES Module Architecture:** Clean modular design with dedicated modules `js/systems/weather.js` and `js/render/weather-fx.js`.
5. **Surface & Save Stability:** Preserve all 255 keys on `window.__AWO` and maintain full backward compatibility with `awo_save_v1`.

---

## 2. Weather Catalog & Biome Distribution

| ID | Name | Icon | Biomes | Combat & Elemental Affinities | Visual Ambient FX |
|:---|:---|:---|:---|:---|:---|
| `clear` | **Clear Skies** | ☀️ | All Zones | Baseline standard attributes. | Normal biome atmosphere. |
| `verdant_rain` | **Verdant Downpour** | 🌧️ | Whispering Woods, Sunken Ruins | **Nature & Lightning damage +20%**; Shock/Static status duration +1.5s; Chain Lightning arcs +1 extra target. | Crisp diagonal rain lines + surface ripples. |
| `whispering_mist` | **Whispering Mist** | 🌫️ | Whispering Woods, Sunken Ruins | **Player Evasion +15**; Monster aggro detection range reduced by 25%; Holy damage +15%. | Soft drifting mist patches. |
| `biting_blizzard` | **Biting Blizzard** | ❄️ | Frostpeak Tundra | **Ice damage +25%**; Freeze/Slow duration +1.0s; Monster move speed chilled by -10%. | Drifting snow flurries and wind streaks. |
| `diamond_dust` | **Diamond Dust** | ✨ | Frostpeak Tundra | **Critical Hit Chance +10%**; Ice skill MP cost reduced by 20%; Magic ATK +10%. | Glistening crystalline pixel sparkles. |
| `ashfall` | **Volcanic Ashfall** | 🌋 | Dragon Caldera | **Fire damage +25%**; Burn tick damage increased by +30%; Physical DEF -10% for all combatants due to sweltering heat. | Drifting embers and dark ash flakes. |
| `heatwave` | **Solar Flare** | 🔥 | Dragon Caldera | **Fire damage +30%**; Attacks have 20% chance to ignite target with Burn; Ice damage -15%. | Shimmering warm heat haze and rising sparks. |
| `cosmic_eclipse` | **Cosmic Eclipse** | 🌑 | Astral Rift, Celestial Rift | **Void & Holy damage +25%**; Rare monster spawn rate doubled (2×); Monster EXP +15%. | Violet cosmic nebulae and drifting void motes. |
| `stellar_drift` | **Stellar Drift** | 🌌 | Astral Rift, Celestial Rift | **Out-of-combat HP/MP regen doubled (+100%)**; Critical Damage multiplier +20%. | Falling starlight trails and astral glints. |

---

## 3. Subsystem Architecture

### `js/systems/weather.js`
A self-contained system managing weather state, duration timers, weather roll per map, and modifier queries:

```js
export function createWeatherSystem({
  now = () => performance.now(),
  rnd = Math.random,
  cycleDurationMs = 180000, // 3 minutes per weather cycle
} = {})
```

#### API Methods:
- `getWeather(mapId)`: Returns current active weather object `{ id, name, icon, desc, affinities, ... }`.
- `update(dt, mapId)`: Advances weather timer; transitions to next weather when cycle expires.
- `getAffinityMultiplier(element, mapId)`: Returns damage multiplier (e.g., 1.20 for lightning during `verdant_rain`).
- `getCombatModifiers(mapId)`: Returns active combat stat modifications (e.g. `{ fleeFlat: 15, critPct: 10, ... }`).
- `getAggroRangeMult(mapId)`: Returns monster aggro range multiplier (e.g. 0.75 during `whispering_mist`).
- `setWeatherOverride(mapId, weatherId)`: Manual override for admin testing or script events.

---

## 4. Visual Rendering Architecture (`js/render/weather-fx.js`)

Canvas layer that renders retro 16-bit ambient particles:

```js
export function createWeatherRenderer({
  getCtx,
  now = () => performance.now(),
  prefersReducedMotion = () => false,
  CANVAS_W = 832,
  CANVAS_H = 576,
})
```

- **Particles:**
  - Rain: Fast diagonal blue/cyan lines (`rgba(150, 220, 255, 0.45)`).
  - Blizzard: Horizontal/diagonal white & light blue snowflake pixels drifting with wind oscillation.
  - Ashfall: Dark gray and red/orange flakes drifting downward and swaying slightly.
  - Mist / Nebula: Wide soft translucent bands drifting horizontally.
  - Sparkles / Stars: Single-pixel twinkling glints with sine-wave alpha pulsing.
- **Performance & Constraints:**
  - Strict particle cap (max 60 active particles).
  - Image smoothing disabled (`imageSmoothingEnabled = false`) for authentic pixel art aesthetic.
  - Respects `prefersReducedMotion()` by reducing particle velocity and count.
  - **Zero screen shake** guaranteed.

---

## 5. UI Integration

- **Minimap Weather Chip:**
  - Located directly above or next to the minimap area (`#minimap-weather`).
  - Displays weather icon + weather name + active affinity badge:
    `[🌧️ Verdant Downpour · +20% 🌿⚡]`
  - Clicking or hovering displays a tooltip explaining weather mechanics and active buffs.
- **Admin Tool:**
  - Added to admin panel: dropdown to instantly cycle and test any weather condition in real time.

---

## 6. Combat Integration ([`js/game.js`](file:///Users/thanananasanthia/Desktop/personal/game-rpg/js/game.js))

- **`applyElement(attackEl, m, dmg)`:**
  Integrate `weatherSystem.getAffinityMultiplier(attackEl, G.mapId)` into element damage scaling.
- **`recompute(p)`:**
  Include weather stat buffs (`fleeFlat`, `critPct`, `magicAtk`, etc.) from `weatherSystem.getCombatModifiers(G.mapId)`.
- **Monster Aggro:**
  Multiply `aggroTiles` by `weatherSystem.getAggroRangeMult(G.mapId)`.
- **Save State:**
  Persist `G.weather` safely; default to map standard if missing in legacy saves.

---

## 7. Verification Plan

1. **Unit Tests (`js/weather.test.js`)**:
   - Verify weather cycling and deterministic timers.
   - Verify affinity multiplier queries for matching vs non-matching elements.
   - Verify combat modifier outputs per weather state.
2. **Integration Test (`js/weather-integration.test.js`)**:
   - Verify `applyElement` damage scaling under different active weathers.
   - Verify minimap weather badge updates when map or weather shifts.
   - Verify admin override functions cleanly.
3. **Regression Tests**:
   - Run `node js/engine-surface.test.js` to confirm all 255 keys preserved and render fingerprints intact.
   - Run `npm test` to confirm 100% passing across all test suites.
