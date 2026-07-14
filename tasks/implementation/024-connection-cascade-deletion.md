# Task 024 - Connection Cascade Deletion

## Objective
Implement Port/Pin deletion cascade rules.

## Architecture References
- [docs/specifications/connection-wire-engine.md](file:///home/turan/tinc-workbench/docs/specifications/connection-wire-engine.md)#cascade-boundaries

## Dependencies
023

## Files Allowed to Modify
- `src/connection-wire-engine/commands/`

## Files Forbidden to Modify
- `docs/specifications/*`
- `docs/architecture/*`
- `docs/audits/*`

## Required Implementation
Deleting Port/Pin triggers Command Engine to convert associated LogicalConnection Endpoints to FLOATING (dangling) and flag referencing Wires as affected. Wires are not deleted unless physical layout path is explicitly removed.

## Required Tests
Verify deleting Port converts endpoint to FLOATING and Wires are flagged as affected on the canvas.

## Acceptance Criteria
- [ ] Deleting Port converts Endpoint to FLOATING
- [ ] Referencing Wires are flagged as affected and not silently deleted

## Validation Commands
npm run test -- src/connection-wire-engine/commands/

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
