# Task 014 - Selection Engine State Model

## Objective
Implement Selection Engine active set, primary reference, and cycling state.

## Architecture References
- [docs/specifications/selection-engine.md](file:///home/turan/tinc-workbench/docs/specifications/selection-engine.md)#state-model

## Dependencies
013

## Files Allowed to Modify
- `src/selection-engine/`

## Files Forbidden to Modify
- `docs/specifications/*`
- `docs/architecture/*`
- `docs/audits/*`

## Required Implementation
Implement SelectionEngine. Selection properties: selectedIds, primaryId, selection cycling metadata, group drill-down breadcrumb context.

## Required Tests
Unit tests for toggling selections and verifying candidate list cycling.

## Acceptance Criteria
- [ ] Selections toggle and order correctly
- [ ] Selection Engine does not discover candidates spatially

## Validation Commands
npm run test -- src/selection-engine/

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
