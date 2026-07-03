# Cache Module

The cache module provides a namespace-aware cache abstraction used by repositories and auth
security helpers.

## Structure

- `services/` contains the `CacheService` facade used by other modules.
- `adapters/` contains memory and Redis implementations.
- `cache-adapter-factory.ts`, `cache.tokens.ts`, and `cache.module.ts` expose module wiring.

## Development Notes

Consumers should depend on `CacheService`, not concrete adapters. Keep adapter-specific concerns
inside `adapters/` and invalidate by namespace when repository writes change shared records.
