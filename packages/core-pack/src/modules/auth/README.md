# Auth Module

The auth module owns login, token blacklist, password and invitation flows, and the secure email
requests produced by those flows.

## Structure

- `services/` contains login/session logic and account-flow orchestration.
- `repositories/` contains auth-specific persistence for credentials, token blacklist, login
  attempts, users projection, and flow tokens.
- `dto/`, schemas, controller, tokens, and module files expose the API and dependency wiring.

## Email And Events

Auth does not send email directly. It creates secure email payloads through the kernel secure
payload store and emits `secure-event-payload-ready`. The email plugin can claim those payloads only
when the permission center grants the required access.

Auth also emits user lifecycle events through `UserLifecycleEventPublisher` instead of publishing
raw events inline. This keeps the event contract in the users module and the auth flow focused on
business rules.

Do not place reset codes, invite tokens, or login secrets in normal event payloads.
