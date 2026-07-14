# Task 022 - Connection Pathfinder A*

## Objective
Implement orthogonal A* pathfinding for Wire segments routing.

## Architecture References
- [docs/specifications/connection-wire-engine.md](file:///home/turan/tinc-workbench/docs/specifications/connection-wire-engine.md)#routing-algorithm

## Dependencies
021

## Files Allowed to Modify
- `src/connection-wire-engine/routing/`

## Files Forbidden to Modify
- `docs/specifications/*`
- `docs/architecture/*`
- `docs/audits/*`

## Required Implementation
Implement A* pathfinder. Compute orthogonal path segments between ports avoiding obstacle bounding boxes. Run pathfinding on Web Workers.

## Required Tests
Verify calculated path segments bypass obstacle bounding boxes.

## Acceptance Criteria
- [ ] Path segments avoid obstacle boundaries
- [ ] Paths are converted to segment objects in committed Wire

## Validation Commands
npm run test -- src/connection-wire-engine/routing/

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
