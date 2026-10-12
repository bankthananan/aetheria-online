import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHomesteadUIRenderer } from './render/homestead-ui.js';
import { CROP_DEFINITIONS, MANNEQUIN_SLOTS } from './systems/homestead.js';

test('homestead-ui: initializes renderer factory methods', () => {
  const ui = createHomesteadUIRenderer();
  assert.equal(typeof ui.renderPlotModalHtml, 'function');
  assert.equal(typeof ui.renderPastureDialogHtml, 'function');
  assert.equal(typeof ui.renderMannequinModalHtml, 'function');
  assert.equal(typeof ui.renderHearthModalHtml, 'function');
  assert.equal(typeof ui.renderHomesteadOverviewHtml, 'function');
});

test('homestead-ui: renderPlotModalHtml renders empty plot with seed choices', () => {
  const ui = createHomesteadUIRenderer();
  const emptyPlot = { id: 0, stage: 0, cropId: null, watered: false, progressMs: 0, durationMs: 0 };
  const inventory = [
    { itemId: 'seed_silverleaf', qty: 3 },
    { itemId: 'seed_golden_wheat', qty: 0 },
  ];

  const html = ui.renderPlotModalHtml(emptyPlot, inventory);
  assert.ok(html.includes('data-homestead-plant="seed_silverleaf"'), 'renders plant button for available seed');
  assert.ok(html.includes('disabled'), 'disables plant button for unavailable seed');
  assert.ok(html.includes('box-sizing: border-box'), 'enforces box-sizing containment');
  assert.ok(html.includes('overflow-x: hidden'), 'enforces overflow containment');
  assert.ok(html.includes('min-width: 0'), 'enforces min-width: 0 containment');
});

test('homestead-ui: renderPlotModalHtml renders growing and mature crop stages', () => {
  const ui = createHomesteadUIRenderer();
  const growingPlot = {
    id: 1,
    stage: 1,
    cropId: 'seed_silverleaf',
    watered: false,
    progressMs: 60000,
    durationMs: 300000,
  };
  const growingHtml = ui.renderPlotModalHtml(growingPlot, []);
  assert.ok(growingHtml.includes('data-homestead-water="1"'), 'renders water plot action');
  assert.ok(growingHtml.includes('20%'), 'renders progress percentage');

  const maturePlot = {
    id: 2,
    stage: 3,
    cropId: 'seed_golden_wheat',
    watered: true,
    progressMs: 480000,
    durationMs: 480000,
  };
  const matureHtml = ui.renderPlotModalHtml(maturePlot, []);
  assert.ok(matureHtml.includes('data-homestead-harvest="2"'), 'renders harvest plot action');
  assert.ok(matureHtml.includes('box-sizing: border-box'));
});

test('homestead-ui: renderPastureDialogHtml renders companion roster and gift collection', () => {
  const ui = createHomesteadUIRenderer();
  const ownedPets = {
    wolf_pup: { id: 'wolf_pup', name: 'Wolf Pup', loyalty: 45 },
    slime_companion: { id: 'slime_companion', name: 'Slime Companion', loyalty: 85 },
  };
  const pendingGifts = [
    { itemId: 'slime_gel', qty: 4 },
    { itemId: 'golden_grain', qty: 2 },
  ];

  const html = ui.renderPastureDialogHtml(ownedPets, pendingGifts);
  assert.ok(html.includes('data-homestead-pet="wolf_pup"'), 'renders pet button');
  assert.ok(html.includes('data-homestead-pet="slime_companion"'), 'renders pet button');
  assert.ok(html.includes('data-homestead-collect-gifts="1"'), 'renders collect gifts button');
  assert.ok(html.includes('box-sizing: border-box'));
  assert.ok(html.includes('min-width: 0'));
  assert.ok(html.includes('overflow-x: hidden'));
});

test('homestead-ui: renderMannequinModalHtml renders side-by-side comparison and 1-click swap', () => {
  const ui = createHomesteadUIRenderer();
  const mannequinLoadout = {
    weapon: { itemId: 'hero_blade', plus: 5 },
    head: { itemId: 'iron_helm' },
    body: null,
  };
  const playerEquip = {
    weapon: { itemId: 'wooden_sword' },
    head: null,
    body: { itemId: 'cloth_armor' },
  };

  const html = ui.renderMannequinModalHtml('mannequin_a', mannequinLoadout, playerEquip);
  assert.ok(html.includes('data-homestead-swap-mannequin="mannequin_a"'), 'renders equip 1-click swap action');
  assert.ok(html.includes('data-homestead-store-mannequin="mannequin_a"'), 'renders save loadout action');
  assert.ok(html.includes('data-homestead-retrieve-mannequin="mannequin_a"'), 'renders retrieve equipment action');
  assert.ok(html.includes('box-sizing: border-box'));
  assert.ok(html.includes('min-width: 0'));
});

test('homestead-ui: renderHearthModalHtml renders rest button and Well Rested buff countdown', () => {
  const ui = createHomesteadUIRenderer();
  const activeHtml = ui.renderHearthModalHtml(true, 1200000);
  assert.ok(activeHtml.includes('Well Rested'), 'displays active buff label');
  assert.ok(activeHtml.includes('data-homestead-rest-hearth="1"'), 'displays rest button');

  const inactiveHtml = ui.renderHearthModalHtml(false, 0);
  assert.ok(inactiveHtml.includes('data-homestead-rest-hearth="1"'));
  assert.ok(inactiveHtml.includes('box-sizing: border-box'));
  assert.ok(inactiveHtml.includes('min-width: 0'));
  assert.ok(inactiveHtml.includes('overflow-x: hidden'));
});

test('homestead-ui: renderHomesteadOverviewHtml renders cohesive dashboard with strict containment', () => {
  const ui = createHomesteadUIRenderer();
  const homesteadState = {
    plots: [
      { id: 0, stage: 0, cropId: null, watered: false },
      { id: 1, stage: 3, cropId: 'seed_silverleaf', watered: true },
    ],
    mannequins: {
      mannequin_a: { id: 'mannequin_a', loadout: {} },
      mannequin_b: { id: 'mannequin_b', loadout: {} },
    },
    hearthBuffExpiresAt: 0,
    pendingPastureGifts: [{ itemId: 'silverleaf', qty: 2 }],
  };

  const html = ui.renderHomesteadOverviewHtml(homesteadState, {}, { pet_1: { id: 'pet_1', name: 'Sprite', loyalty: 50 } });
  assert.ok(html.includes('Botanical Sanctum'), 'includes garden section');
  assert.ok(html.includes('Companion Pasture'), 'includes pasture section');
  assert.ok(html.includes('Armory Mannequins'), 'includes mannequin section');
  assert.ok(html.includes('Cozy Hearth'), 'includes hearth section');
  assert.ok(html.includes('box-sizing: border-box'));
  assert.ok(html.includes('min-width: 0'));
  assert.ok(html.includes('overflow-x: hidden'));
});

test('homestead-ui: renderCulinaryDialogHtml renders feasts, cook buttons and card transmutation', () => {
  const ui = createHomesteadUIRenderer();
  const inventory = [
    { itemId: 'produce_golden_wheat', qty: 5 },
    { itemId: 'produce_silverleaf', qty: 5 },
    { id: 'card_slime', qty: 3 }
  ];

  const html = ui.renderCulinaryDialogHtml(inventory);
  assert.ok(html.includes('data-homestead-cook="artisan_hearth_bread"'), 'renders cook button for feast');
  assert.ok(html.includes('data-homestead-transmute="1"'), 'renders card transmutation button');
  assert.ok(html.includes('box-sizing: border-box'));
  assert.ok(html.includes('min-width: 0'));
  assert.ok(html.includes('overflow-x: hidden'));
});

