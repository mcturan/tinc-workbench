#!/usr/bin/env bash
set -e

mkdir -p \
docs/product \
docs/technical \
architecture \
specifications \
adr \
templates

cat > docs/product/product-definition.md <<'EOF'
# Product Definition

**Project:** TINC Workbench

**Version:** 0.1.0 (Draft)

---

# 1. Executive Summary

TINC Workbench is an open-source, plugin-first engineering workspace built around an infinite canvas.

Unlike traditional diagramming or CAD applications, TINC Workbench combines freeform sketching, structured engineering objects, technical documentation, project organization, and future simulation capabilities within a single environment.

The project is designed to support the complete engineering workflow—from the earliest idea and rough sketch to system documentation, hardware design, software planning, testing, and maintenance.

The core platform remains domain-independent. Specialized functionality is provided through plugins.

Every project is stored in an open, documented format.

TINC Workbench follows a local-first philosophy while remaining fully functional offline.

Artificial Intelligence acts as an assistant—not the engineer.

The long-term vision is to become a unified engineering platform.

---

# 2. Vision

TINC Workbench aims to become the universal engineering workspace for technical professionals, makers, researchers, educators, and students.

The platform unifies brainstorming, diagramming, documentation, engineering design, simulation, and project management inside one extensible workspace.

Its open plugin architecture allows every engineering discipline to extend the platform without modifying the core.

---

# 3. Mission

Our mission is to eliminate fragmented engineering workflows by providing one extensible engineering workspace.

Users should be able to sketch ideas, organize knowledge, create structured engineering models, document projects, and extend capabilities through plugins.

---

# 4. Core Principles

1. Plugin First
2. Offline First
3. Local First
4. Open Format
5. Extensible
6. Cross Platform
7. Engineering Focused
8. Performance First
9. AI Assisted
10. Open Source
11. Semantic First
12. Documented by Design
EOF

echo "Bootstrap STEP-03 completed."
