# Project File Format Specification

**Project:** TINC Workbench
**Version:** 0.1.0-draft

---

# 1. Overview

TINC Workbench projects are stored using the `.twb` extension.

Goals:

- Human-readable
- Versioned
- Deterministic
- Git-friendly
- Forward compatible
- Open specification

---

# 2. Container

Version 1 uses a single UTF-8 JSON document.

Embedded Base64 assets are permitted in Version 1.

Future versions may optionally support compressed archives while preserving the logical schema.

---

# 3. Top-Level Structure

```json
{
  "schemaVersion": "1.0",
  "project": {},
  "pages": [],
  "assets": [],
  "plugins": [],
  "settings": {},
  "metadata": {}
}
```

The `.twb` document stores canonical active project state only. Recoverable History Engine DAG and history snapshot data is stored in the `.twh` sidecar file defined in Section 15.

---

# 4. Schema Version

Every project MUST contain a schemaVersion.

Older files are migrated through migration handlers.

---

# 5. Project Section

Contains:

- id
- name
- description
- author
- createdAt
- updatedAt

---

# 6. Pages

Each page stores:

- id
- name
- viewport
- layers
- logicalConnections
- wires

---

# 7. Layers

Each layer stores:

- id
- name
- visible
- locked
- objects

---

# 8. Objects

Every object contains:

- id
- type
- geometry
- style
- metadata

Semantic objects may include:

- ports
- pins
- properties
- behaviors

Ports and Pins are stored structurally inside their parent Semantic Object.

Each Port contains:

- id
- name
- kind
- localPosition
- signalType
- metadata

Each Pin contains:

- id
- name
- number
- localPosition
- signalName
- metadata

---

# 9. Logical Connections and Wires

Pages may store:

- logicalConnections
- wires

LogicalConnection objects contain:

- id
- source
- target
- connectionType
- metadata

Wire objects contain:

- id
- logicalConnectionId
- segments
- style
- metadata

Each segment contains:

- start
- end

Endpoint is a discriminated union.

Common endpoint fields:

- id
- endpointType

Endpoint rules:

- `endpointType: "PORT"` requires `targetId`, references a valid Port ID, and forbids `coordinate`.
- `endpointType: "PIN"` requires `targetId`, references a valid Pin ID, and forbids `coordinate`.
- `endpointType: "FLOATING"` requires `coordinate`, represents a dangling endpoint, and forbids `targetId`.
- Floating endpoints must not be represented with `null`.
- LogicalConnection is the single persisted owner of Endpoint objects.
- Wire objects must not persist Endpoint objects.

Example:

```json
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
          "id": "resistor-102",
          "type": "resistor",
          "geometry": { "x": 80.0000, "y": 80.0000, "width": 30.0000, "height": 10.0000 },
          "style": { "stroke": "#000000" },
          "metadata": {},
          "ports": [
            {
              "id": "resistor-102:p1",
              "name": "P1",
              "kind": "electrical",
              "localPosition": { "x": 0.0000, "y": 5.0000 },
              "signalType": "passive",
              "metadata": {}
            }
          ]
        }
      ]
    }
  ],
  "logicalConnections": [
    {
      "id": "lc-001",
      "source": { "id": "ep-1", "endpointType": "PORT", "targetId": "resistor-102:p1" },
      "target": { "id": "ep-2", "endpointType": "FLOATING", "coordinate": { "x": 210.0000, "y": 340.0000 } },
      "connectionType": "Electrical",
      "metadata": {}
    }
  ],
  "wires": [
    {
      "id": "wire-001",
      "logicalConnectionId": "lc-001",
      "segments": [
        { "start": { "x": 80.0000, "y": 85.0000 }, "end": { "x": 120.0000, "y": 85.0000 } },
        { "start": { "x": 120.0000, "y": 85.0000 }, "end": { "x": 210.0000, "y": 340.0000 } }
      ],
      "style": { "stroke": "#00aa00", "strokeWidth": 1.5000 },
      "metadata": {}
    }
  ]
}
```

---

# 10. Assets

Assets may be embedded as Base64 payloads or referenced resources.

Examples:

- PNG
- SVG
- PDF
- Fonts

Asset entries may contain:

- id
- type
- data
- path
- hash
- metadata

Rules:

- `data` stores embedded Base64 asset content.
- `path` stores a relative or remote asset reference.
- TWB Version 1 does not require an external assets directory.

---

# 11. Plugins

Stores plugin identifiers and configuration only.

Plugin code is never embedded inside project files.

---

# 12. Settings

Examples:

- grid
- snap
- units
- theme

---

# 13. Metadata

Free-form information.

Must never affect rendering logic.

---

# 14. Compatibility Rules

- Unknown fields must be ignored.
- Unknown plugins must not prevent loading.
- Unknown object properties must be preserved.
- Unknown plugin-defined object fields must round-trip unchanged.
- Serialized output must remain deterministic.

---

# 15. History Sidecar

The `.twh` sidecar stores recoverable History Engine DAG and history snapshot data.

Rules:

- `.twb` stores canonical active project state.
- `.twh` stores history state for undo, redo, branching, recovery, and history snapshots.
- `.twh` is optional for opening the active project state.
- If `.twh` is missing or invalid, the project opens from `.twb` without recoverable history.
- Storage Engine alone owns TWB/TWH serialization and file-format validation.
- Object Engine and History Engine expose read-only snapshots to the Storage Engine and do not serialize project file formats.

Top-level `.twh` structure:

```json
{
  "schemaVersion": "1.0",
  "projectId": "proj-992",
  "activeNode": "n-4822",
  "branchPointers": {
    "main": "n-4822"
  },
  "nodes": [
    {
      "id": "n-4822",
      "parents": ["n-4821"],
      "timestamp": 1783978505000,
      "author": "turan",
      "correlationId": "corr-883",
      "command": {
        "type": "core:create-object",
        "payload": {}
      }
    }
  ],
  "checkpoints": [
    {
      "id": "chk-100",
      "nodeId": "n-4820",
      "checksum": "sha256-a1b2c3d4e5f6",
      "snapshotRef": "snapshot-100"
    }
  ],
  "metadata": {}
}
```

---

# 16. File Extension

Official extension:

`.twb`

History sidecar extension:

`.twh`

Reserved future extensions:

- .twbz
- .twbp

---

# 17. Design Rules

- Stable
- Open
- Versioned
- Extensible
- Backward-aware
