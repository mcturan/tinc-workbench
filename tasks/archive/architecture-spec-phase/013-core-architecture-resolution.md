# Task 013 — Core Architecture Resolution

Read:

- prompts/architect.md
- every document under docs/
- docs/audits/core-architecture-audit.md

Review every audit finding AUD-001 through AUD-028 adversarially.

Generate ONLY:

docs/audits/core-architecture-resolution.md

Do not modify any existing specification.

For every audit finding provide:

- Finding ID
- Audit severity
- Decision: ACCEPTED / PARTIALLY ACCEPTED / REJECTED
- Technical reasoning
- Canonical architectural decision
- Canonical owner
- Affected specifications
- Exact required specification changes
- Implementation impact
- Blocking status

Do not automatically accept audit recommendations.

Specifically reconsider:

- AUD-001: persistent viewport state does not automatically imply Object Engine ownership.
- AUD-008: avoid recursive history semantics caused by recording UndoCommand or RedoCommand as normal history entries. Evaluate execute, replay, and reverse mutation paths.
- AUD-013: do not place geometry or matrix caches in Object Engine without proving that ownership is architecturally correct.
- AUD-017: evaluate a separate .twh recoverable history journal instead of embedding history DAG data in .twb.
- AUD-022: do not invent a global memory ceiling merely by summing subsystem budgets.

Prefer clear subsystem ownership and one-way dependency direction.

At the end provide:

1. Accepted findings
2. Partially accepted findings
3. Rejected findings
4. Blocking resolutions
5. Exact specification patch order
6. Canonical dependency graph
7. Canonical mutation flow
8. Canonical undo/redo flow
9. Canonical persistence flow
10. Architecture status after proposed resolutions

Do not patch specifications yet.
Do not hide disagreements with the audit.
