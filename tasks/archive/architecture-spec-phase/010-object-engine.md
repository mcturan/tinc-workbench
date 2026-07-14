# Task 010
Output: docs/specifications/object-engine.md

Create the complete Object Engine specification.

Before writing, read prompts/architect.md and every document under docs/.

Requirements: Markdown only; production quality; no implementation code; no TODO; no placeholders.

Cover: purpose, ownership, object registry, lifecycle, identity, type system, semantic metadata, hierarchy, groups, pages, layers, properties, ports, pins, transforms, bounds, indexing, mutation boundaries, validation, cloning, deletion, references, unknown object preservation, plugin-defined objects, command/history/event/geometry/rendering/storage integration, memory, performance, failure recovery, security, APIs, testing, ASCII sequence diagrams, state diagrams, future extensions.

Do not duplicate the Object Model specification. Object Model owns data structure definitions; Object Engine owns runtime lifecycle, orchestration, indexing, validation, and access behavior.

If an architectural conflict is found, stop and report it instead of guessing.
