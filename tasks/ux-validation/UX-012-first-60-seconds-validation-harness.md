# UX-012: First 60 Seconds Validation Harness

## 1. Product Question Answered
Does TINC Workbench achieve the target user performance: placing, wiring, and moving 4 objects in under 60 seconds?

## 2. User-Visible Outcome
An interactive validation harness that lets users construct the target scenario, tracking timed metrics.

## 3. Exact Scope
- Test harness page embedding the canvas viewport and UI palette.
- Timed sequence logger tracking:
  - Time to first placement (target <= 5s).
  - Time to 4 placements (target <= 15s).
  - Time to first wiring connection (target <= 25s).
  - Time to 4 connections (target <= 50s).
  - Component move gesture (target <= 55s).
  - Duration and gesture counts.
- Displays a final performance report.

## 4. Explicit Non-Scope
- Automated user simulation (only measures actions of real human runs).

## 5. Frozen Architecture Constraints
- The harness must reside in the application layer and not modify core modules.

## 6. Dependencies
- UX-004, UX-011

## 7. Expected Source Files
- `src/ui/validation-harness.ts` (or HTML harness frontend)

## 8. Expected Test Files
- `tests/validation-harness.spec.ts`

## 9. Acceptance Criteria
- Harness starts timer on first action, records clicks/drags, and outputs metrics.
- All structural constraints are checked in real-time.
- Status is UNVALIDATED until signed off by a human timed run.

## 10. Validation Commands
- `npm run start:harness`

## 11. Stop Conditions
- Harness fails to log actions or interferes with interaction times.

## 12. SAFE INTERIM Declarations
- None (UI harness for tracking).

## 13. Production Roadmap Replacement Mapping
- NEW UX VALIDATION BEHAVIOR
