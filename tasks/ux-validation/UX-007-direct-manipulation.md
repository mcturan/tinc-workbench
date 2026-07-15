# UX-007: Direct Manipulation

## 1. Product Question Answered
Does moving objects on the canvas feel direct and fluid without having to switch active modes or tools?

## 2. User-Visible Outcome
The user can click and drag a component to move it immediately.

## 3. Exact Scope
- Select Tool dragging handler.
- Map drag offsets to world space position changes.
- Dispatch position update commands to the `CommandEngine`.

## 4. Explicit Non-Scope
- Alignment snapping to other objects (beyond grid snap).
- Multi-object dragging.

## 5. Frozen Architecture Constraints
- Gesture interpretations must reside inside the `ToolSystem`.
- Modifications must occur via `CommandEngine` dispatches.

## 6. Dependencies
- UX-005, UX-006

## 7. Expected Source Files
- `src/tool-system/select-tool.ts` (or the equivalent select tool implementation)

## 8. Expected Test Files
- `tests/select-tool.spec.ts`

## 9. Acceptance Criteria
- Dragging component updates its position smoothly in the ObjectEngine.
- Component stays under the pointer during drags.

## 10. Validation Commands
- `npm test tests/select-tool.spec.ts`

## 11. Stop Conditions
- Drag movements feel delayed, or the component drifts away from the mouse cursor.

## 12. SAFE INTERIM Declarations
- Dragging selected components directly in the default Select Tool without a separate Transform Tool class.

## 13. Production Roadmap Replacement Mapping
- PARTIAL IMPLEMENTATION OF TASK 020
