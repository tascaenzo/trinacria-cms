# @trinacria-cms/sdk

Zero-dependency runtime SDK for browser and Node. The generated official client covers
kernel, Core, Editorial, Media, Email and the delivery/preview groups.
`OFFICIAL_SDK_PLUGIN_CATALOG` / `client.official` list the 138 generated operations.
The original 22 Editorial IDs are retained; explicit republication and preview issuance
are additional methods. Anonymous delivery reads only publication snapshots. Preview
credentials are scoped sessions; never transfer an admin JWT to a public site.

```ts
import { createCmsSdkClient } from "@trinacria-cms/sdk";
const cms = createCmsSdkClient({ baseUrl: "https://cms.example", credentials: "include" });
const models = await cms.editorial.listEditorialContentTypes();
```

Bearer authentication uses `getAccessToken()` or per-request authorization headers.
Cookie mutations require the server's CSRF/origin policy; configure trusted origins.
`apiKey` is a generic client header option, not a promise that a server route accepts it.
Owner-signed plugin requests require all six protocol v2 signature headers and canonical signing.
OpenAPI security describes these modes separately, with the actual configured cookie name.

## Project-local overlay

Capture your application's `/openapi.json` explicitly, then run the distributed CLI:

```sh
trinacria-sdk ./openapi.json ./generated/catalog --mode overlay --owner catalog-plugin
# Documents without ownership metadata can use repeated --operation <operationId>.
```

```ts
import { createPluginSdk } from "./generated/catalog/index.js";
const catalog = createPluginSdk(cms);
// catalog has its own groups; no mutation of the official client.
```

Overlay imports use the public `@trinacria-cms/sdk/runtime` subpath and compile outside
this repository. HTTP input is fetched only when an explicit URL is supplied. Generation
is deterministic and rejects unsupported schemas, unresolved/recursive refs, sanitized
ID/tag collisions, reserved groups and unsupported response media types.

Output must be a dedicated directory. The CLI refuses project/root/node_modules targets,
symlinks and nonempty unmarked directories. It removes only obsolete files recorded in
`.trinacria-sdk-generator.json`, preserving manually maintained files.

## JSON and binary transport

JSON operations serialize the typed body. Binary uploads accept `Uint8Array` and send
raw bytes as `application/octet-stream`; binary downloads return `Uint8Array`. HTTP
errors retain JSON envelopes and throw `CmsSdkHttpError`, even for binary operations.
A custom fetch implementation needs `arrayBuffer()` for binary responses. Native Node
and browser fetch already provide it. A custom transport must honor `responseType`,
return raw bytes for successful binary responses and preserve status/headers/error bodies.
Credentials, headers and abort signals are forwarded; requests time out after 30 seconds
by default (`requestTimeoutMs: 0` disables the automatic timeout).

## Repository verification

```sh
CMS_OPENAPI_URL=http://127.0.0.1:3000/openapi.json npm run sdk:snapshot
npm run sdk:generate
npm run sdk:check
npm run sdk:build
```

Snapshot capture validates the server document without patching missing parameters.
The real router inventory validates every public route against OpenAPI during bootstrap;
operational exclusions require explicit reasons. `sdk:check` additionally detects drift
between the versioned snapshot and generated code. HTTP tests exercise Editorial and
binary Media operations against the running CMS. Dynamic Editorial `data` is JSON;
content type validation remains a server responsibility. List `meta.count` is the number
of returned records, not the total number of matches.
