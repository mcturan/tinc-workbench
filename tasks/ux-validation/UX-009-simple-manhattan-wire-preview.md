# UX-009: Simple Manhattan Wire Preview

## 1. Product Question Answered
Can TINC generate clean orthogonal wire previews during routing without lag or layout confusion?

## 2. User-Visible Outcome
When dragging to create a wire, the user sees a preview line with 90-degree bends connecting the source and mouse pointer.

## 3. Exact Scope
- Wire tool active state gesture.
- Apply Manhattan orthogonal routing rules:
  - Source -> horizontal segment to target X.
  - Target X -> vertical segment to target Y.
  - If sharing X or Y, render a single straight segment.
- Draw transient path preview on the canvas rendering loop.

## 4. Explicit Non-Scope
- Obstacle avoidance.
- A* algorithm pathfinding.
- Manual wire vertex adjustments.

## 5. Frozen Architecture Constraints
- Preview path geometries must remain transient and not modify canonical engine state.

## 6. Dependencies
- UX-001, UX-008

## 7. Expected Source Files
- `src/tool-system/wire-tool.ts` (or wire tool routing logic)

## 8. Expected Test Files
- `tests/wire-tool.spec.ts`

## 9. Acceptance Criteria
- Wire previews route orthogonally based on the documented X-then-Y rule.
- Preview path updates instantly with pointer movements.

## 10. Validation Commands
- `npm test tests/wire-tool.spec.ts`

## 11. Stop Conditions
- Preview drawing fails to route orthogonally, or drags feel sluggish.

## 12. SAFE INTERIM Declarations
- Simple Manhattan routing (X-then-Y) replaces full A* pathfinding.

## 13. Production Roadmap Replacement Mapping
- SAFE INTERIM BEFORE TASK 022
