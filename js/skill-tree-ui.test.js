// Abilities (K) as a tree (docs/UI_MENU_REDESIGN.md §K): one job chapter visible at a time,
// children sit one column right of their prerequisite, click selects, the detail strip learns/binds.
import assert from 'node:assert/strict';
import { createRuntime } from './test-support/runtime.js';

const { A } = await createRuntime({ classId: 'reborn_blade', nullSelectors: [], strictIds: false });
const G = A.G, p = G.player, tree = A.PROGRESSION.skillTree;
p.jobLevel = 15; p.skillPoints = 20;

G._skillTab = 0; G._skillSel = null;
let html = A.skillsPanelHtml(p);
assert.equal((html.match(/class="ro-job-lane[^"]*" data-tier="\d"(?! hidden)>/g) || []).length, 1, 'exactly one chapter visible');
assert.equal((html.match(/data-tier="\d" hidden>/g) || []).length, 3, 'the other three chapters are hidden, not removed');

// column of every first-job child = its parent's column + 1
const col = id => +(html.match(new RegExp(`grid-column:(\\d+);grid-row:\\d+"><button[^>]*data-skill-sel="${id}"`)) || [])[1];
const firstJob = Object.keys(tree).filter(id => tree[id].classId === undefined || true).filter(id => html.includes(`data-skill-sel="${id}"`) && col(id));
let checked = 0;
for (const id of firstJob) { const req = tree[id]?.reqSkill?.id; if (req && col(req) && !(tree[id].reqTier || 0) && !(tree[req].reqTier || 0)) { assert.equal(col(id), col(req) + 1, `${id} sits right of ${req}`); checked++; } }
assert.ok(checked >= 2, 'tree has prerequisite chains laid out left→right');

// no node learns on a single click any more; the detail strip owns Learn
assert.ok(!/class="ro-skill[^"]*"[^>]*data-learn=/.test(html), 'nodes do not carry data-learn');
const learnable = firstJob.find(id => A.canLearn(p, id) && A.skillLevel(p, id) < (tree[id].maxLevel || 1));
assert.ok(learnable, 'some first-job skill is learnable');
G._skillSel = learnable; html = A.skillsPanelHtml(p);
assert.ok(html.includes(`data-learn="${learnable}"`), 'detail strip offers Learn for the selected skill');
const before = A.skillLevel(p, learnable); A.learnSkill(learnable);
assert.equal(A.skillLevel(p, learnable), before + 1, 'learning from the strip raises the level');
assert.ok(A.skillsPanelHtml(p).includes(`data-assign-skill="${learnable}"`), 'a learned active skill can be sent to the bar');

G._skillTab = 2;
assert.ok(/data-tier="2">/.test(A.skillsPanelHtml(p)), 'tab switch shows the advanced chapter');
G._skillTab = 3;
assert.ok(/data-tier="3">/.test(A.skillsPanelHtml(p)), 'tab switch shows the hybrid chapter');
console.log('Skill tree UI passed.');
