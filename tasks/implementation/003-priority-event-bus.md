# Task 003 - Priority Event Bus

## Objective
Implement an in-memory Event Bus supporting priority-based subscriber dispatch.

## Architecture References
- [docs/specifications/event-bus.md](file:///home/turan/tinc-workbench/docs/specifications/event-bus.md)#event-dispatch

## Dependencies
002

## Files Allowed to Modify
- `src/event-bus/`

## Files Forbidden to Modify
- `docs/specifications/*`
- `docs/architecture/*`
- `docs/audits/*`

## Required Implementation
Implement EventBus class. Subscriptions must accept a priority integer from 0 to 100. Higher values delivered first. Event namespace validation.

## Required Tests
Unit tests publishing events to subscribers registered with varying priorities. Verify delivery order.

## Acceptance Criteria
- [ ] EventBus publishes events in priority order
- [ ] Subscriber errors are caught and do not halt publication
- [ ] Namespace isolation checks work

## Validation Commands
npm run test -- src/event-bus/

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
