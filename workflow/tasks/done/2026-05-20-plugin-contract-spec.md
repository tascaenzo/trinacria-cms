# Specifica contratto plugin CMS

## Obiettivo

Definire la forma target di un plugin CMS: manifest, capability, permission,
entity, settings, API, lifecycle e admin contribution.

## Scope

- In scope: campi richiesti/opzionali del plugin contract
- In scope: lifecycle hook e responsabilita
- In scope: relazione con manifest backend e contribution backoffice
- In scope: DTO API operative plugin
- In scope: schema Mongo runtime plugin
- In scope: error model plugin operations
- Out of scope: API TypeScript definitiva

## File o aree impattate

- `docs/cms/specs/core-platform/plugin-contract.md`
- `docs/cms/en/0007-build-a-plugin.md`
- `docs/cms/it/0007-creare-un-plugin.md`

## Check da eseguire

- `npx prettier --check docs workflow`
