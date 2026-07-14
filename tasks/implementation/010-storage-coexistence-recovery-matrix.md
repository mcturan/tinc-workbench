# Task 010 - Storage Coexistence Recovery Matrix

## Objective
Implement error recovery rules for mismatched or corrupt TWH/TWB files.

## Architecture References
- [docs/specifications/storage-engine.md](file:///home/turan/tinc-workbench/docs/specifications/storage-engine.md)#coexistence-failure

## Dependencies
008, 009

## Files Allowed to Modify
- `src/storage-engine/`

## Files Forbidden to Modify
- `docs/specifications/*`
- `docs/architecture/*`
- `docs/audits/*`

## Required Implementation
Implement the coexistence recovery matrix: corrupt TWH, missing TWH, or revision mismatch must load TWB normally, warning, and initializing a fresh history DAG.

## Required Tests
Provide corrupt TWH file and assert TWB loads successfully.

## Acceptance Criteria
- [ ] Mismatched or corrupt TWH does not prevent project loading
- [ ] Fresh history timeline initializes on TWH failure

## Validation Commands
npm run test -- src/storage-engine/

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
