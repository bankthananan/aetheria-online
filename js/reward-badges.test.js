// Rewards-ready badges (docs/UI_FLOW_DESIGN.md §4): counts come from the same rules the windows use to enable Claim.
import assert from 'node:assert/strict';
import { createRuntime } from './test-support/runtime.js';

const { A, advance } = await createRuntime({ nullSelectors: [], strictIds: false, now: 1000 });
const G = A.G;
const fresh = () => { advance(1500); return A.pendingClaims(); };
const base = fresh();

// a finished daily → Adventures badge, and the Adventures window shows an enabled Claim
A.refreshDailies(); const d = G.dailies.activeDailies[0]; d.progress = d.required;
let c = fresh();
assert.equal(c.adventure, base.adventure + 1, 'ready daily counts toward Adventures');
assert.ok(new RegExp(`data-daily-claim="${d.id}" >`).test(A.panelBody('adventure')), 'the same daily has an enabled Claim button');
A.claimDaily(d.id); c = fresh();
assert.equal(c.adventure, base.adventure, 'claiming clears it');

// a milestone that's done but unclaimed → Book badge
const mile = A.CONTENT.milestones.find(m => m.type === 'kills');
const bookBefore = fresh().book;
G.killCounts.slime = (G.killCounts.slime || 0) + A.milestoneTarget(mile);
c = fresh();
assert.ok(c.book > bookBefore, 'claimable milestone counts toward Book');
A.claimMilestone(mile.id);
assert.equal(fresh().book, c.book - 1, 'claiming the milestone clears one');
assert.equal(c.total, c.adventure + c.book + c.world + c.quest, 'total is the sum');
console.log('Reward badges passed.');
