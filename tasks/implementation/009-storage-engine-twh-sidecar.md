# Task 009 - Storage Engine TWH Sidecar

## Objective
Implement TWH sidecar history serialization.

## Architecture References
- [docs/specifications/storage-engine.md](file:///home/turan/tinc-workbench/docs/specifications/storage-engine.md)#history-sidecar

## Dependencies
008

## Files Allowed to Modify
- `src/storage-engine/`

## Files Forbidden to Modify
- `docs/specifications/*`
- `docs/architecture/*`
- `docs/audits/*`

## Required Implementation
Serialize/deserialize HistoryEngine DAG, cursor, and snapshots to separate .twh sidecar file. TWH is supplementary and optional.

## Required Tests
Test loading project where TWH is present and correctly parsed.

## Acceptance Criteria
- [ ] TWH is written separately after TWB success
- [ ] Storage Engine alone owns TWH serialization

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
