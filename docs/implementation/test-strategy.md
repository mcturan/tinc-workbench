# TINC Workbench Version 1 Test Strategy

This document outlines the testing architecture and verification boundaries for Version 1 of TINC Workbench. All implementation tasks must adhere to this strategy to protect the frozen architectural specifications.

---

## 1. Subsystem Invariant Protections

The following tests are mandatory to enforce frozen architectural boundaries:

### A. Core Mutation & Command Loop
* **Command Engine Sole Mutation Orchestration (Task 006)**: Unit tests must assert that direct mutation of Object Engine properties outside the Command Engine throws an error.
* **Failed Mutation Invariants (Task 007)**: Assert that if command validation fails, no history node is created, and no committed event is published to the Event Bus.
* **History Failure Rollback (Task 007)**: If History Engine write fails, the Object Engine state rolls back to its exact pre-mutation checkpoint.
* **Reverse/Replay Invariants (Task 006)**: Reverting (undo) or re-applying (redo) history actions must not generate new recursive history nodes.
* **Cursor Movement Restrictions (Task 006)**: The history cursor pointer moves only after successful command application, reverse, or replay.

### B. Event Bus Priority & Namespace
* **Priority Scale (Task 003)**: Assert that Event Bus delivers messages in numeric priority order (0-100), with higher numbers executing first.
* **Isolation (Task 003)**: Core-reserved namespaces (`core:`, `ui:`) are protected and plugins are rejected during registration.

### C. Geometry & Selection Caching
* **Geometry Cache Ownership/Invalidation (Task 013)**: Assert that transform matrix and bounds caches are not serialized. Verify they are invalidated reactively via Event Bus committed events and recalculated lazily.
* **Selection Isolation (Task 014)**: Assert Selection Engine owns selection set state but performs no spatial checks (no point-in-bounds, hit-test, or Quadtree queries). All spatial candidate discovery must coordinate through the Tool System.

### D. Wire Connection Decoupling
* **Wire Properties (Task 002)**: Verify Wire objects contain only standard object metadata, `logicalConnectionId`, `segments` (consisting of start/end coordinates), and styling. Wires own no `Endpoint` objects, port/pin bindings, or `netId`.
* **Net Membership (Task 002)**: Assert net membership resolves dynamically via `Wire -> logicalConnectionId -> LogicalConnection -> netId`. Wires and segments do not store `netId`.

### E. Storage Serialization
* **Storage Boundary (Task 008)**: Storage Engine alone owns serialization/deserialization. Wires, Components, and Pages do not write JSON/TWB themselves.
* **TWB/TWH Coexistence (Task 010)**: Verify corrupt or missing TWH sidecar cannot override TWB. TWB must load successfully, fallback to a fresh history DAG, and issue a warning.

### F. Plugin Sandboxing
* **Direct Mutation Blocked (Task 028)**: Verify plugins are blocked from calling private Object Engine registry mutations directly; all actions must route through the Command Engine.
* **Deny-by-default Permissions (Task 026)**: A plugin registering with unknown capabilities or executing unapproved API actions is terminated.
* **Scoped Storage containment (Task 029)**: StorageProvider blocks path traversal (`../`) and enforces directory limits inside `/plugins/sandbox/[plugin-id]/`.
