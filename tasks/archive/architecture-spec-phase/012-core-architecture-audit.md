# Task 012 — Core Architecture Consistency Audit

Review the complete TINC Workbench core architecture.

Read:

- prompts/architect.md
- every document under docs/

Audit all specifications against each other.

Do NOT modify any existing specification.

Generate ONLY:

docs/audits/core-architecture-audit.md

The audit must identify:

1. Contradictory subsystem ownership
2. Duplicate responsibilities
3. Missing responsibilities
4. Circular dependencies
5. Invalid dependency directions
6. Conflicting lifecycle rules
7. Conflicting state models
8. Conflicting mutation boundaries
9. Command Engine bypasses
10. Event ordering conflicts
11. History and undo/redo inconsistencies
12. Object Model versus Object Engine conflicts
13. Geometry ownership conflicts
14. Selection ownership conflicts
15. Rendering ownership conflicts
16. UI versus Tool System conflicts
17. Storage versus Project File Format conflicts
18. Connection and Wire Engine conflicts
19. Plugin SDK integration inconsistencies
20. Serialization inconsistencies
21. Performance target contradictions
22. Memory budget contradictions
23. Security boundary inconsistencies
24. Naming and terminology inconsistencies
25. Invalid or broken specification references
26. Undefined referenced subsystems
27. Architectural gaps
28. Future-extension conflicts

For every finding provide:

- Finding ID
- Severity: CRITICAL / HIGH / MEDIUM / LOW
- Affected specifications
- Exact conflicting concepts
- Architectural impact
- Recommended canonical owner
- Recommended resolution

Then provide:

- Dependency graph
- Ownership matrix
- Core mutation flow
- Core event flow
- Core persistence flow
- List of blocking issues
- List of non-blocking issues
- Architecture readiness verdict

Do not fix findings.
Do not guess.
Do not hide contradictions.

Be adversarial and strict.

If no conflict exists in an area, explicitly state that it was checked and passed.
