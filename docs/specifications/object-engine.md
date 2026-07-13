# Object Engine Specification

**Project:** TINC Workbench
**Version:** 0.1.0-draft

---

# 1. Purpose

The Object Engine is the runtime state manager and registry of TINC Workbench. It owns the active in-memory document tree, coordinates object lifecycle states, maintains fast lookup indexes, guarantees schema and reference validation, and processes mutations, acting as the single source of truth for engineering model configurations.

---

# 2. Ownership

- The Object Engine owns the active project workspace's runtime objects, layers, pages, and components.
- Direct mutations from other services are blocked; all modifications must pass through Command Engine transactions.

---

# 3. Object Registry

- **Registry Index**: A flat index map tracking all instantiated objects by their unique IDs. Enables $O(1)$ lookup times.
- **Reference Management**: Tracks weak references to registered elements to support garbage collection sweeps.

---

# 4. Object Lifecycle

The runtime lifecycle of registered elements:

- **Register**: Component is instantiated, validated, and added to the registry map.
- **Resolve**: Links and references to parent groups, layers, or connected ports are resolved.
- **Mutate**: Property changes are validated, committed to memory, and published.
- **Evict**: Component is deregistered during deletions.

---

# 5. Identity

- Every object is assigned a universally unique identifier (UUIDv4) or structured unique string ID on registration. IDs are immutable.
- The engine rejects registrations of duplicate IDs, throwing conflict exceptions.

---

# 6. Type System

- Manages standard primitive types (shapes, text, lines) and semantic component types (resistors, capacitors, ICs).
- Enforces baseline type requirements (e.g. IC objects must define port lists).

---

# 7. Semantic Metadata

- Indexes component properties, manufacturer codes, part numbers, and rating values (e.g. resistance).
- Allows querying components by ratings (e.g. retrieve all resistors value `10k`).

---

# 8. Hierarchy

- Manages parent-child relationships between pages, layers, groups, components, ports, and pins.
- Navigating up or down the hierarchy resolves references in $O(1)$ time.

---

# 9. Groups

- Coordinates group containers, translating bounds updates to nested children.
- Ungrouping shifts child coordinates back to parent coordinates.

---

# 10. Pages

- Manages sheet layouts. Coordinates page switching, clearing active registers when pages close.

---

# 11. Layers

- Coordinates layer z-order sorting, locking attributes, and visibility properties.
- Moving components between layers updates layer object lists.

---

# 12. Properties

- Exposes attribute accessors and mutators. Tracks changed properties to fire Event Bus notifications.

---

# 13. Ports and Pins

- Ports and Pins are structural sub-components of Semantic Objects, representing logical terminal points. They are NOT independent top-level registry objects.
- `localPosition` is defined in the parent Semantic Object's coordinate space.
- The Object Engine maintains runtime lookup indexes for Port/Pin identity resolution to support rapid netlist queries, but does not redefine their persisted schema.

---

# 14. LogicalConnections, Wires, and Endpoints

- **LogicalConnection**: Represents the logical or netlist relationship (not a routed visual trace). It is the persisted owner of source and target Endpoint objects.
- **Wire**: Represents the physical segmented routed trace. It references its semantic relationship using `logicalConnectionId` and stores segment path geometries (start/end coordinate points).
- **Endpoint**: A discriminated union (PORT, PIN, FLOATING) owned strictly by the LogicalConnection. PORT/PIN endpoints reference target Ports/Pins, while FLOATING endpoints represent dangling, yet valid, persisted coordinates.
- Wires and LogicalConnections are managed separately in the Object Engine, with Wires referencing LogicalConnections by ID.

---

# 15. Transforms

- The Object Engine coordinates raw transform attributes (such as `x`, `y`, and `rotation`).
- The Object Engine does NOT compute, store, or cache transformation matrices. All transform matrix calculations and matrix caches are owned and managed exclusively by the Geometry Engine.

---

# 16. Bounds

- The Object Engine owns raw dimension properties (`width`, `height`).
- The Object Engine does NOT own or cache derived bounds caches (like Axis-Aligned Bounding Boxes or Oriented Bounding Boxes). The Geometry Engine owns derived bounds caches and spatial partitioning.

---

# 17. Indexing

The Object Engine maintains runtime indexes to accelerate semantic and identifier queries:
- **Layer Index**: Quick lookup of objects by layer ID.
- **Type Index**: Groups objects by type (e.g. all capacitors).
- **Port/Pin Map**: Maps port and pin IDs back to their parent Semantic Objects.
- The Object Engine does NOT own or manage spatial Quadtree indexes; the spatial index is owned entirely by the Geometry Engine.

---

# 18. Mutation Boundaries

- **Transaction Wrapper**: Changes are queued in memory and committed on transaction success.
- **Rollback**: If a transaction aborts, the engine rolls back updates, restoring the baseline state.

---

# 19. Validation

Enforces structural limits:

- Component widths and heights must be positive numbers.
- LogicalConnections must reference existing Ports, Pins, or coordinates via their Endpoints. Wires must reference existing LogicalConnection IDs.
- Type definitions must match target schema parameters.

---

# 20. Cloning

- Implements deep cloning algorithms, generating new UUIDs for cloned objects.
- Resolves internal relative references (e.g., cloned LogicalConnections update Endpoints to point to target cloned Ports/Pins, and cloned Wires update their logicalConnectionId references).

---

# 21. Deletion

- Evicts targets from the registry, disconnects associated LogicalConnections (setting their Endpoints to FLOATING), updates or prunes referencing Wires, and removes parent-child links.

---

# 22. References

- Maintains reference integrity, ensuring that Endpoint references in LogicalConnections do not point to deleted Ports or Pins (converting them to FLOATING endpoints if their target Port/Pin is deleted).

---

# 23. Unknown Object Preservation

- Preserves unrecognized object parameters in a private `_unknownFields` map to support forward compatibility.

---

# 24. Plugin-Defined Objects

- Plugins register custom component definitions. The engine parses and validates them using custom schemas.

---

# 25. Command Integration

- The Command Engine is the sole orchestration boundary for canonical mutations. All mutations reach the Object Engine only through Command Engine orchestration.
- The Object Engine validates mutations against schemas and reference integrity rules, executes them in-memory, and returns validated mutation results back to the Command Engine.

---

# 26. History Integration

- The Object Engine is completely ignorant of the History Engine and does not contain any references to history or undo/redo stacks.
- The Object Engine does not record history; historical states and deltas are extracted and managed by the Command Engine and History Engine.

---

# 27. Event Integration

- The Object Engine does not publish committed mutation events. The Command Engine acts as the sole commit orchestrator and publishes committed events to the Event Bus only after successful mutation and history recording.

---

# 28. Geometry Integration

- The Object Engine exposes the canonical object state (bounds, rotation, hierarchy) required for geometric computations.
- The Object Engine does NOT own or store transform matrix caches, derived bounds caches, spatial indexes, or hit-test geometry. These are owned and managed entirely by the Geometry Engine.

---

# 29. Rendering Integration

- The Object Engine is decoupled from and has no direct dependency on the Rendering Engine.
- Rendering invalidation is reactive and triggered downstream by committed mutation events published by the Command Engine.

---

# 30. Storage Integration

- Supplies canonical state snapshots during saves and hydrates in-memory structures on load. The Object Engine remains ignorant of serialization formatting.

---

# 31. Memory

- Reuses vector structures and object pools to minimize garbage collection cycles.

---

# 32. Performance

- Target lookup latency: < 0.01 microseconds. Mutation validation: < 0.1 ms.

---

# 33. Failure Recovery

- Reverts in-memory state to the last verified checkpoint if mutations cause validation failures.

---

# 34. Security

- Sanitizes string parameters to prevent scripting injections.

---

# 35. APIs (Public and Internal)

The public API exposed by the Object Engine:

- **getObject(id)**: Returns the registered object instance.
- **getObjectsByType(type)**: Retrieves objects matching the type filter.
- **cloneObjects(ids)**: Deep clones objects, generating new identifiers.
- **registerObject(object)**: Adds a component instance to the active registry.
- **evictObject(id)**: Deregisters a component from the index map.

---

# 36. Testing

- Registry lookup checks, mutation rollbacks, parent-child integrity audits, clone validations.

---

# 37. ASCII Sequence Diagrams

### 37.1. Object Registration Sequence

The diagram below details registering and resolving a component:

```
CommandEngine       ObjectEngine       ObjectRegistry       EventBus       GeometryEngine     RenderingEngine
      |                   |                  |                  |                 |                  |
      |-- register(Obj) ->|                  |                  |                 |                  |
      |                   |-- validate()     |                  |                 |                  |
      |                   |-- add(Obj) ----->|                  |                 |                  |
      |                   |                  |-- index()        |                 |                  |
      |<-- success -------|                                     |                 |                  |
      |                                                         |                 |                  |
      |-- publish(core:object.registered) --------------------->|                 |                  |
      |                                                         |-- invalidate() >|                  |
      |                                                         |                 |-- invalidate() ->|
```

## 37.2. Reference Invalidation on Deletion

This diagram shows evicting references during component deletion:

```
CommandEngine       ObjectEngine       ObjectRegistry       EventBus       GeometryEngine     RenderingEngine
      |                   |                  |                  |                 |                  |
      |-- delete(id) ---->|                  |                  |                 |                  |
      |                   |-- disconnect() --|                  |                 |                  |
      |                   |-- remove(id) --->|                  |                 |                  |
      |                   |                  |-- unindex()      |                 |                  |
      |<-- success -------|                                     |                 |                  |
      |                                                         |                 |                  |
      |-- publish(core:object.deleted) ------------------------>|                 |                  |
      |                                                         |-- invalidate() >|                 |
      |                                                         |                 |-- invalidate() ->|
```

---

# 38. State Diagrams

The runtime lifecycle of registered objects:

```
                             [ Unregistered ]
                                    |
                                    | registerObject()
                                    v
                             [ Registered ] <──────────+
                                    |                  |
                                    | update()         | rollback
                                    v                  |
                             [ Mutating ] ─────────────+
                                    |
                                    | commit()
                                    v
                             [ Registered ]
                                    |
                                    | evictObject()
                                    v
                             [ Unregistered ]
```

---

# 39. Future Extensions

- **Parametric Constraint Modeling**: Real-time evaluation of component parameters.
- **Hierarchical Sub-Circuits**: Nested circuit sheets with multi-page port mapping.
- **Collaborative Sync Hooks**: Real-time document updates over WebSockets.

---

# 40. Object Engine Ownership and Runtime Boundaries

- **40.1. Workspace Boundary**: The Object Engine is the ultimate owner of active document states. Structural elements (e.g. pages, layers, wires) exist strictly within this boundary.
- **40.2. Direct Access Block**: External modules cannot directly mutate properties in the registry. Direct property assignments (e.g. `object.x = 10`) bypass transaction logging and are blocked.
- **40.3. Mutability Control**: Objects returned via queries are frozen proxy objects. Modifying them requires dispatches through Command Engine wrappers.

---

# 41. Registry Initialization and Shutdown

- **41.1. Initialization**: On workspace load, the engine creates empty lookup maps, registers base types, and prepares transaction locks.
- **41.2. Shutdown**: Upon close, the engine unsubscribes from the Event Bus, empties lookup registries, clears geometry and rendering cache links, and releases memory buffers.

---

# 42. Object Registration Lifecycle

A component transitions through the following registration steps:

```
    [ Ingest Payload ] ── Check Type ──> [ Validate Schema ]
                                                 |
                                                 v
    [ Index Registry ] <── Allocate ID ── [ Resolve References ]
            |
            v
    [ Event Publish ] ── Redraw Canvas ──> [ Active State ]
```

---

# 43. Object Identity Guarantees

- **UUID Enforcements**: Every registered object must hold a valid, immutable UUIDv4 string.
- **Identity Integrity**: Renaming or modifying an ID during its active registry lifecycle is blocked.
- **Asset Links**: References (e.g. wire connections pointing to ports) use these UUIDs to maintain referential integrity.

---

# 44. UUID Collision Handling

- **Collision Audits**: When registering an object, the engine checks for existing matches in the registry index.
- **Conflict Actions**: If a collision is found:
  - During file imports, the engine logs a warning and regenerates a new UUID.
  - During interactive copy-paste operations, the copy utility automatically remaps IDs.
  - Under transactional command executions, the operation is blocked and throws `OE_ERR_ID_COLLISION`.

---

# 45. Runtime Type Registration

- **Type Registry**: The engine maintains a dictionary of registered type schemas.
- **System Types**: Core primitives (rectangles, wires, text) are registered on boot.
- **Dynamic Extensions**: Plugins can register custom type definitions during plugin load sequences.

---

# 46. Type Inheritance and Capability Rules

- **Base Capabilities**: Object types inherit behaviors from parent capabilities:
  - `visual`: Elements with positions and styles.
  - `connectable`: Objects containing ports or pins.
  - `container`: Parent elements like groups or layers.
- **Capability Checks**: The engine queries capabilities (e.g., checking if an object inherits `connectable` before attaching wires).

---

# 47. Semantic Metadata Indexing

- **Metadata Indexes**: The engine indexes semantic properties (e.g., manufacturer part numbers, values, ratings).
- **Index Tables**: Maintains B-Tree lookup maps to allow quick property queries (e.g., locating all resistors valued `10k`).

---

# 48. Semantic Query Lifecycle

The sequence of operations during property searches:

1. **Query Parse**: Validates target search key criteria.
2. **Index Lookup**: Scans secondary metadata indexes, bypasses flat sweeps.
3. **Filter**: Filters candidates by page or layer scope.
4. **Proxy Wrap**: Clones matching objects, wrapping them in frozen proxy interfaces to return.

---

# 49. Parent-Child Hierarchy Validation

- **Link Verifications**: Child elements must reference existing parent containers (e.g., an object must belong to a valid layer).
- **Parent Validation**: If a parent container is deleted, the engine verifies that all child nodes are reassigned or deleted.

---

# 50. Circular Hierarchy Protection

- **DFS Checks**: Prior to updating parent-child relationships, the engine runs a Depth-First Search (DFS) check.
- **Loop Interception**: If the target parent is a descendant of the child object (e.g. attempting to drop a parent group into one of its children), the update is blocked.

---

# 51. Page Ownership and Object Migration

- **Page Ownership**: Objects are linked to a single parent page.
- **Migration Pipeline**: Dragging objects between pages updates their page references. The engine removes the objects from the source page's index and registers them in the target page's index.

---

# 52. Layer Ownership and Movement

- **Layer Lists**: Layers maintain ordered lists of child object IDs to manage z-index coordinates.
- **Move Commands**: Moving objects between layers updates their layer assignments, invalidates layer boundaries, and updates rendering lists.

---

# 53. Group Lifecycle and Nested Groups

- **Group Creation**: Groups are parent containers defined with their own transform boundaries.
- **Nesting Rules**: Moving a child into a group recalculates its local coordinate transform relative to the group's origin.
- **Dissolution**: Ungrouping removes the group container, converting the children's coordinates back to page coordinate space.

---

# 54. Port and Pin Runtime Indexing

- **Index Maps**: Ports and pins are indexed in a secondary lookup map.
- **Junction Resolution**: Speeds up connection queries (e.g., routing utilities can resolve which component pin is located at target coordinates in $O(1)$ time).

---

# 55. Property Access and Mutation Boundaries

- **Immutable Reads**: Property queries return frozen values.
- **Mutation Control**: Updates are performed by dispatching mutation commands through transactions.
- **Validation Checkpoints**: Values are validated against schemas before changes are committed to the registry.

---

# 56. Transform Mutation Orchestration

- **Transform Pipelines**: Coordinate shifts (moves, scales, rotations) are processed via the Geometry Engine:
  1. Calculate target local transformation matrices.
  2. Map parent-inherited coordinate changes.
  3. Update target component bounding boxes.
  4. Invalidate the bounds caches of parent groups.

---

# 57. Bounds Cache Lifecycle

- **Cache Tags**: Bounding boxes (AABBs) are cached to optimize culling checks.
- **Cache Eviction**: Cached bounds are cleared when geometry properties change.
- **Propagation**: Changing a child's coordinates invalidates its cache and propagates up to clear parent group bounds.

---

# 58. Secondary Indexes and Invalidation

- **Index Sweeps**: Secondary indexes (e.g., Layer index, Type index) are updated on object changes.
- **Invalidation**: Deletions or updates trigger index updates before Event Bus notifications are fired.

---

# 59. Object Cloning and Identity Remapping

- **Deep Clones**: Cloning creates duplicates of target objects.
- **ID Remapping**: The engine generates new UUIDs for cloned objects.
- **References**: Relative references within the cloned selection are updated to point to the new cloned targets.

---

# 60. Deep Clone Reference Rewriting

During multi-object copy-paste operations, links between copied elements must be preserved:

- **Map Registry**: The engine maintains a map of original IDs to cloned IDs (e.g., `Old_ID -> New_ID`).
- **Link Updates**: Cloned wire connections are updated to point to the new cloned port IDs instead of the original ones.

---

# 61. Object Deletion Lifecycle

Component deletions execute the following sequence:

```
    [ Query ID ] ── Check Cascade ──> [ Disconnect Wires ]
                                              |
                                              v
    [ Evict Registry ] <── Unindex ── [ Remove Parent Links ]
            |
            v
    [ Event Publish ] ── Redraw Canvas ──> [ Cleanup Completed ]
```

---

# 62. Cascade Deletion Boundaries

- **Cascading Rules**: Deleting a component deletes all its nested ports and pins.
- **Wire Disconnection**: Wires connected to deleted ports are disconnected. The engine flags the wire segments as disconnected, prompting updates to the routing systems.

---

# 63. Dangling Reference Detection

- **Integrity Checks**: The engine runs background audits to detect dangling references (e.g., wires referencing missing ports).
- **Cleanup**: Invalid reference pointers are removed to maintain model consistency.

---

# 64. Unknown Object Round-Trip Preservation

- **Ingestion**: Properties not recognized by the current schema version are saved to a private `_unknownFields` dictionary.
- **Forward Saves**: These values are written back to the JSON payload on save, ensuring compatibility when files are shared across versions.

---

# 65. Plugin-Defined Object Registration

- **Dynamic Types**: Plugins register custom component schemas.
- **Validations**: Objects created by plugins are validated against these custom schemas before registration.

---

# 66. Plugin Unload with Live Objects

- **Dangling Objects**: If a plugin is unloaded while its custom objects are active, the objects remain in the registry.
- **Fallback Rendering**: The engine replaces their visual representations with generic error placeholders.
- **Save preservation**: Retains the custom properties in the project file on save.

---

# 67. Command Engine Mutation Enforcement

- **Boundary Enforcement**: Object mutations must run inside a transaction block in the Command Engine.
- **Block Actions**: Direct modifications of registered objects throw execution exceptions.

---

# 68. History Restoration Behavior

- **Hydration Sequences**: Reverting or re-applying operations restores objects to their historical states via Command Engine orchestration.
- **Registry Sync**: The Command Engine updates IDs, properties, and parent-child links in the registry to match the target state.

---

# 69. Mutation Execution Ordering

During transaction mutations, the Object Engine performs updates in the following strict internal sequence:
1. **Validation**: Check properties against constraints and schemas.
2. **Registry Update**: Commit validated changes to raw memory structures.
3. **Secondary Index Update**: Rebuild internal lookup indexes (e.g., Layer Index, Port/Pin identity index).
4. **Result Return**: Return the validated successful result to the Command Engine (which then triggers History recording and Event Bus publication).

---

# 70. Geometry Invalidation Integration

- The Object Engine does not trigger geometry invalidations directly.
- When the Command Engine publishes committed mutation events, the Geometry Engine intercepts them to invalidate its cached bounding boxes, matrices, and spatial Quadtree index.

---

# 71. Rendering Invalidation Integration

- The Object Engine does not notify the Rendering Engine of invalidations.
- The Rendering Engine reactive listener intercepts committed events from the Event Bus to mark its Render Tree nodes dirty.

---

# 72. Storage Hydration and Lazy Loading

- **Lazy Hydration**: Project loads parse page indexes first, lazy loading details of hidden pages.
- **Query Hydration**: Accessing objects on hidden pages triggers lazy parsing.

---

# 73. Partial Object Hydration States

Objects in memory transition through these hydration states:

- **Unhydrated**: Exists as raw JSON data on disk.
- **Metadata-Only**: Basic properties (ID, name, bounds) are loaded to support index queries.
- **Fully-Hydrated**: Complete properties and styles are loaded in memory.

---

# 74. Concurrent Access Assumptions

- **Mutex Locks**: Operations modifying the registry are protected by transaction locks.
- **Queueing**: Concurrent mutation requests are queued and processed sequentially.

---

# 75. Large-Project Registry Benchmarks

Performance metrics under heavy project loads (10,000 components):

- **Query Latency**: < 0.05 microseconds for ID lookups.
- **Secondary Index Updates**: < 0.2 milliseconds.
- **Memory Consumption**: Registry footprint remains under 10 MB.

---

# 76. Query Latency Targets

The table below outlines target execution budgets for queries:

| Query Type | Target Latency | Condition |
| :--- | :--- | :--- |
| **UUID Lookup** | < 0.01 microseconds | Standard registry hash map lookup |
| **Layer Object Scan** | < 0.10 milliseconds | Retrieval via layer index |
| **Semantic Rating Search** | < 0.50 milliseconds | Scan index tables (e.g., "resistors") |
| **Reference Verification** | < 0.20 milliseconds | Audit port and wire link integrity |

---

# 77. Memory Budgets and Weak-Reference Cleanup

- **Memory Limit**: Object Engine allocations are capped at 16 MB.
- **Weak References**: Event listeners are held as weak references, allowing the garbage collector to reclaim memory from discarded objects.

---

# 78. Resource Exhaustion Protection

- **Object Cap**: The engine limits project pages to 50,000 objects to prevent out-of-memory errors.
- **Group Depth Limit**: Restricts nested groups to 16 levels to prevent stack overflow errors.

---

# 79. Malicious Plugin Object Definitions

- **Schema Checks**: Schema validations enforce value limits on properties to prevent prototype pollution.
- **Quarantine**: Objects containing invalid parameters are blocked from registration.

---

# 80. Failure Scenarios and Recovery Matrix

The table below outlines recovery protocols for common object failures:

| Failure Mode | System Impact | Detection Mechanism | Recovery Procedure |
| :--- | :--- | :--- | :--- |
| **UUID Collision** | Registration fails | Check active registry index | Abort transaction, throw `OE_ERR_ID_COLLISION`. |
| **Circular Reference** | Stack overflow risk | Run DFS check before grouping | Block parent update, throw `OE_ERR_CIRCULAR_LINK`. |
| **Dangling Endpoint Reference** | Visual routing errors | Run reference audits | Convert the affected Endpoint in LogicalConnection to FLOATING through Command Engine orchestration and flag referencing Wires as affected. |
| **Plugin Schema Mismatch** | Custom object corrupts | Verify validation schemas | Load object with generic placeholder and fallback parameters. |

---

# 81. Deterministic Object Ordering

To ensure consistent project saves:

- **Index Sorting**: Objects are serialized sorting by layer `zIndex` and creation time.
- **Git diffs**: Alphabetical property ordering ensures clean Git diff histories.

---

# 82. Complete ASCII Sequence Diagrams

## 82.1. Deep Clone Reference Rewrite Sequence

This diagram shows cloning and updating cloned LogicalConnections and Wires:

```
CommandEngine       ObjectEngine       ObjectRegistry       GeometryEngine
      |                   |                  |                     |
      |-- clone(ids) ---->|                  |                     |
      |                   |-- duplicate() -->|                     |
      |                   |<-- cloned IDs ---|                     |
      |                   |   (Create ID Map)                      |
      |                   |                                        |
      |                   |-- rewriteReferences()                  |
      |                   |   (Map LogicalConnections & Wires)     |
      |                   |                                        |
      |                   |-- registerClones() --->|               |
      |<-- success -------|                                        |
      |                                                            |
      |-- rebuildSpatialIndex() ---------------------------------->|
```
```

## 82.2. Circular Reference Detection and Interception

This diagram shows running DFS checks before grouping objects:

```
CommandEngine       ObjectEngine       HierarchyChecker       ObjectRegistry       EventBus
      |                   |                   |                  |                    |
      |-- setParent() --->|                   |                  |                    |
      |                   |-- runDFS() ------>|                  |                    |
      |                   |   (Check loops)   |                  |                    |
      |                   |<-- loop detected -|                  |                    |
      |                   |                                      |                    |
      |                   |-- rejectUpdate()                     |                    |
      |<-- error (circ) --|                                                           |
```

---

# 83. Complete Object Lifecycle State Diagrams

The detailed state transitions during object mutations:

```
                            [ Ingested ]
                                 |
                                 v
                         [ Schema Check ] ── Fail ──> [ Rejected ]
                                 | Pass
                                 v
                        [ Reference Check ] ── Fail ─> [ Quarantine ]
                                 | Pass
                                 v
                         [ ID Validation ]
                                 |
               +-----------------+-----------------+
               |                                   |
         (Unique ID)                         (Collision ID)
               |                                   |
               v                                   v
        [ Registered ]                      [ Regenerated ID ]
               |                                   |
               +─────────────────┬─────────────────+
                                 |
                                 v
                          [ Active State ]
```

---

# 84. Detailed Examples for Every Major Lifecycle

Below are concrete JSON payload examples representing serialization formats for the core object lifecycle categories:

## 84.1. Object Registration Payload (`core:object-registration`)

Represents a component package ready for validation and registration:

```json
{
  "action": "register",
  "object": {
    "id": "resistor-102",
    "type": "resistor",
    "geometry": {
      "x": 50.0000,
      "y": 80.0000,
      "width": 30.0000,
      "height": 10.0000,
      "rotation": 0.0000
    },
    "style": {
      "fill": "#ffffff",
      "stroke": "#000000",
      "strokeWidth": 1.0000
    },
    "properties": {
      "resistance": "10k",
      "powerRating": "0.25W"
    },
    "ports": [
      { "id": "resistor-102:p1", "x": 0.0000, "y": 5.0000 },
      { "id": "resistor-102:p2", "x": 30.0000, "y": 5.0000 }
    ]
  }
}
```

## 84.2. Object Deep Clone Map Payload (`core:clone-map`)

Represents original-to-cloned mappings for deep clone operations:

```json
{
  "cloneSessionId": "clone-sess-48",
  "idMap": {
    "opamp-1": "opamp-1-clone-882",
    "opamp-1:pin-3": "opamp-1-clone-882:pin-3",
    "logicalConnection-12": "logicalConnection-12-clone-883",
    "wire-12": "wire-12-clone-884"
  },
  "rewrittenReferences": [
    {
      "logicalConnectionId": "logicalConnection-12-clone-883",
      "oldTargetPort": "opamp-1:pin-3",
      "newTargetPort": "opamp-1-clone-882:pin-3"
    }
  ]
}
```

## 84.3. Object Deletion Cascade Registry (`core:deletion-cascade`)

Represents component references earmarked for eviction:

```json
{
  "deletedObjectId": "opamp-1",
  "cascadeEvictions": {
    "ports": ["opamp-1:pin-1", "opamp-1:pin-2", "opamp-1:pin-3"],
    "floatingConnectionIds": ["logicalConnection-12", "logicalConnection-14"],
    "affectedWireIds": ["wire-12", "wire-14"]
  }
}
```

## 84.4. Semantic Query Result Payload (`core:semantic-query`)

Represents components matching semantic metadata search parameters:

```json
{
  "query": {
    "type": "resistor",
    "property": "resistance",
    "value": "10k"
  },
  "matchedObjects": [
    {
      "id": "resistor-102",
      "type": "resistor",
      "pageId": "page-1",
      "layerId": "layer-1"
    }
  ]
}
```
