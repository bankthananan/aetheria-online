// R5 polish (docs/UI_MENU_REDESIGN.md): Book groups monsters by zone with silhouettes,
// dailies and bounties can be started straight from their windows.
import assert from 'node:assert/strict';
import { createRuntime } from './test-support/runtime.js';

const { A } = await createRuntime({ nullSelectors: [], strictIds: false });
const G = A.G;
G._bookTab = 'bestiary';
const book = A.collectionBookHtml();
assert.ok((book.match(/class="book-zone"/g) || []).length >= 3, 'bestiary grouped under zone headers');
assert.ok(book.includes('book-silhouette') && book.includes('???'), 'undiscovered monsters are silhouettes');

A.refreshDailies(); const d = G.dailies.activeDailies[0]; d.progress = 0;
assert.ok(A.panelBody('adventure').includes(`data-task="hunt" data-task-id="${d.targetId}"`), 'unfinished daily offers Hunt');
const route = A.taskAction('hunt', d.targetId);
assert.equal(route?.mode, 'hunt'); assert.equal(route.monsterId, d.targetId); assert.ok(route.mapId, 'hunt route resolves to a zone');

A.refreshGuildBoard();
assert.ok(A.panelBody('guild').includes(`data-guild-go="${G.guildBoard[0].id}"`), 'bounty offers Accept & Go');
console.log('Menu polish passed.');
