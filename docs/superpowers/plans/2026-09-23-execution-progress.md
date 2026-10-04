# SDD ledger — plan: docs/superpowers/plans/2026-09-23-full-game-improvements.md

Execution authorized: user said implement it after written spec and plan presentation. Native execution.

Ruling: Work in current dirty checkout without worktree/commits — Git metadata is read-only and user requested implementation here — cost: review must distinguish baseline edits.
Ruling: Durable ledger lives with the plan; logs/screenshots remain in temporary storage — patch tool rejected an external ledger — cost: one additional documentation file.
Preflight: Tasks 1/2 and 7–12 share player.features/world.expansion and claim transactions.
Preflight: Tasks 3/4/5 share pause, input and viewport; resumeGame retains save-load semantics.
Preflight: Tasks 6/7 and 11/12 share combat callbacks; practice rewards excluded first, encounter identity gates credit.
Preflight: Tasks 9/10 preserve equipment UID/protection; loadout preflight is atomic.
Implementation checkpoint (2026-09-23; not release acceptance):

- Tasks 1–2: save normalization/status, daily/mastery claims, live rare spawns, dungeon entry/return/completion, zone difficulty and mastery effects implemented. Regression tests pass; browser board/dungeon acceptance pending.
- Tasks 3–5: nested simulation clock, audio suspend/resume, explicit interruption resume, nine pointer slots, touch preferences, adaptive viewport, offscreen target arrow and phone sheets implemented. Pure/runtime regressions pass; real DOM multi-touch and visual acceptance pending.
- Tasks 8–10: guidance models/pinning and field-guide UI, loot relevance/protection, two transactional loadouts implemented/in integration verification. Contextual guide links and all-class failure matrix still being expanded.
- Tasks 6–7 and 11–12: training/evidence, Woods event and expedition remain unimplemented.
- Task 13: incomplete. Headless Brave exits 134 before screenshot generation (temporary log `/private/tmp/aetheria-brave-0923.log`); no visual acceptance claimed.

Evidence: baseline npm test exit 0; persistence and expansion focused red-to-green tests; integrated expansion/mobile npm test exit 0. Loot/loadout focused tests pass, including protected storage round trip, failed transaction immutability, UID conservation, cooldown retention and no HP/MP grant. Final checkpoint `npm test` after equipment/guidance integration: exit 0 (`/private/tmp/aetheria-checkpoint-final.log`). `git diff --check`: exit 0. No visual or real-phone acceptance implied.

Temporary runtime journey `/private/tmp/aetheria-journey.jb16u0/journey.mjs`: exit 0. Imported the browser-mocking fixture and drove `window.__AWO` through gear protection, preset capture, recipe pinning, daily claim idempotence, a 60-second pause, save/reload, and applying the owned preset back in town. This is not the full planned journey: training/event/expedition paths do not exist yet.

Independent review found an animation-frame dt regression caused by resetting `last` on a no-op resume. Fixed; real `frame()` stamina-regeneration regression failed before the fix and passed afterward. Reviewer then stopped at service usage limit; review is incomplete, especially equipment transactions.

Ruling: while browser acceptance is unavailable, implement independent gear/guidance packages before combat-content packages; preserve explicit pending gates instead of treating Node mocks as browser acceptance.
