# Storage Engine Specification

**Project:** TINC Workbench
**Version:** 0.1.0-draft

---

# 1. Purpose

The Storage Engine is the core subsystem responsible for document persistence, project packaging, asset serialization, and crash recovery within TINC Workbench. It converts runtime in-memory structures from the Object Engine and History Engine into durable disk representations (specifically the `.twb` single-file UTF-8 JSON document for Version 1), coordinating local-first session durability.

---

# 2. Goals

- **Durability**: Guarantee zero data loss across system crashes, power cuts, and unexpected shutdowns.
- **Local-First Speed**: Optimize project saving and loading latency to remain under 50ms for typical workloads.
- **Asset Integrity**: Keep external assets and plugin data structured, validated, and compressed in future extensions while keeping Version 1 files fully human-readable and Git-friendly.
- **Safety**: Guard against directory path traversal, malicious file uploads, and JSON injection vectors during file operations.

---

# 3. Responsibilities

- Serializing project models, history sequences, and asset references into a single UTF-8 encoded JSON document (.twb) for Version 1.
- Executing atomic writes using temporary files (`.tmp`) and file rename operations to prevent file corruption.
- Managing background autosaves and event journaling (`.twej` files).
- Recovering files using the Write-Ahead Log (WAL) journal after unclean shutdowns.
- Validating project models against JSON schema definitions and executing migration scripts.
- Preserving unknown plugin data properties during file reads and writes.

---

# 4. Non-Responsibilities

The Storage Engine does NOT:

- Manage active editing states, selection pointers, or layout parameters (Canvas/Selection Engine domain).
- Process user command logs or run transaction undo/redo stacks (Command/History Engine domain).
- Handle network synchronizations or remote cloud multi-user merges directly (Collaboration Service domain).

---

# 5. Storage Architecture

Positioned as the core persistence agent:

- **Upstream Channels**: Interacts with the Command Engine and History Engine during transaction commits or save events.
- **Data Source**: Serializes the Object Engine's component tree.
- **File System Interface**: Directly invokes OS-level file I/O operations (or browser-level File System Access APIs when running in web builds).

```
+-----------------------------------------------------------------+
|                       Command Engine                            |
+-----------------------------------------------------------------+
       │ (Trigger transaction commits)
       ▼
+-----------------------------------------------------------------+
|                       Storage Engine                            |
+-----------------------------------------------------------------+
       │                                  ▲
       │ (Read active state model)        │ (Read/Write JSON block)
       ▼                                  │
+------------------------------------+    │
|         Object Engine              |    │
+------------------------------------+    │
                                          ▼
+-----------------------------------------------------------------+
|                       Physical Storage / OS File System         |
+-----------------------------------------------------------------+
```

---

# 6. Project Loading

Project load operations execute the following steps:

1. **Lock Verification**: Checks for existing `.lock` markers to verify file ownership.
2. **File Reading**: Reads the single `.twb` UTF-8 text file into an in-memory buffer.
3. **Parse & Validate**: Deserializes the JSON payload and runs structural schema checks.
4. **Migration Sweep**: Checks schema versions and runs migration translators if necessary.
5. **Populate Models**: Instantiates components inside the Object Engine and restores the History Engine's timeline logs.

---

# 7. Project Saving

Project save operations execute the following steps:

1. **State Serialization**: Converts current Object Engine and History Engine parameters to a formatted JSON string.
2. **Atomic Overwrite**: Writes the JSON data to a temporary file (`.tmp`) first, then renames it to overwrite the target `.twb` file.
3. **Clean Up**: Flushes OS disk buffers and clears temporary markers.

---

# 8. TWB File Integration

The `.twb` container matches the structural rules defined in the Project File Format Specification:

- Version 1 uses a single UTF-8 JSON document.
- Contains the following root keys:
  - `schemaVersion`: SemVer definition.
  - `project`: Base project metadata (id, name, description).
  - `pages`: Active document pages, layers, and objects.
  - `assets`: Base64 encoded or referenced binary files.
  - `plugins`: Scoped settings reserved for active plugins.
  - `settings`: Grid, snap, and theme parameters.
  - `metadata`: Free-form audit trails.

---

# 9. Serialization Boundaries

Defines which properties are persisted and which are excluded:

- **Persisted**: Object geometry boundaries, parameter definitions, layer configurations, connection paths, styles, history nodes, metadata.
- **Excluded**: Viewport matrices, active selection outlines, layout handles, local plugin memory registers, undo/redo transaction buffers.

---

# 10. Deserialization

Reconstructs Object Model instances from raw JSON strings, validating types and resolving component linkages.

---

# 11. Schema Validation

Compares JSON inputs against structural JSON Schema drafts, checking types, boundaries, and required fields.

---

# 12. Schema Versioning

Tracks project files using a semantic version tag (e.g., `1.0.0`). Older files are passed to migration handlers before parsing.

---

# 13. Migration Pipeline

Evaluates older project files and runs sequential migration scripts (e.g. `v1_to_v2.js`) to translate deprecated parameters to modern schemas.

---

# 14. Autosave

Writes incremental state updates to temporary backup files every 60 seconds of idle time.

---

# 15. Recovery

Parses autosaved templates if the project closes unexpectedly.

---

# 16. Crash Recovery

Replays Write-Ahead Log event journals (`.twej`) to recover transaction states up to the failure point.

---

# 17. Atomic Writes

Guarantees that write operations are all-or-nothing: writes to `[filename].tmp` first, flushes disk buffers, and renames the temp file to overwrite the original.

---

# 18. Temporary Files

Manages local folder paths for temporary write operations, cleaning up leftover `.tmp` caches on clean exit.

---

# 19. Backup Strategy

Retains up to 3 automatic backups (rotating `.bak` files) to guard against file corruptions.

---

# 20. Asset Storage

Referenced resources (PNG, SVG, PDF, Fonts) are stored as base64-encoded strings or asset path pointers inside the `assets` root array of the TWB Version 1 JSON structure.

---

# 21. External Asset References

Resolves remote URL references and converts them into embedded assets during manual save commands.

---

# 22. Missing Assets

Renders default asset warning placeholders when resource links fail.

---

# 23. Corrupted Assets

Isolates corrupted assets, logging checksum mismatches without halting project load operations.

---

# 24. Plugin Data Storage

Plugins save local configuration parameters in dedicated namespace fields within the `plugins` list of the project document.

---

# 25. Unknown Plugin Data Preservation

When reading a project file containing plugin fields from uninstalled plugins, the engine retains the unknown fields in memory, serializing them back on save.

---

# 26. Command History Persistence

Serializes history trails inside the `history.json` sidecar or embedded metadata to support undo/redo across editing sessions.

---

# 27. Event Journal Integration

Continually appends active mutations to the `.twej` log file.

---

# 28. Local-First Operation

Prioritizes local disk writes. Network synchronizations run asynchronously in the background.

---

# 29. Offline Operation

Runs fully offline without server calls, using browser storage mechanisms (IndexedDB/FileSystem Access API) in web versions.

---

# 30. File Locking

Employs lockfiles (`[filename].lock`) to prevent concurrent processes from opening the same project file.

---

# 31. Concurrent Access

Blocks double-write attempts by rejecting access locks when a lockfile exists.

---

# 32. Large Project Loading

Employs stream parsers to deserialize large project files without loading the entire raw text into memory.

---

# 33. Partial and Lazy Loading

Loads only metadata and active pages on startup, fetching hidden layers and remote assets asynchronously on-demand.

---

# 34. Memory Model

Reuses JSON parser buffers to keep heap allocations and garbage collection overhead low.

---

# 35. Performance Targets

- Write latency: < 50ms. Read latency: < 100ms.

---

# 36. Security

Enforces strict input validation on all deserialized parameters.

---

# 37. Untrusted Project Files

Isolates deserialization within safe sandboxes, stripping script tags or executable payloads.

---

# 38. Path Traversal Protection

Sanitizes file paths within zip archives (when parsing future version formats), rejecting entries containing path traversal markers (e.g. `../`).

---

# 39. Resource Limits

Rejects files exceeding size limits (e.g. max 500 MB) to prevent out-of-memory crashes.

---

# 40. Failure Handling

Employs fallback strategies (e.g., loading the last known backup file on checksum failures).

---

# 41. Command Engine Integration

Coordinates commits with the Command Engine.

---

# 42. History Engine Integration

Stores historical DAG sequences.

---

# 43. Event Bus Integration

Listens to save triggers and publishes status events (`storage:save-completed`).

---

# 44. Object Engine Integration

Retrieves active document state properties.

---

# 45. Plugin Integration

Exposes scoped file operations via the Plugin SDK.

---

# 46. Public API

The public API exposed by the Storage Engine:

- **loadProject(path)**: Opens and deserializes a project container.
- **saveProject(path, options)**: Serializes active project states to the target path.
- **getBackupList(path)**: Retrieves details for existing `.bak` versions.
- **validateSchema(jsonPayload)**: Runs schema validation checks.

---

# 47. Internal API

Low-level methods reserved for the Core framework:

- **writeAtomic(targetPath, dataBytes)**: Handles temporary file swaps.
- **extractZip(containerPath)**: Extracts raw file content to temp memory (reserved for future compressed extensions).
- **journalTransaction(transactionBytes)**: Appends mutation records to the active `.twej` log.

---

# 48. Testing

- Testing file writes: atomic overwrite verification, lockfile creation assertions, corrupted schema rejections, path traversal security validations.

---

# 49. ASCII Sequence Diagrams

## 49.1. Atomic Save Sequence

The diagram below details how the engine processes an atomic write:

```
CommandEngine       StorageEngine      TempFileRegistry      TargetDisk      EventBus
      |                   |                   |                  |               |
      |-- saveTrigger() ->|                   |                  |               |
      |                   |-- writeTemp() --->|                  |               |
      |                   |   (Writes .tmp)   |                  |               |
      |                   |                   |-- flush() ------>|               |
      |                   |                                      |               |
      |                   |-- renameToTarget() ----------------->|               |
      |                   |   (Overwrite target)                 |               |
      |                   |                                                      |
      |                   |-- deleteTemp() --------------------->|               |
      |                   |-- publish(SaveCompleted) --------------------------->|
      |<-- done ----------|                                                      |
```

## 49.2. WAL Journal Recovery Sequence

This sequence diagram shows crash recovery checks on boot:

```
RecoveryManager     StorageEngine      LockfileRegistry      JournalFile     ObjectEngine
       |                   |                   |                  |                |
       |-- bootChecks() -->|                   |                  |                |
       |                   |-- checkLock() --->|                  |                |
       |                   |<-- lock Active ---|                  |                |
       |                   |                                      |                |
       |                   |-- parseWAL() ----------------------->|                |
       |                   |<-- mutations ------------------------|                |
       |                   |                                                       |
       |                   |-- replayMutations() --------------------------------->|
       |                   |-- removeLock() -->|                  |                |
       |<-- recovered -----|                                                       |
```

---

# 50. State Diagrams

The validation state machine for imported project payloads:

```
                            [ Target Opened ]
                                    |
                                    v
                            [ Path Check ] ── Path Traversal ──> [ Aborted ]
                                    |
                                    v
                           [ Schema Validate ] ── Invalid Schema ─> [ Recovery Load ]
                                    |                                       |
                                    v                                       v
                             [ Ready Load ]                         [ Load Backup ]
                                    |                                       |
                                    +───────────────────┬───────────────────+
                                                        |
                                                        v
                                                 [ Object Sync ]
```

---

# 51. Future Extensions

- **Compressed Archive Containers**: Documented only as a future Version 2 reserved extension (`.twbz` or `.twbp` format) to bundle asset folders.
- **Git-Based Versioning**: Integrate local git repositories directly inside the storage layers for version history.
- **End-to-End Encryption**: Secure project container layers using custom private key hashes.

---

# 52. Storage Lifecycle and Ownership

- **52.1. Workspace Ownership**: The active project workspace controls the file handle lifecycle. The Storage Engine acts as the worker executing reads, writes, and backup sweeps.
- **52.2. Lifecycle Timeline**:
  - `Initialize`: Verifies target file locks and system capacities.
  - `Access`: Establishes read-only streams or full-access write pipes.
  - `Validate`: Confirms file parameters against JSON schemas.
  - `Terminate`: Releases lock files and cleans up temporary `.tmp` cache blocks.

---

# 53. Save State Machine

The save process cycles through the following sequential states:

```
    [ Idle ] ── Save Command ──> [ Serializing JSON ]
                                         |
                                         v
    [ Target Overwritten ] <── Rename ── [ Writing Temp ]
            |
            v
    [ Flushing Buffers ] ── Done ──> [ Idle ]
```

---

# 54. Load State Machine

The load pipeline parses documents using these operational states:

```
    [ Idle ] ── Load Request ──> [ Querying Lock ]
                                         |
                                         v
    [ Ingesting JSON ] <── Free lock ── [ Reading Disk ]
            |
            v
    [ Schema Checking ] ── Pass ──> [ Hydrating Objects ] ── Done ──> [ Idle ]
```

---

# 55. Atomic Write Guarantees

To prevent file corruption during OS crashes:

- **POSIX Renames**: Writes are first directed to `[filename].twb.tmp` within the target directory.
- **Disk Sync**: The engine invokes `fsync()` on the temporary file descriptors to commit data to physical sectors.
- **Atomic Renaming**: The engine executes an atomic `rename()` system call to overwrite the original `.twb` file. Since renaming is atomic in POSIX filesystems, any interruption leaves either the intact original file or the new file complete.

---

# 56. Interrupted Save Recovery

- **Incomplete Writes**: If a save is interrupted (e.g., power loss during JSON serialization), the target `.twb` file remains uncorrupted.
- **Temp Cleanup**: On the next application boot, the engine scans the workspace directory, identifies orphaned `.tmp` files, and deletes them.

---

# 57. Filesystem Capability Detection

On project initialization, the engine performs the following checks:

- **Write Check**: Attempts to write a small dynamic key to a hidden file in the directory.
- **Lock Check**: Evaluates if the host OS support file lock mechanisms.
- **Symlink Policies**: Checks if the target filesystem permits relative symlink traversals.

---

# 58. Cross-Platform Filesystem Behavior

The engine adapts to host OS filesystem behaviors:

- **Windows Support**: Resolves UNC network paths, maps backslash delimiters, and handles locks using custom platform calls.
- **macOS & Linux Support**: Enforces standard POSIX permissions and handles case-sensitivity rules.

---

# 59. Case-Sensitive and Case-Insensitive Path Rules

- **Path Normalization**: All imported asset path strings are converted to lower-case representation before executing duplicate checks on case-insensitive systems (e.g. Windows NTFS, macOS APFS) to prevent double imports.
- **Collision Interception**: Rejects files with paths that differ only by case on case-sensitive systems (e.g., `Asset.png` and `asset.png`) to avoid collisions on export.

---

# 60. File Permission Failures

- **Access Violations**: If the engine receives `EACCES` or `EPERM` errors, it blocks the write and alerts the user.
- **Fallback Directory**: When direct saves fail, the engine attempts to write the autosave to a safe directory (e.g., `~/.twb_backups/`).

---

# 61. Disk Full Scenarios

- **ENOSPC Handling**: If the disk runs out of space during writing, the engine catches the `ENOSPC` exception.
- **Rollback**: The engine halts the write process, deletes the incomplete `.tmp` file, and keeps the original `.twb` file intact.
- **User Alert**: Warns the user of the storage failure, prompting them to free up disk space.

---

# 62. Read-Only Media Behavior

- **Virtual Buffer**: When opening projects from read-only media (e.g., CD-ROMs, locked directories), the engine opens the file in read-only mode.
- **In-Memory Saves**: Incremental edits are stored in a virtual memory buffer.
- **Save As Prompt**: The UI disables the default "Save" action, forcing a "Save As" flow to let the user select a writable destination.

---

# 63. Network Filesystem Limitations

- **Latency Handling**: Network locations (NFS, SMB, OneDrive folders) suffer from write delays. The engine extends I/O timeouts to 5,000ms.
- **Locking Fallback**: If network protocols reject lockfile allocations, the engine falls back to timestamp checking to detect concurrent edits.

---

# 64. Project Lock Lifecycle

- **Lock Creation**: Creating a lock file (`[filename].twb.lock`) containing the application process ID (PID) and timestamp locks the project.
- **Lock Verification**: Re-evaluated during save commands.
- **Lock Release**: Deleted automatically on clean workspace closures.

---

# 65. Stale Lock Detection and Recovery

- **Stale Threshold**: A lock file is considered stale if its recorded PID is no longer active in the OS process registry, or if its timestamp has not updated for 10 minutes.
- **Recovery Prompt**: On opening a stale lock, the engine presents an options modal to let the user override and break the lock.

---

# 66. Concurrent Editor Conflict Handling

- **Modification Checks**: Before saving, the engine compares the project file's modification timestamp against its load-time stamp.
- **Conflict Resolution**: If the file has changed on disk, the engine prompts the user with conflict options:
  - Overwrite the disk file.
  - Reload the project, discarding local edits.
  - Save the local state to a separate file.

---

# 67. Autosave Scheduling and Throttling

- **Autosave Trigger**: Autosaves execute every 60 seconds of idle time if modifications exist.
- **Throttling**: Saves are delayed if active user input gestures (e.g., drag moves) are executing.
- **Coalescing**: Multiple edits are batched into a single autosave write.

---

# 68. Autosave Retention and Cleanup

- **Autosave File**: Named `[filename].twb.auto`.
- **Cleanup**: The `.auto` file is deleted automatically upon manual saves or clean exits.
- **Failure Isolation**: Keeps the main `.twb` file untouched during autosave writes.

---

# 69. Recovery Candidate Ranking

If the application crashes, the recovery manager presents candidates ranked by probability of data recovery:

1. **Active Autosave (`.twb.auto`)**: Contains the most recent state.
2. **Rotating Backups (`.twb.bak1`)**: Contains the last manual save state.
3. **Write-Ahead Log (`.twej`)**: Contains the replayed transaction sequence.

---

# 70. Backup Rotation and Retention

The engine maintains a 3-generation backup rotation:

- **Generation 1 (`.twb.bak1`)**: Created on the first manual save of the session.
- **Generation 2 (`.twb.bak2`)**: Promoted from `bak1` on the next save.
- **Generation 3 (`.twb.bak3`)**: Promoted from `bak2`, overwriting the oldest version.

---

# 71. Schema Migration Rollback

- **Validation Checkpoints**: During migrations, the engine validates the transformed JSON schema at intermediate checkpoints.
- **Rollback**: If validation fails mid-way, the engine rolls back the in-memory state, halts load, and reports the error.

---

# 72. Migration Failure Isolation

- **Component Isolation**: If a migration script fails to translate a specific component model parameter, only that component is flagged.
- **Error Placeholders**: Corrupted components are isolated and replaced with error boundaries, allowing the rest of the project to load.

---

# 73. Unknown Field Round-Trip Preservation

To maintain forward compatibility, TINC Workbench enforces these round-trip rules:

- **Ingestion**: Properties not recognized by the current schema version are parsed into a private `_unknownFields` dictionary.
- **Preservation**: These properties are preserved in memory during editing sessions.
- **Serialization**: The unknown properties are written back to the JSON payload on save.

---

# 74. Unknown Plugin Data Preservation

- **Plugin Configurations**: Configurations for uninstalled plugins are preserved in the `plugins` root array.
- **Forward Saves**: These values are written back to the file on save, ensuring plugin settings are not lost when files are shared.

---

# 75. Asset Deduplication and Content Hashing

To optimize file sizes for TWB Version 1 documents:

- **Asset Hashing**: Base64 asset inputs are hashed using the SHA-256 algorithm.
- **Deduplication**: If two components reference identical asset payloads, the engine stores a single instance in the `assets` list and points both components to its hash.

---

# 76. Missing Asset Resolution

- **Placeholder Bounds**: If a referenced asset is missing from the project path or fails to load, the engine keeps its layout dimensions and displays a default warning placeholder.
- **Search Paths**: The engine searches alternative local asset directories before declaring a resource missing.

---

# 77. Corrupted Asset Quarantine

- **Integrity Validation**: Assets are verified against their recorded SHA-256 hashes on load.
- **Quarantine**: Mismatched or corrupted assets are moved to a quarantine list, and the engine loads the project using a default warning placeholder.

---

# 78. Large Asset Streaming

- **Parser Constraints**: Loading base64 assets over 10 MB can cause memory issues.
- **Streaming Parser**: The JSON parser streams large assets in chunks, writing them directly to temporary cache files to reduce memory footprint.

---

# 79. Partial Project Loading

- **Page-Level Splits**: For large schematics, the engine reads only the project metadata and active page on load.
- **Asynchronous Hydration**: Hidden pages are parsed from the `.twb` file and hydrated in memory only when the user switches tabs.

---

# 80. Lazy Object Hydration

- **Hydration Rules**: Object styles and metadata parameters are lazy-loaded.
- **Active Hydration**: The engine parses these parameters only when the object enters the viewport or is selected.

---

# 81. Memory Pressure Behavior

When application memory allocations approach limits:

- **Cache Purging**: The engine clears cached asset buffers and unused history checkpoints.
- **Suspension**: Inactive pages are serialized back to temporary files and evicted from memory.

---

# 82. Large-Project Performance Benchmarks

Performance metrics under heavy project loads (100 MB file sizes):

- **Parsing Speed**: > 5 MB/s on standard CPU threads.
- **Auto-save Delay**: < 50ms (achieved by writing incremental delta journals).
- **Metadata Load**: < 200ms to open project outline views.

---

# 83. I/O Latency Targets

The table below outlines target execution budgets for I/O operations:

| I/O Operation | Target Latency | Condition |
| :--- | :--- | :--- |
| **Write Temp (`.tmp`)** | < 10.0 ms | Standard 50,000 nodes JSON write |
| **Flush buffers (`fsync`)** | < 5.0 ms | Commit data to physical sectors |
| **Atomic Rename (`rename`)** | < 2.0 ms | Replace temporary file on POSIX systems |
| **Lock Verification** | < 1.0 ms | Validate file lock ownership |

---

# 84. Resource Exhaustion Protection

- **File Size limit**: The engine rejects `.twb` files exceeding 500 MB to prevent out-of-memory errors.
- **Recursion depth**: Restricts nested groups to 16 levels to prevent stack overflows during parsing.

---

# 85. Decompression Bomb Protection (Zip Bomb)

*(Applicable to future version archives `.twbz`)*

- **Compression Ratio Limits**: The engine rejects archives with expansion ratios exceeding 100:1.
- **Buffer caps**: Extraction is terminated if the extracted file size exceeds the resource limits.

---

# 86. Path Traversal and Symlink Protection

- **Directory Checks**: Directory links within the storage path are resolved to their physical absolute paths.
- **Traversal Protection**: The engine sanitizes paths, rejecting any entry containing traversal markers (e.g., `../`).
- **Workspace Containment**: Path validation checks verify that all file operations are confined within the workspace directory.

---

# 87. Malformed JSON and Schema Attack Handling

- **Parser Guards**: The engine catches syntax anomalies and malformed JSON structures early, halting the parse pipeline before object instantiation.
- **Type Constraints**: Validation schemas enforce strict limits on input parameters (e.g., coordinate values must be finite numbers).

---

# 88. Plugin Storage Quota and Isolation

- **Size Quota**: The engine enforces a 1 MB size quota on custom settings stored by individual plugins in the `plugins` field.
- **Namespace Isolation**: Plugins are isolated, preventing them from reading or modifying configurations belonging to other namespaces.

---

# 89. Failure Scenarios and Recovery Matrix

The table below outlines the recovery protocols for common storage failures:

| Failure Mode | System Impact | Detection Mechanism | Recovery Procedure |
| :--- | :--- | :--- | :--- |
| **Full Disk (`ENOSPC`)** | Write fails | Catch OS exception during save | Halt save, delete `.tmp` file, keep original `.twb` file intact, warn user. |
| **Lock File Exists** | Read/write blocked | Detect `[filename].lock` on open | Verify lock age. If active, block opening; if stale, prompt user to override. |
| **Permission Denied** | File access blocked | Catch `EACCES` or `EPERM` | Halt operation, alert user, write autosave to fallback folder. |
| **Corrupted JSON** | Parse fails | Catch syntax error during parsing | Halt load, alert user, present candidate list for backup recovery. |

---

# 90. Deterministic Save Output

To ensure Git-friendliness, the JSON serializer formats properties:

- **Key Sorting**: Keys are serialized in alphabetical order (e.g., `id`, `name`, `type`).
- **Line Endings**: Normalizes line endings using standard UNIX line feeds (`\n`).
- **Float Formatting**: Coordinates are rounded to 4 decimal places to prevent float drift in Git diffs.

---

# 91. Complete ASCII Sequence Diagrams

## 91.1. In-Memory Save and Sync Pipeline

This diagram shows the sequence of checks and operations during a project save:

```
CommandEngine       StorageEngine      LockfileRegistry       BackupManager      TargetDisk
      |                   |                    |                    |                 |
      |-- saveTrigger() ->|                    |                    |                 |
      |                   |-- verifyLock() --->|                    |                 |
      |                   |<-- lock Valid -----|                    |                 |
      |                   |                                         |                 |
      |                   |-- createBackup() ---------------------->|                 |
      |                   |                                         |-- copyToBak() ->|
      |                   |-- writeTemp() --------------------------|---------------->|
      |                   |   (Writes .tmp)                         |                 |
      |                   |                                                           |
      |                   |-- renameTarget() ---------------------------------------->|
      |                   |   (Atomic replace)                                        |
      |<-- success -------|                                                           |
```

## 91.2. Schema Invalidation and Backup Restore

This sequence diagram shows handling validation failures during load:

```
UI/Workspace        StorageEngine      SchemaValidator       BackupManager       TargetDisk
      |                   |                   |                    |                  |
      |-- loadProject() ->|                   |                    |                  |
      |                   |-- parseJSON() -------------------------|----------------->|
      |                   |<-- raw json ------|                    |                  |
      |                   |                                        |                  |
      |                   |-- validate() ---->|                    |                  |
      |                   |<-- fail (schema) -|                    |                  |
      |                   |                                        |                  |
      |                   |-- loadBackup() ----------------------->|                  |
      |                   |                                        |-- readBak() ---->|
      |                   |<-- backup data ------------------------|                  |
      |<-- loaded(Bak) ---|                                                           |
```

---

# 92. Complete Storage State Diagrams

## 92.1. File Locking and Lockfile Lifecycle

The state machine for the project lockfile:

```
                         [ Unlocked ]
                              |
                              | Open Project
                              v
                      [ Lock Creation ]
                              |
               +--------------+--------------+
               |                             |
          (PID Active)                 (PID Stale)
               |                             |
               v                             v
        [ Lock Enforced ]            [ Stale Lock ]
               |                             |
               | Close Project               | Override Click
               v                             v
         [ Lock Deleted ] <──────────────────+
```

---

# 93. Detailed Examples for Every Major Storage Lifecycle

Below are concrete JSON payload examples representing serialization formats for the core storage categories:

## 93.1. Project Serialization State (`core:project-save`)

Represents a project document matching TWB Version 1 layout rules:

```json
{
  "schemaVersion": "1.0.0",
  "project": {
    "id": "proj-992",
    "name": "Analog Amplifier Module",
    "description": "Dual-stage operational amplifier layout.",
    "author": "turan",
    "createdAt": 1783978500000,
    "updatedAt": 1783978600000
  },
  "pages": [
    {
      "id": "page-1",
      "name": "Schematic View",
      "viewport": {
        "centerX": 150.0000,
        "centerY": 200.0000,
        "zoom": 1.0000
      },
      "layers": [
        {
          "id": "layer-1",
          "name": "Wiring",
          "visible": true,
          "locked": false,
          "objects": [
            {
              "id": "opamp-1",
              "type": "ic",
              "geometry": {
                "x": 100.0000,
                "y": 120.0000,
                "width": 40.0000,
                "height": 40.0000,
                "rotation": 0.0000
              },
              "style": {
                "fill": "#ffffff",
                "stroke": "#000000",
                "strokeWidth": 1.5000
              },
              "metadata": {
                "partNumber": "LM741"
              }
            }
          ]
        }
      ]
    }
  ],
  "assets": [
    {
      "id": "icon-opamp",
      "type": "image/png",
      "data": "iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH5QgK...",
      "hash": "sha256-a1b2c3d4e5f6g7h8..."
    }
  ],
  "plugins": [
    {
      "id": "com.tinc.router",
      "settings": {
        "traceWidth": "12mil",
        "viaSize": "24mil"
      }
    }
  ],
  "settings": {
    "grid": {
      "enabled": true,
      "size": 10.0000
    },
    "snap": {
      "enabled": true,
      "targets": ["ports", "grid"]
    },
    "units": "mil"
  },
  "metadata": {
    "exportedFrom": "Workbench v0.1.0"
  }
}
```

## 93.2. Validation Failure Exception Report (`core:validation-error`)

Represents schema errors logged when loading a malformed project:

```json
{
  "errorCode": "SE_ERR_SCHEMA_INVALID",
  "filePath": "/workspace/project.twb",
  "errors": [
    {
      "path": "/pages/0/layers/0/objects/0/geometry/x",
      "message": "Required property 'x' is missing.",
      "schemaConstraint": "required"
    },
    {
      "path": "/schemaVersion",
      "message": "Value 'invalid-ver' does not match SemVer pattern.",
      "schemaConstraint": "pattern"
    }
  ]
}
```

## 93.3. Recovery Metadata Registry (`core:recovery-registry`)

Represents recovery parameters stored in local settings to index crashed workspaces:

```json
{
  "crashedSessionId": "sess-889102",
  "crashedFilePath": "/workspace/project.twb",
  "crashTimestamp": 1783978610000,
  "candidates": [
    {
      "type": "auto",
      "path": "/workspace/project.twb.auto",
      "timestamp": 1783978605000,
      "sizeBytes": 104820
    },
    {
      "type": "backup",
      "path": "/workspace/project.twb.bak1",
      "timestamp": 1783978500000,
      "sizeBytes": 104510
    }
  ]
}
```
