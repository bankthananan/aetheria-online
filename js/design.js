// Game design data for "Aetheria Online" — isekai RPG demo.
// All formula strings are valid JS referencing only their named vars + Math.
export const DESIGN = {
  concept: {
    title: "Aetheria Online",
    tagline: "Died at your desk. Respawned with a sword.",
    premise:
      "A burned-out office worker collapses at midnight and wakes in Aetheria, a world that runs on the same MMO logic they used to grind after work. " +
      "Now the health bars are real, the loot is real, and the only way home is to out-level a world that keeps trying to kill them. " +
      "Turns out ten thousand hours of gaming was a job skill after all.",
    toneWords: ["adventurous", "cozy-heroic", "wondrous", "lightly comedic", "earnest"],
  },
  classes: [
    {
      id: "reborn_blade",
      name: "Reborn Blade",
      flavor: "The salaryman who read every tank guide and finally gets to main one.",
      baseStats: { str: 8, agi: 5, vit: 9, int: 3, dex: 5, luk: 4 },
      statGrowthPerLevel: { str: 1.4, agi: 0.6, vit: 1.6, int: 0.2, dex: 0.6, luk: 0.4 },
      role: "melee tank", playstyle: "Front-line bruiser: soaks hits with high VIT, cleaves groups, and shrugs off boss slams. Forgiving for new players.",
    },
    {
      id: "drifter",
      name: "Drifter",
      flavor: "A courier who turned back-alley reflexes into a whirlwind of blades.",
      baseStats: { str: 7, agi: 9, vit: 5, int: 3, dex: 7, luk: 6 },
      statGrowthPerLevel: { str: 1.3, agi: 1.5, vit: 0.7, int: 0.2, dex: 1.0, luk: 0.8 },
      role: "melee dps", playstyle: "Glass scythe: AGI-fueled attack & move speed, huge crits, thin armor. Dance out of the red circles or die in them.",
    },
    {
      id: "codeweaver",
      name: "Codeweaver",
      flavor: "Rewrites reality like it's buggy software — semicolons optional, fireballs mandatory.",
      baseStats: { str: 3, agi: 4, vit: 5, int: 10, dex: 6, luk: 5 },
      statGrowthPerLevel: { str: 0.3, agi: 0.5, vit: 0.7, int: 1.8, dex: 0.8, luk: 0.6 },
      role: "mage", playstyle: "Artillery: INT extends spell range and magic damage — burn packs down before they reach you. Weak up close, thirsty for mana.",
    },
    {
      id: "far_shot",
      name: "Far Shot",
      flavor: "A hobby archer from Earth who never missed a target — and now the targets shoot back.",
      baseStats: { str: 5, agi: 8, vit: 5, int: 4, dex: 10, luk: 6 },
      statGrowthPerLevel: { str: 0.7, agi: 1.3, vit: 0.7, int: 0.3, dex: 1.6, luk: 0.7 },
      role: "archer", playstyle: "Sustained sniper: DEX for unerring hits, AGI to kite. Steady single-target damage from far outside a monster's reach.",
    },
    {
      id: "lightbringer",
      name: "Lightbringer",
      flavor: "A paramedic who died saving strangers — reborn wielding a blade of dawn and the power to mend.",
      baseStats: { str: 7, agi: 5, vit: 8, int: 6, dex: 5, luk: 5 },
      statGrowthPerLevel: { str: 1.2, agi: 0.6, vit: 1.4, int: 0.9, dex: 0.6, luk: 0.5 },
      role: "paladin (melee + heal)", playstyle: "Self-sufficient crusader: melee smites plus a real heal — slower kills, but nearly unkillable when played patiently.",
    },
    {
      id: "iron_fist",
      name: "Iron Fist",
      flavor: "A gym rat who read every fighting-game frame chart, now in a world that finally lets him throw hands.",
      baseStats: { str: 8, agi: 8, vit: 6, int: 3, dex: 6, luk: 5 },
      statGrowthPerLevel: { str: 1.4, agi: 1.3, vit: 0.9, int: 0.2, dex: 0.9, luk: 0.6 },
      role: "melee combo", playstyle: "Momentum incarnate: fast cheap strikes build Momentum, stun-setups feed detonating palms, and finishers cash it all in. High skill ceiling.",
    },
    {
      id: "stormcaller",
      name: "Stormcaller",
      flavor: "A storm-chaser who drove into the tornado — and woke somewhere the storms answer back.",
      baseStats: { str: 3, agi: 5, vit: 5, int: 9, dex: 7, luk: 6 },
      statGrowthPerLevel: { str: 0.3, agi: 0.6, vit: 0.7, int: 1.7, dex: 0.9, luk: 0.7 },
      role: "ranged caster", playstyle: "Weaver of storms: stack burn, slow, and shock, then detonate them with thunder and fire. Fragile artillery that rewards setup.",
    },
  ],
  // Formula strings — eval-safe, integer-friendly. Vars listed per formula.
  formulas: {
    maxHp: "Math.floor(baseHp + vit * 12 + level * 20)",                    // baseHp, vit, level
    maxMp: "Math.floor(20 + int * 8 + level * 5)",                          // int, level
    physAtk: "Math.floor(str * 2 + dex * 0.5 + weaponAtk)",                 // str, dex, weaponAtk
    rangedAtk: "Math.floor(dex * 1.8 + str * 0.7 + weaponAtk)",            // dex, str, weaponAtk
    magicAtk: "Math.floor(int * 2.2)",                                      // int
    physDef: "Math.floor(vit * 0.8 + armorDef)",                            // vit, armorDef
    hit: "Math.floor(80 + dex * 2)",                                        // dex  (vs defender flee)
    flee: "Math.floor(60 + agi * 2)",                                       // agi
    critChance: "Math.min(60, Math.floor(luk * 0.7))",                      // luk  (percent)
    // attacker damage vs defender; clamps to >=1 so hits always chip.
    damage: "Math.max(1, Math.floor((attackerAtk - defenderDef) * (isCrit ? 1.5 : 1)))",
  },
  // xp needed to go from `level` to `level+1`. Steeper than a flat grind so
  // levels feel earned; the real anti-powerlevel lever is tuning.expGap* below.
  xpCurve: "Math.floor(52 * Math.pow(level, 1.85) + 24 * level)",
  // JOB level (skill exp) — rises alongside base level and is capped at Job 50
  // by PROGRESSION, preserving RO-style skill-point choices at Base Lv 80.
  jobXpCurve: "Math.floor(52 * Math.pow(level, 1.85) + 20 * level)",
  levelCap: 80,

  // ---- central balance knobs (edit here, not scattered through the engine) ----
  tuning: {
    monsterLevelSpread: 2,     // normal mobs roll their base level + 0..spread (bosses fixed)
    heatNursery: 0.20,         // the first this-fraction of a zone past each gate stays at the
                               // band floor — guarantees fair at-level prey for a fresh arrival
    monsterStatPerLevel: 0.06, // hp/atk/def scale per level rolled above the base
    monsterAtkMult: 1.8,       // global monster ATK scale (content atk values predate armor slots/affixes)
    monsterHpMult: 1.35,       // normal foes: brisk 4-8 second fights with an active skill rotation
    bossHpMult: 2.4,           // guardians last long enough to use slams, enrage, and potion pressure
    monsterExpMult: 1.15,      // roughly 22-25 even-level kills per base level before quest rewards
    expGapFalloff: 0.10,       // exp shrinks this much per player-level above the monster
    expGapMin: 0.10,           // ...but never below this fraction (trash still gives a crumb)
    expGapMax: 1.50,           // ...and up to this much for fighting above your level
    dropLevelBias: 0.11,       // rarity bias added per monster level
    dropLuckBias: 0.012,       // rarity bias added per point of player LUK
    zenyPerLevel: 3,           // ~this much zeny dropped per monster level
    combatGapFalloff: 0.10,    // player damage shrinks this much per monster-level above you...
    combatGapFloor: 0.25,      // ...to a floor — pushing ahead is dangerous, but remains playable
    combatGapHitPerLvl: 4,     // ...and a monster ABOVE your level gets +this HIT/level vs you —
                               // over-extending into high-level turf punishes evasion builds too
    hitBaseChance: 0.82,       // equal HIT/FLEE baseline; stats then bend the result within the caps
    hitStatScale: 0.012,       // hit chance gained/lost per point of HIT minus FLEE
    hitChanceMin: 0.15,        // evasion is powerful but never grants complete immunity
    hitChanceMax: 0.97,        // accuracy is reliable but attacks can still miss
    deathZenyLoss: 0.10,       // dying costs this fraction of carried zeny
    bossSlamEveryMs: 8000,     // bosses telegraph a ground slam this often while fighting
    bossEnrageAt: 0.35,        // bosses enrage below this HP fraction (+atk, faster swings)
    statCostEvery: 25,         // stat upgrade costs 1 + floor(stat/this) points — high stats cost more
    potionCdMs: 1500,          // shared restore-potion cooldown — spam must not out-heal a fight you shouldn't win
    agiAtkSpeed: 0.004,        // AGI: each point shaves this fraction off attack delay (cap 45%)
    agiMoveSpeed: 0.0025,      // AGI: each point adds this fraction of walk speed (cap 50%)
    intRange: 0.02,            // INT: each point adds this many tiles of reach to ranged/magic

    // --- skill Momentum loop ---
    momentum: {
      max: 5,             // Momentum cap
      finisherMin: 3,     // minimum Momentum to fire a finisher
      perHit: 1,          // Momentum gained per landed builder hit
      decayMs: 3000,      // out-of-combat: lose 1 Momentum per this interval
      powerPerPoint: 0.25,// finisher power +this per Momentum spent
      detonateBonus: 0.5, // +this fraction of damage when detonating a matching status
    },
  },
  progressionPillars: [
    "Every level visibly bumps HP/MP and a stat you can feel in combat.",
    "Loot drops with real ATK/DEF numbers that slot straight into your formulas.",
    "Seven classes that play distinctly — tanks, bruisers, casters, and ranged specialists.",
    "A level 1→80 arc: quick early wins, meaningful guardian walls, and steady late-game pacing.",
    "Isekai story beats unlock as you level, dangling the 'way home' carrot.",
  ],
};

// ponytail: one runnable check — every formula string must eval without throwing.
if (typeof process !== 'undefined' && import.meta.url === `file://${process.argv?.[1]}`) {
  const scope = { baseHp: 100, vit: 9, level: 5, int: 10, str: 8, dex: 10, weaponAtk: 15,
    agi: 9, luk: 6, armorDef: 8, attackerAtk: 40, defenderDef: 12, isCrit: true, Math };
  for (const [k, expr] of Object.entries(DESIGN.formulas).concat([["xpCurve", DESIGN.xpCurve]])) {
    const v = Function(...Object.keys(scope), `return (${expr});`)(...Object.values(scope));
    if (!Number.isFinite(v)) throw new Error(`${k} not finite: ${v}`);
    console.log(k, "=", v);
  }
}
