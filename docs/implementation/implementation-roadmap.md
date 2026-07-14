# TINC Workbench Version 1 Implementation Roadmap

This document maps out the concrete, dependency-driven execution pathway for implementing Version 1 of TINC Workbench.

---

## 1. Repository Baseline Assessment
* **Existing Programming Languages**: Markdown (specifications), Bash (bootstrap scripts). No TypeScript/JavaScript source code is currently present.
* **Package Manager**: npm (Node Package Manager).
* **Runtime/Build Environment**: Node.js v20+ with TypeScript compilation.
* **Frontend Framework**: None (vanilla HTML5 canvas for schematic rendering).
* **Test Framework**: Jest (for TS unit and integration tests).
* **Linting / Formatting**: ESLint and Prettier.
* **Baseline Classification**: **Specification-Only** (Option A). All code structure, compiler configurations, and test runners must be scaffolded as the first milestone.

---

## 2. Implementation Dependency Graph (DAG)

The following is the calculated topological execution levels for all 30 implementation tasks:

### Level 0
* **Task 001**: Project Scaffolding (Depends on: NONE)

### Level 1
* **Task 002**: Shared Domain Types and Contracts (Depends on: 001)

### Level 2
* **Task 003**: Priority Event Bus (Depends on: 002)

### Level 3
* **Task 004**: Object Engine Registry (Depends on: 003)
* **Task 026**: Permission Manager Capability Manifest (Depends on: 003)

### Level 4
* **Task 005**: History Engine DAG Registry (Depends on: 004)
* **Task 011**: Geometry Engine Math Utilities (Depends on: 004)
* **Task 027**: Plugin Manager Sandbox Context (Depends on: 026)

### Level 5
* **Task 006**: Command Engine Orchestration (Depends on: 005)
* **Task 012**: Geometry Spatial Index (Quadtree) (Depends on: 011)
* **Task 028**: Plugin SDK Facade (Depends on: 027)

### Level 6
* **Task 007**: Command Transaction Rollback (Depends on: 006)
* **Task 008**: Storage Engine TWB Serialization (Depends on: 006)
* **Task 013**: Geometry Cache Invalidation (Depends on: 003, 012)

### Level 7
* **Task 009**: Storage Engine TWH Sidecar (Depends on: 008)
* **Task 014**: Selection Engine State Model (Depends on: 013)
* **Task 016**: Rendering Engine Tree (Depends on: 013)
* **Task 029**: Plugin Scoped StorageProvider (Depends on: 008, 028)

### Level 8
* **Task 010**: Storage Coexistence Recovery Matrix (Depends on: 008, 009)
* **Task 015**: Selection Bounds Cache (Depends on: 014)

### Level 9
* **Task 017**: Rendering Selection Overlays (Depends on: 015, 016)

### Level 10
* **Task 018**: Canvas Engine Viewport Transforms (Depends on: 017)

### Level 11
* **Task 019**: Input Router Normalization (Depends on: 018)
* **Task 025**: PageState Adapter and Application Orchestration (Depends on: 008, 018)

### Level 12
* **Task 020**: Tool System Arbitration (Depends on: 019)

### Level 13
* **Task 021**: Tool System Coordinate Query (Depends on: 020)

### Level 14
* **Task 022**: Connection Pathfinder A* (Depends on: 021)

### Level 15
* **Task 023**: Connection Split and Merge Commands (Depends on: 007, 022)

### Level 16
* **Task 024**: Connection Cascade Deletion (Depends on: 023)

### Level 17
* **Task 030**: Version 1 Integrated Smoke Test (Depends on: 010, 024, 025, 029)

---

## 3. Canonical Execution Order
The full 30 tasks in canonical topological execution order:
001, 002, 003, 004, 005, 006, 007, 008, 009, 010, 011, 012, 013, 014, 015, 016, 017, 018, 019, 020, 021, 022, 023, 024, 025, 026, 027, 028, 029, 030

---

## 4. Critical Path Recalculation

The critical path represents the longest sequence of dependent tasks that determines the minimum implementation time.

* **Weighting Model**: Unit task weight (each task represents 1 unit).
* **Longest Path Length**: 18 Tasks.
* **Representative Critical Path**: 001 -> 002 -> 003 -> 004 -> 011 -> 012 -> 013 -> 014 -> 015 -> 017 -> 018 -> 019 -> 020 -> 021 -> 022 -> 023 -> 024 -> 030

---

## 5. Safe Parallel Groups vs Sequential Subsystem Chains

### SAFE PARALLEL GROUPS
The following tasks belong to the same topological level, have all prerequisite dependencies fully met, and operate on completely disjoint directories/files, ensuring merge safety:
* **Level 3 Parallel Group**: `[004, 026]` (Object Engine registry vs Permission Manager).
* **Level 7 Parallel Group**: `[014, 016]` (Selection Engine vs Rendering Engine).

### SEQUENTIAL SUBSYSTEM CHAINS
The following task chains build adjacent, sequential layers of the same subsystem directory. Although they may become available topologically at different stages, they must be executed sequentially to prevent merge conflicts on shared entry points, config files, and tests:
* **Storage Engine Chain**: `008 -> 009 -> 010` (modifies `src/storage-engine/`)
* **Geometry Engine Chain**: `011 -> 012 -> 013` (modifies `src/geometry-engine/`)
* **Selection Engine Chain**: `014 -> 015` (modifies `src/selection-engine/`)
* **Plugin System Chain**: `026 -> 027 -> 028 -> 029` (modifies `src/plugins/`)

---

## 6. Checkpoint-to-Task Mapping

| Checkpoint | Validation Target | Validating Task |
| :--- | :--- | :--- |
| **A** | Domain model compiles and validates fixtures | `002` |
| **B** | Object Engine loads canonical project graph | `004` |
| **C** | Command -> Object mutation -> History -> Event Bus flow | `006` |
| **D** | Undo/reverse and redo/replay work without recursion | `006` |
| **E** | Failed History recording causes Command rollback | `007` |
| **F** | TWB deterministic save/load round-trip | `008` |
| **G** | TWB/TWH coexistence and recovery behavior | `010` |
| **H** | Geometry committed-event cache invalidation | `013` |
| **I** | Minimal canonical rendering | `016` |
| **J** | Input Router -> Tool System -> Geometry -> Selection | `021` |
| **K** | LogicalConnection + segmented Wire route, save, render | `024` |
| **L** | Plugin permissions, sandbox context, and SDKFacade | `028` |
| **M** | Unauthorized plugin mutation/storage access denied | `029` |
| **N** | Version 1 integrated smoke test | `030` |

---

## 7. Transitive Dependency Classification (Task 030 Closure)

All 30 tasks are classified below:
* **Category A (Transitively required by Task 030)**: 001, 002, 003, 004, 005, 006, 007, 008, 009, 010, 011, 012, 013, 014, 015, 016, 017, 018, 019, 020, 021, 022, 023, 024, 025, 026, 027, 028, 029, 030
* **Category B (Mandatory but validated independently)**: None
* **Category C (Explicitly deferred)**: None

All Version 1 tasks are required for the complete core implementation program.
