# Secure plugin events

Trinacria CMS uses a two-step model for sensitive plugin communication.

1. The producer stores sensitive data in the kernel secure payload vault.
2. The producer emits a public metadata event such as `core-pack:secure-event-payload-ready`.
3. A consumer plugin receives only the metadata event.
4. The consumer can claim the encrypted payload only when the plugin permission center has an approved grant.

Public event payloads must never contain reset codes, invite tokens, verification links, credentials, or secrets. They should contain only metadata:

```json
{
  "securePayloadId": "secure_event_payloads:123",
  "payloadType": "email-pack:send-email-request",
  "schemaVersion": 1
}
```

## Permission grants

Admin approvals are stored in `core-pack:security:plugin_access_grants`.

```json
{
  "accessType": "secure-payload-claim",
  "producerPluginId": "core-pack",
  "consumerPluginId": "email-pack",
  "eventName": "core-pack:secure-event-payload-ready",
  "payloadType": "email-pack:send-email-request",
  "requiredPermission": "email-pack:email:send",
  "status": "approved"
}
```

Statuses are:

- `pending`: generated automatically when a plugin asks for access without a grant.
- `approved`: access is allowed.
- `denied`: access is blocked, but the request remains visible.
- `revoked`: previously allowed access is disabled.

## Consumer plugins

A consumer should subscribe to the metadata event and then claim only the payload type it understands.

```ts
await securePayloads.claim({
  payloadId: event.securePayloadId,
  consumerPluginId: "email-pack",
  eventName: context.eventName,
  payloadType: "email-pack:send-email-request",
  schemaVersion: 1,
  requiredPermission: "email-pack:email:send"
});
```

The vault enforces consumer id, event name, payload type, schema version, permission, TTL, claim count, and the admin grant.

## Security defaults

- Secure payloads get a default TTL when the producer does not provide one.
- `maxClaims` is clamped to a small upper bound.
- Email template rendering rejects missing required variables.
- Password reset, email verification, and invite links are generated as opaque one-time tokens and only token hashes are stored.
