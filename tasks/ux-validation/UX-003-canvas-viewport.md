# UX-003: Canvas Viewport

## 1. Product Question Answered
Can TINC provide a smooth, responsive infinite navigation space (zoom and pan) matching vector tools?

## 2. User-Visible Outcome
The user can pan (middle click/drag or spacebar drag) and zoom (mouse wheel) smoothly.

## 3. Exact Scope
- Viewport state tracking (centerX, centerY, zoom level).
- Computation of viewport transformation matrices (World Space to Screen Space).
- Pan and zoom public APIs.

## 4. Explicit Non-Scope
- Viewport rotation.
- Synchronized multi-viewport setups.

## 5. Frozen Architecture Constraints
- Views and coordinates are managed inside `src/canvas-engine/`.

## 6. Dependencies
- UX-002

## 7. Expected Source Files
- `src/canvas-engine/index.ts`

## 8. Expected Test Files
- `tests/canvas-engine.spec.ts`

## 9. Acceptance Criteria
- Panning and zooming shifts coordinate conversions correctly.
- Infinite grid scales and pans smoothly.

## 10. Validation Commands
- `npm test tests/canvas-engine.spec.ts`

## 11. Stop Conditions
- Zoom or pan lags, or viewport matrices introduce coordinate drifting.

## 12. SAFE INTERIM Declarations
- None (core viewport tracking math).

## 13. Production Roadmap Replacement Mapping
- PARTIAL IMPLEMENTATION OF TASK 018
