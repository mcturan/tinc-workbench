# UX-011: Move With Connection Preservation

## 1. Product Question Answered
Can TINC keep wire endpoints aligned with components during drag movement without manual reconnection?

## 2. User-Visible Outcome
When a user drags a connected component, the wires connected to it automatically stretch and re-route orthogonally.

## 3. Exact Scope
- Listen to component position changes in ObjectEngine.
- Locate all referencing `LogicalConnection` endpoints.
- Re-query port/pin world coordinates.
- Recompute and update the associated `Wire` segment arrays.

## 4. Explicit Non-Scope
- Wire segment cascade deletions or connection split/merges.

## 5. Frozen Architecture Constraints
- Endpoint identity must remain unchanged during component move.
- Must not bypass defined coordinate systems.

## 6. Dependencies
- UX-007, UX-010

## 7. Expected Source Files
- `src/object-engine/index.ts` (or connection preservation handlers)

## 8. Expected Test Files
- `tests/object-engine.spec.ts`

## 9. Acceptance Criteria
- Component movement triggers automatic recomputation of wire segments.
- Endpoints remain attached to ports/pins.

## 10. Validation Commands
- `npm test tests/object-engine.spec.ts`

## 11. Stop Conditions
- Moving components detaches endpoints or leaves wires floating.

## 12. SAFE INTERIM Declarations
- Recomputation uses Simple Manhattan routing instead of obstacle-avoiding A*.

## 13. Production Roadmap Replacement Mapping
- NEW UX VALIDATION BEHAVIOR
