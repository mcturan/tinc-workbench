# Task 017 - Rendering Selection Overlays

## Objective
Implement drawing overlays for selection outlines, boxes, and transform handles.

## Architecture References
- [docs/specifications/rendering-engine.md](file:///home/turan/tinc-workbench/docs/specifications/rendering-engine.md)#selection-visuals

## Dependencies
015, 016

## Files Allowed to Modify
- `src/rendering-engine/`

## Files Forbidden to Modify
- `docs/specifications/*`
- `docs/architecture/*`
- `docs/audits/*`

## Required Implementation
Rendering Engine reads selection projections from Selection Engine and draws selection outline, box, and 8 scale handles on canvas. Canvas Engine is forbidden from drawing overlays.

## Required Tests
Assert WebGL draw calls target selection box overlays when selection is active.

## Acceptance Criteria
- [ ] Selection overlays are drawn by Rendering Engine
- [ ] Handle projections match selection bounds

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
