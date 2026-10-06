import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRelicSystem } from './systems/relics.js';

test('relics: getPassiveModifiers extracts passive stats from worn relic', () => {
  const relicSys = createRelicSystem();
  const player = {
    equip: {
      relic: { itemId: 'thornmail_carapace' },
    },
    maxHp: 500,
  };

  const mods1 = relicSys.getPassiveModifiers(player);
  assert.equal(mods1.hpPct, 12, 'Bramble Carapace should grant +12% Max HP');
  assert.equal(mods1.lifesteal, 0);

  player.equip.relic = { itemId: 'vampiric_grail' };
  const mods2 = relicSys.getPassiveModifiers(player);
  assert.equal(mods2.hpPct, 0);
  assert.equal(mods2.lifesteal, 6, 'Chalice of the Undying should grant +6% lifesteal');

  player.equip.relic = null;
  const mods3 = relicSys.getPassiveModifiers(player);
  assert.deepEqual(mods3, { hpPct: 0, defPct: 0, lifesteal: 0 });
});

test('relics: phoenix_feather prevents lethal damage and enters cooldown', () => {
  let virtualNow = 1000;
  const relicSys = createRelicSystem({
    now: () => virtualNow,
    dist: (x1, y1, x2, y2) => Math.hypot(x1 - x2, y1 - y2),
    TS: 32,
  });

  const player = {
    x: 100, y: 100,
    hp: 10, maxHp: 200,
    atk: 50,
    equip: {
      relic: { itemId: 'phoenix_feather' },
    },
  };

  const nearbyEnemy = { x: 120, y: 100, hp: 100, alive: true, size: 32 };
  const allMonsters = [nearbyEnemy];

  const floatTexts = [];
  const context = {
    monsters: allMonsters,
    floatText: (...args) => floatTexts.push(args),
    spawnRing: () => {},
    playSfx: () => {},
  };

  // 1. Lethal blow intercepted
  const prevented = relicSys.onLethalDamage(player, 50, context);
  assert.equal(prevented, true, 'Phoenix Feather should negate lethal blow');
  assert.equal(player.hp, 80, 'Restores player to 40% Max HP (40% of 200)');
  assert.ok(nearbyEnemy.hp < 100, 'Radial fire burst damages nearby enemies');
  assert.ok(floatTexts.some(f => f[2] === 'PHOENIX REBIRTH!'), 'Displays rebirth banner');

  // 2. Second lethal blow during cooldown is NOT prevented
  virtualNow += 5000; // only 5s passed, cooldown is 180s
  player.hp = 5;
  const prevented2 = relicSys.onLethalDamage(player, 50, context);
  assert.equal(prevented2, false, 'Phoenix Feather on cooldown must not trigger');

  // 3. After 180s cooldown elapses, can trigger again
  virtualNow += 180000;
  player.hp = 5;
  const prevented3 = relicSys.onLethalDamage(player, 50, context);
  assert.equal(prevented3, true, 'Phoenix Feather triggers again after cooldown');
  assert.equal(player.hp, 80);
});

test('relics: thornmail_carapace reflects melee damage back to attacker', () => {
  const relicSys = createRelicSystem();
  const player = {
    equip: {
      relic: { itemId: 'thornmail_carapace' },
    },
  };

  const attacker = {
    hp: 200,
    alive: true,
  };

  const floatTexts = [];
  const context = {
    floatText: (...args) => floatTexts.push(args),
    isMelee: true,
  };

  const res = relicSys.onTakeDamage(player, attacker, 100, context);
  assert.equal(res.reflectedDamage, 35, 'Reflects 35% of melee damage');
  assert.equal(attacker.hp, 165, 'Attacker HP reduced by reflected damage');
});

test('relics: midas_touch awards bonus Zeny on critical hit and on kill', () => {
  const relicSys = createRelicSystem({
    rnd: () => 0.5, // middle of random range
  });

  const player = {
    zeny: 100,
    equip: {
      relic: { itemId: 'midas_touch' },
    },
  };

  const floatTexts = [];
  const context = {
    floatText: (...args) => floatTexts.push(args),
  };

  // Normal hit: no extra zeny
  relicSys.onHit(player, {}, 50, false, context);
  assert.equal(player.zeny, 100, 'Normal hit awards no bonus Zeny');

  // Critical hit: awards bonus Zeny
  relicSys.onHit(player, {}, 50, true, context);
  assert.ok(player.zeny > 100, 'Critical hit awards bonus Zeny');

  // On kill: +30% zeny multiplier
  const killReward = relicSys.onKill(player, {});
  assert.equal(killReward.zenyMult, 1.30, 'Hand of Midas grants +30% kill zeny');
});

test('relics: storm_conduit zaps nearby monsters with chain lightning', () => {
  const relicSys = createRelicSystem({
    rnd: () => 0.1, // guarantees 25% proc chance
    dist: (x1, y1, x2, y2) => Math.hypot(x1 - x2, y1 - y2),
    TS: 32,
  });

  const player = {
    x: 100, y: 100,
    weaponAtk: 40,
    equip: {
      relic: { itemId: 'storm_conduit' },
    },
  };

  const primaryTarget = { x: 120, y: 100, hp: 100, alive: true, size: 32 };
  const nearbyEnemy1 = { x: 140, y: 100, hp: 100, alive: true, size: 32 };
  const nearbyEnemy2 = { x: 130, y: 120, hp: 100, alive: true, size: 32 };
  const distantEnemy = { x: 500, y: 500, hp: 100, alive: true, size: 32 };

  const floatTexts = [];
  const context = {
    monsters: [primaryTarget, nearbyEnemy1, nearbyEnemy2, distantEnemy],
    floatText: (...args) => floatTexts.push(args),
    spawnZap: () => {},
  };

  const res = relicSys.onHit(player, primaryTarget, 40, false, context);
  assert.ok(res.chainTargets.length >= 2, 'Should arc to nearby enemies');
  assert.ok(nearbyEnemy1.hp < 100, 'Nearby enemy 1 takes chain lightning damage');
  assert.ok(nearbyEnemy2.hp < 100, 'Nearby enemy 2 takes chain lightning damage');
  assert.equal(distantEnemy.hp, 100, 'Distant enemy is unaffected');
});

test('relics: vampiric_grail heals on hit and generates blood shield', () => {
  const relicSys = createRelicSystem();
  const player = {
    hp: 90, maxHp: 100,
    bloodShield: 0,
    equip: {
      relic: { itemId: 'vampiric_grail' },
    },
  };

  const context = { floatText: () => {} };

  // Deal 100 dmg -> 6% lifesteal = 6 heal. Player hp 90 + 6 = 96.
  relicSys.onHit(player, {}, 100, false, context);
  assert.equal(player.hp, 96);
  assert.equal(player.bloodShield, 0);

  // Deal 100 dmg -> 6 heal. Player hp 96 + 4 = 100 (maxHp), 2 overflow into bloodShield
  relicSys.onHit(player, {}, 100, false, context);
  assert.equal(player.hp, 100);
  assert.equal(player.bloodShield, 2, 'Excess healing converts to blood shield');

  // On taking damage, bloodShield absorbs it first
  const res = relicSys.onTakeDamage(player, {}, 5, { isMelee: false });
  assert.equal(res.absorbed, 2, 'Blood shield absorbs up to its amount');
  assert.equal(player.bloodShield, 0, 'Blood shield is depleted');
});
