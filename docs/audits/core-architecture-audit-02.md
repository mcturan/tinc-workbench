# Second Core Architecture Audit Report

**Project:** TINC Workbench
**Status:** Audit Resolution & Freeze Evaluation
**Date:** July 14, 2026

---

## Executive Summary
This report presents the findings of the **Second Full Core Architecture Audit** of TINC Workbench. Following the successful application and verification of all six architectural patch sets (concluding at baseline commit `c85add6`), this audit reviews the complete, unified specifications as a single system. The evaluation confirms that the core architectural boundaries, dependency flows, mutation lifecycles, and plugin security models are cohesive, robust, and free of contradictions. The core system is determined to be ready for **Architecture Freeze** and immediate implementation planning.

---

## A. Canonical Ownership Matrix

| State / Responsibility | Canonical Owner | Allowed Readers | Allowed Mutation Path | Persistence Owner | Prohibited Owners |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Canonical Project State** | Object Engine | Command Engine, Storage Engine, Tool System, Selection Engine, Rendering Engine | Command Engine Orchestration | Storage Engine (`.twb`) | History Engine, Canvas Engine, Plugins |
| **Runtime Object Registry** | Object Engine | Command Engine, Storage Engine, Geometry Engine, Rendering Engine | Command Engine Orchestration | Storage Engine (`.twb`) | History Engine, Canvas Engine |
| **Semantic Indexes** | Object Engine | Command Engine, Storage Engine, Tool System, Selection Engine | Command Engine Orchestration | Storage Engine (`.twb`) | History Engine, Geometry Engine |
| **LogicalConnection** | Object Engine | Connection & Wire Engine, Geometry Engine, Storage Engine, Plugins | Command Engine Orchestration | Storage Engine (`.twb`) | Wires, Ports, Pins |
| **Endpoint** | Object Engine (inside LogicalConnection) | Connection & Wire Engine, Geometry Engine, Storage Engine | Command Engine Orchestration | Storage Engine (`.twb`) | Wires, Ports, Pins |
| **Wire Segment Trace** | Object Engine | Connection & Wire Engine, Geometry Engine, Rendering Engine | Command Engine Orchestration | Storage Engine (`.twb`) | Ports, Pins, Endpoints |
| **Viewport Runtime State** | Canvas Engine | UI Framework, Rendering Engine, Page-State Adapter | Canvas Engine Zoom/Pan APIs | Page-State Adapter / Application Orchestrator | Storage Engine (directly) |
| **Persisted Viewport State** | Page-State Adapter / Application Orchestrator | Storage Engine | Page-State Adapter updates | Storage Engine (`.twb` metadata) | Canvas Engine, Object Engine |
| **Selection State & Ordering** | Selection Engine | Rendering Engine, Tool System, Command Engine, Event Bus | Tool System selection intent/IDs dispatch | None (Runtime-only) | Object Engine, Canvas Engine |
| **Selection Bounds Cache** | Selection Engine | Rendering Engine | Selection Engine box-union queries to Geometry Engine | None (Derived cache) | Geometry Engine, Object Engine |
| **Transform Matrix Caches** | Geometry Engine | Rendering Engine, Selection Engine, Tool System | Geometry Engine auto-invalidation on Object Engine mutation | None (Derived cache) | Object Engine, Selection Engine |
| **Bounds Caches (AABB/OBB)** | Geometry Engine | Rendering Engine, Selection Engine, Tool System | Geometry Engine auto-invalidation on Object Engine mutation | None (Derived cache) | Object Engine, Selection Engine |
| **Spatial Indexes (Quadtree)** | Geometry Engine | Tool System (coordination queries) | Geometry Engine updates on Object Engine mutation | None (Derived cache) | Selection Engine, Canvas Engine |
| **Hit-Test Geometry Caches** | Geometry Engine | Tool System (coordination queries) | Geometry Engine updates on Object Engine mutation | None (Derived cache) | Selection Engine, Canvas Engine |
| **Render Tree Caches** | Rendering Engine | WebGL/WebGPU context | Rendering Engine update handlers on Event Bus events | None (GPU/memory-only) | Canvas Engine, Object Engine |
| **Tessellation/GPU Resources** | Rendering Engine | WebGL/WebGPU context | Rendering Engine update handlers on Event Bus events | None (GPU/memory-only) | Canvas Engine, Object Engine |
| **History DAG & Cursor** | History Engine | Command Engine, Storage Engine | Command Engine (cursor shifts / node appends) | Storage Engine (`.twh`) | Object Engine, Plugins |
| **TWB Serialization** | Storage Engine | None | Storage Engine file save orchestrations | Storage Engine (writes to disk) | Object Engine, Canvas Engine |
| **TWH Serialization** | Storage Engine | None | Storage Engine file save orchestrations | Storage Engine (writes to disk) | History Engine |
| **Plugin Authorization** | Permission Manager (inside Plugin Manager) | Plugin Manager, Plugin SDK Gateways | User prompts or manifest validations | Plugin Manager configuration | Storage Engine, Plugins |
| **Plugin Physical Storage** | Storage Engine | Scoped StorageProvider API (authorized plugins) | Scoped StorageProvider API delegated writes | Storage Engine (sandboxed folder) | Plugins (unrestricted filesystem access) |
| **Raw DOM Input** | UI Framework / Input Router | Input Router | Browser DOM events | None | Canvas Engine, Tool System |
| **Normalized Input & Gestures** | Tool System | None | Input Router dispatches normalized events | None | Canvas Engine, Selection Engine |
| **Command Mutation Orchestration** | Command Engine | None | Tool System / UI Framework dispatches commands | History Engine logs | Object Engine, History Engine |

---

## B. Dependency Direction Audit

Prose and diagrams across the core specification files conform strictly to the layered architecture defined in `system-architecture.md`. The dependency graph is unidirectional, flowing from high-level user interface and plugin layers down to utility, caching, and core state registers.

### Verified Absence of Forbidden Dependency Edges
1. **Object Engine → History Engine:** Verified absent. Object Engine is completely ignorant of History Engine.
2. **History Engine → Object Engine Mutation:** Verified absent. Replay/Reverse operations route exclusively through Command Engine.
3. **Canvas Engine → Tool System raw input dispatch:** Verified absent. DOM input router normalizes events and dispatches to Tool System.
4. **Storage Engine → Canvas Engine runtime query:** Verified absent. Viewport runtime states are persisted via Page-State Adapter.
5. **Rendering Engine → Object Engine Mutation:** Verified absent. Rendering Engine is read-only.
6. **Geometry Engine → Canonical Document Mutation:** Verified absent. Geometry Engine acts as a read-only cache and math utility service.
7. **Selection Engine → Quadtree direct ownership/query:** Verified absent. Tool System coordinates Quadtree index queries and dispatches candidate IDs to Selection Engine.
8. **Selection Engine → Geometric hit-test computation:** Verified absent. Tool System queries Geometry Engine hit-testing APIs.
9. **Wire → Endpoint / Port / Pin ownership:** Verified absent. LogicalConnection owns Endpoint structures. Wires reference connections via `logicalConnectionId`.
10. **Plugin → Object Engine direct mutation:** Verified absent. Plugins must request `project.mutate` and execute mutations via the Command Engine.
11. **Plugin SDK → Canonical state ownership:** Verified absent. Plugin SDK is a pure contract facade.
12. **Storage Engine → Plugin permission decisions:** Verified absent. Storage Engine enforces the physically sandboxed boundary but does not make authorization decisions.

### Dependency Edge Table

| Source Subsystem | Target Subsystem | Edge Type | Description |
| :--- | :--- | :--- | :--- |
| **UI Framework / Input Router** | Tool System | Event Dispatch | Dispatches normalized pointers, gestures, and keys. |
| **Tool System** | Geometry Engine | Query Coordination | Queries Quadtree and hit-testing APIs for coordinate mappings. |
| **Tool System** | Selection Engine | State Command | Dispatches candidate ID sets to update active selections. |
| **Tool System** | Command Engine | Command Dispatch | Dispatches canonical commands for user interactions. |
| **Command Engine** | Object Engine | State Mutation | Performs validated, canonical state changes. |
| **Command Engine** | History Engine | Timeline Append | Appends history nodes and updates the active cursor position. |
| **Command Engine** | Event Bus | Notification | Publishes committed change events to subscribers. |
| **Selection Engine** | Geometry Engine | Math Query | Queries bounding box union and selection bounds aggregation. |
| **Storage Engine** | Object Engine | State Snapshot | Pulls read-only canonical active project snapshot. |
| **Storage Engine** | History Engine | Timeline Snapshot | Pulls read-only history DAG and cursor metadata snapshot. |
| **Storage Engine** | Page-State Adapter | Viewport Snapshot | Pulls persisted viewport configuration metadata. |
| **Plugin Manager** | Storage Engine | Scoped Delegation | Scopes StorageProvider physical directories and delegates writes. |
| **Rendering Engine** | Object Engine | Read Registry | Pulls components and wire vectors for visual pipeline. |
| **Rendering Engine** | Geometry Engine | Cache Query | Pulls calculated matrix transformations and bounding boxes. |
| **Rendering Engine** | Selection Engine | Projection Query| Pulls selection bounds and outlines for handle overlays. |

---

## C. Canonical Mutation Audit

The mutation lifecycle has been verified across all core paths (Normal, Undo/Redo, Replay, Tool, UI, Deletion Cascade, Clone, and Plugin).

```
[Tool System / UI / Plugin]
            │
            ▼
   ┌─────────────────┐
   │ Command Engine  │
   └────────┬────────┘
            │ 1. Validate
            ▼
   ┌─────────────────┐
   │  Object Engine  │
   └────────┬────────┘
            │ 2. Mutate (Success)
            ▼
   ┌─────────────────┐
   │ History Engine  │
   └────────┬────────┘
            │ 3. Record Node
            ▼
   ┌─────────────────┐
   │    Event Bus    │
   └─────────────────┘
     4. Publish committed event (0-100 Priority)
```

### Key Verification Metrics
* **Failed Mutations:** If validation or Object Engine mutation fails, the transaction is immediately aborted. No history node is written, and no committed Event Bus notification is published.
* **Coherent Rollback:** If a mutation succeeds in Object Engine but History Engine recording fails, the Command Engine triggers a rollback of the Object Engine state, restoring the system to its pre-mutation baseline.
* **Undo/Redo (Reverse/Replay):** Reversing or replaying a command executes mutations in the Object Engine via inverse/forward steps without writing a new history node or moving the cursor metadata until completion.
* **No Bypass:** Object Engine enforces that canonical mutations are only accepted from the Command Engine's execution boundary.

---

## D. Object Model and Connection Semantics

The decoupled connection model is consistently applied across all specifications.

### Connection Architecture
1. **Ports and Pins:** Owned exclusively by Semantic Objects (Components) as sub-components.
2. **LogicalConnection:** Serves as the canonical netlist link owner, persisting source and target Endpoint objects.
3. **Endpoint Discriminated Union:**
   * `PORT`: Requires `targetId` (format: `component-id:port-id`), forbids `coordinate`.
   * `PIN`: Requires `targetId` (format: `component-id:pin-id`), forbids `coordinate`.
   * `FLOATING`: Requires `coordinate` (format: `{ x, y }`), forbids `targetId`.
4. **Wire:** Contains visual layout information (`segments`, `style`, `metadata`) and references a single connection via `logicalConnectionId`. Wires own no endpoints, port/pin bindings, or `netId` properties.
5. **Persisted Geometry:** Persisted Wire geometry is represented exclusively by `segments` (each segment contains a `start` coordinate and an `end` coordinate). Vertices are derived/transient routing or editing representations only.
6. **Net Membership Resolution:** Wire/segment net membership is resolved dynamically through: `logicalConnectionId` -> `LogicalConnection` -> `netId`. Wires/segments do not store `netId`.
7. **Junction Dots:** Junction dots are derived and non-canonical. Temporary connectivity graphs may use derived intersection-coordinate nodes, but these are not persisted Junction entities.
8. **Undo/Redo:** Restores exact segment geometry and the complete Endpoint union state (type, targetId/coordinate).

### Schema Payloads
All clone, delete, cascade, and split-merge example payloads utilize `logicalConnectionId`, `FLOATING` endpoints, and update physical trace segments without violating endpoint ownership rules.

---

## E. Input / Tool / Canvas / Selection

Interaction responsibilities are cleanly isolated:

* **UI Framework / Input Router:** Binds DOM listeners, normalizes pointer coordinates, handles DOM capturing, and forwards clean inputs to the Tool System.
* **Tool System:** Interprets multi-stage gestures (marquee drag, click, lasso draw, click cycling). Coordinates Geometry Engine queries for geometric candidates before dispatching selection intents.
* **Geometry Engine:** Owns derived runtime geometry caches and spatial indexes, while exposing stateless mathematical utility functions for geometric calculations.
* **Selection Engine:** Maintains active selection set, primary reference, selection ordering, cycling indexes, and group drill-down navigation breadcrumbs.
* **Canvas Engine:** Owns active runtime viewport zoom/pan states. Exposes coordinate conversions.
* **Rendering Engine:** Exclusively draws selection highlights, transform handles, and dashed marquee rectangles. Canvas Engine does not draw selection visuals.

---

## F. Geometry / Rendering / Cache Audit

To prevent stale cache visual states, the cache lifecycle is governed by the following committed invalidation cascade:

```
[Command Engine Commit] ──> [Committed Event Bus Event] ──> [Geometry Cache Invalidate] ──> [Rendering WebGL Rebuild] ──> [Next Frame Draw]
```

### Cache Ownership Rules
* **Object Engine:** Canonical object registry and semantic indices.
* **Geometry Engine:** Transform matrices, AABB/OBB bounds caches, spatial Quadtree indexes, and hit-testing caches.
* **Selection Engine:** Selection-specific bounds cache (derived only).
* **Rendering Engine:** WebGL/GPU vertex/index buffers, shader programs, dirty-region caches, and render trees.
* **Lazy Computation:** Geometry transform caches are updated lazily on next reader query, while rendering buffers are rebuilt during the frame sweep following dirty-region flag invalidation.

---

## G. Storage / TWB / TWH Audit

The storage lifecycle strictly separates canonical active state (`.twb` format) from historical state (`.twh` format).

* **Storage Engine Domain:** Owns TWB/TWH file format specifications, JSON schema validations, migration runners, and atomic disk writes (via `.tmp` writing followed by POSIX rename).
* **Coexistence Recovery Matrix:**

| Scenario | System State | Recovery Protocol |
| :--- | :--- | :--- |
| **TWB succeeds / TWH fails** | Save considered successful | Log warning; history recovery is unavailable for this session. |
| **TWH succeeds / TWB fails** | Inconsistent state blocked | Order is TWB first. TWB failure aborts operation and rolls back. |
| **TWB missing / TWH exists** | Fatal load failure | Abort load. TWH cannot form a standalone project. |
| **TWB exists / TWH missing** | Project loaded successfully | Fresh history timeline is initialized at the current TWB active state. |
| **Revision Mismatch** | Project loaded successfully | Discard mismatched TWH; initialize fresh timeline at TWB active state. |
| **Corrupt TWH / Valid TWB** | Project loaded successfully | Discard corrupt TWH; initialize fresh timeline. |
| **Interrupted write** | Data integrity preserved | Temporary file write rename ensures valid previous file is intact. |

---

## H. Event Bus Audit

* **Event Priority Model:** Event priorities are represented exclusively as integers between `0` and `100`. Higher numeric values indicate higher delivery priority. No legacy `1-5` priority levels remain.
* **Mutation Segregation:** Committed mutation events are published on the Event Bus strictly after the History Engine records the successful command.
* **Transient Events:** Preview, hovering, and dragging events are explicitly marked as transient/non-canonical and use unique namespaces (`preview:*`, `transient:*`) to prevent collision with committed handlers.
* **Isolation:** Plugin event namespaces are isolated to prevent cross-contamination. Subscription to events does not grant `project.mutate` permissions.

---

## I. Plugin Security Audit

Security enforces deny-by-default execution boundaries using manifest capabilities:

### Manifest Capabilities
* `project.read`, `project.mutate`, `command.register`, `event.subscribe`, `tool.register`, `ui.register`, `storage.read`, `storage.write`, `network.access`, `clipboard.read`, `clipboard.write`.

### Security Gateways
* **Deny-by-Default:** Any capability not declared in the manifest is blocked. Manifest validation fails on load if unknown or invalid capability names are present.
* **No Direct Access:** Plugins cannot directly mutate the Object Engine or read state bypassing the SDK facade.
* **Storage Sandbox:** Scoped StorageProvider exposes only conceptual file actions (`read`, `write`, `delete`, `list`, `exists`) scoped to `/plugins/sandbox/[plugin-id]/`. Path traversal containing `../` is rejected. Quota limits are enforced at the Storage Engine boundary.
* **Crash Isolation:** Plugin exceptions are caught at the SDK gateway; failing scripts are isolated and deactivated without halting the core workbench process.

---

## J. Specification Contract Audit

All documents have been scanned for legacy, circular, or contradictory references:

* **File Scheme:** Checked. No `file://` scheme references exist in any specification document.
* **Collaboration Service:** Checked. The premature Version 1 Collaboration Service references have been successfully removed, leaving only historical/prohibited remarks in the audit and Resolution documents.
* **Priority Ranges:** Checked. Event Bus priorities are aligned on the `0-100` scale.
* **Connection/Wire Wording:** Checked. Wire segment specifications and LogicalConnection endpoint structures are fully decoupled.

---

## K. Implementation Readiness Audit

This audit has identified two **INFORMATIONAL/LOW** findings that do not block the architecture freeze and may be safely deferred to the implementation phase.

### AUD2-001: Scoped Storage Key-Value Setting API
* **Severity:** INFORMATIONAL
* **Files:** `docs/specifications/plugin-sdk.md`
* **Sections:** `# 9. Scoped Storage Provider`
* **Description:** The scoped StorageProvider currently defines file-based operations (`read`, `write`, etc.) for plugins. However, simple plugins may only need to persist key-value configurations or settings rather than managing physical files.
* **Architectural Impact:** None.
* **Required Resolution:** Consider exposing a lightweight `settings.get(key)` / `settings.set(key, value)` API in the SDK facade during the implementation phase.
* **Implementation Wait:** No.

### AUD2-002: Geometry Cache Expiration Policy Details
* **Severity:** LOW
* **Files:** `docs/specifications/geometry-engine.md`
* **Sections:** `# 9. Geometry Cache Registry`
* **Description:** The Geometry Engine owns derived transform and bounds caches. While invalidation cascade is defined, the details of cache eviction policies (e.g., LRU cache sizes for massive schematic layouts, or immediate frame-end flushing) are left open.
* **Architectural Impact:** High memory consumption if caching is unbounded, or performance overhead if caches are evicted too aggressively.
* **Required Resolution:** Implement a clear cache expiration threshold policy (such as a maximum size of cached transforms or an immediate clean-on-dirty frame boundary strategy) during coding.
* **Implementation Wait:** No.

---

## FINAL VERDICT

**READY FOR ARCHITECTURE FREEZE**

Implementation planning and code generation may proceed immediately. The two low/informational findings (AUD2-001, AUD2-002) may be deferred and addressed during active development.
