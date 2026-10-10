// Journal (Q) — RO quest window: tabs, list, detail with progress + grouped rewards + Navigate.
import assert from 'node:assert/strict';
import { createRuntime } from './test-support/runtime.js';

const { A } = await createRuntime({ nullSelectors: [], strictIds: false });
const G = A.G;
if (!G.quest && !G.pendingQuest) A.startQuest('q_awaken');

const byStatus = s => A.journalEntries().filter(e => e.status === s);
const story = byStatus('active').find(e => e.cat === 'story');
assert.ok(story, 'the current story quest is an Active entry');
assert.ok(byStatus('available').some(e => e.cat === 'handbook'), 'handbook guides are Available');

G._journalTab = 'active'; G._journalSel = story.key;
let html = A.journalHtml();
assert.ok(html.includes(`data-task="story" data-task-id="${story.quest.id}"`), 'detail has a Navigate button for the story quest');
assert.ok(html.includes('class="jr-meter"'), 'objective shows a progress bar');
for (const [id, n] of Object.entries(story.quest.rewards.items.reduce((m, i) => ((m[i] = (m[i] || 0) + 1), m), {})))
  if (n > 1) assert.ok(html.includes(`×${n}`), `duplicate reward ${id} is grouped`);
assert.ok(!/Grilled Trout, Grilled Trout|Minor Potion, Minor Potion/.test(html), 'no repeated reward names');

// finishing a chapter moves it to Done
const doneBefore = byStatus('done').length;
A.adminAction('skipquest');
assert.ok(byStatus('done').length > doneBefore, 'completed story quest appears under Done');
G._journalTab = 'done';
assert.ok(A.journalHtml().includes('jr-done'), 'Done detail marks completion');

// a guild bounty shows up Active with Navigate + revoke
A.refreshGuildBoard(); const offer = G.guildBoard[0];
assert.ok(offer, 'guild board has an offer');
A.acceptGuild(offer.id);
const b = byStatus('active').find(e => e.cat === 'guild');
assert.ok(b, 'accepted bounty is Active'); G._journalTab = 'active'; G._journalSel = b.key;
assert.ok(A.journalHtml().includes(`data-task="guild" data-task-id="${b.bounty.id}"`), 'bounty Navigate button');

// one-line roadmap replaces the five chapter chips
assert.equal((A.journalHtml().match(/class="jr-dot/g) || []).length, A.CONTENT.storyPhases.length, 'one dot per chapter');
console.log('Journal passed.');
