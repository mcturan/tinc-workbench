# Task 019 - Input Router Normalization

## Objective
Implement DOM pointer event capture and normalization.

## Architecture References
- [docs/specifications/ui-framework.md](file:///home/turan/tinc-workbench/docs/specifications/ui-framework.md)#input-routing

## Dependencies
018

## Files Allowed to Modify
- `src/ui/`

## Files Forbidden to Modify
- `docs/specifications/*`
- `docs/architecture/*`
- `docs/audits/*`

## Required Implementation
Implement InputRouter. Bind DOM events, normalize pointer position to local canvas coordinates, and capture DOM mouse events.

## Required Tests
Mock browser pointer events and assert normalized output coordinates match zoom/pan settings.

## Acceptance Criteria
- [ ] Pointer coords are normalized correctly
- [ ] Keyboard events match hotkey registry

## Validation Commands
npm run test -- src/ui/

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
