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

## 7. Permissions
Plugins explicitly request permissions:
- File System
- Network
- Clipboard
- AI
- Import/Export

## 8. Public APIs
- Project API
- Canvas API
- Selection API
- Command API
- Event API
- Storage API

Plugins never access internal state directly.

## 9. Events
Plugins subscribe to events such as:
- ProjectOpened
- ProjectClosed
- ObjectCreated
- ObjectUpdated
- SelectionChanged

## 10. Commands
Plugin commands must support Undo and Redo.

## 11. UI Extensions
Plugins may contribute:
- Dock Panels
- Inspector Tabs
- Toolbar Buttons
- Status Widgets
- Dialogs

## 12. Compatibility
Plugins declare:
- minimumSdkVersion
- maximumTestedSdkVersion

## 13. Security
Least privilege.
Manifest validation.
Permission validation.

## 14. Distribution
- Local
- Official Registry
- Enterprise Repository

## 15. Design Rules
- Core owns architecture.
- Plugins own domain knowledge.
- APIs remain stable.
