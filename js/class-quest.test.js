// Class calling trials: after the guild intro, the story forks to the hero's
// class trial (kill or collect), then every branch merges back into q_prove.
import assert from 'node:assert/strict';

import { installBrowserEnv } from './test-support/browser-env.js';

let vnow = 0;

installBrowserEnv({
  now: () => vnow,
  innerWidth: 1440,
  innerHeight: 900,
  nullSelectors: [],
  strictIds: false,
});

// installed after the env so it replaces the fixture's no-op setTimeout
// quest chains advance via setTimeout — queue callbacks and flush them explicitly
let pendingTimers = [];
globalThis.setTimeout = fn => { pendingTimers.push(fn); return 0; };
const flush = () => { const fns = pendingTimers; pendingTimers = []; fns.forEach(fn => { try { fn(); } catch {} }); };

const { DESIGN } = await import('./design.js');
const { CONTENT } = await import('./content.js');
await import('./game.js');
const A = globalThis.__AWO;
assert.ok(A, 'game debug API loaded');

const questById = Object.fromEntries(CONTENT.quests.map(q => [q.id, q]));

for (const cls of DESIGN.classes) {
  pendingTimers = [];
  const p = A.makePlayer(cls.id, 'Trials');
  p.level = 5;
  A.G.player = p;
  A.buildHud();
  A.recompute(p, true);
  A.loadMap('town_awakening');
  A.G.quest = null; A.G.pendingQuest = null; A.G.killCounts = {};
  flush();

  A.startQuest('q_guild_intro', true);
  assert.equal(A.G.quest, 'q_guild_intro', `${cls.id}: guild intro starts`);
  A.G.talked.add('elder');
  A.checkQuest();
  flush();

  const trialId = `q_calling_${cls.id}`;
  assert.equal(A.G.quest, trialId, `${cls.id}: story forks to its own calling trial`);

  const trial = questById[trialId];
  if (trial.objective.type === 'kill') {
    A.G.killCounts[trial.objective.target] = trial.objective.count;
  } else {
    A.addItem(trial.objective.target, trial.objective.count);
  }
  A.checkQuest();
  flush();
  assert.equal(A.G.quest, 'q_prove', `${cls.id}: trial merges back into q_prove`);
  if (trial.objective.type === 'collect') {
    const left = p.inventory.find(e => e.itemId === trial.objective.target)?.qty || 0;
    assert.equal(left, 0, `${cls.id}: collect trial consumes its materials on turn-in`);
  }
}

console.log(`Class trial audit passed: all ${DESIGN.classes.length} classes fork to their calling and merge into q_prove.`);
