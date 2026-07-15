# UX-010: Logical Connection Commit

## 1. Product Question Answered
Does TINC correctly persist visual wires and logical connections through the canonical mutation path?

## 2. User-Visible Outcome
Releasing the pointer on a valid target port/pin commits the connection, adding a wire to the page.

## 3. Exact Scope
- Verify connection endpoints match target ports/pins.
- Dispatch `CreateConnection` command containing:
  - `LogicalConnection` with source and target `Endpoints`.
  - `Wire` mapping segments to the target `logicalConnectionId`.
- Commit changes via Command Engine.

## 4. Explicit Non-Scope
- Connection splits, merges, or TWB file serialization writes.

## 5. Frozen Architecture Constraints
- Wires and connections must be created using the already implemented canonical mutation pipeline:
  `Tool System intent -> Command Engine -> Object Engine -> History Engine -> committed Event Bus publication`.

## 6. Dependencies
- UX-009

## 7. Expected Source Files
- `src/command-engine/index.ts` (default handlers verify connections)

## 8. Expected Test Files
- `tests/command-engine.spec.ts`

## 9. Acceptance Criteria
- Committing a connection registers the `LogicalConnection` and `Wire` in the ObjectEngine.
- Events are published on connection creation.

## 10. Validation Commands
- `npm test tests/command-engine.spec.ts`

## 11. Stop Conditions
- Connections are created bypassing the `CommandEngine` or without registering `LogicalConnection` endpoints.

## 12. SAFE INTERIM Declarations
- None (uses canonical database schemas).

## 13. Production Roadmap Replacement Mapping
- NEW UX VALIDATION BEHAVIOR
