# Defeated Boss Auto-Farming & Quick Sell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable auto-farming for bosses once defeated at least once, and add a Quick Sell button in both the Inventory (Bag) and Shop to quickly liquidate unprotected Common & Magic gear.

---

### Task 1: Defeated Boss Auto-Farming Engine & UI

**Files to modify:**
- `js/game.js`: Add `isBossDefeated`, update `acquireAutoTarget`, `autoHuntEligible`, and `automationPanelHtml`.
- `js/locale.js`: Add English and Thai translations for boss auto-farm lock/unlock status.
- `js/automation.test.js`: Add unit and integration tests verifying boss auto-farm gating and unlocking.

**Implementation Steps:**
- [ ] Implement `isBossDefeated(monsterId)` in `js/game.js`.
- [ ] Update `acquireAutoTarget` in `js/game.js`: in Free Hunt mode, include bosses where `isBossDefeated(monster.def.id)` is true; exclude undefeated bosses.
- [ ] Update `autoHuntEligible(m, p)` in `js/game.js`: allow bosses if `G.huntTargetId === m.def.id || isBossDefeated(m.def.id)`.
- [ ] Update `automationPanelHtml`: display boss lock/unlock status in target species grid (`💀 Boss` vs `🔒 Defeat once to unlock`).
- [ ] Add localization strings in `js/locale.js`.
- [ ] Add assertions in `js/automation.test.js` testing both undefeated rejection and defeated acceptance.
- [ ] Run `node script/run-tests.mjs js/automation.test.js` to verify.

---

### Task 2: Quick Sell Button in Inventory & Shop

**Files to modify:**
- `js/game.js`: Implement `quickSellItems`, add UI buttons to Inventory toolbar and Shop Sell tab, bind click handlers.
- `js/locale.js`: Add English and Thai translations for Quick Sell UI, tooltips, and toast feedback.
- `js/loot-improvements.test.js`: Add unit tests auditing `quickSellItems` safety and zeny calculation.

**Implementation Steps:**
- [ ] Implement `quickSellItems({ p = G.player, notify = true } = {})` in `js/game.js`:
  - Filter `p.inventory` for items with `e.uid`, `!e.protected`, and `['common', 'magic'].includes(e.rarity)`.
  - Calculate sell price for each, splice from inventory, add to `p.zeny`.
  - Provide audio SFX, toast notification, and combat log feedback.
  - Return `{ count, zeny }`.
- [ ] Add Quick Sell button in `inv` panel toolbar (`#inv-quick-sell`) next to `#inv-sort-rarity`.
- [ ] Add Quick Sell button in `shop` panel Sell tab (`#shop-quick-sell`).
- [ ] Bind event listeners in `refreshPanel` for `#inv-quick-sell` and `#shop-quick-sell`.
- [ ] Expose `quickSellItems` on `window.__AWO`.
- [ ] Add localization strings in `js/locale.js`.
- [ ] Add tests in `js/loot-improvements.test.js` verifying:
  - Common and Magic gear are sold for correct zeny.
  - Protected gear is NOT sold.
  - Rare, Epic, Relic, Mythic gear is NOT sold.
  - Non-gear items (consumables, materials, cards, quest items) are NOT sold.
  - Returns appropriate notice when no qualifying gear is in inventory.
- [ ] Run `node script/run-tests.mjs js/loot-improvements.test.js`.

---

### Task 3: Full Verification & Integration

**Files to check:**
- Full test suite: `npm test`

**Implementation Steps:**
- [ ] Run `npm test` and verify all 117+ test suites pass.
- [ ] Commit changes with git.
- [ ] Push to `origin main`.
- [ ] Report outcome to user.
