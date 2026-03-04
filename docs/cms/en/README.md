# Trinacria CMS - Didactic Manual (English)

This section is organized as a technical learning path focused on low-level framework and CMS design.

Goal: understand how to build a plugin-based framework from contracts to runtime, then domain modules (`core-pack`).

Unified terminology glossary: [GLOSSARY.md](../GLOSSARY.md)

## Recommended study path

1. [0000 - Learning path and mental model](./0000-learning-path.md)
2. [0001 - Kernel: fundamentals, boundaries, public API](./0001-kernel-models-structures.md)
3. [0002 - Kernel file-by-file + examples from real code](./0002-kernel-file-by-file.md)
4. [0003 - Runtime deep dive: state machine, dependency graph, rollback](./0003-runtime-orchestration-deep-dive.md)
5. [0004 - Persistence: EntityRegistry, DbAdapter, Mongo adapter](./0004-persistence-mongo-and-entity.md)
6. [0005 - Core-pack file-by-file: users, roles, permissions, embedded model](./0005-core-pack-file-by-file.md)
7. [0006 - Identity end-to-end: users, roles, permissions, policy rules (embedded)](./0006-users-end-to-end.md)
8. [0007 - Build a new plugin professionally](./0007-build-a-plugin.md)
9. [0008 - Testing, operations, and technical governance](./0008-testing-operations-study.md)
10. [0009 - Theoretical models, data structures, formal logic](./0009-theoretical-models-data-structures.md)
11. [0010 - Code atlas: file -> responsibility -> flow maps](./0010-code-atlas-and-flows.md)

## What this manual includes

- Full project structure map (`packages/kernel`, `packages/core-pack`, `apps/playground`).
- Detailed explanation of key files and responsibilities.
- Practical examples extracted from implemented code.
- Theoretical models behind architectural choices.
- Guidelines for tradeoffs, anti-patterns, testing, and operations.
