# 0017 - Cache system and authentication hardening

This chapter explains the cache infrastructure and the authentication hardening
features (JWT revocation, brute-force protection) added in core-pack. A plugin
developer should understand these to use caching in their own repositories and
to be aware of the security boundaries.

## 1. Cache system architecture

The cache system has three layers, following the same pattern as `DbAdapter`:

```
kernel/contracts/cache-adapter.ts     → CacheAdapter interface
kernel/tokens/core-tokens.ts          → CORE_TOKENS.CACHE_ADAPTER token
core-pack/src/modules/cache/          → implementations + CacheService
```

### 1.1 CacheAdapter interface (kernel)

```ts
// @trinacria-cms/kernel
export interface CacheAdapter {
  get<T>(namespace: string, key: string): Promise<T | undefined>;
  set<T>(namespace: string, key: string, value: T, ttlSeconds?: number): Promise<void>;
  del(namespace: string, key: string): Promise<void>;
  delNamespace(namespace: string): Promise<void>;
  clear(): Promise<void>;
}
```

Every value lives under a **namespace** + **key** pair. The namespace allows
targeted invalidation (e.g., flush all `"permissions"` entries without touching
`"roles"`).

### 1.2 Built-in adapters

| Adapter              | File                                     | Persistence      | Shared across replicas |
| -------------------- | ---------------------------------------- | ---------------- | ---------------------- |
| `MemoryCacheAdapter` | `cache/adapters/memory-cache-adapter.ts` | In-process `Map` | No                     |
| `RedisCacheAdapter`  | `cache/adapters/redis-cache-adapter.ts`  | Redis (ioredis)  | Yes                    |

`MemoryCacheAdapter` stores data in a plain `Map<string, CacheEntry>`. TTL is
checked on every `get()` — expired entries are deleted lazily. All data is lost
on process restart.

`RedisCacheAdapter` uses `JSON.stringify`/`JSON.parse` for serialization. Keys
are stored as `trinacria:cache:{namespace}:{key}`. Namespace-level invalidation
uses `SCAN` with cursor-based iteration (batch size 100). The Redis adapter
is configured with `lazyConnect: true`, `maxRetriesPerRequest: 3`, and an
exponential retry strategy (max 2s).

### 1.3 CacheService (core-pack)

`CacheService` wraps a `CacheAdapter` and provides higher-level operations:

```ts
class CacheService {
  constructor(private readonly adapter: CacheAdapter) {}

  // Raw operations
  get<T>(namespace, key): Promise<T | undefined>;
  set<T>(namespace, key, value, ttlSeconds?): Promise<void>;

  // Read with automatic population on miss
  getOrCompute<T>(namespace, key, loader, ttlSeconds?): Promise<T>;

  // Invalidate single key or entire namespace
  invalidate(namespace, key?): Promise<void>;

  // Flush everything
  clear(): Promise<void>;

  // Returns a cached wrapper around a loader function
  wrap<T>(namespace, key, loader, ttlSeconds?): () => Promise<T>;
}
```

**`getOrCompute`** is the primary read pattern. It checks the cache first; on
miss it calls the `loader`, stores the result, and returns it. This avoids
manual `get`/`set` pairs and eliminates a class of cache-race bugs.

**`invalidate(namespace)`** (without key) calls `delNamespace` on the adapter,
removing **all** keys under that namespace. Use this when a mutation could
affect multiple cached entries.

### 1.4 Adapter selection (priority order)

The factory `createDefaultCacheAdapter(db)` follows this priority:

1. **Custom adapter** — if registered via `setCustomCacheAdapter(adapter)`
2. **Redis** — if `core-pack:cache:redis_url` is configured in settings
3. **Memory** — fallback

The Redis URL is read from the `settings` collection (first checks `value`,
then `defaultValue` of the `core-pack:cache:redis_url` seed definition). If
the settings collection does not exist yet (first bootstrap), the factory
silently falls back to Memory.

### 1.5 Token reference

```ts
import { CORE_TOKENS, type CacheAdapter } from "@trinacria-cms/kernel";
import { CORE_PACK_CACHE_SERVICE_TOKEN } from "@trinacria-cms/core-pack";

// Adapter token (kernel-level)
CORE_TOKENS.CACHE_ADAPTER;

// Service token (core-pack-level)
CORE_PACK_CACHE_SERVICE_TOKEN;
```

`CORE_PACK_CACHE_ADAPTER_TOKEN` is aliased to `CORE_TOKENS.CACHE_ADAPTER` for
backward compatibility.

## 2. Caching patterns in existing repositories

Three repositories cache their read methods. Study them as reference for your
own repositories.

### 2.1 PermissionsRepository — key-precise invalidation

```
File: permissions.repository.ts
Namespace: "permissions"
Cache key: the permission key itself (e.g. "core-pack:users:read")
```

- `findByKey(key)` uses `cache.getOrCompute("permissions", key, loader)`
- Writes (`create`, `updateStatus`, `upsertOwnedPermission`, `deleteById`)
  invalidate **only the affected key** — not the whole namespace
- `findById` and list methods are not cached

### 2.2 RolesRepository — namespace-wide invalidation

```
File: roles.repository.ts
Namespace: "roles"
Cache keys: "code:{normalizedCode}" and "id:{id}"
```

- `findByCode(code)` uses `cache.getOrCompute("roles", "code:" + code, loader)`
- `findById(id)` uses `cache.getOrCompute("roles", "id:" + id, loader)`
- Any write (`create`, `updateStatus`, `upsertOwnedRole`, `deleteById`,
  `rawUpdate`) invalidates the **entire** `"roles"` namespace
- `listByCodes` is not cached

### 2.3 InstallationStateRepository — singleton cache

```
File: installation-state.repository.ts
Namespace: "installation"
Cache key: "state"
```

- `get()` uses `cache.getOrCompute("installation", "state", loader)`
- `ensureCreated` and `markInstalled` invalidate the whole namespace

### 2.4 Why no TTL on these caches?

Permissions, roles, and installation state are cached until explicitly
invalidated. This is safe because writes only happen during plugin
(de)provisioning — never at runtime. If your plugin caches data that changes at
runtime, always set a `ttlSeconds` to prevent stale reads.

## 3. Using cache in your plugin

### 3.1 Injecting CacheService

Add `CORE_PACK_CACHE_SERVICE_TOKEN` as a dependency of your repository. The
cache is optional — if the token is not provided the code works without it.

```ts
import { classProvider } from "@trinacria-cms/kernel";
import { CORE_PACK_CACHE_SERVICE_TOKEN } from "@trinacria-cms/core-pack";

classProvider(MY_REPOSITORY_TOKEN, MyRepository, [
  CORE_TOKENS.DB_ADAPTER,
  CORE_PACK_CACHE_SERVICE_TOKEN
]);
```

Your repository constructor:

```ts
export class MyRepository {
  constructor(
    private readonly db: DbAdapter,
    private readonly cache?: CacheService // optional
  ) {}
}
```

### 3.2 Plugin-namespaced cache keys

Always scope your namespace to your plugin:

```ts
private readonly CACHE_NS = "my-plugin:widgets";

async findById(id: string): Promise<Widget | null> {
  if (!this.cache) return this.getFromDb(id);
  return this.cache.getOrCompute(this.CACHE_NS, id, () => this.getFromDb(id));
}

async update(id: string, data: Partial<Widget>): Promise<Widget> {
  const result = /* ... db update ... */;
  await this.cache?.invalidate(this.CACHE_NS);  // full namespace flush
  return result;
}
```

### 3.3 Choosing invalidation strategy

| Write pattern              | Invalidation                       | When to use                                  |
| -------------------------- | ---------------------------------- | -------------------------------------------- |
| Single record by known key | `invalidate(ns, key)`              | Writes identify the exact cached key         |
| Multiple records affected  | `invalidate(ns)`                   | Batch writes, or when many keys may be stale |
| Data changes at runtime    | Set `ttlSeconds` in `getOrCompute` | Never trust manual invalidation alone        |

### 3.4 Import sources

```ts
// Interface (from kernel)
import type { CacheAdapter, CacheEntry } from "@trinacria-cms/kernel";

// Service (from core-pack)
import { CacheService, CORE_PACK_CACHE_SERVICE_TOKEN } from "@trinacria-cms/core-pack";
import type { CacheService } from "@trinacria-cms/core-pack";

// Adapter classes (for testing)
import { MemoryCacheAdapter, RedisCacheAdapter } from "@trinacria-cms/core-pack";

// Custom adapter registration
import { setCustomCacheAdapter } from "@trinacria-cms/core-pack";
```

## 4. Custom cache adapter

To provide your own cache backend (e.g., Redis Cluster, Memcached, SQL-based):

```ts
import { setCustomCacheAdapter } from "@trinacria-cms/core-pack";
import type { CacheAdapter } from "@trinacria-cms/kernel";

class MyClusterAdapter implements CacheAdapter {
  async get<T>(namespace: string, key: string): Promise<T | undefined> {
    /* ... */
  }
  async set<T>(namespace: string, key: string, value: T, ttlSeconds?: number): Promise<void> {
    /* ... */
  }
  async del(namespace: string, key: string): Promise<void> {
    /* ... */
  }
  async delNamespace(namespace: string): Promise<void> {
    /* ... */
  }
  async clear(): Promise<void> {
    /* ... */
  }
}

// Call before the cache module initializes
setCustomCacheAdapter(new MyClusterAdapter());
```

This must be called during app bootstrap, before `createDefaultCacheAdapter` is
invoked. The core-pack cache module checks a global registry first; if a custom
adapter is registered, it takes priority over both Redis and Memory.

## 5. Authentication hardening

### 5.1 JWT revocation

Each JWT is uniquely identified by its `sub` (user ID) and `iat` (issued-at
timestamp) claims. Revoking a token stores this pair in the
core-pack `settings` collection with `kind: "blacklist"`:

```
Collection: settings
Document:   { kind: "blacklist", key: "{sub}:{iat}", sub, iat, tokenKind, expiresAt, createdAt }
Indexes:    unique on id, compound unique on (kind, key)
```

- `revokeBearerToken(token)` decodes the JWT (without verifying signature —
  works even for expired tokens), extracts `sub` and `iat`, and persists the
  pair to MongoDB.
- Every authenticated request checks `isBlacklisted(sub, iat)` after signature
  verification. If the pair is found, the request is rejected with
  `"auth_token_revoked"`.
- `cleanupExpired()` garbage-collects expired entries during token
  authentication. It scans all records and deletes those whose `expiresAt` is
  in the past.

Revocation is **per token**, not per user. Revoking one access token does not
invalidate other tokens (access or refresh) for the same user.

### 5.2 Brute-force protection

Failed login attempts are tracked in the core-pack `settings` collection with
`kind: "login_attempt"`:

```
Collection: settings
Document:   { kind: "login_attempt", key: normalizedEmail, email, count, lockoutUntil?, createdAt, updatedAt }
Indexes:    unique on id, compound unique on (kind, key)
```

Flow on `loginWithPassword(email, password)`:

1. `assertNotLockedOut(email)` — checks if `lockoutUntil > now`. If locked,
   throws `"auth_account_locked"` with remaining seconds. If `lockoutUntil` is
   in the past, the attempt counter is reset automatically.
2. Password verification. On **failure**: `recordFailedAttempt(email)` calls
   `increment(email)`. When `count >= maxAttempts` (default 5), `lockoutUntil`
   is set to `now + lockoutMinutes` (default 15). On **success**:
   `reset(email)` deletes the record.
3. The `login_attempt` record is a simple counter with upsert semantics. The
   unique index on `(kind, key)` prevents duplicates.

Configuration (via env vars, all with sensible defaults):

| Variable                    | Default | Description                    |
| --------------------------- | ------- | ------------------------------ |
| `CMS_LOGIN_MAX_ATTEMPTS`    | `5`     | Failed attempts before lockout |
| `CMS_LOGIN_LOCKOUT_MINUTES` | `15`    | Lockout duration               |

### 5.3 How they affect plugin developers

- You do **not** need to handle token revocation or brute-force in your plugin
  — it is enforced at the core-pack auth level before any controller runs.
- If your plugin provides its own auth mechanism, you should enforce similar
  protections.
- The `blacklist` and `login_attempt` records in `settings` are managed
  entirely by core-pack. Do not write to them directly.

## 6. Configuration

### 6.1 Cache Redis URL

Set via settings API or seed definition:

```
Key:         core-pack:cache:redis_url
Type:        string
Visibility:  public
Default:     "" (empty = MemoryCacheAdapter)
```

Example Redis URL: `redis://:password@host:6379`

### 6.2 Environment variables

| Variable                      | Default                                | Description                |
| ----------------------------- | -------------------------------------- | -------------------------- |
| `CMS_JWT_SECRET`              | `"trinacria-cms-dev-secret-change-me"` | JWT signing key (dev only) |
| `CMS_JWT_ACCESS_TTL_SECONDS`  | `86400` (24h)                          | Access token lifetime      |
| `CMS_JWT_REFRESH_TTL_SECONDS` | `2592000` (30d)                        | Refresh token lifetime     |
| `CMS_LOGIN_MAX_ATTEMPTS`      | `5`                                    | Brute-force threshold      |
| `CMS_LOGIN_LOCKOUT_MINUTES`   | `15`                                   | Lockout duration           |

## 7. Testing with the cache

For unit tests, directly instantiate `MemoryCacheAdapter`:

```ts
import { MemoryCacheAdapter } from "@trinacria-cms/core-pack";
import { CacheService } from "@trinacria-cms/core-pack";

const adapter = new MemoryCacheAdapter();
const cache = new CacheService(adapter);

// Use the cache in your repository tests
const repo = new MyRepository(mockDb, cache);
```

The `CacheService` constructor accepts any `CacheAdapter` implementation. The
adapter is optional in all first-party repositories — pass `undefined` to test
the fallback path.
