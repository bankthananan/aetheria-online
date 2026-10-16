# Implementation Plan: Pokémon-Style Dynamic Catch Rate Taming System

## Phase 1: Update Core Taming Engine (`js/systems/pets.js`)
- [ ] In `attemptTame(player, monster, baitId)`:
  - Remove `if (hpRatio > 0.30)` hard rejection.
  - Compute `missingHpFactor = 1 - (monster.hp / monster.maxHp)`.
  - Check active monster status effects: `const hasStatus = !!(monster.status && Object.keys(monster.status).length > 0) || !!(monster.burnUntil || monster.slowUntil || monster.stunUntil || monster.poisonStacks);`.
  - Calculate `chance = clamp(0.25 + missingHpFactor * 0.55 + lukBonus + (hasStatus ? 0.15 : 0), 0.10, 0.95);`.
  - Return `{ success: boolean, chance: number, reason?: string, petId?: string, petDef?: object }`.
  - Failure reason when breakout occurs: `'The creature broke free from the bait!'`.

## Phase 2: Update Gameplay & Combat Integration (`js/game.js`)
- [ ] In `useItem(itemId)`:
  - If `attemptTame` fails: floatText `'BROKE FREE!'`, toast `💨 ${T('The creature broke free from the bait! Weaken it for a higher catch rate!', 'ui')}`.
  - If `attemptTame` succeeds: floatText `'TAMED!'`, toast `🐾 ${T('Gotcha! Successfully tamed', 'ui')} [${T(petDef.name, 'items')}]!`.
- [ ] Clean up redundant subdue damage cap and basic attack hold:
  - Remove artificial damage clamp in `damageMonster` so players can fight and defeat monsters smoothly without artificial godmode.
  - Remove attack cancellation in `playerBasicAttack`.

## Phase 3: Localization (`js/locale.js`)
- [ ] Add new strings in `en.ui` and `th.ui`:
  - `"The creature broke free from the bait! Weaken it for a higher catch rate!"` -> `"สิ่งมีชีวิตดิ้นหลุดออกจากเหยื่อ! โจมตีให้อ่อนแอกว่านี้เพื่อเพิ่มโอกาสจับ!"`
  - `"Gotcha! Successfully tamed"` -> `"จับสำเร็จแล้ว!"`

## Phase 4: Test Suite Updates & Full Verification
- [ ] Update `js/pets.test.js`:
  - Replace >30% rejection tests with catch chance scaling tests at 100% HP, 50% HP, 10% HP, LUK bonus, and status condition bonus.
- [ ] Update `js/pets-integration.test.js`:
  - Update integration tests to verify healthy monster catch attempt with roll, breakout on high roll, and success on low roll.
- [ ] Update `js/pets-subdue.test.js` -> rename/streamline for dynamic catch mechanics.
- [ ] Run `npm test` across all 117 test suites to verify 100% pass rate.
