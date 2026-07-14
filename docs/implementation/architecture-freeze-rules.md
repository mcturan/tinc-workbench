# TINC Workbench Architecture Freeze Guardrails

This document establishes the binding rules for all coding agents during the implementation of TINC Workbench Version 1. The core architecture is frozen; modifications to specification documents are strictly prohibited.

---

## 1. Core Implementation Guardrails

### A. Subsystem Ownership
* **Normative Specs**: The specifications under `docs/specifications/` are the absolute source of truth. Coding agents must not silently shift responsibilities between engines.
* **No Direct Object Mutation**: No subsystem (especially plugins or history undo/redo) may mutate the Object Engine directly. All mutations must route through the `Command Engine`.
* **No Direct Canvas Drawing**: Selection outlines, transform handles, and dashed marquee overlays are drawn exclusively by the `Rendering Engine`. The `Canvas Engine` is forbidden from drawing selection visuals.

### B. Dependency Direction
* Circular dependencies between modules are strictly prohibited.
* The dependency graph must match the unidirectional flow defined in `system-architecture.md`:
  `UI / Input Router -> Tool System -> Selection Engine -> Command Engine -> Object Engine -> Event Bus`.
* Downstream engines must never import or call upstream engines directly. Use the priority-based `Event Bus` for reverse notifications.

### C. Persistent vs. Derived Cache States
* Matrix caches, derived bounds, spatial Quadtrees, and WebGL buffers are derived, runtime-only state owned by Geometry/Rendering.
* Coding agents must not serialize these caches to `.twb` files or store them in the canonical `Object Engine` registry.
* All cache updates must react to Event Bus events.

### D. Wire Connection Decoupling
* Wires represent physical paths and contain a `segments` array. They do not own `Endpoint` objects, Port/Pin target IDs, or `netId`.
* Wires reference connections via `logicalConnectionId`. Net membership must resolve via:
  `Wire -> logicalConnectionId -> LogicalConnection -> netId`.

### E. Plugin Sandboxing
* Plugins are denied access by default. Manifest capabilities must be checked at the SDK gateway before executing any privileged API operation.
* StorageProvider must be jailed within `/plugins/sandbox/[plugin-id]/`. Path traversal (`../`) is a critical security violation.

---

## 2. Architecture Exception Request Format

If a coding agent discovers an implementation-blocking specification contradiction, it must immediately halt and file an **Architecture Exception Request (AER)**. No specifications may be modified without this approved request.

### Exception Request Template
```markdown
# Architecture Exception Request (AER-XXX)

## 1. Affected Subsystem
[e.g., Storage Engine / Selection Engine]

## 2. Specification Conflict
[Specify the exact document, section, and contradictory requirement]

## 3. Implementation Blocker
[Describe why the current frozen specification prevents code implementation]

## 4. Proposed Resolution
[Provide the exact text changes proposed for the specifications]

## 5. Architectural & Downstream Impact
[List affected tasks, dependencies, and contract changes]
```
