// Combat tuning for the demo (levels 1-15). Numbers over abstractions.
// ponytail: flat data module, no factories — the game loop reads these fields directly.
export const COMBAT = {
  attackSpeedMs: 1000, // base delay between auto-attacks

  skills: [
    // --- blade: melee tank/dps hybrid ---
    { id: "rift_slash",    classId: "blade",     name: "Rift Slash",       flavor: "Cleave the seam between worlds.",              mpCost: 8,  cooldownMs: 3000,  type: "melee",  power: 1.9, range: 1, radius: 0, hotkey: "1", effect: null },
    { id: "guard_sigil",   classId: "blade",     name: "Guardian Sigil",   flavor: "A summoned crest hardens your skin.",          mpCost: 14, cooldownMs: 12000, type: "buff",   power: 1.0, range: 0, radius: 0, hotkey: "2", effect: null },
    { id: "shockwave",     classId: "blade",     name: "Shockwave",        flavor: "Slam the ground, stunning the horde.",         mpCost: 18, cooldownMs: 9000,  type: "aoe",    power: 1.5, range: 1, radius: 2, hotkey: "3", effect: "stun", detonate: 'stun' },

    // --- berserker: melee dps ---
    { id: "reckless_hew",  classId: "berserker", name: "Reckless Hew",     flavor: "All fury, no defense.",                        mpCost: 6,  cooldownMs: 2500,  type: "melee",  power: 2.3, range: 1, radius: 0, hotkey: "1", effect: null },
    { id: "blood_frenzy",  classId: "berserker", name: "Blood Frenzy",     flavor: "Isekai rage sharpens every strike.",           mpCost: 12, cooldownMs: 14000, type: "buff",   power: 1.0, range: 0, radius: 0, hotkey: "2", effect: null },
    { id: "whirl_reap",    classId: "berserker", name: "Whirlwind Reap",   flavor: "Spin through everything nearby.",              mpCost: 16, cooldownMs: 8000,  type: "aoe",    power: 1.8, range: 1, radius: 2, hotkey: "3", effect: null },

    // --- mage: ranged magic ---
    { id: "arcane_bolt",   classId: "mage",      name: "Arcane Bolt",      flavor: "A dart of translated mana.",                   mpCost: 7,  cooldownMs: 2000,  type: "ranged", power: 2.0, range: 6, radius: 0, hotkey: "1", effect: null },
    { id: "flame_burst",   classId: "mage",      name: "Flame Burst",      flavor: "Ignite a patch of the summoned battlefield.",  mpCost: 20, cooldownMs: 7000,  type: "aoe",    power: 1.9, range: 5, radius: 2, hotkey: "2", effect: "burn" },
    { id: "frost_chains",  classId: "mage",      name: "Frost Chains",     flavor: "Bind a foe in otherworldly ice.",              mpCost: 12, cooldownMs: 6000,  type: "ranged", power: 1.4, range: 5, radius: 0, hotkey: "3", effect: "slow" },

    // --- ranger: ranged physical ---
    { id: "piercing_shot", classId: "ranger",    name: "Piercing Shot",    flavor: "One arrow, straight through.",                 mpCost: 6,  cooldownMs: 2500,  type: "ranged", power: 2.1, range: 7, radius: 0, hotkey: "1", effect: null },
    { id: "hunters_mark",  classId: "ranger",    name: "Hunter's Mark",    flavor: "Read the beast's weak points.",                mpCost: 10, cooldownMs: 13000, type: "buff",   power: 1.0, range: 7, radius: 0, hotkey: "2", effect: "mark" },
    { id: "arrow_rain",    classId: "ranger",    name: "Arrow Rain",       flavor: "A volley falls from the summoned sky.",        mpCost: 18, cooldownMs: 9000,  type: "aoe",    power: 1.6, range: 6, radius: 2, hotkey: "3", effect: "slow" },

    // ===== TIER-2 / TIER-3 skills (unlocked by class advancement) =====
    // blade
    { id: "aegis_rend",    classId: "blade",     name: "Aegis Rend",       flavor: "A knight's cleave that shatters guard.",       mpCost: 22, cooldownMs: 6000,  type: "melee",  power: 2.7, range: 1, radius: 0, hotkey: "4", effect: "stun", finisher: true },
    { id: "world_cleaver", classId: "blade",     name: "World Cleaver",    flavor: "Split the battlefield in two.",                mpCost: 34, cooldownMs: 12000, type: "aoe",    power: 2.5, range: 1, radius: 3, hotkey: "5", effect: "stun", finisher: true },
    // berserker
    { id: "rampage",       classId: "berserker", name: "Rampage",          flavor: "Unchained fury, one devastating blow.",        mpCost: 20, cooldownMs: 5000,  type: "melee",  power: 3.0, range: 1, radius: 0, hotkey: "4", effect: null, finisher: true },
    { id: "apocalypse",    classId: "berserker", name: "Apocalypse Spin",  flavor: "A whirlwind that ends worlds.",                mpCost: 32, cooldownMs: 11000, type: "aoe",    power: 2.6, range: 1, radius: 3, hotkey: "5", effect: null, finisher: true },
    // mage
    { id: "meteor",        classId: "mage",      name: "Meteor",           flavor: "Call a burning star down from the code-sky.",  mpCost: 30, cooldownMs: 9000,  type: "aoe",    power: 2.8, range: 5, radius: 3, hotkey: "4", effect: "burn", finisher: true, detonate: 'burn' },
    { id: "arcane_nova",   classId: "mage",      name: "Arcane Nova",      flavor: "Detonate raw mana in a blinding ring.",        mpCost: 38, cooldownMs: 13000, type: "aoe",    power: 2.6, range: 4, radius: 3, hotkey: "5", effect: null, finisher: true },
    // ranger
    { id: "rapid_volley",  classId: "ranger",    name: "Rapid Volley",     flavor: "Five arrows before the first lands.",          mpCost: 20, cooldownMs: 5000,  type: "ranged", power: 2.7, range: 7, radius: 0, hotkey: "4", effect: null, finisher: true },
    { id: "star_fall",     classId: "ranger",    name: "Star Fall",        flavor: "Arrows fall like a meteor shower.",            mpCost: 32, cooldownMs: 11000, type: "aoe",    power: 2.4, range: 6, radius: 3, hotkey: "5", effect: "slow", finisher: true },

    // ===== Lightbringer / Paladin (melee + heal) =====
    { id: "smite",         classId: "paladin",   name: "Smite",            flavor: "Strike with a mote of dawnlight.",             mpCost: 8,  cooldownMs: 2500,  type: "melee",  power: 2.0, range: 1, radius: 0, hotkey: "1", effect: null },
    { id: "lay_on_hands",  classId: "paladin",   name: "Lay on Hands",     flavor: "Old first-aid instincts, now made holy.",      mpCost: 16, cooldownMs: 8000,  type: "heal",   power: 1.8, range: 0, radius: 0, hotkey: "2", effect: null },
    { id: "consecrate",    classId: "paladin",   name: "Consecrate",       flavor: "Hallow the ground; evil burns to stand on it.", mpCost: 18, cooldownMs: 7000,  type: "aoe",    power: 1.7, range: 1, radius: 2, hotkey: "3", effect: "burn" },
    { id: "holy_shield",   classId: "paladin",   name: "Holy Shield",      flavor: "A ward of light hardens your guard.",          mpCost: 14, cooldownMs: 12000, type: "buff",   power: 1.0, range: 0, radius: 0, hotkey: "4", effect: null },
    { id: "dawnbreaker",   classId: "paladin",   name: "Dawnbreaker",      flavor: "Bring the sunrise down on your foes.",         mpCost: 34, cooldownMs: 12000, type: "aoe",    power: 2.7, range: 1, radius: 3, hotkey: "5", effect: "stun", finisher: true },

    // ===== Tree-filler skills (more branches per class) — hotkey "6": assign via →Bar =====
    // blade
    { id: "sunder",         classId: "blade",     name: "Sunder",           flavor: "Split shield and bone in one stroke.",          mpCost: 10, cooldownMs: 3500,  type: "melee",  power: 2.4, range: 1, radius: 0, hotkey: "6", effect: "sunder" },
    { id: "bulwark",        classId: "blade",     name: "Bulwark",          flavor: "Plant your feet; become the wall.",             mpCost: 16, cooldownMs: 15000, type: "buff",   power: 1.0, range: 0, radius: 0, hotkey: "6", effect: null },
    { id: "quake",          classId: "blade",     name: "Quake",            flavor: "Crack the earth beneath the horde.",            mpCost: 20, cooldownMs: 8000,  type: "aoe",    power: 1.7, range: 1, radius: 2, hotkey: "6", effect: "stun" },
    { id: "titan_slam",     classId: "blade",     name: "Titan Slam",       flavor: "A blow that fells giants.",                     mpCost: 24, cooldownMs: 6000,  type: "melee",  power: 2.8, range: 1, radius: 0, hotkey: "6", effect: "stun", finisher: true },
    { id: "shield_bash",    classId: "blade",     name: "Shield Bash",      flavor: "Rift Knight training turns defense into impact.",mpCost: 14, cooldownMs: 4500,  type: "melee",  power: 2.2, range: 1, radius: 0, hotkey: "6", effect: "stun" },
    // berserker
    { id: "savage_leap",    classId: "berserker", name: "Savage Leap",      flavor: "Close the gap with a howl.",                    mpCost: 10, cooldownMs: 4000,  type: "melee",  power: 2.7, range: 4, radius: 0, hotkey: "6", effect: null },
    { id: "bloodlust",      classId: "berserker", name: "Bloodlust",        flavor: "The more you bleed, the harder you hit.",       mpCost: 14, cooldownMs: 14000, type: "buff",   power: 1.0, range: 0, radius: 0, hotkey: "6", effect: null },
    { id: "cleaving_storm", classId: "berserker", name: "Cleaving Storm",   flavor: "A tempest of steel in every direction.",        mpCost: 18, cooldownMs: 8000,  type: "aoe",    power: 2.2, range: 1, radius: 3, hotkey: "6", effect: null },
    { id: "decapitate",     classId: "berserker", name: "Decapitate",       flavor: "One clean cut ends the fight.",                 mpCost: 22, cooldownMs: 6000,  type: "melee",  power: 3.0, range: 1, radius: 0, hotkey: "6", effect: null, finisher: true },
    { id: "chain_hook",     classId: "berserker", name: "Chain Hook",       flavor: "Drag a fleeing enemy back into the dance.",     mpCost: 14, cooldownMs: 5000,  type: "ranged", power: 2.0, range: 5, radius: 0, hotkey: "6", effect: "slow" },
    // mage
    { id: "ice_lance",      classId: "mage",      name: "Ice Lance",        flavor: "A spear of frost, hurled true.",                mpCost: 10, cooldownMs: 3000,  type: "ranged", power: 2.2, range: 6, radius: 0, hotkey: "6", effect: "slow" },
    { id: "mana_shield",    classId: "mage",      name: "Mana Shield",      flavor: "Turn raw mana into a second skin.",             mpCost: 14, cooldownMs: 13000, type: "buff",   power: 1.0, range: 0, radius: 0, hotkey: "6", effect: null },
    { id: "chain_lightning",classId: "mage",      name: "Chain Lightning",  flavor: "One bolt, many corpses.",                       mpCost: 22, cooldownMs: 7000,  type: "aoe",    power: 2.0, range: 5, radius: 2, hotkey: "6", effect: null, detonate: 'slow' },
    { id: "prismatic_ray",  classId: "mage",      name: "Prismatic Ray",    flavor: "Split a burning rune into every colour of pain.",mpCost: 18, cooldownMs: 5000, type: "ranged", power: 2.4, range: 7, radius: 0, hotkey: "6", effect: null, detonate: 'burn' },
    { id: "blizzard",       classId: "mage",      name: "Blizzard",         flavor: "Bury the battlefield in killing cold.",         mpCost: 30, cooldownMs: 9000,  type: "aoe",    power: 2.6, range: 5, radius: 3, hotkey: "6", effect: "slow", finisher: true },
    // ranger
    { id: "twin_shot",      classId: "ranger",    name: "Twin Shot",        flavor: "Two arrows, one breath.",                       mpCost: 10, cooldownMs: 2500,  type: "ranged", power: 2.5, range: 7, radius: 0, hotkey: "6", effect: null },
    { id: "snare_trap",     classId: "ranger",    name: "Snare Trap",       flavor: "Pin your prey where it stands.",                mpCost: 10, cooldownMs: 6000,  type: "ranged", power: 1.4, range: 6, radius: 0, hotkey: "6", effect: "slow" },
    { id: "explosive_arrow",classId: "ranger",    name: "Explosive Arrow",  flavor: "An arrowhead packed with alchemist's fire.",    mpCost: 18, cooldownMs: 7000,  type: "aoe",    power: 1.8, range: 6, radius: 2, hotkey: "6", effect: "burn" },
    { id: "armor_piercer",  classId: "ranger",    name: "Armor Piercer",    flavor: "A Sky Piercer finds the seam in any plate.",     mpCost: 14, cooldownMs: 4500,  type: "ranged", power: 2.3, range: 8, radius: 0, hotkey: "6", effect: "sunder" },
    { id: "falcon_strike",  classId: "ranger",    name: "Falcon Strike",    flavor: "A shot that never knew a miss.",                mpCost: 22, cooldownMs: 5000,  type: "ranged", power: 2.7, range: 8, radius: 0, hotkey: "6", effect: null, finisher: true },
    // paladin
    { id: "righteous_strike",classId:"paladin",   name: "Righteous Strike", flavor: "Judgment delivered by hand.",                   mpCost: 10, cooldownMs: 3000,  type: "melee",  power: 2.4, range: 1, radius: 0, hotkey: "6", effect: null },
    { id: "blessing",       classId: "paladin",   name: "Blessing",         flavor: "Dawnlight sharpens your resolve.",              mpCost: 14, cooldownMs: 13000, type: "buff",   power: 1.0, range: 0, radius: 0, hotkey: "6", effect: null },
    { id: "sanctuary",      classId: "paladin",   name: "Sanctuary",        flavor: "Hallowed ground mends the faithful.",           mpCost: 22, cooldownMs: 10000, type: "heal",   power: 2.8, range: 0, radius: 0, hotkey: "6", effect: null },
    { id: "judgment_lance", classId: "paladin",   name: "Judgment Lance",   flavor: "The Dawnguard casts sunrise like a spear.",      mpCost: 16, cooldownMs: 5000,  type: "ranged", power: 2.3, range: 6, radius: 0, hotkey: "6", effect: "burn" },
    { id: "divine_wrath",   classId: "paladin",   name: "Divine Wrath",     flavor: "The heavens answer your call.",                 mpCost: 30, cooldownMs: 9000,  type: "aoe",    power: 2.6, range: 1, radius: 3, hotkey: "6", effect: "stun", finisher: true },

    // ===== Iron Fist (monk) — combo bruiser: builders feed stun-setups + detonating palms + finishers =====
    { id: "jab",            classId: "monk",      name: "Jab",              flavor: "Quick, cheap, endless.",                        mpCost: 5,  cooldownMs: 1800,  type: "melee",  power: 1.6, range: 1, radius: 0, hotkey: "1", effect: null },
    { id: "iron_guard",     classId: "monk",      name: "Iron Guard",       flavor: "Tense the body; turn skin to stone.",           mpCost: 12, cooldownMs: 12000, type: "buff",   power: 1.0, range: 0, radius: 0, hotkey: "2", effect: null },
    { id: "palm_strike",    classId: "monk",      name: "Palm Strike",      flavor: "A focused blow that rattles the skull.",        mpCost: 9,  cooldownMs: 4000,  type: "melee",  power: 1.8, range: 1, radius: 0, hotkey: "3", effect: "stun" },
    { id: "rising_dragon",  classId: "monk",      name: "Rising Dragon",    flavor: "An uppercut that lifts foes off their feet.",   mpCost: 18, cooldownMs: 6000,  type: "melee",  power: 2.8, range: 1, radius: 0, hotkey: "4", effect: "stun", finisher: true },
    { id: "hundred_fists",  classId: "monk",      name: "Hundred Fists",    flavor: "A blur of strikes on all sides.",               mpCost: 24, cooldownMs: 9000,  type: "aoe",    power: 2.4, range: 1, radius: 2, hotkey: "5", effect: null, finisher: true },
    { id: "roundhouse",     classId: "monk",      name: "Roundhouse",       flavor: "Sweep the circle clean.",                       mpCost: 14, cooldownMs: 7000,  type: "aoe",    power: 1.6, range: 1, radius: 1, hotkey: "6", effect: null },
    { id: "ki_barrier",     classId: "monk",      name: "Ki Barrier",       flavor: "Channel breath into a shell of force.",         mpCost: 14, cooldownMs: 13000, type: "buff",   power: 1.0, range: 0, radius: 0, hotkey: "6", effect: null },
    { id: "pressure_point", classId: "monk",      name: "Pressure Point",   flavor: "Strike the stunned nerve — it detonates.",      mpCost: 10, cooldownMs: 3500,  type: "melee",  power: 2.0, range: 1, radius: 0, hotkey: "6", effect: null, detonate: 'stun' },
    { id: "chi_burst",      classId: "monk",      name: "Chi Burst",        flavor: "The Ki Adept sends a focused pulse through armor.",mpCost: 14, cooldownMs: 5000, type: "ranged", power: 2.2, range: 5, radius: 0, hotkey: "6", effect: "stun" },
    { id: "dragon_kick",    classId: "monk",      name: "Dragon Kick",      flavor: "One kick to end the exchange.",                 mpCost: 22, cooldownMs: 5000,  type: "melee",  power: 3.0, range: 1, radius: 0, hotkey: "6", effect: null, finisher: true },

    // ===== Stormcaller (elementalist) — ranged status weaver: stack burn/slow/stun, then detonate =====
    { id: "spark",          classId: "elementalist", name: "Spark",         flavor: "A cheap, fast crackle of static.",              mpCost: 7,  cooldownMs: 2000,  type: "ranged", power: 1.9, range: 6, radius: 0, hotkey: "1", effect: null },
    { id: "ember",          classId: "elementalist", name: "Ember",         flavor: "A drifting coal that catches and burns.",       mpCost: 9,  cooldownMs: 3000,  type: "ranged", power: 1.7, range: 6, radius: 0, hotkey: "2", effect: "burn" },
    { id: "gale",           classId: "elementalist", name: "Gale",          flavor: "A biting wind that drags at the limbs.",        mpCost: 9,  cooldownMs: 3000,  type: "ranged", power: 1.6, range: 6, radius: 0, hotkey: "3", effect: "slow" },
    { id: "thunderstrike",  classId: "elementalist", name: "Thunderstrike", flavor: "Call lightning onto the slowed — it shatters.", mpCost: 26, cooldownMs: 8000,  type: "aoe",    power: 2.4, range: 5, radius: 2, hotkey: "4", effect: "stun", detonate: 'slow', finisher: true },
    { id: "inferno",        classId: "elementalist", name: "Inferno",       flavor: "Ignite the burning into a firestorm.",          mpCost: 30, cooldownMs: 9000,  type: "aoe",    power: 2.6, range: 5, radius: 3, hotkey: "5", effect: "burn", detonate: 'burn', finisher: true },
    { id: "frost_shard",    classId: "elementalist", name: "Frost Shard",   flavor: "A shard of ice that slows the blood.",          mpCost: 10, cooldownMs: 3000,  type: "ranged", power: 2.0, range: 6, radius: 0, hotkey: "6", effect: "slow" },
    { id: "storm_ward",     classId: "elementalist", name: "Storm Ward",    flavor: "A crackling barrier of charged air.",           mpCost: 14, cooldownMs: 13000, type: "buff",   power: 1.0, range: 0, radius: 0, hotkey: "6", effect: null },
    { id: "static_field",   classId: "elementalist", name: "Static Field",  flavor: "Charge the ground; it stuns what stands on it.", mpCost: 18, cooldownMs: 7000,  type: "aoe",    power: 1.8, range: 5, radius: 2, hotkey: "6", effect: "stun" },
    { id: "stone_spike",    classId: "elementalist", name: "Stone Spike",   flavor: "Tempest training teaches the storm to raise stone.",mpCost: 14, cooldownMs: 5000, type: "ranged", power: 2.2, range: 6, radius: 0, hotkey: "6", effect: "stun" },
    { id: "cataclysm",      classId: "elementalist", name: "Cataclysm",     flavor: "Detonate the stunned in a world-ending blast.", mpCost: 30, cooldownMs: 12000, type: "aoe",    power: 2.8, range: 4, radius: 3, hotkey: "6", effect: null, detonate: 'stun', finisher: true },

    // ===== new momentum-loop skills for the original classes (hotkey 6) =====
    { id: "earthshaker",    classId: "blade",     name: "Earthshaker",      flavor: "Detonate a stunned foe through the ground.",    mpCost: 20, cooldownMs: 8000,  type: "aoe",    power: 1.8, range: 1, radius: 2, hotkey: "6", effect: null, detonate: 'stun' },
    { id: "gore",           classId: "berserker", name: "Gore",             flavor: "Rip into the slowed and hooked.",               mpCost: 12, cooldownMs: 4000,  type: "melee",  power: 2.2, range: 1, radius: 0, hotkey: "6", effect: null, detonate: 'slow' },
    { id: "frostfire",      classId: "mage",      name: "Frostfire",        flavor: "Ignite the burning with a paradox of frost.",   mpCost: 22, cooldownMs: 8000,  type: "aoe",    power: 2.0, range: 5, radius: 2, hotkey: "6", effect: null, detonate: 'burn' },
    { id: "venom_shot",     classId: "ranger",    name: "Venom Shot",       flavor: "A poisoned arrow that saps the legs.",          mpCost: 10, cooldownMs: 5000,  type: "ranged", power: 1.6, range: 7, radius: 0, hotkey: "6", effect: "slow" },
    { id: "hammer_of_dawn", classId: "paladin",   name: "Hammer of Dawn",   flavor: "Bring the morning down like a hammer.",         mpCost: 30, cooldownMs: 11000, type: "aoe",    power: 2.6, range: 1, radius: 3, hotkey: "6", effect: "stun", finisher: true },
  ],

  statusEffects: {
    stun: { name: "Stunned", durationMs: 1500, tickDamage: 0,  description: "Cannot act or attack." },
    burn: { name: "Burning", durationMs: 4000, tickDamage: 8, powerRatio: 0.10, description: "Takes scaling fire damage every second." },
    slow: { name: "Slowed",  durationMs: 3000, tickDamage: 0,  description: "Move and attack speed halved." },
    mark: { name: "Marked", durationMs: 10000, tickDamage: 0, damageTaken: 0.20, perLevel: 0.05, description: "Takes increased damage from every attack." },
    sunder: { name: "Sundered", durationMs: 7000, tickDamage: 0, defReduction: 0.20, perLevel: 0.05, description: "Armor is reduced." },
  },

  combatRules: {
    critMultiplier: 1.5,
    missIfFleeExceedsHit: true, // miss when target's flee > attacker's hit
    aggroRangeTiles: 4,
    respawnMs: 5000,
  },

  damageText: {
    playerColor: "#ffe14d", // yellow — player hits
    critColor:   "#ff5b3d", // orange-red — crits
    enemyColor:  "#ffffff", // white — damage to player
    healColor:   "#5bff7a", // green — heals
  },
};
