# Mongo storage core

## Stato

- Milestone: `M4.0 - Core Platform Specifications`
- Stato: `draft`
- Scope: low-level specification
- Ultimo aggiornamento: `2026-05-22`

## Decisione

Trinacria CMS e Mongo-first. Il kernel possiede il Mongo storage core e governa
namespace, entity registry, repository conventions, indici e isolation rules.

Non e obiettivo astrarre database multipli nella prima architettura.

Decisione chiusa: il nome `DbAdapter` puo restare nel codice come compat layer
temporaneo, ma la specifica e la semantica pubblica della piattaforma sono
Mongo-first. Nuove API non devono promettere portabilita SQL/NoSQL generica.

## Responsabilita

| Area              | Owner        | Responsabilita                      |
| ----------------- | ------------ | ----------------------------------- |
| Mongo connection  | `kernel`     | handle condiviso e health           |
| Entity registry   | `kernel`     | registrazione entity plugin         |
| Namespace policy  | `kernel`     | collection naming e ownership       |
| Index sync        | `kernel`     | materializzazione indici dichiarati |
| Repository domain | plugin owner | query e logica dominio              |
| Core repositories | `core-pack`  | utenti, ruoli, settings             |

## Modello dati

Ogni entity plugin deve dichiarare:

```ts
export interface MongoEntityDefinition {
  pluginId: string;
  name: string;
  collectionName: string;
  schemaVersion: number;
  documentSchema: unknown;
  indexes: MongoIndexDefinition[];
  timestamps: boolean;
}
```

Documento minimo:

```ts
export interface CmsMongoDocument {
  _id: unknown;
  id: string;
  pluginId: string;
  schemaVersion: number;
  createdAt: Date;
  updatedAt: Date;
}
```

## Contratti TypeScript target

```ts
export interface MongoStorageCore {
  registerEntity(definition: MongoEntityDefinition): Promise<void>;
  repository<TDocument>(pluginId: string, entityName: string): MongoRepository<TDocument>;
  ensureIndexes(pluginId?: string): Promise<void>;
  healthCheck(): Promise<{ ok: true } | { ok: false; reason: string }>;
}

export interface MongoRepository<TDocument> {
  findOne(query: MongoQuery<TDocument>): Promise<TDocument | null>;
  findMany(query: MongoQuery<TDocument>): Promise<TDocument[]>;
  insertOne(input: Partial<TDocument>): Promise<TDocument>;
  updateOne(query: MongoQuery<TDocument>, patch: Partial<TDocument>): Promise<TDocument | null>;
  deleteOne(query: MongoQuery<TDocument>): Promise<boolean>;
}
```

## API HTTP target

Nessuna API pubblica diretta per repository generici nella prima fase.

Endpoint operativi:

| Method | Path                          | Permission                  |
| ------ | ----------------------------- | --------------------------- |
| `GET`  | `/v1/system/entities`         | `core-pack:plugins:read`    |
| `POST` | `/v1/system/entities/indexes` | `core-pack:plugins:operate` |

## DTO request/response

```ts
export interface EntityRuntimeDto {
  pluginId: string;
  name: string;
  collectionName: string;
  schemaVersion: number;
  indexes: string[];
  status: "registered" | "indexed" | "failed";
}
```

## Storage Mongo

Collection registry:

```text
cms_kernel_entity_registry
```

Indici:

| Name                   | Keys                       | Unique |
| ---------------------- | -------------------------- | ------ |
| `plugin_entity_unique` | `{ pluginId: 1, name: 1 }` | yes    |
| `collection_unique`    | `{ collectionName: 1 }`    | yes    |

Collection naming:

```text
cms_<pluginId>_<entityName>
```

Normalizzazione:

- lowercase
- slash sostituito da `_`
- caratteri fuori whitelist rifiutati

## Security e permission

### Accesso

| Risorsa                 | Chi puo leggere               | Chi puo scrivere       |
| ----------------------- | ----------------------------- | ---------------------- |
| Entity registry         | kernel, plugin owner          | kernel (registrazione) |
| Repository plugin       | solo plugin owner             | solo plugin owner      |
| Repository cross-plugin | solo con capability esplicita | solo con capability    |
| Indici                  | kernel                        | kernel (sync)          |

### Regole

1. Un plugin puo accedere solo a repository nel proprio namespace salvo capability
   esplicita di cross-plugin integration.
2. Il backoffice non accede direttamente al repository generico: passa da API
   dominio o resource contract.
3. L'entity registry e di proprieta del kernel. I plugin non possono modificare
   registrazioni altrui.
4. La sincronizzazione indici e operazione protetta che richiede permission
   `core-pack:plugins:operate`.
5. Ogni registrazione entity e index sync produce audit.

### Audit

- Registrazione entity: `{ pluginId, entityName, collectionName }`
- Index sync: `{ pluginId, entityName, indexes, success }`
- Accesso cross-plugin negato: `{ pluginId, targetPluginId, entityName }`

## Eventi

### Eventi di storage

| Nome canonico                       | Owner  | Visibility  | Delivery | Payload                                    | Quando                      |
| ----------------------------------- | ------ | ----------- | -------- | ------------------------------------------ | --------------------------- |
| `core.storage.entity.registered`    | kernel | `audit`     | `sync`   | `{ pluginId, entityName, collectionName }` | registrazione entity        |
| `core.storage.index.synced`         | kernel | `audit`     | `sync`   | `{ pluginId, entityName, indexes, ok }`    | indici materializzati       |
| `core.storage.health.failed`        | kernel | `protected` | `sync`   | `{ reason, details }`                      | health KO                   |
| `core.storage.repository.forbidden` | kernel | `audit`     | `sync`   | `{ pluginId, targetPluginId, entityName }` | accesso cross-plugin negato |

### Delivery e retry

- Tutti `sync` (in-process).
- Nessun retry automatico.
- Idempotency: la registrazione entity e gia idempotente per design (upsert su unique index).
- Audit policy: eventi `audit` persistiti in `cms_core_audit_events`. Eventi `protected` solo in-memory.

## Errori

| Code                         | HTTP | Quando                      |
| ---------------------------- | ---- | --------------------------- |
| `mongo_entity_invalid`       | 400  | definition invalida         |
| `mongo_namespace_collision`  | 409  | collection gia assegnata    |
| `mongo_index_sync_failed`    | 500  | creazione indici fallita    |
| `mongo_repository_forbidden` | 403  | accesso cross-plugin negato |

## Lifecycle

1. manifest validation
2. namespace validation
3. entity registration
4. index sync
5. repository availability

Se index sync fallisce, il plugin puo entrare in `failed` o `degraded` secondo
policy runtime da definire.

## Compatibilita e versioning

- `schemaVersion` aumenta a ogni evoluzione incompatibile. Migration runner e fuori
  scope iniziale, ma il campo deve esistere dal primo schema.
- Aggiungere campi opzionali al documento non e breaking.
- Rimuovere o rinominare campi richiede migration e `schemaVersion` bump.
- Il nome collection (`cms_<pluginId>_<entityName>`) e immutabile dopo la registrazione.
- Gli indici possono essere aggiunti senza breaking. Rimuovere un indice esistente e potenzialmente breaking per query in produzione.

## Acceptance criteria

- collection naming e ownership sono chiari
- entity registry ha schema e indici
- repository target e Mongo-first
- multi-database e fuori scope
- security cross-plugin e esplicita

## Out of scope

- SQL/Postgres/MySQL
- migration runner completo
- query builder universale
- transazioni distribuite

## Gap rispetto al codice attuale

- Esistono `DbAdapter`, `MongoDbAdapter` ed `EntityRegistry`.
- `DbAdapter` resta compatibilita interna da rinominare o documentare come
  Mongo-first durante l'implementazione.
- I commenti storage-agnostic del contratto vanno rimossi o riallineati a
  Mongo-first.
- Manca entity declaration nel manifest plugin.
