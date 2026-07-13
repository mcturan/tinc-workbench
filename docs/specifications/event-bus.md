# Event Bus Specification

**Project:** TINC Workbench
**Version:** 0.1.0-draft

---

# 1. Purpose

The Event Bus is the primary communication artery for loose coupling within TINC Workbench. It provides a publish-subscribe (pub/sub) interface that allows independent services, engines, UI components, and plugins to announce state changes, react to user actions, and synchronize subsystems without direct compile-time dependencies or tight coordination. By mediating all notifications, the Event Bus ensures that components remain modular, testable, and independent. It acts as the backbone for the reactive UI, the undo/redo framework, and plugin extensibility.

---

# 2. Goals

- **Decoupling**: Ensure core subsystems (e.g., UI, rendering, history, storage) communicate without direct references, maintaining clean architectural boundaries.
- **Extensibility**: Provide a secure, uniform mechanism for third-party plugins to subscribe to and publish events through the Plugin SDK without compromising Core security or stability.
- **Determinism**: Maintain precise, predictable ordering of events to ensure reproducible behavior, diagnostic trace analysis, and session replay capability.
- **Performance**: Minimize propagation latency and allocation overhead, ensuring that high-frequency event dispatching does not block visual frame rates or cause micro-stutters.
- **Reliability**: Protect core workflows from plugin execution failures, infinite loops, memory leaks, or unhandled event subscriber crashes.

---

# 3. Architecture

The Event Bus resides as a cross-cutting service in the Core Services layer. It coordinates notifications between:

- **Upstream Publishers**: The Command Engine, Tool System, Storage Engine, Plugin Manager, and UI Framework.
- **Downstream Subscribers**: UI Panels, the Rendering Engine, the History Engine, Plugins, and the System Logger.
- **Broker Interface**: The central dispatcher routes events using registered subscription channels, topic matching, and priority queues.

The following block diagram represents the logical relationship between the Event Bus and other Workbench modules:

```
+-----------------------------------------------------------------+
|                         UI Framework                            |
+-----------------------------------------------------------------+
       │ (Publish UI events)              ▲ (Subscribe to UI updates)
       ▼                                  │
+-----------------------------------------------------------------+
|                         Event Bus                               |
+-----------------------------------------------------------------+
       ▲                                  │
       │ (Publish state events)           ▼ (Subscribe to state changes)
+-----------------------------------------------------------------+
|                       Core Services                             |
|  [Command Engine] [Object Engine] [History Engine] [Storage]    |
+-----------------------------------------------------------------+
```

---

# 4. Event Lifecycle

The lifecycle of an event involves the following strict stages:

1. **Instantiation**: A publisher creates an event instance containing a unique ID, type identifier, timestamp, payload, and metadata context.
2. **Publishing**: The event is dispatched to the Event Bus.
3. **Filtering**: The Event Bus evaluates pre-dispatch filters (e.g., access control, topic subscription rules).
4. **Queueing**: If asynchronous, the event is placed in the microtask event queue; if synchronous, it immediately traverses the subscriber list.
5. **Propagation**: Subscribers are invoked sequentially based on priority.
6. **Error Handling**: Exceptions thrown by subscribers are captured to prevent blocking downstream subscribers.
7. **Disposal**: Once all subscribers have processed the event, the event instance is cleared from active execution scopes.

---

# 5. Event Types

All events implement a uniform structure:

- **5.1. Event Identifier (`id`)**: A 128-bit globally unique identifier (UUID v4) generated at instantiation. This ID is immutable and serves as the primary tracking key for log tracing, telemetry collection, and deduplication checks.
- **5.2. Classification Namespace (`type`)**: A dot-separated string indicating the source module, target collection, and action name. The standard syntax follows `[module]:[category].[action]`. This enables wildcard match selectors.
- **5.3. Timestamp (`timestamp`)**: High-resolution UTC Unix epoch millisecond integer indicating when the event was created. Essential for event ordering, sorting in queues, and execution tracing.
- **5.4. Data Payload (`payload`)**: A structural JSON object representing the state difference or properties associated with the event.
- **5.5. Execution Context (`context`)**: Metadata detailing the origin of the event, including the user account, transaction context, and causative command or event.

---

# 6. Event Categories

Events are classified into the following namespaces to enable efficient filtering:

- **6.1. Document State Events**: Represent state modifications of the engineering project hierarchy. Examples:
  - `core:object.created`: Fired when a new object is added. Typical publisher: Object Engine. Typical subscribers: Canvas Engine, History Engine.
  - `core:object.updated`: Fired when one or more properties of an object change. Typical publisher: Object Engine. Typical subscribers: Canvas Engine, Inspector.
  - `core:object.deleted`: Fired when an object is removed. Typical publisher: Object Engine. Typical subscribers: Canvas Engine, History Engine.
- **6.2. Command Lifecycle Events**: Fired by the Command Engine:
  - `command:dispatched`: Fired when a command enters the pipeline. Typical publisher: Command Engine.
  - `command:executed`: Fired on successful execution. Typical publisher: Command Engine.
  - `command:failed`: Fired on execution failure. Typical publisher: Command Engine.
  - `command:undone`: Fired when a command is rolled back. Typical publisher: Command Engine.
  - `command:redone`: Fired when a command is rolled forward. Typical publisher: Command Engine.
- **6.3. Project Lifecycle Events**: Fired by the workspace coordinator:
  - `project:opened`: Fired when a project file is loaded.
  - `project:saved`: Fired when project data is committed to disk.
  - `project:closed`: Fired when the active workspace is closed.
  - `project:recovery-triggered`: Fired when an unclean shutdown is detected on startup.
- **6.4. UI and Tool Events**: Fired by the UI framework and editing tools:
  - `ui:selection.changed`: Fired when user selects or deselects items.
  - `tool:activated`: Fired when an editing tool becomes active.
  - `tool:deactivated`: Fired when an editing tool becomes inactive.
  - `ui:viewport.panned`: Fired when the user pans the canvas viewport.
  - `ui:viewport.zoomed`: Fired when the user zooms the canvas viewport.
- **6.5. Plugin Lifecycle Events**: Fired by the Plugin Manager:
  - `plugin:loaded`: Fired when an extension finishes initialization.
  - `plugin:unloaded`: Fired when an extension is deactivated.
  - `plugin:failed-loading`: Fired when an extension crashes or fails loading constraints.

---

# 7. Synchronous Events

- **Definition**: Events executed immediately on the caller's stack frame.
- **Use Cases**: Critical operations where immediate execution is required to prevent state divergence (e.g., pre-mutation validation, layer locking controls).
- **Execution**: The publisher blocks execution until all synchronous subscribers have completed processing.

---

# 8. Asynchronous Events

- **Definition**: Events deferred using the event loop/microtask queue.
- **Use Cases**: Side-effects, logging, telemetry, and UI updates (e.g., updating property panels, writing autosave recovery logs).
- **Execution**: The publisher dispatches the event and continues immediately without blocking, decoupling mutation logic from downstream side effects.

---

# 9. Event Queue

- **Implementation**: The Event Bus maintains an internal First-In-First-Out (FIFO) queue for asynchronous events.
- **Batching**: Support for merging redundant events (e.g., debouncing multiple rapid viewport pan events into a single dispatch).
- **Capacity**: A configurable limit on queue size is enforced to prevent out-of-memory errors during extreme bulk operations.

---

# 10. Event Ordering and Mutation Flow

To ensure consistency, predictability, and determinism across all subsystems:

- **Deterministic Delivery**: Subscribers register with an integer priority value from 0 to 100 (where a higher numeric value means higher delivery priority).
- **Execution Order**: Synchronous events are executed immediately in order of priority. Asynchronous events are queued and dispatched sequentially in the order they were published (FIFO).
- **Replayability**: The exact order of events can be captured in a session log, allowing deterministic simulation replay.
- **Committed Mutation Ordering**: Canonical committed mutation events are published ONLY after successful History Engine recording.
- **Pathway Event Sequences**:
  - **`execute` (Normal mutation)**:
    1. Pre-execution/validation events (if any)
    2. Object Engine mutation and validation success
    3. History Engine records node
    4. Publication of committed event (e.g., `core:object.created` or `command:executed`) on Event Bus
  - **`reverse` (Undo)**:
    1. Command Engine executes inverse mutation on Object Engine (without adding new history node)
    2. History Engine updates cursor/state (active pointer shifts)
    3. Publication of undo committed event (e.g., `command:undone` or `history:undone`) on Event Bus
  - **`replay` (Redo / recovery)**:
    1. Command Engine executes forward mutation on Object Engine (without duplicate history node)
    2. History Engine updates cursor/state (active pointer shifts)
    3. Publication of redo committed event (e.g., `command:redone` or `history:redone`) on Event Bus
- **Preview / Transient Events**: Non-canonical events representing real-time interactive states (e.g., dragging components, panning viewport) that bypass the Command Engine and History Engine. These are explicitly distinguished from committed events (e.g., using a distinct prefix like `preview:` or `transient:` in the type namespace).

---

# 11. Event Propagation

- **Bubbling & Capturing**: Specific hierarchical events support propagation (e.g., an object event bubbles up to the containing layer, then page, then project).
- **Cancellation**: Subscribers can invoke a stop-propagation method to abort downstream event dispatching, restricted to synchronous validation scopes.

---

# 12. Event Filters

- **Subscription Matching**: Subscribers use wildcard selectors (e.g., `core:object.*`) to match namespaces and categories.
- **Conditional Rules**: Filters evaluate event payloads prior to routing (e.g., subscribing only to updates affecting objects of type `wire`).

---

# 13. Event Subscribers

- **Registry**: Subscribers register callback routines against specific topics.
- **Lifespan**: Dynamic registration allows UI components and plugins to subscribe on load and unsubscribe on destruction to avoid memory leaks.
- **Resilience**: If a subscriber callback throws an exception, the Event Bus catches the error, logs it, and continues executing subsequent subscribers.

---

# 14. Event Publishers

- **Permissions**: Core services hold default publishing rights. Third-party plugins must declare publishing topics in their manifests to prevent event spoofing.
- **Throttle / Debounce**: Utility wrappers allow publishers to throttle high-frequency events (e.g., mouse movement trackers).

---

# 15. Plugin Integration

- **Sandboxing**: Plugin subscribers are executed inside a secure context. They receive read-only clones of the event payload to prevent direct state manipulation outside the Command Engine.
- **SDK Bridging**: The Plugin SDK translates internal Event Bus dispatches into plugin messages and enforces permission filters declared in the plugin's manifest.

---

# 16. Command Engine Integration

- **Coordination**: The Command Engine publishes lifecycle events (e.g., `command:executed`, `command:undone`) to notify the Event Bus of structural updates.
- **Transaction Bundling**: During active transactions, the Event Bus buffers state change events, releasing them in a single batch dispatch when the transaction commits, preventing redundant UI updates.

---

# 17. History Integration

- **Tracking**: The History Engine listens to `command:executed` and `command:undone` events to shift active positions in the history stack.
- **Checkpointing**: Lifecycle triggers (e.g., `project:saved`) prompt the History Engine to purge redo stacks or execute document state checkpoints.

---

# 18. Serialization

- **Rules**: Events are serialized to JSON for logging, recovery audits, and synchronization.
- **Sanitization**: Transient properties, memory pointers, and circular references are stripped from event payloads.
- **Schema Mapping**: All serialized events match the standard JSON layout defined in Section 25.
- **Circular Reference Avoidance**: The serialization engine parses only native types and stable identifier keys. Direct nesting of complex document nodes is prohibited.

---

# 19. Performance

- **Target Latency**: Asynchronous dispatch overhead must remain under 0.5 milliseconds per event.
- **Batch Processing**: Groups events during bulk imports to prevent rendering bottlenecks.
- **Allocation Optimization**: Uses event pooling (reusing event containers) to reduce garbage collector sweeps during high-frequency gestures.

---

# 20. Memory Model

- **Weak References**: Subscribers use weak references to callbacks where possible to prevent memory leaks from dangling registrations.
- **Cloning Policy**: Payloads dispatched to untrusted plugin scopes are deeply cloned, while core internal listeners receive immutable references.

---

# 21. Thread Model

- **Main Thread Execution**: Dispatching and subscriber invocations occur strictly on the main application thread to keep object model modifications safe and sequential.
- **Off-thread Notification**: Web Workers can send message events to the Event Bus, which are then queued and processed on the main thread.

---

# 22. Security

- **Event Isolation**: Plugins cannot listen to sensitive core categories (e.g., auth, settings, direct disk access paths) unless explicitly authorized.
- **Payload Sanitization**: Prevent prototype pollution by validating and freezing event payloads before dispatching them to external subscribers.

--- /n# 23. Public API

The public API exposed by the Event Bus to plugins and UI frameworks:

- **23.1. `subscribe(topic, callback, options)`**:
  - Registers a callback to receive events matching the specified topic.
  - **Parameters**:
    - `topic` (string): The dot-notated event namespace selector, supporting wildcards.
    - `callback` (function): The handler function invoked when a matching event is published.
    - `options` (object): Optional configurations:
      - `priority` (integer): Handled order priority (0 to 100). Defaults to 50.
      - `sync` (boolean): Flag for immediate execution. Defaults to false.
      - `scope` (string): Scoped workspace limits.
  - **Returns**: A unique subscription identifier (string) used for cleanup.
  - **Exceptions**: Throws if the topic string is empty or invalid.
- **23.2. `unsubscribe(subscriptionId)`**:
  - Removes the subscription associated with the given identifier.
  - **Parameters**:
    - `subscriptionId` (string): The identifier returned by `subscribe`.
  - **Returns**: A boolean indicating if the unsubscribe action was successful.
- **23.3. `publish(event)`**:
  - Submits a new event to the Event Bus for propagation.
  - **Parameters**:
    - `event` (object): An object matching the standard event schema.
  - **Returns**: Void.
  - **Exceptions**: Throws if the event structure fails validation checks.

---

# 24. Internal API

Low-level methods reserved for the Core framework:

- **24.1. `registerPrioritySubscriber(topic, callback, priority)`**:
  - Registers a high-priority listener executed before standard subscriptions.
  - **Parameters**:
    - `topic` (string): Target event selector.
    - `callback` (function): Handler logic.
    - `priority` (integer): Value indicating relative execution sequence (0 to 100).
- **24.2. `bufferEvents()`**:
  - Instructs the Event Bus to queue incoming events without immediate dispatch, suspending visual notifications.
- **24.3. `flushBufferedEvents()`**:
  - Dispatches all queued and buffered events as a single merged batch, initiating UI updates.
- **24.4. `clearSubscribers()`**:
  - Removes all registered subscribers, resetting the Event Bus state (used during project teardown).

---

# 25. Examples

## 25.1. Object Creation Event (`core:object.created`)

Serialized payload broadcast when a new component is placed. The Object Engine publishes this event immediately after mutating the memory tree. Subscribing canvas widgets intercept this to draw the matching shapes on the graphics buffer:

```json
{
  "id": "e3a45b67-890c-1234-5678-90123abcdef0",
  "type": "core:object.created",
  "timestamp": 1783978200000,
  "payload": {
    "pageId": "page-1",
    "layerId": "layer-1",
    "object": {
      "id": "res-101",
      "type": "resistor",
      "bounds": { "x": 50, "y": 80, "width": 40, "height": 10 }
    }
  },
  "context": {
    "transactionId": "tx-8892",
    "user": "turan"
  }
}
```

## 25.2. Selection Change Event (`ui:selection.changed`)

Serialized payload broadcast when selection updates. Published by selection tools to notify the active property panel. The panel listens to this event to render input parameters matching the new item IDs:

```json
{
  "id": "f4b56c78-901d-2345-6789-01234abcdef1",
  "type": "ui:selection.changed",
  "timestamp": 1783978205000,
  "payload": {
    "pageId": "page-1",
    "selectedIds": ["res-101"],
    "previousSelectedIds": []
  },
  "context": {
    "source": "tool:select"
  }
}
```

## 25.3. Command Executed Event (`command:executed`)

Serialized payload broadcast when the Command Engine successfully runs an action. Listening history logs record this payload, enabling undo managers to track executed actions sequentially:

```json
{
  "id": "a5c67d89-012e-3456-7890-12345abcdef2",
  "type": "command:executed",
  "timestamp": 1783978210000,
  "payload": {
    "commandId": "cmd-882",
    "commandType": "core:create-object"
  },
  "context": {
    "transactionId": "tx-8892"
  }
}
```

## 25.4. Project Saved Event (`project:saved`)

Serialized payload broadcast when project modifications commit to disk. Fired by the Storage Engine, triggering UI title modifications to remove dirty file asterisks:

```json
{
  "id": "b6d78e90-123f-4567-8901-23456abcdef3",
  "type": "project:saved",
  "timestamp": 1783978215000,
  "payload": {
    "projectId": "proj-992",
    "filePath": "/home/turan/projects/circuit-1.twb",
    "fileSize": 102435
  },
  "context": {
    "user": "turan"
  }
}
```

## 25.5. Plugin Loaded Event (`plugin:loaded`)

Serialized payload broadcast when a third-party extension completes registration. Fired by the Plugin Manager after confirming sandbox execution configurations:

```json
{
  "id": "c7e89f01-234a-5678-9012-34567abcdef4",
  "type": "plugin:loaded",
  "timestamp": 1783978220000,
  "payload": {
    "pluginId": "com.tinc.analog-tools",
    "version": "1.2.0",
    "scope": "workspace"
  },
  "context": {
    "source": "system:plugin-manager"
  }
}
```

## 25.6. Project Opened Event (`project:opened`)

Serialized payload broadcast when a project is successfully opened in the editor. Fired by the workspace lifecycle manager, triggering layout panels to clear active selections and reset viewports:

```json
{
  "id": "d8f90a12-345b-6789-0123-45678abcdef5",
  "type": "project:opened",
  "timestamp": 1783978225000,
  "payload": {
    "projectId": "proj-992",
    "filePath": "/home/turan/projects/circuit-1.twb",
    "readOnly": false
  },
  "context": {
    "user": "turan"
  }
}
```

## 25.7. Viewport Zoomed Event (`ui:viewport.zoomed`)

Serialized payload broadcast when the user adjusts canvas zoom levels. Fired by navigation routines to trigger minor grid subdivisions and coordinate boundary updates:

```json
{
  "id": "e9a01b23-456c-7890-1234-56789abcdef6",
  "type": "ui:viewport.zoomed",
  "timestamp": 1783978230000,
  "payload": {
    "pageId": "page-1",
    "zoomLevel": 1.5,
    "previousZoomLevel": 1.0,
    "centerX": 400,
    "centerY": 300
  },
  "context": {
    "source": "navigation:mouse-wheel"
  }
}
```

## 25.8. Viewport Panned Event (`ui:viewport.panned`)

Serialized payload broadcast when the user pans the canvas coordinate view. Used by grid background generators to shift anchor origins:

```json
{
  "id": "f0b12c34-567d-890a-1234-56789abcdef7",
  "type": "ui:viewport.panned",
  "timestamp": 1783978235000,
  "payload": {
    "pageId": "page-1",
    "centerX": 450,
    "centerY": 320,
    "previousCenterX": 400,
    "previousCenterY": 300
  },
  "context": {
    "source": "navigation:middle-button-drag"
  }
}
```

## 25.9. Tool Activated Event (`tool:activated`)

Serialized payload broadcast when an interactive workbench tool is selected. Active tools intercept this to bind specialized canvas keyboard/mouse gesture listeners:

```json
{
  "id": "a1b23c45-678d-90ae-1234-56789abcdef8",
  "type": "tool:activated",
  "timestamp": 1783978240000,
  "payload": {
    "toolId": "tool:wire",
    "category": "routing"
  },
  "context": {
    "source": "ui:toolbar-click"
  }
}
```

---

# 26. ASCII Sequence Diagrams

## 26.1. Event Propagation Flow

The sequence diagram below demonstrates synchronous publishing and subscriber execution order:

```
Publisher         EventBus         FilterEngine     PrioritySub      StandardSub
    |                 |                 |                |                |
    |-- publish() --->|                 |                |                |
    |                 |-- filter() ---->|                |                |
    |                 |<-- approved ----|                |                |
    |                 |-- invoke() --------------------->|                |
    |                 |<-- completed --------------------|                |
    |                 |-- invoke() -------------------------------------->|
    |                 |<-- completed -------------------------------------|
    |<-- done --------|                                                   |
```

## 26.2. Filtered Interception Flow

The sequence diagram below shows how subscriber selection and event filtering occur:

```
Publisher         EventBus         FilterEngine     MatchingSub      NonMatchingSub
    |                 |                 |                |                 |
    |-- publish() --->|                 |                |                 |
    |                 |-- filter() ---->|                |                 |
    |                 |<-- match core --|                |                 |
    |                 |-- invoke() --------------------->|                 |
    |                 |<-- completed --------------------|                 |
    |                 |-- (skip) ─────────────────────────────────────────>|
    |<-- done --------|                                                    |
```

---

# 27. State Diagrams

An event instance traverses the following execution states:

```
     [ Created ]
          |
          v
    [ Filtering ] ─── Reject ───> [ Disposed ]
          | Approved
          v
   +--------------+
   |   Queued     |  (For asynchronous events)
   +--------------+
          | Dispatch
          v
   +--------------+
   | Dispatching  | ─── Failure (Catch error) ───> [ Logged ] ───+
   +--------------+                                              |
          | Success                                              |
          v                                                      v
   +--------------+                                      +--------------+
   |   Handled    |─────────────────────────────────────>|   Disposed   |
   +--------------+                                      +--------------+
```

---

# 28. Delivery Guarantees

To support technical operations, the Event Bus implements the following delivery guarantee levels:

- **At-Least-Once Delivery**: The Event Bus guarantees that every active, registered subscriber matching an event's subscription criteria will have its callback invoked. The execution system retries processing internally if transient infrastructure errors occur (e.g., worker pool availability).
- **Synchronous Infallibility**: Synchronous events guarantee that all execution logic completes on the caller's stack frame. If any subscriber fails, propagation halts immediately, and the caller is notified of the failure, ensuring the operation can block inconsistent document state.
- **Asynchronous Durability**: Async events dispatched to the queue are guaranteed to execute during the microtask cycle. If the application crashes during execution, persistent events are loaded from the disk-based write-ahead event journal on recovery.
- **Subscriber Registration Boundaries**: A subscriber registered while a dispatch cycle is actively processing will not receive the currently in-flight event. It is guaranteed to receive all subsequent events, avoiding recursive loop hazards.

---

# 29. Event Priorities

Subscribers register with an integer priority value ranging from 0 to 100. The Event Bus priority model uses exclusively this integer 0-100 scale, where higher numeric values represent higher delivery priority. All contradictory 1-5 priority models are deprecated and removed. The Event Bus schedules execution based on the following classification classes:

| Class Name | Priority Value | Target Subsystems and Description |
| :--- | :---: | :--- |
| `HIGHEST` | 100 | Validation filters, security checks, state enforcers, layer locks. Must block invalid operations. |
| `HIGH` | 75 | Core state models, Object Engine synchronization, History Engine stack updates. |
| `NORMAL` | 50 | Default priority. UI Controllers, property inspectors, Canvas Engine rendering adjustments. |
| `LOW` | 25 | Status bar notifications, telemetry gathers, local cache updates, non-blocking side-effects. |
| `LOWEST` | 0 | Internal logs, development tracing, external API hooks, profiling metrics. |

If multiple subscribers share the same priority class value, the Event Bus resolves the execution order chronologically based on their registration order (FIFO).

---

# 30. Event Batching

Event batching prevents layout recalculation bottlenecks and visual flickering during high-frequency gestures (e.g., dragging multiple nodes or routing complex wire systems):

- **Buffering Phase**: Callers invoke `bufferEvents()` to suspend immediate propagation. Incoming events are collected into a local transactional array.
- **Squashing Policy**: Duplicate modification events affecting the same entity are merged. For example, if fifty update events occur for an object during a drag operation, only the final update event is dispatched.
- **Flushing Phase**: Calling `flushBufferedEvents()` dispatches the squashed list as a single batch event. Subscribers receive a collection payload, enabling them to run a single unified layout/re-render cycle.

---

# 31. Event Replay

Replaying events allows TINC Workbench to restore state, run automated tests, and synchronize collaborative environments:

- **Baseline Checkpoint**: Replay requires a baseline file state (e.g., a standard `.twb` file) representing the initial document model state at step zero.
- **Deterministic Simulation**: The engine processes the event log in chronological sequence. Timestamps are simulated, but the ordering and causal relationships remain unchanged.
- **Visual Suppression**: During bulk event replay, rendering loops are disabled. The canvas only redraws once the final event is processed, improving performance by up to 20x.

---

# 32. Event Persistence

For safety and offline recovery, specific events write state modifications to the disk:

- **Event Journaling**: TINC Workbench maintains an active event journal (`.twej` file) containing serialized commands and document events in JSON-seq format.
- **Write-Ahead Log (WAL)**: Document mutations (e.g., object creation or connection deletion) are written to the journal before the Object Engine commits the memory change.
- **Trimming Rules**: The event journal is automatically cleared and trimmed whenever the project is saved to disk or when the History Engine reaches its maximum history stack size.

---

# 33. Dead Letter Queue (DLQ)

The Dead Letter Queue isolates events that cannot be successfully processed:

- **Trigger Conditions**:
  - An event handler throws an unhandled runtime error.
  - A transaction aborts and leaves half-executed events.
  - Serialization fails due to circular references or schema corruptions.
- **DLQ Payload**: Contains the original event schema, the error stack trace, the target subscriber identifier, and the document version state.
- **Recovery Actions**: Developers and AI diagnostic agents can inspect the DLQ using Core APIs, repair payloads, and trigger re-dispatching.

---

# 34. Event Cancellation

Synchronous events support cancellation to prevent invalid state commits:

- **Veto Method**: Subscribers with `HIGHEST` priority can invoke `event.cancel()`, attaching a reason payload.
- **Propagation Halt**: Once cancelled, the Event Bus immediately stops calling downstream subscribers.
- **Caller Propagation**: The publisher receives a rejection signal. The Command Engine handles this by rolling back mutations.
- **Immutability**: Asynchronous events and already-processed synchronous events are immutable and cannot be cancelled.

---

# 35. Event Tracing

To understand complex operations, every event contains tracing context fields:

- **Correlation ID**: A stable UUID representing the root action (e.g., a user clicking "Align Left" or an AI assistant script starting) that initiated the event chain.
- **Causation ID**: The UUID of the direct parent action, event, or command that immediately triggered the current event.
- **Audit Logging**: Developers can reconstruct the complete execution tree from these identifiers, identifying which plugins or core subsystems initiated specific state mutations.

---

# 36. Event Debugging

The Event Bus includes dedicated debugging hooks for developers and plugins:

- **Conditional Breakpoints**: Developers can register debug break handlers on specific event topics (e.g., pause execution when `core:object.deleted` payload target matches a specified UUID).
- **Log Interceptors**: Developers can inject logging filters that capture all event traffic and write detailed diagnostic summaries to the console.
- **Event Bus Visualizer**: The developer dashboard can trace event frequency, latency, and active subscriber lists in real-time.

---

# 37. Performance Benchmarks

The Event Bus is optimized to achieve high throughput and low execution overhead:

| Metric | Target | Condition |
| :--- | :--- | :--- |
| **Max Async Throughput** | > 100,000 dispatches/sec | Single-core, 5 registered subscribers |
| **Synchronous Overhead** | < 0.1 milliseconds | Under 10 registered subscribers |
| **Batch Flush Latency** | < 4.0 milliseconds | Batch size of 1,000 squashed events |
| **Queue Dispatch Latency** | < 0.5 milliseconds | Async scheduling delay |

---

# 38. Memory Usage

- **Event Pooling**: To prevent garbage collection pauses during high-frequency gestures, the Event Bus recycles event wrapper objects from a pre-allocated pool of 500 instances.
- **Weak References**: The subscription registry uses weak references for dynamic UI listeners, ensuring that panels can be garbage collected even if they fail to unsubscribe.
- **Pruning**: Payloads and correlation context objects are cleared as soon as propagation completes, minimizing memory retention in long sessions.

---

# 39. Event Storm Protection

Recursive loops (e.g., Subscriber A listens to event X and dispatches event Y; Subscriber B listens to event Y and dispatches event X) are prevented by active storm protection:

- **Stack Depth Guard**: The Event Bus maintains an execution counter tracking cascading events. If the event stack depth exceeds 15 recursive calls, propagation is aborted.
- **Rate Limiter**: If a single publisher triggers more than 1,000 events in a 100ms window, the Event Bus temporarily throttles the publisher and logs a warning.
- **Transaction Rollback**: If a loop is detected within a transaction, the transaction is immediately rolled back to protect document integrity.

---

# 40. Plugin Isolation

To maintain workbench stability and security, plugins operate under strict constraints:

- **Broker Proxies**: Plugins do not access the global Event Bus directly. Instead, they receive a scoped sandbox proxy that restricts subscription and publishing namespaces.
- **Topic Filtering**: A plugin's subscription request is denied if the target topic namespace is not declared in the plugin's manifest permissions.
- **Execution Timeouts**: Async plugin callbacks are terminated if their execution exceeds 50ms, preventing unresponsive plugins from blocking the application.

---

# 41. Security Considerations

- **Namespace Guarding**: Core namespaces (e.g., `auth:*`, `fs:*`, `settings:*`) are restricted to verified core services. External plugins cannot access these topics.
- **Payload Freezing**: The Event Bus deep-clones and freezes event payloads before passing them to plugin contexts, preventing plugins from modifying shared state objects directly.
- **Origin Validation**: The Event Bus validates the origin context of every incoming event to ensure external components cannot spoof internal system commands.

---

# 42. Failure Recovery

To resolve corruption and cleanly resume sessions after application crashes:

- **42.1. Recovery Detection**: If TINC Workbench suffers an unclean termination, a lockfile persists on disk. During the next boot sequence, the system detects this lockfile and enters recovery mode.
- **42.2. Parsing Event Logs**: The recovery manager opens the `.twej` event log journal and validates its syntax integrity, scanning backwards from the end of the file to identify the last uncorrupted transaction marker.
- **42.3. Reconstruction Pipeline**: Using the latest valid `.twb` document checkpoint, the system applies the events recorded after that checkpoint sequentially.
- **42.4. Verification Check**: Once all transaction segments are applied, the Object Engine calculates a structural hash and compares it to the expected state checksum. If it matches, the lockfile is removed and the project opens. If there is a mismatch, the engine rolls back and loads the last clean `.twb` file.

---

# 43. Distributed Event Support (Future)

To prepare for multi-user collaboration and cloud synchronization, the Event Bus is designed with distributed communication in mind:

- **WebSockets and WebRTC Transport**: The Event Bus schema supports remote publisher IDs, allowing events to cross process boundaries over network sockets.
- **Conflict Resolution Integration**: Event payloads are structured to accommodate Vector Clocks and operational data transformations, enabling conflict-free replicated data synchronization.
- **Network Serialization**: Transient local context attributes (e.g., local mouse screen coordinates) are automatically stripped from events designated for remote propagation.

---

# 44. Complete ASCII Sequence Diagrams

## 44.1. Batching and Merging Sequence

The diagram below demonstrates how high-frequency events are captured, squashed, and flushed as a single update:

```
Publisher         EventBus         BufferManager    SubscriberA      SubscriberB
    |                 |                 |                |                |
    |-- buffer() ---->|                 |                |                |
    |                 |-- openBuffer() ->|                |                |
    |                 |                 |                |                |
    |-- publish(E1) ->|                 |                |                |
    |                 |-- queue(E1) --->|                |                |
    |                 |                 |                |                |
    |-- publish(E2) ->|                 |                |                |
    |                 |-- merge(E2) --->|                |                |
    |                 |                 |                |                |
    |-- flush() ----->|                 |                |                |
    |                 |-- getMerged() ->|                |                |
    |                 |<-- squashed E --|                |                |
    |                 |                                  |                |
    |                 |-- dispatch(squashed E) --------->|                |
    |                 |<-- handled ----------------------|                |
    |                 |-- dispatch(squashed E) -------------------------->|
    |                 |<-- handled ---------------------------------------|
    |<-- done --------|                                                   |
```

## 44.2. Dead Letter Queue (DLQ) Routing

This diagram shows how a processing failure in a subscriber leads to isolation in the Dead Letter Queue:

```
Publisher         EventBus         SubscriberA      DLQManager       SystemLogger
    |                 |                 |                |                |
    |-- publish(E) -->|                 |                |                |
    |                 |-- invoke(E) --->|                |                |
    |                 |<-- exception ---|                |                |
    |                 |                                  |                |
    |                 |-- routeToDLQ(E, error) --------->|                |
    |                 |                                  |-- log entry    |
    |                 |-- notifyError() --------------------------------->|
    |                 |                                  |                |
    |<-- done --------|                                  |                |
```

## 44.3. Recursive Storm Detection and Rollback

This diagram illustrates how recursive event storms are detected and rolled back:

```
Publisher         EventBus         SubscriberA      SubscriberB      TransactionEngine
    |                 |                 |                |                |
    |-- publish(E1) ->|                 |                |                |
    |                 |-- increment() ->|                |                |
    |                 |-- invoke(E1) -->|                |                |
    |                 |                 |-- publish(E2) -|                |
    |                 |<-- publish(E2) -|                |                |
    |                 |-- increment() ------------------>|                |
    |                 |-- invoke(E2) ------------------->|                |
    |                 |                 |                |-- publish(E1) -|
    |                 |<-- publish(E1) ------------------|                |
    |                 |-- [Limit Exceeded (16)]                           |
    |                 |-- abortPropagation()                              |
    |                 |-- rollback() ------------------------------------>|
    |                 |                                                   |-- revert state
    |                 |<-- rollback done ---------------------------------|
    |<-- error -------|                                                   |
```

---

# 45. Complete State Diagrams

An event instance traverses the following execution states, including error and transactional sub-states:

```
                       [ Instantiated ]
                              |
                              v
                        [ Filtering ] ── Reject ──> [ Disposed ]
                              | Approved
                              |
              +---------------+---------------+
              |                               |
        (Synchronous)                   (Asynchronous)
              |                               |
              v                               v
        [ Dispatching ]                  [ Queued ]
              |                               |
              |                   +-----------+-----------+
              |                   |                       |
              |               (Standard)              (Buffered)
              |                   |                       |
              |                   v                       v
              |             [ Dispatching ]         [ Merged/Squashed ]
              |                   |                       |
              |                   v                       v
              |             [ Dispatching ]         [ Dispatching ]
              |                   |                       |
              +---------------+---+-----------------------+
                              |
                              v
                        [ Invoking ]
                              |
              +---------------+---------------+
              |                               |
          (Success)                        (Fail)
              |                               |
              v                               v
         [ Handled ]                      [ Faulty ]
              |                               |
              |                   +-----------+-----------+
              |                   |                       |
              |              (Transient)             (Persistent)
              |                   |                       |
              |                   v                       v
              |               [ Retry ]                [ DLQ ]
              |                   |                       |
              +---------------+---+-----------------------+
                              |
                              v
                         [ Disposed ]
```
