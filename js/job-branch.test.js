// Second-job branch audit: equal budgets, earned choice, exclusive signatures,
// old-save migration, persistence, and rebirth selection reset.
import assert from 'node:assert/strict';

let clock = 1000;
globalThis.performance = { now: () => clock };
const ctx2d = () => new Proxy({
  measureText: () => ({ width: 10 }),
  createLinearGradient: () => ({ addColorStop() {} }),
  createRadialGradient: () => ({ addColorStop() {} }),
}, { get(target, key) { return key in target ? target[key] : () => {}; } });
function makeEl() {
  return {
    style: { setProperty() {} }, dataset: {}, children: [], textContent: '', innerHTML: '', hidden: false,
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    appendChild(child) { this.children.push(child); child.parentNode = this; return child; },
    remove() {}, addEventListener() {}, removeEventListener() {}, setAttribute() {}, focus() {}, click() {},
    querySelector() { return makeEl(); }, querySelectorAll() { return []; },
    getContext: ctx2d, toDataURL() { return 'data:image/png;base64,'; },
  };
}
const elements = Object.fromEntries(['root', 'hud', 'overlays', 'fx-layer', 'game-canvas', 'quest-tracker'].map(id => [`#${id}`, makeEl()]));
globalThis.window = globalThis;
globalThis.addEventListener = () => {};
globalThis.document = {
  head: makeEl(), body: makeEl(), createElement: makeEl,
  querySelector: selector => elements[selector] || makeEl(), querySelectorAll: () => [],
  getElementById: id => elements[`#${id}`] || null, addEventListener() {}, removeEventListener() {},
};
globalThis.localStorage = {
  _data: {}, getItem(key) { return this._data[key] || null; },
  setItem(key, value) { this._data[key] = String(value); }, removeItem(key) { delete this._data[key]; }, clear() { this._data = {}; },
};
const audioParam = { setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {}, cancelScheduledValues() {} };
const audioNode = { connect() { return this; }, start() {}, stop() {}, gain: audioParam, frequency: audioParam, Q: audioParam };
globalThis.AudioContext = class {
  constructor() { this.currentTime = 0; this.destination = {}; this.state = 'running'; }
  createOscillator() { return { ...audioNode }; } createGain() { return { ...audioNode }; }
  createBiquadFilter() { return { ...audioNode }; }
  createBuffer(_channels, size) { return { getChannelData: () => new Float32Array(size) }; }
  createBufferSource() { return { ...audioNode, buffer: null }; } resume() { return Promise.resolve(); }
};
globalThis.webkitAudioContext = globalThis.AudioContext;
globalThis.requestAnimationFrame = () => 1;
globalThis.setTimeout = () => 0;
globalThis.Image = class {};
globalThis.innerWidth = 1440;
globalThis.innerHeight = 900;

await import('./game.js');
const A = globalThis.__AWO;
assert.ok(A, 'game debug API loaded');

const classIds = A.DESIGN.classes.map(entry => entry.id);
assert.equal(classIds.length, 7, 'all seven base callings remain available');
for (const classId of classIds) {
  const cfg = A.PROGRESSION.jobBranches[classId];
  const budget = A.DESIGN.jobBranchBalance.tierStatPointBudgets[classId];
  assert.equal(cfg.choices.length, 2, `${classId} has exactly two second-job choices`);
  assert.ok(cfg.choices.some(branch => branch.id === cfg.defaultId), `${classId} has a valid migration default`);
  assert.equal(new Set(cfg.choices.map(branch => branch.id)).size, 2, `${classId} branch ids are unique`);
  for (const branch of cfg.choices) {
    for (const ti of [1, 2]) {
      const sum = Object.values(branch.tiers[ti].bonus).reduce((total, value) => total + value, 0);
      assert.equal(sum, budget[ti], `${classId}/${branch.id} Tier ${ti} matches the class budget`);
    }
    const node = A.PROGRESSION.skillTree[branch.signatureSkillId];
    assert.equal(node.reqBranch, branch.id, `${branch.id} owns its signature gate`);
    assert.equal(node.reqTier, 1, `${branch.id} signature unlocks after the second-job promotion`);
    assert.equal(node.reqLevel, 18, `${branch.id} signature respects Job Lv 18`);
  }
  const defaultBranch = cfg.choices.find(branch => branch.id === cfg.defaultId);
  for (const ti of [1, 2]) {
    assert.equal(defaultBranch.tiers[ti].name, A.PROGRESSION.tiers[classId][ti].name, `${classId} keeps its legacy title`);
    assert.deepEqual(defaultBranch.tiers[ti].bonus, A.PROGRESSION.tiers[classId][ti].bonus, `${classId} keeps its legacy bonuses`);
  }
}

const p = A.makePlayer('reborn_blade', 'BranchTester');
A.G.player = p;
p.level = 15; p.jobLevel = 18; p.skillPoints = 8;
A.recompute(p, true);
A.startAdvanceQuest(1);
A.G.advance.progress = A.G.advance.def.objective.count;
const pointsBeforeChoice = p.skillPoints;
A.checkAdvance();
assert.equal(p.tierIndex, 0, 'finishing the Lv15 trial waits for a branch choice');
assert.equal(A.G.advance.choiceReady, true, 'completed trial becomes visibly choice-ready');
A.G.jobChoiceOpen = true; A.G.keys = { d: true };
const pausedX = p.x;
A.step(0.05);
assert.equal(p.x, pausedX, 'the full-screen permanent choice pauses the combat simulation');
A.G.jobChoiceOpen = false; A.G.keys = {};

const choices = A.PROGRESSION.jobBranches.reborn_blade.choices;
const selected = choices[1], rejected = choices[0];
const chooserHtml = A.jobChoicePanelHtml(p);
assert.ok(chooserHtml.includes(selected.tiers[1].name) && chooserHtml.includes(rejected.tiers[1].name), 'chooser clearly compares both paths');
assert.ok(chooserHtml.includes(selected.signatureSkillId) || chooserHtml.includes('Paradox Sever'), 'chooser previews the signature skill');
assert.equal(A.chooseJobBranch(selected.id), true, 'a completed trial accepts one valid branch');
assert.equal(p.jobBranchId, selected.id);
assert.equal(p.tierIndex, 1);
assert.equal(p.className, selected.tiers[1].name);
assert.equal(p.skillPoints, pointsBeforeChoice + 2, 'branch selection grants the promotion points exactly once');
assert.equal(A.chooseJobBranch(rejected.id), false, 'the permanent choice cannot be repeated');
assert.equal(p.skillPoints, pointsBeforeChoice + 2, 'rejected reselection grants no points');

const ownNode = A.PROGRESSION.skillTree[selected.signatureSkillId];
p.skillLevels[ownNode.reqSkill.id] = ownNode.reqSkill.lvl;
assert.equal(A.canLearn(p, selected.signatureSkillId), true, 'selected branch signature is learnable');
const otherNode = A.PROGRESSION.skillTree[rejected.signatureSkillId];
p.skillLevels[otherNode.reqSkill.id] = otherNode.reqSkill.lvl;
assert.equal(A.canLearn(p, rejected.signatureSkillId), false, 'other branch signature stays locked');

assert.equal(A.doPromote(p, 2), true, 'selected path advances at Lv40');
assert.equal(p.jobBranchId, selected.id, 'Lv40 keeps the selected branch');
assert.equal(p.className, selected.tiers[2].name, 'Lv40 uses the branch advanced title');

// Malformed saves cannot retain or hotkey a signature from the other path.
p.skillLevels[rejected.signatureSkillId] = 3;
p.hotbar[2] = { type: 'skill', id: rejected.signatureSkillId };
A.normaliseJobBranch(p);
assert.equal(p.skillLevels[rejected.signatureSkillId], undefined, 'foreign branch rank is removed during normalization');
assert.equal(p.hotbar[2], null, 'foreign branch hotkey is removed during normalization');

// Pre-branch saves migrate to the exact legacy/default path by their old title.
const legacy = A.makePlayer('codeweaver', 'Legacy');
legacy.tierIndex = 2; legacy.className = A.PROGRESSION.tiers.codeweaver[2].name; legacy.jobBranchId = null;
A.normaliseJobBranch(legacy);
assert.equal(legacy.jobBranchId, A.PROGRESSION.jobBranches.codeweaver.defaultId, 'old promoted save selects the compatibility default');
assert.equal(legacy.className, A.PROGRESSION.tiers.codeweaver[2].name, 'old promoted save keeps its title');
const premature = A.makePlayer('far_shot', 'Premature');
premature.jobBranchId = A.PROGRESSION.jobBranches.far_shot.defaultId;
A.normaliseJobBranch(premature);
assert.equal(premature.jobBranchId, null, 'a malformed Tier-0 save cannot bypass the earned choice');

// The choice round-trips through awo_save_v1 and clears only on rebirth.
A.G.player = p; A.G.running = true; A.G.visited.add('town_awakening');
A.saveGame();
const raw = JSON.parse(globalThis.localStorage.getItem('awo_save_v1'));
assert.equal(raw.v, 4, 'new branch save schema is versioned');
assert.equal(raw.player.jobBranchId, selected.id, 'branch id is persisted');
A.G.player = null;
assert.equal(A.resumeGame(), true, 'branch save resumes');
assert.equal(A.G.player.jobBranchId, selected.id, 'branch survives resume');
A.G.player.level = A.DESIGN.levelCap;
assert.equal(A.doRebirth(), true, 'max-level branch character can rebirth');
assert.equal(A.G.player.jobBranchId, null, 'rebirth reopens the second-job choice');
assert.equal(A.G.player.tierIndex, 0, 'rebirth resets the job tier');

A.selfCheck();
console.log('Second-job branch audit passed: 14 paths, equal budgets, exclusive signatures, migration, persistence, and rebirth reset.');
