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
- Windows
- Panels
- Inspector
- Toolbar
- Status bar
- Command palette

The UI never contains business logic.

---

# 4. Tool System

Provides interactive editing tools.

Examples:
- Select
- Hand
- Rectangle
- Text
- Wire
- Measure

Tools communicate only through the Command Engine.

---

# 5. Command Engine

Every user action is represented as a Command.

Properties:
- Undo
- Redo
- Serializable
- Replayable

Examples:
- MoveObjectCommand
- DeleteObjectCommand
- CreateWireCommand

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
- Infinite canvas
- Pan
- Zoom
- Grid
- Guides
- Hit testing

Canvas never owns engineering data.

---

# 8. Object Engine

Owns every project object.

Objects include:
- Shapes
- Symbols
- Components
- Images
- Text
- Wires

Semantic objects extend the same base model.

---

# 9. Geometry Engine

Provides:
- Coordinate transforms
- Bounding boxes
- Rotation
- Alignment
- Snapping
- Spatial queries

---

# 10. History Engine

Stores command history.

Supports:
- Undo
- Redo
- Branching (future)

---

# 11. Event Bus

Loose coupling between modules.

Example events:
- ObjectCreated
- ObjectDeleted
- SelectionChanged
- ProjectSaved

---

# 12. Storage Engine

Responsibilities:
- Load
- Save
- Autosave
- Recovery
- Version migration

Primary format:
- .twb

---

# 13. Rendering Engine

Responsible only for rendering.

Must remain independent from business logic.

Future renderers may include:
- HTML Canvas
- WebGL
- SVG

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

