#!/usr/bin/env bash
set -e

echo "Bootstrap v0.2b - Architecture"

mkdir -p architecture

cat > architecture/overview.md <<'EOF'
# Architecture Overview

TINC Workbench consists of:
- Core
- Canvas Engine
- Object Engine
- Plugin System
- Storage
- Rendering
- Command System
- UI
EOF

cat > architecture/core.md <<'EOF'
# Core

The Core manages application lifecycle, services, events and dependency injection.
EOF

cat > architecture/canvas.md <<'EOF'
# Canvas Engine

Responsibilities:
- Infinite canvas
- Pan
- Zoom
- Selection
- Grid
- Snap
EOF

cat > architecture/object-model.md <<'EOF'
# Object Model

Base entities:
- Project
- Page
- Layer
- Object
- Connection
- Asset
EOF

cat > architecture/plugin-system.md <<'EOF'
# Plugin System

Plugins extend functionality without modifying the core.
EOF

cat > architecture/storage.md <<'EOF'
# Storage

Local-first.
Primary format: documented JSON project file.
EOF

cat > architecture/rendering.md <<'EOF'
# Rendering

Separate rendering from business logic.
Support multiple render backends in the future.
EOF

cat > architecture/ui.md <<'EOF'
# UI

Dockable panels.
Toolbar.
Inspector.
Status bar.
Command palette.
EOF

cat > architecture/simulation.md <<'EOF'
# Simulation

Simulation is provided through plugins and is not part of the core.
EOF

cat > architecture/ai.md <<'EOF'
# AI

AI assists users.
AI never owns project data or makes irreversible decisions.
EOF

echo "Bootstrap v0.2b completed."
