# @trinacria-cms/sdk

Zero-dependency runtime SDK for Trinacria CMS.

## Goals

- no runtime dependencies
- generated from OpenAPI snapshot
- usable in browser, React, Node, and custom transports

## Published SDK vs generated overlay

`@trinacria-cms/sdk` is the default public SDK. It is meant to work even
outside the monorepo and already ships the official API groups exposed by the
kernel and the official `core-pack`.

Current built-in official catalog:

- `kernel`: `kernelHealth`, `system`
- `core-pack`: `auth`, `installation`, `users`, `roles`, `permissions`, `settings`, `security`, `apiKeys`

You can inspect this static catalog at runtime through:

- `OFFICIAL_SDK_PLUGIN_CATALOG`
- `client.official`

When a project uses custom plugins or custom application modules inside a
monorepo, the recommended model is:

1. keep using the published SDK as the stable base package
2. regenerate the OpenAPI-derived layer from the real application instance
3. consume the generated overlay for custom endpoints that the public SDK
   cannot know in advance

This is intentionally similar to the Prisma workflow: one stable shared package
plus a generated project-local extension.

## Usage

### Browser / native fetch

```ts
import { createCmsSdkClient } from "@trinacria-cms/sdk";

const client = createCmsSdkClient({
  baseUrl: "http://localhost:3000",
  credentials: "include"
});

const status = await client.installation.getInstallationStatus();
const plugins = await client.system.listInstalledPlugins();
```

### Node with undici

```ts
import { fetch } from "undici";
import { createCmsSdkClient } from "@trinacria-cms/sdk";

const client = createCmsSdkClient({
  baseUrl: "http://localhost:3000",
  fetch
});

const me = await client.auth.getAuthenticatedUser({
  headers: {
    authorization: "Bearer <token>"
  }
});

const capabilities = await client.system.listInstalledCapabilities();
```

### Custom transport with axios

```ts
import axios from "axios";
import { createCmsSdkClient } from "@trinacria-cms/sdk";

const client = createCmsSdkClient({
  baseUrl: "http://localhost:3000",
  transport: {
    async request(input) {
      const response = await axios.request({
        url: input.url,
        method: input.method,
        headers: input.headers,
        data: input.body,
        withCredentials: input.credentials === "include"
      });

      return {
        status: response.status,
        headers: response.headers,
        data: response.data
      };
    }
  }
});
```

## Generation

The generated layer lives in `src/generated/`.

Regenerate it with:

```bash
npm run generate -w @trinacria-cms/sdk
```

The current generator reads:

- `openapi/trinacria-cms.openapi.json`

and writes:

- `src/generated/types.gen.ts`
- `src/generated/<tag>.gen.ts`
- `src/generated/index.ts`

The generated layer augments the published SDK surface. It does not replace the
runtime package.

## Monorepo workflow

Recommended flow in a monorepo:

1. start or update the CMS backend
2. refresh the local OpenAPI snapshot
3. regenerate the SDK package
4. consume `@trinacria-cms/sdk` from frontend apps

Root scripts:

```bash
npm run sdk:snapshot
npm run sdk:generate
npm run sdk:check
npm run sdk:build
```

Notes:

- `sdk:snapshot` downloads `/openapi.json` from `http://127.0.0.1:3000/openapi.json` by default
- you can override the source with `CMS_OPENAPI_URL` or by passing a URL argument
- `sdk:snapshot` also applies a small normalization layer for OpenAPI fields that the current `@trinacria/http` generator does not serialize yet, such as explicit query parameters on list endpoints
- `sdk:check` regenerates the SDK and fails if `packages/sdk/src/generated` is not aligned with the committed code

Example:

```bash
CMS_OPENAPI_URL=http://127.0.0.1:3000/openapi.json npm run sdk:snapshot
npm run sdk:generate
```

Recommended usage in a monorepo:

1. official SDK stays the default dependency used by all apps
2. `sdk:snapshot` reads the real application contract
3. `sdk:generate` refreshes project-specific groups
4. frontend or backend apps import the same package and gain the additional
   generated API groups

This means:

- outside the monorepo you can publish and use `@trinacria-cms/sdk` directly
- inside the monorepo you can extend it with custom plugin contracts

## Using it from a frontend app in the same monorepo

In the frontend workspace package:

```json
{
  "dependencies": {
    "@trinacria-cms/sdk": "0.1.0"
  }
}
```

Then:

```ts
import { createCmsSdkClient } from "@trinacria-cms/sdk";

export const cms = createCmsSdkClient({
  baseUrl: "http://127.0.0.1:3000",
  credentials: "include"
});
```

You can keep one shared client instance per app and reuse:

- `cms.kernelHealth`
- `cms.system`
- `cms.auth`
- `cms.installation`
- `cms.users`
- `cms.roles`
- `cms.permissions`
- `cms.settings`
- `cms.security`
- `cms.apiKeys`
- custom generated groups, when present

## Runtime discovery

The default SDK now includes discovery helpers and system endpoints intended for
admin apps, CLIs, and dynamic UIs.

Kernel endpoints:

- `GET /v1/system/plugins`
- `GET /v1/system/plugins/:pluginId`
- `POST /v1/system/plugins/:pluginId/operations`
- `GET /v1/system/plugins/:pluginId/events?limit=20`
- `GET /v1/system/plugins/sources`
- `GET /v1/system/capabilities`

Example:

```ts
import { createCmsSdkClient, hasCapability, isPluginInstalled } from "@trinacria-cms/sdk";

const cms = createCmsSdkClient({
  baseUrl: "http://127.0.0.1:3000"
});

const plugins = await cms.system.listInstalledPlugins();
const capabilities = await cms.system.listInstalledCapabilities();
const events = await cms.system.listPluginEvents({
  path: { pluginId: "core-pack" },
  query: { limit: 20 }
});

const hasCorePack = isPluginInstalled(plugins.data, "core-pack");
const canManageSettings = hasCapability(capabilities.data, "core-pack", "settings.service");
```

## Authentication modes

The SDK runtime can work with three common models:

- browser cookies through `credentials: "include"`
- bearer JWT through `getAccessToken()` or per-request headers
- API keys through `apiKey` or `getApiKey()`

Example with API key:

```ts
import { createCmsSdkClient } from "@trinacria-cms/sdk";

const cms = createCmsSdkClient({
  baseUrl: "http://127.0.0.1:3000",
  apiKey: "cms_sk_lookup_secret"
});

const health = await cms.kernelHealth.getKernelHealth();
```

Default API key header:

- `x-api-key`

If needed, you can override it with `apiKeyHeaderName`.

## API keys and machine access

`core-pack` exposes API-key management APIs intended for server-to-server and
integration scenarios.

Current endpoints:

- `GET /v1/api-keys`
- `GET /v1/api-keys/{id}`
- `POST /v1/api-keys`
- `POST /v1/api-keys/{id}/rotate`
- `POST /v1/api-keys/{id}/revoke`

The SDK exposes them through `cms.apiKeys.*`.

Typical lifecycle:

1. an admin session creates or rotates a key
2. the raw secret is shown once
3. a backend integration stores that secret securely
4. the integration calls the CMS using `x-api-key`
5. the CMS resolves roles, permissions, and policy rules attached to that key

## Backoffice consumer

The monorepo also includes [apps/backoffice](/Users/enzo/Desktop/trinacria-cms/apps/backoffice),
a thin Vite host that consumes the SDK through `@trinacria-cms/admin-kernel`.

The app itself should stay small. Session bootstrap, runtime discovery, official
admin pages and resource registry logic live in `admin-kernel`.

## Important note

The SDK can only generate what is actually declared in OpenAPI.

If an endpoint is missing:

- query parameters
- requestBody schema
- response schema

then the generated client will reflect that limitation. In that case the OpenAPI document must be improved at the source.
