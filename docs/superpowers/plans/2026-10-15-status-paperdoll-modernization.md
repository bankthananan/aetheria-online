# Status & Equipment Paper-Doll UI Modernization (C) Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modernize the Character Status window (`C`) and paper-doll in `js/game.js` to render active weapon element imbues (`poison_coat`, `blessing`), active combat buff indicators, Tier IV Hybrid Calling prestige badges with dual-class lineages and stat bonuses, and advanced sub-stat distributions (MATK, Lifesteal, Attack Element).

---

## Architecture & Interfaces

1. **Active Combat Effects & Weapon Imbues (`js/game.js`)**:
   - `paperDoll(p)`: When `slot === 'weapon'` and `p.imbue && now() < p.imbue.until`, display an inline glowing element chip and remaining duration (e.g. `✨ Imbued: [Nature ☠️] (12s)`).
   - In `panelBody('char')`: Render an active buff & imbue strip when `p.imbue` is active or `p.buffs` contains active buffs, showing skill source, multiplier/stat, and remaining seconds.
2. **Tier IV Hybrid Master Identity (`js/game.js`)**:
   - In the Status header: When `p.tierIndex >= 3` or `p.hybridJobId` is set, render a `.st-hybrid-badge` displaying:
     - Gold crest `✦`
     - Hybrid Title and localized role tag (e.g. `Nightblade Sovereign · [Void Assassin]`)
     - Dual-class lineage (e.g. `Lineage: Shadow Blade + Drifter`)
     - Permanent evolution stat bonus (e.g. `+12 AGI · +8 DEX · +5 LUK`)
3. **Advanced Sub-Stats in Derived Attributes (`st-derived`)**:
   - Display `MATK` (`p.magicAtk`) alongside `ATK` when `p.magicAtk > 0` or class is magic/hybrid.
   - Display `Lifesteal` (`p.lifesteal%`) whenever `p.lifesteal > 0`.
   - Display `Element` (`imbueElement(p) || p.weaponElement || 'Neutral'`) showing active attack damage affinity with element chip.
4. **Localization Parity (`js/locale.js`)**:
   - Thai translations for `Imbued`, `Active Buffs`, `Active Imbue`, `Lifesteal`, `Element`, `Neutral`, `MATK`.
5. **Testing & Verification**:
   - Create `js/status-tier4-imbue.test.js` verifying:
     - Weapon slot reflects nature imbue on `poison_coat` cast with correct remaining duration.
     - Active buffs strip displays ATK/DEF buffs with remaining time.
     - Header renders Tier IV hybrid badge, lineage, and evolution bonus upon Lv 70 promotion.
     - `st-derived` displays MATK, Lifesteal, and Element.
     - Thai localization coverage passes (`js/locale-coverage.test.js`).
   - Run `npm test` ensuring 105/105 suites pass.

---

## Tasks Breakdown

- [ ] **Task 1: Status Window Imbue, Buff Strip, Hybrid Badge, and Sub-Stats**
  - Files: `js/game.js`, `js/locale.js`
  - Implement active imbue badge in weapon slot of `paperDoll(p)`.
  - Implement active buffs & imbues banner in `char` panelBody.
  - Implement Tier IV Hybrid Calling badge in Status header.
  - Expand `st-derived` attributes with MATK, Lifesteal, and Element.
  - Add Thai translations to `L10N.th.ui`.
- [ ] **Task 2: Unit Test Suite & Validation**
  - Files: `js/status-tier4-imbue.test.js`
  - Write test verifying weapon slot imbue badge, active buff strip, Tier IV hybrid badge, and derived sub-stats.
  - Run `node script/run-tests.mjs js/status-tier4-imbue.test.js js/locale-coverage.test.js`.
- [ ] **Task 3: Full Regression Verification & Clean Tree**
  - Files: all
  - Execute `npm test` across all suites (target: 105/105 passing).
  - Verify zero console errors, zero regressions, and clean git working tree.
