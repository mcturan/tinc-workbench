# Task 012 - Geometry Spatial Index (Quadtree)

## Objective
Implement the Quadtree spatial index for object bounds indexing.

## Architecture References
- [docs/specifications/geometry-engine.md](file:///home/turan/tinc-workbench/docs/specifications/geometry-engine.md)#spatial-index

## Dependencies
011

## Files Allowed to Modify
- `src/geometry-engine/spatial/`

## Files Forbidden to Modify
- `docs/specifications/*`
- `docs/architecture/*`
- `docs/audits/*`

## Required Implementation
Implement Quadtree index. Query method returning overlapping candidate IDs within marquee box bounds.

## Required Tests
Insert bounding boxes and query spatial overlap at points and rectangular windows.

## Acceptance Criteria
- [ ] Quadtree indexes objects correctly
- [ ] Range queries yield correct candidates

## Validation Commands
npm run test -- src/geometry-engine/spatial/

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
