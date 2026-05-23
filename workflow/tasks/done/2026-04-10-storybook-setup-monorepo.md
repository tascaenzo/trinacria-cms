# Setup Storybook nel monorepo

## Obiettivo

Introdurre Storybook come ambiente ufficiale per sviluppo, ispezione e documentazione dei componenti `admin-ui`.

## Scope

- In scope: installazione e configurazione Storybook
- In scope: integrazione con workspace monorepo
- In scope: supporto a `admin-ui` e ai pattern composti
- Out of scope: deployment esterno della doc UI, se non richiesto

## File o aree impattate

- `package.json`
- `packages/trinacria-ui/**`
- eventuali config Storybook in root o package dedicato

## Check da eseguire

- script Storybook avviabile
- build Storybook se prevista
- `npm run build`
