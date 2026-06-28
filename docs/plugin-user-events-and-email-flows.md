# User events and email flows

`core-pack` owns the baseline user domain. It creates users, changes user status,
handles installation bootstrap, and coordinates user lifecycle flows such as
password reset, email verification, public registration, and invites.

The package emits domain events so other plugins can react without coupling
directly to `core-pack` internals.

## Public user lifecycle events

These events are intentionally non-sensitive. Payloads must not contain email
addresses, names, reset tokens, invite links, OTP codes, credentials, or other
secrets.

| Event                            | When it is emitted                                                                | Payload                                       |
| -------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------- |
| `core-pack:user-created`         | Admin-created user, public registration, or installation bootstrap admin creation | `{ userId, status, source }`                  |
| `core-pack:user-profile-updated` | First name or last name changes                                                   | `{ userId, changedFields }`                   |
| `core-pack:user-status-changed`  | User status changes                                                               | `{ userId, previousStatus, status, reason? }` |
| `core-pack:user-invited`         | Admin sends an invite email                                                       | `{ userId, actorUserId? }`                    |
| `core-pack:user-invite-accepted` | User accepts an invite and sets credentials                                       | `{ userId }`                                  |

Consumers that need more user data must call official APIs with their own
authorization instead of relying on rich event payloads.

## Sensitive email flows

Sensitive user email flows do not publish links or tokens in public events.

Current flows:

- password reset request
- email verification request
- public registration with optional email verification
- user invite
- invite acceptance

When an email must be sent, `core-pack` creates a secure payload and emits:

```text
core-pack:secure-event-payload-ready
```

The event only carries metadata:

```json
{
  "securePayloadId": "secure_event_payloads:123",
  "payloadType": "email-pack:send-email-request",
  "schemaVersion": 1
}
```

`email-pack` can claim the payload only when the permission center contains an
approved grant for both:

- event subscription
- secure payload claim

The claimed payload contains the actual email request, including template key,
recipient, locale, and template variables. That payload is protected by the
kernel secure payload vault.

## Subscribing from a plugin

A third-party plugin declares event subscriptions in its manifest.

Example for public user lifecycle events:

```ts
import { defineEventSubscription, defineEvents } from "@trinacria-cms/kernel/plugin-api";

export const MY_PLUGIN_EVENTS = defineEvents({
  subscribes: [
    defineEventSubscription({
      eventName: "core-pack:user-created",
      handler: "onUserCreated"
    }),
    defineEventSubscription({
      eventName: "core-pack:user-status-changed",
      handler: "onUserStatusChanged"
    })
  ]
});
```

Example handler shape:

```ts
export const myPlugin = {
  manifest,
  eventHandlers: {
    async onUserCreated(payload) {
      // payload.userId is safe to use as a lookup key.
      // Fetch additional data through authorized APIs if needed.
    }
  }
};
```

For sensitive secure payload events, a plugin must declare the subscription and
an admin must approve the request in the plugin permission center. See
[`plugin-secure-events.md`](./plugin-secure-events.md).

## Security rules

- Public events contain identifiers and state transitions only.
- Sensitive links and tokens are stored only in secure payloads.
- Token hashes, not plaintext tokens, are persisted for user flows.
- Plugins should treat events as facts, not commands.
- Commands that require a response should use APIs.
- Automations and workflow plugins should subscribe to events and then call
  authorized APIs for extra data.
