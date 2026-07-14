# Task 006 - Command Engine Orchestration

## Objective
Implement command dispatch pipeline and validation decorators.

## Architecture References
- [docs/specifications/command-engine.md](file:///home/turan/tinc-workbench/docs/specifications/command-engine.md)#command-execution

## Dependencies
005

## Files Allowed to Modify
- `src/command-engine/`

## Files Forbidden to Modify
- `docs/specifications/*`
- `docs/architecture/*`
- `docs/audits/*`

## Required Implementation
Implement CommandEngine. Command executor pipeline: validate, execute mutation in ObjectEngine, record history node in HistoryEngine, and publish committed event.

## Required Tests
Integration test validating the end-to-end execution flow of a CreateObject command.

## Acceptance Criteria
- [ ] Command validates before execution
- [ ] Successful execution records history node and publishes committed event

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
