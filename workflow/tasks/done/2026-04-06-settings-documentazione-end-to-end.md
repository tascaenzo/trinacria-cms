# Documentazione end-to-end del dominio settings

## Meta

- ID: `task-settings-docs-e2e`
- Stato: `done`
- Area: `docs`
- Milestone: `M2`
- Owner: `enzo`
- Creato il: `2026-04-06`
- Ultimo aggiornamento: `2026-04-06`

## Obiettivo

Documentare il dominio `settings` in modo end-to-end: modello, sicurezza, endpoint, SDK, backoffice e uso da parte dei plugin.

## Contesto

Per poter scalare il dominio configuration, la documentazione deve essere abbastanza precisa da evitare interpretazioni locali diverse.

## Scope

- In scope: docs italiane e inglesi rilevanti
- In scope: esempi di flussi signed plugin
- In scope: esempi di lettura e gestione via SDK/backoffice
- Out of scope: manualistica utente finale

## Deliverable

- capitolo docs aggiornato
- esempi request/response
- sezione operativa per debugging configurazione

## File o aree impattate

- `docs/cms/it/**`
- `docs/cms/en/**`
- `README.md` se necessario

## Dipendenze

- task tecnici `settings` completati o quasi completati

## Check da eseguire

- review manuale dei riferimenti file/path
- coerenza con OpenAPI e SDK

## Note operative

La documentazione deve distinguere chiaramente:

- definitions
- values risolti
- secrets metadata
- reveal
- export

Direzione applicata:

- introdotto un capitolo end-to-end bilingue dedicato al dominio `settings`;
- la documentazione ora distingue in modo esplicito definitions, values, masked secrets metadata, reveal ed export;
- sono stati aggiunti esempi HTTP signed, esempi SDK e la descrizione del flusso backoffice owner-signed handoff;
- i README del manuale CMS puntano ora anche al capitolo `0014`.

## Chiusura

- Changelog aggiornato: `si`
- Documentazione aggiornata: `si`
- File modificati:
  - `docs/cms/it/0014-settings-end-to-end.md`
  - `docs/cms/en/0014-settings-end-to-end.md`
  - `docs/cms/it/README.md`
  - `docs/cms/en/README.md`
  - `docs/cms/it/0005-core-pack-architettura-file-per-file.md`
  - `docs/cms/en/0005-core-pack-file-by-file.md`
  - `docs/cms/it/0013-settings-sicurezza-e-ownership-operativa.md`
  - `docs/cms/en/0013-settings-security-and-operational-ownership.md`
- Check eseguiti:
  - review manuale dei riferimenti file/path
  - review manuale di coerenza con OpenAPI e SDK
  - `npm run build`
  - `npm test`
  - `npm run lint`
- Follow-up aperti:
  - nessuno
