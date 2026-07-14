# Task 020 - Tool System Arbitration

## Objective
Implement active tool stack and lifecycle hooks.

## Architecture References
- [docs/specifications/tool-system.md](file:///home/turan/tinc-workbench/docs/specifications/tool-system.md)#active-tool

## Dependencies
019

## Files Allowed to Modify
- `src/tool-system/`

## Files Forbidden to Modify
- `docs/specifications/*`
- `docs/architecture/*`
- `docs/audits/*`

## Required Implementation
Implement ToolSystem. Maintain tool stack, coordinate tool activation/deactivation hooks, and handle cancellation gestures (Escape).

## Required Tests
Verify tools transition through Idle, Dragging, Committed, and Cancelled states.

## Acceptance Criteria
- [ ] Active tool stack tracks focus correctly
- [ ] Tool cancellation restores previous active tool

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
