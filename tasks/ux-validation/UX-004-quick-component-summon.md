# UX-004: Quick Component Summon

## 1. Product Question Answered
Can TINC bypass traditional category-browsing sidebars to let users place components in under 5 seconds?

## 2. User-Visible Outcome
The user hits a hotkey (e.g., `/`), types the component name (e.g., `ESP32`), presses enter, and places it immediately with a mouse click.

## 3. Exact Scope
- Application command palette / keystroke listener.
- Match query against component catalog database (ESP32, Relay Module, Lamp, 12V PSU).
- Generate a placement preview under the mouse cursor.
- Click to place component (executes `CreateComponent` command).

## 4. Explicit Non-Scope
- Complex sidebar search panels.
- Remote library package fetches (catalog is purely local).

## 5. Frozen Architecture Constraints
- Must dispatch component creation strictly through the `CommandEngine`.

## 6. Dependencies
- UX-002

## 7. Expected Source Files
- `src/ui/component-summon.ts` (or the equivalent UI directory/class)

## 8. Expected Test Files
- `tests/component-summon.spec.ts`

## 9. Acceptance Criteria
- Summoning and placing an `ESP32` or `Relay Module` takes under 5 seconds.
- Creation correctly commits component records into `ObjectEngine`.

## 10. Validation Commands
- `npm test tests/component-summon.spec.ts`

## 11. Stop Conditions
- User placement requires opening category menus or sidebar navigation.

## 12. SAFE INTERIM Declarations
- Local static component catalog structure instead of live package/plugin registry.

## 13. Production Roadmap Replacement Mapping
- NEW UX VALIDATION BEHAVIOR
