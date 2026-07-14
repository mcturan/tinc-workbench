# Task 016 - Rendering Engine Tree

## Objective
Implement WebGL render tree and component vertex buffers.

## Architecture References
- [docs/specifications/rendering-engine.md](file:///home/turan/tinc-workbench/docs/specifications/rendering-engine.md)#render-tree

## Dependencies
013

## Files Allowed to Modify
- `src/rendering-engine/`

## Files Forbidden to Modify
- `docs/specifications/*`
- `docs/architecture/*`
- `docs/audits/*`

## Required Implementation
Implement RenderEngine render tree. Rebuild WebGL buffers on committed events. Expose read-only canvas draws.

## Required Tests
Mock WebGL context and verify render tree buffer allocation.

## Acceptance Criteria
- [ ] WebGL buffers allocate and update correctly
- [ ] Rendering Engine does not mutate state

## Validation Commands
npm run test -- src/rendering-engine/

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
