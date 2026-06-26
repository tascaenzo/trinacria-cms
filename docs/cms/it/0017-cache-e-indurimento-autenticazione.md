# 0017 - Sistema di cache e indurimento autenticazione

Questo capitolo descrive l'infrastruttura di cache e le funzionalita di
indurimento dell'autenticazione (revoca JWT, protezione brute-force) aggiunte
in core-pack. Uno sviluppatore di plugin deve capirle per usare la cache nei
propri repository e per conoscere i confini di sicurezza.

## 1. Architettura del sistema di cache

Il sistema di cache ha tre livelli, seguendo lo stesso pattern di `DbAdapter`:

```
kernel/contracts/cache-adapter.ts     → interfaccia CacheAdapter
kernel/tokens/core-tokens.ts          → token CORE_TOKENS.CACHE_ADAPTER
core-pack/src/modules/cache/          → implementazioni + CacheService
```

### 1.1 Interfaccia CacheAdapter (kernel)

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

Ogni valore vive sotto una coppia **namespace** + **key**. Il namespace
permette invalidazioni mirate (es. svuotare tutte le entry `"permissions"`
senza toccare `"roles"`).

### 1.2 Adapter predefiniti

| Adapter              | File                                     | Persistenza      | Condiviso tra repliche |
| -------------------- | ---------------------------------------- | ---------------- | ---------------------- |
| `MemoryCacheAdapter` | `cache/adapters/memory-cache-adapter.ts` | `Map` in-process | No                     |
| `RedisCacheAdapter`  | `cache/adapters/redis-cache-adapter.ts`  | Redis (ioredis)  | Si                     |

`MemoryCacheAdapter` usa una `Map<string, CacheEntry>`. Il TTL viene
controllato ad ogni `get()` — le entry scadute vengono cancellate
lazyamente. Tutti i dati sono persi al riavvio del processo.

`RedisCacheAdapter` usa `JSON.stringify`/`JSON.parse` per la
serializzazione. Le chiavi sono salvate come
`trinacria:cache:{namespace}:{key}`. L'invalidazione per namespace usa `SCAN`
con iterazione cursor-based (batch size 100). L'adapter Redis e configurato
con `lazyConnect: true`, `maxRetriesPerRequest: 3` e retry strategy
esponenziale (max 2s).

### 1.3 CacheService (core-pack)

`CacheService` wrappa un `CacheAdapter` e fornisce operazioni di alto livello:

```ts
class CacheService {
  constructor(private readonly adapter: CacheAdapter) {}

  // Operazioni raw
  get<T>(namespace, key): Promise<T | undefined>;
  set<T>(namespace, key, value, ttlSeconds?): Promise<void>;

  // Lettura con popolamento automatico in caso di miss
  getOrCompute<T>(namespace, key, loader, ttlSeconds?): Promise<T>;

  // Invalida una singola chiave o l'intero namespace
  invalidate(namespace, key?): Promise<void>;

  // Svuota tutto
  clear(): Promise<void>;

  // Restituisce una closure che auto-cachea la funzione loader
  wrap<T>(namespace, key, loader, ttlSeconds?): () => Promise<T>;
}
```

**`getOrCompute`** e il pattern di lettura principale. Controlla la cache
prima; in caso di miss chiama il `loader`, salva il risultato e lo
restituisce. Questo evita coppie manuali `get`/`set` ed elimina una classe
di bug da race condition sulla cache.

**`invalidate(namespace)`** (senza key) chiama `delNamespace`
sull'adapter, rimuovendo **tutte** le chiavi in quel namespace. Usalo quando
una mutazione potrebbe coinvolgere multiple entry cached.

### 1.4 Selezione adapter (ordine di priorita)

La factory `createDefaultCacheAdapter(db)` segue questa priorita:

1. **Custom adapter** — se registrato via `setCustomCacheAdapter(adapter)`
2. **Redis** — se `core-pack:cache:redis_url` e configurato nelle settings
3. **Memory** — fallback

La URL Redis viene letta dalla collezione `settings` (prima controlla
`value`, poi `defaultValue` del seed `core-pack:cache:redis_url`). Se la
collezione settings non esiste ancora (primo bootstrap), la factory cade
silenziosamente su Memory.

### 1.5 Riferimento token

```ts
import { CORE_TOKENS, type CacheAdapter } from "@trinacria-cms/kernel";
import { CORE_PACK_CACHE_SERVICE_TOKEN } from "@trinacria-cms/core-pack";

// Token adapter (livello kernel)
CORE_TOKENS.CACHE_ADAPTER;

// Token servizio (livello core-pack)
CORE_PACK_CACHE_SERVICE_TOKEN;
```

`CORE_PACK_CACHE_ADAPTER_TOKEN` e un alias di `CORE_TOKENS.CACHE_ADAPTER`
per retrocompatibilita.

## 2. Pattern di cache nei repository esistenti

Tre repository usano la cache per i metodi di lettura. Studiali come
riferimento per i tuoi repository.

### 2.1 PermissionsRepository — invalidazione per chiave

```
File: permissions.repository.ts
Namespace: "permissions"
Cache key: la chiave permission stessa (es. "core-pack:users:read")
```

- `findByKey(key)` usa `cache.getOrCompute("permissions", key, loader)`
- Le scritture (`create`, `updateStatus`, `upsertOwnedPermission`,
  `deleteById`) invalidano **solo la chiave interessata** — non l'intero
  namespace
- `findById` e i metodi di lista non sono cached

### 2.2 RolesRepository — invalidazione namespace-wide

```
File: roles.repository.ts
Namespace: "roles"
Cache keys: "code:{normalizedCode}" e "id:{id}"
```

- `findByCode(code)` usa `cache.getOrCompute("roles", "code:" + code, loader)`
- `findById(id)` usa `cache.getOrCompute("roles", "id:" + id, loader)`
- Qualsiasi scrittura (`create`, `updateStatus`, `upsertOwnedRole`,
  `deleteById`, `rawUpdate`) invalida l'**intero** namespace `"roles"`
- `listByCodes` non e cached

### 2.3 InstallationStateRepository — cache singleton

```
File: installation-state.repository.ts
Namespace: "installation"
Cache key: "state"
```

- `get()` usa `cache.getOrCompute("installation", "state", loader)`
- `ensureCreated` e `markInstalled` invalidano l'intero namespace

### 2.4 Perche nessun TTL su queste cache?

Permessi, ruoli e stato di installazione sono cached fino a invalidazione
esplicita. Questo e sicuro perche le scritture avvengono solo durante il
(de)provisioning dei plugin — mai a runtime. Se il tuo plugin cache dati che
cambiano a runtime, imposta sempre un `ttlSeconds` per evitare letture
stale.

## 3. Usare la cache nel tuo plugin

### 3.1 Iniettare CacheService

Aggiungi `CORE_PACK_CACHE_SERVICE_TOKEN` come dipendenza del tuo
repository. La cache e opzionale — se il token non viene fornito il codice
funziona lo stesso.

```ts
import { classProvider } from "@trinacria-cms/kernel";
import { CORE_PACK_CACHE_SERVICE_TOKEN } from "@trinacria-cms/core-pack";

classProvider(MY_REPOSITORY_TOKEN, MyRepository, [
  CORE_TOKENS.DB_ADAPTER,
  CORE_PACK_CACHE_SERVICE_TOKEN
]);
```

Costruttore del tuo repository:

```ts
export class MyRepository {
  constructor(
    private readonly db: DbAdapter,
    private readonly cache?: CacheService // opzionale
  ) {}
}
```

### 3.2 Namespace specifici del plugin

Assegna sempre un namespace al tuo plugin:

```ts
private readonly CACHE_NS = "my-plugin:widgets";

async findById(id: string): Promise<Widget | null> {
  if (!this.cache) return this.getFromDb(id);
  return this.cache.getOrCompute(this.CACHE_NS, id, () => this.getFromDb(id));
}

async update(id: string, data: Partial<Widget>): Promise<Widget> {
  const result = /* ... aggiornamento db ... */;
  await this.cache?.invalidate(this.CACHE_NS);  // flush intero namespace
  return result;
}
```

### 3.3 Scegliere la strategia di invalidazione

| Pattern di scrittura           | Invalidazione                          | Quando usarlo                                               |
| ------------------------------ | -------------------------------------- | ----------------------------------------------------------- |
| Singolo record con chiave nota | `invalidate(ns, key)`                  | Le scritture identificano la chiave cached esatta           |
| Multipli record interessati    | `invalidate(ns)`                       | Scritture batch, o quando molte chiavi possono essere stale |
| Dati che cambiano a runtime    | Imposta `ttlSeconds` in `getOrCompute` | Non affidarti mai alla sola invalidazione manuale           |

### 3.4 Fonti di import

```ts
// Interfaccia (dal kernel)
import type { CacheAdapter, CacheEntry } from "@trinacria-cms/kernel";

// Servizio (da core-pack)
import { CacheService, CORE_PACK_CACHE_SERVICE_TOKEN } from "@trinacria-cms/core-pack";
import type { CacheService } from "@trinacria-cms/core-pack";

// Classi adapter (per test)
import { MemoryCacheAdapter, RedisCacheAdapter } from "@trinacria-cms/core-pack";

// Registrazione custom adapter
import { setCustomCacheAdapter } from "@trinacria-cms/core-pack";
```

## 4. Custom cache adapter

Per fornire un backend cache personalizzato (es. Redis Cluster, Memcached,
SQL-based):

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

// Chiama prima che il modulo cache venga inizializzato
setCustomCacheAdapter(new MyClusterAdapter());
```

Questa chiamata deve avvenire durante il bootstrap dell'app, prima che
`createDefaultCacheAdapter` venga invocato. Il modulo cache di core-pack
controlla un registro globale; se un adapter custom e registrato, ha
priorita sia su Redis che su Memory.

## 5. Indurimento autenticazione

### 5.1 Revoca JWT

Ogni JWT e identificato univocamente dalla coppia `sub` (user ID) e `iat`
(issued-at timestamp). Revocare un token salva questa coppia nella
collezione `settings` di core-pack con `kind: "blacklist"`:

```
Collection: settings
Document:   { kind: "blacklist", key: "{sub}:{iat}", sub, iat, tokenKind, expiresAt, createdAt }
Indexes:    unique su id, compound unique su (kind, key)
```

- `revokeBearerToken(token)` decodifica il JWT (senza verificare la firma —
  funziona anche per token scaduti), estrae `sub` e `iat`, e persiste la
  coppia su MongoDB.
- Ogni richiesta autenticata controlla `isBlacklisted(sub, iat)` dopo la
  verifica della firma. Se la coppia viene trovata, la richiesta viene
  rifiutata con `"auth_token_revoked"`.
- `cleanupExpired()` rimuove le entry scadute durante l'autenticazione del
  token. Scansiona tutti i record e cancella quelli con `expiresAt` nel
  passato.

La revoca e **per token**, non per utente. Revocare un token di accesso non
invalida altri token (accesso o refresh) per lo stesso utente.

### 5.2 Protezione brute-force

I tentativi di login falliti sono tracciati nella collezione `settings` di
core-pack con `kind: "login_attempt"`:

```
Collection: settings
Document:   { kind: "login_attempt", key: normalizedEmail, email, count, lockoutUntil?, createdAt, updatedAt }
Indexes:    unique su id, compound unique su (kind, key)
```

Flusso in `loginWithPassword(email, password)`:

1. `assertNotLockedOut(email)` — controlla se `lockoutUntil > now`. Se
   bloccato, lancia `"auth_account_locked"` con i secondi rimanenti. Se
   `lockoutUntil` e nel passato, il contatore viene resettato
   automaticamente.
2. Verifica password. In caso di **fallimento**: `recordFailedAttempt(email)`
   chiama `increment(email)`. Quando `count >= maxAttempts` (default 5),
   `lockoutUntil` viene impostato a `now + lockoutMinutes` (default 15). In
   caso di **successo**: `reset(email)` cancella il record.
3. Il record `login_attempt` e un semplice contatore con semantica upsert.
   L'indice unico su `(kind, key)` previene duplicati.

Configurazione (via env var, tutte con default sensati):

| Variabile                   | Default | Descrizione                        |
| --------------------------- | ------- | ---------------------------------- |
| `CMS_LOGIN_MAX_ATTEMPTS`    | `5`     | Tentativi falliti prima del blocco |
| `CMS_LOGIN_LOCKOUT_MINUTES` | `15`    | Durata del blocco                  |

### 5.3 Come influenzano lo sviluppatore di plugin

- Non devi gestire la revoca dei token o la protezione brute-force nel tuo
  plugin — e applicata a livello core-pack prima che qualsiasi controller
  venga eseguito.
- Se il tuo plugin fornisce un meccanismo di autenticazione personalizzato,
  dovresti implementare protezioni simili.
- I record `blacklist` e `login_attempt` in `settings` sono gestiti
  interamente da core-pack. Non scriverci direttamente.

## 6. Configurazione

### 6.1 Cache Redis URL

Impostabile via API settings o seed definition:

```
Key:         core-pack:cache:redis_url
Type:        string
Visibility:  public
Default:     "" (vuoto = MemoryCacheAdapter)
```

Esempio URL Redis: `redis://:password@host:6379`

### 6.2 Variabili d'ambiente

| Variabile                     | Default                                | Descrizione                 |
| ----------------------------- | -------------------------------------- | --------------------------- |
| `CMS_JWT_SECRET`              | `"trinacria-cms-dev-secret-change-me"` | Chiave firma JWT (solo dev) |
| `CMS_JWT_ACCESS_TTL_SECONDS`  | `86400` (24h)                          | Durata token accesso        |
| `CMS_JWT_REFRESH_TTL_SECONDS` | `2592000` (30g)                        | Durata token refresh        |
| `CMS_LOGIN_MAX_ATTEMPTS`      | `5`                                    | Soglia brute-force          |
| `CMS_LOGIN_LOCKOUT_MINUTES`   | `15`                                   | Durata blocco               |

## 7. Test con la cache

Per i test unitari, istanzia direttamente `MemoryCacheAdapter`:

```ts
import { MemoryCacheAdapter } from "@trinacria-cms/core-pack";
import { CacheService } from "@trinacria-cms/core-pack";

const adapter = new MemoryCacheAdapter();
const cache = new CacheService(adapter);

// Usa la cache nei test del tuo repository
const repo = new MyRepository(mockDb, cache);
```

Il costruttore di `CacheService` accetta qualsiasi implementazione di
`CacheAdapter`. L'adapter e opzionale in tutti i repository first-party —
passa `undefined` per testare il percorso di fallback.
