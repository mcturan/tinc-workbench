# Task 008 - Storage Engine TWB Serialization

## Objective
Implement JSON schema validation and atomic disk writes for TWB files.

## Architecture References
- [docs/specifications/storage-engine.md](file:///home/turan/tinc-workbench/docs/specifications/storage-engine.md)#serialization

## Dependencies
006

## Files Allowed to Modify
- `src/storage-engine/`

## Files Forbidden to Modify
- `docs/specifications/*`
- `docs/architecture/*`
- `docs/audits/*`

## Required Implementation
Implement StorageEngine. Serialize ObjectEngine state to TWB JSON format. Write files atomically using temp file writing then rename. Validate against JSON schema.

## Required Tests
Round-trip save/load tests. Verify corrupt TWB files fail validation.

## Acceptance Criteria
- [ ] TWB serializes to single UTF-8 JSON project document
- [ ] Atomic file write handles disk space constraints gracefully

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
