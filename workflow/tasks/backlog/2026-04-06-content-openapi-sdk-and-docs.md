# OpenAPI, SDK e docs del dominio contenuti

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
