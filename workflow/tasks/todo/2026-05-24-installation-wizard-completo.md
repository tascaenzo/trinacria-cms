# Installation wizard completo

## Obiettivo

Trasformare l'installazione del CMS in un wizard a 2 step (Sito + Admin) che
presuppone MongoDB gia configurato via `.env`. Se le variabili d'ambiente non
sono presenti, il backoffice mostra una guida per il setup manuale del `.env`
e chiede il riavvio prima di procedere.

## Area

`core-pack + kernel + admin-kernel + docs + infra`

## Milestone

`M4.0`

## Scope

### In scope

- Setup mode: app si avvia senza MongoDB, serve solo /v1/install/*
- Guida setup `.env` se `MONGO_URI` o `MONGO_HOST` non configurati
- Riavvio richiesto dopo setup `.env`
- Frontend multi-step (2 step: Sito → Admin + Review)
- Salvataggio settings sito (siteName, tagline, locale, timezone) in installazione
- Creazione admin (firstName, lastName, email, password)
- `UserRecord`: aggiungere `firstName` e `lastName`, displayName calcolato
- Traduzioni EN/IT
- Audit eventi per ogni fase
- Bootstrap backend semplificato: nessun test connessione o scrittura `.env`
  (MongoDB e gia configurato all'avvio tramite dotenv)
- Rimozione endpoint `/v1/install/test-connection` (non piu necessario)

### Out of scope

- Password recovery
- Multi-tenant
- CLI setup wizard
- Tema/UI customization in installazione

## Flusso utente

```
1. App avviata → tenta connessione MongoDB
2. Se connessione fallisce o .env non configurato:
   a. HTTP server parte in setup mode
   b. Tutti gli endpoint tranne /v1/install/* return 503
   c. GET /v1/install/status → { installed: false, envFilePresent: false, dbConfigured: false }

3. [BACKOFFICE] Se envFilePresent == false || dbConfigured == false:
   a. Mostra InstallationDatabaseGuidePage
   b. Istruzioni: crea/aggiorna .env con MONGO_URI (o MONGO_HOST, MONGO_PORT, MONGO_DATABASE)
   c. Percorso del file .env mostrato
   d. "Riavvia l'applicazione dopo aver configurato il file"

4. [BACKOFFICE] Se envFilePresent == true && dbConfigured == true:
   a. Mostra InstallationBootstrapPage con wizard a 2 step:
      - Step 1 (Sito): siteName, tagline, locale, timezone
      - Step 2 (Admin): firstName, lastName, email, password, confirmPassword
      - Review: riepilogo prima del submit
   b. Submit a POST /v1/install/bootstrap → backend bootstrap semplificato

5. Backend bootstrap:
   a. Nessun test connessione MongoDB (gia connesso all'avvio)
   b. Nessuna scrittura .env (gia presente)
   c. Provisioning baseline security (ruoli, permessi)
   d. Creazione admin user (firstName + lastName → displayName)
   e. Hashing password e salvataggio credenziali locali
   f. Assegnazione ruolo admin
   g. Salvataggio settings sito
   h. Mark installed = true
   i. Return { status, adminUser }
```

## Dettaglio implementativo

### 1. dotenv (gia presente)

Nessuna modifica.

### 2. Bootstrap service — semplificato

Rimuovere la logica di test connessione e scrittura `.env` dal metodo `bootstrap()`.
Il DB e gia configurato e connesso all'avvio.

```ts
async bootstrap(input: InstallBootstrapInput): Promise<InstallationBootstrapResult> {
  const state = await this.installationState.ensureCreated();
  if (state.installed) throw new InstallationAlreadyCompletedError();

  // Validate password confirmation
  if (input.password !== input.confirmPassword) {
    throw new PasswordMismatchError();
  }

  // Security baseline
  await this.securityProvisioning.provision(CORE_PACK_MANIFEST);

  // Admin user con firstName + lastName
  const adminUser = await this.upsertAdminUser(input);
  const password = await this.passwordHashing.hashPassword(input.password);
  await this.localCredentials.upsert({
    userId: adminUser.id,
    algorithm: password.algorithm,
    passwordHash: password.passwordHash,
    passwordSalt: password.passwordSalt
  });
  await this.userAccess.assignRoleToUser(adminUser.id, CORE_PACK_ADMIN_ROLE.code);

  // Site settings
  await this.provisionSiteSettings(input, adminUser.id);

  // Mark installed
  const installed = await this.installationState.markInstalled(adminUser.id);
  this.markInstalledInEnv();

  return {
    status: this.toStatus(installed, readInstallationEnvironmentStatus()),
    adminUser,
    envWritten: true,
    dbConnected: true
  };
}
```

### 3. Rimozione test-connection endpoint

Rimuovere:
- `POST /v1/install/test-connection` dal controller
- `testMongoConnection` dal service
- `TestConnectionInputSchema` dal DTO input
- `TestConnectionResponseSchema` dal DTO response

### 4. DTO InstallBootstrapInput — MongoDB fields rimossi

Rimuovere `mongoHost`, `mongoPort`, `mongoDatabase`, `mongoUsername`,
`mongoPassword`, `mongoAuthSource` dallo schema di input. Ora l'input contiene
solo dati sito e admin:

```ts
export const InstallBootstrapInputSchema = s.object({
  firstName: s.string({ trim: true, minLength: 1, maxLength: 60 }),
  lastName: s.string({ trim: true, minLength: 1, maxLength: 60 }),
  email: s.string({ trim: true, toLowerCase: true, email: true }),
  password: s.string({ minLength: 10, maxLength: 200 }),
  confirmPassword: s.string({ minLength: 10, maxLength: 200 }),
  siteName: s.string({ trim: true, minLength: 1, maxLength: 120 }),
  siteTagline: s.string({ trim: true, maxLength: 160 }).optional(),
  locale: s.string({ trim: true, pattern: LOCALE_PATTERN }).optional(),
  timezone: s.string({ trim: true, minLength: 3, maxLength: 120 }).optional()
}, { strict: true });
```

### 5. Response DTO — envWritten sempre true

`envWritten` e `dbConnected` possono diventare sempre `true` nel bootstrap response,
oppure rimuoverli del tutto.

### 6. Frontend — 2 step wizard

`installation-bootstrap-page.tsx`:

```tsx
type Step = "site" | "admin" | "review";
const STEPS: Step[] = ["site", "admin", "review"];
```

```
┌─────────────────────────────────────┐
│  ○ Step 1 ── ○ Step 2              │
│                                     │
│  [Step 1: Impostazioni Sito]        │
│  Nome sito: [________________]      │
│  Tagline:   [________________]      │
│  Lingua:    [it-IT _____▼]          │
│  Timezone:  [Europe/Rome ____▼]     │
│                                     │
│  [Continua →]                       │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  ○ Step 1 ── ○ Step 2              │
│                                     │
│  [Step 2: Amministratore]           │
│  Nome:      [________________]      │
│  Cognome:   [________________]      │
│  Email:     [________________]      │
│  Password:  [________________]      │
│  Conferma:  [________________]      │
│                                     │
│  [← Indietro] [Continua →]          │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  [Riepilogo]                        │
│  Nome sito: ...                     │
│  Admin: Nome Cognome (email)        │
│                                     │
│  [← Indietro] [Inizializza CMS]     │
└─────────────────────────────────────┘
```

- Rimuovere tutti i campi MongoDB
- Rimuovere pulsante "Test connessione"
- Step indicator: mostrare solo 2 step (site + admin), senza DB

### 7. i18n

Rimuovere:
- `auth.installation.step_db`, `auth.installation.step_db_hint`
- `auth.installation.mongo_*_label`, `auth.installation.mongo_*_default`
- `auth.installation.test_connection`, `auth.installation.testing_connection`
- `auth.installation.connection_ok`, `auth.installation.connection_fail`
- `auth.installation.error.db_connection_failed`
- `auth.installation.error.env_write_failed`

Aggiornare:
- `auth.installation.form_summary`: "Completa i due passaggi..." / "Complete the two steps..."
- `auth.installation.hero_body`: rimuovere "database" dalla descrizione

Aggiungere alla guida DB:
- `auth.installation.db_guide_restart_hint`: messaggio che chiede di riavviare
- `auth.installation.db_guide_restart_button`: "Ho configurato il file, riavvia"

### 8. Database guide page — miglioramenti

Aggiungere alla `InstallationDatabaseGuidePage`:
- Pulsante "Riavvia l'app" o messaggio chiaro che l'app deve essere riavviata
- Opzionale: polling dello status per rilevare quando il DB diventa disponibile

### 9. Route nel backoffice

La route nel `BackofficeApp` rimane invariata:
```
if envFilePresent && dbConfigured → InstallationBootstrapPage (2 step)
else → InstallationDatabaseGuidePage
```

## File impattati

### Kernel

- `packages/kernel/src/runtime/cms-starter.ts`
  - Setup mode (gia fatto)

### Core-pack — Installation module

- `packages/core-pack/src/modules/installation/dto/installation.input.dto.ts`
  - Rimuovere campi MongoDB da InstallBootstrapInputSchema
  - Rimuovere TestConnectionInputSchema

- `packages/core-pack/src/modules/installation/dto/installation.response.dto.ts`
  - Rimuovere TestConnectionResponseSchema

- `packages/core-pack/src/modules/installation/installation.service.ts`
  - Rimuovere `testMongoConnection`
  - Rimuovere `writeEnvFile`
  - Semplificare `bootstrap()`: niente test DB o scrittura .env
  - Rimuovere dipendenza da `mongoConnection` (opzionale)
  - Rimuovere `DbConnectionError`, `EnvWriteError` (se non usati altrove)

- `packages/core-pack/src/modules/installation/installation.controller.ts`
  - Rimuovere route `POST /v1/install/test-connection`
  - Aggiornare docs route bootstrap (non menziona MongoDB)

- `packages/core-pack/src/modules/installation/installation.module.ts`
  - Rimuovere eventuali provider per test-connection

### Admin-kernel — Frontend

- `packages/admin-kernel/src/pages/installation-bootstrap-page.tsx`
  - Rimuovere campi MongoDB
  - 2 step wizard (Sito → Admin → Review)
  - Rimuovere "Test connessione"
  - Step indicator a 2 passi

- `packages/admin-kernel/src/pages/installation-database-guide-page.tsx`
  - Migliorare messaggio riavvio

### Admin-kernel — i18n

- `packages/admin-kernel/src/i18n/it.json`
  - Rimuovere chiavi MongoDB step
  - Aggiornare testi

- `packages/admin-kernel/src/i18n/en.json`
  - Stesse modifiche in inglese

### SDK

- `packages/sdk/src/generated/types.gen.ts`
  - Rigenerare dopo modifiche DTO

### Docs

- `docs/cms/specs/core-platform/installation-bootstrap.md`
  - Aggiornare flusso, DTO, acceptance criteria

## Check da eseguire

```bash
# Typecheck
npm run typecheck -w @trinacria-cms/core-pack
npm run typecheck -w @trinacria-cms/playground
npm run typecheck -w @trinacria-cms/admin-kernel

# Lint
npm run lint

# Test
npm run test -w @trinacria-cms/core-pack

# Build
npm run build -w @trinacria-cms/core-pack
npm run build -w @trinacria-cms/playground

# SDK
npm run sdk:snapshot
npm run sdk:generate

# Prettier
npx prettier --check docs workflow
```

## Task breakdown

1. **DTO**: Rimuovere campi MongoDB da InstallBootstrapInput, rimuovere TestConnectionInputSchema
2. **Service**: Rimuovere testMongoConnection/writeEnvFile, semplificare bootstrap
3. **Controller**: Rimuovere test-connection route, aggiornare docs
4. **Frontend**: 2 step wizard (Sito + Admin), rimuovere MongoDB UI
5. **i18n**: Rimuovere chiavi MongoDB, aggiornare testi
6. **Guide DB**: Migliorare messaggio riavvio
7. **SDK**: Rigenerare tipi
8. **Docs**: Spec aggiornata
