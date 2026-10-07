# Secure plugin events

Trinacria CMS uses a two-step model for sensitive plugin communication.

1. The producer stores sensitive data in the kernel secure payload vault.
2. The producer emits a public metadata event such as `core-pack:secure-event-payload-ready`.
3. A consumer plugin receives only the metadata event.
4. The consumer claims through the local manifest policy and the producer-authorized recipient list.

Public event payloads must never contain reset codes, invite tokens, verification links, credentials, or secrets. They should contain only metadata:

```json
{
  "securePayloadId": "secure_event_payloads:123",
  "payloadType": "email-pack:send-email-request",
  "schemaVersion": 1
}
```

## Installed-plugin policy

Consumers declare their event subscriptions and required permissions in their manifests.
The host checks active producer/consumer, declared event, permission owned by producer
or consumer, and subscription. The payload's recipient list remains binding, including
when the consumer uses a wildcard subscription. There are no database grant approvals.

## Consumer plugins

A consumer should subscribe to the metadata event and then claim only the payload type it understands.

```ts
await context.services.securePayloads.claim({
  payloadId: event.securePayloadId,
  eventName: context.eventName,
  payloadType: "email-pack:send-email-request",
  schemaVersion: 1,
  requiredPermission: "email-pack:email:send"
});
```

The vault enforces consumer id, event name, payload type, schema version, permission, TTL, claim count, and the local policy.

## Email-pack as a consumer

`email-pack` is the official transactional email consumer. It subscribes to:

```text
*:secure-event-payload-ready
```

but it only claims payloads with:

```text
payloadType = email-pack:send-email-request
requiredPermission = email-pack:email:send
```

The claimed payload contains the email request, not the public event. This keeps reset links, invite
links, and verification links out of the event bus while still allowing email delivery to stay
decoupled from `core-pack`.

## SDK and API

The email template API is exposed through the generated SDK under `cms.email`:

- `cms.email.listEmailTemplates()`
- `cms.email.upsertEmailTemplate(...)`
- `cms.email.previewEmailTemplate(...)`

These APIs are guarded by the kernel admin route guard and are used by the backoffice email template
settings section.

## Security defaults

- Secure payloads get a default TTL when the producer does not provide one.
- `maxClaims` must be an integer from 1 to 10; default 1.
- Email template rendering rejects missing required variables.
- Password reset, email verification, and invite links are generated as opaque one-time tokens and only token hashes are stored.

## Runtime subscription checks (A1 implemented)

Protected/audit subscriptions require a permission declared by the producer and an
explicit positive authorizer decision, even when producer and consumer are the same
plugin. A missing provider fails load with `event_subscription_authorizer_missing`;
policy failures and invalid responses deny access. Public notifications remain public:
receiving a secure payload ID does not grant permission to claim its contents.

The runtime checks the policy before each delivery, without a positive-decision cache.
Disabling a consumer stops new work; a handler already running may finish.
Correcting a failed manifest requires a new explicit load. A denied consumer does not
interrupt another authorized consumer. Diagnostic callbacks contain event metadata and
stable reasons only, never payloads, policy exception text or the complete envelope.

Partial binding failures roll back handlers and lifecycle resources, including recursive
loads. Unload/reload generation checks also reject stale bus snapshots after an awaited
policy. In-process plugins remain trusted; direct process or bus access is not isolated.
Atomic claims and keyring are implemented. Signed external HTTP settings clients use
a separate persisted policy; it does not govern subscriptions or payload claims.

## Scoped plugin services (A0 implemented)

Hook/handler code uses `context.services.events` and named private operations; it does
not receive `app` or a raw DI resolver. Email invokes its host-composed private `deliver`
operation, which fixes the consumer identity to email-pack and never returns plaintext
to the hook. A2 adds the scoped `services.securePayloads` client, atomic claims and keyring.
See [plugin services](./cms/en/0007-build-a-plugin.md#plugin-host-services-a0-implemented).


## Atomic vault and keyring (A2 implemented)

Structural denies (expiry, status/count, recipient, event/type/schema/permission) cannot
be overridden by a custom authorizer. Every eligible claim requires `allowed === true`;
missing policy, exceptions and malformed decisions deny even without a recipient list.
Allowlist absent requires policy; an empty allowlist denies all. The vault decrypts and
parses JSON before CAS, delivers only to a successful CAS caller and retries at most
three times with fresh policy. Corruption and missing key IDs do not consume claims.

The client derives producer/consumer from the host binding and rejects identity fields
in request bodies. Claim schemaVersion is mandatory; returned metadata excludes ciphertext,
storage revision and purgeAt. Producer-only revoke never revives terminal records.

Configure `CMS_SECURE_PAYLOAD_ACTIVE_KEY_ID` and `CMS_SECURE_PAYLOAD_KEYS_JSON` (ID →
canonical base64 of 32 random bytes), or the host starter's explicit keyring option.
All environments require configuration; no settings/master/development fallback exists.
Reads select the record keyVersion, writes the active ID. Retention defaults to 24 hours
with BSON Date TTL; expiry authorization remains independent of asynchronous deletion.

Payload revocation is linearized by CAS; configuration changes do not cancel an already
accepted claim. CAS uses the host clock just before dispatch, so a command
sent before expiry can complete after the deadline. Synchronize host clocks.
See the [rotation/recovery runbook](./cms/architecture/plugin-platform/secure-payload-keyring-runbook.md)
for the read-only inventory, explicit CAS rotation command and backup/key retirement rules.
