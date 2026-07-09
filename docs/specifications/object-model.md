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
- properties
- behaviors
- datasheet
- category

---

# 10. Connection

Properties:

- id
- source
- target
- connectionType

Types:

- Visual
- Electrical
- Logical
- Mechanical

---

# 11. Asset

Supported assets:

- Images
- SVG
- PDF
- Datasheets
- Icons
- Fonts

---

# 12. Metadata

Metadata is extensible and must never break compatibility.

---

# 13. Versioning

Every serialized entity includes a schema version to support future migrations.
