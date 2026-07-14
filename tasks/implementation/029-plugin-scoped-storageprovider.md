# Task 029 - Plugin Scoped StorageProvider

## Objective
Implement sandboxed StorageProvider with traversal checks and quota limits.

## Architecture References
- [docs/specifications/plugin-sdk.md](file:///home/turan/tinc-workbench/docs/specifications/plugin-sdk.md)#storage

## Dependencies
008, 028

## Files Allowed to Modify
- `src/plugins/storage/`

## Files Forbidden to Modify
- `docs/specifications/*`
- `docs/architecture/*`
- `docs/audits/*`

## Required Implementation
Implement StorageProvider inside SDK. Sandbox directory scope: /plugins/sandbox/[plugin-id]/. Reject path traversal containing ../. Delegate writes to Storage Engine. Enforce 10MB quota.

## Required Tests
Verify path traversal is rejected. Verify quota limit restricts file writes.

## Acceptance Criteria
- [ ] Path traversal ../ is blocked
- [ ] Storage quota blocks writes exceeding 10MB
- [ ] Storage Engine enforces physical writes

## Validation Commands
npm run test -- src/plugins/storage/

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
