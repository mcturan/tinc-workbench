# UI Framework Specification

**Project:** TINC Workbench
**Version:** 0.1.0-draft

---

# 1. Purpose

The UI Framework is the presentation and windowing management layer of TINC Workbench. It provides the application shell, docking layout containers, menus, toolbars, property inspectors, and status bars, orchestrating the interaction between core framework services (Canvas, Selection, Commands, Plugins) and the user interface.

---

# 2. Goals

- **Consistency**: Provide a uniform, modern visual aesthetic and layout experience.
- **Customizability**: Enable panels to dock, float, resize, and stack according to user workflow needs.
- **Extensibility**: Expose secure, sandboxed layout injection APIs for plugin panels.
- **Performance**: Maintain clean, responsive rendering (under 16ms frame cycles) for all UI overlays and inspector shifts.

---

# 3. Responsibilities

- Rendering the outer application shell and routing viewport screens.
- Owning raw DOM pointer, keyboard, touch, and wheel event intake through the application Input Router.
- Normalizing input events and routing them to UI controls, Command Engine shortcuts, Tool System gestures, or Canvas viewport navigation according to routing precedence.
- Coordinating docking panels (resizing, dragging, tabbed nesting).
- Managing keyboard shortcuts and focus navigation.
- Exposing UI APIs (Command Palette, Modals, Dialogs, Notifications).
- Syncing Property Inspector inputs with the Selection Engine and Command Engine.
- Mediating DOM pointer capture requests from the Tool System.

---

# 4. Non-Responsibilities

The UI Framework does NOT:

- Track active object models or coordinate geometry (Object Engine / Geometry Engine domain).
- Render canvas graphics (lines, components, wires) directly (Rendering Engine domain).
- Process project file writes or manage local-first autosave backups (Storage Engine domain).
- Mutate canonical project state directly.
- Delegate raw DOM input ownership to the Canvas Engine.

---

# 5. UI Architecture

The UI Framework forms the outer layer of the system:

- **Core Integrations**: Binds components to the Event Bus to receive state updates.
- **Input Router**: Owns raw DOM input intake, normalizes events, and routes them to UI controls, Tool System gestures, Canvas viewport navigation, or Command Engine shortcuts.
- **Downstream Callbacks**: Dispatches state-changing directives to the Command Engine on user actions.
- **Plugin Sandbox**: Limits custom views using rendering sandboxes.

```
+-----------------------------------------------------------------+
|                        UI Framework                             |
+-----------------------------------------------------------------+
       │ (Dispatch user actions)          ▲ (Listen to layout state)
       ▼                                  │
+-----------------------------------------------------------------+
|                        Command Engine                           |
+-----------------------------------------------------------------+
       │                                  ▲
       │ (Query selections/viewports)     │ (Publish updates)
       ▼                                  │
+------------------------------------+    │
|         Selection Engine           |    │
+------------------------------------+    │
                                          ▼
+-----------------------------------------------------------------+
|                         Event Bus                               |
+-----------------------------------------------------------------+
```

---

# 6. Application Shell

The Application Shell represents the top-level window layout enclosing the workbench:

- **Titlebar**: Contains application logo, project name, unsaved-changes indicators, and window controls.
- **Main Menu Bar**: Traditional drop-down interface for File, Edit, View, Page, Plugin, and Help options.
- **Toolbar**: Centralized shortcut triggers for active tools and commands.
- **Sidebar Panels**: Docking areas positioned on the left and right window margins.
- **Central Canvas Viewport**: The main interaction region containing the document canvas.
- **Status Bar**: Bottom-aligned details indicator.

---

# 7. Workspace Layout

- **Grid Containers**: The workspace layout uses a flexible flexbox or CSS Grid layout.
- **Proportional Resizing**: Layout containers adjust relative proportions dynamically when side panels are collapsed.
- **Central Window**: The center grid cell is reserved for the active page canvas view.

---

# 8. Panels

Panels are modular workspace containers:

- **File Navigator**: Tree view displaying pages, folders, and local project resources.
- **Property Inspector**: Parameter grid displaying attributes of the selected components.
- **Layer Manager**: List controls displaying visibility, locking, and z-index ordering.
- **Debug Console**: Log tracker showing telemetry events.

---

# 9. Docking

- **Docking Regions**: Left, right, bottom, and central stacking zones.
- **Tabbed Stacking**: Dragging a panel header onto another combines them into a single tabbed group.
- **Dynamic Resize**: Panel borders contain split-pane handles. Dragging resizes adjacent panels proportionally.

---

# 10. Toolbars

- **Primary Actions**: File creation, save, undo, and redo triggers.
- **Tool Triggers**: Tool choices (Select, Wire, Component Placement, Pan).
- **Zoom Controls**: Presets for zoom values (fit, scale 100%, zoom percentage indicator).

---

# 11. Menus

- **Main Menu**: Traditional top-aligned dropdown lists.
- **Keyboard Overlays**: Key combinations are printed next to menu label text.
- **Dynamic Options**: Menu options are disabled if they are invalid for the active workspace state.

---

# 12. Context Menus

- **Right-Click Activation**: Displays commands based on the active selection.
- **Categorization**: Groups options by action class (e.g., Edit, Align, Grouping, Properties).
- **Extension Hooks**: Plugins can append context menu items via SDK registries.

---

# 13. Command Palette

- **Trigger**: Activated by pressing `Ctrl+P` or `Ctrl+Shift+P`.
- **Fuzzy Search**: Features input field filtering list options by keyword.
- **Execution**: Pressing enter dispatches the selected command to the Command Engine.

---

# 14. Status Bar

- **Coordinates**: Displays active mouse coordinates in World Space units.
- **Workspace Settings**: Shows grid status, snapping configurations, and default measurement units.
- **Task Telemetry**: Displays indicators for background operations (e.g., autosaving).

---

# 15. Dialogs

- **Prompts**: Blocking dialog modals requesting explicit choices (e.g., exit validations, file overwrite warnings).
- **Focus Trap**: Traps keyboard focus within the dialog until resolved.

---

# 16. Modals

- **Overlays**: Semi-transparent backgrounds covering the workspace.
- **Configuration Panels**: Used for complex forms (e.g., Keyboard Shortcut Customizer, Global Settings).

---

# 17. Notifications

- **Corner Toasts**: Banners showing system statuses.
- **Auto-Dismiss**: Banners disappear after 5 seconds, except for error reports.
- **Interaction**: Features close buttons and optional action triggers.

---

# 18. Property Inspector

- **Attribute Mapping**: Displays editable fields (inputs, dropdowns, check-boxes) matching the properties of the selected component.
- **Command Dispatches**: Input modifications dispatch update commands to the Command Engine on blur.
- **Multi-Selection Grids**: If multiple components are selected, the inspector displays shared attributes.

---

# 19. Project Navigation

- **Sheet Navigator**: Tree view displaying pages, folders, and local project resources.
- **Layer Selector**: Controls visibility and selection bounds of active layers.

---

# 20. Canvas Integration

- **Resize Handler**: Listens to viewport resize events, updating drawing boundaries.
- **Viewport Routing**: The Input Router routes viewport navigation requests to Canvas Engine runtime viewport services when routing precedence selects canvas navigation.
- **No Mutation Ownership**: Canvas integration does not mutate canonical project state.

---

# 21. Tool System Integration

- **Tool Highlighting**: Highlighting active tool icons on the toolbar.
- **Cursor Syncing**: Syncs the canvas pointer cursor to match the active tool (e.g. crosshair for routing).
- **Normalized Input Delivery**: The Input Router delivers normalized input events to the Tool System.
- **Pointer Capture Mediation**: The UI Framework performs DOM pointer capture and release when requested by the Tool System.

---

# 22. Selection Integration

- **Event Listener**: Subscribes to `ui:selection.changed` to refresh Property Inspector displays.
- **Bounds Updates**: Recalculates selection outlines when components are moved.

---

# 23. Command Engine Integration

- **Interaction**: Dispatches state-changing directives through the Command Engine on user actions.
- **History Bindings**: Dispatches undo/redo triggers.
- UI actions that mutate canonical project state must dispatch through the Command Engine.

---

# 24. Event Bus Integration

- **Input Events**: Publishes UI-level input notifications only after Input Router normalization and routing decisions.
- **UI Events**: Listens to layout changes and updates panel boundaries.

---

# 25. Plugin UI Integration

- **Sandboxed Panels**: Plugins load UI content inside sandboxed `iframe` panels.
- **SDK Bridging**: Plugins interact with the main shell using post-message APIs.
- **UI Registries**: Plugins can append context menu items and toolbar nodes.

---

# 26. Keyboard and Shortcut Model

- **Shortcut Maps**: Maps key combinations to commands (e.g. `Ctrl+Z` -> Undo, `Ctrl+Y` -> Redo, `Delete` -> Delete Object).
- **Conflict Prevention**: System shortcuts override default browser key behaviors.
- **Mutation Safety**: Shortcuts that modify canonical project state dispatch through the Command Engine.

---

# 26.1. Input Router

The Input Router is the UI Framework boundary for raw DOM input.

Raw DOM inputs owned by the Input Router:

- pointer events
- keyboard events
- touch events
- wheel events

Normalized input event contracts are conceptual data records that include:

- input kind
- phase
- target UI region
- screen coordinate when applicable
- modifier state
- pointer identifier when applicable
- active canvas/page identifier when applicable

Routing precedence:

1. Modal UI and dialogs.
2. Focused text fields and controls.
3. Command Palette and global command shortcuts.
4. Active Tool System gestures.
5. Canvas viewport navigation.
6. Passive UI notifications and status updates.

Rules:

- The Input Router sends normalized tool input to the Tool System.
- The Tool System owns gesture and tool interpretation.
- Canvas Engine owns runtime viewport services but does not own raw DOM input dispatch.
- UI Framework and Input Router must not mutate canonical project state directly.
- Any UI action that changes canonical project state dispatches through the Command Engine.

---

# 26.2. Pointer Capture Mediation

Pointer capture is requested by the Tool System and performed by the UI Framework Input Router DOM boundary.

Rules:

- Tool System requests capture with the active pointer and target canvas context.
- Input Router performs the DOM capture and continues sending normalized input to the Tool System.
- Tool System requests release on gesture completion or cancellation.
- Input Router releases DOM capture and restores normal routing precedence.

---

# 27. Focus Management

- **Focus Navigation**: Focus shifts sequentially on Tab.
- **Focus Rings**: Visual focus indicators wrap active inputs.

---

# 28. Drag and Drop

- **Library Placement**: Dragging components from the library panel onto the canvas dispatches object creation commands through the Command Engine.
- **Panel Rearrangement**: Dragging panel headers allows users to change panel layout positions.

---

# 29. Accessibility

- **Standard Compliance**: Implements ARIA roles and keyboard-friendly focus loops.
- **Contrast Support**: Works with high-contrast screen reader guidelines.

---

# 30. Localization

- **Dictionary Mapping**: Replaces text strings using dictionary mapping files based on user locale.
- **Layout Adaptations**: Panels adapt layout widths based on translation text dimensions.

---

# 31. Theme Integration

- **Theme Modes**: Supports Dark, Light, and High-Contrast modes using CSS variables.
- **Dynamic Updates**: Switches styles without requiring application reloads.

---

# 32. Responsive Layout

- **Responsive Grid**: Collapses side panels on smaller screens to prioritize canvas space.
- **Mobile Adaptations**: Simplifies menus into hamburger layouts on mobile screens.

---

# 33. UI State Persistence

- **Layout Caching**: Saves active panel dimensions and positions to local storage.
- **Session Restoration**: Restores the workspace layout on startup.

---

# 34. Performance

- **Response Latency**: Input response latency is kept under 8ms.
- **Transitions**: CSS animations are optimized to run at a stable 60 FPS.

---

# 35. Memory Model

- **Cleanups**: Removes event listeners when panels are closed or hidden.
- **DOM Recycling**: Recycles property list items to prevent memory leaks during multi-select operations.

---

# 36. Failure Handling

- **Plugin Isolation**: If a plugin view crashes, the framework displays an error placeholder inside the panel, isolating the core shell.
- **Recovery Dialog**: Prompts the user to reload the workspace if a core panel crashes.

---

# 37. Security

- **Input Sanitization**: Property inputs are sanitized to block script injections.
- **Sandbox Restrictions**: Plugin panels cannot access the main document's DOM.

---

# 38. Public API

The public API exposed by the UI Framework:

- **registerPanel(id, config)**: Registers a custom workspace panel.
- **showModal(id, options)**: Displays a target modal overlay.
- **showNotification(message, type)**: Triggers a transient corner toast banner.
- **addShortcut(keyCombination, commandId)**: Binds a custom shortcut to the registry.

---

# 39. Internal API

Low-level methods reserved for the Core framework:

- **dockPanel(panelId, targetRegion)**: Modifies workspace docking layout coordinates.
- **focusNext()**: Shifts active keyboard focus ring to next sequence target.
- **saveLayoutState()**: Serializes window layout settings to storage.

---

# 40. Testing

- Focus loop tests, panel resize verifications, shortcut execution audits.

---

# 41. ASCII Sequence Diagrams

## 41.1. Panel Drag-Dock Sequence

The sequence diagram below shows how a panel is dragged and docked to a target region:

```
UserGesture         UIFramework        PanelContainer      LayoutRegistry      CanvasEngine
    |                    |                   |                   |                  |
    |-- dragHeader() --->|                   |                   |                  |
    |                    |-- checkRegion() ->|                   |                  |
    |                    |<-- target Dock ---|                   |                  |
    |                    |                                       |                  |
    |                    |-- updateLayout() -------------------->|                  |
    |                    |   (Recalculate bounds)                |-- notify() ----->|
    |                    |                                                          |
    |-- drop() --------->|                                                          |
    |                    |-- commitPanel() ->|                                      |
    |<-- done -----------|                                                          |
```

## 41.2. Command Palette Launch Sequence

This diagram shows triggering the Command Palette using shortcuts:

```
Keyboard          UIFramework        ShortcutRegistry     CommandPalette      CommandEngine
   |                    |                    |                   |                  |
   |-- Ctrl+P --------->|                    |                   |                  |
   |                    |-- matchShortcut() ->|                   |                  |
   |                    |<-- showPalette ----|                   |                  |
   |                                                             |                  |
   |-- type("wire") -------------------------------------------->|                  |
   |-- pressEnter() -------------------------------------------->|                  |
   |                                                             |-- dispatch(cmd) >|
   |<-- closePalette --------------------------------------------|                  |
```

---

# 42. State Diagrams

The docking layout panel states:

```
                             [ Floating ]
                                  |
                                  | Drag gestures
                                  v
                           [ Resizing Pane ]
                                  |
               +------------------+------------------+
               |                                     |
         Release bounds                        Snap target met
               |                                     |
               v                                     v
          [ Floating ]                          [ Docked ]
                                                     |
                                                     | Drag header
                                                     v
                                               [ Floating ]
```

---

# 43. Future Extensions

- **Split-Screen Canvas Viewports**: Allow viewing multiple schematic sheets side-by-side in independent views.
- **Custom Theme Creator**: Visual theme builder allowing users to design CSS color profiles.
- **Collaborative Action Chat**: Embedded messaging tab for multi-user project sessions.

---

# 44. UI Lifecycle and Ownership

- **44.1. Shell Ownership**: The application window holds top-level ownership of the layout nodes. Structural views (e.g. sidebars, toolbars) are instantiated hierarchically under this window.
- **44.2. UI Node Lifecycle**:
  - `Initialize`: Configures styling scopes and registers key mappings.
  - `Mount`: Injects DOM trees and attaches layout resize event listeners.
  - `Update`: Re-evaluates configurations in response to event modifications.
  - `Unmount`: Detaches listeners and reclaims panel DOM fragments.

---

# 45. Application Shell Initialization and Shutdown

- **45.1. Initialization**: On launch, the shell loads the user's layout state, resolves the active theme, binds window resize events, and triggers Event Bus communication.
- **45.2. Shutdown**: Before closing, the shell unsubscribes from the Event Bus, flushes unsaved configurations to local storage, and terminates running plugin sandbox frames.

---

# 46. Workspace Layout State Model

- **46.1. Tree Representation**: The docking layout is modeled as a tree structure. Leaf nodes represent panel containers, and parent nodes represent horizontal or vertical split containers.
- **46.2. Split Nodes**: Split nodes store division percentages (e.g. `0.25` for sidebar width) and orientation.
- **46.3. Leaves**: Panel leaves store active tab indices, panel identifiers, and visibility flags.

---

# 47. Docking Tree Lifecycle and Validation

- **47.1. Validation Checks**: Docking tree modifications are validated to block invalid operations like circular nesting or split ratios outside `[0.05, 0.95]`.
- **47.2. Layout Recovery**: If a docking drag results in layout corruption, the engine resets the workspace configuration back to the default layout.

---

# 48. Panel Registration and Removal

- **48.1. Panel Registrations**: Plugins and core systems register custom panels using unique identifiers and layout configurations.
- **48.2. Removal**: Unregistering a panel unmounts its DOM elements, terminates active event listeners, and removes its node from the layout tree.

---

# 49. Panel Minimum and Maximum Sizing Rules

- **49.1. Constraints**: Panels specify sizing bounds (e.g. File Navigator minimum width is 150px) to prevent layout collapses.
- **49.2. Drag Enforcement**: Split pane resize controllers check these parameters, blocking drag operations that exceed the size boundaries.

---

# 50. Floating and Detached Panel Behavior

- **50.1. Floating Panels**: Panels can float as absolute overlays on top of the workspace canvas.
- **50.2. Detached Windows**: On platforms supporting multiple windows, panels can detach into independent browser windows, synchronizing state with the main application thread.

---

# 51. Focus Ownership and Focus Restoration

- **51.1. Focus Ring**: Keyboard focus is tracked by a single manager. Input fields, buttons, and canvas nodes compete for focus.
- **51.2. Focus Restoration**: Closing a modal window automatically restores focus back to the workspace element that launched it.

---

# 52. Keyboard Event Routing and Shortcut Conflicts

Keyboard inputs are processed by the Input Router using a priority queue:

1. **Active Input Fields**: Enforce local text editing (first priority).
2. **Modals & Dialogs**: Route events locally to trap user actions.
3. **Command Palette**: Processes inputs when visible.
4. **Global Key Mappings**: Bypasses canvas events (e.g., `Ctrl+S`).
5. **Active Tool System Gestures**: Receives normalized keyboard events when tool context owns the focused canvas interaction.
6. **Canvas Navigation**: Receives viewport navigation requests through Canvas Engine runtime viewport services.

- **Conflicts**: Duplicate keybind mappings execute the command with the highest routing priority.

---

# 53. Command Palette Ranking and Filtering

- **Jaro-Winkler Matching**: Command list options are filtered using the Jaro-Winkler fuzzy search algorithm.
- **Ranking**: Matches are sorted based on query match score, chronological usage frequency, and context flags.

---

# 54. Context Menu Lifecycle and Invalidation

- **54.1. Invalidation**: Context menus are dismissed on clicking anywhere outside the menu boundaries.
- **54.2. Context Identification**: Right-click actions gather coordinates and pass target component metadata to context menu generators to build the menu options.

---

# 55. Modal Stacking and Interaction Blocking

- **55.1. Backdrop Layer**: Modals display on top of a dark, semi-transparent backdrop layer that captures all pointer inputs, blocking interactions with the background workspace.
- **55.2. Modal Stacking**: Multiple modals stack using increasing CSS `zIndex` layers.
- **55.3. Keyboard Trap**: The focus manager traps keyboard navigation inside the topmost modal window.

---

# 56. Notification Queue Limits and Throttling

- **56.1. Queue Cap**: Visible corner toasts are capped at 5 items. Additional notifications are placed in a background queue.
- **56.2. Coalescing**: Duplicate status notifications are merged into a single alert showing an iteration count.

---

# 57. Property Inspector Mixed-Value States

- **57.1. Mixed Placeholder**: If the active selection contains multiple components with different property values, the Property Inspector displays a `"Mixed"` placeholder.
- **57.2. Mass Overrides**: Entering a new value in a mixed field applies the new value uniformly across all selected components.

---

# 58. Inspector Validation and Command Dispatch

- **58.1. Data Verification**: Changes in property fields are validated against expected types (e.g., colors must match hex patterns).
- **58.2. Command Trigger**: If validation passes, the change is dispatched as an update command to the Command Engine.
- **58.3. Undo Points**: After Command Engine success, the history system records the resulting undo point.

---

# 59. Drag-and-Drop Payload Validation

- **59.1. Drag Verification**: Drag gestures pass metadata detailing component type and plugin requirements.
- **59.2. Target Acceptance**: Canvas drops are blocked if the target coordinates do not support the dragged component type.

---

# 60. Cross-Panel Drag-and-Drop

- **60.1. Library Drops**: Dragging elements from library panels into target layers or canvas viewports dispatches object creation commands through the Command Engine.
- **60.2. Page Moves**: Dragging components between pages dispatches move commands through the Command Engine.

---

# 61. Canvas Focus and Pointer Capture Boundaries

- **61.1. Pointer Capture**: During drawing gestures, the Tool System requests pointer capture and the Input Router performs the DOM capture.
- **61.2. Normalized Delivery**: Captured pointer movement is delivered to the Tool System as normalized input.
- **61.3. Viewport Blur**: Clicking on sidebar panels causes the Input Router to release capture or cancel the active gesture according to Tool System cancellation rules.

---

# 62. Plugin UI Registration and Isolation

- **62.1. Sandboxed Iframes**: Plugin panels render inside HTML `iframe` containers with minimal permission settings (blocking parent document access).
- **62.2. Post-Message API**: Communication between the plugin container and core services is mediated using asynchronous post-message calls.

---

# 63. Malicious or Failing Plugin UI Components

- **63.1. Timeout Monitor**: The framework monitors plugin thread responses. If a plugin panel hangs, it is isolated and closed.
- **63.2. Crash Recovery**: Crashed plugin windows display an error screen, preventing the main shell from freezing.

---

# 64. UI State Persistence and Schema Migration

- **64.1. Layout Saves**: Layout configuration parameters are serialized to local storage on save.
- **64.2. Schema Versioning**: Layout files store schema versions. Version changes trigger layout migrations before layout restoration.

---

# 65. Corrupted UI State Recovery

- **65.1. Invalidation Checks**: If restoring a layout file throws syntax errors, the engine flags the layout state as corrupt.
- **65.2. Factory Resets**: The engine deletes the corrupted configuration settings and resets the workspace to the factory layout structure.

---

# 66. Multi-Window and Detached Workspace Rules

- **66.1. Secondary Monitors**: Users can detach inspectors or page lists into secondary windows.
- **66.2. IPC Synclinks**: Detached child windows communicate with the main window using IPC sync connections, maintaining a single shared Object Engine state.

---

# 67. Accessibility Focus Order and Screen Reader Semantics

- **67.1. Tab Navigation**: Tab key loops follow a logical top-to-bottom, left-to-right sequence.
- **67.2. ARIA Declarations**: Interactive controls are configured with matching ARIA labels to support screen readers.

---

# 68. Keyboard-Only Operation

- **Keyboard Traversal**: Users can navigate the entire interface, open menus, resize panels, and route wires using keyboard shortcuts.
- **Shortcut Registry**: Keyboard shortcut bindings are customizable through the settings panel.

---

# 69. Localization Expansion and RTL Layout Rules

- **69.1. RTL Support**: CSS layout directions are updated dynamically when switching to RTL (Right-to-Left) languages.
- **69.2. Border Adjustments**: Layout borders and paddings adjust automatically to match localization requirements.

---

# 70. Theme Token Resolution and Invalid Themes

- **70.1. Theme Variables**: Themes map colors, borders, and margins to CSS custom properties.
- **70.2. Invalidation Fallback**: If a theme configuration file is corrupt or missing, styling defaults back to the core Dark theme.

---

# 71. Responsive Degradation Rules

As screen dimensions decrease, the framework adapts:

- **1024px Width**: Collapses File Navigator and layer lists into toggleable sidebar panels.
- **768px Width**: Replaces toolbar text labels with icon-only displays.
- **480px Width**: Hides secondary panels and collapses the top menu bar into a single hamburger menu.

---

# 72. Large-Project UI Performance Targets

Performance metrics under heavy project loads (10,000 components):

- **Inspector Load Latency**: < 4.0 ms on selection change.
- **Panel Resize FPS**: Stable 60 FPS.
- **Shortcut Dispatch Delay**: < 2.0 ms.

---

# 73. Frame and Interaction Latency Budgets

To prevent interface lag:

- **Resize Checks**: < 1.0 ms.
- **Inspector Updates**: < 3.0 ms.
- **Toast Redraws**: < 1.0 ms.

---

# 74. UI Memory Budgets and Cache Eviction

- **UI Memory Cap**: UI allocations (caches, menu fragments, notifications) are capped at 10 MB.
- **DOM Cleansing**: Old notification DOM nodes and closed panels are fully destroyed to reclaim memory.

---

# 75. Failure Scenarios and Recovery Matrix

The table below outlines recovery protocols for common UI failures:

| Failure Mode | System Impact | Detection Mechanism | Recovery Procedure |
| :--- | :--- | :--- | :--- |
| **Plugin UI Crash** | Panel displays blank space | Monitor iframe post-message responses | Reload iframe. If crashes persist, replace with error placeholder. |
| **Theme Load Error** | Layout styles collapse | Check CSS variables resolution | Fall back to baseline Dark theme settings. |
| **Focus Loop Trap** | Tab key navigation fails | Catch tab key boundary exceptions | Reset focus to application shell's root node. |
| **Notification Flood** | Screen corners overflow | Check notification queue counts | Merge duplicate alerts and display count badges. |

---

# 76. Security and Untrusted UI Metadata

- **Label Sanitization**: Document title strings are sanitized before rendering to block XSS injections.
- **Plugin Sandbox**: Plugin interfaces run inside isolated sandboxes to prevent access to document cookies or local storage databases.

---

# 77. Complete ASCII Sequence Diagrams

## 77.1. In-Memory Workspace State Restoration

This diagram shows restoring workspace layouts from local caches on startup:

```
AppShell          UIFramework         LayoutRegistry      StorageEngine       TargetDisk
   |                   |                    |                   |                  |
   |-- initShell() --->|                    |                   |                  |
   |                   |-- loadLayout() --->|                   |                  |
   |                   |                    |-- readConfig() -->|                  |
   |                   |                    |                   |-- getLocal() --->|
   |                   |                    |<-- raw config ----|                  |
   |                   |<-- layoutTree -----|                                      |
   |                   |                                                           |
   |                   |-- validateTree()                                          |
   |                   |-- mountPanels()                                           |
   |<-- UI ready ------|                                                           |
```

## 77.2. Dynamic Context Menu Invalidation

This diagram shows context menu generation and dismiss events:

```
InputRouter       UIFramework         SelectionEngine     ContextMenu         TargetDisk
   |                   |                     |                 |                  |
   |-- rightClick(P) ->|                     |                 |                  |
   |                   |-- querySelected() ->|                 |                  |
   |                   |<-- active ID list---|                 |                  |
   |                   |                                       |                  |
   |                   |-- generateMenu() -------------------->|                  |
   |                   |<-- menu Instance ---------------------|                  |
   |<-- renderMenu ----|                                                          |
   |                                                                              |
   |-- leftClick() --->|                                                          |
   |                   |-- destroyMenu() --------------------->|                  |
```

## 77.3. Plugin Panel Crash Recovery

This sequence details detecting and recovering a crashed plugin iframe:

```
UIFramework       PluginMonitor       PluginSandbox      SystemLogger       UIOverlay
    |                   |                   |                 |                 |
    |-- pingFrame() --->|                   |                 |                 |
    |                   |-- checkStatus() ->|                 |                 |
    |                   |<-- timeout -------|                 |                 |
    |                   |                                     |                 |
    |                   |-- logCrash() ---------------------->|                 |
    |                   |-- displayError() ------------------------------------>|
```

---

# 78. Complete UI State Diagrams

The docking panel transition state machine:

```
                             [ Floating ]
                                  |
                                  | Mouse down split pane
                                  v
                           [ Resizing Pane ]
                                  |
                +-----------------+-----------------+
                |                                   |
          Release split                       Exceed limits
                |                                   |
                v                                   v
            [ Docked ]                       [ Clamped Size ]
                |                                   |
                | Drag split                        | Release split
                v                                   v
        [ Resizing Pane ]                       [ Docked ]
```

---

# 79. Detailed Examples for Every Major UI Lifecycle

Below are concrete JSON payload examples representing serialization formats for the core UI categories:

## 79.1. Workspace Panel Layout State (`core:workspace-layout`)

Represents a docking layout tree containing sidebars and center viewports:

```json
{
  "layoutVersion": "1.0.0",
  "root": {
    "type": "split",
    "orientation": "horizontal",
    "splitRatio": 0.2000,
    "children": [
      {
        "type": "panel",
        "panelId": "file-navigator",
        "visible": true,
        "activeTab": 0
      },
      {
        "type": "split",
        "orientation": "vertical",
        "splitRatio": 0.7500,
        "children": [
          {
            "type": "panel",
            "panelId": "canvas-viewport",
            "visible": true
          },
          {
            "type": "panel",
            "panelId": "property-inspector",
            "visible": true
          }
        ]
      }
    ]
  }
}
```

## 79.2. Keyboard Shortcut Registry Item (`core:shortcut-register`)

Represents customized keyboard shortcuts:

```json
{
  "shortcutId": "cmd:undo",
  "keyCombination": "Ctrl+Z",
  "scope": "global",
  "pluginNamespace": "core"
}
```

## 79.3. Context Menu Generation Spec (`core:context-menu`)

Represents menu options built on component right-clicks:

```json
{
  "menuId": "menu-48",
  "targetObjectId": "opamp-1",
  "items": [
    { "id": "edit-properties", "label": "Edit Properties", "enabled": true },
    { "id": "align-left", "label": "Align Left", "enabled": true },
    { "id": "delete-component", "label": "Delete Component", "enabled": true }
  ]
}
```
