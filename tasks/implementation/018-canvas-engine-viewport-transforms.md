# Task 018 - Canvas Engine Viewport Transforms

## Objective
Implement coordinate zoom, pan, and transform services.

## Architecture References
- [docs/specifications/canvas-engine.md](file:///home/turan/tinc-workbench/docs/specifications/canvas-engine.md)#viewport-state

## Dependencies
017

## Files Allowed to Modify
- `src/canvas-engine/`

## Files Forbidden to Modify
- `docs/specifications/*`
- `docs/architecture/*`
- `docs/audits/*`

## Required Implementation
Implement CanvasEngine. Viewport zoom (0.1x to 10x), pan offset, screen-to-world and world-to-screen coordinate converters.

## Required Tests
Verify screen-to-world translation under zoom and pan offsets.

## Acceptance Criteria
- [ ] Viewport coordinates scale correctly
- [ ] Canvas does not draw selection boxes

## Validation Commands
npm run test -- src/canvas-engine/

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
