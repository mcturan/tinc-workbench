# Geometry Engine Specification

**Project:** TINC Workbench
**Version:** 0.1.0-draft

---

# 1. Purpose

The Geometry Engine is the core utility service responsible for mathematical, coordinate-space, and spatial computations within TINC Workbench. It performs high-performance geometric math, coordinate space conversions, collision queries, and bounding box calculations, serving as the mathematical backbone for both the visual canvas rendering and the underlying semantic engineering model. It is completely independent of rendering backends, operating solely on mathematical values.

---

# 2. Goals

- **Mathematical Decoupling**: Isolate raw geometry computations from rendering pipelines and UI frameworks, keeping domain math pure.
- **Precision**: Enforce consistent floating-point accuracy across all coordinate transformations, measurements, and intersections.
- **High Performance**: Optimize spatial queries and bounding box calculations to run within interactive frame rates (less than 1ms per query).
- **Extensibility**: Provide simple, decoupled vector and matrix utilities used by other core services (Canvas Engine, Object Engine).

---

# 3. Coordinate Systems

TINC Workbench utilizes three distinct coordinate systems, as established in the Canvas Engine Specification:

- **World Space (World Coordinates)**: The infinite, zoom-independent double-precision coordinate grid where all engineering components and drawing objects reside.
- **Viewport Space (Viewport Coordinates)**: The intermediate, canvas-relative coordinate system affected by the viewport zoom, center, and pan settings.
- **Screen Space (Screen Coordinates)**: The local pixel-based coordinate system of the physical display or browser canvas window.

---

# 4. World Space

- **Definition**: The double-precision coordinate grid representing the engineering workspace.
- **Coordinate Convention**: Right-handed Cartesian coordinates where the horizontal axis (X) increases to the right, and the vertical axis (Y) increases downwards.
- **Scale Independence**: Objects in World Space retain their physical sizes (e.g., millimeters or mils) regardless of how the viewport zoom level changes.

---

# 5. Screen Space

- **Definition**: The integer pixel coordinates relative to the top-left corner of the browser's HTML canvas element.
- **Range Constraints**: Clamped to the active window dimensions. Screen Space values are volatile and change dynamically during window resizing or layout shifts.

---

# 6. Transformations

The Geometry Engine mediates the pipeline converting coordinates between spaces:

- **World to Viewport**: Subtract viewport center coordinates, scale by the active zoom factor, and offset by viewport half-dimensions.
- **Viewport to Screen**: Map viewport coordinates directly to target HTML canvas pixel bounds.
- **Transformation Matrices**: Mathematical representations using homogeneous coordinates to combine translations, rotations, and scales.

---

# 7. Matrix Operations

To support spatial transformations, the engine implements 2D affine matrices:

- **Matrix Representation**: Represented as a 3x3 matrix where the final column is static `[0, 0, 1]`, optimized for 2D coordinate spaces.
- **Composition**: Multiplies matrices to compose translation, scale, and rotation steps into a single transform matrix.
- **Inversion**: Calculates inverse matrices to translate Screen Space click events back to World Space coordinates.
- **Vector Projection**: Transforms coordinates and bounding box dimensions.

---

# 8. Bounding Boxes

The engine calculates bounding boxes to support rendering optimization and quick collision checks:

- **Axis-Aligned Bounding Box (AABB)**: The minimal rectangle enclosing an object with edges parallel to the coordinate axes.
- **Oriented Bounding Box (OBB)**: The minimal rectangle enclosing an object, rotated to align with the object's local orientation.
- **Box Union**: Merges multiple bounding boxes to compute selection bounds.
- **Box Intersection**: Tests for overlapping bounding boxes.

---

# 9. Hit Testing

Determines if user interactions target specific canvas objects:

- **Point-in-Rectangle**: Verifies if a coordinate falls inside an AABB or OBB.
- **Point-on-Line/Curve**: Evaluates if a coordinate is within a specified click threshold distance of a Wire segment or bezier segment.
- **Rectangle-in-Rectangle**: Detects intersection between selection marquee boxes and object bounds.
- **Z-Index Resolution**: Returns the closest hit object using z-index properties to resolve overlaps.

---

# 10. Snapping

Snapping aligns coordinates to nearby features during dragging or placement gestures:

- **Targets**: Grid increments, Guide lines, Object bounds (min, max, center), Ports, Pins, and Wires.
- **Snapping Threshold**: The engine evaluates targets within a local radius (typically 10 Screen Space pixels).
- **Resolution Priority**: If multiple snap targets exist, priority is resolved in order: Ports/Pins -> Grid -> Object Bounds.

---

# 11. Alignment

Aligns a selection of objects relative to an anchor object or their collective boundary:

- **Horizontal Alignments**: Left, Center, Right.
- **Vertical Alignments**: Top, Middle, Bottom.
- **Distribution**: Distribute objects horizontally or vertically, equalizing the space between adjacent components.

---

# 12. Rotation

- **Origin**: Objects rotate around their local bounding box centers, or custom defined anchor points (e.g., origin point of a composite symbol).
- **Math**: 2D rotation transformations using sine and cosine of the angle in radians. Positive rotation is clockwise.

---

# 13. Scaling

- **Origin**: Scale from local center, or select handles (top-left, bottom-right, etc.).
- **Proportional Constraints**: Maintaining aspect ratio during scale gestures.

---

# 14. Measurements

Provides metric calculations:

- **Distance**: Euclidean distance between two World points.
- **Angle**: Relative angle between two intersecting wires or ports.
- **Area**: Bounding area of simple polygons.

---

# 15. Spatial Indexing

To prevent linear scans of the entire Object Engine during rendering or selection sweeps, the Geometry Engine implements spatial indexing:

- **Quadtree Partitioning**: The infinite World Space is recursively subdivided into quadrant nodes.
- **Query Complexity**: Reduces object retrieval time from $O(N)$ to $O(\log N)$.
- **Dynamic Updates**: Only objects that move or change size update their position in the Quadtree.

---

# 16. Collision Detection

- **Bounds Intersection**: Evaluates AABB and OBB intersections.
- **Obstacle Mapping**: Primarily used to calculate wire-routing channels around obstacle component bounds.

---

# 17. Precision Rules

- **Data Types**: High-precision 64-bit float representations (doubles) for World Space coordinates.
- **Rounding Rules**: Coordinates are rounded to 4 decimal places during serialization to prevent floating-point git-diff noise.
- **Epsilon Checks**: Use small epsilon thresholds (e.g., $10^{-6}$) to verify line intersections and coordinate overlaps to bypass floating-point rounding errors.

---

# 18. Performance

- **Target Latency**:
  - Coordinate conversions: < 0.05 microseconds per point.
  - Spatial Query (100 objects selection): < 1.0 ms.
  - Bounding box updates: Run synchronously inside the modification frame.

---

# 19. Memory Model and Cache Ownership

- **Derived Caching**: The Geometry Engine maintains exclusive ownership of all derived geometric caches (transform matrices, bounds caches, spatial indexes, and hit-test geometry).
- **Non-Canonical Storage**: These caches store derived mathematical values only and do not replicate or act as a primary/canonical object store.
- **Flat Array Storage**: Spatial index entries use flat numeric arrays to optimize garbage collection sweeps.

---

# 20. Thread Model

- **UI Synchronous Math**: Basic coordinate conversions run synchronously on the main thread for instant feedback.
- **Off-Thread Indexing & Routing**: Quadtree rebuilding and auto-routing calculations run inside background Web Workers.

---

# 21. Public API

The public API exposed by the Geometry Engine:

- **worldToScreen(point, viewport)**: Converts a World coordinate to Screen pixel bounds.
- **screenToWorld(point, viewport)**: Converts a Screen pixel coordinate to World bounds.
- **getAABB(object)**: Computes the Axis-Aligned Bounding Box for the given object.
- **snapPoint(point, targets, options)**: Snaps a coordinate point to the nearest snap target.
- **alignObjects(objects, mode, anchor)**: Aligns a selection of objects relative to an anchor object or their collective boundary.
- **querySpatialIndex(bounds)**: Queries the Quadtree index to retrieve objects overlapping the specified bounds.

---

# 22. Internal API

Low-level methods reserved for the Core framework:

- **rebuildSpatialIndex(objects)**: Completely rebuilds the spatial index partition tree.
- **computeCurveIntersection(curveA, curveB)**: Calculates intersection coordinates between two bezier curves.
- **applyMatrix(vector, matrix)**: Multiplies a vector by a 3x3 transformation matrix.

---

# 23. Testing

- **Vector Math Verification**: Tests for matrix composition and inversion.
- **Transform Loop Parity**: Verifying that `screenToWorld(worldToScreen(P))` returns exactly `P`.
- **Spatial Search Checks**: Mock selections targeting crowded Quadtree indexes.

---

# 24. ASCII Sequence Diagrams

## 24.1. Alignment Execution Sequence

The diagram below demonstrates how the Geometry Engine processes alignment requests:

```
UI/Command       GeometryEngine      ObjectEngine      TargetObjects
    |                  |                  |                  |
    |-- align(Left) -->|                  |                  |
    |-- getBounds() -->|                  |                  |
    |<-- bounds List --|                  |                  |
    |                  |                  |                  |
    |                  |-- calculateAlign()                  |
    |                  |   (Compute target X offset)         |
    |                  |                  |                  |
    |                  |-- updatePositions() --------------->|
    |                  |   (Apply translation vectors)       |
    |<-- done ---------|                                     |
```

## 24.2. Hit Testing and Selection Sequence

The diagram below details spatial indexing and hit testing during selection sweeps:

```
CanvasUI        GeometryEngine      QuadtreeIndex       TargetObjects
   |                  |                   |                   |
   |-- click(X, Y) -->|                   |                   |
   |                  |-- query(bounds) ->|                   |
   |                  |<-- candidate List-|                   |
   |                  |                                       |
   |                  |-- hitTest() ------------------------->|
   |                  |   (Point-in-polygon checks)           |
   |                  |<-- hit success -----------------------|
   |<-- selected -----|                                       |
```

---

# 25. State Diagrams

The snapping routine handles coordinates through the following snapping states:

```
                      [ No Target ]
                            |
                            | Point moves
                            v
                [ Within Snap Threshold ]
                            |
              +-------------+-------------+
              |                           |
         (Exits radius)            (Snap criteria met)
              |                           |
              v                           v
        [ No Target ]                [ Snapped ]
                                          |
                                          | Drag breaks threshold
                                          v
                                    [ No Target ]
```

---

# 26. Numeric Precision Model and Epsilon Policy

To ensure consistent math processing, the Geometry Engine enforces a strict precision model:

- **26.1. Data Representation**: All coordinates, dimensions, angles, and matrix coefficients are represented as IEEE 754 64-bit double-precision floating-point numbers.
- **26.2. Epsilon Constants**: The engine defines the following primary constants to handle numerical comparison boundaries:
  - Coordinate comparison epsilon ($\epsilon = 10^{-7}$): Used to check point overlaps and bounding box touches.
  - Angular epsilon ($\theta_{\epsilon} = 10^{-5}$ radians): Used to verify parallel Wire segments and alignment vectors.
- **26.3. Strict Equality Avoidance**: Calculations never use direct comparative operations (`==`) for floating-point values. Instead, they check absolute differences against the epsilon boundaries:
  ```
  |Value_A - Value_B| < Epsilon
  ```

---

# 27. Floating-Point Error Handling

To prevent precision degradation in long editing sessions, the following design constraints apply:

- **27.1. Cumulative Transform Mitigation**: Affine matrices are never updated by multiplying incremental transform steps repeatedly. Instead, the final transformation matrix is reconstructed from base translation, rotation, and scale parameters on each state change.
- **27.2. Intersecting Approximation Limits**: Line-on-line and bezier intersections are checked using iterative clipping models. The iteration terminates when the segment bounds fall below the primary epsilon threshold, preventing infinite subdivision loops.
- **27.3. Serialization Normalization**: Coordinates are rounded to 4 decimal places before serialization to eliminate minor floating-point fluctuations during project file saves.

---

# 28. Coordinate Overflow and Extreme World Coordinates

- **28.1. Boundaries**: The infinite canvas limits the valid World Space coordinate range to:
  ```
  [-1,000,000,000, 1,000,000,000]
  ```
  in both X and Y dimensions.
- **28.2. Out of Bounds Validation**: The Command Engine validates target bounds against this range. If an operation pushes components beyond these limits, execution is blocked.
- **28.3. Overflow Protection**: Calculations check intermediate products during matrix multiplication. If a value exceeds the maximum boundary, the value is clamped, and the engine logs a warning.

---

# 29. Matrix Composition Order

To ensure predictable layout transforms, 2D affine matrices compose transformations in a strict chronological sequence:

1. **Translation**: Shift local origin to the target location.
2. **Rotation**: Rotate points around the local anchor.
3. **Scaling**: Scale coordinates.
4. **Shearing**: Apply shear factors (reserved for specialized symbols).

Matrix composition uses post-multiplication. The unified transformation matrix $M$ is defined as:
```
M = TranslationMatrix * RotationMatrix * ScaleMatrix
```
Reversing this sequence causes skewing and displacement.

---

# 30. Transform Inheritance

- **30.1. Hierarchical Propagation**: Nested groups inherit parent transformations. The global world matrix $M_{global}$ for a child object at nesting depth $d$ is:
  ```
  M_global = M_parent1 * M_parent2 * ... * M_local
  ```
- **30.2. Matrix Invalidation**: Modifying a parent group's position invalidates the global matrix caches of all nested children.
- **30.3. Bounds Recalculation**: The AABB of a nested child is calculated by projecting its local geometry through the combined inherited world matrix.

---

# 31. Local and Global Transforms

The engine converts coordinates between nested component scopes:

- **Local-to-Global**: Maps coordinates from an object's local group coordinate space to the infinite World coordinate grid using the combined inherited world matrix.
- **Global-to-Local**: Translates World coordinates back to the local relative coordinate space by multiplying the vector by the inverse of the object's combined inherited world matrix.
- **Size Transformations**: Scale transformations ignore translation properties, transforming only component dimensions.

---

# 32. Rotated Bounding Boxes and OBB

Oriented Bounding Boxes (OBB) support precise selections on rotated objects:

- **32.1. OBB Structure**: An OBB is represented by its center point, half-width extents, and the local rotation angle (in radians).
- **32.2. OBB Collision (SAT)**: Collision detection between two OBBs is resolved using the Separating Axis Theorem (SAT). The engine projects the box corners onto the orthogonal axes of both boxes. A collision is registered only if overlaps occur along all four projection axes.
- **32.3. Rotated AABB Calculation**: The AABB of a rotated object is calculated by projecting the four corners of its OBB onto the global X and Y coordinate axes, computing the new minimum and maximum coordinates.

---

# 33. Complex Hit-Testing Rules

For non-rectangular component shapes, the engine uses specialized testing:

- **33.1. Polygon Intersection**: Evaluates point inclusion using the Ray-Casting algorithm. A horizontal ray is projected from the click point; if it intersects the polygon's edges an odd number of times, the point is inside.
- **33.2. Bezier Curve Proximity**: Proximity to bezier curves is checked by recursively subdividing the curve into flat line segments. If the perpendicular distance from the click point to any flat segment is within the click threshold, a hit is confirmed.
- **33.3. Compound Paths**: For objects containing holes, the engine evaluates nested paths using the even-odd winding rule.

---

# 34. Port, Pin, and Wire Hit-Testing

- **34.1. Port and Pin Hit Radii**: Ports and Pins are modeled as circular targets with a default World Space radius of 5mm (approximately 18 mils). Hit testing checks the Euclidean distance between the click point and the port or pin center.
- **34.2. Wire Proximity**: Wire segments (from the physical Wire traces) are hit-tested by projecting the click point orthogonally onto the wire line segment. A hit is registered if:
  ```
  Distance(ClickPoint, WireSegment) < ClickThreshold
  ```
- **34.3. Tap Detection**: Click thresholds scale dynamically based on the viewport zoom level, maintaining a consistent hit radius of 8 pixels in Screen Space.

---

# 35. Snap Candidate Discovery and Ranking

During object dragging, the engine searches for snap targets:

1. **Range Query**: Queries the Quadtree spatial index within a 15-pixel radius (in Screen Space) around the cursor coordinate.
2. **Filtering**: Excludes the actively dragged object and its children from the returned candidate list.
3. **Distance Calculation**: Computes the Euclidean distance to each candidate's snap points.
4. **Ranking**: Targets are ranked by distance and priority type:
   - Priority 1: Port and Pin centers (highest priority).
   - Priority 2: Object center points and Wire endpoints.
   - Priority 3: Grid line intersections.
   - Priority 4: Bounding box edges.

---

# 36. Snap Conflict Resolution

When multiple snap candidates fall within the snap radius:

- **Proximity Wins**: The candidate closest to the cursor is selected.
- **Priority Resolution**: If two candidates are equidistant, the target with the higher ranking class (e.g., Port over Grid) is selected.
- **Visual Indicators**: The engine displays snap indicators on the canvas to show the active snapping target.
- **Escape Gesture**: Dragging the cursor past a 20-pixel threshold breaks the active snap, allowing free positioning.

---

# 37. Guide Geometry

- **37.1. Infinite Guides**: Guides are modeled as infinite lines defined by a point and a direction vector (horizontal, vertical, or arbitrary angle).
- **37.2. Projections**: Snapping to a guide calculates the orthogonal projection of the object's anchor point onto the guide line.
- **37.3. Dynamic Guidelines**: When dragging components, temporary guides are dynamically generated when the dragged object's edges align with the edges of neighboring components.

---

# 38. Alignment and Distribution Algorithms

- **38.1. Alignment Math**: Computes the target coordinate boundary (e.g., minimum X for left align) across the selection list. The coordinate values of all selected objects are updated to match the target boundary.
- **38.2. Distribution Math**:
  1. Sorts selected components chronologically along the target axis.
  2. Calculates the net empty space by subtracting the sum of all component widths from the total span distance.
  3. Divides the net empty space by $N - 1$ to calculate the distribution gap.
  4. Repositions the intermediate components sequentially using the calculated gap.

---

# 39. Measurement Units and Unit Conversion Boundaries

The engine coordinates measurements using the following conversion constants:

| Unit Name | Abbreviation | Base Value (Millimeters) |
| :--- | :---: | :--- |
| **Millimeter** | mm | 1.0 |
| **Inch** | in | 25.4 |
| **Mil** | mil | 0.0254 |
| **Pixel** | px | 0.264583 (96 DPI baseline) |

- **Baseline Storage**: To prevent rounding drift, all coordinates are stored internally in millimeters. Unit conversions only occur during serialization or inspector UI rendering.

---

# 40. Quadtree Lifecycle and Rebuilding

- **40.1. Instantiation**: The Quadtree index is initialized when a project page opens. The tree's root boundary matches the active page dimensions.
- **40.2. Splitting Rules**: When a quadrant node contains more than 16 objects, the node splits into four child quadrants, and objects are redistributed.
- **40.3. Dynamic Rebalancing**: Moving or resizing an object removes it from its current node and inserts it into the matching quadrant.
- **40.4. Full Rebuild**: If a command updates more than 30% of the objects on a page (e.g., group alignments or project imports), the engine schedules a full Quadtree rebuild to rebalance the tree structure.

---

# 41. Spatial Index Invalidation

- **41.1. Invalidation Triggers**: Fired via `core:object.updated` when bounds, geometry, or rotation properties change.
- **41.2. Reindexing Pipeline**: The engine marks target Quadtree leaf nodes as dirty, removes the old object reference pointers, and updates node assignments.
- **41.3. Batch Invalidation**: During transactions, invalidations are queued and executed in a single batch on transaction commit to minimize CPU overhead.

---

# 42. Large-Project Spatial Performance

For large-scale schematics, the engine applies the following optimizations:

- **Frustum Culling**: Viewport boundary queries filter out objects outside the visible canvas coordinate range, skipping unnecessary rendering calculations.
- **Node Merging**: Empty child quadrants are collapsed back into their parent node to reduce tree traversal depth.
- **Max Subdivision Limit**: Limits Quadtree subdivision depth to 8 levels to prevent deep nesting.

---

# 43. Geometry Caching

To minimize redundant math calculations and culling checks, the Geometry Engine maintains and owns derived geometric caches:

- **Cached Properties**: Object transform matrices, derived bounds (AABBs/OBBs), spatial partitioning indexes (Quadtree), and hit-test geometry caches.
- **Derived Status**: These caches are strictly derived and non-canonical. The Geometry Engine does not perform canonical document mutations, and it never acts as a primary object store.
- **Invalidation Policy**: Caches are invalidated and updated dynamically when the Geometry Engine intercepts committed mutation events from the Event Bus or receives explicit validated invalidation signals from the Command Engine.
- **On-Demand Computation**: If a cache miss occurs, the derived properties are automatically recomputed using the raw canonical properties (e.g., coordinates, dimensions, parent-child linkages) exposed by the Object Engine.

---

# 44. Memory Limits and Benchmarks

- **Peak Memory Footprint**: The Quadtree index memory footprint is limited to 5 MB for projects containing up to 10,000 objects.
- **Allocation Optimization**: Vector calculations reuse objects from a pre-allocated pool to avoid garbage collection churn.
- **Garbage Collection**: Pruning parent groups clears all cached matrices of child objects to prevent memory retention.

---

# 45. Latency and Performance Benchmarks

The table below outlines the required execution latency limits for core operations:

| Operation | Target Latency | Condition |
| :--- | :--- | :--- |
| **Point Transformation** | < 0.05 microseconds | Standard affine matrix multiplication |
| **Spatial Query** | < 1.0 milliseconds | Selection query in page with 10,000 objects |
| **OBB Collision Check** | < 0.5 milliseconds | Separating Axis Theorem (SAT) comparison |
| **Quadtree Rebuild** | < 15.0 milliseconds | Rebuilding index for 5,000 components |
| **Snap Search** | < 0.8 milliseconds | Querying target snap candidates in radius |

---

# 46. Degenerate Geometry Handling

Degenerate geometries are invalid mathematical states:

- **Types**: Lines with zero length, polygons with zero area, circles with zero radius.
- **Handling Policy**: Intercepted during command validation. The engine rejects degenerate geometries to prevent division-by-zero errors in matrix transformations and projection calculations.

---

# 47. NaN and Infinity Protection

To protect the workspace from mathematical corruption:

- **Input Audits**: Coordinate inputs are audited using `isFinite()` checks before executing matrix operations.
- **Protection Rules**: If a NaN or Infinity is detected, the engine blocks the operation, rolls back the active transaction, and logs a warning.
- **Default Fallback**: Corrupted coordinates are reset to zero or their last stable cached values.

---

# 48. Plugin Geometry Isolation

- **Sandbox Restrictions**: Plugins cannot directly read or modify the global Quadtree index.
- **SDK Proxy**: Plugins access spatial queries and hit-testing utilities through secure SDK proxies, which enforce scope boundaries.
- **Payload Freezing**: Geometries returned to plugins are deep-cloned and frozen to prevent unauthorized mutations.

---

# 49. Security and Input Sanitization

- **Sanitization Filters**: Checks input coordinate parameters during JSON project parses to prevent overflow injections or malicious viewport settings.
- **Validation Constraints**: Coordinates in import payloads must fall within the maximum workspace boundary limits.

---

# 50. Failure Scenarios and Recovery

The engine recovers from computational errors using the following protocols:

- **Node Imbalance**: If the Quadtree becomes unbalanced, the engine triggers a background rebuild.
- **Matrix Inversion Failures**: If a transformation matrix is singular (determinant is zero) and cannot be inverted, the engine resets the viewport transform to default values.
- **Memory Limit Exceeded**: If memory limits are exceeded, the engine clears all cached matrices and limits Quadtree subdivisions.

---

# 51. Complete ASCII Sequence Diagrams

## 51.1. Snap Candidate Ranking and Collision Check Sequence

The diagram below shows how the engine queries, ranks, and resolves snap targets during a component drag:

```
ToolSystem        GeometryEngine      QuadtreeIndex       PortsRegistry       ObjectEngine
    |                   |                   |                   |                  |
    |-- drag(X, Y) ---->|                   |                   |                  |
    |                   |-- query(radius) ->|                   |                  |
    |                   |<-- candidates ----|                   |                  |
    |                   |                                       |                  |
    |                   |-- getPorts() ------------------------>|                  |
    |                   |<-- ports List ------------------------|                  |
    |                   |                                                          |
    |                   |-- rankCandidates()                                       |
    |                   |   (Select closest port snap)                             |
    |                   |                                                          |
    |                   |-- checkCollisions() ------------------------------------>|
    |                   |<-- no collision -----------------------------------------|
    |<-- snap target ---|                                                          |
```

## 51.2. Quadtree Index Invalidation and Rebuild Sequence

This diagram details invalidation events triggering a Quadtree rebalance:

```
ObjectEngine      GeometryEngine      QuadtreeIndex       DirtyQueue       BackgroundWorker
    |                   |                   |                  |                  |
    |-- updateObject -->|                   |                  |                  |
    |                   |-- invalidate(id) ->|                  |                  |
    |                   |-- queueInvalid() ------------------->|                  |
    |                   |                                      |                  |
    |                   |-- checkThreshold()                   |                  |
    |                   |   (Dirty count > 30%)                |                  |
    |                   |                                      |                  |
    |                   |-- scheduleRebuild() ----------------------------------->|
    |                   |                                                         |-- rebuild tree
    |                   |<-- rebuild complete ------------------------------------|
    |                   |-- applyNewTree() ->|                 |                  |
```

---

# 52. Complete State Diagrams

## 52.1. Quadtree Node Lifecycle

Each quadrant node in the spatial index transitions through these lifecycle states:

```
                            [ Created ]
                                 |
                                 v
                            [ Active ] <-------------+
                                 |                   |
                        Object count > 16            | Node collapses
                                 v                   |
                            [ Split ]                |
                                 |                   |
                                 +-- subdivide() ----+
                                 |
                                 v
                            [ Closed ] ─── Page closed
```

## 52.2. Geometry Calculation Pipeline

The sequence of states during coordinate transformations:

```
                       [ Input Received ]
                               |
                               v
                       [ Guard Checks ] ─── NaN/Infinity ───> [ Reverted ]
                               | Pass
                               v
                     [ Matrix Retrieval ]
                               |
                               v
                      [ Compute Transform ]
                               |
               +---------------+---------------+
               |                               |
           (Success)                        (Fail)
               |                               |
               v                               v
         [ Normalized ]                 [ Recovery Fallback ]
               |                               |
               +---------------+---------------+
                               |
                               v
                         [ Output Out ]
```

---

# 53. Geometry Operation Examples for Every Major Category

Below are concrete JSON payload examples representing serialization formats for the core geometry categories:

## 53.1. Affine Matrix Composition (`core:transform-matrix`)

Represents a translation and rotation matrix:

```json
{
  "matrix": [
    [0.866025, -0.500000, 150.000000],
    [0.500000, 0.866025, 200.000000],
    [0.000000, 0.000000, 1.000000]
  ]
}
```

## 53.2. Bounding Box Alignment (`core:alignment-bounds`)

Represents AABB bounds for alignment calculations:

```json
{
  "minX": 100.0000,
  "minY": 150.0000,
  "maxX": 180.0000,
  "maxY": 210.0000
}
```

## 53.3. Snapping Coordinates (`core:snap-bounds`)

Represents snap target bounds:

```json
{
  "snapX": 120.0000,
  "snapY": 150.0000,
  "targetId": "port-1",
  "priority": 1
}
```

## 53.4. Spatial Query Results (`core:spatial-query`)

Represents spatial query bounds:

```json
{
  "queryBounds": {
    "minX": 50.0000,
    "minY": 50.0000,
    "maxX": 500.0000,
    "maxY": 500.0000
  },
  "returnedObjectIds": ["rect-99", "wire-12"]
}
```

## 53.5. Group Transform Inheritance Example (`core:transform-inheritance`)

Represents a nested child object inheriting transformation matrices from its parent group:

```json
{
  "childId": "rect-99",
  "parentId": "group-10",
  "parentMatrix": [
    [1.000000, 0.000000, 50.000000],
    [0.000000, 1.000000, 50.000000],
    [0.000000, 0.000000, 1.000000]
  ],
  "localMatrix": [
    [0.707107, -0.707107, 10.000000],
    [0.707107, 0.707107, 10.000000],
    [0.000000, 0.000000, 1.000000]
  ],
  "combinedWorldMatrix": [
    [0.707107, -0.707107, 60.000000],
    [0.707107, 0.707107, 60.000000],
    [0.000000, 0.000000, 1.000000]
  ]
}
```

## 53.6. Distribute Objects Bounds Example (`core:distribute-bounds`)

Represents sorted object dimensions for horizontal distribution:

```json
{
  "axis": "X",
  "span": {
    "startCoordinate": 100.0000,
    "endCoordinate": 500.0000
  },
  "items": [
    { "id": "comp-1", "width": 50.0000, "position": 100.0000 },
    { "id": "comp-2", "width": 50.0000, "position": 275.0000 },
    { "id": "comp-3", "width": 50.0000, "position": 450.0000 }
  ],
  "gapWidth": 125.0000
}
```

## 53.7. Bezier Curve Proximity Check Example (`core:bezier-proximity`)

Represents parameters used to check coordinate proximity against a cubic bezier segment:

```json
{
  "targetPoint": { "x": 105.5000, "y": 82.1000 },
  "curveControlPoints": [
    { "x": 0.0000, "y": 0.0000 },
    { "x": 50.0000, "y": 100.0000 },
    { "x": 100.0000, "y": 100.0000 },
    { "x": 150.0000, "y": 0.0000 }
  ],
  "subdivisions": 4,
  "closestDistance": 2.4102,
  "isHit": true
}
```

---

# 54. Degenerate Geometry Validation Rules

The Geometry Engine validates coordinates to intercept degenerate layouts. The table below outlines the validation criteria:

| Geometry Shape | Degenerate Criteria | Detection Math | Validation Action |
| :--- | :--- | :--- | :--- |
| **Line Segment** | Zero length | Euclidean distance between start and end point < $10^{-7}$ | Block creation; throw `GE_ERR_DEGENERATE_LINE` |
| **Circle** | Zero or negative radius | Radius variable $\le 10^{-7}$ | Block creation; throw `GE_ERR_DEGENERATE_CIRCLE` |
| **Polygon** | Zero bounding area | Cross-product sum of vertices (Shoelace formula) < $10^{-6}$ | Block creation; throw `GE_ERR_DEGENERATE_POLYGON` |
| **Bezier Curve** | Collinear control points | Cross product of vectors between control points < $10^{-5}$ | Warn caller; fallback representation to flat line |

---

# 55. Unit Conversion Boundary Reference

The baseline storage unit is the Millimeter (mm). Standard transformations use the following mapping ratios:

- **Millimeters to Inches**:
  ```
  Inches = Millimeters / 25.4
  ```
- **Millimeters to Mils**:
  ```
  Mils = Millimeters / 0.0254
  ```
- **Millimeters to Pixels (96 DPI)**:
  ```
  Pixels = Millimeters * 3.779527559055
  ```
- **Rounding Drift Guard**: To prevent rounding errors, conversion back to Millimeters is performed using double-precision values before write commands are sent to the Object Engine.
