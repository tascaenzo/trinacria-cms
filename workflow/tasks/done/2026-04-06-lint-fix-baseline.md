# Ripristino baseline lint

## Obiettivo

Ridurre gli errori lint attuali fino a ottenere una baseline pulita o dichiaratamente accettata.

## Scope

- In scope: fix degli unused vars e delle configurazioni errate
- In scope: adeguamento delle regole lint dove tecnicamente giustificato
- Out of scope: introdurre nuove regole di stile non necessarie

## File o aree impattate

- `eslint.config.mjs`
- `apps/backoffice/postcss.config.cjs`
- `packages/admin-kernel/src/**`
- `packages/trinacria-ui/src/**`
- `packages/sdk/scripts/**`

## Check da eseguire

- `npm run lint`
