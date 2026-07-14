# Task 025 - PageState Adapter and Application Orchestration

## Objective
Implement Page-State Adapter to bridge Canvas runtime viewport state and Storage serialization.

## Architecture References
- [docs/architecture/system-architecture.md](file:///home/turan/tinc-workbench/docs/architecture/system-architecture.md)#layer-roles

## Dependencies
008, 018

## Files Allowed to Modify
- `src/ui/orchestrator/`

## Files Forbidden to Modify
- `docs/specifications/*`
- `docs/architecture/*`
- `docs/audits/*`

## Required Implementation
Implement PageStateAdapter. Retrieve active page layout configurations and viewport parameters from CanvasEngine and provide them to StorageEngine. Hydrate CanvasEngine on project load.

## Required Tests
Verify active viewport coordinates propagate to StorageEngine snapshot.

## Acceptance Criteria
- [ ] Storage Engine retrieves viewport settings via Page-State Adapter
- [ ] Viewport is hydrated correctly on loading

## Validation Commands
npm run test -- src/ui/orchestrator/

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
