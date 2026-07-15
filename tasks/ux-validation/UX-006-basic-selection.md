# UX-006: Basic Selection

## 1. Product Question Answered
Can TINC manage object selections with zero delay or target ambiguity?

## 2. User-Visible Outcome
Clicking a component selects it, displaying a selection overlay; clicking empty space deselects it.

## 3. Exact Scope
- Selection state model (tracking selected object IDs).
- Hit test query via Geometry Engine.
- Highlight overlays rendering coordination.

## 4. Explicit Non-Scope
- Marquee drag multi-selection.
- Selection bounds caching.

## 5. Frozen Architecture Constraints
- Must occupy `src/selection-engine/`.

## 6. Dependencies
- UX-001

## 7. Expected Source Files
- `src/selection-engine/index.ts`

## 8. Expected Test Files
- `tests/selection-engine.spec.ts`

## 9. Acceptance Criteria
- Single select and deselect operations work cleanly.
- Current selection state updates in-memory.

## 10. Validation Commands
- `npm test tests/selection-engine.spec.ts`

## 11. Stop Conditions
- Selection overlays lag behind object positions.

## 12. SAFE INTERIM Declarations
- Array-backed single ID selection tracking instead of multi-select bounds tree.

## 13. Production Roadmap Replacement Mapping
- PARTIAL IMPLEMENTATION OF TASK 014
