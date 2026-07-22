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

    // ===== exclusive second-job signatures (branch gating lives in progression + engine) =====
    { id: "rift_guard_break",    reqBranch: "rift_knight",    classId: "blade",        name: "Rift Guard Break",    flavor: "Turn a perfect guard into an armor-splitting answer.", mpCost: 14, cooldownMs: 5000, type: "melee",  power: 2.1, range: 1, radius: 0, hotkey: "6", effect: "sunder" },
    { id: "paradox_sever",       reqBranch: "rift_reaver",    classId: "blade",        name: "Paradox Sever",       flavor: "Split every stunned future with one impossible arc.",  mpCost: 20, cooldownMs: 7500, type: "aoe",    power: 1.9, range: 1, radius: 2, hotkey: "6", effect: null, detonate: "stun" },
    { id: "bladewind_cross",     reqBranch: "bladewind",      classId: "berserker",   name: "Bladewind Cross",     flavor: "Crossing cuts leave the whole pack fighting the wind.", mpCost: 18, cooldownMs: 7000, type: "aoe",    power: 2.0, range: 1, radius: 2, hotkey: "6", effect: "slow" },
    { id: "crimson_gore",        reqBranch: "blood_marauder", classId: "berserker",   name: "Crimson Gore",        flavor: "A merciless hew opens armor for the killing rush.",     mpCost: 15, cooldownMs: 5000, type: "melee",  power: 2.5, range: 1, radius: 0, hotkey: "6", effect: "sunder" },
    { id: "compiled_nova",       reqBranch: "rune_compiler",  classId: "mage",        name: "Compiled Nova",       flavor: "Resolve every burning rune into one clean explosion.",  mpCost: 23, cooldownMs: 8000, type: "aoe",    power: 2.0, range: 5, radius: 2, hotkey: "6", effect: null, detonate: "burn" },
    { id: "absolute_clause",     reqBranch: "frost_scribe",   classId: "mage",        name: "Absolute Clause",     flavor: "Write a law of winter that nothing can outrun.",         mpCost: 21, cooldownMs: 7500, type: "aoe",    power: 1.9, range: 5, radius: 2, hotkey: "6", effect: "slow" },
    { id: "skyline_piercer",     reqBranch: "sky_piercer",    classId: "ranger",      name: "Skyline Piercer",     flavor: "A horizon-long shot finds the seam in any defense.",     mpCost: 15, cooldownMs: 5000, type: "ranged", power: 2.4, range: 8, radius: 0, hotkey: "6", effect: "sunder" },
    { id: "starhawk_volley",     reqBranch: "wild_warden",    classId: "ranger",      name: "Starhawk Volley",     flavor: "The flock descends and pins the hunt beneath its wings.",mpCost: 20, cooldownMs: 7500, type: "aoe",    power: 1.9, range: 6, radius: 2, hotkey: "6", effect: "slow" },
    { id: "seraphic_prayer",     reqBranch: "dawnguard",      classId: "paladin",     name: "Seraphic Prayer",     flavor: "A warden's vow becomes a second sunrise in the blood.",  mpCost: 22, cooldownMs: 9000, type: "heal",   power: 2.4, range: 0, radius: 0, hotkey: "6", effect: null },
    { id: "solar_brand",         reqBranch: "sunblade",       classId: "paladin",     name: "Solar Brand",         flavor: "Stamp the battlefield with a judgment that keeps burning.",mpCost: 21, cooldownMs: 7500, type: "aoe", power: 2.0, range: 1, radius: 2, hotkey: "6", effect: "burn" },
    { id: "dragon_chain",        reqBranch: "ki_adept",       classId: "monk",        name: "Dragon Chain",        flavor: "A measured combination detonates the opening in one beat.",mpCost: 15, cooldownMs: 5000, type: "melee", power: 2.4, range: 1, radius: 0, hotkey: "6", effect: null, detonate: "stun" },
    { id: "adamant_wave",        reqBranch: "stone_disciple", classId: "monk",        name: "Adamant Wave",        flavor: "Rooted breath rolls outward as a stunning wall of force.", mpCost: 19, cooldownMs: 7500, type: "aoe",    power: 1.8, range: 1, radius: 2, hotkey: "6", effect: "stun" },
    { id: "tempest_convergence", reqBranch: "tempest_mage",   classId: "elementalist", name: "Tempest Convergence", flavor: "Fold every dragging current into the eye of the storm.",   mpCost: 23, cooldownMs: 8000, type: "aoe",    power: 2.0, range: 5, radius: 2, hotkey: "6", effect: "slow", detonate: "slow" },
    { id: "pyroclast_surge",     reqBranch: "pyroclast",      classId: "elementalist", name: "Pyroclast Surge",     flavor: "A rolling eruption consumes one blaze and begins another.",mpCost: 24, cooldownMs: 8000, type: "aoe", power: 2.1, range: 5, radius: 2, hotkey: "6", effect: "burn", detonate: "burn" },

    // ===== Advanced Job (Tier-2) depth pass — 3 new actives per base class =====
    // blade
    { id: "rift_cataclysm",   classId: "blade",     name: "Rift Cataclysm",   flavor: "Every guard you've held collapses into one shattering blast.",   mpCost: 32, cooldownMs: 12000, type: "aoe",    power: 2.9, range: 1, radius: 3, hotkey: "6", effect: "stun", detonate: "stun", finisher: true },
    { id: "colossus_break",   classId: "blade",     name: "Colossus Break",   flavor: "A single strike heavy enough to end a duel before it starts.",   mpCost: 26, cooldownMs: 7000,  type: "melee",  power: 3.1, range: 1, radius: 0, hotkey: "6", effect: "sunder", finisher: true },
    { id: "aegis_wall",       classId: "blade",     name: "Aegis Wall",       flavor: "Root yourself as an immovable bulwark the whole line can hide behind.", mpCost: 18, cooldownMs: 16000, type: "buff", power: 1.0, range: 0, radius: 0, hotkey: "6", effect: null },
    // berserker
    { id: "endless_slaughter",classId: "berserker", name: "Endless Slaughter",flavor: "The whirlwind never stops until everything nearby has fallen.", mpCost: 30, cooldownMs: 11000, type: "aoe",    power: 2.9, range: 1, radius: 3, hotkey: "6", effect: null, finisher: true },
    { id: "death_sentence",   classId: "berserker", name: "Death Sentence",   flavor: "No warning, no mercy — the killing stroke lands before they can flee.", mpCost: 24, cooldownMs: 6000, type: "melee", power: 3.2, range: 1, radius: 0, hotkey: "6", effect: null, finisher: true },
    { id: "relentless_pursuit",classId: "berserker",name: "Relentless Pursuit",flavor: "The chase becomes instinct; nothing outruns this fury.",        mpCost: 16, cooldownMs: 15000, type: "buff", power: 1.0, range: 0, radius: 0, hotkey: "6", effect: null },
    // mage
    { id: "overload",         classId: "mage",      name: "Overload",         flavor: "Every chained bolt discharges at once in one blinding surge.", mpCost: 34, cooldownMs: 12000, type: "aoe",    power: 2.9, range: 5, radius: 3, hotkey: "6", effect: null, detonate: "slow", finisher: true },
    { id: "prism_cascade",    classId: "mage",      name: "Prism Cascade",    flavor: "A single ray splits into a hundred killing colours.",           mpCost: 28, cooldownMs: 7000,  type: "ranged", power: 3.0, range: 7, radius: 0, hotkey: "6", effect: null, finisher: true },
    { id: "aegis_of_frost",   classId: "mage",      name: "Aegis of Frost",   flavor: "Raw mana crystallizes into armor no blade can bite.",          mpCost: 20, cooldownMs: 16000, type: "buff",   power: 1.0, range: 0, radius: 0, hotkey: "6", effect: null },
    // ranger
    { id: "devastating_volley",classId: "ranger",   name: "Devastating Volley",flavor: "The whole quiver empties into one scorching hailstorm.",       mpCost: 32, cooldownMs: 12000, type: "aoe",    power: 2.9, range: 6, radius: 3, hotkey: "6", effect: "burn", finisher: true },
    { id: "perfect_shot",     classId: "ranger",    name: "Perfect Shot",     flavor: "One breath, one arrow, one certainty.",                        mpCost: 26, cooldownMs: 6000,  type: "ranged", power: 3.2, range: 9, radius: 0, hotkey: "6", effect: null, finisher: true },
    { id: "hawks_focus",      classId: "ranger",    name: "Hawk's Focus",     flavor: "See the seam in every guard before the shot is loosed.",       mpCost: 18, cooldownMs: 15000, type: "buff",   power: 1.0, range: 0, radius: 0, hotkey: "6", effect: null },
    // paladin
    { id: "wrath_of_dawn",    classId: "paladin",   name: "Wrath of Dawn",    flavor: "Judgment Lance becomes a spear of pure sunrise.",              mpCost: 26, cooldownMs: 6500,  type: "ranged", power: 3.0, range: 7, radius: 0, hotkey: "6", effect: "burn", finisher: true },
    { id: "sacred_ground",    classId: "paladin",   name: "Sacred Ground",    flavor: "The circle widens; even the fallen feel its warmth.",          mpCost: 28, cooldownMs: 11000, type: "heal",   power: 3.0, range: 0, radius: 0, hotkey: "6", effect: null },
    { id: "radiant_aegis",    classId: "paladin",   name: "Radiant Aegis",    flavor: "Every blessing you've ever cast converges into one lasting light.", mpCost: 20, cooldownMs: 16000, type: "buff", power: 1.0, range: 0, radius: 0, hotkey: "6", effect: null },
    // monk
    { id: "thousand_palms",   classId: "monk",      name: "Thousand Palms",   flavor: "Every strike the body has ever learned, thrown in one breath.", mpCost: 30, cooldownMs: 10000, type: "aoe",    power: 2.9, range: 1, radius: 2, hotkey: "6", effect: null, finisher: true },
    { id: "meridian_strike",  classId: "monk",      name: "Meridian Strike",  flavor: "One perfect strike along every pressure point at once.",       mpCost: 24, cooldownMs: 6500,  type: "ranged", power: 3.0, range: 6, radius: 0, hotkey: "6", effect: null, finisher: true },
    { id: "zen_state",        classId: "monk",      name: "Zen State",        flavor: "Breath and body align; nothing can break your center.",        mpCost: 18, cooldownMs: 15000, type: "buff",   power: 1.0, range: 0, radius: 0, hotkey: "6", effect: null },
    // elementalist
    { id: "world_ender",      classId: "elementalist", name: "World Ender",   flavor: "The firestorm outgrows the battlefield that summoned it.",     mpCost: 34, cooldownMs: 13000, type: "aoe",    power: 3.0, range: 5, radius: 3, hotkey: "6", effect: "burn", detonate: "burn", finisher: true },
    { id: "seismic_shock",    classId: "elementalist", name: "Seismic Shock", flavor: "Stone splits and lightning follows the crack.",                mpCost: 26, cooldownMs: 6500,  type: "ranged", power: 3.0, range: 6, radius: 0, hotkey: "6", effect: "stun", finisher: true },
    { id: "storm_sovereign",  classId: "elementalist", name: "Storm Sovereign",flavor: "Command the charged air itself to shield you.",                mpCost: 20, cooldownMs: 16000, type: "buff",   power: 1.0, range: 0, radius: 0, hotkey: "6", effect: null },
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
