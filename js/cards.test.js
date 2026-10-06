// js/cards.test.js
// Unit tests for the Monster Cards & Bestiary Codex Subsystem.
import test from 'node:test';
import assert from 'node:assert/strict';

import { CONTENT } from './content.js';
import {
  CARD_CATALOG,
  ZONE_ALBUM_MILESTONES,
  createCardsSystem,
} from './systems/cards.js';

test('Cards Subsystem: CARD_CATALOG contains all 43 monsters and valid metadata', () => {
  const catalogKeys = Object.keys(CARD_CATALOG);
  assert.equal(catalogKeys.length, 43, 'Must define exactly 43 monster cards');

  const contentMonsterIds = new Set(CONTENT.monsters.map(m => m.id));
  assert.equal(contentMonsterIds.size, 43, 'CONTENT.monsters must have 43 monsters');

  const validRarities = new Set(['common', 'uncommon', 'rare', 'epic', 'legendary']);
  const validSlots = new Set(['weapon', 'armor', 'accessory', 'any']);
  const validZones = new Set(['woods', 'ruins', 'tundra', 'caldera', 'rift', 'incursion']);

  for (const [cardId, cardDef] of Object.entries(CARD_CATALOG)) {
    assert.equal(cardId, `card_${cardDef.monsterId}`, `Card ID matches convention for ${cardDef.monsterId}`);
    assert.equal(cardDef.id, cardId, 'Def.id matches key');
    assert.ok(contentMonsterIds.has(cardDef.monsterId), `Card monsterId ${cardDef.monsterId} exists in CONTENT.monsters`);
    assert.ok(typeof cardDef.name === 'string' && cardDef.name.length > 0, `Card ${cardId} has a name`);
    assert.ok(validRarities.has(cardDef.rarity), `Card ${cardId} has valid rarity: ${cardDef.rarity}`);
    assert.ok(validSlots.has(cardDef.targetSlot), `Card ${cardId} has valid targetSlot: ${cardDef.targetSlot}`);
    assert.ok(validZones.has(cardDef.zone), `Card ${cardId} has valid zone: ${cardDef.zone}`);
    assert.ok(typeof cardDef.statMods === 'object' && cardDef.statMods !== null, `Card ${cardId} has statMods`);
    assert.ok(typeof cardDef.flavor === 'string' && cardDef.flavor.length > 0, `Card ${cardId} has flavor text`);
    assert.ok(typeof cardDef.collectionBonus === 'string', `Card ${cardId} has collectionBonus summary`);

    if (cardDef.onHit) {
      assert.ok(typeof cardDef.onHit.effect === 'string', `Card ${cardId} onHit has effect name`);
      assert.ok(typeof cardDef.onHit.chance === 'number' && cardDef.onHit.chance > 0, `Card ${cardId} onHit has chance`);
    }
  }
});

test('Cards Subsystem: getCardDef and getCardForMonster resolution', () => {
  const cards = createCardsSystem();

  const slimeCard = cards.getCardDef('card_slime');
  assert.ok(slimeCard, 'Finds card_slime');
  assert.equal(slimeCard.monsterId, 'slime');
  assert.equal(slimeCard.targetSlot, 'armor');

  const nullkingCard = cards.getCardForMonster('nullking');
  assert.ok(nullkingCard, 'Finds card for nullking');
  assert.equal(nullkingCard.id, 'card_nullking');
  assert.equal(nullkingCard.rarity, 'legendary');
  assert.equal(nullkingCard.targetSlot, 'any');

  assert.equal(cards.getCardDef('nonexistent_card'), null, 'Returns null for unknown card');
  assert.equal(cards.getCardForMonster('nonexistent_monster'), null, 'Returns null for unknown monster');
  assert.equal(cards.getCardDef(null), null, 'Handles null cardId');
  assert.equal(cards.getCardForMonster(null), null, 'Handles null monsterId');
});

test('Cards Subsystem: rollCardDrop respects normal, elite, boss rates and LUK scaling', () => {
  const monsterDef = { id: 'goblin' };

  // 1. Normal mob base rate = 0.01 (1%)
  // Value 0.0099 should drop (< 0.01)
  const systemDrop = createCardsSystem({ rnd: () => 0.0099 });
  assert.equal(systemDrop.rollCardDrop(monsterDef), 'card_goblin', 'Drops at 0.0099 for normal mob');

  // Value 0.0101 should not drop (>= 0.01)
  const systemNoDrop = createCardsSystem({ rnd: () => 0.0101 });
  assert.equal(systemNoDrop.rollCardDrop(monsterDef), null, 'Does not drop at 0.0101 for normal mob');

  // 2. Elite mob base rate = 0.035 (3.5%)
  const systemEliteDrop = createCardsSystem({ rnd: () => 0.034 });
  assert.equal(systemEliteDrop.rollCardDrop(monsterDef, { isElite: true }), 'card_goblin', 'Drops at 0.034 for elite mob');
  const systemEliteMiss = createCardsSystem({ rnd: () => 0.036 });
  assert.equal(systemEliteMiss.rollCardDrop(monsterDef, { isElite: true }), null, 'Misses at 0.036 for elite mob');

  // 3. Boss mob base rate = 0.10 (10%)
  const systemBossDrop = createCardsSystem({ rnd: () => 0.099 });
  assert.equal(systemBossDrop.rollCardDrop(monsterDef, { isBoss: true }), 'card_goblin', 'Drops at 0.099 for boss mob');
  const systemBossMiss = createCardsSystem({ rnd: () => 0.101 });
  assert.equal(systemBossMiss.rollCardDrop(monsterDef, { isBoss: true }), null, 'Misses at 0.101 for boss mob');

  // 4. LUK scaling: effectiveChance = baseChance * (1 + luck * 0.02)
  // Normal mob with luck = 50: baseChance 0.01 * (1 + 50 * 0.02) = 0.01 * 2 = 0.02
  const systemLukDrop = createCardsSystem({ rnd: () => 0.019 });
  assert.equal(systemLukDrop.rollCardDrop(monsterDef, { luck: 50 }), 'card_goblin', 'Drops with luck=50 boost at 0.019');
  const systemLukMiss = createCardsSystem({ rnd: () => 0.021 });
  assert.equal(systemLukMiss.rollCardDrop(monsterDef, { luck: 50 }), null, 'Misses with luck=50 at 0.021');

  // Missing monster returns null
  assert.equal(systemDrop.rollCardDrop(null), null, 'Null monster returns null');
});

test('Cards Subsystem: rollOldCardAlbum returns cards with proper distribution weights', () => {
  // Test Nullking branch (< 0.02)
  const systemNullking = createCardsSystem({ rnd: () => 0.01 });
  assert.equal(systemNullking.rollOldCardAlbum(), 'card_nullking', 'Rolls Nullking under 2% threshold');

  // Test Epic/Boss branch (0.02 <= r < 0.22)
  let epicCalls = 0;
  const mockRndEpic = () => {
    epicCalls++;
    return epicCalls === 1 ? 0.10 : 0.0; // first call: 0.10 (epic branch), second call: index 0
  };
  const systemEpic = createCardsSystem({ rnd: mockRndEpic });
  const epicCardId = systemEpic.rollOldCardAlbum();
  assert.ok(CARD_CATALOG[epicCardId], 'Rolled valid card in epic pool');
  assert.equal(CARD_CATALOG[epicCardId].rarity, 'epic', 'Rolled card is an epic card');

  // Test Regular branch (r >= 0.22)
  let regCalls = 0;
  const mockRndReg = () => {
    regCalls++;
    return regCalls === 1 ? 0.50 : 0.0; // first call: 0.50 (regular branch), second call: index 0
  };
  const systemReg = createCardsSystem({ rnd: mockRndReg });
  const regCardId = systemReg.rollOldCardAlbum();
  assert.ok(CARD_CATALOG[regCardId], 'Rolled valid card in regular pool');
  assert.notEqual(regCardId, 'card_nullking', 'Regular pool does not roll Nullking');
});

test('Cards Subsystem: canSocketCard validates targetSlot and slot availability', () => {
  const cards = createCardsSystem();

  const weaponItem = { id: 'hero_blade', type: 'weapon', slot: 'weapon', sockets: [null, null] };
  const armorItem = { id: 'knight_plate', type: 'armor', slot: 'body', sockets: [null] };
  const accessoryItem = { id: 'star_pendant', type: 'accessory', slot: 'accessory', sockets: [null] };

  // 1. Weapon card in weapon item
  assert.deepEqual(cards.canSocketCard(weaponItem, 'card_wolf', 0), { canSocket: true });
  // Weapon card in armor item (fails)
  const armorCheck = cards.canSocketCard(armorItem, 'card_wolf', 0);
  assert.equal(armorCheck.canSocket, false);
  assert.ok(armorCheck.reason, 'Provides rejection reason for slot mismatch');

  // 2. Armor card in armor item
  assert.deepEqual(cards.canSocketCard(armorItem, 'card_slime', 0), { canSocket: true });
  // Armor card in accessory item (fails)
  assert.equal(cards.canSocketCard(accessoryItem, 'card_slime', 0).canSocket, false);

  // 3. Accessory card in accessory item
  assert.deepEqual(cards.canSocketCard(accessoryItem, 'card_goblin_scout', 0), { canSocket: true });
  // Accessory card in weapon item (fails)
  assert.equal(cards.canSocketCard(weaponItem, 'card_goblin_scout', 0).canSocket, false);

  // 4. Any card (Nullking) fits in weapon, armor, and accessory
  assert.deepEqual(cards.canSocketCard(weaponItem, 'card_nullking', 0), { canSocket: true });
  assert.deepEqual(cards.canSocketCard(armorItem, 'card_nullking', 0), { canSocket: true });
  assert.deepEqual(cards.canSocketCard(accessoryItem, 'card_nullking', 0), { canSocket: true });

  // 5. Out of bounds slotIndex
  assert.equal(cards.canSocketCard(weaponItem, 'card_wolf', 5).canSocket, false);

  // 6. Already occupied socket
  const occupiedItem = { id: 'hero_blade', slot: 'weapon', sockets: ['card_goblin', null] };
  assert.equal(cards.canSocketCard(occupiedItem, 'card_wolf', 0).canSocket, false);
  assert.deepEqual(cards.canSocketCard(occupiedItem, 'card_wolf', 1), { canSocket: true });

  // 7. Invalid items or card
  assert.equal(cards.canSocketCard(null, 'card_wolf', 0).canSocket, false);
  assert.equal(cards.canSocketCard(weaponItem, 'invalid_card', 0).canSocket, false);
  assert.equal(cards.canSocketCard({ id: 'item_no_sockets' }, 'card_wolf', 0).canSocket, false);
});

test('Cards Subsystem: socketCard and unsocketCard lifecycle and zeny deduction', () => {
  const cards = createCardsSystem();
  const weapon = { id: 'hero_blade', slot: 'weapon', sockets: [null, null] };

  // Socket first card
  const res1 = cards.socketCard(weapon, 'card_wolf', 0);
  assert.deepEqual(res1, { success: true });
  assert.equal(weapon.sockets[0], 'card_wolf');

  // Attempting to overwrite occupied socket fails
  const resOverlap = cards.socketCard(weapon, 'card_goblin', 0);
  assert.equal(resOverlap.success, false);

  // Unsocket without sufficient zeny fails
  let deducted = 0;
  const deductZeny = (amt) => { deducted += amt; };
  const failUnsocket = cards.unsocketCard(weapon, 0, { cost: 500, zeny: 300, deductZeny });
  assert.equal(failUnsocket.success, false);
  assert.equal(weapon.sockets[0], 'card_wolf', 'Card remains in socket if unsocket fails');
  assert.equal(deducted, 0, 'No zeny deducted on failure');

  // Unsocket with sufficient zeny succeeds
  const okUnsocket = cards.unsocketCard(weapon, 0, { cost: 500, zeny: 1000, deductZeny });
  assert.equal(okUnsocket.success, true);
  assert.equal(okUnsocket.cardId, 'card_wolf');
  assert.equal(weapon.sockets[0], null, 'Socket is cleared');
  assert.equal(deducted, 500, 'Zeny was deducted');

  // Unsocket empty socket fails
  const emptyUnsocket = cards.unsocketCard(weapon, 0);
  assert.equal(emptyUnsocket.success, false);
});

test('Cards Subsystem: recordBestiaryKill increments kills and calculates mastery star tiers', () => {
  const cards = createCardsSystem();
  const bestiary = { monsters: {}, cards: {} };

  // First kill
  const k1 = cards.recordBestiaryKill(bestiary, 'slime');
  assert.equal(k1.firstKill, true);
  assert.equal(k1.masteryLevel, 0);
  assert.equal(bestiary.monsters.slime.kills, 1);
  assert.equal(bestiary.monsters.slime.mastery, 0);

  // Second kill is not firstKill
  const k2 = cards.recordBestiaryKill(bestiary, 'slime');
  assert.equal(k2.firstKill, false);
  assert.equal(bestiary.monsters.slime.kills, 2);

  // Advance to Rank 1 (10 kills)
  bestiary.monsters.slime.kills = 9;
  const k10 = cards.recordBestiaryKill(bestiary, 'slime');
  assert.equal(k10.masteryLevel, 1);
  assert.equal(bestiary.monsters.slime.mastery, 1);

  // Advance to Rank 2 (50 kills)
  bestiary.monsters.slime.kills = 49;
  const k50 = cards.recordBestiaryKill(bestiary, 'slime');
  assert.equal(k50.masteryLevel, 2);
  assert.equal(bestiary.monsters.slime.mastery, 2);

  // Advance to Rank 3 (200 kills)
  bestiary.monsters.slime.kills = 199;
  const k200 = cards.recordBestiaryKill(bestiary, 'slime');
  assert.equal(k200.masteryLevel, 3);
  assert.equal(bestiary.monsters.slime.mastery, 3);
});

test('Cards Subsystem: recordBestiaryDrop records item discoveries', () => {
  const cards = createCardsSystem();
  const bestiary = { monsters: {}, cards: {} };

  const d1 = cards.recordBestiaryDrop(bestiary, 'slime', 'slime_gel');
  assert.equal(d1.firstDrop, true);
  assert.equal(bestiary.monsters.slime.drops.slime_gel, true);

  const d2 = cards.recordBestiaryDrop(bestiary, 'slime', 'slime_gel');
  assert.equal(d2.firstDrop, false);

  const d3 = cards.recordBestiaryDrop(bestiary, 'slime', 'minor_potion');
  assert.equal(d3.firstDrop, true);
  assert.equal(bestiary.monsters.slime.drops.minor_potion, true);
});

test('Cards Subsystem: recordCardAcquired and calculateCollectionBonuses computes milestone rewards', () => {
  const cards = createCardsSystem();
  const bestiary = { monsters: {}, cards: {} };

  // Initial empty album bonus is 0
  const bonus0 = cards.calculateCollectionBonuses(bestiary);
  assert.deepEqual(bonus0, {});

  // Acquire first card
  const c1 = cards.recordCardAcquired(bestiary, 'card_slime');
  assert.equal(c1.firstCard, true);
  assert.equal(bestiary.cards.card_slime, true);

  const c2 = cards.recordCardAcquired(bestiary, 'card_slime');
  assert.equal(c2.firstCard, false);

  // Complete Tundra album (5 cards)
  const tundraCards = ZONE_ALBUM_MILESTONES.tundra.cardIds;
  assert.equal(tundraCards.length, 5, 'Tundra has 5 cards');
  for (const cid of tundraCards) {
    cards.recordCardAcquired(bestiary, cid);
  }

  const bonusTundra = cards.calculateCollectionBonuses(bestiary);
  assert.equal(bonusTundra.physDef, 15, 'Tundra milestone grants +15 DEF');
  assert.equal(bonusTundra.res_ice, 10, 'Tundra milestone grants +10 Ice Res');

  // Complete Caldera album (5 cards)
  const calderaCards = ZONE_ALBUM_MILESTONES.caldera.cardIds;
  assert.equal(calderaCards.length, 5, 'Caldera has 5 cards');
  for (const cid of calderaCards) {
    cards.recordCardAcquired(bestiary, cid);
  }

  const bonusBoth = cards.calculateCollectionBonuses(bestiary);
  assert.equal(bonusBoth.physDef, 15);
  assert.equal(bonusBoth.res_ice, 10);
  assert.equal(bonusBoth.physAtk, 12, 'Caldera grants +12 ATK');
  assert.equal(bonusBoth.dmg_fire, 10, 'Caldera grants +10 Fire Dmg');

  // Complete all 43 cards for Grandmaster
  for (const cardId of Object.keys(CARD_CATALOG)) {
    cards.recordCardAcquired(bestiary, cardId);
  }

  const bonusAll = cards.calculateCollectionBonuses(bestiary);
  assert.ok(bonusAll.allStatPct >= 0.05, 'Grandmaster grants +5% All Stats');
  assert.ok(bonusAll.dropRarity >= 0.10, 'Grandmaster grants +10% Drop Rarity');
  assert.ok(bonusAll.moveMult >= 0.03, 'Woods milestone included');
  assert.ok(bonusAll.magicAtk >= 15, 'Rift milestone included');
});

test('Cards Subsystem: serialize and deserialize roundtrip cleanly', () => {
  const cards = createCardsSystem();

  const originalState = {
    monsters: {
      slime: { kills: 42, drops: { slime_gel: true, minor_potion: true }, mastery: 1 },
      goblin: { kills: 12, drops: { goblin_ear: true }, mastery: 1 },
    },
    cards: {
      card_slime: true,
      card_goblin: true,
    },
  };

  const serialized = cards.serialize(originalState);
  assert.ok(serialized, 'Serialization returns object');
  assert.deepEqual(serialized, originalState);

  // Deserialization with full data
  const restored = cards.deserialize(serialized);
  assert.deepEqual(restored, originalState);

  // Deserialization with null/empty defaults
  const emptyRestored = cards.deserialize(null);
  assert.deepEqual(emptyRestored, { monsters: {}, cards: {} });
  const partialRestored = cards.deserialize({});
  assert.deepEqual(partialRestored, { monsters: {}, cards: {} });
});
