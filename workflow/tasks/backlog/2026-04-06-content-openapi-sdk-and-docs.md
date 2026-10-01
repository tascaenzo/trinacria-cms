# OpenAPI, SDK e docs del dominio contenuti

Stato: `backlog` — le API admin usano `cms.request`; i metodi editoriali generati
non sono ancora inclusi nello snapshot SDK. Le procedure operative sono già
disponibili in `docs/cms/it/0023-editorial-operazioni.md`.

## Obiettivo

Rendere il dominio contenuti disponibile in modo typed via OpenAPI/SDK e documentato come parte ufficiale del CMS.

## Scope

- In scope: OpenAPI snapshot
- In scope: SDK generato
- In scope: catalogo ufficiale se applicabile
- In scope: docs end-to-end
- Out of scope: SDK pubblicato esternamente se non ancora pronto

## File o aree impattate

- `packages/sdk/**`
- `docs/cms/**`

## Check da eseguire

- `npm run build -w @trinacria-cms/sdk`
- `npm run test -w @trinacria-cms/sdk`
