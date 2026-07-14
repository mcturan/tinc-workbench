# Task 013 - Geometry Cache Invalidation

## Objective
Implement derived transform, bounds, and hit-test caches and invalidation cascade.

## Architecture References
- [docs/specifications/geometry-engine.md](file:///home/turan/tinc-workbench/docs/specifications/geometry-engine.md)#cache-registry

## Dependencies
003, 012

## Files Allowed to Modify
- `src/geometry-engine/cache/`

## Files Forbidden to Modify
- `docs/specifications/*`
- `docs/architecture/*`
- `docs/audits/*`

## Required Implementation
Implement transform matrices and bounds caches. Invalidate caches reactively by subscribing to Event Bus committed events.

## Required Tests
Publish a committed event and verify that cache values are invalidated.

## Acceptance Criteria
- [ ] Caches invalidate reactively on Event Bus events
- [ ] Recalculation is done lazily on reader query

## Validation Commands
npm run test -- src/geometry-engine/cache/

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
