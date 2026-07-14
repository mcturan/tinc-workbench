# Task 004 - Object Engine Registry

## Objective
Implement the core runtime object registry and CRUD methods.

## Architecture References
- [docs/specifications/object-engine.md](file:///home/turan/tinc-workbench/docs/specifications/object-engine.md)#runtime-registry

## Dependencies
003

## Files Allowed to Modify
- `src/object-engine/`

## Files Forbidden to Modify
- `docs/specifications/*`
- `docs/architecture/*`
- `docs/audits/*`

## Required Implementation
Implement ObjectEngine containing Project in-memory state. CRUD for Pages, Layers, Components, Ports, Pins, LogicalConnections, and Wires. Ignore history/undo/redo.

## Required Tests
Unit tests creating, updating, and deleting objects in registry, asserting parent-child hierarchy containment.

## Acceptance Criteria
- [ ] CRUD operations modify state correctly
- [ ] Port/Pin structures belong to parent Component
- [ ] Object Engine is ignorant of History Engine

## Validation Commands
npm run test -- src/object-engine/

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
