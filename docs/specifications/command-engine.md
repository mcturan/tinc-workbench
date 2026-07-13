# Command Engine Specification

**Project:** TINC Workbench
**Version:** 0.1.0-draft

---

# 1. Overview

The Command Engine is the central subsystem responsible for orchestrating, executing, and recording all state mutations within the TINC Workbench document model. To ensure deterministic behavior, consistency, and stability, all user-initiated modifications, plugin operations, and AI-assisted actions must pass through the Command Engine. Direct mutation of the Object Engine or other core service states is strictly prohibited. The Command Engine guarantees that every action is fully undoable, redoable, serializable, and replayable, supporting the offline-first and local-first architecture of the workbench.

---

# 2. Responsibilities

- **State Mutation Execution**: Act as the single source of truth for executing mutations on the Object Engine and project settings.
- **Undo and Redo Management**: Provide the mechanism for reversing and re-applying modifications.
- **Serialization and Deserialization**: Convert commands to and from JSON format for project file storage, recovery logs, and telemetry.
- **State Validation**: Validate the structural integrity and semantic correctness of commands prior to execution.
- **Lifecycle Coordination**: Manage the command lifecycle from instantiation through validation, execution, recording, event dispatching, and disposal.
- **Extensibility Interface**: Allow plugins and the Plugin SDK to register custom command types and execute operations safely.
- **Transactional Atomicity**: Group related commands into atomic units of work that succeed or fail together.

---

# 3. Non-Responsibilities

The Command Engine does NOT:

- **UI Rendering**: Manage rendering, viewport calculations, or visual feedback (delegated to the Rendering Engine and Canvas Engine).
- **User Input Gathering**: Listen to raw mouse, keyboard, or touch events (handled by the UI Framework and Tool System).
- **Persistent Storage Operations**: Read or write directly to the local filesystem or manage file formats (delegated to the Storage Engine).
- **History Storage**: Maintain the active undo/redo stacks (delegated to the History Engine).
- **Engineering Logic**: Perform domain-specific computations, physics simulations, or schematic rule checks.

---

# 4. Architecture

The Command Engine operates as a middleware layer between interactive systems and core data models:

- **Upstream Callers**: The Tool System, UI Framework, Plugin SDK, and AI Integration request command execution.
- **Downstream Targets**: The Command Engine applies changes directly to the Object Engine, Canvas Engine viewport parameters, and Core settings.
- **Supporting Infrastructure**:
  - **History Engine**: Receives successfully executed commands to update history tracks.
  - **Event Bus**: Dispatches events to notify external subscribers of execution status.
  - **Validation Engine**: Performs checks against project schemas and model constraints.
  - **Serialization Engine**: Translates commands into structural data objects for the Storage Engine.

---

# 5. Command Lifecycle

Every command undergoes a strictly defined lifecycle:

- **Instantiation**: The client creates a command instance, passing a payload containing parameters, target object IDs, and configuration options.
- **Structural Validation**: The command validates its payload parameters against predefined schemas.
- **Semantic Validation**: The command queries the current Object Engine state to ensure the requested mutation is logical and permitted.
- **Pre-Execution Interception**: Plugins and internal services intercept the command to inspect, block, or modify it.
- **Execution**: The command modifies the target data structures, storing a copy of the previous state or a reverse delta.
- **Registration**: On success, the command is passed to the History Engine to be recorded on the undo stack.
- **Event Notification**: An event is published to the Event Bus (e.g., CommandExecuted).
- **Undo/Redo Actions**: When requested, the command rolls back or re-applies its mutations, updating the Event Bus accordingly.
- **Disposal**: When evicted from history, the command instance is garbage collected.

---

# 6. Command Interface

All commands must implement a uniform interface to ensure interoperability:

- **Properties**:
  - **id**: A globally unique identifier (UUID) assigned at instantiation.
  - **type**: A unique string key defining the command type.
  - **timestamp**: A high-resolution UTC timestamp of instantiation.
  - **version**: A semantic version string indicating the command schema version.
  - **metadata**: A generic collection of key-value pairs storing contextual information (e.g., user identifier, plugin source).
- **Methods**:
  - **validate**: Checks command validity against the current document state and returns a validation result.
  - **execute**: Performs the state mutations on the target services and stores reverse-delta state.
  - **undo**: Restores the document state to its exact pre-execution condition.
  - **serialize**: Converts the command and its parameters into a JSON-compatible object.
  - **deserialize**: Restores a command instance from serialized data.

---

# 7. Command Types

Commands are categorized based on their scope and target subsystems:

- **Creation Commands**: Instantiate new pages, layers, objects, assets, or connections.
- **Mutation Commands**: Modify properties, styles, positions, rotations, or bounds of existing objects.
- **Destruction Commands**: Remove pages, layers, objects, assets, or connections from the project.
- **Relationship Commands**: Establish, modify, or break connections between components or ports.
- **Configuration Commands**: Change workspace preferences, grid configurations, units, snap settings, or project-wide metadata.

---

# 8. Composite Commands

Composite commands represent a group of individual commands executed as a single logical action:

- **Execution Order**: Commands within a composite command execute sequentially in the order of registration.
- **Atomicity**: If any child command fails validation or execution, all previously executed child commands in the sequence are immediately undone, and the entire composite command fails.
- **History Representation**: The History Engine treats a composite command as a single entry. Undoing or redoing a composite command performs the operations across all child commands sequentially.
- **Events**: A single composite-level event is published to the Event Bus, though internal systems may track individual execution logs.

---

# 9. Macro Commands

Macros are pre-recorded sequences of commands designed for repeatability:

- **Definition**: Unlike static composite commands, macros parameterize execution targets or properties.
- **Registration**: Users or plugins define macro templates stored in the project settings or user preferences.
- **Application**: Executing a macro instantiates the corresponding commands dynamically, adapting target IDs and geometry relative to the selection or active viewport coordinate space.
- **Batch Execution**: Macros run in a single performance frame to prevent visual flicker.

---

# 10. Transactions

Transactions define boundary blocks that isolate a series of state changes:

- **Scope**: Used during complex interactive gestures (e.g., dragging an object, wire routing) or complex plugin routines.
- **Isolation**: Changes inside a transaction are not committed to the permanent history track until the transaction is closed and committed.
- **Rollback**: If an error occurs or the user cancels the gesture, the transaction is rolled back, restoring the document state.
- **Commit**: On commit, individual operations are merged into a single historical command to optimize the undo/redo stack size.

---

# 11. Validation

Validation acts as the gatekeeper for document integrity:

- **Structural Phase**: Checks if critical properties are present, have correct types, and match version schemas.
- **Semantic Phase**: Validates topological constraints (e.g., preventing cycles in specific logical trees, preventing duplicate ports, verifying coordinate bounds).
- **Fail-Fast**: If validation fails, execution is aborted, and a detailed validation report is generated without modifying any document state.

---

# 12. Execution Pipeline

The processing pipeline for all command execution:

1. **Receive**: Command is dispatched to the Command Engine.
2. **Intercept (Pre)**: Executing registered pre-execution filters.
3. **Validate**: Run structural and semantic validation tests.
4. **Mutate**: Apply mutations to the document state.
5. **Record**: Pass the executed command reference to the History Engine.
6. **Intercept (Post)**: Executing post-execution filters.
7. **Publish**: Notify the Event Bus of success or failure.

---

# 13. Event Publishing

The Command Engine broadcasts events to notify UI, plugins, and services of state transitions:

- **Command Dispatched**: Broadcast when a command enters the pipeline.
- **Command Executed**: Broadcast when a command successfully completes state mutation.
- **Command Failed**: Broadcast if validation fails or an execution exception occurs, containing error details.
- **Command Undone**: Broadcast when a command's mutations are reverted.
- **Command Redone**: Broadcast when a command is re-executed via the redo pipeline.

---

# 14. Undo

- **Mechanism**: The undo operation relies on inverse state representation (reverse deltas or previous state snapshots) recorded during execution.
- **Target Integrity**: Reverting state must restore objects to their exact historical properties, styles, and positions without affecting unrelated entities.
- **Topological Integrity**: Undoing structural changes must restore all parent-child hierarchies and associated connections.

---

# 15. Redo

- **Mechanism**: Re-applies the mutation payload stored in the command instance.
- **Preconditions**: Redo is only valid if the document state has not diverged from the command's expected baseline state.
- **Execution**: Invokes the same mutation logic as the original execution call, using cached parameters.

---

# 16. History Integration

The Command Engine is tightly coupled with the History Engine:

- **History Limits**: The History Engine enforces maximum stack size. The Command Engine disposes of evicted commands.
- **Stack Clearing**: Executing any new mutating command (other than Undo or Redo) while the redo stack is populated clears the redo stack.
- **State Checkpoints**: Periodic snapshots of the document are taken to optimize memory utilization and long history chains.

---

# 17. Serialization

- **Document Format**: Serialized commands conform to JSON rules specified in the project file format.
- **Data Minimization**: Only essential parameters, type identifiers, and schema versions are stored. Internal caches or runtime state references are omitted.
- **Identifier Stability**: References to entities must use globally unique IDs rather than volatile indices.
- **Backward Compatibility**: Command definitions must declare migration paths if the parameter structure changes across versions.

---

# 18. Replay

- **Functional Behavior**: Replay is the sequential execution of serialized commands starting from an empty or baseline document state.
- **Deterministic Outcome**: Executing the same sequence of commands on a baseline project must result in an identical final state.
- **Visual Suppression**: During batch replay, visual canvas updates and UI layout recalculations are suppressed until the final command completes, maximizing throughput.

---

# 19. Error Handling

- **Exceptions during Execution**: If a command encounters a runtime exception, the Command Engine catches the error, initiates rollback of any partial state changes, and preserves the document's consistency.
- **Error Propagation**: Detailed diagnostics (command type, error code, target ID, traceback) are packaged and returned to the caller.
- **State Isolation**: Errors in third-party plugin commands must not corrupt core workspace data.

---

# 20. Performance

- **Execution Target**: Single command execution must complete in less than 8 milliseconds to ensure a consistent 60 FPS rendering rate.
- **Memory Footprint**: Commands use structural sharing and diff-based deltas rather than deep copies of the document tree.
- **Asynchronous Execution**: Commands that require external assets or heavy calculations perform preparation asynchronously before entering the synchronous execution pipeline.

---

# 21. Testing

- **Unit Testing**: Tests verify that each command type successfully validates payloads, executes correct mutations, and accurately serializes.
- **Round-Trip Validation**: Tests verify that instantiating a command, executing it, serializing it, and deserializing it reproduces a structurally identical command.
- **Invariant Checks**: Integration tests verify that executing and subsequently undoing a command leaves the document in a state identical to the pre-execution baseline.

---

# 22. Public API

The public API exposed by the Command Engine to tools, plugins, and services:

- **dispatch(command)**: Submits a command instance to the execution pipeline.
- **undo()**: Triggers the history rollback mechanism.
- **redo()**: Triggers the history rollforward mechanism.
- **canUndo()**: Returns a boolean indicating if an undo action is available.
- **canRedo()**: Returns a boolean indicating if a redo action is available.
- **registerCommandType(type, factory)**: Registers custom command definitions from plugins.

---

# 23. Internal API

Low-level methods reserved for the Core framework:

- **beginTransaction()**: Opens a new transactional scope.
- **commitTransaction()**: Closes and registers the active transaction.
- **rollbackTransaction()**: Cancels and discards the active transaction.
- **injectInterceptors(interceptors)**: Adds validation or logging filters to the execution path.
- **clearHistory()**: Resets execution logs and history stacks.

---

# 24. Future Extensions

- **Collaborative Sync**: Operational Transformation or Conflict-Free Replicated Data Type (CRDT) integration at the command level for real-time multiplayer editing.
- **Branching History**: Non-linear history support, allowing developers to create experimental design branches.
- **Interactive Replay Console**: A developer panel to step forward, step backward, or modify parameters within the execution log.
- **AI Command Synthesizer**: Generative translation of natural language descriptions into command sequence payloads.

---

# 25. Sequence Diagrams

## 25.1. Standard Command Execution Flow

The sequence diagram below illustrates the typical pathway of a command dispatched to the Command Engine:

```
Caller           CommandEngine      Validation       ObjectEngine       HistoryEngine      EventBus
  |                    |                |                 |                  |                |
  |-- dispatch(cmd) -->|                |                 |                  |                |
  |                    |-- validate() ->|                 |                  |                |
  |                    |<-- valid ------|                 |                  |                |
  |                    |-- execute() -------------------->|                  |                |
  |                    |                                  |-- mutate state   |                |
  |                    |<-- state updated ----------------|                  |                |
  |                    |-- record(cmd) ------------------------------------->|                |
  |                    |-- publish(CommandExecuted) ----------------------------------------->|
  |<-- success --------|                                                                      |
```

## 25.2. Command Undo Flow

The sequence diagram below shows the coordination required to revert an executed command:

```
Caller             CommandEngine      HistoryEngine      ObjectEngine       EventBus
  |                      |                  |                 |                |
  |-- undo() ----------->|                  |                 |                |
  |                      |-- popUndo() ---->|                 |                |
  |                      |<-- cmd ----------|                 |                |
  |                      |-- undo() ------------------------->|                |
  |                      |                                    |-- revert state |
  |                      |<-- state reverted -----------------|                |
  |                      |-- pushRedo(cmd) ->|                 |                |
  |                      |-- publish(CommandUndone) -------------------------->|
  |<-- success ----------|                                                     |
```

---

# 26. State Machine Diagrams

Each command instance tracks its execution lifecycle via the following state transitions:

```
     [ Created ]
          |
          v
   +--------------+         Fail
   |  Validating  |------------------------+
   +--------------+                        |
          | Pass                           |
          v                                v
   +--------------+      Fail       +--------------+
   |  Executing   |---------------->|    Failed    |
   +--------------+                 +--------------+
          | Pass                           ^
          v                                | Rollback
   +--------------+                        | Fail
   |  Succeeded   |------------------------+
   +--------------+
      |        ^
 Undo |        | Redo
      v        |
   +--------------+
   |    Undone    |
   +--------------+
```

---

# 27. Failure Scenarios

The Command Engine guarantees safety and state consistency under the following typical failure scenarios:

- **Structural Validation Failure**: The command payload has missing properties, incorrect types, or fields that mismatch version schema boundaries. The engine rejects execution instantly, reports validation errors, and logs telemetry. The document state is untouched.
- **Semantic Validation Failure**: The command parameters conflict with current document states (e.g., attempt to connect a wire to an already occupied port, or deleting an object that does not exist). The execution is blocked and the pipeline returns a detailed validation report.
- **Runtime Execution Exception**: An unexpected exception (e.g., system out of memory, crash within core calculations, or asset loader error) occurs while running a mutation. The Command Engine intercepts the error, runs a rollback of any partial changes completed up to that point, disposes of the dirty state, and propagates the error.
- **History Divergence on Redo**: The user attempts a redo but the baseline document state has changed, rendering the redo payload invalid. The Command Engine detects the checksum/version mismatch, blocks the action, and clears the redo stack to prevent corruption.
- **Concurrent Dispatch Conflict**: Multiple commands are submitted at the same time. The engine utilizes a execution lock to serialize operations, preventing overlapping state modifications.

---

# 28. Plugin Interception Flow

Plugins interact with commands through registered interceptor chains, running synchronously during the execution pipeline:

```
Command Dispatch ──> [Pre-Interceptors] ──> [Validation] ──> [Mutation] ──> [Post-Interceptors] ──> [History/Event]
```

- **Pre-Interceptors**: 
  - Executed prior to validation and mutation.
  - Can inspect command payloads, attach additional metadata, modify properties, or veto execution by returning a rejection status.
  - Useful for workspace security controls, document locking, and input normalization.
- **Post-Interceptors**:
  - Executed after successful mutations, prior to history recording.
  - Receive the command payload along with its mutation logs.
  - Cannot veto execution but can trigger auxiliary actions (e.g., starting background calculations, highlighting selected items, auto-arranging layout components).

---

# 29. AI Command Execution Flow

AI assistants run actions within TINC Workbench by interacting directly with the Command Engine:

1. **Generation**: The AI model translates natural language requests into structured command payload sequences.
2. **Permission Check**: The system validates the AI assistant's permissions against the target command types.
3. **Transaction Context**: The AI-initiated commands are wrapped inside a single transaction labeled with metadata marking the agent ID.
4. **Dry Run Validation**: The Command Engine validates the entire transaction plan against the Object Engine to confirm structural and semantic correctness before applying any change.
5. **Execution**: The transaction executes atomically. On success, the entire change is registered as a single undo/redo point, allowing the user to roll back the AI's operations in one step.
6. **Execution Telemetry**: Execution results and logs are routed back to the AI assistant for trace analysis and refinement.

---

# 30. Multi-Document Command Handling

To prevent state and history contamination in multi-document workspaces, the Command Engine enforces the following rules:

- **Isolated Engine Instances**: Each open document maintains its own separate Command Engine and History Engine instances. Undo and redo stacks remain fully isolated.
- **Global Shortcut Routing**: The application layer monitors active window focus and routes global commands (e.g., Ctrl+Z, Ctrl+Y) only to the active document's command dispatcher.
- **Cross-Document Operations**: Operations spanning two documents (e.g., copying objects from Page A in Project 1 to Page B in Project 2) must be decoupled:
  - The source engine runs a copy command, serializing selected structures to a system-wide Clipboard.
  - The target engine runs a paste command, deserializing and validating the Clipboard data as new creations on its own document model.

---

# 31. Nested Transaction Rules

TINC Workbench supports nesting transactions to manage complex tool gestures and plugin routines:

- **Hierarchy and Flattening**: The engine supports nested transaction blocks up to a maximum depth of 8. Transactions created within an existing transaction are treated as sub-transactions.
- **Commit Propagation**: Sub-transactions do not write directly to the History Engine. When a sub-transaction commits, its changes are merged into the parent transaction. Only when the outermost transaction commits are all accumulated changes squashed into a single historical entry.
- **Atomic Rollback**: If any sub-transaction rolls back or encounters an error, the entire nested chain is aborted. The document is restored to the exact state it had before the outermost transaction was opened.
- **Isolation**: Document state changes inside an uncommitted transaction remain hidden from other components until the final commit is executed.

---

# 32. Performance Benchmarks

The Command Engine is designed to meet strict latency constraints:

- **Standard Dispatch Latency**: Validation and execution of a single command must complete in less than 2 milliseconds.
- **Composite Execution Latency**: Sequences consisting of up to 100 object modifications must execute in less than 15 milliseconds to keep frame rates above 60 FPS.
- **Memory Consumption**: Command history entries must consume no more than 50 KB on average, utilizing structural sharing and deltas.
- **History Footprint**: A history stack capped at 200 items must consume less than 15 MB of RAM in typical document sizes.
- **Checkpoint Frequency**: The engine automatically writes a state checkpoint every 50 commands to accelerate undo/redo recalculations in long sessions.

---

# 33. Memory Model

- **Structural Sharing**: To optimize memory, commands store state deltas rather than duplicate copies of unchanged nodes.
- **Immutable Deltas**: Reversible changes are stored as immutable diff structures, preventing unexpected side effects during undo/redo loops.
- **Stable References**: Command payloads reference objects by their unique UUID string keys. Direct pointers to document objects are prohibited to prevent memory leaks and dangling references.
- **Garbage Collection**: Once a command is evicted from the History Engine's undo stack, all references to its deltas are set to null to enable automatic garbage collection.

---

# 34. Thread Model

- **Single-Threaded Execution**: The core mutation and execution pipeline runs strictly on the main application thread. This prevents race conditions and state conflicts in the Object Engine.
- **Asynchronous Preparation**: Non-blocking calculations, asset loading (e.g., parsing raw SVGs or downloading datasheets), and validation steps are offloaded to background Web Workers.
- **Execution Locking**: The Command Engine operates synchronously. Dispatched commands are queued in a FIFO buffer, executing sequentially without overlapping execution blocks.

---

# 35. Security Considerations

To protect the workspace and project files from malicious or unstable operations:

- **Sandbox Restrictions**: Commands executed by plugins run inside a sandboxed environment without direct access to local system APIs, network sockets, or global window contexts.
- **Permission Verification**: Commands are tagged with access requirements (e.g., Read, Write, Configuration). The engine validates these permissions against the plugin's manifest declarations before processing.
- **Input Sanitization**: Payload parameters undergo strict schema verification to prevent prototype pollution, injection attacks, and buffer overruns during parsing.

---

# 36. Examples for Every Command Category

Below are concrete, structured JSON payload examples representing serialization formats for the core command categories:

## 36.1. Creation Command Example (`core:create-object`)

Creates a new rectangle shape on a specified page and layer:

```json
{
  "id": "c1a23b45-678d-90ef-1234-56789abcdef0",
  "type": "core:create-object",
  "timestamp": 1783977935000,
  "version": "1.0.0",
  "metadata": {
    "source": "tool:rectangle",
    "user": "turan"
  },
  "payload": {
    "layerId": "layer-1",
    "object": {
      "id": "rect-99",
      "type": "rectangle",
      "bounds": { "x": 100, "y": 150, "width": 80, "height": 60 },
      "style": { "fill": "#ffffff", "stroke": "#000000" }
    }
  }
}
```

## 36.2. Mutation Command Example (`core:update-object`)

Updates the boundary positions of a rectangle, caching previous bounds to facilitate undo actions:

```json
{
  "id": "e2b34c56-789a-01bc-2345-67890abcdef1",
  "type": "core:update-object",
  "timestamp": 1783977940000,
  "version": "1.0.0",
  "metadata": {
    "source": "tool:select"
  },
  "payload": {
    "objectId": "rect-99",
    "updates": {
      "bounds": { "x": 120, "y": 150, "width": 80, "height": 60 }
    },
    "previous": {
      "bounds": { "x": 100, "y": 150, "width": 80, "height": 60 }
    }
  }
}
```

## 36.3. Destruction Command Example (`core:delete-object`)

Deletes an object while preserving its structure within the deletion payload to support full restoration:

```json
{
  "id": "f3c45d67-890b-12cd-3456-78901abcdef2",
  "type": "core:delete-object",
  "timestamp": 1783977945000,
  "version": "1.0.0",
  "metadata": {
    "source": "action:delete-key"
  },
  "payload": {
    "objectId": "rect-99",
    "deletedState": {
      "id": "rect-99",
      "type": "rectangle",
      "bounds": { "x": 120, "y": 150, "width": 80, "height": 60 },
      "style": { "fill": "#ffffff", "stroke": "#000000" }
    }
  }
}
```

## 36.4. Relationship Command Example (`core:create-connection`)

Establishes an electrical connection wire between ports:

```json
{
  "id": "a4d56e78-901c-23de-4567-89012abcdef3",
  "type": "core:create-connection",
  "timestamp": 1783977950000,
  "version": "1.0.0",
  "metadata": {
    "source": "tool:wire"
  },
  "payload": {
    "connection": {
      "id": "conn-001",
      "source": "comp-1:port-out",
      "target": "comp-2:port-in",
      "connectionType": "Electrical"
    }
  }
}
```

## 36.5. Configuration Command Example (`core:change-settings`)

Alters grid spacing properties:

```json
{
  "id": "b5e67f89-012d-34ef-5678-90123abcdef4",
  "type": "core:change-settings",
  "timestamp": 1783977955000,
  "version": "1.0.0",
  "metadata": {
    "source": "panel:settings"
  },
  "payload": {
    "key": "grid.spacing",
    "value": 20,
    "previous": 10
  }
}
```

