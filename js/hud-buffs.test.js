import assert from 'node:assert/strict';
import test from 'node:test';
import {
  collectActiveHudBuffs,
  formatBuffDuration,
  renderHudBuffBarHtml,
} from './render/hud-buffs.js';

test('formatBuffDuration formats milliseconds into compact s or m labels', () => {
  assert.equal(formatBuffDuration(null), '');
  assert.equal(formatBuffDuration(0), '');
  assert.equal(formatBuffDuration(4200), '5s');
  assert.equal(formatBuffDuration(59000), '59s');
  assert.equal(formatBuffDuration(120000), '2m');
});

test('collectActiveHudBuffs aggregates mount, food, imbue, pet buffs, statuses, and equipment sets', () => {
  const nowMs = 10000;
  const mockState = {
    mounted: true,
    homestead: {
      hearthBuffExpiresAt: nowMs + 600000,
    },
    player: {
      imbue: { element: 'fire', until: nowMs + 15000, durationMs: 30000 },
      petAtkBuffUntil: nowMs + 8000,
      shield: 150,
      buffs: [
        { id: 'pan_seared_salmon', name: 'Pan-Seared Salmon', stat: 'atk', mult: 1.15, flat: 15, until: nowMs + 180000, durationMs: 1800000 },
      ],
      statuses: {
        poison: { until: nowMs + 6000 },
      },
      equip: {
        body: { itemId: 'duneslayer_vest' },
        feet: { itemId: 'shadow_leathers' },
      },
    },
  };

  const buffs = collectActiveHudBuffs(mockState, nowMs);
  const ids = buffs.map(b => b.id);

  assert.ok(ids.includes('mount_active'), 'Includes active mount');
  assert.ok(ids.includes('hearth_rest'), 'Includes homestead hearth buff');
  assert.ok(ids.includes('imbue_fire'), 'Includes elemental imbue');
  assert.ok(ids.includes('pet_howl_of_fury'), 'Includes pet ATK buff');
  assert.ok(ids.includes('pet_shield'), 'Includes active barrier shield');
  assert.ok(ids.includes('buff_pan_seared_salmon'), 'Includes culinary meal buff');
  assert.ok(ids.includes('status_poison'), 'Includes active debuff status');
  assert.ok(ids.includes('set_duneslayer'), 'Includes active regional equipment set');

  const poison = buffs.find(b => b.id === 'status_poison');
  assert.equal(poison.kind, 'debuff');
  assert.equal(poison.remainingMs, 6000);
});

test('renderHudBuffBarHtml renders accessible buff chips with timer labels and debuff classes', () => {
  const buffs = [
    { id: 'mount_active', kind: 'mount', icon: '🐎', label: 'Mounted', detail: '+40% Movement Speed', remainingMs: null },
    { id: 'status_poison', kind: 'debuff', icon: '☠️', label: 'Poison', detail: 'Taking poison damage', remainingMs: 5000, durationMs: 10000 },
  ];

  const html = renderHudBuffBarHtml(buffs);
  assert.ok(html.includes('hud-buff-chip--mount'), 'Contains mount chip class');
  assert.ok(html.includes('hud-buff-chip--debuff'), 'Contains debuff chip class');
  assert.ok(html.includes('5s'), 'Contains formatted remaining timer');
  assert.ok(html.includes('Mounted'), 'Contains tooltip title');
});
