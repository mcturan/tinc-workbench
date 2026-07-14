# Task 027 - Plugin Manager Sandbox Context

## Objective
Implement sandboxed proxy execution contexts and crash isolation.

## Architecture References
- [docs/specifications/plugin-sdk.md](file:///home/turan/tinc-workbench/docs/specifications/plugin-sdk.md)#facade

## Dependencies
026

## Files Allowed to Modify
- `src/plugins/manager/`

## Files Forbidden to Modify
- `docs/specifications/*`
- `docs/architecture/*`
- `docs/audits/*`

## Required Implementation
Implement PluginManager. Load plugins in isolated proxy sandbox contexts. Catch plugin exceptions at the SDK gateway.

## Required Tests
Verify throwing an exception inside plugin script does not crash the host workbench process.

## Acceptance Criteria
- [ ] Plugins execute inside proxy sandboxes
- [ ] Crash isolation catches all plugin runtime errors

## Validation Commands
npm run test -- src/plugins/manager/

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
