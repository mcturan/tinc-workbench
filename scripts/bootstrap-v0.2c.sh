#!/usr/bin/env bash
set -e

echo "Bootstrap v0.2c - Specifications"

mkdir -p specifications

cat > specifications/project-file.md <<'EOF'
# Project File Format

Extension: .twb

Requirements:
- Human-readable
- Versioned
- Forward compatible
- Open specification
EOF

cat > specifications/object-format.md <<'EOF'
# Object Format

Every object has:
- id
- type
- bounds
- properties
- style
- metadata
EOF

cat > specifications/connection-model.md <<'EOF'
# Connection Model

Connections may be visual or semantic.
Semantic connections can carry engineering meaning.
EOF

cat > specifications/page-model.md <<'EOF'
# Page Model

Projects contain pages.
Pages contain layers.
Layers contain objects.
EOF

cat > specifications/selection.md <<'EOF'
# Selection

Single
Multi
Box
Lasso (future)
EOF

cat > specifications/history.md <<'EOF'
# History

Command-based undo/redo.
Unlimited until resource limits.
EOF

cat > specifications/clipboard.md <<'EOF'
# Clipboard

Copy
Cut
Paste
Duplicate
Cross-project support (future)
EOF

cat > specifications/import-export.md <<'EOF'
# Import / Export

Future support:
- PNG
- SVG
- PDF
- JSON
EOF

cat > specifications/plugin-api.md <<'EOF'
# Plugin API

Plugins register:
- tools
- objects
- panels
- commands
- import/export handlers
EOF

cat > specifications/command-system.md <<'EOF'
# Command System

Every user action should be represented as a command.
EOF

echo "Bootstrap v0.2c completed."
