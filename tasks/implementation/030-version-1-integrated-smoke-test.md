# Task 030 - Version 1 Integrated Smoke Test

## Objective
Implement integrated end-to-end user smoke tests.

## Architecture References
- [docs/architecture/system-architecture.md](file:///home/turan/tinc-workbench/docs/architecture/system-architecture.md)#mutation-cascade

## Dependencies
010, 024, 025, 029

## Files Allowed to Modify
- `tests/integration/smoke/`

## Files Forbidden to Modify
- `docs/specifications/*`
- `docs/architecture/*`
- `docs/audits/*`

## Required Implementation
Write integrated smoke test verifying complete user flows: coordinate zoom/pan, click to draw connection segments, select component, delete port (floating endpoints, Wires flagged affected), save project to TWB/TWH, load project, and run mock plugin commands.

## Required Tests
End-to-end integration tests executing in Jest.

## Acceptance Criteria
- [ ] Integrated smoke tests execute in under 1 second
- [ ] All subsystems coordinate cleanly according to frozen architecture rules

## Validation Commands
npm run test -- tests/integration/smoke/

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
