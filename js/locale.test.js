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
  'Guild bounty revoked: {name}. No rewards were granted.',
]) assert.notEqual(T(key, 'ui'), key, `Missing translation for runtime guidance: ${key}`);

console.log('✔ [PASSED] Localization test: All game data elements are successfully translated in Thai');
