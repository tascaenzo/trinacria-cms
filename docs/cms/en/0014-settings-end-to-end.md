# 0014 - Settings end-to-end

## Goal

Describe the `settings` domain end-to-end: data model, security policy, HTTP endpoints, official SDK, backoffice flow, and plugin-owner usage.

This page consolidates the operational result of `M2`.

## 1. Domain model

The `settings` domain uses one unified collection with three logical projections:

- `definition`: setting contract with `schema`, `defaultValue`, `status`, and `category`;
- `value`: explicit non-secret value written by the owner plugin;
- `secret`: sensitive value encrypted at rest and exposed outside reveal only as masked metadata.

Every key must follow:

`<pluginId>:<domain>:<name>`

Canonical examples:

- `core-pack:site:name`
- `core-pack:site:url`
- `core-pack:cms:locale`
- `core-pack:cms:timezone`
- `core-pack:branding:logo_url`

Ownership derives from the `pluginId` prefix in the key.

## 2. Read and write surfaces

### Definitions

Definitions are the visible configuration catalog:

- key;
- owner plugin;
- category;
- description;
- JSON-like schema;
- default;
- status.

### Resolved values

Reading a non-secret setting:

- returns the explicit value when present;
- otherwise returns the definition default;
- exposes `source = value | default`.

### Secret metadata

The readable surface available to the backoffice and authorized integrations never contains plaintext.

Only the following are exposed:

- `algorithm`
- `keyVersion`
- `maskedValue`
- timestamps and operational metadata

### Reveal

Plaintext reveal is a separate owner-only operation.

### Export

Plugin snapshot export returns:

- definitions;
- values;
- masked secret metadata.

It never returns plaintext secrets.

## 3. Access policy

Decision reference: `0013 - Settings security and operational ownership`.

Condensed matrix:

| Operation | Admin bearer | Signed owner plugin | Signed non-owner plugin |
| --- | --- | --- | --- |
| List/get definitions | yes | yes | yes |
| Get resolved value | yes | yes | yes |
| Get masked secret metadata | yes | yes | no |
| Write definition/value/secret | not directly | yes | no |
| Reveal secret | no | yes | no |
| Export plugin snapshot | not directly | yes | no |

Operational consequence:

- the backoffice does not write directly;
- the owner plugin remains the signing subject;
- the backoffice may only inspect and prepare coherent handoffs.

## 4. HTTP endpoints

| Method | Endpoint | Auth | Notes |
| --- | --- | --- | --- |
| `GET` | `/v1/settings/definitions` | admin bearer or signed plugin | definition catalog |
| `GET` | `/v1/settings/definitions/:key` | admin bearer or signed plugin | definition detail |
| `POST` | `/v1/settings/definitions` | signed owner plugin | definition upsert |
| `GET` | `/v1/settings/values/:key` | admin bearer or signed plugin | resolved value |
| `PUT` | `/v1/settings/values/:key` | signed owner plugin | non-secret value upsert |
| `GET` | `/v1/settings/secrets/:key` | admin bearer or signed owner plugin | masked metadata |
| `PUT` | `/v1/settings/secrets/:key` | signed owner plugin | encrypted secret upsert |
| `POST` | `/v1/settings/secrets/:key/reveal` | signed owner plugin | owner-only plaintext |
| `GET` | `/v1/settings/export/:pluginId` | signed owner plugin | namespace snapshot with masked secrets |

Expected errors:

- `401` when bearer/plugin-signed authentication is missing or invalid;
- `403` when the authenticated caller does not own the requested namespace;
- `404` when the requested settings resource does not exist.

## 5. Signed plugin-caller protocol

Owner-scoped routes require:

- `x-cms-plugin-id`
- `x-cms-plugin-ts`
- `x-cms-plugin-nonce`
- `x-cms-plugin-signature`

The signature is computed by the owner plugin over the method, path, timestamp, nonce, and canonical body.

The backend enforces:

- caller secret lookup;
- timestamp skew validation;
- nonce anti-replay;
- target-key ownership validation.

## 6. HTTP example: non-secret value write

Request:

```http
PUT /v1/settings/values/core-pack:site:name
x-cms-plugin-id: core-pack
x-cms-plugin-ts: 1775460000
x-cms-plugin-nonce: 7dd0a1c4
x-cms-plugin-signature: <signature-computed-by-owner-plugin>
content-type: application/json

{
  "value": "Trinacria Editorial",
  "updatedBy": "core-pack:init"
}
```

Response:

```json
{
  "data": {
    "id": "plugin_core_pack__settings:42",
    "key": "core-pack:site:name",
    "ownerPluginId": "core-pack",
    "value": "Trinacria Editorial",
    "version": 1,
    "updatedBy": "core-pack:init",
    "createdAt": "2026-04-06T10:00:00.000Z",
    "updatedAt": "2026-04-06T10:00:00.000Z"
  },
  "meta": {
    "pluginId": "core-pack"
  }
}
```

## 7. HTTP example: secret reveal

Request:

```http
POST /v1/settings/secrets/core-pack:integrations:stripe_api_key/reveal
x-cms-plugin-id: core-pack
x-cms-plugin-ts: 1775460000
x-cms-plugin-nonce: 58af1b0d
x-cms-plugin-signature: <signature-computed-by-owner-plugin>
```

Response:

```json
{
  "data": {
    "key": "core-pack:integrations:stripe_api_key",
    "value": "sk_live_xxx"
  },
  "meta": {
    "pluginId": "core-pack"
  }
}
```

This response must never be surfaced by a generic admin backoffice session.

## 8. Official SDK

Main methods in `cms.settings`:

- `listSettingDefinitions`
- `getSettingDefinitionByKey`
- `getSettingValueByKey`
- `getSettingSecretMetadata`
- `upsertSettingDefinition`
- `upsertSettingValue`
- `upsertSettingSecret`
- `revealSettingSecret`
- `exportPluginSettings`

Read example:

```ts
const response = await cms.settings.getSettingValueByKey({
  path: { key: "core-pack:site:name" },
});

console.log(response.data.value);
```

Owner-signed write example:

```ts
await cms.settings.upsertSettingValue(
  {
    path: { key: "core-pack:site:name" },
    body: {
      value: "Trinacria Editorial",
      updatedBy: "core-pack:init",
    },
  },
  {
    headers: {
      "x-cms-plugin-id": "core-pack",
      "x-cms-plugin-ts": "<unix-ts>",
      "x-cms-plugin-nonce": "<nonce>",
      "x-cms-plugin-signature": "<signature>",
    },
  },
);
```

Note:

- the SDK types sensitive operations too;
- it remains the caller plugin's responsibility to compute and inject signed headers.

## 9. Backoffice

The `settings` page now supports:

- owner-plugin filter;
- definitions explorer;
- CMS overview with site name, public URL, locale, and timezone;
- inspector with definition JSON, resolved value JSON, and masked secret metadata;
- owner-signed handoff for non-secret values.

The handoff flow is:

1. the operator inspects a setting;
2. edits the candidate JSON inside the dialog;
3. the backoffice prepares endpoint, required headers, and body;
4. the owner plugin takes the payload and signs the real request.

The admin browser never sends the write directly.

## 10. Core-pack bootstrap catalog

`core-pack` provisions an idempotent seed catalog in `onInit`:

- `core-pack:site:name`
- `core-pack:site:url`
- `core-pack:cms:locale`
- `core-pack:cms:timezone`
- `core-pack:branding:tagline`
- `core-pack:branding:logo_url`
- `core-pack:features:editorial_workflow`

This exists to:

- make the CMS overview operational;
- validate the domain with real cases;
- provide a stable minimal catalog for the SDK and the backoffice.

## 11. Operational debugging

Quick checklist:

1. `GET /v1/settings/definitions` to verify that the definition exists and is `active`.
2. `GET /v1/settings/values/:key` to determine whether the value comes from `value` or `default`.
3. `GET /v1/settings/secrets/:key` to confirm secret presence, `keyVersion`, and latest update metadata.
4. If a write fails with `403`, compare the key namespace against `x-cms-plugin-id`.
5. If a write fails with `401`, inspect timestamp skew, nonce, plugin secret, and signature generation.

## 12. Key files

- `packages/core-pack/src/modules/settings/settings.controller.ts`
- `packages/core-pack/src/modules/settings/settings.service.ts`
- `packages/core-pack/src/modules/settings/settings.bootstrap.ts`
- `packages/core-pack/src/modules/settings/auth/*`
- `packages/sdk/openapi/trinacria-cms.openapi.json`
- `packages/sdk/src/generated/settings.gen.ts`
- `packages/admin-kernel/src/pages/settings-page.tsx`
