# Canvas Engine Specification

**Project:** TINC Workbench
**Version:** 0.1.0-draft

---

# 1. Purpose

The Canvas Engine provides an infinite drawing surface and owns runtime viewport state. It is responsible for viewport services, coordinate conversion, canvas navigation state, and visualization coordination. Raw DOM input intake is owned by the UI Framework Input Router, and engineering data is owned by the Object Engine.

---

# 2. Responsibilities

- Infinite canvas
- Pan
- Zoom
- Coordinate conversion
- Grid rendering
- Guide rendering
- Runtime viewport state
- Runtime layout cache
- Viewport management
- Page-state adapter output for viewport persistence orchestration

---

# 3. Non-Responsibilities

The Canvas Engine does NOT:

- Store project data
- Own raw DOM pointer, keyboard, touch, or wheel event dispatch
- Route input events to the Tool System
- Depend on the Tool System
- Validate engineering objects
- Execute commands
- Save projects
- Serialize viewport state directly to project files

---

# 4. Coordinate Systems

Three coordinate spaces exist:

- Screen Coordinates
- Viewport Coordinates
- World Coordinates

All objects are stored in World Coordinates.

---

# 5. Viewport

The Canvas Engine owns runtime viewport state for the active canvas view.

Viewport properties:

- centerX
- centerY
- zoom
- rotation (reserved)

Viewport persistence crosses a Page-State Adapter or Application Orchestrator boundary. The Canvas Engine exposes runtime viewport state to that boundary; the Storage Engine serializes the provided persisted state and remains ignorant of Canvas runtime services.

---

# 6. Navigation

Navigation state is updated through normalized input routed by the UI Framework Input Router. Canvas may process viewport navigation requests but does not capture raw DOM events.

Required navigation capabilities:

- Wheel zoom requests routed by the UI Framework Input Router
- Middle-button pan
- Touchpad support
- Touch gestures (future)
- Keyboard navigation requests routed by the UI Framework Input Router

---

# 7. Grid

Support:

- Hidden
- Dot grid
- Line grid

Grid spacing is configurable.

---

# 8. Snapping

The Canvas Engine stores runtime snapping settings that affect the view. Mathematical snap resolution belongs to the Geometry Engine, and gesture-level snap orchestration belongs to the Tool System.

Examples of snap settings:

- Enabled state
- Grid spacing
- Guide visibility
- Snap indicator visibility

---

# 9. Selection

The Canvas Engine does not own selection state, selection hit interpretation, or selection overlay rendering. Selection state belongs to the Selection Engine, tool gesture interpretation belongs to the Tool System, and selection overlays are rendered by the Rendering Engine.

Canvas provides coordinate and viewport services used by those systems.

---

# 10. Rendering Pipeline

Render order:

1. Background
2. Grid
3. Layers
4. Objects
5. Connections
6. Selection overlays
7. Guides
8. UI overlays

---

# 11. Performance Requirements

- Smooth pan and zoom
- Dirty-region rendering where possible
- Virtualization for large projects
- Target: 60 FPS on typical hardware

---

# 12. Public API

Core operations:

- zoomIn()
- zoomOut()
- setZoom()
- pan()
- worldToScreen()
- screenToWorld()
- fitSelection()
- centerViewport()
- getViewportState()
- getViewportSnapshot()
- applyViewportState(state)

Pointer capture is mediated through the UI Framework Input Router DOM boundary and requested by the Tool System. The Canvas Engine does not perform raw DOM input routing or pointer capture.

---

# 13. Input Boundary

Required dependency direction:

UI Framework / Input Router → Tool System → Canvas Engine coordinate and viewport services.

Rules:

- UI Framework Input Router owns raw DOM pointer, keyboard, touch, and wheel event intake.
- Input Router normalizes input and routes it to the Tool System.
- Tool System owns gesture and tool interpretation.
- Tool System may query Canvas Engine coordinate conversion and runtime viewport services.
- Canvas Engine must not call, import, dispatch to, or otherwise depend on the Tool System.
- Canvas Engine may emit viewport state changes through the Event Bus but must not use those events as a Tool System dispatch path.

---

# 14. Runtime Layout Cache

The Canvas Engine manages the runtime layout cache for viewport-relative transforms. The cache is recalculated from runtime viewport state and Geometry Engine math.

The runtime layout cache is transient and is not canonical project state. It is excluded from project serialization.

---

# 15. Future Features

- Minimap
- Infinite rulers
- Multiple synchronized views
- GPU rendering backend
