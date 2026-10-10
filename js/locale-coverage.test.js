// Thai coverage: render every panel and tab in Thai and fail on any T() key that has no
// translation in any namespace (T() falls back across namespaces). Add new UI strings to
// js/locale.js `th` — this test names each missing key.
import assert from 'node:assert/strict';
import { createRuntime } from './test-support/runtime.js';
import { L10N } from './locale.js';

const seen = [];
for (const cat of Object.keys(L10N.th)) {
  const tbl = L10N.th[cat];
  L10N.th[cat] = new Proxy(tbl, { get(t, k) { if (typeof k === 'string' && !(k in t)) seen.push(k); return t[k]; } });
}
const { A } = await createRuntime({ nullSelectors: [], strictIds: false, storage: { awo_lang: 'th' } });
A.setLanguage('th');
for (let i = 0; i < 6; i++) A.adminAction('lvl5');
A.adminAction('job5'); A.adminAction('learnall'); A.adminAction('legw');
A.buildHud(); A.updateHud();   // updateHud refreshes the quest tracker too

const G = A.G;
for (const id of ['char', 'inv', 'skills', 'quest', 'adventure', 'automation', 'guide', 'loadouts', 'settings', 'hotkeys', 'guild']) A.panelBody(id);
for (const t of ['road', 'bestiary', 'companions', 'spire', 'stronghold', 'homestead']) { G._chronicleTab = t; A.panelBody('world'); }
for (const t of ['bestiary', 'items', 'elements', 'skills']) { G._bookTab = t; A.panelBody('book'); }
for (const t of ['buy', 'sell', 'enhance', 'craft', 'storage']) { G._shopTab = t; A.panelBody('shop'); }

const anyTh = Object.assign({}, ...Object.values(L10N.th).map(t => ({ ...t })));
const exempt = k => !/[A-Za-z]{2}/.test(k) || /^[A-F][+-]?$/.test(k);   // numbers, glyphs, guild rank letters
const missing = [...new Set(seen)].filter(k => k.trim() && !exempt(k) && !(k in anyTh));
assert.deepEqual(missing, [], `untranslated Thai keys:\n  ${missing.join('\n  ')}`);
console.log('Thai coverage passed.');
