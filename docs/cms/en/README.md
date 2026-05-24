# Trinacria CMS - Didactic Manual (English)

This section is organized as a technical learning path focused on low-level framework and CMS design.

Goal: understand how Trinacria CMS is built on top of the Trinacria framework
libraries, then how the CMS kernel, `core-pack`, and future domain plugins fit
together.

Architecture direction: [plugin-first CMS direction](../architecture/plugin-first-cms-direction.md)

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
12. [0011 - Official SDK, runtime discovery, and API keys](./0011-sdk-api-keys-discovery.md)
13. [0012 - Operational Mongo schema](./0012-operational-mongo-schema.md)
14. [0013 - Settings security and operational ownership](./0013-settings-security-and-operational-ownership.md)
15. [0014 - Settings end-to-end](./0014-settings-end-to-end.md)
16. [0015 - Plugin operations and troubleshooting](./0015-plugin-operations-and-troubleshooting.md)
17. [0016 - M5 Plugin runtime foundation](./0016-m5-plugin-runtime-foundation.md)
18. [0017 - Cache system and authentication hardening](./0017-cache-and-auth-hardening.md)

## What this manual includes

- Full project structure map (`packages/kernel`, `packages/core-pack`, `packages/sdk`, `apps/playground`, `apps/backoffice`).
- Detailed explanation of key files and responsibilities.
- Module-by-module explanation of exported services, controllers, and exposed HTTP endpoints.
- A precise description of the standard response format (`data`, `error`, `meta`) and how the kernel generates it.
- Documentation of the published official SDK model, the generated monorepo overlay, and runtime discovery (`/v1/system/*`).
- Documentation of the API-key model as a first-class machine identity integrated with roles, permissions, and policy rules.
- Practical examples extracted from implemented code.
- Theoretical models behind architectural choices.
- Guidelines for tradeoffs, anti-patterns, testing, and operations.
