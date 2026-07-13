# System Architecture

**Project:** TINC Workbench
**Version:** 0.1.0-draft

---

# 1. Overview

TINC Workbench is organized as a layered architecture. Each layer has a single responsibility and communicates through well-defined interfaces.

```
Application
    │
UI Framework
    │
Tool System
    │
Command Engine
    │
Core Services
 ├── Canvas Engine
 ├── Object Engine
 ├── Geometry Engine
 ├── History Engine
 ├── Event Bus
 ├── Storage Engine
 ├── Plugin Manager
 └── Rendering Engine
```

---

# 2. Application Layer

Responsible for:
- Startup
- Configuration
- Dependency injection
- Plugin discovery
- Workspace lifecycle

---

# 3. UI Framework

Responsible for:
- Windows, Panels, Inspector, Toolbar, Status bar, Command palette.
- UI Framework and Input Router own raw DOM input, translating it to normalized input events.

The UI never contains business logic.

---

# 4. Tool System

Provides interactive editing tools.
- Consumes normalized input from the UI Framework / Input Router.
- Owns gesture/tool interpretation.
- May query Canvas Engine coordinate/viewport services to map screen coords to world space.
- Tools communicate only through the Command Engine.

---

# 5. Command Engine

Every user action is represented as a Command. The Command Engine acts as the sole orchestration boundary for canonical mutations.

Canonical mutation ordering:
`Command Engine -> validation -> Object Engine mutation -> validated mutation success -> History Engine record -> committed Event Bus publication`

Properties:
- Undo: Uses Command Engine reverse orchestration.
- Redo/Recovery: Uses Command Engine replay orchestration.
- Replay/Reverse operations do not create ordinary duplicate history nodes.

---

# 6. Core Services

The Core coordinates every subsystem.

Responsibilities:
- Project lifecycle
- Service registry
- Global settings
- Event routing

---

# 7. Canvas Engine

Responsible for:
- Infinite canvas, Pan, Zoom, Grid, Guides, Hit testing.
- Canvas Engine owns runtime viewport state.
- Persisted viewport state crosses the Page-State Adapter / Application Orchestrator.
- The Canvas Engine must not dispatch raw input events to the Tool System.
- Canvas never owns engineering data.

---

# 8. Object Engine

Owns the canonical runtime registry and semantic indexes.
- Decoupled from and ignorant of the History Engine.
- Does not publish committed events (orchestrated by Command Engine).
- Does not own Geometry Engine matrix caches, derived bounds caches, spatial indexes, or rendering caches.
- Canonical objects include Components, Ports, Pins, LogicalConnections, and Wires:
  - `LogicalConnection` exclusively owns `Endpoint` objects (discriminated union PORT, PIN, FLOATING).
  - `Wire` has zero Endpoint ownership and references its LogicalConnection via `logicalConnectionId`.

---

# 9. Geometry Engine

Provides:
- Coordinate transforms, Bounding boxes, Rotation, Alignment, Snapping, Spatial queries.
- Owns all derived geometric caches (transformation matrices, derived bounds caches like AABB/OBB, spatial Quadtree indexes, and hit-test geometry caches).
- Never mutates canonical document state.

---

# 10. History Engine

Stores history DAG sequences.
- Completely read-only relative to the Object Engine.
- Never directly mutates the Object Engine; mutations must go through the Command Engine.

---

# 11. Event Bus

Coordinates loose coupling between modules.
- Event Bus priority is represented as an integer from 0 to 100; higher numbers indicate higher delivery priority.
- Preview/transient events are explicitly non-canonical.

---

# 12. Storage Engine

The Storage Engine alone owns TWB/TWH serialization, deserialization, format validation, migration orchestration, and atomic disk writes.
- `TWB` Version 1 is a single UTF-8 JSON project document containing canonical active project state and embedded Base64 assets (no external assets directory required).
- `TWH` is a separate, supplementary recoverable history sidecar containing the history DAG, active cursor, branch, and checkpoint states.
- The Storage Engine must remain ignorant of Canvas Engine runtime services; it retrieves viewport states through the Page-State Adapter / Application Orchestrator.

---

# 13. Rendering Engine

Responsible only for rendering:
- Owns all derived/disposable rendering caches (render tree caches, tessellation/render buffers, GPU/CPU resources, and dirty region/frame caches).
- Never mutates Object Engine or canonical document state.
- Read-only, consumes derived geometry from the Geometry Engine, and requests/recomputes on cache misses.

---

# 14. Plugin Manager

Loads plugins.

Plugins may register:
- Objects
- Tools
- Panels
- Commands
- Importers
- Exporters
- Simulators

Plugins never modify Core directly.

---

# 15. AI Integration

AI communicates through public APIs.

AI cannot bypass:
- Command Engine
- Permissions
- Project model

---

# 16. Design Rules

- Separation of concerns
- Plugin-first architecture
- Local-first storage
- Open file format
- Semantic engineering objects
- Document before code

---

# 17. Dependency Direction Rules

To ensure strict layering, clean separation of concerns, and prevent circular dependencies, the following relationships are explicitly prohibited:
- **Object Engine → History Engine**: The Object Engine must remain completely ignorant of the History Engine.
- **History Engine → Object Engine mutation**: The History Engine never directly mutates Object Engine states; all undo/redo operations must route via the Command Engine.
- **Canvas Engine → Tool System input dispatch**: The Canvas Engine must not dispatch raw input events directly to the Tool System.
- **Storage Engine → Canvas Engine runtime query**: The Storage Engine must not query the Canvas Engine directly for viewport or runtime layout parameters. Viewport state crosses the Page-State Adapter / Application Orchestrator.
- **Rendering Engine → Object Engine mutation**: The Rendering Engine never mutates Object Engine or canonical document state.
- **Geometry Engine → canonical document mutation**: The Geometry Engine never mutates canonical document state.
- **Wire → Port/Pin endpoint ownership**: Wires must not own Port or Pin endpoints. Wires represent routed segments and reference LogicalConnections via `logicalConnectionId`. Endpoints are owned strictly by `LogicalConnection` objects.

