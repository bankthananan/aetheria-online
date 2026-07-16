# Aetheria Online Agent Guide

## Repository routing

- The live game is `index.html` plus `js/*.js`. It is a zero-build plain ES-module application and is the default target for current work.
- `index.legacy.html` plus `src/*.js` is a preserved Vite-era app. Touch it only when the request explicitly targets the legacy app.
- Keep balance values in `js/design.js`. The other `js/` data modules are the game's deliberate database; do not migrate them to JSON or another database.
- Preserve compatibility identifiers such as `awo_save_v1` and `window.__AWO` unless the user explicitly requests a migration.

## Lean subagent policy

- Keep obvious tasks that affect at most two known files on the main agent. Delegation has a context and token cost.
- Spawn `scout` only when the target surface is unclear or a task crosses at least three systems.
- Spawn `planner` only for ambiguous architecture, migrations, difficult debugging, or cross-system work that needs deep reasoning before edits.
- Spawn `implementer` for a bounded multi-file change after ownership is known. Never run two writers on overlapping files, especially `js/game.js`.
- Spawn `verifier` only for an independent acceptance check after meaningful runtime, logic, or visual changes. The main agent should run cheap deterministic tests itself for routine work.
- Spawn `reviewer` only for high-risk or release-critical changes involving save state, combat, progression, security, or broad engine behavior.
- Prefer zero to two helpers per task. Parallelize only independent read-heavy work or disjoint file ownership. Never build challenger/auditor/sentinel chains.
- Give each subagent a narrow goal, exact scope, constraints, and completion check. Ask for distilled handoffs instead of transcripts or raw logs.

## Verification

- Run `npm test` for code or data changes and judge success by exit code.
- For active-game logic changes, also use a temporary `.mjs` Node harness that mocks browser globals, imports `js/game.js`, and drives `window.__AWO` with assertions.
- For active-game visual or runtime changes, serve the repo locally and capture the relevant `autotest.html` state in headless Brave. Inspect the resulting image and runtime-error banner.
- Keep generated harnesses, screenshots, and one-off diagnostic artifacts outside the repository.
- Known flakes: park monsters before movement/facing assertions; force kill-type guild bounties before kill loops; use tolerances for floating-point results.
