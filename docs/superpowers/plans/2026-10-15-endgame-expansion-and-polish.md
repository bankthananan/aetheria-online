# Endgame Raid, Hybrid VFX/Audio, Codex Expansion & Visual Verification Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the endgame ecosystem for *Aetheria Online* by adding the 4th World Boss Raid ("System Architect" in Glitched Monolith), specialized VFX and synthesized Web Audio SFX for all 9 Tier IV Hybrid Ultimate skills, Codex and Guild Stronghold trophy integration, and automated in-browser visual verification.

---

## Architecture & Interfaces

### 1. Endgame World Boss Raid: The System Architect (`js/systems/raids.js`, `js/content.js`)
- **Boss Catalog Registration**: Register `system_architect` in `WORLD_BOSS_CATALOG` with:
  - `id: 'system_architect'`, `name: 'System Architect'`, `zone: 'glitched_monolith'`, `element: 'void'`.
  - `maxHp: 48000`, `atk: 125`, `def: 55`.
  - `breakThresholdHp: 0.60`, `enrageThresholdHp: 0.30`, `breakShieldHp: 12000`, `breakTimerMs: 35000`.
  - `staggerDurationMs: 8000`, `staggerVulnerabilityMult: 1.50`.
  - `signatureMechanics: ['kernel_panic', 'null_pointer_beam', 'runtime_collapse']`.
  - `addsPool: ['debug_drone', 'memory_phantom']`.
  - `apexTrophy: 'kernel_core'`.
- **Items & Crafting**:
  - `kernel_core`: Legendary raid trophy material (`CONTENT.items`).
  - `architect_omnikey`: Legendary accessory granting +20 All Stats, +35 ATK, +35 MATK.
  - Blacksmith recipe `r_architect_omnikey` in `CONTENT.recipes`.
  - Pixel art icon registrations in `ITEM_ICON` (`js/pixelart.js`).
- **Bilingual Localization**:
  - Full English and Thai translations in `js/locale.js`.
- **Raid Mechanics & Tests**:
  - Multi-phase break-shield testing in `js/raids.test.js` and `js/raids-integration.test.js`.

### 2. Tier IV Hybrid Ultimate Audio & VFX Suite (`js/audio.js`, `js/render/combat-fx.js`)
- **Particle & Visual FX** (`js/render/combat-fx.js`):
  - Dedicated visual renderers for all 9 signature hybrid ultimates:
    - `eclipse_strike`: Radial umbral moonburst & violet blade waves.
    - `apocalypse_harvest`: Nether scythe crescent sweep with circling soul wraiths.
    - `orbital_strike_beacon`: Dual-ring quantum targeting reticle followed by kinetic pillar beam.
    - `colossal_onslaught`: Earth-shattering golden ground shockwaves.
    - `elemental_strike`: Tri-elemental flame/frost/arc pulse.
    - `arcane_arrow_barrage`: Multi-stream celestial arrow convergence.
    - `phalanx`: Golden aegis shield barrier projection.
    - `cyclone_lotus_kick`: Swirling jade wind and blossom petals.
    - `tempest_sanctuary`: Crackling lightning perimeter field.
  - Strict zero camera shake guarantee.
- **Audio Synthesizer & SFX** (`js/audio.js`):
  - Web Audio API procedural synthesis triggers for hybrid skill impacts (`playSfx('eclipse_strike')`, `playSfx('apocalypse_harvest')`, `playSfx('orbital_strike')`).
  - Safe headless fallback (no Web Audio crashes in Node test environments).
- **Tests**:
  - `js/combat-fx.test.js` and `js/audio.test.js`.

### 3. Codex & Stronghold Trophy Room Expansion (`js/systems/stronghold.js`, `js/content.js`)
- **Guild Stronghold Trophy Pedestal**:
  - Add `System Architect Kernel Pedestal` in `STRONGHOLD_FACILITIES.trophy_hall.pedestals`.
  - Channels permanent account-wide aura: `+10 All Stats, +15 MATK`.
- **Bestiary & Collection Codex**:
  - Ensure all 3 new classes, Band 6 monsters, and new items have proper Codex entries and milestone rewards.
- **Tests**:
  - `js/stronghold.test.js` and `js/stronghold-ui.test.js`.

### 4. In-Browser Visual Verification & Zero Regression Run
- **Headless Browser Visual Playtest**:
  - Serve game locally and use Puppeteer MCP to capture `index.html` runtime, open Character Status (`C`) and Abilities (`K`) panels, and verify pixel-perfect rendering without console errors.
- **Full Suite Verification**:
  - Execute `npm test` across all 105+ suites.

---

## Planned Tasks Breakdown

- [ ] **Task 1: System Architect World Boss Raid & Loot**
  - Files: `js/systems/raids.js`, `js/content.js`, `js/pixelart.js`, `js/locale.js`, `js/raids.test.js`, `js/raids-integration.test.js`
- [ ] **Task 2: Tier IV Hybrid Ultimate Audio & VFX Suite**
  - Files: `js/render/combat-fx.js`, `js/audio.js`, `js/game.js`, `js/combat-fx.test.js`, `js/audio.test.js`
- [ ] **Task 3: Guild Stronghold Trophy & Codex Expansion**
  - Files: `js/content.js`, `js/game.js`, `js/locale.js`, `js/stronghold-ui.test.js`, `js/stronghold.test.js`
- [ ] **Task 4: In-Browser Visual Playtest & Full Regression Verification**
  - Files: all, headless visual run, `npm test`
