# Users Module

The users module owns the core user records and the public user lifecycle events emitted by
`core-pack`.

## Structure

- `services/` contains business logic. `UsersService` validates user changes and
  `UserLifecycleEventPublisher` is the single helper used to emit user lifecycle events.
- `repositories/` contains persistence adapters for user records.
- `events/` contains the user event catalog exported into the plugin manifest.
- `dto/`, `users.schemas.ts`, `users.controller.ts`, and `users.module.ts` expose the HTTP and
  module wiring surface.

## Event Model

User events are non-sensitive by default. They contain identifiers and state transitions, not
secrets, reset codes, invite links, or raw email content. Sensitive data must move through the
kernel secure payload APIs and be claimed only by authorized plugins.

When adding a new user event:

1. Add its name, payload type, and manifest definition in `events/user-events.catalog.ts`.
2. Add a typed method in `services/user-lifecycle-event-publisher.ts`.
3. Emit it from the service that owns the business transition.
4. Keep the payload minimal and safe for third-party subscribers.

New imports should point directly to `services/`, `repositories/`, or `events/`. The module barrel
in `index.ts` re-exports the public surface from those directories.
