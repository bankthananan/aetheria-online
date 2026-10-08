import assert from 'node:assert/strict';

// Shim localStorage for Node environment
globalThis.localStorage = {
  _data: {},
  getItem(key) { return this._data[key] || null; },
  setItem(key, val) { this._data[key] = String(val); },
  removeItem(key) { delete this._data[key]; },
  clear() { this._data = {}; }
};

// Now import the modules dynamically
const { T, setLanguage, L10N } = await import('./locale.js');
const { DESIGN } = await import('./design.js');
const { COMBAT } = await import('./combat.js');
const { MAPS } = await import('./maps.js');
const { CONTENT } = await import('./content.js');
const { PROGRESSION } = await import('./progression.js');

console.log('=== RUNNING LOCALIZATION TEST ===');

// Test 1: Test EN/TH switcher logic
setLanguage('en');
assert.equal(T('Status', 'ui'), 'Status', 'English translation must return the key itself');

setLanguage('th');
assert.equal(T('Status', 'ui'), 'สถานะ', 'Thai translation must return the translated value');

// Test 2: Check all keys in L10N.th are non-empty
for (const [category, dict] of Object.entries(L10N.th)) {
  for (const [key, val] of Object.entries(dict)) {
    assert.ok(val && val.trim(), `Empty translation value for category [${category}] key [${key}]`);
  }
}

// Test 3: Check classes and their descriptions
DESIGN.classes.forEach(c => {
  assert.notEqual(T(c.name, 'classes'), c.name, `Missing translation for class name: ${c.name}`);
  assert.notEqual(T(c.flavor, 'classes'), c.flavor, `Missing translation for class flavor: ${c.flavor}`);
  if (c.playstyle) {
    assert.notEqual(T(c.playstyle, 'classes'), c.playstyle, `Missing translation for class playstyle: ${c.playstyle}`);
  }
});

// Test 4: Check skills
COMBAT.skills.forEach(s => {
  assert.notEqual(T(s.name, 'skills'), s.name, `Missing translation for skill name: ${s.name}`);
  assert.notEqual(T(s.flavor, 'skills'), s.flavor, `Missing translation for skill flavor: ${s.flavor}`);
});

// Test 5: Check items
CONTENT.items.forEach(i => {
  assert.notEqual(T(i.name, 'items'), i.name, `Missing translation for item name: ${i.name}`);
  assert.notEqual(T(i.desc, 'items'), i.desc, `Missing translation for item description: ${i.desc}`);
});

// Test 6: Check monsters
CONTENT.monsters.forEach(m => {
  assert.notEqual(T(m.name, 'monsters'), m.name, `Missing translation for monster name: ${m.name}`);
  assert.notEqual(T(m.flavor, 'monsters'), m.flavor, `Missing translation for monster flavor: ${m.flavor}`);
});

// Test 6b: Check achievements
CONTENT.achievements.forEach(a => {
  assert.notEqual(T(a.name, 'achievements'), a.name, `Missing translation for achievement name: ${a.name}`);
  assert.notEqual(T(a.desc, 'achievements'), a.desc, `Missing translation for achievement desc: ${a.desc}`);
});

// Test 7: Check NPCs and general NPC dialogues
CONTENT.npcs.forEach(n => {
  assert.notEqual(T(n.name, 'npcs'), n.name, `Missing translation for NPC name: ${n.name}`);
  n.dialogue.forEach(d => {
    assert.notEqual(T(d, 'dialogues'), d, `Missing translation for NPC dialogue: ${d}`);
  });
});

// Test 8: Check Quests
CONTENT.quests.forEach(q => {
  assert.notEqual(T(q.name, 'quests'), q.name, `Missing translation for quest name: ${q.name}`);
  assert.notEqual(T(q.description, 'quests'), q.description, `Missing translation for quest description: ${q.description}`);
  if (q.startLines) {
    q.startLines.forEach(l => {
      assert.notEqual(T(l, 'quests'), l, `Missing translation for quest startLine: ${l}`);
    });
  }
  if (q.doneLines) {
    q.doneLines.forEach(l => {
      assert.notEqual(T(l, 'quests'), l, `Missing translation for quest doneLine: ${l}`);
    });
  }
});

// Test 9: Check Passives
Object.values(PROGRESSION.passives).forEach(p => {
  assert.notEqual(T(p.name, 'passives'), p.name, `Missing translation for passive name: ${p.name}`);
  assert.notEqual(T(p.desc, 'passives'), p.desc, `Missing translation for passive description: ${p.desc}`);
});

// Test 10: Check Class advancement tiers
Object.values(PROGRESSION.tiers).forEach(tList => {
  tList.forEach(t => {
    assert.notEqual(T(t.name, 'classes'), t.name, `Missing translation for tier class name: ${t.name}`);
    if (t.advance) {
      assert.notEqual(T(t.advance.name, 'quests'), t.advance.name, `Missing translation for advancement quest name: ${t.advance.name}`);
      assert.notEqual(T(t.advance.desc, 'quests'), t.advance.desc, `Missing translation for advancement quest description: ${t.advance.desc}`);
    }
  });
});

// Test 10a: Every second-job choice is understandable in both languages.
Object.values(PROGRESSION.jobBranches).forEach(config => {
  config.choices.forEach(branch => {
    for (const tier of Object.values(branch.tiers)) {
      assert.notEqual(T(tier.name, 'classes'), tier.name, `Missing translation for branch class name: ${tier.name}`);
    }
    assert.notEqual(T(branch.role, 'ui'), branch.role, `Missing translation for branch role: ${branch.role}`);
    assert.notEqual(T(branch.focus, 'ui'), branch.focus, `Missing translation for branch focus: ${branch.focus}`);
  });
});

// Test 10b: Every class-owned skill manual is fully localized, not just its skills.
Object.values(PROGRESSION.skillBooks).forEach(book => {
  for (const field of ['title', 'focus', 'motto']) {
    assert.notEqual(T(book[field], 'ui'), book[field], `Missing translation for skill manual ${field}: ${book[field]}`);
  }
});

// Test 11: Check Story Phases
CONTENT.storyPhases.forEach(sp => {
  assert.notEqual(T(sp.name, 'storyPhases'), sp.name, `Missing translation for story phase name: ${sp.name}`);
});

// Test 12: Check every player-facing map, route, and NPC label
Object.values(MAPS).forEach(m => {
  if (m.name) {
    assert.notEqual(T(m.name, 'maps'), m.name, `Missing translation for map name: ${m.name}`);
  }
  if (m.ambient) {
    assert.notEqual(T(m.ambient, 'maps'), m.ambient, `Missing translation for map ambient: ${m.ambient}`);
  }
  for (const [field, value] of Object.entries(m.chronicle || {})) {
    assert.notEqual(T(value, 'maps'), value, `Missing translation for ${m.id} chronicle.${field}: ${value}`);
  }
  for (const portal of m.portals || []) {
    assert.notEqual(T(portal.label, 'maps'), portal.label, `Missing translation for portal label: ${portal.label}`);
  }
  if (m.npcs) {
    m.npcs.forEach(n => {
      assert.notEqual(T(n.name, 'npcs'), n.name, `Missing translation for map NPC name: ${n.name}`);
      if (n.title) {
        assert.notEqual(T(n.title, 'npcs'), n.title, `Missing translation for NPC title: ${n.title}`);
      }
    });
  }
});

// Test 13: Check and cover all values in design.js concept
assert.notEqual(T(DESIGN.concept.tagline, 'dialogues'), DESIGN.concept.tagline, 'Missing translation for concept tagline');
assert.notEqual(T(DESIGN.concept.premise, 'dialogues'), DESIGN.concept.premise, 'Missing translation for concept premise');

// Test 14: Cutscenes and runtime guidance must not fall back to English.
for (const line of [...CONTENT.story.intro, ...CONTENT.story.victoryOutro]) {
  assert.notEqual(T(line, 'dialogues'), line, `Missing translation for story cutscene line: ${line}`);
}
for (const key of [
  'Navigate to this task', 'Rewards: {items}', 'Focused hunt: {name}.',
  'Arrived: {destination}.', 'Could not reach {label}.',
  'Quest complete: {name}  (+{exp} xp, +{gold}z)',
  'Next: {quest} — unlocks at Base Lv {level}.',
  'Phase', 'The next chapter', '{chapter} is waiting. Reach Base Lv {level} to continue.',
  'Level up! Lv {level} — +{points} stat points.',
  'Job level up! Job Lv {level}/{cap} — +{points} skill point.',
  '✦☠ The Nullking is unmade!', 'Victory! The world is yours to roam. Toggle auto-farm with F.',
  'Welcome back, {name} — Lv {level} {class}.',
  'Auto-hunt ON — targets up to Lv {level}; stronger monsters are ignored.',
  'Auto-hunt target limit: Lv {level}',
  'Revoke', 'Revoke bounty',
  'Revoke this bounty? Progress will be lost, but delivery items stay in your bag.',
  'Confirm Revoke', 'Click again to confirm bounty revoke',
  'Revoke armed: click Confirm Revoke to abandon {name}. Delivery items stay in your bag.',
  'Guild bounty revoked: {name}. No rewards were granted.',
  'Available Bounties', 'Refresh Board',
  'Guild board refreshed. Accepted bounties were not changed.',
  'Recommended Lv', 'Recommended Lv {level}+', 'Target Lv {min}–{max}',
  'Too strong for your current level',
  'No substats', 'recommended', 'useful', 'NEW BONUS', 'REMOVED', 'IMPROVED', 'REDUCED',
  'Nothing equipped in this slot.', 'No substat changes.', 'Suggested substats for',
  'Stars are core priorities; the dot is a useful secondary. Trade-offs are shown instead of hidden behind one gear score.',
  'Equipment contribution', 'Base gear', 'weapon ATK', 'armor DEF', 'No active substats', 'vs equipped',
  'Rolled gear keeps its shown rarity and substats until stock rotates. Main-story chapters or Guild Rank can raise Trader Rank and improve rarity odds.',
  'Full catalog: finish the main story AND reach Guild Rank S to unlock Trader Rank S.',
  'Advance the main story or raise Guild Rank to unlock rotating featured stock.',
  '🏆 Trader S Master Catalog — all rank gear unlocked',
  '⭐ Featured rank gear — rotates with rank & time',
  'Story milestone reached — trader stock advanced to Rank {rank} with better rarity.',
  'Main story and Guild Rank complete — Trader Rank S and the full catalog are unlocked.',
  'Main story complete — Story Rank A+ unlocked. Reach Guild Rank S to unlock the full Trader Rank S catalog.',
  'Reset Manuals', 'No allocated stat points to reset.', 'No spent skill points to reset.',
  'Use Soul Ledger? Every allocated stat point will be refunded.',
  'Use Memory Prism? All spent active and passive skill points will be refunded.',
  'Soul Ledger used — all stat points refunded.', 'Memory Prism used — all skill points refunded.',
  'CLASS SKILL MANUAL', 'FIRST JOB', 'SECOND JOB', 'ADVANCED JOB',
  'ACTIVE SKILLS', 'PASSIVE MASTERIES', 'RESET YOUR BUILD', 'COMBAT COMBO GUIDE',
  'Soul Ledger and Memory Prism are sold by Marla. Reset items preserve your level, gear, and rebirth bonuses.',
  'Automation Console', '⚙ Auto', 'Automation ready', 'Track a task or enable Hunt.', 'Open Automation Console',
  'Tracking route', 'Tracking objective', 'Focused hunt', 'Searching', 'Finding next encounter',
  'Finding the next safe encounter.', 'Encounter found', 'Unsafe encounter', 'Waiting for encounter', 'Automation stopped',
  'Auto Heal', 'Auto Potion', 'Auto Mana', 'Auto Skill', 'Basic attack', 'nearby monsters',
  '{name} begins at Lv {level}; safe limit is Lv {cap}.', '{name} respawns in about {seconds}s.',
  'No reachable {name} found on this map.', 'Skipped unreachable {name}.',
  'Death canceled Hunt mode and active quest navigation.', 'Free Hunt', 'LIVE DECISION', 'CURRENT OBJECTIVE',
  'SAFE HUNT LIMIT', 'Combat Decisions', 'Tracking owns travel and target choice. Your clicks always take priority.',
  'Smart Skills', 'Uses setup, detonators, finishers, buffs, and mana recovery.',
  'Uses learned healing skills before emergency potions.', 'Auto Potions',
  'Chooses the smallest useful HP or MP recovery item.', 'Recovery Profile',
  'Choose how early automation recovers. Potion cooldown is always respected.', 'Cautious', 'Balanced', 'Aggressive',
  'Heal skill {heal}% · HP potion {hp}% · MP potion {mp}%', 'ON', 'OFF',
  'Death stops Hunt and route guidance. Stronger monsters remain ignored until you choose them manually.',
]) assert.notEqual(T(key, 'ui'), key, `Missing translation for runtime guidance: ${key}`);

// Test 15: Check Companions & Pet Familiars UI strings and companion catalog
const petUiKeys = [
  'Companions & Familiars',
  'Active Companion',
  'Summon',
  'Dismiss',
  'Bond Level',
  'Loyalty',
  'Devoted',
  'Feed Feast',
  'Auto-Loot Radius',
  'Sweet Gelatin',
  'Tender Jerky',
  'Luminous Nectar',
  'Glacial Salmon Nibble',
  'Magma Berry Cluster',
  'Creature must be weakened below 30% HP!',
  'This creature rejects this bait!',
  'Successfully tamed',
  'The creature resisted taming!',
  'Fed',
  'Feed',
  'Bond Lv.',
  'Cook feasts via Fishing & Alchemy to feed your companion!',
  'Loyalty Progress',
  'Active Aura Buffs',
  'Feast Quick-Feed Tray',
  'No Active Companion Summoned',
  'Summon an owned companion from your roster below to receive their aura buffs and auto-loot assistance.',
  'Companion Sanctuary Roster',
  'Summoned',
  'Habitat',
  'Target Creature',
  'Required Bait',
  'AETHERIA · COMPANION SANCTUARY',
  'Loyal beasts and bonded familiars granting passive auras and auto-loot perks.',
  'Target a wounded creature nearby to tame!',
  'Target is too far away to tame!',
  'Companion duplicated',
  'tiles',
];
for (const key of petUiKeys) {
  assert.notEqual(T(key, 'ui'), key, `Missing UI translation for: ${key}`);
}

const { PET_CATALOG } = await import('./systems/pets.js');
for (const pet of Object.values(PET_CATALOG)) {
  assert.notEqual(T(pet.name, 'ui'), pet.name, `Missing translation for companion name: ${pet.name}`);
  assert.notEqual(T(pet.desc, 'ui'), pet.desc, `Missing translation for companion desc: ${pet.desc}`);
}

// Test 16: Check World Boss Raid monsters, items, and UI translations in EN and TH
setLanguage('en');
assert.equal(T('Caldera Colossus', 'monsters'), 'Caldera Colossus');
assert.equal(T('Ancient Behemoth', 'monsters'), 'Ancient Behemoth');
assert.equal(T('Voidmaw Sovereign', 'monsters'), 'Voidmaw Sovereign');
assert.equal(T('Titan Horn', 'items'), 'Titan Horn');
assert.equal(T('Heart of the Colossus', 'items'), 'Heart of the Colossus');
assert.equal(T('Eye of the Voidmaw', 'items'), 'Eye of the Voidmaw');
assert.equal(T('Titanheart Pendant', 'items'), 'Titanheart Pendant');
assert.equal(T('Voidmaw Edge', 'items'), 'Voidmaw Edge');
assert.equal(T('World Boss Raid', 'ui'), 'World Boss Raid');

setLanguage('th');
assert.equal(T('Caldera Colossus', 'monsters'), 'ยักษ์ศิลาลาวาแมกมา');
assert.equal(T('Ancient Behemoth', 'monsters'), 'เบเฮมอธดึกดำบรรพ์');
assert.equal(T('Voidmaw Sovereign', 'monsters'), 'จอมราชันย์แห่งมิติว่างเปล่า');
assert.equal(T('Titan Horn', 'items'), 'เขาสัตว์ยักษ์ไททัน');
assert.equal(T('Heart of the Colossus', 'items'), 'หัวใจแห่งยักษ์ศิลา');
assert.equal(T('Eye of the Voidmaw', 'items'), 'เนตรแห่งวอยด์มอว์');
assert.equal(T('Titanheart Pendant', 'items'), 'จี้หัวใจไททัน');
assert.equal(T('Voidmaw Edge', 'items'), 'ดาบประกายมิติว่างเปล่า');
assert.equal(T('World Boss Raid', 'ui'), 'การจู่โจมบอสโลก');
assert.equal(T('Phase 1: Guardian Tactics', 'ui'), 'เฟส 1: ยุทธวิธีผู้พิทักษ์');
assert.equal(T('Phase 2: Break Shield!', 'ui'), 'เฟส 2: ทำลายเกราะสกัด!');
assert.equal(T('Phase 3: APEX ENRAGE', 'ui'), 'เฟส 3: คลุ้มคลั่งขั้นสุดยอด');
assert.equal(T('Staggered!', 'ui'), 'ชะงักงัน!');
assert.equal(T('Barrier Detonated!', 'ui'), 'เกราะระเบิดคลื่นพลัง!');
assert.equal(T('Raid Victory!', 'ui'), 'ชัยชนะการจู่โจมบอสโลก!');
assert.equal(T('Raid Collapsed!', 'ui'), 'การจู่โจมสิ้นสุดลง!');
assert.equal(T('Contribution Score', 'ui'), 'คะแนนการมีส่วนร่วม');
assert.equal(T('Contribution Tier', 'ui'), 'ระดับการมีส่วนร่วม');
assert.equal(T('Bronze Tier', 'ui'), 'ระดับเหรียญทองแดง');
assert.equal(T('Silver Tier', 'ui'), 'ระดับเหรียญเงิน');
assert.equal(T('Gold Tier', 'ui'), 'ระดับเหรียญทอง');
assert.equal(T('Paragon Tier', 'ui'), 'ระดับบรรพชนขั้นสูงสุด');
assert.equal(T('Claim Spoils', 'ui'), 'รับของรางวัล');
assert.equal(T('Break Shield', 'ui'), 'เกราะสกัด');
assert.equal(T('Break Timer', 'ui'), 'เวลาสกัดเกราะ');
assert.equal(T('A World Boss is already active!', 'ui'), 'มีบอสโลกกำลังเปิดศึกอยู่แล้ว!');
assert.equal(T('The Titan Horn only echoes across ancient wild zones!', 'ui'), 'เขาสัตว์ไททันจะส่งเสียงก้องกังวานเฉพาะในดินแดนโบราณเท่านั้น!');

// Test 17: Check Abyssal Spire biomes, affixes, bosses, items, and UI translations in EN and TH
const spireBiomes = [
  { en: 'Shadow Depths', th: 'ห้วงลึกแห่งเงามืด' },
  { en: 'Glacial Ascent', th: 'เส้นทางน้ำแข็งสูงชัน' },
  { en: 'Magma Foundry', th: 'โรงหลอมแมกมา' },
  { en: 'Storm Spires', th: 'ยอดหอคอยสายฟ้า' },
  { en: 'Void Zenith', th: 'จุดสูงสุดแห่งความว่างเปล่า' }
];

const spireAffixes = [
  { en: 'Magma Surge', th: 'คลื่นแมกมาพวยพุ่ง' },
  { en: 'Glacial Chill', th: 'ความเย็นยะเยือก' },
  { en: 'Mana Drain', th: 'สูบกลืนมานา' },
  { en: 'Sunder Mist', th: 'หมอกสลายเกราะ' },
  { en: 'Berserk Foes', th: 'ศัตรูคลุ้มคลั่ง' },
  { en: 'Kinetic Reflect', th: 'สะท้อนแรงปะทะ' },
  { en: 'Graviton Well', th: 'หลุมแรงโน้มถ่วง' },
  { en: 'Chrono Haste', th: 'ความเร่งกาลเวลา' }
];

const spireBosses = [
  { en: 'Corrupted Treant', th: 'เทรนท์พฤกษาแปดเปื้อน' },
  { en: 'Abyssal Siren & Golem', th: 'ไซเรนและโกเลมห้วงลึก' },
  { en: 'Frost Revenant Alpha', th: 'ราชาเยือกแข็งอัลฟา' },
  { en: 'Glacial Dragon', th: 'มังกรน้ำแข็งกลาเซียล' },
  { en: 'Caldera Avatar', th: 'อวตารแห่งแอ่งภูเขาไฟ' },
  { en: 'Magma Lord', th: 'จ้าวแห่งแมกมา' },
  { en: 'Tempest Warden', th: 'ผู้พิทักษ์วาตภัย' },
  { en: 'Twin Elementals', th: 'ภูตธาตุพายุคู่' },
  { en: 'Herald Sovereign', th: 'จอมทูตแห่งรอยแยก' },
  { en: 'Primordial Nullking', th: 'ราชันความดับสูญดึกดำบรรพ์' }
];

const spireItems = [
  { en: 'Spire Emblem', th: 'เหรียญตราหอคอย' },
  { en: 'Crown of the Ascendant', th: 'มงกุฎแห่งผู้ก้าวข้าม' },
  { en: 'Abyssal Compass', th: 'เข็มทิศห้วงลึก' },
  { en: 'Ascendant Sigil', th: 'ตราประทับแห่งผู้ก้าวข้าม' },
  { en: 'Spire Blade', th: 'ดาบแห่งหอคอย' },
  { en: 'Spire Scythe', th: 'เคียวแห่งหอคอย' },
  { en: 'Spire Greatsword', th: 'ดาบใหญ่แห่งหอคอย' },
  { en: 'Spire Staff', th: 'คทาแห่งหอคอย' },
  { en: 'Spire Bow', th: 'ธนูแห่งหอคอย' },
  { en: 'Spire Knuckles', th: 'สนับมือแห่งหอคอย' },
  { en: 'Spire Challenger', th: 'ผู้ท้าชิงแห่งยอดหอคอย' },
  { en: 'Abyssal Sovereign', th: 'จอมราชันย์แห่งอบิส' }
];

const spireUiStrings = [
  { en: 'Abyssal Spire', th: 'หอคอยแห่งอบิส' },
  { en: 'Ascendant Elevator', th: 'ลิฟต์แห่งผู้ก้าวข้าม' },
  { en: 'Floor', th: 'ชั้นที่' },
  { en: 'Ascend', th: 'ขึ้นสู่หอคอย' },
  { en: 'Checkpoint Unlocked', th: 'ปลดล็อกจุดบันทึกชั้นแล้ว' },
  { en: 'Spire Emblems', th: 'เหรียญตราหอคอย' },
  { en: 'Floors Cleared', th: 'ชั้นที่พิชิตได้' },
  { en: 'Highest Floor', th: 'ชั้นสูงสุดที่เคยพิชิต' },
  { en: 'Spire Archon', th: 'อาร์คอนแห่งหอคอย' },
  { en: 'Requires Floor {f} Cleared', th: 'ต้องพิชิตชั้นที่ {f} ก่อน' },
  { en: 'MILESTONE BOSS', th: 'บอสประจำหลักกิโลเมตร' },
  { en: 'Ascendance Portal', th: 'ประตูมิติสู่หอคอยชั้นถัดไป' },
  { en: 'Spire Reliquary', th: 'คลังวัตถุโบราณหอคอย' },
  { en: 'Exchange', th: 'แลกเปลี่ยน' },
  { en: 'Need More Emblems', th: 'เหรียญตราไม่เพียงพอ' },
  { en: 'Emblems', th: 'เหรียญตรา' },
  { en: 'Highest Floor Cleared', th: 'ชั้นสูงสุดที่เคยพิชิต' },
  { en: 'Total Emblems', th: 'เหรียญตราทั้งหมด' },
  { en: 'Prestige Titles', th: 'ฉายาเกียรติยศ' },
  { en: 'Exchange earned Spire Emblems for ascendant relics and transmogs.', th: 'แลกเปลี่ยนเหรียญตราหอคอยที่ได้รับเพื่อรับวัตถุโบราณและสกินอาวุธระดับก้าวข้าม' },
  { en: 'The Abyssal Spire has been fully conquered!', th: 'หอคอยแห่งอบิสถูกพิชิตอย่างสมบูรณ์แบบแล้ว!' },
  { en: 'Floor Cleared!', th: 'พิชิตชั้นสำเร็จ!' },
  { en: 'Milestone Boss Floor', th: 'ชั้นบอสประจำหลักกิโลเมตร' },
  { en: 'Spire Floor', th: 'หอคอยชั้นที่' },
  { en: 'Title Unlocked', th: 'ปลดล็อกฉายาใหม่' },
  { en: 'Item purchased!', th: 'ซื้อไอเทมสำเร็จ!' },
  { en: 'Ascending to Floor', th: 'กำลังขึ้นสู่ชั้นที่' },
  { en: 'None', th: 'ไม่มี' }
];

// Verify English mode
setLanguage('en');
for (const b of spireBiomes) {
  assert.equal(T(b.en, 'biomes'), b.en, `English biome translation mismatch for: ${b.en}`);
  assert.equal(T(b.en, 'ui'), b.en, `English biome UI translation mismatch for: ${b.en}`);
}
for (const a of spireAffixes) {
  assert.equal(T(a.en, 'affixes'), a.en, `English affix translation mismatch for: ${a.en}`);
  assert.equal(T(a.en, 'ui'), a.en, `English affix UI translation mismatch for: ${a.en}`);
}
for (const boss of spireBosses) {
  assert.equal(T(boss.en, 'monsters'), boss.en, `English boss translation mismatch for: ${boss.en}`);
}
for (const it of spireItems) {
  assert.equal(T(it.en, 'items'), it.en, `English item translation mismatch for: ${it.en}`);
}
for (const ui of spireUiStrings) {
  assert.equal(T(ui.en, 'ui'), ui.en, `English UI translation mismatch for: ${ui.en}`);
}

// Verify Thai mode
setLanguage('th');
for (const b of spireBiomes) {
  assert.equal(T(b.en, 'biomes'), b.th, `Thai biome translation mismatch for: ${b.en}`);
  assert.equal(T(b.en, 'ui'), b.th, `Thai biome UI translation mismatch for: ${b.en}`);
}
for (const a of spireAffixes) {
  assert.equal(T(a.en, 'affixes'), a.th, `Thai affix translation mismatch for: ${a.en}`);
  assert.equal(T(a.en, 'ui'), a.th, `Thai affix UI translation mismatch for: ${a.en}`);
}
for (const boss of spireBosses) {
  assert.equal(T(boss.en, 'monsters'), boss.th, `Thai boss translation mismatch for: ${boss.en}`);
}
for (const it of spireItems) {
  assert.equal(T(it.en, 'items'), it.th, `Thai item translation mismatch for: ${it.en}`);
}
for (const ui of spireUiStrings) {
  assert.equal(T(ui.en, 'ui'), ui.th, `Thai UI translation mismatch for: ${ui.en}`);
}

// Verify Stronghold & Siege Content Dual Localization
const strongholdMonsters = [
  { id: 'siege_grunt', en: 'Siege Grunt', th: 'ทหารราบปิดล้อม' },
  { id: 'siege_hound', en: 'Siege Hound', th: 'สุนัขสงครามปิดล้อม' },
  { id: 'siege_sapper', en: 'Siege Sapper', th: 'หน่วยระเบิดทำลายปิดล้อม' },
  { id: 'siege_archer', en: 'Siege Archer', th: 'พลธนูยิงถล่มปิดล้อม' },
  { id: 'siege_warlord_boss', en: 'Siege Warlord', th: 'แม่ทัพอสูรศึกปิดล้อม' },
];

const strongholdItems = [
  { id: 'iron_ore', en: 'Iron Ore', th: 'แร่เหล็ก' },
  { id: 'beast_fang', en: 'Beast Fang', th: 'เขี้ยวสัตว์อสูร' },
  { id: 'essence_fire', en: 'Fire Essence', th: 'แก่นแท้แห่งไฟ' },
  { id: 'hardwood', en: 'Hardwood', th: 'ไม้เนื้อแข็ง' },
  { id: 'guild_commendation', en: 'Guild Commendation', th: 'เหรียญเกียรติยศกิลด์' },
  { id: 'stronghold_banner', en: 'Stronghold Vanguard Banner', th: 'ธงชัยกองหน้าป้อมปราการ' },
];

const strongholdMaps = [
  { en: 'Guild Stronghold', th: 'ป้อมปราการกิลด์' },
];

const strongholdUiStrings = [
  { en: 'Treasury Vault', th: 'ห้องคลังสมบัติกิลด์' },
  { en: 'Guild Forge', th: 'โรงตีเหล็กกิลด์' },
  { en: 'Botanical Conservatory', th: 'เรือนกระจกพฤกษศาสตร์' },
  { en: 'Tactical Training Grounds', th: 'ลานฝึกยุทธวิธี' },
  { en: 'Colossal Fortitude', th: 'ความทรหดยักษ์ศิลา' },
  { en: 'Singularity Edge', th: 'คมดาบซิงกูลาริตี' },
  { en: 'Zenith Ascendance', th: 'การก้าวข้ามสู่จุดสูงสุด' },
  { en: 'Aetheric Resonance', th: 'คลื่นสะท้อนเอเธอริก' },
  { en: 'Crystal Siege Defense', th: 'การป้องกันคริสตัลกิลด์' },
  { en: 'Commence Siege Defense', th: 'เริ่มการป้องกันการปิดล้อม' },
  { en: 'Crystal Health', th: 'พลังชีวิตของคริสตัล' },
  { en: 'Siege Victory!', th: 'ชัยชนะการป้องกันป้อมปราการ!' },
  { en: 'Defense Failed!', th: 'การป้องกันล้มเหลว!' },
  { en: 'Mount Trophy', th: 'ติดตั้งถ้วยรางวัล' },
  { en: 'Retrieve Trophy', th: 'ปลดถ้วยรางวัลออก' },
  { en: 'Claim Stipend', th: 'รับเบี้ยเลี้ยงประจำวัน' },
  { en: 'Upgrade Facility', th: 'อัปเกรดสิ่งปลูกสร้าง' },
  { en: 'Stronghold Gate Barred', th: 'ประตูป้อมปราการถูกปิดล็อก' },
  { en: 'The Stronghold gate is barred. Prove your valor by reaching Guild Rank D with Elder Maro.', th: 'ประตูป้อมปราการกิลด์ถูกปิดล็อก จงพิสูจน์ความกล้าหาญโดยการเลื่อนระดับเป็นกิลด์แรงก์ D กับผู้อาวุโสมาโรก่อน' },
  { en: 'Foes Remaining', th: 'ศัตรูที่เหลืออยู่' },
  { en: 'WAVE', th: 'เวฟที่' },
  { en: 'Max Tier', th: 'ระดับสูงสุด' },
  { en: 'Facility upgraded!', th: 'อัปเกรดสิ่งปลูกสร้างสำเร็จ!' },
  { en: 'Claimed daily stipend!', th: 'รับเบี้ยเลี้ยงประจำวันแล้ว!' },
  { en: 'Trophy mounted!', th: 'ติดตั้งถ้วยรางวัลสำเร็จ!' },
  { en: 'Trophy retrieved!', th: 'ปลดถ้วยรางวัลสำเร็จ!' },
  { en: 'Claim Commendations', th: 'รับเหรียญเกียรติยศ' },
  { en: 'Guild Points', th: 'คะแนนกิลด์' },
  { en: 'Stronghold Crystal', th: 'คริสตัลป้อมปราการ' },
];

// Verify English mode
setLanguage('en');
for (const m of strongholdMonsters) {
  assert.equal(T(m.en, 'monsters'), m.en, `English monster translation mismatch for: ${m.en}`);
}
for (const it of strongholdItems) {
  assert.ok(CONTENT.items.some(i => i.id === it.id), `Stronghold item exists in CONTENT.items: ${it.id}`);
  assert.equal(T(it.en, 'items'), it.en, `English item translation mismatch for: ${it.en}`);
}
for (const mp of strongholdMaps) {
  assert.equal(T(mp.en, 'maps'), mp.en, `English map translation mismatch for: ${mp.en}`);
}
for (const ui of strongholdUiStrings) {
  assert.equal(T(ui.en, 'ui'), ui.en, `English UI translation mismatch for: ${ui.en}`);
}

// Verify Thai mode
setLanguage('th');
for (const m of strongholdMonsters) {
  assert.equal(T(m.en, 'monsters'), m.th, `Thai monster translation mismatch for: ${m.en}`);
}
for (const it of strongholdItems) {
  assert.equal(T(it.en, 'items'), it.th, `Thai item translation mismatch for: ${it.en}`);
}
for (const mp of strongholdMaps) {
  assert.equal(T(mp.en, 'maps'), mp.th, `Thai map translation mismatch for: ${mp.en}`);
}
for (const ui of strongholdUiStrings) {
  assert.equal(T(ui.en, 'ui'), ui.th, `Thai UI translation mismatch for: ${ui.en}`);
}

// Homestead items, maps, and UI strings
const homesteadItems = [
  { id: 'seed_silverleaf', en: 'Silverleaf Seeds', th: 'เมล็ดซิลเวอร์ลีฟ' },
  { id: 'seed_golden_wheat', en: 'Golden Wheat Seeds', th: 'เมล็ดข้าวสาลีทองคำ' },
  { id: 'seed_moonflower', en: 'Moonflower Seeds', th: 'เมล็ดมูนฟลาวเวอร์' },
  { id: 'seed_ember_blossom', en: 'Ember Blossom Seeds', th: 'เมล็ดเอมเบอร์บลอสซัม' },
  { id: 'golden_grain', en: 'Golden Grain', th: 'รวงข้าวสาลีทองคำ' },
  { id: 'artisan_bread', en: 'Artisan Bread', th: 'ขนมปังฝีมือช่าง' },
];

const homesteadMaps = [
  { en: "Adventurer's Homestead", th: 'บ้านพักนักผจญภัย' },
];

const homesteadUiStrings = [
  { en: 'Botanical Sanctum', th: 'สวนพฤกษศาสตร์ศักดิ์สิทธิ์' },
  { en: 'Companion Pasture', th: 'ทุ่งหญ้าสัตว์เลี้ยง' },
  { en: 'Armory Mannequin', th: 'หุ่นลองชุดเกราะ' },
  { en: 'Cozy Hearth', th: 'เตาผิงอันอบอุ่น' },
  { en: 'Well Rested', th: 'พักผ่อนเต็มอิ่ม' },
  { en: 'Plant Seed', th: 'หว่านเมล็ดพืช' },
  { en: 'Water Plot', th: 'รดน้ำแปลงเพาะปลูก' },
  { en: 'Harvest Crop', th: 'เก็บเกี่ยวผลผลิต' },
  { en: 'Pet Companion', th: 'ลูบหัวสัตว์เลี้ยง' },
  { en: 'Collect Pasture Gifts', th: 'เก็บของขวัญสัตว์เลี้ยงทั้งหมด' },
  { en: 'Equip This Loadout', th: 'สวมใส่ชุดอุปกรณ์นี้' },
  { en: 'Save Current Loadout', th: 'บันทึกชุดอุปกรณ์ปัจจุบัน' },
  { en: 'Retrieve Equipment', th: 'ปลดชุดอุปกรณ์ออก' },
  { en: 'Rest by the Hearth', th: 'พักผ่อนริมเตาผิง' },
  { en: 'The Hearth Portal is dormant. Reach Level 15 and speak with the Oracle to claim your homestead.', th: 'พอร์ทัลบ้านพักยังไม่ทำงาน จงบรรลุเลเวล 15 และคุยกับผู้หยั่งรู้เพื่อรับสิทธิ์เข้าสู่บ้านพักของคุณ' },
];

// Verify English mode
setLanguage('en');
for (const it of homesteadItems) {
  assert.ok(CONTENT.items.some(i => i.id === it.id), `Homestead item exists in CONTENT.items: ${it.id}`);
  assert.equal(T(it.en, 'items'), it.en, `English item translation mismatch for: ${it.en}`);
}
for (const mp of homesteadMaps) {
  assert.equal(T(mp.en, 'maps'), mp.en, `English map translation mismatch for: ${mp.en}`);
}
for (const ui of homesteadUiStrings) {
  assert.equal(T(ui.en, 'ui'), ui.en, `English UI translation mismatch for: ${ui.en}`);
}

// Verify Thai mode
setLanguage('th');
for (const it of homesteadItems) {
  assert.equal(T(it.en, 'items'), it.th, `Thai item translation mismatch for: ${it.en}`);
}
for (const mp of homesteadMaps) {
  assert.equal(T(mp.en, 'maps'), mp.th, `Thai map translation mismatch for: ${mp.en}`);
}
for (const ui of homesteadUiStrings) {
  assert.equal(T(ui.en, 'ui'), ui.th, `Thai UI translation mismatch for: ${ui.en}`);
}

console.log('✔ [PASSED] Localization test: All game data elements are successfully translated in Thai');
