# Task 007 - Command Transaction Rollback

## Objective
Implement rollback logic on command validation or history failures.

## Architecture References
- [docs/specifications/command-engine.md](file:///home/turan/tinc-workbench/docs/specifications/command-engine.md)#transaction-rollback

## Dependencies
006

## Files Allowed to Modify
- `src/command-engine/`

## Files Forbidden to Modify
- `docs/specifications/*`
- `docs/architecture/*`
- `docs/audits/*`

## Required Implementation
In CommandEngine transaction execution, if post-mutation steps (e.g. History append) fail, restore pre-mutation checkpoint state in ObjectEngine.

## Required Tests
Trigger history write failure and verify ObjectEngine state rolls back and no Event Bus event is published.

## Acceptance Criteria
- [ ] System state rolls back to pre-mutation baseline on failure
- [ ] Aborted transactions publish no committed events

## Validation Commands
npm run test -- src/command-engine/

## Stop Conditions
The coding agent must stop if:
- a frozen architecture contradiction is discovered
- a dependency task is incomplete
- a required contract is missing
- implementation requires ownership reassignment
- a forbidden file must be modified

## Git Rules
- do not commit
- do not push
