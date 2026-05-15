# 0011 - Official SDK, runtime discovery, and API keys

This chapter connects three concepts that work together in production:

- a published SDK reusable outside the monorepo
- runtime discovery to understand which plugins and capabilities are actually active
- API keys as first-class machine identities

## 1. The architectural problem

A plugin-based CMS has two competing needs:

1. provide a stable SDK that is easy to consume and publish on npm;
2. allow each installation to add custom plugins that the public SDK cannot know ahead of time.

If you use only a project-local generated SDK, you lose portability outside the monorepo.

If you use only a static published SDK, you cannot type custom plugins.

The chosen solution is hybrid.

## 2. Two-layer model

### Layer 1: published official SDK

Package:

- `@trinacria-cms/sdk`

It contains:

- zero-dependency client runtime
- official kernel API groups
- official `core-pack` API groups
- runtime discovery helpers

Benefit:

- it can be used immediately even in projects outside the monorepo.

### Layer 2: monorepo-generated overlay

Source:

- the real application OpenAPI snapshot

It contains:

- custom plugins
- custom application modules
- project-specific extensions over official endpoints

Benefit:

- the monorepo gets full typing for local extensions.

## 3. Official SDK catalog

The published package exposes a static catalog:

- file: `packages/sdk/src/official/official-plugin-catalog.ts`

Conceptually it describes:

- which official plugins are covered
- which API groups are always present in the package

Current example:

- `kernel` -> `kernelHealth`, `system`
- `core-pack` -> `auth`, `installation`, `users`, `roles`, `permissions`, `settings`, `security`, `apiKeys`

Important:

- the static catalog tells you what the SDK knows;
- it does not tell you which plugins are actually installed in a given runtime instance.

That is why runtime discovery exists.

## 4. Runtime discovery

Built-in kernel endpoints:

- `GET /v1/system/plugins`
- `GET /v1/system/plugins/:pluginId`
- `GET /v1/system/plugins/:pluginId/events`
- `POST /v1/system/plugins/:pluginId/operations`
- `GET /v1/system/capabilities`

Purpose:

- allow SDKs, admin panels, and CLIs to inspect the real profile of the running CMS instance.
- power the backoffice `Plugins` page as well, reusing the exact same discovery, detail, operation, and event endpoints instead of UI-only semantics.

Protection:

- the `system/plugins*` and `system/capabilities` surface is admin-only;
- in the official setup the `kernel` receives enforcement through an auth bridge exported by `core-pack`, so the kernel stays decoupled from a specific auth package while still applying the real middleware.

### 4.1 `GET /v1/system/plugins`

Returns:

- installed plugins
- versions
- lifecycle state
- readable state reason (`statusReason`)
- supported runtime operations and whether they are currently allowed
- declared capabilities
- dependencies with operational status (`ok`, `missing`, `disabled`, `version-mismatch`)
- aggregated security metadata
- minimal failure/disabled context (`failureCount`, `lastFailurePhase`, `lastError`, `disabledReason`)

Typical use:

- build menus or UI sections only when a plugin is present and `loaded`.
- drive admin actions from the real runtime contract instead of assuming unsupported operations exist.

### 4.2 `GET /v1/system/capabilities`

Returns:

- a flat list of capabilities published by installed plugins

Typical use:

- verify whether a feature is available without knowing the full plugin graph in advance.

### 4.3 `POST /v1/system/plugins/:pluginId/operations`

Supported `v1` operations:

- `load`
- `unload`
- `reload`
- `disable`
- `enable`

Constraints:

- operations are executable only when the runtime marks them as available in `operations[]`;
- `disable` optionally accepts `reason`;
- `unregister` and remote installation are intentionally not exposed yet because the current runtime does not make them safe enough for generic admin use.

### 4.4 `GET /v1/system/plugins/:pluginId/events`

Returns the most recent lifecycle events for the plugin:

- `sequence`
- `timestamp`
- `action`
- `phase`
- `success`
- `stateBefore` / `stateAfter`
- optional `details`

Typical use:

- correlate a `failed` or `disabled` state with the real operation sequence;
- enrich admin error messages with recent context without requiring direct access to process logs.

## 5. End-to-end SDK flow

Conceptual example:

```ts
import { createCmsSdkClient, hasCapability, isPluginInstalled } from "@trinacria-cms/sdk";

const cms = createCmsSdkClient({
  baseUrl: "http://127.0.0.1:3000",
  credentials: "include"
});

const plugins = await cms.system.listInstalledPlugins();
const capabilities = await cms.system.listInstalledCapabilities();

const hasCorePack = isPluginInstalled(plugins.data, "core-pack");
const canUseSettings = hasCapability(capabilities.data, "core-pack", "settings.service");
```

Logic:

1. the SDK knows the official contract;
2. runtime discovery tells it what is really active;
3. the frontend or backend client decides which features to enable.

## 6. Why JWT user sessions are not enough

JWTs solve authenticated human sessions.

They do not fit well for:

- server-to-server integrations
- scheduled jobs
- webhook consumers
- external backoffices
- CI/CD scripts

For these cases the system exposes API keys managed by `core-pack`.

## 7. API key data model

Collection:

- `plugin_core_pack__api_keys`

Conceptual fields:

- `id`
- `lookupId`
- `name`
- `kind` (`publishable` | `secret` | `service`)
- `status` (`active` | `revoked`)
- `hash`
- `roleCodes[]`
- `permissionKeys[]`
- `policyRules[]`
- `expiresAt?`
- `lastUsedAt?`

Key point:

- the raw secret is never persisted;
- only the hash is stored.

## 8. API keys and the unified authz engine

The important choice is not to build a second permission system.

The correct choice is:

- reuse the same authorization engine used for users, roles, permissions, and policy rules;
- change only the subject type.

Machine-subject format:

- `api-key:<id>`

Effect:

- a JWT user and an API key are both evaluated by the same authorization service;
- only the source of authorization material changes.

## 9. API key endpoints

Current routes:

- `GET /v1/api-keys`
- `GET /v1/api-keys/:id`
- `POST /v1/api-keys`
- `POST /v1/api-keys/:id/rotate`
- `POST /v1/api-keys/:id/revoke`

Current protection:

- admin JWT

Interpretation:

- a human administrator issues or rotates machine credentials;
- integrations then use those credentials to call the CMS.

## 10. Using the SDK with an API key

Example:

```ts
import { createCmsSdkClient } from "@trinacria-cms/sdk";

const cms = createCmsSdkClient({
  baseUrl: "http://127.0.0.1:3000",
  apiKey: "cms_sk_lookup_secret"
});

const health = await cms.kernelHealth.getKernelHealth();
```

Default header:

- `x-api-key`

Possible override:

- `apiKeyHeaderName`

## 11. Recommended monorepo strategy

1. always use `@trinacria-cms/sdk` as the stable base package
2. regenerate the OpenAPI overlay only when custom plugins are involved
3. use runtime discovery to adapt the UI to the real running instance
4. use API keys for machine integrations, not recycled user JWTs

## 12. Final mental formula

The correct combination is:

- official SDK = stable public contract
- runtime discovery = snapshot of the real system
- generated overlay = monorepo-local typing
- API key = machine identity governed by the same authz engine used for human identities
