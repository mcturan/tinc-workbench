# Task 028 - Plugin SDK Facade

## Objective
Implement public contract facades and event/command isolation.

## Architecture References
- [docs/specifications/plugin-sdk.md](file:///home/turan/tinc-workbench/docs/specifications/plugin-sdk.md)#facade

## Dependencies
027

## Files Allowed to Modify
- `src/plugins/sdk/`

## Files Forbidden to Modify
- `docs/specifications/*`
- `docs/architecture/*`
- `docs/audits/*`

## Required Implementation
Implement PluginSDK. Event subscription and command registrations must be isolated to plugin-specific namespaces. Prevents registering core-reserved namespaces.

## Required Tests
Assert plugin attempts to register core namespaces or subscribe without permissions fail.

## Acceptance Criteria
- [ ] Plugin SDK is a pure facade owning no state
- [ ] Command/event registrations are isolated to plugin-specific namespaces

## Validation Commands
npm run test -- src/plugins/sdk/

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
