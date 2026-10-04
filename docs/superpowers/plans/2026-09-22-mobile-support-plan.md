# Aetheria Online improvement and mobile support plan

Date: 2026-09-22

Status: Implementation in progress. Persistence/expansion APIs, mobile input and viewport foundations, field-guide goals, loot protection/relevance, and two loadouts are implemented with automated regression coverage. Training/combat-evidence lessons, the Woods event, and the three-wave expedition remain unfinished. The [execution ledger](2026-09-23-execution-progress.md) records actual checks and remaining gates for the [implementation plan](2026-09-23-full-game-improvements.md). Mobile/browser acceptance has not passed: headless Brave exits 134 before producing screenshots.

## Goal and constraints

Confirmed goal: deliver the same action RPG on desktop and phone, with full touch controls.

Preserve the live zero-build application (`index.html` and `js/*.js`), existing desktop controls, `awo_save_v1`, and `window.__AWO`. Keep balance values in `js/design.js` and content in the existing JavaScript data modules. Leave the legacy application untouched.

Assumption for design review: retain the current art direction, classes, and core progression. Support both portrait and landscape layouts without changing combat rules between devices. Same gameplay does not imply cloud saves or cross-device save synchronization.

The working tree already contains engine, art, audio, localization, map, and content-expansion changes. Preserve them and establish the implementation baseline before editing overlapping files.

## Recheck evidence

The 2026-09-22 review inspected the current working tree, recent commits, live entry point, touch handlers, theme, canvas scaling, and test configuration.

| Finding | Evidence | Consequence |
| --- | --- | --- |
| Touch combat lacks parry | `index.html` and `initTouchControls()` in `js/game.js` expose six skills, attack, and dodge; keyboard `V` calls `performParry()` | Full combat parity is incomplete |
| Landscape can be blocked | `js/theme.js` displays `#rotate-hint` below 850px width and 500px height in landscape | Some phones cannot play in their chosen orientation |
| World view scales a fixed canvas | `js/game.js` uses 832×576 and `.world-canvas` fits it to the viewport | At 390px width the world is approximately 270px tall, risking small targets and poor portrait use of space; visual confirmation is pending |
| Touch actions have generic labels | Touch controls display `S1` through `S6` | Equipped skills and readiness are harder to identify directly |
| Joystick input occupies a broad region | `.touch-zone` spans the left 45vw and full height | World taps and HUD interactions require hit-testing checks; interference is a risk, not a browser-confirmed defect |
| App switching lacks explicit lifecycle handling | Review found a `beforeunload` save handler but no `visibilitychange` input reset | Define safe movement, timing, audio, and save behavior when the app is backgrounded |
| Touch test coverage is shallow | `js/phase1.test.js` checks that `isTouchDevice()` returns a boolean | Its success message does not establish gesture, simultaneous-input, or layout correctness |
| Expansion tests are outside the default command | `js/expansion.test.js` is absent from `npm test` and uses `console.assert` | Default success does not establish expansion acceptance; failed assertions may not produce a failing process exit |

Verification performed:

- `npm test` completed with exit code 0. The command includes both legacy and active-game suites.
- Attempted a headless Brave capture of `autotest.html` at 390×844. Brave exited with code 134 without an image.
- Browser layout, runtime-error banner state, actual touch gestures, device performance, and complete player journeys remain unverified.
- No gameplay implementation changes were made during this review.

## Research and design implications

- [W3C target size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html): the enhanced criterion specifies 44×44 CSS-pixel targets, with exceptions. Use at least that size as a project target for standalone mobile controls and larger primary combat buttons where space permits. This is a design target, not a claim of WCAG compliance.
- [W3C orientation guidance](https://www.w3.org/WAI/WCAG22/Understanding/orientation.html): support orientation choices unless a restriction is essential. Recommend replacing the blocking rotation overlay with usable layouts in both orientations.
- [MDN Pointer Events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events): use pointer identities, capture, and cancellation handling to coordinate mouse and touch actions and simultaneous movement/combat.
- [MDN visibilitychange](https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilitychange_event): treat backgrounding as an explicit lifecycle transition. Clear held input, save appropriately, and define timing/audio behavior before resuming.
- [Game Accessibility Guidelines](https://gameaccessibilityguidelines.com/full-list/): interactive tutorials and contextual guidance support learning. Apply these to existing mechanics rather than adding more systems before players can understand the current ones.

## Approaches considered

| Approach | Benefit | Tradeoff |
| --- | --- | --- |
| Adaptive desktop-and-phone interface — recommended | Shared game rules with complete input parity and layouts suited to each screen | Requires coordinated input, camera/layout, and HUD work |
| Patch current mobile CSS and buttons | Smaller initial change | Retains fixed-canvas and competing-control limitations |
| Redesign the entire interface | Broad freedom to reorganize the experience | Larger scope before evidence identifies which changes improve play |

## Phase 1: Complete mobile playability

Proposed scope:

1. Inventory every gameplay action and establish its keyboard, mouse, and touch equivalent: movement, targeting, attack, all equipped skills/items, dodge, parry, interaction, Hunt controls, and menu actions.
2. Route input through shared gameplay actions. Track simultaneous pointers independently and clear held state on cancellation, focus loss, backgrounding, and relevant modal transitions. Ensure initialization does not duplicate listeners.
3. Replace generic skill labels with equipped skill/item icons or names, cooldowns, resource availability, and accessible labels. Keep every equipped slot reachable.
4. Define portrait and landscape HUD arrangements with safe-area insets, browser toolbar changes, readable text, and separated control regions. Avoid overlapping the hotbar with touch actions.
5. Review camera and world sizing together. Choose a readable view that preserves threat awareness and correct screen-to-world targeting; changing CSS alone must not stretch the world or misalign effects.
6. Make character creation, dialogue, inventory, equipment, skills, quests, shops, and settings usable without hover or keyboard input. Verify scrolling and dismissal without activating combat behind panels.
7. Define save, pause/resume, audio, and timer behavior during app switching. Preserve existing save compatibility.

Likely surfaces: `index.html`, `js/game.js`, `js/theme.js`, `js/locale.js`, active-game tests, and `autotest.html`. Extract focused input/layout helpers only where needed; avoid unrelated engine refactoring. Keep balance changes out of this phase unless a demonstrated defect requires one.

Acceptance criteria:

- Complete character creation → first quest → combat → loot/equip → skill spending → save/reload on touch alone.
- Move and attack/cast simultaneously; dodge and parry are available on touch and use the same game rules as desktop.
- Releasing/cancelling a pointer or switching apps never leaves movement or an action stuck.
- Every skill/item slot remains reachable with accurate feedback; a gesture does not accidentally activate twice.
- Portrait and landscape are playable without blocking overlays, clipped essential controls, or unintended page overflow.
- Menus and dialogue receive input without accidental world movement or combat.
- English and Thai layouts remain readable at supported phone widths.
- Existing saves load successfully and desktop controls still work.

## Phase 2: Improve the opening experience and combat clarity

Build on Phase 1 acceptance before expanding scope.

- Introduce a short, replayable interactive sequence: move → attack → dodge/parry → equip loot → spend a skill point.
- Show the current objective and the next useful action without crowding the combat view.
- Explain unavailable actions with clear cooldown, resource, range, or target feedback.
- Review enemy attack telegraphs and player hit feedback at actual phone scale.
- Make manual control and Hunt mode transitions understandable and predictable.
- Reuse existing equipment comparisons and class guidance; improve their discoverability before inventing replacements.

Acceptance: a new player can finish the opening loop using device-appropriate prompts, identify their next objective, and explain why an unavailable action failed. Validate with player observation; automated tests alone cannot establish comprehension or enjoyment.

## Phase 3: Progression and content tuning

- Playtest the existing quest, job-branch, equipment, guild, rebirth, and expansion journeys before recommending additional systems.
- Record time to first reward, first meaningful equipment choice, and first promotion; identify confusing gates and repetitive stretches.
- Verify expansion features through their real game entry points, reward transactions, and save/reload paths. Pure helper tests are insufficient.
- Tune demonstrated pacing issues in `js/design.js`; preserve deliberate class differences and avoid speculative global balance changes.
- Prioritize content that creates meaningful choices over additional currencies or menus.

Acceptance: proposed balance changes have a documented problem, reproducible scenario, expected outcome, and regression checks. Content rewards and progression persist correctly.

## Verification plan

Use these representative CSS viewport sizes: 360×800, 390×844, 412×915, 844×390, tablet 768×1024, and desktop 1366×768. Include coarse-pointer emulation, not just a narrow desktop window.

- Run `npm test` for code/data changes and judge success by exit code.
- Add meaningful assertions for newly changed behavior. Strengthen touch coverage beyond device detection; make relevant expansion failures exit nonzero before relying on them.
- For active-game logic changes, create temporary `.mjs` harnesses outside the repository, mock browser globals, import `js/game.js`, and drive `window.__AWO`.
- For runtime/visual changes, serve locally and capture relevant `autotest.html` states in headless Brave. Inspect both images and the runtime-error banner.
- Check the actual `index.html` flow too: its viewport configuration and rotation markup differ from `autotest.html`.
- Exercise simultaneous touch, pointer cancellation, orientation changes, browser toolbar resizing, panel scrolling, and app background/resume.
- Validate on actual iOS Safari and Android Chrome when devices are available. Record device/browser versions and untested combinations.
- Measure frame timing during ordinary combat and crowded encounters on a representative phone. Set a performance budget after obtaining a baseline; no mobile frame-rate claim is established yet.
- Keep screenshots and diagnostic harnesses outside the repository. Park monsters for movement assertions, force kill-type guild bounties for kill loops, and use floating-point tolerances where appropriate.

## Decisions before implementation

- Confirm the adaptive interface as the selected approach.
- Review portrait/landscape layouts and the camera strategy, including enemy visibility and targeting.
- Decide the exact background/pause behavior and how modal panels affect active combat.
- Confirm the supported device/browser baseline and performance target after measurement.

Under the explicitly requested `superpowers:brainstorming` workflow, develop and approve the focused Phase 1 design before implementation. The written design and subsequent detailed implementation plan require review. This research roadmap records the findings and proposed sequence; it is not evidence of approval or completed implementation.

## Other-game research: content and functions

Research date: 2026-09-22. These comparisons use publisher/developer documentation, including historical feature announcements. They establish that a design pattern exists, not its current balance or its effectiveness for Aetheria. Recommendations below are adaptations based on this repository, not claims that copying a feature guarantees better retention. No comparison games were hands-on tested during this review.

### Existing foundations to reuse

Code inspection found the following in the live application:

- `js/game.js`: class-aware loot, item/affix search, category tabs, equipment comparisons, crafting, sockets, transmog, task guidance, collection milestones, elemental information, boss telegraphs, raid phases, and Rift handling.
- `js/progression.js`: job branches, signature mechanics, example combos, and promotion trials. Many branch trials have distinctive descriptions but use ordinary kill-count objectives.
- `js/systems/` and `js/zones/whispering-woods/`: exploration, lore/POIs, mastery, dailies, rares, and subdungeon foundations. Their complete runtime integration and persistence remain acceptance work.

Therefore, recommendations should extend these foundations. Do not propose a second collection book, a second daily system, or another generic kill-bounty board.

### Comparison and priority

Priority means order after the mobile baseline, not approval to implement everything. Effort is relative: S = focused extension, M = several connected systems, L = new cross-system behavior. These are scope estimates, not delivery promises.

| Reference game and documented feature | Adaptation for Aetheria | Existing foundation / missing piece | Priority / effort |
| --- | --- | --- | --- |
| Final Fantasy XIV: repeatable role training with equipment rewards [1] | Class practice trials that teach dodge, parry, range, healing, or a branch combo | Combat actions exist; promotion objectives are often kill counters | High / M |
| Last Epoch: configurable loot visibility/highlighting rules [2] | Simple loot relevance presets and inventory highlighting, with a visible Show All control | Search and sorting exist; drops currently go directly into inventory, so ground-label filtering is not the right first implementation | High / M |
| Hades: inspect Boon Lists from the Codex or while choosing a boon [3] | Contextual skill/element explanations and links from equipment or skill choices into the existing Collection Book | Information exists but can be disconnected from the decision screen | High / S–M |
| Diablo Immortal: Armory loadouts and equipment-filter improvements [4] | Two named equipment/hotbar presets, such as Boss and Explore | Equipment instances and hotbar assignment exist; no named loadout flow was found in the inspected live code | Medium / M |
| Guild Wars 2: events affect local world state and access to content [5] | One short zone event chain with a visible consequence and a recoverable failure path | NPCs, quest guidance, map gates, rares, and zone modules provide foundations | Medium / L |
| Diablo Immortal: a documented Fractured Plane variant offers starting builds and randomized modifiers [4] | A bounded optional Rift expedition with a clearly chosen challenge and reward preview | Rift waves and mutators exist; avoid building a separate endgame mode | Later / M–L |

### A. Class training and meaningful promotion trials

Start with one optional practice encounter in the starting town. Teach movement and attack, then a class-relevant action with an immediate retry. Later, make a promotion trial demonstrate the selected branch mechanic rather than merely describing it above a kill count.

Example proposals: a blade user parries a clearly signalled strike; a ranged user defeats a target while respecting distance; a caster applies a setup effect before detonating it. Exact counts, timings, and rewards require balance review. Lessons should use the real combat rules and device-appropriate prompts.

Touch impact: all lessons must be completable with the normal mobile controls, including simultaneous movement and actions. Do not demand a gesture that the regular game does not support.

Acceptance: the intended combat event advances the objective; unrelated kills do not. Retrying does not duplicate first-completion rewards. The lesson distinguishes an unsuccessful attempt from an input failure. Automated Hunt cannot silently complete a manual practice objective.

### B. Loot relevance and protected equipment

Adapt Last Epoch's clarity principle to Aetheria's automatic inventory collection. Start with presets such as All, Usable by my class, and Selected affixes. Highlight useful new drops and reduce notification noise; keep all acquired items available through Show All. Do not silently discard or sell filtered items.

Add a favorite/protect flag as an Aetheria-specific companion improvement, not a claim about Last Epoch's filter. Apply protection consistently to sale and any future destructive bulk operation. Preserve current category search and equipment comparisons rather than replacing them with a large rule editor.

Touch impact: presets should be reachable with taps and require little typing. Show why an item matches; raw attack alone must not label every item an upgrade for every build.

Acceptance: filtering does not change loot probabilities, inventory contents, or collection tracking. Show All restores visibility. Protection survives save/reload, and protected items cannot enter a destructive operation through a second UI path.

### C. Explain builds at the point of choice

Use the existing skill roles, elemental table, class advice, and Collection Book as one source of information. From a skill or equipment detail, offer a contextual explanation of relevant mechanics and prerequisites, returning to the same selection afterward.

Example: a detonator skill should explain which existing setup effects it consumes or benefits from. Link to the relevant learned skill or class guide. Let players pin a desired recipe/item and see known sources plus the missing-material count; this tracking is an Aetheria proposal, not a Hades feature claim.

Touch impact: use a tap-open detail sheet; no required hover. Keep descriptions readable in English and Thai and avoid hiding confirmation controls below inaccessible content.

Acceptance: displayed mechanics match combat data, links preserve selection/scroll state, unavailable sources disclose their progression gate, and pinning a goal grants no items or progression.

### D. Named equipment and hotbar presets

Offer two editable presets initially. Save owned equipment instance IDs and hotbar assignments; applying a preset must preserve class restrictions, learned-skill requirements, cooldowns, and consumable quantities. Start with out-of-combat switching in a safe location. Stat allocation resets and job-branch changes are outside this first version.

Blizzard documents replacement of missing equipment by same-name items. For Aetheria, prefer an explicit missing-item warning and block application until resolved: same-name items can have different affixes, sockets, and refinement. This is a deliberate adaptation.

Acceptance: validate the full preset before changing equipment. Missing/sold/stored items, duplicate references, changed class eligibility, full inventory, rebirth, and old saves are covered. Applying a preset never duplicates gear, heals for free, or resets cooldowns. This feature requires save/progression review.

### E. One zone event with a visible consequence

Prototype the content design in Whispering Woods: recover a scout's supplies → defend a waystone → reveal a trail to an existing dungeon or rare encounter. This is original proposed content using local names and systems, not a reproduction of a Guild Wars 2 quest.

Keep the first chain local to the player's save. A failure can lead to a recovery objective, and a success can reveal a shortcut or optional encounter. Avoid requiring a global event server, scheduled attendance, or blocking the main story behind a missed timer.

Touch impact: target a short, understandable session with one tracked stage and one optional objective. A proposed 5–10 minute duration must be measured, not assumed. Backgrounding behavior follows the Phase 1 lifecycle decision.

Acceptance: all stages are reachable, success/failure transitions are valid, rewards cannot be claimed twice, and save/reload resumes or safely resets the chain according to the approved design. Verify the actual dungeon/rare spawn, not only an announcement toast.

### F. More choices inside the existing Rift

After core journeys are reliable, offer a small number of explicitly described expedition variants using existing Rift infrastructure. Preview the modifier and expected reward type before entry. Begin with one short variant rather than adding an endless catalogue or another currency.

Separate temporary expedition effects from permanent progression. Review interaction with existing reflection, burn, and mana modifiers so combinations remain playable for every class. Any starting-build experiment must not overwrite the character's real equipment or learned skills.

Acceptance: exit, death, and reload clean up temporary state; rewards commit once; difficulty and reward rules match on desktop and phone. Add meaningful encounter differences rather than only increasing enemy HP.

### Recommended first content slice

After mobile parity, combine A and C: one class practice encounter with contextual explanations using existing mechanics. This tests whether the game becomes easier to understand without adding a new progression economy. Follow with B to reduce inventory friction. Introduce D, E, and F as separate designs only after their dependencies pass acceptance.

Do not yet expand into multiplayer raids, trading/auction systems, housing, pet progression, a battle pass, or login-streak rewards. They are outside the confirmed goal and would add substantial systems or obligations before the current player journeys are verified. Borrow interaction principles, using Aetheria's own content and art.

### Integration issue discovered during comparison

The current admin daily helpers in `js/game.js` reference `G.dailies.activeChallenges` and call `DailiesSystem.generateDailies(...)`. The inspected `js/systems/dailies.js` instead exposes `activeDailies`, `checkAndRefreshDailies`, and `rollDailies`, with no `generateDailies` method. This is a static interface mismatch: the reroll helper would call a missing method, while the completion helper checks the wrong collection. These admin paths were not executed in this review. Resolve and test this mismatch before using admin screenshots as evidence that daily content works.

### Primary sources

1. [Final Fantasy XIV — Training for Party Combat](https://na.finalfantasyxiv.com/uiguide/party/party-how/party_practice.html): repeatable role exercises and early equipment rewards.
2. [Last Epoch Support — Loot Filter](https://support.lastepoch.com/hc/en-us/articles/46361669143067-Loot-Filter): display filtering, highlighting, rule precedence, and temporary filter bypass.
3. [Supergiant Games — Hades: Latest Updates](https://www.supergiantgames.com/blog/hades-updates/): historical documentation of Boon Lists accessible from the Codex and boon choices.
4. [Blizzard — A Gilded Dawn: Tong Shi's Renewal](https://news.blizzard.com/en-gb/article/24173072/a-gilded-dawn-tong-shis-renewal): Armory improvements and a Fractured Plane variant with build choices/modifiers. Only these mechanics inform the proposals, not the article's monetization systems.
5. [ArenaNet — The Megaserver System: World Bosses and Events](https://www.guildwars2.com/en-gb/news/the-megaserver-system-world-bosses-and-events/): historical explanation of events changing access to world content. Its server scheduling architecture is not proposed for Aetheria.

## Concrete design for the full requested scope

Design prepared: 2026-09-23.

The request to implement all features selects the adaptive interface and all six proposals A–F. The design below resolves the roadmap's open implementation choices for review. Research suggestions explicitly excluded above (multiplayer, trading, housing, monetization, and additional pet progression) remain outside scope.

This is one coordinated release divided into seven dependent work packages. Each package has a separate acceptance boundary; completing one package does not mark the whole request complete. Preserve current art and combat balance unless a reproducible defect justifies a specific correction. No new runtime dependencies or backend are required.

### 1. Existing-system integrity and persistence

Reconcile the existing expansion callers with their actual module APIs before introducing features on top of them. Fix the daily admin helpers, and exercise the actual daily board, generation, progress, and claim path. Connect rare announcements to real spawned entities, and verify dungeon entry/exit and completion through player-accessible controls.

Persist exploration, mastery, daily progress/claims, rare progress, and completed dungeon records in optional fields within the existing save envelope. These states are present in `G` but absent from the inspected `saveGame()` payload. Normalize missing fields when loading older saves; keep the existing save key and profile suffixes. Runtime objects, DOM references, paths, and live combat timers must not enter the save.

Use a shared transaction convention for new rewards: validate eligibility, mark the claim, award once, then save the combined state. Display save failures instead of claiming progress is safely stored. Prevent repeated click handlers and repeated scene entry from awarding a reward twice.

New game starts with clean state. Rebirth keeps owned items, item protection, collection information, loot preferences, and saved loadout definitions; revalidate loadouts against the new class. Training completion/rewards are recorded per class. Zone discovery and completed event rewards remain world history. Active training, events, and expedition combat are stopped on rebirth.

Acceptance: legacy save migration, new game after a previous session, save/reload, rebirth, claim replay, and missing/invalid optional state all have meaningful assertions. Strengthen expansion tests to use throwing assertions and include them in the default test command.

### 2. Adaptive mobile view and full input parity

Keep desktop WASD, clicking, and hotkeys. Introduce one input adapter for pointer actions and one clear-input operation. Movement retains its own pointer ID; skill, attack, dodge, parry, and interaction buttons accept other pointers simultaneously. Pointer cancellation, lost capture, focus loss, and modal entry release held actions. A pointer gesture dispatches once; no duplicate touch-plus-click execution.

Support all nine existing hotbar slots, including item slots. On phones, show a three-by-three skill/item grid with icons, names in accessible labels, cooldown overlays, and quantities where applicable. Attack, dodge, parry, and interaction are separate primary actions. Use a bounded lower-left joystick region; world taps outside it still target or navigate. Provide a touch-control setting for hybrid devices.

Portrait uses a compact top HUD, central world viewport, and bottom control area. Landscape places controls in bottom corners and condenses auxiliary information. Both respect safe-area insets and available viewport height. Remove the blocking rotation requirement. Use at least 44×44 CSS-pixel targets for standalone controls, with larger attack and movement affordances. Menus use scrollable sheets with a consistently reachable close button. The touch grid replaces the redundant desktop hotbar presentation on phones.

Separate camera viewport dimensions from world coordinates and tile size. Preserve the desktop logical view at 832×576. On small screens, fit the logical view to the reserved play area while targeting a readable tile scale; allow the camera to show a different extent rather than stretching the world. Rendering bounds, camera clamping, effects, and screen-to-world targeting consume the same viewport calculation. Add an edge indicator for the current hostile target if the smaller viewport hides it. Attack ranges and simulation rules remain world-space values shared by every device.

Opening a blocking panel or dialogue pauses the local combat simulation and clears manual input. Backgrounding also pauses simulation and audio, saves, and presents an explicit Resume action on return. Use a pause-aware monotonic game clock for combat deadlines so cooldowns, hazards, buffs, and respawns do not elapse while paused. Daily rotation continues to use calendar time. Resume resets frame timing; it does not process accumulated background damage or automatically restart Hunt.

Acceptance: nine slots and every combat action work on touch; move-plus-cast works; cancellation cannot stick movement; panels prevent underlying actions; rotation preserves position and targeting; no hidden-time damage; all specified phone/tablet/desktop sizes are inspected. Physical-phone acceptance remains distinct from desktop emulation.

### 3. Opening lessons and class practice

Provide an optional Training entry in the starting-town menu and a discoverable prompt after the opening dialogue. Lessons are short, repeatable, and use real combat events: movement, successful attack, avoidance, equipment, and learned-skill use. Distinguish pressing Parry from successfully parrying a hit; only the latter completes that lesson.

Use an isolated practice encounter with a saved return location and a predictable, non-rewarding opponent. Training temporarily disables Hunt and routes. It cannot generate ordinary drops, XP, bounty progress, or world-event credit. Leaving, dying, reloading, or rebirthing restores a safe normal-world location and clears practice effects. Temporary training actors are never persisted.

Offer class-appropriate mastery exercises: blade parry, drifter avoidance followed by attack, mage setup/detonation, ranger ranged positioning, paladin effective healing, monk momentum/finisher, and elementalist setup/detonation. Determine valid skills from the existing combat and progression definitions; unavailable mechanics explain their prerequisite instead of producing an impossible exercise.

For newly accepted branch mastery trials, combine the existing target objective with a demonstrated branch mechanic. In-progress legacy trials retain their stored objective so an update does not invalidate prior progress. Combat evidence records the actual effect or successful sequence, not a UI button click or unrelated kill. Add a small, one-time training completion reward per class using existing items/currency, with values in `js/design.js`; repeat practice grants no repeatable economy reward.

Acceptance: cover all seven classes, genuine and invalid completion attempts, automation exclusion, retry, cancellation, reload, and one-time reward persistence. Manually confirm that device-specific prompts match actual controls.

### 4. Contextual guidance, loot relevance, and protection

Extend the existing detail views and Collection Book. A skill detail explains prerequisites, element, resource cost, cooldown, and its actual setup/detonation relationships from the combat data. Tap-open details work without hover. A return action restores the originating panel and scroll position.

Allow one pinned item or recipe goal at a time. Show required versus owned materials, known drop/shop sources, and progression gates. Reuse existing task guidance for reachable destinations. Pinning does not spend resources, grant items, or silently enable Hunt. Persist the selected goal and discard it safely if its definition is removed.

Add All, Class-usable, and Selected-affix inventory relevance presets. Use the existing affix definitions for selectable filters. Preserve search and category tabs. Always keep a visible Show All action and a filtered-item count. Relevance changes only presentation and optional loot notifications; every rolled drop still enters inventory and collection tracking.

Add a persisted protected flag to individual equipment instances. Show it in bag, equipment, and storage views. Protecting an item prevents sale or destruction through every relevant handler, not only a disabled button. Equipping and storage transfer remain allowed. Explain blocked sale attempts. No new auto-sell or salvage economy is included.

Acceptance: filtering preserves exact inventory contents and RNG behavior; protection follows the same UID through equip/storage/reload; every sale path enforces it; guidance reflects actual formulas and gates; English and Thai text is supplied for new interface copy.

### 5. Two named equipment/hotbar loadouts

Store two user-named presets containing slot-to-equipment UID references and nine hotbar entries. Presets do not copy item instances or alter learned skills, stat allocation, branch selection, refinement, sockets, or transmog. Rename and overwrite require explicit controls with clear feedback.

Apply only in the starting town, outside training, dialogue, active encounters, and expeditions. Validate the whole preset against current equipped gear and inventory before mutation. Stored, sold, missing, duplicate, wrong-slot, or class-incompatible equipment blocks the entire application and identifies the problem. Hotbar skills must be learned and legal; item entries must reference existing item definitions and owned consumables. No same-name substitution occurs.

After validation, compute the resulting equipment and inventory in memory, then commit once and recompute stats once. Preserve absolute HP/MP, capped to the new maxima; preserve stamina, cooldown deadlines, consumable counts, and protection. A failed application changes nothing. Rebirth retains preset definitions but marks now-incompatible presets unavailable until edited.

Acceptance: gear identity and total ownership are conserved; repeated application cannot heal, duplicate equipment, clear cooldowns, or bypass restrictions; old saves default to empty presets; invalid and partially missing presets leave state unchanged.

### 6. Whispering Woods event chain

Add one optional event using existing zone content: recover the Scout's Satchel, defend the Mossy Waystone, then reveal a marked route to Goblin Warrens. Initiate through a zone NPC or explicit event interaction. The objective tracker shows one active stage; the world map reflects the revealed route after success. This does not lock an existing dungeon or main quest behind the new event.

The defense has its own identifiable attackers and success/failure conditions. Defeat them before the waystone's health is exhausted. Failure transitions to a recovery stage where the player can repair and restart without losing story progress. Ordinary unrelated kills do not count. Wave sizes, damage, waystone health, and rewards live in `js/design.js`; content text and identifiers live in the zone modules.

Persist stable event stages, completed/revealed flags, and reward claims. Reload during defense returns to the defense-ready checkpoint, with no partial-defense reward. Leaving the zone or dying during defense takes the recovery path. Award the completion reward once; optional replays are practice with no repeat claim. Backgrounding pauses according to the common lifecycle policy.

Acceptance: test all transitions, real attacker spawns, interactable objective positions, failure/retry, zone exit, death, reload, and duplicate claims. Confirm the visible map consequence and actual route to the existing dungeon.

### 7. Bounded Rift expedition

Keep the existing endless Rift available. Add one three-wave expedition selectable at Rift entry with a preview of the modifier, completion condition, and reward. The first variant uses the existing Mana Surge mechanic and a final elite encounter, avoiding an initial combination of reflection and burn that could disadvantage some classes.

Use the player's own build; no temporary equipment replacement or new starting-build inventory is needed. Expedition-only state contains the run identity, wave, modifier, and completion/claim status. It does not permanently mutate player stats. Complete the run after three cleared waves, return through a visible exit, and award the configured existing-currency/material reward once for that run. Repeated completed runs may earn the same advertised reward; duplicate claim attempts for one run cannot.

Persist only a stable checkpoint and claim ledger needed for crash-safe rewards. Reload during unfinished combat aborts the run and returns to town without a completion reward; the entry screen states this policy. Death, normal exit, new game, and rebirth clear expedition effects. A completed and already committed reward survives reload without being granted again.

Acceptance: preview and applied modifier agree; all classes can complete the scenario; death/exit/reload clean up state; endless Rift behavior still passes existing checks; concurrent clicks and reward replay cannot duplicate a payout.

### Boundaries, sequence, and release evidence

Keep `js/game.js` as the integration owner. New pure state/validation helpers belong in focused `js/systems/` modules; content stays in `js/content.js` or the existing zone modules, balance in `js/design.js`, visual rules in `js/theme.js`, and translated labels in `js/locale.js`. Helpers receive explicit state and return results; they do not query the DOM or mutate unrelated global state.

Implementation order: integrity/persistence → mobile input/view/lifecycle → training and guidance → loot/protection → loadouts → zone event → Rift expedition. Verify each transaction and runtime path before enabling its visible entry point. Work on `js/game.js` is serialized even if independent helpers or checks use subagents.

Required release evidence includes the default test command, temporary `window.__AWO` integration harnesses, legacy-save fixtures, actual menu-to-feature journeys, and inspected Brave captures of the relevant `autotest.html` and `index.html` states. Add deterministic coverage for every new claim, cancellation, and failed transaction. Record exact commands, exit codes, and unsupported checks in this file.

Performance baseline: capture frame-time distributions in the same combat scenarios before and after changes. Target at least 30 FPS on the selected representative phone, with optional cosmetic-effect reduction if necessary. This is an acceptance target, not a measured result. Physical-device browser and performance checks remain explicitly outstanding until hardware is available. Do not tune unrelated progression curves without player-path measurements demonstrating a problem.

Spec self-review: all six researched proposals and the mobile baseline have defined entry points, state ownership, failure behavior, persistence policy, and acceptance boundaries. Remaining execution choices are file-level task breakdown and verification tooling, to be recorded in the detailed implementation plan after written-spec approval.
