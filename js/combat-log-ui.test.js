import assert from 'node:assert/strict';
import test from 'node:test';
import {
  classifyLogChannel,
  filterLogEntries,
  renderLogFilterTabsHtml,
  shouldTriggerFanfare,
  renderLootFanfareHtml,
} from './render/combat-log-ui.js';

test('classifyLogChannel categorizes combat, loot, and system messages accurately', () => {
  assert.equal(classifyLogChannel('Found 1× Iron Sword!', 'good'), 'loot');
  assert.equal(classifyLogChannel('Equipped [Epic] Guardian Plate.', ''), 'loot');
  assert.equal(classifyLogChannel('Obtained Gel Slime Card!', 'good'), 'loot');
  assert.equal(classifyLogChannel('Defeated Gel Slime (+24 EXP).', 'good'), 'combat');
  assert.equal(classifyLogChannel('You took 42 fire damage!', 'bad'), 'combat');
  assert.equal(classifyLogChannel('+ Chronicle updated — Whispering Woods.', 'sys'), 'sys');
});

test('filterLogEntries filters buffered log entries by selected channel tab', () => {
  const entries = [
    { text: 'Defeated Wolf', kind: 'good', channel: 'combat' },
    { text: 'Found Ruby Shard', kind: 'good', channel: 'loot' },
    { text: 'Game saved.', kind: 'sys', channel: 'sys' },
  ];

  assert.equal(filterLogEntries(entries, 'all').length, 3);
  assert.equal(filterLogEntries(entries, 'combat').length, 1);
  assert.equal(filterLogEntries(entries, 'loot').length, 1);
  assert.equal(filterLogEntries(entries, 'sys').length, 1);
});

test('renderLogFilterTabsHtml renders All, Combat, Loot, and System filter tabs', () => {
  const html = renderLogFilterTabsHtml('loot');
  assert.ok(html.includes('data-log-tab="all"'));
  assert.ok(html.includes('data-log-tab="combat"'));
  assert.ok(html.includes('data-log-tab="loot"'));
  assert.ok(html.includes('data-log-tab="sys"'));
  assert.ok(html.includes('is-active'));
});

test('shouldTriggerFanfare detects Monster Cards, Boss Catalysts, Epic/Legendary gear, and Guardian kills', () => {
  // Common potion -> false
  assert.equal(shouldTriggerFanfare({ type: 'item', itemId: 'minor_potion', rarity: 'common' }), null);

  // Monster card -> card fanfare
  const cardFanfare = shouldTriggerFanfare({ type: 'item', itemId: 'card_slime', itemType: 'card', name: 'Gel Slime Card' });
  assert.ok(cardFanfare);
  assert.equal(cardFanfare.kind, 'card');

  // Boss catalyst -> catalyst fanfare
  const catFanfare = shouldTriggerFanfare({ type: 'item', itemId: 'kernel_core', name: 'Kernel Core' });
  assert.ok(catFanfare);
  assert.equal(catFanfare.kind, 'catalyst');

  // Legendary gear -> legendary fanfare
  const legFanfare = shouldTriggerFanfare({ type: 'item', itemId: 'hero_blade', rarity: 'legendary', name: 'Hero Blade' });
  assert.ok(legFanfare);
  assert.equal(legFanfare.kind, 'legendary');

  // Guardian boss kill -> boss fanfare
  const bossFanfare = shouldTriggerFanfare({ type: 'boss_kill', monsterId: 'ancient_treant', name: 'Ancient Treant' });
  assert.ok(bossFanfare);
  assert.equal(bossFanfare.kind, 'boss');
});

test('renderLootFanfareHtml builds ceremonial banner markup without camera shake', () => {
  const banner = {
    kind: 'card',
    icon: '🃏',
    headline: 'Monster Card Discovered!',
    title: 'Gel Slime Card',
  };
  const html = renderLootFanfareHtml(banner);
  assert.ok(html.includes('loot-fanfare--card'));
  assert.ok(html.includes('Monster Card Discovered!'));
  assert.ok(html.includes('Gel Slime Card'));
});
