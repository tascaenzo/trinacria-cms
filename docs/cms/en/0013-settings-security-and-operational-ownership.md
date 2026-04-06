# 0013 - Settings security and operational ownership

## Goal

Lock the operational policy for the `settings` domain before introducing any write UX or administrative opening that would weaken plugin ownership boundaries.

The `M2` direction is:

- setting definitions remain readable to authenticated backoffice operators and to integrations already allowed to inspect configuration metadata;
- resolved non-secret values remain readable in the backoffice for operational debugging;
- secrets are never revealed in clear text to a generic admin JWT session;
- write, export, and reveal stay plugin-aware operations, allowed only to the owner plugin authenticated with request signing;
- the backoffice may assist or broker write flows, but it must not impersonate the plugin owner.

## Problem

The `settings` domain already has:

- key-derived ownership (`ownerPluginId`);
- a `SettingsPluginAuth` protocol for sensitive operations;
- a read-oriented backoffice page.

What was missing was an explicit architectural decision on the most sensitive question: what a human admin can do without turning the backoffice into a universal bypass over plugin-owned settings.

Without that decision, any write UX risks creating an implicit super-client over third-party namespaces.

## Actors

### 1. Human backoffice operator

A user authenticated with an admin JWT and normal CMS grants. This actor does not automatically represent a plugin owner.

### 2. Owner plugin authenticated through `SettingsPluginAuth`

A server-to-server integration that owns the key namespace and signs requests with `x-cms-plugin-*` headers.

### 3. Non-owner machine integration

A service or plugin that is authenticated but does not own the targeted key namespace.

### 4. CMS system

`core-pack` backend, official SDK, and backoffice. All channels must enforce the same rules without hidden exceptions.

## Decision

### 1. Ownership remains the primary constraint

Setting ownership continues to derive from the key namespace.

Examples:

- `core-pack:site:name` belongs to `core-pack`;
- `seo-pack:analytics:measurement_id` belongs to `seo-pack`.

No human admin and no non-owner plugin may write, export, or reveal outside their namespace only because they hold generic administrative privileges.

### 2. Operational reads are allowed

The following are accepted operational reads:

- definition list;
- definition detail;
- resolved non-secret value, including default fallback;
- masked secret metadata without plaintext.

These reads exist to:

- understand configuration shape;
- diagnose drift between defaults and explicit values;
- verify whether a secret exists, when it changed, and who changed it;
- keep the CMS settings area operationally useful without exposing sensitive data.

### 3. Secret reveal is forbidden to a generic admin backoffice session

Plaintext secret reveal is reserved to the owner plugin authenticated through request signing.

Reasons:

- a CMS admin is not necessarily the maintainer of the external integration;
- reveal breaks the separation between platform governance and plugin responsibility;
- the operational risk is high: copy/paste, screenshots, accidental logs, session hijacking, support access.

Consequence: the backoffice may show only masked state and metadata for secrets, never clear text through a generic admin JWT.

### 4. Admin writes are allowed only as a plugin-aware broker flow

If the backoffice needs to support settings writes, the allowed direction is not "admin writes directly", but:

- the backoffice collects the intent and typed payload;
- execution happens only against endpoints that require a consistent owner identity;
- the system must make explicit which owner plugin is authorizing the write;
- if no valid plugin caller exists, the write does not happen.

This means the backoffice may become a broker or orchestrator of plugin-aware requests, not a replacement for plugin ownership.

### 5. Export stays owner-scoped

Plugin settings export remains limited to the owner plugin exporting its own namespace.

A human admin may consult aggregated operational views in the backoffice, but may not request arbitrary raw exports across namespaces with a bearer session.

## Actor -> operation matrix

| Operation | Human backoffice admin | Signed owner plugin | Non-owner integration | Notes |
| --- | --- | --- | --- | --- |
| Read definition list | yes | yes | yes | Documentation and operational metadata |
| Read definition detail | yes | yes | yes | No secret plaintext |
| Read resolved non-secret value | yes | yes | yes | Needed for operational debugging |
| Read masked secret metadata | yes, but no plaintext | yes | no | Non-owners must not enumerate sensitive metadata of third parties |
| Reveal secret | no | yes | no | Owner-signed only |
| Write definition | not directly | yes | no | Any admin UX must be brokered |
| Write non-secret value | not directly | yes | no | Any admin UX must be brokered |
| Write secret | not directly | yes | no | Always owner-signed |
| Export plugin snapshot | not directly | yes, only for its own plugin | no | No cross-plugin export |

## Architectural implications

### Backend

- controllers must clearly separate operational reads from owner-only operations;
- ownership failures must remain explicit and stable;
- OpenAPI must document which routes are readable by operators and which are signed-only.

### SDK

- the SDK must reflect the real contract and must not imply that an admin bearer token is enough for writes or reveal;
- sensitive APIs remain typed as plugin-signed workflows.

### Backoffice

- the UI may read definitions, resolved values, and masked metadata;
- the UI must not add direct "reveal" or "save" actions that call owner-only endpoints with only an admin context;
- any future write flow must make the owner plugin explicit and remain brokered.

Current `M2` operating state:

- the backoffice prepares non-secret write handoffs;
- the payload is assembled in the UI but never executed from the admin browser session;
- the owner plugin remains the subject that must sign and execute the real request.

### Documentation and governance

- the settings policy becomes part of the CMS security model;
- every future administrative opening in the `settings` domain must explain how plugin ownership is preserved.

## Rejected alternatives

### 1. Omnipotent admin over settings

Rejected because it turns the backoffice into a global bypass over plugin ownership.

Side effects:

- mismatch between backend rules and the plugin-based mental model;
- high risk around secrets;
- weak auditability of responsibility.

### 2. No backoffice reads at all

Rejected because the domain would remain correct but operationally unusable.

Operators still need to:

- inspect the settings catalog;
- diagnose current values;
- understand whether an integration is configured.

### 3. Admin reveal without admin writes

Rejected because reveal is already the most sensitive operation in the domain. Allowing it to a generic admin would still create the bypass this milestone is explicitly avoiding.

## M2 operating rules

The following tasks in the milestone must follow these constraints:

1. backend, OpenAPI, and SDK must converge on this matrix;
2. the backoffice may introduce a write flow only if it stays plugin-aware and avoids impersonation;
3. the end-to-end documentation must clearly distinguish operational reads, owner-scoped writes, owner-scoped export, and owner-only reveal.

## Status

Accepted for `M2`.
