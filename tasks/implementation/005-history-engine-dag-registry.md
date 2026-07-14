# Task 005 - History Engine DAG Registry

## Objective
Implement history node logging and cursor tracking.

## Architecture References
- [docs/specifications/history-engine.md](file:///home/turan/tinc-workbench/docs/specifications/history-engine.md)#history-dag

## Dependencies
004

## Files Allowed to Modify
- `src/history-engine/`

## Files Forbidden to Modify
- `docs/specifications/*`
- `docs/architecture/*`
- `docs/audits/*`

## Required Implementation
Implement HistoryEngine. Maintain history DAG, cursor pointer, and snapshot checkpoints.

## Required Tests
Test history DAG node insertion, branching, and cursor positioning.

## Acceptance Criteria
- [ ] History nodes are tracked correctly
- [ ] Snapshots can be retrieved by cursor index
- [ ] History Engine never mutates Object Engine directly

## Validation Commands
npm run test -- src/history-engine/

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
