# Conductor Workflow

## TDD Strictness
TDD is enabled. Follow Red-Green-Refactor cycles where practical. Write tests before minimal code implementations.

## Commit Strategy
Use standard conventional commits (e.g. `feat:`, `fix:`, `chore:`). Ensure each commit references the active Track ID. 

## Verification Checkpoints
After each phase of an implementation track completes, run `npm test` and wait for explicit user approval before proceeding to the next phase.
