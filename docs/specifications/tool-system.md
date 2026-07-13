# Tool System Specification

**Project:** TINC Workbench
**Version:** 0.1.0-draft

---

# 1. Purpose

The Tool System is the core subsystem responsible for managing active interaction modes (tools) within the TINC Workbench canvas. It intercepts raw mouse, touch, and keyboard events from the Canvas Engine and translates them into structured actions (selection updates, object movements, wire routing paths, or shape placements) by delegating to target engines (Selection, Geometry, Command).

---

# 2. Responsibilities

- Tracking the active tool state (e.g., Select Tool, Wire Routing Tool, Component Creation Tool).
- Routing user pointer gestures and keyboard events to the active tool instance.
- Rendering dynamic drawing helpers (overlays, guidelines, snapping indicators).
- Syncing mouse cursor styles to reflect active tool modes.
- Mediating temporary switches (e.g., holding Spacebar temporarily switches to Pan Tool, releasing reverts to Select Tool).
- Coordinating with the Selection Engine and Geometry Engine during interaction sweeps.

---

# 3. Tool Lifecycle

The lifecycle of interaction tools:

- **Register**: Tool definition added to the registry during boot.
- **Activate**: The tool is selected by the user. Triggers cursor updates and initializes local interaction caches.
- **Deactivate**: Triggers cleanup of transient drawing overlays and resets cursor style.
- **Execute**: Event routing during active drag/click sequences.

---

# 4. Active Tool State

- Tracks properties: `activeToolId`, `isTemporary`, `previousToolId`. Only one tool can be active per canvas page.
- Defaults to the **Select Tool** on page initialization or escape events.

---

# 5. Input Routing

The Canvas Engine intercepts raw events (mousedown, mousemove, mouseup, keydown, keyup) and routes them directly to the Tool System:

- Coordinates are converted to World Space using the Geometry Engine before passing to the tool.
- The active tool intercepts these coordinates via `onMouseDown()`, `onMouseMove()`, `onMouseUp()`, `onKeyDown()`, and `onKeyUp()`.

---

# 6. Selection Tools

- **Select Tool**: Default interaction mode. Performs point hit-testing, crossing marquee drags, and lasso shapes. Binds inputs to the Selection Engine.
- Integrates with selection handles to trigger scale or rotate transformations.

---

# 7. Creation Tools

- **Component Creation Tool**: Displays a semi-transparent visual preview of the component under the cursor.
- Clicking the canvas places the object in the Object Engine by executing `CreateObjectCommand`.

---

# 8. Transform Tools

- **Transform Tool**: Handles scaling, moving, and rotating objects using selection handles.
- Calculates translation vectors via the Geometry Engine during mouse dragging.

---

# 9. Connection Tools

- **Wire Routing Tool**: Coordinates port snapping, orthogonal path finding, and wire placement.
- Dynamically draws line segments between connection points during dragging.

---

# 10. Temporary Tools

- **Spring-Loaded Tools**: Initiated by holding specific keys (e.g., Spacebar for Pan, Alt for Snap-Override).
- Releasing the key automatically restores the previously active tool.

---

# 11. Cancellation

- Pressing `Escape` during any active tool operation cancels the gesture, clearing temporary segments or previews, and returns the workspace to the default Select Tool state.

---

# 12. Modifier Keys

- **Shift**: Locks move directions (orthogonally), toggles selections, or restricts aspect ratios.
- **Ctrl / Cmd**: Toggles multi-selections or disables snap settings.

---

# 13. Snapping

- Calls the Geometry Engine's snapping API during pointer moves, updating target snap markers on canvas.

---

# 14. Geometry Integration

- Fetches coordinate conversions, bounds checking, and curve intersections.

---

# 15. Selection Integration

- Retrieves selected component IDs and checks if coordinates target selection handles.

---

# 16. Command Integration

- Dispatches commands (Move, Scale, Create, Route) to the Command Engine on gesture completion.

---

# 17. Event Integration

- Listens to layout and page changes, and publishes `tool:changed` notifications.

---

# 18. Canvas Integration

- Coordinates redraw flags and canvas pointer captures.

---

# 19. Plugin Tools

- Exposes secure API targets allowing custom plugins to register third-party tools (e.g., schematic probes).

---

# 20. Cursors

Coordinates cursor styles:

- Default: pointer.
- Moving: move.
- Selection Box: crosshair.
- Workspace Pan: grab/grabbing.
- Transform Resize: nwse-resize/nesw-resize.

---

# 21. Overlays

- Coordinates dynamic helper overlays (dashed alignment guides, port highlights).

---

# 22. Accessibility

- Keyboard fallbacks for all mouse gestures (e.g. arrow keys for move, space for place).

---

# 23. Performance

- Target input latency: < 4ms. Drag calculations must run within the requestAnimationFrame budget.

---

# 24. Failure Handling

- If a custom tool handler throws an exception during dragging, the system cancels the tool gesture, falls back to the default Select Tool, and logs a debug warning.

---

# 25. Security

- Restricts plugin tools from injecting arbitrary events or reading non-whitelisted keyboard inputs.

---

# 26. APIs (Public and Internal)

The API exposed by the Tool System:

- **registerTool(toolInstance)**: Adds a custom tool definition to the active registry.
- **activateTool(toolId, options)**: Swaps active canvas tools.
- **getActiveTool()**: Returns details for the active tool.
- **routeInputEvent(event)**: Low-level dispatcher passing event inputs to the active tool.

---

# 27. Testing

- Gesture simulation tests, modifier overrides, spring-loaded tool checks, escape cancellations.

---

# 28. ASCII Sequence Diagrams

## 28.1. Wire Routing Drag Sequence

The diagram below details orthogonal wire segment generation during dragging:

```
CanvasEngine         ToolSystem          GeometryEngine       ObjectEngine       RenderingEngine
     |                   |                     |                   |                    |
     |-- dragPointer() ->|                     |                   |                    |
     |                   |-- screenToWorld() ->|                   |                    |
     |                   |<-- worldCoord ------|                   |                    |
     |                   |                                         |                    |
     |                   |-- querySnap() ---->|                    |                    |
     |                   |<-- snapPoint -------|                    |                    |
     |                   |                                                              |
     |                   |-- updateWirePreview() -------------------------------------->|
     |                   |   (Redraw dynamic segments)                                  |
     |-- releaseMouse() >|                                                              |
     |                   |-- createWire() ------------------------>|                    |
```

## 28.2. Spring-Loaded Pan Tool Switch Sequence

This diagram shows toggling temporary pan tools using keyboard inputs:

```
Keyboard          CanvasEngine         ToolSystem          CanvasViewport
   |                   |                    |                     |
   |-- Spacebar Down ->|                    |                     |
   |                   |-- keyPress() ----->|                     |
   |                    |-- tempSwitch(Pan)   |
   |                    |-- setCursor(grab) ->|
   |                                                              |
   |-- Spacebar Up --->|                                          |
   |                   |-- keyRelease() --->|                     |
   |                   |                    |-- restoreTool()     |
   |                   |                    |-- setCursor(default)|
```

---

# 29. State Diagrams

The active tool selection state machine:

```
                             [ Select Tool ]
                                    |
                 +------------------+------------------+
                 | Spacebar down                       | Choose creation
                 v                                     v
           [ Pan Tool ]                         [ Place Tool ]
                 |                                     |
                 | Spacebar release                    | Escape key
                 v                                     v
           [ Select Tool ] <───────────────────────────+
```

---

# 30. Future Extensions

- **Constraint-Based Smart Wire Routing**: Automated path routing avoiding collision boundaries.
- **Free-Form Geometric Drawing Tools**: Dynamic vector path drawing.
- **Collaborative Pointer Highlights**: Render remote users' pointers in real-time.

---

# 31. Tool Lifecycle Ownership and State Transitions

- **31.1. Lifecycle Transitions**: The Tool System owns the active tool registry and manages state transitions:
  ```
  [ Standby ] ── activate() ──> [ Initializing ] ── Mount ──> [ Active ]
                                                                 │
  [ Standby ] <── Unmount ─── [ Cleaning Up ] <── deactivate() ──+
  ```
- **31.2. State Variables**: The system tracks active states, including `activeToolId`, pointer coordinate variables, and helper overlay caches.

---

# 32. Tool Activation, Deactivation and Replacement

- **32.1. Activation**: Switches active canvas tools, initializes interaction caches, sets cursors, and registers Event Bus parameters.
- **32.2. Deactivation**: Clears screen overlays, releases pointer captures, and flushes local caches.
- **32.3. Replacement**: When switching tools, the active tool is deactivated before the new tool is initialized.

---

# 33. Active Tool Arbitration

- **33.1. Arbitration Rules**: Only one tool can hold active canvas control at a time.
- **33.2. Transaction Check**: Swapping tools checks if a transaction is running. If active, the system commits or cancels it before swapping.

---

# 34. Temporary and Spring-Loaded Tool Stack

- **34.1. Tool Stack**: The system maintains a LIFO stack of active tools.
- **34.2. Temporary Switches**: Pressing Spacebar pushes `PanTool` onto the stack, pausing the active tool. Releasing Spacebar pops `PanTool`, restoring the previous tool.

---

# 35. Pointer Capture Lifecycle

- **35.1. Capture Lock**: When dragging starts, the system locks pointer events to the canvas viewport.
- **35.2. Release**: Capture is released on pointer release or gesture cancellation.

---

# 36. Multi-Pointer and Touch Input Boundaries

- **36.1. Touch Routing**: Touch gestures are routed dynamically:
  - Multi-touch inputs (e.g., pinch-to-zoom) are sent to the Canvas Engine.
  - Single-finger drags are routed as standard pointer actions.

---

# 37. Keyboard Event Routing

- **37.1. Keyboard Routing**: Active tools intercept keyboard events first (e.g., arrow keys move objects when Select tool is active).
- **37.2. Fallback**: Unhandled keys fall back to global shortcuts or text inputs.

---

# 38. Modifier Key Precedence and Conflicts

Modifier keys modify tool behaviors based on precedence:

1. **Shift**: Locks move directions (orthogonally), toggles selections, or restricts aspect ratios.
2. **Ctrl / Cmd**: Toggles multi-selections or disables snap settings.
3. **Alt / Option**: Forces a duplicate-drag copy command.

- **Precedence**: Shift > Ctrl > Alt.

---

# 39. Escape and Cancellation Semantics

- **39.1. Cancellation**: Pressing `Escape` cancels active tool operations, rolls back open transactions, and clears preview segments.
- **39.2. Default Fallback**: Returns the workspace to the default Select Tool state.

---

# 40. Tool Transaction Boundaries

- **40.1. Transaction Boundaries**: Tool interactions define command transaction scopes:
  - `Mousedown`: Opens a transaction in the Command Engine.
  - `Drag`: Dispatches temporary delta updates.
  - `Mouseup`: Commits the transaction.

---

# 41. Preview State versus Committed State

- **41.1. Preview State**: Component layouts and wire routes are drawn as semi-transparent previews.
- **41.2. Committed State**: Upon click release, the preview is saved as a standard Object Model entry.

---

# 42. Command Dispatch Rules

- **42.1. Dispatch Trigger**: Commands are sent to the Command Engine on gesture completion (e.g., mouse release).
- **42.2. Error Rollback**: If a command fails during execution, the tool rolls back its preview state and alerts the user.

---

# 43. Selection Tool Integration

- **43.1. Selection Synclink**: Coordinates marquee selections with the Selection Engine.
- **43.2. Bounds Checking**: Modifying selections updates the active transform bounds.

---

# 44. Creation Tool Placement Lifecycle

 The lifecycle of the component placement tool follows these steps:

```
    [ Select Component ] ── Click ──> [ Attach Preview to Cursor ]
                                             |
                                             v
    [ Placed Component ] <── Click ── [ Snap to Grid/Guides ]
            |
            +── Stamp mode enabled ──> [ Attach Preview to Cursor ]
```

---

# 45. Transform Tool Lifecycle

- **45.1. Handle Hover**: Evaluates cursor coordinates against active selection bounds handles.
- **45.2. Handle Lock**: Click actions lock the pointer to the handle and initiate scaling or rotation.
- **45.3. Coordinate Projection**: Computes the translation matrix based on cursor displacement and updates the object's bounds.

---

# 46. Connection and Wire Tool Lifecycle

- **46.1. Port Hover**: Highlights target pins when the cursor falls within snapping range.
- **46.2. Path Routing**: Clicking starts a wire connection, calculating path coordinates using the Connection Engine.
- **46.3. Target Lock**: Clicking a valid target port commits the wire routing path.

---

# 47. Snap Candidate Acquisition and Ranking Integration

- **47.1. Snap Range Query**: Queries the Geometry Engine for snap targets within proximity.
- **47.2. Priority Sort**: Candidates are sorted by priority: Ports > Grid > Object Bounds.

---

# 48. Extreme Zoom Input Tolerance

- **48.1. Low Zoom Tolerances**: Click target radius is increased (up to 15 pixels) to make small ports and connections clickable at low zoom levels.
- **48.2. High Zoom Tolerances**: Click target radius shrinks to 4 pixels for precise selections.

---

# 49. Dense Schematic Interaction Behavior

- **49.1. Target Selectivity**: In dense schematic areas, clicks target pins and wires first to prevent accidental selections.
- **49.2. Contextual Highlights**: Renders preview boundaries for target components to guide placement gestures.

---

# 50. Cursor Ownership and Fallback

- **50.1. Cursor Updates**: Active tools update the canvas cursor style dynamically.
- **50.2. Fallback Rules**: If a tool fails or is deactivated, the cursor defaults back to the pointer style.

---

# 51. Overlay Ownership and Invalidation

- **51.1. Overlay Registry**: Tool overlays (e.g., guide lines, dimensions) are owned by the active tool.
- **51.2. Invalidation**: Overlays are cleared on tool deactivation or cancellation.

---

# 52. Tool Switching During Active Gestures

- **52.1. Interception Check**: Changing tools during an active drag gesture cancels the current action.
- **52.2. Safe Swap**: Reverts coordinates, closes active transactions, and activates the new tool.

---

# 53. Document Switching During Active Tools

- **53.1. Page Evictions**: Switching pages cancels active tool operations.
- **53.2. State Cleansing**: Clears temporary preview states to prevent layout carry-overs.

---

# 54. Object Deletion During Tool Operation

- **54.1. Collision Check**: If a target object is deleted during tool operations, the active tool cancels its operations.
- **54.2. State Reset**: Resets the active tool state to prevent referencing missing object IDs.

---

# 55. Undo and Redo During Active Gestures

- **55.1. Transaction Locks**: Undo and redo commands are blocked during active drag gestures.
- **55.2. Command Processing**: Commands are processed only when the canvas is idle.

---

# 56. Plugin Tool Registration and Namespace Rules

- **56.1. Scoped Namespaces**: Plugins register custom tools using unique namespace prefixes (e.g., `plugin:com.tinc.router.probe`).
- **56.2. Manifest Checks**: Verified by the Plugin Manager during loading.

---

# 57. Plugin Tool Permission Boundaries

- **57.1. Sandbox Limits**: Plugin tools interact with the canvas using read-only proxy APIs.
- **57.2. Context Limits**: Plugins cannot access parent DOM trees or coordinate parameters outside their scoped viewports.

---

# 58. Malicious or Failing Plugin Tools

- **58.1. Exception Monitoring**: Custom tool handler errors are intercepted by the manager.
- **58.2. Auto Cancellation**: Crashes trigger automatic cancellation and revert the workspace to the Select Tool.

---

# 59. Tool State Persistence Rules

- **59.1. Volatile States**: Tool selection configurations are volatile and are not saved to project files.
- **59.2. Default Restores**: Reopening projects resets active tools to Select mode.

---

# 60. Accessibility and Keyboard-Only Operation

- **60.1. Key Navigation mapping**: Accessible users can control tools using dedicated key binds:
  - `T`: Select Tool.
  - `W`: Wire Routing Tool.
  - `C`: Component Placement Tool.
  - `Space`: Pan Tool.
- **60.2. Focus Outlines**: Highlights targeted components with high-contrast indicator shapes.

---

# 61. Large-Project Interaction Latency Targets

Performance limits under heavy schematic loads (10,000 components):

- **Drag Event Latency**: < 2.0 ms.
- **Snap Selection Query Delay**: < 0.5 ms.
- **Toolbar Swap Delay**: < 5.0 ms.

---

# 62. Pointer Event Throughput Targets

- **Throughput target**: The input system processes events at up to 120Hz.
- **Coalescing**: Intermediate movements are coalesced during rendering passes to prevent lag.

---

# 63. Memory Budgets and Transient State Cleanup

- **Memory Limit**: Tool execution memory allocations are capped at 500 KB.
- **GC Management**: Pruning active tools clears all cached preview geometries.

---

# 64. Failure Scenarios and Recovery Matrix

The table below outlines recovery protocols for common tool failures:

| Failure Mode | System Impact | Detection Mechanism | Recovery Procedure |
| :--- | :--- | :--- | :--- |
| **Plugin Tool Crash** | Drawing gesture locks | Catch handler exception | Cancel active gesture, revert to Select Tool, blacklist plugin tool. |
| **Pointer Capture Loss** | Mouseup event missed | Listen to window focus loss | Cancel active gesture, rollback transaction, reset cursor. |
| **Out-of-Bounds Drag** | Coordinates overflow | Check coordinate bounds | Clamp pointer coordinates to workspace boundaries. |
| **Snap Index Mismatch** | Snapping highlights freeze | Detect invalid snap coordinates | Rebuild spatial index and reset snapping targets. |

---

# 65. Security and Untrusted Tool Metadata

- **Metadata Auditing**: Custom tool settings are validated to prevent code injection.
- **Scope Verification**: Prevents custom tools from accessing unauthorized filesystems.

---

# 66. Deterministic Tool Behavior

- **Mathematical Consistency**: The Tool System ensures identical input coordinates yield identical geometry results.
- **Validation**: Coordinates and transformations are verified before dispatches to keep Git diffs clean.

---

# 67. Complete ASCII Sequence Diagrams

## 67.1. Esc-Key Cancellation and Transaction Rollback Flow

This diagram shows how pressing Escape cancels active drag transactions:

```
Keyboard          CanvasEngine         ToolSystem         CommandEngine       ObjectEngine
   |                   |                    |                   |                  |
   |-- Escape press -->|                    |                   |                  |
   |-- keyPress() ----->|                    |                   |                  |
   |                   |                    |-- abortDrag()     |                  |
   |                   |                    |-- rollback() ---->|                  |
   |                   |                    |   (Cancel trans)  |-- revertState() >|
   |                   |                    |-- clearOverlays() |                  |
   |<-- cursor default |                    |-- resetTool()     |                  |
```

## 67.2. Spring-Loaded Tool Stack Push and Pop Sequence

This diagram shows nesting temporary tools in the stack:

```
Keyboard          CanvasEngine         ToolSystem         OverlayManager      CanvasBackend
   |                   |                    |                   |                  |
   |-- Spacebar Down ->|                    |                   |                  |
   |-- keyPress() ----->|                    |                   |                  |
   |                   |                    |-- pushStack(Pan)  |                  |
   |                   |                    |-- cursor(grab) -->|                  |
   |                   |                    |                                      |
   |-- Spacebar Up --->|                    |                                      |
   |                   |-- keyRelease() --->|                     |                  |
   |                   |                    |-- popStack()      |                  |
   |                   |                    |-- restoreCursor() |                  |
   |<-- redraw --------|                    |-- requestFrame() ------------------->|
```

## 67.3. Plugin Tool Exception Handling Flow

This sequence details handling custom tool crashes:

```
ToolSystem        PluginSandbox       PluginSDK         SystemLogger       CanvasViewport
    |                   |                 |                  |                   |
    |-- mouseMove() --->|                 |                  |                   |
    |                   |-- drawPreview ->|                 |                   |
    |                   |   (Crashes)     |                  |                   |
    |                   |<-- exception ---|                  |                   |
    |<-- exception -----|                                    |                   |
    |                                                        |                   |
    |-- blacklistPlugin() ---------------------------------->|                   |
    |-- cancelGesture()                                                          |
    |-- activateTool(Select) --------------------------------------------------->|
```

---

# 68. Complete Tool State Diagrams

The active tool lifecycle state machine:

```
                             [ Standby ]
                                  |
                                  | activate()
                                  v
                           [ Initializing ]
                                  |
                                  v
                             [ Active ] <──────────────+
                                  |                    |
                                  | mousePress()       | drag
                                  v                    |
                             [ Dragging ] ─────────────+
                                  |
               +------------------+------------------+
               |                                     |
          (Release)                               (Cancel)
               v                                     v
         [ Committing ]                         [ Reverting ]
               |                                     |
               +------------------+------------------+
                                  |
                                  v
                             [ Active ]
                                  |
                                  | deactivate()
                                  v
                            [ Cleaning Up ]
                                  |
                                  v
                             [ Standby ]
```

---

# 69. Detailed Examples for Every Major Tool Lifecycle

Below are concrete JSON payload examples representing serialization formats for the core tool categories:

## 69.1. Wire Tool Active Snap State Example

```json
{
  "activeTool": "wire-routing",
  "snapTarget": {
    "portId": "opamp-1:pin-3",
    "coordinates": { "x": 100.0000, "y": 140.0000 }
  },
  "pathFinding": {
    "segmentsCount": 3,
    "pathPoints": [
      { "x": 50.0000, "y": 140.0000 },
      { "x": 80.0000, "y": 140.0000 },
      { "x": 100.0000, "y": 140.0000 }
    ]
  }
}
```

## 69.2. Transform Tool Drag Bounds State Example

```json
{
  "activeTool": "transform",
  "activeHandle": "bottom-right",
  "transformType": "scale",
  "selectionAABB": {
    "minX": 100.0000,
    "minY": 100.0000,
    "maxX": 150.0000,
    "maxY": 150.0000
  },
  "deltaTranslation": { "x": 10.0000, "y": 10.0000 },
  "aspectRatioLocked": true
}
```

## 69.3. Component Placement Template State Example

```json
{
  "activeTool": "placement",
  "componentType": "capacitor",
  "templatePayload": {
    "type": "capacitor",
    "style": { "fill": "#ffffff", "stroke": "#000000" },
    "properties": { "capacitance": "10uF" }
  },
  "cursorWorldPosition": { "x": 250.0000, "y": 180.0000 },
  "gridSnapActive": true
}
```

## 69.4. Temporary Tool Stack Registry Example

```json
{
  "activeToolId": "pan-tool",
  "isTemporary": true,
  "stack": [
    { "toolId": "select-tool", "isTemporary": false },
    { "toolId": "pan-tool", "isTemporary": true }
  ]
}
```

---

# 70. Tool System Configuration Settings

The following variables manage tool system interaction boundaries:

- **`tool.defaultMode`**:
  - **Type**: String.
  - **Default**: `"select-tool"`.
  - **Description**: Sets the default fallback tool on cancellations.
- **`tool.dragThresholdPx`**:
  - **Type**: Integer.
  - **Default**: `4`.
  - **Description**: Pixel threshold distance before clicks are treated as drag gestures.
- **`tool.snapToleranceScale`**:
  - **Type**: Float.
  - **Default**: `1.0`.
  - **Description**: Adjusts snapping radii based on zoom levels.
- **`tool.coalesceFrequencyHz`**:
  - **Type**: Integer.
  - **Default**: `60`.
  - **Description**: Fills mousemove events to match target display Hz.
- **`tool.doubleClickIntervalMs`**:
  - **Type**: Integer.
  - **Default**: `300`.
  - **Description**: Interval timing threshold separating two independent single clicks from a double click.
- **`tool.stampModeRepeat`**:
  - **Type**: Boolean.
  - **Default**: `false`.
  - **Description**: If true, placement tools remain active after committing an object, allowing stamps.
- **`tool.lassoSelectTolerance`**:
  - **Type**: Float.
  - **Default**: `0.5`.
  - **Description**: The minimum fraction of an object's boundary path vertices that must lie within a lasso to trigger selection.

---

# 71. Tool System Error Codes

The Tool System uses the following error codes to handle interaction failures:

| Error Code | Numeric Value | Description | Recovery Strategy |
| :--- | :--- | :--- | :--- |
| `TE_ERR_TOOL_NOT_FOUND` | 501 | Active tool registration has failed. | Revert tool setting back to `select-tool`. |
| `TE_ERR_TRANSACTION_ACTIVE` | 502 | A command transaction is already open. | Halt switch, request commit/rollback, then swap tools. |
| `TE_ERR_LOCK_FAILED` | 503 | Viewport pointer lock cannot be established. | Cancel drag operation, clear cursor capture state. |
| `TE_ERR_CONTEXT_LOST` | 504 | Active target document or page has closed. | Cancel active gestures, flush local caches. |

---

# 72. Tool System Telemetry Logs Schema

Tool interaction events are tracked using this structure:

```json
{
  "timestamp": 1783978800000,
  "sessionId": "sess-889102",
  "action": "tool:gesture-commit",
  "durationMs": 420.5,
  "details": {
    "toolId": "wire-routing",
    "verticesAdded": 4,
    "autoSnapped": true,
    "completedSuccessfully": true
  }
}
```

---

# 73. Tool System Keybind Shortcut Registry Schema

Allows users to configure hotkeys for custom tools:

```json
{
  "mappings": [
    { "key": "KeyT", "modifiers": [], "action": "tool:select" },
    { "key": "KeyW", "modifiers": [], "action": "tool:wire-routing" },
    { "key": "KeyC", "modifiers": [], "action": "tool:placement" },
    { "key": "Space", "modifiers": [], "action": "tool:temp-pan" },
    { "key": "KeyS", "modifiers": ["Ctrl"], "action": "file:save" }
  ]
}
```
