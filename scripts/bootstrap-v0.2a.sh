#!/usr/bin/env bash
set -e

echo "Bootstrap v0.2a - Product"

mkdir -p project

cat > project/philosophy.md <<'EOF'
# Philosophy

TINC Workbench is designed around openness, extensibility, semantic engineering objects, and user ownership of data.

The platform favors long-term maintainability over short-term convenience.
EOF

cat > project/glossary.md <<'EOF'
# Glossary

- Workspace
- Project
- Page
- Layer
- Object
- Connection
- Plugin
- Asset
EOF

cat > project/personas.md <<'EOF'
# Personas

- Electronics Engineer
- RF Engineer
- Embedded Developer
- Maker
- Student
- Educator
EOF

cat > project/use-cases.md <<'EOF'
# Primary Use Cases

- Brainstorming
- Block diagrams
- Electronics
- Wiring
- RF planning
- Embedded projects
- Documentation
EOF

cat > project/feature-list.md <<'EOF'
# Feature List

## Core
- Infinite canvas
- Pages
- Layers
- Undo/Redo
- Selection
- Assets

## Future
- Simulation
- Collaboration
- AI Assistant
EOF

cat > project/non-goals.md <<'EOF'
# Non Goals

- Replace professional PCB CAD.
- Replace full MCAD software.
- Replace IDEs.
EOF

cat > project/product-lifecycle.md <<'EOF'
# Product Lifecycle

Idea → Sketch → Design → Documentation → Implementation → Maintenance
EOF

cat > project/release-strategy.md <<'EOF'
# Release Strategy

Alpha
Beta
Stable
LTS
EOF

cat > project/success-metrics.md <<'EOF'
# Success Metrics

- Startup time
- Canvas performance
- Plugin ecosystem
- Documentation quality
EOF

echo "Bootstrap v0.2a completed."
