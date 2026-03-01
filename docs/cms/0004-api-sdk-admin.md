# 0004 - API, SDK e Admin

## API backend

Responsabilita API (`apps/api`):

- autenticazione/autorizzazione
- CRUD contenuti
- gestione media
- gestione plugin e settings
- introspezione capability del runtime

## SDK TypeScript (`packages/sdk`)

Responsabilita:

- wrapper typed delle API
- gestione token/sessione
- helper query/paginazione
- tipi condivisi con backend

Regola: endpoint pubblici e SDK devono derivare dagli stessi contratti TypeScript.

## Dashboard Admin (`apps/admin`)

- App React ufficiale per amministrazione.
- Consuma esclusivamente SDK (non fetch diretto non tipizzato).
- Layout a shell + pagine iniettate da plugin (in roadmap).

## Frontend consumer

Nessun vincolo tecnico: qualsiasi stack puo usare SDK o API HTTP pure.
