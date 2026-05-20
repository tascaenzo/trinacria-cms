# Installation e bootstrap core

## Stato

- Milestone: `M4.0 - Core Platform Specifications`
- Stato: `draft`
- Scope: low-level specification
- Ultimo aggiornamento: `2026-05-20`

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

Prima installazione e pubblica solo se il CMS non e installato.

Dopo installazione:

- endpoint installazione mutativo disabilitato
- bootstrap admin ha ruolo `admin`
- password salvata solo come hash

## Eventi

| Evento                 | Visibility |
| ---------------------- | ---------- |
| `core.install.started` | `audit`    |
| `core.install.done`    | `audit`    |
| `core.install.failed`  | `audit`    |

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

`schemaVersion` permette evoluzione bootstrap. Migrazioni successive non devono
riaprire installazione.

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
