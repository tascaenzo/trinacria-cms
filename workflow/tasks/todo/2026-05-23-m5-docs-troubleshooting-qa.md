# M5 documentazione, troubleshooting e QA

## Obiettivo

Chiudere la milestone con documentazione sviluppatore e operativa allineata al
runtime implementato.

## Area

`docs`

## Milestone

`M5 - Plugin Runtime Foundation`

## Scope

- In scope: aggiornare guida implementativa M5
- In scope: aggiornare manuale runtime IT/EN
- In scope: aggiornare troubleshooting plugin
- In scope: aggiornare package README coinvolti
- In scope: changelog M5 con check eseguiti e debiti residui
- Out of scope: documentazione dominio editoriale

## File impattati

- `docs/cms/specs/core-platform/m5-plugin-runtime-implementation.md`
- `docs/cms/it/0016-m5-runtime-plugin-foundation.md`
- `docs/cms/en/0016-m5-plugin-runtime-foundation.md`
- `docs/cms/it/0015-operazioni-plugin-e-troubleshooting.md`
- `docs/cms/en/0015-plugin-operations-and-troubleshooting.md`
- `packages/kernel/README.md`
- `packages/sdk/README.md`
- `packages/admin-kernel/README.md`
- `workflow/changelog/CHANGELOG.md`

## Check

- `./node_modules/.bin/prettier --check docs workflow packages/kernel/README.md packages/sdk/README.md packages/admin-kernel/README.md`
