#!/usr/bin/env bash
set -e

echo "== TINC Workbench Bootstrap v0.1 =="

mkdir -p \
project \
docs/product \
docs/technical \
architecture \
specifications \
adr \
templates \
scripts

cat > README.md <<'EOF'
# TINC Workbench

Engineering without boundaries.

An open-source, plugin-first engineering workspace built around an infinite canvas.
EOF

cat > ROADMAP.md <<'EOF'
# Roadmap

- Phase 0 - Foundation
- Phase 1 - Product Definition
- Phase 2 - Architecture
- Phase 3 - Specifications
- Phase 4 - Development
EOF

cat > CHANGELOG.md <<'EOF'
# Changelog

## 0.1.0
- Repository initialized.
EOF

cat > CONTRIBUTING.md <<'EOF'
# Contributing

Contribution guidelines will be documented before public development begins.
EOF

cat > SECURITY.md <<'EOF'
# Security Policy

Security reporting process will be documented before the first public release.
EOF

cat > CODE_OF_CONDUCT.md <<'EOF'
# Code of Conduct

Be respectful, constructive and professional.
EOF

cat > LICENSE <<'EOF'
MIT License

Copyright (c) 2026 Muhammed Cevad Turan

Permission is hereby granted, free of charge, to any person obtaining a copy...
EOF

cat > docs/product/product-definition.md <<'EOF'
# Product Definition

## Vision
TINC Workbench is a plugin-first, offline-first engineering workspace.

## Mission
Build a unified engineering platform for technical projects.

## Core Principles
- Plugin First
- Offline First
- Local First
- Open Format
- Extensible
- Cross Platform
- Engineering Focused
- Performance First
- AI Assisted
- Open Source
- Semantic First
- Documented by Design
EOF

cat > project/vision.md <<'EOF'
# Vision

Become the universal engineering workspace.
EOF

cat > project/scope.md <<'EOF'
# Scope

Defines what belongs in the product and what does not.
EOF

cat > project/features.md <<'EOF'
# Features

Feature catalog (draft).
EOF

cat > project/milestones.md <<'EOF'
# Milestones

Planning document.
EOF

cat > project/release-plan.md <<'EOF'
# Release Plan

Draft.
EOF

cat > project/terminology.md <<'EOF'
# Terminology

Project glossary.
EOF

cat > adr/0001-project-foundation.md <<'EOF'
# ADR-0001

Project Name: TINC Workbench
EOF

cat > adr/0002-plugin-first.md <<'EOF'
# ADR-0002

The platform follows a plugin-first architecture.
EOF

echo "Bootstrap v0.1 completed."
