# UX-008: Port/Pin Targeting

## 1. Product Question Answered
Can users snap wire endpoints to tiny terminal ports/pins easily and with clear visual feedback?

## 2. User-Visible Outcome
Hovering near a port or pin highlights it, and starting a drag snaps the wire preview line to the center of the terminal.

## 3. Exact Scope
- Hover hit-testing for ports and pins with snap radius (e.g., 10 pixels).
- Highlight overlay rendering on hovered ports/pins.
- Snap output coordinate resolution.

## 4. Explicit Non-Scope
- Signal compatibility validation (e.g., preventing signal clashes) during snap (deferred to netlist checks).

## 5. Frozen Architecture Constraints
- Coordinate snaps must query coordinates via `GeometryEngine` and viewport calculations.

## 6. Dependencies
- UX-001, UX-005

## 7. Expected Source Files
- `src/tool-system/targeting-helper.ts` (or the targeting logic in tools)

## 8. Expected Test Files
- `tests/targeting-helper.spec.ts`

## 9. Acceptance Criteria
- Hovering within the snap threshold highlights the port.
- Snap resolution snaps target coordinates precisely to the terminal center.

## 10. Validation Commands
- `npm test tests/targeting-helper.spec.ts`

## 11. Stop Conditions
- Snapping is visually ambiguous or requires pixel-perfect accuracy.

## 12. SAFE INTERIM Declarations
- Snap lookup queries all components linearly (O(N)) instead of querying a spatial index.

## 13. Production Roadmap Replacement Mapping
- PARTIAL IMPLEMENTATION OF TASK 021
