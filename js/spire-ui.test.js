// js/spire-ui.test.js
// Unit tests for Abyssal Spire UX/UI Encounter HUD, Checkpoint Elevator Modal & Reliquary Shop.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSpireUIRenderer,
  SPIRE_RELIQUARY_CATALOG,
} from './render/spire-ui.js';
import {
  SPIRE_BIOMES,
  SPIRE_AFFIXES,
  CHECKPOINT_FLOORS,
} from './systems/spire.js';

test('1. createSpireUIRenderer factory returns all render functions', () => {
  const ui = createSpireUIRenderer();
  assert.ok(typeof ui === 'object' && ui !== null, 'factory returns an object');
  assert.equal(typeof ui.renderSpireHudHtml, 'function', 'renderSpireHudHtml is a function');
  assert.equal(typeof ui.renderElevatorModalHtml, 'function', 'renderElevatorModalHtml is a function');
  assert.equal(typeof ui.renderSpireReliquaryTabHtml, 'function', 'renderSpireReliquaryTabHtml is a function');
});

test('2. renderSpireHudHtml returns empty string when spireState is null or inactive', () => {
  const ui = createSpireUIRenderer();
  assert.equal(ui.renderSpireHudHtml(null), '', 'returns empty string on null');
  assert.equal(ui.renderSpireHudHtml(undefined), '', 'returns empty string on undefined');
  assert.equal(ui.renderSpireHudHtml({}), '', 'returns empty string on empty object');
  assert.equal(ui.renderSpireHudHtml({ active: false }), '', 'returns empty string on active: false');
  assert.equal(ui.renderSpireHudHtml({ active: false, currentFloor: 5 }), '', 'returns empty string on inactive run with floor');
});

test('3. renderSpireHudHtml generates floor pill, biome badge, affix pills with descriptions, and emblems', () => {
  const ui = createSpireUIRenderer();
  const spireState = {
    active: true,
    currentFloor: 7,
    activeAffixes: [
      {
        id: 'magma_surge',
        name: 'Magma Surge',
        icon: '🌋',
        desc: 'Ground fissures erupt beneath combatants.',
      },
      {
        id: 'glacial_chill',
        name: 'Glacial Chill',
        icon: '❄️',
        desc: 'Movement cast and attack speed slowed by 15%.',
      },
    ],
    emblemsEarned: 14,
  };

  const html = ui.renderSpireHudHtml(spireState);

  // Encounter HUD container
  assert.ok(html.includes('spire-encounter-hud'), 'contains spire-encounter-hud class');

  // Floor pill
  assert.ok(html.includes('Floor 7') || html.includes('Floor') && html.includes('7'), 'contains floor pill with Floor 7');
  assert.ok(html.includes('/ 100') || html.includes('/100'), 'indicates 100-floor maximum');

  // Biome badge (Floor 7 -> Shadow Depths)
  assert.ok(html.includes('Shadow Depths'), 'contains Shadow Depths biome badge');
  assert.ok(html.includes('#4a148c'), 'uses Shadow Depths color #4a148c');

  // Active Affixes with icon, name, and tooltip description
  assert.ok(html.includes('🌋'), 'contains Magma Surge icon');
  assert.ok(html.includes('Magma Surge'), 'contains Magma Surge name');
  assert.ok(html.includes('Ground fissures erupt beneath combatants.'), 'contains Magma Surge tooltip description');
  assert.ok(html.includes('❄️'), 'contains Glacial Chill icon');
  assert.ok(html.includes('Glacial Chill'), 'contains Glacial Chill name');
  assert.ok(html.includes('Movement cast and attack speed slowed by 15%.'), 'contains Glacial Chill tooltip description');

  // Emblems pill
  assert.ok(html.includes('💎'), 'contains emblem gem icon');
  assert.ok(html.includes('14'), 'contains 14 emblems earned');
  assert.ok(html.includes('Emblems'), 'contains Emblems label');

  // Non-milestone floor should not have milestone boss warning
  assert.ok(!html.includes('MILESTONE BOSS'), 'floor 7 does not show milestone boss warning');
});

test('4. renderSpireHudHtml shows milestone boss warning badge on floor 10, 20, ..., 100', () => {
  const ui = createSpireUIRenderer();

  const milestoneFloors = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  for (const floor of milestoneFloors) {
    const html = ui.renderSpireHudHtml({
      active: true,
      currentFloor: floor,
      activeAffixes: [],
      emblemsEarned: 5,
    });
    assert.ok(html.includes('MILESTONE BOSS'), `Floor ${floor} contains MILESTONE BOSS badge`);
    assert.ok(html.includes('☠'), `Floor ${floor} contains skull icon`);
  }

  const normalFloors = [1, 9, 11, 25, 43, 67, 89, 99];
  for (const floor of normalFloors) {
    const html = ui.renderSpireHudHtml({
      active: true,
      currentFloor: floor,
      activeAffixes: [],
      emblemsEarned: 5,
    });
    assert.ok(!html.includes('MILESTONE BOSS'), `Floor ${floor} does not contain MILESTONE BOSS badge`);
  }
});

test('5. renderElevatorModalHtml renders all 10 checkpoint floors (1, 11, ..., 91)', () => {
  const ui = createSpireUIRenderer();
  const spireProgress = {
    highestFloor: 35,
    unlockedCheckpoints: [1, 11, 21, 31],
    emblems: 420,
    unlockedTitles: ['Spire Challenger'],
  };

  const html = ui.renderElevatorModalHtml(spireProgress);

  // Overlay and shell classes
  assert.ok(html.includes('spire-elevator-overlay'), 'contains spire-elevator-overlay class');
  assert.ok(html.includes('spire-elevator-shell'), 'contains spire-elevator-shell class');

  // Title
  assert.ok(html.includes('Ascendant Elevator'), 'contains Ascendant Elevator title');
  assert.ok(html.includes('Abyssal Spire'), 'contains Abyssal Spire title');

  // Stats banner
  assert.ok(html.includes('35 / 100') || html.includes('35'), 'displays highest floor cleared');
  assert.ok(html.includes('420'), 'displays total emblems');
  assert.ok(html.includes('Spire Challenger'), 'displays prestige title');

  // Close button
  assert.ok(html.includes('spire-modal-close'), 'contains close button class');
  assert.ok(html.includes('data-spire-close="1"'), 'contains data-spire-close attribute');

  // All 10 checkpoint floors: 1, 11, 21, 31, 41, 51, 61, 71, 81, 91
  for (const floor of CHECKPOINT_FLOORS) {
    assert.ok(
      html.includes(`Floor ${floor}`) || html.includes(`floor-${floor}`) || html.includes(`data-spire-ascend="${floor}"`),
      `renders checkpoint floor ${floor}`
    );
  }
});

test('6. renderElevatorModalHtml correctly enables unlocked checkpoints and disables locked ones with requirement text', () => {
  const ui = createSpireUIRenderer();
  const spireProgress = {
    highestFloor: 15,
    unlockedCheckpoints: [1, 11],
    emblems: 150,
    unlockedTitles: [],
  };

  const html = ui.renderElevatorModalHtml(spireProgress);

  // Floor 1 and 11 should have enabled ascend button with data-spire-ascend
  assert.ok(html.includes('data-spire-ascend="1"'), 'Floor 1 has ascend button');
  assert.ok(html.includes('data-spire-ascend="11"'), 'Floor 11 has ascend button');
  assert.ok(html.includes('spire-ascend-btn'), 'contains spire-ascend-btn class');

  // Floor 21 is locked (15 < 20): requires floor 20 cleared
  assert.ok(!html.includes('data-spire-ascend="21"'), 'Floor 21 does not have active ascend button');
  assert.ok(html.includes('🔒 Floor 21') || html.includes('Floor 21'), 'displays locked floor 21');
  assert.ok(html.includes('Requires Floor 20 Cleared'), 'displays requirement text for floor 21');

  // Floor 91 is locked: requires floor 90 cleared
  assert.ok(!html.includes('data-spire-ascend="91"'), 'Floor 91 does not have active ascend button');
  assert.ok(html.includes('Requires Floor 90 Cleared'), 'displays requirement text for floor 91');
});

test('7. renderSpireReliquaryTabHtml renders relics, accessory, transmogs, and purchase buttons with prices', () => {
  const ui = createSpireUIRenderer();
  const spireProgress = {
    emblems: 1300,
  };

  const html = ui.renderSpireReliquaryTabHtml(spireProgress, []);

  // Emblems balance badge
  assert.ok(html.includes('💎 1300'), 'displays current emblems balance');
  assert.ok(html.includes('Spire Emblems'), 'displays Spire Emblems label');

  // Catalog items:
  // Relics: crown_of_the_ascendant (2500), abyssal_compass (1200)
  assert.ok(html.includes('Crown of the Ascendant'), 'renders Crown of the Ascendant');
  assert.ok(html.includes('2,500') || html.includes('2500'), 'renders 2500 cost for crown');
  assert.ok(html.includes('Abyssal Compass'), 'renders Abyssal Compass');
  assert.ok(html.includes('1,200') || html.includes('1200'), 'renders 1200 cost for compass');

  // Accessory: spire_sigil (800)
  assert.ok(html.includes('Ascendant Sigil') || html.includes('spire_sigil'), 'renders Ascendant Sigil');
  assert.ok(html.includes('800'), 'renders 800 cost for sigil');

  // Transmogs (1500 each): spire_blade, spire_scythe, spire_greatsword, spire_staff, spire_bow, spire_knuckles
  assert.ok(html.includes('Spire Blade'), 'renders Spire Blade');
  assert.ok(html.includes('Spire Scythe'), 'renders Spire Scythe');
  assert.ok(html.includes('Spire Greatsword'), 'renders Spire Greatsword');
  assert.ok(html.includes('Spire Staff'), 'renders Spire Staff');
  assert.ok(html.includes('Spire Bow'), 'renders Spire Bow');
  assert.ok(html.includes('Spire Knuckles'), 'renders Spire Knuckles');
  assert.ok(html.includes('1,500') || html.includes('1500'), 'renders 1500 cost for transmogs');

  // Check purchase buttons: with 1300 emblems:
  // abyssal_compass (1200) & spire_sigil (800) should have enabled Exchange button:
  assert.ok(html.includes('data-spire-buy="abyssal_compass"'), 'compass has data-spire-buy');
  assert.ok(html.includes('data-spire-cost="1200"'), 'compass has data-spire-cost="1200"');
  assert.ok(html.includes('data-spire-buy="spire_sigil"'), 'sigil has data-spire-buy');
  assert.ok(html.includes('data-spire-cost="800"'), 'sigil has data-spire-cost="800"');
  assert.ok(html.includes('Exchange'), 'contains Exchange button text');

  // crown_of_the_ascendant (2500) and transmogs (1500) exceed 1300 emblems:
  assert.ok(html.includes('Need More Emblems'), 'contains Need More Emblems disabled button text');
  assert.ok(html.includes('btn--disabled'), 'contains disabled button class');

  // Rich progress with 5000 emblems:
  const richHtml = ui.renderSpireReliquaryTabHtml({ emblems: 5000 }, []);
  assert.ok(richHtml.includes('data-spire-buy="crown_of_the_ascendant"'), 'crown has purchase button with 5000 emblems');
  assert.ok(richHtml.includes('data-spire-cost="2500"'), 'crown has data-spire-cost="2500"');
  assert.ok(!richHtml.includes('Need More Emblems'), 'all items affordable with 5000 emblems');
});

test('8. Strict Boxing Containment: asserts presence of box-sizing: border-box, min-width: 0, and overflow-x: hidden', () => {
  const ui = createSpireUIRenderer();
  const sampleState = {
    active: true,
    currentFloor: 10,
    activeAffixes: [{ id: 'magma_surge', name: 'Magma Surge', icon: '🌋', desc: 'Fissures.' }],
    emblemsEarned: 20,
  };
  const sampleProgress = {
    highestFloor: 20,
    unlockedCheckpoints: [1, 11, 21],
    emblems: 2500,
    unlockedTitles: ['Spire Challenger'],
  };

  const hudHtml = ui.renderSpireHudHtml(sampleState);
  const elevatorHtml = ui.renderElevatorModalHtml(sampleProgress);
  const reliquaryHtml = ui.renderSpireReliquaryTabHtml(sampleProgress, []);

  // Strict boxing containment in HUD
  assert.ok(hudHtml.includes('box-sizing: border-box'), 'HUD contains box-sizing: border-box');
  assert.ok(hudHtml.includes('min-width: 0'), 'HUD contains min-width: 0');
  assert.ok(hudHtml.includes('overflow-x: hidden'), 'HUD contains overflow-x: hidden');

  // Strict boxing containment in Elevator Modal
  assert.ok(elevatorHtml.includes('box-sizing: border-box'), 'Elevator modal contains box-sizing: border-box');
  assert.ok(elevatorHtml.includes('min-width: 0'), 'Elevator modal contains min-width: 0');
  assert.ok(elevatorHtml.includes('overflow-x: hidden'), 'Elevator modal contains overflow-x: hidden');
  assert.ok(elevatorHtml.includes('position: fixed'), 'Elevator modal overlay has position: fixed');
  assert.ok(elevatorHtml.includes('max-width: 560px'), 'Elevator modal shell has max-width: 560px');

  // Strict boxing containment in Reliquary
  assert.ok(reliquaryHtml.includes('box-sizing: border-box'), 'Reliquary contains box-sizing: border-box');
  assert.ok(reliquaryHtml.includes('min-width: 0'), 'Reliquary contains min-width: 0');
  assert.ok(reliquaryHtml.includes('overflow-x: hidden'), 'Reliquary contains overflow-x: hidden');
});
