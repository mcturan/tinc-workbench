# Connection and Wire Engine Specification

**Project:** TINC Workbench
**Version:** 0.1.0-draft

---

# 1. Purpose

The Connection and Wire Engine is the core subsystem responsible for path routing, netlist generation, segment manipulation, and connection topology validation within TINC Workbench. It manages the logical and physical layout of electrical connections, signal buses, and logical links, acting as the routing brains of the application.

---

# 2. Connection Semantics

- **Logical Connections**: A valid connection represents an electrical or logical path linking component terminals.
- **Physical Wires**: Wires translate logical connections into physical layouts on the canvas.
- **Nets**: Groups of connected wires and terminals that share the same electrical node.
- **Busses**: Groupings of multiple logical nets represented visually as a single thick line.

---

# 3. Endpoints

- **Definition**: Endpoints terminate wire segments.
- **Terminations**: Can link to a component Port, an IC Pin, or a floating coordinate (during routing).
- **Binding**: Endpoints store references to target port UUIDs to maintain connection integrity during layout shifts.

---

# 4. Ports

- **Definition**: Terminals on components (e.g. resistor leads) supporting single-wire connections.
- **Coordinates**: Resolved relative to the parent component's transform origin.

---

# 5. Pins

- **Definition**: Package pins on integrated circuits.
- **Logical Signal Mapping**: Links physical canvas pins to logical signals in the component model.

---

# 6. Wires

- **Path Components**: Composed of linear segments connecting endpoints.
- **Net ID**: Wires are assigned a logical `netId` representing their electrical node.

---

# 7. Segments

- **Definition**: Individual linear vector lines forming a wire path.
- **Orientation**: Standard schematic layouts enforce orthogonal segments (horizontal and vertical).

---

# 8. Junctions

- **Junction Dots**: Dynamic dots rendered where three or more wire segments intersect at the same coordinate.
- **Dynamic Recalculation**: Calculated on the fly. If segments are moved and no longer intersect, the junction dot is automatically removed.

---

# 9. Nets

- **Netlists**: Lists of all interconnected ports and pins on a page.
- **Reindexing**: Re-evaluated when connections are added or removed to update net parameters.

---

# 10. Routing

- **Pathfinding**: Computes the coordinates of wire segments between start and end points.
- **Avoidance**: Integrates with the Geometry Engine's spatial Quadtree index to find paths around component bounds.

---

# 11. Manual and Orthogonal Routing

- **Manual Routing**: Users place wire vertices manually.
- **Orthogonal Routing**: Automatically generates 90-degree bends between endpoints using path-finding algorithms (e.g. A* or Lee's algorithm).

---

# 12. Path Editing

- **Orthogonal Dragging**: Dragging a segment shifts it orthogonally, automatically adjusting the lengths of adjacent segments to maintain connection paths.
- **Vertex Add/Remove**: Clicking on a segment adds a vertex; dragging a vertex to align with adjacent segments removes it.

---

# 13. Hit Testing

- **Proximity Checks**: Integrates with the Geometry Engine to verify clicks within the selection tolerance radius of wire segments.

---

# 14. Snapping

- **Snap Targets**: Pointer coordinates snap to ports, pins, or grid lines during wire routing gestures.

---

# 15. Validation

- **Rules**: Enforces electrical and logical design rules:
  - Blocks connection attempts that create short circuits.
  - Generates warnings when connecting output pins together.

---

# 16. Compatibility

- **Signal Checks**: Validates that connected ports share compatible signal types (e.g. blocking digital connections to analog ports).

---

# 17. Reconnecting

- **Reconnection Steps**: Dragging a wire endpoint away from a port disconnects it. Dropping the endpoint onto another port updates the Net ID and component listings.

---

# 18. Splitting

- **Segment Splits**: Dropping a component port onto an existing wire segment splits it into two independent wire segments, maintaining the same Net ID.

---

# 19. Merging

- **Net Merging**: Drawing a wire to connect two independent Nets merges them into a single net. The engine updates the Net IDs of all affected wires.

---

# 20. Deletion

- **Segment Deletion**: Deleting a segment splits the net. The engine re-evaluates the remaining paths, splitting the Net into separate Net IDs if components are no longer connected.

---

# 21. Dangling Connections

- **Dangling Wires**: Wires with floating endpoints (not connected to ports) are flagged as dangling.
- **Design Rule Checks (DRC)**: Generates warnings in the Design Rule Checker during project validation.

---

# 22. Object Movement

- **Wire Stretching**: Dragging a component stretches its connected wires, triggering path recalculation in real-time to maintain connections.

---

# 23. Group Transforms

- **Sub-circuit Translation**: Moving a grouped block of components and wires translates the entire selection, bypassing path-routing recalculations for internal connections.

---

# 24. Selection

- **Selection Target**: Clicking a wire segment selects the segment. Double-clicking the wire selects the entire net.

---

# 25. Rendering

- **Visual Directives**: Passes segment paths, junction dot coordinates, and style settings (e.g., color-coded bus lines) to the Rendering Engine.

---

# 26. Command/History/Event/Geometry/Object/Storage Integration

- **Command Engine**: Edits are committed as transaction commands.
- **History Engine**: Stores netlist changes to support undo/redo.
- **Event Bus**: Publishes net changes (e.g. `core:net.merged`).
- **Geometry Engine**: Computes segment overlaps and intersections.
- **Object Engine**: Stores wires, ports, and pins.
- **Storage Engine**: Serializes wires and port reference links.

---

# 27. Plugin-Defined Connection Semantics

- **Custom Constraints**: Plugins can define routing constraints (e.g., maximum wire lengths, trace impedance parameters).

---

# 28. Performance

- **Target Latency**: Recalculating paths during dragging must complete in under 2ms per frame.

---

# 29. Memory

- **Buffer Pooling**: Pre-allocates coordinate buffers to minimize memory allocations during A* path finding.

---

# 30. Failure Recovery

- **Fallback Paths**: If path-finding calculations timeout or loop, the engine falls back to straight point-to-point connections, alerting the user.

---

# 31. Security

- **Input Sanitization**: Connection parameters are sanitized before processing to prevent coordinate overflows.

---

# 32. APIs (Public and Internal)

The public API exposed by the Connection and Wire Engine:

- **routeWire(startPort, endPort, mode)**: Computes a wire path between target ports.
- **splitNet(netId, segmentId)**: Splits a net into separate Net IDs.
- **mergeNets(netId1, netId2)**: Merges two nets into a single net.
- **recalculateJunctions(pageId)**: Audits segment intersections to update junction dot listings.

---

# 33. Testing

- Path finding checks, net merge verifications, cascade deletions, split tests.

---

# 34. ASCII Sequence Diagrams

## 34.1. Wire Split Sequence

The diagram below details splitting a wire segment by dropping a component port:

```
CommandEngine     ConnectionEngine     ObjectEngine       WiresRegistry      EventBus
      |                  |                  |                  |                 |
      |-- dropPort(P) -->|                  |                  |                 |
      |                  |-- checkIntersect()                  |                 |
      |                  |   (Find segment S)                  |                 |
      |                  |                                     |                 |
      |                  |-- splitSegment(S) ----------------->|                 |
      |                  |   (Create S1, S2)                   |                 |
      |                  |                                     |                 |
      |                  |-- registerConnections() ------------>|                 |
      |                  |-- recalculateNets()                 |                 |
      |                  |-- publish(NetSplit) --------------------------------->|
      |<-- success ------|                                                       |
```

## 34.2. Component Move Stretch Sequence

This diagram shows updating wire paths during component drag gestures:

```
ToolSystem        GeometryEngine     ConnectionEngine      ObjectEngine     RenderingEngine
    |                   |                   |                   |                  |
    |-- dragComponent ->|                   |                   |                  |
    |                   |-- updateBounds()  |                   |                  |
    |                   |                   |-- queryWires() -->|                  |
    |                   |                   |<-- connected -----|                  |
    |                   |                                                          |
    |                   |-- recalculatePaths()                                     |
    |                   |   (Stretch orthogonal paths)                             |
    |                   |                                                          |
    |                   |-- updateWirePreviews() --------------------------------->|
```

---

# 35. State Diagrams

The Wire Routing interaction state machine:

```
                             [ Idle ]
                                |
                                | clickPort()
                                v
                       [ Routing Segments ] <──────────+
                                |                      |
                                | dragMouseMove()      | clickVertex()
                                v                      |
                       [ Routing Segments ] ───────────+
                                |
               +----------------+----------------+
               |                                 |
         clickPort(Target)                  pressEscape()
               |                                 |
               v                                 v
        [ Committing ]                     [ Aborting ]
               |                                 |
               +────────────────┬────────────────+
                                |
                                v
                             [ Idle ]
```

---

# 36. Future Extensions

- **Automated Autorouting**: Click-to-route connections that automatically route wires around components.
- **High-Speed Impedance Routing**: Multi-layer trace routing rules for PCB design workspaces.
- **Real-Time Signal Flow Simulations**: Visual indicators showing voltage levels or signal propagation on active wires.

---

# 37. Engine Ownership and Runtime Boundaries

The Connection and Wire Engine acts as the central coordinator for all electrical and logical connection topologies, physical route geometries, and netlists.
- **Workspace Boundary**: The engine operates strictly within the context of a single active Page at a time, keeping separate state engines, path caches, and spatial indexes for each Page to avoid cross-page state leakage.
- **Ownership of Routing Models**: While visual wire representation coordinates and connection links are stored in the Object Engine (described in the [Object Engine Specification](object-engine.md)), the Connection and Wire Engine uniquely owns the active routing graph, pathfinding cache, net connectivity map, and dynamic obstacle map.
- **Mutations and Registry Integration**: No other component or engine may modify connection coordinates directly. Any mutation (e.g., segment dragging, port moving) must be requested via the Command Engine (as defined in the [Command Engine Specification](command-engine.md)), which calls Connection Engine APIs to calculate new geometries, validate netlists, and commit changes back to the Object Engine registry.
- **Access Policies**: All external requests to read paths or netlists query the Connection Engine’s cached records, ensuring $O(1)$ read access.

---

# 38. Connection Lifecycle State Model

Every connection, wire, and net transitions through a unified state model.
- **DRAFT_PREVIEW**: The transient state during routing. Geometries are computed at 60 FPS in response to mouse movements and snapping targets, bypassing the Object Engine registry and History Engine.
- **COMMITTED**: The persistent state. The wire has a stable ID, is registered in the Object Engine, is saved to disk, and is recorded on the history stack.
- **STRETCHED**: An active intermediate state during a dragging gesture (e.g., component movement). The wire paths are dynamically rubber-banded and recalculated in real-time.
- **DANGLING**: A state where a wire has at least one endpoint not connected to any component Port or Pin. This is structurally valid in the Object Model but flagged as a warning in the Design Rule Checker (DRC).
- **SWAPPED / RECONNECTED**: A state representing endpoint re-binding to a new target Port or Pin, triggering netlist updates.
- **EVICTED**: The terminal state. The wire is removed from the registry, its indexes are cleared, and any remaining net segments are evaluated for partitioning.

---

# 39. Endpoint Identity and Reference Guarantees

Endpoints represent the exact termination points of a physical wire segment or logical connection.
- **Endpoint Identity**: Every endpoint must be initialized with a stable, immutable UUIDv4.
- **Termination Types**:
  - `PORT_TERMINATION`: Explicitly bound to a port ID or pin ID of a Component.
  - `JUNCTION_TERMINATION`: Bound to an intersection coordinate of another wire segment in the same Net.
  - `FLOATING_TERMINATION`: Unbound, terminating at an arbitrary World coordinate (dangling endpoint).
- **Reference Guarantees**: An endpoint defined with `PORT_TERMINATION` holds a strict, non-nullable reference to the target Port ID. If the parent Component is moved, scaled, or rotated, the Connection Engine resolves the port’s absolute World coordinates relative to the component's transform origin (using Geometry Engine affine transformations) and automatically updates the segment's starting/ending coordinate.

---

# 40. Port and Pin Resolution Lifecycle

The resolution lifecycle of ports and pins converts local component geometry into absolute World Space coordinates for the routing graph:
1. **Trigger**: Component transform changes, or route recalculation is initiated.
2. **Retrieve Component**: Query the Object Engine to retrieve the parent component and its current transform matrix.
3. **Local coordinate Lookup**: Query the component's definition schema for the local coordinate of the port (e.g., `(x: 0, y: 10)` relative to the component origin).
4. **Transform Application**: Call `worldToScreen` or affine multiplication from the [Geometry Engine Specification](geometry-engine.md) to apply the component's translation, rotation, and scaling matrices.
5. **Caching**: Store the absolute coordinate in the Connection Engine’s endpoint resolution table.
6. **Logical Mapping**: Map physical pin IDs to logical signals (e.g., Pin 5 maps to signal `SPI_MISO` on an IC package) to prepare for signal compatibility audits.

---

# 41. Connection Creation Transaction Boundaries

All wire and connection creation actions must operate within transactional boundaries managed by the Command Engine.
- **Transaction Block**: Drawing a wire from a starting port to a target port initiates a transaction.
- **Atomicity**: The transaction wraps:
  1. Creating the wire object.
  2. Resolving endpoints and generating unique IDs.
  3. Routing path segments.
  4. Merging or updating netlist structures.
  5. Running Design Rule Checks (DRC) for signal compatibility.
- **Rollback Guarantee**: If any validation fails (e.g., attempt to connect incompatibly typed signals under strict enforcement mode, or pathfinding timeouts), the entire transaction aborts. The Object Engine registry rolls back to its last checkpoint, and no orphan wire segments or broken net states are saved.

---

# 42. Wire Creation Gesture Lifecycle

The user-interaction gesture sequence for creating a wire is handled cooperatively by the Tool System and the Connection Engine:
1. **Hover & Highlight**: The user hovers over a component port. The Tool System queries the Connection Engine for compatibility, highlighting the port if a connection is valid.
2. **Start Click**: User clicks the port. The Connection Engine instantiates a draft session, setting the start endpoint to `PORT_TERMINATION`.
3. **Dynamic Routing (Preview)**: As the cursor moves, the engine runs A* routing at 60 FPS from the start port to the cursor coordinate (using `FLOATING_TERMINATION`). It renders the path as a preview.
4. **Vertex Locking (Intermediate Click)**: User clicks on the canvas to lock an intermediate bend. The coordinate is committed as a fixed vertex in the draft session, and path routing resumes from this vertex to the cursor.
5. **Target Commit Click**: User clicks on a valid target port. The draft session closes, a `CreateWireCommand` is dispatched to the Command Engine, and the wire is committed.
6. **Abortion**: Pressing `Escape` or clicking away from valid targets destroys the draft session, clearing the preview canvas.

---

# 43. Preview Wire versus Committed Wire

- **Preview Wires**:
  - Ephemeral, stored only in transient memory during drawing or dragging gestures.
  - Bypasses the Object Engine registry, History Engine, and undo/redo stacks.
  - Pathfinding uses a relaxed, high-speed A* configuration to maintain interactive frames.
  - Managed visually as a temporary canvas layer.
- **Committed Wires**:
  - Fully instantiated objects inside the Object Engine.
  - Serialized to project files (see [Project File Format Specification](project-file-format.md)).
  - Tracked in History Engine undo/redo stacks.
  - Subject to strict validation checks (compatibility, collision, netlist audits).

---

# 44. Segment and Vertex Identity Rules

A physical wire is stored as an ordered list of coordinate vertices $V_0, V_1, \dots, V_n$ and segments $S_0, S_1, \dots, S_{n-1}$.
- **Vertex Schema**: Vertices are stored as a flat array of $(x, y)$ coordinate pairs in the wire object. They do not possess independent UUIDs.
- **Segment Reference**: A segment $S_i$ is implicitly defined by the line segment linking $V_i$ to $V_{i+1}$.
- **Dragging Vertices**: When editing, individual vertices can be dragged. If a vertex is dragged collinear to its adjacent segments, the segments are automatically merged.
- **Segment IDs**: For hit-testing and selection tracking, segments are assigned an ephemeral index ID (e.g., `wire_id:segment_index`).

---

# 45. Junction Lifecycle and Ownership

Junctions represent physical connections between intersecting wires sharing the same electrical net.
- **Junction Dots**: Rendered as a solid dot at coordinate $P$ where 3 or more wire segments intersect.
- **Junction Endpoint**: When a user draws a wire terminating on an existing wire segment, a junction is formed. A `JUNCTION_TERMINATION` endpoint is created, referencing the target wire ID and the coordinate along the segment.
- **Dynamic Lifetime**: Junctions are calculated dynamically by the Connection Engine. If segments are edited such that they no longer intersect, the junction is automatically destroyed, and the wire endpoints are updated.
- **No Standalone Registry**: Junctions are not registered as standalone entities in the Object Engine; they are dynamic geometry properties computed relative to segment endpoints.

---

# 46. Net Identity and Net Lifecycle

A Net (logical node) represents the union of all interconnected wire segments, component ports, and pins.
- **Net ID**: Every net must be assigned a unique `netId` (UUIDv4).
- **Creation**: Instantiated when the first wire connecting two ports is committed.
- **Propagation**: Every segment of every wire within the net, as well as the connected ports, holds a reference to the active `netId`.
- **Termination**: A Net is destroyed and its ID evicted when the final wire segment connecting its terminals is deleted.

---

# 47. Net Merge Rules

When a new connection is drawn linking Net A (with $netId_A$) and Net B (with $netId_B$):
- **Dominance Evaluation**: The engine selects the dominant Net ID to preserve.
  - Special nets (e.g. `GND`, `VCC`, `+5V`) always dominate.
  - If neither is a special net, the net with the larger number of connected ports dominates.
  - If equal, the lexicographically smaller UUIDv4 is selected.
- **ID Update**: All wires, segments, and ports previously belonging to the subordinate net are updated to the dominant Net ID.
- **History Tracking**: The merge transaction records the old Net ID and the list of affected elements to support undo restoration.
- **Event Bus Dispatch**: Emits `core:net.merged` containing `{ mergedInto: dominantNetId, obsoleteNetId: subordinateNetId }`.

---

# 48. Net Split and Partition Detection

When a wire segment or connection is deleted, or a component is moved breaking physical contact:
- **Connectivity Graph**: The engine models the net as an undirected graph, where ports/junctions are nodes and wire segments are edges.
- **Partition Query**: Runs a Breadth-First Search (BFS) or Depth-First Search (DFS) starting from an arbitrary node to find all reachable ports and segments.
- **Split Execution**:
  - If the search reaches all original nodes, the net remains intact.
  - If a partition is detected (some nodes are unreachable), the engine splits the net.
  - The partition containing the dominant name/GND keeps the original `netId`.
  - The disconnected partition is allocated a new `netId`.
- **Event Bus Dispatch**: Emits `core:net.split` containing `{ originalNetId: netId, newNetId: newNetId, partitionedIds: [...] }`.

---

# 49. Endpoint Compatibility Resolution

Before a connection is committed, the Connection and Wire Engine checks the compatibility of target endpoints:
- **Query Ports**: Query the Object Engine to retrieve the signal categories (analog, digital, high-speed, power, ground) of the target ports.
- **Resolution Matrix**:
  - `Digital` to `Digital`: Allowed.
  - `Analog` to `Analog`: Allowed.
  - `Power` to `Power`: Allowed only if the voltage levels match (otherwise generates a short-circuit warning).
  - `Digital` to `Analog`: Blocked or generates a DRC warning depending on user settings.
- **Error Propagation**: Throws `CONN_ERR_INCOMPATIBLE_SIGNALS` if a conflict is found under strict mode.

---

# 50. Electrical versus Logical Connection Semantics

- **Electrical Connections**:
  - Physical wire representations on the canvas.
  - Require pathfinding, segments, and coordinate vertices.
  - Checked for geometry obstacles, overlaps, and crossing intersections.
- **Logical Connections**:
  - Logical links between component terminals without physical wire paths.
  - Created by placing Net Labels (e.g. labeling two disconnected ports as `CLK`).
  - Do not calculate paths or require obstacle avoidance.
  - The Connection Engine indexes these labels, merging the ports into a shared logical Net ID.

---

# 51. Direction and Signal Compatibility

- **Direction Rules**: The engine inspects port metadata direction attributes (`input`, `output`, `bidirectional`, `passive`, `tri-state`).
- **Signal Matching**:
  - `Output` to `Input`: Valid.
  - `Output` to `Output`: Blocked or generates warning (except for open-collector or tri-state buses).
  - `Input` to `Input`: Valid, but generates a dangling warning if no driver (Output) is present on the net.
- **Design Rule Checks (DRC)**: The engine exposes a verification API queried by the DRC system to identify illegal signal configurations.

---

# 52. Fan-in and Fan-out Constraints

- **Fan-out Checks**: Compares the driver capacity of output pins against the cumulative capacitive load or standard load units of all connected input pins on the net.
- **Fan-in Checks**: Ensures input pins are not driven by multiple conflicting drivers.
- **Limits**: Values are defined in component datasheets (see [Object Model Specification](object-model.md)). Exceeding limits triggers warning notifications.

---

# 53. Manual Routing Lifecycle

- **Instantiation**: Triggered when the routing tool is set to `Manual` mode.
- **Vertex Placement**: The user places every vertex coordinate explicitly.
- **Constraints**: No automatic obstacle avoidance or route calculation is performed.
- **Modification**: Manual paths are stable; they do not recalculate or stretch dynamically, except for the segments directly connected to a moving component port (which stretches to preserve physical contact).

---

# 54. Orthogonal Routing Constraints

Orthogonal routing is the default layout paradigm for schematic diagrams:
- **90-Degree Segments**: Every segment must be perfectly horizontal or vertical (angles must be multiples of 90 degrees relative to World Space axes).
- **Minimum Segment Length**: Enforces a minimum segment length (typically $5.0$ World units) to prevent micro-jogs and visual clutter.
- **Bend Minimization**: The routing solver prioritizes paths with the fewest number of bends.
- **Alignment Rules**: Align segments to grid lines, using the Snapping module to resolve coordinates.

---

# 55. A-star Routing Graph Construction

The Connection Engine constructs a dynamic, sparse routing graph for the A* pathfinder:
- **Obstacle Boundaries**: Queries the Geometry Engine's Quadtree index to fetch the bounding boxes (AABBs) of all components on the active page.
- **Routing Channels**: Bounding boxes are padded by a clearance offset ($W_{clearance}$) to create obstacle regions.
- **Grid Generation**: Generates horizontal and vertical grid lines passing through:
  - All component ports.
  - Bounding box boundary corners (offset by clearance).
  - Existing wire segment channels.
- **Graph Nodes**: The intersections of these grid lines form the nodes of the routing graph, drastically reducing search space compared to pixel-based grids.

```
       Port A ───■───────────────────────────────┐
                 │  Routing Grid Line            │
                 │                               ▼  Obstacle Bounds
                 │                         ┌───────────┐
                 │                         │ Component │
                 │  Clearance Channel      │  Obstacle │
                 └────────────────────────>│           │
                                           └───────────┘
```

---

# 56. Routing Cost Model

The pathfinder calculates the optimal path by minimizing the cumulative cost function for nodes in the graph:
$$\text{Cost}(n) = g(n) + h(n)$$
Where:
- $g(n)$ is the exact cost to reach node $n$ from the start.
- $h(n)$ is the heuristic cost to reach the target port (Manhattan distance: $|x_n - x_{target}| + |y_n - y_{target}|$).

The step cost between adjacent nodes $a$ and $b$ is defined as:
$$\text{StepCost}(a, b) = d(a, b) + W_{bend} \cdot \text{BendPenalty} + W_{obstacle} \cdot \text{ObstaclePenalty} + W_{share} \cdot \text{SharingIncentive}$$
Where:
- $d(a, b)$ is the Euclidean distance.
- $\text{BendPenalty} = 1$ if travelling from $a$ to $b$ introduces a 90-degree change of direction relative to the incoming segment; $0$ otherwise.
- $\text{ObstaclePenalty}$ is a high cost applied if the segment intersects obstacle clearance zones.
- $\text{SharingIncentive}$ is a negative cost (incentive) applied if the segment runs collinear and overlapping with an existing segment of the same Net, encouraging segment sharing and clean trunks.

---

# 57. Routing Obstacle Invalidation

- **Obstacle Registry**: The Connection Engine maintains a flat 2D obstacle map synchronized with component bounds.
- **Invalidation Triggers**: When a component is moved, scaled, rotated, or registered, its bounding box changes.
- **Processing**:
  1. Calculate the union of the old component bounds and new bounds (plus clearance padding).
  2. Query the Quadtree index for any wire segments intersecting this union.
  3. Mark all intersecting wire segments as "dirty".
  4. Schedule dirty segments for background route recalculation.

---

# 58. Route Recalculation and Stability

- **Background Worker**: Recalculations are offloaded to a background Web Worker (using the Thread Model defined in the [Geometry Engine Specification](geometry-engine.md)).
- **Incremental Recalculation**: Only "dirty" segments are recalculated. Unchanged nets are locked in place.
- **Path Stability**: If the recalculated path cost is within $10\%$ of the existing path cost, the existing path is preserved. This prevents minor movements from causing major rerouting shifts across the schematic.

---

# 59. Route Hysteresis and Visual Jitter Protection

To prevent wire paths from flickering or shifting rapidly (jittering) during active drag gestures:
- **Move Threshold**: Updates are ignored if the coordinate change of the dragged component is less than the jitter threshold ($0.5$ Screen pixels).
- **Hysteresis Buffer**: When pathfinding returns multiple routes of identical cost, the solver defaults to the current visual layout path.
- **Direction Lock**: Dragging a segment locks the drag direction (horizontal or vertical) once the mouse moves beyond a 3-pixel threshold, preventing diagonal coordinate drift.

---

# 60. Object Movement and Wire Stretching

When a component is moved, the Connection Engine dynamically stretches its connected wires:
- **Endpoint Tracking**: The endpoints bound to the component's ports move.
- **Rubber-Banding**: The first and last segments of the wire stretch to maintain connection.
- **Orthogonal Correction**: If stretching violates orthogonal constraints (e.g. creating diagonal segments), the engine inserts or shifts adjacent segments to maintain 90-degree alignment.
- **Visual Feedback**: During active dragging, these calculations run in preview mode. The final path is committed when the mouse button is released.

---

# 61. Group Movement and Connection Boundaries

When multiple objects (components and wires) are moved as a group:
- **Internal Connections**: Wires whose start and end endpoints are both bound to components within the moving group are translated by the movement vector without running path recalculations.
- **Boundary-Crossing Connections**: Wires that connect a component inside the group to a component outside the group are marked as boundary-crossing.
- **Stretching**: The external endpoints remain fixed, while the internal endpoints translate, triggering orthogonal stretching and path recalculation for the crossing segments only.

---

# 62. Connection Crossing versus Junction Semantics

- **Junction**: Intersecting wire segments belonging to the same Net ID. Rendered with a solid junction dot (radius specified in rendering properties).
- **Crossing**: Intersecting wire segments belonging to different Net IDs.
- **Crossing Representation**: Crossings are rendered as simple line overlaps without a dot, maintaining logical separation. The engine queries the Geometry Engine to find all crossing points on the active page to optimize hit-testing and select-overlap routines.

---

# 63. Collinear Segment Merging

To prevent wire paths from building up redundant coordinates during layout changes:
- **Scan**: The engine sweeps wire coordinates after path mutations.
- **Merging Rule**: For any three consecutive vertices $V_i$, $V_{i+1}$, $V_{i+2}$, if the vectors $(V_{i+1} - V_i)$ and $(V_{i+2} - V_{i+1})$ are collinear (i.e. their cross product is within Epsilon $10^{-6}$), the vertex $V_{i+1}$ is deleted.
- **Result**: The two adjacent segments are replaced by a single, continuous segment from $V_i$ to $V_{i+2}$.

---

# 64. Zero-Length and Degenerate Segment Handling

- **Degenerate Segments**: Segments where the start vertex and end vertex share the same coordinate (length $< 10^{-4}$ World units).
- **Trimming Rule**: During coordinate updates, if a segment is compressed to zero length, the segment is discarded.
- **Vertex Collapse**: The redundant vertices are collapsed into a single vertex, and adjacent segments are re-linked directly. This prevents routing loops and coordinate serialization bloat.

---

# 65. Wire Hit-Testing Integration

- **Click Proximity**: When the user clicks the canvas, the Selection Engine queries the Connection Engine for hit-testing.
- **Distance Calculation**: The engine calls the Geometry Engine’s `pointToSegmentDistance` API for all segments.
- **Tolerance**: A segment is hit if the Euclidean distance from the click coordinate to the segment line is within the selection tolerance (default: $5.0$ Screen pixels).
- **Z-Order Resolution**: If multiple wires overlap, selection priority is resolved by z-index.

---

# 66. Connection Selection Integration

Integrating with the [Selection Engine Specification](selection-engine.md):
- **Single Segment Selection**: Click on a wire segment selects only that specific segment. The Selection Engine stores the selection target as `wire_id:segment_index`. The inspector displays properties for that segment.
- **Net Selection**: Double-clicking a segment selects the entire logical net. All segments and ports sharing the `netId` are added to the active selection set, highlighted on the canvas, and loaded into the Inspector.
- **Selection Event**: Publishes `ui:selection.changed` with wire details.

---

# 67. Snap Integration and Endpoint Ranking

During wire drawing and editing, cursor coordinates are aligned to nearby targets:
- **Snap Evaluation**: The engine queries targets within a local radius ($10.0$ Screen pixels).
- **Ranking Priority**: Snap targets are ranked in descending order:
  1. **Component Ports / Pins**: Absolute priority to ensure connection.
  2. **Junction Points**: Snapping to existing wire intersections.
  3. **Collinear Alignments**: Snapping to align with existing parallel wire trunks.
  4. **Canvas Grid**: Standard snapping increments.
- **Visual Guides**: Displays snapping indicator lines (e.g. dashed red lines) when aligning with ports.

---

# 68. Connection Deletion and Cascade Boundaries

- **Deletion Command**: Deleting a wire segment or entire net is processed via a `DeleteConnectionCommand`.
- **Cascade Deletion**:
  - Deleting a Component triggers cascade deletion of all its ports.
  - Deleting a Port triggers deletion of all connected wire endpoints.
  - Wires connected to these endpoints are either truncated (reverting to dangling status) or deleted entirely if no connected path segments remain.
- **Reindexing**: After deletions, a net split check is run, and the netlist is rebuilt.

---

# 69. Dangling Endpoint Lifecycle

A dangling endpoint has no binding to a port or junction.
- **Permissibility**: Supported by the Object Model to allow incomplete routing layouts.
- **Visual Indicator**: Rendered with an open square or distinct warning color (configured in styles).
- **DRC Rules**: The Design Rule Checker flags all dangling wires, generating warnings before project export or netlist compilation.
- **Interaction**: Users can select, drag, and snap dangling endpoints to ports to commit and resolve them.

---

# 70. Reconnection and Endpoint Swapping

- **Action**: Dragging an active endpoint from Port A and dropping it onto Port B.
- **Execution steps**:
  1. Disconnect the endpoint from Port A.
  2. Perform a net partition sweep on Port A's old net (Net A). Split the net if disconnected.
  3. Attach the endpoint to Port B.
  4. Merge the wire and its segments into Port B's net (Net B).
  5. Run pathfinding to adjust the segment geometries to Port B's coordinate.
  6. Commit transaction and publish updates.

---

# 71. Undo and Redo Restoration Behavior

To guarantee perfect visual and topological restoration:
- **Path Storage**: Commands record the exact list of vertex coordinates, Net IDs, and endpoint port bindings at execution time.
- **Execution Bypass**: Reverting (undo) or re-applying (redo) operations restores these coordinates directly.
- **No Pathfinder Invocations**: Pathfinding algorithms are bypassed during undo/redo. This ensures that even if obstacle layouts or plugin rules have changed since the command was recorded, the visual routing is restored exactly as it was drawn.

---

# 72. Storage Hydration and Unknown Plugin Connections

- **Hydration**: On file load, the Storage Engine reads connection tables and wire coordinate lists.
- **Incremental Registration**: Wires are registered in the Object Engine, and Net IDs are indexed.
- **Unknown Plugin Connections**: If a wire contains custom properties defined by a plugin that is not currently loaded:
  - The Storage Engine preserves the custom attributes in the private `_unknownFields` dictionary.
  - The Connection Engine routes the wire using fallback standard orthogonal routing.
  - On project save, the custom plugin properties are written back to the file intact.

---

# 73. Plugin-Defined Connection Semantics

Plugins can extend connection and routing behavior through the Plugin SDK:
- **Custom Constraints**: Define custom rules, such as maximum wire length, impedance limits, or differential routing offsets.
- **Validation Hooks**: Plugins register callbacks executed during command validation.
- **Routing Hooks**: Plugins can supply custom cost calculators for the A* pathfinder (e.g. adding costs near high-temperature components).

---

# 74. Plugin Unload with Live Connections

If a plugin is unloaded while its custom connections are active:
- **Preservation**: The connection objects remain active in the Object Engine registry.
- **Fallback**: The Connection Engine strips the custom validation and cost calculators, reverting the wires to standard orthogonal connections.
- **Visuals**: The Rendering Engine replaces custom visual overlays with standard wire styles.

---

# 75. Large Schematic Routing Benchmarks

To maintain interactive responsiveness in complex engineering schematics, the routing system must meet these benchmarks:
- **Single Path Recalculation**: $< 2.0\text{ ms}$ for paths up to 10 bends.
- **Component Translation (10 Wires)**: $< 5.0\text{ ms}$ per frame during drag gestures.
- **Global Page Reroute (1,000 Nets)**: $< 250\text{ ms}$ total execution time in background workers.
- **DRC Sweep (5,000 Nodes)**: $< 100\text{ ms}$.

---

# 76. Dense Net Performance Targets

To handle dense layouts (e.g. 64-bit memory buses):
- **Search Space Limiting**: The pathfinder restricts A* search to a bounding box enclosing the start and end points, padded by a $100$-unit margin.
- **Thread Isolation**: All pathfinder calculations run on Web Workers. The main thread only processes visual preview paths.
- **Path Sharing**: Parallel lines in a bus are routed as a single offset bundle, skipping individual search steps.

---

# 77. Memory Budgets and Route Cache Eviction

- **Memory Allocation**: The Connection Engine's path cache, obstacle registry, and routing graphs are capped at $8.0\text{ MB}$.
- **Eviction Policy**: Employs a Least Recently Used (LRU) cache eviction model for calculated path coordinates.
- **GC Management**: Pre-allocates and reuses node coordinate pools to avoid memory allocation spikes and garbage collection pauses during dragging.

---

# 78. Malicious Plugin Connection Definitions

To protect the system from malicious or buggy plugin code:
- **Recursion Limits**: Callbacks registered by plugins are wrapped in execution limits (max stack depth $16$).
- **Complexity Limits**: Restricts the maximum number of vertices per wire to $500$ to prevent stack overflows and memory exhaustion.
- **Execution Timeout**: External plugin validation hooks are terminated if they exceed a $10\text{ ms}$ window.

---

# 79. Resource Exhaustion Protection

- **Timeout**: The A* pathfinder has a hard limit of $50\text{ ms}$ per search query.
- **Fallback**: If the pathfinder times out, it aborts the search, falls back to a straight point-to-point line, logs a warning, and flags the wire with a routing error icon on the canvas.
- **Limit Caps**: The engine rejects routing requests if the active page contains more than $10,000$ active wire segments.

---

# 80. Failure Scenarios and Recovery Matrix

The table below lists recovery protocols for common Connection and Wire Engine failures:

| Failure Mode | System Impact | Detection Mechanism | Recovery Procedure |
| :--- | :--- | :--- | :--- |
| **Pathfinding Timeout** | UI freeze risk | Execution timer exceeds 50ms | Abort search, fall back to straight line, raise warning. |
| **Duplicate Net ID** | Shorts in netlist | Integrity check on registration | Re-generate unique Net ID, run partition check to heal. |
| **Incompatible Signals** | Electrical damage | Signal compatibility audit | Block commit in strict mode; flag DRC warning in relaxed mode. |
| **Dangling Reference** | Orphan wire segment | Orphan audit on registry updates | Remove invalid endpoint port reference, convert to floating. |
| **Zero-Length Segment** | Routing loop/crash | Degenerate check after move | Discard segment, collapse vertices, merge adjacent nodes. |

---

# 81. Deterministic Routing Requirements

To support collaboration and reproducible layouts:
- **No Random Seeds**: The A* pathfinder must be completely deterministic.
- **Sorted Neighbors**: When exploring graph nodes, adjacent nodes must be sorted by absolute coordinate values before evaluation, ensuring identical execution paths regardless of platform architecture.
- **Coordinate Precision**: All coordinates are snapped to a $10^{-4}$ grid during processing.

---

# 82. Complete ASCII Sequence Diagrams

## 82.1. Wire Drawing Gesture Sequence

This diagram details the lifecycle of interactive wire drawing:

```
ToolSystem       ConnectionEngine      GeometryEngine      ObjectEngine      RenderingEngine
    |                   |                     |                 |                   |
    |-- startClick(P) ->|                     |                 |                   |
    |                   |-- createDraft(P) -->|                 |                   |
    |                   |                     |                 |                   |
    |-- mouseMove(C) -->|                     |                 |                   |
    |                   |-- snapPoint(C) ---->|                 |                   |
    |                   |<-- snapped C -------|                 |                   |
    |                   |-- routePreview() --->|                 |                   |
    |                   |   (A* algorithm)    |                 |                   |
    |                   |-- renderPreview() --------------------------------------->|
    |                   |                     |                 |                   |
    |-- commitClick(T) -|                     |                 |                   |
    |                   |-- createWire() ──────────────────────>|                   |
    |                   |-- updateNets() ──────────────────────>|                   |
    |                   |-- publishCommit() ------------------->|                   |
    |                   |                                       |-- invalidate() -->|
```

## 82.2. Net Merging Sequence

This diagram details merging two logical nets upon connection:

```
CommandEngine      ConnectionEngine     ObjectEngine       EventBus       RenderingEngine
      |                   |                  |                 |                 |
      |-- executeMerge ->|                  |                 |                 |
      |                  |-- checkDominant()|                 |                 |
      |                  |   (Select Net A) |                 |                 |
      |                  |                  |                 |                 |
      |                  |-- updateIds() -->|                 |                 |
      |                  |   (Set Net B->A) |                 |                 |
      |                  |                  |                 |                 |
      |                  |-- rebuildList() >|                 |                 |
      |                  |-- publish() ───────────────────────>|                 |
      |                  |                                     |-- invalidate() >|
      |<-- success ------|                                                       |
```

## 82.3. Reconnection Swap Sequence

This diagram shows the sequence when swapping wire endpoints:

```
ToolSystem       ConnectionEngine      ObjectEngine       GeometryEngine       EventBus
    |                   |                   |                  |                   |
    |-- dragEndpoint ->|                   |                  |                   |
    |                   |-- checkHover() -->|                  |                   |
    |                   |                   |-- getPortCoords -|                   |
    |                   |                   |<-- coords -------|                   |
    |                   |                                                          |
    |-- dropOnPort(P2) -|                                                          |
    |                   |-- disconnect(P1) ->|                                     |
    |                   |-- connect(P2) ---->|                                     |
    |                   |-- runBFS()         |                                     |
    |                   |   (Split/Merge)    |                                     |
    |                   |-- updatePaths() ────────────────────>|                   |
    |                   |-- publish() ────────────────────────────────────────────>|
```

---

# 83. Complete Connection State Diagrams

## 83.1. Drawing Gesture State Machine

Detailed state transitions during interactive wire layout:

```
                            [ Idle ]
                               │
                               │ startClick(Port)
                               ▼
                       [ Instantiated ]
                               │
                               ├──────────────────────┐
                               │ mouseMove()          │ clickVertex()
                               ▼                      ▼
                       [ Previewing Path ] ───> [ Vertex Locked ]
                               │                      │
                               │                      │ mouseMove()
                               │                      ▼
                               │               [ Previewing Path ]
                               │                      │
                   ┌───────────┴───────────┐          │
                   │                       │          │
            dropOnPort(Target)        pressEscape()   │
                   │                       │          │
                   ▼                       ▼          │
             [ Validating ]           [ Cancelled ]   │
                   │                       │          │
            Pass   ├─────────┐             ├──────────┼──────────┐
            ┌──────┘         │ Fail        │          │          │
            ▼                ▼             ▼          ▼          ▼
      [ Committing ]   [ Aborted ]     [ Cleared ] [ Cleared ] [ Cleared ]
            │                │             │          │          │
            └────────────────┴─────────────┴──────────┴──────────┘
                               │
                               ▼
                            [ Idle ]
```

## 83.2. Net Lifecycle State Machine

Detailed state transitions of logical nets:

```
                            [ Non-Existent ]
                                   │
                                   │ createWire()
                                   ▼
                            [ Net Created ]
                                   │
                 ┌─────────────────┼─────────────────┐
                 │ mergeWires()    │ deleteSegment() │ moveComponent()
                 ▼                 ▼                 ▼
          [ Net Merged ]     [ Net Split ]    [ Net Stretched ]
                 │                 │                 │
                 │ updateIDs()     │ runBFS()        │ reroute()
                 ▼                 ▼                 ▼
          [ Net Committed ]  [ Nets Split ]   [ Net Committed ]
                 │                 │                 │
                 └─────────────────┼─────────────────┘
                                   │
                                   │ deleteAllWires()
                                   ▼
                            [ Non-Existent ]
```

---

# 84. Detailed Examples for Every Major Connection Lifecycle

## 84.1. Wire Drawing Draft Session Payload (`core:draft-routing-session`)

Visualizes a routing session in progress, prior to transaction commit:

```json
{
  "sessionId": "draft-sess-921",
  "state": "Previewing Path",
  "startPort": "resistor-102:p2",
  "startCoordinate": { "x": 80.0000, "y": 85.0000 },
  "currentCursor": { "x": 145.0000, "y": 120.0000 },
  "lockedVertices": [
    { "x": 80.0000, "y": 85.0000 },
    { "x": 120.0000, "y": 85.0000 }
  ],
  "previewSegments": [
    { "start": { "x": 80.0000, "y": 85.0000 }, "end": { "x": 120.0000, "y": 85.0000 } },
    { "start": { "x": 120.0000, "y": 85.0000 }, "end": { "x": 120.0000, "y": 120.0000 } },
    { "start": { "x": 120.0000, "y": 120.0000 }, "end": { "x": 145.0000, "y": 120.0000 } }
  ]
}
```

## 84.2. Committed Connection Structure Payload (`core:committed-connection`)

The serialized output of a fully routed, valid wire committed to the Object Engine:

```json
{
  "id": "wire-501",
  "type": "wire",
  "version": 1,
  "netId": "net-8a2b3c4d",
  "endpoints": [
    { "id": "ep-1", "type": "PORT_TERMINATION", "targetId": "resistor-102:p2" },
    { "id": "ep-2", "type": "PORT_TERMINATION", "targetId": "capacitor-204:p1" }
  ],
  "vertices": [
    { "x": 80.0000, "y": 85.0000 },
    { "x": 120.0000, "y": 85.0000 },
    { "x": 120.0000, "y": 120.0000 },
    { "x": 150.0000, "y": 120.0000 }
  ],
  "style": {
    "color": "#00aa00",
    "thickness": 1.5000,
    "lineStyle": "solid"
  },
  "metadata": {
    "impedance": "50ohm",
    "maxCurrent": "1.0A"
  }
}
```

## 84.3. Net Merge Transaction Payload (`core:net-merge-transaction`)

The command payload used by the Command Engine to execute a net merge:

```json
{
  "transactionId": "tx-merge-7719",
  "action": "mergeNets",
  "parameters": {
    "dominantNetId": "net-8a2b3c4d",
    "subordinateNetId": "net-f9e8d7c6",
    "affectedWires": ["wire-501", "wire-803"],
    "affectedPorts": [
      "resistor-102:p2",
      "capacitor-204:p1",
      "ic-301:pin-12"
    ],
    "reverseDelta": {
      "originalNetMap": {
        "wire-803": "net-f9e8d7c6",
        "ic-301:pin-12": "net-f9e8d7c6"
      }
    }
  }
}
```

## 84.4. Dangling Wire DRC Record (`core:dangling-wire-drc`)

The record generated by the Design Rule Checker when routing is left incomplete:

```json
{
  "ruleId": "DRC_WARN_DANGLING_WIRE",
  "severity": "warning",
  "targetId": "wire-909",
  "message": "Wire 'wire-909' has a floating endpoint at coordinate (210.0000, 340.0000).",
  "context": {
    "netId": "net-3f5e7d8a",
    "floatingEndpointId": "ep-909b",
    "coordinate": { "x": 210.0000, "y": 340.0000 }
  }
}
```

## 84.5. Reconnection Delta Payload (`core:reconnection-delta`)

The delta description passed to the Event Bus and History Engine during endpoint re-binding:

```json
{
  "commandId": "cmd-recon-3342",
  "wireId": "wire-501",
  "endpointId": "ep-2",
  "disconnection": {
    "portId": "capacitor-204:p1",
    "originalNetId": "net-8a2b3c4d"
  },
  "connection": {
    "portId": "opamp-302:pin-3",
    "newNetId": "net-8a2b3c4d"
  },
  "geometryDelta": {
    "oldVertices": [
      { "x": 80.0000, "y": 85.0000 },
      { "x": 120.0000, "y": 85.0000 },
      { "x": 120.0000, "y": 120.0000 },
      { "x": 150.0000, "y": 120.0000 }
    ],
    "newVertices": [
      { "x": 80.0000, "y": 85.0000 },
      { "x": 120.0000, "y": 85.0000 },
      { "x": 120.0000, "y": 140.0000 },
      { "x": 165.0000, "y": 140.0000 }
    ]
  }
}
```
