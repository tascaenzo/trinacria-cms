# Installation e bootstrap core

## Stato

- Milestone: `M4.0 - Core Platform Specifications`
- Stato: `draft`
- Scope: low-level specification
- Ultimo aggiornamento: `2026-05-28`

## Decisione

Il bootstrap crea una baseline CMS sicura e idempotente: admin user, ruoli,
permission, settings baseline.

MongoDB deve essere configurato manualmente dall'operatore tramite file `.env`
prima di avviare il wizard di installazione. Se il database non e configurato,
il backoffice mostra una guida per il setup del `.env` e chiede il riavvio.

L'installazione e un flusso in 2 step (Sito + Admin) che invia i dati a
`POST /v1/install/bootstrap`. Il backend presuppone che MongoDB sia gia
raggiungibile (connesso all'avvio via dotenv).

L'app puo avviarsi in **setup mode** (senza MongoDB) se:

- Il file `.env` non esiste
- Le variabili `MONGO_*` non sono configurate
- La connessione MongoDB fallisce all'avvio

In setup mode, solo gli endpoint di installazione sono accessibili.

## Responsabilita

| Area              | Owner          | Responsabilita                  |
| ----------------- | -------------- | ------------------------------- |
| Setup mode        | `kernel`       | Avvio senza MongoDB             |
| Install state     | `core-pack`    | Stato installazione             |
| Admin user        | `core-pack`    | Primo utente amministratore     |
| Baseline security | `core-pack`    | ruoli/permission default        |
| Runtime bootstrap | `kernel`       | start app e plugin provisioning |
| UI bootstrap      | `admin-kernel` | pagina installazione            |
| Guida .env        | `admin-kernel` | Setup `.env` se non configurato |

## Flusso di installazione

### Setup mode (pre-installazione)

```
1. App avviata → tenta connessione MongoDB
2. Se connessione fallisce o .env non configurato:
   a. HTTP server parte comunque in setup mode
   b. Tutti gli endpoint tranne /v1/install/* return 503 (Service Unavailable)
   c. GET /v1/install/status → { installed: false, envFilePresent: false, dbConfigured: false }
3. Se connessione OK ma installed = false:
   a. HTTP server parte normalmente
   b. Wizard di installazione mostrato (2 step: Sito + Admin)
```

### Guida .env (se database non configurato)

```
1. GET /v1/install/status → envFilePresent == false || dbConfigured == false
2. Backoffice mostra InstallationDatabaseGuidePage:
   a. Istruzioni per creare/aggiornare .env
   b. Percorso del file .env evidenziato
   c. "Riavvia l'applicazione dopo aver configurato il file"
3. Operatore configura .env, riavvia l'app
4. Al nuovo avvio, GET /v1/install/status → envFilePresent == true && dbConfigured == true
5. Backoffice mostra InstallationBootstrapPage
```

### Bootstrap completo (POST /v1/install/bootstrap)

```
1. Validazione input
2. Provisioning baseline security (ruoli, permessi)
3. Creazione admin user (firstName, lastName, email)
4. Hashing password e salvataggio credenziali locali
5. Assegnazione ruolo admin
6. Salvataggio settings sito (siteName, tagline, locale, timezone)
7. Mark installed = true
8. Return { status, adminUser }
```

### Dopo installazione

```
1. POST /v1/install/bootstrap → 409 (gia installato)
2. GET /v1/install/status → { installed: true, dbConfigured: true }
3. App funziona normalmente
4. Riavvio futuro → legge .env, connette MongoDB, avvia normalmente
```

## Modello dati

### Installation State

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

### Input DTO (InstallBootstrapInput)

```ts
export interface InstallBootstrapInput {
  // Admin account
  firstName: string; // 1-60 chars
  lastName: string; // 1-60 chars
  email: string; // email validata
  password: string; // 10-200 chars
  confirmPassword: string; // deve matchare password

  // Site settings
  siteName: string; // 1-120 chars
  siteTagline?: string; // max 160 chars
  locale?: string; // pattern: "^[a-z]{2}(-[A-Z]{2})?$"
  timezone?: string; // IANA timezone, 3-120 chars
}
```

### Response DTO

```ts
export interface InstallationBootstrapResult {
  status: InstallationStatus;
  adminUser: UserRecord;
}
```

### User Record (aggiornato)

```ts
export interface UserRecord {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: "active" | "suspended";
  createdAt: string;
  updatedAt: string;
}
```

## API HTTP

| Method | Path                    | Auth | Setup Mode |
| ------ | ----------------------- | ---- | ---------- |
| `GET`  | `/v1/install/status`    | none | pubblico   |
| `POST` | `/v1/install/bootstrap` | none | pubblico   |

`GET /v1/install/status` ritorna anche `dbConfigured` in setup mode.

## Storage Mongo

Collections:

- `core-pack__settings` (`kind: "install_state"` for installation state)
- `core-pack__local_credentials`
- `core-pack__users`
- `core-pack__user_roles`
- `core-pack__roles`
- `core-pack__permissions`

Indici:

| Collection                     | Index                 | Unique |
| ------------------------------ | --------------------- | ------ |
| `core-pack__settings`          | `{ kind: 1, key: 1 }` | yes    |
| `core-pack__local_credentials` | `{ userId: 1 }`       | yes    |
| `core-pack__users`             | `{ email: 1 }`        | yes    |

## Security e permission

### Setup mode

- Solo endpoint di installazione sono pubblici
- Ogni altra richiesta → 503
- Nessun dato sensibile esposto

### Prima dell'installazione

- `GET /v1/install/status` pubblico
- `POST /v1/install/bootstrap` pubblico solo se `installed = false`

### Dopo installazione

- `POST /v1/install/bootstrap` → 409
- `GET /v1/install/status` rimane pubblico (solo stato)
- Bootstrap admin ha ruolo `admin` con tutte le permission core
- Password salvata solo come hash (scrypt)

## Errori

| Code                         | HTTP | Quando                                    |
| ---------------------------- | ---- | ----------------------------------------- |
| `installation_already_done`  | 409  | installazione gia chiusa                  |
| `installation_input_invalid` | 400  | input non valido                          |
| `installation_failed`        | 500  | bootstrap fallito                         |
| `password_mismatch`          | 400  | password e confirmPassword non coincidono |

## Lifecycle

1. Avvio app → setup mode se DB non raggiungibile
2. Se env non configurato → guida .env → riavvio
3. GET /v1/install/status → verifica stato
4. POST /v1/install/bootstrap con dati sito + admin
5. Creazione admin user con firstName e lastName separati
6. Creazione ruoli/permission baseline
7. Salvataggio settings sito
8. Mark installed
9. Audit eventi

## Compatibilita e versioning

- `schemaVersion` permette evoluzione bootstrap
- `InstallBootstrapInput` puo ricevere nuovi campi opzionali senza breaking
- `UserRecord` puo evolvere con nuovi campi (backward compatibile)
- Il formato `.env` e compatibile con docker-compose e Node --env-file

## Dipendenze

- `dotenv` (npm): lettura .env all'avvio

## Acceptance criteria

- [ ] App parte in setup mode senza MongoDB
- [ ] Se env non configurato, guida .env mostrata con richiesta riavvio
- [ ] Dopo setup .env e riavvio, wizard 2 step (Sito + Admin) mostrato
- [ ] Form installazione raccoglie solo sito + admin
- [ ] .env non viene scritto dal wizard (gia presente)
- [ ] Dopo installazione, app funziona senza riavvio
- [ ] Al riavvio successivo, legge .env e parte normalmente
- [ ] Nome e cognome admin persistiti come campi separati
- [ ] Settings sito persistiti e leggibili
- [ ] Installazione non ripetibile (409)
