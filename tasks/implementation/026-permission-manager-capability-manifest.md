# Task 026 - Permission Manager Capability Manifest

## Objective
Implement manifest validation and deny-by-default capability checkers.

## Architecture References
- [docs/specifications/plugin-sdk.md](file:///home/turan/tinc-workbench/docs/specifications/plugin-sdk.md)#permissions

## Dependencies
003

## Files Allowed to Modify
- `src/plugins/security/`

## Files Forbidden to Modify
- `docs/specifications/*`
- `docs/architecture/*`
- `docs/audits/*`

## Required Implementation
Implement PermissionManager. Validate plugin manifest capability lists (verify only the 11 defined capabilities are requested). Deny by default.

## Required Tests
Assert invalid capability names fail manifest load. Verify undeclared capability checks fail.

## Acceptance Criteria
- [ ] Manifest fails validation on unknown capability names
- [ ] Undeclared capability requests are denied

## Validation Commands
npm run test -- src/plugins/security/

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
