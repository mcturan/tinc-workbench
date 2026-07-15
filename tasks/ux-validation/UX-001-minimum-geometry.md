# UX-001: Minimum Geometry

## 1. Product Question Answered
Does TINC possess the core coordinate math to reliably select components and snap endpoints on the canvas?

## 2. User-Visible Outcome
The user can hit-test visual elements and snap wire endpoints to port/pin centers.

## 3. Exact Scope
- Mathematical implementation of Vector2D, Rect, AABB.
- Basic Point-in-Rectangle hit testing.
- Calculation of local-to-world coordinate mapping for component ports and pins.
- Point-on-line distance calculation for wire hit checking.

## 4. Explicit Non-Scope
- Spatial Quadtree indexing.
- Bounding box collision caching.
- Matrix projection calculations for rotated or scaled viewports (beyond translation/zoom).

## 5. Frozen Architecture Constraints
- Must reside solely in `src/geometry-engine/`.
- No dependencies on `RenderingEngine` or UI framework.

## 6. Dependencies
- None.

## 7. Expected Source Files
- `src/geometry-engine/index.ts`

## 8. Expected Test Files
- `tests/geometry-engine.spec.ts`

## 9. Acceptance Criteria
- Vectors and rectangles can be correctly instantiated and transformed.
- Port coordinates translate to world space correctly based on component origin.
- All geometry unit tests pass.

## 10. Validation Commands
- `npm test tests/geometry-engine.spec.ts`

## 11. Stop Conditions
- Point-in-rectangle or point-on-line math returns incorrect values, causing selection to fail.

## 12. SAFE INTERIM Declarations
- Linear O(N) object candidate list query replaces the Quadtree index.

## 13. Production Roadmap Replacement Mapping
- PARTIAL IMPLEMENTATION OF TASK 011
