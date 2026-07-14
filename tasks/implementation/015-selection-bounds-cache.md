# Task 015 - Selection Bounds Cache

## Objective
Implement selection bounds calculation via Geometry Engine union.

## Architecture References
- [docs/specifications/selection-engine.md](file:///home/turan/tinc-workbench/docs/specifications/selection-engine.md)#selection-bounds

## Dependencies
014

## Files Allowed to Modify
- `src/selection-engine/`

## Files Forbidden to Modify
- `docs/specifications/*`
- `docs/architecture/*`
- `docs/audits/*`

## Required Implementation
Calculate selection bounds by querying Object Engine for bounds and passing bounding boxes to Geometry Engine box-union API.

## Required Tests
Verify selection bounds update when selection set is modified.

## Acceptance Criteria
- [ ] Selection bounds cache is selection-specific derived state
- [ ] Cache invalidates when selected objects move

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
