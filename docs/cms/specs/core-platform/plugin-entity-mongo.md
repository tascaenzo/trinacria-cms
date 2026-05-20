# Mongo storage core

## Stato

- Milestone: `M4.0 - Core Platform Specifications`
- Stato: `draft`
- Scope: low-level specification
- Ultimo aggiornamento: `2026-05-20`

## Decisione

Trinacria CMS e Mongo-first. Il kernel possiede il Mongo storage core e governa
namespace, entity registry, repository conventions, indici e isolation rules.

Non e obiettivo astrarre database multipli nella prima architettura.

## Responsabilita

| Area              | Owner        | Responsabilita                      |
| ----------------- | ------------ | ----------------------------------- |
| Mongo connection  | `kernel`     | handle condiviso e health           |
| Entity registry   | `kernel`     | registrazione entity plugin         |
| Namespace policy  | `kernel`     | collection naming e ownership       |
| Index sync        | `kernel`     | materializzazione indici dichiarati |
| Repository domain | plugin owner | query e logica dominio              |
| Core repositories | `core-pack`  | utenti, ruoli, settings, API keys   |

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

Un plugin puo accedere solo a repository nel proprio namespace salvo capability
esplicita di cross-plugin integration.

Il backoffice non accede direttamente al repository generico: passa da API
dominio o resource contract.

## Eventi

| Evento                           | Visibility  | Quando                |
| -------------------------------- | ----------- | --------------------- |
| `core.storage.entity.registered` | `audit`     | registrazione entity  |
| `core.storage.index.synced`      | `audit`     | indici materializzati |
| `core.storage.health.failed`     | `protected` | health KO             |

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

`schemaVersion` aumenta a ogni evoluzione incompatibile. Migration runner e fuori
scope iniziale, ma il campo deve esistere dal primo schema.

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
- I commenti storage-agnostic del contratto vanno riallineati a Mongo-first.
- Manca entity declaration nel manifest plugin.
