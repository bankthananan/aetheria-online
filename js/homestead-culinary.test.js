import assert from 'node:assert/strict';
import test from 'node:test';
import { createHomesteadSystem, CULINARY_FEASTS } from './systems/homestead.js';
import { CONTENT } from './content.js';

test('homestead culinary feasts and buff application', () => {
  assert.ok(CULINARY_FEASTS, 'CULINARY_FEASTS catalog must exist');
  assert.ok(CULINARY_FEASTS.artisan_hearth_bread, 'artisan_hearth_bread feast must exist');
  assert.ok(CULINARY_FEASTS.pan_seared_salmon, 'pan_seared_salmon feast must exist');
  assert.ok(CULINARY_FEASTS.celestial_banquet, 'celestial_banquet feast must exist');

  const hs = createHomesteadSystem();
  const player = {
    inventory: [
      { id: 'produce_golden_wheat', qty: 5 },
      { id: 'produce_silverleaf', qty: 5 }
    ],
    buffs: {}
  };

  const res = hs.cookFeast(player, 'artisan_hearth_bread');
  assert.ok(res.success, 'Cooking feast with valid ingredients must succeed');
  assert.ok(player.buffs.artisan_hearth_bread, 'Player must receive feast buff');
  assert.ok(player.buffs.artisan_hearth_bread.durationMs >= 1800000, 'Feast buff duration must be >= 30m');

  // Transmutation test
  player.inventory.push(
    { id: 'card_slime', qty: 3 }
  );
  const transRes = hs.transmuteCards(player, ['card_slime', 'card_slime', 'card_slime']);
  assert.ok(transRes && transRes.success, 'Transmutation of 3 cards must succeed');
  assert.ok(player.inventory.some(i => i.id === 'old_card_album'), 'Transmutation awards old_card_album');

  // Array buffs support and altId ingredient support test
  const arrayPlayer = {
    inventory: [
      { id: 'golden_grain', qty: 2 },
      { id: 'silverleaf', qty: 2 },
      { id: 'glacial_salmon', qty: 1 },
      { id: 'ember_blossom', qty: 1 },
      { id: 'cosmic_jellyfish', qty: 1 },
      { id: 'moonlight_lotus', qty: 2 }
    ],
    buffs: []
  };

  const breadRes = hs.cookFeast(arrayPlayer, 'artisan_hearth_bread');
  assert.ok(breadRes.success, 'Cooking feast with altId ingredients must succeed');
  assert.ok(arrayPlayer.buffs.some(b => b.id === 'artisan_hearth_bread'), 'Array buffs must receive feast buff');
  assert.ok(arrayPlayer.buffs.artisan_hearth_bread, 'Array buffs must have feast property assigned');

  const salmonRes = hs.cookFeast(arrayPlayer, 'pan_seared_salmon');
  assert.ok(salmonRes.success, 'Cooking pan-seared salmon must succeed');
  assert.ok(arrayPlayer.buffs.some(b => b.id === 'pan_seared_salmon'));

  const banquetRes = hs.cookFeast(arrayPlayer, 'celestial_banquet');
  assert.ok(banquetRes.success, 'Cooking celestial banquet with altId must succeed');
  assert.ok(arrayPlayer.buffs.some(b => b.id === 'celestial_banquet'));

  // Missing ingredient failure test
  const emptyPlayer = { inventory: [], buffs: {} };
  const failRes = hs.cookFeast(emptyPlayer, 'artisan_hearth_bread');
  assert.equal(failRes.success, false, 'Cooking without ingredients must fail');

  // Verify CONTENT.items definitions
  const expectedItems = [
    'artisan_hearth_bread',
    'pan_seared_salmon',
    'celestial_banquet',
    'produce_golden_wheat',
    'produce_silverleaf'
  ];
  for (const itId of expectedItems) {
    const item = CONTENT.items.find(i => i.id === itId);
    assert.ok(item, `Item ${itId} must exist in CONTENT.items`);
  }
});

