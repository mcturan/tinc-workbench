# Plugin SDK Specification

**Project:** TINC Workbench
**Version:** 0.1.0-draft

## 1. Purpose
The Plugin SDK defines how extensions integrate with TINC Workbench without modifying the Core.

## 2. Goals
- Stable API
- Versioned contracts
- Sandboxed execution
- Independent lifecycle
- Backward-aware compatibility

## 3. Plugin Types
- Object Library
- Tool
- Panel
- Importer
- Exporter
- Simulation
- AI Assistant
- Theme

## 4. Manifest
Required:
- id
- name
- version
- author
- sdkVersion
- entryPoint

## 5. Lifecycle
Discover → Validate → Load → Initialize → Register → Activate → Deactivate → Unload

## 6. Registration
Plugins may register:
- Objects
- Tools
- Commands
- Panels
- Property Editors
- File Handlers
- Context Menu Items
- Keyboard Shortcuts

## 7. Permissions and Permission Manager

- **Permission Manager**: Plugin permission enforcement is owned exclusively by the `Plugin Manager`, utilizing a dedicated `Permission Manager` nested within its boundary.
- **Manifest Declarations**: Plugin manifests must explicitly declare all requested capabilities. Unknown or invalid capability names fail manifest validation at load time.
- **Deny-by-Default Semantics**: All undeclared capabilities are denied by default. Permission checks occur at SDK/API gateways before any privileged SDK operations.
- **A plugin must never gain capability merely because an SDK method exists.**
- **Manifest Capabilities**: Manifests must declare at least:
  - `project.read`: Read component/page structures.
  - `project.mutate`: Dispatch canonical commands to modify project state.
  - `command.register`: Register custom commands with the Command Engine.
  - `event.subscribe`: Subscribe to event namespaces.
  - `tool.register`: Register custom canvas tools.
  - `ui.register`: Register custom panels or widgets.
  - `storage.read`: Scoped read storage access.
  - `storage.write`: Scoped write storage access.
  - `network.access`: Request external network calls (no Collaboration Service is defined for Version 1).
  - `clipboard.read`: Read host clipboard.
  - `clipboard.write`: Write to host clipboard.

## 8. Plugin Mutation Boundary

- **No Direct Mutation**: Plugins must not mutate the Object Engine directly. All canonical mutations must dispatch through the Command Engine.
- **Commands and Validation**: Custom plugin commands must use registered command types and route through Command Engine validation and orchestration.
- **Execution Boundaries**: Plugin tools and UI follow the same mutation boundaries as core tools and UI. Plugin failures must not bypass the History Engine or committed Event Bus ordering.

## 9. Scoped Storage Provider

- **Storage Engine Separation**: The Storage Engine owns physical file access, serialization boundaries, and enforces the already-authorized scoped provider boundary. The Storage Engine does not decide plugin permissions; authorization is decided by the Plugin Manager/Permission Manager.
- **Scoped StorageProvider API**: When the required storage capability is granted, the Plugin SDK exposes a sandboxed `StorageProvider` scoped exclusively to the authorized plugin namespace/directory (e.g. `/plugins/sandbox/[plugin-id]/`).
- **No Unrestricted Access**: Plugins must not receive unrestricted filesystem paths or arbitrary host filesystem access.
- **Conceptual Operations**:
  - `read(path)`: Fetch data from the scoped sandbox.
  - `write(path, data)`: Perform atomic writes within the scoped sandbox.
  - `delete(path)`: Remove scoped sandbox files.
  - `list(directory)`: List files within the scoped sandbox directory.
  - `exists(path)`: Check file presence.
- **Enforcement Rules**:
  - **Path Traversal Rejection**: Rejects any path containing traversal patterns (`../` or absolute symlinks outside the namespace).
  - **Namespace Containment**: Strictly restricts file operations to the authorized plugin namespace.
  - **Quota Enforcement**: Caps storage space allocated per plugin (default: 10MB).
  - **Atomic Writes**: Storage Engine Renames/POSIX Atomic writes are delegated to prevent file corruption.
  - **Revocation**: Access is revoked instantly if capabilities are disabled.
  - **Uninstall Cleanup**: Orphaned storage folders are purged when a plugin is uninstalled.

## 10. Plugin Event and Command Isolation

- **Namespace Isolation**: Plugin event namespaces and command type namespaces must be strictly isolated (e.g. `plugin-id:event.name`, `plugin-id:command-type`).
- **Core Reservation**: Plugins are blocked from registering core-reserved namespaces (e.g., `core:*`, `ui:*`).
- **Permission Separability**:
  - Event subscription does not imply mutation permission.
  - Command registration does not imply `project.mutate` permission.
  - Canonical mutation execution always requires Command Engine validation and `project.mutate` capability.

## 11. SDK Facade Architecture

- **Facade Pattern**: The Plugin SDK is a pure contract/facade interface. It owns no canonical state.
- **Manager Domain**: The Plugin Manager retains ownership of plugin lifecycle, manifest validation, permission decisions, plugin namespace identity, sandbox/proxy creation, and crash isolation. Core engines retain their canonical responsibilities.

## 12. Compatibility
Plugins declare:
- `minimumSdkVersion`
- `maximumTestedSdkVersion`

## 13. Security
- Deny-by-default execution sandboxing.
- Rigid API gateway validation.
- Crash isolation: plugin runtime crashes are caught and quarantined without crashing the host workbench process.

## 14. Distribution
- Local directory scanning.
- Official TINC Registry validation.

## 15. Design Rules
- Core owns architecture and canonical state.
- Plugins provide domain/object knowledge and run inside sandboxed boundaries.
- No Version 1 Collaboration Service or remote multi-user sync is defined.
