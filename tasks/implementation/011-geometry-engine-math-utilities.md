# Task 011 - Geometry Engine Math Utilities

## Objective
Implement stateless mathematical helpers for bounds and overlap calculations.

## Architecture References
- [docs/specifications/geometry-engine.md](file:///home/turan/tinc-workbench/docs/specifications/geometry-engine.md)#math-utilities

## Dependencies
004

## Files Allowed to Modify
- `src/geometry-engine/math/`

## Files Forbidden to Modify
- `docs/specifications/*`
- `docs/architecture/*`
- `docs/audits/*`

## Required Implementation
Implement stateless geometric algorithms: line segment distance, polygon intersections, AABB calculations. No cache tracking.

## Required Tests
Math verification unit tests for bounding boxes and segment distance calculations.

## Acceptance Criteria
- [ ] Math utilities are purely stateless
- [ ] Segment intersection checks are correct

## Validation Commands
npm run test -- src/geometry-engine/math/

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
