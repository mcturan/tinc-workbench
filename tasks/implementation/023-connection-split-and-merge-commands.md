# Task 023 - Connection Split and Merge Commands

## Objective
Implement split segment and merge net command executors.

## Architecture References
- [docs/specifications/connection-wire-engine.md](file:///home/turan/tinc-workbench/docs/specifications/connection-wire-engine.md)#split-merge

## Dependencies
007, 022

## Files Allowed to Modify
- `src/connection-wire-engine/commands/`

## Files Forbidden to Modify
- `docs/specifications/*`
- `docs/architecture/*`
- `docs/audits/*`

## Required Implementation
Implement SplitNetCommand (inserting port splits Wire segment into two Wires referencing separate LogicalConnections with same netId) and MergeNetsCommand (updates subordinate LogicalConnection netId).

## Required Tests
Integration tests validating segment splits and net merges, verifying netId propagation on LogicalConnections.

## Acceptance Criteria
- [ ] Segment splits create separate LogicalConnections sharing netId
- [ ] Net merges update LogicalConnection netId properties

## Validation Commands
npm run test -- src/connection-wire-engine/commands/

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
