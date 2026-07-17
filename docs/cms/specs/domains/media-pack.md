# Media Pack

## Stato

- Milestone: prossima milestone dominio, dopo `M6`
- Stato: `production-candidate-v0`
- Scope: specifica low-level del primo plugin dominio di media
- Ultimo aggiornamento: `2026-07-17`

## 1. Decisione

`@trinacria-cms/media-pack` e un plugin dominio separato. Possiede asset,
storage dei byte, directory virtuali, ACL e policy di upload. Non entra in
`core-pack` e non appartiene a `editorial-pack`.

`editorial-pack` dipendera da `media-pack` come dipendenza runtime richiesta e
usera solo il suo contratto pubblico `MEDIA_ASSETS_SERVICE_TOKEN`. Non legge
collection Mongo del media pack e non costruisce URL di storage.

Lo storage e sostituibile. Il media pack conserva metadata provider-agnostic;
ogni provider implementa una porta interna. La v0 supporta `local-disk` e
`s3-compatible`. Provider custom diventano installabili in seguito senza
cambiare il modello asset.

Decisioni chiuse per v0:

- i byte non sono memorizzati in Mongo;
- l'identita dell'asset resta stabile; una sostituzione di contenuto puo
  aggiornare `providerId` e `storageKey` senza cambiare `assetId`;
- le directory sono virtuali, non cartelle/prefissi fisici;
- il provider predefinito e unico per installazione, ma il modello permette
  provider diversi per asset e una futura policy per directory;
- gli asset sono privati per default;
- un asset e usabile solo nello stato `ready`.

## 2. Responsabilita

| Area                           | Owner                       | Responsabilita                                     |
| ------------------------------ | --------------------------- | -------------------------------------------------- |
| Lifecycle, manifest, namespace | `kernel`                    | Caricamento plugin e dipendenze                    |
| Settings e secret              | `core-pack`                 | Configurazione provider, limiti, cifratura e audit |
| Asset e directory              | `media-pack`                | Modello dominio, repository, ACL e policy          |
| Byte storage                   | provider del media pack     | Scrittura, lettura controllata, delete e health    |
| Picker e gestione asset        | media pack + `admin-kernel` | UI admin e SDK                                     |
| Riferimenti nei contenuti      | `editorial-pack`            | `assetId`, alt text, caption, crop e placement     |

`media-pack` non e owner di post, blocchi editoriali, SEO o pubblicazione.
`editorial-pack` non e owner del MIME type, storage key o visibilita effettiva
dell'asset.

## 3. Modello dati

### Asset

```ts
export type MediaAssetStatus =
  | "uploading"
  | "processing"
  | "ready"
  | "rejected"
  | "quarantined"
  | "deleted";

export type MediaAssetVisibility = "private" | "restricted" | "public";

export interface MediaAsset {
  id: string;
  directoryId: string | null;
  ownerUserId: string;
  uploadedByUserId: string;
  displayName: string;
  originalFilename: string;
  mimeType: string;
  byteSize: number;
  checksum: { algorithm: "sha256"; value: string };
  width?: number;
  height?: number;
  durationMs?: number;
  providerId: string;
  storageKey: string;
  status: MediaAssetStatus;
  visibility: MediaAssetVisibility;
  aclVersion: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}
```

Invarianti:

- `id`, `providerId`, `storageKey` e checksum sono presenti per un asset
  completato;
- `mimeType` deriva dalla validazione del contenuto, non dal filename;
- `ready` richiede oggetto presente, limiti validi e metadata estratti quando
  applicabili;
- `deleted` non viene restituito dalle API normali e non e usabile;
- `public` non espone direttamente bucket o disco: il provider genera URL
  temporanea o URL CDN governata dal media pack.

### Directory e ACL

```ts
export interface MediaDirectory {
  id: string;
  parentId: string | null;
  name: string;
  ownerUserId: string;
  visibility: MediaAssetVisibility;
  inheritAcl: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export type MediaPrincipal =
  | { type: "user"; id: string }
  | { type: "role"; id: string }
  | { type: "plugin"; id: string };

export type MediaAclAction = "read" | "write" | "manage" | "share";

export interface MediaAclEntry {
  id: string;
  targetType: "asset" | "directory";
  targetId: string;
  principal: MediaPrincipal;
  actions: readonly MediaAclAction[];
  createdByUserId: string;
  expiresAt?: string;
  createdAt: string;
}
```

Un asset eredita l'ACL della directory quando `inheritAcl` e attivo, salvo un
override asset-specifico. La v0 supporta grant positivi; deny espliciti e gruppi
arbitrari sono fuori scope.

## 4. Contratti TypeScript target

Package owner: `@trinacria-cms/media-pack`.

### Storage provider port

```ts
export type MediaStorageProviderKind = "local-disk" | "s3-compatible" | "custom";

export interface MediaStorageProvider {
  readonly id: string;
  readonly kind: MediaStorageProviderKind;
  health(): Promise<{ status: "ok" | "degraded" | "down" }>;
  createUpload(input: CreateStorageUploadInput): Promise<CreateStorageUploadResult>;
  commitUpload(input: CommitStorageUploadInput): Promise<StoredObject>;
  createReadUrl(input: CreateStorageReadUrlInput): Promise<{ url: string; expiresAt: string }>;
  deleteObject(input: { storageKey: string }): Promise<void>;
}

export interface StoredObject {
  storageKey: string;
  byteSize: number;
  checksum?: { algorithm: "sha256"; value: string };
}
```

Il provider non decide permission, directory, visibilita o limiti CMS. Riceve
uno `storageKey` opaco generato dal media pack e non espone credenziali
permanenti al browser. `s3-compatible` puo restituire una URL presigned;
`local-disk` usa lo stesso flusso tramite endpoint del media pack.

### Servizio pubblico per altri plugin

```ts
export interface MediaAssetReference {
  assetId: string;
}

export interface MediaAssetUseResult {
  asset: Pick<MediaAsset, "id" | "mimeType" | "status" | "visibility">;
  usable: boolean;
  reason?: "not_found" | "not_ready" | "deleted" | "access_denied" | "not_publishable";
}

export interface MediaAssetsService {
  validateUse(input: {
    references: readonly MediaAssetReference[];
    actor: { userId?: string; pluginId?: string };
    purpose: "authoring" | "publication" | "delivery";
  }): Promise<readonly MediaAssetUseResult[]>;
}
```

L'implementazione esporta un token di capability tipizzato. Il contratto e
l'unica integrazione sincrona permessa a `editorial-pack`; gli eventi servono
alla riconciliazione asincrona.

### Manifest minimo

```ts
definePluginManifest({
  id: "media-pack",
  version: "0.1.0",
  requiresCore: "^0.1.0",
  dependencies: [{ pluginId: "core-pack", versionRange: "^0.1.0" }],
  capabilities: ["media.assets", "media.directories", "media.storage"]
});
```

`editorial-pack` dichiarera anche `{ pluginId: "media-pack", versionRange:
"^0.1.0" }` come dipendenza non opzionale.

## 5. API HTTP target

Tutte le API sono owner `media-pack`, usano admin bearer e envelope API
standard. Gli endpoint di storage non restituiscono credenziali permanenti.

| Metodo   | Path                                       | Permission                      | Scopo                                   |
| -------- | ------------------------------------------ | ------------------------------- | --------------------------------------- |
| `GET`    | `/v1/media/assets`                         | `media-pack:assets:read`        | Lista filtrabile e picker               |
| `POST`   | `/v1/media/uploads`                        | `media-pack:assets:upload`      | Avvia upload sicuro                     |
| `PUT`    | `/v1/media/uploads/{id}/content`           | `media-pack:assets:upload`      | Stream proxy per provider locale/custom |
| `POST`   | `/v1/media/uploads/{id}/complete`          | `media-pack:assets:upload`      | Completa e valida upload                |
| `GET`    | `/v1/media/assets/{id}`                    | read + ACL                      | Dettaglio metadata                      |
| `PATCH`  | `/v1/media/assets/{id}`                    | update + ACL write              | Nome, directory, visibilita             |
| `DELETE` | `/v1/media/assets/{id}`                    | delete + ACL manage             | Soft delete                             |
| `POST`   | `/v1/media/assets/{id}/access-url`         | read + ACL                      | URL temporanea                          |
| `GET`    | `/v1/media/directories`                    | `media-pack:assets:read`        | Directory visibili                      |
| `POST`   | `/v1/media/directories`                    | `media-pack:directories:manage` | Crea directory                          |
| `PATCH`  | `/v1/media/directories/{id}`               | directories manage + ACL manage | Rinomina/sposta/policy                  |
| `DELETE` | `/v1/media/directories/{id}`               | directories manage + ACL manage | Elimina directory vuota                 |
| `GET`    | `/v1/media/{targetType}/{targetId}/shares` | shares manage + ACL share       | Legge ACL                               |
| `PUT`    | `/v1/media/{targetType}/{targetId}/shares` | shares manage + ACL share       | Sostituisce ACL                         |
| `GET`    | `/v1/media/providers/health`               | `media-pack:settings:manage`    | Stato provider senza secret             |

L'upload S3-compatible restituisce una URL presigned e richiede
`checksumSha256` esadecimale nel preflight; la response contiene gli header
firmati da inviare. Al completion il server confronta checksum, dimensione e
firma del contenuto letta dallo staging. Upload locale e provider custom usano
il proxy del CMS e ricevono la stessa validazione streaming.

Per il browser, il bucket S3 deve autorizzare `PUT` dal dominio del backoffice
e gli header `content-type` e `x-amz-checksum-sha256`; il bucket resta privato
perché le letture passano da URL firmate a scadenza.
Non esiste una route pubblica per byte privati senza autorizzazione.

## 6. DTO request/response

```ts
export interface CreateMediaUploadRequestDto {
  filename: string;
  declaredMimeType?: string;
  byteSize: number;
  directoryId?: string;
}

export interface CreateMediaUploadResponseDto {
  uploadId: string;
  providerId: string;
  method: "proxy" | "presigned";
  uploadUrl: string;
  expiresAt: string;
  requiredHeaders?: Record<string, string>;
}

export interface CompleteMediaUploadRequestDto {
  storageUploadToken?: string;
}

export interface UpdateMediaAssetRequestDto {
  displayName?: string;
  directoryId?: string | null;
  visibility?: MediaAssetVisibility;
}

export interface ReplaceMediaAclRequestDto {
  grants: readonly Array<{
    principal: MediaPrincipal;
    actions: readonly MediaAclAction[];
    expiresAt?: string;
  }>;
}
```

`byteSize` e `declaredMimeType` sono preflight, non dati fidati. A completion il
server verifica dimensione, checksum e contenuto prima di emettere un asset
`ready`.

## 7. Storage Mongo

Tutte le collection usano il namespace fisico del plugin:
`plugin_media_pack__<entity>`.

| Collection                       | Indici principali                                                                                                                             | Note                                                |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `plugin_media_pack__assets`      | `id` unique; `{ directoryId, status, updatedAt }`; `{ status, deletedAt }`; `{ ownerUserId, createdAt }`; `{ providerId, storageKey }` unique | Nessun byte binario                                 |
| `plugin_media_pack__directories` | `id` unique; `{ parentId, name }` unique; il tombstone riceve un nome tecnico                                                                 | Directory virtuali                                  |
| `plugin_media_pack__acl_entries` | `{ targetType, targetId, principal.type, principal.id }` unique                                                                               | Grant e scadenze                                    |
| `plugin_media_pack__uploads`     | `id` unique; `{ expiresAt }`; `{ status, updatedAt }`; `{ ownerUserId, status, createdAt }`                                                   | Sessioni effimere eliminate dal cleanup pianificato |

I record conservano `createdAt` e `updatedAt`; ownership e attore sono espressi
con `ownerUserId`, `uploadedByUserId` e `createdByUserId` per gli ACL. L'upload
incompleto scade dopo quindici minuti: il cleanup elimina lo staging object e
rimuove i record terminali dopo ventiquattro ore.

## 8. Settings

Settings del media pack, tutte owner `media-pack`:

| Chiave                                    | Visibilita | Scopo                    |
| ----------------------------------------- | ---------- | ------------------------ |
| `media-pack:storage:default_provider_id`  | protected  | Provider attivo          |
| `media-pack:storage:local_root`           | protected  | Root del provider locale |
| `media-pack:storage:s3_endpoint`          | protected  | Endpoint S3-compatible   |
| `media-pack:storage:s3_bucket`            | protected  | Bucket                   |
| `media-pack:storage:s3_region`            | protected  | Region S3-compatible     |
| `media-pack:storage:s3_access_key`        | secret     | Credenziale S3           |
| `media-pack:storage:s3_secret_key`        | secret     | Credenziale S3           |
| `media-pack:limits:max_file_bytes`        | protected  | Dimensione massima file  |
| `media-pack:limits:allowed_mime_types`    | protected  | Allowlist MIME           |
| `media-pack:limits:max_image_pixels`      | protected  | Limite immagine          |
| `media-pack:retention:deleted_asset_days` | protected  | Retention cestino        |

La v0 applica limiti globali. Quota per utente/ruolo e provider per directory
restano estensioni compatibili con il modello.

### Operativita

All'avvio il plugin elimina subito le sessioni scadute e avvia un cleanup
best-effort ogni cinque minuti; l'operazione e idempotente e rimuove anche lo
staging object. Lo stesso processo elimina asset e byte dopo
`retention:deleted_asset_days`, mantenendo il tombstone quando lo storage non e
raggiungibile per poter ritentare. `GET /v1/media/providers/health` restituisce solo id, kind,
selezione e stato (`ok`, `degraded`, `down`), mai endpoint o credenziali.

## 9. Security e permission

| Permission                      | Scopo                                        |
| ------------------------------- | -------------------------------------------- |
| `media-pack:assets:read`        | Lista, metadata e URL se ACL consente        |
| `media-pack:assets:upload`      | Creazione e completion upload                |
| `media-pack:assets:update`      | Metadata, directory e visibilita autorizzati |
| `media-pack:assets:delete`      | Soft delete autorizzato                      |
| `media-pack:directories:manage` | Gestione directory                           |
| `media-pack:shares:manage`      | ACL e condivisione                           |
| `media-pack:settings:manage`    | Limiti, provider e policy                    |

Le permission sono il gate grossolano. Il service applica poi ACL, ownership,
scadenza grant e stato asset. Un utente con `assets:read` non legge ogni asset
privato automaticamente.

| Ruolo           | Grant media proposto                                    |
| --------------- | ------------------------------------------------------- |
| `author`        | read, upload e update sui propri asset                  |
| `editor`        | read, upload, update e uso degli asset consentiti       |
| `media-manager` | tutte le permission media eccetto settings, se separato |
| `admin`         | tutte                                                   |

Il browser non e autorita: nasconde azioni non consentite, ma backend e ACL
decidono. Access key e secret S3 non entrano in DTO di risposta o log/audit.

### Uso da altri plugin

`editorial-pack` e identificato come plugin/service principal. `validateUse`
verifica il contesto utente e l'autorizzazione del plugin, senza concedere
lettura del repository media. Questo impedisce che un post pubblico renda
pubblico un asset privato per errore.

## 10. Eventi

| Evento                            | Visibility | Delivery | Payload minimo                        | Quando                        |
| --------------------------------- | ---------- | -------- | ------------------------------------- | ----------------------------- |
| `media-pack:asset-ready`          | protected  | async    | `{ assetId, mimeType, visibility }`   | Validazione conclusa          |
| `media-pack:asset-rejected`       | protected  | async    | `{ assetId, reason }`                 | Validazione/scanning fallisce |
| `media-pack:asset-deleted`        | protected  | async    | `{ assetId, deletedAt }`              | Soft delete                   |
| `media-pack:asset-access-changed` | protected  | async    | `{ assetId, visibility, aclVersion }` | ACL/visibility cambia         |
| `media-pack:asset-uploaded`       | audit      | sync     | `{ assetId, actorId, providerId }`    | Upload completato             |

Gli handler editoriali devono essere idempotenti. L'evento informa di una
variazione; la validazione sincrona resta la fonte di verita prima del publish.

## 11. Errori

| Code                             | HTTP | Quando                              |
| -------------------------------- | ---- | ----------------------------------- |
| `media_asset_not_found`          | 404  | Asset assente o non visibile        |
| `media_directory_not_found`      | 404  | Directory assente/non visibile      |
| `media_upload_expired`           | 410  | Completion dopo scadenza            |
| `media_file_too_large`           | 413  | Limite superato                     |
| `media_mime_type_denied`         | 415  | MIME rilevato non consentito        |
| `media_content_invalid`          | 422  | Metadata/contenuto incoerenti       |
| `media_asset_not_ready`          | 409  | Asset non usabile                   |
| `media_asset_not_publishable`    | 409  | Asset non idoneo al pubblico        |
| `media_access_denied`            | 403  | Permission o ACL insufficienti      |
| `media_acl_invalid`              | 422  | Grant/principal/scadenza non validi |
| `media_provider_unavailable`     | 503  | Provider non disponibile            |
| `media_storage_integrity_failed` | 502  | Oggetto/checksum non verificabile   |
| `media_directory_not_empty`      | 409  | Delete directory con figli/asset    |

## 12. Lifecycle

Al load il plugin:

1. valida settings e provider configurato;
2. registra entity e indici;
3. registra `MediaAssetsService` e provider registry;
4. provisiona permission, grant, settings, eventi e contribution admin;
5. esegue health check non distruttivo e segnala `degraded` se necessario.

Il runtime non puo unloadare `media-pack` quando `editorial-pack` e caricato
come dipendenza richiesta. Unload/disable non cancellano asset o setting; il
deprovisioning rimuove solo contribution runtime e record governati dal
lifecycle.

## 13. Compatibilita e versioning

- La versione iniziale e `0.1.0`; cambi incompatibili nei DTO o in
  `MediaAssetsService` richiedono major version.
- Ogni asset registra `providerId` e non dipende dal provider default corrente.
- Migrazione tra provider e fuori v0: in futuro copia, verifica checksum e
  aggiorna l'asset in modo auditato.
- `editorial-pack` dichiara una semver range compatibile; il runtime blocca il
  load con versione media incompatibile.

## 14. Acceptance criteria

- Il plugin carica con `core-pack` e registra manifest, entity, settings,
  permission, eventi e admin contribution senza modificare il core.
- `local-disk` e S3-compatible passano lo stesso contract test di upload,
  completion, URL lettura e delete.
- MIME, dimensione o checksum non validi non producono un asset `ready` e non
  lasciano byte orfani oltre la retention di cleanup.
- Directory e ACL filtrano lista, dettaglio e URL lato backend.
- Un asset privato non e usabile da un contenuto pubblico senza policy esplicita.
- `editorial-pack` valida riferimenti in modo tipizzato senza leggere Mongo
  del media pack.
- OpenAPI, SDK, unit test, integration Mongo e smoke di entrambi i provider
  sono verdi.

## 15. Out of scope v0

- transcoding video/audio;
- immagini responsive, crop server-side e trasformazioni persistenti;
- AI tagging, OCR e ricerca semantica;
- deduplicazione globale e garbage collection tramite reference graph;
- deny ACL, gruppi arbitrari e link pubblici permanenti;
- provider per directory e migrazione automatica cross-provider;
- multipart/resumable oltre quanto strettamente richiesto dal provider S3.

## 16. Stato implementazione

Implementato in `@trinacria-cms/media-pack`:

- manifest, entity Mongo namespaced, setting e permission/grant;
- storage locale con staging atomico e URL di lettura firmate e temporanee;
- adapter S3-compatible con staging privato, verifica checksum e URL presigned;
- provider registry estendibile e selezione runtime da settings protetti/secret;
- upload proxy, verifica della dimensione e della firma dei formati JPEG, PNG,
  WebP e PDF, limite reale dei pixel, completion e cleanup delle sessioni;
- asset, directory virtuali senza cicli, ACL ereditate e sostituzione completa
  dei grant con controlli backend sulle destinazioni di upload e spostamento;
- retention e purge idempotente di record, ACL e oggetti dei provider;
- file manager amministrativo, editor testo/CSV, preview immagini e widget;
- OpenAPI e SDK generato per upload, asset, directory, condivisioni e delivery;
- unit test, integrazione Mongo e smoke contract S3-compatible tramite MinIO;
- contribution amministrativa dichiarativa e registrazione nel playground;
- contratto capability tipizzato `MEDIA_ASSETS_SERVICE_TOKEN` per
  `editorial-pack`.

Restano da sviluppare con il futuro `editorial-pack` soltanto il componente UI
picker concreto e il consumer che richiama `validateUse` durante authoring e
pubblicazione. Non richiedono accesso diretto a Mongo o modifiche al media pack.

## Decisioni operative v0

1. La visibilita `public` e l'azione esplicita che rende l'asset utilizzabile in
   pubblicazione; `validateUse` rifiuta asset privati, eliminati o non pronti.
2. Limiti e quota sono globali nella v0; quote per utente o ruolo sono evolutive.
3. `local-disk` e raccomandato per sviluppo, test o deployment single-node con
   volume durevole. Deployment multi-replica devono usare S3-compatible.
4. La cancellazione rende subito la reference non utilizzabile ed emette
   `asset-deleted`; il futuro editorial pack deve bloccare una nuova
   pubblicazione finche la reference non viene sostituita.
5. Multipart e resumable non fanno parte della v0; il provider S3 usa upload
   presigned singolo con checksum SHA-256 obbligatorio.
