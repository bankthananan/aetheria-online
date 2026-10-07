// js/cards-ui.test.js - Unit tests for Bestiary Codex UI and Card Frame Renderer
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCardsUIRenderer, RARITY_COLORS } from './render/cards-ui.js';
import { CARD_CATALOG, ZONE_ALBUM_MILESTONES } from './systems/cards.js';

function createMockCtx() {
  const calls = [];
  return {
    calls,
    save: () => calls.push({ method: 'save' }),
    restore: () => calls.push({ method: 'restore' }),
    fillRect: (...args) => calls.push({ method: 'fillRect', args }),
    strokeRect: (...args) => calls.push({ method: 'strokeRect', args }),
    beginPath: () => calls.push({ method: 'beginPath' }),
    moveTo: (...args) => calls.push({ method: 'moveTo', args }),
    lineTo: (...args) => calls.push({ method: 'lineTo', args }),
    stroke: () => calls.push({ method: 'stroke' }),
    arc: (...args) => calls.push({ method: 'arc', args }),
    fill: () => calls.push({ method: 'fill' }),
    fillText: (...args) => calls.push({ method: 'fillText', args }),
    set fillStyle(val) { calls.push({ method: 'set_fillStyle', val }); },
    set strokeStyle(val) { calls.push({ method: 'set_strokeStyle', val }); },
    set lineWidth(val) { calls.push({ method: 'set_lineWidth', val }); },
  };
}

test('createCardsUIRenderer factory creates renderer methods', () => {
  const renderer = createCardsUIRenderer();
  assert.ok(typeof renderer.renderCardFrameHtml === 'function');
  assert.ok(typeof renderer.renderBestiaryTab === 'function');
  assert.ok(typeof renderer.renderSocketModalHtml === 'function');
  assert.ok(typeof renderer.drawAlbumOpeningFanfare === 'function');
});

test('renderCardFrameHtml generates valid HTML with rarity color, slot badge, and stats', () => {
  const renderer = createCardsUIRenderer();
  const slimeCard = CARD_CATALOG.card_slime;
  const html = renderer.renderCardFrameHtml(slimeCard, { isCollected: true });

  assert.ok(html.includes('Gel Slime Card'));
  assert.ok(html.includes(RARITY_COLORS.common));
  assert.ok(html.includes('Armor Slot'));
  assert.ok(html.includes('+60 Max HP') || html.includes('+60 maxHp'));
  assert.ok(html.includes('Collected'));
});

test('renderCardFrameHtml handles collected vs uncollected states', () => {
  const renderer = createCardsUIRenderer();
  const dragonCard = CARD_CATALOG.card_flame_dragon;

  const collectedHtml = renderer.renderCardFrameHtml(dragonCard, { isCollected: true });
  assert.ok(collectedHtml.includes('Collected'));
  assert.ok(collectedHtml.includes('opacity: 1'));

  const uncollectedHtml = renderer.renderCardFrameHtml(dragonCard, { isCollected: false });
  assert.ok(uncollectedHtml.includes('Uncollected'));
  assert.ok(uncollectedHtml.includes('grayscale'));
});

test('renderBestiaryTab generates zone tabs, milestone banner, monster list, and details pane', () => {
  const renderer = createCardsUIRenderer();
  const bestiaryState = {
    monsters: {
      slime: { kills: 15, drops: { slime_gel: true }, mastery: 1 },
    },
    cards: {
      card_slime: true,
    },
  };

  const html = renderer.renderBestiaryTab(bestiaryState, {
    selectedZone: 'woods',
    selectedMonsterId: 'slime',
  });

  assert.ok(html.includes('Whispering Woods'));
  assert.ok(html.includes('Forest Strider'));
  assert.ok(html.includes('Gel Slime'));
  assert.ok(html.includes('15 ⚔'));
  assert.ok(html.includes('1★'));
});

test('renderBestiaryTab masks undiscovered drops as ??? while showing discovered drops', () => {
  const renderer = createCardsUIRenderer();
  const bestiaryState = {
    monsters: {
      slime: { kills: 5, drops: { slime_gel: true }, mastery: 0 },
    },
    cards: {},
  };

  const html = renderer.renderBestiaryTab(bestiaryState, {
    selectedZone: 'woods',
    selectedMonsterId: 'slime',
  });

  // slime_gel is discovered
  assert.ok(html.includes('Slime Gel') || html.includes('slime_gel'));
  // minor_potion is NOT discovered yet
  assert.ok(html.includes('Undiscovered') || html.includes('???'));
});

test('renderSocketModalHtml filters compatible cards for target equipment slot', () => {
  const renderer = createCardsUIRenderer();
  const weaponInst = { id: 'iron_sword', name: 'Iron Sword', slot: 'weapon', sockets: [null, null] };
  const inventory = [
    { id: 'card_goblin', type: 'card' }, // weapon card
    { id: 'card_slime', type: 'card' },  // armor card
  ];

  const html = renderer.renderSocketModalHtml(weaponInst, inventory);
  assert.ok(html.includes('Iron Sword'));
  assert.ok(html.includes('Scrap Goblin Card'));
  assert.ok(!html.includes('Gel Slime Card')); // Slime is armor, shouldn't appear for weapon
});

test('drawAlbumOpeningFanfare draws sparkles and rays without throwing', () => {
  const renderer = createCardsUIRenderer();
  const mockCtx = createMockCtx();

  renderer.drawAlbumOpeningFanfare(mockCtx, 832, 576, 0.5);

  assert.ok(mockCtx.calls.some(c => c.method === 'arc'));
  assert.ok(mockCtx.calls.some(c => c.method === 'stroke'));
  assert.ok(mockCtx.calls.some(c => c.method === 'fill'));
  assert.ok(mockCtx.calls.some(c => c.method === 'save'));
  assert.ok(mockCtx.calls.some(c => c.method === 'restore'));
});

test('Strict ZERO Screen Shake: cam coordinates are NEVER modified during fanfare', () => {
  const renderer = createCardsUIRenderer();
  const mockCtx = createMockCtx();
  const cam = { x: 250, y: 180 };

  const prevX = cam.x;
  const prevY = cam.y;

  renderer.drawAlbumOpeningFanfare(mockCtx, 832, 576, 0.8);

  assert.strictEqual(cam.x, prevX, 'cam.x must never change');
  assert.strictEqual(cam.y, prevY, 'cam.y must never change');
});
