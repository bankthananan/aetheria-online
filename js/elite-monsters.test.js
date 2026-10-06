import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createEliteSystem } from './systems/elite-monsters.js';

test('elite-monsters: tier roll ignores bosses and roll rates work', () => {
  const eliteSys = createEliteSystem({ rnd: () => 0.05 });
  const bossDef = { id: 'ruin_golem', sizeTiles: 2 };
  const rareDef = { id: 'golden_slime', sizeTiles: 1, rare: true };
  const mobDef = { id: 'slime', sizeTiles: 1 };

  assert.equal(eliteSys.rollTier(bossDef), null, 'Bosses must not roll elite tier');
  assert.equal(eliteSys.rollTier(rareDef), null, 'Rare bosses must not roll elite tier');
  assert.equal(eliteSys.rollTier(mobDef), 'champion', 'Low roll should produce champion');

  const eliteRollSys = createEliteSystem({ rnd: () => 0.01 });
  assert.equal(eliteRollSys.rollTier(mobDef), 'elite', 'Very low roll should produce elite');
});

test('elite-monsters: rollAffixes produces correct number of unique affixes', () => {
  const eliteSys = createEliteSystem();
  const champAffixes = eliteSys.rollAffixes('champion');
  assert.equal(champAffixes.length, 1);

  const eliteAffixes = eliteSys.rollAffixes('elite');
  assert.equal(eliteAffixes.length, 2);
  assert.notEqual(eliteAffixes[0], eliteAffixes[1], 'Elite affixes must be distinct');
});

test('elite-monsters: applyEliteMods scales HP and ATK correctly', () => {
  const eliteSys = createEliteSystem();
  const champMob = {
    def: { id: 'boar', sizeTiles: 1 },
    hp: 100, maxHp: 100,
    atk: 20, atkBase: 20,
    lvl: 5,
  };
  eliteSys.applyEliteMods(champMob, 'champion', ['molten']);
  assert.equal(champMob.eliteTier, 'champion');
  assert.equal(champMob.maxHp, 180);
  assert.equal(champMob.hp, 180);
  assert.equal(champMob.atk, 25);
  assert.deepEqual(champMob.eliteAffixes, ['molten']);

  const eliteMob = {
    def: { id: 'boar', sizeTiles: 1 },
    hp: 100, maxHp: 100,
    atk: 20, atkBase: 20,
    lvl: 5,
  };
  eliteSys.applyEliteMods(eliteMob, 'elite', ['frost_nova', 'shielding']);
  assert.equal(eliteMob.eliteTier, 'elite');
  assert.equal(eliteMob.maxHp, 300);
  assert.equal(eliteMob.hp, 300);
  assert.equal(eliteMob.atk, 28);
  assert.equal(eliteMob.eliteAffixes.length, 2);
});

test('elite-monsters: shielding reduces damage by 70%', () => {
  const eliteSys = createEliteSystem();
  const mob = {
    def: { id: 'wolf', sizeTiles: 1 },
    hp: 300, maxHp: 300,
    atk: 30, atkBase: 30,
    lvl: 5,
  };
  eliteSys.applyEliteMods(mob, 'champion', ['shielding']);
  assert.equal(eliteSys.mitigateDamage(mob, 100), 100, 'Unshielded mob takes full damage');

  mob.shieldActive = true;
  assert.equal(eliteSys.mitigateDamage(mob, 100), 30, 'Shielding should reduce incoming damage by 70%');
});

test('elite-monsters: avenger gains ATK and heals on nearby monster death', () => {
  const eliteSys = createEliteSystem({ dist: (x1, y1, x2, y2) => Math.hypot(x1 - x2, y1 - y2), TS: 32 });
  const avengerMob = {
    def: { id: 'cultist', sizeTiles: 1 },
    x: 100, y: 100,
    hp: 150, maxHp: 200,
    atk: 40, atkBase: 40,
    lvl: 10,
    alive: true,
  };
  eliteSys.applyEliteMods(avengerMob, 'champion', ['avenger']);

  const dyingMob = { x: 120, y: 100, alive: false };
  eliteSys.handleEliteDeath(dyingMob, [avengerMob], {}, { floatText: () => {} });

  assert.ok(avengerMob.hp > 150, 'Avenger should heal when nearby monster dies');
  assert.ok(avengerMob.atk > 40, 'Avenger should gain ATK when nearby monster dies');
});

test('elite-monsters: vortex pulls player toward monster', () => {
  let currentTime = 10000;
  const eliteSys = createEliteSystem({
    now: () => currentTime,
    dist: (x1, y1, x2, y2) => Math.hypot(x1 - x2, y1 - y2),
    TS: 32,
  });

  const mob = {
    def: { id: 'gargoyle', sizeTiles: 1 },
    x: 200, y: 100,
    hp: 200, maxHp: 200,
    atk: 30, atkBase: 30,
    alive: true,
    lastCombatAt: 9500,
  };
  eliteSys.applyEliteMods(mob, 'champion', ['vortex']);
  mob._nextVortexAt = 10000;

  const player = { x: 300, y: 100, hp: 500, maxHp: 500 };
  const initialDist = Math.hypot(player.x - mob.x, player.y - mob.y);

  eliteSys.updateElites([mob], player, 0.016, {
    now: () => currentTime,
    floatText: () => {},
    addTelegraph: () => {},
  });

  const newDist = Math.hypot(player.x - mob.x, player.y - mob.y);
  assert.ok(newDist < initialDist, 'Player should be pulled toward vortex monster');
});

test('elite-monsters: handleEliteDeath awards bonus XP, Zeny and guaranteed gem for elite', () => {
  const eliteSys = createEliteSystem({ rnd: () => 0.5 });
  const eliteMob = {
    def: { id: 'skeleton', sizeTiles: 1 },
    x: 100, y: 100,
    exp: 100, lvl: 10,
    alive: false,
  };
  eliteSys.applyEliteMods(eliteMob, 'elite', ['molten', 'shielding']);

  const rewards = eliteSys.handleEliteDeath(eliteMob, [], {}, { floatText: () => {} });
  assert.equal(rewards.xpMult, 4.0, 'Elite awards 4.0x XP');
  assert.equal(rewards.zenyMult, 6.0, 'Elite awards 6.0x Zeny');
  assert.equal(rewards.dropBiasBonus, 4, 'Elite awards +4 drop bias');
  assert.ok(rewards.gemDrop, 'Elite guarantees a gem drop');
});
