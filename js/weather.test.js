import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createWeatherSystem, WEATHER_CATALOG } from './systems/weather.js';

test('weather: catalog defines all expected conditions with icons and metadata', () => {
  const expected = [
    'clear',
    'verdant_rain',
    'whispering_mist',
    'biting_blizzard',
    'diamond_dust',
    'ashfall',
    'heatwave',
    'cosmic_eclipse',
    'stellar_drift',
  ];
  for (const id of expected) {
    assert.ok(WEATHER_CATALOG[id], `Weather ${id} exists in catalog`);
    assert.ok(WEATHER_CATALOG[id].name, `Weather ${id} has a name`);
    assert.ok(WEATHER_CATALOG[id].icon, `Weather ${id} has an icon`);
  }
});

test('weather: returns clear for default/town maps and biome-appropriate weather', () => {
  const sys = createWeatherSystem();
  const townWeather = sys.getWeather('town_awakening');
  assert.equal(townWeather.id, 'clear');

  const woodsWeather = sys.getWeather('whispering_woods');
  assert.ok(['clear', 'verdant_rain', 'whispering_mist'].includes(woodsWeather.id));

  const tundraWeather = sys.getWeather('frostpeak_tundra');
  assert.ok(['clear', 'biting_blizzard', 'diamond_dust'].includes(tundraWeather.id));

  const calderaWeather = sys.getWeather('dragon_caldera');
  assert.ok(['clear', 'ashfall', 'heatwave'].includes(calderaWeather.id));

  const astralWeather = sys.getWeather('astral_rift');
  assert.ok(['clear', 'cosmic_eclipse', 'stellar_drift'].includes(astralWeather.id));
});

test('weather: manual override sets weather and resets cycle', () => {
  const sys = createWeatherSystem();
  sys.setWeatherOverride('whispering_woods', 'verdant_rain');
  assert.equal(sys.getWeather('whispering_woods').id, 'verdant_rain');

  sys.setWeatherOverride('frostpeak_tundra', 'biting_blizzard');
  assert.equal(sys.getWeather('frostpeak_tundra').id, 'biting_blizzard');
});

test('weather: elemental affinity multiplier scales damage correctly', () => {
  const sys = createWeatherSystem();

  // Verdant Rain: Nature and Lightning +20%
  sys.setWeatherOverride('whispering_woods', 'verdant_rain');
  assert.equal(sys.getAffinityMultiplier('nature', 'whispering_woods'), 1.20);
  assert.equal(sys.getAffinityMultiplier('lightning', 'whispering_woods'), 1.20);
  assert.equal(sys.getAffinityMultiplier('fire', 'whispering_woods'), 1.0);

  // Biting Blizzard: Ice +25%
  sys.setWeatherOverride('frostpeak_tundra', 'biting_blizzard');
  assert.equal(sys.getAffinityMultiplier('ice', 'frostpeak_tundra'), 1.25);
  assert.equal(sys.getAffinityMultiplier('fire', 'frostpeak_tundra'), 1.0);

  // Volcanic Ashfall: Fire +25%
  sys.setWeatherOverride('dragon_caldera', 'ashfall');
  assert.equal(sys.getAffinityMultiplier('fire', 'dragon_caldera'), 1.25);

  // Solar Flare (Heatwave): Fire +30%, Ice -15%
  sys.setWeatherOverride('dragon_caldera', 'heatwave');
  assert.equal(sys.getAffinityMultiplier('fire', 'dragon_caldera'), 1.30);
  assert.equal(sys.getAffinityMultiplier('ice', 'dragon_caldera'), 0.85);

  // Cosmic Eclipse: Void & Holy +25%
  sys.setWeatherOverride('astral_rift', 'cosmic_eclipse');
  assert.equal(sys.getAffinityMultiplier('void', 'astral_rift'), 1.25);
  assert.equal(sys.getAffinityMultiplier('holy', 'astral_rift'), 1.25);
  assert.equal(sys.getAffinityMultiplier('physical', 'astral_rift'), 1.0);
});

test('weather: combat modifiers and aggro range scaling', () => {
  const sys = createWeatherSystem();

  // Whispering Mist: Flee +15, Holy +15%, Aggro range -25%
  sys.setWeatherOverride('whispering_woods', 'whispering_mist');
  const mistMods = sys.getCombatModifiers('whispering_woods');
  assert.equal(mistMods.fleeFlat, 15);
  assert.equal(sys.getAggroRangeMult('whispering_woods'), 0.75);

  // Diamond Dust: Crit +10%, MP cost 0.8
  sys.setWeatherOverride('frostpeak_tundra', 'diamond_dust');
  const ddMods = sys.getCombatModifiers('frostpeak_tundra');
  assert.equal(ddMods.critPct, 10);
  assert.equal(ddMods.mpCostMult, 0.8);
  assert.equal(sys.getAggroRangeMult('frostpeak_tundra'), 1.0);

  // Ashfall: DEF -10%
  sys.setWeatherOverride('dragon_caldera', 'ashfall');
  const ashMods = sys.getCombatModifiers('dragon_caldera');
  assert.equal(ashMods.defPct, -10);

  // Stellar Drift: Regen x2
  sys.setWeatherOverride('astral_rift', 'stellar_drift');
  const sdMods = sys.getCombatModifiers('astral_rift');
  assert.equal(sdMods.regenMult, 2.0);
});

test('weather: time progression advances cycle and transitions weather', () => {
  let virtualNow = 0;
  let counter = 0;
  const sys = createWeatherSystem({
    now: () => virtualNow,
    cycleDurationMs: 10000,
    rnd: () => (counter++ % 2 === 0 ? 0.99 : 0.01),
  });

  const w1 = sys.getWeather('frostpeak_tundra');
  assert.ok(w1);

  // Advance time past cycle duration (10s)
  virtualNow += 11000;
  sys.update(11000, 'frostpeak_tundra');
  const w2 = sys.getWeather('frostpeak_tundra');
  assert.ok(w2);
});
