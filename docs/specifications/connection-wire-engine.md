# Connection and Wire Engine Specification

**Project:** TINC Workbench
**Version:** 0.1.0-draft

---

# 1. Purpose

The Connection and Wire Engine is the core subsystem responsible for path routing, netlist generation, segment manipulation, and connection topology validation within TINC Workbench. It manages the logical and physical layout of electrical connections, signal buses, and logical links, acting as the routing brains of the application.

---

# 2. Connection Semantics

- **LogicalConnection**: Represents the logical or netlist relationship (not a physical/visual trace). A `LogicalConnection` exclusively owns source and target `Endpoint` objects.
- **Wire**: Represents the physical segmented routed trace on the canvas. A `Wire` references its semantic relationship using `logicalConnectionId`. Multiple `Wires` may reference a single `LogicalConnection` where valid.
- **Port and Pin**: Structural sub-components of Semantic Objects (components or ICs) representing terminals and pins.
- **Nets**: Groups of connected LogicalConnections and Wires that share the same electrical node.
- **Busses**: Groupings of multiple logical nets represented visually as a single thick line.

---

# 3. Endpoints

- **Exclusive Ownership**: Endpoints are exclusively owned and persisted by `LogicalConnection` objects. `Wire` objects do not own or persist `Endpoint` objects.
- **Discriminated Union**: An `Endpoint` is a discriminated union of types:
  - `PORT`: Requires `targetId` (stable reference to a Port ID) and forbids `coordinate`.
  - `PIN`: Requires `targetId` (stable reference to a Pin ID) and forbids `coordinate`.
  - `FLOATING`: Requires `coordinate` (arbitrary World Space point representing dangling ends) and forbids `targetId`.
- **Wire Reference**: A `Wire` is independent of `Endpoint` identity; it simply references its semantic relationship via `logicalConnectionId` and stores the routed path geometries.

---

# 4. Ports

- **Definition**: Structural sub-components on components (e.g., resistor terminals).
- **Coordinates**: Coordinates are resolved dynamically relative to the parent component's transform origin.

---

# 5. Pins

- **Definition**: Package pins on integrated circuits, representing structural sub-components.
- **Logical Signal Mapping**: Links physical canvas pins to logical signals in the component model.

---

# 6. Wires

- **Path Components**: Composed of linear physical segments with starting and ending coordinate points. Wires do not store or persist `Endpoint` objects directly.
- **Semantic Link**: A `Wire` references its logical relationship using `logicalConnectionId` (which maps back to a `LogicalConnection` that owns the terminal `Endpoints`).

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

- **Reconnection Steps**: Swapping endpoint connections moves the target reference in the LogicalConnection's Endpoint. Dragging a connection away from a Port or Pin updates the Endpoint type to `FLOATING` (dangling). Re-binding the connection to a new Port/Pin updates the Endpoint's `targetId` (and resets its type to `PORT` or `PIN`). All updates to LogicalConnection endpoints and associated Wire geometries are orchestrated through the Command Engine.

---

# 18. Splitting

- **Segment Splits**: Dropping a component Port or Pin onto an existing Wire segment splits the physical Wire into two independent Wire objects, which reference separate `LogicalConnection` objects sharing the same Net ID (`netId`).

---

# 19. Merging

- **Net Merging**: Drawing a Wire to connect two independent Nets merges them into a single Net. The engine updates the `netId` property of all affected subordinate `LogicalConnection` objects. Wires and segments do not store `netId` and are not updated.

---

# 20. Deletion

- **Segment Deletion**: Deleting a Wire segment splits the Net. The engine re-evaluates connectivity and splits the Net, allocating separate Net IDs (`netId` on LogicalConnections) if components are partitioned. Deleting a Port or Pin triggers the Command Engine to convert the associated LogicalConnection Endpoints to `FLOATING` (dangling) and flags referencing Wires as affected.

---

# 21. Dangling Connections

- **Dangling Endpoints**: LogicalConnections with `FLOATING` endpoints (not bound to any Port/Pin) are flagged as dangling. Associated physical Wires referencing these LogicalConnections are marked as affected on the canvas and in the Design Rule Checker (DRC).

---

# 22. Object Movement

- **Wire Stretching**: Dragging a component moves its Ports/Pins. The engine resolves the absolute coordinates of the Ports/Pins and recalculates/stretches referencing Wire segments to maintain physical trace alignment. Preview stretch geometries are transient/non-canonical during the gesture, and are committed only upon drag release.

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

Every LogicalConnection, Wire, and Net transitions through a unified state model:
- **DRAFT_PREVIEW**: The transient/non-canonical state during routing. Preview Wire paths are computed in response to mouse movements and snapping targets, bypassing the Object Engine registry and History Engine.
- **COMMITTED**: The persistent state. The LogicalConnection and its referencing Wires have stable IDs, are registered in the Object Engine, saved to disk, and recorded on the history stack.
- **STRETCHED**: An active intermediate state during a dragging gesture (e.g., component movement). The Wire paths are dynamically rubber-banded and recalculated in real-time. They remain transient/non-canonical until the gesture completes and is committed.
- **DANGLING**: A state where a LogicalConnection has at least one FLOATING endpoint (unbound to any Port or Pin). This is structurally valid in the Object Model but flagged as a warning in the Design Rule Checker (DRC).
- **SWAPPED / RECONNECTED**: A state representing endpoint re-binding to a new target Port or Pin, triggering netlist updates.
- **EVICTED**: The terminal state. The connection and wires are removed from the registry and their indexes are cleared.

---

# 39. Endpoint Identity and Reference Guarantees

Endpoints represent the exact termination points of a LogicalConnection, owned strictly by the LogicalConnection object:
- **Endpoint Identity**: Every endpoint must be initialized with a stable, immutable UUIDv4.
- **Termination Types**: Follows the discriminated union defined in the Object Model:
  - `PORT`: Requires `targetId` (non-nullable Port ID) and forbids `coordinate`.
  - `PIN`: Requires `targetId` (non-nullable Pin ID) and forbids `coordinate`.
  - `FLOATING`: Requires `coordinate` (non-nullable World coordinate) representing dangling/unbound ends, and forbids `targetId`.
- **Reference Guarantees**: An endpoint defined with `PORT` or `PIN` holds a strict reference to the target Port/Pin ID. If the parent component is moved, scaled, or rotated, the Connection Engine resolves the port's absolute World coordinates relative to the component's transform origin (using Geometry Engine affine transformations) and automatically updates the referencing Wire segment positions.

---

# 40. Port and Pin Resolution Lifecycle

The resolution lifecycle of ports and pins converts local component geometry into absolute World Space coordinates for the routing graph:
1. **Trigger**: Component transform changes, or route recalculation is initiated.
2. **Retrieve Component**: Query the Object Engine to retrieve the parent component and its current transform matrix.
3. **Local coordinate Lookup**: Query the component's definition schema for the local coordinate of the port/pin.
4. **Transform Application**: Call Geometry Engine affine multiplication to apply the component's translation, rotation, and scaling matrices.
5. **Caching**: Store the absolute coordinate in the Connection Engine’s endpoint resolution table.
6. **Logical Mapping**: Map physical pin IDs to logical signals to prepare for signal compatibility audits.

---

# 41. Connection Creation Transaction Boundaries

All wire and connection creation actions must operate within transactional boundaries managed by the Command Engine:
- **Transaction Block**: Drawing a wire from a starting port/pin/coordinate to a target initiates a transaction.
- **Atomicity**: The transaction wraps:
  1. Creating the LogicalConnection and Wire objects.
  2. Resolving Endpoints and generating unique IDs.
  3. Routing path segments.
  4. Merging or updating netlist structures.
  5. Running Design Rule Checks (DRC) for signal compatibility.
- **Rollback Guarantee**: If any validation fails (e.g., attempt to connect incompatibly typed signals under strict enforcement mode, or pathfinding timeouts), the entire transaction aborts. The Object Engine registry rolls back to its last checkpoint, and no orphan wire segments or broken net states are saved.

---

# 42. Wire Creation Gesture Lifecycle

The user-interaction gesture sequence for creating a wire is handled cooperatively by the Tool System and the Connection Engine:
1. **Hover & Highlight**: The user hovers over a component port/pin. The Tool System queries the Connection Engine for compatibility, highlighting the port if a connection is valid.
2. **Start Click**: User clicks the port/pin. The Connection Engine instantiates a draft session, setting the start endpoint to PORT or PIN.
3. **Dynamic Routing (Preview)**: As the cursor moves, the engine runs A* routing from the start port/pin to the cursor coordinate (using a FLOATING endpoint). It renders the path as a preview.
4. **Vertex Locking (Intermediate Click)**: User clicks on the canvas to lock an intermediate bend. The coordinate is committed as a fixed vertex in the draft session, and path routing resumes from this vertex to the cursor.
5. **Target Commit Click**: User clicks on a valid target port/pin. The draft session closes, a `CreateWireCommand` is dispatched to the Command Engine, and the connection and wire are committed.
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

A physical Wire is persisted as an ordered list of segments $S_0, S_1, \dots, S_{n-1}$, where each segment contains a start coordinate and an end coordinate.
- **Segment Schema**: Segments are stored as a flat array of segment objects (each with `start: { x, y }` and `end: { x, y }`) in the Wire object. They do not possess independent UUIDs.
- **Vertex Derivation**: Vertices are derived runtime-only data structures generated by parsing the segment start and end endpoints.
- **Dragging Vertices**: When editing, coordinate vertices can be manipulated via transient tools. The resulting updated geometry is committed as a new set of physical segments.
- **Segment IDs**: For hit-testing and selection tracking, segments are referenced using their segment index or coordinate start-end.

---

# 45. Junction Lifecycle and Ownership

Junctions represent physical connections between intersecting Wires sharing the same electrical net:
- **Junction Dots**: Rendered as a solid dot at coordinate $P$ where 3 or more Wire segments intersect.
- **Dynamic Calculation**: Junctions are calculated dynamically by the Connection Engine. If segments are edited such that they no longer intersect, the junction is automatically destroyed.
- **No Standalone Registry**: Junctions are not registered as standalone entities in the Object Engine, nor do they represent independent persisted Endpoints on LogicalConnections. They are dynamic geometric properties computed from intersecting Wires.

---

# 46. Net Identity and Net Lifecycle

A Net represents the logical netlist relationship group.
- **Net ID**: Every Net must be assigned a unique `netId` (UUIDv4) owned by LogicalConnection objects.
- **Creation**: Instantiated when the first Wire connecting two terminals is committed.
- **Propagation**: The LogicalConnection objects hold the active `netId`. Wires and segments do not persist or store `netId`; their Net membership is resolved dynamically through: Wire -> logicalConnectionId -> LogicalConnection -> netId.
- **Termination**: A Net is destroyed and its ID evicted when the final LogicalConnection referencing it is deleted.

---

# 47. Net Merge Rules

When a new connection is drawn linking Net A (with $netId_A$) and Net B (with $netId_B$):
- **Dominance Evaluation**: The engine selects the dominant Net ID to preserve.
  - Special nets (e.g. `GND`, `VCC`, `+5V`) always dominate.
  - If neither is a special net, the net with the larger number of connected ports dominates.
  - If equal, the lexicographically smaller UUIDv4 is selected.
- **ID Update**: The `netId` field on all affected subordinate `LogicalConnection` objects is updated to the dominant `netId`. Wires and segments themselves do not hold `netId` and undergo no property updates.
- **History Tracking**: The merge transaction records the old Net ID and the list of affected LogicalConnection IDs to support undo restoration.
- **Event Bus Dispatch**: Emits `core:net.merged` containing `{ mergedInto: dominantNetId, obsoleteNetId: subordinateNetId }`.

---

# 48. Net Split and Partition Detection

When a wire segment or connection is deleted, or a component is moved breaking physical contact:
- **Connectivity Graph**: The engine models the net as a transient, undirected graph for partition checks, where Ports, Pins, and derived geometric intersection coordinates are treated as temporary graph nodes, and Wire segments are treated as edges. These intersection nodes are strictly transient/derived and are not persisted Junction entities.
- **Partition Query**: Runs a Breadth-First Search (BFS) or Depth-First Search (DFS) starting from an arbitrary node to find all reachable Ports, Pins, and Wire segments.
- **Split Execution**:
  - If the search reaches all original nodes, the Net remains intact.
  - If a partition is detected (some nodes are unreachable), the engine splits the Net, allocating a new `netId` to the LogicalConnections in the disconnected partition. The partition containing the dominant name/GND keeps the original `netId` on its LogicalConnections. Wires and segments are not directly updated with `netId`.
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
  - The Connection Engine indexes these labels, merging the ports into a shared Net (assigning a matching `netId` to their respective LogicalConnection objects).

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

- **Junction**: Intersecting Wire segments whose parent Wires resolve to the same Net ID (via their respective `logicalConnectionId` mapping to a `LogicalConnection` with the same `netId`). Rendered with a solid junction dot (radius specified in rendering properties). Junction dots are dynamically derived geometric/rendering results and are not persisted Object Engine entities.
- **Crossing**: Intersecting Wire segments whose parent Wires resolve to different Net IDs.
- **Crossing Representation**: Crossings are rendered as simple line overlaps without a dot, maintaining logical separation. The engine queries the Geometry Engine to find all crossing points on the active page to optimize hit-testing and select-overlap routines.

---

# 63. Collinear Segment Merging

To prevent wire paths from building up redundant coordinates during layout changes:
- **Scan**: The engine sweeps Wire segments after path mutations.
- **Merging Rule**: For any three consecutive segment joint coordinates $V_i$, $V_{i+1}$, $V_{i+2}$ (derived from adjacent segment endpoints), if the vectors $(V_{i+1} - V_i)$ and $(V_{i+2} - V_{i+1})$ are collinear (i.e. their cross product is within Epsilon $10^{-6}$), the joint coordinate $V_{i+1}$ is deleted.
- **Result**: The two adjacent segments are replaced by a single, continuous segment from $V_i$ to $V_{i+2}$ in the persisted segment array.

---

# 64. Zero-Length and Degenerate Segment Handling

- **Degenerate Segments**: Segments where the start coordinate and end coordinate share the same value (length $< 10^{-4}$ World units).
- **Trimming Rule**: During coordinate updates, if a segment is compressed to zero length, the segment is discarded from the persisted array.
- **Redundancy Collapse**: Adjacent segments are re-linked directly by updating their start/end coordinates to collapse the redundant joint. This prevents routing loops and coordinate serialization bloat.

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
- **Net Selection**: Double-clicking a segment selects the entire logical Net. All Wires and Ports resolving to the same `netId` (via their parent `LogicalConnection`) are added to the active selection set, highlighted on the canvas, and loaded into the Inspector.
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

- **Deletion Command**: Deleting a Wire segment or entire Net is processed via a `DeleteConnectionCommand`. A Wire object itself may only be deleted when its routed physical layout path is explicitly removed through canonical mutation. Wires do not own, delete, disconnect, or truncate endpoints.
- **Cascade Deletion**:
  - Deleting a Component triggers cascade deletion of all its Ports and Pins (sub-components).
  - Deleting a Port or Pin triggers the Command Engine to identify all associated LogicalConnection Endpoints, convert those Endpoints to `FLOATING` through canonical mutation orchestration, and flag Wires referencing those affected LogicalConnections as affected.
- **Reindexing**: After deletions, a Net split check is run, and the netlist is rebuilt.

---

# 69. Dangling Endpoint Lifecycle

- **Dangling State Definition**: A dangling state is defined exclusively as an Endpoint of type `FLOATING` owned by a `LogicalConnection` object and unbound to any Port or Pin. There are no junction endpoint semantics in the canonical model.
- **Permissibility**: Supported by the Object Model to allow incomplete routing layouts.
- **Visual Indicator**: Rendered with an open square or distinct warning color (configured in styles) on the canvas to represent the affected Wire segment.
- **DRC Rules**: The Design Rule Checker (DRC) flags dangling LogicalConnections or FLOATING LogicalConnection Endpoints. Wires themselves do not own the dangling state.
- **Interaction**: Users can select, drag, and snap FLOATING LogicalConnection Endpoints to Ports or Pins to commit and resolve them.

---

# 70. Reconnection and Endpoint Swapping

- **Action**: Dragging an active connection from Port A and dropping it onto Port B.
- **Execution steps**:
  1. The Command Engine updates the LogicalConnection's Endpoint type/target, disconnecting it from Port A and setting it to Port B.
  2. Perform a net partition sweep on Port A's old Net (Net A). Split the net if disconnected.
  3. Associate the updated Endpoint with Port B's Net (Net B).
  4. Run pathfinding to adjust the segment geometries of the referencing Wires to Port B's coordinate.
  5. Commit transaction and publish updates.

---

# 71. Undo and Redo Restoration Behavior

To guarantee perfect visual and topological restoration:
- **Path Storage**: Commands record the exact list of canonical Wire segments (start and end coordinates), LogicalConnection Net IDs (`netId`), and the complete Endpoint discriminated-union state (type, targetId when PORT/PIN, coordinate when FLOATING) at execution time.
- **Execution Bypass**: Reverting (undo) or re-applying (redo) operations restores these segments and connection states directly.
- **No Pathfinder Invocations**: Pathfinding algorithms are bypassed during undo/redo. This ensures that even if obstacle layouts or plugin rules have changed since the command was recorded, the visual routing is restored exactly as it was drawn.

---

# 72. Storage Hydration and Unknown Plugin Connections

- **Hydration**: On file load, the Storage Engine hydrates LogicalConnections, their Endpoint structures, Wire segment arrays, and `logicalConnectionId` references.
- **Incremental Registration**: Wires and LogicalConnections are registered in the Object Engine, and net indexes are derived from `LogicalConnection.netId` according to the canonical model.
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
- **Complexity Limits**: Restricts the maximum number of transient route vertices (during routing calculations) and persisted segments per Wire to $500$ to prevent stack overflows, memory exhaustion, and coordinate serialization bloat.
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
| **Dangling Reference** | Orphan LogicalConnection Endpoint | Orphan audit on registry updates | Convert the affected Endpoint in LogicalConnection to FLOATING through Command Engine orchestration and flag referencing Wires as affected. |
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

This diagram shows the sequence when swapping LogicalConnection endpoints:

```
ToolSystem       ConnectionEngine      ObjectEngine       GeometryEngine       EventBus
    |                   |                   |                  |                   |
    |-- dragEndpoint ->|                   |                  |                   |
    |                   |-- checkHover() -->|                  |                   |
    |                   |                   |-- getPortCoords -|                   |
    |                   |                   |<-- coords -------|                   |
    |                   |                                                          |
    |-- dropOnPort(P2) -|                                                          |
    |                   |-- updateEndpoint(P2)                                     |
    |                   |   (LogicalConnection Endpoint updated)                   |
    |                   |------------------->|                                     |
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

The serialized output of a fully routed, valid LogicalConnection and its referencing Wire committed to the Object Engine:

```json
{
  "connection": {
    "id": "logical-conn-501",
    "type": "logicalConnection",
    "version": 1,
    "netId": "net-8a2b3c4d",
    "endpoints": [
      { "id": "ep-1", "type": "PORT", "targetId": "resistor-102:p2" },
      { "id": "ep-2", "type": "PORT", "targetId": "capacitor-204:p1" }
    ]
  },
  "wire": {
    "id": "wire-501",
    "type": "wire",
    "version": 1,
    "logicalConnectionId": "logical-conn-501",
    "segments": [
      { "start": { "x": 80.0000, "y": 85.0000 }, "end": { "x": 120.0000, "y": 85.0000 } },
      { "start": { "x": 120.0000, "y": 85.0000 }, "end": { "x": 120.0000, "y": 120.0000 } },
      { "start": { "x": 120.0000, "y": 120.0000 }, "end": { "x": 150.0000, "y": 120.0000 } }
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
    "affectedConnections": ["logical-conn-501", "logical-conn-803"],
    "affectedWires": ["wire-501", "wire-803"],
    "affectedPorts": [
      "resistor-102:p2",
      "capacitor-204:p1",
      "ic-301:pin-12"
    ],
    "reverseDelta": {
      "originalNetMap": {
        "logical-conn-803": "net-f9e8d7c6",
        "ic-301:pin-12": "net-f9e8d7c6"
      }
    }
  }
}
```

## 84.4. Dangling Connection DRC Record (`core:dangling-connection-drc`)

The record generated by the Design Rule Checker when a LogicalConnection is left incomplete:

```json
{
  "ruleId": "DRC_WARN_DANGLING_CONNECTION",
  "severity": "warning",
  "targetId": "logical-conn-909",
  "message": "LogicalConnection 'logical-conn-909' has a floating endpoint at coordinate (210.0000, 340.0000).",
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
  "logicalConnectionId": "logical-conn-501",
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
    "oldSegments": [
      { "start": { "x": 80.0000, "y": 85.0000 }, "end": { "x": 120.0000, "y": 85.0000 } },
      { "start": { "x": 120.0000, "y": 85.0000 }, "end": { "x": 120.0000, "y": 120.0000 } },
      { "start": { "x": 120.0000, "y": 120.0000 }, "end": { "x": 150.0000, "y": 120.0000 } }
    ],
    "newSegments": [
      { "start": { "x": 80.0000, "y": 85.0000 }, "end": { "x": 120.0000, "y": 85.0000 } },
      { "start": { "x": 120.0000, "y": 85.0000 }, "end": { "x": 120.0000, "y": 140.0000 } },
      { "start": { "x": 120.0000, "y": 140.0000 }, "end": { "x": 165.0000, "y": 140.0000 } }
    ]
  }
}
```
