import assert from 'node:assert/strict';
import test from 'node:test';
import {
  searchGameIndex,
  renderCommandPaletteHtml,
  executeCommandAction,
} from './render/command-palette.js';

test('searchGameIndex returns matching zones, monsters, items, and panels for query', () => {
  const G = {
    mapId: 'town_awakening',
    guardiansSlain: new Set(['ancient_treant']),
    player: {
      level: 25,
      zeny: 5000,
      inventory: [{ itemId: 'iron_sword', qty: 1 }],
    },
  };

  // Empty query returns top featured shortcuts across categories
  const featured = searchGameIndex('', G);
  assert.ok(featured.length > 0, 'Returns default featured shortcuts when query is empty');

  // Zone query
  const zones = searchGameIndex('Whispering Woods', G);
  assert.ok(zones.some(r => r.category === 'zone' && r.id === 'whispering_woods'), 'Finds Whispering Woods zone');

  // Monster query
  const monsters = searchGameIndex('Slime', G);
  assert.ok(monsters.some(r => r.category === 'monster' && r.id === 'slime'), 'Finds Gel Slime monster');

  // Item query
  const items = searchGameIndex('Iron Sword', G);
  assert.ok(items.some(r => r.category === 'item' && r.id === 'iron_sword'), 'Finds Iron Sword item');

  // Panel query
  const panels = searchGameIndex('Spire', G);
  assert.ok(panels.some(r => r.category === 'panel' && r.id === 'panel_spire'), 'Finds Abyssal Spire panel shortcut');
});

test('renderCommandPaletteHtml renders accessible search input and result rows with active index', () => {
  const results = [
    {
      id: 'whispering_woods',
      category: 'zone',
      icon: '🌲',
      title: 'Whispering Woods',
      subtitle: 'Lv 1–15 · Unlocked',
      actionLabel: 'Fast Travel / Route',
    },
  ];
  const html = renderCommandPaletteHtml({ query: 'Whisp', results, activeIndex: 0 });
  assert.ok(html.includes('cmd-palette-modal'), 'Contains modal root class');
  assert.ok(html.includes('Whispering Woods'), 'Contains result title');
  assert.ok(html.includes('is-active'), 'Marks index 0 as active');
});

test('executeCommandAction routes zones, monsters, items, and panels appropriately', () => {
  const calls = [];
  const mockEngine = {
    G: {
      mapId: 'town_awakening',
      guardiansSlain: new Set(),
      player: {
        level: 20,
        zeny: 5000,
        inventory: [{ itemId: 'iron_sword', qty: 1 }],
      },
    },
    loadMap: (m) => calls.push(['loadMap', m]),
    activateWorldRoute: (m) => calls.push(['activateWorldRoute', m]),
    activateTaskGuide: (src, id) => calls.push(['activateTaskGuide', src, id]),
    togglePanel: (p) => calls.push(['togglePanel', p]),
  };

  // 1. Panel jump
  const resPanel = executeCommandAction({ id: 'panel_spire', category: 'panel', panelId: 'world', subTab: 'spire' }, mockEngine);
  assert.equal(resPanel.ok, true);
  assert.equal(mockEngine.G._chronicleTab, 'spire');
  assert.ok(calls.some(c => c[0] === 'togglePanel' && c[1] === 'world'));

  // 2. Zone fast travel (Whispering Woods is unlocked)
  const resZone = executeCommandAction({ id: 'whispering_woods', category: 'zone' }, mockEngine);
  assert.equal(resZone.ok, true);
  assert.ok(calls.some(c => c[0] === 'loadMap' && c[1] === 'whispering_woods'));

  // 3. Item owned -> opens Satchel
  const resItem = executeCommandAction({ id: 'iron_sword', category: 'item' }, mockEngine);
  assert.equal(resItem.ok, true);
  assert.ok(calls.some(c => c[0] === 'togglePanel' && c[1] === 'inv'));
});
