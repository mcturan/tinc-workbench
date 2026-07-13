# Rendering Engine Specification

**Project:** TINC Workbench
**Version:** 0.1.0-draft

---

# 1. Purpose

The Rendering Engine is the subsystem responsible for drawing the visual representation of the project model onto the physical display surface. It separates visual rendering from business logic, object models, and calculations. It translates structural data from the Object Engine and coordinates from the Geometry Engine into graphical shapes using abstract rendering backends, ensuring modularity and performance.

---

# 2. Goals

- **Backend Independence**: Abstract drawing calls so that the application can switch between Canvas 2D, WebGL, or SVG backends dynamically.
- **60 FPS Performance**: Maintain smooth rendering under heavy component loads (up to 10,000 components).
- **Pixel Perfection**: Render thin vectors, grid lines, and text sharply across varying screen DPIs and viewport zooms.
- **Loose Coupling**: Listen to changes via the Event Bus and perform invalidation on-demand without direct Object Engine dependencies.

---

# 3. Responsibilities

- Rendering canvas grid backgrounds, layers, visual objects, pins, ports, connection wires, and selection overlays.
- Managing rendering backends (HTML Canvas, WebGL, SVG).
- Coordinating viewport-based frustum culling and Level of Detail (LOD) rendering.
- Tracking dirty regions to perform incremental visual updates rather than full canvas redraws.
- Adapting to high-DPI displays (Retina/4K screens) by setting matching Device Pixel Ratios (DPR).

---

# 4. Non-Responsibilities

The Rendering Engine does NOT:

- Execute commands or alter document states (Command Engine domain).
- Store user selection states or active tool choices (UI Framework domain).
- Calculate coordinate transforms, bounding boxes, or wire routing paths (Geometry Engine domain).
- Read/write project files or manage recovery cycles (Storage Engine domain).

---

# 5. Rendering Architecture

Positioned as a downstream subscriber:

- **Input Channels**: Receives paint triggers and viewport parameters from the Canvas Engine, and coordinates from the Geometry Engine.
- **Data Channels**: Reads rendering attributes (styles, bounds, types) from the Object Engine.
- **Abstraction Layer**: Dispatches primitives through a Renderer Abstraction Layer (RAL) to specific backends.

```
+-----------------------------------------------------------------+
|                         Event Bus                               |
+-----------------------------------------------------------------+
                               │ (Listen for mutations/viewports)
                               ▼
+-----------------------------------------------------------------+
|                     Rendering Engine                            |
+-----------------------------------------------------------------+
       │ (Dispatch abstract drawing calls)
       ▼
+-----------------------------------------------------------------+
|             Renderer Abstraction Layer (RAL)                    |
+-----------------------------------------------------------------+
       │
       +------------+---------------+
       |            |               |
       ▼            ▼               ▼
  [ Canvas 2D ]  [ WebGL ]       [ SVG ]
```

---

# 6. Render Pipeline

The render pipeline operates sequentially:

1. **Scene Preparation**: Query active viewport boundaries.
2. **Frustum Culling**: Retrieve only visible objects using the Geometry Engine's spatial index.
3. **Z-Sort**: Order objects based on layer z-index indices.
4. **Drawing Passes**:
   - Pass 1: Background & Grid.
   - Pass 2: Object Layers.
   - Pass 3: Connection wires.
   - Pass 4: Selection boxes and interactive handle overlays.
   - Pass 5: Infinite rulers and dynamic guides.
5. **Frame Flush**: Commit visual buffers to display.

---

# 7. Render Tree

- **Definition**: A lightweight, visual-only copy of the Object Engine hierarchy.
- **Contents**: Composed of Render Nodes containing pre-calculated layout parameters, bounding shapes (AABB/OBB), and resolved styling values (colors, strokes, fonts).
- **Separation**: Updates to the Object Engine do not directly redraw the screen; they invalidate the corresponding Render Tree node.

---

# 8. Scene Preparation

Before drawing a frame, the engine performs scene preparation:

- Fetches active Viewport parameters from the Canvas Engine (centerX, centerY, zoom).
- Assembles the active transformation matrix using the Geometry Engine.
- Queries the Quadtree spatial index to retrieve objects intersecting the viewport.

---

# 9. Layer Rendering

- Layers render sequentially in ascending order of their `zIndex` values.
- If a layer is marked `visible: false` in the Object Model, the engine skips its entire branch in the Render Tree.
- Supports layer blending (compositing alpha transparency values).

---

# 10. Object Rendering

- Renders basic vectors (rectangles, circles, paths) and complex engineering symbols.
- Resolves styles (fill, stroke, strokeWidth, lineDash) using local values or parent template symbols.
- Integrates with the Geometry Engine to draw rotated objects using oriented boundary points.

---

# 11. Connection Rendering

- Renders electrical wires, logical links, and busses.
- Wires are drawn as multi-segment orthogonal lines or bezier curves.
- Renders junction points (solid dots) where three or more connections intersect.

---

# 12. Overlay Rendering

Renders transient visual aids that do not belong to the project document:

- Selection boxes (dashed boundary rectangles).
- Transform handles (corner scaling squares, rotation circles).
- Snapping targets (crosshairs or target highlight ports).
- Measurement callouts (length indicators).

---

# 13. Viewport Culling

- Leverages the Geometry Engine's spatial Quadtree index.
- Excludes objects whose AABB does not intersect the viewport bounds from the drawing pass, saving draw calls.

---

# 14. Dirty Region Tracking

- Instead of wiping and redrawing the entire screen, the engine tracks modified regions (dirty rectangles).
- Merges overlapping dirty rectangles and clips drawing bounds to only clear and redraw those areas, minimizing pixel fills.

---

# 15. Render Invalidation

- Triggered by `core:object.updated` or viewport shift events from the Event Bus.
- Marks specific Render Nodes as dirty. Invalidation propagates upwards (e.g. updating a child invalidates its parent group's bounds).

---

# 16. Frame Scheduling

- Uses `requestAnimationFrame` (rAF) to sync frame updates with display refresh rates.
- Throttles draw calls: If multiple state events fire within a single thread tick, they are coalesced into a single scheduled frame render.

---

# 17. Render Batching

Groups draw calls by style (e.g. drawing all red wires in a single pass) to minimize canvas state switches (e.g. changing stroke color).

---

# 18. Geometry Integration

- Retrieves world-to-screen projection coordinates from the Geometry Engine.
- Retrieves OBB corners to render bounds overlays.

---

# 19. Canvas Engine Integration

Listens to pan and zoom changes from the Canvas Engine to redraw background grids.

---

# 20. Object Engine Integration

Reads structural object hierarchies. The Object Engine acts as the source data, while the Rendering Engine handles visual representation.

---

# 21. Plugin Rendering

- Plugins register custom visual renderers for third-party objects.
- Render SDK exposes drawing hooks (drawRect, drawPath, drawText) within a restricted viewport context.

---

# 22. Renderer Backend Abstraction

Defines a common interface `IRendererBackend` exposing methods:

- `clear()`, `drawRect()`, `drawCircle()`, `drawPath()`, `drawText()`, `drawImage()`, `setTransform()`, `clip()`.

---

# 23. HTML Canvas Backend

- Implements `IRendererBackend` using the browser's standard 2D Context (`CanvasRenderingContext2D`).
- Optimized for standard vector schematics and low-complexity views.

---

# 24. WebGL Backend

- Implements `IRendererBackend` using WebGL2 shaders.
- Draws shapes as triangulated geometry buffers.
- Used for extremely large projects (10,000+ objects) or heavy engineering simulations.

---

# 25. SVG Backend

- Implements `IRendererBackend` by generating XML DOM elements.
- Used for vector exports, printing, and high-quality document views.

---

# 26. Text Rendering

- Draws text labels, pin identifiers, and component values.
- Combines font metrics (fontFamily, fontSize, fontWeight) and aligns text horizontally (left, center, right) and vertically (top, middle, bottom).

---

# 27. Image Rendering

- Draws raster assets (PNG, JPEG) and vector SVGs.
- Pre-loads image sources asynchronously, rendering placeholder bounds until load completion.

---

# 28. Vector Rendering

Draws geometric primitives. Handles stroke joins (miter, round, bevel) and caps (butt, round, square).

---

# 29. High DPI and Device Pixel Ratio

- Automatically reads `window.devicePixelRatio`.
- Scales the back buffer dimensions of the HTML canvas by the DPR while keeping CSS dimensions constant to prevent blurry renders.

---

# 30. Zoom Rendering Rules

Controls grid line visibility and wire thickness during zoom changes:

- Sub-grid lines fade out below 50% zoom.
- Wire widths are locked to a minimum of 1 pixel in Screen Space to remain visible at low zoom levels.

---

# 31. Level of Detail (LOD)

Simplifies object drawing at low zoom levels (e.g. replacing a complex resistor schematic symbol with a simple rectangle when zoom falls below 25%).

---

# 32. Caching

Caches text layouts and off-screen canvas buffers for static, complex symbol groupings.

---

# 33. Memory Model

Recycles vector rendering context arrays to prevent garbage collector pauses.

---

# 34. Performance Targets

Frame budget: < 16ms (60 FPS). Back-buffer scaling overhead < 1ms.

---

# 35. Failure Handling

If a custom plugin drawing call fails, the engine catches the exception, isolates the faulty node, renders a red placeholder error box, and continues rendering the rest of the canvas.

---

# 36. Plugin Isolation

Plugins cannot access the underlying HTML Canvas element or WebGL context directly. They must use the sandboxed rendering SDK.

---

# 37. Security

Sanitizes image urls and font source parameters to block cross-site scripting (XSS) or remote resource leaks.

---

# 38. Public API

The public API exposed by the Rendering Engine:

- **requestFrame()**: Schedules a render run on the next frame tick.
- **invalidateNode(nodeId)**: Marks a Render Tree node as dirty, forcing redraw.
- **switchBackend(backendType)**: Swaps active drawing backend.
- **exportToSVG()**: Renders current scene to an SVG XML document.

---

# 39. Internal API

Low-level methods reserved for the Core framework:

- **drawFrame()**: Executes the pipeline drawing passes.
- **resolveStyles(object)**: Evaluates layout styling parameters.
- **clearDirtyRegions()**: Blits dirty bounding rects to back buffer.

---

# 40. Testing

- Snapshot visual regression testing, pixel-diff checking, and frame rate stress tests under heavy mock models.

---

# 41. ASCII Sequence Diagrams

## 41.1. Frame Rendering Sequence

The diagram below shows the typical frame rendering loop coordination:

```
CanvasEngine      RenderingEngine     ObjectEngine     GeometryEngine      CanvasBackend
    |                   |                  |                 |                  |
    |-- repaint() ----->|                  |                 |                  |
    |                   |-- queryVisible() |                 |                  |
    |                   |-- getObjects() ->|                 |                  |
    |                   |<-- objects ------|                 |                  |
    |                   |                                    |                  |
    |                   |-- transformToScreen() ------------>|                  |
    |                   |<-- screen coordinates -------------|                  |
    |                   |                                                       |
    |                   |-- drawObjects() ------------------------------------->|
    |                   |<-- draw completed ------------------------------------|
    |<-- done ----------|                                                       |
```

## 41.2. Plugin Render Execution Sequence

This diagram details custom rendering for third-party components:

```
RenderingEngine      PluginManager      PluginSandbox      RenderSDK       CanvasBackend
       |                   |                  |                |                 |
       |-- drawObject() -->|                  |                |                 |
       |                   |-- invokeDraw() ->|                |                 |
       |                   |                  |-- drawRect() ->|                 |
       |                   |                  |                |-- drawCall() -->|
       |                   |                  |                |<-- done --------|
       |                   |<-- done ---------|                |                 |
       |<-- done ----------|                                                     |
```

---

# 42. State Diagrams

The rendering lifecycle of nodes inside the Render Tree:

```
       [ Clean ] ─── Modify State ───> [ Invalid ]
           ^                                |
           |                                | Scheduled
           |                                v
           |                         [ Scheduled ]
           |                                |
           | Render                         | Render Frame
           +────────────────────────────────+
```

---

# 43. Future Extensions

- GPU-accelerated post-processing filters, real-time lighting previews, and collaborative pointer visual overlays.

---

# 44. Frame Lifecycle and Frame Ownership

To ensure smooth and consistent canvas rendering:

- **44.1. Frame Dispatch**: The frame lifecycle is initiated by a repaint request from the Canvas Engine. The Rendering Engine owns the graphics buffers, frame contexts, and raster back-buffers, while the Canvas Engine owns the active frame timeline scheduling.
- **44.2. Drawing Passes**: The engine traverses the Render Tree, performing frustum culling and style resolution, then draws the layers, wires, and interactive overlays.
- **44.3. Buffer Presentation**: Once drawing finishes, the back-buffer is committed to the display canvas, completing the frame lifecycle.

---

# 45. Render Tree Construction and Invalidation

- **45.1. Construction**: When a project is loaded, the engine traverses the Object Model hierarchy and builds a matching Render Tree. Each node cache contains pre-calculated Screen Space coordinates and styling directives.
- **45.2. Invalidation**: When an object is modified, the Event Bus publishes an update event. The Rendering Engine catches this, locates the target Render Node, and marks it dirty.
- **45.3. Parent Invalidation**: Invalidation propagates upwards. Marking a child dirty invalidates the parent group's cached bounding box, forcing the engine to recalculate geometry on the next render pass.

---

# 46. Dirty Region Merging and Fragmentation Limits

- **46.1. Region Representation**: Modified regions are represented as simple rectangles enclosing the modified objects.
- **46.2. Merging Limits**: If the count of active dirty rectangles exceeds 8, the engine merges them into their combined bounding box AABB. This prevents CPU overhead from tracking too many clipping boundaries.
- **46.3. Blitting**: On frame execution, the engine clears and redraws only the combined dirty bounds, keeping redraw times low.

---

# 47. Viewport Culling Edge Cases

The engine applies specialized culling guards to handle visual layout boundaries:

- **Edge Crossings**: Objects crossing the viewport boundaries are not culled. Their rendering calls are clipped using canvas clipping boundaries to prevent off-screen pixel writes.
- **Text Label Bounds**: Text labels near the edges are preserved. Bounding queries check both the component's geometry and its text extents to prevent labels from disappearing abruptly when their base components go off-screen.
- **Group Elements**: If a group container overlaps the viewport, all its child components are evaluated for culling individually.

---

# 48. Z-Order and Deterministic Rendering

- **48.1. Sorting Sequence**: Render Tree nodes are sorted sequentially using layer `zIndex` values. Objects on the same layer are sorted by their creation order in the project file.
- **48.2. Deterministic Rendering**: Traversal of the Render Tree is strictly deterministic. Re-rendering a static state yields the exact same pixel-by-pixel output on every frame, which is crucial for visual testing and exports.

---

# 49. Render Batching Rules

To minimize canvas state switches, the engine batches drawing primitives:

- **Batch Keys**: Draw commands are grouped by fill color, stroke parameters, and texture sources.
- **Flushing Criteria**: A batch is committed to the backend when the active stroke style changes or the next object type is encountered.
- **Shader Batches**: Under WebGL, vertices sharing identical shader programs are packed into a single buffer and drawn with one call.

---

# 50. Backend Capability Negotiation

- **Startup Audit**: On launch, the engine queries the browser's WebGL availability and memory limits.
- **Resolution**: If WebGL context creation fails or extensions (e.g., instanced arrays) are missing, the engine automatically selects the HTML Canvas 2D fallback.
- **Capabilities Matrix**: The engine records the negotiated capabilities (e.g., maximum texture size, hardware antialiasing) to adjust caching configurations.

---

# 51. Canvas2D Fallback Strategy

- **RAL Mapping**: When WebGL is unavailable, the Renderer Abstraction Layer (RAL) routes all shader operations to equivalent Canvas2D paths.
- **Texture Simulation**: WebGL texture caches are mapped to off-screen Canvas2D buffers.
- **Degraded Styling**: Heavy visual effects (e.g., drop shadows) are simplified in the fallback mode to maintain rendering speed.

---

# 52. WebGL Context Loss and Recovery

- **Detection**: The engine listens for `webglcontextlost` events on the HTML canvas.
- **Teardown**: Upon loss, the engine pauses frame scheduling, clears texture registries, and discards all compiled shader instances.
- **Restoration**: On `webglcontextrestored`, the engine re-initializes WebGL buffers, compiles the shader programs, re-triangulates the render tree geometries, and triggers a full canvas repaint.

---

# 53. SVG Rendering Limitations

The SVG backend translates interactive elements into static vector paths:

- **Lack of LOD Transitions**: SVGs do not support level-of-detail changes. All internal geometry details are fully drawn.
- **Filter Incompatibility**: Dynamic effects (e.g., glow, shadows) are converted to flat vector representation during export.
- **Text Layout**: Custom font mappings are embedded in the SVG XML header to ensure typography scales correctly on other devices.

---

# 54. Text Shaping, Font Fallback and Missing Fonts

- **Font Fallbacks**: The engine searches for standard local fonts (Inter, Roboto, Arial, sans-serif) in sequence.
- **Placeholder Rendering**: If the requested font is missing, a generic sans-serif placeholder is rendered to prevent text boundaries from collapsing.
- **Text Metrics Caching**: Renders use pre-calculated text dimension caches to speed up layout passes.

---

# 55. Image Decoding and Corrupted Asset Handling

- **Off-Thread Decoding**: Raster assets are decoded asynchronously using off-thread tasks before drawing passes begin.
- **Corrupted Payloads**: If an image fails to load or contains corrupt data, the engine isolates the error, logs a warning, and replaces the asset with a checkered placeholder box.
- **Placeholder Bounds**: Keeps original dimensions for the placeholder to avoid visual layout shifts.

---

# 56. Vector Path Tessellation

- **Triangulation**: Under WebGL, complex shapes (e.g., polygons with holes) are triangulated using the Ear-Clipping algorithm before drawing.
- **Curve Subdivisions**: Bezier curves are divided into linear segment arrays based on curvature tolerances.
- **Cap and Join Math**: Stroke joints are expanded into triangle meshes to render clean caps and miter joins at high zoom scales.

---

# 57. High-DPI Memory Constraints

- **Overhead**: High-DPI screens double or triple the canvas size. A display with a Device Pixel Ratio (DPR) of 3 requires 9 times the memory of standard layouts.
- **Memory Caps**: The engine caps canvas buffer allocations to 64 MB. If screen bounds exceed this limit, the rendering scale is throttled.
- **DPR Throttling**: On low-memory devices, the engine automatically clamps the active DPR to 1.5.

---

# 58. Extreme Zoom Behavior

- **Low Zoom Limits**: Below 10% zoom, grid lines are hidden, and wire widths are clamped to 1 pixel in Screen Space to remain visible.
- **High Zoom Limits**: Canvas zoom is capped at 5000% to prevent coordinate overflow in matrix transformations.
- **Antialiasing Adjustments**: Vector antialiasing parameters are adjusted at extreme zooms to prevent edge distortion.

---

# 59. Level-of-Detail Transition Rules

- **Transition Thresholds**: Symbols switch representations at specific zoom levels (e.g., 25%, 50%).
- **Hysteresis Guard**: The engine applies a 2% zoom buffer to prevent rapid switching (flickering) when the zoom level sits right on a boundary.
- **LOD Traversal**: During LOD changes, the parent Render Node invalidates its layout bounds, requesting a redraw pass.

---

# 60. Render Cache Lifecycle and Eviction

- **Off-screen Buffers**: Complex static components are pre-rendered into off-screen canvas buffers.
- **LRU Eviction**: Cache buffers are managed using a Least Recently Used (LRU) policy. When cache size exceeds 32 MB, the oldest buffers are cleared.
- **Invalidation**: Modifying a cached component instantly clears its matching buffer.

---

# 61. GPU and CPU Memory Budgets

- **GPU Allocations**: Capped at 128 MB (WebGL texture buffers, vertex buffers).
- **CPU Allocations**: Capped at 16 MB (Render tree node layouts).
- **Audit Sweeps**: Memory managers sweep the buffers every 10 seconds to reclaim memory from discarded objects.

---

# 62. Frame-Time Budgets and Benchmarks

The table below outlines target execution budgets to maintain 60 FPS:

| Render Phase | Target Budget (Milliseconds) | Description |
| :--- | :---: | :--- |
| **Preparation** | < 1.0 ms | Viewport queries and culling sweeps |
| **Z-Sorting & Batching** | < 2.0 ms | Order calculation and batch packing |
| **Drawing execution** | < 10.0 ms | Backend canvas vector drawing passes |
| **Frame Flush** | < 1.5 ms | Back-buffer blitting and present checks |
| **Total Frame Time** | < 14.5 ms | Total budget (allowing 1.5ms overhead) |

---

# 63. Large-Project Performance Targets

Performance metrics under heavy schematics containing 10,000 components:

- **Frame Rate Target**: Stable 60 FPS during viewport panning.
- **Culling Rate**: Views must filter out > 90% of objects when zoomed in.
- **Memory Footprint**: Total GPU heap allocations must remain under 64 MB.

---

# 64. Plugin Renderer Registration and Isolation

- **Sandboxed Contexts**: Custom plugin renderers run inside isolated contexts. Direct DOM access is blocked.
- **Registration**: Plugins declare drawing handlers in their manifests. The engine routes target objects to these handlers during execution.
- **Drawing Proxies**: Plugins draw using a sandboxed context API that prevents them from modifying global canvas properties.

---

# 65. Malicious or Failing Plugin Renderers

- **Execution Timeout**: If a plugin renderer blocks execution for more than 5ms, the engine halts the call.
- **Blacklisting**: Faulty renderers are blacklisted for the session.
- **Placeholder Error**: The crashed plugin component is replaced on canvas with a red placeholder warning box.

---

# 66. Render Failure Scenarios and Recovery

- **Context Loss**: Managed using the recovery steps detailed in Section 52.
- **Buffer Allocations Overflows**: Resolved by shrinking cache sizes and scaling down viewport resolutions.
- **Vector Math Failures**: Invalid coordinate shapes are ignored, preventing browser rendering freezes.

---

# 67. NaN and Infinity Geometry Protection

- **Coordinate Sanitization**: Coordinate bounds are verified before drawing dispatches.
- **Replacement Rules**: Coordinates containing NaN or Infinity are replaced with zero bounding points.
- **Telemetry logging**: Corrupted shapes trigger error logging to support debug traces.

---

# 68. Deterministic Export Rendering

- **Bypassing Viewports**: PNG/PDF exports bypass viewport offsets, drawing the exact document bounds using high-resolution raster settings.
- **Font Embedding**: Fonts are converted to vector paths during PDF exports to ensure layout consistency across devices.

---

# 69. Accessibility-Related Rendering Considerations

- **Contrast Modes**: Supports color contrast overrides for readability.
- **Component Highlights**: Keyboard-selected objects are highlighted with distinct outlines.
- **Font Scaling**: Text labels adjust dynamically to match readability preferences.

---

# 70. Complete ASCII Sequence Diagrams

## 70.1. WebGL Context Lost Recovery Sequence

The sequence diagram below shows how the engine handles and recovers from WebGL context losses:

```
CanvasHTML       RenderingEngine     ShaderRegistry      VectorTessellator     EventBus
    |                   |                  |                     |                 |
    |-- contextLost --->|                  |                     |                 |
    |                   |-- pauseFrame() --|                     |                 |
    |                   |-- clearTextures()                      |                 |
    |                   |-- notifyLost() ------------------------------------->|
    |                   |                                        |                 |
    |-- contextRestored>|                                        |                 |
    |                   |-- initWebGL() ---|                     |                 |
    |                   |-- compileShaders()                     |                 |
    |                   |-- rebuildMesh() ---------------------->|                 |
    |                   |-- requestFrame() |                     |                 |
    |<-- repaint -------|                                                          |
```

## 70.2. Dirty Region Merge Sequence

This diagram shows how multiple dirty zones are collected and merged:

```
EventBus         RenderingEngine      InvalidQueue      RegionMerger      CanvasBackend
   |                    |                  |                  |                 |
   |-- objectUpdated -->|                  |                  |                 |
   |                    |-- queueDirty() ->|                  |                 |
   |                    |                  |                  |                 |
   |-- objectUpdated -->|                  |                  |                 |
   |                    |-- queueDirty() ->|                  |                 |
   |                    |                  |                  |                 |
   |                    |-- resolveDirty()------------------->|                 |
   |                    |                                     |-- mergeBounds() |
   |                    |                                     |<-- combined AABB|
   |                    |-- clearRect(AABB) ----------------------------------->|
   |                    |-- redrawFrame(AABB) ---------------------------------->|
```

## 70.3. Plugin Blacklist Sequence

This sequence details handling a plugin renderer crash:

```
RenderingEngine      PluginSandbox      RenderSDK       SystemLogger      CanvasBackend
       |                   |                |                 |                 |
       |-- invokeDraw() -->|                |                 |                 |
       |                   |-- drawRect() ->|                 |                 |
       |                   |   (Crashes)    |                 |                 |
       |                   |<-- exception --|                 |                 |
       |<-- exception -----|                                  |                 |
       |                                                      |                 |
       |-- blacklistPlugin() -------------------------------->|                 |
       |-- drawErrorBox() ----------------------------------------------------->|
```

---

# 71. Complete Rendering State Diagrams

## 71.1. WebGL Backend State

The state machine tracking WebGL resource allocation:

```
                            [ Uninitialized ]
                                    |
                                    v
                             [ Context Audit ]
                                    |
                    +---------------+---------------+
                    |                               |
             (WebGL Support)                (No WebGL)
                    |                               |
                    v                               v
             [ Shaders Ready ]             [ Canvas2D Fallback ]
                    |
              +-----+-----+
              |           |
         Context Lost  Restoration
              |           |
              v           v
       [ Suspended ] ─────+
```

## 71.2. Frame Execution State

The state machine for the rendering loop:

```
                             [ Standby ]
                                  |
                                  | repaint()
                                  v
                          [ Scene Query ]
                                  |
                                  v
                          [ Z-Sort/Batch ]
                                  |
                                  v
                           [ Drawing Pass ]
                                  |
                   +--------------+--------------+
                   |                             |
               (Success)                      (Fail)
                   |                             |
                   v                             v
             [ Flush Buffer ]             [ Revert Frame ]
                   |                             |
                   +--------------+--------------+
                                  |
                                  v
                             [ Standby ]
```

---

# 72. Detailed Rendering Examples for Every Major Pipeline Stage

Below are concrete JSON payload examples representing serialization formats for the core rendering categories:

## 72.1. Viewport Frustum Culling (`core:viewport-cull`)

Represents parameters used to check object intersection against viewport bounds:

```json
{
  "viewportBounds": {
    "minX": 0.0000,
    "minY": 0.0000,
    "maxX": 800.0000,
    "maxY": 600.0000
  },
  "cullingResults": {
    "totalScanned": 250,
    "renderedCount": 42,
    "culledCount": 208
  }
}
```

## 72.2. Batch Draw Collection (`core:render-batch`)

Represents batched drawing operations sharing identical styling variables:

```json
{
  "batchId": "batch-12",
  "style": {
    "stroke": "#ff0000",
    "strokeWidth": 2.0000,
    "lineDash": []
  },
  "geometryList": [
    { "type": "line", "points": [10.0000, 20.0000, 100.0000, 20.0000] },
    { "type": "line", "points": [50.0000, 80.0000, 150.0000, 80.0000] }
  ]
}
```

## 72.3. Tessellated Vertex Buffer (`core:webgl-vertices`)

Represents triangulated vertex buffers sent to WebGL shaders:

```json
{
  "bufferId": "vbo-48",
  "primitiveType": "TRIANGLES",
  "vertices": [
    0.0, 0.0, 1.0, 0.0, 0.0,
    1.0, 0.0, 1.0, 0.0, 0.0,
    0.0, 1.0, 1.0, 0.0, 0.0
  ]
}
```
