# Task 021 - Tool System Coordinate Query

## Objective
Coordinate spatial candidate selection and hit-testing queries from Tool System.

## Architecture References
- [docs/specifications/tool-system.md](file:///home/turan/tinc-workbench/docs/specifications/tool-system.md)#spatial-queries

## Dependencies
020

## Files Allowed to Modify
- `src/tool-system/`

## Files Forbidden to Modify
- `docs/specifications/*`
- `docs/architecture/*`
- `docs/audits/*`

## Required Implementation
Tool System coordinates spatial queries. Queries Geometry Engine's Quadtree for overlap candidates and hit-test APIs, then updates Selection Engine with the resolved selection targets.

## Required Tests
Verify marquee selection gesture coordinates query Quadtree and modify Selection Engine state.

## Acceptance Criteria
- [ ] Tool System coordinates spatial and hit-test queries
- [ ] Selection Engine receives resolved candidate IDs

## Validation Commands
npm run test -- src/tool-system/

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
