# Installation e bootstrap core

## Stato

- Milestone: `M4.0 - Core Platform Specifications`
- Stato: `draft`
- Scope: low-level specification
- Ultimo aggiornamento: `2026-05-22`

## Decisione

Il bootstrap crea una baseline CMS sicura e idempotente: install state, admin
user, ruoli, permission, settings baseline, API keys iniziali se richieste.

## Responsabilita

| Area              | Owner          | Responsabilita                  |
| ----------------- | -------------- | ------------------------------- |
| Install state     | `core-pack`    | Stato installazione             |
| Admin user        | `core-pack`    | Primo utente amministratore     |
| Baseline security | `core-pack`    | ruoli/permission default        |
| Runtime bootstrap | `kernel`       | start app e plugin provisioning |
| UI bootstrap      | `admin-kernel` | pagina installazione            |

## Modello dati

```ts
export interface InstallationStateDocument {
  id: "default";
  installed: boolean;
  installedAt?: Date;
  installedByUserId?: string;
  corePackVersion: string;
  schemaVersion: number;
  updatedAt: Date;
}
```

## Contratti TypeScript target

```ts
export interface InstallationService {
  getState(): Promise<InstallationState>;
  install(input: InstallCmsInput): Promise<InstallationResult>;
}

export interface InstallCmsInput {
  adminEmail: string;
  adminPassword: string;
  displayName: string;
  siteName?: string;
  locale?: string;
  timezone?: string;
}
```

## API HTTP target

| Method | Path                     | Auth                  |
| ------ | ------------------------ | --------------------- |
| `GET`  | `/v1/installation/state` | none                  |
| `POST` | `/v1/installation`       | none if not installed |

`POST /v1/installation` deve rifiutare richieste se `installed = true`.

## DTO request/response

```ts
export interface InstallationStateDto {
  installed: boolean;
  installedAt?: string;
  corePackVersion: string;
}

export interface InstallCmsRequestDto {
  adminEmail: string;
  adminPassword: string;
  displayName: string;
  siteName?: string;
  locale?: string;
  timezone?: string;
}
```

## Storage Mongo

Collections:

- `cms_core_installation_state`
- `cms_core_local_credentials`
- users/roles/settings collections del `core-pack`

Indici:

| Collection                    | Index           | Unique |
| ----------------------------- | --------------- | ------ |
| `cms_core_installation_state` | `{ id: 1 }`     | yes    |
| `cms_core_local_credentials`  | `{ userId: 1 }` | yes    |

## Security e permission

### Prima dell'installazione

- `GET /v1/installation/state` e pubblico (nessuna auth richiesta).
- `POST /v1/installation` e pubblico solo se `installed = false`.

### Dopo installazione

- `POST /v1/installation` disabilitato (restituisce 409).
- `GET /v1/installation/state` rimane pubblico (solo stato, nessun dato sensibile).
- Bootstrap admin ha ruolo `admin` con tutte le permission core.
- Password salvata solo come hash (bcrypt o Argon2).
- Le API key (se generate) sono mostrate una sola volta al termine dell'installazione.

### Regole

1. L'installazione e idempotente per step interni ma l'endpoint mutativo non e ripetibile.
2. Non e possibile re-installare senza reset esplicito del database.
3. Il primo utente admin non puo essere eliminato via API.
4. Ogni step dell'installazione produce audit.

### Audit

Ogni fase dell'installazione produce evento audit:

- `{ phase: "admin_user" | "baseline_roles" | "baseline_settings" | "complete", success: boolean, error?: string }`

## Eventi

### Eventi di installazione

| Nome canonico          | Owner     | Visibility | Delivery | Payload                                    | Quando                   |
| ---------------------- | --------- | ---------- | -------- | ------------------------------------------ | ------------------------ |
| `core.install.started` | core-pack | `audit`    | `sync`   | `{ corePackVersion, schemaVersion }`       | installazione iniziata   |
| `core.install.done`    | core-pack | `audit`    | `sync`   | `{ userId, corePackVersion, installedAt }` | installazione completata |
| `core.install.failed`  | core-pack | `audit`    | `sync`   | `{ phase, error }`                         | installazione fallita    |

### Delivery e retry

- Tutti `sync` (in-process).
- Nessun retry automatico: se l'installazione fallisce, il sistema resta in stato `not installed` e puo ritentare.
- Idempotency: ogni step interno e idempotente (upsert). L'endpoint POST /v1/installation non e idempotente per design.
- Audit policy: tutti gli eventi di installazione sono persistiti in `cms_core_audit_events`.

## Errori

| Code                         | HTTP | Quando                   |
| ---------------------------- | ---- | ------------------------ |
| `installation_already_done`  | 409  | installazione gia chiusa |
| `installation_input_invalid` | 400  | input non valido         |
| `installation_failed`        | 500  | bootstrap fallito        |

## Lifecycle

1. verifica non installato
2. crea admin user
3. crea roles/permission baseline
4. crea settings baseline
5. marca installed
6. audit

Operazione idempotente per step interni, ma endpoint mutativo non ripetibile una
volta marcato installed.

## Compatibilita e versioning

- `schemaVersion` permette evoluzione bootstrap. Migrazioni successive non devono riaprire installazione.
- Il `InstallCmsInput` DTO puo ricevere nuovi campi opzionali senza breaking.
- Rimuovere campi obbligatori dall'input di installazione e breaking.
- La struttura `InstallationStateDocument` puo evolvere con nuovi campi.
- I baseline roles/permissions creati durante l'installazione possono essere estesi in versioni future.

## Acceptance criteria

- stato installazione chiaro
- endpoint e DTO definiti
- bootstrap baseline definito
- sicurezza primo setup esplicita

## Out of scope

- wizard multi-step complesso
- recovery password admin
- tenant bootstrap

## Gap rispetto al codice attuale

- Modulo installation esiste.
- Va allineato con configuration registry e audit event bus.
