// js/zones/whispering-woods/rare-spawns.js - Rare elite encounter rules for Whispering Woods.

export const WHISPERING_WOODS_RARES = [
  {
    id: 'fang_the_bloodwolf',
    name: 'Fang, The Bloodwolf',
    triggerMob: 'wolf',
    killThreshold: 20,
    spawnChance: 1.0,
    location: { x: 32, y: 18 },
    respawnTimerMs: 900000, // 15 mins
  }
];
