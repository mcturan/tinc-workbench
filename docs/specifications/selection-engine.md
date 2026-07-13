# Selection Engine Specification

**Project:** TINC Workbench
**Version:** 0.1.0-draft

---

# 1. Purpose

The Selection Engine is the subsystem responsible for managing the active selection state within TINC Workbench. It tracks which objects (shapes, components, connections, ports) are currently selected by the user, coordinate workspace gestures, and synchronizes the selection state with the Inspector panel, command executors, and rendering overlays.

---

# 2. Goals

- **Consistency**: Maintain a single source of truth for active selection states across all pages and views.
- **Gesture Coordination**: Support diverse interaction models including single clicks, multi-selections, box selections, lasso selections, and keyboard navigation.
- **Extensibility**: Expose secure selection APIs to plugins and the Plugin SDK.
- **Performance**: Ensure selection sweeps on large-scale documents (10,000+ objects) occur instantly (under 1ms).

---

# 3. Responsibilities

- Tracking active selected object IDs for the workspace.
- Resolving selection cycles when clicking overlapping objects.
- Checking layers (locking, visibility) to block selection of locked or hidden components.
- Intersecting bounding boxes with marquee selection rectangles.
- Querying the Geometry Engine to compute collective selection bounds and handle offsets.
- Publishing selection updates via the Event Bus.

---

# 4. Non-Responsibilities

The Selection Engine does NOT:

- Render selection boxes, dashed lines, or drag handles (delegated to the Rendering Engine).
- Mutate object attributes or execute reposition commands (delegated to the Command Engine).
- Calculate shape boundaries or perform raw coordinate transforms (delegated to the Geometry Engine).

---

# 5. Selection Architecture

The Selection Engine sits in the Core Services layer, acting as the state coordinator:

- **Upstream Inputs**: Receives click and drag-box coordinate gestures from the Canvas Engine and keyboard events from the UI Framework.
- **Downstream Collaborators**:
  - Queries the Geometry Engine's Quadtree index to locate components in selected coordinates.
  - Queries the Object Engine to verify locking and visibility flags.
  - Publishes state shifts to the Event Bus (`ui:selection.changed`).

```
+-----------------------------------------------------------------+
|                         Canvas Engine                           |
+-----------------------------------------------------------------+
       │ (Send mouse click/drag gestures)
       ▼
+-----------------------------------------------------------------+
|                     Selection Engine                            |
+-----------------------------------------------------------------+
       │                                  ▲
       │ (Query spatial quadtree)         │ (Publish selection events)
       ▼                                  │
+------------------------------------+    │
|         Geometry Engine            |    │
+------------------------------------+    │
                                          ▼
+-----------------------------------------------------------------+
|                         Event Bus                               |
+-----------------------------------------------------------------+
```

---

# 6. Selection State Model

- **State Properties**:
  - `selectedIds`: A set of stable unique ID strings representing selected entities.
  - `primaryId`: The ID of the primary selected object (used as alignment anchor or reference).
  - `bounds`: The collective AABB enclosing all selected objects.
- **Validation**: Selection updates clean out invalid references (e.g. deleted objects).

---

# 7. Single Selection

Initiated by clicking an object. Replaces the current selection set with the clicked object ID, making it the primary target.

---

# 8. Multi Selection

Initiated by holding modifier keys (Shift or Ctrl) during click gestures. Appends or toggles the clicked object's selection state without clearing other targets.

---

# 9. Rectangle Selection

Initiated by dragging the mouse to create a selection marquee box. The engine queries the Quadtree for objects overlapping the box coordinates.

---

# 10. Crossing Selection

Selection mode where objects are selected if their bounds intersect the selection marquee bounds, even if not fully enclosed.

---

# 11. Lasso Selection

Selection mode using a free-form path. Evaluates point-in-polygon intersections against the lasso path.

---

# 12. Click Selection

Point-click mechanics. Executes hit-testing algorithms to identify the clicked object under the mouse cursor.

---

# 13. Selection Hit Testing

Integrates with the Geometry Engine. Evaluates point-in-bounds, point-on-line, or point-on-curve checks.

---

# 14. Selection Priority

Hit testing priority rules:

- Ports and pins (highest priority) -> Small components -> Large shapes -> Connections and wires (lowest priority).

---

# 15. Selection Cycling

If the user clicks repeatedly in the same pixel coordinate containing overlapping objects, the engine cycles the selection through the overlapping candidates sequentially.

---

# 16. Overlapping Objects

Handles overlaps by sorting candidates by z-index (highest z-index selected first on the first click).

---

# 17. Layer Awareness

Selection operations ignore objects belonging to layers marked invisible or locked.

---

# 18. Locked Objects

In the Object Model, locked objects cannot be selected by click or drag gestures, preventing accidental moves.

---

# 19. Hidden Objects

Objects belonging to hidden pages or layers are excluded from spatial index queries.

---

# 20. Semantic Object Selection

Clicking a semantic component (e.g., resistor, integrated circuit) selects the entire component group rather than individual graphics lines.

---

# 21. Connection Selection

Wires and logical busses can be selected independently by clicking their wire segments.

---

# 22. Port and Pin Selection

In specific tool contexts (e.g., routing wires), ports and pins are target-selectable, overriding base component selections.

---

# 23. Group Selection

Clicking a member of a group selects the parent group container, keeping the group unified during layout operations.

---

# 24. Nested Group Selection

Double-clicking a group drills down into its hierarchy, allowing the user to select nested child components.

---

# 25. Selection Bounds

The engine calculates the collective bounding box (AABB) of the selection by merging the AABBs of all selected objects.

---

# 26. Selection Handles

The engine defines logical locations for 8 transform handles (corners and midpoints) and a rotation anchor relative to the selection bounds.

---

# 27. Selection Transform Integration

Integrates with the Command Engine during drag-moves or scale actions. The Selection Engine supplies target IDs, and the Command Engine executes translation or rotation commands.

---

# 28. Keyboard Selection

Keyboard actions:

- Arrow keys: Shift selection between adjacent components.
- Tab key: Cycle selection through objects chronologically.
- Ctrl+A: Select all selectable objects on the active page.

---

# 29. Modifier Keys

- **Ctrl / Cmd**: Toggle selection status.
- **Shift**: Additive selection (union).
- **Alt / Option**: Force drag-copy or override snap settings.

---

# 30. Selection Persistence

Selection states are runtime-only properties. They are not serialized to project `.twb` files to keep file formats clean.

---

# 31. Selection Invalidation

If an object is deleted, the Selection Engine listens to the Event Bus and automatically removes the deleted ID from the selection.

---

# 32. Command Engine Integration

Commands query the Selection Engine to resolve target inputs (e.g. applying alignment commands to the active selection).

---

# 33. Event Bus Integration

Publishes `ui:selection.changed` event. Property panels and inspector views subscribe to this to refresh layout inputs.

---

# 34. Geometry Engine Integration

Queries the Quadtree index and bounding box union APIs.

---

# 35. Canvas Engine Integration

Uses viewport coordinates to resolve click coordinates.

---

# 36. Plugin Integration

Safe proxy API allowing plugins to query the selected list and listen to selection change triggers.

---

# 37. Performance

Target selection query latency: < 1ms on pages with up to 10,000 components.

---

# 38. Memory Model

Retains selection IDs in a lightweight flat array. Weak references are used for listener registries.

---

# 39. Failure Handling

If a target object ID is missing from the Object Engine, the Selection Engine cleans its references and continues.

---

# 40. Security

Sanitizes event payloads to prevent prototype pollution during property inspections.

---

# 41. Public API

The public API exposed by the Selection Engine:

- **getSelection()**: Returns the list of selected object IDs.
- **setSelection(ids)**: Sets the active selection to the specified IDs list.
- **clearSelection()**: Empties the selection list.
- **toggleSelection(id)**: Flips selection status for a single object.
- **getSelectionBounds()**: Returns the collective bounding box of the active selection.

---

# 42. Internal API

Low-level methods reserved for the Core framework:

- **cycleSelection(point)**: Iterates selection target among overlapping candidates at the given point.
- **drillDownGroup(groupId)**: Opens group context to select child elements.
- **invalidateBounds()**: Forces recalculation of selection AABB.

---

# 43. Testing

- Testing selection logic: click hit-testing checks, box-selection overlaps, locked layer bypass tests, group selection overrides.

---

# 44. ASCII Sequence Diagrams

## 44.1. Marquee Selection Sequence

The diagram below demonstrates how box selection intersects objects in viewport space:

```
CanvasUI          SelectionEngine      GeometryEngine       EventBus         ObjectEngine
   |                     |                   |                 |                  |
   |-- marqueeDrag(box)->|                   |                 |                  |
   |                     |-- query(box) ---->|                 |                  |
   |                     |<-- candidates ----|                 |                  |
   |                     |                                     |                  |
   |                     |-- verifySelectable() -------------->|                  |
   |                     |<-- selectable IDs ------------------|                  |
   |                     |                                     |                  |
   |                     |-- setSelection()                    |                  |
   |                     |-- publish(SelectionChanged) ------->|                  |
   |<-- redrawSelection -|                                     |                  |
```

## 44.2. Overlap Cycling Sequence

This diagram shows how repeated clicks cycle selection targeting:

```
CanvasUI          SelectionEngine      GeometryEngine      ObjectEngine
   |                     |                   |                  |
   |-- click(X, Y) ----->|                   |                  |
   |                     |-- queryPoint() -->|                  |
   |                     |<-- candidates ----|                  |
   |                     |   (e.g., [A, B])  |                  |
   |                     |                                      |
   |                     |-- resolveOverlaps()                  |
   |                     |   (Check last selected)              |
   |                     |                                      |
   |                     |-- select(B)                          |
   |<-- selected(B) -----|                                      |
```

---

# 45. State Diagrams

The Selection Engine transitions through the following operational states:

```
                             [ Idle ]
                                |
             +------------------+------------------+
             |                                     |
         Click object                          Drag marquee
             v                                     v
       [ Selecting ]                         [ Box Dragging ]
             |
             | Update State                        | Mouse release
             v
       [ Selected ] <──────────────────────────────+
             |
             +------------------+------------------+
             |                                     |
         Drag handle                           Click canvas
             v                                     v
     [ Drag Transform ]                          [ Idle ]
             |
             | Commit
             v
       [ Selected ]
```

---

# 46. Future Extensions

- **AI Smart Selection**: Automated selection of related component clusters (e.g. selecting a microcontroller and automatically highlighting its bypass capacitors).
- **Collaborative Selection Outlines**: Render remote users' active selections in collaborative multi-user sessions, using colored bounding highlights.

---

# 47. Selection Ownership and Lifecycle

- **47.1. Page Ownership**: The active page controls selection lifecycle boundaries. When the active page changes, the selection is cleared.
- **47.2. Lifecycle States**: A selection transitions through:
  - `Create`: Instantiated as an empty selection set on page load.
  - `Mutate`: Modified via user actions or API requests.
  - `Invalidate`: Pruned when selected objects are deleted or hidden.
  - `Clear`: Emptied when the page is closed or user clicks empty canvas.

---

# 48. Active and Primary Selection Rules

- **48.1. Active Selection**: The set of all currently selected object IDs.
- **48.2. Primary Selection**: The most recently selected object in the active set.
- **48.3. Selection Anchor**: The primary selection acts as the reference anchor when applying alignment or distribution commands.
- **48.4. Promotion**: If the primary selection is deselected or deleted, the next most recently selected object is promoted to the primary position.

---

# 49. Selection Anchor Rules

- **49.1. Group Origin**: For group selections, the anchor defaults to the group's geometric center.
- **49.2. Connection Anchors**: When selecting connections, the anchor snaps to the nearest vertex or port connection.
- **49.3. Transformation Scaling**: Scaling operations use the anchor point as the scaling origin.

---

# 50. Deep Selection and Group Drill-Down

- **50.1. Double-Click Drill-Down**: Double-clicking a group drills down into its hierarchy, allowing the user to select nested child components.
- **50.2. Exit Gesture**: Clicking on empty canvas space exits the drill-down loop and returns the selection focus to the parent group.
- **50.3. Breadcrumb Path**: The Selection Engine maintains a path list of active nested groups to support hierarchical navigation.

---

# 51. Overlapping Object Candidate Ranking

When a click occurs where multiple objects overlap, candidates are ranked using the following criteria:

1. **Distance to Origin**: The Euclidean distance between the click coordinate and the candidate's bounds origin.
2. **Object Area**: Smaller objects are ranked higher than larger ones to prevent background shapes from blocking smaller components.
3. **Z-Index**: Objects with higher z-index values are ranked higher.

---

# 52. Selection Cycling Order and Reset Conditions

- **52.1. Cycling Loop**: Repeated clicks within 500ms at the same coordinate cycle through the ranked list of overlapping components.
- **52.2. Reset Conditions**: The cycling index is reset under the following conditions:
  - The cursor moves more than 5 pixels from the click coordinate.
  - The time interval between clicks exceeds 500ms.
  - The user presses an escape key or selects a different tool.

---

# 53. Marquee Direction Semantics

The selection behavior of the drag marquee rectangle changes based on the drag direction:

- **Left-to-Right (Window Mode)**: Selects only objects fully enclosed within the drag rectangle bounds.
- **Right-to-Left (Crossing Mode)**: Selects any object intersecting or enclosed within the drag rectangle.

---

# 54. Lasso Polygon Intersection Rules

- **54.1. Polygon Definition**: The lasso path is modeled as a closed polygon defined by cursor coordinates collected during the drag gesture.
- **54.2. Intersection Algorithm**: The engine uses the ray-casting algorithm from the Geometry Engine to verify if an object's boundary points fall inside the lasso polygon.
- **54.3. Inclusion Threshold**: An object is selected if more than 50% of its vertices fall inside the lasso polygon.

---

# 55. Selection Tolerance at Extreme Zoom Levels

Click hit tolerances scale dynamically based on the viewport zoom level:

- **Low Zoom Bounds**: The selection hit radius increases (up to a limit of 15 Screen Space pixels) to keep small ports and connection lines clickable at low zoom scales.
- **High Zoom Bounds**: Hit tolerances shrink to 4 pixels to allow precise selection of densely packed details.

---

# 56. Dense Schematic Selection Behavior

- **56.1. Selection Density**: In dense schematic regions, hit testing evaluates ports and connection endpoints before checking large component bounds.
- **56.2. Selection Filtering**: Users can apply selection filters (e.g., select only wires) to prevent accidental selections in dense zones.

---

# 57. Electrical Port and Pin Selection Priority

- **57.1. Port Target Priority**: Port centers have highest hit testing priority. If a port is hit, the engine suppresses the parent component selection.
- **57.2. Connection Context**: In connection routing modes, pins are target-selectable, overriding component selections.

---

# 58. Wire and Connection Segment Selection

- **58.1. Segment Selection**: Clicking a wire selects only the specific clicked segment (line between two vertices).
- **58.2. Net Selection**: Double-clicking a wire segment selects the entire connection path (the net).
- **58.3. Vertex Selection**: Click gestures near wire vertices select the vertex, allowing path adjustments.

---

# 59. Locked Layer Selection Policies

- **59.1. Selection Exclusions**: Locked objects cannot be selected by click or marquee drag gestures.
- **59.2. Eviction**: Locking a layer immediately deselects all active objects belonging to that layer.

---

# 60. Hidden and Temporarily Isolated Object Rules

- **60.1. Hidden Objects**: Hidden objects are excluded from spatial index queries and cannot be selected.
- **60.2. Isolation Mode**: When isolation mode is active, only isolated objects are selectable. All other workspace elements are ignored.

---

# 61. Cross-Layer Multi-Selection

- **61.1. Multi-Layer Rules**: Multi-selection can span across different layers, provided the layers are visible and unlocked.
- **61.2. Alignment Operations**: Selected objects from different layers are aligned relative to the primary selection anchor, preserving z-index ordering.

---

# 62. Mixed Object-Type Selection

- **62.1. Selection Mix**: Allows selecting a mix of wires, shapes, components, and text.
- **62.2. Command Verification**: Commands verify mixed types before executing (e.g., disabling rotation options if a wire segment is selected).

---

# 63. Selection Bounds Caching and Invalidation

- **63.1. Caching**: The collective bounding box (AABB) of the selection is cached.
- **63.2. Invalidation**: Caches are invalidated instantly when objects in the selection are moved, scaled, or updated.

---

# 64. Handle Visibility and Collision Rules

- **64.1. Handle Collapse**: If two transform handles overlap in Screen Space (low zoom), the engine hides intermediate handles, keeping only corner scale handles visible.
- **64.2. Hit Targets**: Transform handles are hit-tested before document objects. A hit on a transform handle locks the selection and starts the transformation gesture.

---

# 65. Keyboard Navigation Ordering

- **65.1. Tab Navigation**: Tab-key navigation shifts focus based on creation order or spatial sequence (left-to-right, top-to-bottom).
- **65.2. Shift-Tab**: Navigates through the selection list in reverse order.

---

# 66. Modifier Key Conflict Resolution

When multiple modifier keys are pressed simultaneously, conflict resolution applies:

- **Shift + Ctrl + Click**: The engine toggles selection status (Ctrl behavior) and appends the target to the selection list (Shift behavior).
- **Alt + Shift + Drag**: Forces a duplicate-drag copy command, ignoring snap guidelines.

---

# 67. Selection Restoration after Undo and Redo

- **67.1. State Logging**: The History Engine logs selection states as metadata context on each history node.
- **67.2. State Restoration**: Reverting or re-applying a command restores the active selection state to match the command's execution context.

---

# 68. Selection Behavior during Object Deletion

- **68.1. Immediate Eviction**: When objects are deleted, their IDs are immediately evicted from the selection list.
- **68.2. Reset**: If the selection list becomes empty after deletion, the active selection bounds are cleared.

---

# 69. Selection Behavior during Plugin Unload

- **69.1. Deactivation**: If a plugin registers custom objects and gets unloaded, those custom object references are evicted from the active selection.
- **69.2. API Cleanup**: The Selection Engine clears all event listeners registered by the unloaded plugin.

---

# 70. Large-Project Performance Targets

Performance metrics under heavy schematics containing 10,000 components:

- **Marquee Selection Latency**: < 1.0 ms for intersecting up to 500 objects.
- **Deselection Latency**: < 0.2 ms.
- **Memory Footprint**: Total memory heap allocations must remain under 1 MB.

---

# 71. Memory Budgets and Benchmarks

- **Peak Memory**: Active selection collections use less than 100 KB in standard editing sessions.
- **Allocation Minimization**: Reuses selection set instances to prevent garbage collection sweeps.

---

# 72. Plugin Selection Extensions and Isolation

- **72.1. Sandboxed Contexts**: Plugins cannot directly read or modify the global selection set.
- **72.2. Proxy APIs**: Plugins query selected items through secure proxies that restrict access to authorized namespaces.

---

# 73. Malicious or Failing Plugin Handlers

- **73.1. Interceptor Guards**: If a plugin listener throws an error during selection updates, the Selection Engine catches the error and commits the state.
- **73.2. Listener Blacklisting**: Plugin handlers that fail repeatedly are blacklisted for the active session.

---

# 74. Failure Scenarios and Recovery

- **74.1. Missing Object Reference**: If a selected ID is missing from the Object Engine, the Selection Engine clears the reference.
- **74.2. Singular Transform Recovery**: If selection bounds calculations fail, the engine resets bounds to a zero bounding point.

---

# 75. Accessibility and Keyboard-Only Selection

- **75.1. Focus Highlights**: Keyboard-selected objects are rendered with distinct outline highlights.
- **75.2. Screen Readers**: Selection updates publish structural descriptions to the accessibility manager.

---

# 76. Complete ASCII Sequence Diagrams

## 76.1. Selection Restoration Sequence

This diagram shows how the History Engine restores selection states during undo/redo:

```
HistoryEngine     SelectionEngine     ObjectEngine       CanvasUI         EventBus
      |                  |                  |                |                |
      |-- undo() ------->|                  |                |                |
      |                  |-- getMeta() ---->|                |                |
      |                  |<-- selectionMeta-|                |                |
      |                  |                                   |                |
      |                  |-- restoreIds() ------------------>|                |
      |                  |                                   |-- notifyUI() ->|
      |<-- done ---------|                                                    |
```

## 76.2. Selection Invalidation on Deletion

This diagram shows invalidation flow when objects are deleted:

```
CommandEngine      ObjectEngine       SelectionEngine      EventBus         UIFramework
      |                  |                   |                |                 |
      |-- deleteObject ->|                   |                |                 |
      |                  |-- notifyEvict() ->|                |                 |
      |                  |                   |-- remove(id) --|                 |
      |                  |                   |-- publish() -------------->|     |
      |                  |                   |                |<-- selectChange-|
```

---

# 77. Complete Selection State Diagrams

The state machine for Selection Engine transactions:

```
                             [ Idle ]
                                |
                   +------------+------------+
                   |                         |
              (Drag Marquee)            (Ctrl+Click)
                   |                         |
                   v                         v
            [ Marquee Drag ]          [ Toggle Mode ]
                   |                         |
            +------+------+                  +-------+
            |             |                          |
       (Intersect)    (Enclose)                      |
            |             |                          |
            v             v                          v
      [ Crossing ]    [ Window ]               [ Merged Set ]
            |             |                          |
            +------+------+                          |
                   |                                 |
                   v                                 v
             [ Selection ] ───────────────────> [ Selected ]
```

---

# 78. Detailed Examples for Every Major Selection Mode

Below are concrete JSON payload examples representing serialization formats for the core selection categories:

## 78.1. Single Selection State Example

```json
{
  "selectedIds": ["rect-99"],
  "primaryId": "rect-99",
  "bounds": {
    "minX": 100.0000,
    "minY": 150.0000,
    "maxX": 180.0000,
    "maxY": 210.0000
  }
}
```

## 78.2. Multi Selection State Example

```json
{
  "selectedIds": ["rect-99", "wire-12"],
  "primaryId": "wire-12",
  "bounds": {
    "minX": 50.0000,
    "minY": 80.0000,
    "maxX": 180.0000,
    "maxY": 210.0000
  }
}
```

## 78.3. Marquee Selection State Example

```json
{
  "marqueeBounds": {
    "minX": 20.0000,
    "minY": 20.0000,
    "maxX": 200.0000,
    "maxY": 200.0000
  },
  "mode": "crossing",
  "intersectedIds": ["rect-99", "wire-12"]
}
```

## 78.4. Lasso Selection State Example

```json
{
  "lassoPath": [
    { "x": 10.0000, "y": 10.0000 },
    { "x": 100.0000, "y": 10.0000 },
    { "x": 100.0000, "y": 100.0000 },
    { "x": 10.0000, "y": 100.0000 }
  ],
  "enclosedIds": ["rect-99"]
}
```

---

# 79. Selection Engine Error Codes

The Selection Engine utilizes the following error codes to handle state conflicts and invalid operations:

| Error Code | Numeric Value | Description | Recovery Strategy |
| :--- | :---: | :--- | :--- |
| `SE_ERR_ID_NOT_FOUND` | 401 | Requested object identifier does not exist within active Object Engine. | Clear ID reference from selected list and refresh bounds. |
| `SE_ERR_OBJECT_LOCKED` | 402 | Attempted to select or toggle an object belonging to a locked layer. | Ignore click or marquee intersection; fail selection silently. |
| `SE_ERR_LAYER_HIDDEN` | 403 | Attempted to select an object on a hidden layer. | Block selection; log telemetry warning. |
| `SE_ERR_TRANSFORM_FAIL` | 404 | Bounding box coordinates calculation returns infinite bounds. | Reset cached selection bounds to zero bounding point. |

---

# 80. Selection Engine Configuration Settings

The following workspace configuration settings define active selection behaviors:

- **`selection.marqueeMode`**:
  - **Type**: String.
  - **Default**: `"direction"` (directional crossing/window behavior).
  - **Options**: `"crossing"`, `"window"`, `"direction"`.
- **`selection.cycleIntervalMs`**:
  - **Type**: Integer.
  - **Default**: `500`.
  - **Description**: Click interval threshold for cycling through overlapping candidates.
- **`selection.snapThresholdPx`**:
  - **Type**: Integer (Pixels).
  - **Default**: `8`.
  - **Description**: Target pointer radius for selecting ports and wire segments.
- **`selection.filterMode`**:
  - **Type**: String.
  - **Default**: `"all"`.
  - **Description**: Restricts selection targets (options: `"all"`, `"components"`, `"wires"`, `"text"`).

---

# 81. Selection Engine Telemetry Logs Schema

Selection metrics are gathered and logged using the following structure:

```json
{
  "timestamp": 1783978700000,
  "sessionId": "sess-889102",
  "action": "selection:marquee-query",
  "durationMs": 0.82,
  "details": {
    "marqueeArea": 32400.0,
    "scannedObjects": 450,
    "intersectedCount": 8,
    "finalSelectionSize": 12
  }
}
```
