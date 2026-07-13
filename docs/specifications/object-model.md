# Object Model Specification

**Project:** TINC Workbench
**Version:** 0.1.0-draft

---

# 1. Purpose

Defines the canonical data model used throughout TINC Workbench.

---

# 2. Design Principles

- Every entity has a globally unique ID.
- Every entity is versionable.
- Every entity supports metadata.
- Semantic objects extend, not replace, the base object.

---

# 3. Project Hierarchy

Workspace
└── Project
    ├── Pages
    │   ├── Layers
    │   │   └── Objects
    │   ├── LogicalConnections
    │   └── Wires
    ├── Assets
    ├── Plugins
    └── Metadata

---

# 4. Base Entity

Required fields:

- id
- type
- version
- createdAt
- updatedAt
- metadata

---

# 5. Project

Properties:

- id
- name
- description
- pages
- assets
- settings
- plugins

---

# 6. Page

Properties:

- id
- name
- layers
- logicalConnections
- wires
- viewport

---

# 7. Layer

Properties:

- id
- name
- visible
- locked
- zIndex

---

# 8. Object

Properties:

- id
- type
- bounds
- rotation
- style
- metadata

---

# 9. Semantic Object

Additional properties:

- ports
- pins
- properties
- behaviors
- datasheet
- category

Ports and Pins are structural sub-components of Semantic Objects.

---

# 10. Port

Properties:

- id
- name
- kind
- localPosition
- signalType
- metadata

Rules:

- A Port belongs to exactly one Semantic Object.
- Port IDs are stable and unique within the project.
- `localPosition` is expressed in the parent Semantic Object's local coordinate space.

---

# 11. Pin

Properties:

- id
- name
- number
- localPosition
- signalName
- metadata

Rules:

- A Pin belongs to exactly one Semantic Object.
- Pin IDs are stable and unique within the project.
- `localPosition` is expressed in the parent Semantic Object's local coordinate space.

---

# 12. Endpoint

Endpoint is a discriminated union.

Common fields:

- id
- endpointType

Endpoint types:

- PORT
- PIN
- FLOATING

PORT endpoint fields:

- targetId

PIN endpoint fields:

- targetId

FLOATING endpoint fields:

- coordinate

Rules:

- A PORT endpoint requires `targetId`, references a valid Port ID, and forbids `coordinate`.
- A PIN endpoint requires `targetId`, references a valid Pin ID, and forbids `coordinate`.
- A FLOATING endpoint requires `coordinate`, represents a dangling endpoint, and forbids `targetId`.
- Floating endpoints must not be represented with `null`.
- Dangling endpoints are valid persisted state.

---

# 13. LogicalConnection

Properties:

- id
- source
- target
- connectionType
- metadata

Types:

- Visual
- Electrical
- Logical
- Mechanical

Rules:

- `source` and `target` are Endpoint objects.
- Endpoints may reference Ports or Pins, or may be Floating endpoints.
- LogicalConnection is the single persisted owner of Endpoint objects.
- LogicalConnection represents a logical or netlist relationship, not a routed visual trace.

---

# 14. Wire

Properties:

- id
- logicalConnectionId
- segments
- style
- metadata

Rules:

- Wire is the persisted segmented routed trace concept.
- Wire references its semantic relationship using `logicalConnectionId`.
- Wire must not persist Endpoint objects.
- Endpoint identity must not be duplicated between LogicalConnection and Wire.
- `segments` stores the routed physical or visual trace geometry.
- Each segment stores `start` and `end` coordinate objects.
- Multiple Wire records may reference the same LogicalConnection.
- Wire geometry is separate from LogicalConnection semantics.

---

# 15. Asset

Supported assets:

- Images
- SVG
- PDF
- Datasheets
- Icons
- Fonts

---

# 16. Metadata

Metadata is extensible and must never break compatibility.

---

# 17. Versioning

Every serialized entity includes a schema version to support future migrations.

---

# 18. Forward Compatibility

- Unknown fields must be preserved during load/save round trips.
- Unknown plugin-defined object properties must not prevent project loading.
- Serialization order must remain deterministic.
