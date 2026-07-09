#!/usr/bin/env bash
set -e

echo "Bootstrap v0.2d - ADR + AI + Templates"

mkdir -p adr templates ai/rules ai/prompts ai/chatgpt ai/gemini ai/agents

cat > adr/0001-project-name.md <<'EOF'
# ADR-0001

Decision: Project name is **TINC Workbench**.

Status: Accepted
EOF

cat > adr/0002-plugin-first.md <<'EOF'
# ADR-0002

Decision: Core functionality remains minimal.
Engineering domains are implemented as plugins.

Status: Accepted
EOF

cat > adr/0003-local-first.md <<'EOF'
# ADR-0003

Decision: User data is stored locally by default.

Status: Accepted
EOF

cat > adr/0004-open-format.md <<'EOF'
# ADR-0004

Decision: Project files use an open, documented specification.

Status: Accepted
EOF

cat > adr/0005-semantic-first.md <<'EOF'
# ADR-0005

Decision: Freeform drawing and semantic engineering objects coexist.

Status: Accepted
EOF

cat > ai/rules/core-rules.md <<'EOF'
# AI Core Rules

- AI never changes projects without confirmation.
- AI follows project specifications.
- AI does not invent architecture.
- AI implements documented decisions.
EOF

cat > ai/prompts/gemini-cli.md <<'EOF'
# Gemini CLI Prompt

Implement only what is defined in the project specifications.
Do not redesign architecture.
Request clarification when specifications conflict.
EOF

cat > ai/chatgpt/role.md <<'EOF'
# ChatGPT Role

System architect.
Produces specifications, ADRs and technical documentation.
EOF

cat > ai/gemini/role.md <<'EOF'
# Gemini Role

Implementation engineer.
Transforms specifications into production code.
EOF

cat > ai/agents/README.md <<'EOF'
# AI Agents

Future multi-agent workflow documentation.
EOF

cat > templates/adr-template.md <<'EOF'
# ADR-XXXX

## Status

## Context

## Decision

## Consequences
EOF

cat > templates/specification-template.md <<'EOF'
# Specification

## Purpose

## Requirements

## Constraints

## Acceptance Criteria
EOF

echo "Bootstrap v0.2d completed."
