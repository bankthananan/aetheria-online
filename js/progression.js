// progression.js — character growth systems: stat points, skill trees, class tiers.
// Data only; the engine (game.js) reads these fields directly.
export const PROGRESSION = {
  statPointsPerLevel: 3,
  skillPointsPerLevel: 1,
  startStatPoints: 5,
  startSkillPoints: 1,
  jobLevelCap: 50,          // RO-style finite job track: builds must make real choices
  skillScale: 0.15,         // ranks 2-5: +15% power each
  masteryScale: 0.08,       // second-job mastery ranks 6-10: +8% power each

  // Class-owned skill-manual identity. The tree renderer combines this visual
  // language with the real skill/prerequisite data below, so every calling has
  // its own RO-style job book without duplicating combat rules in the UI.
  skillBooks: {
    blade: {
      title: 'Rift Vanguard Manual', crest: '✦', color: '#78a7d8', deep: '#172c46',
      focus: 'Guard · Sunder · Counter', motto: 'Break their formation. Become the wall they cannot cross.',
    },
    berserker: {
      title: 'Tempest Reaper Arts', crest: '☄', color: '#df777c', deep: '#482026',
      focus: 'Fury · Chase · Execute', motto: 'Momentum is mercy denied: close the gap and end it.',
    },
    mage: {
      title: 'Runic Grimoire', crest: '⌘', color: '#b98bea', deep: '#33234d',
      focus: 'Burn · Freeze · Detonate', motto: 'Prepare the equation, then erase everything inside it.',
    },
    ranger: {
      title: 'Sky Piercer Fieldbook', crest: '➶', color: '#7fcf91', deep: '#193b2a',
      focus: 'Mark · Control · Volley', motto: 'Choose the distance, expose the weakness, never miss.',
    },
    paladin: {
      title: 'Dawnlit Testament', crest: '✚', color: '#efd36f', deep: '#4b3a18',
      focus: 'Smite · Heal · Ward', motto: 'Stand where the light is needed and make that ground sacred.',
    },
    monk: {
      title: 'Way of the Iron Fist', crest: '◉', color: '#e69b61', deep: '#44291b',
      focus: 'Ki · Stun · Combo', motto: 'A measured strike opens the path to a decisive one.',
    },
    elementalist: {
      title: 'Tempest Codex', crest: 'ϟ', color: '#70cddd', deep: '#173943',
      focus: 'Weave · Shock · Cataclysm', motto: 'Layer the storm until thunder has nowhere else to go.',
    },
  },

  // Skill tree nodes keyed by skillId (ids are unique across classes).
  // reqSkill gates a node behind another node reaching a level → a real tree.
  skillTree: {
    // Reborn Blade line (blade)
    rift_slash:   { maxLevel: 10, tierCaps: [5, 10, 10], rankReqLevels: { 6: 18, 7: 22, 8: 26, 9: 30, 10: 34 }, reqLevel: 1, reqSkill: null },
    guard_sigil:  { maxLevel: 3, reqLevel: 4,  reqSkill: { id: 'rift_slash', lvl: 2 } },
    shockwave:    { maxLevel: 3, reqLevel: 10, reqSkill: { id: 'guard_sigil', lvl: 1 } },
    // Drifter line (berserker)
    reckless_hew: { maxLevel: 10, tierCaps: [5, 10, 10], rankReqLevels: { 6: 18, 7: 22, 8: 26, 9: 30, 10: 34 }, reqLevel: 1, reqSkill: null },
    blood_frenzy: { maxLevel: 3, reqLevel: 4,  reqSkill: { id: 'reckless_hew', lvl: 2 } },
    whirl_reap:   { maxLevel: 3, reqLevel: 10, reqSkill: { id: 'blood_frenzy', lvl: 1 } },
    // Codeweaver line (mage) — branches from the bolt
    arcane_bolt:  { maxLevel: 10, tierCaps: [5, 10, 10], rankReqLevels: { 6: 18, 7: 22, 8: 26, 9: 30, 10: 34 }, reqLevel: 1, reqSkill: null },
    flame_burst:  { maxLevel: 3, reqLevel: 4,  reqSkill: { id: 'arcane_bolt', lvl: 2 } },
    frost_chains: { maxLevel: 3, reqLevel: 6,  reqSkill: { id: 'arcane_bolt', lvl: 3 } },
    // Far Shot line (ranger)
    piercing_shot:{ maxLevel: 10, tierCaps: [5, 10, 10], rankReqLevels: { 6: 18, 7: 22, 8: 26, 9: 30, 10: 34 }, reqLevel: 1, reqSkill: null },
    hunters_mark: { maxLevel: 3, reqLevel: 4,  reqSkill: { id: 'piercing_shot', lvl: 2 } },
    arrow_rain:   { maxLevel: 3, reqLevel: 10, reqSkill: { id: 'hunters_mark', lvl: 1 } },
    // ---- advanced skills: only learnable AFTER the matching class advancement (reqTier) ----
    aegis_rend:    { maxLevel: 3, reqLevel: 18, reqTier: 1, reqSkill: { id: 'rift_slash', lvl: 3 } },
    world_cleaver: { maxLevel: 3, reqLevel: 40, reqTier: 2, reqSkill: { id: 'aegis_rend', lvl: 2 } },
    rampage:       { maxLevel: 3, reqLevel: 18, reqTier: 1, reqSkill: { id: 'reckless_hew', lvl: 3 } },
    apocalypse:    { maxLevel: 3, reqLevel: 40, reqTier: 2, reqSkill: { id: 'rampage', lvl: 2 } },
    meteor:        { maxLevel: 3, reqLevel: 18, reqTier: 1, reqSkill: { id: 'flame_burst', lvl: 2 } },
    arcane_nova:   { maxLevel: 3, reqLevel: 40, reqTier: 2, reqSkill: { id: 'meteor', lvl: 2 } },
    rapid_volley:  { maxLevel: 3, reqLevel: 18, reqTier: 1, reqSkill: { id: 'piercing_shot', lvl: 3 } },
    star_fall:     { maxLevel: 3, reqLevel: 40, reqTier: 2, reqSkill: { id: 'rapid_volley', lvl: 2 } },
    // Lightbringer / Paladin line
    smite:         { maxLevel: 10, tierCaps: [5, 10, 10], rankReqLevels: { 6: 18, 7: 22, 8: 26, 9: 30, 10: 34 }, reqLevel: 1, reqSkill: null },
    lay_on_hands:  { maxLevel: 3, reqLevel: 3,  reqSkill: { id: 'smite', lvl: 1 } },
    consecrate:    { maxLevel: 3, reqLevel: 6,  reqSkill: { id: 'smite', lvl: 2 } },
    holy_shield:   { maxLevel: 3, reqLevel: 18, reqTier: 1, reqSkill: { id: 'consecrate', lvl: 2 } },
    dawnbreaker:   { maxLevel: 3, reqLevel: 40, reqTier: 2, reqSkill: { id: 'holy_shield', lvl: 2 } },
    // ---- tree-filler branches (auto-positioned by dependency depth) ----
    // blade
    sunder:          { maxLevel: 5, reqLevel: 7,  reqSkill: { id: 'rift_slash', lvl: 3 } },
    bulwark:         { maxLevel: 3, reqLevel: 12, reqSkill: { id: 'guard_sigil', lvl: 2 } },
    quake:           { maxLevel: 3, reqLevel: 22, reqTier: 1, reqSkill: { id: 'shockwave', lvl: 1 } },
    titan_slam:      { maxLevel: 3, reqLevel: 28, reqTier: 1, reqSkill: { id: 'sunder', lvl: 3 } },
    shield_bash:     { maxLevel: 3, reqLevel: 24, reqTier: 1, reqSkill: { id: 'bulwark', lvl: 2 } },
    // berserker
    savage_leap:     { maxLevel: 5, reqLevel: 7,  reqSkill: { id: 'reckless_hew', lvl: 2 } },
    bloodlust:       { maxLevel: 3, reqLevel: 12, reqSkill: { id: 'blood_frenzy', lvl: 1 } },
    cleaving_storm:  { maxLevel: 3, reqLevel: 22, reqTier: 1, reqSkill: { id: 'whirl_reap', lvl: 1 } },
    decapitate:      { maxLevel: 3, reqLevel: 28, reqTier: 1, reqSkill: { id: 'savage_leap', lvl: 3 } },
    chain_hook:      { maxLevel: 3, reqLevel: 24, reqTier: 1, reqSkill: { id: 'savage_leap', lvl: 2 } },
    // mage
    ice_lance:       { maxLevel: 5, reqLevel: 9,  reqSkill: { id: 'frost_chains', lvl: 2 } },
    mana_shield:     { maxLevel: 3, reqLevel: 12, reqSkill: { id: 'arcane_bolt', lvl: 3 } },
    chain_lightning: { maxLevel: 3, reqLevel: 22, reqTier: 1, reqSkill: { id: 'flame_burst', lvl: 2 } },
    prismatic_ray:   { maxLevel: 3, reqLevel: 24, reqTier: 1, reqSkill: { id: 'flame_burst', lvl: 2 } },
    blizzard:        { maxLevel: 3, reqLevel: 45, reqTier: 2, reqSkill: { id: 'ice_lance', lvl: 3 } },
    // ranger
    twin_shot:       { maxLevel: 5, reqLevel: 7,  reqSkill: { id: 'piercing_shot', lvl: 2 } },
    snare_trap:      { maxLevel: 3, reqLevel: 12, reqSkill: { id: 'piercing_shot', lvl: 3 } },
    explosive_arrow: { maxLevel: 3, reqLevel: 22, reqTier: 1, reqSkill: { id: 'arrow_rain', lvl: 1 } },
    armor_piercer:   { maxLevel: 3, reqLevel: 24, reqTier: 1, reqSkill: { id: 'twin_shot', lvl: 2 } },
    falcon_strike:   { maxLevel: 3, reqLevel: 28, reqTier: 1, reqSkill: { id: 'twin_shot', lvl: 3 } },
    // paladin
    righteous_strike:{ maxLevel: 5, reqLevel: 9,  reqSkill: { id: 'smite', lvl: 2 } },
    blessing:        { maxLevel: 3, reqLevel: 12, reqSkill: { id: 'smite', lvl: 3 } },
    sanctuary:       { maxLevel: 3, reqLevel: 22, reqTier: 1, reqSkill: { id: 'lay_on_hands', lvl: 2 } },
    judgment_lance:  { maxLevel: 3, reqLevel: 24, reqTier: 1, reqSkill: { id: 'righteous_strike', lvl: 2 } },
    divine_wrath:    { maxLevel: 3, reqLevel: 45, reqTier: 2, reqSkill: { id: 'righteous_strike', lvl: 3 } },
    // ---- Iron Fist (monk) ----
    jab:            { maxLevel: 10, tierCaps: [5, 10, 10], rankReqLevels: { 6: 18, 7: 22, 8: 26, 9: 30, 10: 34 }, reqLevel: 1, reqSkill: null },
    iron_guard:     { maxLevel: 3, reqLevel: 3,  reqSkill: { id: 'jab', lvl: 2 } },
    palm_strike:    { maxLevel: 3, reqLevel: 4,  reqSkill: { id: 'jab', lvl: 2 } },
    roundhouse:     { maxLevel: 3, reqLevel: 7,  reqSkill: { id: 'jab', lvl: 3 } },
    pressure_point: { maxLevel: 3, reqLevel: 14, reqSkill: { id: 'palm_strike', lvl: 1 } },
    ki_barrier:     { maxLevel: 3, reqLevel: 10, reqSkill: { id: 'iron_guard', lvl: 1 } },
    rising_dragon:  { maxLevel: 3, reqLevel: 18, reqTier: 1, reqSkill: { id: 'palm_strike', lvl: 2 } },
    chi_burst:      { maxLevel: 3, reqLevel: 24, reqTier: 1, reqSkill: { id: 'pressure_point', lvl: 1 } },
    hundred_fists:  { maxLevel: 3, reqLevel: 28, reqTier: 1, reqSkill: { id: 'roundhouse', lvl: 2 } },
    dragon_kick:    { maxLevel: 3, reqLevel: 40, reqTier: 2, reqSkill: { id: 'rising_dragon', lvl: 2 } },
    // ---- Stormcaller (elementalist) ----
    spark:          { maxLevel: 10, tierCaps: [5, 10, 10], rankReqLevels: { 6: 18, 7: 22, 8: 26, 9: 30, 10: 34 }, reqLevel: 1, reqSkill: null },
    ember:          { maxLevel: 3, reqLevel: 3,  reqSkill: { id: 'spark', lvl: 2 } },
    gale:           { maxLevel: 3, reqLevel: 4,  reqSkill: { id: 'spark', lvl: 2 } },
    frost_shard:    { maxLevel: 3, reqLevel: 7,  reqSkill: { id: 'gale', lvl: 2 } },
    static_field:   { maxLevel: 3, reqLevel: 14, reqSkill: { id: 'spark', lvl: 3 } },
    storm_ward:     { maxLevel: 3, reqLevel: 10, reqSkill: { id: 'ember', lvl: 1 } },
    thunderstrike:  { maxLevel: 3, reqLevel: 18, reqTier: 1, reqSkill: { id: 'gale', lvl: 2 } },
    stone_spike:    { maxLevel: 3, reqLevel: 24, reqTier: 1, reqSkill: { id: 'frost_shard', lvl: 2 } },
    inferno:        { maxLevel: 3, reqLevel: 28, reqTier: 1, reqSkill: { id: 'ember', lvl: 2 } },
    cataclysm:      { maxLevel: 3, reqLevel: 40, reqTier: 2, reqSkill: { id: 'thunderstrike', lvl: 2 } },
    // ---- new momentum skills for the original classes ----
    earthshaker:    { maxLevel: 3, reqLevel: 32, reqTier: 1, reqSkill: { id: 'shockwave', lvl: 2 } },
    gore:           { maxLevel: 3, reqLevel: 14, reqSkill: { id: 'reckless_hew', lvl: 3 } },
    frostfire:      { maxLevel: 3, reqLevel: 32, reqTier: 1, reqSkill: { id: 'flame_burst', lvl: 2 } },
    venom_shot:     { maxLevel: 3, reqLevel: 14, reqSkill: { id: 'piercing_shot', lvl: 2 } },
    hammer_of_dawn: { maxLevel: 3, reqLevel: 50, reqTier: 2, reqSkill: { id: 'consecrate', lvl: 2 } },
    // ---- exclusive second-job signatures: one clearly readable active per branch ----
    rift_guard_break:    { maxLevel: 3, reqLevel: 18, reqTier: 1, reqBranch: 'rift_knight',     reqSkill: { id: 'guard_sigil', lvl: 2 } },
    paradox_sever:       { maxLevel: 3, reqLevel: 18, reqTier: 1, reqBranch: 'rift_reaver',     reqSkill: { id: 'rift_slash', lvl: 3 } },
    bladewind_cross:     { maxLevel: 3, reqLevel: 18, reqTier: 1, reqBranch: 'bladewind',       reqSkill: { id: 'blood_frenzy', lvl: 2 } },
    crimson_gore:        { maxLevel: 3, reqLevel: 18, reqTier: 1, reqBranch: 'blood_marauder',  reqSkill: { id: 'reckless_hew', lvl: 3 } },
    compiled_nova:       { maxLevel: 3, reqLevel: 18, reqTier: 1, reqBranch: 'rune_compiler',   reqSkill: { id: 'flame_burst', lvl: 2 } },
    absolute_clause:     { maxLevel: 3, reqLevel: 18, reqTier: 1, reqBranch: 'frost_scribe',    reqSkill: { id: 'frost_chains', lvl: 2 } },
    skyline_piercer:     { maxLevel: 3, reqLevel: 18, reqTier: 1, reqBranch: 'sky_piercer',     reqSkill: { id: 'piercing_shot', lvl: 3 } },
    starhawk_volley:     { maxLevel: 3, reqLevel: 18, reqTier: 1, reqBranch: 'wild_warden',     reqSkill: { id: 'hunters_mark', lvl: 1 } },
    seraphic_prayer:     { maxLevel: 3, reqLevel: 18, reqTier: 1, reqBranch: 'dawnguard',       reqSkill: { id: 'lay_on_hands', lvl: 2 } },
    solar_brand:         { maxLevel: 3, reqLevel: 18, reqTier: 1, reqBranch: 'sunblade',        reqSkill: { id: 'smite', lvl: 3 } },
    dragon_chain:        { maxLevel: 3, reqLevel: 18, reqTier: 1, reqBranch: 'ki_adept',        reqSkill: { id: 'palm_strike', lvl: 2 } },
    adamant_wave:        { maxLevel: 3, reqLevel: 18, reqTier: 1, reqBranch: 'stone_disciple',  reqSkill: { id: 'iron_guard', lvl: 2 } },
    tempest_convergence: { maxLevel: 3, reqLevel: 18, reqTier: 1, reqBranch: 'tempest_mage',    reqSkill: { id: 'gale', lvl: 2 } },
    pyroclast_surge:     { maxLevel: 3, reqLevel: 18, reqTier: 1, reqBranch: 'pyroclast',       reqSkill: { id: 'ember', lvl: 2 } },
  },

  // Passive skills — invest skill points for permanent stat bonuses (RO-style).
  passives: {
    iron_body:     { classId: 'blade',     name: 'Iron Body',     stat: 'hpPct',   per: 4, maxLevel: 10, reqLevel: 2, desc: '+{v}% Max HP' },
    blade_mastery: { classId: 'blade',     name: 'Blade Mastery', stat: 'atkPct',  per: 3, maxLevel: 10, reqLevel: 5, desc: '+{v}% ATK' },
    berserk_rage:  { classId: 'berserker', name: 'Rage',          stat: 'atkPct',  per: 4, maxLevel: 10, reqLevel: 2, desc: '+{v}% ATK' },
    recklessness:  { classId: 'berserker', name: 'Recklessness',  stat: 'critPct', per: 2, maxLevel: 10, reqLevel: 5, desc: '+{v}% Crit' },
    mana_font:     { classId: 'mage',      name: 'Mana Font',     stat: 'mpPct',   per: 5, maxLevel: 10, reqLevel: 2, desc: '+{v}% Max MP' },
    spell_focus:   { classId: 'mage',      name: 'Spell Focus',   stat: 'atkPct',  per: 4, maxLevel: 10, reqLevel: 5, desc: '+{v}% Magic ATK' },
    keen_eye:      { classId: 'ranger',    name: 'Keen Eye',      stat: 'critPct', per: 2, maxLevel: 10, reqLevel: 2, desc: '+{v}% Crit' },
    fleet_foot:    { classId: 'ranger',    name: 'Fleet Foot',    stat: 'fleeFlat',per: 3, maxLevel: 10, reqLevel: 5, desc: '+{v} Flee' },
    divine_body:   { classId: 'paladin',   name: 'Divine Body',   stat: 'hpPct',   per: 4, maxLevel: 10, reqLevel: 2, desc: '+{v}% Max HP' },
    faith:         { classId: 'paladin',   name: 'Faith',         stat: 'defPct',  per: 4, maxLevel: 10, reqLevel: 5, desc: '+{v}% DEF' },
    // ---- extra passives to round out each class's tree ----
    parry:            { classId: 'blade',     name: 'Parry',            stat: 'fleeFlat', per: 3, maxLevel: 10, reqLevel: 24, reqTier: 1, desc: '+{v} Flee' },
    bulwark_mastery:  { classId: 'blade',     name: 'Bulwark Mastery',  stat: 'defPct',   per: 3, maxLevel: 10, reqLevel: 38, reqTier: 2, desc: '+{v}% DEF' },
    frenzy_mastery:   { classId: 'berserker', name: 'Frenzy Mastery',   stat: 'atkPct',   per: 3, maxLevel: 10, reqLevel: 24, reqTier: 1, desc: '+{v}% ATK' },
    bloodfury:        { classId: 'berserker', name: 'Bloodfury',        stat: 'critPct',  per: 2, maxLevel: 10, reqLevel: 38, reqTier: 2, desc: '+{v}% Crit' },
    arcane_intellect: { classId: 'mage',      name: 'Arcane Intellect', stat: 'mpPct',    per: 5, maxLevel: 10, reqLevel: 24, reqTier: 1, desc: '+{v}% Max MP' },
    elemental_focus:  { classId: 'mage',      name: 'Elemental Focus',  stat: 'atkPct',   per: 3, maxLevel: 10, reqLevel: 38, reqTier: 2, desc: '+{v}% Magic ATK' },
    eagle_eye:        { classId: 'ranger',    name: 'Eagle Eye',        stat: 'critPct',  per: 2, maxLevel: 10, reqLevel: 24, reqTier: 1, desc: '+{v}% Crit' },
    swift_wind:       { classId: 'ranger',    name: 'Swift Wind',       stat: 'fleeFlat', per: 3, maxLevel: 10, reqLevel: 38, reqTier: 2, desc: '+{v} Flee' },
    zeal:             { classId: 'paladin',   name: 'Zeal',             stat: 'atkPct',   per: 3, maxLevel: 10, reqLevel: 24, reqTier: 1, desc: '+{v}% ATK' },
    holy_vigor:       { classId: 'paladin',   name: 'Holy Vigor',       stat: 'mpPct',    per: 5, maxLevel: 10, reqLevel: 38, reqTier: 2, desc: '+{v}% Max MP' },
    fist_mastery:     { classId: 'monk',        name: 'Fist Mastery',    stat: 'atkPct',   per: 3, maxLevel: 10, reqLevel: 5,  desc: '+{v}% ATK' },
    flowing_ki:       { classId: 'monk',        name: 'Flowing Ki',      stat: 'critPct',  per: 2, maxLevel: 10, reqLevel: 24, reqTier: 1, desc: '+{v}% Crit' },
    inner_calm:       { classId: 'monk',        name: 'Inner Calm',      stat: 'hpPct',    per: 4, maxLevel: 10, reqLevel: 38, reqTier: 2, desc: '+{v}% Max HP' },
    storm_focus:      { classId: 'elementalist', name: 'Storm Focus',    stat: 'atkPct',   per: 4, maxLevel: 10, reqLevel: 5,  desc: '+{v}% Magic ATK' },
    mana_well:        { classId: 'elementalist', name: 'Mana Well',      stat: 'mpPct',    per: 5, maxLevel: 10, reqLevel: 24, reqTier: 1, desc: '+{v}% Max MP' },
    tempest_soul:     { classId: 'elementalist', name: 'Tempest Soul',   stat: 'critPct',  per: 2, maxLevel: 10, reqLevel: 38, reqTier: 2, desc: '+{v}% Crit' },
  },

  // At Base Lv15 the first advancement becomes a permanent branch choice for
  // this life. Tier requirements and trial objectives still come from `tiers`;
  // these records only overlay the visible titles, raw bonuses, and exclusive
  // signature. Default branches exactly preserve the pre-branch progression.
  jobBranches: {
    reborn_blade: {
      defaultId: 'rift_knight',
      choices: [
        { id: 'rift_knight', label: 'Rift Knight', role: 'Vanguard', focus: 'Guard · Sunder · Control', color: '#78a7d8', tiers: { 1: { name: 'Rift Knight', bonus: { str: 4, vit: 4 } }, 2: { name: 'Voidcleaver Lord', bonus: { str: 8, vit: 8, dex: 3 } } }, signatureSkillId: 'rift_guard_break' },
        { id: 'rift_reaver', label: 'Rift Reaver', role: 'Duelist', focus: 'Cleave · Detonate · Pressure', color: '#c57ee8', tiers: { 1: { name: 'Rift Reaver', bonus: { str: 5, agi: 3 } }, 2: { name: 'Paradox Blade', bonus: { str: 9, agi: 6, dex: 4 } } }, signatureSkillId: 'paradox_sever' },
      ],
    },
    drifter: {
      defaultId: 'bladewind',
      choices: [
        { id: 'bladewind', label: 'Bladewind Dancer', role: 'Skirmisher', focus: 'Speed · Area · Control', color: '#df777c', tiers: { 1: { name: 'Bladewind Dancer', bonus: { agi: 4, str: 4 } }, 2: { name: 'Tempest Reaper', bonus: { agi: 8, str: 6, luk: 3 } } }, signatureSkillId: 'bladewind_cross' },
        { id: 'blood_marauder', label: 'Blood Marauder', role: 'Executioner', focus: 'Power · Sunder · Pursuit', color: '#c94655', tiers: { 1: { name: 'Blood Marauder', bonus: { str: 5, vit: 3 } }, 2: { name: 'Crimson Ravager', bonus: { str: 9, vit: 5, luk: 3 } } }, signatureSkillId: 'crimson_gore' },
      ],
    },
    codeweaver: {
      defaultId: 'rune_compiler',
      choices: [
        { id: 'rune_compiler', label: 'Rune Compiler', role: 'Artillery', focus: 'Burn · Detonate · Area', color: '#b98bea', tiers: { 1: { name: 'Rune Compiler', bonus: { int: 5, dex: 3 } }, 2: { name: 'Reality Debugger', bonus: { int: 10, dex: 4 } } }, signatureSkillId: 'compiled_nova' },
        { id: 'frost_scribe', label: 'Frost Scribe', role: 'Controller', focus: 'Freeze · Slow · Survival', color: '#70bde8', tiers: { 1: { name: 'Frost Scribe', bonus: { int: 4, vit: 2, dex: 2 } }, 2: { name: 'Absolute Architect', bonus: { int: 8, vit: 4, dex: 2 } } }, signatureSkillId: 'absolute_clause' },
      ],
    },
    far_shot: {
      defaultId: 'sky_piercer',
      choices: [
        { id: 'sky_piercer', label: 'Sky Piercer', role: 'Sniper', focus: 'Range · Sunder · Precision', color: '#7fcf91', tiers: { 1: { name: 'Sky Piercer', bonus: { dex: 5, agi: 3 } }, 2: { name: 'Worldbane Sniper', bonus: { dex: 9, agi: 5 } } }, signatureSkillId: 'skyline_piercer' },
        { id: 'wild_warden', label: 'Wild Warden', role: 'Hunter', focus: 'Volley · Slow · Fortune', color: '#b4d56f', tiers: { 1: { name: 'Wild Warden', bonus: { dex: 4, agi: 2, luk: 2 } }, 2: { name: 'Starhawk Warden', bonus: { dex: 7, agi: 4, luk: 3 } } }, signatureSkillId: 'starhawk_volley' },
      ],
    },
    lightbringer: {
      defaultId: 'dawnguard',
      choices: [
        { id: 'dawnguard', label: 'Dawnguard', role: 'Warden', focus: 'Guard · Heal · Endure', color: '#efd36f', tiers: { 1: { name: 'Dawnguard', bonus: { vit: 5, str: 3 } }, 2: { name: 'Seraph Warden', bonus: { vit: 8, str: 6, int: 4 } } }, signatureSkillId: 'seraphic_prayer' },
        { id: 'sunblade', label: 'Sunblade', role: 'Justicar', focus: 'Smite · Burn · Judgment', color: '#f29b57', tiers: { 1: { name: 'Sunblade', bonus: { str: 5, int: 3 } }, 2: { name: 'Solar Justicar', bonus: { str: 9, int: 6, luk: 3 } } }, signatureSkillId: 'solar_brand' },
      ],
    },
    iron_fist: {
      defaultId: 'ki_adept',
      choices: [
        { id: 'ki_adept', label: 'Ki Adept', role: 'Combo Master', focus: 'Tempo · Stun · Detonate', color: '#e69b61', tiers: { 1: { name: 'Ki Adept', bonus: { str: 4, agi: 4 } }, 2: { name: 'Grandmaster', bonus: { str: 8, agi: 6, vit: 3 } } }, signatureSkillId: 'dragon_chain' },
        { id: 'stone_disciple', label: 'Stone Disciple', role: 'Bulwark', focus: 'Guard · Shockwave · Control', color: '#b99a77', tiers: { 1: { name: 'Stone Disciple', bonus: { vit: 4, str: 2, dex: 2 } }, 2: { name: 'Adamant Sage', bonus: { vit: 8, str: 5, dex: 4 } } }, signatureSkillId: 'adamant_wave' },
      ],
    },
    stormcaller: {
      defaultId: 'tempest_mage',
      choices: [
        { id: 'tempest_mage', label: 'Tempest Mage', role: 'Storm Weaver', focus: 'Slow · Detonate · Area', color: '#70cddd', tiers: { 1: { name: 'Tempest Mage', bonus: { int: 4, dex: 3 } }, 2: { name: 'Archon of Storms', bonus: { int: 8, dex: 4, luk: 3 } } }, signatureSkillId: 'tempest_convergence' },
        { id: 'pyroclast', label: 'Pyroclast', role: 'Firebrand', focus: 'Burn · Detonate · Power', color: '#ef7654', tiers: { 1: { name: 'Pyroclast', bonus: { int: 5, luk: 2 } }, 2: { name: 'Cinder Archon', bonus: { int: 9, luk: 4, vit: 2 } } }, signatureSkillId: 'pyroclast_surge' },
      ],
    },
  },

  // Class advancement tiers per design classId. Index 0 = starting job.
  // Reaching reqLevel promotes to the next tier: new title + permanent stat bonus.
  // Each tier past the first has an `advance` quest that must be completed to promote.
  // Completing it grants the new title + stat bonus AND unlocks that tier's skills.
  tiers: {
    reborn_blade: [
      { name: 'Reborn Blade',     reqLevel: 1 },
      { name: 'Rift Knight',      reqLevel: 15, bonus: { str: 4, vit: 4 }, advance: { name: 'Trial of the Rift Knight', desc: 'A true knight is forged in the hunt. Fell 5 Dire Wolves to earn your rank.', objective: { type: 'kill', target: 'wolf', count: 5 } } },
      { name: 'Voidcleaver Lord', reqLevel: 40, bonus: { str: 8, vit: 8, dex: 3 }, advance: { name: 'Trial of the Voidcleaver', desc: 'Banish 5 Frost Wolves to claim your final form.', objective: { type: 'kill', target: 'frost_wolf', count: 5 } } },
    ],
    drifter: [
      { name: 'Drifter',          reqLevel: 1 },
      { name: 'Bladewind Dancer', reqLevel: 15, bonus: { agi: 4, str: 4 }, advance: { name: 'Dance of the Bladewind', desc: 'Move like the wind — cut down 5 Dire Wolves.', objective: { type: 'kill', target: 'wolf', count: 5 } } },
      { name: 'Tempest Reaper',   reqLevel: 40, bonus: { agi: 8, str: 6, luk: 3 }, advance: { name: 'Rite of the Tempest', desc: 'Reap 5 Frost Wolves to become the storm.', objective: { type: 'kill', target: 'frost_wolf', count: 5 } } },
    ],
    codeweaver: [
      { name: 'Codeweaver',       reqLevel: 1 },
      { name: 'Rune Compiler',    reqLevel: 15, bonus: { int: 5, dex: 3 }, advance: { name: 'Compile the Runes', desc: 'Debug the wildlife — defeat 5 Dire Wolves.', objective: { type: 'kill', target: 'wolf', count: 5 } } },
      { name: 'Reality Debugger', reqLevel: 40, bonus: { int: 10, dex: 4 }, advance: { name: 'Patch Reality', desc: 'Purge 5 Frost Wolves to rewrite the world.', objective: { type: 'kill', target: 'frost_wolf', count: 5 } } },
    ],
    far_shot: [
      { name: 'Far Shot',         reqLevel: 1 },
      { name: 'Sky Piercer',      reqLevel: 15, bonus: { dex: 5, agi: 3 }, advance: { name: 'Trial of the Sky Piercer', desc: 'Never miss — bring down 5 Dire Wolves.', objective: { type: 'kill', target: 'wolf', count: 5 } } },
      { name: 'Worldbane Sniper', reqLevel: 40, bonus: { dex: 9, agi: 5 }, advance: { name: 'The Worldbane Mark', desc: 'Snipe 5 Frost Wolves to earn the title.', objective: { type: 'kill', target: 'frost_wolf', count: 5 } } },
    ],
    lightbringer: [
      { name: 'Lightbringer',     reqLevel: 1 },
      { name: 'Dawnguard',        reqLevel: 15, bonus: { vit: 5, str: 3 }, advance: { name: 'Oath of the Dawnguard', desc: 'Protect the weak — slay 5 Dire Wolves that stalk the road.', objective: { type: 'kill', target: 'wolf', count: 5 } } },
      { name: 'Seraph Warden',    reqLevel: 40, bonus: { vit: 8, str: 6, int: 4 }, advance: { name: 'Ascension of the Seraph', desc: 'Cleanse 5 Frost Wolves with holy light.', objective: { type: 'kill', target: 'frost_wolf', count: 5 } } },
    ],
    iron_fist: [
      { name: 'Iron Fist',        reqLevel: 1 },
      { name: 'Ki Adept',         reqLevel: 15, bonus: { str: 4, agi: 4 }, advance: { name: 'Trial of the Ki Adept', desc: 'Discipline is forged in battle. Fell 5 Dire Wolves with your fists.', objective: { type: 'kill', target: 'wolf', count: 5 } } },
      { name: 'Grandmaster',      reqLevel: 40, bonus: { str: 8, agi: 6, vit: 3 }, advance: { name: 'Rite of the Grandmaster', desc: 'Still the storm within — banish 5 Frost Wolves.', objective: { type: 'kill', target: 'frost_wolf', count: 5 } } },
    ],
    stormcaller: [
      { name: 'Stormcaller',      reqLevel: 1 },
      { name: 'Tempest Mage',     reqLevel: 15, bonus: { int: 4, dex: 3 }, advance: { name: 'Trial of the Tempest', desc: 'Call the storm down on 5 Dire Wolves.', objective: { type: 'kill', target: 'wolf', count: 5 } } },
      { name: 'Archon of Storms', reqLevel: 40, bonus: { int: 8, dex: 4, luk: 3 }, advance: { name: 'Rite of the Archon', desc: 'Unleash the tempest on 5 Frost Wolves.', objective: { type: 'kill', target: 'frost_wolf', count: 5 } } },
    ],
  },
};
