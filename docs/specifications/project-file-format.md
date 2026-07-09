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

---

# 9. Assets

Referenced resources only.

Examples:

- PNG
- SVG
- PDF
- Fonts

---

# 10. Plugins

Stores plugin identifiers and configuration only.

Plugin code is never embedded inside project files.

---

# 11. Settings

Examples:

- grid
- snap
- units
- theme

---

# 12. Metadata

Free-form information.

Must never affect rendering logic.

---

# 13. Compatibility Rules

- Unknown fields must be ignored.
- Unknown plugins must not prevent loading.
- Unknown object properties must be preserved.

---

# 14. File Extension

Official extension:

`.twb`

Reserved future extensions:

- .twbz
- .twbp

---

# 15. Design Rules

- Stable
- Open
- Versioned
- Extensible
- Backward-aware
