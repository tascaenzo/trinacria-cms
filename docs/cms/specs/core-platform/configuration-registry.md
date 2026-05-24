# Configuration Registry e secrets core

## Stato

- Milestone: `M4.0 - Core Platform Specifications`
- Stato: `draft`
- Scope: low-level specification
- Ultimo aggiornamento: `2026-05-22`

## Decisione

La collection `settings` e il configuration registry sicuro della piattaforma.

Non e solo storage di preferenze. E un registro centralizzato Mongo-first per
configurazioni core, configurazioni plugin e secret, con ownership, visibilita,
validazione, masking, accesso signed e audit.

Il registry e posseduto da `core-pack`. Il kernel fornisce namespace governance e
validazione delle dichiarazioni nei manifest plugin.

## Responsabilita

| Area                 | Owner                      | Responsabilita                           |
| -------------------- | -------------------------- | ---------------------------------------- |
| Registry contract    | `@trinacria-cms/core-pack` | SettingsRegistry, definitions, valori    |
| Encryption service   | `@trinacria-cms/core-pack` | AES-256-GCM cipher, key rotation         |
| Signed plugin auth   | `@trinacria-cms/core-pack` | Plugin-to-core signed calls              |
| Namespace governance | `@trinacria-cms/kernel`    | Collisioni canonical key, reserved paths |
| Manifest integration | `@trinacria-cms/kernel`    | PluginSettingDeclaration nei manifest    |
| Backoffice broker    | `packages/admin-kernel`    | Metadata, masked value, azioni operative |
| Audit event storage  | `@trinacria-cms/core-pack` | Storage centralizzato audit events       |

## Modello dati

Il registry si compone di tre documenti distinti: definizione, valore e secret.

### SettingDefinitionDocument

```ts
export interface SettingDefinitionDocument {
  id: string;
  ownerPluginId: string;
  namespace: string;
  key: string;
  canonicalKey: string;
  type: "string" | "number" | "boolean" | "json" | "secret";
  visibility: "public" | "protected" | "secret";
  required: boolean;
  schema?: unknown;
  defaultValue?: unknown;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### SettingValueDocument

```ts
export interface SettingValueDocument {
  id: string;
  canonicalKey: string;
  ownerPluginId: string;
  value?: unknown;
  secretRef?: string;
  version: number;
  updatedAt: Date;
  updatedBy?: string;
}
```

### SettingSecretDocument

```ts
export interface SettingSecretDocument {
  id: string;
  canonicalKey: string;
  ownerPluginId: string;
  ciphertext: string;
  iv: string;
  authTag: string;
  keyVersion: string;
  rotatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

## Contratti TypeScript target

Package owner: `@trinacria-cms/core-pack`

### SettingsRegistry

Entry point del configuration registry. Deve essere accessibile via DI token
`CORE_TOKENS.SETTINGS_REGISTRY` futuro o via servizio diretto di core-pack.

```ts
export interface SettingsRegistry {
  define(definition: SettingDefinitionInput): Promise<SettingDefinition>;
  get(canonicalKey: string, actor: SettingsActor): Promise<SettingReadResult>;
  set(canonicalKey: string, value: unknown, actor: SettingsActor): Promise<void>;
  revealSecret(canonicalKey: string, actor: SettingsActor): Promise<string>;
  rotateSecret(canonicalKey: string, value: string, actor: SettingsActor): Promise<void>;
  listDefinitions(filter?: SettingFilter): Promise<SettingDefinition[]>;
  listValues(filter?: SettingFilter): Promise<SettingValueDto[]>;
}
```

### SettingsActor

Identifica chi sta interagendo con il registry.

```ts
export interface SettingsActor {
  type: "admin" | "plugin";
  id: string;
  pluginId?: string;
  permissions?: readonly string[];
}
```

Regole:

- attore `admin`: utente umano autenticato via backoffice, ha accesso a
  `public` e `protected`, non a `secret` senza policy esplicita
- attore `plugin`: chiamata signed da plugin owner. Puo accedere e rivelare
  i propri `secret`. Puo leggere `public` di altri plugin
- un attore `plugin` non puo leggere `protected` o `secret` di un altro
  plugin senza capability/policy

### SettingFilter

```ts
export interface SettingFilter {
  ownerPluginId?: string;
  namespace?: string;
  visibility?: "public" | "protected" | "secret";
}
```

## API HTTP target

Il registry e esposto tramite le API settings di `core-pack`:

| Method | Path                                         | Auth          | Permission                  |
| ------ | -------------------------------------------- | ------------- | --------------------------- |
| `GET`  | `/v1/settings/definitions`                   | admin bearer  | `core-pack:settings:read`   |
| `GET`  | `/v1/settings/values`                        | admin bearer  | `core-pack:settings:read`   |
| `GET`  | `/v1/settings/values/{canonicalKey}`         | admin bearer  | `core-pack:settings:read`   |
| `PUT`  | `/v1/settings/values/{canonicalKey}`         | admin bearer  | `core-pack:settings:write`  |
| `POST` | `/v1/settings/secrets/{canonicalKey}/reveal` | plugin signed | owner-policy                |
| `POST` | `/v1/settings/secrets/{canonicalKey}/rotate` | plugin signed | owner-policy                |
| `GET`  | `/v1/settings/export`                        | admin bearer  | `core-pack:settings:export` |

Ogni response usa `ApiSuccessResponse<T>` o `ApiErrorResponse`.

## DTO request/response

```ts
// --- Response

export interface SettingValueDto {
  canonicalKey: string;
  ownerPluginId: string;
  type: string;
  visibility: "public" | "protected" | "secret";
  value?: unknown;
  maskedValue?: string;
  version: number;
  updatedAt: string;
}

export interface SettingDefinitionDto {
  canonicalKey: string;
  ownerPluginId: string;
  namespace: string;
  key: string;
  type: string;
  visibility: "public" | "protected" | "secret";
  required: boolean;
  description?: string;
  defaultValue?: unknown;
}

// --- Request

export interface UpdateSettingValueRequestDto {
  value: unknown;
}

export interface RotateSecretRequestDto {
  value: string;
}
```

## Storage Mongo

Il registry possiede 4 collezioni:

| Collection                       | Unique index                  | Owner     |
| -------------------------------- | ----------------------------- | --------- |
| `cms_core_settings_definitions`  | `{ canonicalKey: 1 }`         | core-pack |
| `cms_core_settings_values`       | `{ canonicalKey: 1 }`         | core-pack |
| `cms_core_settings_secrets`      | `{ canonicalKey: 1 }`         | core-pack |
| `cms_core_settings_audit_events` | `{ canonicalKey: 1, at: -1 }` | core-pack |

Index secondari:

| Collection                       | Index                          | Motivo            |
| -------------------------------- | ------------------------------ | ----------------- |
| `cms_core_settings_definitions`  | `{ ownerPluginId: 1 }`         | lookup per plugin |
| `cms_core_settings_values`       | `{ ownerPluginId: 1 }`         | lookup per plugin |
| `cms_core_settings_secrets`      | `{ ownerPluginId: 1 }`         | lookup per plugin |
| `cms_core_settings_audit_events` | `{ actorType: 1, actorId: 1 }` | lookup per attore |

### Canonical key

Formato:

```
<ownerPluginId>.<namespace>.<key>
```

Esempi:

```
core-pack.site.locale
core-pack.security.sessionTtl
commerce.payments.stripeSecret
```

### Encryption

I secret vengono cifrati con AES-256-GCM.

Ogni secret document contiene:

- `ciphertext`: valore cifrato
- `iv`: vettore di inizializzazione
- `authTag`: tag di autenticazione
- `keyVersion`: versione della chiave usata per cifrare

La rotazione della chiave produce un nuovo ciphertext con `keyVersion`
aggiornata. I vecchi valori rimangono decifrabili fintanto che la chiave
precedente non viene rimossa.

## Security e permission

### Classi di visibilita

| Visibilita  | Lettura valore       | Scrittura | Uso previsto                                  |
| ----------- | -------------------- | --------- | --------------------------------------------- |
| `public`    | admin, plugin        | owner     | site name, locale, feature flag non sensibili |
| `protected` | admin, owner, policy | owner     | config condivisa tra plugin, limiti, integraz |
| `secret`    | solo owner/policy    | owner     | API key, webhook secret, OAuth secret, token  |

### Regole

1. Solo l'owner puo scrivere una voce salvo delega esplicita.
2. Solo l'owner o una policy esplicita puo fare reveal di un secret.
3. Un plugin non puo leggere configurazioni `protected` o `secret` di altri
   plugin senza capability/policy.
4. Le chiamate plugin-to-core per reveal o scrittura sensibile devono essere
   signed.
5. Ogni reveal, write, rotation e failed access genera audit.
6. Il backoffice mostra metadata e valore mascherato. Non diventa owner
   implicito dei secret.

## Eventi

| Evento                          | Visibility | Delivery | Quando                    |
| ------------------------------- | ---------- | -------- | ------------------------- |
| `core.settings.defined`         | `audit`    | `sync`   | nuova definizione         |
| `core.settings.value.set`       | `audit`    | `sync`   | valore aggiornato         |
| `core.settings.secret.revealed` | `audit`    | `sync`   | reveal secret             |
| `core.settings.secret.rotated`  | `audit`    | `sync`   | rotazione secret          |
| `core.settings.access_denied`   | `audit`    | `sync`   | tentativo non autorizzato |

Payload comune:

```ts
export interface SettingsAuditEventPayload {
  canonicalKey: string;
  ownerPluginId: string;
  actorType: "admin" | "plugin";
  actorId: string;
  timestamp: string;
}
```

## Errori

| Code                            | HTTP | Quando                       |
| ------------------------------- | ---- | ---------------------------- |
| `settings_definition_invalid`   | 400  | definizione non valida       |
| `settings_key_not_found`        | 404  | canonical key inesistente    |
| `settings_access_denied`        | 403  | attore non autorizzato       |
| `settings_secret_required`      | 400  | valore secret mancante       |
| `settings_secret_reveal_denied` | 403  | reveal non autorizzato       |
| `settings_unsupported_type`     | 400  | type non supportato          |
| `settings_namespace_collision`  | 409  | canonical key gia registrata |

## Lifecycle

1. Un plugin dichiara `settings` nel manifest.
2. Il kernel valida namespace e collisioni.
3. Al caricamento del plugin, un lifecycle hook invoca il security provisioner.
4. `core-pack` materializza le definizioni nel registry (upsert idempotente).
5. Valori di default vengono scritti in `cms_core_settings_values`.
6. Alla rimozione del plugin, definizioni e valori vengono marcati come
   `orphaned`, non cancellati fisicamente.
7. I secret orphaned vengono conservati fino a retention policy esplicita.

## Compatibilita e versioning

- `canonicalKey` e immutabile dopo la prima creazione.
- Rename richiede alias o migrazione esplicita.
- `schema` puo evolvere solo in modo compatibile (aggiunta campi opzionali).
- Cambi breaking richiedono version bump del plugin.
- I secret cifrati con chiave precedente restano decifrabili fino a rotazione.

## Acceptance criteria

- Esistono collezioni per definizioni, valori, secret e audit.
- Il `SettingsRegistry` contract permette define, get, set, reveal e rotate.
- Le tre classi di visibilita sono operative e rispettate.
- Reveal/rotate richiedono owner o policy esplicita.
- Il backoffice puo leggere metadata e valore mascherato ma non il valore in
  chiaro dei secret.
- Ogni operazione produce un audit event.
- La canonical key segue il formato `<owner>.<namespace>.<key>`.

## Out of scope

- KMS/Vault provider obbligatorio nella prima implementazione
- UI completa di editing settings per tutti i plugin
- sincronizzazione multi-istanza avanzata
- gestione tenant avanzata
- encryption con chiave per-deployment esterna nella prima release

## Gap rispetto al codice attuale

- `core-pack` possede gia servizi settings con definizioni, valori e secret.
- Il codice attuale usa `core-pack` come owner del registry; la separazione
  concettuale settings -> configuration registry e parziale.
- Non esiste ancora un `SettingsRegistry` contract unificato nel kernel. Il
  servizio e interno a core-pack.
- La signed auth plugin-to-core esiste ma non e formalizzata come contratto
  pubblico.
- Gli audit events settings esistono in forma diagnostica ma non sono ancora
  eventi di piattaforma pubblicati sull'event bus.
