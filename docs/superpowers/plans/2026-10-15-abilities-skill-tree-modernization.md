# Abilities & Skill Tree UI Modernization (K) Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modernize the in-game Abilities window (`K`) in `js/game.js` to render the complete 4-tier class progression tree (First Job, Second Job Branch, Advanced Calling, and Hybrid Master Calling) with hybrid ultimate skill learning, hotbar binding, and bilingual localization parity.

---

## Architecture & Interfaces

1. **Four-Tier Tab Navigation (`skillsPanelHtml` in `js/game.js`)**:
   - Expand tab index to `[0, 1, 2, 3]` with Roman numerals `['I', 'II', 'III', 'IV']`.
   - Dynamic tab title resolution:
     - Tier 0: `PROGRESSION.tiers[p.classId][0].name` (`First Job`)
     - Tier 1: `selectedBranch?.tiers?.[1]?.name || 'Choose at Lv 15'` (`Second Job`)
     - Tier 2: `selectedAdvancedJob?.name || 'Choose at Lv 40'` (`Advanced Job`)
     - Tier 3: `p.hybridJobId ? PROGRESSION.hybridJobs[p.hybridJobId]?.name : (PROGRESSION.tiers[p.classId][3]?.name || 'Hybrid Calling')`
2. **Hybrid Master Calling Chapter (Tier 3)**:
   - Header identity banner with dual-class lineage (e.g. `Shadow Blade + Drifter → Nightblade Sovereign`), role tag, and evolution bonus stats.
   - Signature Hybrid Ultimate skill card rendering (`eclipse_strike`, `apocalypse_harvest`, `orbital_strike_beacon`, `colossal_onslaught`, `elemental_strike`, `phalanx`, `arcane_arrow_barrage`, `tempest_sanctuary`, `cyclone_lotus_kick`).
   - Detail strip integration: selection reveals description, damage formulas, cooldown, range, `[Learn +1]`, and `[→ Bar <kbd>X</kbd>]`.
3. **Engine & Hotbar Usability**:
   - Ensure `skillsFor(cc)` / `canUseSkill` recognizes learned hybrid skills so they can be saved in loadouts, bound to hotbars, and cast in rotation without restrictions.
   - Update `cardHtml` requirement copy for `reqHybridJob` to display `Hybrid Calling · Lv 70 Advancement`.
4. **Bilingual Localization (`js/locale.js`)**:
   - Complete Thai translations for `HYBRID CALLING`, `SIGNATURE HYBRID ULTIMATE`, `LINEAGE`, `EVOLUTION BONUS`, `Hybrid Calling`, `Lv 70 Advancement`, `Unlock at Lv 70`.
5. **Regression Safety & Tests**:
   - Update `js/skill-system.test.js` to assert 4 job chapters across all 10 classes.
   - Update `js/skill-tree-ui.test.js` to assert 4 chapters (1 visible, 3 hidden) and tab switching to Tier IV (Chapter 3).
   - Add new test suite `js/skill-tree-tier4.test.js` verifying Chapter IV rendering, hybrid skill selection, learning at Lv 70, and hotbar assignment across all 10 classes.
   - Full test run (`npm test`) passing 104/104 suites with 0 regressions.

---

## Tasks Breakdown

- [ ] **Task 1: Four-Tier Chapter Rendering & Hybrid Skill Inclusion in `skillsPanelHtml`**
  - Files: `js/game.js`, `js/locale.js`
  - Expand `lanes` and tabs to `[0, 1, 2, 3]`.
  - Wire hybrid calling identity banner, lineage, bonus stats, and signature skill card for Tier 3.
  - Update `skillsFor` and `canUseSkill` so hybrid skills are recognized for character classes.
- [ ] **Task 2: Unit Test Suite & Chapter Verification**
  - Files: `js/skill-system.test.js`, `js/skill-tree-ui.test.js`, `js/skill-tree-tier4.test.js`
  - Update chapter count assertions in `skill-system.test.js` (4 chapters) and `skill-tree-ui.test.js` (1 visible, 3 hidden).
  - Create `js/skill-tree-tier4.test.js` testing Tier IV tabs, hybrid skill cards, learning, and hotbar binding for all 10 classes.
- [ ] **Task 3: Full Test Suite Verification & Visual Sanity**
  - Files: all
  - Execute `npm test` across all suites (target: 104/104 passing).
  - Verify zero console errors and zero regressions.
