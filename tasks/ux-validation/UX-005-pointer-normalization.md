# UX-005: Pointer Normalization

## 1. Product Question Answered
Can TINC insulate the editing tools from browser-specific mouse/touch coordinate anomalies?

## 2. User-Visible Outcome
Precise canvas operations (clicking ports, dragging components) work identically regardless of screen scaling or browser window layouts.

## 3. Exact Scope
- Intercept raw DOM mouse/pointer events in the UI boundary.
- Normalize client coordinates to canvas-relative Viewport Space.
- Dispatch normalized events to the Tool System.

## 4. Explicit Non-Scope
- Complex multitouch or trackpad gesture recognition.

## 5. Frozen Architecture Constraints
- Bounded inside `src/input-router/` (or UI Framework Input Router).
- Never allow tools or canvas to listen to DOM events directly.

## 6. Dependencies
- UX-003

## 7. Expected Source Files
- `src/input-router/index.ts`

## 8. Expected Test Files
- `tests/input-router.spec.ts`

## 9. Acceptance Criteria
- Pointer events correctly translate screen locations into world space coordinate values.

## 10. Validation Commands
- `npm test tests/input-router.spec.ts`

## 11. Stop Conditions
- Coordinate conversions introduce precision drift during pan/zoom changes.

## 12. SAFE INTERIM Declarations
- Only normalizes mouse pointer inputs; touch and pen events are deferred.

## 13. Production Roadmap Replacement Mapping
- PARTIAL IMPLEMENTATION OF TASK 019
