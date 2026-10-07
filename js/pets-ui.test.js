// js/pets-ui.test.js
// Unit tests for Companion Chronicle Tab and Modal UI Renderer.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createPetsUIRenderer, PET_DETAILS, FEAST_DETAILS } from './render/pets-ui.js';
import { PET_CATALOG, FEAST_VALUES } from './systems/pets.js';

test('1. createPetsUIRenderer factory returns render methods', () => {
  const ui = createPetsUIRenderer();
  assert.ok(typeof ui === 'object' && ui !== null, 'factory returns an object');
  assert.equal(typeof ui.renderCompanionsTab, 'function', 'renderCompanionsTab is a function');
  assert.equal(typeof ui.renderFeedModalHtml, 'function', 'renderFeedModalHtml is a function');
});

test('2. renderCompanionsTab renders empty/unsummoned state cleanly', () => {
  const ui = createPetsUIRenderer();

  // Test with null, undefined, empty object
  const htmlNull = ui.renderCompanionsTab(null);
  assert.ok(htmlNull.includes('No Active Companion Summoned'), 'handles null petsState');
  assert.ok(htmlNull.includes('Summon an owned companion from your roster below'), 'contains summon prompt');

  const htmlEmpty = ui.renderCompanionsTab({ activePetId: null, owned: {} });
  assert.ok(htmlEmpty.includes('No Active Companion Summoned'), 'handles empty activePetId');
  assert.ok(htmlEmpty.includes('empty'), 'contains empty class on banner');

  const htmlInvalidId = ui.renderCompanionsTab({ activePetId: 'nonexistent', owned: {} });
  assert.ok(htmlInvalidId.includes('No Active Companion Summoned'), 'handles activePetId not found in owned');
});

test('3. renderCompanionsTab renders active companion showcase with bond level, loyalty, and aura pills', () => {
  const ui = createPetsUIRenderer();
  const petsState = {
    activePetId: 'pet_slime',
    owned: {
      pet_slime: {
        id: 'pet_slime',
        name: 'Gel Slime',
        bondLevel: 4,
        loyalty: 85,
        exp: 600,
      },
    },
  };

  const html = ui.renderCompanionsTab(petsState, []);

  // Companion identification & devotion
  assert.ok(html.includes('Gel Slime'), 'displays active companion name');
  assert.ok(html.includes('★ Devoted'), 'displays Devoted badge when loyalty >= 80');
  assert.ok(html.includes('Bond Lv.'), 'displays bond level label');
  assert.ok(html.includes('4</b>'), 'displays bond level value 4');
  assert.ok(html.includes('85/100'), 'displays loyalty score');
  assert.ok(html.includes('85%'), 'displays loyalty percentage');

  // Controls
  assert.ok(html.includes('data-dismiss-pet="1"'), 'includes [Dismiss] button with data-dismiss-pet="1"');

  // Aura pills preview (HP regen, Auto-Loot radius)
  assert.ok(html.includes('aura-pill'), 'renders aura pill elements');
  assert.ok(html.includes('HP regen'), 'renders HP regen aura pill');
  assert.ok(html.includes('Auto-Loot radius'), 'renders Auto-Loot radius pill');

  // Verify another companion with ATK% and loyalty < 80 (not devoted)
  const wolfState = {
    activePetId: 'pet_wolf',
    owned: {
      pet_wolf: {
        id: 'pet_wolf',
        name: 'Timber Wolf Pup',
        bondLevel: 2,
        loyalty: 50,
        exp: 150,
      },
    },
  };
  const wolfHtml = ui.renderCompanionsTab(wolfState, []);
  assert.ok(wolfHtml.includes('Timber Wolf Pup'), 'displays wolf name');
  assert.ok(!wolfHtml.includes('★ Devoted'), 'no Devoted badge when loyalty < 80');
  assert.ok(wolfHtml.includes('ATK'), 'renders ATK aura pill for wolf');
  assert.ok(wolfHtml.includes('Auto-Loot radius'), 'renders Auto-Loot radius pill for wolf');

  // Verify bear companion with DEF%
  const bearState = {
    activePetId: 'pet_bear',
    owned: {
      pet_bear: {
        id: 'pet_bear',
        name: 'Glacial Bear Cub',
        bondLevel: 3,
        loyalty: 90,
        exp: 300,
      },
    },
  };
  const bearHtml = ui.renderCompanionsTab(bearState, []);
  assert.ok(bearHtml.includes('DEF'), 'renders DEF aura pill for bear');
});

test('4. renderCompanionsTab renders feast quick-feed tray with available meals in inventory', () => {
  const ui = createPetsUIRenderer();
  const petsState = {
    activePetId: 'pet_slime',
    owned: {
      pet_slime: {
        id: 'pet_slime',
        name: 'Gel Slime',
        bondLevel: 1,
        loyalty: 30,
        exp: 0,
      },
    },
  };

  // 1. With feast items in inventory
  const inventoryWithMeals = [
    { itemId: 'grilled_trout', qty: 3 },
    { itemId: 'smoked_salmon', qty: 1 },
    { itemId: 'iron_ore', qty: 10 }, // unrelated item
  ];

  const html = ui.renderCompanionsTab(petsState, inventoryWithMeals);

  assert.ok(html.includes('Feast Quick-Feed Tray'), 'contains feast tray header');
  assert.ok(html.includes('Grilled Trout'), 'displays Grilled Trout');
  assert.ok(html.includes('×3'), 'displays quantity 3 for grilled trout');
  assert.ok(html.includes('Smoked Salmon'), 'displays Smoked Salmon');
  assert.ok(html.includes('×1'), 'displays quantity 1 for smoked salmon');
  assert.ok(html.includes('+15 Loyalty'), 'displays Grilled Trout loyalty gain');
  assert.ok(html.includes('+50 EXP'), 'displays Grilled Trout EXP gain');
  assert.ok(html.includes('data-feed-pet-id="pet_slime"'), 'feed button has pet ID attribute');
  assert.ok(html.includes('data-feast-id="grilled_trout"'), 'feed button has feast ID attribute');
  assert.ok(html.includes('data-feast-id="smoked_salmon"'), 'feed button has smoked salmon feast ID');

  // 2. Empty inventory / no feast items
  const htmlEmpty = ui.renderCompanionsTab(petsState, [{ itemId: 'iron_ore', qty: 5 }]);
  assert.ok(
    htmlEmpty.includes('Cook feasts via Fishing & Alchemy to feed your companion!'),
    'displays polite hint when no feasts are available in inventory'
  );
});

test('5. renderCompanionsTab renders 5 roster cards with untamed hints and bait requirements', () => {
  const ui = createPetsUIRenderer();
  const petsState = {
    activePetId: 'pet_slime',
    owned: {
      pet_slime: {
        id: 'pet_slime',
        name: 'Gel Slime',
        bondLevel: 2,
        loyalty: 40,
        exp: 110,
      },
      pet_wolf: {
        id: 'pet_wolf',
        name: 'Timber Wolf Pup',
        bondLevel: 1,
        loyalty: 20,
        exp: 0,
      },
    },
  };

  const html = ui.renderCompanionsTab(petsState, []);

  // All 5 catalog companions present
  assert.ok(html.includes('Gel Slime'), 'contains slime');
  assert.ok(html.includes('Timber Wolf Pup'), 'contains wolf');
  assert.ok(html.includes('Blight Sprite'), 'contains sprite');
  assert.ok(html.includes('Glacial Bear Cub'), 'contains bear');
  assert.ok(html.includes('Magma Hatchling'), 'contains dragon');

  // Owned active pet (slime) shows active badge
  assert.ok(html.includes('✓ Summoned') || html.includes('Summoned'), 'shows summoned badge for active pet');

  // Owned non-active pet (wolf) shows summon button
  assert.ok(html.includes('data-summon-pet="pet_wolf"'), 'shows summon button for owned inactive pet');

  // Untamed pets (sprite, bear, dragon) show [Untamed] badge and taming requirements
  assert.ok(html.includes('[Untamed]'), 'shows untamed badge');
  assert.ok(html.includes('Sunken Ruins / Astral Rift'), 'shows sprite wild habitat');
  assert.ok(html.includes('Luminous Nectar'), 'shows sprite required bait');
  assert.ok(html.includes('Frostpeak Tundra'), 'shows bear wild habitat');
  assert.ok(html.includes('Glacial Salmon Nibble'), 'shows bear required bait');
  assert.ok(html.includes('Dragon Caldera'), 'shows dragon wild habitat');
  assert.ok(html.includes('Magma Berry Cluster'), 'shows dragon required bait');
});

test('6. renderFeedModalHtml generates modal shell with close button and feed options', () => {
  const ui = createPetsUIRenderer();
  const pet = {
    id: 'pet_wolf',
    name: 'Timber Wolf Pup',
    bondLevel: 3,
    loyalty: 82,
    exp: 300,
  };
  const inventory = [
    { itemId: 'golden_carp_sashimi', qty: 2 },
  ];

  const html = ui.renderFeedModalHtml(pet, inventory);

  // Modal shell & overlay
  assert.ok(html.includes('pet-modal-overlay'), 'has .pet-modal-overlay class');
  assert.ok(html.includes('pet-modal-shell'), 'has .pet-modal-shell class');
  assert.ok(html.includes('role="dialog"'), 'has dialog accessibility role');
  assert.ok(html.includes('aria-modal="true"'), 'has aria-modal="true" for focus trapping');

  // Close button
  assert.ok(html.includes('pet-modal-close'), 'has .pet-modal-close class');
  assert.ok(html.includes('data-modal-close="true"'), 'has data-modal-close attribute');

  // Companion info & devotion
  assert.ok(html.includes('Timber Wolf Pup'), 'displays pet name');
  assert.ok(html.includes('★ Devoted'), 'displays devotion badge when loyalty >= 80');
  assert.ok(html.includes('Bond Lv. 3'), 'displays bond level');

  // Feed options
  assert.ok(html.includes('Golden Carp Sashimi'), 'displays Golden Carp Sashimi');
  assert.ok(html.includes('×2'), 'displays quantity');
  assert.ok(html.includes('data-feed-pet-id="pet_wolf"'), 'feed button has pet id');
  assert.ok(html.includes('data-feast-id="golden_carp_sashimi"'), 'feed button has feast id');

  // Empty inventory case
  const emptyHtml = ui.renderFeedModalHtml(pet, []);
  assert.ok(
    emptyHtml.includes('Cook feasts via Fishing & Alchemy to feed your companion!'),
    'modal displays hint when no feast items available'
  );

  // Null input case
  const nullHtml = ui.renderFeedModalHtml(null, []);
  assert.equal(nullHtml, '', 'returns empty string on null pet');
});

test('7. Boxing containment: verify output HTML uses box-sizing: border-box and min-width: 0 on containers', () => {
  const ui = createPetsUIRenderer();
  const petsState = {
    activePetId: 'pet_slime',
    owned: {
      pet_slime: {
        id: 'pet_slime',
        name: 'Gel Slime',
        bondLevel: 2,
        loyalty: 50,
      },
    },
  };
  const inventory = [{ itemId: 'grilled_trout', qty: 1 }];

  const tabHtml = ui.renderCompanionsTab(petsState, inventory);
  const modalHtml = ui.renderFeedModalHtml(petsState.owned.pet_slime, inventory);

  // Tab containment checks
  assert.ok(tabHtml.includes('box-sizing: border-box'), 'tab HTML specifies box-sizing: border-box');
  assert.ok(tabHtml.includes('min-width: 0'), 'tab HTML specifies min-width: 0 for blowout prevention');
  assert.ok(tabHtml.includes('overflow-x: hidden'), 'tab HTML specifies overflow-x: hidden');
  assert.ok(tabHtml.includes('width: 100%'), 'tab HTML specifies width: 100%');
  assert.ok(tabHtml.includes('max-width: 100%'), 'tab HTML specifies max-width: 100%');

  // Modal containment checks
  assert.ok(modalHtml.includes('box-sizing: border-box'), 'modal HTML specifies box-sizing: border-box');
  assert.ok(modalHtml.includes('min-width: 0'), 'modal HTML specifies min-width: 0');
  assert.ok(modalHtml.includes('overflow-x: hidden'), 'modal HTML specifies overflow-x: hidden');
  assert.ok(modalHtml.includes('pet-modal-overlay'), 'modal overlay present');
  assert.ok(modalHtml.includes('pet-modal-shell'), 'modal shell present');
});
