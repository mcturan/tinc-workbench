# Canvas Engine Specification

**Project:** TINC Workbench
**Version:** 0.1.0-draft

---

# 1. Purpose

The Canvas Engine provides an infinite drawing surface. It is responsible only for visualization and user interaction. Engineering data is owned by the Object Engine.

---

# 2. Responsibilities

- Infinite canvas
- Pan
- Zoom
- Coordinate conversion
- Grid rendering
- Guide rendering
- Selection rendering
- Hit testing
- Viewport management

---

# 3. Non-Responsibilities

The Canvas Engine does NOT:

- Store project data
- Validate engineering objects
- Execute commands
- Save projects

---

# 4. Coordinate Systems

Three coordinate spaces exist:

- Screen Coordinates
- Viewport Coordinates
- World Coordinates

All objects are stored in World Coordinates.

---

# 5. Viewport

Viewport properties:

- centerX
- centerY
- zoom
- rotation (reserved)

---

# 6. Navigation

Required:

- Mouse wheel zoom
- Middle-button pan
- Touchpad support
- Touch gestures (future)
- Keyboard shortcuts

---

# 7. Grid

Support:

- Hidden
- Dot grid
- Line grid

Grid spacing is configurable.

---

# 8. Snapping

Snap targets:

- Grid
- Guides
- Object bounds
- Object centers
- Ports
- Connections

---

# 9. Selection

Selection modes:

- Single
- Multiple
- Rectangle
- Lasso (future)

---

# 10. Rendering Pipeline

Render order:

1. Background
2. Grid
3. Layers
4. Objects
5. Connections
6. Selection
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

---

# 13. Future Features

- Minimap
- Infinite rulers
- Multiple synchronized views
- GPU rendering backend
