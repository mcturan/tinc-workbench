# Task 002 - Shared Domain Types and Contracts

## Objective
Define stable TypeScript types for the domain model.

## Architecture References
- [docs/specifications/object-model.md](file:///home/turan/tinc-workbench/docs/specifications/object-model.md)#data-types

## Dependencies
001

## Files Allowed to Modify
- `src/types/`

## Files Forbidden to Modify
- `docs/specifications/*`
- `docs/architecture/*`
- `docs/audits/*`

## Required Implementation
Define interface contracts for: Project, Page, Layer, SemanticObject, Port, Pin, Endpoint union, LogicalConnection, Wire, and WireSegment. Wire must contain segments array and no netId or vertices.

## Required Tests
Write contract type assertion tests validating that mock objects match the generated types.

## Acceptance Criteria
- [ ] Types compile under strict mode
- [ ] Wire contains segments containing start/end coordinates
- [ ] Endpoint is discriminated union of PORT, PIN, and FLOATING

## Validation Commands
npx tsc --noEmit

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
