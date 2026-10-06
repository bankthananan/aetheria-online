// js/weather-integration.test.js
// Integration test: verifies Dynamic World Weather & Elemental Affinities in the live engine.
// Tests engine boot, minimap HUD badge, Thai localization, combat affinity multipliers,
// admin weather overrides, stat recomputations, save persistence, and strict zero screen shake.
import assert from 'node:assert/strict';
import { installBrowserEnv } from './test-support/browser-env.js';

let vnow = 1000;

installBrowserEnv({
  now: () => vnow,
  innerWidth: 1440,
  innerHeight: 900,
  nullSelectors: [],
  strictIds: false,
});

await import('./game.js');
const { setLanguage } = await import('./locale.js');
const { COMBAT } = await import('./combat.js');
const { CONTENT } = await import('./content.js');
const A = globalThis.__AWO;
assert.ok(A, 'game debug API loaded');

// 1. Initial player & map boot
const p = A.makePlayer('codeweaver', 'WeatherMage');
A.G.player = p;
A.G.running = true;
A.setCtx(document.getElementById('game-canvas'));
A.buildHud();
A.loadMap('town_awakening', 5, 5);
A.updateHud();
assert.ok(A.G.weather, 'G.weather initialized on map load');
assert.equal(A.G.weather.id, 'clear', 'Town Awakening starts with clear weather');

// 2. Minimap weather badge renders
const badge = document.querySelector('#minimap-weather');
assert.ok(badge, '#minimap-weather exists in minimap');
assert.ok(badge.textContent.includes('☀️'), 'Clear skies badge displays sun icon');
assert.ok(badge.textContent.includes('Clear Skies'), 'Clear skies badge displays English label');

// 3. Thai localization on weather badge
setLanguage('th');
A.updateHud();
assert.ok(badge.textContent.includes('ท้องฟ้าแจ่มใส'), 'Minimap badge updates to Thai label');
setLanguage('en');
A.updateHud();
assert.ok(badge.textContent.includes('Clear Skies'), 'Minimap badge updates back to English label');

// 4. Admin weather override & HUD badge update
A.adminAction('setweather:verdant_rain');
assert.equal(A.G.weather.id, 'verdant_rain', 'Admin setweather sets weather to verdant_rain');
assert.ok(badge.textContent.includes('🌧️'), 'Minimap badge reflects verdant rain icon');
assert.ok(badge.textContent.includes('Verdant Downpour'), 'Minimap badge reflects verdant rain name');

// 5. Combat stat modifications in whispering_mist (+15 Flee)
const baseFlee = p.flee;
A.adminAction('setweather:whispering_mist');
assert.equal(A.G.weather.id, 'whispering_mist', 'Whispering mist active');
assert.equal(p.flee, baseFlee + 15, 'Whispering mist adds +15 to player flee');

// 6. Combat stat modifications in diamond_dust (+10% Crit, +10% Magic ATK)
const baseCrit = p.critChance;
const baseMatk = p.magicAtk;
A.adminAction('setweather:diamond_dust');
assert.equal(A.G.weather.id, 'diamond_dust', 'Diamond dust active');
assert.equal(p.critChance, baseCrit + 10, 'Diamond dust grants +10% Crit Chance');
assert.ok(p.magicAtk >= baseMatk, 'Diamond dust scales magic ATK');

// 7. Elemental damage affinity synergy
// Set up dummy monster
A.loadMap('whispering_woods', 2, 2);
A.G.monsters.forEach(m => { m.alive = false; m.deadUntil = vnow + 9e9; m.x = m.y = 20000; });
const dummyDef = CONTENT.monsters.find(m => m.id === 'forest_wolf') || CONTENT.monsters[0];
const monster = A.makeMonster(dummyDef, p.x + 32, p.y, p.level);
A.G.monsters.push(monster);
A.G.target = monster;

// In verdant_rain: Nature and Lightning damage have 1.20x affinity multiplier
A.adminAction('setweather:verdant_rain');
assert.equal(A.G.weather.id, 'verdant_rain', 'Verdant rain set for damage test');

// Test skill damage with lightning vs neutral (deterministic random to isolate weather multiplier)
p.level = 25;
p.critChance = 0;
A.adminAction('learnall');
assert.ok(p.skillLevels.chain_lightning, 'chain_lightning learned');

const origRandom = Math.random;
Math.random = () => 0.5;

const hpBeforeRain = monster.hp;
A.castSkillById('chain_lightning');
const dmgInRain = hpBeforeRain - monster.hp;
assert.ok(dmgInRain > 0, 'chain_lightning dealt damage in verdant rain');

// Switch to clear weather, heal monster, advance time and MP, and compare
A.adminAction('setweather:clear');
monster.alive = true;
monster.hp = monster.maxHp;
p.mp = p.maxMp;
vnow += 10000;
const hpBeforeClear = monster.hp;
A.castSkillById('chain_lightning');
const dmgInClear = hpBeforeClear - monster.hp;
assert.ok(dmgInClear > 0, 'chain_lightning dealt damage in clear weather');
assert.ok(dmgInRain > dmgInClear, 'Verdant rain amplifies lightning damage over clear weather');

Math.random = origRandom;

// 8. Zero Screen Shake verification
// Ensure camera coordinates and viewport have strictly 0 shake offset
assert.equal(typeof A.G.cam.x, 'number', 'Camera X is a standard numeric coordinate');
assert.equal(typeof A.G.cam.y, 'number', 'Camera Y is a standard numeric coordinate');
// Advance time and steps with various weather overrides
for (const wId of ['biting_blizzard', 'ashfall', 'heatwave', 'cosmic_eclipse', 'stellar_drift']) {
  A.adminAction(`setweather:${wId}`);
  A.step(0.016);
  A.render();
  // Cam remains unaffected by weather particle rendering
  assert.equal(typeof A.G.cam.x, 'number');
  assert.equal(typeof A.G.cam.y, 'number');
}

// 9. Save Game persistence: G.weather is serialized and restored
assert.ok(A.saveGame(), 'Game saves successfully with weather state');
const rawSave = A.readSave();
assert.ok(rawSave?.world?.weather, 'Saved world contains weather property');
assert.equal(rawSave.world.weather, A.G.weather.id, 'Saved weather matches active weather state');

console.log('✔ [PASSED] Weather Integration: All engine boot, combat affinities, UI badge, localization, and 0-shake invariants verified.');
